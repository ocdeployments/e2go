# e2go.app — Session Plan: Tier 5 & Tier 6
## Tier 5: Spec updates (docs only). Tier 6: Deferred Phase 2 features.
**Updated:** June 4, 2026
**Tier 5 prerequisite:** Tier 4 complete (S12–S15 committed, build clean)
**Tier 6 prerequisite:** First paying users achieved. Tiers 1–4 complete.

---

# TIER 5 — SPEC UPDATES BEFORE BUILD

These three sessions update existing specification documents to reflect
decisions made in IDEAS.md. No code is written in any Tier 5 session.
Each session reads the existing spec, reads the relevant IDEAS.md section,
and adds the missing decisions to the spec file. Then commits.

These spec updates must happen before the corresponding features are built —
otherwise the builder works from an outdated spec and produces wrong output.

---

## SESSION S16 — Interview Simulator Spec Update
**Priority:** 🟢 MEDIUM
**Time:** 30–60 minutes
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12G
**No code. Documentation only.**

**What:**
The simulator spec in Vol 3 Section 7.5/7.6 has the question bank,
evaluation engine, voice mode, and context object. What it does NOT
have is the critical decision from IDEAS.md 12G: the simulator reads
the filed package as its complete baseline, probes weak points
identified by the analysis engine, and evaluates live answers against
what is in the filed documents. This must be added before the
simulator is built.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Do not read DESIGN_REFERENCE.html — this is a documentation session.
Do not use any MCP servers this session.
Do not write any code this session.

Read these files completely before doing anything:
1. docs/IDEAS.md Section 12G — the simulator decision
2. E2Pathway_Vol3_Sections_7.5_7.6.md — the existing simulator spec

After reading both, identify exactly what is in the existing spec
and what is missing based on IDEAS.md 12G.

Then create docs/INTERVIEW_SIMULATOR_SPEC.md as a new file.

This file must contain:

SECTION 1 — Copy from existing spec (Vol 3 Section 7.5/7.6):
  - Simulator architecture (text mode / voice mode)
  - Question bank generation logic
  - Universal questions UQ-01 through UQ-09
  - Business-type conditional questions (all categories)
  - Profile-flag conditional questions
  - Evaluation engine and scoring
  - Post-session feedback and coaching summary
  - Voice mode technical specification (Whisper API)
  - Session limits (2 included, $9.99 per 3-bundle extra)
  - Personalization depth implementation note

SECTION 2 — Add from IDEAS.md 12G (not in existing spec):

2.1 — The Filed Package as Baseline
  The simulator does not re-collect data. It reads the complete
  filed application as its context before generating any question.
  Context object includes:
    - All Module 3 answers (every tab, every question)
    - All generated documents (cover letter, business plan, etc.)
    - All analysis engine flags (weak points, denial risk scores)
    - All dimension scores from the confidence score assessment

2.2 — Weak Point Probing
  The analysis engine flags are the primary driver of question
  selection beyond the universal questions.
  For each dimension scored below 70/100 by the analysis engine:
    Generate 1–2 targeted questions probing that specific weakness.
  For each denial risk flag triggered (W-XX codes):
    Generate 1 targeted question about that specific risk area.
  These probe questions are inserted after the universal questions
  and before business-type questions.
  Maximum 3 probe questions per session to avoid overwhelming.

  Example probe question mapping:
  Low substantiality score →
    "Walk me through exactly how the $[amount] was allocated
    across each element of your business investment."
  Prior refusal flag →
    "You were previously refused a U.S. visa. Can you explain
    the circumstances and what has changed since then?"
  Low non-marginality score →
    "Your business projects [revenue]. How does this compare to
    what you need to support your household?"
  Low develop-and-direct score →
    "Describe your day-to-day management activities in the business.
    Who reports to you and how do you direct their work?"

