-- WS3.1: store the deterministic exhibit-registry consistency sweep result
-- (orphan citations, unused exhibits) on the generation job, alongside the
-- existing canonical consistency_result column.
ALTER TABLE document_generation_jobs
  ADD COLUMN IF NOT EXISTS exhibit_consistency_result jsonb;
