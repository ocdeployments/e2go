-- FDD Intelligence — fdd_analyses table
-- Sprint: FDD-1 — Extraction Pipeline

CREATE TABLE IF NOT EXISTS fdd_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Intake fields (collected before upload)
  transaction_type TEXT CHECK (transaction_type IN ('new_unit', 'resale', 'multi_unit_development')),
  target_city TEXT,
  target_state TEXT,
  target_zip TEXT,
  investor_liquid_capital INTEGER,
  investor_net_worth INTEGER,

  -- Uploaded file
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER,
  page_count INTEGER,

  -- Extraction pipeline state
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracting', 'extracted', 'failed')),
  extraction_error TEXT,
  extraction_progress INTEGER DEFAULT 0,  -- 0-100

  -- Extracted data (JSONB — all 50 fields with _page/_quote/_conf sub-keys)
  extracted_fields JSONB,

  -- Computed outputs (populated by later sprints)
  e2_score JSONB,             -- FDD-2
  territory_analysis JSONB,   -- FDD-3
  profile_match JSONB,        -- FDD-4
  questions JSONB,            -- FDD-4
  final_report JSONB,         -- FDD-5

  -- Summary flags (denormalized for fast teaser queries)
  fdd_stale BOOLEAN,
  fdd_age_months INTEGER,
  state_registration_status TEXT CHECK (state_registration_status IN ('pass', 'warn', 'fail', 'unknown')),
  flag_count INTEGER DEFAULT 0,
  overall_compatibility TEXT CHECK (overall_compatibility IN ('STRONG', 'VIABLE', 'CAUTION', 'INELIGIBLE'))
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_fdd_analyses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fdd_analyses_updated_at
  BEFORE UPDATE ON fdd_analyses
  FOR EACH ROW EXECUTE FUNCTION update_fdd_analyses_updated_at();

-- Multi-FDD comparison table
CREATE TABLE IF NOT EXISTS fdd_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fdd_analysis_ids UUID[] NOT NULL,
  comparison_output JSONB
);

-- RLS
ALTER TABLE fdd_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdd_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_fdd_analyses"
  ON fdd_analyses FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users_own_fdd_comparisons"
  ON fdd_comparisons FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS fdd_analyses_user_id_idx ON fdd_analyses (user_id);
CREATE INDEX IF NOT EXISTS fdd_analyses_application_id_idx ON fdd_analyses (application_id) WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fdd_analyses_status_idx ON fdd_analyses (extraction_status);
