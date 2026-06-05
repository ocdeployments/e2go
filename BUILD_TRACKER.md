# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 6, 2026 — End of Session S23 (Tier 6 Polish: Auth Image Slider)
**App Name:** e2go.app
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Claude API
**Dev URL:** https://e2go-git-dev-ocdeployments-projects.vercel.app
**Repo:** github.com/ocdeployments/e2go
**Branch:** dev (never commit to main directly)
**Project Path:** ~/E2-go

---

## SESSION COMMANDS

**To start:** type `start session`
**To end:** type `end session`

On start: read CLAUDE_CONTEXT.md + BUILD_TRACKER.md +
docs/DESIGN_REFERENCE.html (if UI work). BEFORE ANYTHING ELSE — READ THIS:

Two API keys are present in .env.local:
- OPENROUTER_API_KEY — use this for ALL app AI features
- ANTHROPIC_API_KEY — use this ONLY for document generation

Do NOT switch any existing OpenRouter calls to the Anthropic API.
Do NOT use ANTHROPIC_API_KEY anywhere except:
  - src/lib/generation-engine.ts (document generation calls)
  - The humanization pass in the same file

If Claude Code asks "should I use the Anthropic API key?" — the answer is:
Only for document generation. Everything else stays on OpenRouter.

Confirm you understand this before proceeding.Report status.
Ask "Ready to confirm and begin?" before any work.

On end: update this file, update CLAUDE_CONTEXT.md if rules
changed, run npm run build:clean, report summary.

---

## OVERALL PROGRESS

| Phase | Status | Notes |
|---|---|---|
| Next.js scaffold | ✅ COMPLETE | |
| Database schema + RLS | ✅ COMPLETE | 45/45 tests passing |
| Auth (login/signup) | ✅ COMPLETE | Supabase auth wired |
| Quiz v3.0 | ✅ COMPLETE | 26 questions, global, treaty countries |
| Full UI redesign | ✅ COMPLETE | Glassmorphism, navy, teal, Playfair |
| PWA | ✅ COMPLETE | Manifest, service worker, install prompt |
| Design skills installed | ✅ COMPLETE | Taste, Vercel guidelines, Lazyweb MCP |
| Document tools installed | ✅ COMPLETE | docxtpl, docx2pdf, eigenpal skill, neat-pdf |
| Module 3 Tab A | ✅ COMPLETE | 21 questions, privacy categories, working |
| Module 3 Tabs B-L | ✅ COMPLETE | All 12 tabs wired |
| /apply/overview | ✅ COMPLETE | |
| /apply/checklist | ✅ COMPLETE | Three phases, Supabase connected |
| Pricing page | ✅ COMPLETE | Founding member pricing, guarantee |
| Dashboard | ✅ COMPLETE | Needs real data wiring |
| Landing page redesign | ✅ COMPLETE | Obsidian Gold rebuild, all sections, mobile verified |
| Quiz UX fixes | ✅ COMPLETE | styling, nationality dynamic, progress bar |
| Document generation specs | ✅ COMPLETE | 4 spec files — need one update pass |
| Cleanup complete | ✅ COMPLETE | Legacy tokens/vars removed from all files |
| Stripe integration | ⬜ NOT STARTED | Session 14 |
| Email verification funnel | ✅ COMPLETE | Session 15A/B |
| Document generation engine | ✅ COMPLETE | Session 16 — prompts, engine, API routes, progress UI, review page |
| Voice matching system | ⬜ NOT STARTED | Designed, not built |
| Analysis engine | ✅ COMPLETE | Session 15A — types, lib, api, tests |
| Follow-up conversation | ⬜ NOT STARTED | Designed, not built |
| Module 3 Pre-Fill Pass | ✅ COMPLETE | Session S5 — quiz data auto-populates Tabs A, F, L with edit affordances and legal gates |

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Rule |
|---|---|
| Paywall timing | After Module 3 personal tabs complete, before generation |
| Document generation | Sequential — ONE at a time. Checkpointed. Never parallel. |
| Cover letter order | Generated FIRST (Step 1) — officer's roadmap |
| AI for documents | Anthropic Claude API direct (claude-sonnet-4-20250514) |
| AI for app features | MiniMax via OpenRouter — server-side only |
| Supabase auth | auth.users → public.profiles (never public.users) |
| Data storage | Answers only. Never store passports, bank statements |
| Document ownership | Each fact lives in exactly ONE document. No repetition. |
| e2go branding on docs | NEVER on submitted documents |
| Page limit | 50 pages per TAB (Toronto). Not 50 total. |
| Prompt storage | Versioned .md files in /prompts/v1/documents/ |
| Partnership routing | Two complete separate packages generated |
| Form terminology | Exact DS-160/U.S. government terminology always |
| Interview limits | 2 simulator sessions included. Extra: $9.99/3-bundle |
| Stats | Real government data only. Never fabricated. |
| Global scope | 82 treaty countries. No Canada-only assumptions. |

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

