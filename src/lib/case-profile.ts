import { createClient } from '@supabase/supabase-js';
import { CaseProfile, Archetype, DataState } from '@/types/case-profile';
import { scoreCase } from '@/lib/gap-analysis-engine';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function classifyArchetype(
  priorBusiness: string,
  industryInterest: string
): Archetype {
  if (
    priorBusiness === 'owner' &&
    ['home_care', 'food_beverage', 'retail_services'].includes(industryInterest)
  ) {
    return 'buyer';
  }
  if (
    ['owner', 'manager'].includes(priorBusiness) &&
    ['technology', 'professional_services'].includes(industryInterest)
  ) {
    return 'builder';
  }
  if (priorBusiness === 'investor') {
    return 'investor';
  }
  return 'career_switcher';
}

export function scoreQuizEligibility(
  quizScore: number,
  hardStops: string[],
  riskFlags: string[]
): number {
  if (hardStops.length > 0) return 0;
  const penalty = Math.min(riskFlags.length * 5, 20);
  return Math.max(0, Math.min(100, quizScore - penalty));
}

export function detectFranchiseTrigger(
  industryInterest: string,
  archetype: Archetype,
  franchiseInterest?: boolean
): boolean {
  return (
    ['home_care', 'food_beverage', 'retail_services'].includes(industryInterest) ||
    archetype === 'buyer' ||
    franchiseInterest === true
  );
}

function computeCompletenessScore(params: {
  hasQuizSession: boolean;
  postProfileComplete: boolean;
  hasApplication: boolean;
  answerCount: number;
  documentCount: number;
  simulatorSessionCount: number;
}): number {
  let score = 0;
  if (params.hasQuizSession)       score += 20;
  if (params.postProfileComplete)  score += 15;
  if (params.hasApplication)       score += 10;
  if (params.answerCount >= 5)     score += 20;
  if (params.answerCount >= 15)    score += 10; // bonus for a substantially filled case file
  if (params.documentCount >= 1)   score += 15;
  if (params.simulatorSessionCount >= 1) score += 10;
  return Math.min(100, score);
}

function computeDataState(params: {
  answerCount: number;
  documentCount: number;
  simulatorSessionCount: number;
}): DataState {
  if (params.documentCount >= 1 && params.simulatorSessionCount >= 1) return 'full';
  if (params.documentCount >= 1) return 'documents';
  if (params.answerCount >= 3)   return 'case_file';
  return 'quiz_only';
}

