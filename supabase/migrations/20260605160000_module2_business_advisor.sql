-- Module 2: Business Type Advisor Tables/Columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS experience_gap_flag text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS business_shortlist text[]; -- JSON array of selected businesses
ALTER TABLE applications ADD COLUMN IF NOT EXISTS specific_business_description text;
