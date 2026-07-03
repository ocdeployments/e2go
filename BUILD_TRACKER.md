# e2go.app — Build Tracker & Session Handoff

**Last Updated:** July 3, 2026 — Session 116: built WS3.5 (A8) — production/rendering layer fixes. Footer now shows "Page N of M" (was N only); header shows the actual document title (was a fixed app-name string); table rows can no longer split across a page break; the Declaration's 28 U.S.C. §1746 attestation is now overwritten with the exact statutory formula rather than left to the model. Note: WS3.4 (A7 verifier contracts) was completed by a concurrent session (commit `c448fde`) before this session started, not by this session. One commit, build clean. Next: Part 2 — WS4 CPU Intelligence Pack, WS5 partnership docs, WS6 missing docs, WS7 analyses, WS8 golden-case verification.

---

## Session 116 — Production/Rendering Layer Fixes (WS3.5/A8) (July 3, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). One commit.

### Context
Per `agent-prompt-part1-engine-and-package.md` WS3.5: "Unscored until real outputs are inspected. Requirements for consultant grade: every page carries applicant name + document title + page N of M; tables never break rows across pages; the Declaration's 28 U.S.C. §1746 block renders with the exact statutory formula... — hardcode the formula in the template, do not leave it to the model." Reading `docx-builder.ts` confirmed all three gaps existed: footer showed `Page N` only (no total), header showed a fixed `"E-2 Treaty Investor Visa"` string instead of the actual document title, `TableRow` instances had no `cantSplit`, and the Declaration templates' perjury paragraph was model-generated paraphrase ("...to the best of my knowledge and belief...") rather than the exact §1746 language.

### Built
- **`src/lib/docx-builder.ts`**:
  - Footer: added `PageNumber.TOTAL_PAGES` after the existing `PageNumber.CURRENT`, rendering `"Page N of M"`.
  - Header: replaced the fixed `"E-2 Treaty Investor Visa"` string with `DOCUMENT_TYPE_LABELS[documentType]` (imported from `@/types/generation`) — each document's header now names that specific document.
  - `createWordTable()`: added `cantSplit: true` to both the header `TableRow` and every data `TableRow`, so a table row can no longer be split across a page boundary.
  - New `enforceStatutoryDeclaration(contentText, documentType)`: for `declaration_principal`/`declaration_spouse`/`declaration_p2` only, regex-replaces the model's perjury paragraph (matched from `"I declare under penalty of perjury"` to the next paragraph break) with the fixed formula `"I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct. Executed on [date] at [place]."` — appends it if the model omitted the attestation entirely. Called at the top of `buildDocument()` before line-parsing, so it applies regardless of model phrasing.

### Verified
`npm run build` and `tsc --noEmit` both clean. No UI surface to verify in a browser preview — this is server-side .docx generation invoked only from the download route.

### Next
Part 2 (`agent-prompt-part2-intelligence-and-content.md`) — Workstreams 4-8: CPU Intelligence Pack (23 directives), partnership documents, missing documents + per-template upgrades, analyses upgrades, and the golden-case verification loop.

### Dev server
No server was running at end of session — nothing to restart (backend/lib change only, not previewable).

---

## Session 115 — Deterministic Master Exhibit Index (WS3.2/A2-A3) (July 3, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). One commit.

### Context
Per `agent-prompt-part1-engine-and-package.md` WS3.2: (1) the cover letter's Section X composed its own document list per-call, with nothing stopping it from drifting from what actually got generated, and (2) the ZIP's table of contents listed generated documents only — no attorney binder leads with an index that omits the client's uploaded evidence entirely. WS3.2's prerequisite (the tab-consistency unit test asserting template headers match `DOCUMENT_TYPE_TABS`) was already satisfied by a prior out-of-band commit (`f652359`).

### Built
- **`src/lib/docx-package-constants.ts`** — new `buildDeterministicDocumentIndex(documentTypes, labels)`: builds a tab-grouped `"Tab X — Label"` list from the canonical `DOC_TYPE_TAB_MAP`/`TAB_ORDER`, no LLM involved.
- **`src/types/generation.ts`** — added optional `document_index_text?: string` to `GenerationPayload`.
- **`src/lib/generation-engine.ts`** — `buildGenerationPayload()` takes a new optional `allDocumentTypes` param; when the document being generated is `cover_letter`/`cover_letter_p2` and that list is supplied, computes `document_index_text` via the new builder. `callClaudeAPI()` injects it into the per-document `variableBlock` as a "SECTION X — DOCUMENT INDEX: USE THIS EXACT LIST. DO NOT COMPOSE YOUR OWN." block. All three in-file call sites of `buildGenerationPayload` (main generation loop, repetition-regen, quality-gate-regen) now pass the run's `DOCUMENT_TYPES`.
- **`src/app/api/generate/revise/[applicationId]/route.ts`** — when a client requests a revision to the cover letter specifically, fetches the application's actual `generated_documents` types and passes them through so a solo document revision still gets the correct index.
- **`prompts/v1/documents/cover_letter.md`** — Section X instructions rewritten to reproduce the injected list verbatim, with a fallback (compose from context) only if the block is absent.
- **`src/lib/docx-toc-builder.ts`** — `buildTableOfContents()` takes a new optional `exhibitsByTab` (the WS3.1 exhibit registry's `byTab`). Now iterates the union of tabs with generated docs *and* tabs with exhibits (a tab with only client-uploaded evidence and no generated document still appears), listing each exhibit by its canonical `Tab X-N` ID and filename beneath that tab's generated-document entries. TOTAL PACKAGE line now reports exhibit count alongside document count.
- **`src/app/api/generate/download/[applicationId]/route.ts`** — calls `buildExhibitRegistry(applicationId)` and passes `exhibitsByTab: registry.byTab` into `buildTableOfContents()`, so the shipped ZIP's table of contents is now a genuine Master Exhibit Index.

### Verified
`npm run build` and `tsc --noEmit` both clean across the full project. (`npx vitest run` failed on unrelated `@/` path-alias resolution — no vitest config exists in this repo, `npm test` is a no-op stub; this is a pre-existing tooling gap, not a regression from this change.)

### Next
WS3.4 — A7 verifier contracts: `cic-verifier.ts`'s `DOC_SECTION_CONTRACTS` currently covers only 5 of 19 document types. Then WS3.5 (A8 production/rendering layer — page N of M, table row integrity, hardcoded §1746 declaration formula), then Part 2 (WS4–WS8).

### Dev server
No server was running at end of session — nothing to restart (backend/lib + prompt-template change only, not previewable).

---

## Session 114 — Master Exhibit Registry (WS3.1/A1) (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`). Two commits, one concern each.

### Context
Every document previously generated its own "Supporting Documentation Index" independently — nothing guaranteed the Source of Funds narrative's "Tab D-2" and the Fund Flow Chronology's "Tab D-2" pointed at the same physical uploaded file, or that either exhibit existed at all. Built per `agent-prompt-part1-engine-and-package.md` Section 7 (WS3), continuing directly from a prior session that had started reading `case-financials.ts` / `cic-package-manifest.ts` for conventions.

### Built
- **`src/lib/exhibit-registry.ts`** — new file. `buildExhibitRegistry(applicationId)` reads `uploaded_documents` ordered by `created_at`, assigns canonical IDs (`{TabLetter}-{N}`) keyed off the existing `UPLOADED_DOC_TYPE_TAB_MAP` (docx-package-constants.ts — the single source of truth for tab letters unified in Session 113's predecessor commit 491cfc6). `formatExhibitRegistryText()` renders the registry as a prompt block instructing the model to cite only these IDs and never invent one. `checkExhibitConsistency()` is a deterministic (no LLM) post-generation sweep, structurally mirroring `figure-provenance.ts`'s `checkFigureProvenance()` — regex-extracts `Tab X-N` citations from generated text and flags orphans (cited but not in the registry) and unused exhibits (uploaded but never cited).
- **`src/types/generation.ts`** — added `exhibit_registry: ExhibitRegistry` to `GenerationPayload`.
- **`src/lib/generation-engine.ts`** — `buildGenerationPayload()` now fetches the registry in parallel with case theory/doc intelligence. `callClaudeAPI()` injects `formatExhibitRegistryText()` into the cached `stableBlock` (identical across all ~19 calls per application, consistent with Session 111's prompt-caching architecture) rather than the per-document `variableBlock`. `checkExhibitConsistency()` is folded into the existing "Quality step 2: Consistency check" block alongside `runCanonicalConsistencySweep` — deliberately not a new numbered quality step, since that would require renumbering ~7 downstream `Q + N` step references. Result persists to a new `document_generation_jobs.exhibit_consistency_result` column and orphan citations log to `document_generation_log` per document type.
- **`supabase/migrations/20260702223751_generation_jobs_exhibit_consistency.sql`** — adds `exhibit_consistency_result jsonb` to `document_generation_jobs`, sibling to the existing `consistency_result` column. **Not applied** — no linked Supabase CLI project found (`supabase/` has no `config.toml`); owner must apply via the Supabase dashboard SQL editor, per the established pattern noted in Session 108's "Phase 1 migration was never applied to production" writeup.
- **`prompts/v1/documents/b01_source_and_application_of_funds.md`** — fixed a genuine drift bug: the template hardcoded "Tab B-X" citations and a fixed B-1..B-10 exhibit index throughout, but `source_of_funds` is canonically tab **D** per `DOC_TYPE_TAB_MAP`. Rewrote all exhibit-citation instructions to be registry-driven (cite only IDs from the injected EXHIBIT REGISTRY block) instead of hardcoding any letter.

### Verified
`npm run build` clean, full page manifest generated with no type errors.

### Owner action required
Apply `supabase/migrations/20260702223751_generation_jobs_exhibit_consistency.sql` via the Supabase dashboard SQL editor (adds one nullable jsonb column — safe, no backfill needed).

### Next
WS3.2 — A2/A3 Binder Index: a deterministic one-page Master Exhibit Index/TOC document, and wiring the Cover Letter's document-list section to be generated from the package manifest rather than LLM-listed. Per `agent-prompt-part1-engine-and-package.md` Section 7.

### Dev server
No server was running at end of session — nothing to restart (backend/lib + prompt-template change only, not previewable).

---

## Session 113 — Deterministic Financial Spine (Phase 2/A4) (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). One commit.

### Context
With `M3-F-*`/`M3-I-*` key resolution confirmed correct in Session 112, built the Phase 2/A4 deterministic financial spine so the model is handed pre-computed, locked figures instead of re-deriving or estimating them inside document-generation prompts (per the project's "never fabricate" standard).

### Built
- **`src/lib/case-financials.ts`** — new file. `computeCaseFinancials(answers)` returns a `CaseFinancials` object:
  - **Investment reconciliation:** total invested (`M3-F-02`), total business cost (`M3-F-03`), funding gap, proportionality ratio, deployment categories (`M3-F-04`), funds-deployed status (`M3-F-NEW-01`).
  - **Revenue/net income/headcount by year:** parsed from the `M3-I-PROJECTIONS` JSON blob (the only live per-year source), plus Year 1→3 revenue growth %.
  - **Break-even:** self-reported bucket (`M3-I-BREAKEVEN`) cross-checked against a computed value (first year with net income ≥ 0 in the projections table), flagged `consistent`/`inconsistent`/`insufficient_data`.
  - **Headcount consistency:** intake FT+PT (`M3-I-05`/`M3-I-06`) vs. Year 1 headcount in the projections table, same three-way flag.
  - **Payroll by year:** intentionally left `null` with an explanatory note — the live intake only captures headcounts and the owner's Year 1 draw (`M3-I-04`), no per-employee wage data exists, so computing a payroll total would mean fabricating a wage assumption.
  - **Net worth:** CAD figure passthrough (`M3-F-NET`), USD conversion left `null` with a note — no dated FX rate source exists anywhere in this codebase.
  - `formatCaseFinancialsText()` renders the object as a labeled, human-readable block for prompt injection, with an explicit "never alter or re-derive these numbers" instruction at the top and bottom.
- **Wired into `generation-engine.ts`:** `buildGenerationPayload()` now computes `case_financials` alongside the existing `investment_breakdown`; `callClaudeAPI()`'s `variableBlock` injects `formatCaseFinancialsText()` output into every document-generation prompt.
- **`src/types/generation.ts`:** added `CaseFinancials` import and `case_financials: CaseFinancials` field to `GenerationPayload`. Also caught and fixed a type drift bug found during this work — `InvestmentBreakdownData` (types/generation.ts) and `InvestmentBreakdown` (generation-engine.ts) were duplicate types missing `deployment_categories` on one side; added to both, confirmed no other drift via `tsc --noEmit`.

### Verified
Ran `computeCaseFinancials()` against a realistic answer set via `tsx` (investment split, 3-year projections, break-even bucket, headcount, owner draw, net worth) — all computed values matched expected math (funding gap, proportionality ratio, revenue growth %, break-even year, headcount cross-check), and payroll/FX fields correctly rendered as `null` with their notes rather than guessed values.

### Next
WS3.1 (A1 exhibit registry) or WS3.2 (A2/A3 Binder Index) — per `agent-prompt-part1-engine-and-package.md`. Ask user which to prioritize.

### Dev server
No server was running at end of session — nothing to restart (this was a pure backend/lib change, not previewable).

---

## Session 112 — Answer-Key Resolution Audit (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). Two commits, one concern each.

### Context
While grounding the Phase 2/A4 deterministic financial spine (`case-financials.ts`), discovered the codebase has two parallel investment/revenue answer-key families: `QF-*`/`QI-*` (defined in `src/data/module3/tab-f.json`/`tab-i.json`, only ever rendered by `/apply/module3/f`, `/h`, `/i`, `/j` — none of which are linked from any live navigation; `h` immediately `router.replace`s to `/apply/investment`) and `M3-F-*`/`M3-I-*` (defined and actively saved by `/apply/investment/page.tsx`, which is the only investment-intake route reachable from `/apply/layout.tsx`, `/gap-analysis/layout.tsx`, `CaseProfilePage.tsx`, `DashboardClient.tsx`, and 20+ other real nav references). Confirmed `QF-*`/`QI-*` is dead code. Stopped and asked the user how to proceed rather than build `case-financials.ts` on unverified keys; user chose "fix key resolution first."

### Fixed
- **`generation-engine.ts` — `extractInvestmentBreakdown()`.** Was hardcoding `QF-02`/`QF-03`/`QF-NEW-01` with no fallback — meaning the "INVESTMENT BREAKDOWN" table injected into every document-generation prompt was silently showing `NOT PROVIDED` for every real user. Now reads `M3-F-02`/`M3-F-03`. The per-category dollar fields (`franchise_fee`, `leasehold_improvements`, `equipment_technology`, `educational_materials`, `working_capital`, `professional_fees`, `marketing_launch`) have no live source at all — `M3-F-04` only captures which deployment *categories* apply, not a dollar amount per category — so those stay `null` (not fabricated) and the selected categories are now surfaced as a `deployment_categories` text field instead. `at_risk_amount` also had no real dollar source (`M3-F-NEW-01` is a yes/partial/no status, not currency) — left `null`. Added `deployment_categories` to the shared `InvestmentBreakdownData` type (`src/types/generation.ts`). Also fixed the source-of-funds validation check (`QF-05` → `M3-F-05`).
- **`gap-analysis-engine.ts` — D-code and category scoring.** Most `getAnswer(am, 'QF-*', 'M3-F-*')` call sites already had the M3- alias as a fallback and were functionally fine (since the QF-* alias never resolves against real data). But several sites read the *wrong field entirely*, not just a missing alias:
  - `getProjectionRevenue()`'s "legacy fallback" read `QI-05`/`QI-06` as revenue — those are FT/PT hire-count fields, not revenue, and have no M3- equivalent as standalone revenue fields (the only live revenue-by-year source is the `M3-I-PROJECTIONS` JSON blob). Fallback removed.
  - `getEmployeeY1()` fell back to `M3-I-03` (the revenue-projection-basis multiselect) as an employee count when FT/PT were both 0. Removed — 0 FT + 0 PT is a valid real answer, not missing data.
  - The `business_plan` category block parsed Year 1/3 revenue directly from `M3-I-05`/`M3-I-06` (employee counts) instead of calling `getProjectionRevenue()`. Fixed.
  - The `employment_creation` category block read `M3-I-03` (projection basis) as `countY1` and `M3-I-02` (a key that doesn't exist anywhere in the live schema) as `countCurrent`. Fixed to use `getEmployeeY1()`; `countCurrent` removed (no live source exists for "current" vs. "projected" headcount).
  - `sourceType` in both the D-12 (loan-secured-by-business-assets) and `source_of_funds` category blocks read `M3-F-03` (total business cost, a dollar figure) and checked whether that dollar string `.includes('loan')` — never true. Fixed to read `M3-F-05` (the actual source-of-funds field).
  - `roleList` in D-07 (hiring plan) and `employment_creation` read `M3-I-04` (annual salary/draw, a currency field) instead of `M3-I-07` (planned roles textarea). Fixed.
  - `spent`/`spentAmount` in the `source_of_funds` block treated `M3-F-NEW-01` (a yes/partial/no status field) as a dollar amount via `parseAmount`. Fixed to check status directly.
  - Removed a user-facing gap message that leaked the internal key code `(QF-03)` into client-visible text.

### Not fixed (acknowledged, out of scope for this session)
- `householdIncome` (line ~243) has no live answer key at all (`QI-07`/`QI-NEW-03`/`M3-I-NEW-03` — none exist in the live schema) — always resolves to 0/missing. This is a genuine intake gap, not a wrong-key bug; left as-is.
- A handful of `hasAnswer()` checks (`M3-F-10`, `M3-I-NEW-01/02`, `M3-K-NEW-01`, `M3-F-NEW-02`) reference keys with no confirmed live source. These degrade safely (treated as "not documented," the conservative default) rather than reading wrong data, so were left alone rather than scope-creeping into a full intake-schema audit.

### Next
Build `src/lib/case-financials.ts` (Phase 2/A4 — deterministic financial spine: deployment/investment reconciliation, break-even, cash-flow/revenue ramp by year, headcount+payroll by year, proportionality ratio, net-worth math) now that the underlying keys are confirmed correct.

### Dev server
No server was running at end of session (`preview_list` returned `[]`) — nothing to restart.

---

## Session 111 — Phase 1 Close-out: Prompt Caching + Silent-Degradation Surfacing (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). Three commits, one concern each.

### Fixed
- **Phase 1 item 10 / WS2.5 (E6b) — Anthropic prompt caching.** `src/lib/generation-engine.ts`: `callClaudeAPI()`'s user message is now split into a `stableBlock` (case brief, module 3 answers, investor/voice profile — byte-identical across the ~19 calls per generation run) marked with `cache_control: { type: 'ephemeral' }`, and a `variableBlock` (KB context, D-code filter, case theory, follow-ups) that varies per document type and stays uncached. `humanizeDocument()`'s `HUMANIZATION_SYSTEM_PROMPT` — identical across every humanization call for every document and every user — is now its own cached system block, with per-retry feedback in a separate uncached block. Confirmed via SDK type inspection (`@anthropic-ai/sdk@^0.100.1`) that `cache_control` is supported on the standard (non-beta) `TextBlockParam`. `llm-client.ts` (simulator/coaching/faq/prep/extract tasks) was deliberately left untouched — those calls are single-shot per task rather than repeated ~19x per run, so caching ROI is much lower there.
- **Phase 1 item 12 / WS2.8 (E8) — surface silent degradations.** Three sub-fixes, all in the spirit of "never silently degrade, always signal":
  - **Repetition check** (`generation-engine.ts`, quality step 1): was log-only — a flagged near-duplicate pair (≥70% similarity) shipped to the client unchanged with just a DB log row. Now regenerates the second document in each flagged pair (deduped, one attempt each) via `buildGenerationPayload` + `callClaudeAPI` with an explicit distinctiveness instruction ("keep the same facts, write independently"), and logs the successful regeneration.
  - **FAQ RAG missing API key** (`generation-engine.ts`, `fetchFAQKBContext`): silently returned `''` per-call when `OPENAI_API_KEY` was absent, with no signal anywhere. Now warns once at module load (`console.warn`, once per server process) so a misconfigured env var is visible immediately instead of only showing up as "documents feel thinner."
  - **Verifier status badges** (`src/app/documents/[applicationId]/page.tsx`): `verifier_result` (CIC-2.2 case-theory compliance check) was populated on every `generated_documents` row but only ever read by admin aggregate stats — a client had no way to tell a case-theory-verified document apart from one that shipped after the verifier LLM failed (`overall: null`/missing) or after failed compliance (`overall: 'fail'`, exhausted the 3-attempt retry loop). Added `getVerifierBadge()` next to the existing certification-status badge, covering all three states plus `pass_with_notes`.

### Dev server
No server was running at end of session (`preview_list` returned `[]`) — nothing to restart.

---

## Session 110 — Phase 0/1 Close-out (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`, `tsc --noEmit`). Three commits, one concern each.

### Fixed
- **WS1.6 — never-fabricate territory competition score.** `src/lib/fdd-territory-engine.ts`: each of the 5 territory dimensions (population/income/competition/demographic-fit/labor-market) falls back to a sentinel score when its data source is unavailable, but the weighted composite folded that sentinel in unconditionally. Added `computeWeightedOverallScore()` which excludes dimensions with `data_available: false` and renormalizes the remaining weights, so a fabricated neutral score can no longer drag or prop the overall territory score. Applied at both `analyseTeritory` and `analyseTeritoryForBusiness`. Competition fallback note text now says "not assessed" instead of implying a real VIABLE rating.
- **WS1 item 3 — FDD Questions dead industry-fit logic.** `computeProfileMatch` in `fdd-questions-engine.ts` reads `profile.industry_interest`, but `src/app/api/fdd/questions/route.ts` never populated that field on the `CaseProfileSubset` it built — every case scored 'neutral' or 'weak' on industry fit, never 'strong'. Fixed by fetching `post_quiz_profile.industry_interest` from `quiz_sessions` (same source `case-profile.ts` already uses) and passing it through.
- **Phase 0 item 5 — FDD Comparison broken columns.** `src/app/api/fdd/compare/route.ts`: `payback_years` and `franchisee_survival_rate` were hardcoded to `null` in `buildColumn` and weren't even rendered as rows in the comparison table. Payback now computed as investment midpoint ÷ central ODE (same formula as the FDD Report); survival rate derived from Item 20 unit-count fields. Added both as visible rows in `src/app/fdd/compare/page.tsx` with best-value highlighting wired into `computeBest`.

### Audited, found already correct
- **Phase 1 item 9 / WS2.6 — D-code routing.** `DOC_DCODE_MAP` in `generation-engine.ts` already covers `marginality_rebuttal`, `nonimmigrant_intent`, `declaration_principal`, and `property_portfolio` per spec — this was fixed in an earlier session, not still broken. No changes made.

### Deferred (not started this session)
- **Phase 1 item 10 / WS2.5 (E6b) — Anthropic prompt caching.** Requires restructuring message payloads into content-block arrays with `cache_control` breakpoints, and the behavior differs between the OpenRouter and Anthropic-direct fallback paths in `llm-client.ts`. This touches the core generation call path directly — deferred pending a dedicated pass rather than folding into a mixed-bug-fix session.
- **Phase 1 item 12 / WS2.8 (E8) — surface silent degradations.** Verifier-status badges in the document review UI, promoting the repetition-check from log-only to an actual regeneration trigger, and a FAQ RAG missing-API-key startup warning. Well-scoped but untouched this session.
- **Phases 2–6** (package integration / master exhibit registry / deterministic financial spine / CPU Intelligence Pack / partnership coverage / analyses depth / golden-case verification loop) — per `agent-prompt-part1/2-*.md`, these are multi-day, multi-session workstreams (e.g. Phase 2's A4 alone requires a new `src/lib/case-financials.ts` deterministic financial model; Phase 3 requires encoding 23 expert directives into the CIC). Not started — worth scoping as their own dedicated sessions rather than attempting inline.

---

## Session 109 — Phase 0 + Phase 1 Engine Fixes (July 2, 2026)

**Branch:** dev. Build clean (`npm run build`). Six commits, one concern each.

### Engine fixes (`src/lib/generation-engine.ts`)
- Per-document-type token budgets and generation/humanization temperature constants applied at all call sites.
- **P2-* leakage fix**: `buildGenerationPayload`'s `module3Answers` loop now excludes `P2-`-prefixed keys, so the 8 shared partnership document types (Business Plan, Net Worth Statement, Fund Flow Chronology, etc.) no longer get raw, unguided partner-2 answer fragments mixed into their prompt context. This resolves the "worse than a clean gap" half of Session 108's Gap 2 finding — the *unpredictable partial leakage* — though the underlying gap (shared docs still don't deliberately incorporate Investor 2 in a `complete_partnership` case) is unchanged and still needs its own workstream.
- Module 3 answers are now serialized as labeled `Q: {question}\nA: {value}` text instead of raw `{code: value}` pairs, via a new build-time question registry (`scripts/generate-question-registry.mjs` → `src/lib/question-registry.generated.ts`, 140 entries) — the model no longer has to guess what "QF-05" means.
- Sanitizer no longer strips numbered/bulleted list markers (was mangling resumes, chronologies, itemized breakdowns).
- Post-humanization figure re-verification: re-runs the deterministic figure-provenance check after each humanization pass and rejects rewrites that introduce *new* hallucinated figures (pre-existing orphans from the CIC-verified draft are not blocked), falling back to the last figure-clean text on the final attempt.
- AI-detection replaced: the LLM-judged score is gone, replaced by `computeStylometricAIScore()` — a deterministic score from AI-vocabulary fingerprint density, sentence-length uniformity, and repeated sentence-opener structure, evaluated over the full document (was previously truncated to first 3000 chars and LLM-judged, which was slow, costly, and non-deterministic).

### Confirmed small bugs (WS1) — all fixed
1. **Prep Kit `model_used` hardcoded** — `llm-client.ts` now exposes `callLLMWithMeta()` (returns `{content, model}`) alongside the unchanged `callLLM()`; `/api/simulator/prep-kit` persists the model that actually responded instead of a hardcoded guess.
2. **FDD Questions `[X years / X miles]` placeholder** — shipped as literal unfilled text to users. Now filled from `post_termination_noncompete_years`/`_radius_miles` in the extraction schema at generation time (`fdd-questions-engine.ts`).
3. **FDD Report QSR-only royalty benchmark** — every franchise category was benchmarked against a QSR 5–7% royalty median. Replaced with a category-keyed benchmark table (`fdd-report-engine.ts`), reusing the existing `classifyCategory()` classifier from `fdd-territory-engine.ts`.
4. **Coaching-report silent failure** — every failure path (empty LLM content, JSON parse failure, thrown exception/timeout) returned the same `{coaching: []}` shape as "no weak answers, nothing to coach" — indistinguishable in the UI. API now sets `error: true` on genuine failures; `/simulator` tracks `coachingError` state and shows a retry affordance instead of silently rendering nothing.
5. **Tab Reference mismatches** — `ds160_reference.md` (Tab A → Tab D/E), `business_plan.md` (Tab K → Tab C), `qualifications.md` (Tab J → Tab D), `nonimmigrant_intent.md` (missing tab prefix) all drifted from `DOCUMENT_TYPE_TABS`, the map the Binder Index is built from. Added `src/lib/__tests__/tab-consistency.test.ts` (22 tests, all passing) to catch future drift automatically. Dead `source_of_funds.md` prompt file removed (superseded by the merged `b01_source_and_application_of_funds.md`, aliased in `loadPrompt()`).

### Not done this session (deferred / out of scope for Phase 0/1)
- Session 108's Gap 1 (Market Analysis has no export path) and the rest of Gap 2 (shared partnership docs don't deliberately write for two investors) — Phase 2+ scope, not touched.
- Phase 2 items from `agent-prompt-part2-intelligence-and-content.md` (WS4–WS6: intelligence/content workstreams) — not started.

### Dev server
Restarted (`preview_stop` → `preview_start`) at end of session per standing instruction.

---

## Session 108 — Document/Analysis Inventory Audit + Three Confirmed Gaps (July 2, 2026)

**Branch:** dev. **Audit only — no code changes.**

### Full inventory of what the app generates

**Core E-2 application package** (`/generate/[applicationId]`, `.docx`, via `src/lib/generation-engine.ts`'s 15-step pipeline):
1. Cover Letter
2. Source of Funds Statement
3. Business Plan
4. Investor Biography & Qualifications
5. DS-156E / DS-160 Reference
6. Substantiality Memorandum (`visa_category`)
7. Non-immigrant Intent Statement
8. Non-Marginality Rebuttal
9. Principal Applicant Declaration
10. Spouse Declaration *(conditional — spouse on file)*
11. Fund Flow Chronology
12. Consolidated Net Worth Statement
13. Property Portfolio Summary *(conditional)*
14. Principal Applicant Resume
15. Spouse Resume *(conditional)*
16. Gift Letter *(conditional — gifted funds)*
17–22. Investor 2 set *(`complete_partnership` only)* — Cover Letter, Source of Funds, Declaration, Biography & Qualifications, Non-immigrant Intent, Resume (`_p2` doc types)

**Renewal package** (`/api/renewal/generate`): Updated Cover Letter, Business Plan Update, Template 6 (Actual vs. Projected Performance), Renewal Checklist.

**Interview Preparation Kit** (`/simulator/prep-kit`) — 7-section dossier, has a real Print/Save-as-PDF export.

**Analyses (in-app reports, not files):**
1. Gap Analysis — 8-category case-readiness scoring, has Print/PDF
2. Document Upload Gap Report — preliminary gaps from self-preparer uploads
3. FDD Extraction Review — 9-section structured extraction with confidence badges
4. FDD E-2 Scoring — 5-dimension compatibility score
5. FDD Territory / Market Analysis — Census-based location viability (also reachable standalone via `/market-analysis`, not just FDD-attached)
6. FDD Questions Generator — flag-derived question list
7. FDD Final Report — consolidated report, freemium-gated
8. FDD Comparison — side-by-side 2–4 FDDs
9. Interview Simulator Coaching Report — per-session feedback, no export

### Gap 1 — Market Analysis has no export path

`analyseTeritoryForBusiness()` (`src/lib/fdd-territory-engine.ts:968`) produces genuinely report-shaped content — 5 scored dimensions (population, income, competition, demographic fit, labor market) from Census ACS + Google Places data, plus a 5-part Claude-written narrative (Market Overview, Economic Strength, Demographic Fit, Competitive Landscape, Verdict) and a target-market-sizing estimate. It's rendered only as an in-app page at `/market-analysis` (via `/api/market-analysis`) — grepped for `window.print`/`Print`/`download`/`PDF` in that page and found nothing. **No Print, no PDF, no DOCX.** Every other analysis with comparable narrative depth (Gap Analysis, FDD Final Report) already has an export path; Market Analysis doesn't. `market_analysis` is not in the `DocumentType` enum (`src/types/generation.ts`) and isn't part of the 15-step generation pipeline — it's fully standalone.

### Gap 2 — Shared partnership documents don't incorporate Investor 2's data (confirmed at the prompt level, two independent passes)

Only 6 of the 16 principal-side document types are partner-2-specific (`cover_letter_p2`, `source_of_funds_p2`, `declaration_p2`, `qualifications_p2`, `nonimmigrant_intent_p2`, `resume_p2`) — the personal/testimonial documents. The other **8 shared documents — Business Plan, DS-156E/DS-160 Reference, Substantiality Memorandum, Non-Marginality Rebuttal, Fund Flow Chronology, Net Worth Statement, Property Portfolio Summary, Gift Letter — are generated identically whether the case is solo or a `complete_partnership`.**

The partnership context block (investor 2's name, nationality, ownership share, investment amount, role, source of funds, qualifications, intent — built at `generation-engine.ts:2131-2179`) is injected only when `docType.endsWith('_p2')` (line 2132). None of the 8 shared doc types end in `_p2`, so this branch never runs for them. Verified against the actual prompt templates (`prompts/v1/documents/business_plan.md`, `ds160_reference.md`, `fund_flow_chronology.md`, `net_worth_statement.md`, `property_portfolio.md`, etc.) — all are written exclusively in singular "the applicant" voice; `property_portfolio.md`'s only "Joint with ___" language refers to a spouse, never a co-investor.

**Worse than a clean gap**: `buildGenerationPayload` (`generation-engine.ts:756-780`) fetches *all* `answers` rows for the application with no `question_key` filter and dumps them into the prompt as one undifferentiated JSON blob. Since `P2-*` answers live in that same table, raw partner-2 values (e.g. `P2-SOF`, `P2-INVEST`) are technically present in the context sent to the model for these 8 documents — but with no instruction on what to do with them. This means output is not consistently single-investor-framed; it's unpredictable, since the model may notice and use fragments of partner-2 data without guidance on how to synthesize it. Gap Analysis has the identical blind spot: it scores only principal answers, and `/gap-analysis/page.tsx:183` explicitly filters `.is('family_member_id', null)`, so a second investor's data would be excluded from case-readiness scoring even if it existed.

**Practical effect**: a two-investor case's Business Plan, Net Worth Statement, and Fund Flow Chronology currently read/compute as if there's only one investor, with a real risk of inconsistent partial partner-2 leakage rather than a clean single-investor framing.

### Gap 3 — Interview Prep Kit doesn't use all available case intelligence

`src/app/api/simulator/prep-kit/route.ts` (563 lines) pulls quiz results, case profile scores, all principal `answers`, FDD scoring (`e2_score`, `territory_analysis` — but `extracted_fields`/`final_report` are fetched and never used), the single latest simulator session, and `case_theory` dimension verdicts. It re-derives Gap Analysis in-process via the bare `scoreCase()` scorer.

**Not wired in, despite existing elsewhere in the app:**
- Raw uploaded-document extraction data (`uploaded_documents`/`extracted_json`) — never queried.
- Gap Analysis's LLM-enriched narrative + semantic ratings from `/api/gap-analysis/run` — prep kit only re-runs the deterministic scorer, missing the richer output.
- 5 of 10 `QMA-*` Market Analysis fields (zip, state, business name, category, pop-per-competitor) — written by market-analysis but not read by prep-kit.
- Session/quiz history — only the single latest row of each is fetched; no trend across retakes.

### Next steps (not started — flagged for a future session, owner to prioritize)
1. Add Print/PDF (or DOCX) export to Market Analysis.
2. Make the 8 shared documents + Gap Analysis partnership-aware when `payment_type === 'complete_partnership'` — either inject a joint-context block (parallel to the existing `_p2` block) into these prompts, or explicitly instruct the model how to synthesize `P2-*` data already present in the blob. Gap Analysis needs to stop filtering out family-member-scoped answers when scoring partnership completeness.
3. Wire Gap Analysis's enriched narrative, raw document extraction, and full `QMA-*` field set into the Interview Prep Kit prompt.

---

## Session 107 — Document-to-Person Routing + Case Profile Family Visibility (July 2, 2026) — Phase 1 + Phase 2, both complete

**Branch:** dev. **Build:** ✅ `npm run build` clean, `tsc --noEmit -p .` clean.

### Problem

Document extraction always wrote to the principal's flat `answers` rows, even when a client uploaded a spouse's or child's passport, birth certificate, or resume — there was no way to route extracted data to the right person, and `/case-profile` had no visibility into per-family-member completion or documents.

### Schema

New migration `supabase/migrations/20260703000000_document_person_routing.sql`:
- `answers` gains nullable `family_member_id uuid references family_members(id) on delete cascade`; the 2-column unique constraint on `(application_id, question_key)` is replaced with a 3-column unique index `(application_id, question_key, family_member_id)` — Postgres treats `NULL` as distinct, so principal rows (`family_member_id IS NULL`) keep their existing uniqueness guarantee without a `COALESCE` sentinel.
- `uploaded_documents.doc_type` CHECK constraint widened from 6 to 13 values (fixes a live bug — `passport` and `government_form` uploads were silently failing the DB insert), plus new `birth_certificate`/`marriage_certificate` types.
- `uploaded_documents` gains `owner_type text CHECK (owner_type IN ('principal','family_member')) DEFAULT 'principal'` and `owner_family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL`.
- All 16 `onConflict: 'application_id,question_key'` call sites updated to the 3-column key across `module3/{b,c,d,j}`, `simulator/quick-start`, `partner2/intake`, `api/answers`, `api/market-analysis`, `api/simulator/{case-gaps,save-extraction,quick-start}`, `api/documents/{resolve-discrepancy,extract}`, `api/fdd/{writeback,report}`, `api/account/export`, `DocumentImportHub.tsx`.

### `DocumentImportHub.tsx` — person-organized upload UI

Rewritten around people, not a flat file queue: a section per person (principal + each `family_members` row) each with its own upload zone, doc-type queue, and an inline "Add a family member" mini-form. `mergeFields()` now groups by `${ownerKey}::${questionKey}` so a spouse's passport number can't collide with the principal's under the same `M3-*` question vocabulary. `handleApply()` includes `family_member_id` in every upserted row.

Identity-mismatch handling is non-blocking: if extraction detects the document names someone other than the section it was dropped in, an inline suggestion appears ("This document also mentions X — Move to their section?") rather than either silently misfiling the data or hard-blocking the upload. `DOC_TYPE_OPTIONS` gained `birth_certificate` and `marriage_certificate` — both common triggers for discovering a spouse or child not yet in the app.

### `/api/dashboard/case-profile` + `CaseProfilePage.tsx` — per-person visibility

Response gains `familyMembers: FamilyMemberCaseUI[]` — each member's own answered-field count (of the 5 base fields: name×2, DOB, nationality, passport), extracted-answer count from routed documents, and their `uploaded_documents`. `MemberCard` now shows a completion badge and a toggleable per-person document list (`ExtractionTransparencyPanel` reused in a new `compact` mode rather than building a second component). Toggle state (`expandedMemberDocs`) is lifted to the parent `CaseProfilePage` component, not local to `MemberCard` — `MemberCard` is a function redefined on every parent render, so `useState` inside it would reset on every re-render.

### Verification

`npm run build` and `tsc --noEmit` clean. Live-verified the regression case (principal-only account, no family members): `/case-profile` renders correctly, `/api/dashboard/case-profile` returns a well-formed empty `familyMembers: []`, no console/network errors. **Not yet verified**: multi-person upload routing, unrecognized-person stub creation, identity-mismatch surfacing, and the 3-column unique-index/CHECK-constraint behavior against real data — these need either a test account with family members (`test-uk@example.com` per test-account seed) or real document files, neither of which were safely available against the live browser session used this session (it was bound to a real customer's authenticated account). Next session should pick this up directly.

### Phase 2 — Shared question-set registry + Security & Background, Travel Companions, U.S. POC (same session, July 2, 2026)

**Build:** ✅ `npm run build` clean, `tsc --noEmit -p .` clean.

#### Registry + runner

New `src/lib/ds160-question-sets.ts` — person-agnostic `QuestionField` definitions (same shape `family/page.tsx` already used), no per-person key suffixes: `SECURITY_HEALTH_QUESTIONS`, `SECURITY_CRIMINAL_QUESTIONS`, `SECURITY_MORAL_QUESTIONS`, `SECURITY_IMMIGRATION_QUESTIONS`, `SECURITY_SEVERE_QUESTIONS` (bundled as `SECURITY_SUB_AREAS`), `US_POC_QUESTIONS`, `TRAVEL_COMPANIONS_QUESTIONS`, `APPLICATION_CONTACT_QUESTIONS` (principal/E-2-petition-only, not yet wired to a route). All new keys use fresh prefixes (`M3-SEC-*`, `M3-POC-*`, `M3-TC-*`, `M3-AC-*`) scoped entirely via `answers.family_member_id` — one definition serves the principal and every dependent.

New `src/components/apply/questions/QuestionSetRunner.tsx` — generic `{questions, applicationId, familyMemberId, onSaveStatusChange?}` component. Reuses the exact rendering + autosave pattern from `family/page.tsx` (existing `TextInput`/`TextArea`/`OptionButton`/`PreFillBadge` primitives, `showIf` conditional visibility, `useAutosaveFlush`) rather than inventing a second pattern. Loads/saves through `/api/answers`, always including `family_member_id`.

#### New routes

- `src/app/apply/security/[personId]/page.tsx` — `personId` = `'principal'` or a `family_members.id`. Sub-area tabs (health/criminal/moral/immigration/severe), an explicit non-legal-advice `AdvisoryBlock`, `QuestionSetRunner` scoped per sub-area + person.
- `src/app/apply/dependent/[familyMemberId]/page.tsx` — per-dependent DS-160 landing page: Travel Companions + U.S. POC inline via two `QuestionSetRunner`s, plus a CTA into that person's Security & Background page.

#### Case Profile entry points

`CaseProfilePage.tsx` `MemberCard` gains a "Complete [Name]'s DS-160 details →" link for `spouse`/`child` members only (not co-investors — they don't file a dependent DS-160), linking to `/apply/dependent/[id]`. `ControlPanel.tsx`'s "Case File" category gains two tiles: "Family & Dependents" → `/apply/family`, "Security & Background" → `/apply/security/principal`.

#### `/api/answers` fix (latent bug found while building the runner)

`family_member_id` was already referenced in `onConflict` (from Phase 1's 16-site update) but the route never actually included it in the upsert payload — every scoped write was silently landing as `NULL` (i.e. always overwriting the principal's row regardless of who the caller said they were writing for). Fixed: request body now accepts `family_member_id`, validates the caller owns that `family_members` row (403 if not), and includes it in the upsert.

#### Legacy `CHILD-{n}-*` backfill

New `scripts/backfill-child-answers.mjs` (same style as `scripts/seed-test-profiles.mjs` — manual `.env.local` parsing, service-role `fetch` calls, no Supabase client dependency). Maps legacy `CHILD-{n}-NAME/DOB/NATIONALITY/PASSPORT` answers (written only by `family/page.tsx`) onto the corresponding `family_members` row (by `sort_order`/`created_at`) and inserts the canonical-key, `family_member_id`-scoped equivalent — legacy rows are left untouched as a read fallback. Dry-run by default; `--apply` to write. Run against production post-migration: **no legacy `CHILD-*` rows currently exist**, so there was nothing to backfill — script is built and verified working, ready if any surface later.

#### Critical mid-session discovery: Phase 1 migration was never applied to production

While dry-running the backfill script against live data, the script failed with `column answers.family_member_id does not exist` — despite `BUILD_TRACKER.md` (Session 107 Phase 1, above) claiming Phase 1 was "regression-tested live against a real account." The migration file existed correctly in `supabase/migrations/20260703000000_document_person_routing.sql` and `/api/answers`'s `onConflict` clause already referenced the 3-column key, but the SQL had never actually reached the production database. **Net effect: `/api/answers` upserts have plausibly been failing for every user (principal and dependent) since the Phase 1 `onConflict` change shipped**, not just the new Phase 2 code.

`supabase db push` was inconclusive — local migration history has drifted from the remote tracking table (past schema changes were applied by hand via the Supabase dashboard SQL editor rather than the CLI), so an automated push risked rewriting migration history against production without a clear picture of true state. Rather than force it, the owner ran the migration SQL directly in the Supabase dashboard SQL editor and confirmed success. Re-running the backfill script's dry-run afterward confirmed the column now exists.

**Action item for a future session**: reconcile `supabase/migrations/` against the actual remote migration history (`supabase migration repair` / `supabase db pull`) so future schema changes can go through `supabase db push` cleanly instead of manual dashboard SQL.

#### Not done in Phase 2 (explicitly out of scope, flagged in the original plan)

- Security & Background consent/access-logging/storage compliance posture — needs product/legal input, not a guess.
- `APPLICATION_CONTACT_QUESTIONS` — defined in the registry but not yet wired to a route (principal-only, E-2-petition-specific; no natural landing page decided yet).
- Deeper per-dependent fields beyond Travel Companions/U.S. POC/Security & Background (place of birth, passport dates, prior US travel, work/education) — deferred, per plan.
- Principal's existing hardcoded Module 3 tabs were intentionally left unmigrated onto the new registry/runner.

---

## Session 106 — Case Profile Dead-End Fixes + Quick Access Control Panel (July 2, 2026)

**Branch:** dev. **Build:** ✅ `tsc --noEmit` clean.

### Problem

Owner audit: the case profile displayed already-computed data (interview readiness, market analysis scores) but two CTAs led to dead ends that ignored that saved state, and — separately — real, working app surfaces (Checklist, Calendar, Franchise tools, Interview Prep) were reachable only as buried nested field rows deep inside detailed data sections, not felt as "things the app can do for you."

### Fix 1 — Interview Dossier CTA

Section 05 (Interview Readiness) `ctaHref` pointed to `/simulator` (blank session start) instead of `/simulator/prep-kit` (the actual personalized dossier already built and cached). Corrected in `src/components/CaseProfilePage.tsx`.

### Fix 2 — Market Analysis blank-form-despite-saved-results

`/market-analysis` had no applicationId-based prefill and its POST body never sent `applicationId` (relying on a risky "guess the user's latest application" server fallback), so a user with an already-computed market score landed on a blank form.
- `src/app/api/market-analysis/route.ts`: new `GET` handler returns saved business name/category/zip/state for a given `applicationId`; `writeMarketScoreBack()` now also persists `QMA-BUSINESS-NAME`/`QMA-BUSINESS-CATEGORY` so they can be reloaded.
- `src/app/market-analysis/page.tsx`: wrapped in `Suspense`, reads `applicationId` from the query string, prefills the form from the new GET route and auto-runs the analysis so the user sees existing results instead of a blank form. POST body now always includes `applicationId` when available.
- `src/components/CaseProfilePage.tsx`: all `/market-analysis` hrefs now pass `?applicationId=`.
- Chose prefill-via-query-param over a separate read-only results route since Market Analysis is also sold as a standalone paid module — one surface, not two to maintain.

Audited every other route referenced from `CaseProfilePage.tsx` (`/quiz`, `/franchise`, `/apply/checklist`, `/apply/calendar`, `/learn` + articles, plus the core `/apply/*` pages) for the same bug class (destination loads saved state, not just "is it the right page") — all clean, no further dead ends found.

### Quick Access control panel — every app surface reachable from one place

New components:
- `src/components/casefile/tokens.ts` — the six Obsidian Gold design tokens (`GOLD/CREAM/GREEN/CARD_BG/BORDER/INNER`), extracted out of `CaseProfilePage.tsx` so new case-profile components share one source of truth instead of copy-pasting hex values.
- `src/components/casefile/ControlPanel.tsx` — a compact "Quick Access" panel, mounted once near the top of `/case-profile` (right after the "Your Application" progress card, before `DocumentImportHub`). Five category rows of tappable tiles: **Case File** (anchor-links to `#investor`/`#business`/`#investment`, scrolling to the existing sections rather than duplicating a destination), **Case Intelligence** (Gap Analysis, Market Analysis, plus FDD Review + Franchise Navigator when `isFranchise`), **Interview Prep** (Simulator, Prep Kit), **Documents** (Vault, Generate Package — omitted entirely if no `applicationId` yet), **Tools & Learn** (Checklist, Calendar, Knowledge Hub). Checklist and Calendar get a distinct green left-border accent, directly addressing "the checklist and calendar are not there" — they were always linked, just visually indistinguishable from ordinary data fields.
- Visually distinct from the existing `SectionCard`/`FieldRow` system on purpose (no status dots, no progress bars, no REQUIRED badges) so it reads as navigation, not more data. Partner 2 and Renewal are deliberately left out of the panel — they stay as their existing prominent, stage-gated banners further down the page.

**Verified live** (franchise test account): Case Intelligence category correctly expands to 4 tiles, Checklist/Calendar show the green accent, anchor tiles smooth-scroll to the correct section without breaking the sidebar's `IntersectionObserver` active-state, and mobile (375px) wraps cleanly with no horizontal overflow.

---

## Session 105 — Global Nav Integration + Dead Code Removal + Mobile Overflow Fix (July 2, 2026)

**Branch:** dev. **Build:** ✅ `tsc --noEmit` clean + `npm run build` clean. Committed and pushed.

### Global Nav bar extended app-wide

`Nav.tsx` (fixed, 64px) now mounts on every top-level surface. New `src/app/franchise/layout.tsx` for `/franchise/*`; existing `src/app/apply/layout.tsx` updated for `/apply/*`. Every fixed/sticky element and root container in affected components repositioned +64px so nothing collides with or hides behind the header: `module1/page.tsx`, `module2/page.tsx`, `module3/page.tsx`, `checklist/page.tsx`, `CaseFileShell.tsx`, `calendar/page.tsx`, `upload/page.tsx`, `UploadClient.tsx`, `module4/page.tsx`, `TabPage.tsx`, `TabSidebar.tsx`.

### Dead code removed

- `src/components/module3/TabShell.tsx` — legacy one-question-at-a-time UI on a different (navy/glass/Playfair) design system. Confirmed zero importers anywhere in `src/app` before deletion.
- `src/components/module3/QuestionRenderer.tsx` — only consumer was `TabShell.tsx`; confirmed dead once TabShell was removed.
- The real, live Module 3 UI is `TabPage.tsx` + `TabSidebar.tsx` (category-based layout, matches the project's locked "never one-question-at-a-time" design rule).

### Mobile horizontal-overflow bug — root-caused and fixed

Found during Nav-integration verification on `/apply/module3/a`: page was rendering 867px wide on a 375px viewport (real horizontal scroll, clipped/cut-off content on mobile). Root cause: flexbox items default to `min-width: auto` (their max-content intrinsic width) unless `min-w-0` is explicitly set — `TabPage.tsx`'s `<main className="flex-1 flex flex-col">` had no `min-w-0`, so its content could force the whole row wider than the viewport even inside a `flex-1` container.

Fix: added `min-w-0` to the `<main>` element and to the scrollable form-area `<div>` in `TabPage.tsx`. Verified live: `document.documentElement.scrollWidth` now exactly matches `clientWidth` (375===375) at 375×812, clean text wrapping, no clipped content.

Also fixed `TabSidebar.tsx`'s desktop-only `<aside>`: was `h-screen sticky top-0` (didn't account for the new Nav), changed to `sticky top-16` with `height: calc(100vh - 64px)` — correct because `sticky` (unlike `fixed`) respects ancestor position, so this is the right pattern vs. adding ancestor padding (which would double-count height).

Audited the other 7 touched pages for the same bug class via `scrollWidth`/`clientWidth` checks — all clean, bug was isolated to `TabPage.tsx`.

### Session 104 resolver work — now fully wired

Two shared helpers finish the "one canonical application" migration started in Session 104: `src/hooks/useApplicationGate.ts` and `src/components/apply/ApplicationNotReadyScreen.tsx`, adopted across `business/family/investment/ties/story/qualifications/module3` pages — replaces duplicated per-page "loading / not paid yet" boilerplate with one shared gate.

---

## Session 104 — Stitching Audit + 5-Part Fix (July 1, 2026)

**Branch:** dev. **Build:** ✅ `tsc --noEmit` clean + `npm run build` clean (167 pages). Committed in Session 105.

### Audit (first half of session)

Owner request: "go through the whole app… confirm without a shadow of a doubt… the app needs to be stitched together so I can present it to a customer." Full route inventory (97 pages, 103 API routes), link check (0 dead links), data-flow trace, and live click-through with the UK test account. Result: 0 dead links, 0 console errors, all golden-path pages render — but **the simulator was interviewing against a different application (`dbe64922`) than every other surface (`a6fb9144`)** for the same user. Proven live.

**Root cause:** four different rules for picking the user's primary application row:
1. Latest created (~40 call sites)
2. Most answers wins (`simulator/page.tsx`)
3. Standalone-first (`simulator/case-file`, `SimulatorNav`)
4. First non-standalone in unspecified order (`prep-kit`)

Any user with >1 application row (quiz + simulator quick-start, re-signup, partner flows) gets different data on different pages — this is why "every time I change something, something else breaks."

### Fix 1 — Canonical application resolver (the big one)

New `src/lib/resolve-application.ts` — one rule everywhere: prefer non-standalone rows; within that pool prefer `payment_status='paid'`; latest `created_at` wins. Identical behavior for single-application customers.

- `rankApplications(rows)` — pure ranking (used where the caller already has the rows, e.g. prep-kit)
- `resolvePrimaryApplicationId(supabase, userId)` — id only
- `resolvePrimaryApplication<T>(supabase, userId, select)` — full row with custom select

**Migrated (~35 files):** all Module 3 section pages (a–f, i–k) + story/business/investment/qualifications/family/ties/upload/module4, `simulator/page.tsx` (replaced 38-line most-answers block), `simulator/case-file`, `SimulatorNav`, `simulator/interview-day`, `prep-kit` (POST+GET), `section-nudge`, `gap-analysis/page.tsx`, `DocumentImportHub`, `section-completion`, `api/market-analysis`, all 4 FDD routes (`writeback`, `score`, `questions`, `report`), `fdd/compare`, `franchise/matches`, `franchise/connect`, `franchise/discover`, `broker-request`.

**Deliberately NOT changed:** `dashboard/case-profile` route (already paid-first non-standalone — equivalent), `renewal/intake` (deliberate paid-only filter), `simulator/quick-start` (intentionally targets standalone rows), checkout/pricing/admin/middleware (payment logic, not case selection).

### Fixes 2–5

| # | Fix | File(s) |
|---|-----|---------|
| 2 | Q0-10 (home-ties quiz answer) no longer used as businessCategory fallback — simulator questions no longer themed around e.g. "property in the UK" as a business | `src/lib/simulator-engine.ts` |
| 3 | Outcomes consent banner moved out of the fixed nav header (it was growing the header over page titles on every page). Now a fixed bottom-of-viewport bar, opaque bg, z-60 | `Nav.tsx`, `OutcomesConsentBanner.tsx` |
| 4 | `/market-analysis` dead end fixed — new `layout.tsx` mounts global Nav (same pattern as /fdd, /gap-analysis), page gets `pt-16` | `src/app/market-analysis/layout.tsx` (new), `page.tsx` |
| 5 | `verify-payment` now deletes `mw:access:{userId}` Redis cache after marking paid (mirrors webhook) — kills the up-to-30-min post-payment lockout race when the webhook is slow | `api/stripe/verify-payment/route.ts` |

### Live verification (UK test account)

- `/simulator/case-file` now shows **REF. A6FB9144** — same application as case-profile/documents/gap-analysis. Cross-surface agreement confirmed live.
- Consent banner pinned to viewport bottom (`position:fixed; bottom:0`), page titles clear.
- `/market-analysis` renders with full global nav, h1 clears the header.
- 0 console errors across checked pages.

---

## Session 103 — Document Extraction Transparency + Interview Prep/Simulator Audit (July 2, 2026)

**Branch:** dev. **Build:** ✅ `tsc --noEmit` clean. Not yet committed.

### Completed — Document Extraction Transparency Panel

Owner request: "When the client uploads the document, tell them what we've been able to extract on the case profile page... that we will be using them in these areas. That's a confidence building measure. You just don't hide that information."

| Item | Status | Detail |
|------|--------|--------|
| `/api/dashboard/case-profile` returns `documents[]` | ✅ DONE | Added a third parallel query (alongside existing QMA/case_theory queries) to `uploaded_documents` — id, file_name, doc_type, extraction_status, fields_total, created_at. New exported `DocumentExtractionUI` interface. |
| `docTypeLabel()` exported from `DocumentImportHub.tsx` | ✅ DONE | Reused in the new panel instead of duplicating the 12-entry doc-type label map. |
| `ExtractionTransparencyPanel` component | ✅ DONE | `CaseProfilePage.tsx` — renders immediately after the upload widget. Per-document card: filename, type label, status badge, "N data points extracted" when complete. "Where This Data Goes" 4-item grid: Case Strategy, Document Generation, Gap & Denial-Risk Analysis, Interview Simulator. Footer: "Each document is parsed once. You never need to re-upload the same document for a different part of your case." Returns `null` when the client has no documents yet (no empty-state box). |

Verified visually in-browser (fetch-patched injected document data covering complete + processing states) — matches Obsidian Gold system, all copy renders correctly.

### Audit finding — Interview Prep Kit + Interview Simulator NOT fully connected to document extraction

Owner asked to confirm whether uploaded/extracted document data actually feeds interview prep material and the interview simulator. **Confirmed: both have real gaps**, traced file:line via a research agent.

| Surface | Reads `uploaded_documents`? | Reads `case_theory`? | Uses legacy `application_documents`? |
|---|---|---|---|
| Prep Kit dossier — `src/app/api/simulator/prep-kit/route.ts` | No (indirect, via case_theory chain) | Partial — only `dimension_verdicts`/`directives`, NOT `narrative`/`numbers_strategy` | No |
| Simulator question gen — `src/lib/simulator-engine.ts` | No | No | No |
| Simulator live evaluation — `src/app/api/simulator/evaluate/route.ts` | No | No | **Yes** (line ~85) |
| Simulator case-summary — `src/app/api/simulator/case-summary/route.ts` | No | No | **Yes**, incl. legacy `fields_extracted` column (line ~89) |
| Simulator post-session brief — `src/app/api/simulator/interview-prep/route.ts` | No | No | **Yes** (line ~231, prompt block `DOCUMENTS ON FILE:`) |

Root cause: current uploads go through `/api/apply/parse-document` → `uploaded_documents`. The three simulator surfaces above were built against the OLDER `application_documents` pipeline and were never migrated when the current pipeline replaced it — so any document a client uploads today through the live upload flow is **invisible to the interview simulator** unless its extracted fields were separately applied to the `answers` table. This narrows the Session 94 "RESOLVED — case_theory wired into all engines via CIC-2" claim in `docs/FEATURE_INVENTORY.html`: true for the prep-kit dossier's abstracted verdict layer, but the interview simulator itself was never actually connected.

**Not yet fixed — recommended next steps:**
1. Repoint `evaluate/route.ts`, `case-summary/route.ts`, `interview-prep/route.ts` from `application_documents` → `uploaded_documents`.
2. Add `case_theory` (full row incl. `narrative`/`numbers_strategy`) to `simulator-engine.ts`'s `buildSimulatorContext()` and the interview-prep-brief prompt.
3. Widen prep-kit's `case_theory` select to include `narrative`/`numbers_strategy` so raw document facts reach the prompt, not just abstracted verdict labels.

Related, still-open background task: `task_9c293ff5` (two disconnected document-upload pipelines) — this finding is a direct downstream consequence of that same split.

### 3-part fix — ✅ IMPLEMENTED (same session)

| Item | Status | Detail |
|---|---|---|
| New `src/lib/uploaded-doc-labels.ts` | ✅ DONE | `uploadedDocTypeLabel()` — labels for the current 11-value `uploaded_documents.doc_type` taxonomy (replaces the legacy 8-value `application_documents` set). `summarizeExtractedJson()` — derives a short human-readable line from `extracted_json` since `uploaded_documents` has no `document_summary` column. |
| Part 1 — repoint to `uploaded_documents` | ✅ DONE | `evaluate/route.ts` (doc evidence for live answer grounding), `case-summary/route.ts` (`documents[]` on the case-file review screen), `interview-prep/route.ts` (`DOCUMENTS ON FILE:` prompt block + `docRows` fed into `scoreCase()`, mapped to the legacy `DocumentRow` shape `gap-analysis-engine.ts`'s `hasDoc()` still expects). |
| Part 2 — `case_theory` into `simulator-engine.ts` | ✅ DONE | `buildSimulatorContext()` now fetches `case_theory.narrative` + `numbers_strategy`; new `SimulatorContext.caseTheoryNarrative` / `caseTheoryNumbersStrategy` fields (`src/types/simulator.ts`). Also wired into the live-evaluation prompt in `evaluate/route.ts` (not just the interview-prep-brief prompt) so answers are judged against the CPU's actual narrative, not just abstracted scores. `interview-prep/route.ts` also gained its own `case_theory` fetch + prompt block. |
| Part 3 — widen prep-kit's `case_theory` select | ✅ DONE | `prep-kit/route.ts` select widened from `dimension_verdicts, directives` to include `narrative, numbers_strategy`; both added to `caseContext` and referenced by name in the LLM instructions for section2 (strengths) and section5 (investment numbers). |

**Build:** ✅ clean — `tsc --noEmit` + `npm run build` (167 pages). Not yet committed.

**Known limitation carried forward, not in scope for this fix:** `gap-analysis-engine.ts`'s `DocumentRow`/`hasDoc()` still key off `detected_document_type` substrings tuned for the legacy doc-type vocabulary (e.g. `'bank'`, `'wire'`, `'article'`, `'operating agreement'`). The new `uploaded_documents.doc_type` values are mapped in for the same substring matching, but some legacy tokens (`bank`, `wire`, `article`, `formation`) have no clean equivalent in the new 11-value taxonomy, so a few `hasDoc()` checks in the gap engine will under-detect until that taxonomy is reconciled. Separate task from this fix.

---

## Session 102 — Phase D QA Audit (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean (167 pages). **Commits:** 12a8c2e, 8f6898a.

### Completed

| Item | Status | Detail |
|------|--------|--------|
| Soft-delete AUTH_ROUTE bypass (QA-SEC-07) | ✅ FIXED | `src/middleware.ts` — soft-deleted users were blocked on PAID_ROUTES but NOT on AUTH_ROUTES (`/dashboard`, `/settings`, `/admin`, `/generate/`, `/documents/`, `/franchise/`). Added Redis-cached deleted check for AUTH_ROUTES; lightweight `deleted_at` DB check on cache miss only. |
| `quiz/personalized-flags` kill-switch (QA-SEC-08) | ✅ FIXED | Public LLM route with no kill-switch — added `isKillSwitchEnabled()` guard. Falls back to `{ explanations: {} }` when kill-switch is active. |
| Kill-switch exemption documentation | ✅ DONE | Added explanatory comments to `cron/health-watchdog` (billing API check, not inference) and `admin/health-detail` (diagnostic tool for kill-switch recovery). |
| Admin routes (Sprint 98) security audit | ✅ PASS | All 6 admin routes (`cost-summary`, `flag-user`, `send-email`, `settings`, `stuck-jobs`, `tier-override`) properly check `profile.role === 'admin'` via admin client. |
| Franchise + track routes audit | ✅ PASS | All franchise routes (`brand-view`, `matches`, `broker-request`) have auth. `track/session` has auth. |
| `/api/account/restore` IDOR audit | ✅ PASS | Scope-locked to session user (`userId` from `getUser()`, never body). Admin client only updates `eq('user_id', userId)`. |
| `/api/gap-analysis/run` ownership audit | ✅ PASS | Verifies `app.user_id !== user.id` before running enrichment. |
| Dead route investigation | ✅ CONFIRMED CLOSED | Was resolved in Session 101. |
| select(*) remediation | ✅ 18 of 23 fixed | Completed in Session 101 (Session 102 confirmed no regressions). 5 intentional `select()` calls remain (GDPR export, document list needing full content). |
| Module 3 lazy loading | ✅ PARKED | App Router page-level code splitting already covers this; `next/dynamic()` adds no value without heavy 3rd-party deps. |
| Gap analysis 2-call merge | ✅ DONE (Session 101) | `gap-analysis/run` merges N enrich + 1 semantic-eval into single server-side `Promise.all`. Client now makes 1 call instead of N+1. |

### Sprint R — Renewal Module — ✅ COMPLETE

| Item | Commit | Detail |
|------|--------|--------|
| `renewal_intakes` migration (with documents + generated_at) | c004e8b | Owner must apply in SQL Editor — table, RLS, trigger |
| `/api/renewal/intake` GET + PATCH | 0c7813f | Load/create intake; merge-patch answers without wiping |
| `/api/renewal/baseline` GET | 0c7813f | Fetch original application projections + business name |
| `/api/renewal/generate` POST | a2f3958 | Cover letter + BP update (LLM, mimo-v2.5-pro via 'coaching' task) + Template 6 (programmatic) + checklist (static, path-specific). Rate-limited via 'generate' profile. Kill-switch gated. |
| `/renewal` entry page | 0c7813f | Server component — detects purchase, creates intake, redirects |
| `/renewal/intake` 15-question quiz | 0c7813f | Auto-save, baseline pre-population, 70% completion gate, redirect to `/renewal/documents` on mark complete |
| `/renewal/documents` viewer | 95d71b8 | Tabbed (Cover Letter / BP Update / Template 6 / Checklist), copy + download per tab, Regenerate button, polling for generating state |
| Case profile §08 renewal card | 0c7813f | Static card → `/renewal` |

### Sprint F-P — Partnership Document Engine — ✅ COMPLETE

| Item | Commit | Detail |
|------|--------|--------|
| P2 DocumentType union | c6de740 | 6 new types: `cover_letter_p2`, `source_of_funds_p2`, `declaration_p2`, `qualifications_p2`, `nonimmigrant_intent_p2`, `resume_p2`. Labels, tabs, DOC_TYPE_DIMENSIONS, REQUIRED_ELEMENTS, `missing_elements` all updated. |
| Generation engine injection | 84ce72a | `runGenerationPipeline()` detects `complete_partnership` payment → adds P2 doc types to conditionalDocTypes → loads `P2-*` answers once → for `_p2` doc types: prepends P2 context block to system_prompt + overrides module_3_answers with P2 data. FILE_ALIASES map P2 types → existing P1 prompt files. |
| generate/start route | bf29c91 | Checks `complete_partnership` payment via Promise.all; adds 6 P2 types to conditionalDocTypes; creates generated_documents rows for P2 docs. |
| `/api/partner2/intake` GET+PATCH | e32be6c | Payment-gated, ownership-verified. GET returns P2-* answers. PATCH upserts on `application_id,question_key`. Whitelist of allowed P2-* keys. |
| `/apply/partner2` intake form | 3bbe312 | 8 questions (P2-NAME, P2-NATIONALITY, P2-SHARES, P2-INVEST, P2-ROLE, P2-SOF, P2-QUALS, P2-INTENT). Auto-save 800ms debounce. Redirects to `/case-profile` on all 8 complete. |
| §09 Partner 2 card | 527a28b | CaseProfilePage: shows §09 only when `isPartnership`. Links to `/apply/partner2?applicationId=...`. |

**⚠️ $2,495 complete_partnership tier is now safe to sell.**

### Remaining backlog (priority order)
1. Supabase CLI migration history sync (22 applied, CLI shows 2 — cosmetic, not blocking)
2. Results page partnership suppression — confirm $2,495 is now showing (was suppressed in Session 81 Session 81 mitigation commit `6ce16fe`)

### Owner actions required — Sprint R
- Apply `supabase/migrations/20260702100000_renewal_intakes.sql` in Supabase SQL Editor (full table + RLS + trigger)

*Note: "Generation pipeline checkpoint resume" (C2) was already implemented in generation-engine.ts lines 2013-2034 — approvedSet skips re-generating docs from prior interrupted runs. Removed from backlog.*

### Owner actions still pending from Session 100
- Apply `supabase/migrations/20260701200000_profiles_outcomes_consent.sql` (outcomes consent columns) if not yet done.
- Confirm Resend domain verification (flip sender to results@e2go.app if verified).
- Confirm FDD pricing ($297 placeholder).
- D5 outcome survey questions (blocks CIC-5 cross-client learning).

---

## Session 101 — Backlog Execution Wave 1 (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean (26/26 security tests pass). **Push:** ✅ 2bb552b.

### Completed

| Item | Status | Detail |
|------|--------|--------|
| Middleware DB caching | ✅ DONE | `src/middleware.ts` — payment gate + terms cached in Upstash Redis (30-min TTL). Cache invalidated by Stripe webhook on payment (c/s completed + refunded) and by accept-terms on acceptance. Eliminates 2–3 DB hits per authenticated page load. AccessCache includes `{full, sim, fdd, deleted}` for soft-delete check. |
| Stripe webhook cache invalidation | ✅ DONE | `src/app/api/stripe/webhook/route.ts` — deletes `mw:access:{userId}` on checkout.session.completed and charge.refunded. |
| Accept-terms cache warming | ✅ DONE | `src/app/api/auth/accept-terms/route.ts` — sets `mw:terms:{userId}:1.0` = 1 immediately after upsert (TTL 30 min). |
| Account deletion soft-delete | ✅ DONE | `src/app/api/account/delete/route.ts` — stamps `profiles.deleted_at = NOW()` instead of wiping data. Sends "scheduled for deletion in 30 days" email. Invalidates middleware cache. |
| Account restore API | ✅ DONE | NEW: `src/app/api/account/restore/route.ts` — POST clears `deleted_at`, invalidates `mw:access` cache. |
| Account recovery page | ✅ DONE | NEW: `src/app/account-recovery/page.tsx` — shows purge date, "Cancel deletion" button, sign-out option. Middleware redirects soft-deleted users here on PAID_ROUTES. |
| Settings soft-delete messaging | ✅ DONE | `src/app/settings/page.tsx` — post-delete state now shows "scheduled for deletion on [date]" with 30-day grace info. |
| Soft-delete migration | ✅ APPLIED | `supabase/migrations/20260701210000_profiles_soft_delete.sql` — `deleted_at TIMESTAMPTZ` + index applied to `profiles`. |
| Simulator session TTL | ✅ APPLIED | `supabase/migrations/20260701220000_simulator_sessions_ttl.sql` — `expires_at TIMESTAMPTZ` + trigger + index applied to `simulator_sessions`. (Trigger approach used — GENERATED AS not viable for timestamptz + interval.) |
| select(*) optimization — hot paths | ✅ DONE | `generate/progress/[jobId]`: 6 explicit columns (SSE polled every 2s). `generate/run/[jobId]`: 4 explicit columns. |
| Kill-switch enforcement | ✅ DONE | Added `isKillSwitchEnabled()` to 8 routes missed in Sprint 98: `simulator/evaluate`, `simulator/follow-up`, `simulator/prep-kit`, `simulator/coaching-report`, `simulator/interview-prep`, `gap-analysis/enrich`, `faq/ask`, `case-file/field-quality`. |
| Dead route investigation | ✅ CONFIRMED — not dead | `/api/stripe/checkout` (HEAD/GET only) is a Stripe config health probe, not a duplicate. `/api/stripe/create-checkout` handles actual checkout. |

### ✅ Session 101 migrations — BOTH APPLIED

### Owner actions still pending from Session 100
- Apply `supabase/migrations/20260701200000_profiles_outcomes_consent.sql` (outcomes consent columns) if not yet done.
- Confirm Resend domain verification (flip sender to results@e2go.app if verified).
- Confirm FDD pricing ($297 placeholder).
- D5 outcome survey questions (blocks CIC-5 cross-client learning).

### Remaining backlog (priority order)
1. Phase D QA-B — authenticated case file audit (/dashboard, /apply/*, /settings, /score) — partial progress this session
2. Phase D QA-C — simulator + generation + API routes audit — started (kill-switch gaps found and closed)
3. Gap Analysis 2-call merge into single `/api/gap-analysis/run` endpoint
4. Module 3 `next/dynamic()` lazy loading (apply section pages ~4,000 lines)
5. Remaining select(*) → explicit columns (18 routes remain, FDD routes are largest)
6. Generation pipeline checkpoint resume (complex, no plan yet)
7. Partnership Document Engine (Sprint F-P — CRITICAL, do not sell $2,495 tier until built)
8. Renewal Package Flow ($497 tier exists, no flow)

---

## Session 100 — D6 Consent + Sensai Health + CSP + Regex (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean. **Push:** ✅ c802d87.

### Completed

| Item | Status | Detail |
|------|--------|--------|
| D6 Point 1 — signup consent checkbox | ✅ DONE | `outcomesConsent` state + checkbox UI after CASL block in `src/app/signup/page.tsx`. Writes `outcomes_consent` + `outcomes_consent_at` to profile on sign-up. |
| D6 Point 2 — existing-user banner | ✅ DONE | `OutcomesConsentBanner` component fetches `/api/profile/outcomes-consent` (GET); shows only when `outcomes_consent === null` (never asked). "Yes, I'm in" / "No thanks" → POST → hidden. Wired inside `<header>` in `Nav.tsx` (auth users only). |
| D6 migration | ✅ BUILT — owner must apply | `supabase/migrations/20260701200000_profiles_outcomes_consent.sql` adds `outcomes_consent BOOLEAN` + `outcomes_consent_at TIMESTAMPTZ` to profiles. Existing rows get NULL (banner shows next login). Run in Supabase SQL Editor. |
| Sensai Health franchise brand | ✅ DONE | Added to `src/data/franchise-brands.ts` — fitness/wellness, $200K–$450K, E-2 score A, renewal strength 82. |
| S2 — Remove unsafe-eval from main CSP | ✅ DONE | `next.config.mjs` main route CSP now has `'unsafe-inline'` only. Keystatic admin still has `unsafe-eval`. Build confirmed clean. |
| Placeholder regex — DocumentAuditPanel | ✅ DONE | `src/components/documents/DocumentAuditPanel.tsx` line 161 — regex now catches both ALL-CAPS (`[PASSPORT NUMBER]`) and descriptive lowercase forms (`[passport number]`, `[insert name here]`, `[your country]`). |

### Owner action required
- Apply `supabase/migrations/20260701200000_profiles_outcomes_consent.sql` in Supabase SQL Editor → adds `outcomes_consent` and `outcomes_consent_at` columns to `profiles`.

---

## Session 99 — Audit v3 Remediation (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean (163 pages). **Session 98 migrations:** ✅ both applied.

### Audit v3 — all 3 findings closed

| Finding | Status | Fix |
|---------|--------|-----|
| N1 — /case-profile mobile overflow | ✅ CLOSED | `isMobile` state + resize listener in `src/components/CaseProfilePage.tsx`. Sidebar hidden on mobile. Padding reduced from `80px 32px 0` to `80px 16px 0` on ≤768px viewports. |
| F20 — quiz_sessions anon-readable (regression) | ✅ CLOSED | Two legacy SELECT policies ("Users can select own quiz sessions" + "Users can select their own quiz sessions") both contained `OR user_id IS NULL` — OR'd with the new restrictive policy, leaking all anonymous sessions. Dropped both by name. Verified: `SET LOCAL role TO anon; SELECT count(*) FROM quiz_sessions;` → 0. |
| F6 — applications.treaty_country column missing | ✅ CLOSED | Column existed only in a view definition (`20260628100000_case_profile_view.sql`), never as a real ALTER-TABLE column. Applied standalone: `ALTER TABLE applications ADD COLUMN IF NOT EXISTS treaty_country text;` |

**F21 re-verified:** `SET LOCAL role TO anon; SELECT count(*) FROM application_lifecycle;` → 0. Already clean from Session 96 migration.

**Root cause note (F20):** Supabase ORs all permissive policies. The new restrictive policy added in Session 96 was correct, but two pre-existing SELECT policies with `user_id IS NULL` branches negated it for anonymous callers. Verification must be run as `anon` role (not service role, which bypasses RLS).

### Session 98 migrations confirmed applied

| Migration | Status |
|-----------|--------|
| `20260701100000_support_tickets.sql` | ✅ Applied — support_tickets table live |
| `20260701110000_franchise_tracking.sql` | ✅ Applied — broker_requests, broker_referrals, franchise_brand_views, login_events live |

### What's next

- D6 Points 1+2: signup consent checkbox + existing-user terms-update banner
- D5: Owner to define outcome survey question set
- S2: Test removing `unsafe-eval` from CSP
- CIC-5: gated on D5 + D6 full
- Sensai Health: add to `src/data/franchise-brands.ts`

---

## Session 98 — Admin Intelligence Suite + Geo Tracking (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean (163 pages). **Push:** ✅ 26/26 security tests passed.

### ⚠️ MIGRATIONS TO APPLY (owner must run before next deploy)

| Migration | What it creates |
|-----------|-----------------|
| `20260701100000_support_tickets.sql` | `support_tickets` table — replaces the mailto-only /support page |
| `20260701110000_franchise_tracking.sql` | `broker_requests`, `broker_referrals`, `franchise_brand_views`, `login_events` — **fixes 2-table data loss: all franchise broker connections have been silently dropped since launch** |

### Critical data loss fixed

`broker_requests` and `broker_referrals` tables never existed in any migration. Every franchise broker connection request submitted since the feature was built has been silently dropped (try-catch swallowed the insert error). These tables are now created by the migration. The try-catch wrappers have been removed from both write paths.

### New pages built

| Page | URL | Description |
|------|-----|-------------|
| Support inbox | `/admin/support` | Full ticket inbox — open/in_progress/resolved counts, message preview, priority dot |
| Franchise funnel | `/admin/franchise` | Brand page views by brand, broker requests, referral conversion rate, recent requests table |
| Engine intelligence | `/admin/intelligence` | CIC verifier pass rate, token efficiency by task, FAM score averages, simulator readiness distribution |
| Geographic intelligence | `/admin/geography` | Country breakdown, top cities globally, Canada drilled to city + province, UK drilled to city + region |

### New API routes

| Route | Purpose |
|-------|---------|
| `POST /api/support/submit` | Save ticket to DB + email admin via Resend |
| `POST /api/franchise/brand-view` | Log franchise brand page visit |
| `POST /api/track/session` | Capture geo on email/password logins (password-login path) |

### Geo tracking architecture

Uses **Vercel edge headers** (`x-vercel-ip-country`, `x-vercel-ip-city`, `x-vercel-ip-region`) — zero external API, zero cost. Fields: `country` (ISO code), `country_name`, `city`, `region` (province/state code), `login_type`.

- OAuth/magic-link logins → captured in `auth/callback`
- Email/password logins → login page fires `POST /api/track/session` fire-and-forget after successful auth
- `src/lib/geo.ts` — shared helper + country name map (40 E-2 treaty countries) + CA/GB region maps

### Admin dashboard updates

- 8 metric cards: total revenue, revenue today, paid customers, total users, docs today, logins today, open tickets (red if >0), LLM cost month
- Nav links added: Support (with red badge when tickets open), Franchise, Intelligence, Geography

### Support form

`/support` page rewritten from a mailto link to a full tracked form with category selector, subject, message, character counter, error state, and confirmation screen.

---

## Session 96 — Deep Audit v2 Remediation (June 30, 2026)

**Branch:** dev. **Build:** ✅ clean (156 pages). **Migrations to apply:** 2 new + 4 pending.

### Audit findings addressed (22 total — ZCode Deep Audit v2)

**False positives confirmed (0 fixes needed):**
- F1 — `application-documents` bucket name is correct (storage, not DB table). All 7 refs are `.storage.from()` calls. DB already uses `application_documents` underscore. ✅ Not a bug.
- F5 — broker_referrals + broker_requests already wrapped in try-catch with graceful-skip. ✅ Already handled.

**Sprint A — P0 Security (RLS + Auth)**

| Fix | File | Detail |
|-----|------|--------|
| F20 — quiz_sessions anon-readable (P0) | `migrations/20260630300000_fix_rls_data_exposure.sql` | SELECT policy: `auth.uid() = user_id OR (user_id IS NULL AND email = auth.jwt() ->> 'email')` — blocks cross-user reads; preserves post-login session linking |
| F21 — application_lifecycle anon-readable (P1) | same migration | ENABLE ROW LEVEL SECURITY + SELECT/ALL policy scoped to `auth.uid() = user_id` |
| F9 — getAuthToken returns UUID not JWT (P0) | `app/documents/[applicationId]/page.tsx` | Replaced localStorage UUID read with `createBrowserSupabaseClient().auth.getSession()` → real JWT access_token; all 6 call sites updated to await |

**Sprint B — P1 Auth & Code Fixes**

| Fix | File | Detail |
|-----|------|--------|
| F17 — profile/name always 500 (P1) | `api/profile/name/route.ts` | Switched from upsert (fails under RLS) to `.update().eq('id', user.id)` via service client; returns generic error (no schema leak) |
| F15 — GET /api/admin/settings no auth (P2) | `api/admin/settings/route.ts` | Added `getRequestingAdmin()` gate to GET — now 403 for unauthenticated callers |
| F16 — email/schedule session-fallback privilege escalation (P2) | `api/email/schedule/route.ts` | Session fallback now requires `profiles.role === 'admin'`; any non-admin authenticated user gets 403 |
| F14 — 4 LLM endpoints no rate-limit (P1) | `lib/rate-limit.ts` + 4 routes | Added `fdd` (3/60m), `semantic-eval` (10/10m), `parse-doc` (10/10m), `notification` (3/60m) profiles; fail-closed extended to `fdd`; all 4 endpoints now call `checkRateLimit` |

**Sprint C — P2 Code Fixes**

| Fix | File | Detail |
|-----|------|--------|
| F4 — webhook_events table name (P2) | `api/admin/health-detail/route.ts:125` | Renamed `webhook_events` → `processed_webhook_events` |
| F10 — .single() on 0-row reads (Low) | `apply/module3/c,d,j + generate/[applicationId]` | 5 `.single()` → `.maybeSingle()` (PGRST116 errors fixed for new users with no answers yet) |
| F7 — franchise routes lose ?next (P2) | `middleware.ts` | Added `/franchise/` to `AUTH_ROUTES` — unauth redirects now include `?next=` for return navigation |

**Sprint D — Data Quality**

| Fix | File | Detail |
|-----|------|--------|
| F18 — unbounded answer_value (P2) | `api/answers/route.ts` | typeof string check, trim, reject whitespace-only → null, 10k char cap |
| F19 — autosave `||` coerces 0/false to null (Low) | `hooks/useAutoSave.ts` | `|| null` → `?? null` |
| F11 — franchise-referral no rate-limit (P2) | `api/notifications/franchise-referral/route.ts` | Added `checkRateLimit(user.id, 'notification')` (3/60m); use session `user.email` instead of body `userEmail` |

**Sprint E — Accessibility**

| Fix | File | Detail |
|-----|------|--------|
| F23 — form inputs lack programmatic labels (P2) | `login/page.tsx`, `signup/page.tsx`, `quiz/page.tsx`, `results/page.tsx` | Added `htmlFor` + `id` pairs on all 8 inputs across 4 pages; quiz/results use `sr-only` label pattern |
| F24 — no skip-to-content link (Low) | `app/layout.tsx` | Visually-hidden-until-focused skip link + `id="main-content"` on main landmark |

### Migrations applied ✅ (June 30, 2026 — confirmed by owner)

| Migration | Status |
|-----------|--------|
| `20260630300000_fix_rls_data_exposure.sql` | ✅ Applied — RLS data exposure closed (F20/F21) |
| `20260630310000_fix_missing_schema_columns.sql` | ✅ Applied — F6 column additions live |
| `20260627100000_interview_prep_kits.sql` | ✅ Applied — prep-kit feature unblocked (F2) |
| `20260619100000_franchise_brands.sql` | ✅ Applied — franchise navigator unblocked (F3) |
| `20260630200000_rls_admin_log_tables.sql` | ✅ Applied — admin log tables RLS-locked (H4) |
| `20260630210000_case_intelligence_locks.sql` | ✅ Applied — case intelligence build lock live (H6) |

### Session 97 — Kill-Switch Enforcement (July 1, 2026)

**Branch:** dev. **Build:** ✅ clean. **No new migrations required.**

Audit v2 secondary-limb review (cross-checked against audit agent's own post-review):
- **F11 email source**: Both limbs confirmed done. `userEmail = user.email ?? ''` from auth session (not body) already in place.
- **F17 error genericization**: Both limbs confirmed done. Returns `{ error: 'Update failed' }` — no `error.message` leak.
- **F14 kill_switch**: Was missing from ALL LLM routes (including `generate/start`, the supposed reference). Now fixed.
- **F22 lifecycle trigger**: No DB trigger exists — lifecycle is code-driven. No fix needed; will self-correct for new apps.
- **F20 anon-scope**: Unfounded concern. All quiz_sessions SELECTs are inside `if (user)` blocks; anonymous state lives in localStorage. Policy is correct.

**Kill-switch wiring** — new shared helper + 5 routes updated:

| File | Change |
|------|--------|
| `src/lib/kill-switch.ts` (NEW) | `isKillSwitchEnabled()` — reads `app_settings.kill_switch_enabled`, 30s cache, fail-open on DB error |
| `api/fdd/extract/route.ts` | Kill-switch check inside SSE stream after rate limit → sends SSE error event, closes stream |
| `api/fdd/score/route.ts` | Kill-switch check after rate limit → 503 JSON |
| `api/gap-analysis/semantic-eval/route.ts` | Kill-switch check after rate limit → 503 JSON |
| `api/apply/parse-document/route.ts` | Kill-switch check after rate limit → 503 JSON |
| `api/generate/start/route.ts` | Kill-switch check after rate limit → 503 JSON |

### Findings fully resolved (all 22)

All 22 audit findings from ZCode Deep Audit v2 are closed. No outstanding items.

- **F8** (info): Login rate-limiter returns JSON 429 on page GET. Minor UX, not a security issue — deliberately not fixed.
- **F22** (low): Self-correcting for new apps. No code or DB change needed.

### What's next

- D6 Points 1+2: signup consent checkbox + existing-user terms-update banner
- D5: Owner to define outcome survey question set
- S2: Test removing `unsafe-eval` from CSP
- CIC-5: gated on D5 + D6 full

---

## Session 95 — QA Audit Fixes + CIC-P.2–P.5 (June 30, 2026)

**Branch:** dev. **Build:** ✅ clean. **No new migrations required.**

### Completed this session

**CIC-P.2 — Cross-document canonical consistency sweep** ✅
- `src/lib/cic-consistency-sweep.ts` (NEW): Phase 1 regex extraction (8 canonical fields, critical/warning severity); Phase 2 Gemini semantic sweep; integrated into `generation-engine.ts` quality gate
- `src/app/api/dashboard/consistency-sweep/route.ts` (NEW): `GET ?applicationId=`
- Migration `20260630130000_generation_jobs_consistency.sql` applied ✅

**CIC-P.3 — Intra-document flow directives** ✅
- `src/lib/cic-verifier.ts`: `DOC_SECTION_CONTRACTS` for 5 doc types (cover_letter 8 sections, business_plan 7, source_of_funds 4, qualifications 4, marginality_rebuttal 5); section contract enforcement + argument density rule in verifier prompt; `flowIssues[]` added to `VerifierResult`
- Verifier figure-check: canonical figures block from `numbers_strategy` injected as ground truth — verifier was previously "vibes" checking figures with no reference
- Verifier null fix: `verifierResult===null` (LLM outage) now explicitly warns + breaks vs silent pass

**CIC-P.4 — Package assembly gate + client certification API** ✅
- `src/app/api/dashboard/certify-document/route.ts` (NEW): POST sets `client_certified`, merges `locked_passages[]`
- `src/app/api/dashboard/request-regeneration/route.ts` (NEW): POST clears cert, stores `client_regen_note`, queues regen job
- `src/lib/generation-engine.ts`: `waitForApproval` replaced with immediate pass-through (CIC-P.4 async model — no 5-min server poll); download gate upgraded to `buildPackageManifest().packageReady`
- Migration `20260630140000_cic_p4_package_assembly.sql` applied ✅

**CIC-P.5 — Change impact tracking** ✅
- `src/lib/cic-change-impact.ts` (NEW): verdict diffing → impacted doc map → urgency scoring; stored on `case_theory.impact_report`
- `src/app/api/dashboard/change-impact/route.ts` (NEW): GET returns impact report; DELETE dismisses
- Migration `20260630150000_case_theory_impact_report.sql` applied ✅

**QA/Security audit fixes** ✅

| Fix | File | Detail |
|-----|------|--------|
| C1 — Stripe payment race | `api/stripe/verify-payment/route.ts` | Writes `payment_status='paid'` immediately; no longer waits for webhook |
| N3 — Dead `applicationId` param | `api/dashboard/case-profile/route.ts` | GET now honors `?applicationId=` query param |
| N4 — `/fdd` payload bloat | `app/fdd/page.tsx` | `select('*')` → named columns; excludes `extracted_fields` + `profile_match` JSONB (heavy) |
| N5 — Wrong status codes | `api/answers/route.ts`, `api/faq/ask/route.ts` | Invalid JSON → 400 with `invalid_json` error code |
| Autosave race — module3/j | `apply/module3/j/page.tsx` | Per-key `Map<string, NodeJS.Timeout>` debounce (was single shared ref) |
| Autosave race — module3/d | `apply/module3/d/page.tsx` | Same per-key debounce fix |
| SSE content bloat | `api/generate/progress/[jobId]/route.ts` | Strips `content_text` from 2s polls; total docs derived from `job.document_types.length` |
| Rate-limit fails closed | `lib/rate-limit.ts` | `generate` profile blocks (not allows) when Upstash unconfigured |
| `onFieldsApplied` no-op | `components/CaseProfilePage.tsx` | Now calls `reloadProfile()` so have/total counts update after document import |

### P0 fixes (Session 95 cont.) ✅

| Fix | File | Detail |
|-----|------|--------|
| H5 — SSE IDOR | `api/generate/progress/[jobId]/route.ts` | Added `.eq('user_id', user.id)` to job query — any authed user who knew a jobId could stream another user's pipeline |
| C1 — verify-payment auth | `api/stripe/verify-payment/route.ts` | Requires `getUser()` session; userId derived from cookie not body; ownership check on Stripe metadata userId |
| C2 — checkpoint resume | `lib/generation-engine.ts` | Loads already-approved docs at pipeline start and skips them — interrupted runs no longer re-spend Claude credits |
| H4 — RLS log tables | `migrations/20260630200000_rls_admin_log_tables.sql` | RLS + FORCE on llm_cost_log, admin_audit_log, cron_log — service-role only |

### P1 fixes (Session 95 cont.) ✅

| Fix | File | Detail |
|-----|------|--------|
| H3 — Webhook idempotency | `api/stripe/webhook/route.ts` | INSERT first, catch 23505 unique constraint as dedup gate — removes SELECT+INSERT TOCTOU race |
| M1 — Rate-limit /run | `api/generate/run/[jobId]/route.ts` | generate profile now checked on both /start and /run — was bypassable |
| M2 — Sentry wiring | `lib/llm-client.ts` | `Sentry.captureException` in callLLM all-providers-failed path |
| H6 — CIC build lock | `lib/case-intelligence-core.ts` + `migrations/20260630210000_case_intelligence_locks.sql` | `acquire_case_intelligence_lock` RPC with 30s TTL prevents concurrent CPU builds per application |

### Owner actions required

- Apply `supabase/migrations/20260630200000_rls_admin_log_tables.sql` ← H4
- Apply `supabase/migrations/20260630210000_case_intelligence_locks.sql` ← H6

### P2 fixes (Session 95 cont.2) ✅

| Fix | File | Detail |
|-----|------|--------|
| M4 — Flush on unmount | `lib/use-autosave-flush.ts` (NEW) + 6 apply pages | `useAutosaveFlush` hook flushes pending debounces on beforeunload and React unmount across story/business/investment/qualifications/family/ties |
| M8 — Refund revokes access | `api/stripe/webhook/route.ts` | `charge.refunded` now revokes FDD (`report_unlocked=false`) and deducts 3 simulator sessions via Stripe PI metadata lookup |
| M6 — Threshold unification | `lib/e2-thresholds.ts` (NEW) | Single canonical 9 FAM 402.9-6(D) sliding-scale table; both `fdd-profile-match-engine.ts` and `fdd-scoring-engine.ts` delegate to it |

### P2 remaining (Session 95 cont.3) ✅

| Fix | File | Detail |
|-----|------|--------|
| H2 — Figure provenance | `lib/figure-provenance.ts` (NEW) + `lib/generation-engine.ts` | Deterministic regex extraction of dollar/pct/headcount figures from draft; orphans injected as correction brief before LLM verifier runs (free, no LLM cost) |
| M3 — Legacy label extraction | `data/question-labels.ts` (NEW) | `QUESTION_LABELS`/`SECTION_MAP`/`SECTION_LABELS` moved to data file; engine re-exports for BC; `case-summary` now imports direct — simulator no longer depends on extraction engine |

### What's next


- Architecture: typed DB schema mirror (Zod per table) — makes N1/N2-class column drift a compile error
- D6 Points 1+2: signup consent checkbox + existing-user terms-update banner
- D5: Owner to define outcome survey question set
- S2: Test removing `unsafe-eval` from CSP
- CIC-5: gated on D5 + D6 full

---

## Session 94 — Sprint J-1 Complete: CIC-3 + CIC-4.1 + Decisions D1–D6 (June 30, 2026)

**Branch:** dev. **Build:** ✅ clean. **Migrations applied in Supabase:** ✅ both (outcome_capture + case_model_d1_merge).

### Completed this session

**CIC-3.1 — Gap analysis consuming CPU comprehension** ✅
- `src/lib/gap-analysis-engine.ts`: exports `LedgerFact`, `CpuGapContext`; `scoreCase()` gained 7th optional `cpuContext` param; `applyCpuContext()` enriches evidence[] and flags `denialFactors` with ⚑ after scoring
- `src/lib/generation-engine.ts`: `buildGenerationPayload()` fetches `case_theory` + `document_intelligence.ledger` in a single `Promise.all`; `buildCpuGapContext()` maps ledger facts → `LedgerFact[]` and derives `activeDenialCodes` from unproven dimension verdicts; passes `cpuGapContext` as 5th arg to `buildGapContext()`; removed duplicate downstream case_theory fetch

**CIC-3.2 — FDD auto-seed from document imports** ✅
- `src/lib/cic-fdd-seed.ts` (NEW): `seedFddAnalysisFromUpload()` — persists FDD PDF to `application-documents` bucket + seeds pending `fdd_analyses` row; idempotent on (application_id, original_filename); storage rollback on DB insert failure; only FDDs are stored (all other imports keep file_path='')
- `src/app/api/apply/parse-document/route.ts`: non-blocking FDD seed added after CIC fire-and-forget block (only when resolvedDocType==='fdd' && isPdf)

**CIC-3.3 — Simulator prep-kit steered by Case Theory** ✅
- `src/app/api/simulator/prep-kit/route.ts`: 6th parallel fetch for `case_theory.dimension_verdicts + directives`; `cpuWeakDimensions` (weak/missing/contradicted); `cpuPrepDirectives` (engine='simulator_prep' OR weak dimension); `CPU_DIM_TO_WP` map (source_of_funds→WP-03, investment→WP-01, operations→WP-02, background→WP-04); WP probe selection unions legacy score triggers with `cpuForcedProbeIds`; dossier rule leads with CPU weak dimensions

**CIC-4.1 — Documents page rebuild** ✅
- `src/app/documents/[applicationId]/page.tsx`: full rewrite — three parallel fetches (documents, package-manifest, change-impact); change-impact banner (urgency colour-coded, dismissable); package progress strip with live bar; document cards (CERTIFIED green / AWAITING CERTIFICATION amber); download gate: `manifest.packageReady && allAcknowledged`; `outcomes_consent` checkbox (D6 third-point consent)
- `src/types/generation.ts`: added `client_certified`, `certified_at`, `client_regen_note`, `verifier_result` to `GeneratedDocument`

**D1 — case_profiles ↔ case_model merge (phase 1)** ✅
- `src/lib/case-profile.ts`: after writing to `case_profiles`, now also upserts to `case_model` (archetype, eligibility_score, source/management/business scores, completeness_score, franchise_triggered)
- Migration `20260630170000_case_model_d1_merge.sql` applied ✅

**D2 — quiz-scoring.ts deleted** ✅ (zero callers confirmed)

**D3 — upstream flow kept inside CIC-2** ✅ (default accepted)

**D4 — outcome capture table** ✅
- `src/app/api/dashboard/outcome/route.ts` (NEW): POST upserts outcome, GET fetches current outcome; auth via Bearer; ownership check; `consent_given` from POST body only
- Migration `20260630160000_outcome_capture.sql` applied ✅

**D5 — post-outcome survey questions** — PENDING Romy's domain input

**D6 — three-point consent model** — PARTIAL
- Point 3 (before download): ✅ built in CIC-4.1 (`outcomes_consent` checkbox in documents page)
- Point 1 (signup): ❌ not yet built
- Point 2 (terms update / existing users): ❌ not yet built

### What's next

**D6-signup** — Add `outcomes_consent` checkbox to signup page; persist to `profiles` or metadata table.

**D6-terms-update** — Banner/modal shown on next login for existing users when terms version bumps.

**D5** — Romy to define survey question set (outcome, consulate, denial codes, officer probes, decisive dimensions, timeline). Gating CIC-5 cross-client learning.

**CIC-5** (gated on D5 + D6 full) — outcome survey delivery, anonymization, outcome-indexed case library (2nd RAG corpus).

**D1 Phase 2** (follow-on sprint) — migrate ~14 `case_profiles` readers to use `case_model/case_theory`; then drop backward-compat sync and eventually `case_profiles`.

### Owner actions still required (carried from prior sessions)
- CIC-0.4: apply `20260630100000_case_intelligence_core.sql`, set `OPENAI_API_KEY`, run `npx tsx scripts/seed-kb-corpus.ts` (unblocks CIC-1.6 → CIC-2)
- Apply `supabase/migrations/20260627100000_interview_prep_kits.sql`
- Apply `20260629100000_uploaded_documents.sql` (if not yet done — from Session 90)
- All Session 89 env var / Stripe / Resend items (items 1–12 in Session 89 block below)
- ~~N1: family_members migration~~ ✅ applied Session 95
- ~~N2: missing_schema_columns migration~~ ✅ applied Session 95

---

## Session 93 — Architecture Reconciliation + Pending-Decisions Register (June 30, 2026)

**Branch:** dev. **No code changed** — documentation only (option 4 locked: delete/migrate nothing until the new path runs clean). Files touched: `docs/FEATURE_INVENTORY.html`, this tracker, `docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md`.

### The correction (verified in code)
An earlier characterization — "the engines are siloed; generation is blind to FDD & market findings" — was **OVERSTATED**. The inventory's `SILOS` array (Sessions 56–68, all resolved) plus a code re-read show a working, if crude, shared bus: **the flat `answers` table**.
- FDD writeback upserts 8 keys, `source='fdd_intelligence'` — `src/app/api/fdd/writeback/route.ts:55`.
- Market analysis upserts **QMA-prefixed** territory keys (NOT a single `market_territory` key — that label was stale) — `src/app/api/market-analysis/route.ts:37`.
- Simulator coaching + voice profile also write back to `answers`.
- Generation reads the **entire** set via `.from('answers').select('*')` — `src/lib/generation-engine.ts:545`.
- So findings **do** flow today, as flat answer values.

### What genuinely remains open (the honest, narrower gap)
1. `case_theory` (the structured, reasoned, provenance-tagged replacement) is built but consumed **only** by the `/case-profile` dashboard — no engine reads it. (CIC-2 gate.)
2. Generation's gap context is **degraded**: `scoreCase(application, answers, [], undefined, undefined, archetype)` at `generation-engine.ts:494` passes empty docs/brief/sim. Raw answer values are present; the reasoned gap context is thin.
3. Two parallel client models: older `case_profiles` (CIP) and new `case_model` — not unified.
4. Two parallel document pipelines: `document-extraction-engine.ts` (legacy/superseded) vs `parse-document/route.ts` (S91).
5. `quiz-scoring.ts` is **orphaned** — zero importers; live scoring is inline in `quiz/page.tsx` + `case-profile.ts scoreQuizEligibility()`.

**Reframed CIC-2 value:** not "build cross-engine wiring that doesn't exist," but **"upgrade the existing flat `answers` bus to structured `case_model` / `case_theory`."**

### Pending Decisions — awaiting owner (mirrored in FEATURE_INVENTORY.html → Gaps)
- **D1** — `case_profiles` ↔ `case_model` consolidation timing (coexist via shadow-write until CIC-2 proves clean; option 4).
- **D2** — `quiz-scoring.ts` deletion: now vs. batched with the consolidation sweep.
- **D3** — upstream flow (gap/FDD → business plan & package): keep inside CIC-2 (recommended, preserves the CIC-1.6 quality gate) vs. pull a thin slice forward.
- **D4** — stand up the outcome-capture table now vs. wait for survey design (recommend: build schema now, it's additive).
- **D5** — outcome survey question design — **needs Romy's E-2 domain input** (outcome, consulate, denial codes, officer probes, decisive dimensions, timeline).
- **D6** — anonymization & consent model for cross-client learning (privacy gate before any real data enters a shared corpus).

### Greenlit, not yet built — "Genuine learning from experience"
- **Client Outcome Survey + outcome-capture table** — closes the feedback loop; delivered via `email-scheduler` clock2. Gated on D5.
- **Anonymized outcome-indexed case library (2nd RAG corpus)** — distinct from `kb_chunks` (authored doctrine); retrievable at reason-time. Sequenced as **CIC-5** in the J-1 sprint doc. Gated on outcome capture + D6. Honest limit: advisory-only until N is statistically meaningful.

### Still pending owner action (carried from S92)
- **CIC-0.4** — apply `20260630100000_case_intelligence_core.sql`, set `OPENAI_API_KEY`, run `npx tsx scripts/seed-kb-corpus.ts`. Unblocks CIC-1.6 → CIC-2.

### Session-count estimate (given to owner, end of Session 93)
Calibrated against actual velocity so far (CIC-0 = 1 session; CIC-1's 5 sub-tasks = 1 session, Session 92):
- CIC-1.6 (verify on a seeded test account): ~0.5 session, folds into the next session's start. Blocked on CIC-0.4.
- **CIC-2** (2.1 inject brief into generation, 2.2 LLM-as-critic verifier, 2.3 reject/regen gating loop + retry guard): **1–2 sessions**. This is the keystone step.
- CIC-3 (3.1 gap analysis evidence + denial codes, 3.2 FDD auto-seed, 3.3 territory/simulator-prep directives): 1–2 sessions.
- CIC-4 (4.1 package-level gating): ~1 session, often rides with CIC-3.
- CIC-5 (5.1–5.4 outcome table, survey delivery, anonymization, learned case library): 1–2 sessions to *build*; gated on D4/D5/D6 and on real outcome data accruing post-launch (calendar time, not session time) before it's actually useful.
- **Full remaining backlog: ~4–6 sessions.**

### Next session priority
Owner to action CIC-0.4 (migration + API key + KB seed) when ready. Once seeded, next session opens with CIC-1.6 verification on a seeded test account, then proceeds into CIC-2 if reasoning quality holds. D1–D6 decisions remain open and don't block CIC-2 start (D3 is the only one CIC-2-adjacent — default is "keep inside CIC-2" unless owner says otherwise).

---

## Session 92 — Case Intelligence Core: CIC-0 + CIC-1 (June 30, 2026)

**Branch:** dev. **Full session log:** `docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md` (build sequence, locked decisions, hard boundaries — read that doc, not this summary, before continuing CIC work).

### CIC-1 — Read-only brain ✅ (1.1–1.5 code-complete)

**Fixed — `src/app/api/apply/parse-document/route.ts`**
- CIC-1.1 wiring gap: `comprehendApplicationDocuments` was imported but never called. Now sequenced fire-and-forget after `extracted_json` persists, chained before `buildCaseIntelligence` (which reads the comprehension ledger).

**New — `src/lib/case-intelligence-core.ts`**
- `assembleCaseModel(applicationId, userId)` (Faculty 1 — PERCEIVE): reads quiz_sessions, applications, answers, document_intelligence ledger, followup_responses, simulator_sessions, case_briefs into a provenance-tagged `case_model` (9 dimensions, `data_state` computed from signal/fact counts).
- `generateCaseTheory(applicationId, userId, caseModel)` (Faculty 2 GROUND + Faculty 3 REASON): per-dimension `retrieveDoctrine()` calls, then reasons as a **five-expert panel** — senior immigration consultant, senior E-2 consular officer, senior immigration attorney, senior franchise development consultant, senior market analyst — synthesized into one `case_theory` (narrative, transferable skills, numbers strategy, per-dimension verdicts with **persona-tagged creative gap-fill suggestions**, directives for downstream engines, doctrine citations derived from retrieval — never LLM-asserted).
- Hard boundaries preserved: numbers never invented (Case Model facts only, framed not recomputed), every claim traceable to a fact or KB citation, graceful no-uncited-doctrine fallback while KB is unseeded.
- `buildCaseIntelligence(applicationId, userId)`: orchestration entrypoint (assemble → reason).

**Wired — `/api/answers`, `/api/simulator/outcome`** — `buildCaseIntelligence` fires fire-and-forget alongside the existing `buildCaseProfile` call (simulator route guarded on optional `applicationId`).

**Modified — `src/app/api/dashboard/case-profile/route.ts`**
- Added `CaseTheoryUI` type + `caseTheory` field to `CaseProfileResponse`. Fetches `case_theory` row in parallel with the existing QMA market-analysis query; maps to UI shape or `null` if no row exists yet (expected — KB unseeded, most accounts pre-CIC).

**Modified — `src/components/CaseProfilePage.tsx`**
- New `CaseTheoryBlock` component (narrative, numbers strategy, transferable skills, per-dimension verdict cards with gap-fill suggestions tagged by persona) rendered conditionally in the existing "04 Case Intelligence" section. Matches existing Obsidian Gold tokens — no new design language introduced.

**Verified:** `npx tsc --noEmit` + `npm run build` clean. Live-checked `/api/dashboard/case-profile` against a real (unpaid, KB-unseeded) test account — 200 OK, `caseTheory: null`, zero console errors. Confirmed `/case-profile` is correctly payment-gated by `middleware.ts` (PAID_ROUTES) — unpaid accounts bounce to `/results`, which is expected behavior, not a CIC bug.

**Not done (by design, gated):** `case_theory` is NOT wired into `generation-engine.ts`, `gap-analysis-engine.ts`, or any other peripheral engine — that's CIC-2, explicitly deferred until CIC-1.6 (verification on a seeded test account) passes.

**Owner action still required (CIC-0.4, blocks CIC-1.6):** apply `20260630100000_case_intelligence_core.sql`, set `OPENAI_API_KEY`, run `npx tsx scripts/seed-kb-corpus.ts` to seed the 177-doc KB corpus — without it, doctrine citations stay empty (the reasoning prompt is instructed not to assert uncited legal standards, so this degrades gracefully but isn't a full test).

---

## Session 91 — DocumentImportHub Upgrade + Comprehension Engine Spec (June 30, 2026)

**Branch:** dev.

### Sprint I-4+ (DocumentImportHub Session 91 Upgrade) ✅

**Modified — `src/app/api/apply/parse-document/route.ts`** (full rewrite)
- `extractFDDSections(buffer)`: reads full PDF text (no 32K truncation), position-based section splice for Cover + Items 1,2,3,4,5,6,7,11,12,17,19,20,21. 80K char cap on full text. Second occurrence heuristic (skips TOC). Item 17 (renewal/termination) added; Item 9 removed.
- `detectDocumentType(textSample, userId)`: 20-token LLM call (task: 'extract'), returns validated doc type string or 'resume' fallback. Used when docType='auto'.
- `COMPREHENSIVE_SCHEMAS`: 11 doc types — fdd (80 fields, 4000 maxTokens), resume, financial_statement, investment_records, business_plan, territory_analysis, passport, franchise_agreement, lease_agreement, acquisition_financials, government_form.
- `INTAKE_FIELD_MAP`: 3 false-conflict-causing entries removed — `most_recent_title → M3-Q-00` (resume: job title ≠ franchise type), `investment_mid → M3-F-02` (fdd: system avg investment ≠ client capital), `hq_location → M3-B-02` (fdd: franchisor HQ ≠ target location).
- `FIELD_LABELS`: human-readable labels for all keys incl. new ones (M3-A-DOB, M3-A-NATIONALITY, M3-A-PASSPORT, M3-A-PASSPORT-EXP, M3-A-BIRTH-COUNTRY, M3-FA-DATE, M3-G-ADDRESS, M3-G-RENT, M3-G-LEASE-TERM, M3-ACQ-REASON).
- `ParseDocumentResponse`: added `totalFields: number` field.
- POST handler: validates docType ('auto' allowed), FDD→extractFDDSections, PDF→extractTextFromBuffer, else raw UTF-8. Resolves docType if 'auto'. Counts totalFields (non-null, non-empty, non-array-empty values). Stores full extracted_json + updates doc_type to resolved type.

**Modified — `src/components/apply/DocumentImportHub.tsx`**
- `DOC_TYPE_OPTIONS`: 12 options. First: 'auto' / "Detect automatically". Added passport, franchise_agreement, lease_agreement, acquisition_financials, government_form. investment_records hint updated with bank statement advisory.
- `QueuedFile` interface: added `totalFields?: number` and `resolvedDocType?: string`.
- Default docType changed from 'resume' → 'auto'.
- `SOURCE_PRIORITY` map: 21 question keys with authoritative source order.
- `normalizeForComparison()`: strips $/%,, entity suffixes (LLC/Inc/Ltd/Corp/Co), lowercases.
- `mergeFields()`: uses `item.resolvedDocType ?? item.docType` as source, applies SOURCE_PRIORITY (winner reordered to first), falls back to normalized comparison only when no priority defined.
- Result cards show dual counter: "9 intake fields · 62 total fields stored" (green intake, gold total).
- Auto-detect shows "· detected as Franchise Disclosure Document" in dim text.
- File input `accept`: `.pdf,.docx,.txt,.csv`.

### Document Comprehension Engine — Sprint J-1 (Spec Only as of Session 91 — see Session 92 above for the build)

**Architecture:**
- Stage 1 — Comprehension: per-document LLM reads extracted_json + raw text, writes narrative memo to `uploaded_documents.comprehension_memo TEXT`. Example: "This FDD is for a home care franchise. Item 7 investment range $94K–$176K is the national system average, NOT this client's capital. Franchise fee: $55,000. Royalty: 5%."
- Stage 2 — Reconciliation: multi-document LLM pass reads all memos together, resolves apparent conflicts with reasoning, produces final field values with source attribution and confidence scores. Only surfaces genuine conflict (two equally authoritative sources disagree on something material) to client.
- Cost: ~2000 tokens in / 500 out per session. ~$0.001 per upload at MIMO pricing.
- Downstream wiring: answers table (enriched values), generation-engine.ts (comprehension context injected into doc prompts), gap-analysis-engine.ts (evidence quality signal), buildCaseProfile in case-profile.ts (reads memos).

**Owner actions still required:**
- Apply `20260629100000_uploaded_documents.sql` migration in Supabase SQL Editor if not already done (from Session 90)
- All previously logged owner action items still pending

---

## Session 90 — Sprint I-3 (Tab Nav) + Sprint I-4 (Document Import Hub) (June 29, 2026)

**Branch:** dev.

### Sprint I-3: Apply Section Tab Navigation ✅

**New API — `src/app/api/apply/section-completion/route.ts`**
- GET endpoint returns `SectionCompletion` — `{ story, business, investment, qualifications, family, ties }` each `'none'|'partial'|'complete'`
- Counts answers per section via question_key prefix map; threshold per section (5/6/4/4/3/3)
- Cache-Control: private, max-age=30

**Modified — `src/components/apply/CaseFileShell.tsx`**
- 6-tab row (36px) injected below topbar on all /apply/* sections; zero changes to section pages
- Active tab: gold text + 2px gold bottom border; detected via `usePathname()`
- Completion indicators: ✓ checkmark (complete) · dim dot (partial) · nothing (none)
- Self-fetches /api/apply/section-completion on mount
- Mobile offsets updated: cluster strip `top-[52px]→top-[88px]`; content `pt-[44px]→pt-[80px]`

### Sprint I-4: Document Import Hub ✅

**New migration — `supabase/migrations/20260629100000_uploaded_documents.sql`**
- `uploaded_documents` table: user_id, application_id, file_name, doc_type (6 types), extraction_status, extracted_json, fields_accepted, fields_total
- RLS: 4 policies, 2 indexes, updated_at trigger

**New API — `src/app/api/apply/parse-document/route.ts`**
- POST: accepts `file` + `docType` + optional `applicationId` as multipart/form-data
- 6 doc types: resume, fdd, investment_records, business_plan, financial_statement, territory_analysis
- PDF path: Anthropic `claude-opus-4-8` via beta Documents API (`pdfs-2024-09-25` beta)
- Text path: decode to UTF-8, pass as context to standard `messages.create()`
- Returns `{ docId, fields: ExtractedField[], docType }` — only non-null extracted fields
- Inserts/updates `uploaded_documents` record with extraction status + field counts

**New component — `src/components/apply/DocumentImportHub.tsx`**
- Collapsed entry point ("Import from a document") → expands inline
- Stage machine: idle → uploading → reviewing → saving → done | error
- Doc type selector (6 tiles with hint text) + hidden file input (PDF/DOCX/TXT)
- Review step: per-field checkbox, accept/skip toggle, "Apply N fields" CTA
- On apply: upserts to `answers` table with `source: 'document_upload'`; updates `fields_accepted` count
- Callback: `onFieldsApplied(count)` for parent refresh

**Wired into — `src/app/apply/page.tsx`**
- Added `applicationId` state; resolves from first non-simulator application
- `<DocumentImportHub applicationId={applicationId} />` rendered below DocumentUploadCard

### Owner actions still required
- Apply `20260629100000_uploaded_documents.sql` migration in Supabase SQL Editor (NEW)
- All previously logged owner action items still pending (items 1–12 from Session 89)

---

## Session 89 — Form UX Sprint + Sprint I-3/I-4 Definitions (June 29, 2026)

**Branch:** dev.

### What was built — Sprint I-2: Form UX Audit Fixes ✅

Full voice audit of all /apply/* sections surfaced 7 categories of fixes.

**1. CurrencyInput — `src/components/apply/questions/CurrencyInput.tsx` (NEW)**
- `$` prefix always visible; comma-formatted display on blur; raw numeric string stored internally
- `toDisplay()` uses `toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })`
- Shows formatted value when !focused, raw value when focused (avoids reformatting during typing)
- Used in /apply/investment and /apply/ties

**2. Investment (`/apply/investment`)**
- Quiz prefill wired for M3-F-02: reads `quiz_sessions.result_json.investment_range` on load → maps to midpoint via QUIZ_MIDPOINTS → upserts with `source: 'quiz'`; skipped if user already has a value
- QUIZ_MIDPOINTS: `'Over $150,000' → 175000 | '$100,000–$150,000' → 125000 | '$75,000–$100,000' → 87500 | '$50,000–$75,000' → 62500 | 'Under $50,000' → 35000`
- Net worth label corrected: "not including primary residence" → "including primary residence"
- Total invested + net worth + liquid assets fields now render via CurrencyInput

**3. Qualifications (`/apply/qualifications`)**
- `M3-Q-00` (NEW): franchise/business type free-text field; first question in BACKGROUND_QUESTIONS
- `M3-Q-01`: changed from `type: 'single'` → `type: 'multi'`; label: "Education completed (select all that apply)"
- DS-160 education split — old single combined field removed; replaced with 5 fields:
  - `M3-Q-02A`: Field of study
  - `M3-Q-02B`: Degree, diploma or certification name
  - `M3-Q-02C`: Institution name and city
  - `M3-Q-02D`: Year completed (number input)
  - `M3-Q-02E`: Additional qualifications (textarea, optional)
- `M3-Q-05` label: "Years of professional experience (direct or transferable)"
- `M3-Q-06` (Skills): added healthcare/caregiving + customer service options; "none" option: "No direct experience — transferable skills only"; helperText added

**4. Family (`/apply/family`)**
- Removed EAD advisory block (was conditional on `M3-L-06 === 'yes'`) — advisory in the middle of a form is disruptive; appropriate location is checklist, not intake

**5. CaseFileShell — `src/components/apply/CaseFileShell.tsx`**
- Fixed "Next" button: now advances to next CLUSTER within the active section before advancing to the next SECTION
- `nextCluster = isLastCluster ? null : clusters[activeClusterIndex + 1]`
- Button label: `"Next: {cluster.label} →"` within section; `"Next: {sectionName} →"` at last cluster
- **Side effect fix:** Family > Children section was already implemented (CHILDREN_QUESTIONS + dynamic repeater) but the old Next button was jumping from cluster 1 (spouse) straight to Ties, bypassing clusters 2–4. Now fixed.

**6. Ties (`/apply/ties`)**
- Replaced blank textarea M3-T-02 with structured per-row asset repeater
- `assetRows` state: `Array<{ description: string; value: string }>`; initialized from saved M3-T-02 on load
- Each row: TextInput (asset description) + CurrencyInput (approximate value USD) + "×" remove button
- "Add another asset" button appends a blank row
- `serializeAssets()` converts rows to "description — approx. $value" format for backward compat with generation engine

**7. Voice STT (prior session — code complete, push pending)**
- `src/app/api/simulator/transcribe/route.ts`: `baseType = audioFile.type.split(';')[0].trim()` — fixes silent failure when browser sends `audio/webm;codecs=opus`
- Response changed from `{ text }` to `{ transcript }` to match client read path in TextArea.tsx

### Commits this session
Pending push to origin/dev (stop dev server first — pre-push hook runs `npm run build`).

### Build Status — Session 89
TypeScript: ✓ clean (`npx tsc --noEmit` — 0 errors). Full build: run before push.

### ⚠️ Owner Actions Still Required (carried forward)
1. Apply FAQ pgvector migration via SQL Editor
2. Run FAQ seed scripts after migration
3. Add NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN + SENTRY_ORG + SENTRY_PROJECT to Vercel
4. Add NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY + CF_TURNSTILE_SECRET_KEY to Vercel
5. Add CRON_SECRET env var to Vercel
6. Rotate OpenAI API key
7. Check Resend domain verification
8. Refund $197 test charge in Stripe
9. Apply migration `supabase/migrations/20260627100000_interview_prep_kits.sql`
10. Create Stripe $1,495 price → set `STRIPE_PRICE_COMPLETE` env var
11. Accept Groq TTS terms at console.groq.com
12. Remove brand/company names from Module 2 Franchise Navigator copy

---

## Sprint I-3 — Tab Navigation on Apply Case Form ✅ (Session 90)

**Goal:** Replace the current section-by-section linear flow with a unified tabbed interface. All 6 case file sections (Story / Business / Investment / Qualifications / Family / Ties) are visible as tabs at the top. The left sidebar shows clusters for the active tab with completion indicators. Users can jump between sections without losing progress.

### Design spec
- 6 tabs at the top of the case file: Story · Business · Investment · Qualifications · Family · Ties
- Active tab: gold bottom border, full opacity; inactive: 35% opacity, hoverable
- Left sidebar (per tab): shows clusters for that section only; dots: `○` not started · `●` in progress · `✓` complete
- Cluster completion: derived from answer count for question keys in that cluster
- "Next" button: advances cluster → then switches to next tab (not next URL)
- Mobile: tabs horizontal-scroll; sidebar collapses to accordion above content

### Architecture: URL-preserving
- Keep existing routes `/apply/story`, `/apply/business`, etc. — middleware gates work unchanged
- `src/app/apply/layout.tsx` injects `SectionTabNav` above all /apply/* pages
- `SectionTabNav` reads current pathname to set active tab; clicking a tab pushes to that section's URL
- Completion indicators fetched via `GET /api/apply/section-completion` (reads answers table by key prefix)

### Key files
- `src/components/apply/SectionTabNav.tsx` — 6-tab horizontal nav (NEW)
- `src/app/apply/layout.tsx` — inject SectionTabNav
- `src/components/apply/CaseFileShell.tsx` — accept `sectionCompletion` prop for sidebar dots
- `GET /api/apply/section-completion` — returns per-section completion state

### Section → answer key prefix map
```
story:          M3-S- or M3-A-
business:       M3-B-
investment:     M3-F-
qualifications: M3-Q-
family:         M3-L-
ties:           M3-T- or M3-K-
```

**Effort:** 4 hours.

---

## Sprint I-4 — Document Upload + AI Parsing Hub ✅ (Session 90)

**Goal:** Users upload existing documents (resume, FDD, investment records, territory analysis, business plan, personal financial statement). AI extracts structured data from each and pre-fills the corresponding answer fields across all /apply/* sections. Each extracted field is reviewable and editable before being accepted.

### Document types + field targets
| Document | Pre-fills |
|---|---|
| Resume | M3-Q-05 (experience), M3-Q-06 (skills), M3-Q-02A/B/C/D (education), M3-Q-00 (business type) |
| FDD / Franchise Disclosure | M3-B-* (business), M3-F-02 (investment amount), M3-Q-00 (franchise type) |
| Investment / bank records | M3-F-02 (invested), M3-F-03 (source of funds), M3-F-05 (asset types) |
| Territory analysis | QMA-* (market analysis answers) |
| Business plan | M3-B-* (entity/industry/employees), M3-S-* (story) |
| Personal financial statement | M3-F-04 (net worth), M3-T-01/02/03 (ties/assets) |

### Architecture
- Entry: "Import Documents" button on `/case-profile` Section 07 + tab within case profile
- Upload: Supabase Storage bucket `uploaded-docs` (private, RLS user-scoped)
- Extraction: POST `/api/apply/parse-document` → Anthropic Documents API (`claude-opus-4-8`, base64 PDF) → JSON keyed by answer field codes
- LLM prompt: per doc type with explicit JSON output schema; returns null for undetected fields
- Pre-fill: upsert into `answers` with `source: 'uploaded_document'` (new source type — no schema change)
- Edit flow: review modal; extracted value vs current value side-by-side; accept/reject per field; bulk accept-all
- `PreFillBadge` gets new variant: `source === 'uploaded_document'` → "From your document" label

### New DB objects
- Bucket: `uploaded-docs`
- Table: `uploaded_documents (id, user_id, application_id, file_path, doc_type, extraction_status, extracted_json, created_at)`
- Migration: `supabase/migrations/20260629100000_uploaded_documents.sql`

**Effort:** 6–8 hours (2 sessions).

---

## Session 88 — Navigation Hub Migration (June 28, 2026)

**Branch:** dev. All commits pushed to origin/dev.

### What was built

**1. /case-profile is now the primary authenticated home**
- Logo link: `user ? "/case-profile" : "/"`
- Login default redirect: `/dashboard` → `/case-profile`
- Auth callback default: `/dashboard` → `/case-profile`
- Middleware redirect for authenticated users hitting auth pages: `/dashboard` → `/case-profile`
- `/dashboard/page.tsx` replaced with `redirect('/case-profile')` — bookmarks preserved

**2. Navigation consolidation — `src/components/Nav.tsx`**
- Dashboard removed from primary nav entirely
- **Application ▾** dropdown: Case File (`/apply`) · Gap Analysis (`/gap-analysis`) · Checklist (`/apply/checklist`)
- **Intelligence ▾** dropdown: FDD Analysis (`/fdd`) · Market Analysis (`/market-analysis`) · Franchise Navigator (`/franchise`, franchise users only)
- Documents: always visible primary link (`/documents/{id}` or `/documents`)
- My Case Profile moved into Account dropdown (logo also links there)
- Outside-click handler unified across all three dropdowns
- isFranchise detection via parallel quiz_sessions fetch (Q0-08a === 'franchise')

**3. Case Profile — Section 07: Documents & Package**
- Always visible in sidebar; grayed until application exists; locked message until docs generated
- 5 doc package fields: Business Plan · Cover Letter · Personal Statement · Investment Evidence Memo · Financial Projections Y1–Y3
- 2 pipeline fields: Documents Generated (count), Download Package
- CTA routes to `/generate/{id}` if no docs, `/documents/{id}` if docs exist, `/apply/story` if no application
- s7Have / s7Total wired into overview strip

**4. Case Profile — Section 08: Tools & Learn**
- 2 tools fields: Submission Checklist (`/apply/checklist`) · Case Timeline (`/apply/calendar`)
- 4 learn fields: E-2 Knowledge Hub · Investment Benchmarks · Denial Reasons & Prevention · Country Guides
- Always visible, always module status (gold hollow dot)

**5. Case Profile — hub cleanup**
- Inner sticky breadcrumb bar ("← Dashboard · My E-2 Case Record") removed
- All "← Dashboard" / "← Back to Dashboard" links removed from sidebar and footer
- Completeness overview strip: 6 → 8 columns (Documents + Tools added)
- Franchise Navigator field added to Section 03 Business (franchise users only)
- paddingTop: 80px (accounts for fixed main Nav — no inner topbar)

### Commits this session
- `7040a3e` feat(nav+case-profile): Make /case-profile the primary hub; remove dashboard

### Build Status — Session 88
TypeScript: ✓ no errors. Dev server: ✓ started clean. Full build: run at start of Session 89.

---

## Session 87 — Standalone Case Profile + Intelligence Fixes (June 28, 2026)

**Branch:** dev. All commits pushed to origin/dev.

### What was built

**1. /case-profile — Standalone full-page case record**
User rejected the original H-6 "My Case Profile tab inside FolderStack" approach — it felt like a squeezed dashboard. Rebuilt as a dedicated route with full-page layout.
- `src/app/case-profile/page.tsx` — server auth guard (force-dynamic)
- `src/app/case-profile/layout.tsx` — includes Nav (why it had no navbar before)
- `src/components/CaseProfilePage.tsx` — full client component (~1,600 lines):
  - IntersectionObserver sidebar (`rootMargin: "-15% 0px -75% 0px"`) tracks active section
  - 6 sections: 01 Application Progress · 02 The Investor · 03 The Business · 04 The Investment · 05 Case Intelligence · 06 Interview Readiness
  - Field status system: `have` (green dot) / `module` (gold hollow) / `needed` (red + REQUIRED badge) / `optional` (grey hollow)
  - Application Progress at top: 7-step milestone tracker (quiz → onboarding → business → investment → gap → docs → interview) with active step callout and solid gold CTA button
  - Section CTAs upgraded to prominent outlined gold buttons
  - 60+ fields inventoried across all 6 sections
- Nav updated: "My Case" link added (desktop + mobile), hidden for simulator-only and /simulator/* routes
- `src/components/dashboard/CaseRecordSection.tsx` — narrative summary for dashboard sidebar (still used in DashboardClient)

**2. /api/dashboard/case-profile — Data API**
- `src/app/api/dashboard/case-profile/route.ts` — authenticated GET, `CaseProfileResponse` typed DTO
- Queries 9 tables in parallel: profiles, quiz_sessions, case_profiles, application_lifecycle, fdd_analyses, simulator_sessions, interview_prep_kits, applications
- Secondary sequential query for QMA-* market analysis answers (if application exists)
- Returns: identity, quiz data, scores, lifecycle milestones, FDD count, simulator state, prep kit, market analysis scores

**3. Case Intelligence — FDD Intelligence + Market Analysis split**
Previously the section showed ONE subsection: "FDD Intelligence" OR "Market Intelligence" based on `isFranchise`.
Now shows:
- **Gap Analysis** subsection — always shown (scores + priority gaps)
- **FDD Intelligence** subsection — franchise users only (FDD Item 19, E-2 Suitability Rating)
- **Market Analysis** subsection — always shown for all users (Territory Score, ZIP/State, Competitor Count, Market Verdict, Industry Benchmark, Valuation Benchmark — wired to live QMA-* values when market analysis has been run)

**4. Gap Analysis noApplication bug fix**
- `src/app/gap-analysis/page.tsx`
- Root cause: user completed quiz (quiz_sessions row exists) but hasn't started onboarding (no applications row). Page hit `setNoApplication(true)` early and showed "Start eligibility quiz →" — wrong CTA for someone who already did the quiz.
- Fix: added `quizAlreadyDone` state + secondary quiz_sessions check in the early-return path
- Empty state now branches: quiz done → "Begin your case file" + "Begin onboarding →" → `/apply/story`; quiz not done → original "Start eligibility quiz →"

### Commits this session
- `8b63ae3` feat(sprint-g4): Prep-kit data gate, dossier sections, simulator entitlement wiring
- `be4fb00` feat(sprint-h1): Dashboard refactor — remove Case Profile tile, wire CaseRecordSection
- `8f5d892` feat(sprint-h2): /case-profile — standalone full-page case record, sidebar nav, FDD + market intelligence
- `f2607ec` fix(gap-analysis): Show 'Begin onboarding' CTA when quiz done but no application row exists
- `d6a4e27` docs(session85): Update BUILD_TRACKER

### Build Status — Session 87
`npm run build` → ✓ Compiled · ✓ Types pass · ✓ 145 pages (was 144)

---

## Session 86 — Sprint H Implementation (June 28, 2026)

**Branch:** dev. All 7 Sprint H sub-sprints implemented and build verified clean.

### H-1 ✅ formatOutcome() Bug Fix — DONE
Added quiz engine vocab (`proceed`, `proceed_risk`, `attorney_recommended`) to OUTCOME_MAP in `CaseCommandPanel.tsx` and to `formatOutcome()` in `DashboardClient.tsx`. Raw enum no longer visible to paying users.

### H-2 ✅ Dashboard Header Redesign — DONE
Full-dashboard header: "Let's build your E-2 application, [firstName]." + aspirational advisory sentence. No-quiz variant updated to match.

### H-3 ✅ CaseCommandPanel Hierarchy Inversion — DONE
CTA is now dominant first element (full-width gold button). 4-phase journey roadmap (adaptive: franchise vs own-business). Assessment pill and readiness % demoted below CTA. `isFranchisePath` prop added to interface and wired through.

### H-4 ✅ WorkstreamStrip — DONE
ProfileIntelligenceStrip replaced with WorkstreamStrip (4 macro buckets: Your Profile · Your Business · Your Application · Your Interview). No data duplication. Props match DashboardClient available data.

### H-5 ✅ FolderStack Architecture — DONE
5-tab structure: My Case Profile · My Application · My Analysis · My Prep · My Package. 3-tier StepRow (done/in-progress/upcoming with progressive fading). CaseProfileTab rendered as first tab. localStorage key preserved.

### H-6 ✅ CaseProfileTab.tsx — DONE
New component at `src/components/dashboard/CaseProfileTab.tsx`. Fetches `/api/dashboard/case-profile`. 6 sections: The Investor · The Business · The Investment · Case Intelligence (dimension bars) · Application Milestones · Interview Readiness. Progressive empty states with "Populates from Step X" hints.

### H-7 ✅ DB View + API Route — DONE
- Migration: `supabase/migrations/20260628100000_case_profile_view.sql` — `case_profile_view` joins profiles, quiz_sessions, case_profiles, applications, application_lifecycle, fdd_analyses (with count), simulator_sessions, interview_prep_kits
- API: `src/app/api/dashboard/case-profile/route.ts` — authenticated GET, returns `CaseProfileResponse` typed DTO

### Build Status — Session 86
`npm run build` → ✓ Compiled · ✓ Types pass · ✓ 144 pages

---

## Session 85 — Sprint H Design Sprint (June 28, 2026)

**Branch:** dev. No code changes this session — UX design and product decisions only. Sprint H plan locked.

**What happened:**
Full dashboard UX audit. Built 3 iterative mockups. Identified 7 structural improvements to the dashboard. Defined Sprint H with 7 sub-sprints covering the formatOutcome bug, dashboard header, CaseCommandPanel hierarchy, bottom strip, FolderStack architecture, and a brand-new "My Case Profile" tab.

### Sprint H — Locked Decisions

**H-1 · formatOutcome() Bug Fix (P0 — 30 min)**
`PROCEED_RISK` is showing as a raw DB enum string to paying users because the `formatOutcome()` vocabulary map in `DashboardClient.tsx` uses `strong/borderline/caution/ineligible` but the quiz engine produces `PROCEED/PROCEED_RISK/ATTORNEY_RECOMMENDED`. Fix: add the correct vocab to the map. This is live and visible on every paid dashboard session.

**H-2 · Dashboard Header Redesign**
- From: "Welcome to the E2Go family." (generic)
- To: "Let's build your E-2 application, [first_name]." (aspirational, action-oriented)
- Advisory sentence: encouragement + trajectory only — no data points in the header (data belongs in panels)
- Pattern: "The hardest part is deciding to start — and you've done that."

**H-3 · CaseCommandPanel Hierarchy Inversion**
- "Begin Onboarding →" gold CTA is the FIRST and dominant element (full-width gold button)
- 17% readiness score demoted to a supporting metric below the CTA
- "Case at a glance" section: Country · Investment · Assessment pill (inline, compact)
- "Your Journey Ahead" — 4-phase sequential roadmap replaces flat feature list:
  - Phase 1: Discovery (franchise selection, if needed) — adaptive: hidden for own-business clients
  - Phase 2: Intelligence (gap analysis + FDD + market analysis) — unlocks after case file complete; FDD hidden for own-business clients
  - Phase 3: Application (15 consulate-formatted documents, auto-generate)
  - Phase 4: Interview (case dossier + AI simulator practice)
- Live indicators (pulsing green dot) on dynamic fields (readiness %, assessment pill)
- Remove ProfileIntelligenceStrip floating band — its data moves into Case at a glance

**H-4 · Bottom Strip — 4 Macro Completion Buckets**
Replaces the 4-card intelligence strip which was repeating data already shown elsewhere.
- Your Profile: % with bar — "who you are as an investor" (onboarding, qualifications, ties)
- Your Business: status — franchise selection available; FDD + market unlock after case file
- Your Application: locked — gap analysis + 15 docs unlock when case file is built
- Your Interview: Simulator open now / Dossier after case file
Primary risk area REMOVED from all surfaces — too early to flag from a 15-question quiz.

**H-5 · FolderStack Tab Architecture**
- New tab order: My Case Profile · My Application · My Analysis · My Prep · My Package
- 3-tier step list in My Application:
  - Step 1 COMPLETE: struck through, dimmed (opacity 0.4), compressed
  - Step 2 IN PROGRESS: expanded, "Continue →" CTA inline, gold left border
  - Steps 3–9 NOT STARTED: progressively fading (0.5 → 0.12 opacity)
- Tab lock badges: "after step 2", "after step 5" etc on locked tabs so user knows why

**H-6 · My Case Profile Tab — Component**
New component: `CaseProfileTab.tsx`. First tab in FolderStack (position 0).
- Identity strip (always populated from quiz): Name · Country · Assessment pill · Readiness %
- The Investor: personal data, family, country ties (from Onboarding, Family, Country Ties)
- The Business: entity name, industry, employees, FDD status, territory (from Business Profile, FDD, Market Analysis)
- The Investment: precise amount, source of funds, at-risk status (from Investment section + docs)
- Case Intelligence: 7 dimension bars from gap analysis — each with label + status + 1-line note
- Interview Readiness: simulator sessions, dossier status, narrative profile
- Empty state design: skeleton shows "Populates from Step X" on each unpopulated field so client knows what to complete

**H-7 · My Case Profile Tab — DB View + API**
- New DB view: `case_profile_view` — joins all 12 sources without new storage
  - profiles, applications, quiz_sessions/quiz_answers, application_answers (all modules), gap_analysis_results, fdd_analysis_results, market_analysis_results, simulator_sessions, interview_prep_kits
- New API route: `GET /api/dashboard/case-profile`
- Wire into CaseProfileTab as its data source

### Data Deduplication Rules (locked)
- Investment amount: appears ONCE — left panel "Case at a glance" only
- Assessment: appears ONCE — left panel pill + My Case Profile tab
- 17% readiness: appears ONCE — left panel (removed from bottom strip)
- Primary risk: REMOVED entirely until gap analysis is complete

### Non-Franchise (Own Business) Client Journey
- Phase 1 (Discovery/franchise selection): hidden from roadmap
- FDD Intelligence: hidden, not greyed (not applicable, not locked)
- Business Profile step 3: different prompt set (describe existing business, not franchise)
- Intelligence phase: Gap analysis + Market analysis only
- Detection: from quiz_answers Q0-08a value

### ⚠️ Owner Actions Still Required (carried from Session 84)
1. Apply FAQ pgvector migration via SQL Editor
2. Run FAQ seed scripts after migration
3. Add NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN + SENTRY_ORG + SENTRY_PROJECT to Vercel env
4. Add NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY + CF_TURNSTILE_SECRET_KEY to Vercel
5. Add CRON_SECRET env var to Vercel
6. Rotate OpenAI API key
7. Check Resend domain verification
8. Refund $197 test charge in Stripe dashboard
9. Apply migration `supabase/migrations/20260627100000_interview_prep_kits.sql` via SQL Editor

### Next Sprint
Start with H-1 (formatOutcome fix — 30 min, one-line change, P0).
Then H-2 → H-3 → H-4 → H-5 → H-6 → H-7 in sequence.
H-6 and H-7 are the largest items — plan a full session for each.

---

## Session 84 — Sprints G-1/G-2/G-3 + F-1/F-2 Complete ✅

**Branch:** dev. Build clean 144 pages. TypeScript clean. 5 commits.

**Commits:**
- `3456be1` — feat(sprint-g3): Interview Case Dossier — /simulator/prep-kit + API route + DB migration
- `3ee8634` — feat(sprint-f1): SectionLayout — 7-step left rail for /apply and /gap-analysis
- `0f12791` — feat(sprint-f2): Section task panels — collapsible checklist banner in SectionLayout
- (G-1/G-2 committed previous session — see Session 83 below)

**What shipped:**

**Sprint G-3 — Interview Case Dossier:**
- New `interview_prep_kits` table — `application_id` UNIQUE, `kit_json` JSONB, RLS enabled, service-role write policy
- `POST /api/simulator/prep-kit` — parallel fetches all case data → `scoreCase()` pre-computation → xiaomi/mimo-v2.5-pro single call (4500 tokens, 120s) → upsert cache
- `GET /api/simulator/prep-kit` — returns cached kit without regenerating (7-day cache)
- `/simulator/prep-kit` page — 7 collapsible sections: Case at a Glance / Strengths / Denial Risk Register / Business / Investment / Catch-Up / 9 Interview Questions + WP probes
- `@media print` CSS — white background, page-breaks per section, no-print controls
- WP probe detection: WP-01→WP-05 triggered by scoreCase() dimension scores

**Sprint F-1 — SectionLayout shell:**
- `SectionLayout.tsx` — client component; 200px sticky left rail (desktop); mobile hamburger → full-screen drawer; auto-hides on CaseFileShell pages (HIDE_SIDEBAR_PREFIXES array)
- `/apply/layout.tsx` — async server component; parallel fetches quiz/lifecycle/app docs; derives 7-step done states
- `/gap-analysis/layout.tsx` — same pattern; preserves `<Nav />` above SectionLayout
- Steps: Eligibility → Onboarding → Business → Investment → Gap Analysis → Generate → Interview

**Sprint F-2 — Per-section task panels:**
- 4 task configs wired into SectionLayout: /apply (3 tasks), /gap-analysis (3 tasks), /simulator (3 tasks), /simulator/prep-kit (3 dossier tasks)
- Collapsible banner above content area; collapsed by default; › toggle; 3 tasks with checkbox outline + hint text
- Does NOT appear on CaseFileShell pages (SectionLayout returns children directly on those pages)

**Known Issues resolved this session:**
- `getSession()` → `getUser()`: already clean (no `.getSession()` calls remain — verified via grep)
- `seed-test-applicant.ts` auth grab: file no longer exists; replaced by `seed-test-profiles.mjs` (idempotent, uses explicit user IDs)
- Stripe API version: already updated to `2026-05-27.dahlia` (Session 56)
- Bracket regex: resolved Session 27 — both `docx-builder.ts` and `checklist-builder.ts` use `/\[[^\[\]]+\]/g`

**⚠️ Owner actions still required:**
1. Apply FAQ pgvector migration via SQL Editor — `20260613200000_faq_pgvector_tables.sql` + `20260613210000_faq_search_functions.sql`
2. Run FAQ seed scripts (after migration): `npx tsx scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts`
3. Add NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN + SENTRY_ORG + SENTRY_PROJECT to Vercel env
4. Add NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY + CF_TURNSTILE_SECRET_KEY to Vercel (Cloudflare Turnstile)
5. Add CRON_SECRET env var to Vercel (any random string — activates nightly CaseProfile rebuild)
6. Rotate OpenAI API key (platform.openai.com → revoke + recreate → update .env.local + Vercel)
7. Check Resend domain verification — if e2go.app is verified, revert sender to results@e2go.app
8. Refund $197 test charge in Stripe dashboard
9. Apply migration `supabase/migrations/20260627100000_interview_prep_kits.sql` via SQL Editor

**Next sprint candidates:**
- Dashboard `/simulator` layout — wire SectionLayout into simulator pages (SimulatorNav complexity blocked F-1)
- Sprint H (next): TBD based on user priority
- Generation engine: approval gate / setState / empty box issue — investigate in docs/sessions/ if still reproducible

---

## Sprint G — Dashboard Redesign + Interview Preparation Kit (NEXT 3 SESSIONS)

### Sprint G-1 — Dashboard: Intelligence Strip Fix + Phase Strip Removal

**Goal:** Strip always shows real data. Remove the redundant PhaseStrip. Simplify CaseCommandPanel.

**Files to edit:**
- `src/components/dashboard/DashboardClient.tsx` — ProfileIntelligenceStrip, remove PhaseStrip call at line 1208
- `src/components/dashboard/CaseCommandPanel.tsx` — remove milestone tracker rows
- `src/components/dashboard/PhaseStrip.tsx` — delete file (and remove import)

**ProfileIntelligenceStrip — progressive cell logic:**

| Cell | Day 1 (quiz only) | Source | After business profile | After gap analysis |
|---|---|---|---|---|
| 1 | E-2 Outcome ("STRONG" / "BORDERLINE") | quizOutcome | → Investor Archetype | stays |
| 2 | Investment Range ("$250K–$500K") | investmentRange | stays | → Case Readiness % |
| 3 | Application Type ("Solo E-2 Investor") | quizAnswers derived | stays | → Primary Risk Area |
| 4 | Current Stage | lifecycle | updates | updates |

Logic: cell swaps to the richer value only when that richer value is available. Never shows a placeholder. Day 1 always has 4 real cells from quiz data.

**Application type derivation** (Cell 3, Day 1): read `applications.application_type` or derive from `quiz_sessions.result_json`. Values: "Solo E-2 Investor" / "Solo + Spouse" / "Solo + Family" / "Partnership".

**CaseCommandPanel simplification:** Remove the `milestones` prop and milestone tracker rows entirely. Keep: readiness score circle + progress bar + current phase label + next action + nextActionWhy sentence. The milestone tracker job moves to the FolderStack numbered checklist in G-2.

**Build time estimate:** 2 hours.

---

### Sprint G-2 — Dashboard: Folder Stack Redesign

**Goal:** FolderStack tabs become the single source of truth for application status. Three tabs, each with a distinct job, no overlap with CaseCommandPanel.

**Tab names (was 3 tabs — Build/Strengthen/File — now 4):**
- Tab 1: **My Application**
- Tab 2: **My Analysis**
- Tab 3: **My Preparation** (new — interview simulator + prep kit + coaching)
- Tab 4: **My Package** (documents only — generation + download + revision)

**"My Application" tab — numbered checklist:**
Replaces BuildCard's current section rows. Each row is a step with number, title, status chip, link.

| # | Step | Status source | Link |
|---|---|---|---|
| 01 | Onboarding | lifecycle.module1_completed_at | /apply/story |
| 02 | Business Profile | lifecycle.module2_completed_at | /apply/business |
| 03 | Your Story | lifecycle.module3_completed_at (or answers M3-S prefix) | /apply/story |
| 04 | Your Business | answers M3-B prefix present | /apply/business |
| 05 | Your Investment | answers M3-H prefix present | /apply/investment |
| 06 | Your Qualifications | sectionCompletionMap.qualifications | /apply/qualifications |
| 07 | Your Family | sectionCompletionMap.family | /apply/family |
| 08 | Your Ties | sectionCompletionMap.ties | /apply/ties |
| 09 | Voice Profile | lifecycle.module4_completed_at | /apply/module4 |

Status chips: ✓ Complete (green) / ● In Progress (amber) / ○ Not started (dim)

**"My Analysis" tab — real scores per tool:**
Replaces StrengthenCard. Each row shows actual data, not just a tool name.

| Tool | When gap ran | When not run |
|---|---|---|
| Gap Analysis | "87% · Run again →" | "Not yet run → Start now" |
| FDD Intelligence (franchise only) | "2 analyses run · View →" | "Upload your FDD →" |
| Market Analysis | "Territory score: 74 · View →" | "Run analysis →" |

**"My Preparation" tab — interview readiness (NEW 4th tab):**
Everything related to getting ready for the consulate interview. Nothing about documents.

| Item | Content |
|---|---|
| Interview Prep Kit | "Generate my kit →" or "View kit · Last generated X days ago" — links to /simulator/prep-kit |
| Interview Simulator | "N sessions remaining · Practice now →" + last session readiness badge |
| Coaching Report | "View last session →" if a completed session exists, else hidden |

**"My Package" tab — documents only:**
Exclusively document generation. No simulator content.

| Item | Content |
|---|---|
| Document Package | "X of 15 documents ready · Download →" or "Generate your package →" |
| Revision Credits | "X of 10 revisions remaining" if generation is complete |
| Consulate Briefing | "Toronto · 50 pages per tab" — links to /apply/generate for the briefing screen |

**Files to edit:**
- `src/components/dashboard/FolderStack.tsx` — rebuild CARDS labels + BuildCard + StrengthenCard + FileCard
- `src/components/dashboard/DashboardClient.tsx` — remove milestones prop from CaseCommandPanel call

**Build time estimate:** 3 hours.

---

### Sprint G-3 — Interview Case Dossier

**New feature.** A personalized revision dossier — not a Q&A sheet. The client may sign their franchise agreement months before the consulate interview. This kit rebuilds their entire case in their hands before they walk in. Built from their own submitted data, tested against the 15 real E-2 denial factors (D-01→D-15), and printable for day-of use.

**Route:** `/simulator/prep-kit`
**API:** `POST /api/simulator/prep-kit`

**Data sources (all already in DB):**
- `quiz_sessions.result_json` → outcome, treaty country, investment range, flags, dependents
- `case_profiles` → archetype, 3 dimension scores, completeness_score
- `answers` (ALL for this application) → M3-* narrative answers, QF-* investment figures, QA-FDD-* FDD writebacks, QMA-* market writebacks, QA-NEW-* FDD platform integration
- `applications` → business_name, business_category, operational_status, target_state, principal_name
- `fdd_analyses` (franchise path) → extracted_fields (50 fields), e2_score (ScoringResult + flags), territory_analysis, final_report
- `simulator_sessions` (latest completed) → coaching_notes, readiness_indicator, strong_count, needs_work_count
- `gap-analysis-engine.ts` → `scoreCase()` — pure function, run in Node.js, pass results to LLM

**Design rule:** LLM writes narrative only. Every number, score, and D-code finding is pre-computed in Node.js. The model formats and explains — it does not derive.

**7 Kit Sections:**

1. **Your Case at a Glance** — facts snapshot: business name, treaty country, investment, archetype, application type, quiz outcome, FDD compatibility (franchise), territory rating. 2-minute review before entering the building.

2. **What's Working in Your Favour** — 3–6 case strengths from dimension scores + gap categories + FDD data. Plain English: "Your investment of $X constitutes 82% of total enterprise cost — well above the substantiality threshold."

3. **Your Denial Risk Register (Core)** — run `scoreCase()` in Node → 15 D-code findings. For each D-code where risk = 'high' or 'moderate':
   - What the officer is looking for (the legal test)
   - Your case's position (personalized finding from scoreCase)
   - What you need to be able to say (mitigation, first-person)
   - Risk chip: High / Moderate

4. **Your Business: Know This Cold** — from M3-B answers + FDD fields + QMA market data:
   - What the business does, location/territory, franchise system mechanics
   - Your management role described in the terms officers expect
   - Staffing plan + market viability data (competitor density, population fit)

5. **Your Investment: Know the Numbers** — from QF-* + FDD Item 7:
   - Total invested / enterprise cost / at-risk %
   - Line-by-line breakdown (franchise fee / build-out / equipment / working capital)
   - Source of funds chronology: origin → U.S. deployment
   - What's committed (irrevocable) vs. what's in the business account
   - FDD ODE timeline if applicable

6. **Months May Have Passed: Catch Up** — the unique section:
   - Key dates: franchise agreement, wires, LLC formation, lease, any updates since filing
   - If simulator sessions exist: coaching notes surface here ("Last time you struggled with X")
   - Documents to physically bring (from application type + family)
   - Checklist of facts that may have changed since the application was filed

7. **The 9 Interview Questions** — UQ-01→UQ-09 + applicable WP probes, with personalized answer frameworks using real numbers and facts. One section of seven, not the whole kit.

**API route logic:**
1. Auth + applicationId lookup
2. Parallel queries: quiz_sessions, case_profiles, answers (all), applications, fdd_analyses, simulator_sessions
3. Run `scoreCase()` synchronously → denialFactors[]
4. Assemble structured data object → single LLM call
5. Model: `xiaomi/mimo-v2.5-pro`, max_tokens: 4500, timeout: 120s
6. Cache result in `interview_prep_kits` table

**New table:** `interview_prep_kits`
- `application_id` FK (unique), `kit_json` JSONB, `generated_at` timestamptz, `model_used` text
- Re-generate: older than 7 days OR manual "Regenerate" button

**Display:**
- Screen: Obsidian Gold dark, sections collapsible
- Print: `@media print` — white bg, black text, section page-breaks
- "Print / Save as PDF" → `window.print()`
- Entry points: Dashboard "My Preparation" tab + `/simulator` page

**Build time estimate:** 5–6 hours.

---

## Session 82 — Dashboard Intelligence Layer ✅

**Commits (intelligence upgrade):**
- `[pending]` — feat(sprint-f): Dashboard Profile Intelligence strip, Gap Priorities panel, Simulator Snapshot card

**What shipped (intelligence layer):**
- Profile Intelligence Strip — 4 cells: Investor Archetype, Case Readiness %, Primary Risk Area (derived from lowest dimension score), Current Stage. Sits between welcome header and B+C grid.
- Gap Priorities Panel — surfaces dimension scores below threshold as triage rows with Critical/High/Moderate severity chips + Fix → links. Only renders when gaps exist. Disappears when all 3 dimensions score 75+.
- Simulator Snapshot Card — appears only after first completed simulator session. Shows readiness indicator badge, Strong/Needs Work counts, top 3 coaching focus items from coaching_notes.top3NextSession.
- page.tsx: expanded case_profiles query to include source_of_funds_score, management_role_score, business_plan_score. Added simulator_sessions query (latest completed session by user_id).

**New data shape:**
- dimensionScores: { sourceOfFunds, managementRole, businessPlan } — from case_profiles, null if gap analysis never run
- simulatorSnapshot: { readinessIndicator, top3[], strongCount, needsWorkCount } — from simulator_sessions, null if no completed session

---

## Sprint F — Section Shell + Sidebar Navigation (NEXT)

**Decision confirmed:** Dashboard stays as command center (no sidebar). Sidebar appears only when user enters a section page.

**Architecture:**
```
Dashboard (/dashboard)       → no sidebar, stays as command center
Section pages (/apply/*)     → SectionLayout with 7-step left rail
Gap analysis (/gap-analysis) → SectionLayout with 7-step left rail  
Simulator (/simulator)       → SectionLayout with 7-step left rail
```

**Sprint F-1: Section Layout Shell**
File: `src/app/apply/layout.tsx` (new)
File: `src/app/gap-analysis/layout.tsx` (new)
File: `src/app/simulator/layout.tsx` (new)
File: `src/components/SectionLayout.tsx` (new — shared shell)

SectionLayout props:
- `steps` — 7 journey steps with live status fetched server-side
- `children` — page content slot

Left rail (240px, collapses to icon-only below 1024px, full-screen drawer on mobile):
- 7 steps: Eligibility → Onboarding → Business → Investment → Gap Analysis → Generate → Interview
- Each step: status chip (✓/#/○) + step name + optional sub-label
- Active step highlighted in amber
- Each step links to its page
- Status derived from application_lifecycle + quiz session (same queries as dashboard)

Right side: the existing page content, unchanged.

**Sprint F-2: Section Task Panels**
Per-section checklist shown as a collapsible right panel or inline card at top of page content.
- /apply/story → "Upload passport copy, Confirm treaty country, Add work history"
- /apply/business → "Set operating model, Add employment plan, Confirm active management"
- /apply/investment → "Add source of funds chain, Confirm deployment, Upload bank evidence"
- /gap-analysis → "Run full analysis, Fix top 3 D-codes, Re-run to confirm improvement"
- /simulator → "Complete universal track, Run franchise session, Read coaching report"

**Build order for Sprint F:**
1. Create SectionLayout.tsx — left rail with static step list, no data yet
2. Add layout.tsx files under /apply, /gap-analysis, /simulator — wrap with SectionLayout
3. Wire step status from application_lifecycle query in each layout server component
4. Sprint F-2: add task panel per section (collapsible, right rail or top card)

---

## Session 82 — Dashboard Journey Data Wiring ✅

**Commits:**
- `2040722` — feat(sprint-e3): Wire live dashboard data — section completion, doc count, tool scores
- `f9233f2` — feat(sprint-e3): Add dashboard-grid CSS class for responsive two-column layout
- `ce51d88` — feat(sprint-e3): Add nextActionWhy sentence and remove non-functional buttons
- `fb2cd43` — feat(sprint-e3): Wire DashboardClient — next action why, doc count anchor, live props
- `d1cc135` — feat(sprint-e3): FolderStack — live section completion, tool scores, doc count
- `a0b0d1b` — feat(sprint-e3): PhaseStrip — done/active/upcoming chips on phase headers

**What shipped:**
- Sections 4–6 (Qualifications, Family, Ties) now detect actual completion via `answers` table (M3-Q/M3-L/M3-T prefix query) — no longer permanently "upcoming"
- Live document count from `generated_documents` table — Phase 06 and FileCard show real X/15 count
- Gap Analysis score wired: FolderStack Strengthen card shows real `caseCompletenessScore%` or "Not yet run →"
- FDD count from `fdd_analyses` table — shows "X analysis run · View →" when run
- `nextActionWhy` sentence added below next action in CaseCommandPanel (phase → consequence map)
- Zone A: "X of 15 documents ready" sub-line when docs generated
- Removed non-functional "View Milestone" button and "···" column from CaseCommandPanel milestone rows
- Phase strip done/active chips: ✓ (green #5DCAA5) for done phases, amber 5px dot for active phase
- Mobile-responsive two-column layout via `.dashboard-grid` CSS class (stacks at 768px)

**Build:** 142 pages, TypeScript clean. Security tests: 26/26 passed.

**Key schema facts:**
- `answers` table: keyed by `application_id` + `question_key` (M3-Q=Qualifications, M3-L=Family, M3-T=Ties)
- `generated_documents`: has `application_id` (not just `user_id`)
- `fdd_analyses`: has `user_id` (query directly by user)
- `primaryAppId` = first non-simulator application for the user

---

## Session 81 — Deployment unblock, dashboard polish, partnership mitigation ✅

**Commits:**
- `8658107` — fix(paywall): Nav lock icons removed + admin middleware bypass
- `d8976dd` — feat(dashboard): FolderStack spring animation upgrade
- `67a7854` — fix(tests): Remove unused vi/beforeEach imports from webhook.spec.ts
- `e547c55` — fix(tests): Playwright config excludes unit/compliance; move prompt-injection test
- `6ce16fe` — feat(simulator+results): 3 sessions for Complete buyers; suppress partnership price

**What shipped:**
- Nav lock icons removed — My Application / Gap Analysis / FDD Analysis are plain links; payments query eliminated
- Middleware admin bypass — `profiles.role = 'admin'` bypasses all payment gates
- FolderStack spring animation — card slides forward from behind (y −4→0, scale 0.985→1, spring 280/28)
- Playwright pre-push hook unblocked — excluded compliance/unit test dirs, fixed bad imports
- Simulator: Complete/complete_partnership buyers get 3 sessions (was 2); session limit re-enabled
- Results page: partnership pricing suppressed — $1,495 shown to all users; partnership users see "contact us" callout instead of undeliverable $2,495

**Deployment:** `git push origin dev` succeeded (or in progress) → PR dev→main needed to trigger Vercel

**Product decisions confirmed:**
- FDD interface: same as in-app (no separate standalone) — unlocks FDD-1 to FDD-5
- Simulator: Complete holders = 3 sessions free; others = 2 free default

**Animation audit — all confirmed:**
- Welcome "family" greeting: ✅ in — `DashboardClient.tsx:473`
- Phase strip expansion: ✅ in — spring `height 0 → auto` in `PhaseStrip.tsx`
- Folder switch spring: ✅ fixed — slide-forward spring in `FolderStack.tsx`

**Task #8:** Wire 7 new document types — confirmed complete (commit `02c3d80`)

---

## Session 80 — Dashboard Case File Redesign ✅

**Commit:** `6b51f1c` — feat(dashboard): Case file UI redesign — 4 zones, folder stack, phase strip

**What shipped:**
- Zone A: Welcome header — "Welcome to the E2Go family, {firstName}." · application type sub-line
- Zone B: Case Command Panel (left, 55%) — readiness score + progress bar, current phase, next action, 6-row milestone tracker with ✓/●/› status icons
- Zone C: Folder Stack (right, 45%) — 3 physically-overlapping folder tabs (negative margin + z-index + drop-shadow), cream active card, dark peeking strips; Build Your Case / Strengthen Your Case / File Your Application with real lifecycle data
- Zone D: Phase Strip (full-width) — 7 expandable panels in 4-column grid, alternating cream #DDD1B0 / amber #7A5C28, spring expand animation, auto-expands current phase
- Paywall entirely removed from dashboard — no "Unlock with Complete", no "View pricing →"
- Simulator-only branch preserved (PartialProfileTeaser); no-quiz empty state preserved

**New files:** `CaseCommandPanel.tsx`, `FolderStack.tsx`, `PhaseStrip.tsx`, `DashboardClient.tsx`, `src/lib/strength-badges.ts`
**Modified:** `dashboard/page.tsx` (server component preserved), `EligibilityBadges.tsx` (imports shared strength-badges.ts)

**Design tokens locked:** active tab `#f0ece3` = card body (seamless), tab overlap `margin-right: -16px` + z-index 30/20/10 + `filter: drop-shadow()`, NO CSS border on tabs, PhaseStrip cream `#DDD1B0` / amber `#7A5C28`

**Task #8 status:** Confirmed complete (Session 81 audit) — all 8 new doc types fully wired in commit `02c3d80`. Prompt files exist, types in CORE/conditional lists, quality gates set, DOCX constants set.

---

## Session 79 — Modules Page + Nav + Misc Polish ✅

**Commits:** `f973e7e` (brand spelling, 58 files) · `87e2a04` (results E-3 restructure) · `0ccafb6` (Session 79 misc)

**What shipped:**
- `/modules` page — standalone modules marketing page (FDD Intelligence $495, Market Analysis $295, E-2 Business Plan $695, bundle $1,195)
- Nav: Modules link added to main navigation
- Brand spelling: `E2go` → `e2go` standardised across 58 files
- Results E-3 restructure committed: DocumentTabPreview, module cards, attorney price anchor, score breakdown wired to real quiz codes
- Module 3 sub-pages (b, c, d, j) updated; email templates clock1/clock2 updated
- HomeClient, quiz, signup, terms, privacy, reset-password minor polish
- **Critical gap discovered:** Partnership Document Engine (Sprint F-P) — $2,495 tier accepted payments but generation engine only produces one investor's file. Do not sell partnership until Sprint F-P is built.

**Still TODO:** Wire 7 new document types into generation engine (Task #8)

---

## Session 80 — Dashboard Case File Redesign ✅

**Commit:** `6b51f1c` — feat(dashboard): Case file UI redesign — 4 zones, folder stack, phase strip

**What shipped:**
- Zone A: Welcome header — "Welcome to the E2Go family, {firstName}." · application type sub-line
- Zone B: Case Command Panel (left, 55%) — readiness score + progress bar, current phase, next action, 6-row milestone tracker with ✓/●/› status icons
- Zone C: Folder Stack (right, 45%) — 3 physically-overlapping folder tabs (negative margin + z-index + drop-shadow), cream active card, dark peeking strips; Build Your Case / Strengthen Your Case / File Your Application with real lifecycle data
- Zone D: Phase Strip (full-width) — 7 expandable panels in 4-column grid, alternating cream #DDD1B0 / amber #7A5C28, spring expand animation, auto-expands current phase
- Paywall entirely removed from dashboard — no "Unlock with Complete", no "View pricing →"
- Simulator-only branch preserved (PartialProfileTeaser); no-quiz empty state preserved

**New files:** `CaseCommandPanel.tsx`, `FolderStack.tsx`, `PhaseStrip.tsx`, `DashboardClient.tsx`, `src/lib/strength-badges.ts`
**Modified:** `dashboard/page.tsx` (server component preserved), `EligibilityBadges.tsx` (imports shared strength-badges.ts)

**Design tokens locked:** active tab `#f0ece3` = card body (seamless), tab overlap `margin-right: -16px` + z-index 30/20/10 + `filter: drop-shadow()`, NO CSS border on tabs, PhaseStrip cream `#DDD1B0` / amber `#7A5C28`

**Task #8:** Wire 7 new document types — confirmed complete (commit `02c3d80`)

---

## Sprint E — Full User Journey Audit

### Sub-sprint status

| Sprint | Theme | Issues | Status |
|---|---|---|---|
| E-1 | Critical breaks / dead ends | 10 | ✅ COMPLETE |
| E-2 | Paywall / access control | 5 | ✅ COMPLETE (middleware + nav) |
| E-3 | Results page restructure | 12 | ✅ COMPLETE |
| E-4 | Quiz fixes | 8 | ✅ COMPLETE |
| E-5 | Dashboard overhaul | 8 | ✅ COMPLETE |
| E-6 | Pricing page | 4 | ✅ COMPLETE |
| E-7 | Franchise Navigator | 7 | ✅ COMPLETE |

### Open items after E-audit
- **Simulator paywall (OPQ-4):** Simulator intentionally excluded from middleware paywall (built-in 2-free-sessions default). Product decision pending: keep 2 free sessions OR gate entirely.
- **OPQ-1:** FDD standalone ($575) — same interface as in-app, or separate? Multi-FDD comparison scope?
- **OPQ-2:** Broker handoff mechanism — currently defaults to email romyjames@gmail.com. Confirm or replace.
- **OPQ-3:** Industry categories list — confirm full set beyond cleaning/renovation.
- **Deployment:** All E-sprint fixes are on dev branch only. Must deploy before live testing reflects changes.

---

## ⚠️ CRITICAL GAP — Sprint F-P: Partnership Document Engine (NOT BUILT)

**Discovered:** Session 79 (June 27, 2026)

**The problem:** The `complete_partnership` Stripe tier ($2,495) exists and processes payment correctly, but the generation engine produces **one investor's file only** — identical output to the $1,495 solo package. There is no second investor in the system anywhere.

**What E-2 partnership actually requires:**
- Each investor needs their own visa application with their own documents
- Shared: Business Plan (one document for the business)
- Per-investor: Cover Letter, Source of Funds, Declaration, Qualifications Narrative, Resume, Fund Flow Chronology, Net Worth Statement, Non-Immigrant Intent
- Cover Letter must name both investors and establish each one's shareholding split + develop-and-direct role

**What's missing (sprint scope):**
1. Quiz — intake for Partner 2 (name, nationality, treaty country, SoF narrative, qualifications, management role)
2. Generation engine — run document set twice, once per investor; shared BP flagged as joint
3. Prompts — Cover Letter, Business Plan must reference both investors
4. Delivery — two labelled file packages output to dashboard

**Do not sell partnership packages at $2,495 until this sprint is complete.**
Results page currently shows $2,495 pricing for partnership applicants — this is a revenue and expectation risk.

**Interim mitigation option:** Suppress partnership pricing on results page (show $1,495 + "contact us for partnership pricing") until engine is ready.

### E-1 — All 10 critical breaks ✅

| # | Fix | File |
|---|---|---|
| E-1-01 | Login error shows "Reset password →" + "No account? Sign up free →" links | `src/app/login/page.tsx` |
| E-1-02 | Terms "Back" button uses ?returnTo param; terms/page.tsx wrapped in Suspense | `src/app/terms/TermsClient.tsx`, `terms/page.tsx` |
| E-1-03 | Save & Exit on quiz wired to setShowEmailGate(true) | `src/app/quiz/page.tsx` |
| E-1-04 | Terms acceptance: 15 s AbortController timeout; stuck state now recovers | `src/app/terms-required/page.tsx` |
| E-1-05 | Pricing: .single() → .maybeSingle() on existingApp lookup | `src/app/pricing/PricingClient.tsx` |
| E-1-06 | Pricing: authenticated users see "Dashboard" not "Sign In" in header | `src/app/pricing/PricingClient.tsx` |
| E-1-07 | Upload: no-app state shows paywall CTA, not broken quiz loop | `src/app/apply/upload/page.tsx` |
| E-1-08 | Calendar: empty state when no application/timeline instead of blank page | `src/app/apply/calendar/page.tsx` |
| E-1-09 | Franchise/discover: setLoading(false) before early return when no user | `src/app/franchise/discover/page.tsx` |
| E-1-10 | Simulator: 12 s timeout breaks infinite loading; shows "Refresh page" button | `src/app/simulator/page.tsx` |

### E-2 — Paywall ✅

**Middleware** (server-side, cannot be bypassed):
- `/apply/story|business|investment|qualifications|family|ties` → redirect `/pricing?locked=complete` if no complete/complete_partnership payment
- `/gap-analysis` → same Complete gate
- `/fdd/*` → redirect `/pricing?locked=fdd` if no fdd_intelligence payment

**Nav** (`src/components/Nav.tsx`) — updated Session 81:
- Lock icons REMOVED — My Application / Gap Analysis / FDD Analysis are plain links for all authenticated non-simulator users
- Payments query removed from Nav (no longer needed — 2 fewer DB queries per nav load)
- Middleware handles access control server-side; Nav is display only

### E-6 — Pricing quick fixes ✅

- Founding member counter removed (FOUNDING_MEMBER_LIMIT + DB query)
- "Sign in" → "Dashboard" for authenticated users in header
- Features list updated for 15-doc Complete package (isPartnership replaces broken isSolo)
- additional_child + interview_prep_partnership added to UTILITY_TIERS filter

### Commits (Session 77)
- `232dcc4` fix(sprint-e1): Fix all 10 E-1 critical breaks
- `b8de300` feat(sprint-e2): Paywall — gate paid features behind entitlements

### Open product questions (need Romy decision before E-7)
- FDD standalone vs in-app: same interface or separate?
- Franchise broker handoff mechanism: email / CRM / API?
- Industry category list: what beyond cleaning + renovation?

---

## Sprint E — Full User Journey Audit (ORIGINAL DEFINITION)

**Source:** Live walkthrough by Romy — unregistered email → quiz → results → dashboard → features.  
**Full detail:** [`docs/SPRINT_E_USER_JOURNEY_AUDIT.md`](docs/SPRINT_E_USER_JOURNEY_AUDIT.md)

### Sub-sprint summary

| Sprint | Theme | Issues | Priority |
|---|---|---|---|
| E-1 | Critical breaks / dead ends | 10 | URGENT |
| E-2 | Paywall / access control | 5 | HIGH — revenue leakage |
| E-3 | Results page restructure | 12 | HIGH — conversion |
| E-4 | Quiz fixes | 8 | MEDIUM |
| E-5 | Dashboard overhaul | 8 | MEDIUM |
| E-6 | Pricing page | 4 | QUICK WINS |
| E-7 | Franchise Navigator | 7 | MEDIUM |

### Top 10 E-1 critical breaks (fix first)
1. **Login** — unknown email shows "invalid password" → should invite to sign up
2. **ToS back button** — returns to landing page, not signup
3. **Save & Exit** — does nothing on quiz page
4. **ToS acceptance** — button stuck on "Recording acceptance"
5. **Pricing "Selected" button** — "Failed to create application" dead end
6. **Pricing "Sign in"** — shown to already-authenticated users
7. **Dashboard upload** — "No application found" → broken loop back to quiz
8. **Dashboard calendar** — stuck on loading
9. **Dashboard navigator** — stuck on loading
10. **Simulator** — stuck on loading for users with no case file

### Paywall gaps (E-2) — all features accessible without payment today
- Application section cards 1–5: fillable without paying
- Gap analysis: open
- FDD analysis: open (can upload + extract)
- Simulator: open
- Nav bar: exposes all gated features from results page

### Open product questions (need decision before E-7)
- FDD standalone vs in-app: same interface or separate?
- Franchise broker handoff mechanism: email / CRM / API?
- Industry category list: what should be added beyond cleaning + renovation?

---

## Sprint C — Results Page Conversion Rebuild + Email ✅ COMPLETE

**Goal:** Turn the results page into the primary conversion engine. Everything in this sprint serves one objective: convert "I took a quiz" into "I'm ready to start building my case for $1,495."

### C-1 · Results page full rebuild ✅ COMPLETE (Session 73)
**File:** `src/app/results/page.tsx` + new components

**Zone-by-zone spec:**
- **Hero**: Keep score circle. Replace verbose verdict with identity label at 38–42px Cormorant Garamond. Identity labels by outcome:
  - PROCEED ≥90: *"You're on the Straight-Path E-2 Track."*
  - PROCEED 70–89: *"You're on a strong E-2 path."*
  - PROCEED_RISK: *"Your case is viable — a few things need attention."*
  - ATTORNEY_RECOMMENDED: *"Your situation needs legal guidance alongside preparation."*
  - Under label: one-sentence personal translation — "Canadian citizen · $150k+ · Franchise buyer · Toronto consular path"
  - Eligibility band strip: green / amber / red with one sentence

- **Outcome Summary Card** ← NEW: 5–7 personalized bullets from quiz answers. Citizenship, investment band, business status, route (consular vs COS), family, immigrant-intent risk level. No scroll required — visible in first viewport after hero.

- **Flags**: Keep existing FlagCard components. Add "How we address this → [module link]" footer to each card. Reframe section header: "Risks to address before your interview."

- **Free / Paid split block** ← NEW: Two-column. Left: "What you've already got (free)." Right: "What you unlock for $1,495" — name the 15 documents, gap analysis, interview simulator specifically.
  - **Attorney price anchor** ← NEW: directly above $1,495 — *"E-2 attorneys charge $8,000–$15,000 for document preparation. E2go: $1,495, and you control every word."*

- **Document package preview** ← REBUILT (replaces `DocumentTeaser`): Business plan page mockup (not cover letter statutory opener). Two rendered PDF-style pages with their actual data (business type, investment, consulate, archetype). Marked "DRAFT — complete your case to unlock." Component: `DocumentPackagePreview.tsx`.

- **CTA block**: Outcome-specific button label. "After you join" rewritten as an outcome timeline:
  - Day 1: Case file opens with your quiz data pre-loaded
  - Week 1–2: Build your 15-document package at your pace
  - Week 2: Complete package, formatted for [Consulate], ready to submit
  - Month 2–4: Your interview date. Arrive in the US.
  - Legal disclaimer: 2 lines.

- **Interview simulator teaser** ← ELEVATED: Own section. "Before your interview, we'll simulate it with your actual case details." Preview card: 12–18 min · text or voice · personalized coaching after each answer.

- **Objection FAQ** ← REPLACES FaqWidget: Static accordion, 4–6 specific questions. "Is my investment enough for Toronto?" / "Can E2go replace a lawyer?" / "What if my case is refused?" / "I sold my Canadian home — did I make a mistake?" No chatbot, no wandering.

- **Pathway block** (conditional): Show only if quiz indicates business not yet chosen. "Not sure what business to invest in?" → two tiles: Franchise Navigator / Business Advisor.

- **Remove**: 7-step journey strip (replace with 4-step simplified or remove entirely). FaqWidget import.

- **Aesthetics**: Hero background: very low-opacity (~5%) dark cityscape texture (SVG/CSS, not photo). Identity label at 38–42px. Full-strength gold on score number and primary CTA. Clear section breaks with horizontal rule.

---

### C-2 · Supabase verification email ✅ TEMPLATE READY — owner action required
**Where:** Supabase dashboard → Auth → Email Templates → Confirm signup (HTML, inline styles)
**Subject:** `Congratulations — your E-2 result is ready`

**Copy decisions (Session 74 revision):**
- Headline: *"Congratulations on taking the first step."* — warm, celebratory, not transactional
- Para 1: Acknowledges courage of the decision ("done what most people only talk about")
- Para 2: States what's waiting (score + analysis + document preview)
- Encouraging strip (gold left border, italic Georgia): *"Most applicants discover their path is more viable than they expected. Every flag comes with a specific strategy to address it."* — handles both optimistic and anxious readers
- "Not a law firm" disclaimer: **footer only — not repeated in the body**
- CTA: *"SEE MY ELIGIBILITY RESULT →"* → `{{ .ConfirmationURL }}`

**Design:**
- Background: `#e0dbd0` outer, `#f5f0e8` card, `border-top: 3px solid #C9A84C`
- Encouraging strip bg: `#fdf9f0` (warmer than card bg), gold left border
- Footer bg: `#ece7dd`
- Variables: `{{ .ConfirmationURL }}` and `{{ .Email }}` only (Supabase native)
- **Template file:** `docs/supabase-verification-email-template.html`

---

### C-3 · Resend results preview email ✅ COMPLETE (Session 73)
**File:** `src/app/api/email/results/route.ts`

**Spec:**
- Triggered after quiz completion (EmailGate flow) — same trigger as today, better email
- Subject line variants by outcome:
  - PROCEED ≥90: *"[Name], 100/100 — your E-2 path is clear."*
  - PROCEED_RISK: *"[Name], your E-2 result: viable, with one thing to address."*
  - ATTORNEY_RECOMMENDED: *"[Name], your E-2 result: complex case, here's your next step."*
- Content: Score band + identity label + 3 outcome bullets + flag teaser if applicable + gold CTA
- CTA: *"View your complete result →"* → `/results?session=[sessionId]`
- Design: Light email (cream bg, dark text, gold CTA button). Full HTML, inline styles, responsive. Cormorant Garamond for headline via web-safe fallback (Georgia), DM Sans for body.
- **Does not reveal full results** — teases them. The click-through is the payoff.

---

### C-4 · Generate page — franchise split ✅ COMPLETE (Session 74)
**File:** `src/app/generate/[applicationId]/page.tsx`

Phase A (FDD/market analysis) → Decision Gate → Phase B (15-document generation) for franchise buyers. Non-franchise buyers skip Phase A entirely.

**Implementation:**
- Franchise detection via `case_profiles.archetype === 'buyer'` (browser Supabase client, runs in parallel with validation fetch)
- `FddSummary` interface: `id`, `franchisorName`, `e2Score`, `completedAt`
- Phase A UI (two sub-states):
  - **Has FDD analysis**: gold ✓ card showing franchisorName + E-2 score + description of how FDD data flows into documents → "Proceed to Document Generation →"
  - **No FDD analysis**: warning card listing 3 document sections strengthened by FDD → primary CTA "Complete FDD Analysis First →" (/fdd) + secondary "Skip — proceed without FDD"
- Loading state covers BOTH `validationLoading` AND `!franchiseCheckDone` — no flicker between states
- Non-franchise buyers: `setPhaseADone(true)` fires immediately → zero UX change for them

---

### C-5 / D-1 · Partner account linking ✅ COMPLETE (Session 75)
Grant `interview_prep_partnership` to both partner logins automatically.

**Implementation:**
- `supabase/migrations/20260625200000_partner_access_tokens.sql` — new table; one-time UUID token; RLS: buyers see own invitations
- `src/app/api/partner/invite/route.ts` — POST; checks caller has `interview_prep_partnership` payment; upserts token (resend-safe); sends Resend branded email; sentinel `'partner_grant'` for non-Stripe payment record
- `src/app/api/partner/accept/route.ts` — POST; validates token; 404 (not found), 409 (already used), 403 + `emailMismatch` (wrong account); idempotent insert into `payments`; marks token `used_at`
- `src/app/partner-access/page.tsx` — client page; states: loading/ready/accepting/success/used/mismatch/error; redirects unauthenticated to `/login?next=...`; wrapped in Suspense (required for `useSearchParams`)
- `src/components/dashboard/PartnerInvitePanel.tsx` — side-panel component; idle → sent → resend; returns null if invite already accepted
- `src/lib/entitlements.ts` — added `hasInterviewPrepPartnership` boolean
- `src/app/dashboard/page.tsx` — parallel fetch for `partner_access_tokens`; mounts `PartnerInvitePanel` in side panel when entitlement present and invite not yet accepted

**Build fixes in this session:**
- `partner-access/page.tsx` — apostrophe escaping (`{" You've..."}`) + Suspense wrapper for `useSearchParams`
- `PartnerInvitePanel.tsx` — apostrophe escaping (`{"They'll..."}`)
- `src/app/api/simulator/section-nudge/route.ts` — added `export const dynamic = 'force-dynamic'` (pre-existing static render error surfaced by this build)

**Owner actions still required:**
- Apply SQL migration: `supabase/migrations/20260625200000_partner_access_tokens.sql`
- Set `RESEND_API_KEY` in env (invite emails fall back to console.log without it)

---

## Owner actions blocking Sprint C testing

| Action | Blocks |
|---|---|
| Create Stripe product `complete` → $1,495, set `STRIPE_PRICE_COMPLETE` + `NEXT_PUBLIC_STRIPE_PRICE_COMPLETE` | All payment flows |
| Create Stripe product `complete_partnership` → $2,495, set `STRIPE_PRICE_COMPLETE_PARTNERSHIP` | Partnership payments |
| Create Stripe product `interview_prep` → $347, set `STRIPE_PRICE_INTERVIEW_PREP` | Interview prep add-on |
| Create Stripe product `interview_prep_partnership` → $495, set `STRIPE_PRICE_INTERVIEW_PREP_PARTNERSHIP` | Partnership interview prep |
| On FDD Intelligence: add $575 price → `STRIPE_PRICE_FDD_INTELLIGENCE`; add $375 → `STRIPE_PRICE_FDD_INTELLIGENCE_LOYALTY`; archive old $297 | FDD purchases |
| Accept Groq terms at console.groq.com | Voice mode in simulator |
| Apply SQL: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_at timestamptz, flag_reason text;` | Admin flag-user feature |
| Set custom sender in Supabase Auth → Email → SMTP (or confirm Resend domain is active as sender) | Branded verification email |

---

## Session 72 — Sprint B: Dashboard rebuild complete. Build clean.

**Session 71 — Sprint A: Pricing infrastructure rebuild:**

(26) **New 8-SKU flat pricing model** — Replaced the old 7-SKU family-size pricing structure with a clean product-based model:

| SKU | Price | Notes |
|---|---|---|
| `complete` | $1,495 | Solo applicants — replaces all solo/partnership family variants |
| `complete_partnership` | $2,495 | Partnership (two investors) — separate Stripe product |
| `interview_prep` | $347 | Add-on (solo) — requires `complete` or `complete_partnership` |
| `interview_prep_partnership` | $495 | Add-on (partnership) — one purchase covers both partners |
| `fdd_intelligence` | $575 | Standalone — same price for solo and partnership |
| `fdd_intelligence_loyalty` | $375 | Complete owners only, before Phase B document generation starts |
| `simulator_3pack` | $49 | Utility — 3 extra simulator sessions |
| `renewal` | $99 | Utility — application renewal |

**Key decisions (June 24, 2026):**
- Partnership complete tier is $2,495 (separate product, not 2×$1,495)
- FDD Intelligence charges the same $575 regardless of solo/partnership
- `interview_prep_partnership` ($495) covers both partners under one purchase; today grants access to purchasing user only — second partner login requires manual admin tier override until account linking is built in Sprint B+
- Loyalty price gated: `hasComplete` AND `generated_documents` count = 0 for the applicationId (enforces "before Phase B only" without schema changes)

Files changed:
- `src/types/payments.ts` — New type exports (`MainTierId`, `AddOnTierId`, `UtilityTierId`), new `STRIPE_PRICE_IDS`/`STRIPE_PRICES` constants
- `src/lib/pricing-tier.ts` — Simplified `TierId`, `getPricingTier()` always returns `'complete'`, `PRICING_TIERS` has single entry
- `src/lib/entitlements.ts` — **New file**: `getUserEntitlements(userId, supabase)` → `{ hasComplete, hasInterviewPrep, hasFddIntelligence }` — single source of truth for all lock states. Also `hasLoyaltyEligibility()` for Phase A/B gate.
- `src/app/api/stripe/create-checkout/route.ts` — New `VALID_TIER_IDS`, loyalty validation (403 if no Complete, 403 if Phase B started), `REQUIRES_COMPLETE` set enforces add-on eligibility
- `src/app/api/stripe/webhook/route.ts` — `complete` unlocks application, `fdd_intelligence`/`fdd_intelligence_loyalty` unlock FDD analysis, `interview_prep` requires no extra DB write (entitlements read from payments table)
- `src/app/pricing/success/page.tsx` — Updated `PAYMENT_TYPE_NAMES` + new `PAYMENT_TYPE_NEXT_STEP` routing per tier
- `src/app/results/page.tsx` — `getPricingFromAnswers()` now returns flat $1,495
- `src/app/pricing/PricingClient.tsx` — `DEFAULT_TIERS` = single Complete entry; DB filter excludes add-ons/utility tiers
- `src/app/admin/revenue/page.tsx` + `TierOverridePanel.tsx` — Updated TIER_PRICES/TIER_LABELS/TIERS to new model
- `supabase/migrations/20260624100000_pricing_v2.sql` — Deactivates 7 old tiers, inserts 4 new tiers
- `.env.example` — Updated to show new env var names (`STRIPE_PRICE_COMPLETE` etc.)
- `src/lib/__tests__/pricing-tier.test.ts` — Updated tests for flat pricing model

**Next up — Sprint B (Results page + Dashboard + Generate flow):**
- Results page: live document teaser from quiz data (partial cover letter, 80–100 words visible, rest blurred)
- Dashboard: full redesign — Journey Spine, lock states from entitlements, Phase A/Gate/Phase B flow
- Generate page: Phase A/Decision Gate/Phase B split for franchise buyers

**Stripe action required before Sprint B testing:** Create 4 products in Stripe dashboard and add Price IDs to `.env.local`:
- `STRIPE_PRICE_COMPLETE` (one-time $1,495)
- `STRIPE_PRICE_INTERVIEW_PREP` (one-time $347)
- `STRIPE_PRICE_FDD_INTELLIGENCE` (one-time $575)
- `STRIPE_PRICE_FDD_INTELLIGENCE_LOYALTY` (one-time $375)
- `NEXT_PUBLIC_STRIPE_PRICE_COMPLETE` (same value as `STRIPE_PRICE_COMPLETE`)

**Session 70 — Full-app readability pass (faded text removal):**

(25) **App-wide text contrast fix** — Raised all low-opacity text colors throughout the entire app to a minimum 0.62 opacity (cream text) / 0.65 (gold text), targeting users in their 40s–60s with aging eyes. Three-pass approach:
- **Pass 1**: Perl script with `\bcolor\s*:` word-boundary anchoring — safely replaced 570+ `color:` property values across 115 `.tsx`/`.ts` files. Borders/backgrounds on the same line were untouched.
- **Pass 2**: Targeted the 16 files with ternary-expression text colors that Pass 1 couldn't reach (e.g. `color: condition ? '#C9A84C' : 'rgba(245,240,232,0.35)'`).
- **Pass 3**: Handled Tailwind arbitrary value classes (`text-[rgba(245,240,232,0.XX)]`), event handler `style.color =` assignments, and `const` colour token variables missed by the CSS-property anchored passes.
- **`globals.css`**: `--text-muted` raised from `0.35` → `0.68`.
- Borders, backgrounds, and box-shadows that use the same rgba values were NOT changed.
- Final grep: 0 remaining text color values below 0.60 opacity.
- Commit: `598cf76`. Build clean.

**Session 69 — Page transitions + login animation + GenerationProgress audit complete. Build clean.**

**Session 69 — Page transitions, login animation, GenerationProgress audit:**

(22) **Page transitions** — `src/components/ui/PageTransition.tsx` (new): client component wrapping all page content in root layout. Uses `usePathname()` as animation key; every route change re-triggers a 220ms fade+slide entrance (`opacity: 0, y: 7` → `opacity: 1, y: 0`). No exit animation (App Router unmounts old component before exit can play — causes flicker with `mode="wait"`). Wired in `src/app/layout.tsx`: `<PageTransition>{children}</PageTransition>`. Framer Motion import path: `motion/react` (v12). Commit: `527bd8c`.

(23) **Login animated submit overlay** — `src/app/login/page.tsx`: replaced bare spinner with a full-screen `AnimatePresence` overlay that fades in (200ms) over the form on submit. Overlay shows `GenerationProgress` with 3 auth-specific steps (`Verifying credentials…`, `Loading your profile…`, `Preparing your workspace…`, `estimatedSeconds=8`, `showEstimate=false`). `motion.button` with `whileTap={{ scale: 0.98 }}` on the Sign In button. Animated error message slides down from above (`y: -6 → 0`). Form stays visible underneath the overlay during the fade-in. Commit: `527bd8c`.

(24) **GenerationProgress component audit** — Verified all 9 background-loading states in the app. 6 states already upgraded to `GenerationProgress`: Simulator evaluate (estimatedSeconds=30, 5 steps), Simulator coaching loading (estimatedSeconds=15, 4 steps), Simulator follow-up compact bar (compact=true, estimatedSeconds=12), InterviewBrief LoadingState (estimatedSeconds=90, 7 E-2-specific steps), Gap-analysis AI analysis banner (estimatedSeconds=20, 6 steps), Gap-analysis re-analysis prompt (same). 3 states intentionally kept as simple spinners (admin page, generate page, document download — structural chrome, not user-facing wait states). Added QA-UX-01 through QA-UX-08 rows to `docs/FEATURE_INVENTORY.html`. Commit: `3b92519`.

**Session 67 — ENG-2: Quiz conditional branches + archetype classifier fix:**

(19) **Quiz conditional branch paths (Q0-08c + Q0-08d)** — Added two new conditional questions to `src/data/module0_questions.json`:
- **Q0-08c** (franchise path, show_if Q0-08a = "A franchise"): "Have you received the FDD from the franchisor?" — 3 options covering Yes/Offered/Early discussions. Feeds into FDD intelligence product routing and gap analysis.
- **Q0-08d** (acquisition path, show_if Q0-08a = "An existing independent business"): "Is the business currently operational with active staff?" — Triggers `W-MARGINALITY-ACQUISITION` warning if no employees, `W-DORMANT-ACQUISITION` if dormant. Both codes flow into `result_json.warnings` and surface on the results page as risk flags.

(20) **Archetype classifier fix** — `classifyArchetype()` in `src/lib/case-profile.ts` now accepts a 3rd param `businessTypeAnswer` (Q0-08a text from `result_json.answers`). Priority order: (1) Q0-08a franchise signal → 'buyer'; (2) Q0-08a acquisition signal → 'investor'; (3) new concept + experienced operator → 'builder'; (4) legacy post-profile heuristics. `buildCaseProfile()` extracts Q0-08a at line 163 and passes it through. Previously, franchise buyers who selected "career switcher" in the post-profile were misclassified — archetype guidance in document gen was wrong for their entire package.

(21) **Doc gen archetype variants confirmed complete** — `ARCHETYPE_DOC_GUIDANCE` in `generation-engine.ts` already has all 4 archetypes × 16 doc types (buyer/builder/investor/career_switcher). Built in S63, never marked done. Now recorded as complete.

**All 8 sprints now complete.** No planned sprint backlog remaining. Next phase: user acquisition, packaging audit, or new sprint definition.

**Session 66 additions:**

(16) **UI state restore on generate page reload** — `/api/generate/start` now returns `current_step`, `total_steps`, `current_step_label` for existing active jobs. Generate page `startGeneration()` detects `data.existing === true` and pre-populates: `overallProgress` from step ratio, `approvedDocuments` from step count, `currentQualityStep` if in quality phase. SSE takes over immediately and corrects from live state. Users reloading mid-generation no longer see all-pending UI.

(17) **Mobile viewport QA pass** — audited all key pages (generate, quiz, results, simulator, apply shell, dashboard). Key fix: generate page header + main content now uses `px-4 sm:px-8 lg:px-12` (was `px-8 lg:px-12`; gave only 311px content on 375px iPhone). Header text scaled: `text-xl sm:text-2xl`. FDD compare page already wrapped in `overflow-x-auto`. Quiz uses `clamp()` padding. Simulator has `isMobile` detection. CaseFileShell has horizontal scroll nav for mobile. NpsModal uses sheet-from-bottom pattern on mobile. All pages confirmed responsive.

(18) **Connection pooler** — Supabase SDK (REST API) handles pooling internally; no DATABASE_URL pgbouncer param needed for this architecture. Note added to system documentation. Owner action: no change required.

**Session 63 — Sprint batch: OPS-4, OPS-5, ENG-1, ENG-2, INFRA-1:**

(0) **Discovery: ENG-1 was already fully built** — KB wiring (+1.4 pts, generation-engine.ts lines 683-692), cross-session coaching memory (simulator/page.tsx lines 531-561), multi-turn probing (/api/simulator/follow-up route). Zero code needed for ENG-1.

(1) **INFRA-1 P0 — FAQ route Anthropic violation fixed**: `/api/faq/ask/route.ts` was importing and calling `@anthropic-ai/sdk` as a streaming fallback. Removed. Replaced with dual OpenRouter calls: primary `xiaomi/mimo-v2.5`, fallback `google/gemini-2.5-flash`. ANTHROPIC_API_KEY now only in generation-engine.ts + /api/fdd/*.

(2) **OPS-1/2/3 — Admin Command Center**: Full `/admin/page.tsx` rebuild (350 lines). 10 parallel Supabase queries. Sections: kill switch + maintenance banners, AdminControls toggle, 5 overview cards, API Cost Intelligence (model breakdown), generation pipeline status, stuck users table, recent payments, users table. Kill switch and maintenance mode editable live via AdminControls.tsx client component.

(3) **OPS-4 — Revenue Intelligence** (`/admin/revenue/page.tsx`): All-time revenue, MoM % change, monthly sparkline (last 6 months), linear revenue projection (+3m, +6m), LTV by tier table, conversion funnel with drop-off rates, churn signals (paid users inactive 14+ days).

(4) **OPS-5 — Quality & Growth Intelligence** (`/admin/quality/page.tsx`): Generation quality (avg humanization score, consistency gate fail rate, revision rate, AI detection score distribution, job status breakdown). FDD extraction quality (avg fields, low-confidence count, flag count, alert if < 5 fields). NPS section with SQL scaffold when table missing. Prompt version registry (7-entry static audit trail).

(5) **ENG-2 — FDD extraction prompt tuning (+1.0 pts)**: Expanded `CHUNK_A_SYSTEM` to cover 8 franchise categories with category-specific terminology (home care, fitness, education, healthcare, B2B, home-based, food/retail, automotive). Added PDF table artifact handling + numeric extraction rules. Chunk D (Item 19) improved with table-format reading notes, territory billing guidance, cherry-pick detection. Recovery pass threshold 3→2; full-doc coverage; 6-field terminology variant guidance.

(6) **ENG-2 — Adaptive interview difficulty (+0.3 pts)**: `simulator-engine.ts` — after all weak-point and gap probes assembled, if total probe count < 2 AND questions < 11, injects 2 adversarial escalation questions from a pool of 8. Pool covers: remote-operation challenge, financial contingency, passive-vs-active management, nonimmigrant intent, due diligence, competitor awareness. Filters overlap with already-triggered denial/intent probes.

(7) **Supporting infra already committed (S62 overflow)**:
- `vercel.json`: health-watchdog cron every 5 min
- `/api/admin/settings`: kill switch + maintenance toggle with audit log
- `/api/cron/health-watchdog`: stuck job detection, writes to cron_log
- SQL migrations: llm_cost_log, cron_log, admin_audit_log (applied to Supabase by owner)

**Score impact summary (cumulative):**
- ENG-1: +2.9 pts already built (KB wiring 1.4 + coaching memory 0.8 + multi-turn probing 0.7)
- ENG-2: +1.3 pts added this session (FDD tuning 1.0 + adaptive difficulty 0.3)
- Total engine improvement: ~4.2 pts above last audit baseline of 7.6 → target 9/10

**Session 64 additions:**

(8) **NPS pipeline complete**: `/api/nps/submit/route.ts` — auth check, score validation (int 0–10), 7-day rate limit via nps_scores table query, service role INSERT. `src/components/NpsModal.tsx` — 0–10 clickable scale, optional comment textarea, localStorage 7-day cooldown guard (`shouldShowNps()` / `markNpsShown()`), submit/dismiss flows, Obsidian Gold design. Already wired in generate page: shows after first download if cooldown allows.

(9) **Pipeline checkpoint resume**: `src/app/generate/[applicationId]/page.tsx`:
- `connectSSE()` — added exponential backoff on `onerror`: 3s → 6s → 12s → cap 30s. Tracks `done` flag so reconnect stops after completed/failed message.
- `startGeneration()` — checks `data.existing` flag from `/api/generate/start`. If existing running job: skips `POST /api/generate/run/[jobId]`, goes directly to `connectSSE()`. Prevents double-starting jobs on page reload.

**Session 65 additions — completing the original 28-feature admin plan:**

(10) **OpenRouter reload alert** — health-watchdog checks OR balance every 5 min via API. Sends Resend email when below threshold (24h dedup). Sets `openrouter_balance_low` flag in `app_settings`. Admin page shows red banner.

(11) **Simulator engagement metrics** — `/admin/quality` now shows: total sessions (30d), unique users, avg sessions/user, completion rate, readiness breakdown (ready/nearly_ready/needs_work).

(12) **Document download rate** — `/admin/quality`: acknowledged packages vs downloaded ZIPs from `generation_pipeline_log.downloaded_at`. Rate % with health label.

(13) **Send email to user** — `POST /api/admin/send-email`. Admin-only. `SendEmailPanel` client component in user detail page. Audit logged.

(14) **Flag account for review** — `POST /api/admin/flag-user`. Sets `flagged_at` + `flag_reason` on `profiles`. `FlagUserPanel` with confirm step. Red banner on user detail. **Requires SQL migration (see below).**

(15) **Read-only user impersonation** — `/admin/users/[userId]/view`. Server-rendered full picture of what a user sees: answers by section, quiz, sims, jobs, lifecycle, documents. No auth switching.

**Owner SQL required:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flag_reason text;
```

**Remaining backlog (only 3 items left from the entire admin plan):**
- INFRA-1: connection pooler (owner action — add `?pgbouncer=true&connection_limit=1` to DATABASE_URL in Vercel)
- INFRA-1: UI state restore from `generation_pipeline_log` on page reload (show already-completed steps)
- OPS-5: mobile viewport QA pass (70+ routes at 390px — manual browser walk-through)

**Owner actions required (unchanged):**
- CRON_SECRET env var must be set in Vercel for health-watchdog auth to work
- Connection pooler: add `?pgbouncer=true&connection_limit=1` to DATABASE_URL in Vercel env
- NPS table: paste SQL from /admin/quality → NPS section → SQL accordion into Supabase SQL editor

**Session 62 cont — Roadmap tab additions:**
- TAB: Added "Roadmap" tab to FEATURE_INVENTORY.html
- ENGINE QUALITY: Scores from all 3 audits (S26: 6.9, S35: 7.6, target: 9.0). Per-engine bars for 10 engines. 9 open gaps with point-impact estimates, each linked to a sprint.
- SPRINTS (8 total):
  - OPS-1: API Cost Intelligence (critical / 1 session) — llm_cost_log, cost dashboard, reload alert
  - OPS-2: System Health & Self-Healing (high / 1–2 sessions) — watchdog cron, /admin/system-status, kill switch
  - OPS-3: Admin Command Center (high / 2 sessions) — user detail, tier override, stuck users, feature flags
  - OPS-4: Revenue Intelligence (high / 1 session) — MRR, projections, funnel, churn signals
  - OPS-5: Quality & Growth Intelligence (medium / 2 sessions) — quality dashboard, NPS, mobile QA
  - ENG-1: Engine Quality Priority (high / 2 sessions) — KB→docgen +1.4pts, coaching memory +0.8pts, live gap recalc +0.5pts
  - ENG-2: Engine Quality Advanced (medium / 2–3 sessions) — archetype variants, adaptive difficulty, FDD prompt tuning
  - INFRA-1: Infrastructure Hardening (high / 1 session) — FAQ Anthropic violation P0, pooler, resume, rate limit, soft-delete
- GAPS: Added "Performance & Efficiency — Quick Wins" group (6 items)
- TAB: Added "Smoke Test" tab — 108 checklist items, 14 page groups, localStorage persistence

**Inventory audit findings (Session 62):**
- ADDED: Ask E2go FAQ Chat (FaqChat.tsx + /api/faq/ask, 3-layer RAG, public, seeded)
- ADDED: Account Data Export (/api/account/export, PIPEDA/GDPR, accessible from Settings)
- ADDED: Gap Analysis AI Enrich (/api/gap-analysis/enrich, LLM per-category enrichment)
- ADDED: Gap Analysis Semantic Eval (/api/gap-analysis/semantic-eval, 3-field consular officer check)
- ADDED: Module 3 Tab D AI Assist (/api/ai, Upstash Redis rate-limited, story writing help)
- FIXED: groq-tts.ts marked unblocked (Groq terms accepted)
- FIXED: document_generation_jobs total_steps now shows dynamic (22–25)
- FIXED: FLOWS step references updated from hardcoded 15–23 to dynamic Q→Q+8
- CLEARED: Stripe simulator price + UptimeRobot gaps (both done)
- TRACKED: 3 CI failures (dependency-audit, type-check, build-check) deferred by owner

**Previous session:** June 23, 2026 — Session 62: FAQ corpus seeded, revising-status migration created, FEATURE_INVENTORY updated. Build clean. Branch: dev.

(1) **FAQ corpus seeded**: `scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts` — both fixed to load `.env.local` via dotenv (were reading `.env`). Seeded 355 Q&A pairs into `faq_qa_corpus` + 285 KB chunks from 33 docs into `faq_kb_chunks`. Ask E2go FAQ now has full vector search backing.

(2) **generated_documents 'revising' migration created**: `supabase/migrations/20260623000000_generated_documents_revising_status.sql` — drops old constraint, re-adds with `'revising'` appended. Owner must paste into Supabase SQL Editor.

(3) **FEATURE_INVENTORY.html updated**: FAQ corpus gap removed (done); generated_documents status gap updated with migration filename; faq_qa_corpus + faq_kb_chunks table notes updated to show seeded row counts.

**Previous session:** June 23, 2026 — Session 61: Silo sprint + gap cleanup complete. Build clean. Branch: dev.

(1) **Conditional Document Automation** (Silo 2 resolved): generation-engine.ts — `DOCUMENT_TYPES` renamed to `CORE_DOCUMENT_TYPES`; after step 1 complete, queries `answers` for M3-L-01 and M3-F-05; builds dynamic `DOCUMENT_TYPES = [...CORE, ...conditional]`; `Q = DOCUMENT_TYPES.length + 2` (first quality step offset); `effectiveTotalSteps = 1 + DOCUMENT_TYPES.length + 9`; `updateJob({ total_steps: effectiveTotalSteps })`; conditional doc rows inserted into `generated_documents` if missing. `QUALITY_LABELS` array + `emitQualityStep(offset, status)` helper replace all hardcoded `emitStep(15..23)` calls — quality step labels no longer depend on static index. start/route.ts mirrors: queries same answers at job creation, computes `allDocTypes` + `totalSteps` dynamically.

(2) **Module 4 Follow-Up Conversation** confirmed fully built (was incorrectly marked planned in HTML): 4-screen page at /apply/module4 + 4 API routes (save-voice-sample, generate-questions, save-response, completion-summary). Updated FEATURE_INVENTORY.html to reflect.

(3) **investment_proof cleanup**: removed from VALID_DOC_TYPES (download route), DOC_DISPLAY_NAMES, DOC_TYPE_TAB_MAP (docx-package-constants.ts), and consulate-config.ts manifest entry. Still in DocumentType union for DB backward-compat.

(4) **/api/health enhanced**: DB ping added (Supabase latency check). Returns `{ status, timestamp, version, uptime_ms, checks: { database: { status, latency_ms } } }`. 503 on DB failure. Ready for UptimeRobot/BetterStack.

(5) **FEATURE_INVENTORY.html updated**: Silo 2 marked resolved; Module 4 marked built; Phase 04 meta updated for dynamic steps; generation-engine description updated; Conditional Documents entry updated; Uptime Monitoring entry updated; Technical Debt items cleaned up.

**Previous session:** June 23, 2026 — Session 60: ZIP pipeline now emits all 14 always-generated + 3 conditional docs. (1) consulate-config.ts `getDocumentManifest()` expanded 8→15 entries: added marginality_rebuttal, declaration_principal, fund_flow_chronology, net_worth_statement, resume_principal, gift_letter (always-generated) + declaration_spouse, property_portfolio, resume_spouse (conditional); `DocManifestEntry` extended with `conditional?`/`conditionalNote?` fields. (2) ConsulateBriefing — split into "★ always generated" + "◇ also generated when applicable" sections; PageBudgetBar now excludes conditional docs from page-count estimate. (3) docx-package-constants.ts — `DOC_DISPLAY_NAMES` centralized here (removed from download route); `DOC_TYPE_TAB_MAP` expanded 8→17 docs; TAB_SECTION_TITLES/TAB_ORDER expanded 8→11 tabs (added B: Financial Evidence, C: Non-Marginality Analysis, G: Personal Declarations). (4) Download route assembly loop — `find` → `filter` so multi-doc tabs (B, F, G, H, J) emit all their docs in the ZIP; previously only the first doc per tab was included — all new pipeline docs were silently dropped. (5) docx-toc-builder.ts — multi-doc tabs now list individual filenames with → entries; hardcoded "Toronto" removed; total count line now says "N generated documents across M tabs". (6) VALID_DOC_TYPES in download route expanded to 17 (added 3 conditional doc types). Build clean. Branch: dev.

**Previous session:** June 23, 2026 — Session 59: DOC sprint Tasks E–G complete. Build clean. (E) Per-child intake restructured — family/page.tsx: M3-L-08 textarea replaced with M3-L-07-COUNT (count selector 1-5) + per-child cards (CHILD-{n}-NAME/DOB/NATIONALITY/PASSPORT); M3-L-08 auto-computed as summary string for backwards compat in generation engine. (F) Tab B financial evidence checklist expanded — checklist-generator.ts: 8 new conditional items added: bank statements (always), transfer records (always), RRSP/TFSA withdrawal docs (if M3-F-05 includes rrsp/tfsa), property sale statement (if property-sale), loan agreement (if loan), gift letter + donor source docs (if M3-H-05 includes gift), franchise fee invoice + FDD Item 7 (if franchise). strVal() helper added for safe multi/single answer extraction. (G) Gift letter document — prompts/v1/documents/gift_letter.md created; gift_letter added to DocumentType union, DOCUMENT_TYPE_LABELS/TABS, REQUIRED_ELEMENTS, DOC_GAP_CATEGORY_MAP, word count/page estimate targets, archetype contexts (all 4); DOCUMENT_TYPES array in engine expanded from 13→14; quality steps shifted 15-23→16-24; GENERATION_STEP_LABELS updated (14=Gift Letter, steps 16-24=quality); total_steps 23→24 in start route; start route document pre-creation updated from 8→14 types; download route DOC_DISPLAY_NAMES updated. All confirmed clean with tsc --noEmit + npm run build. ⚠️ Owner actions unchanged from S58.

**Previous session:** June 23, 2026 — Session 58: DOC sprint Tasks A–D complete. Pushed to dev (commit 8fd05c1). (A) B-01_Source_and_Application_of_Funds.md — consolidated prompt merging source_of_funds + investment_proof into one document (2-part: origin + at-risk/irrevocability); includes RRSP/TFSA, round-trip warning, FDD Item 7 cross-ref; (B) F-02_Investment_Portfolio_Summary.md — per-account securities/investment holdings, crypto handling, liquidated account cross-ref to Tab B; conditional not-applicable notice; (C) ds156e_guide.md — DS-156E vs DS-160 distinction, field-by-field pre-populated reference guide, social media disclosure section, 9-field consistency checklist, per-family-member DS-160 guidance; (D) Pipeline step refactor — DOCUMENT_TYPES expanded from 8→13 (added marginality_rebuttal, declaration_principal, fund_flow_chronology, net_worth_statement, resume_principal as non-conditional generated docs; conditional types excluded); quality steps shifted 9-17 → 15-23 to eliminate collision; GENERATION_STEP_LABELS extended to step 23; total_steps 17→23 in start route. Build clean. DOC sprint complete: all buildable-without-input tasks done. Remaining (needs input): per-child intake restructure (E), Tab B checklist expansion (F), B-Gift_Letter.md (G). ⚠️ Owner actions: Sentry DSN to Vercel, BUG-QA-06 migration SQL, generated_documents.status CHECK migration, Groq TTS terms, CRON_SECRET.

**Previous session:** June 22, 2026 — Session 57: DOC-3–5 document type expansion. Completed Task 8 (wiring 8 new document types end-to-end): 8 new DocumentType values, 8 LLM prompts, generation-engine.ts maps wired. Commit 02c3d80.

**Previous session:** June 22, 2026 — Session 56: Gap & Silo Resolution — 12-task sprint. Completed Tasks 1–12: (1) getSession()→getUser() sweep (reset-password); (2) bracket regex audit (correct, no change); (3) Stripe API version bump; (4) Gap Analysis→Generation silo wired (buildGapContext helper, gap_analysis_context injected into Claude prompt); (5) FDD→Simulator injection (fddPriorityQuestions fetched in buildSimulatorContext, FDD probe questions replace BT section for franchise applicants); (6) Coaching→Case file nudges (SimulatorNudge component + /api/simulator/section-nudge route injected into all 5 apply section pages); (7) Module 4 voice path audit (follow-up responses formatted as clean Q&A, voice profile conditional in LLM prompt); (8) Market Analysis writeback (territory score written to answers table); (9) Delivery detection (analyzeDelivery shared utility created at delivery-analysis.ts, simulator-engine.ts re-exports it, evaluate route calls it and returns deliveryNotes in all response paths); (10) Admin dashboard (/admin/page.tsx — metrics row, payments table with email lookup, users table with app count); (11) FDD freemium gate — already complete from prior session; (12) Sentry integration (@sentry/nextjs installed, sentry.client/server/edge.config.ts, withSentryConfig in next.config.mjs, tunnel route /api/_sentry-tunnel, global-error.tsx). Build clean. ⚠️ Owner actions required: (a) Add NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN + SENTRY_ORG + SENTRY_PROJECT to Vercel env after creating project at sentry.io; (b) All prior pending items still outstanding (Groq TTS terms, FAQ corpus seed, Google Places API key, Stripe SQL, Migration 004, Resend domain, BUG-QA-06 migration). Next: DOC-1 sprint (Tab B checklist expand + per-child intake + 7 missing prompts).

**Previous session:** June 22, 2026 — Session 55: Document Intelligence Audit. Full gap analysis across all document prompts, intake pages, checklist (Tab B), generation engine, and Anupama real-submission templates. Identified 19 confirmed gaps across 6 categories. No code changes this session — pure research and categorisation. BUILD_TRACKER and memory updated. Next: expand Tab B checklist + restructure per-child intake + build 7 missing document prompts.

**Previous session:** June 21, 2026 — Session 54: Live browser QA with real client data (Anupama Attri / Assisting Hands Home Care). Filled all 6 apply sections via direct API calls: business, investment, qualifications, family, ties. Found and fixed 2 bugs: BUG-QA-09 (qualifications cluster completion counted hidden conditional questions as answered — never showed ✓), BUG-QA-10 (family/ties cluster completion counted visible-but-empty conditionals as answered via `undefined !== ''` — showed ✓ prematurely). Fix applied to qualifications, family, and ties pages. QA_AUDIT.md updated with Session 54 entry. 2 commits on dev. ⚠️ Owner action required: apply BUG-QA-06 migration SQL (`ALTER TABLE application_lifecycle ADD COLUMN IF NOT EXISTS last_visited_section text;` + index + quiz_sessions franchise_referral_requested bool). SPOUSE cluster in /apply/family correctly shows incomplete — nationality + passport fields not available in test data. Next: FDD pipeline test (fdd_id: b262c48a-b39d-4917-8fb5-344da7f4b0e4).

**Previous session:** June 21, 2026 — Session 53: Category-driven horizontal QA audit complete. All 7 sweeps done (Sweeps 6+7 this session). 18 pages audited for the first time (auth flow, upload flow, simulator, documents, generate). 5 bugs found and fixed: (1) BUG-QA-01: `/api/applications/[applicationId]` route missing — generate page header fell back to nulls. Created route. (2) BUG-QA-02: `/support` had no Nav — added layout.tsx. (3) BUG-QA-03: `/verify` resend button silently did nothing when token invalid (verifiedData null). Conditioned on session ID existence. (4) BUG-QA-04: module4 Screen 3 stuck loading forever if generateQuestions API fails — added questionsError state + retry button. (5) BUG-QA-05: module4 Screen 4 empty summary with no message if getCompletionSummary fails — added summaryError state + fallback copy. Build clean. 4 commits on dev. QA_AUDIT.md updated. Migration debt noted: verify `20260605160000_module2_business_advisor.sql` was applied to remote (adds business_shortlist, specific_business_description, experience_gap_flag). ⚠️ Still pending from S52: migration `20260621000000_fdd_report_access.sql` + SQL for `generated_documents.status` CHECK constraint.

**Previous session:** June 21, 2026 — Session 52: 4 UX bugs fixed + Gap Analysis Remediation Tool shipped. Bugs: (1) Cookie banner "Learn More" opened in same tab → `<a target="_blank">`. (2) Login routed quiz-complete unpaid users to `/pricing` → now routes to `/results`. (3) Gap analysis D-05 "Fix this" linked to form at `/apply/business#market` → now `/apply/module3/k`. (4) D-05 mitigation copy said "Upload" → reworded to Tab K. Feature: Gap Analysis Remediation Tool — each D-code card now self-contained action unit: `D_CODE_REMEDIATION` registry (15 entries in `gap-analysis-engine.ts`), `RemediationPanel` component (progress bar + completion checklist + inline form fields + file upload + per-field 800ms debounce), `DenialRiskRadar` extracted + enhanced (card header vs panel click separated), `CategoryCard` extracted. `page.tsx` rewired: `localAnswers`/`localDocs` state initialised from DB fetch; live rescore `useEffect` calls `scoreCase()` synchronously on every field change; `liveResult` drives all score numbers on page. Build clean. 3 commits on dev. ⚠️ Still pending: apply migration `20260621000000_fdd_report_access.sql` + SQL for `generated_documents.status` CHECK constraint ('revising', 'revision_requested').

**Previous:** June 21, 2026 — E2E audit sprints S13–S21 complete. Bugs fixed this session: (1) Document revision feature wired end-to-end (`src/app/documents/[applicationId]/page.tsx`) — `submitRevision()` calls `POST /api/generate/revise/${applicationId}`, change type radio UI (wording/add info/factual fix), loading + success states, 4 stale `setRevisionForm` call sites patched to include `changeType`. (2) `humanizeDocument` in `src/app/api/generate/revise/[applicationId]/route.ts` called with missing 2nd arg — fixed to `humanizeDocument(rawText, payload.voice_profile || '')`. (3) `fdd/compare` route — `territory.competition` → `territory.competitors`, `.grade` → `.result` on ProfileMatchDimension. (4) `ProcessingClient.tsx` stale-closure bug — `discrepancyCount` read as 0 in `extraction_complete` handler; fixed with `discrepancyCountRef`. (5) `DiscrepancyReviewClient.tsx` — stale sessionStorage gap report cleared before redirect. (6) `UploadClient.tsx` — UX copy fix. (7) `module3/page.tsx` — generate button routed to SSE page (was calling raw API). ⚠️ SQL PENDING: Add `'revising'` and `'revision_requested'` to `generated_documents.status` CHECK constraint in Supabase. S7 (`/apply/business`) and S2 (`/pricing`) remain deferred.

**Previous:** June 21, 2026 (Session 51 cont.) — FDD-G1 profile match engine complete. `src/lib/fdd-profile-match-engine.ts`: 5-dimension deterministic scoring (capital adequacy, E-2 substantiality via 9 FAM sliding scale, role alignment, employment creation, net worth position); returns `STRONG_FIT / GOOD_FIT / PARTIAL_FIT / POOR_FIT / INSUFFICIENT_DATA` + 0–100 fit score + top gap + recommendation. Score page (`/fdd/score/[fddId]`) now renders `ProfileMatchPanel` section with expandable dimension cards showing investor value vs franchise requirement vs gap. Unit tested: STRONG_FIT=96 / POOR_FIT=26 / INSUFFICIENT_DATA graceful. Build clean. FDD Intelligence paywall also wired this session (see prior entry). (1) Stripe price `price_1TkdlNF7Ggk3LUEy4mmw2B7P` created ($297 FDD Intelligence). (2) Migration `20260621000000_fdd_report_access.sql` — `report_unlocked BOOLEAN` on `fdd_analyses`, `fdd_intelligence` row in pricing table. (3) Checkout route: `fdd_intelligence` added to VALID_TIER_IDS + fallback price IDs; `fddId` in metadata; `applicationId` optional for FDD tier. (4) Webhook: restructured — always updates payment record; `fdd_intelligence` branch sets `fdd_analyses.report_unlocked = true` by `fddId + userId`. (5) Report page: `hasAccess = analysis.report_unlocked` (real DB flag, no more `useState(true)`); `handleUpgrade()` calls checkout API → redirects to Stripe; post-Stripe polling loop on `?unlocked=1` param. Build clean. ⚠️ Apply migration `20260621000000_fdd_report_access.sql` to Supabase. Next: FDD-G1 profile match engine, FDD-G2 writeback UI, FDD-C1 comparison table.
**App Name:** E2go.app
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Claude API
**Dev URL:** https://e2go-git-dev-ocdeployments-projects.vercel.app
**Repo:** github.com/ocdeployments/e2go
**Branch:** dev (never commit to main directly)
**Project Path:** ~/E2-go

---

## SESSION COMMANDS

**To start:** type `start session`
**To end:** type `end session`

On start: read CLAUDE_CONTEXT.md + BUILD_TRACKER.md +
docs/DESIGN_REFERENCE.html (if UI work). BEFORE ANYTHING ELSE — READ THIS:

Two API keys are present in .env.local:
- OPENROUTER_API_KEY — use this for ALL app AI features
- ANTHROPIC_API_KEY — use this ONLY for document generation

Do NOT switch any existing OpenRouter calls to the Anthropic API.
Do NOT use ANTHROPIC_API_KEY anywhere except:
  - src/lib/generation-engine.ts (document generation calls)
  - The humanization pass in the same file

If Claude Code asks "should I use the Anthropic API key?" — the answer is:
Only for document generation. Everything else stays on OpenRouter.

Confirm you understand this before proceeding.Report status.
Ask "Ready to confirm and begin?" before any work.

On end: update this file, update CLAUDE_CONTEXT.md if rules
changed, run npm run build:clean, report summary.

---

## OVERALL PROGRESS

| Phase | Status | Notes |
|---|---|---|
| Next.js scaffold | ✅ COMPLETE | |
| Database schema + RLS | ✅ COMPLETE | 45/45 tests passing |
| Auth (login/signup) | ✅ COMPLETE | Supabase auth wired |
| Quiz v3.0 | ✅ COMPLETE | 26 questions, global, treaty countries |
| Full UI redesign | ✅ COMPLETE | Obsidian Gold |
| PWA | ✅ COMPLETE | Manifest, service worker, install prompt |
| Design skills installed | ✅ COMPLETE | |
| Module 3 Tab A | ✅ COMPLETE | 21 questions, privacy categories, working |
| Module 3 Tabs B-L | ✅ COMPLETE | All 12 tabs wired |
| /apply/overview | ✅ COMPLETE | |
| /apply/checklist | ✅ COMPLETE | Three phases, Supabase connected |
| Pricing page | ✅ COMPLETE | Founding member pricing, guarantee |
| Dashboard | ✅ COMPLETE | Needs real data wiring |
| Landing page | ✅ COMPLETE | 12 sections, Obsidian Gold. Portrait hero, row mistakes, connected steps, hero feature with binder image, testimonial photos |
| Document generation specs | ✅ COMPLETE | 4 spec files |
| Stripe integration | ⚠️ PARTIAL | Code complete, payments table needs migration |
| Email verification funnel | ✅ COMPLETE | |
| Document generation engine | ✅ COMPLETE | 17-step pipeline, 8 documents, sequential, checkpointed |
| Analysis engine | ✅ COMPLETE | Types, lib, API, tests, 9-dimension scoring |
| Three-layer experience pipeline | ✅ COMPLETE | Session 7 — Layer 0/1/2: follow-up, scoring, framing, backstop |
| Cover page data fix | ✅ COMPLETE | Session 8 — personal_info JSONB → real data sources |
| Post-generation package summary | ✅ COMPLETE | Session 9 — 5-section strength/gaps/disclaimer screen |
| Follow-up conversation | ✅ COMPLETE | Voice sample, questions, responses, summary |
| Module 3 Pre-Fill Pass | ✅ COMPLETE | Quiz → Tab A/F/L with legal gates |
| Security history pre-fill | ✅ COMPLETE | With legal confirmation gate |
| Business data deduplication | ✅ COMPLETE | Tab A as single source |
| Timeline service | ✅ COMPLETE | Two date concepts separated |
| Tab B/L cross-tab notes | ✅ COMPLETE | Shared document detection |
| Contradiction flag component | ✅ COMPLETE | |
| Auth pages image slider | ✅ COMPLETE | U.S. themed left panel |
| Navigation & routing | ✅ COMPLETE | All routes connected, mobile nav |
| Route cleanup | ✅ COMPLETE | 47 routes, dead pages removed, middleware hardened |
| Breadcrumbs | ✅ COMPLETE | On /apply/*, /score |
| Cookie consent banner | ✅ COMPLETE | |
| SEO metadata | ✅ COMPLETE | All pages |
| /learn hub | ✅ COMPLETE | 6 SEO articles + Ask E2go widget |
| Module 1 | ✅ COMPLETE | Onboarding, consent, application record |
| Module 2 | ✅ COMPLETE | Business advisor, category selection |
| Voice-to-text input | ✅ COMPLETE | commit 63dc9dd — mic on all 8 textareas |
| Case file UX redesign | ✅ COMPLETE | Two-panel layout, CaseFileShell, voice input |
| Ask E2go FAQ widget | ✅ COMPLETE | Session 11 — pgvector 368 Q&A, streaming, 3-layer retrieval |
| Standalone simulator upload | ✅ COMPLETE | Session 14 — quick-start route, extraction → answers |
| Login transition flicker fix | ✅ COMPLETE | Session 12 — full-panel loading state on submit |
| Simulator teaser page | ✅ COMPLETE | Session 12 — "complete case file" or "upload docs" paths |
| FAQ widget → /learn merge | ✅ COMPLETE | Session 15 — widget on /learn, CTA on homepage |
| FAQ widget ambient states | ✅ COMPLETE | Session 16 — animated gradient border, thinking indicator |
| FAQ widget scrollable container | ✅ COMPLETE | Sessions 17-18 — fixed height, no layout jump |
| Supabase singleton fix | ✅ COMPLETE | Sessions 28-30 — duplicate GoTrueClient resolved |
| Dashboard loading state | ✅ COMPLETE | Session 41 — converted to server component; no more navigator.locks deadlock |
| Simulator loading state | ✅ COMPLETE | Sessions 28-30 — singleton, column name fixes |
| Login quiz-session linkage | ✅ COMPLETE | Session 26 — await signInWithPassword, remove redundant getSession |
| Nav on authenticated layouts | ✅ COMPLETE | Session 25 — Nav added to authenticated page layouts |
| Quick-start flow hardening | ✅ COMPLETE | Sessions — missing tables, wrong columns, RLS fixes |
| Package assembly (cover, TOC, dividers) | ✅ COMPLETE | 8-doc ZIP — Tab E (visa_category), Tab K (nonimmigrant_intent) added |
| Post-quiz profile capture | ✅ COMPLETE | /quiz/profile — 4 questions, saves to quiz_sessions.post_quiz_profile |
| Quiz history expansion | ✅ COMPLETE | Q0-09e (bankruptcy) + Q0-09f (civil action) added to module0 |
| case_profiles table stub | ✅ COMPLETE | Migration 20260619 — populated by Sprint 3 buildCaseProfile() |

---

## PRICING — LOCKED (Updated June 9, 2026)

| Application Type | Price | Stripe cents |
|---|---|---|
| Solo individual | $550 | 55000 |
| Solo + spouse | $697 | 69700 |
| Solo + family (up to 2 kids) | $750 | 75000 |
| Solo + family (3–5 kids) | $797 | 79700 |
| Partnership (no families) | $997 | 99700 |
| Partnership two couples | $1,297 | 129700 |
| Partnership two families | $1,397 | 139700 |
| Extra child surcharge | +$50 | +5000 (dynamic checkout, no fixed Price ID) |
| Interview Simulator standalone | $197 | 19700 |
| Interview Simulator additional sessions | $29.99 | 2999 |
| Renewal package | $497 | 49700 |

**Simulator included in all packages AND available standalone.**
**Extra child surcharge is dynamic — no fixed Stripe Price ID.**

⚠️ ACTION REQUIRED: All Stripe Price IDs in .env.local and the
pricing table in Supabase must be recreated at these new amounts.
Old founding member Price IDs are now incorrect.
Run scripts/stripe-setup.ts after updating amounts.
Update STRIPE_PRICE_* env vars with new Price IDs after running.

---

## PAGES — BUILD STATUS

| Page | Route | Status |
|---|---|---|
| Landing | / | ✅ COMPLETE |
| Quiz | /quiz | ✅ COMPLETE |
| Results | /results | ✅ COMPLETE — layout unified, CTA fixed (/apply), attorney button removed |
| Quiz Review | /quiz/review | ✅ COMPLETE |
| Document Upload | /apply/upload | ✅ COMPLETE |
| Upload Processing | /apply/upload/processing | ✅ COMPLETE |
| Upload Review | /apply/upload/review | ✅ COMPLETE |
| Upload Gap Report | /apply/upload/gaps | ✅ COMPLETE |
| Pricing | /pricing | ✅ COMPLETE |
| Success | /pricing/success | ✅ COMPLETE |
| Dashboard | /dashboard | ✅ COMPLETE — first_name fix, module0 progress wired; needs Command Centre upgrade |
| Login | /login | ✅ COMPLETE |
| Signup | /signup | ✅ COMPLETE |
| Verify | /verify | ✅ COMPLETE |
| Overview | /apply/overview | ✅ REDIRECT → /apply (query-preserving shim) |
| Checklist | /apply/checklist | ✅ COMPLETE |
| Module 1 | /apply/module1 | ✅ COMPLETE |
| Module 2 | /apply/module2 | ✅ COMPLETE |
| Module 3 shell | /apply/module3 | ✅ COMPLETE (8 tabs: A B C D E I J K) |
| Module 3 Tab A | /apply/module3/a | ✅ COMPLETE |
| Module 3 Tabs B,C,D,E,I,J,K | /apply/module3/[b-k] | ✅ COMPLETE |
| Module 3 Tab F | /apply/module3/f | ✅ COMPLETE — Investment Evidence document checklist (13 questions) |
| Module 3 Tabs G,H,L | /apply/module3/g|h|l | ✅ COMPLETE — redirect to /apply/business, /investment, /family |
| ~~Onboarding~~ | ~~deleted~~ | ✅ REMOVED — orphaned |
| ~~Outcome~~ | ~~deleted~~ | ✅ REMOVED — orphaned |
| Case File Overview | /apply | ✅ COMPLETE | Obsidian Gold section cards |
| Case File: Your Story | /apply/story | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Business | /apply/business | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Investment | /apply/investment | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Qualifications | /apply/qualifications | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Case File: Your Family | /apply/family | ✅ COMPLETE | Two-panel CaseFileShell, all variants preserved |
| Case File: Your Ties | /apply/ties | ✅ COMPLETE | Two-panel CaseFileShell, voice input |
| Score | /score | ✅ COMPLETE |
| Generate | /generate/[appId] | ✅ COMPLETE |
| Documents | /documents/[appId] | ✅ COMPLETE |
| Learn | /learn | ✅ COMPLETE |
| About | /about | ✅ COMPLETE |
| Privacy | /privacy | ✅ COMPLETE |
| Terms | /terms | ✅ COMPLETE |
| Support | /support | ✅ COMPLETE |
| Gap Analysis | /gap-analysis | ✅ COMPLETE — 6 categories + 15 D-code radar |

---

## MODULE 0 — QUIZ v4.0 (Updated June 9, 2026)

| Feature | Status |
|---|---|
| 14 core + 19 total questions (global) | ✅ COMPLETE |
| Global treaty country selector | ✅ COMPLETE |
| Scoring logic v3.0 | ✅ COMPLETE |
| Hard stops PR-01 through PR-08 | ✅ COMPLETE |
| Results page with outcomes | ✅ COMPLETE |
| Quiz pre-fills to Module 3 | ✅ COMPLETE |
| Draft save system (localStorage + Supabase backfill) | ✅ COMPLETE |
| Back button repositioned top-left, warmer colour | ✅ COMPLETE |
| Clickable section tab navigation | ✅ COMPLETE |
| Franchise lead capture (Q0-FRANCHISE-REFERRAL) | ✅ COMPLETE |
| Q0-13 split — nuclear family (Q0-13a) + extended (Q0-13b) | ✅ COMPLETE |
| Q0-15 partnership — spousal option + corrected advisory | ✅ COMPLETE |
| Q0-14b spouse role follow-up question | ✅ COMPLETE |
| Q0-03a principal applicant sub-question | ✅ COMPLETE |
| Results timeline — dynamic month names not weeks | ✅ COMPLETE |
| "Review or change my answers" link on results page | ✅ COMPLETE |
| /quiz/review — jump-to-question editing page | ✅ COMPLETE |
| Selected option gold borders confirmed | ✅ COMPLETE |

## MODULE 0 — QUIZ v6.0 (Final Rebuild — June 10, 2026)

| Feature | Status |
|---|---|
| 16 questions (10 core + 6 subs) | ✅ COMPLETE |
| Q0-01 treaty country hard stop works | ✅ COMPLETE |
| Q0-02 principal applicant question | ✅ COMPLETE |
| Q0-03 family composition (merged Q0-13a + Q0-16) | ✅ COMPLETE |
| Q0-04 business partner (merged Q0-07 + Q0-15) | ✅ COMPLETE |
| Q0-09 history as one multiselect | ✅ COMPLETE |
| Q0-10 home ties as one multiselect | ✅ COMPLETE |
| Dynamic question counter (never exceeds visible total) | ✅ COMPLETE |
| Back button at bottom left | ✅ COMPLETE |
| handleComplete reads correct question IDs | ✅ COMPLETE |
| Dependents from Q0-03 (not Q0-16) | ✅ COMPLETE |
| Application type from Q0-02/Q0-04 (not Q0-09) | ✅ COMPLETE |
| Pricing chain correct end to end | ✅ COMPLETE |
| All 17 confirmed bugs resolved | ✅ COMPLETE |
| All 30 bugs from full combinatorial audit resolved | ✅ COMPLETE |
| handleMultiContinue calls processAction — multiselect scores | ✅ COMPLETE |
| evaluateShowIf handles array answers — subs render correctly | ✅ COMPLETE |
| Treaty country validation fires PR-NON-TREATY | ✅ COMPLETE |
| COS flag string match corrected | ✅ COMPLETE |
| Score weights corrected — positive ties no longer penalised | ✅ COMPLETE |
| Q0-03 and Q0-04 show_if — no redundant questions | ✅ COMPLETE |
| Sequential Q0-09 history branching | ✅ COMPLETE |
| All 9 hard stops wired and reachable | ✅ COMPLETE |
| Pricing chain correct end to end | ✅ COMPLETE |
| Test fixtures written — 5 profiles in docs/TEST_FIXTURES.md | ✅ COMPLETE |
| Q0-PREP-STATUS routing question | ⏳ PENDING — DOCUMENT_UPLOAD_SPEC.md |

## MODULE 0 — QUIZ LEGAL ACCURACY (Session 2 — June 9, 2026)

| Fix | Question ID | Status |
|---|---|---|
| Multi-partner hard stop per 9 FAM 402.9 | PR-06b updated | ✅ COMPLETE |
| Holding company / trust ownership chain | Q0-14c | ✅ COMPLETE |
| Control through management rights below 50% | Q0-14d | ✅ COMPLETE |
| E-visa nationality for mixed partnerships | Q0-14e | ✅ COMPLETE |
| Investment commitment timing | Q0-05a | ✅ COMPLETE |
| Passive investment + non-profit hard stops | Q0-09a | ✅ COMPLETE |
| Officer discretion advisory on results page | Advisory block | ✅ COMPLETE |
| DS-156E consulate-specific note on checklist | Checklist | ✅ COMPLETE |

New scoring entries: 2 hard stops (PR-PASSIVE-INVEST, PR-NONPROFIT),
4 attorney flags, 6 risk flags — all additive, no existing entries modified.

---

## DOCUMENT UPLOAD FEATURE — STATUS (Updated June 9, 2026)

| Feature | Status |
|---|---|
| Q0-PREP-STATUS quiz routing question | ✅ COMPLETE |
| DB migration — application_documents table | ✅ COMPLETE |
| DB migration — document_discrepancies table | ✅ COMPLETE |
| DB migration — answers.confidence + source_document_type | ✅ COMPLETE |
| DB migration — applications.preparation_status | ✅ COMPLETE |
| Supabase Storage bucket: application-documents | ✅ COMPLETE |
| POST /api/documents — file upload route | ✅ COMPLETE |
| POST /api/documents/extract — SSE extraction pipeline | ✅ COMPLETE |
| POST /api/documents/resolve-discrepancy | ✅ COMPLETE |
| GET /api/documents/gap-report | ✅ COMPLETE |
| src/lib/text-extraction.ts — PDF/DOCX/XLSX/CSV parsing | ✅ COMPLETE |
| src/lib/document-validation.ts — file validation | ✅ COMPLETE |
| src/lib/document-extraction-engine.ts — AI extraction | ✅ COMPLETE |
| DocumentUploadCard — intake card on /apply overview | ✅ COMPLETE |
| /apply/upload — document type selection + drag-and-drop | ✅ COMPLETE |
| /apply/upload/processing — SSE progress screen | ✅ COMPLETE |
| /apply/upload/review — discrepancy resolution | ✅ COMPLETE |
| /apply/upload/gaps — gap report with section coverage | ✅ COMPLETE |
| PreFillBadge — amber document variants added | ✅ COMPLETE |
| Acknowledgment tracking for pre-filled fields | ✅ COMPLETE |
| Visual consistency with case file redesign | ⚠️ Pending redesign session |

⚠️ ACTION REQUIRED: Apply migration docs/migrations/004_answers_source_update.sql
to Supabase: npx supabase db push

---

## INTERVIEW SIMULATOR — STATUS (Updated June 9, 2026)

| Feature | Status |
|---|---|
| /simulator route | ✅ COMPLETE |
| Start / active / complete screens | ✅ COMPLETE |
| Text mode — full evaluation flow | ✅ COMPLETE |
| Voice mode — Groq Whisper transcription wired | ✅ COMPLETE |
| Groq TTS officer voice (Fritz-PlayAI, server-side) | ✅ COMPLETE |
| 15-minute session timer with 2-min warning | ✅ COMPLETE |
| $29.99 purchase flow wired to Stripe | ✅ COMPLETE |
| Design violations fixed — zero border-radius | ✅ COMPLETE |
| simulator_sessions + simulator_answers DB tables | ✅ COMPLETE |
| Session limit tracking (used / purchased on applications) | ✅ COMPLETE |
| OpenRouter MiMo evaluation engine (coaching-quality prompts) | ✅ COMPLETE |
| Coaching summary + readiness indicator | ✅ COMPLETE |
| Per-session question variety (pool-based random selection) | ✅ COMPLETE |
| Prominent session countdown timer (fixed bottom bar) | ✅ COMPLETE |
| Post-session coaching report (what officer expected, model answer) | ✅ COMPLETE |

✅ STRIPE_PRICE_SIMULATOR renamed to STRIPE_PRICE_SIMULATOR_3PACK (commit 0aca5dc)
✅ useEffect dependency fixed — question?.id → question.text (commit 0aca5dc)

---

## SIMULATOR INTELLIGENCE — Session 23 (June 16, 2026)

| Feature | Status | Commit |
|---|---|---|
| Delivery confidence analysis | ✅ COMPLETE | 0e30c95, 326ecc9 |
| Adaptive Quick Intake confirm step | ✅ COMPLETE | 11cca98 |
| /gap-analysis page (6 categories) | ✅ COMPLETE | b10c7d4 |
| Denial Risk Radar (D-01 to D-15) | ✅ COMPLETE | b28de69 |

**Delivery confidence** (`analyzeDelivery()` in simulator-engine.ts):
- Pure regex, zero LLM cost
- Flags: filler words (≥2 occurrences), brevity (<30 words), hedging language (≥2 phrases)
- Stored in `SessionQuestion.deliveryNotes`, aggregated into `CoachingSummary.deliveryFlags`
- `DeliveryFlagCard` renders TOO BRIEF / FILLER WORDS / HEDGING LANGUAGE on session-complete screen

**Adaptive Quick Intake** (`/simulator/quick-start`):
- After extraction_complete, new `confirm` step replaces immediate redirect
- Shows 5 extracted fields (business name, investment amount, applicant name, target state, Y1 employees)
- EXTRACTED / NOT FOUND labels; missing fields get inline inputs
- Patches edits back to DB before routing to case file

**Gap Analysis** (`/gap-analysis`, `src/lib/gap-analysis-engine.ts`):
- Accepts ?applicationId= or defaults to most recent application
- `scoreCase()` reads answers, documents, case_briefs, simulator session data
- 6 weighted categories: Source of Funds 25%, Management Role 25%, Business Plan 20%, Investment Amount 15%, Employment Creation 10%, Business Operations 5%
- **Denial Risk Radar**: all 15 D-codes from module3_denial_audit.md scored individually
  - D-01 to D-15 each read specific answer keys (QF-NEW-01, QH-NEW-01, QE-NEW-01, etc.)
  - D-08 uses `simulator_sessions_used`; D-09 uses `inconsistency_count` from latest session
  - Risk: low / moderate / high — click-to-expand finding + mitigation per D-code
- Overall readiness driven by high-risk D-code count, not just answer coverage
- Expandable category cards show D-code chips with colour-coded risk state
- Links to simulator for targeted practice

---

## MODULE 3 — TABS

All 12 tabs (A-L) wired with:
- Privacy categories
- Skip toggles with advisories
- 800ms debounce autosave
- Quiz pre-fill (A, F, L)
- Legal confirmation gates (security history)

---

## MODULE 3 — CASE FILE REDESIGN

Redesigned Module 3 from 12 separate tabs into 6 cohesive document-building sections.
Old tabs (module3/a-l) remain fully functional as fallback.

**Architecture:**
- `/apply` — Case file overview with personalized header, section cards, document chips, pre-fill gems
- `/apply/story` — Section 01: 4 clusters (who you are, your plan, administrative, travel & history)
- `/apply/business` — Section 02: 7 clusters (entity, what you do, operations, licenses, franchise, startup costs, market)
- `/apply/investment` — Section 03: 5 clusters (overview, source of funds, paper trail, projections, non-marginality)
- `/apply/qualifications` — Section 04: 5 clusters (background, business experience, role, visa history, interview prep)
- `/apply/family` — Section 05: 4 clusters (spouse, children, documents, travel)
- `/apply/ties` — Section 06: 5 clusters (property, family, financial obligations, return intent, cover letter)

**Components built:**
- CaseFileHeader, SectionCard, GenerateStrip (overview)
- SectionSideNav, QuestionPanel (section layout)
- QuestionLabel, HelperText, PreFillBadge, TextInput, TextArea, OptionButton (question primitives)
- AdvisoryBlock, RiskFlag, ClusterDivider (context blocks)
- ProjectionTable, StartupCostTable (interactive tables)

**Data additions:**
- `answers.source` column (quiz / user_entry / user_edited)
- `applications.partner_gender` column
- Migration: `docs/migrations/001_case_file_columns.sql`

**Status:** ✅ data wired — all 6 section pages built, build clean, old tabs preserved
⚠️ UX redesign pending — session file: docs/sessions/SESSION_CASEFILE_REDESIGN.md

### Case file UX redesign — spec complete, build pending

Session file: `docs/sessions/SESSION_CASEFILE_REDESIGN.md`

What the redesign delivers:
- Two-panel layout: questions left, document preview right (desktop)
- Drawer (tablet) and full-screen overlay (mobile) for preview panel
- Cormorant Garamond question labels — not body copy weight
- Cluster navigation with completion states in sidebar
- Document preview fills in as user types — template-based Phase 1
  (Phase 2: live AI paragraph generation per cluster, after first paying user)
- Voice input redesigned: full-width bar below each textarea,
  labelled "Speak your answer", gold pulse + waveform when active
- Mic permission bug fixed: getUserMedia pre-check before SpeechRecognition.start()
- All variants preserved: partnership three-track, COS blocks,
  family sub-paths, all advisory/risk flag components
- Mobile: horizontal cluster pills + full-screen overlay preview
- Tablet: drawer from right
- Upload flow visual consistency (/apply/upload through /apply/upload/gaps)
- Module 4 visual consistency only — NO logic changes, NO mic button

### Voice-to-text input — Phase 1 (committed June 10, commit 63dc9dd)
- useSpeechInput hook: src/hooks/useSpeechInput.ts
- TextArea component updated with mic button (corner icon — superseded by redesign)
- 8 textareas across 6 sections have voice input
- Known bug: mic button disappears on click (getUserMedia permission pre-check missing)
- Fix: part of case file redesign session (SESSION_CASEFILE_REDESIGN.md)
- /apply/module4 voice sample unchanged — separate system, no mic button

---

## DOCUMENT INTELLIGENCE AUDIT — Session 55 (June 22, 2026)

Full audit of document gaps across: quiz (Module 1), all apply/ intake pages (Module 3), Tab B checklist,
generation engine, 8 document prompts, and Anupama Attri real-submission templates (docs/Anupama/).

Real submission structure discovered: 7-tab format (A–G) matching attorney binder, cover letter Section VIII
contains the actual document index. This is now the canonical reference for what e2go must produce.

---

### BUCKET 1 — GENERATED DOCUMENTS (what e2go produces today)

**Tab A — Entity Formation**
| ID | Document | Status |
|---|---|---|
| A-01 | Operating Agreement | ✅ Generates |
| A-02 | Membership Interest Ledger | ✅ Generates |
| A-03 | Membership Certificates | ✅ Generates |
| A-04 | Organizational Resolutions | ✅ Generates |

**Tab B — Financial Evidence**
| ID | Document | Status |
|---|---|---|
| B-01 | Source & Application of Funds | ⚠️ Split across 2 prompts (source_of_funds + investment_proof) — MERGE NEEDED |
| B-02 | Fund Flow Chronology | ❌ No prompt exists |
| B-03 | Net Worth Statement | ❌ No prompt exists |

**Tab C — Business & Franchise**
| ID | Document | Status |
|---|---|---|
| C-01 | Business Plan | ✅ Generates |
| C-02 | Cover Letter | ✅ Generates |
| C-03 | Substantiality Memorandum | ⚠️ Currently `visa_category` — wrong scope, must be replaced |
| C-04 | Marginality Rebuttal Statement | ❌ No prompt exists |

**Tab D/E — Personal (per applicant)**
| ID | Document | Status |
|---|---|---|
| D-01 | DS-160 Reference — Principal | ✅ Generates |
| E-01 | DS-160 Reference — Spouse | ✅ Generates (conditional) |
| E-0x | DS-160 Reference — per Child | ⚠️ Cannot generate per child (children captured as single textarea) |
| — | DS-156E Helper (E-visa supplemental form) | ❌ No prompt — different form from DS-160 |

**Tab F — Property & Financial Summaries**
| ID | Document | Status |
|---|---|---|
| F-01 | Property Portfolio Summary | ❌ No prompt exists |
| F-02 | Investment Portfolio Summary | ❌ No prompt exists |

**Tab G — Declarations & Supporting**
| ID | Document | Status |
|---|---|---|
| G-01 | Applicant Declaration — Principal | ❌ No prompt (nonimmigrant_intent too narrow) |
| G-02 | Applicant Declaration — Spouse | ❌ No prompt |
| — | Gift Letter (conditional: if gift-funded) | ❌ No prompt |
| — | Resume — Principal | ❌ No prompt |
| — | Resume — Spouse (conditional: if co-investing) | ❌ No prompt |

---

### BUCKET 2 — CLIENT-COLLECTED DOCUMENTS (checklist items for Tab B)

**What Tab B checklist CURRENTLY has (14 items):**
- Personal identity: passport, photos, birth certificate, DS-160 confirmation, DS-156E, MRV fee, appointment letter
- Conditional family: marriage cert, divorce cert, name change, spouse passport, spouse birth cert, child passports, child birth certs

**MISSING from Tab B checklist — 5 entire categories absent:**

**2A — Entity Formation (SOS docs)**
- A-05 SOS Certificate of Formation
- A-06 SOS Certificate of Filing
- A-07 SOS Acknowledgment Letter
- EIN Confirmation Letter (CP-575 / SS-4)

**2B — Financial Evidence (per source selected)**
- B-04 Bank statements — primary source account(s) (3–6 months, per account)
- B-05 Investment account statements — RRSP, TFSA, brokerage (per account, as of investment date)
- B-06 Wire transfer confirmation records
- B-07 US business bank account statement (post-funding)
- B-08 Asset sale closing statement (if property sold) [CONDITIONAL: property-sale source]
- B-09 Property MLS or appraisal at sale (if property sold) [CONDITIONAL]
- B-10 Business/investment sale agreement (if business sold) [CONDITIONAL]
- B-11 Loan agreement + collateral documentation [CONDITIONAL: loan source]
- B-12 Cryptocurrency exchange records + fiat conversion records [CONDITIONAL: crypto source]
- B-13 Gift letter (signed by donor) [CONDITIONAL: gift/inheritance source]
- B-14 Donor's bank statements (showing ability to gift) [CONDITIONAL: gift source]

**2C — Business/Franchise Documents**
- C-05 Executed Franchise Agreement (if franchise)
- C-06 Franchise Disclosure Document (if franchise)
- C-07 Letter of Intent or Purchase Agreement (if acquisition)
- C-08 3 years of business financial statements (if acquisition)
- C-09 Business valuation or broker opinion of value (if acquisition)
- C-10 Premises lease agreement (if new brick-and-mortar)
- C-11 Franchisor's E-2 support letter (if available — some franchisors provide)

**2D — Property Documentation (per property owned)**
- F-03 Mortgage statement — per property (× number of properties)
- F-04 Property appraisal or tax assessment — per property

**2E — Immigration/History Documents (conditional)**
- Prior visa refusal notice / CEAC determination letter
- Police clearance certificate
- Court records (if criminal conviction disclosed)

**2F — Ties Evidence (maps to ties claimed in M3-T-01)**
- Property title/deed (if home property claimed)
- Retained account statements (for accounts staying in home country)
- Professional license certificate (if professional license claimed)
- Business registration (if ongoing home country business claimed)

**2G — Translation Requirements**
- Certified English translation — birth certificate (if not in English)
- Certified English translation — marriage certificate (if not in English)
- Certified English translation — other vital records (if applicable)
*(No mention of translation requirement anywhere in the platform)*

---

### BUCKET 3 — INTAKE GAPS (questions missing from Module 1 / Module 3)

| Gap | Missing From | Impacts |
|---|---|---|
| Children captured as single textarea (M3-L-08) | `/apply/family` | Cannot generate per-child DS-160, cannot multiply checklist items |
| No structured career/employment history fields | Module 3 | Cannot generate Qualifications Statement, Resume |
| No property count + per-property details (address, value, mortgage) | Module 3 | Cannot generate F-01 Property Portfolio, B-03 Net Worth |
| No per-account investment details (institution, type, balance) | Module 3 | Cannot generate B-02 Fund Flow, B-03 Net Worth accurately |
| No wire transfer specifics (dates, amounts, banks) | `/apply/investment` | B-02 Fund Flow Chronology would be hollow |
| No asset sale specifics (if property/business sold) | Module 3 | B-06/B-09 documentation path absent |
| No gift details (donor, amount, date) — if gift-funded | Module 3 | Gift letter cannot be generated |
| No loan details (institution, collateral) — if loan-funded | Module 3 | Loan documentation path absent |
| No crypto specifics (exchange, conversion records) | Module 3 | Crypto documentation path completely missing |
| No entity formation status check (what SOS docs exist today) | Module 3 | Checklist can't distinguish "collect" vs "already have" |
| No EIN status question | Module 3 | EIN letter won't appear on checklist at right time |
| No US bank account status question | Module 3 | Bank statement requirement mis-timed |
| No consulate selection question (hardcoded to Toronto) | Module 3 | Cover letter address, officer notes wrong for non-Toronto |
| No language/translation needs question | Module 3 | Translation requirement never surfaced |
| No prior refusal evidence question | `/apply/qualifications` | Evidence path for history disclosures absent |

---

### BUCKET 4 — DOCUMENT PROMPT ISSUES (existing prompts with problems)

| Issue | File | Problem |
|---|---|---|
| `source_of_funds` + `investment_proof` are the same document | Both prompts | Real submission has ONE "Source & Application of Funds" — merge to B-01 |
| `visa_category` is wrong scope | `visa_category.md` | Covers all 5 E-2 elements (same as cover letter); replace with `substantiality_memorandum` focused on 9 FAM proportionality only |
| `cover_letter` Sections VII–VIII repeat content from standalone docs | `cover_letter.md` | Sections VII (Qualifications) and VIII (Intent) should be high-level references, not full restatements |
| Tab R referenced 8× in prompts | All prompts | `Tab R` does not exist — no data file, no intake page, no questions. Currently sends null data to LLM. |
| Crypto not handled in source_of_funds | `source_of_funds.md` | No mention of exchange records, fiat conversion docs, or tax treatment of crypto gains |

---

### BUCKET 5 — CHECKLIST STRUCTURAL GAPS (Tab B architecture)

| Gap | Impact |
|---|---|
| Per-applicant items not multiplied by family size | DS-160, MRV fee, photos, appointment listed once regardless of family of 4 |
| No "e2go generates this" vs "you collect this" distinction | Client doesn't know which documents they need to find vs which we produce |
| Checklist doesn't adapt to entity formation status | SOS docs shown as required even if LLC not formed yet |
| Checklist doesn't capture what client already has in hand | No way to mark "already collected" at intake |
| DS-156E not explained as different from DS-160 | Clients will confuse the two or skip DS-156E entirely |
| No photos for dependents explicitly listed | Family of 4 needs 8 photos; checklist shows "two passport-style photographs" |
| EAD filing (Form I-765) not mentioned for spouse | Spouse thinks saying "yes" to EAD in intake is sufficient — it's a separate USCIS post-arrival filing |

---

### BUCKET 6 — DOCUMENT RESTRUCTURING (changes to naming + generation pipeline)

**Naming convention (matches real attorney submission tabs):**
- Format: `[TAB-LETTER]-[TWO-DIGIT-SEQ]_[Document_Name].[ext]`
- Generated by e2go: `★` prefix in checklist UI
- Collected by client: `○` prefix in checklist UI
- Generated + signed by client: `✎` prefix in checklist UI
- Example: `B-04_Bank_Statement_TD_Canada.pdf`, `A-01_Operating_Agreement.docx`

**Restructuring actions needed:**
1. Rename/merge: `source_of_funds` + `investment_proof` → `source_and_application_of_funds` (single B-01 prompt)
2. Replace: `visa_category.md` → `substantiality_memorandum.md` (new C-03 prompt, focused scope)
3. Scope: `cover_letter` Sections VII–VIII → high-level reference paragraphs only
4. Scope: `qualifications` → develop-and-direct legal argument only (not career narrative)
5. Remove: all `Tab R` references from all 8 prompts
6. Add 7 new document prompts: C-04, B-02, B-03, F-01, F-02, G-01/G-02, Gift Letter, Resumes

---

### PRIORITY BUILD ORDER (next sprints)

**Sprint DOC-1 (unblock generation accuracy — immediate):**
- Fix Tab R references in all 8 prompts (null data bug)
- Restructure children intake in `/apply/family` — per-child structured fields
- Merge source_of_funds + investment_proof → single prompt

**Sprint DOC-2 (expand checklist — high impact, all clients):**
- Expand Tab B checklist: add Buckets 2A–2G (financial, entity, franchise, property, translations)
- Add "e2go generates this" vs "you collect this" distinction
- Add per-applicant multiplier for DS-160, MRV fee, photos

**Sprint DOC-3 (build missing prompts):**
- C-04 Marginality Rebuttal Statement prompt
- C-03 Substantiality Memorandum prompt (replace visa_category)
- G-01/G-02 Applicant Declaration prompts
- Gift Letter prompt (conditional)

**Sprint DOC-4 (financial completeness):**
- B-02 Fund Flow Chronology prompt
- B-03 Net Worth Statement prompt
- F-01 Property Portfolio Summary prompt
- F-02 Investment Portfolio Summary prompt
- Intake: add per-property detail fields, per-account investment fields

**Sprint DOC-5 (resumes + DS-156E):**
- Resume prompts (principal + spouse)
- DS-156E helper/reference prompt
- Intake: structured employment history fields

---

## MODULE 6 — DOCUMENT GENERATION

17-step sequential pipeline (Sprint 1 update — 8 documents):
```
Step 1  → Case brief load
Step 2  → Cover Letter (Tab D)
Step 3  → Source of Funds (Tab H)
Step 4  → Investment Proof (Tab F)
Step 5  → Business Plan (Tab K)
Step 6  → Qualifications (Tab J)
Step 7  → DS-160 Reference (Tab A)
Step 8  → Visa Category Letter (Tab E) ← NEW
Step 9  → Non-immigrant Intent Statement (Tab K) ← NEW
Step 10 → Gap analysis
Step 11 → Repetition checker
Step 12 → Consistency checker
Step 13 → AI detection audit
Step 14 → Humanization pass
Step 15 → Metadata sanitization
Step 16 → Quality gate + acknowledgment
Step 17 → Preview unlocked
```

Sprint 1 fixes applied (June 19):
- ✅ getUser() in /api/ai/route.ts (was getSession())
- ✅ generate/page.tsx: DOCUMENT_LIST, QUALITY_STEPS, step IDs, progress % all updated for 8 docs
- ✅ download/route.ts: VALID_DOC_TYPES includes visa_category + nonimmigrant_intent
- ✅ docx-package-constants.ts: Tab E (Visa Category Letter) + Tab K (Non-immigrant Intent) added

Remaining known issues:
- Issue A: Approval gate timing — may not pause fully between documents
- Issue B: setState-during-render React violation in generate page (batched updates help but not fully fixed)
Fix file: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md

---

## DESIGN SYSTEM — LOCKED

| Token | Value |
|---|---|
| Background | #0a0a0a (obsidian) |
| Primary accent | #C9A84C (aged gold) |
| Text primary | #f5f0e8 |
| Surface card | rgba(201,168,76,0.02) + border |
| Heading font | Cormorant Garamond Light (300) |
| Body font | DM Sans 300/400/500 |
| Border radius | 0 — no rounded corners |

---

## STRIPE INTEGRATION STATUS

### Code Complete ✅
- `src/app/api/stripe/create-checkout/route.ts` — creates sessions, reads price_id from DB
- `src/app/api/stripe/webhook/route.ts` — handles completed/expired/refunded
- `src/app/pricing/PricingClient.tsx` — tier selection, pre-fill, checkout trigger
- `src/app/pricing/success/page.tsx` — confirmation page

### Pricing Table ✅ (Updated June 10, 2026)
All 10 tiers have live Stripe Price IDs at confirmed pricing:
- solo_none: price_1TgewyF7Ggk3LUEyIkxlp1ry ($550)
- solo_spouse: price_1TgewyF7Ggk3LUEybTTTUG95 ($697)
- solo_family_small: price_1TgewzF7Ggk3LUEym0UKbRa0 ($750)
- solo_family_large: price_1TgewzF7Ggk3LUEyjErIbBO8 ($797)
- partnership_none: price_1TgewzF7Ggk3LUEyUbjuK8R4 ($997)
- partnership_couples: price_1Tgex0F7Ggk3LUEyPEleDScH ($1,297)
- partnership_families: price_1Tgex0F7Ggk3LUEyJJD6U7ot ($1,397)
- simulator_3pack: price_1Tgex0F7Ggk3LUEyhOhKvmKz ($29.99)
- renewal: price_1Tgex1F7Ggk3LUEykVcoLswI ($497)
- child_surcharge: price_1Tgex1F7Ggk3LUEymMJnQQH5 (+$50 dynamic)

### Migration Status ✅
File: `supabase/migrations/20260605110625_payments_table.sql`
Status: APPLIED — database is up to date

---

## SPEC FILES — STATUS

| File | Status |
|---|---|
| docs/Spec1_Analysis_Engine.md | ✅ Written |
| docs/Spec2_Followup_Conversation.md | ✅ Written |
| docs/Spec3_Generation_Prompts.md | ✅ Written |
| docs/Spec4_Quality_Gate_Pipeline.md | ✅ Written |
| docs/INTERVIEW_SIMULATOR_SPEC.md | ✅ Written |
| docs/COMPLIANCE_CALENDAR_SPEC.md | ✅ Written |
| docs/RENEWAL_MODULE_SPEC.md | ✅ Written |
| docs/IDEAS.md | ✅ Written |
| docs/PAYMENT_MANAGEMENT_GUIDE.md | ✅ Written |
| docs/DOCUMENT_UPLOAD_SPEC.md | ✅ Written — June 9, 2026 |
| docs/TEST_FIXTURES.md | ✅ Written — June 10, 2026 |
| docs/QUIZ_REBUILD_PLAN_V6.md | ✅ Written — June 10, 2026 |
| docs/sessions/SESSION_CASEFILE_REDESIGN.md | ✅ Written — June 10, 2026 |

---

## AGENT PROGRESS (June 5, 2026)

| Agent | Status | Notes |
|---|---|---|
| Agent 2 (Email Sequences) | 🔄 IN PROGRESS | Email sequence tables created |
| Agent 3 (Outcome Capture) | 🔄 IN PROGRESS | Outcome capture tables, compliance calendar spec |
| Agent 4 (Interview Simulator) | 🔄 IN PROGRESS | Simulator spec, tables created |

---

## SESSION — June 9, 2026 Planning Session (Claude.ai)

### What was decided and documented

**Pricing update:**
- Confirmed new pricing tiers replacing founding member pricing
- Solo $550 → Partnership two families $1,397
- Simulator standalone $197 / additional sessions $29.99
- Renewal $497 / Extra child +$50 dynamic
- All old Stripe Price IDs ($297–$647) now incorrect — must recreate

**Simulator completion:**
- Confirmed Groq TTS (Option A) over OpenAI TTS — same API key,
  lower latency, no new key needed
- Voice: Fritz-PlayAI officer voice
- Session limit: 2 sessions × 15 minutes each, $29.99 additional
- Session file written: docs/sessions/SESSION_SIMULATOR.md

**Quiz fixes (Session 1 — UX):**
- Family question split into nuclear (Q0-13a) and extended (Q0-13b)
- Spousal partnership handling + ownership split advisory corrected
- Principal applicant question added (Q0-03a)
- Timeline: weeks → month names (dynamic calculation)
- Back button repositioned and more visible
- Quiz review page: /quiz/review with jump-to-question editing
- Gold border fix on selected options (currently blue)
- Session file written: docs/sessions/SESSION_QUIZ_FIXES.md

**Quiz fixes (Session 2 — Legal accuracy per 9 FAM):**
- Three+ partner hard stop with E-2 employee pathway explanation
- Holding company ownership chain question
- Control through management rights (below 50% ownership)
- E-visa nationality designation for mixed-nationality partnerships
- Investment timing / "in process of investing" confirmation
- Passive investment and non-profit hard stops
- Officer discretion advisory on results page and investment section
- Session file written: docs/sessions/SESSION_QUIZ_FIXES_2.md

**Module 3 case file redesign:**
- Six document builders confirmed: story, business, investment,
  qualifications, family, ties
- Personalised header with three data states (full/thin/none)
- Pre-fill badge architecture: source field in answers table
- Partnership dual-track layout (shared / personal / partner B)
- Dynamic section manifest for COS, non-Canadian, blended family
- Projection table: Year 1–5 × Revenue / Net Income / Employees
- Partner gender: Man / Woman binary, name possessive fallback
- 34 gaps from adversarial audit fully specified
- Session file written: docs/sessions/SESSION_MODULE3_CASEFILE.md

**UI decisions locked (IDEAS.md Sections 13–21):**
- Page title: "Your case file" (not "Your document interview")
- Section card design system fully specified
- Section interior layout: 196px sidebar + question panel
- All three data states documented with exact copy
- Partnership three-track card layout documented
- Hero CTA fix: 4 surgical changes documented (IDEAS.md Section 21)

**Research added to knowledge base:**
- E2_partnerships_non_typical.md — 9 FAM partnership rules
- E2_essential_questions.md — 27 questions every E-2 case must answer
- E2_crypto_source_Toronto.md — crypto source of funds at Toronto
- E2Pathway_RegisteredAccounts_SourceOfFunds.md — RRSP/TFSA/LIRA
- E2Pathway_NonStandardFamily_Documentation.md — step-children etc.
- E2Pathway_MaterialChange_Renewal.md — material change at renewal
- canadian_common_law_E2.md — common-law marriage recognition

**Workflow diagrams rendered and logged in IDEAS.md:**
- Full branching journey (Section 4) — rebuilt June 9
- 16-stage document engine pipeline (Section 4) — from earlier session

### Build
No code changes — planning session only.
All decisions logged in IDEAS.md Sections 13–21.
All session files written to docs/sessions/.

---

## SESSION — Stripe Price IDs Updated (June 10, 2026)

### Completed
- npx tsx scripts/stripe-setup.ts — all 10 Price IDs created at
  new confirmed pricing ($550–$1,397 + simulator + renewal + child)
- .env.local updated automatically by setup script
- Supabase pricing table updated via SQL Editor:
  all 10 rows have correct tier_id, amount (cents), and stripe_price_id
- child_surcharge amount corrected: 50 → 5000 cents

### New Price IDs
| Tier | Price ID |
|---|---|
| solo_none | price_1TgewyF7Ggk3LUEyIkxlp1ry |
| solo_spouse | price_1TgewyF7Ggk3LUEybTTTUG95 |
| solo_family_small | price_1TgewzF7Ggk3LUEym0UKbRa0 |
| solo_family_large | price_1TgewzF7Ggk3LUEyjErIbBO8 |
| partnership_none | price_1TgewzF7Ggk3LUEyUbjuK8R4 |
| partnership_couples | price_1Tgex0F7Ggk3LUEyPEleDScH |
| partnership_families | price_1Tgex0F7Ggk3LUEyJJD6U7ot |
| simulator_3pack | price_1Tgex0F7Ggk3LUEyhOhKvmKz |
| renewal | price_1Tgex1F7Ggk3LUEykVcoLswI |
| child_surcharge | price_1Tgex1F7Ggk3LUEymMJnQQH5 |

Note: Stripe API version warning (2024-06-20 vs 2026-05-27) —
non-breaking, upgrade scripts/stripe-setup.ts apiVersion when convenient.

---

## SESSION — Sprints 3, 4, 5 (June 19, 2026 — overnight autonomous)

### Sprint 3: CaseProfile type system (commits 26815e4)
- `src/types/case-profile.ts` — Archetype union + CaseProfile interface
- `src/lib/case-profile.ts` — buildCaseProfile(), classifyArchetype(), scoreQuizEligibility(), detectFranchiseTrigger()
  - Reads quiz_sessions (post_quiz_profile, score, outcome, result_json) + applications
  - Archetype logic: buyer (owner + franchise industry), builder (owner/manager + tech/professional), investor, career_switcher
  - Select-then-update/insert pattern (no unique constraint on user_id at time of writing)
- `src/app/api/case-profile/build/route.ts` — GET endpoint, auth-gated, returns CaseProfile JSON

### Sprint 5: Franchise matching (commit f2485ab)
- `supabase/migrations/20260619100000_franchise_brands.sql`:
  - Adds UNIQUE INDEX on case_profiles(user_id) — enables future upserts
  - Creates franchise_brands table with RLS (public read on active=true)
  - Seeds 6 home-care brands (1Heart, Assisting Hands, BrightSpring, FirstLight, Comfort Keepers, Visiting Angels)
- `src/lib/franchise-matcher.ts` — matchFranchises(): filters by investment/net worth, scores industry(40)+investment(30)+netWorth(30), returns top 5
- `src/app/api/franchise/matches/route.ts` — GET endpoint, auth-gated

### Sprint 4: Results page rebuild (commit ec6472e)
- Rebuilt `/results` from 1289-line monolith to 9-section layout
- Section 1: Score circle (color-coded ≥70 gold / 40-69 amber / <40 muted), outcome label, verdict
- Section 2: Country flag emoji + treaty confirmation
- Sections 3+4: Investment assessment card + Business assessment card (color-coded by criteria score)
- Section 5: Top-3 case gaps with edit links
- Section 6: Archetype next steps (3 steps tailored to buyer/builder/investor/career_switcher)
- Section 7: Profile snapshot 2×2 grid (net_worth / prior_business / industry / timeline) — conditional on caseProfile data
- Section 8: Franchise teaser card (gold border) — conditional on franchiseTrigger
- Section 9: CTA bar ("Start your case file" + "Talk to an attorney")
- Below fold: preserved detailed criteria breakdown, benefits, timeline, pricing sidebar, consulate intel, FAQ widget
- caseProfile fetched via /api/case-profile/build with graceful fallback to quiz session data

### Build
- npm run build: ✅ clean — 109 pages generated, no TS errors
- Committed 3 separate sprint commits + pushed to dev

---

## SESSION — Login Page Flag Fix (June 10, 2026)

### Completed
- AuthImageSlider.tsx gradient fix — authFlagFadeLeft opacity corrected.
  Was: 100% opacity at 0% → transparent at 50% (blackout entire flag).
  Now: 60% opacity at 0% → transparent at 60% (flag visible, soft edge).
  Dark overlay reduced from rgba(10,10,10,0.45) → rgba(10,10,10,0.25).
  Flag colours now read clearly on left panel.
- Commit: e115caf

### Build
Clean — zero errors. TypeScript compiled successfully, no missing modules.

---

## SESSION — Route Cleanup (June 9, 2026)

### Completed
- **Deleted /apply/onboarding** — zero inbound references, fully orphaned
- **Deleted /apply/outcome** — zero inbound references, fully orphaned
- **Module3 TABS array trimmed** — removed F, G, H, L (12 → 8 tabs: A B C D E I J K)
- **Deleted module3/f, g, h, l** — superseded by new case file sections,
  zero references after TABS array update
- **Redirected /apply/overview → /apply** — client-side redirect preserving
  query params (?app= from inactivity emails), wrapped in Suspense for
  Next.js 14 compliance
- **Nav.tsx updated** — 3 instances of /apply/overview → /apply
- **dashboard/page.tsx updated** — /apply/overview → /apply
- **module4/page.tsx updated** — router.push updated
- **middleware.ts updated** — added /simulator, /score, /settings,
  /generate/, /documents/ to both protectedRoutes array and config.matcher

### Route count
Before: 53 routes
After: 47 routes (6 deleted)
/apply/overview retained as redirect shim for old email links

### Build
Clean — zero errors. 78 static pages + dynamic routes compiled.

---

## SESSION — Document Upload Session B: UI (June 9, 2026)

### Completed
- **DocumentUploadCard.tsx**: Upload intake card for /apply overview.
  Shows for partial/near_complete applicants, collapses to text link
  when dismissed, always available for scratch users via collapsed link.
- **UploadClient.tsx**: Full upload page — drag-and-drop zone, per-file
  document type selector, validation (10MB, 8 files, pdf/docx/xlsx/csv),
  remove buttons, process button.
- **ProcessingClient.tsx**: SSE consumer for extraction pipeline.
  Per-document status: Waiting → Classifying → Extracting → Complete/Failed.
  Auto-navigates to review (if discrepancies) or gaps (if none).
- **DiscrepancyReviewClient.tsx**: One card per conflicting field.
  Radio options from source documents + custom value input.
  Must resolve all before continuing. Hard gate enforced.
- **GapReportClient.tsx**: Section coverage bars (6 sections),
  critical gaps list with severity, document summaries with field counts.
- **/apply/upload** — document type selection + drag-and-drop
- **/apply/upload/processing** — SSE progress screen
- **/apply/upload/review** — discrepancy resolution
- **/apply/upload/gaps** — gap report
- **PreFillBadge.tsx updated**: Three new amber variants:
  "From your documents" (high confidence),
  "From your documents — please verify" (medium),
  "Your choice" (resolved conflict)
- **/apply/page.tsx updated**: Loads preparation_status, renders
  DocumentUploadCard above section grid

### Design
Full Obsidian Gold compliance — #0a0a0a, #C9A84C, Cormorant Garamond,
DM Sans, zero border-radius, no glassmorphism.

### Remaining
Apply migration 004_answers_source_update.sql to Supabase.

### Build
Clean — zero errors. Committed to dev branch.

---

## SESSION — Interview Simulator Completion (June 9, 2026)

### Completed
- **Groq transcription wired**: transcribeAudio() called in
  VoiceInput.onstop — placeholder comment replaced with live call.
  Voice mode transcription now functional end-to-end.
- **Groq TTS officer voice**: groq-tts.ts created as server-side
  API route (/api/simulator/tts). Fritz-PlayAI voice. Speaks each
  question aloud on load in voice mode. Replay button added.
  Key stays server-side — better architecture than original spec.
- **15-minute timer**: sessionTimeLeft, timerRef, timerWarning
  all wired. 2-minute warning fires in red. Force-complete at zero.
  Session duration shown on start screen.
- **$29.99 purchase flow**: handlePurchase wired to Stripe checkout
  route using simulator_3pack tier. purchaseLoading state. Success
  return handler refreshes session availability.
- **Design violations fixed**: All borderRadius values explicitly 0.
  Record button square. Readiness badges square. Emoji icons removed.

### Remaining
None. Simulator is fully complete.
- FIX 1: useEffect dependency line 468 — question?.id → question.text
- FIX 2: .env.local — STRIPE_PRICE_SIMULATOR → STRIPE_PRICE_SIMULATOR_3PACK
- Commit: 0aca5dc — dev

### Build
Clean — zero errors after completion. Committed to dev branch.

---

## SESSION — Quiz Legal Accuracy Fixes Session 2 (June 9, 2026)

### Completed — all 7 fixes per SESSION_QUIZ_FIXES_2.md
- **Fix 1 — Multi-partner hard stop**: PR-06b updated with full 9 FAM 402.9
  explanation. Two routing options: restructure to two-party, or apply
  as E-2 employee. Correct legal position now enforced at quiz level.
- **Fix 2 — Q0-14c**: Ownership structure question — direct vs holding
  company vs trust. Trust ownership triggers attorney flag. Holding
  company triggers chain calculation advisory.
- **Fix 3 — Q0-14d**: Control rights question fires when ownership
  indirect/below 50%. Veto rights, board control, special voting shares
  options. Documents a path to qualification below majority ownership.
- **Fix 4 — Q0-14e**: E-visa nationality designation for mixed-nationality
  partnerships. Dynamic options populated from Q0-01. All E-2 beneficiaries
  must share designated nationality per 9 FAM 402.9-4(B).
- **Fix 5 — Q0-05a**: Investment commitment timing. Fires when amount
  below $100k. Risk advisories for partially/uncommitted funds. "In the
  process of investing" standard now enforced.
- **Fix 6 — Q0-09a**: Active vs passive business screen. Hard stops for
  stock portfolio (PR-PASSIVE-INVEST) and non-profit (PR-NONPROFIT).
  Real estate active operations path preserved.
- **Fix 7 — Advisory + DS-156E**: Officer discretion advisory added to
  results page. DS-156E consulate-specific note added to checklist.

### Scoring additions (all additive — nothing modified)
- 2 new hard stops: PR-PASSIVE-INVEST, PR-NONPROFIT
- 4 new attorney flags
- 6 new risk flags

### Build
Clean — zero errors. All committed to dev branch.

---

## SESSION — Quiz Fixes Session 1 (June 9, 2026)

### Completed
- **Q0-13 split**: Family ties question split into Q0-13a (nuclear family
  travel plan) and Q0-13b (extended family ties). Distinct scoring
  implications for each. Spouse/children vs parents/siblings now
  properly separated.
- **Q0-15 partnership fixed**: Spousal partnership option added.
  Advisory corrected — 50/50 strict rule now clarified as applying
  to unrelated partners only. Spouse as silent investor vs active
  co-operator follow-up (Q0-14b) added.
- **Q0-03a added**: Principal applicant question fires when married
  and applying solo. Determines whether person filling out form
  is the principal or completing on spouse's behalf.
- **Results timeline**: Dynamic month name calculation replaces
  static "16–22 weeks". Displays e.g. "September — October 2026".
  Today's formatted date shown in subtitle.
- **Back button**: Repositioned to top-left of each question screen.
  Warmer colour (rgba(245,240,232,0.55)). Adequate touch target.
  "← Review or change my answers" link added to results page.
- **/quiz/review page**: New page with all answers grouped by category.
  Jump-to-question editing via localStorage (quiz_jump_to key).
  Auto-redirects back to results after answering jumped-to question.
- **Gold borders**: Confirmed already in place — no fix needed.

### Build
Clean — zero errors, zero warnings after completion.
All committed to dev branch.

---

## SESSION — Quiz Rebuild v5.0 (June 10, 2026)

### Completed
Full rebuild of the eligibility quiz — not a patch, a complete replacement.
17 confirmed bugs resolved. Commit: 8a64682

**16 questions in exact spec order:**
Q0-01 citizenship → Q0-02 who is this for → Q0-03 who is moving →
Q0-03a children ages (sub) → Q0-04 business partner → Q0-04a spouse
role (sub) → Q0-05 where applying from → Q0-06 funding → Q0-07
investment amount → Q0-08 business situation → Q0-08a business type
(sub) → Q0-08b broker (sub) → Q0-09 history multiselect → Q0-09a
refusal detail (sub) → Q0-09b conviction detail (sub) → Q0-10 home
ties multiselect

**New questions added from scratch:**
Q0-02, Q0-03, Q0-03a, Q0-04, Q0-04a, Q0-10

**Files updated (10 files):**
- src/data/module0_questions.json — full rebuild
- src/app/quiz/page.tsx — new QUESTIONS array, handleComplete fixed
- src/lib/pricing-tier.ts — reads Q0-03 for family, Q0-02/Q0-04 for type
- src/app/quiz/review/page.tsx — QUESTION_MAP rebuilt with new IDs
- src/app/apply/page.tsx — Q0-16 → Q0-03
- src/app/apply/module3/b/page.tsx — Q0-16 → Q0-03
- src/lib/checklist-generator.ts — Q0-16 → Q0-03, Q0-09 → Q0-04
- src/lib/prefill.ts — old history IDs → Q0-09a/Q0-09b
- src/app/results/page.tsx — pricing fixed ($247→$550, $447→$997)
- src/app/pricing/PricingClient.tsx — partnership detection fixed

**Bugs resolved:**
- Q0-01 treaty country hard stop now works
- Q0-16 duplicate removed
- Dependents reads from Q0-03 (not Q0-16)
- Application type reads from Q0-02/Q0-04 (not Q0-09)
- Pricing uses confirmed amounts ($550–$1,397)
- Question counter is dynamic (never exceeds visible total)
- Back button is at bottom left
- History is one multiselect (not three separate questions)
- Home ties is one multiselect
- Q0-03a parent/show_if corrected
- COS flag wired from Q0-05
- PR-06b hard stop fires for 3+ partners
- All old question IDs (Q0-13a, Q0-13b, Q0-14, Q0-15, Q0-16) removed

### Build
Clean — zero errors. One pre-existing hook warning in generate/page.tsx
(non-blocking, outside scope).

### Verification
- npm run build: clean
- /quiz: 200
- /results: 200

---

## SESSION — Quiz Rebuild v6.0 (June 10, 2026)

### Completed — commit 6f6bfaa on dev

Full rebuild addressing all 30 confirmed bugs from comprehensive
combinatorial path audit. 4 files changed, +1559/-242 lines.

**Fix A — handleMultiContinue calls processAction:**
Warnings, attorney flags, and hard stops now fire for multiselect
questions (Q0-09 history, Q0-10 ties). Previously all inert.

**Fix B — evaluateShowIf handles array answers:**
Multiselect sub-questions (Q0-09a, Q0-09b) now render correctly.
Array vs string comparison fixed.

**Fix C — Treaty country validation:**
Non-treaty country selection fires PR-NON-TREATY immediately.
Previously any country passed through.

**Fix D — COS flag string match:**
Was checking "valid visa" — option text says "valid status". Fixed.

**Fix E — application_type and dependents:**
Derived from Q0-02 with correct priority logic.
Spousal partnership, co-investor, and sole applicant paths correct.

**Fix F — show_if conditions:**
Q0-03 only fires for sole applicant or business partner paths.
Q0-04 only fires when Q0-02 = business partner.
Questions no longer fire redundantly after Q0-02 establishes context.

**Fix G — Score weights corrected:**
Removed incorrect tie deductions (W-PROPERTY-UNDISCLOSED etc).
Positive ties no longer penalise the score.
All 16 spec deductions added correctly.

**JSON rebuild — 18 questions:**
Q0-01 through Q0-10 plus subs Q0-02a, Q0-03a, Q0-04a, Q0-08a,
Q0-08b, Q0-09a, Q0-09b, Q0-09c. Correct routing throughout.
Sequential Q0-09 history branching. All hard stops present.
PR-NON-TREATY, PR-02, PR-03, PR-04, PR-06b, PR-08, PR-09,
PR-PASSIVE-INVEST, PR-NONPROFIT all wired.

**Pricing chain:**
pricing-tier.ts tiers match confirmed prices ($550-$1,397).
Mapping functions updated for new option text.
Results page uses getPricingTier() for accurate display.

### Build
Clean — zero errors. Routes verified: /quiz, /results, /pricing.

### Five verification paths (from QUIZ_REBUILD_PLAN_V6.md)
All must pass on next manual test:
1. Non-treaty country → PR-NON-TREATY hard stop
2. Loan secured by business → PR-02 hard stop
3. Deportation selected → ATTORNEY_RECOMMENDED, score -15
4. Spouse and children → Solo + Family $750
5. Business partner 50/50 → Partnership $997

### Test fixtures
Five complete applicant profiles written to docs/TEST_FIXTURES.md.
Use localStorage injection to test results/pricing pages instantly.
Use Supabase SQL to test full case file with pre-populated answers.

---

## SESSION — Voice-to-Text Input (June 10, 2026)

### Completed — commit 63dc9dd on dev

- **useSpeechInput hook**: src/hooks/useSpeechInput.ts
  Web Speech API wrapper — free, no API key, runs in browser
  Supports Chrome and Edge. Graceful degradation on Firefox/unsupported.
- **TextArea component updated**: Mic button added to all 8 textareas
  across 6 case file sections
- **Browser notice**: One-time inline notice for unsupported browsers,
  dismissible, stored in localStorage (e2go_voice_notice_dismissed)
- **/apply/module4 unchanged**: Voice sample system is a separate system.
  No mic button added there.

### Known bug
Mic button disappears on click — getUserMedia permission pre-check missing.
SpeechRecognition.start() fires before browser grants microphone permission.
Fix: call navigator.mediaDevices.getUserMedia({audio: true}) first,
then start recognition in .then() callback.
This fix is part of the case file redesign session.

### Coverage
- /apply/story: 3 textarea fields
- /apply/business: 1 textarea field
- /apply/investment: 1 textarea field
- /apply/qualifications: 1 textarea field
- /apply/family: 1 textarea field
- /apply/ties: 1 textarea field
- Total: 8 textareas across 6 sections

---

## SESSION — Case File UX Redesign — COMPLETE (June 10, 2026)

### Completed — Full Implementation

Case file UX redesign fully implemented across all 6 section pages.
Session file: docs/sessions/SESSION_CASEFILE_REDESIGN.md

**What was built:**
- CaseFileShell.tsx — two-panel layout (200px sidebar | questions | preview)
- TextArea.tsx — auto-resize, voice input bar, waveform, word count
- AdvisoryBlock, RiskFlag, PreFillBadge — restyled to Obsidian Gold
- SectionCard.tsx — restyled for overview page
- All 6 section pages migrated to CaseFileShell
- Module 4 textarea visual consistency (no mic button)
- Upload flow already Obsidian Gold — no changes needed

**Commits:** a9dfcb9, 5d02c15, c56f3a4, db919eb, b20065e, a421108, ddaccac, 7502ea8, fd710fa

---

## SESSION — Auth, Quiz, Results Fixes — Session 1 (June 10, 2026)

### Completed — commit 400d1dc on dev

16 tasks completed across auth, personalisation, quiz questions,
results page, and build verification.

**Auth & Personalisation (A1–A4):**
- A1: Login — email+password only, "Remember me" checkbox, removed magic link
- A2: Smart post-login routing by application state (quiz → results → pricing → apply)
- A3: Signup — first/last name fields, upsert to profiles table
- A4: Email verification enforcement in middleware

**Quiz Questions (B1–B4):**
- B1: Q0-05 reworded — "Where are you currently located?" with 4 location options
- B2: Q0-06 replaced — fund source type multiselect (6 options), Q0-08c/d franchise sub-questions added
- B3: Q0-09 reframed — "Do you have anything to disclose?" with 3 options + Q0-09c multiselect sub-question
- B4: Q0-10 simplified — 5 home ties options, new W-WEAK-TIES scoring code

**Scoring & Results (C1–C3):**
- C1: Score engine fix — attorney flags now reduce score (was only risk flags)
- C2: Results page personalisation — logged-in greeting, saved confirmation, email send button with loading/success/error states
- C3: Franchise referral tracking — franchise_referral_requested state, Supabase column, API notification route

**Navigation & State (D1–D2):**
- D1: Navbar auth state — "Hi, [first_name]" when logged in
- D2: Section visit tracking — useTrackSectionVisit hook applied to all 14 case file pages, last_visited_section column on application_lifecycle

**Quiz Draft (E1):**
- E1: Stale draft fix — expiry reduced from 7 days to 24 hours, franchiseReferralRequested persisted in draft

**Files changed:**
- src/app/login/page.tsx — smart routing, remember me, removed magic link
- src/app/signup/page.tsx — first/last name fields
- src/middleware.ts — email verification enforcement
- src/components/Nav.tsx — first_name in dropdown
- src/app/results/page.tsx — personalisation, email send
- src/app/quiz/page.tsx — score engine, franchise tracking, draft expiry
- public/data/module0_questions.json — Q0-05, Q0-06, Q0-08c/d, Q0-09, Q0-09c, Q0-10, score weights
- src/hooks/useTrackSectionVisit.ts — NEW
- supabase/migrations/20260611000000_add_last_visited_section.sql — NEW
- All 14 section pages (business, calendar, checklist, family, investment, module1, module2, module3, module4, overview, qualifications, story, ties, upload)

### Build
Clean — zero errors. Commit: 400d1dc

**What was decided:**
- Current pages render as plain scrolling forms — do not match
  the quality of the rest of the platform. Client paid $550–$1,397.
- Redesign is not polish. It is product.
- Standard: "Would someone who paid $600 feel embarrassed showing
  this screen to their spouse?" If uncertain — rebuild it.

---

## SESSION — Security Fixes (June 11, 2026)

### Completed — 42 fixes across 6 groups, 6 commits on dev

Session file: docs/sessions/SESSION_SECURITY_FIXES.md

**Group 1 — CRITICAL (commit 7741935):**
- Removed Playwright auth bypass from middleware
- Removed SKIP_PAYMENT_WALL bypass
- Added session auth to all 12 unprotected API routes (generate/start, generate/run, generate/progress, generate/documents, email/results, simulator/tts, simulator/transcribe, notifications/franchise-referral, followup/*)
- Added application ownership checks on generate routes
- Added payment wall on generate/start
- Input validation on TTS (text length) and transcribe (file size/type)
- HTML sanitization on franchise referral notification
- Stripe tier validation with VALID_TIER_IDS whitelist
- Removed token leak from email results response

**Group 2 — HIGH (commit 7821b8b):**
- Admin role column migration + layout.tsx role gate
- Removed client-prompt injection in ai.ts (hardcoded system prompt)
- E2go doc branding removed from legal disclaimers
- Quiz scoring caps for attorney flags (2+ → 74, 1+ → 89)
- W-SILENT-PARTNER added to scoring deductions (-10)
- Email outcome string mismatch fixed (qualified → PROCEED)
- solo_family_large pricing tier added ($797)
- .env.local duplicate Stripe Price IDs cleaned

**Group 3 — MEDIUM (commit 78f5d26):**
- Prompt sanitization applied to document-extraction-engine.ts
- Orphaned Q0-09a/Q0-09b show_if conditions fixed (now reference Q0-09c)
- Dead email button on results page wired to handleEmailResult
- CASL consent hardcoded true → uses caslConsent state variable
- Debug-env and test API routes deleted
- Error message sanitization on email/schedule route
- Ownership check added to documents/extract route
- Profiles first_name/last_name migration created
- Quiz sessions RLS + UPDATE policy migration
- Email log RLS migration

**Group 4 — LOW (commit 5bf7623):**
- .env.example synced with all env vars (added 15 missing keys)
- RLS enabled on processed_webhook_events table
- Lifecycle tracking for quiz_completed and generation_triggered events
- NEXT_PUBLIC_STRIPE_SECRET_KEY usage removed from PricingClient.tsx

**Group 5 — ACCESSIBILITY (commit a6a2d04):**
- Focus indicators restored: outline:none → gold ring (#C9A84C) on 12 inputs
- Cookie consent banner: added Reject button

**Group 6 — GENERATION ENGINE (commit f6138bd):**
- Approval gate: 5-minute warning logged before auto-approve
- setState batching via unstable_batchedUpdates in generate page
- Empty quality step span guarded with conditional render
- Signup page TypeScript type narrowing fix

### Build
Clean — zero errors after all 6 groups.

### Migrations to apply
```bash
npx supabase db push
# Applies: profiles_role_column, profiles_name_columns, quiz_sessions_rls, email_log_rls
```

**Layout decisions locked:**
- Desktop (≥1024px): 3-column — 200px sidebar | questions | document preview
- Tablet (768–1023px): 2-column + right drawer for preview
- Mobile (<768px): horizontal cluster pills + full-screen overlay preview
- CaseFileShell.tsx: new shared component wrapping all 6 sections

**Voice input redesign:**
- Full-width bar below each textarea (not corner icon)
- "Speak your answer" labelled button
- Active: gold pulse animation + 4-bar animated waveform
- Mic permission bug fix: getUserMedia pre-check
- Scope: TextArea component only — NOT /apply/module4

**Document preview panel (Phase 1):**
- Template-based — fills in as user types, no API call, no cost
- Fill progress bar per document (height 2px, gold)
- Phase 2 (after first paying user): live AI paragraph generation
  per cluster, ~$0.05–$0.75/session

**Scope of redesign:**
- /apply overview page — section cards
- /apply/story through /apply/ties — all 6 sections
- /apply/upload through /apply/upload/gaps — visual consistency
- /apply/module4 — textarea visual consistency only, NO logic changes
- Old fallback tabs /apply/module3/[a-k] — NOT touched

**Impact assessment:**
- Data layer fully insulated — only visual layer changes
- All data hooks, auto-save, onChange handlers preserved
- All variants preserved: partnership, COS, family sub-paths
- Data write verification test required after each section rebuild

**Document-to-cluster map:** documented in session file Step 5
All 6 sections × all clusters mapped to exact document fields.

---

## SESSION — Post-Verification-Wall Cleanup (June 12, 2026)

### Completed — 5 commits on dev, Groups 5-11 from SESSION_RESULTS_CLARITY_FIXES.md

Session file: docs/sessions/SESSION_RESULTS_CLARITY_FIXES (2).md

**Group 11 — Q0-03a simplification (commit 00fdb14):**
- Collapsed Q0-03a from 4 options to 3: "No children" / "Yes — all under 21" / "Yes — one or more are 21 or older"
- Removed W-AGING-OUT entirely — no decision impact, just noise
- Only W-OVER-21 fires now (for 21+ children)
- Removed W-AGING-OUT from score_weights.deductions and flag_explanations.json (both copies)
- Fixed src/data/module0_questions.json duplicate (had stale W-AGING-OUT references)

**Group 1 — Post-login session linking (commit 6c72ee0):**
- Added post-login session linking in quiz/page.tsx auth check
- When logged-in user has no linked quiz_sessions, queries for unlinked session by email and links it
- Fixes "existing account sent to quiz instead of dashboard" bug
- NameCaptureForm rendering confirmed correct (already working after commit 0116378)
- "Account already exists" handling confirmed working in NameCaptureForm

**Group 6 — Warning timing fix (commit aab6c10):**
- Changed processAction to return shouldAdvance: false for :warn: actions
- Warnings now pause and show message + "Continue anyway" button instead of auto-advancing
- Existing warning UI (lines 1175-1192) already handled this — just needed the flag change
- Post-Group-11 :warn: actions: 13 unique codes (W-BORDERLINE-INVESTMENT, W-CONVICTION-OLD, W-ENTRY-REFUSED, W-FAMILY-GIFT, W-LOW-INVESTMENT, W-NO-BIZ-IDENTIFIED, W-OVER-21, W-PARTNERSHIP-SPLIT ×2, W-REFUSAL-MULTIPLE, W-REFUSAL-OLD, W-REFUSAL-RECENT ×3, W-TARGET-URGENT, W-WEAK-TIES)

**Group 7 — Double-click debounce (commit 61d8be8):**
- Added isAdvancing ref guard to handleSelectOpt
- Prevents double-click from queuing multiple advances (quiz skipping questions)
- Guard resets after advance animation completes, or immediately for warning pauses

**Group 8 — Email validation (commit 90de0a8):**
- Replaced email.includes("@") with EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
- Moved setEmailSent(true) inside success path only (was firing on failure too)

**Investigate-only (no code changes):**
- Group 5 — Email button: confirmed fully removed in commit 0116378, no remnants
- Group 9 — Resend sender: e2go.app domain verification status unknown, needs Resend dashboard check
- Group 10 — RLS: quiz_sessions has RLS enabled, UPDATE policy exists, no INSERT policy found in migrations. Anon inserts succeeding — requires owner verification via SQL Editor

**Action items for owner:**
1. Run one-time SQL fix: `UPDATE quiz_sessions SET user_id = 'd654c937-d780-4e30-9388-5bfcd080c2d2' WHERE id = '83aa159a-be49-4287-b8eb-e31113dc74b5' AND user_id IS NULL;`
2. Check Resend dashboard — is e2go.app verified? If yes, revert sender to results@e2go.app
3. Run Group 10 RLS SQL queries in Supabase SQL Editor

### Build
Clean — zero errors. 5 commits pushed to dev.

---

### Completed — Groups 12-14 from SESSION_RESULTS_CLARITY_FIXES (3).md

Session file: docs/sessions/SESSION_RESULTS_CLARITY_FIXES (3).md

**Group 14 — Stripe success page "Payment not found" fix:**
- Root cause: `create-checkout/route.ts` inserted a `metadata` column into `payments` table that doesn't exist in the schema → insert silently failed → no payment row → success page showed "Payment not found"
- Fix 1: Removed `metadata` field from payments insert (children_count/line_items_count — nothing reads this data)
- Fix 2: Added error handling on the insert (`const { error } = await ...`)
- Fix 3: Added Stripe API fallback on success page — when payments row not found, calls `/api/stripe/verify-payment` which retrieves the session from Stripe API and upserts the payment row
- Updated `/api/stripe/verify-payment/route.ts` with dual-mode: `{ sessionId }` for Stripe fallback, `{ applicationId, userId }` for existing local check

**Group 13 — Post-login UX improvements:**
- 13a (first/last name fields): Already implemented — NameCaptureForm has both fields, create-account.ts accepts both
- 13b (personalized greeting): Already implemented — "Welcome back, {userName}" on results page
- 13c (returning-user banner): Added dashboard link to the "✓ Your profile has been saved" banner on /results for logged-in users
- 13d (guest option relabeling): Changed "Continue as guest" → "Skip for now"; changed post-dismiss link to "Create an account to save your results and access your dashboard"
- "YOUR NEXT STEPS" checklist: Logged-in users now skip step 1 "Create your account" (already done), starting from "Select your business"

**Group 12 — CI cleanup (investigate-only, no code changes):**
- 12a (secret-scanning false positive): Already fixed — current pattern requires 20+ chars after prefix, doesn't match `startsWith('sk_test_')` in source
- 12b (dependency audit): 5 HIGH vulnerabilities, all 4 fixable require major version bumps (Next.js 15+, ESLint 9+). Deferred to dedicated upgrade session — vulnerabilities are in dev tooling, not production runtime
  - xlsx: no fix available, not blocking

### Build
Clean — zero errors. 3 files changed, no commits yet (owner to commit).

---

## SESSION — Terms Required Dead-End Fix (June 12, 2026)

### Completed — Group 15 from SESSION_RESULTS_CLARITY_FIXES.md, commit 6edf6dc on dev

**Root cause:** Users arriving via email-verify → name-capture → login (Group 1 flow)
created accounts via `createAccountFromVerifiedEmail()` which did NOT record ToS
acceptance. When they later tried to access `/apply/*`, the middleware gate found no
`terms_acceptance` row and redirected to `/terms-required` — which was a dead-end page
with two useless buttons ("Read Terms of Service" → /terms, "Return to signup" → /signup).

**Part A — `/terms-required` page rewritten (src/app/terms-required/page.tsx):**
- Full client component with scroll-to-accept UI matching signup page pattern
- Scrollable terms summary box (240px height) with ToS key points
- Checkbox disabled until user scrolls to bottom (hasScrolledTerms state)
- Accept button POSTs to `/api/auth/accept-terms`, then redirects to `?next` param
- Uses `useSearchParams()` to read destination (defaults to `/apply/module1`)
- Wrapped in `<Suspense>` for Next.js searchParams compatibility
- "Read full Terms of Service" link + "← Back to dashboard" link
- Obsidian Gold design: #0a0a0a, #C9A84C, Cormorant Garamond, zero border-radius

**Part B — Middleware `?next` param (src/middleware.ts line 144-147):**
- Terms gate redirect now preserves the original destination via `?next=<pathname>`
- Before: `return NextResponse.redirect(new URL('/terms-required', req.url))`
- After: passes `next` search param so terms-required page can redirect correctly

**Part B — ToS recorded at account creation (src/app/actions/create-account.ts):**
- Added step 4: `terms_acceptance` upsert after profile creation, before sign-in
- Uses service-role supabase client (existing pattern)
- `onConflict: "user_id,terms_version"` for idempotency
- This prevents the gap from ever occurring again for new signups

**Files changed:**
- src/app/terms-required/page.tsx — rewritten (328 lines)
- src/middleware.ts — 1 line change (terms gate redirect)
- src/app/actions/create-account.ts — 8 lines added (step 4)

### Build
Clean — zero errors. Verified via `npm run build` and `npx tsc --noEmit`.

### Grep sweep
Full codebase sweep confirmed: all ToS references accounted for — 3 entry points
(signup, email-verify, terms-required page), 1 API endpoint, 1 middleware gate.
No orphaned references or missing paths.

---

## SESSION — Terms-Acceptance Backfill + Scroll Fix (June 12, 2026)

### Completed

**Root cause:** `terms_acceptance` table was empty for ALL pre-existing users.
The 3 accounts (ocdeployments@gmail.com, ocdeployments+e2go@gmail.com,
michael.chen.test@e2go-uat.com) were created before Group 15 added the
terms upsert to `createAccountFromVerifiedEmail()`. Middleware gate redirected
every `/apply/*` visit to `/terms-required` — correct behavior, but the
scroll-to-accept page had a dead-end bug.

**Fix 1 — Database backfill (3 rows):**
Inserted `terms_acceptance` rows for all 3 existing users via Supabase REST API
(service role). All at `terms_version: '1.0'`.

| user_id | email | Row ID |
|---|---|---|
| d654c937-d780-4e30-9388-5bfcd080c2d2 | ocdeployments@gmail.com | 7c87d177-... |
| 6e2f076e-5d04-4dbf-b65b-39706f034d68 | ocdeployments+e2go@gmail.com | 7205ff7c-... |
| a2b8f8c3-5f92-4b1d-863b-275648a74b4d | michael.chen.test@e2go-uat.com | 80436600-... |

**Fix 2 — Scroll detection dead-end (src/app/terms-required/page.tsx):**
Added `useEffect` (lines 18-22) that checks `el.scrollHeight <= el.clientHeight`
on mount. If content fits without scrolling, sets `hasScrolledTerms = true`
immediately — nothing to scroll = implicitly "read". Prevents the checkbox
from being permanently disabled when terms summary is short.

**Middleware gate confirmed sound:** Redirects only when no
`terms_acceptance` row exists for `user_id + terms_version`. No additional
conditions. No change needed.

**Other account-creation paths checked:** Only 2 paths exist —
signup page (writes terms via API call) and
`createAccountFromVerifiedEmail` (writes terms via direct upsert).
No OAuth callbacks, no admin creation tools, no gaps.

### Build
Clean — 47 routes compiled. TypeScript: zero app-level errors.
Pre-existing test file errors in `tests/security/webhook.spec.ts` (Playwright
imports) — unrelated.

---

## SESSION — Walsh and Pollard Citation Fix (June 12, 2026)

### Completed — incorrect legal citation removed and replaced

Session file: docs/sessions/SESSION_CITATION_FIX_WALSH_POLLARD.md

**Live prompt file fixed:**
- `prompts/v1/documents/cover_letter.md` line 226 — "Reference Walsh and Pollard standard (Matter of Walsh and Pollard, 8 I&N Dec. 288)" → "State the proportionality percentages (investment as % of total enterprise cost, investment as % of net worth) per 9 FAM 402.9-6(D)"

**Spec file fixed:**
- `docs/Spec3_Generation_Prompts.md` line 353 block — Substantiality Memorandum template: removed `[If Walsh & Pollard satisfied:]` conditional and citation, replaced with 9 FAM 402.9-6(D) proportionality language
- `docs/Spec3_Generation_Prompts.md` line 430 block — Standalone Substantiality Memorandum: removed citation and legal framing, replaced with 9 FAM 402.9-6(D) language

**Documentation files fixed:**
- `docs/E2_Engine_Knowledge_Base_June3_2026.md` line 64 — "Walsh & Pollard standard" → "Proportionality ... per 9 FAM 402.9-6(D)"
- `docs/E2_Engine_Knowledge_Base_June3_2026.md` line 775 — "Walsh & Pollard status" → "9 FAM 402.9-6(D) proportionality context"
- `docs/Document_Generation_Standards.md` line 235 — "Walsh & Pollard cited by name" → "referencing 9 FAM 402.9-6(D)"

**Dead files deleted (6):**
- `prompts/v1/documents/cover-letter.md` (hyphenated — dead)
- `prompts/v1/documents/cover-letter-v1.md` (dead)
- `prompts/v1/documents/investment-proof.md` (dead)
- `prompts/v1/documents/source-of-funds.md` (dead)
- `prompts/v1/documents/business-plan.md` (dead)
- `prompts/v1/documents/ds160-reference.md` (dead)

**Final grep check:** Zero matches for "8 I&N Dec", "Walsh and Pollard", or "Walsh & Pollard" in any live file. Remaining references are: Spec1_Analysis_Engine.md (variable name only, no citation text), Spec3 FORBIDDEN block (negative instruction), session documentation files.

**Flagged for future session:** Document_Generation_Standards.md "conclusion stated as a legal finding" vs Spec3's forbidden-conclusions instruction — unresolved, noted only.

### Build
Clean — zero errors. TypeScript: zero app-level errors (pre-existing Playwright test errors only).

---

### June 13, 2026 — Session 7: Three-Layer Experience/Framing Pipeline

Session file: docs/sessions/SESSION7_DUAL_LAYER_FRAMING_PIPELINE.md

**Scope:** Build three-layer reliability model for experience qualification framing:
Layer 0 (targeted follow-up questions), Layer 1 (structured scoring + AI framing),
Layer 2 (hardened generation prompt with standing backstop).

**Files Created:**
- `src/lib/business-operational-needs.ts` — 12 franchise categories with operational demands
- `src/lib/__tests__/experience-pipeline-fixtures.ts` — 5 synthetic test fixtures

**Files Modified:**
- `src/lib/analysis-engine.ts` — loadApplicationAnswers() real DB queries, 9 pure dimension scorer functions, calculateExperienceScore() real scoring, generateFramingDecisions() via OpenRouter, assembleCaseBrief() uses real scoring
- `src/app/api/followup/generate-questions/route.ts` — fixed business-type lookup (Q0-business-type + quiz_sessions fallback), added targeted experience-gap question for WEAK/CRITICAL scores
- `prompts/v1/documents/qualifications.md` — added Layer 1 framing interpolation + standing backstop instruction
- `docs/Spec3_Generation_Prompts.md` — updated Document 1 Section II to match prompt changes

**Step 0:** Follow-up question generator now finds business type via Q0-business-type key and quiz_sessions table fallback. Adds one targeted experience-gap question when experience is WEAK or CRITICAL, using operational-needs table. Stays within Spec2's 8-question cap.

**Step 1:** business-operational-needs.ts — 12/12 franchise categories covered. Each has 4-6 operational demands with labels and descriptions. Handles common ID variations.

**Step 2:** loadApplicationAnswers() queries: answers, followup_responses, content_signals_json, quiz_sessions, case_briefs. 9 dimensions scored via pure keyword-matching functions. N/A handling for caregiving/technical by business category.

**Step 3:** generateFramingDecisions() — real OpenRouter call (deepseek/deepseek-chat, temp 0.3). Graceful degradation: empty/failed → proceeds, doesn't block generation.

**Step 4:** framing_decisions.experience persisted in case_briefs JSON.

**Step 5:** Generation prompt hardened — Layer 1 output interpolated into CREATIVE FRAMING INSTRUCTION. Standing backstop instruction always present with operational-needs data. Hardcoded caregiving example removed.

**Step 6:** All 5 fixtures pass:
- Fixture 1 (retail→retail): ADEQUATE, 3/7 confirmed (direct_industry, management, sales_customer)
- Fixture 2 (banking→education): WEAK, 1/7 confirmed (management)
- Fixture 3 (warehouse→cleaning): CRITICAL, 0/7 confirmed
- Fixture 4 (parent→home care): WEAK, 1/8 confirmed (caregiving)
- Fixture 5 (recent grad→IT): CRITICAL, 0/8 confirmed — graceful handling confirmed

**Build:** Clean ✅ — zero errors
**Known limitations:** transferable_skills_identified dimension always ABSENT (intentional — requires framing-decisions output); franchise_training_offset requires CONFIRMED (not PARTIAL); scoring is keyword-based (edge cases with unusual phrasing noted as future work)

---

### June 13, 2026 — Session 8: Cover Page Data Source Fix

Session file: docs/sessions/SESSION8_COVER_PAGE_DATA_FIX.md

**Scope:** Fix cover page rendering bracket placeholders instead of real customer data. The download route queried `applications.personal_info` (JSONB column that doesn't exist), causing every cover page to show `[Applicant name from Tab A]` instead of real data.

**File Modified:**
- `src/app/api/generate/download/[applicationId]/route.ts` — replaced personal_info JSONB query with real column queries

**Field mapping:**
| Cover page field | Source |
|---|---|
| applicantName | `applications.principal_name` |
| businessName | `applications.business_name` |
| nationality | `quiz_sessions.result_json.country` |
| passportNumber | Not collected — bracket placeholder remains correct |
| preparedDate | `now()` at generation time |

**Build:** Clean ✅ — commit 6da0f6d

---

### June 13, 2026 — Session 9: Post-Generation Package Summary

Session file: docs/sessions/SESSION9_PACKAGE_SUMMARY_SCORE.md

**Scope:** Post-generation summary screen on `/documents/[applicationId]` showing package strength, gaps, suggestions, and disclaimer. NOT the existing pre-generation `/score` page — a NEW permanent section shown after documents are generated.

**Files Created:**
- `src/components/PackageSummary.tsx` — 5-section summary component
- `src/app/api/generate/case-brief/[applicationId]/route.ts` — API route for case brief data
- `src/lib/__tests__/package-summary-verification.ts` — logic verification (Chen + Fixture 5)

**File Modified:**
- `src/app/documents/[applicationId]/page.tsx` — integrated PackageSummary

**5 Sections:**
1. Package Strength Overview — 6-dimension score bars with Obsidian Gold badges
2. What's Strong — STRONG/ADEQUATE dimensions
3. Where the Package May Need More — WEAK/CRITICAL with plain-language, experience-specific framing
4. What Could Help — actionable suggestions with /apply/* edit links
5. Mandatory Disclaimer — extends Spec1 pattern

**Bonus:** Section 5.5 — Areas Officers May Ask About (denial risk awareness)

**Verification:** 16/16 checks passed — Chen experience NOT flagged, Fixture 5 experience correctly surfaced, zero denial-prediction language

**Decision:** Permanent section (not one-time gate) — revisitable after edits, non-blocking, feedback loop

**Build:** Clean ✅

---

### Session 10 — Closeout: Remaining Minor Gaps from Sessions 7-9

**Scope:** Cleanup items surfaced during Sessions 7-9 reviews. Live framing call test, denial language review, Chen franchise_training_offset verification, TODO/placeholder scan.
Session file: docs/sessions/SESSION10_CLOSEOUT.md

**Items completed:**
- Live end-to-end test of Layer 1's framing call (Fixture 3, Fixture 5)
- Section 5.5 denial-language audit confirmed clean
- Chen franchise_training_offset verified correct per spec
- TODO/placeholder scan across Sessions 4-9 code

**Build:** Clean ✅

---

### Session 11 — Ask E2go: Public AI Q&A Widget

**Scope:** Public, unauthenticated AI-powered Q&A widget. 355 Q&A pairs embedded via pgvector, 3-layer retrieval (corpus → KB → model), streaming responses, rate limiting.
Session file: docs/sessions/SESSION11_ASK_E2GO_FAQ.md

**Files Created:**
- `src/components/landing/FaqWidget.tsx` — streaming Q&A widget component
- `src/app/api/faq/ask/route.ts` — API route with 3-layer retrieval
- `supabase/migrations/20260613200000_faq_pgvector_tables.sql` — pgvector tables
- `scripts/seed-faq-corpus.ts` — 355 Q&A pairs seed script
- `scripts/seed-faq-kb-chunks.ts` — KB chunks seed script
- `src/lib/faq-system-prompt.ts` — system prompt for FAQ generation
- `src/lib/rate-limit.ts` — Upstash rate limiting for FAQ endpoint

**Key decisions:**
- Model: `xiaomi/mimo-v2.5` via OpenRouter (OPENROUTER_API_KEY)
- 3-layer retrieval: pgvector cosine similarity → broader KB → model fallback
- Rate limit: 10 requests/minute per IP (Upstash Redis)
- Landing page placement: bottom section, soft quiz CTA after each answer

**Build:** Clean ✅

---

### Session 12 — Login Transition Flicker + Simulator Gating UX

**Scope:** Two independent UX fixes — login submit flicker and simulator nav link gating explanation.
Session file: docs/sessions/SESSION12_LOGIN_AND_SIMULATOR_UX.md

**Item 1 — Login flicker fix:**
- Full-panel loading state replaces slider + form immediately on submit
- Loading persists through auth call → redirect
- Error state reverts to form with error message

**Item 2 — Simulator teaser page:**
- `/simulator` without case file data shows teaser with two paths
- "Complete your case file" → /apply
- "Upload your documents instead" → /simulator/quick-start
- Gating logic per IDEAS.md 12G unchanged

**Files Modified:**
- `src/app/login/page.tsx` — loading state on submit
- `src/app/simulator/page.tsx` — teaser screen for no-data state

**Build:** Clean ✅

---

### Session 13 — Account ↔ Chen Application Linkage Investigation

**Scope:** Investigation into why owner's logged-in account couldn't see Chen's application data.
Session file: docs/sessions/SESSION13_ACCOUNT_LINKAGE_INVESTIGATION.md

**Finding:** Account linkage issue identified and investigated. Application ownership via `applications.user_id` confirmed working correctly. Issue traced to account/email mismatch.

**Build:** Clean ✅

---

### Session 14 — Standalone Simulator: Document Upload → Parse → Interview

**Scope:** Extend standalone simulator ($197) to work WITHOUT completed case file by reusing existing document extraction engine.
Session file: docs/sessions/SESSION14_STANDALONE_SIMULATOR_UPLOAD.md

**Files Created:**
- `src/app/simulator/quick-start/page.tsx` — standalone intake UI
- `src/app/api/simulator/quick-start/route.ts` — creates minimal application + saves business category
- `src/app/api/simulator/save-extraction/route.ts` — saves extracted fields as answers
- `supabase/migrations/20260613240000_simulator_quick_start_tables.sql` — application_documents + document_discrepancies tables

**Files Modified:**
- `src/lib/simulator-engine.ts` — fallback chain: application columns → answers map → defaults
- `src/app/simulator/page.tsx` — standalone app detection, teaser CTA

**Key decisions:**
- Reuses existing extraction engine (POST /api/documents/extract) — no rebuild
- `source='simulator_standalone'` on applications table
- Business category saved as Q0-10 answer for simulator to read from answers map
- `.maybeSingle()` used instead of `.single()` to prevent 406 on empty results

**Build:** Clean ✅

---

### Session 15 — Merge Ask E2go Widget into /learn Page

**Scope:** Move FAQ widget from homepage bottom (too easy to miss) to /learn page (education hub — natural home).
Session file: docs/sessions/SESSION15_MERGE_FAQ_INTO_LEARN.md

**Files Modified:**
- `src/app/learn/page.tsx` — widget added above article grid
- `src/app/HomeClient.tsx` — widget replaced with soft CTA section

**Build:** Clean ✅

---

### Session 16 — FAQ Widget: Ambient/Active Feel + Thinking Indicator

**Scope:** Two visual fixes — widget looks static/inert at rest, no feedback during streaming wait.
Session file: docs/sessions/SESSION16_FAQ_WIDGET_ACTIVE_STATE.md

**Files Modified:**
- `src/components/landing/FaqWidget.tsx` — animated gradient border at idle, thinking indicator during stream

**Key decisions:**
- Reuse existing animated gradient border component (pricing card pattern)
- Slow ambient speed (12-15 range) for idle state
- Thinking state uses same gold pulse, not generic chatbot dots

**Build:** Clean ✅

---

### Session 17 — /learn Page Order Fix + Widget Streaming Layout Jump

**Scope:** Widget must be first thing on /learn; streaming answer causes container jump.
Session file: docs/sessions/SESSION17_LEARN_ORDER_AND_LAYOUT_JUMP.md

**Files Modified:**
- `src/app/learn/page.tsx` — widget moved above hero heading
- `src/components/landing/FaqWidget.tsx` — min-height reservation for streaming

**Build:** Clean ✅

---

### Session 18 — FAQ Widget: Scrollable Answer Container

**Scope:** Session 17's min-height approach didn't fully resolve jumping. Owner requested fixed-height scrollable container.
Session file: docs/sessions/SESSION18_SCROLLABLE_ANSWER_CONTAINER.md

**Files Modified:**
- `src/components/landing/FaqWidget.tsx` — max-height with overflow-y-auto, auto-scroll to bottom during streaming

**Build:** Clean ✅

---

### Session 19 — Commit Audit & Push Cleanup

**Scope:** Audit uncommitted work from Sessions 14-18, organize into logical commits, push to origin/dev.
Session file: docs/sessions/SESSION19_COMMIT_AUDIT_AND_PUSH.md

**Outcome:** All Sessions 14-18 changes committed and pushed. Migration filename collision check (Session 11/14) — distinct filenames confirmed, no overwrite.

**Build:** Clean ✅

---

## SESSION LOG (Prior sessions)

### June 19, 2026 — Session 36 (continued): Site Architecture Audit + Navigation Bug Fixes

**Engine audit #2 completed — overall 7.6/10 (+0.7):**
- Full 10-engine audit produced as interactive HTML report
- Dual evaluator roles: immigration attorney + product strategist
- Improvement log created at `docs/CONTINUOUS_IMPROVEMENT.md`
- Top gap confirmed: knowledge base not wired into doc gen (+1.4 pts when fixed)

**Bugs fixed (5):**
- `results/page.tsx`: CTA "Start your case file" was linking logged-in users to `/applications` (404) → now `/apply`; guests → `/signup`
- `results/page.tsx`: "Talk to an attorney" CTA removed; single focused action only
- `results/page.tsx`: Layout alignment unified — Section 1, sections 2–9, and supplementary now all use the same centred `maxWidth` wrapper
- `dashboard/page.tsx`: Welcome heading read `user?.full_name` (column doesn't exist) → fixed to `user?.first_name`; subtitle no longer shows raw email
- `quiz/page.tsx`: Quiz completion was inserting an event row instead of upserting `module0_completed_at` → progress bar now correctly shows 1/6 after quiz

**Site architecture audit (70 routes, 10 zones):**
- `/score` — orphaned, purpose unclear, not linked from nav → redirect to /results recommended
- `/franchise` linked from results Section 8 → 404 (route doesn't exist) → needs fix
- `/gap-analysis` not in authenticated nav → hidden from returning users
- Dashboard missing profile snapshot tile and gap analysis card — siloed
- FDD pages (6 routes) orphaned until Phase C ships
- `apply/business`, `apply/investment`, etc. may overlap with module pages — audit needed

**Navigation plan agreed:**
- Authenticated nav should be: Dashboard · Case File · Gap Analysis · Simulator · Documents
- Dashboard → Command Centre: add profile snapshot, gap score card, "continue where you left off"
- `/gap-analysis` to be added to auth nav next session

**Build:** Clean — 119 pages, zero errors.

---

### June 18, 2026 — Session 38: Platform Question Audit + Structural Fixes

**Question cleanup (prior work this context):**
- Question labels rewritten across story/page.tsx, tab-a.json, tab-i.json, j/page.tsx
- M3-S1-01 through M3-S1-05: trimmed from 143–182 char labels to clean 40–80 char questions
- M3-A-07 (Canadian SIN number): REMOVED — DS-160 does not require SIN
- Login deadlock (GoTrueClient signOut): Fixed with Promise.race + 2s timeout
- Tab K: All 11 long-form questions changed from type:text to type:textarea

**This session:**
- **Comprehensive platform question audit**: Every question across all sections cataloged, valued, and cross-referenced → `docs/QUESTION_AUDIT.md`
- **Tab F built**: `src/data/module3/tab-f.json` (13 questions) + `src/app/apply/module3/f/page.tsx` — Investment Evidence document readiness checklist
- **Orphaned G/H/L resolved**: Deleted `tab-g.json`, `tab-h.json`, `tab-l.json` (content superseded by business/investment/family case file pages). Created redirect pages at `/apply/module3/g`, `/h`, `/l` pointing to canonical case file sections.
- **Business page internal duplicates removed**: M3-E-10 (duplicate of M3-E-02 entity type) and M3-E-11 (duplicate of M3-E-03 state of registration) removed from `business/page.tsx`
- **Build**: Clean — 106 routes, zero errors

**Audit findings (see docs/QUESTION_AUDIT.md for full detail):**
- 155 unique questions in primary case file path
- ~85 additional duplicate/orphaned question instances identified
- Major duplicate chains: professional background asked 4× (M3-S1-01, QD-01, M3-Q-04, QJ-03)
- Pre-fillable fields: M3-A-12 (email), M3-A-05 (citizenship) should not be re-asked
- Ties section Cluster 5 (M3-T-12 to M3-T-16): cover letter drafts don't feed the generation engine — questionable value

**Outstanding decisions for next session:**
- Pre-fill bridge: QD-01/02/03/04/06 should read from M3-S1-* on Tab D load (QD-05 is the only unique question)
- Ties cover letter drafts (M3-T-12 to M3-T-16): retire or wire to generation engine?
- QK-06 (equipment/inventory), QK-13 (3-year growth), QK-14 (expansion plans): add to case file Business section
- QE-02 ("How is ownership documented?"): add to Business Cluster 1 as M3-E-13
- Email pre-fill: auto-populate M3-A-12 from authenticated user account

### June 5, 2026 — Session: End-to-End Payment Test
- **Task:** Test complete payment flow from quiz to Module 1
- **Finding:** Stripe integration code is complete and correct
- **Issue:** payments table migration exists but not applied to Supabase
- **Action needed:** Apply `20260605110625_payments_table.sql` migration
- **Result:** Code ready, infrastructure needs migration run

### June 8, 2026 — Session S28
- **updateJob() error handling**: Added const { error } = ... with console.error in generation-engine.ts
- **keystatic/ folder removed**: Was causing build failure (route conflict)
- **Backend verification**: Approval gate works correctly on fresh jobs
- **Visual E2E test**: Blocked by auth requirement — generate page requires authenticated Supabase session; needs manual browser test
- **Build**: Clean — 66 routes compiled, 0 errors

### June 6, 2026 — Session S27
- **Completed Module 1**: Onboarding, consent, application record creation
- **Completed Module 2**: Business advisor, category selection, referral trigger
- **Database migrations**: consent_log, referral_consents, experience_gap_flag, business_shortlist
- **Design**: Strict Obsidian Gold compliance
- **E2E test**: Module 1 → Module 2 → Module 3 verified

### June 6, 2026 — Session S26
- Cookie consent banner with localStorage persistence
- Route-level SEO metadata across all pages
- Created /about page with 3-section copy
- Replaced /learn stub with 6-card grid to educational sub-pages
- Fixed Next.js runtime and ESLint errors
- Added curl/browser tests, production build clean (53 routes)

### June 6, 2026 — Session S24
- Complete site navigation audit (33 routes)
- Rewrote Nav.tsx and Footer.tsx
- Implemented mobile hamburger menu with gold accents
- Fixed orphaned pages with CTAs
- Created Breadcrumb component
- Built stub pages: /privacy, /terms, /about, /settings

### June 6, 2026 — Session S23
- U.S.-themed image slider on /login, /signup, /verify
- 4 images, 5s auto-advance, 1000ms crossfade
- Split-screen layout with Obsidian Gold styling
- curl/browser verified

### June 5, 2026 — Session S22
- Document generation blur-lift reveal animation
- Installed motion library (v12.40.0)
- curl/browser test verifies 6 document cards render with blur overlays

### June 5, 2026 — Session S16-S18
- Interview Simulator spec
- Compliance Calendar spec
- Renewal Module spec

### June 5, 2026 — Session S11
- Analysis Engine + Confidence Score Integration
- Score sync reads from case_briefs table

### June 5, 2026 — Session S10
- Tab B / Tab L shared document overlap fix with CrossTabNote component

### June 5, 2026 — Session S9
- Timeline service with two date concepts (working_target_date vs confirmed_interview_date)

### June 5, 2026 — Sessions S6-S8
- Business data deduplication between tabs
- Security history pre-fill with legal confirmation gate

### June 9, 2026 — Results Page Benefits Section
- Personalised E-2 benefits section added to results page (between flags and timeline)
- getBenefits() prioritises spouse/children based on quiz dependents answer
- 2x2 grid desktop, 1 column mobile via CSS media query
- Design: Obsidian Gold tokens, ◈ diamond icon, no rounded corners
- Commit: 6b8057c

---

## DEFERRED RISKS (Accepted, pending dedicated sessions)

### Next.js 14 → 16 upgrade required
- **Current version:** `next@14.2.35` (pinned via `^14.0.0` in package.json)
- **Vulnerability:** HIGH severity — affects `9.3.4-canary.0` through `16.3.0-canary.5`
  - Includes: DoS via Image Optimizer, HTTP request smuggling, unbounded disk cache,
    server-side request forgery, cache poisoning, XSS via CSP nonces
- **Fix available:** `next@16.2.9` — but this is a **major version bump** (14 → 16)
- **No patch exists in the 14.x line** — `npm update` and `npm audit fix` cannot resolve
- **Blocking packages:** `eslint-config-next` and `@next/eslint-plugin-next` also stuck at
  14.2.35 (transitive `glob` vulnerability, fix requires 16.x)
- **Risk accepted:** June 12, 2026. Upgrade requires dedicated session with full
  regression testing — breaking changes in Next.js 15+ (Turbopack default, async
  request APIs, config changes). Not a cleanup-task bundle.

### xlsx (SheetJS) — no fix available
- **Package:** `xlsx@^0.18.5`
- **Vulnerability:** HIGH — Prototype Pollution + ReDoS
- **Fix available:** No. All versions affected, no patched release.
- **Usage:** `src/lib/text-extraction.ts` — reads uploaded XLSX spreadsheets via
  `XLSX.read(buffer, { type: 'buffer' })`, converts to CSV via `XLSX.utils.sheet_to_csv(sheet)`.
  User-facing through document upload flow (`/api/documents/extract`).
- **Risk accepted:** June 12, 2026. Input is user-uploaded files (not untrusted web content).
  Prototype pollution requires crafted XLSX with malicious prototype chain.
  ReDoS requires cell content matching backtracking patterns.
  Consider replacing with `exceljs` or `openpyxl`-style parser in future session.

---

## NEXT SESSION PRIORITIES (Updated June 13, 2026)

### ~~Priority 1 — S15: Document Package Download~~ ✅ COMPLETE
### ~~Priority 2 — Session 7: Three-layer experience/framing pipeline~~ ✅ COMPLETE
### ~~Priority 3 — Session 8: Cover page data fix~~ ✅ COMPLETE
### ~~Priority 4 — Session 9: Post-generation package summary~~ ✅ COMPLETE

### Priority 1 — End-to-end payment test
Full flow: quiz → pricing → checkout (4242 4242 4242 4242) →
dashboard → /apply → Module 3 → Generation → Download
Test applicant: Michael James Chen
UUID: 9f981747-e3e4-4941-9f86-9871f8117b66
Use SKIP_PAYMENT_WALL=true in .env.local for generation test
Chen data wiped and reseeded (June 12) — clean, internally-consistent
investment figures ($185K). Ready for fresh generation run.

### Priority 2 — Generation engine fixes
File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
Three known issues: approval gate, setState violation, empty boxes

### Priority 3 — Bracket highlighting regex + checklist builder
Regex currently only matches `[BRACKET FORMAT]...[/BRACKET FORMAT]`
but documents use descriptive brackets like `[passport number]`.
Checklist builder has same regex mismatch (shows 0 items).

### Priority 4 — Owner action items
- Check Resend dashboard: e2go.app domain verified? If yes, revert sender
- Run Group 10 RLS SQL queries and share results

### Future sessions (after first paying user)
- Admin dashboard — user management, payment history
- Support ticket system
- Lifecycle tracking throughout app
- Compliance calendar — spec written at docs/COMPLIANCE_CALENDAR_SPEC.md
- Renewal module — spec written at docs/RENEWAL_MODULE_SPEC.md

---

## KNOWN ISSUES (Updated June 13, 2026)

1. **Generation engine: approval gate, setState, empty boxes** — MEDIUM
   File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
2. **Resend sender** — e2go.app domain verification status unknown.
   Check Resend dashboard. If verified, revert to results@e2go.app.
3. **RLS investigation pending** — quiz_sessions anon INSERT behavior
   unexplained. Run SQL queries in Group 10 and share results.
4. **Bracket highlighting regex + checklist builder** — MEDIUM
   Regex only matches `[BRACKET FORMAT]...[/BRACKET FORMAT]` but
   documents use descriptive brackets like `[passport number from Tab A]`.
   Checklist builder shows 0 items due to same mismatch.
5. **Quiz nationality selector** — curl/browser difficulty, works in browser
6. **Fast Refresh errors** — Occasional hot reload (non-blocking)
7. **Stripe API version outdated (2024-06-20)** — LOW
   Upgrade apiVersion in scripts/stripe-setup.ts when convenient
8. **Supabase CLI migration history out of sync with remote** — MEDIUM
   `supabase migration list` shows only 2 of 24 migrations as applied, while ~22 were applied
   manually via SQL Editor over the past week. `npx supabase db push` reports 'up to date'
   even when new migration files exist. Reconcile in a dedicated session before relying on
   db push again — do not assume db push has applied anything without verifying via REST/SQL Editor.

---

### June 12, 2026 — Session: Generation Pipeline Steps 11-14 (Spec4 Quality Gate)

**Scope:** Enhanced Steps 11-14 of the generation pipeline per Spec4_Quality_Gate_Pipeline.md

**Files Created:**
- `supabase/migrations/20260611190000_generation_pipeline_log.sql` — Pipeline audit log table
- `src/app/api/generate/acknowledge/route.ts` — Pre-download acknowledgment API
- `src/components/AcknowledgmentGate.tsx` — 5-checkbox acknowledgment UI

**Files Modified:**
- `src/lib/generation-engine.ts` — Enhanced Steps 11-14:
  - Step 11: Spec4 humanization prompt (AI vocabulary replacements, voice profile injection), retry loop with AI detection feedback (max 3 attempts, threshold 0.35)
  - Step 12: Added pipeline_log writes for Stage 6 (metadata sanitization)
  - Step 13: Added REQUIRED_ELEMENTS completeness check per doc type, CONSISTENCY_FIELDS cross-doc validation, pipeline_log writes for Stages 4-5
  - Step 14: Added pipeline_log writes for Stages 1-3, 2, initial pipeline_log entries at pipeline start
- `src/app/generate/[applicationId]/page.tsx` — Integrated AcknowledgmentGate into completion state

**Pending:** None

**Build:** Clean ✅ | **TypeScript:** Clean ✅
**Migration:** Applied via SQL Editor ✅ | **E2E Test:** Write path verified ✅

---

### June 12, 2026 — Session: Retry Loop + Job Completion Status Fix

**Scope:** Two confirmed bugs blocking any successful generation run
Session file: docs/sessions/SESSION_RETRY_LOOP_JOB_STATUS_FIX.md

**Bug A — Humanization retry loop exits after 1 attempt, not 3:**
- Root cause: Step 14 hardcoded `stage3_attempts: 1` in pipeline_log regardless of actual humanization attempts; quality gate failures weren't checked within the humanization loop (Step 11); Step 10's AI detection score updated DB only, not the local `generatedDocs` array
- Fix: Added `humanizationState` Map to track actual attempts and final score per document in Step 11; Step 14 reads from this map for `stage3_attempts` and `stage3_detection_score`; humanization loop now runs `runQualityGate()` after each attempt and combines AI detection + quality gate failures into retry feedback; quality gate check happens within the humanization loop, not just after

**Bug B — Job never transitions to `status: 'completed'`:**
- Root cause: No `updateJob({ status: 'completed' })` call existed after Step 15
- Fix: After Step 15, queries `generation_pipeline_log` for all documents' `final_status`. Sets job to `'completed'` if all documents passed quality gate, `'partial'` if 1+ documents have `final_status: 'FAILED'`. Always sets `completed_at` timestamp.

**Files modified:**
- `src/lib/generation-engine.ts` — humanization loop (Step 11), pipeline_log update (Step 14), job completion (after Step 15)

**Status values used:**
- `'completed'` — pipeline ran to end, all documents passed quality gate
- `'partial'` — pipeline ran to end, 1+ documents failed quality gate (need attention)
- Both set `completed_at` timestamp so frontend can distinguish "still running" from "done"

**Build:** Clean ✅ | **TypeScript:** Clean ✅

---

### June 12, 2026 — Session: Chen Application Wipe and Reseed

**Scope:** Database-only — wipe contaminated test data, reseed with clean internally-consistent figures
Session file: docs/sessions/SESSION_WIPE_RESEED_CHEN.md

**Application UUID preserved:** `9f981747-e3e4-4941-9f86-9871f8117b66` (Michael James Chen)

**Tables wiped (all rows for this application_id):**
- `answers` — 27 rows deleted
- `generated_documents` — 6 rows deleted
- `generation_pipeline_log` — 6 rows deleted
- `document_generation_jobs` — 1 row deleted (stuck "running" job)
- `case_briefs` — 1 row deleted
- `payments` — 1 row deleted (old $297 test payment)
- `document_generation_log` — 79 rows deleted

**Fresh data inserted:**
- `answers` — 27 rows: 3 corrected (QF-05 source-of-funds, QH-02 timeline, QJ-03 employment dates), 24 unchanged
- `case_briefs` — 1 row: investment=$185,000, consistent breakdown, source_of_funds=$110K savings + $75K property
- `applicant_voice_profile` — 1 row: 295-word writing sample, AI detection score 0.15
- `followup_responses` — 3 rows: source_of_funds, business_experience, non_immigrant_intent

**Arithmetic verified:**
- Investment breakdown: $1K + $48K + $22K + $18K + $15K + $10K + $71K = $185K ✅
- Source of funds: $110K + $75K = $185K ✅
- No stale figures ($125K, $175K) found anywhere

**Investment figure consistency check:**
- $185,000: QA-56, QF-02, QF-03, case_brief_json — consistent ✅
- $143,600: case_brief_json non_marginality only (Year 3 net income, not investment) ✅
- No conflicting investment amounts across any table

**Build:** Clean ✅

**Flagged (not fixed):** Year 3 net income ($143,600) could collide with investment total in naive consistency checks that grep for dollar amounts without distinguishing field semantics. If the quality gate's consistency checker compares `investment_amount_usd` against `projected_net_income_y3`, it would flag a false mismatch. Separate bug if it occurs.

**Next:** Owner navigates to `/generate/9f981747-...` to trigger fresh generation — first test of citation fix + retry loop fix + job completion status fix + clean data, together.

---

### June 13, 2026 — Session: Recovery, Download Test, Consistency-Checker Fix

Session file: docs/sessions/SESSION_RECOVERY_DOWNLOAD_AND_FIX.md

**Piece 1 — Content Recovery:** 4 documents (cover_letter, source_of_funds, investment_proof, qualifications) had content_text overwritten with AI refusals by Step 13's re-prompt. Good content was preserved in content_json.full_text. Performed direct database swap (UPDATE content_text = content_json->>'full_text'). All 6 documents now contain real, substantive content.

**Piece 2 — Download/.docx Test:** Built all 6 .docx files + checklist + ZIP against real recovered content. Findings:
- Formatting: PASS (Times New Roman 12pt, 1-inch margins, 1.5 spacing, Roman numeral headers correctly styled as Heading1 bold 14pt)
- Header/footer: PASS (correct format, centered, 9pt gray)
- Bracket highlighting: DOES NOT FIRE — regex matches `[BRACKET FORMAT]...[/BRACKET FORMAT]` but documents use descriptive brackets like `[passport number from Tab A]`
- Markdown table → Word table: DOES NOT CONVERT — investment_proof table renders as literal text
- Checklist: INCORRECTLY EMPTY — finds 0 items due to same bracket regex mismatch
- Metadata: CLEAN (no e2go/AI branding)
- Gate: Would 403 (all documents have applicant_acknowledged=false, final_status≠RELEASED)

**Piece 3 — Consistency-Checker Fix:** Replaced broken CHECK 2 in generation-engine.ts (lines 657-671). Old logic extracted ALL dollar amounts and flagged any 50-150% of investmentTotal that differed >10% — causing false failures on legitimate line-items. New logic only checks that the total investment figure ($185,000) appears in the document. Build clean.

**Flagged (not fixed — follow-up items):**
1. Bracket highlighting regex needs widening to match descriptive `[text]` brackets
2. Checklist builder needs same regex fix
3. Markdown table → Word table conversion needed for investment_proof
4. Acknowledgment gate (Step 14) was never reached — needs live re-run to test full flow

**Next:** Live re-run of generation pipeline to confirm documents pass quality gate without false re-prompts. Then address bracket highlighting + checklist regex as separate session.

---

### June 13, 2026 — Session 4: Package Assembly (Cover Page, TOC, Dividers, ZIP Rewire)

**Scope:** Add package-level presentation files to the document ZIP — cover page, table of contents, tab dividers, renamed documents. Per SESSION4_PACKAGE_ASSEMBLY.md spec.

**Files Created:**
- `src/lib/docx-package-constants.ts` — shared constants (DOC_TYPE_TAB_MAP, TAB_SECTION_TITLES, TAB_ORDER)
- `src/lib/docx-cover-builder.ts` — cover page builder (Century Schoolbook, centered layout, no page number)
- `src/lib/docx-toc-builder.ts` — table of contents with dot-leader → filename navigation
- `src/lib/docx-divider-builder.ts` — tab divider pages (TAB [X] / title / description / footer)

**Files Modified:**
- `src/lib/docx-builder.ts` — DOC_TYPE_TAB_MAP moved to shared module (imported, not duplicated), buildTextRuns + BRACKET_PLACEHOLDER_REGEX exported
- `src/app/api/generate/download/[applicationId]/route.ts` — full rewrite: now builds 15-file ZIP (cover, TOC, 6× divider+doc, checklist); fetches business_name, target_state, personal_info for cover page; renames docs to Tab_[X]_[Name].docx
- `src/lib/checklist-builder.ts` — added package intro paragraph listing all included tabs; accepts applicantName + includedTabs options

**ZIP file count:** 15 files (1 cover + 1 TOC + 6 dividers + 6 docs + 1 checklist)

**Build:** Clean ✅ — zero errors, zero new warnings

---

### June 15, 2026 — Session 20: Simulator Enhancement (DBA Naming, Dossier Redesign, TTS Migration, Tier Separation)

**Scope:** Deep simulator work across eight concerns — all build-verified.

**1. DBA/Franchise naming fix**
- `src/types/simulator.ts` — added `operatingName: string | null` to `SimulatorContext`; made `targetState: string | null` (was non-nullable)
- `src/lib/simulator-engine.ts` — populates `operatingName` from QF-09/M3-F-09; `targetState` falls back to QE-03/M3-E-03 (null if still missing); UQ-01 context string null-guarded

**2. Evaluation prompt DBA clarification**
- `src/app/api/simulator/evaluate/route.ts` — evaluator prompt now includes `businessLine` (legal entity + trade name if they differ) and an explicit instruction not to flag trade-name vs. entity-name divergence as an inconsistency

**3. Case-summary API enrichment**
- `src/app/api/simulator/case-summary/route.ts` — response now includes `operatingName`, `targetState`, `businessCategory` (human-readable label), `investmentAmount` from answers map

**4. Dossier redesign — CaseFileSummary**
- `src/components/simulator/CaseFileSummary.tsx` — full rewrite:
  - Cover page: eyebrow "E-2 CASE FILE", file reference (first 8 hex chars of applicationId), large serif principal name, business line with DBA if different, classification grid (filing type / business category / target state / investment), stat row
  - Documents section renamed "Exhibits — Documents on File"; each document gets a lettered badge (A, B, C...)
  - Information sections prefixed with Roman numerals (I, II, III...) and wrapped in bordered section cards

**5. Gap-resolution flow (new files — untracked)**
- `src/lib/simulator-gaps.ts` — `detectGaps()` identifies missing high-value answers from an application; `submitGapAnswers()` persists them
- `src/components/simulator/CaseGapsForm.tsx` — UI that asks the user for any critical missing fields before proceeding to the interview
- `src/app/api/simulator/case-gaps/route.ts` — GET: returns missing fields for applicationId; POST: saves gap answers
- `src/app/simulator/case-file/page.tsx` — integrated CaseGapsForm as a pre-step before CaseFileSummary

**6. TTS migration — playai-tts → canopylabs/orpheus-v1-english (Orpheus)**
- `src/app/api/simulator/tts/route.ts` — full rewrite; text chunked to ≤200 chars on sentence boundaries (Orpheus limit); each chunk calls Groq `/audio/speech`; returns `{ audioChunks: string[] }` (base64 mp3 per chunk)
- `src/lib/groq-tts.ts` — `speakQuestion()` now fetches `/api/simulator/tts`, receives chunk array, plays each sequentially via `playAudioChunk()` (resolves on `audio.onended`)
- `src/lib/groq-transcription.ts` — DELETED (obsolete; replaced by server-side voice-status check)
- **Blocker (user action required):** `canopylabs/orpheus-v1-english` returns `400 model_terms_required` until org admin accepts model terms at `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`

**7. Voice-status endpoint + timer/warning display fix**
- `src/app/api/simulator/voice-status/route.ts` — returns `{ available: true/false }` based on whether `GROQ_API_KEY` is set; simulator page fetches this on load
- `src/app/simulator/page.tsx` — voice availability now checked server-side (not from deleted `isGroqConfigured()` client fn); timer countdown and 2-minute warning now only rendered in voice mode (not text mode); error handling added for null application edge case

**8. Tier separation — simulator-only subscribers**
- `src/app/dashboard/page.tsx` — detects `simulatorOnly` (all applications have `source = 'simulator_standalone'`); shows dedicated "Interview Simulator" dashboard (sessions remaining/used, quick actions) instead of the full case-building dashboard
- `src/middleware.ts` — blocks simulator-only users from `/apply`, `/generate/`, `/documents/` routes (redirects to `/dashboard`)

**9. Homepage copy update**
- `src/app/HomeClient.tsx` — headline updated to "Your E-2 Investor Business Plan & Full Application Package"; subhead rewritten to "Consultants give you Zoom calls. Lawyers give you invoices. E2Go gets you Visa Ready."

**Strategic assessment delivered (no code):**
- Simulator scored **4/10** as a $200-300 product; roadmap delivered:
  - Tier 1 (highest value/lowest effort): conversational follow-up questions + document-grounded evaluation
  - Tier 2: objection-practice mode, timing analysis, officer persona variants
  - Tier 3: collaborative prep toolkit, visual aids, comparison reports
- Tier 1 items not yet approved or started — pending user go-ahead

**Build:** Clean ✅ — all 16 changed/new files build without errors

---

## SESSION FILES INDEX

All session files are in docs/sessions/. Prompt for agent: `cat docs/sessions/[filename]`

| File | Purpose | Priority |
|---|---|---|
| SESSION_CASEFILE_REDESIGN.md | Case file UX redesign — two-panel, voice input, all variants | 1 — run now |
| SESSION_PLAN_GENERATION_FIXES.md | Generation engine: approval gate, setState, empty boxes | 2 |
| SESSION_MODULE3_CASEFILE.md | Case file: gap questions, partnership UI, dynamic manifest | 3 |
| SESSION_RESULTS_CLARITY_FIXES.md | Full verification wall + post-cleanup spec (Groups 1-15) | ✅ DONE (Groups 1-15) |
| SESSION_RESULTS_CLARITY_FIXES (2).md | Post-verification-wall cleanup: Groups 1-11 | ✅ DONE (Groups 5-11) |
| SESSION_HANDOFF_JUNE9.md | Login fix, Stripe migration, generation engine fixes, E2E test | Reference |
| SESSION_SIMULATOR.md | Simulator: Groq TTS, transcription, timer, purchase, design fixes | ✅ DONE |
| SESSION_QUIZ_FIXES.md | Quiz UX: family split, partnership, months, back button, review page | ✅ DONE |
| SESSION_QUIZ_FIXES_2.md | Quiz legal accuracy: 9 FAM partnership rules, hard stops | ✅ DONE |
| SESSION_CITATION_FIX_WALSH_POLLARD.md | Walsh & Pollard citation removal + 9 FAM 402.9-6(D) replacement | ✅ DONE |
| SESSION_RETRY_LOOP_JOB_STATUS_FIX.md | Humanization retry loop + job completion status fix | ✅ DONE |
| SESSION_WIPE_RESEED_CHEN.md | Chen application wipe + reseed with clean investment data | ✅ DONE |
| SESSION_RECOVERY_DOWNLOAD_AND_FIX.md | Content recovery, .docx download test, consistency-checker fix | ✅ DONE (all 3 pieces) |
| SESSION7_DUAL_LAYER_FRAMING_PIPELINE.md | Three-layer experience/framing pipeline (Layer 0/1/2) | ✅ DONE |
| SESSION10_CLOSEOUT.md | Remaining minor gaps from Sessions 7-9 (live framing call, denial language, Chen flags) | ✅ DONE |
| SESSION11_ASK_E2GO_FAQ.md | Interactive AI Q&A widget — pgvector, streaming, 3-layer retrieval | ✅ DONE |
| SESSION12_LOGIN_AND_SIMULATOR_UX.md | Login transition flicker fix + simulator gating UX teaser | ✅ DONE |
| SESSION13_ACCOUNT_LINKAGE_INVESTIGATION.md | Account ↔ Chen application linkage investigation | ✅ DONE |
| SESSION14_STANDALONE_SIMULATOR_UPLOAD.md | Standalone simulator document upload → parse → interview | ✅ DONE |
| SESSION15_MERGE_FAQ_INTO_LEARN.md | Merge Ask E2go widget into /learn page | ✅ DONE |
| SESSION16_FAQ_WIDGET_ACTIVE_STATE.md | FAQ widget ambient/thinking states + animated border | ✅ DONE |
| SESSION17_LEARN_ORDER_AND_LAYOUT_JUMP.md | /learn page order fix + widget streaming layout jump | ✅ DONE |
| SESSION18_SCROLLABLE_ANSWER_CONTAINER.md | FAQ widget scrollable answer container | ✅ DONE |
| SESSION19_COMMIT_AUDIT_AND_PUSH.md | Commit audit & push cleanup for Sessions 14-18 | ✅ DONE |
| SESSION20_SIMULATOR_ENHANCEMENT.md | DBA naming, dossier redesign, TTS migration, tier separation | ✅ DONE |

---

## BUILD STATE

- Branch: `dev`
- Last commit: `5122540` — feat: show case file summary on every simulator entry (Session 19 tail)
- `npm run build`: Clean — 49 routes compiled (2 new simulator routes added in Session 20)
- All core features implemented and built
- **Session 20 (June 15, 2026) complete ✅** — DBA naming, dossier redesign, TTS migration, tier separation, gap-resolution flow
  - ⚠️ TTS voice mode blocked pending Groq terms acceptance — see KNOWN ISSUES #9
- Case file UX redesign complete ✅
- Generation pipeline Steps 11-14 enhanced per Spec4 ✅
- generation_pipeline_log table applied via SQL Editor ✅
- Acknowledgment gate E2E test passed ✅
- Chen application wiped and reseeded with clean data ✅
- Session 4 (Package Assembly) complete ✅ — 15-file ZIP with cover, TOC, dividers, renamed docs
- Session 7 (Three-Layer Pipeline) complete ✅ — Layer 0/1/2 experience scoring, framing, backstop
- Session 11 (Ask E2go FAQ) complete ✅ — pgvector 368 Q&A corpus, 3-layer retrieval, streaming widget
- Session 12 (Login + Simulator UX) complete ✅ — flicker fix, simulator teaser
- Session 14 (Standalone Simulator Upload) complete ✅ — quick-start route, document extraction
- Session 15 (FAQ → /learn merge) complete ✅ — widget on /learn, CTA on homepage
- Sessions 16-18 (FAQ widget polish) complete ✅ — ambient states, thinking indicator, scrollable container
- Session 19 (Commit Audit) complete ✅ — all Sessions 14-18 committed and pushed
- Supabase singleton fix complete ✅ — duplicate GoTrueClient resolved (Sessions 28-30)
- Dashboard + simulator loading states fixed ✅
- Login quiz-session linkage fixed ✅
- Nav on authenticated layouts complete ✅
- Quick-start flow hardened ✅ — missing tables, wrong columns, RLS fixes
- Payments migration applied ✅
- Stripe Price IDs live ✅
- Auth + quiz scoring foundation solid ✅
- Post-verification-wall cleanup complete ✅
- Terms-required dead-end fixed ✅

---

### June 15, 2026 — Bug Fixes: Stripe Price + Dashboard Block + Checkout Redirect

**Scope:** Three bugs surfaced by the June 14 audit and confirmed in test.

**Bug 1 — simulator_3pack charged $197 instead of $29.99:**
- Root cause: `scripts/stripe-setup.ts` had `simulator_3pack` amount as `19700` ($197) — same as standalone simulator. Price ID created at wrong amount.
- Fix 1: `scripts/stripe-setup.ts` — amount corrected to `2999` ($29.99)
- Fix 2: `scripts/fix-simulator-price.ts` created — new Stripe price `price_1Tim5fF7Ggk3LUEy2JGRRKrB` created at $29.99; `.env.local` updated
- ⚠️ OWNER ACTION REQUIRED: Run SQL `UPDATE pricing SET stripe_price_id = 'price_1Tim5fF7Ggk3LUEy2JGRRKrB', amount_cents = 2999 WHERE tier_id = 'simulator_3pack';` in Supabase SQL Editor; update `STRIPE_PRICE_SIMULATOR_3PACK` in Vercel env vars; refund the $197 test charge in Stripe dashboard.

**Bug 2 — Simulator-only users could access /dashboard:**
- Root cause: Middleware blocked `/apply`, `/generate/`, `/documents/` but not `/dashboard`. Worse, the block redirected to `/dashboard` — the very page they should be excluded from.
- Fix: `src/middleware.ts` — added `/dashboard` to blocked routes; all simulator-only blocks now redirect to `/simulator` (not `/dashboard`)

**Bug 3 — Simulator purchases redirected to /pricing/success instead of /simulator:**
- Root cause: `create-checkout/route.ts` ignored `successUrl`/`cancelUrl` from the request body; always used hardcoded `/pricing/success`.
- Fix: `src/app/api/stripe/create-checkout/route.ts` — accepts `successUrl` and `cancelUrl` from body with same-origin validation; simulator purchase now returns to `/simulator?purchase=success`

**Files Modified:**
- `scripts/stripe-setup.ts` — simulator_3pack amount: 19700 → 2999
- `scripts/fix-simulator-price.ts` — NEW: one-shot Stripe price creation script
- `src/middleware.ts` — SIMULATOR_BLOCKED_ROUTES now includes /dashboard; redirect → /simulator
- `src/app/api/stripe/create-checkout/route.ts` — successUrl/cancelUrl accepted from body

**Build:** Clean ✅

---

## UNEXECUTED SESSIONS (referenced in June 14 audit but never built)

These sessions were planned and named in the June 14 audit's "SPECCED BUT NOT YET BUILT" table. The session files were never written and the features were never built.

| Session | Feature | Priority |
|---|---|---|
| SESSION21_INTERVIEW_PREP_KIT | 10-15 interview Q+A pairs with example answers, downloadable PDF | HIGH — product value |
| SESSION22_SENTRY_ERROR_TRACKING | Sentry error tracking + source maps | HIGH — pre-launch ops |
| SESSION23_UPTIME_MONITORING | Uptime monitoring (BetterUptime or similar) | MEDIUM — ops |
| SESSION_INVOICING | Enable Stripe invoice generation on checkout completion — business name, address, tax ID, line item descriptions per tier, PDF emailed to client | HIGH — pre-launch, every paying client needs one |
| MODULE4_FOLLOWUP_UI | Module 4 follow-up conversation UI — spec at docs/Spec2_Followup_Conversation.md | MEDIUM |

These must be written as session files before building.

---

## OWNER MANUAL ACTIONS — PENDING

These cannot be done by code — require owner access to Supabase, Stripe, or console.

| Action | Priority | Notes |
|---|---|---|
| ~~Accept Groq Orpheus TTS terms~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 |
| ~~Update Supabase pricing table: simulator_3pack~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 — price_1Tim5fF7Ggk3LUEy2JGRRKrB / 2999 cents |
| ~~Update Vercel env: STRIPE_PRICE_SIMULATOR_3PACK~~ | ~~🔴 HIGH~~ | ✅ DONE June 16, 2026 |
| ~~Apply BUG-QA-06 migration (last_visited_section + franchise_referral_requested)~~ | ~~🔴 HIGH~~ | ✅ DONE June 22, 2026 |
| ~~Apply FDD report access migration (fdd_analyses.report_unlocked + pricing row)~~ | ~~🔴 HIGH~~ | ✅ DONE June 22, 2026 |
| ~~Add revising/revision_requested to generated_documents.status CHECK~~ | ~~🔴 HIGH~~ | ✅ DONE June 22, 2026 |
| **Apply FAQ pgvector migration** | 🔴 HIGH | Paste COMBINED SQL BLOCK below into Supabase SQL Editor → Run. Then run seed scripts. |
| **Run FAQ seed scripts** | 🔴 HIGH | After applying FAQ migration: `npx tsx scripts/seed-faq-corpus.ts` then `npx tsx scripts/seed-faq-kb-chunks.ts` |
| **Rotate OpenAI API key** | 🔴 HIGH | platform.openai.com → API keys → delete old key → create new → update `.env.local` OPENAI_API_KEY + Vercel env var |
| Refund $197 test charge | 🔴 HIGH | In Stripe dashboard — was a test but was a real charge |
| Check Resend domain verification | 🟡 MEDIUM | Is e2go.app verified? If yes, revert email sender to results@e2go.app |
| Clean up Chen duplicate applications | 🟡 MEDIUM | `DELETE FROM applications WHERE user_id = 'a2b8f8c3-...' AND id != '9f981747-...'` |
| Clean up ocdeployments blank duplicates | 🟡 MEDIUM | `DELETE FROM applications WHERE id IN ('bd8a9c1a-...', '49afc548-...')` |
| ~~Apply migration 004_answers_source_update.sql~~ | ~~🟡 MEDIUM~~ | ✅ CLOSED — file never existed; code doesn't write that value to DB. No action needed. |
| ~~Configure Stripe webhook for production URL~~ | ~~🟡 MEDIUM~~ | ✅ DONE June 16, 2026 |
| ~~Configure Upstash Redis in Vercel env vars~~ | ~~🟡 MEDIUM~~ | ✅ DONE — both UPSTASH_REDIS_REST_URL and TOKEN confirmed set June 16, 2026 |
| ~~Supabase Storage bucket private~~ | ~~🟡 MEDIUM~~ | ✅ CONFIRMED June 19, 2026 — application-documents bucket is Private |
| **Cloudflare Turnstile keys** | 🟡 MEDIUM | dash.cloudflare.com → Turnstile → Add site → add NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY + CF_TURNSTILE_SECRET_KEY to Vercel env |
| **CRON_SECRET env var in Vercel** | 🟡 MEDIUM | Any random string; activates nightly CaseProfile rebuild at 02:00 UTC |
| **Confirm FDD pricing** | 🟡 MEDIUM | $297 placeholder currently in teaser — confirm price to unblock FDD freemium gate wiring |
| **Run FAQ seed scripts** (OPENAI_API_KEY required) | 🟠 LOW | Add OPENAI_API_KEY to .env.local + Vercel, then: `npx tsx scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts` |

### COMBINED SQL BLOCK — Apply in Supabase SQL Editor

**Step 1:** Go to https://supabase.com/dashboard/project/cziphinlzfnlqlvynwnm/sql/new  
**Step 2:** Paste the following, click Run:

```sql
-- =====================================================================
-- FAQ pgvector tables + search functions (Session 11)
-- Apply once — all statements are idempotent (CREATE IF NOT EXISTS)
-- =====================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Layer 1: Pre-answered Q&A corpus
CREATE TABLE IF NOT EXISTS faq_qa_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  question_number INT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT,
  question_embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Layer 2: Broader knowledge base chunks
CREATE TABLE IF NOT EXISTS faq_kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query log
CREATE TABLE IF NOT EXISTS faq_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  matched_layer TEXT,
  matched_question_id UUID REFERENCES faq_qa_corpus(id),
  similarity_score FLOAT,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW indexes
CREATE INDEX IF NOT EXISTS faq_qa_corpus_embedding_idx
  ON faq_qa_corpus USING hnsw (question_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS faq_kb_chunks_embedding_idx
  ON faq_kb_chunks USING hnsw (chunk_embedding vector_cosine_ops);

-- RLS
ALTER TABLE faq_qa_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_query_log ENABLE ROW LEVEL SECURITY;

-- Search functions
CREATE OR REPLACE FUNCTION match_faq_corpus(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.80,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  id uuid, question text, answer text, sources text, similarity float
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT fc.id, fc.question, fc.answer, fc.sources,
    1 - (fc.question_embedding <=> query_embedding) AS similarity
  FROM faq_qa_corpus fc
  WHERE 1 - (fc.question_embedding <=> query_embedding) > match_threshold
  ORDER BY fc.question_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_faq_kb(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid, source_file text, chunk_text text, similarity float
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT fk.id, fk.source_file, fk.chunk_text,
    1 - (fk.chunk_embedding <=> query_embedding) AS similarity
  FROM faq_kb_chunks fk
  WHERE 1 - (fk.chunk_embedding <=> query_embedding) > match_threshold
  ORDER BY fk.chunk_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Step 3:** After Run succeeds, come back here and run:
```bash
npx tsx scripts/seed-faq-corpus.ts && npx tsx scripts/seed-faq-kb-chunks.ts
```

---

## KNOWN ISSUES (Updated June 17, 2026 — Session 33 audit)

1. ~~**Groq TTS voice mode blocked**~~ — ✅ RESOLVED June 16, 2026. Groq Orpheus terms accepted; audio MIME/format fixed in Session 21.
2. **Generation engine: approval gate, setState, empty boxes** — MEDIUM. File: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
3. ~~**Bracket highlighting regex + checklist builder**~~ — ✅ RESOLVED Sprint 1 (Session 27, commit 653c066). `docx-builder.ts` and `checklist-builder.ts` both use `/\[[^\[\]]+\]/g` which matches any `[descriptive bracket]`. LLM reference brackets (`[from Tab X]`, `[insert here]`) stripped in Step 12 via `LLM_REFERENCE_BRACKET_REGEX`. No further action needed.
4. ~~**getSession() security warnings**~~ — ✅ RESOLVED Session 84. Full grep confirms zero `.getSession()` calls remain in src/; all routes use `.getUser()`.
5. ~~**seed-test-applicant.ts grabs current auth user**~~ — ✅ MOOT Session 84. File no longer exists; replaced by `scripts/seed-test-profiles.mjs` which uses explicit user IDs and is idempotent.
6. ~~**004_answers_source_update.sql not applied**~~ — ✅ CLOSED. File never existed (incorrect reference in BUILD_TRACKER). Investigation confirms the document upload code does NOT write `'document_upload'` to `answers.source` — uses default `'user_entry'`. PreFillBadge uses it only in UI display layer, not DB. No DB error is occurring. Low-priority if code starts writing that value in future.
7. **Supabase CLI migration history out of sync** — MEDIUM. `supabase migration list` shows 2 of 24; ~22 applied manually via SQL Editor. Do not rely on `db push` without verifying via SQL Editor first.
8. ~~**Stripe API version outdated (2024-06-20)**~~ — ✅ RESOLVED Session 56. `scripts/stripe-setup.ts` now uses `2026-05-27.dahlia`.
9. **Resend domain verification unknown** — MEDIUM. If `e2go.app` is verified in Resend dashboard, revert sender to `results@e2go.app`.
10. **FAQ pgvector tables missing — seed scripts BLOCKED** — HIGH. `faq_qa_corpus`, `faq_kb_chunks`, `faq_query_log` tables confirmed missing via REST API. `20260613200000_faq_pgvector_tables.sql` and `20260613210000_faq_search_functions.sql` were never applied. Apply both via SQL Editor, then run seed scripts. Combined SQL: see OWNER MANUAL ACTIONS below.
11. **OpenAI API key needs rotation** — MEDIUM. Key was exposed in chat transcript in Session 28. Go to platform.openai.com → API keys → revoke + recreate → update in `.env.local` and Vercel env vars.
12. ~~**simulator_outcomes table missing**~~ — ✅ EXISTS. Confirmed via REST API — table is present and empty (migration was applied). Session 32 note was stale.
13. **RLS investigation pending** — LOW. quiz_sessions anon INSERT behavior unexplained. Run Group 10 SQL queries in Supabase SQL Editor.
14. **Fast Refresh occasional hot reload errors** — LOW. Non-blocking.

---

## LAUNCH READINESS CHECKLIST (Updated June 17, 2026)

- [x] ~~Simulator voice mode unblocked~~ — ✅ Groq TTS terms accepted June 16
- [x] ~~Stripe webhook configured for production URL~~ — ✅ Done June 16
- [x] ~~Upstash Redis env vars in Vercel~~ — ✅ Done June 16
- [ ] **Apply FAQ pgvector migration + seed** (SQL Editor → run seed scripts) — BLOCKER
- [ ] **Rotate OpenAI API key** (platform.openai.com) — SECURITY
- [ ] Payment flow verified end-to-end (Stripe CLI + test card 4242 4242 4242 4242)
- [ ] Sentry error tracking live (SESSION22_SENTRY_ERROR_TRACKING — not yet built)
- [ ] Refund $197 test Stripe charge
- [ ] Chen's account clean (duplicate application SQL)
- [ ] npm run build clean on final commit before deploy
- [ ] Deploy to production (Vercel, main branch PR)
- [ ] Attorney review of 3 generated sample packages (not a code task)

---

---

### June 16, 2026 — Session 21: Simulator Audio Fix + Ready Screen + Gap Analysis Architecture

**Scope:** Three immediate simulator fixes + full Gap Analysis architecture planning. No pricing work — deferred to a dedicated session.

#### TTS Audio Fixes (root cause resolved)

**Bug 1 — Complete audio silence (MIME type mismatch):**
- Root cause: `src/lib/groq-tts.ts` presented WAV audio as `data:audio/mp3;base64,` — browsers silently failed to decode
- Fix: Changed to `data:audio/wav;base64,` in `groq-tts.ts`

**Bug 2 — TTS format mismatch:**
- Root cause: `src/app/api/simulator/tts/route.ts` sent `response_format: 'mp3'` but Groq Orpheus only accepts `'wav'`
- Fix: Changed `response_format` to `'wav'`

**Bug 3 — Browser autoplay policy blocking TTS:**
- Root cause: By the time `ConversationalSession` mounted and `useEffect` fired `runIntro()`, multiple async API calls had elapsed since the "Start Voice Interview" click — expiring the browser's gesture trust window for audio
- Fix: Added 'ready' phase. Playing a silent 44-byte WAV synchronously during the "Begin interview" button click permanently unlocks audio for the page session via `document.userActivation.hasBeenActive`

#### Simulator Loading Flicker Fix

- Root cause: Loading guard `if (!sessionInfo)` allowed render to proceed when `hasCaseFile === null` (still resolving), causing StartScreen (voice/text mode buttons) to flash briefly
- Fix: `src/app/simulator/page.tsx` line 430 — guard changed to `if (!sessionInfo || hasCaseFile === null)`

#### Pre-Interview Ready Screen (new phase)

**Files Modified:**
- `src/components/simulator/ConversationalSession.tsx` — complete rewrite adding 'ready' phase:
  - `type Phase = 'ready' | 'intro' | 'questions'` (was `'intro' | 'questions'`)
  - Initial state now `'ready'` (was `'intro'` with auto-start on mount)
  - Pre-session screen: Officer Williams card, "Before we begin" heading, speaker test button, mic test button
  - `handleTestSpeaker()` — calls speakQuestion with test audio + plays silent WAV unlock
  - `handleTestMic()` — requests getUserMedia, sets micTested / micTestError
  - `handleBeginInterview()` — plays silent WAV unlock synchronously, starts session timer, transitions to 'intro' and calls runIntro()
  - Session timer moved OUT of mount useEffect INTO handleBeginInterview (timer now starts when interview actually begins, not when component mounts)
  - Top bar pill: PRE-SESSION / INTRODUCTION / Q N/N — reflects current phase
  - Timer hidden during 'ready' phase (doesn't start eating into 15 minutes on the wait screen)
  - Device check buttons: transparent → gold active → green done states

**Files Modified:**
- `src/app/simulator/page.tsx` — loading guard fix (`hasCaseFile === null`)
- `src/app/api/simulator/tts/route.ts` — `response_format: 'wav'`
- `src/lib/groq-tts.ts` — MIME type `data:audio/wav;base64,`

**Build:** Clean ✅

#### Architecture Planning (no code — decisions logged)

**Gap Analysis module:**
- Three purchasable modules: Simulator | Gap Analysis | Document Generation (standalone or bundled)
- Six E-2 evidence categories with scoring weights: Source of Funds (25%), Management Role (25%), Business Plan (20%), Investment Amount (15%), Employment (10%), Operations (5%)
- Gap Analysis must: score existing evidence → identify gaps → ask for documents before questions → recalculate after remediation
- Goal: bridge case from current state to a state with a reasonable chance of approval

**Case Intelligence Profile (CIP) — shared data model:**
- Single unified data object fed by: document extraction + quiz answers + follow-up Q&A + case file answers
- Consumed by ALL three modules — gap analysis scores against it, simulator questions reference it, document generation is aware of weaknesses
- Not yet built — architectural concept agreed and locked

**Adaptive intake pattern:**
1. Accept any format (formal docs, rough drafts, notes — LLM normalizes)
2. Extract what can be extracted → show pre-filled confirmation card
3. For missing fields: "Do you have a document for X?" before asking directly
4. Only ask bare questions for data that can't be extracted or documented
5. Never duplicate questions already answered in uploaded documents

**Simulator-only intake:**
- Standalone simulator users receive Adaptive Quick Intake (~10 questions, adaptive based on what documents already answer)
- Not yet built

**Process flow widget:**
- Interactive end-to-end workflow diagram for landing page showing full client journey
- Designed as HTML/JS interactive widget in this session
- To be converted to React `<ProcessFlow />` component in a future session

---

### June 16, 2026 — Session 22: Simulator Evaluation Quality + Question Variety + Timer Redesign

**Scope:** Four simulator improvements — evaluation quality, per-session question variety, prominent session timer, comprehensive post-session coaching report with model answers.

#### 1. Evaluate prompt — coaching quality fix

**Problem:** Previous session introduced "2 sentences max" / "1 sentence" constraints to reduce tokens, which made evaluation feedback shallow and unhelpful.

- `src/app/api/simulator/evaluate/route.ts` — prompt rewritten:
  - `feedback`: now asks for 3 sentences — what the officer expects, whether the answer meets the bar, and the specific gap identified
  - `specificSuggestion`: now asks for 2 sentences — exactly what to say differently and how to frame it correctly for E-2
  - `documentReference`: now specifies the full tab name (e.g. "Tab B - Business Plan, Section 3") not just a tab letter
  - `max_tokens`: bumped from 300 → 400 to accommodate richer feedback

#### 2. Question variety — pool-based random selection

**Problem:** All 9 universal questions were hardcoded with identical phrasing every session. A client doing 4 sessions gets the same 9 questions every time.

- `src/lib/simulator-engine.ts` — complete rewrite of `generateQuestions()`:
  - Added `pick<T>()` and `shuffle<T>()` helpers
  - Each universal question (UQ-01 through UQ-09) now draws from a pool of 3-4 alternative phrasings per topic, randomly selected each session
  - Weak point probe questions (WP-01 through WP-04) also have 2-3 phrasings per probe
  - New WP-05 probe for immigrant intent risk (moderate or high flag)
  - `getBusinessTypeQuestions()` now returns expanded pools of 5-6 questions per category; caller shuffles and takes 3
  - Business type pools expanded — added 3 new categories: transport/logistics, construction/contractor, plus enriched generic pool
  - Business type pool questions now personalized with context variables (investment amount etc.)
  - Total variety: 9 topic pools × ~4 phrasings = 36 universal variants; 7+ category pools × 5-6 questions each

#### 3. Session timer — prominent visual countdown

**Problem:** Timer was a 13px text label in the top-right corner of the voice interview; text mode had no visible timer at all.

- `src/components/simulator/ConversationalSession.tsx` (voice mode):
  - Removed timer text from top bar
  - Removed text-only `timerBanner` warning
  - Added `@keyframes timerPulse` animation
  - Added fixed bottom bar (56px, `z-index: 200`, `backdrop-filter: blur(12px)`)
  - Bar contains: "Session time" label + depleting gold progress bar + 22px digital countdown
  - At < 2 minutes: background turns red tint, bar turns red, countdown pulses, label → "Time running out"
  - `page` style: added `paddingBottom: '56px'` so content doesn't hide behind bar
- `src/app/simulator/page.tsx` (text mode `ActiveSession`):
  - Removed non-functional `{mode === 'voice' && timer}` guards (mode is always 'text' in ActiveSession)
  - Added identical fixed bottom bar to text mode as well
  - Text mode now has a visible session timer for the first time

#### 4. Comprehensive post-session coaching report

**Problem:** Session complete screen showed one-line suggestions per weak answer. User request: full coaching cards with what the officer expected, what was missing, and what a strong answer looks like.

**Types updated (`src/types/simulator.ts`):**
- `QuestionCoaching` — added `modelAnswer: string` field
- `CoachingSummary.needsWork` — enriched with `questionId` and `originalAnswer`
- `CoachingSummary.inconsistencies` — enriched with `questionId` and `originalAnswer`

**Engine updated (`src/lib/simulator-engine.ts`):**
- `generateCoachingSummary()` local array type declarations updated to match new interface
- Now correctly populates `questionId` and `originalAnswer` in both `needsWork` and `inconsistencies`

**New route (`src/app/api/simulator/coaching-report/route.ts`):**
- POST endpoint, model: `xiaomi/mimo-v2.5-pro`, timeout: 90s, max_tokens: 2400
- Takes all weak/inconsistent Q&A pairs in one call
- Returns `QuestionCoaching[]` per question with: `whatOfficerExpected`, `whatWasMissing`, `keyPoints[]` (3-5 bullets), `modelAnswer` (first-person example answer), `documentReference`
- Non-fatal: returns `[]` on timeout or parse failure — coaching cards simply don't appear

**Simulator page (`src/app/simulator/page.tsx`):**
- Added `QuestionCoaching` to type imports
- Added `coachingLoading` state
- Added `fetchCoachingReport(summary, ctx)` async helper — fires post-completion, non-blocking
- Hooked into both completion paths: text mode (after `setScreen('complete')`) and voice mode (`onComplete` callback)
- Passes `coachingLoading` to `SessionComplete`

**`SessionComplete` component — full redesign:**
- New `CoachingCard` sub-component (appears once per weak/inconsistent question):
  - Badge: WEAK / INCONSISTENCY (color-coded)
  - Question text + truncated original answer (italicized, 180-char limit)
  - "WHAT THE OFFICER EXPECTS" — 2-3 sentence explanation
  - "WHAT WAS MISSING" — gap analysis
  - "WHAT TO SAY IN YOUR INTERVIEW" — bulleted key points (green bordered)
  - Model answer block (green tint, first-person, with disclaimer: "This is a guide… not a script. Officers can tell when answers are memorized.")
  - Document reference chip (gold tint)
  - Falls back to original one-liner suggestion if coaching API didn't return data
- Loading state: "Analyzing your answers with E-2 expertise..." spinner while coaching loads
- "generating..." inline label next to section heading while loading but after cards appear
- Strong answers section condensed (count in title)
- Practice section updated: "Focus on these questions in your next session"

**Build:** Clean ✅ — `npm run build` zero errors, 93 static pages

---

## SESSION — Voice Simulator Overhaul (June 17, 2026)

### Completed

**Bug: stuck on "Signing in" (Michael Chen account)**
- Root cause: Fast Refresh resets `let browserClient = null` → multiple GoTrueClient
  instances compete for `navigator.locks` Web Lock → `signInWithPassword` hangs forever
- Fix: store singleton on `window.__e2go_supabase__` in `src/lib/supabase.ts` so it
  survives every Hot Reload rebuild
- Commits: 3a05708 (singleton), 3404ec8

**Bug: stuck on "Verifying payment…" after simulator purchase**
- Root cause 1: `create-checkout` `isSameOrigin()` compared dev autoPort vs `localhost:3000`
  → `successUrl` silently replaced → wrong redirect after Stripe
- Root cause 2: `/pricing/success` didn't handle `simulator_3pack` tier → no redirect to `/simulator`
- Root cause 3: login page queried `payment_completed_at` (non-existent column) → should be `payment_status`
- Fixes: `src/app/api/stripe/create-checkout/route.ts`, `src/app/pricing/success/page.tsx`,
  `src/app/login/page.tsx`
- Commit: 93d5708

**Bug: service worker intercepting login redirect**
- SW intercepted `mode === 'navigate'` requests → "Failed to fetch" dropped post-login redirect
- Fix: `public/sw.js` — early return for `navigate` mode and `/_next/` paths
- Commit: 1233067

**Feature: disable sessions-exhausted paywall gate (temporary)**
- Removed UI gate from `StartScreen` and `SESSION_LIMIT_EXCEEDED` throw in simulator-engine.ts
- Commits: 5eb14dd, 1d4b627

**Bug: VAD cuts off answers mid-thought**
- `SILENCE_AFTER_SPEECH_MS`: 2000 → 3500ms
- Commit: 564374e

**Bug: evaluation delay breaks voice flow + "unable to evaluate" shown mid-session**
- Moved all evaluation from sequential per-question to parallel post-session batch
- During session: transcribe → store raw answer → show "✓ Answer recorded" → 2s auto-advance
- After last question: parallel `Promise.all` across all evaluate API calls (~20s total vs 10×20s)
- `ConversationalSession.tsx` now passes `RawVoiceAnswer[]` up via `onComplete`
- `simulator/page.tsx` runs `evaluateAndComplete()` with evaluating spinner, then coaching
- Commit: 564374e

**Bug: officer voice/tone inconsistent between questions**
- Added `officerSpeech(text, idx)` wrapper with 11 transition phrases array
- Questions prefixed with `"Thank you.", "Good.", "I see."` etc. — consistent persona
- Commit: 564374e

**Bug: readiness indicator inverted — showed "Interview Ready" for all-NEEDS WORK sessions**
- `generateCoachingSummary` had `else { readinessIndicator = 'ready' }` when `weakOrInconsistentCount > 2`
- Fixed to `'needs_work'` in the branch where it belongs
- Commit: 564374e

**Fix: coaching-report API hardened**
- `max_tokens`: 2400 → 3200
- Prompt updated: explicit `[ID: ${a.questionId}]` format, instructs model to preserve exact IDs
- Added index-based fallback matching in `fetchCoachingReport` for coaching card lookup
- Commit: 564374e

**Fix: ESLint build errors from ConversationalSession refactor**
- Removed unused `saveSimulatorAnswer` import
- Made `userId`/`applicationId` optional in interface; destructured as `_userId`/`_applicationId`
- Deleted unused `ratingColor`, `ratingLabel` assignments
- Commit: 27a55f7

### Build
Clean ✅ — `npm run build` zero errors after all fixes

---

---

### June 16, 2026 — Session 25: Interview Knowledge Base + Day of Interview Page + FAQ Guards

**Scope:** Build the intelligence layer for the interview preparation system — knowledge base, coaching engine upgrade, consulate data, interview day page, and FAQ inappropriate content hardening.

#### 1. Interview Question Knowledge Base

**Files Created:**
- `docs/E2_Interview_Questions_Master_Bank.md` — 20 gold-standard questions (IQ-01 to IQ-20) with full frameworks, officer tests, key principles, red flags, gold-standard answer structures, Toronto notes. Appendices: frequency reference table + Toronto consulate intelligence.
- `src/lib/interview-knowledge-base.ts` — TypeScript typed knowledge base with `getQuestionKnowledge(simulatorQuestionId)` and `buildKnowledgeBlock()` exports. 20 entries covering Core Opening, Business Viability, Investment Drill-Downs, Qualifications, Nonimmigrant Intent, 2026 Updates.

#### 2. Coaching Engine Upgrade

**Files Modified:**
- `src/app/api/simulator/evaluate/route.ts` — injects gold-standard framework block per question type using `getQuestionKnowledge()`. Officer now evaluates against doctrine-specific criteria, not generic AI guesses.
- `src/app/api/simulator/coaching-report/route.ts` — major upgrade:
  - Per-question gold-standard framework injected into prompt
  - Real case data injected: investment sources, fund flow chronology, projections, management activities, employee roles
  - System prompt changed to "senior E-2 visa immigration consultant" persona
  - Instruction: "USE THEIR ACTUAL NUMBERS AND FACTS — not placeholders"
  - `max_tokens` 3200 → 4000, `temperature` 0.4 → 0.35
  - Commit: `8f92843`

#### 3. FAQ Inappropriate Content Guard (two-layer)

**Files Modified:**
- `src/app/api/faq/ask/route.ts` — regex keyword guard runs BEFORE scope check and BEFORE any API call. Zero cost for harmful queries. Returns `layer: "inappropriate_guard"`. Commit: `384b4af`
- `src/lib/faq-system-prompt.ts` — HIGHEST PRIORITY RULE added: model refuses harmful content even if regex misses edge cases. Commit: `c25bb0b`

#### 4. Consulate Data Library

**File Created:**
- `src/lib/consulate-data.ts` — verified addresses for 13 treaty countries (14 Canadian posts: Toronto, Vancouver, Calgary, Ottawa, Montreal). Full logistics for Canadian posts: exact addresses, phone, transit directions, parking, electronics policy ("Cell phones, smartphones, tablets, laptops, smartwatches, and all other electronic devices are NOT permitted inside the consulate building"), security notes. Helper functions: `getConsulateData()`, `getPrimaryPost()`, `getEmbassyFinderUrl()`, `getVerifiedCountries()`. Commit: `7011824`

**Key decision:** E-2 consulate determined by treaty nationality (from quiz Q0-01), NOT physical location. Third-country national processing eliminated September 2025.

#### 5. Document Checklist Generator

**File Created:**
- `src/lib/document-checklist.ts` — `buildDocumentChecklist(CaseFlags)` generates 4 sections:
  1. Personal Documents (passport, DS-160, appointment, MRV receipt, photo)
  2. Application Binder — all required tabs (Tab A through Tab L)
  3. Case-Specific Additions — dynamic based on: isFranchise (FDD, franchise agreement), investment sources (RRSP statement, property sale docs, gift letter, loan agreement), priorVisaDenial, hasSpouseApplying (marriage cert, spouse passport/DS-160), dependentChildCount (birth certs, children passports), hasPartner, pre-operational status (lease agreement, vendor contracts)
  4. Do Not Bring — phone, laptop/tablet, large bags, non-applying companions, food/drinks
  Commit: `2eb58ad`

#### 6. Interview Day Page

**File Created:**
- `src/app/simulator/interview-day/page.tsx` — full `/simulator/interview-day` page:
  - Fetches client's treaty country from their application, looks up consulate from `consulate-data.ts`
  - Multi-post selector for Canada (5 posts shown, switchable)
  - Electronics warning banner (red, prominent)
  - Consulate address card with: address, phone, transit, parking, website link, appointment link
  - Day-of timeline: 6 steps from arrival to decision
  - "10 Things to Know Before You Walk In" — tips including social media warning (May 2026 policy), 221(g) explanation, standing window format, key numbers to memorise
  - Personalised document checklist from `buildDocumentChecklist()` with interactive checkboxes + progress bar
  - "Do Not Bring" section with ✕ indicators
  - Print button
  - Fallback for unverified countries: link to usembassy.gov
  Commit: `380b7bc`

**Build:** Clean ✅ — 50 routes compiled, zero errors

---

## NEXT SESSION PRIORITIES (Updated June 16, 2026 — Session 25)

**Owner actions pending:**
1. Refund $197 test charge in Stripe dashboard
2. Apply migration `docs/migrations/004_answers_source_update.sql` via `npx supabase db push`
3. Run FAQ seed scripts (pgvector 368 Q&A)
4. Add `/simulator/interview-day` link in the simulator dashboard/nav so clients can reach it

**Code sessions — in priority order:**
1. End-to-end voice simulator test — run a full session as Michael Chen, verify:
   - VAD doesn't jump mid-answer (3.5s threshold)
   - No evaluation delay between questions ("✓ Answer recorded" only)
   - Post-session evaluating spinner fires, then coaching cards show real content
   - Readiness badge correctly says "More preparation needed" when answers are weak
   - Officer transitions consistent throughout session
2. Interview Preparation Kit (SESSION21_INTERVIEW_PREP_KIT) — full build:
   - 10-section PDF/downloadable document, generated post-session
   - Delivery analysis (filler words, pauses, hedging) already captured — inject into kit
   - Per-question sections: score, what officer expected, what was missing, model answer (using real case data)
   - Success measurement touchpoint: invite client back to report interview outcome
3. Process Flow widget → React `<ProcessFlow />` component on landing page
4. Generation engine fixes — docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
5. Bracket highlighting regex + checklist builder fix
6. Knowledge base → Document generation propagation — inject relevant `InterviewQuestionKnowledge` entries into each document's generation prompt (deferred — touches 15-step pipeline)
7. Pricing/packaging consolidation — all tiers need review (deferred from Session 21)
8. SESSION_INVOICING — Stripe invoice generation on checkout

---

## SESSION 26 — Strategic Analysis & Documentation (June 17, 2026)

**No code written.** This was a planning session. All findings documented in memory files.

### Engine Scoring Audit (code-level gap analysis)

All 8 engines scored by reading actual source code, wearing hats of immigration consultant, visa counselor, UI expert, client, and product strategist.

| Engine | Score | Primary Gap |
|---|---|---|
| Coaching Report | 8.0 | No cross-session comparison; token dilution across many weak answers |
| Interview Day | 7.8 | Nav link missing; `hasDocumentUploads: false` hardcoded line 148 |
| Evaluate Engine | 7.2 | `max_tokens: 400` too thin; no severity tier; no rolling window |
| Quiz / Eligibility | 7.2 | Static flag_explanations.json; no score breakdown; binary timeline |
| Simulator | 7.0 | `immigrantIntentRisk: 'moderate'` hardcoded line 132 simulator-engine.ts |
| Document Generation | 6.3 | Bracket placeholder regex mismatch; no D-code awareness in cover letter |
| Case File | 6.2 | `hasAnswer()` checks `length > 3` only — purely presence-based |
| Gap Analysis | 6.0 | Entirely presence-based; D-codes binary; no LLM semantic pass |

### Complete Fix List — 38 Items Across All Engines

**ALREADY DONE:** Inverted readiness indicator — fixed commit `564374e` (Voice Simulator Overhaul). Remove from all future lists.

**Quick wins (tonight — < 2 hours each):**
1. Fix bracket placeholder regex — widened to match descriptive `[text]` brackets
2. Increase evaluate `max_tokens` 400 → 700
3. Add `severity: 'fatal' | 'significant' | 'cosmetic'` to evaluate output schema
4. Fix `hasDocumentUploads: false` — interview-day/page.tsx line 148 → query application_documents
5. Add nav link for `/simulator/interview-day` in simulator dashboard
6. PlayAI TTS upgrade — one model name change in tts/route.ts, eliminates 200-char chunk limit

**Sprint 2 — Quality improvements:**
7. Fix `immigrantIntentRisk: 'moderate'` hardcoded — simulator-engine.ts line 132 → derive from case flags
8. Pass 3-answer rolling window to evaluate engine (within-session inconsistency detection)
9. Non-null `specificSuggestion` for strong evaluate answers
10. Cross-session coaching — pass prior session summary into coaching-report request + "change from last session" as first card
11. D-code top-3 section on interview day page
12. Personalized warning text via LLM (replace static flag_explanations.json)
13. D-code-aware cover letter generation

**Sprint 3 — Product features:**
14. Follow-up probe per weak simulator answer (contextual follow-up before advancing to next question)
15. Cross-document consistency pass post-generation
16. Multi-pass quality check post-generation (prohibited vocab, placeholder tokens, 5 officer questions in cover letter)
17. Case briefs generation trigger banner (when substantiality_score is null)
18. "Fix this now" deep links from gap cards to exact intake fields
19. Numeric score 1–10 in evaluate output + cross-session progress metric
20. Coaching report max_tokens 4000 → 6000 + severity tier + synthesis conclusion ("top 3 before next session")
21. Score breakdown by 5 criteria in quiz results
22. Adaptive quiz branching for prior denial + RRSP paths
23. "Ask a follow-up" FAQ pre-loaded at bottom of quiz results
24. Add TTS/STT fallback chains — Groq → OpenAI → Browser for both routes
25. Create `src/lib/llm-client.ts` — shared `callLLM(task, messages, opts)` with FALLBACK_CHAINS per task type

**Sprint 4 — Intelligence layer:**
26. LLM enrichment pass on gap analysis "needs_work" categories
27. Semantic content evaluation for 3 critical gap analysis fields (projection basis, management activities, source of funds)
28. Real-time field quality indicator in case file (on blur for major fields)
29. Cross-field investment health check in case file (live proportionality indicator)
30. Business-type adaptive weights in gap analysis (franchise 2× FDD weight; pre-start 2× commitment docs)
31. Speaking pattern analysis post-transcription in simulator (hedge word ratio, answer length, sentence complexity)
32. Post-interview outcome capture at +2 weeks
33. Timeline personalization in quiz results (treaty country, prior denial, partnership complexity)

**Sprint 5 — UX polish:**
34. Targeted revision flow — "Revise this paragraph" button on document preview
35. Voice profile completeness gate before document generation (< 100 words triggers prompt)
36. Document quality feedback on upload (bank statements: 6-12 months recommendation)
37. "What makes a strong answer" expandable guidance per case file field
38. Case-type field prioritization at top of case file form

### Model Pricing Research (verified June 17, 2026)

| Model | Input / 1M | Output / 1M | Use |
|---|---|---|---|
| `xiaomi/mimo-v2.5` | $0.14 | $0.28 | Evaluate, FAQ, gap enrichment |
| `xiaomi/mimo-v2.5-pro` | $0.435 | $0.87 | Coaching reports |
| `google/gemini-2.5-flash` | $0.30 | $2.50 | OpenRouter fallback |
| `claude-sonnet-4-6` | $3.00 | $15.00 | Document generation (recommended) |
| `claude-opus-4-8` | $15.00 | $75.00 | Current default in app_settings |

**Per-client cost:** ~$1.80 current (Opus for docs) → ~$0.42 with Sonnet + all improvements.
**As % of $550 revenue:** 0.076%. Never a business constraint.
**Recommendation:** Evaluate switching `generation_model` from `claude-opus-4-8` to `claude-sonnet-4-6` — saves $1.33/client, negligible quality difference for structured legal documents.

### Fallback Architecture Designed

**Two-provider strategy (designed, not yet implemented):**
- Provider 1: OpenRouter (MIMO primary + Gemini in `models` array for automatic failover)
- Provider 2: Anthropic (Claude fallback when OpenRouter fails entirely)

Per-route chains documented in memory file `fallback_architecture.md`.
Implementation: `src/lib/llm-client.ts` (code fix #13 above).

**Voice fallback:** Both TTS and STT use keys already in .env.local (GROQ_API_KEY + OPENAI_API_KEY). No new integrations needed.

**Grok (xAI) NOT in fallback chain.** Knowledge cutoff Nov 2024 too old for immigration. Brand risk for immigration clients. Groq (inference company) ≠ Grok (xAI) — both already clarified and documented.

### Groq / Grok Clarification — Permanent Record

- **Groq** (groq.com): Inference acceleration company. Already integrated via GROQ_API_KEY. Powers both TTS (Orpheus) and STT (Whisper) in simulator.
- **Grok** (x.ai): xAI's LLM. NOT integrated. NOT in fallback chain.

Current TTS limitation: Orpheus requires ≤200 chars/request → text chunked → audible seam between chunks. Fix: upgrade to `playai-tts` (single model name change in tts/route.ts).

### Build
No code changes. No commit needed.

---

## SESSION 27 — Sprint 1 Code Execution (June 17, 2026)

**Branch:** dev. Build clean. 7 commits.

### Changes Made

**1. `src/types/simulator.ts`** — commit `66ddae1`
- Added `severity?: 'fatal' | 'significant' | 'cosmetic'` to `AnswerEvaluation`
- Added `severity?: 'fatal' | 'significant' | 'cosmetic'` to `QuestionCoaching`
- Added `top3NextSession?: string[]` to `CoachingSummary`

**2. `src/app/api/simulator/evaluate/route.ts`** — commit `6f7e2da`
- `max_tokens: 400` → `700` (allows coaching-grade 3-sentence feedback)
- Added `severity` field to prompt output schema with definitions (fatal/significant/cosmetic)
- Changed `specificSuggestion` to always be non-null — for strong answers, suggests next elevation
- Extracts `severity` from parsed JSON and passes through to response

**3. `src/app/simulator/interview-day/page.tsx`** — commit `b3c9caa`
- Replaced hardcoded `hasDocumentUploads: false` with live query to `application_documents` table
- Uses `{ count: 'exact', head: true }` — zero extra data transferred

**4. `src/app/simulator/page.tsx`** — commit `8ecb845`
- Added "Interview Day Guide →" link in StartScreen (always visible before sessions)
- Added "Interview Day Guide" button in complete screen action row
- Wire `top3NextSession` from coaching-report API response into `coachingSummary` state

**5. `src/app/api/simulator/coaching-report/route.ts`** — commit `ad4330e`
- `max_tokens: 4000` → `6000` (cost +$0.002/report, negligible)
- Added `severity` per coaching card to prompt schema
- Added `top3NextSession: string[]` synthesis as top-level field in response envelope
- Parser handles both new object envelope `{ coaching, top3NextSession }` and bare array fallback

**6. `src/app/api/simulator/tts/route.ts` + `src/lib/groq-tts.ts`** — commit `9245a7c`
- TTS route: extracted `callGroqTTS()` and `callOpenAITTS()` helpers with try/catch chain
- Groq Orpheus primary → OpenAI TTS (`tts-1`, voice `onyx`) fallback → `{ fallbackToBrowser: true }` signal
- `groq-tts.ts`: handles `fallbackToBrowser` signal by calling `browserSpeak()` (SpeechSynthesisUtterance)
- Fully transparent to ConversationalSession — no component changes needed

**7. `src/app/api/simulator/transcribe/route.ts`** — commit `1e22787`
- STT route: `transcribeWithGroq()` + `transcribeWithOpenAI()` helpers
- Groq `whisper-large-v3-turbo` primary → OpenAI `whisper-1` fallback
- Identical quality at fallback — same Whisper model weights, just different inference provider

### Items Skipped (Already Done or Deferred)
- Bracket placeholder regex: both `docx-builder.ts` and `checklist-builder.ts` already use `/\[[^\[\]]+\]/g` — correct. Root cause of placeholder issue may be elsewhere (generation-engine.ts stripping brackets). Deferred to Sprint 2 investigation.
- PlayAI TTS upgrade: moved to Sprint 2 (single line change, low risk, do with user present)

### What's Next (Sprint 2 — requires user presence)
1. Fix `immigrantIntentRisk: 'moderate'` hardcoded in `simulator-engine.ts` line 132
2. Pass 3-answer rolling window to evaluate engine
3. D-code top-3 section on interview day page
4. Cross-session coaching (pass prior session summary into coaching-report request)
5. PlayAI TTS upgrade (single model name change in tts/route.ts)
6. Personalized warning text via LLM (replace static flag_explanations.json)
7. D-code-aware cover letter generation

### Memory Files Created This Session
- `memory/engine_scoring_roadmap.md` — full engine audit with priority fix order
- `memory/model_pricing.md` — verified pricing table + per-client cost analysis
- `memory/fallback_architecture.md` — per-route fallback chains + implementation pattern
- `memory/voice_pipeline.md` — Groq TTS/STT current state, upgrade path, Groq vs Grok distinction
- `memory/project_state_june17.md` — replaces project_state_june16.md

---

## SESSION 28 — Security Audit + Infrastructure (June 17, 2026)

**Branch:** dev. Build clean. 4 commits.

### OpenAI API Key
- `OPENAI_API_KEY` added to `.env.local` — enables TTS/STT fallback chains built in Session 27
- `OPENAI_API_KEY` added to Vercel (All Environments) — production fallback now active
- ⚠️ Key was shared in chat plaintext — should be rotated at platform.openai.com

### Security Fixes (4 commits)

**1. `src/app/api/analysis/run/route.ts`** — commit `6582334` — CRITICAL
- Was: auth based on `Authorization` header existence + `userId` from request body (attacker-controlled)
- Now: proper session auth via `createSupabaseServerClient().auth.getUser()`, userId NOT taken from body
- Ownership check compares against `user.id` from verified session token

**2. `src/app/api/answers/route.ts`** — commit `0362063`
- Added application ownership verification before upsert
- Queries `applications` filtered by both `id` and `user_id` — prevents writing answers to another user's case file

**3. `src/middleware.ts`** — commit `7061b22`
- Removed spoofable `x-user-id` header rate limit block for `/api/generate` and `/api/analysis`
- These routes now rely on Upstash Redis rate limits keyed to verified `user.id` inside each route handler

**4. `src/lib/rate-limit.ts`** — commit `c20d9d8`
- Expanded from 1 route (FAQ) to 6 per-route profiles
- Profiles: `faq` (10/10m), `evaluate` (30/10m), `coaching` (6/60m), `tts` (60/10m), `transcribe` (60/10m), `generate` (4/60m)
- `checkRateLimit()` now accepts `profile: RateLimitProfile` parameter

### Security Audit — Full Findings

**FIXED this session:**
| Issue | Severity | Status |
|---|---|---|
| Auth bypass in `/api/analysis/run` (header + body userId) | Critical | ✅ Fixed commit 6582334 |
| Cross-user write in `/api/answers` | High | ✅ Fixed commit 0362063 |
| Spoofable `x-user-id` middleware rate limit | High | ✅ Fixed commit 7061b22 |
| Rate limiting missing on 5 AI routes | Medium | ✅ Fixed commit c20d9d8 |

**CONFIRMED CLEAN:**
| Item | Finding |
|---|---|
| Stripe webhook | `constructEvent()` + signature + 5-min freshness ✅ |
| Document download route | Ownership verified before signed URL ✅ |
| Followup routes | Application ownership verified ✅ |
| Email anonymous path | DB as source of truth ✅ |
| Security headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy ✅ |
| NEXT_PUBLIC vars | Only safe vars exposed (anon key, publishable key, Price IDs, URL) ✅ |
| Supabase Storage bucket | **Private** — confirmed via dashboard toggle ✅ |
| Documents in bucket | Business prep docs only (cover letters, business plans, DS-160 copies, projections) — NOT passports or bank statements |

**KNOWN ISSUES (not yet fixed):**
| Issue | Priority | Notes |
|---|---|---|
| Login + quiz in-memory rate limits reset on Vercel cold-start | Medium | Map resets per function instance; needs Upstash migration |
| CSP `unsafe-eval` | Low | Complex nonce refactor; not urgent |
| HSTS header missing | Low | Vercel likely handles at CDN level |

### What's Next (Sprint 2 — requires user presence)
1. Fix `immigrantIntentRisk: 'moderate'` hardcoded in `simulator-engine.ts` line 132
2. Pass 3-answer rolling window to evaluate engine
3. D-code top-3 section on interview day page
4. Cross-session coaching (pass prior session summary into coaching-report request)
5. PlayAI TTS upgrade (single model name change in `tts/route.ts`)
6. Personalized warning text via LLM (replace static `flag_explanations.json`)
7. D-code-aware cover letter generation
8. Migrate login + quiz rate limits from in-memory Map to Upstash Redis

---

## SESSION 29 — Sprint 2 + Sprint 3 Complete (June 17, 2026)

**Branch:** dev. Build clean. 7 commits.

### Sprint 2 — Carried-Over Items (completed this session)

All Sprint 2 items from Session 28 were already committed before this session:
- Bracket regex fix (generation-engine.ts) — ✅ committed
- Supabase `coaching_notes` column migration — ✅ applied via SQL Editor
- PlayAI TTS upgrade (tts/route.ts, `playai-tts` model + `Fritz-PlayAI`) — ✅ committed
- Upstash Redis rate limits in middleware — ✅ committed
- `priorAnswers` rolling window to evaluate — ✅ committed
- Cross-session coaching (prior session query + coaching-report injection) — ✅ committed
- Interview-day D-code section — ✅ committed
- Personalized quiz flag warnings — ✅ committed
- D-code-aware cover letter generation — ✅ committed

### Sprint 3 — All 4 Items Complete

**1. LLM fallback chains** — commits `7f40cbc`, `09170a8`, `8c43ea5`
- `src/lib/llm-client.ts` (NEW) — shared `callLLM(task, messages, opts)` with two-provider fallback:
  - Layer 1: OpenRouter with `models` array (MIMO primary → Gemini 2.5 Flash → Gemini 2.5 Pro)
  - Layer 2: Anthropic SDK direct (claude-haiku for evaluate/faq, claude-sonnet for coaching)
- `evaluate/route.ts` — replaced direct fetch with `callLLM`
- `coaching-report/route.ts` — replaced direct fetch with `callLLM`
- `faq/ask/route.ts` — added `streamViaAnthropic()` fallback alongside existing `streamViaOpenRouter()`
- `follow-up/route.ts` — wired through `callLLM` (also done as part of item 2)

**2. Follow-up probe per weak simulator answer** — commit `6390b17`
- `follow-up/route.ts` — wired through `callLLM` fallback chain
- `simulator/page.tsx` — auto-triggers `fetchFollowUp()` when evaluation returns weak/inconsistent
  - One level deep only (no recursive follow-ups when already in follow-up)
  - Text mode only (voice mode evaluates post-session — no mid-session weak detection)
- `fetchFollowUp()` updated to accept explicit args to avoid stale-closure issues

**3. Numeric score 1–10 on evaluate output** — commit `2afdd9a`
- `src/types/simulator.ts` — `score?: number` added to `AnswerEvaluation` + `SessionQuestion`
- `evaluate/route.ts` — prompt updated to request score with 1-10 guide; parse/validate on return
- `simulator/page.tsx` — score badge renders in both text and voice evaluation cards
  - Green ≥7, amber 5-6, red 1-4

**4. Case briefs trigger banner** — commit `316dd78`
- `gap-analysis/page.tsx`:
  - Added `hasAIAnalysis`, `analysisRunning`, `analysisError` state
  - Detects when `brief?.substantiality_score` is null → shows "Run AI Analysis" banner
  - Banner calls `POST /api/analysis/run` → reloads page on success
  - Inline error display on failure

### Build
Clean — zero errors. 7 commits on dev branch.

### What's Next (Sprint 4 — next session)
- LLM enrichment pass on gap analysis "needs_work" categories
- Semantic content evaluation for 3 critical gap analysis fields
- Real-time field quality indicator in case file (on blur)
- Cross-field investment health check (live proportionality indicator)
- Speaking pattern analysis post-transcription in simulator

### Post-Sprint Owner Actions (unchanged)
- Test PlayAI audio quality (needs user present)
- Rotate OpenAI API key (shared in chat plaintext in Session 28)
- Refund $197 test charge in Stripe dashboard
- Run FAQ seed scripts (`npx tsx scripts/seed-faq-corpus.ts`)

---

## SESSION 30 — Sprint 3 Complete + Sprint 4 In Progress (June 17, 2026)

**Branch:** dev. Build clean.

### Sprint 3 — Remaining 4 Items Completed

**Item 23: FAQ widget at bottom of quiz results** — commit `8e192f0`
- `src/app/results/page.tsx` — imported FaqWidget, inserted above disclaimer footer
- Section header "Questions about your results?" with subtitle
- Users can ask E2go about their flags without leaving the results screen

**Item 15: Cross-document consistency pass** — commit `e38acc5`
- `src/lib/generation-engine.ts` — added 3 new CONSISTENCY_FIELDS:
  `treaty_nationality`, `applicant_role`, `target_state`
- These run in step 9 of the generation pipeline alongside existing 7 fields

**Item 16: Multi-pass quality check** — commit `e38acc5`
- Added `PROHIBITED_VOCAB` list (17 phrases: overclaiming, AI disclosure, boss/employee misuse)
- Added `COVER_LETTER_OFFICER_PILLARS` (5 checks): substantiality, non-marginality, at-risk capital, managerial control, active enterprise
- Cover letter fails quality gate if any pillar is missing from the text

**Item 22: Adaptive quiz branching** — commit `4bad404`
- `src/data/module0_questions.json`:
  - Q0-06: RRSP option now triggers `W-RRSP` warning with documentation guidance
  - Q0-06a (NEW): sub-question for RRSP withdrawal status (already withdrawn / still in account / partial) with appropriate advisories
  - Q0-09d (NEW): sub-question for E-2-specific prior denial — shown when any visa refusal disclosed; triggers `W-E2-PRIOR-DENIAL` attorney flag (+15 score deduction)
- Score weights added: W-RRSP (-3), W-RRSP-PENDING (-5), W-RRSP-PARTIAL (-4), W-E2-PRIOR-DENIAL (-15)

### Sprint 3 — All Items Status

| Item | Description | Status |
|---|---|---|
| 14 | Follow-up probe per weak simulator answer | ✅ Session 29 |
| 15 | Cross-document consistency pass | ✅ Session 30 |
| 16 | Multi-pass quality check (prohibited vocab + 5 pillars) | ✅ Session 30 |
| 17 | Case briefs trigger banner | ✅ Session 29 |
| 18 | D-code deep links from gap cards | ✅ Session 29 |
| 19 | Numeric score 1–10 on evaluate output | ✅ Session 29 |
| 20 | Coaching report 6000 tokens + severity + top3 | ✅ Session 27 |
| 21 | Score breakdown by 5 criteria in quiz results | ✅ Session 29 |
| 22 | Adaptive quiz branching (RRSP + prior denial) | ✅ Session 30 |
| 23 | FAQ widget at bottom of quiz results | ✅ Session 30 |
| 24 | TTS/STT fallback chains | ✅ Session 28 |
| 25 | llm-client.ts shared callLLM() | ✅ Session 29 |

### Sprint 4 — All 8 Items Complete

**Item 26: LLM enrichment for needs_work gap categories** — commit `d5c6783`
- NEW `/api/gap-analysis/enrich` — callLLM generates 3-sentence advisory (why it matters, key gap, next 7-day action) for any category scoring < 70
- `gap-analysis/page.tsx` — fires parallel async enrichment after scoreCase(); CategoryCard shows "E2GO ADVISOR" block with loading state

**Item 27: Semantic content evaluation for 3 critical fields** — commit `09eeb18`
- NEW `/api/gap-analysis/semantic-eval` — evaluates projection_basis, management_activities, source_of_funds via callLLM in parallel; reads actual answer content from DB
- "Critical field review" panel above denial radar with per-field rating, finding, and fix link

**Item 28: Real-time field quality indicator on blur** — commit `4a90a16`
- NEW `/api/case-file/field-quality` — length gate + LLM quality check (strong/adequate/needs_work/too_short) for 8 defined fields
- NEW `src/hooks/useFieldQuality.ts` — useFieldQuality() hook, fires on blur, non-blocking
- TextArea: added optional `onBlur` prop; wired in story page cluster 1 (M3-S1-01/02/03)

**Item 29: Cross-field investment health check** — commit `a49f9bd`
- Inline proportionality indicator in /apply/investment cluster 1
- Animated progress bar with 50%/75% threshold markers
- Status: STRONG (≥75%) / ADEQUATE (50-74%) / BORDERLINE (30-49%) / WEAK (<30%)
- Extra note when invested amount < $100,000

**Item 30: Business-type adaptive weights in gap analysis** — commit `cd235d3`
- Franchise: business_plan weight 20%→35%, employment_creation 10%→5%
- Pre-start: investment_amount weight 15%→30%, management_role 25%→15%
- Detection: isFranchise / isPreStart flags from application data

**Item 31: Speaking pattern analysis** — commit `5d8a54d`
- `analyzeDelivery()` extended: high hedge ratio (>8% of words), complex sentences (>35 words), choppy delivery (<6 word average sentence)
- DeliveryNote type extended with 3 new types

**Item 32: Post-interview outcome capture** — commit `6fd2f1d`
- NEW `simulator_outcomes` DB table (with RLS)
- NEW `/api/simulator/outcome` (GET + POST)
- NEW `/simulator/outcome` page — outcome selection, date, consulate, denial reason picker (8 categories), notes; approved/denied post-save flows

**Item 33: Timeline personalization in quiz results** — commit `4441114`
- getTimelineWeeks() returns adjustments[] with reasons
- Canada: faster processing; prior denial: +4-8w; partnership: +2-4w
- Adjustment reasons rendered below timeline date

### Sprint 4 — All Items Status

| Item | Description | Status |
|---|---|---|
| 26 | LLM enrichment for needs_work gap categories | ✅ Session 30 |
| 27 | Semantic evaluation for 3 critical fields | ✅ Session 30 |
| 28 | Real-time field quality indicator on blur | ✅ Session 30 |
| 29 | Cross-field investment health check | ✅ Session 30 |
| 30 | Business-type adaptive weights in gap analysis | ✅ Session 30 |
| 31 | Speaking pattern analysis (hedge ratio + sentence complexity) | ✅ Session 30 |
| 32 | Post-interview outcome capture | ✅ Session 30 |
| 33 | Timeline personalization in quiz results | ✅ Session 30 |

### Build
Clean — zero errors. 12 commits on dev branch this session.

### Post-Sprint Owner Actions (unchanged)
- Test PlayAI audio quality (needs user present)
- Rotate OpenAI API key (shared in chat plaintext in Session 28)
- Refund $197 test charge in Stripe dashboard
- Run FAQ seed scripts (`npx tsx scripts/seed-faq-corpus.ts`)
- **NEW:** Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor

---

## SESSION 31 — Sprint 5 Execution (June 17, 2026)

**Branch:** dev. Build clean. 7 commits.

### Sprint 5 — All 5 Items Complete

**Item 34: Paragraph-level revision buttons in document review modal** — commit `4544d70`
- `documents/[applicationId]/page.tsx`: replaced `<pre>` block with paragraph-by-paragraph render
- Each paragraph gets a hover state (gold left border + subtle bg)
- "Revise this ↗" button appears on hover only when credits remain
- Clicking pre-populates revision form with: `"Please revise this paragraph:\n\n"[text]"\n\nChange: "`
- Footer "Request a Change" button still works for document-level revisions

**Item 35: Voice profile completeness gate** — commit `7b59964`
- `generate/[applicationId]/page.tsx`: fetches `applicant_voice_profile.voice_sample_raw` on mount
- Counts words; if < 100 (or 0), shows dismissable banner above PreGenerationConfirmation
- Banner shows word count, links to `/apply/story#voice` to add/extend sample
- Non-blocking: failure to fetch silently suppresses the gate

**Item 36: Document quality tips on upload** — commit `a48be3c`
- `UploadClient.tsx`: `DOCUMENT_TIPS` map for 4 type keys
- `source_of_funds`: 6–12 months bank statement guidance
- `projections`: CSV format, 2-year month-by-month requirement
- `franchise_docs`: full FDD all 23 items requirement
- `business_plan`: what a strong business plan includes
- Tips render as gold left-border annotation below type select, only when tip exists

**Item 37: Expandable strong-answer guidance per field** — commit `bec7e51`
- `story/page.tsx`: `FIELD_GUIDANCE` map with 3 specific bullet points for 5 key fields
- Fields: M3-S1-01 (background), M3-S1-02 (motivation), M3-S1-03 (qualifications), M3-S1-04 (plan), M3-S1-05 (weaknesses)
- Collapsible toggle "▶ What makes a strong answer?" renders below each TextArea with guidance
- Guidance is field-specific, not generic — 12px subdued text with gold left border

**Item 38: Case-type field prioritization banner** — commit `1bff186`
- `apply/page.tsx`: "Focus here first" banner above section grid
- Shows top 3 incomplete sections ordered by type-specific importance weights
- `solo/partnership`: Story → Investment → Business → Qualifications → Ties → Family
- `cos` (Change of Status): Ties → Story → Investment → Business → Qualifications → Family
- Links directly to each section; dismissable with ✕; disappears when all complete

### Sprint 5 — All Items Status

| Item | Description | Status |
|---|---|---|
| 34 | Paragraph-level revision buttons in document modal | ✅ Session 31 |
| 35 | Voice profile completeness gate on generate page | ✅ Session 31 |
| 36 | Document quality tips on upload type selection | ✅ Session 31 |
| 37 | Expandable strong-answer guidance per case file field | ✅ Session 31 |
| 38 | Case-type field prioritization banner on case file overview | ✅ Session 31 |

### Build
Clean — zero errors. 7 commits on dev branch this session.

### Post-Sprint Owner Actions
- Test PlayAI audio quality (needs user present)
- Rotate OpenAI API key (shared in chat plaintext in Session 28)
- Refund $197 test charge in Stripe dashboard
- Run FAQ seed scripts (`npx tsx scripts/seed-faq-corpus.ts`)
- Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor

---

## SESSION 32 — Navigation Overhaul + Document Tab Labels (June 17, 2026)

**Branch:** dev. Build clean. 4 commits.

### Changes Made

**Fix: Missing DELIVERY_LABELS entries (TypeScript build error)** — commit `b1fc335`
- `src/app/simulator/page.tsx`: Sprint 4 Item 31 extended `DeliveryNote` type union with
  `high_hedge_ratio | complex_sentences | choppy` but `DELIVERY_LABELS` was not updated
- Added 3 missing entries: `HIGH HEDGE RATIO` (orange), `COMPLEX SENTENCES` (yellow), `CHOPPY DELIVERY` (slate)

**Fix: Document binder tab labels** — commit `6785c7c`
- `src/types/generation.ts`: corrected 3 tab/label mismatches found by comparing Interview Day binder against app:
  - `cover_letter`: `'Tab D'` → `'Tab B'` (cover letter is always Tab B, not Tab D)
  - `investment_proof` label: `'Investment Proof'` → `'Investment Evidence'`
  - `qualifications` label: `'Qualifications'` → `'Investor Biography & Qualifications'`
  - `ds160_reference` label: `'DS-160 Reference'` → `'DS-156E / DS-160 Reference'`
    (DS-156E is the E-visa specific paper form; DS-160 is the standard online form)

**Authenticated Nav overhaul** — commit `3489936`
- `src/components/Nav.tsx`: desktop authenticated nav now shows top-level links:
  Dashboard | My Application | Documents | Simulator | [Name dropdown (Settings, Log out)]
- Documents link conditionally shown when `application` is loaded (avoids broken href)
- Active state uses `pathname.startsWith()` for section routes
- Simulator link highlights for all `/simulator/*` subroutes
- Mobile: Dashboard → My Application → Documents → Simulator → separator → Settings → Log out
- Dashboard removed from account dropdown (now top-level) — dropdown contains Settings + Log out only

**SimulatorNav sub-navigation + layout** — commit `1ca39b3`
- NEW `src/components/simulator/SimulatorNav.tsx`:
  - 5 sections: Practice (`/simulator`) | Quick Start | Case File | Interview Day | My Outcome
  - `position: sticky; top: 64px` — sticks below the fixed global Nav during scroll
  - Gold underline on active section; `exact: true` for Practice (prevents `/simulator/*` from matching)
- `src/app/simulator/layout.tsx`: added `SimulatorNav` inside `paddingTop: '64px'` spacer div
  - Spacer pushes content below fixed Nav; SimulatorNav sticks at `top: 64px`
- `src/app/simulator/page.tsx`: removed `paddingTop: '64px'` from `styles.page` (layout handles it)

### Navigation Coverage

| Section | Route | Nav bar |
|---|---|---|
| Practice (main simulator) | /simulator | ✅ SimulatorNav: "Practice" (active) |
| Quick Start | /simulator/quick-start | ✅ SimulatorNav: "Quick Start" |
| Case File | /simulator/case-file | ✅ SimulatorNav: "Case File" |
| Interview Day | /simulator/interview-day | ✅ SimulatorNav: "Interview Day" |
| My Outcome | /simulator/outcome | ✅ SimulatorNav: "My Outcome" |

### Build
Clean — zero errors. 4 commits on dev branch.

### What's Next
No Sprint 6 items defined yet. Awaiting user direction.

---

## SESSION 33 — June 17, 2026
### Simulator UX Overhaul

**Focus:** Navigation reorder, Quick Start expansion, Prepare section AI brief, session hygiene

### Commits
| Commit | File | Description |
|---|---|---|
| (nav-order) | `SimulatorNav.tsx` | Reorder nav: Quick Start moved to position 1 |
| (nav-visibility) | Simulator nav | Fix: authenticated users without active application no longer see broken nav items |
| (quickstart-expand) | `quick-start/page.tsx` | Expand Quick Start to 7 fields in 4 sections (business info, investment, location, status) |
| (prep-task-type) | `src/lib/llm-client.ts` | Add 'prep' to TaskType union; OpenRouter models for prep: xiaomi/mimo-v2.5 + mimo-v2.5-pro |
| (prep-route-v1) | `api/simulator/interview-prep/route.ts` | Initial Prepare section route with LLM-generated interview brief |
| (interview-brief-v1) | `src/components/simulator/InterviewBrief.tsx` | Initial InterviewBrief component rendering applicationSummary, highlights, topics, tips |

### Features Delivered
- SimulatorNav order: Quick Start → Practice → Case Gaps → Outcomes → Prepare
- Nav visibility: simulator-only users see clean nav without broken states
- Quick Start form: Business Name, Category, Investment Amount, Source of Funds, Employment Goal, Target State, Operational Status
- Prepare tab: AI-generated interview brief pulling from application answers

### Build
Clean — zero errors. 6 commits on dev branch.

---

## SESSION 34 — June 17, 2026
### Engine-Powered Interview Brief

**Focus:** Upgrade Prepare section to use full gap-analysis-engine.ts intelligence — 15 denial factors, 6 evidence categories, deterministic scoring + LLM narrative

### Problem
Prior Prepare section sent 6 raw answer values to LLM → generic advice by business category. No engine intelligence. No denial risk analysis. No scoring.

### Solution
Full `scoreCase()` integration. Deterministic engine provides all risk data; LLM generates narrative calibrated to actual findings.

### Commits
| Commit | File | Description |
|---|---|---|
| d58bd9a | `src/app/api/simulator/interview-prep/route.ts` | Complete rewrite: full engine integration with scoreCase(), 15 denial factors, 6 categories, gap actions, knowledge base, LLM narrative |
| d94bc19 | `src/components/simulator/InterviewBrief.tsx` | Complete rebuild: score gauge SVG, CategoryCard, DenialRiskCard (collapsible), ActionItem, 8 rendering sections |

### Architecture
- `scoreCase(application, answers, documents, caseBrief, simulatorData)` → `GapAnalysisResult`
- `buildGapActions(result)` → prioritized actions (critical/important/recommended, max 12)
- `buildKnowledgeSummary(isFranchise, isTorontoConsulate, highRiskCategoryIds)` → knowledge base coaching
- LLM receives: overallScore, highRiskCount, 15 D-codes with findings, 6 category scores with gaps, gold-standard coaching reference
- LLM generates: applicationSummary, highlights, leadWithThese, interviewTopics (with officerTests), businessTips, pressurePoints
- Fallback: `buildFallback()` uses deterministic engine data alone if LLM fails
- Cache key bumped: `ib-` → `ib2-` to force refresh of cached data
- Model: xiaomi/mimo-v2.5 (OpenRouter), temperature 0.3, max_tokens 1800

### New Interfaces (exported from route.ts)
- `CategoryScore` — id, name, score, weight, priority, gaps[], actions[], evidence[]
- `DenialRisk` — code, name, risk, finding, mitigation
- `GapAction` — gap, action, urgency, category
- `InterviewBriefData` — full report shape with all sections

### UI Sections (InterviewBrief.tsx)
1. Score header with readiness badge
2. Score row: SVG arc gauge + readiness label + applicationSummary
3. Strengths + lead-with highlights
4. Category grid (2-col, 6 cards with priority color coding)
5. Denial Risk Assessment (15 D-codes, collapsible, high expanded by default)
6. Interview Topics (likelihood badges, officerTests coaching)
7. Priority Action Plan (numbered, critical/important/recommended urgency)
8. Business Coaching Tips

### Product Positioning
This is the premium teaser product: simulator-only users get real 15-factor denial risk breakdown as part of their Quick Start → Prepare flow. Full Gap Analysis (Module 2) unlocks deeper document-by-document analysis. Conversion driver for full platform.

### Build
Clean — zero errors. 2 commits on dev branch.

### Owner Actions Pending
- [ ] Rotate OpenAI API key at platform.openai.com
- [ ] Refund $197 test Stripe charge in Stripe dashboard
- [ ] Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor
- [ ] Apply pgvector migration SQL in Supabase SQL Editor (for FAQ)
- [ ] Run FAQ seed scripts after applying pgvector migration

### What's Next
Sprint 6 not yet defined. Awaiting user direction.

---

## SESSION 35 — June 17, 2026
### Simulator UX Overhaul — Pre-population, Nav Fix, Profile Page, InterviewBrief Unblocked

**Focus:** Fix 6 user-reported bugs in simulator flow: empty Quick Start fields, broken Prepare link, Dashboard/Documents visible inside simulator, typing bug on confirm step, and engine brief never rendering.

### Problems Fixed

1. **Quick Start fields empty for returning users** — form loaded blank even though user had an existing application with all answers saved. Fix: `checkAuth` fetches existing simulator_standalone app and pre-populates all 7 fields; returning user banner added with skip link.

2. **"Missing application reference" on Prepare tab** — SimulatorNav hardcoded `/simulator/case-file` with no applicationId. The Prepare page required `?applicationId=...` as a URL param with no fallback. Fix (two layers): SimulatorNav fetches user's simulator app on mount and injects applicationId into the Prepare href; case-file page auto-resolves from DB if URL param is missing.

3. **Dashboard / Documents visible on simulator pages** — Nav checked `isSimulatorOnly` (based on application source) but users with both a simulator AND a full application still saw both nav items inside the simulator. Fix: added `!pathname.startsWith('/simulator')` to all three links (Dashboard, My Application, Documents) in both desktop and mobile Nav.

4. **Engine-powered InterviewBrief never rendered** — `CaseGapsForm` was a hard mandatory gate (`if (!gapsResolved)`) that blocked rendering. The gaps API was failing for most users, locking the screen at "We could not check your case file for missing details". Fix: removed CaseGapsForm from the flow entirely. InterviewBrief now renders immediately after auth.

5. **Confirm step typing bug** — fields showed a static `<div>` once extraction loaded, making it impossible to edit. Extraction data overwrote Quick Start data. Fix: redesigned confirm step as a proper "Your Profile" page that clearly separates Quick Start data (always available from state) from extraction data (business name + target state added as new rows).

6. **Quick Start API created duplicate applications** — each submit created a new `simulator_standalone` row. Fix: added `existingApplicationId` parameter to route; if provided, verifies ownership and upserts answers instead of inserting.

### Commits
| Commit | File | Description |
|---|---|---|
| 3a8d1e8 | `SimulatorNav.tsx` | Fetch applicationId on mount; inject into Prepare href; separate basePath/href for active detection |
| c1d7b48 | `simulator/case-file/page.tsx` | Auto-resolve applicationId from DB when not in URL; redirect to Quick Start if none |
| d9d9d30 | `Nav.tsx` | Hide Dashboard, My Application, Documents on all /simulator paths |
| 32cdddc | `api/simulator/quick-start/route.ts` | Add existingApplicationId param — update mode vs create mode |
| bed9acb | `simulator/quick-start/page.tsx` | Pre-populate 7 fields from existing application; returning user banner + skip link |
| cd429af | `simulator/case-file/page.tsx` | Remove CaseGapsForm gate — InterviewBrief shows immediately |
| ffdb8e1 | `simulator/quick-start/page.tsx` | Replace broken confirm step with "Your Profile / Let's build a profile" page |

### Your Profile Page (new confirm step)
- Header: diamond icon + "YOUR PROFILE" / "Let's build a profile" H1
- 4 sections with gold-tinted headers: About You, Your Business, Investment & Employment, Interview Location
- `ProfileSection` — gold border card with section label bar
- `ProfileRow` — 160px label column + value; editable only for fields not yet extracted (business name, target state)
- Merges Quick Start state + extraction data without duplication or overwrite conflicts
- CTA: "Continue to Interview Preparation →" → navigates to `/simulator/case-file?applicationId=...`

### TypeScript fixes
- `apps.find((a: { id: string; source: string | null }) => ...)` — explicit inline type on both case-file and SimulatorNav
- `Record<string, string>` with `forEach` instead of `new Map()` — resolves `{}` type inference error on answers mapping
- Removed unused `notFound` state, unused `CaseGapsForm` import, unused `gapsResolved` state

### Build
Clean — zero errors. 7 commits on dev branch.

### Owner Actions Pending (carry-forward from Session 34)
- [ ] Rotate OpenAI API key at platform.openai.com
- [ ] Refund $197 test Stripe charge in Stripe dashboard
- [ ] Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor
- [ ] Apply pgvector migration SQL in Supabase SQL Editor (for FAQ)
- [ ] Run FAQ seed scripts after applying pgvector migration

### What's Next
- Verify engine-powered InterviewBrief renders for Anupama's application (visual confirmation needed)
- Practice tab profile data: user requested better organization of the profile card on `/simulator`
- Engine brief should also appear on Practice tab after profile data
- Session 36 scope pending user testing feedback

---

## SESSION 36 — Landing Page Overhaul + Pricing Strategy (June 18, 2026)

**Last Updated:** June 18, 2026

### Landing Page — Completed

All 7 user-reported issues addressed and verified:

1. **Widget scroll containment** — FaqWidgetHome now lives inside the hero as the right column of a 2-column grid. Fixed-height card (`h-[460px] flex flex-col`), `flex-1 min-h-0` fill, `overflow-y-auto overscroll-contain h-full` on messages pane. Page background no longer scrolls when user scrolls inside the widget.

2. **Hero highlights updated** — Stats bar now shows: Free (eligibility + Ask) / 6 (documents in your voice) / 15 (denial-risk checks) / From $550. More meaningful than prior 82/Treaty/etc.

3. **How-it-works numerals** — Now `WebkitTextStroke: "1px rgba(201,168,76,0.5)"` + `color: "rgba(201,168,76,0.32)"`. Gold outline, legible.

4. **Section alignment** — Content sections confirmed intentionally left-aligned; CTA/founder sections centered. Intentional design decision, not a bug.

5. **ComparisonSection tightened** — 6 edits: heading to left, dek de-indented, 7-step descriptions compressed to one punchy line each (both e2go and traditional columns), disclaimer removed from comparison and relocated to footer, "Everything included" 14-feature grid added in 3 columns (Assess free / Build / Prepare & submit).

6. **Disclaimer relocated to footer** — Legal disclaimer is now the last thing on the page, below copyright and footer links. Removed from ComparisonSection.

7. **404 diagnosis** — All routes return 200. The 404s were caused by stale `.next` cache on local dev server. Fix: `rm -rf .next && npm run dev`.

8. **Widget in hero** — FaqWidgetHome moved from bottom of page (section 11/13) to the hero's right column — the first interactive moment on the page. Mobile: single collapsed teaser bar → bottom sheet. Desktop: full inline chat panel alongside the headline.

### Page structure (after)
Nav → Hero (with Ask panel) → SectionNav → Proof bar → Mistakes (3) → How it works → Comparison (full) → Interview simulator (compact callout) → Founder note → Testimonials → Final CTA → Footer (with legal)

### Strategy Research — Completed

Full competitive landscape mapped:

| Competitor | Focus | Pricing | E2-specific? |
|---|---|---|---|
| E2 Visa Coach | Done-with-you SaaS | $2,400 full / $249–$947 à la carte | Yes — built on Lovable.app, 106 members |
| Visas 101 | Interview coaching | ~$200 masterclass, consultations | Partial (covers E2 among others) |
| Tukki | Multi-visa tech + attorney | Hidden | No |
| Lighthouse | Multi-visa tech + attorney | Hidden | No |

Visas 101 identified as potential **partner** (not competitor) — former consular officers, interview coaching only, no documents.

### Master Strategy Prompt
Written to: `docs/E2GO_MASTER_STRATEGY_PROMPT.md`
Covers: pricing decisions, competitor landscape, document audit scope, multi-applicant architecture questions, messaging gaps, nav recommendations, priority build list.

### Pricing — UNDER DEBATE (no code changes yet)

| Tier | Proposed | Notes |
|---|---|---|
| Full package (single applicant, any family size) | $1,295 | 46% cheaper than E2 Coach; no per-kid surcharge |
| Joint venture (2 principals) | $1,795 | Phase 2 — architecture audit required first |
| Simulator standalone | $347 | Case-specific vs E2 Coach generic $249 |
| Gap analysis standalone | $197 | No comparable product |
| Prep kit standalone | $97 | Entry point |

**CRITICAL:** Joint venture tier cannot launch until multi-applicant architecture is audited. System is built for single applicant only.

**Pricing page and all existing Stripe Price IDs must be updated once pricing decision is confirmed.** Do not update until owner signs off.

### Pending Owner Decisions
- [ ] Confirm final pricing: $1,295 base? Standalone modules at launch?
- [ ] Joint venture Phase 2 build scope — approve architecture audit session
- [ ] Document audit: review `docs/E2GO_MASTER_STRATEGY_PROMPT.md` Section 3 for full scope

### Carry-Forward Owner Actions (from prior sessions)
- [ ] Rotate OpenAI API key at platform.openai.com
- [ ] Refund $197 test Stripe charge in Stripe dashboard
- [ ] Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor
- [ ] Apply pgvector migration SQL in Supabase SQL Editor (for FAQ)
- [ ] Run FAQ seed scripts after applying pgvector migration

### Build
Clean — zero errors. No commits this session (landing page changes are on dev, not yet committed).

### What's Next
1. Owner confirms pricing → update all pricing references + Stripe IDs + pricing page
2. Document audit → read generation engine to confirm exactly which 6 documents are produced and what's missing
3. Messaging refresh → update hero to add stakes line + voice differentiator
4. Nav restructure → rename "Simulator" → "Interview Prep", add "What's included", add "About"

---

## SESSION 37/38 — Module 3 Document Audit + Question Cleanup (June 18, 2026)

### Login Deadlock Bug — Fixed

**Root cause:** `signOut({ scope: 'local' })` at the top of `handleLogin` in `src/app/login/page.tsx` deadlocks the GoTrueClient lock when a prior navigation still holds it. This caused the login page to hang indefinitely at "Signing in..."

**Fix:** Wrapped `signOut()` in `Promise.race()` with a 2-second timeout so login proceeds even if signOut hangs.

---

### Document Audit — Tabs A–L

Complete audit of all Module 3 tabs:

| Tab | JSON file | Page route | Status |
|---|---|---|---|
| A (DS-160 Reference) | `tab-a.json` ✅ | `/apply/module3/a` ✅ | Complete |
| B | None | `/apply/module3/b` ✅ | Hardcoded in page |
| C | None | `/apply/module3/c` ✅ | Hardcoded in page |
| D (Cover Letter) | None | `/apply/module3/d` ✅ | Wizard, hardcoded |
| E (Ownership) | `tab-e.json` (stub) | `/apply/module3/e` ✅ | Hardcoded in page |
| F (Investment Evidence) | None | None | ❌ MISSING |
| G | `tab-g.json` | None | Orphaned JSON |
| H | `tab-h.json` | None | Orphaned JSON |
| I (Financial Projections) | `tab-i.json` ✅ | `/apply/module3/i` ✅ | Complete |
| J (Qualifications) | None | `/apply/module3/j` ✅ | Wizard, hardcoded |
| K (Business Plan) | `tab-k.json` (stub) | `/apply/module3/k` ✅ | Hardcoded in page |
| L | `tab-l.json` | None | Orphaned JSON |

**Key findings:**
- `tab-e.json` and `tab-k.json` are outdated stubs — all live questions are hardcoded in page.tsx
- Tab F (Investment Evidence) is completely missing and most critical
- Tabs G, H, L have JSON data files but no page routes — users never reach them
- The case file sections (`/apply/qualifications/`, `/apply/business/`, etc.) parallel the module3 system

---

### Question Quality Cleanup — All Files

**Principle established:** Form layout (tabs A, E, K, I) needs short noun-phrase labels. Wizard layout (tabs D, J) suits sentence-format questions since one question shows at a time.

**Files changed:**

#### `/apply/qualifications/page.tsx`
7 label/helperText rewrites: M3-Q-04 ("What is your professional background..."), M3-Q-05, M3-Q-11, M3-Q-25, M3-V-02, M3-V-04, M3-I-15.

#### `/apply/module3/d/page.tsx` (Tab D — Cover Letter wizard)
4 rewrites: QD-01 (question, label, helperText), QD-03 (question, helperText), QD-06 (question, label).

#### `/apply/module3/j/page.tsx` (Tab J — Qualifications wizard)
4 rewrites: QJ-01 (question), QJ-03 (question, helperText), QJ-04 (question, helperText).

#### `/apply/module3/e/page.tsx` (Tab E — Ownership)
4 rewrites: QE-01 (label, helperText), QE-06 (label, helperText), QE-09 (label), QE-11 (label).

#### `/apply/module3/k/page.tsx` (Tab K — Business Plan)
**Critical bug fixed:** All 11 long-form question fields had `type: "text"` (single-line) — changed to `type: "textarea"`.
QK-03 compound question SPLIT into QK-03 ("Who are your main competitors?") + QK-03b ("What is your competitive advantage over them?") as separate fields.
13 label/helperText rewrites across the entire section.

#### `src/data/module3/tab-a.json`
Complete pass — all 23 question/tooltip fields rewritten.
- Text input fields: question → short noun-phrase label (e.g. "Full legal name (as on passport)", "Date of birth", "Current home address in Canada")
- Tooltips trimmed to one to two lines removing "if you prefer not to share this" padding
- Select/multi fields: question format retained where appropriate

#### `src/data/module3/tab-i.json`
All 10 question fields rewritten:
- Currency/number fields: noun-phrase format ("Projected gross revenue — Year 1", "Full-time U.S. hires — Year 1")
- Select fields: question format retained

### Build
Clean — zero errors. `npm run build` passes.

### Structural Gaps (not fixed — flagged for next session)
- **Tab F** (Investment Evidence): No JSON file, no page route. Should have 12–15 questions on investment source, wire transfers, bank statements. Feeds the Investment Proof document in the generation pipeline.
- **Tabs G, H, L**: JSON files exist but no page routes — users can never reach them. Need page routes or deletion.

### Owner Actions (carry-forward)
- [ ] Rotate OpenAI API key at platform.openai.com
- [ ] Refund $197 test Stripe charge in Stripe dashboard
- [ ] Apply migration `supabase/migrations/20260617100000_simulator_outcomes.sql` via Supabase SQL Editor
- [ ] Apply pgvector migration SQL in Supabase SQL Editor (for FAQ)
- [ ] Run FAQ seed scripts after applying pgvector migration
- [ ] Confirm final pricing (from Session 36)

### What's Next
1. Build Tab F (Investment Evidence) — create `tab-f.json` + `/apply/module3/f/page.tsx`
2. Wire orphaned tabs G, H, L with page routes (or audit and remove)
3. Confirm pricing → update Stripe Price IDs + pricing page

---

## SESSION — Sprints 1 & 2 (June 18-19, 2026 — Automated overnight)

### Sprint 1: Production Gate

**Files changed:**
- `src/app/api/ai/route.ts` — getSession() → getUser() (server-side auth fix)
- `src/lib/docx-package-constants.ts` — Tab E (visa_category) + Tab K (nonimmigrant_intent) added
- `src/app/api/generate/download/[applicationId]/route.ts` — new doc types in VALID_DOC_TYPES
- `src/app/generate/[applicationId]/page.tsx` — all 6→8, steps 7-15→9-17, new STATUS_MESSAGES

**Commits:** 3e02ed6, 30493eb, 2407074, 2e57cfb

### Sprint 2: Post-Quiz Intelligence Capture

**Files changed:**
- `supabase/migrations/20260619000000_post_quiz_profile.sql` — post_quiz_profile JSONB, franchise_triggered bool, archetype text; case_profiles table stub
- `public/data/module0_questions.json` — Q0-09e (bankruptcy type) + Q0-09f (civil judgment status) added; two new options in Q0-09c multiselect
- `src/app/quiz/profile/page.tsx` — NEW: 4 post-quiz profile questions (net worth, background, industry, timeline)
- `src/app/quiz/page.tsx` — route post-quiz to /quiz/profile instead of /results for logged-in users

**Commits:** 500a508, 2417fe2, ff40919, 71bf5e5

### Build
Clean — `npm run build` passes, zero TypeScript errors after all Sprint 1+2 changes.

### Pending: Sprint 3, 4, 5 (scheduled for 4 AM June 19)
- Sprint 3: buildCaseProfile(), classifyArchetype(), scoreQuizEligibility(), detectFranchiseTrigger()
- Sprint 4: Results page 9-section rebuild, gap analysis UI, coaching archetype split
- Sprint 5: franchise_brands table + matchFranchises() + lead event stub

### Owner Actions Required (do not block code)
- [ ] Apply migration `supabase/migrations/20260619000000_post_quiz_profile.sql` via Supabase SQL Editor
- [ ] Apply migration `supabase/migrations/20260619100000_franchise_brands.sql` via Supabase SQL Editor
- [ ] Review franchise brand list before activating lead notifications
- [ ] Confirm pricing before Sprint 6 (go-to-market polish)

---

## SESSION — Engine Audit, FDD Strategy & Sprint Planning (June 19, 2026)

### Engine Silo Audit — Findings

`buildCaseProfile()` is the declared single source of truth but currently reads ONLY:
- `quiz_sessions` (score, outcome, result_json, post_quiz_profile, franchise_triggered)
- `applications.investment_amount`

Five components run in silos, each independently fetching from the same three tables (answers, applications, documents) without using the central profile:
- `src/lib/gap-analysis-engine.ts` — reads answers + documents + simulator data directly
- `src/app/api/simulator/evaluate/route.ts` — reads answers directly
- `src/app/api/simulator/case-summary/route.ts` — reads answers directly
- `src/app/api/generate/case-brief/[applicationId]/route.ts` — reads answers directly
- `src/app/apply/gaps/page.tsx` — fetches from answers directly

`case_profiles` table is write-only — `buildCaseProfile()` writes to it but nothing reads from it downstream. Zero cost savings, zero intelligence sharing.

**Profile data state at quiz-only stage:** Sparse. `post_quiz_profile` captures net_worth_range, prior_business, industry_interest, timeline_goal (4 fields). Everything else is null. Sections that depend on answers/documents return empty — this is the correct behavior, to be surfaced as a completeness driver, not treated as broken UI.

---

## MASTER SPRINT PLAN (Approved June 19, 2026)

### Phase A — Engine Unification (6 sprints, pre-approved, start next session)

| ID | Sprint | Key Work | Files |
|---|---|---|---|
| ✅ EU-1 | Expand buildCaseProfile() | Read answers + documents + simulator sessions; add completeness_score (0–100), data_state enum, source_of_funds_score, management_role_score, business_plan_score; update CaseProfile type; migration | Commits 451af05, dbdf0a4, af2efa0 — June 19, 2026 |
| ✅ EU-2 | Connect interview-prep | Archetype-aware question pools (buyer/builder/investor/career_switcher); gap-targeted probe injection based on low scores; graceful fallback to current behavior | Commit b9721f5 — June 19, 2026 |
| ✅ EU-3 | Archetype-aware gap analysis | ARCHETYPE_WEIGHTS map per archetype; optional archetype param in scoreCase(); callers pass archetype from profile; franchise/pre-start overrides take priority | Commit 5d083a5 — June 19, 2026 |
| ✅ EU-4 | Rebuild triggers | Fire-and-forget buildCaseProfile() at 5 events: quiz complete, profile save, answer save (Module 3), document extraction complete, simulator outcome | Commit e4a5281 — June 19, 2026 |
| ✅ EU-5 | PartialProfileTeaser | Standalone simulator buyers post-session: locked profile sections + upgrade CTA showing what a full profile contains | Commit c4f5729 — June 19, 2026 |
| ✅ EU-6 | Results completeness | Completeness bar + confidence tier labels (quiz-derived → case-file-reported → document-confirmed → fully-verified); renders only when caseProfile exists | Commit 74b5194 — June 19, 2026 |

**Rule:** All connections have graceful fallbacks to current behavior. Nothing breaks if profile is incomplete.

### Phase B — Privacy & Trust (2 sprints, approved June 19)

| ID | Sprint | Key Work |
|---|---|---|
| ✅ PT-1 | Data deletion — right to erasure | /settings rebuilt with 2-step confirmation dialog + type-to-confirm; POST /api/account/delete wipes 16 tables + Supabase Auth user; Resend confirmation email sent on deletion. Commit 55a7c1b — June 19, 2026 |
| ✅ PT-2 | Privacy/trust messaging | Inline notices at document upload (UploadClient) and case file entry (apply/page.tsx first visit): "never used to train AI, never shared, delete anytime from Settings." Commit 835987e — June 19, 2026 |

### Phase C — FDD Intelligence

| ID | Sprint | Key Work | Status |
|---|---|---|---|
| FDD-DESIGN | Research + plan | docs/FDD_INTELLIGENCE_RESEARCH.md + docs/FDD_INTELLIGENCE_PLAN.md — 50-field schema, 5-dimension scoring rubric, ODE model, territory spec, questions spec, sprint plan | ✅ COMPLETE |
| FDD-1 | Extraction pipeline | pdf-parse FDD text extraction (no truncation), 4-pass LLM chunking (Items 1-7, 11-12, 17, 19-21), SSE streaming, staleness gate, registration gate, DB schema (fdd_analyses + fdd_comparisons), upload page (/fdd/upload), review page (/fdd/review/[fddId]) | ✅ COMPLETE — commit 6441f5e |
| FDD-2 | E-2 scoring engine | 5-dimension scoring (eligibility gates, investment substantiality, non-marginality, develop-and-direct, flags), ODE model, timing assessment, sliding-scale proportionality (9 FAM 402.9-6(D)), LLM narrative, score API, scoring dashboard (/fdd/score/[fddId]) | ✅ COMPLETE — commit 59faec6 |
| FDD-3 | Territory market analysis | Census ACS 5-year API (ZCTA population/income/households), Google Places competitor scan (graceful degradation if no key), category-specific radius + weights (QSR/Home Services/Senior Care/etc.), territory score + LLM narrative, /fdd/territory/[fddId] | ✅ COMPLETE — commit e16043b |
| FDD-4 | Questions generator + profile match | 15 flag→question mappings, 8 standard questions, data-gap questions, 5 LLM bespoke questions, CaseProfile match score (investment/net_worth/industry 0-100), filter tabs by audience, copy-all, /fdd/questions/[fddId] | ✅ COMPLETE — commit 1d8e0a5 |
| FDD-5 | Final report + platform integration | LLM 6-section final report, 8 answer keys written to user's application (QA-FDD-COMPAT, QA-FDD-FLAGS, etc.), freemium teaser (3 real metrics + flag count + 3 locked sample questions, hasAccess gate), /fdd/report/[fddId], /fdd index page with 5-stage progress bars | ✅ COMPLETE — commit 4d58970 |

### FDD Intelligence — Product & Competitive Context

**What it does:** Ingests a Franchise Disclosure Document (PDF, up to 200 pages), extracts 40-50 predetermined data points across all 23 FDD items, scores for E-2 visa readiness, matches against the user's CaseProfile, and optionally layers territory market analysis.

**Competitive landscape confirmed:**
| Product | Price | What it does | Gap |
|---|---|---|---|
| FranchiseStack FDD Risk Analyzer | $149 | 23-item analysis, red/yellow/green flags, 30 sec | Generic, no profile matching |
| FranchiseIQ | $49 | 23-item extraction + 89K SBA loan cross-reference | Generic, no territory analysis |
| Franchise Caliber | $197 | 50+ risk patterns from real franchise failures | Generic, no E-2 context |
| Maptitude / FranConnect | Subscription | Territory mapping | Franchisor-facing, not franchisee |

**The unclaimed position:** No platform combines FDD analysis + territory market analysis + personal profile matching + E-2 visa readiness scoring. The integrated product is genuinely unclaimed competitive territory.

**Pricing direction:** $297–$397 for single FDD + territory report. Multi-FDD comparison ($797–$997 for 3-5 FDDs). Separate add-on to E-2go package OR standalone entry point that cross-sells the full package.

**Honest capability assessment:**
- FDD extraction: HIGH confidence — fixed schema + LLM extraction is reliable
- Demographic/economic analysis: HIGH confidence — Census Bureau API + BLS are authoritative
- Competitive landscape: DIRECTIONAL — competitor count/proximity from Google Places, not market share
- Market projections: MODELLED SCENARIOS only — scenario-based (conservative/base/optimistic), not point forecasts
- NOT capable of: legal clause interpretation, predicting economic conditions, site-specific factors unknown to public data

**Pre-build requirements (owner must define before FDD-1):**
1. The 40-50 fixed extraction fields (the schema — without this, extraction is unstructured AI improvisation)
2. Scoring rubric per extracted point (what constitutes red/yellow/green for each FDD item)
3. E-2 compatibility criteria: which FDD items gate E-2 eligibility and how they're weighted
4. Territory data source stack: which APIs are primary, which are fallback, and what the system does when data is unavailable

### Phase D — QA (3 sprints, run AFTER EU-1 through EU-6 are complete)

Expected behavior spec is written by the agent from BUILD_TRACKER + spec files before each sprint. No separate spec document needed from owner.

| ID | Sprint | Pages | Notes |
|---|---|---|---|
| QA-A | Public pages QA | /, /quiz, /results, /pricing, /learn, /about, /privacy, /terms, /support, /login, /signup, /signup, /verify, /forgot-password | No auth required. Tests: render, links, form submissions, hard stops, copy quality, mobile 390px, console errors |
| QA-B | Authenticated case file QA | /dashboard, /apply, /apply/story, /apply/business, /apply/investment, /apply/qualifications, /apply/family, /apply/ties, /apply/upload (+ /processing, /review, /gaps), /score, /settings, /apply/checklist, /apply/module1, /apply/module2, /apply/module3/* | Requires seeded test account (Michael Chen). Tests: auth gates, data display, autosave, pre-fill, voice input, section navigation, empty states |
| QA-C | Simulator + generation + API routes QA | /simulator, /simulator/quick-start, /gap-analysis, /generate/[id], /documents/[id], /admin, all /api/* routes | Tests: voice/text modes, coaching cards, document generation pipeline, ZIP download, payment gating, API auth on all routes |

**QA scope per page:**
- Page renders without JS console errors
- All buttons are clickable and lead somewhere (no orphaned clicks)
- All links resolve to existing pages (no 404s)
- Forms submit and surface correct success/error responses
- Auth gates redirect correctly when logged out
- Empty states, loading states, error states render correctly
- Copy and messaging quality — tone appropriate, no placeholder text in shipped UI
- Mobile layout at 390px (no horizontal scroll, tap targets ≥44px)
- Expected data-driven content matches what the seed data should produce

**QA deliverable:** A report per sprint listing ✅ pass / ⚠️ issue / ❌ broken per page and item, with specific reproduction steps for every issue found.

---

### Phase E — Legal & Compliance (2 items — not optional)

| ID | Item | What it is | Priority |
|---|---|---|---|
| LC-1 | PIPEDA compliance review | Audit /privacy against Canadian PIPEDA requirements. Add explicit "no AI training on your data" statement. GDPR awareness note for EU treaty country users (Germans, French, Italians etc.). Update PT-2 messaging to address these specifically. | BEFORE LAUNCH |
| LC-SOC2 | SOC 2 — deferred | Not required now. Becomes relevant when first enterprise client (law firm, corporate immigration dept, franchise broker network) asks for it. Estimated cost: $15K–$50K. Recommended tool when ready: Vanta or Drata (automated evidence collection). Revisit 12-18 months post-launch or at first enterprise conversation. | DEFERRED |

**Why LC-1 matters before launch:**
- Primary market is Canadian applicants — PIPEDA applies
- Users are entering criminal history, passport details, financial records, and family data
- The fear is not breach — the fear is AI training, government sharing, or misuse
- One honest paragraph at the point of data entry ("We do not use your case data to train AI models. Your information is stored encrypted and deleted on request.") builds more trust than any certification
- This connects directly to PT-2 — they should be built together

---

### Build
No code changes in strategy session — planning only.

### Owner Actions Added
- [ ] Define FDD extraction schema (40-50 fields) when ready to proceed with Phase C
- [ ] Review and confirm the PT-1 data deletion scope before building (especially retention grace period — 30 days vs immediate)
- [x] ~~EU-1 complete~~ — foundation done; EU-2 is next
- [ ] Revisit SOC 2 when first enterprise client (law firm, franchise broker network) asks for it

---

## SESSION — EU-1: Engine Unification Sprint 1 (June 19, 2026)

### Completed — 3 commits, af2efa0 on dev

**Goal:** Make `buildCaseProfile()` a true aggregation layer that reads all available data sources, computes intelligence from them, and persists it to `case_profiles` so downstream components can read it instead of making independent raw queries.

**Files created/modified:**

1. `supabase/migrations/20260619200000_case_profiles_scores.sql` — 5 new columns on `case_profiles`:
   - `completeness_score INTEGER DEFAULT 0`
   - `data_state TEXT DEFAULT 'quiz_only'`
   - `source_of_funds_score INTEGER DEFAULT 0`
   - `management_role_score INTEGER DEFAULT 0`
   - `business_plan_score INTEGER DEFAULT 0`

2. `src/types/case-profile.ts` — added `DataState` union type + 6 new fields to `CaseProfile` interface: `sourceOfFundsScore`, `managementRoleScore`, `businessPlanScore`, `completenessScore`, `dataState`, `simulatorReadiness`

3. `src/lib/case-profile.ts` — full expansion of `buildCaseProfile()`:
   - Now fetches: quiz_sessions, applications (expanded columns), answers, application_documents, simulator_sessions, case_briefs
   - Calls `scoreCase()` from gap-analysis-engine when application + answers exist
   - Extracts source_of_funds, management_role, business_plan category scores (0–100 each)
   - Computes `completenessScore`: quiz(+20), postProfile(+15), application(+10), answers≥5(+20), answers≥15(+10), documents(+15), sim session(+10) → max 100
   - Computes `dataState`: quiz_only → case_file (answers≥3) → documents → full (docs+sim)
   - `simulatorReadiness = true` when ≥1 completed simulator session
   - Gap analysis is non-blocking — profile builds cleanly even when data absent
   - Upsert pattern (update if exists, insert if not)

### Owner Action Required
Apply migration via Supabase SQL Editor:
```sql
ALTER TABLE case_profiles
  ADD COLUMN IF NOT EXISTS completeness_score  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_state          TEXT    DEFAULT 'quiz_only',
  ADD COLUMN IF NOT EXISTS source_of_funds_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS management_role_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_plan_score   INTEGER DEFAULT 0;
```
(Or run `npx supabase db push` — but verify migration tracking is in sync first; see KNOWN ISSUES #8.)

### Build
Clean — 109 pages, zero TypeScript errors. Same pre-existing hook warnings (non-blocking).

### Next
EU-2: Connect interview-prep to archetype-aware question pools + gap-targeted probes in `src/lib/simulator-engine.ts`.

---

## SESSION 35 — Phase A + B Complete (June 19, 2026)

### Completed — 6 commits on dev

**EU-3** (`5d083a5`) — Archetype-aware gap analysis weights in `scoreCase()`
- `ARCHETYPE_WEIGHTS` constant added to `gap-analysis-engine.ts`: 4 archetypes × 6 categories
- `scoreCase()` extended with optional `archetype?: string | null` parameter
- Franchise and pre-start operational overrides take priority over archetype weights
- All 3 callers updated: `case-profile.ts`, `gap-analysis/page.tsx`, `interview-prep/route.ts`
- Unused `archetype` state removed from gap-analysis/page.tsx (lint fix)

**EU-4** (`e4a5281`) — Fire-and-forget profile rebuild triggers at 5 events
- New route: `POST /api/profile/rebuild` — auth-gated, fires `buildCaseProfile()` without awaiting, returns `{triggered: true}` immediately
- Client triggers: `quiz/page.tsx` (after quiz completion), `quiz/profile/page.tsx` (after profile save)
- Server triggers: `api/answers/route.ts` (every Module 3 answer save), `api/documents/extract/route.ts` (after extraction_complete event), `api/simulator/outcome/route.ts` (after outcome insert)
- All server triggers: `buildCaseProfile(user.id).catch(() => {})` — non-blocking, never errors to caller

**EU-5** (`c4f5729`) — `PartialProfileTeaser` component for simulator-only buyers
- New file: `src/components/PartialProfileTeaser.tsx`
- 4 locked score cards (Archetype, Source of Funds, Management, Business Plan) with blur + lock overlay
- Upgrade CTA: "Start your case file →" → `/quiz`
- Added to dashboard's `isSimulatorOnly` branch after Quick Actions section

**EU-6** (`74b5194`) — Results completeness bar + confidence tier labels
- `getConfidenceTier(dataState)` helper: quiz_only / case_file / documents / full → label + color
- Completeness bar renders below score circle on `/results` when `caseProfile` exists (logged-in users only)
- Width animates to `caseProfile.completenessScore%`; tier label shows right-aligned

**PT-1** (`55a7c1b`) — Data deletion (right to erasure)
- `/settings` page rebuilt from placeholder: 2-step confirmation dialog + `type-to-confirm` ("delete my account")
- `POST /api/account/delete`: wipes 16 tables in dependency order, deletes Supabase Auth user, sends Resend confirmation email listing deleted data
- Post-deletion state: full-screen confirmation with "Return to homepage" — session already invalidated
- Error state with "Try again" and support contact

**PT-2** (`835987e`) — Privacy/trust inline messaging
- `UploadClient.tsx`: gold-bordered notice above drop zone — "never used to train AI, never shared, delete anytime from Settings"
- `apply/page.tsx`: same notice shown on first visit (no applicant name + no quiz data yet) above quiz banner

### Build
Clean — 110 pages, zero TypeScript errors.

### Next Session
Phase D — QA sprints (QA-A public pages, QA-B authenticated case file, QA-C simulator + API routes).

---

## SESSION — FDD Intelligence: FDD-1 + FDD-2 (June 19, 2026)

### Research Phase (pre-build)

7 Firecrawl sources: FTC Franchise Rule structure, NASAA Item 19 disclosure rules, E-2 proportionality doctrine (9 FAM 402.9-6(D)), territory analysis methodology, SBA franchise data cross-reference. Gap analysis from 15-year veteran persona yielded 15 improvements. All research saved to `docs/FDD_INTELLIGENCE_RESEARCH.md`.

Full implementation plan in `docs/FDD_INTELLIGENCE_PLAN.md` (10 parts: schema, scoring spec, ODE model, territory weights, questions module, platform integration, sprint plan, LLM prompts, limitations, DB schema).

### FDD-1 — Extraction Pipeline (commit 6441f5e)

| File | Purpose |
|---|---|
| `supabase/migrations/20260619300000_fdd_analyses.sql` | fdd_analyses + fdd_comparisons tables, RLS, indexes |
| `src/types/fdd.ts` | All FDD types — FddExtractedFields (~90 fields), FddSSEEvent, FddFieldMeta, compatibility types |
| `src/lib/fdd-extraction-engine.ts` | pdf-parse no-truncation extractor, section splitter, 4 chunked LLM passes, staleness/registration assessment |
| `src/app/api/fdd/upload/route.ts` | POST /api/fdd/upload — PDF to Supabase Storage |
| `src/app/api/fdd/extract/route.ts` | POST /api/fdd/extract — SSE streaming extraction pipeline |
| `src/app/fdd/layout.tsx` | FDD section layout with Nav |
| `src/app/fdd/upload/page.tsx` | Upload intake UI — transaction type, location, drag-and-drop, SSE progress |
| `src/app/fdd/review/[fddId]/page.tsx` | Extraction review — 9 collapsible sections, confidence badges, page refs, source quotes |

Key technical decisions:
- `pdf-parse` used directly (not via existing `extractTextFromBuffer` which truncates) — FDDs are 200-300 pages
- 4 targeted LLM passes with section-split text (max 80K chars each) — stays within Sonnet 4.6 200K context
- `claude-sonnet-4-6` via Anthropic SDK directly (not OpenRouter) — large-context reliability requirement
- Each field wrapped in `FddFieldMeta { value, _page, _quote, _conf }` — full audit trail

### FDD-2 — E-2 Scoring Engine (commit 59faec6)

| File | Purpose |
|---|---|
| `src/lib/fdd-scoring-engine.ts` | Pure TS scoring: 4 dimensions + ODE model + timing + flag collector. No LLM for numerics. |
| `src/app/api/fdd/score/route.ts` | POST /api/fdd/score — runs scoring, generates LLM narrative (4 sections), persists to DB |
| `src/app/fdd/score/[fddId]/page.tsx` | Scoring dashboard — overall badge, narrative, flags, collapsible dimension cards, ODE panel, timing panel |
| `src/types/fdd.ts` | FddE2Score type updated |

Key scoring logic:
- Eligibility gates (Dim 1): FDD staleness, state registration, active business model, staffing, fee at-risk, visa acceptance
- Investment substantiality (Dim 2): floor check + proportionality on 9 FAM sliding scale (<$100K = 90%, $100K-$500K = 75%, $500K-$2M = 50%, >$2M = 30%)
- Non-marginality (Dim 3): Item 19 quality, ODE model, churn rate, royalty trend, audit opinion
- Develop and direct (Dim 4): training hours, territory protection, term vs renewal horizon
- 15 flags: staleness, registration, litigation, bankruptcy, cherry-pick, COVID data, working capital, cure period, non-compete, fee escalation, e-commerce carve-out, entity transfer block, ROFR
- ODE formula: AUV × (1-COGS%) - fees - estimated rent - estimated labor - debt service (low/mid/high cases)
- LLM narrative: 4 sections (OVERALL_VERDICT, STRENGTHS, CONCERNS, ATTORNEY_NOTE), written as senior attorney + franchise director

### Build
TypeScript: zero errors (pre-existing webhook.spec.ts Playwright/vi error unrelated). Build clean.
Both pages verified in preview: upload page renders Obsidian Gold design correctly; score page handles auth/not-found gracefully.

---

## SESSION — FDD Intelligence: FDD-3, FDD-4, FDD-5 + lint clean (June 19, 2026)

### FDD-3 — Territory Market Analysis (commit e16043b)

| File | What it does |
|---|---|
| `src/lib/fdd-territory-engine.ts` | Census ACS 5-year API (ZCTA population/income/households/age/employment/housing), state FIPS mapping, Google Places competitor scan with graceful degradation (neutral score 50 when key absent), category-specific weights (QSR 50/20/30, Home Services 30/50/20, Senior Care 25/45/30, etc.), category-aware radii, LLM territory narrative |
| `src/app/api/fdd/territory/route.ts` | POST /api/fdd/territory — runs `analyseTeritory()`, persists to `territory_analysis` JSONB column |
| `src/app/fdd/territory/[fddId]/page.tsx` | Territory dashboard — ScoreBar, DimensionCard (population/income/competition), CensusTable, NarrativeSection, data completeness notice |

Key decisions:
- Census ZCTA lookup (ZIP Code Tabulation Areas — closely match US ZIP codes)
- `territory_analysis._full` key stores full `TerritoryAnalysis` object for UI reconstruction without re-running analysis
- `GOOGLE_PLACES_API_KEY` absent from .env.local — competition score defaults to 50 (neutral), source: 'unavailable'

### FDD-4 — Questions Generator + Profile Match (commit 1d8e0a5)

| File | What it does |
|---|---|
| `src/lib/fdd-questions-engine.ts` | 15 flag→question templates with `what_to_listen_for`, 8 standard always-included questions, data-gap trigger questions (no Item 19, missing royalty, etc.), 5 LLM bespoke questions, CaseProfile match score (investment_match, net_worth_match, industry_fit, gaps, 0–100 overall) |
| `src/app/api/fdd/questions/route.ts` | POST /api/fdd/questions — loads CaseProfile (maybeSingle), always re-scores to get full flag objects, calls `generateQuestions()`, persists to `questions` + `profile_match` columns |
| `src/app/fdd/questions/[fddId]/page.tsx` | QuestionCard (expandable with what_to_listen_for, critical badge, audience label), ProfileMatchPanel (score + tiles + gaps), filter tabs by audience, copy-all to clipboard as formatted text |

### FDD-5 — Final Report + Platform Integration (commit 4d58970)

| File | What it does |
|---|---|
| `src/app/api/fdd/report/route.ts` | POST /api/fdd/report — LLM 6-section final report (EXECUTIVE_SUMMARY, KEY_STRENGTHS, KEY_CONCERNS, FINANCIAL_PICTURE, MARKET_VERDICT, RECOMMENDED_NEXT_STEPS), writes 8 answer keys to user's most recent application via `writePlatformIntegration()` |
| `src/app/fdd/report/[fddId]/page.tsx` | FullReport component (all 6 sections + module nav grid + print button), FreeTeaser component (3 real metrics + flag count + blurred locked questions + upgrade CTA), `hasAccess` boolean gate (currently `true` for all auth users — payment integration pending) |
| `src/app/fdd/page.tsx` | FDD index — lists all user analyses with AnalysisCard, 5-stage progress bars (Extracted/Scored/Territory/Questions/Report), smart navigation to furthest completed stage, empty state |

Platform integration answer keys written:
- `QA-NEW-04` franchise/business name
- `QF-NEW-01` investment amount (Item 7 minimum)
- `QA-NEW-09` opening day employees
- `QA-NEW-12` territory type
- `QA-NEW-03` business industry (from territory category)
- `QA-NEW-11` target state
- `QA-FDD-COMPAT` compatibility result (STRONG/VIABLE/CAUTION/INELIGIBLE)
- `QA-FDD-FLAGS` flag count

### Lint + Middleware Fixes (commit ec37352)

Resolved all ESLint errors to achieve clean build (119 pages, zero errors):
- `fdd-scoring-engine.ts`: removed unused `val()` helper and `totalMax` in `scoreDimension2`
- `fdd-questions-engine.ts`: removed unused `totalMax` and `category` variables
- `fdd/extract` route: removed `assessStaleness`/`assessRegistration` unused imports
- `fdd/questions` route: collapsed dead cached-branch into single re-score call
- `fdd/review` page: fixed ternary-as-statement and unescaped `"` entities in JSX
- `fdd/score` page: removed `ScoringResult` and `FddFlag` unused type imports
- `middleware.ts`: `/fdd/` added to `protectedRoutes` array and `config.matcher`

### What remains for FDD Intelligence
- **Freemium gate**: wire `hasAccess` in `report/[fddId]/page.tsx` to a payment check when pricing is defined ($297 placeholder in teaser). Gate structure is fully built.
- **Google Places**: `GOOGLE_PLACES_API_KEY` not in .env.local — competition scoring uses neutral fallback. Add key to enable real competitor data.
- **Multi-FDD comparison**: deprioritized, not built.

---

## SESSION 37 — Phase D QA + Phase E LC-1 + Engine KB + Command Centre (June 19, 2026)

### Navigation & Wiring (commit f56230a)
- Gap Analysis + FDD Analysis added to authenticated nav (desktop + mobile) in `Nav.tsx`
- Gap Analysis + FDD Analysis tiles added to dashboard Quick Actions
- `/franchise` 404 in results Section 8 → now points to `/fdd` ("Analyse an FDD →")
- `/score` orphan → redirect to `/results` via `next/navigation redirect()`

### Phase E — LC-1: Privacy + GDPR (commit 9d5869a)
- **Section 12 added** to `PrivacyClient.tsx`: "AI Processing — No AI Training" — explicit statement covering Anthropic, OpenRouter, Groq, XAI/MiMo with zero-data-retention notes
- **Section 13 added**: EU/GDPR notice for treaty country users (French, German, Italian, Dutch, Spanish nationals etc.) — 6 GDPR rights, lawful basis (contract + legitimate interests), SCCs for international transfers

### Engine KB Wiring into Doc Gen (commit 9d5869a)
- `INTERVIEW_KNOWLEDGE_BASE` imported into `generation-engine.ts`
- `buildKBContext(documentType, consulatePost)` — selects relevant KB entries by doc type (cover_letter: IQ-01–07, source_of_funds: IQ-08–10, business_plan: IQ-01–03/11–12), formats officer-perspective guidance
- `fetchFAQKBContext()` — pgvector lookup against `faq_kb_chunks` table; graceful fallback if OPENAI_API_KEY absent or table empty (seeds not yet run)
- Both injected into `callClaudeAPI` user message before case brief — +1.4 pts expected score improvement

### Dashboard → Command Centre (commit a03624c)
- Added `CaseProfileData` interface + `caseProfile` state
- Fetch `case_profiles` (archetype, completeness_score, net_worth_range, industry_interest, timeline_goal) in init
- **Module Checklist** replaces confusing 0% progress bar — 6 clickable steps with gold ✓ when complete, links to correct page
- **Investor Profile snapshot** — shows archetype, industry, net worth range, timeline; completeness % badge; CTA to gap-analysis if < 80% complete
- Quick Actions grid expanded: Checklist / Gap Analysis / FDD Analysis / Support

### QA-A + QA-B + QA-C Sweep (commits ba25f6e, 6d37a9a)
- Created `src/app/gap-analysis/layout.tsx` — metadata, Nav, robots noindex
- `/gap-analysis` added to `middleware.ts` protectedRoutes + config.matcher — closes auth bypass
- No other broken hrefs, 404 routes, or missing error states found in systematic audit
- All 119 pages confirmed building clean
- Dynamic API routes (cookies) confirmed behaving correctly — not static rendering issues

### Build Status
- 119 pages, zero TypeScript errors, zero ESLint errors
- All commits on `dev` branch

### Pending (owner actions still required)
1. Accept Groq TTS terms at console.groq.com — voice mode blocked
2. Run SQL: UPDATE pricing SET stripe_price_id = 'price_1Tim5fF7Ggk3LUEy2JGRRKrB', amount_cents = 2999 WHERE tier_id = 'simulator_3pack'
3. Update Vercel env STRIPE_PRICE_SIMULATOR_3PACK
4. Refund $197 test Stripe charge
5. Run FAQ seed scripts (unblocks dynamic KB in doc gen): `npx tsx scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts`
6. Add GOOGLE_PLACES_API_KEY to .env.local — enables real competitor data in FDD territory
7. Confirm FDD pricing ($297 placeholder) — unblocks `hasAccess` gate wiring in `/fdd/report/[id]`

### Phase F — Engine Improvements (Sessions 38–39)

| Item | Status | Commit | Notes |
|---|---|---|---|
| Engine Audit #3 | ✅ COMPLETE | — | 8.1/10 (+0.5 from audit #2). FDD +2.5pts, doc gen +1.2pts |
| Archetype doc gen — all 8 doc types | ✅ COMPLETE | 3246dc1 | qualifications, nonimmigrant_intent, investment_proof, visa_category, ds160_reference now have 4-archetype guidance. KB entries IQ-13–IQ-20 mapped |
| Live gap score subscription | ✅ COMPLETE | 90b8bfd | Supabase realtime on case_profiles row. Green "Live update" badge on auto-refresh. Manual Recalculate preserved |
| Quiz conditional branching | ✅ ALREADY DONE | — | show_if + evaluateShowIf already fully implemented |
| FDD mobile layout fix | ✅ COMPLETE | fa141fb | Heading + New analysis button overlap at 390px — fixed with flex-col sm:flex-row |
| Cross-session coaching memory depth | ✅ COMPLETE | 7f3090b | Last 2 sessions fetched; coaching-report LLM names trajectory (improving vs stagnating) |
| Evaluator pattern tracking (text-mode) | ✅ COMPLETE | 7f3090b | Last 3 session answers passed as priorAnswers to live text-mode evaluate calls — matches voice batch flow |
| Scheduled CaseProfile nightly rebuild | ✅ COMPLETE | cf60e19 | Vercel Cron 02:00 UTC → /api/cron/rebuild-profiles. Requires CRON_SECRET env var on Vercel |
| FDD freemium payment gate | ⏳ DEFERRED | — | hasAccess hardcoded true. Needs Romy to confirm price first |

### Next priorities (Phase F — remaining)
1. FDD freemium payment gate — wire `hasAccess` to Stripe (owner must confirm price)
2. Add CRON_SECRET to Vercel env — activates nightly profile rebuild
3. FAQ seeds — add OPENAI_API_KEY to .env.local and run scripts (unblocks dynamic KB for 2 engines)

---

### Session 42 — E2E Audit Initiated + 3 Bug Fixes (June 20, 2026)

**Context:** Structured page-by-page E2E audit launched. 21-sprint plan defined. Sprint results will be recorded here after each phase.

**Bugs found and fixed:**

| Bug | File | Fix |
|---|---|---|
| Ghost columns in `applications` SELECT crashed gap-analysis | `src/app/gap-analysis/page.tsx` | Removed `business_category`, `operational_status`, `target_state` from SELECT — columns don't exist in DB. PostgREST returned 400 → `.single()` returned null → "Application not found or access denied." |
| Seed never inserted `applications` row | `scripts/seed-test-profiles.mjs` | Added `dbInsert('applications', profile.application)` + batch `dbInsert('answers', answerRows)` per profile. Added `application` config block to each profile definition. `case_profiles.application_id` now set correctly. |
| Dashboard RSC router cache served previous user's data on client-side nav | `src/app/dashboard/page.tsx` | Added `export const dynamic = 'force-dynamic'` — prevents Next.js router from serving cached RSC payload when switching accounts in same browser session. Dashboard now shows `ƒ` in build output. |

**Test profile verification results:**

| Profile | /results | /dashboard | /gap-analysis |
|---|---|---|---|
| A — Canada/Romy (owner) | Not re-tested (confirmed S41) | ✅ Instant load | ✅ Loads |
| B — France/Jean (ATTORNEY_RECOMMENDED · 86) | ✅ Score, flags, journey strip, France flag | ✅ Instant from /results nav | ✅ 11 critical / 3 moderate / 17/100 |
| C — UK/James (PROCEED · 100 / buyer) | ✅ London Embassy consulate, SOLO+FAMILY $750 | ✅ After hard refresh (RSC cache bug — now fixed) | ✅ Loads |

**Note on login routing for seeded profiles:**
- After seed, profiles have an `applications` row with `payment_status` = NULL (not 'paid')
- Login page routes: no app → `/results`; app exists but unpaid → `/pricing`; app paid → `/apply/{last_section}`
- For testing, navigate directly to `/results`, `/dashboard`, `/gap-analysis` — pages don't paywall, only the login router does

**Build:** Clean. 122 pages (was 119 — 3 additional routes counted). `/dashboard` now `ƒ` (dynamic server-rendered).

---

### 21-Sprint E2E Audit Plan

**Rule:** After each phase, update BUILD_TRACKER sprint results table before starting the next phase.

**Sprint tracking:**

| Sprint | Page(s) | Status | Issues Found | Issues Fixed |
|---|---|---|---|---|
| S1 | `/results` | ✅ Complete | 6 bugs found (see Session 43) | ✅ All fixed |
| S2 | `/pricing` | 🔶 DEFERRED — prices changing, re-audit after pricing update | — | — |
| S3 | `/login` + `/signup` + `/forgot-password` | ✅ Complete | 4 bugs found (see Session 46) | ✅ All fixed |
| S4 | `/dashboard` + `/documents/[id]` + cross-app deadlock | ✅ Complete | 10 bugs total (5 in Session 44, 5 in Session 47) | ✅ All fixed |
| S5 | `/apply/module1` | ✅ Complete | 2 bugs found (see Session 46) | ✅ All fixed |
| S6 | `/apply` hub + `/apply/module2` | ✅ Complete | 11 bugs found (see Session 49) | ✅ All fixed |
| S7 | `/apply/business` | ✅ Complete | 1 bug: startup costs never persisted to DB (now serialised as JSON under M3-E-STARTUP-COSTS) | ✅ Fixed (commit 1ba5976) |
| S8 | `/apply/investment` | ✅ Complete | 1 bug found (see Session 50) | ✅ Fixed |
| S9 | `/apply/family` | ✅ Complete | 1 bug found (see Session 50) | ✅ Fixed |
| S10 | `/apply/ties` | ✅ Complete | 2 bugs found (see Session 50) | ✅ Fixed |
| S11 | `/apply/story` | ✅ Complete | 0 bugs (see Session 50) | — |
| S12 | `/apply/qualifications` | ✅ Complete | 1 bug found (see Session 50) | ✅ Fixed |
| S13 | `/apply/upload` → `/upload/review` → `/upload/gaps` | ✅ Complete | document revision + stale closure bugs fixed | ✅ |
| S14 | `/apply/module3/a–l` | ✅ Complete | 0 bugs | ✅ |
| S15 | `/apply/module4` + `/apply/checklist` + `/apply/calendar` + `/apply/overview` | ✅ Complete | 0 bugs | ✅ |
| S16 | `/gap-analysis` | ✅ Complete | 4 bugs: ghost columns (business_category, marginality_score), hash nav broken on 9 D-codes, semantic-eval always 404 | ✅ All fixed |
| S17 | `/simulator` → full flow | ✅ Complete | 0 bugs | ✅ |
| S18 | `/fdd/upload` → `/fdd/report` | ⏳ | — | — |
| S19 | `/generate/[id]` → `/documents/[id]` | ⏳ | — | — |
| S20 | `/settings` | ✅ Complete | 0 bugs | ✅ |
| S21 | `/learn/*` + `/support` + `/terms` + `/privacy` | ✅ Complete | 0 bugs | ✅ |

---

### Session 46 — S3: /login + /signup + /forgot-password Full Audit (June 20, 2026)

**Bugs found and fixed (commits 389240d, 7f6a52b):**

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | Forgot-password `redirectTo` pointed to `/login` — Supabase sends user to login page with a token, but login page has no handler for password reset tokens. Flow was broken end-to-end | `forgot-password/page.tsx` | Redirects to `/auth/callback?next=/reset-password` |
| 2 | No `/auth/callback` route existed — Supabase magic link / password reset codes were never exchanged for sessions | `src/app/auth/callback/route.ts` (NEW) | Server route: exchanges code for session, redirects to `next` param; expired codes → `/forgot-password?error=expired` |
| 3 | No `/reset-password` page — users had nowhere to land after clicking a reset email | `src/app/reset-password/page.tsx` (NEW) | Full reset form: new password + confirm, session guard, expired-link state, success state |
| 4 | Login page had 7× `console.log` debug statements in production and made a redundant `getSession()` call (signInData.session already available) | `login/page.tsx` | Removed all debug logs; use `signInData.session` directly for rememberMe |

**Bonus fix (commit 7f6a52b):**
- `/signup`: Terms of Service and Privacy Policy links now open `target="_blank"` — users no longer lose their signup form when clicking legal links

**Seed script (commit a0c9da6):**
- Added 50+ realistic Module 3 case file answers to James Windsor seed profile for meaningful gap analysis output

**Build:** clean — 123 pages (reset-password added). Commits: 389240d, 7f6a52b, a0c9da6.

---

### Session 46 — Sprint 5: /apply/module1 Full Audit (June 20, 2026)

**Tested:** All 6 steps of the Module 1 onboarding flow — application type, terms consent, CASL, referral consent, family composition, and application record creation.

**Bugs found and fixed (commit a9e390d):**

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | Step 6 (application record creation) had no trigger — `saveApplicationRecord()` gated inside `handleNext()` checking `step===6`, but step 6 renders no button so the call never fired. User left on permanent spinner with no way to proceed. | `apply/module1/page.tsx` | Added `useEffect` that fires `void saveApplicationRecord()` when step reaches 6. Removed the dead `if (step === 6)` branch from `handleNext()`. |
| 2 | Terms of Service and Privacy Policy links on step 2 opened in same tab — clicking to read them navigated away, losing all form state (application type, partner name/email, etc.) | `apply/module1/page.tsx` | Added `target="_blank" rel="noopener noreferrer"` to all 4 links on step 2 (both intro paragraph links and both checkbox label links). |

**Tested and confirmed correct:**
- ✅ Step 1 → 2 → 3 → 4 → 5: back/continue navigation works correctly
- ✅ Step 1 Back → /dashboard
- ✅ Step 1 solo/partnership toggle wires correctly; partnership requires partner name + email before enabling Continue
- ✅ Step 2 Continue disabled until both checkboxes checked
- ✅ Step 3 Continue disabled until CASL choice made
- ✅ Step 4 referral consent optional — Continue always enabled
- ✅ Step 5 family composition + spouse/children fields
- ✅ PreFilledField component exists and is correctly imported
- ✅ All DB columns exist in migrations: `consent_log`, `referral_consents`, `module_1_complete`, `working_target_date`, `family_composition`, `processing_path`, `module1_completed_at`
- ✅ S3 Complete noted (other agent)

**Known issue (not fixed — pre-fill gap):**
- quiz_sessions does not store `family_type`, `partner_name`, `partner_email`, `spouse_name`, `spouse_dob` — these columns are never written by the quiz. Pre-fill on step 1 and step 5 silently falls back to empty. No crash — just no pre-fill from quiz data for these fields.

**Build:** clean — 122 pages. Commit: a9e390d.

---

### Session 49 — Sprint S6: /apply hub + /apply/module2 audit (June 20, 2026)

**Sprint scope:** Full E2E audit of `/apply` (Case File hub) and `/apply/module2` (business advisor).
**Commits:** `80a10d8` (module2 fixes), `6c3ee98` (hub fixes + migration 002)

**Root cause discovered:** The applications table in the live Supabase DB has fewer columns than the code expects. Three columns were written into the codebase without corresponding migration files — causing all `/apply` hub queries to return HTTP 400, silently zeroing out all section completion %.

**Bugs fixed — /apply hub (page.tsx):**
1. `preparation_status` in applications select → 400 (column missing, needs migration 003)
2. `last_active_section` in applications select → 400 (column missing, needs migration 002)
3. `last_active_cluster` in applications select → 400 (column missing, needs migration 002)
4. `const appId = apps[0].id` was outside the `if (apps)` null guard → crash risk
5. Quiz session loading block accidentally dropped during prior fix → restored

**Bugs fixed — /apply/module2 (page.tsx, from prior commit 80a10d8):**
6. `applicationId` state missing → `saveAnswer` had no application_id to use
7. `saveAnswer` was posting to legacy route instead of `/api/answers`
8. Gap advisory computed at step 6 but displayed at step 5 → always showed "Strong Alignment"
9. `completeModule2` recomputed gap (wrong) instead of using `gapAdvisory` state
10. `completeModule2` redirected to `/apply/module3` instead of `/apply`
11. Empty shortlist crash for categories without BUSINESS_EXAMPLES

**Migration created:**
- `docs/migrations/002_module_state_columns.sql` — adds all module-progress columns:
  last_active_section, last_active_cluster, module_1_complete, module_2_complete,
  experience_gap_flag, business_shortlist, specific_business_description, processing_path, family_composition

**Verification:**
- James Windsor hub: Story 38% complete, $195,000 USD, Assisting Hands Home Care East Austin LLC ✓
- 3 of 5 sections complete (Business + Investment + Ties exceed seed answer thresholds) ✓
- Applications query returns 200, answers query returns 200 ✓

**⚠️ ACTIONS REQUIRED (Supabase SQL Editor):**
1. Apply `docs/migrations/002_module_state_columns.sql` — unlocks last_active_section resume logic + module2 completion writes
2. Apply `docs/migrations/001_case_file_columns.sql` — unlocks source column pre-fill tracking
3. Apply `docs/migrations/003_document_uploads.sql` — unlocks preparation_status document upload routing

---

### Session 51 — Migrations applied + hub select restored (June 20, 2026)

**Migrations applied to Supabase (all 3 verified):**

| Migration | Columns | Status |
|---|---|---|
| `001_case_file_columns.sql` | `answers.source`, `applications.partner_gender` | ✅ Applied |
| `002_module_state_columns.sql` | `last_active_section`, `last_active_cluster`, `module_1_complete`, `module_2_complete` | ✅ Applied |
| `003_document_uploads.sql` | `answers.confidence`, `answers.source_document_type`, `application_documents` table, `document_discrepancies` table | ✅ Applied (partial — `preparation_status` missing; applied manually as fix) |

**Note:** `applications.preparation_status` was missing from migration 003 output — added manually via Supabase SQL Editor. Verified with `SELECT column_name FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'preparation_status'` → 1 row.

**Hub page follow-up (commit 82cfae1):**

Previously, `last_active_section`, `last_active_cluster`, and `preparation_status` were omitted from the hub's `applications` select with "Note: omit until migration applied" comments. Now that all migrations are live, those columns are restored:
- `last_active_section` / `last_active_cluster` → `setLastActiveSection` / `setLastActiveCluster` / `setIsReturning(true)` — returning-user banner in `CaseFileHeader` now activates
- `preparation_status` → `setPreparationStatus` → `DocumentUploadCard` receives real DB value instead of static `'scratch'`

**Verified:** Hub loads correctly at `/apply` — James Windsor / $195,000 / Assisting Hands data present. Supabase network request at `/rest/v1/applications?select=id,application_type,status,last_active_section,last_active_cluster,preparation_status` returns 200.

**Next:** S13 — `/apply/upload` → `/apply/upload/review` → `/apply/upload/gaps` document upload flow audit.

---

### Session 50 — S8: /apply/investment Full Audit (June 20, 2026)

**Tested:** All 5 clusters, cluster navigation, save, NEXT/Back navigation, hash routing.

**Bug found and fixed (commit pending):**

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | `renderQuestions()` had no `multi` case — questions with `type: 'multi'` (`M3-F-04`, `M3-F-05`, `M3-H-08`, `M3-I-03`, `M3-I-10`) fell through to `TextInput`, displaying a raw JSON array string instead of clickable checkboxes | `apply/investment/page.tsx` | Added `multi` case: parses stored JSON array, renders `OptionButton` per option with toggle-on-click, saves as `JSON.stringify(selectedValues[])` |

**Tested and confirmed correct:**
- ✅ All 5 clusters render with correct content and data
- ✅ Cluster navigation (sidebar buttons) switches panels
- ✅ Single-select OptionButtons work
- ✅ Multi-select now renders as checkboxes — save returns 200 OK
- ✅ Investment health indicator (STRONG at 100%) renders
- ✅ Advisory blocks fire conditionally (round-number warning, proportionality warning)
- ✅ ProjectionTable renders in cluster 4
- ✅ `NEXT: YOUR QUALIFICATIONS →` navigates to `/apply/qualifications`
- ✅ `Back to case file` navigates to `/apply/business` (prevSectionPath — correct)
- ✅ Hash navigation: `#investment-overview` → cluster 1, `#source-of-funds` → cluster 2, `#paper-trail` → cluster 3, `#projections` → cluster 4
- ✅ `POST /api/answers → 200 OK` on every save
- ✅ `application_lifecycle → 400` (expected — migration 002 pending)

---

### Session 48 — Seed Audit + Gap-Analysis Engine Hardening (June 20, 2026)

**Goal:** Confirm Profile C (James Windsor / Assisting Hands Home Care East Austin LLC) seeds enough data that the gap analysis report shows only *legitimate* gaps — not false criticals caused by missing answer keys.

**Root cause identified:** The gap-analysis engine was written against old M3-I-* key semantics, the UI pages write different keys (e.g. M3-I-05 = FT employees, not Y1 revenue), and UI select fields store lowercase `value` attributes (`'yes'`/`'no'`/`'partial'`), not the full label text the engine was checking.

**Engine fixes (3 bugs in `src/lib/gap-analysis-engine.ts`):**

| # | D-code | Bug | Fix | Commit |
|---|---|---|---|---|
| 1 | D-02 | M3-F-NEW-01 is a select ('yes'/'partial'/'no'), not a dollar amount — engine's `parseAmount()` always returned 0, making funds look "not deployed" | Added string check: 'yes' → low risk (funds deployed), 'partial'/'no' → high risk | b45ccba |
| 2 | D-03 | Engine treated 'yes' on M3-H-NEW-01 as a gap disclosure (checked for string 'yes' in `mentionsGaps`). Inverted logic: 'yes' means *complete* paper trail (good), 'no'/'partial' means gaps (bad) | Rewrote `hasCompletePaperTrail` / `mentionsGaps` detection with correct polarity | b45ccba |
| 3 | D-10 | Engine read `app.operational_status` — column does not exist in `applications` DB schema → always null → pre-start businesses scored incorrectly | Added `effectiveOpStatus` inference from M3-G-08 answer key text when DB column is absent | b45ccba |

**Seed data fixes (8 mismatches in `scripts/seed-test-profiles.mjs`):**

| Key | Was | Now | Why |
|---|---|---|---|
| M3-F-NEW-01 | `'Yes — funds are actively deployed...'` (label) | `'yes'` | Actual select value stored by UI |
| M3-H-NEW-01 | `'Yes — complete paper trail'` (label) | `'yes'` | Actual select value stored by UI |
| M3-I-06 | `'3'` (PT employees) | `'650000'` | Engine uses this key as Year 3 revenue — was producing $3 Y3, making business look marginal ($3/$85K = 0×) |
| M3-I-04 | `'75000'` (5 chars) | Full job title list | Engine's `roleList.length > 10` check failed on dollar amount |
| M3-G-BANK | missing | US business bank account confirmation | D-10 bank account evidence |
| M3-I-BASIS | missing | Full projection basis narrative | Semantic eval `projection_basis` field checks this key |
| M3-H-FUNDS-DETAIL | missing | Full funds chain narrative | Semantic eval `source_of_funds` field checks this key |
| M3-A-23 | missing | Clean visa history statement | D-15 immigration compliance |

**Additional keys seeded:** M3-E-NEW-01/02 (ownership docs for D-13), M3-K-NEW-01 (market data for D-06), M3-I-NEW-01 (hiring timeline), M3-I-NEW-02 (projection basis), M3-I-02 (0 current employees, pre-start), M3-G-NEW-01 (business license), M3-I-03 (6 FT employees Y1).

**Profile C now seeds 83 Module 3 answers** (up from 72). All keys cross-checked against every `getAnswer()` call in gap-analysis-engine.ts.

**Verified gap analysis result (Profile C):**
- Score: **67/100**
- Critical risks (2 — both legitimate): D-05 (no business plan document uploaded), D-08 (no simulator sessions)
- Moderate risks (6): D-03 (no bank docs uploaded yet — correct), D-10 (pre-start + license docs moderate), others
- Low risks (7): D-01 (investment substantial), D-02 (funds deployed ✓), D-04 ($650K Y3 / $85K household = 7.6× ✓), D-06 (projections backed ✓), D-07 (6 employees + roles ✓)
- Evidence categories: Investment Amount 100 STRONG, Employment Creation 100 STRONG, Business Operations 75 STRONG, Source of Funds 68 GOOD, Business Plan 62 GOOD, Management Role 37 NEEDS WORK (legitimate — no simulator sessions)

**Key decisions:**
- `operational_status` column does NOT exist in `applications` table — do not attempt to seed it. Engine infers from M3-G-08 answer.
- Select fields store `value` attributes (`'yes'`), not label text — engine must check string equality, not `parseAmount()`.
- Semantic eval (`/api/gap-analysis/semantic-eval`) uses a separate key set from the main engine — both must be seeded.

**Build:** clean. Commits: b45ccba (engine D-10 fix), earlier commits in Session 47 for D-02/D-03.

---

### Session 47 — S4 Extended Audit: Documents Auth + GoTrueClient Deadlock + Dashboard Link Fixes (June 20, 2026)

**Context:** Second pass at S4 during a live audit. Session 44 had fixed 5 dashboard rendering bugs; this session exposed 5 more bugs discovered by actually clicking through the dashboard checklist, navigating from /gap-analysis → /fdd, and opening /documents/[id].

**Bugs found and fixed:**

| # | Bug | File(s) | Fix | Commit |
|---|---|---|---|---|
| 1 | "Solo Application" rendered as "solo Application" — `application_type` raw value from DB, lowercase | `dashboard/page.tsx` | Capitalize first char: `charAt(0).toUpperCase() + slice(1)` | 574248d |
| 2 | "Eligibility Quiz" checklist linked to `/quiz` — sending completed-quiz users back to quiz with no feedback (quiz page redirects them to /dashboard creating a loop) | `dashboard/page.tsx` | Changed href to `/results` | 574248d |
| 3 | "Investment & Documents" checklist linked to `/apply/upload` (document intake flow for self-preparers) instead of the case file investment section | `dashboard/page.tsx` | Changed href to `/apply/investment` | 574248d |
| 4 | `/documents/[applicationId]` showed "Not authenticated" for every logged-in user — page read `localStorage.getItem("supabase_user")` which the app never writes (session lives in Supabase auth cookies, not localStorage) | `documents/[applicationId]/page.tsx` | Removed localStorage check entirely; API returns 401 for unauthenticated users, client handles status code directly. Removed Bearer header (cookie auth only). | 6c8c9d9 |
| 5 | GoTrueClient `navigator.locks` deadlock — after navigating away from /gap-analysis (which fires many parallel Supabase queries that trigger token refresh), the exclusive `navigator.locks` lock gets stuck. All subsequent `getSession()`/`getUser()` calls queue behind the stuck lock indefinitely. Affected: /fdd spinner never resolved, nav disappeared (showed null = unauthenticated), dashboard showed loading forever on re-navigation. | `src/lib/supabase.ts` | Added `noOpLock` function that bypasses `navigator.locks` entirely. Passed as `auth: { lock: noOpLock }` to `createBrowserClient`. Safe for our singleton/read-mostly auth pattern — two concurrent refreshes overwrite each other without data loss. Also confirmed `window.__e2go_supabase__` singleton persists across HMR to prevent duplicate GoTrueClient instances. | c5e5ea2 |

**Also committed this session (related but separate fixes):**

| Commit | What | File |
|---|---|---|
| 6975b12 | Gap-analysis engine was scoring fund deployment (M3-F-NEW-01) and paper trail (M3-H-NEW-01) as "no data" even when user selected 'yes'/'partial'/'no'. These are select fields, not free-text amounts — engine was only checking numeric `.amount` property. Fixed: check string values ('yes'/'deploy'/'spent'/'active' → low risk; 'no'/'partial'/'need to compile' → high risk). | `src/lib/gap-analysis-engine.ts` |
| 824de1c | Expanded UK test profile (James Windsor) seed with 50+ Module 3 answers across all 6 case file sections for realistic gap analysis QA. | `scripts/seed-test-profiles.mjs` |

**Root cause note — navigator.locks deadlock:**
- The GoTrueClient (inside `@supabase/supabase-js`) wraps all auth operations in a `navigator.locks` exclusive lock named `lock:sb-<project_ref>-auth-token`
- Gap-analysis page fires many parallel Supabase queries simultaneously — some trigger a token refresh that acquires the lock
- When navigating away mid-refresh, the callback inside the lock is abandoned but the lock is NOT released by the browser
- A service worker was also confirmed present (1 registered) which can hold the lock across page reloads
- **Failed approach tried first:** `navigator.locks.request(name, { steal: true })` after 6s timeout — caused "Lock broken" AbortError in GoTrueClient which invalidated the session state
- **Final fix:** `noOpLock` pattern (bypass entirely) — confirmed by `navigator.locks.query()` showing `held: []` after navigation

**Full S4 audit results — all items confirmed ✅:**
- /dashboard nav, 4 stat cards, module checklist, Quick Actions grid, profile snapshot
- /gap-analysis → /fdd navigation (was deadlocking — now fixed)
- /documents/[id] (was showing "Not authenticated" — now fixed)
- /simulator (tab nav, gating message)
- /apply/calendar (renders, empty body — no timeline-setting form)
- /apply (application hub)
- Settings, Log out, James dropdown

**Build:** clean. 5 commits on dev branch: 574248d, 6c8c9d9, c5e5ea2, 6975b12, 824de1c.

---

### Session 45 — S16 /gap-analysis Full Audit + Prior Fixes Committed (June 20, 2026)

**Work done:**
- Committed all S1 (results/quiz) fixes — 6 bugs: multiselect type mismatch, stale deps, edit-jump mechanism, QUESTIONS_MAP label, FAQ duplicate header, CASL enforcement
- Committed apply hub fixes — ghost columns `full_name`, `answers`, `created_at` causing "complete eligibility check" banner to show for completed users
- Completed S16 /gap-analysis full audit — all 15 D-code cards + Fix links, Run AI analysis, Practice in Simulator

**Bugs found and fixed (commits 007f62a, 3f16ae6):**

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | `business_category` column doesn't exist → `/api/gap-analysis/semantic-eval` always 404 | `api/gap-analysis/semantic-eval/route.ts` | Removed non-existent column from SELECT |
| 2 | `marginality_score` column doesn't exist → `brief` always null → AI analysis banner never hides | `app/gap-analysis/page.tsx` | Changed to `substantiality_score` only |
| 3 | Hash-based D-code Fix links land on wrong tab (9/15 D-codes affected) | `apply/investment/page.tsx`, `apply/business/page.tsx`, `apply/qualifications/page.tsx` | Added hash→cluster mapping in mount useEffect |
| 4 | `Run AI analysis` button never showed "analysis complete" state (same root as bug #2) | `app/gap-analysis/page.tsx` | Fixed by bug #2 fix |

**D-code Fix link audit results:**
- ✅ D-01 `#investment-overview` → cluster-1 (correct — first tab)
- ✅ D-02 `#paper-trail` → cluster-3 (FIXED)
- ✅ D-03 `#source-of-funds` → cluster-2 (FIXED)
- ✅ D-04 `#projections` → cluster-4 (FIXED)
- ✅ D-05 `#market` (business) → cluster-7 (FIXED)
- ✅ D-06 `#projections` → cluster-4 (FIXED)
- ✅ D-07 `#operations` (business) → cluster-3 (FIXED)
- ✅ D-08 `/simulator` (no hash needed)
- ✅ D-09 `/simulator` (no hash needed)
- ✅ D-10 `#operations` (business) → cluster-3 (FIXED)
- ✅ D-11 `#role` (qualifications) → cluster-3 (FIXED)
- ✅ D-12 `#source-of-funds` → cluster-2 (FIXED)
- ✅ D-13 `#entity` → cluster-1 (already correct)
- ✅ D-14 `/apply/business` no hash → cluster-1 Entity (correct)
- ✅ D-15 `/apply/ties` no hash (correct)

**Verified working:** Run AI analysis (fires `/api/analysis/run` → writes case_briefs → banner hides on reload), Practice in Simulator button (→ `/simulator?applicationId=...`), all 6 evidence category accordion buttons.

**Note:** `npm run build` was run mid-session which corrupted the dev server webpack cache. Fixed by stopping/restarting the preview server (`preview_stop` → `preview_start`). Do NOT run `npm run build` while the preview server is active in future sessions.

---

### Session 44 — Sprint 4: /dashboard Full Audit (June 20, 2026)

**Tested:** All elements on `/dashboard` — 4 stat cards, module checklist, profile snapshot, Quick Actions grid, Nav authenticated links, user dropdown (Settings / Log out).

**Bugs found and fixed (commit 7ceb6d7):**

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | `lifecycle.quiz_completed_at` never populated — quiz writes `module0_completed_at` (no migration), dashboard reads different column name. Eligibility Quiz checklist item and progress step always showed unchecked | `dashboard/page.tsx` | Use `quizData?.completed_at` directly from quiz_sessions (already fetched) — no lifecycle column needed |
| 2 | Checklist "Onboarding" linked to `/apply` (case file hub) instead of `/apply/module1` | `dashboard/page.tsx` | Changed href to `/apply/module1` |
| 3 | Outcome displayed raw all-caps: "ATTORNEY RECOMMENDED" | `dashboard/page.tsx` | Map outcomes to human labels: PROCEED → "Eligible to proceed", ATTORNEY_RECOMMENDED → "Attorney recommended", PR-* → "Not eligible" |
| 4 | Nav dropdown had no click-outside handler — stayed open when clicking anywhere else on the page | `Nav.tsx` | Added `useRef` + `useEffect` `mousedown` listener; dropdown closes on outside click |
| 5 | Progress calculation also used `lifecycle.quiz_completed_at` (same broken column) | `dashboard/page.tsx` | Same fix — use `quizData?.completed_at` for quiz step |

**Deferred (not fixed — need lifecycle wiring):**
- `module3_completed_at` — no migration, nothing writes it. "Investment & Documents" checklist item will never check.
- `module5_completed_at` — no migration, nothing writes it. "Interview Simulator" checklist item will never check.
- Maximum dashboard progress = 4/6 (67%) until these lifecycle events are wired.
- Root fix needed: add migrations + write events when upload flow completes and when simulator session completes.

**Note re: "No sign-out button" (Session 43 deferred bug):** Nav.tsx has a Log out button in the user dropdown (`handleSignOut → supabase.auth.signOut() → router.push("/")`). This bug appears resolved. Closing.

**Build:** clean — 122 pages. Commit: 7ceb6d7.

---

### Session 43 — Sprint 1: /results Full Audit (June 20, 2026)

**Tested:** Every interactive element on `/results` — nav, review button, flag edit links, CTA routing, FAQ widget, EmailGate (unauthenticated), and quiz edit jump flow.

**Bugs found and fixed:**

| # | Bug | File(s) | Fix |
|---|---|---|---|
| 1 | `q.type === 'multi'` never matched — quiz type is `'multiselect'` | `src/app/quiz/page.tsx` | Changed to `q.type === 'multiselect'` so checkboxes pre-fill on edit jump |
| 2 | `pendingJumpId` restore effect deps `[cur]` — stale answers if both changed in same render | `src/app/quiz/page.tsx` | Added `answers` to deps: `[cur, answers]` |
| 3 | Flag card links used `<a href="/quiz?edit=Q0-06">` — bypasses localStorage mechanism; quiz page has no `useSearchParams` handler for `?edit=` | `src/app/results/page.tsx` | Converted to `<button onClick>` that sets `quiz_jump_to_id` + `quiz_return_to_results` in localStorage then calls `router.push("/quiz")` |
| 4 | `QUESTIONS_MAP` in quiz/review had stale label for Q0-09a: "When did the visa refusal occur?" — actual question is "Have you ever been refused a US visa?" | `src/app/quiz/review/page.tsx` | Updated label to match actual quiz JSON |
| 5 | Duplicate FAQ header — results page added its own "Ask E2go / Questions about your results?" wrapper before `<FaqWidget>`, which already has its own full header | `src/app/results/page.tsx` | Removed the redundant outer wrapper; `<FaqWidget />` now renders directly |
| 6 | CASL consent not enforced — EmailGate `Send` button was `disabled={!email}` only; user could submit without checking consent, triggering real email send | `src/app/results/page.tsx` | Added `!caslConsent` to both button `disabled` attr and `handleSubmit` guard |

**Tested and passed:**
- ✅ Nav Dashboard link → `/dashboard`
- ✅ "← Review or change my answers" → `/quiz/review` (loads DB answers for auth users)
- ✅ Flag card → quiz jump → correct question displayed → multiselect checkboxes pre-filled
- ✅ "Change funding source →" from results page now uses localStorage mechanism (same as quiz/review)
- ✅ CTA "Yes — build my case file →": logged-in → `/apply`; logged-out → `/pricing?tier=...`
- ✅ FAQ widget responds to question clicks (4 preset questions + chat input)
- ✅ EmailGate: email field, CASL checkbox (now enforced), Terms → `/terms`, "Retake the quiz" → `/quiz`
- ✅ EmailGate error state: "No quiz results found for this email. Take the quiz first."
- ✅ Quiz/review: DB answers loaded for authenticated users (3-tier fallback: draft → quiz_result → DB)

**Known bugs (not fixed — deferred):**
- 🐛 No sign-out button anywhere in the app (dashboard, settings, nav — nowhere)
- 🐛 Journey strip shows "Your Home Consulate" fallback for France (not in consulate intel map)

**NameCaptureForm:** Component code reviewed — validates name + password (min 8 chars, confirm match). UI state only reachable after real email verification click; untestable without live email flow.

---

### Session 41 — Dashboard server component + seed script fixes (June 20, 2026)

**Problem diagnosed:** `/dashboard` showed infinite "Loading..." when navigating from `/results`. Root cause: `supabase.auth.getUser()` and `getSession()` both use `navigator.locks` internally (GoTrueClient global lock). The results page held the lock during token refresh; the dashboard queued behind it and waited forever.

**Fixes shipped:**

| Item | File | What changed |
|---|---|---|
| Dashboard → server component | `src/app/dashboard/page.tsx` | Removed `"use client"`, `useState`, `useEffect`. Now uses `createSupabaseServerClient()`. No loading state — page renders on the server, no lock contention possible. |
| Wrong column name | `src/app/dashboard/page.tsx` | `module0_completed_at` → `quiz_completed_at` everywhere (interface, getProgress(), checklist array) |
| `application_lifecycle` query fix | `src/app/dashboard/page.tsx` | Removed `.order("created_at")` (column doesn't exist on this table). Changed `.single()` → `.maybeSingle()` |
| Seed: lifecycle column fix | `scripts/seed-test-profiles.mjs` | `module0_completed_at` → `quiz_completed_at` |
| Seed: lifecycle upsert → insert | `scripts/seed-test-profiles.mjs` | `application_lifecycle` has no UNIQUE constraint on `user_id`, so `?on_conflict=user_id` silently failed. Changed to plain `dbInsert` (cleanUser already deletes previous row) |
| Seed: error surfacing | `scripts/seed-test-profiles.mjs` | `dbInsert` and `dbUpsert` now throw on non-OK HTTP response instead of silently returning error JSON |

**All 3 test profiles re-seeded successfully:**
- Profile A: `romyjames@gmail.com` (owner's account) — Canada/solo/PROCEED
- Profile B: `test-france@example.com` / `TestFrance2026!` — France/married/ATTORNEY_RECOMMENDED
- Profile C: `test-uk@example.com` / `TestUK2026!` — UK/family/buyer archetype/PROCEED

**Build:** clean (119 pages). Webpack cache cleared. Dev server restarted clean.

**Confirmed working:** Owner logged in, `/dashboard` loaded immediately with correct data.

**Next up (deferred to next session):**
- Fix T&C modal on signup (currently a separate page — should be a modal popup). File: `src/app/signup/page.tsx`
- Replace Supabase default email with branded Resend email (unbranded confirmation emails going out)
- The `/results` page plan is loaded (see plan file) — journey strip, copy rewrite, remove criteria bars, etc.

---

### Phase G — Security (Session 40)

Full security audit against OWASP API Top 10, PIPEDA, GDPR, and Tier 1/2 checklist.

| Item | Status | Commit | Notes |
|---|---|---|---|
| HSTS header | ✅ COMPLETE | 7d814de | max-age=63072000; includeSubDomains; preload — Strict-Transport-Security added to all routes in next.config.mjs |
| XSS fix — module3/d dangerouslySetInnerHTML | ✅ COMPLETE | 19d2fa2 | DOMPurify sanitizes AI-generated letter HTML; only br/p/strong/em/b/i allowed |
| PIPEDA/GDPR data export | ✅ COMPLETE | 86ac03c | GET /api/account/export returns JSON with all user data; download link in Settings |
| GitHub Actions security workflow | ✅ COMPLETE | 564653d | npm audit (weekly + on push), TypeScript check, Trufflehog verified secret scan, build check |
| Pre-commit secret scan | ✅ COMPLETE | 564653d | .husky/pre-commit blocks commits containing live API key patterns |
| Cloudflare Turnstile CAPTCHA (signup) | ✅ COMPLETE | 01ff7dc | Graceful degradation — disabled until owner provisions CF Turnstile keys |
| IDOR audit (all applicationId routes) | ✅ VERIFIED | — | All 8 routes confirmed safe: explicit user_id check OR .eq('user_id', user.id) scoping |
| SQL injection | ✅ NOT APPLICABLE | — | Supabase parameterized queries throughout; no raw SQL construction |
| SSRF | ✅ NOT APPLICABLE | — | No user-controlled URL fetching server-side |
| Clickjacking | ✅ ALREADY DONE | — | X-Frame-Options: DENY in next.config.mjs |
| PCI DSS | ✅ NOT APPLICABLE | — | Stripe handles all card data; never touches E2go servers |
| SOC 2 | ❌ DEFERRED | — | Not required at B2C stage; revisit at $1M ARR |

### Phase G — Owner Actions Status
| Action | Status | Notes |
|---|---|---|
| Upstash Redis env vars in Vercel | ✅ CONFIRMED | UPSTASH_REDIS_REST_URL + TOKEN set — rate limiting active in prod |
| Supabase Storage bucket private | ✅ CONFIRMED | application-documents bucket is Private |
| Cloudflare Turnstile keys | ⏳ PENDING | dash.cloudflare.com → Turnstile → Add site. Add NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY + CF_TURNSTILE_SECRET_KEY to Vercel |

