# Case Intelligence Core (CIC) — The CPU — Design Plan

**Status:** CIC-0 + CIC-1 built (Session 92). Authored Session 91 (June 30, 2026) as design/pre-build; reframed from "Document Comprehension Engine" to the system brain at owner's direction. See `docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md` for build log.
**Hats worn (authoring this plan):** E-2 immigration strategist · AI systems architect (multi-agent orchestration) · LLM/RAG engineer · pragmatic shipping engineer.
**Hats worn (by the CPU itself, at runtime — Faculty 3 REASON, built Session 92):** the system does not reason as a generalist. `generateCaseTheory()` in `case-intelligence-core.ts` runs the model as a five-expert panel — senior immigration consultant · senior E-2 consular officer · senior immigration attorney · senior franchise development consultant · senior market analyst — synthesized into one Case Theory. Per owner's directive, this is what gives the reasoning intellect rather than data-comparison: each expert hat is required to propose creative, concrete, honest gap-fill suggestions for weak/missing dimensions (tagged by which hat proposed them), not just flag a status label.

---

## 0. The thesis

The comprehension layer should not stop at documents. The same faculty that reads a bank statement should read the **whole client** — quiz, intake answers, documents, voice sample, interview performance — ground itself in **our E-2 doctrine** (the 177-doc knowledge base), form a **case theory**, then **direct the other engines** and **verify they did the job** before it gives the go-ahead.

That is a CPU. The engines (gap analysis, generation, FDD, territory, simulator) are its peripherals. The document-comprehension work designed earlier becomes **one sensory channel** of Faculty 1 below.

The single property that separates this from "a fancier prompt" is the last one: **the CPU must be able to say NO** — to inspect an engine's output, find it doesn't satisfy the doctrine, and send it back. A brain that always approves is theater.

---

## 1. Anatomy — three faculties + a control loop

```
                     ┌───────────────────────────────────────────┐
                     │            CASE INTELLIGENCE CORE           │
   quiz_sessions ─┐  │                                             │
   answers ───────┤  │  F1 PERCEIVE ─► Case Model (unified)        │
   uploaded_docs ─┼─►│  F2 GROUND   ─► E-2 doctrine (RAG, 177 KB)  │
   followup ──────┤  │  F3 REASON   ─► Case Theory + Directives    │
   simulations ───┤  │                                             │
   case_briefs ───┘  │  LOOP: Orchestrate → Verify → Certify       │
                     └───────────────┬───────────────┬─────────────┘
                          directives │               │ verified?
                                     ▼               ▼
        ┌────────────┬───────────────┬───────────────┬──────────────┐
        ▼            ▼               ▼               ▼              ▼
   gap-analysis  generation       fdd-*          territory     simulator-prep
   (peripherals — the CPU tasks them and checks their work)
```

### Faculty 1 — PERCEIVE (comprehend everything)
Ingest every signal into one normalized **Case Model** (new table `case_model`, JSONB):
- `quiz_sessions` → eligibility, hard-stops, risk flags, archetype
- `answers` (M3-*) → intake facts
- `uploaded_documents.extracted_json` → **document claims** (the 3-stage doc engine: comprehend → reconcile → ledger; see §4). *Today nothing reads this column — the CPU is its first consumer.*
- `followup_responses` → voice + probed gaps
- `simulation_sessions` → interview delivery evidence (e.g. can the client articulate their own SoF?)
- `case_briefs` → substantiality / marginality scores

Output: a single structured understanding of **who this client is and where they stand today**, dimension by dimension, with provenance and confidence on every fact.

### Faculty 2 — GROUND (consult our doctrine)
The CPU reasons **with the law and our research**, not from generic training. RAG over the full KB corpus:
- Denial factors / D-codes (`E2_Answers_Part4_..._Denial.md`, gap-engine D-01–D-15)
- FAM substantiality & marginality standards (E2Pathway Vol3)
- Consulate-specific intelligence (`E2_Global_Consulate_Intelligence_*`)
- Transferable-skills → management/marginality framing (E2Pathway, E2_Answers Part2)
- Source-of-funds doctrine incl. crypto + registered accounts (`E2_crypto_source_Toronto.md`, `E2Pathway_RegisteredAccounts_SourceOfFunds.md`)
- Interview doctrine (`E2_Interview_Questions_Master_Bank.md`)

