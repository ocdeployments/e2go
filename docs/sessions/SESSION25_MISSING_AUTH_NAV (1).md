# SESSION 25 — Missing Navigation Bar on Authenticated Pages (/dashboard)

**Branch:** dev
**Priority:** 🔴 CRITICAL — `/dashboard` (and likely other authenticated
pages) renders ONLY a "Sign Out" link — no nav bar, no links to
/simulator, /learn, /pricing, /apply, etc. This is a NEW finding,
independent of the Chen/ocdeployments data investigation (Sessions
13/19/20/24) — confirmed present on BOTH test accounts. Without
navigation, authenticated users cannot reach most of the app via UI.

**Agent:** engineering-code-reviewer (investigation) +
engineering-frontend-developer (fix)
**Read before starting:** none specific — fresh investigation. Note: the
LOGGED-OUT landing page nav (How it works | Learn | Pricing | Simulator)
IS working correctly — use it as the reference for what authenticated
nav SHOULD also contain (plus authenticated-only items: Dashboard, Sign
Out, etc.)

---

## CONTEXT

Owner screenshots of `/dashboard` (both `michael.chen.test@e2go-uat.com`
and `ocdeployments@gmail.com`, post Session 24's fixes) show ONLY:
- `E2go.app` logo (top left)
- `Sign Out` (top right)

NO nav links (Simulator, Learn, Pricing, How it works, Dashboard, etc.)
anywhere. Compare to the logged-OUT homepage, which has a full working
nav bar with these links.

This BLOCKS reaching `/simulator` via UI — which is what this entire
investigation chain (Sessions 13/19/20/24) has been trying to get to.
**This may be the actual reason "Simulator" seemed unreachable all
along** — not gating logic (Session 12), not data linkage (Session
13/20/24), but simply: there's no link to click.

---

## STEP 1 — INVESTIGATE: WHERE IS THE NAV SUPPOSED TO RENDER?

1. Find the layout component(s) for authenticated pages — likely
   `src/app/(authenticated)/layout.tsx`, `src/app/dashboard/layout.tsx`,
   or a shared `AppLayout`/`AuthenticatedLayout` component. Compare
   against the layout used for the logged-out landing page (likely
   `src/app/layout.tsx` + `HomeClient.tsx`'s own nav, or a shared `Nav`
   component)
2. Is there a SEPARATE nav component for authenticated vs. unauthenticated
   views? If so — does the authenticated one exist, render an EMPTY
   state, or not get included in the layout at all?
3. Is this a RECENT regression — check git log for recent changes to
   layout/nav files. Given the scope of recent sessions (11-24, many
   touching `/learn`, `/simulator`, dashboard-adjacent code) — did any
   session inadvertently modify a SHARED layout file? Cross-reference:
   - Session 12 modified `src/app/simulator/page.tsx` (+187 lines) —
     could this have affected a shared layout if `SimulatorTeaser` or
     related code lives in/imports from a layout file?
   - Session 15 modified homepage/`/learn` structure — unlikely to touch
     authenticated layout, but check
   - Session 24 modified `src/app/login/page.tsx` — unlikely to affect
     POST-login layout, but check if it touches anything shared
4. `git log --oneline -- <layout file path>` for whatever file Step 1
   identifies as the authenticated nav's home — find when it last
   changed and what changed

---

## STEP 2 — WHAT SHOULD THE AUTHENTICATED NAV CONTAIN?

Based on the logged-out nav (How it works | Learn | Pricing | Simulator)
plus authenticated-specific needs:

1. Likely authenticated nav should include: **Dashboard** (home for
   logged-in users), **Simulator**, **Learn**, possibly **Pricing**
   (or not, if already a customer), plus **Sign Out** (already present)
2. Check if there's a DESIGN/SPEC reference for what the authenticated
   nav was SUPPOSED to look like — search BUILD_TRACKER/CLAUDE_CONTEXT
   for "authenticated nav", "app nav", "dashboard nav", or similar. If
   no spec exists, agent proposes a reasonable set based on the route
   list in CLAUDE_CONTEXT (/dashboard, /apply, /simulator, /documents,
   /score, /settings)

---

## STEP 3 — FIX

Based on Step 1's findings:

- **If the nav component exists but isn't INCLUDED in the authenticated
  layout** — include it
- **If the nav component exists but renders EMPTY for authenticated
  users** (e.g. a conditional that filters out all items when
  `isAuthenticated === true` due to a logic error) — fix the
  conditional
- **If NO authenticated nav component exists at all** (genuinely never
  built) — build one, reusing the visual style/structure of the
  logged-out nav (Obsidian Gold, same typography/spacing) but with
  Step 2's authenticated-appropriate links

Whichever case — this affects ALL authenticated pages (not just
`/dashboard`), so the fix should be at the LAYOUT level, not per-page.

---

## STEP 4 — VERIFY

1. Log in (either test account) → `/dashboard` → nav bar now shows with
   working links
2. Click through EACH nav link — confirm `/simulator`, `/learn`, etc.
   all navigate correctly from within the authenticated shell
3. Confirm `/simulator` is NOW reachable — and once reached, per Session
   12/24's logic, resolves to teaser (ocdeployments, no case file) or
   real StartScreen (Chen, has case file) as appropriate
4. Check OTHER authenticated pages (`/apply`, `/documents/[id]`,
   `/settings` if it exists) — confirm nav present there too (since the
   fix should be layout-level, this should be automatic, but verify)
5. Confirm logged-OUT nav (homepage) STILL works correctly — fix
   shouldn't have broken the working reference implementation
6. Mobile + desktop
7. npm run build clean (rm -rf .next + kill port 3000 as needed)

---

## DO NOT IN THIS SESSION

- Do not modify the LOGGED-OUT nav's working implementation except as a
  REFERENCE — don't refactor it, just look at it
- Do not touch Chen/ocdeployments account DATA — this is a UI/layout fix,
  unrelated to the data investigation
- Do not address the "50% vs expected higher %" dashboard discrepancy
  noted separately (Image 2) — that's a DIFFERENT potential issue, only
  relevant if it persists AFTER nav is fixed and /simulator is actually
  reachable to test against. Note it for a future session if still
  relevant, don't investigate now.

---

## COMPLETION REPORT

```
SESSION 25 — Authenticated nav bar fix complete.

STEP 1: Nav location: [layout file]
  Root cause: [missing entirely / empty render / not included in layout
    / other]
  Git history — recent change identified: [commit + what changed, or
    "no recent change found, may be longstanding"]

STEP 2: Authenticated nav links decided: [list]
  Based on: [existing spec found / proposed based on route list]

STEP 3: Fix: [describe — layout-level change, files modified]

STEP 4: VERIFY
  /dashboard nav now visible: [yes/no]
  All nav links navigate correctly: [yes/no, list any that don't]
  /simulator now reachable via nav: [yes/no]
    Resolves correctly per account (teaser/StartScreen): [describe both]
  Other authenticated pages have nav: [list pages checked]
  Logged-out nav still works: [yes/no]
  Mobile/desktop: [confirmed]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]

NOTE FOR FUTURE: Chen's dashboard showed "50% Complete" with
Quiz/Score/Simulator unchecked despite 27 answers + case brief
(Sessions 13/20/24's verified state) — flagged but NOT investigated
per this session's scope. Revisit if it still looks wrong once
/simulator is reachable and tested.
```
