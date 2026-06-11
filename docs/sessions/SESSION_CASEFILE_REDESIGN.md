# SESSION — Case File Experience Redesign
**Date:** June 10, 2026
**Branch:** dev
**Priority:** CRITICAL — paid client experience, all six sections
**Estimated time:** 5–6 hours
**Commit target:** feat: case file experience redesign — two-panel layout, premium UI, voice input

---

## THE PROMISE

A client who has paid $550–$1,397 opens this page.
They must immediately feel that the money was obviously worth it.
The experience must feel like a private consultation with a
serious professional tool — not a Google Form with dark styling.

Every decision in this session serves that standard.
If something looks like a draft, rebuild it.
If something looks generic, make it specific.
If something requires effort to understand, simplify it.

---

## NON-NEGOTIABLE RULES FOR THIS SESSION

1. Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md first.
2. Read docs/DESIGN_REFERENCE.html before touching any UI file.
3. Activate skills: ui-ux-pro-max, full-output-enforcement.
4. Never truncate file output. Complete files only.
5. Fix all errors and continue — do not stop and ask.
6. npm run build must be clean before any commit.
7. Do NOT touch any of the following — ever:
   - Any API route under src/app/api/
   - Any useEffect or handler that writes to the answers table
   - The useSpeechInput hook logic (src/hooks/useSpeechInput.ts)
   - /apply/module4 page logic (voice sample system — separate)
   - Old fallback tabs: /apply/module3/[a,b,c,d,e,i,j,k]
   - The answers table, case_briefs table, or any DB migration
8. Before touching any section page, read it fully and
   document every data hook, every onChange handler, every
   auto-save call. Save that audit. Rebuild the visual layer
   only. Verify the data hooks still fire after the rebuild.
9. One commit per section. Do not batch all six into one commit.
10. Update BUILD_TRACKER.md at end of session.

---

## STEP 1 — RESEARCH (MANDATORY — do not skip)

Use Lazyweb MCP to search for:
  "two panel form dark luxury UI questions left preview right"
  "document builder interview dark theme left right split"
  "legal onboarding dark premium two column form"
  "case builder interview UI dark sidebar clusters"

Use Firecrawl to scrape patterns from:
  https://linear.app (issue detail layout — structured left, context right)
  https://www.deel.com/onboarding (professional high-stakes form UI)

Study and note before writing any code:
- How premium apps handle a structured question panel
- How they separate topic clusters visually without overwhelming
- How they show progress without being childish about it
- How the right panel context reinforces why the left panel matters
- How typography creates hierarchy between question and helper text

Report findings in 5–8 sentences before proceeding to Step 2.

---

## STEP 2 — AUDIT ALL SIX SECTION PAGES

Before redesigning anything, audit every section page.

Run:
```bash
find src/app/apply -name "page.tsx" | grep -v module | grep -v upload | grep -v overview
```

For each of the six section pages, read the full file and document:
- Every useState and useEffect
- Every function that calls the answers API or writes to DB
- Every onChange handler on any input or textarea
- The auto-save mechanism (debounce timer, 2-second delay)
- How applicationId is threaded through the component
- Any conditional rendering blocks (partnership, COS, family variants)
- Which components are imported and from where

Save the audit as a comment block at the top of a scratch file.
This is your safety checklist. Verify against it after every rebuild.

Also audit the shared components:
```bash
find src/components/apply -name "*.tsx" 2>/dev/null || \
find src/components -name "TextArea.tsx" -o -name "QuestionPanel.tsx" \
  -o -name "SectionSideNav.tsx" -o -name "PreFillBadge.tsx" \
  -o -name "AdvisoryBlock.tsx" -o -name "RiskFlag.tsx" \
  -o -name "ClusterDivider.tsx" | head -20
```

Read every component found. Understand the prop interfaces completely.

---

## STEP 3 — DESIGN REFERENCE

Read docs/DESIGN_REFERENCE.html in full.

