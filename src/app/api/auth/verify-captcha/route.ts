/**
 * POST /api/auth/verify-captcha
 *
 * Validates a Cloudflare Turnstile token server-side before allowing signup.
 * If TURNSTILE_SECRET_KEY is not configured, returns ok=true (graceful
 * degradation — CAPTCHA is optional until keys are provisioned).
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Not configured — skip CAPTCHA check (degrade gracefully)
  if (!secretKey) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let token: string;
  try {
    const body = await request.json();
    token = body.token;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing CAPTCHA token' }, { status: 400 });
  }

  // Verify with Cloudflare's siteverify endpoint
  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '';

  const form = new FormData();
  form.append('secret', secretKey);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      console.warn('[verify-captcha] Turnstile rejected token:', data['error-codes']);
      return NextResponse.json({ ok: false, error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[verify-captcha] Turnstile API error:', err);
    // On network failure, allow through — CAPTCHA is defense-in-depth, not a gate
    return NextResponse.json({ ok: true, skipped: true });
  }
}
