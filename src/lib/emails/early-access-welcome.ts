/**
 * The early-access welcome email.
 *
 * Sent once, right after someone submits the early-access form — the first
 * time e2go contacts a lead directly, and the only moment they are paying
 * attention before the wait sets in. Earlier drafts treated this as a
 * feature summary with a legal disclaimer attached. This one is a letter
 * from Romy: why he built e2go, the specific costs and dead ends he hit
 * filing his own E-2 (see the "why e2go" section of src/app/HomeClient.tsx
 * and src/components/landing/ComparisonSection.tsx — this email draws on
 * the same pain points, told in the first person instead of as marketing
 * copy), what six months of solo, unfunded work actually looked like in
 * hours, and only then what the product does. The honesty and "no
 * guarantee" framing from the original draft is kept — a founder story
 * doesn't get to soften that part.
 *
 * buildEarlyAccessWelcomeEmail is pure so the copy can be reviewed without
 * sending anything.
 */

import { Resend } from 'resend';
import { getBaseHtml, getButtonHtml } from './base-template';
import { companyFooterLine } from './company';
import { FOUNDER_EMAIL_SENDER, FOUNDER_REPLY_TO } from './senders';
import { captureApiError } from '@/lib/capture-error';
import { unsubscribeHeaders } from './unsubscribe';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

  const subject = "Meet E2go.app—the simpler way to prepare for your E-2 journey";
  const preheader = "How my family's E-2 journey led to the platform you're about to try.";

  const heading = `Hi ${firstName}, congratulations on taking the first step toward your E-2 journey.`;

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.25;">
  ${heading}
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  I'm Romy, founder of E2go.app. Before your early access opens, I want to tell you how my family's E-2 journey led to the platform you're about to try.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  My family of four arrived in the United States on an E-2 visa in August 2026. Getting there meant navigating scattered Facebook and Reddit advice, immigration seminars, consultant calls, broker introductions, and lawyer quotes of up to $15,000.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  After around ten hours of meetings and $250 toward a $6,000 consultant fee, I stopped and asked: what exactly am I paying for?
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  So I went directly to the source: consular guidance, USCIS materials, and the E-2 rules themselves. I built my own case, completed the interview, and received the visa.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  That experience became E2go.app.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  E2go.app replaces much of the fragmented, administrative work that often sits between an applicant, a consultant, a franchise broker, and an immigration lawyer.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  Traditionally, an applicant may pay a consultant to assess their starting point, coordinate referrals, introduce franchise-broker options, answer process questions, and act as the central point of contact. E2go.app gives you a structured place to understand the process, organize your information, explore franchise options through no-client-fee introductions, and build your preparation package in one place.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  It also reduces the administrative burden often placed on the applicant. Rather than repeatedly providing the same background, business, and financial information to different people, you build one organized case file. That information can then support draft preparation for core documents, so a lawyer reviewing the file can focus on legal judgment and strategy rather than rebuilding the package from scratch.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  The value is not in claiming to replace a lawyer. The value is in helping you avoid paying separately for fragmented coordination, repeated intake, referrals, and document-collection work before you know what professional help you actually need.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 8px 0;">
  What E2go.app helps you do:
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Check readiness factors</strong> before spending money.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Keep your answers, evidence, and documents</strong> in one organized case file.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Create drafts for core case materials</strong> from the information you provide — not generic templates.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Work through structured quality checks</strong> before you finalize your package.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Explore franchise options</strong> through no-client-fee broker introductions.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 18px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Prepare a finished, organized package</strong> for your own use or for focused attorney review.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  Optional add-ons include interview practice, franchise FDD review, and market analysis.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  Franchise-broker referrals are free. E2go.app does not charge for the introduction, and our partner brokers do not charge you to connect with franchise opportunities you choose to explore.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  E2go.app is not a law firm, does not provide legal advice, does not file applications on your behalf, and cannot guarantee a visa outcome. It is designed to help you understand the process, organize your information, and prepare your materials before deciding whether you need legal support. Government E-2 guidance and application requirements remain the controlling standards for every applicant.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  Try <strong style="color: #C9A84C; font-weight: 600;">Ask E2go.app</strong>, the free chat on our homepage, and ask it anything about the E-2 process.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('See what E2go.app actually does &rarr;', 'https://e2go.app')}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0 0 32px 0;">
  I'll email you as soon as early access opens.
