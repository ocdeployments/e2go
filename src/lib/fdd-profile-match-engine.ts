// ============================================================================
// FDD Profile Match Engine — FDD-G1
// Scores investor profile against franchise requirements.
// Pure deterministic math — no LLM calls, safe to run client-side.
// ============================================================================

import type { FddExtractedFields } from '@/types/fdd';
import { substantialityPassThreshold } from '@/lib/e2-thresholds';

export type ProfileMatchGrade = 'pass' | 'viable' | 'caution' | 'fail' | 'unknown';

export interface ProfileMatchDimension {
  name: string;
  result: ProfileMatchGrade;
  investor_value: string;
  requirement: string;
  gap: string | null;
  note: string;
}

export interface ProfileMatchResult {
  overall: 'STRONG_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'POOR_FIT' | 'INSUFFICIENT_DATA';
  fit_score: number;  // 0–100
  dimensions: {
    capital_adequacy: ProfileMatchDimension;
    e2_substantiality: ProfileMatchDimension;
    role_alignment: ProfileMatchDimension;
    employment_creation: ProfileMatchDimension;
    net_worth_position: ProfileMatchDimension;
  };
  top_gap: string | null;
  recommendation: string;
}

// ============================================================================
// Helpers
// ============================================================================

function n(f: FddExtractedFields, key: keyof FddExtractedFields): number | null {
  const v = f[key]?.value;
  return typeof v === 'number' ? v : null;
}

