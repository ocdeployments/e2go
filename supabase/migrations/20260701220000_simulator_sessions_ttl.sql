-- Simulator session expiry: 12 months from start
-- Apply via Supabase SQL Editor (CLI migration history is out of sync)
-- NOTE: GENERATED ALWAYS AS not used — timestamptz + interval is STABLE not IMMUTABLE.
-- Trigger approach applied instead.

ALTER TABLE public.simulator_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing rows
UPDATE public.simulator_sessions
  SET expires_at = started_at + INTERVAL '12 months'
  WHERE expires_at IS NULL;

-- Auto-populate on new inserts
CREATE OR REPLACE FUNCTION set_simulator_session_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.started_at + INTERVAL '12 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER simulator_session_set_expires
  BEFORE INSERT ON public.simulator_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_simulator_session_expires_at();

-- Index for future purge job
CREATE INDEX IF NOT EXISTS idx_simulator_sessions_expires_at
  ON public.simulator_sessions (expires_at)
  WHERE expires_at IS NOT NULL;
