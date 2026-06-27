-- Sprint 5: Franchise Lead System
-- Creates franchise_brands table with seed data.
-- Also adds unique index on case_profiles(user_id) to enable reliable upserts.

-- 1. Unique index on case_profiles so buildCaseProfile() can upsert cleanly
CREATE UNIQUE INDEX IF NOT EXISTS case_profiles_user_id_idx ON case_profiles (user_id);

-- 2. Franchise brands table
CREATE TABLE IF NOT EXISTS franchise_brands (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT         NOT NULL,
  category       TEXT         NOT NULL,
  min_investment INTEGER      NOT NULL,
  max_investment INTEGER      NOT NULL,
  min_net_worth  INTEGER      NOT NULL,
  description    TEXT,
  website        TEXT,
  active         BOOLEAN      DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE franchise_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franchise_brands: public read"
  ON franchise_brands FOR SELECT
  USING (active = TRUE);

-- 3. Seed: 6 home care brands with proven E-2 track records
INSERT INTO franchise_brands (name, category, min_investment, max_investment, min_net_worth, description, website) VALUES
  ('1Heart Caregiver Services',  'home_care', 80000,  150000, 200000, 'In-home senior care franchise with strong E-2 track record',                         'https://www.1heartcaregiverservices.com'),
  ('Assisting Hands Home Care',  'home_care', 90000,  175000, 250000, 'Non-medical in-home care for seniors and adults with disabilities',                   'https://assistinghands.com'),
  ('BrightSpring Health Services','home_care',120000, 250000, 300000, 'Community-based health and pharmacy solutions',                                        'https://brightspring.com'),
  ('FirstLight Home Care',       'home_care', 100000, 180000, 250000, 'Non-medical home care franchise with flexible territory model',                        'https://firstlighthomecare.com'),
  ('Comfort Keepers',            'home_care', 100000, 200000, 250000, 'Interactive Caregiving approach for seniors aging in place',                            'https://comfortkeepers.com'),
  ('Visiting Angels',            'home_care', 80000,  150000, 200000, 'America''s choice in senior home care, 600+ locations',                               'https://visitingangels.com')
ON CONFLICT DO NOTHING;
