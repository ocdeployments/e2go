/**
 * The eligibility-result email.
 *
 * Two variants, keyed on quiz outcome: qualified applicants get an encouraging
 * subject and copy, everyone else gets a neutral one. Neither variant states
 * the score or the outcome itself — the whole point of the tokenised link is
 * that results are only shown after the address is confirmed, so putting the
 * verdict in the email body would defeat the gate it exists to protect.
 *
 * buildResultsEmail is pure so the same output can be rendered for review
 * without sending anything.
 */

import { Resend } from 'resend';
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBaseHtml, getButtonHtml } from './base-template';
import { EMAIL_SENDER, SUPPORT_REPLY_TO } from './senders';
import { captureApiError } from '@/lib/capture-error';

/** Outcomes that read as "you clear the basic bar". */
const QUALIFIED_OUTCOMES = ['PROCEED', 'PROCEED_RISK'];

export interface ResultsEmailContent {
  subject: string;
  html: string;
  /** Plain-text alternative. Absent, spam filters score the message worse. */
  text: string;
}

export function buildResultsEmail(outcome: string, verifyLink: string): ResultsEmailContent {
  const isQualified = QUALIFIED_OUTCOMES.includes(outcome);

  const subject = isQualified
    ? 'Good news — your E-2 eligibility result'
    : 'Your E-2 eligibility assessment result';

  const preheader = isQualified
    ? 'You appear to meet the foundational E-2 requirements. Open your full result.'
    : 'Your assessment is complete. Open your full result.';

  const heading = isQualified
    ? 'Your eligibility assessment is ready.'
    : 'Your assessment is complete.';

  const bodyCopy = isQualified
    ? 'Based on your answers, you appear to meet the foundational requirements for an E-2 Treaty Investor visa. Your full result — including your readiness score and the specific items to address next — is waiting for you.'
    : 'You completed the e2go eligibility assessment. Your full result explains what your answers mean for an E-2 application and what your realistic options are from here.';

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  ${heading}
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 28px 0;">
  ${bodyCopy}
</p>
<p style="margin: 0 0 28px 0;">
  ${getButtonHtml('View my full result &rarr;', verifyLink)}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0;">
  This link expires in 24 hours and can only be opened once. If it stops working, you can request a new one from the results page.
</p>
`.trim();

  const text = [
    heading,
    '',
    bodyCopy,
    '',
    `View my full result: ${verifyLink}`,
    '',
    'This link expires in 24 hours and can only be opened once.',
    '',
    'e2go.app — document preparation tool, not a law firm.',
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader), text };
}

export interface SendResultsEmailArgs {
  /** Service-role client — email_verifications is service-role only. */
  supabase: SupabaseClient;
  email: string;
  outcome: string;
  result_json: Record<string, unknown>;
  franchise_interest: boolean;
  quiz_session_id: string | null;
}

/**
 * Mint a single-use token, record it, and send the result email.
 * Returns false when the verification row could not be written — the caller
 * decides whether that is worth surfacing.
 */
export async function sendResultsEmail(args: SendResultsEmailArgs): Promise<boolean> {
  const { supabase, email, outcome, result_json, franchise_interest, quiz_session_id } = args;

  const token = crypto.randomBytes(32).toString('hex');

  const { error: dbError } = await supabase
    .from('email_verifications')
    .insert([{
      email,
      token,
      quiz_session_id: quiz_session_id || null,
      outcome,
      result_json,
      franchise_interest,
    }]);

  if (dbError) {
    captureApiError(dbError, { route: 'emails/results', stage: 'verification-insert', email });
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, html, text } = buildResultsEmail(outcome, `${appUrl}/verify?token=${token}`);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send results email to ${email}: ${subject}`);
    return true;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: resendError } = await resend.emails.send({
      from: EMAIL_SENDER,
      replyTo: SUPPORT_REPLY_TO,
      to: email,
      subject,
      html,
      text,
    });
    if (resendError) {
      captureApiError(resendError, { route: 'emails/results', stage: 'resend-send', email });
      return false;
    }
  } catch (e) {
    captureApiError(e, { route: 'emails/results', stage: 'resend-exception', email });
    return false;
  }

  return true;
}
