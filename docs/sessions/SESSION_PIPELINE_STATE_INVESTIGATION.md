# SESSION — Generation Pipeline State Investigation (Chen Application)

**Branch:** dev
**Priority:** 🔴 HIGH — possible uncontrolled regeneration on page reload
**Agent:** engineering-minimal-change (read-only this session)
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.

**This session is READ-ONLY. Do not trigger generation. Do not open
/generate/9f981747-... in a browser. Do not call any generation API
routes. Database queries only.**

---

## CONTEXT

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66` (Michael
James Chen, test applicant).

Tonight: after the Walsh and Pollard citation fix landed in
`prompts/v1/documents/cover_letter.md`, the owner navigated to
`/generate/9f981747-...`. The page appeared to run through the full
generation pipeline for all 6 documents with no opportunity to
review/approve individual documents and no acknowledgment gate
interaction. The owner could not access the sidebar document list to
view individual documents. **Reloading the page appeared to restart
generation from scratch** — the owner closed the tab to stop this.

This session determines:
1. What state the pipeline is actually in
2. Whether the Cover Letter content reflects the corrected citation
   fix
3. Why reload may be restarting generation
4. Whether any of this caused unintended duplicate API calls

---

## STEP 1 — `document_generation_jobs` (or equivalent job table)

Query the job record(s) for `application_id =
9f981747-e3e4-4941-9f86-9871f8117b66`.

Report:
- How many job rows exist for this application_id? (If more than
  one, list all — this could indicate each reload created a new job.)
- For each: `status`, `current_step_label`, `created_at`,
  `updated_at`
- Is any row in status `running` or `awaiting_approval`? Is any in
  `completed`?

---

## STEP 2 — `generated_documents`

Query all rows for `application_id = 9f981747-...`.

Report:
- How many rows? (Expect up to 6 — one per `document_type`. If more
  than 6, duplicates may have been created on each reload.)
- For each row: `document_type`, `generated_at`, `last_edited_at`,
  `llm_model`, `llm_prompt_version`
- **For `document_type = 'cover_letter'`**: output the FULL
  `content_text` value — this is the critical check. Does Section IV
  (Substantial Investment) contain "Walsh and Pollard" or "8 I&N Dec"
  (the OLD incorrect citation), or does it contain language about
  "9 FAM 402.9-6(D)" proportionality (the CORRECTED version)?
- If multiple `cover_letter` rows exist (one per reload), output
  `content_text` for ALL of them with their `generated_at` timestamps,
  so we can see whether each reload produced a new generation call.

---

## STEP 3 — `generation_pipeline_log`

Query the row(s) for `application_id = 9f981747-...`.

Report:
- Does a row exist? If multiple, list all with timestamps.
- For the most recent row: all stage completion fields (stage1
  through stage6), `applicant_acknowledged`, `acknowledged_at`,
  `released_at`, `final_status`, `downloaded_at`

---

## STEP 4 — DIAGNOSE THE RELOAD-RESTART BEHAVIOR

Read `src/app/generate/[applicationId]/page.tsx` — specifically the
initial load logic (useEffect on mount, or server-side data fetching).

Answer:
- On page load, does the code check for an EXISTING job/document
  state for this `applicationId` before deciding whether to start
  generation?
- If a `document_generation_jobs` row already exists with status
  `completed` (or any non-`queued` status), does the page correctly
  skip re-triggering generation and instead render the existing
  state (document review, acknowledgment gate, or download screen as
  appropriate)?
- If NO such check exists, or the check has a bug (e.g., checks the
  wrong field, or the condition is inverted), report exactly what the
  current logic does on load — this is likely the root cause of the
  "reload restarts everything" behavior.

Also check: is there an API call triggered on page mount (e.g., POST
to `/api/generate/start` or `/api/generate/run/[jobId]`) that fires
unconditionally, regardless of existing state?

---

## STEP 5 — SIDEBAR DOCUMENT LIST INTERACTIVITY

Read the sidebar/document-list component rendered on this page.

Answer:
- Is clicking a document in the sidebar (e.g., "Source of Funds")
  supposed to switch the main panel to show that document's content?
- Is this click handler gated on some state (e.g., only enabled if
  that document's status is `approved`, or only enabled during
  `awaiting_approval`)?
- Given the job is likely past the sequential-approval phase (if all
  6 documents generated), is there a "review completed documents"
  state that should make the sidebar clickable, and if so, is that
  state being reached?

---

## DO NOT IN THIS SESSION

- Do not call any `/api/generate/*` routes
- Do not open the app in a browser
- Do not modify `generate/[applicationId]/page.tsx` or any other file
- Do not delete or modify any rows in any table
- Do not regenerate anything

---

## COMPLETION REPORT — report exactly:

```
Pipeline state investigation complete (read-only).

document_generation_jobs: [row count, statuses, timestamps]

generated_documents: [row count]
  cover_letter content check: [OLD citation present / CORRECTED
    language present / mixed across multiple rows — explain]
  [if multiple cover_letter rows: list each with timestamp and
    which version it contains]

generation_pipeline_log: [row exists? final_status?
  applicant_acknowledged? downloaded_at?]

Reload-restart root cause: [diagnosis — what the page.tsx logic
  does on mount, and why it may be re-triggering generation]

Sidebar interactivity: [why clicking documents doesn't work —
  state gating issue, or something else]

Estimated duplicate generation calls (if any): [based on row
  counts / timestamps, how many extra full pipeline runs may have
  occurred]

Recommendation: [does this need a fix session before further
  testing, and what should that fix prioritize]
```

Do not update BUILD_TRACKER this session — this is investigation
only. The fix (if needed) will be a separate session informed by
these findings.
