# e2go.app — Prioritised Session Plan
## All actionable items from IDEAS.md, ordered for Claude Code execution
**Created:** June 4, 2026
**Source:** IDEAS.md Sections 1–12 complete audit
**Lives at:** ~/E2-go/docs/SESSION_PLAN.md
**Read by:** Claude Code at the start of any build session
**Update policy:** Mark sessions ✅ COMPLETE as they finish. Never delete rows.

---

## HOW TO USE THIS FILE

Each session below is a self-contained unit of work for Claude Code.
Sessions are ordered by priority — highest impact and lowest dependency first.
Some sessions are short (1–2 hours). Some are full sessions.
Do not start a session until the previous one is committed and build is clean.

Priority tiers:
- 🔴 CRITICAL — blocks user experience or launch
- 🟡 HIGH — significant user impact, should not wait long
- 🟢 MEDIUM — important but not blocking
- ⚪ DEFERRED — Phase 2 or post-launch

---

## TIER 1 — CRITICAL: FIX WHAT IS BROKEN OR MISLEADING

These must be done before any new features are added.
They affect every user who goes through the current flow.

---

### SESSION S1 — Quiz UI Fixes
**Priority:** 🔴 CRITICAL
**Estimated time:** 1–2 hours
**Status:** ⬜ NOT STARTED

**What:** Fix two known visual bugs in the quiz:
1. Progress bar is showing blue — must be gold #C9A84C
2. Option buttons are white cards — must be gold border glass style
   matching the Obsidian Gold design system

**Why critical:** Every user sees the quiz. These bugs contradict the
design system on the most-seen page in the app.

**Instructions for Claude Code:**
```
Start session.
Read docs/DESIGN_REFERENCE.html — Obsidian Gold spec.
Apply ui-ux-pro-max and full-output-enforcement skills.

Fix 1: Progress bar in /quiz
  Find the progress bar component.
  Replace any blue color with #C9A84C.
  Confirm no other progress bars in the app are blue.

Fix 2: Option buttons in /quiz
  Find the quiz option button component.
  Replace white card style with:
    background: rgba(201,168,76,0.04)
    border: 0.5px solid rgba(201,168,76,0.3)
    color: #f5f0e8
  On hover: border-color rgba(201,168,76,0.7)
  On selected: background rgba(201,168,76,0.12), border #C9A84C
  No rounded corners. No white backgrounds.

Use Playwright to screenshot localhost:3000/quiz and confirm both fixes.
Commit: "fix: quiz progress bar gold, option buttons gold border glass"
```

---

### SESSION S2 — Results Page: Eligibility Signals Only
**Priority:** 🔴 CRITICAL
**Estimated time:** 1 hour
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12I

**What:** Audit the results page and remove any language that suggests
strength or weakness of the case. Results page shows eligibility only:
Proceed / Proceed with Risk / Attorney Recommended / Do Not Proceed.

**Why critical:** If the results page says "your investment looks strong"
and Module 4 later scores investment as weak, the user feels misled.
Trust is broken before they have paid anything.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12I.
Open src/app/results/page.tsx (or equivalent).

Audit all copy for any of the following — remove or replace:
  - "strong", "excellent", "looks good", "solid"
  - Any percentage or score shown to the user
  - Any dimension-level assessment (investment, funds, qualifications)
  - Any language predicting or implying outcome

Keep:
  - Eligibility outcome (Proceed / Proceed with Risk / etc.)
  - Which specific flags were triggered and what they mean
  - What the next step is
  - The CTA to continue

Add where missing:
  - "Your full case strength assessment is available after you
    complete your application profile."