2.3 — Answer Evaluation Against Filed Documents
  For each answer, the evaluation engine:
  1. Reads the answer
  2. Reads the relevant section of the filed documents
     (e.g., if asked about investment allocation, reads Tab F)
  3. Compares the live answer to what was filed
  4. Produces one of three ratings:

  CONSISTENT AND STRONG:
    The live answer matches the filed documents and covers
    the key points the officer would expect.
    Feedback: "Strong answer. This is consistent with your
    filed [document name] and covers the key points."

  WEAKER THAN FILED:
    The live answer is correct but incomplete compared to
    what was filed — the applicant is underselling their case.
    Feedback: "Your answer is accurate but missing some important
    details that are in your filed application. Consider adding:
    [specific detail from filed document]."

  INCONSISTENT WITH FILED:
    The live answer contradicts something in the filed documents.
    This is a red flag that must be resolved before the interview.
    Feedback: "⚠️ Inconsistency detected. Your answer states
    [X] but your [document name] states [Y]. This inconsistency
    must be resolved before your interview. An officer who notices
    this discrepancy will probe it further."

2.4 — Post-Session Coaching Summary
  After all questions are answered, generate a coaching summary:

  Section 1 — Strong answers (list with brief note)
  Section 2 — Answers that need more detail (list with specific
    additions recommended from the filed documents)
  Section 3 — Inconsistencies to resolve (list with specific
    contradiction identified and recommended resolution)
  Section 4 — Weak points still at risk (probe questions that
    scored weak — these are likely to be asked at the real interview)

  Overall readiness indicator:
    All questions strong: "Interview ready."
    1–2 needing work: "Nearly ready — address the flagged items."
    3+ needing work or any inconsistency: "More preparation needed."

2.5 — What the Simulator Does NOT Do
  - Does not re-ask questions already answered in Module 3
  - Does not ask the applicant to re-explain their business from scratch
  - Does not treat any question as a blank slate
  - Does not generate generic questions unrelated to the filed package
  Every question references the applicant's specific situation.

Do NOT write any code.
Do NOT modify any existing spec files — create a new file only.

Commit after creating the file:
"docs: interview simulator spec — package context and weak point probing added"
git push origin dev
```

---

## SESSION S17 — Compliance Calendar Spec Update
**Priority:** 🟢 MEDIUM
**Time:** 30–60 minutes
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12H
**No code. Documentation only.**

**What:**
The compliance calendar spec in Vol 3 Section 7.7 describes the
anchor date as "the user's target interview date." It does not
distinguish between the working target date (planning hypothesis,
set early) and the confirmed interview date (real appointment,
set late). This distinction must be added before the calendar is built
— otherwise the builder uses one date concept when two are needed.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Do not read DESIGN_REFERENCE.html — this is a documentation session.
Do not use any MCP servers this session.
Do not write any code this session.

Read these files completely before doing anything:
1. docs/IDEAS.md Section 12H — the two anchor date decision
2. E2Pathway_Vol3_Sections_7.7_7.8.md — the existing calendar spec
   (Section 7.7 only — stop before Section 7.8 renewal module)

After reading both, identify exactly what needs to be added.

Then create docs/COMPLIANCE_CALENDAR_SPEC.md as a new file.

This file must contain:

SECTION 1 — Copy from existing spec (Vol 3 Section 7.7):
  - Calendar purpose
  - Three-layer architecture (anchor date / static triggers /
    dynamic triggers)
  - Pre-interview calendar items table
  - Interview day items
  - Post-interview items
  - Post-approval items (5-year cycle)
  - Notification rules (7-day, 3-day, 24-hour)
  - Critical item dismissal rules
  - Renewal trigger at Year 4

SECTION 2 — Add from IDEAS.md 12H (not in existing spec):

2.1 — Two Distinct Date Concepts
  Replace all references to "the user's target interview date"
  with the correct two-concept model:

  THE WORKING TARGET DATE:
    Definition: A planning hypothesis the user sets early in their
    journey to make the timeline feel concrete and motivating.
    Where it is set: Journey wizard (pre-sign-up or dashboard)
    Where it is stored: applications.working_target_date
    What it is used for: Journey wizard display only. Motivational
    planning. Not used for any compliance deadline calculations.
    Key rule: NEVER use this date as a hard deadline anchor.
    Can be changed at any time with no downstream consequences.

  THE CONFIRMED INTERVIEW DATE:
    Definition: The real consulate appointment date. Known only
    when the applicant has actually scheduled their appointment.
    Typically available 4–8 weeks before the interview.
    Where it is set: Compliance calendar or dashboard
    Where it is stored: applications.confirmed_interview_date
    What it is used for: ALL compliance deadline calculations.
    Key rule: This is the ONLY date used to calculate specific
    deadline dates on the calendar.

2.2 — Display Rules Based on Date Availability

  confirmed_interview_date IS NULL:
    All calendar items display with range descriptions only.
    NEVER show a specific date when no confirmed date exists.
    Format: "Approximately [N] weeks before your interview"
    Banner at top of calendar:
    "Your compliance deadlines will lock in once you confirm
    your interview appointment date. Enter your date below
    to see specific deadlines."
    Input field: "I have my confirmed interview date → [date picker]"

  confirmed_interview_date IS SET:
    All calendar items display with specific calculated dates.
    Format: "[Day, Month Date, Year]"
    Banner at top of calendar:
    "Deadlines calculated from your confirmed interview date
    of [confirmed_interview_date formatted]."
    Small "Update date" link for corrections.

2.3 — Update Propagation Rule
  When confirmed_interview_date is set or changed:
  All calendar items for that application recalculate immediately.
  The dashboard milestone tracker updates immediately.
  The journey wizard working target date is NOT affected.
  These are separate concepts stored in separate columns.

2.4 — DB Fields Reference
  applications.working_target_date — journey wizard planning date
  applications.confirmed_interview_date — real appointment anchor
  calendar_items.due_date — specific date (null until confirmed)
  calendar_items.range_description — shown when due_date is null

2.5 — Layer 1 Correction
  Replace the existing Layer 1 description in the copied spec:

  OLD: "The user's target interview date is the primary anchor.
  All pre-interview events are calculated backward from this date."

  NEW: "The confirmed interview date (applications.confirmed_interview_date)
  is the anchor for all deadline calculations. This date is distinct
  from the working target date set in the journey wizard
  (applications.working_target_date). Pre-interview events are
  calculated backward from confirmed_interview_date only.
  If confirmed_interview_date is null, all items display ranges,
  not specific dates."

Do NOT write any code.
Do NOT modify any existing spec files — create a new file only.

Commit after creating the file:
"docs: compliance calendar spec — dual anchor date logic documented"
git push origin dev
```

