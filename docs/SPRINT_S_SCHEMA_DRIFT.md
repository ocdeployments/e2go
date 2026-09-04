# Sprint S — Schema Drift Repair

**Opened:** September 4, 2026 (Session 129)
**Branch:** `dev` — never commit directly to `main`
**Status doc:** this file. Update the Status column as each task lands.
**Full audit report:** https://claude.ai/code/artifact/e260ac75-d578-45a0-8024-a1f0b4f37695

---

## Why this sprint exists

Every `.from()` call in `src/` and `scripts/` was checked column by column
against the **live** Supabase database. **44 call sites across 30 files and 20
tables reference columns that do not exist.** One references a table that does
not exist.

None of them throw.

`supabase-js` returns `{ data, error }` — it does not throw. A query naming a
missing column returns `data: null` plus an error object. If nothing reads the
error, a failed query is indistinguishable from one that legitimately found
nothing. An empty list renders as an empty state. A null row skips a branch. A
missing customer check waves the customer through. `npm run build`, `tsc` and
jest all pass, because none of them talk to the database.

**Root cause pattern:** `CREATE TABLE IF NOT EXISTS` silently no-ops against a
pre-existing table of a different shape. Migrations reported success; the tables
kept their original columns; the code was written against the migration files.

### Standing rule this sprint establishes

> **The live database is the schema source of truth — not
> `docs/schema_complete.sql`, not the migration files.**
> Before writing or changing any Supabase query, verify the columns against the
> live schema. `docs/schema_complete.sql` is a historical artifact and is known
> to disagree with production.

**How to re-read the live schema** (service role key is in `.env.local`; never
print it):

```bash
set -a && . ./.env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /tmp/spec.json
unset SUPABASE_SERVICE_ROLE_KEY
python3 -c "import json;d=json.load(open('/tmp/spec.json'))['definitions'];print(', '.join(sorted(d['TABLE_NAME']['properties'])))"
```

The swagger `definitions` block lists every table's columns; its `required`
array is the NOT-NULL-without-default set.

**Re-running the full audit:** the scanner used to produce this list is
`scripts/audit-schema-drift.py` (added in S-0). Run it after any query change.

---

## Gates — every task

1. `npx tsc --noEmit` clean
2. `npx jest` clean (185/185 at sprint open)
3. `npm run build` clean
4. **One file per commit**, imperative present tense
5. Push to `dev` (backgrounded — the pre-push Playwright hook takes ~50s)
6. Where the fix is verifiable against live data, verify with a real query
   before marking Done

---

## Task list

Legend — **Status:** `TODO` / `WIP` / `DONE` / `BLOCKED (needs Romy)`
**Kind:** `rename` = code only · `migration` = needs SQL · `decision` = Romy must choose

### P0 — compliance and money

| # | Task | Kind | Status |
|---|---|---|---|
| **S-1** | `profiles` keyed on `id`, not `user_id` — account deletion, restore, recovery, middleware gate | rename | **DONE** |
| **S-2** | GDPR data-subject export — 6 of 13 reads broken | rename | **DONE** — decisions resolved, see below |
| **S-3** | Paid lifecycle email system — `applications.email`/`full_name`/`current_tab` | rename | **DONE** |
| **S-4** | Nurture sequence does not exclude paying customers | rename | **DONE** |
| **S-5** | Stripe webhook + follow-up routes key `application_lifecycle` wrongly | rename | **DONE** |

#### S-1 — `profiles.user_id` does not exist

The primary key is `id` (it *is* the auth user id). Four sites filter on
`user_id`.

- `src/app/api/account/delete/route.ts:34` — soft-delete write. Errors →
  user sees *"Failed to schedule deletion. Please contact support."*
  **Right to erasure does not work.**
- `src/app/api/account/restore/route.ts:27, :38` — status read + clear. Errors →
  *"Account is not scheduled for deletion"* to someone whose account is.
- `src/app/account-recovery/page.tsx:26` — recovery screen cannot read status.
- `src/middleware.ts:260` — **worst of the four.** Failed lookup returns null,
  so `profile?.deleted_at` is falsy and a soft-deleted account is never
  redirected. It keeps full access for the entire 30-day grace period.

**Fix:** `.eq('user_id', x)` → `.eq('id', x)` at all four.
**Verify:** soft-delete a test account, confirm the redirect fires, restore it.

