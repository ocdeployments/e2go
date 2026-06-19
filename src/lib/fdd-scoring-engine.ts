// ============================================================================
// FDD Intelligence — E-2 Scoring Engine (FDD-2)
// ============================================================================
// Pure functions — no LLM for numeric scoring. LLM only writes the narrative.
// All dimension logic matches the spec in docs/FDD_INTELLIGENCE_PLAN.md.

import type {
  FddExtractedFields,
  FddFieldMeta,
  FddCompatibility,
  FddRegistrationStatus,
  FddStaleStatus,
} from '@/types/fdd';

// ============================================================================
// Score types
// ============================================================================

export type DimensionResult = 'pass' | 'warn' | 'fail' | 'unknown';

export interface CheckResult {
  check: string;
  result: DimensionResult;
  value: string;
  note: string;
}

export interface DimensionScore {
  name: string;
  result: DimensionResult;
  checks: CheckResult[];
  critical_fail: boolean; // true = this alone makes INELIGIBLE
}

export interface OdeAssessment {
  ode_low: number | null;
  ode_mid: number | null;
  ode_high: number | null;
  result: DimensionResult;
  note: string;
}

export interface TimingAssessment {
  months_to_open: number | null;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  note: string;
}

export interface FddFlag {
  key: string;
  label: string;
  severity: 'critical' | 'important';
}

export interface ScoringResult {
  overall: FddCompatibility;
  eligibility_gates: DimensionScore;
  investment_substantiality: DimensionScore;
  non_marginality: DimensionScore;
  develop_and_direct: DimensionScore;
  flags: FddFlag[];
  ode: OdeAssessment;
  timing: TimingAssessment;
  flag_count: number;
}

// ============================================================================
// Helpers
// ============================================================================

function num(meta: FddFieldMeta | undefined): number | null {
  const v = meta?.value;
  return typeof v === 'number' ? v : null;
}

function bool(meta: FddFieldMeta | undefined): boolean | null {
  const v = meta?.value;
  return typeof v === 'boolean' ? v : null;
}

function str(meta: FddFieldMeta | undefined): string | null {
  const v = meta?.value;
  return typeof v === 'string' ? v : null;
}

function checkResult(
  check: string,
  value: string,
  result: DimensionResult,
  note: string
): CheckResult {
  return { check, result, value, note };
}

function worstOf(...results: DimensionResult[]): DimensionResult {
  if (results.includes('fail')) return 'fail';
  if (results.includes('warn')) return 'warn';
  if (results.includes('unknown')) return 'unknown';
  return 'pass';
}

// ============================================================================
// Dimension 1 — Eligibility Gates
// ============================================================================

