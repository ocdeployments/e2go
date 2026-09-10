import { NextRequest } from 'next/server';

// RS-1 (Gap G-13): the dedup row is a claim, not a receipt. These tests drive
// the actual POST handler (Stripe signature verification and DB calls are
// mocked) to prove the claim lifecycle: 'processing' on insert, 'completed'
// only once the handler finishes clean, 'failed' on a captured error or a
// thrown exception, and a redelivery of an unfinished claim reclaims and
// re-runs instead of reporting a false duplicate.

const mockConstructEvent = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { retrieve: jest.fn() },
  })),
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

type Row = Record<string, unknown>;

function fakeSupabase(opts: {
  dedupInsertConflict?: boolean;
  existingStatus?: 'processing' | 'completed' | 'failed' | null;
  applicationUpdateError?: string | null;
  applicationUpdateThrows?: boolean;
}) {
  const dedupUpdates: Array<{ status: string }> = [];
  const applicationUpdateCalls: number[] = [];

  const client = {
    from(table: string) {
      if (table === 'processed_webhook_events') {
        return {
          insert: async (_row: Row) => {
            if (opts.dedupInsertConflict) {
              return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            }
            return { error: null };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.existingStatus ? { status: opts.existingStatus } : null,
                error: null,
              }),
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
                if (opts.applicationUpdateThrows) throw new Error('connection reset');
                return { error: opts.applicationUpdateError ? { message: opts.applicationUpdateError } : null };
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
  id: 'evt_test_1',
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

describe('Stripe webhook dedup claim lifecycle (RS-1 / Gap G-13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-dummy';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    mockConstructEvent.mockReturnValue(CHECKOUT_EVENT);
  });

  it('marks a cleanly-processed event completed', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase({});
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(applicationUpdateCalls).toHaveLength(1);
    expect(dedupUpdates).toEqual([{ status: 'completed' }]);
  });

  it('short-circuits a genuine duplicate without re-running the handler', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase({
      dedupInsertConflict: true,
      existingStatus: 'completed',
    });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(body).toEqual({ received: true, duplicate: true });
    expect(applicationUpdateCalls).toHaveLength(0);
    expect(dedupUpdates).toHaveLength(0);
  });

  it('reclaims and re-runs a redelivery of a claim stuck in processing', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase({
      dedupInsertConflict: true,
      existingStatus: 'processing',
    });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(applicationUpdateCalls).toHaveLength(1);
    expect(dedupUpdates).toEqual([{ status: 'completed' }]);
  });

  it('reclaims and re-runs a redelivery of a claim that previously failed', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates, applicationUpdateCalls } = fakeSupabase({
      dedupInsertConflict: true,
      existingStatus: 'failed',
    });
    mockCreateClient.mockReturnValue(client);

    await POST(fakeRequest());

    expect(applicationUpdateCalls).toHaveLength(1);
    expect(dedupUpdates).toEqual([{ status: 'completed' }]);
  });

  it('marks the claim failed — not completed — when a handler step captures an error', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates } = fakeSupabase({
      applicationUpdateError: 'permission denied for table applications',
    });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(500); // RS-2 (Gap G-14): a failed claim now gets a 500 so Stripe retries
    expect(dedupUpdates).toEqual([{ status: 'failed' }]);
  });

  it('marks the claim failed when a handler step throws', async () => {
    const { POST } = await import('../webhook/route');
    const { client, dedupUpdates } = fakeSupabase({
      applicationUpdateThrows: true,
    });
    mockCreateClient.mockReturnValue(client);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(500);
    expect(dedupUpdates).toEqual([{ status: 'failed' }]);
  });
});
