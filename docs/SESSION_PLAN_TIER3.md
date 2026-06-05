# e2go.app — Session Plan: Tier 3 (Data Architecture)
## Full superpower sequence — no Magic MCP
**Updated:** June 4, 2026
**Prerequisite:** Tier 2 complete (S5–S8 all committed, build clean)
**Parallelisation rule:**
  Agent 1: S9 → then S11 in sequence (S11 depends on S9 schema)
  Agent 2: S10 independently (no dependencies, safe to run any time)
  Run git pull origin dev on both machines before starting.

---

## KNOWN SCHEMA (confirmed before writing these prompts)

applications table — current columns include:
  id, user_id, subscription_id, applicant_legal_name,
  business_name, application_type, processing_path,
  module_1_complete, module_2_complete, module_3_complete,
  confidence_score, confidence_score_at, partner_user_id,
  applicant_name_locked, business_name_locked

applications table — columns to be added in S9:
  working_target_date DATE
  confirmed_interview_date DATE

compliance_calendar table — exists (Domain 5 in schema)
  calendar_items: id, application_id, item_type, due_date,
  status, notes, created_at

analysis engine output — stored in DB after generation
  Read src/lib/analysis-engine.ts for output shape

---

## SESSION S9 — Single Source of Truth: Timeline Data
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12C and 12H
**Agent:** Agent 1 only — do not run in parallel with S11
**Prerequisite:** S8 committed and build clean

**What:**
Two date concepts must be separated in the DB and in the UI.
Working target date = planning hypothesis, set early, not a deadline anchor.
Confirmed interview date = real appointment, set late, drives all deadlines.
Dashboard, compliance calendar, and journey wizard all read from
one DB record — never from separate state.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Sections 12C and 12H carefully before touching any file.
Do not use Magic MCP this session.

Use Sequential Thinking MCP to plan the full implementation
before writing a single line of code. Think through:
  1. What DB changes are needed
  2. Which components currently store or display timeline data
  3. What the data flow is from wizard → DB → calendar → dashboard
  4. What breaks if confirmed_interview_date is null
  5. What the update propagation path is
Report the plan. Wait for confirmation before proceeding.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"compliance calendar deadline date confirmed appointment dark UI"
"date range vs specific date display calendar dark theme"
"interview scheduler date confirmation UX dark luxury"

Study how high-quality apps handle:
- Showing estimated ranges before a date is confirmed
- The visual transition from range display to specific date
- How they communicate that a deadline is anchored to a
  confirmed date vs. a planning estimate

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com (their compliance and deadline tracking UI)
https://calendly.com (their appointment confirmation UI)

Note specifically:
- How they distinguish confirmed vs. tentative dates
- How they show deadline ranges before confirmation
- The visual treatment of a confirmed anchor date

---

STEP 3 — DB MIGRATION

Add two columns to the applications table.
Use IF NOT EXISTS — never DROP, never ALTER existing columns.

Run in Supabase SQL editor:

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS working_target_date DATE;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS confirmed_interview_date DATE;

COMMENT ON COLUMN applications.working_target_date IS
  'Planning hypothesis set by user in journey wizard.
   Not used as a hard deadline anchor. Can change freely.';

COMMENT ON COLUMN applications.confirmed_interview_date IS
  'Real consulate appointment date. Set when appointment
   is scheduled. Used as anchor for all compliance deadlines.
   Typically known 4-8 weeks before interview.';

Verify the migration ran cleanly.
Check no existing data was affected.

---

STEP 4 — BUILD THE TIMELINE SERVICE

Create src/lib/timeline-service.ts

Functions:

setWorkingTargetDate(applicationId: string, date: Date): Promise<void>
  Updates applications.working_target_date
  Used by: journey wizard save, dashboard date picker

setConfirmedInterviewDate(applicationId: string, date: Date): Promise<void>
  Updates applications.confirmed_interview_date
  Triggers: recalculateCalendarDeadlines(applicationId)
  Used by: compliance calendar, dashboard

getTimelineData(applicationId: string): Promise<TimelineData>
  Returns: {
    workingTargetDate: Date | null,
    confirmedInterviewDate: Date | null,
    deadlineMode: "ranges" | "specific"
      — "specific" if confirmedInterviewDate is set
      — "ranges" if only workingTargetDate or neither
  }

