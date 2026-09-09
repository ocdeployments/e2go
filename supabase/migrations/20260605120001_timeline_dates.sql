-- Add timeline columns to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS working_target_date DATE;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS confirmed_interview_date DATE;

COMMENT ON COLUMN applications.working_target_date IS
  'Planning hypothesis set by user in journey wizard.
   Not used as a hard deadline anchor. Can change freely.';

COMMENT ON COLUMN applications.confirmed_interview_date IS
  'Real consulate appointment date. Set when appointment
   is scheduled. Used as anchor for all compliance deadlines.
   Typically known 4-8 weeks before interview.';