function scoreDimension1(
  fields: FddExtractedFields,
  staleStatus: FddStaleStatus,
  registrationStatus: FddRegistrationStatus
): DimensionScore {
  const checks: CheckResult[] = [];

  // FDD staleness
  const ageMonths = num(fields.fdd_age_months);
  const staleResult = staleStatus === 'current' ? 'pass' : staleStatus === 'warn' ? 'warn' : 'fail';
  checks.push(checkResult(
    'FDD currency',
    ageMonths !== null ? `${ageMonths} months old` : 'Unknown',
    staleResult,
    staleStatus === 'current' ? 'FDD is current' :
    staleStatus === 'warn' ? 'FDD is 12–18 months old — confirm no material changes' :
    'FDD is over 18 months old — likely superseded. Request current year FDD.'
  ));

  // State registration
  const regResult: DimensionResult =
    registrationStatus === 'pass' ? 'pass' :
    registrationStatus === 'warn' ? 'warn' :
    registrationStatus === 'fail' ? 'fail' : 'unknown';
  checks.push(checkResult(
    'State registration',
    registrationStatus,
    regResult,
    registrationStatus === 'pass' ? 'Registered or non-registration state' :
    registrationStatus === 'warn' ? 'Registration state — not confirmed in FDD' :
    registrationStatus === 'fail' ? 'Registration state — not registered. Cannot legally sell franchise here.' :
    'Registration status unknown'
  ));

  // Business model activity
  const investorRole = str(fields.investor_role);
  const roleResult: DimensionResult =
    investorRole === 'active owner-operator' ? 'pass' :
    investorRole === 'semi-passive' ? 'warn' :
    investorRole === 'passive' ? 'fail' : 'unknown';
  checks.push(checkResult(
    'Active business model',
    investorRole || 'Unknown',
    roleResult,
    roleResult === 'pass' ? 'Investor operates the business' :
    roleResult === 'warn' ? 'Co-managed model — officer may probe passive investment' :
    roleResult === 'fail' ? 'Passive model — E-2 requires investor to develop and direct' :
    'Investor role not determinable from FDD'
  ));

  // Employee count (solo-operator risk)
  const openingEmployees = num(fields.opening_day_employees);
  const fteEmployees = num(fields.typical_fte_employees);
  const staffCount = openingEmployees ?? fteEmployees ?? null;
  const staffResult: DimensionResult =
    staffCount === null ? 'unknown' :
    staffCount >= 3 ? 'pass' :
    staffCount >= 1 ? 'warn' : 'fail';
  checks.push(checkResult(
    'U.S. job creation',
    staffCount !== null ? `${staffCount} employee${staffCount !== 1 ? 's' : ''} at opening` : 'Unknown',
    staffResult,
    staffResult === 'pass' ? 'Creates multiple U.S. jobs from opening' :
    staffResult === 'warn' ? '1–2 employees — borderline. Demonstrate growth trajectory.' :
    staffResult === 'fail' ? 'Solo operator — business solely for investor\'s living. E-2 at risk.' :
    'Staffing model not determinable'
  ));

  // Franchise fee at-risk
  const feeRefundable = bool(fields.fee_is_refundable);
  const atRiskResult: DimensionResult =
    feeRefundable === false ? 'pass' :
    feeRefundable === null ? 'unknown' : 'fail';
  checks.push(checkResult(
    'Franchise fee at-risk',
    feeRefundable === false ? 'Non-refundable' : feeRefundable === true ? 'Refundable' : 'Unknown',
    atRiskResult,
    atRiskResult === 'pass' ? 'Non-refundable — qualifies as at-risk investment' :
    atRiskResult === 'fail' ? 'Refundable fee is not "at-risk" — weakens investment argument' :
    'Refundability not confirmed'
  ));

  // Visa holder acceptance (cannot determine from FDD — always flag)
  checks.push(checkResult(
    'Accepts non-immigrant visa holders',
    'Must confirm directly',
    'warn',
    'Not disclosed in FDD. Confirm with franchisor before proceeding.'
  ));

  const overallResult = worstOf(...checks.map(c => c.result));
  const criticalFail = checks.some(c => c.result === 'fail');

  return {
    name: 'Eligibility Gates',
    result: overallResult,
    checks,
    critical_fail: criticalFail,
  };
}

// ============================================================================
// Dimension 2 — Investment Substantiality (9 FAM sliding scale)
// ============================================================================

