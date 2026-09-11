import type { NextRequest } from 'next/server';

// DR-19 (Gap G-09e): PricingClient.tsx used to insert a new `applications`
// row directly from the browser with a hardcoded application_type: 'solo' —
// an unverifiable, spoofable client assertion. The fix moves find-or-create
// into this route (POST /api/stripe/create-checkout) and derives
// application_type server-side from the user's most recent quiz_sessions row,
// mirroring src/app/onboarding/page.tsx. These tests drive the actual POST
// handler (Stripe and Supabase are mocked) to prove: a solo quiz session
// yields a 'solo' application, a partnership quiz session yields a
// 'partnership' application, an existing application is reused without a
// second write, and the ownership check still rejects another user's
// application id.

type Row = Record<string, unknown>;
interface Result { data: unknown; error: unknown }

const mockStripeCreate = jest.fn();
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockStripeCreate } },
  })),
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

function makeApplicationsTable(
  queue: Result[],
  onInsert: (row: Row) => void,
  newApplicationId: string
) {
  return {
    select: () => ({
      eq: () => ({
        // Ownership check: select('id').eq('id', x).eq('user_id', y).maybeSingle()
        eq: () => ({ maybeSingle: async () => queue.shift() ?? { data: null, error: null } }),
        // Find-or-create / partnership-hold lookup: select(...).eq('user_id', y).order(...).limit(1).maybeSingle()
        order: () => ({
          limit: () => ({ maybeSingle: async () => queue.shift() ?? { data: null, error: null } }),
        }),
      }),
    }),
    insert: (row: Row) => {
      onInsert(row);
      return { select: () => ({ single: async () => ({ data: { id: newApplicationId }, error: null }) }) };
    },
  };
}

function makeQuizSessionsTable(result: Result) {
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: async () => result }),
        }),
      }),
    }),
  };
}

function makePricingTable(result: Result) {
  return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => result }) }) }) };
}

function makeProfilesTable() {
  return {
    select: () => ({ eq: () => ({ single: async () => ({ data: { email: 'test@example.com' }, error: null }) }) }),
  };
}

function makePaymentsTable(onInsert: (row: Row) => void) {
  return { insert: async (row: Row) => { onInsert(row); return { error: null }; } };
}

function fakeSupabase(opts: {
  applicationsQueue: Result[];
  quizSessionResult: Result;
  pricingResult: Result;
  newApplicationId?: string;
}) {
  const insertedApplications: Row[] = [];
  const insertedPayments: Row[] = [];

  const client = {
    from(table: string) {
      if (table === 'applications') {
        return makeApplicationsTable(
          opts.applicationsQueue,
          (row) => insertedApplications.push(row),
          opts.newApplicationId ?? 'new-app-id'
        );
      }
      if (table === 'quiz_sessions') return makeQuizSessionsTable(opts.quizSessionResult);
      if (table === 'pricing') return makePricingTable(opts.pricingResult);
      if (table === 'profiles') return makeProfilesTable();
      if (table === 'payments') return makePaymentsTable((row) => insertedPayments.push(row));
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };

  return { client, insertedApplications, insertedPayments };
}

function fakeRequest(body: Row): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe('POST /api/stripe/create-checkout — server-side application_type (DR-19 / Gap G-09e)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-dummy';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_PRICE_FOUNDATION = 'price_foundation_test';
    process.env.STRIPE_PRICE_SIMULATOR_3PACK = 'price_simulator_3pack_test';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockStripeCreate.mockResolvedValue({ id: 'sess_1', url: 'https://checkout.stripe.com/sess_1' });
  });

  it('creates a new application with application_type "solo" when the user has no partnership quiz session', async () => {
    const { client, insertedApplications } = fakeSupabase({
      applicationsQueue: [{ data: null, error: null }, { data: null, error: null }],
      quizSessionResult: { data: null, error: null },
      pricingResult: { data: null, error: { message: 'not found' } },
      newApplicationId: 'new-app-solo',
    });
    mockCreateClient.mockReturnValue(client);

    const { POST } = await import('../create-checkout/route');
    const res = await POST(fakeRequest({ tierId: 'foundation' }));

    expect(res.status).toBe(200);
    expect(insertedApplications).toHaveLength(1);
    expect(insertedApplications[0]).toMatchObject({
      user_id: 'user-1',
      application_type: 'solo',
      status: 'pending',
    });
  });

  it('creates a new application with application_type "partnership" when the user\'s quiz session says so', async () => {
    const { client, insertedApplications } = fakeSupabase({
      applicationsQueue: [{ data: null, error: null }, { data: null, error: null }],
      quizSessionResult: { data: { application_type: 'partnership' }, error: null },
      pricingResult: { data: null, error: { message: 'not found' } },
      newApplicationId: 'new-app-partnership',
    });
    mockCreateClient.mockReturnValue(client);

    const { POST } = await import('../create-checkout/route');
    const res = await POST(fakeRequest({ tierId: 'foundation' }));

    // foundation is a package tier, so a partnership case is correctly held
    // out of checkout (src/lib/partnership-hold.ts) — the point of this test
    // is that the write which already happened used the real derived type,
    // never the old hardcoded 'solo'.
    expect(res.status).toBe(409);
    expect(insertedApplications).toHaveLength(1);
    expect(insertedApplications[0]).toMatchObject({
      user_id: 'user-1',
      application_type: 'partnership',
      status: 'pending',
    });
  });

  it('reuses an existing application instead of creating a second one', async () => {
    const { client, insertedApplications, insertedPayments } = fakeSupabase({
      applicationsQueue: [{ data: { id: 'existing-app-1' }, error: null }],
      quizSessionResult: { data: null, error: null },
      pricingResult: { data: null, error: { message: 'not found' } },
    });
    mockCreateClient.mockReturnValue(client);

    const { POST } = await import('../create-checkout/route');
    const res = await POST(fakeRequest({ tierId: 'simulator_3pack' }));

    expect(res.status).toBe(200);
    expect(insertedApplications).toHaveLength(0);
    expect(insertedPayments[0]).toMatchObject({ application_id: 'existing-app-1' });
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ applicationId: 'existing-app-1' }) })
    );
  });

  it('still rejects a client-supplied applicationId that does not belong to this user', async () => {
    const { client, insertedApplications } = fakeSupabase({
      applicationsQueue: [{ data: null, error: null }],
      quizSessionResult: { data: null, error: null },
      pricingResult: { data: null, error: { message: 'not found' } },
    });
    mockCreateClient.mockReturnValue(client);

    const { POST } = await import('../create-checkout/route');
    const res = await POST(fakeRequest({ tierId: 'foundation', applicationId: 'someone-elses-app' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Application not found');
    expect(insertedApplications).toHaveLength(0);
  });
});
