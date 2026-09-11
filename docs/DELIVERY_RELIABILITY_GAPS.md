# Delivery Reliability — Gap Register

**Opened:** September 10, 2026 (Session 145)
**Branch:** `dev` — never commit directly to `main`
**Question this register answers:** not "will the client get the visa," but
*a client pays, presses generate, and waits — does a complete, correctly
formatted document package come out the other end, every time, for every case
shape we sell to?*

**Source:** a full source trace of the live `dev` branch from Stripe webhook →
`/api/generate/start` → `/api/generate/run/[jobId]` → `runGenerationPipeline()`
→ `buildPackageManifest()` → `/api/generate/download/[applicationId]`, made
against `85b7e86`.

**Execution contract:** `docs/SPRINT_DR_DELIVERY_RELIABILITY.md` — this file
owns *what is broken*; that file owns *what we do about it, in what order, and
how we prove it*. Keep the Status column here in sync with the task table there.

**Companion, unchanged:** the document *quality* assessment plan (rule-book
conformance, adversarial officer review, expert blind grading, calibrated
confidence). The two are sequenced, not competing — there is no point grading
the quality of a document that never got delivered.

---

## The headline

The engine produces good documents. The **delivery system around it** is where a
paying client gets hurt — and the worst failure is not a crash, it is a silent
hang with no way out.

The generation pipeline is fired without being awaited, on a platform that
reclaims the instance once the response is sent. When that happens the job never
fails — it stops mid-run with the row still reading `running`. Every retry path
then refuses to restart it. Nothing emails anyone. Nothing alerts us. The client
watches a progress bar that will never move again, and the only thing that will
ever unstick it is a cron job that runs once a day at 03:00 UTC.

> **It is not a crash loop. It is a silent stall with a self-closing trap door.**
> That is worse than a crash: a crash produces an error the client can act on and
> that we can see in Sentry. This produces nothing.

---

## The traced crash scenario

Every link is current code, not hypothesis.

| When | What happens | Where |
|---|---|---|
| T+0s | Stripe webhook sets `applications.payment_status = 'paid'`. From here the client owns a deliverable we have not produced. | `api/stripe/webhook` |
| T+30s | `POST /api/generate/start` creates the job row as `queued`, inserts one `generated_documents` row per planned type and a 10-credit revision row, returns a `jobId`. | `generate/start/route.ts` |
| T+31s | `POST /api/generate/run/[jobId]` starts the pipeline **without awaiting it** and returns 202. The route's own comment says "Fire and forget." Job flips to `running`. | `generate/run/[jobId]/route.ts` |
| T+31s → ~15min | The serverless instance is free to be torn down the moment that 202 is sent. There is no `waitUntil()` or `after()` anywhere in `src/` — the only hit in the tree is a comment in `early-access/route.ts` from `cf8b44f` describing this precise hazard. | platform |
| aftermath | The `.catch()` on the pipeline promise never fires. Nothing throws — the process ceases. The "mark job failed" handler never runs. The row stays `running` forever, `current_step` frozen. | — |
| client's view | The SSE progress stream polls a dead job every 2s, indefinitely. It closes only on `completed`/`failed`; it has no stall detection. "Generating Business Plan… 34%" forever. | `generate/progress/[jobId]/route.ts` |
| client reloads | Reload makes it **permanently worse**. The page calls `/start` again; `/start` finds the job in `['queued','running']` and returns `existing: true` — and the client only calls `/run` when the job is *new*. The SSE re-attaches to the same dead job. No client-facing path out. | `generate/[applicationId]/page.tsx:354–371` |
| T + up to 24h | `health-watchdog` flips it to `failed` — **once a day, at 03:00 UTC**. Its logic is right (`running` + `updated_at` older than 30 min → failed, "Timed out — please retry"), but recovery latency is the gap to the next 3am. | `cron/health-watchdog/route.ts` |
| if still `queued` | The watchdog never reaps it at all — it filters on `status = 'running'` only. If the tab closed between `/start` and `/run`, the job sits `queued` forever, and `/start` blocks on `queued` too. **Permanently locked out, no automated recovery of any kind.** | same |
| throughout | No email to the client. No alert to us. There is no generation-failure email template and no generation-*success* one either. We would find out from support tickets. | `src/lib/emails/` |

---

## Gap register

