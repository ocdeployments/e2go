import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { callLLM } from '@/lib/llm-client';
import { scoreCase } from '@/lib/gap-analysis-engine';

// UQ question text (canonical labels — not session-randomized, for dossier)
const UQ_QUESTIONS: Record<string, string> = {
  'UQ-01': 'Tell me about your business.',
  'UQ-02': 'What is your role in the business?',
  'UQ-03': 'How much have you invested and in what form?',
  'UQ-04': 'Where did your investment funds come from?',
  'UQ-05': 'How will this business support you financially?',
  'UQ-06': 'How many people will you employ?',
  'UQ-07': 'What experience do you have to run this business?',
  'UQ-08': 'What are your plans if your visa is not approved?',
  'UQ-09': 'Do you intend to remain in the U.S. permanently?',
};

// WP probe question text
const WP_QUESTIONS: Record<string, { trigger: string; text: string }> = {
  'WP-01': { trigger: 'low substantiality score', text: 'Walk me through exactly how your investment was allocated across the business.' },
  'WP-02': { trigger: 'low marginality score', text: 'How does your projected revenue compare to your household expenses?' },
  'WP-03': { trigger: 'weak source of funds', text: 'Can you explain the complete chain of how your investment funds originated and moved to the business?' },
  'WP-04': { trigger: 'unclear management role', text: 'Who else is involved in day-to-day management, and how much of your time is devoted to the business?' },
  'WP-05': { trigger: 'immigrant intent risk', text: 'Have you ever applied for a green card or taken any steps toward permanent residence?' },
};

