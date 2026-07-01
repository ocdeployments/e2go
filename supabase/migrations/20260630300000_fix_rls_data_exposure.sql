-- Migration: Fix P0/P1 RLS data exposure on quiz_sessions + application_lifecycle
-- Audit findings F20 (P0) and F21 (P1): both tables readable by unauthenticated anon key
-- Run: supabase db push (or apply in Supabase dashboard)

-- ─── F20: quiz_sessions ──────────────────────────────────────────────────────
-- RLS is already ENABLED (migration 20260611150000 applied it).
-- Add a SELECT policy scoped to the caller's own session.
-- Anonymous users get no rows; authenticated users get their own linked sessions
-- plus any unlinked session whose email matches theirs (needed for post-login linking).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can read own quiz sessions'
    AND tablename = 'quiz_sessions'
  ) THEN
    CREATE POLICY "Users can read own quiz sessions"
      ON quiz_sessions FOR SELECT
      USING (
        auth.uid() = user_id
        OR (user_id IS NULL AND email = (auth.jwt() ->> 'email'))
      );
  END IF;
END $$;

-- ─── F21: application_lifecycle ──────────────────────────────────────────────
-- RLS was never enabled on this table. Enable it now and restrict reads to own rows.
-- All server-side writes use the service-role client (bypasses RLS — no breakage).

ALTER TABLE application_lifecycle ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can read own application lifecycle'
    AND tablename = 'application_lifecycle'
  ) THEN
    CREATE POLICY "Users can read own application lifecycle"
      ON application_lifecycle FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can upsert own application lifecycle'
    AND tablename = 'application_lifecycle'
  ) THEN
    CREATE POLICY "Users can upsert own application lifecycle"
      ON application_lifecycle FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
