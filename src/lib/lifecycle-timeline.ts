/**
 * Turns an application_lifecycle row into a client activity timeline.
 *
 * application_lifecycle holds one row per client, not a stream of events: each
 * milestone is its own timestamp column, and a null means the client has not
 * reached that stage. Three admin pages used to query it for `event` and
 * `details` columns that do not exist, so the whole select errored and every
 * timeline rendered empty.
 *
 * Deriving the timeline from the columns instead has one property an event
 * table could not have offered: it works retroactively, for every client
 * already in the database.
 *
 * The trade is that a column records only the latest occurrence, so a stage
 * entered twice appears once. That is acceptable here — the timeline answers
 * "how far has this client got, and when", not "how often did they revisit".
 */

/** Ordered oldest-first, which is the order a client passes through them. */
const MILESTONES: ReadonlyArray<readonly [string, string]> = [
  ['account_created_at',         'Account created'],
  ['first_visit_at',             'First visit'],
  ['quiz_started_at',            'Quiz started'],
  ['quiz_completed_at',          'Quiz completed'],
  ['onboarding_completed_at',    'Onboarding completed'],
  ['onboarding_doc_uploaded_at', 'Onboarding document uploaded'],
  ['payment_completed_at',       'Payment completed'],
  ['module1_started_at',         'Module 1 started'],
  ['module1_completed_at',       'Module 1 completed'],
  ['module2_started_at',         'Module 2 started'],
  ['module2_completed_at',       'Module 2 completed'],
  ['module3_started_at',         'Module 3 started'],
  ['module3_completed_at',       'Module 3 completed'],
  ['module4_started_at',         'Module 4 started'],
  ['module4_completed_at',       'Module 4 completed'],
  ['module5_started_at',         'Module 5 started'],
  ['module5_completed_at',       'Module 5 completed'],
  ['module6_started_at',         'Module 6 started'],
  ['module6_completed_at',       'Module 6 completed'],
  ['simulator_first_run_at',     'Simulator first run'],
  ['generation_triggered_at',    'Generation triggered'],
  ['generation_completed_at',    'Generation completed'],
  ['follow_up_check_in_at',      'Follow-up check-in'],
  ['interview_date',             'Interview'],
  ['approval_date',              'Approval'],
  ['outcome_recorded_at',        'Outcome recorded'],
];

/** Every column this timeline reads, for the caller's `.select()`. */
export const LIFECYCLE_TIMELINE_COLUMNS = MILESTONES.map(([column]) => column).join(', ');

export interface LifecycleMilestone {
  /** Stable across renders — the source column name. */
  key: string;
  label: string;
  at: string;
}

/**
 * Newest first, to match how the admin pages read: most recent activity at the
 * top. Milestones the client has not reached are absent rather than null, so a
 * caller can treat an empty array as "nothing recorded yet".
 *
 * Ties keep the passage order above, so "Module 1 started" never sorts below
 * "Module 1 completed" when both carry the same timestamp.
 */
export function buildLifecycleTimeline(
  row: Record<string, unknown> | null | undefined,
): LifecycleMilestone[] {
  if (!row) return [];

  const reached: Array<LifecycleMilestone & { order: number }> = [];

  MILESTONES.forEach(([column, label], order) => {
    const value = row[column];
    if (typeof value === 'string' && value.length > 0) {
      reached.push({ key: column, label, at: value, order });
    }
  });

  reached.sort((a, b) => (a.at === b.at ? b.order - a.order : (a.at < b.at ? 1 : -1)));

  return reached.map(({ key, label, at }) => ({ key, label, at }));
}