---

## SESSION S18 — Renewal Module Spec Update
**Priority:** 🟢 MEDIUM (Phase 2)
**Time:** 30–60 minutes
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12F
**No code. Documentation only.**

**What:**
The renewal spec in Vol 3 Section 7.8 already has the question set
and Template 6. RQ-01 already says projections are pre-populated
for comparison. What the spec lacks is an explicit field-by-field
table of what pre-populates vs. what collects fresh, and the
approved framing language for each question that has a baseline.
This must be added before the renewal module is built.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Do not read DESIGN_REFERENCE.html — this is a documentation session.
Do not use any MCP servers this session.
Do not write any code this session.

Read these files completely before doing anything:
1. docs/IDEAS.md Section 12F — the baseline vs. fresh data decision
2. E2Pathway_Vol3_Sections_7.7_7.8.md — Section 7.8 renewal spec

After reading both, identify exactly what needs to be added.

Then create docs/RENEWAL_MODULE_SPEC.md as a new file.

This file must contain:

SECTION 1 — Copy from existing spec (Vol 3 Section 7.8):
  - Renewal module purpose and entry points
  - Path A vs. Path B routing
  - Entry screen copy and routing quiz
  - Path A question set (RQ-01 through RQ-15)
  - Template 6 specification
  - Path B question set (RQ-B01 through RQ-B03)
  - Path B package generated
  - Renewal pricing
  - Renewal interview simulator updates

SECTION 2 — Add from IDEAS.md 12F (not in existing spec):

2.1 — The Baseline Principle
  Original application data is a historical baseline for comparison.
  It is never assumed to be currently true.
  At renewal, the user's circumstances may have changed completely —
  new passport, new address, new role, changed family composition.
  The only correct use of original data is to pre-populate the
  "projected" column in Template 6 and to provide context framing
  for questions where a before/after comparison is relevant.

