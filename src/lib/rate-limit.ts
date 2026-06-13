/**
 * Rate limiting for public API routes — Upstash Redis
 * Session 11: Ask E2go FAQ
 *
 * Config: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env.local
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "⚠️  Upstash Redis not configured — rate limiting disabled. " +
        "Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local"
    );
    return null;
  }

  const redis = new Redis({ url, token });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 m"), // 10 requests per 10 minutes
    analytics: true,
    prefix: "e2go:faq",
  });

  return ratelimit;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // seconds until reset
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limit = getRatelimit();

  if (!limit) {
    // No Redis configured — allow all requests (fail open)
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const result = await limit.limit(identifier);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: Math.ceil((result.reset - Date.now()) / 1000),
  };
}
