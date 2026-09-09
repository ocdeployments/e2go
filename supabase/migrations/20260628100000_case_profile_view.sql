-- case_profile_view: joins all user data tables into a single read-only view.
-- No new storage. Used by /api/dashboard/case-profile to serve CaseProfileTab.
-- Safe to re-run (CREATE OR REPLACE VIEW is idempotent).

CREATE OR REPLACE VIEW case_profile_view AS
WITH latest_quiz AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    outcome,
    result_json,
    completed_at
  FROM quiz_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY user_id, completed_at DESC
),
primary_app AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS application_id
  FROM applications
  WHERE source != 'simulator_standalone'
  ORDER BY user_id, created_at DESC
),
latest_fdd AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS fdd_id,
    created_at AS fdd_created_at
  FROM fdd_analyses
  ORDER BY user_id, created_at DESC
),
fdd_counts AS (
  SELECT user_id, COUNT(*) AS fdd_count
  FROM fdd_analyses
  GROUP BY user_id
),
latest_sim AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    session_number,
    readiness_indicator,
    coaching_notes
  FROM simulator_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY user_id, session_number DESC
),
latest_prep_kit AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS prep_kit_id,
    created_at AS prep_kit_created_at
  FROM interview_prep_kits
  ORDER BY user_id, created_at DESC
)
SELECT
  p.id                                                    AS user_id,
  p.first_name,
  p.last_name,

  -- Quiz
  q.outcome                                               AS quiz_outcome,
  q.completed_at                                          AS quiz_completed_at,
  q.result_json->>'investment_range'                      AS investment_range,
  q.result_json->'answers'->>'Q0-01'                      AS treaty_country,
  q.result_json->'answers'->>'Q0-08a'                     AS business_type,

  -- Case profile computed scores
  cp.archetype,
  cp.completeness_score,
  cp.source_of_funds_score,
  cp.management_role_score,
  cp.business_plan_score,

  -- Application
  a.application_id,

  -- Lifecycle milestones
  al.module1_completed_at,
  al.module2_completed_at,
  al.module3_completed_at,
  al.module4_completed_at,
  al.module5_completed_at,

  -- FDD
  COALESCE(fc.fdd_count, 0)                               AS fdd_count,
  f.fdd_id,

  -- Simulator
  s.session_number                                        AS last_sim_session_number,
  s.readiness_indicator                                   AS sim_readiness,
  s.coaching_notes                                        AS sim_coaching_notes,

  -- Prep kit
  k.prep_kit_id,
  k.prep_kit_created_at

FROM profiles p
LEFT JOIN latest_quiz q         ON q.user_id = p.id
LEFT JOIN case_profiles cp      ON cp.user_id = p.id
LEFT JOIN primary_app a         ON a.user_id = p.id
LEFT JOIN application_lifecycle al ON al.user_id = p.id
LEFT JOIN latest_fdd f          ON f.user_id = p.id
LEFT JOIN fdd_counts fc         ON fc.user_id = p.id
LEFT JOIN latest_sim s          ON s.user_id = p.id
LEFT JOIN latest_prep_kit k     ON k.user_id = p.id;

-- No RLS needed on a VIEW — the underlying tables already enforce row-level security.
-- The API route filters by authenticated user_id before querying this view.
