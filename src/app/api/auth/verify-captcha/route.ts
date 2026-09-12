/**
 * POST /api/auth/verify-captcha
 *
 * Instant client-side CAPTCHA feedback on the signup form (shows a "verified"
 * checkmark before submission). Not the authoritative check — the real gate
 * is the server-side verifyTurnstile() call inside /api/auth/signup, which
 * cannot be bypassed by skipping this pre-check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  let token: string;
  try {
    const body = await request.json();
    token = body.token;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '';
  const result = await verifyTurnstile(token, ip, { route: 'auth/verify-captcha' });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, skipped: result.skipped });
}