#### S-2 — GDPR export (`src/app/api/account/export/route.ts`)

| Line | Table | Wrong | Correct |
|---|---|---|---|
| 47 | `profiles` | `.eq('user_id')` | `.eq('id')` |
| 48 | `quiz_sessions` | `hard_stops` | `hard_stop_codes` |
| 48 | `quiz_sessions` | `risk_flags` | `risk_flag_codes` |
| 48 | `quiz_sessions` | `treaty_country` | **not stored** — country lives inside `result_json` |
| 48 | `quiz_sessions` | `pricing_tier` | **not stored** |
| 55 | `answers` | `.eq('user_id')` | scope via `applications.user_id` → `application_id` |
| 63 | `case_profiles` | `overall_score` | **no such column** — see decision below |
| 63 | `case_profiles` | `gap_score` | **no such column** — see decision below |
| 78 | `followup_responses` | `response_text` | `answer_text` |
| 71 | `consent_log` | *(pending migration `20260904160000`)* | — |

**S-2a — resolved without asking.** `case_profiles` has no single overall or gap
score; it holds six (`business_plan_score`, `completeness_score`,
`eligibility_score`, `franchise_match_score`, `management_role_score`,
`source_of_funds_score`). All six are exported. Nominating one to stand in for a
column that never existed would have been a guess; exporting everything that is
actually held is not, and for a data access request it errs in the right
direction.

**S-2b — resolved the same way.** `result_json` goes out whole. It holds the
treaty country and the rest of the quiz outcome, which is what the two phantom
columns were reaching for, and it is the record that actually exists. No new
columns needed.

**Impact if unfixed:** a subject access request is answered with a file that
understates what is held about the person.

#### S-3 — paid lifecycle email (`src/lib/email-scheduler.ts`)

Lines `115`, `211`, `304` select `email`, `full_name`, `current_tab` from
`applications`. None exist. Address and name live on `profiles`.

- `email` → join `profiles.email` on `applications.user_id`
- `full_name` → `profiles.full_name`
- `current_tab` → **not a rename.** `last_active_section` and
  `last_active_cluster` exist on `applications` but are dead: nothing in the
  codebase writes them, and every row is null. The place a resume position is
  actually recorded is `application_lifecycle.last_visited_section`, written by
  `useTrackSectionVisit` and already read by `/login`. The scheduler now reads
  that, and `getTabDisplayName` — a map of the letters a–l against the phantom
  column — became `getSectionDisplayName` over the real section slugs.

**Impact if unfixed:** inactivity nudges and post-outcome mail to paying
customers have never sent, since the feature shipped.

#### S-4 — nurture customer exit (`src/lib/quiz-nurture-scheduler.ts:249`)

Filters `applications.email`. Query errors → `paid` is null → the guard reads
that as "not a customer" → **a paying customer can receive the nurture sequence
written for people who have not bought.** Live right now; the cron runs daily at
14:00 UTC.

**Fix:** resolve the address through `profiles` (match `profiles.email`, take
`id`, then check `applications.user_id` + `payment_status = 'paid'`). Also read
and log the query error rather than discarding it.

#### S-5 — `application_lifecycle` is keyed on `user_id`

Not `application_id`. Three writes miss entirely.

- `src/app/api/stripe/webhook/route.ts:106` — `payment_completed_at` is never
  written. **Every funnel and revenue figure derived from it is wrong.**
- `src/app/api/followup/completion-summary/route.ts:139`
- `src/app/api/followup/save-voice-sample/route.ts:166`

**Fix:** resolve `applications.user_id` from the application id, then filter on
`user_id`. Check the returned error on all three.

---

### P1 — features that silently do nothing

| # | Task | Kind | Status |
|---|---|---|---|
| **S-6** | Discrepancy resolution has no storage columns | **migration** | **DONE** — code fixed; migration run in production September 4, 2026 |
| **S-7** | Franchise matching returns `[]` every time | rename | **DONE** |
| **S-8** | Marginality score column was split in two | rename + decision | **DONE** — S-8a shipped |
| **S-9** | Doc generation progress reports "job not found" | decision | **DONE** — S-9a shipped |
| **S-10** | Module 2 never restores saved answers | rename + **migration** | **DONE (code)** — S-10a migration written, **not yet run in production** |
| **S-11** | Interview-day simulator loads no answers | rename | **DONE** |
| **S-12** | Analysis engine loses follow-up text + voice signals | rename + decision | **DONE** — S-12a shipped |
| **S-13** | Case brief cannot find business category | rename | **DONE** |

