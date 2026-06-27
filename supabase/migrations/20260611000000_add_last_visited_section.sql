-- Add last_visited_section column to application_lifecycle
-- Used for smart post-login routing to resume where the user left off

ALTER TABLE application_lifecycle
ADD COLUMN IF NOT EXISTS last_visited_section text;

-- Add index for faster lookup during login routing
CREATE INDEX IF NOT EXISTS idx_application_lifecycle_user_id
ON application_lifecycle (user_id);

-- Add franchise_referral_requested column to quiz_sessions
-- Tracks whether user requested a franchise connection referral

ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS franchise_referral_requested boolean DEFAULT false;
