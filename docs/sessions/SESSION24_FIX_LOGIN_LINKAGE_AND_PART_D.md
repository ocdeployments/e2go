# SESSION 24 — Fix Login Quiz-Linkage Bug + Complete Part D
(ocdeployments)

**Branch:** dev
**Priority:** 🔴 HIGH — Session 20 found and worked around a real bug in
`src/app/login/page.tsx`: a fire-and-forget UPDATE linking
`quiz_sessions.user_id` to the logged-in user, with errors silently
swallowed. This is STILL BROKEN — Session 20 manually fixed Chen's two
existing quiz sessions via service-role UPDATE, but the BUG ITSELF will
produce the same NULL `user_id` for the next person who logs in after
taking the quiz (any new test account, eventually real users). Fix the
actual bug, then verify/fix `ocdeployments@gmail.com` (Session 20's Part
D was never completed for this account).

**Agent:** engineering-code-reviewer (investigation) +
engineering-minimal-change (fix)
**Read before starting:** Session 20's completion report (the relevant
finding: `src/app/login/page.tsx` lines ~52-57, fire-and-forget UPDATE on
`quiz_sessions` by email, swallowed errors)

---

## PART E — FIX THE LOGIN LINKAGE BUG (root cause, not just the instance)

### Step 1 — Understand current (broken) behavior
1. View `src/app/login/page.tsx` around lines 52-57 — confirm the exact
   current code: what triggers this UPDATE (on every login? only certain
   conditions?), what it's trying to do (link any `quiz_sessions` row
   matching the user's email to their `auth.uid()`), and confirm it's
   genuinely fire-and-forget (not awaited) with swallowed errors
2. Per Session 20: RLS policy on `quiz_sessions` allows
   `(auth.uid() = user_id OR user_id IS NULL)` for UPDATE — confirm this
   SHOULD permit the update to succeed. If RLS isn't the blocker, what
   is? (Session 20 said "likely RLS or auth-state timing issue" —
   pin down WHICH). Common candidates:
   - The update fires BEFORE `auth.uid()` is available client-side
     (timing — Supabase client session not yet hydrated at the moment
     this code runs)
   - The update uses the WRONG client (e.g. anon client without a
     session yet, vs. authenticated client)

### Step 2 — Fix properly
1. **Await the update** — no more fire-and-forget
2. **Don't swallow errors** — at minimum, log them (so Sentry — once
   Session 22 lands — would catch this); ideally surface in a way that
   doesn't block login if it fails, but DOES make the failure visible
3. **Fix the timing/client issue** identified in Step 1 — likely moving
   this logic to AFTER the session is confirmed established (e.g. in an
   `onAuthStateChange` callback, or after `await
   supabase.auth.getSession()` confirms the session is ready) rather
   than immediately on form submit
4. Consider: should this even be CLIENT-SIDE? An alternative is a
   SERVER-SIDE fix — e.g. a Postgres trigger/function that links
   `quiz_sessions.user_id` by email whenever a new `auth.users` row is
   created or on each login via a server action — removing the
   timing/RLS fragility of client-side linkage entirely. Agent: propose
   if this seems clearly better, but don't over-engineer — a correctly
   AWAITED client-side fix with proper error handling may be sufficient.
   Report which approach taken and why.

### Step 3 — Verify the fix works for a NEW case
This needs a scenario where a quiz session exists with NULL `user_id`
for an account, THEN that account logs in, and we confirm linkage
happens correctly:
- `ocdeployments@gmail.com` is a candidate IF it has the same NULL
  `quiz_sessions.user_id` issue (check as part of Part F below) — fixing
  the bug AND using this account's existing NULL session as the test
  case kills two birds
- If ocdeployments doesn't have this issue, agent may need another way
  to verify (e.g. manually create a test `quiz_sessions` row with NULL
  `user_id` and a known email, then simulate login — agent's judgment on
  cleanest verification approach)

---

## PART F — COMPLETE SESSION 20's PART D (ocdeployments@gmail.com)

