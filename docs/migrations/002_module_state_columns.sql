-- Migration: 002_module_state_columns.sql
-- Adds module progress tracking columns to applications table
-- Run via Supabase SQL Editor
-- Safe: ADD COLUMN IF NOT EXISTS — no destructive operations
-- Created: 2026-06-20

-- Resume-where-you-left-off for the Case File hub
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS last_active_section TEXT;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS last_active_cluster INTEGER;

-- Module completion flags
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS module_1_complete BOOLEAN DEFAULT false;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS module_2_complete BOOLEAN DEFAULT false;

-- Module 2 outputs
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS experience_gap_flag TEXT;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS business_shortlist JSONB;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS specific_business_description TEXT;

-- Module 1 / onboarding routing
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS processing_path TEXT;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS family_composition TEXT;

-- After applying this migration:
-- 1. Restore last_active_section/cluster to hub page select in src/app/apply/page.tsx
-- 2. Remove the "last_active_section/cluster require migration 002" comment
