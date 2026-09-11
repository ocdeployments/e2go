/**
 * DR-4 (Gap G-06), September 11, 2026 (Session 146).
 *
 * src/lib/emails/ had eight templates and none of them concerned generation
 * itself — a run this long (minutes, not seconds) tethered the client to an
 * open tab with no way to walk away and find out later. Two emails close
 * that gap:
 *
 *   1. Package ready   — sent from runGenerationPipeline() the moment a job
 *      reaches 'completed' (src/lib/generation-engine.ts).
 *   2. We reset your run — sent by the health-watchdog cron (DR-3) the
 *      moment it reaps a stuck job, so "why did my progress bar just
 *      disappear" has an answer in the inbox instead of silence.
 *
 * Both follow retention-sequence.ts's pattern: a pure buildX for
 * copy/rendering, a send wrapper that checks email_suppressions first and
 * **awaits** the Resend call — see 'cf8b44f', which exists precisely because
 * an un-awaited Resend call was torn down by the runtime before it left the
 * function, and a real submission never reached Resend at all.
 *
 * Neither send function stamps a dedup column. Unlike the retention notice
 * (guarded against a regeneration re-sending the same 30-day notice for one
 * application), each of these corresponds to a genuinely new event — a job
 * reaching 'completed', or the watchdog reaping a job — and each such event
 * happens at most once per job: /run already refuses to re-enter a job whose
 * status is 'completed' (src/app/api/generate/run/[jobId]/route.ts), and a
 * reaped job is filtered out of the watchdog's own stuck-job query on every
 * later pass because its status is no longer 'running'/'queued'. So "one
 * event, one email" falls out of the existing state machine without an
 * extra column to keep in sync.
 *
 * Copy below is a first draft in the established brand voice, not yet
 * reviewed by Romy (sprint doc flags ~1h of copy review for this item) —
 * the Exit/Test criteria concern delivery mechanics (a real send that lands,
 * awaited, with a working link), not final wording.
 *
 * The package-ready email lists the actual documents generated for this
 * case — documentPlan.all from generation-engine.ts, the same per-case plan
 * (core types + only the conditional types this case actually triggered)
 * that drove the run, not a hardcoded list of every possible document type.
 * Every DocumentType it can contain has an entry in both
 * DOCUMENT_TYPE_LABELS (the human-facing name rendered here) and
 * docx-package-constants.ts's DOC_DISPLAY_NAMES (the name the download
 * route gives it inside the ZIP) — see generation-emails.test.ts's
 * "every listed document is part of the real downloadable package" check.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBaseHtml, getButtonHtml } from './base-template';
import { companyFooterLine } from './company';
import { EMAIL_SENDER, SUPPORT_REPLY_TO } from './senders';
import { captureApiError } from '@/lib/capture-error';
import type { DocumentType } from '@/types/generation';
import { DOCUMENT_TYPE_LABELS } from '@/types/generation';

export interface GenerationEmailContent {
  subject: string;
  html: string;
  text: string;
}

const CONTACT_SURVIVES_LINE =
  'Your application and everything already generated are unaffected — this only concerns the run itself.';

/** documentTypes → human-readable labels, in the order the pipeline generated them. Exported for tests. */
export function documentTypesToLabels(documentTypes: DocumentType[]): string[] {
  return documentTypes.map((dt) => DOCUMENT_TYPE_LABELS[dt]).filter(Boolean);
}

function renderDocumentListHtml(labels: string[]): string {
  const items = labels
    .map(
      (label) =>
        `<li style="margin: 0 0 4px 0;">${label}</li>`
    )
    .join('\n');
  return `
<ul style="font-size: 14px; color: rgba(245,240,232,0.82); line-height: 1.6; margin: 0 0 18px 0; padding: 0 0 0 20px;">
${items}
</ul>`;
}

function renderDocumentListText(labels: string[]): string {
  return labels.map((label) => `  - ${label}`).join('\n');
}

// ---------------------------------------------------------------------------
// 1. Package ready — sent on a completed generation run
// ---------------------------------------------------------------------------

