# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 10, 2026 — Stripe pricing complete, all blockers resolved, ready for end-to-end test
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
| Case File Overview | /apply | ✅ COMPLETE |
| Case File: Your Story | /apply/story | ✅ COMPLETE |
| Case File: Your Business | /apply/business | ✅ COMPLETE |
| Case File: Your Investment | /apply/investment | ✅ COMPLETE |
| Case File: Your Qualifications | /apply/qualifications | ✅ COMPLETE |
| Case File: Your Family | /apply/family | ✅ COMPLETE |
| Case File: Your Ties | /apply/ties | ✅ COMPLETE |
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

**Status:** ✅ COMPLETE — all 6 section pages built, build clean (73 routes), old tabs preserved

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
- Added Playwright tests, production build clean (53 routes)

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
- Playwright verified

### June 5, 2026 — Session S22
- Document generation blur-lift reveal animation
- Installed motion library (v12.40.0)
- Playwright test verifies 6 document cards render with blur overlays

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

## NEXT SESSION PRIORITIES (Updated June 9, 2026)

### Blocking first paying user
1. **Apply payments table migration** — Run `20260605110625_payments_table.sql`
2. **Recreate all Stripe Price IDs at new amounts** — Run scripts/stripe-setup.ts,
   update all STRIPE_PRICE_* in .env.local. Old founding member IDs are wrong.
3. **Run end-to-end payment test** — After migration + price IDs updated
4. **Login page 500 fix** — Unsplash image 404ing. Session file: SESSION_HANDOFF_JUNE9.md Prompt 1
5. ~~**Simulator Groq transcription**~~ — ✅ COMPLETE June 9
6. ~~**Simulator Groq TTS**~~ — ✅ COMPLETE June 9
7. ~~**Simulator 15-minute timer**~~ — ✅ COMPLETE June 9
8. ~~**Simulator $29.99 purchase**~~ — ✅ COMPLETE June 9 (env var rename still needed)
9. ~~**Simulator design violations**~~ — ✅ COMPLETE June 9

### Quiz accuracy (run after simulator)
10. ~~**Quiz UX fixes**~~ — ✅ COMPLETE June 9 (SESSION_QUIZ_FIXES.md)
11. ~~**Quiz legal accuracy fixes**~~ — ✅ COMPLETE June 9 (SESSION_QUIZ_FIXES_2.md)

### Module 3 case file (verify and extend)
12. **Verify 34-gap questions are integrated** — Case file was built but
    gap questions from June 9 planning may not be in the build.
    Session file: docs/sessions/SESSION_MODULE3_CASEFILE.md
13. **Partnership dual-track UI** — Shared + personal + partner B sections.
    Session file: docs/sessions/SESSION_MODULE3_CASEFILE.md

### UI polish
14. **Hero CTA buttons and stats strip** — Four surgical fixes.
    Session file: docs/sessions/SESSION_HANDOFF_JUNE9.md (Prompt 1 area)
    Exact changes documented in IDEAS.md Section 21.

### After quiz fixes — document upload feature
12. ~~**Document upload Session A**~~ — ✅ COMPLETE June 9
13. ~~**Document upload Session B**~~ — ✅ COMPLETE June 9
    ⚠️ Apply migration 004_answers_source_update.sql: npx supabase db push

### Future sessions (after first paying user)
15. Admin dashboard — user management, payment history
16. Support ticket system
17. Lifecycle tracking throughout app
18. Compliance calendar — spec written at docs/COMPLIANCE_CALENDAR_SPEC.md
19. Renewal module — spec written at docs/RENEWAL_MODULE_SPEC.md

---

## KNOWN ISSUES (Updated June 9, 2026)

1. **Payments table not in Supabase** — Migration exists, not applied
2. **All Stripe Price IDs wrong** — Old founding member pricing ($297–$647).
   Must recreate at new amounts ($550–$1,397) before any live payment