#### S-6 — `document_discrepancies` (needs SQL)

Live shape: `id, application_id, conflicting_values, created_at, question_key,
question_label`. The code expects `question_id` **and three resolution columns
that do not exist at all**.

- `src/app/api/documents/resolve-discrepancy/route.ts:28` — `question_id` → `question_key`
- `src/app/api/documents/resolve-discrepancy/route.ts:42` — writes `resolved_value`, `resolved_source`, `resolved_at` — **none exist** → 500
- `src/app/api/documents/gap-report/route.ts:132` — `.is('resolved_value', null)` → unresolved count errors
- `src/components/apply/DiscrepancyReviewClient.tsx:40` — list query errors → review UI cannot load

**Migration written:** `supabase/migrations/20260904180000_discrepancy_resolution.sql`
adds `resolved_value text`, `resolved_source text`, `resolved_at timestamptz` and
a partial index on `(application_id) WHERE resolved_value IS NULL`. Additive and
idempotent against an empty table. **🔶 Romy must run it in the Supabase SQL
editor** — until then the gap report's unresolved count and the review UI list
still error.

Also fixed here, found while reading the same flow: `/api/documents/extract`
inserted discrepancies naming the in-memory `question_id`, so **no discrepancy
row has ever been stored** — the table is empty because every insert errored,
not because no conflicts were ever found. And the resolve route's `answers`
upsert carried a `user_id` that table does not have.

#### S-7 — `src/lib/franchise-matcher.ts:84`

| Wrong | Correct |
|---|---|
| `min_investment` | `investment_min` |
| `max_investment` | `investment_max` |
| `min_net_worth` | **not stored** — drop from select |
| `active` | `e2_eligible` |

Query errors → `rows` null → `return []` before any scoring.
Note: `franchise_brands` is also currently **0 rows**; fixing the query is
necessary but not sufficient for matching to produce output.

#### S-8 — `case_briefs.marginality_score`

Live table has `marginality_contribution_score` and `marginality_income_score` —
the single column was split. Three readers still ask for the old name.

- `src/lib/case-profile.ts:190`
- `src/app/api/simulator/interview-prep/route.ts:241` — this one is a
  `.single()` inside a `Promise.all`, so **the whole case brief drops out of the
  interview-prep prompt**, not just that number
- `src/app/admin/intelligence/page.tsx:65` — uses `marginality_score_direct`

**🔶 DECISION FOR ROMY (S-8a):** which of the two replaces the old single score
in `case-profile.ts` — contribution, income, or the lower of the two? This
feeds applicant-visible scoring, so it is a product call, not a mechanical one.

#### S-9 — `document_generation_jobs.document_types`

Not a column. `src/app/api/generate/progress/[jobId]/route.ts:44` selects it, the
query errors, and the SSE client is told **"job not found" while the job is
running normally.** `src/lib/generation-engine.ts:2276` reads the same phantom.

**🔶 DECISION FOR ROMY (S-9a):** add a real `document_types text[]` column, or
drop it from both selects? The engine only reads `client_regen_note` from that
row, so dropping is viable.

#### S-10 — `src/app/apply/module2/page.tsx`

- `:140` — `answers` filtered on `user_id`; scope via `application_id`
  (`applicationId` is already in scope on the line above)
- `:157` — `referral_consents.category` **not stored**

**Impact:** every return visit to Module 2 shows blank fields even though the
answers are saved.

**🔶 DECISION FOR ROMY (S-10a):** what was `referral_consents.category` meant to
hold? Live columns are `consent_at, consent_given, created_at, email, id,
referral_code, referred_by, user_id`.

#### S-11 — `src/app/simulator/interview-day/page.tsx:124`

`question_id` → `question_key`, `answer_text` → `answer_value`.
Answer map comes back empty, so the simulator falls back to defaults for child
count, franchise status and investment source instead of the real case.

#### S-12 — `src/lib/analysis-engine.ts`

- `:123` — `followup_responses.response_text` → `answer_text`
- `:133` — `applicant_voice_profile.content_signals_json` **not stored**

Both feed document generation prompts. The applicant's own words are quietly
absent from the material the generator works from.

