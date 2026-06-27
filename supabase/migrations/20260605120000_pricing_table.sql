-- Create pricing table for Stripe Price IDs
CREATE TABLE IF NOT EXISTS pricing (
  tier_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read pricing" ON pricing
  FOR SELECT USING (true);

-- Admin manage access
CREATE POLICY "Admin manage pricing" ON pricing
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Insert initial pricing tiers (placeholders - update with real Stripe Price IDs)
INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active) VALUES
  ('solo_none', 'Solo Individual', 29700, 'price_solo_placeholder', true),
  ('solo_spouse', 'Solo + Spouse', 34700, 'price_solo_spouse_placeholder', true),
  ('solo_family_small', 'Solo + Family up to 2 kids', 39700, 'price_solo_family_2_placeholder', true),
  ('solo_family_large', 'Solo + Family 3-5 kids', 44700, 'price_solo_family_5_placeholder', true),
  ('partnership_none', 'Partnership', 49700, 'price_partnership_placeholder', true),
  ('partnership_couples', 'Partnership Two Couples', 54700, 'price_partnership_couples_placeholder', true),
  ('partnership_families', 'Partnership Two Full Families', 64700, 'price_partnership_families_placeholder', true)
ON CONFLICT (tier_id) DO NOTHING;