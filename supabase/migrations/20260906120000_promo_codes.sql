-- Promo code system: shared (campaign) codes and personal (per-recipient) codes,
-- both redeemable at most once per registered account via a partial unique index
-- on promo_redemptions(promo_code_id, user_id) that only blocks 'pending' and
-- 'completed' rows — an 'expired' row (an abandoned checkout) does not block a
-- retry with the same code. A 'completed' redemption is intentionally never
-- reverted on refund, so a buy-with-code -> refund -> re-redeem loop is not
-- possible; see the webhook's charge.refunded handler.

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  code_type TEXT NOT NULL CHECK (code_type IN ('shared', 'personal')),
  -- personal codes only: the one registered email allowed to redeem this code
  assigned_email TEXT,
  discount_percent INT NOT NULL CHECK (discount_percent IN (25, 50, 75, 100)),
  -- NULL = valid for any tier the checkout routes accept; otherwise an allowlist
  applicable_tiers TEXT[],
  -- NULL = unlimited (still one-per-account via promo_redemptions); shared
  -- campaign codes typically cap this
  max_redemptions INT,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_personal_needs_email
    CHECK (code_type != 'personal' OR assigned_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  application_id UUID,
  stripe_session_id TEXT NOT NULL,
  discount_percent_applied INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- The core abuse-prevention guarantee: at most one live (pending or completed)
-- redemption per (code, account). Reservation is INSERT-first against this
-- index, mirroring processed_webhook_events' idempotency pattern — no
-- SELECT-then-INSERT race.
CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_one_active_per_account
  ON promo_redemptions (promo_code_id, user_id)
  WHERE status IN ('pending', 'completed');

CREATE INDEX IF NOT EXISTS promo_redemptions_by_session
  ON promo_redemptions (stripe_session_id);

-- Atomically enforce max_redemptions at INSERT time. Locks the promo_codes row
-- first so concurrent reservations for the same shared code serialize instead
-- of racing past the cap.
CREATE OR REPLACE FUNCTION enforce_promo_code_max_redemptions()
RETURNS TRIGGER AS $$
DECLARE
  v_max INT;
  v_count INT;
BEGIN
  SELECT max_redemptions INTO v_max FROM promo_codes WHERE id = NEW.promo_code_id FOR UPDATE;

  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM promo_redemptions
      WHERE promo_code_id = NEW.promo_code_id AND status IN ('pending', 'completed');

    IF v_count >= v_max THEN
      RAISE EXCEPTION 'promo_code_max_redemptions_exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_promo_max_redemptions ON promo_redemptions;
CREATE TRIGGER trg_enforce_promo_max_redemptions
  BEFORE INSERT ON promo_redemptions
  FOR EACH ROW EXECUTE FUNCTION enforce_promo_code_max_redemptions();

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
-- No policies: both tables are only ever touched via the service-role key
-- (server routes + webhook), same as payments/applications.
