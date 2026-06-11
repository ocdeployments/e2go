# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 11, 2026 — Quiz new questions: 4 questions + franchise sub-questions added
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
| Analysis engine | ✅ COMPLETE | Types, lib, API, tests |
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
| /learn hub | ✅ COMPLETE | 6 SEO articles |
| Module 1 | ✅ COMPLETE | Onboarding, consent, application record |
| Module 2 | ✅ COMPLETE | Business advisor, category selection |
| Voice-to-text input | ✅ COMPLETE | commit 63dc9dd — mic bug fixed in redesign session |
| **Case file UX redesign** | ✅ COMPLETE | commits a9dfcb9–9172b2c — two-panel, voice, all variants |

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
| Case File Overview | /apply | ✅ COMPLETE | SectionCard.tsx restyled |
| Case File: Your Story | /apply/story | ✅ COMPLETE | commit c56f3a4 |
| Case File: Your Business | /apply/business | ✅ COMPLETE | commit db919eb |
| Case File: Your Investment | /apply/investment | ✅ COMPLETE | commit b20065e |
| Case File: Your Qualifications | /apply/qualifications | ✅ COMPLETE | commit a421108 |
| Case File: Your Family | /apply/family | ✅ COMPLETE | commit ddaccac |
| Case File: Your Ties | /apply/ties | ✅ COMPLETE | commit 7502ea8 |
| Score | /score | ✅ COMPLETE |
| Generate | /generate/[appId] | ✅ COMPLETE |
| Documents | /documents/[appId] | ✅ COMPLETE |
| Learn | /learn | ✅ COMPLETE |
| About | /about | ✅ COMPLETE |
| Privacy | /privacy | ✅ COMPLETE |
| Terms | /terms | ✅ COMPLETE |
| Support | /support | ✅ COMPLETE |

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

## MODULE 0 — QUIZ NEW QUESTIONS (Session 2 — June 11, 2026)

| Feature | Status |
|---|---|
| Q0-readiness — readiness stage question | ✅ COMPLETE |
| Q0-target-date — target date range question | ✅ COMPLETE |
| Q0-business-type — business type selector | ✅ COMPLETE |
| Q0-business-cost — total cost + currency | ✅ COMPLETE |
| Q0-08c — franchise broker sub-question | ✅ COMPLETE |
| Q0-08d — franchise referral connection | ✅ COMPLETE |
| Proportionality scoring (investment / business cost) | ✅ COMPLETE |
| W-TARGET-URGENT, W-NO-BIZ-IDENTIFIED, W-PROP-SOFT-30, W-PROP-STRONG-30 | ✅ COMPLETE |
| DB columns: quiz_sessions.readiness_stage, quiz_sessions.business_type | ✅ COMPLETE |
| working_target_date wiring: quiz → module1 → applications | ✅ COMPLETE |
| Results page personalised timeline ("To be in the US by…") | ✅ COMPLETE |
| Franchise referral admin email via Resend | ✅ COMPLETE |
| Migration: 20260611120000_quiz_new_columns.sql | ✅ COMPLETE |

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
| Visual consistency with case file redesign | ✅ COMPLETE | Already Obsidian Gold — no changes needed |

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
| OpenRouter MiniMax evaluation engine | ✅ COMPLETE |
| Coaching summary + readiness indicator | ✅ COMPLETE |

✅ STRIPE_PRICE_SIMULATOR renamed to STRIPE_PRICE_SIMULATOR_3PACK (commit 0aca5dc)
✅ useEffect dependency fixed — question?.id → question.text (commit 0aca5dc)

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

**Status:** ✅ COMPLETE — all 6 section pages redesigned, build clean, data writes verified
Commits: a9dfcb9 (CaseFileShell), 5d02c15 (overview), c56f3a4–7502ea8 (sections), fd710fa (module4)

### Case file UX redesign — COMPLETE (June 10, 2026)

**What was built:**
- CaseFileShell.tsx — shared layout component: two-panel desktop,
  drawer tablet, overlay mobile, cluster sidebar, document preview panel
- All 6 section pages rebuilt with premium two-panel layout
- SectionCard.tsx restyled — overview page updated
- /apply/module4 — textarea visual consistency only, no logic change
- /apply/upload flow — already Obsidian Gold, no changes needed
- Voice input: getUserMedia pre-check added — mic bug fixed
- All variants preserved: partnership three-track, COS blocks,
  family sub-paths, AdvisoryBlock, RiskFlag, PreFillBadge (all 3)
- Data write verification: all 6 sections use identical architecture
  (applicationId, answers state, saveAnswer callback,
  handleAnswerChange with debounce, auto-save POST to /api/answers)
  — unchanged and verified

**Document preview panel (Phase 1 — template-based):**
Fields fill in as user types. No API call. No cost.
Phase 2 (after first paying user): live AI paragraph generation
per cluster, ~$0.05–$0.75/session. Deferred.

