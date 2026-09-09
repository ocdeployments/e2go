-- Prior NOTIFY (20260715120000) did not clear the stale PostgREST schema
-- cache for interview_prep_kits.kit_json — PGRST204 still occurred after
-- it was applied. Re-issuing via pg_notify in case the plain NOTIFY was
-- lost across the pooled migration connection.
SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
