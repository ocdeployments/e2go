import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import type { FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import type { FddProfessionalReport } from '@/lib/fdd-report-engine';

// ============================================================================
// POST /api/fdd/writeback
// Body: { fdd_id: string }
// Explicitly imports FDD intelligence findings into the user's E-2 case file.
// Returns a preview of every answer key written so the UI can confirm.
// ============================================================================

export interface WritebackPreview {
  total_written: number;
  groups: Array<{
    label: string;
    items: Array<{ key: string; label: string; value: string }>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fdd_id } = await request.json() as { fdd_id: string };
    if (!fdd_id) return NextResponse.json({ error: 'fdd_id required' }, { status: 400 });

    const service = createServiceClient();

    const [{ data: analysis }, { data: app }] = await Promise.all([
      service.from('fdd_analyses').select('*').eq('id', fdd_id).eq('user_id', user.id).single(),
      service.from('applications').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!analysis) return NextResponse.json({ error: 'FDD analysis not found' }, { status: 404 });
    if (!app?.id) return NextResponse.json({ error: 'No case file found — start your E-2 application first' }, { status: 422 });

    const fields = (analysis.extracted_fields ?? {}) as FddExtractedFields;
    const scoring = analysis.e2_score as ScoringResult | null;
    const territory = (analysis.territory_analysis as ({ _full?: TerritoryAnalysis } & Record<string, unknown>) | null)?._full ?? null;
    const report = analysis.final_report as FddProfessionalReport | null;

    const updates = deriveAnswerKeys(fields, scoring, territory, report, analysis as Record<string, unknown>);

    // Write all concurrently
    await Promise.all(
      updates.map(({ key, value }) =>
        service.from('answers').upsert(
          { application_id: app.id, question_key: key, answer: value, source: 'fdd_intelligence', updated_at: new Date().toISOString() },
          { onConflict: 'application_id,question_key' }
        ).then(({ error }) => { if (error) console.warn(`Writeback failed for ${key}:`, error.message); })
      )
    );

    const preview = buildPreview(updates);
    return NextResponse.json({ preview, application_id: app.id });
  } catch (err) {
    console.error('Writeback error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Writeback failed' }, { status: 500 });
  }
}

// ============================================================================
// Derive answer keys from all available analysis data
// ============================================================================

function deriveAnswerKeys(
  fields: FddExtractedFields,
  scoring: ScoringResult | null,
  territory: TerritoryAnalysis | null,
  report: FddProfessionalReport | null,
  analysis: Record<string, unknown>
): Array<{ key: string; label: string; value: string; group: string }> {
  const out: Array<{ key: string; label: string; value: string; group: string }> = [];

  function push(key: string, label: string, value: string | number | null | undefined, group: string) {
    if (value === null || value === undefined || value === '') return;
    out.push({ key, label, value: String(value), group });
  }

  // ── Business identity ────────────────────────────────────────────────────
  push('QA-NEW-04', 'Business name',     fields.franchisor_legal_name?.value as string, 'Business Identity');
  push('QA-NEW-11', 'Target state',      analysis.target_state as string,               'Business Identity');
  push('QA-NEW-03', 'Business category', territory?.franchise_category,                 'Business Identity');
  push('QA-NEW-12', 'Territory type',    fields.territory_type?.value as string,        'Business Identity');

  // ── Financial ─────────────────────────────────────────────────────────────
  const investMin = fields.total_investment_min?.value as number | null;
  push('QF-NEW-01', 'Investment amount',  investMin,                            'Financial');
  push('QA-FDD-AUV', 'Median AUV (Item 19)',
    (fields.item19_median?.value ?? fields.item19_auv?.value) as number | null, 'Financial');
  const royalty = fields.royalty_rate_pct?.value as number | null;
  push('QA-FDD-ROYALTY', 'Royalty rate',
    royalty !== null ? (royalty * 100).toFixed(1) : null, 'Financial');

  if (scoring?.ode?.ode_mid !== null && scoring?.ode?.ode_mid !== undefined) {
    push('QA-FDD-ODE', 'Estimated owner income (ODE)', Math.round(scoring.ode.ode_mid), 'Financial');
  }

  if (report?.financial_performance) {
    push('QA-FDD-PAYBACK', 'Payback period', report.executive_summary.key_metrics.payback_period_years, 'Financial');
  }

  // ── Employment ─────────────────────────────────────────────────────────────
  const employees = (fields.opening_day_employees?.value ?? fields.typical_fte_employees?.value) as number | null;
  push('QA-NEW-09', 'Expected employees at opening', employees, 'Employment');

  // ── E-2 Results ────────────────────────────────────────────────────────────
  if (scoring) {
    push('QA-FDD-COMPAT', 'E-2 compatibility', scoring.overall, 'E-2 Analysis');
    push('QA-FDD-FLAGS',  'Flag count',         scoring.flag_count, 'E-2 Analysis');
    const criticalFlags = scoring.flags?.filter((f: { severity: string }) => f.severity === 'critical').map((f: { key: string }) => f.key).join(',');
    push('QA-FDD-CRITICAL-FLAGS', 'Critical flags', criticalFlags, 'E-2 Analysis');
  }
  if (report) {
    push('QA-FDD-NONMARGINALITY', 'Non-marginality verdict', report.financial_performance.non_marginality_verdict, 'E-2 Analysis');
    push('QA-FDD-RECOMMENDATION', 'Investment recommendation', report.executive_summary.recommendation, 'E-2 Analysis');
    push('QA-FDD-VERDICT',        'One-line verdict',         report.executive_summary.one_line_verdict, 'E-2 Analysis');
  }

  // ── Territory ──────────────────────────────────────────────────────────────
  if (territory) {
    push('QA-FDD-TERRITORY-RATING', 'Territory rating', territory.overall_rating, 'Territory');
    push('QA-FDD-TERRITORY-SCORE',  'Territory score',  territory.overall_score,  'Territory');
    push('QA-FDD-LABOR-SCORE', 'Labor market score', territory.labor_market_score?.score, 'Territory');
    push('QA-FDD-TERRITORY-MHI', 'Median household income', territory.census?.median_household_income, 'Territory');
    push('QA-FDD-POP-65PLUS', '65+ population', territory.census?.population_65_plus, 'Territory');
    if (territory.target_market?.annual_addressable_revenue !== null) {
      push('QA-FDD-TERRITORY-TAM', 'Addressable market (annual)', territory.target_market?.annual_addressable_revenue, 'Territory');
    }
  }

  return out;
}

function buildPreview(updates: Array<{ key: string; label: string; value: string; group: string }>): WritebackPreview {
  const groupMap = new Map<string, Array<{ key: string; label: string; value: string }>>();

  for (const { key, label, value, group } of updates) {
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push({ key, label, value });
  }

  return {
    total_written: updates.length,
    groups: [...groupMap.entries()].map(([label, items]) => ({ label, items })),
  };
}
