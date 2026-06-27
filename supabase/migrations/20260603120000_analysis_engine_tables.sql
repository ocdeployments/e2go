-- Case Brief storage
CREATE TABLE IF NOT EXISTS case_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Scores
  substantiality_score TEXT,
  fund_source_score TEXT,
  experience_score TEXT,
  marginality_income_score TEXT,
  marginality_contribution_score TEXT,
  intent_score TEXT,
  executive_role_score TEXT,
  ownership_control_score TEXT,

  -- Denial risk assessments D-01 through D-15
  denial_risks JSONB,

  -- KB validation results
  kb_validation JSONB,

  -- Framing decisions
  framing_decisions JSONB,

  -- Raw Case Brief
  case_brief_json JSONB,

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'complete', 'failed'))
);

-- Enable RLS
ALTER TABLE case_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their case briefs"
  ON case_briefs FOR ALL
  USING (auth.uid() = user_id);

-- Generation log
CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  model_used TEXT,
  model_locked_at TIMESTAMPTZ,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 15,
  status TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'running', 'paused',
      'interrupted', 'complete', 'failed'
    )),
  completed_steps JSONB DEFAULT '[]',
  failed_step INTEGER,
  error_log JSONB DEFAULT '[]'
);

ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their generation logs"
  ON generation_logs FOR ALL
  USING (auth.uid() = user_id);
