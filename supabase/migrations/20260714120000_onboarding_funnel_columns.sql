-- K-4.4: onboarding funnel instrumentation
-- Reuses application_lifecycle (already the shared arrival/completion table)
-- instead of adding a new events table.

ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS onboarding_doc_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
