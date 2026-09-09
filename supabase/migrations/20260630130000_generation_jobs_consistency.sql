-- CIC-P.2: store canonical consistency sweep result on the generation job.
-- Persists the full sweep result (canonical values used, issues found) so
-- the client review UI and API can read it without recomputing each time.
ALTER TABLE document_generation_jobs
  ADD COLUMN IF NOT EXISTS consistency_result jsonb;
