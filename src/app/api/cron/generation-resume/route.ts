import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';
import { findStaleResumableJobs, resumeStaleJob } from '@/lib/generation-resume';

// DR-1: checkpointed resume for the generation pipeline. Runs every 10
// minutes — a job whose updated_at has gone stale (no live invocation is
// driving it forward) gets picked up and continued from its already-approved
// document set (DR-7), rather than waiting for a human to notice and retry.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  let logId = '';

  const { data: logRow, error: logInsertError } = await admin
    .from('cron_log')
    .insert({ job_name: 'generation-resume', status: 'running' })
    .select('id')
    .single();
  if (logInsertError) {
    captureApiError(logInsertError, { route: 'cron/generation-resume', stage: 'log-insert' });
  }
  logId = logRow?.id ?? '';

  try {
    const staleJobs = await findStaleResumableJobs(admin);
    const claimed: string[] = [];
    const skipped: string[] = [];

    // resumeStaleJob is fire-and-forget on the pipeline itself (mirrors
    // /api/generate/run — a full run comfortably exceeds the serverless
    // response ceiling), but the claim + telemetry-count reads below are
    // awaited so the response accurately reports what this invocation did.
    for (const job of staleJobs) {
      const result = await resumeStaleJob(admin, job);
      if (result.claimed) {
        claimed.push(job.id);
      } else {
        skipped.push(job.id);
      }
    }

    if (logId) {
      await admin
        .from('cron_log')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          rows_processed: claimed.length,
          metadata: { claimed, skipped },
        })
        .eq('id', logId);
    }

    return NextResponse.json({ ok: true, claimed, skipped });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    captureApiError(err, { route: 'cron/generation-resume' });

    if (logId) {
      await admin
        .from('cron_log')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: errMsg })
        .eq('id', logId);
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
