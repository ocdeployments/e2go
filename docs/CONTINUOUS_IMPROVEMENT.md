# E2go — Continuous Improvement Log

Track engine quality audits, scores, and priority gaps across sessions.
Reference this before any QA sprint or engine work.

---

## Site Architecture Audit — Session 36 continued (June 19, 2026)

**Scope:** All 70+ routes across 10 zones. Full page-by-page health check.

### Bugs fixed

| Bug | File | Fix |
|---|---|---|
| CTA → `/applications` (404) | `results/page.tsx:806` | Changed to `/apply` (logged-in) / `/signup` (guest) |
| "Talk to an attorney" button | `results/page.tsx:809` | Removed entirely |
| Layout 3-alignment-system | `results/page.tsx:597,677,816` | All sections now use same centred maxWidth wrapper |
| Dashboard shows raw email | `dashboard/page.tsx:10,189,192` | `full_name` → `first_name`; subtitle = static string |
| Module progress stuck at 0% | `quiz/page.tsx:496` | Changed to `upsert({ module0_completed_at })` |

### Page health by zone

| Zone | Health | Notes |
|---|---|---|
| Quiz funnel `/quiz → /results` | 9/10 | Healthy |
| Results page `/results` | 8/10 | Fixed this session |
| Simulator `/simulator/*` | 8/10 | Healthy |
| Case file `/apply/*` | 7.5/10 | business/investment/qualifications overlap with modules — audit needed |
| Dashboard `/dashboard` | 5.5/10 | Needs Command Centre upgrade |
| Navigation coherence | 6/10 | `/gap-analysis` missing from auth nav |
| FDD zone `/fdd/*` | 2/10 | Orphaned until Phase C ships |

### Open architecture issues (prioritised)

1. `/franchise` link in results Section 8 → 404. Fix: point to `/apply` until FDD ships
2. `/gap-analysis` not in authenticated nav → add to Nav.tsx
3. `/score` orphaned → redirect to `/results`
4. Dashboard missing profile snapshot + gap score card → Command Centre sprint needed
5. `apply/business`, `/investment`, `/qualifications` relationship to module pages unclear → audit

### Navigation target state

**Public nav:** How it works · Learn · Pricing · Simulator · Take the quiz

**Authenticated nav:** Dashboard · Case File · Gap Analysis · Simulator · Documents · (Settings in avatar menu)

### Dashboard → Command Centre spec

Add to dashboard (next sprint):
- Profile snapshot tile (net worth, archetype, industry, timeline from `case_profiles`)
- Gap Analysis score card (live from `case_profiles.completeness_score`)
- "Continue where you left off" deeplink into the correct module
- Eligibility score card linking back to `/results`
- Replace confusing 0% progress bar with a simple module checklist

---

## Audit #2 — Session 35 (June 19, 2026)

**Overall: 7.6 / 10** (+0.7 from baseline)
**Evaluator roles:** Immigration Attorney · Product Strategist

### Engine scores

| Engine | Score | Delta | Notes |
|---|---|---|---|
| Coaching report | 8.3 | +0.3 | max_tokens 6000; still no cross-session memory |
| Interview day | 8.1 | +0.3 | hasDocumentUploads queries DB now |
| Evaluate (live feedback) | 7.9 | +0.7 | max_tokens 700, severity, rolling window, score 1-10 |
| Simulator | 7.9 | +0.9 | archetype question pools; immigrantIntentRisk derived |
| Privacy & Trust | 7.5 | NEW | PT-1 deletion + PT-2 inline notices |
| Quiz | 7.7 | +0.5 | archetype-aware pools; rebuild trigger on complete |
| Case file | 7.4 | +1.2 | buildCaseProfile expanded; 5 rebuild triggers; completeness bar |
| CaseProfile layer | 7.2 | NEW | DataState, dimension scores, single source of truth |
| Gap analysis | 7.1 | +1.1 | ARCHETYPE_WEIGHTS in scoreCase(); franchise/pre-start override |
| Document generation | 6.6 | +0.3 | bracket regex improved; KB still not wired |