**Severity** is by client impact, not by fix difficulty.
`CRITICAL` — a paying client can end up with no deliverable or a wrong one.
`SERIOUS` — degraded delivery or wasted money.
`STRUCTURAL` — hasn't bitten yet, but the shape of the code makes it inevitable.

| # | Gap | Severity | Status |
|---|---|---|---|
| **G-01** | Un-awaited pipeline on a platform that reclaims the instance | CRITICAL | OPEN → DR-1 |
| **G-02** | The idempotency guard becomes a permanent lock on a dead job | CRITICAL | OPEN → DR-2 |
| **G-03** | Partnership clients receive no second-investor documents at all | CRITICAL | **MITIGATED** — door closed (Session 145), tier deferred by decision (2026-09-11) |
| **G-04** | A single document failure aborts the whole run | CRITICAL | OPEN → DR-6 |
| **G-05** | Retry re-generates everything and orphans the previous run's rows | CRITICAL | OPEN → DR-7, DR-8 |
| **G-06** | No observability on the one thing that matters | SERIOUS | OPEN → DR-3, DR-4 |
| **G-07** | The progress stream has no stall detection | SERIOUS | OPEN → DR-5 |
| **G-08** | The download route builds ~29 Word files and a ZIP in one un-budgeted request | SERIOUS | OPEN → DR-10 |
| **G-09** | Canada-shaped assumptions reach the model and the document triggers | SERIOUS | **PARTIALLY CLOSED** — labels fixed Session 145; 5 items open → DR-11…DR-15 |
| **G-10** | Silent auto-approve after max revisions | SERIOUS | OPEN → DR-9 |
| **G-11** | The document plan is computed twice, in two files | STRUCTURAL | OPEN → DR-16 |
| **G-12** | Conditional documents disappear without explanation | STRUCTURAL | OPEN → DR-17 |

---

### G-01 — Un-awaited pipeline on a platform that reclaims the instance
**CRITICAL · OPEN**

The generation run is started and abandoned. Nothing keeps the compute alive
past the 202. **Awaiting it is not the fix either** — with three nested retry
loops (one Claude retry, three verifier retries, three humanization attempts)
across 15–25 documents, a full run is comfortably past the 300-second ceiling.
This needs a durable execution model, not a longer timeout.

**Evidence:** `src/app/api/generate/run/[jobId]/route.ts` — "Start pipeline
asynchronously — don't await" · zero `waitUntil` / `after` in `src/`.

---

### G-02 — The idempotency guard becomes a permanent lock on a dead job
**CRITICAL · OPEN**

`/start` refuses to create a new job while one is `queued` or `running`, and the
client only calls `/run` for brand-new jobs. Combined with G-01, a killed run is
unrecoverable from the client side. The two routes also use **different status
vocabularies** — `/start` checks `['queued','running']`, `/run` checks
`['running','pending','processing','awaiting_approval']` — which is how the
`queued`-forever hole opened.

**Evidence:** `generate/start/route.ts:89–91` · `generate/run/[jobId]/route.ts`
idempotency block · `generate/[applicationId]/page.tsx:354–371`.

---

### G-03 — Partnership clients receive no second-investor documents
**CRITICAL · MITIGATED (Session 145) — underlying tier deferred by decision, 2026-09-11**

All six `*_p2` documents — plus the P2 answer load, plus the joint cover-letter
prompt shaping — are gated on a completed payment of type `complete_partnership`.
That tier is legacy and **is not in `VALID_TIER_IDS`**; the checkout route's own
comment says the partnership variants were excluded because no Stripe price
exists for them. So a two-investor client buying Visa Ready received the **solo**
package: no source of funds, declaration, qualifications, nonimmigrant intent or
résumé for investor 2, and a cover letter naming one person. **Not filable for
the second investor.**

**Evidence:** `stripe/create-checkout/route.ts:17–30` ·
`generation-engine.ts:2769, 2782, 2959` · `generate/start/route.ts` partnership block.

**Compounding defect found while fixing it — `results/page.tsx` dead branch.**
The results page already had a complete "Contact us for partnership pricing"
branch — price card, explanatory note, `mailto:` CTA, add-on suppression — gated
on `data.application_type === "complete_partnership"`. **The quiz writes
`partnership` / `spousal_partnership`.** `complete_partnership` is a
*payment_type*, never an *application_type*; live data confirms it appears
nowhere (`quiz_sessions.application_type` = `{solo: 12, partnership: 1}`,
`applications.application_type` = `{solo: 4, partnership: 1}`). The whole branch
was unreachable, so **every partnership applicant to date saw the solo $990 price
and a live checkout button.**

