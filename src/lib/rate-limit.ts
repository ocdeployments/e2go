/**
 * Rate limiting for API routes — Upstash Redis (sliding window)
 *
 * Config: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env.local / Vercel env vars
 * Without Upstash configured, all limits fail open (allow) — add Upstash to enable enforcement.
 *
 * Profiles:
 *   faq           — 10 req / 10 min   (public search widget)
 *   evaluate      — 30 req / 10 min   (simulator: ~10 questions × 3 retries)
 *   coaching      — 6 req / 60 min    (one report per session, small buffer)
 *   tts           — 60 req / 10 min   (voice: question audio per interview)
 *   transcribe    — 60 req / 10 min   (voice: answer audio per interview)
 *   generate      — 4 req / 60 min    (doc gen: expensive Anthropic call)
 *   fdd           — 3 req / 60 min    (FDD extract + score: expensive LLM pipeline)
 *   semantic-eval — 10 req / 10 min   (gap analysis semantic evaluation)
 *   parse-doc     — 10 req / 10 min   (document parse/comprehension)
 *   notification  — 3 req / 60 min    (admin-inbox notifications, e.g. franchise referral)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitProfile = 'faq' | 'evaluate' | 'coaching' | 'tts' | 'transcribe' | 'generate' | 'fdd' | 'semantic-eval' | 'parse-doc' | 'notification' | 'gap-analysis-run';

const PROFILES: Record<RateLimitProfile, { requests: number; window: string }> = {
  faq:                { requests: 10,  window: '10 m' },
  evaluate:           { requests: 30,  window: '10 m' },
  coaching:           { requests: 6,   window: '60 m' },
  tts:                { requests: 60,  window: '10 m' },
  transcribe:         { requests: 60,  window: '10 m' },
  generate:           { requests: 4,   window: '60 m' },
  fdd:                { requests: 3,   window: '60 m' },
  'semantic-eval':    { requests: 10,  window: '10 m' },
  'parse-doc':        { requests: 10,  window: '10 m' },
  notification:       { requests: 3,   window: '60 m' },
  'gap-analysis-run': { requests: 10,  window: '10 m' },
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
        '⚠️  Upstash Redis not configured — rate limiting disabled. ' +
        'Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.'
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

  if (!limiter) {
    // Upstash not configured — fail CLOSED on cost-critical profiles, open on others
    const costCritical: RateLimitProfile[] = ['generate', 'fdd'];
    if (costCritical.includes(profile)) {
      console.error(`[rate-limit] Upstash not configured — blocking ${profile} to prevent unbounded cost. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.`);
      return { allowed: false, remaining: 0, reset: 0 };
    }
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const result = await limiter.limit(identifier);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: Math.ceil((result.reset - Date.now()) / 1000),
  };
}
