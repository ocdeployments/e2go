/**
 * Pre-Generation Validation Function
 *
 * Shared source of truth for Category A checks. Exported and independently
 * testable — Spec4 Stage 4 should call THIS function rather than
 * re-deriving consistency rules.
 *
 * Checks:
 * - 5 original Category A: missing data (investment_amount_usd, fund_sources,
 *   business_type, net_worth_usd, LLC_name)
 * - 3 new consistency checks: breakdown_sum vs total, sources_sum vs total,
 *   total_business_cost_usd present
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  /** Human-readable explanation when check fails */
  failureReason?: string;
  /** Which tab/module to return the applicant to */
  returnTab?: string;
  /** Specific instruction for the applicant */
  instruction?: string;
}

export interface InvestmentLineItem {
  key: string;
  label: string;
  amount: number | null;
}

export interface FundSourceItem {
  key: string;
  label: string;
  amount: number | null;
}

export interface PreGenerationValidationResult {
  readyForGeneration: boolean;
  checks: ValidationCheck[];
  /** Subset of checks that failed */
  blockingGaps: ValidationCheck[];
  /** Investment breakdown data for the confirmation panel */
  investmentBreakdown: {
    totalInvested: number | null;
    totalBusinessCost: number | null;
    lineItems: InvestmentLineItem[];
    breakdownSum: number;
    breakdownMatchesTotal: boolean;
  };
  /** Fund sources data for the confirmation panel */
  fundSources: {
    sources: FundSourceItem[];
    sourcesSum: number;
    sourcesMatchTotal: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOLERANCE = 1; // $1 rounding tolerance

function sumsWithin(a: number | null, b: number | null, tolerance: number = TOLERANCE): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tolerance;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[$,]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

function getString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

// ---------------------------------------------------------------------------
// Line item definitions — mirrors generation-engine.ts extractInvestmentBreakdown
// ---------------------------------------------------------------------------

const LINE_ITEM_DEFS: { key: string; label: string; answerKey: string }[] = [
  { key: 'franchise_fee', label: 'Franchise fee', answerKey: 'franchise_fee' },
  { key: 'leasehold_improvements', label: 'Build-out of your space', answerKey: 'leasehold_improvements' },
  { key: 'equipment_technology', label: 'Equipment & technology', answerKey: 'equipment_technology' },
  { key: 'educational_materials', label: 'Educational materials', answerKey: 'educational_materials' },
  { key: 'working_capital', label: 'Working capital', answerKey: 'working_capital' },
  { key: 'professional_fees', label: 'Professional fees', answerKey: 'professional_fees' },
  { key: 'marketing_launch', label: 'Marketing & launch', answerKey: 'marketing_launch' },
];

const FUND_SOURCE_LABELS: Record<string, string> = {
  savings: 'Personal savings',
  'property-sale': 'Sale of property',
  rrsp: 'RRSP withdrawal',
  tfsa: 'TFSA withdrawal',
  lira: 'LIRA or pension',
  'business-sale': 'Sale of a business',
  inheritance: 'Inheritance or gift',
  crypto: 'Cryptocurrency',
  loan: 'Loan',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

/**
 * Run all Category A checks against an applicant's answers.
 *
 * @param answers - Record of question_key → answer_value from the answers table
 * @returns PreGenerationValidationResult with all checks, data for the panel,
 *          and blocking gaps if any
 */
export function validateForGeneration(
  answers: Record<string, unknown>
): PreGenerationValidationResult {
  const checks: ValidationCheck[] = [];

  // Extract core investment figures
  const investmentAmountUsd = getNumber(answers['M3-F-02']);
  const totalBusinessCostUsd = getNumber(answers['M3-F-03']);
  const netWorthUsd = getNumber(answers['M3-F-NET']);
  const businessType = getString(answers['business_type']) || getString(answers['qb-type']);
  const llcName = getString(answers['M3-F-09']) || getString(answers['llc_name']);

  // Extract fund source types (multi-select)
  const fundSourceRaw = answers['M3-F-05'];
  const fundSourceTypes: string[] = Array.isArray(fundSourceRaw)
    ? fundSourceRaw
    : typeof fundSourceRaw === 'string'
      ? fundSourceRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  // Extract investment breakdown line items
  const lineItems: InvestmentLineItem[] = LINE_ITEM_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    amount: getNumber(answers[def.answerKey]),
  }));

