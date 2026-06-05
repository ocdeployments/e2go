# e2go.app — Session Plan: Tier 2 (High Priority)
## Question deduplication — full superpower sequence, no Magic MCP
**Updated:** June 4, 2026
**Prerequisite:** Tier 1 complete (S1–S4 all committed, build clean)
**Run in order. Each must be committed and build-clean before the next starts.**

---

## KNOWN SCHEMA (confirmed before writing these prompts)

Quiz session data:
  Table: quiz_sessions
  Columns: id, user_id, email, outcome, hard_stop_codes,
           attorney_flag_codes, risk_flag_codes, application_type

  localStorage key: "e2go_quiz_result"
  Shape: {
    outcome: string,
    hard_stop_codes: string[],
    attorney_flag_codes: string[],
    risk_flag_codes: string[],
    answers: Record<string, string | string[]>
      — question IDs map to responses
      — e.g. answers["Q0-01"], answers["Q0-09"], answers["Q0-16"]
  }

Individual answers:
  Table: answers
  Columns: id, application_id, question_id, answer_value, created_at

Tab file paths:
  Tab A: src/app/apply/module3/a/page.tsx
  Tab F: src/app/apply/module3/f/page.tsx
  Tab J: src/app/apply/module3/j/page.tsx
  Tab L: src/app/apply/module3/l/page.tsx

---

## SESSION S5 — Module 3 Pre-Fill Pass: Quiz → Tabs
**Priority:** 🟡 HIGH
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11

**What:**
Fields already collected in the quiz must be pre-filled in Module 3 tabs.
Never ask again what is already known.
Show a subtle indicator where a field is pre-filled. Allow editing.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 11 (complete pre-fill mapping table).
Read src/components/PreAppChecklist.tsx — use its pre-fill badge
pattern as the visual reference for this session.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"pre-filled form field edit affordance dark UI"
"form field populated from previous step indicator"
"read-only editable toggle form field dark theme"

Study how high-quality apps show a field that is pre-populated
from earlier data — the badge, the edit affordance, the visual
distinction from a blank field the user must fill themselves.

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com (their onboarding multi-step form)
https://stripe.com/atlas (their business formation form)

Note specifically:
- How they show fields already known from prior steps
- The visual treatment of confirmed vs. editable fields
- How they handle the transition from read-only to editing

---

STEP 3 — BUILD THE PRE-FILL UTILITY

Create src/lib/prefill.ts

This utility reads quiz session data and returns pre-fill values
for any Module 3 field that can be populated from quiz answers.

function getQuizAnswers(): Record<string, string | string[]> | null {
  // Try Supabase quiz_sessions first (if user signed in)
  // Fall back to localStorage "e2go_quiz_result".answers
  // Return null if neither available
}

function getPreFill(questionId: string): {
  value: string | string[] | null,
  source: "quiz" | "auth" | null,
  note: string | null
} 

Implement these mappings:

Q0-01 → QA-05 (country of citizenship)
  value: answers["Q0-01"]
  note: "From your eligibility check"

Q0-01 → QA-06 (dual citizenship)
  If Q0-01 is single country: value = "No"
  note: "From your eligibility check"

Q0-05 → QF-02 (investment amount)
  value: answers["Q0-05"]
  note: "From your eligibility check — confirm or update
  if this has changed"

Q0-07 → QF-05 (loan flag)
  If answers["Q0-07"] indicates loan: pre-select loan option
  note: "A loan was indicated in your eligibility check"

Q0-11 → QA-23 (prior visa refusals)
  value: answers["Q0-11"]
  note: "From your eligibility check"
  If value = yes: expand detail fields immediately on render

