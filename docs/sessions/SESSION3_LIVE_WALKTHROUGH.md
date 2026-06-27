# SESSION 3 — Live Walkthrough: Full Flow as a Customer

**Branch:** dev
**Priority:** 🟢 The payoff — this is where you see the result
**Format:** RUNBOOK — you drive, agent supports/fixes issues as they
come up live
**Prerequisites:** Session 1 (.docx fixes) AND Session 2 (confirmation
panel) BOTH complete and committed. Do not run this session until
both are done — otherwise you'll see known bugs we've already fixed
on paper, and won't see the new confirmation panel that's the actual
point of tonight's design work.

---

## BEFORE YOU START

Tell Claude Code:

```
Start session. Confirm Sessions 1 and 2 from docs/sessions/ are both
complete and committed (check BUILD_TRACKER.md). Then read this file
(SESSION3_LIVE_WALKTHROUGH.md) fully and confirm you're ready to
support a live walkthrough — I'll be driving in the browser, you'll
be watching logs/DB and fixing anything that comes up.
```

---

## STEP 0 — FRESH START

Michael Chen's application (`9f981747-e3e4-4941-9f86-9871f8117b66`)
currently has 6 GOOD recovered documents from tonight's recovery work
— but it's in a `'partial'` job status with the acknowledgment gate
unresolved (Step 14 never completed cleanly). For a TRUE "as a
customer" walkthrough that exercises the NEW confirmation panel (which
sits BEFORE generation), you need either:

**Option A — same application, reset to pre-generation state.**
Ask Claude Code to reset `document_generation_jobs` for this
application back to a pre-Step-1 state (or delete the job row
entirely if jobs are created fresh each run) WITHOUT touching
`generated_documents` (the 6 good docs stay as a reference/backup) —
this lets you reach the NEW confirmation panel as if for the first
time, see Chen's real $185,000 breakdown, confirm it, and generation
runs FRESH (Steps 1-15 with Piece 3's fix + the new panel).

**Option B — wipe and reseed** (per
SESSION_WIPE_RESEED_CHEN.md pattern from earlier tonight) — fully
fresh, more expensive (Opus calls for all 6 documents again), but
closest to a brand-new customer.

RECOMMENDATION: Option A. The data is already correct (verified
multiple times tonight); Option B's only advantage is testing the
SEED process itself, which isn't what tonight is about. Ask Claude
Code which is simpler given the current schema — proceed with
whichever, but Option A is preferred if straightforward.

```
Ask Claude Code: "What's the simplest way to reset application
9f981747-e3e4-4941-9f86-9871f8117b66 to a pre-generation state —
deleting/resetting document_generation_jobs and any
pre_generation_confirmation row for this application — WITHOUT
touching generated_documents (keep the 6 recovered documents as-is,
they may get overwritten by fresh generation, that's fine, but don't
PRE-emptively delete them)? Do this, then confirm the application is
ready for a fresh run starting from the confirmation panel (or Module
4 completion, whichever Session 2 determined is the entry point)."
```

---

## STEP 1 — NAVIGATE TO THE ENTRY POINT

Per Session 2's Step 1 decision (Module 4 Stage 3.5, or generate
page's new initial state) — navigate there as Michael Chen
(`SKIP_PAYMENT_WALL=true` per BUILD_TRACKER's standard test setup).

**WHAT YOU SHOULD SEE — THE NEW CONFIRMATION PANEL:**

- Opening framing: "Before we draft anything, let's make sure we have
  your investment exactly right..."
- A breakdown table: $1,000 franchise fee, $48,000 leasehold, $22,000
  equipment, $18,000 curriculum, $15,000 professional fees, $10,000
  marketing, $71,000 working capital — TOTAL $185,000
- Fund sources: $110,000 savings, $75,000 Muskoka property sale
- Each figure editable inline
- "Confirm — this is correct →" button

**THIS IS THE NEW THING TONIGHT'S DESIGN SESSION PRODUCED.** If this
screen looks wrong, missing, or doesn't match Chen's real numbers —
STOP, this is Session 2 incomplete, not something to push through.

---

## STEP 2 — TEST THE DISCREPANCY PUSHBACK (optional but recommended)

Before confirming cleanly, try breaking it on purpose — this tests
Session 2's Step 4:

1. Edit "$48,000" (leasehold) to something that breaks the total, e.g.
   "$480,000"
2. You should see: "That would put leasehold improvements at $480,000
   — but your total investment was $185,000. Did you mean $480,000,
   or has your total investment changed too?"
3. Click "No, I meant to enter a different number" → field should
   revert to editable
4. Correct it back to $48,000 → total should be $185,000 again,
   Confirm available

**TONE CHECK** — does this feel like a consultant double-checking, or
like an error message? This is the thing we spent real time designing
tonight — if it feels like a form rejecting bad input, that's worth
noting even if functionally correct.

---

## STEP 3 — CONFIRM AND ENTER GENERATION

Click "Confirm — this is correct →" with Chen's real numbers
(unedited, or edited-back-to-correct from Step 2).

Ask Claude Code to confirm a row was written to
`pre_generation_confirmation` for this application.

Generation begins (Steps 1-15, SSE pipeline) — this is the SAME flow
as tonight's earlier run, EXCEPT:
- Step 13 now uses Piece 3's fixed checker ("$185,000 appears" instead
  of "any dollar amount 50-150% of total")
- The data going in is now FORMALLY CONFIRMED (logged), not just
  happens-to-be-correct

---

## STEP 4 — WALK THROUGH APPROVALS (as before, but watch for the
KNOWN ISSUES from tonight)

