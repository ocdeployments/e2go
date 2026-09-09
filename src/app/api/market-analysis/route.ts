import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyseTeritoryForBusiness } from '@/lib/fdd-territory-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/capture-error';
import { getUserEntitlements, resolveMarketAnalysisLimit } from '@/lib/entitlements';

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

  const { data: ownedApp } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedApp) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
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

  const rl = await checkRateLimit(user.id, 'fdd-analysis');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before running another market analysis.' },
      { status: 429 }
    );
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

  const { businessName, businessCategory, zip, state } = body;
  let { applicationId } = body;

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

  if (!applicationId) {
    applicationId = await resolvePrimaryApplicationId(supabase, user.id) ?? undefined;
  }

  if (applicationId) {
    // applicationId is client-suppliable (or resolved above, but the client
    // path still needs guarding) — verify ownership before it's used to read
    // or consume another user's purchased quota below.
    const { data: ownedApp } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!ownedApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const [{ data: application }, entitlements] = await Promise.all([
      supabase
        .from('applications')
        .select('market_analyses_purchased')
        .eq('id', applicationId)
        .single(),
      getUserEntitlements(user.id, supabase),
    ]);

    const limit = resolveMarketAnalysisLimit(entitlements, application?.market_analyses_purchased ?? null);
    const { count } = await supabase
      .from('market_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', applicationId);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: limit === 0
            ? 'Market analysis is included with Investor Ready and Visa Ready. Upgrade to run a report.'
            : `You've used all ${limit} included market analysis reports. Purchase an add-on to run another.`,
          quotaExceeded: true,
          limit,
        },
        { status: 402 }
      );
    }
  }

  try {
    const analysis = await analyseTeritoryForBusiness(
      zip.trim(),
      state.trim().toUpperCase(),
      businessName.trim(),
      businessCategory,
    );

    if (applicationId) {
      const { error: historyError } = await supabase.from('market_analyses').insert({
        application_id: applicationId,
        user_id: user.id,
        business_name: businessName.trim(),
        business_category: businessCategory,
        target_zip: analysis.target_zip,
        target_state: analysis.target_state,
        overall_score: analysis.overall_score,
        overall_rating: analysis.overall_rating,
        population: analysis.census.total_population ?? null,
        competitor_count: analysis.competitors.nearby_count ?? null,
        population_per_competitor: analysis.competitors.population_per_competitor ?? null,
        verdict: analysis.narrative.VERDICT,
        raw_analysis: analysis,
      });

      if (historyError) {
        captureApiError(historyError, { route: 'market-analysis', stage: 'history-insert', userId: user.id, applicationId });
      }
    }

    // Write territory metrics back to answers table (non-blocking).
    const resolveAndWriteBack = async () => {
      try {
        if (applicationId) {
          await writeMarketScoreBack(supabase, applicationId, analysis, businessName.trim(), businessCategory);
        }
      } catch (writeErr) {
        // Non-blocking — log but never fail the response
        captureApiError(writeErr, { route: 'market-analysis', stage: 'score-writeback', userId: user.id, applicationId });
      }
    };
    void resolveAndWriteBack();

    return NextResponse.json(analysis);
  } catch (err) {
    captureApiError(err, { route: 'market-analysis', userId: user.id });
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
