# E2go — Session: Module 3 Case File Redesign
## Session file for Claude Code
**Date:** June 9, 2026
**Branch:** dev
**Estimated time:** 6–8 hours (run as overnight session)
**Status:** Ready to build

---

## BEFORE YOU START — READ IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/IDEAS.md
```

Then read these specific sections of IDEAS.md:
- Section 13 — Module 3 redesign background and direction
- Section 14 — Full gap audit (34 items)
- Section 15 — Additional client types
- Section 16 — Banking and tax identifiers
- Section 18 — Financial projection table design
- Section 20 — Case file UI decisions (ALL of them)
- Section 21 — Hero fix (separate, do not build this session)

Then read:
```bash
cat docs/DESIGN_REFERENCE.html
cat docs/module3_tab_a.md
cat docs/module3_tabs_b_e.md
cat docs/module3_tabs_f_i.md
cat docs/module3_tabs_j_l.md
cat docs/module3_tabs_revised_and_module5.md
```

Do not write a single line of code until all of the above are read.
Confirm reading complete before proceeding.

---

## GROUND RULES FOR THIS SESSION

1. Existing 12 tabs at /apply/tab-a through /apply/tab-l MUST remain
   fully functional throughout. Do not touch them.
2. New pages are built at new routes in parallel.
3. The routing switch from old tabs to new case file happens ONLY at
   the end after all six new section pages are verified with Playwright.
4. No rounded corners anywhere. No glassmorphism. No gradients.
   No shadows. No blue or teal. Zero exceptions.
5. Every component mobile-first. Test at 390px before 1440px.
6. Pre-fill from quiz data everywhere. Never re-ask what is known.
7. Autosave every answer within 2 seconds — use existing autosave
   infrastructure from the current tabs.
8. Full output on every file. No truncation.
9. No Magic MCP — not available.
10. Read DESIGN_REFERENCE.html before writing any component.

---

## DESIGN SYSTEM — LOCKED

```
Background:   #0a0a0a
Gold:         #C9A84C
Text:         #f5f0e8
Muted:        rgba(245,240,232,0.55)
Muted2:       rgba(245,240,232,0.28)
Surface:      rgba(201,168,76,0.03)
Surface-h:    rgba(201,168,76,0.06)
Border:       rgba(201,168,76,0.12)
Border-h:     rgba(201,168,76,0.30)
Gold-dim:     rgba(201,168,76,0.50)
Gold-faint:   rgba(201,168,76,0.07)
Heading font: Cormorant Garamond 300
Body font:    DM Sans 300/400/500
Radius:       0 — no rounded corners anywhere
```

---

## PHASE 1 — DATABASE ADDITIONS

Run these first. Verify they exist before Phase 2.
Use ADD COLUMN IF NOT EXISTS — never DROP, never ALTER types.

```sql
-- Tracks where each answer came from for pre-fill badge logic
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS source TEXT
CHECK (source IN ('quiz', 'user_entry', 'user_edited'))
DEFAULT 'user_entry';

-- Drives his/her in partnership UI and generated documents
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS partner_gender TEXT
CHECK (partner_gender IN ('man', 'woman'));
```

Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'answers' AND column_name = 'source';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'applications' AND column_name = 'partner_gender';
```

Both must return a row before proceeding.

---

## PHASE 2 — CASE FILE OVERVIEW PAGE

### File to create
`src/app/apply/page.tsx`

This page replaces the existing `/apply/overview` page eventually,
but for now it lives at `/apply` and the old overview stays at its
current route. Do NOT delete the old overview yet.

### What it builds
The six-card dashboard with personalised header, section manifest,
and generate strip. Full spec in IDEAS.md Section 20.

### Pre-fill data sources to load on mount

```typescript
// Load from Supabase on mount
const { data: application } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', user.id)
  .single();

const { data: quizSession } = await supabase
  .from('quiz_sessions')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const { data: answers } = await supabase
  .from('answers')
  .select('question_id, answer_value, source')
  .eq('application_id', application.id);
```

Derive from these:
- `applicantName` — from application or profiles table
- `nationality` — from quiz_sessions answers Q0-01
- `businessName` — from answers where question_id = 'QA-51' or 'QE-01'
- `targetCity` — from answers where question_id = 'QA-52'
- `investmentAmount` — from answers where question_id = 'QF-02'
  or quiz_sessions answers Q0-05
- `applicationType` — from application.application_type
- `lastActiveSection` — from application.last_active_section
  (add this column if not present)
- `sectionCompletion` — calculate % answered per section from answers

### Three data states — implement all three

Read IDEAS.md Section 20 for exact text, component behaviour,
and visual treatment for each state.

State detection logic:
```typescript
const hasFullData = applicantName && nationality && businessName
  && targetCity && investmentAmount;
const hasThinData = applicantName && nationality && !businessName;
const hasNoData = !applicantName && !quizSession;
```

