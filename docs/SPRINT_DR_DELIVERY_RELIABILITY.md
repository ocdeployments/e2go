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
| **DR-1** | Durable execution for the generation pipeline | G-01 | infra | **BLOCKED (Decision 2)** |
| **DR-2** | One status vocabulary, and a client that can re-attach *and* restart | G-02 | code | TODO |

### Phase 2 — Visibility and recovery · **blocks launch**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-3** | Watchdog every 10 minutes, reaping `queued` too, alerting to Sentry | G-06 | infra | TODO |
| **DR-4** | Generation lifecycle emails — complete, and reset-after-failure | G-06 | code | TODO |
| **DR-5** | Stall detection in the progress stream, with a retry that actually retries | G-07 | code | TODO |

### Phase 3 — Containment inside a run · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-6** | Per-document quarantine — one failure stops one document | G-04 | code | **BLOCKED (Decision 3)** |
| **DR-7** | Scope the resume set to the application, not the job | G-05 | code | TODO |
| **DR-8** | Guarantee one row per (application, document type) | G-05 | migration | TODO |
| **DR-9** | "Auto-approved after max revisions" becomes a blocking condition | G-10 | code | TODO |

### Phase 4 — The last mile · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-10** | Budget and bound the download route | G-08 | infra | TODO |

### Phase 5 — Nationality neutrality · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-11** | Real E-2 consulate list for `M3-I-11` | G-09a | content | **BLOCKED (needs Romy)** |
| **DR-12** | De-Canadianise the franchise archetype prompt blocks | G-09b | code | TODO |
| **DR-13** | De-Canadianise the interview knowledge base and prep route | G-09c | content | **BLOCKED (needs Romy)** |
| **DR-14** | Nationality-persona verification across the prompt corpus | G-09 | code | TODO |
| **DR-15** | Broaden the `financial_assets_portfolio` trigger vocabulary | G-09d | code | TODO |

### Phase 6 — Single source of truth and honest delivery · **pre-first-client**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-16** | One document plan, asserted identical in CI | G-11 | code | TODO |
| **DR-17** | Tell the client what was *correctly* omitted | G-12 | code | TODO |

### Phase 7 — Partnership tier and data integrity

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-18** | Build the partnership tier and remove the hold | G-03 | decision | **BLOCKED (pricing call)** |
| **DR-19** | Stop asserting `application_type: 'solo'` at checkout | G-09e | code | TODO |

### Phase 8 — Prove it, then keep proving it · **standing**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **DR-20** | The delivery test matrix | all | code | TODO |
| **DR-21** | Three chaos drills, green | G-01, G-04, G-08 | code | TODO |
| **DR-22** | The generation ops dashboard | G-06 | code | TODO |

---

## Phase 1 — Survivability

### DR-1 · Durable execution for the generation pipeline
**Gap G-01 · infra · BLOCKED on Decision 2 · 3–4 eng-days · Romy: 1h decision**

Move the pipeline off fire-and-forget. Three viable shapes, in descending order
of preference:

- **(a) A durable queue** — a job row plus a worker the platform cannot reclaim
  mid-flight. Right long-term answer, most work.
- **(b) A checkpointed resumable run** — a scheduled invocation picks up any job
  whose `updated_at` is stale and continues it from the already-approved set.
  Reuses the resume logic that already exists; roughly half the effort of (a).
  **Recommended for now.**
- **(c) At minimum, `waitUntil()` plus segmenting the run** so no single
  invocation exceeds the ceiling. Cheapest, most likely to need redoing.

Awaiting the pipeline is **not** an option: three nested retry loops (one Claude
retry, three verifier retries, three humanization attempts) across 15–25
documents put a full run comfortably past the 300-second ceiling.

Whichever shape, the invariant holds: **a job in flight always has something that
will finish it or fail it.**