### Multi-perspective scores

**Immigration attorney lens**
- Denial risk accuracy: 8.1
- SOF evidence analysis: 7.4
- FDD / franchise signals: 4.5 ← critical gap
- Document gap precision: 7.0
- Investment substantiality: 6.8

**Product strategist lens**
- Conversion triggers: 7.8
- Upgrade loop design: 7.5
- Progress-to-outcome clarity: 7.2
- Data flywheel depth: 6.5
- Cross-module coherence: 7.6

**Visa counselor lens**
- Archetype relevance: 8.3
- Multi-turn case probing: 5.0 ← critical gap
- Guidance specificity: 7.2
- Cross-session memory: 3.0 ← critical gap
- Context persistence: 6.4

**Client experience lens**
- Trust & privacy signals: 8.0
- Progress transparency: 7.8
- Error recovery UX: 7.1
- Empty / loading states: 6.9
- Mobile fidelity: 6.4

### Gaps closed in Phase A + B (11 items)
- `immigrantIntentRisk` now derived — not hardcoded
- Evaluate: max_tokens 700, severity field, rolling window, score 1–10
- Coaching: max_tokens 6000 (was 4000)
- `hasDocumentUploads` queries DB (was hardcoded false)
- Bracket regex handles descriptive LLM labels
- `buildCaseProfile()` aggregates all data sources (EU-1)
- Archetype-aware weights in `scoreCase()` via `ARCHETYPE_WEIGHTS` (EU-3)
- Archetype-aware question pools + gap probes in interview-prep (EU-2)
- Profile rebuild fires at 5 trigger events — fire-and-forget (EU-4)
- Completeness bar + confidence tier labels on results page (EU-6)
- Data deletion (PT-1) + inline privacy notices (PT-2)

### Open gaps (9 items)
- Cross-session coaching memory — no prior session context in prompt
- Multi-turn probing — simulator still single-pass
- FDD intelligence — Phase C design-gated
- Knowledge base not wired into doc gen
- Live gap score recalculation — triggers on page load only
- Doc gen template variants — one template for all archetypes
- Quiz branch paths — linear, no conditional routing
- Adaptive interview difficulty — static
- Mobile viewport QA — unverified below 390px on all routes

### Priority action list (ranked by score impact)

1. **Wire KB into doc gen** — +1.4 pts; single afternoon; highest revenue impact
2. **Cross-session coaching memory** — +0.8 pts; pass last 2 session summaries from `simulator_sessions`
3. **Multi-turn probing in simulator** — +0.7 pts; probe-and-respond for answers scoring < 6
4. **Live gap score recalculation** — +0.5 pts; 30s polling or subscription after profile rebuild
5. **FDD intelligence (Phase C)** — +1.0 pts when built; unblocked by owner defining 40-field schema

### Verdict
Platform has moved from prototype (6.9) to defensible pre-launch product (7.6). Architecture is coherent: one source of truth (`buildCaseProfile`), archetype-aware scoring, privacy-complete, conversion-ready. Remaining gap cluster: cross-session intelligence, document quality, FDD blind spot. Reaching 8.5+ requires all three. Priority 1 (KB → doc gen) is a single afternoon of work with immediate revenue impact.

---

## Audit #1 — Session 26 (June 17, 2026)

**Overall: 6.9 / 10**

| Engine | Score |
|---|---|
| Coaching | 8.0 |
| Interview day | 7.8 |
| Evaluate | 7.2 |
| Quiz | 7.2 |
| Simulator | 7.0 |
| Doc gen | 6.3 |
| Case file | 6.2 |
| Gap analysis | 6.0 |

Key gaps at that time: `immigrantIntentRisk` hardcoded, evaluate max_tokens 400, hasDocumentUploads hardcoded false, no archetype awareness anywhere, no CaseProfile layer.