### CaseFileHeader component
Create: `src/components/apply/CaseFileHeader.tsx`

Props:
```typescript
interface CaseFileHeaderProps {
  name: string | null;
  nationality: string | null;
  businessName: string | null;
  targetCity: string | null;
  investmentAmount: string | null;
  applicationType: 'solo' | 'partnership' | 'cos';
  lastActiveSection: string | null;
  lastActiveCluster: number | null;
  isReturning: boolean;
}
```

Layout (see IDEAS.md Section 20 for exact spec):
1. Welcome line — 11px uppercase DM Sans, muted2
2. Name line — Cormorant Garamond 300, 28px
   First name normal colour, surname italic rgba(201,168,76,0.5)
   If no name: "Your E-2 case file." italic gold, 24px
3. Meta chips — render ONLY chips where data exists
   No empty chips, no dashes, no placeholders
   Chips: nationality · "E-2 Treaty Investor" · city · amount · business
4. Gold rule — see exact spec in Section 20
5. Resume/orientation strip

### SectionCard component
Create: `src/components/apply/SectionCard.tsx`

Props:
```typescript
interface SectionCardProps {
  number: string;          // "01", "02", etc. or "S1", "P1" for partnership
  title: string;
  subtitle: string;
  documents: Array<{ label: string; primary: boolean }>;
  prefillCount: number;
  completionPct: number;
  status: 'complete' | 'active' | 'not_started' | 'waiting';
  href: string;
  badge?: string;          // "Shared", "Partner", "COS only" etc.
}
```

Top rule colours:
- complete: #C9A84C full width
- active: rgba(201,168,76,0.6) full width
- not_started: none
- waiting: rgba(245,240,232,0.08)

Gem dots: 4×4px squares. Gold if prefillCount > 0. Grey if 0.
Never render "0 pre-filled" with a gold gem. Grey gem = no data.

### Section manifest assembly

The manifest is assembled from the applicant's profile.
For this session — build solo flow only.
Partnership extensions are Phase 5 (separate build after solo verified).

Solo section manifest (in order):
1. Section 01 — Your story → /apply/story
2. Section 02 — Your business → /apply/business
3. Section 03 — Your investment → /apply/investment
4. Section 04 — Your qualifications → /apply/qualifications
5. Section 05 — Your family (only if dependents in quiz) → /apply/family
6. Section 06 — Your ties → /apply/ties

### GenerateStrip component
Create: `src/components/apply/GenerateStrip.tsx`

Locked until all applicable sections are complete.
Lock message: "Complete all [N] sections to generate your case file"
Unlock message: "Your case file is ready — generate your documents"
Locked button: transparent background, muted2 text, muted border
Unlocked button: gold border, gold text, gold-faint hover

### Mobile behaviour
At 390px:
- Header stacks vertically
- Meta chips wrap, each on its own line
- Section grid collapses to 1 column
- Section cards full width
- Resume strip stacks vertically

---

## PHASE 3 — SECTION INTERIOR LAYOUT

### Shared layout
Create: `src/app/apply/(sections)/layout.tsx`

This wraps all six section pages with the two-panel layout.

Desktop: 196px sidebar + flex-1 question panel, side by side.
Mobile: sidebar collapses to a horizontal cluster progress strip
at the top, question panel below. Sidebar content hidden on mobile
except the cluster name strip.

### SideNav component
Create: `src/components/apply/SectionSideNav.tsx`

Props:
```typescript
interface SectionSideNavProps {
  sectionName: string;
  answeredCount: number;
  totalCount: number;
  clusters: Array<{
    number: number;
    label: string;
    status: 'complete' | 'active' | 'empty';
  }>;
  documents: Array<{
    name: string;
    status: 'building' | 'waiting' | 'complete';
  }>;
}
```

Cluster indicator states:
- complete: green check icon, green border
- active: → character, gold border
- empty: number, standard border

Active item: right-edge 1px gold line, rgba(201,168,76,0.05) background.

Document preview box at bottom:
Border: rgba(201,168,76,0.12), background: #0a0a0a
9px uppercase DM Sans label "Building" above list
Each row: document name (muted) + status (gold for building, muted2 for waiting)

### QuestionPanel component
Create: `src/components/apply/QuestionPanel.tsx`

Top bar: section title (Cormorant Garamond 300, 15px) + cluster tag
(9px uppercase, muted border) + autosave indicator (pulsing gold dot
+ "Saving" / static dot + "Saved").

Footer: back button (ghost, muted border) + "X of Y answered" (muted2)
+ next button (gold border, gold text).

Mobile: footer sticks to bottom of viewport.

### Cluster divider
Between question groups within a section:
9px uppercase DM Sans text (muted2) + full-width 0.5px gold-faint line.

---

## PHASE 4 — SIX SECTION PAGES

