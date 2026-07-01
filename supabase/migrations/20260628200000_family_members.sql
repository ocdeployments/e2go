-- Sprint J-1: Middle name on profiles + family_members table
-- Stores co-investors, spouse, and children for E-2 case file

-- Add middle_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- ── Family Members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_type   TEXT        NOT NULL CHECK (member_type IN ('co_investor', 'spouse', 'child')),
  first_name    TEXT,
  middle_name   TEXT,
  last_name     TEXT,
  gender        TEXT        CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  date_of_birth DATE,
  nationality   TEXT,
  passport_number TEXT,
  role          TEXT,       -- co_investor: '50/50' | 'majority' | 'minority' | 'silent'
  sort_order    INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can manage own family members'
    AND tablename = 'family_members'
  ) THEN
    CREATE POLICY "Users can manage own family members"
      ON public.family_members
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_family_members_user_id   ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_type      ON public.family_members(member_type);
CREATE INDEX IF NOT EXISTS idx_family_members_sort      ON public.family_members(user_id, sort_order);

-- Create shared updated_at helper if not already present
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_family_members_timestamp ON public.family_members;
CREATE TRIGGER update_family_members_timestamp
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
