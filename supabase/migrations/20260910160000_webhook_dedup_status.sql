-- RS-1 (Gap G-13): the webhook dedup row must be a claim, not a receipt.
--
-- Today processed_webhook_events is written once, before any handler logic
-- runs, and never touched again — so a redelivered event that hit a partial
-- failure last time is treated as fully done and returns `duplicate: true`
-- forever. Adding a status lets the row track whether the handler actually
-- finished: 'processing' on insert, 'completed' only once every step in the
-- switch succeeds, 'failed' if any step captured an error or the handler
-- threw. A later delivery of the same event id sees 'processing'/'failed'
-- and reclaims the row to re-run, instead of short-circuiting.
--
-- Historical rows predate this column and were written under the old
-- semantics (the row only ever existed because the insert succeeded, with
-- no failure tracking) — defaulting them to 'completed' preserves today's
-- behavior for events already on record.

ALTER TABLE processed_webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed'));
