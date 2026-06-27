# SESSION 6 — Package Assembly Regression: Real ZIP Generation Across Data Variants

**Branch:** dev
**Priority:** 🟡 Confidence check — Session 4 verified the code path
exists and compiles; this session ACTUALLY GENERATES the 15-file ZIP
end-to-end and tests it against data variance, to confirm the package
assembly is robust beyond Chen's one known-good record.
**Agent:** engineering-code-reviewer + engineering-minimal-change (for
any small fixes found — keep fixes scoped, don't expand)
**No Playwright. No screenshots.** Direct function calls, generated
files opened and inspected directly.
**Read before starting:** Session 4's completion report (above), the 4
new files it created (docx-package-constants.ts, docx-cover-builder.ts,
docx-toc-builder.ts, docx-divider-builder.ts), and the modified
download route.

---

## CONTEXT — WHAT THIS SESSION ADDS

Session 4 confirmed the package-assembly CODE PATH exists and compiles,
but explicitly noted: "live ZIP generation requires authenticated
session — verified via route code path" — i.e. NO ZIP was actually
generated and opened. This session closes that gap:

1. Actually generate and open the full 15-file ZIP for Chen (real data,
   already-generated documents — no new AI calls)
2. Test the cover page + TOC + divider builders against 2 SYNTHETIC
   data variants that probe realistic edge cases (missing fields,
   different business type/tab combination) — WITHOUT creating new
   real applications or making AI generation calls
3. Report pass/fail per variant, fix any small breakages found

This is NOT a full new-applicant walkthrough (that's Session 3's job
for the live flow). This is specifically: "does the PACKAGING layer
(Session 4's new code) hold up when the input data isn't exactly
Chen's record?"

---

## STEP 1 — REAL ZIP GENERATION: CHEN

1. Call the actual ZIP assembly function/route directly (bypass auth if
   needed via the same SKIP_PAYMENT_WALL / direct-function-call pattern
   used in Session 1) for application `9f981747-e3e4-4941-9f86-9871f8117b66`
2. Write the resulting ZIP to `/mnt/user-data/outputs/chen_package.zip`
   (or equivalent output path)
3. Unzip and confirm: 15 files present, in the order specified in
   Session 4 (cover → TOC → 6×(divider+doc) → checklist)
4. Open EVERY file (all 15) — not just the 4 new ones. Confirm:
   - Cover page: correct data, no page number, no header
   - TOC: all 6 tabs A/D/F/H/I/J present, correct titles/descriptions,
     dot leaders render, filenames correct
   - Each divider: correct Tab letter/title/description, footer correct
   - Each of the 6 renamed documents: STILL opens correctly, Session 1's
     fixes (bracket highlighting, table rendering) still intact, Session
     4's renaming didn't corrupt anything
   - Checklist: new intro paragraph present, placeholder list still
     populates
5. Note any visual/content issue found, however minor

---

## STEP 2 — VARIANT TEST: MISSING COVER-PAGE DATA

Cover page builder reads `applications.personal_info` (JSONB) +
`business_name` + `target_state`. Real applicants may have incomplete
`personal_info` at the point of generation (e.g. passport number not
yet collected — Session 4 already handles this via bracket placeholder,
but test OTHER fields too).

1. Without modifying Chen's actual row, construct a SYNTHETIC options
   object for `buildCoverPage()` (call the function directly, not via
   the DB) with:
   - `applicantName`: present
   - `businessName`: present
   - `businessState`: **missing/null**
   - `nationality`: present
   - `passportNumber`: **missing** (should fall back to bracket
     placeholder per Session 4 — confirm)
   - `preparedDate`: present
2. Call `buildCoverPage()` with this object. Does it:
   - Throw / crash? → BUG, fix it (render "[business state from Tab E]"
     or similar bracket placeholder instead of crashing)
   - Render gracefully with a sensible placeholder for the missing
     field? → PASS
3. Generate the .docx, open it, confirm output is presentable (no
   "undefined" or "null" literal strings visible in the document)
4. If a crash or "undefined"/"null" string is found — apply the
   SMALLEST fix: wrap each interpolated field in a helper that falls
   back to a bracket placeholder (`[business state from Tab E]` etc.)
   matching the existing pattern from Session 4's passportNumber
   handling. Apply consistently to all cover-page fields, not just the
   one that broke.

---

## STEP 3 — VARIANT TEST: DIFFERENT TAB SUBSET (Family/Partnership)

Per CLAUDE_CONTEXT, partnership and family applications are separate
variants. The TOC/divider logic uses `TAB_ORDER` filtered to "only
include tabs for documents actually generated for this application."

1. Find where the application's document set is determined for a
   family application (one with dependents — Tab K family documents
   would be relevant per the original 12-tab structure, though confirm
   whether the CURRENT 6-document set ever varies by application type,
   or if all applications always get the same 6 documents regardless
   of family/partnership status — check the generation pipeline /
   document type list)
2. IF the 6-document set is CONSTANT regardless of family/partnership
   (i.e. TAB_ORDER = [A, D, F, H, I, J] always) — confirm
   `buildTableOfContents()` and the ZIP assembly correctly handle this
   constant case (this may already be fully covered by Step 1's test —
   if so, state that explicitly and this step is a confirmation, not a
   new test)
3. IF the document set DOES vary (e.g. partnership applications get
   additional/different documents, or family applications add a 7th
   document) — construct a synthetic `includedTabs` array reflecting
   that variant (e.g. `['A', 'D', 'F', 'H', 'I', 'J', 'K']` if a 7th
   doc exists) and call `buildTableOfContents()` + the divider builder
   for the new tab directly:
   - Does TOC render correctly with 7 entries?
   - Does `TAB_SECTION_TITLES` have an entry for the new tab, or does
     it fall through to undefined/blank?
   - If missing — add the entry to `TAB_SECTION_TITLES` (Session 4's
     constants module) using the title/description from the Toronto
     index template (E2Go Legal Document Standards) for that tab letter
4. Report which case applies (constant 6 docs, or variable) and the
   result

---

## STEP 4 — DOC_DISPLAY_NAMES COMPLETENESS CHECK

Session 4 introduced `DOC_DISPLAY_NAMES` for the `Tab_[X]_[DisplayName].docx`
renaming. Confirm this map has an entry for ALL 6 document types
(`ds160_reference`, `cover_letter`, `investment_proof`, `source_of_funds`,
`business_plan`, `qualifications`) and that each produces a sensible
filename (e.g. `Tab_D_Cover_Letter.docx`, not `Tab_D_undefined.docx`).
If any are missing, add them — trivial fix, do it inline.

---

## DO NOT IN THIS SESSION

- Do not create new real applications in the database
- Do not make any Anthropic API generation calls (no new document
  content — only repackage Chen's EXISTING generated_documents)
- Do not modify Chen's stored data
- Do not expand into the family/partnership UI flow itself — Step 3 is
  about the PACKAGING layer's tab-list handling, not the application
  flow
- If Step 3 reveals the document SET varies by application type and
  that's a LARGER gap than packaging (e.g. the generation pipeline
  itself doesn't produce different documents per type) — STOP, report
  it as a separate finding, do not attempt to fix the generation
  pipeline in this session

---

## COMPLETION REPORT

```
SESSION 6 — Package assembly regression complete.

STEP 1 — Chen real ZIP generation:
  ZIP generated and written to: [path]
  15 files present, correct order: [yes/no]
  All 15 files opened and inspected: [yes/no]
  Issues found: [none / list]

STEP 2 — Missing cover-page data variant:
  buildCoverPage() with missing businessState/passportNumber:
    [crashed / rendered with bracket placeholders / rendered with
    "undefined"/"null" strings]
  Fix applied: [none needed / describe fix]
  Re-test result: [pass/fail]

STEP 3 — Tab subset variant:
  6-document set constant across application types: [yes/no]
  If constant: Step 1's test covers this — additional testing: [none
    needed / what was done]
  If variable: synthetic [N]-tab TOC/divider test result: [pass/fail]
  TAB_SECTION_TITLES gaps found/fixed: [none / list]

STEP 4 — DOC_DISPLAY_NAMES completeness:
  All 6 doc types present: [yes/no]
  Gaps found/fixed: [none / list]

Build: clean / errors: [list or none]

OVERALL CONFIDENCE STATEMENT:
  [State plainly: for the data shapes actually tested, does the
  package-assembly output match the format/instructions consistently?
  Any remaining known unknowns (data shapes not covered by this
  session) — list them explicitly so the owner knows what's still
  unverified.]
```
