import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import Anthropic from '@anthropic-ai/sdk';
import { scoreFdd } from '@/lib/fdd-scoring-engine';
import { synthesizeInvestorProfile } from '@/lib/investor-profile-synthesizer';
import { resolvePrimaryApplication } from '@/lib/resolve-application';
import type { FddExtractedFields, FddE2Score } from '@/types/fdd';

const anthropic = new Anthropic();

// POST /api/fdd/score
// Body: { fdd_id: string }
// Returns: { e2_score: FddE2Score }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'fdd');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many FDD requests. Please wait before scoring another analysis.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    if (await isKillSwitchEnabled()) {
      return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    const { fdd_id } = await request.json() as { fdd_id: string };
    if (!fdd_id) return NextResponse.json({ error: 'fdd_id required' }, { status: 400 });

    // Fetch the analysis record
    const service = createServiceClient();
    const { data: analysis, error: fetchErr } = await service
      .from('fdd_analyses')
      .select('extracted_fields, fdd_stale, state_registration_status, investor_liquid_capital')
      .eq('id', fdd_id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: 'FDD analysis not found' }, { status: 404 });
    }

    if (!analysis.extracted_fields) {
      return NextResponse.json({ error: 'Extraction must complete before scoring' }, { status: 422 });
    }

    const fields = analysis.extracted_fields as FddExtractedFields;
    const staleStatus = analysis.fdd_stale ? 'fail' : 'current';
    const registrationStatus = analysis.state_registration_status ?? 'unknown';
    const investorLiquidCapital = analysis.investor_liquid_capital as number | null;

    // Build synthesized investor profile (QFN first, then inferred from M3/archetype/category)
    const latestApp = await resolvePrimaryApplication<{ id: string; business_category: string | null; operational_status: string | null }>(
      service, user.id, 'id, business_category, operational_status'
    );
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

    // Run pure numeric scoring
    const scoringResult = scoreFdd(
      fields,
      staleStatus,
      registrationStatus,
      investorLiquidCapital,
      investorProfile
    );

    // Build narrative with LLM
    const narrative = await generateNarrative(scoringResult, fields, analysis);

    const e2Score: FddE2Score = {
      overall: scoringResult.overall,
      dimensions: {
        eligibility_gates: scoringResult.eligibility_gates,
        investment_substantiality: scoringResult.investment_substantiality,
        non_marginality: scoringResult.non_marginality,
        develop_and_direct: scoringResult.develop_and_direct,
      },
      timing_assessment: scoringResult.timing,
      ode_assessment: scoringResult.ode,
      narrative,
      flags: scoringResult.flags.map(f => f.label),
    };

    // Persist to DB
    const { error: updateErr } = await service
      .from('fdd_analyses')
      .update({
        e2_score: e2Score,
        overall_compatibility: scoringResult.overall,
        flag_count: scoringResult.flag_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fdd_id);

    if (updateErr) {
      console.error('Score persist error:', updateErr);
    }

    return NextResponse.json({ e2_score: e2Score });
  } catch (err) {
    console.error('Score route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scoring failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// LLM narrative generation
// ============================================================================

type ScoringResult = ReturnType<typeof scoreFdd>;

async function generateNarrative(
  scoring: ScoringResult,
  fields: FddExtractedFields,
  analysis: Record<string, unknown>
): Promise<Record<string, string>> {
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? 'This franchise';
  const overallLabel = scoring.overall;
  const flagSummary = scoring.flags.map(f => `- ${f.label}`).join('\n');
  const targetState = (analysis.target_state as string) ?? 'the target state';
  const targetCity = (analysis.target_city as string) ?? '';

  const dimensionSummary = [
    `Eligibility Gates: ${scoring.eligibility_gates.result.toUpperCase()}`,
    `Investment Substantiality: ${scoring.investment_substantiality.result.toUpperCase()}`,
    `Non-Marginality: ${scoring.non_marginality.result.toUpperCase()}`,
    `Develop and Direct: ${scoring.develop_and_direct.result.toUpperCase()}`,
  ].join('\n');

  const odeSummary = scoring.ode.ode_mid !== null
    ? `Estimated owner net income: low $${scoring.ode.ode_low?.toLocaleString() ?? 'n/a'} / mid $${scoring.ode.ode_mid.toLocaleString()} / high $${scoring.ode.ode_high?.toLocaleString() ?? 'n/a'}`
    : scoring.ode.note;

  const prompt = `You are a senior immigration attorney and franchise development director with 20 years of E-2 visa and franchise experience.

You have just scored an FDD for E-2 visa compatibility. Write four concise, professional narrative sections based on the scoring data below. Write in plain English — no jargon, no hedging, no generic advice. Be specific. Every sentence must be grounded in the data.

---
FRANCHISE: ${franchiseName}
TARGET LOCATION: ${targetCity ? `${targetCity}, ` : ''}${targetState}
OVERALL RATING: ${overallLabel}

DIMENSION RESULTS:
${dimensionSummary}

FLAGS RAISED:
${flagSummary || 'None'}

OWNER INCOME MODEL (ODE):
${odeSummary}

TIMING: ${scoring.timing.note}
---

Write exactly these four sections. Each section should be 2-4 sentences maximum.

OVERALL_VERDICT: One paragraph verdict on whether this franchise is well-suited for E-2. Reference the overall rating and the most decisive factors.

STRENGTHS: 2-3 specific strengths extracted from the data that support an E-2 application. Start each with a specific fact.

CONCERNS: 2-3 specific concerns or risks from the scoring. Be direct. Reference specific data points.

ATTORNEY_NOTE: One practical sentence advising what this investor should bring to their immigration attorney based on this analysis.

Return as JSON: {"OVERALL_VERDICT":"...","STRENGTHS":"...","CONCERNS":"...","ATTORNEY_NOTE":"..."}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Record<string, string>;
    }
    return { OVERALL_VERDICT: text, STRENGTHS: '', CONCERNS: '', ATTORNEY_NOTE: '' };
  } catch (err) {
    console.error('Narrative generation error:', err);
    return {
      OVERALL_VERDICT: `This franchise scored ${overallLabel} for E-2 compatibility.`,
      STRENGTHS: '',
      CONCERNS: flagSummary || 'No flags raised.',
      ATTORNEY_NOTE: 'Consult an immigration attorney before signing any franchise agreement.',
    };
  }
}
