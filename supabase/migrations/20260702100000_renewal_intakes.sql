-- Sprint R: Renewal Module
-- Stores intake data for E-2 renewal module ($497 tier)
-- Each row represents one renewal workflow per user

CREATE TABLE IF NOT EXISTS public.renewal_intakes (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID        REFERENCES public.applications(id) ON DELETE SET NULL,
  path            TEXT        CHECK (path IN ('toronto', 'uscis')),
  answers         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'complete', 'generating', 'generated')),
  documents       JSONB,   -- generated output: {cover_letter, bp_update, template6, checklist}
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.renewal_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own renewal intakes"
  ON public.renewal_intakes
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_renewal_intakes_user_id
  ON public.renewal_intakes (user_id);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION touch_renewal_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER renewal_intake_touch_updated_at
  BEFORE UPDATE ON public.renewal_intakes
  FOR EACH ROW
  EXECUTE FUNCTION touch_renewal_intake_updated_at();
