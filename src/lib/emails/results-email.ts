/**
 * The eligibility-result email.
 *
 * This is the only push channel the product has. Everything else — the
 * results page, the pricing, the reassurance — waits passively on the site for
 * someone who may never come back. So this email does two jobs, not one: it
 * delivers the link, and it gives a hesitant person a reason to open it today.
 *
 * Both variants share one subject line. The body is not gated — the qualified
 * variant says plainly that the foundational bar appears to be met — but the
 * subject line is where that would be read by anyone glancing at the recipient's
 * phone, and an outcome-specific subject also made the two variants sortable
 * from the inbox. So the subject stays neutral and the body carries the news.
 *
 * The closing quotation is the founder note from the homepage, verbatim. Site
 * and email speaking in one voice is itself a trust signal, and it costs
 * nothing to keep them identical — if the homepage copy changes, change it here
 * too (src/app/HomeClient.tsx).
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

/**
 * "5 September at 14:05 UTC" — a real moment, so the deadline is checkable
 * against a clock instead of guessed at. Built from parts rather than a
 * format string, because locale patterns reorder between ICU versions.
 */
function formatExpiry(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} at ${get('hour')}:${get('minute')} UTC`;
}

export function buildResultsEmail(
  outcome: string,
  verifyLink: string,
  expiresAt?: Date,
): ResultsEmailContent {
  const isQualified = QUALIFIED_OUTCOMES.includes(outcome);

  /**
   * One subject for both variants, on purpose. The old qualified subject
   * ("Good news — ...") put the outcome on a lock screen, where the recipient
   * does not control who reads it, and it made the two variants sortable from
   * the inbox. The body below still states the outcome.
   */
  const subject = 'The thing you have been putting off has an answer now';

  const preheader = isQualified
    ? 'Your reading is inside, with what still stands between you and a consulate appointment.'
    : 'Your reading is inside, with the honest version of your options.';

  /**
   * Deliberately does not describe their life or their country back to them —
   * we do not know it. It points at the reason they already have.
   */
  const heading = 'You did not fill that in for no reason.';

  const openingLine = isQualified
    ? 'An hour ago this was something you were thinking about. It is now something with an answer attached to it.'
    : 'An hour ago this was something you were wondering about. It is now something you can stop wondering about.';

  const bodyCopy = isQualified
    ? 'Based on your answers, you appear to meet the foundational requirements for an E-2 Treaty Investor visa. Your full reading shows where you already stand, and the specific items still between you and a consulate appointment.'
    : 'Your full reading explains what your answers mean for an E-2 application, and what your realistic options are from here. Some of it will not be what you hoped. It is still the cheapest version of this news you will ever get.';

  const closingLine = isQualified
    ? 'The people who make this move are rarely the ones with the most capital or the cleanest paperwork. They are the ones who kept going the week after they found out they could.'
    : 'Most people told "not yet" are being told about something they can change. It is better to know which one you are looking at now than after you have spent money finding out.';

  const expiryCopy = expiresAt
    ? `Your link opens once, and it stops working on ${formatExpiry(expiresAt)}. If you miss it, request a new one from the results page — it takes a few seconds.`
    : 'Your link opens once, and it stops working 24 hours after this email was sent. If you miss it, request a new one from the results page — it takes a few seconds.';

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 30px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.25;">
  ${heading}
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  ${openingLine}
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  ${bodyCopy}
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 28px 0;">
  ${closingLine}
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('See where I stand &rarr;', verifyLink)}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.72); line-height: 1.6; margin: 0 0 28px 0;">
  There is no charge to read it.
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0 0 32px 0;">
  ${expiryCopy}
</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center" style="padding: 0;">
      <div style="width: 40px; height: 1px; background-color: rgba(201,168,76,0.5); margin: 0 auto 20px auto;"></div>
      <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; font-weight: 300; font-style: italic; color: rgba(245,240,232,0.65); line-height: 1.6; margin: 0 0 20px 0;">
        Before preparation, there is procrastination.<br>
        Weeks become months. Months become a year.<br>
        And the move you have been planning quietly stays a plan.
      </p>
      <div style="width: 40px; height: 1px; background-color: rgba(201,168,76,0.5); margin: 0 auto;"></div>
    </td>
  </tr>
</table>
`.trim();

  const text = [
    heading,
    '',
    openingLine,
    '',
    bodyCopy,
    '',
    closingLine,
    '',
    `See where I stand: ${verifyLink}`,
    '',
    'There is no charge to read it.',
    '',
    expiryCopy,
    '',
    '---',
    '',
    'Before preparation, there is procrastination.',
    'Weeks become months. Months become a year.',
    'And the move you have been planning quietly stays a plan.',
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

  /**
   * Written explicitly rather than left to the column default, so the deadline
   * printed in the email is provably the same instant the row will be checked
   * against. Reading it back would mean an INSERT ... RETURNING, which needs a
   * SELECT policy this table does not grant.
   */
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { error: dbError } = await supabase
    .from('email_verifications')
    .insert([{
      email,
      token,
      quiz_session_id: quiz_session_id || null,
      outcome,
      result_json,
      franchise_interest,
      expires_at: expiresAt.toISOString(),
    }]);

  if (dbError) {
    captureApiError(dbError, { route: 'emails/results', stage: 'verification-insert', email });
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, html, text } = buildResultsEmail(outcome, `${appUrl}/verify?token=${token}`, expiresAt);

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
