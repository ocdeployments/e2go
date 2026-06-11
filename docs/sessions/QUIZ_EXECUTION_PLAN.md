# E2go — Quiz Improvement Execution Plan
**Created:** June 10, 2026
**Companion document:** docs/QUIZ_IMPROVEMENT_MASTER.md
**Purpose:** Exact sequence of sessions to close the gap from 5.5 to 9.0.
  Every session in this plan has a clear scope, clear inputs, clear outputs,
  and a clear verification test. No session starts until the previous one
  is committed and build-clean.

---

## THE RULE

Before every session: agent reads docs/QUIZ_IMPROVEMENT_MASTER.md first.
Not CLAUDE_CONTEXT.md first. Not BUILD_TRACKER.md first.
QUIZ_IMPROVEMENT_MASTER.md first.

This is the document that prevents re-analysis. It has already answered
every question about what needs to change and why. The agent reads it,
executes the scope for that session, and nothing else.

---

## WHAT IS ALREADY IN FLIGHT

SESSION_AUTH_QUIZ_RESULTS_FIXES.md is written and ready to run.
It covers: magic link removal, remember me, first/last name at signup,
email verification enforcement, post-login routing, Q0-09 history
reframe, Q0-10 ties reduction (partial), Q0-05 COS wording, Q0-08
franchise sub-question (partial), score/flags contradiction fix,
email button fix, stale localStorage fix.

This session MUST run before anything else. It closes the most urgent
issues and establishes the auth + scoring foundation everything else
builds on.

Do not start Session 1 below until this session is committed and clean.

---

## SESSION 1 — Fix What Is Broken Now
**File:** docs/sessions/SESSION_AUTH_QUIZ_RESULTS_FIXES.md (already written)
**Scope:** Auth fixes, scoring contradiction, wrong questions, results page
**Time:** 4–5 hours
**Prerequisite:** None — run this first

What it closes from QUIZ_IMPROVEMENT_MASTER.md Section 1:
- Score/flags contradiction (item 1)
- Q0-06 wrong question (item 2)
- Q0-NI partial fix (item 3)
- Auth: magic link, name at signup (item 4)
- Results page email button, stale draft (items 5, 6)
- Post-login routing (item 8)

What it does NOT close (out of scope for this session):
- New questions (business type, cost, readiness, target date)
- Question sequence reorder
- Hard stop educational content
- Section context sentences

**Start command for agent:**
```
Start session. Read docs/QUIZ_IMPROVEMENT_MASTER.md fully.
Then read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Read docs/sessions/SESSION_AUTH_QUIZ_RESULTS_FIXES.md and execute
exactly as written.
Do not add scope. Do not change questions not listed in that file.
Ask "Ready to confirm and begin?" before starting.
```

**Verification before marking complete:**
- [ ] npm run build clean
- [ ] Login page: no magic link, has first/last name fields
- [ ] Quiz: Q0-06 shows fund source type options
- [ ] Quiz: Q0-NI is one multiselect question
- [ ] Results: score 90+ has no complexity warning
- [ ] Results: attorney flags reduce the score
- [ ] Email results button shows loading/success/error states
- [ ] Post-login routes correctly by application state

---

## SESSION 2 — Add the Four Missing Questions
**File:** Write as docs/sessions/SESSION_QUIZ_NEW_QUESTIONS.md
**Scope:** Add Q0-readiness, Q0-target-date, Q0-business-type,
  Q0-business-cost. Wire each to downstream destinations.
**Time:** 3–4 hours
**Prerequisite:** Session 1 committed and clean

Why these four first:
The sequence reorder (Session 3) cannot happen until all questions exist.
The downstream wiring cannot be done without knowing what data is being
collected. The results page personalisation depends on target date.
The proportionality score depends on business cost. These questions
unlock everything else.

**What the agent builds:**

Step 1: Read docs/QUIZ_IMPROVEMENT_MASTER.md Section 4 fully.
  Every question, option, scoring rule, and downstream mapping is
  specified there. Do not invent anything — execute the spec.

Step 2: Add to public/data/module0_questions.json:
  Q0-readiness (after Q0-01, before Q0-target-date)
  Q0-target-date (after Q0-readiness)
  Q0-business-type (after Q0-10, before Q0-08)
  Q0-business-cost (after Q0-05)
  Q0-08c (sub-question: fires when franchise selected in Q0-business-type)
  Q0-08d (sub-question: fires when Q0-08c = "haven't reached out")

Step 3: Add to public/data/module0_scoring_logic.json:
  Proportionality scoring using Q0-05 / Q0-business-cost
  Readiness stage routing flags (not scoring — just stored)
  Target date urgency advisory if within 6 months

Step 4: Wire downstream:
  Q0-target-date → working_target_date on applications table
    (requires column: ALTER TABLE applications ADD COLUMN IF NOT EXISTS
    working_target_date date)
  Q0-readiness → quiz_sessions table (requires column:
    ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS readiness_stage text)
  Q0-business-type → quiz_sessions table (requires column:
    ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS business_type text)
  Results page: use Q0-target-date to show personalised timeline:
    "To be in the US by [month year], submit by [month year]."