**🔶 DECISION FOR ROMY (S-12a):** `content_signals_json` — add the column, or
drop the read? Live voice-profile columns are `voice_profile_text`,
`voice_sample_raw`, `formality_register`, `sentence_length_avg`,
`vocabulary_level`, plus the AI-detection fields.

#### S-13 — `src/app/api/generate/case-brief/[applicationId]/route.ts:73`

`quiz_sessions` has no `application_id`; quiz rows join to a person by
`user_id`. Resolve `applications.user_id` first, then query quiz sessions by
that.

---

### P2 — admin dashboards reading zero

| # | Task | Kind | Status |
|---|---|---|---|
| **S-14** | `rate_limit_hits` table does not exist | **migration** | **DONE (code)** — S-14a migration written, **not yet run in production** |
| **S-15** | Admin reads the empty `simulation_sessions` twin | rename | **DONE** |
| **S-16** | Lifecycle timeline built for a table shape that never shipped | decision | **DONE** — S-16a shipped |
| **S-17** | Stripe health check always reports stale | rename | **DONE** |
| **S-18** | Quality dashboard pipeline + FDD panels | rename + decision | **DONE** — S-18a shipped |
| **S-19** | Interview prep kit recency | rename | **DONE** |
| **S-20** | Admin user detail — answers + gap analysis | rename + decision | **DONE** — S-20a shipped |

#### S-14 — `src/app/admin/intelligence/page.tsx:67`

Queries table `rate_limit_hits`, which is **not in the database at all**.
PostgREST suggests *"perhaps you meant interview_prep_kits"*.

**🔶 DECISION FOR ROMY (S-14a):** create the table (rate limiting currently runs
through Upstash Redis, not Postgres), or remove the panel?

#### S-15 — `src/app/admin/users/[userId]/page.tsx:95`

Two near-identical tables exist. `simulator_sessions` holds the data (6 rows,
has `readiness_indicator`). `simulation_sessions` has **0 rows and no such
column**. The page queries the empty one.

**Fix:** `simulation_sessions` → `simulator_sessions`.
**Follow-up:** `simulation_sessions` is a dead duplicate — candidate for removal
in a later sprint. Do not drop it in this one.

#### S-16 — `application_lifecycle` as an event log

Three admin views render it with `event` and `details` columns. The live table
is the opposite design: **one timestamp column per milestone**
(`module1_completed_at`, `payment_completed_at`, `quiz_completed_at`, …). There
is no event feed to read.

- `src/app/admin/users/[userId]/view/page.tsx:45`
- `src/app/admin/users/[userId]/page.tsx:97`
- `src/app/admin/revenue/page.tsx:87`

**🔶 DECISION FOR ROMY (S-16a):** rebuild the timeline UI to derive events from
the milestone timestamp columns (recommended — the data is all there), or add a
real event-log table? The revenue page's funnel depends on this.

#### S-17 — `src/app/api/admin/health-detail/route.ts:127`

`processed_webhook_events` stamps `processed_at`, not `created_at`. The route
orders on `created_at`, errors, and reads that as "no webhook in 24h" — **a
monitor that can only ever say unhealthy.**

#### S-18 — `src/app/admin/quality/page.tsx`

| Line | Wrong | Correct |
|---|---|---|
| 117 | `generation_pipeline_log.created_at` | `pipeline_started_at` |
| 134 | `generation_pipeline_log.downloaded_at` | `released_at` — **semantics differ**, see below |
| 124 | `fdd_analyses.low_confidence_count` | **not stored** |

**🔶 DECISION FOR ROMY (S-18a):** `released_at` means "released to the
applicant", not "downloaded by them". If the download-rate metric is meant to
measure actual downloads, that event is not recorded anywhere and needs a column
or a different source. Say which you want before this ships.

#### S-19 — `interview_prep_kits.created_at` → `generated_at`

- `src/app/api/case/completion/route.ts:193`
- `src/app/api/dashboard/case-profile/route.ts:214`

#### S-20 — `src/app/admin/users/[userId]/view/page.tsx`

- `:41` — `answers` filtered on `user_id`; scope via `application_id`
- `:46` — `case_profiles.gap_analysis` **not stored**

**🔶 DECISION FOR ROMY (S-20a):** drop the gap-analysis column from the admin
view, or is that data expected to live somewhere else?

---

## Confirmed clean

