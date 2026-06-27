# SESSION 27 — Dashboard Stuck on "Loading..." (Post Session 25)

**Branch:** dev
**Priority:** 🔴 CRITICAL — Session 26 confirmed login/redirect now works
(reaches `/dashboard` successfully). BUT `/dashboard` itself now renders
a literal "Loading..." text (Obsidian Gold styled — intentional UI, on
the page per Session 25's `<Nav />`-inclusion changes) that never
resolves. Page is otherwise blank/black.

**Agent:** engineering-code-reviewer (trace) + engineering-minimal-change
(fix)
**Read before starting:** Session 25's completion report (specifically:
`src/app/dashboard/page.tsx` — "Removed inline header + unused
handleSignOut"; `src/app/dashboard/layout.tsx` — "Added `<Nav />` to
passthrough layout")

---

## CONTEXT

Session 26 confirmed: login → redirect to `/dashboard` now WORKS (no
hang in login flow). The "stuck on loading" symptom owner is STILL
seeing is on `/dashboard` ITSELF — a "Loading..." text element (matches
Obsidian Gold styling — Cormorant Garamond, gold-toned, per screenshot)
that never clears.

This is almost certainly a SESSION 25 SIDE EFFECT — it removed code from
`dashboard/page.tsx` (inline header + `handleSignOut`) and changed
`dashboard/layout.tsx` (added `<Nav />`, changed from whatever it was to
a "passthrough layout"). Most likely: a data-fetch/loading-state
`useEffect` in `dashboard/page.tsx` either:
- Had its completion/error handling accidentally removed alongside the
  header code (if they were near each other / intertwined)
- OR depends on something `layout.tsx` used to provide (e.g. auth
  context, user data) that the "passthrough layout" change altered

---

## STEP 1 — FIND THE "Loading..." TEXT AND ITS STATE

1. Search `src/app/dashboard/page.tsx` (and `layout.tsx`) for the string
   "Loading" — find the exact JSX rendering this text, and the
   state/condition controlling it (e.g. `if (loading) return
   <div>Loading...</div>`)
2. Find what sets `loading` to `true` initially, and what's SUPPOSED to
   set it to `false` — typically a `useEffect` that fetches dashboard
   data (application info, quiz results, etc. — the data shown in
   Images 1/2 from earlier: "Application Progress," "Eligibility
   Status," "Module Progress," etc.)
3. Trace this fetch — what does it call (Supabase query? API route?),
   and where would `setLoading(false)` (or equivalent) be called on
   success/error

---

## STEP 2 — DIAGNOSE WHY IT DOESN'T CLEAR

Compare CURRENT `dashboard/page.tsx` against what it likely looked like
BEFORE Session 25 (git history — `git log -p -- src/app/dashboard/
page.tsx` or `git show <commit-before-session-25>:src/app/dashboard/
page.tsx`):

1. **If the loading-clearing logic was REMOVED alongside the header**
   (e.g. they were in the same `useEffect` or the header rendering was
   gating when the fetch happened) — this is a straightforward
   "restore the removed logic, minus the header-specific parts"
2. **If the fetch itself throws/fails silently** — check for a
   try/catch where the CATCH branch doesn't call `setLoading(false)`
   (only the success path does) — add `finally` or fix the catch
3. **If `dashboard/layout.tsx`'s "passthrough" change altered something
   the page depends on** (auth context, session prop, etc.) — e.g. if
   the OLD layout provided `user`/`session` as a prop/context that the
   page's fetch depended on, and the new passthrough layout doesn't —
   the fetch might be erroring on `undefined` before it can complete
4. Add temporary logging (same pattern as Session 26 — numbered traces)
   around the fetch and `setLoading` calls if needed to pin down exactly
   where it stops

---

## STEP 3 — FIX

Based on Step 2's finding. Likely a small, targeted fix:
- Restore/fix the loading-clearing logic
- Ensure BOTH success AND error paths clear `loading` (so even if the
  underlying fetch has an issue, the user sees an ERROR state, not an
  infinite spinner — infinite spinners should be treated as a bug
  regardless of the underlying cause)

---

## STEP 4 — VERIFY

1. Remove any temporary logging (Step 2.4)
2. Fresh/incognito browser, log in as `ocdeployments@gmail.com` →
   `/dashboard` loads fully (per Image 1's layout: Application Progress,
   Eligibility Status, Module Progress, Quick Actions, etc. — now WITH
   Session 25's `<Nav />` visible too)
3. Same for `michael.chen.test@e2go-uat.com`
4. Click **Simulator** in the now-visible nav — THIS IS THE MOMENT —
   confirm it's reachable and resolves per Session 12/24's logic
   (teaser for ocdeployments, StartScreen for Chen)
5. npm run build clean (rm -rf .next + kill port 3000 first)

---

## DO NOT IN THIS SESSION

- Do not modify Session 26's login fix (already confirmed working —
  login/redirect is NOT the problem)
- Do not modify Session 25's `<Nav />` component itself unless Step 2
  specifically traces the issue THERE (vs. dashboard's own data-fetch
  logic)
- Do not address Image 2's "50% vs expected" discrepancy yet — but ONCE
  /simulator is reachable (Step 4.4), if Chen's dashboard numbers still
  look inconsistent with 27 answers + case brief, NOTE it for a focused
  follow-up (don't fix in this session — separate concern)

---

## COMPLETION REPORT

```
SESSION 27 — Dashboard stuck-loading fixed.

STEP 1: Loading state location: [file, line]
  Controlled by: [state variable]
  Set to false by: [function/useEffect — what was SUPPOSED to clear it]

STEP 2: Diagnosis: [removed-alongside-header / silent-catch / layout-
  passthrough-dependency / other]
  Git comparison confirms: [describe what changed vs pre-Session-25]

STEP 3: Fix: [describe]
  Files modified: [...]
  Error path now also clears loading: [yes/no/N/A]

STEP 4: Verification
  ocdeployments /dashboard loads fully (Image 1 layout + Nav): [yes/no]
  Chen /dashboard loads fully: [yes/no]
  Simulator reachable via nav, resolves correctly per account:
    ocdeployments → [teaser/StartScreen/other]
    Chen → [teaser/StartScreen/other]
  Temporary logging removed: [confirmed]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]

NOTE (if applicable): Chen's dashboard numbers vs expected (27 answers +
case brief) — [matches expectation / still looks off, flag for
follow-up]
```
