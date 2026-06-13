# SESSION 2 — Pre-Generation Confirmation: Commit Specs + Build

**Branch:** dev
**Priority:** 🔴 HIGH — this is the core checks-and-balances feature
designed tonight; Session 3's walkthrough depends on it existing
**Agent:** engineering-frontend-developer (UI + new screen) — may need
to split into a second pass with engineering-minimal-change for the
backend validation function if scope is large
**Read before starting:**
- docs/CLAUDE_CONTEXT.md (after Step 0 below — it's about to change)
- docs/Spec1_Analysis_Engine.md (after Step 0 — Category A extensions
  + new "Pre-Generation Confirmation Log" + "Display to User" sections
  are the SPEC FOR THIS SESSION)
- docs/Spec4_Quality_Gate_Pipeline.md (after Step 0 — Stage 4, for
  context on the RELATED but separate post-generation check)
- docs/DESIGN_REFERENCE.html (Obsidian Gold — this is new UI)

---

## STEP 0 — COMMIT THE THREE UPDATED SPEC FILES FIRST

Three complete, ready-to-use files were produced in a prior planning
session and are NOT yet in the repo:

- `CLAUDE_CONTEXT.md` (625→671 lines) — adds RULE 3A (Quality-Gate
  Failure Handling: the Type 0/1/2 framework + tone principle)
- `Spec1_Analysis_Engine.md` (328→460 lines) — extends Category A with
  3 new consistency-based hard gaps, adds "Pre-Generation Confirmation
  Log" table schema, extends "Display to User" with the Investment
  Figures Confirmation Panel + discrepancy-pushback + tone principle
- `Spec4_Quality_Gate_Pipeline.md` (638→697 lines) — rewrites Stage 4:
  extended CONSISTENCY_FIELDS, a "Scope — What This Check Does NOT Do"
  section, Timeline Validator, specific-document-correction handling

These files are provided alongside this session (check
docs/sessions/ or wherever they were placed — filenames
CLAUDE_CONTEXT.md, Spec1_Analysis_Engine.md,
Spec4_Quality_Gate_Pipeline.md). REPLACE the current versions in docs/
with these. Confirm via diff that each replacement is a clean
superset of the current file (new content added, nothing existing
removed) — all three were diff-verified against the live repo when
produced, but confirm again since other sessions may have touched
these files since.

Commit this step separately before starting the build:
`git commit -m "docs: pre-generation confirmation spec + RULE 3A +
Stage 4 rewrite"`

---

## CONTEXT — WHAT THIS SESSION BUILDS, AND WHY

Tonight's live test (Michael Chen application,
`9f981747-e3e4-4941-9f86-9871f8117b66`) produced 6 documents that were
individually excellent and internally consistent (all correctly stated
$185,000), but a broken post-generation consistency check (Spec4 Stage
4, separately fixed — see SESSION_RECOVERY_DOWNLOAD_AND_FIX.md Piece 3)
caused 4 of them to be overwritten with AI refusals reacting to a
FALSE conflict.

The discussion that followed concluded: the BEST fix isn't just
"better post-generation checking" — it's catching data issues BEFORE
generation starts, by showing the applicant their own numbers and
having them confirm. This is now specced in Spec1's extended Category
A + new "Investment Figures Confirmation Panel" section (Display to
User). THIS SESSION BUILDS THAT PANEL.

**The four-layer framework (RULE 3A) this fits into:**
1. Pre-generation confirmation (THIS SESSION) — catch data issues
   before they exist in any document
2. Data-completeness auto-resolution (NOT this session — Type 1 gaps,
   prompt-builder should include data that exists elsewhere; out of
   scope, future work)
3. One-round applicant clarification for genuine Type 2 gaps,
   resolving to bracket (PARTIALLY covered — Category A's existing
   "return to relevant tab with specific instruction" IS this, for
   gaps Category A catches; this session's panel is itself a form of
   this for the 3 NEW consistency-based Category A items)
4. Post-generation check as a final sanity net (Spec4 Stage 4,
   separately handled — Session 1/Piece 3 area, not this session)

This session is Layer 1 + part of Layer 3. Layers 2 and the full
Spec4 rewrite (vs. the minimal Piece 3 fix) are explicitly OUT OF
SCOPE — do not expand into them.

---

## STEP 1 — LOCATE WHERE THIS SCREEN BELONGS IN THE FLOW

