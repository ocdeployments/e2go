# E2go QA Audit Report

---

## Session 51 — Category-Driven Horizontal Audit + Per-Page Pass

**Date:** 2026-06-21 | **Tester:** Claude (code audit — no live browser)  
**Branch:** `dev` | **Build status:** ✅ Clean  
**Methodology:** 7 horizontal sweeps (systemic bug categories) + per-page audit of all previously unaudited routes

### Session 51 Summary

| Category | Count |
|---|---|
| Pages audited this session | 18 (auth flow, module2, module4, upload flow, simulator, documents) |
| Bugs found | 5 |
| Bugs fixed | 5 |
| Commits | 4 |
| Migration debt noted | 1 (module2 columns — in migration file, verify remote applied) |

### Session 51 Bugs Found & Fixed

#### BUG-QA-01 (P2) — `/api/applications/[applicationId]` route missing
**Page:** `/generate/[applicationId]`  
**Root cause:** `generate/[applicationId]/page.tsx:298` calls `/api/applications/${applicationId}` for header display data. No such route existed — directory was missing entirely.  
**Fix:** Created `src/app/api/applications/[applicationId]/route.ts` with auth + ownership check, returns `applicant_name`, `business_name`, `investment_amount`, `state` from applications table. `city`/`consulate`/`nationality` returned as null (page handles null gracefully).  
**Status:** ✅ Fixed & committed

#### BUG-QA-02 (P3) — `/support` page has no Nav
**Page:** `/support`  
**Root cause:** `src/app/support/layout.tsx` returned `children` only — Nav component never rendered.  
**Fix:** Added `import Nav from "@/components/Nav"` to layout, wrapped children. Added `paddingTop: "80px"` to support page's main element (Nav is position:fixed height 64px).  
**Status:** ✅ Fixed & committed

#### BUG-QA-03 (P2) — `/verify` resend button silently does nothing on expired token
**Page:** `/verify`  
**Root cause:** When `verifyToken()` returns `valid: false`, `verifiedData` stays null. The error state's "Resend results" button calls `handleResend()`, which immediately returns because `verifiedData?.quiz_session_id` is null. User clicks the button and nothing happens — no feedback, no error.  
**Fix:** Conditioned the resend button on `verifiedData?.quiz_session_id` being truthy. When the token is invalid (and we have no session ID), shows "Please retake the quiz to get a new results link" instead.  
**Status:** ✅ Fixed & committed

#### BUG-QA-04 (P2) — Module 4 Screen 3 stuck loading forever on API failure
**Page:** `/apply/module4`  
**Root cause:** If `handleGenerateQuestions` fetch fails, `questions` stays `[]` and `isLoadingQuestions` becomes `false`. Render condition `isLoadingQuestions || questions.length === 0` evaluates to `true` forever — user sees "Reviewing your application..." indefinitely.  
**Fix:** Added `questionsError` state; set it in the catch block. Screen 3 now renders an error message with a "Try Again" button before the loading check.  
**Status:** ✅ Fixed & committed

#### BUG-QA-05 (P2) — Module 4 Screen 4 empty summary with no explanation
**Page:** `/apply/module4`  
**Root cause:** If `handleGetSummary` fetch fails, `summary` stays `[]`. Screen 4 renders "Here is what we found." with an empty bullets list — user sees nothing and doesn't know why.  
**Fix:** Added `summaryError` state; set it in catch and when `data.summary` is empty. Screen 4 now shows a fallback message: "Your answers have been saved. We were unable to generate a summary — your documents will still incorporate all your responses."  
**Status:** ✅ Fixed & committed

### Session 51 Sweeps Completed

| Sweep | Description | Result |
|---|---|---|
| 1 — DB Schema vs Code | Already complete from prior session | N/A (prior session) |
| 2 — Nav Link Validity | Already complete from prior session | N/A (prior session) |
| 3 — Layout + Nav | Already complete from prior session | N/A (prior session) |
| 4 — Migration Completeness | Already complete from prior session | N/A (prior session) |
| 5 — API Route Existence | Already complete from prior session | N/A (prior session) |
| 6 — Hardcoded Dynamic Content | Dollar amounts and emails scanned | ✅ PASS — all hardcoded strings are legitimate static content |
| 7 — Async + Error State Coverage | 28 async handlers across app pages reviewed | ✅ PASS — patterns consistent; 2 gaps found and fixed (BUG-QA-04/05) |

