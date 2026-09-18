/**
 * POST /api/auth/signup
 *
 * G-12: signUp() used to be called directly from the browser, so neither
 * the Upstash rate limiter nor Turnstile ever saw a signup attempt — both
 * live server-side. This route puts the call behind both: IP-keyed rate
 * limiting, then a fail-closed Turnstile check, before Supabase Auth is
 * ever touched. Called via createSupabaseServerClient() so the session
 * cookie (when email confirmation is off) lands on the response through
 * the normal @supabase/ssr cookie adapter.
 *
 * `next` must already be a same-origin relative path (validate with
 * safeRedirect() client-side before sending) — the absolute redirect URL
 * is built here from NEXT_PUBLIC_SITE_URL, never from a client-supplied
 * origin, so a spoofed Host header can't produce an open-redirect email link.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { captureApiError } from '@/lib/capture-error';
import { validatePassword } from '@/lib/password-policy';

export const dynamic = 'force-dynamic';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const rl = await checkRateLimit(ip, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    let body: { email?: string; password?: string; captchaToken?: string; firstName?: string; lastName?: string; next?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email, password, captchaToken, firstName, lastName, next } = body;

    if (!email || !password || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name, last name, email, and password are required' }, { status: 400 });
    }

    const passwordError = validatePassword(password, email);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const captcha = await verifyTurnstile(captchaToken, ip, { route: 'auth/signup' });
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    // `next` is trusted only insofar as it's a relative path — the origin
    // always comes from our own env, never from client input or headers.
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}${safeNext}`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Supabase Auth returns a fake success (no error) for an email that
    // already has a confirmed account, to avoid leaking which emails are
    // registered. It's distinguishable here: identities comes back empty
    // instead of containing the new email/password identity.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });
  } catch (error) {
    captureApiError(error, { route: 'auth/signup' });
    return NextResponse.json({ error: 'Sign-up failed' }, { status: 500 });
  }
}