Session 20 only covered Chen's account (Parts A-C). The original Part D
symptoms on `ocdeployments@gmail.com` were never checked:
- D1: dashboard showing progress cards where Session 13 found none
- D2: clicking "Simulator" in nav goes directly to `/dashboard` instead
  of teaser-or-real-simulator
- D3: "Welcome back ocdeployments@gmail.com" instead of a name

### Step 1 — Check quiz_sessions for this account
```sql
SELECT id, user_id, email, result_json, created_at
FROM quiz_sessions
WHERE email = 'ocdeployments@gmail.com' OR user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
```
- If `user_id IS NULL` for any rows matching this email — SAME bug as
  Chen's account. Apply the SAME service-role UPDATE fix Session 20 did
  for Chen:
  ```sql
  UPDATE quiz_sessions
  SET user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2'
  WHERE email = 'ocdeployments@gmail.com' AND user_id IS NULL;
  ```
- This directly explains D1 (dashboard now shows cards — because
  linking the quiz session means dashboard's query
  `.eq("user_id", authUser.id)` now finds it) and likely D2 (whatever
  redirect logic checks for "has this user done anything" now sees the
  linked quiz session)

### Step 2 — Check for duplicate applications (same pattern as Chen)
```sql
SELECT id, user_id, principal_name, business_name, status, created_at
FROM applications
WHERE user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
```
- Report count and details — per Session 20's pattern, this account may
  ALSO have multiple rows from repeated quiz-loop attempts during
  earlier testing
- Per Session 20's DO NOT — do NOT delete, report only, owner decides
  (likely the same manual cleanup pattern as Chen's 5 duplicates)

### Step 3 — Re-verify D2 and D3 after Step 1's fix
1. D2: with `quiz_sessions.user_id` now linked — does `/simulator` now
   correctly resolve to teaser-or-real-simulator (Session 12's logic)
   rather than redirecting to `/dashboard`? If STILL redirecting to
   `/dashboard` after the linkage fix — there's a SEPARATE issue beyond
   the quiz-linkage bug; investigate `/simulator/page.tsx`'s redirect
   logic directly
2. D3: check `principal_name` (or equivalent name field) for THIS
   account's application row(s) — per Session 20's finding pattern, is
   there a name, and if so why doesn't "Welcome back" show it? If NO
   name exists anywhere for this account (never entered) — confirm this
   is NOT a bug, just no data

---

## DO NOT IN THIS SESSION

- Do not delete any `applications` or `quiz_sessions` rows — report
  duplicates, owner decides (per Session 20's established pattern)
- Do not apply Session 14's migration (`applications_source_column.sql`)
  — that's a separate owner action already identified
- Do not over-engineer Part E's fix into a large refactor — fix the
  specific bug (await + error handling + timing), propose
  server-side-trigger ONLY if clearly simpler than fixing the client-side
  approach properly

---

## COMPLETION REPORT

```
SESSION 24 — Login linkage bug fixed + Part D complete.

PART E:
  Step 1: Root cause of original failure: [RLS / timing / wrong client
    / other — describe specifically]
  Step 2: Fix approach: [client-side awaited+error-handled / server-side
    trigger / other] — reasoning: [...]
    Files modified: [...]
  Step 3: Verification: [describe test case and result]

PART F:
  Step 1: ocdeployments quiz_sessions — NULL user_id found: [yes/no]
    If yes: fix applied (same UPDATE pattern): [confirmed]
  Step 2: Duplicate applications for ocdeployments: [count, ids, status —
    or "none found"]
  Step 3: D2 re-check after linkage fix: [/simulator now resolves
    correctly: yes/no — if no, separate issue found: describe]
    D3 re-check: [name exists but not shown: bug found / no name exists:
    not a bug]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]

REMAINING OWNER ACTIONS (unchanged from Session 20, plus any new from
Part F):
  1. Delete Chen's 5 blank duplicate applications (Session 20's list)
  2. Delete ocdeployments' duplicate applications if found in Part F
     (this session's list)
  3. Apply Session 14 migration (source column)
  4. Log out/back in on both test accounts to clear stale client state
```
