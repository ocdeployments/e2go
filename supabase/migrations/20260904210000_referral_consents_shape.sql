-- Sprint S / S-10: give referral_consents the shape the code has always used.
--
-- Three places write or read this table by (user_id, category): Module 1's
-- referral opt-ins, the onboarding partner offers, and Module 2's gate on
-- module1ReferralConsent.franchise. None of them has ever worked.
--
-- The live table is a different feature's table that took the name first:
-- it carries email, referral_code and referred_by, has no category column at
-- all, and NOT NULL on email and referral_code with no defaults. The June
-- migration that was meant to create the consent table used CREATE TABLE IF
-- NOT EXISTS, which silently no-opped against it and reported success. So
-- every upsert has failed on a missing column and a missing conflict target,
-- and because supabase-js returns the error rather than throwing, nothing
-- surfaced it. Referral consent has never been recorded for anyone, and the
-- franchise consultant offer in Module 2 has therefore never appeared.
--
-- The table is empty (0 rows on September 4, 2026), so this is safe.
--
-- The orphan columns are kept rather than dropped — nothing in this repo
-- writes them, but dropping is irreversible and cheap to defer. Their NOT NULL
-- constraints have to go, since a consent row has neither an email nor a
-- referral code to put in them.

ALTER TABLE public.referral_consents
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.referral_consents ALTER COLUMN email         DROP NOT NULL;
ALTER TABLE public.referral_consents ALTER COLUMN referral_code DROP NOT NULL;

-- Backfill before the NOT NULL, so the statement is safe to re-run even if
-- rows arrive between deployments.
UPDATE public.referral_consents SET category = 'unspecified' WHERE category IS NULL;

ALTER TABLE public.referral_consents ALTER COLUMN category      SET NOT NULL;
ALTER TABLE public.referral_consents ALTER COLUMN consent_given SET NOT NULL;

-- The conflict target every writer names: one consent per category per user.
CREATE UNIQUE INDEX IF NOT EXISTS referral_consents_user_category_key
  ON public.referral_consents (user_id, category);

-- RLS. Enabling is idempotent; the policies are dropped first because the June
-- migration may have created them against the pre-existing table.
ALTER TABLE public.referral_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referral consents" ON public.referral_consents;
CREATE POLICY "Users can view their own referral consents"
  ON public.referral_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own referral consents" ON public.referral_consents;
CREATE POLICY "Users can insert/update their own referral consents"
  ON public.referral_consents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