Use Playwright to screenshot localhost:3000/results.
Commit: "fix: results page eligibility signals only — no strength language"
```

---

### SESSION S3 — Pricing Tier Pre-Selection
**Priority:** 🔴 CRITICAL
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12B

**What:** Pricing page reads quiz session data and pre-selects the
correct tier. User sees their tier highlighted with a one-line explanation.

**Why critical:** Currently the user must figure out their tier themselves.
This is friction at the payment moment — the worst possible place for friction.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12B.

Step 1: Add a server-side data fetch to the pricing page.
  Read quiz_session from Supabase for the current user (if signed in)
  or from localStorage e2go_quiz_result (if not yet signed in).
  Extract: application_type (solo/partnership), family_composition.

Step 2: Build a tier mapping function:
  solo + no family           → "Solo Individual"    → $297
  solo + spouse only         → "Solo + Spouse"       → $347
  solo + spouse + 1-2 kids   → "Solo + Family (≤2)"  → $397
  solo + spouse + 3-5 kids   → "Solo + Family (3-5)" → $447
  partnership + no families  → "Partnership"         → $497
  partnership + two couples  → "Partnership Couples" → $547
  partnership + two families → "Partnership Families"→ $647

Step 3: On pricing page load, highlight the matched tier.
  Show a brief note above or within the highlighted card:
  "Based on your eligibility check — [description] — this is your plan."
  All other tiers remain visible below. User can select a different one.
  If no quiz data available: show all tiers, no pre-selection.

Use Playwright to screenshot localhost:3000/pricing.
Commit: "feat: pricing page pre-selects correct tier from quiz answers"
```

---

### SESSION S4 — Pre-Application Checklist Pre-Fill
**Priority:** 🔴 CRITICAL
**Estimated time:** 2–3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12A

**What:** /apply/checklist reads quiz session data and pre-populates
relevant checklist items. Adds a warm note where items are pre-filled.

**Why critical:** Currently the checklist is a generic static list.
It shows items irrelevant to the user's situation and misses items
specific to their situation. This is friction at the start of the
application — the second worst place for it.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12A.
Read src/app/apply/checklist (current implementation).

Step 1: Read quiz session data on page load.
  Fields needed: nationality, application_type, marital_status,
  has_spouse, has_children, num_children, processing_path
  (consular vs. change of status from Q0-03).

Step 2: Build conditional checklist logic:
  Always show:
    - Valid passport (with expiry check flag if within 12 months)
    - Two passport-style photographs
    - Birth certificate
  Show if married:
    - Marriage certificate
    - Note: "We know you are married from your eligibility check."
  Show if previously divorced:
    - Divorce certificate
  Show if spouse applying:
    - Spouse's passport biographical page
    - Spouse's birth certificate
    - Marriage certificate (flag: same document as above — one copy)
  Show if children applying:
    - For each child: passport biographical page + birth certificate
  Show if Change of Status path:
    - I-94 record
    - Current visa status documentation
    - Remove consular-specific items (appointment letter, MRV fee receipt)

Step 3: For each pre-filled item, show a subtle note:
  "Added based on your eligibility check"
  Small, muted — not intrusive. Just honest.

Step 4: Allow user to remove items they believe are not applicable.
  Removed items go to a "Hidden items" section they can restore.

Use Playwright to screenshot localhost:3000/apply/checklist.
Commit: "feat: pre-application checklist pre-fills from quiz session data"
```

---

## TIER 2 — HIGH: QUESTION DUPLICATION FIXES

These fix the 26 question duplications identified in the audit.
Grouped into logical sessions by module.

---

### SESSION S5 — Module 3 Pre-Fill Pass: Quiz → Tabs
**Priority:** 🟡 HIGH
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11

**What:** Implement all mandatory pre-fills from Module 0 quiz
answers into Module 3 tabs. Fields that are already known are
pre-filled and shown as confirmed, not asked again.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 11 (complete pre-fill mapping table).
Read docs/DESIGN_REFERENCE.html.

Implement these pre-fills in Module 3:

1. Q0-01 nationality → Tab A QA-05 (country of citizenship)
   Pre-fill value. Show as read-only with "Edit" option.
   Note: "From your eligibility check"

2. Q0-01 nationality → Tab A QA-06 (dual citizenship)
   If Q0-01 is single nationality: pre-fill "No" for dual citizenship.
   User can override.

3. Q0-05 investment amount → Tab F QF-02 (total invested to date)
   Pre-fill with quiz amount.
   Label: "From your eligibility check: $X — confirm or update"
   Show as editable — this may have changed since quiz.

4. Q0-07 loan flag → Tab F QF-05 (fund source)
   If Q0-07 = loan: pre-select "Loan secured by personal assets"
   in the multiselect. User can adjust.

5. Q0-11 prior refusals → Tab A QA-23
   Pre-fill Yes/No from Q0-11 flag.
   If Yes: expand the detail fields immediately.

6. Q0-16 family composition → Tab L (dependent questions)
   If no spouse flagged: hide spouse questions entirely.
   If no children flagged: hide children questions entirely.
   If no dependents: show Tab L as complete with note
   "No dependents indicated in your eligibility check."

7. Account email → Tab A QA-08
   Always pre-fill from Supabase auth.email.
   Never show as blank field.

For each pre-filled field, show a subtle indicator:
  Small gold dot or "✓ Pre-filled" label
  "Edit" link that opens the field for correction

Use Playwright to screenshot each affected tab.
Commit: "feat: Module 3 pre-fill pass — quiz answers populate tab fields"
```