For each section, create the page at the specified route.
Each section has clusters of 3–5 questions each.
Questions are grouped conversationally — not by tab letter.

Read the full question spec for each section from:
- docs/module3_tab_a.md (DS-160 fields → Section 1 admin cluster)
- docs/module3_tabs_b_e.md (Tabs D, E → Sections 1, 2)
- docs/module3_tabs_f_i.md (Tabs F, G, H, I → Sections 2, 3)
- docs/module3_tabs_j_l.md (Tabs J, K, L → Sections 4, 5)
- docs/module3_tabs_revised_and_module5.md (revised questions)
- docs/IDEAS.md Section 14 (34 gap questions to add)

### Question components to create

**QuestionLabel**
`src/components/apply/questions/QuestionLabel.tsx`
Cormorant Garamond 300, 16px, line-height 1.45, var(--text).

**HelperText**
`src/components/apply/questions/HelperText.tsx`
DM Sans 300, 11px, muted, line-height 1.6.

**PreFillBadge**
`src/components/apply/questions/PreFillBadge.tsx`
Gold border (rgba(201,168,76,0.22)), gold text (rgba(201,168,76,0.5)).
4px × 4px gold square gem dot.
Text: "From your eligibility check"
Shows when answer.source === 'quiz'.
Persists until user edits — then changes to "Edited" in muted grey.
On revert to quiz value: returns to gold badge.

**TextInput / TextArea**
`src/components/apply/questions/TextInput.tsx`
Transparent background, 0.5px border(var(--border)), gold-dim on focus.
No rounded corners.

**OptionButton**
`src/components/apply/questions/OptionButton.tsx`
Full width. Square (border-radius: 0). 0.5px border var(--border).
Selected: gold border, rgba(201,168,76,0.06) background, text colour.
Not selected: standard border, muted text.
Never white background.

**AdvisoryBlock**
`src/components/apply/questions/AdvisoryBlock.tsx`
Border: rgba(201,168,76,0.22). Background: rgba(201,168,76,0.05).
Text: rgba(245,240,232,0.6), 11px, line-height 1.6.

**RiskFlag**
`src/components/apply/questions/RiskFlag.tsx`
Border: rgba(210,70,55,0.28). Background: rgba(210,70,55,0.07).
Text: rgba(245,240,232,0.6). Warning label in rgba(230,110,90,0.9).

**ProjectionTable**
`src/components/apply/questions/ProjectionTable.tsx`
Interactive table. Rows: Year 1–5. Columns: Revenue / Net Income / Employees.
Mobile: collapses to card-per-year below 480px.
Each cell: transparent input, gold-dim border on focus.
Basis field ABOVE table (OptionButton group):
  "What are these projections based on?"
  Options: FDD Item 19 / Historical financials / Industry research / Own analysis
Investor draw field BELOW Year 1 revenue:
  "What do you plan to pay yourself in Year 1?"
  Advisory fires if draw > 40% of Year 1 revenue.
Break-even field BELOW table:
  "When do you project the business to break even?"
  Options: Month 3–6 / Month 7–12 / Year 2 / Year 3 or later

**StartupCostTable**
`src/components/apply/questions/StartupCostTable.tsx`
Line-item table for Gap C3 — startup cost breakdown.
Rows: one per cost item (repeating, add/remove).
Columns: Category / Description / Amount (USD).
Auto-totals at bottom.
Validation: total must be within 10% of QF-02 investment amount.
If gap > 10%: advisory "Your itemised costs don't match your total
investment. Officers check this. Adjust your figures before proceeding."

---

## PHASE 4A — SECTION 01: YOUR STORY
**Route:** `/apply/story`
**Documents built:** Cover letter (narrative) + Investor biography
**Pre-fill sources:** Q0-01 (nationality), quiz answers, profiles table

### Clusters

**Cluster 1 — Who you are (3 questions)**

Q: "You're going to write a cover letter that a consular officer
will read in under three minutes. It needs to tell them who you are
in a way that makes this application make sense. Start here: what
have you spent your career doing, and what does that have to do
with this business?"
Type: textarea, min 150 chars
Pre-fill: none (must be original voice)
Output: cover letter paragraph 1, investor biography

Q: "Why are you making this move? Not the official reason —
the real reason. What is it about this business, this moment,
and the United States that brought you to this decision?"
Type: textarea
Output: cover letter paragraph 2 (investment motivation)

Q: "A consular officer is going to ask: does this person actually
know how to run this kind of business? Answer that question directly.
Be specific about what you've managed, built, or operated that applies
here. The more specific, the stronger your case."
Type: textarea, min 100 chars
Output: cover letter paragraph 6 (qualifications/develop and direct)

**Cluster 2 — Your plan (2 questions)**

Q: "What happens in the first 12 months? Describe your first-year
priorities — hiring, operations, revenue targets, how you establish
the business."
Type: textarea
Output: cover letter paragraph 5 (non-marginality)

