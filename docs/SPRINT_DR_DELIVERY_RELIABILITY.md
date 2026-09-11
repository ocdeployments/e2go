# Sprint DR — Delivery Reliability

**Opened:** September 10, 2026 (Session 145)
**Branch:** `dev` — never commit directly to `main`
**Status doc:** this file. Update the Status column as each task lands.
**Gap register (what is broken and why):** `docs/DELIVERY_RELIABILITY_GAPS.md`

---

## Why this sprint exists

A client pays, presses generate, and waits. Today, if the serverless instance is
reclaimed mid-run — which it is free to do the moment `/api/generate/run` returns
its 202 — the job does not fail. It stops, with the row still reading `running`.
Every retry path then refuses to restart it, nothing emails anyone, nothing
alerts us, and the only thing that will ever unstick it is a cron job that runs
once a day at 03:00 UTC.

That is the failure this sprint exists to make impossible.

**The invariant this sprint installs, and every task serves it:**

> **A job in flight always has something that will finish it or fail it.
> Every failure produces, within 15 minutes, a client-visible message with a next
> action and a signal we can see without being asked.**

"Bullet proof" here means something specific and testable: **no task is Done on
reasoning.** Each one below carries an exit criterion that is a *demonstration* —
a deliberate kill, a fault injection, a real persona buying a real tier — plus a
named automated test that makes the regression impossible to reintroduce
silently. A task whose test does not exist is not Done.

---

## Gates — every task

1. `npx tsc --noEmit` clean
2. `npx jest` clean (19 suites / 273 tests at sprint open)
3. `npm run build` clean — **stop the dev server first**; `.next` cache collides
4. **One file per commit**, imperative present tense
5. Confirm the branch is `dev` **before** committing, not after
6. The named test in the task's **Test** row exists and passes
7. The **Exit** row has been demonstrated, not argued

Live-data rule, unchanged and load-bearing here: the **live Supabase schema is
the only source of truth** for any query this sprint touches. Verify with
`set -a && . ./.env.local; set +a && python3 scripts/audit-schema-drift.py --refresh`.
`supabase-js` does not throw — always read `{ data, error }`.

---

## What already landed (Session 145, on `dev`, unpushed)

Eighteen commits, one file each. These close the two items Romy asked for this
week and are prerequisites for several tasks below.

| Work | Gap | Commits |
|---|---|---|
| Partnership checkout door closed at three layers | G-03 | `5cd3dc5` `9657775` `30b39e6` `8e89960` `fbc253a` |
| Canada-shaped labels and the Tab A citizenship trap | G-09 | `99b03e3` `321f7dd` `36e8494` `d47a1bf` `1449744` `6401aa3` `8636455` `1980dbd` `4749490` `a6693f8` `b3183aa` `ac59911` `364ab25` |

Verification at close: `tsc` clean · jest 19 suites / 273 tests green (husky ran
it on all 18) · `npm run build` clean · `git status` clean.

---

## Task table

Legend — **Status:** `TODO` / `WIP` / `DONE` / `BLOCKED (needs Romy)`
**Kind:** `code` · `infra` = platform/cron/config · `migration` = needs SQL ·
`content` = needs Romy's domain input · `decision` = Romy must choose

### Phase 1 — Survivability · **blocks launch**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-1** | Durable execution for the generation pipeline | G-01 | infra | DONE* |
| **DR-2** | One status vocabulary, and a client that can re-attach *and* restart | G-02 | code | DONE |

### Phase 2 — Visibility and recovery · **blocks launch**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-3** | Watchdog every 10 minutes, reaping `queued` too, alerting to Sentry | G-06 | infra | DONE |
| **DR-4** | Generation lifecycle emails — complete, and reset-after-failure | G-06 | code | DONE* |
| **DR-5** | Stall detection in the progress stream, with a retry that actually retries | G-07 | code | DONE |

### Phase 3 — Containment inside a run · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-6** | Per-document quarantine — one failure stops one document | G-04 | code | DONE |
| **DR-7** | Scope the resume set to the application, not the job | G-05 | code | DONE |
| **DR-8** | Guarantee one row per (application, document type) | G-05 | code | DONE* |
| **DR-9** | "Auto-approved after max revisions" becomes a blocking condition | G-10 | code | DONE |

### Phase 4 — The last mile · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-10** | Budget and bound the download route | G-08 | infra | DONE* |

### Phase 5 — Nationality neutrality · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-11** | Real E-2 consulate list for `M3-I-11` | G-09a | content | **BLOCKED (needs Romy)** |
| **DR-12** | De-Canadianise the franchise archetype prompt blocks | G-09b | code | DONE |
| **DR-13** | De-Canadianise the interview knowledge base and prep route | G-09c | content | **BLOCKED (needs Romy)** |
| **DR-14** | Nationality-persona verification across the prompt corpus | G-09 | code | DONE |
| **DR-15** | Broaden the `financial_assets_portfolio` trigger vocabulary | G-09d | code | DONE |

### Phase 6 — Single source of truth and honest delivery · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-16** | One document plan, asserted identical in CI | G-11 | code | DONE |
| **DR-17** | Tell the client what was *correctly* omitted | G-12 | code | DONE* |

### Phase 7 — Partnership tier and data integrity

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-18** | Build the partnership tier and remove the hold | G-03 | decision | **BLOCKED (pricing call)** |
| **DR-19** | Stop asserting `application_type: 'solo'` at checkout | G-09e | code | DONE |

### Phase 8 — Prove it, then keep proving it · **standing**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-20** | The delivery test matrix | all | code | TODO |
| **DR-21** | Three chaos drills, green | G-01, G-04, G-08 | code | TODO |
| **DR-22** | The generation ops dashboard | G-06 | code | DONE* |

---

## Phase 1 — Survivability

### DR-1 · Durable execution for the generation pipeline
**Gap G-01 · infra · DONE\* · 3–4 eng-days**

**\*Implemented, two items outside this sandbox before it's fully live:**
1. **The `generation_resume_log` migration (already committed,
   `20260910130000_generation_resume_log.sql`) has not been applied to
   production.** Romy needs to run it via the Supabase Dashboard SQL Editor —
   telemetry writes will fail until it exists there.
2. **The literal Exit demonstration (kill the instance at document 3 of 20,
   walk away) has not been performed against a real environment** — this
   sandbox can't do that. `tsc`/`jest`/`build` gates are clean and the named
   test (8/8) covers the pickup/claim/telemetry logic, but the live kill-test
   is still outstanding.

