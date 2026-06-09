# SESSION — Landing Page Complete Rebuild
**Branch:** dev
**Goal:** Rebuild src/app/page.tsx and src/app/HomeClient.tsx as a
complete, mobile-first landing page in the Obsidian Gold design system.

---

## RULES FOR THIS SESSION

1. Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md first.
2. Complete every step in order. Do not skip.
3. Do not use Playwright MCP. Do not read image files.
4. Mobile-first on every single component — no exceptions.
5. Use Tailwind CSS classes throughout — no inline styles.
6. `npm run build` must be clean before committing.
7. Use Magic MCP for complex React components.
8. Do not touch any files outside src/app/page.tsx,
   src/app/HomeClient.tsx, and src/app/globals.css.

---

## DESIGN TOKENS — LOCKED. NEVER DEVIATE.

```
Background:      #0a0a0a
Gold accent:     #C9A84C
Text primary:    #f5f0e8
Text muted:      rgba(245,240,232,0.45)
Text faint:      rgba(245,240,232,0.25)
Card border:     1px solid rgba(201,168,76,0.12)
Card bg:         rgba(201,168,76,0.02)
Input border:    rgba(201,168,76,0.20)
Input focus:     1px solid #C9A84C
Heading font:    Cormorant Garamond — weight 300, italic for emphasis
Body font:       DM Sans
Border radius:   0 (sharp edges everywhere — no rounded corners)
FORBIDDEN:       glassmorphism, teal, rounded corners,
                 box shadows, blur effects, gradients
```

Tailwind custom classes already configured in the project:
- text-gold = #C9A84C
- bg-obsidian = #0a0a0a
- font-display = Cormorant Garamond
- font-sans = DM Sans

---

## MOBILE-FIRST RULES — APPLY TO EVERY COMPONENT

Every layout must be designed mobile-first using Tailwind breakpoints:
- Default (no prefix) = mobile (320px–767px)
- md: = tablet (768px–1023px)
- lg: = desktop (1024px+)

Required patterns:
- All padding: p-4 md:p-8 lg:p-12 (never start with large padding)
- All grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- All font sizes: text-3xl md:text-5xl lg:text-6xl for heroes
- Navigation: hamburger menu on mobile, full nav on md+
- Journey wizard: stacked on mobile, side-by-side on md+
- All buttons: w-full on mobile, w-auto on md+
- Touch targets: minimum 44px height on all interactive elements
- No horizontal overflow: overflow-x-hidden on page wrapper

---

## STEP 1 — VERIFY STATE

```bash
cd ~/E2-go
git status
npm run build 2>&1 | tail -5
cat src/app/page.tsx | head -20
cat src/app/HomeClient.tsx | head -20
```

Report the current structure before touching anything.

---

## STEP 2 — INSTALL MAGIC MCP COMPONENTS

Before writing any code, use Magic MCP to generate the three
most complex components:

**Component 1 — Navigation bar**
Instruction to Magic:
"Create a mobile-first navigation bar for a luxury legal SaaS called
e2go.app. Dark background #0a0a0a. Gold accent #C9A84C. Logo on left.
Links in center on desktop, hidden behind hamburger on mobile.
Two CTAs on right: Log in (ghost) and Check eligibility (gold filled).
Hamburger menu slides down full-width on mobile with the same links.
No rounded corners anywhere. Cormorant Garamond for logo, DM Sans for links.
Use Tailwind CSS only."

**Component 2 — Journey wizard**
Instruction to Magic:
"Create a mobile-first interactive journey timeline comparison widget.
Dark background #0a0a0a. Gold accent #C9A84C. Three dropdown selectors
at top: target move date, current stage, applying with.
Below: two columns side by side on desktop, stacked on mobile.
Left column = traditional route (muted, grey). Right column = e2go route
(gold accented). Each column shows milestone steps with dots and lines.
Steps that are already completed (based on current stage) appear
crossed out. Below both columns: a gap indicator bar that changes
colour — gold when e2go is faster, red when target is too tight.
No rounded corners. Sharp edges. Tailwind CSS only."

**Component 3 — Feature grid**
Instruction to Magic:
"Create a mobile-first 3-column feature grid (1 column on mobile,
2 on tablet, 3 on desktop). Dark background #0a0a0a. Each card has
a small gold diamond icon, a title in DM Sans medium, and two lines
of description in muted text. Gold border on hover. Sharp edges,
no border radius. Tailwind CSS only."

