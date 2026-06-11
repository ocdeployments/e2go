-- Migration: Add readiness_stage and business_type to quiz_sessions
-- Session 2: Quiz Improvement — New Questions
-- These columns store quiz answers for post-quiz routing and downstream wiring

ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS readiness_stage text;

ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS business_type text;

COMMENT ON COLUMN quiz_sessions.readiness_stage IS
  'Readiness stage from Q0-readiness: ready_to_apply, researching, exploring. Used for post-results CTA routing and email sequences.';

COMMENT ON COLUMN quiz_sessions.business_type IS
  'Business type from Q0-business-type: service, franchise, retail, food_beverage, healthcare, real estate, not_identified, other. Feeds checklist, business plan, and Module 3 pre-population.';