recalculateCalendarDeadlines(applicationId: string): Promise<void>
  Called when confirmedInterviewDate is set or updated
  Updates all calendar_items.due_date for this application
  Calculates backward from confirmed_interview_date:
    DS-160 submission: confirmed - 14 days
    DS-156E submission: confirmed - 14 days
    Document review final: confirmed - 21 days
    Interview prep complete: confirmed - 7 days
    Package printed and organised: confirmed - 3 days

getCalendarDisplay(applicationId: string): Promise<CalendarDisplayItem[]>
  If deadlineMode = "ranges":
    Returns items with due_date = null and
    range_description = "Approximately N weeks before your interview"
  If deadlineMode = "specific":
    Returns items with specific due_date values
    and anchor_note = "Calculated from your confirmed interview
    date of [date]"

---

STEP 5 — UPDATE JOURNEY WIZARD

Find the journey wizard component.
Wire its "Save" or target date action to call:
  setWorkingTargetDate(applicationId, selectedDate)

If user is not signed in: store in localStorage only.
On sign-in / account creation: transfer localStorage date
to the DB via setWorkingTargetDate.

The wizard reads working_target_date on load:
  If set: pre-populate the date picker with stored value
  If not set: show empty date picker

---

STEP 6 — UPDATE COMPLIANCE CALENDAR

Find the compliance calendar component.

On mount: call getCalendarDisplay(applicationId)

If deadlineMode = "ranges":
  Show each item with range description:
  "DS-160 submission — approximately 2 weeks before your interview"
  Show a banner at top:
  "Your compliance deadlines will lock in once you confirm
  your interview appointment date."
  Show a gold input: "I have my interview date — enter it here"
  When user enters date: call setConfirmedInterviewDate()
  Calendar recalculates and re-renders with specific dates

If deadlineMode = "specific":
  Show each item with specific date
  Show a banner:
  "Deadlines calculated from your confirmed interview
  date of [confirmedInterviewDate formatted]."
  Show small "Update date" link if date needs correction

---

STEP 7 — UPDATE DASHBOARD

Find the dashboard component.
Replace any hardcoded or separate timeline state with:
  getTimelineData(applicationId)

Dashboard milestone tracker reads from the same DB record.
Any date update made in the compliance calendar or journey wizard
is immediately visible on the dashboard without page reload.

If working_target_date is set but confirmed_interview_date is not:
  Show working target date with label "Target move date (planning)"
  Show note: "Confirm your interview date to lock in deadlines"

If confirmed_interview_date is set:
  Show confirmed date prominently
  Show "Interview confirmed" badge in gold

---

STEP 8 — PLAYWRIGHT VERIFICATION

Test 1 — Journey wizard saves working target date:
  Set a target date in the journey wizard
  Navigate to dashboard
  Screenshot — confirm working target date appears on dashboard

Test 2 — Compliance calendar in range mode:
  Ensure confirmed_interview_date is null for test application
  Navigate to compliance calendar
  Screenshot — confirm all items show range descriptions
  Confirm banner and date input appear

Test 3 — Enter confirmed interview date:
  Enter a confirmed interview date in the calendar input
  Screenshot — confirm items recalculate to specific dates
  Confirm anchor date banner appears

Test 4 — Dashboard reflects confirmed date:
  After Test 3, navigate to dashboard
  Screenshot — confirm "Interview confirmed" badge visible
  Confirm date matches what was entered in calendar

