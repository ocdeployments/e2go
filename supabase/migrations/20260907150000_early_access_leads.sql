-- Early-access lead capture — public form posted to Facebook groups etc.
-- collecting prospective clients before they create an account.
--
-- Service-role only (public submit route + admin listing page), same
-- pattern as promo_codes: RLS enabled, no policies.

CREATE TABLE IF NOT EXISTS early_access_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  filing_timeline TEXT NOT NULL CHECK (filing_timeline IN ('asap', '1_3_months', '3_6_months', '6_12_months', 'exploring')),
  source TEXT NOT NULL DEFAULT 'facebook_group',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One lead per email — a repeat submission updates the existing row
-- (upsert in the API route, which lowercases email first) rather than
-- creating a duplicate. A plain unique index on the column (not an
-- expression index on lower(email)) so Postgres can match it as an
-- ON CONFLICT (email) target.
CREATE UNIQUE INDEX IF NOT EXISTS early_access_leads_email_key ON early_access_leads (email);
CREATE INDEX IF NOT EXISTS early_access_leads_created_at_idx ON early_access_leads (created_at DESC);

ALTER TABLE early_access_leads ENABLE ROW LEVEL SECURITY;
-- No policies: only ever touched via the service-role key
-- (public submit API route + admin page), same as payments/applications.
