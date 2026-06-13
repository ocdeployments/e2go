# SESSION 13 — Investigate: Account ↔ Chen Application Linkage

**Branch:** dev
**Priority:** 🔴 HIGH — if this account genuinely can't see its own
application data, every authenticated surface (dashboard, /apply,
/documents, /score, /simulator, Session 9's package summary) is affected
for this account, not just the simulator
**Agent:** engineering-code-reviewer (read-only investigation first;
engineering-minimal-change ONLY if a specific small fix is identified and
agreed)
**No Playwright for investigation.** DB queries + auth inspection.
**Read before starting:** none — this is a fresh investigation

---

## CONTEXT

Owner logged into an account, expected to see Michael Chen's application
(`9f981747-e3e4-4941-9f86-9871f8117b66`) — substantially complete case
file, 6 generated documents, used as the test applicant throughout
Sessions 1-10. Instead, the account appears to have no application/case
file (triggered the simulator's "no data" redirect, Session 12 Item 2).

Owner confirms: this SHOULD be the account that owns Chen's data, but
doesn't appear to.

---

## STEP 1 — IDENTIFY THE LOGGED-IN ACCOUNT

Ask the owner (if not already known) which email they logged in with for
this test. Per memory, Chen's test email is
`michael.chen.test@e2go-uat.com` — UUID
`9f981747-e3e4-4941-9f86-9871f8117b66`.

1. Query `auth.users` for the email the owner used to log in. Get its
   `id` (this is the `user_id` that should match).
2. Compare against `applications.user_id` for application
   `9f981747-e3e4-4941-9f86-9871f8117b66`.

### Case A — Different email entirely
If the owner logged in with an email OTHER than
`michael.chen.test@e2go-uat.com` — this is NOT a bug. Report this plainly:
"You logged in as [X], Chen's application belongs to [Y] —
log in as [Y] to see Chen's data." STOP here, no fix needed. Session 12
proceeds as originally scoped (genuinely testing a no-case-file account is
also valuable — keep both perspectives in mind for Session 12's Item 2
verification).

### Case B — Same email, but `applications.user_id` doesn't match
`auth.users.id` for `michael.chen.test@e2go-uat.com`
This is a genuine linkage bug. Proceed to Step 2.

### Case C — `applications.user_id` matches correctly, but data still
doesn't appear
This is an RLS policy issue, not a linkage issue. Proceed to Step 3.

---

## STEP 2 — IF LINKAGE MISMATCH (Case B)

1. Determine HOW this happened — check session history for anything that
   touched `applications.user_id` for this row (Session 3's wipe/reseed
   discussion, SESSION_WIPE_RESEED_CHEN.md, SESSION_RECOVERY_DOWNLOAD_AND_FIX.md
   — these are referenced in BUILD_TRACKER/memory as having touched Chen's
   application state)
2. Confirm there is exactly ONE `auth.users` row for
   `michael.chen.test@e2go-uat.com` (not duplicated — e.g. account
   recreated at some point, old `applications.user_id` pointing to a
   now-orphaned/deleted auth user)
3. THE FIX (if Case B confirmed and single correct auth user exists):
   ```sql
   UPDATE applications
   SET user_id = '[correct auth.users.id for michael.chen.test@e2go-uat.com]'
   WHERE id = '9f981747-e3e4-4941-9f86-9871f8117b66';
   ```
   Per RULE 4 — this is an UPDATE, not destructive. Confirm the WHERE
   clause is exact (single row) before running.
4. Check if OTHER tables also reference the old/wrong `user_id` for this
   application's related data (e.g. `generated_documents`,
   `case_briefs`, `applicant_voice_profile`, `followup_responses`,
   `pre_generation_confirmation`, `document_generation_jobs` —
   confirm whether these key off `application_id` (unaffected) or
   `user_id` directly (would need the same fix))

---

## STEP 3 — IF RLS ISSUE (Case C)

1. Query the RLS policies on `applications` and related tables
   (`SELECT * FROM pg_policies WHERE tablename = 'applications'` etc.)
2. Test: as the service role (bypassing RLS), confirm the row IS visible
   and `user_id` matches correctly
3. If `user_id` matches but the authenticated user still can't read it —
   inspect the policy's `USING`/`WITH CHECK` clauses for a logic error
   (e.g. comparing against the wrong column, `auth.uid()` vs
   `auth.uid()::text` type mismatch, etc.)
4. Fix the specific policy clause identified — smallest possible change,
   per engineering-minimal-change

---

## STEP 4 — VERIFY

After whichever fix applies (or confirming Case A needs none):
1. Log in as `michael.chen.test@e2go-uat.com` (or have owner do so)
2. Confirm `/dashboard` shows Chen's application with progress/status
3. Confirm `/apply` shows the 6-section case file with Chen's data
4. Confirm `/documents/9f981747-...` shows generated documents +
   Session 9's package summary
5. Confirm `/simulator` now loads normally (sufficient case file data
   present) — this also verifies Session 12 Item 2's "has case file"
   path

---

## DO NOT IN THIS SESSION

- Do not run any UPDATE without first confirming exactly which case (A/B/C)
  applies and reporting it
- Do not modify Chen's application DATA (answers, documents, scores) —
  only the linkage/policy layer if Case B or C
- Do not run Session 12 yet if this investigation is still open —
  Session 12 Item 2's "no case file" test case needs to know whether
  the test account genuinely has no case file (valid test) or SHOULD
  have one (this bug) — resolve this first

---

## COMPLETION REPORT

```
SESSION 13 — Account/application linkage investigation complete.

STEP 1: Logged-in account email: [...]
  Chen's auth.users.id: [...]
  applications.user_id for 9f981747-...: [...]
  Case identified: [A — different email / B — linkage mismatch /
    C — RLS issue]

If Case A: [confirm, no further action — report correct login email]

If Case B:
  STEP 2: How linkage broke (if determinable): [...]
  Duplicate auth users found: [yes/no]
  Fix applied (UPDATE statement run): [yes/no — exact statement]
  Other tables requiring same fix: [list / none]

If Case C:
  STEP 3: Policy issue found: [table, policy name, clause]
  Fix applied: [...]

STEP 4: Verification —
  /dashboard shows Chen's application: [yes/no]
  /apply shows case file data: [yes/no]
  /documents shows generated docs + summary: [yes/no]
  /simulator loads normally: [yes/no]

OVERALL: [Case identified, fix applied or no fix needed, verification
  status]

Recommendation for Session 12: [proceed as planned / adjust Item 2's
  test approach because: ...]
```