**What Session 145 shipped — the door, closed at three layers:**

| Layer | File | Commit |
|---|---|---|
| Shared helper (`resolvePartnershipHold`, application-type vocabulary, hold copy) | `src/lib/partnership-hold.ts` | `5cd3dc5` |
| 10 unit tests, incl. fail-open and both lookup paths | `src/lib/__tests__/partnership-hold.test.ts` | `9657775` |
| Server guard — results-page checkout | `src/app/api/checkout/initiate/route.ts` | `30b39e6` |
| Server guard — pricing-page checkout | `src/app/api/stripe/create-checkout/route.ts` | `8e89960` |
| Client fix — dead-branch comparison replaced | `src/app/results/page.tsx` | `fbc253a` |

The guard reads the newest `quiz_sessions` row first, then the newest
`applications` row, and returns **409 + `partnershipHold: true`** with a
support-contact message before any `applications` row is created and before the
Stripe session. It **fails open by design** — a transient DB error must never
block a paying *solo* applicant — and surfaces `lookupError` so the caller reports
it to Sentry. Add-ons (`fdd_analysis_addon`, `market_analysis_addon`,
`simulator_3pack`) and `renewal` are deliberately outside `PACKAGE_TIER_IDS` and
are not held.

**Still open:** the partnership tier itself does not exist. Removing the hold is
the same change that adds the Stripe Price IDs, adds the tier to `VALID_TIER_IDS`
and `entitlements.ts`, and re-gates `isPartnership` in the pipeline on the
entitlement rather than on `complete_partnership`. → **DR-18** (deferred to
post-launch by product decision, 2026-09-11 — Romy chose to launch solo-only
rather than block launch on a partnership-surcharge pricing call).

**Demand capture while deferred:** partnership applicants now see a "Coming
Soon" state in the application flow (`src/app/apply/module1/page.tsx`) with a
"Notify me" button (`ComingSoonNotifyButton`, `interestType="partnership"`)
that writes to `coming_soon_interest` and pages Romy via `sendOpsAlert()` on
each new lead, so interest isn't lost while the tier is paused. Renewal — a
separate, fully-priced, previously-purchasable flow (`STRIPE_PRICE_RENEWAL`) —
was paused for the same launch-scope reason and gets the identical treatment;
see `src/app/renewal/RenewalEntryClient.tsx`. Admin view of captured interest:
`/admin/coming-soon-interest`.

---

### G-04 — A single document failure aborts the whole run
**CRITICAL · OPEN**

Inside the per-document loop, any throw marks that document failed, calls
`fail()` on the job, and `return`s out of the **entire pipeline**. One transient
Anthropic 529 that outlives the single API retry takes down a run that was 22
documents deep. No per-document quarantine, no continue-and-report-at-the-end.

**Evidence:** `src/lib/generation-engine.ts:3161–3175`.

---

### G-05 — Retry re-generates everything and orphans the previous run's rows
**CRITICAL · OPEN**

The resume logic is real but scoped to `job_id`. When the client retries,
`/start` mints a **new** job — so the already-approved set is empty and all 15–25
documents regenerate from zero at full LLM cost. Worse, `/start` inserts a fresh
row per document type on **every** job, while both the package manifest and the
download route read `generated_documents` filtered on `application_id` alone,
with no job scoping and no ordering. After one retry there are two rows per
document type and `.find()` returns an arbitrary one — potentially the abandoned
run's content.

**Needs confirming against the live schema** (the live database is the only
source of truth): whether a unique constraint on `(application_id,
document_type)` already prevents this. That changes the size of the fix, not
whether it is needed.

**Evidence:** `generation-engine.ts:2846–2851` (`.eq('job_id', jobId)`) ·
`cic-package-manifest.ts:122–132` · `download/[applicationId]/route.ts` step 4.

---

### G-06 — No observability on the one thing that matters
**SERIOUS · OPEN**

No email template for generation success or failure. No in-app failure notice
beyond the frozen bar. The watchdog raises no alert when it reaps a paid client's
job — it logs to console. No dashboard answering "how many paid generations
started today, how many finished, how long did they take." We would learn about a
systemic failure from a refund request.