3. ~~**Login page 500 error**~~ — ✅ FIXED June 10 (commit e115caf — flag gradient corrected)
4. ~~**Simulator transcription placeholder**~~ — ✅ FIXED June 9
5. ~~**Simulator purchase button + env var + useEffect**~~ — ✅ FULLY COMPLETE June 9 (commit 0aca5dc)
6. ~~**Quiz selected option blue border**~~ — ✅ FIXED June 9
7. ~~**Quiz family question conflates nuclear and extended family**~~ — ✅ FIXED June 9
8. ~~**Results page shows weeks not months**~~ — ✅ FIXED June 9
9. ~~**Three+ partner hard stop**~~ — ✅ FIXED June 9 (all 7 legal accuracy fixes complete)
10. **Quiz nationality selector** — Playwright difficulty, works in browser
11. **Fast Refresh errors** — Occasional hot reload (non-blocking)
12. **Migration 004 pending** — docs/migrations/004_answers_source_update.sql
    not yet applied. Run: npx supabase db push

---

## SESSION FILES INDEX (June 9, 2026)

All session files are in docs/sessions/. Prompt for agent: `cat docs/sessions/[filename]`

| File | Purpose | Priority |
|---|---|---|
| SESSION_HANDOFF_JUNE9.md | Login fix, Stripe migration, generation engine fixes, E2E test | 1 — run now |
| SESSION_SIMULATOR.md | Simulator: Groq TTS, transcription, timer, purchase, design fixes | 2 |
| SESSION_QUIZ_FIXES.md | Quiz UX: family split, partnership, months, back button, review page | 3 |
| SESSION_QUIZ_FIXES_2.md | Quiz legal accuracy: 9 FAM partnership rules, hard stops | 4 |
| SESSION_MODULE3_CASEFILE.md | Case file: gap questions, partnership UI, dynamic manifest | 5 |

---

## BUILD STATE

- Branch: `dev`
- Last commit: [current dev branch]
- `npm run build`: Clean — 54+ routes compiled
- All core features implemented
- Stripe code complete, awaiting migration


---

## SESSION 18B — June 8, 2026

### Fixes
- **login/page.tsx**: Backfill quiz session user_id on login — links anonymous quiz attempts to account after sign-in
- **quiz/page.tsx Fix 1**: handleAnswer no longer auto-advances when selected answer triggers a sub_question — fixes double-click bug on Q0-16
- **quiz/page.tsx Fix 2**: sub_question show_if now handles arrays correctly — fixes sub_question never showing for multi-value show_if
- **quiz/page.tsx Fix 3**: franchise_interest flag wired to Q0-FRANCHISE-REFERRAL answer
- **module0_questions.json**: Added Q0-FRANCHISE-REFERRAL question between Q0-10 and Q0-STATE — fires for undecided and franchise applicants

### Build
Clean — 66 routes, 0 errors

### Known remaining
- Visual E2E test of generate page approval gate requires manual browser test (auth required)
- npm test not configured

---

## SESSION — Quiz + Results Rebuild (June 9, 2026)

### Completed
- **module0_questions.json**: Global v4.0 — 14 core questions, 19 total including conditionals, all Canadian references removed, 82-country selector, franchise lead capture wired
- **quiz/page.tsx**: Complete rewrite — auth-aware, no login hang, fire-and-forget auth check with 3s timeout, correct sub-question flow, multi-select, auto-advance, email gate for anonymous users, direct to results for logged-in users
- **results/page.tsx**: Complete rewrite — score/100, personalised verdict, profile grid, flags, timeline, franchise broker card, consulate intelligence, pricing pre-calc, reads from localStorage + Supabase fallback
- **middleware.ts**: Rate limiter production-only confirmed

### Build
Clean — 0 errors

