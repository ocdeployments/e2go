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

### Full branching journey — rebuilt & expanded [CREATED — June 9, 2026]
Full interactive HTML widget rebuilt in the June 9 planning session.
Expands on the June 4 concept with corrected structure and all
branches wired:
- Main trunk: Quiz → Business Advisor → Onboarding → Document Interview
  → Readiness Score → Document Engine → ZIP Download
- Document engine expands into 6 sequential sub-stages:
  Generate → Humanize → AI Audit → Consistency → Quality Gate → Release
  Approval gate loop shown between steps. Release routes back to Download.
- Specialist referrals branch at 5 trigger points:
  Franchise Broker (undecided/quiz), Investment Consultant (funds gap),
  Immigration Attorney (attorney flag), CPA (source of funds gap),
  Business Broker (post-download)
- Interview prep track branches from Download:
  Compliance Calendar, Interview Simulator ($197 standalone), Reference Guide,
  Interview Day
- Post-approval track: Outcome Recording, Renewal Module ($497), 5-yr Compliance Track
- Every node is clickable with a full description panel
- Colour coding: teal = Free, amber = Paid, coral = Doc Engine,
  gray = Referrals, purple = Interview/Post-approval
Status: complete and accurate. Ready for Claude Code to rebuild as
a landing page or internal reference section.
Source: Claude.ai planning session, June 9, 2026

### 16-stage document engine pipeline — original detailed diagram [CREATED — earlier session]
Vertical flowchart showing every stage of the document preparation
pipeline in detail. Four phases: Intake / Analysis / Generation / Release.
Stages:
1. Eligibility Quiz — 26 questions, 82 treaty countries, hard stops
2. Document Interview (Module 3, Tabs A-L) — ~250 questions
3. Writing Sample Collection — 2-3 paragraphs, voice profile extracted
4. AI Detection on Writing Sample — perplexity, burstiness, pass/fail
5. Analysis Engine — substantiality, fund source, experience match
   ↳ Sub-outputs: Marginality Ratio, Substantiality Score, Denial Risk Audit
6. Case Brief Produced — strengths, framing gaps, consulate flags
7. Follow-Up Conversation — max 8 questions, fills content gaps
8. Prompt Assembly — 6 prompt files, case brief, voice profile, KB context
9. Sequential Document Generation — ONE at a time, 6 documents, claude-opus-4-8
10. Humanization Pass — removes AI vocabulary, injects applicant phrases
11. AI Detection Audit — must score below 0.35, retry loop
12. Cross-Document Consistency Check — name, amounts, dates, all 6 docs
13. Quality Gate — completeness, no placeholders, no legal conclusions
14. Metadata Sanitization — author stripped, revision history cleared
15. Applicant Review & Approval — per-document, 10 revision credits
16. Pre-Download Acknowledgment Gate — 5 declarations
Final Output: Embassy-Ready Package (Cover Letter, Source of Funds,
  Investment Proof, Business Plan, Qualifications Narrative, DS-160 Reference)
Status: reference diagram. This is the more detailed engine-only view.
Use alongside the branching journey diagram (above) for full picture.
Source: earlier planning session (screenshot confirmed June 9, 2026)

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

### FAQ section for landing page [SUPERSEDED — June 13, 2026]
Static FAQ replaced by interactive AI Q&A widget (Session 11: Ask E2go).
See: `src/components/landing/FaqWidget.tsx` and `src/app/api/faq/ask/route.ts`.
368 Q&A pairs seeded via pgvector. Three-layer retrieval: corpus → KB → model knowledge.
Original static plan in `docs/faq-monochrome.md` — kept for reference only.

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
| ~~FAQ monochrome~~ | ~~docs/faq-monochrome.md~~ | ~~Landing page FAQ section~~ | Superseded by Session 11 (interactive widget) |
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

## SECTION 13 — MODULE 3 REDESIGN [EXPLORING — June 9, 2026]

### Background
The current Module 3 (12 tabs A–L) is functional but presents as a
government form. Each tab is a separate page. Questions stack vertically.
The experience is daunting for applicants who are sophisticated investors,
not form-fillers. This section records the full design conversation
so the direction is not lost.

### Options considered

**Option 1 — Single page, 12 horizontal tabs**
One URL (/apply), 12 tab buttons across the top, clicking swaps the
questions below. TurboTax approach.
Rejected: 12 tabs overflow on mobile. Horizontal scrolling is bad UX
at this price point.

**Option 2 — Sidebar navigation (Stripe Atlas model)**
Left sidebar: all 12 tabs as a vertical list with completion indicators.
Main content: current tab's questions.
Advantages: mobile collapses gracefully, shows completion status per tab,
user always knows where they are, 12 items fit in a vertical list.
Pre-filled fields from quiz appear as nearly complete before user types
a word — psychologically powerful.
Status: viable but not the recommended direction.

**Option 3 — Wizard with section groups**
Group 12 tabs into 4–5 logical categories:
Personal & Family (A, B, L), Business (C, D, E, K),
Investment & Funds (F, G, H), History & Ties (I, J).
User sees 4 sections, not 12 tabs.
Status: better than Option 1, weaker than the preferred direction below.

### Preferred direction — Six document builders [DECIDED]

The core insight: the 120 questions are not a form. They are the raw
material for 6 legal documents. Organise the UI around the documents
being built, not around tab letters that mean nothing to the user.

**Six sections, each corresponding to one document:**
1. Your story → feeds Cover Letter + Investor Biography
2. Your business → feeds Business Plan
3. Your investment → feeds Source of Funds narrative
4. Your qualifications → feeds Investor Biography + Cover Letter
5. Your family → feeds Dependent section
6. Your ties → feeds Non-immigrant intent section

**UI structure — two-panel layout:**
- Left panel: questions in conversational groups of 3–5
  (not all 21 at once — progressive disclosure within each section)
- Right panel: document outline filling in as questions are answered
  Phase 1 (build now): structured template with fields populating
  Phase 2 (after first paying user): live AI paragraph after each
  cluster — API call per cluster, streams real prose into the right
  panel. Estimated cost: ~$0.05–$0.75 per user session.

**Progress metric shift:**
"3 of 6 documents ready for review" not "47 of 120 questions answered."
One feels like building something. The other feels like a trudge.

### Why this scores 8.5/10 not 10/10

Three honest gaps identified:

**Gap 1 — Live preview ceiling**
Phase 1 right panel is a structured template (mail merge feel).
A genuine 10/10 has the AI composing a real paragraph after each
3–5 question cluster — not on every keystroke, but after cluster
completion. Magical but adds latency and token cost per cluster.
This is a build decision. Build Phase 1 first, add Phase 2 after
first revenue.