**Evidence:** `src/lib/emails/` — 8 templates, none generation-related ·
`cron/health-watchdog/route.ts:65–72`.

---

### G-07 — The progress stream has no stall detection
**SERIOUS · OPEN**

The SSE loop polls every 2s and terminates only on `completed`/`failed`. It never
compares `updated_at` against the wall clock, so it cannot say "this has not
advanced in ten minutes." The route also declares no `maxDuration`, so the stream
is cut by the platform default and relies on the browser's automatic
`EventSource` reconnect — which resumes straight back onto the dead job.

**Evidence:** `generate/progress/[jobId]/route.ts:41, 110–115`.

---

### G-08 — The download route builds ~29 Word files and a ZIP in one un-budgeted request
**SERIOUS · OPEN**

It renders a cover page, a table of contents, a tab divider per section, one
`.docx` per document and a closing checklist — each through `Packer.toBuffer()` —
then zips the lot into a single in-memory `arraybuffer`. It declares **no
`maxDuration` and no `runtime`**. Our own `fdd/report` route carries a comment
warning that exactly this omission "can kill the request after the LLM cost is
already incurred."

The failure mode is the cruellest available: everything generated correctly and
the client still cannot get the file.

**Needs confirming:** the actual ceiling depends on the Vercel plan and whether
Fluid Compute is on.

**Evidence:** `generate/download/[applicationId]/route.ts` — no config exports ·
cf. `fdd/report/route.ts:13–17`.

---

### G-09 — Canada-shaped assumptions reach the model and the document triggers
**SERIOUS · PARTIALLY CLOSED (Session 145)**

`QUESTION_LABELS` is serialised straight into the generation prompt
(`generation-engine.ts:25` imports it; line 1117 emits `Q: … / A: …`), so a
hard-coded Canadian premise in a *label* becomes a false premise in **every
non-Canadian applicant's prompt**.

The originally-reported scope was two labels. **The investigation found eleven
files**, and the two most serious were structural rather than cosmetic:

1. **`M3-A-05` offered Canada as its only citizenship option**, and it renders
   live in Tab A — a non-Canadian applicant literally could not state their
   nationality. Worse, the option value `"CA"` could never match a prefilled
   value: `getPreFill()` returns `answers["Q0-01"]`, a full country **name**, and
   `FormField.tsx`'s plain `<select>` renders blank on an unmatched value. Fixed
   by sourcing options from `TREATY_COUNTRIES`, where value === label === country
   name. The dormant `"CA"`-keyed `warningTriggers` array (never mapped into
   `FieldConfig`) was removed with it.
2. **`src/data/module3/tab-f.json` has no consumers** — the live Tab F is
   hardcoded in `f/page.tsx`, and the two had already drifted (different QF-04
   question text). But `scripts/generate-question-registry.mjs` still reads
   `tab-*.json`, so the dead file's Canadian labels **were still reaching the LLM
   prompt** via `question-registry.generated.ts`. Both were fixed.

**Fixed and committed, Session 145 — 13 commits, one file each:**

`99b03e3` `data/module3/tab-a.json` · `321f7dd` `apply/module3/a/page.tsx` ·
`36e8494` `data/module3/tab-f.json` · `d47a1bf` `apply/module3/f/page.tsx` ·
`1449744` `apply/investment/page.tsx` · `6401aa3` `apply/partner2/page.tsx` ·
`8636455` `apply/business/page.tsx` · `1980dbd` `apply/module1/page.tsx` ·
`4749490` `apply/module3/b/page.tsx` · `a6693f8` `renewal/intake/page.tsx` ·
`b3183aa` `renewal/RenewalEntryClient.tsx` · `ac59911` `renewal/documents/page.tsx` ·
`364ab25` `lib/question-registry.generated.ts`

The regenerated registry changed exactly two lines — the two originally reported:

```
-  "M3-A-09": "Current home address in Canada"
+  "M3-A-09": "Current home address in your country of residence"
-  "QF-06": "…leaving your Canadian account?"
+  "QF-06": "…leaving your home-country account?"
```

**Deliberately deferred to the sprint — decisions, not omissions:**

