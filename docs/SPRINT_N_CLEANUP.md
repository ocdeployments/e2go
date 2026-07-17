# Sprint N — Codebase Cleanup & Access Polish

**Written:** July 17, 2026 (Session 128). **Branch:** dev — never commit to main.
**Audience:** the next agent. This document is self-contained — you do not need the
originating conversation. Read this top to bottom before touching anything.

---

## 0. Where this came from

Session 128 ran a full efficiency/duplication/access review across all 109 API
routes, 62 lib modules, 35 components, middleware, and the repo tree. Baseline
verified before any change: `tsc --noEmit` clean, `npx jest` 175/175 passing.

The access review confirmed Session 126's audit: ownership checks
(`eq('user_id', user.id)`), RLS, and admin middleware-gating are all in good
shape. The six routes with no auth are all legitimately public (`health`,
`_sentry-tunnel`, `verify-captcha`, `stripe/checkout` config-check,
`faq/ask` + `quiz/personalized-flags` — both IP-rate-limited, the LLM one
kill-switch-aware). Everything below is scoped cleanup, not firefighting.

**Explicitly out of scope (locked or deliberately deferred):**
- Module 3 fallback tabs a–e, i, j, k — locked "never delete"
- `module0_questions.json` / scoring JSON — locked
- Document-pipeline convergence (`uploaded_documents` vs `application_documents`)
  — both pipelines are load-bearing (simulator quick-start writes the legacy
  table); convergence needs its own sprint contract
- `dossier-pdf.ts` → `pdf-kit.ts` consolidation — medium risk, zero user value
- Splitting `generation-engine.ts` (3,543 lines) — do not split for the
  400-line rule's sake; the generation core stays untouched
- Sprint M-5 (schema consolidation) and M-6 (zod) — remain in Sprint M
- `checklist-builder.ts` vs `checklist-generator.ts` — checked, NOT duplicates
  (bracket-placeholder DOCX vs pre-app checklist data). Leave both.

---

## N-1 — Untrack build artifacts from git (ZERO RISK) 

**Problem:** ~20 root-level screenshot PNGs, `take-screenshot.js`,
`check-constraint.mjs`, `check-schema.mjs`, and `supabase/.temp/cli-latest`
are tracked in git even though `*.png` and `supabase/.temp/` are in
`.gitignore` — they were committed before the ignore rules existed. The
`cli-latest` file is why git status is permanently dirty with a CLI version
bump. `jest.config.js` is NOT part of this list — it is live config.

**Task:** `git rm --cached` (index only — files stay on disk), one commit.

**Acceptance:** `git ls-files | grep -E '\.png$'` returns nothing at repo
root; `git status` no longer shows `supabase/.temp/cli-latest` as modified.

## N-2 — Ignore `docs/generated-output/` (ZERO RISK)

**Problem:** Session 126 left two generated test PDFs untracked in
`docs/generated-output/` — build artifacts from `scripts/run-real-fdd.ts`,
not source.

**Task:** add `docs/generated-output/` to `.gitignore`. One commit.

## N-3 — Delete dead code (VERY LOW RISK)

**Problem:** files with zero references anywhere in `src/`, `scripts/`,
or tests (verified by name-grep, not just import-grep):

- ~~`src/lib/smoke.ts`~~ — **NOT dead, deletion reverted.**
  `tests/smoke/smoke.spec.ts` (Playwright, run via `npm run qa`) imports
  `SMOKE_ROUTES` from it. jest doesn't cover `tests/`, so the pre-commit
  hook passed on the deletion; `tsc --noEmit` caught it. Lesson: dead-code
  verification must include `tests/` and anything only `npm run qa` touches.
- `src/lib/timeline-service.ts` (128 lines)
- `src/lib/visibilityRules.ts` (28 lines)
- `src/components/faq-section.tsx` (216 lines — superseded by `FaqWidget`)

**Task:** delete, one file per commit. After each: `tsc --noEmit` clean +
jest 175/175 (pre-commit hook enforces jest).

## N-4 — Resolve `score-sync.ts` duplication (VERY LOW RISK)

**Problem:** `src/lib/score-sync.ts` is never imported, but
`src/components/PackageSummary.tsx` line ~92 says "Replicate score-sync.ts
logic" — the logic was copy-pasted into the component instead of imported.
The lib file is the dead copy; the component copy is live. Two copies can
drift.

**Task:** delete `src/lib/score-sync.ts`; update the PackageSummary comment
so it no longer points at a deleted file (state the logic inline is the
single source). One commit.

## N-5 — PWAInstallPrompt decision (RESOLVED — Romy chose delete)

**Problem:** `src/components/PWAInstallPrompt.tsx` (153 lines, the
"install E2go to your home screen" banner) was orphaned — never mounted, so
users never saw it.

