-- Franchise funnel tracking + login events
-- Fixes: broker_requests and broker_referrals were being silently dropped (no migration existed)
-- Adds:  franchise_brand_views for per-brand click intelligence
-- Adds:  login_events for daily active user tracking in admin

-- ─── broker_requests ─────────────────────────────────────────────────────────
-- Written by /api/franchise/broker-request when user submits from /franchise/matches
CREATE TABLE IF NOT EXISTS broker_requests (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text        NOT NULL,
  user_name       text,
  match_categories text[]     DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending',
  requested_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE broker_requests ENABLE ROW LEVEL SECURITY;
-- Service role only (admin reads via service client)

-- ─── broker_referrals ────────────────────────────────────────────────────────
-- Written by /franchise/connect when user submits consent form
CREATE TABLE IF NOT EXISTS broker_referrals (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id  uuid,
  packet          jsonb,      -- { name, email, investmentRange, citizenship, targetState }
  consent_text    text,
  consent_at      timestamptz,
  status          text        NOT NULL DEFAULT 'sent',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE broker_referrals ENABLE ROW LEVEL SECURITY;
-- Service role only

-- ─── franchise_brand_views ───────────────────────────────────────────────────
-- Written by /api/franchise/brand-view on every /franchise/brand/[slug] visit
CREATE TABLE IF NOT EXISTS franchise_brand_views (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_slug text        NOT NULL,
  brand_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE franchise_brand_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_franchise_brand_views_slug ON franchise_brand_views (brand_slug);
CREATE INDEX IF NOT EXISTS idx_franchise_brand_views_created_at ON franchise_brand_views (created_at DESC);
-- Service role only

-- ─── login_events ────────────────────────────────────────────────────────────
-- Written by /auth/callback (OAuth/magic-link) and /api/track/session (password)
-- Geo fields populated from Vercel edge headers — zero external API cost
CREATE TABLE IF NOT EXISTS login_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  country     text,        -- ISO 3166-1 alpha-2: "CA", "GB", "US"
  country_name text,       -- "Canada", "United Kingdom"
  city        text,        -- "Toronto", "London", "Vancouver"
  region      text,        -- province/state code: "ON", "BC", "ENG"
  login_type  text,        -- "oauth", "password", "magic_link"
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user_id    ON login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_country    ON login_events (country);
-- Service role only
