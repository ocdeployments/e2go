# SESSION 8 — Fix Cover Page Data Source (personal_info Schema Mismatch)

**Branch:** dev
**Priority:** 🔴 HIGH — Session 6 found this is a LIVE BUG, not a known
limitation. Every real customer's cover page currently renders entirely
in bracket placeholders instead of their actual name/business/nationality
**Agent:** engineering-minimal-change + engineering-code-reviewer
**No Playwright.** Direct DB queries + function calls + generated file
inspection.
**Read before starting:** Session 6's completion report (above) — Step 2
and "REMAINING KNOWN UNKNOWNS #2" specifically. Session 4's
docx-cover-builder.ts (already has safeField() fallback per Session 6's
Step 2 fix — that fallback STAYS, this session fixes the DATA SOURCE
feeding it).

---

## CONTEXT

Session 6 found: the download route's cover page builder queries
`applications.personal_info` (a JSONB column) for applicant name,
business name, nationality, passport number, etc. — but this column
DOES NOT EXIST on the `applications` table. The query returns null,
`safeField()` correctly falls back to bracket placeholders (no crash —
that fix is good and stays), but the practical result is every real
cover page shows `[Applicant name from Tab A]`,
`[Business name from Tab E]`, etc. instead of real data.

This session finds where this data ACTUALLY lives and fixes the query.

---

## STEP 1 — DISCOVER THE REAL SCHEMA (live DB, not just design docs)

Do NOT assume `E2Pathway_Vol4_Technical_Architecture.md`'s schema is
current — Session 6 already found one mismatch between design docs and
live schema. Query the ACTUAL live Supabase schema:

```sql
\d applications
```
or equivalent (`information_schema.columns` query) for the `applications`
table. List ALL columns.

Per the architecture doc (for reference, may or may not match live DB):
`applicant_legal_name`, `business_name` are expected as direct TEXT
columns on `applications` (not nested in JSONB). Confirm whether these
exist in the LIVE table.

For nationality, passport number, business state/location — these are
NOT in the architecture doc's `applications` table at all. Find them by
checking:
- `applications` table — any other columns not in the design doc
  (live schema may have evolved)
- Module 1 / Module 3 Tab A answers (questionnaire responses domain —
  check `module3_responses` or equivalent table, filtered to Tab A
  question IDs for nationality/passport)
- Quiz/Module 0 responses (`quiz_sessions` or equivalent — nationality
  is often captured at quiz stage for treaty-country determination)

For Chen specifically (`9f981747-e3e4-4941-9f86-9871f8117b66`), find
the ACTUAL stored values for: applicant full legal name, business name,
business state (Cedar Park, TX per memory — confirm where this is
stored), nationality (Canadian), passport number (if collected).

---

## STEP 2 — MAP EACH COVER PAGE FIELD TO ITS REAL SOURCE

Produce a definitive mapping table:

| Cover page field | Real source (table.column or table.jsonb_path) | Confirmed present for Chen? |
|---|---|---|
| applicantName | ? | ? |
| businessName | ? | ? |
| businessState | ? | ? |
| nationality | ? | ? |
| passportNumber | ? | ? (likely NOT collected yet — bracket placeholder remains correct here) |
| preparedDate | ? (likely `now()` at generation time, not stored) | n/a |

For any field genuinely NOT collected anywhere yet (passport number is
the expected case per Session 1's findings — `[passport number from Tab
A]` is a REAL placeholder pattern used throughout generated documents,
not a bug) — confirm `safeField()`'s bracket fallback is the CORRECT
behavior for that field, and leave it as-is.

For fields that DO exist somewhere but the query doesn't reach them —
this is the bug to fix.

---

## STEP 3 — FIX THE DOWNLOAD ROUTE QUERY

In `src/app/api/generate/download/[applicationId]/route.ts` (per Session
4/6), replace the `applications.personal_info` JSONB query with queries
against the REAL sources mapped in Step 2. This may mean:
- Direct columns on `applications` (if `applicant_legal_name`,
  `business_name` exist there)
- A join or second query against Module 1/Tab A response tables for
  nationality (and business state if not on `applications`)
- Confirm `target_state` vs `business_state` naming — Session 4's
  completion report mentioned `applications.target_state` as a source;
  confirm whether this column exists and is correctly named, or whether
  Session 4 ALSO assumed a column that doesn't exist

Keep `buildCoverPage()`'s signature and `safeField()` fallback logic
UNCHANGED (Session 6's fix is good) — this session ONLY fixes what data
is PASSED IN to `buildCoverPage()`.

---

## STEP 4 — RE-VERIFY AGAINST CHEN

1. Regenerate the 15-file ZIP for Chen
2. Open `00_Cover_Page.docx` — confirm it now shows:
   - Real applicant name (not `[Applicant name from Tab A]`)
   - Real business name "Chen Learning Centers LLC" (not bracket)
   - Real business state "Cedar Park, TX" or similar (not bracket)
   - Real nationality "Canadian" (not bracket)
   - Passport number: bracket placeholder is CORRECT/EXPECTED if not
     yet collected — confirm this is the ONLY remaining bracket field,
     if any
3. Confirm TOC and dividers (which also take `applicantName` per Session
   4) are unaffected/still correct — they may share the same data source
   fix

---

## DO NOT IN THIS SESSION

- Do not modify `safeField()` or the bracket-placeholder fallback
  mechanism itself — it's correct and stays
- Do not modify Chen's stored data — only fix how it's QUERIED
- Do not add new DB columns or migrations unless the data genuinely
  doesn't exist anywhere (expected only for passport number) — if a
  field is missing entirely for MORE than passport number, STOP and
  report, don't improvise a new schema
- Do not touch Session 7 (separate, larger session) — this is a small,
  isolated data-plumbing fix

---

## COMPLETION REPORT

```
SESSION 8 — Cover page data source fix complete.

STEP 1 — Live schema discovery:
  applications table columns: [list]
  applicant_legal_name present: [yes/no]
  business_name present: [yes/no]
  Chen's actual stored values found:
    applicantName: [value/location]
    businessName: [value/location]
    businessState: [value/location]
    nationality: [value/location]
    passportNumber: [value/location, or "not collected — confirmed
      bracket placeholder is correct"]

STEP 2 — Field → source mapping table: [include full table]

STEP 3 — Download route fix:
  File modified: [path]
  Old query: [personal_info JSONB — confirmed removed]
  New query/queries: [describe]
  target_state column issue (Session 4): [existed / did not exist —
    how resolved]

STEP 4 — Re-verification (Chen):
  Cover page real data fields: [list which now show real values]
  Remaining bracket placeholders: [list — should be ONLY
    passportNumber if anything]
  TOC/dividers unaffected: [yes/no]

Build: clean / errors: [list or none]

OVERALL STATUS:
  [Confirm: cover page now shows real customer data for all fields
  genuinely on file. Any remaining gaps and why they're expected
  (e.g. passport number not yet collected in Module 3).]
```
