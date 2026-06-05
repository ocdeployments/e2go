# CLAUDE_CONTEXT.md — e2go.app
## Master Context for Every Claude Code Session
**Version:** June 2026 — Current
**Read this entire file before doing anything.**
**Then read BUILD_TRACKER.md.**
**Then read docs/IDEAS.md.**

---

## SESSION COMMANDS

### "start session"
When the user types "start session":
1. Read this entire CLAUDE_CONTEXT.md file
2. Read BUILD_TRACKER.md completely
3. Read docs/IDEAS.md completely
4. If any UI work is planned: read docs/DESIGN_REFERENCE.html
5. Report:
   - What was completed last session
   - What is currently broken or incomplete
   - What the next priority task is
   - Current app status (routes, build state, known errors)
6. Confirm all standing build rules are loaded
7. Confirm MCP servers are active (Magic, Playwright, Firecrawl, Lazyweb)
8. Ask: "Ready to confirm and begin?" — do not start work until confirmed

### "end session"
When the user types "end session":
1. Update BUILD_TRACKER.md:
   - Mark all completed items ✅
   - Add new bugs to Known Issues
   - Add new features to New Features section
   - Update Session Log with date, number, completed work, decisions
   - Update next session priorities (top 5 in order)
2. Update CLAUDE_CONTEXT.md if any standing rules changed
3. Run npm run build — confirm clean
4. Report: "Session complete. Here is what was accomplished: [summary]"

---

## CRITICAL — API KEY ROUTING (READ BEFORE ANY AI WORK)

Two API keys are present in .env.local:
- OPENROUTER_API_KEY — use this for ALL app AI features
- ANTHROPIC_API_KEY — use this ONLY for document generation

Do NOT switch any existing OpenRouter calls to the Anthropic API.
Do NOT use ANTHROPIC_API_KEY anywhere except:
  - src/lib/generation-engine.ts (document generation calls)
  - The humanization pass in the same file

If asked "should I use the Anthropic API key?" — the answer is:
Only for document generation. Everything else stays on OpenRouter.

---

## PRODUCT OVERVIEW

**App name:** e2go.app (never "E2Pathway" — that name is retired)
**What it is:** Self-service U.S. E-2 Treaty Investor visa preparation platform
**Who it serves:** Global applicants from 82 treaty countries
**Primary market:** Canadian citizens applying via the Toronto consulate
**What it replaces:** $6,500–$15,000 immigration consultant engagement
**What it produces:** A complete, consulate-formatted E-2 application package
**Legal position:** Preparation and document drafting tool — NOT a law firm
**Critical rule:** Never use language suggesting the app replaces legal counsel
**Documents belong to the applicant.** All legal disclaimers appear inside
the app before download — never on the documents themselves.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + Auth) |
| AI — App features | MiniMax M1 via OpenRouter (server-side only) |
| AI — Documents | Anthropic Claude API direct (document generation ONLY) |
| Email | Resend |
| Payments | Stripe (last step — not yet integrated) |
| Hosting | Vercel |
| Dev URL | https://e2go-git-dev-ocdeployments-projects.vercel.app |

**MiniMax model string:** minimax/MiniMax-Text-01
**Anthropic model string:** claude-sonnet-4-20250514
**OpenRouter base URL:** https://openrouter.ai/api/v1

---

## MCP SERVERS — ACTIVE GLOBALLY

These are installed user-scoped and available in every session.
You MUST use them. Do not skip them.

| MCP | Use for |
|---|---|
| Magic (21st.dev) | ALL React UI components — primary UI generation tool |
| Playwright | Browser control, localhost screenshots, E2E testing |
| Firecrawl | Website design cloning, scraping reference sites |
| Lazyweb | Design research — 257K+ real app screens |
| Context7 | Library documentation lookup |
| Sequential Thinking | Complex multi-step reasoning |
| Memory | Persistent context across steps |
| Brave Search | Web research |
| GitHub | Repo operations |
| Figma | Design file access |

