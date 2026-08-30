import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Redis — shared instance for rate limiting AND middleware caching
// ---------------------------------------------------------------------------
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// ---------------------------------------------------------------------------
// Middleware cache — 30-min TTL, invalidated by webhook + accept-terms routes
// ---------------------------------------------------------------------------
const CACHE_TTL_SECONDS = 1800;

interface AccessCache {
  full: boolean;     // paid non-simulator application exists
  sim: boolean;      // simulator-standalone purchase exists
  fdd: boolean;      // standalone fdd_intelligence payment exists
  deleted?: boolean; // soft-deleted accounts — redirected to /account-recovery
}

/** Exported so stripe webhook + payment routes can call invalidation */
export function accessCacheKey(userId: string): string {
  return `mw:access:${userId}`;
}

/** Exported so accept-terms route can call invalidation */
export function termsCacheKey(userId: string, version: string): string {
  return `mw:terms:${userId}:${version}`;
}

// ---------------------------------------------------------------------------
// Rate limiting — Upstash Redis in production, in-memory fallback for dev
// ---------------------------------------------------------------------------
const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:login' })
  : null;

const quizLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '60 m'), prefix: 'rl:quiz' })
  : null;

// ---------------------------------------------------------------------------
// Safe Redis wrappers — a Redis outage or auth failure (e.g. WRONGPASS, or a
// deleted database) must never 500 the middleware: rate limits fall back to the
// in-memory counter, cache reads fall back to the DB path, cache writes are
// dropped.
// ---------------------------------------------------------------------------
interface LimitSpec {
  limiter: Ratelimit | null;
  ip: string;
  /** Namespace for the in-memory fallback counter. */
  name: string;
  limit: number;
  windowMs: number;
}

/**
 * Enforce a rate limit, degrading rather than failing when Redis is unavailable.
 *
 * Two failure modes are handled here:
 *  1. `limiter.limit()` rejecting — Redis unreachable, deleted, or WRONGPASS.
 *  2. The SDK's `pending` promise rejecting. `limit()` settles background work
 *     (multi-region sync, analytics) on that promise, and the Upstash docs
 *     require the caller to handle it explicitly on the Edge runtime. Left
 *     unhandled it becomes an unhandled rejection that aborts the whole
 *     invocation — which is how a deleted Redis turned /login into a 500
 *     even though the try/catch below was already in place.
 *
 * When Redis is gone we fall back to the in-memory counter rather than waving
 * every request through: per-instance limiting is weaker than Redis, but it
 * still blunts brute-force attempts instead of removing the limit entirely.
 */
async function enforceLimit({ limiter, ip, name, limit, windowMs }: LimitSpec): Promise<boolean> {
  const fallbackKey = `${name}:${ip}`;
  if (!limiter) return devCheckRateLimit(fallbackKey, limit, windowMs);

  try {
    const result = await limiter.limit(ip);
    void Promise.resolve(result.pending).catch(() => {});
    return result.success;
  } catch (err) {
    console.error(`[middleware] Redis rate-limit unavailable on ${name} — falling back to in-memory:`, err instanceof Error ? err.message : err);
    return devCheckRateLimit(fallbackKey, limit, windowMs);
  }
}

async function safeCacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (err) {
    console.error('[middleware] Redis cache read error — treating as miss:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function safeCacheSet(key: string, value: unknown, ex: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex });
  } catch (err) {
    console.error('[middleware] Redis cache write error — skipping:', err instanceof Error ? err.message : err);
  }
}

// In-memory fallback — dev, and any request where Redis is unreachable
const devLimits = new Map<string, { count: number; resetAt: number }>();

function devCheckRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = devLimits.get(key);
  if (!record || now > record.resetAt) {
    devLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count += 1;
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';

  // Rate limit login route
  if ((pathname === '/login' || pathname === '/api/auth/v1/token') && process.env.NODE_ENV === 'production') {
    const allowed = await enforceLimit({ limiter: loginLimiter, ip, name: 'login', limit: 5, windowMs: 15 * 60 * 1000 });
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  // Rate limit quiz submission
  if (pathname === '/api/quiz/submit' || pathname === '/api/email/results') {
    const allowed = await enforceLimit({ limiter: quizLimiter, ip, name: 'quiz', limit: 3, windowMs: 60 * 60 * 1000 });
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Validate JWT server-side on every request
  const { data: { user } } = await supabase.auth.getUser();

  // Enforce email verification
  if (user && !user.email_confirmed_at) {
    const isVerifyRoute = pathname === '/verify';
    const isApiAuthRoute = pathname.startsWith('/api/auth');
    if (!isVerifyRoute && !isApiAuthRoute) {
      return NextResponse.redirect(new URL('/verify', req.url));
    }
  }

  // ---------------------------------------------------------------------------
  // Route classification
  // ---------------------------------------------------------------------------

  // Requires authentication only (quiz and results are free)
  const AUTH_ROUTES = [
    '/dashboard',
    '/admin',
    '/score',
    '/settings',
    '/generate/',
    '/documents/',
    '/franchise/',
    '/renewal',
  ];

  // Requires a paid application — redirects to /results if not paid
  const PAID_ROUTES = [
    '/case-profile',
    '/apply',
    '/fdd',
    '/gap-analysis',
    '/market-analysis',
    '/simulator',
    '/onboarding',
  ];

  // Auth pages — redirect to /case-profile if already signed in
  const AUTH_PAGES = ['/login', '/signup'];

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
  const needsAuth = [...AUTH_ROUTES, ...PAID_ROUTES].some(r => pathname.startsWith(r));
  if (!user && needsAuth) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ---------------------------------------------------------------------------
  // Soft-delete guard for AUTH_ROUTES
  // PAID_ROUTES handle this within their own cache block below.
  // ---------------------------------------------------------------------------
  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const cachedAccess = await safeCacheGet<AccessCache>(accessCacheKey(user.id));
    if (cachedAccess?.deleted) {
      return NextResponse.redirect(new URL('/account-recovery', req.url));
    }
    if (!cachedAccess) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.deleted_at) {
        const access: AccessCache = { full: false, sim: false, fdd: false, deleted: true };
        await safeCacheSet(accessCacheKey(user.id), access, 86400);
        return NextResponse.redirect(new URL('/account-recovery', req.url));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Payment gate — authenticated users must have a paid application
  // Cached in Upstash Redis for 30 min; invalidated by stripe webhook on payment
  // ---------------------------------------------------------------------------
  if (user && PAID_ROUTES.some(r => pathname.startsWith(r))) {
    let access: AccessCache | null = await safeCacheGet<AccessCache>(accessCacheKey(user.id));

    if (!access) {
      // Cache miss — fetch soft-delete status and payment status in parallel
      const [{ data: apps }, { data: profile }] = await Promise.all([
        supabase.from('applications').select('payment_status, source').eq('user_id', user.id),
        supabase.from('profiles').select('deleted_at').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profile?.deleted_at) {
        // Soft-deleted — cache with long TTL and redirect
        access = { full: false, sim: false, fdd: false, deleted: true };
        await safeCacheSet(accessCacheKey(user.id), access, 86400);
        return NextResponse.redirect(new URL('/account-recovery', req.url));
      }

      const hasFullAccess = apps?.some(
        a => a.payment_status === 'paid' && a.source !== 'simulator_standalone'
      ) ?? false;

      const hasSimulatorAccess = apps?.some(a => a.source === 'simulator_standalone') ?? false;

      // Pre-fetch FDD status so /fdd route checks also skip the DB on cache hit
      let hasFddAccess = false;
      if (!hasFullAccess) {
        const { data: fddPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', user.id)
          .in('payment_type', ['fdd_intelligence', 'fdd_intelligence_loyalty'])
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        hasFddAccess = !!fddPayment;
      }

      access = { full: hasFullAccess, sim: hasSimulatorAccess, fdd: hasFddAccess };

      await safeCacheSet(accessCacheKey(user.id), access, CACHE_TTL_SECONDS);
    }

    if (access.deleted) {
      return NextResponse.redirect(new URL('/account-recovery', req.url));
    }

    // Grace path — a client landing on /onboarding straight from Stripe checkout
    // carries ?session_id=; the webhook that flips payment_status to 'paid' can
    // lag a few seconds behind the redirect, so the access cache may still read
    // unpaid. Trust a present session_id and let onboarding's own client-side
    // useApplicationGate retry loop (4 attempts, 1.5s apart) wait out the race
    // instead of bouncing a paying client to /results.
    const hasFreshCheckoutSession = pathname.startsWith('/onboarding') && req.nextUrl.searchParams.has('session_id');

    if (!access.full && !hasFreshCheckoutSession) {
      if (pathname.startsWith('/fdd')) {
        if (access.fdd) {
          // FDD standalone purchase — allow through
        } else if (access.sim) {
          return NextResponse.redirect(new URL('/simulator', req.url));
        } else {
          return NextResponse.redirect(new URL('/results', req.url));
        }
      } else if (access.sim && pathname.startsWith('/simulator')) {
        // Simulator-only subscriber on their permitted route — pass through
      } else if (access.sim) {
        // Simulator-only subscriber trying to reach a case-building route
        return NextResponse.redirect(new URL('/simulator', req.url));
      } else {
        // No purchase yet — send to results/pricing page
        return NextResponse.redirect(new URL('/results', req.url));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Terms acceptance gate — /apply routes only
  // Cached in Upstash Redis for 30 min; invalidated by /api/auth/accept-terms
  // ---------------------------------------------------------------------------
  const TERMS_VERSION = '1.0';
  if (user && pathname.startsWith('/apply')) {
    let termsAccepted = false;

    const cachedTerms = await safeCacheGet<number>(termsCacheKey(user.id, TERMS_VERSION));
    termsAccepted = cachedTerms === 1;

    if (!termsAccepted) {
      const { data: acceptance } = await supabase
        .from('terms_acceptance')
        .select('terms_version')
        .eq('user_id', user.id)
        .eq('terms_version', TERMS_VERSION)
        .single();

      if (acceptance) {
        termsAccepted = true;
        await safeCacheSet(termsCacheKey(user.id, TERMS_VERSION), 1, CACHE_TTL_SECONDS);
      }
    }

    if (!termsAccepted) {
      const termsUrl = new URL('/terms-required', req.url);
      termsUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(termsUrl);
    }
  }

  // ---------------------------------------------------------------------------
  // Redirect signed-in users away from auth pages
  // ---------------------------------------------------------------------------
  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/case-profile', req.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Case profile — paid users only
    '/case-profile',
    '/case-profile/:path*',
    // Application building — paid users only
    '/dashboard/:path*',
    '/apply/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/admin/:path*',
    '/score',
    '/settings',
    '/generate/:path*',
    '/documents/:path*',
    // Intelligence modules — paid users only
    '/fdd',
    '/fdd/:path*',
    '/api/fdd/:path*',
    '/gap-analysis',
    '/gap-analysis/:path*',
    '/market-analysis',
    '/market-analysis/:path*',
    '/api/market-analysis',
    // Simulator — paid or simulator-standalone
    '/simulator',
    '/simulator/:path*',
    // Auth pages
    '/login',
    '/signup',
    // Rate-limited API routes
    '/api/quiz/submit',
    '/api/email/results',
    '/api/generate/:path*',
    '/api/analysis/:path*',
  ],
};