**Gap 2 — Imagery**
At the $550–$1,397 price point, real photography (real investors,
real franchise locations, real consulate buildings) would push
trust significantly. AI-generated images have a ceiling.
This is a budget and time problem, not a code problem.

**Gap 3 — Question voice**
Current questions are functional but clinical.
A 10/10 has questions that teach and collect simultaneously —
e.g. "How much have you committed to this business so far —
and how would you explain where that money came from if an
officer asked you right now?" Rewriting 120 questions to
this standard is a significant content investment.

**Honest summary:**
- Design concept alone: 8.5/10
- Design + live AI paragraph generation: 9.5/10
- Design + AI + real photography + rewritten question voice: 10/10
- 8.5 is enough to convert first paying users.
- Build toward 10 after revenue exists to invest in it.

### Build status
[DEFERRED — not yet built]
Do not build until owner confirms. Session file will be written
when this is ready to build. Current Module 3 (12 tabs) remains
in place until the replacement is complete.
Existing DB structure does not change — only organisation and
presentation changes.
Source: Planning conversation, June 9, 2026

---

## SECTION 14 — MODULE 3 FULL GAP AUDIT [June 9, 2026]

Full adversarial audit of all Module 3 questions wearing four hats:
immigration lawyer, immigration consultant, case expert, 10-year
visa officer. 34 gaps identified across six categories. All are
additive — none require structural change to the six-section plan.

### Gap register — 34 items

| # | Gap | Severity | Section |
|---|-----|----------|---------|
| L1 | Immigration history tooltips missing specific examples of what counts | High | S1 |
| L2 | Escrow exception not handled — blanket not-at-risk flag incorrect | High | S3 |
| L3 | Investor salary/draw from business not collected | High | S3 |
| L4 | Negative control doctrine unexplained in plain language | Medium | S2 |
| C1 | Physical presence plan not collected — remote management denial risk | High | S2 |
| C2 | Round number investment not flagged | Medium | S3 |
| C3 | Startup cost breakdown line-item table missing | High | S3 |
| C4 | Language/interpreter for non-English applicants | Medium | S6 |
| E1 | Acknowledged weakness strategy absent — "too perfect" is a denial risk | High | S1 |
| E2 | Local market data — city population, competitor count | Medium | S2 |
| E3 | First 90 days operational plan not collected | Medium | S2 |
| E4 | Break-even timeline not collected or validated | High | S3 |
| O1 | Children enrolling in US schools — immigrant intent signal uncaptured | High | S5 |
| O2 | Ongoing Canadian employment/business ownership not collected | High | S6 |
| O3 | "Why this city/state" question missing | Medium | S2 |
| O4 | Net worth figure for Toronto-required certified statement | High | S3 |
| O5 | US housing arrangements not collected | Low | S6 |
| SSN | SSN routing for dual nationals and prior US visa holders | High | S1 |
| ITIN | ITIN question and compliance calendar items absent | Medium | S3 |
| EIN | Tooltip fix — IRS International Line +1 267-941-1099 missing | Medium | S2 |
| B1 | Canadian bank large wire advance notification | Medium | S3 |
| B2 | Net worth statement content guidance — what CPA produces | High | S3 |
| B3 | Insurance question absent from Module 3 | Medium | S2 |
| B4 | Delaware vs operating state foreign entity registration | Medium | S2 |
| B5 | Registered agent requirement never mentioned | Medium | S2 |
| B6 | State LLC annual fees (CA $800/yr, DE franchise tax, etc.) | Low | S2 |
| B7 | Operating agreement vs articles of organization distinction | Medium | S2 |
| B8 | Gift funds donor source-of-wealth requirement undercollected | High | S3 |
| B9 | Seller financing scenario not handled | High | S3 |
| B10 | Acknowledged weakness coaching absent | High | S1 |
| B11 | Consulate appointment scheduling process not covered | Medium | S1 |
| B12 | Medical exam awareness absent | Low | S1 |
| B13 | Interview coaching for numbers — memorize your own figures | Medium | S3 |
| BANK | US business bank account opening — full practical guidance missing | High | S3 |

15 high severity. 14 medium. 5 low.

### Key additions from this audit

**Banking gap — full guidance needed when answer is "No"**
When applicant has no US business bank account, platform must provide
structured guidance across four options:
1. TD Bank / RBC cross-border (if they bank with either)
2. Mercury — remote opening, EIN + LLC docs + passport, 1-3 day approval
3. Relay — backup to Mercury, Canadian-founded, same remote process
4. Traditional US bank (Chase, BofA, Wells) — requires in-person US branch visit

Wise Business account also valid as USD holding bridge account during
traditional bank account opening.

**Seller financing** — financed portion doesn't count toward substantiality
unless investor personally guarantees repayment. Needs specific question
in QF branch for acquisition applicants.

**Acknowledged weakness strategy** — Officer Concern 12 from knowledge base:
applications that are too perfect look like templates. Platform must coach
applicants to proactively name and address genuine weaknesses. Dedicated
question in Section 1 feeds a preemptive counter-argument paragraph in
the cover letter.

**Investor salary draw** — Officer check: investor salary / Year 1 revenue
must be under 40%. No question currently collects planned owner's draw.
Required for business plan financial projections section.

**Net worth statement** — Toronto consulate requires certified CPA net worth
statement. Platform has checklist item but no question collecting the figure
and no guidance on what the CPA needs to produce.

Source: Full gap audit, June 9, 2026

---

## SECTION 15 — ADDITIONAL CLIENT TYPES COVERED [June 9, 2026]

Gap analysis identified 21 distinct client types the platform serves.
Coverage assessment and question additions for each:

### Previously missing, now addressed

**Step-children / blended families (Client Type 10)**
QL-NEW-01 added — relationship type question before Tab L personal details.
Branches for: biological child in marriage, biological child outside marriage,
father claiming out-of-wedlock child (legitimation check), step-child
(marriage-before-18 condition check + ongoing marriage check), legally
adopted child (age-16 condition + 2yr custody/residency check), other
(attorney flag). Document checklist logic updated per INA 101(b)(1) categories.

**Common-law partnership (Client Type 11)**
W-16 revised with full explanation: Canadian common-law partnerships do not
meet 9 FAM 102.8-1(F) "full equivalence" test regardless of province.
No Canadian province satisfies all four criteria (divorce-only termination,
alimony, intestate inheritance, custody). Standard pathway is formal civil
marriage. Sub-question added: are you planning to legally marry before interview?
Same-sex note: married same-sex couples fully eligible on identical terms
to opposite-sex married couples.

**RRSP/TFSA/LIRA/RESP-funded investment (Client Type 16)**
QH-NEW-02 added with full registered account sub-flow:
RRSP path — T4RSP slip, withholding gap explanation, 7-step paper trail.
TFSA path — no tax slip issued, cover letter explanation required.
LIRA path — mandatory attorney + CPA flag, provincial unlocking process.
RESP path — strong caution, 20% penalty tax, grant repayment documentation.
Compliance calendar entries added: T-6 through T-2 months.

