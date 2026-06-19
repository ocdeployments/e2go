import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { analyseTeritory } from '@/lib/fdd-territory-engine';
import type { FddExtractedFields, FddTerritoryAnalysis } from '@/types/fdd';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';

// POST /api/fdd/territory
// Body: { fdd_id: string }
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

    if (!analysis.extracted_fields) {
      return NextResponse.json({ error: 'Extraction must complete before territory analysis' }, { status: 422 });
    }

    const zip = (analysis.target_zip as string | null) ?? '';
    const state = (analysis.target_state as string | null) ?? '';

    if (!zip || !state) {
      return NextResponse.json({ error: 'Target ZIP and state required for territory analysis' }, { status: 422 });
    }

    const fields = analysis.extracted_fields as FddExtractedFields;

    const result: TerritoryAnalysis = await analyseTeritory(zip, state, fields);

    // Map to FddTerritoryAnalysis shape for DB
    const territoryRecord: FddTerritoryAnalysis = {
      overall_score: result.overall_score,
      overall_rating: result.overall_rating,
      customer_density_score: result.population_score.score,
      economic_strength_score: result.income_score.score,
      competitive_pressure_score: result.competition_score.score,
      narrative: result.narrative,
    };

    // Persist
    const { error: updateErr } = await service
      .from('fdd_analyses')
      .update({
        territory_analysis: {
          ...territoryRecord,
          // Keep full result for the UI
          _full: result,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', fdd_id);

    if (updateErr) {
      console.error('Territory persist error:', updateErr);
    }

    return NextResponse.json({ territory_analysis: result });
  } catch (err) {
    console.error('Territory route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Territory analysis failed' },
      { status: 500 }
    );
  }
}
