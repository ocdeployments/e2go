import {
  buildLifecycleTimeline,
  LIFECYCLE_TIMELINE_COLUMNS,
} from '../lifecycle-timeline';

describe('buildLifecycleTimeline', () => {
  it('returns nothing for a client with no lifecycle row', () => {
    expect(buildLifecycleTimeline(null)).toEqual([]);
    expect(buildLifecycleTimeline(undefined)).toEqual([]);
  });

  it('omits milestones the client has not reached', () => {
    const timeline = buildLifecycleTimeline({
      quiz_completed_at: '2026-01-02T00:00:00Z',
      module3_started_at: null,
      approval_date: '',
    });

    expect(timeline.map(m => m.key)).toEqual(['quiz_completed_at']);
  });

  it('orders newest first', () => {
    const timeline = buildLifecycleTimeline({
      account_created_at: '2026-01-01T00:00:00Z',
      payment_completed_at: '2026-03-01T00:00:00Z',
      quiz_completed_at: '2026-02-01T00:00:00Z',
    });

    expect(timeline.map(m => m.label)).toEqual([
      'Payment completed',
      'Quiz completed',
      'Account created',
    ]);
  });

  /**
   * Both stamps land in the same write often enough to matter, and a timeline
   * that shows a module completing before it started reads as a bug.
   */
  it('keeps passage order when two milestones share a timestamp', () => {
    const timeline = buildLifecycleTimeline({
      module1_started_at: '2026-01-01T00:00:00Z',
      module1_completed_at: '2026-01-01T00:00:00Z',
    });

    expect(timeline.map(m => m.label)).toEqual([
      'Module 1 completed',
      'Module 1 started',
    ]);
  });

  it('ignores columns that are not timestamps', () => {
    const timeline = buildLifecycleTimeline({
      user_id: 'abc',
      simulator_sessions_total: 4,
      followup_completed: true,
      quiz_completed_at: '2026-01-02T00:00:00Z',
    });

    expect(timeline).toHaveLength(1);
  });

  it('names every column it reads, so callers can select them', () => {
    const columns = LIFECYCLE_TIMELINE_COLUMNS.split(', ');

    expect(columns).toContain('quiz_completed_at');
    expect(columns).toContain('generation_completed_at');
    expect(new Set(columns).size).toBe(columns.length);
  });
});
