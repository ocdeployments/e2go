# SESSION — Are The Good Documents Still There? (Single Check)

**Branch:** dev
**Priority:** 🔴 URGENT — resolves a direct contradiction in the prior
diagnosis
**Agent:** engineering-minimal-change (read-only)
**Read before starting:** none — this is one targeted check, move fast

---

## START SESSION

**READ-ONLY. Database queries only. Do not touch the browser, do not
call any API route, do not modify anything.**

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66`

---

## CONTEXT — THE CONTRADICTION

Earlier tonight, during the live approval flow, the owner read FULL
content for several documents directly from the page — these were
real, coherent, accurate documents (e.g. cover_letter's Section IV
correctly cited "9 FAM 402.9-6(D)"; source_of_funds had a complete
H-1 through H-4 wire trail; investment_proof had a complete $185,000
breakdown table with an appropriate footnote).

The prior diagnosis session (SESSION_FULL_LIVETEST_DIAGNOSIS.md,
STEP 5/Synthesis) stated that RIGHT NOW, 4 of 6 documents'
`content_text` "start with meta-commentary... 'I need to flag...' or
'I don't have...'" — i.e., refusals.

These cannot both describe the same `content_text` value at the same
time. EITHER:
(a) `content_text` was overwritten between when the owner read it and
    when the diagnosis session queried it (most likely: Step 13's
    re-prompt at ~00:33-00:36 replaced good content with refusals), OR
(b) the diagnosis session's characterization was imprecise — looking
    at a different field, truncating, or misreading what it saw.

This session determines which, with NO interpretation — just output
the raw data.

---

## THE CHECK

For `application_id = '9f981747-e3e4-4941-9f86-9871f8117b66'`, query
`generated_documents` and for EACH of the 6 document_types, output:

1. `document_type`
2. `updated_at` (or `last_edited_at`, whichever exists — the most
   recent modification timestamp)
3. `content_text` — THE FULL VALUE, no truncation, no summarization.
   If a document's content_text is very long, it is fine to output it
   in full across multiple tool outputs — do NOT summarize or
   describe it instead of showing it.
4. Word count of `content_text` (simple word count, e.g.
   `len(content_text.split())`)
5. Does `content_json` exist for this row, and if so, does it contain
   a `full_text` or `sections` key with DIFFERENT content than
   `content_text`? (Just check for qualifications, where the prior
   session noted content_json had real content but content_text had
   meta-commentary — confirm this for qualifications specifically,
   and check the OTHER 5 documents too in case the same pattern
   exists for any of them.)

Also output:
6. For EACH document, the `revision_count` (or
   `stage3_attempts`/equivalent) and any timestamp fields that would
   indicate WHEN this content was last generated/written (e.g.
   `generated_at`, `approved_at`, `stage3_completed_at` from
   `generation_pipeline_log` if more precise than `generated_documents.
   updated_at`).

---

## WHAT TO LOOK FOR (do not act on this — just report)

- If `updated_at` for cover_letter/source_of_funds/investment_proof/
  qualifications is AFTER ~00:30 (when Step 13 began per the prior
  session's job timeline: current_step moved to 13 around 00:33),
  that's consistent with hypothesis (a) — Step 13 overwrote them.
- If `content_text` for any of these 4 documents STILL contains
  recognizable content from what was read earlier (e.g.
  cover_letter still mentions "9 FAM 402.9-6(D)", or
  investment_proof still has the $185,000 breakdown table) —
  the good content is STILL THERE, and the prior session's
  characterization was wrong (hypothesis b), OR only PART of the
  content was replaced.
- If `content_json.sections`/`full_text` for qualifications (or any
  other document) contains the GOOD content while `content_text`
  contains a refusal — this is a STORAGE/DISPLAY split: the good
  content exists, just in the wrong field, and a small fix (read from
  content_json instead of/in addition to content_text) could recover
  it without regeneration.

---

## DO NOT IN THIS SESSION

- Do not modify any row
- Do not call any API route
- Do not touch the browser
- Do not propose or implement fixes — this is data-recovery
  reconnaissance only

---

## COMPLETION REPORT

For each of the 6 document_types, report in this exact structure:

```
=== [document_type] ===
updated_at: [timestamp]
generated_at / approved_at / stage3_completed_at: [whichever
  available, most precise]
revision_count / stage3_attempts: [value]
word_count(content_text): [number]

content_text (FULL):
[paste the entire content_text value here, verbatim, no truncation]

content_json present: [yes/no]
content_json.full_text or .sections differs from content_text:
  [yes/no — if yes, paste THAT content in full too, labeled
  separately]
```

Repeat for all 6: cover_letter, source_of_funds, investment_proof,
business_plan, qualifications, ds160_reference.

Then conclude with ONE line:

```
VERDICT: [(a) overwritten — N of 6 documents' content_text changed
  after ~00:30 and now contain refusals / (b) still good — all 6
  documents' content_text still contain real content, prior
  characterization was inaccurate / (mixed) — specify which
  documents fall into which category]
```
