/**
 * WS4 / CPU Intelligence Pack — 4D Substantiality & marginality intelligence, D15/D16
 *
 * D15 — Marginality is a living-wage question. Projected owner income must
 *       clear the household's realistic needs (Federal Poverty Guidelines
 *       multiple as floor) — and for partnerships, per investor household.
 * D16 — The 5-year horizon guardrail. Path B (future-capacity) marginality
 *       claims must materialize within 5 years of visa issuance.
 *
 * This is the non-franchise equivalent of fdd-scoring-engine.ts's computeOde()
 * — that module needs Item 19 AUV data and only exists for franchise cases.
 * This module works from case-financials.ts's Year 1-5 projections (owner
 * draw + net income), which every case (franchise or independent) captures.
 *
 * Household size: the live intake (Q0-03 / M3-L-family) only captures a
 * composition string ("spouse", "children", "none"), not an exact headcount.
 * This computes a conservative MINIMUM household size from that string —
 * the true size could be larger with multiple children, which cannot be
 * known without fabricating a number. The floor computed here is therefore
 * a lower bound on the living-wage bar, not an exact figure — callers must
 * treat "clears the floor" as necessary, not sufficient.
 *
 * Federal Poverty Guidelines (48 contiguous states + DC), 100% level, per HHS
 * ASPE, published January 2026: $15,960 for a household of 1, +$5,680 per
 * additional person. https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
 * This is a published, dated external figure, not an estimate — but it
 * changes annually and this constant must be refreshed each January.
 *
 * Ground rule (same as case-financials.ts): never fabricate. Where a figure
 * is not on file, the result is null/insufficient_data with an explanatory
 * note, never a guess.
 */

import type { CaseFinancials } from './case-financials';

export type HouseholdSizeConfidence = 'known_minimum' | 'unknown';

export interface HouseholdSizeEstimate {
  minSize: number;
  confidence: HouseholdSizeConfidence;
  note: string;
}

// 2026 Federal Poverty Guidelines, 48 contiguous states + DC, 100% level.
// Refresh in January each year against https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const FPG_BASE_2026 = 15_960; // household of 1
const FPG_INCREMENT_2026 = 5_680; // per additional person

export function computeFederalPovertyGuideline(householdSize: number): number {
  const size = Math.max(1, Math.round(householdSize));
  return FPG_BASE_2026 + FPG_INCREMENT_2026 * (size - 1);
}

/**
 * Parses the family-composition string captured at Q0-03 / M3-L-family
 * (e.g. "spouse", "spouse and children", "none") into a conservative
 * MINIMUM household size. Never invents a specific child count.
 */
export function estimateHouseholdSize(familyComposition: string | null): HouseholdSizeEstimate {
  if (!familyComposition || !familyComposition.trim()) {
    return {
      minSize: 1,
      confidence: 'unknown',
      note: 'No family/dependents data on file (Q0-03 / M3-L-family) — assuming a solo household as a floor; actual household may be larger.',
    };
  }
  const v = familyComposition.toLowerCase();
  if (v.includes('none') || v === 'no') {
    return { minSize: 1, confidence: 'known_minimum', note: 'No dependents on file.' };
  }
  const hasSpouse = v.includes('spouse') || v.includes('married');
  const hasChildren = v.includes('child');

  if (hasChildren) {
    const minSize = hasSpouse ? 3 : 2;
    return {
      minSize,
      confidence: 'unknown',
      note: `Family composition includes children, but the live intake does not capture an exact count — using ${minSize} as a conservative MINIMUM household size (${hasSpouse ? 'applicant + spouse + at least 1 child' : 'applicant + at least 1 child'}). Actual household size may be larger; confirm the real count with the applicant before finalizing the Marginality Rebuttal's income floor.`,
    };
  }
  if (hasSpouse) {
    return { minSize: 2, confidence: 'known_minimum', note: 'Applicant + spouse, no children on file.' };
  }
  return {
    minSize: 1,
    confidence: 'unknown',
    note: `Unrecognized family-composition value ("${familyComposition}") — assuming a solo household as a floor.`,
  };
}

