-- DR-20 pilot-cell audit found case_theory writes can be lost: buildCaseIntelligence's
-- lock has a 30s TTL but generateCaseTheory's LLM call has a 90s timeout, so a second
-- caller can legitimately steal the lock and run a fully concurrent build while the
-- first is still in flight. The final case_theory upsert was unconditional
-- (onConflict: 'application_id', last write wins), so whichever build finished last
-- won even if it captured a staler answer snapshot.
--
-- This migration adds an ordering column plus a conditional-write RPC: the write is
-- only applied if its model snapshot is not older than what's already stored, so a
-- late-finishing stale build can no longer clobber a fresher result.

ALTER TABLE case_theory ADD COLUMN IF NOT EXISTS model_snapshot_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION upsert_case_theory_if_newer(
  p_application_id     UUID,
  p_user_id            UUID,
  p_model_snapshot_at  TIMESTAMPTZ,
  p_narrative          TEXT,
  p_transferable_skills JSONB,
  p_numbers_strategy   JSONB,
  p_dimension_verdicts JSONB,
  p_directives         JSONB,
  p_doctrine_citations JSONB,
  p_source_fingerprint TEXT
)
RETURNS TABLE (applied BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_snapshot_at TIMESTAMPTZ;
BEGIN
  SELECT model_snapshot_at INTO v_existing_snapshot_at
  FROM case_theory
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF FOUND AND v_existing_snapshot_at IS NOT NULL AND v_existing_snapshot_at > p_model_snapshot_at THEN
    -- A fresher build already landed — this write is from a stale, late-finishing run.
    RETURN QUERY SELECT FALSE;
    RETURN;
  END IF;

  INSERT INTO case_theory (
    application_id, user_id, narrative, transferable_skills, numbers_strategy,
    dimension_verdicts, directives, doctrine_citations, source_fingerprint,
    built_at, model_snapshot_at
  )
  VALUES (
    p_application_id, p_user_id, p_narrative, p_transferable_skills, p_numbers_strategy,
    p_dimension_verdicts, p_directives, p_doctrine_citations, p_source_fingerprint,
    NOW(), p_model_snapshot_at
  )
  ON CONFLICT (application_id) DO UPDATE SET
    user_id             = EXCLUDED.user_id,
    narrative           = EXCLUDED.narrative,
    transferable_skills = EXCLUDED.transferable_skills,
    numbers_strategy    = EXCLUDED.numbers_strategy,
    dimension_verdicts  = EXCLUDED.dimension_verdicts,
    directives          = EXCLUDED.directives,
    doctrine_citations  = EXCLUDED.doctrine_citations,
    source_fingerprint  = EXCLUDED.source_fingerprint,
    built_at            = NOW(),
    model_snapshot_at   = EXCLUDED.model_snapshot_at;

  RETURN QUERY SELECT TRUE;
END;
$$;
