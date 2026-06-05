# e2go.app — Session Plan: Tier 4 (UX Improvements)
## Full superpower sequence — no Magic MCP
**Updated:** June 4, 2026
**Prerequisite:** Tier 3 complete (S9–S11 all committed, build clean)
**Run in order. Each must be committed and build-clean before the next starts.**

---

## SESSION S12 — Journey Wizard: Stage-Aware Timeline Shifting
**Priority:** 🟢 MEDIUM
**Estimated time:** 2–3 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 3

**What:**
The "where are you now" selector in the journey wizard currently
does nothing to the timelines. It must collapse past milestones
dynamically based on where the user actually is in their journey.
If they have already formed their LLC, those weeks should disappear
from the timeline — not sit there as future tasks.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 3 — the journey wizard FIX NEEDED note.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"timeline progress collapsed completed steps dark UI"
"multi-step journey current stage selector dark theme"
"progress timeline conditional milestones dark luxury"

Study how high-quality apps handle:
- Timelines that collapse or grey out completed phases
- A stage selector that dynamically shifts what is shown
- The visual distinction between past/complete, current, and future
- Gap indicators that recalculate when stages are collapsed

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.deel.com (their onboarding progress timeline)
https://stripe.com/atlas (their business formation progress steps)

Note specifically:
- How they show completed phases vs. remaining phases
- How the timeline compresses when early steps are already done
- The visual weight of the "you are here" marker

---

STEP 3 — LOCATE THE JOURNEY WIZARD

Find the journey wizard component in the codebase.
It may be in:
  src/components/JourneyWizard.tsx or similar
  src/app/results/ (if it renders post-quiz)
  src/app/page.tsx (if it renders on landing page)

Read the current implementation fully.
List:
  - Where the "where are you now" selector is defined
  - What the four stage options are
  - Whether any stage-switching logic currently exists
  - Where milestone data is defined (hardcoded or from a function)

Report findings before writing any code.

---

STEP 4 — BUILD THE STAGE COLLAPSE LOGIC

The four stage options and their collapse rules:

Stage 0 — "Just exploring":
  Show full e2go timeline — all milestones visible.
  Show full traditional timeline for comparison.
  Gap indicator: full calculation (e2go saves ~21 weeks).

Stage 1 — "Business identified":
  e2go track: collapse milestones 0–2 (research, business advisor,
  business discovery). Timeline starts at "Business selected."
  Remove those weeks from the gap calculation.
  Traditional track: show greyed-out with label
  "Traditional route: still in discovery phase."
  Gap recalculates: e2go saves ~17 weeks from this point.

Stage 2 — "LLC / company formed":
  e2go track: collapse milestones 0–3 (all of Stage 1 plus
  LLC and banking formation). Timeline starts at
  "Document interview."
  Remove formation weeks from gap calculation.
  Traditional track: show with label
  "Traditional route: still completing formation."
  Gap recalculates: e2go saves ~13 weeks from this point.
  Banner: "You're already ahead of most applicants at this stage."

Stage 3 — "Documents started":
  e2go track: show only remaining milestones:
  Generation → Review → Interview prep →
  Application submitted → Interview → Visa.
  Traditional track: show collapsed with label
  "Traditional route: significantly behind at this stage."
  Gap recalculates: e2go saves ~8 weeks from this point.
  Banner: "You're ahead of the traditional route timeline."

For each stage:
  Collapsed milestones are removed entirely — not greyed out.
  The gap indicator number updates to reflect remaining weeks only.
  The target date calculation remains anchored to the
  working_target_date from the DB (or localStorage if not signed in).
  Milestone dates recalculate from today, not from the original start.

---

STEP 5 — BUILD THE STAGE SELECTOR UI

The stage selector must feel like a deliberate choice, not a dropdown.
Build it as four horizontal option cards:

  "Just exploring"
  "Business identified"
  "LLC formed"
  "Documents started"