---

### SESSION S6 — Question Deduplication: Work History & Education
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 9 and 10

**What:** Work history and education are currently collected three
times each (Tab A for DS-160, Tab J for qualifications, Group 3F
for case building). Establish Tab J as the single collection point.
Tab A and Group 3F read from Tab J — they do not ask again.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 11, duplications 9 and 10.

Establish data flow:
  Tab J QJ-03 (work history, 10 years) = master collection point
  Tab A QA-29–34 reads from Tab J QJ-03 — no re-ask
  Group 3F Q3F-01–03 reads from Tab J QJ-03 — no re-ask

  Tab J QJ-01 (education, full history) = master collection point
  Tab A QA-35–36 reads from Tab J QJ-01 — no re-ask
  Group 3F Q3F-06 reads from Tab J QJ-01 — no re-ask

Implementation:
  If Tab J is completed first: Tab A and Group 3F are pre-filled.
  If Tab A is completed first (DS-160 batch): transfer data to Tab J
    and show as pre-filled there. Do not ask again.
  The app must handle both orders — batch 1 vs batch 2 sequencing.

For DS-160 Tab A fields that need specific DS-160 formatting
(current occupation, dates): read from Tab J answers and
auto-format to DS-160 field requirements. Do not re-ask.

Commit: "feat: work history and education — Tab J as single source"
```

---

### SESSION S7 — Question Deduplication: Business Data
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 19–26

**What:** Fix the business data duplications across Tab G, Group 3I,
Tab F, Tab E, and Tab A. Establish clear single source for each
business data point.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 11, duplications 19–26.

Establish these data flows:

Business name:
  Tab A QA-51 = master. Tab E QE-01 pre-fills from QA-51.

Ownership percentage:
  Tab A QA-55 = master. Tab E QE-09 pre-fills from QA-55.
  These must always match — flag if user changes one without the other.

Business state:
  Module 2 Q1 (target state) seeds Tab E QE-03.
  Tab E QE-03 is the confirmed value once LLC is formed.

Business operational status:
  Tab G QG-02 = master. Group 3I Q3I-01 pre-fills from QG-02.

Business licenses:
  Tab G QG-03 = master. Group 3I Q3I-02 pre-fills from QG-03.

Business bank account:
  Tab F QF-07 = master (bank name and address).
  Group 3I Q3I-08 pre-fills from QF-07.

Business address:
  Tab G QG-01a = master.
  Tab A QA-52 pre-fills from QG-01a.
  Group 3I Q3I-05 pre-fills from QG-01a.

Equipment purchased:
  Tab F QF-04 (categories) seeds Group 3I Q3I-07 (detail).
  Q3I-07 asks for line-item detail only — not the categories again.

Prior business ownership:
  Module 2 Q3 = first collection point (yes/no + type).
  Tab J QJ-05 = detailed version. Pre-fill yes/no from Module 2 Q3.
  Group 3F Q3F-07 = most detailed version. Pre-fill from Tab J QJ-05.
  Follow-up conversation gap category 8: reads from Q3F-07. No re-ask.

Professional background:
  Module 2 Q2 (category selection) seeds Tab J context.
  Module 2 Q2 answer shown in Tab J as context, not re-asked.

For each pre-fill: show subtle indicator, allow edit.

Commit: "feat: business data deduplication — single source for each field"
```