**Magic MCP is mandatory for all React components.**
It will not self-invoke — you must explicitly call it.
Instruction pattern: "Use the Magic MCP tool to generate [component].
Describe each section to Magic and use the generated output as the base."

---

## SKILLS INSTALLED GLOBALLY

| Skill | Use for |
|---|---|
| ui-ux-pro-max | All UI work — 161 rules, 96 palettes |
| full-output-enforcement | Never truncate — complete files only |
| e2go-frontend | e2go-specific design patterns |
| high-end-visual-design | Premium visual output |
| design-taste-frontend-v1 | Design quality enforcement |
| image-to-code | Convert design references to code |
| brandkit | Brand consistency |
| redesign-existing-projects | Reskin tasks |
| minimalist-ui | Minimal layout patterns |
| web-design-guidelines | Vercel 100+ rules |
| stitch-design-taste | Stitch pattern library |
| docx-template | Word document generation |
| imagegen-frontend-web | Web image generation |
| imagegen-frontend-mobile | Mobile image generation |

---

## MANDATORY UI BUILD SEQUENCE

For every UI task, follow this sequence in order. Never skip steps:

1. Use Lazyweb MCP to research the pattern
2. Use Firecrawl to clone a reference site (Deel / Stripe Atlas / TurboTax)
3. Use Magic MCP to generate complex React components
4. Apply ui-ux-pro-max + full-output-enforcement skills
5. Use Playwright to screenshot localhost:3000 and confirm visually

---

## DESIGN SYSTEM — OBSIDIAN GOLD (LOCKED)

Read docs/DESIGN_REFERENCE.html before any UI work.
This is the canonical spec. No exceptions.

| Token | Value |
|---|---|
| Background | #0a0a0a (obsidian near-black) |
| Primary accent | #C9A84C (aged gold) |
| Text primary | #f5f0e8 (warm white) |
| Surface card | rgba(201,168,76,0.02) + border rgba(201,168,76,0.12) |
| Heading font | Cormorant Garamond Light (300) + italic contrast |
| Body font | DM Sans 300/400/500 |
| Border radius | 0 — no rounded corners anywhere |
| Aesthetic | Luxury legal · private wealth · authority |

