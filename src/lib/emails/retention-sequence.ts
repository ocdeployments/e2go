/**
 * The three-email document-retention sequence (RS-10 / Gap G-19).
 *
 * Uploaded supporting files (bank statements, business documents, and
 * similar) are purged by cron/data-retention/route.ts 30 days after the
 * client's document package is generated, or 90 days after upload if no
 * package has ever been generated — whichever comes first. A silent purge on
 * a schedule the client never saw is the wrong way to run that, so three
 * emails bracket it:
 *
 *   1. Notice   — sent the moment the package is generated, stating the date.
 *   2. Reminder — sent 3 days before that date, with a confirm-to-keep link.
 *      Confirming sets applications.retention_hold_at, which the cron checks
 *      before purging that application's files.
 *   3. Completion — sent once the purge has actually run, saying what left.
 *
 * Application data and the client's contact record are not affected by any
 * of this — only the uploaded files. All three templates say so, because
 * "your files were deleted" reads as "your case was deleted" unless a human
 * is told otherwise in the same breath.
 *
 * Each build function is pure, matching results-email.ts's pattern. Each
 * send function checks email_suppressions first (same guard
 * quiz-nurture-scheduler.ts uses) and stamps the matching applications
 * timestamp column on success, so a retried cron pass or pipeline run does
 * not send the same email twice.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBaseHtml, getButtonHtml } from './base-template';
import { companyFooterLine } from './company';
import { EMAIL_SENDER, SUPPORT_REPLY_TO } from './senders';
import { retentionHoldUrl } from './retention-hold-token';
import { captureApiError } from '@/lib/capture-error';

export interface RetentionEmailContent {
  subject: string;
  html: string;
  text: string;
}

/** "10 October 2026" — matches the day-level precision of a purge date. */
function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

const CONTACT_SURVIVES_LINE =
  'This only affects the uploaded files. Your application, your generated documents, and your contact details are unaffected and stay with your account.';

// ---------------------------------------------------------------------------
// 1. On generation — states the purge date
// ---------------------------------------------------------------------------