---

### SESSION S8 — Question Deduplication: Security & Immigration History
**Priority:** 🟡 HIGH
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 11, duplications 4, 5, 6

**What:** Fix the overlapping security and immigration history questions
across quiz and Tab A. Criminal history, prior refusals, and entry
refusal questions have ambiguous pre-fill mapping. Clarify and implement.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 11, duplications 4, 5, 6.

Implement these pre-fills:

Criminal history:
  Q0-13 = master (quiz). Tab A QA-39 pre-fills from Q0-13.
  QA-39 is shown as pre-filled with edit option.
  Note: "Confirmed from your eligibility check."
  This is a legal document field — user must confirm before Tab A submits.

Prior visa refusals:
  Q0-11 = master (quiz). Tab A QA-23 pre-fills from Q0-11.
  If Yes: QA-23 detail fields expand immediately showing what is known.
  Tab A QA-48 (DS-160 security section) also pre-fills from Q0-11.
  Flag if QA-23 and QA-48 contradict each other.

Entry refusal / removal / deportation:
  Q0-12 = master (quiz). Mapping:
    Q0-12 "removed/deported" → Tab A QA-46
    Q0-12 "overstayed" → Tab A QA-47
    Q0-12 combined → Tab A QA-48 (DS-160 bundled version)
  Pre-fill each field from the corresponding Q0-12 sub-answer.
  Confirm with user before Tab A submits (legal document).

Commit: "feat: security history pre-fill — quiz answers map to Tab A fields"
```

---

## TIER 3 — HIGH: DATA ARCHITECTURE FIXES

These fix how data flows through the app at a structural level.
They affect document generation quality and user experience
but require more careful implementation.

---

### SESSION S9 — Single Source of Truth: Timeline Data
**Priority:** 🟡 HIGH
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12C and 12H

**What:** Establish one DB record for timeline data. Separate the
working target date (hypothetical) from the confirmed interview date
(real). All surfaces read from one record.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Sections 12C and 12H.
Read docs/E2Pathway_Vol4_Technical_Architecture.md (schema section).

Step 1: Add two fields to the applications table if not present:
  working_target_date DATE — the planning hypothesis
  confirmed_interview_date DATE — the real appointment date

Step 2: Journey wizard writes to working_target_date on save.
  Dashboard reads working_target_date for motivational display.
  Compliance calendar reads confirmed_interview_date for deadlines.
  If confirmed_interview_date is null: calendar shows ranges only.

Step 3: Compliance calendar display rules:
  confirmed_interview_date is null:
    Show all items with estimated ranges:
    "Approximately [N] weeks before your interview"
  confirmed_interview_date is set:
    Show all items with specific dates calculated from that anchor.
    Show a banner: "Deadlines calculated from your confirmed
    interview date of [date]."

Step 4: When user enters confirmed_interview_date anywhere
  (dashboard, calendar, profile):
  All three surfaces update simultaneously.
  Show a confirmation: "Your compliance calendar has been updated
  with your confirmed interview date."

Migration: IF NOT EXISTS — never DROP.
Commit: "feat: separate working target date from confirmed interview date"
```

---

### SESSION S10 — Tab B / Tab L Document Overlap Fix
**Priority:** 🟡 HIGH
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12E

**What:** When a document appears on both Tab B and Tab L checklists,
flag it once and explain it covers both tabs.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12E.
Read module3_tabs_b_e.md (Tab B spec) and module3_tabs_j_l.md (Tab L spec).

Identify shared documents:
  - Marriage certificate (Tab B + Tab L spouse section)
  - Spouse's passport biographical page (Tab B + Tab L)
  - Spouse's birth certificate (Tab B + Tab L)
  - Children's passport biographical pages (Tab B + Tab L)
  - Children's birth certificates (Tab B + Tab L)