</p>
<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; font-style: italic; color: rgba(245,240,232,0.7); margin: 0 0 20px 0;">
  — Romy, founder, E2go.app<br>E-2 Visa Prep, Simplified.
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0;">
  P.S. Reply and tell me where you are in the process. I read every reply myself.
</p>
`.trim();

  const text = [
    heading,
    '',
    "I'm Romy, founder of E2go.app. Before your early access opens, I want to tell you how my family's E-2 journey led to the platform you're about to try.",
    '',
    'My family of four arrived in the United States on an E-2 visa in August 2026. Getting there meant navigating scattered Facebook and Reddit advice, immigration seminars, consultant calls, broker introductions, and lawyer quotes of up to $15,000.',
    '',
    'After around ten hours of meetings and $250 toward a $6,000 consultant fee, I stopped and asked: what exactly am I paying for?',
    '',
    'So I went directly to the source: consular guidance, USCIS materials, and the E-2 rules themselves. I built my own case, completed the interview, and received the visa.',
    '',
    'That experience became E2go.app.',
    '',
    'E2go.app replaces much of the fragmented, administrative work that often sits between an applicant, a consultant, a franchise broker, and an immigration lawyer.',
    '',
    'Traditionally, an applicant may pay a consultant to assess their starting point, coordinate referrals, introduce franchise-broker options, answer process questions, and act as the central point of contact. E2go.app gives you a structured place to understand the process, organize your information, explore franchise options through no-client-fee introductions, and build your preparation package in one place.',
    '',
    'It also reduces the administrative burden often placed on the applicant. Rather than repeatedly providing the same background, business, and financial information to different people, you build one organized case file. That information can then support draft preparation for core documents, so a lawyer reviewing the file can focus on legal judgment and strategy rather than rebuilding the package from scratch.',
    '',
    'The value is not in claiming to replace a lawyer. The value is in helping you avoid paying separately for fragmented coordination, repeated intake, referrals, and document-collection work before you know what professional help you actually need.',
    '',
    'What E2go.app helps you do:',
    '',
    '- Check readiness factors before spending money.',
    '- Keep your answers, evidence, and documents in one organized case file.',
    '- Create drafts for core case materials from the information you provide — not generic templates.',
    '- Work through structured quality checks before you finalize your package.',
    '- Explore franchise options through no-client-fee broker introductions.',
    '- Prepare a finished, organized package for your own use or for focused attorney review.',
    '',
    'Optional add-ons include interview practice, franchise FDD review, and market analysis.',
    '',
    'Franchise-broker referrals are free. E2go.app does not charge for the introduction, and our partner brokers do not charge you to connect with franchise opportunities you choose to explore.',
    '',
    'E2go.app is not a law firm, does not provide legal advice, does not file applications on your behalf, and cannot guarantee a visa outcome. It is designed to help you understand the process, organize your information, and prepare your materials before deciding whether you need legal support. Government E-2 guidance and application requirements remain the controlling standards for every applicant.',
    '',
    'Try Ask E2go.app, the free chat on our homepage, and ask it anything about the E-2 process.',
    '',
    'See what E2go.app actually does: https://e2go.app',
    '',
    "I'll email you as soon as early access opens.",
    '',
    '— Romy, founder, E2go.app',
    'E-2 Visa Prep, Simplified.',
    '',
    'P.S. Reply and tell me where you are in the process. I read every reply myself.',
    '',
    'E2go.app — document preparation tool, not a law firm.',
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
      from: FOUNDER_EMAIL_SENDER,
      replyTo: FOUNDER_REPLY_TO,
      to: email,
      subject,
      html,
      text,
      headers: unsubscribeHeaders(email, appUrl),
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