Styling (Obsidian Gold):
  Unselected: border 0.5px solid rgba(201,168,76,0.2),
              background rgba(201,168,76,0.02)
  Selected: border 1px solid #C9A84C,
            background rgba(201,168,76,0.08),
            gold left accent bar 2px
  No rounded corners.
  Font: DM Sans 300, 13px
  On select: timeline updates immediately (no submit button)

On stage change:
  Animate the collapse of removed milestones
  (CSS height transition — no animation library needed)
  Update gap indicator number with a brief fade
  Update any banner text

---

STEP 6 — PERSIST STAGE SELECTION

If user is signed in:
  Save selected stage to applications table as
  journey_wizard_stage (add column if not exists,
  IF NOT EXISTS — never DROP)

If user is not signed in:
  Save to localStorage key "e2go_journey_stage"

On wizard load:
  Read persisted stage and pre-select it
  Render the correct collapsed state immediately

---

STEP 7 — PLAYWRIGHT VERIFICATION

Test 1 — Stage 0 (just exploring):
  Select "Just exploring"
  Screenshot — confirm full timeline shown, all milestones visible
  Confirm gap indicator shows full ~21 week saving

Test 2 — Stage 1 (business identified):
  Select "Business identified"
  Screenshot — confirm first 3 milestones collapsed
  Confirm gap indicator recalculated
  Confirm traditional track shows "still in discovery" label

Test 3 — Stage 2 (LLC formed):
  Select "LLC formed"
  Screenshot — confirm formation milestones also collapsed
  Confirm "ahead of most applicants" banner visible
  Confirm gap indicator recalculated again

Test 4 — Stage 3 (documents started):
  Select "Documents started"
  Screenshot — confirm only remaining milestones shown
  Confirm "ahead of traditional route" banner
  Confirm traditional track shows "significantly behind" label

