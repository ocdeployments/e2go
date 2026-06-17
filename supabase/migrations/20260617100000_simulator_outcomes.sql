-- Simulator outcome capture: records interview result at +2 weeks
-- Linked to simulator_sessions; optional link to application

CREATE TABLE IF NOT EXISTS simulator_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  simulator_session_id UUID REFERENCES simulator_sessions(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'denied', 'pending', 'cancelled', 'rescheduled')),
  interview_date DATE,
  consulate TEXT,
  denial_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only see their own outcomes
ALTER TABLE simulator_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own outcomes"
  ON simulator_outcomes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_simulator_outcomes_user_id ON simulator_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_simulator_outcomes_application_id ON simulator_outcomes(application_id);
