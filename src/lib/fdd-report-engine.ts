// ============================================================================
// FDD Intelligence — Professional Report Engine
// ============================================================================
// Produces the full professional franchise analysis report — equivalent to
// what a senior franchise consultant charges $3,000–$8,000 to produce manually.
//
// Voice: investment advisor + franchise director + immigration specialist.
// Opinionated. Benchmark-driven. No hedging. Every claim grounded in FDD data.
//
// Models: FDD chain via callFDDModel — Opus primary, Sonnet 5 fallback,
// GLM 5.2 (OpenRouter) last resort. See llm-client.ts.
// Run sections in parallel; executive summary runs last (synthesises all).
// ============================================================================

import { callFDDModel } from '@/lib/llm-client';
import type { FddExtractedFields, FddFieldMeta } from '@/types/fdd';
import type { ScoringResult, OdeAssessment } from '@/lib/fdd-scoring-engine';
import { classifyCategory, type TerritoryAnalysis } from '@/lib/fdd-territory-engine';

// ============================================================================
// Report section types
// ============================================================================

export type InvestmentRecommendation = 'PROCEED' | 'PROCEED_WITH_CONDITIONS' | 'DO_NOT_PROCEED';
export type RiskRating = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type SystemHealthRating = 'EXPANDING' | 'STABLE' | 'CONTRACTING' | 'DISTRESSED';
export type FinancialHealthRating = 'STRONG' | 'ADEQUATE' | 'WEAK' | 'DISTRESSED';

export interface Benchmark {
  label: string;
  this_franchise: string;
  industry_median: string;
  rating: 'better' | 'inline' | 'worse' | 'unknown';
}

export interface RiskMatrixItem {
  category: string;
  risk: string;
  severity: RiskRating;
  specific_consequence: string;
  mitigation: string;
  pre_signing_action_required: boolean;
  fdd_item_reference: string;
}

export interface ExecutiveSummary {
  recommendation: InvestmentRecommendation;
  recommendation_rationale: string;
  strengths: Array<{ title: string; evidence: string }>;
  risks: Array<{ title: string; consequence: string }>;
  conditions: string[];
  key_metrics: {
    investment_range: string;
    item19_auv: string;
    ode_central: string;
    e2_score: string;
    system_churn: string;
    payback_period_years: string;
  };
  one_line_verdict: string;
}

export interface LegalRiskAssessment {
  overall_rating: RiskRating;
  litigation: {
    total_active_suits: number | null;
    franchisee_pattern: string;
    pattern_assessment: string;
    red_flags: string[];
  };
  bankruptcy: {
    history_present: boolean;
    assessment: string;
  };
  regulatory_actions: string;
  attorney_priority_items: string[];
  analyst_commentary: string;
}

export interface FeeWaterfallLine {
  label: string;
  pct_of_gross: number;
  annual_on_auv: number | null;
  note: string;
}

export interface FeeStructureAnalysis {
  gross_revenue_assumption: number | null;
  waterfall: FeeWaterfallLine[];
  total_franchisor_take_pct: number;
  franchisee_gross_profit_pct: number;
  category_royalty_benchmark: string;
  fee_burden_rating: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXCESSIVE';
  fee_escalation_risk: string;
  hidden_cost_warnings: string[];
  analyst_commentary: string;
}

export interface FinancialPerformanceAnalysis {
  item19_present: boolean;
  item19_quality_rating: 'RELIABLE' | 'ADEQUATE' | 'QUESTIONABLE' | 'ABSENT';
  item19_quality_issues: string[];
  revenue_distribution: {
    high: number | null;
    mean: number | null;
    median: number | null;
    low: number | null;
    units_reporting: number | null;
    pct_system_reporting: number | null;
  };
  ode_scenarios: {
    conservative: { auv: number | null; ode: number | null; assumption: string };
    central: { auv: number | null; ode: number | null; assumption: string };
    optimistic: { auv: number | null; ode: number | null; assumption: string };
  };
  payback_period_years: number | null;
  break_even_monthly_revenue: number | null;
  non_marginality_verdict: 'PASSES' | 'BORDERLINE' | 'FAILS' | 'INSUFFICIENT_DATA';
  non_marginality_explanation: string;
  year_projections: {
    year1: { revenue: number | null; ode: number | null };
    year3: { revenue: number | null; ode: number | null };
    year5: { revenue: number | null; ode: number | null };
  };
  analyst_commentary: string;
}

export interface SystemHealthAnalysis {
  overall_rating: SystemHealthRating;
  net_unit_change_3yr: number | null;
  churn_rate_annual: number | null;
  churn_benchmark_note: string;
  openings_3yr: number | null;
  closures_3yr: number | null;
  terminations_franchisor_3yr: number | null;
  terminations_franchisee_3yr: number | null;
  renewal_rate_indicator: string;
  validation_strategy: string;
  red_flags: string[];
  analyst_commentary: string;
}

export interface FranchisorFinancialHealth {
  overall_rating: FinancialHealthRating;
  revenue_trend: string;
  royalty_vs_fee_ratio: {
    royalty_pct: number | null;
    franchise_fee_pct: number | null;
    interpretation: string;
  };
  audit_opinion: string;
  liquidity_assessment: string;
  insolvency_risk: RiskRating;
  support_capacity_assessment: string;
  analyst_commentary: string;
}

export interface E2CompatibilityDeepDive {
  overall_verdict: 'STRONG' | 'VIABLE' | 'CAUTION' | 'INELIGIBLE';
  dimensions: {
    eligibility_gates: { verdict: string; regulatory_basis: string; what_officer_looks_for: string; documentation_required: string[] };
    investment_substantiality: { verdict: string; regulatory_basis: string; what_officer_looks_for: string; documentation_required: string[] };
    non_marginality: { verdict: string; regulatory_basis: string; what_officer_looks_for: string; documentation_required: string[] };
    develop_and_direct: { verdict: string; regulatory_basis: string; what_officer_looks_for: string; documentation_required: string[] };
  };
  consular_risk_factors: string[];
  business_plan_requirements: string[];
  attorney_review_priority_items: string[];
  timing_warning: string | null;
}

export interface FddProfessionalReport {
  franchise_name: string;
  report_version: '2.0';
  generated_at: string;
  executive_summary: ExecutiveSummary;
  legal_risk: LegalRiskAssessment;
  fee_structure: FeeStructureAnalysis;
  financial_performance: FinancialPerformanceAnalysis;
  system_health: SystemHealthAnalysis;
  franchisor_financial_health: FranchisorFinancialHealth;
  e2_compatibility: E2CompatibilityDeepDive;
  risk_matrix: RiskMatrixItem[];
}

