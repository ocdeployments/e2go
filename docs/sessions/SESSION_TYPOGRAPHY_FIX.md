# SESSION — Document Typography: Century Schoolbook + Heading Hierarchy

**Branch:** dev
**Priority:** 🔴 HIGH
**Agent:** engineering-minimal-change

---

## START SESSION

Read src/lib/docx-builder.ts (and checklist-builder.ts) fully first.
Report current font, and current heading/section-title styling, before
changing anything.

---

## CONTEXT

New locked typography standard (supersedes any prior "Times New Roman"
reference):

- **Font: Century Schoolbook, 12pt** (fallback order if unavailable:
  Garamond → Georgia → Book Antiqua/Palatino)
- 1-inch margins, 1.5 line spacing (unchanged)
- Header `[LastName] E-2 Application | [Doc Name] | [Date]`, plain
  page-number footer (unchanged)
- `[bracket]` placeholders highlighted yellow (Session 1, Fix A)

## ISSUE — "Just looks like a Word document, not professional"

Generated content already contains literal section markers as text:
"I. Introduction and Overview", "II. Treaty Nationality", etc. If
these render as plain body-text paragraphs (same size/weight as
everything else), the document reads as undifferentiated text even
with correct font/margins.

## FIX 1 — Font

Replace Times New Roman (or whatever current font is) with Century
Schoolbook, 12pt, throughout. Check the docx library's font-embedding/
fallback behavior — if Century Schoolbook isn't reliably available
cross-platform, confirm Garamond or Georgia as the practical default
and note this.

## FIX 2 — Heading Hierarchy

Detect lines matching `^[IVXLCDM]+\. ` (Roman numeral + period + space
+ text) at the start of a line — these are section headers. Style
these distinctly from body text: e.g. bold, slightly larger (13-14pt),
extra spacing above/below, possibly small-caps or a thin rule line
above — pick ONE treatment that reads as "section heading" in a formal
legal document, consistent with Century Schoolbook's character. Do NOT
make this look like the app's Obsidian Gold UI (no gold color, no
sans-serif) — this is a separate, formal-document-only style.

Body paragraphs (everything else) remain 12pt Century Schoolbook,
1.5 spacing, normal weight.

## VERIFY

Rebuild all 7 files for application 9f981747-e3e4-4941-9f86-9871f8117b66
(same approach as Session 1 — direct builder calls, recovered
content_text). Open cover_letter.docx — confirm:
- Body text is Century Schoolbook 12pt (or documented fallback)
- "I. Introduction and Overview" etc. are visually distinct headings,
  not plain paragraphs
- Previously-fixed items (brackets highlighted, table renders,
  checklist populated) still correct

Write updated 7 files to /mnt/user-data/outputs/, overwriting Session
1's versions.

## COMPLETION REPORT

```
Current font found: [...]
Current heading styling found: [none/described]

Fix 1: Font changed to: [Century Schoolbook / fallback used, why]
Fix 2: Heading style applied: [description]

Verify: heading distinct from body: [yes/no]
  Brackets/table/checklist still correct: [yes/no]

Files written to: /mnt/user-data/outputs/
Build: clean / errors: [...]
```
