-- Terms of Service acceptance tracking
-- Records permanent proof that a user accepted a specific version of the Terms

CREATE TABLE IF NOT EXISTS terms_acceptance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE(user_id, terms_version)
);

-- RLS: users can read their own acceptance record
-- only service role can insert (called from API route)
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptance"
  ON terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

-- No user-facing INSERT policy — inserts happen via
-- API route using service role key server-side only
