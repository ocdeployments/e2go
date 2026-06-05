-- Payments table for Stripe integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_price_id TEXT NOT NULL,
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN (
    'pending', 'completed', 'refunded', 'failed', 'expired'
  )) DEFAULT 'pending',
  payment_type TEXT NOT NULL,
  refund_eligible BOOLEAN DEFAULT TRUE,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their payments"
  ON payments FOR ALL
  USING (auth.uid() = user_id);

-- Add payment columns to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

-- Add payment completed timestamp to lifecycle
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;