2.2 — Field Classification Table

  Add this table to the spec immediately before the question set:

  | Field | Classification | Pre-populate from | Behaviour |
  |---|---|---|---|
  | Template 6 projected revenue (all years) | BASELINE | Tab I QI-05, QI-06 | Read-only. User cannot edit projected column. |
  | Template 6 projected employees (all years) | BASELINE | Tab I QI-02, QI-03 | Read-only. User cannot edit projected column. |
  | Template 6 actual revenue (all years) | FRESH | None | Blank. User fills. |
  | Template 6 actual employees (all years) | FRESH | None | Blank. User fills. |
  | Passport number | FRESH | None | Blank. Always collect new. |
  | Passport expiry | FRESH | None | Blank. Always collect new. |
  | Business address | FRESH | None | Blank. May have changed. |
  | Current role | FRESH | None | Blank. May have changed. |
  | Current annual revenue | FRESH | None | Blank. Must reflect current period. |
  | Current employee count | FRESH | None | Blank. Must reflect current state. |
  | Business growth narrative | FRESH | None | Blank. New content for this renewal. |
  | Canadian ties | FRESH | None | Blank. May have changed significantly. |
  | Family composition | FRESH | None | Blank. Children may have aged out. |
  | Immigration history since original | FRESH | None | Blank. New period covered. |

2.3 — Template 6 Implementation Rule
  The projected column is read-only. It is pre-populated from
  the original application's Tab I answers (QI-05, QI-06, QI-02, QI-03).
  The user fills the actual column only.
  The table heading must clearly distinguish the two columns:
    Left column: "Original Projection (from your 2026 application)"
    Right column: "Actual (enter your real figures)"
  The user never re-enters what they originally projected.
  That data is a fixed historical record.

2.4 — Question Framing Rules
  For every question where original data provides context,
  use this framing pattern — do NOT re-ask the original question:

  RQ-01 (revenue) framing:
    "Your original Year 1 revenue projection was $[QI-05 Year 1].
    What was your actual Year 1 revenue?"
    Then: "Your original Year 2 projection was $[QI-05 Year 2].
    What was your actual Year 2 revenue?"
    (Continue for each year of operation)

  RQ-02 (employees) framing:
    "Your original Year [N] hiring plan projected [QI-02 Year N]
    full-time employees. How many full-time employees do you
    currently have?"

  RQ-09 (current role) framing:
    "In your original application, your role was described as
    [original role from Tab D/J]. Describe your current role
    in the business."
    Do NOT ask "Is your role the same?" — collect fresh.

  RQ-10 (hiring plan) framing:
    "Your original business plan projected [QI-03] employees
    by Year [N]. Have you met, exceeded, or fallen short of
    this hiring plan?"

2.5 — What Original Data Is NEVER Used For
  The following original application fields are historical record.
  They are never shown to the user as "current" and never
  pre-populated into renewal fields:
  - Passport number and expiry (always collect fresh)
  - Home address (always collect fresh)
  - Business address (always collect fresh — may have relocated)
  - Canadian bank accounts (always collect fresh)
  - Family composition (always collect fresh — children age out)
  - Canadian property (always collect fresh — may have sold)
  - Investment amount (original investment is history — renewal
    adds new investment evidence separately)

Do NOT write any code.
Do NOT modify any existing spec files — create a new file only.