Q0-16 → Tab L visibility
  If answers["Q0-16"] indicates no dependents:
    return { value: "none", note: "No dependents indicated
    in your eligibility check" }

account email → QA-08
  value: supabase.auth.user().email
  source: "auth"
  note: "From your account"

---

STEP 4 — BUILD THE PRE-FILLED FIELD INDICATOR COMPONENT

Create src/components/PreFilledField.tsx

Reuse the visual pattern from PreAppChecklist.tsx.
This is a wrapper component that takes:
  props: {
    questionId: string
    label: string
    children: ReactNode  // the actual form field
    prefillValue: string | string[] | null
    prefillNote: string | null
    onEdit?: () => void
  }

States:
  Pre-filled (read-only):
    Show field value in muted text
    Small gold badge top-right: "Pre-filled"
    Source note below in 11px rgba(245,240,232,0.4)
    "Edit" link in #C9A84C — clicking unlocks the field

  Editing:
    Field becomes fully editable
    Badge changes to "Editing" in amber rgba(201,168,76,0.7)
    "Revert" link appears — clicking restores pre-fill value

  Overridden (user has changed the value):
    Field remains editable
    Badge: "Modified" in amber
    No revert link — change is intentional

  Empty (no pre-fill available):
    Render children normally — no badge, no note
    Standard Module 3 field behaviour unchanged

Styling:
  background: transparent
  border: 0.5px solid rgba(201,168,76,0.15) on pre-filled state
  No rounded corners
  Badge: font-size 10px, letter-spacing 0.08em, uppercase
  Note: font-size 11px, DM Sans 300, muted gold

---

STEP 5 — WIRE PRE-FILLS INTO TAB A

Open src/app/apply/module3/a/page.tsx

Find these fields and wrap them with PreFilledField:

QA-05 (country of citizenship):
  prefillValue: getPreFill("Q0-01").value
  prefillNote: "From your eligibility check"

QA-06 (dual citizenship):
  prefillValue: getPreFill("Q0-01 dual").value
  prefillNote: "From your eligibility check"

QA-08 (email address):
  prefillValue: getPreFill("email").value
  prefillNote: "From your account"
  This field should always be pre-filled — never blank.

QA-23 (prior visa refusals):
  prefillValue: getPreFill("Q0-11").value
  prefillNote: "From your eligibility check"
  If pre-filled as "yes": expand detail sub-fields on render.

QA-39 (criminal history):
  prefillValue: getPreFill("Q0-13").value
  prefillNote: "Confirmed from your eligibility check"
  This is a legal document field.
  Add a confirmation checkbox below:
  "I confirm this answer is accurate and complete."
  Required before Tab A can be submitted.

QA-46, QA-47, QA-48 (entry/removal/deportation):
  Map from Q0-12 sub-answers as available.
  prefillNote: "From your eligibility check"
  Add confirmation checkbox (same as QA-39 — legal fields).

---

STEP 6 — WIRE PRE-FILLS INTO TAB F

Open src/app/apply/module3/f/page.tsx

QF-02 (total investment amount):
  prefillValue: getPreFill("Q0-05").value
  prefillNote: "From your eligibility check — confirm or
  update if this has changed since you took the quiz"
  Always editable — quiz amount was approximate.
  Show: "From your eligibility check: [value]"

QF-05 (fund source multiselect):
  If getPreFill("Q0-07").value indicates loan:
    Pre-select the loan option in the multiselect.
    prefillNote: "A loan was indicated in your eligibility check"

---

STEP 7 — WIRE PRE-FILLS INTO TAB L

Open src/app/apply/module3/l/page.tsx

Read getPreFill("Q0-16").value (family composition).

If value = no dependents:
  Show the tab as complete with a note:
  "No dependents were indicated in your eligibility check.
  If this has changed, you can add dependents below."
  All dependent fields collapsed by default.
  An "Add dependent" button allows override.

If value = spouse only:
  Show spouse fields only.
  Hide all children fields.
  Show note: "One dependent (spouse) was indicated
  in your eligibility check."

If value = spouse + children:
  Show spouse fields.
  Show children fields with count matching quiz answer.
  Pre-render the correct number of child entry blocks.

---

STEP 8 — PLAYWRIGHT VERIFICATION

Use Playwright to verify each tab:

Test 1 — Tab A with quiz data in localStorage:
  Set localStorage with answers including:
    Q0-01: "Canada", Q0-11: "no", Q0-13: "no"
  Navigate to localhost:3000/apply/module3/a
  Screenshot — confirm QA-05, QA-08, QA-23 show pre-filled badges
  Click "Edit" on QA-05 — screenshot editing state
  Confirm QA-08 (email) is always pre-filled, never blank

Test 2 — Tab F with quiz data:
  Set localStorage with Q0-05: "$150,000", Q0-07: "no loan"
  Navigate to localhost:3000/apply/module3/f
  Screenshot — confirm QF-02 shows pre-filled value with note

Test 3 — Tab L, no dependents:
  Set localStorage with Q0-16: "none"
  Navigate to localhost:3000/apply/module3/l
  Screenshot — confirm collapsed state with note

Test 4 — Tab L, spouse + 2 children:
  Set localStorage with Q0-16: "spouse_and_children", child_count: 2
  Navigate to localhost:3000/apply/module3/l
  Screenshot — confirm spouse fields + 2 child blocks shown

Test 5 — No quiz data:
  Clear localStorage
  Navigate to each tab
  Screenshot — confirm all fields render normally, no badges,
  no broken states

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: Module 3 pre-fill pass — quiz answers pre-populate Tab A, F, L fields"
git push origin dev
```

---

## SESSION S6 — Work History & Education: Tab J as Single Source
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 9 and 10

**What:**
Work history is collected in full in Tab A (for DS-160), Tab J
(for qualifications narrative), and Group 3F (for case building).
Education is collected in Tab A and Tab J.
Tab J is the master. Tab A and Group 3F read from it.
Never collect the same history three times.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 11, duplications 9 and 10.
Read src/components/PreFilledField.tsx (built in S5 — reuse this).
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"multi-step form data reuse previous step dark UI"
"form field populated from earlier section indicator"
"work history form repeating group dark theme"

Study how high-quality apps handle:
- Data entered in step N appearing pre-filled in step M
- Repeating group fields (add another employer, add another degree)
- The visual distinction between master-collected vs. derived fields

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.linkedin.com/in/ (work history and education entry UI)

Note how LinkedIn handles:
- Repeating work history entries (employer, title, dates, description)
- Repeating education entries
- The form structure for each entry type

---

STEP 3 — CONFIRM CURRENT STATE

Before changing anything, read:
  src/app/apply/module3/j/page.tsx  — Tab J (master)
  src/app/apply/module3/a/page.tsx  — Tab A (DS-160)

List:
  - Which fields in Tab A collect work history
    (current occupation, job title, start date, duties,
    previous employers — last 5 years)
  - Which fields in Tab J collect work history
    (full history, 10 years, repeating group)
  - Which fields in Tab A collect education
    (highest level, most recent institution)
  - Which fields in Tab J collect education
    (full history, repeating group)

Report this list before writing any code.

---

STEP 4 — ESTABLISH TAB J AS MASTER

Work history master: Tab J QJ-03 (10-year history repeating group)
Education master: Tab J QJ-01 (full education repeating group)

These are the only places the user enters this data.
They are collected once. They flow everywhere else.

If Tab J has not been completed yet when the user opens Tab A:
  Tab A work history fields show a note:
  "Complete your Qualifications tab (Tab J) first —
  your work history will appear here automatically."
  Fields are locked (read-only, empty) until Tab J is complete.

If Tab J IS complete when user opens Tab A:
  Work history fields in Tab A are pre-filled from Tab J data.
  Use PreFilledField wrapper with:
    prefillNote: "From your Qualifications tab (Tab J)"
  DS-160 formatting applied automatically:
    Current occupation → Tab J most recent job title
    Current employer → Tab J most recent employer name
    Start date → Tab J most recent start date
    Monthly income → Tab J most recent income (if collected)
    Duties description → Tab J most recent responsibilities
      (truncated to DS-160 field limit if needed)
    Previous employers → Tab J prior entries (last 5 years only)

Education in Tab A:
  Highest level → derived from Tab J QJ-01 most recent degree level
  Most recent institution → Tab J QJ-01 most recent institution
  Pre-filled with PreFilledField wrapper.

---

STEP 5 — BUILD THE DATA BRIDGE

Create src/lib/tab-j-bridge.ts

Functions:
  getWorkHistoryFromTabJ(applicationId): WorkHistoryEntry[] | null
    Reads from answers table where application_id = applicationId
    and question_id starts with "QJ-03"
    Returns structured array or null if Tab J not complete

  getEducationFromTabJ(applicationId): EducationEntry[] | null
    Reads answers where question_id starts with "QJ-01"
    Returns structured array or null if Tab J not complete

  formatForDS160(workHistory: WorkHistoryEntry[]): DS160WorkFields
    Maps Tab J work history to DS-160 field structure
    Truncates descriptions to DS-160 character limits
    Returns only last 5 years for previous employment fields

---

STEP 6 — UPDATE TAB A TO READ FROM TAB J

Open src/app/apply/module3/a/page.tsx

On component mount:
  Call getWorkHistoryFromTabJ(applicationId)
  If null: show locked fields with "Complete Tab J first" note
  If data: pre-fill using PreFilledField wrapper

Apply formatForDS160() to map Tab J data to exact DS-160 fields.

Add a visible note at the top of the work history section:
  "Your work history is sourced from your Qualifications tab.
  To update it, edit Tab J — changes will reflect here automatically."

---

STEP 7 — PLAYWRIGHT VERIFICATION

Test 1 — Tab A opened before Tab J complete:
  Ensure Tab J has no answers for this application
  Navigate to localhost:3000/apply/module3/a
  Screenshot — confirm work history fields show locked state
  with "Complete Tab J first" note

Test 2 — Tab A opened after Tab J complete:
  Insert mock Tab J work history answers into answers table
  Navigate to localhost:3000/apply/module3/a
  Screenshot — confirm work history pre-filled from Tab J
  Confirm "From your Qualifications tab" note visible

Test 3 — Edit Tab J, check Tab A updates:
  Update a Tab J answer
  Navigate to Tab A
  Screenshot — confirm Tab A reflects the updated value

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: Tab J established as work history master — Tab A reads from Tab J"
git push origin dev
```

---

## SESSION S7 — Business Data Deduplication
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 19–26

**What:**
Business data is collected across Tab A, Tab E, Tab F, Tab G,
Group 3F, Group 3I, and Module 2. Each data point has one correct
master location. Everything else pre-fills from it.
Where two fields must match, flag inconsistency immediately.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 11, duplications 19–26.
Read src/components/PreFilledField.tsx — reuse this component.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"inline field mismatch warning form dark UI"
"form consistency check two fields must match warning"
"data conflict alert inline form dark theme"

Study how high-quality apps handle:
- Two fields that must match (e.g. email confirmation)
- Inline warnings when values are inconsistent
- Non-blocking informational flags on form fields

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://stripe.com/atlas (business formation form fields)

Note how Stripe handles:
- Business name consistency across multiple fields
- Ownership percentage fields
- State of formation / registration fields

---

STEP 3 — BUILD THE CONTRADICTION FLAG COMPONENT

Create src/components/ContradictionFlag.tsx

This is a small inline warning shown between two fields
that should match but currently have different values.

Props: {
  fieldALabel: string
  fieldAValue: string
  fieldBLabel: string
  fieldBValue: string
  onUseA: () => void
  onUseB: () => void
}

Visual:
  Container: padding 10px 14px
  background: rgba(201,168,76,0.06)
  border-left: 2px solid rgba(201,168,76,0.6)
  No rounded corners

  Content:
  Small amber warning icon (SVG inline)
  Text 12px DM Sans 300:
  "These values should match. Which is correct?"
  Two buttons side by side:
    "Use [fieldAValue]" — outlined gold button
    "Use [fieldBValue]" — outlined gold button
  On click: updates both fields to the chosen value.
  Component dismisses after choice is made.

---

STEP 4 — ESTABLISH DATA MASTERS AND WIRE PRE-FILLS

Master data points and their sources:

Business name:
  Master: Tab A QA-51
  Pre-fills: Tab E QE-01
  Use PreFilledField on QE-01 with note:
  "From your business details (Tab A)"

Ownership percentage:
  Master: Tab A QA-55
  Pre-fills: Tab E QE-09
  Use PreFilledField on QE-09
  Add ContradictionFlag between QA-55 and QE-09 if they differ.
  These must always match — inconsistency is a denial risk.

Target U.S. state:
  Seeds from: Module 2 Q1 (planning hypothesis)
  Confirmed at: Tab E QE-03 (LLC registered state)
  Show Module 2 value as context on Tab E QE-03:
  "You indicated [state] in your business advisor section.
  Confirm the state where your LLC is registered."
  Tab E QE-03 is always editable — Module 2 was a plan,
  Tab E is the confirmed legal fact.

Business operational status:
  Master: Tab G QG-02
  Pre-fills: Group 3I Q3I-01
  Use PreFilledField on Q3I-01 with note:
  "From your business evidence (Tab G)"

Business licenses:
  Master: Tab G QG-03
  Pre-fills: Group 3I Q3I-02
  Use PreFilledField on Q3I-02 with note:
  "From your business evidence (Tab G)"

Business bank account:
  Master: Tab F QF-07 (bank name and address)
  Pre-fills: Group 3I Q3I-08
  Use PreFilledField on Q3I-08 with note:
  "From your investment details (Tab F)"

Business address:
  Master: Tab G QG-01a
  Pre-fills: Tab A QA-52, Group 3I Q3I-05
  Use PreFilledField on both with note:
  "From your business evidence (Tab G)"

Equipment:
  Master category: Tab F QF-04 (what categories of investment)
  Detail: Group 3I Q3I-07 (line-item breakdown)
  On Group 3I Q3I-07: show which categories were selected in QF-04
  as context. Do not pre-fill the line items — they are new detail.
  Show: "In Tab F you indicated equipment was purchased.
  Please list the specific items below."

Prior business ownership:
  Master: Module 2 Q3 (yes/no + type — first collection)
  Pre-fills: Tab J QJ-05 (detailed version)
    Use PreFilledField on yes/no portion of QJ-05:
    prefillNote: "From your business advisor section"
    Detail fields in QJ-05 remain blank for user to complete.
  Pre-fills further: Group 3F Q3F-07
    Use PreFilledField from QJ-05 answers.
  Follow-up conversation gap category 8:
    Reads from Q3F-07 — no user input needed.

Professional background category:
  Master: Module 2 Q2 (category selection)
  Context in: Tab J
    Show at top of Tab J qualifications section:
    "You indicated your background is [category] in your
    business advisor section. Your qualifications below
    should reflect this."
    Not a pre-filled field — context only. Tab J fields
    remain blank for the user to complete in full.

---

STEP 5 — PLAYWRIGHT VERIFICATION

Test 1 — Business name flows from Tab A to Tab E:
  Enter a business name in Tab A QA-51
  Navigate to Tab E
  Screenshot — confirm QE-01 shows pre-filled value with badge

Test 2 — Ownership % contradiction flag:
  Enter 60% in Tab A QA-55
  Enter 70% in Tab E QE-09
  Screenshot — confirm ContradictionFlag appears between fields
  Click "Use 60%" — screenshot — confirm both fields update to 60%
  Confirm flag dismisses

Test 3 — Business address flows from Tab G to Tab A:
  Enter address in Tab G QG-01a
  Navigate to Tab A
  Screenshot — confirm QA-52 shows pre-filled with badge

Test 4 — Equipment context in Group 3I:
  Select "equipment" in Tab F QF-04
  Navigate to Group 3I Q3I-07
  Screenshot — confirm context note appears above the field

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: business data deduplication — single master source for each field"
git push origin dev
```

---

## SESSION S8 — Security History Pre-Fill
**Priority:** 🟡 HIGH
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 4, 5, 6

**What:**
Criminal history, prior visa refusals, and entry refusal questions
are asked in the quiz and again in Tab A. Tab A must pre-fill from
the quiz. Legal confirmation required before Tab A submits.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 11, duplications 4, 5, 6.
Read src/components/PreFilledField.tsx — reuse this component.
Read src/lib/prefill.ts (built in S5) — extend it, do not rewrite.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"legal confirmation checkbox form dark UI"
"sensitive field confirmation required before submit"
"pre-filled legal field confirm accuracy dark theme"

Study how apps handle:
- Fields with legal significance requiring explicit confirmation
- The visual treatment of sensitive pre-filled fields
- Confirmation checkboxes that gate form submission

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.turbotax.com (their sensitive data confirmation patterns)

Note how TurboTax handles:
- Pre-filled sensitive fields (SSN, prior year data)
- Legal accuracy confirmations
- The visual weight of fields that require explicit confirmation

---

STEP 3 — EXTEND src/lib/prefill.ts

Add these mappings to the existing getPreFill() function:

Q0-13 → QA-39 (criminal history)
  value: answers["Q0-13"]
  note: "Confirmed from your eligibility check"
  requiresConfirmation: true
  confirmationText: "I confirm this answer is accurate,
  complete, and consistent with what I will declare
  at the consulate."

Q0-11 → QA-23 (prior visa refusals)
  value: answers["Q0-11"]
  note: "From your eligibility check"
  requiresConfirmation: true
  confirmationText: "I confirm this accurately reflects
  my complete U.S. visa application history."

Q0-12 sub-answers → QA-46, QA-47, QA-48
  Map Q0-12 answer to appropriate sub-field:
  "removed or deported" → QA-46
  "overstayed a visa" → QA-47
  Either or both → QA-48 (DS-160 bundled version)
  requiresConfirmation: true for all three
  confirmationText: "I confirm this accurately reflects
  my complete immigration history."

---

STEP 4 — UPDATE PREFILLED FIELD FOR LEGAL CONFIRMATION

Extend src/components/PreFilledField.tsx

Add optional prop: requiresConfirmation: boolean

When requiresConfirmation is true and field is pre-filled:
  Show field value (read-only)
  Show pre-fill badge and note as normal
  Below the field, add a confirmation row:
    Checkbox (unchecked by default)
    Label: the confirmationText from getPreFill()
    Styled: small text, DM Sans 300, rgba(245,240,232,0.6)
    Gold checkbox border when unchecked
    Gold fill when checked

  The Tab A submit button must be disabled until ALL
  requiresConfirmation fields have their checkbox checked.

  If user clicks "Edit" on a requiresConfirmation field:
    Checkbox unchecks automatically.
    User must re-confirm after editing.

---

STEP 5 — WIRE INTO TAB A

Open src/app/apply/module3/a/page.tsx

Wrap these fields with PreFilledField (requiresConfirmation: true):

QA-39 (criminal history):
  prefillValue: getPreFill("Q0-13").value
  prefillNote: getPreFill("Q0-13").note
  requiresConfirmation: true
  confirmationText: getPreFill("Q0-13").confirmationText

QA-23 (prior visa refusals):
  prefillValue: getPreFill("Q0-11").value
  prefillNote: getPreFill("Q0-11").note
  requiresConfirmation: true
  confirmationText: getPreFill("Q0-11").confirmationText

QA-46 (deportation/removal):
  prefillValue: getPreFill("Q0-12-removal").value
  requiresConfirmation: true

QA-47 (visa overstay):
  prefillValue: getPreFill("Q0-12-overstay").value
  requiresConfirmation: true

QA-48 (DS-160 bundled refusal/admission):
  Pre-fill from Q0-11 AND Q0-12 combined.
  requiresConfirmation: true
  Add a note: "This field combines your visa refusal and
  entry history from your eligibility check. Review
  carefully before confirming."

Add a Tab A section header above these fields:
  "Security & Immigration History"
  Subtitle in muted text:
  "These fields have been pre-filled from your eligibility
  check. Review each answer carefully and confirm accuracy
  before proceeding. These declarations will appear in your
  DS-160 and are subject to consular scrutiny."

---

STEP 6 — PLAYWRIGHT VERIFICATION

Test 1 — All security fields pre-filled, no prior issues:
  Set localStorage Q0-11: "no", Q0-12: "no", Q0-13: "no"
  Navigate to localhost:3000/apply/module3/a
  Scroll to security section
  Screenshot — confirm all three fields show "no" pre-filled
  with badge and confirmation checkboxes unchecked

Test 2 — Prior refusal flagged:
  Set localStorage Q0-11: "yes"
  Navigate to Tab A
  Screenshot — confirm QA-23 shows "yes" pre-filled
  Confirm QA-23 detail fields expand automatically
  Confirm confirmation checkbox present and unchecked

Test 3 — Submit gate:
  Leave confirmation checkboxes unchecked
  Attempt to submit Tab A
  Screenshot — confirm submit button is disabled
  Check all confirmation boxes
  Screenshot — confirm submit button becomes active

Test 4 — Edit then re-confirm:
  Check confirmation checkbox on QA-39
  Click "Edit" on QA-39
  Screenshot — confirm checkbox unchecks automatically
  Make an edit, re-check checkbox
  Screenshot — confirm submit gate re-enables

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: security history pre-fill — legal confirmation gate on Tab A"
git push origin dev
```

---

## TIER 2 COMPLETION CHECK

Before moving to Tier 3, confirm all four are done:

| Session | What | Commit | Build clean |
|---|---|---|---|
| S5 | Module 3 pre-fill from quiz — Tabs A, F, L | ⬜ | ⬜ |
| S6 | Work history and education — Tab J as master | ⬜ | ⬜ |
| S7 | Business data — single master per field | ⬜ | ⬜ |
| S8 | Security history — legal confirmation gate | ⬜ | ⬜ |

Run npm run build after each session.
Run Playwright after each session.
Do not start Tier 3 until all four rows are checked.

---

*File: ~/E2-go/docs/SESSION_PLAN_TIER2.md*