Test 5 — Update confirmed date:
  Change the confirmed interview date
  Screenshot — confirm all calendar items recalculate
  Confirm dashboard updates

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: timeline single source of truth — working target vs confirmed interview date"
git push origin dev
```

---

## SESSION S10 — Tab B / Tab L Shared Document Overlap Fix
**Priority:** 🟡 HIGH
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12E
**Agent:** Agent 2 — safe to run independently, any time after S8
**No dependencies on S9 or S11**

**What:**
Marriage certificate, spouse passport, children's documents appear
on both Tab B (personal documents checklist) and Tab L (dependent
documents checklist). Users would be told to gather the same
document twice with no explanation.
Flag shared documents once. Explain one copy covers both tabs.

---

**PASTE THIS INTO CLAUDE CODE (AGENT 2):**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 12E carefully before touching any file.
Read src/components/PreAppChecklist.tsx — reuse its visual patterns.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"document checklist cross-reference note dark UI"
"shared item multiple sections tooltip dark theme"
"checklist item info badge collapsible note"

Study how high-quality apps handle:
- Items that belong to multiple sections or categories
- Inline notes or tooltips that explain relationships
- The visual treatment of a shared/reused item

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.turbotax.com (their document checklist UI)

Note how TurboTax handles:
- Documents that serve multiple sections of the return
- Cross-reference notes between related items
- Collapsed vs. expanded information affordances

---

STEP 3 — AUDIT TAB B AND TAB L CURRENT STATE

Read the current Tab B and Tab L implementations:
  Find Tab B checklist generation logic
  Find Tab L dependent document generation logic

List every document that appears in both:
  Expected shared documents:
  - Marriage certificate
  - Spouse passport biographical page
  - Spouse birth certificate
  - Each child's passport biographical page
  - Each child's birth certificate

Confirm whether these are currently generated independently
in both tabs with no cross-reference.
Report findings before writing any code.

---

STEP 4 — BUILD THE CROSS-TAB NOTE COMPONENT

Create src/components/CrossTabNote.tsx

A small collapsible info component that attaches to a checklist item.

Props: {
  coversTabs: string[]  // e.g. ["Tab B", "Tab L"]
  note: string          // the explanation text
}

Visual:
  Trigger: small gold info icon (ⓘ) inline after the document name
  On click: expands a note below the item (no modal, inline only)
  Expanded state:
    background: rgba(201,168,76,0.04)
    border-left: 1.5px solid rgba(201,168,76,0.3)
    padding: 8px 12px
    font-size: 11px
    color: rgba(245,240,232,0.6)
    text: the note prop value
    Small "×" to collapse
  No rounded corners
  Smooth height transition (CSS only — no animation library)

Default note text for shared documents:
  "This document is required for both [Tab X] and [Tab Y].
  One certified copy is sufficient — do not obtain two
  separate copies."

---

STEP 5 — IDENTIFY SHARED DOCUMENTS IN CHECKLIST GENERATOR

Open src/lib/checklist-generator.ts (built in S4)

Add a sharedTabs property to ChecklistItem type:
  sharedTabs?: string[]  // tabs this document covers

Update the items that are shared:

Marriage certificate:
  sharedTabs: ["Tab B", "Tab L"]
  crossTabNote: "One certified copy covers both your personal
  binder (Tab B) and your dependent section (Tab L)."

Spouse passport biographical page:
  sharedTabs: ["Tab B", "Tab L"]
  crossTabNote: "One copy covers both Tab B and Tab L."

Spouse birth certificate:
  sharedTabs: ["Tab B", "Tab L"]
  crossTabNote: "One certified copy covers both Tab B and Tab L."

Child passport biographical page (per child):
  sharedTabs: ["Tab B", "Tab L"]
  crossTabNote: "One copy per child covers both Tab B and Tab L."

Child birth certificate (per child):
  sharedTabs: ["Tab B", "Tab L"]
  crossTabNote: "One certified copy per child covers both
  Tab B and Tab L."

---

STEP 6 — WIRE CROSS-TAB NOTE INTO CHECKLIST DISPLAY

Open src/components/PreAppChecklist.tsx (built in S4)

For each ChecklistItem that has sharedTabs set:
  Render CrossTabNote component inline after the document name
  Pass coversTabs and crossTabNote as props

The note is collapsed by default.
User clicks the info icon to expand.
No change to the checklist item's check/uncheck behaviour.

Also apply to Tab B and Tab L generated checklists
if they have their own rendering components:
  Find their rendering logic
  Apply the same CrossTabNote pattern to shared documents

---

STEP 7 — PLAYWRIGHT VERIFICATION

Test 1 — Pre-application checklist with married + spouse profile:
  Set localStorage with married + spouse applying profile
  Navigate to localhost:3000/apply/checklist
  Screenshot — confirm marriage certificate shows info icon
  Click the info icon
  Screenshot — confirm cross-tab note expands with correct text
  Click × to collapse
  Screenshot — confirm note collapses cleanly

Test 2 — Tab B checklist (if rendered separately):
  Navigate to Module 3 Tab B
  Screenshot — confirm marriage certificate shows info icon
  Click to expand — confirm note text correct

Test 3 — Tab L checklist (if rendered separately):
  Navigate to Module 3 Tab L
  Screenshot — confirm same documents show info icon
  Confirm note text says "Tab B and Tab L"

Test 4 — Single applicant, no dependents:
  Set localStorage with no spouse, no children
  Navigate to checklist
  Screenshot — confirm no cross-tab notes appear
  (no shared documents if no dependents)

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"fix: Tab B / Tab L shared documents — cross-tab note, one copy covers both"
git push origin dev
```

