-- 20260628210000_initial_schema_fks_deferred.sql
-- Companion to 0000_initial_schema.sql: the 2 foreign keys from that
-- table set which reference tables created by their own later migrations
-- (family_members: 20260628200000, payments: 20260605110625). Split out
-- and timestamped after both so a fresh `supabase db reset` replay
-- doesn't fail on a missing referenced table. Idempotent via the same
-- pg_constraint-guarded DO block pattern as the main migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_family_member_id_fkey') THEN
    ALTER TABLE ONLY "public"."answers" ADD CONSTRAINT "answers_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_payment_id_fkey') THEN
    ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");
  END IF;
END $$;
