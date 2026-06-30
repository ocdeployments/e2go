-- CIC-P.5: store the change impact report on case_theory.
-- Computed after each buildCaseIntelligence run triggered by a new document upload.
-- The UI reads this to show the client which generated documents need regeneration.
ALTER TABLE case_theory
  ADD COLUMN IF NOT EXISTS impact_report jsonb;
