# CLAUDE_CONTEXT.md — E2go
## Master Context for Every Claude Code Session
**Version:** June 10, 2026 — Post route cleanup, all core features complete
**Read this entire file before doing anything.**
**Then read BUILD_TRACKER.md.**

---

## SESSION COMMANDS

### "start session"
When the user types "start session":
1. Read CLAUDE_CONTEXT.md fully
2. Read BUILD_TRACKER.md fully
3. Read docs/DESIGN_REFERENCE.html if any UI work is planned
4. Report:
   - What was completed last session
   - What is currently broken or incomplete
   - What the next priority task is
   - Current route count and any known errors
5. Confirm all standing build rules are loaded
6. Ask: "Ready to confirm and begin?"
Do not start any work until the user confirms.

### "end session"
When the user types "end session":
1. Update BUILD_TRACKER.md:
   - Mark completed items ✅
   - Add new bugs to Known Issues
   - Update Session Log with date, completed work, decisions
   - Update next session priorities
2. Update CLAUDE_CONTEXT.md if any rules changed
3. Run: npm run build — confirm clean
4. Report: "Session complete. Here is what was accomplished: [summary]"
5. Confirm both files saved

---

## PRODUCT OVERVIEW

**App name:** E2go (capital E, lowercase go)
**Domain:** e2go.app
**What it is:** Self-service U.S. E-2 Treaty Investor visa
  preparation platform producing complete, consulate-formatted
  application packages
**Who it serves:** Applicants from all 82 treaty countries globally.
  Primary market: Canadian applicants via Toronto consulate.
**What it replaces:** $6,500–$15,000 immigration attorney engagement
**What it produces:** Complete E-2 application package as .docx files
  (ZIP download). Applicant converts to PDF locally before submitting.
**Legal position:** Preparation and document drafting tool — NOT a
  law firm. Never use language suggesting the app replaces legal counsel.
**Core principle:** "What most people need first isn't a lawyer.
  It's clarity." People arrive confused, not ready for legal services.
  E2go bridges that gap.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI — App features | OpenRouter (MiniMax M1 via OPENROUTER_API_KEY) |
| AI — Document generation | Anthropic API direct (ANTHROPIC_API_KEY) |
| AI — Simulator evaluation | OpenRouter (MiniMax via OPENROUTER_API_KEY) |
| Voice transcription | Groq Whisper (GROQ_API_KEY) |
| Voice TTS | Groq PlayAI TTS (GROQ_API_KEY — same key) |
| Email | Resend |
| Payments | Stripe (integrated, all 7 tiers live) |
| Hosting | Vercel |
| PWA | Service worker + manifest — installable |

**CRITICAL API KEY RULE — READ EVERY SESSION:**
- OPENROUTER_API_KEY → ALL app AI features (simulator, analysis,
  follow-up, extraction engine, classification)
- ANTHROPIC_API_KEY → document generation ONLY
  (src/lib/generation-engine.ts exclusively)
- GROQ_API_KEY → voice transcription + TTS only
  (src/lib/groq-transcription.ts, src/lib/groq-tts.ts,
  src/app/api/simulator/tts/route.ts,
  src/app/api/simulator/transcribe/route.ts)

DO NOT use ANTHROPIC_API_KEY anywhere except generation-engine.ts.
DO NOT switch OpenRouter calls to Anthropic.
DO NOT expose any API key in browser/client code.

---

## PROJECT PATH

```
~/E2-go/
```

Branch: dev (never commit to main directly)
Repo: github.com/ocdeployments/e2go

---

## ROUTE MAP (47 routes as of June 10, 2026)

### Public routes
- / — Landing page (self-contained HomeClient.tsx)
- /quiz — Eligibility quiz v4.0
- /quiz/review — Edit quiz answers (jump-to-question)
- /results — Quiz results with score, flags, timeline
- /pricing — Pricing tiers
- /pricing/success — Post-payment confirmation
- /login — Auth (flag SVG left panel, no external images)
- /signup — Auth
- /forgot-password — Auth
- /verify — Email verification
- /learn — Education hub (6 SEO articles)
- /learn/[6 sub-pages] — E-2 educational articles
- /about — About page
- /support — Support
- /privacy — Privacy policy
- /terms — Terms of service

