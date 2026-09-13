-- BC-16 (Gap G-10): soft-delete/archival window before hard-delete.
--
-- purgeExpiredFiles() and purgeDeletedAccounts() in src/lib/retention-cron.ts
-- and src/app/api/cron/data-retention/route.ts used to call storage.remove()
-- directly — a bug in the purge logic itself, or an incorrectly-set
-- file_purged_at, was unrecoverable by design. This adds a 7-day archival
-- window: a file/account due for purge is first moved to an `_archive/`
-- prefix in the same bucket (off the primary path apps read from) rather than
-- deleted, and only actually removed by a second sweep once the window has
-- elapsed. file_purged_at keeps its existing meaning (app-visible: "the file
-- is gone, do not attempt to read it") and is still stamped at the original
-- purge point — this migration only changes what physically happens to the
-- bytes underneath, not the app-facing contract in DATA_RETENTION_POLICY.md.
--
-- Idempotent: safe to run more than once.

ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS file_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_archive_path TEXT,
  ADD COLUMN IF NOT EXISTS archive_hard_deleted_at TIMESTAMPTZ;

ALTER TABLE fdd_analyses
  ADD COLUMN IF NOT EXISTS file_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_archive_path TEXT,
  ADD COLUMN IF NOT EXISTS archive_hard_deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN application_documents.file_archived_at IS
  'When the raw file was moved to the _archive/ Storage prefix instead of being hard-deleted (BC-16 / G-10). Recoverable until the archive window elapses.';
COMMENT ON COLUMN application_documents.storage_archive_path IS
  'Storage path of the archived copy, for recovery within the archive window. Null once hard-deleted.';
COMMENT ON COLUMN application_documents.archive_hard_deleted_at IS
  'When the archived copy was actually removed from Storage, ending the recovery window.';

CREATE INDEX IF NOT EXISTS idx_application_documents_archive_sweep
  ON application_documents (file_archived_at)
  WHERE storage_archive_path IS NOT NULL AND archive_hard_deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fdd_analyses_archive_sweep
  ON fdd_analyses (file_archived_at)
  WHERE storage_archive_path IS NOT NULL AND archive_hard_deleted_at IS NULL;

-- Deleted-account Storage sweeps don't have a surviving row to stamp (the
-- profiles/auth.users row is deleted immediately, cascading everything else) —
-- track the pending archive-to-hard-delete window in its own table instead.
CREATE TABLE IF NOT EXISTS archived_account_purges (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  user_id_hint    uuid,
  storage_prefix  text        NOT NULL,
  archived_at     timestamptz NOT NULL DEFAULT now(),
  hard_deleted_at timestamptz
);

COMMENT ON TABLE archived_account_purges IS
  'BC-16 / G-10: a deleted account''s Storage objects are moved to an _archive/ prefix rather than removed outright. This tracks the pending hard-delete once the archive window elapses. user_id_hint is informational only — the auth.users row is already gone by the time this row is written.';

CREATE INDEX IF NOT EXISTS idx_archived_account_purges_sweep
  ON archived_account_purges (archived_at)
  WHERE hard_deleted_at IS NULL;

-- Service role only (cron writes/reads this; no end-user access to it).
ALTER TABLE archived_account_purges ENABLE ROW LEVEL SECURITY;
