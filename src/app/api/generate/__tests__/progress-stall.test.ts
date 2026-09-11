/**
 * DR-5 (Gap G-07), September 11, 2026 (Session 146).
 *
 * generate/progress/[jobId]/route.ts has no DI seam — it opens its own
 * Supabase client, polls inside a setInterval closed over a ReadableStream
 * controller, and has no exported handler that a test can drive without a
 * live EventSource (the same constraint noted in generation-quarantine.test.ts
 * / generation-resume.test.ts). The actual decision logic now lives in
 * src/lib/progress-stall.ts as two pure functions; these tests exercise them
 * directly, which is everything the route itself does with `job.status` and
 * `job.updated_at` before building the SSE message.
 */
import { resolveProgressStatus, isTerminalJobStatus } from '@/lib/progress-stall';

const TEN_MINUTES_MS = 10 * 60 * 1000;

describe('resolveProgressStatus — stall detection for the progress stream (DR-5)', () => {
  it('a running job whose updated_at is 11 minutes old reports stalled', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 11 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('running', updatedAt, now)).toBe('stalled');
  });

  it('a running job whose updated_at is 9 minutes old reports its real status, not stalled', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 9 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('running', updatedAt, now)).toBe('running');
  });

  it('a queued job past the threshold also reports stalled', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 11 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('queued', updatedAt, now)).toBe('stalled');
  });

  it('exactly at the ten-minute boundary is not yet stalled', () => {
    const now = Date.now();
    const updatedAt = new Date(now - TEN_MINUTES_MS).toISOString();
    expect(resolveProgressStatus('running', updatedAt, now)).toBe('running');
  });

  it('awaiting_approval never reports stalled, no matter how old — the client is waiting on the user, not the pipeline', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 60 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('awaiting_approval', updatedAt, now)).toBe('awaiting_approval');
  });

  it('a completed job reports completed even with a stale updated_at — terminal statuses are never overridden', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 60 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('completed', updatedAt, now)).toBe('completed');
  });

  it('a failed job reports failed, not stalled', () => {
    const now = Date.now();
    const updatedAt = new Date(now - 60 * 60 * 1000).toISOString();
    expect(resolveProgressStatus('failed', updatedAt, now)).toBe('failed');
  });

  it('a fresh job (updated_at just now) reports its real status', () => {
    const now = Date.now();
    expect(resolveProgressStatus('running', new Date(now).toISOString(), now)).toBe('running');
  });
});

describe('isTerminalJobStatus — which statuses close the SSE stream (DR-5)', () => {
  it('completed closes the stream', () => {
    expect(isTerminalJobStatus('completed')).toBe(true);
  });

  it('failed closes the stream', () => {
    expect(isTerminalJobStatus('failed')).toBe(true);
  });

  it('running does not close the stream', () => {
    expect(isTerminalJobStatus('running')).toBe(false);
  });

  it('queued does not close the stream', () => {
    expect(isTerminalJobStatus('queued')).toBe(false);
  });

  it('awaiting_approval does not close the stream', () => {
    expect(isTerminalJobStatus('awaiting_approval')).toBe(false);
  });

  it('stalled is not itself a job status the route ever sets — it never reaches isTerminalJobStatus', () => {
    // stalled is produced only by resolveProgressStatus for the outgoing
    // message; document_generation_jobs.status never holds this value, so
    // the stream correctly keeps polling (isTerminalJobStatus would return
    // false for it regardless, since it isn't in the terminal set).
    expect(isTerminalJobStatus('stalled')).toBe(false);
  });
});
