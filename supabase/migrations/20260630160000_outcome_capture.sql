-- CIC-5.1: Outcome capture table
-- Records E-2 case outcomes for cross-client learning (CIC-5 track).
--
-- Privacy model (D6 — owner decision 2026-06-30):
--   Consent is collected at THREE points:
--     1. Sign-up (terms of service checkbox — new accounts)
--     2. Terms update (existing accounts prompted on next login)
--     3. Before download (the /documents package gate)
--   The `consent_given` flag here reflects whether the client has given
--   explicit consent for their anonymized outcome to enter the shared corpus.
--   No outcome data enters the learning corpus (CIC-5.4) without consent_given=true.
--   Migration for the sign-up + terms-update consent UI is handled separately.

CREATE TABLE IF NOT EXISTS application_outcomes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Core outcome
  outcome          text        NOT NULL
    CHECK (outcome IN ('approved', 'denied', 'rfe', 'withdrawal', 'pending', 'unknown')),
  outcome_date     date,
  consulate        text,                    -- e.g. 'toronto', 'london', 'mexico_city'
  processing_days  int,                     -- days from submission to outcome

  -- What happened
  denial_codes     text[]      NOT NULL DEFAULT '{}', -- D-01…D-15 that were cited
  officer_probes   text[]      NOT NULL DEFAULT '{}', -- questions the officer focused on
  decisive_dimensions text[]   NOT NULL DEFAULT '{}', -- dimensions that drove the decision
  officer_notes    text,                    -- client's own notes on how the interview went

  -- For learning (anonymized before entering corpus — CIC-5.3)
  consent_given    boolean     NOT NULL DEFAULT false,
  anonymized_at    timestamptz,             -- set when PII is stripped for the corpus

  UNIQUE (application_id)
);

ALTER TABLE application_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outcomes_select_own" ON application_outcomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outcomes_insert_own" ON application_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outcomes_update_own" ON application_outcomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outcomes_delete_own" ON application_outcomes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS outcomes_user_idx ON application_outcomes (user_id);
CREATE INDEX IF NOT EXISTS outcomes_consulate_idx ON application_outcomes (consulate) WHERE consent_given = true;
CREATE INDEX IF NOT EXISTS outcomes_outcome_idx ON application_outcomes (outcome) WHERE consent_given = true;

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_application_outcomes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_application_outcomes_updated_at ON application_outcomes;
CREATE TRIGGER set_application_outcomes_updated_at
  BEFORE UPDATE ON application_outcomes FOR EACH ROW
  EXECUTE FUNCTION set_application_outcomes_updated_at();
