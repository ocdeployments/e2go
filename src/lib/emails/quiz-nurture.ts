/**
 * Follow-up sequence for people who finished the quiz and then went quiet.
 *
 * Until now this group received exactly one email, ever — their results link.
 * The existing scheduler (email-scheduler.ts) only looks at rows where
 * payment_status = 'paid', and does not fire until day 60, so someone who took
 * the quiz and never paid fell out of every send path the app has. That is the
 * gap this file closes.
 *
 * Register: the same voice as the homepage and the results email. Quiet,
 * specific, no exclamation marks, no "🇺🇸", no manufactured deadline. The
 * category sells encouragement; we sell the honest reading. Every claim here
 * has to survive being read by someone who is later refused.
 *
 * Three emails, each with one job:
 *
 *   day 3   perspective — this route is real, and here is what is behind
 *                         the link you have not opened.
 *   day 10  worth        — what the fee buys, against what the alternative
 *                         costs, and why waiting makes the file harder.
 *   day 30  last         — say it is the last one, and mean it.
 *
 * Perspective comes before price on purpose. Nobody weighs the cost of a
 * thing they have not yet decided is real.
 *
 * Constraints that are not negotiable, because they are the difference
 * between marketing and misrepresentation:
 *   - There is no annual cap on E-2. No scarcity framing, ever.
 *   - Issuances are not approvals and not investors. See e2-issuance.ts.
 *   - e2go prepares documents. It is not a law firm and does not sell calls,
 *     so every CTA points at something the reader can do alone, now.
 */

import { Resend } from 'resend';
import { getBaseHtml, getButtonHtml } from './base-template';
import { EMAIL_SENDER, SUPPORT_REPLY_TO } from './senders';
import { unsubscribeHeaders } from './unsubscribe';
import { getIssuanceFact } from '@/lib/data/e2-issuance';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** The steps, in order. Also the values stored in quiz_nurture_log.step. */
export type NurtureStep = 'perspective' | 'worth' | 'last';

export interface NurtureContext {
  /** Recipient. Needed here so the footer's unsubscribe link is signed. */
  email: string;
  /** Citizenship as answered at Q0-01, landing at result_json.country. */
  country?: string | null;
  /**
   * Whether they ever opened their results link. Drives the day-3 opening:
   * telling someone their result is unread when they read it a week ago is
   * the fastest way to prove nobody is paying attention.
   */
  hasViewedResults: boolean;
}

export interface NurtureEmail {
  step: NurtureStep;
  subject: string;
  html: string;
  text: string;
}

/** Body copy paragraph. One style, so the emails read as one sequence. */
function p(content: string): string {
  return `<p style="font-size: 15px; color: rgba(245,240,232,0.86); line-height: 1.7; margin: 0 0 20px 0;">${content}</p>`;
}

function h(content: string): string {
  return `<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 24px 0; line-height: 1.25;">${content}</h1>`;
}

/** Smaller, quieter line — used under a button, never for the argument. */
function small(content: string): string {
  return `<p style="font-size: 13px; color: rgba(245,240,232,0.6); line-height: 1.6; margin: 16px 0 0 0;">${content}</p>`;
}

function cta(text: string, href: string): string {
  return `<div style="margin: 8px 0 0 0;">${getButtonHtml(text, href)}</div>`;
}

/* ------------------------------------------------------------------ */
/* Day 3 — perspective                                                 */
/* ------------------------------------------------------------------ */

/**
 * The competitor move here is a "roadmap" email listing product features. The
 * feature list is fine; leading with it is not. What a hesitant person needs
 * first is evidence that the route exists at all — so the State Department's
 * own count goes above the product, and it is their nationality's number,
 * not ours. Their statistic is about them. Ours is about the reader.
 */
