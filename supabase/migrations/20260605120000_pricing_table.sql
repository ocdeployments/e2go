-- Create pricing table for Stripe Price IDs
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,  -- 'solo_none', 'solo_spouse', etc.
  name TEXT,
  amount INTEGER,       -- in cents
  stripe_price_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial pricing tiers
INSERT INTO pricing (id, name, amount, stripe_price_id, active) VALUES
  ('solo_none', 'Solo Individual', 29700, NULL, true),
  ('solo_spouse', 'Solo + Spouse', 34700, NULL, true),
  ('solo_family_small', 'Solo + Family (up to 2 kids)', 39700, NULL, true),
  ('solo_family_large', 'Solo + Family (3-5 kids)', 44700, NULL, true),
  ('partnership_none', 'Partnership (no families)', 49700, NULL, true),
  ('partnership_couples', 'Partnership Two Couples', 54700, NULL, true),
  ('partnership_families', 'Partnership Two Full Families', 64700, NULL, true)
ON CONFLICT (id) DO NOTHING;