export function buildRetentionNoticeEmail(
  purgeDate: Date,
  recipient?: string,
): RetentionEmailContent {
  const subject = 'When your uploaded files will be removed';
  const preheader = `Your files are scheduled for removal on ${formatDate(purgeDate)}.`;

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  Your document package has been generated.
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  The bank statements, business documents, and other supporting files you uploaded to build it are scheduled to be automatically removed on <strong style="color: #C9A84C; font-weight: 500;">${formatDate(purgeDate)}</strong> — 30 days from today.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 18px 0;">
  ${CONTACT_SURVIVES_LINE}
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 28px 0;">
  If you need any of those files kept beyond that date — for a consulate interview, for your own records, or because your application is still in progress — we will email you again a few days before removal with a one-click way to keep them.
</p>
`.trim();

  const text = [
    'Your document package has been generated.',
    '',
    `The files you uploaded to build it are scheduled to be automatically removed on ${formatDate(purgeDate)} — 30 days from today.`,
    '',
    CONTACT_SURVIVES_LINE,
    '',
    "If you need any of those files kept beyond that date, we will email you again a few days before removal with a one-click way to keep them.",
    '',
    'E2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

export interface SendRetentionNoticeArgs {
  supabase: SupabaseClient;
  applicationId: string;
  email: string;
  purgeDate: Date;
}

export async function sendRetentionNoticeEmail(args: SendRetentionNoticeArgs): Promise<boolean> {
  const { supabase, applicationId, email, purgeDate } = args;

  const { data: suppressed } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (suppressed) return false;

  const { subject, html, text } = buildRetentionNoticeEmail(purgeDate, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send retention notice to ${email}: ${subject}`);
  } else {
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
        captureApiError(resendError, { route: 'emails/retention-notice', stage: 'resend-send', email, applicationId });
        return false;
      }
    } catch (e) {
      captureApiError(e, { route: 'emails/retention-notice', stage: 'resend-exception', email, applicationId });
      return false;
    }
  }

  const { error: stampError } = await supabase
    .from('applications')
    .update({ retention_notice_sent_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (stampError) {
    captureApiError(stampError, { route: 'emails/retention-notice', stage: 'stamp', email, applicationId });
  }

  return true;
}

// ---------------------------------------------------------------------------
// 2. T-minus-3-days reminder — confirm-to-keep link
// ---------------------------------------------------------------------------

export function buildRetentionReminderEmail(
  applicationId: string,
  purgeDate: Date,
  appUrl: string,
  recipient?: string,
): RetentionEmailContent {
  const subject = 'Your uploaded files are removed in 3 days';
  const preheader = `Removal on ${formatDate(purgeDate)} — keep them with one click if you still need them.`;
  const holdUrl = retentionHoldUrl(applicationId, appUrl);

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  Three days until your uploaded files are removed.
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  The files you uploaded to build your document package are still on schedule to be removed on <strong style="color: #C9A84C; font-weight: 500;">${formatDate(purgeDate)}</strong>.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 28px 0;">
  If you still need them — for a consulate interview, for your own records, or because your application isn't finished — keep them with one click. No files will be removed after you do.
</p>
<p style="margin: 0 0 12px 0;">
  ${getButtonHtml('Keep my files', holdUrl)}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0 0 28px 0;">
  If you don't need to keep them, there's nothing to do — they'll be removed automatically on the date above.
</p>
<p style="font-size: 14px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0;">
  ${CONTACT_SURVIVES_LINE}
</p>
`.trim();

  const text = [
    'Three days until your uploaded files are removed.',
    '',
    `The files you uploaded to build your document package are still on schedule to be removed on ${formatDate(purgeDate)}.`,
    '',
    "If you still need them, keep them with one click. No files will be removed after you do.",
    '',
    `Keep my files: ${holdUrl}`,
    '',
    "If you don't need to keep them, there's nothing to do — they'll be removed automatically on the date above.",
    '',
    CONTACT_SURVIVES_LINE,
    '',
    'E2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

export interface SendRetentionReminderArgs {
  supabase: SupabaseClient;
  applicationId: string;
  email: string;
  purgeDate: Date;
}

export async function sendRetentionReminderEmail(args: SendRetentionReminderArgs): Promise<boolean> {
  const { supabase, applicationId, email, purgeDate } = args;

  const { data: suppressed } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (suppressed) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, html, text } = buildRetentionReminderEmail(applicationId, purgeDate, appUrl, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send retention reminder to ${email}: ${subject}`);
  } else {
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
        captureApiError(resendError, { route: 'emails/retention-reminder', stage: 'resend-send', email, applicationId });
        return false;
      }
    } catch (e) {
      captureApiError(e, { route: 'emails/retention-reminder', stage: 'resend-exception', email, applicationId });
      return false;
    }
  }

  const { error: stampError } = await supabase
    .from('applications')
    .update({ retention_reminder_sent_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (stampError) {
    captureApiError(stampError, { route: 'emails/retention-reminder', stage: 'stamp', email, applicationId });
  }

  return true;
}

// ---------------------------------------------------------------------------
// 3. On completion — confirms what was purged
// ---------------------------------------------------------------------------

export function buildRetentionCompletionEmail(
  purgedFileCount: number,
  recipient?: string,
): RetentionEmailContent {
  const fileWord = purgedFileCount === 1 ? 'file' : 'files';
  const subject = 'Your uploaded files have been removed';
  const preheader = `${purgedFileCount} uploaded ${fileWord} removed as scheduled.`;

  const content = `
<h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
  Your uploaded files have been removed.
</h1>
<p style="font-size: 15px; color: rgba(245,240,232,0.82); line-height: 1.65; margin: 0 0 18px 0;">
  As scheduled, ${purgedFileCount} uploaded ${fileWord} — bank statements, business documents, and similar supporting materials — have been permanently removed from your account.
</p>
<p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.65; margin: 0 0 28px 0;">
  ${CONTACT_SURVIVES_LINE}
</p>
<p style="font-size: 13px; color: rgba(245,240,232,0.68); line-height: 1.6; margin: 0;">
  If you need supporting documents again for any reason, you can upload them again at any time.
</p>
`.trim();

  const text = [
    'Your uploaded files have been removed.',
    '',
    `As scheduled, ${purgedFileCount} uploaded ${fileWord} have been permanently removed from your account.`,
    '',
    CONTACT_SURVIVES_LINE,
    '',
    'If you need supporting documents again for any reason, you can upload them again at any time.',
    '',
    'E2go.app — document preparation tool, not a law firm.',
    companyFooterLine(),
  ].join('\n');

  return { subject, html: getBaseHtml(content, preheader, recipient), text };
}

export interface SendRetentionCompletionArgs {
  supabase: SupabaseClient;
  applicationId: string;
  email: string;
  purgedFileCount: number;
}

export async function sendRetentionCompletionEmail(args: SendRetentionCompletionArgs): Promise<boolean> {
  const { supabase, applicationId, email, purgedFileCount } = args;

  const { data: suppressed } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (suppressed) return false;

  const { subject, html, text } = buildRetentionCompletionEmail(purgedFileCount, email);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send retention completion to ${email}: ${subject}`);
  } else {
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
        captureApiError(resendError, { route: 'emails/retention-completion', stage: 'resend-send', email, applicationId });
        return false;
      }
    } catch (e) {
      captureApiError(e, { route: 'emails/retention-completion', stage: 'resend-exception', email, applicationId });
      return false;
    }
  }

  const { error: stampError } = await supabase
    .from('applications')
    .update({ retention_purge_notice_sent_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (stampError) {
    captureApiError(stampError, { route: 'emails/retention-completion', stage: 'stamp', email, applicationId });
  }

  return true;
}