export async function buildCaseProfile(userId: string): Promise<CaseProfile> {
  const supabase = getSupabaseAdmin();

  // ── 1. Quiz session ──────────────────────────────────────────────────────
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score, outcome, result_json, post_quiz_profile, franchise_triggered')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const session = sessions?.[0];

  // ── 2. Application (expanded columns) ────────────────────────────────────
  const { data: applications } = await supabase
    .from('applications')
    .select('id, investment_amount, business_name, business_category, operational_status, target_state, principal_name, simulator_sessions_used')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const application = applications?.[0];

  // ── 3. Answers (only when application exists) ─────────────────────────────
  const { data: answerRows } = application
    ? await supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', application.id)
    : { data: null };

  const answers = answerRows ?? [];

  // ── 4. Documents ──────────────────────────────────────────────────────────
  const { data: documentRows } = application
    ? await supabase
        .from('application_documents')
        .select('detected_document_type, user_selected_document_type')
        .eq('application_id', application.id)
    : { data: null };

  const documents = documentRows ?? [];

  // ── 5. Simulator sessions ─────────────────────────────────────────────────
  const { data: simSessions } = application
    ? await supabase
        .from('simulator_sessions')
        .select('id, inconsistency_count, completed_at')
        .eq('application_id', application.id)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false })
    : { data: null };

  const completedSims = simSessions ?? [];
  const latestSim = completedSims[0];

  // ── 6. Case brief ─────────────────────────────────────────────────────────
  const { data: briefRows } = application
    ? await supabase
        .from('case_briefs')
        .select('substantiality_score, marginality_score')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false })
        .limit(1)
    : { data: null };

  const caseBrief = briefRows?.[0];

  // ── 7. Derive quiz-level values ───────────────────────────────────────────
  const postProfile = (session?.post_quiz_profile as Record<string, string>) ?? {};
  const netWorthRange    = postProfile.net_worth_range    ?? '';
  const priorBusiness    = postProfile.prior_business     ?? '';
  const industryInterest = postProfile.industry_interest  ?? '';
  const timelineGoal     = postProfile.timeline_goal      ?? '';

  const resultJson    = (session?.result_json as Record<string, unknown>) ?? {};
  const riskFlags     = (resultJson.warnings       as string[]) ?? [];
  const attorneyFlags = (resultJson.attorney_flags as string[]) ?? [];
  const investmentRange = (resultJson.investment_range as string) ?? '';
  const hardStops     = session?.outcome === 'DO_NOT_PROCEED' ? attorneyFlags : [];

  const archetype       = classifyArchetype(priorBusiness, industryInterest);
  const eligibilityScore = scoreQuizEligibility(session?.score ?? 0, hardStops, riskFlags);
  const franchiseTrigger = detectFranchiseTrigger(
    industryInterest,
    archetype,
    session?.franchise_triggered ?? false
  );

  // ── 8. Dimension scores via gap analysis engine ───────────────────────────
  let sourceOfFundsScore  = 0;
  let managementRoleScore = 0;
  let businessPlanScore   = 0;

  if (application && answers.length > 0) {
    try {
      const appRow = {
        business_name:          application.business_name ?? null,
        business_category:      application.business_category ?? null,
        operational_status:     application.operational_status ?? null,
        target_state:           application.target_state ?? null,
        principal_name:         application.principal_name ?? null,
        simulator_sessions_used: completedSims.length,
      };
      const simData = completedSims.length > 0
        ? { sessionsUsed: completedSims.length, latestInconsistencyCount: latestSim?.inconsistency_count ?? 0 }
        : undefined;

      const gapResult = scoreCase(appRow, answers, documents, caseBrief, simData, archetype);

      for (const cat of gapResult.categories) {
        if (cat.id === 'source_of_funds')  sourceOfFundsScore  = cat.score;
        if (cat.id === 'management_role')   managementRoleScore = cat.score;
        if (cat.id === 'business_plan')     businessPlanScore   = cat.score;
      }
    } catch {
      // Gap analysis is non-blocking — profile still built without dimension scores
    }
  }

  // ── 9. Completeness and data state ────────────────────────────────────────
  const postProfileComplete =
    Boolean(netWorthRange) && Boolean(priorBusiness) &&
    Boolean(industryInterest) && Boolean(timelineGoal);

  const completenessScore = computeCompletenessScore({
    hasQuizSession:        Boolean(session),
    postProfileComplete,
    hasApplication:        Boolean(application),
    answerCount:           answers.length,
    documentCount:         documents.length,
    simulatorSessionCount: completedSims.length,
  });

  const dataState = computeDataState({
    answerCount:           answers.length,
    documentCount:         documents.length,
    simulatorSessionCount: completedSims.length,
  });

  const simulatorReadiness = completedSims.length > 0;

  // ── 10. Persist to case_profiles ─────────────────────────────────────────
  const { data: existing } = await supabase
    .from('case_profiles')
    .select('id, created_at')
    .eq('user_id', userId)
    .single();

  const profilePayload = {
    user_id:                userId,
    quiz_session_id:        session?.id ?? null,
    application_id:         application?.id ?? null,
    archetype,
    eligibility_score:      eligibilityScore,
    franchise_triggered:    franchiseTrigger,
    franchise_match_score:  0,
    completeness_score:     completenessScore,
    data_state:             dataState,
    source_of_funds_score:  sourceOfFundsScore,
    management_role_score:  managementRoleScore,
    business_plan_score:    businessPlanScore,
    profile_data: {
      net_worth_range:   netWorthRange,
      prior_business:    priorBusiness,
      industry_interest: industryInterest,
      timeline_goal:     timelineGoal,
      investment_range:  investmentRange,
    },
    updated_at: new Date().toISOString(),
  };

  let createdAt = new Date().toISOString();

  if (existing) {
    await supabase.from('case_profiles').update(profilePayload).eq('user_id', userId);
    createdAt = existing.created_at ?? createdAt;
  } else {
    const { data: inserted } = await supabase
      .from('case_profiles')
      .insert(profilePayload)
      .select('created_at')
      .single();
    createdAt = inserted?.created_at ?? createdAt;
  }

  return {
    userId,
    quizSessionId:      session?.id ?? null,
    applicationId:      application?.id ?? null,
    archetype,
    eligibilityScore,
    franchiseTrigger,
    franchiseMatchScore: 0,
    investmentRange,
    industryInterest,
    netWorthRange,
    priorBusiness,
    timelineGoal,
    quizOutcome:        session?.outcome ?? '',
    quizScore:          session?.score ?? 0,
    hardStops,
    sourceOfFundsScore,
    managementRoleScore,
    businessPlanScore,
    completenessScore,
    dataState,
    simulatorReadiness,
    createdAt,
  };
}