Commit after creating the file:
"docs: renewal module spec — baseline vs fresh data, framing rules added"
git push origin dev
```

---

## TIER 5 COMPLETION CHECK

| Session | What | Commit | Done |
|---|---|---|---|
| S16 | INTERVIEW_SIMULATOR_SPEC.md created | ⬜ | ⬜ |
| S17 | COMPLIANCE_CALENDAR_SPEC.md created | ⬜ | ⬜ |
| S18 | RENEWAL_MODULE_SPEC.md created | ⬜ | ⬜ |

No build check needed — documentation only.
Do not start Tier 6 build sessions until first paying users achieved.

---

# TIER 6 — DEFERRED PHASE 2 FEATURES

⚠️ IMPORTANT NOTE FOR CLAUDE CODE:
Do not start any Tier 6 session until:
1. Tiers 1–4 are fully complete
2. First paying users have been achieved
3. You run "start session" and re-read all context files fresh
   The codebase will have evolved significantly by the time
   these sessions run. Do not assume file paths or component
   names from Tier 1–4 still apply.

---

## SESSION S19 — Pre-Qualification Wizard
**Priority:** ⚪ DEFERRED — Phase 2
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 3
**Prerequisite:** S12 (journey wizard stage shifting) complete

**What:**
A guided thinking experience for users who arrive at the site
knowing nothing about E-2. Sits before the quiz. 4–5 branching
questions that help the user understand their situation before
they answer eligibility questions. By the time they reach the
quiz, they understand why they are being asked what they are asked.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 3 — pre-qualification wizard concept.
Do not use Magic MCP this session.

IMPORTANT: Before building anything, audit the current landing page
and quiz flow to understand what has been built since this session
was planned. The codebase has evolved — do not assume any file
paths or component structures from earlier sessions still apply.
Report current state before writing any code.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"guided onboarding quiz branching questions dark UI"
"pre-qualification wizard investor dark luxury"
"step by step eligibility guide dark theme minimal"

Study how high-quality apps handle:
- Branching question flows with 4–5 questions
- The transition from guided thinking to a formal quiz
- Visual framing that feels like guidance, not interrogation

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com (their "find your plan" guided flow)
https://www.turbotax.com (their "which product is right for you" flow)

Note the branching structure and question framing.

---

STEP 3 — BUILD THE PRE-QUALIFICATION FLOW

Create a new page: src/app/start/page.tsx
Route: /start

This page sits before /quiz in the user flow:
  / (landing) → /start (pre-qual) → /quiz → /results

Question sequence:

Q1: "Are you thinking about moving to the United States?"
  Options: "I've decided to move" / "I'm seriously exploring it" /
           "Just researching for now"
  All options continue — this is framing, not a filter.

Q2: "Do you have funds available to invest in a U.S. business?"
  Options: "Under $100,000" / "$100,000–$200,000" /
           "$200,000–$500,000" / "Over $500,000"
  Under $100K: show a gentle note explaining minimum thresholds,
  but do not stop — let them continue to quiz.

Q3: "Do you have a business in mind?"
  Options: "Yes — I know what I want to do" /
           "I'm open to a franchise" /
           "I want to find my own business" /
           "I have no idea yet"

  If "Yes — I know what I want to do":
    Q3a: "Is it a franchise?"
    Options: "Yes" / "No — independent business"
    Continue to quiz.

  If "Open to a franchise":
    Q3b: "Which industry interests you most?"
    Options: "Food & Beverage" / "Health & Wellness" /
             "Senior Care" / "Children & Education" /
             "Home Services" / "Not sure yet"
    Store answer for franchise connector pre-briefing.
    Continue to quiz.

  If "Find own business" or "No idea":
    Continue to quiz — business advisor module will help.

Q4: "Which country are you from?"
  This is a simplified nationality question to warm them up
  before the full quiz asks it formally.
  Show a dropdown of top 20 E-2 treaty countries + "Other"
  Store answer — pre-fills Q0-01 in quiz.

Transition screen after Q4:
  "Based on what you've told us, let's confirm your eligibility.
  The next 10 minutes will tell you exactly where you stand."
  CTA: "Start your eligibility check →" → /quiz

Pre-fill Q0-01 in quiz from the nationality answer given in Q4.
Pre-fill investment range context in quiz from Q2 answer.

---

STEP 4 — LANDING PAGE CTA UPDATE

Update the primary landing page CTA to point to /start
instead of /quiz directly.
Secondary CTA "I know I'm eligible" can still point to /quiz.

---

STEP 5 — PLAYWRIGHT VERIFICATION

Test all four Q3 paths.
Test that quiz pre-fills from pre-qual answers.
Test mobile at 390px viewport.
Commit: "feat: pre-qualification wizard — guided thinking before quiz"
git push origin dev
```

---

## SESSION S20 — Full Lifecycle Scroll Section
**Priority:** ⚪ DEFERRED — Phase 2
**Estimated time:** 4–5 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 3
**Prerequisite:** S13 (comparison section) complete and live

**What:**
A scroll-triggered animated section on the landing page showing
the complete arc of the E-2 journey from "I want to move to the U.S."
through to "Renewal complete, Year 5." Beautiful, not interactive.
e2go as the guide at every step.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 3 — full lifecycle scroll concept.
Do not use Magic MCP this session.

IMPORTANT: Audit current landing page before building.
Codebase has evolved. Report current state first.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"scroll triggered timeline animation dark luxury"
"vertical journey scroll section dark SaaS landing"
"step reveal scroll animation dark theme gold"

Study scroll-triggered reveal patterns that feel premium,
not gimmicky. The animation should enhance, not distract.

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://stripe.com (their product story scroll sections)
https://linear.app (their how-it-works scroll animation)

Note specifically how they handle scroll-triggered reveals
without relying on heavy animation libraries.

