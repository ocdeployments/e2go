/**
 * The early-access welcome email.
 *
 * Sent once, right after someone submits the early-access form. This is the
 * only moment they are paying attention before the wait sets in, so it is
 * where expectations get set — not the sales pitch. Romy's brief was
 * explicit: "hardhitting yet honest breakdown of what to expect," not a
 * reassurance email. A lead who is told the truth now costs less support
 * time later than one who arrives at the product having imagined something
 * else.
 *
 * buildEarlyAccessWelcomeEmail is pure so the copy can be reviewed without
 * sending anything.
 */

import { Resend } from 'resend';
import { getBaseHtml, getButtonHtml } from './base-template';
import { companyFooterLine } from './company';
import { EMAIL_SENDER, SUPPORT_REPLY_TO } from './senders';
import { captureApiError } from '@/lib/capture-error';

export interface EarlyAccessWelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildEarlyAccessWelcomeEmail(
  name: string,
  /** Recipient, so the footer's unsubscribe link is signed and works. */
  recipient: string,
): EarlyAccessWelcomeEmailContent {
  const firstName = name.trim().split(/\s+/)[0] || 'there';

  const subject = "You're on the list — here's what that actually means";
  const preheader = 'The honest version, before the wait starts.';

  const heading = `${firstName}, before you wait for the invite —`;

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.25;">
  ${heading}
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  Here is the version of this you would not get from a landing page.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  E2go is a document-preparation tool. It is not a law firm, it does not file anything on your behalf, and it does not replace an immigration attorney when your case has real risk in it — it gets you further before you need one, and cheaper once you do. If someone told you this guarantees a visa, they were wrong. No one can guarantee that, including us.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  The timeline is not ours to set. Document generation itself is instant — what takes 4&ndash;6 months for most people is answering the questions properly and gathering the paperwork behind them. Move faster and it takes less time. That part was always going to be true of any tool, ours included.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  You are also getting in early. That is worth saying plainly: early access means the rough edges are still there, some flows are ahead of others, and your account may be one of the first through parts of this. If something breaks or reads wrong, that is useful to us and worth a reply to this email — it goes to a real inbox, not a ticket queue.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 28px 0;">
  What you get for that: an eligibility read that does not soften the answer, a gap analysis against what a real E-2 filing actually needs, and documents generated from your own answers instead of a blank template. That is the trade. If it sounds fair, the invite is coming.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('See what E2go does &rarr;', 'https://e2go.app')}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0 0 32px 0;">
  No action needed from you right now — we will email the moment your access opens.
</p>
`.trim();

  const text = [
    heading,
    '',
    'Here is the version of this you would not get from a landing page.',
    '',
    'E2go is a document-preparation tool. It is not a law firm, it does not file anything on your behalf, and it does not replace an immigration attorney when your case has real risk in it — it gets you further before you need one, and cheaper once you do. If someone told you this guarantees a visa, they were wrong. No one can guarantee that, including us.',
    '',
    'The timeline is not ours to set. Document generation itself is instant — what takes 4-6 months for most people is answering the questions properly and gathering the paperwork behind them. Move faster and it takes less time.',
    '',
    'You are also getting in early. The rough edges are still there, some flows are ahead of others, and your account may be one of the first through parts of this. If something breaks or reads wrong, reply to this email — it goes to a real inbox.',
    '',
    'What you get for that: an eligibility read that does not soften the answer, a gap analysis against what a real E-2 filing actually needs, and documents generated from your own answers instead of a blank template.',
    '',
    'No action needed from you right now — we will email the moment your access opens.',
    '',
    'https://e2go.app',
    '',
    'e2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

/**
 * Fire-and-forget by design: called right after the lead is upserted, and a
 * delivery failure here should never turn into a failed signup. The caller
 * only needs to know whether to log it.
 */
export async function sendEarlyAccessWelcomeEmail(name: string, email: string): Promise<boolean> {
  const { subject, html, text } = buildEarlyAccessWelcomeEmail(name, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send early-access welcome email to ${email}: ${subject}`);
    return true;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: EMAIL_SENDER,
      replyTo: SUPPORT_REPLY_TO,
      to: email,
      subject,
      html,
      text,
    });
    if (error) {
      captureApiError(error, { route: 'emails/early-access-welcome', stage: 'resend-send', email });
      return false;
    }
  } catch (e) {
    captureApiError(e, { route: 'emails/early-access-welcome', stage: 'resend-exception', email });
    return false;
  }

  return true;
}
