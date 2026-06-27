-- Migration 004: Add confidence + source_document_type to answers table
-- Required by document upload extraction flow (Session B, June 9, 2026)
-- Apply via Supabase SQL Editor: copy and run this file

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS source_document_type TEXT;

-- Index for gap-report query (filters on source_document_type IS NOT NULL)
CREATE INDEX IF NOT EXISTS answers_source_document_type_idx
  ON answers (application_id, source_document_type)
  WHERE source_document_type IS NOT NULL;
