-- Storage for the marketing consent collected during onboarding.
--
-- Onboarding and Module 1 have both been writing casl_marketing_consent to
-- profiles since they shipped, but the column was never created. supabase-js
-- returns the error rather than throwing it, and neither call site read it, so
-- every answer was discarded in silence. Adding the column is the whole fix on
-- the storage side; the two writes already do the right thing.
--
-- Nullable on purpose. Onboarding offers a genuine three-state answer — yes,
-- no, and not asked yet — and NULL has to stay distinguishable from FALSE:
-- only TRUE is consent, but "never asked" is not the same as "declined" and
-- should not be recorded as one.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS casl_marketing_consent boolean;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS casl_marketing_consent_at timestamptz;

-- Supports the nurture scheduler's per-session consent lookup.
CREATE INDEX IF NOT EXISTS idx_profiles_casl_marketing_consent
  ON profiles (id)
  WHERE casl_marketing_consent = TRUE;