The Obsidian Gold system — locked, no exceptions:
```
Background:       #0a0a0a
Gold accent:      #C9A84C
Text primary:     #f5f0e8
Surface card:     rgba(201,168,76,0.02) + border rgba(201,168,76,0.12)
Border subtle:    rgba(201,168,76,0.08)
Border active:    rgba(201,168,76,0.30)
Gold full:        #C9A84C
Text muted:       rgba(245,240,232,0.35)
Text dimmed:      rgba(245,240,232,0.20)
Heading font:     Cormorant Garamond 300 + italic contrast
Body font:        DM Sans 300/400/500
Border radius:    0 — NO rounded corners anywhere, ever
No glassmorphism. No blur. No gradients.
```

---

## STEP 4 — BUILD THE SHARED LAYOUT SHELL

This is the foundation. Build it once. All six sections use it.

Create or fully rewrite: src/components/apply/CaseFileShell.tsx

### Props interface:
```typescript
interface CaseFileShellProps {
  sectionNumber: 1 | 2 | 3 | 4 | 5 | 6
  sectionTitle: string
  clusters: {
    id: string
    label: string
    status: 'complete' | 'active' | 'pending'
  }[]
  activeClusterId: string
  onClusterChange: (id: string) => void
  buildsDocuments: string[]   // e.g. ["Cover Letter", "Investor Biography"]
  nextSectionPath: string
  prevSectionPath: string
  isSaving: boolean
  children: React.ReactNode   // question panel content
  previewContent: React.ReactNode  // document preview panel content
}
```

### Layout — desktop (≥1024px):
Three-column grid: 200px sidebar | 1fr questions | 1fr preview
Full viewport height minus topbar. Each column scrolls independently.

### Layout — tablet (768px–1023px):
Two-column grid: 180px sidebar | 1fr questions
Preview panel hidden. "Preview document" button in topbar
opens preview as a slide-over drawer from the right.
Drawer is 380px wide, overlays the questions panel.
Drawer has a close button (×) top-right, gold border left edge.

### Layout — mobile (<768px):
Single column. Sidebar collapses to a horizontal cluster pill
strip at the top of the question area. Pills scroll horizontally.
No preview panel. Preview accessible via "See document" button
at bottom of each cluster — opens as a full-screen overlay.
Overlay: background #0a0a0a, gold close button top-right.

### Topbar (all breakpoints):
```
[← Back to case file]  [Section Title]  [1 of 6 pill]
                                  [Auto-saved •]  [Next: Section →]
```
Height: 52px
Border-bottom: 1px solid rgba(201,168,76,0.10)
Background: #0a0a0a (sticky — stays at top on scroll)

Back link: DM Sans 300 12px rgba(245,240,232,0.30), arrow icon
  Links to /apply

Section title: Cormorant Garamond 300 18px #f5f0e8

Progress pill: "N of 6"
  Font: DM Sans 500 10px #C9A84C uppercase
  Border: 1px solid rgba(201,168,76,0.25)
  Padding: 3px 10px
  No border-radius

Auto-save indicator:
  Gold dot (5px, pulse when saving, static when saved)
  "Auto-saved" text: DM Sans 300 11px rgba(245,240,232,0.25)
  "Saving..." text: same, shown while debounce is in flight

Next button:
  "Next: [Section Name] →"
  Background: #C9A84C
  Color: #0a0a0a
  DM Sans 500 11px uppercase
  Padding: 7px 16px
  No border-radius
  Disabled state: opacity 0.35 (never block saving)

### Left sidebar (desktop/tablet):

Width: 200px desktop, 180px tablet
Border-right: 1px solid rgba(201,168,76,0.08)
Background: rgba(201,168,76,0.01)
Padding: 24px 0

Cluster nav label:
  "Clusters" — 9px DM Sans 500 uppercase letter-spacing 0.18em
  rgba(245,240,232,0.20)
  Border-bottom: 1px solid rgba(201,168,76,0.06)
  Padding: 0 20px 10px
  Margin-bottom: 10px

