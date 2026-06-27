# SESSION — Recovery, Download Test, and Consistency-Checker Fix

**Branch:** dev
**Priority:** 🔴 HIGH — recovers tonight's good content, tests S15
against real data for the first time, then fixes the root cause for
future runs
**Agent:** engineering-minimal-change for Pieces 1-2, then
engineering-frontend-developer (or same agent) for Piece 3 if reached
**Read before starting:** none for Pieces 1-2 (targeted, this file is
self-contained). Before Piece 3: read
`docs/Spec4_Quality_Gate_Pipeline.md` Stage 4 (Consistency Check)
section.

---

## START SESSION

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66`
Job UUID: `e4cf4fbc-6dc0-4e2a-9694-af4861a8091d`

This session has THREE PIECES. Run them IN ORDER. STOP and report
after each piece — do not proceed to the next piece without the
report being delivered, even though no human confirmation is needed
to continue (these are sequential because each piece's outcome
informs how the next is approached, not because of risk).

---

# PIECE 1 — RECOVER OVERWRITTEN CONTENT (database update, no API calls)

## Context

Per the prior diagnosis (SESSION_VERIFY_CONTENT_STILL_THERE.md), 4 of
6 documents have a `content_text` that is an AI refusal
(meta-commentary about a data conflict that does not actually exist —
the conflict the LLM is reacting to is an artifact of the broken
quality-gate consistency check, not a real data problem). For all 4,
the GOOD content survives intact in `content_json.full_text`.

The other 2 documents (business_plan, ds160_reference) already have
good `content_text` — DO NOT TOUCH THESE.

## Step 1.1 — Confirm before writing

For each of these 4 document_types — cover_letter, source_of_funds,
investment_proof, qualifications — query
`generated_documents` for `application_id =
'9f981747-e3e4-4941-9f86-9871f8117b66'` and confirm:
- `content_text` currently starts with refusal language (e.g. "I need
  to flag", "I need the actual case data", "I don't have")
- `content_json` is non-null and `content_json->>'full_text'` (or
  however the JSON key is accessed) contains the GOOD long-form
  document (starts with the document title, e.g. "Cedar Park Kumon
  LLC E-2 Application — Cover Letter" or similar — NOT refusal
  language)

If either check fails for any document, STOP and report — do not
write anything for that document.

## Step 1.2 — Perform the swap

For each of the 4 documents where Step 1.1 confirms the expected
state:

```sql
UPDATE generated_documents
SET content_text = content_json->>'full_text',
    last_edited_at = now(),
    user_edited = false
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66'
  AND document_type = '<document_type>';
```

(Adjust the JSON path syntax to whatever this Supabase/Postgres
instance actually uses — confirm the correct operator, e.g. `->>`
vs `->`, by checking how `content_json` is structured/queried
elsewhere in the codebase first.)

Do this for: cover_letter, source_of_funds, investment_proof,
qualifications.

## Step 1.3 — Verify

Re-query all 6 documents' `content_text` (first ~200 chars of each is
enough now). Confirm:
- All 6 now start with real document content (titles, "I. PURPOSE",
  "I. Introduction", etc.) — NONE start with refusal language
- business_plan and ds160_reference are UNCHANGED from before (still
  their original good content_text, byte-identical — confirm via
  `updated_at` NOT changing for these two)

## PIECE 1 COMPLETION REPORT

```
PIECE 1 — Recovery swap complete.

