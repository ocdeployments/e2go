# SESSION S15 — Document Package Download (.docx ZIP)

**Branch:** dev
**Priority:** 🔴 HIGH — unblocked, next in sequence after Fix 2
**Agent:** engineering-frontend-developer
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md fully.
Read docs/Spec4_Quality_Gate_Pipeline.md — Release Stage section only
(the acknowledgment gate is already built; this session is about what
happens AFTER acknowledgment).
Read src/lib/generation-engine.ts fully — understand the
`generated_documents` table schema and where final `content_text`
lives after steps 11-14.
Read src/app/generate/[applicationId]/page.tsx fully.
Read src/components/AcknowledgmentGate.tsx fully.

Confirm skills active: docx-template, ui-ux-pro-max,
full-output-enforcement.
Confirm MCP servers active: Playwright, Lazyweb.
Do not use Magic MCP for backend logic — only for UI components in
Step 4 if needed.

---

## RESOLVE A SPEC CONFLICT BEFORE STARTING — READ THIS FIRST

`Spec4_Quality_Gate_Pipeline.md`'s "What Downloads" section says the
ZIP contains both `.docx` AND `.pdf` versions of each document. This
**contradicts the locked architecture decision** in CLAUDE_CONTEXT.md /
BUILD_TRACKER.md: documents are exported as Word (`.docx`) **only**,
with `[BRACKET FORMAT]` placeholders highlighted yellow for fields the
user must complete locally (passport numbers, dates, appointment
dates) before submission. A PDF would lock those fields — defeating
the purpose of leaving them editable.

**The locked decision wins. Build `.docx` output only. Do not generate
PDFs.** If you find PDF-related code already in generation-engine.ts
related to this, flag it but do not remove it without confirming scope
first.

---

## CONTEXT

Steps 1-14 of the generation pipeline are complete and verified.
`generation_pipeline_log.applicant_acknowledged = true` and
`final_status = 'RELEASED'` after the AcknowledgmentGate is confirmed
(verified end-to-end in the prior session). This session builds what
happens next: the actual downloadable package.

---

## STEP 1 — PLAN

Use Sequential Thinking MCP. Think through:

1. `generated_documents` table — `content_text` per `document_type`,
   for all 6 document types in this application's case file
2. Confirm the docx-template skill location and how it converts
   `content_text` → formatted `.docx`: Times New Roman 12pt, 1-inch
   margins, 1.5 line spacing, Roman numeral sections, header
   `[Last Name] E-2 Application | [Document Name] | [Date]`, plain
   page number footer, per the locked format spec
3. How `[BRACKET FORMAT]` placeholders get highlighted yellow in the
   generated `.docx` — confirm the docx-template skill supports
   highlight/shading, or identify the library that does
4. The `COMPLETE-BEFORE-SUBMITTING.docx` checklist — does this need
   to be generated dynamically (listing which brackets exist across
   all documents) or is it a static template?
5. ZIP assembly — Node.js `archiver` (check package.json first)
6. Naming convention for files in the ZIP
7. Where the gate sits: the download route must check
   `generation_pipeline_log.applicant_acknowledged = true AND
   final_status = 'RELEASED'` for this `application_id` before
   allowing download

Report the plan. Wait for confirmation before proceeding.

---

## STEP 2 — LAZYWEB RESEARCH

Use the Lazyweb MCP to search for:
- "document package download ready state dark luxury UI"
- "ZIP download button progress dark theme"
- "completed application package download confirmation"

Study how high-quality apps present a completed package and the
"ready to download" moment.

---

## STEP 3 — CONFIRM DEPENDENCIES

Check the docx-template skill is available and review its API.
Check package.json for `archiver` or `jszip` — install `archiver` if
neither is present:

```bash
npm install archiver
```

Search for any existing `.docx` generation code already in the
codebase (search for "docx" across `src/lib/`).

Report findings before proceeding.

---

## STEP 4 — BUILD THE DOWNLOAD API ROUTE

