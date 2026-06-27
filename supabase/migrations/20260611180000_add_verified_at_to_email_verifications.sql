-- Add verified_at column to email_verifications for tracking when
-- a user clicked the verification link (distinct from used_at which
-- tracks when the token was consumed for account creation).

ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
