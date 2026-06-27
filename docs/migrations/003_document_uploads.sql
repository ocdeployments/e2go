-- ============================================================================
-- MIGRATION 003: Document Upload & Extraction Pipeline
-- Created: 2026-06-10
-- Purpose: Add tables and columns for document upload, extraction, and
--          discrepancy detection. Idempotent — safe to run on existing DB.
-- ============================================================================

-- ============================================================================
-- 1. ANSWERS TABLE — add confidence and source_document_type columns
-- ============================================================================

ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS confidence TEXT
  CHECK (confidence IN ('high', 'medium', 'low'));

ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS source_document_type TEXT;

-- ============================================================================
-- 2. APPLICATIONS TABLE — add preparation_status column
-- ============================================================================

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS preparation_status TEXT
  CHECK (preparation_status IN ('scratch', 'partial', 'near_complete'))
  DEFAULT 'scratch';

-- ============================================================================
-- 3. APPLICATION_DOCUMENTS TABLE — uploaded document registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id)
    ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx', 'csv')),
  file_size_bytes INTEGER,
  user_selected_document_type TEXT,
  detected_document_type TEXT,
  detection_confidence TEXT CHECK (detection_confidence IN ('high', 'medium', 'low')),
  detection_reasoning TEXT,
  document_summary TEXT,
  fields_extracted INTEGER DEFAULT 0,
  storage_path TEXT NOT NULL,
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracting', 'completed', 'failed')),
  extraction_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extracted_at TIMESTAMPTZ
);

-- ============================================================================
-- 4. DOCUMENT_DISCREPANCIES TABLE — cross-document conflict log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_discrepancies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id)
    ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  question_label TEXT,
  conflicting_values JSONB NOT NULL,
  resolved_value TEXT,
  resolved_source TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_application_documents_application
  ON public.application_documents (application_id);

CREATE INDEX IF NOT EXISTS idx_application_documents_user
  ON public.application_documents (user_id);

CREATE INDEX IF NOT EXISTS idx_application_documents_extraction_status
  ON public.application_documents (extraction_status);

CREATE INDEX IF NOT EXISTS idx_document_discrepancies_application
  ON public.document_discrepancies (application_id);

CREATE INDEX IF NOT EXISTS idx_document_discrepancies_resolved
  ON public.document_discrepancies (application_id, resolved_value);

CREATE INDEX IF NOT EXISTS idx_answers_confidence
  ON public.answers (application_id, confidence);

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own documents"
  ON public.application_documents FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE public.document_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own discrepancies"
  ON public.document_discrepancies FOR ALL
  USING (
    application_id IN (
      SELECT id FROM public.applications WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. SUPABASE STORAGE BUCKET
-- Run via Supabase dashboard or management API:
--   Bucket name: application-documents
--   Public: false
--   File size limit: 10MB
--   Allowed MIME types: application/pdf,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--     text/csv
--
-- Storage policies (run after bucket creation):
-- ============================================================================

-- Policy: Users can upload to their own folder
-- INSERT policy: bucket_id = 'application-documents'
--   AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy: Users can read their own files
-- SELECT policy: bucket_id = 'application-documents'
--   AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy: Users can delete their own files
-- DELETE policy: bucket_id = 'application-documents'
--   AND (storage.foldername(name))[1] = auth.uid()::text
