# FDD Intelligence — Research & Planning Document
**Version:** June 19, 2026
**Status:** Planning only — no code. Produced from Firecrawl research across 7 sources.
**Blocks:** FDD-1 through FDD-4 in the master sprint plan.

---

## WHAT WE ARE BUILDING

A paid add-on where a franchise buyer uploads their FDD PDF → the platform
extracts structured data → scores it for E-2 compatibility → runs a territory
market analysis against their target location → matches against their CaseProfile.

The output is a single report answering:
**"Is this franchise viable for E-2, in this market, given your investment profile?"**

No existing tool does this. The closest are:
- ChainAI — brand discovery by budget/sector, no immigration lens
- Free FDD Library — AI risk report, no immigration lens, no territory analysis
- Apify ParseForge — raw field extraction, no scoring, no territory, no E-2
- Franchise Signal — year-over-year FDD change tracking only

**E2go's unique position:** The only platform that connects FDD data →
E-2 compatibility score → territory viability → visa application documents.

---

## PART 1 — FDD EXTRACTION SCHEMA

### How to read this table
Each field maps to an FDD Item. The "E-2 Use" column explains why we extract it.
Fields marked ★ are the ones that directly drive the E-2 compatibility score.

---

### Item 1 — The Franchisor

| Field | Type | E-2 Use |
|---|---|---|
| franchisor_legal_name | text | Identity verification |
| parent_company | text | Ownership chain check |
| headquarters_state | text | Regulatory jurisdiction |
| year_business_began | integer | Brand maturity signal |
| year_franchising_began | integer | Franchise track record |
| total_franchise_units_current | integer | Scale indicator |
| accepts_nonimmigrant_visa_holders | boolean ★ | Hard gate — if false, stop |