// ============================================================================
// Shared analyst system prompt — establishes voice for all sections
// ============================================================================

const ANALYST_SYSTEM = `You are a senior franchise investment analyst with 20 years of experience
advising high-net-worth investors on franchise acquisitions. You have reviewed over 2,000 FDDs
across 400 franchise systems. You hold deep expertise in E-2 treaty investor visa requirements
under 9 FAM 402.9 and have supported over 300 E-2 visa applicants through franchise investments.

Your analytical voice:
- OPINIONATED AND DIRECT. You give clear verdicts, not "it depends" hedges. If the data supports
  a strong view, take it.
- BENCHMARK-DRIVEN. Compare every metric against the category-specific and structural benchmarks
  supplied to you in this prompt. Numbers without context are useless — but never invent a
  statistic, a study finding, or a named-source citation that was not given to you. If you don't
  have a number for something, say so and reason qualitatively instead.
- REGULATORY-PRECISE. Cite 9 FAM chapter and section, INA section, or FTC Rule 436 references
  when making legal or visa-related assessments.
- CONSEQUENCE-FOCUSED. For every risk identified, state the specific consequence for THIS
  investor's E-2 application or financial outcome — not generic warnings.
- NEVER GENERIC. Every statement must be grounded in the data provided. No boilerplate language
  that could apply to any franchise.
- PLAIN ENGLISH. Your clients are sophisticated investors, not attorneys. Translate complexity
  into clear, actionable language.

Return ONLY valid JSON matching the schema specified. No prose outside the JSON object.`;

// ============================================================================
// Helper — extract numeric field value
// ============================================================================

function n(meta: FddFieldMeta | undefined): number | null {
  const v = meta?.value;
  return typeof v === 'number' ? v : null;
}

function s(meta: FddFieldMeta | undefined): string | null {
  const v = meta?.value;
  return typeof v === 'string' ? v : null;
}

function b(meta: FddFieldMeta | undefined): boolean | null {
  const v = meta?.value;
  return typeof v === 'boolean' ? v : null;
}

function currency(val: number | null): string {
  if (val === null) return 'Not disclosed';
  return `$${val.toLocaleString()}`;
}

function _pct(val: number | null, decimals = 1): string {
  if (val === null) return 'Not disclosed';
  return `${(val * 100).toFixed(decimals)}%`;
}

// ============================================================================
// Section 1 — Legal Risk Assessment
// ============================================================================