---

## SESSION S11 — Analysis Engine + Confidence Score Integration
**Priority:** 🟡 HIGH
**Estimated time:** 4–5 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12D
**Agent:** Agent 1 only — must run after S9 is committed
**Prerequisite:** S9 complete, analysis engine built (Session 16 complete)

**What:**
The confidence score page currently calculates independently from
the analysis engine. They run the same calculations twice from
the same data. This session makes confidence score read directly
from analysis engine output. One calculation. Two views.
New data triggers a re-run. Contradictions are flagged to the user.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 12D carefully before touching any file.
Read docs/Spec1_Analysis_Engine.md — understand the full output shape.
Read src/lib/analysis-engine.ts — understand what it calculates
and where it stores its output.
Do not use Magic MCP this session.

Use Sequential Thinking MCP to plan the full implementation
before writing a single line of code. Think through:
  1. What does the analysis engine currently output and where does it store it?
  2. What does the confidence score page currently calculate independently?
  3. Which calculations overlap exactly?
  4. What is the trigger mechanism for re-runs?
  5. What constitutes a contradiction requiring user notification?
  6. What is the UI impact of showing "Last assessed: [timestamp]"?
Report the full plan. Wait for confirmation before proceeding.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"case strength score dashboard dark luxury UI"
"assessment score dimensions breakdown dark theme"
"score updated notification timestamp dark UI"
"significant change alert score dashboard"

Study how high-quality apps handle:
- Multi-dimension score displays
- Score update notifications
- Significant change alerts
- Timestamp display for last calculated value

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.creditkarma.com (their credit score breakdown UI)
https://www.deel.com (their compliance score or readiness indicators)

Note specifically:
- How they show dimension-level breakdowns of a composite score
- How they communicate score changes
- The visual treatment of a "last updated" timestamp
- How they handle scores that have changed since last view

---

STEP 3 — AUDIT CURRENT STATE

Before changing anything:

Read src/lib/analysis-engine.ts
  List every dimension it calculates
  List where it stores output (which DB table, which columns)
  List what the output object shape is

Find the confidence score page
  List every dimension it currently displays
  List where it currently gets its data from
  Identify any calculations it runs independently

Map overlaps:
  Create a table showing:
  Analysis engine dimension → Confidence score display dimension
  Note where they are the same calculation
  Note where confidence score has something analysis engine does not

Report this audit before writing any code.

---

STEP 4 — ESTABLISH THE DIMENSION MAPPING

Based on the audit, implement this mapping.
Confidence score reads these values directly from analysis
engine output — it does not recalculate them:

  substantiality_score → "Investment Substantiality" display
  marginality_score → "Non-Marginality" display
  funds_score → "Source & Path of Funds" display
  develop_direct_score → "Active Direction" display
  executive_role_score → modifier on "Active Direction" display
  qualifications_score → "Investor Qualifications" display
  real_operating_score → "Real & Operating Enterprise" display
  immigrant_intent_risk → risk modifier displayed separately

If any confidence score dimension has no matching analysis
engine field: flag it. Do not remove it — add the calculation
to the analysis engine instead so it runs once there.

---

STEP 5 — BUILD THE SCORE SYNC SERVICE

