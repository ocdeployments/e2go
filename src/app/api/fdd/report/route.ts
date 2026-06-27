import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { generateProfessionalReport } from '@/lib/fdd-report-engine';
import type { FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import type { FddProfessionalReport } from '@/lib/fdd-report-engine';

// POST /api/fdd/report
// Body: { fdd_id: string }
// Generates professional report via fdd-report-engine, then writes platform integration keys.
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
    const { data: analysis, error: fetchErr } = await service
      .from('fdd_analyses')
      .select('*')
      .eq('id', fdd_id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: 'FDD analysis not found' }, { status: 404 });
    }

    if (!analysis.extracted_fields || !analysis.e2_score) {
      return NextResponse.json(
        { error: 'E-2 scoring must complete before generating the report' },
        { status: 422 }
      );
    }

    const fields = analysis.extracted_fields as FddExtractedFields;
    const scoring = analysis.e2_score as ScoringResult;

    // Extract full territory result if it exists
    const territoryRaw = analysis.territory_analysis as ({ _full?: TerritoryAnalysis } & Record<string, unknown>) | null;
    const territory: TerritoryAnalysis | null = territoryRaw?._full ?? null;

    // Generate professional report — uses new report engine with territory cross-feed
    const report = await generateProfessionalReport(
      fields,
      scoring,
      scoring.ode,
      analysis.target_state as string | null,
      analysis.target_city as string | null,
      territory
    );

    // Persist full professional report
    const { error: updateErr } = await service
      .from('fdd_analyses')
      .update({
        final_report: report as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fdd_id);

    if (updateErr) {
      console.error('Report persist error:', updateErr);
    }

    // Write platform integration keys (non-blocking — we don't await errors)
    writePlatformIntegration(service, user.id, fields, scoring, territory, report, analysis).catch(err =>
      console.error('Platform integration error:', err)
    );

    return NextResponse.json({ final_report: report });
  } catch (err) {
    console.error('Report route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report generation failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Platform integration — write FDD findings to the user's application module
// This is the non-silo bridge: FDD intelligence feeds the E-2 application.
// ============================================================================

async function writePlatformIntegration(
  service: ReturnType<typeof import('@/lib/supabase-service').createServiceClient>,
  userId: string,
  fields: FddExtractedFields,
  scoring: ScoringResult,
  territory: TerritoryAnalysis | null,
  report: FddProfessionalReport,
  analysis: Record<string, unknown>
): Promise<void> {
  // Find the user's most recent application
  const { data: app } = await service
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!app?.id) return;

  const answerUpdates: Array<{ key: string; value: string }> = [];

  // ── Business identity ────────────────────────────────────────────────────
  const franchiseName = fields.franchisor_legal_name?.value as string | null;
  if (franchiseName) answerUpdates.push({ key: 'QA-NEW-04', value: franchiseName });

  const targetState = analysis.target_state as string | null;
  if (targetState) answerUpdates.push({ key: 'QA-NEW-11', value: targetState });

  const category = territory?.franchise_category ?? null;
  if (category) answerUpdates.push({ key: 'QA-NEW-03', value: category });

  const territoryType = fields.territory_type?.value as string | null;
  if (territoryType) answerUpdates.push({ key: 'QA-NEW-12', value: territoryType });

  // ── Financial inputs ─────────────────────────────────────────────────────
  const investMin = fields.total_investment_min?.value as number | null;
  if (investMin) answerUpdates.push({ key: 'QF-NEW-01', value: String(investMin) });

  // ODE central estimate — feeds business plan module
  const odeCentral = scoring.ode.ode_mid;
  if (odeCentral !== null) {
    answerUpdates.push({ key: 'QA-FDD-ODE', value: String(Math.round(odeCentral)) });
  }

  // Payback period — feeds investment pitch
  const payback = report.executive_summary.key_metrics.payback_period_years;
  if (payback && payback !== 'Cannot calculate') {
    answerUpdates.push({ key: 'QA-FDD-PAYBACK', value: payback });
  }

  // AUV from Item 19 — feeds revenue projections
  const auv = (fields.item19_median?.value ?? fields.item19_auv?.value) as number | null;
  if (auv) answerUpdates.push({ key: 'QA-FDD-AUV', value: String(auv) });

  // Royalty rate — feeds fee model in business plan
  const royalty = fields.royalty_rate_pct?.value as number | null;
  if (royalty !== null) {
    answerUpdates.push({ key: 'QA-FDD-ROYALTY', value: (royalty * 100).toFixed(1) });
  }

  // ── Employment ──────────────────────────────────────────────────────────
  const openingEmployees = fields.opening_day_employees?.value as number | null;
  const fteEmployees = fields.typical_fte_employees?.value as number | null;
  const empCount = openingEmployees ?? fteEmployees;
  if (empCount) answerUpdates.push({ key: 'QA-NEW-09', value: String(empCount) });

  // ── E-2 analysis results ──────────────────────────────────────────────
  answerUpdates.push({ key: 'QA-FDD-COMPAT', value: scoring.overall });
  answerUpdates.push({ key: 'QA-FDD-FLAGS', value: String(scoring.flag_count) });

  // Non-marginality verdict — the most important E-2 financial test
  const nonMarginality = report.financial_performance.non_marginality_verdict;
  answerUpdates.push({ key: 'QA-FDD-NONMARGINALITY', value: nonMarginality });

  // Investment recommendation — top-line result for dashboard
  answerUpdates.push({ key: 'QA-FDD-RECOMMENDATION', value: report.executive_summary.recommendation });

  // One-line verdict for the main dashboard overview
  const verdict = report.executive_summary.one_line_verdict;
  if (verdict) answerUpdates.push({ key: 'QA-FDD-VERDICT', value: verdict });

  // ── Territory intelligence ─────────────────────────────────────────────
  if (territory) {
    answerUpdates.push({ key: 'QA-FDD-TERRITORY-RATING', value: territory.overall_rating });
    answerUpdates.push({ key: 'QA-FDD-TERRITORY-SCORE', value: String(territory.overall_score) });

    if (territory.target_market.annual_addressable_revenue !== null) {
      answerUpdates.push({
        key: 'QA-FDD-TERRITORY-TAM',
        value: String(territory.target_market.annual_addressable_revenue),
      });
    }

    // Labor market risk — feeds gap analysis for labor cost warnings
    answerUpdates.push({
      key: 'QA-FDD-LABOR-SCORE',
      value: String(territory.labor_market_score.score),
    });

    // Demographic fit — relevant for business plan target market section
    if (territory.census.population_65_plus !== null) {
      answerUpdates.push({
        key: 'QA-FDD-POP-65PLUS',
        value: String(territory.census.population_65_plus),
      });
    }
    if (territory.census.median_household_income !== null) {
      answerUpdates.push({
        key: 'QA-FDD-TERRITORY-MHI',
        value: String(territory.census.median_household_income),
      });
    }
  }

  // ── Critical flags for gap analysis ─────────────────────────────────────
  const criticalFlags = scoring.flags.filter(f => f.severity === 'critical').map(f => f.key).join(',');
  if (criticalFlags) {
    answerUpdates.push({ key: 'QA-FDD-CRITICAL-FLAGS', value: criticalFlags });
  }

  // Upsert all keys
  await Promise.all(
    answerUpdates.map(({ key, value }) =>
      service
        .from('answers')
        .upsert(
          {
            application_id: app.id,
            question_key: key,
            answer: value,
            source: 'fdd_intelligence',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'application_id,question_key' }
        )
        .then(({ error }) => {
          if (error) console.warn(`Answer upsert failed for ${key}:`, error.message);
        })
    )
  );
}