### Authenticated routes
- /dashboard — Application dashboard
- /settings — Account settings
- /score — Application confidence score
- /simulator — Interview simulator (text + voice)
- /apply — Case file overview (personalised header, 6 section cards)
- /apply/overview — Redirects to /apply (query-preserving shim)
- /apply/story — Section 01: Your story
- /apply/business — Section 02: Your business
- /apply/investment — Section 03: Your investment
- /apply/qualifications — Section 04: Your qualifications
- /apply/family — Section 05: Your family
- /apply/ties — Section 06: Your ties
- /apply/upload — Document upload (self-preparer intake)
- /apply/upload/processing — Extraction progress (SSE)
- /apply/upload/review — Discrepancy resolution
- /apply/upload/gaps — Gap report
- /apply/module1 — Onboarding + consent
- /apply/module2 — Business type advisor
- /apply/module3 — Module 3 shell (8 tabs: A B C D E I J K)
- /apply/module3/[a,b,c,d,e,i,j,k] — Individual tabs (fallback)
- /apply/module4 — Voice sample / writing style
- /apply/checklist — Document checklist
- /apply/calendar — Compliance calendar
- /generate/[applicationId] — Document generation (SSE pipeline)
- /documents/[applicationId] — Document download

### Admin
- /admin — Admin panel (never linked publicly)

---

## DESIGN SYSTEM — LOCKED (Obsidian Gold)

```
Background:    #0a0a0a
Gold accent:   #C9A84C
Text primary:  #f5f0e8
Surface:       rgba(201,168,76,0.03)
Border:        rgba(201,168,76,0.12)
Heading font:  Cormorant Garamond 300 (light + italic weight contrast)
Body font:     DM Sans 300/400/500
Border radius: 0 — NO rounded corners anywhere, ever
```

**MANDATORY before any UI work:**
Read docs/DESIGN_REFERENCE.html — it is the canonical component
library. Never skip this step.