Cover Letter generates first. THIS TIME:
- Try to click "Approve & Continue" WITHIN 5 minutes (the auto-approve
  timeout from RC1 of the original diagnosis is still there — Session
  1/2 didn't fix this, it's a separate, not-yet-addressed UX issue).
  If you click within 5 min, you should see the sidebar/header/content
  stay in sync better than before — but RC1's underlying timeout
  mechanism is UNCHANGED, just less likely to fire if you're actively
  clicking.
- Read each document. Given the data was pre-confirmed, expect Step 13
  to NOT produce refusals this time — each document should look like
  what we read tonight (real content), and STAY that way after Step
  13 runs (unlike tonight, where good content was overwritten).

If a document's content_text gets overwritten with a refusal AGAIN
despite Piece 3's fix and pre-confirmed data — STOP, this is
significant: it would mean Piece 3's fix is insufficient even for
pre-confirmed data, which would point toward needing the FULL Spec4
Stage 4 rewrite sooner than expected. Report immediately, don't push
through.

---

## STEP 5 — REACH A REAL TERMINAL STATUS

Per the original diagnosis, the goal is `job.status = 'completed'`
(not `'partial'`) and `generation_pipeline_log.applicant_acknowledged`
reaching the acknowledgment gate (Step 14).

If status comes back `'partial'` again even with good documents — ask
Claude Code to investigate RC4 (frontend's `isComplete` check only
recognizes `'completed'`, not `'partial'`) — this was flagged in the
original diagnosis as a SEPARATE small frontend fix, not yet done.
This may need a quick fix mid-session if it blocks reaching Step 14.

---

## STEP 6 — ACKNOWLEDGMENT GATE (Step 14)

5-checkbox gate, per Spec4's exact copy. Read each checkbox, check
all 5, click "I confirm and download my documents →".

---

## STEP 7 — DOWNLOAD — THE ACTUAL RESULT

Click the real download button. This hits the REAL gated route
(`/api/generate/download/[applicationId]`), not Session 1's
direct-builder-function test.

**YOU SHOULD RECEIVE A ZIP CONTAINING 7 FILES:**
- Cover_Letter.docx
- Source_of_Funds.docx
- Investment_Proof.docx
- Business_Plan.docx
- Qualifications.docx
- DS160_Reference.docx
- COMPLETE-BEFORE-SUBMITTING.docx

Open each. Confirm:
- Content matches what was read tonight (real, $185,000-consistent,
  Chen Learning Centers LLC / Cedar Park / Kumon throughout)
- Formatting per Piece 2 (Times New Roman 12pt, margins, spacing,
  headers/footers)
- Bracketed placeholders highlighted yellow (Session 1 Fix A)
- COMPLETE-BEFORE-SUBMITTING.docx lists all placeholders (Session 1
  Fix B)
- investment_proof's breakdown is a real Word table (Session 1 Fix C)
- No e2go branding, no AI markers, clean metadata

---

## IF EVERYTHING ABOVE WORKS

This is the full pipeline, working, end to end, as a customer would
experience it — including the new pre-generation confirmation
("consultant") step designed tonight. This is genuinely the milestone
BUILD_TRACKER's "Priority 3 — End-to-end payment test" has been
pointing toward.

## IF SOMETHING DOESN'T WORK

Note exactly which step, what you saw vs. expected, and whether it's:
- A KNOWN remaining issue (RC1 auto-approve timeout, RC4 'partial'
  status — both flagged above as not-yet-fixed)
- A NEW issue from Session 1 or 2's changes
- Something Piece 3's minimal fix doesn't cover (→ may need the full
  Spec4 Stage 4 rewrite, ready as spec if needed)

Either way — you'll have gotten further through this pipeline, with a
real browser, than any run tonight, and whatever's left will be a much
SMALLER, more SPECIFIC fix than tonight's investigation started with.