Each cluster item:
  Flex row, gap 10px, padding 8px 16px
  Cursor: pointer
  Hover: background rgba(201,168,76,0.04)
  Active: background rgba(201,168,76,0.08)

Cluster icon (18×18px square, no border-radius):
  Pending: border 1px solid rgba(245,240,232,0.10)
            empty inside
  Active:  border 1px solid #C9A84C
            gold dot 6px centered
  Complete: border 1px solid rgba(201,168,76,0.35)
             background rgba(201,168,76,0.10)
             gold checkmark icon (ti-check 10px)

Cluster label:
  DM Sans 300 12px
  Pending: rgba(245,240,232,0.35)
  Active: #f5f0e8
  Complete: rgba(245,240,232,0.50)

Section divider below clusters:
  1px solid rgba(201,168,76,0.08)
  Margin: 16px 20px

"This section builds" label:
  9px DM Sans 500 uppercase rgba(245,240,232,0.20)
  Margin-bottom: 8px

Document list:
  Each document on its own line
  DM Sans 300 11px rgba(245,240,232,0.35)
  Line height 1.8

### Question panel (center column):

Padding: 32px 36px desktop, 24px 20px mobile
Overflow-y: auto

Cluster header block:
  Cluster eyebrow: 9px DM Sans 500 uppercase #C9A84C letter-spacing 0.20em
  Cluster heading: Cormorant Garamond 300 22px #f5f0e8 line-height 1.3
  Cluster subtitle: DM Sans 300 12px rgba(245,240,232,0.35) line-height 1.6
                    max-width 420px
  Margin-bottom: 28px

Cluster divider between clusters:
  Full-width rule: 1px solid rgba(201,168,76,0.10)
  "Next cluster" label right-aligned in gold, 10px, on click
    scrolls to next cluster and marks current complete
  Margin: 28px 0

Question block (each question):
  Margin-bottom: 28px

  Question label:
    Cormorant Garamond 300 17px #f5f0e8 line-height 1.5
    Not DM Sans — this is the most important typographic decision

  Helper text (below label, above input):
    DM Sans 300 11px italic rgba(245,240,232,0.30)
    Line height 1.5
    Margin-bottom: 10px

  PreFillBadge (if answer pre-filled from quiz or upload):
    Display: inline-flex, align-items center, gap 5px
    Font: DM Sans 300 10px #C9A84C letter-spacing 0.06em
    Border: 1px solid rgba(201,168,76,0.28)
    Padding: 2px 8px
    Margin-bottom: 8px
    Gold variants: "From your eligibility check" (quiz source)
    Amber variant: "From your documents" (upload source)
    Amber-orange: "From your documents — please verify"
    Keep existing PreFillBadge component — restyle only if needed

### TextArea redesign:

This is the most important component change.

Full rewrite of src/components/apply/questions/TextArea.tsx
(or wherever it currently lives — find it in the audit).

The textarea itself:
  Width: 100%
  Min-height: 110px (expands with content — auto-resize)
  Background: rgba(201,168,76,0.02)
  Border: 1px solid rgba(201,168,76,0.15)
  Color: #f5f0e8
  Font: DM Sans 300 14px line-height 1.7
  Padding: 14px 16px
  Resize: none (auto-height via scrollHeight)
  Outline: none
  Transition: border-color 0.2s
  Focus state: border-color rgba(201,168,76,0.45)
  Listening state: border-color #C9A84C
                   box-shadow 0 0 0 1px rgba(201,168,76,0.15)

