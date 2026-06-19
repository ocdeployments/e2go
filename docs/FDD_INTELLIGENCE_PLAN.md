# FDD Intelligence — Master Implementation Plan
**Version:** 2.0 — June 19, 2026
**Status:** Implementation-ready. This document is the source of truth for FDD-1 through FDD-5.
**Prerequisite reading:** `docs/FDD_INTELLIGENCE_RESEARCH.md` (background + rationale)
**Branch target:** `dev` → PR to `main` after each sprint

---

## DOCUMENT INDEX

| Section | Contents |
|---|---|
| Part 1 | Product overview, positioning, freemium model |
| Part 2 | Complete extraction schema (50 fields, gap-corrected) |
| Part 3 | E-2 scoring engine specification |
| Part 4 | Territory market analysis specification |
| Part 5 | Questions-for-franchisor generator |
| Part 6 | Integration architecture with E2Go platform |
| Part 7 | Sprint plan — FDD-1 through FDD-5 |
| Part 8 | LLM prompts (copy-ready for implementation) |
| Part 9 | Honest limitations (what we cannot cover) |
| Part 10 | Database schema (Supabase tables) |

---

## PART 1 — PRODUCT OVERVIEW

### What it is
A paid add-on module. The investor uploads their FDD PDF. The platform:
1. Extracts ~50 structured fields across 12 FDD Items
2. Scores the franchise for E-2 visa compatibility across 5 dimensions
3. Runs a territory market analysis against their target location
4. Matches the franchise against their existing CaseProfile
5. Generates a set of intelligent questions to ask the franchisor
6. Outputs a final report with findings, flags, and recommendations

### The guiding principle
This tool's purpose is to move the investor from **"I don't know what I don't know"** to **"I know exactly what to verify, what to ask, and what to watch out for before I sign."** It does not replace an attorney. It arms the investor to use their attorney's time efficiently.

### Freemium / Teaser (for non-buyers)
When a user in the Simulator has mentioned a specific franchise brand, show a locked preview card:

**Shown (free):**
- Brand name + category
- 3 headline metrics with real values: `Total investment: $180K–$240K | Royalty burden: 8.2% | Item 19: Present`
- Risk count: "4 flags identified in this FDD"
- 3 sample questions from the question bank (real questions, not fake)
- Territory compatibility indicator (city/state level): "Miami, FL — VIABLE market for this category"

