-- OPS-2: System Health — cron execution audit trail.
-- health-watchdog reads this to detect consecutive failures.

CREATE TABLE IF NOT EXISTS cron_log (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name        text        NOT NULL,
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  status          text        NOT NULL DEFAULT 'running',  -- 'running' | 'success' | 'failed'
  rows_processed  integer,
  error           text,
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS idx_cron_log_job_status ON cron_log (job_name, started_at DESC);