### Session 51 Pages Audited

| Route | Status | Notes |
|---|---|---|
| `/login` | ✅ Pass | Timeout, double-submit, smart routing, quiz session linking — all clean |
| `/signup` | ✅ Pass | CAPTCHA, scroll-to-accept ToS, loading overlay, CASL consent |
| `/forgot-password` | ✅ Pass | Security-phrased response ("if account exists"), `?error=expired` param supported |
| `/reset-password` | ✅ Pass | Session check, loading state, success screen, expired link fallback |
| `/verify` | ✅ Pass | BUG-QA-03 fixed — resend button now conditional on having session ID |
| `/terms-required` | ✅ Pass | Smart scroll detection, double-submit guard, `/api/auth/accept-terms` route exists |
| `/apply/module2` | ✅ Pass | 6-step flow, auth check, Module 1 gate, all DB columns verified in migration 20260605160000 |
| `/apply/module4` | ✅ Pass | BUG-QA-04+05 fixed — error states for question/summary fetch failures |
| `/apply/upload` | ✅ Pass | validateFile() function, MAX_FILES_PER_SESSION, file deduplication |
| `/apply/upload/processing` | ✅ Pass | SSE streaming, per-doc error events, stale-closure-safe ref for discrepancy count |
| `/apply/upload/review` | ✅ Pass | Clean wrapper with missing-param guard |
| `/apply/upload/gaps` | ✅ Pass | Clean wrapper with missing-param guard |
| `/simulator/quick-start` | ✅ Pass | Auth check, SSE extraction with error handling, error message with "return to simulator" |
| `/simulator/case-file` | ✅ Pass | Auth check, auto-resolve applicationId if missing from URL |
| `/simulator/interview-day` | ✅ Pass | Auth check, loading state |
| `/simulator/outcome` | ✅ Pass | Error state, navigation to dashboard and gap-analysis |
| `/documents/[applicationId]` | ✅ Pass | Loading, error, download state machine (locked→ready→downloading→complete) |
| `/generate/[applicationId]` | ✅ Pass | BUG-QA-01 API route now exists; comprehensive error handling throughout |

### Session 51 Migration Debt Noted

| Item | Status |
|---|---|
| `applications.business_shortlist`, `specific_business_description`, `experience_gap_flag` | In migration `20260605160000_module2_business_advisor.sql` — verify was applied to remote DB if module 2 has not been tested end-to-end |

### Session 51 Dead Code Noted (P3 — no action required)

The download button in `/documents/[applicationId]/page.tsx:455` sends `Authorization: Bearer ${userId}` where userId is a plain user ID (not a JWT). The download API route ignores this header entirely — auth comes from Supabase cookies via `createSupabaseServerClient()`. The header is dead code. No security issue, but confusing.

---

## Sessions 49–50 — (prior session record below)

**Sessions:** 49–50 | **Date:** 2026-06-21 | **Tester:** Claude (automated browser audit)  
**Branch:** `dev` | **Build status:** ✅ Clean  
**Environment:** `localhost` dev server, logged in as James Windsor (test account)

---

## Summary

| Category | Count |
|---|---|
| Pages audited | 32 |
| Bugs found | 7 |
| Bugs fixed this session | 6 |
| DB migrations applied | 3 |
| Pages passing | 32/32 |
| Build warnings (lint) | Pre-existing — not new |

---

## Bugs Found & Fixed

### BUG-01 — Module 1 redirects to dashboard instead of loading
**Page:** `/apply/module1`  
**Severity:** Critical  
**Root cause:** `quiz_sessions` table queried with `.order("created_at")` but that column doesn't exist. Supabase error → fallback redirect to `/quiz` → quiz detects completed state → redirect to `/dashboard`.  
**Fix:** `src/app/apply/module1/page.tsx` line ~100 — changed `.order("created_at", ...)` → `.order("id", { ascending: false })`  
**Status:** ✅ Fixed & verified

---

### BUG-02 — Pricing page shows add-on tiers before main plans
**Page:** `/pricing`  
**Severity:** High  
**Root cause:** DB returns tiers ordered by amount ASC; add-on tiers ($29.99 simulator sessions, $50 additional child) have lower amounts than main plans ($550, $697) so they sorted first.  
**Fix:** `src/app/pricing/PricingClient.tsx` — added filter: only render tiers whose `tier_id` starts with `solo_` or `partnership_`  
**Status:** ✅ Fixed & verified