**Locked (paid):**
- Full compatibility score and dimension breakdown
- ODE model (what you'd actually take home)
- All 4 flags explained
- Full territory analysis with demographics
- All 12–15 franchisor questions
- Profile match score
- Business plan integration

**Price point:** TBD (owner decision — not in scope of this sprint plan)

---

## PART 2 — EXTRACTION SCHEMA (Complete, Gap-Corrected)

### Meta fields (on every extracted field)
Every data point we extract carries three sub-fields:
- `_page`: page number in the FDD where found
- `_quote`: exact source text (≤ 200 chars)
- `_conf`: extraction confidence — `high` / `medium` / `low`

Low-confidence extractions are flagged in the UI for manual review.

---

### INTAKE (collected before upload)

| Field | Type | Source | Notes |
|---|---|---|---|
| `transaction_type` | enum | User input | `new_unit` / `resale` / `multi_unit_development` |
| `target_city` | text | User input | City where investor wants to open |
| `target_state` | text | User input | State — triggers registration check |
| `target_zip` | text | User input | For isochrone + census queries |
| `investor_liquid_capital` | integer | CaseProfile or input | Cross-checks Item 7 |
| `investor_net_worth` | integer | CaseProfile or input | Proportionality calculation |

---

### ITEM 1 — The Franchisor

| Field | Type | Notes |
|---|---|---|
| `franchisor_legal_name` | text | |
| `parent_company` | text | |
| `headquarters_state` | text | |
| `year_business_began` | integer | |
| `year_franchising_began` | integer | |
| `total_franchise_units_current` | integer | |
| `fdd_effective_date` | date | ★ NEW — issuance date at top of document |
| `fdd_age_months` | integer | ★ NEW — calculated: months since effective date |
| `fdd_fiscal_year_covered` | integer | ★ NEW — what year the financial data represents |
| `is_registration_state` | boolean | ★ NEW — derived from target_state |
| `registered_in_target_state` | boolean | ★ NEW — from Item 1 state registration list or addenda |
| `state_addendum_present` | boolean | ★ NEW — material terms may differ |
| `state_addendum_key_differences` | text | ★ NEW — LLM summary of addendum changes |
| `accepts_nonimmigrant_visa_holders` | boolean | ★ Hard gate — not in FDD; flag for manual confirm |

**Scoring gate:** `fdd_age_months` > 12 = WARN. > 18 = FAIL with message: "This FDD may be superseded. Request the current year FDD before proceeding."

---

### ITEM 2 — Key People (minimal extraction)

| Field | Type | Notes |
|---|---|---|
| `executive_franchise_experience_years` | integer | ★ NEW — years in franchise industry (top 3 executives) |
| `executive_prior_brands` | integer | How many franchise systems they've run |

---

### ITEM 3 — Litigation

| Field | Type | Notes |
|---|---|---|
| `active_litigation_count` | integer | |
| `franchisee_initiated_suits` | integer | Most revealing |
| `regulatory_actions_count` | integer | FTC, state AG |
| `litigation_pattern_summary` | text | LLM-generated |

---

### ITEM 4 — Bankruptcy

| Field | Type | Notes |
|---|---|---|
| `franchisor_bankruptcy_history` | boolean | |
| `executive_bankruptcy_history` | boolean | |
| `bankruptcy_details` | text | |

---

### ITEM 5 — Initial Franchise Fee

| Field | Type | Notes |
|---|---|---|
| `initial_franchise_fee` | integer | |
| `fee_is_refundable` | boolean | Non-refundable = at-risk for E-2 |
| `fee_refund_conditions` | text | |

---

### ITEM 6 — Ongoing Fees

| Field | Type | Notes |
|---|---|---|
| `royalty_rate_pct` | float | |
| `royalty_basis` | text | gross / net / flat |
| `marketing_fund_pct` | float | |
| `technology_fee_monthly` | integer | |
| `other_recurring_fees` | text | |
| `total_ongoing_fee_pct` | float | Calculated: royalty + mktg + tech (as % of revenue) |
| `fee_escalation_rights` | boolean | Franchisor can raise unilaterally |

---

### ITEM 7 — Initial Investment

| Field | Type | Notes |
|---|---|---|
| `total_investment_min` | integer | |
| `total_investment_max` | integer | |
| `component_real_estate` | text | Range |
| `component_equipment` | text | Range |
| `component_initial_inventory` | text | Range |
| `component_working_capital` | text | Range |
| `component_franchise_fee` | integer | |
| `component_training_travel` | text | |
| `component_signage_misc` | text | |
| `working_capital_months_covered` | integer | |
| `estimated_cogs_pct` | float | ★ NEW — LLM-estimated by franchise category |
| `debt_service_annual` | integer | ★ NEW — calculated: investment × 8% over 10 years |

---

### ITEM 11 — Training and Support

| Field | Type | Notes |
|---|---|---|
| `initial_training_hours` | integer | |
| `ongoing_training_available` | boolean | |
| `field_support_visits` | text | |
| `training_location` | text | |
| `typical_fte_employees` | integer | ★ NEW — staff at a mature unit |
| `opening_day_employees` | integer | ★ NEW — U.S. workers hired on Day 1 |
| `investor_role` | text | ★ NEW — active manager / owner-operator / semi-passive |
| `investor_hours_per_week` | integer | ★ NEW — if disclosed |
| `typical_time_to_open_months` | integer | ★ NEW — from signing to first day of operations |
| `e2_timing_risk` | enum | ★ NEW — `low` / `medium` / `high` |

---

### ITEM 12 — Territory

| Field | Type | Notes |
|---|---|---|
| `territory_type` | enum | exclusive / protected / none |
| `territory_definition` | text | |
| `ecommerce_carve_out` | boolean | |
| `nontraditional_location_carve_out` | boolean | |
| `territory_size_households` | integer | |
| `right_of_first_refusal` | boolean | |
| `franchisor_minimum_separation_miles` | float | ★ NEW — if disclosed; used for cannibalization check |

---

### ITEM 17 — Renewal, Termination, Transfer

| Field | Type | Notes |
|---|---|---|
| `initial_term_years` | integer | |
| `renewal_available` | boolean | |
| `renewal_on_current_terms` | boolean | False = must sign new agreement |
| `termination_triggers_count` | integer | |
| `cure_period_days` | integer | |
| `transfer_fee` | integer | |
| `post_termination_noncompete_years` | integer | |
| `post_termination_noncompete_radius_miles` | integer | |
| `transfer_approval_timeline_days` | integer | ★ NEW — how long franchisor has to approve sale |
| `right_of_first_refusal_on_sale` | boolean | ★ NEW — franchisor can buy at your price |
| `transfer_to_entity_allowed` | boolean | ★ NEW — can transfer to LLC/corp (critical for E-2) |
| `estimated_resale_multiple` | float | ★ NEW — typical AUV × X for this system |

---

### ITEM 19 — Financial Performance

| Field | Type | Notes |
|---|---|---|
| `item19_present` | boolean | |
| `item19_metric_type` | enum | gross_revenue / net_income / EBITDA / multiple |
| `item19_fiscal_year` | integer | ★ NEW — what year the data covers |
| `covid_period_flag` | boolean | ★ NEW — fiscal year 2019–2022 = COVID distortion risk |
| `item19_auv` | integer | Average unit volume |
| `item19_median` | integer | |
| `item19_mean` | integer | |
| `item19_high` | integer | |
| `item19_low` | integer | |
| `item19_units_included` | integer | |
| `item19_pct_system_included` | float | Low % = cherry-picking risk |
| `item19_includes_franchisee_units` | boolean | False = company-only = red flag |
| `item19_median_vs_mean_gap` | float | Calculated: high gap = high variability |
| `item19_footnote_exclusions` | text | What was removed |
| `item19_cherry_pick_flag` | boolean | LLM assessed |
| `estimated_ode_low` | integer | ★ NEW — owner discretionary earnings, conservative |
| `estimated_ode_mid` | integer | ★ NEW — central case |
| `estimated_ode_high` | integer | ★ NEW — optimistic |

**ODE Calculation (automated):**
```
ODE = AUV × (1 - estimated_COGS_pct)
    - (AUV × total_ongoing_fee_pct)
    - estimated_rent_annual            (from Item 7 real estate component midpoint ÷ 12 × 12)
    - estimated_labor_annual           (typical_fte_employees × local median wage × 1.25 for benefits)
    - debt_service_annual
```

---

### ITEM 20 — Outlets

| Field | Type | Notes |
|---|---|---|
| `total_units_open_current` | integer | |
| `units_opened_yr1` | integer | |
| `units_opened_yr2` | integer | |
| `units_opened_yr3` | integer | |
| `units_closed_yr1` | integer | |
| `units_closed_yr2` | integer | |
| `units_closed_yr3` | integer | |
| `franchisee_initiated_closures_3yr` | integer | |
| `franchisor_initiated_terminations_3yr` | integer | |
| `churn_rate_pct` | float | Calculated |
| `avg_tenure_years` | float | |
| `former_franchisee_contacts_available` | boolean | |

---

### ITEM 21 — Audited Financials

| Field | Type | Notes |
|---|---|---|
| `audit_opinion` | enum | unqualified / qualified / adverse |
| `years_of_financials` | integer | |
| `royalty_revenue_trend` | enum | growing / flat / declining |
| `franchise_fee_revenue_trend` | enum | growing / flat / declining |
| `royalty_vs_fee_ratio` | float | |
| `franchisor_net_income` | integer | |
| `liquidity_ratio` | float | |
| `debt_covenant_flags` | boolean | |

---

## PART 3 — E-2 SCORING ENGINE

### Output format
```typescript
interface E2CompatibilityScore {
  overall: 'STRONG' | 'VIABLE' | 'CAUTION' | 'INELIGIBLE';
  dimensions: {
    eligibility_gates: DimensionScore;
    investment_substantiality: DimensionScore;
    non_marginality: DimensionScore;
    develop_and_direct: DimensionScore;
    risk_flags: RiskFlag[];
  };
  timing_assessment: TimingAssessment;
  state_registration_gate: RegistrationGate;
  ode_assessment: OdeAssessment;
  overall_narrative: string;  // 3-4 sentence plain-English summary
}
```

### Dimension 1 — Eligibility Gates

Any FAIL in this dimension = overall INELIGIBLE.

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| FDD not stale | < 12 months old | 12–18 months | > 18 months |
| State registration | Confirmed registered | Unconfirmed | Confirmed not registered |
| Accepts non-immigrant visa holders | Confirmed | Unconfirmed | Confirmed no |
| Active business model | Investor operates | Management company involved | Fully passive |
| Minimum employees | ≥ 3 U.S. workers | 1–2 | Investor is sole worker |
| Franchise fee at-risk | Non-refundable | Conditional | Fully refundable |

### Dimension 2 — Investment Substantiality

**Proportionality uses sliding scale (9 FAM 402.9-6(D)), not flat thresholds:**

| Total Investment | Min % Committed (PASS) | WARN range | FAIL |
|---|---|---|---|
| < $100K | > 90% | 75–90% | < 75% |
| $100K–$500K | > 75% | 50–75% | < 50% |
| $500K–$2M | > 50% | 30–50% | < 30% |
| > $2M | > 30% | 20–30% | < 20% |

Additional checks:

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Total investment floor | > $150K | $80–150K | < $80K |
| Investment committed (sliding scale above) | Scale PASS | Scale WARN | Scale FAIL |
| Franchise fee at-risk | Non-refundable | Conditional | Refundable |

### Dimension 3 — Non-Marginality

**Use ODE_mid, not AUV — this is the critical fix from the gap analysis.**

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Item 19 data quality | Present, system-wide | Present, cherry-picked | Absent |
| ODE_mid vs. investor living expenses | ODE_mid > expenses + $30K | ODE_mid covers expenses | ODE_mid < expenses |
| ODE_mid absolute floor | > $65K | $40–65K | < $40K |
| Churn rate | < 5% | 5–12% | > 12% |
| Royalty revenue trend | Growing | Flat | Declining |
| Audit opinion | Unqualified | — | Qualified / adverse |

### Dimension 4 — Develop and Direct

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Initial training hours | > 80 | 40–80 | < 40 |
| Investor role | Active operator | Co-managed | Management company |
| Territory protection | Exclusive | Protected | None |
| Initial term vs. E-2 horizon | ≥ 5 years | 3–5 years | < 3 years |
| Job creation — Day 1 | ≥ 3 U.S. workers | 1–2 | None until profitable |
| Cannibalization risk | > min separation | At minimum | Below minimum separation |

### Dimension 5 — Risk Flags (attorney review triggers)

These do not auto-fail but appear prominently in the report and generate specific franchisor questions:

- [ ] FDD > 12 months old
- [ ] Franchisee-initiated suits ≥ 3
- [ ] Item 19 company-only data (excludes franchisee units)
- [ ] Mean/median revenue gap > 30%
- [ ] Working capital estimate < 6 months
- [ ] Renewal requires signing new agreement
- [ ] Cure period < 10 days
- [ ] Post-termination non-compete > 2 years or > 50 mile radius
- [ ] Fee escalation rights exist
- [ ] E-commerce territory carve-out
- [ ] Franchisor bankruptcy history
- [ ] COVID period Item 19 data (2019–2022 fiscal year)
- [ ] Timing risk HIGH (> 6 months to open)
- [ ] Transfer to entity NOT allowed (blocks standard E-2 corporate structure)
- [ ] Right of first refusal on sale (limits exit flexibility)

### Timing Assessment (standalone output, shown separately)

```
timing_risk: 'LOW' | 'MEDIUM' | 'HIGH'
time_to_open_months: integer
e2_application_window_note: string
recommendation: string
```

---

## PART 4 — TERRITORY MARKET ANALYSIS

### Data sources and API calls

| Source | API | Fields pulled | Latency |
|---|---|---|---|
| Census ACS 5-Year | api.census.gov/data/acs/acs5 | Population, age, income, HH composition, homeownership, education | < 1s |
| Census LODES | lehd.ces.census.gov/data | Daytime workers, jobs by NAICS, wage tiers | < 2s |
| Census Business Patterns | api.census.gov/data/cbp | Establishment count by NAICS (competitor proxy) | < 1s |
| BLS OES | api.bls.gov/publicAPI/v2 | Employment by industry, location quotients | < 2s |
| Google Places | maps.googleapis.com/places | Direct competitor count + proximity | < 1s |
| DOT HPMS | via FHWA API | AADT at or near proposed address | 2–5s, for inbound models only |
| Google Maps Distance Matrix | maps.googleapis.com | Drive-time isochrone boundary points | < 2s |

**Total estimated API cost per analysis:** < $0.08 (Google Places + Maps free tier covers ~40K calls/month)

### Trade area definition (by franchise model type)

| Category | Method | Size | Notes |
|---|---|---|---|
| QSR / Fast Casual | Drive-time isochrone | 5–10 min | Pull AADT if location known |
| Fitness / Wellness | Drive-time isochrone | 10–15 min | Weight income 40%+ |
| Retail / Salon / Clinic | Drive-time isochrone | 5–10 min | Pull AADT |
| Child Care / Tutoring | Drive-time isochrone | 10–15 min | Weight children-under-10 households |
| Senior Care | Radius | 10 miles | Weight 75+ population |
| Home Services (cleaning, HVAC, pest) | Radius | 15–20 miles | Weight homeowners HHI > $75K |
| B2B Services | Radius from business districts | 15–25 miles | Weight daytime employment density |

### Category-specific scoring weights

| Category | Customer Density | Economic Strength | Competitive Pressure |
|---|---|---|---|
| QSR / Fast Casual | 50% | 20% | 30% |
| Fitness / Wellness | 40% | 40% | 20% |
| Home Services | 30% | 50% | 20% |
| Senior Care | 25% | 30% | 45% |
| Child Care / Tutoring | 45% | 35% | 20% |
| B2B Services | 40% | 35% | 25% |
| Retail / Salon / Clinic | 45% | 25% | 30% |

### Variables scored per dimension

**Customer Density (0–100)**
- Total population or target segment in trade area
- Daytime/nighttime ratio (from LODES) — relevant for QSR, B2B
- Population growth trajectory (5-year ACS trend)
- Lifestyle segment match (Census proxy clusters — see below)

**Economic Strength (0–100)**
- Median household income
- Income trajectory (ACS trend)
- Unemployment rate vs. state benchmark (BLS)
- Homeownership rate (for home services)
- Educational attainment (for B2B, professional services)

**Competitive Pressure (0–100)**
- Direct competitor count in trade area (Google Places)
- Competitor density per 10,000 target customers
- Nearest same-brand distance vs. Item 12 minimum separation
- Cannibalization risk flag (if nearest same-brand < minimum separation)
- Market saturation index (CBP establishment count ÷ addressable population)

### Census proxy clusters (lifestyle segmentation without PRIZM)
Free approximation using ACS variables:

| Target Segment | ACS Proxy Variables |
|---|---|
| Busy families (home services, child care) | Married w/ children + commute > 30 min + HHI > $75K |
| Time-pressed professionals (QSR, convenience) | Commute > 30 min + full-time employment rate > 70% |
| Affluent homeowners (premium home services) | Homeownership > 65% + HHI > $100K + median home value > $400K |
| Active adults (fitness, wellness) | Age 25–55 + HHI > $60K + low obesity rate proxy (education > bachelor's) |
| Senior population (senior care, medical) | Age 75+ count + solo-household rate > 30% |

### Output

```typescript
interface TerritoryAnalysis {
  trade_area_method: 'isochrone' | 'radius';
  trade_area_size_description: string;
  overall_score: number;                          // 0–100
  overall_rating: 'STRONG' | 'VIABLE' | 'MARGINAL' | 'WEAK';
  customer_density_score: number;
  economic_strength_score: number;
  competitive_pressure_score: number;
  cannibalization_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  aadt_at_location?: number;                      // inbound models only
  key_findings: string[];                         // 3–5 bullet points
  data_gaps: string[];                            // honest about what we couldn't get
  e2_connection: string;                          // one sentence: how this supports/weakens the visa argument
}
```

---

## PART 5 — QUESTIONS-FOR-FRANCHISOR MODULE

### Concept
After all analysis is complete, the platform generates a personalized set of questions the investor should ask:
1. **The franchisor's development representative** (sales process)
2. **A validation franchisee** (currently operating)
3. **A former franchisee** (Item 20 contact list)
4. **Their franchise attorney** (before signing)

Questions are generated dynamically from the flags raised. Each flag maps to 1–3 questions.

### Question bank (flag-to-question mapping)

**FDD staleness (> 12 months old)**
- "Can you provide the current year FDD? The version I reviewed was issued in [date]."
- "What has changed in the system since [year] — new unit openings, closures, litigation, or fee changes?"

**State registration unconfirmed**
- "Are you registered to sell franchises in [target state]? Can you confirm your registration number?"
- "If there is a [state] addendum to the FDD, can you send it to me? I understand certain terms may differ."

**Item 19 absent**
- "Since you don't disclose financial performance representations, can you connect me with 5–8 franchisees in markets similar to mine?"
- "What does a typical first-year franchisee earn in net income in your system?"
- "What does a franchisee need to gross annually to cover royalties, fees, labor, and rent and take home a reasonable salary?"

**Item 19 cherry-pick flag**
- "Your Item 19 covers [X]% of your system. Can you tell me what the performance looks like for the units that were excluded?"
- "The median and mean revenues in your disclosure are [gap]% apart — what explains that range?"
- "Were any units excluded from Item 19 because they were underperforming?"

**High churn rate (> 8%)**
- "Item 20 shows [X] closures over the last 3 years. What were the primary reasons franchisees exited the system?"
- "Of those that closed, how many were franchisee-initiated vs. terminated by you?"
- "What support does the system provide to underperforming locations before closing them?"

**Cure period < 10 days**
- "Under Item 17, the cure period for certain default events is [X] days. In practice, how do you handle franchisees who miss a payment or a reporting deadline?"
- "Has the company ever terminated a franchisee for a first offense without providing an opportunity to cure?"

**Timing risk HIGH (> 6 months to open)**
- "What is the realistic timeline from signing the franchise agreement to opening day in [target market]?"
- "What are the most common delays franchisees encounter, and how does the system help mitigate them?"
- "Is there a minimum commitment of funds required before I can begin training? At what point does the franchise agreement consider the business 'in progress'?"

**Transfer to entity NOT allowed**
- "Your FDD indicates the franchise cannot be held by a corporate entity. Would you consider a modification to allow an LLC or corporation to hold the franchise agreement?"
- (This is often non-negotiable but must be confirmed — a flag for the attorney)

**Working capital < 6 months**
- "Your Item 7 working capital estimate covers [X] months. What does your data show about average time to breakeven?"
- "What percentage of your franchisees needed to inject additional capital in their first 12 months?"

**COVID period Item 19 flag**
- "Your Item 19 data is from [year]. How does that year compare to [current year] for your system? Is the same [number] cohort of units still performing at those levels?"

**No visa holder policy unconfirmed**
- "Does the franchise agreement have any restrictions on franchise ownership by non-immigrant visa holders?"
- "Have you had franchisees who held E-2 investor visas? How did the franchise structure interact with their visa requirements?"

**Fee escalation rights**
- "Your FDD notes that fees can be increased. What is the maximum increase permitted, and how much notice is required?"
- "Has the royalty rate or marketing fund contribution changed in the last 5 years?"

**Right of first refusal on sale**
- "If I decided to sell my franchise, what is your typical process and timeline for evaluating the sale?"
- "Have you exercised your right of first refusal to buy back a franchise from a selling franchisee in the last 3 years?"

**Validation franchisee questions (always included regardless of flags)**
- "What surprised you most — positively and negatively — in your first year?"
- "How accurate was the Item 7 investment estimate compared to your actual startup costs?"
- "Are you earning what you expected? Would you buy this franchise again?"
- "How responsive is the corporate support team when you have an operational problem?"
- "What do you wish you had asked before you signed?"

**Former franchisee questions (always included)**
- "What was your primary reason for leaving the system?"
- "Were you able to sell your franchise? At what multiple of revenue?"
- "If you could go back, what would you do differently?"

### Output format

```typescript
interface FranchisorQuestions {
  questions_for_development_rep: Question[];
  questions_for_validation_franchisee: Question[];
  questions_for_former_franchisee: Question[];
  questions_for_attorney: Question[];
  flag_count: number;
  priority_questions: Question[];   // top 5 most important across all categories
}

interface Question {
  text: string;
  triggered_by: string;             // which flag or dimension generated this
  importance: 'critical' | 'important' | 'recommended';
  what_to_listen_for: string;       // one sentence: a good answer vs. a red flag answer
}
```

---

## PART 6 — INTEGRATION WITH E2GO PLATFORM

### Data E2Go already has → feeds FDD Intelligence

| E2Go Data Source | Field | How FDD Intelligence uses it |
|---|---|---|
| `case_profiles.liquid_capital_score` | normalized score | Seeded into proportionality check (Dimension 2) |
| `case_profiles.management_experience_score` | normalized score | Seeded into Develop & Direct (Dimension 4) |
| `case_profiles.archetype` | enum | Frames the report narrative tone and emphasis |
| `case_profiles.industry_background` | text | Profile match dimension |
| `answers.net_worth` | value | Investment substantiality |
| `answers.liquid_capital` | value | Proportionality calculation |
| `answers.target_state` | value | Pre-fills state registration check |
| `answers.investment_budget` | value | Compared to Item 7 range |
| `answers.management_experience_years` | value | Develop & Direct scoring |
| `applications.id` | UUID | Links FDD analysis to application record |

### What FDD Intelligence writes back → enriches E2Go

| Table | New Field | What it enables |
|---|---|---|
| `answers` | `fdd_franchise_fee` | Business plan generation uses real franchise fee |
| `answers` | `fdd_total_investment_min` | Generation engine uses real investment figure |
| `answers` | `fdd_auv_median` | Financial projections use real Item 19 data |
| `answers` | `fdd_royalty_rate` | P&L model in business plan |
| `answers` | `fdd_initial_term_years` | Business plan timeline section |
| `answers` | `fdd_training_hours` | Investor qualifications section |
| `answers` | `fdd_employee_count` | Job creation section of business plan |
| `answers` | `fdd_territory_type` | Business description section |

### Generation engine integration (business plan)

When `fdd_analysis_id` is present on an application, inject a `[FDD_CONTEXT]` block into the generation prompt. This block feeds:
- **Section 3 (Investment):** Item 7 data, fee structure, proportionality analysis
- **Section 4 (Market Analysis):** Territory score, demographics, competitive landscape
- **Section 5 (Financial Projections):** Item 19 AUV, ODE model, break-even timeline
- **Section 6 (Management):** Training hours, investor role, staffing plan

### Teaser integration — Simulator results page

When a user's CaseProfile identifies a franchise brand (from answers or simulator), show a teaser card on the Simulator results page:

```
[FDD INTELLIGENCE PREVIEW]
Brand: [Franchise Name]
Category: [Category]
---
Investment range: $XXX,XXX – $XXX,XXX
Total fee burden: X.X%
Item 19: Present / Absent
---
4 flags identified in this FDD
Territory: [City, State] — VIABLE for this category
---
3 sample questions included →
  • "Are you registered to sell in [state]?"
  • "What was the average time to profitability for units that opened in [year]?"
  • "Why did [X] franchisees exit the system in the last 3 years?"
---
[Unlock Full FDD Analysis — $XXX]
```

Teaser card is shown read-only. Score and detailed findings are blurred/locked.

---

## PART 7 — SPRINT PLAN

### Sprint overview

| Sprint | Name | Output | Estimated effort |
|---|---|---|---|
| FDD-DESIGN | Planning | This document | Complete ✅ |
| FDD-1 | Extraction Pipeline | Upload → LLM extract → store in DB | 5–7 days |
| FDD-2 | Scoring Engine | 5-dimension score + ODE model + timing | 4–5 days |
| FDD-3 | Territory Analysis | Census + BLS + Places + isochrone + score | 6–8 days |
| FDD-4 | Questions + Profile Match | Question bank + match scoring + UI | 4–5 days |
| FDD-5 | Final Report + Integration | Full report UI + gen engine + teaser | 5–7 days |

---

### FDD-1: Extraction Pipeline

**Goal:** User uploads FDD PDF → LLM extracts 50 fields → stored in `fdd_analyses` table → user can review and correct extracted values.

**Files to create/modify:**
- `supabase/migrations/[date]_fdd_analyses.sql` — new table
- `src/app/api/fdd/upload/route.ts` — upload + trigger extraction
- `src/app/api/fdd/extract/route.ts` — SSE stream extraction
- `src/lib/fdd-extraction-engine.ts` — LLM prompt + field parser
- `src/app/(dashboard)/fdd/upload/page.tsx` — upload UI
- `src/app/(dashboard)/fdd/review/[fddId]/page.tsx` — review extracted fields

**Prompt:** See Part 8 — Prompt 1 (FDD Extraction)

**Acceptance criteria:**
- [ ] PDF uploads to Supabase Storage
- [ ] Extraction returns all 50 fields with page references and source quotes
- [ ] Low-confidence fields flagged in UI for manual correction
- [ ] FDD age calculated and displayed with WARN/FAIL if stale
- [ ] State registration check runs automatically

---

### FDD-2: Scoring Engine

**Goal:** Given extracted fields + investor profile, compute 5-dimension E-2 compatibility score.

**Files to create/modify:**
- `src/lib/fdd-scoring-engine.ts` — pure function, no LLM needed for numeric scoring
- `src/lib/fdd-ode-model.ts` — ODE calculation (pure function)
- `src/app/api/fdd/score/route.ts` — trigger scoring
- `src/app/(dashboard)/fdd/score/[fddId]/page.tsx` — scoring dashboard UI

**Prompt:** See Part 8 — Prompt 2 (Scoring Narrative)

**Acceptance criteria:**
- [ ] All 5 dimensions score correctly with test fixtures
- [ ] Proportionality uses sliding scale, not flat thresholds
- [ ] ODE_low/mid/high calculated from extracted fields
- [ ] Overall compatibility badge: STRONG / VIABLE / CAUTION / INELIGIBLE
- [ ] State registration gate fires before other dimensions
- [ ] Timing assessment produced independently

---

### FDD-3: Territory Market Analysis

**Goal:** Given target ZIP + franchise category, pull public data and score the market.

**Files to create/modify:**
- `src/lib/territory-analysis-engine.ts` — orchestrator
- `src/lib/census-api.ts` — ACS + LODES + CBP queries
- `src/lib/bls-api.ts` — OES queries
- `src/lib/google-places-api.ts` — competitor search
- `src/lib/isochrone.ts` — Google Distance Matrix isochrone approximation
- `src/app/api/fdd/territory/route.ts` — trigger analysis
- `src/app/(dashboard)/fdd/territory/[fddId]/page.tsx` — territory report UI

**Prompt:** See Part 8 — Prompt 3 (Territory Narrative)

**Acceptance criteria:**
- [ ] Census ACS query returns population, income, demographics for trade area
- [ ] Google Places returns competitor count within trade area
- [ ] Isochrone used for inbound models, radius for outbound
- [ ] Category-specific weights applied to scoring
- [ ] Cannibalization check runs against nearest same-brand unit
- [ ] AADT pulled for QSR/retail/fitness (where location is known)
- [ ] Data gaps surface honestly in output (not silently omitted)

---

### FDD-4: Questions + Profile Match

**Goal:** Generate personalized franchisor questions from flags. Score profile match.

**Files to create/modify:**
- `src/lib/questions-generator.ts` — flag → question mapping
- `src/lib/profile-match.ts` — CaseProfile × FDD scoring
- `src/app/api/fdd/questions/route.ts`
- `src/app/(dashboard)/fdd/questions/[fddId]/page.tsx`

**Prompt:** See Part 8 — Prompt 4 (Questions Generator)

**Acceptance criteria:**
- [ ] Each risk flag maps to 1–3 specific questions
- [ ] Questions include "what to listen for" guidance
- [ ] Validation + former franchisee questions always included
- [ ] Questions sorted by importance (critical → important → recommended)
- [ ] Profile match produces 0–100 score with gap explanations
- [ ] Gaps converted to action items

---

### FDD-5: Final Report + Platform Integration

**Goal:** Assemble full report. Write back key fields to `answers`. Show teaser to non-buyers. Integrate with generation engine.

**Files to create/modify:**
- `src/app/(dashboard)/fdd/report/[fddId]/page.tsx` — full report UI
- `src/lib/fdd-to-answers.ts` — write extracted FDD fields to answers table
- `src/lib/generation-engine.ts` — inject `[FDD_CONTEXT]` block
- `src/components/fdd/FddTeaserCard.tsx` — teaser for Simulator page
- `src/app/api/fdd/report/route.ts` — report assembly endpoint

**Prompt:** See Part 8 — Prompt 5 (Final Report Narrative)

**Acceptance criteria:**
- [ ] Full report renders all 5 sections: extraction summary, E-2 score, territory, questions, profile match
- [ ] Key FDD fields written back to `answers` table after analysis
- [ ] Generation engine picks up `[FDD_CONTEXT]` when `fdd_analysis_id` exists
- [ ] Teaser card renders on Simulator results page for non-buyers
- [ ] Teaser shows 3 real metrics + flag count + 3 sample questions
- [ ] Multi-FDD comparison works for up to 3 uploaded FDDs

---

## PART 8 — LLM PROMPTS (Copy-Ready)

### Prompt 1 — FDD Extraction

```markdown
You are an expert franchise attorney and investment due diligence analyst with 20 years of experience reviewing Franchise Disclosure Documents under the FTC Franchise Rule (16 CFR Part 436).

You are extracting structured data from the following FDD text. Extract exactly the fields listed below. For each field:
- Return the value as specified
- Include `_page` (page number where found, integer)
- Include `_quote` (exact source text, max 200 characters)
- Include `_conf` (`high` | `medium` | `low`)

If a field is not present in the document, return `null` for the value and `"not_disclosed"` for `_conf`.

**DOCUMENT TEXT:**
{fdd_text}

**EXTRACT THE FOLLOWING FIELDS:**

ITEM 1:
- franchisor_legal_name (text)
- parent_company (text or null)
- headquarters_state (text)
- year_business_began (integer)
- year_franchising_began (integer)
- total_franchise_units_current (integer)
- fdd_effective_date (ISO date string YYYY-MM-DD)
- fdd_fiscal_year_covered (integer — the fiscal year the financial data represents)
- registered_states_list (array of state codes where franchisor is registered to sell)
- state_addendum_present (boolean — is there a state-specific addendum?)
- state_addendum_key_differences (text — if present, what does the addendum change? null if absent)

ITEM 2:
- executive_franchise_experience_years (integer — combined years of franchise industry experience of top 3 listed executives)
- executive_prior_brands (integer — number of distinct franchise brands they have run)

ITEM 3:
- active_litigation_count (integer)
- franchisee_initiated_suits (integer — suits brought BY franchisees)
- regulatory_actions_count (integer — government or regulatory body actions)
- litigation_pattern_summary (text — 2–3 sentence plain English summary of recurring themes, or "No material litigation disclosed")

ITEM 4:
- franchisor_bankruptcy_history (boolean)
- executive_bankruptcy_history (boolean)
- bankruptcy_details (text or null)

ITEM 5:
- initial_franchise_fee (integer, in USD)
- fee_is_refundable (boolean — true if any refund is possible)
- fee_refund_conditions (text — under what conditions, or "Non-refundable" if none)

ITEM 6:
- royalty_rate_pct (float — as decimal, e.g. 0.06 for 6%)
- royalty_basis (text — "gross revenue" | "net revenue" | "flat fee" | describe if other)
- marketing_fund_pct (float — as decimal)
- technology_fee_monthly (integer, USD, or null)
- other_recurring_fees (text — describe any additional ongoing fees)
- fee_escalation_rights (boolean — can franchisor raise fees unilaterally?)

ITEM 7:
- total_investment_min (integer, USD)
- total_investment_max (integer, USD)
- component_real_estate (text — range as stated, e.g. "$5,000–$15,000")
- component_equipment (text — range)
- component_initial_inventory (text — range or null)
- component_working_capital (text — range)
- component_franchise_fee (integer, USD)
- component_training_travel (text — range)
- working_capital_months_covered (integer — how many months of operations does WC estimate cover?)
- estimated_cogs_pct (float — your expert estimate of COGS as % of revenue for this franchise category, based on industry norms. State your reasoning in the _quote field.)

ITEM 11:
- initial_training_hours (integer — total hours of initial training program)
- ongoing_training_available (boolean)
- field_support_visits (text — frequency description)
- training_location (text)
- typical_fte_employees (integer — typical full-time equivalent employees at a mature unit)
- opening_day_employees (integer — US workers hired at opening, excluding investor)
- investor_role (text — "active owner-operator" | "semi-passive" | "passive" — based on the described management structure)
- investor_hours_per_week (integer — if disclosed, else estimate based on role)
- typical_time_to_open_months (integer — realistic months from signing to first day of operations)

ITEM 12:
- territory_type (text — "exclusive" | "protected" | "none")
- territory_definition (text — how territory is defined)
- ecommerce_carve_out (boolean — can franchisor sell in territory via e-commerce?)
- nontraditional_location_carve_out (boolean — airports, gas stations, etc. excluded?)
- territory_size_households (integer — if a specific number is stated, else null)
- right_of_first_refusal (boolean — on adjacent territories)
- franchisor_minimum_separation_miles (float — if a specific distance is stated, else null)

ITEM 17:
- initial_term_years (integer)
- renewal_available (boolean)
- renewal_on_current_terms (boolean — true if franchisee can renew on same terms; false if must sign new agreement)
- termination_triggers_count (integer — count distinct termination trigger events)
- cure_period_days (integer — shortest cure period for curable defaults, 0 if any are uncurable without notice)
- transfer_fee (integer, USD)
- post_termination_noncompete_years (integer)
- post_termination_noncompete_radius_miles (integer)
- transfer_approval_timeline_days (integer — how many days franchisor has to approve/reject a sale)
- right_of_first_refusal_on_sale (boolean — franchisor can match any offer)
- transfer_to_entity_allowed (boolean — can franchise be held by LLC or corporation?)

ITEM 19:
- item19_present (boolean)
- item19_metric_type (text — "gross_revenue" | "net_income" | "EBITDA" | "multiple" | null)
- item19_fiscal_year (integer — what fiscal year this data covers)
- item19_auv (integer, USD — average unit volume if stated)
- item19_median (integer, USD)
- item19_mean (integer, USD)
- item19_high (integer, USD)
- item19_low (integer, USD)
- item19_units_included (integer)
- item19_pct_system_included (float — as decimal, e.g. 0.72 for 72%)
- item19_includes_franchisee_units (boolean — false if company/affiliate units only)
- item19_footnote_exclusions (text — what was excluded and stated reason, or null)
- item19_cherry_pick_flag (boolean — true if you assess the disclosure as selectively presenting top performers without full system context. Explain in _quote.)

ITEM 20:
- total_units_open_current (integer)
- units_opened_yr1 (integer — most recent year)
- units_opened_yr2 (integer)
- units_opened_yr3 (integer)
- units_closed_yr1 (integer)
- units_closed_yr2 (integer)
- units_closed_yr3 (integer)
- franchisee_initiated_closures_3yr (integer — voluntary exits by franchisee)
- franchisor_initiated_terminations_3yr (integer — terminated by franchisor)
- former_franchisee_contacts_available (boolean — Item 20 contact list present and populated)

ITEM 21:
- audit_opinion (text — "unqualified" | "qualified" | "adverse" | "review_only")
- years_of_financials (integer)
- royalty_revenue_trend (text — "growing" | "flat" | "declining" — compare most recent 3 years)
- franchise_fee_revenue_trend (text — "growing" | "flat" | "declining")
- royalty_vs_fee_ratio (float — royalty revenue ÷ total revenue from most recent year)
- franchisor_net_income (integer, USD — most recent year)
- liquidity_ratio (float — current assets ÷ current liabilities, most recent year)
- debt_covenant_flags (boolean — any restrictive debt covenants mentioned in notes)

Return your response as a single valid JSON object. No markdown. No explanation outside the JSON.
```

---

### Prompt 2 — Scoring Narrative

```markdown
You are a senior E-2 visa specialist and franchise investment advisor. You have just analyzed a Franchise Disclosure Document and computed an E-2 compatibility score. Write the narrative sections of the scoring report.

**EXTRACTED FDD DATA:**
{fdd_json}

**COMPUTED SCORES:**
{scores_json}

**INVESTOR PROFILE:**
{case_profile_json}

Write the following narrative sections. Be direct, specific, and honest. Do not soften negative findings. Do not hype positive findings. Write at the level of a senior franchise attorney briefing their client.

**1. OVERALL ASSESSMENT** (2–3 sentences)
State the overall compatibility rating and the single most important reason for it. If INELIGIBLE, state the specific gate that failed. If CAUTION, name the dimension that is weakest.

**2. STRONGEST ARGUMENT FOR E-2** (2–3 sentences)
What is the best thing about this franchise from an E-2 perspective? Be specific — reference actual numbers from the FDD.

**3. BIGGEST CONCERN** (2–3 sentences)
What is the single highest-risk element? What would a consular officer focus on when reviewing this application?

**4. ODE ANALYSIS** (3–4 sentences)
Explain what the investor would realistically take home annually (ODE_mid), how that was calculated, and whether it satisfies the non-marginality standard. Reference the local living wage for {target_state} for context.

**5. TIMING NOTE** (1–2 sentences)
State the timing risk and what it means practically for the E-2 application window.

**6. WHAT TO DO NEXT** (numbered list, 3–5 items)
Specific next steps — not generic advice. Reference the actual flags raised.

Return as a JSON object with keys: overall_assessment, strongest_argument, biggest_concern, ode_analysis, timing_note, next_steps (array of strings).
```

---

### Prompt 3 — Territory Narrative

```markdown
You are a franchise territory analyst and site selection specialist with 20 years of experience approving and rejecting franchise territory applications.

**TERRITORY DATA:**
{territory_data_json}

**FRANCHISE CATEGORY:** {franchise_category}
**TARGET LOCATION:** {target_city}, {target_state} ({target_zip})
**TRADE AREA METHOD:** {trade_area_method}
**TRADE AREA SIZE:** {trade_area_description}

Write a territory analysis narrative with the following sections. Be direct. Name specific numbers. Be honest about data limitations.

**1. MARKET OVERVIEW** (2–3 sentences)
Describe the trade area in plain terms a non-analyst would understand. What kind of market is this?

**2. DEMAND SIGNAL** (2–3 sentences)
How well does the population profile match the target customer for this franchise category? Reference specific demographics.

**3. COMPETITIVE LANDSCAPE** (2–3 sentences)
What is the competitive environment? Is this market underserved, saturated, or balanced? Include cannibalization risk if relevant.

**4. ECONOMIC CONTEXT** (1–2 sentences)
Is this an economically healthy market for this type of business to operate profitably?

**5. E-2 CONNECTION** (2 sentences)
How does this territory analysis support or complicate the E-2 non-marginality argument? Be direct.

**6. DATA LIMITATIONS** (bullet list)
Be honest about what we couldn't determine — missing data sources, coverage gaps, or variables that would change the analysis if known.

Return as a JSON object with keys: market_overview, demand_signal, competitive_landscape, economic_context, e2_connection, data_limitations (array of strings).
```

---

### Prompt 4 — Questions Generator

```markdown
You are a franchise development director and E-2 immigration advisor. A client has completed an FDD analysis. Based on the flags raised, generate a personalized set of questions they should ask at each stage of their due diligence.

**FLAGS RAISED:**
{flags_json}

**FRANCHISE DETAILS:**
{fdd_summary_json}

**INVESTOR PROFILE:**
{case_profile_json}

For each flag, generate 1–3 specific questions. Then add the standard validation and former franchisee questions that apply to any analysis.

For each question, provide:
- `text`: the exact question to ask
- `ask_of`: "franchisor_dev_rep" | "validation_franchisee" | "former_franchisee" | "attorney"
- `triggered_by`: which flag or standard category generated this
- `importance`: "critical" | "important" | "recommended"
- `what_to_listen_for`: one sentence — what a good answer sounds like vs. a red flag answer

Questions should sound like they come from an informed, prepared investor — not a checklist reader. They should be specific to this franchise (use the actual numbers and details from the FDD), not generic templates.

Sort the final list: critical first, then important, then recommended.
Include a `priority_questions` array of the 5 most important questions across all categories.

Return as a JSON object with keys: questions (array), priority_questions (array of 5).
```

---

### Prompt 5 — Final Report Narrative

```markdown
You are a franchise investment advisor, E-2 visa specialist, and territory analyst. You have completed a full analysis of an FDD, a territory market study, and a profile match for a specific investor. Write the executive summary for their final report.

**FULL ANALYSIS DATA:**
- FDD extraction: {fdd_json}
- E-2 compatibility score: {scores_json}
- Territory analysis: {territory_json}
- Profile match: {profile_match_json}
- Investor profile: {case_profile_json}
- Flags raised: {flags_json}

Write the following sections for the final report. This is the document the investor will share with their immigration attorney and franchise attorney. Write with that audience in mind.

**1. EXECUTIVE SUMMARY** (4–5 sentences)
What is the overall verdict on this franchise for this investor in this market? Include the three scores: E-2 compatibility, territory, profile match. State clearly whether you recommend proceeding to attorney review, proceeding with caution, or reconsidering.

**2. KEY STRENGTHS** (3 bullet points)
The three strongest arguments in favor of this franchise for E-2 purposes. Specific numbers required.

**3. KEY CONCERNS** (3 bullet points, or more if flags > 3)
The most important risks, ranked by severity. For each, state what it means practically and what to do about it.

**4. FINANCIAL PICTURE** (2–3 sentences)
What does the ODE model show? What would this investor realistically earn in Year 1, Year 3, Year 5? Does this satisfy non-marginality?

**5. MARKET VERDICT** (2 sentences)
Is this territory a good fit for this franchise? Does the market support the revenue projections?

**6. RECOMMENDED NEXT STEPS** (numbered, 4–6 items)
Specific, actionable, in priority order. Reference the actual flags. Name the specific questions to ask. Name the specific attorney actions needed.

Return as a JSON object with keys: executive_summary, key_strengths (array), key_concerns (array), financial_picture, market_verdict, recommended_next_steps (array).
```

---

## PART 9 — HONEST LIMITATIONS

The following limitations must be disclosed to users in the product UI and in every report. They are not fixable with better engineering.

### What we cannot cover

**1. FDD accuracy is self-reported.**
Franchisors disclose what the FTC Franchise Rule requires. Item 19 data is not independently audited. A technically compliant disclosure can present cherry-picked data in a way that creates a misleading impression. Our cherry-pick detection flag catches obvious cases; subtle cases will pass through.

**2. Our ODE model uses estimated COGS.**
We use industry-standard COGS benchmarks by franchise category. The actual COGS for a specific location will differ. A QSR in a high-wage market will have materially different labor costs than one in a low-wage market. Our ODE_low/mid/high range acknowledges this but cannot eliminate the uncertainty.

**3. Territory data has a 2–3 year lag.**
ACS 5-year estimates are rolling averages. LODES data lags by 18–24 months. BLS occupational data lags by 12–18 months. A rapidly growing suburb may look modestly sized in our data and be dramatically larger on the ground.

**4. Google Places misses unlisted businesses.**
Small competitors with no digital presence, newly opened businesses (< 3 months), and businesses that have not claimed their Google listing will not appear in our competitive count. We may undercount actual competition.

**5. E-2 adjudication is not algorithmic.**
A STRONG compatibility score does not guarantee visa approval. Consular officer discretion, posting-specific approval rates, and geopolitical factors affect outcomes we cannot predict. Our tool improves the odds and the documentation quality; it does not eliminate uncertainty.

**6. We cannot verify the investor's information.**
We use the investor's stated liquid capital, net worth, and management experience. We do not verify these. If the investor overstates their profile, the match scores will be optimistic.

**7. We do not cover resale transactions in FDD-1 through FDD-5.**
The entire schema assumes a new franchise unit. Resale analysis requires the selling unit's actual P&L (not FDD Item 19) and a different valuation framework. This is a Phase D addition.

**8. We do not cover multi-unit development agreements in FDD-1 through FDD-5.**
Multi-unit analysis requires reading the area development agreement (a separate contract from the franchise agreement) and modeling multiple unit openings. This is a Phase D addition.

**9. We cannot confirm visa holder acceptance.**
Whether a specific franchisor accepts non-immigrant visa holders is not disclosed in the FDD. We flag it as "Confirm with franchisor" but cannot verify it automatically.

**10. State addenda may override our scoring.**
In the 14 registration states, state-specific addenda can materially change Item 17 terms, fee caps, and termination rights. We flag when addenda are present, but the user must read them. Our scoring is based on the national FDD terms unless the addendum is included in the uploaded document.

---

## PART 10 — DATABASE SCHEMA

### New table: `fdd_analyses`

```sql
CREATE TABLE fdd_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Intake
  transaction_type TEXT CHECK (transaction_type IN ('new_unit', 'resale', 'multi_unit_development')),
  target_city TEXT,
  target_state TEXT,
  target_zip TEXT,
  investor_liquid_capital INTEGER,
  investor_net_worth INTEGER,

  -- FDD file
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracting', 'extracted', 'failed')),
  extraction_error TEXT,

  -- Extracted fields (JSONB for all 50 fields with _page/_quote/_conf metadata)
  extracted_fields JSONB,

  -- Computed scores
  e2_compatibility_score JSONB,
  territory_analysis JSONB,
  profile_match_score JSONB,
  questions JSONB,
  final_report JSONB,

  -- Status flags
  fdd_stale_flag BOOLEAN DEFAULT false,
  state_registration_gate TEXT CHECK (state_registration_gate IN ('pass', 'warn', 'fail', 'unknown')),
  flag_count INTEGER DEFAULT 0,
  overall_compatibility TEXT CHECK (overall_compatibility IN ('STRONG', 'VIABLE', 'CAUTION', 'INELIGIBLE'))
);

-- RLS: users can only access their own FDD analyses
ALTER TABLE fdd_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fdd_analyses"
  ON fdd_analyses FOR ALL
  USING (user_id = auth.uid());

-- Index for application lookup
CREATE INDEX fdd_analyses_application_id_idx ON fdd_analyses (application_id);
CREATE INDEX fdd_analyses_user_id_idx ON fdd_analyses (user_id);
```

### New table: `fdd_comparisons` (for multi-FDD comparison feature)

```sql
CREATE TABLE fdd_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  fdd_analysis_ids UUID[] NOT NULL,   -- array of 2–3 fdd_analyses IDs
  comparison_output JSONB
);

ALTER TABLE fdd_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own fdd_comparisons"
  ON fdd_comparisons FOR ALL
  USING (user_id = auth.uid());
```
