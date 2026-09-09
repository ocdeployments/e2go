-- ============================================================
-- E2go — Account Health Check
-- Paste this into Supabase SQL Editor after any session.
-- Flags the most common data wiring problems in one query.
-- ============================================================

WITH

-- 1. All paid users (the source of truth — middleware uses this)
paid_users AS (
  SELECT DISTINCT user_id
  FROM applications
  WHERE payment_status = 'paid'
  AND (source IS NULL OR source != 'simulator_standalone')
),

-- 2. Check: each paid user should have exactly ONE paid application
-- More than one = checkout ran twice. Zero = impossible by definition here.
app_counts AS (
  SELECT
    a.user_id,
    COUNT(*) FILTER (WHERE a.payment_status = 'paid') AS paid_count,
    COUNT(*) FILTER (WHERE a.payment_status != 'paid') AS unpaid_count,
    MAX(a.created_at) FILTER (WHERE a.payment_status = 'paid') AS latest_paid_at,
    MAX(a.created_at) FILTER (WHERE a.payment_status != 'paid') AS latest_unpaid_at
  FROM applications a
  WHERE a.source IS NULL OR a.source != 'simulator_standalone'
  GROUP BY a.user_id
),

-- 3. Check: paid users should have a completed quiz
quiz_status AS (
  SELECT
    pu.user_id,
    qs.completed_at IS NOT NULL AS quiz_complete,
    qs.result_json->>'investment_range' AS investment_range,
    qs.result_json->'answers'->>'Q0-01' AS treaty_country
  FROM paid_users pu
  LEFT JOIN quiz_sessions qs ON qs.user_id = pu.user_id
    AND qs.completed_at IS NOT NULL
),

-- 4. Check: profiles row exists and has first_name
profile_status AS (
  SELECT
    pu.user_id,
    p.first_name IS NOT NULL AS has_first_name,
    p.tier,
    au.email,
    au.raw_user_meta_data->>'first_name' AS meta_first_name
  FROM paid_users pu
  LEFT JOIN profiles p ON p.id = pu.user_id
  LEFT JOIN auth.users au ON au.id = pu.user_id
),

-- 5. Check: case_profiles row exists (needed for archetype in caption)
cp_status AS (
  SELECT
    pu.user_id,
    cp.archetype IS NOT NULL AS has_archetype,
    cp.archetype
  FROM paid_users pu
  LEFT JOIN case_profiles cp ON cp.user_id = pu.user_id
)

-- ── FINAL REPORT ──────────────────────────────────────────────
SELECT
  ps.email,
  ps.meta_first_name AS name,
  ps.tier,

  -- Application health
  ac.paid_count AS paid_apps,
  ac.unpaid_count AS orphan_unpaid_apps,
  CASE
    WHEN ac.unpaid_count > 0 AND ac.latest_unpaid_at > ac.latest_paid_at
    THEN '⚠ UNPAID APP IS NEWER — API picks wrong one'
    WHEN ac.paid_count > 1
    THEN '⚠ MULTIPLE PAID APPS'
    ELSE '✓ OK'
  END AS app_health,

  -- Quiz health
  CASE
    WHEN qz.quiz_complete THEN '✓ Complete'
    ELSE '✗ MISSING — caption will be blank'
  END AS quiz_status,
  qz.treaty_country,
  qz.investment_range,

  -- Profile health
  CASE
    WHEN ps.has_first_name THEN '✓ OK'
    ELSE '⚠ first_name null — using auth metadata only'
  END AS profile_name_status,

  CASE
    WHEN ps.tier = 'complete' OR ps.tier = 'partnership' THEN '✓ ' || ps.tier
    ELSE '⚠ tier=' || COALESCE(ps.tier, 'null') || ' — Stripe webhook may have missed'
  END AS tier_status,

  -- Caption health (all 3 must be non-null for full caption)
  CASE
    WHEN qz.treaty_country IS NOT NULL AND qz.investment_range IS NOT NULL
    THEN '✓ Caption will render'
    WHEN qz.treaty_country IS NOT NULL
    THEN '⚠ Partial — country only'
    ELSE '✗ Caption blank — quiz data missing'
  END AS caption_status,

  -- Archetype
  CASE
    WHEN cps.has_archetype THEN '✓ ' || cps.archetype
    ELSE '○ No archetype — gap analysis not run yet'
  END AS archetype_status

FROM profile_status ps
JOIN app_counts ac ON ac.user_id = ps.user_id
LEFT JOIN quiz_status qz ON qz.user_id = ps.user_id
LEFT JOIN cp_status cps ON cps.user_id = ps.user_id
ORDER BY ps.email;
