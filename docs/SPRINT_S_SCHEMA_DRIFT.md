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
| **S-8** | Marginality score column was split in two | rename + decision | **BLOCKED (needs Romy)** |
| **S-9** | Doc generation progress reports "job not found" | decision | **BLOCKED (needs Romy)** |
| **S-10** | Module 2 never restores saved answers | rename + decision | **PARTIAL** — answer scoping fixed; S-10a blocked |
| **S-11** | Interview-day simulator loads no answers | rename | **DONE** |
| **S-12** | Analysis engine loses follow-up text + voice signals | rename + decision | **PARTIAL** — follow-up text fixed; S-12a blocked |
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
| **S-14** | `rate_limit_hits` table does not exist | decision | **BLOCKED (needs Romy)** |
| **S-15** | Admin reads the empty `simulation_sessions` twin | rename | **DONE** |
| **S-16** | Lifecycle timeline built for a table shape that never shipped | decision | **BLOCKED (needs Romy)** |
| **S-17** | Stripe health check always reports stale | rename | **DONE** |
| **S-18** | Quality dashboard pipeline + FDD panels | rename + decision | **PARTIAL** — pipeline + FDD panels fixed; S-18a blocked |
| **S-19** | Interview prep kit recency | rename | **DONE** |
| **S-20** | Admin user detail — answers + gap analysis | rename + decision | **PARTIAL** — answer scoping fixed; S-20a blocked |

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

## Open decisions blocking completion

| Ref | Question |
|---|---|
| S-8a | Which marginality score replaces the old single one in applicant-facing scoring? |
| S-9a | `document_generation_jobs.document_types` — add column or drop the read? |
| S-10a | What was `referral_consents.category` meant to hold? |
| S-12a | `applicant_voice_profile.content_signals_json` — add or drop? |
| S-14a | `rate_limit_hits` — create the table or remove the admin panel? |
| S-16a | Lifecycle timeline — derive from milestone columns, or add an event table? |
| S-18a | Download-rate metric — is `released_at` acceptable, or is a real download event needed? |
| S-20a | `case_profiles.gap_analysis` — drop from admin view, or does it live elsewhere? |

**Rule for this sprint:** every mechanical rename ships without asking. Every
`decision` task stops and waits. Do not invent a column mapping to keep moving.
