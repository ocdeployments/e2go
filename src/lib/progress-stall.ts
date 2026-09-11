/**
 * DR-5 (Gap G-07), September 11, 2026 (Session 146).
 *
 * generate/progress/[jobId]/route.ts polled document_generation_jobs every
 * 2s but only ever looked at `status` — a job stuck at 'running' with a
 * frozen `updated_at` (a crashed invocation, an Anthropic call that never
 * resolves) streamed the same "still working" message forever. The client
 * had no way to tell "slow" from "dead," and the only recovery path
 * (DR-2's re-issue of /run on reconnect) never ran because nothing told the
 * client to reconnect.
 *
 * DR-1's generation-resume cron already defines "stale" for this exact
 * table with this exact threshold (a job with no progress update in ten
 * minutes is presumed dead and gets resumed from its checkpoint) — reusing
 * isStaleForResume() here means the SSE stream's "the user should be told"
 * threshold and the cron's "actually resume it" threshold can't drift apart
 * the way two independently-chosen magic numbers would.
 */
import { isStaleForResume } from './generation-resume';

const TERMINAL_STATUSES = ['completed', 'failed'];

/** A job in this status will never update again — the SSE stream should close. */
export function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * The status value to send to the client: the real job status, unless the
 * job has gone stale while still supposedly in flight, in which case the
 * client is told 'stalled' instead so it can offer a retry rather than
 * showing a progress bar that silently stopped moving.
 */
export function resolveProgressStatus(status: string, updatedAt: string, now: number = Date.now()): string {
  if (isStaleForResume(status, updatedAt, now)) {
    return 'stalled';
  }
  return status;
}
