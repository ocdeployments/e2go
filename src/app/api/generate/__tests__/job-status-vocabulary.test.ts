import fs from 'fs';
import path from 'path';
import {
  IN_FLIGHT_STATUSES,
  isInFlightStatus,
  isStaleQueuedJob,
} from '@/lib/generation-job-status';

/**
 * DR-2: /start used to check ['queued','running'] and /run checked
 * ['running','pending','processing','awaiting_approval'] independently — two
 * hardcoded lists drifting out of sync is the same bug shape as G-11. Both
 * routes must import IN_FLIGHT_STATUSES rather than spelling out the list.
 */
function readRoute(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('DR-2 — shared in-flight status vocabulary', () => {
  it('/start imports IN_FLIGHT_STATUSES rather than a literal status list', () => {
    const src = readRoute('src/app/api/generate/start/route.ts');
    expect(src).toMatch(/from ['"]@\/lib\/generation-job-status['"]/);
    expect(src).toMatch(/IN_FLIGHT_STATUSES/);
    expect(src).not.toMatch(/\.in\(\s*['"]status['"]\s*,\s*\[\s*['"]queued['"]/);
  });

  it('/run imports the same constant rather than a literal status list', () => {
    const src = readRoute('src/app/api/generate/run/[jobId]/route.ts');
    expect(src).toMatch(/from ['"]@\/lib\/generation-job-status['"]/);
    expect(src).toMatch(/IN_FLIGHT_STATUSES|isInFlightStatus/);
    expect(src).not.toMatch(
      /status === ['"]running['"] \|\| job\.status === ['"]pending['"]/
    );
  });

  it('covers every status the two routes used to check independently', () => {
    for (const status of ['queued', 'running', 'pending', 'processing', 'awaiting_approval']) {
      expect(IN_FLIGHT_STATUSES).toContain(status);
      expect(isInFlightStatus(status)).toBe(true);
    }
    expect(isInFlightStatus('completed')).toBe(false);
    expect(isInFlightStatus('failed')).toBe(false);
  });

  it('treats a stale queued job as restartable', () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    expect(isStaleQueuedJob('queued', elevenMinutesAgo)).toBe(true);
  });

  it('leaves a fresh queued job alone', () => {
    const justNow = new Date(Date.now() - 30 * 1000).toISOString();
    expect(isStaleQueuedJob('queued', justNow)).toBe(false);
  });

  it('never treats a non-queued status as a stale-queued job, regardless of age', () => {
    const longAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isStaleQueuedJob('running', longAgo)).toBe(false);
    expect(isStaleQueuedJob('completed', longAgo)).toBe(false);
  });
});
