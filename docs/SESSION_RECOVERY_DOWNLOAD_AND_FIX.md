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

## ⚠️ READ FIRST — Related Spec1 additions may already exist

A separate design session may have produced
`SPEC1_ADDITIONS_PREGEN_CONFIRMATION.md` (three edits to
`Spec1_Analysis_Engine.md`: extended Category A hard-gap checks for
investment-breakdown/fund-source consistency, a pre-generation
"confirm your numbers" screen, and a `pre_generation_confirmation`
log table). Check `docs/sessions/` and project root for this file
BEFORE starting Piece 3.

If it exists and has NOT yet been applied to the live Spec1: apply
those three edits to `Spec1_Analysis_Engine.md` FIRST (it's a doc
edit, low-risk), then design Piece 3's document-level check to
CONFIRM generated figures against what `pre_generation_confirmation`
already validated, rather than re-deriving consistency rules
independently. Two separately-invented definitions of "consistent
investment figures" is the failure mode to avoid here — one source of
truth (the pre-generation confirmation), checked twice (once before
generation, once after, as a sanity check that nothing drifted).

If that file does NOT exist or has already been applied: proceed with
Piece 3 as originally scoped below, but keep the document-level check
MINIMAL (per Step 3.2's fallback option) rather than building a
parallel, more elaborate consistency system — the elaborate version
belongs in the pre-generation step, not duplicated at the
document-quality-gate step.

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

## STATUS AS OF June 13, 2026 (post-completion)

Pieces 1-3 are complete. This section records what's confirmed, what's
deliberately staged for later, and what's pending — so a future
session doesn't need to reconstruct this from chat history.

**Piece 1 — CONFIRMED CLEAN.** All 6 documents' content_text verified:
zero refusals, real openings (cover_letter starts "[Date] Consular
Officer...", qualifications starts "PROFESSIONAL OVERVIEW...", etc.),
word counts 667-1984. business_plan and ds160_reference confirmed
untouched. Note: updated_at did NOT change on the 4 swapped rows —
the UPDATE statement didn't include `updated_at = now()` and this
table has no auto-update trigger. Content is correct regardless;
this is a minor schema gap. RECOMMENDATION for any future UPDATE on
`generated_documents`: include `updated_at = now()` explicitly.

**Piece 2 — formatting CONFIRMED CORRECT** against real content (font,
margins, 1.5 spacing, headers/footers). Three follow-up items
identified, which are really TWO fixes:

### Piece 2 Follow-ups (not yet started — small, scoped)

**Fix A — Bracket-highlighting regex.** The .docx builder's
bracket-highlight logic appears to expect a literal `[BRACKET FORMAT]`
string. Real generated documents use DESCRIPTIVE brackets:
`[passport number from Tab A]`, `[formation date from Tab E]`,
`[EIN from Tab E]`, `[net worth figure from Tab H]`,
`[percentage]`, `[enrollment projection from Tab K]`, `[timeframe]`,
`[number]`, `[property / family / financial ties from Tab A]` (all
from cover_letter alone — other documents have more, e.g.
ds160_reference's many `[Enter from Tab A]` / `TO CONFIRM` style
placeholders). Find the highlight regex (likely in docx-builder.ts)
and widen it to match `\[.*?\]` (any bracketed text) rather than the
literal string. Verify it does NOT also match unrelated markdown
(e.g. if any document legitimately uses square brackets for
citations or lists — check before widening to "any brackets").

**Fix B — Checklist generation, SAME ROOT CAUSE as Fix A.**
COMPLETE-BEFORE-SUBMITTING.docx is built by scanning for the same
bracket pattern across all 6 documents. Once Fix A's regex is
corrected, re-test the checklist — it should populate from the same
fixed extraction. If it still doesn't populate after Fix A, that's a
genuinely separate issue (checklist-builder.ts may have its OWN
copy of the pattern, not shared with docx-builder.ts) — check for
duplicated regex logic across the two files.

**Fix C — Markdown table → Word table (investment_proof).**
investment_proof's content_json.full_text (now in content_text after
Piece 1) contains a markdown table:
```
| Category | Amount | Purpose |
|----------|--------|---------|
| Franchise Fee | $1,000 | Initial franchise fee... |
...
```
The .docx builder apparently renders this as literal pipe-and-dash
text rather than a Word table. Find where content_text is converted
to .docx paragraphs and add markdown-table detection: when a
contiguous block of lines matches `| ... | ... |` with a
`|---|---|` separator row, convert to a proper Word table
(docx library's Table/TableRow/TableCell) instead of a paragraph.

**Piece 3 — DONE, but this is the MINIMAL version, not the full Spec4
target. Read this before "live verification":**

Piece 3's fix (generation-engine.ts:657-682) replaced "flag any dollar
amount 50-150% of total" with "verify $185,000 appears in the
document" — the minimal fallback option from Step 3.2, deliberately
chosen for speed.

SEPARATELY, tonight ALSO produced a complete rewrite of
`Spec4_Quality_Gate_Pipeline.md` Stage 4 (extended CONSISTENCY_FIELDS
covering 16 named fields, a Scope section explaining what NOT to
check, a Timeline Validator, and "return SPECIFIC document with exact
correction instruction" handling) — see
/mnt/user-data/outputs/Spec4_Quality_Gate_Pipeline.md from tonight's
session, ready to commit to docs/.

THESE ARE NOT THE SAME THING. generation-engine.ts:657-682
implements a SUBSET of what the new Spec4 Stage 4 describes. This is
INTENTIONAL — minimal fix first, full implementation later. If a
future session reads the new Spec4 and compares it to
generation-engine.ts and concludes "Piece 3 is incomplete" — that's
correct in the sense that the FULL Spec4 isn't implemented yet, but
incorrect if it implies Piece 3 itself was done wrong. The minimal
fix is what "live verification" (Piece 4 below) tests FIRST. Whether
to implement the full Spec4 CONSISTENCY_FIELDS/timeline-validator
version is a SEPARATE, later decision — likely only worth it if the
minimal version proves insufficient on a live run, or once the
pre-generation confirmation (new Spec1 sections, also ready to commit)
makes most of this moot by catching issues before generation starts.

---

## PIECE 4 — LIVE VERIFICATION (stub — scope before running)

**Goal:** confirm Piece 3's minimal fix prevents Step 13 from
overwriting good content, AND reach a real terminal job status
(`'completed'`/`'RELEASED'`, not `'partial'`) so the ACTUAL download
route (gated, through the ACTUAL UI) can be tested — not the
builder-functions-direct approach Piece 2 used.

**FIRST QUESTION TO ANSWER (cheapest path):** Can the pipeline be
RE-ENTERED at Step 13 using the 6 EXISTING good documents (recovered
via Piece 1), without regenerating Steps 1-12? This would be the
sharpest test — it directly re-creates tonight's exact failure
scenario (good docs → Step 13) with the FIXED checker, at near-zero
cost (no new Opus calls for Steps 1-12).

If re-entry at Step 13 is NOT supported by the current architecture
(job/pipeline state machine may only support starting from Step 1) —
fall back to a FULL fresh run (wipe/reseed Chen per
SESSION_WIPE_RESEED_CHEN.md pattern, then full generation). This costs
~$3-5 in Opus calls (per ADDITION 6's cost table) but is the realistic
"customer experience" test the owner actually wants — full workflow,
quiz/checkout bypass via SKIP_PAYMENT_WALL, through to download.

**Either way, the end goal is the same:** reach a state where
`/generate/[applicationId]`'s actual UI shows a real "ready to
download" state, the acknowledgment gate (Step 14, 5 checkboxes) is
reachable and functions, and clicking the real Download button
produces a real ZIP — which is what the owner asked to hold in hand.

**Dependencies:** Fixes A/B/C (Piece 2 follow-ups) should land BEFORE
Piece 4's download test, so the downloaded files don't have the known
bracket/table issues — otherwise Piece 4 would surface bugs we
ALREADY know about, wasting a verification cycle. Recommended order:
Fixes A/B/C → commit new Spec1/Spec4/CLAUDE_CONTEXT → Piece 4.

---

## FINAL NOTES FOR BUILD_TRACKER

Pieces 1-3 marked ✅ DONE — see STATUS AS OF section above for full
detail on what each "done" means and what's staged for later
(Piece 2 follow-ups A/B/C, Piece 3 minimal-vs-target, Piece 4 stub).

DO NOT add anything about "franchise_fee should be $100,000" —
this is NOT a real data issue. $1,000 is correct and matches the
canonical $185,000 breakdown verified multiple times tonight. If
this claim appears again in any future diagnosis, it is itself a
symptom of the OLD checker bug (now fixed by Piece 3) — line-items
near but not equal to the total were being flagged as "wrong," and
some reasoning concluded the line-item should be changed rather than
the check. Do not act on this claim if it resurfaces.