function scoreDimension2(
  fields: FddExtractedFields,
  investorLiquidCapital: number | null
): DimensionScore {
  const checks: CheckResult[] = [];

  const totalMin = num(fields.total_investment_min);

  // Investment floor
  const floorResult: DimensionResult =
    totalMin === null ? 'unknown' :
    totalMin > 150_000 ? 'pass' :
    totalMin > 80_000 ? 'warn' : 'fail';
  checks.push(checkResult(
    'Investment floor',
    totalMin !== null ? `$${totalMin.toLocaleString()} minimum` : 'Unknown',
    floorResult,
    floorResult === 'pass' ? 'Investment comfortably above E-2 substantiality threshold' :
    floorResult === 'warn' ? 'Near lower end of substantiality — proportionality argument is critical' :
    floorResult === 'fail' ? 'Below $80K — extremely difficult to argue substantiality' :
    'Investment range not extracted'
  ));

  // Proportionality — sliding scale (9 FAM 402.9-6(D))
  if (investorLiquidCapital !== null && totalMin !== null) {
    const ratio = investorLiquidCapital / totalMin;
    const totalCost = totalMin;

    let passThreshold: number;
    let warnThreshold: number;
    if (totalCost < 100_000) { passThreshold = 0.90; warnThreshold = 0.75; }
    else if (totalCost < 500_000) { passThreshold = 0.75; warnThreshold = 0.50; }
    else if (totalCost < 2_000_000) { passThreshold = 0.50; warnThreshold = 0.30; }
    else { passThreshold = 0.30; warnThreshold = 0.20; }

    const propResult: DimensionResult =
      ratio >= passThreshold ? 'pass' :
      ratio >= warnThreshold ? 'warn' : 'fail';

    checks.push(checkResult(
      'Proportionality (9 FAM sliding scale)',
      `${Math.round(ratio * 100)}% of total investment committed`,
      propResult,
      propResult === 'pass'
        ? `${Math.round(ratio * 100)}% committed — meets 9 FAM standard for this investment level`
        : propResult === 'warn'
        ? `${Math.round(ratio * 100)}% committed — below recommended ${Math.round(passThreshold * 100)}% for this investment level`
        : `${Math.round(ratio * 100)}% committed — below minimum ${Math.round(warnThreshold * 100)}% for this investment level. Difficult to argue substantiality.`
    ));
  } else {
    checks.push(checkResult(
      'Proportionality',
      'Cannot calculate',
      'unknown',
      'Enter investor liquid capital to calculate proportionality ratio'
    ));
  }

  const overallResult = worstOf(...checks.map(c => c.result));
  return { name: 'Investment Substantiality', result: overallResult, checks, critical_fail: false };
}

// ============================================================================
// ODE Model
// ============================================================================

export function computeOde(
  fields: FddExtractedFields
): OdeAssessment {
  const item19Present = bool(fields.item19_present);

  if (!item19Present) {
    return {
      ode_low: null, ode_mid: null, ode_high: null,
      result: 'warn',
      note: 'Item 19 absent — cannot model owner income from FDD data alone. Territory analysis required.',
    };
  }

  const auvLow = num(fields.item19_low);
  const auvMid = num(fields.item19_median) ?? num(fields.item19_auv);
  const auvHigh = num(fields.item19_mean) ?? num(fields.item19_high);

  if (!auvMid) {
    return {
      ode_low: null, ode_mid: null, ode_high: null,
      result: 'unknown',
      note: 'Item 19 present but revenue figures could not be extracted',
    };
  }

  const royaltyPct = num(fields.royalty_rate_pct) ?? 0.06;
  const mktgPct = num(fields.marketing_fund_pct) ?? 0.02;
  const cogsPct = num(fields.estimated_cogs_pct) ?? 0.30;
  const derivedFeeField = (fields as Record<string, FddFieldMeta | undefined>)['total_ongoing_fee_pct'];
  const totalFeePct = (num(derivedFeeField) ?? (royaltyPct + mktgPct));

  // Estimated rent: extract midpoint from Item 7 real estate component
  // Rough heuristic: assume rent is 8% of mid-range investment
  const totalMid = ((num(fields.total_investment_min) ?? 0) + (num(fields.total_investment_max) ?? 0)) / 2;
  const estimatedRent = totalMid > 0 ? Math.round(totalMid * 0.08) : 30_000;

  // Labor: typical FTE × $35K average (entry-level franchise worker) × 1.25 burden
  const fte = num(fields.typical_fte_employees) ?? 3;
  const estimatedLabor = Math.round(fte * 35_000 * 1.25);

  // Debt service: investment amortized over 10 years at 8%
  const investmentMid = totalMid > 0 ? totalMid : (num(fields.total_investment_min) ?? 150_000);
  const debtService = Math.round(investmentMid * 0.08);

  function calcOde(auv: number): number {
    const grossProfit = auv * (1 - cogsPct);
    const fees = auv * totalFeePct;
    return Math.round(grossProfit - fees - estimatedRent - estimatedLabor - debtService);
  }

  const odeLow = auvLow ? calcOde(auvLow) : null;
  const odeMid = calcOde(auvMid);
  const odeHigh = auvHigh ? calcOde(auvHigh) : null;

  const result: DimensionResult =
    odeMid > 65_000 ? 'pass' :
    odeMid > 40_000 ? 'warn' : 'fail';

  const note =
    result === 'pass'
      ? `Estimated net income (mid case): $${odeMid.toLocaleString()}/yr — supports non-marginality`
      : result === 'warn'
      ? `Estimated net income (mid case): $${odeMid.toLocaleString()}/yr — marginal. Strong territory analysis needed.`
      : `Estimated net income (mid case): $${odeMid.toLocaleString()}/yr — below non-marginality threshold. Officer scrutiny likely.`;

  return { ode_low: odeLow, ode_mid: odeMid, ode_high: odeHigh, result, note };
}

