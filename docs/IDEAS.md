# e2go.app — Ideas, Strategy & Product Thinking
## Running record of all planning sessions
**Created:** June 4, 2026
**Purpose:** Capture every product idea, marketing concept, UX decision, and
strategic thought from all Claude.ai planning sessions so nothing is lost.
**Read by:** Claude.ai (planning brain) and Claude Code (before relevant build sessions)
**Lives at:** ~/E2-go/docs/IDEAS.md
**Update policy:** Add to this file — never delete. Date every new entry.

---

## HOW TO USE THIS FILE

This is not a build spec. It is a thinking record.
Ideas here range from fully formed to half-baked.
Status tags: [DECIDED] [EXPLORING] [DEFERRED] [REJECTED — reason]

Claude Code: read sections marked [BUILD READY] before relevant sessions.
Claude.ai: read everything before planning sessions to maintain continuity.

---

## SECTION 1 — PRODUCT PHILOSOPHY & POSITIONING

### The core positioning [DECIDED]
e2go is not a form filler. It is not a document template service.
It is the preparation discipline of a senior immigration practitioner,
automated and made accessible at a fraction of the cost.

The product does what an experienced consultant does:
gather everything, analyse the case on its legal merits,
identify every weakness, fill every gap, build a narrative,
and produce documents that tell a coherent story under scrutiny.

### Lawyer positioning — approved framing [DECIDED — LOCKED]
- Never say "don't hire a lawyer"
- Never say "you don't need a lawyer"
- Always say "what you do with your finished package is up to you"
- Approved tagline: "Lawyer-ready documents. Lawyer-optional price."
- Approved comparison: "If you choose attorney review at this stage,
  it's a 2-hour job, not a 20-hour one."
- This framing is legally defensible, ethically honest, commercially powerful.
- Never deviate from this positioning.
- Source: Session planning discussion, June 2026

### "Voice" terminology [DECIDED]
The word "voice" in "voice matching" or "voice profile" causes confusion —
users think it means audio recording.
Approved replacement: "writing style" — "we match your writing style"
or "your personal writing profile."
Apply this correction everywhere in UI copy, marketing, and documentation.
Source: June 4, 2026 planning session

### What the app does NOT do [DECIDED — LOCKED]
The app never stores passports, bank statements, tax returns, or financial records.
Answers only. This is both a legal protection and a marketing advantage:
"We never see your documents" is a trust signal, not a limitation.

---

## SECTION 2 — MARKETING ASSETS CREATED

### Document engine guide [CREATED — June 4, 2026]
A comprehensive written guide explaining every stage of the document
preparation process from first input to embassy binder.
Written in plain language for marketing use.
Key insight: the story is not "we make documents" — it is
"we do what an attorney does, systematically, at scale."

Covers all 16 stages:
- Stage 1: Eligibility quiz
- Stage 2: Document interview (Module 3)
- Stage 3: Writing style sample collection
- Stage 4: Writing style check (AI detection on sample)
- Stage 5: Case analysis (6 calculations)
- Stage 6: Strength and risk assessment (15 denial categories)
- Stage 7: Gap conversation
- Stage 8: Prompt assembly
- Stage 9: Sequential document generation
- Stage 10: Writing style pass (humanization)
- Stage 11: AI detection audit on documents
- Stage 12: Cross-document consistency check
- Stage 13: Quality gate
- Stage 14: Metadata removal
- Stage 15: Applicant review and approval
- Stage 16: Embassy-ready package download

### Feature cards derived from document engine [CREATED — June 4, 2026]
Marketing-ready claims traceable to specific engine stages:
- "Tested against 15 real denial patterns" → Stages 2, 5
- "Your documents read like you wrote them" → Stages 3, 10
- "Every fact cross-checked across all documents" → Stage 12
- "AI detection run before every download" → Stage 11
- "Built on your specific investment numbers, not a template" → Stages 5, 8
- "Gaps identified and filled before generation starts" → Stages 6, 7
- "No legal conclusions — facts only" → Stages 8, 13
- "Consulate-specific page limits enforced" → Stage 13
- "Metadata stripped — documents carry no digital fingerprints" → Stage 14
- "You review and approve every document before downloading" → Stage 15

### Traditional vs. e2go comparison diagrams [CREATED — June 4, 2026]
Three rendered versions for landing page use:

**Option B — Two parallel vertical timelines** [RECOMMENDED for landing page]
Left column: traditional route with friction markers (time cost, manual effort)
Right column: e2go route with outcome markers
Visual weight difference does the emotional work before anyone reads a word.
Summary stats at bottom: 8–15 weeks/$8k–$15k vs. Days/$297+

**Option C — Horizontal swimlane**
Traditional route spans 15 weeks across top.
e2go route spans 10 days below.
Best for showing time compression. Works as secondary section below Option B.

**Option D — Animated reveal**
Step-by-step reveal driven by button click (or scroll on landing page).
Each traditional step appears before its e2go equivalent.
Highest impact but requires scroll-trigger animation in production.

**Recommendation for landing page:**
Lead with Option B as static section.
Option C as compact follow-up below it.
Option D becomes the animated scroll-triggered version when Claude Code builds it.

### Important note on "traditional route" language [DECIDED]
Do NOT use "attorney" or "lawyer" in comparison diagrams.
Use "immigration consultant" or "traditional route" instead.
Reason: legal sensitivity, and many applicants use consultants not attorneys.

---

## SECTION 3 — UX & FLOW IDEAS

### Journey wizard — personalised timeline [CREATED — June 4, 2026]
An interactive component where the user sets their target move date
and current stage. Shows both paths (traditional vs. e2go) with
real milestone dates calculated backwards from the target.

**Emotional centrepiece:** the gap indicator showing how many months
e2go saves vs. traditional for their specific target date.
When target is within 6 months, traditional shows as "not achievable."
e2go shows as "achievable on your timeline."

**Current stage field needs to actually shift timelines** [FIX NEEDED]
The four current stage options (just exploring / business identified /
LLC formed / documents started) should collapse the early milestones
when the user has already passed them. Currently they don't.
Fix: if stage = "business identified," remove weeks 4–14 from e2go track.
If stage = "LLC formed," remove weeks 4–6 as well.
If stage = "documents started," show only generation and review phases.

