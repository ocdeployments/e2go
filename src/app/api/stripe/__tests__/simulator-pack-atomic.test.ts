import { NextRequest } from 'next/server';

// RS-6 (Gap G-21): simulator_sessions_purchased was granted (and refunded) via
// select-then-update, which loses updates under concurrent or redelivered
// events — two interleaved 3-pack grants net one grant instead of two. These
// tests drive the actual POST handler (Stripe signature verification and DB
// calls are mocked) to prove the grant and refund paths now call the
// increment_simulator_sessions RPC with a fixed delta instead of reading the
// current value and writing a computed one back.

const mockConstructEvent = jest.fn();
const mockRetrievePaymentIntent = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { retrieve: mockRetrievePaymentIntent },
  })),
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

type Row = Record<string, unknown>;

function fakeSupabase(opts: {
  rpcError?: string | null;
  paymentLookup?: { id: string; application_id: string; payment_type: string; user_id: string } | null;
} = {}) {
  const rpcCalls: Array<{ fn: string; args: Row }> = [];
  const applicationsTableCalls: string[] = [];

  const client = {
    from(table: string) {
      if (table === 'processed_webhook_events') {
        return {
          insert: async (_row: Row) => ({ error: null }),
          update: (fields: Row) => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === 'payments') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: opts.paymentLookup ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'application_lifecycle') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === 'applications') {
        // RS-6: the grant/refund paths must never touch this table directly
        // (no select-then-update) — only the RPC below.
        applicationsTableCalls.push('touched');
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
    rpc: async (fn: string, args: Row) => {
      rpcCalls.push({ fn, args });
      return { data: null, error: opts.rpcError ? { message: opts.rpcError } : null };
    },
  };

  return { client, rpcCalls, applicationsTableCalls };
}

function fakeRequest(): NextRequest {
  return {
    headers: { get: (name: string) => (name === 'stripe-signature' ? 'sig_test' : null) },
    text: async () => '{}',
  } as unknown as NextRequest;
}

function grantEvent(eventId: string) {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `sess_${eventId}`,
        amount_total: 4900,
        payment_intent: `pi_${eventId}`,
        metadata: { applicationId: 'app-1', userId: 'user-1', tierId: 'simulator_3pack' },
      },
    },
  } as unknown;
}

const REFUND_EVENT = {
  id: 'evt_refund_1',
  type: 'charge.refunded',
  data: {
    object: {
      id: 'ch_1',
      payment_intent: 'pi_refund_1',
    },
  },
} as unknown;

describe('Stripe webhook simulator pack atomic increment (RS-6 / Gap G-21)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-dummy';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('grants via the RPC with a fixed +3 delta, never a select-then-update', async () => {
    const { POST } = await import('../webhook/route');
    mockConstructEvent.mockReturnValue(grantEvent('evt_grant_1'));
    const { client, rpcCalls, applicationsTableCalls } = fakeSupabase();
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(applicationsTableCalls).toHaveLength(0);
    expect(rpcCalls).toEqual([
      { fn: 'increment_simulator_sessions', args: { p_application_id: 'app-1', p_amount: 3 } },
    ]);
  });

  it('fires two concurrent grant events and issues two independent +3 RPC calls (not a shared read)', async () => {
    const { POST } = await import('../webhook/route');
    mockConstructEvent
      .mockReturnValueOnce(grantEvent('evt_grant_a'))
      .mockReturnValueOnce(grantEvent('evt_grant_b'));
    const { client, rpcCalls } = fakeSupabase();
    mockCreateClient.mockReturnValue(client);

    const [resA, resB] = await Promise.all([POST(fakeRequest()), POST(fakeRequest())]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    // Each event independently asks the RPC to add 3 — the atomicity that
    // makes concurrent +3/+3 net +6 instead of +3 lives in the RPC's single
    // UPDATE statement in Postgres, not in any read this handler performs.
    expect(rpcCalls).toHaveLength(2);
    for (const call of rpcCalls) {
      expect(call).toEqual({ fn: 'increment_simulator_sessions', args: { p_application_id: 'app-1', p_amount: 3 } });
    }
  });

  it('revokes a refunded pack via the RPC with a fixed -3 delta', async () => {
    const { POST } = await import('../webhook/route');
    mockConstructEvent.mockReturnValue(REFUND_EVENT);
    mockRetrievePaymentIntent.mockResolvedValue({ metadata: { tierId: 'simulator_3pack' } });
    const { client, rpcCalls, applicationsTableCalls } = fakeSupabase({
      paymentLookup: { id: 'pay-1', application_id: 'app-1', payment_type: 'simulator_3pack', user_id: 'user-1' },
    });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(applicationsTableCalls).toHaveLength(0);
    expect(rpcCalls).toEqual([
      { fn: 'increment_simulator_sessions', args: { p_application_id: 'app-1', p_amount: -3 } },
    ]);
  });

  it('marks the claim failed when the RPC itself returns an error', async () => {
    const { POST } = await import('../webhook/route');
    mockConstructEvent.mockReturnValue(grantEvent('evt_grant_fail'));
    const { client } = fakeSupabase({ rpcError: 'function increment_simulator_sessions does not exist' });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(500); // RS-2 (Gap G-14): a failed claim gets a 500 so Stripe retries
  });
});