Below the textarea — voice input bar:
  Flex row, align-items center, gap 10px, margin-top 8px

  Mic button:
    Flex row, align-items center, gap 7px
    Background: transparent
    Border: 1px solid rgba(201,168,76,0.22)
    Color: rgba(245,240,232,0.40)
    Font: DM Sans 400 11px letter-spacing 0.08em
    Padding: 6px 14px
    Cursor: pointer
    Transition: all 0.2s
    Icon: ti-microphone 13px
    Label: "Speak your answer"
    Hover: border-color #C9A84C, color #C9A84C
    No border-radius — hard rule

  Active (listening) state:
    Border-color: #C9A84C
    Color: #C9A84C
    Background: rgba(201,168,76,0.05)
    Icon changes to ti-microphone-off
    Label changes to "Stop recording"
    Animation: pulse glow 1.5s ease-in-out infinite
      keyframes: 0%,100% box-shadow 0 0 0 0 rgba(201,168,76,0.35)
                 50%  box-shadow 0 0 0 5px rgba(201,168,76,0)

  Waveform indicator (shown while listening, hidden otherwise):
    Flex row, gap 3px, align-items center
    4 bars: 3px wide, 12px tall, background #C9A84C
    Each bar animates scaleY 0.4→1→0.4, staggered 0.1s delays
    Label: "Listening — click to stop"
    DM Sans 300 11px #C9A84C

  Word count (right-aligned):
    DM Sans 300 10px
    < 20 words: rgba(245,240,232,0.18)
    ≥ 20 words: rgba(201,168,76,0.55)
    Format: "N words" or "N words ✓" (checkmark at 20+)

Wire the existing useSpeechInput hook (src/hooks/useSpeechInput.ts).
Fix the mic bug: the issue is almost certainly that
navigator.mediaDevices.getUserMedia permission is not being
requested before SpeechRecognition.start(). Add a permission
pre-check: if 'microphone' permission is not granted, call
navigator.mediaDevices.getUserMedia({audio: true}) first,
then start recognition in the .then() callback. This is what
makes the mic appear to do nothing — the permission prompt fires
and the handler doesn't wait for it.

Also confirm: SpeechRecognition is initialized inside a
useEffect (not at module level) — SSR will crash otherwise.
Wrap all Web Speech API access in:
  if (typeof window === 'undefined') return
  if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return

### Document preview panel (right column):

Padding: 28px 24px
Background: rgba(201,168,76,0.01)
Overflow-y: auto

Preview header:
  Flex row space-between
  Eyebrow: "Document preview" — 9px DM Sans 500 uppercase
           rgba(245,240,232,0.22) letter-spacing 0.20em
  Active document badge: "Cover Letter" or "Business Plan" etc.
    10px DM Sans rgba(201,168,76,0.55)
    Border: 1px solid rgba(201,168,76,0.18)
    Padding: 2px 8px
  Margin-bottom: 20px

Document card (one per document this section feeds):

  Border: 1px solid rgba(201,168,76,0.12)
  Background: rgba(201,168,76,0.01)
  Margin-bottom: 16px

  Card header:
    Padding: 10px 16px
    Border-bottom: 1px solid rgba(201,168,76,0.08)
    Flex row space-between

    Document name:
      10px DM Sans 500 uppercase rgba(245,240,232,0.35)
      letter-spacing 0.12em

    Status badge — three states:
      "Building":
        10px DM Sans, color #C9A84C
        Border: 1px solid rgba(201,168,76,0.35)
        Background: rgba(201,168,76,0.06)
        Padding: 2px 7px
      "Waiting":
        10px, rgba(245,240,232,0.18), border rgba(245,240,232,0.08)
      "Ready":
        10px, rgba(120,200,130,0.80), border rgba(120,200,130,0.25)

  Card body: padding 14px 16px

    Field block (one per document section filled by this cluster):
      Margin-bottom: 10px

      Field label:
        9px DM Sans 500 uppercase rgba(245,240,232,0.20)
        Letter-spacing: 0.12em
        Margin-bottom: 4px

      Field value:
        12px DM Sans 300 line-height 1.5
        Filled: rgba(245,240,232,0.75)
        Placeholder (empty): rgba(245,240,232,0.18) italic
          Text: "[Answer the question on the left to fill this in]"
        Transition: opacity 0.4s when content appears

    Fill progress bar (bottom of card):
      Flex row, align-items center, gap 8px
      Border-top: 1px solid rgba(201,168,76,0.08)
      Padding-top: 10px, margin-top: 10px

      Label: section name, 10px rgba(245,240,232,0.22)
      Bar wrapper: flex 1, height 2px, background rgba(245,240,232,0.05)
      Bar fill: height 2px, background #C9A84C
                Transition: width 0.8s ease
      Percentage: 10px rgba(245,240,232,0.28) min-width 32px right-aligned

  Document preview is TEMPLATE-BASED (Phase 1).
  It does not call the AI. It shows structured placeholders
  that fill in as the user types. The field values shown are
  derived from current answer state — read from the same
  state that drives the auto-save, never from the DB directly.