export type MarginalityWaterfallResult =
  | 'clears_now'
  | 'clears_within_5yr'
  | 'clears_beyond_5yr'
  | 'never_clears'
  | 'insufficient_data';

export interface YearIncomeClearance {
  year: number;
  income: number | null;
  clearsFloor: boolean | null;
}

export interface MarginalityWaterfall {
  householdSize: HouseholdSizeEstimate;
  incomeFloor: number;
  incomeByYear: YearIncomeClearance[];
  firstClearingYear: number | null;
  result: MarginalityWaterfallResult;
  note: string;
}

/**
 * D15 + D16 — builds the year-by-year owner-income-vs-living-wage-floor
 * waterfall from case-financials.ts's computed spine, and classifies
 * whether/when it clears the household's Federal Poverty Guideline floor
 * within the 5-year Path B horizon (9 FAM 402.9-6(E)).
 *
 * Year 1 income uses the owner's actual draw (M3-I-04) where on file, since
 * that is what the household actually lives on in Year 1; Years 2+ use the
 * projections table's net income (the live intake does not capture owner
 * draw beyond Year 1).
 */
export function computeMarginalityWaterfall(
  cf: CaseFinancials,
  familyComposition: string | null,
): MarginalityWaterfall {
  const householdSize = estimateHouseholdSize(familyComposition);
  const incomeFloor = computeFederalPovertyGuideline(householdSize.minSize);

  const incomeByYearRaw: { year: number; income: number | null }[] = cf.projections.map((p) => ({
    year: p.year,
    income: p.year === 1 && cf.year1_owner_draw !== null ? cf.year1_owner_draw : p.netIncome,
  }));
  if (incomeByYearRaw.length === 0 && cf.year1_owner_draw !== null) {
    incomeByYearRaw.push({ year: 1, income: cf.year1_owner_draw });
  }

  const incomeByYear: YearIncomeClearance[] = incomeByYearRaw.map((y) => ({
    year: y.year,
    income: y.income,
    clearsFloor: y.income !== null ? y.income >= incomeFloor : null,
  }));

  const firstClearingYear = incomeByYear.find((y) => y.clearsFloor === true)?.year ?? null;
  const hasAnyData = incomeByYear.some((y) => y.income !== null);

  let result: MarginalityWaterfallResult;
  let note: string;
  const floorText = `$${incomeFloor.toLocaleString()}/yr for a household of ${householdSize.minSize}${householdSize.confidence === 'unknown' ? '+' : ''}`;

  if (!hasAnyData) {
    result = 'insufficient_data';
    note = 'No owner draw or net-income projections on file — cannot assess marginality against the living-wage floor.';
  } else if (firstClearingYear === null) {
    result = 'never_clears';
    note = `Projected owner income never clears the household's Federal Poverty Guideline floor (${floorText}) within the years on file. This is a marginality risk the Marginality Rebuttal must address directly — either via Path A (already-sufficient) evidence outside these projections, or by revising the projections.`;
  } else if (firstClearingYear === 1) {
    result = 'clears_now';
    note = `Projected Year 1 owner income clears the household's Federal Poverty Guideline floor (${floorText}).`;
  } else if (firstClearingYear <= 5) {
    result = 'clears_within_5yr';
    note = `Projected owner income clears the household's Federal Poverty Guideline floor (${floorText}) in Year ${firstClearingYear} — within the 5-year Path B horizon (9 FAM 402.9-6(E)).`;
  } else {
    result = 'clears_beyond_5yr';
    note = `Projected owner income does not clear the household's Federal Poverty Guideline floor (${floorText}) until Year ${firstClearingYear} — beyond the 5-year Path B horizon. A Path B marginality claim resting on this projection will fail; the Marginality Rebuttal must either find Path A evidence or the projections must be revised.`;
  }

  return { householdSize, incomeFloor, incomeByYear, firstClearingYear, result, note };
}