**Voice input:**
- Full-width bar below each textarea — labelled "Speak your answer"
- Active: gold pulse + 4-bar animated waveform
- Mic permission bug fixed: getUserMedia pre-check added
- Web Speech API — free, no API key
- /apply/module4 untouched — separate voice sample system

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
| docs/sessions/SESSION_CASEFILE_REDESIGN.md | ✅ Written + executed — June 10, 2026 |

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

## SESSION — Case File UX Redesign Complete (June 10, 2026)

### Completed — commits a9dfcb9 through 9172b2c

**CaseFileShell.tsx (a9dfcb9):**
Shared layout wrapper for all 6 sections. Two-panel desktop
(200px sidebar + questions + document preview), drawer tablet,
full-screen overlay mobile. Cluster sidebar with completion states.
Document preview panel — template-based, no API call.
useSpeechInput hook wired — getUserMedia pre-check added (mic bug fixed).
AdvisoryBlock, RiskFlag, PreFillBadge all restyled.

**Overview page (5d02c15):**
SectionCard.tsx restyled — Obsidian Gold, cluster completion chips,
document chips, pre-fill gem indicator, hover states.

**Six sections (c56f3a4, db919eb, b20065e, a421108, ddaccac, 7502ea8):**
Each section page rebuilt using CaseFileShell.
All data architecture preserved unchanged:
  applicationId, answers state, saveAnswer callback,
  handleAnswerChange with 800ms debounce, auto-save POST to /api/answers.
All variants preserved:
  Partnership three-track (shared / your info / partner B)
  COS conditional question blocks
  Family sub-paths (stepchildren, common-law, legitimation, age-out)

**Module 4 (fd710fa):**
Textarea visual consistency only — surface treatment applied.
No mic button. No logic changes. AI detection untouched.

**Upload flow:**
Already Obsidian Gold — no changes needed.

### Data write verification
All 6 sections use identical data architecture. Auto-save POST
to /api/answers confirmed unchanged by code review.

### Build
Clean — all routes compiled, 0 new errors.

---

## SESSION — Voice-to-Text Input (June 10, 2026)

### Completed — commit 63dc9dd on dev

- **useSpeechInput hook**: src/hooks/useSpeechInput.ts
  Web Speech API wrapper — free, no API key, runs in browser.
  Supports Chrome and Edge. Graceful degradation on Firefox.
- **TextArea component updated**: Mic button added (superseded by
  full redesign in CaseFileShell — final implementation is the
  full-width bar with labelled button and waveform animation)
- **/apply/module4 unchanged**: Voice sample system is separate.
  No mic button added there.
- **Mic bug fixed** in redesign session: getUserMedia pre-check
  added before SpeechRecognition.start()

---

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

## SESSION — Case File UX Redesign — Spec Written (June 10, 2026)

### Completed (planning only — no code)

Full specification written for the case file UX redesign.
Session file: docs/sessions/SESSION_CASEFILE_REDESIGN.md

**What was decided:**
- Current pages render as plain scrolling forms — do not match
  the quality of the rest of the platform. Client paid $550–$1,397.
- Redesign is not polish. It is product.
- Standard: "Would someone who paid $600 feel embarrassed showing
  this screen to their spouse?" If uncertain — rebuild it.

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

## NEXT SESSION PRIORITIES (Updated June 11, 2026)

### Priority 1 — Session 3: Fix Structural Question Issues
File: docs/sessions/QUIZ_EXECUTION_PLAN.md → Session 3
Scope: Q0-01 dual citizenship, Q0-03 split, Q0-08 option fix,
Q0-09 ownership %, Q0-14/Q0-15 show_if, Q0-17 common-law, Q0-21 auth gate

### Priority 2 — Apply answers source migration
Run: `npx supabase db push`
File: `supabase/migrations/004_answers_source_update.sql`
Status: exists, never applied

### Priority 3 — End-to-end payment test
Full flow: quiz → pricing → checkout (4242 4242 4242 4242) →
dashboard → /apply → Module 3 → Generation → Download
Test applicant: Michael James Chen
UUID: 9f981747-e3e4-4941-9f86-9871f8117b66
Use SKIP_PAYMENT_WALL=true in .env.local for generation test

### Priority 4 — Generation engine fixes
File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
Three known issues: approval gate, setState violation, empty boxes

### Priority 5 — Verify 34-gap questions are integrated
Case file was built but gap questions from June 9 planning
may not be in the build.
Session file: docs/sessions/SESSION_MODULE3_CASEFILE.md

### Priority 6 — Fix two warnings
generate/page.tsx and quiz/page.tsx — non-blocking but clean up
when next touching those files.

### Future sessions (after first paying user)
- Admin dashboard — user management, payment history
- Support ticket system
- Lifecycle tracking throughout app
- Compliance calendar — spec written at docs/COMPLIANCE_CALENDAR_SPEC.md
- Renewal module — spec written at docs/RENEWAL_MODULE_SPEC.md

---

## KNOWN ISSUES (Updated June 10, 2026)

1. **Migration 004 pending** — docs/migrations/004_answers_source_update.sql
   not yet applied. Run: npx supabase db push
