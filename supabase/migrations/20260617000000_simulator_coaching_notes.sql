-- Add coaching_notes JSONB to simulator_sessions so top3NextSession
-- from the coaching report can be persisted and shown on interview-day page.
ALTER TABLE simulator_sessions
  ADD COLUMN IF NOT EXISTS coaching_notes JSONB;