---

## STEP 5 — SECTION-BY-SECTION DOCUMENT MAP

The preview panel must know which document fields each cluster feeds.
This map drives what appears in the right panel for each section.

### /apply/story — 4 clusters

Builds: Cover Letter (Tab D), Investor Biography (Tab B)

  Who you are →
    Cover Letter: "Opening — who you are" paragraph
    Biography: "Professional background" section

  Your plan →
    Cover Letter: "Investment motivation" paragraph
    Cover Letter: "Qualifications overview" paragraph

  Administrative →
    Cover Letter: "Application context" (visa class, consulate)
    Biography: "Personal details" section

  Travel & history →
    Cover Letter: "Travel history summary" (if relevant)
    DS-160 Reference: "Travel history" fields

### /apply/business — 7 clusters

Builds: Business Plan (Tab K), Visa Letter (employer letter if applicable)

  Entity →
    Business Plan: "Business overview" header block
    Business Plan: "Legal structure and ownership"

  What you do →
    Business Plan: "Products and services" section
    Business Plan: "Value proposition"

  Operations →
    Business Plan: "Operations plan"
    Business Plan: "Location and facilities"

  Licenses →
    Business Plan: "Regulatory compliance" section

  Franchise (conditional — shown if business_type = franchise) →
    Business Plan: "Franchise relationship" section
    Business Plan: "Franchisor support"

  Startup costs →
    Business Plan: "Startup cost summary" table
    Source of Funds: "Investment allocation"

  Market →
    Business Plan: "Market analysis"
    Business Plan: "Competitive landscape"

### /apply/investment — 5 clusters

Builds: Source of Funds (Tab H), Investment Proof (Tab F)

  Overview →
    Source of Funds: "Investment summary" opening
    Investment Proof: "Total investment amount"

  Source of funds →
    Source of Funds: "Fund origin narrative" (longest section)
    Source of Funds: "Source documentation list"

  Paper trail →
    Source of Funds: "Fund path chronology"
    Investment Proof: "Transfer documentation"

  Projections →
    Business Plan: "Financial projections" table (Year 1–5)

  Non-marginality →
    Business Plan: "Non-marginality argument"
    Cover Letter: "Economic contribution" paragraph

### /apply/qualifications — 5 clusters

Builds: Investor Biography (Tab B), Org Chart description

  Background →
    Biography: "Education and credentials"

  Business experience →
    Biography: "Professional history" (main narrative)
    Cover Letter: "Qualifications paragraph" (cross-reference)

  Role →
    Biography: "Executive role description"
    Org Chart: "Principal investor position"

  Visa history →
    Biography: "Immigration history" (if relevant)
    DS-160 Reference: "Prior visas" section

  Interview prep →
    Biography: No direct feed — flags for Module 4 follow-up

### /apply/family — 4 clusters

Builds: Dependent section (Tab L), DS-160 Reference family fields

  Spouse →
    Tab L: "Spouse information block"
    DS-160 Reference: "Spouse details"

  Children →
    Tab L: "Dependent children — [name per child]"
    DS-160 Reference: "Children listed"

  Documents →
    Tab L: "Document checklist for dependents"

  Travel →
    DS-160 Reference: "Dependent travel history"

### /apply/ties — 5 clusters