**Grounding gap to close:** only 33/177 docs are embedded today. The strategic subset above must be chunked + embedded so the CPU can actually retrieve doctrine on demand. This is a prerequisite, not an afterthought.

### Faculty 3 — REASON (form the case theory)
Given Case Model + retrieved doctrine, the CPU produces the **Case Theory** — the artifact a senior E-2 attorney would write before drafting anything:
- The strongest honest E-2 narrative available to this specific client
- Transferable skills mapped to the develop-and-direct / management argument
- Which numbers to foreground given which denial risks (e.g. lead with deployment-vs-Item-7 when marginality is the risk; lead with the liquidation trail when SoF is the risk)
- Per-dimension status: **proven / weak / missing / contradicted**
- A concrete **directive list** for the peripheral engines

### The control loop — ORCHESTRATE → VERIFY → CERTIFY
- **Orchestrate** — issue typed directives to engines: *"generate `source_of_funds` foregrounding the crypto-liquidation trail per crypto-Toronto doctrine; trace every dollar; rebut D-07."*
- **Verify** — after an engine runs, an LLM-as-critic pass grounded in the directive + doctrine inspects the output: *did the document actually trace every dollar? did it address D-07?* Pass / fail with reasons.
- **Certify** — only when all directives for a phase pass does the CPU mark it **ready** (the go-ahead). Failures route back to the engine with corrective feedback.

---

## 2. Hard boundaries (so the brain is trustworthy, not loose)

1. **Numbers stay deterministic.** Scores (gap, FDD, eligibility) and dollar figures remain pure-TS / extracted facts. The CPU reasons about **narrative and strategy**, never invents arithmetic. It may *select and frame* figures; it may not *compute or guess* them.
2. **Provenance on every claim.** Nothing enters the Case Model without a source (quiz / answer / document id / KB chunk). The verifier can always cite why.
3. **The verifier must be able to reject.** If it can't fail an output, it isn't a verifier. This is tested explicitly (feed it a deliberately weak document; it must catch it).
4. **Doctrine-grounded, not vibes.** Every strategic assertion in the Case Theory cites a KB chunk or a deterministic score. No ungrounded legal claims.
5. **Honest about gaps.** "Missing" and "contradicted" are first-class statuses. The CPU surfaces what the case *lacks*, not just what it has.

---

## 3. What the CPU changes downstream (the visible payoff)

| Consumer | Today | With the CPU |
|---|---|---|
| **Generation** (`generation-engine.ts:686`) | LLM writes the package from flat `module_3_answers`; ad-hoc context builders | One coherent doctrine-grounded **strategic brief** + documentary evidence injected; output is evidence-cited and risk-targeted, then **verified** before it's accepted |
| **Gap analysis** (`:773`) | Boolean evidence ("Bank statements uploaded") | Substantive, doc-derived evidence; CPU also tells it which denial codes this client actually faces |
| **FDD** | Two divergent extractions (80-field hub vs 50-field pipeline) | CPU reconciles to one truth and seeds the analysis |
| **Territory/Market** | Census ACS only | Doctrine + territory-doc + FDD Item 12/19 overlay |
| **Simulator prep** | Generic + FDD questions | Targeted at the client's *actual* weak dimensions from the Case Model |
| **Case readiness** | `completeness_score` from answered questions | Certified readiness from **evidenced + verified** dimensions — a real go-ahead |

---

## 4. The document channel (subsumed earlier design)

