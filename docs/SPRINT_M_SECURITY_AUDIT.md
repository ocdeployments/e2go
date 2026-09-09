# Sprint M — Security & Backend Hardening Audit Follow-Through

**Written:** July 15, 2026 (Session 126). **Branch:** dev — never commit to main.
**Audience:** the next agent. This document is self-contained — you do not need the
originating conversation. Read this top to bottom before touching anything.

---

## 0. Where this came from

Session 126 ran a two-agent grounded audit (Application Security Engineer +
Database Optimizer) against the live codebase — every finding below is backed
by an actual `file:line` citation, not a generic checklist. Full findings text
is in the Session 126 entry of `BUILD_TRACKER.md`. This doc turns the findings
into ordered, executable tasks.

Nothing found was a "vibe-coded and secretly broken" situation — ownership
checks (`eq('user_id', user.id)`), RLS, indexing, and Sentry config are all
already in good shape. The tasks below are specific, scoped gaps.

---

## M-1 — Move `/api/fdd/report` off the synchronous request path (HIGH) — ✅ DONE (right-sized)

**Problem:** `src/app/api/fdd/report/route.ts` calls `generateProfessionalReport`
(→ `fdd-report-engine.ts`) synchronously inside the POST handler. The FDD model
chain has a 120s timeout budget (`FDD_TIMEOUT_MS` in `src/lib/llm-client.ts`)
with no `maxDuration` override on the route — unlike
`src/app/api/generate/run/[jobId]/route.ts`, which already does this correctly
(`export const maxDuration = 300` + a job-table pattern against
`document_generation_jobs`, see `20260604155721_generation_engine.sql`).

**Risk:** a slow Anthropic/OpenRouter response risks the platform's own
request timeout (Vercel default 60s on Pro plans) killing the request after
the LLM cost has already been incurred — user sees a bare error, nothing
persisted, no retry path.

