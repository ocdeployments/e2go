-- Pre-generation confirmation log
-- Records what the applicant confirmed before documents were generated,
-- enabling future audit of whether data changed after confirmation.

CREATE TABLE IF NOT EXISTS pre_generation_confirmation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which case brief version this confirmation applies to
  case_brief_generated_at TIMESTAMPTZ,

  -- Investment breakdown as DISPLAYED to the applicant (post any edits)
  shown_breakdown_json JSONB NOT NULL,

  -- Fund sources as DISPLAYED
  shown_fund_sources_json JSONB NOT NULL,

  -- Edits made: [] if none, else [{field, old_value, new_value}]
  edits_made JSONB DEFAULT '[]',

  -- Discrepancy pushback tracking
  discrepancy_prompted BOOLEAN DEFAULT false,
  -- null if discrepancy_prompted=false;
  -- otherwise: 'total_updated' | 're_entered_line_item'
  discrepancy_resolution TEXT,

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: user can only see their own confirmations
ALTER TABLE pre_generation_confirmation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their confirmations"
  ON pre_generation_confirmation FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookup by application
CREATE INDEX IF NOT EXISTS idx_pre_gen_confirmation_app
  ON pre_generation_confirmation(application_id);
