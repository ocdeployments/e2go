# CLAUDE_CONTEXT.md — e2go.app
## Master Context for Every Claude Code Session
**Version:** June 2026 — Updated after comprehensive audit
**Read this entire file before doing anything.**
**Then read BUILD_TRACKER.md.**
**Then read docs/DESIGN_REFERENCE.html before any UI work.**

---

## SESSION COMMANDS

### "start session"
1. Read this entire CLAUDE_CONTEXT.md
2. Read BUILD_TRACKER.md completely
3. Read docs/DESIGN_REFERENCE.html if session involves UI
4. Report: what was completed last session, what is broken,
   what the next priority task is, current app status
5. Confirm all standing build rules are loaded
6. Ask: "Ready to confirm and begin?"
Do not start work until user confirms.

### "end session"
1. Update BUILD_TRACKER.md — mark completed ✅, add bugs,
   update session log, set next session priorities
2. Update CLAUDE_CONTEXT.md if any decisions changed
3. Run npm run build:clean — confirm zero errors, all tests pass
4. Report: "Session complete. [summary]"

---

## PRODUCT OVERVIEW

**App name:** e2go.app
**What it is:** Self-service U.S. E-2 Treaty Investor visa preparation platform
**Who it serves:** Global treaty country nationals — optimized for Toronto consulate
**What it replaces:** $6,500–$15,000 immigration attorney engagement
**What it produces:** A complete, consulate-formatted E-2 application package
**Legal position:** Document preparation service — NOT a law firm
**Critical rule:** Never use language suggesting the app replaces legal counsel

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + Auth) |
| AI — Document Generation | Claude Sonnet via Anthropic API (direct) |
| AI — App Features | MiniMax M1 via OpenRouter |
| Email | Resend |
| Payments | Stripe (not yet integrated) |
| Hosting | Vercel |
| PDF Generation | neat-pdf MCP + docxtpl (Python) |
| Document Templates | docxtpl + docx2pdf + docxcompose + htmldocx |

**AI routing rules:**
- Document generation: Anthropic API called directly from
  server-side API routes — model: claude-sonnet-4-20250514
- App features (interview simulator, gap analysis):
  MiniMax via OpenRouter at https://openrouter.ai/api/v1
- All AI calls: server-side only via /api/ai/route.ts
  NEVER in browser code

**MiniMax model string:** minimax/MiniMax-Text-01
**OpenRouter base URL:** https://openrouter.ai/api/v1
**Anthropic model string:** claude-sonnet-4-20250514

---

## DESIGN SYSTEM — LOCKED

Read docs/DESIGN_REFERENCE.html before any UI work.
This file is the canonical visual reference for every component.
Match it exactly. Do not invent new styling.

| Token | Value |
|---|---|
| Background | #060d1f (deep navy) |
| Primary accent | #0D9488 (teal) |
| Text primary | #f0ede6 (warm white) |
| Text secondary | rgba(240,237,230,0.65) |
| Glass card bg | rgba(255,255,255,0.05) |
| Glass blur | backdrop-filter: blur(16px) |
| Glass border | 1px solid rgba(255,255,255,0.10) |
| Card radius | 16px |
| Button radius | 8px |
| Heading font | Playfair Display (serif) |
| Body font | DM Sans (300/400/500) |

**Quiz option buttons:** Never white. Always glass.
rgba(255,255,255,0.05) default → rgba(13,148,136,0.15) selected
**Progress bars:** Always teal #0D9488 — never blue
**Question text:** Playfair Display 26px, fully opaque foreground
**Never use:** Blue accents, white cards on dark backgrounds,
watermark-style question text, Inter/Roboto fonts

---

## DOCUMENT GENERATION — LOCKED STANDARDS

### Typography (submitted documents)
- Body font: Times New Roman 12pt
- Heading font: Times New Roman Bold 13pt
- Margins: 1 inch all sides
- Line spacing: 1.5 for narrative, single for tables
- Sections: Roman numerals (I, II, III)
- Dates: January 15, 2026 (never 01/15/26)
- Dollars: $187,500 USD (always commas + USD)

### Document Header (every page after cover)
`[Applicant Last Name] E-2 Application | [Document Name] | [Date]`