### Auth flows confirmed in code
1. Logged in + quiz done → bypass quiz → dashboard
2. Logged in + no quiz → take quiz → skip email gate → results
3. Not logged in → take quiz → email gate → results
4. Login page → no rate limiting in dev → no hanging spinner

---

## SESSION — Landing Page Rebuild (June 9, 2026)

### Completed
- HomeClient.tsx: Complete rebuild — 10 sections, mobile-first
- page.tsx: Clean server component wrapper
- NavBar.tsx: Mobile hamburger nav — manual build (Magic MCP unavailable)
- JourneyWizard.tsx: Interactive timeline comparison — dropdowns, stage logic, gap indicator
- FeatureGrid.tsx: 3-column feature grid with gold diamond icons
- All sections mobile-first with Tailwind breakpoints
- Build: clean

### Design system applied
- Background #0a0a0a throughout
- Gold #C9A84C for all accents, CTAs, active states
- Cormorant Garamond for all headings
- DM Sans for all body text
- Zero border-radius anywhere
- No glassmorphism, no shadows, no gradients

### Mobile audit
All 14 items pass:
- Nav collapses to hamburger on mobile
- Hero text readable on 375px screen
- Hero buttons full width on mobile
- Stats grid 2x2 on mobile
- How it works steps stack vertically on mobile
- Journey wizard dropdowns full width on mobile
- Journey wizard columns stack vertically on mobile
- Feature grid single column on mobile
- Founder's note has adequate padding on mobile
- Testimonial cards stack on mobile
- Final CTA buttons stack on mobile
- Footer stacks on mobile
- No horizontal scroll at any breakpoint
- All touch targets minimum 44px tall

### Copy note
All copy is placeholder — owner will edit directly in VS Code.
No copy changes should be made by the agent.

### Commit
a9d5f63 — feat: landing page complete rebuild — mobile-first, Obsidian Gold, journey wizard

---

## SESSION — Quiz Navigation + Draft Save (June 9, 2026)

### Navigation Fixes
- **Auto-advance on warnings**: 1200ms delay to read warning before advancing
- **Auto-advance on attorney flags**: 1200ms delay before advancing
- **Back button on all questions**: Added after options block, before tooltip
- **Clickable section tabs**: Done tabs clickable, jump to section start
- **getFirstQuestionOfSection helper**: For section navigation

### Draft Save System
- **PART A**: Save draft to localStorage on every answer (select, multi)
- **PART B**: Restore draft on page load with 7-day expiry
- **PART C**: Clear draft on quiz completion and hard stop
- **PART D**: Clear draft on signup (verify page)
- **PART E**: Backfill draft to Supabase on login (if ≥10 answers)

### Build
Clean — 0 errors

### Commit
14606e6 — feat: quiz navigation fixes + draft save system for anonymous users

---

## SESSION — Landing Page: Flag Hero + Nav Fix + FAQ (June 9, 2026)