Q: "Is there anything about your application that you know a
consular officer might question?"
Type: textarea
Has N/A option: "Nothing unusual to address"
Advisory text: "This is not a trap. Officers respect applicants who
proactively acknowledge and address weaknesses. An acknowledged
weakness with a credible explanation is more convincing than an
application that pretends no weaknesses exist. Your answer here
feeds a dedicated counter-argument paragraph in your cover letter."
Output: cover letter — preemptive counter-argument paragraph (Gap E1)

**Cluster 3 — Administrative (DS-160 personal fields)**
Label this cluster clearly: "Administrative details — used for your
DS-160 reference sheet"

All fields from Tab A Section A.1 through A.3:
QA-01 through QA-18 (personal info, address, passport).
Pre-fill: name from profiles, email from auth, nationality from quiz.
PreFillBadge on every pre-filled field.

SSN routing question (Gap SSN) — insert after QA-08:
"Do you currently have a US Social Security Number?"
Options: Yes — enter it below / No — I'll apply after arrival /
I may have one from a prior US work visa
If "may have one": advisory with SSA contact information.

**Cluster 4 — Travel and history**
QA-19 through QA-23 (travel info, prior visas, prior refusals).
QA-37 through QA-50 (security questions).
Pre-fill: prior refusal flag from quiz Q0-11.

Tooltip enhancement for security questions (Gap L1):
Add examples of what counts for each question.
For QA-41 ("worked, studied, or required a visa"):
"This includes: attending business meetings on a B-1/B-2,
taking paid work on a tourist visa, any period where you worked
in the US while your visa category did not authorise it, or
a prior E-2 application that was withdrawn before a decision."

Consulate scheduling advisory (Gap B11) — after QA-19:
"E-2 interviews at Toronto are scheduled through the CGI Federal
portal at ais.usvisa-info.com/en-ca/niv. You will need your
DS-160 confirmation number and MRV fee receipt. Current wait
times at Toronto are approximately 4 months — factor this into
your timeline."

---

## PHASE 4B — SECTION 02: YOUR BUSINESS
**Route:** `/apply/business`
**Documents built:** Business plan + Visa category letter
**Pre-fill sources:** Quiz Q0-07 (business type), Q0-08 (franchise name),
  QA-51/QE-01 (business name), QA-52 (address), QA-55/QE-09 (ownership %)

### Clusters

**Cluster 1 — Entity and registration**
QE-01: Business legal name (pre-fill from QA-51)
QE-02: Entity type (LLC / S-Corp / C-Corp / Sole Proprietorship /
  Not yet formed)
  If "not yet formed": advisory "Your entity should be formed before
  your interview. Entity formation demonstrates the business is real
  and in process."
QE-03: State of registration
  Advisory for non-operating state (Gap B4):
  "If your LLC is registered in a different state than where your
  business operates, you must register as a foreign entity in your
  operating state. This is an additional step with its own timeline
  and fees."
QE-04: EIN
  Tooltip (Gap EIN): "Canadian applicants can get an EIN without
  a US Social Security Number by calling the IRS International
  Line: +1 (267) 941-1099. Have your LLC formation documents ready.
  The call takes about 20 minutes and you receive the EIN immediately."
QE-05: Date entity formed / "Not yet formed"
QE-06/07: Ownership % and operating agreement

Registered agent advisory (Gap B5):
"Every US LLC must have a registered agent in the state of registration —
a person or company with a physical US address who can receive legal
documents on behalf of the business. Canadian investors cannot serve
as their own registered agent before moving. Commercial registered
agent services cost $50–$200/year."

State LLC fees advisory (Gap B6) — shown after QE-03:
Dynamic based on selected state:
  California: "California charges a minimum $800/year LLC franchise tax
  regardless of revenue, starting your first tax year."
  Delaware: "Delaware charges an annual franchise tax based on shares
  issued — typically $300–$500/year for a simple LLC."
  Other states: no advisory unless fee is notable.

Operating agreement vs articles distinction (Gap B7):
"Two separate documents are required. Articles of organization (or
certificate of formation) is filed with the state to create the LLC.
Your operating agreement is the private internal document governing
how the LLC operates. Officers want to see both."

**Cluster 2 — What the business does**
QK-01 rewritten: "Describe your business in three sentences — what
it does, who pays for it, and how money flows through it. Write this
as you'd explain it to someone who has never heard of your industry."

"Why [city/state]?" question (Gap O3):
"Why did you choose [pre-filled city] for this business? Officers
notice when cover letters say nothing about why this specific location.
Your answer here produces a sentence most applications are missing."
Pre-fill: target state from quiz. Replace [city] token dynamically.

Local market data (Gap E2):
"What is the approximate population of the city or metro area where
you're opening?"
Type: text / "Not sure yet"
"How many direct competitors operate within 5 miles?"
Type: number / "I haven't researched this yet"
Advisory if "not sure": "Local market data — even rough figures —
makes your business plan's market analysis section credible. Generic
market analysis with no local reference is one of the signals officers
use to identify AI-generated applications."

