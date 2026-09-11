/**
 * generation-metrics.ts
 *
 * DR-22 (Gap G-06): "the number to have open on the morning the first ten
 * clients arrive" — how many paid generations started today, how many
 * completed, at what p50/p95 duration, and which are in flight right now.
 * system-status's existing health-detail route already surfaces active
 * ('running') and stuck jobs for operational alerting; this adds the
 * volume/throughput view neither one covers.
 *
 * Pure aggregation over document_generation_jobs rows so it can be unit
 * tested against a fixture set (no live Supabase call in the critical
 * path) — same rationale as DR-1/DR-5/DR-8's pure-function tests.
 */

export type GenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface GenerationJobRow {
  id: string;
  status: GenerationJobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface InFlightJob {
  id: string;
  status: GenerationJobStatus;
  elapsedMs: number;
}

export interface GenerationMetrics {
  startedToday: number;
  completedToday: number;
  failedToday: number;
  durationP50Ms: number | null;
  durationP95Ms: number | null;
  inFlight: InFlightJob[];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function percentile(sortedMs: number[], p: number): number | null {
  if (sortedMs.length === 0) return null;
  const idx = Math.min(sortedMs.length - 1, Math.floor(sortedMs.length * p));
  return sortedMs[idx];
}

/**
 * Aggregates a set of job rows into the day's throughput numbers.
 *
 * `now` should be the caller's current time (injected, not read internally,
 * so "today" and in-flight elapsed time are deterministic in tests).
 * `jobs` may freely mix rows created before today (an in-flight job that
 * started yesterday and is still running) with today's — the function
 * filters internally rather than requiring the caller to pre-split them.
 */
export function computeGenerationMetrics(jobs: GenerationJobRow[], now: Date): GenerationMetrics {
  const todayStart = startOfUtcDay(now).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const isToday = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= todayStart && t < todayEnd;
  };

  let startedToday = 0;
  let completedToday = 0;
  let failedToday = 0;
  const durationsMs: number[] = [];
  const inFlight: InFlightJob[] = [];

  for (const job of jobs) {
    if (isToday(job.created_at)) {
      startedToday += 1;
    }

    if (job.status === 'completed' && job.completed_at && isToday(job.completed_at)) {
      completedToday += 1;
      const start = job.started_at ?? job.created_at;
      durationsMs.push(new Date(job.completed_at).getTime() - new Date(start).getTime());
    }

    if (job.status === 'failed' && isToday(job.completed_at ?? job.created_at)) {
      failedToday += 1;
    }

    if (job.status === 'queued' || job.status === 'running') {
      const start = job.started_at ?? job.created_at;
      inFlight.push({
        id: job.id,
        status: job.status,
        elapsedMs: now.getTime() - new Date(start).getTime(),
      });
    }
  }

  durationsMs.sort((a, b) => a - b);
  inFlight.sort((a, b) => b.elapsedMs - a.elapsedMs);

  return {
    startedToday,
    completedToday,
    failedToday,
    durationP50Ms: percentile(durationsMs, 0.5),
    durationP95Ms: percentile(durationsMs, 0.95),
    inFlight,
  };
}