Test 5 — Stage persists on reload:
  Select Stage 2, reload page
  Screenshot — confirm Stage 2 is pre-selected and timeline
  renders correctly without flash of full timeline

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: journey wizard stage selector collapses completed phases dynamically"
git push origin dev
```

---

## SESSION S13 — Landing Page: Comparison Section
**Priority:** 🟢 MEDIUM
**Estimated time:** 3–4 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 2

**What:**
Build the traditional vs. e2go comparison section on the landing
page as a proper Next.js component. Two parallel vertical columns.
Traditional route on the left — friction, time, cost visible.
e2go route on the right — same journey, compressed, guided.
This is one of the most important marketing moments on the site.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read IDEAS.md Section 2 — comparison diagrams, Option B recommended.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"before after comparison two column dark landing page"
"traditional vs modern approach comparison section dark"
"old way new way parallel timeline landing page dark"
"versus comparison section SaaS dark luxury UI"

Study at least 6 results. Note specifically:
- How the visual weight difference between columns creates
  emotional impact before anyone reads a word
- How friction markers (time, cost, effort) are shown
  on the traditional side without being cluttered
- How acceleration markers work on the modern side
- Summary stat treatments at the bottom of the section

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape these three sites:
https://www.deel.com (their "old way vs Deel" section)
https://stripe.com/atlas (their comparison section)
https://www.rippling.com (their traditional vs modern comparison)

For each site note:
- Column structure and visual hierarchy
- How steps are shown (numbered, dotted line, icon)
- How time and cost are displayed
- The CTA placement relative to the comparison

---

STEP 3 — BUILD THE COMPONENT

Create src/components/landing/ComparisonSection.tsx

Use the research from Steps 1 and 2 as the design reference.
Apply ui-ux-pro-max skill — this is a hero-level marketing component.

Structure:
  Section wrapper: background #0a0a0a, padding 80px 0
  Eyebrow: "Two paths. One destination." — gold, 11px, uppercase,
           letter-spacing 0.18em
  Headline: Cormorant Garamond Light italic, 40px:
           "The traditional route. And the better one."
  Two columns below, equal width, separated by a subtle
  vertical gold line rgba(201,168,76,0.15):

LEFT COLUMN — Traditional route:
  Column header: "The traditional route"
  Muted treatment — rgba(245,240,232,0.5) text
  Steps (numbered 1–8):
    1. Research E-2 eligibility (2–4 weeks)
    2. Find a franchise broker (1–2 weeks)
    3. Business discovery (8–16 weeks)
    4. LLC formation + banking (4–6 weeks)
    5. Find an immigration consultant (1–2 weeks)
    6. Document gathering (4–6 weeks)
    7. Consultant drafts documents (3–5 weeks)
    8. Consulate interview (wait + attend)
  Each step: small numbered circle muted, step name,
  time cost in smaller muted text below
  Friction markers on steps 3, 6, 7:
    Small red/amber dot + "High effort" or "Slow"
  Summary at column bottom:
    "9–14 months total"
    "$12,000–$25,000 in fees"
    Both in muted large text

RIGHT COLUMN — e2go route:
  Column header: "The e2go route"
  Gold treatment — #C9A84C accents
  Steps (numbered 1–8, same count, same milestones):
    1. Eligibility confirmed (10 minutes)
    2. Franchise connector briefed (same day)
    3. Focused business discovery (4–6 weeks)
    4. LLC + banking via specialist referral (2–3 weeks)
    5. Document interview (guided, in-app)
    6. Analysis + gap conversation (automated)
    7. Documents generated and reviewed (days)
    8. Interview simulator + consulate (prepared)
  Each step: gold numbered circle, step name,
  time saving in gold text below
  Acceleration markers on steps 1, 3, 4, 7:
    Small gold dot + "e2go accelerates this"
  Summary at column bottom:
    "4–6 months total"
    "$297–$647"
    Both in gold large text

Gap callout between the two summaries:
  Centered, spanning both columns:
  Large Cormorant Garamond italic:
  "Save up to 8 months."
  Subtext DM Sans 300:
  "Same destination. A fraction of the time and cost."

CTA below:
  Gold filled button: "Check your eligibility — it's free"
  Links to /quiz
  Centered, margin-top 48px

Copy rules:
  Never "attorney" or "lawyer" — use "immigration consultant"
  Never "voice profile" — not relevant here but apply broadly

---

STEP 4 — WIRE INTO LANDING PAGE

Open src/app/page.tsx

Find the correct insertion point:
  After the features/how-it-works section
  Before testimonials or FAQ
  This is the emotional contrast moment — it must come
  after trust is established, before the final CTA

Import ComparisonSection and add it to the page.

Ensure the section is responsive:
  Desktop: two columns side by side
  Mobile (< 768px): stack vertically, traditional first,
  e2go second, gap callout between them

---

STEP 5 — PLAYWRIGHT VERIFICATION

Test 1 — Desktop view:
  Navigate to localhost:3000
  Screenshot full landing page
  Screenshot the comparison section specifically
  Confirm two columns visible, gold line separator visible
  Confirm traditional column is muted, e2go column is gold
  Confirm summary stats and gap callout visible

Test 2 — Mobile view (390px viewport):
  Set viewport to 390px wide
  Navigate to localhost:3000
  Screenshot the comparison section
  Confirm columns stack vertically
  Confirm no horizontal overflow

Test 3 — CTA link:
  Click "Check your eligibility" button
  Confirm navigation to /quiz

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: landing page comparison section — traditional vs e2go two-column"
git push origin dev
```

---

## SESSION S14 — Landing Page: FAQ Section
**Priority:** 🟢 MEDIUM
**Estimated time:** 2 hours
**Status:** ⬜ NOT STARTED
**Reference:** IDEAS.md Section 6

**What:**
Build the FAQ section on the landing page. Six approved questions.
Dark only. Gold accent. No rounded corners. Placed between the
comparison section and the footer.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read docs/faq-monochrome.md — the sourced component reference.
Do not use Magic MCP this session.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"FAQ accordion dark luxury UI gold accent"
"frequently asked questions dark theme minimal"
"FAQ section dark monochrome SaaS landing page"

