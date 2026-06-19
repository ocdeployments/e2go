import { createClient } from '@supabase/supabase-js';
import { CaseProfile, Archetype } from '@/types/case-profile';

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

export async function buildCaseProfile(userId: string): Promise<CaseProfile> {
  const supabase = getSupabaseAdmin();

  // Fetch most recent quiz session
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score, outcome, result_json, post_quiz_profile, franchise_triggered')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const session = sessions?.[0];

  // Fetch most recent application
  const { data: applications } = await supabase
    .from('applications')
    .select('id, investment_amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const application = applications?.[0];

  // Extract post-quiz profile answers
  const postProfile = (session?.post_quiz_profile as Record<string, string>) ?? {};
  const netWorthRange = postProfile.net_worth_range ?? '';
  const priorBusiness = postProfile.prior_business ?? '';
  const industryInterest = postProfile.industry_interest ?? '';
  const timelineGoal = postProfile.timeline_goal ?? '';

  // Extract flags from result_json
  const resultJson = (session?.result_json as Record<string, unknown>) ?? {};
  const riskFlags = (resultJson.warnings as string[]) ?? [];
  const attorneyFlags = (resultJson.attorney_flags as string[]) ?? [];
  const investmentRange = (resultJson.investment_range as string) ?? '';
  const hardStops = session?.outcome === 'DO_NOT_PROCEED' ? attorneyFlags : [];

  // Compute derived values
  const archetype = classifyArchetype(priorBusiness, industryInterest);
  const eligibilityScore = scoreQuizEligibility(session?.score ?? 0, hardStops, riskFlags);
  const franchiseTrigger = detectFranchiseTrigger(
    industryInterest,
    archetype,
    session?.franchise_triggered ?? false
  );

  // Select-then-upsert pattern (avoids unique constraint requirement)
  const { data: existing } = await supabase
    .from('case_profiles')
    .select('id, created_at')
    .eq('user_id', userId)
    .single();

  const profilePayload = {
    user_id: userId,
    quiz_session_id: session?.id ?? null,
    application_id: application?.id ?? null,
    archetype,
    eligibility_score: eligibilityScore,
    franchise_triggered: franchiseTrigger,
    franchise_match_score: 0,
    profile_data: {
      net_worth_range: netWorthRange,
      prior_business: priorBusiness,
      industry_interest: industryInterest,
      timeline_goal: timelineGoal,
      investment_range: investmentRange,
    },
    updated_at: new Date().toISOString(),
  };

  let createdAt = new Date().toISOString();

  if (existing) {
    await supabase
      .from('case_profiles')
      .update(profilePayload)
      .eq('user_id', userId);
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
    quizSessionId: session?.id ?? null,
    applicationId: application?.id ?? null,
    archetype,
    eligibilityScore,
    franchiseTrigger,
    franchiseMatchScore: 0,
    investmentRange,
    industryInterest,
    netWorthRange,
    priorBusiness,
    timelineGoal,
    quizOutcome: session?.outcome ?? '',
    quizScore: session?.score ?? 0,
    hardStops,
    createdAt,
  };
}