Step 5: Franchise referral notification:
  Create src/app/api/notifications/franchise-referral/route.ts
  Sends admin email via Resend when franchise_referral_requested = true
  Admin email: process.env.ADMIN_EMAIL

Step 6: npm run build — must be clean.

Step 7: Verify in browser:
  - Quiz shows Q0-readiness as second question
  - Quiz shows Q0-target-date as third question
  - Quiz shows Q0-business-type after disqualifier screen
  - Quiz shows Q0-business-cost after investment amount
  - If franchise selected: Q0-08c appears
  - Results page shows personalised timeline when target date answered

**Start command for agent:**
```
Start session. Read docs/QUIZ_IMPROVEMENT_MASTER.md fully — especially
Sections 4 and 6. Every question spec and downstream mapping is in
Section 4. Execute Section 4 exactly.
Then read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Do not change any existing questions. Add only the four new questions
and their sub-questions as specified.
Ask "Ready to confirm and begin?" before starting.
```

---

## SESSION 3 — Fix Structural Question Issues
**File:** Write as docs/sessions/SESSION_QUIZ_STRUCTURAL_FIXES.md
**Scope:** Fix existing questions per QUIZ_IMPROVEMENT_MASTER.md Section 3
**Time:** 2–3 hours
**Prerequisite:** Session 2 committed and clean

What this session fixes (from Section 3 of master document):
- Q0-01: add dual citizenship sub-question
- Q0-03: split into Q0-03a (routing) + Q0-03b (COS status)
- Q0-08: remove "equal" from option 2, upgrade "not sure" advisory
- Q0-09: add ownership % sub-question for "not 50/50" path
- Q0-14/Q0-15: update show_if to include "not 50/50"
- Q0-17: add common-law relationship option
- Q0-21: add show_if — only show when not authenticated
- Q0-02: remove from quiz flow entirely

**Important constraint:** Do not touch question IDs or scoring codes
that Session 1 already changed. Read the committed JSON before editing.

**Start command for agent:**
```
Start session. Read docs/QUIZ_IMPROVEMENT_MASTER.md Section 3 fully.
That section specifies exactly what changes for each question.
Then read public/data/module0_questions.json in full before touching
anything — understand the current state after Sessions 1 and 2.
Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Ask "Ready to confirm and begin?" before starting.
```

---

## SESSION 4 — Reorder Sequence and Add Context
**File:** Write as docs/sessions/SESSION_QUIZ_SEQUENCE_CONTEXT.md
**Scope:** Reorder questions to trust-first arc, add section headings,
  add hard stop educational content
**Time:** 3–4 hours
**Prerequisite:** Session 3 committed and clean

Why this session is last among quiz sessions:
You cannot reorder questions whose structure is still changing.
Sessions 1–3 change what the questions ARE.
Session 4 changes the ORDER and adds the surrounding context.
If done earlier, Sessions 1–3 changes will break the sequence.

What this session does:

Step 1: Reorder questions in module0_questions.json to the Phase 1–8
  sequence specified in QUIZ_IMPROVEMENT_MASTER.md Section 5.
  The quiz page (src/app/quiz/page.tsx) reads from the JSON — the
  reorder in the JSON propagates to the UI automatically.
  Verify conditional (show_if) logic still fires correctly after reorder.

Step 2: Add section heading data to the JSON.
  Add a "section_heading" field to the first question in each phase:
  Phase 1: "Let's understand where you are."
  Phase 2: "The E-2 requires real capital committed to a real business.
    These questions establish that."
  Phase 3: "Your business and your role in it."
  Phase 4: "Where you apply affects the entire process."
  Phase 5: "If family members will apply with you."
  Phase 6: "We are required to ask about immigration history.
    Most people have nothing to disclose."
  Phase 7: "Non-immigrant intent — the officer's final concern."
  The quiz UI renders the section_heading above the first question
  in each phase. Add rendering logic to quiz/page.tsx.

Step 3: Add hard stop educational content.
  QUIZ_IMPROVEMENT_MASTER.md Section 4 has the exact text for all
  9 hard stops (PR-01 through PR-09):
  - Why it is a legal problem
  - Whether it is fixable
  - What an attorney would do
  Add these as "educational_content" field on each hard stop in
  module0_questions.json hard_stops section.
  The hard stop UI renders this content above the attorney referral CTA.

Step 4: Strengthen acknowledgment gate.
  In src/app/quiz/page.tsx, update the acknowledgment gate to:
  - List each specific flag being acknowledged by code + plain text
  - Show a text input that requires "I understand" typed before
    the Continue button activates
  - Save acknowledgment timestamp to quiz_sessions table

Step 5: Add save-and-return visible indicator.
  In quiz/page.tsx: add a persistent small note below the question:
  "Your progress is saved automatically."
  On page load: if localStorage draft exists and is < 7 days old,
  show a resume prompt before rendering question 1.