// ============================================================================
// Dimension 3 — Non-Marginality
// ============================================================================

function scoreDimension3(
  fields: FddExtractedFields,
  ode: OdeAssessment
): DimensionScore {
  const checks: CheckResult[] = [];

  // Item 19 quality
  const item19Present = bool(fields.item19_present);
  const cherryPick = bool(fields.item19_cherry_pick_flag);
  const includesFranchisee = bool(fields.item19_includes_franchisee_units);

  const i19Result: DimensionResult =
    !item19Present ? 'fail' :
    cherryPick === true ? 'warn' :
    includesFranchisee === false ? 'warn' : 'pass';

  checks.push(checkResult(
    'Item 19 data quality',
    !item19Present ? 'Absent' : cherryPick ? 'Present — cherry-pick risk' : 'Present — system-wide',
    i19Result,
    !item19Present ? 'No FPR — projections rely entirely on territory analysis and franchisee calls' :
    cherryPick ? 'Disclosure appears selective — not full system performance' :
    includesFranchisee === false ? 'Company-owned units only — not representative of franchisee economics' :
    'Full system financial performance representation'
  ));

  // ODE assessment
  checks.push(checkResult(
    'Owner income (net after fees, rent, labor, debt)',
    ode.ode_mid !== null ? `$${ode.ode_mid.toLocaleString()}/yr est.` : 'Cannot calculate',
    ode.result,
    ode.note
  ));

  // Churn rate
  const closedYr1 = num(fields.units_closed_yr1) ?? 0;
  const closedYr2 = num(fields.units_closed_yr2) ?? 0;
  const closedYr3 = num(fields.units_closed_yr3) ?? 0;
  const totalUnits = num(fields.total_units_open_current) ?? 0;
  const totalClosed = closedYr1 + closedYr2 + closedYr3;
  const churnPct = totalUnits > 0 ? (totalClosed / 3) / totalUnits : null;

  const churnResult: DimensionResult =
    churnPct === null ? 'unknown' :
    churnPct < 0.05 ? 'pass' :
    churnPct < 0.12 ? 'warn' : 'fail';

  checks.push(checkResult(
    'System churn rate',
    churnPct !== null ? `${(churnPct * 100).toFixed(1)}% annual` : 'Unknown',
    churnResult,
    churnResult === 'pass' ? 'Low churn — healthy system' :
    churnResult === 'warn' ? 'Elevated churn — investigate closure reasons' :
    churnResult === 'fail' ? 'High churn — systemic unit economics problem likely' :
    'Cannot calculate — outlet data incomplete'
  ));

  // Royalty revenue trend
  const royaltyTrend = str(fields.royalty_revenue_trend);
  const trendResult: DimensionResult =
    royaltyTrend === 'growing' ? 'pass' :
    royaltyTrend === 'flat' ? 'warn' :
    royaltyTrend === 'declining' ? 'fail' : 'unknown';
  checks.push(checkResult(
    'Franchisor royalty revenue trend',
    royaltyTrend ?? 'Unknown',
    trendResult,
    trendResult === 'pass' ? 'Growing royalties = existing franchisees succeeding' :
    trendResult === 'warn' ? 'Flat royalties — system not growing' :
    trendResult === 'fail' ? 'Declining royalties — existing units underperforming' :
    'Trend not determinable from financials'
  ));

  // Audit opinion
  const auditOpinion = str(fields.audit_opinion);
  const auditResult: DimensionResult =
    auditOpinion === 'unqualified' ? 'pass' :
    auditOpinion === 'review_only' ? 'warn' :
    (auditOpinion === 'qualified' || auditOpinion === 'adverse') ? 'fail' : 'unknown';
  checks.push(checkResult(
    'Audit opinion',
    auditOpinion ?? 'Unknown',
    auditResult,
    auditResult === 'pass' ? 'Unqualified — clean audit opinion' :
    auditResult === 'warn' ? 'Review only — not a full audit' :
    auditResult === 'fail' ? 'Qualified or adverse — franchisor financial health concerns' :
    'Audit opinion not extracted'
  ));

  const overallResult = worstOf(...checks.map(c => c.result));
  return { name: 'Non-Marginality', result: overallResult, checks, critical_fail: false };
}

