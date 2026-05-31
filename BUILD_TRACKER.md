# BUILD TRACKER

**Last Updated:** 2026-05-31
**Session:** 12 (Complete)

---

## Environment Variables

| Name | Description | Public/Server | Required |
|------|-------------|---------------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Public | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key (safe for browser) | Public | Yes |
| OPENROUTER_API_KEY | OpenRouter API key for MiniMax calls | Server | Yes |
| MINIMAX_MODEL | Model string (default: minimax/MiniMax-Text-01) | Server | No |
| NEXT_PUBLIC_SITE_URL | Site URL for AI referer header (default: http://localhost:3000) | Public | No |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL for rate limiting | Server | No |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST token for rate limiting | Server | No |

---

## Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js Build | ✅ PASS | Zero errors |
| TypeScript | ✅ PASS | No type errors |
| Middleware | ✅ PASS | Auth protection active |
| Schema | ⚠️ PENDING | Need unique constraint on answers table |
| Auth | ✅ PASS | Login/Signup wired |
| Quiz Engine | ✅ PASS | Scoring logic connected |
| AI Client | ✅ PASS | OpenRouter wired with auth |
| Playwright Tests | ✅ PASS | 45 tests passing |
| Module 3 Engine | ✅ PASS | Tab A complete with ApplicationContext |
| Husky Hooks | ✅ PASS | pre-push configured |

### Standing Build Rules

| Rule | Description |
|------|-------------|
| Rule 11 | One file per commit |
| Rule 12 | Verify with raw output |
| Rule 13 | Three states per feature |
| Rule 14 | QA snapshot before push |
| Rule 15 | No Canada-only assumptions |

---

## Completed This Session

| # | Task | Status |
|---|------|--------|
| 1 | Update CLAUDE_CONTEXT.md with new rules | ✅ |
| 2 | Update soul.md with approved copy | ✅ |
| 3 | Rename Module 2 to Your Business | ✅ |
| 4 | Update BUILD_TRACKER.md | ✅ |
| 5 | Update DOC_INDEX.md | ✅ |
| 6 | Add build:clean script | ✅ |
| 7 | Implement TabShell 4 screen states | ✅ |
| 8 | Update QuestionRenderer styling | ✅ |
| 9 | Wire screen states in Tab A | ✅ |
| 10 | Run diagnostic on Tab A | ✅ |
| 11 | Wire ApplicationContext in Tab A | ✅ |
| 12 | Add explicit error handling | ✅ |
| 13 | Add unique constraint to schema | ✅ |
| 14 | Full QA test pass | ✅ |

---

## Known Issues

| Issue | Priority | Fix |
|-------|----------|-----|
| Answers table missing unique constraint | CRITICAL | Run SQL in Supabase: ALTER TABLE public.answers ADD CONSTRAINT answers_application_question_unique UNIQUE (application_id, question_key); |
| Partnership page limit unconfirmed | HIGH | Email EVisaCanada@state.gov |
| 131-question spec not reconciled with Tabs A-L | HIGH | Reconcile before building tab content |
| Frankfurt compression mode not built | MEDIUM | Build when generation engine starts |
| Dev server defaults to port 3001 | LOW | Document in CLAUDE_CONTEXT.md |
| Quiz currency rate sometimes fails | LOW | Fallback to 0.73 works |

---

## New Features Discovered

- Playwright smoke tests covering all public routes
- Husky pre-push hook runs tsc + build + playwright
- Dashboard shows real user data from quiz_sessions and application_lifecycle
- Onboarding flow with 5-step wizard (welcome, app type, family, consent, ready)
- CAD/USD live conversion on investment question with cached rate
- Module 3 Document Interview Engine scaffold (ApplicationContext, TabShell, QuestionRenderer)
- Tab A with 12 DS-160 reference questions
- /api/answers with auth, validation, auto-save (2s debounce)
- Answer key format: M3-[A-L]-[00-99] locked

---

## Session 3 Log

**Date:** May 29, 2026
**Session:** 3

**Completed:**
- Installed Playwright, wrote smoke tests for 6 public routes + auth + API
- Installed Husky, configured pre-push hook for tsc + build + playwright
- Added npm run qa script to package.json
- Rewired dashboard to pull from quiz_sessions + application_lifecycle (not demo data)
- Created /apply/onboarding with 5-step wizard flow
- Created /apply/module2 placeholder
- Added CAD/USD live conversion to quiz Q0-05 using open.er-api.com
- All 8 Playwright tests passing

**Key Decisions:**
- Used BASE_URL 3001 in tests (dev server uses 3001 when 3000 occupied)
- Onboarding uses demo=true bypass for testing without payment
- Currency rate cached on mount, fallback to 0.73 if fetch fails

**Left Incomplete:**
- Full manual flow test (would need test user + Stripe)
- Real onboarding save to Supabase (demo mode skips some saves)

---

## Session 4 Log

**Date:** May 29, 2026
**Session:** 4

**Completed:**
- Audited all env vars, added to BUILD_TRACKER.md
- Created vercel.json with build config
- Installed @upstash/redis, replaced in-memory rate limiter in /api/ai
- Added /api/health endpoint returning { status, timestamp, version }
- Completed Module 2: Business Type Advisor with 6 screens (category, stage, franchise, state, premises, confirmation)
- Created Module 3 placeholder
- Pushed to GitHub: https://github.com/ocdeployments/e2go
- All 8 Playwright tests passing, build passes

**Key Decisions:**
- Redis fails open if Upstash not configured
- Business categories from Vol 3 Section 6.9 spec
- Three states (loading, success, empty) per feature per Rule 13
- Port 3000 for dev server (not 3001) to match tests

---

## Session 5 Log

**Date:** May 30, 2026
**Session:** 5

**Completed:**
- ApplicationContext with auto-save (2s debounce), resume support
- /api/answers route with auth, validation, upsert
- questionKeyValidator (M[0-3]-[A-L]-[0-9]{2} format)
- visibilityRules.ts (placeholder, grows with tabs)
- useAutoSave hook
- QuestionRenderer component (single/multi/text/number/date)
- TabShell component (progress bar, save status, navigation)
- Tab A questions config (12 questions from ds/spec)
- Tab A page (/apply/module3/a) with auth check
- Dynamic routes: /apply/module3 → /a, [tab] validation
- Module 3 Playwright tests (18 new tests)
- All 42 tests passing (24 smoke + 18 module3)
- Pushed to dev branch

**Key Decisions:**
- Tab A uses local answer state with debounced API saves (not ApplicationContext to avoid SSR issues)
- Client-side redirects for auth (useEffect) — tests adjusted accordingly
- Question key format: M3-[A-L]-[00-99] locked

**Module 3 engine scaffold:** complete
**Tab A:** complete
**Answer key convention:** M3-[A-L]-[00-99] locked
**Tabs B-L:** not started

---

## Session 6 Log

**Date:** May 31, 2026
**Session:** 6

**Completed:**
- Fixed Vercel routing conflict: removed dynamic [tab] route, created individual pages for tabs b-l
- Added profile safety check in Tab A page.tsx before application insert
- All 45 tests passing (24 smoke + 21 module3)
- Pushed to dev branch

**Key Decisions:**
- Individual tab pages (b-l) instead of dynamic route to avoid Vercel conflict
- Safety check: upsert profile before inserting application to prevent FK violations

---

## Session 7 Log

**Date:** May 31, 2026
**Session:** 7

**Completed:**
- CLAUDE_CONTEXT.md: added currency, global positioning, consulate selector rules
- CLAUDE_CONTEXT.md: added Platform Boundaries, Lawyer Positioning, Revenue Streams sections
- docs/soul.md: added approved landing page copy and franchise nudge framing
- BUILD_TRACKER.md: added standing rules summary and research assets section
- DOC_INDEX.md: added research assets and treatyCountries entries
- package.json: added build:clean script
- TabShell.tsx: implemented 4 screen states (INTRO, QUESTION, COMPLETION, RESUME)
- QuestionRenderer.tsx: updated styling to InvestmentDESIGN.md tokens
- module3/a/page.tsx: wired screen states, ApplicationContext, explicit error handling
- Ran full diagnostic on Tab A failures
- Schema: added UNIQUE (application_id, question_key) to answers table
- All 45 tests passing

**Key Decisions:**
- InvestmentDESIGN.md tokens: success-teal #0D9488, surface-container-high #dce9ff, border-subtle #E2E8F0
- ApplicationContext now provides shared state for all Module 3 tabs
- Explicit error handling with console logging for Supabase errors

**Key decisions and research findings:**

Document architecture:
- Two-batch model finalized and locked
- Paywall triggers after personal tabs complete
- Batch 1: 4 documents generated immediately
- Batch 2: remaining documents as prerequisites met
- Cover Letter always last — pipeline corrected
- 50-page limit confirmed: ca.usembassy.gov
- Frankfurt exception: 30 pages, 5MB, exec summary only
- London exception: 20MB upload cap
- Per-document page targets locked for solo apps
- Partnership page limit UNCONFIRMED — flag open

Research confirmed — no rebuild needed:
- Franchise categories: E2_Franchise_Categories_Section5.md
- Platform logic rules: E2_Platform_Logic_Rules.md
- Document builder spec: E2_Document_Builder_Spec.md
- Attorney review register: E2_Attorney_Review_Register.md
- 131 Module 3 questions already specified in Vol 3

New items discovered in research:
- Financial projections spreadsheet (.xlsx) missing from document plan — added
- Translation requirements guide — added
- Timeline and appointment guide — added
- Master submission checklist — added
- Loan structure denial risk D-12 — new Tab F question
- TD Bank / RBC named as banking referral partners
- Wise / OFX / Knightsbridge as wire transfer partners
- Toronto family attendance: 2025 mandatory requirement
- Australian E-3 alternative option to surface in quiz
- 131 questions in Groups 3A–3I need reconciliation with Tab A–L structure before building tab content

Partnership rules confirmed:
- Negative Control: 9 FAM 402.9-6(F)
- Two partners 50/50 maximum
- Three or more: hard stop PR-PARTNER
- Submission format UNCONFIRMED — email EVisaCanada@state.gov

New spec files created:
- docs/Document_Generation_Standards.md
- docs/Document_Conditionals.md

**Left Incomplete:**
- Supabase SQL: unique constraint needs to be run manually in SQL Editor
- Full end-to-end test on preview URL

## Session 8 Priorities

1. RECONCILE: Read Groups 3A-3I question spec against Tab A-L structure. Map questions to tabs. Identify gaps. Do this before writing any tab question content.
2. PROTOTYPE: Generate 4 Word documents for Sarah Mitchell using Document_Generation_Standards.md
3. FIX: Verify Module 3 Tab A working on Vercel (FK + unique constraint — confirm fixed)
4. BUILD: /apply/overview master orientation page
5. BUILD: Sidebar navigation in TabShell
6. BUILD: Three-phase checklist /apply/checklist
7. ADD: PR-PARTNER hard stop to quiz (3+ equal partners)
8. UPDATE: Module 2 franchise matching uses E2_Franchise_Categories_Section5.md directly
9. ADD: Tab F loan structure question (D-12 denial risk)
10. PWA setup + QR code on landing page

---

## Session 11 Log

**Date:** May 31, 2026
**Session:** 11

**Completed:**
- Sensitive field placeholder mode: added sensitivity field (high/medium/low) to QuestionConfig
- Skip toggle for high/medium sensitivity fields in QuestionRenderer (DOB, SIN, SSN, address, phone)
- Debounced autosave: changed from 2s to 800ms per spec
- Question helper text in tab-a.json reviewed and updated to conversational language
- All 45 tests passing, build clean, pushed to dev

**Key Decisions:**
- Skip toggle shows "Not comfortable sharing this here? Skip for now — I will fill this in myself"
- Skipped fields show "No problem — we will leave a space in your document that you can fill in yourself before submitting."
- Sensitivity levels: high (always show skip), medium (show but not prominent), low (no skip)

**Files Changed:**
- src/components/module3/QuestionRenderer.tsx (sensitivity + skip toggle)
- src/components/module3/TabShell.tsx (interface update)
- src/contexts/ApplicationContext.tsx (800ms debounce)
- src/data/module3/tab-a.json (sensitivity data + conversational language)
- src/app/apply/module3/a/page.tsx (interface update)

---

## Session 12 Log

**Date:** May 31, 2026
**Session:** 12

**Completed:**
- Privacy Category System: replaced sensitivity with privacy_category (red/amber/green/required)
- RED fields show modal with specific advisory on skip
- AMBER fields show inline note on skip
- GREEN fields show simple "No problem" message
- REQUIRED fields show brief explanation, no skip option
- Added 9 new questions from attorney intake (social media, parents, passport loss, US travel, countries visited, US relatives, green card history, drivers license, prior visa)
- Updated all Tab A questions with privacy_category and skip_advisory per spec
- Schema: added skipped_by_user and privacy_category columns to answers table
- PWA Setup: manifest.json, service worker (cache-first static, network-first API)
- PWA install prompt: handles both Android (beforeinstallprompt) and iOS (manual instructions)
- Service worker registration component
- Added PWA meta tags to layout
- All 45 tests passing, build clean, pushed to dev

**Key Decisions:**
- Privacy category replaces sensitivity per Session 12 CORE PRINCIPLE
- RED: modal with specific consequence advisory
- AMBER: inline note about what skipping affects
- GREEN: simple reassurance, no advisory
- REQUIRED: name and nationality only (no skip)

**Files Changed:**
- src/components/module3/QuestionRenderer.tsx (privacy category system)
- src/components/module3/TabShell.tsx (interface update)
- src/data/module3/tab-a.json (21 questions with privacy categories)
- src/app/apply/module3/a/page.tsx (interface update)
- docs/schema_complete.sql (answers table columns)
- public/manifest.json, public/sw.js (PWA)
- src/components/PWAInstallPrompt.tsx, ServiceWorkerRegistration.tsx (PWA)
- src/app/layout.tsx (PWA meta tags)
- src/app/page.tsx (install prompt on landing)

**Commits:**
- 9d5aa86 QuestionRenderer.tsx: privacy_category system
- 48c384b TabShell.tsx: interface update
- e3f33de tab-a.json: privacy categories per spec
- 6b155fc module3/a/page.tsx: interface update
- e097f99 schema_complete.sql: answers columns
- 3db71d9 PWA: manifest.json and service worker
- f962370 PWA: install prompt and registration
- 02c1c45 layout.tsx: PWA meta tags
- c0d65b7 page.tsx: PWAInstallPrompt on landing

---

## Session 13 Priorities

1. Wire actual questions into Tabs B-L (currently scaffolds only — need real question configs)
2. Franchise matching flow in Module 2
3. Sidebar navigation in TabShell
4. Stripe paywall integration
5. Batch 1 document generation engine (first pass)

**Commits:**
- f40fa9d QuestionRenderer.tsx: add sensitivity field and skip toggle
- 579b8d0 TabShell.tsx: add sensitivity field to interface
- d5eb7cd ApplicationContext.tsx: change debounce from 2s to 800ms
- 09b13a8 tab-a.json: add sensitivity levels and conversational language
- 5f90b99 module3/a/page.tsx: add sensitivity to interface

---

## Session 12 Priorities

1. Wire Tab B-L question configs from updated specs (actual questions not just scaffolds)
2. Build franchise matching flow in Module 2
3. Build /apply/module3 sidebar navigation
4. Paywall — wire Stripe integration
5. Interview simulator Module 5 scaffold

---

---

## Phase 1 Scope Boundary

**Phase 1 (in progress):** Modules 0–3, auth, dashboard, document generation, PDF export, Stripe, Vercel deploy.

**Phase 2 (backlog only):** B2B portals (/partner/attorney, /partner/broker), /learn hub, compliance calendar, renewal module, voice simulator, referral engine UI.

**Rule:** Any new feature request not in Phase 1 goes to the Phase 2 backlog. Trade-off must be stated before saying yes.

---

## Pre-Vercel Checklist

- [ ] All env vars added to Vercel dashboard (never via CLI — Rule from Careified)
- [ ] Supabase redirect URLs updated to include https://e2go.app and https://*.vercel.app
- [ ] Upstash Redis instance created, keys added to Vercel dashboard
- [ ] Custom domain e2go.app pointed to Vercel
- [ ] npm run qa passes clean
- [ ] npm run build passes clean
- [ ] /api/health returns 200 on preview URL
- [ ] Manual auth test on preview URL (signup → login → dashboard)

---

## Vercel Issues

- GitHub repo created: https://github.com/ocdeployments/e2go
- To complete Vercel deploy: link Vercel project to this repo in Vercel dashboard
- Manual steps needed: Add env vars to Vercel, create Upstash Redis if desired

---

## Research Assets

| File | Owns | Source |
|------|------|--------|
| docs/spec/E2_Community_Questions_Raw.md | Community question database, 315 questions | Perplexity research |
| docs/spec/E2_Answers_Part1_Eligibility_Investment.md | Verified answers categories 1-2 | Perplexity research |
| docs/spec/E2_Global_Consulate_Intelligence_Report_Part1.md | Global consulate intelligence, master table | Perplexity research |
| docs/spec/E2_Official_Knowledge_Base_Research.md | Official guidance compilation | Pending |
| Consulate fee research | Government fee schedule by country | Pending |

---

*Auto-generated by Claude Code during session end*