Create src/lib/score-sync.ts

Functions:

getConfidenceScoreData(applicationId: string): Promise<ScoreData>
  Reads analysis engine output from DB for this application
  Maps dimensions using the mapping from Step 4
  Returns: {
    dimensions: DimensionScore[],
    overallScore: number,
    lastAssessedAt: Date | null,
    hasUnreviewedChanges: boolean
  }

triggerAnalysisReRun(applicationId: string): Promise<void>
  Called when any Module 3 tab answer is saved
  Queues an analysis engine re-run (async — do not block save)
  On completion: updates stored analysis output
  On completion: calls checkForSignificantChanges()

checkForSignificantChanges(
  applicationId: string,
  previousOutput: AnalysisOutput,
  newOutput: AnalysisOutput
): Promise<SignificantChange[]>
  Compares each dimension score
  If any dimension delta > 15 points in either direction:
    Returns that dimension as a SignificantChange
  Stores significant changes in DB for display

---

STEP 6 — UPDATE CONFIDENCE SCORE PAGE

Find the confidence score page component.

Replace all independent calculations with:
  getConfidenceScoreData(applicationId)

Add "Last assessed" display:
  Small muted text below the overall score:
  "Last assessed: [lastAssessedAt formatted as
  'June 4, 2026 at 3:42 PM']"
  If lastAssessedAt is null: "Not yet assessed"

Add significant change notification:
  If hasUnreviewedChanges is true:
    Show a banner above the score:
    background: rgba(201,168,76,0.06)
    border-left: 2px solid #C9A84C
    Text: "Your assessment has been updated based on
    recent changes to your application.
    [N] dimension(s) changed significantly."
    Expandable: show which dimensions changed and by how much
    "Mark as reviewed" button — dismisses banner, clears flag

Add disclaimer below the score:
  "This reflects the completeness of your preparation —
  not a legal determination of your eligibility."
  Font size 11px, muted, DM Sans 300

---

STEP 7 — WIRE RE-RUN TRIGGER TO MODULE 3 SAVES

Find where Module 3 tab answers are saved to the DB.
After each successful save, call:
  triggerAnalysisReRun(applicationId)

This must be:
  - Async — do not block the save response
  - Silent to the user unless a significant change is detected
  - Retried on failure (simple retry, max 2 attempts)

Add a small pulsing indicator on the confidence score
page nav item when a re-run is in progress:
  Gold dot, subtle pulse animation
  Disappears when re-run completes

---

STEP 8 — PLAYWRIGHT VERIFICATION

Test 1 — Confidence score reads from analysis engine:
  Ensure analysis engine has run for test application
  Navigate to confidence score page
  Screenshot — confirm dimensions display with correct values
  Confirm "Last assessed" timestamp visible

Test 2 — Significant change notification:
  Manually trigger a large score change (update answers that
  affect a dimension score by >15 points)
  Navigate to confidence score page
  Screenshot — confirm banner appears with change description
  Click "Mark as reviewed"
  Screenshot — confirm banner dismisses

Test 3 — Re-run trigger on tab save:
  Save an answer in any Module 3 tab
  Navigate to confidence score page
  Screenshot — confirm pulsing indicator appears briefly
  Wait for re-run to complete
  Screenshot — confirm "Last assessed" timestamp updated

Test 4 — Disclaimer visible:
  Screenshot confidence score page
  Confirm disclaimer text present below score

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: confidence score reads analysis engine — one assessment two views"
git push origin dev
```

---

## TIER 3 COMPLETION CHECK

Before moving to Tier 4, confirm all three are done:

| Session | Agent | What | Commit | Build clean |
|---|---|---|---|---|
| S9 | Agent 1 | Timeline — working target vs confirmed date | ⬜ | ⬜ |
| S10 | Agent 2 | Tab B / Tab L cross-tab note | ⬜ | ⬜ |
| S11 | Agent 1 | Confidence score reads analysis engine | ⬜ | ⬜ |

After all three committed:
Both agents run: git pull origin dev
Both agents run: npm run build
Confirm clean before starting Tier 4.

---

*File: ~/E2-go/docs/SESSION_PLAN_TIER3.md*
