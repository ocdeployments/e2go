CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  quiz_session_id UUID REFERENCES quiz_sessions(id),
  outcome TEXT NOT NULL,
  result_json JSONB NOT NULL,
  franchise_interest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours',
  used_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_email_verifications_token
  ON email_verifications(token);
CREATE INDEX idx_email_verifications_email
  ON email_verifications(email);

ALTER TABLE email_verifications
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON email_verifications
  USING (false);

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS
  franchise_interest BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS
  franchise_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS
  franchise_consent_timestamp TIMESTAMPTZ;
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS
  email_verification_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS
  email_verified BOOLEAN DEFAULT FALSE;
