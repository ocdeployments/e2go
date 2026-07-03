-- Partner access tokens
-- Allows interview_prep_partnership buyers to grant Interview Prep access to their business partner.
-- The partner receives an email with a one-time accept link; on acceptance a payments record is created.

CREATE TABLE IF NOT EXISTS partner_access_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL,
  partner_email   text NOT NULL,
  tier_id         text NOT NULL DEFAULT 'interview_prep_partnership',
  token           uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  used_at         timestamptz,
  used_by_user_id uuid,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pat_created_by    ON partner_access_tokens(created_by_user_id);
CREATE INDEX IF NOT EXISTS pat_token         ON partner_access_tokens(token);
CREATE INDEX IF NOT EXISTS pat_partner_email ON partner_access_tokens(partner_email);

ALTER TABLE partner_access_tokens ENABLE ROW LEVEL SECURITY;

-- Buyers can read their own outgoing invitations
CREATE POLICY "Buyers see own invitations"
  ON partner_access_tokens FOR SELECT
  USING (created_by_user_id = auth.uid());