Per CLAUDE_CONTEXT's route map, Module 4
(`/apply/module4` — voice sample + follow-up) is the step before
`/generate/[applicationId]`. Per Spec2_Followup_Conversation.md, Module
4's Stage 3 ("Completion") currently shows a summary + "[Build my
documents →]" button.

The Investment Figures Confirmation Panel (new Spec1 section) should
appear AFTER Module 4's Stage 3 (the analysis engine / Case Brief
needs Module 3 + Module 4 data to compute investment_breakdown etc.)
and BEFORE generation actually starts — i.e., it's the LAST screen
before `/generate/[applicationId]`, or the FIRST thing
`/generate/[applicationId]` shows before the SSE pipeline kicks off.

Read src/app/apply/module4/page.tsx (Stage 3 / completion screen) and
src/app/generate/[applicationId]/page.tsx (the generation page's
initial state, before SSE connects) to determine: does the new panel
become a NEW STEP within module4 (Stage 3.5?), or a NEW INITIAL STATE
on the generate page (before "Preparing to generate..." begins)?

Report your recommendation before proceeding — this is a real
architectural decision, not a styling one.

---

## STEP 2 — BUILD THE VALIDATION FUNCTION (shared, backend)

Per Spec1's extended Category A, the analysis engine needs to compute,
in addition to existing scores:

```
investment_breakdown_sum = sum of all investment_breakdown line items
fund_sources_sum = sum of all fund_sources amounts

breakdown_matches_total = (investment_breakdown_sum == investment_amount_usd,
  within $1 tolerance)
sources_match_total = (fund_sources_sum == investment_amount_usd,
  within $1 tolerance)
total_business_cost_present = (total_business_cost_usd is not null)
```

If ANY of these three checks fails → this is one of the 3 NEW
Category A hard gaps → `ready_for_generation = false` →
`blocking_gaps` includes the specific failure.

Find where the existing 5 Category A checks are implemented (likely
in an analysis-engine module — search for `investment_amount_usd =
null` or `ready_for_generation` or `blocking_gaps`). Add these 3 new
checks alongside the existing 5, following the same pattern.

THIS FUNCTION IS THE SHARED SOURCE OF TRUTH — per the new Spec1's note
in Piece 3's section of SESSION_RECOVERY_DOWNLOAD_AND_FIX.md, if/when
the full Spec4 Stage 4 is later implemented, it should call THIS same
function rather than re-deriving consistency rules. Write it as an
exportable, independently-testable function for that reason, even if
not strictly required for THIS session's UI.

---

## STEP 3 — BUILD THE CONFIRMATION PANEL UI

Per Spec1's "Investment Figures Confirmation Panel" section (read it
in full — it specifies the exact copy/tone). Key elements:

1. **Breakdown table** — each `investment_breakdown` line item shown
   with: dollar amount (large, prominent — Cormorant Garamond per
   Obsidian Gold) + plain-language purpose (from the line item's
   description field). Running TOTAL shown, recalculates live if
   edited.

