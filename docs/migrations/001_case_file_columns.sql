-- Migration: 001_case_file_columns.sql
-- Adds source tracking to answers and partner_gender to applications
-- Run via Supabase SQL Editor or CLI
-- Safe: ADD COLUMN IF NOT EXISTS — no destructive operations

-- Tracks where each answer came from for pre-fill badge logic
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS source TEXT
CHECK (source IN ('quiz', 'user_entry', 'user_edited'))
DEFAULT 'user_entry';

-- Drives his/her in partnership UI and generated documents
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS partner_gender TEXT
CHECK (partner_gender IN ('man', 'woman'));

-- Verify both columns exist:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'answers' AND column_name = 'source';
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'applications' AND column_name = 'partner_gender';