  const breakdownSum = lineItems.reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0
  );

  // Extract fund source items
  const sources: FundSourceItem[] = fundSourceTypes.map((type) => ({
    key: type,
    label: FUND_SOURCE_LABELS[type] || type,
    amount: null, // Individual fund source amounts not stored separately
  }));

  const sourcesSum = sources.reduce(
    (sum, src) => sum + (src.amount ?? 0),
    0
  );

  // Check: breakdown matches total (within $1 tolerance)
  const breakdownMatchesTotal = sumsWithin(breakdownSum, investmentAmountUsd);

  // Check: sources match total — only check if individual amounts exist
  const sourcesMatchTotal = sources.some((s) => s.amount !== null)
    ? sumsWithin(sourcesSum, investmentAmountUsd)
    : true; // Can't validate without individual amounts

  // --- Original 5 Category A checks (missing data) ---

  checks.push({
    id: 'investment_amount_missing',
    label: 'Investment amount',
    passed: investmentAmountUsd !== null,
    failureReason: investmentAmountUsd === null
      ? 'Total investment amount (USD) is missing'
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Please enter your total investment amount in USD.',
  });

  checks.push({
    id: 'fund_sources_missing',
    label: 'Fund sources',
    passed: fundSourceTypes.length > 0,
    failureReason: fundSourceTypes.length === 0
      ? 'No fund sources have been selected'
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Please select at least one source of funds.',
  });

  checks.push({
    id: 'business_type_missing',
    label: 'Business type',
    passed: businessType !== null,
    failureReason: businessType === null
      ? 'Business type is not set'
      : undefined,
    returnTab: '/apply/business',
    instruction: 'Please select your business type.',
  });

  checks.push({
    id: 'net_worth_missing',
    label: 'Net worth',
    passed: netWorthUsd !== null,
    failureReason: netWorthUsd === null
      ? 'Net worth (USD) is missing'
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Please enter your approximate net worth in USD.',
  });

  checks.push({
    id: 'llc_name_missing',
    label: 'LLC name',
    passed: llcName !== null,
    failureReason: llcName === null
      ? 'LLC name is missing (required for Batch 2 documents)'
      : undefined,
    returnTab: '/apply/business',
    instruction: 'Please enter your LLC or business name.',
  });

  // --- New 3 Category A checks (internal consistency) ---

  checks.push({
    id: 'total_business_cost_missing',
    label: 'Total business cost',
    passed: totalBusinessCostUsd !== null,
    failureReason: totalBusinessCostUsd === null
      ? 'Total business cost (USD) is missing — investment_pct_of_business_cost cannot be computed'
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Please enter the total cost to establish your business in USD.',
  });

  checks.push({
    id: 'breakdown_sum_mismatch',
    label: 'Investment breakdown consistency',
    passed: investmentAmountUsd === null
      ? true // Can't check without a total — the missing check handles this
      : breakdownMatchesTotal,
    failureReason: !breakdownMatchesTotal && investmentAmountUsd !== null
      ? `Breakdown items sum to $${breakdownSum.toLocaleString()}, but total investment is $${investmentAmountUsd.toLocaleString()}`
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Your investment line items don\'t add up to your total. Please review your breakdown.',
  });

  checks.push({
    id: 'fund_sources_sum_mismatch',
    label: 'Fund sources consistency',
    passed: investmentAmountUsd === null
      ? true // Can't check without a total
      : sourcesMatchTotal,
    failureReason: !sourcesMatchTotal && investmentAmountUsd !== null
      ? `Fund sources sum to $${sourcesSum.toLocaleString()}, but total investment is $${investmentAmountUsd.toLocaleString()}`
      : undefined,
    returnTab: '/apply/investment',
    instruction: 'Your fund source amounts don\'t add up to your total investment. Please review.',
  });

  // Determine readiness
  const blockingGaps = checks.filter((c) => !c.passed);
  const readyForGeneration = blockingGaps.length === 0;

  return {
    readyForGeneration,
    checks,
    blockingGaps,
    investmentBreakdown: {
      totalInvested: investmentAmountUsd,
      totalBusinessCost: totalBusinessCostUsd,
      lineItems,
      breakdownSum,
      breakdownMatchesTotal,
    },
    fundSources: {
      sources,
      sourcesSum,
      sourcesMatchTotal,
    },
  };
}