Faculty 1's document path is the 3-stage engine designed earlier, now feeding the Case Model rather than standing alone:
- **Comprehend** (per doc): memo + claims with E-2 significance. Model: `xiaomi/mimo-v2.5-pro` *(owner-confirmed)*.
- **Reconcile** (cross-doc): merge into ledger; resolve via existing `SOURCE_PRIORITY`; escalate only genuine conflicts. Conflicts are **non-blocking, flag-for-review** *(owner-confirmed)*.
- **FDD**: **auto-seed `fdd_analyses`** from comprehension *(owner-confirmed)* — kills the two-pipeline divergence.
- **Latent bug to fix in the same migration:** `uploaded_documents.doc_type` CHECK allows only 6 types; the 5 new Session-91 types fail on insert.

---

## 5. Data artifacts (new)

- `case_model` — one row per application. JSONB: per-dimension facts with provenance/confidence/status. Rebuilt fire-and-forget on signal change (new doc, new answers, sim session) — same trigger pattern as `buildCaseProfile`.
- `case_theory` — the strategic brief + directive list + per-phase certification state. The master context object injected into engines (replaces scattered builders).
- `document_intelligence` — the document ledger + memos (Faculty 1 doc channel).
- KB embeddings expanded to the strategic subset (§ Faculty 2).

---

## 6. The defining decision — orchestrator authority

How much real power does the control loop have? This determines whether this is genuinely a CPU or a very good context builder.

- **Advisory** — CPU produces the Case Theory + verifies, but findings are surfaced as recommendations; it cannot block or force re-runs.
- **Gating** — CPU's certification actually gates phases: generation won't finalize a document until the verifier passes it; "ready" is earned, not assumed. The brain can send work back automatically.

The owner's framing ("makes sure those tasks are actually done, then gives the go-ahead") points to **Gating** — but Gating is more build, more cost, and needs careful guards against loops. Decision required.

---

## 7. Staging (build it real, thin first — not a science project)

- **CIC-0 — Grounding prerequisite:** chunk + embed the strategic KB subset; extend `match_faq_kb` (or new `match_kb`) so the CPU can retrieve doctrine. *Without this the brain is blind.*
- **CIC-1 — Perceive + Reason (read-only brain):** build `case_model` + `case_theory` from existing signals incl. the document ledger. No orchestration yet — just produce the strategic brief and show it (e.g. on `/case-profile`). Proves the reasoning is good before wiring it to anything.
- **CIC-2 — First orchestration target (generation):** inject the Case Theory brief into generation; add the **Verify** pass on generated documents; prove the verifier can **reject** a weak draft and force a regen. This is the keystone — one real Orchestrate→Verify→Certify cycle end to end.
- **CIC-3 — Expand peripherals:** gap analysis, FDD seed, territory, simulator-prep directives.
- **CIC-4 — Certified readiness:** package-level go-ahead gating on `/documents`.

Each stage is independently shippable and independently provable.

---

## 8. Honest risks

1. **KB coverage** — brain quality is capped by retrievable doctrine; CIC-0 is non-negotiable.
2. **Cost/latency** — perceive→ground→reason→verify is many LLM calls. Mitigation: run at trigger points (not keystrokes), cache the Case Theory, use mimo-pro, deterministic scores stay TS.
3. **Verifier theater** — if it can't fail, it's worthless. Tested explicitly with a known-bad input.
4. **Scope creep** — the temptation is to build the whole brain at once. Discipline: CIC-1 (read-only) must prove reasoning quality before CIC-2 spends orchestration effort.
5. **Loop safety** — Gating mode needs a max-retry + escalate-to-human guard so a document can't bounce forever.

---

## 9. Decisions for the owner

1. **Orchestrator authority (§6):** Gating (real go-ahead, can block + force re-runs) vs. Advisory (recommends only). Owner framing implies Gating.
2. **KB grounding scope (CIC-0):** embed the full 177-doc corpus, or the strategic subset (denial / FAM / consulate / SoF / transferable-skills / interview) first?
3. **First build target:** CIC-0 + CIC-1 (grounding + read-only brain that outputs a visible Case Theory) before any orchestration — recommended — vs. push straight to CIC-2 generation wiring.
```