Checked and matching the code that touches them: `email_log`,
`email_verifications`, `uploaded_documents`, `payments`, `terms_acceptance`,
`simulator_sessions`, `llm_cost_log`, `generated_documents`, `quiz_nurture_log`,
`email_suppressions`, and the remaining 43 tables.

**No insert anywhere omits a required NOT NULL column** — the second half of the
`consent_log` failure is not repeated.

**Correction to an earlier session note:** `verify-token.ts` writing
`verified_at` was flagged as a suspected bug. It is not — that column exists on
`email_verifications`. Likewise the two conflicting `email_log` migrations turned
out harmless; the live shape matches the code.

---

## Carried in from Session 129 (pre-sprint)

Already shipped and pushed on `dev` before this sprint opened:

- `2fb66db` migration `20260904160000_fix_consent_log_shape.sql` — **run in
  production by Romy on September 4, 2026.**
- `70c81e8` Module 1 consent now recorded through `/api/consent/log` (drops the
  hardcoded `ip_hash: "local-hash"` placeholder)
- `8c29240` onboarding consent-log responses are now checked

---

## Progress — September 4, 2026

Every mechanical rename in this sprint has shipped, both migrations have been run
in production, and the code was deployed by hand the same evening. What remains
is the eight decisions below.

Verified by re-running `scripts/audit-schema-drift.py --refresh` against live
after the migrations: the only findings it still reports are the eight
decision-blocked ones, and the "inserts missing required columns" section is
empty. `npx tsc --noEmit` clean, jest 185/185, `npm run build` clean.

**✅ Migrations run in production — September 4, 2026, by Romy:**

1. `supabase/migrations/20260904160000_fix_consent_log_shape.sql` (Session 129)
   — `consent_log` now carries `consent_type`, `consent_given` and `created_at`,
   and `tos_version`/`action` are no longer NOT NULL, so the application's
   inserts can land. Confirmed live: the table's `required` set is now `[id]`.
2. `supabase/migrations/20260904180000_discrepancy_resolution.sql` (S-6) —
   `document_discrepancies` now carries `resolved_value`, `resolved_source` and
   `resolved_at`, plus the partial index on unresolved rows. Confirmed live.

Both tables are still empty, which is expected — neither has ever been able to
accept a write. They fill from here.

**Deployed:** production deployment `e2go-7zvoahv3c` (Ready), plus the one
before it, both from the `dev` working tree. `https://e2go.vercel.app` serving
200 on `/` and `/quiz`.

## Decisions — resolved by Romy, September 4, 2026

All eight were put to Romy one at a time and answered the same evening. Two of
them turned out to be mis-stated in the original audit; the corrected statement
is given below, not the one that was asked.

| Ref | Decision | Shape |
|---|---|---|
| S-8a | Gap Report speaks in the stored label, not a percentage | code |
| S-9a | Drop the `document_types` reference | code |
| S-10a | Fix the `referral_consents` table shape | migration + code |
| S-12a | Drop the `content_signals_json` hook | code |
| S-14a | Build the rate-limit logging | migration + code |
| S-16a | Derive the timeline and funnel from the timestamp columns | code |
| S-18a | Measure acknowledgement, and relabel the metric honestly | code |
| S-20a | Drop `gap_analysis`; surface the six scores that do exist | code |

### S-8a — marginality is a label, not a number

**The audit mis-stated this.** It is not a rename: the old numeric 0-1 score
exists nowhere in the live database. `case_briefs` carries
`marginality_income_score` and `marginality_contribution_score`, and both hold
three-level text — `ADEQUATE` / `WEAK` / `CRITICAL` — written by
`src/app/api/analysis/run/route.ts:55-56`. `PackageSummary.tsx:94-105` already
reads them correctly as labels.

`gap-analysis-engine.ts:406-409` expects a number and prints
`Math.round(brief.marginality_score * 100)%`. That percentage has never once
been produced. Deriving one from a label would fabricate precision that was
never measured, so the finding is rewritten to speak in the labels' own terms.

Also expecting a number, and to be corrected the same way: `simulator-engine.ts:207`,
`case-profile.ts:190`, `simulator/interview-prep/route.ts:241`,
`gap-analysis/page.tsx:32`, `admin/intelligence/page.tsx:33,65,112`.

### S-9a — `document_types` (severity higher than recorded)

Because supabase-js fails the whole select when one column name is wrong, this
is not a cosmetic count problem:

