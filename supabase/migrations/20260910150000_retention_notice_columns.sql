-- RS-10 (Gap G-19): tracking columns for the three-email document-retention
-- notice sequence and the confirm-to-keep hold. One row per application,
-- matching how the retention cron already scopes file purges
-- (generated_documents.application_id, application_documents.application_id).
--
--   retention_notice_sent_at   — email 1, sent when the package is generated
--   retention_reminder_sent_at — email 2, sent 3 days before the purge date
--   retention_hold_at          — set when the client confirms "keep" from
--                                 email 2; non-null means the cron skips this
--                                 application's files on the scheduled purge
--   retention_purge_notice_sent_at — email 3, sent once the purge has run

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS retention_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_hold_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_purge_notice_sent_at TIMESTAMPTZ;
