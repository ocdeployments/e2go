-- P2 hardening (Session 139): document-access audit log.
-- Records every access to a user-uploaded document — view, extraction, parse,
-- download, delete — for the regulatory audit trail an immigration-document
-- platform is expected to keep. Writes happen server-side via the service role;
-- users may read their own trail (privacy transparency), nothing else.

CREATE TABLE IF NOT EXISTS document_access_log (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id     uuid        NOT NULL,
  document_table  text        NOT NULL
    CHECK (document_table IN ('uploaded_documents', 'application_documents', 'fdd_analyses')),
  doc_type        text,
  file_name       text,
  action          text        NOT NULL
    CHECK (action IN ('view', 'extract', 'parse', 'download', 'delete')),
  actor           text        NOT NULL DEFAULT 'owner'
    CHECK (actor IN ('owner', 'admin', 'system')),
  detail          jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_access_log_user
  ON document_access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document
  ON document_access_log (document_id, created_at DESC);

ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Users may read their own access trail. No INSERT/UPDATE/DELETE policy for the
-- authenticated role — the service role (which bypasses RLS) is the only writer.
DROP POLICY IF EXISTS "Users read own document access log" ON document_access_log;
CREATE POLICY "Users read own document access log"
  ON document_access_log FOR SELECT
  USING (auth.uid() = user_id);