**Resolution (July 17):** Romy decided to delete rather than mount. Mounting
would NOT have "just worked": `public/icons/` doesn't exist even though
`manifest.json` references `/icons/icon-192.png` and `icon-512.png` (so the
Android install prompt would never fire), the manifest `theme_color` is the
old teal `#0D9488`, and the component used banned design tokens (white
background, `#004ac6`, rounded corners). Deleted in commit `05c370b`.
`manifest.json`, `public/sw.js`, and `ServiceWorkerRegistration` in the root
layout remain — they work independently of the deleted banner. If PWA
install UX is ever revived, it needs a rebuild on the Obsidian Gold system
plus real icons, not a remount.

## N-6 — Sprint M-4 step 2: rate-limit the 5 uncovered LLM routes (LOW RISK, GATED)

**Problem:** carried over from Sprint M — `market-analysis/route.ts`,
`fdd/report/route.ts`, `fdd/territory/route.ts`, `fdd/compare/route.ts`,
`documents/extract/route.ts` never call `checkRateLimit`.

**GATE — do not start until confirmed:** the production redeploy that picks
up the `UPSTASH_REDIS_REST_URL` var added in Session 127 has actually
happened AND a live prod request to a rate-limited route (e.g.
`generate/start`) succeeds. The `generate`/`fdd` profiles fail CLOSED —
adding `checkRateLimit` to these routes while prod Redis is broken would
extend the 429-everything failure to five more routes.

**Task:** mirror the existing `checkRateLimit` call pattern from
`fdd/extract/route.ts` / `fdd/score/route.ts`. One route per commit.

## N-7 — Access polish (MEDIUM RISK — verify with real session)

Three items, in order:

1. **`src/app/api/generate/acknowledge/route.ts`** hand-parses the Supabase
   auth cookie with a fragile regex (line ~46) to reconstruct the cookie
   name. Rewrite to `createSupabaseServerClient` like the other 88 routes.
   Verify with a real logged-in session (curl with cookie or browser
   walkthrough on a QA account) — build-clean is NOT sufficient for an
   auth-path change.
2. **`src/app/documents/[applicationId]/page.tsx`** — last remaining
   `getSession()`; swap to `getUser()` per Supabase guidance (this closes
   the long-standing Known Issues entry). Verify the page still gates
   correctly for logged-out users.
3. **Consolidate the 6 inline `serviceClient()` definitions** in API routes
   to `createServiceClient()` from `src/lib/supabase-service.ts`. One route
   per commit. The broader 45-route inline-`createClient` sweep is optional
   and NOT part of this sprint's acceptance.

---

## Regression protocol (every task)

- Baseline: tsc clean, jest 175/175, `npm run build` clean (143+ pages).
- One concern per commit; pre-commit hook runs jest.
- After each phase: `tsc --noEmit` + `npm run build`; curl 200 on affected
  routes (Rule 0 free-verification stack — no Playwright).
- N-7 changes verified against a seeded QA account (test-uk / test-france).
- Anything unexpected → `git revert`, never patch forward.

## Suggested execution order

N-1 → N-2 → N-3 → N-4 (all safe, immediate) → check the N-6 gate →
N-6 if unblocked → N-7. N-5 waits on Romy.

## Status

- N-1: ✅ done — commit `ec21720`; git status clean, cli-latest no longer tracked
- N-2: ✅ done — commit `f672a59`
- N-3: ✅ done — timeline-service, visibilityRules, faq-section deleted;
  smoke.ts deletion reverted (live Playwright consumer — see N-3 note above)
- N-4: ✅ done — commit `8b4ec38`; score-sync.ts deleted, PackageSummary
  comment now names the component as single source of truth
- N-5: ⏳ open decision (Romy)
- N-6: 🔴 GATE FAILED — **`UPSTASH_REDIS_REST_URL` is EMPTY in Vercel
  Production** (verified July 17 via `vercel env pull`: var name exists,
  value length 0; the TOKEN pulls fine at 135 chars, so this is not a pull
  artifact). Session 127's `vercel env add` evidently captured an empty
  value, and the M-4 note that "Preview had it" is wrong — the URL exists
  in no environment and `.env.local` has only the TOKEN. Consequence:
  even after the July 16 production deploy, `generate/start`,
  `renewal/generate`, `fdd/extract`, `fdd/score` still 429 on every prod
  request (generate/fdd profiles fail closed). **Only Romy can fix:** copy
  the REST URL from console.upstash.com (database → REST API), run
  `vercel env rm UPSTASH_REDIS_REST_URL production` then `vercel env add
  UPSTASH_REDIS_REST_URL` for Production + Development (+ Preview), add it
  to `.env.local` too, then redeploy production. N-6's rate-limit rollout
  stays blocked until a post-fix prod request succeeds.
