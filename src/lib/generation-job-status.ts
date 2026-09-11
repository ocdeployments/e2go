/**
 * DR-2: single source of truth for "is this generation job in flight" — before
 * this, /start checked ['queued','running'] and /run checked
 * ['running','pending','processing','awaiting_approval'], so a job could read
 * as in-flight to one route and not the other.
 */
export const IN_FLIGHT_STATUSES = [
  'queued', 'running', 'pending', 'processing', 'awaiting_approval',
] as const;

export type InFlightStatus = typeof IN_FLIGHT_STATUSES[number];

export function isInFlightStatus(status: string): status is InFlightStatus {
  return (IN_FLIGHT_STATUSES as readonly string[]).includes(status);
}

// A 'queued' job that never got its /run call (the tab closed between /start
// and /run, or the invocation that would have run it died) has no process
// updating updated_at. Past this window it's not a lock — it's a stale row
// that should be picked up and restarted rather than blocking a new attempt.
const STALE_QUEUED_MS = 5 * 60 * 1000;

export function isStaleQueuedJob(status: string, updatedAt: string): boolean {
  if (status !== 'queued') return false;
  return Date.now() - new Date(updatedAt).getTime() > STALE_QUEUED_MS;
}