// ============================================================================
// Dimension 4 — Develop and Direct
// ============================================================================

function scoreDimension4(fields: FddExtractedFields): DimensionScore {
  const checks: CheckResult[] = [];

  // Training hours
  const trainingHours = num(fields.initial_training_hours);
  const trainingResult: DimensionResult =
    trainingHours === null ? 'unknown' :
    trainingHours > 80 ? 'pass' :
    trainingHours >= 40 ? 'warn' : 'fail';
  checks.push(checkResult(
    'Initial training program',
    trainingHours !== null ? `${trainingHours} hours` : 'Unknown',
    trainingResult,
    trainingResult === 'pass' ? 'Extensive training supports "develop and direct" argument' :
    trainingResult === 'warn' ? 'Moderate training — supplement with operational involvement evidence' :
    trainingResult === 'fail' ? 'Minimal training — weak "develop and direct" evidence' :
    'Training hours not disclosed'
  ));

  // Territory protection
  const territoryType = str(fields.territory_type);
  const territoryResult: DimensionResult =
    territoryType === 'exclusive' ? 'pass' :
    territoryType === 'protected' ? 'warn' :
    territoryType === 'none' ? 'fail' : 'unknown';
  checks.push(checkResult(
    'Territory protection',
    territoryType ?? 'Unknown',
    territoryResult,
    territoryResult === 'pass' ? 'Exclusive territory — strongest protection' :
    territoryResult === 'warn' ? 'Protected territory — bars other franchisees but not all channels' :
    territoryResult === 'fail' ? 'No territory protection — cannibalization risk, weak market exclusivity' :
    'Territory type not extracted'
  ));

  // Initial term vs E-2 renewal horizon
  const termYears = num(fields.initial_term_years);
  const termResult: DimensionResult =
    termYears === null ? 'unknown' :
    termYears >= 5 ? 'pass' :
    termYears >= 3 ? 'warn' : 'fail';
  checks.push(checkResult(
    'Initial term length',
    termYears !== null ? `${termYears} years` : 'Unknown',
    termResult,
    termResult === 'pass' ? 'Initial term covers E-2 renewal horizon' :
    termResult === 'warn' ? 'Term shorter than ideal — may need renewal before E-2 renewal' :
    termResult === 'fail' ? 'Short term — creates visa continuity risk at renewal' :
    'Term not extracted'
  ));

  // Cannibalization check
  const nearestBrandMiles = num(fields.franchisor_minimum_separation_miles);
  // We note this as informational — cannibalization requires Google Places data
  if (nearestBrandMiles !== null) {
    checks.push(checkResult(
      'Minimum unit separation',
      `${nearestBrandMiles} miles required`,
      'pass',
      'Minimum separation disclosed — verify nearest same-brand unit during territory analysis'
    ));
  }

  const overallResult = worstOf(...checks.map(c => c.result));
  return { name: 'Develop and Direct', result: overallResult, checks, critical_fail: false };
}

