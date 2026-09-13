/**
 * Cloudflare Turnstile CAPTCHA verification (server-side).
 *
 * G-12: verification must fail CLOSED on a network/timeout error — a
 * legitimate visitor gets a "try again" message, but the auth attempt is
 * blocked rather than waved through. The only case that still degrades
 * gracefully (ok: true, skipped: true) is TURNSTILE_SECRET_KEY being unset,
 * which is a deployment-config state decided at deploy time, not a live
 * failure an attacker can trigger.
 */
import { captureApiError } from './capture-error';

export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

const SITEVERIFY_TIMEOUT_MS = 5_000;

export async function verifyTurnstile(
  token: string | undefined | null,
  ip: string,
  context: Record<string, unknown> = {}
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, error: 'Missing CAPTCHA token' };
  }

  const form = new FormData();
  form.append('secret', secretKey);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      console.warn('[turnstile] rejected token:', data['error-codes']);
      return { ok: false, error: 'CAPTCHA verification failed. Please try again.' };
    }

    return { ok: true };
  } catch (err) {
    captureApiError(err, { route: 'turnstile-verify', ...context });
    return { ok: false, error: 'CAPTCHA verification is temporarily unavailable. Please try again in a moment.' };
  }
}
