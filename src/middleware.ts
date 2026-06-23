import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Rate limiting — Upstash Redis in production, in-memory fallback for dev
// ---------------------------------------------------------------------------
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:login' })
  : null;

const quizLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '60 m'), prefix: 'rl:quiz' })
  : null;

// In-memory fallback (single-instance dev only)
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

  // Rate limit login route: 5 attempts per IP per 15 minutes (production only)
  if ((pathname === '/login' || pathname === '/api/auth/v1/token') && process.env.NODE_ENV === 'production') {
    if (loginLimiter) {
      const { success } = await loginLimiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }
    } else {
      const allowed = devCheckRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }
    }
  }

  // Rate limit quiz route completions: 3 completions per IP per hour
  if (pathname === '/api/quiz/submit' || pathname === '/api/email/results') {
    if (quizLimiter) {
      const { success } = await quizLimiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }
    } else {
      const allowed = devCheckRateLimit(`quiz:${ip}`, 3, 60 * 60 * 1000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }
    }
  }

  // Note: /api/generate and /api/analysis rate limiting is enforced inside each route
  // using Upstash Redis keyed on the verified session user.id — not here.
  // A header-based limit here was bypassable by spoofing x-user-id.

  let supabaseResponse = NextResponse.next({
    request: req,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() validates the JWT against the Supabase Auth server on every
  // request — unlike getSession() which trusts the cookie without verification
  // and lets expired/forged tokens through to protected pages.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Enforce email verification — redirect to /verify if email not confirmed
  // Exception: /verify itself and /api/auth/* routes must not redirect (infinite loop)
  if (user && !user.email_confirmed_at) {
    const isVerifyRoute = pathname === '/verify';
    const isApiAuthRoute = pathname.startsWith('/api/auth');
    if (!isVerifyRoute && !isApiAuthRoute) {
      return NextResponse.redirect(new URL('/verify', req.url));
    }
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/apply/',
    '/admin',
    '/simulator',
    '/score',
    '/settings',
    '/generate/',
    '/documents/',
    '/fdd/',
    '/gap-analysis',
    '/market-analysis',
  ];

  // Auth routes - redirect to dashboard if already logged in
  const authRoutes = ['/login', '/signup'];

  // Check if accessing a protected route without a verified user
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Gate /apply routes on terms acceptance (must be after auth check)
  const TERMS_VERSION = '1.0';
  if (user && pathname.startsWith('/apply')) {
    const { data: acceptance } = await supabase
      .from('terms_acceptance')
      .select('terms_version')
      .eq('user_id', user.id)
      .eq('terms_version', TERMS_VERSION)
      .single();

    if (!acceptance) {
      const termsUrl = new URL('/terms-required', req.url);
      termsUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(termsUrl);
    }
  }

  // Block standalone simulator subscribers from case-building / document-
  // generation routes and the main application dashboard. They only purchased
  // the interview simulator — /simulator is their home.
  const SIMULATOR_BLOCKED_ROUTES = ['/apply', '/generate/', '/documents/', '/dashboard'];
  if (user && SIMULATOR_BLOCKED_ROUTES.some((route) => pathname.startsWith(route))) {
    const { data: apps } = await supabase
      .from('applications')
      .select('source')
      .eq('user_id', user.id);

    const simulatorOnly = Boolean(
      apps && apps.length > 0 && apps.every((a) => a.source === 'simulator_standalone')
    );

    if (simulatorOnly) {
      return NextResponse.redirect(new URL('/simulator', req.url));
    }
  }

  // Redirect verified users away from auth pages
  if (user && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/apply/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/simulator',
    '/simulator/:path*',
    '/score',
    '/settings',
    '/generate/:path*',
    '/documents/:path*',
    '/api/quiz/submit',
    '/api/email/results',
    '/api/generate/:path*',
    '/api/analysis/:path*',
    '/fdd/:path*',
    '/api/fdd/:path*',
    '/gap-analysis',
    '/gap-analysis/:path*',
    '/market-analysis',
    '/market-analysis/:path*',
    '/api/market-analysis',
  ],
};