**Note on the last field:** Some major brands (McDonald's, Subway, Chick-fil-A)
explicitly prohibit non-immigrant visa holders. This must be the first check.
If false, the entire analysis is moot. This is not in the FDD itself — it must
be confirmed with the franchisor directly. Flag as "Confirm with franchisor."

---

### Item 3 — Litigation

| Field | Type | E-2 Use |
|---|---|---|
| active_litigation_count | integer ★ | High count = systemic problem signal |
| franchisee_initiated_suits | integer ★ | Most revealing — franchisees suing = unit economics problem |
| regulatory_actions_count | integer ★ | Carries more weight than private suits |
| litigation_pattern_summary | text | LLM-generated plain-English summary of recurring themes |

**Scoring logic:**
- 0 suits = pass
- 1–3 suits, no pattern = warn
- 3+ suits franchisee-initiated OR regulatory action = fail / attorney flag

---

### Item 4 — Bankruptcy

| Field | Type | E-2 Use |
|---|---|---|
| franchisor_bankruptcy_history | boolean ★ | Direct viability concern |
| executive_bankruptcy_history | boolean | Secondary signal |
| bankruptcy_details | text | If yes, what and when |

---

### Item 5 — Initial Franchise Fee

| Field | Type | E-2 Use |
|---|---|---|
| initial_franchise_fee | integer ★ | Counts toward E-2 qualifying investment |
| fee_is_refundable | boolean ★ | Non-refundable = "at risk" — required for E-2 |
| fee_refund_conditions | text | If refundable, under what conditions |

**E-2 rule:** The franchise fee must be non-refundable (or at-risk) to count
toward the qualifying investment. A fully refundable fee is not "at risk" and
weakens the investment argument. Officers know this.

---

### Item 6 — Ongoing Fees

| Field | Type | E-2 Use |
|---|---|---|
| royalty_rate_pct | float ★ | Critical for projection modeling |
| royalty_basis | text | Gross revenue / net revenue / flat fee |
| marketing_fund_pct | float ★ | Reduces effective margin |
| technology_fee_monthly | integer | Reduces effective margin |
| other_recurring_fees | text | Full fee stack for P&L modeling |
| total_ongoing_fee_pct | float ★ | LLM-calculated: royalty + marketing + tech |
| fee_escalation_rights | boolean | Franchisor can raise unilaterally = risk |

**Why this matters for E-2:** The total ongoing fee burden directly reduces
net income. Officers evaluate non-marginality on net, not gross. A 6% royalty
+ 2% marketing + tech fees on a modest AUV can collapse the margin argument.

---

### Item 7 — Estimated Initial Investment

| Field | Type | E-2 Use |
|---|---|---|
| total_investment_min | integer ★ | Lower bound of qualifying investment |
| total_investment_max | integer ★ | Upper bound |
| component_real_estate | text | Range — rent deposit + build-out |
| component_equipment | text | Range |
| component_initial_inventory | text | Range |
| component_working_capital | text | Range — most often underestimated |
| component_franchise_fee | integer | Confirmed from Item 5 |
| component_training_travel | text | Range |
| component_signage_misc | text | Range |
| working_capital_months_covered | integer | How many months the Item 7 WC estimate covers |

**Critical insight from research:** "The working capital estimate in Item 7
typically covers the first three to six months of operations. Many franchise
systems take longer than that to reach breakeven." Our scoring should flag
when WC estimate < 6 months and the investment is near the lower end of the range.

**E-2 proportionality check:** Investment must be substantial relative to
total cost of the enterprise. We derive: `investor_committed / total_investment_min`
and `investor_committed / total_investment_max`. Both ratios feed the
proportionality score. 9 FAM 402.9-6(D) standard.

---

### Item 8 — Restrictions on Sources

| Field | Type | E-2 Use |
|---|---|---|
| supply_restrictions | text | Open vs restricted — affects operating costs |
| designated_supplier_markup | text | If known — margin impact |

---

### Item 11 — Training and Support

| Field | Type | E-2 Use |
|---|---|---|
| initial_training_hours | integer ★ | Supports "develop and direct" — shows investor learns to operate |
| ongoing_training_available | boolean | Continuing support = lower failure risk |
| field_support_visits | text | Frequency of franchisor site visits |
| training_location | text | Where training occurs |

**E-2 use:** The training structure helps rebut the "passive investment" concern.
An investor who completes 160+ hours of initial training and ongoing field support
clearly "develops and directs" the enterprise. This feeds the qualifications document.

---

### Item 12 — Territory

| Field | Type | E-2 Use |
|---|---|---|
| territory_type | enum ★ | exclusive / protected / none |
| territory_definition | text | How it's defined (population, ZIP codes, radius, etc.) |
| ecommerce_carve_out | boolean | Franchisor can sell online inside territory |
| nontraditional_location_carve_out | boolean | Airports, malls, etc. carved out |
| territory_size_households | integer | If specified |
| right_of_first_refusal | boolean | On adjacent territories |

**Key distinction from research:** "Protected territory vs. exclusive territory:
These terms are not synonymous." Protected = bars other franchisees. Exclusive =
bars all franchisor channels including e-commerce and institutional. We score
exclusive as pass, protected as warn, none as fail.

---

### Item 17 — Renewal, Termination, Transfer

| Field | Type | E-2 Use |
|---|---|---|
| initial_term_years | integer ★ | Must cover E-2 renewal horizon (5+ years) |
| renewal_available | boolean | Can investor renew? |
| renewal_on_current_terms | boolean ★ | False = forced to sign new (potentially worse) agreement |
| termination_triggers_count | integer | More triggers = more risk |
| cure_period_days | integer ★ | 0 = high risk; < 30 = warn |
| transfer_fee | integer | Cost to sell the business |
| post_termination_noncompete_years | integer | How long investor is locked out |
| post_termination_noncompete_radius_miles | integer | Geographic scope |

**E-2 specific concern:** A short initial term (< 5 years) or renewal that
requires signing a new agreement is a material risk for E-2 status holders who
need to demonstrate ongoing business operations at renewal.

---

### Item 19 — Financial Performance Representations

| Field | Type | E-2 Use |
|---|---|---|
| item19_present | boolean ★ | Absent = major limitation for projections |
| item19_metric_type | enum | gross_revenue / net_income / EBITDA / multiple |
| item19_aув | integer ★ | Average unit volume — primary headline figure |
| item19_median | integer ★ | Middle performer — more reliable than mean |
| item19_mean | integer | Can be skewed by outliers |
| item19_high | integer | Highest performer |
| item19_low | integer ★ | Lowest performer — reality check |
| item19_units_included | integer | How many units in the calculation |
| item19_pct_system_included | float ★ | Low % = cherry-picking risk |
| item19_includes_franchisee_units | boolean ★ | Company-only data = red flag if franchise units exist |
| item19_median_vs_mean_gap | float | LLM-calculated: large gap = high variability |
| item19_footnote_exclusions | text | What was removed and why |
| item19_cherry_pick_flag | boolean ★ | LLM assessed: top-quartile only without system-wide data? |

**Key research finding:** NASAA rules require that when an average is disclosed,
the median must also be shown — and vice versa. A wide mean/median gap signals
high performance variability. An Item 19 that shows only the top quartile without
disclosing that threshold is "technically compliant but deliberately selective."

**When Item 19 is absent:** projections must come from (a) existing franchisee
validation calls, (b) industry comparables, (c) local market research. We flag
this clearly and route the user to our market analysis module.

---

### Item 20 — Outlets and Franchisee Information

| Field | Type | E-2 Use |
|---|---|---|
| total_units_open_current | integer | System scale |
| units_opened_yr1 | integer | Growth trajectory |
| units_opened_yr2 | integer | |
| units_opened_yr3 | integer | |
| units_closed_yr1 | integer ★ | Closures signal unit economics problems |
| units_closed_yr2 | integer ★ | |
| units_closed_yr3 | integer ★ | |
| franchisee_initiated_closures_3yr | integer ★ | Most revealing — voluntary exits |
| franchisor_initiated_terminations_3yr | integer ★ | Aggressive enforcement or failing franchisees |
| churn_rate_pct | float ★ | LLM-calculated: exits / avg unit count |
| avg_tenure_years | float | If determinable from disclosure |
| former_franchisee_contacts_available | boolean | Item 20 contact list present |

**Key research finding:** "If a franchise has had several owners in a short time,
maybe the location isn't a moneymaker or perhaps the franchisor hasn't lived up
to its promises of support." Former franchisees (not current) are the most
candid validation sources.

**Churn rate scoring:**
- < 5% annual churn = pass
- 5–12% = warn
- > 12% = fail

---

### Item 21 — Audited Financials

| Field | Type | E-2 Use |
|---|---|---|
| audit_opinion | enum ★ | unqualified / qualified / adverse |
| years_of_financials | integer | 3 years required by FTC |
| royalty_revenue_trend | enum | growing / flat / declining |
| franchise_fee_revenue_trend | enum | growing / flat / declining |
| royalty_vs_fee_ratio | float ★ | High royalty share = existing franchisees succeeding |
| franchisor_net_income | integer | Profitability of the franchisor itself |
| liquidity_ratio | float | Current assets / current liabilities |
| debt_covenant_flags | boolean | Restrictive debt covenants in notes = risk |

**Key research finding:** A healthy franchisor earns more from royalties
(existing franchisees succeeding) than from franchise fees (dependent on
selling new franchises). A declining royalty-to-fee ratio is a systemic
warning sign.

---

## PART 2 — E-2 COMPATIBILITY SCORING RUBRIC

### Scoring output
Each dimension returns: **PASS** / **WARN** / **FAIL** / **REVIEW** (needs attorney)

The overall compatibility score is: `STRONG` / `VIABLE` / `CAUTION` / `INELIGIBLE`

---

### Dimension 1 — Eligibility Gates (any FAIL = INELIGIBLE overall)

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Accepts non-immigrant visa holders | Confirmed yes | Unconfirmed | Confirmed no |
| Business model is active (not passive) | Investor operates | Management company involved | Fully passive / vending / kiosk |
| Solo-operator risk | Employs multiple staff | 1–2 employees | Investor IS the sole worker |
| Initial franchise fee at-risk | Non-refundable | Conditional refund | Fully refundable |

---

### Dimension 2 — Investment Substantiality

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Total investment min vs E-2 threshold | > $150K | $80–150K | < $80K |
| Investor committed / total investment min | > 70% | 40–70% | < 40% |
| Investor committed / total investment max | > 50% | 30–50% | < 30% |
| Franchise fee non-refundable (at risk) | Yes | Conditional | No |

---

### Dimension 3 — Non-Marginality Evidence

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Item 19 present | Yes, system-wide | Yes, cherry-picked | Absent |
| Item 19 median revenue | > 3× local living wage | 1.5–3× | < 1.5× |
| Churn rate | < 5% annually | 5–12% | > 12% |
| Franchisor royalty revenue trend | Growing | Flat | Declining |
| Audit opinion | Unqualified | — | Qualified or adverse |

---

### Dimension 4 — Develop and Direct

| Check | PASS | WARN | FAIL |
|---|---|---|---|
| Initial training hours | > 80 hours | 40–80 | < 40 |
| Investor controls operations | Yes | Shared / co-managed | Management company retains control |
| Territory type | Exclusive | Protected | None |
| Initial term | ≥ 5 years | 3–5 years | < 3 years |

---

### Dimension 5 — Risk Flags

Each of these adds a flag to the report (does not auto-fail but adds attorney review note):

- Litigation: franchisee-initiated suits ≥ 3
- Item 19 excludes franchise units (company-only data)
- Mean/median gap > 30% (high performance variability)
- Working capital estimate < 6 months
- Renewal requires signing new agreement
- Cure period < 10 days
- Post-termination non-compete > 2 years / > 50 mile radius
- Fee escalation rights (franchisor can raise unilaterally)
- E-commerce carve-out in territory
- Franchisor bankruptcy history

---

## PART 3 — TERRITORY MARKET ANALYSIS

### What we are analyzing
Whether the investor's target territory can support the franchise model
at the revenue levels needed to satisfy E-2 non-marginality.

### Data sources (all free/public APIs)

| Source | What we pull | Why |
|---|---|---|
| U.S. Census Bureau ACS 5-Year | Population, age, income, household composition, education | Customer profile |
| Census LEHD LODES | Daytime population, jobs by NAICS, wage tiers at census-block level | Service-area workforce |
| BLS Occupational Employment | Employment by industry, location quotients, wages | Local demand signal |
| Google Places API | Competitor count and proximity within trade area | Competitive pressure |
| Census Business Patterns | Establishment count by NAICS in county/ZIP | Market saturation |

### Trade area definition (matched to franchise model type)

| Franchise Type | Method | Size |
|---|---|---|
| Inbound (restaurant, fitness, retail, clinic) | Drive-time isochrone | 5–15 minutes |
| Outbound (cleaning, HVAC, pest control, home care) | Radius | 10–20 miles |
| B2B services | Radius from business districts | 15–25 miles |

**Key insight from research:** "A 3-mile radius can be 6 minutes in a suburb
or 40 minutes in a dense urban grid." We use drive-time isochrones, not radius
circles, for all inbound models.

### Variables we score

**Customer density**
- Total population in trade area
- Target customer segment density (derived from business category)
  - Home services: households with homeowners 35–65, HHI > $75K
  - Child care: households with children under 10
  - Senior care: population 75+
  - Fitness: adults 25–55, HHI > $60K
  - QSR/restaurant: daytime + residential population within 10 min
- Population growth trajectory (5-year trend)

**Economic strength**
- Median household income
- Income trajectory (growing / flat / declining)
- Unemployment rate vs. state average
- Educational attainment (relevant for B2B / professional services)
- Homeownership rate (relevant for home services)

**Competitive pressure**
- Direct competitor count within trade area (Google Places)
- Competitor density score (count / population)
- Nearest same-brand unit distance (cannibalization risk)
- Market saturation index (competitors per 10,000 target customers)

### Scoring output

**Territory Score: STRONG / VIABLE / MARGINAL / WEAK**

Each of the three dimensions (customer density, economic strength, competitive
pressure) scores 0–100. Overall score = weighted composite:
- Customer density: 40%
- Economic strength: 35%
- Competitive pressure: 25%

Territory score thresholds:
- 80–100 = STRONG
- 60–79 = VIABLE
- 40–59 = MARGINAL
- < 40 = WEAK

### E-2 connection

The territory score connects directly to the non-marginality argument:
a STRONG territory score = credible projection basis.
A MARGINAL or WEAK score = officer will scrutinize projections harder.
We surface this explicitly: "Your territory analysis supports / does not support
the revenue projections in your business plan."

---

## PART 4 — PROFILE MATCHING (FDD-3)

### What this does
Scores the FDD against the user's CaseProfile — not just "does this franchise
fit E-2 in general" but "does it fit THIS investor."

### Match dimensions

| Dimension | CaseProfile field | FDD field |
|---|---|---|
| Investment fit | net_worth, liquid_capital | total_investment_min/max |
| Industry fit | business_background, industry | franchise_category |
| Management fit | management_experience | training_hours, develop_and_direct |
| Timeline fit | target_interview_date | initial_term_years, training_duration |
| Family fit | family_situation | territory_location vs. investor's target state |

### Output
A match score (0–100) with plain-English explanation of fit and gaps.
Gaps become action items: "Your liquid capital is below the Item 7 minimum —
you would need to demonstrate access to additional funds."

---

## PART 5 — MULTI-FDD COMPARISON (FDD-4)

### What this does
Side-by-side comparison of up to 3 FDDs the investor is evaluating,
ranked by E-2 compatibility score, territory score, and profile match.

### Comparison table columns
- Franchise name
- Total investment range
- Royalty + fee burden (total %)
- Item 19 AUV (median)
- Churn rate
- Territory type
- E-2 compatibility score
- Territory score (for their target market)
- Profile match score
- Top 2 risks
- Recommended action

---

## PART 6 — KEY DECISIONS STILL NEEDED FROM OWNER

Before FDD-1 can be built, you need to confirm:

### 1. Do we extract all 23 FDD items or a focused subset?
**Recommendation:** Extract Items 1, 3, 4, 5, 6, 7, 11, 12, 17, 19, 20, 21
(12 of 23 items). Items 2, 8–10, 13–16, 18, 22–23 are legally technical
sections (relationship disclosures, supplier obligations, public figures,
trademarks) with minimal E-2 relevance. Focusing on the 12 items above
gives us the ~45 fields in the schema above.

### 2. What is the fallback when Item 19 is absent?
**Recommendation:** Two fallback paths:
- Path A: Route to territory analysis — "We'll estimate revenue potential
  from your target market's demographics and BLS industry data"
- Path B: Ask for existing franchisee validation call notes — user types
  what they learned, we use it to anchor projections

### 3. Do we generate a business plan narrative from the FDD analysis?
**Recommendation:** Yes — this is the killer differentiator. The FDD
extraction feeds directly into the generation engine's business plan
prompt. The investor doesn't build projections manually — the FDD IS
the data source. This requires FDD-1 to integrate with the existing
generation pipeline.

### 4. Territory analysis: do we use paid APIs or Census Bureau only?
**Recommendation:** Start with free APIs (Census ACS, LODES, BLS, Google
Places free tier). Paid options (SiteSeer, Maptive, PRIZM) add precision
but cost $500–$2,000/month. Phase 1: free data only. Phase 2: if territory
score is a premium feature, add paid data sources.

### 5. Where does the user enter their target territory?
**Recommendation:** City + State + target ZIP code. From this we derive
the drive-time isochrone or radius using Google Maps Distance Matrix API
(free tier: 40,000 calls/month).

---

## PART 7 — THE LEGAL DISCLAIMER LAYER

Every output screen must include:

> "This analysis is based on disclosed information in the FDD and publicly
> available market data. It does not constitute legal, financial, or
> franchise advice. FDD disclosures are self-reported by franchisors and
> may not reflect current conditions. Always engage a qualified franchise
> attorney and immigration attorney before making any investment decision."

Specific to Item 19:
> "Financial performance representations in Item 19 are historical figures
> from existing units. Your individual results may differ. There is no
> assurance that you will achieve these results."

---

## RESEARCH SOURCES

1. Pollak Immigration Law — FDD review for E-2 visa
2. e2visalawyer.net (Bobby Chung) — E-2 + franchise analysis
3. FTC.gov — Official FDD guidance and FPR rules
4. NASAA — Item 19 disclosure standards (mean/median requirement)
5. Free FDD Library — AI risk report methodology
6. FRANdata — Institutional FDD database structure
7. Apify ParseForge — Structured FDD extraction schema (23 fields)
8. Population Explorer / Maptive — Franchise territory scoring methodology
9. SiteSeer / Smappen — Trade area definition and report format
10. BLS / Census Bureau — Public data source documentation
