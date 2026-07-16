import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { generateProfessionalReport } from '@/lib/fdd-report-engine';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';
import { deriveFddAnswerKeys, writeFddAnswerKeys } from '@/lib/fdd-writeback';
import type { FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';

// FDD_TIMEOUT_MS (llm-client.ts) budgets the model call at up to 120s;
// without an explicit maxDuration override this route inherits Vercel's
// default function timeout, which can kill the request (after the LLM
// cost is already incurred) before the model call finishes.
export const maxDuration = 150;

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
      .select('extracted_fields, e2_score, territory_analysis, target_state, target_city')
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
    (async () => {
      const appId = await resolvePrimaryApplicationId(service, user.id);
      if (!appId) return;
      const updates = deriveFddAnswerKeys(fields, scoring, territory, report, analysis as Record<string, unknown>);
      await writeFddAnswerKeys(service, appId, updates);
    })().catch(err => console.error('Platform integration error:', err));

    return NextResponse.json({ final_report: report });
  } catch (err) {
    console.error('Report route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report generation failed' },
      { status: 500 }
    );
  }
}
