-- Soft-delete support: 30-day grace period before permanent data purge
-- Apply via Supabase SQL Editor (CLI migration history is out of sync)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient soft-delete checks in middleware
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- NOTE: Hard purge after 30 days requires a scheduled job.
-- Option A: Supabase pg_cron (if enabled):
--   SELECT cron.schedule('purge-deleted-accounts', '0 2 * * *', $$
--     SELECT purge_deleted_accounts();
--   $$);
-- Option B: Vercel cron hitting /api/admin/purge-deleted-accounts
-- The purge job must:
--   1. Find profiles WHERE deleted_at < NOW() - INTERVAL '30 days'
--   2. Delete all rows across USER_TABLES in dependency order
--   3. Call admin.auth.admin.deleteUser(user_id) for each
