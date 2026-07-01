-- H6: Per-application build lock for buildCaseIntelligence
-- Prevents duplicate concurrent CPU builds for the same application
-- (fire-and-forget callers can race in a high-activity session).
--
-- Lock semantics:
--   INSERT ON CONFLICT (application_id) DO UPDATE ... WHERE locked_at < NOW() - 30s
--   If UPDATE fires but changes 0 rows → another build holds the lock → caller skips.
--   Caller deletes the row in a finally block when the build completes.

CREATE TABLE IF NOT EXISTS case_intelligence_locks (
  application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  locked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — only accessed via service role in buildCaseIntelligence.
-- No authenticated user should ever read or write this table directly.

-- RPC: acquire_case_intelligence_lock
-- Returns 1 row if the lock was acquired, 0 rows if another build holds it.
CREATE OR REPLACE FUNCTION acquire_case_intelligence_lock(
  p_application_id UUID,
  p_ttl_seconds     INTEGER DEFAULT 30
)
RETURNS TABLE (acquired BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert a new lock row
  INSERT INTO case_intelligence_locks (application_id, locked_at)
  VALUES (p_application_id, NOW())
  ON CONFLICT (application_id) DO UPDATE
    SET locked_at = NOW()
    WHERE case_intelligence_locks.locked_at < NOW() - (p_ttl_seconds || ' seconds')::INTERVAL;

  -- If the row's locked_at is NOW() (just set by us), we hold the lock
  IF FOUND THEN
    RETURN QUERY SELECT TRUE;
  END IF;
END;
$$;
