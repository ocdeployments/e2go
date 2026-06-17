# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 17, 2026 — Session 27 complete (Sprint 1 — evaluate + coaching + TTS/STT + interview-day)
**App Name:** E2go.app
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
| Full UI redesign | ✅ COMPLETE | Obsidian Gold |
| PWA | ✅ COMPLETE | Manifest, service worker, install prompt |
| Design skills installed | ✅ COMPLETE | |
| Module 3 Tab A | ✅ COMPLETE | 21 questions, privacy categories, working |
| Module 3 Tabs B-L | ✅ COMPLETE | All 12 tabs wired |
| /apply/overview | ✅ COMPLETE | |
| /apply/checklist | ✅ COMPLETE | Three phases, Supabase connected |
| Pricing page | ✅ COMPLETE | Founding member pricing, guarantee |
| Dashboard | ✅ COMPLETE | Needs real data wiring |
| Landing page | ✅ COMPLETE | 12 sections, Obsidian Gold. Portrait hero, row mistakes, connected steps, hero feature with binder image, testimonial photos |
| Document generation specs | ✅ COMPLETE | 4 spec files |
| Stripe integration | ⚠️ PARTIAL | Code complete, payments table needs migration |
| Email verification funnel | ✅ COMPLETE | |
| Document generation engine | ✅ COMPLETE | 15-step pipeline, sequential, checkpointed |
| Analysis engine | ✅ COMPLETE | Types, lib, API, tests, 9-dimension scoring |
| Three-layer experience pipeline | ✅ COMPLETE | Session 7 — Layer 0/1/2: follow-up, scoring, framing, backstop |
| Cover page data fix | ✅ COMPLETE | Session 8 — personal_info JSONB → real data sources |
| Post-generation package summary | ✅ COMPLETE | Session 9 — 5-section strength/gaps/disclaimer screen |
| Follow-up conversation | ✅ COMPLETE | Voice sample, questions, responses, summary |
| Module 3 Pre-Fill Pass | ✅ COMPLETE | Quiz → Tab A/F/L with legal gates |
| Security history pre-fill | ✅ COMPLETE | With legal confirmation gate |
| Business data deduplication | ✅ COMPLETE | Tab A as single source |
| Timeline service | ✅ COMPLETE | Two date concepts separated |
| Tab B/L cross-tab notes | ✅ COMPLETE | Shared document detection |
| Contradiction flag component | ✅ COMPLETE | |
| Auth pages image slider | ✅ COMPLETE | U.S. themed left panel |
| Navigation & routing | ✅ COMPLETE | All routes connected, mobile nav |
| Route cleanup | ✅ COMPLETE | 47 routes, dead pages removed, middleware hardened |
| Breadcrumbs | ✅ COMPLETE | On /apply/*, /score |
| Cookie consent banner | ✅ COMPLETE | |
| SEO metadata | ✅ COMPLETE | All pages |
| /learn hub | ✅ COMPLETE | 6 SEO articles + Ask E2go widget |
| Module 1 | ✅ COMPLETE | Onboarding, consent, application record |
| Module 2 | ✅ COMPLETE | Business advisor, category selection |
| Voice-to-text input | ✅ COMPLETE | commit 63dc9dd — mic on all 8 textareas |
| Case file UX redesign | ✅ COMPLETE | Two-panel layout, CaseFileShell, voice input |
| Ask E2go FAQ widget | ✅ COMPLETE | Session 11 — pgvector 368 Q&A, streaming, 3-layer retrieval |
| Standalone simulator upload | ✅ COMPLETE | Session 14 — quick-start route, extraction → answers |
| Login transition flicker fix | ✅ COMPLETE | Session 12 — full-panel loading state on submit |
| Simulator teaser page | ✅ COMPLETE | Session 12 — "complete case file" or "upload docs" paths |
| FAQ widget → /learn merge | ✅ COMPLETE | Session 15 — widget on /learn, CTA on homepage |
| FAQ widget ambient states | ✅ COMPLETE | Session 16 — animated gradient border, thinking indicator |
| FAQ widget scrollable container | ✅ COMPLETE | Sessions 17-18 — fixed height, no layout jump |
| Supabase singleton fix | ✅ COMPLETE | Sessions 28-30 — duplicate GoTrueClient resolved |
| Dashboard loading state | ✅ COMPLETE | Sessions 27-29 — try/catch/finally, singleton client |
| Simulator loading state | ✅ COMPLETE | Sessions 28-30 — singleton, column name fixes |
| Login quiz-session linkage | ✅ COMPLETE | Session 26 — await signInWithPassword, remove redundant getSession |
| Nav on authenticated layouts | ✅ COMPLETE | Session 25 — Nav added to authenticated page layouts |
| Quick-start flow hardening | ✅ COMPLETE | Sessions — missing tables, wrong columns, RLS fixes |
| Package assembly (cover, TOC, dividers) | ✅ COMPLETE | Session 4 — 15-file ZIP with cover, TOC, dividers, renamed docs |

---

## PRICING — LOCKED (Updated June 9, 2026)

| Application Type | Price | Stripe cents |
|---|---|---|
| Solo individual | $550 | 55000 |
| Solo + spouse | $697 | 69700 |
| Solo + family (up to 2 kids) | $750 | 75000 |
| Solo + family (3–5 kids) | $797 | 79700 |
| Partnership (no families) | $997 | 99700 |
| Partnership two couples | $1,297 | 129700 |
| Partnership two families | $1,397 | 139700 |
| Extra child surcharge | +$50 | +5000 (dynamic checkout, no fixed Price ID) |
| Interview Simulator standalone | $197 | 19700 |
| Interview Simulator additional sessions | $29.99 | 2999 |
| Renewal package | $497 | 49700 |

**Simulator included in all packages AND available standalone.**
**Extra child surcharge is dynamic — no fixed Stripe Price ID.**

⚠️ ACTION REQUIRED: All Stripe Price IDs in .env.local and the
pricing table in Supabase must be recreated at these new amounts.
Old founding member Price IDs are now incorrect.
Run scripts/stripe-setup.ts after updating amounts.
Update STRIPE_PRICE_* env vars with new Price IDs after running.

---

## PAGES — BUILD STATUS

| Page | Route | Status |
|---|---|---|
| Landing | / | ✅ COMPLETE |
| Quiz | /quiz | ✅ COMPLETE |
| Results | /results | ✅ COMPLETE |
| Quiz Review | /quiz/review | ✅ COMPLETE |
| Document Upload | /apply/upload | ✅ COMPLETE |
| Upload Processing | /apply/upload/processing | ✅ COMPLETE |
| Upload Review | /apply/upload/review | ✅ COMPLETE |
| Upload Gap Report | /apply/upload/gaps | ✅ COMPLETE |
| Pricing | /pricing | ✅ COMPLETE |
| Success | /pricing/success | ✅ COMPLETE |
| Dashboard | /dashboard | ✅ COMPLETE |
| Login | /login | ✅ COMPLETE |
| Signup | /signup | ✅ COMPLETE |
| Verify | /verify | ✅ COMPLETE |
| Overview | /apply/overview | ✅ REDIRECT → /apply (query-preserving shim) |
| Checklist | /apply/checklist | ✅ COMPLETE |
| Module 1 | /apply/module1 | ✅ COMPLETE |
| Module 2 | /apply/module2 | ✅ COMPLETE |
| Module 3 shell | /apply/module3 | ✅ COMPLETE (8 tabs: A B C D E I J K) |
| Module 3 Tab A | /apply/module3/a | ✅ COMPLETE |
| Module 3 Tabs B,C,D,E,I,J,K | /apply/module3/[b-k] | ✅ COMPLETE |
| ~~Module 3 Tabs F,G,H,L~~ | ~~deleted~~ | ✅ REMOVED — superseded by case file |
| ~~Onboarding~~ | ~~deleted~~ | ✅ REMOVED — orphaned |
| ~~Outcome~~ | ~~deleted~~ | ✅ REMOVED — orphaned |
| Case File Overview | /apply | ✅ COMPLETE | Obsidian Gold section cards |
| Case File: Your Story | /apply/story | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Business | /apply/business | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Investment | /apply/investment | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Qualifications | /apply/qualifications | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Family | /apply/family | ✅ COMPLETE | Two-panel CaseFileShell, all variants preserved |
| Case File: Your Ties | /apply/ties | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Score | /score | ✅ COMPLETE |
| Generate | /generate/[appId] | ✅ COMPLETE |
| Documents | /documents/[appId] | ✅ COMPLETE |
| Learn | /learn | ✅ COMPLETE |
| About | /about | ✅ COMPLETE |
| Privacy | /privacy | ✅ COMPLETE |
| Terms | /terms | ✅ COMPLETE |
| Support | /support | ✅ COMPLETE |
| Gap Analysis | /gap-analysis | ✅ COMPLETE — 6 categories + 15 D-code radar |

---

## MODULE 0 — QUIZ v4.0 (Updated June 9, 2026)

| Feature | Status |
|---|---|
| 14 core + 19 total questions (global) | ✅ COMPLETE |
| Global treaty country selector | ✅ COMPLETE |
| Scoring logic v3.0 | ✅ COMPLETE |
| Hard stops PR-01 through PR-08 | ✅ COMPLETE |
| Results page with outcomes | ✅ COMPLETE |
| Quiz pre-fills to Module 3 | ✅ COMPLETE |
| Draft save system (localStorage + Supabase backfill) | ✅ COMPLETE |
| Back button repositioned top-left, warmer colour | ✅ COMPLETE |
| Clickable section tab navigation | ✅ COMPLETE |
| Franchise lead capture (Q0-FRANCHISE-REFERRAL) | ✅ COMPLETE |
| Q0-13 split — nuclear family (Q0-13a) + extended (Q0-13b) | ✅ COMPLETE |
| Q0-15 partnership — spousal option + corrected advisory | ✅ COMPLETE |
| Q0-14b spouse role follow-up question | ✅ COMPLETE |
| Q0-03a principal applicant sub-question | ✅ COMPLETE |
| Results timeline — dynamic month names not weeks | ✅ COMPLETE |
| "Review or change my answers" link on results page | ✅ COMPLETE |
| /quiz/review — jump-to-question editing page | ✅ COMPLETE |
| Selected option gold borders confirmed | ✅ COMPLETE |

## MODULE 0 — QUIZ v6.0 (Final Rebuild — June 10, 2026)

| Feature | Status |
|---|---|
| 16 questions (10 core + 6 subs) | ✅ COMPLETE |
| Q0-01 treaty country hard stop works | ✅ COMPLETE |
| Q0-02 principal applicant question | ✅ COMPLETE |
| Q0-03 family composition (merged Q0-13a + Q0-16) | ✅ COMPLETE |
| Q0-04 business partner (merged Q0-07 + Q0-15) | ✅ COMPLETE |
| Q0-09 history as one multiselect | ✅ COMPLETE |
| Q0-10 home ties as one multiselect | ✅ COMPLETE |
| Dynamic question counter (never exceeds visible total) | ✅ COMPLETE |
| Back button at bottom left | ✅ COMPLETE |
| handleComplete reads correct question IDs | ✅ COMPLETE |
| Dependents from Q0-03 (not Q0-16) | ✅ COMPLETE |
| Application type from Q0-02/Q0-04 (not Q0-09) | ✅ COMPLETE |
| Pricing chain correct end to end | ✅ COMPLETE |
| All 17 confirmed bugs resolved | ✅ COMPLETE |
| All 30 bugs from full combinatorial audit resolved | ✅ COMPLETE |
| handleMultiContinue calls processAction — multiselect scores | ✅ COMPLETE |
| evaluateShowIf handles array answers — subs render correctly | ✅ COMPLETE |
| Treaty country validation fires PR-NON-TREATY | ✅ COMPLETE |
| COS flag string match corrected | ✅ COMPLETE |
| Score weights corrected — positive ties no longer penalised | ✅ COMPLETE |
| Q0-03 and Q0-04 show_if — no redundant questions | ✅ COMPLETE |
| Sequential Q0-09 history branching | ✅ COMPLETE |
| All 9 hard stops wired and reachable | ✅ COMPLETE |
| Pricing chain correct end to end | ✅ COMPLETE |
| Test fixtures written — 5 profiles in docs/TEST_FIXTURES.md | ✅ COMPLETE |
| Q0-PREP-STATUS routing question | ⏳ PENDING — DOCUMENT_UPLOAD_SPEC.md |

## MODULE 0 — QUIZ LEGAL ACCURACY (Session 2 — June 9, 2026)

| Fix | Question ID | Status |
|---|---|---|
| Multi-partner hard stop per 9 FAM 402.9 | PR-06b updated | ✅ COMPLETE |
| Holding company / trust ownership chain | Q0-14c | ✅ COMPLETE |
| Control through management rights below 50% | Q0-14d | ✅ COMPLETE |
| E-visa nationality for mixed partnerships | Q0-14e | ✅ COMPLETE |
| Investment commitment timing | Q0-05a | ✅ COMPLETE |
| Passive investment + non-profit hard stops | Q0-09a | ✅ COMPLETE |
| Officer discretion advisory on results page | Advisory block | ✅ COMPLETE |
| DS-156E consulate-specific note on checklist | Checklist | ✅ COMPLETE |

New scoring entries: 2 hard stops (PR-PASSIVE-INVEST, PR-NONPROFIT),
4 attorney flags, 6 risk flags — all additive, no existing entries modified.

---

## DOCUMENT UPLOAD FEATURE — STATUS (Updated June 9, 2026)

| Feature | Status |
|---|---|
| Q0-PREP-STATUS quiz routing question | ✅ COMPLETE |
| DB migration — application_documents table | ✅ COMPLETE |
| DB migration — document_discrepancies table | ✅ COMPLETE |
| DB migration — answers.confidence + source_document_type | ✅ COMPLETE |
| DB migration — applications.preparation_status | ✅ COMPLETE |
| Supabase Storage bucket: application-documents | ✅ COMPLETE |
| POST /api/documents — file upload route | ✅ COMPLETE |
| POST /api/documents/extract — SSE extraction pipeline | ✅ COMPLETE |
| POST /api/documents/resolve-discrepancy | ✅ COMPLETE |
| GET /api/documents/gap-report | ✅ COMPLETE |
| src/lib/text-extraction.ts — PDF/DOCX/XLSX/CSV parsing | ✅ COMPLETE |
| src/lib/document-validation.ts — file validation | ✅ COMPLETE |
| src/lib/document-extraction-engine.ts — AI extraction | ✅ COMPLETE |
| DocumentUploadCard — intake card on /apply overview | ✅ COMPLETE |
| /apply/upload — document type selection + drag-and-drop | ✅ COMPLETE |
| /apply/upload/processing — SSE progress screen | ✅ COMPLETE |
| /apply/upload/review — discrepancy resolution | ✅ COMPLETE |
| /apply/upload/gaps — gap report with section coverage | ✅ COMPLETE |
| PreFillBadge — amber document variants added | ✅ COMPLETE |
| Acknowledgment tracking for pre-filled fields | ✅ COMPLETE |
| Visual consistency with case file redesign | ⚠️ Pending redesign session |

⚠️ ACTION REQUIRED: Apply migration docs/migrations/004_answers_source_update.sql
to Supabase: npx supabase db push

---

## INTERVIEW SIMULATOR — STATUS (Updated June 9, 2026)

| Feature | Status |
|---|---|
| /simulator route | ✅ COMPLETE |
| Start / active / complete screens | ✅ COMPLETE |
| Text mode — full evaluation flow | ✅ COMPLETE |
| Voice mode — Groq Whisper transcription wired | ✅ COMPLETE |
| Groq TTS officer voice (Fritz-PlayAI, server-side) | ✅ COMPLETE |
| 15-minute session timer with 2-min warning | ✅ COMPLETE |
| $29.99 purchase flow wired to Stripe | ✅ COMPLETE |
| Design violations fixed — zero border-radius | ✅ COMPLETE |
| simulator_sessions + simulator_answers DB tables | ✅ COMPLETE |
| Session limit tracking (used / purchased on applications) | ✅ COMPLETE |
| OpenRouter MiMo evaluation engine (coaching-quality prompts) | ✅ COMPLETE |
| Coaching summary + readiness indicator | ✅ COMPLETE |
| Per-session question variety (pool-based random selection) | ✅ COMPLETE |
| Prominent session countdown timer (fixed bottom bar) | ✅ COMPLETE |
| Post-session coaching report (what officer expected, model answer) | ✅ COMPLETE |

✅ STRIPE_PRICE_SIMULATOR renamed to STRIPE_PRICE_SIMULATOR_3PACK (commit 0aca5dc)
✅ useEffect dependency fixed — question?.id → question.text (commit 0aca5dc)

---

## SIMULATOR INTELLIGENCE — Session 23 (June 16, 2026)

| Feature | Status | Commit |
|---|---|---|
| Delivery confidence analysis | ✅ COMPLETE | 0e30c95, 326ecc9 |
| Adaptive Quick Intake confirm step | ✅ COMPLETE | 11cca98 |
| /gap-analysis page (6 categories) | ✅ COMPLETE | b10c7d4 |
| Denial Risk Radar (D-01 to D-15) | ✅ COMPLETE | b28de69 |

**Delivery confidence** (`analyzeDelivery()` in simulator-engine.ts):
- Pure regex, zero LLM cost
- Flags: filler words (≥2 occurrences), brevity (<30 words), hedging language (≥2 phrases)
- Stored in `SessionQuestion.deliveryNotes`, aggregated into `CoachingSummary.deliveryFlags`
- `DeliveryFlagCard` renders TOO BRIEF / FILLER WORDS / HEDGING LANGUAGE on session-complete screen

**Adaptive Quick Intake** (`/simulator/quick-start`):
- After extraction_complete, new `confirm` step replaces immediate redirect
- Shows 5 extracted fields (business name, investment amount, applicant name, target state, Y1 employees)
- EXTRACTED / NOT FOUND labels; missing fields get inline inputs
- Patches edits back to DB before routing to case file

**Gap Analysis** (`/gap-analysis`, `src/lib/gap-analysis-engine.ts`):
- Accepts ?applicationId= or defaults to most recent application
- `scoreCase()` reads answers, documents, case_briefs, simulator session data
- 6 weighted categories: Source of Funds 25%, Management Role 25%, Business Plan 20%, Investment Amount 15%, Employment Creation 10%, Business Operations 5%
- **Denial Risk Radar**: all 15 D-codes from module3_denial_audit.md scored individually
  - D-01 to D-15 each read specific answer keys (QF-NEW-01, QH-NEW-01, QE-NEW-01, etc.)
  - D-08 uses `simulator_sessions_used`; D-09 uses `inconsistency_count` from latest session
  - Risk: low / moderate / high — click-to-expand finding + mitigation per D-code
- Overall readiness driven by high-risk D-code count, not just answer coverage
- Expandable category cards show D-code chips with colour-coded risk state
- Links to simulator for targeted practice

---

## MODULE 3 — TABS

All 12 tabs (A-L) wired with:
- Privacy categories
- Skip toggles with advisories
- 800ms debounce autosave
- Quiz pre-fill (A, F, L)
- Legal confirmation gates (security history)

---

## MODULE 3 — CASE FILE REDESIGN

Redesigned Module 3 from 12 separate tabs into 6 cohesive document-building sections.
Old tabs (module3/a-l) remain fully functional as fallback.

**Architecture:**
- `/apply` — Case file overview with personalized header, section cards, document chips, pre-fill gems
- `/apply/story` — Section 01: 4 clusters (who you are, your plan, administrative, travel & history)
- `/apply/business` — Section 02: 7 clusters (entity, what you do, operations, licenses, franchise, startup costs, market)
- `/apply/investment` — Section 03: 5 clusters (overview, source of funds, paper trail, projections, non-marginality)
- `/apply/qualifications` — Section 04: 5 clusters (background, business experience, role, visa history, interview prep)
- `/apply/family` — Section 05: 4 clusters (spouse, children, documents, travel)
- `/apply/ties` — Section 06: 5 clusters (property, family, financial obligations, return intent, cover letter)

**Components built:**
- CaseFileHeader, SectionCard, GenerateStrip (overview)
- SectionSideNav, QuestionPanel (section layout)
- QuestionLabel, HelperText, PreFillBadge, TextInput, TextArea, OptionButton (question primitives)
- AdvisoryBlock, RiskFlag, ClusterDivider (context blocks)
- ProjectionTable, StartupCostTable (interactive tables)

**Data additions:**
- `answers.source` column (quiz / user_entry / user_edited)
- `applications.partner_gender` column
- Migration: `docs/migrations/001_case_file_columns.sql`

**Status:** ✅ data wired — all 6 section pages built, build clean, old tabs preserved
⚠️ UX redesign pending — session file: docs/sessions/SESSION_CASEFILE_REDESIGN.md

### Case file UX redesign — spec complete, build pending

Session file: `docs/sessions/SESSION_CASEFILE_REDESIGN.md`

What the redesign delivers:
- Two-panel layout: questions left, document preview right (desktop)
- Drawer (tablet) and full-screen overlay (mobile) for preview panel
- Cormorant Garamond question labels — not body copy weight
- Cluster navigation with completion states in sidebar
- Document preview fills in as user types — template-based Phase 1
  (Phase 2: live AI paragraph generation per cluster, after first paying user)
- Voice input redesigned: full-width bar below each textarea,
  labelled "Speak your answer", gold pulse + waveform when active
- Mic permission bug fixed: getUserMedia pre-check before SpeechRecognition.start()
- All variants preserved: partnership three-track, COS blocks,
  family sub-paths, all advisory/risk flag components
- Mobile: horizontal cluster pills + full-screen overlay preview
- Tablet: drawer from right
- Upload flow visual consistency (/apply/upload through /apply/upload/gaps)
- Module 4 visual consistency only — NO logic changes, NO mic button

### Voice-to-text input — Phase 1 (committed June 10, commit 63dc9dd)
- useSpeechInput hook: src/hooks/useSpeechInput.ts
- TextArea component updated with mic button (corner icon — superseded by redesign)
- 8 textareas across 6 sections have voice input
- Known bug: mic button disappears on click (getUserMedia permission pre-check missing)
- Fix: part of case file redesign session (SESSION_CASEFILE_REDESIGN.md)
- /apply/module4 voice sample unchanged — separate system, no mic button

---

## MODULE 6 — DOCUMENT GENERATION

15-step sequential pipeline:
```
Step 1  → Cover Letter (Tab D) — FIRST
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

Known issues in generation engine:
- Issue A: Approval gate timing — may not pause fully between documents
- Issue B: setState-during-render React violation (~line 100 of generate page)
- Issue C: Right column renders multiple empty boxes
Fix file: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md

---

## DESIGN SYSTEM — LOCKED

| Token | Value |
|---|---|
| Background | #0a0a0a (obsidian) |
| Primary accent | #C9A84C (aged gold) |
| Text primary | #f5f0e8 |
| Surface card | rgba(201,168,76,0.02) + border |
| Heading font | Cormorant Garamond Light (300) |
| Body font | DM Sans 300/400/500 |
| Border radius | 0 — no rounded corners |

---

## STRIPE INTEGRATION STATUS

### Code Complete ✅
- `src/app/api/stripe/create-checkout/route.ts` — creates sessions, reads price_id from DB
- `src/app/api/stripe/webhook/route.ts` — handles completed/expired/refunded
- `src/app/pricing/PricingClient.tsx` — tier selection, pre-fill, checkout trigger
- `src/app/pricing/success/page.tsx` — confirmation page

### Pricing Table ✅ (Updated June 10, 2026)
All 10 tiers have live Stripe Price IDs at confirmed pricing:
- solo_none: price_1TgewyF7Ggk3LUEyIkxlp1ry ($550)
- solo_spouse: price_1TgewyF7Ggk3LUEybTTTUG95 ($697)
- solo_family_small: price_1TgewzF7Ggk3LUEym0UKbRa0 ($750)
- solo_family_large: price_1TgewzF7Ggk3LUEyjErIbBO8 ($797)
- partnership_none: price_1TgewzF7Ggk3LUEyUbjuK8R4 ($997)
- partnership_couples: price_1Tgex0F7Ggk3LUEyPEleDScH ($1,297)
- partnership_families: price_1Tgex0F7Ggk3LUEyJJD6U7ot ($1,397)
- simulator_3pack: price_1Tgex0F7Ggk3LUEyhOhKvmKz ($29.99)
- renewal: price_1Tgex1F7Ggk3LUEykVcoLswI ($497)
- child_surcharge: price_1Tgex1F7Ggk3LUEymMJnQQH5 (+$50 dynamic)

### Migration Status ✅
File: `supabase/migrations/20260605110625_payments_table.sql`
Status: APPLIED — database is up to date

---

## SPEC FILES — STATUS

| File | Status |
|---|---|
| docs/Spec1_Analysis_Engine.md | ✅ Written |
| docs/Spec2_Followup_Conversation.md | ✅ Written |
| docs/Spec3_Generation_Prompts.md | ✅ Written |
| docs/Spec4_Quality_Gate_Pipeline.md | ✅ Written |
| docs/INTERVIEW_SIMULATOR_SPEC.md | ✅ Written |
| docs/COMPLIANCE_CALENDAR_SPEC.md | ✅ Written |
| docs/RENEWAL_MODULE_SPEC.md | ✅ Written |
| docs/IDEAS.md | ✅ Written |
| docs/PAYMENT_MANAGEMENT_GUIDE.md | ✅ Written |
| docs/DOCUMENT_UPLOAD_SPEC.md | ✅ Written — June 9, 2026 |
| docs/TEST_FIXTURES.md | ✅ Written — June 10, 2026 |
| docs/QUIZ_REBUILD_PLAN_V6.md | ✅ Written — June 10, 2026 |
| docs/sessions/SESSION_CASEFILE_REDESIGN.md | ✅ Written — June 10, 2026 |

---

## AGENT PROGRESS (June 5, 2026)

| Agent | Status | Notes |
|---|---|---|
| Agent 2 (Email Sequences) | 🔄 IN PROGRESS | Email sequence tables created |
| Agent 3 (Outcome Capture) | 🔄 IN PROGRESS | Outcome capture tables, compliance calendar spec |
| Agent 4 (Interview Simulator) | 🔄 IN PROGRESS | Simulator spec, tables created |

---

## SESSION — June 9, 2026 Planning Session (Claude.ai)

### What was decided and documented

**Pricing update:**
- Confirmed new pricing tiers replacing founding member pricing
- Solo $550 → Partnership two families $1,397
- Simulator standalone $197 / additional sessions $29.99
- Renewal $497 / Extra child +$50 dynamic
- All old Stripe Price IDs ($297–$647) now incorrect — must recreate

**Simulator completion:**
- Confirmed Groq TTS (Option A) over OpenAI TTS — same API key,
  lower latency, no new key needed
- Voice: Fritz-PlayAI officer voice
- Session limit: 2 sessions × 15 minutes each, $29.99 additional
- Session file written: docs/sessions/SESSION_SIMULATOR.md

**Quiz fixes (Session 1 — UX):**
- Family question split into nuclear (Q0-13a) and extended (Q0-13b)
- Spousal partnership handling + ownership split advisory corrected
- Principal applicant question added (Q0-03a)
- Timeline: weeks → month names (dynamic calculation)
- Back button repositioned and more visible
- Quiz review page: /quiz/review with jump-to-question editing
- Gold border fix on selected options (currently blue)
- Session file written: docs/sessions/SESSION_QUIZ_FIXES.md

**Quiz fixes (Session 2 — Legal accuracy per 9 FAM):**
- Three+ partner hard stop with E-2 employee pathway explanation
- Holding company ownership chain question
- Control through management rights (below 50% ownership)
- E-visa nationality designation for mixed-nationality partnerships
- Investment timing / "in process of investing" confirmation
- Passive investment and non-profit hard stops
- Officer discretion advisory on results page and investment section
- Session file written: docs/sessions/SESSION_QUIZ_FIXES_2.md

**Module 3 case file redesign:**
- Six document builders confirmed: story, business, investment,
  qualifications, family, ties
- Personalised header with three data states (full/thin/none)
- Pre-fill badge architecture: source field in answers table
- Partnership dual-track layout (shared / personal / partner B)
- Dynamic section manifest for COS, non-Canadian, blended family
- Projection table: Year 1–5 × Revenue / Net Income / Employees
- Partner gender: Man / Woman binary, name possessive fallback
- 34 gaps from adversarial audit fully specified
- Session file written: docs/sessions/SESSION_MODULE3_CASEFILE.md

**UI decisions locked (IDEAS.md Sections 13–21):**
- Page title: "Your case file" (not "Your document interview")
- Section card design system fully specified
- Section interior layout: 196px sidebar + question panel
- All three data states documented with exact copy
- Partnership three-track card layout documented
- Hero CTA fix: 4 surgical changes documented (IDEAS.md Section 21)

**Research added to knowledge base:**
- E2_partnerships_non_typical.md — 9 FAM partnership rules
- E2_essential_questions.md — 27 questions every E-2 case must answer
- E2_crypto_source_Toronto.md — crypto source of funds at Toronto
- E2Pathway_RegisteredAccounts_SourceOfFunds.md — RRSP/TFSA/LIRA
- E2Pathway_NonStandardFamily_Documentation.md — step-children etc.
- E2Pathway_MaterialChange_Renewal.md — material change at renewal
- canadian_common_law_E2.md — common-law marriage recognition

**Workflow diagrams rendered and logged in IDEAS.md:**
- Full branching journey (Section 4) — rebuilt June 9
- 16-stage document engine pipeline (Section 4) — from earlier session

### Build
No code changes — planning session only.
All decisions logged in IDEAS.md Sections 13–21.
All session files written to docs/sessions/.

---

## SESSION — Stripe Price IDs Updated (June 10, 2026)

### Completed
- npx tsx scripts/stripe-setup.ts — all 10 Price IDs created at
  new confirmed pricing ($550–$1,397 + simulator + renewal + child)
- .env.local updated automatically by setup script
- Supabase pricing table updated via SQL Editor:
  all 10 rows have correct tier_id, amount (cents), and stripe_price_id
- child_surcharge amount corrected: 50 → 5000 cents

### New Price IDs
| Tier | Price ID |
|---|---|
| solo_none | price_1TgewyF7Ggk3LUEyIkxlp1ry |
| solo_spouse | price_1TgewyF7Ggk3LUEybTTTUG95 |
| solo_family_small | price_1TgewzF7Ggk3LUEym0UKbRa0 |
| solo_family_large | price_1TgewzF7Ggk3LUEyjErIbBO8 |
| partnership_none | price_1TgewzF7Ggk3LUEyUbjuK8R4 |
| partnership_couples | price_1Tgex0F7Ggk3LUEyPEleDScH |
| partnership_families | price_1Tgex0F7Ggk3LUEyJJD6U7ot |
| simulator_3pack | price_1Tgex0F7Ggk3LUEyhOhKvmKz |
| renewal | price_1Tgex1F7Ggk3LUEykVcoLswI |
| child_surcharge | price_1Tgex1F7Ggk3LUEymMJnQQH5 |

Note: Stripe API version warning (2024-06-20 vs 2026-05-27) —
non-breaking, upgrade scripts/stripe-setup.ts apiVersion when convenient.

---

## SESSION — Login Page Flag Fix (June 10, 2026)

### Completed
- AuthImageSlider.tsx gradient fix — authFlagFadeLeft opacity corrected.
  Was: 100% opacity at 0% → transparent at 50% (blackout entire flag).
  Now: 60% opacity at 0% → transparent at 60% (flag visible, soft edge).
  Dark overlay reduced from rgba(10,10,10,0.45) → rgba(10,10,10,0.25).
  Flag colours now read clearly on left panel.
- Commit: e115caf

### Build
Clean — zero errors. TypeScript compiled successfully, no missing modules.

---

## SESSION — Route Cleanup (June 9, 2026)

### Completed
- **Deleted /apply/onboarding** — zero inbound references, fully orphaned
- **Deleted /apply/outcome** — zero inbound references, fully orphaned
- **Module3 TABS array trimmed** — removed F, G, H, L (12 → 8 tabs: A B C D E I J K)
- **Deleted module3/f, g, h, l** — superseded by new case file sections,
  zero references after TABS array update
- **Redirected /apply/overview → /apply** — client-side redirect preserving
  query params (?app= from inactivity emails), wrapped in Suspense for
  Next.js 14 compliance
- **Nav.tsx updated** — 3 instances of /apply/overview → /apply
- **dashboard/page.tsx updated** — /apply/overview → /apply
- **module4/page.tsx updated** — router.push updated
- **middleware.ts updated** — added /simulator, /score, /settings,
  /generate/, /documents/ to both protectedRoutes array and config.matcher

### Route count
Before: 53 routes
After: 47 routes (6 deleted)
/apply/overview retained as redirect shim for old email links

### Build
Clean — zero errors. 78 static pages + dynamic routes compiled.

---

## SESSION — Document Upload Session B: UI (June 9, 2026)

### Completed
- **DocumentUploadCard.tsx**: Upload intake card for /apply overview.
  Shows for partial/near_complete applicants, collapses to text link
  when dismissed, always available for scratch users via collapsed link.
- **UploadClient.tsx**: Full upload page — drag-and-drop zone, per-file
  document type selector, validation (10MB, 8 files, pdf/docx/xlsx/csv),
  remove buttons, process button.
- **ProcessingClient.tsx**: SSE consumer for extraction pipeline.
  Per-document status: Waiting → Classifying → Extracting → Complete/Failed.
  Auto-navigates to review (if discrepancies) or gaps (if none).
- **DiscrepancyReviewClient.tsx**: One card per conflicting field.
  Radio options from source documents + custom value input.
  Must resolve all before continuing. Hard gate enforced.
- **GapReportClient.tsx**: Section coverage bars (6 sections),
  critical gaps list with severity, document summaries with field counts.
- **/apply/upload** — document type selection + drag-and-drop
- **/apply/upload/processing** — SSE progress screen
- **/apply/upload/review** — discrepancy resolution
- **/apply/upload/gaps** — gap report
- **PreFillBadge.tsx updated**: Three new amber variants:
  "From your documents" (high confidence),
  "From your documents — please verify" (medium),
  "Your choice" (resolved conflict)
