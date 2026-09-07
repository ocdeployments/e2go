-- Document retention support
--
-- Adds a purge marker to the two tables that hold raw uploaded files in
-- Supabase Storage. The data-retention cron removes the storage object and
-- stamps file_purged_at; extraction routes skip a row whose file is purged.
--
-- Retention rule (see docs/DATA_RETENTION_POLICY.md):
--   raw uploaded files are deleted 30 days after the document package is
--   generated, or 90 days after upload if no package exists — whichever first.
--   Extracted structured data (answers, extracted_fields) is retained for the
--   life of the account and purged on account deletion.
--
-- Idempotent: safe to run more than once.

ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS file_purged_at TIMESTAMPTZ;

ALTER TABLE fdd_analyses
  ADD COLUMN IF NOT EXISTS file_purged_at TIMESTAMPTZ;

COMMENT ON COLUMN application_documents.file_purged_at IS
  'When the raw file was deleted from Storage under the retention policy. Extracted fields are retained; the file is gone.';
COMMENT ON COLUMN fdd_analyses.file_purged_at IS
  'When the raw FDD PDF was deleted from Storage under the retention policy. Extracted fields and the final report are retained; the PDF is gone.';

-- Find rows whose file is still present and eligible for purge quickly.
CREATE INDEX IF NOT EXISTS idx_application_documents_retention
  ON application_documents (created_at)
  WHERE file_purged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fdd_analyses_retention
  ON fdd_analyses (created_at)
  WHERE file_purged_at IS NULL;
