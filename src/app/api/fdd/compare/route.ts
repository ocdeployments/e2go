import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { matchInvestorProfile } from '@/lib/fdd-profile-match-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import type { FddAnalysis, FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import type { ComparisonColumn, CompareResponse, VerdictEntry } from '@/types/fdd-compare';

export type { ComparisonColumn, CompareResponse, VerdictEntry };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'fdd-analysis');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before running another comparison.' },
        { status: 429 }
      );
    }

    const body = await request.json() as { fdd_ids: string[] };
    const { fdd_ids } = body;

    if (!Array.isArray(fdd_ids) || fdd_ids.length < 2 || fdd_ids.length > 4) {
      return NextResponse.json({ error: 'Provide 2–4 FDD IDs' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: rows, error: dbErr } = await service
      .from('fdd_analyses')
      .select('id, extracted_fields, e2_score, territory_analysis, profile_match, original_filename, overall_compatibility, flag_count, fdd_age_months')
      .eq('user_id', user.id)
      .in('id', fdd_ids);

    if (dbErr) throw new Error(dbErr.message);
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'Could not load analyses' }, { status: 404 });
    }

    const columns: ComparisonColumn[] = (rows as FddAnalysis[]).map(a => buildColumn(a));

    // Preserve the order the user passed
    const ordered = fdd_ids
      .map(id => columns.find(c => c.id === id))
      .filter((c): c is ComparisonColumn => Boolean(c));

    const best = computeBest(ordered);
    const verdict = computeVerdict(ordered);
    return NextResponse.json({ columns: ordered, best, verdict });
  } catch (err) {
    console.error('Compare error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Compare failed' }, { status: 500 });
  }
}

// ============================================================================
// Build one column from an FddAnalysis record
// ============================================================================

function buildColumn(a: FddAnalysis): ComparisonColumn {
  const fields = (a.extracted_fields ?? {}) as FddExtractedFields;
  const scoring = a.e2_score as ScoringResult | null;
  const territory = (a.territory_analysis as ({ _full?: TerritoryAnalysis } & Record<string, unknown>) | null)?._full ?? null;
  const profileMatch = a.profile_match as ReturnType<typeof matchInvestorProfile> | null;

  const franchiseName = (fields.franchisor_legal_name?.value as string | null) ?? a.original_filename;

  const investmentMin = fields.total_investment_min?.value as number | null;
  const investmentMax = fields.total_investment_max?.value as number | null;
  const odeMid = scoring?.ode?.ode_mid ?? null;
  // Same formula as the FDD Report's payback period: investment midpoint / central ODE.
  const paybackYears = (investmentMin != null && investmentMax != null && odeMid != null && odeMid > 0)
    ? ((investmentMin + investmentMax) / 2) / odeMid
    : null;

  const totalUnits = fields.total_franchise_units_current?.value as number | null;
  const unitsOpened = fields.units_opened_yr1?.value as number | null;
  const unitsClosed = fields.units_closed_yr1?.value as number | null;
  // Back out the start-of-year unit count from this year's net change, then
  // express closures as a share of that base — the Item 20 "survival rate" convention.
  const unitsAtStart = (totalUnits != null && unitsOpened != null && unitsClosed != null)
    ? totalUnits + unitsClosed - unitsOpened
    : null;
  const franchiseeSurvivalRate = (unitsAtStart != null && unitsAtStart > 0 && unitsClosed != null)
    ? Math.max(0, 1 - unitsClosed / unitsAtStart)
    : null;

  return {
    id: a.id,
    franchise_name: franchiseName,
    compatibility: a.overall_compatibility,

    investment_min: fields.total_investment_min?.value as number | null,
    investment_max: fields.total_investment_max?.value as number | null,
    franchise_fee: fields.initial_franchise_fee?.value as number | null,
    royalty_pct: fields.royalty_rate_pct?.value as number | null,
    marketing_pct: fields.marketing_fund_pct?.value as number | null,

    item19_auv: (fields.item19_auv?.value ?? null) as number | null,
    item19_median: (fields.item19_median?.value ?? null) as number | null,
    ode_low: scoring?.ode?.ode_low ?? null,
    ode_mid: scoring?.ode?.ode_mid ?? null,
    ode_high: scoring?.ode?.ode_high ?? null,
    payback_years: paybackYears,

    e2_score: scoring?.overall ?? null,
    flag_count: a.flag_count ?? 0,
    critical_flags: (scoring?.flags ?? [])
      .filter((f: { severity: string }) => f.severity === 'critical')
      .map((f: { label: string }) => f.label),
    fdd_age_months: a.fdd_age_months,

    territory_score: territory?.overall_score ?? null,
    territory_rating: territory?.overall_rating ?? null,
    labor_score: territory?.labor_market_score?.score ?? null,
    competitors_nearby: territory?.competitors?.nearby_count ?? null,

    profile_overall: profileMatch?.overall ?? null,
    capital_adequacy: profileMatch?.dimensions?.capital_adequacy?.result ?? null,
    e2_substantiality: profileMatch?.dimensions?.e2_substantiality?.result ?? null,

    total_units: fields.total_franchise_units_current?.value as number | null,
    units_opened_last_year: fields.units_opened_yr1?.value as number | null,
    units_closed_last_year: fields.units_closed_yr1?.value as number | null,
    franchisee_survival_rate: franchiseeSurvivalRate,
  };
}

// ============================================================================
// Mark the best column for key numeric metrics
// ============================================================================

