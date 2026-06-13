# SESSION 19 — Commit Audit & Push Cleanup (Sessions 14-18)

**Branch:** dev
**Priority:** 🔴 HIGH — housekeeping, but blocks confidence in
everything since Session 14. Multiple sessions may have uncommitted
changes; Session 17 in particular reported significant agent friction
(dev server/port issues) without confirming any commits.
**Agent:** engineering-code-reviewer (this is primarily a git hygiene
task — read carefully, commit precisely, don't "fix" code along the way)

---

## CONTEXT

Sessions 14 through 18 produced code changes across multiple files. RULE
3 (CLAUDE_CONTEXT) requires one commit per logical unit, never one giant
commit at end of session. RULE 11 requires staying on `dev`, never `main`.
Given the friction reported in Session 17 (dev server port conflicts,
several burned turns), there's meaningful risk that:

- Some sessions' changes were committed, others weren't
- Changes from multiple sessions are sitting uncommitted/unstaged
  together in the working tree, making it hard to separate them into
  clean per-session commits now

This session's job: figure out EXACTLY what's committed vs. not, organize
any uncommitted work into clean, logical commits (grouped by session/
feature, not one mega-commit), push everything to `origin/dev`, and
produce a clear before/after picture.

---

## STEP 1 — CURRENT STATE AUDIT (read-only first)

1. `git status` — full picture of staged/unstaged/untracked files
2. `git log --oneline -20` — recent commit history, identify which
   sessions (14-18) already have commits by matching against each
   session's "Files created/modified" lists:
   - Session 14: `/simulator/quick-start/page.tsx`,
     `/api/simulator/quick-start/route.ts`,
     `/api/simulator/save-extraction/route.ts`,
     `src/lib/simulator-engine.ts`, `src/app/simulator/page.tsx`,
     `applications_source_column.sql` migration
   - Session 15: `/learn` page restructure, homepage CTA section
   - Session 16: `FaqWidget.tsx` ambient/thinking states
   - Session 17: `/learn` page (heading change), `FaqWidget.tsx`
     (layout jump attempt, hero copy, input prominence)
   - Session 18: `FaqWidget.tsx` (scrollable container — IF this session
     ran; check if its work is also present)
3. `git diff --stat` (unstaged) and `git diff --cached --stat` (staged)
   — what's changed but not committed
4. Cross-reference: for EACH file in the lists above, is it (a)
   committed already, (b) modified-but-uncommitted, or (c) untracked
   (new file never added)?

Produce a table: File | Expected from Session | Current git state
(committed/uncommitted/untracked)

---

## STEP 2 — CHECK FOR THE SESSION 11/14 MIGRATION FILENAME COLLISION

Recall from earlier: Session 11 produced
`supabase/migrations/20260613210000_faq_search_functions.sql` and Session
14 produced `supabase/migrations/20260613210000_applications_source_column.sql`
— SAME timestamp prefix, different filenames (so not a literal file
collision, but worth confirming both exist distinctly and neither
overwrote the other):

1. `ls supabase/migrations/ | grep 20260613` — confirm both files exist
   with distinct full filenames
2. If genuinely fine (different filenames, no overwrite) — no action
   needed, just confirm in report
3. If there's an actual issue (one missing, or a true name collision) —
   flag clearly, do NOT silently rename/fix without reporting first

---

## STEP 3 — ORGANIZE UNCOMMITTED CHANGES INTO LOGICAL COMMITS

Based on Step 1's table, for any uncommitted/untracked files:

1. Group by SESSION/FEATURE (not by file-modified-time or arbitrary
   grouping) — e.g.:
   - "feat: standalone simulator quick-start flow (Session 14)"
   - "feat: merge Ask E2go widget into /learn (Session 15)"
   - "feat: Ask E2go widget ambient + thinking states (Session 16)"
   - "fix: /learn page order, widget hero copy, input prominence
     (Session 17)"
   - "fix: scrollable answer container (Session 18)" — if applicable
2. If a SINGLE FILE has uncommitted changes spanning MULTIPLE sessions
   (e.g. `FaqWidget.tsx` likely has Session 16 + 17 + possibly 18 changes
   all uncommitted together) — this is the tricky case. Options:
   - If changes are cleanly separable (e.g. via `git add -p` /
     interactive staging by hunk) — split into separate commits per
     session's changes
   - If NOT cleanly separable (changes are intertwined/overlapping) —
     ONE combined commit is acceptable, but the commit message must
     list ALL sessions/features it covers (e.g. "feat: Ask E2go widget
     visual polish — ambient states, layout fixes, hero copy, input
     prominence, scroll container (Sessions 16-18)") — do NOT pretend
     it's a single clean unit if it isn't
3. For migration files — each gets its own commit (small, atomic,
   easy to review/revert independently)

---

## STEP 4 — VERIFY BUILD BEFORE COMMITTING

Before committing anything:
1. `rm -rf .next` (per the standing process note)
2. `lsof -ti:3000 | xargs kill -9` (clear any zombie dev server)
3. `npm run build` — must be clean
4. If build FAILS — STOP. Do not commit broken code. Report exactly
   what's failing and which session's changes appear responsible. This
   is more important than "getting everything pushed" — a clean dev
   branch matters more than a complete one right now.

---

## STEP 5 — COMMIT AND PUSH

1. Execute the commits planned in Step 3, in a sensible order (e.g.
   chronological by session number, or dependencies-first if any commit
   depends on another — e.g. if Session 14's migration needs to exist
   before Session 14's code commit makes sense, though typically
   migration + code can be one commit or sequential)
2. `git push origin dev`
3. Confirm push succeeded — `git log origin/dev --oneline -10` or
   equivalent to verify remote reflects local

---

## STEP 6 — PENDING MANUAL ACTIONS RECAP

Separately from git state — recap what STILL requires manual action
(these are NOT things this session does, just surface them clearly since
they're easy to lose track of):

- Session 11: Supabase migrations applied? `OPENAI_API_KEY` set? Seed
  scripts run (368 Q&A embeddings)? Upstash configured (owner did this —
  confirm `.env.local` has the vars, but DO NOT print the token value)
- Session 14: `applications_source_column.sql` migration applied to
  Supabase?
- Password task: confirmed done (separate from git — no file changes
  expected, just confirm nothing was accidentally written to a tracked
  file)

For each — STATE ONLY, do not attempt to apply migrations or run seed
scripts in THIS session (that's a separate, deliberate action — this
session is about git hygiene).

---

## DO NOT IN THIS SESSION

- Do not "fix" or modify any code logic while auditing — if something
  looks wrong, REPORT it, don't fix it here (that's a different session)
- Do not apply Supabase migrations or run seed scripts (Step 6 — surface
  only)
- Do not squash/rebase existing history — only deal with
  uncommitted/new changes
- Do not commit if build is broken (Step 4)
- Do not commit to `main`

---

## COMPLETION REPORT

```
SESSION 19 — Commit audit & push cleanup complete.

STEP 1: File-by-file audit table:
| File | Expected from | Git state before |
|---|---|---|
[fill in]

STEP 2: Migration filename check —
  Session 11 migration present: [filename, yes/no]
  Session 14 migration present: [filename, yes/no]
  Collision/overwrite issue: [none / describe]

STEP 3: Commits planned:
  [list each planned commit message + files]

STEP 4: Build check —
  rm -rf .next + kill port 3000: [done]
  npm run build: [clean / FAILED — describe and STOP if failed]

STEP 5: Commits made (in order):
  [list actual commit hashes + messages]
  Push result: [success/fail]
  origin/dev reflects: [confirm latest commit hash matches local]

STEP 6: Pending manual actions recap:
  Session 11 — migrations applied: [?] OPENAI_API_KEY: [?] seed scripts
    run: [?] Upstash configured: [confirmed present in .env.local,
    value not shown]
  Session 14 — migration applied: [?]
  Password task — no unexpected file changes: [confirmed]

OVERALL STATUS: [...]
  Working tree clean: [yes/no]
  All Session 14-18 work committed and pushed: [yes/no — if no, what
    remains and why]
```
