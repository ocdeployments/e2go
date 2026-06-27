-- Application documents and discrepancy tracking tables
-- Created: June 13, 2026 (Session 15+ quick-start flow audit)
-- These tables are referenced by POST /api/documents, POST /api/documents/extract,
-- and GET /api/documents but were never created via migration.

-- Documents uploaded by users for extraction
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  user_selected_document_type TEXT,
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracting', 'completed', 'failed')),
  extraction_error TEXT,
  detected_document_type TEXT,
  detection_confidence TEXT,
  detection_reasoning TEXT,
  fields_extracted INTEGER DEFAULT 0,
  document_summary TEXT,
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discrepancies detected across documents for the same application
CREATE TABLE IF NOT EXISTS document_discrepancies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_label TEXT,
  conflicting_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their application documents"
  ON application_documents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their document discrepancies"
  ON document_discrepancies FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM applications
      WHERE id = application_id
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_application_documents_application
  ON application_documents(application_id);

CREATE INDEX IF NOT EXISTS idx_application_documents_user
  ON application_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_document_discrepancies_application
  ON document_discrepancies(application_id);
