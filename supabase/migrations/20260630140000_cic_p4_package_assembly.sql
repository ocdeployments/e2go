-- CIC-P.4: Package assembly columns.
-- client_regen_note: client's feedback note on the document they want regenerated.
-- Stored on generated_documents (the note for the current doc) and
-- document_generation_jobs (passed through to the pipeline so the brief knows why).

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS client_regen_note text;

ALTER TABLE document_generation_jobs
  ADD COLUMN IF NOT EXISTS client_regen_note text;
