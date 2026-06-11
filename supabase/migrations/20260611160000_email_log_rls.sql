-- Create email_log table if not exists and fix RLS
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy if it exists
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can insert email_log" ON email_log;
  DROP POLICY IF EXISTS "Users can view own email log" ON email_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Restrict inserts to authenticated users (own records only)
CREATE POLICY "Users can insert own email log"
  ON email_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own email log
CREATE POLICY "Users can view own email log"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);
