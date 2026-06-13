-- Add downloaded_at timestamp to generation_pipeline_log
-- Tracks when the applicant downloaded their document package

ALTER TABLE generation_pipeline_log
  ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;
