# Sprint L — Simulator UX Completion + Interview Dossier Rebuild

**Written:** July 14, 2026 (Session 121). **Branch:** dev — never commit to main.
**Audience:** the next agent. This document is self-contained — you do not need the
originating conversation. Read this top to bottom before touching anything.

---

## 0. State of the tree when this was written

Uncommitted changes from TWO workstreams coexist on dev:

**Session 121 (this sprint's Phase L-1 — simulator UX, code COMPLETE, unverified in browser):**
- `src/types/simulator.ts`
- `src/lib/simulator-engine.ts`
- `src/components/simulator/ConversationalSession.tsx`
- `src/app/simulator/page.tsx`

**The other agent (One-Room Redesign, K-sprints — do NOT touch):**
- `src/app/api/case/completion/route.ts`
- `src/components/apply/DocumentImportHub.tsx`
- `src/components/casefile/CaseProfileNew.tsx`
- `src/lib/case-ranking.ts`, `src/lib/__tests__/case-ranking.test.ts`

`npm run build` was CLEAN with all of the above in the tree (verified July 14).
Commit the simulator files separately from the One-Room files — they are different
workstreams and per project rules unrelated changes are never bundled.

**Incident to know about:** during Session 121, two stray `next dev` processes
(PIDs since gone) were killed because they were corrupting `.next` and breaking
builds. One may have belonged to the other agent — if their dev server is missing,
that is why. `.next` was wiped and rebuilt clean afterward. Nothing else was touched.

---

## Sprint L-1 — Verify + commit the simulator UX fixes (code already written)

### What was built (all four of Romy's complaints, already in the tree)

1. **Identical questions every session** → `simulator-engine.ts` `generateQuestions()`:
   - Per-application phrasing memory in localStorage (`e2go-sim-last-questions-${applicationId}`);
     `pick()`/`sampleFresh()` avoid last session's exact phrasings via module-level `_avoidTexts`.
   - Topic rotation: one random non-core universal question (from UQ-02/05/06/07/08) is
     dropped each session; UQ-01/03/04/09 always stay.
   - Order shuffle: opener fixed, remaining questions shuffled.
2. **Stuck on mic error / no skip** → `ConversationalSession.tsx`:
   - Mic stream now persists across questions (`acquireStream()` reuses live tracks;
     old code re-ran getUserMedia per question — the root cause).
   - `stopRecording()` vs `teardownMic()` split; teardown only on exit/finish.
   - Every error state now has skip buttons ("Skip this question →",
     "Skip & finish session →", "Skip introduction →").
   - TTS watchdog `speakWithWatchdog()` (45s default) so a hung Groq TTS call can
     never freeze the session; transcription auto-retries once (800ms) before erroring.
   - `handleEndSession()`: ending early with ≥1 answer now scores the partial
     session instead of discarding it.
3. **No end-of-session analysis** →
   - `evaluate` API's 1-10 score now captured in both text and voice paths
     (`page.tsx` `evaluateAndComplete`), stored on `SessionQuestion.score`.
   - `generateCoachingSummary()` returns `overallScore` (0-100, average of per-answer
     scores ×10, rating-based fallback 80/45/25) + `questionBreakdown[]`.
   - `SessionComplete` renders a large color-coded overall score (green ≥75 /
     amber ≥55 / red) and an always-visible per-question breakdown
     (`QuestionBreakdownCard`: rating chip, 0-100 score, feedback, "Improve" line).
4. **Vague hints** → `buildCoachHint()` in the engine builds substantive hints from
   `interview-knowledge-base.ts` (what the officer tests + first 4 key principles),
   with per-category fallbacks; collapsible "Coach hint" panel in the question card.

### What YOU must do (L-1 tasks)

1. `npm run build` — must be clean before anything else.
2. Start the dev server via preview_start ("E2go Dev" in `.claude/launch.json`).
   If port 3000 is taken, check whether it's the other agent's server first.
3. Log in as `test-uk@example.com` / `TestUK2026!`. NOTE: a case brief now EXISTS
   for this account (Session 121 ran the real `/api/analysis/run` on application
   `a394ba10-bd20-4bc0-b9f0-de63ba931ae2`), so the simulator gate is open.
4. Verify in a TEXT-mode session (voice needs a mic the harness doesn't have):
   - Questions differ between two consecutive sessions (phrasing + order + one
     rotated topic). Check localStorage key above updates after each session.
   - Coach hint panel toggles and shows multi-line substantive guidance.
   - Answer 2-3 questions with real-ish text, finish → completion screen shows
     overall score /100 + per-question breakdown with scores and suggestions.
   - Partial session: answer 1 question then End session → it scores instead
     of discarding.
5. Voice path code-review sanity only (can't test mic in harness): confirm no
   `stopMic` references remain, `teardownMic` on unmount, watchdog wired.
6. Commit the four simulator files on dev (imperative message, one concern per
   commit — suggest: types+engine, ConversationalSession, page.tsx as 2-3 commits).
   Do NOT commit the other agent's files. Build clean before push.

---

## Sprint L-2 — Dossier accuracy: numbers computed in code, never by the LLM

**File:** `src/app/api/simulator/prep-kit/route.ts` (~784 lines).
**Why:** The generated dossier (see Romy's PDF example, scored 4.5/10) shows
$100,000–$150,000 on the "at a glance" card but $132,655 everywhere else, and a
Section 5 "breakdown" (franchise fee $55,200 → total $132,655) whose rows don't
sum — $77,455 unexplained. Every number is currently free-generated by one LLM
call with only a "do not invent facts" instruction. Romy's requirement: **figures
must be 100% accurate.**

Tasks:
1. Compute canonical figures server-side before the prompt: total investment,
   committed/deployed amount, per-source breakdown rows (from investment-source /
   fund-flow answers — same keys the simulator context builder uses in
   `simulator-engine.ts` / `case-profile.ts`), formatted as immutable strings
   (`$132,655`). If breakdown rows don't sum to the total, add an explicit
   "Other committed funds — $X" balancing row or omit the table.
2. Pass them into the prompt as a `VERIFIED FIGURES` block and instruct the LLM
   to use these strings verbatim and never compute or restate amounts.
3. Render Section 5's table and the "at a glance" Investment fact from the
   computed data directly (bypass the LLM JSON for these fields) — the LLM only
   writes surrounding prose.
4. Kill the quiz range: once an exact investment amount exists, the
   `investment_range` from quiz `result_json` (route.ts ~line 380) must never
   render. Exact figure wins everywhere.
5. Acceptance: regenerate the dossier for the UK test account; a script/grep of
   the JSON asserts one and only one distinct investment total appears across
   all sections, and breakdown rows sum to it.

## Sprint L-3 — Dossier voice, placeholders, and content hygiene

Same file, plus `src/app/simulator/prep-kit/page.tsx` (~1242 lines).

1. **First person throughout** (Romy's explicit requirement). The prompt (~line
   495) currently says second person — change to first person ("My business",
   "I have invested $132,655", "I own 50%"). Section titles become "My Candidate
   Snapshot", "My Case at a Glance", "My Numbers", "My Answers". Coaching asides
   (avoid-saying / pitfalls) stay imperative — that's a coach's margin note.
2. **Placeholder header fix.** route.ts lines 375-376 fall back to
   'the applicant' / 'the business' and that string becomes the PDF title block.
   Resolve the real names first (answers pool / case profile — the LLM output
   proves the business name exists in the data); if genuinely absent, render an
   action prompt ("Add your business name in your case file") — never the
   placeholder.
3. **Enum display labels.** `PROCEED_RISK` and `buyer` printed raw on the glance
   card. Map to display language or drop both facts from the client-facing card
   entirely (an officer never asks about quiz outcomes; recommend dropping).
4. **Ban internal field names.** Add prompt rule: never mention internal keys or
   data-structure terms. Post-generation sweep (regex over the JSON string):
   `semanticField|documentsOnFile|fullAnswerPool|M3-[A-Z]-\d|is null|is empty`
   → regenerate or strip offending strings.
5. **Never coach a false statement.** D-05 in the sample coached "I have a
   detailed business plan" while the facts said none is on file. Prompt rule +
   framing: when a gap exists, the bestShortAnswer must be honest ("My business
   plan is being finalised; here is what it covers…") and factsToKnow becomes a
   pre-interview action ("Upload/complete the business plan before interview").
6. **De-duplicate weak-point probes.** WP-02/03/04 render twice (Section 7 main
   list AND the probes block). Render each probe once, in the probes block only —
   fix in the prompt spec for section7 or filter in page.tsx.
7. **Null-data narration → action items.** "No ODE timeline or AUV data is
   available", "Simulator trend is empty", D-08's entire card about not having
   practiced: absence of data is either omitted or converted to one action line.
   Add a new top-of-dossier "Before your interview — critical gaps" panel
   (3-5 ranked actions: upload business plan, add revenue projections, run a
   practice session…). This is the single highest-value content addition.

## Sprint L-4 — Dossier look & feel (professional print output)

**File:** `src/app/simulator/prep-kit/page.tsx`.

1. `@media print` overhaul: cover page (client name, business, date, e2go
   wordmark, confidentiality line); `break-inside: avoid` on every card (cards
   currently split mid-answer); no accordion-forced page breaks (pages 2 and 9
   of the sample are ~80% empty); print in the Obsidian Gold accent system
   (gold section numerals/rules, red/amber left borders on risk cards) —
   currently the HIGH/MODERATE chips are the only non-grey ink in 15 pages.
2. Typographic hierarchy inside concern cards: "Best short answer" dominant
   (boxed, serif, larger — it's what the client memorizes); framework and
   avoid-saying subordinate.
3. Section 5 styled as a financial statement: right-aligned figures, subtotal
   rules, fund-flow rows with dates (data from L-2's computed breakdown).
4. Final page: a one-page cheat card — the memorized numbers, 3 hardest
   questions, document list — designed to print standalone for the waiting room.
5. Instruct users to print via the in-app Print button; suppress browser URL/
   timestamp chrome where possible. (Longer term: server-side PDF; out of scope
   for this sprint.)
6. Verify at 390px and 1280px on screen AND via print preview; regenerate the
   UK-account dossier and eyeball all pages.

---

## Order and rules

- L-1 first (verify + commit what's already written), then L-2 → L-3 → L-4.
- Model lock: simulator routes use xiaomi/mimo only (see memory/CLAUDE.md);
  prep-kit's existing model chain stays as-is unless broken.
- Never touch `src/app/onboarding/page.tsx` or the K-sprint files listed in §0.
- Build clean before every push; dev branch only; restart the dev server
  (preview_stop → preview_start) at session end.