function s(f: FddExtractedFields, key: keyof FddExtractedFields): string | null {
  const v = f[key]?.value;
  return typeof v === 'string' ? v.trim() : null;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function gradeToScore(g: ProfileMatchGrade): number {
  return { pass: 100, viable: 75, caution: 40, fail: 0, unknown: 50 }[g];
}

// ============================================================================
// Delegated to e2-thresholds.ts — canonical 9 FAM 402.9-6(D) sliding scale.
const substantialityThreshold = substantialityPassThreshold;

// ============================================================================
// Dimension 1 — Capital Adequacy
// Can the investor actually fund this franchise?
// ============================================================================
function scoreCapitalAdequacy(
  liquidCapital: number | null,
  investMin: number | null,
  investMax: number | null
): ProfileMatchDimension {
  const name = 'Capital Adequacy';

  if (liquidCapital === null) {
    return {
      name, result: 'unknown',
      investor_value: 'Not provided',
      requirement: investMin ? `Min ${fmtCurrency(investMin)}` : 'See Item 7',
      gap: null,
      note: 'No investor capital figure was provided during FDD upload. Enter your liquid capital in the FDD intake form to score this dimension.',
    };
  }

  if (investMin === null && investMax === null) {
    return {
      name, result: 'unknown',
      investor_value: fmtCurrency(liquidCapital),
      requirement: 'Not disclosed (Item 7 missing)',
      gap: null,
      note: 'Item 7 investment range was not extracted. Review the raw FDD fields for the total investment estimate.',
    };
  }

  const min = investMin ?? (investMax! * 0.6);
  const max = investMax ?? (investMin! * 1.6);
  const midpoint = (min + max) / 2;

  const requirementText = `${fmtCurrency(min)}–${fmtCurrency(max)}`;

  if (liquidCapital >= max) {
    return {
      name, result: 'pass',
      investor_value: fmtCurrency(liquidCapital),
      requirement: requirementText,
      gap: null,
      note: `Your liquid capital exceeds the maximum investment estimate. Full funding capacity — no financing required to open.`,
    };
  }

  if (liquidCapital >= min) {
    const shortfall = max - liquidCapital;
    return {
      name, result: 'viable',
      investor_value: fmtCurrency(liquidCapital),
      requirement: requirementText,
      gap: `${fmtCurrency(shortfall)} below maximum`,
      note: `Covers the minimum investment range. To reach the midpoint (${fmtCurrency(midpoint)}), you'd need an additional ${fmtCurrency(midpoint - liquidCapital)} — a modest SBA 7(a) or seller-financed working capital line could cover this.`,
    };
  }

  if (liquidCapital >= min * 0.6) {
    const shortfall = min - liquidCapital;
    return {
      name, result: 'caution',
      investor_value: fmtCurrency(liquidCapital),
      requirement: requirementText,
      gap: `${fmtCurrency(shortfall)} below minimum`,
      note: `Capital is below the stated minimum. The gap (${fmtCurrency(shortfall)}) would require financing. Note: E-2 requires funds to be "at risk" — debt secured only by business assets is acceptable, but personal guarantees backed by non-business collateral complicate the substantiality test.`,
    };
  }

  return {
    name, result: 'fail',
    investor_value: fmtCurrency(liquidCapital),
    requirement: requirementText,
    gap: `${fmtCurrency(min - liquidCapital)} below minimum`,
    note: `Liquid capital is significantly below the Item 7 minimum. This would require substantial outside financing — which may undermine the E-2 "at risk" and substantiality requirements. Consider a lower-investment concept or a resale unit at a reduced purchase price.`,
  };
}

// ============================================================================
// Dimension 2 — E-2 Substantiality (9 FAM 402.9-6(D))
// The investment must be "substantial" relative to the total cost of the enterprise.
// ============================================================================
function scoreE2Substantiality(
  liquidCapital: number | null,
  netWorth: number | null,
  investMin: number | null,
  investMax: number | null
): ProfileMatchDimension {
  const name = 'E-2 Substantiality (9 FAM 402.9-6)';

  if (liquidCapital === null || (investMin === null && investMax === null)) {
    return {
      name, result: 'unknown',
      investor_value: liquidCapital ? fmtCurrency(liquidCapital) : 'Not provided',
      requirement: 'Sliding scale vs. total investment cost',
      gap: null,
      note: 'Cannot assess substantiality without both investor capital and Item 7 investment range.',
    };
  }

  // Use midpoint for E-2 substantiality test
  const min = investMin ?? (investMax! * 0.6);
  const max = investMax ?? (investMin! * 1.6);
  const midpoint = (min + max) / 2;
  const threshold = substantialityThreshold(midpoint);
  const requiredAmount = midpoint * threshold;
  const actualRatio = liquidCapital / midpoint;

  const thresholdPct = Math.round(threshold * 100);
  const actualPct = Math.round(actualRatio * 100);
  const requirementText = `~${thresholdPct}% of ${fmtCurrency(midpoint)} = ${fmtCurrency(requiredAmount)}`;

  if (liquidCapital >= requiredAmount * 1.1) {
    return {
      name, result: 'pass',
      investor_value: `${fmtCurrency(liquidCapital)} (${actualPct}% of midpoint)`,
      requirement: requirementText,
      gap: null,
      note: `Exceeds the substantiality threshold with a comfortable margin. Consular officers typically expect ${thresholdPct}% of the total investment cost to come from the investor's own funds at this price point.`,
    };
  }

  if (liquidCapital >= requiredAmount) {
    return {
      name, result: 'viable',
      investor_value: `${fmtCurrency(liquidCapital)} (${actualPct}% of midpoint)`,
      requirement: requirementText,
      gap: null,
      note: `Meets the substantiality threshold. The margin is thin — a higher-than-midpoint build-out cost could push you below the line. Document every dollar of pre-opening spend with source-of-funds paper trail.`,
    };
  }

  if (liquidCapital >= requiredAmount * 0.75 || (netWorth !== null && netWorth >= requiredAmount)) {
    const shortfall = requiredAmount - liquidCapital;
    return {
      name, result: 'caution',
      investor_value: `${fmtCurrency(liquidCapital)} (${actualPct}% of midpoint)`,
      requirement: requirementText,
      gap: `${fmtCurrency(shortfall)} below threshold`,
      note: `Below the typical substantiality threshold by ${fmtCurrency(shortfall)}. If your net worth (${netWorth ? fmtCurrency(netWorth) : 'not provided'}) can be partially liquidated or leveraged to close the gap, officers may accept this. Requires a detailed source-of-funds declaration and attorney brief.`,
    };
  }

  const shortfall = requiredAmount - liquidCapital;
  return {
    name, result: 'fail',
    investor_value: `${fmtCurrency(liquidCapital)} (${actualPct}% of midpoint)`,
    requirement: requirementText,
    gap: `${fmtCurrency(shortfall)} below threshold`,
    note: `Materially below the 9 FAM 402.9-6(D) substantiality threshold for this investment size. The consular officer would likely deny on substantiality grounds. Consider a lower-cost franchise concept, or demonstrate that the balance is already irrevocably committed (down payment paid, lease signed) to satisfy the "at risk" requirement.`,
  };
}

// ============================================================================
// Dimension 3 — Role Alignment
// Does the franchise require active owner-operator, or allow passive management?
// ============================================================================
function scoreRoleAlignment(fields: FddExtractedFields): ProfileMatchDimension {
  const name = 'Develop & Direct Role Requirement';

  const roleRaw = s(fields, 'investor_role');
  const hoursRaw = n(fields, 'investor_hours_per_week');

  if (!roleRaw && hoursRaw === null) {
    return {
      name, result: 'unknown',
      investor_value: 'Not specified',
      requirement: 'Active management required for E-2',
      gap: null,
      note: 'Role expectations not extracted from Item 11. Check the training and operations sections of the FDD. E-2 requires the investor to "develop and direct" the enterprise — pure absentee ownership disqualifies.',
    };
  }

  const roleLower = (roleRaw ?? '').toLowerCase();
  const isAbsentee = roleLower.includes('absentee') || roleLower.includes('passive') || roleLower.includes('semi-absentee');
  const isActive   = roleLower.includes('active') || roleLower.includes('owner-operator') || roleLower.includes('hands-on') || roleLower.includes('full-time');

  // E-2 requires ≥20 hours/week active involvement as a rough benchmark; 40 hrs is safest
  if (isAbsentee) {
    return {
      name, result: 'caution',
      investor_value: 'Passive/absentee investor',
      requirement: roleRaw ?? 'Active management expected',
      gap: 'Passive model conflicts with E-2 develop-and-direct requirement',
      note: `This franchise markets itself as ${roleLower.includes('semi') ? 'semi-' : ''}absentee. E-2 requires the investor to "develop and direct" the enterprise. Pure absentee ownership is disqualifying. An E-2 officer will scrutinize any claim that a hired manager runs the business day-to-day. You must demonstrate supervisory control, strategic decision-making authority, and substantive involvement.`,
    };
  }

  if (isActive) {
    return {
      name, result: 'pass',
      investor_value: 'Active owner-operator',
      requirement: roleRaw ?? 'Active management',
      gap: null,
      note: `Active owner-operator model aligns well with the E-2 develop-and-direct test. ${hoursRaw !== null ? `At ${hoursRaw} hours/week, this clearly demonstrates meaningful involvement.` : 'Document your operational role in the business plan and maintain a management log post-approval.'}`,
    };
  }

  // Ambiguous role
  return {
    name, result: 'viable',
    investor_value: roleRaw ?? 'Not clearly specified',
    requirement: 'Active direction of enterprise',
    gap: 'Role description is ambiguous — needs documentation',
    note: `The Item 11 role description is not clearly active or passive. ${hoursRaw !== null ? `At ${hoursRaw} hrs/week, the time commitment supports an active-management interpretation.` : ''} Ensure your business plan explicitly describes your management role, decision-making authority, and day-to-day oversight responsibilities.`,
  };
}

// ============================================================================
// Dimension 4 — Employment Creation
// E-2 non-marginality test: must create more than marginal living for investor alone.
// ============================================================================
function scoreEmploymentCreation(fields: FddExtractedFields): ProfileMatchDimension {
  const name = 'Employment Creation (Non-Marginality)';

  const fte = n(fields, 'typical_fte_employees');
  const openingDay = n(fields, 'opening_day_employees');
  const employees = fte ?? openingDay;

  if (employees === null) {
    return {
      name, result: 'unknown',
      investor_value: 'Not extracted',
      requirement: '≥2 qualifying US employees (recommended)',
      gap: null,
      note: 'Employee count not found in Item 11. Review the operations and staffing section of the FDD directly. E-2 requires the business to have more than marginal economic impact — creating ≥2 full-time US jobs is the practical standard most officers apply.',
    };
  }

  if (employees >= 5) {
    return {
      name, result: 'pass',
      investor_value: `${employees} FTE employees`,
      requirement: '≥2 qualifying US employees',
      gap: null,
      note: `${employees} full-time employees is well above the E-2 non-marginality threshold. This franchise clearly demonstrates broader economic contribution beyond supporting the investor's household — a strong point for the business plan.`,
    };
  }

  if (employees >= 2) {
    return {
      name, result: 'viable',
      investor_value: `${employees} FTE employees`,
      requirement: '≥2 qualifying US employees',
      gap: null,
      note: `${employees} employees meets the basic non-marginality threshold. Be specific in your business plan: include job titles, hours, wages, and when you expect each hire. A lean staffing model with ${employees} employees passes but leaves less margin if the business opens below projections.`,
    };
  }

  if (employees === 1) {
    return {
      name, result: 'caution',
      investor_value: `1 FTE employee`,
      requirement: '≥2 qualifying US employees',
      gap: 'Single employee model is borderline for non-marginality',
      note: `A 1-employee model is risky for E-2 non-marginality. Officers often view this as a business that primarily benefits only the investor. Strengthen your case by projecting Year 1 growth to 3+ employees with documented hiring plan, payroll budget, and economic impact statement. Include contractor relationships if applicable.`,
    };
  }

  // 0 employees
  return {
    name, result: 'fail',
    investor_value: `0 employees (solo operator)`,
    requirement: '≥2 qualifying US employees',
    gap: 'No US employees — fails non-marginality',
    note: `A solo operator franchise creates no qualifying US employment and will almost certainly fail the E-2 non-marginality test. The business must be more than a vehicle for the investor's own livelihood. This concept is structurally misaligned with E-2 requirements unless you can project and commit to hiring ≥2 US employees within 6 months of opening.`,
  };
}

// ============================================================================
// Dimension 5 — Net Worth Position
// Does the investor's overall financial standing support E-2 approval?
// ============================================================================
function scoreNetWorthPosition(
  liquidCapital: number | null,
  netWorth: number | null,
  investMin: number | null,
  _investMax: number | null
): ProfileMatchDimension {
  const name = 'Financial Position (Net Worth)';

  if (netWorth === null && liquidCapital === null) {
    return {
      name, result: 'unknown',
      investor_value: 'Not provided',
      requirement: 'Net worth ≥ 2× total investment (recommended)',
      gap: null,
      note: 'No financial data provided. While not a hard E-2 requirement, demonstrating net worth significantly above the investment amount strengthens the "substantial" investment argument and shows financial credibility to the officer.',
    };
  }

  const investment = investMin ?? 0;
  const worth = netWorth ?? (liquidCapital ?? 0);
  const ratio = investment > 0 ? worth / investment : null;

  const worthText = fmtCurrency(worth);
  const reqText = investment > 0 ? `≥${fmtCurrency(investment * 2)} (2× investment)` : 'Net worth data';

  if (ratio === null) {
    return {
      name, result: 'unknown',
      investor_value: worthText,
      requirement: reqText,
      gap: null,
      note: 'Investment range not available for net worth ratio calculation.',
    };
  }

  if (ratio >= 3) {
    return {
      name, result: 'pass',
      investor_value: `${worthText} (${ratio.toFixed(1)}× investment)`,
      requirement: reqText,
      gap: null,
      note: `Strong financial standing at ${ratio.toFixed(1)}× the minimum investment. This supports the "investor of substance" narrative and reduces the risk of any officer scrutiny on financial capacity.`,
    };
  }

  if (ratio >= 2) {
    return {
      name, result: 'viable',
      investor_value: `${worthText} (${ratio.toFixed(1)}× investment)`,
      requirement: reqText,
      gap: null,
      note: `Net worth at ${ratio.toFixed(1)}× the minimum investment — adequate but not a commanding financial position. Provide a detailed personal financial statement to the consular officer showing the full asset picture.`,
    };
  }

  if (ratio >= 1.2) {
    return {
      name, result: 'caution',
      investor_value: `${worthText} (${ratio.toFixed(1)}× investment)`,
      requirement: reqText,
      gap: `Net worth only ${ratio.toFixed(1)}× investment minimum`,
      note: `Net worth is close to the investment amount — this leaves little financial cushion. Officers may question whether investing this amount truly constitutes a "substantial" outlay relative to the investor's total wealth. Consider investing in a franchise toward the lower end of Item 7's range to improve this ratio.`,
    };
  }

  return {
    name, result: 'fail',
    investor_value: `${worthText} (${ratio.toFixed(1)}× investment)`,
    requirement: reqText,
    gap: `Net worth below total investment amount`,
    note: `Net worth below the total investment is a red flag. E-2 substantiality is partly a proportionality test — investing the majority of one's total wealth in a business supports the "substantial" argument, but when net worth is less than the investment, it suggests the funds may be borrowed or that the investor's financial picture is incomplete. Full financial disclosure and attorney review are critical.`,
  };
}

// ============================================================================
// Overall fit scoring
// ============================================================================

function computeOverall(
  dims: ProfileMatchResult['dimensions']
): { overall: ProfileMatchResult['overall']; fit_score: number } {
  const weights: Record<keyof ProfileMatchResult['dimensions'], number> = {
    capital_adequacy:    0.30,
    e2_substantiality:   0.30,
    role_alignment:      0.20,
    employment_creation: 0.15,
    net_worth_position:  0.05,
  };

  let weightedSum = 0;
  let knownWeight = 0;

  for (const [key, dim] of Object.entries(dims)) {
    const w = weights[key as keyof typeof weights];
    if (dim.result !== 'unknown') {
      weightedSum += gradeToScore(dim.result) * w;
      knownWeight += w;
    }
  }

  const score = knownWeight > 0 ? Math.round(weightedSum / knownWeight) : 50;

  const overall: ProfileMatchResult['overall'] =
    knownWeight < 0.4 ? 'INSUFFICIENT_DATA' :
    score >= 80 ? 'STRONG_FIT' :
    score >= 60 ? 'GOOD_FIT' :
    score >= 35 ? 'PARTIAL_FIT' : 'POOR_FIT';

  return { overall, fit_score: score };
}

function getTopGap(dims: ProfileMatchResult['dimensions']): string | null {
  const priority: Array<keyof ProfileMatchResult['dimensions']> = [
    'e2_substantiality', 'capital_adequacy', 'role_alignment', 'employment_creation', 'net_worth_position',
  ];
  for (const key of priority) {
    const d = dims[key];
    if (d.result === 'fail' && d.gap) return d.gap;
  }
  for (const key of priority) {
    const d = dims[key];
    if (d.result === 'caution' && d.gap) return d.gap;
  }
  return null;
}

function buildRecommendation(overall: ProfileMatchResult['overall'], topGap: string | null): string {
  switch (overall) {
    case 'STRONG_FIT':
      return 'Your investor profile is well-matched to this franchise for E-2 purposes. Focus your attorney review on documentation quality and business plan narrative.';
    case 'GOOD_FIT':
      return `Your profile generally fits this franchise. ${topGap ? `Address the key gap — ${topGap} — before filing.` : 'Minor gaps should be addressable with good documentation.'}`;
    case 'PARTIAL_FIT':
      return `Significant gaps exist between your profile and this franchise's E-2 requirements. ${topGap ? `The most critical issue: ${topGap}.` : ''} Consider whether a different franchise concept might be a stronger fit.`;
    case 'POOR_FIT':
      return `Your current profile has fundamental mismatches with this franchise for E-2. ${topGap ? `Priority issue: ${topGap}.` : ''} We recommend consulting an immigration attorney before proceeding and exploring alternative franchise concepts.`;
    case 'INSUFFICIENT_DATA':
      return 'Not enough investor or franchise data to score profile fit. Complete the investor profile (liquid capital, net worth) in the FDD intake form to unlock this analysis.';
  }
}

// ============================================================================
// Main export
// ============================================================================

export function matchInvestorProfile(
  fields: FddExtractedFields,
  investorLiquidCapital: number | null,
  investorNetWorth: number | null
): ProfileMatchResult {
  const investMin = fields.total_investment_min?.value as number | null ?? null;
  const investMax = fields.total_investment_max?.value as number | null ?? null;

  const dims: ProfileMatchResult['dimensions'] = {
    capital_adequacy:    scoreCapitalAdequacy(investorLiquidCapital, investMin, investMax),
    e2_substantiality:   scoreE2Substantiality(investorLiquidCapital, investorNetWorth, investMin, investMax),
    role_alignment:      scoreRoleAlignment(fields),
    employment_creation: scoreEmploymentCreation(fields),
    net_worth_position:  scoreNetWorthPosition(investorLiquidCapital, investorNetWorth, investMin, investMax ?? null),
  };

  const { overall, fit_score } = computeOverall(dims);
  const topGap = getTopGap(dims);

  return {
    overall,
    fit_score,
    dimensions: dims,
    top_gap: topGap,
    recommendation: buildRecommendation(overall, topGap),
  };
}