### Completed
- **Nav.tsx**: Solid dark background (rgba(10,10,10,0.95)), correct 5 links (How it works, Learn, Pricing, Simulator, Log in), gold border CTA button, readable text, mobile hamburger with all links
- **NavBar.tsx**: Updated to match — solid background, correct links, gold border CTA
- **HomeClient.tsx**: American flag SVG hero background (red/white/blue stripes, 5-pointed stars via polygon, left fade to #0a0a0a, bottom fade), text shadows for readability over flag
- **HomeClient.tsx**: FAQ accordion section — 6 questions, single-open pattern, +/− toggle, between testimonials and final CTA
- **/learn page**: Already exists as hub with 6 article sub-pages (kept as-is)

### Build
Clean — 0 errors

---

## SESSION — Rebrand: e2go → E2go (June 9, 2026)

### Completed
- Display name changed from "e2go" to "E2go" across all UI copy
- 63 files changed, 153 insertions / 153 deletions
- Logo text, page titles, metadata, FAQ copy, email templates, legal disclaimers, footer text, PWA prompts, manifest.json
- NOT changed: URLs, file paths, import paths, variable names, localStorage keys, API routes, CSS classes, email addresses

### Build
Clean — 0 errors

### Commit
eba36d9 — rebrand: e2go → E2go throughout app UI and metadata

---

## SESSION — Landing Page Redesign (June 9, 2026)

### Completed
- **Hero**: Investor portrait (investor-man.png) added alongside flag, blends into dark background via luminosity mix-blend-mode + gradient fades
- **Mistakes**: Full-width horizontal rows with 120px watermark numbers, gold left accent bar, italic serif titles, gridTemplateColumns: 100px 1fr
- **How it works**: 72px step numbers, horizontal connecting thread (1px line at top:4px), thread dots (filled gold for steps 0-2, empty for step 3)
- **What's included**: Hero feature (case analysis engine + document-binder.png in 1fr 360px grid) + 5-card row with watermark numbers, optional note field
- **Testimonials**: 180px background quote marks, 40px portrait thumbnails (investor-man, investor-woman, couple-documents), gold hairline dividers

### Images
All 6 Gemini-generated images in public/images/:
- investor-man.png — hero portrait + testimonial
- investor-woman.png — testimonial
- couple-documents.png — testimonial
- document-binder.png — hero feature
- franchise-exterior.png — reserved
- consulate.png — reserved for /learn page

### Build
Clean — 0 errors

### Commit
51b2808 — feat: landing page redesign — portrait hero, row mistakes, connected steps, hero feature, testimonial photos

---

## SESSION — Landing Page: Complete Rebuild (June 9, 2026)

### Completed
- **HomeClient.tsx**: Fully self-contained — no external component imports (NavBar, JourneyWizard, FeatureGrid all removed)
- **Sections**: Nav (sticky, hamburger mobile), Hero (flag SVG, stats grid), Proof bar, Mistakes (4 rows with watermark numbers), How it works (4 steps with connecting thread), Journey wizard (3 dropdowns, traditional vs E2go timeline comparison), What's included (hero feature + 5 cards), Interview simulator, Founder note, Testimonials (3 quotes), FAQ (7 items accordion), Final CTA, Footer
- **Layout**: Removed global Nav/Footer from layout.tsx to prevent duplicate rendering (HomeClient is self-contained)
- **Deleted**: src/components/landing/NavBar.tsx, JourneyWizard.tsx, FeatureGrid.tsx

### Design system
- Background #0a0a0a throughout
- Gold #C9A84C for all accents, CTAs, active states
- Cormorant Garamond for all headings
- DM Sans for all body text
- Zero border-radius anywhere
- No glassmorphism, no shadows, no gradients
- Pricing: From $550 correct

### Mobile audit — ALL 16 ITEMS PASS
1. Nav hamburger visible at 390px, full nav at 768px+ ✅
2. Hero headline readable at 390px ✅
3. Hero buttons full width at 390px, side by side at 640px+ ✅
4. Stats 2x2 grid at 390px, 4 columns at 768px+ ✅
5. Mistakes rows full width, adequate padding ✅
6. How it works 1 col at 390px, 2 at 768px, 4 at 1024px+ ✅
7. Journey wizard dropdowns full width at 390px ✅
8. Journey wizard timeline stacked at 390px ✅
9. Features hero 1 col at 390px, 2 at 768px+ ✅
10. Feature cards 1 col at 390px, 2 at 640px, 5 at 1024px+ ✅
11. Testimonials 1 col at 390px, 3 at 768px+ ✅
12. FAQ accordion works at 390px ✅
13. Final CTA buttons full width at 390px ✅
14. Footer stacked at 390px, 3 columns at 768px+ ✅
15. No horizontal scroll at any breakpoint ✅
16. All touch targets min 44px ✅

### Build
Clean — 0 errors

### Commit
191ea7c — feat: landing page complete rebuild — self-contained, mobile-first, mistakes section, premium sections