export function buildPerspectiveEmail(ctx: NurtureContext): NurtureEmail {
  const fact = getIssuanceFact(ctx.country);

  const subject = ctx.hasViewedResults
    ? 'What the numbers actually look like'
    : 'Your reading is still sitting there';

  const preheader = ctx.hasViewedResults
    ? 'How many people did this last year, and what happens after the reading.'
    : 'Unopened, and it stays available. Here is what is behind it.';

  const opening = ctx.hasViewedResults
    ? 'You read your assessment a few days ago. Here is the part that is hard to see from inside your own situation.'
    : 'Your assessment is still unread. That is common — people finish the questions, then wait for a better week to look at the answer. It stays available either way.';

  const html = getBaseHtml(
    [
      h('This is a road other people are already on.'),
      p(opening),
      p(`<strong style="color: #C9A84C; font-weight: 500;">${fact.sentence}</strong>`),
      p(
        'That number is visas issued, not applications approved and not businesses started — it counts employees, spouses and children too. It is still the most honest picture available of how ordinary this route is. It is not a loophole and it is not a lottery. It is a documented process with requirements you either meet or work toward.',
      ),
      p(
        'What is behind your link is the specific version of that for you: which requirements your answers already satisfy, which ones are open, and what evidence a consular officer expects to see for each. Not advice — a reading of your own file.',
      ),
      cta('Open my assessment &rarr;', `${appUrl}/results`),
      small('Still free to read. Nothing is charged until you decide to prepare documents.'),
    ].join('\n'),
    preheader,
    ctx.email,
  );

  const text = [
    'This is a road other people are already on.',
    '',
    opening,
    '',
    fact.sentence,
    '',
    'That number is visas issued, not applications approved and not businesses started — it counts employees, spouses and children too. It is still the most honest picture available of how ordinary this route is. It is not a loophole and it is not a lottery. It is a documented process with requirements you either meet or work toward.',
    '',
    'What is behind your link is the specific version of that for you: which requirements your answers already satisfy, which ones are open, and what evidence a consular officer expects to see for each. Not advice — a reading of your own file.',
    '',
    `Open your assessment: ${appUrl}/results`,
    '',
    'Still free to read. Nothing is charged until you decide to prepare documents.',
  ].join('\n');

  return { step: 'perspective', subject, html, text };
}

/* ------------------------------------------------------------------ */
/* Day 10 — worth against cost                                         */
/* ------------------------------------------------------------------ */

/**
 * No figure appears in this email — not ours, not an attorney's. A number
 * quoted without knowing the reader's case invites them to argue with the
 * number instead of the decision, and our own price is better met on the page
 * where what it buys is visible beside it. The argument is comparative and
 * the urgency is real: the evidence an E-2 file needs takes calendar time to
 * assemble, and that clock is the only one we are entitled to point at.
 */
export function buildWorthEmail(ctx: NurtureContext): NurtureEmail {
  const subject = 'What the fee is actually for';

  const html = getBaseHtml(
    [
      h('Waiting does not make the file easier.'),
      p(
        'An E-2 application is a document set, not a form. Business plan, source-of-funds trail, lease or purchase agreement, financial projections, evidence the investment is committed and not merely intended. Most of that has to be assembled in a particular order, and several pieces have to be requested from other people — a bank, a landlord, an accountant, a registry in your home country.',
      ),
      p(
        'That is why the honest version of urgency here has nothing to do with deadlines or quotas. There is no annual cap on E-2 visas and no queue you can lose your place in. The pressure is simply that documents take calendar time, and the calendar only moves one way.',
      ),
      p(
        'The alternative to preparing them yourself is paying an immigration attorney to assemble the same set — which is the right call for a genuinely complicated case, and considerably more than this platform costs for a straightforward one. What you pay for here is the structure: what to gather, in what order, what each document has to demonstrate, and where your own answers are still thin.',
      ),
      p(
        'If your case is complex, the assessment says so. We would rather tell you to see an attorney than sell you a document set that will not hold.',
      ),
      cta('See what preparation involves &rarr;', `${appUrl}/results`),
      small('The full breakdown, including the fee, is on the page. No call required to see it.'),
    ].join('\n'),
    'What preparation involves, and the only honest reason not to wait.',
    ctx.email,
  );

  const text = [
    'Waiting does not make the file easier.',
    '',
    'An E-2 application is a document set, not a form. Business plan, source-of-funds trail, lease or purchase agreement, financial projections, evidence the investment is committed and not merely intended. Most of that has to be assembled in a particular order, and several pieces have to be requested from other people — a bank, a landlord, an accountant, a registry in your home country.',
    '',
    'That is why the honest version of urgency here has nothing to do with deadlines or quotas. There is no annual cap on E-2 visas and no queue you can lose your place in. The pressure is simply that documents take calendar time, and the calendar only moves one way.',
    '',
    'The alternative to preparing them yourself is paying an immigration attorney to assemble the same set — which is the right call for a genuinely complicated case, and considerably more than this platform costs for a straightforward one. What you pay for here is the structure: what to gather, in what order, what each document has to demonstrate, and where your own answers are still thin.',
    '',
    'If your case is complex, the assessment says so. We would rather tell you to see an attorney than sell you a document set that will not hold.',
    '',
    `See what preparation involves: ${appUrl}/results`,
    '',
    'The full breakdown, including the fee, is on the page. No call required to see it.',
  ].join('\n');

  return { step: 'worth', subject, html, text };
}

