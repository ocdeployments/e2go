-- DR-18 / renewal launch-scope decision (2026-09-11): partnership applications
-- and renewals are both paused at launch ("Coming Soon"). This table captures
-- interest from logged-in users who hit either Coming Soon state, so Romy can
-- gauge demand and manually reach out / unlock access rather than losing the
-- lead. Mirrors the early_access_leads pattern (service-role only, RLS with
-- no policies) but keyed to an authenticated user_id instead of a public form.
CREATE TABLE IF NOT EXISTS coming_soon_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('partnership', 'renewal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coming_soon_interest_user_type_idx
  ON coming_soon_interest (user_id, interest_type);

CREATE INDEX IF NOT EXISTS coming_soon_interest_created_at_idx
  ON coming_soon_interest (created_at DESC);

ALTER TABLE coming_soon_interest ENABLE ROW LEVEL SECURITY;
-- No policies: service-role (API route + admin page) only, same as early_access_leads.
