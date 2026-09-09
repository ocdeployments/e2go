-- FDD Intelligence Report access gate
-- Adds report_unlocked flag to fdd_analyses so the paywall can check access without a separate payments query.
-- Also registers fdd_intelligence in the pricing table so the checkout route can resolve the price ID.

ALTER TABLE fdd_analyses
  ADD COLUMN IF NOT EXISTS report_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Insert fdd_intelligence pricing row — price ID will be set by STRIPE_PRICE_FDD_INTELLIGENCE env var.
-- Use INSERT ON CONFLICT so this is idempotent.
INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active)
VALUES (
  'fdd_intelligence',
  'FDD Intelligence Report',
  29700,
  'price_1TkdlNF7Ggk3LUEy4mmw2B7P',
  true
)
ON CONFLICT (tier_id) DO UPDATE
  SET stripe_price_id = EXCLUDED.stripe_price_id,
      amount          = EXCLUDED.amount,
      active          = true;