export function buildPackageReadyEmail(
  applicationLink: string,
  documentTypes: DocumentType[],
  recipient?: string,
): GenerationEmailContent {
  const subject = 'Your E2go.app document package is ready';
  const preheader = 'Every document has been generated — review whenever you are ready.';
  const labels = documentTypesToLabels(documentTypes);

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  Your document package is ready.
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  We generated the following ${labels.length} document${labels.length === 1 ? '' : 's'} for your case:
</p>
${renderDocumentListHtml(labels)}
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  They are waiting for your review. You do not need to keep this tab open — it will be here whenever you come back.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('Review my package &rarr;', applicationLink)}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 24px 0 0 0;">
  ${CONTACT_SURVIVES_LINE}
</p>
`.trim();

  const text = [
    'Your document package is ready.',
    '',
    `We generated the following ${labels.length} document${labels.length === 1 ? '' : 's'} for your case:`,
    '',
    renderDocumentListText(labels),
    '',
    'They are waiting for your review. You do not need to keep this tab open — it will be here whenever you come back.',
    '',
    `Review my package: ${applicationLink}`,
    '',
    CONTACT_SURVIVES_LINE,
    '',
    'E2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

export interface SendPackageReadyArgs {
  supabase: SupabaseClient;
  applicationId: string;
  email: string;
  applicationLink: string;
  documentTypes: DocumentType[];
}

export async function sendPackageReadyEmail(args: SendPackageReadyArgs): Promise<boolean> {
  const { supabase, applicationId, email, applicationLink, documentTypes } = args;

  const { data: suppressed, error: suppressionError } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (suppressionError) {
    captureApiError(suppressionError, { route: 'emails/package-ready', stage: 'suppression-check', email, applicationId });
  }
  if (suppressed) return false;

  const { subject, html, text } = buildPackageReadyEmail(applicationLink, documentTypes, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send package-ready email to ${email}: ${subject}`);
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
      captureApiError(resendError, { route: 'emails/package-ready', stage: 'resend-send', email, applicationId });
      return false;
    }
  } catch (e) {
    captureApiError(e, { route: 'emails/package-ready', stage: 'resend-exception', email, applicationId });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// 2. We reset your run — sent when the health-watchdog reaps a stuck job
// ---------------------------------------------------------------------------

export function buildResetAfterFailureEmail(
  applicationLink: string,
  recipient?: string,
): GenerationEmailContent {
  const subject = "Your package hit a snag — we've reset it";
  const preheader = 'Your generation run stalled, so we reset it. Press generate again to pick up where it left off.';

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  Your package hit a snag — we've reset it.
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  Your document generation run stopped making progress partway through, so we reset it on our end. Nothing you already had is lost.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  Press generate again and it will pick up from where it left off.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('Press generate again &rarr;', applicationLink)}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 24px 0 0 0;">
  ${CONTACT_SURVIVES_LINE} If this keeps happening, reply to this email and we'll look into it directly.
</p>
`.trim();

  const text = [
    "Your package hit a snag — we've reset it.",
    '',
    'Your document generation run stopped making progress partway through, so we reset it on our end. Nothing you already had is lost.',
    '',
    'Press generate again and it will pick up from where it left off.',
    '',
    `Press generate again: ${applicationLink}`,
    '',
    `${CONTACT_SURVIVES_LINE} If this keeps happening, reply to this email and we'll look into it directly.`,
    '',
    'E2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

export interface SendResetAfterFailureArgs {
  supabase: SupabaseClient;
  applicationId: string;
  email: string;
  applicationLink: string;
}

export async function sendResetAfterFailureEmail(args: SendResetAfterFailureArgs): Promise<boolean> {
  const { supabase, applicationId, email, applicationLink } = args;

  const { data: suppressed, error: suppressionError } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (suppressionError) {
    captureApiError(suppressionError, { route: 'emails/reset-after-failure', stage: 'suppression-check', email, applicationId });
  }
  if (suppressed) return false;

  const { subject, html, text } = buildResetAfterFailureEmail(applicationLink, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send reset-after-failure email to ${email}: ${subject}`);
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
      captureApiError(resendError, { route: 'emails/reset-after-failure', stage: 'resend-send', email, applicationId });
      return false;
    }
  } catch (e) {
    captureApiError(e, { route: 'emails/reset-after-failure', stage: 'resend-exception', email, applicationId });
    return false;
  }

  return true;
}