---

STEP 3 — BUILD THE LIFECYCLE SCROLL SECTION

Create src/components/landing/LifecycleScroll.tsx

Seven stages, each reveals on scroll into viewport:

Stage 1: "I want to move to the U.S."
  e2go: "Start with 10 minutes. We'll tell you if E-2 applies to you."

Stage 2: "Do I have the right business?"
  e2go: "We connect you with franchise options matched to your
  budget and E-2 requirements."

Stage 3: "How do I set up the business?"
  e2go: "LLC formation, EIN, U.S. banking — specialists briefed
  on your situation, introduced at the right moment."

Stage 4: "How do I prepare my application?"
  e2go: "A guided interview that takes everything the engine needs.
  Documents generated, tested, and ready in days."

Stage 5: "How do I prepare for the interview?"
  e2go: "A simulator that knows your specific case. Questions
  tailored to your business. Weak points probed before the officer does."

Stage 6: "I have my visa. What now?"
  e2go: "A compliance calendar that tracks every deadline for
  the next 5 years. Nothing missed."

Stage 7: "Renewal in Year 4."
  e2go: "Your original application data is the baseline.
  We build your renewal around what actually happened."

CSS scroll-triggered reveal — no animation library.
Use Intersection Observer API with CSS transitions.
Each stage fades and slides up on scroll into view.
Gold left border animates in on reveal.

Use Playwright to screenshot at various scroll positions.
Commit: "feat: landing page full lifecycle scroll section"
git push origin dev
```

---

## SESSION S21 — Animated Gradient Border Polish
**Priority:** ⚪ DEFERRED — Polish
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 7, docs/animated-gradient-border.md
**Prerequisite:** All Tier 1–4 sessions complete

**What:**
Apply the animated gold gradient border component to three locations:
pricing page Most Popular card, landing page main CTA, Module 3
active sidebar item.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/DESIGN_REFERENCE.html.
Read docs/animated-gradient-border.md — the component spec.
Do not use Magic MCP this session.

IMPORTANT: Audit current state of all three target locations
before applying anything. Report current state first.

Component spec from docs/animated-gradient-border.md:
  Colors: primary #8B6914, secondary #C9A84C, accent #E8D5A3
  backgroundColor: #0a0a0a
  borderRadius: 0 (no rounded corners — design system rule)
  borderWidth: 1
  Speeds: pricing card = 10, CTA button = 6, sidebar active = 12
  CSS: add @keyframes gradient-rotate and @property --gradient-angle
  to globals.css

Apply to:
1. Pricing page — Most Popular / pre-selected tier card
   Speed: 10. Only on the highlighted card, not all cards.

2. Landing page — main CTA button "Check your eligibility"
   Speed: 6. The primary CTA only, not secondary CTAs.

3. Module 3 — active sidebar tab item
   Speed: 12. Only the currently active tab, not all tabs.

Use Playwright to screenshot all three locations.
Confirm border animates correctly in each.
Commit: "feat: animated gradient border — pricing, CTA, module 3 sidebar"
git push origin dev
```

---

## SESSION S22 — AI Generation Reveal Animation
**Priority:** ⚪ DEFERRED — Polish
**Estimated time:** 2–3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 7, docs/ai-generation-reveal.md
**Prerequisite:** S15 (PDF export) complete

**What:**
Replace the plain scrolling text panel on the document generation
progress page with a blur-lift reveal effect. Wire to SSE progress %.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/DESIGN_REFERENCE.html.
Read docs/ai-generation-reveal.md — the component spec.
Read src/app/generate/[applicationId]/page.tsx — current state.
Do not use Magic MCP this session.

IMPORTANT: The generation page has evolved since this was planned.
Read the current implementation fully before making any changes.
Report current state before writing any code.

Install motion if not already installed:
  Check package.json for "motion" dependency
  If missing: npm install motion

Wire the blur-lift reveal effect:
  Each document reveals with the blur-lift as it completes
  Wire the progress prop to the SSE percentage from the pipeline
  Document 1 complete (step 1 of 15): reveal Cover Letter card
  Document 2 complete (step 2): reveal Source of Funds card
  (Continue for all 6 documents)