**Cluster 3 — Operations and location**
QG-01: Physical location (dedicated commercial / shared / home-based /
  fully remote)
  Online/home-based advisory: advisory block with extra evidence
  requirements (Gap 18 in original spec).
QG-02: Operational status
  "In setup" or "Pre-start": advisory block about higher evidentiary
  standard.
QG-08 (new — Gap C1): "How many days per week will you personally
  be present at or actively managing this business?"
  Options: 5 days/week — on-site daily /
           3–4 days/week — on-site with some remote oversight /
           1–2 days/week — hiring a manager, strategic oversight
  If "1–2 days/week": RiskFlag fires:
  "Denial risk — remote management. An investor who hires a manager
  to run day-to-day operations and oversees remotely fails the
  'develop and direct' requirement under 9 FAM 402.9. Your cover
  letter must clearly articulate your specific management role.
  Attorney review recommended."

First 90 days operational plan (Gap E3):
"Walk me through what happens in the first 90 days after you open.
What are the first three milestones?"
Type: textarea
Placeholder: "e.g. Day 1-30: Hire first two employees and complete
training. Day 31-60: Acquire first 5 clients. Day 61-90: Break even
on monthly operating costs."
Output: business plan operations section.

**Cluster 4 — Licenses and setup**
QG-03: Licenses and permits
QG-04: Sales tax registration
QG-05: Website URL
Insurance question (Gap B3):
"Have you obtained the required business insurance?"
Options: Yes — policy in place / In progress / Not yet
Advisory: "Most commercial leases require proof of general liability
insurance before you can take possession. Franchise agreements specify
minimum coverage levels. Your checklist will include the required
policy types for your business category."

**Cluster 5 — Franchise-specific (shown only if business type = franchise)**
QF-09: Franchise system name (pre-fill from quiz Q0-08 if selected)
QF-10: FDD received and reviewed
  Projection basis question: "Has your franchisor provided Item 19
  financial performance data in their FDD?"
  Yes / No / Not sure
  If yes: "Use those figures as the basis for your projections below.
  We'll note in your business plan that projections are derived from
  franchisor-disclosed unit economics."
  If no: "Your projections need supporting evidence — local market
  research, industry data, or comparable business financials."
QF-11: Franchise agreement signed

**Cluster 6 — Startup costs (all applicants)**
StartupCostTable component (Gap C3).
Line-item input: Category / Description / Amount (USD).
Categories to pre-populate as empty rows:
  Franchise fee (if franchise) / Equipment / Leasehold improvements /
  Initial inventory / Working capital / Professional fees / Other
Total auto-calculated and validated against QF-02.

**Cluster 7 — Market and competition**
QK-02: Target customers
QK-03: Market opportunity
QK-04: Competition — "Who else is doing this in your area, and why
does your business win against them?"
QK-05: Marketing and customer acquisition

---

## PHASE 4C — SECTION 03: YOUR INVESTMENT
**Route:** `/apply/investment`
**Documents built:** Source of funds narrative + Investment proof
**Pre-fill sources:** Q0-05 (investment amount), Q0-06 (source type),
  QF-02 (confirmed amount), quiz registered account flags

### Clusters

**Cluster 1 — Investment overview**
QF-01: Investment type — new / acquisition / franchise
  Pre-fill from quiz Q0-07.
QF-02: Total invested to date (USD)
  Pre-fill from quiz Q0-05. PreFillBadge.
  Round number check (Gap C2): if amount ends in exactly 000,
  advisory: "Round investment amounts can draw officer scrutiny.
  Officers read exact round numbers as threshold calculations, not
  real investments. If your actual costs break down to an odd figure,
  use the exact amount."
QF-03: Total cost to establish the business (USD)
  Auto-calculates substantiality % = QF-02 / QF-03.
  If below 50%: advisory about substantiality argument needed.
QF-04: How investment was deployed (multiselect with amounts per item)
QF-NEW-01: Are funds actually spent on business expenses?
  (existing question from revised tabs — keep as-is)

Net worth question (Gap O4):
"What is your approximate net worth in CAD, not including your
primary residence?"
Type: currency (CAD)
Advisory: "The Toronto consulate requires a certified net worth
statement from a Canadian CPA. Your CPA needs your bank balances,
investment accounts, property values, and liabilities to prepare it.
Allow 2 weeks. The statement should show a net worth meaningfully
higher than your investment amount — typically 2–3x."

**Cluster 2 — Where the money came from**
QF-05: Source of funds (multiselect — keep existing options)
  Add to options: RRSP / TFSA / LIRA or pension / Cryptocurrency
  Each selection triggers its sub-flow below.

QH-NEW-01: Funds trail flag check (existing revised question — keep)

