# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 3, 2026 — End of Session 13G
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
docs/DESIGN_REFERENCE.html (if UI work). Report status.
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
| Document generation engine | ⬜ NOT STARTED | Sessions 15-16 |
| Voice matching system | ⬜ NOT STARTED | Designed, not built |
| Analysis engine | ⬜ NOT STARTED | Designed, not built |
| Follow-up conversation | ⬜ NOT STARTED | Designed, not built |

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
| Module 3 Tabs B-L | /apply/module3/[b-l] | ⚠️ SCAFFOLD | No real questions |
| Confidence Score | /score | ⬜ NOT STARTED | |
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

### Tab A (Working)
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
| E — Ownership | ✅ Spec updated | ⬜ Not wired |
| F — Investment Proof | ✅ Spec updated | ✅ Batch 1 Wired (Session 13C) · Batch 2 pending |
| G — Business Evidence | ✅ Spec updated | ⬜ Not wired |
| H — Source of Funds | ✅ Spec updated | ⬜ Not wired |
| I — Non-Marginality | ✅ Spec updated | ⬜ Not wired |
| J — Qualifications | ✅ Spec updated | ✅ Wired (Session 13B) |
| K — Business Plan | ✅ Spec updated | ⬜ Not wired |
| L — Family Dependents | ✅ Spec updated | ⬜ Not wired |

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
| Analysis engine | ⬜ Spec written — not built |
| Voice sample collection | ⬜ Spec written — not built |
| AI detection on voice sample | ⬜ Spec written — not built |
| Voice profile extraction | ⬜ Spec written — not built |
| Follow-up conversation | ⬜ Spec written — not built |
| Generation prompts (/prompts/v1/) | ⬜ Not created |
| Sequential generation engine | ⬜ Not built |
| Checkpoint DB table | ⬜ Not built |
| Server-Sent Events progress | ⬜ Not built |
| Repetition checker | ⬜ Not built |
| Consistency checker | ⬜ Not built |
| AI detection audit | ⬜ Not built |
| Humanization pass | ⬜ Not built |
| Metadata sanitization | ⬜ Not built |
| Quality gate | ⬜ Not built |
| Pre-download acknowledgment gate | ⬜ Not built |
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
