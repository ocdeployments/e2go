-- D6 Point 1 + 2: add outcomes_consent to profiles
-- Existing users get NULL (not yet asked) — the banner (D6 Point 2) surfaces on next login.
-- New users get the value they chose at signup.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS outcomes_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS outcomes_consent_at TIMESTAMPTZ;
