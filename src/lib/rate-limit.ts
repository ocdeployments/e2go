/**
 * Rate limiting for API routes — Upstash Redis (sliding window)
 *
 * Config: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env.local / Vercel env vars
 * Without Upstash configured — or when Redis is unreachable — limits fall back
 * to a per-instance in-memory counter. That is weaker than Redis (each
 * serverless instance keeps its own tally) but it keeps cost-critical routes
 * bounded instead of leaving them unlimited, and it never takes a route down.
 *
 * Profiles:
 *   faq           — 10 req / 10 min   (public search widget)
 *   evaluate      — 30 req / 10 min   (simulator: ~10 questions × 3 retries)
 *   coaching      — 6 req / 60 min    (one report per session, small buffer)
 *   tts           — 60 req / 10 min   (voice: question audio per interview)
 *   transcribe    — 60 req / 10 min   (voice: answer audio per interview)
 *   generate      — 4 req / 60 min    (doc gen: expensive Anthropic call)
 *   fdd           — 3 req / 60 min    (FDD extract + score: expensive LLM pipeline)
 *   fdd-analysis  — 10 req / 60 min   (FDD report/territory/compare + market analysis)
 *   semantic-eval — 10 req / 10 min   (gap analysis semantic evaluation)
 *   parse-doc     — 10 req / 10 min   (document parse/comprehension)
 *   notification  — 3 req / 60 min    (admin-inbox notifications, e.g. franchise referral)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitProfile = 'faq' | 'evaluate' | 'coaching' | 'tts' | 'transcribe' | 'generate' | 'fdd' | 'fdd-analysis' | 'semantic-eval' | 'parse-doc' | 'notification' | 'gap-analysis-run' | 'resend-results';

const PROFILES: Record<RateLimitProfile, { requests: number; window: string }> = {
  faq:                { requests: 10,  window: '10 m' },
  evaluate:           { requests: 30,  window: '10 m' },
  coaching:           { requests: 6,   window: '60 m' },
  tts:                { requests: 60,  window: '10 m' },
  transcribe:         { requests: 60,  window: '10 m' },
  generate:           { requests: 4,   window: '60 m' },
  fdd:                { requests: 3,   window: '60 m' },
  'fdd-analysis':     { requests: 10,  window: '60 m' },
  'semantic-eval':    { requests: 10,  window: '10 m' },
  'parse-doc':        { requests: 10,  window: '10 m' },
  notification:       { requests: 3,   window: '60 m' },
  'gap-analysis-run': { requests: 10,  window: '10 m' },
  // Emails an address the caller only has to type. Kept tight in both
  // directions: per-IP so one client cannot spray, per-address so a victim
  // cannot be mail-bombed from many IPs.
  'resend-results':   { requests: 3,   window: '60 m' },
};

const limiters = new Map<RateLimitProfile, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let redis: Redis | null | undefined = undefined;

function getLimiter(profile: RateLimitProfile): Ratelimit | null {
  if (limiters.has(profile)) return limiters.get(profile)!;

  if (redis === undefined) {
    redis = getRedis();
    if (!redis) {
      console.warn(
        '⚠️  Upstash Redis not configured — falling back to per-instance in-memory rate limiting. ' +
        'Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for shared enforcement.'
      );
    }
  }

  if (!redis) return null;

  const { requests, window } = PROFILES[profile];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: true,
    prefix: `e2go:${profile}`,
  });

  limiters.set(profile, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback — used when Redis is unconfigured or unreachable.
// ---------------------------------------------------------------------------
const WINDOW_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parse an Upstash window string ('10 m', '60 m') into milliseconds. */
function windowMs(window: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(window.trim());
  if (!match) return 60 * 60 * 1000; // unparseable — assume the longest common window
  return Number(match[1]) * WINDOW_UNITS[match[2]];
}

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(profile: RateLimitProfile, identifier: string): RateLimitResult {
  const { requests, window } = PROFILES[profile];
  const key = `${profile}:${identifier}`;
  const now = Date.now();
  const record = memoryCounters.get(key);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs(window);
    memoryCounters.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: requests - 1, reset: Math.ceil((resetAt - now) / 1000) };
  }

  const reset = Math.ceil((record.resetAt - now) / 1000);
  if (record.count >= requests) {
    return { allowed: false, remaining: 0, reset };
  }

  record.count += 1;
  return { allowed: true, remaining: requests - record.count, reset };
}

/**
 * Circuit breaker — see the same pattern in src/middleware.ts.
 *
 * A deleted or unreachable Upstash host does not reject quickly; each call
 * waits out a DNS/connect timeout first. Without a breaker every request to a
 * rate-limited route pays that latency before falling back, which is slow
 * enough to look like a hang. After a failure we use the in-memory counter
 * directly for a cooldown, then probe Redis again.
 */
const REDIS_COOLDOWN_MS = 30_000;
let redisDownUntil = 0;

function redisAvailable(): boolean {
  return Date.now() >= redisDownUntil;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // seconds until reset
}

export async function checkRateLimit(
  identifier: string,
  profile: RateLimitProfile = 'faq'
): Promise<RateLimitResult> {
  const limiter = getLimiter(profile);

  if (!limiter || !redisAvailable()) return memoryLimit(profile, identifier);

  let result;
  try {
    result = await limiter.limit(identifier);
    redisDownUntil = 0;
    // `limit()` settles its background work (multi-region sync, analytics) on
    // `pending`. Upstash requires the caller to handle it explicitly on edge
    // runtimes; left unhandled a dead Redis produces an unhandled rejection
    // that can abort the whole invocation.
    void Promise.resolve(result.pending).catch(() => {});
  } catch (err) {
    // Redis unreachable, deleted, or auth failure (e.g. WRONGPASS). Fall back
    // to the in-memory counter: cost-critical profiles stay bounded per
    // instance, and no route goes down because the cache is gone.
    redisDownUntil = Date.now() + REDIS_COOLDOWN_MS;
    console.error(`[rate-limit] Redis error on ${profile} — falling back to in-memory:`, err instanceof Error ? err.message : err);
    return memoryLimit(profile, identifier);
  }

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: Math.ceil((result.reset - Date.now()) / 1000),
  };
}