**Violations that are never acceptable:**
- Rounded corners (border-radius > 0)
- Glassmorphism (backdrop-filter: blur)
- Box shadows
- Blue borders on selected states (use gold #C9A84C)
- Gradients on UI elements
- External image URLs (Unsplash etc) — use SVG or local images
- Emoji icons in UI

---

## PRICING — LOCKED (Updated June 9, 2026)

| Tier | Price |
|---|---|
| Solo individual | $550 |
| Solo + spouse | $697 |
| Solo + family (up to 2 kids) | $750 |
| Solo + family (3–5 kids) | $797 |
| Partnership (no families) | $997 |
| Partnership two couples | $1,297 |
| Partnership two families | $1,397 |
| Extra child surcharge | +$50 (dynamic Stripe, no fixed Price ID) |
| Interview Simulator standalone | $197 |
| Simulator additional sessions | $29.99 |
| Renewal package | $497 |

Simulator included in all packages AND available standalone.
All Stripe Price IDs live in .env.local as STRIPE_PRICE_* vars.
Current live Price IDs (June 10, 2026):
- STRIPE_PRICE_SOLO_NONE: price_1TgewyF7Ggk3LUEyIkxlp1ry
- STRIPE_PRICE_SOLO_SPOUSE: price_1TgewyF7Ggk3LUEybTTTUG95
- STRIPE_PRICE_SOLO_FAMILY_SMALL: price_1TgewzF7Ggk3LUEym0UKbRa0
- STRIPE_PRICE_SOLO_FAMILY_LARGE: price_1TgewzF7Ggk3LUEyjErIbBO8
- STRIPE_PRICE_PARTNERSHIP_NONE: price_1TgewzF7Ggk3LUEyUbjuK8R4
- STRIPE_PRICE_PARTNERSHIP_COUPLES: price_1Tgex0F7Ggk3LUEyPEleDScH
- STRIPE_PRICE_PARTNERSHIP_FAMILIES: price_1Tgex0F7Ggk3LUEyJJD6U7ot
- STRIPE_PRICE_SIMULATOR_3PACK: price_1Tgex0F7Ggk3LUEyhOhKvmKz
- STRIPE_PRICE_RENEWAL: price_1Tgex1F7Ggk3LUEykVcoLswI
- STRIPE_PRICE_CHILD_SURCHARGE: price_1Tgex1F7Ggk3LUEymMJnQQH5

---

## KEY DATA FILES — READ BEFORE TOUCHING

| File | What it is | Rule |
|---|---|---|
| public/data/module0_questions.json | Quiz questions v4.0 | Read before touching quiz |
| public/data/module0_scoring_logic.json | Scoring engine | Read before touching results |
| docs/DESIGN_REFERENCE.html | Canonical UI components | Read before any UI work |
| docs/DOCUMENT_UPLOAD_SPEC.md | Document upload spec | Read before touching upload |
| docs/INTERVIEW_SIMULATOR_SPEC.md | Simulator spec | Read before touching simulator |
| docs/INTERVIEW_SIMULATOR_SPEC.md | Simulator spec | Read before touching simulator |
| docs/sessions/ | All session files | Reference before building |
| docs/IDEAS.md | All product decisions | Reference for context |

---

## STANDING BUILD RULES (10 rules — confirm every session)

### RULE 1 — DESIGN SYSTEM COMPLIANCE
Read docs/DESIGN_REFERENCE.html before writing any component.
Zero border-radius everywhere. No glassmorphism. No blue selection
borders. No rounded corners. No external image URLs in UI.

### RULE 2 — API KEY ROUTING
OPENROUTER_API_KEY → all app AI features.
ANTHROPIC_API_KEY → generation-engine.ts ONLY.
GROQ_API_KEY → transcription and TTS ONLY.
Never expose any key in browser code.

### RULE 3 — DOCUMENT GENERATION PIPELINE
Generate ONE document at a time. Never parallel.
Checkpointed — save to DB before next document starts.
15-step pipeline in exact order (see BUILD_TRACKER.md).
Cover Letter always first (Step 1) and finalised last (Step 15).

### RULE 4 — DATABASE SAFETY
Never DROP TABLE. Always CREATE TABLE IF NOT EXISTS.
Always ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
Never modify existing column types — add new columns only.
All tables must have RLS enabled.

### RULE 5 — ANSWER AUTOSAVE
Every Module 3 / case file answer saved within 2 seconds.
Debounce: 800ms. Never let an answer be lost.

### RULE 6 — MOBILE FIRST
Every component tested at 390px before 1440px.
Minimum touch target: 44px height.
No horizontal scroll at any breakpoint.

### RULE 7 — FULL OUTPUT
Never truncate file output. Always write the complete file.
If a file is long, write it in sections — never use "..." or
"rest of file unchanged."

### RULE 8 — NO MAGIC MCP (currently unavailable)
Do not invoke Magic MCP — out of credits.
Build components manually using DESIGN_REFERENCE.html.

### RULE 9 — LIFECYCLE TRACKING
Every significant user action updates application_lifecycle table.
Key events: quiz_started, quiz_completed, payment_completed,
module completion timestamps, generation triggered/completed,
simulator sessions, interview_date, outcome.

### RULE 10 — BUILD TRACKER UPDATE
At end of every session ("end session"):
- Mark completed items ✅
- Add new bugs to Known Issues
- Update Session Log
- Update next session priorities (top 5)
- Run npm run build — must be clean

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Rule |
|---|---|
| Paywall timing | After Module 3, before document generation |
| Document format | .docx output (not PDF) — applicant converts locally |
| Document generation | Sequential, checkpointed, 15-step pipeline |
| Cover letter | Always Step 1, finalised Step 15 |
| Page limit | 50 pages per TAB (not 50 total) — Toronto consulate |
| AI model | claude-opus-4-8 for document generation (from app_settings) |
| Voice profile | Raw writing sample text passed directly — no JSON extraction |
| AI detection threshold | 0.35 — below this = pass |
| Prompt storage | /prompts/v1/documents/ |
| Partnership routing | Two separate independent packages |
| Module 3 old tabs | Kept as fallback — never delete a-e, i, j, k |
| Module 3 new sections | Six case file sections at /apply/* are primary |
| Quiz questions | module0_questions.json is source of truth — do not hardcode |

---

## MODULE 3 — CASE FILE STRUCTURE

The Document Interview was redesigned from 12 tabs (A–L) into
6 document-building sections. Old tabs A, B, C, D, E, I, J, K
remain as fallback. Old tabs F, G, H, L were deleted June 10
(superseded by new case file sections).

**New six-section structure:**
- /apply/story — Section 01: Cover letter + Biography
- /apply/business — Section 02: Business plan + Visa letter
- /apply/investment — Section 03: Source of funds + Investment proof
- /apply/qualifications — Section 04: Biography + Org chart
- /apply/family — Section 05: Dependents + DS-160 family
- /apply/ties — Section 06: Non-immigrant intent + Interview prep

**Module 3 shell (/apply/module3):**
Now has 8 tabs: A B C D E I J K (router.push dynamic).
F, G, H, L removed from TABS array June 10.

---

## DOCUMENT UPLOAD — SELF-PREPARER INTAKE

Self-preparers can upload existing documents at the start of the
case file. The platform extracts structured answers, detects
discrepancies (hard gate — must resolve before proceeding),
and shows a gap report.

**Three self-preparer profiles:**
- Independent preparer (drafting documents, no lawyer yet)
- Pre-lawyer preparer (near-complete, about to engage attorney)
- Lawyer dropout (has partial professional docs, stopped)

**Pricing:** Same as from-scratch applicants — no new tier.

**Flow:** /apply/upload → /apply/upload/processing →
  /apply/upload/review (if discrepancies) → /apply/upload/gaps → /apply

**Pre-fill badge variants:**
- "From your eligibility check" — gold (from quiz)
- "From your documents" — amber (high confidence upload)
- "From your documents — please verify" — amber-orange (medium)
- Low confidence → no pre-fill, hint text shown below field

---

## INTERVIEW SIMULATOR

Route: /simulator
Two modes: text and voice.
Voice: Groq Whisper transcription + Fritz-PlayAI TTS officer voice.
Session limit: 2 included, $29.99 additional sessions.
Timer: 15 minutes per session, warning at 2 minutes.
Evaluation: OpenRouter MiniMax rates answers strong/weak/inconsistent.
Debrief: readiness indicator + strong answers + needs-work + inconsistencies.

---

## MIDDLEWARE AUTH PROTECTION

Protected routes (require Supabase session):
/dashboard, /apply/, /admin, /simulator, /score,
/settings, /generate/, /documents/

Rate limits (production only):
- /login: 5 per 15 min per IP
- /api/quiz/submit, /api/email/results: 3 per hour per IP
- /api/generate/*, /api/analysis/*: 50 per day per user

---

## KNOWN ISSUES (June 10, 2026)

| Issue | Priority | Status |
|---|---|---|
| Migration 004 not applied | MEDIUM | Run: npx supabase db push (answers source constraint) |
| Two warnings in generate/page.tsx and quiz/page.tsx | LOW | Fix in next session touching those files |
| Stripe API version outdated (2024-06-20) | LOW | Upgrade apiVersion in scripts/stripe-setup.ts |
| Quiz nationality selector Playwright difficulty | LOW | Works in browser |
| Fast Refresh occasional hot reload errors | LOW | Non-blocking |

---

## REFERRAL PARTNERS — STATUS

| Partner | Programme | Status |
|---|---|---|
| Mercury | Bank account opening — remote | Apply now (self-serve) |
| Wise | CAD→USD transfer affiliate | Apply now (self-serve) |
| Relay | Bank account opening — backup | Apply now (self-serve) |
| East West Bank | Cross-border banking | Apply at 10 users |
| Knightsbridge FX | Currency transfer | Apply at launch |
| OFX | Currency transfer | Apply at launch |
| RBC / TD cross-border | Banking referral | Apply at 50 users |
| Immigration attorneys | Warm leads (no fee) | Email now |
| Franchise brokers | FranNet, IFPG, FranChoice | Email now |
| Cross-border CPAs | MNP, BDO | Formalise at 20 users |

---

## SESSION LOG (summary — see BUILD_TRACKER.md for full log)

**June 9–10, 2026 — Full build session — ALL BLOCKERS RESOLVED:**
- Quiz v4.0: family split, spousal partnership, principal applicant,
  legal accuracy fixes (9 FAM), review page, month timeline
- Interview simulator: complete — Groq TTS, transcription, timer,
  $29.99 purchase, design fixes
- Module 3 case file redesign: 6 sections, all components, pre-fill
- Document upload: Session A (extraction) + Session B (UI) complete
- Auth image slider: Unsplash URLs removed, flag SVG
- Route cleanup: 53 → 47 routes, dead pages removed, middleware hardened
- Pricing updated: $550–$1,397 (old founding member pricing retired)
- E2go rebrand: capital E, lowercase go throughout
- Stripe Price IDs recreated at new amounts — all 10 tiers live
- Supabase pricing table updated — all Price IDs correct
- Login page flag gradient fixed — left panel now visible
- Docs cleanup — 54 files deleted, 23,853 lines removed
- Route cleanup — 53 → 47 routes, dead pages removed

**Next session priorities:**
1. End-to-end payment test — all blockers resolved, walk full flow
   quiz → results → pricing → checkout (4242 4242 4242 4242) → dashboard → /apply
2. Apply migration 004 (npx supabase db push) — answers source constraint
3. Verify /apply/upload flow with a real document upload
4. Fix two warnings in generate/page.tsx and quiz/page.tsx
5. Docs cleanup commit — route cleanup source files still unstaged

