import type { SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';
import { sendRetentionReminderEmail, sendRetentionCompletionEmail } from '@/lib/emails/retention-sequence';

export const BUCKET = 'application-documents';
const FILE_MAX_AGE_DAYS = 90; // hard cap: delete raw file 90 days after upload
const FILE_POST_PACKAGE_DAYS = 30; // delete raw file 30 days after package generated

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function purgeExpiredFiles(supabase: SupabaseClient) {
  const result = {
    appDocs: 0,
    fddDocs: 0,
    errors: [] as string[],
    purgedByApp: new Map<string, number>(),
  };

  // Applications with an active confirm-to-keep hold (RS-10 / Gap G-19) —
  // their files are skipped below regardless of age.
  const { data: heldRows } = await supabase
    .from('applications')
    .select('id')
    .not('retention_hold_at', 'is', null);
  const heldApps = new Set((heldRows ?? []).map((r) => r.id as string));

  // Applications whose package was generated more than 30 days ago.
  const { data: oldPackages } = await supabase
    .from('generated_documents')
    .select('application_id, created_at')
    .lt('created_at', daysAgo(FILE_POST_PACKAGE_DAYS));
  const packagedApps = new Set(
    (oldPackages ?? []).map((r) => r.application_id as string).filter(Boolean),
  );

  // Candidate application_documents whose file is still present.
  const { data: appDocs, error: appErr } = await supabase
    .from('application_documents')
    .select('id, application_id, storage_path, created_at')
    .is('file_purged_at', null);

  if (appErr) {
    captureApiError(appErr, { route: 'cron/data-retention', stage: 'fetch-app-docs' });
    result.errors.push(`fetch-app-docs: ${appErr.message}`);
  }

  const hardCap = daysAgo(FILE_MAX_AGE_DAYS);
  for (const doc of appDocs ?? []) {
    const tooOld = (doc.created_at as string) < hardCap;
    const packaged = packagedApps.has(doc.application_id as string);
    if (!tooOld && !packaged) continue;
    const appId = doc.application_id as string | null;
    if (appId && heldApps.has(appId)) continue;
    if (!doc.storage_path) {
      await supabase
        .from('application_documents')
        .update({ file_purged_at: new Date().toISOString() })
        .eq('id', doc.id);
      result.appDocs += 1;
      if (appId) result.purgedByApp.set(appId, (result.purgedByApp.get(appId) ?? 0) + 1);
      continue;
    }
    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove([doc.storage_path as string]);
    if (rmErr && !/not found/i.test(rmErr.message)) {
      captureApiError(rmErr, { route: 'cron/data-retention', stage: 'rm-app-doc', docId: doc.id });
      result.errors.push(`rm-app-doc ${doc.id}: ${rmErr.message}`);
      continue;
    }
    const { error: updErr } = await supabase
      .from('application_documents')
      .update({ file_purged_at: new Date().toISOString() })
      .eq('id', doc.id);
    if (updErr) {
      captureApiError(updErr, { route: 'cron/data-retention', stage: 'stamp-app-doc', docId: doc.id });
      result.errors.push(`stamp-app-doc ${doc.id}: ${updErr.message}`);
      continue;
    }
    result.appDocs += 1;
    if (appId) result.purgedByApp.set(appId, (result.purgedByApp.get(appId) ?? 0) + 1);
  }

  // FDD PDFs — same rule, keyed off upload age and package age.
  const { data: fddDocs, error: fddErr } = await supabase
    .from('fdd_analyses')
    .select('id, application_id, storage_path, created_at')
    .is('file_purged_at', null);

  if (fddErr) {
    captureApiError(fddErr, { route: 'cron/data-retention', stage: 'fetch-fdd-docs' });
    result.errors.push(`fetch-fdd-docs: ${fddErr.message}`);
  }

  for (const doc of fddDocs ?? []) {
    const tooOld = (doc.created_at as string) < hardCap;
    const packaged =
      !!doc.application_id && packagedApps.has(doc.application_id as string);
    if (!tooOld && !packaged) continue;
    const appId = doc.application_id as string | null;
    if (appId && heldApps.has(appId)) continue;
    if (doc.storage_path) {
      const { error: rmErr } = await supabase.storage
        .from(BUCKET)
        .remove([doc.storage_path as string]);
      if (rmErr && !/not found/i.test(rmErr.message)) {
        captureApiError(rmErr, { route: 'cron/data-retention', stage: 'rm-fdd-doc', docId: doc.id });
        result.errors.push(`rm-fdd-doc ${doc.id}: ${rmErr.message}`);
        continue;
      }
    }
    const { error: updErr } = await supabase
      .from('fdd_analyses')
      .update({ file_purged_at: new Date().toISOString() })
      .eq('id', doc.id);
    if (updErr) {
      captureApiError(updErr, { route: 'cron/data-retention', stage: 'stamp-fdd-doc', docId: doc.id });
      result.errors.push(`stamp-fdd-doc ${doc.id}: ${updErr.message}`);
      continue;
    }
    result.fddDocs += 1;
    if (appId) result.purgedByApp.set(appId, (result.purgedByApp.get(appId) ?? 0) + 1);
  }

  return result;
}

/**
 * Send the T-minus-3-days retention reminder (RS-10 / Gap G-19) for
 * applications whose earliest generated_documents row is 27-30 days old —
 * a window matching daily cron cadence, safe against a missed run because
 * it's guarded by retention_reminder_sent_at. The stated purge date is
 * computed the same way purgeExpiredFiles actually triggers a purge
 * (FILE_POST_PACKAGE_DAYS after that earliest package), so the email's
 * date always matches what will really happen.
 */
export async function sendRetentionReminders(supabase: SupabaseClient) {
  const result = { sent: 0, errors: [] as string[] };

  const reminderWindowStart = daysAgo(FILE_POST_PACKAGE_DAYS);
  const reminderWindowEnd = daysAgo(FILE_POST_PACKAGE_DAYS - 3);

  const { data: candidates, error } = await supabase
    .from('generated_documents')
    .select('application_id, created_at')
    .lt('created_at', reminderWindowEnd)
    .gte('created_at', reminderWindowStart);

  if (error) {
    captureApiError(error, { route: 'cron/data-retention', stage: 'fetch-reminder-candidates' });
    result.errors.push(`fetch-reminder-candidates: ${error.message}`);
    return result;
  }

  const earliestByApp = new Map<string, string>();
  for (const row of candidates ?? []) {
    const appId = row.application_id as string | null;
    const createdAt = row.created_at as string;
    if (!appId) continue;
    const existing = earliestByApp.get(appId);
    if (!existing || createdAt < existing) earliestByApp.set(appId, createdAt);
  }

  for (const [applicationId, createdAt] of earliestByApp) {
    const { data: app } = await supabase
      .from('applications')
      .select('id, user_id, retention_reminder_sent_at, retention_hold_at')
      .eq('id', applicationId)
      .maybeSingle();

    if (!app || app.retention_reminder_sent_at || app.retention_hold_at) continue;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', app.user_id)
      .maybeSingle();

    if (!profile?.email) continue;

    const purgeDate = new Date(
      new Date(createdAt).getTime() + FILE_POST_PACKAGE_DAYS * 24 * 60 * 60 * 1000,
    );
    const ok = await sendRetentionReminderEmail({
      supabase,
      applicationId,
      email: profile.email,
      purgeDate,
    });
    if (ok) result.sent += 1;
  }

  return result;
}

/**
 * Send the on-completion confirmation (RS-10 / Gap G-19) once files have
 * actually been purged for an application, using the per-application
 * counts purgeExpiredFiles collected during the same run.
 */
export async function sendRetentionCompletions(supabase: SupabaseClient, purgedByApp: Map<string, number>) {
  const result = { sent: 0, errors: [] as string[] };

  for (const [applicationId, count] of purgedByApp) {
    const { data: app } = await supabase
      .from('applications')
      .select('user_id, retention_purge_notice_sent_at')
      .eq('id', applicationId)
      .maybeSingle();

    if (!app || app.retention_purge_notice_sent_at) continue;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', app.user_id)
      .maybeSingle();

    if (!profile?.email) continue;

    const ok = await sendRetentionCompletionEmail({
      supabase,
      applicationId,
      email: profile.email,
      purgedFileCount: count,
    });
    if (ok) result.sent += 1;
  }

  return result;
}
