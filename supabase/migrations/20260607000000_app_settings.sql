-- Migration: Create app_settings table for configurable generation model
-- Created: 2026-06-07

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Public read settings" ON app_settings
  FOR SELECT USING (true);

-- Admin-only write access (would need auth.role = 'admin' in production)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings'
    AND policyname = 'Admin write settings'
  ) THEN
    CREATE POLICY "Admin write settings" ON app_settings
      FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- Insert default generation model settings
INSERT INTO app_settings (key, value, description) VALUES
  ('generation_model', 'claude-opus-4-8',
   'Anthropic model for document generation. Update when deprecated.'),
  ('generation_model_fallback', 'claude-sonnet-4-6',
   'Fallback model if primary unavailable.')
ON CONFLICT (key) DO NOTHING;