- `api/generate/progress/[jobId]/route.ts:45` — the select errors, so the first
  tick of the SSE stream sends `"Job not found"` and closes. **Every client who
  starts a generation sees the live progress bar fail immediately.** Documents
  still generate correctly in the background.
- `generation-engine.ts:2275` — reads `document_types` alongside
  `client_regen_note`. Same failure, so **a client's redraft note is silently
  discarded** and never reaches the model.

`total_steps` exists and is already the fallback, so dropping the reference
restores both with no migration.

### S-10a — `referral_consents` is the wrong table (broader than recorded)

**The audit recorded one read; there are three sites, two of them writers.**
Migration `20260605150000_module1_consent_tables.sql` intended a table of
`(user_id, category, consent_given)` with `UNIQUE (user_id, category)`. A table
of that name already existed with a refer-a-friend shape
(`referral_code`, `referred_by`, `email`), so `CREATE TABLE IF NOT EXISTS`
silently no-opped. The migration reported success and changed nothing.

- `apply/module1/page.tsx:179` — upsert with `onConflict: "user_id,category"`. Fails.
- `onboarding/page.tsx:229` — same. Fails.
- `apply/module2/page.tsx:166` — reads it back to gate the franchise-consultant
  offer at line 521. Always reads nothing.

So **no client's referral consent has ever been recorded, and the
franchise-consultant offer has never appeared for anyone.** The table holds zero
rows and no code uses the refer-a-friend columns, so reshaping it is risk-free.

### S-12a — drop the hook

`analysis-engine.ts:133` reads a `content_signals_json` column that never
existed and that nothing has ever written. It is one of three text sources the
experience scorer scans (`analysis-engine.ts:215-219`); the other two — Tab J
and follow-up answers — work.

