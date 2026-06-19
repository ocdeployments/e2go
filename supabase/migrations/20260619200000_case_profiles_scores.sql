-- EU-1: Expand case_profiles with dimension scores and completeness tracking
-- Adds five columns that buildCaseProfile() now computes from answers + documents + simulator data.

ALTER TABLE case_profiles
  ADD COLUMN IF NOT EXISTS completeness_score  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_state          TEXT    DEFAULT 'quiz_only',
  ADD COLUMN IF NOT EXISTS source_of_funds_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS management_role_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_plan_score   INTEGER DEFAULT 0;