> **Exit** — kill the instance at document 3 of 20, walk away, and the package
> still completes, or fails loudly, with no human intervention. Demonstrated by a
> deliberate kill against a real environment, not by reasoning about the code.
>
> **Test** — `src/lib/__tests__/generation-resume.test.ts`: given a job row with
> a stale `updated_at` and a partially-populated approved set, the resumer picks
> it up, regenerates only the un-approved documents, and terminates the job in a
> terminal state. A job with a fresh `updated_at` is left alone.

---

### DR-2 · One status vocabulary, and a client that can re-attach *and* restart
**Gap G-02 · code · TODO · 0.5 eng-day**

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
**Gap G-06 · infra · TODO · 0.5 eng-day**

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
**Gap G-06 · code · TODO · 1 eng-day · Romy: 1h copy**

`src/lib/emails/` has eight templates and none of them concern generation. Add
two:

- **Package ready** — a run this long should not tether the client to an open
  tab.
- **We reset your run** — sent by the watchdog on reap: *"your package hit a
  snag, we've reset it, press generate again"*, with the direct link.

Both go through the existing Resend helper. **Await the send** — `cf8b44f` exists
precisely because an un-awaited Resend call was torn down before it left the
function, and a real submission never reached Resend at all.

> **Exit** — a completed run and a reaped run each put a real email in a real
> inbox, sent from the deployed environment, not from a local script.
>
> **Test** — `src/lib/emails/__tests__/generation-emails.test.ts`: both templates
> render with a realistic payload, contain the application link, and contain no
> unresolved `[bracket]` placeholders.

---

### DR-5 · Stall detection in the progress stream, with a retry that actually retries
**Gap G-07 · code · TODO · 1 eng-day**

`generate/progress/[jobId]/route.ts` polls every 2s and terminates only on
`completed`/`failed`. Add: a comparison of `updated_at` against the wall clock,
emitting a `stalled` event past ten minutes; an explicit `maxDuration` on the
route so the platform's default cut is a decision rather than a surprise; and a
client-side stalled state offering a retry button that **re-issues `/run`** (see
DR-2 — a retry that only re-attaches the SSE stream is the trap door, not the
exit).

> **Exit** — freeze a job's `updated_at`; within ten minutes the UI says so and
> offers a retry; pressing it restarts the pipeline and the bar moves.
>
> **Test** — `src/app/api/generate/__tests__/progress-stall.test.ts`: a job whose
> `updated_at` is 11 minutes old emits `stalled`; one 9 minutes old does not; a
> `completed` job closes the stream.

---

## Phase 3 — Containment inside a run

### DR-6 · Per-document quarantine — one failure stops one document
**Gap G-04 · code · BLOCKED on Decision 3 · 1.5 eng-days**

Today any throw inside the per-document loop marks that document failed, calls
`fail()` on the job and `return`s out of the **entire pipeline**
(`generation-engine.ts:3161–3175`). One transient Anthropic 529 that outlives the
single API retry takes down a run that was 22 documents deep.

Replace with: mark the document failed, **continue**, and report the failed set
at the end. The delivery gate already knows how to hold a package for review —
that is the right destination for a partial run, rather than losing nineteen good
documents to one bad one.

**Decision 3 gates the last step:** when 19 of 20 succeed, does the client get a
held package (recommended — notify us, release manually while volume is low) or a
released package with the gap flagged and a free regeneration? Build the
quarantine either way; the disposition branch waits on the answer.

> **Exit** — fault-inject a hard failure on one document mid-run: the other 19
> survive, the package is held for review naming the failed document, and a retry
> regenerates **only that one**.
>
> **Test** — `src/lib/__tests__/generation-quarantine.test.ts`: a per-document
> throw leaves the loop running, the job reaches a terminal state, the failed
> document is named in the job's failure summary, and the 19 successes retain
> `approved`.

---

### DR-7 · Scope the resume set to the application, not the job
**Gap G-05 · code · TODO · 0.5 eng-day**

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
**Gap G-05 · migration · TODO · 0.5 eng-day**

