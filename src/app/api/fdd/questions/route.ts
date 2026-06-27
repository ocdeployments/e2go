import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { generateQuestions } from '@/lib/fdd-questions-engine';
import { scoreFdd } from '@/lib/fdd-scoring-engine';
import { synthesizeInvestorProfile } from '@/lib/investor-profile-synthesizer';
import type { FddExtractedFields, FddQuestions } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';

// POST /api/fdd/questions
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

    // Load the FDD analysis
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
      return NextResponse.json({ error: 'Extraction must complete before generating questions' }, { status: 422 });
    }

    // Load CaseProfile for the user (best-effort, graceful if missing)
    const { data: caseProfile } = await service
      .from('case_profiles')
      .select('source_of_funds_score, management_role_score')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fields = analysis.extracted_fields as FddExtractedFields;
    const staleStatus = analysis.fdd_stale ? 'fail' : 'current';
    const registrationStatus = analysis.state_registration_status ?? 'unknown';
    const investorLiquidCapital = analysis.investor_liquid_capital as number | null;

    // Build synthesized investor profile (QFN first, then inferred from M3/archetype/category)
    const { data: apps } = await service
      .from('applications')
      .select('id, business_category, operational_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const latestApp = apps?.[0] ?? null;
    const appId = latestApp?.id ?? null;

    const { data: caseProfileRow } = await service
      .from('case_profiles')
      .select('archetype')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let investorProfile: { professionalBackground?: string; managementExperience?: string } | undefined;
    if (appId) {
      const { data: answerRows } = await service
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', appId)
        .in('question_key', ['QFN-07', 'QFN-08', 'QFN-09', 'QFN-10', 'QFN-01', 'M3-A-08', 'M3-A-09']);
      const synthesized = synthesizeInvestorProfile(
        answerRows ?? [],
        { business_category: latestApp?.business_category ?? null },
        (caseProfileRow?.archetype as string) ?? null
      );
      if (synthesized.source !== 'unknown') {
        investorProfile = {
          professionalBackground: synthesized.professionalBackground ?? undefined,
          managementExperience:   synthesized.managementExperience   ?? undefined,
        };
      }
    }

    // Always re-score to get full flag objects (persisted e2_score lacks flag detail)
    const scoring: ScoringResult = scoreFdd(fields, staleStatus, registrationStatus, investorLiquidCapital, investorProfile);

    const profileSubset = caseProfile ? {
      investor_liquid_capital: investorLiquidCapital,
      investor_net_worth: analysis.investor_net_worth as number | null,
      source_of_funds_score: caseProfile.source_of_funds_score as number | null,
      management_role_score: caseProfile.management_role_score as number | null,
    } : null;

    const result = await generateQuestions(fields, scoring, profileSubset);

    // Replace [target state] placeholder with actual target state
    const targetStateLabel = (analysis.target_state as string | null) ?? 'your target state';
    result.questions.forEach(q => {
      q.text = q.text.replace(/\[target state\]/gi, targetStateLabel);
    });
    if (result.priority_questions) {
      result.priority_questions.forEach(q => {
        q.text = q.text.replace(/\[target state\]/gi, targetStateLabel);
      });
    }

    // Persist questions and profile_match
    const questionsRecord: FddQuestions = {
      questions: result.questions,
      priority_questions: result.priority_questions,
    };

    const { error: updateErr } = await service
      .from('fdd_analyses')
      .update({
        questions: questionsRecord,
        profile_match: result.profile_match
          ? {
              score: result.profile_match.overall_score,
              dimensions: {
                investment_match: result.profile_match.investment_match,
                net_worth_match: result.profile_match.net_worth_match,
                industry_fit: result.profile_match.industry_fit,
              },
              gaps: result.profile_match.gaps,
            }
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fdd_id);

    if (updateErr) {
      console.error('Questions persist error:', updateErr);
    }

    return NextResponse.json({
      questions: result.questions,
      priority_questions: result.priority_questions,
      total_count: result.total_count,
      profile_match: result.profile_match,
    });
  } catch (err) {
    console.error('Questions route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Question generation failed' },
      { status: 500 }
    );
  }
}