**Hard rules — never break these:**
- NO glassmorphism — ever
- NO rounded corners — ever
- Option buttons: gold border or gold fill — NEVER white
- Progress bars: gold (#C9A84C) — NEVER blue
- Grain texture overlay on hero sections
- Gold line art details and corner brackets

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Rule |
|---|---|
| Paywall timing | After Module 3 personal tabs complete, before generation |
| Document generation | Sequential — ONE at a time. Checkpointed. Never parallel. |
| Cover letter order | Generated FIRST (Step 1) — officer's roadmap |
| AI for documents | Anthropic API direct — claude-sonnet-4-20250514 |
| AI for app features | MiniMax via OpenRouter — server-side only |
| Supabase auth | auth.users → public.profiles (never public.users) |
| Data storage | Answers only — never store passports, bank statements |
| Document ownership | Each fact lives in exactly ONE document. No repetition. |
| e2go branding on docs | NEVER on submitted documents |
| Page limit | 50 pages per TAB (Toronto). Not 50 total. |
| Prompt storage | /prompts/v1/documents/ as .md files — never hardcoded |
| Writing style | Raw text only — no JSON extraction |
| Partnership routing | Two complete separate packages generated |
| Form terminology | Exact DS-160/U.S. government terminology always |
| Interview limits | 2 simulator sessions included. Extra: $9.99/3-bundle |
| Stats | Real government data only. Never fabricated. |
| Global scope | 82 treaty countries. No Canada-only assumptions. |
| Stripe | Last step before launch — do not integrate until all else done |
| Branch | Always dev — never commit to main directly |
| Ask once | Every answer stored once, used everywhere. Never re-ask. Pre-fill from quiz into Module 3. See Rule 13. |
| Checklist pre-fill | /apply/checklist pre-fills from quiz session on first load. No static lists. See IDEAS.md 12A. |
| Pricing pre-selection | Pricing page pre-selects correct tier from quiz answers. User can change. See IDEAS.md 12B. |
| Single timeline source | Dashboard, compliance calendar, journey wizard all read one DB record. See IDEAS.md 12C. |
| Analysis + confidence | Confidence score reads analysis engine output. One assessment, two views. See IDEAS.md 12D. |
| Checklist overlap | Tab B + Tab L shared documents flagged once with explanation. See IDEAS.md 12E. |
| Renewal baseline | Original data is comparison baseline only. All renewal data collected fresh. See IDEAS.md 12F. |
| Simulator context | Simulator reads the filed package. Probes weak points. Never re-collects data. See IDEAS.md 12G. |
| Calendar anchor | Working target date ≠ confirmed interview date. No specific deadlines until interview confirmed. See IDEAS.md 12H. |
| Results vs. score | Results page: eligibility signals only. Confidence score: strength only. Never mix. See IDEAS.md 12I. |

---

## COPY RULES — LOCKED

These apply to all UI copy, marketing text, and document content:

| Rule | Detail |
|---|---|
| Lawyer language | Never "attorney" or "lawyer" in marketing copy or comparisons |
|                 | Use "immigration consultant" or "traditional route" |
| Writing style term | Never "voice" or "voice profile" in user-facing copy |
|                    | Always "writing style" or "personal writing profile" |
| Legal positioning | Never "don't hire a lawyer" or "you don't need a lawyer" |
|                   | Always "what you do with your finished package is up to you" |
| Approved tagline | "Lawyer-ready documents. Lawyer-optional price." |

---

## DOCUMENT GENERATION PIPELINE — LOCKED

```
Step 1  → Cover Letter (Tab D)        → save to DB → continue
Step 2  → Source of Funds (Tab H)     → save to DB → continue
Step 3  → Investment Proof (Tab F)    → save to DB → continue
Step 4  → Business Plan (Tab K)       → save to DB → continue
Step 5  → Qualifications (Tab J)      → save to DB → continue
Step 6  → DS-160 Reference (Tab A)    → save to DB → continue
Step 7  → Gap analysis (all docs)
Step 8  → Repetition checker
Step 9  → Consistency checker
Step 10 → AI detection audit
Step 11 → Humanization pass
Step 12 → Metadata sanitization
Step 13 → Quality gate
Step 14 → Pre-download acknowledgment (5 checkboxes)
Step 15 → Preview unlocked
```

---

## STANDING BUILD RULES

### RULE 1 — DESIGN SYSTEM
Always read docs/DESIGN_REFERENCE.html before any CSS or UI work.
Obsidian Gold only. No glassmorphism. No rounded corners.

### RULE 2 — COMPLETE OUTPUT
Never truncate files. Never write placeholder comments.
No "// TODO", no "...rest of component", no "// existing code here".
full-output-enforcement skill must be active for all file writes.

### RULE 3 — ONE COMMIT PER LOGICAL UNIT
Never one giant commit at end of session.
Commit after each file or logical group is complete.

### RULE 4 — NEVER DESTRUCTIVE DATABASE OPERATIONS
Never DROP TABLE. Never DROP COLUMN. Never ALTER existing column types.
Add only — never remove. Use IF NOT EXISTS on all migrations.

### RULE 5 — API KEY ROUTING
OPENROUTER_API_KEY → all app AI (server-side only, never browser)
ANTHROPIC_API_KEY → generation-engine.ts only
Never expose either key in client-side code.

### RULE 6 — SUPABASE AUTH
auth.users → public.profiles
Never create a public.users table.
Every API route verifies auth before processing.
Every DB query scoped by user_id (RLS).

### RULE 7 — DATA FILES LOCKED
public/data/module0_questions.json — LOCKED v2.1 — do not modify
public/data/module0_scoring_logic.json — LOCKED v1.1 — do not modify

### RULE 8 — NO e2go BRANDING ON SUBMITTED DOCUMENTS
Generated documents contain no e2go logos, watermarks, or references.
Disclaimer appears inside the app before download — not in the document.

### RULE 9 — PLAYWRIGHT VERIFICATION
Every UI build task ends with a Playwright screenshot of localhost:3000.
Confirm output visually before marking task complete.

### RULE 10 — BUILD TRACKER UPDATE
Run "end session" at end of every session.
Update BUILD_TRACKER.md — completions, bugs, decisions, next priorities.
Run npm run build — must be clean before session ends.

### RULE 11 — BRANCH DISCIPLINE
Always on dev branch.
Never commit to main.
One commit per logical unit.

### RULE 12 — COPY RULES
Never use "attorney" or "lawyer" in UI copy or marketing comparisons.
Use "immigration consultant" or "traditional route."
Never use "voice" or "voice profile" in user-facing copy.
Use "writing style" or "personal writing profile."

### RULE 13 — ASK ONCE, USE EVERYWHERE
Never ask the user for information that has already been collected
anywhere in the app. Every answer is stored in the answers table
and available to every module, tab, and document prompt.

Before adding any question to any tab:
1. Check — is this data point already in the answers table?
2. If yes: pre-fill it. Do not ask again.
3. If a more precise version is needed: show the existing value
   and ask only for the refinement.
4. If genuinely new: add it once to the right tab only.

Mandatory pre-fills from Module 0 into Module 3:
- Q0-01 nationality → Tab A QA-05, QA-06; all document generation
- Q0-05 investment amount → Tab F QF-02 (pre-fill, allow update)
- Q0-07 loan flag → Tab F QF-05 (pre-select if flagged)
- Q0-11 prior refusals → Tab A QA-23 (pre-fill, expand if yes)
- Q0-16 family → Tab L (show only questions relevant to family)
- Account email → Tab A QA-08 (always pre-filled from auth)

See docs/IDEAS.md Section 11 for the complete rule and audit.

---

## ENVIRONMENT VARIABLES

File: ~/E2-go/.env.local (never commit)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=          ← MiniMax, all app features
ANTHROPIC_API_KEY=           ← document generation ONLY
MINIMAX_MODEL=minimax/MiniMax-Text-01
RESEND_API_KEY=
PLAYWRIGHT_BYPASS_AUTH=true  ← dev only, never set on Vercel
```

---

## PROJECT PATH

~/E2-go/
Branch: dev
Repo: github.com/ocdeployments/e2go
Dev URL: https://e2go-git-dev-ocdeployments-projects.vercel.app

---

## KEY SPEC AND REFERENCE FILES

Read before building the relevant feature:

| File | Read before |
|---|---|
| docs/DESIGN_REFERENCE.html | Any UI work |
| docs/IDEAS.md | Any planning or new feature work |
| docs/Spec1_Analysis_Engine.md | Analysis engine work |
| docs/Spec2_Followup_Conversation.md | Follow-up conversation |
| docs/Spec3_Generation_Prompts.md | Document generation |
| docs/Spec4_Quality_Gate_Pipeline.md | Quality gate / pipeline |
| docs/E2_Engine_Knowledge_Base_June3_2026.md | Generation context |
| docs/animated-gradient-border.md | Animated border component |
| docs/image-slider-login.md | Auth page image slider |
| docs/faq-monochrome.md | FAQ section component |
| docs/ai-generation-reveal.md | Document generation reveal |
| public/data/module0_questions.json | Quiz work (LOCKED) |
| public/data/module0_scoring_logic.json | Scoring work (LOCKED) |
