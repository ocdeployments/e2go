-- Sprint 2: Post-Quiz Intelligence Capture
-- Adds profile columns to quiz_sessions and creates case_profiles stub table.

-- 1. Extend quiz_sessions with post-quiz intelligence columns
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS post_quiz_profile JSONB,
  ADD COLUMN IF NOT EXISTS franchise_triggered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archetype TEXT;

-- 2. Case profiles stub — populated by Sprint 3 buildCaseProfile()
CREATE TABLE IF NOT EXISTS case_profiles (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id       UUID,
  quiz_session_id      UUID,
  archetype            TEXT,
  eligibility_score    INTEGER,
  franchise_match_score INTEGER,
  franchise_triggered  BOOLEAN      DEFAULT FALSE,
  profile_data         JSONB        DEFAULT '{}',
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. RLS on case_profiles
ALTER TABLE case_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_profiles: users see own"
  ON case_profiles FOR ALL
  USING (auth.uid() = user_id);
