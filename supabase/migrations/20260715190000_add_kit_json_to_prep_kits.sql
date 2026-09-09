-- interview_prep_kits already existed (an earlier quiz-questions table with
-- columns quiz_session_id/questions), so the CREATE TABLE IF NOT EXISTS in
-- 20260627100000_interview_prep_kits.sql silently no-opped and never added
-- kit_json/model_used. This was misdiagnosed as a PostgREST schema-cache
-- staleness issue (PGRST204) — the column never existed at all. Table is
-- empty (0 rows), so this is a safe additive/destructive cleanup.
ALTER TABLE interview_prep_kits
  ADD COLUMN IF NOT EXISTS kit_json jsonb,
  ADD COLUMN IF NOT EXISTS model_used text NOT NULL DEFAULT 'xiaomi/mimo-v2.5-pro';

ALTER TABLE interview_prep_kits
  DROP COLUMN IF EXISTS quiz_session_id,
  DROP COLUMN IF EXISTS questions,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE interview_prep_kits
  ALTER COLUMN kit_json SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'interview_prep_kits'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE interview_prep_kits ADD CONSTRAINT interview_prep_kits_application_id_key UNIQUE (application_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
