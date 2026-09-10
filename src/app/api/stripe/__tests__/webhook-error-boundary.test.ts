import { NextRequest } from 'next/server';

// RS-2 (Gap G-14): the whole event switch must run inside one error boundary,
// and a thrown error anywhere inside it — not just a captured Supabase error —
// has to (a) leave the RS-1 dedup claim in a re-triable state and (b) make the
// route answer 500, so Stripe's own retry is what recovers a half-applied
// payment. Gap G-14's own evidence was the unguarded `redis.del(...)` call at
// the end of checkout.session.completed, so that is the throw site exercised
// here — proving the fix at the exact spot the gap was found, not just in the
// abstract.

const mockConstructEvent = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { retrieve: jest.fn() },
  })),
}));

const mockRedisDel = jest.fn();
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    del: (...args: unknown[]) => mockRedisDel(...args),
  })),
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

type Row = Record<string, unknown>;

function fakeSupabase() {
  const dedupUpdates: Array<{ status: string }> = [];
  const applicationUpdateCalls: number[] = [];

  const client = {
    from(table: string) {
      if (table === 'processed_webhook_events') {
        return {
          insert: async (_row: Row) => ({ error: null }),
          update: (fields: Row) => ({
            eq: async () => {
              dedupUpdates.push({ status: fields.status as string });
              return { error: null };
            },
          }),
        };
      }
      if (table === 'payments') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === 'applications') {
        return {
          update: () => ({
            eq: () => ({
              eq: async () => {
                applicationUpdateCalls.push(1);
                return { error: null };
              },
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
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };

  return { client, dedupUpdates, applicationUpdateCalls };
}

function fakeRequest(): NextRequest {
  return {
    headers: { get: (name: string) => (name === 'stripe-signature' ? 'sig_test' : null) },
    text: async () => '{}',
  } as unknown as NextRequest;
}

const CHECKOUT_EVENT = {
  id: 'evt_boundary_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'sess_1',
      amount_total: 50000,
      payment_intent: 'pi_1',
      metadata: { applicationId: 'app-1', userId: 'user-1', tierId: 'foundation' },
    },
  },
} as unknown;

describe('Stripe webhook error boundary (RS-2 / Gap G-14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-dummy';
    // Configured (unlike webhook-dedup-claim.test.ts, which deliberately
    // leaves Redis unset) so the checkout handler's redis.del(...) call runs
    // and can throw — this is Gap G-14's own unguarded-call evidence.
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token-dummy';
    mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);
  });

  it('a dead Redis host throwing on redis.del does not escape the route as an unhandled 500 from Next itself', async () => {
    mockRedisDel.mockRejectedValue(new Error('ECONNREFUSED: redis host unreachable'));
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase();
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    // The payment/application writes before the throw still ran — the
    // half-applied-payment scenario Gap G-14 called out never happens because
    // the unlock write completes before the redis.del throw is reached.
    expect(applicationUpdateCalls).toHaveLength(1);
    // The claim is left re-triable, not silently marked done.
    expect(dedupUpdates).toEqual([{ status: 'failed' }]);
    // And the route itself answers 500 deliberately, so Stripe retries.
    expect(res.status).toBe(500);
  });

  it('a redelivery after the dead-Redis failure reclaims the claim and succeeds once Redis recovers', async () => {
    mockRedisDel.mockRejectedValueOnce(new Error('ECONNREFUSED: redis host unreachable'));
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase();
    mockCreateClient.mockReturnValue(client);

    const first = await POST(fakeRequest());
    expect(first.status).toBe(500);
    expect(dedupUpdates).toEqual([{ status: 'failed' }]);

    // Simulate Stripe's redelivery of the same event hitting the dedup
    // conflict path with the row left 'failed' from the first attempt.
    const insertConflict = {
      ...client,
      from(table: string) {
        if (table === 'processed_webhook_events') {
          return {
            insert: async () => ({ error: { code: '23505', message: 'duplicate key' } }),
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { status: 'failed' }, error: null }),
              }),
            }),
            update: (fields: Row) => ({
              eq: async () => {
                dedupUpdates.push({ status: fields.status as string });
                return { error: null };
              },
            }),
          };
        }
        return client.from(table);
      },
    };
    mockCreateClient.mockReturnValue(insertConflict);
    mockRedisDel.mockResolvedValueOnce(1);

    const second = await POST(fakeRequest());

    expect(second.status).toBe(200);
    expect(applicationUpdateCalls).toHaveLength(2); // reclaimed and re-ran the unlock
    expect(dedupUpdates).toEqual([{ status: 'failed' }, { status: 'completed' }]);
  });

  it('the pre-RS-1 boundary would have let this throw escape uncaught — confirms the switch is now inside the try/catch', async () => {
    mockRedisDel.mockRejectedValue(new Error('ECONNREFUSED: redis host unreachable'));
    const { POST } = await import('../webhook/route');
    const { client } = fakeSupabase();
    mockCreateClient.mockReturnValue(client);

    await expect(POST(fakeRequest())).resolves.toBeDefined();
  });
});
