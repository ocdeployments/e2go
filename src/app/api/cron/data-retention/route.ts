import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';
import { sendRetentionReminderEmail, sendRetentionCompletionEmail } from '@/lib/emails/retention-sequence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Data-retention cron. Runs daily. Three jobs:
 *
 *  1. Account-deletion hard purge — profiles.deleted_at older than the 30-day
 *     grace period: sweep every Storage object under the user's prefix, then
 *     delete the auth.users row (cascades every DB table that references it).
 *     This is what makes the "permanently removed" deletion email truthful.
 *
 *  2. Document retention — raw uploaded files are removed from Storage 30 days
 *     after the document package is generated, or 90 days after upload if no
 *     package exists, whichever comes first. Extracted fields are retained;
 *     only the file goes. See docs/DATA_RETENTION_POLICY.md.
 *
 *  3. Dormancy report — logs accounts with no login for 24 months so they can
 *     be reviewed for deletion. (Auto-deletion of dormant paid accounts needs
 *     product sign-off before it is enabled here.)
 *
 * Document retention also drives the three-email retention-notice sequence
 * (RS-10 / Gap G-19): a reminder 3 days before an application's files are
 * due to be purged, with a confirm-to-keep link that sets
 * applications.retention_hold_at (checked here before any file is removed);
 * and a completion email once files have actually been purged for that
 * application. The first email in the sequence fires from
 * generation-engine.ts when the package is built, not from this cron.
 */

const GRACE_DAYS = 30;
const FILE_MAX_AGE_DAYS = 90; // hard cap: delete raw file 90 days after upload
const FILE_POST_PACKAGE_DAYS = 30; // delete raw file 30 days after package generated
const DORMANT_MONTHS = 24;
const BUCKET = 'application-documents';
const IDENTITY_REDACT_GRACE_DAYS = 1; // redact identity extracted_json 1 cron cycle after fields accepted

// Identity documents whose extracted_json holds raw PII (passport number, DOB,
// place of birth, …). Once those fields are accepted into `answers` there is no
// reason to keep a second copy in uploaded_documents.extracted_json.
const IDENTITY_DOC_TYPES = [
  'passport',
  'birth_certificate',
  'marriage_certificate',
  'national_id',
  'government_id',
  'drivers_license',
];

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Recursively list every object path under a Storage prefix.
 * Supabase .list() returns folders as entries with a null id.
 */
async function listAllObjects(
  supabase: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) {
    captureApiError(error, { route: 'cron/data-retention', stage: 'storage-list', prefix });
    return out;
  }
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // folder — recurse
      out.push(...(await listAllObjects(supabase, path)));
    } else {
      out.push(path);
    }
  }
  return out;
}

async function purgeDeletedAccounts(supabase: SupabaseClient) {
  const result = { scanned: 0, purged: 0, errors: [] as string[] };

  const { data: doomed, error } = await supabase
    .from('profiles')
    .select('id, email, deleted_at')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', daysAgo(GRACE_DAYS));

  if (error) {
    captureApiError(error, { route: 'cron/data-retention', stage: 'fetch-deleted' });
    result.errors.push(`fetch-deleted: ${error.message}`);
    return result;
  }

  result.scanned = doomed?.length ?? 0;

  for (const profile of doomed ?? []) {
    const userId = profile.id as string;
    try {
      // 1. Sweep every Storage object the user owns.
      const objects = await listAllObjects(supabase, userId);
      if (objects.length > 0) {
        // Supabase caps removals per call; chunk to be safe.
        for (let i = 0; i < objects.length; i += 100) {
          const chunk = objects.slice(i, i + 100);
          const { error: rmErr } = await supabase.storage.from(BUCKET).remove(chunk);
          if (rmErr) {
            captureApiError(rmErr, { route: 'cron/data-retention', stage: 'storage-remove', userId });
            result.errors.push(`storage-remove ${userId}: ${rmErr.message}`);
          }
        }
      }

      // 2. Delete the auth user — cascades profiles, applications, answers,
      //    application_documents, uploaded_documents, fdd_analyses,
      //    generated_documents, quiz_sessions, and everything else keyed to it.
      const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
      if (delErr) {
        captureApiError(delErr, { route: 'cron/data-retention', stage: 'delete-user', userId });
        result.errors.push(`delete-user ${userId}: ${delErr.message}`);
        continue;
      }

      result.purged += 1;
      console.log(`[cron/data-retention] purged account ${userId} (${objects.length} files)`);
    } catch (err) {
      captureApiError(err, { route: 'cron/data-retention', stage: 'purge-account', userId });
      result.errors.push(`purge-account ${userId}: ${(err as Error).message}`);
    }
  }

  return result;
}

