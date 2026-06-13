# SESSION — Quality Gate Failure Deep-Dive (Chen Application)

**Branch:** dev
**Priority:** 🔴 HIGH — understand failure pattern before any fix or
regeneration
**Agent:** engineering-minimal-change (read-only this session)
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.

**This session is READ-ONLY. No browser, no API calls, no generation,
no edits to any file. Database queries and file reads only.**

---

## CONTEXT

Prior investigation (this session's predecessor) found:
- 1 job, status "running" forever (missing `status: 'completed'`
  transition — confirmed bug, not the focus of this session)
- 6 generated_documents, all created in one batch at
  2026-06-12T15:55:59, all marked "approved"
- 6 generation_pipeline_log rows, `pipeline_started_at:
  2026-06-12T15:56:01`
- Quality gate results: 5 of 6 documents FAILED
  (`stage5_completed: false`), only `ds160_reference` reached
  PENDING_REVIEW
- AI detection scores: cover_letter 0.30 ✅, source_of_funds 0.15 ✅,
  investment_proof 0.70 ❌, business_plan 0.30 ✅, qualifications
  0.85 ❌, ds160_reference 0.15 ✅
- cover_letter content has neither the old Walsh and Pollard citation
  nor the new 9 FAM language — Section IV appears to have been
  rewritten without either

This session investigates WHY, before any fix is written.

---

## STEP 1 — TIMING: did the citation fix land before, during, or
after this run?

- Find the exact commit timestamp for the Walsh and Pollard citation
  fix session (`git log` — search for the commit message related to
  "citation" or "Walsh and Pollard" or "9 FAM 402.9-6(D)").
- Compare against `pipeline_started_at: 2026-06-12T15:56:01` and the
  `generated_documents.created_at: 2026-06-12T15:55:59` timestamp.
- For a sequential pipeline (cover letter generates first per Spec3
  "GENERATED LAST" note — confirm actual generation order in
  generation-engine.ts), if the fix commit landed AFTER 15:55:59 but
  the whole batch shows the SAME created_at timestamp, does that mean
  all 6 documents were generated with the PRE-FIX prompts? Or does
  `created_at` only reflect DB insert time, not generation start time
  per-document — i.e., could individual documents have been generated
  at different real times but inserted/finalized together?
- Report: was this entire run pre-fix, post-fix, or mixed? Show your
  reasoning with exact timestamps.

---

## STEP 2 — READ THE TWO FAILED DOCUMENTS IN FULL

Output the COMPLETE `content_text` for:
1. `investment_proof` (ai_detection: 0.70)
2. `qualifications` (ai_detection: 0.85)

For each, also report:
- `generation_tokens`
- `llm_prompt_version`
- How many humanization attempts were logged (per
  `generation_pipeline_log` stage3_attempts for this document_type)
- `stage3_detection_score` progression if multiple attempts were
  logged (did the score improve across attempts, stay flat, or get
  worse?)

---

## STEP 3 — COMPARE AGAINST THE PASSING DOCUMENTS

Output `content_text` for `ds160_reference` (the one that reached
PENDING_REVIEW) and `source_of_funds` (0.15, the best score).

Visually/structurally compare against the two failed documents from
Step 2:
- Length (word count) — are the failed documents notably
  longer/shorter?
- Repetitive phrasing — do `investment_proof` or `qualifications`
  show the AI vocabulary fingerprints the humanization prompt is
  supposed to remove (per Spec4 Stage 2: "it is worth noting",
  "furthermore", "leveraging", "utilize", "demonstrate", "facilitate",
  uniform sentence length, no contractions, no specific place names)?
- Does `qualifications` (0.85 — the worst score) show any obvious
  structural issue — e.g., is it unusually short, unusually generic,
  or does it read as a list/template rather than prose?

---

## STEP 4 — WHAT HAPPENS TO A "FAILED" DOCUMENT? (spec vs. reality)

Read `docs/Spec4_Quality_Gate_Pipeline.md` — the section on handling
documents that fail after retry attempts ("If all 3 attempts fail:
Flag for manual review... Human review within 2 hours").

Read `src/lib/generation-engine.ts` — does ANY code path implement
this "flag for manual review" behavior? Specifically:
- Is there any table, column, or notification mechanism for "needs
  human review"?
- When `final_status` is set to "FAILED" in `generation_pipeline_log`,
  does anything ELSE happen — an email, an admin flag, a status
  written elsewhere — or does the pipeline simply stop with no further
  action?
- Is "FAILED" a value the frontend (`page.tsx`) checks for and
  displays differently than "PENDING_REVIEW" or other statuses? Or
  does the frontend only check `document_generation_jobs.status`
  (which is stuck on "running"), never looking at
  `generation_pipeline_log.final_status` at all?

---

## STEP 5 — MODEL CONSISTENCY CHECK

- Query `app_settings` for `generation_model` — what is the CURRENT
  value?
- For each of the 6 `generated_documents` rows, what `llm_model` value
  is recorded? Are all 6 the same model? If `app_settings` was changed
  between when documents were generated, could different documents in
  this single batch have used different models?

---

## DO NOT IN THIS SESSION

- Do not modify any file
- Do not call any API route
- Do not open the app in a browser
- Do not regenerate, re-run, or trigger anything
- Do not update BUILD_TRACKER

---

## COMPLETION REPORT — report exactly:

```
Quality gate failure deep-dive complete (read-only).

STEP 1 — Timing:
  Citation fix commit timestamp: [exact]
  Pipeline run timestamps: [exact]
  Conclusion: [pre-fix / post-fix / mixed — with reasoning]

STEP 2 — Failed documents:
  investment_proof (0.70):
    [full content_text — or note if too long, provide first/last
     500 words + total length]
    generation_tokens: [n]
    humanization attempts: [n], detection score progression: [list]

  qualifications (0.85):
    [same structure]

STEP 3 — Comparison:
  ds160_reference and source_of_funds content_text: [provide or
    summarize]
  Structural differences observed: [specific findings — length,
    repetition, AI fingerprints, genericness]

STEP 4 — Failed-document handling:
  Spec4 says: [quote]
  Implemented in code: [yes/no — what exists]
  Frontend checks final_status: [yes/no]
  Frontend currently stuck because: [confirm — checks job.status
    only, which is "running"]

STEP 5 — Model consistency:
  app_settings.generation_model (current): [value]
  All 6 documents llm_model: [list — same or different]

OVERALL ASSESSMENT:
  [Is this a data-quality problem (Chen's answers are thin/messy
  after months of test edits), a prompt problem (these two document
  types' prompts produce worse output), a humanization-loop problem
  (retries aren't working), or something else? State your best
  read of root cause based on everything above.]

RECOMMENDATION:
  [What should the next session actually fix, in priority order —
  and should it be a code fix, a data fix (re-seed Chen's answers),
  or a spec/prompt revision for investment_proof and qualifications
  specifically?]
```
