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

  const subject = "The E-2 lawyer quoted me $15,000. Here's what I did instead.";
  const preheader = "One founder, six months, about 2,000 hours — no lawyer required.";

  const heading = `Welcome, ${firstName} — and congratulations on taking the first step toward your E-2.`;

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.25;">
  ${heading}
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  I'm Romy. Before your early access lands, I want to tell you exactly why e2go exists — it started with my own E-2 filing, and it very nearly went sideways.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  The hardest part wasn't the paperwork — it was finding a straight answer. The information was scattered across forums, Reddit threads and social media, with no single reliable source. I called a few consultants who turned out to be brokers selling the American dream over Zoom, charging for advice that should have been free if you knew where to look. Eventually I stopped paying for that and went to find the answers myself.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  I pulled everything from official sources, organized my documents, and checked them against what the consulate actually expects — including the specific factors that make a case weaker. Then I quoted six or seven immigration lawyers: $6,000 to $15,000, and couldn't see what any of them would add to a case I'd already built. So I filed it myself, did the interview, and got the visa. (My path was a franchise — a comparatively simpler filing than most E-2 cases — and that mattered.)
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 8px 0;">
  That process became e2go. Here's exactly how it works, start to finish:
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">1. Free eligibility check.</strong> A denial-risk score across 15 factors, before you spend a dollar or talk to anyone.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">2. One case file.</strong> Everything you give us lives in a single place — no scattered folders, no repeating yourself on intake calls.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">3. Documents drafted from your words.</strong> Cover letter, business plan, source of funds, personal statement — built from what you actually tell us, not a template with your name dropped in.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">4. Checked against consulate expectations.</strong> The same standard I checked my own case against, before anything gets called "done."
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">5. A 15-step quality review.</strong> Every document passes through 15 separate checks before you ever see the draft — that's the checks-and-balances layer no forum thread gives you.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 18px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">6. A finished package.</strong> Ready to submit yourself, or hand a lawyer for a two-hour review instead of a twenty-hour build.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 8px 0;">
  If you want extra help along the way, three add-ons are available:
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Interview practice.</strong> A spoken mock interview, right in your browser — the officer's questions are read aloud and you answer out loud into your mic, pulled from real consular interview transcripts, then scored and coached afterward.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 10px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">FDD review.</strong> If you're going the franchise route, we read the entire Franchise Disclosure Document and score it against the specific factors that decide whether a franchise makes for a strong E-2 case.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 18px 0;">
  <strong style="color: #C9A84C; font-weight: 600;">Market analysis.</strong> A data-backed read on the territory and demand for the franchise you're considering, so you're not guessing at whether it can actually support a viable business.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  e2go won't be free. But even at full price, it cuts what I paid in lawyer quotes by more than 90%. And if the franchise route interests you the way it interested me, we'll connect you with vetted franchise brokers — at no cost to you.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  On your information: identity documents are never stored — they're read once and discarded. Financial and business documents live in a private, access-restricted vault, automatically deleted once your package is done, and visible to no one but you.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  One honest note: e2go isn't a law firm, doesn't file for you, and doesn't replace an attorney if your case carries real risk. Nobody can guarantee a visa — including me. What I can promise is the tool I wish I'd had.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  One thing you don't have to wait for: head to e2go.app right now and try <strong style="color: #C9A84C; font-weight: 600;">Ask e2go</strong>, the free, instant chat built right into the homepage. Ask it anything about the E-2 process and see for yourself what it already knows — a small preview of the same intelligence that will be drafting and reviewing your documents.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('See what e2go actually does &rarr;', 'https://e2go.app')}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0 0 32px 0;">
  No action needed from you right now — I'll email the moment your access opens.
</p>
<p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; font-style: italic; color: rgba(245,240,232,0.7); margin: 0 0 20px 0;">
  — Romy, founder, e2go
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0;">
  P.S. Reply and tell me where you are in the process — I read every reply myself, and it shapes what ships before your invite arrives.
</p>
`.trim();

  const text = [
    heading,
    '',
    "I'm Romy. Before your early access lands, I want to tell you exactly why e2go exists — it started with my own E-2 filing, and it very nearly went sideways.",
    '',
    "The hardest part wasn't the paperwork — it was finding a straight answer. The information was scattered across forums, Reddit threads and social media, with no single reliable source. I called a few consultants who turned out to be brokers selling the American dream over Zoom, charging for advice that should have been free if you knew where to look. Eventually I stopped paying for that and went to find the answers myself.",
    '',
    "I pulled everything from official sources, organized my documents, and checked them against what the consulate actually expects — including the specific factors that make a case weaker. Then I quoted six or seven immigration lawyers: $6,000 to $15,000, and couldn't see what any of them would add to a case I'd already built. So I filed it myself, did the interview, and got the visa. (My path was a franchise — a comparatively simpler filing than most E-2 cases — and that mattered.)",
    '',
    "That process became e2go. Here's exactly how it works, start to finish:",
    '',
    '1. Free eligibility check. A denial-risk score across 15 factors, before you spend a dollar or talk to anyone.',
    '2. One case file. Everything you give us lives in a single place — no scattered folders, no repeating yourself on intake calls.',
    '3. Documents drafted from your words. Cover letter, business plan, source of funds, personal statement — built from what you actually tell us, not a template with your name dropped in.',
    '4. Checked against consulate expectations. The same standard I checked my own case against, before anything gets called "done."',
    "5. A 15-step quality review. Every document passes through 15 separate checks before you ever see the draft — that's the checks-and-balances layer no forum thread gives you.",
    '6. A finished package. Ready to submit yourself, or hand a lawyer for a two-hour review instead of a twenty-hour build.',
    '',
    'If you want extra help along the way, three add-ons are available:',
    '',
    "Interview practice. A spoken mock interview, right in your browser — the officer's questions are read aloud and you answer out loud into your mic, pulled from real consular interview transcripts, then scored and coached afterward.",
    "FDD review. If you're going the franchise route, we read the entire Franchise Disclosure Document and score it against the specific factors that decide whether a franchise makes for a strong E-2 case.",
    "Market analysis. A data-backed read on the territory and demand for the franchise you're considering, so you're not guessing at whether it can actually support a viable business.",
    '',
    "e2go won't be free. But even at full price, it cuts what I paid in lawyer quotes by more than 90%. And if the franchise route interests you the way it interested me, we'll connect you with vetted franchise brokers — at no cost to you.",
    '',
    "On your information: identity documents are never stored — they're read once and discarded. Financial and business documents live in a private, access-restricted vault, automatically deleted once your package is done, and visible to no one but you.",
    '',
    "One honest note: e2go isn't a law firm, doesn't file for you, and doesn't replace an attorney if your case carries real risk. Nobody can guarantee a visa — including me. What I can promise is the tool I wish I'd had.",
    '',
    "One thing you don't have to wait for: head to e2go.app right now and try Ask e2go, the free, instant chat built right into the homepage. Ask it anything about the E-2 process and see for yourself what it already knows — a small preview of the same intelligence that will be drafting and reviewing your documents.",
    '',
    'See what e2go actually does: https://e2go.app',
    '',
    "No action needed from you right now — I'll email the moment your access opens.",
    '',
    '— Romy, founder, e2go',
    '',
    "P.S. Reply and tell me where you are in the process — I read every reply myself, and it shapes what ships before your invite arrives.",
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
      from: FOUNDER_EMAIL_SENDER,
      replyTo: FOUNDER_REPLY_TO,
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
