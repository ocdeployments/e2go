-- Module 1: Onboarding and Consent Tables
-- Creates consent_log, referral_consents, and updates applications/application_lifecycle

-- Consent Log Table
CREATE TABLE IF NOT EXISTS consent_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- 'tos', 'privacy', 'casl'
  consent_given boolean NOT NULL,
  ip_hash text,
  created_at timestamp with time zone DEFAULT now()
);

-- Referral Consents Table
CREATE TABLE IF NOT EXISTS referral_consents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'franchise', 'immigration', 'banking', 'accountant', 'business_formation'
  consent_given boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Add module completion flags to applications table if not exists
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_type text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS processing_path text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS family_composition text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS module_1_complete boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS module_2_complete boolean DEFAULT false;

-- Add columns to application_lifecycle if not exists
ALTER TABLE application_lifecycle ADD COLUMN IF NOT EXISTS first_entry timestamp with time zone;
ALTER TABLE application_lifecycle ADD COLUMN IF NOT EXISTS module1_completed_at timestamp with time zone;
ALTER TABLE application_lifecycle ADD COLUMN IF NOT EXISTS module2_completed_at timestamp with time zone;

-- RLS Policies
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own consent logs" ON consent_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own consent logs" ON consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE referral_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own referral consents" ON referral_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own referral consents" ON referral_consents FOR ALL USING (auth.uid() = user_id);
