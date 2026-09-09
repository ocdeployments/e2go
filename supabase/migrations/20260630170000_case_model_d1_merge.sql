-- D1 — Merge case_profiles into case_model (phase 1: additive)
--
-- Adds the denormalized quick-access columns that case_profiles held
-- directly onto case_model, so the CIC's assembleCaseModel() becomes the
-- single writer. A backward-compat sync keeps case_profiles populated for
-- the ~14 existing readers during the transition; those readers will be
-- migrated to query case_model in a follow-on sprint.
--
-- Phase 2 (follow-on): drop the backward-compat sync + case_profiles
-- once all readers are confirmed migrated.

ALTER TABLE case_model
  ADD COLUMN IF NOT EXISTS archetype              text,
  ADD COLUMN IF NOT EXISTS eligibility_score      int,
  ADD COLUMN IF NOT EXISTS source_of_funds_score  int,
  ADD COLUMN IF NOT EXISTS management_role_score  int,
  ADD COLUMN IF NOT EXISTS business_plan_score    int,
  ADD COLUMN IF NOT EXISTS franchise_triggered    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completeness_score     int;

-- Index for the most common lookup pattern (dashboard + FDD + simulator)
CREATE INDEX IF NOT EXISTS case_model_archetype_idx ON case_model (archetype) WHERE archetype IS NOT NULL;