Registered accounts sub-flow (Gap 3 from Section 16):
Fires if RRSP / TFSA / LIRA / RESP selected in QF-05.
QH-NEW-02: Which registered account type?
Then per account:
  RRSP path: T4RSP advisory, 7-step paper trail, CPA referral flag.
  TFSA path: no tax slip advisory, cover letter explanation note.
  LIRA path: mandatory attorney + CPA flag, provincial unlocking.
  RESP path: strong caution, 20% penalty, grant repayment.

Crypto sub-flow (Gap 4 from Section 16):
Fires if Cryptocurrency selected in QF-05.
QH-NEW-03: How was crypto originally acquired?
  (purchase / mining / employment compensation / trading gains / gift)
QH-C-02: Where was it held? (centralised exchange / self-custody / both)
  Self-custody: RiskFlag about forensic tracing requirement.
QH-C-03: Has it been liquidated to fiat?
Document requirements vary by answers — generate checklist accordingly.

Gift funds donor question (Gap B8):
Fires if "Inheritance or gift" selected in QF-05.
"Can the donor provide documentation showing where their gift funds
came from — such as their own bank statements, a property sale, or
investment account records?"
Yes / No / Partially
If No or Partially: RiskFlag "Officers require proof not just of the
gift itself, but of the donor's source of wealth. A gift without
donor source documentation is one of the most common 221(g) triggers."

Seller financing question (Gap B9):
Fires if "acquisition" selected in QF-01.
"Is any part of the purchase price being financed by the seller?"
Yes / No
If Yes: advisory "The financed portion generally does not count toward
your qualifying E-2 investment unless you are personally liable for
repayment. The loan must be secured by your personal assets, not
just business assets. Consult an attorney on structuring this."

Escrow question (Gap L2):
"Are any of your investment funds currently held in escrow?"
Yes / No
If Yes: "What are the release conditions of the escrow?"
Options: Released only on visa approval (no refund possible) /
         Refundable if visa is denied / Other conditions
If refundable: advisory "Funds in escrow with a refund condition
do not meet the 'at risk' requirement. The investment must be
irrevocably committed. Consult an attorney on restructuring the
escrow agreement before your interview."
If non-refundable release: advisory that this may qualify —
practitioner guidance provided.

**Cluster 3 — The paper trail**
QH-01: "Walk me through the money. Start from where it sat 12–18
months ago and trace every step to where it is today in the US
business account. Include dates and amounts at each step."
Type: textarea (structured narrative)
This is the single most important question in this section.

QH-02: Over what period were funds accumulated?
QH-03: Were funds held in multiple currencies?
QH-04: Were any funds a gift or inheritance?

US business bank account question (Gap BANK):
"Has your US business bank account been opened?"
Options: Yes — account is open / In progress / No — not yet started

If No: Full advisory block with four options:
"Opening a US business bank account requires your LLC to be formed
and EIN to be obtained first. Your options:

1. Mercury (recommended for remote opening): remote account opening,
   EIN + LLC docs + passport required, no US address or SSN needed,
   approval in 1–3 business days. mercury.com

2. Relay (Mercury backup): same remote process, Canadian-founded
   fintech. relayfi.com

3. TD Bank or RBC cross-border: if you bank with either, contact
   your Canadian branch's business banking team for an introduction
   to their US counterpart.

4. Traditional US bank (Chase, BofA, Wells Fargo): requires
   in-person visit to a US branch. Viable if you travel to the US
   for a site visit or franchise training before your interview.

Important: account must be in the business name, not your personal
name. The wire must flow directly from your Canadian personal account
to the US business account."

Canadian bank wire notification (Gap B1):
"Have you confirmed with your Canadian bank that they can process
an international wire of [pre-filled investment amount] CAD?"
Advisory: "TD Bank's online wire limit is approximately $25,000 CAD.
Above that requires branch or phone authorization. Some banks
automatically freeze accounts on large outgoing international
transfers without advance notice. Call your bank before wiring."

ITIN question (Gap ITIN):
"Do you have any US-source income before your E-2 is approved?
(such as rental income from a US property, or interest from a
US business bank account)"
Yes / No / Not sure
If Yes: advisory about IRS Form W-7, 7–11 week processing,
and compliance calendar entry.

**Cluster 4 — Financial projections**
ProjectionTable component — Year 1–5 × Revenue / Net Income / Employees.
Basis field above table (FDD Item 19 / Historical / Industry / Own analysis).
Investor draw field adjacent to Year 1.
Break-even field below table.
Full spec in IDEAS.md Section 18.

**Cluster 5 — Non-marginality evidence**
QI-04 (revised hiring plan — existing well-specified question).
QI-07 rewritten: "What does your household need to cover its costs
in the US? Include rent, food, transport, healthcare, and any
Canadian obligations you'll still carry. This calculates whether
the business's projected income goes meaningfully beyond just
supporting your family — which is what officers are looking for."

