# FDD Intelligence — Comprehensive Build Plan
**Version:** 1.0 — June 20, 2026
**Scope:** Multi-FDD Comparison, Gap Fills, Standalone User Path, Google Places Placeholder
**Prerequisite:** FDD_INTELLIGENCE_PLAN.md (Parts 1–10) is the source of truth for the existing single-FDD pipeline
**Branch target:** dev → PR to main after each sprint

---

## ORIENTATION: WHAT EXISTS AND WHAT'S MISSING

### ✅ Already Built (FDD-1 through FDD-5)

| Stage | Route | API | Status | Notes |
|---|---|---|---|---|
| Upload + SSE Extraction | `/fdd/upload` | `/api/fdd/upload`, `/api/fdd/extract` | ✅ | 50-field schema, streaming progress |
| Review (raw fields) | `/fdd/review/[fddId]` | — | ✅ | Confidence badges, source quotes |
| E-2 Score | `/fdd/score/[fddId]` | `/api/fdd/score` | ✅ | 4 dimensions (Profile Match missing) |
| Territory Analysis | `/fdd/territory/[fddId]` | `/api/fdd/territory` | ✅ | Census ACS only, Places hook returns null |
| Questions Generator | `/fdd/questions/[fddId]` | `/api/fdd/questions` | ✅ | Flag-triggered, ask-of routing |
| Final Report | `/fdd/report/[fddId]` | — | ⚠️ | hasAccess hardcoded true, no write-back |
| FDD Index | `/fdd` | — | ✅ | Lists all analyses, routes to pipeline stage |

### ❌ Gaps in Existing Pipeline

| Gap | File | Issue |
|---|---|---|
| Profile Match (Dim 5) | `fdd-scoring-engine.ts`, score page | 5th dimension designed in plan, never implemented |
| FDD → Application write-back | Report page | "Import to case file" button missing; double-entry required |
| Generation Engine injection | `generation-engine.ts` | [FDD_CONTEXT] hook designed but never added to prompts |
| Paywall | `fdd/report/[fddId]/page.tsx:317` | `const [hasAccess] = useState(true)` — everyone gets free full report |
| Comparison feature | — | Routes, DB table, engine, and UI all missing |
| Standalone user path | — | Requires full quiz; no lightweight intake; no `/fdd/start` landing |
| Google Places | `fdd-territory-engine.ts` | Returns null, census only — placeholder stub needed |

### 🆕 Net-New Features This Plan Covers

1. **Multi-FDD Comparison** — up to 5 FDDs, side-by-side table + AI narrative + ranked recommendation
2. **Profile Match Engine** — 5th E-2 scoring dimension (capital fit, experience, operations, timeline)
3. **FDD → Application write-back** — one-click import of 8 FDD fields into the case file
4. **Generation Engine [FDD_CONTEXT]** — FDD data feeds business plan sections 3–6
5. **Standalone user path** — lightweight intake, no quiz required, conversion CTA to full E2go
6. **Google Places placeholder** — feature-flagged stub, Census remains primary
7. **Paywall enforcement** — `hasAccess` wired to real access check (pricing TBD)

---

## THE TWO USER TYPES

### Type A — E2go Applicant
Has completed the quiz. Has an `applications` record. Analyzed an FDD given to them by a franchisee.

**Their journey:**
1. Gets an FDD from a franchise brand they're interested in
2. Navigates to `/fdd` from their dashboard
3. Uploads the FDD, links it to their open application
4. Gets the full 6-stage analysis (score includes their CaseProfile for Profile Match)
5. Clicks "Import to case file" → FDD fields auto-populate Module 3 business questions
6. Their generation engine now uses [FDD_CONTEXT] in business plan sections
7. Can compare this FDD against others before committing

**What makes this powerful:** FDD data eliminates double-entry. The generation engine writes a real business plan because it has Item 19 AUVs, actual fee structure, real territory data — not the user's estimates.

### Type B — Standalone FDD Buyer
Has nothing to do with E-2 visas. Wants to analyze 1–5 FDDs for a franchise investment decision.

**Their journey:**
1. Lands on `/fdd/start` (separate marketing entry point)
2. Creates E2go account (or logs in)
3. Completes a 5-field lightweight profile (capital, state, experience, industry, timeline)
4. Uploads their FDDs
5. Gets analysis for each + multi-FDD comparison
6. At report completion: sees conversion CTA → "Turn this into an E-2 visa application"

**What makes this powerful:** Full FDD intelligence, standalone. No immigration context required. But when they decide to pursue E-2, their data carries over seamlessly.

---

## DESIGN DIRECTION

### Visual references (from Lazyweb research)

| Reference | What to steal |
|---|---|
| Yahoo Finance `/compare` | Side-by-side table: sticky first column, color-coded cells (best/worst/middle), grouped rows |
| ComplyAdvantage | Dark risk intelligence dashboard: gold CTAs on near-black, data-dense cards |
| Smyte comparison | VS layout pattern: two columns with clear winner indicators |
| re-cap investor dashboard | Upload → analysis flow, dark metrics cards, "Upload or start from scratch" CTA |

