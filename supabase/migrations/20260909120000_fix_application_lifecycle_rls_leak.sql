-- Fix: application_lifecycle rows with a null user_id are readable by anyone,
-- including unauthenticated requests using only the public anon key.
--
-- Root cause: 0000_initial_schema.sql created "Users can view own lifecycle"
-- with `USING ((auth.uid() = user_id) OR (user_id IS NULL) OR (is_admin() = true))`.
-- The later F21 fix (20260630300000_fix_rls_data_exposure.sql) added a properly
-- scoped "Users can read own application lifecycle" policy, but RLS policies on
-- the same table are permissive and OR together in Postgres — adding a stricter
-- policy does not override a more permissive one that still exists. The original
-- `OR (user_id IS NULL)` clause kept unconditionally exposing every row with a
-- null user_id (e.g. pre-signup/anonymous quiz journeys) to any caller, logged
-- in or not. Confirmed live in production 2026-09-09 via an unauthenticated
-- anon-key request that returned a row.
--
-- Fix: drop the legacy permissive policy. "Users can read own application
-- lifecycle" (auth.uid() = user_id, no null bypass) remains and is sufficient —
-- all server-side writes to this table use the service-role client, which
-- bypasses RLS entirely, so no legitimate read path needs the null bypass.

DROP POLICY IF EXISTS "Users can view own lifecycle" ON "public"."application_lifecycle";
