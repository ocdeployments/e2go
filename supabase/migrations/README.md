# Migration Conventions

## Adding a column to a table that may already exist

Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, never rely on
`CREATE TABLE IF NOT EXISTS` to carry a schema change onto an existing
table — it no-ops silently if the table is already there, and the new
column never gets added.

```sql
-- Wrong — no-ops silently if interview_prep_kits already exists,
-- kit_json never gets added, no error is raised.
CREATE TABLE IF NOT EXISTS interview_prep_kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_json JSONB NOT NULL,
  ...
);

-- Right — works whether the table is new or pre-existing.
CREATE TABLE IF NOT EXISTS interview_prep_kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY
);
ALTER TABLE interview_prep_kits
  ADD COLUMN IF NOT EXISTS kit_json JSONB NOT NULL;
```

## Why this is here

`20260627100000_interview_prep_kits.sql` used `CREATE TABLE IF NOT EXISTS`
against a table that already existed (an earlier quiz-questions table with
different columns). The migration silently no-opped — `kit_json` and
`model_used` were never added. Every dossier generation succeeded and
rendered but failed to persist with `PGRST204` ("Could not find the
'kit_json' column... in the schema cache"). That error was misdiagnosed for
a full session as a stale PostgREST schema cache — two migrations
(`20260715120000_reload_pgrst_schema_cache.sql`,
`20260715180000_reload_pgrst_schema_cache_retry.sql`) issued `NOTIFY pgrst,
'reload schema'` before anyone checked whether the column actually existed.
It didn't. The real fix is `20260715190000_add_kit_json_to_prep_kits.sql`.

**If `PGRST204` ("column ... not found in schema cache") ever recurs:**
check the column actually exists (`\d table_name` in `psql`, or query
`information_schema.columns`) before assuming a stale cache and retrying
`NOTIFY pgrst`. A missing column and a stale cache produce the identical
error message.