// 7-day cache threshold
const CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const forceRegenerate: boolean = body?.force === true;

  // Resolve primary application
  const { data: allApps } = await supabase
    .from('applications')
    .select('id, source, business_name, business_category, operational_status, target_state, principal_name, simulator_sessions_used')
    .eq('user_id', user.id);

  const primaryApp = (allApps ?? []).find((a: { source: string | null }) => a.source !== 'simulator_standalone');
  if (!primaryApp) {
    return NextResponse.json({ error: 'No primary application found. Complete the eligibility quiz first.' }, { status: 404 });
  }

  // Serve cached kit if still fresh
  if (!forceRegenerate) {
    const { data: cached } = await supabase
      .from('interview_prep_kits')
      .select('kit_json, generated_at')
      .eq('application_id', primaryApp.id)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.generated_at as string).getTime();
      if (age < CACHE_AGE_MS) {
        return NextResponse.json({ kit: cached.kit_json, cached: true, generated_at: cached.generated_at });
      }
    }
  }

  // Parallel data fetch
  const [
    quizRes,
    caseProfileRes,
    answersRes,
    fddRes,
    simRes,
  ] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('outcome, application_type, result_json')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('case_profiles')
      .select('archetype, completeness_score, source_of_funds_score, management_role_score, business_plan_score')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', primaryApp.id),
    supabase
      .from('fdd_analyses')
      .select('extracted_fields, e2_score, territory_analysis, final_report')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('simulator_sessions')
      .select('readiness_indicator, coaching_notes, strong_count, needs_work_count, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const quiz = quizRes.data as {
    outcome: string | null;
    application_type: string | null;
    result_json?: {
      answers?: Record<string, string>;
      investment_range?: string;
      dependents?: string;
      country?: string;
    } | null;
  } | null;

  const caseProfile = caseProfileRes.data as {
    archetype?: string | null;
    completeness_score?: number | null;
    source_of_funds_score?: number | null;
    management_role_score?: number | null;
    business_plan_score?: number | null;
  } | null;

  const answers = (answersRes.data ?? []) as { question_key: string; answer_value: string | null }[];

  // Build answer lookup
  const am = new Map<string, string>();
  for (const a of answers) {
    if (a.answer_value) am.set(a.question_key, a.answer_value);
  }

  const fdd = fddRes.data as {
    extracted_fields?: Record<string, unknown> | null;
    e2_score?: { overallScore?: number; flags?: Array<{ description: string; severity: string }> } | null;
    territory_analysis?: { rating?: string; score?: number; narrative?: string } | null;
    final_report?: string | null;
  } | null;

  const simSession = simRes.data as {
    readiness_indicator?: string | null;
    coaching_notes?: { top3NextSession?: string[]; summary?: string } | null;
    strong_count?: number | null;
    needs_work_count?: number | null;
    completed_at?: string | null;
  } | null;

  // Run scoreCase() synchronously — all computation happens in Node.js, not LLM
  const gapResult = scoreCase(
    primaryApp as { business_name?: string; business_category?: string; operational_status?: string; target_state?: string; principal_name?: string; simulator_sessions_used?: number | null },
    answers.map((a) => ({ question_key: a.question_key, answer_value: a.answer_value })),
    [],
    undefined,
    simSession
      ? { sessionsUsed: primaryApp.simulator_sessions_used ?? 0, latestInconsistencyCount: 0 }
      : undefined,
    caseProfile?.archetype ?? null
  );

  // Determine which WP probes apply
  const applicableWpProbes = Object.entries(WP_QUESTIONS).filter(([id]) => {
    if (id === 'WP-01') return (gapResult.categories.find(c => c.id === 'investment')?.score ?? 100) < 70;
    if (id === 'WP-02') return (gapResult.categories.find(c => c.id === 'employment')?.score ?? 100) < 70;
    if (id === 'WP-03') return (caseProfile?.source_of_funds_score ?? 100) < 70;
    if (id === 'WP-04') return (caseProfile?.management_role_score ?? 100) < 70;
    if (id === 'WP-05') {
      const d15 = gapResult.denialFactors.find(f => f.code === 'D-15');
      return d15?.risk === 'high' || d15?.risk === 'moderate';
    }
    return false;
  });

  // Build structured case context for the LLM
  const caseContext = {
    // Identity
    principalName: primaryApp.principal_name ?? 'the applicant',
    businessName: primaryApp.business_name ?? 'the business',
    businessCategory: primaryApp.business_category ?? null,
    targetState: primaryApp.target_state ?? null,
    treatyCountry: quiz?.result_json?.country ?? quiz?.result_json?.answers?.['Q0-01'] ?? null,
    investmentRange: quiz?.result_json?.investment_range ?? null,
    applicationType: quiz?.application_type ?? null,
    quizOutcome: quiz?.outcome ?? null,

    // Case profile intelligence
    archetype: caseProfile?.archetype ?? null,
    completenessScore: caseProfile?.completeness_score ?? null,
    sourceOfFundsScore: caseProfile?.source_of_funds_score ?? null,
    managementRoleScore: caseProfile?.management_role_score ?? null,
    businessPlanScore: caseProfile?.business_plan_score ?? null,

    // FDD intelligence (franchise clients)
    fddCompatibilityScore: fdd?.e2_score?.overallScore ?? null,
    fddTerritoryRating: fdd?.territory_analysis?.rating ?? null,
    fddTerritoryScore: fdd?.territory_analysis?.score ?? null,
    fddFlags: fdd?.e2_score?.flags?.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5) ?? [],

    // Key narrative answers
    businessDescription: am.get('M3-B-01') ?? am.get('QA-01') ?? null,
    managementRoleDescription: am.get('M3-B-02') ?? am.get('QA-02') ?? null,
    totalInvestment: am.get('QF-NEW-01') ?? am.get('QF-01') ?? null,
    sourceOfFunds: am.get('QF-NEW-02') ?? am.get('QF-02') ?? null,
    staffingPlan: am.get('M3-I-01') ?? null,
    yearOneRevenue: am.get('QE-NEW-01') ?? am.get('QE-01') ?? null,
    professionalBackground: am.get('QD-01') ?? null,
    nonImmigrantStatement: am.get('M3-T-01') ?? null,

    // FDD financial answers written back
    fddAuv: am.get('QA-FDD-AUV') ?? null,
    fddOde: am.get('QA-FDD-ODE') ?? null,
    fddRoyalty: am.get('QA-FDD-ROYALTY') ?? null,
    fddRecommendation: am.get('QA-FDD-RECOMMENDATION') ?? null,
    fddVerdict: am.get('QA-FDD-VERDICT') ?? null,

    // Market data answers
    qmaScore: am.get('QMA-SCORE') ?? null,
    qmaRating: am.get('QMA-RATING') ?? null,
    qmaPopulation: am.get('QMA-POPULATION') ?? null,
    qmaCompetitorCount: am.get('QMA-COMPETITOR-COUNT') ?? null,
    qmaVerdict: am.get('QMA-VERDICT') ?? null,

    // Gap analysis pre-computed
    overallGapScore: gapResult.overallScore,
    highRiskDCodes: gapResult.denialFactors
      .filter(f => f.risk === 'high')
      .map(f => ({ code: f.code, name: f.name, finding: f.finding, mitigation: f.mitigation })),
    moderateRiskDCodes: gapResult.denialFactors
      .filter(f => f.risk === 'moderate')
      .map(f => ({ code: f.code, name: f.name, finding: f.finding, mitigation: f.mitigation })),
    lowRiskDCodes: gapResult.denialFactors
      .filter(f => f.risk === 'low')
      .map(f => ({ code: f.code, name: f.name })),
    caseStrengths: gapResult.categories
      .filter(c => c.priority === 'strong' || c.priority === 'good')
      .map(c => ({ name: c.name, score: c.score, evidence: c.evidence })),

    // Simulator history
    simulatorReadiness: simSession?.readiness_indicator ?? null,
    simulatorStrongCount: simSession?.strong_count ?? null,
    simulatorNeedsWorkCount: simSession?.needs_work_count ?? null,
    simulatorTop3: simSession?.coaching_notes?.top3NextSession ?? [],
    lastSimulatorDate: simSession?.completed_at ?? null,

    // Questions to answer
    universalQuestions: Object.entries(UQ_QUESTIONS).map(([id, text]) => ({ id, text })),
    applicableWpProbes: applicableWpProbes.map(([id, info]) => ({ id, trigger: info.trigger, text: info.text })),
  };

  // Build the prompt
  const prompt = `You are a senior E-2 Treaty Investor visa consultant producing a personalised revision dossier for ${caseContext.principalName}.

This client will attend a consulate interview for an E-2 visa. This dossier is their complete revision document — built entirely from their submitted case data. They may have signed their franchise agreement months ago and this brings them back up to speed before the interview.

CASE DATA (pre-computed — do not derive new numbers, use only what is here):
${JSON.stringify(caseContext, null, 2)}

Produce a JSON object with exactly these 7 sections. Every section must use the client's real data — no placeholders. Write in second person ("you", "your"). Use plain English. Be specific with numbers and facts.

Return ONLY valid JSON matching this structure:
{
  "clientName": "${caseContext.principalName}",
  "businessName": "${caseContext.businessName}",
  "generatedDate": "${new Date().toISOString().split('T')[0]}",

  "section1": {
    "title": "Your Case at a Glance",
    "subtitle": "2-minute review before entering the building",
    "facts": [
      { "label": "Business", "value": "..." },
      { "label": "Treaty Country", "value": "..." },
      { "label": "Investment", "value": "..." },
      { "label": "Application Type", "value": "..." },
      { "label": "Quiz Outcome", "value": "..." },
      { "label": "Investor Archetype", "value": "..." }
    ]
  },

  "section2": {
    "title": "What's Working in Your Favour",
    "subtitle": "Case strengths to lead with",
    "strengths": [
      { "heading": "...", "detail": "..." }
    ]
  },

  "section3": {
    "title": "Your Denial Risk Register",
    "subtitle": "What the officer will probe — and how your case stands",
    "highRisk": [
      { "code": "D-XX", "name": "...", "test": "What the officer is checking", "yourPosition": "Where your case stands based on submitted data", "whatToSay": "What you need to be able to say (first-person)", "risk": "high" }
    ],
    "moderateRisk": [
      { "code": "D-XX", "name": "...", "test": "...", "yourPosition": "...", "whatToSay": "...", "risk": "moderate" }
    ],
    "noIssues": ["List of D-code names where risk is low — e.g. 'Investment substantiality (D-01): No concerns'"]
  },

  "section4": {
    "title": "Your Business — Know This Cold",
    "subtitle": "What the officer expects you to know about your own company",
    "businessOverview": "2-3 sentence description in plain language from the officer's perspective",
    "managementRole": "What your day-to-day management role looks like in E-2 terms",
    "staffingPlan": "Hiring timeline and employment creation commitment",
    "marketPosition": "Market viability — territory, competitors, population data if available"
  },

  "section5": {
    "title": "Your Investment — Know the Numbers",
    "subtitle": "Every figure must be on the tip of your tongue",
    "totalInvested": "...",
    "breakdown": [
      { "item": "...", "amount": "..." }
    ],
    "sourceChronology": "Narrative: where the money came from, how it moved to the business",
    "committedAmount": "What is irrevocably committed / already deployed",
    "fddNote": "If franchise: ODE timeline, royalty structure, AUV context (omit section if not franchise)"
  },

  "section6": {
    "title": "Months May Have Passed — Catch Up",
    "subtitle": "Refresh your memory on what has happened since you filed",
    "keyDates": [
      { "event": "...", "date": "..." }
    ],
    "simulatorFeedback": "If simulator sessions exist: top coaching notes to revisit. Otherwise: 'No simulator sessions recorded — consider a practice run before your interview.'",
    "documentsToCarry": "List the physical documents this applicant should bring based on application type and family configuration",
    "whatMayHaveChanged": "Flag specific things that commonly change between filing and interview that the officer may ask about"
  },

  "section7": {
    "title": "The 9 Interview Questions",
    "subtitle": "Your personalised answer frameworks — using your real numbers and facts",
    "questions": [
      {
        "id": "UQ-01",
        "question": "Tell me about your business.",
        "answerFramework": "What to cover and in what order — using the client's actual business details",
        "keyNumbers": ["Any specific figures to cite"],
        "pitfalls": "Common mistakes to avoid on this question"
      }
    ],
    "applicableProbes": [
      {
        "id": "WP-XX",
        "trigger": "Why this probe may be asked",
        "question": "...",
        "answerFramework": "How to answer based on this client's case"
      }
    ]
  }
}

Important rules:
- Use ONLY data from the CASE DATA object above. Do not invent facts.
- If a data field is null/missing, acknowledge it gracefully ("not yet recorded") rather than fabricating.
- The highRisk and moderateRisk arrays must use only D-codes from the pre-computed lists above.
- Section 7 must cover all 9 universal questions plus any applicable WP probes.
- Answer frameworks must reference real case details (business name, investment amount, archetype, etc.).
- Return only the JSON object — no markdown fences, no explanation.`;

  // Call LLM with 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let kitJson: Record<string, unknown>;
  try {
    const content = await callLLM({
      task: 'coaching',
      messages: [
        {
          role: 'system',
          content: 'You are a senior E-2 visa consultant. Produce complete, personalised dossier JSON using only the pre-computed case data provided. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4500,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!content) throw new Error('Empty LLM response');

    // Parse JSON — strip markdown fences if present
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    try {
      kitJson = JSON.parse(clean) as Record<string, unknown>;
    } catch {
      // Try to extract JSON object
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not extract JSON from response');
      kitJson = JSON.parse(match[0]) as Record<string, unknown>;
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('[prep-kit] LLM call failed:', error);
    return NextResponse.json({ error: 'Failed to generate dossier. Please try again.' }, { status: 500 });
  }

  // Upsert to cache (service client — RLS bypass)
  const serviceClient = createServiceClient();
  await serviceClient.from('interview_prep_kits').upsert({
    application_id: primaryApp.id,
    user_id: user.id,
    kit_json: kitJson,
    model_used: 'xiaomi/mimo-v2.5-pro',
    generated_at: new Date().toISOString(),
  }, { onConflict: 'application_id' });

  return NextResponse.json({
    kit: kitJson,
    cached: false,
    generated_at: new Date().toISOString(),
  });
}

// Allow GET to fetch cached kit without regenerating
export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: allApps } = await supabase
    .from('applications')
    .select('id, source')
    .eq('user_id', user.id);

  const primaryApp = (allApps ?? []).find((a: { source: string | null }) => a.source !== 'simulator_standalone');
  if (!primaryApp) {
    return NextResponse.json({ kit: null });
  }

  const { data: cached } = await supabase
    .from('interview_prep_kits')
    .select('kit_json, generated_at')
    .eq('application_id', primaryApp.id)
    .maybeSingle();

  return NextResponse.json({ kit: cached?.kit_json ?? null, generated_at: cached?.generated_at ?? null });
}
