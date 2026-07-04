-- Adds consulate_post to quiz_sessions, following the same additive,
-- dedicated-column pattern already used for business_type/franchise_interest.
-- Captured at Q0-05a in the quiz (module0_questions.json) — the client's
-- specific filing consulate/post, used to drive per-consulate page budgets
-- in generation-engine.ts and the business plan length toggle.
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS consulate_post TEXT;

-- Also add a client-chosen business plan length mode, so the choice a client
-- makes on the ConsulateBriefing screen ("recommended" vs "extended") persists
-- per application and can be read back by generation-engine.ts.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS business_plan_length_mode TEXT
  CHECK (business_plan_length_mode IN ('recommended', 'extended'));
