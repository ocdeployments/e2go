# SESSION 20 — Re-Investigate: Chen Linkage + Quiz Loop + ocdeployments
Account State

**Branch:** dev
**Priority:** 🔴 HIGH — Session 13 reported Chen's application correctly
linked and verified across all surfaces (dashboard, /apply, /documents,
/simulator). Owner now reports `michael.chen.test@e2go-uat.com` shows as
a brand-new account ("start your application"). SEPARATELY, a quiz loop
bug ("Start New Application" → quiz → loops back without completing) was
found on `ocdeployments@gmail.com` — and FURTHER TESTING on that same
account surfaced more symptoms (dashboard now shows progress cards where
Session 13 found none; "Simulator" nav link goes directly to /dashboard
instead of teaser-or-simulator; generic "Welcome back [email]" instead of
a name). Parts C and D are likely ONE root cause (the quiz loop creating
partial data) with multiple downstream symptoms — investigate together.

**Agent:** engineering-code-reviewer (read-only investigation first —
DO NOT re-apply Session 13's fix blindly; figure out CURRENT state and
WHAT CHANGED first)

**Read before starting:** Session 13's completion report (claimed fix:
`UPDATE applications SET user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d'
WHERE id = '9f981747-e3e4-4941-9f86-9871f8117b66'`)

---

## PART A — IS SESSION 13'S FIX STILL IN PLACE?

### Step 1 — Check current state of the specific row
```sql
SELECT id, user_id, principal_name, business_name, status
FROM applications
WHERE id = '9f981747-e3e4-4941-9f86-9871f8117b66';
```
Compare `user_id` against Session 13's target:
`a2b8f8c3-5f92-4b1d-863b-275648a74b4d`

- **If `user_id` STILL equals `a2b8f8c3-...`**: Session 13's fix IS in
  place at the DB level. The "looks like a new account" symptom is coming
  from somewhere ELSE — not a reverted linkage. Skip to PART C.
- **If `user_id` does NOT equal `a2b8f8c3-...`** (reverted, or something
  else): proceed to Step 2.

### Step 2 — If reverted, what is `user_id` NOW, and what changed it?
1. What is the CURRENT `user_id` value? Does it match Session 13's
   "before" value (`d654c937-d780-4e30-9388-5bfcd080c2d2`,
   `ocdeployments@gmail.com`'s old auth ID per Session 13)? Or something
   else entirely (a THIRD value)?
2. Check for anything between Session 13 and now that could write to
   `applications.user_id`:
   - Session 14's migration (`applications_source_column.sql`) — does
     it ALTER existing rows' `user_id`, or only ADD a new `source`
     column? (Should be the latter per its spec — confirm)
   - Session 14's `seed-test-applicant.ts` or similar — was it run
     again? (Session 13 identified THIS script as the original culprit
     — if it ran again post-Session-13 without the fix Session 13
     recommended for it, it could revert again)
   - The password-reset task — `auth.admin.updateUserById()` should
     ONLY touch `auth.users` (password hash), not `applications` table.
     Confirm no broader action was taken. Check git history / any
     command logs from that task if available.
   - Session 19's commit audit — did it run any SQL/migrations as part
     of "build verification"? (Per its spec, it shouldn't have — but
     confirm)
3. If the seed script (`seed-test-applicant.ts`) is confirmed as having
   run again with the SAME bug Session 13 found (grabs "currently
   authenticated user" instead of explicit target) — THIS IS THE
   RECURRING ROOT CAUSE Session 13 flagged as a risk. Proceed to Step 3.

### Step 3 — Re-apply the fix, AND fix the recurring cause
1. Re-apply Session 13's UPDATE (same statement, current correct
   `auth.users.id` for `michael.chen.test@e2go-uat.com` — confirm this
   ID hasn't ALSO changed; re-verify
   `SELECT id FROM auth.users WHERE email = 'michael.chen.test@e2go-uat.com'`)
2. **If `seed-test-applicant.ts` is the recurring cause**: this time,
   ALSO fix the script itself — per Session 13's original
   recommendation, it should look up `michael.chen.test@e2go-uat.com`'s
   auth ID explicitly (or take an explicit `--user-id` argument), not
   infer from the currently-authenticated session. Make this fix so a
   future re-run doesn't cause the same revert AGAIN.

---

## PART B — IF NOT A LINKAGE ISSUE (Step 1 found `user_id` correct):

If the DB-level linkage is fine but the dashboard still shows "start your
application" for this account, investigate:

1. **RLS policy** — re-check policies on `applications` (Session 13's
   Case C investigation) — has anything changed these since Session 13?
2. **Frontend caching** — is there any client-side caching (React
   Query, SWR, Next.js data cache) that could be showing a STALE "no
   application" state from BEFORE Session 13's fix, even though the DB
   is now correct? Check if a hard refresh / clearing browser
   storage/cookies resolves it (ask owner to test if needed)
3. **Multiple `applications` rows** — is it possible there's MORE THAN
   ONE row in `applications` for `user_id = a2b8f8c3-...` — e.g. a NEW
   blank application row got created (perhaps by the quiz loop bug in
   PART C, or by a prior dashboard visit auto-creating a placeholder)
   alongside Chen's real row — and the dashboard is querying/displaying
   the WRONG (new, blank) one?
   ```sql
   SELECT id, user_id, principal_name, business_name, status, created_at
   FROM applications
   WHERE user_id = 'a2b8f8c3-5f92-4b1d-863b-275648a74b4d';
   ```
   If MULTIPLE rows exist — this is likely it. Determine which is Chen's
   real data (`9f981747-...`, populated fields) vs. any extra blank
   row(s), and how the dashboard decides WHICH application to show for a
   user with multiple rows (most recent? first? — find this logic).

---

## PART C — QUIZ LOOP BUG (separate issue, investigate regardless of
Parts A/B outcome)