function computeBest(columns: ComparisonColumn[]): Partial<Record<keyof ComparisonColumn, string>> {
  const best: Partial<Record<keyof ComparisonColumn, string>> = {};

  function markHighest(key: keyof ComparisonColumn) {
    const vals = columns.map(c => ({ id: c.id, v: c[key] as number | null })).filter(x => x.v !== null);
    if (vals.length < 2) return;
    const max = Math.max(...vals.map(x => x.v!));
    const winner = vals.find(x => x.v === max);
    if (winner) best[key] = winner.id;
  }

  function markLowest(key: keyof ComparisonColumn) {
    const vals = columns.map(c => ({ id: c.id, v: c[key] as number | null })).filter(x => x.v !== null);
    if (vals.length < 2) return;
    const min = Math.min(...vals.map(x => x.v!));
    const winner = vals.find(x => x.v === min);
    if (winner) best[key] = winner.id;
  }

  markHighest('ode_mid');
  markHighest('item19_auv');
  markHighest('territory_score');
  markHighest('labor_score');
  markHighest('franchisee_survival_rate');
  markLowest('investment_min');
  markLowest('royalty_pct');
  markLowest('flag_count');
  markLowest('competitors_nearby');
  markLowest('payback_years');

  return best;
}

// ============================================================================
// Weighted verdict — ranks the compared set for THIS investor's case using
// only fields already computed above (profile match against this investor's
// capital, territory analysis against this investor's chosen location). This
// is deliberately a ranking, not a new score: each category contributes
// rank-based points (best in the compared set = +2, worst = -2) so the
// verdict never depends on absolute scales that vary franchise to franchise.
// ============================================================================

const COMPAT_POINTS: Record<string, number> = { STRONG: 3, VIABLE: 2, CAUTION: 1, INELIGIBLE: -3 };
const GRADE_POINTS: Record<string, number> = { pass: 2, viable: 1, caution: -1, fail: -3 };
const PROFILE_POINTS: Record<string, number> = { STRONG_FIT: 2, GOOD_FIT: 1, PARTIAL_FIT: -1, POOR_FIT: -3 };

function rankPoints(columns: ComparisonColumn[], key: keyof ComparisonColumn, higherIsBetter: boolean): Map<string, number> {
  const points = new Map<string, number>();
  const vals = columns.map(c => ({ id: c.id, v: c[key] as number | null })).filter(x => x.v !== null) as { id: string; v: number }[];
  if (vals.length < 2) return points;
  const sorted = [...vals].sort((a, b) => higherIsBetter ? b.v - a.v : a.v - b.v);
  const n = sorted.length;
  sorted.forEach((x, i) => {
    // Evenly spaced from +2 (best) to -2 (worst); ties share the same rank slot.
    const span = n > 1 ? 4 / (n - 1) : 0;
    points.set(x.id, 2 - i * span);
  });
  return points;
}

function computeVerdict(columns: ComparisonColumn[]): VerdictEntry[] | null {
  if (columns.length < 2) return null;

  const odeRank = rankPoints(columns, 'ode_mid', true);
  const paybackRank = rankPoints(columns, 'payback_years', false);
  const territoryRank = rankPoints(columns, 'territory_score', true);
  const flagsRank = rankPoints(columns, 'flag_count', false);

  const entries: (VerdictEntry & { score: number })[] = columns.map(c => {
    const factors: { label: string; points: number }[] = [];

    const compatPts = c.compatibility ? COMPAT_POINTS[c.compatibility] ?? 0 : null;
    if (compatPts !== null) factors.push({ label: `E-2 compatibility: ${c.compatibility}`, points: compatPts });

    const capPts = c.capital_adequacy ? GRADE_POINTS[c.capital_adequacy] ?? 0 : null;
    if (capPts !== null) factors.push({ label: `Capital adequacy for your case: ${c.capital_adequacy}`, points: capPts });

    const subPts = c.e2_substantiality ? GRADE_POINTS[c.e2_substantiality] ?? 0 : null;
    if (subPts !== null) factors.push({ label: `Substantiality fit: ${c.e2_substantiality}`, points: subPts });

    const profPts = c.profile_overall ? PROFILE_POINTS[c.profile_overall] ?? 0 : null;
    if (profPts !== null) factors.push({ label: `Investor profile match: ${(c.profile_overall ?? '').replace(/_/g, ' ')}`, points: profPts });

    if (odeRank.has(c.id)) factors.push({ label: 'Estimated owner income vs. the compared set', points: odeRank.get(c.id)! });
    if (paybackRank.has(c.id)) factors.push({ label: 'Payback period vs. the compared set', points: paybackRank.get(c.id)! });
    if (territoryRank.has(c.id) && c.territory_score !== null) factors.push({ label: `Territory strength for your location (${c.territory_score}/100)`, points: territoryRank.get(c.id)! });
    if (flagsRank.has(c.id)) factors.push({ label: `${c.flag_count} flag${c.flag_count === 1 ? '' : 's'} raised`, points: flagsRank.get(c.id)! });

    const score = factors.reduce((sum, f) => sum + f.points, 0);
    const reasons = factors
      .filter(f => Math.abs(f.points) >= 1)
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
      .slice(0, 3)
      .map(f => f.label);

    return { id: c.id, rank: 0, score, reasons };
  });

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries.map(({ id, rank, score, reasons }) => ({ id, rank, score: Math.round(score * 10) / 10, reasons }));
}