| # | Item | Why deferred | Task |
|---|---|---|---|
| G-09a | `M3-I-11` offers only `{value:'toronto', label:'Toronto, Canada'}` + "Other — specify below" (`apply/qualifications/page.tsx:167`) | Expanding it needs a real E-2 consulate list from Romy. Inventing one would put wrong consulates in front of clients. | DR-11 |
| G-09b | Franchise archetype prompt block hardcodes Canadian ties, RRSP/TFSA and "would return to Canada" (`generation-engine.ts:247`, `nonimmigrant_intent`; `investment_proof` at :246 says "traceable from the Canadian source account") | Prompt-text change to a live generation path — belongs with the nationality-persona verification in DR-14, not with a label sweep. | DR-12 |
| G-09c | `interview-knowledge-base.ts` lines 314, 334, 343, 428, 435, 439 assume Canadian accounts and ties; `api/simulator/interview-prep/route.ts:185–186` | Coaching content, needs Romy's domain review to reword without losing accuracy. | DR-13 |
| G-09d | `financial_assets_portfolio` triggers only on `rrsp` / `tfsa` / `lira` / `crypto` — Canadian registered-plan vocabulary. A French applicant funding from a securities account **never gets that document generated at all.** | Trigger logic lives in both `/start` and the engine (see G-11) — must be fixed in both, with the drift test from DR-16. | DR-15 |
| G-09e | `PricingClient.tsx:208` hardcodes `application_type: 'solo'` when inserting an `applications` row — a false assertion about the client's own case | The Session 145 server guard reads `quiz_sessions` first, so nothing leaks today; the data-integrity bug remains. | DR-19 |

---

### G-10 — Silent auto-approve after max revisions
**SERIOUS · OPEN**

When a document fails three revision rounds, the loop marks it `approved` with
the note "Auto-approved after max revisions" and moves on. **It ships.** Nobody
is told. That note lives in `quality_gate_notes`, where no downstream surface
currently reads it as a warning — meaning the platform's answer to "I couldn't
get this right" is to deliver it anyway.

**Evidence:** `src/lib/generation-engine.ts:3177–3190`.

---

### G-11 — The document plan is computed twice, in two files
**STRUCTURAL · OPEN · known to have bitten**

The core list and all five conditional triggers exist independently in
`generate/start/route.ts` (which sizes the progress bar and pre-inserts the
document rows) and in `generation-engine.ts` (which actually generates). They
agree right now — but only because someone fixed a drift bug, and the fix's own
comment records the outcome: *"financial_assets_portfolio was never actually
generated despite the step counter accounting for it."* Two copies of the same
rule will drift again. **There is no test asserting they match.**

**Evidence:** `generate/start/route.ts:107–175` ·
`generation-engine.ts:2566–2582, 2719–2775` (comment at 2732–2738).

---

### G-12 — Conditional documents disappear without explanation
**STRUCTURAL · OPEN**

Six of the documents named in the Foundation feature list are conditional. When
they don't trigger they simply aren't in the ZIP, and nothing says why. The
engine already has the right idea — `gift_letter` has a NOT-APPLICABLE sentinel
path — but conditional non-triggers get no equivalent. A client counts the files
against the sales page and concludes they were short-changed, when in most cases
the omission was correct.

**Evidence:** `pricing-tier.ts` `PRICING_TIERS.foundation.features` ·
`generate/start/route.ts` conditional block · `isNotApplicableSentinel()` in
`generation-engine.ts`.

---

### G-13 — A document that fails to *build* at download time takes the whole ZIP down, silently

**SERIOUS · CLOSED (Session 146 cont.)**

DR-6/G-04 quarantines a document that fails during *generation* (writing
`content_text` to the DB). It does nothing for a document whose stored
`content_text` is fine but throws when `generate/download/[applicationId]/
route.ts` re-builds it into a `.docx` at download time — `buildDocument()` or
`Packer.toBuffer()` failing on a single tab was uncaught, so it threw through
the route's per-tab loop into the one top-level `catch`, failing the **entire**
ZIP (even the other 25+ documents that built fine) with a generic 500. The only
notification was whatever Sentry capture already existed on that top-level
catch — passive, and nobody watches it live. The client saw a failed download
and got no explanation of what happened or what to do next.