Study how high-quality apps handle:
- FAQ accordion open/close interaction
- The visual weight of question vs. answer
- Hover states on dark backgrounds
- The transition animation for expanding answers

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://stripe.com (their FAQ section at the bottom of pricing page)
https://www.notion.so/pricing (their FAQ section)

Note specifically:
- The border treatment between FAQ items
- Whether they use icons for open/close or text
- The typography hierarchy between question and answer
- How much padding each item has

---

STEP 3 — BUILD THE FAQ COMPONENT

Create src/components/landing/FAQSection.tsx

Use the faq-monochrome.md reference and the research from
Steps 1 and 2. Apply ui-ux-pro-max skill.

Structure:
  Section wrapper: background #0a0a0a, padding 80px 0
  Eyebrow: "Common questions" — gold, 11px, uppercase,
           letter-spacing 0.18em
  Headline: Cormorant Garamond Light, 36px:
           "Everything you need to know."
  FAQ list below — max width 720px, centered

Each FAQ item:
  Border-bottom: 0.5px solid rgba(201,168,76,0.12)
  No border on first item top
  Question row:
    Question text: DM Sans 400, 15px, #f5f0e8
    Toggle icon: right-aligned, gold, rotates 45deg when open
    Padding: 20px 0
    Hover: question text color → #C9A84C (transition 0.15s)
    Cursor: pointer
  Answer panel:
    DM Sans 300, 14px, rgba(245,240,232,0.6)
    Line height 1.7
    Padding: 0 0 20px 0
    Hidden by default, expands on click
    CSS height transition — no animation library
    No background change on open

Interaction:
  Only one FAQ open at a time
  Opening one closes any currently open item
  Smooth height transition using CSS max-height trick

Dark only — no light mode toggle.
Swap any white accents in faq-monochrome.md reference for #C9A84C.
No rounded corners anywhere.

Six questions and answers (copy exactly):

Q1: "Is this a law firm?"
A1: "No. e2go prepares documents. What you do with your
finished package is entirely up to you. If you choose to
have an immigration consultant review it at this stage,
it's a 2-hour job — not a 20-hour one."

Q2: "What if I'm denied?"
A2: "We test every document against 15 real denial patterns
before you ever see them. We can't guarantee an outcome —
no one can. But we can make sure your preparation isn't
the reason."

Q3: "How is this different from hiring a consultant?"
A3: "A consultant works on one case at a time, in their
own way. e2go applies the same preparation discipline to
every case, every time — tested against every denial
pattern in our knowledge base and reviewed by you before
a single document leaves the platform."

Q4: "Is my data secure?"
A4: "We never store your passports, bank statements, or
financial records. Only your answers. Your documents are
generated, reviewed by you, and downloaded. They belong
to you entirely."

Q5: "What countries are eligible?"
A5: "E-2 is available to citizens of 82 treaty countries.
Our eligibility quiz confirms your specific country and
consulate in the first question — it takes under a minute."

Q6: "How long does the whole process take?"
A6: "Your documents are typically ready within days of
completing your application profile. The overall timeline
— business formation, consulate appointment, visa
processing — depends on your starting point. Our journey
planner shows you a personalised timeline the moment you
complete the quiz."

---

STEP 4 — WIRE INTO LANDING PAGE

Open src/app/page.tsx

Insert FAQSection after ComparisonSection (S13) and
before the footer.

Ensure correct import and no TypeScript errors.

---

STEP 5 — PLAYWRIGHT VERIFICATION

Test 1 — Initial state:
  Navigate to localhost:3000
  Scroll to FAQ section
  Screenshot — confirm all 6 questions visible, all closed
  Confirm gold eyebrow and headline visible

Test 2 — Open one FAQ:
  Click Q1 "Is this a law firm?"
  Screenshot — confirm answer expands smoothly
  Confirm toggle icon rotated

