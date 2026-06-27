-- Interview Simulator tables
-- Created: June 5, 2026

-- Simulator sessions tracking
CREATE TABLE IF NOT EXISTS simulator_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  session_number INTEGER NOT NULL,
  mode TEXT CHECK (mode IN ('text', 'voice')) DEFAULT 'text',
  readiness_indicator TEXT CHECK (readiness_indicator IN ('ready', 'nearly_ready', 'needs_work')),
  questions_asked INTEGER DEFAULT 0,
  strong_count INTEGER DEFAULT 0,
  needs_work_count INTEGER DEFAULT 0,
  inconsistency_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual answers within a session
CREATE TABLE IF NOT EXISTS simulator_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES simulator_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  answer_audio_url TEXT,
  rating TEXT CHECK (rating IN ('strong', 'weak', 'inconsistent')),
  feedback TEXT,
  specific_suggestion TEXT,
  document_reference TEXT,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Add session tracking columns to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS simulator_sessions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS simulator_sessions_purchased INTEGER DEFAULT 2;

-- Enable RLS
ALTER TABLE simulator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulator_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their simulator sessions"
  ON simulator_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their simulator answers"
  ON simulator_answers FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM simulator_sessions
      WHERE id = session_id
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulator_sessions_application
  ON simulator_sessions(application_id);

CREATE INDEX IF NOT EXISTS idx_simulator_answers_session
  ON simulator_answers(session_id);