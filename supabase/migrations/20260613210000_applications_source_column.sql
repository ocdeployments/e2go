-- Add source column to applications table
-- Used to distinguish standalone simulator applications from full case file applications
-- Values: NULL (default, full case file), 'simulator_standalone' (quick-start path)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS source text;

-- Index for filtering out standalone applications from dashboard/apply queries
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source) WHERE source IS NOT NULL;
