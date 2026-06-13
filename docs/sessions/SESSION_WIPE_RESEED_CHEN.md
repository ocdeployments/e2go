# SESSION — Wipe and Reseed Chen Application (Clean Test Data)

**Branch:** dev
**Priority:** 🔴 HIGH — required before next generation test
**Agent:** engineering-minimal-change
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Read docs/sessions/SESSION_QUALITY_GATE_DEEPDIVE.md and
docs/sessions/SESSION_PIPELINE_STATE_INVESTIGATION.md for context on
why this is needed — Chen's `answers`/`investment_breakdown`/
`case_brief_json` data has accumulated internally-inconsistent
investment figures ($110K, $125K, $143.6K, $175K, $185K all appearing
as if they should be the same number) across months of test-fixture
edits, causing 3 of 6 documents to come back as AI refusals in the
most recent generation run.

**Application UUID stays the same:** `9f981747-e3e4-4941-9f86-9871f8117b66`
(Michael James Chen). This UUID is referenced throughout BUILD_TRACKER
and docs/sessions/ — keep it so existing documentation remains valid.

---

## STEP 1 — IDENTIFY EVERY TABLE REFERENCING THIS UUID

Before deleting anything, find every table with a row where
`application_id = '9f981747-e3e4-4941-9f86-9871f8117b66'` (or
`user_id` / `id`, if this UUID is also used as a user/profile
identifier — confirm which).

Likely candidates based on tonight's investigations and the schema
references seen across specs:
- `answers`
- `generated_documents`
- `generation_pipeline_log`
- `document_generation_jobs`
- `applications` (the row itself)
- `quiz_sessions`
- `case_briefs` (referenced in Spec1/CLAUDE_CONTEXT as feeding the
  analysis engine)
- `followup_responses` (Module 4 — Spec2)
- `applicant_voice_profile` (Module 4 — Spec2, voice/writing-style
  profile)
- `consent_log`, `referral_consents` (Module 1 — per Session S27)
- `business_shortlist`, `experience_gap_flag` (Module 2 — per Session
  S27)
- Any `document_generation_log` rows (separate from
  `generation_pipeline_log` — confirm if both exist)

Run a query against each table (or use information_schema to find ALL
tables with a column matching `application_id`, then check each) and
report which tables have rows for this UUID and how many rows each.

**Report this list before deleting anything.**

---

## STEP 2 — CONFIRM THE OWNING USER ACCOUNT

Confirm which `user_id` / account owns this application — this should
be `michael.chen.test@e2go-uat.com` per earlier sessions. Confirm this
account still exists and `terms_acceptance` is present for it (from
the earlier terms-acceptance backfill session — should already be
fine, just confirm).

Do NOT delete the user account itself — only data scoped to the
application.

---

## STEP 3 — DELETE ALL ROWS FOR THIS APPLICATION

For every table identified in Step 1 that has rows for
`application_id = '9f981747-...'`, delete those rows.

**Do NOT delete the `applications` row itself yet** — update it in
place in Step 4 if needed (e.g., reset `status` to `'in_progress'`,
clear any `preparation_status` flags from the prior run), or delete
and recreate it with the SAME id if that's cleaner. State which
approach you're taking and why.

**Safety check before each DELETE:** confirm the WHERE clause scopes
to this exact `application_id` — never a broader delete. Report the
exact SQL for each delete before running it.

---

## STEP 4 — DEFINE THE FRESH DATASET

Design a complete, internally-consistent dataset for Michael James
Chen — Modules 0 through 4 — using the SAME canonical facts that
produced the GOOD cover letter earlier tonight (before the contaminated
re-run), since that version read as coherent and well-structured:

**Canonical investment figures (use these everywhere — Tab F, Tab K,
investment_breakdown, case_brief_json, any net worth calculation):**
- Total investment: $185,000
  - Franchise fee: $1,000
  - Leasehold improvements: $48,000
  - Equipment: $22,000
  - Curriculum materials: $18,000
  - Professional fees: $15,000
  - Marketing: $10,000
  - Working capital: $71,000
  - (sum = $185,000 — verify this arithmetic before inserting)
- Source of funds: $110,000 personal savings (14 years in financial
  services) + $75,000 from sale of Muskoka, Ontario recreational
  property (August 2025) = $185,000
