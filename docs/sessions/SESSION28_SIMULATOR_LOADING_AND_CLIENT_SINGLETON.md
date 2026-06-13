# SESSION 28 — /simulator Stuck on Loading (Same Pattern as Session 27)
+ Supabase Client Singleton

**Branch:** dev
**Priority:** 🔴 CRITICAL — `/dashboard` now loads correctly (Session
27). `/simulator` exhibits the SAME stuck-loading symptom. Additionally,
browser console shows "Multiple GoTrueClient instances detected" —
`/simulator/page.tsx` AND `src/components/Nav.tsx` (Session 25, new)
each independently call `createBrowserClient`/`createClient`, creating
two Supabase auth clients on the same storage key. Fix both — the
duplicate-client issue may be a CONTRIBUTING cause of the stuck-loading
(unexpected auth-state behavior → query throws → unhandled, per Session
27's exact diagnosis pattern).

**Agent:** engineering-code-reviewer (trace) + engineering-minimal-change
(fix)
**Read before starting:** Session 27's completion report (the
try/catch/finally + cancelled-flag pattern applied to
`dashboard/page.tsx` — REUSE this exact pattern for `/simulator/page.tsx`
if Step 1 confirms the same root cause)

---

## CONTEXT

Console trace (fresh login → `/dashboard` loads fine → click Simulator →
`/simulator` → stuck "Loading...", same as Session 27's symptom):

```
GoTrueClient.js:133  Multiple GoTrueClient instances detected...
  (one instance created in page.tsx:22, another in Nav.tsx:29 via
  supabase.ts's createBrowserSupabaseClient)
Navigated to http://localhost:3000/simulator
[stuck loading]
```

Two issues, likely related:

1. **Stuck loading on `/simulator`** — same SHAPE as Session 27's
   `/dashboard` bug: a `loading` state set to `true` initially, an
   init/fetch function that's supposed to call `setLoading(false)`,
   but only on a success path (no try/catch/finally)
2. **Duplicate Supabase clients** — `/simulator/page.tsx` line 22
   creates a client directly via `createClient`; `Nav.tsx` line 29
   creates ANOTHER via `createBrowserSupabaseClient` (from
   `src/lib/supabase.ts` or similar) — same storage key
   (`sb-cziphinlzfnlqlvynwnm-auth-token`), two GoTrueClient instances.
   Supabase's own warning: "may produce undefined behavior when used
   concurrently under the same storage key."

---

## STEP 1 — FIX #1: STUCK LOADING ON /simulator (apply Session 27's
pattern)

