# SESSION — Full Live-Test Diagnosis: Approval Gate, State Sync, Stuck Pipeline

**Branch:** dev
**Priority:** 🔴 URGENT — comprehensive diagnosis before any fix
**Agent:** engineering-minimal-change (read-only this session)
**Read before starting:** none — move efficiently, this is investigation

---

## START SESSION

**READ-ONLY. Browser tab may still be open — do not touch it, do not
call any API route, do not modify any file or DB row.**

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66`

---

## CONTEXT — FULL FEEDBACK LOG FROM TONIGHT'S LIVE TEST

The owner ran the generation pipeline live tonight, twice (two
separate runs — call them RUN A and RUN B). Below is the COMPLETE
list of observations, in order. Read all of it before starting —
several items are likely symptoms of the SAME root cause(s).

**RUN A** (earlier — server logs showed all 6 documents hit
"max attempts reached" on humanization, citing
"Investment figure $110,000/$143,600 differs significantly from
total $185,000" as the quality-gate failure):
- A1. Owner navigated to /generate/[uuid]. Pipeline ran through ALL 6
  documents with no opportunity to review/approve. No cancel option.
- A2. Owner reloaded — pipeline appeared to start generating again.
  Owner closed the tab.
- A3. Server logs (pasted by owner) showed: for cover_letter,
  source_of_funds (TWICE — two full attempt-cycles), investment_proof,
  business_plan, qualifications — all hit "max attempts reached"
  after exactly 3 humanization attempts, all failing the SAME
  quality-gate check (investment figure mismatch).
- A4. After RUN A's data was reseeded clean (separate session), owner
  navigated again — this is RUN B.

**RUN B** (the fresh run, after data reseed):
- B1. Cover Letter generated. Owner did NOT click anything. After
  "a few minutes," the page advanced to Source of Funds on its own.
  **Owner explicitly confirmed: zero clicks, it just moved on.**
- B2. Source of Funds content was read (excellent, real document,
  $185,000 consistent). Page said "Review and approve to continue to
  Source of Funds" — i.e., the label named the CURRENT document, not
  the next one.
- B3. Owner clicked "Request Revision" on Source of Funds (to see
  what it does). Result: NO buttons appeared (neither Approve nor
  Request Revision), no way to edit anything, no feedback of any kind.
  Owner waited.
- B4. After a wait, BOTH buttons (Approve & Continue, Request
  Revision) reappeared. Still showing Source of Funds. The page had
  NOT advanced and nothing appeared to have changed.
  **Owner's question: what does Request Revision actually DO? What
  is the workflow? (Also asked: what does "send for review" do —
  clarify whether this is a separate button/action or the owner's
  description of what Request Revision does — CHECK THE ACTUAL UI
  CODE for button labels, do not assume.)**
- B5. Owner clicked "Approve & Continue." Page moved to Investment
  Proof.
- B6. Investment Proof content read (excellent, real document,
  $185,000 consistent, includes an honest "NOT PROVIDED in data
  supplied... should be verified before filing" caveat for a
  structured total_business_cost field).
- B7. Owner uploaded a screenshot + described:
    - Sidebar: Cover Letter ✓, Source of Funds ✓ (ticked/checkmarks)
    - Sidebar: **Investment Proof shown as GRAYED OUT — even though
      owner had just approved it in B5**
    - Sidebar: Business Plan shown highlighted/active
    - Main panel: showing Business Plan CONTENT
    - Main panel HEADER: said "Qualifications Summary" — DIFFERENT
      from the content being shown
    - Owner: "as I click approve, the document area is still showing
      business plan" (i.e., clicking approve again did not change
      what was displayed, OR the display was already inconsistent
      before the click)
    - Qualifications content (pasted separately): raw JSON with
      `sections` / `full_text` keys — NOT extracted prose
    - Owner: "I believe the business plan was very short — is that
      the data, or a problem?" (business_plan content AS PASTED was
      actually long/thorough — 10 sections — so "looks short" may be
      a DISPLAY issue, not a content issue)
    - Owner: "there just needs to be a better way of describing to
      the audience what they're working on... takes a while before
      the document is finalized, even after I approved it... that's
      the behavior for ALL the documents"
    - Owner: "whether or not I actually get a button to download or
      review the documents — I'm waiting on it"
    - DS-160 Reference content (pasted): excellent, real document
    - Owner: "At the bottom of the page I see this: 'Preparing your
      DS-160 form reference guide...' — this is the ONLY indication
      verbally that it's working on something"
- B8. Owner asked: close the tab? Is it still running/using Opus?
- B9. Read-only live-check ran: job status="running", current_step=13
  (Quality Gate), updated_at 27-93 SECONDS ago at check time — ALL 6
  documents had `quality_gate_passed=False` at this point (this is
  AFTER B7's screenshot — meaning between B7 and B9, all 6 documents
  went from "ticked in sidebar" to "all failing quality gate" — the
  ticks in B7 did NOT mean "fully passed," they meant something else,
  e.g. "initial generation done").
  Voice profile confirmed to exist (humanization DID run in Step 11).
  pipeline_log stage1-4,6 not yet populated for most docs (only
  written in Step 14, which hadn't run).
- B10. Owner clarified: tab was NOT closed, still open.
- B11. New screenshot: ALL 6 documents now show ✓ in sidebar
  (including DS-160). Main panel HEADER: **"Preparing the E-2
  application of your application"** (malformed — likely a broken
  template literal, e.g. `Preparing the E-2 application of your
  ${X}` where X resolved to literal text "application" instead of
  applicant name or similar). Main panel BODY: empty except a thin
  gold divider and "Your documents are being prepared...". Bottom
  text still: "Preparing your DS-160 form reference guide..."
- B12. Owner hypothesized: maybe this is .docx/ZIP assembly (per S15)
  running, just unlabeled, and just slow because this is the first
  time 6 real documents reached this stage.
- B13. ~1 HOUR passed with NO CHANGE from B11's state. Owner: "it's
  definitely stuck."

---

## INVESTIGATION GOALS — IN PRIORITY ORDER

### PRIMARY HYPOTHESIS (from B1): Does the approval gate actually gate
anything, or does the pipeline advance regardless of user action?

B1 (Cover Letter auto-advanced with ZERO clicks) is the single most
important finding — if the "pause for approval" mechanism doesn't
actually block pipeline progression, that could explain B1, B3-B4
(Request Revision "did nothing" because nothing was listening to it
in a way that changes pipeline flow), B7 (ticks appearing before
real completion), and B11/B13 (pipeline already moved past
"awaiting approval" for all 6 before the user did anything
meaningful, and is now in a LATER stage that has no UI).

**STEP 1** — Read `src/app/generate/[applicationId]/page.tsx` AND
`src/app/api/generate/run/[jobId]/route.ts` AND the approve/revision
API route(s) (find them — likely
`src/app/api/generate/documents/[applicationId]/route.ts` or similar,
per the PATCH call visible in B-context server logs).

Answer:
- When a document reaches `awaiting_approval`, what EXACTLY happens
  on the frontend? Is there a poll/SSE listener? Does ANYTHING on a
  timer (setTimeout, setInterval, polling loop) cause the frontend OR
  backend to proceed to the next document WITHOUT an approve API call
  having been made?
- Find the Approve and Request Revision button handlers. What API
  calls do they make? What does each API route do — does Approve
  actually transition `generated_documents.status` to 'approved' AND
  is THAT transition what the backend pipeline is waiting on to
  proceed? Or does the backend pipeline proceed on its own schedule
  regardless?
- **Specifically explain B1**: trace through what would cause Cover
  Letter → Source of Funds to happen with ZERO API calls from the
  frontend (if that's what happened — confirm via
  `generated_documents.approved_at` for cover_letter: is it NULL,
  meaning never explicitly approved, even though the pipeline moved
  past it?)

### SECONDARY: What does Request Revision (B3-B5) actually do?

**STEP 2** — Find the exact button/label text in the UI code for
both buttons. Confirm: is there a THIRD button or action anywhere
called "Send for Review" or similar (the owner's question in B4)?
Search broadly — button text, API route names, status enum values.

Trace the Request Revision handler fully:
- What API route does it call?
- What does that route do — does it reset `stage3_attempts`? Does
  it re-trigger the humanization loop for JUST that document? Does
  it do anything that would explain source_of_funds running through
  TWO full attempt-cycles (A3)?
- Why did NO buttons appear for a period after clicking it (B3)?
  Is there a loading/disabled state that has no visual indicator?
- After the wait, buttons reappeared with NO visible change (B4) —
  did the backend do ANYTHING (check `generated_documents.updated_at`
  / `generation_pipeline_log` for source_of_funds — any timestamp
  changes corresponding to B3-B4's timeframe)?

### TERTIARY: Sidebar/header/content desync (B7)

**STEP 3** — Read the sidebar component and the main panel's
header/content rendering logic.

- What determines a sidebar item's ✓ vs gray-dot vs gold-active
  state? Is this ONE state variable per document, or derived from
  multiple sources that could disagree?
- B7: Investment Proof was grayed out AFTER being approved (B5). What
  status value would `generated_documents` show for investment_proof
  at that moment, and why would the sidebar render "gray" for an
  approved document?
- B7: header said "Qualifications Summary" while body showed Business
  Plan content. Are the header and body driven by the SAME state
  variable (e.g., both read `currentDocument`) or DIFFERENT ones
  (e.g., header reads `job.current_step_label` from SSE while body
  reads `selectedDocument` from a different source)? If different —
  THIS is likely why they can disagree.

### QUATERNARY: The qualifications JSON issue + business_plan "short"
perception

**STEP 4** — For `qualifications`: find the prompt file
(`prompts/v1/documents/qualifications.md` or similar). Does it
request JSON output (`sections`/`full_text` keys match what was
seen)? Is there a post-processing step elsewhere that's supposed to
extract `full_text` before storing/displaying — does it exist, is it
called, does it work?

For `business_plan`: the content PASTED by the owner was long (10
sections). But the owner perceived it as "very short" in the UI. Is
there a possibility the main panel was showing a DIFFERENT (shorter)
piece of content than what's in the DB — connects to STEP 3's
header/body desync. Check: at the moment B7's screenshot was taken,
what would `business_plan`'s content_text in the DB have been
(was it perhaps STILL the short/failed version from a retry attempt,
with the long good version arriving later)?

### CRITICAL: B11/B13 — what is "Preparing the E-2 application of
your application" and why has it been stuck ~1 hour?

**STEP 5** — Job status NOW: `document_generation_jobs.status`,
`current_step`, `updated_at` (how long ago — confirm still ~1hr
static or has it moved since B13?).

Search for the literal string "Preparing the E-2 application" or
"is being prepared" in the codebase. Find the exact component and
template literal. What variable was meant to interpolate? Why does it
render as literal "your application" — is the variable undefined/
null and falling back to a hardcoded string, or is there a typo where
a variable name doesn't match what's in scope?

Is this header tied to a SPECIFIC job/pipeline status value (e.g., a
catch-all "else" branch for any status not explicitly handled)? If
job status is something like 'completed' or 'partial' or even still
'running' at a step >15 — does ANY explicit branch exist for that
value, or does everything fall through to this malformed catch-all?

B12's hypothesis (.docx/ZIP assembly, S15): is there ANY code path
between Step 15 and the download UI that does file generation? Could
THAT be what's been running for an hour — check for any long-running
operation (file I/O, multiple sequential awaits in a loop over 6
documents) in `docx-builder.ts` / `checklist-builder.ts` / the
download route, and whether anything calls into that path
automatically (not just on-demand when a user clicks download).

If status is static for ~1hr with current_step <=15: what could cause
Step 13 (seen active in B9, 27s-93s old) to never complete — given
ALL 6 documents had `quality_gate_passed=False` in B9, does Step 13's
re-prompt loop have any exit condition, or could it loop indefinitely
re-prompting documents that will NEVER pass the broken
investment-figure consistency check (the SAME root cause from RUN A,
now potentially causing RUN B to hang in an infinite re-prompt loop
rather than terminating with FAILED statuses)?

---

## SYNTHESIS — REPORT YOUR BEST UNIFIED EXPLANATION

After STEPS 1-5, attempt to explain AS MANY of B1-B13 as possible
with as FEW root causes as possible. Specifically address:

- Does ONE bug (e.g., "approval gate doesn't actually gate, pipeline
  advances on its own") explain B1, B3-B4, B7's premature ticks, and
  the eventual stuck state?
- Is the STUCK state (B13) the SAME root cause as RUN A's failure
  (the investment-figure consistency check), now manifesting as an
  infinite loop instead of a terminal FAILED — i.e., did the
  retry-loop fix from the prior session change "3 attempts then
  FAILED" into "3 attempts then [something that re-enters Step 13
  forever]"?
- Or are there genuinely 2-3 SEPARATE bugs here (gate doesn't gate +
  header/body desync + Step 13 infinite loop)?

---

## RECOVERY PATH

Given the 6 documents' CONTENT is good (real, coherent, matches
across documents on the figures that should match) — what is the
safest way to get the owner to a viewable/downloadable state WITHOUT
losing this content and WITHOUT triggering new Opus calls?

If Step 13 is in an infinite re-prompt loop because the
investment-figure check can never pass — could a DIRECT DB UPDATE
(setting `final_status='FAILED'` or `'PENDING_REVIEW'` for the 5
documents that aren't ds160_reference, matching what RUN A's data
showed: ds160_reference was the one real PASS) break the loop and let
Step 14/15 run, reaching a terminal job status? Would the frontend
then render SOMETHING (even if it's the malformed-header catch-all,
at least it might show a download option per S15)?

---

## DO NOT IN THIS SESSION

- Do not touch the browser (leave open tab alone)
- Do not call any API route
- Do not modify any file or DB row
- Do not restart anything
- Do not attempt the recovery path — just identify it

---

## COMPLETION REPORT

```
Full live-test diagnosis complete (read-only).