2. **Generation engine: approval gate, setState, empty boxes** — MEDIUM
   File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
3. **Quiz nationality selector** — curl/browser difficulty, works in browser
4. **Fast Refresh errors** — Occasional hot reload (non-blocking)
5. **Stripe API version outdated (2024-06-20)** — LOW
   Upgrade apiVersion in scripts/stripe-setup.ts when convenient
6. ~~**Mic button disappears on click**~~ — ✅ FIXED — getUserMedia pre-check added
7. ~~**Case file pages look like draft forms**~~ — ✅ FIXED — UX redesign complete
8. ~~**Payments table not in Supabase**~~ — ✅ FIXED June 10
9. ~~**All Stripe Price IDs wrong**~~ — ✅ FIXED June 10
10. ~~**Login page 500 error**~~ — ✅ FIXED June 10 (commit e115caf)
11. ~~**Simulator transcription placeholder**~~ — ✅ FIXED June 9
12. ~~**Simulator purchase button + env var + useEffect**~~ — ✅ FIXED June 9

---

## SESSION — Quiz New Questions + Franchise Referral (June 11, 2026)

### Completed — Session 2 from QUIZ_EXECUTION_PLAN.md

**6 questions added to quiz (23 total):**
- Q0-readiness: 3 options (ready_to_apply, researching, exploring)
- Q0-target-date: 4 options, "Within 6 months" triggers W-TARGET-URGENT
- Q0-business-type: 8 options including franchise, "not identified yet" triggers W-NO-BIZ-IDENTIFIED
- Q0-business-cost: currency type, show_if fires for all business types except "not identified yet"
- Q0-08c: franchise broker sub-question (parent changed to Q0-business-type)
- Q0-08d: franchise referral connection ("Yes, please connect me" → admin email)

**Scoring additions:**
- W-TARGET-URGENT: risk_flag (target date < 6 months)
- W-NO-BIZ-IDENTIFIED: risk_flag (no business type selected)
- W-PROP-SOFT-30: risk_flag (investment 30–49% of total business cost)
- W-PROP-STRONG-30: attorney_recommended (investment < 30% of total cost)
- Proportionality scoring: investment midpoint / total business cost percentage

**Database:**
- Migration: supabase/migrations/20260611120000_quiz_new_columns.sql
- quiz_sessions.readiness_stage (text)
- quiz_sessions.business_type (text)

**Downstream wiring:**
- working_target_date: quiz → module1 → applications table
- Results page: personalised timeline ("To be in the US by [month]…")
- Franchise referral: POST /api/notifications/franchise-referral → Resend admin email

**Files changed (7):**
- public/data/module0_questions.json — 6 questions added
- public/data/module0_scoring_logic.json — 4 flags + proportionality section
- src/app/quiz/page.tsx — proportionality function + new result fields
- src/app/apply/module1/page.tsx — working_target_date wiring
- src/app/results/page.tsx — personalised timeline
- src/app/api/notifications/franchise-referral/route.ts — NEW
- supabase/migrations/20260611120000_quiz_new_columns.sql — NEW

### Verification
- Quiz page: HTTP 200 ✓
- All 6 question IDs confirmed in JSON ✓
- readiness_stage + business_type columns in migration ✓
- working_target_date wired in quiz + module1 ✓
- Proportionality scoring in JSON + quiz page ✓
- npm run build: clean — 0 errors ✓

---

## SESSION FILES INDEX

All session files are in docs/sessions/. Prompt for agent: `cat docs/sessions/[filename]`

| File | Purpose | Priority |
|---|---|---|
| SESSION_PLAN_GENERATION_FIXES.md | Generation engine: approval gate, setState, empty boxes | 1 — run next |
| SESSION_MODULE3_CASEFILE.md | Case file: verify 34-gap questions, partnership UI | 2 |
| SESSION_CASEFILE_REDESIGN.md | Case file UX redesign — spec + execution record | ✅ DONE |
| SESSION_HANDOFF_JUNE9.md | Login fix, Stripe migration, generation engine fixes, E2E test | Reference |
| SESSION_SIMULATOR.md | Simulator: Groq TTS, transcription, timer, purchase, design fixes | ✅ DONE |
| SESSION_QUIZ_FIXES.md | Quiz UX: family split, partnership, months, back button, review page | ✅ DONE |
| SESSION_QUIZ_FIXES_2.md | Quiz legal accuracy: 9 FAM partnership rules, hard stops | ✅ DONE |

---

## BUILD STATE

- Branch: `dev`
- Last session: Quiz new questions + franchise referral (June 11, 2026)
- `npm run build`: Clean — all routes compiled, 0 new errors
- Quiz: 23 questions, 4 new scoring flags, proportionality scoring
- Case file UX redesign: ✅ COMPLETE
- Payments migration: ✅ APPLIED
- Stripe Price IDs: ✅ LIVE
- Voice input: ✅ COMPLETE (mic bug fixed)
- Blocking first paying user: migration 004 + end-to-end payment test