### Document Footer (every page)
Plain page number only: `Page X of Y`
NO e2go.app branding on submitted documents
NO disclaimers on submitted documents
NO AI generation markers

### Branding Rule — CRITICAL
e2go.app branding appears ONLY inside the app interface.
NEVER on documents submitted to the consulate.
Documents belong to the applicant. They prepared them.
All legal disclaimers appear inside the app before download.

### Page Limits
- Toronto consulate: 50 pages per tab (not 50 total)
  Exemptions from page count: DS-160, DS-156E, G-28,
  appointment confirmation, civil documents, passport
  bio page copies, tab dividers
- Frankfurt consulate: 30 pages total, 5MB, executive
  summary business plan only
- London consulate: 20MB upload limit

### Document Ownership Rule
Each piece of information lives in exactly ONE document.
No repetition across tabs.
Standard 4 mapping:
- Investment amount: Full in Tab F → reference only in Cover Letter
- Fund source narrative: Full in Tab H → one sentence in Cover Letter
- Investor qualifications: Full in Tab J → one paragraph in Cover Letter
- Business description: Full in Tab K → summary in Cover Letter
- Non-immigrant intent: Full in Cover Letter → not repeated elsewhere

---

## DOCUMENT GENERATION PIPELINE — LOCKED

### Generation Order
```
Step 1  → Cover Letter (Tab D)
Step 2  → Source of Funds (Tab H)
Step 3  → Investment Proof (Tab F)
Step 4  → Business Plan (Tab K)
Step 5  → Qualifications (Tab J)
Step 6  → DS-160 Reference (Tab A)
Step 7  → Gap analysis
Step 8  → Repetition checker
Step 9  → Consistency checker
Step 10 → AI detection audit
Step 11 → Humanization pass
Step 12 → Metadata sanitization
Step 13 → Quality gate
Step 14 → Pre-download acknowledgment gate (5 checkboxes)
Step 15 → Preview unlocked for user
```

### Key Pipeline Rules
- ONE document at a time — never parallel
- Save to database immediately after each document completes
- Never regenerate a document already saved and marked complete
- User never sees a document below quality threshold
- Cover Letter is Step 1 — it is the officer's roadmap
- All other documents must be consistent with the cover letter

### AI Detection and Humanization
Every generated document must pass AI detection before release.
Detection threshold: score < 0.35 (lower = more human-like)
If fails: humanization pass → re-detect → max 3 attempts
If all 3 fail: flag for human review, do not release

### Metadata Sanitization (mandatory before every download)
Strip from Word documents:
- Author field → blank
- Creator field → blank
- Tracked changes → accept all and remove
- Comments → remove all
- Hidden text → remove
- Template references → remove
- Revision history → clear

### Crash Recovery
- Scenario A (transient): auto-retry 3x — 30s, 2min, 5min
- Scenario B (one doc fails): others complete, retry every 15min
  for 24hrs, email user when recovered
- Scenario C (complete failure): preserve completed docs,
  "We'll email you when ready", auto-create support ticket,
  human review within 2 hours

### Pre-Download Acknowledgment Gate
5 checkboxes — all must be checked before download unlocked:
1. I have reviewed these documents for accuracy
2. I understand e2go.app is not a law firm
3. I understand submitting false information is a federal offense
4. I understand no outcome is guaranteed
5. I have been recommended to have documents reviewed by an attorney

This is the legal protection layer. It lives inside the app.
It does not appear on the documents themselves.

---

## VOICE MATCHING SYSTEM

### Writing Sample Collection
Before document generation, applicant writes 2-3 paragraphs
in natural voice. Platform uses this to match writing style.

Client instruction:
"Write this yourself. Do not use AI. We check every sample.
If AI-generated, we will ask you to rewrite it."

### AI Detection on Writing Sample
Run immediately on submission.
If fails: warm retry with simpler prompts (2 attempts max)
If both fail: switch to structured 3-question format

### Voice Profile Extracted
- Sentence length distribution
- Vocabulary complexity
- Active/passive ratio
- Formality register
- Argument structure (story-first vs evidence-first)
- Emotional tone markers

This profile is injected into every generation prompt.
Documents sound like the applicant wrote them.

---

## ANALYSIS ENGINE

Runs after Module 3 personal tabs complete, before generation.
Produces a structured Case Brief used by all generation prompts.