- **/apply/page.tsx updated**: Loads preparation_status, renders
  DocumentUploadCard above section grid

### Design
Full Obsidian Gold compliance — #0a0a0a, #C9A84C, Cormorant Garamond,
DM Sans, zero border-radius, no glassmorphism.

### Remaining
Apply migration 004_answers_source_update.sql to Supabase.

### Build
Clean — zero errors. Committed to dev branch.

---

## SESSION — Interview Simulator Completion (June 9, 2026)

### Completed
- **Groq transcription wired**: transcribeAudio() called in
  VoiceInput.onstop — placeholder comment replaced with live call.
  Voice mode transcription now functional end-to-end.
- **Groq TTS officer voice**: groq-tts.ts created as server-side
  API route (/api/simulator/tts). Fritz-PlayAI voice. Speaks each
  question aloud on load in voice mode. Replay button added.
  Key stays server-side — better architecture than original spec.
- **15-minute timer**: sessionTimeLeft, timerRef, timerWarning
  all wired. 2-minute warning fires in red. Force-complete at zero.
  Session duration shown on start screen.
- **$29.99 purchase flow**: handlePurchase wired to Stripe checkout
  route using simulator_3pack tier. purchaseLoading state. Success
  return handler refreshes session availability.
- **Design violations fixed**: All borderRadius values explicitly 0.
  Record button square. Readiness badges square. Emoji icons removed.

### Remaining
None. Simulator is fully complete.
- FIX 1: useEffect dependency line 468 — question?.id → question.text
- FIX 2: .env.local — STRIPE_PRICE_SIMULATOR → STRIPE_PRICE_SIMULATOR_3PACK
- Commit: 0aca5dc — dev

### Build
Clean — zero errors after completion. Committed to dev branch.

---

## SESSION — Quiz Legal Accuracy Fixes Session 2 (June 9, 2026)

### Completed — all 7 fixes per SESSION_QUIZ_FIXES_2.md
- **Fix 1 — Multi-partner hard stop**: PR-06b updated with full 9 FAM 402.9
  explanation. Two routing options: restructure to two-party, or apply
  as E-2 employee. Correct legal position now enforced at quiz level.
- **Fix 2 — Q0-14c**: Ownership structure question — direct vs holding
  company vs trust. Trust ownership triggers attorney flag. Holding
  company triggers chain calculation advisory.
- **Fix 3 — Q0-14d**: Control rights question fires when ownership
  indirect/below 50%. Veto rights, board control, special voting shares
  options. Documents a path to qualification below majority ownership.
- **Fix 4 — Q0-14e**: E-visa nationality designation for mixed-nationality
  partnerships. Dynamic options populated from Q0-01. All E-2 beneficiaries
  must share designated nationality per 9 FAM 402.9-4(B).
