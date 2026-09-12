/**
 * POST /api/auth/login
 *
 * G-12: signInWithPassword() used to be called directly from the browser,
 * so neither the Upstash rate limiter nor Turnstile ever saw a login
 * attempt — both live server-side. This route puts the call behind both:
 * IP-keyed rate limiting, then a fail-closed Turnstile check, before Supabase
 * Auth is ever touched. Called via createSupabaseServerClient() so the
 * session cookie lands on the response through the normal @supabase/ssr
 * cookie adapter — the browser client picks it up on its next call.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { captureApiError } from '@/lib/capture-error';

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
        { error: 'Too many sign-in attempts. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    let body: { email?: string; password?: string; captchaToken?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email, password, captchaToken } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const captcha = await verifyTurnstile(captchaToken, ip, { route: 'auth/login' });
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    captureApiError(error, { route: 'auth/login' });
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 500 });
  }
}
