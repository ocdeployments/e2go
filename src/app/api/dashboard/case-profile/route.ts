import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export interface CaseProfileResponse {
  // Identity
  firstName: string | null;
  lastName: string | null;
  treatyCountry: string | null;
  businessType: string | null; // franchise | own_business

  // Quiz/Assessment
  quizOutcome: string | null;
  quizCompletedAt: string | null;
  investmentRange: string | null;

  // Case profile computed
  archetype: string | null;
  completenessScore: number | null;
  sourceOfFundsScore: number | null;
  managementRoleScore: number | null;
  businessPlanScore: number | null;

  // Lifecycle milestones
  module1CompletedAt: string | null;
  module2CompletedAt: string | null;
  module3CompletedAt: string | null;
  module4CompletedAt: string | null;
  module5CompletedAt: string | null;

  // Application
  applicationId: string | null;

  // FDD
  fddCount: number;
  latestFddId: string | null;

  // Simulator
  lastSimSessionNumber: number | null;
  simReadiness: string | null;
  simCoachingNotes: string | null;

  // Prep kit
  prepKitId: string | null;
  prepKitCreatedAt: string | null;

  // Extended quiz data
  quizAnswers: Record<string, string> | null;
  generatedDocCount: number;

  // Market analysis (QMA-* answers)
  marketScore: number | null;
  marketRating: string | null;
  marketZip: string | null;
  marketState: string | null;
  marketCompetitorCount: number | null;
  marketVerdict: string | null;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  const [
    profileResult,
    quizResult,
    caseProfileResult,
    lifecycleResult,
    fddCountResult,
    fddLatestResult,
    simResult,
    prepKitResult,
    appResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single(),

    supabase
      .from('quiz_sessions')
      .select('outcome, result_json, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('case_profiles')
      .select('archetype, completeness_score, source_of_funds_score, management_role_score, business_plan_score')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('application_lifecycle')
      .select('module1_completed_at, module2_completed_at, module3_completed_at, module4_completed_at, module5_completed_at')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('fdd_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('fdd_analyses')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('simulator_sessions')
      .select('session_number, readiness_indicator, coaching_notes')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('session_number', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('interview_prep_kits')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .neq('source', 'simulator_standalone')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const quiz = quizResult.data;
  const cp = caseProfileResult.data;
  const lc = lifecycleResult.data;
  const fddCount = fddCountResult.count ?? 0;
  const latestFdd = fddLatestResult.data;
  const sim = simResult.data;
  const prepKit = prepKitResult.data;
  const app = appResult.data;

  const quizResultJson = quiz?.result_json as Record<string, unknown> | null ?? null;
  const quizAnswers = (quizResultJson?.answers as Record<string, string> | null) ?? null;

  // Fetch market analysis answers if the user has an application
  let marketScore: number | null = null;
  let marketRating: string | null = null;
  let marketZip: string | null = null;
  let marketState: string | null = null;
  let marketCompetitorCount: number | null = null;
  let marketVerdict: string | null = null;

  if (app?.id) {
    const { data: qmaRows } = await supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', app.id)
      .in('question_key', ['QMA-SCORE', 'QMA-RATING', 'QMA-ZIP', 'QMA-STATE', 'QMA-COMPETITOR-COUNT', 'QMA-VERDICT']);

    if (qmaRows?.length) {
      const qma: Record<string, string> = Object.fromEntries(
        qmaRows.map(r => [r.question_key, r.answer_value ?? ''])
      );
      marketScore         = qma['QMA-SCORE']            ? Number(qma['QMA-SCORE']) : null;
      marketRating        = qma['QMA-RATING']            ?? null;
      marketZip           = qma['QMA-ZIP']               ?? null;
      marketState         = qma['QMA-STATE']             ?? null;
      marketCompetitorCount = qma['QMA-COMPETITOR-COUNT'] ? Number(qma['QMA-COMPETITOR-COUNT']) : null;
      marketVerdict       = qma['QMA-VERDICT']           ?? null;
    }
  }

  const response: CaseProfileResponse = {
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    treatyCountry: quizAnswers?.['Q0-01'] ?? null,
    businessType: quizAnswers?.['Q0-08a'] ?? null,

    quizOutcome: quiz?.outcome ?? null,
    quizCompletedAt: quiz?.completed_at ?? null,
    investmentRange: (quizResultJson?.investment_range as string | null) ?? null,

    archetype: cp?.archetype ?? null,
    completenessScore: cp?.completeness_score ?? null,
    sourceOfFundsScore: cp?.source_of_funds_score ?? null,
    managementRoleScore: cp?.management_role_score ?? null,
    businessPlanScore: cp?.business_plan_score ?? null,

    module1CompletedAt: lc?.module1_completed_at ?? null,
    module2CompletedAt: lc?.module2_completed_at ?? null,
    module3CompletedAt: lc?.module3_completed_at ?? null,
    module4CompletedAt: lc?.module4_completed_at ?? null,
    module5CompletedAt: lc?.module5_completed_at ?? null,

    applicationId: app?.id ?? null,

    fddCount,
    latestFddId: latestFdd?.id ?? null,

    lastSimSessionNumber: sim?.session_number ?? null,
    simReadiness: sim?.readiness_indicator ?? null,
    simCoachingNotes: sim?.coaching_notes ?? null,

    prepKitId: prepKit?.id ?? null,
    prepKitCreatedAt: prepKit?.created_at ?? null,

    quizAnswers: quizAnswers,
    generatedDocCount: 0, // wired in Module 5

    marketScore,
    marketRating,
    marketZip,
    marketState,
    marketCompetitorCount,
    marketVerdict,
  };

  return NextResponse.json(response);
}
