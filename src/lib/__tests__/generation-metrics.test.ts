/**
 * DR-22 (Gap G-06), September 11, 2026 (Session 146).
 *
 * "how many paid generations started today, how many completed, at what
 * p50/p95 duration, and which are in flight right now" — computeGenerationMetrics
 * is the pure aggregation the ops dashboard's route will call against a live
 * document_generation_jobs query. Tested here against a fixture set rather
 * than a live query, same rationale as the other DR items with no DI seam on
 * the route itself.
 */
import { computeGenerationMetrics, type GenerationJobRow } from '../generation-metrics';

const NOW = new Date('2026-09-11T18:00:00.000Z');

function iso(hoursAgo: number, dayOffset = 0): string {
  const d = new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000 - dayOffset * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function job(overrides: Partial<GenerationJobRow> & { id: string }): GenerationJobRow {
  return {
    status: 'completed',
    created_at: iso(2),
    started_at: iso(2),
    completed_at: iso(1),
    ...overrides,
  };
}

describe('computeGenerationMetrics — counts (DR-22)', () => {
  it('counts jobs created today as started, ignoring jobs from other days', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'a', created_at: iso(3) }),
      job({ id: 'b', created_at: iso(10) }),
      job({ id: 'c', created_at: iso(2, 1) }), // yesterday
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.startedToday).toBe(2);
  });

  it('counts only jobs completed today as completedToday, regardless of when they started', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'a', status: 'completed', created_at: iso(30, 1), started_at: iso(29, 1), completed_at: iso(2) }),
      job({ id: 'b', status: 'completed', created_at: iso(3), started_at: iso(2), completed_at: iso(2, 1) }), // completed yesterday
      job({ id: 'c', status: 'running', created_at: iso(1), started_at: iso(1), completed_at: null }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.completedToday).toBe(1);
  });

  it('counts jobs that failed today as failedToday', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'a', status: 'failed', created_at: iso(2), started_at: iso(2), completed_at: iso(1) }),
      job({ id: 'b', status: 'failed', created_at: iso(2, 1), started_at: iso(2, 1), completed_at: iso(1, 1) }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.failedToday).toBe(1);
  });
});

describe('computeGenerationMetrics — percentiles (DR-22)', () => {
  it('computes p50/p95 duration in ms over jobs completed today', () => {
    const durationsHours = [1, 2, 3, 4, 10]; // sorted ascending
    const jobs: GenerationJobRow[] = durationsHours.map((h, i) => ({
      id: `job-${i}`,
      status: 'completed',
      created_at: iso(h + 1),
      started_at: iso(h + 1),
      completed_at: iso(1),
    }));
    const metrics = computeGenerationMetrics(jobs, NOW);

    // Each job's duration = (h+1 hours ago -> 1 hour ago) = h hours, in ms.
    const expectedMs = durationsHours.map((h) => h * 60 * 60 * 1000);
    expect(metrics.durationP50Ms).toBe(expectedMs[Math.floor(expectedMs.length * 0.5)]);
    expect(metrics.durationP95Ms).toBe(expectedMs[Math.floor(expectedMs.length * 0.95)]);
  });

  it('returns null percentiles when no job completed today', () => {
    const jobs: GenerationJobRow[] = [job({ id: 'a', status: 'running', completed_at: null })];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.durationP50Ms).toBeNull();
    expect(metrics.durationP95Ms).toBeNull();
  });
});

describe('computeGenerationMetrics — in-flight jobs, including non-terminal states (DR-22)', () => {
  it('lists queued and running jobs as in flight, sorted longest-running first', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'short-running', status: 'running', started_at: iso(0.5), completed_at: null }),
      job({ id: 'long-running', status: 'running', started_at: iso(3), completed_at: null }),
      job({ id: 'queued', status: 'queued', created_at: iso(1), started_at: null, completed_at: null }),
      job({ id: 'done', status: 'completed' }),
      job({ id: 'failed', status: 'failed' }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);

    expect(metrics.inFlight.map((j) => j.id)).toEqual(['long-running', 'queued', 'short-running']);
    expect(metrics.inFlight.every((j) => j.elapsedMs > 0)).toBe(true);
  });

  it('a queued job with no started_at uses created_at to compute elapsed time', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'queued', status: 'queued', created_at: iso(2), started_at: null, completed_at: null }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.inFlight[0].elapsedMs).toBe(2 * 60 * 60 * 1000);
  });

  it('an in-flight job that started yesterday still appears (not filtered by "today")', () => {
    const jobs: GenerationJobRow[] = [
      job({ id: 'stale', status: 'running', created_at: iso(30, 1), started_at: iso(29, 1), completed_at: null }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);
    expect(metrics.inFlight).toHaveLength(1);
    expect(metrics.inFlight[0].id).toBe('stale');
    expect(metrics.startedToday).toBe(0);
  });

  it('a large fixture set of mixed statuses across two days produces internally consistent totals', () => {
    const jobs: GenerationJobRow[] = [
      ...Array.from({ length: 5 }, (_, i) => job({ id: `today-completed-${i}`, status: 'completed', created_at: iso(3), started_at: iso(3), completed_at: iso(1) })),
      ...Array.from({ length: 2 }, (_, i) => job({ id: `today-failed-${i}`, status: 'failed', created_at: iso(2), started_at: iso(2), completed_at: iso(1) })),
      ...Array.from({ length: 3 }, (_, i) => job({ id: `today-running-${i}`, status: 'running', created_at: iso(1), started_at: iso(1), completed_at: null })),
      ...Array.from({ length: 2 }, (_, i) => job({ id: `yesterday-completed-${i}`, status: 'completed', created_at: iso(3, 1), started_at: iso(3, 1), completed_at: iso(1, 1) })),
      job({ id: 'stale-running-from-yesterday', status: 'running', created_at: iso(30, 1), started_at: iso(29, 1), completed_at: null }),
    ];
    const metrics = computeGenerationMetrics(jobs, NOW);

    expect(metrics.startedToday).toBe(10); // 5 completed + 2 failed + 3 running, created today
    expect(metrics.completedToday).toBe(5);
    expect(metrics.failedToday).toBe(2);
    expect(metrics.inFlight).toHaveLength(4); // 3 running today + 1 stale from yesterday
    expect(metrics.durationP50Ms).not.toBeNull();
  });
});
