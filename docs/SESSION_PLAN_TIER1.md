# e2go.app — Session Plan: Tier 1 (Critical)
## Rewritten with full Claude Code superpower usage
**Updated:** June 4, 2026
**These four sessions must be completed before anything else.**
**Run in order. Each must be committed and build-clean before the next starts.**

---

## MANDATORY SUPERPOWER SEQUENCE (applies to every UI task)

Every session that touches UI must follow this sequence without exception:
1. Lazyweb MCP → research the pattern in 257K+ real app screens
2. Firecrawl MCP → clone a reference site for design patterns
3. Magic MCP → generate the React component from research
4. Skills: ui-ux-pro-max + full-output-enforcement → active for all output
5. Playwright MCP → screenshot localhost:3000/[page] → confirm visually

Never skip any step. Never build UI before steps 1 and 2 are done.

---

## SESSION S1 — Quiz UI Fixes
**Priority:** 🔴 CRITICAL
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Affects:** Every user — the quiz is the most-seen page in the app

**What:**
Fix two visual bugs that contradict the Obsidian Gold design system:
1. Progress bar is rendering blue — must be gold #C9A84C
2. Option buttons are white cards — must be gold border on dark background

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Magic, Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html — Obsidian Gold design system.

This session fixes two visual bugs in the quiz. No new features.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"quiz progress bar gold dark theme"
"quiz option button selected state dark background"
"eligibility quiz card selection UI dark"

Study the patterns returned. Note how high-quality apps handle:
- Progress bars in dark luxury UIs
- Option button selected vs. unselected states
- Hover states on selectable cards in dark themes

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape the UI patterns from:
https://stripe.com/atlas (onboarding/quiz flow)

Note how Stripe handles:
- Step progress indicators
- Option selection cards
- Active/selected states

---

STEP 3 — LOCATE THE BUGS

Find the quiz component files. Search for:
- The progress bar component or inline style
- The option button / answer card component

