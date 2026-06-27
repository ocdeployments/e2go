# OWNER CHECKLIST — Cleanup After Sessions 13/20/24

Run these in order via **Supabase Dashboard → SQL Editor**. Each is
small and scoped — review before running, but these are confirmed-blank
rows / additive schema changes, low risk.

---

## 1 — Delete Chen's 5 blank duplicate `applications` rows

Per Session 20: 6 rows exist for Chen's account
(`a2b8f8c3-5f92-4b1d-863b-275648a74b4d`), only `9f981747-...` has real
data (27 answers). The other 5 are blank (0 answers).

```sql
-- Verify first — should return 5 rows, all with 0 answers, before deleting
SELECT id, status, principal_name, business_name, created_at
FROM applications
WHERE id IN (
  '9332e300-0000-0000-0000-000000000000', -- replace with full UUIDs from Session 20's report
  'b4c0ae97-0000-0000-0000-000000000000',
  'c9b1f1c8-0000-0000-0000-000000000000',
  '43163d23-0000-0000-0000-000000000000',
  'b9148987-0000-0000-0000-000000000000'
)
AND user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d';
```

```sql
-- After confirming the above looks right, delete:
DELETE FROM applications
WHERE id IN (
  '9332e300-0000-0000-0000-000000000000', -- replace with full UUIDs from Session 20's report
  'b4c0ae97-0000-0000-0000-000000000000',
  'c9b1f1c8-0000-0000-0000-000000000000',
  '43163d23-0000-0000-0000-000000000000',
  'b9148987-0000-0000-0000-000000000000'
)
AND user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d';
```

**Note**: Session 20's report only gave SHORT prefixes for 4 of the 5 IDs
(`9332e300-...`, `b4c0ae97-...`, `c9b1f1c8-...`, `43163d23-...`,
`b9148987-...`) — these are truncated UUIDs. Before running the DELETE,
get the FULL UUIDs:

```sql
SELECT id, status, principal_name, business_name, created_at
FROM applications
WHERE user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d'
AND id != '9f981747-e3e4-4941-9f86-9871f8117b66'
ORDER BY created_at;
```

This returns the 5 blank rows with full UUIDs — copy them into the
DELETE above (or just delete by this WHERE clause directly, since it
already excludes the canonical row):

```sql
DELETE FROM applications
WHERE user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d'
AND id != '9f981747-e3e4-4941-9f86-9871f8117b66';
```

---

## 2 — Delete ocdeployments' 2 blank duplicate `applications` rows

Per Session 24: full UUIDs were given, both blank (NULL principal_name
and business_name).

```sql
-- Verify first
SELECT id, status, principal_name, business_name, created_at
FROM applications
WHERE id IN (
  'bd8a9c1a-a4f0-4c9c-bb4d-83c48d2e9ba5',
  '49afc548-0d91-44eb-8f74-efb76aeb8731'
)
AND user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
```

```sql
-- Delete
DELETE FROM applications
WHERE id IN (
  'bd8a9c1a-a4f0-4c9c-bb4d-83c48d2e9ba5',
  '49afc548-0d91-44eb-8f74-efb76aeb8731'
)
AND user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
```

**Note**: per Session 24, ocdeployments had only these 2 + (implicitly)
0-1 others — confirm with a quick check that nothing else remains
unexpectedly:

```sql
SELECT id, status, principal_name, business_name, created_at
FROM applications
WHERE user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
```

If this returns ZERO rows after the delete — that's correct, this
account should currently have NO real application (it's the
"genuinely blank, no case file" test account per Session 13's
recommendation).

---

## 3 — Apply Session 14's migration (applications.source column)

File: `supabase/migrations/20260613210000_applications_source_column.sql`

Open this file (via Claude Code's `view` tool, or your editor), copy its
full contents, paste into Supabase SQL Editor, run.

If you don't have it handy, here's the expected shape (per Session 14's
spec — **verify against the actual file**, this is a reconstruction):

```sql
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;
```

(IF NOT EXISTS per RULE 4 — safe to run even if it somehow partially
applied before.)

---

## 4 — Log out / log back in on both test accounts

After steps 1-3:

1. **Chen** (`michael.chen.test@e2go-uat.com`) — log out, log back in.
   - `/dashboard` should show ONE application (Chen Learning Centers),
     quiz result card present
   - `/simulator` should load the REAL simulator (StartScreen,
     text/voice mode) — per Session 24, Session 12's `hasCaseFile`
     check should now evaluate `true` (27 answers + case brief)

2. **ocdeployments** (`ocdeployments@gmail.com`) — log out, log back in.
   - `/dashboard` should show quiz result card, but NO application
     (or "start your application" — which is now CORRECT for this
     account, since it has no real case file)
   - `/simulator` → Session 12's teaser (hasCaseFile === false) →
     "Upload your documents instead" → Session 14's quick-start flow
     (now that step 3's migration is applied)

---

## IF SOMETHING LOOKS WRONG AFTER THIS

Don't run more DELETEs or UPDATEs ad-hoc — these accounts have already
been through 4 investigation sessions (13, 19, 20, 24). If step 4's
verification doesn't match expectations, report back with specifics
(what you see vs. what's expected above) and we'll scope a targeted
follow-up rather than guessing further.
