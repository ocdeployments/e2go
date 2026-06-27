-- OPS-3: Admin Command Center — every admin action logged for compliance.
-- Required for immigration document platform regulatory audit trail.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  admin_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text        NOT NULL,   -- e.g. 'tier_override', 'view_user', 'force_fail_job'
  target_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resource        text,                   -- e.g. 'payments', 'document_generation_jobs'
  resource_id     text,                   -- the affected row ID
  details         jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at  ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin        ON admin_audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target       ON admin_audit_log (target_user_id);

-- Add kill_switch and maintenance_mode to app_settings (used by callLLM and middleware)
INSERT INTO app_settings (key, value) VALUES
  ('kill_switch_enabled', 'false'),
  ('maintenance_mode',    'false'),
  ('kill_switch_message', 'AI features are temporarily unavailable. Please try again shortly.')
ON CONFLICT (key) DO NOTHING;