---

### BUG-03 — About page had no navigation bar
**Page:** `/about`  
**Severity:** Medium  
**Root cause:** No `layout.tsx` existed for the `/about` route group, so `<Nav />` was never rendered.  
**Fix:** Created `src/app/about/layout.tsx` with `<Nav />`. Updated `src/app/about/page.tsx` padding `pt-8` → `pt-20` to account for fixed nav height.  
**Status:** ✅ Fixed & verified

---

### BUG-04 — Module 3 sidebar footer hardcoded "Tab A • Module 3"
**Pages:** `/apply/module3/a`, `/e`, `/i`, `/k`  
**Severity:** Low  
**Root cause:** `TabSidebar.tsx` had a hardcoded string with no prop for the current tab label.  
**Fix:** Added `tabLabel?: string` to `TabPageProps` interface → `TabPage` → `TabSidebar`. Each tab page now passes the correct label (e.g. `tabLabel="Tab K • Module 3"`).  
**Status:** ✅ Fixed & verified

---

### BUG-05 — Compliance Calendar page blank (missing DB columns)
**Page:** `/apply/calendar`  
**Severity:** High  
**Root cause:** Migration `20260605120000_timeline_dates.sql` was never pushed to remote Supabase. Columns `working_target_date` and `confirmed_interview_date` did not exist on the `applications` table. Supabase returned error 42703; code silently swallowed it; `timeline` stayed null; page rendered empty.  
**Fix:** Applied migration directly via Supabase Management API:
- Added `working_target_date DATE` to `applications`
- Added `confirmed_interview_date DATE` to `applications`
**Status:** ✅ Fixed & verified

---

### BUG-06 — `calendar_items` table missing (no migration existed)
**Page:** `/apply/calendar` (specific dates mode)  
**Severity:** Medium  
**Root cause:** No migration file existed for the `calendar_items` table. The "Lock In Deadlines" flow (confirmed date mode) would fail when trying to upsert calendar items.  
**Fix:** Created `supabase/migrations/20260621000000_calendar_items.sql` and applied to remote DB:
- `calendar_items` table with `application_id`, `item_type`, `due_date`, `status`
- RLS policy scoping to authenticated user's applications
- Unique constraint on `(application_id, item_type)`
**Status:** ✅ Fixed & verified

---

### BUG-07 — `/documents` returns 404
**Page:** `/documents` (Nav link, calendar "Next: Documents →" button)  
**Severity:** High  
**Root cause:** Documents route is at `/documents/[applicationId]/page.tsx`. No root `/documents/page.tsx` existed. Direct nav to `/documents` returned 404.  
**Fix:** Created `src/app/documents/page.tsx` — server component that reads the user's most recent application ID and redirects to `/documents/{applicationId}`. Falls back to `/apply` if no application found.  
**Status:** ✅ Fixed & verified

---