For each shared document, add a cross-tab note:
  "This document is required for both your personal binder (Tab B)
  and your dependent section (Tab L).
  One certified copy covers both — do not obtain two separate copies."

Display the note inline on the checklist item, collapsed by default,
expandable with a small info icon.

Use Playwright to screenshot Tab B and Tab L checklists.
Commit: "fix: Tab B / Tab L shared documents flagged with cross-tab note"
```

---

### SESSION S11 — Analysis Engine + Confidence Score Integration
**Priority:** 🟡 HIGH
**Estimated time:** 4–5 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12D
**Prerequisite:** Analysis engine must be built (Session 16 complete)

**What:** Connect the confidence score display to the analysis engine
output. One calculation, two views. Add contradiction detection.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12D.
Read docs/Spec1_Analysis_Engine.md.
Read src/lib/analysis-engine.ts.

Step 1: The confidence score page reads from the analysis engine
  output stored in the DB — not from a separate calculation.
  Remove any independent scoring logic from the confidence score page.
  Map analysis engine dimensions to confidence score display dimensions:
    substantiality_score → Investment Substantiality display
    marginality_score → Non-Marginality display
    funds_score → Source & Path of Funds display
    develop_direct_score → Active Direction display
    executive_role_score → Active Direction (modifier)
    qualifications_score → Investor Qualifications display
    real_operating_score → Real & Operating Enterprise display
    immigrant_intent_risk → Immigrant Intent Risk modifier

Step 2: Add a re-run trigger.
  When new answers are saved (any Module 3 tab update):
  Queue an analysis engine re-run.
  Update the confidence score display when re-run completes.
  Show "Last assessed: [timestamp]" on the score page.

Step 3: Add contradiction detection.
  Before updating a dimension score:
  Compare new score to previous score for same dimension.
  If delta > 15 points in either direction:
    Flag to user: "Your [dimension] assessment has changed
    significantly based on your updated answers. Review the
    flagged items before generating your documents."
  Do not block — inform only.

Commit: "feat: confidence score reads analysis engine — one assessment two views"
```

---

## TIER 4 — MEDIUM: UX IMPROVEMENTS

These improve the experience significantly but do not block any flow.

---

### SESSION S12 — Journey Wizard: Stage-Aware Timeline Shifting
**Priority:** 🟢 MEDIUM
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 3

**What:** Fix the "where are you now" field in the journey wizard so
it actually collapses past milestones from the timeline.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 3 (journey wizard FIX NEEDED note).

Current four stage options and what they should do:

"Just exploring":
  Show full timeline — no milestones removed.

"Business identified":
  Collapse e2go track: remove business discovery phase
  (weeks 1–4 approximately). Timeline starts at business confirmed.
  Adjust gap calculation accordingly.

"LLC / company formed":
  Collapse e2go track: remove business discovery + formation phases
  (weeks 1–6 approximately). Timeline starts at document interview.

"Documents started":
  Collapse e2go track to: generation → review → interview prep →
  application → interview → visa. Show only remaining steps.
  Traditional track shows for comparison but is clearly behind.

For each stage: recalculate milestone dates and gap indicator.
If stage is advanced enough that traditional route is clearly
not competitive: banner reads "You're already ahead of the
traditional route timeline."