STEP 1 — Approval gate mechanism:
  [does the pipeline wait for an approve API call, or advance
  independently? Explain B1 specifically. cover_letter.approved_at
  value?]

STEP 2 — Request Revision:
  [exact button labels found — is there a "Send for Review"?
  what does Request Revision's API route do? explain B3
  (no buttons) and B4 (no visible change) and A3's double-cycle
  on source_of_funds]

STEP 3 — Sidebar/header/content state sources:
  [one state var or multiple? explain B7's investment_proof
  gray-after-approval and header/body mismatch]

STEP 4 — qualifications JSON / business_plan short:
  [JSON in prompt confirmed? extraction step exists/works?
  business_plan content at time of B7 — was DB content already
  the long good version, or still short?]

STEP 5 — Current job status + "Preparing the E-2 application of
  your application":
  status=[?] current_step=[?] updated_at=[?] ([how long ago,
  has it moved since B13?])
  Malformed header: [exact code, variable, why it renders this way,
  what status value triggers this branch]
  Step 13 infinite-loop hypothesis: [confirmed/ruled out, with
  reasoning]
  S15 docx/zip hypothesis: [confirmed/ruled out]

SYNTHESIS:
  [unified explanation — how many root causes, which B-items each
  one explains]

RECOVERY PATH:
  [specific recommendation]
```