### Rules for the comparison UI

- **Obsidian Gold system throughout:** `#0a0a0a` background, `#C9A84C` accent, Cormorant Garamond for franchise names/scores (weights 300/400/500 ONLY), DM Sans for all data
- **Winner column always gold-accented:** left border `border-[#C9A84C]` + `bg-[#C9A84C]/5` background
- **No border-radius on the comparison table** — zero-radius cells feel like a financial terminal
- **Cell coloring:** `text-emerald-400` for best in row, `text-red-400` for worst, `text-white/60` for middle
- **Cormorant for franchise names at display size** (2xl–3xl), DM Sans for metric labels and numbers
- **The recommendation banner is gold** — full-width, `bg-[#C9A84C]`, `text-[#0a0a0a]`

---

## DATABASE CHANGES

### Table: `fdd_comparisons` (new)

```sql
-- Migration: docs/migrations/0052_fdd_comparisons.sql

CREATE TABLE IF NOT EXISTS fdd_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  name TEXT, -- user-given name, e.g. "Austin TX — QSR options"
  target_city TEXT,
  target_state TEXT,
  target_zip TEXT,

  -- Array of 2–5 fdd_analyses IDs
  fdd_analysis_ids UUID[] NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),

  comparison_output JSONB, -- populated when status = 'complete'
  error_message TEXT       -- populated when status = 'failed'
);

CREATE INDEX idx_fdd_comparisons_user ON fdd_comparisons(user_id, created_at DESC);

ALTER TABLE fdd_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fdd_comparisons_owner"
  ON fdd_comparisons FOR ALL
  USING (user_id = auth.uid());
```

### Column: `profiles.standalone_profile` (new)

```sql
-- Lightweight investor profile for Type B users who have no application record
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS standalone_profile JSONB;

-- Shape: {
--   liquid_capital: number,       -- e.g. 250000
--   target_states: string[],      -- e.g. ['TX', 'FL']
--   prior_business_owner: boolean,
--   industry_background: string,  -- 1–2 sentences free text
--   investment_timeline: 'within_3mo' | '3_6mo' | '6_12mo' | 'exploring',
--   created_at: string
-- }
```

### Column: `fdd_analyses.access_granted` (new)

```sql
-- Paywall gate. Until pricing is decided: default true for first analysis, false for subsequent.
-- When Stripe is wired: set true after payment.
ALTER TABLE fdd_analyses
  ADD COLUMN IF NOT EXISTS access_granted BOOLEAN NOT NULL DEFAULT false;

-- Temporary: grant access to user's first analysis automatically
-- (backfill + trigger logic — see Sprint FDD-G3)
```

---

## COMPARISON OUTPUT SCHEMA

The `comparison_output` JSONB field stores the complete comparison result.

```typescript
interface ComparisonOutput {
  recommendation: {
    winner_fdd_id: string;
    winner_franchise_name: string;
    reasoning: string;              // 3–4 sentences, investment advisor voice
    confidence: 'decisive' | 'moderate' | 'close_call';
    for_e2_visa: boolean;           // is the winner specifically strong for E-2?
    caveat?: string;                // e.g. "Territory data was limited for TX"
  };

  ranking: Array<{
    rank: number;
    fdd_id: string;
    franchise_name: string;
    composite_score: number;        // 0–100, weighted average across all dimensions
    e2_overall: 'STRONG' | 'VIABLE' | 'CAUTION' | 'INELIGIBLE';
    territory_overall: 'STRONG' | 'VIABLE' | 'MARGINAL' | 'WEAK';
    profile_match_score: number | null;
    ode_mid: number | null;         // Owner Discretionary Earnings, central estimate
    top_strength: string;           // 1 sentence
    top_risk: string;               // 1 sentence
    verdict_label: 'Top Choice' | 'Strong Runner-Up' | 'Consider If' | 'Avoid';
  }>;

  comparison_table: Array<{
    metric_label: string;
    group: 'investment' | 'fees' | 'financial' | 'operations' | 'e2_viability' | 'exit';
    values: Record<string, {        // key = fdd_id
      display: string;              // formatted for UI
      raw: number | string | null;
      winner: boolean;              // true if this cell wins the row
      worst: boolean;               // true if this cell is worst in row
    }>;
  }>;

  narrative: string;                // 6–8 sentences, comparative analysis
  generated_at: string;             // ISO timestamp
}
```

### Composite score formula

```
composite = (
  e2_score_pct × 0.35     +   // E-2 compatibility (most important for our users)
  ode_score_pct × 0.25    +   // Earnings potential
  territory_score × 0.20  +   // Market viability
  profile_match × 0.10    +   // Investor-franchise fit
  risk_inverse × 0.10         // 100 - (flag_count × 5), floored at 0
)
```