Founding member pricing: first 500 applications.
Counter live on pricing page (pulled from Supabase).
14-day money-back guarantee: first 50 founding members.
Refund = full payment minus Stripe processing fees.
Conditions: within 14 days, Module 1 started, no documents generated.

---

## PAGES — BUILD STATUS

| Page | Route | Status | Notes |
|---|---|---|---|
| Landing | / | ⚠️ IN PROGRESS | American elements (Statue/stars) fix needed |
| Quiz | /quiz | ⚠️ IN PROGRESS | Sub-question timing bug, option styling |
| Results | /results | ✅ COMPLETE | All 4 outcomes, redesigned |
| Pricing | /pricing | ✅ COMPLETE | Founding member, guarantee |
| Dashboard | /dashboard | ✅ COMPLETE | Needs real data |
| Login | /login | ✅ COMPLETE | |
| Signup | /signup | ✅ COMPLETE | |
| Overview | /apply/overview | ✅ COMPLETE | |
| Checklist | /apply/checklist | ✅ COMPLETE | 3 phases |
| Module 3 shell | /apply/module3 | ✅ COMPLETE | |
| Module 3 Tab A | /apply/module3/a | ✅ COMPLETE | Working, RLS fixed |
| Module 3 Tabs B-L | /apply/module3/[b-l] | ✅ COMPLETE | All 12 tabs wired (Sessions 13A–13G) |
| Confidence Score | /score | ✅ COMPLETE | S11 |
| Interview Simulator | /simulator | ⬜ NOT STARTED | |
| Document Generation | /generating | ⬜ NOT STARTED | |
| Export | /export | ⬜ NOT STARTED | |
| Support | /support | ⬜ NOT STARTED | |
| Admin | /admin | ⬜ NOT STARTED | |
| Education Hub | /learn | ⬜ NOT STARTED | |
| Blog | /blog | ⬜ NOT STARTED | |
| Partner Portals | /partner/* | ⬜ NOT STARTED | Phase 2 |

---

## MODULE 0 — QUIZ v3.0

| Feature | Status | Notes |
|---|---|---|
| 26 questions | ✅ COMPLETE | Up from 22 |
| Global treaty country selector | ✅ COMPLETE | 82 countries |
| searchable_select for Q0-01 | ✅ COMPLETE | |
| Multi-currency Q0-05 | ✅ COMPLETE | 10 currencies |
| Stage-aware routing | ✅ COMPLETE | A through D |
| Sub-question for Q0-10 | ✅ COMPLETE | Appears immediately on selection |
| Sub-question for Q0-16 | ✅ COMPLETE | |
| Conversational language rewrite | ✅ COMPLETE | Canada-specific language removed |
| Cannabis informational gate | ✅ COMPLETE | Replaces hard stop |
| [nationality] dynamic replacement | ✅ COMPLETE | Working in quiz component |
| Scoring logic v3.0 | ✅ COMPLETE | All 6 audit fixes applied |
| Hard stops PR-01 through PR-08 | ✅ COMPLETE | |
| PR-THIRD-COUNTRY hard stop | ✅ COMPLETE | Sept 6 2025 policy |
| W-TIMELINE-URGENT risk only | ✅ COMPLETE | Removed from attorney flags |
| W-NI-01 neutral answers fixed | ✅ COMPLETE | |
| W-NI-02 no-family neutral | ✅ COMPLETE | |
| Mixed family option Q0-NI-02 | ✅ COMPLETE | |
| Treaty countries JSON | ✅ COMPLETE | 82 countries with consulate data |
| Results page personalised output | ✅ COMPLETE | Nationality, consulate, state |
| Quiz version tag | ✅ COMPLETE | quiz_version = "3.0" |
| Progress bar teal | ⚠️ BUG | Showing blue |
| Option buttons glass style | ⚠️ BUG | Showing white cards |
| quiz_session save to Supabase | ✅ COMPLETE | |
| No autosave during quiz | ✅ COMPLETE | Local state only until Q0-21 |

---

## MODULE 3 — TABS

### Tab A (Working + Pre-Fill)
| Feature | Status |
|---|---|
| 21 questions | ✅ COMPLETE |
| Privacy categories (required/red/amber/green) | ✅ COMPLETE |
| Skip toggles with advisories | ✅ COMPLETE |
| 800ms debounce autosave | ✅ COMPLETE |
| Saving... / Saved ✓ indicator | ✅ COMPLETE |
| Supabase answers save | ✅ COMPLETE |
| FK constraint fix | ✅ COMPLETE |
| RLS policies fixed | ✅ COMPLETE |
| Quiz pre-fill + legal confirmation gates | ✅ COMPLETE (Session S5) |

### Tabs B-L (Specs Updated, Not Yet Wired)
All 11 tab specs updated in docs/ with:
- Global language fixes (no Canada-only)
- Batch tags (Batch 1 or Batch 2)
- Privacy categories per question
- Lead temperature signals
- Denial prevention flags
- 18 new questions added across tabs

| Tab | Spec Status | Wired Status |
|---|---|---|
| B — Personal Checklist | ✅ Spec updated | ✅ Wired (Session 13A) |
| C — Visa Category | ✅ Spec updated | ✅ Wired (Session 13A) |
| D — Cover Letter | ✅ Spec updated | ✅ Wired (Session 13B) |
| E — Ownership | ✅ Spec updated | ✅ Wired (Session 13G) |
| F — Investment Proof | ✅ Spec updated | ✅ Batch 1 Wired (Session 13C) · Batch 2 pending · Pre-fill wired (Session S5) |
| G — Business Evidence | ✅ Spec updated | ✅ Wired (Session 13G) |
| H — Source of Funds | ✅ Spec updated | ✅ Wired (Session 13G) |
| I — Non-Marginality | ✅ Spec updated | ✅ Wired (Session 13G) |
| J — Qualifications | ✅ Spec updated | ✅ Wired (Session 13B) |
| K — Business Plan | ✅ Spec updated | ✅ Wired (Session 13G) |
| L — Family Dependents | ✅ Spec updated | ✅ Wired (Session 13G) · Pre-fill wired (Session S5) |

### Batch Assignments
- Batch 1 (personal — immediate after payment): B, partial F, J, L
- Batch 2 (business — after formation): A, C, D, E, F business, G, H, I, K
- Paywall triggers after Batch 1 personal tabs complete

---

## MODULE 6 — DOCUMENT GENERATION

### Generation Order (LOCKED)
```
Step 1  → Cover Letter (Tab D)       — FIRST, always
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
Step 14 → Pre-download acknowledgment (5 checkboxes)
Step 15 → Preview unlocked
```

### Page Budget (Toronto — 50 pages per tab)
Generated narrative documents target:
- Cover letter: 4 pages max
- Declaration: 1 page
- Qualifications: 2 pages
- Net worth: 1 page
- Source of funds: 2 pages
- Fund flow chronology: 1 page
- Substantiality memo: 2 pages
- Marginality rebuttal: 1 page
- Business plan: 8 pages max
Total generated: ~22 pages

User-uploaded evidence shares per-tab budget.
Guidance on which specific pages of evidence to include
is built into the checklist and binder assembly guide.

### Feature Build Status
| Feature | Status |
|---|---|
| Analysis engine | ✅ Built (Session 15A) — schema, types, lib, api route, Sarah Mitchell test |
| Voice sample collection | ⬜ Spec written — not built |
| AI detection on voice sample | ⬜ Spec written — not built |
| Voice profile extraction | ⬜ Spec written — not built |
| Follow-up conversation | ⬜ Spec written — not built |
| Generation prompts (/prompts/v1/) | ✅ COMPLETE (Session 16) |
| Sequential generation engine | ✅ COMPLETE (Session 16) |
| Checkpoint DB table | ✅ COMPLETE (Session 16) |
| Server-Sent Events progress | ✅ COMPLETE (Session 16) |
| Narrative progress screen | ✅ COMPLETE (Session 16) |
| Repetition checker | ✅ COMPLETE (Session 16 — in pipeline) |
| Consistency checker | ✅ COMPLETE (Session 16) |
| AI detection audit | ✅ COMPLETE (Session 16 — in pipeline) |
| Humanization pass | ✅ COMPLETE (Session 16) |
| Metadata sanitization | ✅ COMPLETE (Session 16) |
| Quality gate | ✅ COMPLETE (Session 16) |
| Pre-download acknowledgment gate | ✅ COMPLETE (Session 16) |
| Word document template | ⬜ Not built |
| docxtpl integration | ⬜ Not built |
| neat-pdf integration | ⬜ Not built |
| PDF export | ⬜ Not built |
| 50-page per tab enforcement | ⬜ Not built |
| Partnership dual-package generation | ⬜ Not built |
| Sarah Mitchell prototype docs | ⚠️ MD only — .docx not generated |

---

## SPEC FILES — STATUS

| File | Status | Known Issues |
|---|---|---|
| docs/Spec1_Analysis_Engine.md | ✅ Written | Page limit fix needed |
| docs/Spec2_Followup_Conversation.md | ✅ Written | References existing probe cascade |
| docs/Spec3_Generation_Prompts.md | ✅ Written | Cover letter order fix needed, API model fix needed, prompt file storage fix needed |
| docs/Spec4_Quality_Gate_Pipeline.md | ✅ Written | Page limit fix needed |

Required updates to specs before building:
1. Cover letter is Step 1 (not last) — ✅ COMPLETE
2. Page limit is 50 per tab (not 50 total) — ✅ COMPLETE
3. AI model is Anthropic API (not raw Claude call) — ✅ COMPLETE
4. Prompts stored in /prompts/v1/documents/ as .md files — ✅ COMPLETE
5. Partnership routing (dual packages) — ✅ COMPLETE

---

## DESIGN SYSTEM — LOCKED

Read docs/DESIGN_REFERENCE.html before any UI work.

| Token | Value |
|---|---|
| Background | #0a0a0a (obsidian) |
| Primary accent | #C9A84C (aged gold) |
| Text primary | #f5f0e8 |
| Surface card | rgba(201,168,76,0.02) + border rgba(201,168,76,0.12) |
| Heading font | Cormorant Garamond Light (300) |
| Body font | DM Sans 300/400/500 |
| Border radius | 0 — no rounded corners anywhere |

Rules:
- Option buttons: NEVER white. Gold border or gold fill.
- Progress bars: Gold (#C9A84C). Never blue.
- Question text: Cormorant Garamond, foreground, fully opaque
- No glassmorphism, no teal (#0D9488), no navy (#060d1f)
- No e2go branding on submitted documents

Design skills installed:
- /taste — activate before any UI session
- web-design-guidelines — run "review my UI" after building
- Lazyweb MCP — 257K+ real app screens

---

## DATABASE — CURRENT SCHEMA

Tables created and confirmed:
- profiles (user profiles, founding_member, guarantee_eligible)
- applications (with lead temperature columns)
- answers (with skipped_by_user, privacy_category)
- quiz_sessions
- application_lifecycle
- document_generation_log (schema written, not yet run)
- generation_pipeline_log (schema written, not yet run)
- applicant_voice_profile (schema written, not yet run)
- followup_responses (schema written, not yet run)

## SPEC CORRECTIONS — June 3, 2026
All 6 spec corrections applied and committed:
1. Cover letter = Step 1 always (Spec3, Spec4)
2. Page limit = 50 per TAB not total (Spec1, Spec4)
3. AI model = Anthropic API direct (Spec3)
4. Prompt storage = /prompts/v1/documents/ (Spec3)
5. Partnership routing = two separate packages (all specs)
6. Voice profile = raw text only, no JSON (Spec2)
Status: COMPLETE

---

## COMPONENT BACKLOG — UI POLISH (Magic MCP — 21st.dev)

These components have been sourced and assessed. Code is saved in
docs/components/. Integrate in the sessions listed below.

| Component | Source File | Where in App | Session |
|---|---|---|---|
| Animated Gradient Border | docs/components/animated-gradient-border.md | Pricing Most Popular card, Landing CTA button, Module 3 active sidebar | Polish session after Session 16 |
| Image Slider Login | docs/components/image-slider-login.md | /verify page, /login, /signup | Already applied (Session 15B) — revisit for polish |
| FAQ Monochrome | docs/components/faq-monochrome.md | Landing page FAQ section (new section needed) | Polish session after Session 16 |
| AI Generation Reveal | docs/components/ai-generation-reveal.md | Document generation screen — blur-lift effect per document | Session 16 — generation progress page |

### Animated Gradient Border — Implementation Notes
- Colors: primary #8B6914, secondary #C9A84C, accent #E8D5A3
- backgroundColor: #0a0a0a
- borderRadius: 0 (no rounded corners — locked rule)
- borderWidth: 1
- Apply to: pricing Most Popular card (speed 10), landing CTA button
  (speed 6, rotate-on-hover), Module 3 active sidebar section (speed 12)
- CSS: add @keyframes gradient-rotate + @property --gradient-angle to globals.css
- Component path: src/components/ui/animated-gradient-border.tsx

### Image Slider Login — Implementation Notes
- Split screen: image slider left, form right
- Left images: U.S. themed — Statue of Liberty, New York skyline, business settings
- Right: signup/login form with pre-filled email on /verify
- Uses framer-motion (fine on auth pages — not SEO-critical)
- Dependencies: framer-motion (already installed)
- Apply Obsidian Gold tokens — no white backgrounds, no rounded corners

### FAQ Monochrome — Implementation Notes
- New section needed on landing page between Testimonials and Footer
- Questions to answer: "Is this a law firm?", "What if I'm denied?",
  "How is this different from hiring an attorney?", "Is my data secure?",
  "What countries are eligible?", "How long does it take?"
- Swap white accent → #C9A84C for gold
- Dark palette only — remove light mode toggle (locked to dark)
- Animated intro pill + card glow on hover → keep both

### AI Generation Reveal — Implementation Notes
- Use on /generate/[applicationId] progress page (Session 16)
- Wire progress prop to SSE percentage from generation pipeline
- Each document preview reveals with blur-lift as it completes
- Replace the right-panel "live document preview" in Session 16 Step 6
  with this component instead of a plain scrolling text panel
- Dependencies: motion (npm install motion)

---

## SESSION 15A — Build the Analysis Engine
- Database tables (migration created)
- Types (src/types/analysis.ts)
- Engine logic (src/lib/analysis-engine.ts)
- API route (src/app/api/analysis/run/route.ts)
- Sarah Mitchell test case (src/lib/__tests__/analysis-engine.test.ts)
Status: COMPLETE

---

## SESSION 15F — Quiz Scoring Wiring Fix (June 3, 2026)
- Found: `calculateAndRedirect` in `src/app/quiz/page.tsx` initialised `hardStopCodes`, `attorneyFlags`, `riskFlags` to empty arrays — outcome was always `'qualified'` regardless of answers
- Fixed: real evaluation against `module0_scoring_logic.json` (hard_stops, attorney_flags, risk_flags)
- Supports array triggers (string match) and string triggers with arithmetic (`amount_usd < 75000`, `75000 <= amount_usd <= 149999`)
- Attorney flags with `level: "do_not_proceed"` route their `stop_code` into `hardStopCodes` (W-03 → PR-THIRD-COUNTRY)
- Widened `ScoringLogic` interface: `trigger: string | string[]`
- Build: clean (`/quiz` route 6.91 kB → 7.2 kB)
- Commit: `8002b17 Fix: quiz scoring logic — wire actual evaluation from module0_scoring_logic.json`
Status: COMPLETE

---

## SESSION 15B — Email Verification Funnel (June 3, 2026)
- `email_verifications` table migration (3d800df)
- `/api/email/results` route — Resend integration (c9ca588)
- `actions/verify-token.ts` server action (73d1e8b)
- `/verify` page — token validation + forced signup (9e01dc2)
Status: COMPLETE

---

## SESSIONS 13G + 15C–15E — Quiz & Results Completion (June 3, 2026)
- Module 3 Tabs E, G, H, I, K, L wired (Session 13G, commits 4041f0c → 89a7680)
- Quiz completion: email send + redirect on Q0-21 (2c5a733)
- Results page rebuild: 4 outcomes + email capture banner (2d1ac64)
- Results page recovery after stream error (d4dadba)
- Build clean: all TypeScript and ESLint errors fixed (b4f3d55)
Status: COMPLETE

---

## SPEC CORRECTIONS — June 3, 2026
All 6 spec corrections applied and committed:
1. Cover letter = Step 1 always (Spec3, Spec4)
2. Page limit = 50 per TAB not total (Spec1, Spec4)
3. AI model = Anthropic API direct (Spec3)
4. Prompt storage = /prompts/v1/documents/ (Spec3)
5. Partnership routing = two separate packages (all specs)
6. Voice profile = raw text only, no JSON (Spec2)
Status: COMPLETE

---

## SESSION 16 — Document Generation Engine (June 4, 2026)

Completed:
- 6 generation prompt files created (`/prompts/v1/documents/`)
- Database migration: 5 tables with RLS (`document_generation_jobs`, `generated_documents`, `revision_credits`, `document_change_log`, `document_generation_log`)
- Types defined (`src/types/generation.ts`) — `GenerationJob`, `GeneratedDocument`, `RevisionCredit`, generation step labels
- Core generation engine (`src/lib/generation-engine.ts`) — prompt loading, payload building, Claude API calls, humanization pass, consistency checker, quality gate, main orchestrator with 15-step pipeline
- 4 API routes: `POST /api/generate/start`, `GET /api/generate/progress/[jobId]` (SSE), `GET /api/generate/documents/[applicationId]`, `POST /api/generate/run/[jobId]`
- Progress page (`/generate/[applicationId]`) — 15-step narrative, live document preview, Obsidian Gold design
- Documents review page (`/documents/[applicationId]`) — document cards, approval modal, revision requests, 5-checkbox acknowledgment gate
- Module 3 overview page rewritten (`/apply/module3`) — tab completion tracking, "Generate My Package" button
- 8 unit tests (Sarah Mitchell case) — all passing
- `npm run build`: clean — 39 routes compiled
- Anthropic SDK (`@anthropic-ai/sdk`) installed, Jest configured

Decisions:
- AI model for documents: `claude-sonnet-4-20250514` via Anthropic SDK (not OpenRouter)
- Cover letter always generated first (Step 1)
- 15-step pipeline: sequential only, checkpointed after each step
- SSE + polling fallback for progress
- Revision credits: 10 per application
- 5 acknowledgment checkboxes required before download

Status: COMPLETE

---

## BUILD STATE — End of Session 17 (S1-S3), June 4, 2026
- Branch: `dev`
- Working tree: clean
- Last commit: `37491e0` — feat: pricing page pre-selects correct tier from quiz session data
- `npm run build`: clean — 41 routes, 0 errors
- 8/8 unit tests passing (generation-engine.test.ts), 7/7 passing (pricing-tier.test.ts)
- Quiz v3.0: live, scoring wired
- Module 3: all 12 tabs (A–L) wired, overview page with generate button
- Analysis engine: built and tested
- Document generation engine: fully built
- Generation progress UI: built
- Documents review + approval page: built
- Pricing page: pre-selects tier from quiz session data, 7-tier mapping, manual override supported, Playwright verified

---

## SESSION 6, 7 & 8 — Business Data & Security History Deduplication (June 5, 2026)
- **Completed S6**: Audited Tab A for work history/education; confirmed Tab J is the single source of truth. Added clarifying comment to `src/app/apply/module3/a/page.tsx` and documented in `docs/IDEAS.md`.
- **Completed S7**: Established Tab A as the single source of truth for business details (`M3-A-51` for business name, `M3-A-55` for ownership percentage). Created `ContradictionFlag` component to detect and resolve mismatches between master and derived fields. Updated Tab E page to pre-fill from Tab A. (Commit: `c2719b3`)
- **Completed S8**: Security history pre-fill with legal confirmation gate on Tab A. Extended `src/lib/prefill.ts` mappings and `PreFilledField.tsx` to support `requiresConfirmation`. Added a security subtitle to `SectionForm.tsx` and disabled the "Save Section" button until all sensitive pre-filled fields (QA-23, QA-39) are explicitly confirmed. Verified via Playwright: pre-filled states show unchecked badges, submit gate is active, editing unchecks the confirmation, and re-confirming re-enables save. (Commit: `edd86f3`)

---

## SESSION S9, S10 & S11 — Tier 3 Data Architecture Completion (June 5, 2026)
- **Completed S9**: Timeline single source of truth — separated `working_target_date` (planning) from `confirmed_interview_date` (hard anchor). Built `src/lib/timeline-service.ts` to calculate backward deadlines and update the compliance calendar. Added Playwright verification for range → specific date transitions. (Commit: `00a6eba`)
- **Completed S10**: Tab B / Tab L shared document overlap fix. Added `sharedTabs` and `crossTabNote` to `ChecklistItem`. Created `CrossTabNote` component with collapsible inline gold-styled info note. Playwright verified expand/collapse behavior. (Commit: `ea108d6`)
- **Completed S11**: Analysis Engine + Confidence Score Integration. Replaced duplicate confidence score calculations. Created `src/lib/score-sync.ts` to read directly from `case_briefs` table. Added `/score` page showing dimensions, "Last assessed" timestamp, significant change banner, and legal disclaimer. Playwright tests added. (Commit: `7cf5a10`)

---

## SESSION S22 — AI Generation Blur-Lift Reveal (June 5, 2026)
- **Audit finding:** The DocumentCard component + blur-lift JSX were already in `src/app/generate/[applicationId]/page.tsx` from commit `7cf5a10`. Right panel replaced with 6 named document cards. Missing piece: `motion` dependency not installed (runtime error on import).
- **Installed `motion`** (v12.40.0 — includes framer-motion, motion-dom, motion-utils)
- **Playwright test:** `tests/generation-page.spec.ts` — verifies 6 document cards render, all 6 names present ("Cover Letter" → "DS-160 Reference"), 6 `backdrop-blur-3xl` overlay elements present. Passed. Screenshot saved at `tests/screenshots/generation-page-init.png`.
- **Build:** clean — 43 routes, 0 errors
- **Commit:** `daf7817` — "feat: document generation blur-lift reveal animation"
- **Pushed:** origin/dev ✓
- **Post-session documentation:** `docs/ai-generation-reveal.md` spec file created retroactively. Covers: purpose, visual behaviour, 6-card order, motion library usage (blur-lift 1.2s easeOut), progress wiring from SSE pipeline, isCurrent logic, design tokens. Includes post-implementation caveat. (Commit: `30bdf46`)

---

## SESSION S16, S17 & S18 — Tier 5 Spec Updates (June 5, 2026)
- **Completed S16**: Interview Simulator Spec Update. Created `docs/INTERVIEW_SIMULATOR_SPEC.md` incorporating Vol 3 Sections 7.5/7.6 and IDEAS.md 12G decisions (Filed Package as Baseline, Weak Point Probing, Answer Evaluation Against Filed Documents, Coaching Summary). (Commit: `fbd383a`)
- **Completed S17**: Compliance Calendar Spec Update. Created `docs/COMPLIANCE_CALENDAR_SPEC.md` incorporating Vol 3 Section 7.7 and IDEAS.md 12H decisions (Two Distinct Date Concepts, Display Rules Based on Date Availability). (Commit: `1ceba36`)
- **Completed S18**: Renewal Module Spec Update. Created `docs/RENEWAL_MODULE_SPEC.md` incorporating Vol 3 Section 7.8 and IDEAS.md 12F decisions (Baseline Principle, Field Classification Table, Template 6 Implementation Rule, Question Framing Rules). (Commit: `ea8890b`)
- All sessions were documentation-only (no code, no build checks, no Playwright used during execution, though build was verified clean at session end).
- `npm run build`: clean (43 routes, 0 errors after `.next` cache clear).

---

## SESSION S23 — Image Slider on Auth Pages (June 6, 2026)
- **Completed**: U.S.-themed image slider left panel on `/login`, `/signup`, `/verify`.
- **Component**: Created `src/components/auth/AuthImageSlider.tsx` — 4 high-quality ambient images, 5s auto-advance, smooth 1000ms crossfade, no play/pause controls, hidden on mobile (`md:block`), Obsidian Gold gradient overlays.
- **Layout**: Refactored all three auth pages to use split-screen layout (left panel slider, right panel form) while maintaining existing auth logic and Obsidian Gold styling.
- **Verification**: Playwright test `tests/auth-slider.spec.ts` confirms all three pages render correctly with slider present. Screenshots captured in `tests/screenshots/`.
- **Build**: clean — 43 routes, 0 errors.
- **Commit**: `a88c3b4` — "feat: image slider on auth pages — U.S. themed left panel"
- **Pushed**: origin/dev ✓

---

## NEXT SESSION
**S21 — Animated Gradient Border** (Tier 6 polish)
- Apply animated gold gradient border to: Pricing "Most Popular" card (speed 10), Landing page main CTA button (speed 6), Module 3 active sidebar tab (speed 12).
- Add `@keyframes gradient-rotate` to `globals.css`.
- Playwright verification of all three locations.

**Other Remaining Tier 6 polish:**
- S24 — Journey wizard as post-quiz page
