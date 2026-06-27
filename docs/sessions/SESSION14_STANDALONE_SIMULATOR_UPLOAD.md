# SESSION 14 — Standalone Simulator: Document Upload → Parse → Interview

**Branch:** dev
**Priority:** 🟢 New feature — extends the existing $197 standalone
simulator product to work WITHOUT a completed case file, by reusing the
existing document extraction engine
**Agent:** engineering-frontend-developer (UI) + engineering-minimal-change
(wiring extraction → simulator question generation) +
engineering-code-reviewer
**Read before starting:** docs/INTERVIEW_SIMULATOR_SPEC.md (question bank
generation logic — Step 1 universal + Step 2 business-type questions),
docs/DOCUMENT_UPLOAD_SPEC.md (existing extraction engine — REUSE this, do
not rebuild), `src/lib/text-extraction.ts`, `/api/documents/extract`

---

## CONTEXT — WHAT THIS IS, AND WHY IT'S SMALLER THAN IT SOUNDS

The simulator is sold standalone ($197) per BUILD_TRACKER pricing —
"included in all packages AND available standalone." Today, the simulator
REQUIRES a substantially-complete Module 3 case file (per IDEAS.md 12G —
"simulator reads the filed package"). Someone who bought the standalone
simulator WITHOUT going through the full case file flow has nothing for
the simulator to read.

**This session's job:** give standalone-simulator users an alternative
path to populate the data the simulator needs — by uploading their OWN
existing documents (cover letter, business plan) instead of completing
Module 3's full case file.

**Critical reuse point:** the extraction engine for this ALREADY EXISTS —
built for `/apply/upload` (self-preparer intake, Sessions A+B, marked
✅ COMPLETE). It does PDF/DOCX/XLSX/CSV parsing via
`src/lib/text-extraction.ts`, produces structured extracted fields with
confidence levels, via `POST /api/documents/extract` with SSE progress.
**DO NOT BUILD A NEW EXTRACTION ENGINE.** This session WIRES the existing
extraction output into the simulator's question generation input
(per INTERVIEW_SIMULATOR_SPEC.md Step 1/2 — `business_category`,
investment data, etc.).

---

## STEP 1 — ELIGIBILITY GATE FOR THIS FLOW

Per owner: standalone simulator access requires login + either (a) a
purchased standalone simulator session (`STRIPE_PRICE_SIMULATOR_3PACK` or
equivalent standalone purchase record), OR (b) an existing account (the
2-included-sessions case for full-package customers who haven't completed
Module 3 yet).

1. Find how simulator session entitlement is currently checked (per
   BUILD_TRACKER: "Session limit tracking (used/purchased on
   applications)" — `simulator_sessions`/`simulator_answers` tables)
2. This flow is for: a logged-in user WITH simulator entitlement (purchased
   or included) but WITHOUT sufficient Module 3 case file data (the
   condition Session 13 will have clarified/fixed for the gating check)
3. Do NOT change entitlement logic itself — only add this as an
   ALTERNATIVE path to satisfy the "simulator needs data" requirement

---

## STEP 2 — STANDALONE INTAKE UI

Building on Session 12's Item 2 teaser (`/simulator` without sufficient
case file data) — instead of (or in addition to) just explaining the
gate, offer TWO paths:

```
"The simulator needs some information about your business to generate
realistic questions. You can either:

[Complete your case file →]  (existing path — full Module 3)

  — or —

[Upload your documents instead →]  (THIS SESSION'S NEW PATH)
  Have a cover letter or business plan already? Upload it and we'll
  generate your interview from there.
```

### New route: `/simulator/quick-start` (or `/apply/upload` variant scoped
to simulator-only — agent's choice, report which)

1. **Basic info form** — minimal fields needed that AREN'T reliably
   extractable from documents: applicant name (if not in doc), business
   category/type (dropdown, same categories as
   INTERVIEW_SIMULATOR_SPEC.md's business-type question sets — senior
   care, franchise, commercial cleaning, etc.), target consulate
   (default Toronto). Keep this MINIMAL — the goal is upload-first, not
   another long form.

2. **Document upload** — per owner: cover letter + business plan
   (2 file inputs, PDF/DOCX accepted per existing extraction engine
   support). Both optional individually but at least ONE required.

3. **Reuse `POST /api/documents/extract`** — call with these 1-2 files.
   SSE progress reuses the EXISTING processing UI pattern from
   `/apply/upload/processing` (don't rebuild this screen — adapt/reuse
   the component)

