-- DR-20 (delivery test matrix): synthetic partnership-cell fixtures insert a
-- `payments` row directly (no real Stripe checkout) so the app's isPartnership
-- gating logic has a real completed payment to read. Dev and prod share one
-- Supabase project, so this column lets the three production-facing readers
-- (health-watchdog's paid-user check, admin/revenue, payment-reconciliation)
-- exclude fixture rows without touching the gating logic itself.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS is_test_fixture boolean NOT NULL DEFAULT false;
