# BUILD TRACKER

**Last Updated:** 2026-05-31
**Session:** 6 (Complete)

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
| Schema | ✅ PASS | Pushed to Supabase |
| Auth | ✅ PASS | Login/Signup wired |
| Quiz Engine | ✅ PASS | Scoring logic connected |
| AI Client | ✅ PASS | OpenRouter wired with auth |
| Playwright Tests | ✅ PASS | 42 tests passing |
| Module 3 Engine | ✅ PASS | Tab A scaffold, auto-save, TabShell |
| Husky Hooks | ✅ PASS | pre-push configured |

### Standing Build Rules Added

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
| 1 | Vercel Deploy Prep - env vars audit + vercel.json | ✅ |
| 2 | Vercel Deploy Prep - @upstash/redis rate limiter | ✅ |
| 3 | Vercel Deploy Prep - /api/health endpoint | ✅ |
| 4 | Module 2: Business Type Advisor (6 screens) | ✅ |
| 5 | Module 3: Placeholder page | ✅ |
| 6 | GitHub push + repo created | ✅ |
| 7 | Full QA test pass | ✅ |

---

## Known Issues

| Issue | Priority | Fix |
|-------|----------|-----|
| Dev server defaults to port 3001 (tests need updating) | LOW | Document in CLAUDE_CONTEXT.md |
| Quiz currency rate sometimes fails to load on first render | LOW | Fallback to 0.73 works, UI shows "Enter amount in USD" |

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

## Session 7 Priorities

1. Run Supabase SQL to backfill missing profiles and recreate trigger
2. Test full auth flow on Vercel preview
3. Wire lifecycle updates on tab completion
4. Build Tab B-L (visibility rules + question configs)
5. Wire Stripe integration for payment

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