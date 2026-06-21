-- ============================================================================
-- MIGRATION 004: Expand answers.source CHECK constraint
-- Created: 2026-06-20
-- Purpose: Allow document-extraction and conflict-resolution source values.
--          Migration 001 created the constraint allowing only quiz/user flows.
--          Document upload pipeline (migration 003) writes additional values
--          that require this expansion.
-- Safe: DROP IF EXISTS + ADD — idempotent, no destructive table changes.
-- ============================================================================

-- Drop the existing constraint (auto-named by Postgres from migration 001)
ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS answers_source_check;

-- Re-add with expanded allowed values
ALTER TABLE public.answers
  ADD CONSTRAINT answers_source_check
  CHECK (source IN (
    'quiz',
    'user_entry',
    'user_edited',
    'document_extracted',
    'user_resolved_conflict'
  ));

-- Verify:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'answers_source_check';