**Crypto-funded investment (Client Type 15)**
QH-NEW-03 added — four phases documented:
1. Original acquisition (purchase, mining, employment, trading gains)
2. Exchange vs self-custody determination
3. Liquidation and tax reporting
4. Fiat transfer chain to US business account
Documents required: exchange statements, KYC/AML records, bank statements,
CPA letter, investor declaration, blockchain tracing report if self-custody.

**Material change at renewal (Client Type 21)**
RQ-MC-01 through RQ-MC-03 added to renewal module.
Diagnostic before any renewal package generated.
Material vs non-material typology table incorporated.
Mandatory attorney flags for: closed original business, ownership below 50%,
complete industry pivot, franchise switch, multiple simultaneous changes.

### Partnership enhancements (Client Type 2)

**Partner B independent voice**
Sequential flow confirmed: Partner A completes S1, S3, S4, S6 (independent
sections). S2, S5 (shared) pre-fill from Partner A and lock for Partner B.
Partner B receives separate login link. Sections framed as independent
to prevent coordinated answers — which is the denial pattern.

**Partner B nationality**
Q0-14 already in quiz. Generation engine must use Partner B's own treaty
country in their cover letter, not Canada, if different.

**US citizen partner scenario**
Quiz needs branch: "Is your business partner a US citizen or permanent
resident?" US citizen/PR partner does not need E-2 but 50% rule still
applies. Platform currently assumes both partners need E-2.

Source: Client type audit, June 9, 2026

---

## SECTION 16 — BANKING AND TAX IDENTIFIERS [June 9, 2026]

### US Business Bank Account — Practical Opening Guide

Complete guidance for when applicant answers "No" to bank account question.

**Required prerequisites (in order):**
1. LLC or corporation formed in target state
2. EIN obtained (IRS International Line: +1 267-941-1099)
3. LLC formation documents (articles of organization)
4. Passport

**Options by situation:**

Mercury (recommended — remote opening)
- Remote account opening for international LLC owners
- Requirements: LLC docs, EIN letter, passport
- No US address or SSN required
- Approval: 1–3 business days
- FDIC insured via Choice Financial Group / Evolve Bank & Trust
- Widely used by E-2 applicants specifically
- Apply: mercury.com

Relay (Mercury backup)
- Canadian-founded fintech, designed for cross-border entrepreneurs
- Same remote opening process as Mercury
- Apply: relayfi.com

TD Bank / RBC cross-border (if existing Canadian customer)
- Contact Canadian branch business banking team
- Request introduction to US counterpart
- Most reliable for large initial deposits given existing relationship

Traditional US bank (Chase, BofA, Wells Fargo)
- Requires in-person visit to US branch
- Viable if applicant travels to US for site visit, lease signing,
  or franchise training before interview
- Call ahead — not all branches accept foreign national applications
- Bring: passport + LLC docs + EIN letter + Canadian address

Wise Business (bridge account only)
- Can serve as USD receiving account while traditional account opens
- Gives US routing number and account number immediately
- Not a substitute for a traditional business bank account for E-2 purposes
- Funds should be moved to primary business account before interview

**Critical rule:** Account must be in business name, not personal name.
Wire must flow: Canadian personal account → US business account directly.
Any pass-through to a personal US account creates a paper trail gap.

**Canadian bank wire notification**
TD Bank online wire limit: ~$25,000 CAD. Above that requires branch or
phone authorization. Notify Canadian bank before wiring large amounts.
Some banks freeze accounts on large outgoing international transfers.
Advance notice call prevents day-of freezes.

### CAD→USD currency conversion — rate comparison

Wise, OFX, and Knightsbridge FX offer 0.5–1% better rates than Canadian
banks on large transfers. On $200,000 CAD this is $1,000–$2,000 USD.
Interactive rate comparison tool to be built in Section 3 of document
interview — enters investment amount, shows live rate comparison across
services, links to referral URLs.

### Tax identifiers — complete picture

**EIN (business):**
Required before bank account, hiring, licenses, tax filing.
Canadian applicants: call IRS International Line +1 267-941-1099.
Have LLC docs ready. Call takes ~20 minutes. EIN issued same day.

**SSN (personal):**
E-2 holders eligible after arriving in US.
Apply at SSA office within first 2 weeks of arrival.
Processing: 2–4 weeks.
Dual nationals / prior US work visa holders may already have one —
quiz Q0-01 dual citizen option should trigger SSN check question.

**ITIN (personal — bridge before SSN):**
Required if US tax filing obligation exists before SSN obtained.
Also needed if US-source income pre-arrival (rental income, investment
income from US business account).
Apply: IRS Form W-7 + certified passport copy.
Processing: 7–11 weeks by mail; faster in-person at IRS TAC.
Once SSN obtained, ITIN no longer used.

**Compliance calendar additions:**
- Visa +1 week: Apply for SSN at Social Security Administration
- Visa +2 weeks: If US tax obligation, initiate ITIN application (Form W-7)
- Visa +11 months: File first US tax return — use SSN if obtained, ITIN if pending

Source: Banking and tax identifier audit, June 9, 2026

---

## SECTION 17 — REFERRAL PROGRAMME STRATEGY [June 9, 2026]

### Banking referral partners — updated

Current spec lists RBC, TD, East West Bank only.
Add: Mercury, Relay, Wise.

| Situation | Partner | Programme type | Est. fee |
|---|---|---|---|
| Remote opening, no US presence | Mercury | Partner portal (self-serve) | $150–$250/account |
| Mercury backup | Relay | Partner portal (self-serve) | $50–$150/account |
| Existing TD/RBC customer | TD/RBC cross-border | Direct negotiation | $100–$200/account |
| Large CAD→USD transfer | Wise Affiliates | Affiliate portal (self-serve) | ~$50–$100/transfer |
| International background | East West Bank | Direct negotiation | $150–$250/account |

Wise note: per-transfer fee is lower but volumes are high. 500 applicants
× avg $150,000 CAD transfer = significant affiliate income at scale.
Apply through wise.com/affiliates.

### Application sequencing

**Apply now (before launch) — self-serve, no traffic required:**
- Mercury: mercury.com/referral-partners
- Wise Affiliates: wise.com/affiliates
- Relay: relayfi.com/partners
- Requirements: domain + business email + one-paragraph platform description

**Apply at soft launch (10–20 paying users):**
- East West Bank — direct conversation with business development
- Knightsbridge FX — introducer programme, contact directly
- OFX — formal partner programme
- Cross-border CPAs (MNP, BDO) — informal agreement first, formalise at 20 users