1. View `src/app/simulator/page.tsx` — find the `loading` state, the
   init/fetch function (likely checking `hasCaseFile` per Session 12 —
   querying `answers`/`case_briefs` for the current user's application),
   and confirm: is `setLoading(false)` only called on a SUCCESS path,
   with no try/catch/finally? (Same pattern as Session 27's
   `dashboard/page.tsx` finding)
2. Apply the SAME fix pattern Session 27 used:
   - Wrap init body in try/catch/finally
   - `setLoading(false)` in `finally` — always runs
   - Add cancelled-flag + cleanup for unmounted-component safety
   - `console.error` in catch for debugging
3. This should make `/simulator` show EITHER Session 12's teaser, the
   real StartScreen, OR (if there's a genuine underlying error) an error
   state — but NOT hang forever, regardless of Step 2's fix

---

## STEP 2 — FIX #2: SUPABASE CLIENT SINGLETON

1. Find the canonical Supabase browser-client creation — likely
   `src/lib/supabase.ts` (per the trace: `createBrowserSupabaseClient`
   defined here, called from `Nav.tsx`)
2. Find ALL places in the codebase that call `createClient` or
   `createBrowserClient` directly (NOT via the shared
   `createBrowserSupabaseClient` helper) — `grep -rn
   "createBrowserClient\|createClient" src/` — `/simulator/page.tsx`
   line 22 is one; there may be others across the codebase (this could
   be a WIDESPREAD pattern, not just these two files — Session 25's
   `<Nav />` being added to MANY layouts means Nav's client creation now
   runs alongside EVERY page's own client creation, if pages create
   their own)
3. **Fix**: ensure there's ONE shared client-creation function
   (`src/lib/supabase.ts`'s `createBrowserSupabaseClient` or equivalent)
   and ALL client components use IT — not separate `createClient`
   calls. For files calling `createClient` directly, replace with the
   shared helper's import + call.
4. **Scope check**: given this is potentially WIDESPREAD (every page
   Session 25 added `<Nav />` to, if that page ALSO creates its own
   client) — list ALL files found in Step 2.2, fix the ones that are
   CLIENT COMPONENTS creating BROWSER clients (server components/server
   clients are a different pattern, likely fine, don't conflate). If the
   list is large, prioritize: `/simulator/page.tsx` (this session's
   focus) + any other pages with `<Nav />` (Session 25's list:
   dashboard, learn, simulator, settings, documents) — confirm each of
   THESE specifically, full codebase sweep is a bonus if time permits
   but not blocking

---

## STEP 3 — VERIFY

1. npm run build clean (rm -rf .next + kill port 3000 first)
2. Fresh/incognito browser:
   - `ocdeployments@gmail.com` → `/dashboard` (Session 27, still works)
     → click Simulator → `/simulator` → **Session 12's teaser** (no
     case file) — confirm NO "Multiple GoTrueClient" warning in console
   - `michael.chen.test@e2go-uat.com` → `/dashboard` → click Simulator
     → `/simulator` → **real StartScreen** (27 answers + case brief) —
     confirm NO "Multiple GoTrueClient" warning
3. If ocdeployments → teaser → "Upload your documents instead" →
   Session 14's quick-start flow — confirm this ALSO loads without
   hanging (same client-creation pattern may exist in quick-start's
   page too — check if Step 2's fix covers it, or if it's a separate
   file needing the same treatment)
4. Confirm `/dashboard` (Session 27) STILL works after Step 2's
   singleton change — Nav.tsx's client creation is shared across ALL
   pages with `<Nav />`, so this fix touches dashboard too; don't
   regress it

---

## DO NOT IN THIS SESSION

- Do not modify Session 26's login fix or Session 27's dashboard fix —
  only REUSE Session 27's pattern for simulator
- Do not do a full codebase-wide Supabase client refactor beyond Step
  2.4's scoped list unless trivial — note additional instances found for
  a future cleanup session if the list is large
- If Step 1's fix reveals a SPECIFIC underlying error (e.g. a genuinely
  missing table/column, an RLS issue) — REPORT it, don't necessarily fix
  the underlying data/schema issue in THIS session (that could be yet
  another investigation) — the PRIORITY is "stop hanging, show
  teaser/StartScreen/error appropriately"

---

## COMPLETION REPORT

```
SESSION 28 — /simulator stuck-loading + Supabase client singleton fixed.

STEP 1: /simulator's loading state — same pattern as Session 27:
  [confirmed yes/no]
  Fix applied: [describe, files modified]
  Underlying error revealed (if any) after fix: [describe, or "none —
    resolves cleanly to teaser/StartScreen"]

STEP 2: Supabase client creation audit
  Direct createClient/createBrowserClient calls found: [list files]
  Canonical shared helper: [file/function name]
  Files fixed to use shared helper: [list]
  Additional instances found but NOT fixed (future cleanup): [list or
    none]

STEP 3: Verification
  ocdeployments → /simulator → teaser, no GoTrueClient warning: [yes/no]
  Chen → /simulator → StartScreen, no GoTrueClient warning: [yes/no]
  Quick-start flow (ocdeployments, if reached) loads without hang:
    [yes/no/not-reached]
  /dashboard still works post-singleton-fix: [yes/no]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]

MILESTONE CHECK: Is /simulator now FULLY reachable and functional for
BOTH the real-StartScreen path (Chen) and teaser→quick-start path
(ocdeployments)? [yes/no — if no, what remains]
```
