/**
 * Rate-limit fallback behaviour.
 *
 * These cover the path that runs when Upstash Redis is unavailable — the
 * failure mode that took production down when the Upstash database was
 * deleted. The contract is: never throw, never hard-block, still enforce a
 * per-instance limit so cost-critical routes stay bounded.
 */

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

const REDIS_ENV = {
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token',
};

/** Re-import the module so its cached limiters and counters start empty. */
async function freshModule(env: Record<string, string | undefined>) {
  jest.resetModules();
  limitMock.mockReset();
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

describe('checkRateLimit — Upstash not configured', () => {
  it('allows cost-critical profiles instead of hard-blocking them', async () => {
    const { checkRateLimit } = await freshModule({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    const result = await checkRateLimit('user-1', 'generate');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3); // generate = 4 per 60 min, one consumed
    expect(result.reset).toBeGreaterThan(0);
  });

  it('still enforces the profile limit in memory', async () => {
    const { checkRateLimit } = await freshModule({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    // fdd = 3 requests per 60 min
    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(true);
    }

    const blocked = await checkRateLimit('user-1', 'fdd');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('counts each identifier separately', async () => {
    const { checkRateLimit } = await freshModule({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    for (let i = 0; i < 3; i += 1) await checkRateLimit('user-1', 'fdd');

    expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(false);
    expect((await checkRateLimit('user-2', 'fdd')).allowed).toBe(true);
  });
});

describe('checkRateLimit — Redis configured but failing', () => {
  it('falls back to the in-memory counter rather than throwing or blocking', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND dead.upstash.io'));

    const result = await checkRateLimit('user-1', 'generate');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('keeps enforcing the limit while Redis is down', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockRejectedValue(new Error('WRONGPASS'));

    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(true);
    }
    expect((await checkRateLimit('user-1', 'fdd')).allowed).toBe(false);
  });

  it('does not leave the SDK pending promise unhandled', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      limitMock.mockResolvedValue({
        success: true,
        remaining: 2,
        reset: Date.now() + 60_000,
        pending: Promise.reject(new Error('background sync failed')),
      });

      const result = await checkRateLimit('user-1', 'generate');
      expect(result.allowed).toBe(true);

      // Let the microtask queue drain so an unhandled rejection would surface.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

describe('checkRateLimit — Redis healthy', () => {
  it('passes the Redis verdict through unchanged', async () => {
    const { checkRateLimit } = await freshModule(REDIS_ENV);
    limitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      pending: Promise.resolve(),
    });

    const result = await checkRateLimit('user-1', 'generate');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reset).toBeGreaterThan(0);
    expect(limitMock).toHaveBeenCalledWith('user-1');
  });
});