Use Playwright to screenshot the wizard at each stage setting.
Commit: "feat: journey wizard stage selector shifts timelines dynamically"
```

---

### SESSION S13 — Landing Page: Comparison Section (Option B)
**Priority:** 🟢 MEDIUM
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 2

**What:** Build the traditional vs. e2go comparison section on
the landing page as a proper Next.js component.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 2 (comparison diagrams — Option B recommended).
Read docs/DESIGN_REFERENCE.html.
Apply ui-ux-pro-max + full-output-enforcement skills.

Step 1: Use Lazyweb MCP to research comparison/before-after
  section patterns on high-converting SaaS landing pages.
Step 2: Use Firecrawl to scrape Deel.com or Stripe Atlas
  for their comparison section design patterns.
Step 3: Use Magic MCP to generate the React component.
  Two parallel vertical columns.
  Left: Traditional route — steps, friction markers, time/cost labels.
  Right: e2go route — same steps compressed, with acceleration labels.
  Summary stats at bottom:
    Traditional: 9–14 months · $12,000–$25,000 in fees
    e2go: 4–6 months · $297–$647
  Use only "immigration consultant" and "traditional route" language.
  Never "attorney" or "lawyer".
  Gold accent on e2go column. Muted on traditional column.

Use Playwright to screenshot localhost:3000 and confirm section.
Commit: "feat: landing page traditional vs e2go comparison section"
```

---

### SESSION S14 — Landing Page: FAQ Section
**Priority:** 🟢 MEDIUM
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 6, component in docs/faq-monochrome.md

**What:** Build the FAQ section on the landing page using the
sourced component. Six approved questions.

**Instructions for Claude Code:**
```
Start session.
Read docs/faq-monochrome.md (sourced component).
Read docs/DESIGN_REFERENCE.html.
Apply ui-ux-pro-max + full-output-enforcement skills.

Use Magic MCP to generate the FAQ component.
Dark only — remove light/dark toggle.
Swap any white accent for #C9A84C.
No rounded corners.

Six questions to implement:
1. "Is this a law firm?"
   "No. e2go prepares documents. What you do with your finished
   package is entirely up to you. If you choose attorney review
   at this stage, it's a 2-hour job, not a 20-hour one."

2. "What if I'm denied?"
   "We test your documents against 15 real denial patterns before
   you ever see them. We can't guarantee an outcome — no one can.
   But we can make sure your preparation isn't the reason."

3. "How is this different from hiring a consultant?"
   "A consultant works on one case at a time. e2go applies the
   same preparation discipline to every case, every time — tested
   against every denial pattern in our knowledge base."

4. "Is my data secure?"
   "We never store your passports, bank statements, or financial
   records. Only your answers. Your documents belong to you."

5. "What countries are eligible?"
   "E-2 is available to citizens of 82 treaty countries.
   Our eligibility quiz confirms your specific country in the
   first question."

6. "How long does it take?"
   "The documents typically take 4–6 weeks from starting your
   application profile. Your overall timeline depends on business
   formation and consulate appointment availability."

Place between testimonials and footer on landing page.
Use Playwright to screenshot localhost:3000 and confirm placement.
Commit: "feat: landing page FAQ section — 6 questions, Obsidian Gold"
```

---

### SESSION S15 — PDF Export + ZIP Download
**Priority:** 🟢 MEDIUM
**Estimated time:** 4–5 hours
**Status:** ⬜ NOT STARTED
**Reference:** BUILD_TRACKER.md next session priorities

**What:** Wire the document generation pipeline output to a
downloadable PDF export and ZIP package.

**Instructions for Claude Code:**
```
Start session.
Read docs/Spec4_Quality_Gate_Pipeline.md.
Read src/app/documents/[applicationId]/page.tsx.
Apply full-output-enforcement skill.

Step 1: Install / confirm neat-pdf is available.
  pip install neat-pdf --break-system-packages (if needed)

Step 2: Build /api/generate/download/[applicationId]
  - Reads all approved documents from DB for this application
  - Converts each to PDF using neat-pdf
  - Assembles into a ZIP file with correct binder tab naming:
    Tab-A-DS160-Reference.pdf
    Tab-D-Cover-Letter.pdf
    Tab-E-Ownership-Structure.pdf
    Tab-F-Investment-Proof.pdf
    Tab-G-Business-Evidence.pdf
    Tab-H-Source-of-Funds.pdf
    Tab-I-Non-Marginality.pdf
    Tab-J-Qualifications.pdf
    Tab-K-Business-Plan.pdf
    Tab-L-Dependents.pdf (if applicable)
    README-Binder-Assembly.txt
  - Returns ZIP as a download

Step 3: Wire Download button on documents review page to this endpoint.
  Show download progress indicator.
  Confirm the pre-download acknowledgment gate (5 checkboxes)
  has been completed before enabling the download button.

Step 4: Strip metadata from all PDFs before ZIP assembly.
  Confirm no AI tool names or author metadata in PDF properties.

Use Playwright to test the download flow on localhost:3000.
Commit: "feat: PDF export and ZIP download — embassy-ready package"
```

