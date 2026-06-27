# SESSION — Retry Loop + Job Completion Status Fix

**Branch:** dev
**Priority:** 🔴 HIGH — two confirmed bugs blocking any successful
generation run
**Agent:** engineering-minimal-change
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Read docs/sessions/SESSION_QUALITY_GATE_DEEPDIVE.md and
docs/sessions/SESSION_PIPELINE_STATE_INVESTIGATION.md for full
background — both prior sessions' completion reports are the source
of truth for what's broken and why.

**This session fixes CODE ONLY in src/lib/generation-engine.ts (and
its frontend consumer if needed for Fix B). Do NOT trigger generation,
open the app in a browser, or call any /api/generate/* route. Do NOT
touch Chen's data — data reconciliation is a separate future session.**

---

## CONTEXT — TWO CONFIRMED BUGS

**Bug A — Humanization retry loop exits after 1 attempt, not 3.**

Per `docs/Spec4_Quality_Gate_Pipeline.md` Stage 2, a document that
fails the quality gate should get up to 3 humanization attempts, each
with specific feedback about what the prior attempt got wrong. The
prior investigation found `stage3_attempts: 1` for ALL 6 documents in
the most recent run — the loop never attempted a 2nd or 3rd pass, even
for documents that failed quality gate (`cover_letter`, `business_plan`
both failed on word count / missing disclaimer / figure mismatches,
yet got only 1 attempt).

**Bug B — Job never transitions to `status: 'completed'`.**

After pipeline step 15 ("Preview Unlocked"), the job record's
`current_step` updates to 15 but `status` remains `'running'`
permanently — there is no `updateJob({ status: 'completed', ... })`
call anywhere in the engine. This causes the frontend to show an
infinite "generating" state on any subsequent page load, regardless of
whether all documents actually finished (successfully or not).

---

## STEP 1 — BUG A: FIX THE RETRY LOOP

Locate the humanization retry loop in `generation-engine.ts` (Step 11
/ Stage 2 area, near `HUMANIZATION_MAX_ATTEMPTS` and
`stage3_attempts`).

Read the loop condition carefully. Likely candidates for the bug:
- The loop checks `attempt < HUMANIZATION_MAX_ATTEMPTS` but the
  variable is incremented/checked incorrectly (off-by-one, or
  incremented before the check)
- The loop's exit condition checks `detection_score < THRESHOLD` but
  is structured so it exits on the FIRST iteration regardless of the
  score (e.g., a `break` or `return` outside the intended retry block)
- `stage3_attempts` is being SET to 1 unconditionally rather than
  incremented per actual attempt
- The retry loop only fires for AI-DETECTION failures specifically,
  but NOT for QUALITY-GATE failures (word count, disclaimer, figure
  mismatches) — i.e., two separate failure types exist, and only one
  triggers retry

Report which of these (or what else) is the actual bug BEFORE fixing.

**The fix should ensure:**
- A document that fails EITHER the AI-detection threshold (0.35) OR
  the quality gate checks (word count, disclaimer, required elements,
  consistency) triggers a retry, up to `HUMANIZATION_MAX_ATTEMPTS`
  (3) total attempts
- Each retry attempt's prompt includes SPECIFIC feedback from the
  prior attempt's failure (per Spec4: "Each retry receives more
  specific instructions about which sections failed and why") — if
  this feedback-injection mechanism doesn't exist yet, it needs to be
  added: construct a feedback string from `quality_gate_notes` /
  detection score / consistency issues, and inject it into the
  humanization prompt for attempt 2 and 3
- `stage3_attempts` in `generation_pipeline_log` reflects the ACTUAL
  number of attempts made (1, 2, or 3) — not hardcoded to 1
- If all 3 attempts still fail, `final_status` remains `'FAILED'` as
  currently implemented (this part is correct — do not change the
  FAILED outcome itself, only how many attempts lead to it)

---

## STEP 2 — BUG B: ADD JOB COMPLETION STATUS

Locate where the pipeline finishes (after step 15 / "Preview
Unlocked", near line 1814 per the prior investigation).

Add a job status update to `'completed'` (with `completed_at:
new Date().toISOString()`) when the pipeline finishes ALL steps —
**regardless of whether individual documents passed or failed quality
gate**. "Completed" here means "the pipeline ran to its end," not
"all documents are perfect." Document-level outcomes
(`generated_documents.status`, `generation_pipeline_log.final_status`)
remain the source of truth for per-document success/failure.

**Check the allowed status enum** (from the Fix 1 migration:
`'queued', 'running', 'awaiting_approval', 'completed', 'failed',
'partial'`). Consider: should the job status be `'completed'`
unconditionally, or `'partial'` if one or more documents have
`final_status: 'FAILED'`, and `'completed'` only if all documents
reached `'RELEASED'` or `'PENDING_REVIEW'`?

**Recommendation: use `'partial'` when 1+ documents have
`final_status: 'FAILED'`, and `'completed'` otherwise.** This lets the
frontend (in a FUTURE session — do not build this now) eventually
distinguish "everything worked" from "pipeline ran but some documents
need attention" without re-deriving that from 6 separate
`generation_pipeline_log` rows every time.

Report which status values you're using and why.

---

## STEP 3 — VERIFY (CODE-LEVEL ONLY — NO GENERATION)

- `npm run build` — confirm clean
- `npx tsc --noEmit` — confirm clean
- Read through the modified retry loop and trace through it manually
  for a hypothetical document that fails attempt 1, fails attempt 2,
  passes attempt 3 — confirm the logic would: (a) make 3 calls,
  (b) inject feedback into attempts 2 and 3, (c) record
  `stage3_attempts: 3`, (d) result in `final_status` reflecting the
  attempt-3 pass
- Also trace a hypothetical document that fails all 3 attempts —
  confirm `final_status: 'FAILED'` still results, `stage3_attempts: 3`
- Do NOT run the actual pipeline. Do NOT open the app. Verification is
  by code-reading and build/typecheck only.

---

## DO NOT IN THIS SESSION

- Do not modify Chen's data (any table under `application_id =
  9f981747-...`)
- Do not trigger generation, open the app, or call any API route
- Do not build frontend UI for `'partial'` status display — that's a
  future session, informed by this session's choice of status values
- Do not modify `prompts/v1/documents/*.md` — those were addressed in
  the citation-fix session

---

## COMPLETION REPORT — report exactly:

```
Retry loop + job completion status fix complete.

Bug A root cause: [exact description of what was wrong with the
  retry loop]
Bug A fix: [what changed — file/lines]
Feedback-injection mechanism: [existed already / newly added —
  describe how failure feedback is constructed and where it's
  injected into the retry prompt]

Bug B fix: [file/lines, status values used and logic for
  completed vs partial]

Manual trace — fail/fail/pass scenario: [walk through, confirm
  expected behavior]
Manual trace — fail/fail/fail scenario: [walk through, confirm
  FAILED + stage3_attempts: 3]

Build: clean / errors: [list or none]

Next: data reconciliation session for Chen (separate, owner input
  needed on canonical investment figures), then a fresh generation
  run to test both this fix and the citation fix together.
```

Update BUILD_TRACKER.md with this fix.
