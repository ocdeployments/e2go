/**
 * Re-send an eligibility result to the address that took the quiz.
 *
 * The browser cannot do this lookup itself: anonymous callers have no SELECT
 * policy on quiz_sessions, so a client-side query returns nothing regardless
 * of whether results exist.
 *
 * Because the caller only has to type an address to trigger mail to it, this
 * route is deliberately blunt about what it gives back — the response is
 * identical whether or not an address has results. Confirming existence here
 * would turn the endpoint into an account-enumeration oracle, and differing
 * responses would leak that even without an email being sent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendResultsEmail } from '@/lib/emails/results-email';
import { captureApiError } from '@/lib/capture-error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returned on every non-rate-limited outcome. Says nothing about existence. */
const NEUTRAL_RESPONSE = {
  success: true,
  message: "If we have results for that address, we've sent a link to it.",
};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Two buckets. The IP bucket stops one caller working through a list; the
  // address bucket stops many callers converging on one inbox.
  const ipLimit = await checkRateLimit(getClientIp(req), 'resend-results');
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.reset) } }
    );
  }

  const emailLimit = await checkRateLimit(`email:${email}`, 'resend-results');
  if (!emailLimit.allowed) {
    // Same shape as the IP refusal — a distinct message here would confirm
    // that this particular address is one people keep asking for.
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(emailLimit.reset) } }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: session, error } = await supabase
    .from('quiz_sessions')
    .select('id, email, outcome, result_json, franchise_interest')
    .eq('email', email)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    captureApiError(error, { route: 'email/resend-results', stage: 'session-lookup' });
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  // No results for this address: stop here, but answer exactly as if we sent.
  if (!session) {
    return NextResponse.json(NEUTRAL_RESPONSE);
  }

  const sent = await sendResultsEmail({
    supabase,
    email: session.email,
    outcome: session.outcome,
    result_json: (session.result_json ?? {}) as Record<string, unknown>,
    franchise_interest: session.franchise_interest ?? false,
    quiz_session_id: session.id,
  });

  if (!sent) {
    // A genuine send failure is ours, not a statement about the address.
    return NextResponse.json(
      { error: 'Could not send the email right now. Please try again shortly.' },
      { status: 500 }
    );
  }

  return NextResponse.json(NEUTRAL_RESPONSE);
}