Builds: Non-immigrant intent section (Tab C), Interview prep notes

  Property →
    Tab C: "Canadian property holdings"
    Cover Letter: "Canadian ties — property"

  Family →
    Tab C: "Canadian family connections"
    Cover Letter: "Canadian ties — family"

  Financial obligations →
    Tab C: "Financial ties to Canada"

  Return intent →
    Tab C: "Intent to return narrative" (critical section)
    Cover Letter: "Non-immigrant intent paragraph"

  Cover letter →
    Cover Letter: "Closing statement" paragraph

---

## STEP 6 — VARIANT HANDLING

These must render correctly without any change to their
conditional logic. Visual treatment only changes.

### Partnership variant

Partnership clients see three tracks within each section:
  Track 1: "Shared" — questions about the business itself
  Track 2: "Your information" — Partner A personal questions
  Track 3: "[Partner name]'s information" — Partner B questions

Current rendering: Check how the existing pages handle this.
Do not change the logic. Only style the track headers:

  Track header:
    9px DM Sans 500 uppercase letter-spacing 0.18em
    "Shared" → rgba(245,240,232,0.30)
    "Your information" → #C9A84C
    "[Partner name]'s information" → rgba(201,168,76,0.60)
    Border-bottom: 1px solid rgba(201,168,76,0.10)
    Padding-bottom: 8px, margin-bottom: 20px

### COS (Change of Status) variant

COS clients see additional question blocks within some sections.
These appear as a distinct advisory block with a COS label:

  COS block container:
    Border-left: 2px solid rgba(201,168,76,0.35)
    Background: rgba(201,168,76,0.03)
    Padding: 14px 16px
    Margin: 16px 0

  COS eyebrow:
    "Change of Status — additional information"
    9px DM Sans 500 uppercase #C9A84C letter-spacing 0.14em
    Margin-bottom: 10px

### Family variants (/apply/family only)

The family section contains conditional blocks for:
  - Common-law partner (attorney referral advisory)
  - Stepchildren (pre-age-18 marriage verification)
  - Children born outside marriage (legitimation questions)
  - Age-out alert (child approaching 21)

These are AdvisoryBlock and RiskFlag components.
Restyle these components consistently:

  AdvisoryBlock:
    Border-left: 2px solid rgba(201,168,76,0.40)
    Background: rgba(201,168,76,0.03)
    Padding: 14px 16px
    Icon: ti-info-circle, 14px, #C9A84C
    Title: DM Sans 500 13px #C9A84C
    Body: DM Sans 300 12px rgba(245,240,232,0.55) line-height 1.6

  RiskFlag:
    Border-left: 2px solid rgba(239,68,68,0.45)
    Background: rgba(239,68,68,0.03)
    Padding: 14px 16px
    Icon: ti-alert-triangle, 14px, rgba(239,68,68,0.80)
    Title: DM Sans 500 13px rgba(239,68,68,0.80)
    Body: DM Sans 300 12px rgba(245,240,232,0.50) line-height 1.6

  Attorney referral flag (specific variant):
    Border-left: 2px solid rgba(251,146,60,0.45)
    Background: rgba(251,146,60,0.03)
    Icon: ti-gavel, color rgba(251,146,60,0.80)
    Title: "Attorney review recommended"
    Link: "Connect with a vetted E-2 attorney →" in amber

### PreFillBadge variants (three types, all in use):

  Quiz source (gold):
    "✦ From your eligibility check"
    Color: #C9A84C
    Border: 1px solid rgba(201,168,76,0.28)
    Background: transparent

  Upload source high confidence (amber):
    "◈ From your documents"
    Color: rgba(251,191,36,0.80)
    Border: 1px solid rgba(251,191,36,0.25)

  Upload source medium confidence (amber-orange):
    "◈ From your documents — please verify"
    Color: rgba(251,146,60,0.80)
    Border: 1px solid rgba(251,146,60,0.25)

---

## STEP 7 — /apply OVERVIEW PAGE

The overview is the first thing a paid client sees.
It must set the right expectation for the interior.

Read src/app/apply/page.tsx fully.
Preserve all data fetching and personalisation logic.
Restyle the section cards:

