// ---------------------------------------------------------------------------
// Phase 2 / A4 — deterministic financial spine
//
// Investment total, deployment breakdown, headcount, payroll, and revenue
// figures currently appear across 6+ generated documents, each written by a
// separate LLM call from raw answers. Nothing computes these numbers once,
// so a Business Plan Year-1 payroll figure disagreeing with the Marginality
// Rebuttal's is a live risk. This module computes every derivable figure
// exactly once from the live M3-F-*/M3-I-* answer keys and is injected as
// pre-computed tables that every money document must narrate around rather
// than re-derive.
//
// Ground rule: never fabricate. Where the live intake does not capture a
// number (per-employee wages, an FX rate, cost structure beyond the
// projections table), the field is left null with an explanatory note —
// not estimated.
// ---------------------------------------------------------------------------

export interface YearProjection {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  employees: number | null;
}

export type ConsistencyStatus = 'consistent' | 'inconsistent' | 'insufficient_data';

export interface CaseFinancials {
  // Investment / deployment reconciliation
  total_invested: number | null;
  total_business_cost: number | null;
  funding_gap: number | null;
  proportionality_ratio: number | null;
  deployment_categories: string[];
  funds_deployed_status: string | null;

  // Revenue / cash-flow ramp (Years 1–5, from M3-I-PROJECTIONS)
  projections: YearProjection[];
  revenue_growth_y1_to_y3_pct: number | null;

  // Break-even
  self_reported_breakeven_bucket: string | null;
  computed_breakeven_year: number | null;
  breakeven_consistency: ConsistencyStatus;

  // Headcount
  year1_headcount_from_intake: number | null;
  year1_headcount_from_projections: number | null;
  headcount_consistency: ConsistencyStatus;

  // Payroll
  year1_owner_draw: number | null;
  payroll_note: string;

  // Net worth
  net_worth_cad: number | null;
  net_worth_usd: number | null;
  fx_note: string;

  data_quality_notes: string[];
}

const DEPLOYMENT_LABELS: Record<string, string> = {
  'franchise-fee': 'Franchise fee',
  'equipment': 'Equipment',
  'leasehold': 'Leasehold improvements',
  'inventory': 'Initial inventory',
  'working-capital': 'Working capital',
  'professional': 'Professional fees',
  'other': 'Other',
};

const BREAKEVEN_BUCKET_TO_YEAR: Record<string, number> = {
  '3-6': 1,
  '7-12': 1,
  'year-2': 2,
  'year-3+': 3,
};