// ============================================================================
// Timing Assessment
// ============================================================================

export function assessTiming(fields: FddExtractedFields): TimingAssessment {
  const months = num(fields.typical_time_to_open_months);

  if (months === null) {
    return {
      months_to_open: null,
      risk: 'unknown',
      note: 'Time-to-open not determinable from FDD. Confirm with franchisor.',
    };
  }

  const risk: TimingAssessment['risk'] =
    months <= 3 ? 'low' : months <= 6 ? 'medium' : 'high';

  const note =
    risk === 'low'
      ? `Typically ${months} months from signing to opening. E-2 application window: funds must be committed and business in active formation.`
      : risk === 'medium'
      ? `Typically ${months} months to open. Plan your E-2 filing after lease signing and equipment orders — not after signing the franchise agreement.`
      : `Typically ${months}+ months to open. High timing risk. Your current visa must cover the build-out period. Consult an immigration attorney before signing.`;

  return { months_to_open: months, risk, note };
}

// ============================================================================
// Dimension 5 — Risk Flags
// ============================================================================

function collectFlags(
  fields: FddExtractedFields,
  staleStatus: FddStaleStatus,
  registrationStatus: FddRegistrationStatus
): FddFlag[] {
  const flags: FddFlag[] = [];

  if (staleStatus !== 'current') {
    flags.push({ key: 'fdd_stale', label: 'FDD may be outdated — request current version', severity: 'critical' });
  }

  if (registrationStatus === 'fail') {
    flags.push({ key: 'state_registration', label: 'Franchisor not confirmed registered in target state', severity: 'critical' });
  }

  const litigation = num(fields.franchisee_initiated_suits);
  if (litigation !== null && litigation >= 3) {
    flags.push({ key: 'litigation', label: `${litigation} franchisee-initiated suits — systemic concern`, severity: 'important' });
  }

  if (bool(fields.franchisor_bankruptcy_history) === true) {
    flags.push({ key: 'bankruptcy', label: 'Franchisor has bankruptcy history', severity: 'important' });
  }

  if (bool(fields.item19_cherry_pick_flag) === true) {
    flags.push({ key: 'cherry_pick', label: 'Item 19 appears to cherry-pick top performers', severity: 'important' });
  }

  if (bool(fields.item19_includes_franchisee_units) === false) {
    flags.push({ key: 'company_only_i19', label: 'Item 19 covers company units only — not franchisee economics', severity: 'important' });
  }

  // Mean/median gap > 30%
  const medianVsMean = num((fields as Record<string, FddFieldMeta>)['item19_median_vs_mean_gap'] as FddFieldMeta | undefined);
  if (medianVsMean !== null && medianVsMean > 0.30) {
    flags.push({ key: 'revenue_variability', label: `${Math.round(medianVsMean * 100)}% mean/median gap — high performance variability`, severity: 'important' });
  }

  const wcMonths = num(fields.working_capital_months_covered);
  if (wcMonths !== null && wcMonths < 6) {
    flags.push({ key: 'working_capital', label: `Item 7 WC estimate covers only ${wcMonths} months`, severity: 'important' });
  }

  if (bool(fields.renewal_on_current_terms) === false) {
    flags.push({ key: 'renewal_terms', label: 'Renewal requires signing new (potentially worse) agreement', severity: 'important' });
  }

  const cureDays = num(fields.cure_period_days);
  if (cureDays !== null && cureDays < 10) {
    flags.push({ key: 'cure_period', label: `Cure period only ${cureDays} days — aggressive enforcement risk`, severity: 'important' });
  }

  const nonCompeteYears = num(fields.post_termination_noncompete_years);
  const nonCompeteMiles = num(fields.post_termination_noncompete_radius_miles);
  if ((nonCompeteYears !== null && nonCompeteYears > 2) || (nonCompeteMiles !== null && nonCompeteMiles > 50)) {
    flags.push({ key: 'noncompete', label: 'Broad post-termination non-compete restricts exit options', severity: 'important' });
  }

  if (bool(fields.fee_escalation_rights) === true) {
    flags.push({ key: 'fee_escalation', label: 'Franchisor can raise fees unilaterally', severity: 'important' });
  }

  if (bool(fields.ecommerce_carve_out) === true) {
    flags.push({ key: 'ecommerce_carveout', label: 'E-commerce carve-out — franchisor can sell in your territory online', severity: 'important' });
  }

  if (bool(fields.transfer_to_entity_allowed) === false) {
    flags.push({ key: 'entity_transfer', label: 'Cannot transfer to LLC/corporation — blocks standard E-2 structure', severity: 'critical' });
  }

  if (bool(fields.right_of_first_refusal_on_sale) === true) {
    flags.push({ key: 'rofr', label: 'Franchisor right of first refusal on sale limits exit flexibility', severity: 'important' });
  }

  // COVID period flag
  const covidFlag = (fields as Record<string, FddFieldMeta>)['covid_period_flag'];
  if (bool(covidFlag as FddFieldMeta) === true) {
    const fiscalYear = num(fields.item19_fiscal_year);
    flags.push({ key: 'covid_data', label: `Item 19 data from ${fiscalYear ?? 'COVID period'} — may not reflect steady-state performance`, severity: 'important' });
  }

  return flags;
}