/* ------------------------------------------------------------------ */
/* Day 30 — the last one                                               */
/* ------------------------------------------------------------------ */

/**
 * Saying this is the last email is only worth doing if it is true, and the
 * scheduler makes it true: 'last' is the final step, and nothing re-enrols a
 * session. It closes with the founder note from the homepage, the same lines
 * the results email ends on — the sequence opened and closes in one voice.
 */
export function buildLastEmail(ctx: NurtureContext): NurtureEmail {
  const subject = 'The last one of these';

  const closing = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 8px 0;">
  <tr><td style="border-top: 1px solid rgba(201,168,76,0.2); padding-top: 24px;">
    <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 19px; font-style: italic; font-weight: 300; color: rgba(245,240,232,0.86); line-height: 1.55; margin: 0; text-align: center;">
      Before preparation, there is procrastination.<br>
      Weeks become months. Months become a year.<br>
      And the move you have been planning quietly stays a plan.
    </p>
  </td></tr>
</table>`.trim();

  const html = getBaseHtml(
    [
      h('This is the last email we will send you.'),
      p(
        'You took the assessment about a month ago. We have written twice since. That is enough — there will not be another, and you do not need to do anything to stop them.',
      ),
      p(
        'Your reading stays where it is. No expiry, no account to reactivate. If the year turns out differently than you expected, it is still there.',
      ),
      p(
        'And if the answer was simply no, or not now, that is a real answer too. Knowing it cost you twenty minutes instead of a retainer.',
      ),
      cta('Open my assessment &rarr;', `${appUrl}/results`),
      closing,
    ].join('\n'),
    'No further emails after this one. Your assessment stays available.',
    ctx.email,
  );

  const text = [
    'This is the last email we will send you.',
    '',
    'You took the assessment about a month ago. We have written twice since. That is enough — there will not be another, and you do not need to do anything to stop them.',
    '',
    'Your reading stays where it is. No expiry, no account to reactivate. If the year turns out differently than you expected, it is still there.',
    '',
    'And if the answer was simply no, or not now, that is a real answer too. Knowing it cost you twenty minutes instead of a retainer.',
    '',
    `Open your assessment: ${appUrl}/results`,
    '',
    '---',
    '',
    'Before preparation, there is procrastination.',
    'Weeks become months. Months become a year.',
    'And the move you have been planning quietly stays a plan.',
  ].join('\n');

  return { step: 'last', subject, html, text };
}

/* ------------------------------------------------------------------ */

const BUILDERS: Record<NurtureStep, (ctx: NurtureContext) => NurtureEmail> = {
  perspective: buildPerspectiveEmail,
  worth: buildWorthEmail,
  last: buildLastEmail,
};

/** Render one step without sending, so copy can be reviewed as it will land. */
export function buildNurtureEmail(step: NurtureStep, ctx: NurtureContext): NurtureEmail {
  return BUILDERS[step](ctx);
}

/**
 * Send one step.
 *
 * The footer's unsubscribe link and the List-Unsubscribe headers are both
 * signed for this recipient, so a mail client can offer its own one-click
 * control. Gmail and Yahoo expect that on bulk mail and dock placement
 * without it — and it is the right thing to offer regardless.
 *
 * Does not check suppression or idempotency; that is the scheduler's job,
 * which holds the log table the uniqueness constraint lives on.
 */
export async function sendNurtureEmail(
  email: string,
  step: NurtureStep,
  ctx: NurtureContext,
): Promise<{ ok: boolean; subject: string; error?: string }> {
  const built = buildNurtureEmail(step, { ...ctx, email });
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_SENDER,
      to: email,
      replyTo: SUPPORT_REPLY_TO,
      subject: built.subject,
      html: built.html,
      text: built.text,
      headers: unsubscribeHeaders(email, appUrl),
    });

    if (error) {
      return { ok: false, subject: built.subject, error: String(error) };
    }
    return { ok: true, subject: built.subject };
  } catch (err) {
    return { ok: false, subject: built.subject, error: String(err) };
  }
}
