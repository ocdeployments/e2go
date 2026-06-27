-- Email sequence infrastructure
-- Clock 1: Inactivity re-engagement
-- Clock 2: Post-outcome handoff

-- Email log table - tracks all sent emails
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email_type TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  clock_type TEXT CHECK (clock_type IN ('clock1', 'clock2')),
  day_number INTEGER
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own email log"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email log"
  ON email_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update email log"
  ON email_log FOR UPDATE
  USING (true);

-- Scheduled emails table - for Clock 2 delayed sends
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  clock_type TEXT CHECK (clock_type IN ('clock1', 'clock2')),
  day_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scheduled emails"
  ON scheduled_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage scheduled emails"
  ON scheduled_emails FOR ALL
  USING (true);

-- Add last_activity_at to applications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE applications ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add outcome column to applications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'outcome'
  ) THEN
    ALTER TABLE applications ADD COLUMN outcome TEXT CHECK (outcome IN ('approved', 'refused'));
  END IF;
END $$;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_log_application ON email_log(application_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due ON scheduled_emails(scheduled_for, sent) WHERE sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_applications_inactivity ON applications(last_activity_at, payment_status, module_3_complete, outcome);