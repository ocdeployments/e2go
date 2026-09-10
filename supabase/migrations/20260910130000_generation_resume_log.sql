-- DR-1: telemetry for the checkpointed-resume cron. Records the outcome of
-- every attempt to resume a stale generation job, so a rising failure rate is
-- visible from a query instead of from reading server logs — Romy's condition
-- for accepting checkpointed resume over a full durable queue (Decision 2,
-- Session 146).

CREATE TABLE IF NOT EXISTS generation_resume_log (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id             UUID REFERENCES document_generation_jobs(id) ON DELETE CASCADE,
  application_id     UUID REFERENCES applications(id) ON DELETE CASCADE,
  picked_up_status   TEXT NOT NULL,
  stale_for_seconds  INTEGER NOT NULL,
  approved_count     INTEGER NOT NULL DEFAULT 0,
  regenerated_count  INTEGER NOT NULL DEFAULT 0,
  outcome            TEXT NOT NULL
    CHECK (outcome IN ('resumed_to_completion', 'resumed_still_failing', 'resume_error')),
  error_message      TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_resume_log_job     ON generation_resume_log(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_resume_log_outcome ON generation_resume_log(outcome, created_at DESC);

-- Service-role only, same pattern as the other admin/ops log tables
-- (see 20260630200000_rls_admin_log_tables.sql) — no authenticated-user policies.
ALTER TABLE generation_resume_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_resume_log FORCE ROW LEVEL SECURITY;

-- Review query for "is checkpointed resume's failure rate rising":
--   select outcome, count(*), date_trunc('day', created_at) as day
--   from generation_resume_log group by 1, 3 order by 3 desc;