---

## TIER 5 — MEDIUM: SPEC UPDATES REQUIRED BEFORE BUILD

These sessions update specifications before Claude Code builds
the corresponding features. Do not build before spec is updated.

---

### SESSION S16 — Simulator Spec Update
**Priority:** 🟢 MEDIUM
**Estimated time:** 1 hour (planning only — no code)
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12G

**What:** Update the interview simulator spec to reflect the
package-context decision. Simulator reads filed package, probes
weak points, evaluates answers against documents.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12G carefully.
Read docs/Spec (simulator spec if exists) or BUILD_TRACKER simulator section.

Create or update docs/INTERVIEW_SIMULATOR_SPEC.md with:
1. Context object: full application answers + analysis engine output
2. Question generation rules: personalised to business type + profile flags
3. Weak point probing: analysis engine flags drive specific questions
4. Answer evaluation: compare live answer to filed documents
5. Post-session coaching: strong / needs work / inconsistency flagged
6. Session structure: 10–12 questions, max 15 minutes
7. Session limit: 2 included, $9.99 per 3-bundle extra

Do NOT build any code in this session.
Output: updated or new INTERVIEW_SIMULATOR_SPEC.md committed.
Commit: "docs: interview simulator spec updated — package context decisions"
```

---

### SESSION S17 — Compliance Calendar Spec Update
**Priority:** 🟢 MEDIUM
**Estimated time:** 1 hour (planning only — no code)
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12H

**What:** Update the compliance calendar spec to reflect the two
anchor date types and the range-vs-specific-date display rules.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12H carefully.
Read E2Pathway_Vol3_Sections_7.7_7.8.md (compliance calendar spec).

Update the calendar spec in place (or create docs/COMPLIANCE_CALENDAR_SPEC.md):
1. Document the two date concepts (working target vs. confirmed interview)
2. Add display rules: ranges when no confirmed date / specific dates when confirmed
3. Add the banner rule: show anchor date source clearly to user
4. Add update propagation rule: changing date anywhere updates everywhere
5. Document which DB fields are used (working_target_date, confirmed_interview_date)

Do NOT build any code in this session.
Commit: "docs: compliance calendar spec — dual anchor date logic documented"
```

---

### SESSION S18 — Renewal Module Spec Update
**Priority:** 🟢 MEDIUM (Phase 2)
**Estimated time:** 1 hour (planning only — no code)
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md 12F

**What:** Update the renewal module spec to enforce the baseline
vs. fresh data rule. Template 6 projected column pre-populates.
Everything else collects fresh.

**Instructions for Claude Code:**
```
Start session.
Read IDEAS.md Section 12F carefully.
Read E2Pathway_Vol3_Sections_7.7_7.8.md (renewal module spec).

Update renewal spec:
1. Add field-by-field table: what pre-populates vs. what collects fresh
2. Template 6 projected column: reads from QI-05, QI-06, QI-02, QI-03
   These are read-only historical values — user cannot edit the projected column
3. All other renewal fields: fresh collection, blank on entry
4. Framing language for each renewal question that has an original baseline:
   Show original value in context. Example:
   "Your original Year 1 revenue projection was $180,000.
   What was your actual Year 1 revenue?"
5. Role question framing: not "same role?" but "describe your current role"
   Show original role as context.

Do NOT build any code in this session.
Commit: "docs: renewal module spec — baseline vs fresh data rules documented"
```

---

## TIER 6 — DEFERRED: PHASE 2 FEATURES

These are confirmed ideas that are not blocking launch.
Do not start until Tier 1–3 is complete and first paying users achieved.

---

