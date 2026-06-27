-- Placeholder for partnership Complete pricing.
-- Inserted as inactive — activate (and set amount + stripe_price_id) once the price is decided.

INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active)
VALUES ('complete_partnership', 'Complete — Partnership', 0, '', false)
ON CONFLICT (tier_id) DO NOTHING;
