# SESSION 4 — Package Assembly: Cover Page, TOC, Tab Dividers, Checklist Update

**Branch:** dev
**Priority:** 🟡 Customer-facing deliverable completeness — what the customer
actually receives in the ZIP
**Agent:** engineering-minimal-change + engineering-code-reviewer
**No Playwright. No screenshots.** Verify via generated .docx files only.
**Read before starting:** docx-builder.ts (current state — already mostly
aligned with the standard: Century Schoolbook, per-doc headers/footers,
Tab letter mapping, justified/double-spaced body, bracket highlighting,
markdown tables). This session does NOT touch buildDocument() or its
per-document formatting — it ADDS new package-level files.

---

## CONTEXT

Per-document formatting (docx-builder.ts) already matches
`E2Go Legal Document Standards v1.0`. What's missing is the PACKAGE
LEVEL: the customer currently receives 6 documents + a checklist, with
no cover page, no index, and no tab dividers — i.e. no "binder
experience." This session adds those as additional .docx files in the
ZIP, per the standard's package presentation rules.

**Decision already made:** Do NOT merge into one combined .docx. Keep
the 6 documents as separate files. ADD new files to the ZIP:
- `00_Cover_Page.docx`
- `01_Table_of_Contents.docx`
- One divider file per included document: `Tab_D_Divider.docx`, etc.
- Existing `COMPLETE-BEFORE-SUBMITTING.docx` — update content only

**Tab mapping (already in docx-builder.ts, reuse the same constant):**
```
ds160_reference   → Tab A — DS-160 Confirmation Page
cover_letter      → Tab D — Cover Letter
investment_proof  → Tab F — Investment Evidence
source_of_funds   → Tab H — Source of Funds
business_plan     → Tab I — Business Plan
qualifications    → Tab J — Investor Qualifications
```

---

## STEP 1 — SHARED CONSTANTS MODULE

Create or extend a shared module (e.g. `src/lib/docx-package-constants.ts`)
exporting:
- `DOC_TYPE_TAB_MAP` (move from docx-builder.ts, re-export from there too
  so nothing breaks — or import it back into docx-builder.ts; whichever
  is less churn)
- `TAB_SECTION_TITLES`: full section titles + 1-line descriptions per
  Tab letter, per the Toronto index template:
  ```
  A: "DS-160 Confirmation Page" / "Online nonimmigrant visa application confirmation"
  D: "Cover Letter" / "Narrative addressing all E-2 eligibility requirements under 9 FAM 402.9"
  F: "Investment Evidence — Funds Committed" / "Wire transfer confirmations, franchise fee receipts, lease deposits, business expenditure records"
  H: "Source of Funds" / "Complete chronological funds trail from origin to U.S. business account"
  I: "Business Plan" / "Five-year projections, market analysis, hiring plan, non-marginality evidence"
  J: "Investor Qualifications" / "CV/résumé, employment history, educational credentials, professional references"
  ```