---

## PHASE 4D — SECTION 04: YOUR QUALIFICATIONS
**Route:** `/apply/qualifications`
**Documents built:** Investor biography + Org chart
**Pre-fill sources:** QA-29–34 (existing work history from Tab A)

### Clusters

**Cluster 1 — Education**
QJ-01: Education history (repeating group — keep existing spec)

**Cluster 2 — Work history**
QJ-03: Work history 10 years (repeating group)
  This replaces QA-29 through QA-34 from Tab A.
  Pre-fill from any existing Tab A answers.
  PreFillBadge on pre-filled entries.

**Cluster 3 — Professional credentials**
QJ-02: Certifications, licences, professional designations

**Cluster 4 — The qualifying question**
QJ-04 rewritten: "A consular officer is going to look at your
background and ask: does this person actually know how to run
this kind of business? Answer that question. Be specific about
what you've managed, built, or operated that directly applies
here. The more specific, the stronger your qualifications narrative."
Type: textarea, min 150 chars

Prior business ownership:
QJ-05: Have you ever owned or operated a business before?

**Cluster 5 — Your role in this business**
Q3C-17 (from spec): "Describe your specific management
responsibilities in this business. What decisions will you make?
What operations will you oversee?"
Type: textarea, min 100 chars
Output: cover letter paragraph 6, org chart narrative

---

## PHASE 4E — SECTION 05: YOUR FAMILY
**Route:** `/apply/family`
**Documents built:** Tab L dependent information + DS-160 family fields
**Shown only if:** quiz Q0-16 includes any dependent
**Pre-fill sources:** quiz Q0-16 (dependent type), Q0-16a (child ages),
  Q0-17 (legal marriage), Q0-19 (child age flags)

### Clusters

**Cluster 1 — Spouse**
Shown only if spouse applying.
QA-25 + branches (marital status, spouse details).
Pre-fill marital status from quiz Q0-17.

Common-law advisory (fires if Q0-17 = No):
"Canadian common-law partnerships are generally not recognised
as equivalent to legal marriage for US immigration dependent
visa purposes under 9 FAM 102.8-1(F). The standard pathway is
a formal civil marriage. Are you planning to legally marry before
your interview?"
Options: Yes — we will be legally married before the interview /
         No — we do not plan to marry / Undecided
If No: advisory that partner cannot be included as dependent
without legal marriage.

**Cluster 2 — Children (one cluster per child, repeating)**
For each child declared in quiz:

QL-NEW-01: "What is your relationship to this child?"
Options:
  My biological child (born during my current marriage)
  My biological child (born before or outside my current marriage)
  My biological child (born outside of marriage — I am the father)
  My spouse's biological child (step-child)
  My legally adopted child
  Other

Routing per selection — all documented in IDEAS.md Section 15:
  Step-child: marriage-before-18 check + ongoing marriage check
  Adopted: age-16 condition + 2yr custody/residency check
  Outside marriage (father): legitimation documentation check
  Other: attorney flag

Child age-out advisory (fires if child is 17–20):
Full advisory text from compliance calendar spec.
Four pathway options presented (F-1 / own E-2 / employment visa /
green card).

Children enrolling in US schools (Gap O1):
"Will your children be enrolling in US schools?"
Yes / No / Not yet decided
If Yes: advisory that this is a known immigrant intent signal.
"Officers note when children are enrolled in US schools at the
time of the interview — particularly combined with other signals
like a sold Canadian home or closed Canadian accounts. Your
Canadian ties section (Section 6) should be especially strong
if this applies."

**Cluster 3 — DS-160 family fields**
QA-26/27: Parent information (father and mother details for DS-160)
QA-28: Immediate relatives currently in US

---

## PHASE 4F — SECTION 06: YOUR TIES
**Route:** `/apply/ties`
**Documents built:** Non-immigrant intent section of cover letter + Interview prep
**Pre-fill sources:** quiz Q0-12 (property), Q0-13 (family ties),
  Q0-14 (financial accounts)

### Clusters

**Cluster 1 — Canadian property**
Q0-15 confirm/expand (pre-fill from quiz).
If "plan to sell before interview": RiskFlag with full 214(b) advisory.
If already sold: RiskFlag + mitigation builder.

**Cluster 2 — Financial ties**
Q0-16 confirm/expand (Canadian financial accounts — pre-fill).
Q3H-04: Active professional licences, memberships, registrations in Canada.
OHIP/provincial health timing advisory.
Ongoing Canadian employment/business (Gap O2):
"Do you currently own or operate a business in Canada that will
continue after you move?"
Yes / No / Partially
"Do you have any ongoing professional commitments or employment
in Canada?"
Yes / No
Both are positive non-immigrant intent signals — surfaces in cover
letter if yes.

