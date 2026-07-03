-- Phase 1: route uploaded documents and answers to the person (principal or
-- family member) they belong to, and widen doc_type to match the UI options.

-- 1. Fix uploaded_documents.doc_type CHECK constraint — it only allowed 6 of
--    the 11 values the upload UI (DOC_TYPE_OPTIONS) actually offers, so
--    passport/government_form/etc uploads were failing the insert.
ALTER TABLE uploaded_documents DROP CONSTRAINT IF EXISTS uploaded_documents_doc_type_check;
ALTER TABLE uploaded_documents ADD CONSTRAINT uploaded_documents_doc_type_check
  CHECK (doc_type IN (
    'resume', 'fdd', 'investment_records', 'territory_analysis', 'business_plan',
    'financial_statement', 'passport', 'franchise_agreement', 'lease_agreement',
    'acquisition_financials', 'government_form', 'birth_certificate', 'marriage_certificate'
  ));

-- 2. Owner columns on uploaded_documents
ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'principal'
    CHECK (owner_type IN ('principal', 'family_member')),
  ADD COLUMN IF NOT EXISTS owner_family_member_id uuid
    REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS uploaded_documents_owner_idx
  ON uploaded_documents (owner_family_member_id) WHERE owner_family_member_id IS NOT NULL;

-- 3. Person scoping on answers. NULL family_member_id = principal.
--    Postgres treats NULLs as distinct in a unique index, so principal rows
--    keep their existing (application_id, question_key) uniqueness without
--    needing a COALESCE sentinel.
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS family_member_id uuid
    REFERENCES family_members(id) ON DELETE CASCADE;

ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_application_id_question_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS answers_application_question_member_key
  ON answers (application_id, question_key, family_member_id);

CREATE INDEX IF NOT EXISTS answers_family_member_idx
  ON answers (family_member_id) WHERE family_member_id IS NOT NULL;