**Apply at scale (50+ users):**
- RBC and TD Bank — relationship-driven, needs volume data
- Renegotiate Mercury/Relay rates based on actual account volume
- Wise tier upgrade based on transfer volumes

**Immigration attorneys — no fees, no approval process:**
Approach now. E2go does not charge attorneys. Warm leads at no cost.
Email 2–3 E-2 specialist attorneys before launch.
Formalise at 20 users.

**Franchise brokers — start now:**
Outreach templates already written in knowledge base.
Sales cycle is long — start conversations before launch.
FranNet, IFPG, FranChoice are the primary targets.

### CASL and FTC compliance

All referrals use existing double opt-in consent framework — CASL compliant.
Mercury and Wise will ask about consent process during application review.
Show them the consent screen spec — accelerates approval.
FTC endorsement guidelines: referral fee disclosure must be at point of
recommendation, not in terms. Existing consent screens handle this correctly.

### Revenue projection — referral layer only

Per fully-referred applicant:
- Franchise broker (if closed): $1,500–$3,000
- Attorney: $0 (goodwill / reciprocal)
- Banking: $150–$250
- CPA: $150–$250
- Commercial lease: $300–$500
- Wise transfer: $50–$100
- Residential purchase (Year 2): $500–$2,400
Total per applicant: $2,650–$6,500 (excluding franchise close)

At 100 applicants/month: $265,000–$650,000/year referral revenue alone
(before application fees, compliance subscriptions, or renewals).

Source: Referral programme strategy, June 9, 2026

---

## SECTION 18 — FINANCIAL PROJECTIONS IN MODULE 3 [June 9, 2026]

### Projections are not a renewals-only feature

5-year revenue and net income projections (Section 3, Your Investment)
are required for ALL initial applications, not just renewals.

Reason: officers evaluate non-marginality for new businesses through
projections only — there are no actuals yet. Projections are the primary
evidence that the business will generate substantially more than the
investor's household income need.

### Projection basis — required by business type

**Franchise:** FDD Item 19 financial performance representations (if
franchisor provided them). If no Item 19: industry comparables + local
market research. Platform question: "Has your franchisor provided Item 19
financial performance data?" Yes / No / Not sure.

**Acquisition:** Historical financials of the business being acquired
are the primary basis. Projections are forward extensions of real data.
Strongest possible basis.

**New original business:** Industry research, comparable business data,
local market analysis. Platform must ask "What is the basis for your
projections?" and surface answer in business plan narrative — because
projections without a stated basis are a denial risk.

### Projection table design — confirmed

One interactive table replacing 10 separate fields:
Rows: Year 1 through Year 5
Columns: Revenue / Net Income / Employees (headcount)
Mobile: collapses to card-per-year below 480px

Third column (employees by year) is the non-marginality story:
revenue grows + income grows + headcount grows = non-marginal enterprise.
Officers read this table first. If it tells that story visually, the
narrative reinforces rather than establishes it.

A "basis" field sits above the table: what are these numbers based on?
Answer feeds a sentence in the business plan that distinguishes a credible
plan from a made-up one.

### Investor salary/draw — required addition

Officer check (Concern 6): investor salary / Year 1 revenue must be < 40%.
No question currently collects planned owner's draw.
Add to projection table or as adjacent question:
"What do you plan to pay yourself from this business in Year 1?"
Advisory if answer exceeds 40% of Year 1 revenue projection.
Also required as a line item in the business plan financial projections.

### Break-even — required addition (Gap E4)

Add: "At what point do you project the business to break even?"
Options: Month 3–6 / Month 7–12 / Year 2 / Year 3 or later
Validation: working capital in investment must cover projected
loss period. If Year 1 net income is negative and investor only
has 3 months working capital, flag mismatch.

### Renewal connection

