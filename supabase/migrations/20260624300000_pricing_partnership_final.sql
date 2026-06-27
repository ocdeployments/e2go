-- Activate complete_partnership at $2,495 and add interview_prep_partnership at $495.

UPDATE pricing
SET amount = 249500, active = true
WHERE tier_id = 'complete_partnership';

INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active)
VALUES ('interview_prep_partnership', 'Interview Prep — Partnership', 49500, '', true)
ON CONFLICT (tier_id) DO UPDATE SET
  name   = EXCLUDED.name,
  amount = EXCLUDED.amount,
  active = EXCLUDED.active;