`/start` inserts a fresh `generated_documents` row per document type on **every**
job, while both `cic-package-manifest.ts:122–132` and the download route filter
on `application_id` alone, with no job scoping and no ordering. After one retry
there are two rows per type and `.find()` returns an arbitrary one — potentially
the **abandoned run's** content.

**First, confirm against the live database** whether a unique constraint on
`(application_id, document_type)` already exists — that changes the size of this
fix, not whether it is needed. Then either add the constraint and upsert, or
order the reads deterministically by `created_at desc` and scope to the winning
job. Prefer the constraint: an ordering convention in two files is the same shape
of bug as G-11.

> **Exit** — an application that has been retried twice yields exactly one row per
> document type, and the ZIP contains the content from the run that actually
> completed.
>
> **Test** — `src/lib/__tests__/package-manifest-dedupe.test.ts`: given duplicate
> rows for one document type across two jobs, the manifest and the download
> assembly both select the completed run's row, deterministically.

---

### DR-9 · "Auto-approved after max revisions" becomes a blocking condition
**Gap G-10 · code · TODO · 0.5 eng-day**

`generation-engine.ts:3177–3190` marks a document `approved` after three failed
revision rounds with the note "Auto-approved after max revisions" — and ships it.
The note lives in `quality_gate_notes` where nothing reads it as a warning. The
platform's answer to *"I couldn't get this right"* is currently to deliver it
anyway.

Make it a first-class state: the document is flagged, the package is **held for
e2go review** (the same gate Session 142 built), and we are alerted.

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
**Gap G-08 · infra · TODO · 1 eng-day**

`generate/download/[applicationId]/route.ts` renders a cover page, a table of
contents, a tab divider per section, one `.docx` per document and a closing
checklist — each through `Packer.toBuffer()` — then zips the lot into a single
in-memory `arraybuffer`, with **no `maxDuration` and no `runtime`**. Our own
`fdd/report/route.ts:13–17` carries a comment warning that exactly this omission
"can kill the request after the LLM cost is already incurred."

Steps: **confirm the real ceiling** for the current Vercel plan and whether Fluid
Compute is on; declare `runtime` and `maxDuration` explicitly; measure the
wall-clock and peak memory of a full 29-file assembly; if it is anywhere near the
ceiling, move assembly to a pre-built artifact stored at completion time and make
download a redirect to a signed URL.

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
**Gap G-09b · code · TODO · 0.5 eng-day**

`generation-engine.ts` around line 247 hardcodes Canadian ties in the franchise
archetype: `nonimmigrant_intent` instructs the model to "document Canadian ties:
property retained in Canada… Canadian bank accounts and registered savings (RRSP,
TFSA)" and that the investor "would return to Canada"; `investment_proof` at :246
requires the trail be "traceable from the Canadian source account."

Interpolate the applicant's actual country and asset vocabulary from the case
brief. This is a live generation path — pair it with DR-14 rather than shipping
it blind.

> **Exit** — a Japanese franchise persona's `nonimmigrant_intent` prompt contains
> Japan and no Canadian instrument names.
>
> **Test** — `src/lib/__tests__/prompt-nationality.test.ts`: build the prompt for
> three non-Canadian personas; assert zero occurrences of `Canada`, `Canadian`,
> `RRSP`, `TFSA`, `LIRA` outside a case where the applicant *is* Canadian.

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
**Gap G-09 · code · TODO · 1 eng-day**

The label sweep found eleven files when the report named two. A grep is not a
guarantee — the check has to be a persona running end to end.

Build three fixture personas (French, British, Japanese) and assert **no Canadian
premise anywhere in the assembled prompt corpus or the generated output**, and
that each correctly receives (or correctly does not receive) the assets
portfolio. This is the standing regression net for DR-11, DR-12, DR-13 and DR-15.

