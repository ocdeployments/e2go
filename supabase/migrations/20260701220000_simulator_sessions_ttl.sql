-- Simulator session expiry: sessions are valid for 12 months from start
-- Apply via Supabase SQL Editor (CLI migration history is out of sync)

ALTER TABLE public.simulator_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
  GENERATED ALWAYS AS (started_at + INTERVAL '12 months') STORED;

-- Index for efficient expiry lookups (future purge job)
CREATE INDEX IF NOT EXISTS idx_simulator_sessions_expires_at
  ON public.simulator_sessions (expires_at)
  WHERE expires_at IS NOT NULL;
