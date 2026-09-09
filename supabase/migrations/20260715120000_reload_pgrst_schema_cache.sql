-- Force PostgREST to reload its schema cache.
-- interview_prep_kits.kit_json exists (see 20260627100000_interview_prep_kits.sql,
-- confirmed applied via `supabase migration list`) but PostgREST kept serving a
-- stale cache, causing PGRST204 on writes to that column.
NOTIFY pgrst, 'reload schema';