- Total business cost (Tab K / `total_business_cost_usd`): should
  equal or be consistent with the $185,000 total investment for a
  100%-self-funded franchise startup — confirm Tab K's question
  ("total cost to establish or acquire the business") and set this
  to $185,000 unless there's a reason total cost exceeds investment
  (e.g., additional financing not part of the E-2 investment itself —
  if so, document that distinction clearly in case_brief_json so the
  analysis engine doesn't flag a false mismatch)

**Business details (Kumon franchise, Texas):**
- Business name: Chen Learning Centers LLC
- Location: Cedar Park, Texas
- Franchise: Kumon (math and reading instruction)

**Projections (Year 1 / Year 3 — these are SEPARATE from investment
figures, do not let them collide in case_brief_json):**
- Year 1: Revenue $172,800, Net Income $26,400, 75 students
- Year 3: Revenue $358,400, Net Income $143,600, 160 students
- **Important:** $143,600 is the Year 3 NET INCOME PROJECTION, not an
  investment figure. Ensure whatever consistency-check logic compares
  "investment amounts across documents" does NOT compare this against
  the $185,000 investment total — these are different fields
  (`investment_amount_usd` vs. `projected_net_income_y3` or similar).
  If the quality gate's consistency check is naively grepping for
  dollar amounts without distinguishing field semantics, that's a
  SEPARATE bug worth flagging (do not fix in this session — note it).

**Qualifications:**
- 19 years in financial services, Regional Branch Manager at RBC
  Royal Bank, oversaw 47 staff across 3 locations
- Bachelor of Commerce in Finance, McMaster University (2001)
- Certified Financial Planner designation (2005)

**Non-immigrant intent / ties to Canada:**
- Extended family resident in Canada
- Canadian pension entitlements
- RRSP holdings approximately $280,000
- (This was the THINNEST section in the earlier good letter — if you
  have capacity, add 1-2 more specific details here: e.g., a named
  family member/city, or a specific property. Use judgment; do not
  invent implausible specifics. If unsure, leave as-is — this is not
  the priority for this session.)

**Module 4 (voice sample + follow-up) — per Spec2:**
This module was likely INCOMPLETE for this application (it's the
gate to /generate). Write a plausible writing-style sample (150-300
words, first person, casual register, about why Chen chose this
business) that would PASS AI-detection on submission (varied sentence
length, personal details, not template-sounding). Generate or stub
2-3 follow-up responses consistent with the data above.

---

## STEP 5 — INSERT FRESH DATA

Insert the dataset from Step 4 into the appropriate tables (`answers`,
`case_briefs`, `applicant_voice_profile`, `followup_responses`, and
any others identified in Step 1 that need fresh rows for Modules 0-4
to be considered "complete").

After insertion, the application should be in a state where:
- Modules 0-4 are all marked complete
- Navigating to `/apply/module4` and clicking "Generate My Documents"
  (or directly to `/generate/9f981747-...`) would start a FRESH
  generation job (not resume/restart a stuck one — Bug B's fix from
  the prior session should mean any old job is gone since
  `document_generation_jobs` was wiped in Step 3)

---

## STEP 6 — VERIFY

- Query back the inserted data — confirm no conflicting investment
  figures exist anywhere for this application_id (grep all numeric
  fields for $110000, $125000, $143600, $175000, $185000 — the ONLY
  ones that should appear are: $185000 (investment total, multiple
  places), $110000 and $75000 (source of funds components), $143600
  (Year 3 net income — clearly labeled as such, not as investment))
- `npm run build` — confirm clean
- Do NOT trigger generation. Do NOT open the app. This session ends
  with clean data in the database, ready for a generation run as a
  SEPARATE next step (so the owner can trigger it deliberately and
  watch it run).

---

## DO NOT IN THIS SESSION

- Do not trigger generation or call /api/generate/* routes
- Do not open the app in a browser
- Do not modify generation-engine.ts, prompt files, or any code from
  the prior two sessions
- Do not delete the user account (`michael.chen.test@e2go-uat.com`)
- Do not change the application_id

---

## COMPLETION REPORT — report exactly:

```
Chen application wipe and reseed complete.

Step 1 — Tables found with rows for this application_id:
  [list, with row counts]

Step 2 — Owning user account confirmed: [email, terms_acceptance ok]

Step 3 — Deletions performed: [list each table, row count deleted,
  exact SQL used]
  applications row: [updated in place / deleted+recreated — which,
  and why]

Step 4/5 — Fresh data inserted:
  [summarize what was inserted per table/module — confirm investment
  figure arithmetic checks out: $1,000+$48,000+$22,000+$18,000+
  $15,000+$10,000+$71,000 = $185,000]
  Module 4 writing sample: [word count, brief description of content]
  Module 4 follow-up responses: [how many, brief description]

Step 6 — Verification:
  Conflicting figures check: [clean / any remaining issues]
  Build: clean / errors: [list or none]

Flagged (not fixed): [the Year 3 net income vs investment-total
  consistency-check concern from Step 4, if relevant — describe
  whether this is likely to be a real issue based on what you saw
  of the consistency-check code]

Next: Owner navigates to /generate/9f981747-... to trigger fresh
  generation — this will be the first test of: citation fix +
  retry loop fix + job completion status fix + clean data, together.
```

Update BUILD_TRACKER.md with this session.