4. **Extraction output → simulator input mapping**
   The existing extraction produces structured fields with confidence
   levels (per CLAUDE_CONTEXT's "From your documents" badge pattern).
   Map relevant extracted fields to INTERVIEW_SIMULATOR_SPEC.md's
   question-generation inputs:
   - `business_category` (Step 2's business-type question selection)
   - Investment amount/breakdown (UQ-02)
   - Fund sources (UQ-03)
   - Role/title (UQ-04)
   - Employee count/hiring plan (UQ-05)
   - Revenue projections (UQ-06)
   - Operational status (UQ-07)
   - Location/business name (UQ-08)

   Find the existing extraction field schema (check
   `src/lib/text-extraction.ts` output types) and produce a mapping
   table in the completion report — which extracted fields map to which
   simulator inputs, and which simulator inputs have NO corresponding
   extracted field (these become either: skipped questions, or the
   basic-info-form fields from Step 2.1)

5. **No discrepancy/gap-report gate** — per owner's framing ("perhaps the
   person just wants to try out the simulator"), this is a LIGHTER WEIGHT
   flow than `/apply/upload`'s full review/gaps pages. Skip
   `/apply/upload/review` and `/apply/upload/gaps` entirely for this path
   — go straight from extraction to simulator. If critical fields are
   missing (e.g. NO business category determinable from either upload or
   form), prompt for just that ONE missing field inline, don't redirect
   to a full gap report.

---

## STEP 3 — TEMPORARY APPLICATION RECORD

The simulator's existing architecture reads from `application_id` (per
12G — "the filed package"). For this flow, there's no real Module 3
application.

### Options (agent: choose based on smallest-change-that-fits-architecture)

**Option A** — Create a minimal `applications` row for this user (if one
doesn't exist) populated ONLY with the extracted/form data needed for
simulator question generation. Mark it distinctly (e.g.
`source = 'simulator_standalone'` column) so it's not confused with a
real in-progress case file, and EXCLUDED from dashboard "continue your
application" prompts, Session 9's package summary, etc.

**Option B** — If the simulator's question-generation function can accept
a data object directly (not strictly requiring a DB-backed
`application_id`), bypass DB storage entirely — pass the
extracted+form data straight into question generation in-memory for this
session only.

RECOMMENDATION: Option B if architecturally feasible (simpler, no DB
schema changes, no risk of polluting dashboard/other features with fake
applications) — but Option A may be necessary if simulator session
storage (`simulator_sessions`/`simulator_answers`) requires a real
`application_id` foreign key. Investigate and report which.

If Option A is required: add `source` column to `applications`
(IF NOT EXISTS, per RULE 4), and audit dashboard/`/apply`/Session 9
summary queries to EXCLUDE `source = 'simulator_standalone'` rows.

---

## STEP 4 — GENERATE QUESTIONS AND RUN INTERVIEW

Once data is available (via Option A or B):
1. Call the EXISTING question-generation logic
   (INTERVIEW_SIMULATOR_SPEC.md Step 1 + Step 2) with the
   extracted/form-derived data
2. Proceed into the EXISTING simulator UI (text/voice mode selection,
   timer, evaluation, coaching summary) — UNCHANGED from current
   implementation
3. The ONLY difference from the normal flow: data SOURCE (uploaded docs +
   minimal form vs. full Module 3), not simulator BEHAVIOR

---

## DO NOT IN THIS SESSION

- Do not rebuild `src/lib/text-extraction.ts` or `/api/documents/extract`
  — reuse as-is
- Do not change simulator entitlement/purchase logic
- Do not change simulator functionality (text/voice modes, timer,
  evaluation, coaching) — only how it gets its INPUT data
- Do not let standalone-flow temporary records (if Option A) appear in
  dashboard, /apply, or Session 9's package summary as if they were real
  applications
- Do not skip the "at least one document required" check — a fully empty
  upload + minimal form likely produces too few question-generation
  inputs for a meaningful simulation; if business category alone (from
  the form) is enough per INTERVIEW_SIMULATOR_SPEC.md's Step 2 minimum,
  confirm this and report

---

## VERIFY

1. Logged in as an account WITH simulator entitlement but WITHOUT
   sufficient Module 3 data (per Session 13's findings on what "blank"
   account looks like)
2. Navigate to `/simulator` → Session 12's teaser → "Upload your
   documents instead"
3. Fill minimal form (business category, etc.) + upload a sample
   cover letter and/or business plan (use Chen's generated documents as
   test files if convenient, or any sample .docx/.pdf)
4. Confirm extraction runs (SSE progress, reused UI)
5. Confirm question bank generated reflects uploaded content (e.g. if
   uploaded business plan mentions a specific business type, Step 2
   business-type questions match that category)
6. Confirm simulator runs normally from there (text or voice mode)
7. Confirm dashboard/other surfaces unaffected (no phantom application
   appears, per Option A's exclusion if applicable)
8. npm run build clean

---

## COMPLETION REPORT

```
SESSION 14 — Standalone simulator document-upload flow complete.

STEP 1: Entitlement check — reused existing logic at: [file]
  No changes to entitlement itself: [confirmed]

STEP 2: New route: [path]
  Basic info form fields: [list]
  Documents accepted: cover letter + business plan, formats: [...]
  Extraction reused from: [confirmed same /api/documents/extract]
  Review/gaps pages skipped for this flow: [confirmed]

  Extraction field → simulator input mapping table:
  | Extracted field | Simulator input | Notes |
  |---|---|---|
  [fill in]

  Simulator inputs with NO extraction mapping (form-only or skipped):
  [list]

STEP 3: Data flow approach: [Option A / Option B] — reasoning: [...]
  If Option A: source column added, dashboard/apply/summary exclusion
    queries updated: [list files]

STEP 4: Question generation + simulator UI: [confirmed unchanged,
  only input source differs]

VERIFY:
  Full flow test (upload → extraction → questions → simulator run):
    [pass/fail, describe]
  Question bank reflects uploaded content's business category: [yes/no]
  No phantom application visible elsewhere: [confirmed / N/A for Option B]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
