-- CIC-2.2/2.3 additions to generated_documents:
--   verifier_result      — structured verdict from the verifier LLM (pass/fail/pass_with_notes + details)
--   verifier_attempts    — how many verifier passes ran (incl. retries) before client sees doc
--   client_certified     — true when client approves the document as accurate and ready to submit
--   certified_at         — timestamp of client certification
--   locked_passages      — array of { paragraph_index, text, locked_reason, locked_at } — client edits
--                          that must survive future regeneration passes without being overwritten
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS verifier_result    jsonb,
  ADD COLUMN IF NOT EXISTS verifier_attempts  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_certified   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certified_at       timestamptz,
  ADD COLUMN IF NOT EXISTS locked_passages    jsonb NOT NULL DEFAULT '[]'::jsonb;
