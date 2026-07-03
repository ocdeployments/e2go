import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';
import { deriveFddAnswerKeys, writeFddAnswerKeys, buildFddWritebackPreview } from '@/lib/fdd-writeback';
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

    const [{ data: analysis }, appId] = await Promise.all([
      service.from('fdd_analyses').select('extracted_fields, e2_score, territory_analysis, final_report, target_state').eq('id', fdd_id).eq('user_id', user.id).single(),
      resolvePrimaryApplicationId(service, user.id),
    ]);
    const app = appId ? { id: appId } : null;

    if (!analysis) return NextResponse.json({ error: 'FDD analysis not found' }, { status: 404 });
    if (!app?.id) return NextResponse.json({ error: 'NO_APPLICATION' }, { status: 422 });

    const fields = (analysis.extracted_fields ?? {}) as FddExtractedFields;
    const scoring = analysis.e2_score as ScoringResult | null;
    const territory = (analysis.territory_analysis as ({ _full?: TerritoryAnalysis } & Record<string, unknown>) | null)?._full ?? null;
    const report = analysis.final_report as FddProfessionalReport | null;

    const updates = deriveFddAnswerKeys(fields, scoring, territory, report, analysis as Record<string, unknown>);

    await writeFddAnswerKeys(service, app.id, updates);

    const preview = buildFddWritebackPreview(updates);
    return NextResponse.json({ preview, application_id: app.id });
  } catch (err) {
    console.error('Writeback error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Writeback failed' }, { status: 500 });
  }
}