## Pages Audited — Full Status

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Pass | Home page loads, CTA buttons work |
| `/about` | ✅ Pass | Nav now present (BUG-03 fixed) |
| `/pricing` | ✅ Pass | Main plans shown first (BUG-02 fixed) |
| `/learn` | ✅ Pass | Ask E2go AI loads with sample questions |
| `/dashboard` | ✅ Pass | Progress, checklist, next steps |
| `/settings` | ✅ Pass | Export data, delete account |
| `/simulator` | ✅ Pass | Practice tab, unlock message |
| `/gap-analysis` | ✅ Pass | Score 64/100, denial risk radar |
| `/fdd` | ✅ Pass | Empty state with "Analyse an FDD" CTA |
| `/fdd/upload` | ✅ Pass | Transaction type, location, drop zone |
| `/fdd/compare` | ✅ Pass | Empty state "Select at least 2 FDDs" |
| `/documents` | ✅ Pass | Now redirects to user's document package (BUG-07 fixed) |
| `/apply` (hub) | ✅ Pass | Sections with completion %, priority panel |
| `/apply/overview` | ✅ Pass | James Windsor profile, section cards |
| `/apply/checklist` | ✅ Pass | Personalised checklist generated from answers |
| `/apply/calendar` | ✅ Pass | Date input + 3-phase items (BUG-05/06 fixed) |
| `/apply/module1` | ✅ Pass | Step 1 of 6 onboarding (BUG-01 fixed) |
| `/apply/story` | ✅ Pass | Pre-filled answers, voice input, word count |
| `/apply/business` | ✅ Pass | Entity & Registration, auto-save |
| `/apply/investment` | ✅ Pass | 5 tabs including Financial Projections |
| `/apply/qualifications` | ✅ Pass | Background + education pre-filled |
| `/apply/family` | ✅ Pass | Spouse, Children, Documents & Logistics tabs |
| `/apply/ties` | ✅ Pass | Property, Community, Obligations, Return Intent |
| `/apply/module3` (hub) | ✅ Pass | All 8 tabs listed |
| `/apply/module3/a` | ✅ Pass | TabPage with correct label "Tab A • Module 3" |
| `/apply/module3/b` | ✅ Pass | Document checklist with "View My Checklist" |
| `/apply/module3/c` | ✅ Pass | Visa Category Confirmation Letter |
| `/apply/module3/d` | ✅ Pass | Cover letter questions, one-at-a-time |
| `/apply/module3/e` | ✅ Pass | Ownership Structure, TabPage label correct |
| `/apply/module3/i` | ✅ Pass | Non-Marginality Evidence, "Tab I • Module 3" |
| `/apply/module3/j` | ✅ Pass | Qualifications intro, Begin button |
| `/apply/module3/k` | ✅ Pass | Business Plan, "Tab K • Module 3" |

---

## Redirects Verified (Expected Behaviour)

| Route | Redirect target | Status |
|---|---|---|
| `/apply/module3/g` | `/apply/business` | ✅ Correct |
| `/apply/module3/h` | `/apply/investment` | ✅ Correct |
| `/apply/module3/l` | `/apply/family` | ✅ Correct |

---

## Deferred / Out of Scope

| Item | Notes |
|---|---|
| FDD Territory page `/fdd/territory/[fddId]` | No FDD analyses exist for James — can't test without uploading Assisting Hands PDF |
| Document generation | Requires completed Module 3 — James's tabs are partial |
| Simulator full session | Requires Module 3 completion to unlock |
| `quiz/profile`, `quiz/review` | Public-facing quiz flow — not logged-in state tested |
| `pricing/success` | Stripe webhook dependent |
| React hook lint warnings | Pre-existing — `useCallback` dependency arrays — not new, no functional impact |

---

## DB State After This Session

| Change | Method | Status |
|---|---|---|
| `applications.working_target_date DATE` | Supabase Management API | ✅ Applied |
| `applications.confirmed_interview_date DATE` | Supabase Management API | ✅ Applied |
| `calendar_items` table + RLS + index | Supabase Management API | ✅ Applied |
| Migration file `20260621000000_calendar_items.sql` | Created locally | ✅ Saved |

---

## Files Changed This Session

| File | Change |
|---|---|
| `src/app/apply/module1/page.tsx` | `.order("created_at")` → `.order("id", { ascending: false })` |
| `src/app/pricing/PricingClient.tsx` | Filter tiers to `solo_*` / `partnership_*` tier_ids only |
| `src/app/about/layout.tsx` | **Created** — wraps page in `<Nav />` |
| `src/app/about/page.tsx` | `pt-8` → `pt-20` |
| `src/types/module3.ts` | Added `tabLabel?: string` to `TabPageProps` |
| `src/components/module3/TabSidebar.tsx` | Added `tabLabel` prop, replaced hardcoded string |
| `src/components/module3/TabPage.tsx` | Passes `tabLabel` through to `TabSidebar` |
| `src/app/apply/module3/a/page.tsx` | `tabLabel="Tab A • Module 3"` |
| `src/app/apply/module3/e/page.tsx` | `tabLabel="Tab E • Module 3"` |
| `src/app/apply/module3/i/page.tsx` | `tabLabel="Tab I • Module 3"` |
| `src/app/apply/module3/k/page.tsx` | `tabLabel="Tab K • Module 3"` |
| `src/app/documents/page.tsx` | **Created** — redirect to `/documents/{applicationId}` |
| `supabase/migrations/20260621000000_calendar_items.sql` | **Created** — `calendar_items` table migration |
