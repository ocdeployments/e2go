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

  // Rate limit login route
  if ((pathname === '/login' || pathname === '/api/auth/v1/token') && process.env.NODE_ENV === 'production') {
    if (loginLimiter) {
      const { success } = await loginLimiter.limit(ip);
      if (!success) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    } else {
      const allowed = devCheckRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
      if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
  }

  // Rate limit quiz submission
  if (pathname === '/api/quiz/submit' || pathname === '/api/email/results') {
    if (quizLimiter) {
      const { success } = await quizLimiter.limit(ip);
      if (!success) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    } else {
      const allowed = devCheckRateLimit(`quiz:${ip}`, 3, 60 * 60 * 1000);
      if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
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
  ];

  // Requires a paid application — redirects to /results if not paid
  const PAID_ROUTES = [
    '/case-profile',
    '/apply',
    '/fdd',
    '/gap-analysis',
    '/market-analysis',
    '/simulator',
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
  // Payment gate — authenticated users must have a paid application
  // ---------------------------------------------------------------------------
  if (user && PAID_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: apps } = await supabase
      .from('applications')
      .select('payment_status, source')
      .eq('user_id', user.id);

    // Full package: any paid application that isn't simulator-standalone
    const hasFullAccess = apps?.some(
      a => a.payment_status === 'paid' && a.source !== 'simulator_standalone'
    ) ?? false;

    // Simulator-only: has a standalone simulator purchase
    const hasSimulatorAccess = apps?.some(a => a.source === 'simulator_standalone') ?? false;

    if (!hasFullAccess) {
      // FDD standalone buyers can access /fdd routes even without a full package
      if (pathname.startsWith('/fdd')) {
        const { data: fddPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', user.id)
          .in('payment_type', ['fdd_intelligence', 'fdd_intelligence_loyalty'])
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        if (fddPayment) {
          // FDD standalone purchase — allow through
        } else if (hasSimulatorAccess) {
          return NextResponse.redirect(new URL('/simulator', req.url));
        } else {
          return NextResponse.redirect(new URL('/results', req.url));
        }
      } else if (hasSimulatorAccess && pathname.startsWith('/simulator')) {
        // Simulator-only subscriber on their permitted route — pass through
      } else if (hasSimulatorAccess) {
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
  // ---------------------------------------------------------------------------
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