**Placement decision [DECIDED]:**
Post-quiz, pre-sign-up. Between results page and sign-up page.
Flow: Quiz → Results → Journey Wizard → Sign-up → Dashboard

**Rationale:**
- Post-quiz: we already know nationality, investment tier, business stage,
  risk flags — wizard pre-populates without asking again
- Pre-sign-up: maximum emotional engagement moment
  (they just found out they're eligible)
- The CTA at wizard bottom: "Save your personalised journey — create your account"
- Account creation is the natural next step to preserve what they built

**Secondary use:** simplified generic version on landing page as a teaser.
Visitor sets target date, sees both routes without personalisation.
Drives quiz starts. Then personalised version after quiz drives sign-ups.

### Pre-qualification wizard [EXPLORING — June 4, 2026]
A guided thinking experience for someone who arrives knowing nothing.
Sits before the quiz. Helps them understand their situation first.

Proposed question sequence:
1. Have you decided to move to the U.S.? (yes/thinking about it/just exploring)
2. Do you have investable capital? (rough range — under $100k / $100–$200k / $200k+)
3. Do you have a business in mind? (yes/no/looking)
   → Yes: What kind of business? Is it a franchise?
   → No: Are you open to a franchise?
      → Yes: What industry interests you?
      → No: What kind of business are you thinking about?
4. Are you eligible for E-2? → take the quiz

Purpose: by the time they reach quiz question 1, they understand
why they're being asked about investment amounts and business types.
The quiz becomes a confirmation, not an interrogation.

Status: concept only — not yet designed or built.
Next step: design the branching logic before building.

### Full lifecycle map [EXPLORING — June 4, 2026]
A macro view of the entire journey as a landing page scroll section.
Not interactive — scroll-triggered reveal.
Shows the complete arc from "I want to move to the U.S." to
"Renewal complete, Year 5" with e2go as the guide at every step.

Proposed structure:
- I want to move to the U.S. → Am I eligible?
- I am eligible. Do I have the resources?
- I have a business. How do I set it up?
  (LLC, EIN, bank account, franchise agreement)
- I need to apply. How do I prepare my documents?
  (Document interview → analysis → generation → package)
- I need to prepare for the interview.
  (Simulator → compliance calendar → checklist)
- I have the visa. What comes next?
  (U.S. setup → renewal tracking → compliance)

Status: concept only — not yet designed or built.

### Three-thing architecture for landing page sections [DECIDED]
The landing page needs three distinct visual moments about the journey:

1. **Pre-quiz teaser (landing page):** Generic interactive journey preview.
   Visitor sets target date, sees both routes without personalisation.
   Drives quiz starts.

2. **Journey wizard (post-quiz):** Personalised timeline.
   Pre-populated from quiz data. Drives sign-up.

3. **Full lifecycle scroll (landing page "How it works"):** Static, beautiful.
   Shows the complete arc from decision to renewal.
   Not interactive — emotional, not functional.

---

## SECTION 4 — INTERACTIVE DIAGRAMS CREATED

### 16-stage pipeline diagram [CREATED — June 4, 2026]
Interactive HTML widget showing all 16 stages of the document engine.
Grouped into 4 phases: Intake / Analysis / Generation / Release.
Click any stage to see description and outcome in detail panel.
High-level labels on diagram, detail in the click panel.
Colour-coded by phase.
Status: ready for Claude Code to rebuild as landing page section.

### Full app module map [CREATED — June 4, 2026]
Interactive HTML widget showing all 11 modules.
Three tiers: Free / Paid / Post-approval.
Click any module for description and feature tags.
Status: ready for Claude Code to rebuild as landing page section.

### Complete branching journey diagram [CREATED — June 4, 2026]
Full journey with branching paths:
- Main trunk: Quiz → Business Advisor → Onboarding → Document Interview
  → Readiness Score → Document Engine → Download
- Document engine expands downward into 8 sub-stages
- Specialist referrals branch down at exact trigger points
- Interview prep track branches down from Download node
- Post-interview track (Outcome → Renewal) continues below

Status: concept rendered. Needs refinement before landing page use.
Known issue: Download node carries too much visual weight — all three
branches collapse onto it. Consider splitting on landing page.

---

## SECTION 5 — BUSINESS JOURNEY THINKING

### What the traditional journey actually looks like [DOCUMENTED — June 4, 2026]
Full analysis of the traditional route written out in detail:

Phase 1 — Research (weeks 1–4): 2–4 weeks of confused Googling
Phase 2 — Finding a business (weeks 4–20): 8–16 weeks broker search,
  FDD review, discovery calls, some concepts found E-2 ineligible late
Phase 3 — Business formation (weeks 16–24): LLC, EIN, U.S. bank account,
  franchise fee wire — all requiring separate specialists
Phase 4 — Finding immigration help (weeks 20–28): $500–$1,500 consultation,
  4–6 weeks self-directed document gathering, 3–5 weeks consultant drafting,
  one revision round, no denial risk analysis, no consistency check
Phase 5 — Application submission (weeks 28–36)
Phase 6 — Outcome (weeks 36–52+)

Total realistic timeline: 9–14 months
Total realistic cost in professional fees: $12,000–$25,000
(not counting the investment itself)

### What the e2go journey looks like [DOCUMENTED — June 4, 2026]
Phase 1 — Research (day 1): quiz replaces 2–4 weeks
Phase 2 — Finding a business (weeks 1–6): franchise consultant referral
  briefed on E-2 budget, focused discovery
Phase 3 — Business formation (weeks 4–10): specialist referrals pre-briefed,
  parallel processing where possible
Phase 4 — Application preparation (weeks 8–14): document interview + engine,
  days not weeks, tested against 15 denial patterns
Phase 5 — Interview preparation (weeks 12–16): compliance calendar + simulator
Phase 6 — Outcome and beyond: post-approval referrals, renewal tracking

Total realistic timeline: 4–6 months
Total cost including e2go: $297–$647 plus specialist fees

### Business formation must be part of the journey [DECIDED — June 4, 2026]
The journey wizard and lifecycle map must include business formation steps —
not just immigration steps. A person starting from zero needs:
1. Find a franchise broker (or go direct)
2. Business discovery and selection
3. LLC formation
4. EIN application
5. U.S. business bank account
6. Franchise agreement signing / investment wire
These are prerequisites to the immigration application — they must appear
in the timeline and the e2go path must show how specialist referrals
accelerate each step.

### Franchise partner / specialist referral as a product feature [DECIDED]
The referral engine is not just a revenue stream — it is a genuine
product feature that accelerates the applicant's journey.
The framing should be: "We connect you to the right specialist at
the right moment, already briefed on your situation."
Not: "We refer you to partners."

Referral trigger points (confirmed):
- Quiz: attorney flag → immigration specialist
- Business Advisor: no business selected → franchise consultant
- Document Interview: no U.S. bank account → cross-border banking specialist
- Document Interview: RRSP/property sale → cross-border accountant
- Document Interview: LLC not formed → LLC formation specialist
- Post-download: banking, insurance, payroll → U.S. setup specialists
- Post-approval: Year 4 → renewal specialist

---

## SECTION 6 — CONTENT & COPY IDEAS

### "The Preparation Paralysis" [CREATED — documented in CLAUDE_CONTEXT.md]
Content piece about people who have everything ready but can't start.
Use for: Day 14 re-engagement email, /learn section, Newsletter Issue 3.

### FAQ section for landing page [PLANNED — June 4, 2026]
Component sourced (faq-monochrome.md in docs/).
Questions to answer:
- "Is this a law firm?" → No. We prepare documents. What you do with them is up to you.
- "What if I'm denied?" → We address denial patterns before generating. No guarantee, but preparation matters.
- "How is this different from hiring a consultant?" → [use approved lawyer framing]
- "Is my data secure?" → We never store your documents. Answers only.
- "What countries are eligible?" → 82 treaty countries.
- "How long does it take?" → 4–6 weeks for the documents. Timeline depends on your business formation.
Dark theme only — remove light/dark toggle. Swap white accent for #C9A84C.

### Substantiality score explanation [DOCUMENTED — June 4, 2026]
Written explanation of how the substantiality score works.
Two tests: (1) investment as % of total business cost,
(2) investment as % of net worth (Walsh & Pollard standard).
Modifiers applied: +2 if over $150k, +1 if fully deployed,
-3 if under $75k, -2 if funds in escrow.
Round numbers ($100,000 exactly) invite officer suspicion — real investments
are never perfectly round. Engine notes this.

---

## SECTION 7 — COMPONENT BACKLOG

Components sourced, code saved in docs/, not yet built into app.

| Component | File | Where | When |
|---|---|---|---|
| Animated gradient border | docs/animated-gradient-border.md | Pricing Most Popular card, Landing CTA, Module 3 active sidebar | Polish session |
| Image slider login | docs/image-slider-login.md | /verify, /login, /signup | Session 15B done — revisit for polish |
| FAQ monochrome | docs/faq-monochrome.md | Landing page FAQ section | Polish session |
| AI generation reveal | docs/ai-generation-reveal.md | /generate/[applicationId] progress page | Session 16 — wire to SSE progress % |

### AI generation reveal — implementation note
The blur-lift reveal effect should replace the plain scrolling text panel
in the document generation progress page.
Wire the `progress` prop to the SSE percentage from the generation pipeline.
Each document reveals with the blur-lift as it completes.
Install dependency: `npm install motion`

### Animated gradient border — implementation note
Colors: primary #8B6914, secondary #C9A84C, accent #E8D5A3
backgroundColor: #0a0a0a
borderRadius: 0 (no rounded corners — design system rule)
borderWidth: 1
Speeds: pricing card = 10, CTA button = 6, sidebar active = 12
CSS: add @keyframes gradient-rotate and @property --gradient-angle to globals.css

---

## SECTION 8 — DESIGN DECISIONS

### Comparison diagram language [DECIDED — June 4, 2026]
Never use "attorney" or "lawyer" in comparison diagrams or marketing copy.
Use "traditional route" or "immigration consultant" instead.

### "Where are you now" field — must shift timelines [FIX NEEDED]
In the journey wizard, the current stage selector must collapse
completed milestones from the timeline dynamically.
Stage logic:
- Just exploring: full timeline shown
- Business identified: business discovery phase collapsed (~10 weeks removed)
- LLC / company formed: formation phase also collapsed (~4 more weeks removed)
- Documents started: only generation, review, interview prep shown

### Journey wizard — three distinct use cases [DECIDED — June 4, 2026]
1. Landing page generic preview: no personalisation, drives quiz starts
2. Post-quiz personalised wizard: pre-populated from quiz data, drives sign-ups
3. Dashboard live tracker: shows current position in journey, post sign-up

These are three separate components with different data sources,
not one component used in three places.

---

## SECTION 9 — ARCHITECTURE THOUGHTS

### Document engine = most important section of the app [CONFIRMED]
The 16-stage document preparation pipeline is what differentiates e2go
from every other immigration tool. It must be:
- Explained clearly to users (the engine guide does this)
- Shown as a pipeline on the landing page (the interactive diagram)
- Referenced in every marketing comparison (the traditional vs. e2go section)
The engine is not a feature — it is the product.

### Three things that must be true to sell this product [CONFIRMED]
1. The person understands they're eligible (quiz)
2. The person believes the documents will be good (engine explanation)
3. The person feels the journey is achievable in their timeframe (wizard)
All three must be addressed before asking for payment.

### Pre-qualification wizard placement logic [EXPLORING]
If built, the pre-qualification wizard should live:
- Either as the entry point to the quiz (replaces the landing page CTA)
- Or as a separate "Am I ready?" page linked from the nav
It should not replace the quiz — it frames it.
The quiz is still the eligibility gate. The pre-qual wizard is the
thinking guide that helps the person arrive at the quiz prepared.

---

## SECTION 10 — OPEN QUESTIONS & NEXT THINKING

These are unresolved questions that need decisions before building.

1. **Pre-qualification wizard: build or defer?**
   It adds value but it is a significant UX investment.
   Could be Phase 2 after first paying users are achieved.
   Decision needed: does the current quiz + results + journey wizard
   provide enough guidance for early users?

2. **Full lifecycle scroll section: what goes on landing page?**
   We have three candidate sections for "How it works":
   - The 16-stage pipeline diagram
   - The comparison (Option B)
   - The full lifecycle scroll
   Likely all three are too much for one page. Which is the anchor section?
   Recommendation: comparison diagram is the anchor (emotional contrast),
   pipeline diagram is the detail (trust builder), lifecycle scroll is deferred.

3. **Journey wizard: how many milestones to show?**
   Currently 12 traditional / 12 e2go milestones.
   On mobile this is very long. Consider collapsing to 6–7 key milestones
   with expandable detail. Especially important since this sits on the
   results page which is a mobile-heavy moment (people take the quiz on phone).

4. **Franchise partner programme: when to formalise?**
   The referral engine design is complete. The partner agreements are not.
   Before launch: at minimum, one franchise broker willing to receive
   pre-qualified E-2 investor referrals. The referral feature is only
   as good as the partners behind it.

5. **"Writing style" vs. other terminology:**
   "Writing style matching" is approved. But the UI currently may still
   say "voice profile" in places. Audit all UI copy before launch.

---

*Last updated: June 4, 2026*
*Next update: add to this file after every planning session*
*Do not delete any entry — use [REJECTED] or [DEFERRED] tags instead*
*File path: ~/E2-go/docs/IDEAS.md*

---

## SECTION 11 — DATA REUSE PRINCIPLE (LOCKED — June 4, 2026)

### The golden rule
Ask for information exactly once. Use it everywhere it is needed.
Never ask the same information again in a different form or a different tab.
This platform should not be an irritation. Once an answer is given,
it is remembered and used. The applicant never repeats themselves.

### How it works in practice
Every answer saved anywhere in the app is available to every other
part of the app. The data layer is one pool. Questions do not belong
to tabs — they belong to the applicant's record.

### Confirmed duplications found — June 4, 2026 audit

| Data point | Asked in quiz | Asked again in | Status |
|---|---|---|---|
| Nationality/citizenship | Q0-01 | Tab A QA-05, QA-06 | MUST pre-fill — never re-ask |
| Investment amount | Q0-05 (approx.) | Tab F QF-02 (exact) | Pre-fill + allow precision update only |
| Fund documentation ability | Q0-06 | Tab H (implied) | Seed Tab H context — do not re-ask |
| Loan flag | Q0-07 | Tab F QF-05 | Pre-select loan option if quiz flagged yes |
| Prior visa refusals | Q0-11 (implied) | Tab A QA-23 | Pre-fill — expand only if yes |
| Family composition | Q0-16 | Tab L (full detail) | Show only relevant questions — skip others |
| Account email | Signup | Tab A QA-08 | Always pre-filled from auth — never re-ask |
| Current location (country) | Q0-03 | Tab A QA-09 (address) | Different granularity — acceptable |
| Business role | Q0-08 | Tab J (qualifications) | Different question — acceptable |

### Pre-fill rules — mandatory
These fields collected in Module 0 MUST be pre-filled in Module 3.
Never ask again. Show the value and allow edit only if material change:

| Quiz field | Pre-fills into |
|---|---|
| Q0-01 nationality | Tab A QA-05 country of citizenship; Tab A QA-06 dual citizenship; all document generation nationality fields |
| Q0-05 investment amount | Tab F QF-02 — show as "from your eligibility check: $X — confirm or update" |
| Q0-07 loan flag | Tab F QF-05 — pre-select loan option if quiz answer was yes |
| Q0-11 prior refusals | Tab A QA-23 — pre-filled, expand for detail only if yes |
| Q0-16 family composition | Tab L — show spouse questions only if spouse flagged; show child questions only if children flagged; skip entire tab if no dependents |
| Account email | Tab A QA-08 — always pre-filled from Supabase auth, never shown as blank field |
| Account creation date | application_lifecycle.account_created_at — never asked |

### Confirmation rule
There is one acceptable reason to show a pre-filled answer again:
when the quiz answer was approximate and a legal document needs precision.
Example: quiz asks "approximately how much do you expect to invest" —
Tab F needs the exact amount committed to date.

In this case: show the pre-filled value, label it clearly as
"from your eligibility check," and ask only "confirm or update."

Never show a blank field where the answer is already known.
Never ask the same question with different wording.
Never ask in Module 3 what was already answered in Module 0.

### Document generation rule
The generation engine reads from the answers table — one record per
question per applicant. It never asks the same thing twice.
If the same data point appears in two documents, it is read from the
database once and inserted in both. The user supplies it once, ever.

### Implementation rule for Claude Code
Before adding any question to any tab or module:
1. Search the answers table — does this data point already exist?
2. If yes: pre-fill it. Do not ask again.
3. If the tab needs a more specific version: show existing value,
   ask only for the refinement ("Your quiz answer was X — is this
   still accurate, or has this changed?")
4. If it is genuinely new information not collected anywhere: add it
   once, to the correct tab, and it is available everywhere else.

This rule applies to every module, every tab, every question,
every document generation prompt. No exceptions.

---

## SECTION 12 — DUPLICATION AUDIT & RESOLUTION (DECIDED — June 4, 2026)

Full audit conducted across all questions and all app surfaces.
26 question duplications found. 9 non-question duplications found.
All decisions made and locked below.

---

### 12A — Pre-Application Checklist [DECIDED — BUILD READY]

**Finding:** The /apply/checklist page shows a generic three-phase static list.
All data to personalise it already exists from quiz answers:
- Q0-09 (solo vs. partnership) → whether partner documents are needed
- Q0-16 (family composition) → whether spouse/children documents needed
- Q0-17 (married) → whether marriage certificate needed
- Q0-03 (Canada vs. U.S.) → consular vs. Change of Status path

**Decision:** Pre-fill the checklist from quiz session data from the moment
the user first sees it. Do not wait for Module 3.

**UX rule:** Where a checklist item is pre-populated from prior answers,
show a brief warm note:
"Based on what you've already told us, we know you are married —
so your marriage certificate is on this list."
Keep the note brief. The user can remove or flag anything that has changed.

**Goal:** Reduce friction. The checklist should feel like it was built
for this specific person, not handed to a stranger.

---

### 12B — Pricing Tier Pre-Selection [DECIDED — BUILD READY]

**Finding:** Pricing page shows all seven tiers and asks the user to choose.
Quiz Q0-09 (solo/partnership) and Q0-16 (family composition) already
determine the correct tier before the pricing page is reached.

**Decision:** Arrive at pricing page with the correct tier pre-selected
and highlighted. Show a brief explanation:
"Based on your application — solo applicant with spouse —
your plan is Solo + Spouse at $347."
User can change the selection if their situation has changed,
but they should never have to figure it out from scratch.

**Implementation:** Read quiz_session data on pricing page load.
Map (application_type + family_composition) → pricing tier.
Pre-select and scroll to that tier. All other tiers remain visible.

---

### 12C — Single Source of Truth for Timeline Data [DECIDED]

**Finding:** Dashboard milestone tracker, compliance calendar, and journey
wizard all display timeline data. Risk of three separate data states
for the same underlying information.

**Decision:** All three surfaces read from one single record in the database.
One anchor date. One milestone record. One status per milestone.
Any update in any surface (dashboard, calendar, wizard) writes back
to the same record and is immediately reflected everywhere.

**Implementation note:** The journey wizard (pre-sign-up) writes the
working target date to the quiz session. On account creation this is
transferred to the application record. The compliance calendar and
dashboard both read from the application record — never from their own state.

---

### 12D — Analysis Engine + Confidence Score: One Continuous Assessment [DECIDED]

**Finding:** The Analysis Engine (Spec 1) runs before document generation
and calculates case strength internally. The Application Confidence Score
(Module 4) displays a strength assessment to the user across 8 dimensions.
Both calculate overlapping things independently from the same inputs.

**Decision:** These are not two separate systems. They are two layers of
one continuous assessment.

**How it works:**
1. Analysis engine runs first. Produces the internal Case Brief.
2. Confidence score reads the analysis engine output directly —
   it does not recalculate what the engine has already calculated.
3. As new data is collected after the initial analysis (follow-up
   conversation, Tab updates, answer revisions), the assessment
   updates — both the internal Case Brief and the user-facing score.
4. If new data is consistent with the prior analysis: harmony, no issue.
5. If new data adds to the picture (more detail, not contradiction):
   the score reflects the fuller picture automatically.
6. If new data contradicts an earlier analysis result: the app flags
   the contradiction to the user and asks for clarification before
   the score is updated.

**Rule:** One assessment. One data pool. Two views of it —
internal (Case Brief) and user-facing (Confidence Score dashboard).

---

### 12E — Tab B and Tab L Checklist Overlap [DECIDED — BUILD READY]

**Finding:** Marriage certificate, spouse's passport, children's passports,
and children's birth certificates all appear on both Tab B checklist
(personal documents) and Tab L checklist (dependent documents).
User would be told to gather the same document twice with no explanation.

**Decision:** When a document serves both tabs, flag it once.
Show a note: "This document covers both your personal binder (Tab B)
and your dependent section (Tab L). One certified copy is sufficient."
Never instruct the user to gather the same document twice without
explaining that it is the same physical document.

---

### 12F — Renewal Module: Old Data as Baseline, Not Current Facts [DECIDED]

**Finding:** Renewal module risk of treating original application data
as current facts rather than historical baseline.

**Decision — two clear rules:**

Rule 1 — What pre-populates automatically:
The "projected" column in Template 6 (Actual vs. Projected Performance)
is pre-populated from the original Tab I answers (QI-05, QI-06 revenue
projections; QI-02, QI-03 hiring plan). The user never re-enters
what they originally projected. That data is fixed historical record.

Rule 2 — What is collected fresh:
Everything else at renewal is new data. Current revenue, current
employees, current role, current address, current passport, current
business plan. The original application answers are reference and
comparison only — they are not assumed to still be true.

**Framing for user:** "Here is what you projected in your original
application. Tell us what actually happened." The original data is
presented as the left column. The user fills the right column.
This is the only correct use of original data at renewal.

---

### 12G — Interview Simulator: Pressure-Test the Filed Package [DECIDED]

**Finding:** Simulator spec was ambiguous about whether it uses the
user's application answers as its baseline or treats questions as blank slate.

**Decision:** The simulator knows exactly what is in the submitted package.
That is its complete context. It does not re-collect data.

**How the simulator uses the package:**
1. The simulator reads the full application context — every answer,
   every document, every flag from the analysis engine.
2. It asks questions a Toronto consular officer would ask for this
   specific business type and this specific applicant profile.
3. Where the analysis engine has identified weak points or gaps,
   the simulator specifically probes those areas — giving the applicant
   experience of what real officer scrutiny of a weak point feels like.
4. After each simulated question, the simulator evaluates the live
   answer against what is in the filed documents:
   - Consistent and strong: positive feedback
   - Weaker than what is filed: coaching on how to align the answer
     with the documented evidence
   - Inconsistent with what is filed: red flag — the applicant needs
     to know this inconsistency before the real interview
5. After the session: a coaching summary showing which answers were
   strong, which need work, and specifically how to close identified gaps.

**The goal:** Walk into the Toronto consulate having already experienced
the worst questions an officer could ask about this specific case,
and having rehearsed strong, consistent, document-backed answers.

---

### 12H — Journey Wizard vs. Compliance Calendar: Different Anchor Logic [DECIDED]

**Finding:** Both surfaces use a "target date" but they serve different
purposes and the anchor logic must be different.

**Decision — two distinct date concepts:**

The WORKING TARGET DATE (journey wizard):
- Set by the user when they first explore the app
- A planning hypothesis — "I want to move by approximately this date"
- Used by the journey wizard to show a motivational timeline
- Stored in the quiz session / application record
- NOT used as a hard anchor for compliance deadlines
- Can be updated at any time with no downstream consequences

The CONFIRMED INTERVIEW DATE (compliance calendar):
- Set when the user actually schedules their consulate appointment
- Typically known 4–8 weeks before the interview
- This is the real anchor for all compliance deadlines
- Until this date is entered, the compliance calendar shows
  estimated ranges — never specific deadline dates
- When entered, all calendar items recalculate to specific dates

**UX rule:** The compliance calendar must never show specific deadline
dates (e.g. "Submit DS-160 by August 3") until the confirmed interview
date has been entered. Before that, it shows ranges:
"DS-160 — approximately 2–4 weeks before your interview."
This prevents applicants from missing real deadlines because they
were calculated against a hypothetical date.

---

### 12I — Results Page vs. Confidence Score: Eligibility vs. Strength [DECIDED]

**Finding:** Risk of results page showing strength signals that later
contradict the full confidence score assessment.

**Decision — strict separation of what each surface shows:**

Results page (post-quiz):
- Shows ELIGIBILITY signals only
- Proceed / Proceed with Risk / Attorney Recommended / Do Not Proceed
- May show which specific flags triggered a risk rating
- Does NOT show strength scores, dimension assessments, or percentages
- Does NOT say "your investment looks strong" or similar
- Defers all strength language to Module 4

Confidence Score (Module 4, post-Module 3):
- Shows the full 8-dimension strength assessment
- Built on all data collected — quiz + Module 2 + Module 3 + follow-up
- This is the only place in the app where strength language appears
- Explicitly labelled: "This reflects the completeness of your
  preparation — not a legal determination of eligibility"

**The principle:** The results page opens the door.
The confidence score tells you how prepared you are to walk through it.
These are different questions. They must not be confused.

---

### 12 — Implementation Priority for Claude Code [BUILD READY]

When these items are built, implement in this order:

1. Pricing tier pre-selection (12B) — simplest, highest user impact
2. Pre-application checklist pre-fill (12A) — requires quiz session read
3. Tab B / Tab L overlap flag (12E) — requires checklist generation update
4. Results page — remove all strength language (12I) — requires copy audit
5. Single source of truth for timeline data (12C) — requires DB schema review
6. Analysis engine + confidence score integration (12D) — requires Spec 1 update
7. Compliance calendar anchor date logic (12H) — requires calendar spec update
8. Simulator package context (12G) — requires simulator spec update
9. Renewal baseline vs. fresh data (12F) — requires renewal spec update

Each item should be a separate commit.
Each item should be verified with Playwright before marking complete.


---

## SECTION 13 — DATA RETENTION POLICY (DECIDED IN PRINCIPLE — REVISIT BEFORE LAUNCH)

**Date:** June 4, 2026
**Status:** [DECIDED IN PRINCIPLE] — copy changes and code changes needed before launch
**Do not build compliance calendar, renewal module, or deletion flows until this section is finalised**

---

### 13A — The Core Principle

Data minimisation. Hold only what is needed for the stated purpose,
for only as long as it is needed. Delete everything else.
This is legally cleaner, commercially more honest, and a genuine
trust differentiator in the immigration space.

"We delete your sensitive application data after your journey is
complete" is a stronger trust signal than silent indefinite retention.

---

### 13B — Two Separate Retention Clocks

There are two distinct situations that trigger the deletion sequence.
They are different emotional contexts and must be handled differently.

CLOCK 1 — INACTIVITY (during active application):
Triggered when: user has not logged in or made any progress
for 90 consecutive days at any point during the application.
This is a gentle nudge. The user may have paused their plans.
Tone: warm re-engagement. "Your application is waiting for you."
Sequence:
  Day 60 of inactivity: first re-engagement email
  Day 67: second email
  Day 74: third email
  Day 81: fourth email — "Your data will be deleted in 9 days"
  Day 90: data deleted
If user logs in at any point: clock resets to zero.
Clock 1 applies only while the application is in progress
— not after the outcome is confirmed.

CLOCK 2 — POST-OUTCOME (after visa approved or refused):
Triggered when: user records their outcome in the app
(approved or refused — both trigger the same clock).
This is a handoff moment. The journey is complete.
Tone: completion framing. "You've completed your journey.
Here is your record to keep."
Sequence:
  Outcome confirmed: immediate download prompt shown in app
  Day 60 after outcome: first email — "Download your record"
  Day 75: second email — "Your data will be deleted in 15 days"
  Day 83: third email — "Your data will be deleted in 7 days"
  Day 90: application data deleted permanently
Clock 2 applies regardless of whether the user downloaded.
The deletion happens at day 90 whether or not they acted.

---

### 13C — What Is Deleted at Day 90

All Module 3 answers (every tab, every question).
All generated documents.
All analysis engine output and case briefs.
All confidence score history.
All follow-up conversation responses.
All writing style profile data.
All uploaded file references.
Quiz session answers (beyond the minimal fields below).

---

### 13D — What Is NOT Deleted

These are retained beyond 90 days with explicit purpose:

Compliance calendar subscribers (opt-in, $29/year):
  Email address
  Visa issue date
  Visa expiry date
  Business name
  U.S. state of operation
  Number of dependents and their ages (for age-out alerts)
  FBAR flag (U.S. bank account over $10,000 — yes/no)
  Nothing else. These eight fields only.

Renewal baseline (retained until renewal module completed):
  Original revenue projections from Tab I (QI-05, QI-06)
  Original hiring plan from Tab I (QI-02, QI-03)
  These are a handful of numbers. Not sensitive personal data.
  Deleted when renewal module is completed or user requests deletion.

Account record:
  Email address, account creation date, payment history.
  Retained per standard financial/legal requirements.
  Not application data — account administration only.

---

### 13E — The Re-Upload Feature (Critical — Build Before Renewal Module)

When a returning user starts a new application after:
  - A previous refusal
  - A gap of any length
  - A renewal cycle

The app must accept their downloaded application export file
as an upload and use it to pre-populate the new application.

The export file (downloaded before deletion) must contain:
  Every answer given across all Module 3 tabs
  Every document generated (as text, not PDF)
  Original projections from Tab I
  Quiz session answers
  Application type, family composition, business details

On upload:
  App recognises the e2go export format (JSON structure)
  Pre-populates every field it can from the previous application
  Marks each pre-filled field with "From your previous application"
  badge — same PreFilledField component pattern as S5
  User reviews and confirms pre-filled data
  User updates whatever has changed
  New application proceeds from there

This feature makes a second application dramatically faster.
It also makes the deletion policy commercially viable —
the user is not losing their data forever, they are taking
custody of it. The app can restore it when they return.

For renewal specifically:
  Upload pre-populates the projected column in Template 6
  (the only renewal field that uses original data as baseline)
  All other renewal fields collect fresh as per IDEAS.md 12F

---

### 13F — Copy Changes Required Before Launch

These locations in the app contain promises or language that
conflicts with the data retention policy. All must be updated
before launch. Do not change any of these until the full policy
is finalised and locked.

| Location | Current language | Must change to |
|---|---|---|
| Privacy policy Section 3.4 | "5 years from last active session" | "90 days after outcome confirmed. Minimal calendar data retained for subscribers." |
| Renewal module entry screen | "$97 — your original data is pre-loaded" | "$97 — upload your application export to restore your data" |
| Session resume UX | "Welcome back. You left off at Tab F..." | Add: "Your progress is saved while your application is active." |
| Module 1 consent screen | No retention disclosure | Add: "Application data is retained until 90 days after your outcome is confirmed, then permanently deleted. Download your record at any time." |
| Post-outcome screen | No deletion disclosure | Add download prompt and explain 90-day window |
| Re-engagement emails | "Your saved application expires in 7 days" | Rewrite for Clock 1 vs Clock 2 contexts |

---

### 13G — New Emails Required

Two new email sequences needed — not yet written anywhere:

CLOCK 1 SEQUENCE (inactivity re-engagement):
Tone: warm, curious, no pressure in early emails, urgency only at day 81+
Day 60: "We noticed you haven't been back in a while. Your application is
         still waiting — pick up exactly where you left off."
Day 67: "Three things have changed in E-2 processing times since you
         were last here. Your application is still saved."
Day 74: "Your application is still here. But we wanted you to know —
         if you don't log in within 16 days, your data will be deleted."
Day 81: "Final notice — your application data will be deleted in 9 days.
         Log in now to continue, or download your data to keep a copy."

CLOCK 2 SEQUENCE (post-outcome handoff):
Tone: completion, pride, practical — not alarming
Immediate: "Congratulations / We're sorry to hear about your outcome.
            Your complete application record is ready to download.
            Keep it — it belongs to you."
Day 60: "A reminder — your application data will be deleted in 30 days.
         Download your record before then."
Day 75: "15 days until your application data is permanently deleted.
         Download your record to keep a copy and make any future
         reapplication significantly faster."
Day 83: "7 days remaining. After this, your data cannot be recovered."

---

### 13H — Open Questions (Revisit Before Building)

1. What exactly does the e2go export file look like?
   JSON structure needs to be defined before the re-upload feature
   is built. This drives both the export format (S15) and the
   re-upload parser.

2. Does the 90-day inactivity clock apply to unpaid users too?
   Someone who took the quiz and created an account but never paid —
   do we delete their quiz session data after 90 days of inactivity?
   Recommendation: yes, with a shorter sequence (30-day warning only).

3. What happens if the outcome is never recorded?
   Some users will never log back in to record their outcome.
   Do we apply the inactivity clock in that case?
   Recommendation: yes — inactivity clock applies regardless of
   whether an outcome was recorded.

4. CASL compliance for the deletion warning emails.
   These are transactional emails about the user's account — not
   marketing. They do not require separate opt-in consent under CASL.
   Confirm this with legal review before launch.

5. The $97 vs $147 renewal pricing.
   The price differential was justified by "data pre-loaded."
   Under the new policy it is justified by "export file accepted."
   The commercial logic still holds — existing users have their
   export file, new users have to enter everything from scratch.
   But the language everywhere must reflect upload, not silent retention.

---

*Status: DECIDED IN PRINCIPLE. Do not build deletion flows, re-upload
feature, or update any copy until all open questions in 13H are resolved
and this section is marked [LOCKED].*

*Revisit: before building compliance calendar, renewal module, or S15 PDF export.*

---

## SECTION 14 — TESTING AND SECURITY PLAN (DECIDED — June 5, 2026)

**Status:** [PLANNED — do after core features complete, before first real payment]
**Source:** saas_b2c_testing_report.md cross-referenced against built features
**Do not start these sessions until:** Admin dashboard built, domain on Vercel, all agents complete

---

### 14A — Current Testing Score: 5/10

The app is functionally ready but security and compliance
testing is largely undone. The three sessions below bring
it to 8/10 — sufficient for launch. The remaining 2/10
(penetration testing, load testing, accessibility audit)
can be done post-launch in month one.

---

### 14B — What Is Already Done

Authentication and authorization:
  ✅ Supabase auth — login, signup, forgot password, verify
  ✅ Rate limiting — login (5 attempts/15min), quiz (3/hr), AI API (50/day)
  ✅ RLS policies on all tables scoped by user_id
  ✅ Auth middleware protecting /dashboard, /apply/*, /score, /simulator

Data protection:
  ✅ Vercel enforces HTTPS
  ✅ Supabase encrypts at rest
  ✅ API keys in environment variables only — never in code
  ✅ Answers only stored — no raw documents, passports, or financial records
  ✅ PDF metadata stripping (built — not yet independently verified)

Compliance:
  ✅ CASL opt-in checkbox on quiz
  ✅ Cookie consent banner
  ✅ Privacy policy with correct data retention language
  ✅ Terms of service
  ✅ Module 1 consent screen — 5 referral categories
  ✅ HST collection via Stripe Tax

Security headers:
  ✅ Content-Security-Policy
  ✅ X-Frame-Options: DENY
  ✅ X-Content-Type-Options: nosniff
  ✅ Referrer-Policy
  ✅ Permissions-Policy

Dev bypass safety:
  ✅ SKIP_PAYMENT_WALL exists in .env.local
  ⚠️ No CI check confirming it is never set on Vercel production

---

### 14C — What Is Missing (pre-launch blockers)

Critical — must fix before first real payment:

1. No IDOR test — User A accessing User B's application not tested
2. No payment bypass test — Module 3 accessible without payment not tested
3. No privilege escalation test — non-admin reaching admin endpoints not tested
4. No end-to-end automated test — quiz → signup → payment → Module 3 → download
5. No prompt injection test — crafted answers manipulating generation not tested
6. No PDF metadata verification — stripping not independently confirmed
7. No SKIP_PAYMENT_WALL production check — dev flag could leak to Vercel
8. No CI/CD pipeline — no automated security gates on push
9. No session timeout — 24hr inactivity force-logout not built
10. No concurrent session detection — multiple device login not detected

Important — fix before scaling:

11. No MFA — account takeover risk for high-value immigration data
12. No SSRF test on Stripe webhook endpoint
13. No formal PIPEDA deletion workflow test
14. No cookie consent opt-out verification test
15. No Stripe webhook signature verification test
16. No load or stress testing on document generation pipeline
17. No accessibility audit — WCAG 2.1 AA not verified
18. No Core Web Vitals measurement

---

### 14D — Three Testing Sessions

These run after admin dashboard is built and domain is on Vercel.
Run in this order. Do not skip or reorder.

SESSION T1 — CI/CD Security Gates
Priority: 🔴 CRITICAL
Time: 3–4 hours
What gets built:
- GitHub Actions workflow on every push to dev:
  - CodeQL or Semgrep SAST scan
  - GitLeaks secret scanning
  - npm audit — fail build on high severity vulnerabilities
  - Confirm SKIP_PAYMENT_WALL not set in Vercel production env
  - OWASP ZAP scan against staging URL
- Pre-push hook enforcing clean build before any push
- Dependency update monitoring (Dependabot or equivalent)

SESSION T2 — Auth, Authorization, and Business Logic Hardening
Priority: 🔴 CRITICAL
Time: 4–5 hours
What gets built and tested:
- Session timeout — force logout after 24hr inactivity
- Concurrent session detection — alert on 2+ active sessions
- IDOR test suite:
  Create two test users. Confirm User A cannot read, write,
  or delete User B's application, answers, documents, or payments.
- Privilege escalation test:
  Confirm non-admin user cannot reach /admin/* routes.
  Confirm non-admin cannot call admin-only API endpoints.
- Payment bypass test:
  Confirm /apply/module3 and all downstream routes return 403
  if payment_status != 'paid' and SKIP_PAYMENT_WALL is false.
- Prompt injection test:
  Submit crafted Module 3 answers containing prompt injection
  attempts. Confirm generation output is not manipulated.
  Confirm legal disclaimer text cannot be removed by injection.
- PDF metadata verification:
  Generate a test document. Extract PDF metadata.
  Confirm Author, Creator, Producer are all blank.
  Confirm no AI tool names in any metadata field.
- SKIP_PAYMENT_WALL production guard:
  Add a startup check that throws an error if
  SKIP_PAYMENT_WALL=true in a non-development environment.

SESSION T3 — E2E Critical Path and Compliance Verification
Priority: 🟡 HIGH
Time: 4–5 hours
What gets built and tested:
- Fix quiz nationality selector for Playwright automation
- Complete automated E2E test:
  Quiz → Results → Pricing → Payment (test card) →
  Success → Module 1 → Module 2 → Module 3 Tab A →
  Generation → Document review → ZIP download
  All steps must pass automatically on every CI run.
- PIPEDA opt-out test:
  User unchecks CASL on quiz. Confirm they receive no
  marketing emails. Confirm opt-out is logged correctly.
- Data deletion test:
  User requests account deletion. Confirm all answers,
  documents, and personal data removed within 30 seconds.
  Confirm email address retained only in email_log
  for legal records if required.
- Cookie consent test:
  Reject cookies. Confirm no analytics events fire.
  Accept cookies. Confirm analytics events fire.
- Stripe webhook signature test:
  Send a webhook request without a valid whsec_ signature.
  Confirm the endpoint returns 400 and does not process.
  Send a valid signed request. Confirm it processes correctly.

---

### 14E — Post-Launch Testing (month one)

These are important but not launch blockers.
Schedule them within 30 days of first paying user.

- External penetration test — hire a specialist, not an automated tool
- Load and stress testing — document generation pipeline under 50 concurrent users
- Accessibility audit — WCAG 2.1 AA with a screen reader
- Core Web Vitals baseline — Lighthouse CI, target LCP < 2.5s
- Business logic abuse testing — attempt to manipulate founding member counter,
  bypass session limits, exploit referral engine
- RBAC formal review — confirm admin role cannot be self-assigned
- Incident response drill — simulate a data breach, test notification workflow

---

### 14F — e2go-Specific Risks Not in the Generic Report

These are unique to what e2go does and must be in the test plan:

1. Prompt injection in document generation
   A user could craft Module 3 answers to inject instructions
   into the Anthropic prompt. Could produce documents without
   legal disclaimers or with fabricated legal conclusions.
   Test: submit known injection payloads, verify output is clean.

2. Payment wall bypass via SKIP_PAYMENT_WALL
   If the dev bypass flag is ever set on Vercel, all users
   get free access to the entire paid product.
   Test: CI check confirming flag is absent in production.
   Runtime check: throw error if flag set outside development.

3. Document metadata leakage
   PDF export strips metadata. If stripping fails, documents
   could contain AI tool names, author fields, or timestamps
   that a consular officer could detect.
   Test: verify every exported PDF has clean metadata.

4. Cross-application answer contamination
   If RLS is misconfigured, a user's follow-up conversation
   or analysis engine results could reference another user's
   answers. This would be both a privacy violation and a
   document quality disaster.
   Test: IDOR test specifically on answers, case_briefs,
   and followup_responses tables.

5. Stripe webhook replay attack
   A malicious actor could replay a previously valid webhook
   event to trigger duplicate payment processing.
   Test: Stripe's timestamp-based replay prevention is built in,
   but confirm the webhook handler checks event timestamps
   and rejects events older than 5 minutes.

---

*Status: PLANNED — do not start until admin dashboard built and domain on Vercel*
*Sessions: T1 → T2 → T3 in order. Do not skip or reorder.*
*Post-launch: complete month-one testing within 30 days of first paying user*