**Closed:** `buildDocumentSafely()` (`src/lib/document-build-safety.ts`) wraps
each document's build individually — a failure is skipped, not fatal, and the
rest of the package still reaches the client. A partial package gets a
plain-text note in the ZIP (`buildFailureNoteText`) naming what's missing
without leaking the raw error, and both the partial-failure and total-failure
paths now call `alertDocumentBuildFailures()`, which pages ops in real time via
`sendOpsAlert()` (a real, awaited Resend call — the same active-alert
mechanism DR-3/G-06 built for the health watchdog) rather than relying on
someone checking Sentry. Both frontend download pages
(`documents/[applicationId]/page.tsx`, `generate/[applicationId]/page.tsx`)
parse the structured error/partial-success response and show the client a
specific message with a next action, instead of a generic failure or silence.

**Evidence:** `generate/download/[applicationId]/route.ts` — see DR-23 in
`SPRINT_DR_DELIVERY_RELIABILITY.md` for the full writeup and tests.

---

## What the client actually receives

The assembly layer is the most finished part of the system. Recorded here so the
sprint does not "fix" something that is already right.

**The artifact:** a single ZIP named for the case code, containing individual
Word files — not a PDF, not one merged document. For a typical solo case
(15 core documents, 11 populated tabs) that is **29 `.docx` files**:

```
E2_Application_Package_<CASE_CODE>.zip
  00_Cover_Page.docx
  01_Table_of_Contents.docx                ← master exhibit index; also lists the client's own uploads
  Tab_B_Divider.docx · Tab_B_<CASE>_DS160_Reference.docx
  Tab_C_Divider.docx · Tab_C_<CASE>_Cover_Letter.docx
  Tab_D_Divider.docx · Tab_D_<CASE>_Source_of_Funds.docx · Tab_D_<CASE>_Gift_Letter.docx
  Tab_E_Divider.docx · Tab_E_<CASE>_Fund_Flow_Chronology.docx · Tab_E_<CASE>_Net_Worth_Statement.docx
  Tab_F_Divider.docx · Tab_F_<CASE>_Substantiality_Memorandum.docx
  Tab_G_Divider.docx · Tab_G_<CASE>_NonMarginality_Rebuttal.docx
  Tab_H_Divider.docx · Tab_H_<CASE>_Business_Plan.docx
  Tab_I_Divider.docx · Tab_I_<CASE>_Qualifications.docx · …_Resume_Principal.docx · …_Org_Chart.docx
  Tab_J_Divider.docx · Tab_J_<CASE>_Corporate_Documents_Guide.docx
  Tab_L_Divider.docx · Tab_L_<CASE>_Declaration_Principal.docx
  Tab_M_Divider.docx · Tab_M_<CASE>_Nonimmigrant_Intent_Statement.docx
  COMPLETE_BEFORE_SUBMITTING.docx          ← what the client must still add
```

**Typography and structure**

- **Century Schoolbook throughout** — 12pt body, 11pt in tables, 10pt footers. A
  legal-submission face, not a default.
- **Three heading levels** mapped from the model's markdown to real Word heading
  styles, so the files have a navigable outline rather than bolded paragraphs.
- **Markdown tables become genuine Word tables** with borders and header rows,
  full-width — financial breakdowns and fund-flow chronologies render as tables,
  not pipe characters.
- **Footers carry the case code and person code** (`P1` / the co-investor's real
  person code), so pages cannot be misfiled between investors.
- **Tab lettering A–M is canonical and single-sourced** in
  `docx-package-constants.ts`; the same scheme drives the checklist and the
  interview-day prep. Uploaded client exhibits map into the same lettering.
- **Statutory declaration language is enforced at render time**, not left to the
  model.
- **Bracket placeholders are detected** via a dedicated regex, and Session 143
  added a block on leaked ones. Two brackets remain deliberately — passport
  number and business state are not collected at intake, so the cover page prints
  `[passport number from Tab A]` for the client to fill in. Defensible, but it is
  a bracket in the first document they open, and it should be an explicit line on
  the completion checklist rather than a surprise. → **DR-17**

**Verdict on this layer: it looks like a real filing package.** Formatting risk
is low. The risk is entirely in whether the client ever reaches it — G-08 is the
one thing standing between a correctly-generated package and their hard drive.

---

## Fee vs. delivery — is $990 enough?

Foundation's feature list, reconciled line by line against what the engine will
actually produce. Investor Ready, Interview Ready and Visa Ready inherit the same
document set, so this is the whole story for the filing package.

