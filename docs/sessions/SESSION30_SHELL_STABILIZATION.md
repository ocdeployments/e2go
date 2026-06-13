# SESSION 30 — Authenticated Shell Stabilization (Dashboard + Simulator)

**Branch:** dev
**Priority:** 🔴 CRITICAL, COMPREHENSIVE — after Sessions 25-29, the
authenticated app shell has three remaining issues:
1. `/dashboard` FLICKERS (Loading → "Start your application" → Loading
   → repeat, very fast) — a re-render/re-mount loop
2. `/simulator` still STUCK on Loading — singleton fix (Session 29)
   didn't resolve it
3. ONE remaining GoTrueClient duplication warning (down from 2, still 1)

This session fixes ALL THREE together. Do NOT scope narrowly — the
previous pattern of fixing one thing per session has caused repeated
regressions because fixes interact. One agent, full picture, stabilize
the shell completely.

**Agent:** engineering-code-reviewer + engineering-minimal-change +
engineering-code-reviewer (second pass before claiming fixed)
**Read before starting:** Sessions 25-29 completion reports in full —
understand ALL changes made to dashboard/page.tsx, dashboard/layout.tsx,
simulator/page.tsx, Nav.tsx, src/lib/supabase.ts before touching
anything

---

## CONTEXT — WHAT EACH SESSION DID (read these files directly to
confirm current state before starting)

- Session 25: added `<Nav />` to dashboard/learn/simulator/settings/
  documents layouts. Root of the duplicate-client problem.
- Session 26: fixed login/page.tsx — uses `signInData?.user` from
  `signInWithPassword`, removed redundant `getSession()`
- Session 27: added try/catch/finally to dashboard/page.tsx init() —
  meant to fix stuck loading, but didn't address the real cause
- Session 28: pulled client-singleton fix into supabase.ts (module-level
  singleton), fixed simulator/page.tsx + quick-start/page.tsx
- Session 29: confirmed singleton fix committed (b6a24b8), confirmed
  /results works (no Nav, single client), confirmed root cause is
  duplicate clients causing awaits to hang

**CURRENT SYMPTOMS:**
- /dashboard: FLICKERS — Loading → "Start your application" →
  Loading → repeat (re-render loop, not a simple hang)
- /simulator: STUCK on Loading (no flicker, just hangs)
- Console: still 1 GoTrueClient warning (one duplicate remains)

---

## STEP 0 — READ CURRENT STATE OF ALL AFFECTED FILES

Before changing ANYTHING, view these files in their CURRENT state:
1. `src/lib/supabase.ts` — is the singleton pattern from Session 29
   actually correct? A module-level `let browserClient = null` singleton
   ONLY works correctly in a Next.js App Router context if the module
   is properly scoped to client-side only. Server components importing
   this file will get a DIFFERENT module instance than client components.
   Confirm: is this file marked `'use client'` or guarded against server-
   side execution? If not — this could be the remaining duplicate-client
   source.
2. `src/components/Nav.tsx` — how is it creating its Supabase client?
   Does it use the shared singleton from supabase.ts, or still its own
   `createBrowserClient` call? (Per Session 29's trace: Nav.tsx:29 was
   still creating its own — was this fixed in Session 29 or only the
   page-level files?)
3. `src/app/dashboard/page.tsx` — full view. Specifically:
   - What is the `useEffect` dependency array?
   - Is `supabaseClient` (or whatever the client variable is named)
     IN the dependency array? If YES — and if the singleton returns a
     NEW object reference on each call (even if it's the same underlying
     client) — this would cause the useEffect to re-run on every render,
     creating the FLICKER
   - Is there an `onAuthStateChange` subscription anywhere in this
     file? If yes — does it call `setState` in its callback without
     being properly cleaned up? This is a classic React loop source.
4. `src/app/simulator/page.tsx` — same questions as dashboard
5. `src/app/dashboard/layout.tsx` — does it do anything beyond render
   `<Nav />{children}`? Any data-fetching, auth checks, or redirects
   that could UNMOUNT the dashboard page component mid-render?

---

## STEP 1 — FIX THE FLICKERING DASHBOARD (re-render loop)

Based on Step 0's findings — most likely cause: the `useEffect` that
calls `init()` has a dependency that changes every render. Common culprits:

### Fix A — If supabase client is in the dependency array:
The singleton from `supabase.ts` should always return the EXACT SAME
object reference (not a new object each time). Verify `createBrowserSupabaseClient()` returns `browserClient` (the cached instance) on every call after initialization — not a new object. If it returns a new object — the singleton is broken (perhaps `null` check is wrong, or the module IS being re-executed). Fix the singleton to guarantee reference stability.

### Fix B — If useEffect has NO dependency array (runs every render):
Add `[]` — run once on mount only. The init/fetch should only run once, not on every state update.

### Fix C — If there's an `onAuthStateChange` subscription:
This fires whenever auth state changes — including when the singleton
fix causes auth tokens to refresh. If the subscription calls `setState`
in its callback, and that setState triggers a re-render, which triggers
the subscription callback again... this is the loop. Fix: either remove
the subscription if it's not needed for dashboard functionality, or
ensure its setState call is guarded (only updates if value actually
CHANGED, using functional setState or a comparison).