// ============================================================================
// Overall compatibility
// ============================================================================

function computeOverall(
  dim1: DimensionScore,
  dim2: DimensionScore,
  dim3: DimensionScore,
  dim4: DimensionScore,
  flags: FddFlag[]
): FddCompatibility {
  // Any critical fail in Dim 1 = INELIGIBLE
  if (dim1.critical_fail) return 'INELIGIBLE';

  const criticalFlags = flags.filter(f => f.severity === 'critical').length;
  if (criticalFlags >= 2) return 'INELIGIBLE';

  const allResults = [dim1.result, dim2.result, dim3.result, dim4.result];
  const failCount = allResults.filter(r => r === 'fail').length;
  const warnCount = allResults.filter(r => r === 'warn').length;

  if (failCount >= 2) return 'CAUTION';
  if (failCount === 1) return 'CAUTION';
  if (warnCount >= 3) return 'CAUTION';
  if (warnCount >= 1 || flags.length >= 3) return 'VIABLE';
  return 'STRONG';
}

// ============================================================================
// Main entry point
// ============================================================================

export function scoreFdd(
  fields: FddExtractedFields,
  staleStatus: FddStaleStatus,
  registrationStatus: FddRegistrationStatus,
  investorLiquidCapital: number | null
): ScoringResult {
  const ode = computeOde(fields);
  const timing = assessTiming(fields);

  const dim1 = scoreDimension1(fields, staleStatus, registrationStatus);
  const dim2 = scoreDimension2(fields, investorLiquidCapital);
  const dim3 = scoreDimension3(fields, ode);
  const dim4 = scoreDimension4(fields);
  const flags = collectFlags(fields, staleStatus, registrationStatus);

  const overall = computeOverall(dim1, dim2, dim3, dim4, flags);

  return {
    overall,
    eligibility_gates: dim1,
    investment_substantiality: dim2,
    non_marginality: dim3,
    develop_and_direct: dim4,
    flags,
    ode,
    timing,
    flag_count: flags.length,
  };
}
