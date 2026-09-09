# One-Room Redesign — Master Implementation Plan (Sprints K-0 … K-5)

**Created:** July 14, 2026 (Session 120). **Status:** APPROVED PLAN — implementation not started.
**Owner:** Romy. **Executing agent:** whoever picks this up next — this document is self-contained.
**Visual reference (approved by owner):** https://claude.ai/code/artifact/83cdbf9c-ec05-44dd-97c7-8281203f4161
— before/after mockups of both pages, the data-flow map, and the phase plan this document operationalizes.

---

## 1. What this workstream is

The post-purchase experience is two disconnected rooms:

- **`/onboarding`** (Stripe success_url landing) opens on a consent form with five vendor
  opt-ins, collects well (consents → family → DS-160 → documents → next steps) but never
  triages, and its step-5 statuses go stale the moment a document is uploaded in step 4.
- **`/case-profile`** (the paid users' main page) renders ~92 hardcoded field notes
  ("Collects from Onboarding — Qualifications section", "Not yet a field in your schema"),
  fetches `case_code` but never renders it, shows stateless nav chips, and re-asks what
  uploads already answered.

Scores at plan time: onboarding 5/10, case profile 4/10. Target after K-5: 9+/10.

**The redesign contract — "one room, two chapters":**
1. One completion engine both pages read (field registry + `/api/case/completion`).
2. One card language (the `TriageSectionRow` idiom: label + description + status dot +
   n-of-m + provenance note) replacing `ControlPanel`'s stateless `TileChip`s.
3. One identity header (name + case code + progress + single next-best-action) on both pages.
4. Ask once: a fact collected anywhere is never re-asked anywhere. Every filled field knows
   its source (manual / document type / quiz overlay) and shows it.
5. Nothing hardcoded: every note, status, and ordering is computed from live data.

## 2. Non-negotiable constraints (read before writing any code)

- **`src/app/onboarding/page.tsx` is owned by another agent** with uncommitted changes in
  the working tree. DO NOT edit that file until the owner says that agent's work has landed.
  Sprint K-5 is blocked on this; K-0 through K-4 deliberately avoid the file entirely.
- The working tree also contains other pre-existing uncommitted changes. Never commit work
  you didn't write; commits only on the owner's explicit request. Branch `dev`, never `main`.
- `npm run build` and `tsc --noEmit` clean before every push.
- Design system is LOCKED: Obsidian Gold — bg `#0a0a0a`, accent `#C9A84C`, success
  `#4ADE80`, Cormorant Garamond display / DM Sans body. Tokens: `src/components/casefile/tokens.ts`.
  Read `docs/DESIGN_REFERENCE.html` before UI work.
- Category-based form layout — never one-question-at-a-time in Module 3.
- Files > 400 lines get split. No `any` types. Client-facing copy never uses developer
  vocabulary (schema, field, upsert, NULL…).
- Simulator LLM routes: only `xiaomi/mimo-v2.5` / `mimo-v2.5-pro`. No minimax anywhere.
- QA accounts: 3 seeded (Canada / France / UK). UK = partnership case
  (`test-uk@example.com`, principal + P2 co-investor "Alex Whitfield"). Reseed:
  `node scripts/seed-test-profiles.mjs`. Every sprint's acceptance runs against all three.
- Verify UI at 1280px AND 390px via the preview browser before calling anything done.

## 3. Research findings the plan is built on (verified in code, July 2026)

**The `answers` table is the app's nervous system.** Upsert key
`(application_id, question_key, family_member_id)`; 25+ consumers including
`generation-engine.ts`, `simulator-engine.ts`, `gap-analysis-enrichment.ts`,
`case-intelligence-core.ts`, `cic-package-manifest.ts`, prep-kit, market-analysis, renewal,
partner2 intake, followup, `case-profile.ts`.

**Provenance already exists but is unread.** Migration
`supabase/migrations/20260620000000_answers_source_update.sql` (applied) added
`answers.source_document_type TEXT` + `answers.confidence TEXT CHECK (high/medium/low)`.
`DocumentImportHub` writes them on every applied field. Today exactly ONE consumer reads
them (gap report). The case profile fakes provenance with hardcoded strings instead.

**Typed answers get no provenance.** `src/app/api/answers/route.ts` (~line 84) deliberately
omits the source columns ("require migrations… omit until applied") even though the
migration IS applied. Manual saves are provenance-blind until this is un-gated.

**Section completion engine exists but is siloed.**
`src/app/api/apply/section-completion/route.ts` counts answers by prefix —
story `[M3-S1-, M3-A-]`/5 · business `[M3-E-, M3-G-, M3-K-]`/6 · investment
`[M3-F-, M3-H-, M3-I-]`/4 · qualifications `[M3-Q-, M3-V-]`/4 · family `[M3-L-]`/3 ·
ties `[M3-T-]`/3 → `none|partial|complete`. Only onboarding step 5 consumes it.

**DocumentImportHub** (`src/components/apply/DocumentImportHub.tsx`, 1299 lines): 17 doc
types, per-person upload sections, `SOURCE_PRIORITY` map for document-vs-document conflicts
(passport beats resume on identity; signed agreement beats FDD), auto-creates
family_members stubs from passports/birth certs (spouse/child only — locked decision),
exposes `onFieldsApplied?: (count) => void` (wired to `reloadProfile()` on `/case-profile`,
NOT wired in onboarding), accepts `defaultOpen` prop.

**Quiz intelligence is mostly furniture.** `quiz_sessions.result_json` holds `country`,
`investment_range`, `business_type`, `franchise_interest`, `warnings`, `attorney_flags`,
`answers`. Read today only by: investment page prefill (`src/app/apply/investment/page.tsx`
~230–255, `QUIZ_MIDPOINTS`: 'Over $150,000'→175000 … 'Under $50,000'→35000, fills
`M3-F-02` with source `quiz`) and franchise pages. Onboarding reads only `application_type`.

**Two document tables are live.** `uploaded_documents` (13 consumers: generation-engine
exhibits, exhibit-registry, cic-package-manifest, comprehension engine…) vs legacy
`application_documents` (8 consumers: prep-kit, case-summary, documents routes,
`case-profile.ts`). Gap Report / Case File Summary only read one. This is the
document-pipeline divergence; K-4 closes it.

**`case_code` is VERIFIED to exist at application creation** — migration
`20260705000000_case_person_codes.sql` (collision-checked `generate_case_code()`, insert
trigger, backfill; confirmed applied in Session 119x). `/api/dashboard/case-profile`
already returns `app?.case_code`. The pages just never render it. No minting work needed.

**Middleware** (`src/middleware.ts`): `/onboarding` is in NEITHER `AUTH_ROUTES` nor
`PAID_ROUTES` — a paid page gated only by a client-side login redirect.

**Onboarding compliance bug:** consent_log insert uses hardcoded `ip_hash: 'local-hash'`.

## 4. Product decisions already made (do not re-litigate)

- **D-K1 — Quiz values are OVERLAID, never materialized.** The completion API surfaces quiz
  values virtually (source `quiz-overlay`, shown with an "eligibility check" chip and a
  one-tap **Confirm**). Only the confirmation writes an `answers` row. The generation
  engine must never see an unconfirmed quiz guess. (Exception: the existing `M3-F-02`
  investment-page prefill already writes source `quiz` — leave that behavior, it is an
  explicit user-facing prefill the client sees and edits.)
- **D-K2 — Precedence: manual > document > quiz-overlay.** A human's typed answer always
  wins. A newly extracted document value never overwrites a manual answer — it becomes a
  suggestion ("your bank statement says $92,300 — update?") surfaced in the drawer.
  Document-vs-document stays with `SOURCE_PRIORITY`.
- **D-K3 — Locked beats hidden.** A card whose feature isn't available renders in a locked
  state with its unlock condition ("Unlocks at 80% — you're 42% away"), never disappears
  (the bug class of commit b0219c9).
- **D-K4 — Cold-start next-best-action is "Your story."** Self-contained, unlocks the cover
  letter draft. Used whenever no signal (no uploads, no quiz-informed ordering) exists.
- **D-K5 — Referral opt-ins move out of the arrival step** and reappear contextually
  (banking when funds not yet in the U.S., franchise consultant when no business chosen).
  Rules computed in K-3, UI shipped in K-5. Same data collected, delivered when relevant.
- **D-K6 — Old case profile stays in-tree behind an env flag for one session** after K-2
  ships, for a one-line revert.

---

## SPRINT K-0 — Handoff note to the onboarding agent (do first, 10 minutes)

Two items live inside the file the other agent owns and shouldn't wait for K-5. Put a note
where that agent will see it (owner will relay; alternatively a `TODO(onboarding-agent):`
comment is NOT possible since we can't touch the file — so give the owner this text):

1. **Wire `onFieldsApplied`.** Step 4 renders
   `<DocumentImportHub applicationId={applicationId} defaultOpen />` without the
   `onFieldsApplied` callback, so step-5 statuses (fetched once at mount in `loadAll()`)
   are stale after uploads. Pass a callback that re-fetches
   `/api/apply/section-completion` (or after K-1, `/api/case/completion`) and show a toast:
   "Résumé applied — N fields filled".
2. **Fix `ip_hash: 'local-hash'`.** The consent_log insert records a hardcoded placeholder.
   Hash the real request IP (e.g. SHA-256 of IP + server salt, consistent with however
   other consent/audit rows do it). A compliance record must record the truth.

## SPRINT K-1 — Field Registry & Completion Engine (no file conflicts — start immediately)

**Goal:** one shared brain both chapters read. Pure additive: new files + one un-gating
edit. Zero UI change ships in this sprint.

### K-1.1 `src/lib/field-registry.ts` (new)
The single source of truth mapping every intake fact to where it lives and where it's
edited. Per entry: `questionKey`, `cardId`, `clientLabel` (human copy, never dev vocab),
`moduleHref` (deep link to the apply section that edits it), `required` (bool),
`perPerson` (bool — security/dependent keys), `askOnce: true` (constitutional default).
Cards (initial set): `investor_profile`, `business_details`, `investment_snapshot`,
`family_dependents`, `security_background` (per person), `story`, `qualifications`,
`ties`, plus tool cards `gap_analysis`, `market_analysis`, `fdd_review`, `simulator`,
`prep_kit`, `document_vault`, `generate_package`.
Seed the field lists from: the section-completion prefixes (§3), `ds160-question-sets.ts`,
the apply pages' cluster schemas, and `INTAKE_FIELD_MAP` in DocumentImportHub. Partnership:
registry must know which cards duplicate per person (`security_background`) and which
aggregate (`investor_profile` covers P1+P2 on `complete_partnership`).

### K-1.2 Registry drift test (new, e.g. `src/lib/__tests__/field-registry.test.ts`)
The registry is the new single point of failure — the day someone adds a question and
forgets the registry, every status silently lies (the 92-hardcoded-notes problem reborn).
Unit test: diff registry question keys against the exported question sets
(`ds160-question-sets.ts` exports; export key arrays from the apply cluster schemas if not
already exported) — fail on any key present in one and missing in the other. Wire into the
existing test run so the pre-push hook catches drift.

### K-1.3 `/api/case/completion` (new route, `src/app/api/case/completion/route.ts`)
Registry-driven engine. Merges, per application: `answers` (with `source_document_type` +
`confidence`), `uploaded_documents`, `family_members`, `applications`
(type/processing_path/case_code), `quiz_sessions.result_json` (overlay only, per D-K1).

Contract (summary shape — keep payload small; field lists are lazy, see K-1.4):
```
GET /api/case/completion?applicationId=…
{
  caseCode, applicationType, progressPct,          // one number, used by BOTH pages
  people: [{ id, name, role, personCode }],
  cards: { [cardId]: { state, have, needed, note, locked?: { reason } } },
       // state: locked | not_started | in_progress | ready | generated
       // note: computed provenance, e.g. "9 fields from your résumé" — NEVER hardcoded
  nextBestAction: { cardId, label, href, estimateMin, reason },
  ordering: [cardId…]                              // triage order (K-3 makes it smart)
}
```
Auth: validate session, scope by user (standing rule). Extend the prefix-count logic from
`section-completion` rather than reinventing; `section-completion` keeps working during
transition and is retired once both consumers have moved.
Performance: parallel queries; consider the Upstash pattern already used in middleware for
caching with invalidation on answer writes — but measure first, don't pre-optimize.

### K-1.4 Card detail (drawer) endpoint
`GET /api/case/completion?applicationId=…&card=investment_snapshot` →
`{ fields: [{ key, label, value, status: filled|needed|suggested, source, confidence, href }] }`
where `source` ∈ `manual | document:<doc_type> | quiz-overlay | quiz_confirmed`.
`suggested` carries D-K2 document-suggestion values that conflict with a manual answer.

### K-1.5 Un-gate provenance on manual writes
`src/app/api/answers/route.ts` (~line 84): the migration is applied — start writing
`source_document_type: 'manual'` (and leave confidence null) on every manual save. One-line
class of change; ship early so data accumulates provenance from now on.

### K-1.6 Shared primitives (new, `src/components/casefile/`)
`CaseHeader.tsx` (name, case code, package, people, progress, single next-best-action —
partnership variant shows both investors), `StatusChip.tsx` (5 states, colors from
tokens.ts, dot idiom from `TriageSectionRow`), `ProgressRing.tsx`. These are chapter-shared:
K-2 uses them on `/case-profile`, K-5 on `/onboarding`.

**Acceptance K-1:** API returns registry-driven statuses for all 3 QA accounts (UK
partnership must show per-person security counts and both investors); drift test green and
failing-when-sabotaged; `npm run build` + `tsc --noEmit` clean; no visible UI change.

## SPRINT K-2 — Case Profile Rebuild (chapter two)

**Goal:** `/case-profile` becomes a case file: passport header, stateful card grid,
click-to-populate drawer. All 92 hardcoded notes die.

- **K-2.1 Passport header** — render `CaseHeader` with `case_code` (finally), nationality,
  package, people on file, `ProgressRing`, single next-best-action CTA. Partnership: both
  investors named; NBA may point at P2's unfinished sections.
- **K-2.2 Card grid** — replace `ControlPanel`'s stateless `TileChip`s with registry-driven
  cards in categories (Case file / Case intelligence / Interview prep / Documents). Every
  card: StatusChip + n-of-m + computed provenance note. Documents category LOCKED not
  hidden when unavailable (D-K3). Delete the expanded-sections wall and its hardcoded
  strings. `CaseProfilePage.tsx` is 2,387 lines — split into <400-line files as you go.
- **K-2.3 Drawer** — click a card → lazy fetch K-1.4 detail. Filled rows show value +
  source chip (+ confidence for document sources). Needed rows: "Answer" (deep link via
  registry `moduleHref`) + "Upload a document instead" (opens DocumentImportHub scoped to
  the suggesting doc types — may need a small `initialDocType`/filter prop on the Hub;
  additive prop only, the Hub is shared). Quiz-overlay rows show **Confirm** which POSTs
  the answer with source `quiz_confirmed` (D-K1). `suggested` rows render the D-K2
  "document says X — update?" affordance.
- **K-2.4 Cold start + degradation** — at ~0%: NBA is "Your story" (D-K4), cards show
  honest not_started states, page must not look broken. If `/api/case/completion` errors:
  degrade to plain nav links (the current TileChip hrefs), never a blank page. Loading:
  skeleton cards.
- **K-2.5 Revert flag** — keep the old page component in-tree behind an env flag
  (e.g. `NEXT_PUBLIC_CASE_PROFILE_CLASSIC=1`) for one session (D-K6).
- **K-2.6 Live refresh** — the page's existing `onFieldsApplied → reloadProfile()` now
  also re-fetches completion, so an upload visibly moves card states and the ring.

**Acceptance K-2:** Preview-verified at 1280px and 390px on all 3 QA accounts (partnership
header variant explicitly screenshotted); zero developer vocabulary in rendered copy
(grep the rendered HTML for "schema"); drawer network requests fire only on open; cold
start + error degradation demonstrated (temporarily point at an empty seeded app / block
the API); build clean.

## SPRINT K-3 — Triage Intelligence (the shared brain gets opinions)

**Goal:** ordering and recommendations are computed, not hardcoded arrays.

- **K-3.1 Next-best-action ranking** in the completion engine: inputs = quiz profile
  (business_type, franchise_interest, investment_range, warnings, attorney_flags), upload
  provenance (what documents already answered), module dependency rules (e.g. business
  before gap analysis is useful; story unlocks cover letter draft), per-card remaining
  effort (needed − have). Output: `ordering` + `nextBestAction` with a human `reason`.
  Cold-start rule D-K4 lives here.
- **K-3.2 Doc-type suggestion ordering** — franchise cases lead with FDD; acquisition
  cases with acquisition financials; solo-new-business with business plan + bank records.
  Exposed from the engine; consumed by the Hub via an optional prop (ordering only — the
  17 types stay available). Case profile drawer uses it immediately; onboarding step 4
  adopts it in K-5.
- **K-3.3 Contextual referral rules** — compute (do not render yet, UI is K-5/D-K5):
  banking referral when source-of-funds answers indicate funds abroad; franchise consultant
  when franchise_interest and no FDD uploaded; accountant when departure-tax signals.
  Return as `contextualOffers: [{ id, when, copy }]` from the completion API.

**Acceptance K-3:** the 3 QA accounts produce three visibly different orderings that match
their quiz profiles; unit tests on the ranking function with fixture profiles.

## SPRINT K-4 — De-silo Wiring (close the broken pipes)

- **K-4.1 Retire legacy `application_documents` reads, route by route** — repoint prep-kit,
  case-summary, documents routes, and `case-profile.ts` to `uploaded_documents`. Verify
  each consumer's field expectations (shape differs — map explicitly, don't cast). After
  this: grep to confirm no read paths remain on the legacy table (writes/history can stay
  until a separate migration decision by owner).
- **K-4.2 Widen prep-kit `case_theory` select** to include `narrative` +
  `numbers_strategy` (currently dropped).
- **K-4.3 Middleware-gate `/onboarding`** — add to `PAID_ROUTES` in `src/middleware.ts`
  (and matcher config) **with a grace path**: Stripe redirects to
  `/onboarding?payment=success&session_id=…` potentially BEFORE the webhook marks the
  account paid. Honor a valid checkout `session_id` param (or allow a short retry window
  on unpaid) so the paying client is never bounced at the door. Test the race deliberately:
  hit the URL with paid-flag unset.
- **K-4.4 Funnel events** — instrument: arrival→handoff completion rate, upload rate
  during onboarding, time-to-80% completion. Check first whether an events/lifecycle
  mechanism fits (`application_lifecycle` exists; also check for any analytics util) —
  reuse before adding a table. Purpose: prove the redesign moves behavior, not just renders.
- **K-4.5 Verify `application_lifecycle` consumers** (email sequences etc.) before K-5
  changes step semantics — list consumers in the K-4 session notes for K-5's executor.

**Acceptance K-4:** upload a document on `/case-profile` (UK account) → prep kit and case
summary reflect it; zero remaining legacy-table read paths in the repointed routes;
middleware race test passes both ways (paid user enters; unpaid non-customer blocked);
build clean.

## SPRINT K-5 — Onboarding Chapter One (BLOCKED until the other agent's work lands)

**Precondition:** owner confirms the other agent's onboarding changes are merged. Rebase
mentally: re-read `src/app/onboarding/page.tsx` first — it WILL have changed since this plan.

- **K-5.1 Arrival moment** — green "Payment received" chip, `CaseHeader` with case code
  ("Your case file is open, [name]" + "CASE [code] · [package] · opened [date]"), 3-step
  journey preview with honest time estimate, consent trimmed to ToS/Privacy + marketing
  opt-in. Referral opt-ins REMOVED from step 1 (D-K5).
- **K-5.2 Contextual referrals** — render K-3.3 `contextualOffers` at their computed
  moments (e.g. banking offer inside the investment handoff row, franchise consultant in
  the evidence step when relevant). Same `referral_consents` writes as today.
- **K-5.3 Evidence step payoff** — wire `onFieldsApplied` (if K-0 didn't already):
  re-fetch completion, toast "Résumé applied — N fields filled · Qualifications now X%".
  Doc-type chips ordered by K-3.2.
- **K-5.4 Triage handoff** — step 5 rows read `/api/case/completion`: computed `ordering`,
  progress bars, provenance chips, "Start here" badge on NBA, closing CTA "Open your case
  file — [case code] →". `TriageSectionRow` gains progress + source-chip props (additive).
- **K-5.5 ip_hash fix** if K-0 didn't land it.
- **K-5.6 Full-journey verification** — seeded account walkthrough: payment → arrival →
  people → statements → upload résumé → watch handoff reorder → open case profile → same
  header, same progress number. Both viewports. All 3 QA accounts. Build clean.

**Acceptance K-5:** the walkthrough above, plus: no vendor opt-in before value delivery;
consent still writes all rows it writes today (consent_log with REAL ip_hash,
profiles.casl_marketing_consent, referral_consents from contextual moments,
applications.application_type/processing_path/module_1_complete, application_lifecycle).

---

## 5. Sequencing, effort, and status ledger

| Sprint | Depends on | Touches onboarding page? | Est. sessions | Status |
|---|---|---|---|---|
| K-0 note | — | no (note to owner/agent) | 0.1 | ⏳ NOT STARTED |
| K-1 engine | — | no | 1–1.5 | ⏳ NOT STARTED |
| K-2 case profile | K-1 | no | 1.5–2 | ⏳ NOT STARTED |
| K-3 triage | K-1 | no | 0.5–1 | ⏳ NOT STARTED |
| K-4 de-silo | none (parallel-safe) | no | 1 | ⏳ NOT STARTED |
| K-5 onboarding | K-1, K-3 + other agent lands | YES | 1–1.5 | 🔒 BLOCKED |

Update this table + BUILD_TRACKER.md at the end of every session. Score trajectory:
K-1+K-2 → 7/10 · K-3+K-4 → 9/10 · K-5 → 9.5/10.

## 6. Known artifact/visual debts (cosmetic, fold in whenever touching the artifact)

The approved visual artifact has: locked cards misaligning vertically next to taller
neighbors (Documents/Interview-prep grids — same bottom, different top; one-line CSS fix),
score-strip awkward wrap at 700–900px, and two missing mockups worth adding when convenient:
the cold-start case profile (~5%, D-K4) and the partnership header variant (K-2.1).
Artifact source: this session's scratchpad `one-room-redesign.html`; republish against the
same URL via the Artifact `url` parameter.

## 7. Open items deliberately NOT in scope

- Stripe/pricing/packaging: PARKED — do not raise until Romy initiates (standing rule).
- D6 consent surfaces (signup + terms-update UI) — separate workstream.
- Legacy `application_documents` write-path removal/table drop — owner decision later.
- D5 outcome survey questions — needs Romy's domain input.