### Fix D — If dashboard/layout.tsx does auth checks that redirect/remount:
A layout that conditionally redirects based on auth state WHILE the
page is rendering can cause rapid mount/unmount cycles. If this is
happening — the auth check in the layout needs to be resolved BEFORE
rendering children, not during.

---

## STEP 2 — FIX THE SIMULATOR STUCK LOADING

With the dashboard flicker diagnosed/fixed, apply the SAME diagnostic
to `/simulator/page.tsx`:

1. Add temporary logging: `console.log('[SIM] useEffect fired')`,
   `console.log('[SIM] init started')`, then after each await in init()
2. Reproduce: navigate to /simulator after fixing dashboard, watch
   console
3. Find exactly WHERE it hangs now (post-singleton-fix — it may be a
   different point than before)
4. Apply targeted fix based on finding — reuse the same try/catch/finally
   pattern IF the hang is a rejection; if it's still an await-that-
   never-resolves, trace which specific await and why

---

## STEP 3 — FIX THE REMAINING GoTrueClient WARNING

Per Step 0's investigation:
1. Identify which file is STILL creating its own client (likely Nav.tsx
   if Session 29 didn't fix it, or a layout file)
2. Switch it to the shared singleton
3. Confirm warning disappears from console after fix

---

## STEP 4 — VERIFICATION (MANDATORY, NO SHORTCUTS)

The pattern of "build clean = verified" has caused repeated regressions.
This time:

1. `rm -rf .next`, `lsof -ti:3000 | xargs kill -9`, `npm run dev`
2. Use Playwright to automate the verification flow:
   a. Navigate to `http://localhost:3000/login`
   b. Fill email + password for `ocdeployments@gmail.com`
   c. Click login button
   d. Wait for navigation to settle (not just "navigated to /dashboard"
      but STABLE — wait for the loading state to resolve, e.g.
      `waitForSelector` on a specific element that only appears when
      dashboard data has loaded, like "Application Progress" text or the
      Module Progress section)
   e. Screenshot `/dashboard` — must show real content, NOT "Loading..."
      AND must be stable (not flickering — wait at least 2-3 seconds
      after initial render to confirm no flicker)
   f. Click "Simulator" in nav
   g. Wait for `/simulator` to load (same — wait for stable render, not
      just "navigated")
   h. Screenshot `/simulator` — must show teaser (no case file) OR
      StartScreen (has case file), NOT "Loading..."
3. Repeat for `michael.chen.test@e2go-uat.com` — `/simulator` should
   show StartScreen (27 answers + case brief)
4. Check console in Playwright run — confirm NO "Multiple GoTrueClient
   instances detected" warning
5. Remove all temporary console.logs (Steps 1-2)
6. Commit ALL fixes as a SINGLE clean commit (not per-step)
7. Push to origin/dev

---

## CRITICAL RULES FOR THIS SESSION

1. **No claiming "verified" without Playwright screenshots in the
   report** — build passing is necessary but not sufficient
2. **Read BEFORE writing** — Step 0 is mandatory, not optional
3. **One commit at end** — not per micro-fix
4. **If Playwright crashes** (per Session 29's report) — use manual
   dev-tools approach: add a `performance.mark('dashboard-stable')` at
   the point where the dashboard reaches stable render, watch for it in
   console — at minimum, report console output AS EVIDENCE, not just
   "I believe it works"
5. **If the fix for dashboard flicker requires significant restructuring**
   of how auth/data-fetching works across the authenticated shell —
   PROPOSE the approach, describe the scope, and ASK before implementing
   something large. Don't disappear into a major refactor.

---

## COMPLETION REPORT

```
SESSION 30 — Authenticated shell stabilization.

STEP 0: Current file state (before changes):
  supabase.ts singleton — correct, stable reference: [yes/no/describe]
  Nav.tsx client creation — uses singleton: [yes/no — if no, was this
    the remaining GoTrueClient source?]
  dashboard/page.tsx useEffect deps: [list deps]
  dashboard/page.tsx onAuthStateChange: [present/absent]
  dashboard/layout.tsx — does anything beyond Nav+children: [describe]
  simulator/page.tsx useEffect deps: [list deps]

STEP 1: Dashboard flicker root cause: [Fix A/B/C/D — describe]
  Fix: [describe]
  Files modified: [list]

STEP 2: Simulator stuck-loading
  Logging output — stopped at: [which await/step]
  Root cause: [...]
  Fix: [describe]
  Files modified: [list]

STEP 3: Remaining GoTrueClient source: [file]
  Fixed: [yes/no]

STEP 4: VERIFICATION (EVIDENCE REQUIRED)
  Playwright/console evidence: [describe screenshots captured or
    console output proving stability]
  /dashboard stable, real content, no flicker: [YES with evidence /
    NO]
  /simulator teaser (ocdeployments): [YES with evidence / NO]
  /simulator StartScreen (Chen): [YES with evidence / NO]
  No GoTrueClient warnings: [YES / still present — which file]
  Temporary logs removed: [confirmed]
  Committed + pushed: [commit hash]

Build: clean / errors: [list or none]

OVERALL STATUS: [STABLE / still issues — describe]

MILESTONE: /simulator reachable and functional for both account types:
  [YES — confirmed with evidence / NO — what remains]
```
