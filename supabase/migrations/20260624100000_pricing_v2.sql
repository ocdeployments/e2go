-- Sprint A: Replace per-family pricing structure with the new 3-product flat model.
-- App is pre-launch — deactivate old tiers rather than deleting to preserve
-- any FK references from test payment records.

UPDATE pricing
SET active = false
WHERE tier_id IN (
  'solo_none',
  'solo_spouse',
  'solo_family_small',
  'solo_family_large',
  'partnership_none',
  'partnership_couples',
  'partnership_families'
);

-- Insert new tiers. Stripe Price IDs start empty and are filled in via the
-- Stripe dashboard or STRIPE_PRICE_* env vars. The checkout route falls back
-- to env vars when the DB value is empty.
INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active)
VALUES
  ('complete',                  'Complete — Build & Document',       149500, '', true),
  ('interview_prep',             'Interview Prep',                    34700,  '', true),
  ('fdd_intelligence',           'FDD Intelligence',                  57500,  '', true),
  ('fdd_intelligence_loyalty',   'FDD Intelligence (Loyalty)',        37500,  '', true)
ON CONFLICT (tier_id) DO UPDATE SET
  name           = EXCLUDED.name,
  amount         = EXCLUDED.amount,
  active         = EXCLUDED.active;
