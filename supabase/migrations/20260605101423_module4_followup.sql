-- Voice profile table
-- generation-engine.ts reads voice_profile_text from this table
CREATE TABLE IF NOT EXISTS applicant_voice_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  voice_sample_raw TEXT NOT NULL,
  voice_profile_text TEXT NOT NULL,
  sentence_length_avg INTEGER,
  vocabulary_level TEXT CHECK (vocabulary_level IN (
    'accessible', 'professional', 'technical', 'mixed'
  )),
  formality_register TEXT CHECK (formality_register IN (
    'formal', 'warm_formal', 'conversational', 'mixed'
  )),
  ai_detection_score DECIMAL(4,3),
  ai_detection_passed BOOLEAN DEFAULT FALSE,
  ai_detection_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id)
);

ALTER TABLE applicant_voice_profile
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their voice profile"
  ON applicant_voice_profile FOR ALL
  USING (auth.uid() = user_id);

-- Follow-up responses table
-- generation-engine.ts reads all rows for an application
CREATE TABLE IF NOT EXISTS followup_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  gap_category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  content_value TEXT CHECK (content_value IN (
    'high', 'medium', 'low', 'none'
  )) DEFAULT 'medium',
  relevant_documents TEXT[] DEFAULT '{}',
  question_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE followup_responses
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their followup responses"
  ON followup_responses FOR ALL
  USING (auth.uid() = user_id);

-- Module 4 lifecycle tracking
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS module4_started_at TIMESTAMPTZ;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS module4_completed_at TIMESTAMPTZ;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS voice_sample_collected
    BOOLEAN DEFAULT FALSE;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS followup_completed
    BOOLEAN DEFAULT FALSE;