### Calculations
1. Investment substantiality ratios (vs business cost, vs net worth)
2. Experience match score (9 dimensions)
3. Fund source complexity rating
4. Non-immigrant intent strength (tie count)
5. All 15 denial risk assessments (D-01 through D-15)
6. Marginality ratio (revenue vs household income need)

### Case Brief Output (internal — never shown to user)
Strengths, gaps requiring creative framing, gaps requiring
client follow-up, framing decisions, document priorities,
voice profile reference.

### Dashboard Display
Simplified strength indicators shown to user.
MANDATORY DISCLAIMER on all strength displays:
"These indicators reflect document preparation completeness —
not a legal determination of E-2 eligibility."

---

## FOLLOW-UP CONVERSATION SYSTEM

Runs between Module 3 completion and document generation.
Fills content gaps identified by Analysis Engine.
Not a form — a genuine conversation, one question at a time.

### Gap Categories (10 universal)
1. Industry/sector knowledge
2. Management and operations experience
3. Sales and client acquisition experience
4. Financial management experience
5. Regulatory and compliance awareness
6. Technical/trade skills (trade businesses)
7. Population-specific experience (care businesses)
8. Business ownership history
9. Relevant education and training
10. Personal motivation and commitment narrative

### Probe Cascade — Senior Care Example
Q1: Direct experience with elderly/disabled in any context?
Q2: Cared for elderly parent, relative, or friend?
Q3: Child or dependent with special needs?
Q4: Volunteered with vulnerable populations?
Q5: Professional work with populations needing extra support?

### Question Generation Rules
- Questions generated by AI per applicant — not scripted
- Maximum 8 questions per session
- Every question explains why it matters before asking
- Conversational tone throughout — never interrogative
- Follows existing 4-layer adaptive case-building architecture
  in BUILD_TRACKER.md

---

## LEGAL BOUNDARY — NEVER CROSS

### What the platform CAN do
- Collect and organize information the applicant provides
- Generate documents based on applicant-provided facts
- Present facts in the most compelling, honest light
- Run AI detection and humanization passes
- Provide general educational information about E-2 process

### What the platform CANNOT do
- Tell applicant their investment is "substantial"
- Tell applicant their experience is "sufficient"
- State that any legal standard is met or satisfied
- Use the words: "qualifies", "eligible", "meets the standard",
  "satisfies the requirement" in relation to specific facts
- Make legal conclusions that belong to the officer
- Advise on which visa category to choose
- Represent applicants before any government agency

### Generation Prompt Requirement
Every generation prompt must include:
"Present the applicant's facts compellingly.
Do not make legal conclusions.
Do not state that any legal standard is met.
State facts. Let the officer draw conclusions."

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Rule |
|---|---|
| Paywall timing | After Module 3 personal tabs complete, before generation. Show 1-2 page preview. Pay to download. |
| Document generation | Sequential — ONE at a time. Checkpointed. Never parallel. |
| Cover letter | Generated FIRST (Step 1). Officer's roadmap. |
| Supabase auth | Use auth.users. Create public.profiles — not public.users. |
| AI calls | Server-side only via /api/ai/route.ts. Never client-side. |
| Data storage | Answers only. Never store passports, bank statements, tax docs. |
| Document ownership | Each fact lives in exactly one document. No repetition. |
| Form terminology | All questions use exact DS-160/U.S. government terminology. |
| Interview limits | 2 simulator sessions included. Extra: $9.99/3-bundle. |
| Stats | Only real government data. Never fabricated. |
| No Canada-only assumptions | App is global — 82 treaty countries. |
| Prompt storage | Versioned .md files in /prompts/v1/documents/ — never hardcoded. |
| Partnership routing | Two packages generated for partnership applications. |
| e2go branding on docs | NEVER appears on submitted documents. |
| Page limit | 50 pages per tab (Toronto). Enforced per tab, not total. |
| AI disclosure | Required inside app. Never on submitted documents. |

---

## QUIZ — v3.0 LOCKED

- 26 questions (up from 22)
- Global treaty country selector (82 countries)
- Stage-aware framing (A through D)
- Files: public/data/module0_questions.json (v3.0)
         public/data/module0_scoring_logic.json (v3.0)
         public/data/treaty_countries.json

