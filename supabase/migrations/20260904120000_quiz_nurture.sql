-- Follow-up sequence for people who completed the quiz but never came back.
--
-- The existing clock1 sequence in email-scheduler.ts filters on
-- payment_status = 'paid' and starts at day 60, so it never reaches this
-- group. They currently receive exactly one email, ever.
--
-- Two tables:
--   email_suppressions — the unsubscribe list, checked before every send.
--   quiz_nurture_log   — what has already gone out, so a re-run of the cron
--                        cannot send the same step twice.

-- ── Unsubscribe list ────────────────────────────────────────────────────────
-- Keyed on the address rather than a user id: most quiz takers are anonymous,
-- and an unsubscribe has to hold whether or not they ever create an account.
CREATE TABLE IF NOT EXISTS email_suppressions (
  email       TEXT PRIMARY KEY,
  reason      TEXT NOT NULL DEFAULT 'unsubscribed',
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. Service role bypasses RLS; nothing else may read the
-- list, because being able to query it would confirm which addresses exist.

-- ── Sequence log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_nurture_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id  UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  step             TEXT NOT NULL,
  subject          TEXT,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiz_nurture_log ENABLE ROW LEVEL SECURITY;

-- The idempotency guard. Two cron runs in the same window, or a retry after a
-- partial failure, cannot produce a duplicate send.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_nurture_log_once
  ON quiz_nurture_log (quiz_session_id, step);

CREATE INDEX IF NOT EXISTS idx_quiz_nurture_log_email
  ON quiz_nurture_log (email);

-- Supports the due-session scan: completed, consented, and old enough.
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_nurture_scan
  ON quiz_sessions (completed_at)
  WHERE casl_consent = TRUE AND email IS NOT NULL;