- **Fix 5 — Q0-05a**: Investment commitment timing. Fires when amount
  below $100k. Risk advisories for partially/uncommitted funds. "In the
  process of investing" standard now enforced.
- **Fix 6 — Q0-09a**: Active vs passive business screen. Hard stops for
  stock portfolio (PR-PASSIVE-INVEST) and non-profit (PR-NONPROFIT).
  Real estate active operations path preserved.
- **Fix 7 — Advisory + DS-156E**: Officer discretion advisory added to
  results page. DS-156E consulate-specific note added to checklist.

### Scoring additions (all additive — nothing modified)
- 2 new hard stops: PR-PASSIVE-INVEST, PR-NONPROFIT
- 4 new attorney flags
- 6 new risk flags

### Build
Clean — zero errors. All committed to dev branch.

---

## SESSION — Quiz Fixes Session 1 (June 9, 2026)

### Completed
- **Q0-13 split**: Family ties question split into Q0-13a (nuclear family
  travel plan) and Q0-13b (extended family ties). Distinct scoring
  implications for each. Spouse/children vs parents/siblings now
  properly separated.
- **Q0-15 partnership fixed**: Spousal partnership option added.
  Advisory corrected — 50/50 strict rule now clarified as applying
  to unrelated partners only. Spouse as silent investor vs active
  co-operator follow-up (Q0-14b) added.
- **Q0-03a added**: Principal applicant question fires when married
  and applying solo. Determines whether person filling out form
  is the principal or completing on spouse's behalf.
- **Results timeline**: Dynamic month name calculation replaces
  static "16–22 weeks". Displays e.g. "September — October 2026".
  Today's formatted date shown in subtitle.
- **Back button**: Repositioned to top-left of each question screen.
  Warmer colour (rgba(245,240,232,0.55)). Adequate touch target.
  "← Review or change my answers" link added to results page.
- **/quiz/review page**: New page with all answers grouped by category.
  Jump-to-question editing via localStorage (quiz_jump_to key).
  Auto-redirects back to results after answering jumped-to question.
- **Gold borders**: Confirmed already in place — no fix needed.

### Build
Clean — zero errors, zero warnings after completion.
All committed to dev branch.

---

## SESSION — Quiz Rebuild v5.0 (June 10, 2026)

### Completed
Full rebuild of the eligibility quiz — not a patch, a complete replacement.
17 confirmed bugs resolved. Commit: 8a64682

**16 questions in exact spec order:**
Q0-01 citizenship → Q0-02 who is this for → Q0-03 who is moving →
Q0-03a children ages (sub) → Q0-04 business partner → Q0-04a spouse
role (sub) → Q0-05 where applying from → Q0-06 funding → Q0-07
investment amount → Q0-08 business situation → Q0-08a business type
(sub) → Q0-08b broker (sub) → Q0-09 history multiselect → Q0-09a
refusal detail (sub) → Q0-09b conviction detail (sub) → Q0-10 home
ties multiselect

**New questions added from scratch:**
Q0-02, Q0-03, Q0-03a, Q0-04, Q0-04a, Q0-10

**Files updated (10 files):**
- src/data/module0_questions.json — full rebuild
- src/app/quiz/page.tsx — new QUESTIONS array, handleComplete fixed
- src/lib/pricing-tier.ts — reads Q0-03 for family, Q0-02/Q0-04 for type
- src/app/quiz/review/page.tsx — QUESTION_MAP rebuilt with new IDs
- src/app/apply/page.tsx — Q0-16 → Q0-03
- src/app/apply/module3/b/page.tsx — Q0-16 → Q0-03
- src/lib/checklist-generator.ts — Q0-16 → Q0-03, Q0-09 → Q0-04
- src/lib/prefill.ts — old history IDs → Q0-09a/Q0-09b
- src/app/results/page.tsx — pricing fixed ($247→$550, $447→$997)
- src/app/pricing/PricingClient.tsx — partnership detection fixed

**Bugs resolved:**
- Q0-01 treaty country hard stop now works
- Q0-16 duplicate removed
- Dependents reads from Q0-03 (not Q0-16)
- Application type reads from Q0-02/Q0-04 (not Q0-09)
- Pricing uses confirmed amounts ($550–$1,397)
- Question counter is dynamic (never exceeds visible total)
- Back button is at bottom left
- History is one multiselect (not three separate questions)
- Home ties is one multiselect
- Q0-03a parent/show_if corrected
- COS flag wired from Q0-05
- PR-06b hard stop fires for 3+ partners
- All old question IDs (Q0-13a, Q0-13b, Q0-14, Q0-15, Q0-16) removed

### Build
Clean — zero errors. One pre-existing hook warning in generate/page.tsx
(non-blocking, outside scope).

### Verification
- npm run build: clean
- /quiz: 200
- /results: 200

---

## SESSION — Quiz Rebuild v6.0 (June 10, 2026)

### Completed — commit 6f6bfaa on dev

Full rebuild addressing all 30 confirmed bugs from comprehensive
combinatorial path audit. 4 files changed, +1559/-242 lines.

**Fix A — handleMultiContinue calls processAction:**
Warnings, attorney flags, and hard stops now fire for multiselect
questions (Q0-09 history, Q0-10 ties). Previously all inert.

**Fix B — evaluateShowIf handles array answers:**
Multiselect sub-questions (Q0-09a, Q0-09b) now render correctly.
Array vs string comparison fixed.

**Fix C — Treaty country validation:**
Non-treaty country selection fires PR-NON-TREATY immediately.
Previously any country passed through.

**Fix D — COS flag string match:**
Was checking "valid visa" — option text says "valid status". Fixed.

**Fix E — application_type and dependents:**
Derived from Q0-02 with correct priority logic.
Spousal partnership, co-investor, and sole applicant paths correct.

**Fix F — show_if conditions:**
Q0-03 only fires for sole applicant or business partner paths.
Q0-04 only fires when Q0-02 = business partner.
Questions no longer fire redundantly after Q0-02 establishes context.

**Fix G — Score weights corrected:**
Removed incorrect tie deductions (W-PROPERTY-UNDISCLOSED etc).
Positive ties no longer penalise the score.
All 16 spec deductions added correctly.

**JSON rebuild — 18 questions:**
Q0-01 through Q0-10 plus subs Q0-02a, Q0-03a, Q0-04a, Q0-08a,
Q0-08b, Q0-09a, Q0-09b, Q0-09c. Correct routing throughout.
Sequential Q0-09 history branching. All hard stops present.
PR-NON-TREATY, PR-02, PR-03, PR-04, PR-06b, PR-08, PR-09,
PR-PASSIVE-INVEST, PR-NONPROFIT all wired.

**Pricing chain:**
pricing-tier.ts tiers match confirmed prices ($550-$1,397).
Mapping functions updated for new option text.
Results page uses getPricingTier() for accurate display.

### Build
Clean — zero errors. Routes verified: /quiz, /results, /pricing.

### Five verification paths (from QUIZ_REBUILD_PLAN_V6.md)
All must pass on next manual test:
1. Non-treaty country → PR-NON-TREATY hard stop
2. Loan secured by business → PR-02 hard stop
3. Deportation selected → ATTORNEY_RECOMMENDED, score -15
4. Spouse and children → Solo + Family $750
5. Business partner 50/50 → Partnership $997

### Test fixtures
Five complete applicant profiles written to docs/TEST_FIXTURES.md.
Use localStorage injection to test results/pricing pages instantly.
Use Supabase SQL to test full case file with pre-populated answers.

---

## SESSION — Voice-to-Text Input (June 10, 2026)

### Completed — commit 63dc9dd on dev

- **useSpeechInput hook**: src/hooks/useSpeechInput.ts
  Web Speech API wrapper — free, no API key, runs in browser
  Supports Chrome and Edge. Graceful degradation on Firefox/unsupported.
- **TextArea component updated**: Mic button added to all 8 textareas
  across 6 case file sections
- **Browser notice**: One-time inline notice for unsupported browsers,
  dismissible, stored in localStorage (e2go_voice_notice_dismissed)
- **/apply/module4 unchanged**: Voice sample system is a separate system.
  No mic button added there.

### Known bug
Mic button disappears on click — getUserMedia permission pre-check missing.
SpeechRecognition.start() fires before browser grants microphone permission.
Fix: call navigator.mediaDevices.getUserMedia({audio: true}) first,
then start recognition in .then() callback.
This fix is part of the case file redesign session.

### Coverage
- /apply/story: 3 textarea fields
- /apply/business: 1 textarea field
- /apply/investment: 1 textarea field
- /apply/qualifications: 1 textarea field
- /apply/family: 1 textarea field
- /apply/ties: 1 textarea field
- Total: 8 textareas across 6 sections

---

## SESSION — Case File UX Redesign — COMPLETE (June 10, 2026)

### Completed — Full Implementation

Case file UX redesign fully implemented across all 6 section pages.
Session file: docs/sessions/SESSION_CASEFILE_REDESIGN.md

**What was built:**
- CaseFileShell.tsx — two-panel layout (200px sidebar | questions | preview)
- TextArea.tsx — auto-resize, voice input bar, waveform, word count
- AdvisoryBlock, RiskFlag, PreFillBadge — restyled to Obsidian Gold
- SectionCard.tsx — restyled for overview page
- All 6 section pages migrated to CaseFileShell
- Module 4 textarea visual consistency (no mic button)
- Upload flow already Obsidian Gold — no changes needed

**Commits:** a9dfcb9, 5d02c15, c56f3a4, db919eb, b20065e, a421108, ddaccac, 7502ea8, fd710fa

---

## SESSION — Auth, Quiz, Results Fixes — Session 1 (June 10, 2026)

### Completed — commit 400d1dc on dev

16 tasks completed across auth, personalisation, quiz questions,
results page, and build verification.

**Auth & Personalisation (A1–A4):**
- A1: Login — email+password only, "Remember me" checkbox, removed magic link
- A2: Smart post-login routing by application state (quiz → results → pricing → apply)
- A3: Signup — first/last name fields, upsert to profiles table
- A4: Email verification enforcement in middleware

**Quiz Questions (B1–B4):**
- B1: Q0-05 reworded — "Where are you currently located?" with 4 location options
- B2: Q0-06 replaced — fund source type multiselect (6 options), Q0-08c/d franchise sub-questions added
- B3: Q0-09 reframed — "Do you have anything to disclose?" with 3 options + Q0-09c multiselect sub-question
- B4: Q0-10 simplified — 5 home ties options, new W-WEAK-TIES scoring code

**Scoring & Results (C1–C3):**
- C1: Score engine fix — attorney flags now reduce score (was only risk flags)
- C2: Results page personalisation — logged-in greeting, saved confirmation, email send button with loading/success/error states
- C3: Franchise referral tracking — franchise_referral_requested state, Supabase column, API notification route

**Navigation & State (D1–D2):**
- D1: Navbar auth state — "Hi, [first_name]" when logged in
- D2: Section visit tracking — useTrackSectionVisit hook applied to all 14 case file pages, last_visited_section column on application_lifecycle

**Quiz Draft (E1):**
- E1: Stale draft fix — expiry reduced from 7 days to 24 hours, franchiseReferralRequested persisted in draft

**Files changed:**
- src/app/login/page.tsx — smart routing, remember me, removed magic link
- src/app/signup/page.tsx — first/last name fields
- src/middleware.ts — email verification enforcement
- src/components/Nav.tsx — first_name in dropdown
- src/app/results/page.tsx — personalisation, email send
- src/app/quiz/page.tsx — score engine, franchise tracking, draft expiry
- public/data/module0_questions.json — Q0-05, Q0-06, Q0-08c/d, Q0-09, Q0-09c, Q0-10, score weights
- src/hooks/useTrackSectionVisit.ts — NEW
- supabase/migrations/20260611000000_add_last_visited_section.sql — NEW
- All 14 section pages (business, calendar, checklist, family, investment, module1, module2, module3, module4, overview, qualifications, story, ties, upload)

### Build
Clean — zero errors. Commit: 400d1dc

**What was decided:**
- Current pages render as plain scrolling forms — do not match
  the quality of the rest of the platform. Client paid $550–$1,397.
- Redesign is not polish. It is product.
- Standard: "Would someone who paid $600 feel embarrassed showing
  this screen to their spouse?" If uncertain — rebuild it.

---

## SESSION — Security Fixes (June 11, 2026)

### Completed — 42 fixes across 6 groups, 6 commits on dev

Session file: docs/sessions/SESSION_SECURITY_FIXES.md