Hard stops: PR-01 through PR-08 + PR-THIRD-COUNTRY
Dynamic text: [nationality] and [home country] must be
replaced with actual country name from Q0-01 answer.
Sub-question timing: appears immediately on selection —
never requires navigation to trigger.

---

## MODULE 3 — TABS A THROUGH L

Tab batch assignments:
- Batch 1 (personal — immediate after payment): B, partial F, J, L
- Batch 2 (business — after formation): A, C, D, E, F business, G, H, I, K

All 12 tabs have updated specs in docs/ with:
- Global language (no Canada-only references)
- Batch tags
- Privacy categories (required/red/amber/green)
- Lead temperature signals
- Denial prevention flags
- New questions per session 9 additions

Privacy category system:
- required: no skip (name, nationality only)
- red: skip with prominent advisory
- amber: skip with inline note
- green: skip with gentle reassurance

---

## DOCUMENT GENERATION SPECS

Four specification documents in docs/:
- Spec1_Analysis_Engine.md
- Spec2_Followup_Conversation.md
- Spec3_Generation_Prompts.md
- Spec4_Quality_Gate_Pipeline.md

NOTE: These specs need one update before building.
The cover letter order must reflect Step 1 (not last).
The page limit must reflect 50 per tab (not 50 total).
The AI model must reflect Anthropic API for generation.
The prompt storage must use /prompts/v1/ file structure.

---

## PRICING — LOCKED

| Application Type | Price |
|---|---|
| Solo individual | $297 |
| Solo + spouse | $347 |
| Solo + family (up to 2 kids) | $397 |
| Solo + family (3-5 kids) | $447 |
| Partnership no families | $497 |
| Partnership two couples | $547 |
| Partnership two full families | $647 |

Founding member pricing — first 500 applications.
14-day money-back guarantee — first 50 founding members.
Refund = full payment minus Stripe processing fees.
Conditions: within 14 days, Module 1 started, no documents generated.

---

## LEAD TEMPERATURE SCORING (internal — never shown to user)

7 signals stored in applications table:
1. Business selected (franchise/type named)
2. Funds committed (transferred/deployed)
3. LLC formed
4. Bank account open
5. Timeline (within 6 months = hot)
6. Document readiness (most in hand = hot)
7. Confidence level (very confident = hot)

Score 5-7: urgency messaging, direct franchisor routing
Score 3-4: franchise broker routing, nurture sequence
Score 0-2: education-first, re-engagement sequence

---

## REFERRAL ENGINE

5 categories — all require explicit CASL consent at Module 1:

| Category | Trigger | Fee |
|---|---|---|
| Franchise/Business | Module 2 or still exploring | $150–$300/intro or 10–15% revenue |
| Immigration Attorney | Attorney flag in quiz or complex case | $200–$400/intro |
| Cross-Border Banking | No US account (Tab G) | $100–$200/opened account |
| Cross-Border CPA | RRSP/property sale in Tab F | $150–$250/intro |
| Real Estate | Tab G commercial / post-approval residential | $150–$1,000/intro |
| LLC Formation | QE-05 = not yet formed | Registered agent referral |
| FX Transfer | Wire over $50K (Tab F) | Currency specialist referral |

Referral triggers fire from specific question answers.
All referrals: double opt-in, contact released only after applicant confirms.

---

## STANDING BUILD RULES