Use Playwright to screenshot the generation page at multiple
progress states.
Commit: "feat: document generation blur-lift reveal animation"
git push origin dev
```

---

## SESSION S23 — Image Slider on Auth Pages
**Priority:** ⚪ DEFERRED — Polish
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 7, docs/image-slider-login.md
**Prerequisite:** All Tier 1–4 complete

**What:**
U.S.-themed image slider on the left side of /login, /signup,
and /verify pages.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/DESIGN_REFERENCE.html.
Read docs/image-slider-login.md — the component spec.
Do not use Magic MCP this session.

IMPORTANT: Audit current state of /login, /signup, /verify
before building. Report current state first.

Use Lazyweb MCP to search for:
"split screen auth page image slider dark luxury"
"login page left image right form dark theme"

Build the image slider for the left panel of auth pages.
U.S.-themed: cityscapes, business environments, American landmarks.
Auto-advances every 5 seconds.
Smooth crossfade transition — no harsh cuts.
No play/pause controls — ambient, not interactive.

Apply to: /login, /signup, /verify

Use Playwright to screenshot all three pages.
Commit: "feat: image slider on auth pages — U.S. themed left panel"
git push origin dev
```

---

## SESSION S24 — Journey Wizard as Post-Quiz Page
**Priority:** ⚪ DEFERRED — after S12 complete
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 3
**Prerequisite:** S12 (journey wizard stage shifting) complete

**What:**
Build the personalised version of the journey wizard as a real
Next.js page in the flow between /results and /signup.
Pre-populated from quiz session data. CTA saves the journey
and creates an account.

---

**PASTE THIS INTO CLAUDE CODE WHEN READY:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 3 — journey wizard placement decision.
Do not use Magic MCP this session.

IMPORTANT: Audit the current flow between /results and /signup.
Read the current journey wizard component (built in S12).
Report current state before writing any code.

Flow to implement:
  /quiz → /results → /journey → /signup → /dashboard

Create src/app/journey/page.tsx

This page:
1. Reads quiz session data (nationality, investment tier,
   business stage from Q0-09, family from Q0-16, timeline)
2. Pre-populates the journey wizard with this data
3. Sets the current stage based on quiz answers:
   Q0-09 = business known → Stage 1 (business identified)
   Q0-09 = business forming → Stage 2 (LLC stage)
   Otherwise → Stage 0 (just exploring)
4. Shows the personalised two-track timeline
5. CTA at bottom: "Save your journey — create your account"
   Links to /signup with journey data passed as query params
   or stored in localStorage for retrieval post-signup

After /signup, redirect to /dashboard with the journey
data applied to the new application record.

Update /results page CTA to point to /journey instead of /signup.
Update /signup to accept and apply journey data on account creation.

Use Playwright to test the full flow:
  Quiz → Results → Journey → Signup → Dashboard
Screenshot each step.
Commit: "feat: journey wizard as post-quiz page — personalised timeline"
git push origin dev
```

---

## FULL SESSION EXECUTION SUMMARY

```
TIER 1 — CRITICAL (run first, in order)
  S1  ✅ Quiz UI fixes
  S2  ✅ Results page eligibility only
  S3  ✅ Pricing tier pre-selection
  S4  ✅ Checklist pre-fill

TIER 2 — HIGH (run after Tier 1, in order)
  S5  → Module 3 pre-fill from quiz
  S6  → Work history / education dedup
  S7  → Business data dedup
  S8  → Security history pre-fill

TIER 3 — HIGH (run after Tier 2, in order)
  S9  → Timeline single source of truth
  S10 → Tab B / Tab L overlap fix
  S11 → Analysis engine + confidence score

TIER 4 — MEDIUM (run after Tier 3, in order)
  S12 → Journey wizard stage shifting
  S13 → Landing page comparison section
  S14 → Landing page FAQ section
  S15 → PDF export + ZIP download

TIER 5 — DOCS ONLY (can run any time after Tier 4)
  S16 → Interview simulator spec
  S17 → Compliance calendar spec
  S18 → Renewal module spec

TIER 6 — DEFERRED (after first paying users)
  S19 → Pre-qualification wizard
  S20 → Full lifecycle scroll section
  S21 → Animated gradient border polish
  S22 → AI generation reveal animation
  S23 → Image slider on auth pages
  S24 → Journey wizard as post-quiz page
```

---

*File: ~/E2-go/docs/SESSION_PLAN_TIER5_6.md*
*Last updated: June 4, 2026*