Each section card:
  Border: 1px solid rgba(201,168,76,0.12)
  Background: rgba(201,168,76,0.015)
  Padding: 20px 24px
  No border-radius
  Cursor: pointer
  Hover: border-color rgba(201,168,76,0.28),
         background rgba(201,168,76,0.03)
  Transition: all 0.15s

  Section number:
    9px DM Sans 500 uppercase #C9A84C letter-spacing 0.18em
    Margin-bottom: 6px

  Section title:
    Cormorant Garamond 300 italic 20px #f5f0e8

  Section description:
    DM Sans 300 12px rgba(245,240,232,0.40) line-height 1.6
    Margin-top: 6px

  Completion state:
    Complete: gold checkmark top-right, border-color rgba(201,168,76,0.30)
    In progress: gold progress indicator (e.g. "3 of 4 clusters")
    Not started: default state

  Document chips (what this section builds):
    Small pills below description
    DM Sans 300 10px rgba(245,240,232,0.28)
    Border: 1px solid rgba(245,240,232,0.08)
    Padding: 2px 8px

---

## STEP 8 — /apply/module4 VISUAL CONSISTENCY

The voice sample page at /apply/module4 uses a raw <textarea>
HTML element (confirmed from audit). It must look consistent
with the redesigned TextArea component — same surface treatment,
same border color, same focus state. But it must NOT have the
mic button — the voice sample page has its own separate AI
detection flow that must not be altered.

Find the textarea in src/app/apply/module4/page.tsx.
Apply only these style properties — nothing else:
  background: rgba(201,168,76,0.02)
  border: 1px solid rgba(201,168,76,0.15)
  color: #f5f0e8
  font-family: DM Sans, sans-serif
  font-weight: 300
  font-size: 14px
  line-height: 1.7
  padding: 14px 16px
  outline: none

Do not add a mic button here.
Do not change any logic, handler, or validation.
Do not change word count or submit button.

---

## STEP 9 — UPLOAD FLOW VISUAL CONSISTENCY

The four upload pages must match the redesigned aesthetic.
They are seen by self-preparers before the six sections.

Pages:
  /apply/upload — document type selection + drag-and-drop
  /apply/upload/processing — SSE progress
  /apply/upload/review — discrepancy resolution
  /apply/upload/gaps — gap report

Apply Obsidian Gold tokens consistently:
  Surface cards: border rgba(201,168,76,0.12), bg rgba(201,168,76,0.02)
  Status indicators: use same pattern as section card completion states
  Progress bars: height 2px, background #C9A84C
  File drop zone: border 1px dashed rgba(201,168,76,0.25)
                  hover: border-color rgba(201,168,76,0.55)
                  active: bg rgba(201,168,76,0.04)

Do not touch any API route, extraction logic, or SSE handling.
Visual layer only — same rule as the section pages.

---

## STEP 10 — DATA WRITE VERIFICATION TEST

After rebuilding each section page, verify data writes still work.

Method:
```bash
# Start dev server if not running
npm run dev &

# Use Playwright to:
# 1. Log in with test credentials
# 2. Navigate to the rebuilt section page
# 3. Type text into a textarea
# 4. Wait 3 seconds (auto-save debounce)
# 5. Query the answers table for that applicationId
# 6. Confirm the answer was written
```

If Playwright cannot authenticate, use this manual verification:
Open browser DevTools → Network tab
Type in a textarea
After 2-3 seconds, confirm a POST or PATCH request fires
to the answers API route
Confirm 200 response
Screenshot the network tab showing the successful write

This verification must pass for EACH of the six sections
before that section is committed.

---

## STEP 11 — BUILD AND PLAYWRIGHT VERIFICATION

After all six sections are rebuilt:

```bash
npm run build
```

Zero errors required.

Use Playwright to screenshot:

1. localhost:3000/apply — overview with section cards
2. localhost:3000/apply/story — desktop, 1440px
3. localhost:3000/apply/story — mobile, 390px
4. localhost:3000/apply/business — desktop
5. localhost:3000/apply/investment — desktop
6. localhost:3000/apply/qualifications — desktop
7. localhost:3000/apply/family — desktop
   (confirm family variant advisory blocks render)
