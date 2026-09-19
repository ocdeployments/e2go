-- Add full_name to quiz_sessions so the results email can open with a name
-- instead of a generic greeting. Idempotent: safe to re-run.
ALTER TABLE "public"."quiz_sessions"
  ADD COLUMN IF NOT EXISTS "full_name" "text";