List every file that contains a color value that is:
- Blue (#0D9488, #3B82F6, teal, or any non-gold accent)
- White background on quiz option buttons

---

STEP 4 — FIX PROGRESS BAR

Find every instance of the progress bar in:
src/app/quiz/ (all files)
src/components/ (all quiz-related components)

Replace every blue or teal progress bar color with:
background: #C9A84C
The fill portion of the bar must be #C9A84C.
The unfilled track must be rgba(201,168,76,0.1).
No rounded corners on the bar or track (border-radius: 0).

---

STEP 5 — FIX OPTION BUTTONS

Use Magic MCP to generate a gold-border option button component.
Describe to Magic:
"A selectable answer card for an immigration eligibility quiz.
Dark background #0a0a0a. Unselected state: border 0.5px solid
rgba(201,168,76,0.2), background rgba(201,168,76,0.02), text #f5f0e8.
Hover state: border rgba(201,168,76,0.5), background rgba(201,168,76,0.05).
Selected state: border 1px solid #C9A84C, background rgba(201,168,76,0.10),
gold left accent bar 2px. No rounded corners anywhere.
Font: DM Sans 300. No white backgrounds. No shadows."

Use the Magic output as the base. Apply it to the existing quiz
option button component. Do not rebuild the quiz logic — only
replace the visual styling of the option buttons.

Confirm: no white backgrounds anywhere on the quiz page.
Confirm: no blue or teal anywhere on the quiz page.

---

STEP 6 — PLAYWRIGHT VERIFICATION

Use Playwright to:
1. Navigate to localhost:3000/quiz
2. Screenshot the initial state (progress bar + first question)
3. Click one option button — screenshot the selected state
4. Advance one question — screenshot progress bar at step 2

Confirm in the screenshots:
- Progress bar is gold #C9A84C
- Unselected options: dark with gold border
- Selected option: gold accent, darker background, no white

If anything is wrong, fix before committing.

---

STEP 7 — GLOBAL CHECK

Search entire codebase for any remaining blue or teal in:
- Progress bars
- Active states
- Accent colors

Replace all with #C9A84C.
This is a one-time global sweep.

---

Commit after Playwright confirms visually correct:
"fix: quiz progress bar gold #C9A84C, option buttons Obsidian Gold style"
git push origin dev
```

---

## SESSION S2 — Results Page: Eligibility Signals Only
**Priority:** 🔴 CRITICAL
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12I
**Affects:** Every user who completes the quiz

**What:**
The results page must show eligibility signals only.
Any language suggesting case strength, investment quality, or
likelihood of approval must be removed or deferred to Module 4.
The results page opens the door. The confidence score tells them
how prepared they are to walk through it. These are different things.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Magic, Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 12I carefully before touching any file.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"eligibility result screen SaaS onboarding dark"
"qualification outcome page proceed with conditions UI"
"application result state approved warning dark theme"

Study how high-quality apps communicate:
- A clear positive result (proceed)
- A conditional result (proceed with risk)
- A result that requires additional steps (attorney recommended)
Without implying final outcomes or making strength claims.

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.turbotax.com (their eligibility/result screens)
https://www.deel.com (their onboarding outcome screens)

Note how they communicate:
- Next steps clearly
- Conditions or flags without alarming language
- CTAs that move the user forward

---

STEP 3 — AUDIT THE CURRENT RESULTS PAGE

Open src/app/results/page.tsx (or equivalent file).

Read every line of copy on the page.
List every instance of:
- Strength language: "strong", "solid", "excellent", "looks good",
  "well positioned", "favorable"
- Score displays: any percentage, number, or rating shown to user
- Dimension assessments: any reference to investment strength,
  fund source quality, qualifications adequacy
- Outcome predictions: any language implying approval likelihood

---

STEP 4 — COPY REWRITE RULES

For every item found in Step 3, apply these rules:

REMOVE entirely:
- Scores, percentages, ratings
- Any sentence that says "your [X] looks [strong/good/solid]"
- Any dimension-level assessment

REPLACE strength language with eligibility language:
Before: "Your investment amount looks strong for E-2."
After:  "Your investment amount is within the E-2 range."

Before: "You appear well-qualified for this application."
After:  "Based on your answers, you can proceed with your application."

KEEP:
- The outcome label: Proceed / Proceed with Risk /
  Attorney Recommended / Do Not Proceed
- Which specific flags were triggered and what they mean
  (e.g. "Prior visa refusal flagged — this will need to be
  addressed in your application")
- What the next step is
- The CTA button

ADD where missing:
One line, muted style, beneath the outcome:
"Your full case strength assessment will be available once
you complete your application profile."

---

STEP 5 — USE MAGIC MCP FOR UPDATED UI

Use Magic MCP to generate updated result cards for each outcome state.
Describe to Magic:
"Four outcome state cards for an immigration eligibility result page.
Dark background #0a0a0a. Gold accent #C9A84C. Text #f5f0e8.
Card 1 — Proceed: green-tinted left border, headline 'You are eligible
to apply for E-2', subtext with next step, gold CTA button.
Card 2 — Proceed with Risk: amber-tinted left border, headline
'You may be eligible — review flagged items', list of flagged items
in small text, gold CTA.
Card 3 — Attorney Recommended: amber border, headline
'We recommend speaking with an immigration consultant before proceeding',
explanation text, CTA to continue anyway or find a consultant.
Card 4 — Do Not Proceed: muted red left border, clear explanation
of which hard stop was triggered, no CTA to proceed.
No rounded corners. DM Sans 300 body, Cormorant Garamond headings."

Use the Magic output as the base for the updated results page.

---

STEP 6 — PLAYWRIGHT VERIFICATION

Use Playwright to:
1. Complete the quiz with a clean eligible profile
   Screenshot the Proceed result state
2. Modify quiz answers to trigger a risk flag
   Screenshot the Proceed with Risk state
3. Confirm no strength language appears in any state
4. Confirm the deferred assessment line appears in all states

If anything contradicts IDEAS.md 12I, fix before committing.

---

Commit after Playwright confirms all four states:
"fix: results page — eligibility signals only, strength language deferred to Module 4"
git push origin dev
```

---

## SESSION S3 — Pricing Tier Pre-Selection
**Priority:** 🔴 CRITICAL
**Estimated time:** 3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12B
**Affects:** Every user who reaches the pricing page

**What:**
The pricing page currently shows all seven tiers and asks the user
to choose. The correct tier is already known from quiz answers.
Pre-select it. Show a warm explanation. Let the user change it.
Never make the user figure out their own tier from scratch.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Magic, Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 12B carefully before touching any file.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"pricing page pre-selected tier recommended plan dark"
"SaaS pricing recommended plan highlighted UI"
"pricing plan auto-selected based on user data"

Study how high-quality apps handle:
- Pre-selecting a tier based on known user data
- Highlighting the recommended plan without being pushy
- Allowing the user to easily switch tiers
- Explaining WHY this tier was selected

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com/pricing
https://stripe.com/pricing

Note specifically:
- How they visually distinguish the recommended/highlighted tier
- How they handle "most popular" or "recommended for you" labelling
- How other tiers remain visible and accessible

---

STEP 3 — BUILD THE TIER MAPPING FUNCTION

Create or update src/lib/pricing-tier.ts

Build a pure function: getPricingTier(quizData) → tier

Mapping logic:
  application_type = "solo":
    family = none                → Solo Individual      $297
    family = spouse_only         → Solo + Spouse        $347
    family = spouse + 1-2 kids   → Solo Family ≤2 kids  $397
    family = spouse + 3-5 kids   → Solo Family 3-5 kids $447
  application_type = "partnership":
    family = no families         → Partnership          $497
    family = two_couples         → Partnership Couples  $547
    family = two_full_families   → Partnership Families $647

Data sources (in priority order):
  1. Supabase quiz_sessions table — if user is signed in
  2. localStorage key "e2go_quiz_result" — if not yet signed in
  3. null — no pre-selection, show all tiers equally

Write a unit test for all 7 mapping cases.
Run the test. Confirm all 7 pass.

---

STEP 4 — USE MAGIC MCP FOR UPDATED PRICING CARD

Use Magic MCP to generate a highlighted pricing card component.
Describe to Magic:
"A pricing card for an immigration preparation app. Dark background
#0a0a0a. Gold accent #C9A84C. Text #f5f0e8. DM Sans 300.
The highlighted/recommended card has: animated gold gradient border,
a subtle label at the top 'Your plan — based on your eligibility check',
the plan name in Cormorant Garamond italic 24px, price in gold,
feature list with gold checkmarks. A gold filled CTA button.
No rounded corners. The non-highlighted cards are identical in
structure but with muted border rgba(201,168,76,0.15) and no label.
The highlighted card has a very subtle gold glow — nothing garish."

Use the animated-gradient-border component from
docs/animated-gradient-border.md for the highlighted card border.
Colors: primary #8B6914, secondary #C9A84C, accent #E8D5A3.
Speed: 10. Border-radius: 0.

Use the Magic output as the base. Apply to the pricing page.

---

STEP 5 — WIRE THE TIER MAPPING TO THE PAGE

Update src/app/pricing/page.tsx:

On page load:
  Call getPricingTier() with quiz session data.
  If a tier is returned: scroll to that card, highlight it,
  show the label "Your plan — based on your eligibility check."
  All other cards remain visible below and above.

If the user clicks a different tier:
  Move the highlight to that card.
  Change the label to "Selected plan."
  Do not re-run the mapping — respect the user's choice.

If no quiz data available:
  Show all tiers equally. No pre-selection. No label.
  Small note at top: "Take our eligibility quiz to see
  which plan applies to your situation."

---

STEP 6 — PLAYWRIGHT VERIFICATION

Use Playwright to:
1. Set localStorage "e2go_quiz_result" with a solo + spouse profile
   Navigate to localhost:3000/pricing
   Screenshot — confirm Solo + Spouse is highlighted with label

2. Set localStorage with a partnership profile
   Navigate to localhost:3000/pricing
   Screenshot — confirm Partnership tier is highlighted

3. Clear localStorage
   Navigate to localhost:3000/pricing
   Screenshot — confirm no pre-selection, quiz prompt shown

4. Click a different tier on a pre-selected page
   Screenshot — confirm highlight moves correctly

If any state is wrong, fix before committing.

---

Commit after all four Playwright states confirmed:
"feat: pricing page pre-selects correct tier from quiz session data"
git push origin dev
```

---

## SESSION S4 — Pre-Application Checklist Pre-Fill
**Priority:** 🔴 CRITICAL
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 12A
**Affects:** Every user who enters the application flow

**What:**
The /apply/checklist page currently shows a generic static list.
Everything needed to personalise it already exists in the quiz session.
Pre-fill it. Show warm notes explaining what was pre-filled and why.
The user should feel the app was built specifically for them —
not handed a generic checklist that may or may not apply.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Magic, Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 12A carefully before touching any file.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"personalised checklist pre-filled user data dark UI"
"document checklist immigration app dark theme"
"onboarding checklist dynamic conditional items"
"pre-filled form field edit affordance dark luxury UI"

Study how high-quality apps handle:
- Checklist items that are conditionally shown vs. hidden
- Pre-filled values with a subtle "why" explanation
- The edit/override affordance for pre-filled items
- How to show a warm personalised note without being intrusive

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com (their document collection checklist)
https://www.turbotax.com (their document checklist — most relevant)

Note specifically:
- How they show pre-filled or already-known items
- How they differentiate required vs. optional items
- How they handle conditional items (shown/hidden based on prior answers)
- The visual weight of checklist items and their status states

---

STEP 3 — BUILD THE CHECKLIST DATA FUNCTION

Create src/lib/checklist-generator.ts

Build a function: generatePreAppChecklist(quizData) → ChecklistItem[]

Each ChecklistItem has:
  id: string
  document: string
  condition: string (always / if_married / if_divorced / etc.)
  source: "always" | "pre-filled" | "quiz-derived"
  prefillNote: string | null
  required: boolean
  tabReference: string (e.g. "Tab B")

Conditional logic:

ALWAYS include (source: "always"):
  - Valid Canadian passport
    (if passport expiry within 12 months of today: add warning flag)
  - Two passport-style photographs
  - Canadian birth certificate (certified copy)
  - DS-160 confirmation page (after submission)
  - DS-156E form (principal applicant)
  - MRV fee receipt
  - Appointment confirmation letter

INCLUDE if quiz Q0-17 = married (source: "pre-filled"):
  - Marriage certificate (certified/notarized copy)
  prefillNote: "We know you are married from your eligibility check.
  One certified copy of your marriage certificate is required."

INCLUDE if quiz family_composition includes prior divorce:
  - Divorce certificate (certified/notarized copy)
  prefillNote: "A prior marriage was indicated in your eligibility check."

INCLUDE if quiz Q0-16 = spouse applying (source: "pre-filled"):
  - Spouse's passport biographical page (copy)
  - Spouse's birth certificate (certified copy)
  prefillNote: "Your spouse is listed as a dependent in your
  eligibility check."
  Note on marriage certificate: "Same document as above —
  one certified copy covers both requirements."

INCLUDE for each child applying (source: "pre-filled"):
  - Child's passport biographical page (copy)
  - Child's birth certificate (certified copy)
  prefillNote: "[N] dependent children were indicated in your
  eligibility check."

CHANGE items if quiz Q0-03 = "currently in the U.S.":
  Remove: appointment confirmation letter, MRV fee receipt
  Add: I-94 record (print from i94.cbp.dhs.gov)
  Add: Current visa status documentation
  prefillNote: "You indicated you are currently in the United States.
  Your checklist reflects a Change of Status application."

INCLUDE if quiz Q0-09 = partnership:
  - Business partner's passport biographical page
  prefillNote: "A business partner was indicated in your
  eligibility check."

---

STEP 4 — USE MAGIC MCP FOR CHECKLIST UI

Use Magic MCP to generate the checklist component.
Describe to Magic:
"A personalised document checklist for an immigration preparation app.
Dark background #0a0a0a. Gold accent #C9A84C. Text #f5f0e8. DM Sans 300.
Each checklist item has: a checkbox (unchecked by default), document name
in medium weight, an optional gold badge 'Pre-filled' for items derived
from prior answers, an optional subtle note in small muted text explaining
why the item is on the list. Items that share a document across sections
have a small info icon with a tooltip explaining this. A 'Remove' option
(small, muted) appears on hover for non-required items.
A section at the bottom: 'Hidden items (N)' — collapsed, expandable.
No rounded corners. Clean, structured, feels like a professional
legal document checklist, not a generic to-do list."

Use the Magic output as the base.

---

STEP 5 — WIRE TO THE PAGE

Update src/app/apply/checklist/page.tsx:

On page load:
  Read quiz session from Supabase (if signed in) or
  localStorage "e2go_quiz_result" (if not signed in).
  Call generatePreAppChecklist(quizData).
  Render the returned items.

If no quiz data:
  Show a minimal generic checklist with a prompt:
  "Complete your eligibility check to see a personalised checklist."

Add a summary line at the top of the checklist:
  "This checklist was built from your eligibility check answers.
  Items marked 'Pre-filled' were added automatically based on
  what you told us. Remove any item that does not apply."

Checklist item states:
  Unchecked (default)
  Checked (user has gathered this document)
  Removed (user dismissed — moves to hidden items)
  Warning (passport expiry flag — amber, not red)

Persist checklist state to Supabase answers table or
localStorage so progress is not lost on page reload.

---

STEP 6 — PLAYWRIGHT VERIFICATION

Use Playwright to:

1. Set localStorage with married solo + spouse + 1 child profile
   Navigate to localhost:3000/apply/checklist
   Screenshot — confirm marriage cert, spouse docs, child docs visible
   Confirm pre-fill notes appear on relevant items
   Confirm marriage certificate has cross-tab note

2. Set localStorage with single no-family profile
   Navigate to localhost:3000/apply/checklist
   Screenshot — confirm no spouse or child items appear

3. Set localStorage with U.S.-based Change of Status profile
   Navigate to localhost:3000/apply/checklist
   Screenshot — confirm I-94, remove appointment letter and MRV receipt

4. Clear localStorage
   Navigate to localhost:3000/apply/checklist
   Screenshot — confirm generic list with quiz prompt shown

5. On a pre-filled checklist: click Remove on one pre-filled item
   Screenshot — confirm item moves to Hidden items section

If any state is wrong, fix before committing.

---

Commit after all five Playwright states confirmed:
"feat: pre-application checklist pre-fills from quiz session — personalised from day one"
git push origin dev
```

---

## TIER 1 COMPLETION CHECK

Before moving to Tier 2, confirm all four of these are done:

| Session | What | Commit | Build clean |
|---|---|---|---|
| S1 | Quiz UI — gold progress bar + option buttons | ⬜ | ⬜ |
| S2 | Results page — eligibility signals only | ⬜ | ⬜ |
| S3 | Pricing page — correct tier pre-selected | ⬜ | ⬜ |
| S4 | Checklist — pre-filled from quiz session | ⬜ | ⬜ |

Run npm run build after each session.
Run Playwright screenshot after each session.
Do not start Tier 2 until all four rows are checked.

---

*File: ~/E2-go/docs/SESSION_PLAN_TIER1.md*
*Part of the full SESSION_PLAN.md — replace Tier 1 section with this content.*
