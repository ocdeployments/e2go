import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { matchInvestorProfile } from '@/lib/fdd-profile-match-engine';
import type { FddAnalysis, FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import type { ComparisonColumn, CompareResponse } from '@/types/fdd-compare';

export type { ComparisonColumn, CompareResponse };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { fdd_ids: string[] };
    const { fdd_ids } = body;

    if (!Array.isArray(fdd_ids) || fdd_ids.length < 2 || fdd_ids.length > 4) {
      return NextResponse.json({ error: 'Provide 2–4 FDD IDs' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: rows, error: dbErr } = await service
      .from('fdd_analyses')
      .select('*')
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
    return NextResponse.json({ columns: ordered, best });
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
    payback_years: null, // derived in report only

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
    franchisee_survival_rate: null,
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

  return best;
}
