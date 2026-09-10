-- Fix: application_lifecycle INSERT/UPDATE policies still carry the same
-- `OR (user_id IS NULL)` bypass that 20260909120000 already removed from the
-- SELECT policy — meaning an unauthenticated anon-key caller could insert or
-- overwrite any row with a null user_id.
--
-- Root cause: 0000_initial_schema.sql created "Users can insert own lifecycle"
-- and "Users can update own lifecycle" with
-- `WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL) OR (is_admin() = true))`
-- (same for UPDATE's USING clause). RLS policies on the same table for the
-- same command are permissive and OR together in Postgres, so these coexist
-- with the already-strict "Users can upsert own application lifecycle" policy
-- (auth.uid() = user_id, no null bypass) rather than being superseded by it.
--
-- Verified every write path in the app before dropping these:
--   - src/app/apply/module1/page.tsx, module2/page.tsx, onboarding/page.tsx,
--     login/page.tsx, and src/hooks/useTrackSectionVisit.ts all write
--     client-side (browser, anon key) but always with a real user_id from
--     supabase.auth.getUser() — never null.
--   - The one client-side write with user_id: null in the app
--     (src/app/quiz/page.tsx:786) targets quiz_sessions, a different table.
-- So no legitimate insert or update depends on the null bypass, and the
-- existing "Users can upsert own application lifecycle" policy already
-- covers every real write with the correct, strict check.

DROP POLICY IF EXISTS "Users can insert own lifecycle" ON "public"."application_lifecycle";
DROP POLICY IF EXISTS "Users can update own lifecycle" ON "public"."application_lifecycle";