Test 3 — Open second FAQ closes first:
  With Q1 open, click Q2 "What if I'm denied?"
  Screenshot — confirm Q1 closes and Q2 opens
  Confirm only one item open at a time

Test 4 — Mobile view (390px):
  Set viewport to 390px
  Screenshot FAQ section
  Confirm no horizontal overflow
  Confirm questions readable at mobile size

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: landing page FAQ section — 6 questions, Obsidian Gold, accordion"
git push origin dev
```

---

## SESSION S15 — PDF Export + ZIP Download
**Priority:** 🟢 MEDIUM
**Estimated time:** 4–5 hours
**Status:** ⬜ NOT STARTED
**Reference:** BUILD_TRACKER.md, docs/Spec4_Quality_Gate_Pipeline.md

**What:**
Wire the document generation pipeline output to a downloadable
PDF export and ZIP package. This is the moment the user gets their
embassy-ready binder. The 5-checkbox acknowledgment gate must be
complete before the download is enabled.

---

**PASTE THIS INTO CLAUDE CODE:**

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, docs/IDEAS.md.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Read docs/DESIGN_REFERENCE.html.
Read docs/Spec4_Quality_Gate_Pipeline.md fully.
Read src/app/documents/[applicationId]/page.tsx fully.
Read src/lib/generation-engine.ts — understand where documents
are stored after generation.
Do not use Magic MCP this session.

Use Sequential Thinking MCP to plan the full implementation
before writing any code. Think through:
  1. Where are generated documents stored after generation?
     Which DB table, which columns?
  2. What format are they stored in — raw text, HTML, JSON?
  3. What is the 5-checkbox acknowledgment gate current state?
     Is it already implemented or does it need to be built?
  4. What PDF library is available — neat-pdf, puppeteer, or other?
  5. What is the correct binder assembly order?
  6. How is metadata stripped before download?
Report the plan. Wait for confirmation before proceeding.

---

STEP 1 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
"document package download progress dark UI"
"file download ZIP progress indicator dark theme"
"embassy package download ready state dark luxury"

Study how high-quality apps handle:
- A significant file download moment (not just a button)
- Download progress indication
- The "ready to download" state after a process completes
- How they communicate what is in the package

---

STEP 2 — FIRECRAWL REFERENCE

Use Firecrawl to scrape:
https://www.docusign.com (their document download/complete UI)
https://www.hellosign.com (their completed document package UI)

Note specifically:
- How they present a completed document package
- The visual treatment of the download button when ready
- What information they show about what is in the package
- Any confirmation or acknowledgment step before download

---

STEP 3 — CONFIRM DEPENDENCIES

Before writing any PDF code:

Check if neat-pdf is installed:
  pip show neat-pdf
  If not: pip install neat-pdf --break-system-packages

Check if docxtpl is installed:
  pip show docxtpl
  If not: pip install docxtpl --break-system-packages

Check if zipfile is available (standard library — should be):
  python3 -c "import zipfile; print('ok')"

Check Node.js ZIP options if Python path is not viable:
  Check if jszip or archiver is in package.json
  If not: npm install archiver

Report which libraries are available before proceeding.

---

STEP 4 — BUILD THE DOWNLOAD API ROUTE

Create src/app/api/generate/download/[applicationId]/route.ts

This route:
1. Verifies auth — user must own this application
2. Verifies acknowledgment gate — all 5 checkboxes must be
   confirmed in DB before proceeding
3. Reads all approved documents from DB for this application
4. Converts each document to PDF
5. Assembles into a ZIP with correct naming
6. Strips metadata from all PDFs
7. Returns ZIP as a download response

Binder assembly order and file names:
  01-Cover-Letter.pdf              (Tab D)
  02-Source-of-Funds.pdf           (Tab H)
  03-Investment-Proof.pdf          (Tab F)
  04-Business-Plan.pdf             (Tab K)
  05-Qualifications.pdf            (Tab J)
  06-DS160-Reference.pdf           (Tab A)
  07-Ownership-Structure.pdf       (Tab E) if exists
  08-Business-Evidence.pdf         (Tab G) if exists
  09-Non-Marginality.pdf           (Tab I) if exists
  10-Dependents.pdf                (Tab L) if dependents exist
  README-Binder-Assembly.txt

README-Binder-Assembly.txt content:
  "E-2 Visa Application Package
  Prepared: [date]
  Applicant: [applicant name]

  This package contains [N] documents for your E-2 visa
  application. Present documents in the order numbered
  above unless your consulate specifies otherwise.

  Documents prepared using e2go.app. All content
  reviewed and approved by the applicant prior to download.
  This package does not constitute legal advice."

Metadata stripping:
  All PDFs must have:
  Author: "" (blank)
  Creator: "" (blank)
  Producer: "" (blank)
  Keywords: "" (blank)
  No AI tool names in any PDF property.
  Verify with a PDF metadata reader before ZIP assembly.

Error handling:
  If any document is missing or not approved:
    Return 400 with specific error message
    Do not return a partial package
  If PDF conversion fails:
    Log the error, return 500
    Do not return a corrupt PDF

---

STEP 5 — UPDATE THE DOWNLOAD BUTTON UI

Open src/app/documents/[applicationId]/page.tsx

Find or build the download button.

Download button states:
  Locked (acknowledgment incomplete):
    background: rgba(201,168,76,0.1)
    border: 0.5px solid rgba(201,168,76,0.2)
    color: rgba(245,240,232,0.3)
    cursor: not-allowed
    Label: "Complete all confirmations to download"

  Ready (acknowledgment complete):
    background: #C9A84C
    color: #0a0a0a
    cursor: pointer
    Label: "Download your embassy package"
    Subtle gold glow on hover

  Downloading (in progress):
    Show a progress indicator
    Label: "Preparing your package..."
    Spinner or progress bar in gold
    Button disabled during download

  Complete:
    Label: "Package downloaded"
    Show a green-tinted confirmation line below:
    "Your package has been downloaded. Keep it secure."

On click (when ready):
  Call /api/generate/download/[applicationId]
  Stream the response as a file download
  Filename: e2go-embassy-package-[applicantName]-[date].zip

---

STEP 6 — PLAYWRIGHT VERIFICATION

Test 1 — Download button locked state:
  Navigate to documents page with incomplete acknowledgments
  Screenshot — confirm button shows locked state
  Confirm "Complete all confirmations" label visible

Test 2 — Download button ready state:
  Complete all 5 acknowledgment checkboxes
  Screenshot — confirm button changes to gold filled ready state
  Confirm "Download your embassy package" label

Test 3 — Download API response:
  Call the download API route directly with a test applicationId
  Confirm it returns a ZIP file (check Content-Type header)
  Confirm ZIP contains the correct number of PDF files
  Confirm README is present in the ZIP

Test 4 — Metadata check:
  Extract a PDF from the downloaded ZIP
  Check PDF metadata
  Confirm Author, Creator, Producer are all blank
  Confirm no AI tool names present

If any state is wrong, fix before committing.

---

Commit after all Playwright tests pass:
"feat: PDF export and ZIP download — embassy-ready package with metadata stripping"
git push origin dev
```

---

## TIER 4 COMPLETION CHECK

Before moving to Tier 5, confirm all four are done:

| Session | What | Commit | Build clean |
|---|---|---|---|
| S12 | Journey wizard stage collapsing | ⬜ | ⬜ |
| S13 | Landing page comparison section | ⬜ | ⬜ |
| S14 | Landing page FAQ section | ⬜ | ⬜ |
| S15 | PDF export and ZIP download | ⬜ | ⬜ |

Run npm run build after each session.
Run Playwright after each session.
Do not start Tier 5 until all four rows are checked.

---

*File: ~/E2-go/docs/SESSION_PLAN_TIER4.md*
