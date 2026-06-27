-- Generation job tracker
CREATE TABLE IF NOT EXISTS document_generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'partial')),
  current_step INTEGER DEFAULT 0,
  current_step_label TEXT,
  total_steps INTEGER DEFAULT 15,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-document status within a job
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES document_generation_jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating', 'under_review', 'approved', 'locked', 'failed')),
  content_json JSONB,
  content_text TEXT,
  word_count INTEGER,
  page_estimate INTEGER,
  revision_count INTEGER DEFAULT 0,
  revision_notes JSONB DEFAULT '[]',
  ai_detection_score NUMERIC,
  ai_detection_passed BOOLEAN,
  quality_gate_passed BOOLEAN,
  quality_gate_notes JSONB DEFAULT '[]',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Revision credits
CREATE TABLE IF NOT EXISTS revision_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  credits_remaining INTEGER DEFAULT 10,
  credits_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change log
CREATE TABLE IF NOT EXISTS document_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES generated_documents(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT CHECK (change_type IN ('wording', 'additional_info', 'factual_correction')),
  change_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generation audit log
CREATE TABLE IF NOT EXISTS document_generation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  ai_detection_score NUMERIC,
  passed BOOLEAN,
  flagged_sections JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: all tables — user_id = auth.uid() only
ALTER TABLE document_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own jobs" ON document_generation_jobs
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own documents" ON generated_documents
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own credits" ON revision_credits
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own change log" ON document_change_log
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own gen log" ON document_generation_log
  FOR ALL USING (user_id = auth.uid());