Step 1.1 confirmation: [all 4 confirmed as expected / list any that
  didn't match]

Step 1.2 — Documents updated:
  cover_letter: [done/skipped, why]
  source_of_funds: [done/skipped, why]
  investment_proof: [done/skipped, why]
  qualifications: [done/skipped, why]

Step 1.3 verification: all 6 documents now show real content
  (first ~100 chars of each): [list]
business_plan / ds160_reference unchanged: [confirmed yes/no]
```

STOP HERE. Proceed to Piece 2 only after this report.

---

# PIECE 2 — TEST THE .docx DOWNLOAD ROUTE AGAINST REAL CONTENT

## Context

S15 built `/api/generate/download/[applicationId]` — converts each
document's `content_text` to a formatted `.docx` (Times New Roman
12pt, 1-inch margins, 1.5 line spacing, Roman numeral sections, header
`[LastName] E-2 Application | [Doc Name] | [Date]`, plain page-number
footer, `[BRACKET FORMAT]` text highlighted yellow), generates
`COMPLETE-BEFORE-SUBMITTING.docx`, assembles all 7 into a ZIP.

This route has a GATE: per S15's plan, it checks
`generation_pipeline_log.applicant_acknowledged = true AND
final_status = 'RELEASED'` before allowing download (403 otherwise).

This is the FIRST TIME this route would run against real,
substantive, multi-page content with actual `[bracket]` placeholders
(cover_letter alone has several: `[passport number from Tab A]`,
`[formation date from Tab E]`, `[EIN from Tab E]`, etc. — note these
use a DIFFERENT bracket FORMAT than the spec's literal
`[BRACKET FORMAT]` placeholder convention — check whether the
highlighting logic matches THESE bracket patterns or only a literal
string "[BRACKET FORMAT]").

## Step 2.1 — Check the acknowledgment gate

Query `generation_pipeline_log` for this application_id, all 6
document_types:
- `applicant_acknowledged` — true/false/null for each?
- `final_status` — what value for each (RELEASED / PENDING_REVIEW /
  FAILED / null)?

If the gate would BLOCK the download route (acknowledged != true or
final_status != 'RELEASED' for any/all), DO NOT bypass the gate via
the API. Instead:

- Read the download route's gate-check code exactly — is the gate
  checked PER-DOCUMENT or PER-APPLICATION (one row covering the whole
  job)?
- If per-application and currently blocking: this is expected (the
  acknowledgment gate — Step 14 — was never reached because Step 13
  re-prompted instead of completing cleanly). Report this as a
  FINDING, not something to fix in this piece.

## Step 2.2 — Test the underlying .docx generation directly (bypass
the gate check by calling the BUILDER FUNCTIONS, not the route)

Rather than hitting the gated API route, directly exercise
`docx-builder.ts` (and `checklist-builder.ts`) as functions, in a
small throwaway script, against the NOW-RECOVERED content_text for
all 6 documents from this application. This tests the FORMATTING
LOGIC without needing to satisfy or modify the acknowledgment gate.

Write a small Node/TS script (in `/tmp` or similar scratch location,
NOT committed) that:
1. Reads `content_text` for all 6 documents from
   `generated_documents` for this application_id (now recovered
   per Piece 1)
2. Calls whatever exported function(s) `docx-builder.ts` provides to
   convert one document's content_text → a `.docx` buffer/file
3. Writes each resulting `.docx` to a scratch directory
4. Also calls `checklist-builder.ts` to generate
   `COMPLETE-BEFORE-SUBMITTING.docx` from the bracket-placeholders
   found across all 6 documents

## Step 2.3 — Inspect the output

For at least cover_letter's generated `.docx` (the one with the most
bracket placeholders):
- Open it (via a library that can read .docx structure — `docx` npm
  package, or unzip and inspect `document.xml` directly since .docx
  is a ZIP of XML)
- Confirm: Times New Roman 12pt? 1-inch margins? 1.5 line spacing?
  Roman numeral section headers rendered correctly (the content
  ALREADY has "I.", "II." etc as text — are these just plain
  paragraphs, or does the builder do anything special with them)?
- Header/footer present with correct format?
- Do the `[bracket]` placeholders (e.g. `[passport number from
  Tab A]`) get highlighted yellow? Check the highlighting
  regex/logic — does it match THIS bracket format, or only an exact
  `[BRACKET FORMAT]` string? If it only matches the latter and these
  documents use descriptive brackets like `[passport number from
  Tab A]` — the highlighting will likely NOT fire. Report this either
  way.
- Does the markdown table in investment_proof (the `| Category |
  Amount | Purpose |` table) render as an actual Word TABLE, or as
  literal pipe-and-dash text (i.e., did the builder NOT handle
  markdown table syntax)?

For `COMPLETE_BEFORE_SUBMITTING.docx`:
- Does it list the bracket placeholders found? From which documents?
  Is the list accurate/complete given what's actually in the 6
  documents now?

## Step 2.4 — Metadata check

Right-click → Properties equivalent (or read .docx core
properties.xml) for at least one generated file: confirm no e2go
branding, no AI tool names, no creator metadata.

## PIECE 2 COMPLETION REPORT

```
PIECE 2 — Download/.docx test complete.

Step 2.1 — Acknowledgment gate status:
  [per-document or per-application? current values for all 6?
  would the REAL route currently 403?]

Step 2.2 — Builder test approach: [script written, ran successfully
  / errors encountered]

Step 2.3 — Formatting inspection (cover_letter):
  Font/margins/spacing: [pass/fail/details]
  Header/footer: [pass/fail/details]
  Bracket highlighting: [WORKS for "[descriptive text]" format /
  ONLY works for literal "[BRACKET FORMAT]" — these documents'
  brackets would NOT highlight / other finding]
  Markdown table → Word table (investment_proof): [converts
  correctly / renders as literal text / other]

COMPLETE_BEFORE_SUBMITTING.docx: [generated correctly / issues]

Step 2.4 — Metadata: [clean / issues]

Files produced (scratch location): [list paths]
```

STOP HERE. Proceed to Piece 3 only after this report.

---

# PIECE 3 — FIX THE CONSISTENCY-CHECKER ROOT CAUSE

## Context

This is the fix for FUTURE runs — the bug that caused Step 13 to
overwrite the good content recovered in Piece 1, by re-prompting
documents whose ONLY "failure" was containing correct line-item
dollar figures that legitimately differ from the total investment.

Read `docs/Spec4_Quality_Gate_Pipeline.md` Stage 4 (Consistency Check)
section FIRST. Spec4's `CONSISTENCY_FIELDS` already defines the
CORRECT approach: a small set of NAMED fields (applicant_name,
investment_amount_usd, llc_name, ein, business_address,
franchise_brand, llc_formation_date, franchise_agreement_date,
wire_transfer_date, family_composition, fund_source_description) that
must match EXACTLY across all 6 documents.

## Step 3.1 — Locate the actual broken check

Find `runQualityGate` (per prior diagnosis: generation-engine.ts
around line 658-671). Read it in full. Confirm the current logic:
extracts ALL dollar amounts from a document's text, compares each
against `investmentTotal`, flags any that are 50-150% of total AND
differ by >10%.

## Step 3.2 — Replace with Spec4's actual design

Replace the "extract all dollar amounts and compare to total" logic
with: extract values for the SPECIFIC named `CONSISTENCY_FIELDS` only
(at minimum `investment_amount_usd` — the total investment figure
itself, which SHOULD appear consistently as "$185,000" / "one hundred
eighty-five thousand" across all 6 documents — that's a real,
meaningful consistency check). Do NOT flag arbitrary dollar amounts
that appear in prose for legitimate reasons (line-item costs, source
components, projections).

If extracting ALL of Spec4's CONSISTENCY_FIELDS from free-text
documents via regex/parsing is too large for this session, AT MINIMUM:
remove the "any dollar amount 50-150% of total, differs >10%" check
entirely, and replace with just: does the document mention the total
investment figure (`$185,000` / `185,000` / "one hundred eighty-five
thousand") at least once, AND does that figure match
`investmentTotal`? This alone would have let tonight's run pass
cleanly — every document DOES correctly state $185,000 as the total
when it appears.

## Step 3.3 — Verify

`npm run build` — confirm clean. `npx tsc --noEmit` — confirm clean.

Do NOT re-run the full generation pipeline in this session (no new
Opus calls). The fix is verified by code review + build success; live
verification is a future session's job.

## PIECE 3 COMPLETION REPORT

```
PIECE 3 — Consistency-checker fix complete.

Step 3.1 — Confirmed broken logic: [exact lines, exact behavior]

Step 3.2 — Replacement implemented:
  Approach: [full CONSISTENCY_FIELDS / minimal total-figure-only
  check]
  Files changed: [list]

Step 3.3 — Build: clean / errors: [list or none]

NOT done (future session): live re-run of generation pipeline to
confirm documents now pass quality gate without being re-prompted.
```

---

## FINAL NOTES FOR BUILD_TRACKER (update at end, after Piece 3)

- Note Piece 1's recovery: 4 documents' content_text restored from
  content_json.full_text (Step 13 had overwritten them with refusals
  caused by Piece 3's bug).
- Note Piece 2's findings re: bracket-highlighting format mismatch
  (if found) as a follow-up item — the documents use descriptive
  brackets `[X from Tab Y]`, the highlighter may expect literal
  `[BRACKET FORMAT]`.
- Note Piece 3's fix and that live verification (re-running generation
  end-to-end to confirm no false-positive re-prompts) is the next
  session's first task.
- DO NOT add anything about "franchise_fee should be $100,000" —
  this is NOT a real data issue. $1,000 is correct and matches the
  canonical $185,000 breakdown verified multiple times tonight. If
  this claim appears again in any future diagnosis, it is itself a
  symptom of Piece 3's bug (the checker expecting line-items near the
  total), not a real data error.