### RULE 1 — SEO ON EVERY PAGE
Every page gets SEO metadata when built. Never retrofit.
noindex on: /quiz, /results, /dashboard, /apply/*, /admin,
/login, /signup, /pricing

### RULE 2 — MOBILE FIRST
Every component verified at 390px width before pushing.
Minimum 44px tap targets on all interactive elements.

### RULE 3 — NO CANADA-ONLY ASSUMPTIONS
App serves 82 treaty countries. All language uses dynamic
[nationality]/[home country] references.

### RULE 4 — DESIGN REFERENCE FIRST
Read docs/DESIGN_REFERENCE.html before any UI code.
Read /mnt/skills/public/docx/SKILL.md before any document code.

### RULE 5 — ACTIVATE TASTE
Run /taste before any UI session.

### RULE 6 — ONE FILE PER COMMIT
Never commit multiple files in one commit.

### RULE 7 — VERIFY WITH RAW OUTPUT
After every push: git log --oneline to confirm commits.

### RULE 8 — DOCUMENT GENERATION SAFETY
- ONE document at a time. Never parallel.
- Save to DB immediately after completion.
- Never regenerate an already-saved complete document.
- User never sees below quality threshold.
- Quality gate must pass before any preview shown.

### RULE 9 — LIFECYCLE TRACKING
Every significant user action updates application_lifecycle
table with timestamp.

### RULE 10 — BUILD TRACKER UPDATE
At "end session": update BUILD_TRACKER.md completely.

### RULE 11 — NO e2go BRANDING ON DOCUMENTS
e2go.app never appears on submitted documents.
All disclaimers live inside the app before download.

### RULE 12 — LEGAL BOUNDARY
Never state that any legal standard is met.
Never use: qualifies, eligible, meets the standard,
satisfies the requirement — in relation to specific facts.

### RULE 13 — NEVER INFER IN DOCUMENTS
Every sentence traces to an applicant-provided answer.
If information is not provided, section stays incomplete.
Never fill gaps with plausible-sounding language.

### RULE 14 — AI DETECTION MANDATORY
Every generated document must pass AI detection before release.
Detection threshold: 0.35. Maximum 3 humanization attempts.
If all fail: human review queue, not release.

### RULE 15 — METADATA CLEAN
Every document stripped of AI markers, author fields,
tracked changes, comments, template references before download.

### RULE 16 — FOUR SCREEN STATES
Every Module 3 tab requires: INTRO, QUESTION, COMPLETION, RESUME.

### RULE 17 — TAB CONFIG IS SOURCE OF TRUTH
Tab configuration JSON is single source of truth for questions.

### RULE 18 — DOCUMENT CONDITIONALS ENFORCED
All document conditional logic from Document_Conditionals.md applied.

### RULE 19 — DATABASE SAFETY
Never DROP TABLE. Always IF NOT EXISTS. Idempotent scripts only.

### RULE 20 — MAGIC MCP FOR UI
Invoke Magic MCP before writing any new component shell. Never write UI shells from scratch.

### RULE 21 — LAZYWEB BEFORE MAGIC
Invoke Lazyweb for reference screens before describing to Magic.

### RULE 22 — MAGIC FOR NEW SURFACES ONLY
Magic for net-new UI. Extensions of existing components follow DESIGN_REFERENCE.html Section 07 directly.

### RULE 23 — SPEC FILES STAY CURRENT
Any question added or changed during a session must be written back to the relevant spec file in the same session. Code and spec must never diverge.

### RULE 24 — DESIGN DIRECTION LOCKED — OBSIDIAN GOLD PERMANENTLY
Background #0a0a0a, accent #C9A84C, text #f5f0e8,
Cormorant Garamond headings, DM Sans body.
Never teal, navy, glassmorphism, Inter headline.

### RULE 25 — FORM UX LOCKED — CATEGORY-BASED LAYOUT ONLY
Never one-question-at-a-time in Module 3.
Left sidebar with completion rings.
All questions in a category visible simultaneously.

### RULE 26 — VOICE PROFILE JSON EXTRACTION ELIMINATED
Pass raw writing sample text directly into generation prompts.
Do not extract structured JSON perplexity/burstiness scores.

### RULE 27 — COVER LETTER — DRAFT STEP 1, FINALISE STEP 15
Not first. Not last. Both phases.
Draft: 8-paragraph framework, narrative, placeholders.
Finalise: insert cross-references and confirmed figures
after all other documents are generated.

---

## DOCUMENT TOOLKIT INSTALLED

Python libraries (installed):
- docxtpl (template-based Word generation)
- docx2pdf (Word to PDF conversion)
- docxcompose (merging multiple documents)
- htmldocx (HTML to Word conversion)

Claude Code skills installed:
- eigenpal/docx-template-skill (~/.claude/skills/docx-template)
- Anthropic official docx skill (/mnt/skills/public/docx/SKILL.md)

MCP servers installed:
- neat-pdf MCP (@neat-pdf/mcp) — PDF sealing and merging

Design skills installed:
- Taste skill (13 design skills) (~/.claude/skills/)
- web-design-guidelines (Vercel, 100+ rules)
- Lazyweb MCP (257K+ real app screens)

---

## PROJECT STRUCTURE (current)

```
~/E2-go/
├── CLAUDE_CONTEXT.md
├── BUILD_TRACKER.md
├── src/
│   ├── app/
│   │   ├── page.tsx              (landing — glassmorphism redesign)
│   │   ├── layout.tsx            (global design system, fonts, orbs)
│   │   ├── globals.css
│   │   ├── quiz/page.tsx         (v3.0 — 26 questions, global)
│   │   ├── results/page.tsx
│   │   ├── pricing/page.tsx      (founding member pricing)
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── apply/
│   │   │   ├── overview/page.tsx
│   │   │   ├── checklist/page.tsx
│   │   │   └── module3/
│   │   │       ├── page.tsx      (tab shell)
│   │   │       └── a/page.tsx    (Tab A — 21 questions, working)
│   │   └── api/
│   │       └── ai/route.ts
│   ├── components/
│   │   ├── Nav.tsx
│   │   ├── module3/
│   │   │   ├── TabShell.tsx      (4 states: INTRO/QUESTION/COMPLETION/RESUME)
│   │   │   └── QuestionRenderer.tsx (privacy categories, skip toggles)
│   │   ├── PWAInstallPrompt.tsx
│   │   └── ServiceWorkerRegistration.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── ai.ts
│   └── middleware.ts
├── public/
│   ├── manifest.json             (PWA)
│   ├── sw.js                     (service worker)
│   └── data/
│       ├── module0_questions.json      (v3.0 — 26 questions)
│       ├── module0_scoring_logic.json  (v3.0)
│       └── treaty_countries.json       (82 countries)
├── prompts/                      (TO BE CREATED)
│   └── v1/
│       └── documents/            (versioned generation prompts)
└── docs/
    ├── DESIGN_REFERENCE.html     (canonical UI component library)
    ├── e2go_landing_america.html (landing page prototype)
    ├── schema_complete.sql
    ├── Document_Generation_Standards.md
    ├── Document_Conditionals.md
    ├── Spec1_Analysis_Engine.md
    ├── Spec2_Followup_Conversation.md
    ├── Spec3_Generation_Prompts.md
    ├── Spec4_Quality_Gate_Pipeline.md
    ├── module3_tab_a.md
    ├── module3_tabs_b_e.md
    ├── module3_tabs_f_i.md
    ├── module3_tabs_j_l.md
    └── module3_denial_audit.md
```

---

## KNOWN ISSUES — CURRENT

| Issue | Priority | Fix |
|---|---|---|
| Quiz sub-question timing bug | HIGH | Sub-question must appear on same click as selection |
| Quiz option buttons white on dark | HIGH | Use glass styling per DESIGN_REFERENCE.html |
| [nationality] showing as literal text | HIGH | Replace dynamically from Q0-01 answer |
| Progress bar blue instead of teal | HIGH | Always use #0D9488 |
| Tabs B-L scaffold only (no real questions) | HIGH | Sessions 13A-13F planned |
| Stripe not integrated | HIGH | Session 14 |
| Document generation engine not built | HIGH | Sessions 15-16 |
| Four specs need updating (pipeline order, page limit, AI model, prompt storage) | MEDIUM | Update before building |
| 70-page limit in BUILD_TRACKER needs correction to 50-per-tab | MEDIUM | Update BUILD_TRACKER |

---

## SESSION LOG

### Sessions 1-12 (May 29 – June 1, 2026)
See BUILD_TRACKER.md for full session log.

Summary of major decisions:
- App is global (82 treaty countries), not Canada-only
- Quiz v3.0 with 26 questions complete
- Full UI redesign — glassmorphism, navy, teal, Playfair Display
- Voice matching system designed
- Analysis engine + follow-up conversation designed
- Document generation specs written (need one update pass)
- Founding member pricing locked ($297-$647)
- 14-day money-back guarantee locked (first 50 users)
- PWA installed (manifest + service worker)
- Design skills installed (Taste, Vercel guidelines, Lazyweb)
- Document tools installed (docxtpl, docx2pdf, eigenpal skill)
- DESIGN_REFERENCE.html created as canonical UI spec
- e2go branding removed from submitted documents (locked)
- Legal boundary defined and locked
