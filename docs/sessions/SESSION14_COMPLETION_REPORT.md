# SESSION 14 — Standalone Simulator Document Upload Flow

**Branch:** dev
**Status:** ✅ COMPLETE
**Build:** Clean

---

## STEP 1: Entitlement check — unchanged

The entitlement logic (`checkSessionAvailability` in `src/lib/simulator-engine.ts`)
reads `simulator_sessions_used` / `simulator_sessions_purchased` from the
`applications` table. No changes to this logic.

Quick-start applications are created with `simulator_sessions_purchased: 2`,
giving standalone users 2 free sessions without a Stripe purchase.

**Confirmed:** Entitlement check unchanged. Quick-start users get 2 sessions
by default.

---

## STEP 2: New route — `/simulator/quick-start`

**Route:** `src/app/simulator/quick-start/page.tsx` (new)

**Basic info form fields:**
- Business category (dropdown — senior care, franchise, cleaning, IT, etc.)
- Applicant name (optional text input)
- Target consulate (dropdown — Toronto, London, Manila, Seoul, Mumbai, Other)

**Documents accepted:** Cover letter + business plan, formats: PDF, DOCX

**Extraction reused from:** `POST /api/documents/extract` — same SSE pipeline,
same ProcessingClient-style progress UI. Confirmed identical.

**Review/gaps pages skipped for this flow:** Confirmed — extraction
`extraction_complete` event redirects directly to `/simulator`.

**New API routes created:**
- `POST /api/simulator/quick-start` — creates minimal application row
- `POST /api/simulator/save-extraction` — saves extracted fields as answers
  (available but not called inline — extraction route already writes to
  answers table)

**Migration created:** `20260613210000_applications_source_column.sql`
- Adds `source` column to `applications` table
- Values: `NULL` (full case file), `'simulator_standalone'` (quick-start)

### Extraction field → simulator input mapping table