Considered and rejected: pointing the scorer at `voice_sample_raw`, which is
stored. That column holds the Module 4 motivation essay ("I chose this business
because…"), not a background statement. Keyword-scanning it produces false
positives — "my sister managed a restaurant" scans like the client managed one —
and a wrongly inflated experience score is worse than a missing one, because the
Gap Report would then stop telling that client to substantiate their background.
Deleting the query changes no behaviour.

### S-14a — build the logging

Rate limiting is real and working: `middleware.ts:43-47` enforces 5 logins per
15 minutes and 3 quiz submissions per hour through Upstash Redis. Redis counts
and forgets, so nothing is written down. `admin/intelligence/page.tsx:67` queries
a `rate_limit_hits` table that has never existed; its warning banner (line 203)
renders only when the count exceeds zero, so it can never appear.

Romy chose to build it. Constraint: middleware runs on every request, so the
write happens **only on a block**, and fire-and-forget, so a successful request
never waits on a database round trip.

### S-16a — derive from the timestamps

`application_lifecycle` is a one-row-per-client **state** table with ~40
timestamp columns. It has no `event` and no `details`. Four places treat it as
an event log:

- `admin/users/[userId]/page.tsx:97` and `.../view/page.tsx:59` — the client
  activity timeline. Always empty.
- `admin/revenue/page.tsx:161-163` — `quizCompleted` and `caseActive` filter on
  `e.event`, so **both always read zero and the revenue page under-reports the
  top of the funnel.**
- `api/generate/start/route.ts:207` — inserts `{application_id, event, ...}`.
  Fails silently, and would be wrong even if it worked: one row per client means
  an insert creates a duplicate. To be removed, not repaired.

Everything the first three want is derivable from columns already populated, and
derivation works retroactively for existing clients. An event table would start
empty.

### S-18a — measure what is actually recorded

`admin/quality/page.tsx:151` asks for `downloaded_at` on
`generation_pipeline_log`. It does not exist, so `acknowledgedCount` and
`downloadedCount` (lines 214-215) both read zero. Nothing anywhere records a
file download.

The table does record `released_at` (documents made available) and
`acknowledged_at` / `applicant_acknowledged` (client confirmed seeing them). The
metric is rebuilt on those and **relabelled** — "acknowledged", not
"downloaded". Naming it accurately matters more than preserving the old word.

### S-20a — drop it, and show what exists

`admin/users/[userId]/view/page.tsx:60` asks for `gap_analysis` on
`case_profiles`. There is no such column, and no gap-analysis table anywhere in
the live database — gap analysis is computed on demand, never stored.

Because one bad name fails the whole select, the three columns requested
alongside it are lost too: **archetype, completeness score and last-updated all
render blank at lines 118-123 despite existing and being populated.** Removing
the one name restores the block; the five further scores `case_profiles` holds
(eligibility, business plan, source of funds, management role, franchise match)
are surfaced alongside it.

**Rule for this sprint:** every mechanical rename ships without asking. Every
`decision` task stops and waits. Do not invent a column mapping to keep moving.

---

## Sprint S closed — September 4, 2026

All eight decisions are implemented. `npx tsc --noEmit` clean, jest 191/191.

| Ref | What shipped | Commits |
|---|---|---|
| S-8a | `src/lib/case-brief-scores.ts` — one reader for the stored vocabulary. Gap engine, gap page, case profile, interview prep, simulator engine and the admin intelligence panel all read labels now. | `a60f7f4` `8fee8d2` `54ceff7` `90d5970` `f835e13` `fc319be` `da2b49e` |
| S-9a | Progress route stopped preferring the absent `document_types` array. | `53a4e96` |
| S-10a | `20260904210000_referral_consents_shape.sql` — **awaiting production run.** | `b6e3a9c` |
| S-12a | Dead content-signals source removed from experience scoring. | `99fbf42` |
| S-14a | `20260904220000_rate_limit_hits.sql` — **awaiting production run** — plus the middleware writer and the rebuilt panel. | `612aa8b` `30a76b4` `0690ac6` |
| S-16a | Timeline and revenue funnel derived from the lifecycle milestone columns. | `8b5920a` `653d686` `890817b` `d2d2e76` `60583fc` |
| S-18a | Download rate replaced with release/acknowledgement, relabelled honestly. | `bfc0082` |
| S-20a | `gap_analysis` dropped; the six stored scores surfaced; completeness no longer renders as 7000%. | `ed47999` `d48cb61` |

### Two things beyond the recorded scope

**S-8a was wider than "one renamed column."** Every one of the eight `*_score`
columns on `case_briefs` is TEXT holding `STRONG | ADEQUATE | WEAK | CRITICAL |
PENDING`, and three separate readers were doing arithmetic on them — `>= 0.7`,
`< 0.4`, `Math.round(x * 100)`. Fixing only the column name would have unblocked
each select and then compared `"ADEQUATE" >= 0.7`, which is false, sending every
client down the "high denial risk" branch. Hence one shared module rather than
six local patches.

`src/lib/simulator-engine.ts` carried the same defect in a form the audit script
cannot see. It selects `*`, so `marginality_score`, `develop_direct_score` and
`risk_flags` produced **no error at all** — they were simply `undefined`, and the
three weak-point probe questions they gate (WP-01/02/03) have never been asked of
any client. `select('*')` is the silent variant of this whole sprint's bug, and
nothing in the tooling detects it.

Also found while there: `denial_risks` is a real column that the analysis run has
never written. The same list is inside `case_brief_json`, so the simulator reads
it from there.

**S-10a was worse than recorded.** Beyond the missing `category` column,
`referral_consents` has `email` and `referral_code` as NOT NULL with no defaults —
so even a corrected conflict target would still have failed every insert. The
migration relaxes both. The orphan columns are kept rather than dropped: nothing
in this repo writes them, and dropping is irreversible for no gain.

### Still open — two migrations to run

Neither table is written or read correctly until these run in the Supabase SQL
editor. Both are safe: `referral_consents` has 0 rows and `rate_limit_hits` does
not exist yet.

1. `supabase/migrations/20260904210000_referral_consents_shape.sql`
2. `supabase/migrations/20260904220000_rate_limit_hits.sql`

After the first, verify the three consent sites: `apply/module1/page.tsx:171`
(`saveReferralConsents`), `onboarding/page.tsx:225` (`handleOfferResponse`), and
the franchise-consultant gate at `apply/module2/page.tsx:521`, which reads
`module1ReferralConsent?.franchise` and has therefore never appeared for anyone.

### What this sprint could not have caught

`npx tsc --noEmit`, jest and `npm run build` all pass against every bug in this
document, because none of them talks to the database. `scripts/audit-schema-drift.py`
is the only gate that does, and it is blind to `select('*')`. Run it before
shipping any query change:

```
set -a && . ./.env.local; set +a && python3 scripts/audit-schema-drift.py --refresh
```