async function generateLegalRisk(
  fields: FddExtractedFields,
  franchiseName: string
): Promise<LegalRiskAssessment> {
  const litigationCount = n(fields.franchisee_initiated_suits) ?? n(fields.active_litigation_count) ?? 0;
  const bankruptcyHistory = b(fields.franchisor_bankruptcy_history);
  const bankruptcyDetails = s(fields.bankruptcy_details) ?? 'Not detailed in FDD';
  const litigationSummary = s(fields.litigation_pattern_summary) ?? 'No summary extracted';
  const regulatoryActions = n(fields.regulatory_actions_count) ?? 0;
  const execBankruptcy = b(fields.executive_bankruptcy_history);
  const fddAgeMonths = n(fields.fdd_age_months);

  const prompt = `Analyze the legal risk profile for this franchise investment.

FRANCHISE: ${franchiseName}

LITIGATION DATA (Item 3):
- Franchisee-initiated lawsuits: ${litigationCount}
- Regulatory actions: ${regulatoryActions}
- Litigation pattern summary from FDD: "${litigationSummary}"
- FDD age: ${fddAgeMonths !== null ? `${fddAgeMonths} months` : 'Unknown'}

BANKRUPTCY DATA (Item 4):
- Franchisor bankruptcy history: ${bankruptcyHistory === true ? 'YES — disclosed' : bankruptcyHistory === false ? 'None disclosed' : 'Not determinable'}
- Details: ${bankruptcyDetails}
- Executive/principal bankruptcy: ${execBankruptcy === true ? 'YES' : execBankruptcy === false ? 'None' : 'Not disclosed'}

INDUSTRY BENCHMARKS FOR CONTEXT:
- Healthy franchise systems with 100–500 units typically show 0–3 suits over 5 years
- A suit count materially above that range relative to system size is a structural pattern, not
  an isolated incident — treat it as a serious flag and say so directly, but do not cite a
  specific closure-rate percentage or named study you were not given.
- FTC Rule 436 requires disclosure of all suits in the past 10 years — any pattern across similar
  dispute types (fee disputes, territorial violations, misrepresentation) is highly material
- Bankruptcy within past 10 years of any franchisor officer or principal is a serious red flag
  under Item 4 — courts have upheld that it indicates risk to franchisee support
- Systems in growth mode (>50 new units/yr) generate more suits statistically; adjust your
  assessment accordingly

Produce a legal risk assessment as this exact JSON schema:
{
  "overall_rating": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "litigation": {
    "total_active_suits": number or null,
    "franchisee_pattern": "one sentence describing the nature and pattern of any franchisee suits",
    "pattern_assessment": "2–3 sentences of analyst commentary on what the litigation pattern means for this investor",
    "red_flags": ["specific red flag 1", "specific red flag 2"] or []
  },
  "bankruptcy": {
    "history_present": true or false,
    "assessment": "2–3 sentences on what the bankruptcy history means for the investment, or 'No bankruptcy history — no concern' if absent"
  },
  "regulatory_actions": "1–2 sentences on regulatory actions, or 'None disclosed' if absent",
  "attorney_priority_items": ["specific item to have attorney review 1", ...],
  "analyst_commentary": "3–4 sentences overall legal risk verdict — direct, specific, consequences named. What would you tell a client making a $300K investment?"
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 1200, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Legal risk: no JSON in response');
  return JSON.parse(match[0]) as LegalRiskAssessment;
}

// ============================================================================
// Section 2 — Fee Structure Analysis (deterministic)
// ============================================================================

// Category-keyed royalty benchmarks — replaces a single QSR-only figure that
// was previously applied to every franchise regardless of category. Ranges
// reflect typical published royalty rates for each category; categories
// match classifyCategory() in fdd-territory-engine.ts.
const ROYALTY_BENCHMARK_BY_CATEGORY: Record<string, { label: string; low: number; high: number }> = {
  qsr:             { label: 'QSR / food service', low: 0.05, high: 0.07 },
  home_services:   { label: 'home services', low: 0.06, high: 0.10 },
  senior_care:     { label: 'senior care', low: 0.05, high: 0.07 },
  health_fitness:  { label: 'fitness / wellness', low: 0.06, high: 0.08 },
  child_education: { label: 'education / child services', low: 0.08, high: 0.10 },
  automotive:      { label: 'automotive', low: 0.05, high: 0.08 },
  retail:          { label: 'retail', low: 0.04, high: 0.06 },
  professional:    { label: 'professional / business services', low: 0.06, high: 0.10 },
  default:         { label: 'this category', low: 0.05, high: 0.08 },
};

function generateFeeStructure(
  fields: FddExtractedFields,
  _ode: OdeAssessment
): FeeStructureAnalysis {
  const auv = n(fields.item19_auv) ?? n(fields.item19_median) ?? null;
  const royaltyPct = n(fields.royalty_rate_pct) ?? 0;
  const category = classifyCategory(fields);
  const benchmark = ROYALTY_BENCHMARK_BY_CATEGORY[category] ?? ROYALTY_BENCHMARK_BY_CATEGORY.default;
  const mktgPct = n(fields.marketing_fund_pct) ?? 0;
  const techFeeMonthly = n(fields.technology_fee_monthly) ?? 0;
  const cogsPct = n(fields.estimated_cogs_pct) ?? 0.30;

  const techFeePct = auv && auv > 0 ? (techFeeMonthly * 12) / auv : 0;
  const totalFranchisorPct = royaltyPct + mktgPct + techFeePct;
  const franchiseeGrossProfitPct = 1 - cogsPct - totalFranchisorPct;

  const waterfall: FeeWaterfallLine[] = [
    {
      label: 'Gross Revenue',
      pct_of_gross: 100,
      annual_on_auv: auv,
      note: auv ? 'From Item 19 AUV (median)' : 'Item 19 not available — insert actual revenue',
    },
    {
      label: 'Less: COGS / Cost of Goods',
      pct_of_gross: -(cogsPct * 100),
      annual_on_auv: auv ? -(auv * cogsPct) : null,
      note: `${(cogsPct * 100).toFixed(0)}% — ${cogsPct > 0.35 ? 'above' : cogsPct < 0.25 ? 'below' : 'in line with'} typical range for this category`,
    },
    {
      label: 'Less: Royalty',
      pct_of_gross: -(royaltyPct * 100),
      annual_on_auv: auv ? -(auv * royaltyPct) : null,
      note: royaltyPct > benchmark.high ? `Above ${(benchmark.high * 100).toFixed(0)}% — heavy royalty load for ${benchmark.label}` :
            royaltyPct >= benchmark.low ? 'Moderate royalty — typical range for this category' :
            'Light royalty — positive for unit economics',
    },
    {
      label: 'Less: Marketing / Ad Fund',
      pct_of_gross: -(mktgPct * 100),
      annual_on_auv: auv ? -(auv * mktgPct) : null,
      note: mktgPct > 0.04 ? 'High marketing fund — verify what national vs. local split is' :
            'Typical marketing fund contribution',
    },
    {
      label: 'Less: Technology Fee',
      pct_of_gross: -(techFeePct * 100),
      annual_on_auv: auv ? -(techFeeMonthly * 12) : null,
      note: techFeeMonthly > 0
        ? `$${techFeeMonthly}/month — ${techFeeMonthly > 500 ? 'verify what technology is included at this price' : 'reasonable'}`
        : 'No technology fee disclosed',
    },
    {
      label: 'Franchisee Gross Profit (after all franchisor fees)',
      pct_of_gross: franchiseeGrossProfitPct * 100,
      annual_on_auv: auv ? auv * franchiseeGrossProfitPct : null,
      note: franchiseeGrossProfitPct < 0.35
        ? 'TIGHT — less than 35% gross profit remaining to cover rent, labor, and debt service'
        : franchiseeGrossProfitPct > 0.55
        ? 'STRONG — substantial gross profit available for operations'
        : 'Adequate gross profit margin for viable unit economics',
    },
  ];

  const feeRating: FeeStructureAnalysis['fee_burden_rating'] =
    totalFranchisorPct > 0.16 ? 'EXCESSIVE' :
    totalFranchisorPct > 0.12 ? 'HEAVY' :
    totalFranchisorPct > 0.08 ? 'MODERATE' : 'LIGHT';

  const hiddenCostWarnings: string[] = [];
  if (b(fields.fee_escalation_rights) === true) {
    hiddenCostWarnings.push('Franchisor can raise fees unilaterally — review Item 6 escalation provisions with attorney');
  }
  if (s(fields.other_recurring_fees)) {
    hiddenCostWarnings.push(`Additional recurring fees not itemized above: ${s(fields.other_recurring_fees)}`);
  }
  if (b(fields.ecommerce_carve_out) === true) {
    hiddenCostWarnings.push('E-commerce territory carve-out means franchisor competes in your market online — revenue impact unquantified');
  }

  const categoryBenchmark = royaltyPct > 0
    ? `Typical royalty for ${benchmark.label} is ${(benchmark.low * 100).toFixed(0)}–${(benchmark.high * 100).toFixed(0)}%. This franchise at ${(royaltyPct * 100).toFixed(1)}% is ${royaltyPct > benchmark.high ? 'above' : royaltyPct < benchmark.low ? 'below' : 'within'} that range. Combined with ${(mktgPct * 100).toFixed(1)}% marketing fund, total franchisor fee burden is ${(totalFranchisorPct * 100).toFixed(1)}% of gross revenue.`
    : 'Fee structure not fully disclosed — obtain complete fee schedule before proceeding.';

  return {
    gross_revenue_assumption: auv,
    waterfall,
    total_franchisor_take_pct: totalFranchisorPct * 100,
    franchisee_gross_profit_pct: franchiseeGrossProfitPct * 100,
    category_royalty_benchmark: categoryBenchmark,
    fee_burden_rating: feeRating,
    fee_escalation_risk: b(fields.fee_escalation_rights) === true
      ? 'HIGH — franchisor has contractual right to increase fees. Review historical escalation pattern with existing franchisees.'
      : b(fields.fee_escalation_rights) === false
      ? 'LOW — fees are fixed in the current agreement'
      : 'UNKNOWN — escalation rights not confirmed. Confirm with attorney.',
    hidden_cost_warnings: hiddenCostWarnings,
    analyst_commentary: `Total franchisor fee burden of ${(totalFranchisorPct * 100).toFixed(1)}% of gross revenue is ${feeRating.toLowerCase()}. After COGS and all franchisor fees, franchisees retain approximately ${(franchiseeGrossProfitPct * 100).toFixed(0)}% of gross revenue to cover rent, labor, debt service, and owner income. ${franchiseeGrossProfitPct < 0.40 ? 'This is a tight margin — any deviation from the Item 19 AUV assumption will compress ODE quickly. Stress-test the model at 80% of AUV before committing.' : 'This provides adequate cushion for viable unit economics assuming AUV holds at Item 19 levels.'}`,
  };
}

// ============================================================================
// Section 3 — Financial Performance Analysis (Item 19)
// ============================================================================

async function generateFinancialPerformance(
  fields: FddExtractedFields,
  feeStructure: FeeStructureAnalysis,
  ode: OdeAssessment,
  franchiseName: string,
  territory: TerritoryAnalysis | null
): Promise<FinancialPerformanceAnalysis> {
  const item19Present = b(fields.item19_present);
  const auv = n(fields.item19_auv);
  const median = n(fields.item19_median);
  const mean = n(fields.item19_mean);
  const high = n(fields.item19_high);
  const low = n(fields.item19_low);
  const unitsReporting = n(fields.item19_units_included);
  const pctReporting = n(fields.item19_pct_system_included);
  const includesFranchisee = b(fields.item19_includes_franchisee_units);
  const cherryPick = b(fields.item19_cherry_pick_flag);
  const footnoteExclusions = s(fields.item19_footnote_exclusions) ?? 'None disclosed';
  const metricType = s(fields.item19_metric_type) ?? 'gross_revenue';
  const fiscalYear = n(fields.item19_fiscal_year);
  const totalInvestmentMin = n(fields.total_investment_min);
  const totalInvestmentMax = n(fields.total_investment_max);
  const wcMonths = n(fields.working_capital_months_covered);

  const prompt = `Analyze the financial performance section (Item 19) for this franchise FDD.

FRANCHISE: ${franchiseName}

ITEM 19 DATA:
- Present: ${item19Present === true ? 'YES' : item19Present === false ? 'NO' : 'Unknown'}
- Metric type: ${metricType}
- Fiscal year covered: ${fiscalYear ?? 'Not disclosed'}
- AUV (average): ${currency(auv)}
- Median: ${currency(median)}
- Mean: ${currency(mean)}
- High: ${currency(high)}
- Low: ${currency(low)}
- Units reporting: ${unitsReporting ?? 'Unknown'}
- % of system reporting: ${pctReporting !== null ? `${(pctReporting * 100).toFixed(0)}%` : 'Unknown'}
- Includes franchisee units: ${includesFranchisee === true ? 'YES' : includesFranchisee === false ? 'NO (company units only)' : 'Unknown'}
- Cherry-pick flag triggered: ${cherryPick === true ? 'YES' : 'NO'}
- Footnote exclusions: "${footnoteExclusions}"

FEE WATERFALL (from fee analysis):
- Total franchisor fee burden: ${feeStructure.total_franchisor_take_pct.toFixed(1)}% of gross
- Franchisee gross profit after all franchisor fees: ${feeStructure.franchisee_gross_profit_pct.toFixed(0)}% of gross
- Estimated ODE (central): ${currency(ode.ode_mid)} per year
- Estimated ODE (conservative): ${currency(ode.ode_low)} per year
- Estimated ODE (optimistic): ${currency(ode.ode_high)} per year

INVESTMENT CONTEXT:
- Total investment range (Item 7): ${currency(totalInvestmentMin)}–${currency(totalInvestmentMax)}
- Working capital months covered: ${wcMonths ?? 'Not disclosed'}

INDUSTRY BENCHMARKS:
- Item 19 coverage below 50% of the system is a materially weaker disclosure — the excluded
  cohort is more likely to be underperforming than representative, since franchisors have no
  incentive to exclude a segment that makes their numbers look better. Say so directly, but do
  not cite a specific percentage range for how much the excluded cohort underperforms by unless
  it is derivable from the data you were given.
- A high-quality Item 19 disclosure covers most of the system (well above 80% is strong), includes
  both median AND quartile/range data, and separates company-owned vs. franchisee performance.
- Mean/median gap: if (mean - median) / median > 25%, the system has high performance variability,
  meaning most franchisees perform below the "average" — a critical distinction
- Non-marginality floor: ODE above $65K/yr at median AUV is generally sufficient to demonstrate
  the enterprise generates more than investor's basic living needs (9 FAM 402.9-7(B))
- COVID period data (2019–2022 fiscal years) is systemically distorted and should carry a caveat

TERRITORY MARKET SIZING (if available):
- Territory overall rating: ${territory?.overall_rating ?? 'Not analysed'}
- Annual addressable revenue in this territory: ${territory?.target_market?.annual_addressable_revenue ? `$${territory.target_market.annual_addressable_revenue.toLocaleString()}` : 'Not calculated'}
- Year 1 revenue target (territory sizing): ${territory?.target_market?.year1_revenue_target ? `$${territory.target_market.year1_revenue_target.toLocaleString()}` : 'Not calculated'}
- Labor market score: ${territory?.labor_market_score ? `${territory.labor_market_score.score}/100 — ${territory.labor_market_score.note}` : 'Not analysed'}
- Territory non-marginality check: ${territory?.target_market?.nonmarginality_check ?? 'Not calculated'}

When territory data is available, cross-reference the Year 1 revenue target from territory sizing
against the Item 19 AUV — a territory target significantly below AUV suggests the territory may
be undersized for this concept's unit economics.

Calculate payback period: total_investment_midpoint / ode_central (in years).
Calculate break-even monthly revenue: the monthly gross revenue at which all costs are covered but
ODE = $0. Use fee waterfall percentages.

Produce financial performance analysis as this exact JSON schema:
{
  "item19_present": true or false,
  "item19_quality_rating": "RELIABLE" | "ADEQUATE" | "QUESTIONABLE" | "ABSENT",
  "item19_quality_issues": ["specific issue 1", ...] or [],
  "revenue_distribution": {
    "high": number or null,
    "mean": number or null,
    "median": number or null,
    "low": number or null,
    "units_reporting": number or null,
    "pct_system_reporting": number or null
  },
  "ode_scenarios": {
    "conservative": { "auv": number or null, "ode": number or null, "assumption": "one sentence" },
    "central": { "auv": number or null, "ode": number or null, "assumption": "one sentence" },
    "optimistic": { "auv": number or null, "ode": number or null, "assumption": "one sentence" }
  },
  "payback_period_years": number or null,
  "break_even_monthly_revenue": number or null,
  "non_marginality_verdict": "PASSES" | "BORDERLINE" | "FAILS" | "INSUFFICIENT_DATA",
  "non_marginality_explanation": "2–3 sentences explaining the non-marginality verdict in plain English, citing 9 FAM if relevant",
  "year_projections": {
    "year1": { "revenue": number or null, "ode": number or null },
    "year3": { "revenue": number or null, "ode": number or null },
    "year5": { "revenue": number or null, "ode": number or null }
  },
  "analyst_commentary": "4–5 sentences of direct analyst commentary on Item 19 quality and what it means for the investor's decision. Be specific about data quality issues. Name the consequence of poor data quality for E-2 visa filing."
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 1800, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Financial performance: no JSON in response');
  return JSON.parse(match[0]) as FinancialPerformanceAnalysis;
}

// ============================================================================
// Section 4 — System Health Analysis (Item 20)
// ============================================================================

async function generateSystemHealth(
  fields: FddExtractedFields,
  franchiseName: string
): Promise<SystemHealthAnalysis> {
  const openedYr1 = n(fields.units_opened_yr1);
  const openedYr2 = n(fields.units_opened_yr2);
  const openedYr3 = n(fields.units_opened_yr3);
  const closedYr1 = n(fields.units_closed_yr1);
  const closedYr2 = n(fields.units_closed_yr2);
  const closedYr3 = n(fields.units_closed_yr3);
  const totalOpen = n(fields.total_units_open_current);
  const franchiseeClosures = n(fields.franchisee_initiated_closures_3yr);
  const franchisorTerminations = n(fields.franchisor_initiated_terminations_3yr);
  const formerFranchiseeContacts = b(fields.former_franchisee_contacts_available);

  // Item 20 openings/closures are frequently absent from the extracted FDD text.
  // Treat "not disclosed" as null all the way through — never default a missing
  // year's count to 0, since that fabricates a specific (and often alarming)
  // claim the FDD never actually made.
  const openingsDisclosed = openedYr1 !== null && openedYr2 !== null && openedYr3 !== null;
  const closuresDisclosed = closedYr1 !== null && closedYr2 !== null && closedYr3 !== null;
  const totalOpened = openingsDisclosed ? openedYr1! + openedYr2! + openedYr3! : null;
  const totalClosed = closuresDisclosed ? closedYr1! + closedYr2! + closedYr3! : null;
  const netUnitChange = (totalOpened !== null && totalClosed !== null) ? totalOpened - totalClosed : null;
  const churnRate = (totalOpen !== null && totalOpen > 0 && totalClosed !== null)
    ? ((totalClosed / 3) / totalOpen)
    : null;

  const fmt = (v: number | null): string => v === null ? 'Not disclosed' : String(v);

  const prompt = `Analyze the system health data from Item 20 of this franchise FDD.

FRANCHISE: ${franchiseName}

ITEM 20 OUTLET DATA:
- Total units currently open: ${totalOpen ?? 'Not disclosed'}
- Openings: Year 1: ${fmt(openedYr1)}, Year 2: ${fmt(openedYr2)}, Year 3: ${fmt(openedYr3)} (Total 3yr: ${totalOpened ?? 'Not disclosed'})
- Closures: Year 1: ${fmt(closedYr1)}, Year 2: ${fmt(closedYr2)}, Year 3: ${fmt(closedYr3)} (Total 3yr: ${totalClosed ?? 'Not disclosed'})
- Net unit change over 3 years: ${netUnitChange === null ? 'Not disclosed' : `${netUnitChange > 0 ? '+' : ''}${netUnitChange}`}
- Franchisee-initiated closures (3yr): ${fmt(franchiseeClosures)}
- Franchisor-initiated terminations (3yr): ${fmt(franchisorTerminations)}
- Annual churn rate: ${churnRate !== null ? `${(churnRate * 100).toFixed(1)}%` : 'Cannot calculate — outlet data incomplete'}
- Former franchisee contact list available in Item 20: ${formerFranchiseeContacts === true ? 'YES' : formerFranchiseeContacts === false ? 'NO — red flag' : 'Not confirmed'}

IMPORTANT: "Not disclosed" means this figure was absent from the extracted FDD text — it is NOT
a disclosed zero. Never treat a "Not disclosed" field as if the franchisor reported zero activity,
and never call a "Not disclosed" pattern "implausible," "suspicious," or a red flag on its own —
the correct and only honest response to missing Item 20 data is to say plainly that it was not
disclosed/extracted and that this itself limits confidence in the system health assessment.

INDUSTRY BENCHMARKS:
- Healthy franchise systems: annual churn rate <5% is strong, 5–8% is acceptable, >8% is elevated, >12% is distress
- A ratio of franchisor-initiated terminations > franchisee-initiated closures can indicate two things:
  (1) the franchisor actively enforces quality standards (potentially positive), or
  (2) the franchisor is using termination to reclaim units or clear underperformers (potentially negative)
- Net negative unit growth over 3 years for a system of >50 units is a serious systemic signal
- Sustained churn above the ~12% distress threshold is a going-concern-level signal for the
  system as a whole, not just individual underperforming units — say so directly, but do not
  cite a specific collapse-probability percentage or named study you were not given.
- Franchisor cooperation with validation calls (connecting prospects to existing/former
  franchisees without steering) is itself a signal — systems that resist or heavily curate
  validation contact are more likely to be concealing performance problems, even without a
  precise multiplier to cite.
- A high closure rate in a single year (Year 1 or 2) vs. spread evenly suggests either a market
  correction event or a wave of early-period units failing at the same time

Produce system health analysis as this exact JSON schema:
{
  "overall_rating": "EXPANDING" | "STABLE" | "CONTRACTING" | "DISTRESSED",
  "net_unit_change_3yr": number or null,
  "churn_rate_annual": number (as decimal, e.g. 0.054) or null,
  "churn_benchmark_note": "1–2 sentences comparing this churn rate to benchmarks and what it signals",
  "openings_3yr": number or null,
  "closures_3yr": number or null,
  "terminations_franchisor_3yr": number or null,
  "terminations_franchisee_3yr": number or null,
  "renewal_rate_indicator": "assessment of what the closure pattern implies about renewal rates",
  "validation_strategy": "specific guidance on how this investor should approach franchisee validation calls given this data — 3–4 sentences",
  "red_flags": ["specific red flag 1", ...] or [],
  "analyst_commentary": "3–4 sentences of direct analysis on system health. If the data shows a healthy or growing system, say so clearly. If it shows problems, name them directly with consequences."
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 1200, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('System health: no JSON in response');
  return JSON.parse(match[0]) as SystemHealthAnalysis;
}

// ============================================================================
// Section 5 — Franchisor Financial Health (Item 21)
// ============================================================================

async function generateFranchisorFinancialHealth(
  fields: FddExtractedFields,
  franchiseName: string
): Promise<FranchisorFinancialHealth> {
  const auditOpinion = s(fields.audit_opinion) ?? 'Unknown';
  const yearsFinancials = n(fields.years_of_financials);
  const royaltyTrend = s(fields.royalty_revenue_trend) ?? 'Unknown';
  const franchiseFeeRatio = n(fields.royalty_vs_fee_ratio);
  const netIncome = n(fields.franchisor_net_income);
  const liquidityRatio = n(fields.liquidity_ratio);
  const debtCovenantFlags = b(fields.debt_covenant_flags);

  const prompt = `Analyze the franchisor's financial health from Item 21 of this franchise FDD.

FRANCHISE: ${franchiseName}

FINANCIAL STATEMENTS (Item 21):
- Years of financials provided: ${yearsFinancials ?? 'Unknown'}
- Audit opinion: ${auditOpinion}
- Royalty revenue trend: ${royaltyTrend}
- Royalty-to-franchise-fee income ratio: ${franchiseFeeRatio !== null ? franchiseFeeRatio.toFixed(2) : 'Not calculated'}
  (higher = more self-sustaining from ongoing royalties; lower = dependent on selling new franchises)
- Franchisor net income (most recent year): ${currency(netIncome)}
- Liquidity ratio: ${liquidityRatio !== null ? liquidityRatio.toFixed(2) : 'Not calculated'}
- Debt covenant flags: ${debtCovenantFlags === true ? 'YES — disclosed' : debtCovenantFlags === false ? 'None disclosed' : 'Unknown'}

WHAT THESE NUMBERS MEAN — CONTEXT FOR ANALYSIS:
- Royalty-to-franchise-fee ratio interpretation:
  * Ratio > 3:1 (royalties >> franchise fees) = self-sustaining mature system — strong signal
  * Ratio < 1:1 (franchise fees >> royalties) = dependent on selling new franchises to survive —
    serious red flag; if growth slows, franchisor may lose financial capacity to support network
  * Ratio 1:1 to 3:1 = transitional system — watch the trend direction
- Audit opinion benchmarks:
  * Unqualified = clean bill of health; standard
  * Qualified = auditor has reservations about specific items — must understand exactly what
  * Adverse = significant accounting problems — a near-disqualifying red flag for any investor
  * Review-only (not a full audit) = weaker assurance; some small systems use this
- Liquidity ratio:
  * Above 2.0 = strong; 1.0–2.0 = adequate; below 1.0 = potential cash flow stress
- Declining royalty revenue with growing franchise fee income = franchisor is growing the system
  but existing units are declining — the worst combination for an incoming franchisee

Produce franchisor financial health as this exact JSON schema:
{
  "overall_rating": "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED",
  "revenue_trend": "1–2 sentences describing the 3-year revenue trend and what it implies",
  "royalty_vs_fee_ratio": {
    "royalty_pct": number or null,
    "franchise_fee_pct": number or null,
    "interpretation": "2 sentences explaining what this ratio means for the investor — specifically whether the franchisor's survival depends on selling new franchises"
  },
  "audit_opinion": "1–2 sentences on what the audit opinion means and any concerns",
  "liquidity_assessment": "1–2 sentences on liquidity position and ability to fund support operations",
  "insolvency_risk": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "support_capacity_assessment": "2–3 sentences on whether the franchisor has the financial capacity to actually deliver the training, field support, and marketing it promises in the FDD",
  "analyst_commentary": "3–4 sentences overall financial health verdict. If it is strong, say so confidently. If there are concerns, name the specific failure mode and its probability."
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 1200, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Franchisor financial health: no JSON in response');
  return JSON.parse(match[0]) as FranchisorFinancialHealth;
}

// ============================================================================
// Section 6 — E-2 Visa Compatibility Deep Dive
// ============================================================================

async function generateE2DeepDive(
  fields: FddExtractedFields,
  scoring: ScoringResult,
  franchiseName: string,
  targetState: string | null
): Promise<E2CompatibilityDeepDive> {
  const investmentMin = currency(n(fields.total_investment_min));
  const investmentMax = currency(n(fields.total_investment_max));
  const termYears = n(fields.initial_term_years);
  const trainingHours = n(fields.initial_training_hours);
  const investorRole = s(fields.investor_role);
  const employeesOpening = n(fields.opening_day_employees);
  const feeRefundable = b(fields.fee_is_refundable);
  const transferToEntity = b(fields.transfer_to_entity_allowed);
  const territoryType = s(fields.territory_type);
  const monthsToOpen = n(fields.typical_time_to_open_months);
  const registrationState = targetState ?? 'Unknown';

  const flagLabels = scoring.flags.map(f => f.label).join('\n- ');

  const prompt = `Produce a comprehensive E-2 visa compatibility assessment for this franchise investment.

FRANCHISE: ${franchiseName}
TARGET STATE: ${registrationState}

SCORING ENGINE RESULTS:
- Overall E-2 Compatibility: ${scoring.overall}
- Eligibility Gates: ${scoring.eligibility_gates.result.toUpperCase()}
- Investment Substantiality: ${scoring.investment_substantiality.result.toUpperCase()}
- Non-Marginality: ${scoring.non_marginality.result.toUpperCase()}
- Develop & Direct: ${scoring.develop_and_direct.result.toUpperCase()}
- Active Flags (${scoring.flag_count}):
  - ${flagLabels || 'None'}

FDD DATA RELEVANT TO E-2:
- Total investment: ${investmentMin} – ${investmentMax}
- Initial term: ${termYears ? `${termYears} years` : 'Unknown'}
- Training hours: ${trainingHours ? `${trainingHours} hours` : 'Not disclosed'}
- Investor role per FDD: ${investorRole ?? 'Not specified'}
- Employees at opening: ${employeesOpening ?? 'Not disclosed'}
- Franchise fee refundable: ${feeRefundable === true ? 'YES — problematic for E-2' : feeRefundable === false ? 'NO — correct for E-2' : 'Not confirmed'}
- Transfer to entity allowed: ${transferToEntity === true ? 'YES' : transferToEntity === false ? 'NO — CRITICAL ISSUE' : 'Not confirmed'}
- Territory type: ${territoryType ?? 'Not specified'}
- Typical months to open: ${monthsToOpen ? `${monthsToOpen} months` : 'Not disclosed'}

E-2 REGULATORY FRAMEWORK (what the visa officer evaluates):
- Investment must be "substantial" under 9 FAM 402.9-6(D) — proportionality test on sliding scale
- Investment must be "at-risk" — irrevocably committed, not refundable (9 FAM 402.9-6(C))
- Enterprise must not be "marginal" — must generate more than investor's livelihood (9 FAM 402.9-7)
- Investor must "develop and direct" the enterprise (9 FAM 402.9-8) — active management
- Business must be a real, operating, actively generating enterprise (9 FAM 402.9-4)
- Passive investments (where investor does not manage) do NOT qualify under any circumstances
- E-2 initial status is typically 2 years with unlimited renewals while business is active

Produce E-2 compatibility deep dive as this exact JSON schema:
{
  "overall_verdict": "STRONG" | "VIABLE" | "CAUTION" | "INELIGIBLE",
  "dimensions": {
    "eligibility_gates": {
      "verdict": "PASS" | "WARN" | "FAIL",
      "regulatory_basis": "cite specific 9 FAM section",
      "what_officer_looks_for": "2–3 sentences on what a consular officer specifically examines for this dimension",
      "documentation_required": ["specific document 1", "specific document 2", ...]
    },
    "investment_substantiality": {
      "verdict": "PASS" | "WARN" | "FAIL",
      "regulatory_basis": "cite specific 9 FAM section and the proportionality standard",
      "what_officer_looks_for": "2–3 sentences on what the officer examines",
      "documentation_required": ["specific document 1", ...]
    },
    "non_marginality": {
      "verdict": "PASS" | "WARN" | "FAIL",
      "regulatory_basis": "cite 9 FAM 402.9-7 specifically",
      "what_officer_looks_for": "2–3 sentences — be specific about what makes an officer question marginality",
      "documentation_required": ["specific document 1", ...]
    },
    "develop_and_direct": {
      "verdict": "PASS" | "WARN" | "FAIL",
      "regulatory_basis": "cite 9 FAM 402.9-8",
      "what_officer_looks_for": "2–3 sentences on what demonstrates active management vs. passive investment",
      "documentation_required": ["specific document 1", ...]
    }
  },
  "consular_risk_factors": ["specific risk that could trigger officer scrutiny or denial 1", ...],
  "business_plan_requirements": ["specific section or data point required in business plan 1", ...],
  "attorney_review_priority_items": ["highest priority item for immigration attorney to address 1", ...],
  "timing_warning": "1–2 sentences on timing risk between signing, visa filing, and business opening, or null if no timing concern"
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 3500, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('E-2 deep dive: no JSON in response');
  const parsed = JSON.parse(match[0]) as E2CompatibilityDeepDive;

  // The LLM elaborates on each dimension — it does not re-adjudicate. Verdicts are
  // deterministic facts owned by the scoring engine; overwrite whatever the LLM produced
  // so the report can never contradict its own scoring (a self-contradicting report is a
  // refund request). Narrative fields (regulatory_basis, what_officer_looks_for,
  // documentation_required) are left as the LLM's elaboration.
  parsed.overall_verdict = scoring.overall;
  parsed.dimensions.eligibility_gates.verdict = dimensionResultToVerdict(scoring.eligibility_gates.result);
  parsed.dimensions.investment_substantiality.verdict = dimensionResultToVerdict(scoring.investment_substantiality.result);
  parsed.dimensions.non_marginality.verdict = dimensionResultToVerdict(scoring.non_marginality.result);
  parsed.dimensions.develop_and_direct.verdict = dimensionResultToVerdict(scoring.develop_and_direct.result);

  return parsed;
}

// Maps the scoring engine's DimensionResult onto the deep-dive's PASS/WARN/FAIL verdict scale.
// 'unknown' (data not available to score) maps to WARN, never PASS — absence of a fail signal
// is not evidence of a pass.
function dimensionResultToVerdict(result: ScoringResult['eligibility_gates']['result']): 'PASS' | 'WARN' | 'FAIL' {
  if (result === 'pass') return 'PASS';
  if (result === 'fail') return 'FAIL';
  return 'WARN';
}

// ============================================================================
// Section 7 — Risk Summary Matrix
// ============================================================================

async function generateRiskMatrix(
  fields: FddExtractedFields,
  scoring: ScoringResult,
  legal: LegalRiskAssessment,
  financialPerf: FinancialPerformanceAnalysis,
  systemHealth: SystemHealthAnalysis,
  franchiseName: string
): Promise<RiskMatrixItem[]> {
  const flagSummary = scoring.flags.map(f => `[${f.severity.toUpperCase()}] ${f.label}`).join('\n');
  const legalRedFlags = [...legal.litigation.red_flags].join(', ') || 'None';
  const systemRedFlags = [...systemHealth.red_flags].join(', ') || 'None';

  const prompt = `Compile a comprehensive risk matrix for this franchise investment.

FRANCHISE: ${franchiseName}

SCORING ENGINE FLAGS:
${flagSummary || 'No flags raised'}

LEGAL RED FLAGS: ${legalRedFlags}
SYSTEM HEALTH RED FLAGS: ${systemRedFlags}
FINANCIAL PERFORMANCE RATING: ${financialPerf.item19_quality_rating}
NON-MARGINALITY VERDICT: ${financialPerf.non_marginality_verdict}

Produce a risk matrix of 8–12 risks covering: legal, financial performance, system health,
franchisor financial stability, territory, operations, and E-2 visa specific risks.

Return as a JSON array:
[
  {
    "category": "Legal" | "Financial Performance" | "System Health" | "Franchisor Stability" | "Territory" | "Operations" | "E-2 Visa" | "Exit",
    "risk": "precise risk title — not generic",
    "severity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
    "specific_consequence": "1–2 sentences — what specifically happens to THIS investor if this risk materialises",
    "mitigation": "1–2 sentences — specific action to reduce this risk",
    "pre_signing_action_required": true or false,
    "fdd_item_reference": "Item X" or "Multiple Items"
  }
]

Return only the JSON array. Order by severity descending (CRITICAL first).`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 3000, route: 'fdd-report' });
  const text = fddResult?.content ?? '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Risk matrix: no JSON in response');
  return JSON.parse(match[0]) as RiskMatrixItem[];
}

// ============================================================================
// Section 8 — Executive Summary (runs last — synthesises all sections)
// ============================================================================

async function generateExecutiveSummary(
  fields: FddExtractedFields,
  scoring: ScoringResult,
  ode: OdeAssessment,
  legal: LegalRiskAssessment,
  feeStructure: FeeStructureAnalysis,
  financialPerf: FinancialPerformanceAnalysis,
  systemHealth: SystemHealthAnalysis,
  franchisorHealth: FranchisorFinancialHealth,
  e2: E2CompatibilityDeepDive,
  riskMatrix: RiskMatrixItem[],
  franchiseName: string,
  territory: TerritoryAnalysis | null
): Promise<ExecutiveSummary> {
  const criticalRisks = riskMatrix.filter(r => r.severity === 'CRITICAL').map(r => r.risk);
  const highRisks = riskMatrix.filter(r => r.severity === 'HIGH').map(r => r.risk);

  const prompt = `Write the executive summary for this professional franchise FDD analysis report.

FRANCHISE: ${franchiseName}

ANALYSIS RESULTS SUMMARY:
- E-2 Compatibility: ${scoring.overall} (${e2.overall_verdict})
- Legal Risk: ${legal.overall_rating}
- Financial Performance Quality: ${financialPerf.item19_quality_rating}
- Non-Marginality: ${financialPerf.non_marginality_verdict}
- System Health: ${systemHealth.overall_rating}
- Franchisor Financial Health: ${franchisorHealth.overall_rating}
- Fee Burden: ${feeStructure.fee_burden_rating}
- Critical Risks: ${criticalRisks.join(', ') || 'None'}
- High Risks: ${highRisks.join(', ') || 'None'}

KEY METRICS:
- Investment Range: ${currency(n(fields.total_investment_min))}–${currency(n(fields.total_investment_max))}
- Item 19 AUV: ${currency(n(fields.item19_auv) ?? n(fields.item19_median))}
- Estimated ODE (central): ${currency(ode.ode_mid)}
- Payback Period: ${financialPerf.payback_period_years ? `${financialPerf.payback_period_years.toFixed(1)} years` : 'Cannot calculate'}
- System Churn Rate: ${systemHealth.churn_rate_annual !== null ? `${(systemHealth.churn_rate_annual * 100).toFixed(1)}% annual` : 'Cannot calculate'}
- Flag Count: ${scoring.flag_count}

TERRITORY CONTEXT:
- Territory Rating: ${territory ? `${territory.overall_rating} (${territory.overall_score}/100)` : 'Not analysed'}
- Demographic Fit: ${territory ? `${territory.demographic_fit_score.score}/100 — ${territory.demographic_fit_score.note}` : 'Not analysed'}
- Addressable Market: ${territory?.target_market?.annual_addressable_revenue ? `$${territory.target_market.annual_addressable_revenue.toLocaleString()} annually` : 'Not calculated'}
- Labor Market: ${territory ? `${territory.labor_market_score.score}/100 — ${territory.labor_market_score.note}` : 'Not analysed'}

Your job: render a definitive investment recommendation (PROCEED / PROCEED_WITH_CONDITIONS / DO_NOT_PROCEED)
and write a clear executive summary that tells the investor what to do and why.

PROCEED = strong opportunity, no material blockers
PROCEED_WITH_CONDITIONS = viable opportunity with specific, resolvable conditions that must be met first
DO_NOT_PROCEED = material unresolvable risk that outweighs the opportunity

Produce executive summary as this exact JSON schema:
{
  "recommendation": "PROCEED" | "PROCEED_WITH_CONDITIONS" | "DO_NOT_PROCEED",
  "recommendation_rationale": "3–4 sentences explaining the recommendation. Be specific — cite the 2–3 most decisive factors. Do not repeat the conditions list here.",
  "strengths": [
    { "title": "Short strength title", "evidence": "1 sentence — specific data point from this FDD that proves this strength" },
    { "title": "...", "evidence": "..." },
    { "title": "...", "evidence": "..." }
  ],
  "risks": [
    { "title": "Short risk title", "consequence": "1 sentence — specific consequence for this investor" },
    { "title": "...", "consequence": "..." },
    { "title": "...", "consequence": "..." }
  ],
  "conditions": ["specific condition that must be met before proceeding 1", ...] or [],
  "key_metrics": {
    "investment_range": "formatted string e.g. $189K–$780K",
    "item19_auv": "formatted string or 'Not Disclosed'",
    "ode_central": "formatted string or 'Estimate only'",
    "e2_score": "STRONG | VIABLE | CAUTION | INELIGIBLE",
    "system_churn": "formatted string e.g. '3.2% annual'",
    "payback_period_years": "formatted string e.g. '6.2 years' or 'Cannot calculate'"
  },
  "one_line_verdict": "A single powerful sentence — the kind you'd say to a client over the phone to summarise the whole report. Maximum 25 words. No hedging."
}`;

  const fddResult = await callFDDModel({ system: ANALYST_SYSTEM, user: prompt, max_tokens: 1800, route: 'fdd-report' });
  const text = fddResult?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Executive summary: no JSON in response');
  return JSON.parse(match[0]) as ExecutiveSummary;
}

// ============================================================================
// Main orchestration — generates all sections in parallel, summary last
// ============================================================================

export async function generateProfessionalReport(
  fields: FddExtractedFields,
  scoring: ScoringResult,
  ode: OdeAssessment,
  targetState: string | null,
  targetCity: string | null,
  territory: TerritoryAnalysis | null = null
): Promise<FddProfessionalReport> {
  const franchiseName = (fields.franchisor_legal_name?.value as string | null)
    ?? 'Unknown Franchise';

  // Phase 1: all sections in parallel (do not depend on each other)
  const [legal, systemHealth, franchisorHealth, e2DeepDive] = await Promise.all([
    generateLegalRisk(fields, franchiseName),
    generateSystemHealth(fields, franchiseName),
    generateFranchisorFinancialHealth(fields, franchiseName),
    generateE2DeepDive(fields, scoring, franchiseName, targetState),
  ]);

  // Fee structure is deterministic — no LLM needed
  const feeStructure = generateFeeStructure(fields, ode);

  // Financial performance needs fee structure + territory data
  const financialPerf = await generateFinancialPerformance(
    fields, feeStructure, ode, franchiseName, territory
  );

  // Risk matrix needs legal + system health + financial perf
  const riskMatrix = await generateRiskMatrix(
    fields, scoring, legal, financialPerf, systemHealth, franchiseName
  );

  // Executive summary synthesises everything (including territory) — runs last
  const executiveSummary = await generateExecutiveSummary(
    fields, scoring, ode,
    legal, feeStructure, financialPerf, systemHealth, franchisorHealth, e2DeepDive,
    riskMatrix, franchiseName, territory
  );

  return {
    franchise_name: franchiseName,
    report_version: '2.0',
    generated_at: new Date().toISOString(),
    executive_summary: executiveSummary,
    legal_risk: legal,
    fee_structure: feeStructure,
    financial_performance: financialPerf,
    system_health: systemHealth,
    franchisor_financial_health: franchisorHealth,
    e2_compatibility: e2DeepDive,
    risk_matrix: riskMatrix,
  };
}
