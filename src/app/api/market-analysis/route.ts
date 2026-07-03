import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyseTeritoryForBusiness } from '@/lib/fdd-territory-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const applicationId = req.nextUrl.searchParams.get('applicationId');
  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
  }

  const { data: rows } = await supabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .in('question_key', ['QMA-BUSINESS-NAME', 'QMA-BUSINESS-CATEGORY', 'QMA-ZIP', 'QMA-STATE']);

  const byKey = new Map((rows ?? []).map(r => [r.question_key, r.answer_value]));
  const businessName = byKey.get('QMA-BUSINESS-NAME') ?? null;
  const businessCategory = byKey.get('QMA-BUSINESS-CATEGORY') ?? null;
  const zip = byKey.get('QMA-ZIP') ?? null;
  const state = byKey.get('QMA-STATE') ?? null;

  if (!businessName || !businessCategory || !zip || !state) {
    return NextResponse.json({ saved: false });
  }

  return NextResponse.json({ saved: true, businessName, businessCategory, zip, state });
}

const VALID_CATEGORIES = [
  'qsr',
  'home_services',
  'senior_care',
  'health_fitness',
  'child_education',
  'automotive',
  'retail',
  'professional',
];

// Write territory score metrics back to the answers table so Gap Analysis,
// Generation, and Case Profile engines can reference them.
async function writeMarketScoreBack(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  applicationId: string,
  analysis: TerritoryAnalysis,
  businessName: string,
  businessCategory: string,
): Promise<void> {
  // Keys use QMA- prefix (Q-series, market-analysis source).
  // source/user_id columns omitted — may not exist until migration 004 is applied.
  const rows = [
    { key: 'QMA-SCORE',              value: String(analysis.overall_score) },
    { key: 'QMA-RATING',             value: analysis.overall_rating },
    { key: 'QMA-ZIP',                value: analysis.target_zip },
    { key: 'QMA-STATE',              value: analysis.target_state },
    { key: 'QMA-POPULATION',         value: String(analysis.census.total_population ?? '') },
    { key: 'QMA-COMPETITOR-COUNT',   value: String(analysis.competitors.nearby_count ?? '') },
    { key: 'QMA-POP-PER-COMPETITOR', value: String(analysis.competitors.population_per_competitor ?? '') },
    { key: 'QMA-VERDICT',            value: analysis.narrative.VERDICT },
    { key: 'QMA-BUSINESS-NAME',      value: businessName },
    { key: 'QMA-BUSINESS-CATEGORY',  value: businessCategory },
  ].filter(r => r.value !== '' && r.value !== 'null' && r.value !== 'undefined');

  await supabase.from('answers').upsert(
    rows.map(r => ({
      application_id: applicationId,
      question_key: r.key,
      answer_value: r.value,
      answered_at: new Date().toISOString(),
    })),
    { onConflict: 'application_id,question_key,family_member_id' },
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    businessName?: string;
    businessCategory?: string;
    zip?: string;
    state?: string;
    applicationId?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { businessName, businessCategory, zip, state, applicationId } = body;

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
  }
  if (!businessCategory || !VALID_CATEGORIES.includes(businessCategory)) {
    return NextResponse.json(
      { error: `businessCategory must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }
  if (!zip || !/^\d{5}$/.test(zip.trim())) {
    return NextResponse.json({ error: 'zip must be a 5-digit US ZIP code' }, { status: 400 });
  }
  if (!state?.trim()) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 });
  }

  try {
    const analysis = await analyseTeritoryForBusiness(
      zip.trim(),
      state.trim().toUpperCase(),
      businessName.trim(),
      businessCategory,
    );

    // Write territory metrics back to answers table (non-blocking).
    // Use the provided applicationId, or fall back to the user's latest application.
    const resolveAndWriteBack = async () => {
      try {
        let appId: string | null = applicationId ?? null;
        if (!appId) {
          appId = await resolvePrimaryApplicationId(supabase, user.id);
        }
        if (appId) {
          await writeMarketScoreBack(supabase, appId, analysis, businessName.trim(), businessCategory);
        }
      } catch (writeErr) {
        // Non-blocking — log but never fail the response
        console.error('[market-analysis] Score writeback failed:', writeErr);
      }
    };
    void resolveAndWriteBack();

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Market analysis error:', err);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