> **Exit** — three personas generate a full package each; a reviewer reads one
> `nonimmigrant_intent` and one `source_of_funds` per persona and finds no false
> premise.
>
> **Test** — `src/lib/__tests__/nationality-personas.test.ts`, wired into CI.

---

### DR-15 · Broaden the `financial_assets_portfolio` trigger vocabulary
**Gap G-09d · code · TODO · 0.5 eng-day**

The trigger fires only on `rrsp`, `tfsa`, `lira` or `crypto` — Canadian
registered-plan vocabulary. **A French applicant funding from a securities
account never gets that document generated at all.** Broaden to any securities,
pension, brokerage or investment-account source.

The trigger lives in **both** `generate/start/route.ts` and
`generation-engine.ts` (G-11), so it must be changed in both — and DR-16 is what
stops them drifting apart again afterwards.

> **Exit** — a French persona whose fund source is a securities account receives
> the assets portfolio; a cash-savings persona correctly does not.
>
> **Test** — covered by DR-16's plan-equality test plus a trigger table test in
> `src/lib/__tests__/document-plan.test.ts` over eight fund-source shapes.

---

## Phase 6 — Single source of truth and honest delivery

### DR-16 · One document plan, asserted identical in CI
**Gap G-11 · code · TODO · 1 eng-day**

The core list and all five conditional triggers exist independently in
`generate/start/route.ts:107–175` (which sizes the progress bar and pre-inserts
the document rows) and `generation-engine.ts:2566–2582, 2719–2775` (which
actually generates). They agree today only because someone fixed a drift bug —
and that fix's own comment records the cost: *"financial_assets_portfolio was
never actually generated despite the step counter accounting for it."*

Extract one `buildDocumentPlan(caseProfile)` and have both call it. If extraction
is too invasive to do safely in one commit, the **minimum** acceptable outcome is
a CI test asserting the two plans are identical across a matrix of case shapes —
the same shape of guard that made Session 144's fail-open `elementPatterns` safe.

> **Exit** — deliberately add a conditional document to one file only; CI fails.
>
> **Test** — `src/lib/__tests__/document-plan.test.ts`: over ≥12 case shapes
> (solo/spousal × franchise/independent × funded/partial × lease/no-lease), the
> plan from `/start` and the plan from the engine are set-equal, and the step
> count equals the plan length.

---

### DR-17 · Tell the client what was *correctly* omitted
**Gap G-12 · code · TODO · 1 eng-day · Romy: 1h copy**

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
**Gap G-09e · code · TODO · 0.5 eng-day**

`src/app/pricing/PricingClient.tsx:208` hardcodes `application_type: 'solo'` when
inserting the `applications` row — a false assertion about the client's own case,
written from the client side. Nothing leaks today because the Session 145 server
guard reads `quiz_sessions` first, but the row is wrong in the database, and the
next feature that trusts `applications.application_type` will inherit the bug.

Carry the real value through from the quiz session, server-side.

> **Exit** — a partnership quiz session that reaches checkout writes
> `application_type: 'partnership'`, not `'solo'`. Verified against the live
> database, not against the migration files.
>
> **Test** — `src/app/api/checkout/__tests__/application-type.test.ts`: the
> inserted row's `application_type` matches the quiz session's for all three
> vocabulary values.

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
**Gap G-06 · code · TODO · 1.5 eng-days**

One surface answering: *how many paid generations started today, how many
completed, at what p50/p95 duration, and which are in flight right now?* This is
the number to have open on the morning the first ten clients arrive.

> **Exit** — the dashboard shows a real number for a real day, and a deliberately
> stalled job appears on it within 15 minutes.
>
> **Test** — `src/lib/__tests__/generation-metrics.test.ts`: the aggregate query
> returns correct counts and percentiles over a fixture set, including jobs in
> non-terminal states.

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
| Push approval | 18 commits sit on `dev`, unpushed. | everything downstream |