Owner reports: clicking "Start New Application" → goes to quiz → does
not complete → returns to "start your application" (loop, no progress
made).

1. Find the quiz flow — likely `/quiz` or similar, and whatever
   "Start New Application" links to
2. Reproduce conceptually by reading the code: what does quiz completion
   DO — does it create/update an `applications` row, set a status, set
   `quiz_sessions.result_json`?
3. Possible causes to check:
   - Quiz completion handler erroring silently (check for try/catch
     swallowing errors, check server logs/console for errors during
     quiz submission)
   - Quiz completion creating a row tied to the WRONG `user_id` (same
     class of bug as Part A — e.g. if quiz submission also has a
     "currently authenticated user" inference bug)
   - Quiz redirect logic checking for an application's existence
     IMMEDIATELY after creation, before the DB write is
     committed/visible (race condition) — redirects back to "start"
     because it doesn't see the just-created row yet
   - Rate limiting (per CLAUDE_CONTEXT: "/api/quiz/submit: 3 per hour
     per IP") — has this account/IP hit that limit from repeated
     testing? If so, quiz submission could be silently failing due to
     429s. Check if this applies.

4. If the quiz loop is related to PART A/B's findings (e.g. if Part B
   found multiple `applications` rows, the quiz loop might be WHAT'S
   CREATING those extra rows on each failed attempt) — note this
   connection explicitly.

---

## PART D — NEW SYMPTOMS ON ocdeployments@gmail.com (likely caused by
Part C's quiz loop attempts — investigate as part of the same account
audit)

Owner did further testing on `ocdeployments@gmail.com` (the account
Session 13 confirmed as genuinely having NO case file, recommended for
testing "no case file" paths) and found:

### D1 — /dashboard now shows progress cards, where Session 13 found none
Per Session 13, this account had no application data. Owner now sees a
full dashboard: "Application Progress, Eligibility Stage, Interview
Timeline, Module Progress, Quick Actions, Continue My Application."

1. Query `applications` for this account's `user_id`
   (`d654c937-d780-4e30-9388-5bfcd080c2d2` per Session 13 — confirm this
   is still correct for `ocdeployments@gmail.com`, it may also have
   changed):
   ```sql
   SELECT id, user_id, principal_name, business_name, status, created_at,
     source
   FROM applications
   WHERE user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2';
   ```
2. If row(s) now exist where Session 13 found none — this is almost
   certainly PART C's quiz loop CREATING a row on each attempt (possibly
   multiple partial rows from multiple loop iterations during testing).
   Check `created_at` timestamps — do they cluster around when owner was
   testing the quiz loop?
3. What STATE is this row in — is `status` something like 'draft' /
   'incomplete' / null? Does it have ENOUGH data for `hasCaseFile` checks
   (Session 12's check: `answers` ≥1 row + `case_briefs` ≥1 row) to
   evaluate as TRUE, FALSE, or some unhandled in-between?

### D2 — Clicking "Simulator" in nav goes DIRECTLY to /dashboard (no
teaser, no real simulator)
Per Session 12, `/simulator` should resolve to ONE of: (a) real
simulator StartScreen (`hasCaseFile === true`), or (b) Session 12's
teaser (`hasCaseFile === false`). Landing on generic `/dashboard` is
NEITHER.

1. Check Session 12's `hasCaseFile` logic
   (`src/app/simulator/page.tsx`) against THIS account's current data
   (from D1) — does the check itself REDIRECT to `/dashboard` in some
   case, rather than rendering teaser-or-simulator?