- N-7: ✅ done (item 2 closed as no-change-needed) —
  1. `generate/acknowledge` rewritten to `createSupabaseServerClient`
     (commit `6a2fd26`); verified live: logged-out POST → 401, logged-in
     POST with unknown application_id → 404.
  2. **No change needed** — the `getSession()` in
     `documents/[applicationId]/page.tsx` is client-side token retrieval
     for Bearer headers (server validates via `getUser(token)`); it was
     itself the deliberate F9 P0 fix (getAuthToken returned UUID → real
     JWT). `getUser()` can't return a JWT, so the originally proposed swap
     would break all six call sites. Item was a misdiagnosis.
  3. 7 local `serviceClient()` definitions consolidated to the shared
     `createServiceClient()` (6 identical lib copies + `dashboard/outcome`
     route, one commit each). `doctrine-retrieval.ts` deliberately left
     alone — its local copy memoizes the client, a real behavioral
     difference. Verified live: /case-profile dashboard APIs all 200,
     no console errors.

Phase 0/1 close-out verified July 17: `tsc --noEmit` clean, jest 175/175
per commit, `npm run build` clean (184 pages).

Sprint close-out July 17 (Session 128): all tasks done except N-6 (blocked
on the empty prod env var above). Final state: `tsc --noEmit` clean, jest
175/175, `npm run build` clean 184/184 pages.

---

## N-8 — Second orphan sweep (July 17, same session, after N-5 deletion)

Romy asked for the full refactoring audit to be re-run after the
PWAInstallPrompt deletion. Method: name-grep every component/hook/lib
basename across `src/`, `scripts/`, AND `tests/` (the smoke.ts lesson),
iterated to closure because deletions expose new orphans; candidates
confirmed via `git grep` on historical commits (all were last referenced by
the June 24–28 pre-K-1/K-2 dashboard, superseded by the rebuild).

**Deleted — 23 files, ~5,200 lines, jest 175/175 + tsc clean per commit:**

- `PWAInstallPrompt.tsx` (N-5, `05c370b`)
- First pass, 14 components (3 commits, 3,144 lines):
  `apply/{CaseFileHeader, DocumentUploadCard, GenerateStrip, QuestionPanel,
  SectionSideNav}`, `dashboard/{DashboardClient, EligibilityBadges,
  JourneySpine, LockedSectionCards}`, `journey/JourneyWizard`,
  `landing/FAQSection`, `results/{DocumentTeaser, OutcomeSummaryCard}`,
  `simulator/CaseGapsForm`
- Second pass, 6 files (1,808 lines): `PartialProfileTeaser.tsx`,
  `dashboard/{CaseCommandPanel, CaseRecordSection, FolderStack}.tsx`
  (only reachable from first-pass deletions), `hooks/useAutoSave.ts`,
  `hooks/useSpeechInput.ts` (live apply pages implement their own
  debounced autosave)
- `src/lib/strength-badges.ts` (64 lines; its only consumer was a deleted
  dashboard file)
- `public/data/treaty_countries.json` + `public/data/flag_explanations.json`
  (`79ab3ce`) — zero runtime references; everything imports from `src/data`

**Deliberately retained (do not re-flag as dead):**

- `src/lib/entitlements.ts` — orphaned in code, but it is the documented
  read-model for the parked pricing/packaging domain (the Stripe webhook
  comment names `getUserEntitlements()` as the intended reader). Pricing
  work is deferred until Romy initiates it; delete or wire up then.
- `src/lib/doctrine-retrieval.ts` local `serviceClient()` — memoizes, a
  real behavioral difference from the shared helper.

**Flagged for Romy — public/data module0 copies (LOCKED, untouched):**

`public/data/module0_questions.json` (June 18) has DIVERGED from the live
`src/data/module0_questions.json` (June 26) — the app imports the src copy;
the public copy is stale. `public/data/module0_scoring_logic.json` has no
src counterpart (a copy also sits at repo root). Both are publicly
downloadable at `e2go.app/data/…`, which exposes the scoring logic to
anyone. Recommendation when Romy is ready: confirm `src/data` +
root-level copies are the canonical locked artifacts, then remove the
`public/data` copies so the scoring logic is no longer world-readable.
Locked-file rule means this needs Romy's explicit go-ahead.

**Logged as follow-up (not done — auth-path churn at a critical stage):**

Six API routes contain the same inline Bearer-token parse
(`request.headers.get('Authorization')…replace('Bearer ', '')` +
`supabase.auth.getUser(token)`); only `dashboard/outcome` wraps it in a
`getAuthUser()` function. A shared `getBearerUser(request)` helper in
`src/lib` would remove the duplication, but it touches six auth paths and
each would need live verification — deferred to a future sprint.