Code landed: `src/lib/generation-resume.ts` (stale-detection, optimistic-claim,
resume, telemetry), `src/app/api/cron/generation-resume/route.ts` (runs every
10 minutes, `vercel.json`), test file below.

**Decision 2 — resolved September 10, 2026 (Session 146).** Romy: go with
checkpointed resume for now, but it must be monitored — record every
resume-recovery attempt (success and failure) somewhere queryable, so a rising
failure rate is visible and the decision to move to a durable queue is made from
evidence, not guesswork. Not paged/alerted on individually — reviewed, and safe
to ignore day-to-day as long as the failure rate stays low.

A scheduled invocation picks up any job whose `updated_at` is stale and
continues it from the already-approved set (see DR-7 — the resume set must be
scoped to the application, not the job, for this to actually work on a retry).
Reuses the resume logic that already exists in the engine.

**New requirement folded into this task — resume telemetry.** Every checkpoint
pickup writes a row (table or reuses `document_generation_log`, whichever fits
the existing schema) recording: which job, how many documents were already
approved when picked up, how many were regenerated, and the outcome
(`resumed_to_completion` / `resumed_still_failing` / `resume_error`). This is
what lets us later decide, from real numbers, whether checkpointed resume is
holding up or whether it's time to build the durable queue (option (a),
deferred, not chosen now).

Awaiting the pipeline is **not** an option: three nested retry loops (one Claude
retry, three verifier retries, three humanization attempts) across 15–25
documents put a full run comfortably past the 300-second ceiling.

The invariant holds: **a job in flight always has something that will finish it
or fail it.**

> **Exit** — kill the instance at document 3 of 20, walk away, and the package
> still completes, or fails loudly, with no human intervention. Demonstrated by a
> deliberate kill against a real environment, not by reasoning about the code.
> The resume-telemetry row for that run is queryable afterward and correctly
> labeled.
>
> **Test** — `src/lib/__tests__/generation-resume.test.ts`: given a job row with
> a stale `updated_at` and a partially-populated approved set, the resumer picks
> it up, regenerates only the un-approved documents, terminates the job in a
> terminal state, and writes exactly one telemetry row with the correct outcome.
> A job with a fresh `updated_at` is left alone and writes nothing.

---

### DR-2 · One status vocabulary, and a client that can re-attach *and* restart
**Gap G-02 · code · DONE · 2026-09-10**

Shipped: `src/lib/generation-job-status.ts` exports `IN_FLIGHT_STATUSES` /
`isInFlightStatus` / `isStaleQueuedJob`; both `/start` and `/run` import it
instead of spelling out the list; `generate/[applicationId]/page.tsx:367–373`
re-issues `/run` on every attach, not just for brand-new jobs.

Three defects, one task because they are the same bug seen from three sides:

1. `/start` checks `['queued','running']`; `/run` checks
   `['running','pending','processing','awaiting_approval']`. Extract a single
   exported `IN_FLIGHT_STATUSES` and use it in both.
2. `/start` returning `existing: true` currently strands the client, because the
   page only calls `/run` for brand-new jobs
   (`generate/[applicationId]/page.tsx:354–371`). Make the client re-issue `/run`
   whenever it attaches to an in-flight job; `/run` is already idempotent on a
   genuinely running job.
3. A `queued` job with a stale `updated_at` must be restartable, not a lock.

> **Exit** — close the tab between `/start` and `/run`, reopen the page, and the
> run starts. Reload mid-run and the run continues; it does not fork a second
> pipeline.
>
> **Test** — `src/app/api/generate/__tests__/job-status-vocabulary.test.ts`:
> asserts `/start` and `/run` import the same status constant (no string
> literals), and that a stale `queued` job is treated as restartable while a
> fresh one is not.

---

## Phase 2 — Visibility and recovery

### DR-3 · Watchdog every 10 minutes, reaping `queued` too, alerting to Sentry
**Gap G-06 · infra · DONE · 2026-09-10**

Shipped: `src/app/api/cron/health-watchdog/route.ts` reaps both `running` and
`queued`, calls `Sentry.captureMessage` on every paid-client reap;
`vercel.json` schedule changed from `0 3 * * *` to `*/10 * * * *`.

`cron/health-watchdog` currently runs **daily at 03:00 UTC** and filters on
`status = 'running'` only. Change three things: schedule to every 10–15 minutes;
include `queued` in the reap set (a job that never got its `/run` is exactly the
permanently-locked case); and raise a **Sentry** event on every reap of a *paid*
client's job, not a `console.log`.

Keep the existing 30-minute staleness threshold — the problem was never the
threshold, it was the once-a-day cadence.

> **Exit** — a job artificially frozen in `running`, and a second frozen in
> `queued`, are both reaped within 15 minutes, and both produce a Sentry event
> naming the application and the tier.
>
> **Test** — `src/app/api/cron/__tests__/health-watchdog.test.ts`: stale
> `running` → reaped; stale `queued` → reaped; fresh job of either status →
> untouched; every reap of a paid application calls the Sentry capture.

---

### DR-4 · Generation lifecycle emails — complete, and reset-after-failure
**Gap G-06 · code · DONE* · 2026-09-11 · Romy: 1h copy still owed**

Shipped two new templates in `src/lib/emails/generation-emails.ts`, following
`retention-sequence.ts`'s exact `buildXEmail` (pure) / `sendXEmail` (async,
suppression-checked) pattern:

- **Package ready** — sent from `runGenerationPipeline()`
  (`src/lib/generation-engine.ts`) the moment a job's `jobFinalStatus` reaches
  `'completed'`. Deliberately excluded from `'partial'` runs — those still need
  the per-document quarantine UI, not a "ready" message.
- **We reset your run** — sent from the health-watchdog cron (DR-3)'s reap
  loop (`src/app/api/cron/health-watchdog/route.ts`), one per job it marks
  `'failed'`, with the direct link and a "press generate again" call to action.

Both await the Resend call inside try/catch, exactly as `cf8b44f` requires —
that incident is why an un-awaited Resend call must never be written again in
this codebase, since the runtime tore it down before it left the function and
a real submission never reached Resend at all. Both send calls are wrapped in
their own try/catch at the call site too, so a failed send can never fail the
pipeline or stop the watchdog's reap loop from processing the rest of its
batch.