Save each Magic output as a separate component file:
- src/components/landing/NavBar.tsx
- src/components/landing/JourneyWizard.tsx
- src/components/landing/FeatureGrid.tsx

---

## STEP 3 — BUILD HomeClient.tsx

Replace src/app/HomeClient.tsx completely.

The page has these sections in this exact order:
1. NavBar (sticky, z-50)
2. Hero
3. Social proof bar
4. How it works (4 steps)
5. Journey wizard
6. Features grid
7. Founder's note
8. Testimonials
9. Final CTA
10. Footer

### SECTION 1 — NAVBAR
Import and use the Magic-generated NavBar component.
Make it sticky: position sticky top-0 z-50 bg-[#0a0a0a]
Border bottom: border-b border-[rgba(201,168,76,0.1)]

### SECTION 2 — HERO

Mobile: single column, center-aligned text
Desktop: left-aligned, max-width 860px

Eyebrow (small label above headline):
```
E-2 Treaty Investor Visa · 82 Treaty Countries
```

H1 headline (Cormorant Garamond, weight 300):
```
Your U.S. business visa.
Without the $12,000 legal bill.
```
"$12,000 legal bill" in gold italic.

Sub-headline (DM Sans, muted):
```
Most E-2 investors spend $150,000 on a business
and $12,000 on a consultant. They spend $0
understanding what the embassy actually needs to see.
That's the gap e2go closes.
```

Below sub-headline, one line in slightly brighter text:
```
What most people need first isn't a lawyer. It's clarity.
```

Two buttons stacked on mobile, side-by-side on desktop:
- Primary (gold filled): "Check my eligibility →"
- Secondary (ghost): "See how it works"

Stats row below buttons (2x2 grid on mobile, 4 columns on desktop):
- 82 / Treaty countries supported
- From $297 / vs. $12,000+ traditional route
- 15 / Denial patterns tested against
- 4–6 months / To interview, not 12+

### SECTION 3 — SOCIAL PROOF BAR

Thin horizontal strip. Dark border top and bottom.
Single line centered:
```
Trusted by E-2 applicants from Canada, the UK, Germany,
Australia, Japan, and 77 other treaty countries.
```
Small text, very muted. No logos needed yet.

### SECTION 4 — HOW IT WORKS

Eyebrow: "How it works"
Title: "Four steps to your consulate package."
Sub: "No consultants. No back-and-forth.
Your complete application, built and tested in days."

4 steps — 1 column mobile, 2 columns tablet, 4 columns desktop.
Each step card: number (large Cormorant, very muted gold),
title, description. Gold border-left on hover.

Steps:
01 — Eligibility quiz
"14 questions. 4 minutes. Instant verdict with a score out of 100,
personalised risk flags, and your estimated timeline to interview."

02 — Document interview
"A guided conversation across 12 tabs that captures everything
the consulate will ask about. Your answers become your documents."

03 — AI document engine
"Six documents generated in sequence. Tested against 15 denial
patterns. Cross-checked for consistency. Written in your voice.
AI detection run before every release."

04 — Consulate package
"A complete, formatted binder — every tab, every document,
in the exact order your consulate expects. Download and go.
Or hand to an attorney for a 2-hour review, not 20."

### SECTION 5 — JOURNEY WIZARD

Eyebrow: "Your journey"
Title: "See how long your E-2 journey will actually take."
Sub: "Set your target date and where you are now.
We show you both paths — and the gap between them."

Import and use the Magic-generated JourneyWizard component.

The wizard has three dropdowns:
1. Target move date: 3 months / 6 months / 9 months / 12 months / 18 months
2. Where you are now: Just exploring / Business identified / LLC formed / Documents started
3. Applying with: Just me / Me + spouse / Me + spouse + children

Timeline logic:

TRADITIONAL ROUTE steps (show all, cross out completed ones):
- Research and orientation (Weeks 1–4)
- Business search and FDD review (Weeks 4–20)
- LLC, EIN, U.S. bank account (Weeks 16–24)
- Find immigration consultant (Weeks 20–28)
- Document gathering and drafting (Weeks 24–34)
- Application submission (Weeks 34–40)
- Consulate processing and outcome (Weeks 40–56+)

E2GO ROUTE steps (show all, cross out completed ones):
- Eligibility quiz and score (Day 1)
- Franchise broker introduction (Week 1)
- Business selection and FDD review (Weeks 1–6)
- LLC, EIN, U.S. bank account (Weeks 4–8)
- Document interview — 12 tabs (Weeks 8–10)
- AI document generation and review (Weeks 10–12)
- Interview prep and simulator (Weeks 12–16)
- Consulate interview (Weeks 16–20)

Stage collapse logic:
- "Just exploring" → show all steps on both sides
- "Business identified" → cross out research steps
- "LLC formed" → cross out research + business search steps
- "Documents started" → cross out all pre-document steps

Duration display:
Traditional:
- Exploring → 9–14 months
- Business identified → 7–11 months
- LLC formed → 5–8 months
- Documents started → 3–5 months

e2go:
- Exploring → 16–20 weeks
- Business identified → 12–16 weeks
- LLC formed → 8–12 weeks
- Documents started → 4–8 weeks

Gap indicator bar logic:
- Target achievable by e2go but NOT traditional →
  Gold bar: "The traditional route cannot meet your [X]-month target.
  e2go can — with [N] months to spare."
- Target tight even for e2go (target weeks < e2go min weeks) →
  Red bar: "Your [X]-month target is tight.
  Start immediately — every week matters."
- Both achievable →
  Gold bar: "e2go gets you to your interview
  approximately [N] months faster than the traditional route."

IMPORTANT — DO NOT use the words "attorney" or "lawyer"
in the journey wizard. Use "immigration consultant" instead.

### SECTION 6 — FEATURES GRID

Eyebrow: "What's included"
Title: "Everything a senior practitioner would prepare."
Sub: "Not a template. Not a form filler. A system that thinks
about your case and builds a narrative that holds up under scrutiny."

Import and use the Magic-generated FeatureGrid component.

6 features:
1. Case analysis engine
"6 calculations. 15 denial pattern checks. Investment substantiality,
source of funds strength, marginality risk — all assessed before
a word is written."

2. Sequential document generation
"Cover letter first. Each document reviewed before the next begins.
Inconsistencies caught before they compound. You approve every
document before downloading."

3. Writing style matching
"Your documents read like you wrote them. A writing sample calibrates
the engine to your natural voice. AI detection run on every document."

4. Consulate intelligence
"Processing times, approval patterns, known preferences — specific
to your consulate. Not generic advice."

5. Interview simulator
"The AI officer has read your package. Questions are generated from
your specific application. Every weak point is probed."

6. Specialist referral network
"Franchise brokers, cross-border accountants, LLC formation
specialists — connected at the right moment, already briefed
on your situation."

### SECTION 7 — FOUNDER'S NOTE

This section is a narrow centered column. Max-width 560px.
Centered on page. No card border — just the text.
Cormorant Garamond italic, weight 300, font-size text-lg md:text-xl.
Text color: rgba(245,240,232,0.65) — slightly muted, intimate.
Gold horizontal line above and below (1px, 40px wide, centered).

Text:
```
Before preparation, there is procrastination.

Weeks become months. Months become a year. And the move
you have been planning quietly stays a plan.

You already have what you need. e2go gets you started —
every document built, every gap closed, every question
the consulate will ask already answered.

All that's left is to make the jump.
```

No attribution name needed yet. Just the text.

### SECTION 8 — TESTIMONIALS

Eyebrow: "From applicants"
Title: "What preparation actually feels like."

3 cards — 1 column mobile, 3 columns desktop.
Each card: quote in Cormorant italic, author name, country + type.

Quote 1:
"I had spoken to two consultants and walked away more confused
than when I started. e2go was the first thing that actually
explained what the consulate needed to see and why."
— Marco T. · Italy · Franchise applicant

Quote 2:
"The source of funds section alone would have taken days
with a consultant. The engine asked me the right questions
and built the narrative from my answers."
— Aisha K. · United Kingdom · Solo applicant

Quote 3:
"I downloaded the package on a Friday. By Monday I had reviewed
every document and sent it to my attorney. She said it was the
cleanest first draft she had ever seen from a self-prepared applicant."
— David L. · Canada · Partnership applicant

### SECTION 9 — FINAL CTA

Centered. Max-width 640px. Generous padding top and bottom.

Eyebrow: "Ready to begin"
Title (Cormorant, large):
"Find out if you qualify.
It takes four minutes."

Sub:
"No payment required for the eligibility check.
No account required to start.
82 treaty countries. Every consulate. One platform."

Two buttons — stacked on mobile, side by side on desktop:
- Primary: "Check my eligibility →"
- Secondary (ghost): "View pricing"

One line below buttons, very muted:
"Lawyer-ready documents. Lawyer-optional price."

### SECTION 10 — FOOTER

3-column layout on desktop, stacked on mobile.
Left: logo + copyright + one-line description
Center: nav links (How it works / Pricing / Quiz / Learn / Support)
Right: legal disclaimer (one sentence, very small, very muted)

```
This tool is a self-service preparation guide and does not
constitute legal advice. e2go.app is not a law firm and does
not provide legal representation or immigration services.
```

---

## STEP 4 — UPDATE src/app/page.tsx

page.tsx should be a simple server component that imports
and renders HomeClient:

```typescript
import HomeClient from "./HomeClient";

export const metadata = {
  title: "e2go — U.S. E-2 Treaty Investor Visa Preparation",
  description: "Prepare your complete E-2 visa application package without an immigration attorney. All 11 consulate tabs. 82 treaty countries. From $297.",
};

export default function Home() {
  return <HomeClient />;
}
```

---

## STEP 5 — MOBILE AUDIT

After building, mentally audit every section against these
mobile rules. Fix any violations before committing:

[ ] Nav collapses to hamburger on mobile
[ ] Hero text is readable on 375px screen (not truncated)
[ ] Hero buttons are full width on mobile
[ ] Stats grid is 2x2 on mobile not 4 columns
[ ] How it works steps stack vertically on mobile
[ ] Journey wizard dropdowns are full width on mobile
[ ] Journey wizard columns stack vertically on mobile
[ ] Feature grid is single column on mobile
[ ] Founder's note has adequate padding on mobile (px-6 minimum)
[ ] Testimonial cards stack on mobile
[ ] Final CTA buttons stack on mobile
[ ] Footer stacks on mobile
[ ] No horizontal scroll at any breakpoint
[ ] All touch targets are minimum 44px tall

---

## STEP 6 — BUILD CHECK

```bash
cd ~/E2-go
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed|Warning" | head -20
```

Fix ALL errors. Warnings about missing dependencies are acceptable
but TypeScript errors must be zero.

---

## STEP 7 — COMMIT

```bash
git add src/app/page.tsx src/app/HomeClient.tsx
git add src/components/landing/
git commit -m "feat: landing page complete rebuild — mobile-first, Obsidian Gold, journey wizard"
git push origin dev
```

---

## STEP 8 — UPDATE BUILD TRACKER

Add to BUILD_TRACKER.md:
```
## SESSION — Landing Page Rebuild (June 9, 2026)

### Completed
- HomeClient.tsx: Complete rebuild — 10 sections, mobile-first
- page.tsx: Clean server component wrapper
- NavBar.tsx: Mobile hamburger nav via Magic MCP
- JourneyWizard.tsx: Interactive timeline comparison via Magic MCP
- FeatureGrid.tsx: 3-column feature grid via Magic MCP
- All sections mobile-first with Tailwind breakpoints
- Build: clean

### Design system applied
- Background #0a0a0a throughout
- Gold #C9A84C for all accents, CTAs, active states
- Cormorant Garamond for all headings
- DM Sans for all body text
- Zero border-radius anywhere
- No glassmorphism, no shadows, no gradients

### Copy note
All copy is placeholder — owner will edit directly in VS Code.
No copy changes should be made by the agent.
```

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — landing page rebuild complete"
git push origin dev
```

---

## COMPLETION REPORT

When done, report:

```
Landing page rebuild complete.

Files created/changed:
- src/app/page.tsx
- src/app/HomeClient.tsx
- src/components/landing/NavBar.tsx
- src/components/landing/JourneyWizard.tsx
- src/components/landing/FeatureGrid.tsx

Sections built: [list all 10]
Mobile audit: [pass/fail per item]
Build: clean / errors: [none or list]
Commit: [hash]

Ready for copy editing in VS Code.
```
