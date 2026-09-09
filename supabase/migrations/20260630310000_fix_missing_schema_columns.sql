-- Migration: Add columns referenced in code but confirmed missing from live DB
-- Audit finding F6 (P1) — verified via source + PostgREST probes 2026-06-30
-- Safe: all ADD COLUMN IF NOT EXISTS. Idempotent.

-- 1. quiz_sessions.score_breakdown
--    Used by: src/app/admin/users/[userId]/view/page.tsx:42
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb;

-- 2. quiz_sessions.created_at
--    Used by: src/app/gap-analysis/page.tsx ORDER BY created_at
--    Likely exists already on older rows; add with default for safety.
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3. payments.tier + payments.amount_cents
--    Used by: admin/users, admin/revenue, admin/page, account/export
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS tier_id text;

-- 4. simulator_sessions — columns used in account/export
--    readiness_indicator already added by 20260605180000_simulator_tables.sql
--    Adding the rest for completeness.
ALTER TABLE simulator_sessions
  ADD COLUMN IF NOT EXISTS questions_asked integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answers_given   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coaching_notes  text;

-- 5. applications.journey_wizard_stage
--    Used by: src/components/journey/JourneyWizard.tsx:75
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS journey_wizard_stage text;

-- 6. answers.updated_at
--    Used by: src/app/admin/users/[userId]/view/page.tsx:41
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
