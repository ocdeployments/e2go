# SESSION — DS-160 Reference: Active or Hung? (Read-Only, Live Check)

**Branch:** dev
**Priority:** 🔴 URGENT — page is open and waiting, owner watching live
**Agent:** engineering-minimal-change (read-only)
**Read before starting:** none — this is a quick targeted check, move fast

---

## START SESSION

**This session is READ-ONLY. The owner has the app open in a browser
on /generate/9f981747-... RIGHT NOW, mid-generation, on the LAST
document (ds160_reference). Do NOT touch the browser, do NOT call any
API route, do NOT restart anything. Database queries only — this
should take under a minute.**

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66`

---

## CONTEXT

This is a FRESH run (post wipe-and-reseed, post retry-loop-fix,
post-citation-fix). 5 of 6 documents (cover_letter, source_of_funds,
investment_proof, business_plan, qualifications) have generated and
the UI shows them as complete/ticked. The page now shows
"Preparing your DS-160 form reference guide..." and the sidebar shows
ds160_reference with a gentle pulse/blink. This has been going for
3-4 minutes — noticeably longer than the LAST run, where this same
document type passed quality gate on attempt 1 with zero issues
(quality_gate_notes: [], ai_detection 0.15) and was the SIMPLEST/
FASTEST document.

The question: is generation for ds160_reference ACTIVELY RUNNING
(e.g., on a humanization retry attempt 2/3, which would explain extra
time), or HUNG (an error or unresolved promise, with nothing actually
happening)?

---

## STEP 1 — JOB STATUS

Query `document_generation_jobs` for this application_id.

Report:
- `status` (should still be "running" — confirm)
- `current_step` (what step number/label is it on — should be in the
  Step 11 humanization range for ds160_reference, or later)
- `updated_at` — how recently was this row last touched? If
  `updated_at` is several minutes old with NO recent update, that's
  evidence of a hang (nothing is writing progress). If `updated_at`
  is very recent (seconds ago), something is actively writing.

---

## STEP 2 — GENERATED_DOCUMENTS ROW FOR ds160_reference

Query `generated_documents` for `application_id = '9f981747-...'`
and `document_type = 'ds160_reference'`.

Report:
- Does a row exist yet for THIS run? (The wipe deleted the old one —
  has a NEW row been inserted?)
- If yes: `created_at`, `updated_at`, `status`, and — if populated —
  does `content_text` already contain something (a first-draft
  attempt sitting there while a retry runs), or is it empty/null?

---

## STEP 3 — GENERATION_PIPELINE_LOG FOR ds160_reference

Query `generation_pipeline_log` for `application_id = '9f981747-...'`
and `document_type = 'ds160_reference'`.

Report:
- Does a row exist? `pipeline_started_at`?
- Any stage completion fields populated yet (stage1-stage6)?
- `stage3_attempts` — if this is already 1 or 2, that's a STRONG
  signal a retry is in progress (attempt 1 finished, didn't pass,
  attempt 2 or 3 is now running) — which would mean "active, just
  slow," not "hung."
- `final_status` — if this is still null/empty, generation hasn't
  finished. If it's already set, the BACKEND finished but the
  FRONTEND hasn't updated (a different kind of stuck — frontend
  polling/SSE issue, not a backend hang).

---

## STEP 4 — DOCUMENT_GENERATION_LOG (the 79-row table from the
wipe/reseed report)

This is a SEPARATE, more granular log table (per the wipe session's
Step 1 findings — 79 rows existed for the OLD run, all wiped). Query
this table for `application_id = '9f981747-...'` and
`document_type = 'ds160_reference'` (or however it's scoped — check
the actual column).

Report:
- How many rows exist for THIS run, for this document_type?
- What does the MOST RECENT row say — what step/action/timestamp?
  This table may have finer-grained logging than
  generation_pipeline_log and could show exactly what the LAST thing
  the engine did was, and how long ago.

---

## STEP 5 — QUICK READ: generation-engine.ts AROUND ds160_reference's
PROMPT/POST-PROCESSING

Given the qualifications document came back as raw JSON
(sections/full_text structure) instead of extracted prose — check:
does `prompts/v1/documents/ds160_reference.md` ALSO request structured
JSON output? If so, is there a post-processing step for THIS document
type that extracts/parses the JSON — and could THAT step be the one
that's hanging (e.g., a JSON.parse on malformed output, inside a loop
with no timeout, or an unhandled promise)?

This is a quick read, not a fix — just confirm or rule out this
hypothesis based on what's actually in the prompt file and the
relevant engine code path.

---

## DO NOT IN THIS SESSION

- Do not touch the browser/page in any way
- Do not call any API route
- Do not restart the dev server
- Do not modify any file
- Do not kill any process

---

## COMPLETION REPORT — report exactly, FAST:

```
DS-160 live check (read-only).

Step 1 — Job status: status=[?], current_step=[?],
  updated_at=[timestamp] ([how many seconds/minutes ago])

Step 2 — generated_documents row: [exists/not yet] —
  [if exists: created_at, status, content_text populated or empty]

Step 3 — pipeline_log row: [exists/not yet] —
  stage3_attempts=[?], final_status=[?]

Step 4 — document_generation_log: [N rows for this doc_type this run]
  Most recent entry: [timestamp, what it logged]
  → Most recent entry is [X seconds/minutes] ago

Step 5 — JSON output hypothesis: ds160_reference.md
  [does/does not] request JSON output. [If yes: is there a
  parse/extraction step, and does it look like a plausible hang
  point?]

VERDICT: [ACTIVE — likely on retry attempt N, recent log activity
  confirms work is happening / HUNG — no log activity in the last
  N minutes, likely [specific cause if identifiable] / UNCLEAR —
  explain why]

If HUNG: [what would the owner need to do — and is there a way to
  recover WITHOUT losing the 5 already-completed documents? E.g.,
  could the stuck job be marked failed/partial for just this ONE
  document via direct DB update, allowing Step 2 of Bug B's logic
  to fire and the job to reach a terminal state — without touching
  the browser?]
```

Do not update BUILD_TRACKER — this is a live diagnostic, not a
completed fix.