Where `e2_score_pct`: STRONG=100, VIABLE=75, CAUTION=40, INELIGIBLE=0.

### Comparison table row groups

**INVESTMENT:**
- Initial Franchise Fee
- Total Investment (range)
- Working Capital Covered (months)

**FEE BURDEN:**
- Royalty Rate
- Marketing Fund
- Technology/Other Fees
- Total Ongoing Burden (calculated: royalty + marketing + tech)

**FINANCIAL PERFORMANCE:**
- Item 19 AUV (or "Not Disclosed")
- Estimated ODE (mid scenario)
- System Churn Rate
- Franchisor Audit Opinion

**E-2 VIABILITY:**
- Overall E-2 Score
- Investment Substantiality
- Non-Marginality (ODE vs. living expenses)
- Develop & Direct compliance
- Risk Flag Count

**OPERATIONS:**
- Time to Open (months)
- Training Hours
- Typical Staff (Day 1)
- Territory Type

**EXIT:**
- Initial Term
- Renewal on Current Terms
- Transfer to Entity Allowed
- Non-Compete (years / miles)

---

## SPRINT PLAN

### Sprint FDD-G1 — Profile Match Engine
**Duration:** 1.5 days
**Delivers:** 5th scoring dimension on the score page and final report

**Files to create:**
- `src/lib/fdd-profile-match-engine.ts`

**Files to modify:**
- `src/app/api/fdd/score/route.ts` — run profile match after E-2 scoring; persist to `fdd_analyses.profile_match`
- `src/app/fdd/score/[fddId]/page.tsx` — add Profile Match dimension card below existing 4
- `src/app/fdd/report/[fddId]/page.tsx` — add Profile Match section to FullReport

**Profile match engine inputs:**
```typescript
interface ProfileMatchInput {
  // From fdd_analysis record
  investor_liquid_capital: number | null;
  investor_net_worth: number | null;
  // From extracted_fields
  total_investment_min: number | null;
  total_investment_max: number | null;
  investor_hours_per_week: number | null; // extracted from FDD Item 11
  typical_time_to_open_months: number | null;
  // From CaseProfile (if application_id exists — null for standalone)
  case_prior_business: boolean | null;  // from answers M0-E-04 or equivalent
  case_industry: string | null;         // from answers M1-B-01 or equivalent
  case_hours_available: number | null;  // from answers
}
```

**Profile match dimensions (4 sub-scores, each 0–100):**

| Dimension | PASS | WARN | FAIL |
|---|---|---|---|
| Capital Fit | Liquid capital ≥ investment max | Liquid capital ≥ investment min | Liquid capital < investment min |
| Experience Fit | Prior business owner OR relevant industry | Adjacent industry | No business experience, unrelated |
| Operational Fit | Investor hours available ≥ FDD requirement | Within 10 hrs/wk | Below FDD requirement |
| Timeline Fit | Time to open ≤ investor's target | Time to open ≤ target + 3mo | Time to open > target + 3mo |

**Output shape:**
```typescript
interface ProfileMatchResult {
  score: number;                      // 0–100, weighted average
  rating: 'STRONG_FIT' | 'GOOD_FIT' | 'STRETCH' | 'POOR_FIT';
  dimensions: {
    capital_fit: { score: number; note: string };
    experience_fit: { score: number; note: string };
    operational_fit: { score: number; note: string };
    timeline_fit: { score: number; note: string };
  };
  gaps: Array<{ area: string; issue: string; recommendation: string }>;
  narrative: string;                  // 2–3 sentences
  data_limited: boolean;              // true if CaseProfile unavailable
}
```

**Acceptance criteria:**
- Profile match card appears on score page, styled identically to existing dimension cards
- If CaseProfile is unavailable (standalone user), score runs on FDD data only with a note
- Score is persisted to `fdd_analyses.profile_match` column
- Profile match appears as a section in the final report

---

### Sprint FDD-G2 — Write-back + Generation Integration
**Duration:** 1 day
**Delivers:** "Import to case file" button on report page; [FDD_CONTEXT] in generation engine

**Files to create:**
- `src/app/api/fdd/[fddId]/writeback/route.ts`

**Files to modify:**
- `src/app/fdd/report/[fddId]/page.tsx` — add ImportButton component + call to writeback API
- `src/lib/generation-engine.ts` — add [FDD_CONTEXT] injection to business plan prompts

**Write-back fields (8 answers written to `answers` table):**

| Answer key | Source in extracted_fields | Notes |
|---|---|---|
| `fdd_franchise_name` | `franchisor_legal_name.value` | New dedicated key namespace |
| `fdd_initial_fee` | `initial_franchise_fee.value` | Formatted as integer |
| `fdd_total_investment_min` | `total_investment_min.value` | |
| `fdd_total_investment_max` | `total_investment_max.value` | |
| `fdd_auv` | `item19_auv.value` | null if Item 19 not present |
| `fdd_royalty_rate` | `royalty_rate_pct.value` | |
| `fdd_initial_term` | `initial_term_years.value` | |
| `fdd_typical_employees` | `typical_fte_employees.value` | |

