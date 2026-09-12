import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';
import { daysAgo, BUCKET, purgeExpiredFiles, sendRetentionReminders, sendRetentionCompletions } from '@/lib/retention-cron';

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
const DORMANT_MONTHS = 24;
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

  const { data: logRow, error: logInsertError } = await supabase
    .from('cron_log')
    .insert({ job_name: 'data-retention', status: 'running' })
    .select('id')
    .single();
  if (logInsertError) {
    captureApiError(logInsertError, { route: 'cron/data-retention', stage: 'cron-log-insert' });
  }
  const logId = logRow?.id ?? '';

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

    if (logId) {
      await supabase
        .from('cron_log')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          rows_processed: accounts.purged + files.appDocs + files.fddDocs,
          metadata: { accounts, files: { appDocs: files.appDocs, fddDocs: files.fddDocs }, reminders, completions, identity, dormant },
        })
        .eq('id', logId);
    }

    const { purgedByApp: _purgedByApp, ...filesSummary } = files;
    return NextResponse.json({ ok: true, accounts, files: filesSummary, reminders, completions, identity, dormant });
  } catch (err) {
    captureApiError(err, { route: 'cron/data-retention', stage: 'run' });

    if (logId) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('cron_log')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: errMsg })
        .eq('id', logId);
    }

    return NextResponse.json({ error: 'Retention run failed' }, { status: 500 });
  }
}