async function purgeExpiredFiles(supabase: SupabaseClient) {
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
 * Strip raw PII from uploaded_documents.extracted_json for identity documents
 * once their fields have been accepted into `answers`. The accepted fields
 * (name, DOB, nationality, passport number, expiry) are retained in `answers`
 * — the work product — and only the redundant copy in extracted_json is
 * overwritten with a marker. Non-identity documents are never touched here:
 * their extracted_json is load-bearing for the simulator and case intelligence.
 */
async function redactAcceptedIdentityDocs(supabase: SupabaseClient) {
  const result = { redacted: 0, errors: [] as string[] };

  const { data: rows, error } = await supabase
    .from('uploaded_documents')
    .select('id, extracted_json, doc_type, fields_accepted, created_at')
    .in('doc_type', IDENTITY_DOC_TYPES)
    .gt('fields_accepted', 0)
    .lt('created_at', daysAgo(IDENTITY_REDACT_GRACE_DAYS));

  if (error) {
    captureApiError(error, { route: 'cron/data-retention', stage: 'fetch-identity-docs' });
    result.errors.push(`fetch-identity-docs: ${error.message}`);
    return result;
  }

  for (const row of rows ?? []) {
    const current = row.extracted_json as Record<string, unknown> | null;
    if (!current || current._redacted === true) continue;

    const { error: updErr } = await supabase
      .from('uploaded_documents')
      .update({
        extracted_json: {
          _redacted: true,
          _redacted_at: new Date().toISOString(),
          _reason: 'identity fields captured to answers',
        },
      })
      .eq('id', row.id);

    if (updErr) {
      captureApiError(updErr, { route: 'cron/data-retention', stage: 'redact-identity-doc', docId: row.id });
      result.errors.push(`redact-identity-doc ${row.id}: ${updErr.message}`);
      continue;
    }
    result.redacted += 1;
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
async function sendRetentionReminders(supabase: SupabaseClient) {
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
async function sendRetentionCompletions(supabase: SupabaseClient, purgedByApp: Map<string, number>) {
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

async function reportDormant(supabase: SupabaseClient) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - DORMANT_MONTHS);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, last_login_at')
    .is('deleted_at', null)
    .lt('last_login_at', cutoff.toISOString());
  if (error) {
    captureApiError(error, { route: 'cron/data-retention', stage: 'fetch-dormant' });
    return { dormant: 0 };
  }
  if ((data?.length ?? 0) > 0) {
    console.log(
      `[cron/data-retention] ${data!.length} accounts dormant >${DORMANT_MONTHS}mo — review for deletion`,
    );
  }
  return { dormant: data?.length ?? 0 };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const accounts = await purgeDeletedAccounts(supabase);
    const files = await purgeExpiredFiles(supabase);
    const reminders = await sendRetentionReminders(supabase);
    const completions = await sendRetentionCompletions(supabase, files.purgedByApp);
    const identity = await redactAcceptedIdentityDocs(supabase);
    const dormant = await reportDormant(supabase);

    console.log(
      `[cron/data-retention] accounts purged=${accounts.purged}/${accounts.scanned}, ` +
        `files purged app=${files.appDocs} fdd=${files.fddDocs}, ` +
        `retention reminders sent=${reminders.sent}, completions sent=${completions.sent}, ` +
        `identity extracted_json redacted=${identity.redacted}, dormant=${dormant.dormant}`,
    );

    const { purgedByApp: _purgedByApp, ...filesSummary } = files;
    return NextResponse.json({ ok: true, accounts, files: filesSummary, reminders, completions, identity, dormant });
  } catch (err) {
    captureApiError(err, { route: 'cron/data-retention', stage: 'run' });
    return NextResponse.json({ error: 'Retention run failed' }, { status: 500 });
  }
}