Write-back route: `POST /api/fdd/[fddId]/writeback`
- Reads `fdd_analyses` record by fddId (auth check: user_id must match)
- Upserts 8 answer rows to `answers` table with `application_id` from the analysis
- Returns `{ imported: 8, application_id: string }`

**[FDD_CONTEXT] injection in generation engine:**
- Check if `answers` table has any `fdd_*` keys for this application
- If yes, build a FDD_CONTEXT block and inject it into prompts for docs 3–6:
  ```
  [FDD_CONTEXT]
  Franchise: {fdd_franchise_name}
  Total Investment: ${fdd_total_investment_min}–${fdd_total_investment_max}
  Initial Fee: ${fdd_initial_fee}
  Royalty: {fdd_royalty_rate}%
  Average Unit Volume (Item 19): ${fdd_auv}
  Typical Staff: {fdd_typical_employees} FTE
  Initial Term: {fdd_initial_term} years
  [/FDD_CONTEXT]
  Use these figures as the basis for all financial projections. Do not use generic estimates.
  ```

**Acceptance criteria:**
- "Import to case file" button appears on report page only when `application_id` is not null
- On click: shows loading state, success toast, and button changes to "✓ Imported"
- Import is idempotent (upsert, not insert)
- Generation engine uses FDD figures when available; falls back gracefully when not

---

### Sprint FDD-G3 — Paywall Enforcement
**Duration:** 0.5 days
**Delivers:** Real access gate on report page; auto-grant for first analysis

**Files to modify:**
- `src/app/fdd/report/[fddId]/page.tsx` — replace `useState(true)` with real access check
- `src/app/api/fdd/report/route.ts` (create if not exists) — access check endpoint

**Access check logic (until Stripe is wired):**
```
1. Does this user have a subscription that includes FDD Intelligence? → grant
2. Is this their first fdd_analysis? → grant (first one free)
3. Has this specific fdd_analysis.access_granted = true? → grant
4. Otherwise → show FreeTeaser (paywall)
```

The `FreeTeaser` component already exists in the report page. The paywall content shown:
- E-2 compatibility rating (STRONG/VIABLE/CAUTION/INELIGIBLE) — shown blurred
- 3 of the key metrics (investment, royalty, AUV) — shown as teaser
- Flag count — shown ("4 risk flags identified")
- 3 sample questions from the question bank — shown
- CTA: "Unlock Full Report — [Pricing TBD]"

**Acceptance criteria:**
- First FDD analysis for any user: access granted automatically
- Second+ analyses: paywall shown (FreeTeaser)
- Pricing CTA links to `/pricing` with `?intent=fdd` query param for tracking

---

### Sprint FDD-C1 — Comparison Database Migration
**Duration:** 0.5 days
**Delivers:** `fdd_comparisons` table + `profiles.standalone_profile` + `fdd_analyses.access_granted`

**File to create:**
- `docs/migrations/0052_fdd_comparisons.sql` — idempotent, uses IF NOT EXISTS

Run against Supabase using the SQL editor or supabase CLI.

**Acceptance criteria:**
- `fdd_comparisons` table exists with correct columns and RLS
- `profiles.standalone_profile` column exists
- `fdd_analyses.access_granted` column exists, backfilled:
  - Each user's earliest `fdd_analysis` (by `created_at`) → `access_granted = true`

---

### Sprint FDD-C2 — Comparison API Routes
**Duration:** 1.5 days
**Delivers:** API routes for creating, polling, and generating comparison narrative

