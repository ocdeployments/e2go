/**
 * WS7 — Renewal Package upgrade: promise-vs-delivery reconciliation.
 *
 * The renewal package's Template 6 already lays projected figures next to
 * self-reported actuals in a table, but never states the officer-facing
 * conclusion in words — the exact gap the spec calls out ("the business
 * plan projected 4 employees by Year 2; the enterprise employs 5"). This
 * computes that reconciliation once, deterministically, from the same
 * projections/answers data Template 6 already reads, so the cover letter
 * and business-plan-update prompts can narrate around a real number
 * instead of the coarse profitLabel/hiringLabel buckets.
 *
 * Ground rule (same as case-financials.ts): never fabricate. A year with
 * no actual reported is left out of the narrative, not guessed at.
 */

export interface ProjectionRow {
  year: number;
  revenue: string;
  netIncome: string;
  employees: string;
}

export interface RenewalAnswersLike {
  [key: string]: string | undefined;
}

function parseMoney(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseCount(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export interface RevenueReconciliationYear {
  year: number;
  projected: number | null;
  actual: number | null;
  variancePct: number | null; // (actual - projected) / projected
  narrative: string | null;
}

export interface EmployeeReconciliation {
  projectedYear1: number | null; // from the Year 1 projections row's employees column
  actualNow: number | null; // RQ-02 (full-time) as of renewal
  narrative: string | null;
  verdict: 'exceeded' | 'met' | 'short' | 'insufficient_data';
}

export interface RenewalReconciliation {
  revenue: RevenueReconciliationYear[];
  employees: EmployeeReconciliation;
  summary: string;
}

/**
 * Compares each year's projected revenue (from the original M3-I-PROJECTIONS
 * table) against that year's self-reported actual (RQ-01-Y{n}), and the
 * original Year 1 projected headcount against current full-time headcount
 * (RQ-02) — the two promise-vs-delivery facts an E-2 renewal officer checks
 * first. Returns null variance/narrative for any year without both figures
 * on file rather than fabricating a comparison.
 */
export function computeRenewalReconciliation(
  projections: ProjectionRow[],
  answers: RenewalAnswersLike,
): RenewalReconciliation {
  const revenue: RevenueReconciliationYear[] = projections.map((row) => {
    const projected = parseMoney(row.revenue);
    const actual = parseMoney(answers[`RQ-01-Y${row.year}`]);
    const variancePct = (projected !== null && projected > 0 && actual !== null)
      ? (actual - projected) / projected
      : null;
    const narrative = (projected !== null && actual !== null)
      ? `Year ${row.year}: the business plan projected $${Math.round(projected).toLocaleString()} in revenue; the enterprise reported $${Math.round(actual).toLocaleString()} (${variancePct !== null ? `${variancePct >= 0 ? '+' : ''}${Math.round(variancePct * 100)}%` : 'variance not computable'}).`
      : null;
    return { year: row.year, projected, actual, variancePct, narrative };
  });

  const year1Row = projections.find((p) => p.year === 1) ?? null;
  const projectedYear1 = parseCount(year1Row?.employees);
  const actualNow = parseCount(answers['RQ-02']);

  let verdict: EmployeeReconciliation['verdict'] = 'insufficient_data';
  let employeeNarrative: string | null = null;
  if (projectedYear1 !== null && actualNow !== null) {
    if (actualNow > projectedYear1) verdict = 'exceeded';
    else if (actualNow === projectedYear1) verdict = 'met';
    else verdict = 'short';
    employeeNarrative = `The business plan projected ${projectedYear1} full-time employee${projectedYear1 === 1 ? '' : 's'} by Year 1; the enterprise currently employs ${actualNow}.`;
  }

  const revenueLines = revenue.filter((r) => r.narrative).map((r) => r.narrative as string);
  const summaryParts = [...revenueLines, employeeNarrative].filter((s): s is string => Boolean(s));
  const summary = summaryParts.length > 0
    ? summaryParts.join(' ')
    : 'No comparable projected-vs-actual figures are on file for this renewal — Template 6 will show self-reported actuals only.';

  return {
    revenue,
    employees: { projectedYear1, actualNow, narrative: employeeNarrative, verdict },
    summary,
  };
}
