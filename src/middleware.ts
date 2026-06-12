import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetAt) {
    // First request or window expired
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    // Over limit
    return false;
  }

  // Within limit
  record.count += 1;
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';

  // Rate limit login route: 5 attempts per IP per 15 minutes
  // Disabled in development to avoid blocking during testing
  if ((pathname === '/login' || pathname === '/api/auth/v1/token') && process.env.NODE_ENV === 'production') {
    const key = `login:${ip}`;
    const allowed = checkRateLimit(key, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }
  }

  // Rate limit quiz route completions: 3 completions per IP per hour
  if (pathname === '/api/quiz/submit' || pathname === '/api/email/results') {
    const key = `quiz:${ip}`;
    const allowed = checkRateLimit(key, 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }
  }

  // Rate limit AI API route: 50 calls per user per day
  if ((pathname.startsWith('/api/generate') && !pathname.includes('/progress')) || pathname.startsWith('/api/analysis')) {
    const userId = req.headers.get('x-user-id') || ip;
    const key = `ai:${userId}`;
    const allowed = checkRateLimit(key, 50, 24 * 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }
  }

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

  // Refresh the session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Enforce email verification — redirect to /verify if email not confirmed
  // Exception: /verify itself and /api/auth/* routes must not redirect (infinite loop)
  if (session && !session.user.email_confirmed_at) {
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
  ];

  // Auth routes - redirect to dashboard if already logged in
  const authRoutes = ['/login', '/signup'];

  // Check if accessing a protected route without session
  if (!session && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Gate /apply routes on terms acceptance (must be after auth check)
  const TERMS_VERSION = '1.0';
  if (session && pathname.startsWith('/apply')) {
    const { data: acceptance } = await supabase
      .from('terms_acceptance')
      .select('terms_version')
      .eq('user_id', session.user.id)
      .eq('terms_version', TERMS_VERSION)
      .single();

    if (!acceptance) {
      const termsUrl = new URL('/terms-required', req.url);
      termsUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(termsUrl);
    }
  }

  // Redirect logged-in users away from auth pages
  if (session && authRoutes.includes(pathname)) {
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
  ],
};