Step 6: npm run build — must be clean.

Step 7: Walk through the quiz manually:
  - Confirm Phase 1 questions appear first
  - Confirm section headings appear at phase transitions
  - Confirm history questions appear in Phase 6
  - Confirm hard stop shows educational content when triggered
  - Confirm acknowledgment gate requires typed confirmation

**Start command for agent:**
```
Start session. Read docs/QUIZ_IMPROVEMENT_MASTER.md Sections 4 and 5
fully before touching any file. Section 5 has the exact question
sequence. Section 4 has the exact hard stop content.
Read public/data/module0_questions.json fully — understand current
state after Sessions 1, 2, and 3.
Read src/app/quiz/page.tsx fully before editing.
Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Ask "Ready to confirm and begin?" before starting.
```

---

## SESSION 5 — Module 3 Gap Verification
**File:** Write as docs/sessions/SESSION_MODULE3_GAP_VERIFICATION.md
**Scope:** Verify Module 3 case file sections are collecting the right
  data per QUIZ_IMPROVEMENT_MASTER.md Section 8
**Time:** 2–3 hours
**Prerequisite:** Session 4 committed and clean

This session does not touch the quiz. It verifies and if necessary
builds the Module 3 questions that correspond to denial categories
D-01 through D-15.

For each gap in Section 8 of the master document:
1. Read the relevant section page (Your Investment, Your Business, Your Ties)
2. Check whether the specified question exists and is wired
3. If missing: build it per the spec in the master document
4. If present but incomplete: extend it per the spec
5. Verify the answer saves to the answers table
6. Verify the answer appears in the generated document

Specific verifications:
- Your Investment: "Has capital been spent on actual business expenses?"
- Your Investment: Paper trail gap checklist (cash, crypto, informal)
- Your Business: Hiring plan is a structured repeating group
- Your Business: Projection table has assumption source per year
- Your Ties: Structured tie categories match Q0-NI consolidated options

**Start command for agent:**
```
Start session. Read docs/QUIZ_IMPROVEMENT_MASTER.md Section 8 fully.
That section specifies exactly what to verify and what to build if missing.
Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Read each of the six case file section pages before writing any code.
Report what you find for each gap before building anything.
Ask "Ready to confirm and begin?" before starting.
```

---

## SESSION 6 — End-to-End Verification
**File:** No new session file — use docs/TEST_FIXTURES.md
**Scope:** Walk all five test fixture profiles through the full flow
**Time:** 2 hours
**Prerequisite:** Session 5 committed and clean

This session builds nothing. It verifies that everything built in
Sessions 1–5 works together as a system.

Using the five profiles in docs/TEST_FIXTURES.md:
1. Inject each profile into localStorage
2. Walk quiz → results → pricing → apply → generate → download
3. For each step, verify:
   - Quiz answers correctly saved to Supabase
   - Results page shows correct score, verdict, and CTA
   - Pre-fill badges appear in the case file sections
   - Generated documents contain the right information
   - No data from one profile appears in another profile

Fix any issues found. They will be small surgical fixes — not rebuilds.
If major issues are found, flag them and add to QUIZ_IMPROVEMENT_MASTER.md.

---

## PROGRESS TRACKING

| Session | Scope | Status | Score After |
|---|---|---|---|
| SESSION_AUTH_QUIZ_RESULTS_FIXES | Auth, scoring, broken questions, results | ✅ Complete — commit 400d1dc | 7.0 |
| Session 2: New Questions | 4 missing questions + franchise sub | ✅ Complete — June 11, 2026 | 7.8 est. |
| Session 3: Structural Fixes | Fix existing question problems | ⬜ Not started | 8.3 est. |
| Session 4: Sequence + Context | Reorder, headings, hard stop content | ⬜ Not started | 8.9 est. |
| Session 5: Module 3 Gaps | Verify/build denial-prevention questions | ⬜ Not started | 9.0 est. |
| Session 6: End-to-End Verification | Five fixture profiles, full flow | ⬜ Not started | 9.0 confirmed |

---

## HOW TO USE THIS PLAN

When starting any session from this plan:
1. Read docs/QUIZ_IMPROVEMENT_MASTER.md — the full analysis is there
2. Paste the start command for that session into Claude Code
3. The agent reads the master document, executes the scope, nothing else
4. When done: update the Progress Tracking table above
5. Update QUIZ_IMPROVEMENT_MASTER.md Section 1 to mark closed items

When a session is complete, update this file:
- Mark the session ✅ in the progress table
- Record the actual commit hash
- Note any items that were not completed and why

---

## WHAT NOT TO DO

Do not run sessions out of order.
Do not add scope to a session mid-run.
Do not start a new session while the previous one is uncommitted.
Do not rewrite questions that are already correct (see Section 3 of master doc — "keep as-is" list).
Do not let the agent discover analysis that is already in the master document — make it read the master document first.

---

*File location: ~/E2-go/docs/QUIZ_EXECUTION_PLAN.md*
*Update progress table after every session.*
*Last updated: June 11, 2026*