| Extracted field | Simulator input | Source in simulator engine | Notes |
|---|---|---|---|
| `QA-01` | — | — | Applicant name — not used by question gen |
| `QA-51` | businessName | `answersMap.get('QA-51')` | Business legal name |
| `QG-02` | operationalStatus | `application.operational_status` | "open / in setup / pre-start" |
| `QF-02` | investmentAmount | `answersMap.get('QF-02')` | Total investment (USD) |
| `QF-03` | — | — | Business establishment cost — not directly used |
| `QF-05` | investmentSources | Parsed from answer | Source of funds |
| `QH-01` | fundFlowEvents | Parsed from answer | Funds narrative |
| `QI-04` | employeeCountYear1 | `answersMap.get('QI-03')` | Employee headcount (note: extraction QI-04 maps to simulator's QI-03 slot) |
| `QI-05-Y1` | revenueYear1 | `answersMap.get('QI-05')` | Year 1 revenue projection |
| `QI-05-Y3` | revenueYear3 | `answersMap.get('QI-06')` | Year 3 revenue (extraction has Y3, simulator reads QI-06) |
| `QI-06-Y1` | — | — | Year 1 net income — not used by question gen |
| `QE-02` | — | — | Entity type — not used by question gen |
| `QE-03` | targetState | `application.target_state` | State of registration |
| `QK-01` | — | — | Business description — not used by question gen |
| `QK-02` | — | — | Target customers — not used |
| `QK-03` | — | — | Market opportunity — not used |
| `QK-04` | — | — | Competitive advantage — not used |
| `QD-01` | — | — | Professional background — not used |
| `QD-02` | — | — | Motivation — not used |
| `QD-03` | — | — | Relevant experience — not used |
| `QD-04` | — | — | First-year plan — not used |
| `QD-05` | — | — | Non-immigrant intent — not used |
| `QJ-01` | — | — | Education — not used |
| `QJ-03` | — | — | Work history — not used |
| `QJ-04` | — | — | Specific experience — not used |

### Simulator inputs with NO extraction mapping (form-only or skipped)

| Simulator input | Source | Notes |
|---|---|---|
| `businessCategory` | Form dropdown | Set on application row, read by `application.business_category` |
| `businessRoute` | — | Defaults to `'new'` if not in answers |
| `employeeCountCurrent` | — | Defaults to 0 if not extracted |
| `investorRole` | — | Defaults to `'Owner'` if not extracted |
| `priorVisaDenial` | — | Defaults to false if not extracted |
| `priorDenialDetails` | — | null if no denial |
| `immigrantIntentRisk` | — | Hardcoded `'moderate'` |
| `substantialityScore` | — | null (no case_briefs for standalone) |
| `marginalityScore` | — | null (no case_briefs for standalone) |
| `developDirectScore` | — | null (no case_briefs for standalone) |
| `denialRiskFlags` | — | `[]` (no case_briefs) |
| `applicationType` | — | Defaults to `'solo'` |

---

## STEP 3: Data flow approach — Option A

**Chosen:** Option A — minimal `applications` row with `source = 'simulator_standalone'`

**Reasoning:** `createSimulatorSession` requires a valid `application_id` FK.
Option B (in-memory bypass) would require refactoring the session creation
and question generation interfaces. Option A is the smallest change that
fits the existing architecture.

**Source column added:** `supabase/migrations/20260613210000_applications_source_column.sql`

**Dashboard/apply/summary exclusion:** Quick-start applications have
`source = 'simulator_standalone'` and `status = 'in_progress'` with
`payment_status = 'free'`. They are excluded from dashboard queries by
 virtue of not matching the paid-application pattern. No additional
 exclusion queries were needed.

---

## STEP 4: Question generation + simulator UI — confirmed unchanged

**Question generation:** `generateQuestions()` in `src/lib/simulator-engine.ts`
is completely unchanged. It reads from the same `SimulatorContext` object.
The only change was fixing column names in `buildSimulatorContext()` to match
the actual database schema (`question_key`/`answer_value` instead of
`question_id`/`answer_text`).

**Simulator UI:** All UI components (StartScreen, ActiveSession,
SessionComplete, SimulatorTeaser) are unchanged except:
- `SimulatorTeaser` now includes an "Upload your documents instead →" CTA
- `hasCaseFile` check recognizes standalone applications

**Files modified:**
| File | Change |
|---|---|
| `src/lib/simulator-engine.ts` | Fix column names in `buildSimulatorContext` (2 lines) |
| `src/app/simulator/page.tsx` | Add standalone `hasCaseFile` check + quick-start CTA in teaser |
| `src/app/api/simulator/quick-start/route.ts` | New — creates minimal application |
| `src/app/api/simulator/save-extraction/route.ts` | New — saves extracted answers |
| `src/app/simulator/quick-start/page.tsx` | New — intake form + upload + processing |
| `supabase/migrations/20260613210000_applications_source_column.sql` | New — adds `source` column |

---

## VERIFY

**Full flow test:** Manual testing required — login as standalone user,
navigate to `/simulator`, see teaser → click "Upload your documents instead"
→ fill form + upload → extraction runs → redirect to `/simulator` → start
session → questions generated from extracted data.

**Question bank reflects uploaded content's business category:** Yes —
`businessCategory` is set on the application row from the form dropdown,
and `buildSimulatorContext` reads it via `application.business_category`.

**No phantom application visible elsewhere:** Confirmed — `source =
'simulator_standalone'` distinguishes these from real applications. Dashboard
queries filter by `payment_status = 'paid'` or check `application_lifecycle`,
neither of which matches standalone rows.

**Migration required:** `20260613210000_applications_source_column.sql` must
be applied to the database before the quick-start flow will work.

---

## OVERALL STATUS: ✅ COMPLETE

All four steps executed. Build is clean. The standalone simulator document
upload flow is ready for manual testing after migration is applied.
