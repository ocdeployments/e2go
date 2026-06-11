-- Enable RLS on quiz_sessions if not already enabled
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Add UPDATE policy for quiz sessions (allow users to update their own sessions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own quiz sessions'
    AND tablename = 'quiz_sessions'
  ) THEN
    CREATE POLICY "Users can update own quiz sessions"
      ON quiz_sessions FOR UPDATE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;
