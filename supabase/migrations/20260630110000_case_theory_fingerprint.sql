-- Add source_fingerprint to case_theory so generateCaseTheory() can skip regeneration
-- when the underlying case_model facts haven't changed since the last build.
ALTER TABLE case_theory ADD COLUMN IF NOT EXISTS source_fingerprint text;
