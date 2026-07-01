-- H4: Enable RLS on admin log tables — service role only; no authenticated user access
-- These tables contain PII (user IDs, cost data, admin actions) and must not be
-- readable by regular authenticated users even if they guess row IDs.

ALTER TABLE llm_cost_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_log        ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated role.
-- Service role bypasses RLS by default — all existing server-side writes continue unchanged.
-- The explicit FORCE below ensures even superuser connections go through RLS on these tables.
ALTER TABLE llm_cost_log    FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE cron_log        FORCE ROW LEVEL SECURITY;