**Files to create:**
- `src/app/api/fdd/compare/route.ts` — POST (create), GET (list user's comparisons)
- `src/app/api/fdd/compare/[comparisonId]/route.ts` — GET (status + result)
- `src/app/api/fdd/compare/[comparisonId]/narrative/route.ts` — POST (trigger AI narrative)
- `src/lib/fdd-comparison-engine.ts` — builds ComparisonOutput from individual analyses

**`POST /api/fdd/compare` request body:**
```typescript
{
  fdd_analysis_ids: string[];   // 2–5 IDs, all must belong to this user
  target_city?: string;          // shared location (defaults to first FDD's location)
  target_state?: string;
  target_zip?: string;
  name?: string;                 // user-given name for this comparison
  application_id?: string;       // links to E2go application if applicable
}
```

**`POST /api/fdd/compare` behavior:**
1. Validate all fdd_analysis_ids belong to auth user
2. Validate 2–5 IDs
3. Check all analyses have `overall_compatibility` set (i.e., E-2 scoring is complete)
4. For any analyses without territory data, trigger territory API (fire-and-forget with polling)
5. Insert `fdd_comparisons` record with `status = 'running'`
6. Build comparison_output synchronously (no streaming needed — fast operation)
7. Call narrative route to generate AI narrative via Anthropic API
8. Update status to 'complete'
9. Return `{ comparison_id: string }`

**`src/lib/fdd-comparison-engine.ts` responsibilities:**
- `buildComparisonTable(analyses: FddAnalysis[]): ComparisonOutput['comparison_table']`
- `rankFranchises(analyses: FddAnalysis[]): ComparisonOutput['ranking']`
- `computeCompositeScore(analysis: FddAnalysis): number`
- `generateNarrativePrompt(ranked: RankedFranchise[], investorProfile: string): string`

**Narrative generation:**
- Model: Anthropic API (ANTHROPIC_API_KEY — same rule as FDD extraction/scoring)
- System prompt establishes the investment advisor / franchise director voice from E2GO_MASTER_STRATEGY_PROMPT.md
- User prompt includes all ranked franchises with their key metrics, investor profile, and target market
- Target output: 6–8 sentences, specific and opinionated, not hedged

**Acceptance criteria:**
- POST creates comparison and returns comparison_id within 30 seconds
- GET returns full ComparisonOutput when status = 'complete'
- If any input FDD has not been scored, the API returns 422 with "Run E-2 scoring before comparing"
- All analyses must belong to the requesting user (401 if not)

---

### Sprint FDD-C3 — Comparison UI (3 pages)
**Duration:** 3 days
**Delivers:** `/fdd/compare` (index), `/fdd/compare/new` (setup), `/fdd/compare/[id]` (report)

#### Page 1: `/fdd/compare` — Comparison Index

Layout: mirrors `/fdd` (analysis index) but for comparisons.

- Header: "Your FDD Comparisons" / "Compare franchises side by side before you commit"
- Empty state: "No comparisons yet — [Start a new comparison →]"
- Comparison cards: franchise names combined (e.g., "Subway vs. Jersey Mike's vs. Firehouse Subs"), date, winner badge, target location, "View →" CTA
- "New comparison" button: gold, top right

#### Page 2: `/fdd/compare/new` — Setup Wizard

Two-step form:

**Step 1: Select FDDs**
- Shows user's existing scored analyses as selectable cards
- Min 2, max 5. Checkbox-style selection.
- If < 2 scored analyses exist: "Upload an FDD first →" CTA
- Each card shows: franchise name, E-2 score badge, territory score badge
- "Need to add a new FDD? Upload it first →" link

**Step 2: Set target location (optional)**
- "Comparing for the same target location?" toggle
- If yes: city/state/ZIP form (shared across all FDDs in comparison)
- If no: uses each FDD's own intake location
- Optional: "Name this comparison" text field
- "Generate comparison →" CTA → calls POST /api/fdd/compare → redirects to comparison report

Loading state after submission: "Analyzing [N] franchises..." spinner with ~5–10s wait.

#### Page 3: `/fdd/compare/[comparisonId]` — Comparison Report

**Section 1: Header**
```
[Gold tag: FRANCHISE COMPARISON]
Comparing 3 Franchises · Austin, TX          [Date]
For Alex Fontaine                             [if E2go user]
```

**Section 2: Recommendation Banner (full width, gold background)**
```
RECOMMENDED FOR YOUR E-2 APPLICATION         [if e2_visa: true]
Jersey Mike's Subs
"Jersey Mike's scores highest on investment substantiality and active operator requirements,
 with a 9.2% royalty burden that still supports ODE above the marginality threshold for Austin.
 The 15-year initial term exceeds the minimum for E-2 confidence, and Item 19 data covers
 82% of the system — well above the cherry-pick threshold."
[DECISIVE RECOMMENDATION]        [View Full Report →]
```

**Section 3: Franchise Ranking Strip**
Horizontal scrolling cards (desktop: 2–5 columns, mobile: horizontal scroll):
```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│  #1 · Top Choice        │  │  #2 · Strong Runner-Up  │  │  #3 · Consider If       │
│                         │  │                         │  │                         │
│  Jersey Mike's Subs     │  │  Subway                 │  │  Firehouse Subs         │
│                         │  │                         │  │                         │
│  87 / 100               │  │  71 / 100               │  │  58 / 100               │
│  STRONG E-2   VIABLE ↗  │  │  VIABLE E-2   STRONG ↗  │  │  CAUTION E-2  VIABLE ↗  │
│                         │  │                         │  │                         │
│  ODE: $78K–$112K        │  │  ODE: $62K–$91K         │  │  ODE: Est. only         │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
  [gold left border]
```

**Section 4: Side-by-Side Comparison Table**

Table header row: | Metric | Jersey Mike's | Subway | Firehouse Subs |
(Winner column has gold left border + faint gold background)

Row groups (collapsible on mobile):

```
INVESTMENT
  Initial Franchise Fee        $18,500         $15,000 ★best  $20,000
  Total Investment             $189K–$780K     $116K–$263K ★  $634K–$1.3M ✗worst
  Working Capital Covered      4 months        6 months ★     3 months ✗

FEE BURDEN
  Royalty Rate                 9.5%            8% ★           6% ★
  Marketing Fund               4.5%            4.5%           3.5% ★
  Technology Fee               $500/mo         $250/mo ★      $200/mo ★
  Total Ongoing Burden         14%             12.5% ★        9.5% ★best

FINANCIAL PERFORMANCE
  Item 19 AUV                  $841K ★         Not Disclosed  $692K
  Estimated ODE (mid)          $78K–$112K ★    Est. only      Est. only
  System Churn Rate            3.2% ★          5.8%           11.4% ✗
  Franchisor Audit             Unqualified ★   Unqualified ★  Qualified ✗

E-2 VIABILITY
  Overall E-2 Score            STRONG ★        VIABLE         CAUTION ✗
  Investment Substantiality    PASS ★          PASS ★         WARN
  Non-Marginality              PASS ★          WARN           FAIL ✗
  Develop & Direct             PASS ★          PASS ★         WARN
  Risk Flags                   2 ★             4              7 ✗

OPERATIONS
  Time to Open                 4 months ★      3 months ★     6 months
  Training Hours               120 ★           100            80 ✗
  Day 1 Staff                  8–12            5–8 ★          10–14

EXIT
  Initial Term                 15 years ★      10 years       10 years
  Renewal on Current Terms     Yes ★           No ✗           No ✗
  Transfer to Entity           Yes ★           Yes ★          No ✗
  Non-Compete                  2yr/10mi        2yr/5mi ★      3yr/25mi ✗
```

Color key: `✗` = red (worst), `★` = emerald (best), no mark = amber or neutral

**Section 5: AI Narrative**
```
[Cormorant Garamond display heading]
Analysis

[DM Sans body, 6–8 sentences, written as franchise investment advisor]
```

**Section 6: Questions Matrix (collapsible)**
Per franchise: top 3 critical questions, sorted by importance.
Side-by-side columns. Franchises where the same question type applies are grouped.

**Section 7: CTAs**
For E2go users:
- "Import Jersey Mike's to my case file →" (links to `/fdd/report/[winnerId]` → import flow)
- "Add another FDD to this comparison →"
- "Export PDF"

For standalone users:
- "Want to use this analysis for an E-2 visa application? → Start your E-2 journey"
- "Export PDF"

**Files to create:**
- `src/app/fdd/compare/page.tsx`
- `src/app/fdd/compare/new/page.tsx`
- `src/app/fdd/compare/[comparisonId]/page.tsx`
- `src/components/fdd/ComparisonTable.tsx` — the side-by-side table (extracted component)
- `src/components/fdd/RankingStrip.tsx` — the horizontal ranking cards

**Acceptance criteria:**
- Comparison report renders correctly at 390px (mobile) and 1280px (desktop)
- Table is horizontally scrollable on mobile
- Winner column is always visually distinct (gold accent)
- Cell coloring: best = emerald, worst = red, middle = neutral (per row)
- "Add another FDD" CTA opens /compare/new with existing comparison pre-populated
- AI narrative is real (not placeholder)
- Print-friendly: comparison table visible when printing

---

### Sprint FDD-S1 — Standalone User Path
**Duration:** 2 days
**Delivers:** `/fdd/start` landing, lightweight intake, user type adaptation

#### Page: `/fdd/start` — Standalone Landing

This is a marketing/entry page for Type B users arriving from Google ("FDD analysis tool", "analyze franchise disclosure document").

Design: Obsidian Gold, premium. No reference to E-2 visas in the hero. Surface the immigration value prop only after they've seen the FDD Intelligence value.

**Structure:**
1. **Hero:** "Analyze any Franchise Disclosure Document" + "Professional-grade FDD intelligence in minutes"
2. **3-step visual:** Upload PDF → Extract 50+ data points → Get your report
3. **Feature highlights (3 cards):**
   - "E-2 Visa Compatibility Score" (with small immigration note)
   - "Territory Market Analysis"
   - "Intelligent Franchisor Questions"
4. **Social proof / trust:** "Trained on NASAA standards, FTC Item guidelines, and 9 FAM E-2 regulatory requirements"
5. **CTA:** "Analyze my FDD →" → `/signup?redirect=/fdd/intake`

**File:** `src/app/fdd/start/page.tsx`

#### Page: `/fdd/intake` — Lightweight Profile Intake

For standalone users only. If E2go user (has application): skip to `/fdd/upload`.

5 questions, single page (not one-at-a-time — our design rule holds):

```
How much capital are you prepared to invest?
○ Up to $150,000
○ $150,000–$350,000
○ $350,000–$750,000
○ $750,000+

Which state(s) are you considering? [multi-select or free text]

Do you have prior business ownership experience?
○ Yes — I have owned/operated a business before
○ No — this would be my first business

Your industry background (optional — 1–2 sentences):
[text area]

How soon are you looking to invest?
○ Within 3 months
○ 3–6 months
○ 6–12 months
○ Just exploring
```

On submit: saves to `profiles.standalone_profile`, redirects to `/fdd/upload`.

**File:** `src/app/fdd/intake/page.tsx`

#### FDD Upload — Standalone Compatibility

The upload page (`/fdd/upload`) currently requires `application_id` as optional. For standalone users, it should:
- Skip the application_id linkage (already nullable in the DB)
- Pull investor_liquid_capital from `profiles.standalone_profile` for Profile Match
- Show "Comparing multiple FDDs? Add more after this one uploads."

**Modifications to:** `src/app/fdd/upload/page.tsx`
- Detect standalone user (no applications record)
- Show "Just analyzing? No E-2 visa required." note
- After upload complete: CTA changes to "Upload another FDD to compare →" (not just "View analysis")

#### Post-Analysis Conversion CTA (standalone users)

After standalone user completes their first full report, at the bottom of `/fdd/report/[fddId]`:

```
[Gold bordered card]
Ready to turn this into a visa application?

Your FDD analysis will carry over to your E-2 visa application automatically.
E2go builds your complete immigration document package — business plan,
source of funds declaration, and all supporting documents — using the franchise
data you just analyzed.

[→ Start my E-2 visa application]
```

Links to `/apply` (the hub page), which kicks off the main application journey.

**Acceptance criteria:**
- Standalone users can complete full FDD analysis without creating an application
- Profile Match runs using `standalone_profile` liquid_capital when application_id is null
- Conversion CTA appears on report page for standalone users
- Nav for standalone users shows: FDD Intelligence prominently, no "My Application" link

---

### Sprint FDD-T1 — Google Places Placeholder + Feature Flag
**Duration:** 0.5 days
**Delivers:** Feature-flagged Places stub; real hook for when Places API is activated

**File to modify:** `src/lib/fdd-territory-engine.ts`

Current state: `competitors.source` returns `null`, `nearby_count` returns `null`.

Change:
```typescript
const GOOGLE_PLACES_ENABLED = process.env.GOOGLE_PLACES_API_KEY !== undefined
  && process.env.GOOGLE_PLACES_ENABLED === 'true'; // requires explicit opt-in

// In territory engine:
if (GOOGLE_PLACES_ENABLED) {
  // Live Places call (already structured in codebase)
} else {
  // Return structured placeholder
  competitors = {
    source: 'placeholder',
    nearby_count: null,
    radius_miles: tradeAreaMiles,
    note: 'Live competitor data requires Google Places API. Contact support to enable.',
  };
}
```

Add `GOOGLE_PLACES_ENABLED=false` to `.env.local` (already has the key structure from FDD-3).

**Territory page:** If `source === 'placeholder'`, show info note:
> "Competitor count uses Census Business Patterns data as a proxy. Live Google Places scanning is available as an upgrade."

This keeps the territory page honest and sets up a clear path to flip the switch once Places API is confirmed.

---

## INTEGRATION POINTS — PRODUCTION CRITICAL

### API Key Routing (must not change)
All FDD Intelligence AI calls follow the locked rule from project context:

| Operation | Model | API Key |
|---|---|---|
| FDD extraction (SSE) | claude-opus-4-x (high accuracy) | ANTHROPIC_API_KEY |
| E-2 scoring | claude-sonnet-4-x | ANTHROPIC_API_KEY |
| Profile match (scoring only, no LLM) | — | No AI needed |
| Territory analysis narrative | claude-haiku-4-x (fast, cheap) | ANTHROPIC_API_KEY |
| Comparison narrative | claude-sonnet-4-x | ANTHROPIC_API_KEY |
| Questions generator | claude-haiku-4-x | ANTHROPIC_API_KEY |
| All simulator routes | xiaomi/mimo-v2.5 or mimo-v2.5-pro | OPENROUTER_API_KEY |

**Never use OpenRouter for FDD features.** The immigration accuracy requirement demands Anthropic models.

### Nav updates
The `/fdd` link is already in the main nav. Add `/fdd/compare` sub-nav item under it on desktop. Update mobile dropdown to include "Compare FDDs".

### Dashboard widget
After FDD-C3 is done: add a "FDD Comparisons" widget to the dashboard if user has comparisons.

---

## FILE MANIFEST — COMPLETE

### New files to create
```
src/lib/fdd-profile-match-engine.ts
src/lib/fdd-comparison-engine.ts
src/app/api/fdd/[fddId]/writeback/route.ts
src/app/api/fdd/compare/route.ts
src/app/api/fdd/compare/[comparisonId]/route.ts
src/app/api/fdd/compare/[comparisonId]/narrative/route.ts
src/app/fdd/compare/page.tsx
src/app/fdd/compare/new/page.tsx
src/app/fdd/compare/[comparisonId]/page.tsx
src/app/fdd/start/page.tsx
src/app/fdd/intake/page.tsx
src/components/fdd/ComparisonTable.tsx
src/components/fdd/RankingStrip.tsx
docs/migrations/0052_fdd_comparisons.sql
```

### Files to modify
```
src/app/api/fdd/score/route.ts          — add profile match call
src/app/fdd/score/[fddId]/page.tsx      — add Profile Match card
src/app/fdd/report/[fddId]/page.tsx     — hasAccess, write-back button, Profile Match section, standalone CTA
src/app/fdd/upload/page.tsx             — standalone compatibility, post-upload CTA
src/app/fdd/page.tsx                    — add comparison link, adapt for standalone users
src/lib/fdd-territory-engine.ts         — Google Places feature flag + placeholder
src/lib/generation-engine.ts            — [FDD_CONTEXT] injection
src/types/fdd.ts                        — ComparisonOutput, ProfileMatchResult types
```

---

## EXECUTION ORDER

**Week 1 (gaps first, then comparison data layer):**
1. FDD-G1 — Profile Match Engine
2. FDD-G2 — Write-back + Generation Integration
3. FDD-G3 — Paywall Enforcement
4. FDD-T1 — Google Places Placeholder (quick)
5. FDD-C1 — Database Migration

**Week 2 (comparison feature):**
6. FDD-C2 — Comparison API Routes
7. FDD-C3 — Comparison UI (3 pages)

**Week 3 (standalone path + polish):**
8. FDD-S1 — Standalone User Path
9. QA pass: test both user type journeys end-to-end
10. Build verification: npm run build, no TypeScript errors

---

## ACCEPTANCE CRITERIA — FULL SYSTEM

After all sprints complete:

### Type A (E2go user) journey
- [ ] User uploads FDD, selects their open application in the intake form
- [ ] Extraction runs, all 50 fields populated
- [ ] E-2 score shows all 5 dimensions including Profile Match
- [ ] Territory analysis runs, shows Census data
- [ ] Questions generated
- [ ] Final report: full access (first analysis free; subsequent analyses gated)
- [ ] "Import to case file" button writes 8 fields to answers table
- [ ] Generation engine uses [FDD_CONTEXT] for business plan sections 3–6
- [ ] Can start a multi-FDD comparison from the report page ("Add another FDD to compare")
- [ ] Comparison report shows side-by-side table with correct winner highlighting

### Type B (standalone) journey
- [ ] User lands on `/fdd/start`, creates account
- [ ] Completes 5-field lightweight intake at `/fdd/intake`
- [ ] Uploads FDD without application linkage
- [ ] Full pipeline runs; Profile Match uses standalone_profile liquid_capital
- [ ] Report page shows conversion CTA at bottom
- [ ] Can upload 2–4 more FDDs and start a comparison
- [ ] Comparison report shows recommendation optimized for their capital + target state

### Comparison feature
- [ ] Setup wizard correctly prevents fewer than 2 or more than 5 FDDs
- [ ] Comparison generates within 30 seconds
- [ ] Table cells are correctly color-coded (best = emerald, worst = red) per row
- [ ] Winner column has gold accent
- [ ] AI narrative is specific to the actual franchises analyzed (not generic)
- [ ] "Add another FDD" CTA works
- [ ] Comparison accessible from both Type A and Type B journeys

---

## RISKS AND MITIGATIONS

| Risk | Likelihood | Mitigation |
|---|---|---|
| Narrative generation too slow (>30s) | Medium | Stream the narrative with SSE; show table first, narrative loads async |
| Territory data missing for standalone users (no ZIP) | Medium | Require target_zip in standalone intake; offer "I'll add this later" to skip territory |
| Profile Match data limited for standalone users | Low | Engine degrades gracefully: runs on FDD data only, flags "CaseProfile unavailable" |
| Comparison with 5 FDDs exceeds context window | Low | Build comparison_table client-side from existing analysis data; only narrative goes to LLM |
| User uploads same FDD twice in a comparison | Low | Validate at API layer: fdd_analysis_ids must be unique |
| Google Places API costs spike if enabled | Low | Feature flag default OFF; explicit env var opt-in required |

---

## WHAT THIS DOES NOT INCLUDE

These are out of scope for this build (but designed for later):

1. **FDD version comparison** (comparing two editions of the same FDD — e.g. 2024 vs 2025 FDD)
2. **Brand database** (pre-indexed FDDs for common franchises — requires FDD licensing)
3. **Valuation calculator** (estimated resale value at exit)
4. **Franchisee validation call prep** (script for calling Item 20 contacts)
5. **Attorney portal integration** (attorney can view client's FDD analysis)
6. **Stripe payment for FDD Intelligence** (pricing TBD — placeholder paywall in place)

---
*End of build plan.*
