-- Outcome Capture Module Schema
-- Adds outcome tracking columns to applications and interview question reporting

-- Add outcome columns to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('approved', 'refused', 'administrative_processing', '221g_document_request', 'withdrawn', 'unknown')),
  ADD COLUMN IF NOT EXISTS outcome_date DATE,
  ADD COLUMN IF NOT EXISTS interview_duration TEXT,
  ADD COLUMN IF NOT EXISTS denial_reason TEXT,
  ADD COLUMN IF NOT EXISTS visa_received_date DATE,
  ADD COLUMN IF NOT EXISTS spouse_approved TEXT CHECK (spouse_approved IN ('yes', 'no', 'not_applicable', 'unknown')),
  ADD COLUMN IF NOT EXISTS children_approved_count INTEGER,
  ADD COLUMN IF NOT EXISTS outcome_recorded_at TIMESTAMPTZ;

-- Create interview_questions_reported table
CREATE TABLE IF NOT EXISTS interview_questions_reported (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  was_asked BOOLEAN DEFAULT true,
  was_surprising BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE interview_questions_reported ENABLE ROW LEVEL SECURITY;

-- Create policy: Users own their reports
CREATE POLICY "Users own their interview reports"
  ON interview_questions_reported FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM applications
      WHERE id = application_id
    )
  );

-- Add 221(g) specific columns if needed
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS received_221g_form BOOLEAN,
  ADD COLUMN IF NOT EXISTS documents_requested TEXT,
  ADD COLUMN IF NOT EXISTS administrative_notes TEXT;

-- Add application_lifecycle columns for outcome tracking
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS outcome_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_check_in_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_application
  ON interview_questions_reported(application_id);

CREATE INDEX IF NOT EXISTS idx_applications_outcome
  ON applications(outcome) WHERE outcome IS NOT NULL;