- `TAB_ORDER`: `['A', 'D', 'F', 'H', 'I', 'J']` (fixed order for index/dividers
  — only include tabs for documents actually generated for this application;
  filter at call time, don't hardcode all 6 always present)

---

## STEP 2 — COVER PAGE BUILDER

New file: `src/lib/docx-cover-builder.ts`, exporting
`buildCoverPage(options): Document`

Options needed: `applicantName`, `businessName`, `businessState`,
`preparedDate`, `nationality`, `passportNumber` (may be `[Passport number
from Tab A]` bracket placeholder if not yet collected — reuse
`buildTextRuns`-style bracket highlighting from docx-builder.ts, import
it rather than duplicating).

Per spec section 1:
- Century Schoolbook throughout
- Applicant name: ALL CAPS, bold, 16pt, centered
- "E-2 TREATY INVESTOR VISA APPLICATION": bold, 14pt, all caps, centered
- Business name/state line: 12pt centered
- "Submitted to: U.S. Consulate General Toronto": 12pt centered
- "Date Prepared: [Month DD, YYYY]": 12pt centered
- "Nationality: [X] | Passport: [Y]": 12pt centered
- Thin 0.5pt horizontal rule, then "Prepared in accordance with 9 FAM 402.9"
  (12pt centered italic), then rule again
- Generous vertical spacing — use empty paragraphs with line spacing to
  push content toward vertical center; do not attempt true CSS-style
  vertical centering, just generous top/bottom padding via spacing
- NO page number (no Header/Footer with PageNumber at all — omit footer
  entirely, or empty footer)
- NO running header (this is the cover page, not a body page)
- 1" margins all sides
- Black text only

Do NOT include attorney/preparer line — e2go is self-service, no
attorney of record. Omit that block from the template entirely.

---

## STEP 3 — TABLE OF CONTENTS / INDEX BUILDER

New file: `src/lib/docx-toc-builder.ts`, exporting
`buildTableOfContents(options): Document`

Options: `applicantName`, `preparedDate`, `includedTabs: string[]`
(filtered TAB_ORDER for this application), `pageNumbers: Record<string, number>`
— see note on page numbers below.

Per spec section 2:
- Header block: applicant name + "COMPREHENSIVE INDEX / TABLE OF CONTENTS"
  + "Submitted to: U.S. Consulate General, Toronto" + date — centered,
  Century Schoolbook 12pt, thin rules above/below
- One entry per included tab, in TAB_ORDER:
  - Tab letter (bold, left-aligned) + section title (bold, sentence case)
  - Description line below, italic, 10pt, indented 0.25"
  - Page number right-aligned with dot leader
- Use docx's `tabStops` with `leader: 'dot'` and `TabStopType.RIGHT` at
  `TabStopPosition.MAX` for the dot-leader effect (check docx library
  version supports `leader` property on tab stops — if not available,
  fall back to a manually-repeated "." string sized to roughly fill the
  line, but prefer the native leader if it exists)
- "TOTAL PACKAGE: [XX] pages (excluding cover, TOC, dividers, Tabs A–C)"
  line at the bottom
- NO running header/footer matching body pages — this page uses lowercase
  roman numeral "i" if a page number is shown at all (optional — since
  this is a one-page TOC, a footer may be omitted entirely; if included,
  centered lowercase roman numeral only, no name/tab text)

### Page number reality check (IMPORTANT — do this before building)

The standard wants accurate page numbers per tab in the index. Because
each of the 6 generated documents is a SEPARATE .docx file with its OWN
page numbering starting at 1 (per docx-builder.ts's `PageNumber.CURRENT`),
there is NO continuous page count across the package — Word cannot share
page counters across files, and we are not merging files.

**Resolution for this session:** The index will NOT show real continuous
page numbers. Instead, each index entry shows the document's own starting
page (always "1" or "p. 1") OR — preferred — omit the page number column
entirely and replace it with the tab letter as the navigation key (since
each document is also its own file in the ZIP, named per Tab letter, e.g.
`Tab_D_Cover_Letter.docx`). State this clearly in the COMPLETION REPORT as
a known limitation of the multi-file approach vs. a true bound PDF, and
note it does not block the customer (file names ARE the navigation,
arguably clearer than page numbers for a digital ZIP delivery).

Adjust the index template accordingly: drop the dot-leader page-number
column, OR keep dot leaders pointing to the filename instead of a page
number (e.g. "Tab D   Cover Letter .................. Tab_D_Cover_Letter.docx").
Use judgment on which reads better — implement one, note the choice.

---

## STEP 4 — TAB DIVIDER BUILDER

New file: `src/lib/docx-divider-builder.ts`, exporting
`buildTabDivider(options): Document`, called once per included tab.

Options: `tabLetter`, `sectionTitle`, `description`, `applicantName`.

Per spec section 3:
- "TAB [X]" — all caps, bold, 36pt Century Schoolbook, centered
- Section title — all caps, bold, 20pt, centered
- Description — regular, 12pt, centered, italic, one line
- Footer line: applicant name (left) + "E-2 Visa Application" (right) —
  10pt — but per spec, divider pages are "not numbered" — so this footer
  has NO page number, just the two text items via tab stop
- NO running header (matches cover page treatment)
- Black text on white, generous vertical spacing same approach as cover page
- 1" margins

Output filenames: `Tab_[X]_Divider.docx` (e.g. `Tab_D_Divider.docx`)

---

## STEP 5 — WIRE INTO THE ZIP ASSEMBLY ROUTE

Find where the 6 documents + COMPLETE-BEFORE-SUBMITTING.docx are currently
assembled into the ZIP (likely `/api/generate/download/[applicationId]`
or a zip-builder lib — grep for "COMPLETE-BEFORE-SUBMITTING" or "archiver"
or "zip").

Add to the ZIP, in this order:
1. `00_Cover_Page.docx`
2. `01_Table_of_Contents.docx`
3. For each included tab in TAB_ORDER:
   - `Tab_[X]_Divider.docx`
   - The existing generated document, renamed to `Tab_[X]_[DocumentName].docx`
     (e.g. `Tab_D_Cover_Letter.docx`) — RENAME ONLY, do not regenerate;
     reuse the existing buildDocument() output, just change the filename
     written into the archive
4. `COMPLETE-BEFORE-SUBMITTING.docx` (last, unnumbered tab — update per
   Step 6)

Confirm cover page data (`applicantName`, `businessName`, `businessState`,
`nationality`, `passportNumber`, `preparedDate`) is available from existing
application/case-brief data — do NOT add new DB columns or new user-facing
fields for this session. If `passportNumber` isn't collected yet, use the
existing `[passport number from Tab A]` bracket placeholder pattern
(highlighted yellow, consistent with the rest of the package) — pull
whatever IS available (applicant name, business name/state, nationality,
date) from existing queries used elsewhere in the download route.

---

## STEP 6 — UPDATE COMPLETE-BEFORE-SUBMITTING.docx CONTENT

The checklist currently scans the 6 generated documents for bracket
placeholders (Session 1, Fix B). Update its intro text to reflect the
new package contents:

- Add a short intro paragraph: "Your package includes a cover page, table
  of contents, tab dividers, and the following 6 documents: [list with
  Tab letters and filenames]."
- Keep the existing placeholder-scan logic UNCHANGED — it only scans the
  6 generated documents (cover page/TOC/dividers contain no bracket
  placeholders by construction, so scanning them is unnecessary, but
  harmless if the existing loop is generic — don't add special-casing
  unless the loop breaks on non-generated-document inputs).

---

## DO NOT IN THIS SESSION

- Do not merge the 6 documents into one file
- Do not change Century Schoolbook / margins / spacing / heading rules in
  docx-builder.ts — that's already correct per the standard
- Do not attempt continuous cross-file page numbering — see Step 3's
  resolution
- Do not add PDF conversion — Word files only, per current product spec
- Do not add new DB columns or new Module 3 questions to collect cover-page
  data not already available
- Do not touch generation pipeline Steps 1-15 or Sessions 1/2's work

---

## VERIFY

For application `9f981747-e3e4-4941-9f86-9871f8117b66` (Michael Chen):

1. Generate the full ZIP via the download route (or direct builder calls,
   same pattern as Session 1)
2. Confirm ZIP contains, in order: cover page, TOC, then for each of the
   6 docs a divider + the renamed document file, then the checklist —
   10 + 6 = wait, count carefully: 1 cover + 1 TOC + (6 dividers + 6 docs)
   + 1 checklist = 15 files total
3. Open `00_Cover_Page.docx` — confirm layout matches spec, no page number,
   no running header, Chen's real name/business ("Chen Learning Centers
   LLC", Cedar Park TX)
4. Open `01_Table_of_Contents.docx` — confirm all 6 tabs listed in correct
   order (A, D, F, H, I, J) with titles/descriptions, dot leaders render
5. Open one divider (`Tab_D_Divider.docx`) — confirm "TAB D" / "COVER
   LETTER" / description, no page number, footer has name + "E-2 Visa
   Application"
6. Confirm the 6 renamed document files still open correctly and their
   existing per-document headers/footers (from docx-builder.ts,
   unchanged) still work
7. Open updated `COMPLETE-BEFORE-SUBMITTING.docx` — confirm new intro
   paragraph, placeholder list still populates as before
8. npm run build clean

---

## COMPLETION REPORT

```
SESSION 4 — Package assembly complete.

Step 1: Shared constants module: [path]
  DOC_TYPE_TAB_MAP relocation: [moved / re-exported / left in place — which]

Step 2: Cover page builder: [path] — renders: [yes/no]
  Data source for applicantName/businessName/etc: [existing query used]
  passportNumber: [real value / bracket placeholder]

Step 3: TOC builder: [path] — renders: [yes/no]
  Page-number approach chosen: [dot leader → filename / no page column / other]
  Dot leader native support in docx lib: [yes/no — fallback used?]

Step 4: Divider builder: [path] — renders for all 6 tabs: [yes/no]

Step 5: ZIP assembly — file: [path modified]
  Total files in ZIP: [count] — order confirmed: [yes/no]
  Existing 6 docs renamed (not regenerated): [confirmed yes/no]

Step 6: Checklist intro updated: [yes/no]

Verification (Chen 9f981747-...):
  All 15 files generated: [yes/no, list any missing]
  Cover page correct: [yes/no]
  TOC correct, all 6 tabs in order: [yes/no]
  Dividers correct: [yes/no]
  Renamed docs still open/format correctly: [yes/no]
  Checklist updated: [yes/no]

Build: clean / errors: [list or none]

Known limitations noted to owner: [continuous page numbering across
  files not implemented — explain chosen alternative]
```