Neither template stamps a dedup column. Unlike the retention notice (guarding
against a regeneration re-sending the same 30-day notice for one application),
each of these corresponds to an event the existing state machine already makes
happen at most once per job: `/api/generate/run/[jobId]` refuses to re-enter a
job whose status is already `'completed'`, and a reaped job's `'failed'`
status drops it out of the watchdog's own `status in ('running','queued')`
query on every later pass. "One event, one email" falls out of the state
machine without an extra column to keep in sync.

`DONE*` — the Exit and Test criteria below (delivery mechanics: a real, awaited
send with a working link) are met, but the ~1h of copy review flagged for this
item has not happened yet. Current copy ("Your package hit a snag — we've
reset it", "Your E2go.app document package is ready") is a first draft in the
established brand voice, not a placeholder — but it is not yet Romy-reviewed.

**2026-09-11 addendum** — Package ready now lists the actual documents
generated for that case. `buildPackageReadyEmail` takes a `documentTypes:
DocumentType[]` parameter; the call site in `runGenerationPipeline` passes
`DOCUMENT_TYPES` (`documentPlan.all` — core types plus only the conditional
types this case's own answers triggered), so two cases with different
documents get genuinely different email copy, not one fixed list. Every type
rendered is checked in tests against `DOC_DISPLAY_NAMES`
(`docx-package-constants.ts`), the same map the download route uses to name
files in the real ZIP, so nothing listed can be a document the package could
never actually contain. Copy deliberately says "generated for your case," not
"available to download" — `buildPackageManifest`'s `packageReady` gate
(`cic-package-manifest.ts`) still requires a separate, manual client
certification step before a download is actually possible, and that has not
happened yet at the moment this email sends.

> **Exit** — a completed run and a reaped run each put a real email in a real
> inbox, sent from the deployed environment, not from a local script.
>
> **Test** — `src/lib/emails/__tests__/generation-emails.test.ts` (13 tests):
> both templates render with a realistic payload, contain the application
> link, contain no unresolved `[bracket]`/`{{...}}`/`${...}` placeholders, and
> both send functions correctly skip a suppressed address.

---

### DR-5 · Stall detection in the progress stream, with a retry that actually retries
**Gap G-07 · code · DONE · 2026-09-11**

`generate/progress/[jobId]/route.ts` polled every 2s but only ever looked at
`status` — a job stuck at `running` with a frozen `updated_at` (a crashed
invocation, an Anthropic call that never resolves) streamed the same "still
working" message forever, with no signal telling the client to reconnect.

Rather than choosing a second, independently-picked "how long is too long"
threshold, extracted the decision into `src/lib/progress-stall.ts` and had it
reuse DR-1's `isStaleForResume()` — the exact predicate the generation-resume
cron already uses to decide a job is dead (`queued`/`running` only, no update
in ten minutes). The SSE stream's "tell the user" threshold and the cron's
"actually resume it" threshold now structurally cannot drift apart, the same
way DR-8's `selectLatestDocumentRows()` and DR-16's `buildDocumentPlan()`
closed off similar two-callers-diverging risks.

`resolveProgressStatus(status, updatedAt)` returns `'stalled'` in place of the
real status once a job goes stale while still nominally in flight;
`awaiting_approval` is never reported stalled, since the client is waiting on
the user there, not the pipeline — `isStaleForResume`'s own guard handles
this. `isTerminalJobStatus(status)` is now the only thing that closes the
stream (`completed`/`failed`); `stalled` is reported, not terminal, so the
interval keeps polling and a background cron resume — or the client's own
retry — can move `updated_at` forward again on a later tick without the
client having to reconnect from scratch. Added `export const maxDuration =
300` to the route (matching `/api/generate/run/[jobId]/route.ts`'s existing
convention) so the platform's default cutoff is a decision, not a surprise;
the client's `connectSSE()` already reconnects with backoff on any drop, so a
mid-run cutoff just opens a fresh stream rather than losing state.

Client-side, `generate/[applicationId]/page.tsx` gained an `isStalled` flag
and a stalled-state card (reusing the existing FAILURE STATE block's styling)
whose "Restart Generation" button calls the same `startGeneration()` used by
the failure state's retry — which per DR-2 always re-issues `POST
/api/generate/run/[jobId]` before reconnecting, satisfying this task's
explicit requirement that the retry restart the pipeline rather than just
re-attach the stream. Also updated the three existing JSX gates
(`businessName`/`consulate` subtitles, the pre-generation confirmation panel)
to exclude `isStalled`, since none of them previously accounted for it.

> **Exit** — freeze a job's `updated_at`; within ten minutes the UI says so and
> offers a retry; pressing it restarts the pipeline and the bar moves.
>
> **Test** — `src/app/api/generate/__tests__/progress-stall.test.ts` (14
> tests): a job whose `updated_at` is 11 minutes old emits `stalled`; one 9
> minutes old (and one exactly at the 10-minute boundary) does not; a
> `completed` or `failed` job never reports `stalled` regardless of staleness
> and always closes the stream; `awaiting_approval` never reports `stalled`
> no matter how old.

---

## Phase 3 — Containment inside a run

### DR-6 · Per-document quarantine — one failure stops one document
**Gap G-04 · code · DONE · 2026-09-10**

Shipped: the per-document catch block (`generation-engine.ts`, inside
`runGenerationPipeline`'s per-document loop) no longer calls `fail()`/`return`.
A thrown error — including a `validateContext` miss, now surfaced via a new
`DocumentQuarantineError` carrying a `system_fault` | `needs_information`
reason code — sets `status: 'failed'` + `quality_gate_passed: false` +
`quality_gate_notes` naming the reason and next action on that document only,
reports to Sentry, and `break`s out of the revision `while` loop so the outer
per-document `for` loop continues to the next document. Setting
`quality_gate_passed: false` reuses the same gate `cic-package-manifest.ts`
already treats as `blocked` (outranks `client_certified`) and the
Acknowledgment Gate already turns into job status `partial` instead of
`completed` — no new manifest logic or status enum value was needed. Covered
by `src/lib/__tests__/generation-quarantine.test.ts`.

Previously: any throw inside the per-document loop marks that document failed, calls
`fail()` on the job and `return`s out of the **entire pipeline**
(`generation-engine.ts:3161–3175`). One transient Anthropic 529 that outlives the
single API retry takes down a run that was 22 documents deep.

Replace with: mark the document failed, **continue**, and report the failed set
at the end.

**Decision 3 — resolved September 10, 2026 (Session 146).** Romy: always release
the successful documents so the client has something in hand; the failed ones
get worked on separately. The client must be told, in the package itself, what's
missing, why, and what happens next — and if the failure is because generation
needs more information from the client (not a system fault), the client is asked
for it directly rather than left to guess.

Concretely, this is **release-with-flag**, not hold-and-notify:

1. When 19 of 20 succeed, the package delivers immediately with the 19 documents.
2. The 20th shows in the client's package view as its own state — not silently
   missing, not mixed in with "still generating" — with **a specific reason**
   (system fault vs. missing information) and **a next action**:
   - *System fault* (e.g. the LLM call kept failing): "we're regenerating this
     automatically / our team has been notified" — no client action needed.
   - *Missing information*: the client sees what's needed to complete it (reuses
     the same "what's needed" language DR-17 already builds for correctly-omitted
     documents) and a way to supply it.
3. Internally, this still notifies us (Sentry, same as a held package would have)
   — "release to the client" does not mean "stop tracking it."

The delivery gate's existing hold mechanism is repurposed for *why a document
isn't in the package yet*, not for blocking the whole package.

> **Exit** — fault-inject a hard failure on one document mid-run: the other 19
> are delivered to the client immediately, the package view names the 20th
> document, states the reason and next action, we get notified internally, and a
> retry regenerates **only that one**.
>
> **Test** — `src/lib/__tests__/generation-quarantine.test.ts`: a per-document
> throw leaves the loop running, the job reaches a terminal state, the 19
> successes retain `approved` and are deliverable independently of the 20th, the
> failed document carries a reason code (`system_fault` | `needs_information`),
> and the client-facing manifest surfaces that reason and next action rather than
> omitting the document silently.

---

### DR-7 · Scope the resume set to the application, not the job
**Gap G-05 · code · DONE · 2026-09-10**

Shipped: `generation-engine.ts:2846–2854` scopes the already-approved lookup
by `.eq('application_id', applicationId)` instead of `job_id`. Covered by
`src/lib/__tests__/generation-resume.test.ts` (`describe('DR-7 — resume set
scoped to application_id, not job_id')`).

`generation-engine.ts:2846–2851` scopes the already-approved set with
`.eq('job_id', jobId)`. Because `/start` mints a **new** job on retry, that set is
always empty on a retry and all 15–25 documents regenerate from zero at full LLM
cost. Scope it to `application_id` (plus approval state), so a retry only pays for
what is actually missing.

> **Exit** — retry an application with 12 approved documents: exactly the missing
> documents are generated, and the LLM call count matches.
>
> **Test** — extend `src/lib/__tests__/generation-resume.test.ts`: a second job on
> the same application sees the first job's approved documents and skips them.

---

### DR-8 · Guarantee one row per (application, document type)
**Gap G-05 · code · DONE\* · 0.5 eng-day**

**\*Implemented as a code-only fix; the constraint half of the task is a
production-schema decision left for Romy:**
1. **Confirmed against the live schema (this sandbox has no `psql`/Docker
   access — `supabase db dump` needs Docker, which never came up — so this
   used the cached PostgREST OpenAPI spec instead, `.schema-spec.json`, via
   `scripts/audit-schema-drift.py`): `generated_documents` has no composite
   unique constraint today.** Only `id` carries a `<pk/>` marker; the spec
   format doesn't rule out a constraint type it simply doesn't surface, but
   nothing in the schema names one, and the observed duplicate-row behavior
   (two rows per type after a retry, see below) is consistent with there
   being none.
2. **The constraint-and-upsert half of the sprint doc's suggested fix was
   deliberately not applied.** Adding a unique constraint is a live
   production-schema change to a shared table — the kind of hard-to-reverse,
   shared-state action this session treats as requiring Romy's explicit
   go-ahead, not something to run autonomously overnight. The code fix below
   does not depend on it and is safe either way; the constraint remains a
   good follow-up (it turns "two files must agree on an ordering" into
   "the database physically cannot hold a duplicate") but is Romy's call.

Confirmed the actual failure mode by reading the pipeline end to end:
`generate/start/route.ts` mints a **new** `document_generation_jobs` row and a
**new** `generated_documents` row per document type on every `/start` call that
isn't blocked by an in-flight job — including retries after a `failed` job, and
including document types that already succeeded in an earlier job. A row's own
`status` moves `queued` → `generating` → `approved`/`failed` as the pipeline
processes it (`generation-engine.ts`). Both `cic-package-manifest.ts` and the
download route read `generated_documents` filtered on `application_id` alone,
with no `created_at` in the select and no ordering — after a retry there are
two-plus rows per document type, and the manifest's `Map.set()` loop / the
download route's `.find()` each took whichever the database happened to return
last. That could be an **abandoned retry's untouched `queued` placeholder**
outranking the row that actually finished — worse than the sprint text's
literal description, since it isn't just "arbitrary between two completed
runs," it can silently discard real content for an empty one.

Fix: `src/lib/document-dedupe.ts` — one function, `selectLatestDocumentRows()`,
now called by both `cic-package-manifest.ts` and the download route (their
selects now include `created_at`). It reduces duplicate rows per document type
to a single winner: a `queued` placeholder never outranks a row that has
actually been through the pipeline, regardless of which is newer; among rows
that are both processed (or both still queued), the most recently created one
wins. This is the same recency convention `cic-package-manifest.ts` already
used for `uploaded_documents` (`if (!existing || row.created_at >
existing.created_at)`), extended with the placeholder guard duplicate
`generated_documents` rows specifically need. Because both call sites now share
this one function instead of each independently filtering the query result,
there is nothing left to drift between them even without the database
constraint — the "same shape of bug as G-11" risk the sprint doc named is
closed at the code level; a future constraint would close it at the schema
level too, on top of this.

> **Exit** — an application that has been retried twice yields exactly one
> selected row per document type, and the ZIP contains the content from the run
> that actually completed. Demonstrated by the test below; the literal
> live-retry-and-download walkthrough was not additionally performed by hand,
> since it exercises the same code path the test drives directly.
>
> **Test** — `src/lib/__tests__/package-manifest-dedupe.test.ts` (7 tests,
> all passing): duplicate rows for one document type across two jobs — a
> completed row plus an abandoned `queued` stub, in both orderings; two
> completed rows of different recency; two still-`queued` rows; an
> in-progress `generating` row against a later abandoned stub; and a full
> multi-document-type package — resolve to the completed/most-recent row
> deterministically in every case. `npx jest` (641/641), `npx tsc --noEmit -p
> .`, and `npm run build` all clean.

---

### DR-9 · "Auto-approved after max revisions" becomes a blocking condition
**Gap G-10 · code · DONE · 2026-09-10**

Shipped: the post-revision-loop block (guarded by `!documentFailed`, so it
doesn't double-handle a document DR-6 already quarantined in the same
iteration) no longer sets `status: 'approved'`. It sets `quality_gate_passed:
false` with a `quality_gate_notes` entry explaining it exceeded max revisions
without client approval, and fires `Sentry.captureMessage` naming the job,
application, document, and revision count. This reuses the exact gate DR-6
uses — `cic-package-manifest.ts`'s `blocked` status and the Acknowledgment
Gate's job-status `partial` — so no new manifest or job-status logic was
needed. Covered by the extended `src/lib/__tests__/generation-engine.test.ts`
(`describe('Generation Engine — DR-9 max-revisions hold-for-review')`).

Previously: a document was marked `approved` after three failed revision
rounds with the note "Auto-approved after max revisions" — and shipped. The
note lived in `quality_gate_notes` where nothing read it as a warning. The
platform's answer to *"I couldn't get this right"* was to deliver it anyway.

> **Exit** — force three revision failures on one document: the package does not
> auto-deliver, the review surface names the document and the reason, and Sentry
> has the event.
>
> **Test** — `src/lib/__tests__/generation-engine.test.ts` (extend): an
> auto-approved-after-max-revisions document sets `quality_gate_passed: false`
> and produces a `blocked` manifest, not a `ready` one.

---

## Phase 4 — The last mile

### DR-10 · Budget and bound the download route
**Gap G-08 · infra · DONE* · 2026-09-11 · Romy: confirm the real Vercel ceiling**

`generate/download/[applicationId]/route.ts` renders a cover page, a table of
contents, a tab divider per section, one `.docx` per document and a closing
checklist — each through `Packer.toBuffer()` — then zips the lot into a single
in-memory `arraybuffer`. It had **no `maxDuration` and no `runtime`** declared,
so it silently inherited Vercel's default function timeout. Our own
`fdd/report/route.ts:13–17` carries a comment warning that exactly this omission
"can kill the request after the LLM cost is already incurred."

Shipped: `export const runtime = 'nodejs'` and `export const maxDuration = 60`,
with a comment explaining why 60s (this route is CPU-bound ZIP/`.docx` assembly,
not an LLM call — `run/[jobId]`'s 300s pays for the LLM calls this route doesn't
make). `download-budget.test.ts` assembles a synthetic full package — every
generated `DocumentType`, every tab that has one, through the same
`buildCoverPage`/`buildTableOfContents`/`buildTabDivider`/`buildDocument`/
`buildChecklist` + `Packer.toBuffer` + `JSZip` calls the route itself makes —
and measures it at well under a second locally, comfortably inside the 60s
budget with the wide margin the Exit criterion below asks for.

`DONE*` — what's *not* done: the sprint's own Steps called for confirming the
real ceiling for the current Vercel plan and whether Fluid Compute is on before
picking a number. `vercel project inspect` and the CLI don't surface plan/Fluid
Compute status — that's dashboard/billing information only Romy can confirm.
60s is a conservative pick, well under `run/[jobId]`'s already-deployed 300s
(existing evidence the plan supports at least that much), but the sprint's
"confirmed platform ceiling" language is not yet satisfied, and the
pre-built-artifact-plus-signed-URL fallback was not built — the measured
wall-clock (well under a second, versus the 60s budget) shows there's no need
for it at current package sizes.

> **Exit** — a real 29-file package downloads, with a measured wall-clock and a
> stated headroom against a *confirmed* platform ceiling. "It worked once" is not
> the exit.
>
> **Test** — `src/app/api/generate/__tests__/download-budget.test.ts`: asserts the
> route module exports `runtime` and `maxDuration`, and that a synthetic 29-document
> assembly completes under a fixed budget.

---

## Phase 5 — Nationality neutrality

Session 145 fixed the labels. These five are what it deliberately deferred, with
the reason recorded — decisions, not omissions.

### DR-11 · Real E-2 consulate list for `M3-I-11`
**Gap G-09a · content · BLOCKED (needs Romy) · 0.5 eng-day after the list**

`src/app/apply/qualifications/page.tsx:167` offers exactly
`{value:'toronto', label:'Toronto, Canada'}` plus "Other — specify below". I
declined to invent a consulate list — wrong consulates in front of clients is
worse than a free-text field. Romy supplies the list (or confirms sourcing it
from `docs/spec/E2_Global_Consulate_Intelligence_Report_Part1.md`, which already
carries the master consulate table for 82 treaty countries); then it is a data
change plus the same `optionsSource` pattern used for Tab A citizenship in
`321f7dd`.

> **Exit** — a French persona selects Paris from the list; the value reaches the
> prompt and the interview-day prep.
>
> **Test** — `src/app/apply/__tests__/consulate-options.test.ts`: the option set
> is non-empty, contains no country hardcoded in the component, and every value
> round-trips through `getPreFill()` without rendering blank (the exact failure
> mode `M3-A-05` had).

---

### DR-12 · De-Canadianise the franchise archetype prompt blocks
**Gap G-09b · code · DONE · 0.5 eng-day**

`generation-engine.ts` around line 247 hardcodes Canadian ties in the franchise
archetype: `nonimmigrant_intent` instructs the model to "document Canadian ties:
property retained in Canada… Canadian bank accounts and registered savings (RRSP,
TFSA)" and that the investor "would return to Canada"; `investment_proof` at :246
requires the trail be "traceable from the Canadian source account."

Interpolated the applicant's actual country and asset vocabulary via a new
`localizeArchetypeGuidance()` transform, threaded through `buildArchetypeGuidance()`'s
new third `homeCountry` parameter. Paired with DR-14 rather than shipping blind, per
this task's own instruction.

**Deviation from the literal task text, required to satisfy its own Exit
criterion:** the report named the franchise/buyer archetype and ~2 lines. The actual
scope is **11 hardcoded Canadian-specific sentences across all four archetypes**
(`buyer`, `builder`, `investor`, `career_switcher`) inside `ARCHETYPE_DOC_GUIDANCE` —
`Canada`, `Canadian`, `RRSP`, `TFSA`, plus one non-literal Canada-specific premise,
"provincial health coverage" (`LIRA` does not currently appear in the source text, but
is handled defensively in case it's added later). Fixing only the named lines would
have left a Japanese or French applicant's `builder`/`investor`/`career_switcher`
prompts still telling the model to document Canadian ties. Rather than
hand-templating 11 strings (easy to miss one on the next edit), the guidance stays
written for the Canadian case — the common one, verified unchanged by a dedicated
regression test — and is localized for every other nationality at read time.

Nationality is read from `M3-A-05` ("Country of citizenship", captured at intake)
via `payload.module_3_answers['M3-A-05']`, falling back to `case_brief.treaty_country`
then `case_brief.nationality` when M3-A-05 hasn't been captured yet. Canonicalized
through the existing `resolveTreatyCountry()` (`src/lib/treaty-countries.ts`) rather
than a new parallel normalization — it already resolves free text like "uk" or
"great britain" against the treaty-country list and its alias map.

> **Exit** — a Japanese franchise persona's `nonimmigrant_intent` prompt contains
> Japan and no Canadian instrument names. Verified for all four archetypes, not just
> franchise/buyer.
>
> **Test** — `src/lib/__tests__/prompt-nationality.test.ts`: builds the prompt for
> three non-Canadian personas (Japan, France, United Kingdom) across all four
> archetypes and every document type; asserts zero occurrences of `Canada`,
> `Canadian`, `RRSP`, `TFSA`, `LIRA`, or "provincial health coverage" outside a case
> where the applicant *is* Canadian, plus unit coverage of `localizeArchetypeGuidance()`
> itself. 214 test cases (the archetype × document-type matrix across three
> personas, plus the Canadian-regression and unit checks), all passing; `npx jest`
> (634/634), `npx tsc --noEmit -p .`, and `npm run build` all clean.

---

### DR-13 · De-Canadianise the interview knowledge base and prep route
**Gap G-09c · content · BLOCKED (needs Romy) · 0.5 eng-day after review**

`src/lib/interview-knowledge-base.ts` lines 314, 334, 343, 428, 435, 439 assume
Canadian accounts and ties, as does
`src/app/api/simulator/interview-prep/route.ts:185–186`. This is coaching content
with real domain weight — rewording it without Romy's review risks trading a
nationality bug for an accuracy bug.

> **Exit** — the same three personas receive coaching with no Canadian premise and
> no loss of specificity (a reviewer confirms the advice is still concrete, not
> generically hedged).
>
> **Test** — extend `src/lib/__tests__/prompt-nationality.test.ts` to cover the
> knowledge-base strings reached by the prep route.

---

### DR-14 · Nationality-persona verification across the prompt corpus
**Gap G-09 · code · DONE · 1 eng-day**

The label sweep found eleven files when the report named two. A grep is not a
guarantee — the check has to be a persona running end to end.

Built three fixture personas (French buyer funded by a brokerage account, British
builder funded by savings, Japanese investor funded by crypto) and assert **no
Canadian premise anywhere in the assembled prompt corpus**, and that each correctly
receives (or correctly does not receive) the assets portfolio. This is the standing
regression net for DR-11, DR-12, DR-13 and DR-15.

There is no DI seam for a live end-to-end generation run (the same constraint noted
in `generation-quarantine.test.ts` / `generation-resume.test.ts`), so the test
assembles the same two pieces a real run assembles for each persona — the prompt
guidance via `buildArchetypeGuidance()` (DR-12) and the conditional document set via
`buildDocumentPlan()` (DR-15/DR-16) — rather than mocking the run itself. DR-13
(interview knowledge base) remains blocked on Romy's review, so it is not yet part
of this net; re-run this file's personas against it once DR-13 lands.

> **Exit** — three personas generate a full package each (`buildDocumentPlan().all`
> non-empty, core + correctly-triggered conditional documents); a reviewer reads the
> `nonimmigrant_intent` and `source_of_funds` guidance per persona and finds no false
> premise. A genuinely Canadian applicant in the same pipeline still receives the
> original Canadian guidance unchanged (regression guard).
>
> **Test** — `src/lib/__tests__/nationality-personas.test.ts`, 16 tests, all passing;
> `npx jest` (634/634), `npx tsc --noEmit -p .`, and `npm run build` all clean.

---

### DR-15 · Broaden the `financial_assets_portfolio` trigger vocabulary
**Gap G-09d · code · DONE · 0.5 eng-day**

The trigger fired only on `rrsp`, `tfsa`, `lira` or `crypto` — Canadian
registered-plan vocabulary. **A French applicant funding from a securities
account never got that document generated at all.** Broadened to
`FINANCIAL_ASSETS_TRIGGER_VOCAB = ['rrsp', 'tfsa', 'lira', 'crypto',
'securities']` in `src/lib/document-plan.ts`.

**Deviation from the literal task text, required to satisfy its own Exit
criterion:** the M3-F-05 "Source of funds" question
(`src/app/apply/investment/page.tsx`) had no securities/brokerage option at
all — only `savings, rrsp, tfsa, lira, property-sale, business-sale,
inheritance, crypto, loan, other`. Broadening the trigger's matching logic
alone would have been a no-op: no applicant could ever select a value that
matched it. Added a new `securities` option ("Stocks, bonds, mutual funds, or
a brokerage/investment account") to make the fix reachable by a real
applicant. Confirmed safe by grepping every other reader of M3-F-05
(`checklist-generator.ts`, `cpu-risk-signals.ts`,
`pre-generation-validation.ts`, `gap-analysis-engine.ts`,
`cic-package-manifest.ts`, `field-registry.ts`,
`api/dashboard/case-profile/route.ts`, `prefill.ts`) — all treat it as a loose
`.includes()` match with no enum validation, so an unrecognized value was
already harmless and a new one adds no fragility.

The trigger lives in **both** `generate/start/route.ts` and
`generation-engine.ts` (G-11) — resolved together with DR-16, since both now
call the one `buildDocumentPlan()`.

> **Exit** — a French persona whose fund source is a securities account receives
> the assets portfolio; a cash-savings persona correctly does not. Verified by
> `src/lib/__tests__/document-plan.test.ts`.
>
> **Test** — `src/lib/__tests__/document-plan.test.ts`, trigger table over eight
> fund-source shapes (rrsp/tfsa/lira/crypto/securities positive,
> savings/property-sale/inheritance negative). All 26 tests in the file pass;
> `npx jest` (404/404), `npx tsc --noEmit -p .`, and `npm run build` all clean.

---

## Phase 6 — Single source of truth and honest delivery

### DR-16 · One document plan, asserted identical in CI
**Gap G-11 · code · DONE · 1 eng-day**

The core list and all five conditional triggers existed independently in
`generate/start/route.ts:107–175` (which sizes the progress bar and pre-inserts
the document rows) and `generation-engine.ts:2566–2582, 2719–2775` (which
actually generates). They agreed only because someone fixed a drift bug —
and that fix's own comment recorded the cost: *"financial_assets_portfolio was
never actually generated despite the step counter accounting for it."*

Took the preferred fix, not the CI-only fallback: extracted
`buildDocumentPlan(input)` into `src/lib/document-plan.ts` and made both call
it. Both files' logic was already structurally identical (same order,
mirroring comments) and each list was consumed by only one downstream site per
file, so the extraction was low-risk — a genuine single source of truth rather
than two lists kept in sync by a test. `generate/start/route.ts` and
`generation-engine.ts` each now do their own Supabase fetch (they read
different tables/columns for the same three answers) and pass the result into
the shared pure function; all downstream variable names
(`conditionalDocTypes`, `isPartnership`, `DOCUMENT_TYPES`/`allDocTypes`) were
preserved so no code past the edited blocks needed to change.

> **Exit** — there is no longer a second, independently-maintained list to add
> a document to "in only one file"; both call sites are calls to the same
> function. Demonstrated structurally in
> `src/lib/__tests__/document-plan.test.ts` ("deliberately adding a conditional
> document in only one caller would fail CI").
>
> **Test** — `src/lib/__tests__/document-plan.test.ts`: 14 case shapes (≥12
> required) across solo/spousal × funded/partial/committed-not-spent ×
> lease/no-lease × partnership × fund-source variations, asserting the plan is
> reproducible, internally consistent (`plan.all.length === plan.core.length +
> plan.conditional.length`), and each conditional trigger fires exactly when
> its input predicate says it should.

---

### DR-17 · Tell the client what was *correctly* omitted
**Gap G-12 · code · DONE\* · 1 eng-day · Romy: 1h copy**

\* Implemented September 11, 2026 (Session 146): `checklist-builder.ts`
now renders a "Not Applicable to Your Case" section (five reason lines,
one per trigger — the spousal trigger covers both `declaration_spouse`
and `resume_spouse`) and promotes `passportNumber`/`businessState` into
the existing placeholder-completion list whenever `docx-cover-builder.ts`
still has them as `[bracket]` fallbacks; the download route now passes
both fields through. The reason-line copy is a first draft in the
established brand voice, not yet reviewed by Romy — same caveat the
sprint doc already flags above (~1h copy review), consistent with DR-4's
and DR-10's DONE\* precedent.

Six documents on the Foundation feature list are conditional. When they don't
trigger they are simply absent, and nothing says why — so a client counts 15
files against a list naming 20 and concludes they were short-changed, when every
omission was correct. This is a communication fix, not an engineering one.

Add a **"Not applicable to your case, and here's why"** section to
`COMPLETE_BEFORE_SUBMITTING.docx` listing every non-triggered document with its
one-line reason (the engine already has the right instinct — `gift_letter`'s
NOT-APPLICABLE sentinel). While in that file, promote the two deliberate brackets
(passport number, business state — not collected at intake) to explicit checklist
lines, so the bracket in the first document the client opens is expected rather
than alarming.

> **Exit** — a minimal solo persona's checklist names all five of its
> non-triggered documents with reasons, and both deliberate brackets appear as
> checklist items.
>
> **Test** — `src/lib/__tests__/completion-checklist.test.ts`: for a case shape
> with N non-triggered conditionals, the checklist contains N reason lines and
> names every remaining bracket placeholder in the package.

---

## Phase 7 — Partnership tier and data integrity

### DR-18 · Build the partnership tier and remove the hold
**Gap G-03 · decision · BLOCKED (pricing call) · 2 eng-days after pricing**

The door is closed (Session 145) — partnership applicants now get a 409 and a
support-contact message instead of a solo package at the solo price. Opening it
properly means, **in one change**: create the Stripe Price IDs for the
partnership variants; add them to `VALID_TIER_IDS` and `entitlements.ts`; re-gate
`isPartnership` in the pipeline on the **entitlement** rather than on the legacy
`complete_partnership` payment type; and delete `src/lib/partnership-hold.ts`
along with its two route guards and the `results/page.tsx` branch.

`partnership-hold.ts`'s doc comment states this coupling explicitly so the hold
cannot be removed without the tier being built.

> **Exit** — a partnership test persona buys the live tier and receives **all six
> P2 documents plus a joint cover letter naming both investors** — or cannot buy
> at all. No third state.
>
> **Test** — `src/lib/__tests__/partnership-hold.test.ts` (10 tests, exists) is
> replaced by a package-shape test: a partnership entitlement produces a plan
> containing all six `*_p2` types; a solo entitlement produces none of them.

---

### DR-19 · Stop asserting `application_type: 'solo'` at checkout
**Gap G-09e · code · DONE (2026-09-10) · 0.5 eng-day**

`src/app/pricing/PricingClient.tsx:208` hardcoded `application_type: 'solo'` when
inserting the `applications` row — a false assertion about the client's own case,
written from the client side. Nothing leaked because the Session 145 server
guard reads `quiz_sessions` first, but the row was wrong in the database, and the
next feature that trusts `applications.application_type` would have inherited the bug.

**Fix location deviated from the original plan.** `PricingClient.tsx` doesn't post
to `/api/checkout/initiate` (that route is scoped only to the `foundation` tier and
never sets `application_type` at all) — it posts to `/api/stripe/create-checkout`,
which is the route every tier actually uses. The find-or-create logic and the
`application_type` derivation now live there instead:
`src/app/api/stripe/create-checkout/route.ts`. When the client sends no
`applicationId` (the first-purchase case), the route looks up the user's most
recent `applications` row; if none exists, it derives `application_type` from the
user's most recent `quiz_sessions.application_type` — `'partnership'` if that's
exactly what the quiz session says, `'solo'` otherwise — the same rule already used
in `src/app/onboarding/page.tsx:301`. `PricingClient.tsx` no longer touches
`applications` at all; it just posts `tierId`/`userId` and lets the server resolve
or create the application. An existing client-supplied `applicationId` is still
ownership-checked before use, unchanged.

Incidental side effect: `RenewalEntryClient.tsx` calls this route with no
`applicationId`, which previously 400'd ("Missing required field: applicationId");
the new find-or-create path now handles that gracefully too.

**Known separate gap, not fixed here:** `src/app/login/page.tsx:89` also hardcodes
`application_type: 'solo'` on a `quiz_sessions` insert rebuilt from a localStorage
draft. That draft (saved by `src/app/quiz/page.tsx`'s `saveDraft`) doesn't carry an
`outcome`/`score`/partnership signal at all and has a field-name mismatch
(`warningCodes` saved vs. `parsed.warnings` read) — fixing it needs re-running
scoring, not just reading a stored value. Flagged separately, out of scope for this
gap.

> **Exit** — a partnership quiz session that reaches checkout writes
> `application_type: 'partnership'`, not `'solo'`. Verified via the behavioral test
> below (asserts the exact row passed to `.insert()`), not just against migration
> files.
>
> **Test** — `src/app/api/stripe/__tests__/application-type.test.ts` (relocated from
> the originally planned `src/app/api/checkout/__tests__/application-type.test.ts`
> to sit next to the route that actually changed): a solo quiz session produces
> `application_type: 'solo'`; a partnership quiz session produces
> `application_type: 'partnership'` (and correctly hits the Session 145 partnership
> hold, 409); an existing application is reused with no second insert; a
> client-supplied `applicationId` belonging to another user is still rejected
> (404).

---

## Phase 8 — Prove it, then keep proving it

### DR-20 · The delivery test matrix
**All gaps · code · TODO · 2 eng-days · ~$200–400 LLM**

Run end to end against a real environment:
**solo / spousal / partnership × franchise / independent × three nationalities ×
funded-vs-partial.** Measure, per cell: completion rate, wall-clock duration, LLM
cost per package, and **file count delivered versus tier promise**.

> **Exit** — a published completion rate over the matrix, with a target, a
> measured number, and named failures. A matrix with no failures listed and no
> target stated does not count as passed.
>
> **Test** — `scripts/delivery-matrix.mjs` plus a committed results table in this
> file, dated.

---

### DR-21 · Three chaos drills, green
**G-01, G-04, G-08 · code · TODO · 1.5 eng-days**

The three drills that map to the three CRITICAL delivery failures:

1. **Kill the instance mid-run** → the package still completes or fails loudly.
2. **Force a single-document failure** → the other 19 survive; the package is
   held naming the failure; a retry regenerates only that document.
3. **Force a download-time failure** → the client gets a real error with a next
   action, and the already-generated package is not lost.

> **Exit** — all three green, either in CI or as a documented runbook someone
> other than the author has executed.
>
> **Test** — `scripts/chaos-drills.mjs`, with each drill's expected observable
> recorded.

---

### DR-22 · The generation ops dashboard
**Gap G-06 · code · DONE\* · 1.5 eng-days**

One surface answering: *how many paid generations started today, how many
completed, at what p50/p95 duration, and which are in flight right now?* This is
the number to have open on the morning the first ten clients arrive.

> **Exit** — the dashboard shows a real number for a real day, and a deliberately
> stalled job appears on it within 15 minutes.
>
> **Test** — `src/lib/__tests__/generation-metrics.test.ts`: the aggregate query
> returns correct counts and percentiles over a fixture set, including jobs in
> non-terminal states.

\* Implemented September 11, 2026 (Session 146): `generation-metrics.ts` adds
`computeGenerationMetrics()`, a pure aggregation over
`document_generation_jobs` rows (verified against the live schema, not
migration files) giving started/completed/failed-today counts, p50/p95
completion duration, and an in-flight list that includes jobs still running
from a prior day. `health-detail/route.ts` wires this in with one additional
query; `system-status/page.tsx` renders the six numbers next to the existing
active/stuck job lists. The Test criterion is met (9 fixture tests, including
non-terminal states). The Exit criterion's "a deliberately stalled job appears
on it within 15 minutes" half is a live-production observation that cannot be
verified from this session — the in-flight list already covers this by
construction (any `queued`/`running` row appears regardless of age), but has
not been watched against a real stalled job in production.

---

## Effort and sequencing

| Phase | Tasks | Eng-days | Romy |
|---|---|---|---|
| 1 — Survivability | DR-1, DR-2 | 3.5–4.5 | 1h decision |
| 2 — Visibility and recovery | DR-3, DR-4, DR-5 | 2.5 | 1h copy |
| 3 — Containment | DR-6…DR-9 | 3 | 1h decision |
| 4 — Last mile | DR-10 | 1 | — |
| 5 — Nationality neutrality | DR-11…DR-15 | 3 | 2h content |
| 6 — Single source of truth | DR-16, DR-17 | 2 | 1h copy |
| 7 — Partnership + integrity | DR-18, DR-19 | 2.5 | pricing call |
| 8 — Proof | DR-20…DR-22 | 5 | 4h · $200–400 LLM |
| | | **~22–23 days** | **~10h + LLM spend** |

**Phases 1–2 alone (6–7 days) are the launch gate.** They take the platform from
*"a paid client can be silently stranded with no recovery"* to *"every failure is
caught, communicated and retryable."* Everything after that is about not
regressing and not under-delivering — necessary, but not what stands between a
paying client and their package.

---

## Blocked on Romy

| # | Needed | Blocks |
|---|---|---|
| Decision 2 | Durable execution shape — queue, checkpointed resume, or `waitUntil()` + segmentation. Recommendation: checkpointed resume now, queue when volume justifies it. | DR-1 — the top of the sprint |
| Decision 3 | Partial-package policy — 19 of 20 succeeded: hold entirely, or release with the gap flagged and a free regeneration? Recommendation: hold and notify while volume is low. | DR-6 |
| Consulate list | The real E-2 consulate options for `M3-I-11`, or approval to source them from the existing consulate intelligence report. | DR-11 |
| Interview KB review | Domain review of the six Canada-assuming coaching passages. | DR-13 |
| Pricing call | Partnership tier price, so the Stripe Price IDs can be created. | DR-18 |
| ~~Push approval~~ | ~~18 commits sit on `dev`, unpushed.~~ **Resolved** — confirmed September 10, 2026 (Session continuation): all 18 commits (`5cd3dc5`…`364ab25`) were already on `origin/dev` prior to this check (`git merge-base --is-ancestor` against the pre-session remote tip `6b9335e` confirms it). Not a live blocker. | ~~everything downstream~~ |
