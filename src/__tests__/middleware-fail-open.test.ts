import { NextRequest } from 'next/server';

// RS-3 (Gap G-15): three middleware call sites — the payment gate's
// applications/profile pair, the FDD payment lookup, and the terms-acceptance
// lookup — used to destructure `data` only. A Supabase timeout/5xx/schema
// drift returns data: null, which is indistinguishable from "no paid
// applications" or "terms not accepted", so the middleware derived access
// from the null and failed CLOSED, locking a paying customer out. These
// tests drive the real `middleware` function (Supabase and Redis are mocked)
// to prove each site now fails OPEN instead: access is granted for that
// request, an alert is captured, and nothing is written to the cache — while
// a genuine "no rows yet" result (PGRST116 on the terms lookup) still fails
// closed, since that is the expected shape for a user who truly hasn't
// accepted terms.

type Result = { data: unknown; error: { code?: string; message: string } | null };

function chain(result: Result) {
  const node: Record<string, unknown> = {
    select: () => node,
    eq: () => node,
    in: () => node,
    limit: () => node,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve: (v: Result) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return node;
}

function fakeSupabase(opts: {
  profile?: Result;
  applications?: Result;
  payments?: Result;
  terms?: Result;
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email_confirmed_at: '2026-01-01T00:00:00Z' } },
      }),
    },
    from: (table: string) => {
      if (table === 'profiles') return chain(opts.profile ?? { data: null, error: null });
      if (table === 'applications') return chain(opts.applications ?? { data: [], error: null });
      if (table === 'payments') return chain(opts.payments ?? { data: null, error: null });
      if (table === 'terms_acceptance') {
        return chain(opts.terms ?? { data: null, error: { code: 'PGRST116', message: 'no rows' } });
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };
}

const mockCreateServerClient = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  })),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({ limit: jest.fn() })),
    { slidingWindow: jest.fn() }
  ),
}));

const mockCaptureApiError = jest.fn();
jest.mock('@/lib/capture-error', () => ({
  captureApiError: (...args: unknown[]) => mockCaptureApiError(...args),
}));

function fakeRequest(pathname: string): NextRequest {
  const url = new URL(pathname, 'https://e2go.vercel.app');
  return new NextRequest(url, {
    headers: { host: 'e2go.vercel.app', 'x-forwarded-for': '1.2.3.4' },
  });
}

let mw: typeof import('../middleware');

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-dummy';
  // Configured so the cache-skip assertions below are meaningful — with Redis
  // unset, safeCacheSet is already a no-op regardless of the fix.
  process.env.UPSTASH_REDIS_REST_URL = 'https://example-redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token-dummy';
  mw = await import('../middleware');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisGet.mockResolvedValue(null); // always a cold cache
});

describe('Middleware fail-open on Supabase errors (RS-3 / Gap G-15)', () => {
  it('grants access, alerts, and skips the access cache when the applications/profile pair errors', async () => {
    mockCreateServerClient.mockReturnValue(
      fakeSupabase({
        applications: { data: null, error: { code: '57014', message: 'statement timeout' } },
        profile: { data: { deleted_at: null }, error: null },
      })
    );

    const res = await mw.middleware(fakeRequest('/case-profile'));

    expect(res.headers.get('location')).toBeNull();
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ route: 'middleware', stage: 'payment-gate-lookup', userId: 'user-1' })
    );
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('grants access, alerts, and skips the access cache when the FDD payment lookup errors', async () => {
    mockCreateServerClient.mockReturnValue(
      fakeSupabase({
        applications: { data: [], error: null },
        profile: { data: null, error: null },
        payments: { data: null, error: { code: '57014', message: 'statement timeout' } },
      })
    );

    const res = await mw.middleware(fakeRequest('/fdd'));

    expect(res.headers.get('location')).toBeNull();
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ route: 'middleware', stage: 'fdd-payment-lookup', userId: 'user-1' })
    );
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('grants access, alerts, and skips the terms cache when the terms-acceptance lookup errors for a reason other than "no rows"', async () => {
    mockCreateServerClient.mockReturnValue(
      fakeSupabase({
        applications: { data: [{ payment_status: 'paid', source: 'other' }], error: null },
        profile: { data: null, error: null },
        terms: { data: null, error: { code: '57014', message: 'statement timeout' } },
      })
    );

    const res = await mw.middleware(fakeRequest('/apply'));

    expect(res.headers.get('location')).toBeNull();
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ route: 'middleware', stage: 'terms-acceptance-lookup', userId: 'user-1' })
    );
    const termsKey = mw.termsCacheKey('user-1', '1.0');
    const cachedTermsKeys = mockRedisSet.mock.calls.map(([key]) => key);
    expect(cachedTermsKeys).not.toContain(termsKey);
  });

  it('still fails closed on a genuine "no rows yet" terms result — that is the real not-yet-accepted case, not a Supabase failure', async () => {
    mockCreateServerClient.mockReturnValue(
      fakeSupabase({
        applications: { data: [{ payment_status: 'paid', source: 'other' }], error: null },
        profile: { data: null, error: null },
        terms: { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      })
    );

    const res = await mw.middleware(fakeRequest('/apply'));

    expect(res.headers.get('location')).toContain('/terms-required');
    expect(mockCaptureApiError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stage: 'terms-acceptance-lookup' })
    );
  });
});