**Group 1 — CRITICAL (commit 7741935):**
- Removed Playwright auth bypass from middleware
- Removed SKIP_PAYMENT_WALL bypass
- Added session auth to all 12 unprotected API routes (generate/start, generate/run, generate/progress, generate/documents, email/results, simulator/tts, simulator/transcribe, notifications/franchise-referral, followup/*)
- Added application ownership checks on generate routes
- Added payment wall on generate/start
- Input validation on TTS (text length) and transcribe (file size/type)
- HTML sanitization on franchise referral notification
- Stripe tier validation with VALID_TIER_IDS whitelist
- Removed token leak from email results response

**Group 2 — HIGH (commit 7821b8b):**
- Admin role column migration + layout.tsx role gate
- Removed client-prompt injection in ai.ts (hardcoded system prompt)
- E2go doc branding removed from legal disclaimers
- Quiz scoring caps for attorney flags (2+ → 74, 1+ → 89)
- W-SILENT-PARTNER added to scoring deductions (-10)
- Email outcome string mismatch fixed (qualified → PROCEED)
- solo_family_large pricing tier added ($797)
- .env.local duplicate Stripe Price IDs cleaned

**Group 3 — MEDIUM (commit 78f5d26):**
- Prompt sanitization applied to document-extraction-engine.ts
- Orphaned Q0-09a/Q0-09b show_if conditions fixed (now reference Q0-09c)
- Dead email button on results page wired to handleEmailResult
- CASL consent hardcoded true → uses caslConsent state variable
- Debug-env and test API routes deleted
- Error message sanitization on email/schedule route
- Ownership check added to documents/extract route
- Profiles first_name/last_name migration created
- Quiz sessions RLS + UPDATE policy migration
- Email log RLS migration

**Group 4 — LOW (commit 5bf7623):**
- .env.example synced with all env vars (added 15 missing keys)
- RLS enabled on processed_webhook_events table
- Lifecycle tracking for quiz_completed and generation_triggered events
- NEXT_PUBLIC_STRIPE_SECRET_KEY usage removed from PricingClient.tsx

**Group 5 — ACCESSIBILITY (commit a6a2d04):**
- Focus indicators restored: outline:none → gold ring (#C9A84C) on 12 inputs
- Cookie consent banner: added Reject button

**Group 6 — GENERATION ENGINE (commit f6138bd):**
- Approval gate: 5-minute warning logged before auto-approve
- setState batching via unstable_batchedUpdates in generate page
- Empty quality step span guarded with conditional render
- Signup page TypeScript type narrowing fix

### Build
Clean — zero errors after all 6 groups.

### Migrations to apply
```bash
npx supabase db push
# Applies: profiles_role_column, profiles_name_columns, quiz_sessions_rls, email_log_rls
```

**Layout decisions locked:**
- Desktop (≥1024px): 3-column — 200px sidebar | questions | document preview
- Tablet (768–1023px): 2-column + right drawer for preview
- Mobile (<768px): horizontal cluster pills + full-screen overlay preview
- CaseFileShell.tsx: new shared component wrapping all 6 sections

**Voice input redesign:**
- Full-width bar below each textarea (not corner icon)
- "Speak your answer" labelled button
- Active: gold pulse animation + 4-bar animated waveform
- Mic permission bug fix: getUserMedia pre-check
- Scope: TextArea component only — NOT /apply/module4

**Document preview panel (Phase 1):**
- Template-based — fills in as user types, no API call, no cost
- Fill progress bar per document (height 2px, gold)
- Phase 2 (after first paying user): live AI paragraph generation
  per cluster, ~$0.05–$0.75/session

**Scope of redesign:**
- /apply overview page — section cards
- /apply/story through /apply/ties — all 6 sections
- /apply/upload through /apply/upload/gaps — visual consistency
- /apply/module4 — textarea visual consistency only, NO logic changes
- Old fallback tabs /apply/module3/[a-k] — NOT touched

**Impact assessment:**
- Data layer fully insulated — only visual layer changes
- All data hooks, auto-save, onChange handlers preserved
- All variants preserved: partnership, COS, family sub-paths
- Data write verification test required after each section rebuild

**Document-to-cluster map:** documented in session file Step 5
All 6 sections × all clusters mapped to exact document fields.

---

## SESSION — Post-Verification-Wall Cleanup (June 12, 2026)

### Completed — 5 commits on dev, Groups 5-11 from SESSION_RESULTS_CLARITY_FIXES.md

Session file: docs/sessions/SESSION_RESULTS_CLARITY_FIXES (2).md

**Group 11 — Q0-03a simplification (commit 00fdb14):**
- Collapsed Q0-03a from 4 options to 3: "No children" / "Yes — all under 21" / "Yes — one or more are 21 or older"
- Removed W-AGING-OUT entirely — no decision impact, just noise
- Only W-OVER-21 fires now (for 21+ children)
- Removed W-AGING-OUT from score_weights.deductions and flag_explanations.json (both copies)
- Fixed src/data/module0_questions.json duplicate (had stale W-AGING-OUT references)

**Group 1 — Post-login session linking (commit 6c72ee0):**
- Added post-login session linking in quiz/page.tsx auth check
- When logged-in user has no linked quiz_sessions, queries for unlinked session by email and links it
- Fixes "existing account sent to quiz instead of dashboard" bug
- NameCaptureForm rendering confirmed correct (already working after commit 0116378)
- "Account already exists" handling confirmed working in NameCaptureForm

**Group 6 — Warning timing fix (commit aab6c10):**
- Changed processAction to return shouldAdvance: false for :warn: actions
- Warnings now pause and show message + "Continue anyway" button instead of auto-advancing
- Existing warning UI (lines 1175-1192) already handled this — just needed the flag change
- Post-Group-11 :warn: actions: 13 unique codes (W-BORDERLINE-INVESTMENT, W-CONVICTION-OLD, W-ENTRY-REFUSED, W-FAMILY-GIFT, W-LOW-INVESTMENT, W-NO-BIZ-IDENTIFIED, W-OVER-21, W-PARTNERSHIP-SPLIT ×2, W-REFUSAL-MULTIPLE, W-REFUSAL-OLD, W-REFUSAL-RECENT ×3, W-TARGET-URGENT, W-WEAK-TIES)

**Group 7 — Double-click debounce (commit 61d8be8):**
- Added isAdvancing ref guard to handleSelectOpt
- Prevents double-click from queuing multiple advances (quiz skipping questions)
- Guard resets after advance animation completes, or immediately for warning pauses

**Group 8 — Email validation (commit 90de0a8):**
- Replaced email.includes("@") with EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
- Moved setEmailSent(true) inside success path only (was firing on failure too)

**Investigate-only (no code changes):**
- Group 5 — Email button: confirmed fully removed in commit 0116378, no remnants
- Group 9 — Resend sender: e2go.app domain verification status unknown, needs Resend dashboard check
- Group 10 — RLS: quiz_sessions has RLS enabled, UPDATE policy exists, no INSERT policy found in migrations. Anon inserts succeeding — requires owner verification via SQL Editor

**Action items for owner:**
1. Run one-time SQL fix: `UPDATE quiz_sessions SET user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2' WHERE id = '83aa159a-be49-4287-b8eb-e31113dc74b5' AND user_id IS NULL;`
2. Check Resend dashboard — is e2go.app verified? If yes, revert sender to results@e2go.app
3. Run Group 10 RLS SQL queries in Supabase SQL Editor

### Build
Clean — zero errors. 5 commits pushed to dev.

---

### Completed — Groups 12-14 from SESSION_RESULTS_CLARITY_FIXES (3).md

Session file: docs/sessions/SESSION_RESULTS_CLARITY_FIXES (3).md

**Group 14 — Stripe success page "Payment not found" fix:**
- Root cause: `create-checkout/route.ts` inserted a `metadata` column into `payments` table that doesn't exist in the schema → insert silently failed → no payment row → success page showed "Payment not found"
- Fix 1: Removed `metadata` field from payments insert (children_count/line_items_count — nothing reads this data)
- Fix 2: Added error handling on the insert (`const { error } = await ...`)
- Fix 3: Added Stripe API fallback on success page — when payments row not found, calls `/api/stripe/verify-payment` which retrieves the session from Stripe API and upserts the payment row
- Updated `/api/stripe/verify-payment/route.ts` with dual-mode: `{ sessionId }` for Stripe fallback, `{ applicationId, userId }` for existing local check

**Group 13 — Post-login UX improvements:**
- 13a (first/last name fields): Already implemented — NameCaptureForm has both fields, create-account.ts accepts both
- 13b (personalized greeting): Already implemented — "Welcome back, {userName}" on results page
- 13c (returning-user banner): Added dashboard link to the "✓ Your profile has been saved" banner on /results for logged-in users
- 13d (guest option relabeling): Changed "Continue as guest" → "Skip for now"; changed post-dismiss link to "Create an account to save your results and access your dashboard"
- "YOUR NEXT STEPS" checklist: Logged-in users now skip step 1 "Create your account" (already done), starting from "Select your business"

**Group 12 — CI cleanup (investigate-only, no code changes):**
- 12a (secret-scanning false positive): Already fixed — current pattern requires 20+ chars after prefix, doesn't match `startsWith('sk_test_')` in source
- 12b (dependency audit): 5 HIGH vulnerabilities, all 4 fixable require major version bumps (Next.js 15+, ESLint 9+). Deferred to dedicated upgrade session — vulnerabilities are in dev tooling, not production runtime
  - xlsx: no fix available, not blocking

### Build
Clean — zero errors. 3 files changed, no commits yet (owner to commit).

---

## SESSION — Terms Required Dead-End Fix (June 12, 2026)

### Completed — Group 15 from SESSION_RESULTS_CLARITY_FIXES.md, commit 6edf6dc on dev

**Root cause:** Users arriving via email-verify → name-capture → login (Group 1 flow)
created accounts via `createAccountFromVerifiedEmail()` which did NOT record ToS
acceptance. When they later tried to access `/apply/*`, the middleware gate found no
`terms_acceptance` row and redirected to `/terms-required` — which was a dead-end page
with two useless buttons ("Read Terms of Service" → /terms, "Return to signup" → /signup).

**Part A — `/terms-required` page rewritten (src/app/terms-required/page.tsx):**
- Full client component with scroll-to-accept UI matching signup page pattern
- Scrollable terms summary box (240px height) with ToS key points
- Checkbox disabled until user scrolls to bottom (hasScrolledTerms state)
- Accept button POSTs to `/api/auth/accept-terms`, then redirects to `?next` param
- Uses `useSearchParams()` to read destination (defaults to `/apply/module1`)
- Wrapped in `<Suspense>` for Next.js searchParams compatibility
- "Read full Terms of Service" link + "← Back to dashboard" link
- Obsidian Gold design: #0a0a0a, #C9A84C, Cormorant Garamond, zero border-radius

**Part B — Middleware `?next` param (src/middleware.ts line 144-147):**
- Terms gate redirect now preserves the original destination via `?next=<pathname>`
- Before: `return NextResponse.redirect(new URL('/terms-required', req.url))`
- After: passes `next` search param so terms-required page can redirect correctly

**Part B — ToS recorded at account creation (src/app/actions/create-account.ts):**
- Added step 4: `terms_acceptance` upsert after profile creation, before sign-in
- Uses service-role supabase client (existing pattern)
- `onConflict: "user_id,terms_version"` for idempotency
- This prevents the gap from ever occurring again for new signups

**Files changed:**
- src/app/terms-required/page.tsx — rewritten (328 lines)
- src/middleware.ts — 1 line change (terms gate redirect)
- src/app/actions/create-account.ts — 8 lines added (step 4)

### Build
Clean — zero errors. Verified via `npm run build` and `npx tsc --noEmit`.

### Grep sweep
Full codebase sweep confirmed: all ToS references accounted for — 3 entry points
(signup, email-verify, terms-required page), 1 API endpoint, 1 middleware gate.
No orphaned references or missing paths.

---

## SESSION — Terms-Acceptance Backfill + Scroll Fix (June 12, 2026)

### Completed

**Root cause:** `terms_acceptance` table was empty for ALL pre-existing users.
The 3 accounts (ocdeployments@gmail.com, ocdeployments+e2go@gmail.com,
michael.chen.test@e2go-uat.com) were created before Group 15 added the
terms upsert to `createAccountFromVerifiedEmail()`. Middleware gate redirected
every `/apply/*` visit to `/terms-required` — correct behavior, but the
scroll-to-accept page had a dead-end bug.

**Fix 1 — Database backfill (3 rows):**
Inserted `terms_acceptance` rows for all 3 existing users via Supabase REST API
(service role). All at `terms_version: '1.0'`.

| user_id | email | Row ID |
|---|---|---|
| d654c937-d780-4e30-9388-5bfcd080c2d2 | ocdeployments@gmail.com | 7c87d177-... |
| 6e2f076e-5d04-4dbf-b65b-39706f034d68 | ocdeployments+e2go@gmail.com | 7205ff7c-... |
| a2b8f8c3-5f92-4b1d-863b-275648a74b4d | michael.chen.test@e2go-uat.com | 80436600-... |

**Fix 2 — Scroll detection dead-end (src/app/terms-required/page.tsx):**
Added `useEffect` (lines 18-22) that checks `el.scrollHeight <= el.clientHeight`
on mount. If content fits without scrolling, sets `hasScrolledTerms = true`
immediately — nothing to scroll = implicitly "read". Prevents the checkbox
from being permanently disabled when terms summary is short.

**Middleware gate confirmed sound:** Redirects only when no
`terms_acceptance` row exists for `user_id + terms_version`. No additional
conditions. No change needed.

**Other account-creation paths checked:** Only 2 paths exist —
signup page (writes terms via API call) and
`createAccountFromVerifiedEmail` (writes terms via direct upsert).
No OAuth callbacks, no admin creation tools, no gaps.

### Build
Clean — 47 routes compiled. TypeScript: zero app-level errors.
Pre-existing test file errors in `tests/security/webhook.spec.ts` (Playwright
imports) — unrelated.

---

## SESSION — Walsh and Pollard Citation Fix (June 12, 2026)

### Completed — incorrect legal citation removed and replaced

Session file: docs/sessions/SESSION_CITATION_FIX_WALSH_POLLARD.md

**Live prompt file fixed:**
- `prompts/v1/documents/cover_letter.md` line 226 — "Reference Walsh and Pollard standard (Matter of Walsh and Pollard, 8 I&N Dec. 288)" → "State the proportionality percentages (investment as % of total enterprise cost, investment as % of net worth) per 9 FAM 402.9-6(D)"

**Spec file fixed:**
- `docs/Spec3_Generation_Prompts.md` line 353 block — Substantiality Memorandum template: removed `[If Walsh & Pollard satisfied:]` conditional and citation, replaced with 9 FAM 402.9-6(D) proportionality language
- `docs/Spec3_Generation_Prompts.md` line 430 block — Standalone Substantiality Memorandum: removed citation and legal framing, replaced with 9 FAM 402.9-6(D) language

**Documentation files fixed:**
- `docs/E2_Engine_Knowledge_Base_June3_2026.md` line 64 — "Walsh & Pollard standard" → "Proportionality ... per 9 FAM 402.9-6(D)"
- `docs/E2_Engine_Knowledge_Base_June3_2026.md` line 775 — "Walsh & Pollard status" → "9 FAM 402.9-6(D) proportionality context"
- `docs/Document_Generation_Standards.md` line 235 — "Walsh & Pollard cited by name" → "referencing 9 FAM 402.9-6(D)"

**Dead files deleted (6):**
- `prompts/v1/documents/cover-letter.md` (hyphenated — dead)
- `prompts/v1/documents/cover-letter-v1.md` (dead)
- `prompts/v1/documents/investment-proof.md` (dead)
- `prompts/v1/documents/source-of-funds.md` (dead)
- `prompts/v1/documents/business-plan.md` (dead)
- `prompts/v1/documents/ds160-reference.md` (dead)

**Final grep check:** Zero matches for "8 I&N Dec", "Walsh and Pollard", or "Walsh & Pollard" in any live file. Remaining references are: Spec1_Analysis_Engine.md (variable name only, no citation text), Spec3 FORBIDDEN block (negative instruction), session documentation files.

**Flagged for future session:** Document_Generation_Standards.md "conclusion stated as a legal finding" vs Spec3's forbidden-conclusions instruction — unresolved, noted only.

### Build
Clean — zero errors. TypeScript: zero app-level errors (pre-existing Playwright test errors only).

---

### June 13, 2026 — Session 7: Three-Layer Experience/Framing Pipeline

Session file: docs/sessions/SESSION7_DUAL_LAYER_FRAMING_PIPELINE.md

**Scope:** Build three-layer reliability model for experience qualification framing:
Layer 0 (targeted follow-up questions), Layer 1 (structured scoring + AI framing),
Layer 2 (hardened generation prompt with standing backstop).

**Files Created:**
- `src/lib/business-operational-needs.ts` — 12 franchise categories with operational demands
- `src/lib/__tests__/experience-pipeline-fixtures.ts` — 5 synthetic test fixtures

**Files Modified:**
- `src/lib/analysis-engine.ts` — loadApplicationAnswers() real DB queries, 9 pure dimension scorer functions, calculateExperienceScore() real scoring, generateFramingDecisions() via OpenRouter, assembleCaseBrief() uses real scoring
- `src/app/api/followup/generate-questions/route.ts` — fixed business-type lookup (Q0-business-type + quiz_sessions fallback), added targeted experience-gap question for WEAK/CRITICAL scores
- `prompts/v1/documents/qualifications.md` — added Layer 1 framing interpolation + standing backstop instruction
- `docs/Spec3_Generation_Prompts.md` — updated Document 1 Section II to match prompt changes

**Step 0:** Follow-up question generator now finds business type via Q0-business-type key and quiz_sessions table fallback. Adds one targeted experience-gap question when experience is WEAK or CRITICAL, using operational-needs table. Stays within Spec2's 8-question cap.

**Step 1:** business-operational-needs.ts — 12/12 franchise categories covered. Each has 4-6 operational demands with labels and descriptions. Handles common ID variations.

**Step 2:** loadApplicationAnswers() queries: answers, followup_responses, content_signals_json, quiz_sessions, case_briefs. 9 dimensions scored via pure keyword-matching functions. N/A handling for caregiving/technical by business category.

**Step 3:** generateFramingDecisions() — real OpenRouter call (deepseek/deepseek-chat, temp 0.3). Graceful degradation: empty/failed → proceeds, doesn't block generation.

**Step 4:** framing_decisions.experience persisted in case_briefs JSON.

**Step 5:** Generation prompt hardened — Layer 1 output interpolated into CREATIVE FRAMING INSTRUCTION. Standing backstop instruction always present with operational-needs data. Hardcoded caregiving example removed.

**Step 6:** All 5 fixtures pass:
- Fixture 1 (retail→retail): ADEQUATE, 3/7 confirmed (direct_industry, management, sales_customer)
- Fixture 2 (banking→education): WEAK, 1/7 confirmed (management)
- Fixture 3 (warehouse→cleaning): CRITICAL, 0/7 confirmed
- Fixture 4 (parent→home care): WEAK, 1/8 confirmed (caregiving)
- Fixture 5 (recent grad→IT): CRITICAL, 0/8 confirmed — graceful handling confirmed

**Build:** Clean ✅ — zero errors
**Known limitations:** transferable_skills_identified dimension always ABSENT (intentional — requires framing-decisions output); franchise_training_offset requires CONFIRMED (not PARTIAL); scoring is keyword-based (edge cases with unusual phrasing noted as future work)

---

### June 13, 2026 — Session 8: Cover Page Data Source Fix

Session file: docs/sessions/SESSION8_COVER_PAGE_DATA_FIX.md

**Scope:** Fix cover page rendering bracket placeholders instead of real customer data. The download route queried `applications.personal_info` (JSONB column that doesn't exist), causing every cover page to show `[Applicant name from Tab A]` instead of real data.

**File Modified:**
- `src/app/api/generate/download/[applicationId]/route.ts` — replaced personal_info JSONB query with real column queries

**Field mapping:**
| Cover page field | Source |
|---|---|
| applicantName | `applications.principal_name` |
| businessName | `applications.business_name` |
| nationality | `quiz_sessions.result_json.country` |
| passportNumber | Not collected — bracket placeholder remains correct |
| preparedDate | `now()` at generation time |

**Build:** Clean ✅ — commit 6da0f6d

---

### June 13, 2026 — Session 9: Post-Generation Package Summary

Session file: docs/sessions/SESSION9_PACKAGE_SUMMARY_SCORE.md

**Scope:** Post-generation summary screen on `/documents/[applicationId]` showing package strength, gaps, suggestions, and disclaimer. NOT the existing pre-generation `/score` page — a NEW permanent section shown after documents are generated.

**Files Created:**
- `src/components/PackageSummary.tsx` — 5-section summary component
- `src/app/api/generate/case-brief/[applicationId]/route.ts` — API route for case brief data
- `src/lib/__tests__/package-summary-verification.ts` — logic verification (Chen + Fixture 5)

**File Modified:**
- `src/app/documents/[applicationId]/page.tsx` — integrated PackageSummary

**5 Sections:**
1. Package Strength Overview — 6-dimension score bars with Obsidian Gold badges
2. What's Strong — STRONG/ADEQUATE dimensions
3. Where the Package May Need More — WEAK/CRITICAL with plain-language, experience-specific framing
4. What Could Help — actionable suggestions with /apply/* edit links
5. Mandatory Disclaimer — extends Spec1 pattern

**Bonus:** Section 5.5 — Areas Officers May Ask About (denial risk awareness)

**Verification:** 16/16 checks passed — Chen experience NOT flagged, Fixture 5 experience correctly surfaced, zero denial-prediction language

**Decision:** Permanent section (not one-time gate) — revisitable after edits, non-blocking, feedback loop

**Build:** Clean ✅

---

### Session 10 — Closeout: Remaining Minor Gaps from Sessions 7-9

**Scope:** Cleanup items surfaced during Sessions 7-9 reviews. Live framing call test, denial language review, Chen franchise_training_offset verification, TODO/placeholder scan.
Session file: docs/sessions/SESSION10_CLOSEOUT.md

**Items completed:**
- Live end-to-end test of Layer 1's framing call (Fixture 3, Fixture 5)
- Section 5.5 denial-language audit confirmed clean
- Chen franchise_training_offset verified correct per spec
- TODO/placeholder scan across Sessions 4-9 code

**Build:** Clean ✅

---

### Session 11 — Ask E2go: Public AI Q&A Widget

**Scope:** Public, unauthenticated AI-powered Q&A widget. 355 Q&A pairs embedded via pgvector, 3-layer retrieval (corpus → KB → model), streaming responses, rate limiting.
Session file: docs/sessions/SESSION11_ASK_E2GO_FAQ.md

**Files Created:**
- `src/components/landing/FaqWidget.tsx` — streaming Q&A widget component
- `src/app/api/faq/ask/route.ts` — API route with 3-layer retrieval
- `supabase/migrations/20260613200000_faq_pgvector_tables.sql` — pgvector tables
- `scripts/seed-faq-corpus.ts` — 355 Q&A pairs seed script
- `scripts/seed-faq-kb-chunks.ts` — KB chunks seed script
- `src/lib/faq-system-prompt.ts` — system prompt for FAQ generation
- `src/lib/rate-limit.ts` — Upstash rate limiting for FAQ endpoint

**Key decisions:**
- Model: `xiaomi/mimo-v2.5` via OpenRouter (OPENROUTER_API_KEY)
- 3-layer retrieval: pgvector cosine similarity → broader KB → model fallback
- Rate limit: 10 requests/minute per IP (Upstash Redis)
- Landing page placement: bottom section, soft quiz CTA after each answer

**Build:** Clean ✅

---

### Session 12 — Login Transition Flicker + Simulator Gating UX

**Scope:** Two independent UX fixes — login submit flicker and simulator nav link gating explanation.
Session file: docs/sessions/SESSION12_LOGIN_AND_SIMULATOR_UX.md

**Item 1 — Login flicker fix:**
- Full-panel loading state replaces slider + form immediately on submit
- Loading persists through auth call → redirect
- Error state reverts to form with error message

**Item 2 — Simulator teaser page:**
- `/simulator` without case file data shows teaser with two paths
- "Complete your case file" → /apply
- "Upload your documents instead" → /simulator/quick-start
- Gating logic per IDEAS.md 12G unchanged

**Files Modified:**
- `src/app/login/page.tsx` — loading state on submit
- `src/app/simulator/page.tsx` — teaser screen for no-data state

**Build:** Clean ✅

---

### Session 13 — Account ↔ Chen Application Linkage Investigation

**Scope:** Investigation into why owner's logged-in account couldn't see Chen's application data.
Session file: docs/sessions/SESSION13_ACCOUNT_LINKAGE_INVESTIGATION.md

**Finding:** Account linkage issue identified and investigated. Application ownership via `applications.user_id` confirmed working correctly. Issue traced to account/email mismatch.

**Build:** Clean ✅

---

### Session 14 — Standalone Simulator: Document Upload → Parse → Interview

**Scope:** Extend standalone simulator ($197) to work WITHOUT completed case file by reusing existing document extraction engine.
Session file: docs/sessions/SESSION14_STANDALONE_SIMULATOR_UPLOAD.md

**Files Created:**
- `src/app/simulator/quick-start/page.tsx` — standalone intake UI
- `src/app/api/simulator/quick-start/route.ts` — creates minimal application + saves business category
- `src/app/api/simulator/save-extraction/route.ts` — saves extracted fields as answers
- `supabase/migrations/20260613240000_simulator_quick_start_tables.sql` — application_documents + document_discrepancies tables

**Files Modified:**
- `src/lib/simulator-engine.ts` — fallback chain: application columns → answers map → defaults
- `src/app/simulator/page.tsx` — standalone app detection, teaser CTA

**Key decisions:**
- Reuses existing extraction engine (POST /api/documents/extract) — no rebuild
- `source='simulator_standalone'` on applications table
- Business category saved as Q0-10 answer for simulator to read from answers map
- `.maybeSingle()` used instead of `.single()` to prevent 406 on empty results

**Build:** Clean ✅

---

### Session 15 — Merge Ask E2go Widget into /learn Page

**Scope:** Move FAQ widget from homepage bottom (too easy to miss) to /learn page (education hub — natural home).
Session file: docs/sessions/SESSION15_MERGE_FAQ_INTO_LEARN.md

**Files Modified:**
- `src/app/learn/page.tsx` — widget added above article grid
- `src/app/HomeClient.tsx` — widget replaced with soft CTA section

**Build:** Clean ✅

---

### Session 16 — FAQ Widget: Ambient/Active Feel + Thinking Indicator

**Scope:** Two visual fixes — widget looks static/inert at rest, no feedback during streaming wait.
Session file: docs/sessions/SESSION16_FAQ_WIDGET_ACTIVE_STATE.md

**Files Modified:**
- `src/components/landing/FaqWidget.tsx` — animated gradient border at idle, thinking indicator during stream

**Key decisions:**
- Reuse existing animated gradient border component (pricing card pattern)
- Slow ambient speed (12-15 range) for idle state
- Thinking state uses same gold pulse, not generic chatbot dots

**Build:** Clean ✅

---

### Session 17 — /learn Page Order Fix + Widget Streaming Layout Jump

**Scope:** Widget must be first thing on /learn; streaming answer causes container jump.
Session file: docs/sessions/SESSION17_LEARN_ORDER_AND_LAYOUT_JUMP.md

**Files Modified:**
- `src/app/learn/page.tsx` — widget moved above hero heading
- `src/components/landing/FaqWidget.tsx` — min-height reservation for streaming

**Build:** Clean ✅

---

### Session 18 — FAQ Widget: Scrollable Answer Container

**Scope:** Session 17's min-height approach didn't fully resolve jumping. Owner requested fixed-height scrollable container.
Session file: docs/sessions/SESSION18_SCROLLABLE_ANSWER_CONTAINER.md

**Files Modified:**
- `src/components/landing/FaqWidget.tsx` — max-height with overflow-y-auto, auto-scroll to bottom during streaming

**Build:** Clean ✅

---

### Session 19 — Commit Audit & Push Cleanup

**Scope:** Audit uncommitted work from Sessions 14-18, organize into logical commits, push to origin/dev.
Session file: docs/sessions/SESSION19_COMMIT_AUDIT_AND_PUSH.md

**Outcome:** All Sessions 14-18 changes committed and pushed. Migration filename collision check (Session 11/14) — distinct filenames confirmed, no overwrite.

**Build:** Clean ✅

---

## SESSION LOG (Prior sessions)

### June 5, 2026 — Session: End-to-End Payment Test
- **Task:** Test complete payment flow from quiz to Module 1
- **Finding:** Stripe integration code is complete and correct
- **Issue:** payments table migration exists but not applied to Supabase
- **Action needed:** Apply `20260605110625_payments_table.sql` migration
- **Result:** Code ready, infrastructure needs migration run

### June 8, 2026 — Session S28
- **updateJob() error handling**: Added const { error } = ... with console.error in generation-engine.ts
- **keystatic/ folder removed**: Was causing build failure (route conflict)
- **Backend verification**: Approval gate works correctly on fresh jobs
- **Visual E2E test**: Blocked by auth requirement — generate page requires authenticated Supabase session; needs manual browser test
- **Build**: Clean — 66 routes compiled, 0 errors

### June 6, 2026 — Session S27
- **Completed Module 1**: Onboarding, consent, application record creation
- **Completed Module 2**: Business advisor, category selection, referral trigger
- **Database migrations**: consent_log, referral_consents, experience_gap_flag, business_shortlist
- **Design**: Strict Obsidian Gold compliance
- **E2E test**: Module 1 → Module 2 → Module 3 verified

### June 6, 2026 — Session S26
- Cookie consent banner with localStorage persistence
- Route-level SEO metadata across all pages
- Created /about page with 3-section copy
- Replaced /learn stub with 6-card grid to educational sub-pages
- Fixed Next.js runtime and ESLint errors
- Added curl/browser tests, production build clean (53 routes)

### June 6, 2026 — Session S24
- Complete site navigation audit (33 routes)
- Rewrote Nav.tsx and Footer.tsx
- Implemented mobile hamburger menu with gold accents
- Fixed orphaned pages with CTAs
- Created Breadcrumb component
- Built stub pages: /privacy, /terms, /about, /settings

### June 6, 2026 — Session S23
- U.S.-themed image slider on /login, /signup, /verify
- 4 images, 5s auto-advance, 1000ms crossfade
- Split-screen layout with Obsidian Gold styling
- curl/browser verified

### June 5, 2026 — Session S22
- Document generation blur-lift reveal animation
- Installed motion library (v12.40.0)
- curl/browser test verifies 6 document cards render with blur overlays

### June 5, 2026 — Session S16-S18
- Interview Simulator spec
- Compliance Calendar spec
- Renewal Module spec

### June 5, 2026 — Session S11
- Analysis Engine + Confidence Score Integration
- Score sync reads from case_briefs table

### June 5, 2026 — Session S10
- Tab B / Tab L shared document overlap fix with CrossTabNote component

### June 5, 2026 — Session S9
- Timeline service with two date concepts (working_target_date vs confirmed_interview_date)

### June 5, 2026 — Sessions S6-S8
- Business data deduplication between tabs
- Security history pre-fill with legal confirmation gate

### June 9, 2026 — Results Page Benefits Section
- Personalised E-2 benefits section added to results page (between flags and timeline)
- getBenefits() prioritises spouse/children based on quiz dependents answer
- 2x2 grid desktop, 1 column mobile via CSS media query
- Design: Obsidian Gold tokens, ◈ diamond icon, no rounded corners
- Commit: 6b8057c

---

## DEFERRED RISKS (Accepted, pending dedicated sessions)

### Next.js 14 → 16 upgrade required
- **Current version:** `next@14.2.35` (pinned via `^14.0.0` in package.json)
- **Vulnerability:** HIGH severity — affects `9.3.4-canary.0` through `16.3.0-canary.5`
  - Includes: DoS via Image Optimizer, HTTP request smuggling, unbounded disk cache,
    server-side request forgery, cache poisoning, XSS via CSP nonces
- **Fix available:** `next@16.2.9` — but this is a **major version bump** (14 → 16)
- **No patch exists in the 14.x line** — `npm update` and `npm audit fix` cannot resolve
- **Blocking packages:** `eslint-config-next` and `@next/eslint-plugin-next` also stuck at
  14.2.35 (transitive `glob` vulnerability, fix requires 16.x)
- **Risk accepted:** June 12, 2026. Upgrade requires dedicated session with full
  regression testing — breaking changes in Next.js 15+ (Turbopack default, async
  request APIs, config changes). Not a cleanup-task bundle.

### xlsx (SheetJS) — no fix available
- **Package:** `xlsx@^0.18.5`
- **Vulnerability:** HIGH — Prototype Pollution + ReDoS
- **Fix available:** No. All versions affected, no patched release.
- **Usage:** `src/lib/text-extraction.ts` — reads uploaded XLSX spreadsheets via
  `XLSX.read(buffer, { type: 'buffer' })`, converts to CSV via `XLSX.utils.sheet_to_csv(sheet)`.
  User-facing through document upload flow (`/api/documents/extract`).
- **Risk accepted:** June 12, 2026. Input is user-uploaded files (not untrusted web content).
  Prototype pollution requires crafted XLSX with malicious prototype chain.
  ReDoS requires cell content matching backtracking patterns.
  Consider replacing with `exceljs` or `openpyxl`-style parser in future session.

---

## NEXT SESSION PRIORITIES (Updated June 13, 2026)

### ~~Priority 1 — S15: Document Package Download~~ ✅ COMPLETE
### ~~Priority 2 — Session 7: Three-layer experience/framing pipeline~~ ✅ COMPLETE
### ~~Priority 3 — Session 8: Cover page data fix~~ ✅ COMPLETE
### ~~Priority 4 — Session 9: Post-generation package summary~~ ✅ COMPLETE

### Priority 1 — End-to-end payment test
Full flow: quiz → pricing → checkout (4242 4242 4242 4242) →
dashboard → /apply → Module 3 → Generation → Download
Test applicant: Michael James Chen
UUID: 9f981747-e3e4-4941-9f86-9871f8117b66
Use SKIP_PAYMENT_WALL=true in .env.local for generation test
Chen data wiped and reseeded (June 12) — clean, internally-consistent
investment figures ($185K). Ready for fresh generation run.

### Priority 2 — Generation engine fixes
File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
Three known issues: approval gate, setState violation, empty boxes

### Priority 3 — Bracket highlighting regex + checklist builder
Regex currently only matches `[BRACKET FORMAT]...[/BRACKET FORMAT]`
but documents use descriptive brackets like `[passport number]`.
Checklist builder has same regex mismatch (shows 0 items).

### Priority 4 — Owner action items
- Check Resend dashboard: e2go.app domain verified? If yes, revert sender
- Run Group 10 RLS SQL queries and share results

### Future sessions (after first paying user)
- Admin dashboard — user management, payment history
- Support ticket system
- Lifecycle tracking throughout app
- Compliance calendar — spec written at docs/COMPLIANCE_CALENDAR_SPEC.md
- Renewal module — spec written at docs/RENEWAL_MODULE_SPEC.md

---

## KNOWN ISSUES (Updated June 13, 2026)

1. **Generation engine: approval gate, setState, empty boxes** — MEDIUM
   File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
2. **Resend sender** — e2go.app domain verification status unknown.
   Check Resend dashboard. If verified, revert to results@e2go.app.
3. **RLS investigation pending** — quiz_sessions anon INSERT behavior
   unexplained. Run SQL queries in Group 10 and share results.
4. **Bracket highlighting regex + checklist builder** — MEDIUM
   Regex only matches `[BRACKET FORMAT]...[/BRACKET FORMAT]` but
   documents use descriptive brackets like `[passport number from Tab A]`.
   Checklist builder shows 0 items due to same mismatch.
5. **Quiz nationality selector** — curl/browser difficulty, works in browser
6. **Fast Refresh errors** — Occasional hot reload (non-blocking)
7. **Stripe API version outdated (2024-06-20)** — LOW
   Upgrade apiVersion in scripts/stripe-setup.ts when convenient
8. **Supabase CLI migration history out of sync with remote** — MEDIUM
   `supabase migration list` shows only 2 of 24 migrations as applied, while ~22 were applied
   manually via SQL Editor over the past week. `npx supabase db push` reports 'up to date'
   even when new migration files exist. Reconcile in a dedicated session before relying on
   db push again — do not assume db push has applied anything without verifying via REST/SQL Editor.

---

### June 12, 2026 — Session: Generation Pipeline Steps 11-14 (Spec4 Quality Gate)

**Scope:** Enhanced Steps 11-14 of the generation pipeline per Spec4_Quality_Gate_Pipeline.md

**Files Created:**
- `supabase/migrations/20260611190000_generation_pipeline_log.sql` — Pipeline audit log table
- `src/app/api/generate/acknowledge/route.ts` — Pre-download acknowledgment API
- `src/components/AcknowledgmentGate.tsx` — 5-checkbox acknowledgment UI

**Files Modified:**
- `src/lib/generation-engine.ts` — Enhanced Steps 11-14:
  - Step 11: Spec4 humanization prompt (AI vocabulary replacements, voice profile injection), retry loop with AI detection feedback (max 3 attempts, threshold 0.35)
  - Step 12: Added pipeline_log writes for Stage 6 (metadata sanitization)
  - Step 13: Added REQUIRED_ELEMENTS completeness check per doc type, CONSISTENCY_FIELDS cross-doc validation, pipeline_log writes for Stages 4-5
  - Step 14: Added pipeline_log writes for Stages 1-3, 2, initial pipeline_log entries at pipeline start
- `src/app/generate/[applicationId]/page.tsx` — Integrated AcknowledgmentGate into completion state

**Pending:** None

**Build:** Clean ✅ | **TypeScript:** Clean ✅
**Migration:** Applied via SQL Editor ✅ | **E2E Test:** Write path verified ✅

---

### June 12, 2026 — Session: Retry Loop + Job Completion Status Fix

**Scope:** Two confirmed bugs blocking any successful generation run
Session file: docs/sessions/SESSION_RETRY_LOOP_JOB_STATUS_FIX.md

**Bug A — Humanization retry loop exits after 1 attempt, not 3:**
- Root cause: Step 14 hardcoded `stage3_attempts: 1` in pipeline_log regardless of actual humanization attempts; quality gate failures weren't checked within the humanization loop (Step 11); Step 10's AI detection score updated DB only, not the local `generatedDocs` array
- Fix: Added `humanizationState` Map to track actual attempts and final score per document in Step 11; Step 14 reads from this map for `stage3_attempts` and `stage3_detection_score`; humanization loop now runs `runQualityGate()` after each attempt and combines AI detection + quality gate failures into retry feedback; quality gate check happens within the humanization loop, not just after

**Bug B — Job never transitions to `status: 'completed'`:**
- Root cause: No `updateJob({ status: 'completed' })` call existed after Step 15
- Fix: After Step 15, queries `generation_pipeline_log` for all documents' `final_status`. Sets job to `'completed'` if all documents passed quality gate, `'partial'` if 1+ documents have `final_status: 'FAILED'`. Always sets `completed_at` timestamp.

**Files modified:**
- `src/lib/generation-engine.ts` — humanization loop (Step 11), pipeline_log update (Step 14), job completion (after Step 15)

**Status values used:**
- `'completed'` — pipeline ran to end, all documents passed quality gate
- `'partial'` — pipeline ran to end, 1+ documents failed quality gate (need attention)
- Both set `completed_at` timestamp so frontend can distinguish "still running" from "done"

**Build:** Clean ✅ | **TypeScript:** Clean ✅

---

### June 12, 2026 — Session: Chen Application Wipe and Reseed

**Scope:** Database-only — wipe contaminated test data, reseed with clean internally-consistent figures
Session file: docs/sessions/SESSION_WIPE_RESEED_CHEN.md

**Application UUID preserved:** `9f981747-e3e4-4941-9f86-9871f8117b66` (Michael James Chen)

**Tables wiped (all rows for this application_id):**
- `answers` — 27 rows deleted
- `generated_documents` — 6 rows deleted
- `generation_pipeline_log` — 6 rows deleted
- `document_generation_jobs` — 1 row deleted (stuck "running" job)
- `case_briefs` — 1 row deleted
- `payments` — 1 row deleted (old $297 test payment)
- `document_generation_log` — 79 rows deleted

**Fresh data inserted:**
- `answers` — 27 rows: 3 corrected (QF-05 source-of-funds, QH-02 timeline, QJ-03 employment dates), 24 unchanged
- `case_briefs` — 1 row: investment=$185,000, consistent breakdown, source_of_funds=$110K savings + $75K property
- `applicant_voice_profile` — 1 row: 295-word writing sample, AI detection score 0.15
- `followup_responses` — 3 rows: source_of_funds, business_experience, non_immigrant_intent

**Arithmetic verified:**
- Investment breakdown: $1K + $48K + $22K + $18K + $15K + $10K + $71K = $185K ✅
- Source of funds: $110K + $75K = $185K ✅
- No stale figures ($125K, $175K) found anywhere

**Investment figure consistency check:**
- $185,000: QA-56, QF-02, QF-03, case_brief_json — consistent ✅
- $143,600: case_brief_json non_marginality only (Year 3 net income, not investment) ✅
- No conflicting investment amounts across any table

**Build:** Clean ✅

**Flagged (not fixed):** Year 3 net income ($143,600) could collide with investment total in naive consistency checks that grep for dollar amounts without distinguishing field semantics. If the quality gate's consistency checker compares `investment_amount_usd` against `projected_net_income_y3`, it would flag a false mismatch. Separate bug if it occurs.

**Next:** Owner navigates to `/generate/9f981747-...` to trigger fresh generation — first test of citation fix + retry loop fix + job completion status fix + clean data, together.

---

### June 13, 2026 — Session: Recovery, Download Test, Consistency-Checker Fix

Session file: docs/sessions/SESSION_RECOVERY_DOWNLOAD_AND_FIX.md

**Piece 1 — Content Recovery:** 4 documents (cover_letter, source_of_funds, investment_proof, qualifications) had content_text overwritten with AI refusals by Step 13's re-prompt. Good content was preserved in content_json.full_text. Performed direct database swap (UPDATE content_text = content_json->>'full_text'). All 6 documents now contain real, substantive content.

**Piece 2 — Download/.docx Test:** Built all 6 .docx files + checklist + ZIP against real recovered content. Findings:
- Formatting: PASS (Times New Roman 12pt, 1-inch margins, 1.5 spacing, Roman numeral headers correctly styled as Heading1 bold 14pt)
- Header/footer: PASS (correct format, centered, 9pt gray)
- Bracket highlighting: DOES NOT FIRE — regex matches `[BRACKET FORMAT]...[/BRACKET FORMAT]` but documents use descriptive brackets like `[passport number from Tab A]`
- Markdown table → Word table: DOES NOT CONVERT — investment_proof table renders as literal text
- Checklist: INCORRECTLY EMPTY — finds 0 items due to same bracket regex mismatch
- Metadata: CLEAN (no e2go/AI branding)
- Gate: Would 403 (all documents have applicant_acknowledged=false, final_status≠RELEASED)

**Piece 3 — Consistency-Checker Fix:** Replaced broken CHECK 2 in generation-engine.ts (lines 657-671). Old logic extracted ALL dollar amounts and flagged any 50-150% of investmentTotal that differed >10% — causing false failures on legitimate line-items. New logic only checks that the total investment figure ($185,000) appears in the document. Build clean.

**Flagged (not fixed — follow-up items):**
1. Bracket highlighting regex needs widening to match descriptive `[text]` brackets
2. Checklist builder needs same regex fix
3. Markdown table → Word table conversion needed for investment_proof
4. Acknowledgment gate (Step 14) was never reached — needs live re-run to test full flow

**Next:** Live re-run of generation pipeline to confirm documents pass quality gate without false re-prompts. Then address bracket highlighting + checklist regex as separate session.

---

### June 13, 2026 — Session 4: Package Assembly (Cover Page, TOC, Dividers, ZIP Rewire)

**Scope:** Add package-level presentation files to the document ZIP — cover page, table of contents, tab dividers, renamed documents. Per SESSION4_PACKAGE_ASSEMBLY.md spec.

**Files Created:**
- `src/lib/docx-package-constants.ts` — shared constants (DOC_TYPE_TAB_MAP, TAB_SECTION_TITLES, TAB_ORDER)
- `src/lib/docx-cover-builder.ts` — cover page builder (Century Schoolbook, centered layout, no page number)
- `src/lib/docx-toc-builder.ts` — table of contents with dot-leader → filename navigation
- `src/lib/docx-divider-builder.ts` — tab divider pages (TAB [X] / title / description / footer)

**Files Modified:**
- `src/lib/docx-builder.ts` — DOC_TYPE_TAB_MAP moved to shared module (imported, not duplicated), buildTextRuns + BRACKET_PLACEHOLDER_REGEX exported
- `src/app/api/generate/download/[applicationId]/route.ts` — full rewrite: now builds 15-file ZIP (cover, TOC, 6× divider+doc, checklist); fetches business_name, target_state, personal_info for cover page; renames docs to Tab_[X]_[Name].docx
- `src/lib/checklist-builder.ts` — added package intro paragraph listing all included tabs; accepts applicantName + includedTabs options

**ZIP file count:** 15 files (1 cover + 1 TOC + 6 dividers + 6 docs + 1 checklist)

**Build:** Clean ✅ — zero errors, zero new warnings

---

### June 15, 2026 — Session 20: Simulator Enhancement (DBA Naming, Dossier Redesign, TTS Migration, Tier Separation)

**Scope:** Deep simulator work across eight concerns — all build-verified.

**1. DBA/Franchise naming fix**
- `src/types/simulator.ts` — added `operatingName: string | null` to `SimulatorContext`; made `targetState: string | null` (was non-nullable)
- `src/lib/simulator-engine.ts` — populates `operatingName` from QF-09/M3-F-09; `targetState` falls back to QE-03/M3-E-03 (null if still missing); UQ-01 context string null-guarded

**2. Evaluation prompt DBA clarification**
- `src/app/api/simulator/evaluate/route.ts` — evaluator prompt now includes `businessLine` (legal entity + trade name if they differ) and an explicit instruction not to flag trade-name vs. entity-name divergence as an inconsistency

**3. Case-summary API enrichment**
- `src/app/api/simulator/case-summary/route.ts` — response now includes `operatingName`, `targetState`, `businessCategory` (human-readable label), `investmentAmount` from answers map

**4. Dossier redesign — CaseFileSummary**
- `src/components/simulator/CaseFileSummary.tsx` — full rewrite:
  - Cover page: eyebrow "E-2 CASE FILE", file reference (first 8 hex chars of applicationId), large serif principal name, business line with DBA if different, classification grid (filing type / business category / target state / investment), stat row
  - Documents section renamed "Exhibits — Documents on File"; each document gets a lettered badge (A, B, C...)
  - Information sections prefixed with Roman numerals (I, II, III...) and wrapped in bordered section cards

**5. Gap-resolution flow (new files — untracked)**
- `src/lib/simulator-gaps.ts` — `detectGaps()` identifies missing high-value answers from an application; `submitGapAnswers()` persists them
- `src/components/simulator/CaseGapsForm.tsx` — UI that asks the user for any critical missing fields before proceeding to the interview
- `src/app/api/simulator/case-gaps/route.ts` — GET: returns missing fields for applicationId; POST: saves gap answers
- `src/app/simulator/case-file/page.tsx` — integrated CaseGapsForm as a pre-step before CaseFileSummary

**6. TTS migration — playai-tts → canopylabs/orpheus-v1-english (Orpheus)**
- `src/app/api/simulator/tts/route.ts` — full rewrite; text chunked to ≤200 chars on sentence boundaries (Orpheus limit); each chunk calls Groq `/audio/speech`; returns `{ audioChunks: string[] }` (base64 mp3 per chunk)
- `src/lib/groq-tts.ts` — `speakQuestion()` now fetches `/api/simulator/tts`, receives chunk array, plays each sequentially via `playAudioChunk()` (resolves on `audio.onended`)
- `src/lib/groq-transcription.ts` — DELETED (obsolete; replaced by server-side voice-status check)
- **Blocker (user action required):** `canopylabs/orpheus-v1-english` returns `400 model_terms_required` until org admin accepts model terms at `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`

**7. Voice-status endpoint + timer/warning display fix**
- `src/app/api/simulator/voice-status/route.ts` — returns `{ available: true/false }` based on whether `GROQ_API_KEY` is set; simulator page fetches this on load
- `src/app/simulator/page.tsx` — voice availability now checked server-side (not from deleted `isGroqConfigured()` client fn); timer countdown and 2-minute warning now only rendered in voice mode (not text mode); error handling added for null application edge case

**8. Tier separation — simulator-only subscribers**
- `src/app/dashboard/page.tsx` — detects `simulatorOnly` (all applications have `source = 'simulator_standalone'`); shows dedicated "Interview Simulator" dashboard (sessions remaining/used, quick actions) instead of the full case-building dashboard
- `src/middleware.ts` — blocks simulator-only users from `/apply`, `/generate/`, `/documents/` routes (redirects to `/dashboard`)

**9. Homepage copy update**
- `src/app/HomeClient.tsx` — headline updated to "Your E-2 Investor Business Plan & Full Application Package"; subhead rewritten to "Consultants give you Zoom calls. Lawyers give you invoices. E2Go gets you Visa Ready."

**Strategic assessment delivered (no code):**
- Simulator scored **4/10** as a $200-300 product; roadmap delivered:
  - Tier 1 (highest value/lowest effort): conversational follow-up questions + document-grounded evaluation
  - Tier 2: objection-practice mode, timing analysis, officer persona variants
  - Tier 3: collaborative prep toolkit, visual aids, comparison reports
- Tier 1 items not yet approved or started — pending user go-ahead

**Build:** Clean ✅ — all 16 changed/new files build without errors

---

## SESSION FILES INDEX

All session files are in docs/sessions/. Prompt for agent: `cat docs/sessions/[filename]`

| File | Purpose | Priority |
|---|---|---|
| SESSION_CASEFILE_REDESIGN.md | Case file UX redesign — two-panel, voice input, all variants | 1 — run now |
| SESSION_PLAN_GENERATION_FIXES.md | Generation engine: approval gate, setState, empty boxes | 2 |
| SESSION_MODULE3_CASEFILE.md | Case file: gap questions, partnership UI, dynamic manifest | 3 |
| SESSION_RESULTS_CLARITY_FIXES.md | Full verification wall + post-cleanup spec (Groups 1-15) | ✅ DONE (Groups 1-15) |
| SESSION_RESULTS_CLARITY_FIXES (2).md | Post-verification-wall cleanup: Groups 1-11 | ✅ DONE (Groups 5-11) |
| SESSION_HANDOFF_JUNE9.md | Login fix, Stripe migration, generation engine fixes, E2E test | Reference |
| SESSION_SIMULATOR.md | Simulator: Groq TTS, transcription, timer, purchase, design fixes | ✅ DONE |
| SESSION_QUIZ_FIXES.md | Quiz UX: family split, partnership, months, back button, review page | ✅ DONE |
| SESSION_QUIZ_FIXES_2.md | Quiz legal accuracy: 9 FAM partnership rules, hard stops | ✅ DONE |
| SESSION_CITATION_FIX_WALSH_POLLARD.md | Walsh & Pollard citation removal + 9 FAM 402.9-6(D) replacement | ✅ DONE |
| SESSION_RETRY_LOOP_JOB_STATUS_FIX.md | Humanization retry loop + job completion status fix | ✅ DONE |
| SESSION_WIPE_RESEED_CHEN.md | Chen application wipe + reseed with clean investment data | ✅ DONE |
| SESSION_RECOVERY_DOWNLOAD_AND_FIX.md | Content recovery, .docx download test, consistency-checker fix | ✅ DONE (all 3 pieces) |
| SESSION7_DUAL_LAYER_FRAMING_PIPELINE.md | Three-layer experience/framing pipeline (Layer 0/1/2) | ✅ DONE |
| SESSION10_CLOSEOUT.md | Remaining minor gaps from Sessions 7-9 (live framing call, denial language, Chen flags) | ✅ DONE |
| SESSION11_ASK_E2GO_FAQ.md | Interactive AI Q&A widget — pgvector, streaming, 3-layer retrieval | ✅ DONE |
| SESSION12_LOGIN_AND_SIMULATOR_UX.md | Login transition flicker fix + simulator gating UX teaser | ✅ DONE |
| SESSION13_ACCOUNT_LINKAGE_INVESTIGATION.md | Account ↔ Chen application linkage investigation | ✅ DONE |
| SESSION14_STANDALONE_SIMULATOR_UPLOAD.md | Standalone simulator document upload → parse → interview | ✅ DONE |
| SESSION15_MERGE_FAQ_INTO_LEARN.md | Merge Ask E2go widget into /learn page | ✅ DONE |
| SESSION16_FAQ_WIDGET_ACTIVE_STATE.md | FAQ widget ambient/thinking states + animated border | ✅ DONE |
| SESSION17_LEARN_ORDER_AND_LAYOUT_JUMP.md | /learn page order fix + widget streaming layout jump | ✅ DONE |
| SESSION18_SCROLLABLE_ANSWER_CONTAINER.md | FAQ widget scrollable answer container | ✅ DONE |
| SESSION19_COMMIT_AUDIT_AND_PUSH.md | Commit audit & push cleanup for Sessions 14-18 | ✅ DONE |
| SESSION20_SIMULATOR_ENHANCEMENT.md | DBA naming, dossier redesign, TTS migration, tier separation | ✅ DONE |

---

## BUILD STATE

- Branch: `dev`
- Last commit: `5122540` — feat: show case file summary on every simulator entry (Session 19 tail)
- `npm run build`: Clean — 49 routes compiled (2 new simulator routes added in Session 20)
- All core features implemented and built
- **Session 20 (June 15, 2026) complete ✅** — DBA naming, dossier redesign, TTS migration, tier separation, gap-resolution flow
  - ⚠️ TTS voice mode blocked pending Groq terms acceptance — see KNOWN ISSUES #9
- Case file UX redesign complete ✅
- Generation pipeline Steps 11-14 enhanced per Spec4 ✅
- generation_pipeline_log table applied via SQL Editor ✅
- Acknowledgment gate E2E test passed ✅
- Chen application wiped and reseeded with clean data ✅
- Session 4 (Package Assembly) complete ✅ — 15-file ZIP with cover, TOC, dividers, renamed docs
- Session 7 (Three-Layer Pipeline) complete ✅ — Layer 0/1/2 experience scoring, framing, backstop
- Session 11 (Ask E2go FAQ) complete ✅ — pgvector 368 Q&A corpus, 3-layer retrieval, streaming widget
- Session 12 (Login + Simulator UX) complete ✅ — flicker fix, simulator teaser
- Session 14 (Standalone Simulator Upload) complete ✅ — quick-start route, document extraction
- Session 15 (FAQ → /learn merge) complete ✅ — widget on /learn, CTA on homepage
- Sessions 16-18 (FAQ widget polish) complete ✅ — ambient states, thinking indicator, scrollable container
- Session 19 (Commit Audit) complete ✅ — all Sessions 14-18 committed and pushed
- Supabase singleton fix complete ✅ — duplicate GoTrueClient resolved (Sessions 28-30)
- Dashboard + simulator loading states fixed ✅
- Login quiz-session linkage fixed ✅
- Nav on authenticated layouts complete ✅
- Quick-start flow hardened ✅ — missing tables, wrong columns, RLS fixes
- Payments migration applied ✅
- Stripe Price IDs live ✅
- Auth + quiz scoring foundation solid ✅
- Post-verification-wall cleanup complete ✅
- Terms-required dead-end fixed ✅

---

### June 15, 2026 — Bug Fixes: Stripe Price + Dashboard Block + Checkout Redirect

**Scope:** Three bugs surfaced by the June 14 audit and confirmed in test.

**Bug 1 — simulator_3pack charged $197 instead of $29.99:**
- Root cause: `scripts/stripe-setup.ts` had `simulator_3pack` amount as `19700` ($197) — same as standalone simulator. Price ID created at wrong amount.
- Fix 1: `scripts/stripe-setup.ts` — amount corrected to `2999` ($29.99)
- Fix 2: `scripts/fix-simulator-price.ts` created — new Stripe price `price_1Tim5fF7Ggk3LUEy2JGRRKrB` created at $29.99; `.env.local` updated
- ⚠️ OWNER ACTION REQUIRED: Run SQL `UPDATE pricing SET stripe_price_id = 'price_1Tim5fF7Ggk3LUEy2JGRRKrB', amount_cents = 2999 WHERE tier_id = 'simulator_3pack';` in Supabase SQL Editor; update `STRIPE_PRICE_SIMULATOR_3PACK` in Vercel env vars; refund the $197 test charge in Stripe dashboard.

**Bug 2 — Simulator-only users could access /dashboard:**
- Root cause: Middleware blocked `/apply`, `/generate/`, `/documents/` but not `/dashboard`. Worse, the block redirected to `/dashboard` — the very page they should be excluded from.
- Fix: `src/middleware.ts` — added `/dashboard` to blocked routes; all simulator-only blocks now redirect to `/simulator` (not `/dashboard`)

**Bug 3 — Simulator purchases redirected to /pricing/success instead of /simulator:**
- Root cause: `create-checkout/route.ts` ignored `successUrl`/`cancelUrl` from the request body; always used hardcoded `/pricing/success`.
- Fix: `src/app/api/stripe/create-checkout/route.ts` — accepts `successUrl` and `cancelUrl` from body with same-origin validation; simulator purchase now returns to `/simulator?purchase=success`

**Files Modified:**
- `scripts/stripe-setup.ts` — simulator_3pack amount: 19700 → 2999
- `scripts/fix-simulator-price.ts` — NEW: one-shot Stripe price creation script
- `src/middleware.ts` — SIMULATOR_BLOCKED_ROUTES now includes /dashboard; redirect → /simulator
- `src/app/api/stripe/create-checkout/route.ts` — successUrl/cancelUrl accepted from body

**Build:** Clean ✅

---

## UNEXECUTED SESSIONS (referenced in June 14 audit but never built)

These sessions were planned and named in the June 14 audit's "SPECCED BUT NOT YET BUILT" table. The session files were never written and the features were never built.

| Session | Feature | Priority |
|---|---|---|
| SESSION21_INTERVIEW_PREP_KIT | 10-15 interview Q+A pairs with example answers, downloadable PDF | HIGH — product value |
| SESSION22_SENTRY_ERROR_TRACKING | Sentry error tracking + source maps | HIGH — pre-launch ops |
| SESSION23_UPTIME_MONITORING | Uptime monitoring (BetterUptime or similar) | MEDIUM — ops |
| SESSION_INVOICING | Enable Stripe invoice generation on checkout completion — business name, address, tax ID, line item descriptions per tier, PDF emailed to client | HIGH — pre-launch, every paying client needs one |
| MODULE4_FOLLOWUP_UI | Module 4 follow-up conversation UI — spec at docs/Spec2_Followup_Conversation.md | MEDIUM |

These must be written as session files before building.

---

## OWNER MANUAL ACTIONS — PENDING

These cannot be done by code — require owner access to Supabase, Stripe, or console.

| Action | Priority | Notes |
|---|---|---|
| ~~Accept Groq Orpheus TTS terms~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 |
| ~~Update Supabase pricing table: simulator_3pack~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 — price_1Tim5fF7Ggk3LUEy2JGRRKrB / 2999 cents |
| ~~Update Vercel env: STRIPE_PRICE_SIMULATOR_3PACK~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 |
| Refund $197 test charge | 🔴 HIGH | In Stripe dashboard — was a test but was a real charge |
| Check Resend domain verification | 🟡 MEDIUM | Is e2go.app verified? If yes, revert email sender to results@e2go.app |
| Apply migration 004_answers_source_update.sql | 🟡 MEDIUM | Needed for document upload source tracking |
| Run FAQ seed scripts | 🟡 MEDIUM | `npx tsx scripts/seed-faq-corpus.ts` and `npx tsx scripts/seed-faq-kb-chunks.ts` — FAQ widget falls back to LLM-only until done |
| Clean up Chen duplicate applications | 🟡 MEDIUM | `DELETE FROM applications WHERE user_id = 'a2b8f8c3-...' AND id != '9f981747-...'` |
| Clean up ocdeployments blank duplicates | 🟡 MEDIUM | `DELETE FROM applications WHERE id IN ('bd8a9c1a-...', '49afc548-...')` |
| ~~Configure Stripe webhook for production URL~~ | ~~🟡 MEDIUM~~ | ✅ DONE June 16, 2026 |
| ~~Configure Upstash Redis in Vercel env vars~~ | ~~🟡 MEDIUM~~ | ✅ DONE — both UPSTASH_REDIS_REST_URL and TOKEN confirmed set June 16, 2026 |

---

## KNOWN ISSUES (Updated June 15, 2026)

1. ~~**Groq TTS voice mode blocked**~~ — ✅ RESOLVED June 16, 2026. Groq Orpheus terms accepted; audio MIME/format fixed in Session 21.
2. **Generation engine: approval gate, setState, empty boxes** — MEDIUM. File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
3. **Bracket highlighting regex + checklist builder** — MEDIUM. Regex only matches `[BRACKET FORMAT]...[/BRACKET FORMAT]`, not descriptive brackets like `[passport number from Tab A]`. Checklist shows 0 items.
4. **getSession() security warnings** — MEDIUM. Multiple files use Supabase `.getSession()` — Supabase now recommends `.getUser()` instead. Flag in console; not a hard failure but should be swept.
5. **seed-test-applicant.ts grabs current auth user** — HIGH risk if run again. The seed script uses the currently-logged-in user's ID rather than an explicit `user_id` param. Running it again will re-break account linkage. Needs a `--user-id` flag added before next use.
6. **004_answers_source_update.sql not applied** — MEDIUM. Document upload source tracking won't work until this migration is applied.
7. **Supabase CLI migration history out of sync** — MEDIUM. `supabase migration list` shows 2 of 24; ~22 applied manually via SQL Editor. Do not rely on `db push` without verifying via SQL Editor first.
8. **Stripe API version outdated (2024-06-20)** — LOW. Upgrade `apiVersion` in `scripts/stripe-setup.ts` when convenient.
9. **Resend domain verification unknown** — MEDIUM. If `e2go.app` is verified in Resend dashboard, revert sender to `results@e2go.app`.
10. **FAQ corpus not confirmed seeded** — MEDIUM. Session 11 built the scripts and tables; seeds may not have been run. Until run, all FAQ queries hit LLM fallback (Layer 3 only — most expensive, least accurate).
11. **RLS investigation pending** — LOW. quiz_sessions anon INSERT behavior unexplained. Run Group 10 SQL queries in Supabase SQL Editor.
12. **Fast Refresh occasional hot reload errors** — LOW. Non-blocking.

---

## LAUNCH READINESS CHECKLIST

- [ ] Simulator works end-to-end (voice mode unblocked — Groq TTS terms)
- [ ] Payment flow verified end-to-end (Stripe CLI + test card 4242 4242 4242 4242)
- [ ] Sentry error tracking live (Session 22 — not yet built)
- [ ] FAQ widget seeded (run seed-faq-corpus.ts and seed-faq-kb-chunks.ts)
- [ ] Chen's account clean (SQL actions in OWNER MANUAL ACTIONS)
- [ ] All pending migrations applied (004_answers_source_update.sql)
- [ ] npm run build clean on final commit
- [ ] Deploy to production (Vercel, main branch PR)
- [ ] Stripe webhook configured for production URL
- [ ] Upstash Redis env vars in Vercel
- [ ] Attorney review of 3 generated sample packages (not a code task)

---

---

### June 16, 2026 — Session 21: Simulator Audio Fix + Ready Screen + Gap Analysis Architecture

**Scope:** Three immediate simulator fixes + full Gap Analysis architecture planning. No pricing work — deferred to a dedicated session.

#### TTS Audio Fixes (root cause resolved)

**Bug 1 — Complete audio silence (MIME type mismatch):**
- Root cause: `src/lib/groq-tts.ts` presented WAV audio as `data:audio/mp3;base64,` — browsers silently failed to decode
- Fix: Changed to `data:audio/wav;base64,` in `groq-tts.ts`

**Bug 2 — TTS format mismatch:**
- Root cause: `src/app/api/simulator/tts/route.ts` sent `response_format: 'mp3'` but Groq Orpheus only accepts `'wav'`
- Fix: Changed `response_format` to `'wav'`

**Bug 3 — Browser autoplay policy blocking TTS:**
- Root cause: By the time `ConversationalSession` mounted and `useEffect` fired `runIntro()`, multiple async API calls had elapsed since the "Start Voice Interview" click — expiring the browser's gesture trust window for audio
- Fix: Added 'ready' phase. Playing a silent 44-byte WAV synchronously during the "Begin interview" button click permanently unlocks audio for the page session via `document.userActivation.hasBeenActive`

#### Simulator Loading Flicker Fix

- Root cause: Loading guard `if (!sessionInfo)` allowed render to proceed when `hasCaseFile === null` (still resolving), causing StartScreen (voice/text mode buttons) to flash briefly
- Fix: `src/app/simulator/page.tsx` line 430 — guard changed to `if (!sessionInfo || hasCaseFile === null)`

#### Pre-Interview Ready Screen (new phase)

**Files Modified:**
- `src/components/simulator/ConversationalSession.tsx` — complete rewrite adding 'ready' phase:
  - `type Phase = 'ready' | 'intro' | 'questions'` (was `'intro' | 'questions'`)
  - Initial state now `'ready'` (was `'intro'` with auto-start on mount)
  - Pre-session screen: Officer Williams card, "Before we begin" heading, speaker test button, mic test button
  - `handleTestSpeaker()` — calls speakQuestion with test audio + plays silent WAV unlock
  - `handleTestMic()` — requests getUserMedia, sets micTested / micTestError
  - `handleBeginInterview()` — plays silent WAV unlock synchronously, starts session timer, transitions to 'intro' and calls runIntro()
  - Session timer moved OUT of mount useEffect INTO handleBeginInterview (timer now starts when interview actually begins, not when component mounts)
  - Top bar pill: PRE-SESSION / INTRODUCTION / Q N/N — reflects current phase
  - Timer hidden during 'ready' phase (doesn't start eating into 15 minutes on the wait screen)
  - Device check buttons: transparent → gold active → green done states

**Files Modified:**
- `src/app/simulator/page.tsx` — loading guard fix (`hasCaseFile === null`)
- `src/app/api/simulator/tts/route.ts` — `response_format: 'wav'`
- `src/lib/groq-tts.ts` — MIME type `data:audio/wav;base64,`

**Build:** Clean ✅

#### Architecture Planning (no code — decisions logged)

**Gap Analysis module:**
- Three purchasable modules: Simulator | Gap Analysis | Document Generation (standalone or bundled)
- Six E-2 evidence categories with scoring weights: Source of Funds (25%), Management Role (25%), Business Plan (20%), Investment Amount (15%), Employment (10%), Operations (5%)
- Gap Analysis must: score existing evidence → identify gaps → ask for documents before questions → recalculate after remediation
- Goal: bridge case from current state to a state with a reasonable chance of approval

**Case Intelligence Profile (CIP) — shared data model:**
- Single unified data object fed by: document extraction + quiz answers + follow-up Q&A + case file answers
- Consumed by ALL three modules — gap analysis scores against it, simulator questions reference it, document generation is aware of weaknesses
- Not yet built — architectural concept agreed and locked

**Adaptive intake pattern:**
1. Accept any format (formal docs, rough drafts, notes — LLM normalizes)
2. Extract what can be extracted → show pre-filled confirmation card
3. For missing fields: "Do you have a document for X?" before asking directly
4. Only ask bare questions for data that can't be extracted or documented
5. Never duplicate questions already answered in uploaded documents

**Simulator-only intake:**
- Standalone simulator users receive Adaptive Quick Intake (~10 questions, adaptive based on what documents already answer)
- Not yet built

**Process flow widget:**
- Interactive end-to-end workflow diagram for landing page showing full client journey
- Designed as HTML/JS interactive widget in this session
- To be converted to React `<ProcessFlow />` component in a future session

---

### June 16, 2026 — Session 22: Simulator Evaluation Quality + Question Variety + Timer Redesign

**Scope:** Four simulator improvements — evaluation quality, per-session question variety, prominent session timer, comprehensive post-session coaching report with model answers.

#### 1. Evaluate prompt — coaching quality fix

**Problem:** Previous session introduced "2 sentences max" / "1 sentence" constraints to reduce tokens, which made evaluation feedback shallow and unhelpful.

- `src/app/api/simulator/evaluate/route.ts` — prompt rewritten:
  - `feedback`: now asks for 3 sentences — what the officer expects, whether the answer meets the bar, and the specific gap identified
  - `specificSuggestion`: now asks for 2 sentences — exactly what to say differently and how to frame it correctly for E-2
  - `documentReference`: now specifies the full tab name (e.g. "Tab B - Business Plan, Section 3") not just a tab letter
  - `max_tokens`: bumped from 300 → 400 to accommodate richer feedback

#### 2. Question variety — pool-based random selection

**Problem:** All 9 universal questions were hardcoded with identical phrasing every session. A client doing 4 sessions gets the same 9 questions every time.

- `src/lib/simulator-engine.ts` — complete rewrite of `generateQuestions()`:
  - Added `pick<T>()` and `shuffle<T>()` helpers
  - Each universal question (UQ-01 through UQ-09) now draws from a pool of 3-4 alternative phrasings per topic, randomly selected each session
  - Weak point probe questions (WP-01 through WP-04) also have 2-3 phrasings per probe
  - New WP-05 probe for immigrant intent risk (moderate or high flag)
  - `getBusinessTypeQuestions()` now returns expanded pools of 5-6 questions per category; caller shuffles and takes 3
  - Business type pools expanded — added 3 new categories: transport/logistics, construction/contractor, plus enriched generic pool
  - Business type pool questions now personalized with context variables (investment amount etc.)
  - Total variety: 9 topic pools × ~4 phrasings = 36 universal variants; 7+ category pools × 5-6 questions each

#### 3. Session timer — prominent visual countdown

**Problem:** Timer was a 13px text label in the top-right corner of the voice interview; text mode had no visible timer at all.

- `src/components/simulator/ConversationalSession.tsx` (voice mode):
  - Removed timer text from top bar
  - Removed text-only `timerBanner` warning
  - Added `@keyframes timerPulse` animation
  - Added fixed bottom bar (56px, `z-index: 200`, `backdrop-filter: blur(12px)`)
  - Bar contains: "Session time" label + depleting gold progress bar + 22px digital countdown
  - At < 2 minutes: background turns red tint, bar turns red, countdown pulses, label → "Time running out"
  - `page` style: added `paddingBottom: '56px'` so content doesn't hide behind bar
- `src/app/simulator/page.tsx` (text mode `ActiveSession`):
  - Removed non-functional `{mode === 'voice' && timer}` guards (mode is always 'text' in ActiveSession)
  - Added identical fixed bottom bar to text mode as well
  - Text mode now has a visible session timer for the first time

#### 4. Comprehensive post-session coaching report

**Problem:** Session complete screen showed one-line suggestions per weak answer. User request: full coaching cards with what the officer expected, what was missing, and what a strong answer looks like.

**Types updated (`src/types/simulator.ts`):**
- `QuestionCoaching` — added `modelAnswer: string` field
- `CoachingSummary.needsWork` — enriched with `questionId` and `originalAnswer`
- `CoachingSummary.inconsistencies` — enriched with `questionId` and `originalAnswer`

**Engine updated (`src/lib/simulator-engine.ts`):**
- `generateCoachingSummary()` local array type declarations updated to match new interface
- Now correctly populates `questionId` and `originalAnswer` in both `needsWork` and `inconsistencies`

**New route (`src/app/api/simulator/coaching-report/route.ts`):**
- POST endpoint, model: `xiaomi/mimo-v2.5-pro`, timeout: 90s, max_tokens: 2400
- Takes all weak/inconsistent Q&A pairs in one call
- Returns `QuestionCoaching[]` per question with: `whatOfficerExpected`, `whatWasMissing`, `keyPoints[]` (3-5 bullets), `modelAnswer` (first-person example answer), `documentReference`
- Non-fatal: returns `[]` on timeout or parse failure — coaching cards simply don't appear

**Simulator page (`src/app/simulator/page.tsx`):**
- Added `QuestionCoaching` to type imports
- Added `coachingLoading` state
- Added `fetchCoachingReport(summary, ctx)` async helper — fires post-completion, non-blocking
- Hooked into both completion paths: text mode (after `setScreen('complete')`) and voice mode (`onComplete` callback)
- Passes `coachingLoading` to `SessionComplete`

**`SessionComplete` component — full redesign:**
- New `CoachingCard` sub-component (appears once per weak/inconsistent question):
  - Badge: WEAK / INCONSISTENCY (color-coded)
  - Question text + truncated original answer (italicized, 180-char limit)
  - "WHAT THE OFFICER EXPECTS" — 2-3 sentence explanation
  - "WHAT WAS MISSING" — gap analysis
  - "WHAT TO SAY IN YOUR INTERVIEW" — bulleted key points (green bordered)
  - Model answer block (green tint, first-person, with disclaimer: "This is a guide… not a script. Officers can tell when answers are memorized.")
  - Document reference chip (gold tint)
  - Falls back to original one-liner suggestion if coaching API didn't return data
- Loading state: "Analyzing your answers with E-2 expertise..." spinner while coaching loads
- "generating..." inline label next to section heading while loading but after cards appear
- Strong answers section condensed (count in title)
- Practice section updated: "Focus on these questions in your next session"

**Build:** Clean ✅ — `npm run build` zero errors, 93 static pages

---

## SESSION — Voice Simulator Overhaul (June 17, 2026)

### Completed

**Bug: stuck on "Signing in" (Michael Chen account)**
- Root cause: Fast Refresh resets `let browserClient = null` → multiple GoTrueClient
  instances compete for `navigator.locks` Web Lock → `signInWithPassword` hangs forever
- Fix: store singleton on `window.__e2go_supabase__` in `src/lib/supabase.ts` so it
  survives every Hot Reload rebuild
- Commits: 3a05708 (singleton), 3404ec8

**Bug: stuck on "Verifying payment…" after simulator purchase**
- Root cause 1: `create-checkout` `isSameOrigin()` compared dev autoPort vs `localhost:3000`
  → `successUrl` silently replaced → wrong redirect after Stripe
- Root cause 2: `/pricing/success` didn't handle `simulator_3pack` tier → no redirect to `/simulator`
- Root cause 3: login page queried `payment_completed_at` (non-existent column) → should be `payment_status`
- Fixes: `src/app/api/stripe/create-checkout/route.ts`, `src/app/pricing/success/page.tsx`,
  `src/app/login/page.tsx`
- Commit: 93d5708

**Bug: service worker intercepting login redirect**
- SW intercepted `mode === 'navigate'` requests → "Failed to fetch" dropped post-login redirect
- Fix: `public/sw.js` — early return for `navigate` mode and `/_next/` paths
- Commit: 1233067

**Feature: disable sessions-exhausted paywall gate (temporary)**
- Removed UI gate from `StartScreen` and `SESSION_LIMIT_EXCEEDED` throw in simulator-engine.ts
- Commits: 5eb14dd, 1d4b627

**Bug: VAD cuts off answers mid-thought**
- `SILENCE_AFTER_SPEECH_MS`: 2000 → 3500ms
- Commit: 564374e

**Bug: evaluation delay breaks voice flow + "unable to evaluate" shown mid-session**
- Moved all evaluation from sequential per-question to parallel post-session batch
- During session: transcribe → store raw answer → show "✓ Answer recorded" → 2s auto-advance
- After last question: parallel `Promise.all` across all evaluate API calls (~20s total vs 10×20s)
- `ConversationalSession.tsx` now passes `RawVoiceAnswer[]` up via `onComplete`
- `simulator/page.tsx` runs `evaluateAndComplete()` with evaluating spinner, then coaching
- Commit: 564374e

**Bug: officer voice/tone inconsistent between questions**
- Added `officerSpeech(text, idx)` wrapper with 11 transition phrases array
- Questions prefixed with `"Thank you.", "Good.", "I see."` etc. — consistent persona
- Commit: 564374e

**Bug: readiness indicator inverted — showed "Interview Ready" for all-NEEDS WORK sessions**
- `generateCoachingSummary` had `else { readinessIndicator = 'ready' }` when `weakOrInconsistentCount > 2`
- Fixed to `'needs_work'` in the branch where it belongs
- Commit: 564374e

**Fix: coaching-report API hardened**
- `max_tokens`: 2400 → 3200
- Prompt updated: explicit `[ID: ${a.questionId}]` format, instructs model to preserve exact IDs
- Added index-based fallback matching in `fetchCoachingReport` for coaching card lookup
- Commit: 564374e

**Fix: ESLint build errors from ConversationalSession refactor**
- Removed unused `saveSimulatorAnswer` import
- Made `userId`/`applicationId` optional in interface; destructured as `_userId`/`_applicationId`
- Deleted unused `ratingColor`, `ratingLabel` assignments
- Commit: 27a55f7

### Build
Clean ✅ — `npm run build` zero errors after all fixes

---

---

### June 16, 2026 — Session 25: Interview Knowledge Base + Day of Interview Page + FAQ Guards

**Scope:** Build the intelligence layer for the interview preparation system — knowledge base, coaching engine upgrade, consulate data, interview day page, and FAQ inappropriate content hardening.

#### 1. Interview Question Knowledge Base

**Files Created:**
- `docs/E2_Interview_Questions_Master_Bank.md` — 20 gold-standard questions (IQ-01 to IQ-20) with full frameworks, officer tests, key principles, red flags, gold-standard answer structures, Toronto notes. Appendices: frequency reference table + Toronto consulate intelligence.
- `src/lib/interview-knowledge-base.ts` — TypeScript typed knowledge base with `getQuestionKnowledge(simulatorQuestionId)` and `buildKnowledgeBlock()` exports. 20 entries covering Core Opening, Business Viability, Investment Drill-Downs, Qualifications, Nonimmigrant Intent, 2026 Updates.

#### 2. Coaching Engine Upgrade

**Files Modified:**
- `src/app/api/simulator/evaluate/route.ts` — injects gold-standard framework block per question type using `getQuestionKnowledge()`. Officer now evaluates against doctrine-specific criteria, not generic AI guesses.
- `src/app/api/simulator/coaching-report/route.ts` — major upgrade:
  - Per-question gold-standard framework injected into prompt
  - Real case data injected: investment sources, fund flow chronology, projections, management activities, employee roles
  - System prompt changed to "senior E-2 visa immigration consultant" persona
  - Instruction: "USE THEIR ACTUAL NUMBERS AND FACTS — not placeholders"
  - `max_tokens` 3200 → 4000, `temperature` 0.4 → 0.35
  - Commit: `8f92843`

#### 3. FAQ Inappropriate Content Guard (two-layer)

**Files Modified:**
- `src/app/api/faq/ask/route.ts` — regex keyword guard runs BEFORE scope check and BEFORE any API call. Zero cost for harmful queries. Returns `layer: "inappropriate_guard"`. Commit: `384b4af`
- `src/lib/faq-system-prompt.ts` — HIGHEST PRIORITY RULE added: model refuses harmful content even if regex misses edge cases. Commit: `c25bb0b`

#### 4. Consulate Data Library

**File Created:**
- `src/lib/consulate-data.ts` — verified addresses for 13 treaty countries (14 Canadian posts: Toronto, Vancouver, Calgary, Ottawa, Montreal). Full logistics for Canadian posts: exact addresses, phone, transit directions, parking, electronics policy ("Cell phones, smartphones, tablets, laptops, smartwatches, and all other electronic devices are NOT permitted inside the consulate building"), security notes. Helper functions: `getConsulateData()`, `getPrimaryPost()`, `getEmbassyFinderUrl()`, `getVerifiedCountries()`. Commit: `7011824`

**Key decision:** E-2 consulate determined by treaty nationality (from quiz Q0-01), NOT physical location. Third-country national processing eliminated September 2025.

#### 5. Document Checklist Generator

**File Created:**
- `src/lib/document-checklist.ts` — `buildDocumentChecklist(CaseFlags)` generates 4 sections:
  1. Personal Documents (passport, DS-160, appointment, MRV receipt, photo)
  2. Application Binder — all required tabs (Tab A through Tab L)
  3. Case-Specific Additions — dynamic based on: isFranchise (FDD, franchise agreement), investment sources (RRSP statement, property sale docs, gift letter, loan agreement), priorVisaDenial, hasSpouseApplying (marriage cert, spouse passport/DS-160), dependentChildCount (birth certs, children passports), hasPartner, pre-operational status (lease agreement, vendor contracts)
  4. Do Not Bring — phone, laptop/tablet, large bags, non-applying companions, food/drinks
  Commit: `2eb58ad`

#### 6. Interview Day Page

**File Created:**
- `src/app/simulator/interview-day/page.tsx` — full `/simulator/interview-day` page:
  - Fetches client's treaty country from their application, looks up consulate from `consulate-data.ts`
  - Multi-post selector for Canada (5 posts shown, switchable)
  - Electronics warning banner (red, prominent)
  - Consulate address card with: address, phone, transit, parking, website link, appointment link
  - Day-of timeline: 6 steps from arrival to decision
  - "10 Things to Know Before You Walk In" — tips including social media warning (May 2026 policy), 221(g) explanation, standing window format, key numbers to memorise
  - Personalised document checklist from `buildDocumentChecklist()` with interactive checkboxes + progress bar
  - "Do Not Bring" section with ✕ indicators
  - Print button
  - Fallback for unverified countries: link to usembassy.gov
  Commit: `380b7bc`

**Build:** Clean ✅ — 50 routes compiled, zero errors

---

## NEXT SESSION PRIORITIES (Updated June 16, 2026 — Session 25)

**Owner actions pending:**
1. Refund $197 test charge in Stripe dashboard
2. Apply migration `docs/migrations/004_answers_source_update.sql` via `npx supabase db push`
3. Run FAQ seed scripts (pgvector 368 Q&A)
4. Add `/simulator/interview-day` link in the simulator dashboard/nav so clients can reach it

**Code sessions — in priority order:**
1. End-to-end voice simulator test — run a full session as Michael Chen, verify:
   - VAD doesn't jump mid-answer (3.5s threshold)
   - No evaluation delay between questions ("✓ Answer recorded" only)
   - Post-session evaluating spinner fires, then coaching cards show real content
   - Readiness badge correctly says "More preparation needed" when answers are weak
   - Officer transitions consistent throughout session
2. Interview Preparation Kit (SESSION21_INTERVIEW_PREP_KIT) — full build:
   - 10-section PDF/downloadable document, generated post-session
   - Delivery analysis (filler words, pauses, hedging) already captured — inject into kit
   - Per-question sections: score, what officer expected, what was missing, model answer (using real case data)
   - Success measurement touchpoint: invite client back to report interview outcome
3. Process Flow widget → React `<ProcessFlow />` component on landing page
4. Generation engine fixes — docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
5. Bracket highlighting regex + checklist builder fix
6. Knowledge base → Document generation propagation — inject relevant `InterviewQuestionKnowledge` entries into each document's generation prompt (deferred — touches 15-step pipeline)
7. Pricing/packaging consolidation — all tiers need review (deferred from Session 21)
8. SESSION_INVOICING — Stripe invoice generation on checkout

---

## SESSION 26 — Strategic Analysis & Documentation (June 17, 2026)

**No code written.** This was a planning session. All findings documented in memory files.

### Engine Scoring Audit (code-level gap analysis)

All 8 engines scored by reading actual source code, wearing hats of immigration consultant, visa counselor, UI expert, client, and product strategist.

| Engine | Score | Primary Gap |
|---|---|---|
| Coaching Report | 8.0 | No cross-session comparison; token dilution across many weak answers |
| Interview Day | 7.8 | Nav link missing; `hasDocumentUploads: false` hardcoded line 148 |
| Evaluate Engine | 7.2 | `max_tokens: 400` too thin; no severity tier; no rolling window |
| Quiz / Eligibility | 7.2 | Static flag_explanations.json; no score breakdown; binary timeline |
| Simulator | 7.0 | `immigrantIntentRisk: 'moderate'` hardcoded line 132 simulator-engine.ts |
| Document Generation | 6.3 | Bracket placeholder regex mismatch; no D-code awareness in cover letter |
| Case File | 6.2 | `hasAnswer()` checks `length > 3` only — purely presence-based |
| Gap Analysis | 6.0 | Entirely presence-based; D-codes binary; no LLM semantic pass |

### Complete Fix List — 38 Items Across All Engines

**ALREADY DONE:** Inverted readiness indicator — fixed commit `564374e` (Voice Simulator Overhaul). Remove from all future lists.

**Quick wins (tonight — < 2 hours each):**
1. Fix bracket placeholder regex — widened to match descriptive `[text]` brackets
2. Increase evaluate `max_tokens` 400 → 700
3. Add `severity: 'fatal' | 'significant' | 'cosmetic'` to evaluate output schema
4. Fix `hasDocumentUploads: false` — interview-day/page.tsx line 148 → query application_documents
5. Add nav link for `/simulator/interview-day` in simulator dashboard
6. PlayAI TTS upgrade — one model name change in tts/route.ts, eliminates 200-char chunk limit

**Sprint 2 — Quality improvements:**
7. Fix `immigrantIntentRisk: 'moderate'` hardcoded — simulator-engine.ts line 132 → derive from case flags
8. Pass 3-answer rolling window to evaluate engine (within-session inconsistency detection)
9. Non-null `specificSuggestion` for strong evaluate answers
10. Cross-session coaching — pass prior session summary into coaching-report request + "change from last session" as first card
11. D-code top-3 section on interview day page
12. Personalized warning text via LLM (replace static flag_explanations.json)
13. D-code-aware cover letter generation

**Sprint 3 — Product features:**
14. Follow-up probe per weak simulator answer (contextual follow-up before advancing to next question)
15. Cross-document consistency pass post-generation
16. Multi-pass quality check post-generation (prohibited vocab, placeholder tokens, 5 officer questions in cover letter)
17. Case briefs generation trigger banner (when substantiality_score is null)
18. "Fix this now" deep links from gap cards to exact intake fields
19. Numeric score 1–10 in evaluate output + cross-session progress metric
20. Coaching report max_tokens 4000 → 6000 + severity tier + synthesis conclusion ("top 3 before next session")
21. Score breakdown by 5 criteria in quiz results
22. Adaptive quiz branching for prior denial + RRSP paths
23. "Ask a follow-up" FAQ pre-loaded at bottom of quiz results
24. Add TTS/STT fallback chains — Groq → OpenAI → Browser for both routes
25. Create `src/lib/llm-client.ts` — shared `callLLM(task, messages, opts)` with FALLBACK_CHAINS per task type

**Sprint 4 — Intelligence layer:**
26. LLM enrichment pass on gap analysis "needs_work" categories
27. Semantic content evaluation for 3 critical gap analysis fields (projection basis, management activities, source of funds)
28. Real-time field quality indicator in case file (on blur for major fields)
29. Cross-field investment health check in case file (live proportionality indicator)
30. Business-type adaptive weights in gap analysis (franchise 2× FDD weight; pre-start 2× commitment docs)
31. Speaking pattern analysis post-transcription in simulator (hedge word ratio, answer length, sentence complexity)
32. Post-interview outcome capture at +2 weeks
33. Timeline personalization in quiz results (treaty country, prior denial, partnership complexity)

**Sprint 5 — UX polish:**
34. Targeted revision flow — "Revise this paragraph" button on document preview
35. Voice profile completeness gate before document generation (< 100 words triggers prompt)
36. Document quality feedback on upload (bank statements: 6-12 months recommendation)
37. "What makes a strong answer" expandable guidance per case file field
38. Case-type field prioritization at top of case file form

### Model Pricing Research (verified June 17, 2026)

| Model | Input / 1M | Output / 1M | Use |
|---|---|---|---|
| `xiaomi/mimo-v2.5` | $0.14 | $0.28 | Evaluate, FAQ, gap enrichment |
| `xiaomi/mimo-v2.5-pro` | $0.435 | $0.87 | Coaching reports |
| `google/gemini-2.5-flash` | $0.30 | $2.50 | OpenRouter fallback |
| `claude-sonnet-4-6` | $3.00 | $15.00 | Document generation (recommended) |
| `claude-opus-4-8` | $15.00 | $75.00 | Current default in app_settings |

**Per-client cost:** ~$1.80 current (Opus for docs) → ~$0.42 with Sonnet + all improvements.
**As % of $550 revenue:** 0.076%. Never a business constraint.
**Recommendation:** Evaluate switching `generation_model` from `claude-opus-4-8` to `claude-sonnet-4-6` — saves $1.33/client, negligible quality difference for structured legal documents.

### Fallback Architecture Designed

**Two-provider strategy (designed, not yet implemented):**
- Provider 1: OpenRouter (MIMO primary + Gemini in `models` array for automatic failover)
- Provider 2: Anthropic (Claude fallback when OpenRouter fails entirely)

Per-route chains documented in memory file `fallback_architecture.md`.
Implementation: `src/lib/llm-client.ts` (code fix #13 above).

**Voice fallback:** Both TTS and STT use keys already in .env.local (GROQ_API_KEY + OPENAI_API_KEY). No new integrations needed.

**Grok (xAI) NOT in fallback chain.** Knowledge cutoff Nov 2024 too old for immigration. Brand risk for immigration clients. Groq (inference company) ≠ Grok (xAI) — both already clarified and documented.

### Groq / Grok Clarification — Permanent Record

- **Groq** (groq.com): Inference acceleration company. Already integrated via GROQ_API_KEY. Powers both TTS (Orpheus) and STT (Whisper) in simulator.
- **Grok** (x.ai): xAI's LLM. NOT integrated. NOT in fallback chain.

Current TTS limitation: Orpheus requires ≤200 chars/request → text chunked → audible seam between chunks. Fix: upgrade to `playai-tts` (single model name change in tts/route.ts).

### Build
No code changes. No commit needed.

---

## SESSION 27 — Sprint 1 Code Execution (June 17, 2026)

**Branch:** dev. Build clean. 7 commits.

### Changes Made

**1. `src/types/simulator.ts`** — commit `66ddae1`
- Added `severity?: 'fatal' | 'significant' | 'cosmetic'` to `AnswerEvaluation`
- Added `severity?: 'fatal' | 'significant' | 'cosmetic'` to `QuestionCoaching`
- Added `top3NextSession?: string[]` to `CoachingSummary`

**2. `src/app/api/simulator/evaluate/route.ts`** — commit `6f7e2da`
- `max_tokens: 400` → `700` (allows coaching-grade 3-sentence feedback)
- Added `severity` field to prompt output schema with definitions (fatal/significant/cosmetic)
- Changed `specificSuggestion` to always be non-null — for strong answers, suggests next elevation
- Extracts `severity` from parsed JSON and passes through to response

**3. `src/app/simulator/interview-day/page.tsx`** — commit `b3c9caa`
- Replaced hardcoded `hasDocumentUploads: false` with live query to `application_documents` table
- Uses `{ count: 'exact', head: true }` — zero extra data transferred

**4. `src/app/simulator/page.tsx`** — commit `8ecb845`
- Added "Interview Day Guide →" link in StartScreen (always visible before sessions)
- Added "Interview Day Guide" button in complete screen action row
- Wire `top3NextSession` from coaching-report API response into `coachingSummary` state

**5. `src/app/api/simulator/coaching-report/route.ts`** — commit `ad4330e`
- `max_tokens: 4000` → `6000` (cost +$0.002/report, negligible)
- Added `severity` per coaching card to prompt schema
- Added `top3NextSession: string[]` synthesis as top-level field in response envelope
- Parser handles both new object envelope `{ coaching, top3NextSession }` and bare array fallback

**6. `src/app/api/simulator/tts/route.ts` + `src/lib/groq-tts.ts`** — commit `9245a7c`
- TTS route: extracted `callGroqTTS()` and `callOpenAITTS()` helpers with try/catch chain
- Groq Orpheus primary → OpenAI TTS (`tts-1`, voice `onyx`) fallback → `{ fallbackToBrowser: true }` signal
- `groq-tts.ts`: handles `fallbackToBrowser` signal by calling `browserSpeak()` (SpeechSynthesisUtterance)
- Fully transparent to ConversationalSession — no component changes needed

**7. `src/app/api/simulator/transcribe/route.ts`** — commit `1e22787`
- STT route: `transcribeWithGroq()` + `transcribeWithOpenAI()` helpers
- Groq `whisper-large-v3-turbo` primary → OpenAI `whisper-1` fallback
- Identical quality at fallback — same Whisper model weights, just different inference provider

### Items Skipped (Already Done or Deferred)
- Bracket placeholder regex: both `docx-builder.ts` and `checklist-builder.ts` already use `/\[[^\[\]]+\]/g` — correct. Root cause of placeholder issue may be elsewhere (generation-engine.ts stripping brackets). Deferred to Sprint 2 investigation.
- PlayAI TTS upgrade: moved to Sprint 2 (single line change, low risk, do with user present)

### What's Next (Sprint 2 — requires user presence)
1. Fix `immigrantIntentRisk: 'moderate'` hardcoded in `simulator-engine.ts` line 132
2. Pass 3-answer rolling window to evaluate engine
3. D-code top-3 section on interview day page
4. Cross-session coaching (pass prior session summary into coaching-report request)
5. PlayAI TTS upgrade (single model name change in tts/route.ts)
6. Personalized warning text via LLM (replace static flag_explanations.json)
7. D-code-aware cover letter generation

### Memory Files Created This Session
- `memory/engine_scoring_roadmap.md` — full engine audit with priority fix order
- `memory/model_pricing.md` — verified pricing table + per-client cost analysis
- `memory/fallback_architecture.md` — per-route fallback chains + implementation pattern
- `memory/voice_pipeline.md` — Groq TTS/STT current state, upgrade path, Groq vs Grok distinction
- `memory/project_state_june17.md` — replaces project_state_june16.md

---

## SESSION 28 — Security Audit + Infrastructure (June 17, 2026)

**Branch:** dev. Build clean. 4 commits.

### OpenAI API Key
- `OPENAI_API_KEY` added to `.env.local` — enables TTS/STT fallback chains built in Session 27
- `OPENAI_API_KEY` added to Vercel (All Environments) — production fallback now active
- ⚠️ Key was shared in chat plaintext — should be rotated at platform.openai.com

### Security Fixes (4 commits)

**1. `src/app/api/analysis/run/route.ts`** — commit `6582334` — CRITICAL
- Was: auth based on `Authorization` header existence + `userId` from request body (attacker-controlled)
- Now: proper session auth via `createSupabaseServerClient().auth.getUser()`, userId NOT taken from body
- Ownership check compares against `user.id` from verified session token

**2. `src/app/api/answers/route.ts`** — commit `0362063`
- Added application ownership verification before upsert
- Queries `applications` filtered by both `id` and `user_id` — prevents writing answers to another user's case file

**3. `src/middleware.ts`** — commit `7061b22`
- Removed spoofable `x-user-id` header rate limit block for `/api/generate` and `/api/analysis`
- These routes now rely on Upstash Redis rate limits keyed to verified `user.id` inside each route handler

**4. `src/lib/rate-limit.ts`** — commit `c20d9d8`
- Expanded from 1 route (FAQ) to 6 per-route profiles
- Profiles: `faq` (10/10m), `evaluate` (30/10m), `coaching` (6/60m), `tts` (60/10m), `transcribe` (60/10m), `generate` (4/60m)
- `checkRateLimit()` now accepts `profile: RateLimitProfile` parameter

### Security Audit — Full Findings

**FIXED this session:**
| Issue | Severity | Status |
|---|---|---|
| Auth bypass in `/api/analysis/run` (header + body userId) | Critical | ✅ Fixed commit 6582334 |
| Cross-user write in `/api/answers` | High | ✅ Fixed commit 0362063 |
| Spoofable `x-user-id` middleware rate limit | High | ✅ Fixed commit 7061b22 |
| Rate limiting missing on 5 AI routes | Medium | ✅ Fixed commit c20d9d8 |

**CONFIRMED CLEAN:**
| Item | Finding |
|---|---|
| Stripe webhook | `constructEvent()` + signature + 5-min freshness ✅ |
| Document download route | Ownership verified before signed URL ✅ |
| Followup routes | Application ownership verified ✅ |
| Email anonymous path | DB as source of truth ✅ |
| Security headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy ✅ |
| NEXT_PUBLIC vars | Only safe vars exposed (anon key, publishable key, Price IDs, URL) ✅ |
| Supabase Storage bucket | **Private** — confirmed via dashboard toggle ✅ |
| Documents in bucket | Business prep docs only (cover letters, business plans, DS-160 copies, projections) — NOT passports or bank statements |

**KNOWN ISSUES (not yet fixed):**
| Issue | Priority | Notes |
|---|---|---|
| Login + quiz in-memory rate limits reset on Vercel cold-start | Medium | Map resets per function instance; needs Upstash migration |
| CSP `unsafe-eval` | Low | Complex nonce refactor; not urgent |
| HSTS header missing | Low | Vercel likely handles at CDN level |

### What's Next (Sprint 2 — requires user presence)
1. Fix `immigrantIntentRisk: 'moderate'` hardcoded in `simulator-engine.ts` line 132
2. Pass 3-answer rolling window to evaluate engine
3. D-code top-3 section on interview day page
4. Cross-session coaching (pass prior session summary into coaching-report request)
5. PlayAI TTS upgrade (single model name change in `tts/route.ts`)
6. Personalized warning text via LLM (replace static `flag_explanations.json`)
7. D-code-aware cover letter generation
8. Migrate login + quiz rate limits from in-memory Map to Upstash Redis