function getNumber(answers: Record<string, unknown>, key: string): number | null {
  const val = answers[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[$,]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

function getString(answers: Record<string, unknown>, key: string): string | null {
  const val = answers[key];
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

function parseDeploymentCategories(raw: string | null): string[] {
  if (!raw) return [];
  // M3-F-04 is saved as a comma-joined list of option values (e.g. "equipment,leasehold")
  return raw.split(',').map(v => v.trim()).filter(Boolean).map(v => DEPLOYMENT_LABELS[v] ?? v);
}

function parseProjections(raw: string | null): YearProjection[] {
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw) as { year: number; revenue?: string; netIncome?: string; employees?: string }[];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(r => typeof r.year === 'number')
      .map(r => ({
        year: r.year,
        revenue: r.revenue ? (parseFloat(r.revenue.replace(/[$,]/g, '')) || null) : null,
        netIncome: r.netIncome ? (parseFloat(r.netIncome.replace(/[$,]/g, '')) || null) : null,
        employees: r.employees ? (parseInt(r.employees, 10) || null) : null,
      }))
      .sort((a, b) => a.year - b.year);
  } catch {
    return [];
  }
}

export function computeCaseFinancials(answers: Record<string, unknown>): CaseFinancials {
  const notes: string[] = [];

  const total_invested = getNumber(answers, 'M3-F-02');
  const total_business_cost = getNumber(answers, 'M3-F-03');
  const funding_gap = (total_invested !== null && total_business_cost !== null)
    ? total_business_cost - total_invested
    : null;
  const proportionality_ratio = (total_invested !== null && total_business_cost !== null && total_business_cost > 0)
    ? total_invested / total_business_cost
    : null;

  const deployment_categories = parseDeploymentCategories(getString(answers, 'M3-F-04'));
  const funds_deployed_status = getString(answers, 'M3-F-NEW-01');

  const projections = parseProjections(getString(answers, 'M3-I-PROJECTIONS'));
  const y1 = projections.find(p => p.year === 1) ?? null;
  const y3 = projections.find(p => p.year === 3) ?? null;
  const revenue_growth_y1_to_y3_pct = (y1?.revenue && y1.revenue > 0 && y3?.revenue != null)
    ? Math.round(((y3.revenue - y1.revenue) / y1.revenue) * 100)
    : null;

  // Break-even: cross-check the self-reported bucket (M3-I-BREAKEVEN) against
  // the first year the projections table shows netIncome >= 0. Disagreement
  // between the two is exactly the kind of cross-document drift A4 exists to catch.
  const self_reported_breakeven_bucket = getString(answers, 'M3-I-BREAKEVEN');
  const firstProfitableYear = projections.find(p => p.netIncome !== null && p.netIncome >= 0)?.year ?? null;
  const computed_breakeven_year = firstProfitableYear;
  let breakeven_consistency: ConsistencyStatus = 'insufficient_data';
  if (self_reported_breakeven_bucket && computed_breakeven_year !== null) {
    const bucketYear = BREAKEVEN_BUCKET_TO_YEAR[self_reported_breakeven_bucket] ?? null;
    if (bucketYear !== null) {
      breakeven_consistency = bucketYear === computed_breakeven_year ? 'consistent' : 'inconsistent';
      if (breakeven_consistency === 'inconsistent') {
        notes.push(`Self-reported break-even ("${self_reported_breakeven_bucket}") disagrees with the projections table (net income first turns positive in Year ${computed_breakeven_year}).`);
      }
    }
  }

  // Headcount: M3-I-05 (FT) + M3-I-06 (PT) is the canonical Year-1 source;
  // cross-check against the projections table's own Year-1 employees column.
  const ft = getNumber(answers, 'M3-I-05');
  const pt = getNumber(answers, 'M3-I-06');
  const year1_headcount_from_intake = (ft !== null || pt !== null) ? (ft ?? 0) + (pt ?? 0) : null;
  const year1_headcount_from_projections = y1?.employees ?? null;
  let headcount_consistency: ConsistencyStatus = 'insufficient_data';
  if (year1_headcount_from_intake !== null && year1_headcount_from_projections !== null) {
    headcount_consistency = year1_headcount_from_intake === year1_headcount_from_projections ? 'consistent' : 'inconsistent';
    if (headcount_consistency === 'inconsistent') {
      notes.push(`Year 1 headcount from the investment intake (${year1_headcount_from_intake}) disagrees with the projections table (${year1_headcount_from_projections}).`);
    }
  }

  const year1_owner_draw = getNumber(answers, 'M3-I-04');
  const payroll_note = 'No per-employee wage data is captured by the live intake — only headcounts and the owner\'s Year 1 draw. Total payroll by year cannot be computed without fabricating a wage assumption and is intentionally left uncomputed.';

  const net_worth_cad = getNumber(answers, 'M3-F-NET');
  const fx_note = 'No dated FX rate source is configured in this codebase. Net worth is captured in CAD only — do not convert to USD without a dated, sourced exchange rate.';

  if (total_invested === null) notes.push('Total invested (M3-F-02) not on file.');
  if (total_business_cost === null) notes.push('Total business cost (M3-F-03) not on file.');
  if (projections.length === 0) notes.push('No revenue/net-income projections on file (M3-I-PROJECTIONS empty or missing).');

  return {
    total_invested,
    total_business_cost,
    funding_gap,
    proportionality_ratio,
    deployment_categories,
    funds_deployed_status,
    projections,
    revenue_growth_y1_to_y3_pct,
    self_reported_breakeven_bucket,
    computed_breakeven_year,
    breakeven_consistency,
    year1_headcount_from_intake,
    year1_headcount_from_projections,
    headcount_consistency,
    year1_owner_draw,
    payroll_note,
    net_worth_cad,
    net_worth_usd: null,
    fx_note,
    data_quality_notes: notes,
  };
}

// Formats the computed spine as a pre-computed table for injection into
// money-document prompts. The model is explicitly forbidden from re-deriving
// any of these figures — it narrates around them.
export function formatCaseFinancialsText(cf: CaseFinancials): string {
  const fmt = (n: number | null) => n !== null ? `$${n.toLocaleString()}` : 'NOT PROVIDED';
  const lines: string[] = [
    'DETERMINISTIC FINANCIAL SPINE (COMPUTED ONCE — USE EXACT VALUES, NEVER RE-DERIVE OR ESTIMATE):',
    '',
    'Investment reconciliation:',
    `  Total Invested to Date: ${fmt(cf.total_invested)}`,
    `  Total Cost to Establish Business: ${fmt(cf.total_business_cost)}`,
    `  Funding Gap (cost − invested): ${fmt(cf.funding_gap)}`,
    `  Proportionality Ratio (invested ÷ total cost): ${cf.proportionality_ratio !== null ? `${Math.round(cf.proportionality_ratio * 100)}%` : 'NOT PROVIDED'}`,
    `  Deployment Categories: ${cf.deployment_categories.length > 0 ? cf.deployment_categories.join(', ') : 'NOT PROVIDED'}`,
    `  Funds Deployed Status: ${cf.funds_deployed_status ?? 'NOT PROVIDED'}`,
    '',
  ];

  if (cf.projections.length > 0) {
    lines.push('Revenue / net income / headcount by year (from case financial projections):');
    for (const p of cf.projections) {
      lines.push(`  Year ${p.year}: Revenue ${fmt(p.revenue)} | Net Income ${fmt(p.netIncome)} | Employees ${p.employees ?? 'NOT PROVIDED'}`);
    }
    if (cf.revenue_growth_y1_to_y3_pct !== null) {
      lines.push(`  Year 1 → Year 3 revenue growth: ${cf.revenue_growth_y1_to_y3_pct}%`);
    }
  } else {
    lines.push('Revenue / net income / headcount by year: NOT PROVIDED — no projections on file.');
  }
  lines.push('');

  lines.push('Break-even:');
  lines.push(`  Self-reported bucket: ${cf.self_reported_breakeven_bucket ?? 'NOT PROVIDED'}`);
  lines.push(`  Computed from projections (first year net income ≥ $0): ${cf.computed_breakeven_year !== null ? `Year ${cf.computed_breakeven_year}` : 'NOT PROVIDED'}`);
  if (cf.breakeven_consistency === 'inconsistent') {
    lines.push('  ⚠ INCONSISTENT — the self-reported bucket and the computed year disagree. Do not paper over this; use the computed figure and flag the discrepancy for the applicant to resolve.');
  }
  lines.push('');

  lines.push('Headcount (Year 1):');
  lines.push(`  From investment intake (FT + PT): ${cf.year1_headcount_from_intake ?? 'NOT PROVIDED'}`);
  lines.push(`  From projections table: ${cf.year1_headcount_from_projections ?? 'NOT PROVIDED'}`);
  if (cf.headcount_consistency === 'inconsistent') {
    lines.push('  ⚠ INCONSISTENT — these two sources disagree. Use the investment-intake figure and flag the discrepancy.');
  }
  lines.push('');

  lines.push('Payroll:');
  lines.push(`  Year 1 owner salary/draw: ${fmt(cf.year1_owner_draw)}`);
  lines.push(`  ${cf.payroll_note}`);
  lines.push('');

  lines.push('Net worth:');
  lines.push(`  ${cf.net_worth_cad !== null ? `$${cf.net_worth_cad.toLocaleString()} CAD` : 'NOT PROVIDED'}`);
  lines.push(`  ${cf.fx_note}`);

  if (cf.data_quality_notes.length > 0) {
    lines.push('');
    lines.push('Data quality notes:');
    for (const n of cf.data_quality_notes) lines.push(`  - ${n}`);
  }

  lines.push('');
  lines.push('IMPORTANT: Narrate around these tables. Never alter, re-derive, or invent any number that appears above. Where a figure says NOT PROVIDED, state plainly that it is not yet confirmed.');

  return lines.join('\n');
}
