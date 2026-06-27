-- Migration: Add columns referenced in code but missing from DB schema
-- Safe to run multiple times (all IF NOT EXISTS)
-- Identified by smoke test 2026-06-23

-- 1. hard_stop_codes in quiz_sessions
--    Referenced by: src/app/quiz/page.tsx, src/app/gap-analysis/page.tsx
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS hard_stop_codes text[] DEFAULT '{}';

-- 2. investment_amount in applications
--    Referenced by: src/app/gap-analysis/page.tsx, src/app/generate/[applicationId]/page.tsx
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS investment_amount numeric;

-- 3. application_type in applications (belt-and-suspenders — may already exist)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS application_type text;

-- 4. business_category in applications
--    Referenced by: /api/simulator/interview-prep (gap engine scoring)
--    Note: the value is also stored in answers but the route reads from applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS business_category text;

-- 5. principal_name in applications
--    Referenced by: /api/applications/[applicationId], /api/simulator/interview-prep
--    Causes 400 from Supabase → routes return 404
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS principal_name text;

-- 5. operational_status in applications
--    Referenced by: /api/simulator/interview-prep gap engine scoring
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS operational_status text;

-- 6. target_state in applications (US state target for the business)
--    Referenced by: /api/simulator/interview-prep, /api/applications/[applicationId]
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS target_state text;

-- 4. application_lifecycle unique constraint on user_id
--    upsert with on_conflict=user_id requires this unique index
--    Do not add if table doesn't exist or constraint already present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_lifecycle') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'application_lifecycle_user_id_key'
    ) THEN
      ALTER TABLE application_lifecycle ADD CONSTRAINT application_lifecycle_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;
