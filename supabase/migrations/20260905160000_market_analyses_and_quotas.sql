-- Market Analysis had no per-run history: each run overwrote the same rows
-- in `answers` via upsert, so there was nothing to count against a package
-- quota (Investor Ready: 3 included, Visa Ready: 6 included). This table
-- gives every run its own row, which doubles as the quota-counting source
-- and as history the product never had before.
--
-- Also adds the "purchased" counters for FDD and Market analyses, mirroring
-- the existing applications.simulator_sessions_purchased pattern: NULL means
-- "use the tier default" (resolved in code), and an add-on purchase adds to
-- whatever the tier default already was.

CREATE TABLE IF NOT EXISTS market_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  business_name TEXT NOT NULL,
  business_category TEXT NOT NULL,
  target_zip TEXT NOT NULL,
  target_state TEXT NOT NULL,

  overall_score INTEGER,
  overall_rating TEXT,
  population INTEGER,
  competitor_count INTEGER,
  population_per_competitor NUMERIC,
  verdict TEXT,

  -- Full TerritoryAnalysis payload, for audit/history and to avoid
  -- re-deriving the report if it's ever surfaced back to the user.
  raw_analysis JSONB
);

ALTER TABLE market_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_market_analyses"
  ON market_analyses FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS market_analyses_user_id_idx ON market_analyses (user_id);
CREATE INDEX IF NOT EXISTS market_analyses_application_id_idx ON market_analyses (application_id) WHERE application_id IS NOT NULL;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS fdd_analyses_purchased INTEGER,
  ADD COLUMN IF NOT EXISTS market_analyses_purchased INTEGER;
