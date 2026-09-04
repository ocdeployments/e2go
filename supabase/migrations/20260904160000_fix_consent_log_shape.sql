-- Reconcile consent_log with the shape the application has always written.
--
-- The table in production predates 20260605150000_module1_consent_tables.sql
-- and holds a different design: tos_version + action, both NOT NULL with no
-- default. That migration declared consent_log with consent_type +
-- consent_given, but CREATE TABLE IF NOT EXISTS found a table already there
-- and did nothing, so the two shapes have sat side by side ever since.
--
-- Every writer targets the declared shape, so every insert fails twice over:
-- the columns it names do not exist, and the two NOT NULL columns it cannot
-- know about are never supplied. The table has 0 rows, which is the proof.
--
-- Terms-of-Service acceptance itself is safe — that is recorded in
-- terms_acceptance, which is separate and working. What has been lost is the
-- per-consent audit trail: privacy policy acceptance from Module 1, and the
-- record of which consent was given when.
--
-- Additive and non-destructive. The table is empty, so nothing migrates; the
-- vestigial columns stay, merely no longer mandatory, rather than being
-- dropped on the assumption that whatever created them is gone for good.

ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS consent_type  text;
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS consent_given boolean;
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS created_at    timestamptz DEFAULT now();

-- These block every insert the application makes. Unused by any code path.
ALTER TABLE consent_log ALTER COLUMN tos_version DROP NOT NULL;
ALTER TABLE consent_log ALTER COLUMN action      DROP NOT NULL;

-- Supports the data-subject export, which reads a user's consents newest first.
CREATE INDEX IF NOT EXISTS idx_consent_log_user_created
  ON consent_log (user_id, created_at DESC);

-- Stated again here because the earlier migration's policies were written for
-- a table it did not create, and the live table's RLS state cannot be assumed.
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own consent logs"   ON consent_log;
DROP POLICY IF EXISTS "Users can insert their own consent logs" ON consent_log;

CREATE POLICY "Users can view their own consent logs"
  ON consent_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent logs"
  ON consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);