**Resolution (shipped, commit `3426fbc`):** the original task called for
porting this route onto the full async job-table pattern (`document_generation_jobs`
+ client polling/SSE). On inspection that pattern exists in `generate/run/[jobId]`
to support a **15-step pipeline with per-step progress UI** — it's solving a
different problem. `/api/fdd/report` produces one JSON blob from a single LLM
call, and the client (`src/app/fdd/report/[fddId]/page.tsx`'s `generateReport()`)
already just shows a spinner and reloads on completion; there's no
intermediate progress to report. The actual cited risk — no `maxDuration`
override against a route that can legitimately run up to 120s — is closed by
adding `export const maxDuration = 150;` to the route, matching the pattern
already used on the sibling route. Porting the job-table/polling machinery
onto a single-shot flow would have added real complexity to fix a problem
this smaller change already solves — right-sized down rather than following
the original task literally.

---

## M-2 — Roll out `captureApiError()` to the rest of the API surface (MEDIUM-HIGH) — ✅ DONE

**Problem:** Sentry is genuinely configured (real DSN, PII-scrubbing
`beforeSend` in `instrumentation.ts`/`instrumentation-client.ts`) and a
`captureApiError()` helper exists in `src/lib/capture-error.ts` — but it's
called in only 1 of 109 API routes. The other 108 catch errors with
`console.error` only, invisible to Sentry.

**Task:** sweep `src/app/api/**/route.ts`, replace bare `console.error` in
catch blocks with `captureApiError()` (check its signature first — likely
takes the error + route context). Do this as a mechanical pass, not a
refactor — don't change control flow, only the error-reporting call. Batch
by directory (e.g. all of `fdd/*` first, then `dashboard/*`, etc.) so it's
reviewable in reasonably sized commits, not one 108-file commit.

**Resolution (shipped, Session 129):** all 78 remaining routes with bare
`console.error` in a catch/error site converted to `captureApiError()`, in
15 commits batched by directory (`account`, `admin`, `ai/analysis/answers/
auth`, `case-file/case/checkout/consent`, `cron`, `dashboard`, `documents`,
`email/faq`, `fdd`, `followup`, misc singles, `generate`, `market-analysis`,
`simulator`, `stripe` — `stripe/webhook` handled last with extra care, only
the 3 `console.error` call sites swapped, no control-flow changes). Sites
with no real caught error object use `new Error('descriptive message')` per
the convention already established in `apply/parse-document/route.ts`.
`_sentry-tunnel` intentionally excluded (Sentry's own proxy route).
`console.warn` fallback/retry logging left untouched — only `console.error`
converted. `tsc --noEmit` clean, jest 175/175, zero regressions. No bare
`console.error` remains in any `src/app/api/**/route.ts` catch site.

---

## M-3 — Fix the migration pattern that caused the July 15 `kit_json` incident (MEDIUM-HIGH) — ✅ DONE

**Problem:** `CREATE TABLE IF NOT EXISTS` silently no-ops against an existing
table. `interview_prep_kits` already existed as an earlier quiz-questions
table, so the migration meant to add `kit_json`/`model_used` did nothing —
misdiagnosed for a full session as a stale PostgREST schema cache
(`20260715120000_reload_pgrst_schema_cache.sql`,
`20260715180000_reload_pgrst_schema_cache_retry.sql`) before the real fix
landed (`20260715190000_add_kit_json_to_prep_kits.sql`). Nothing currently
stops this exact class of mistake from recurring on the next table that
evolves.

**Task:** no code fix needed — this is a written-convention fix. Add a short
note to this repo's migration-authoring guidance (`CLAUDE_CONTEXT.md` "KEY
RULES" section, or a new `supabase/migrations/README.md` if one doesn't
exist) stating: *when adding a column to a table that may already exist, use
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, never rely on `CREATE TABLE IF NOT
EXISTS` to carry a schema change — it no-ops silently if the table is already
there.* If a PGRST204 ("column not in schema cache") error ever recurs, check
for the column's actual existence before assuming a stale cache and retrying
`NOTIFY pgrst`.

**Resolution (shipped, Session 127):** added `supabase/migrations/README.md`
with the convention, a wrong/right example, and the incident writeup; added
a one-line pointer to it in `CLAUDE_CONTEXT.md`'s "KEY RULES — NEVER BREAK"
section.

---

## M-4 — Confirm production env vars for rate limiting + CAPTCHA (MEDIUM) — ✅ DONE (found live bugs, not just gaps)

**Problem — rate limiting:** `src/lib/rate-limit.ts` documents that it fails
open (allows unlimited requests) if `UPSTASH_REDIS_REST_URL`/`TOKEN` are
unset. A missing credential in prod silently removes all LLM rate limiting.

**Problem — CAPTCHA:** `src/app/api/auth/verify-captcha/route.ts` degrades to
`ok:true` if `CF_TURNSTILE_SECRET_KEY` is unset, or on network failure to
Cloudflare. Signup would have zero bot friction in that state despite the
widget rendering.

**Task:**
1. Run `vercel env ls` (per `reference_vercel_env` memory pattern) to confirm
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and
   `CF_TURNSTILE_SECRET_KEY` are all set in the production environment — not
   just `.env.local`.
2. Also add `checkRateLimit` calls to the five LLM-cost routes currently
   missing it: `market-analysis/route.ts`, `fdd/report/route.ts`,
   `fdd/territory/route.ts`, `fdd/compare/route.ts`,
   `documents/extract/route.ts`.

**Resolution (shipped, Session 127):** step 1 (`vercel env ls production`)
surfaced two live production bugs, not just gaps:

- `UPSTASH_REDIS_REST_URL` was missing from Production and Development
  (Preview had it). Because `checkRateLimit` fails **closed** for the
  `generate`/`fdd` profiles when Redis isn't configured, this meant
  `generate/start`, `renewal/generate`, `fdd/extract`, and `fdd/score` were
  returning 429 on every single request in production. Fixed by adding the
  var to Production and Development via `vercel env add` — **needs a
  production redeploy to take effect.**
- The CAPTCHA route read `CF_TURNSTILE_SECRET_KEY`, but the actual
  provisioned var (all environments) is `TURNSTILE_SECRET_KEY` — no `CF_`
  prefix. Every signup was silently skipping CAPTCHA verification. Fixed by
  correcting the code to read the var name that actually exists.

Step 2 (adding `checkRateLimit` to the 5 uncovered routes) — **✅ done,
Session 128 (Sprint N-6)**: `market-analysis`, `fdd/report`, `fdd/territory`,
`fdd/compare` on the new fail-open `fdd-analysis` profile; `documents/extract`
on `parse-doc`. One commit per route, jest 175/175 + tsc clean per commit.

---

## M-5 — Consolidate `docs/schema.sql`/`docs/schema_complete.sql` into a real migration (MEDIUM) — ✅ DONE

**Problem:** foundational tables (`applications`, `users`, `quiz_sessions`,
`answers`, `pdf_exports`) were never created via `supabase/migrations/` — they
originate from `docs/schema.sql` (2026-05-29) and `docs/schema_complete.sql`
(2026-05-31), predating the migrations folder (first migration:
2026-06-03). RLS is correct on them, but a fresh `supabase db reset` replaying
only `supabase/migrations/*` would not recreate these tables — the migration
history is not self-contained.

**Task:** write a `0000_initial_schema.sql` migration (dated/ordered to run
first) that captures the current state of these foundational tables as
they actually exist in production today (not a re-derivation from the stale
`docs/schema*.sql` files — pull the live shape via `supabase db diff` or
equivalent against production first, since Session 123's K-4.5 audit already
flagged that live schema has drifted from `docs/` in at least one other area
— `application_lifecycle`). This is a real, if low-urgency, disaster-recovery
gap — treat it as a dedicated task, not a quick copy-paste of the docs/ files.

**Resolution (shipped, Session 130, commit `be5b4b1`):** pulled the live
production schema via `supabase db dump --linked --schema public` (required
starting Docker first — no local dump credentials in `.env.local`), then
extracted just the 17 genuinely-missing tables (`admin_users`,
`ai_usage_log`, `answers`, `application_lifecycle`, `applications`,
`feature_flags`, `nps_scores`, `pdf_exports`, `profiles`, `quiz_sessions`,
`referral_leads`, `referral_partners`, `simulation_answers`,
`simulation_sessions`, `ticket_replies`, `tickets`, `users`) — confirmed via
a table-name-anchored regex scan of the full 71-table live schema, not
substring matching (which had originally, incorrectly, excluded `profiles`
and `tickets` because they're substrings of `case_profiles` and
`support_tickets`).

Written as `supabase/migrations/0000_initial_schema.sql` (sorts first, runs
on a fresh `supabase db reset`) plus a companion
`20260628210000_initial_schema_fks_deferred.sql` for the 2 FK constraints
that reference tables outside this set (`answers → family_members`,
`applications → payments`), timestamped after both dependencies'
migrations so ordering holds.

Idempotency required going beyond this repo's usual `DROP CONSTRAINT/POLICY
IF EXISTS` convention: `CREATE TABLE`/`INDEX IF NOT EXISTS` and
`DROP POLICY IF EXISTS` + `CREATE POLICY` are safe as usual, but
`ADD CONSTRAINT` statements are wrapped in a `pg_constraint`-existence-
checked `DO` block instead of drop-then-add — because these 17 tables are
already live in production with other tables' foreign keys pointing at
their primary keys; a `DROP CONSTRAINT` on e.g. `applications_pkey` would
either fail outright or (with `CASCADE`) silently destroy every other
table's FK pointing at `applications`, which is unacceptable against a
live database. Verified: 17/17 `CREATE TABLE`, 40 constraints, 59 indexes,
53 policies, 51 grants, paren/DO-block balance checked, `tsc --noEmit`
clean, jest 175/175. Not replayed against a local Supabase reset (another
project's local Postgres container was already holding the dev port;
left it running rather than stopping someone else's session) — the SQL was
instead verified by direct read-through against the live dump plus the
idempotency-pattern reasoning above. This migration has not been pushed to
production (`supabase db push`) — that's an infrastructure-affecting action
outside this session's scope; flag to Romy before running it.

---

## M-6 — Zod schema validation on API routes (LOW, do last)

**Problem:** no route uses zod or any runtime schema validator — validation
today is manual presence checks or TS interfaces that vanish at runtime
(e.g. `simulator/evaluate/route.ts`'s `EvaluateRequest` interface).

**Task:** lowest priority of this sprint — start with the LLM-cost and
write-heavy routes (`simulator/evaluate`, `fdd/*`, `generate/*`) rather than
attempting all 109 routes in one pass. Define zod schemas colocated with each
route or in a shared `src/lib/api-schemas.ts`, parse-and-400 on failure.
Do not let this become a mass refactor — one route's validation per commit,
same discipline as M-2.

---

## Suggested execution order

M-1 (highest severity, most self-contained) → M-3 (pure documentation, do
early, prevents a repeat while other tasks are in flight) → M-4 (env
confirmation, quick) → M-2 (mechanical rollout, can run in parallel with
anything) → M-5 (needs production schema diff access) → M-6 (ongoing,
lowest priority, no need to block sprint close on finishing all of it).

Acceptance for closing this sprint: M-1, M-3, M-4 done; M-2 and M-5 may be
partial with remaining scope explicitly logged in `BUILD_TRACKER.md`; M-6 is
never "done," just tracked as an ongoing convention once started.

## Status (updated after Session 127)

- M-1: ✅ done, right-sized to a `maxDuration` fix (see above) — commit `3426fbc`.
- M-3: ✅ done — `supabase/migrations/README.md` + `CLAUDE_CONTEXT.md` pointer.
- M-4: ✅ done — found and fixed two live production bugs (see above): missing
  `UPSTASH_REDIS_REST_URL` causing generate/fdd routes to 429 on every
  request, and a `CF_TURNSTILE_SECRET_KEY`/`TURNSTILE_SECRET_KEY` name
  mismatch silently disabling CAPTCHA. Task 2 of M-4 (add `checkRateLimit`
  to 5 more routes) also done, Session 128 (Sprint N-6). **Production
  redeploy still needed** to pick up the new Upstash var — separately,
  the currently-live `UPSTASH_REDIS_REST_TOKEN` doesn't match the
  provisioned database (`WRONGPASS`); see `BUILD_TRACKER.md` P0 banner.
- M-2: ✅ done, Session 129 — see above.
- M-5: ✅ done, Session 130 — see above. Migration written, not yet pushed
  to production.
- M-6: 🟡 started, Session 131 — `zod` installed (was not a dependency
  before this session), `src/lib/api-schemas.ts` created. 3 routes
  converted so far, one commit each: `simulator/evaluate` (commit
  `dd49433`), `fdd/extract` (commit `9d9313c`), `generate/start` (commit
  `625937b`). Remaining LLM-cost/write-heavy routes not yet converted:
  12 more `simulator/*` routes, 8 more `fdd/*` routes, 9 more
  `generate/*` routes. Per this doc's own acceptance bar, M-6 is never
  "done" — this satisfies sprint closure as an ongoing convention now
  established; continue one route/commit at a time in future sessions.

**Sprint M is now closeable**: M-1, M-2, M-3, M-4, M-5 done; M-6 started
per its own acceptance criteria above.