### SESSION S19 — Pre-Qualification Wizard
**Priority:** ⚪ DEFERRED — Phase 2
**Reference:** IDEAS.md Section 3

A guided thinking experience before the quiz for users who arrive
knowing nothing. 4–5 branching questions. Sits before the quiz or
as "Am I ready?" page.

Not blocking. First paying users do not need this.
Revisit after Session S12 (journey wizard) is complete and tested.

---

### SESSION S20 — Full Lifecycle Scroll Section (Landing Page)
**Priority:** ⚪ DEFERRED — Phase 2
**Reference:** IDEAS.md Section 3

Scroll-triggered animated section showing the complete arc from
"I want to move to the U.S." to "Renewal complete, Year 5."
Beautiful, not interactive. Requires scroll-trigger animation.

Build after S13 (comparison section) is live and tested.

---

### SESSION S21 — Animated Gradient Border Polish
**Priority:** ⚪ DEFERRED — Polish
**Reference:** IDEAS.md Section 7, docs/animated-gradient-border.md

Apply animated gold gradient border to:
- Pricing page "Most Popular" card
- Landing page main CTA button
- Module 3 active sidebar item

Build after all Tier 1–3 sessions complete.

---

### SESSION S22 — AI Generation Reveal Animation
**Priority:** ⚪ DEFERRED — Polish
**Reference:** IDEAS.md Section 7, docs/ai-generation-reveal.md

Replace the plain scrolling text panel on the generation progress
page with the blur-lift reveal effect. Wire to SSE progress %.
Install: npm install motion

Build after PDF export (S15) is complete.

---

### SESSION S23 — Image Slider on Auth Pages
**Priority:** ⚪ DEFERRED — Polish
**Reference:** IDEAS.md Section 7, docs/image-slider-login.md

U.S.-themed image slider on left side of /login, /signup, /verify.
Build after all functional Tier 1–3 work is complete.

---

### SESSION S24 — Journey Wizard as Post-Quiz Page
**Priority:** ⚪ DEFERRED — after S12 complete
**Reference:** IDEAS.md Section 3

Build the personalised version of the journey wizard as a real
Next.js page between /results and /signup.
Pre-populate from quiz session data.
CTA: "Save your personalised journey — create your account."

Prerequisite: S12 (dynamic stage shifting) must be complete first.

---

## SESSION EXECUTION ORDER — SUMMARY

```
S1  → Quiz UI fixes                          🔴 CRITICAL
S2  → Results page eligibility only          🔴 CRITICAL
S3  → Pricing tier pre-selection             🔴 CRITICAL
S4  → Checklist pre-fill                     🔴 CRITICAL
S5  → Module 3 pre-fill from quiz            🟡 HIGH
S6  → Work history / education dedup         🟡 HIGH
S7  → Business data dedup                    🟡 HIGH
S8  → Security history pre-fill              🟡 HIGH
S9  → Timeline single source of truth        🟡 HIGH
S10 → Tab B / Tab L overlap fix              🟡 HIGH
S11 → Analysis engine + confidence score     🟡 HIGH
S12 → Journey wizard stage shifting          🟢 MEDIUM
S13 → Landing page comparison section        🟢 MEDIUM
S14 → Landing page FAQ section               🟢 MEDIUM
S15 → PDF export + ZIP download              🟢 MEDIUM
S16 → Simulator spec update (docs only)      🟢 MEDIUM
S17 → Compliance calendar spec update        🟢 MEDIUM
S18 → Renewal spec update                    🟢 MEDIUM
S19 → Pre-qualification wizard               ⚪ DEFERRED
S20 → Full lifecycle scroll                  ⚪ DEFERRED
S21 → Animated gradient border               ⚪ DEFERRED
S22 → AI generation reveal animation         ⚪ DEFERRED
S23 → Image slider on auth pages             ⚪ DEFERRED
S24 → Journey wizard as post-quiz page       ⚪ DEFERRED
```

---

*Last updated: June 4, 2026*
*File: ~/E2-go/docs/SESSION_PLAN.md*
*Update this file as sessions complete — mark ✅ COMPLETE with date.*
