import type { SupabaseClient } from '@supabase/supabase-js';
import { runGenerationPipeline } from './generation-engine';
import { captureApiError } from './capture-error';
import type { GenerationStep } from '@/types/generation';

/**
 * DR-1: a job with no progress update inside this window is presumed dead —
 * shorter than health-watchdog's 30-minute fail threshold so a resume attempt
 * gets first crack at the job before the watchdog gives up on it outright.
 */
export const STALE_RESUME_MS = 10 * 60 * 1000;

export type ResumeOutcome = 'resumed_to_completion' | 'resumed_still_failing' | 'resume_error';

export interface ResumableJob {
  id: string;
  application_id: string;
  user_id: string;
  status: string;
  updated_at: string;
}

export function isStaleForResume(status: string, updatedAt: string, now: number = Date.now()): boolean {
  if (status !== 'queued' && status !== 'running') return false;
  return now - new Date(updatedAt).getTime() > STALE_RESUME_MS;
}

export async function findStaleResumableJobs(
  supabase: SupabaseClient,
  limit = 20
): Promise<ResumableJob[]> {
  const cutoff = new Date(Date.now() - STALE_RESUME_MS).toISOString();
  const { data, error } = await supabase
    .from('document_generation_jobs')
    .select('id, application_id, user_id, status, updated_at')
    .in('status', ['queued', 'running'])
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    captureApiError(error, { route: 'generation-resume', stage: 'find-stale' });
  }

  return data ?? [];
}

/**
 * Claims a stale job and resumes it from its already-approved document set
 * (DR-7). Fire-and-forget by design, matching /api/generate/run — three
 * nested retry loops across 15-25 documents put a full run comfortably past
 * the serverless response ceiling, so the caller must not await this before
 * responding. Every attempt writes exactly one generation_resume_log row so
 * a rising resume-failure rate is visible without reading server logs
 * (Decision 2, Session 146).
 */
export async function resumeStaleJob(
  supabase: SupabaseClient,
  job: ResumableJob
): Promise<{ claimed: boolean }> {
  // Optimistic-concurrency claim on updated_at: only the invocation that still
  // sees the exact value we read wins, so two overlapping cron runs (or a cron
  // racing a client's own /run re-attach) can't both resume the same job.
  const { data: claimed, error: claimError } = await supabase
    .from('document_generation_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('updated_at', job.updated_at)
    .select('id')
    .maybeSingle();

  if (claimError) {
    captureApiError(claimError, { route: 'generation-resume', stage: 'claim', jobId: job.id });
  }

  if (!claimed) {
    return { claimed: false };
  }

  const staleForSeconds = Math.round((Date.now() - new Date(job.updated_at).getTime()) / 1000);

  const [{ count: approvedCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', job.application_id)
      .eq('status', 'approved'),
    supabase
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', job.application_id),
  ]);

  const approvedAtPickup = approvedCount ?? 0;
  const regeneratedCount = Math.max((totalCount ?? 0) - approvedAtPickup, 0);

  const logTelemetry = async (outcome: ResumeOutcome, errorMessage?: string) => {
    const { error } = await supabase.from('generation_resume_log').insert({
      job_id: job.id,
      application_id: job.application_id,
      picked_up_status: job.status,
      stale_for_seconds: staleForSeconds,
      approved_count: approvedAtPickup,
      regenerated_count: regeneratedCount,
      outcome,
      error_message: errorMessage ?? null,
    });
    if (error) {
      captureApiError(error, { route: 'generation-resume', stage: 'telemetry', jobId: job.id });
    }
  };

  const onProgress = (step: GenerationStep) => {
    void supabase
      .from('document_generation_jobs')
      .update({
        current_step: step.id,
        current_step_label: step.label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  };

  runGenerationPipeline(job.application_id, job.user_id, job.id, onProgress)
    .then(async () => {
      const { data: finishedJob, error: statusError } = await supabase
        .from('document_generation_jobs')
        .select('status')
        .eq('id', job.id)
        .maybeSingle();

      if (statusError) {
        captureApiError(statusError, { route: 'generation-resume', stage: 'post-pipeline-status', jobId: job.id });
      }

      await logTelemetry(
        finishedJob?.status === 'completed' ? 'resumed_to_completion' : 'resumed_still_failing'
      );
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : 'Unknown pipeline error';
      captureApiError(err, { route: 'generation-resume', stage: 'pipeline', jobId: job.id });
      await supabase
        .from('document_generation_jobs')
        .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
        .eq('id', job.id);
      await logTelemetry('resume_error', message);
    });

  return { claimed: true };
}