2. Likely hypothesis: D1's partial/draft row (if it exists) causes
   `hasCaseFile` to evaluate in a way that's neither cleanly TRUE nor
   FALSE — e.g. an `answers` row exists (quiz partially submitted) but
   `case_briefs` doesn't, and SOME OTHER check (not the
   `hasCaseFile`-for-simulator check, but a DIFFERENT "does this user
   have an in-progress application" check elsewhere — possibly
   middleware-level or a layout-level redirect) sees the partial
   `applications` row and redirects to `/dashboard` BEFORE
   `/simulator`'s own logic runs at all
3. Find where this redirect happens — is it in middleware, a layout
   file, or `/simulator/page.tsx` itself?

### D3 — "Welcome back ocdeployments@gmail.com" instead of a name
Lower priority, check while already in this account's data:
1. Does `applications.principal_name` (or wherever a name would be
   stored — `quiz_sessions`, a `profiles` table, etc.) have ANYTHING for
   this user — or is it genuinely empty (no name ever entered)?
2. If empty: NOT a bug — there's nothing to display. Report this plainly.
3. If a name EXISTS but isn't showing in the "Welcome back" greeting —
   find where that greeting is rendered and what field it pulls from;
   likely a simple wrong-field-reference bug (similar in spirit to
   Session 14's "fix column names in buildSimulatorContext" catch)

### Connection to Part C
D1/D2 are very likely DOWNSTREAM of Part C's quiz loop bug — the loop may
be creating exactly the kind of partial/inconsistent data that then
breaks `/simulator`'s gating (D2) and makes the dashboard look populated
(D1) without being a COMPLETE, usable case file. If Part C's root cause
fix (Step 3 area) also explains D1/D2, say so explicitly — this may not
need a SEPARATE fix, just the SAME fix Part C identifies.

If owner wants this account RESTORED to Session 13's clean "genuinely no
case file" state (for continued use as the no-case-file test account) —
that may mean DELETING the partial row(s) found in D1. Per this session's
DO NOT list, don't delete without explicit confirmation — REPORT what
exists and ask.

---

## DO NOT IN THIS SESSION

- Do not blindly re-run Session 13's UPDATE without first confirming
  CURRENT state (Step 1) — if it's already correct, the problem is
  elsewhere and re-running an already-correct UPDATE wastes a step (though
  harmless) while masking the real issue
- Do not delete any `applications` rows (Chen's OR ocdeployments') even
  if duplicates/partial rows are found — report findings, let owner
  decide. Part D explicitly flags this for ocdeployments' partial row(s)
  if found.
- Do not modify `seed-test-applicant.ts` UNLESS Step 2 confirms it's the
  recurring cause — if you fix it, this IS in scope per Session 13's
  original recommendation, just confirm the diagnosis first

---

## COMPLETION REPORT

```
SESSION 20 — Re-investigation complete.

PART A:
  Step 1: applications.user_id for 9f981747-...: [current value]
    Matches Session 13's target (a2b8f8c3-...): [yes/no]
  If reverted:
    Step 2: Current user_id is: [value] — matches Session 13's "before"
      (d654c937-...): [yes/no/different-third-value]
      Likely cause: [seed script re-run / other / unknown]
    Step 3: Fix re-applied: [UPDATE statement]
      seed-test-applicant.ts fixed (if root cause): [yes/no — describe
        fix]

PART B (if Part A's linkage was fine):
  RLS policies unchanged since Session 13: [confirmed/changed]
  Multiple applications rows for a2b8f8c3-...: [count, list ids/status]
  Dashboard's application-selection logic: [describe — most recent/
    first/other]
  Likely cause of "looks new": [...]

PART C — Quiz loop bug:
  Quiz flow location: [files]
  Root cause identified: [...]
  Connection to Part A/B (if any): [...]
  Fix applied: [yes/no — describe, or "investigation only, fix is
    separate session"]

PART D — ocdeployments@gmail.com new symptoms:
  D1: applications rows for d654c937-... now: [count, ids, status,
    created_at — confirm user_id still correct for this account]
    Match Part C's quiz-loop timing: [yes/no]
  D2: /simulator → /dashboard redirect cause: [file, what check/redirect
    fires before simulator's own logic]
    Same root cause as Part C: [yes/no]
  D3: name field check — name exists somewhere but not shown: [yes/no]
    If yes: field/location of bug: [...]
    If no: confirmed no name was ever entered, not a bug: [...]

  If D1 found partial rows from quiz-loop testing — owner decision
  needed on deletion (NOT done in this session): [describe what exists,
  awaiting owner instruction]

OVERALL: [...]

Recommendation: [is /simulator now testable for owner? what should
  owner do next?]
```
