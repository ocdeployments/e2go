-- Phase 1 fix: the previous migration (20260703000000) tried to drop the old
-- 2-column unique constraint on answers(application_id, question_key) by a
-- guessed name, `answers_application_id_question_key_key` (Postgres's
-- default auto-generated name). The actual UAT error names a different,
-- explicitly-chosen constraint, `answers_application_question_unique` — the
-- `answers` table predates migration tracking (created directly in Supabase
-- Studio), so no migration in this repo ever created or dropped that name.
-- The DROP CONSTRAINT IF EXISTS silently no-op'd, leaving the old 2-column
-- constraint live alongside the new 3-column index.
--
-- That alone would only explain cross-person collisions (two family members
-- answering the same question_key). It does not fully explain discrepancy
-- resolution failing for a *single* person: the 20260703000000 migration's
-- own comment about NULL semantics has it backwards. Plain
-- `CREATE UNIQUE INDEX` treats NULLs as *distinct*, meaning (application_id,
-- question_key, NULL) enforces nothing for principal rows AND
-- `ON CONFLICT (application_id, question_key, family_member_id)` never
-- matches an existing NULL-member row — so every principal-scoped upsert
-- (resolving a discrepancy, re-extracting a document) takes the INSERT path,
-- not UPDATE. That INSERT then collides with the still-live old 2-column
-- constraint, producing the exact 23505 on `answers_application_question_unique`
-- from the UAT report.
--
-- Fix has two parts, both required — dropping the stale constraint without
-- adding NULLS NOT DISTINCT would stop the visible error but let principal
-- upserts silently multiply rows instead:
--   1. Find and drop *any* unique constraint or index on answers whose
--      column set is exactly {application_id, question_key}, regardless of
--      its real name (don't guess a second time).
--   2. Recreate the 3-column index as UNIQUE ... NULLS NOT DISTINCT
--      (Postgres 15+, which Supabase runs), so principal rows
--      (family_member_id IS NULL) are correctly deduplicated and upserts
--      against them actually hit the UPDATE path.
DO $$
DECLARE
  stale_name text;
BEGIN
  FOR stale_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.answers'::regclass
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) AS k(attnum)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      ) = ARRAY['application_id', 'question_key']::name[]
  LOOP
    EXECUTE format('ALTER TABLE public.answers DROP CONSTRAINT %I', stale_name);
  END LOOP;

  FOR stale_name IN
    SELECT i.relname
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    WHERE ix.indrelid = 'public.answers'::regclass
      AND ix.indisunique
      AND i.relname != 'answers_application_question_member_key'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(ix.indkey::int2[]) AS k(attnum)
        JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = k.attnum
      ) = ARRAY['application_id', 'question_key']::name[]
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', stale_name);
  END LOOP;
END $$;

-- Recreate the 3-column index with correct NULL handling for principal rows.
DROP INDEX IF EXISTS public.answers_application_question_member_key;

CREATE UNIQUE INDEX answers_application_question_member_key
  ON answers (application_id, question_key, family_member_id) NULLS NOT DISTINCT;