2. **Fund sources** — similarly narrated ("$110,000 — from your
   personal savings").

3. **Each dollar figure is an editable inline field.** On edit,
   recalculate the relevant total live (client-side).

4. **Confirm button** — "Confirm — this is correct →" — disabled/
   unavailable if breakdown or sources don't currently sum to the
   total (i.e., if an edit broke consistency and the discrepancy-
   pushback, Step 4 below, hasn't been resolved yet).

5. **"Something needs fixing" option** — per spec, this should let the
   applicant navigate back to the relevant Module 3 tab (Tab F/H,
   or their /apply/investment equivalent per the new 6-section
   structure) rather than edit inline, for CHANGES BEYOND simple
   number corrections (e.g. adding a whole new fund source). Inline
   editing on THIS screen is for "I see a typo / wrong number," not
   for restructuring.

6. **Tone** — per Spec1's Tone Principle subsection, EXACTLY. This
   governs every string of copy on this screen. Read it before
   writing any UI copy.

Use Lazyweb MCP to research: "financial summary confirmation screen
dark luxury UI", "investment breakdown table editable inline dark
theme", "ledger style numbers serif dark background" — this should
look like a private-banking statement, per tonight's design
discussion (Cormorant Garamond serif numerals, generous whitespace,
gold line-art).

---

## STEP 4 — DISCREPANCY PUSHBACK (one round, bounded)

Per Spec1's spec: if an inline edit causes breakdown-sum ≠ total (or
sources-sum ≠ total):

Show ONE prompt: "That would put [edited line item] at [new value] —
but your total investment was $[total]. Did you mean [new value], or
has your total investment changed too?"

Two options:
- "Yes, [new value] is correct — update my total to $[recalculated]"
  → total_amount_usd updates to the new sum, Confirm becomes available
- "No, I meant to enter a different number" → the edited field reverts
  to editable state, no total change, Confirm remains unavailable
  until a consistent value is entered

ONE ROUND ONLY — per spec, if the applicant re-confirms an unusual
figure after this single prompt, accept it. Do not show this prompt
again for the same field in the same session.

---

## STEP 5 — pre_generation_confirmation TABLE + LOGGING

Per Spec1's new "Pre-Generation Confirmation Log" section — exact
schema provided there. Write the migration
(`supabase/migrations/[timestamp]_pre_generation_confirmation.sql`)
per RULE 4 (CREATE TABLE IF NOT EXISTS, RLS enabled).

On Confirm button click, write one row:
- `shown_breakdown_json` / `shown_fund_sources_json` — the values AS
  DISPLAYED at confirmation time (i.e., post any edits)
- `edits_made` — `[]` if the applicant changed nothing, else the list
  of {field, old_value, new_value}
- `discrepancy_prompted` / `discrepancy_resolution` — per Step 4, if
  the pushback fired
- `confirmed_at = now()`

---

## STEP 6 — WIRING

On Confirm, proceed to generation (`/generate/[applicationId]` SSE
pipeline starts, per existing Step 1-15 flow — THIS SESSION DOES NOT
CHANGE STEPS 1-15, only what happens BEFORE Step 1).

If `ready_for_generation = false` from Step 2's new checks (i.e., the
confirmation panel ITSELF can't even render because, say,
`total_business_cost_usd` is null and there's nothing to show as a
total business cost) — per Category A's existing pattern, return the
applicant to the relevant tab (likely /apply/investment, per the new
6-section Module 3 structure — confirm which section covers Tab K's
`total_business_cost_usd` question) with specific instruction, same as
the original 5 Category A checks already do. Find and follow that
existing pattern exactly — do not invent a new "return to tab"
mechanism.

---

## VERIFY

- npm run build — clean
- npx tsc --noEmit — clean
- Use Playwright to screenshot localhost:3000 and confirm the
  confirmation panel renders correctly with Obsidian Gold styling,
  for Michael Chen's application (9f981747-...) — it should show his
  REAL $185,000 breakdown (7 line items) and 2 fund sources, matching
  what was read directly from his recovered documents tonight.
- Manually test: edit one line item to break consistency, confirm the
  discrepancy-pushback appears with correct copy, test BOTH resolution
  paths, confirm ONE-ROUND limit (re-edit doesn't re-trigger pushback)
- Confirm the pre_generation_confirmation row is written on Confirm
- Confirm clicking Confirm proceeds to /generate/[applicationId] and
  the existing SSE pipeline starts normally

---

## DO NOT IN THIS SESSION

- Do not modify Steps 1-15 of the generation pipeline itself
- Do not implement the full Spec4 Stage 4 rewrite (CONSISTENCY_FIELDS
  extension, timeline validator) — that's separate, later work, and
  Piece 3's minimal fix already handles the immediate post-generation
  case
- Do not implement Layer 2 (data-completeness auto-resolution / Type 1
  gaps) — out of scope
- Do not touch Session 1's .docx builder fixes (separate session)

---

## COMPLETION REPORT

```
SESSION 2 — Pre-generation confirmation panel complete.

Step 0: Three spec files committed — confirmed clean supersets: [yes/no]

Step 1: Panel location decision: [Module 4 Stage 3.5 / generate page
  initial state] — reasoning: [...]

Step 2: Validation function — 3 new checks added to: [file]
  Exportable/shared as designed: [yes/no]

Step 3: Confirmation panel UI — files created/modified: [list]
  Renders Michael Chen's real $185,000 / 7-item breakdown: [yes/no]

Step 4: Discrepancy pushback — tested both paths, one-round limit
  confirmed: [yes/no]

Step 5: pre_generation_confirmation table — migration file: [path]
  Row written on confirm, confirmed via query: [yes/no]

Step 6: Wiring — Category A return-to-tab pattern followed: [yes/no,
  which existing pattern/file]
  Confirm → /generate proceeds normally: [yes/no]

Build: clean / errors: [list or none]
Playwright screenshot: [confirm taken, describe what's shown]
```
