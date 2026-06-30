-- ============================================================================
-- Sprint J-1 — Case Intelligence Core (the CPU)
-- CIC-0.1: brain tables + latent doc_type CHECK fix
-- Idempotent. RLS on every table. See docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Fix latent bug: uploaded_documents.doc_type CHECK only allowed 6 types,
--    but Session 91 introduced 5 more. New types currently fail on INSERT.
--    'auto' is resolved server-side before storage, so it is NOT a stored value.
-- ----------------------------------------------------------------------------
ALTER TABLE uploaded_documents DROP CONSTRAINT IF EXISTS uploaded_documents_doc_type_check;
ALTER TABLE uploaded_documents ADD CONSTRAINT uploaded_documents_doc_type_check
  CHECK (doc_type IN (
    'resume','fdd','franchise_agreement','passport','lease_agreement',
    'investment_records','financial_statement','business_plan',
    'territory_analysis','acquisition_financials','government_form'
  ));

-- ----------------------------------------------------------------------------
-- Shared updated_at trigger function for CIC tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cic_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. document_intelligence — Faculty 1 document channel output (per application)
--    Holds the reconciled evidence ledger + per-document comprehension memos.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_intelligence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  ledger          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of reconciled Claim objects
  memos           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of { doc_id, doc_type, memo }
  conflicts       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- genuine conflicts flagged for review (non-blocking)
  doc_count       int   NOT NULL DEFAULT 0,             -- documents represented in this ledger
  status          text  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','complete','failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE document_intelligence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_intelligence_select_own" ON document_intelligence;
DROP POLICY IF EXISTS "document_intelligence_insert_own" ON document_intelligence;
DROP POLICY IF EXISTS "document_intelligence_update_own" ON document_intelligence;
DROP POLICY IF EXISTS "document_intelligence_delete_own" ON document_intelligence;
CREATE POLICY "document_intelligence_select_own" ON document_intelligence FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "document_intelligence_insert_own" ON document_intelligence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "document_intelligence_update_own" ON document_intelligence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "document_intelligence_delete_own" ON document_intelligence FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS document_intelligence_user_idx ON document_intelligence (user_id);
DROP TRIGGER IF EXISTS set_document_intelligence_updated_at ON document_intelligence;
CREATE TRIGGER set_document_intelligence_updated_at
  BEFORE UPDATE ON document_intelligence FOR EACH ROW EXECUTE FUNCTION cic_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. case_model — Faculty 1 PERCEIVE output (per application)
--    Unified, provenance-tagged understanding of the client across all signals.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_model (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  -- per-dimension facts: { dimension: [ { fact, value, source, source_ref, confidence, status } ] }
  dimensions      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- which signal sources fed this build (quiz/answers/documents/followup/simulations/case_briefs)
  signals_present jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_state      text  NOT NULL DEFAULT 'sparse'
                    CHECK (data_state IN ('sparse','partial','substantial','complete')),
  built_at        timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE case_model ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_model_select_own" ON case_model;
DROP POLICY IF EXISTS "case_model_insert_own" ON case_model;
DROP POLICY IF EXISTS "case_model_update_own" ON case_model;
DROP POLICY IF EXISTS "case_model_delete_own" ON case_model;
CREATE POLICY "case_model_select_own" ON case_model FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "case_model_insert_own" ON case_model FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "case_model_update_own" ON case_model FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "case_model_delete_own" ON case_model FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS case_model_user_idx ON case_model (user_id);
DROP TRIGGER IF EXISTS set_case_model_updated_at ON case_model;
CREATE TRIGGER set_case_model_updated_at
  BEFORE UPDATE ON case_model FOR EACH ROW EXECUTE FUNCTION cic_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. case_theory — Faculty 3 REASON output + control-loop state (per application)
--    The strategic brief, directive list, and per-phase certification state.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_theory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  narrative       text,                                  -- strongest honest E-2 narrative for this client
  transferable_skills jsonb NOT NULL DEFAULT '[]'::jsonb, -- skills -> management/marginality framing
  numbers_strategy    jsonb NOT NULL DEFAULT '[]'::jsonb, -- which figures to foreground vs which denial risks
  dimension_verdicts  jsonb NOT NULL DEFAULT '{}'::jsonb, -- { dimension: proven|weak|missing|contradicted }
  directives      jsonb NOT NULL DEFAULT '[]'::jsonb,     -- typed tasks for peripheral engines
  doctrine_citations jsonb NOT NULL DEFAULT '[]'::jsonb,  -- KB chunk ids grounding the theory
  certification   jsonb NOT NULL DEFAULT '{}'::jsonb,     -- { phase: { status, verified_at, retries } }
  built_at        timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE case_theory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_theory_select_own" ON case_theory;
DROP POLICY IF EXISTS "case_theory_insert_own" ON case_theory;
DROP POLICY IF EXISTS "case_theory_update_own" ON case_theory;
DROP POLICY IF EXISTS "case_theory_delete_own" ON case_theory;
CREATE POLICY "case_theory_select_own" ON case_theory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "case_theory_insert_own" ON case_theory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "case_theory_update_own" ON case_theory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "case_theory_delete_own" ON case_theory FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS case_theory_user_idx ON case_theory (user_id);
DROP TRIGGER IF EXISTS set_case_theory_updated_at ON case_theory;
CREATE TRIGGER set_case_theory_updated_at
  BEFORE UPDATE ON case_theory FOR EACH ROW EXECUTE FUNCTION cic_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. kb_chunks — Faculty 2 GROUND: embedded full KB corpus (177 docs)
--    Separate from faq_kb_chunks (which holds only the 33-doc FAQ subset).
--    Requires pgvector. Embeddings via text-embedding-3-small (1536 dims).
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file  text NOT NULL,                 -- docs/<filename>.md
  chunk_index  int  NOT NULL,
  content      text NOT NULL,
  content_hash text NOT NULL,                 -- idempotent re-seed: skip unchanged chunks
  dimension    text,                          -- optional tag: source_of_funds|denial|consulate|...
  token_count  int,
  embedding    vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_file, chunk_index)
);

CREATE INDEX IF NOT EXISTS kb_chunks_hash_idx ON kb_chunks (content_hash);
CREATE INDEX IF NOT EXISTS kb_chunks_dimension_idx ON kb_chunks (dimension) WHERE dimension IS NOT NULL;
-- ANN index for cosine similarity retrieval
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- kb_chunks is server-curated reference data (no per-user rows): readable by
-- authenticated users, written only by service role (RLS denies client writes).
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kb_chunks_select_all" ON kb_chunks;
CREATE POLICY "kb_chunks_select_all" ON kb_chunks FOR SELECT USING (auth.role() = 'authenticated');

-- Retrieval RPC: cosine-similarity search, optional dimension filter
CREATE OR REPLACE FUNCTION match_kb(
  query_embedding vector(1536),
  match_count int DEFAULT 6,
  filter_dimension text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_file text,
  content text,
  dimension text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT kc.id, kc.source_file, kc.content, kc.dimension,
         1 - (kc.embedding <=> query_embedding) AS similarity
  FROM kb_chunks kc
  WHERE kc.embedding IS NOT NULL
    AND (filter_dimension IS NULL OR kc.dimension = filter_dimension)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
