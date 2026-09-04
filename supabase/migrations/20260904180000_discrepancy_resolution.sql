-- Sprint S / S-6: resolution state for document discrepancies.
--
-- The review flow has always written resolved_value, resolved_source and
-- resolved_at, and the gap report has always filtered on resolved_value IS
-- NULL. None of the three columns existed, so every one of those queries
-- errored: the resolve endpoint returned 500, and the review UI could not load
-- its list at all. This adds what the code has been assuming.
--
-- Purely additive against an empty table (0 rows on September 4, 2026), and
-- idempotent, so it is safe to re-run.

ALTER TABLE public.document_discrepancies
  ADD COLUMN IF NOT EXISTS resolved_value  text,
  ADD COLUMN IF NOT EXISTS resolved_source text,
  ADD COLUMN IF NOT EXISTS resolved_at     timestamptz;

-- The review UI and the gap report both ask the same question: which
-- discrepancies on this application are still open? Partial, because a
-- resolved row is never the subject of that question again.
CREATE INDEX IF NOT EXISTS idx_document_discrepancies_unresolved
  ON public.document_discrepancies (application_id)
  WHERE resolved_value IS NULL;
