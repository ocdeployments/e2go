# SESSION 31 — Fix /simulator Stuck Loading (Terminal Only, No Playwright)

**Branch:** dev
**Priority:** 🔴 LAST BLOCKER — Dashboard loads, Nav works, Login works.
Only /simulator still shows "Loading..." indefinitely.

**Agent:** engineering-minimal-change ONLY
**NO PLAYWRIGHT** — Playwright crashes the agent. Manual browser testing
by owner after fix.

---

## WHAT WE KNOW

Per Sessions 28-30:
- Root cause of dashboard/other pages was: duplicate GoTrueClient
  instances causing awaits to hang (not reject). Fixed via singleton
  in src/lib/supabase.ts.
- /simulator/page.tsx was switched to use the shared singleton
  (Session 29) BUT still hangs.
- This means /simulator has an ADDITIONAL or DIFFERENT hang point
  beyond the client duplication — something specific to its own
  data-fetching logic.

---

## STEP 1 — VIEW THE FILE, FIND THE HANG

1. `view src/app/simulator/page.tsx` — read it completely
2. Find:
   - The loading state (`useState(true)` or similar)
   - The useEffect that calls init/fetch
   - Every `await` inside that function, IN ORDER
   - Whether setLoading(false) is in a `finally` block or only on
     success path
   - The useEffect dependency array — what's in it?
   - Any Supabase queries — what tables/columns do they query?

3. Cross-reference EACH Supabase query against known schema issues:
   - Does it query `applications.source`? — this column may NOT exist
     yet (Session 14's migration hasn't been applied per owner's manual
     action list)
   - Does it query any column that Session 14/20/24 touched?
   - Per Session 14's completion report: "fix column names in
     buildSimulatorContext (question_key/answer_value)" — are these
     correct column names in the current query?

---

## STEP 2 — ADD MINIMAL TARGETED LOGGING (5 lines max)

Add ONE console.log before each await in the simulator's init function.
Number them simply: `[SIM-1]`, `[SIM-2]`, etc.

Owner will test in browser and report back which number is the last
one printed. Do not add more than 5 logs — keep it tight.

---

## STEP 3 — BASED ON STEP 1's CODE READING, MOST LIKELY FIXES

Apply whichever fits (may be more than one):

**A — Missing finally block** (setLoading only on success):
Add try/catch/finally, setLoading(false) in finally. Same pattern as
Session 27's dashboard fix.

**B — Schema mismatch** (querying non-existent column):
If init() queries `applications.source` (Session 14's column, migration
NOT applied) or any other column that doesn't exist yet — the query
will throw/hang. Fix: either guard with a try/catch, or remove/skip
that specific query until the migration is applied. Do NOT apply the
migration in this session — owner action. Just make the code resilient.

**C — useEffect dependency causes re-run**:
If the useEffect has an unstable dependency (object/function created
inline, or the supabase client itself) — it re-runs on every render.
Check the deps array, stabilize with useCallback/useMemo or remove the
dep if safe.

**D — hasCaseFile check queries non-existent data**:
Per Session 12, hasCaseFile checks `answers` table (≥1 row) AND
`case_briefs` table (≥1 row). If either query throws (wrong column,
RLS issue, connection issue) and the error is swallowed — loading never
clears. Add try/catch around this specific check too.

---

## STEP 4 — BUILD CHECK

```bash
rm -rf .next
lsof -ti:3000 | xargs kill -9
npm run build
```

Build must be clean. Report any errors.

---

## STEP 5 — START DEV SERVER, REPORT

```bash
npm run dev
```

Report the exact terminal output. Owner will test in browser and report
what they see on /simulator. Do NOT try to verify via code reading —
owner's browser is the verification.

---

## DO NOT IN THIS SESSION

- NO Playwright — it crashes the agent
- Do not touch dashboard/login/Nav — those work now, don't regress them
- Do not apply Session 14's migration — that's an owner manual action
- Do not make broad changes — this is a targeted fix only
- Do not claim "fixed" — owner will verify in browser

---

## COMPLETION REPORT

```
SESSION 31 — /simulator targeted fix.

STEP 1: File review findings:
  Loading state: [line]
  useEffect deps: [list]
  setLoading(false) in finally: [yes/no — if no, was this the issue?]
  Supabase queries in init(): [list tables/columns queried]
  Schema risk (applications.source or other unapplied migration):
    [yes/no — describe]

STEP 2: Logs added: [SIM-1 through SIM-N, what each marks]

STEP 3: Fix(es) applied: [A/B/C/D — describe exactly]
  Files modified: [list]

STEP 4: Build: [clean / errors: list]

STEP 5: Dev server running on port 3000: [confirmed]

AWAITING OWNER BROWSER TEST — which SIM-N log is last seen, and what
/simulator shows.
```