At renewal, same table structure becomes Template 6 (Actual vs. Projected).
Original projections from initial application pre-populate one column.
Actuals entered in renewal module populate adjacent column.
AI generates variance narrative automatically.
For existing E2go users: original projections pre-filled.
For new renewal users (didn't use E2go originally): both columns from scratch.

Source: Projections clarification, June 9, 2026

---

## SECTION 19 — PARTNERSHIP GENDER HANDLING [June 9, 2026]

### Decision — binary, no pronoun language

Partner nomination card collects three fields only:
1. Partner's full name
2. Partner's email address
3. "Your partner is a" — Man · Woman (two options, no label
   that says "pronoun" anywhere in the UI)

If left blank: platform defaults to name possessive throughout
("David's story," "David's investment") — avoids the issue
without requiring the selection.

Selection drives his/her throughout:
- Section card labels (His story / Her story)
- Strip text ("David has been invited" / "Sarah has been invited")
- Generation engine — his/him or her/hers in all documents
  referencing the partner

No third options. No "they/them." No pronoun language visible
to the user anywhere. Simple, clean, binary.

Database field: partner_gender ENUM('man','woman') NULLABLE
Null handling: use name possessive, never a pronoun

Source: Owner direction, June 9, 2026

---

## SECTION 20 — CASE FILE UI — ALL DECISIONS [June 9, 2026]

This section records every UI decision made during the June 9 planning
session for the Module 3 redesign. These decisions are locked and must
be honoured in the session file and build.

### Page title — DECIDED
NOT "Your document interview" — that describes the mechanism, not the
outcome, and is generic and cold.
DECIDED: "Your case file" — what a law firm calls it, what the officer
sees when they open the binder, signals serious professional preparation.
Used as: section title, generate button copy ("Generate your case file"),
strip text ("Your case file is in preparation").

### Personalised header — DECIDED
Header is assembled dynamically from quiz data.
Layout (top to bottom):
1. Welcome line: "Welcome back" (returning) or "Welcome" (first visit)
   — small caps, muted, 11px, letter-spacing .12em
2. Name: "[First name] [Last name italic gold]" in Cormorant Garamond
   300, 28–32px. Surname in italic gold (#C9A84C at 50% opacity).
3. Meta chips row: populated only from confirmed quiz data.
   Never render empty chips, never render dashes or placeholders.
   Chips shown: nationality · visa type · city/state · investment amount
   · business name. Any unknown field simply does not appear.
4. Gold rule: 0.5px full-width border-color var(--border) with 80px
   gold override on left. Shorter (30px) and dimmer when data is thin.
5. Resume/orientation strip below rule.

### Three data states — DECIDED

**State 1 — Full data (returning user, quiz complete with all fields)**
All five meta chips render. Gold rule full width.
Strip: "You left off in [Section] — cluster X of Y. Ready to continue?"
+ Continue button (gold border).

**State 2 — Thin data (name + nationality only)**
Only chips that have data render. Rule is shorter and dimmer.
Strip: "Your eligibility check is complete. Start with Section 1 —
it takes about 8 minutes and sets the tone for everything that follows."
+ Begin Section 1 button.
Pre-fill gems show gold where data exists, grey where it doesn't.
No zeros rendered — gem colour communicates state.

**State 3 — No quiz data (anonymous or session expired)**
No name. Header reads: "Your E-2 case file." in Cormorant italic gold.
Two meta chips only: "E-2 Treaty Investor application" and
"Consulate-formatted package."
Quiz banner appears ABOVE section grid:
  Title: "Complete your eligibility check first"
  Body: explains pre-fill benefit and confirms eligibility before
  investing time in the case file.
  Button: "Start eligibility check →" (gold border)
  Secondary: "Continue anyway" (dim border, dim text) — exists because
  paying users who skipped quiz must not be blocked, but is visually
  secondary.
Section grid renders in full — not locked — all gems grey.

### Section card design — DECIDED
- Gold top rule: 1px, full width = complete, 60% opacity = active,
  none = not started
- Section numbering: 01–06 (or dynamic for expanded applicant types)
  in small caps muted
- Section title: Cormorant Garamond 300, 15–16px
- Document chips: small caps, 9px, gold border for primary documents,
  standard border for secondary
- Pre-fill gems: 4×4px gold squares, grey when no data
- Status tags: small caps, 9px, colour-coded:
  Complete = green border/text
  In progress = gold border/text
  Not started = muted border/text
  Waiting (partner) = very muted border/text

### Section interior layout — DECIDED
Two-panel layout: 196px left sidebar + flex-1 right question panel.
Sidebar contains:
  - Section name (Cormorant Garamond) + answered count (small caps muted)
  - Cluster list with state indicators (done ✓ / active → / number)
  - Active item: right-edge 1px gold rule, background gold-tinted
  - Document preview box at bottom: shows which docs are building/waiting

Question panel contains:
  - Top bar: cluster title (Cormorant) + cluster tag + autosave dot
  - Body: cluster rule divider (small caps + line), then questions
  - Question label: Cormorant Garamond 300, 16px
  - Helper text: DM Sans 300, 11px, muted
  - Pre-fill badge: gold border, "From your eligibility check" + gem dot
  - Input fields: transparent background, gold-dim border on focus
  - Option buttons: full-width, square (zero border radius), gold border
    and gold-tinted background when selected, standard border when not
  - Advisory blocks: gold border, gold-tinted background, muted text
  - Risk flag blocks: danger red border, danger-tinted background
  - Footer: ghost back button + auto-save status + gold next button

### Financial projection table — DECIDED
One interactive table replaces 10 separate year/metric fields.
Rows: Year 1 through Year 5
Columns: Revenue / Net Income / Employees
Mobile: collapses to card-per-year below 480px
Basis field above table: "What are these projections based on?"
(FDD Item 19 / historical financials / industry research / own analysis)
Answer feeds a sentence in the business plan.
Investor salary/draw field adjacent: feeds business plan P&L and
officer's 40% salary-to-revenue check.

### Partnership case file layout — DECIDED
Three visual tracks on the overview:
1. Shared sections (gold border, "Shared" badge) — always at top
   - Your business (S1) — one business plan for both partners
   - Partnership structure (S2) — operating agreement, roles,
     investment allocation, negative control
2. Your personal sections (standard gold treatment) — middle track
   - P1 Your story, P2 Your investment, P3 Your qualifications,
     P4 Your family & ties (collapsed from 4 separate sections)
3. Partner's personal sections (blue-tinted badge, locked) — bottom
   - Q1–Q4 mirroring P1–P4 but locked until partner accepts invitation
   - Shows partner's name + "Awaiting partner" state
   - Resend invitation link visible

Partner B sees shared sections (S1, S2) as read-only pre-filled.
Partner B completes Q1–Q4 independently — cannot see Partner A's
answers in equivalent sections. Enforced by design to prevent the
coordinated-answer denial pattern.

Generate button locked until both partners complete all sections.

Partner nomination card fields: name + email + "Your partner is a"
(Man / Woman — see Section 19 for gender handling decision).

### Dynamic section manifest — DECIDED
The case file overview assembles the correct section manifest for each
applicant at page load. Not a fixed 6-card grid.
Conditions and additions:
- Partnership → +2 shared sections, personal sections split to two tracks
- Change of Status → +1 USCIS filing package section, DS-160 removed
- Non-Canadian nationality → +1 country-specific documentation section
- Non-standard family → Your family expands with per-dependent sub-sections
- Registered accounts → Your investment expands with account sub-flow
- Crypto funds → Your investment expands with crypto sub-flow
- Citizenship by investment → Your story expands with naturalization questions

Section numbering convention:
S1, S2 = shared (partnership only)
P1–P4 = personal (partnership) or 01–06 (solo)
C1+ = conditional (COS, country-specific, etc.)
Dynamic — not fixed A–L.

### Autosave — DECIDED
Animated gold dot + "Saving" text visible in question panel top bar.
Dot pulses (CSS animation) while save is in progress.
Changes to "Saved" with static dot after confirmation.
Every answer saved within 2 seconds (existing rule — confirmed here).

### Pre-fill badge — DECIDED
Gold border badge reading "From your eligibility check" with 4px gem dot.
Appears above any field pre-filled from quiz data.
Field is editable — badge persists until value is changed.
On change: badge changes to "Edited" in muted grey.
On revert to original value: badge returns to gold "From your eligibility check".
DB stores source field: quiz / user_entry / user_edited.
Generation engine uses latest value regardless of source.

Source: Full UI design session, June 9, 2026

---

## SECTION 21 — HERO CTA BUTTONS AND STATS STRIP FIX [June 9, 2026]

### Four surgical changes only — nothing else on landing page

**Fix 1 — Primary CTA button**
Add: box-shadow: inset 0 1px 0 rgba(255,248,220,0.25)
Increase letter-spacing to 0.13em
Do NOT change: background #C9A84C, text, padding, border

**Fix 2 — Secondary CTA button**
Change border: 0.5px solid rgba(245,240,232,0.35)
Change text: rgba(245,240,232,0.7)
Hover: border rgba(245,240,232,0.6), text rgba(245,240,232,0.95)
Do NOT change: background transparent, padding, text content

**Fix 3 — Horizontal rule between buttons and stats**
Remove existing full-width faint horizontal rule entirely.
Replace with: 48px × 1px gold line (#C9A84C) + 4px × 4px
gold square, displayed as flex row with 16px gap.
Same vertical margin as the rule it replaces.

**Fix 4 — "From $550" stat number**
Increase font-size by 4px relative to the other three stat numbers.
Same font, colour, weight — size only.
Other three stats: unchanged.

Commit message: "fix: hero CTA buttons and stats strip — surgical polish"
Verify with Playwright at 1440px before committing.
Do NOT touch any other element on the landing page.

Source: UI review, June 9, 2026


---

## SECTION 22 — INTERVIEW SIMULATOR — FINAL DECISIONS [June 9, 2026]

### Confirmed complete
All six tasks from SESSION_SIMULATOR.md completed and committed.
Simulator is fully production-ready.

### Key decisions locked

**TTS voice choice — Groq over OpenAI**
Decision: Groq TTS (Option A) over OpenAI TTS.
Reason: GROQ_API_KEY already in .env.local and used for transcription.
Same key, lower latency (200–400ms vs 500–800ms first audio),
no new key needed. Fritz-PlayAI voice for officer persona.
Architecture: server-side API route /api/simulator/tts keeps key
server-side — better than original spec which called from client.

**Session limits**
2 sessions included in all packages AND standalone purchase.
Each session: 15 minutes maximum.
Additional sessions: $29.99 per bundle.
Timer: countdown visible in question header, red at 2 minutes,
force-complete at zero.

**Humanisation clarification**
The voice profile / writing sample purpose is to make AI-generated
documents sound human — not AI-generated. Whether the writing sample
was written by the applicant personally or by a lawyer does not
matter. Both are human. The AI detection check (threshold 0.35)
applies to the final generated output, not to the writing sample
source. This distinction is important for the document upload
feature where uploaded documents may have been lawyer-prepared.

**Stripe env var**
STRIPE_PRICE_SIMULATOR (original) renamed to
STRIPE_PRICE_SIMULATOR_3PACK to match checkout route tier key.
Commit: 0aca5dc

Source: Simulator completion session, June 9, 2026

---

## SECTION 23 — QUIZ FIXES SESSION 1 — DECISIONS [June 9, 2026]

All six tasks complete. Build clean. Committed to dev.

### Family question split — DECIDED AND BUILT

Q0-13 replaced with two sequential questions:

**Q0-13a — Nuclear family travel plan**
"Are your spouse and children moving to the US with you?"
Options: Moving together / Spouse and children staying /
Some coming some staying / Not applicable
Scoring: Spouse and children staying = moderate immigrant intent
mitigation flag. Moving alone initially = note for cover letter.

**Q0-13b — Extended family home country ties**
"Do you have parents, siblings, or other close family who will
remain in [home_country] after you move?"
Options: Yes parents / Yes siblings / Yes both / Yes other / No
Scoring: Any yes = strong positive home ties signal.
No = flag for stronger ties documentation needed elsewhere.

Why: Spouse/children staying is a different legal and document
situation from parents/siblings staying. They cannot be asked
in the same question — the implications are completely different.

### Spousal partnership — DECIDED AND BUILT

Q0-15 updated:
- "My spouse" option added as a distinct partnership type
- Advisory corrected: 50/50 strict rule applies to UNRELATED
  partners only. Spousal partnerships may qualify with different
  splits as long as principal applicant develops and directs.
- The previous advisory was legally incorrect. Fixed.

Q0-14b added: Spouse role follow-up
"What will be your spouse's role in the business?"
Options: Active co-operator / Silent investor / Not yet decided
Routing: Active co-operator → spouse may qualify for own E-2,
qualifications need independent documentation.

Q0-03a added: Principal applicant question
Fires when married + solo application.
"Who is the primary E-2 applicant?"
Options: I am / My spouse is (I am completing on their behalf) /
We are applying as co-investors (partnership)
Critical: if spouse is principal, all answers attributed to spouse.

### Timeline — month names not weeks — BUILT

Dynamic calculation replaces static "16–22 weeks".
getInterviewMonthRange(weeksMin, weeksMax) function.
Displays: "September — October 2026" with today's date in subtitle.
More impactful, more personal, actionable.

### Back button — BUILT

Repositioned to top-left of each question screen.
Warmer colour: rgba(245,240,232,0.55).
Adequate touch target (padded).
"← Review or change my answers" link added to results page.

### Quiz review page — BUILT

/quiz/review — new page.
All answers grouped by category.
Each answer shows: category label, question text, current answer,
"Change →" link.
Jump-to-question via localStorage (quiz_jump_to key).
Auto-redirects back to /results after answering jumped-to question.
No need to re-answer entire quiz to change one answer.

### Gold borders — CONFIRMED

Already in place. No fix needed.

Source: Quiz fixes Session 1, June 9, 2026

---

## SECTION 24 — QUIZ LEGAL ACCURACY SESSION 2 — DECISIONS [June 9, 2026]

All 7 fixes complete. Build clean. Committed to dev.
Source documents: E2_partnerships_non_typical.md,
E2_essential_questions.md (both in project knowledge base).

### Fix 1 — Three+ partner hard stop — BUILT

Per 9 FAM 402.9: "An equal partnership with more than two partners
would not give any of the parties control based on ownership, as
the element of control would be too remote even under the negative
control theory."

Hard stop PR-06b updated with full explanation.
Two routing options offered:
1. Restructure to two-party structure (both can qualify as investors)
2. Apply as E-2 employee (if company is 50%+ treaty-national owned
   and applicant holds executive/supervisory/essential skills role)

Platform prepares investor applications. Employee pathway
acknowledged with attorney referral.

### Fix 2 — Holding company ownership chain — BUILT

Q0-14c added.
50% test applies THROUGH the ownership chain per 9 FAM 402.9-4(B).
Canadian holdco owning 40% of US business = 40% effective ownership,
not 100%.
Options: Direct / Through holding company / Through trust / Both /
Not sure.
Trust ownership → attorney flag.
Holding company → chain calculation advisory.

### Fix 3 — Control through management rights — BUILT

Q0-14d added. Fires when ownership below 50%.
9 FAM: "Control may be demonstrated by ownership of at least 50%,
by possession of operational control through a managerial position
or other corporate device, or by other means."
Options: Veto rights / Board control / Special voting shares /
Management title / None / Not sure.
Any yes → documentation advisory, continue (not hard stop).
None → soft flag, attorney recommendation.

### Fix 4 — E-visa nationality for mixed partnerships — BUILT

Q0-14e added. Fires when partners have different nationalities.
Per 9 FAM 402.9-4(B): business has one E-visa nationality.
All E-2 beneficiaries must share that nationality.
Dynamic options populated from Q0-01 (applicant nationality)
and partner nationality field.
If equally owned by two different treaty nationals → either
nationality can designate the enterprise.

### Fix 5 — Investment commitment timing — BUILT

Q0-05a added. Fires when amount below $100k.
"In the process of investing" standard per 9 FAM 402.9-6(A)
requires binding, irrevocable commitment — not just availability.
Options: Fully committed / Substantially committed / Partially /
Not yet committed / Planning stage.
"Not yet committed" → high risk flag.
"Planning stage" → strong advisory to delay application.

### Fix 6 — Passive investment and non-profit hard stops — BUILT

Q0-09a added.
Hard stop PR-PASSIVE-INVEST: stock portfolio, financial investments.
Hard stop PR-NONPROFIT: non-profit organizations.
Real estate: split into passive (hard stop) vs active operations
(advisory + continue).
Per 9 FAM 402.9-6(C): "real and operating commercial enterprise"
required. Non-profits explicitly excluded.

### Fix 7 — Officer discretion advisory + DS-156E — BUILT

Officer discretion advisory added to results page.
9 FAM grants officers explicit discretion to request additional
documentation. Most common: extended bank history, additional
tax returns, third-party valuations.
Best defense: preparation depth beyond what was asked.

DS-156E note added to document checklist.
Required at some consulates (not Toronto). Post-specific.

### Scoring additions (all additive)
2 new hard stops: PR-PASSIVE-INVEST, PR-NONPROFIT
4 new attorney flags
6 new risk flags
Nothing modified. Nothing removed.

Source: Quiz legal accuracy Session 2, June 9, 2026

---

## SECTION 25 — SELF-PREPARER CUSTOMER TYPE [June 9, 2026]

### Three customer profiles identified

**Profile A — The independent preparer**
Has been gathering documents, drafting sections, building
spreadsheets. Has not yet engaged a lawyer. Preparing to —
or hoping E2go makes it unnecessary. Most common self-preparer
profile. Has draft work, not a complete package.

**Profile B — The pre-lawyer preparer**
Reached a stage of preparation where they are nearly ready to
send a package to a lawyer for review. Wants E2go to validate
and complete the gaps professionally before that step. May end
up not needing the lawyer at all.

**Profile C — The lawyer dropout**
Started with an attorney, has partial professional documents,
ran out of budget or confidence. Wants to complete without
additional legal fees. Has some professionally prepared docs,
potentially some templated content.

### Pricing decision — no new tier

Same price as from-scratch applicants.
Reasoning: The platform's cost is in AI generation, not in
question collection. Whether answers come from uploaded documents
or from typing, the generation engine runs the same 15-step
pipeline. The marginal cost difference (extraction calls) is
$0.10–$0.30. The applicant gets a faster, lower-friction
experience — that's better value at the same price, not a
discount reason.
Additionally: the gap analysis the self-preparer receives is
additional value the from-scratch applicant does not get.

### No separate landing page section

The landing page does not need a dedicated section for
self-preparers. The quiz routing question (Q0-PREP-STATUS)
identifies and routes them appropriately inside the product.
Creating a separate landing page entry would imply a different
product when it is the same product with an optional shortcut.

### Quiz routing question — SPECCED (not yet built)

Q0-PREP-STATUS added to quiz after business type question.
"Have you already started preparing your E-2 application?"
Options: No (scratch) / Yes some documents / Yes near-complete
Stores as application.preparation_status:
scratch | partial | near_complete

### "Complete package" definition

There is no applicant-defined "complete" package.
The only complete package is one that has passed the platform's
own standard. An applicant who uploads what they believe is a
finished package is the most important person to run through
the gap analysis — because they are about to submit something
that may have holes they cannot see. No special handling.
All self-preparers go through the same extraction → discrepancy
→ gap report → complete remaining questions flow.

### Key principle on humanisation and uploaded documents

Uploaded documents — whether self-written or lawyer-written —
are data sources for pre-filling questions.
They are NOT used as the voice profile for document humanisation.
The voice profile / writing sample is always collected fresh
in Section 1 of the case file.
The humanisation engine's goal is to make AI output sound human,
not to match the applicant's personal writing style vs a lawyer's.
Both are human. The AI detection check (0.35 threshold) applies
to the final generated output only.

Source: Self-preparer customer type discussion, June 9, 2026

---

## SECTION 26 — DOCUMENT UPLOAD AND EXTRACTION FEATURE [June 9, 2026]

Full spec: docs/DOCUMENT_UPLOAD_SPEC.md
Status: SPECCED — ready for two-session build (Session A + B)

### What this feature does

Optional document intake step at the start of the case file.
Accepts uploaded documents from self-preparers.
Extracts structured answers mapped to platform question IDs.
Detects discrepancies across documents and requires resolution.
Pre-fills the case file with extracted and confirmed answers.
Shows a gap report — what was found, what still needs answering.

### What it does NOT do

Does not replace the generation engine. Uploaded documents are
inputs that pre-fill questions. The platform still generates all
final documents through the 15-step pipeline. Uploaded documents
are never used as-is in the final package.

Does not use uploaded documents as the voice profile.

Does not do OCR on scanned PDFs (v1 — text extraction only).

Does not expose uploaded documents to other users.

### Document types accepted and what they pre-fill

| Type | Pre-fills |
|---|---|
| Cover letter / draft | Story, business, investment summary, ties |
| Business plan | Business description, market, projections, ops |
| Source of funds narrative | Investment section, funds trail |
| Investor biography | Qualifications section |
| DS-160 or prior visa | Administrative fields |
| Financial projections (Excel) | Projection table |
| Operating agreement | Ownership %, partnership structure |
| Franchise agreement / FDD | Franchise name, fee, projection basis |

### Discrepancy resolution — hard gate

When conflicting information is found across or within documents,
a flags screen appears. The applicant cannot advance until every
discrepancy is resolved. They must choose the correct value.
The resolved value becomes the single authorised figure throughout
the entire application. No silent picking. No ambiguity downstream.

### Acknowledgment requirement

Every pre-filled field — regardless of confidence — must be
physically touched before its section can be marked complete.
Pre-fills are a starting point, not a commitment.
A wrong pre-fill submitted unchecked is worse than no pre-fill.
The section completion % counts only touched fields.

### Pre-fill badge variants

"From your documents" — warm amber border and text, amber gem.
"From your documents — please verify" — medium confidence,
  amber with slight orange tint, left border highlight.
Low confidence → no pre-fill. Source quote shown as a hint below
  the empty field.

### Confidence levels

High: explicitly stated in document → pre-fill silently, badge shown
Medium: clearly implied → pre-fill with verify badge, highlighted
Low: uncertain inference → do NOT pre-fill, show hint only

### New database tables

application_documents — uploaded document registry
document_discrepancies — conflict log with resolution tracking
answers.confidence — high / medium / low / null
answers.source_document_type — which document type it came from
applications.preparation_status — scratch / partial / near_complete

### Build split

Session A (infrastructure first):
- Q0-PREP-STATUS quiz question
- DB migration (three tables + columns)
- Supabase Storage setup
- File upload API route
- Extraction pipeline API route (SSE)
- Discrepancy detection and resolution

Session B (UI after Session A verified):
- Upload card on case file overview
- /apply/upload page
- Processing screen (SSE consumer)
- /apply/upload/review (discrepancy resolution)
- /apply/upload/gaps (gap report)
- New pre-fill badge variants
- Gap report section coverage display

Do not start Session B until Session A extraction pipeline
is verified producing correct JSON for test documents.

### Test cases

Test 1: Michael James Chen cover letter → should extract business
  name, investment amount, target state, source of funds summary.
Test 2: Any franchise business plan → projections, market, employees.
Test 3: Conflicting documents ($185k vs $148,500) → discrepancy fires.
Test 4: Scanned image PDF → advisory fires, no extraction attempted.

Source: Document upload feature planning, June 9, 2026


---

## SECTION 27 — CASE FILE UX REDESIGN (June 10, 2026)

**Status:** [DECIDED — BUILD READY]
**Session file:** docs/sessions/SESSION_CASEFILE_REDESIGN.md
**Triggered by:** Screenshot review of /apply/story — pages look like
  draft forms, not a $550–$1,397 product. Decision made to rebuild.

---

### 27A — The Core Problem [DECIDED]

The six case file sections were built correctly at the data layer
but were never properly designed at the visual layer. They are
full-width scrolling forms with question text at body weight,
raw black textareas, and no document context. They do not belong
to the same product as the landing page, quiz, or simulator.

The mandatory UI superpower sequence (Lazyweb → Firecrawl →
design → build → Playwright) was not followed when these pages
were built. This session corrects that.

The standard: a client opening any of these pages immediately
understands why they paid what they paid. The experience must
feel like a private consultation with a serious professional tool.

The reference test for every component:
"Would someone who paid $600 feel embarrassed showing this
screen to their spouse?" If uncertain — rebuild it.

---

### 27B — Layout Decision [DECIDED — LOCKED]

**Desktop (≥1024px):** Three-column grid.
- Column 1 (200px): Cluster navigation sidebar
- Column 2 (1fr): Question panel
- Column 3 (1fr): Document preview panel

The document preview panel is the critical addition.
It shows the document being built as questions are answered.
The client can see their words becoming something real — not
just answering a survey into a void.

**Tablet (768–1023px):** Two-column — sidebar + questions.
Preview as 380px right drawer. Gold left border, close button.

**Mobile (<768px):** Single column.
Sidebar collapses to horizontal scrolling cluster pills.
Preview as full-screen overlay — background #0a0a0a, gold close button.
"See document" button at bottom of each cluster.

Mobile decision rationale: overlay gives the preview panel the
visual weight it deserves when the user actively requests it,
vs. a tab or collapsed section which feels incidental.

---

### 27C — Voice Input Design Decision [DECIDED — LOCKED]

**Previous implementation (commit 63dc9dd):**
Mic icon in the corner of the textarea.
Invisible, no affordance, disappeared on click.
Root cause: getUserMedia permission not awaited before
SpeechRecognition.start().

**New implementation (case file redesign session):**
Full-width bar below each textarea:
- "Speak your answer" labelled button — obvious invitation
- Active: gold pulse animation + 4-bar animated waveform
- Text: "Stop recording" while listening
- Word count right-aligned in bar

**The mic bug fix (3 lines):**
Call navigator.mediaDevices.getUserMedia({audio: true}) first.
Start recognition in the .then() callback, not before.

**Browser support:**
Chrome and Edge: full voice input.
Firefox/unsupported: mic button hidden, one-time notice shown.
Notice dismissed via ×, stored in localStorage
(key: e2go_voice_notice_dismissed).

**Scope [LOCKED]:**
TextArea component only — /apply/* sections.
NOT on /apply/module4 — that page has its own voice sample
system with AI detection. These two systems are separate.

**Why all textareas, not just story/qualifications:**
Spoken answers are authentic. Typed answers are sanitized.
Someone explaining their source of funds out loud says:
"I sold my dental practice in 2019 after 12 years and the
proceeds sat in my RBC account until..."
That is the paper trail narrative the document needs.
The generation engine's humanization layer works better
with authentic source material. All six sections benefit.

---

### 27D — Document Preview Panel [DECIDED]

**Phase 1 (case file redesign session):**
Template-based preview. No API call. No cost.
Structured placeholders mapped to real document sections.
Fill progress bar (2px, gold) moves as answers arrive.
Status badge: "Building" while cluster active, "Waiting" otherwise.
Creates the psychological experience of building something real.

**Phase 2 (after first paying user):**
Live AI paragraph generation per cluster.
API call after each cluster completes — streams paragraph
into right panel. Cost ~$0.05–$0.75 per user session.
Deferred until first paying user confirmed.

**Document-to-cluster mapping:**
Each section's preview shows only the documents that section feeds.
Full mapping in docs/sessions/SESSION_CASEFILE_REDESIGN.md Step 5.
Do not show a document in preview that this section doesn't feed.

---

### 27E — Component Architecture [DECIDED]

**New shared component:** src/components/apply/CaseFileShell.tsx
Owns: topbar, sidebar nav, three-column grid, responsive behaviour,
document preview panel structure.

Section pages pass in: cluster list, active cluster, documents
list, question panel content (children), preview content.

**Preserve exactly:**
- useSpeechInput hook (logic only — UI wrapping changes)
- PreFillBadge (all three variants)
- AdvisoryBlock (restyle to match new system)
- RiskFlag (restyle to match new system)
- All conditional rendering logic (partnership, COS, family)
- All data hooks and auto-save mechanisms

**The non-negotiable rule:**
Visual layer and data layer are completely separated.
The redesign only touches what the user sees.
It does not touch what the database receives.

---

### 27F — Scope Clarification (What Was Almost Missed) [NOTED]

Four surfaces initially overlooked, added after strategic review:

1. **Upload flow** (/apply/upload through /apply/upload/gaps)
   Self-preparers see these before the six sections.
   If upload looks like a draft and sections look premium,
   the client journey breaks at the entry point.
   Visual consistency required — data logic untouched.

2. **Module 4 textarea** (/apply/module4)
   Uses raw <textarea> HTML element.
   Will look out of place after TextArea redesign.
   Needs matching surface treatment only — no mic, no logic changes.

3. **Mobile strategy** requires a specific decision before build.
   Decision made: horizontal cluster pills + full-screen overlay.
   Cannot be improvised during the build.

4. **Partnership, COS, and family variants are not edge cases.**
   They represent paying clients.
   The redesign must treat them as first-class, not afterthoughts.

---

### 27G — Why This Is Product, Not Polish [DECIDED]

A client approaching a consular interview is under real pressure.
The platform they use to prepare must communicate competence
and seriousness in every interaction.

When the question label is Cormorant Garamond at the right weight,
the client reads it differently. It carries more authority.
When the document preview fills in as they type, they understand
the stakes of their answers differently. The form becomes a document.

This is why the UX redesign is not polish. It is product.

---

*Section 27 added: June 10, 2026*
*All decisions locked. Build session file at docs/sessions/SESSION_CASEFILE_REDESIGN.md*