8. localhost:3000/apply/ties — desktop
9. localhost:3000/apply/story — with a textarea focused
   (confirm focus border state)
10. localhost:3000/apply/story — with mic button active
    (confirm pulse animation and waveform visible)
11. localhost:3000/apply/module4 — confirm no mic button
    confirm textarea style matches

Check each screenshot:
  ✓ Cormorant Garamond on question labels
  ✓ No rounded corners anywhere
  ✓ Gold accent correct (#C9A84C)
  ✓ Two-panel layout visible on desktop
  ✓ Single column on mobile
  ✓ Mic button present on all textareas in sections 1–6
  ✓ No mic button on module4
  ✓ Document preview panel shows placeholder text
  ✓ No white or light backgrounds anywhere

---

## STEP 12 — COMMIT SEQUENCE

One commit per section. In order:

```bash
git add src/components/apply/CaseFileShell.tsx
git add src/components/apply/questions/TextArea.tsx
git add src/hooks/useSpeechInput.ts
git commit -m "feat: CaseFileShell — two-panel layout, Obsidian Gold, voice input"
git push origin dev

git add src/app/apply/page.tsx
git commit -m "feat: case file overview — premium section cards"
git push origin dev

git add src/app/apply/story/
git commit -m "feat: Your Story — redesigned, two-panel, voice input verified"
git push origin dev

git add src/app/apply/business/
git commit -m "feat: Your Business — redesigned, two-panel, voice input verified"
git push origin dev

git add src/app/apply/investment/
git commit -m "feat: Your Investment — redesigned, two-panel, voice input verified"
git push origin dev

git add src/app/apply/qualifications/
git commit -m "feat: Your Qualifications — redesigned, two-panel, voice input verified"
git push origin dev

git add src/app/apply/family/
git commit -m "feat: Your Family — redesigned, all variants preserved, voice input verified"
git push origin dev

git add src/app/apply/ties/
git commit -m "feat: Your Ties — redesigned, two-panel, voice input verified"
git push origin dev

git add src/app/apply/module4/
git commit -m "fix: module4 textarea visual consistency — no mic button, style only"
git push origin dev

git add src/app/apply/upload/
git commit -m "feat: upload flow visual consistency — Obsidian Gold applied"
git push origin dev
```

---

## STEP 13 — UPDATE BUILD TRACKER

Update ~/E2-go/BUILD_TRACKER.md:
  Mark case file redesign complete
  Add all commit hashes
  Note: mobile layout uses horizontal cluster pills + overlay preview
  Note: mic permission bug fixed (getUserMedia pre-check)
  Note: upload flow visual consistency applied
  Update next session priorities

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — case file redesign complete"
git push origin dev
```

---

## COMPLETION REPORT

When done, report exactly:

```
Case file redesign complete.

Sections rebuilt: story, business, investment,
qualifications, family, ties
Overview page: restyled
Module 4: visual consistency only, no logic change
Upload flow: Obsidian Gold applied

Layout: two-panel desktop | drawer tablet | overlay mobile
Voice input: mic bug fixed (getUserMedia pre-check added)
Variants preserved: partnership tracks, COS blocks,
  family sub-paths, all advisory/risk flag components

Data write verification: passed on all 6 sections
  [list each section and confirmation method]

Build: clean — [N] routes, 0 errors
Playwright: screenshots saved for all 11 states

Commits: [list all commit hashes in order]

Ready for manual review in Chrome.
```

---

## PASTE THIS INTO CLAUDE CODE TO START:

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/DESIGN_REFERENCE.html.
Read docs/sessions/SESSION_CASEFILE_REDESIGN.md — execute exactly as written.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Confirm MCP servers active: Playwright, Firecrawl, Lazyweb.
Report current state of all six case file section pages.
Confirm all data hooks documented before writing any code.
Ask "Ready to confirm and begin?" — do not start until confirmed.
```
