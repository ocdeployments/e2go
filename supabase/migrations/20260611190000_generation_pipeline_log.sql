-- generation_pipeline_log: audit trail for every pipeline run
-- Each row = one document through all 6 stages + release
-- This table is append-only. Never delete rows.

CREATE TABLE IF NOT EXISTS generation_pipeline_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  pipeline_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Stage 1: Generate
  stage1_completed BOOLEAN,
  stage1_attempts INTEGER,
  stage1_completed_at TIMESTAMPTZ,

  -- Stage 2: Humanize
  stage2_completed BOOLEAN,
  stage2_attempts INTEGER,
  stage2_completed_at TIMESTAMPTZ,

  -- Stage 3: AI Detection Audit
  stage3_completed BOOLEAN,
  stage3_detection_score FLOAT,
  stage3_attempts INTEGER,
  stage3_completed_at TIMESTAMPTZ,

  -- Stage 4: Consistency Check
  stage4_completed BOOLEAN,
  stage4_issues_found INTEGER,
  stage4_completed_at TIMESTAMPTZ,

  -- Stage 5: Quality Gate
  stage5_completed BOOLEAN,
  stage5_legal_violations INTEGER,
  stage5_page_count INTEGER,
  stage5_uniqueness_passed BOOLEAN,
  stage5_completed_at TIMESTAMPTZ,

  -- Stage 6: Metadata Sanitization
  stage6_completed BOOLEAN,
  stage6_metadata_clean BOOLEAN,
  stage6_completed_at TIMESTAMPTZ,

  -- Release
  released_at TIMESTAMPTZ,
  applicant_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,

  final_status TEXT DEFAULT 'PENDING_REVIEW'
    -- RELEASED | PENDING_REVIEW | FAILED | FLAGGED_FOR_REVIEW

  -- No foreign keys — this is an audit log, never deleted
);

-- RLS: users can only read their own application's logs
ALTER TABLE generation_pipeline_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pipeline logs"
  ON generation_pipeline_log
  FOR SELECT
  USING (
    application_id IN (
      SELECT id FROM applications WHERE user_id = auth.uid()
    )
  );

-- Service role can insert/update (pipeline runs server-side)
CREATE POLICY "Service role manages pipeline logs"
  ON generation_pipeline_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups by application
CREATE INDEX IF NOT EXISTS idx_pipeline_log_application
  ON generation_pipeline_log (application_id, document_type);