| Promised on the pricing page | Document type | Generated? | Gate |
|---|---|---|---|
| Cover letter | `cover_letter` | Always | core |
| Business plan | `business_plan` | Always | core |
| Statement of qualifications | `qualifications` | Always | core |
| DS-160 reference sheet | `ds160_reference` | Always | core |
| Source of funds | `source_of_funds` | Always | core |
| Fund-flow chronology | `fund_flow_chronology` | Always | core |
| Net worth statement | `net_worth_statement` | Always | core |
| Investment proof | `investment_proof` | Conditional | only if funds partially deployed or committed-unspent |
| Assets portfolio | `financial_assets_portfolio` | Conditional | only if fund source mentions RRSP / TFSA / LIRA / crypto — **G-09d** |
| Substantiality memo | `visa_category` | Always | core |
| Non-marginality rebuttal | `marginality_rebuttal` | Always | core |
| Nonimmigrant-intent statement | `nonimmigrant_intent` | Always | core |
| Org chart | `org_chart` | Always | core |
| Corporate documents guide | `corporate_documents_guide` | Always | core |
| Lease summary | `lease_premises_summary` | Conditional | only if a lease agreement was uploaded |
| Property portfolio | `property_portfolio` | Conditional | only if a fund source is a property sale |
| Declaration — you | `declaration_principal` | Always | core |
| Declaration — spouse | `declaration_spouse` | Conditional | only if `M3-L-01` = yes |
| *(not on the pricing page)* | `gift_letter` | Always | core; N/A sentinel when no gift |
| *(not on the pricing page)* | `resume_principal` | Always | core |
| Gap analysis vs. 15 denial reasons | — | Yes | `gap-analysis-engine.ts` |
| Document + interview-day checklists | — | Yes | `checklist-builder.ts`, `document-checklist.ts` |
| Assembled + indexed in consulate order | — | Yes | cover page, TOC, A–M dividers |
| Second-investor document set | `*_p2` ×6 | **Never** | gated on an unpurchasable payment type — **G-03** |

**For a solo applicant, are there enough documents? Yes.** Fifteen core documents
plus a gap analysis, two checklists and a fully assembled consulate-order package
is a serious $990 deliverable — and two of the fifteen are not even claimed on the
pricing page. The engine slightly over-delivers against what it advertises for
the base case.

The two real problems are asymmetric:

- **The conditional six create a perception gap, not a substance gap.** A single,
  home-based, fully-deployed applicant with cash savings gets 15 files against a
  feature list naming 20. Every omission is individually correct — a lease summary
  with no lease is noise — but nothing tells them that. The fix is communication,
  not engineering. → **DR-17**
- **The partnership gap was a substance gap, and it was severe.** A two-investor
  client could hand over $1,490 and receive a package in which their partner does
  not exist — an undeliverable order, not a perception problem. Closed at
  checkout in Session 145 (G-03); the tier itself is still to be built (DR-18).

---

## Scope — what this register deliberately does not cover

It answers *does the platform do what it is designed and paid to do.* It says
nothing about whether the resulting documents **win visas**, and it cannot —
approval is decided months later by a consular officer whose reasoning we never
see. That belongs to the companion quality plan, which stands unchanged.

Two items need **confirming rather than assuming**, and both are flagged inline:
the live Vercel function ceiling for the download route (G-08), and whether the
live Supabase schema already enforces uniqueness on generated documents per
application (G-05). Both change the size of the fix, not whether it is needed.

---

## Open decisions

| # | Decision | Recommendation | Status |
|---|---|---|---|
| 1 | Partnership — ship the tier, or close the door? | Close the door this week; ship the tier when pricing is settled. | **RESOLVED** — door closed, Session 145 |
| 2 | Durable execution — queue, checkpointed resume, or `waitUntil()` + segmentation? | Checkpointed resumable run now; a real queue when volume justifies it. | **OPEN — blocks DR-1** |
| 3 | Does a partial package get delivered? 19-of-20 succeeded — hold entirely for e2go review, or release with the gap flagged and a free regeneration? | Hold, notify us, release manually while volume is low. | **OPEN — blocks DR-6** |
| 4 | Fix the Canada labels now? | Yes, now, as its own commit. | **RESOLVED** — done, Session 145 |
