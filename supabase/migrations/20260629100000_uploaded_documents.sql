-- uploaded_documents: stores metadata for user-uploaded documents used for AI field extraction
-- The actual files live in Supabase Storage bucket 'uploaded-docs'

CREATE TABLE IF NOT EXISTS uploaded_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id   uuid REFERENCES applications(id) ON DELETE CASCADE,
  file_path        text NOT NULL,
  file_name        text NOT NULL,
  doc_type         text NOT NULL CHECK (doc_type IN ('resume','fdd','investment_records','territory_analysis','business_plan','financial_statement')),
  extraction_status text NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending','processing','complete','failed')),
  extracted_json   jsonb,
  fields_accepted  int NOT NULL DEFAULT 0,
  fields_total     int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only see their own documents
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploaded_documents_select_own"
  ON uploaded_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "uploaded_documents_insert_own"
  ON uploaded_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uploaded_documents_update_own"
  ON uploaded_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "uploaded_documents_delete_own"
  ON uploaded_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Index for user + application lookups
CREATE INDEX IF NOT EXISTS uploaded_documents_user_idx ON uploaded_documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS uploaded_documents_app_idx  ON uploaded_documents (application_id) WHERE application_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_uploaded_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_uploaded_documents_updated_at
  BEFORE UPDATE ON uploaded_documents
  FOR EACH ROW EXECUTE FUNCTION update_uploaded_documents_updated_at();
