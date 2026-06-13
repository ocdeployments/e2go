# Walsh and Pollard Citation Fix — Context Gathering

**Read-only investigation. No edits this session.**

This follows the grep audit that found "Matter of Walsh and Pollard,
8 I&N Dec. 288 (BIA 1958/1962)" — an incorrect citation — across 6
locations in 4 files. The correct citation is **Matter of Walsh and
Pollard, 20 I&N Dec. 60 (BIA 1988)**, Interim Decision #3111.

The fix also revises the legal framing attached to this citation, not
just the cite itself — so before drafting replacement text, the full
surrounding context of each instance is needed.

---

## Retrieve full content — exact current text, with line numbers

### 1. docs/Spec1_Analysis_Engine.md

- Lines 35-60 (covers the Investment Substantiality calculation block,
  including `walsh_pollard_satisfied` logic around lines 48-49)
- Lines 225-245 (covers the edge-case logic around line 239)
- Lines 280-300 (covers the `substantiality_memo` prompt-inputs list
  around line 288)

### 2. docs/Spec3_Generation_Prompts.md

- Lines 330-370 (covers the Substantiality Memorandum template,
  including the `[If Walsh & Pollard satisfied:]` conditional block
  around lines 351-361)
- Lines 410-440 (covers the second template block around line 430 —
  confirm which document this second instance belongs to)

### 3. prompts/v1/documents/cover_letter.md (underscored — current version)

- Lines 210-235 (covers Section IV — Substantial Investment template,
  including line 226's "Reference Walsh and Pollard standard" with
  full citation)

### 4. prompts/v1/documents/investment_proof.md (underscored — current
   version)

- Lines 145-185 (covers lines 161 and 176 — the citation itself and
  the "Comparison to Walsh and Pollard proportionality benchmarks"
  language)
- Lines 225-240 (covers line 234 — the QA checklist item "Walsh and
  Pollard standard correctly cited")

---

## Also confirm

1. **Which prompt files does `src/lib/generation-engine.ts` actually
   import/read?** For each of the 7 document types, list the exact
   filename it reads (underscored vs hyphenated). This resolves
   whether the hyphenated duplicates (`cover-letter.md`,
   `investment-proof.md`, etc.) are dead files or live — and whether
   they also need editing or can be left/removed separately.

2. **`docs/E2_Engine_Knowledge_Base_June3_2026.md` line 64 and line
   775** — full surrounding context (10 lines each). This file
   doesn't feed prompts directly per Spec3, but confirm whether
   anything in `generation-engine.ts` reads from this file at
   runtime (e.g., as injected "knowledge context").

3. **`docs/Document_Generation_Standards.md` line 235** — full
   surrounding context (10 lines). Confirm: is this file read by
   `generation-engine.ts` at runtime, or is it documentation-only
   (i.e., describes intended specs but isn't itself injected into
   prompts)?

---

## Report format

For each location above, output the exact current text verbatim with
line numbers, so replacement text can be drafted against the real
content. Do not summarize or paraphrase — exact text only.

Do not edit any files this session.
