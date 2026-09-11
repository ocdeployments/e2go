/**
 * RS-12 (Gap G-23): the in-memory fallback is correct for availability but
 * multiplies the effective ceiling by live instance count during an Upstash
 * outage — and the routes it protects (generation, extraction, simulator)
 * are LLM-backed, i.e. expensive. These tests drive `checkRateLimit` with an
 * unreachable Upstash client and assert: (1) a cost-critical profile still
 * gets refused once a hard per-instance ceiling is hit, even though each
 * individual identifier is well under its own per-user cap, and (2) the
 * Sentry alert on fallback activation fires exactly once per outage window,
 * not once per request.
 */

export {};

const limitMock = jest.fn();

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({ limit: limitMock })),
    { slidingWindow: jest.fn(() => 'sliding-window') }
  ),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

const mockCaptureApiError = jest.fn();
jest.mock('@/lib/capture-error', () => ({
  captureApiError: (...args: unknown[]) => mockCaptureApiError(...args),
}));

const REDIS_ENV = {
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token',
};

/** Re-import the module so its cached limiters and counters start empty. */
async function freshModule(env: Record<string, string | undefined>) {
  jest.resetModules();
  limitMock.mockReset();
  mockCaptureApiError.mockReset();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import('../rate-limit');
}

const ENV_KEYS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('hard per-instance cap on cost-critical profiles', () => {
  it('refuses a cost-critical profile past the hard cap even with distinct identifiers', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND dead.upstash.io'));

    // 'evaluate' allows 30 per identifier per 10 min, so 20 distinct users
    // making one request each would sail past any single-identifier check —
    // the hard per-instance ceiling (15) must still bite well before that.
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      results.push(await checkRateLimit(`user-${i}`, 'evaluate'));
    }

    const allowedCount = results.filter(r => r.allowed).length;
    expect(allowedCount).toBe(15);
    expect(results[19].allowed).toBe(false);
  });

  it('does not apply the hard cap to non-cost-critical profiles', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('fetch failed'));

    // 'faq' (10 req / 10 min per identifier) is not cost-critical — 20
    // distinct identifiers each making one request should all be allowed.
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      results.push(await checkRateLimit(`user-${i}`, 'faq'));
    }

    expect(results.every(r => r.allowed)).toBe(true);
  });

  it('still enforces the normal per-identifier cap underneath the instance ceiling', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('fetch failed'));

    // 'fdd' = 3 per identifier per hour, well under the 15-per-instance cap.
    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(true);
    }
    expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(false);
  });
});

describe('Sentry alert on fallback activation', () => {
  it('fires exactly once per outage window, not once per request', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND dead.upstash.io'));

    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit('user-1', 'generate');
    }

    expect(mockCaptureApiError).toHaveBeenCalledTimes(1);
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: 'rate-limit', stage: 'fallback-activated', profile: 'generate' })
    );
  });

  it('fires again on a new outage after Redis recovers in between', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValueOnce(new Error('fetch failed'));

    await checkRateLimit('user-1', 'generate');
    expect(mockCaptureApiError).toHaveBeenCalledTimes(1);

    // The circuit breaker holds the in-memory path for 30s regardless of
    // Redis's real state — jump past the cooldown so the next call actually
    // probes Redis again instead of short-circuiting straight to memoryLimit.
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + 31_000);

    // Redis recovers — clears the circuit breaker and the alert latch.
    limitMock.mockResolvedValueOnce({
      success: true,
      remaining: 3,
      reset: realNow() + 60_000,
      pending: Promise.resolve(),
    });
    await checkRateLimit('user-1', 'generate');

    // A fresh outage should alert again.
    limitMock.mockRejectedValue(new Error('fetch failed'));
    await checkRateLimit('user-1', 'generate');

    expect(mockCaptureApiError).toHaveBeenCalledTimes(2);
  });

  it('does not fire when Upstash is simply unconfigured (no outage, no Redis attempted)', async () => {
    const { checkRateLimit } = await freshModule({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    await checkRateLimit('user-1', 'generate');

    expect(mockCaptureApiError).not.toHaveBeenCalled();
  });
});
