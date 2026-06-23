-- Add 'revising' status to generated_documents
-- Required by /api/generate/revise/[applicationId]/route.ts which sets status = 'revising'
-- during active revision so the UI can show a spinner.

ALTER TABLE generated_documents
  DROP CONSTRAINT IF EXISTS generated_documents_status_check;

ALTER TABLE generated_documents
  ADD CONSTRAINT generated_documents_status_check
  CHECK (status IN (
    'queued', 'generating', 'generated', 'awaiting_approval',
    'under_review', 'approved', 'locked', 'failed', 'revision_requested', 'revising'
  ));
