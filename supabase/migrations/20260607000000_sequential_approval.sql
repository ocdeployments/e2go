-- Add awaiting_approval status to document_generation_jobs
ALTER TABLE document_generation_jobs
  DROP CONSTRAINT IF EXISTS document_generation_jobs_status_check;
ALTER TABLE document_generation_jobs
  ADD CONSTRAINT document_generation_jobs_status_check
  CHECK (status IN (
    'queued', 'running', 'awaiting_approval',
    'completed', 'failed', 'partial'
  ));

-- Add generated and revision_requested to generated_documents
ALTER TABLE generated_documents
  DROP CONSTRAINT IF EXISTS generated_documents_status_check;
ALTER TABLE generated_documents
  ADD CONSTRAINT generated_documents_status_check
  CHECK (status IN (
    'queued', 'generating', 'generated', 'awaiting_approval',
    'under_review', 'approved', 'locked', 'failed', 'revision_requested'
  ));

-- Add index for efficient approval polling
CREATE INDEX IF NOT EXISTS idx_generated_documents_status_lookup
  ON generated_documents(job_id, document_type, status);