Create `src/app/api/generate/download/[applicationId]/route.ts`

1. Verify auth — user must own this application
2. Verify gate: the `generation_pipeline_log` row for this
   `application_id` has `applicant_acknowledged = true AND
   final_status = 'RELEASED'`. If not, return 403.
3. Read all 6 documents from `generated_documents` for this
   `application_id` (`content_text`, final post-step-14 version)
4. For each document, generate a `.docx` using docx-template:
   - Times New Roman 12pt, 1-inch margins, 1.5 line spacing
   - Roman numeral section headers
   - Header: `[Last Name] E-2 Application | [Document Name] | [Date]`
   - Plain page number footer
   - No e2go branding anywhere
   - Any `[BRACKET FORMAT]` text highlighted yellow
5. Generate `COMPLETE-BEFORE-SUBMITTING.docx` — scan all 6 documents
   for `[BRACKET FORMAT]` placeholders, compile into a checklist
   document listing each one and which document it appears in
6. Assemble all 7 files into a ZIP using `archiver`
7. Stream the ZIP as the response with an appropriate
   `Content-Disposition` header for download
8. Log the download event — add a `downloaded_at` timestamp to
   `generation_pipeline_log` for this `application_id`

---

## STEP 5 — BUILD THE UI

In `src/app/generate/[applicationId]/page.tsx`, after
`AcknowledgmentGate` confirms (`applicant_acknowledged = true`):

- Show a "Your documents are ready" state
- Use the Lazyweb-researched download pattern: clear CTA, brief
  description of what's in the package (7 files: 6 case file
  documents + the completion checklist)
- Obsidian Gold styling — `#0a0a0a`, `#C9A84C`, Cormorant Garamond
  (light + italic weight contrast), DM Sans body, zero border-radius,
  no glassmorphism
- Download button calls the route from Step 4
- After download starts, show a brief confirmation state — do not
  imply anything about visa outcome or legal sufficiency in this copy

---

## STEP 6 — VERIFY

- `npm run build` — confirm clean
- `npx tsc --noEmit` — confirm clean
- Manual test: using Michael James Chen's application
  (`9f981747-e3e4-4941-9f86-9871f8117b66`, `SKIP_PAYMENT_WALL=true`),
  hit the download route directly (curl or browser) and confirm:
  - A ZIP is returned containing 7 `.docx` files
  - Each document has correct formatting (open at least one to check
    font, margins, header/footer)
  - `[BRACKET FORMAT]` placeholders are highlighted yellow
  - `COMPLETE-BEFORE-SUBMITTING.docx` lists the correct placeholders
  - No e2go branding, no AI markers, no metadata identifying the
    creator in any file (right-click → Properties on a sample .docx)

Use Playwright to screenshot localhost:3000 and confirm the "ready to
download" UI renders correctly with Obsidian Gold styling.

---

## UPDATE BUILD_TRACKER.md AND CLAUDE_CONTEXT.md

Mark S15 complete. Note the Spec4 PDF/docx conflict was resolved in
favor of the locked `.docx`-only decision — flag this for a future
cleanup pass on Spec4_Quality_Gate_Pipeline.md's "What Downloads"
section so it doesn't mislead future sessions.

Note that with S15 complete, the full pipeline (quiz → checkout →
Module 3 → generation → acknowledgment → download) is now feature-
complete end to end. The **end-to-end payment test** (Priority 3,
Michael James Chen) is now the natural next session — it can exercise
this exact download as its final verification step.

---

## COMPLETION REPORT — report exactly:

```
S15 — Document package download complete.

Plan confirmed: [yes/no, any deviations]
Files created: [list]
Files modified: [list]
ZIP contents verified: [7 files, names]
Formatting verified: [font/margins/header/footer/highlight — pass/fail]
Metadata check: [clean/issues found]
Spec4 conflict noted: [yes — flagged for cleanup]
Build: clean / errors: [list or none]
Next: end-to-end payment test unblocked
```