**Cluster 3 — Family ties**
Q0-17 confirm/expand (Canadian family ties — pre-fill).
If no remaining family ties: mitigation advisory about other ties
to emphasise.

**Cluster 4 — Intent and green card**
Q3H-05: CRA departure tax status. CPA referral if unsure.
Q3H-06: Do you plan to apply for US permanent residence in future?
  Advisory: "Having a long-term green card intention is not
  disqualifying — many E-2 investors pursue EB-5 or EB-1C
  concurrently. However, you must NOT express this intent during
  your interview or in your written materials. We will coach you
  on how to answer questions about your long-term plans."
Q3H-07: Pending US immigration applications? Attorney flag if yes.

**Cluster 5 — The interview question**
Q3H-08 rewritten: "At your interview, the officer will ask some
version of: 'What brings you back to Canada after the E-2 expires?'
Answer that question now, in your own words. Your answer feeds
directly into your interview preparation and your cover letter's
closing paragraph."
Type: textarea
Placeholder: "The most effective answers are specific: name your
Canadian home, family members who remain, financial accounts you
keep open, professional ties, or business interests. Generic answers
produce weak interview preparation."

Language/interpreter (Gap C4):
"What language will you conduct your interview in?"
Options: English / French / I will need an interpreter
If interpreter: advisory about consulate interpreter policy and
how to request one.

US housing arrangements (Gap O5):
"Have you secured housing in the US?"
Options: Yes — address confirmed / In progress / No — not yet
If Yes: collect address (feeds DS-160 QA-24 point of contact).

Interview number coaching (Gap B13):
Advisory block at end of cluster 5:
"Before your interview, you should be able to state from memory:
your total investment amount, how it was deployed, your Year 1
revenue projection, your household income need, and your Year 1
hiring plan. Officers notice hesitation on your own business's
numbers — it suggests you did not prepare your own package."

---

## PHASE 5 — ROUTING SWITCH

After all six sections are verified with Playwright at 390px and 1440px:

1. Update the dashboard navigation to link to /apply (new overview)
   instead of /apply/overview (old overview).
2. Update any breadcrumbs that reference old tab routes.
3. Keep all old tab routes alive — do not delete them.
   They serve as fallback and are used by the generation engine.
4. Add a redirect from /apply/overview → /apply for returning users.
5. Update BUILD_TRACKER.md to mark Module 3 Redesign as COMPLETE.

---

## MOBILE REQUIREMENTS — NON-NEGOTIABLE

Every component must be tested at 390px.

Case file overview:
- Header stacks vertically, meta chips wrap
- Section grid: 1 column
- Section cards: full width, compact padding

Section interior:
- Sidebar collapses to horizontal cluster progress strip at top
- Cluster strip: scrollable horizontally if more than 4 clusters
- Question panel: full width below
- Footer: sticky to bottom of viewport

Question components:
- OptionButton: full width, min 48px touch target
- ProjectionTable: card-per-year layout below 480px
- StartupCostTable: stacks vertically, full-width inputs
- TextArea: minimum 120px height

---

## PLAYWRIGHT VERIFICATION CHECKPOINTS

Run after each phase:

After Phase 2:
```
Use Playwright to screenshot localhost:3000/apply at 390px and 1440px.
Confirm: personalised header renders correctly, all six section cards
visible, no placeholder text or empty chips, generate button locked.
```

After Phase 4 (each section):
```
Use Playwright to screenshot localhost:3000/apply/[section] at 390px
and 1440px.
Confirm: sidebar visible on desktop, collapses on mobile, pre-fill
badges render on quiz-sourced fields, all question types render
correctly, no rounded corners anywhere.
```

After Phase 5:
```
Use Playwright to screenshot the full flow:
localhost:3000/apply → click Section 02 → answer one question →
verify autosave fires → navigate to next cluster.
Confirm: routing works, autosave works, back/forward navigation works.
```

---

## COMMITS

One commit per phase:
- "feat: Phase 1 — DB columns source and partner_gender"
- "feat: Phase 2 — Case file overview page and components"
- "feat: Phase 3 — Section interior layout and side nav"
- "feat: Phase 4A — Section 01 Your story"
- "feat: Phase 4B — Section 02 Your business"
- "feat: Phase 4C — Section 03 Your investment"
- "feat: Phase 4D — Section 04 Your qualifications"
- "feat: Phase 4E — Section 05 Your family"
- "feat: Phase 4F — Section 06 Your ties"
- "feat: Phase 5 — Routing switch and BUILD_TRACKER update"

---

## ON COMPLETION

Update BUILD_TRACKER.md:
- Module 3 Case File Redesign: ✅ COMPLETE
- Note: old /apply/tab-* routes retained as fallback

Update CLAUDE_CONTEXT.md if any new rules were established.

Run: npm run build — must compile clean with zero errors.

Report: summary of what was built, any deviations from this spec,
and any issues discovered that need follow-up.
