import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLMWithMeta } from '@/lib/llm-client';
import { scoreCase } from '@/lib/gap-analysis-engine';
import { rankApplications } from '@/lib/resolve-application';
import { enrichCategory, runSemanticEval } from '@/lib/gap-analysis-enrichment';
import { uploadedDocTypeLabel, summarizeExtractedJson } from '@/lib/uploaded-doc-labels';

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

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const forceRegenerate: boolean = body?.force === true;

  // Resolve primary application via the shared canonical rule
  const { data: allApps } = await supabase
    .from('applications')
    .select('id, source, payment_status, created_at, business_name, business_category, operational_status, target_state, principal_name, simulator_sessions_used, simulator_sessions_purchased')
    .eq('user_id', user.id);

  const primaryId = rankApplications(allApps ?? [])?.id ?? null;
  const primaryApp = (allApps ?? []).find((a: { id: string }) => a.id === primaryId);
  if (!primaryApp) {
    return NextResponse.json({ error: 'No primary application found. Complete the eligibility quiz first.' }, { status: 404 });
  }

  // Entitlement gate — Interview Case Dossier is bundled with the Simulator module.
  // Users need simulator_sessions_purchased > 0 on any application (meaning they own a
  // Complete package or purchased the Simulator add-on).
  const totalPurchased = (allApps ?? []).reduce(
    (s: number, a: { simulator_sessions_purchased: number | null }) => s + (a.simulator_sessions_purchased ?? 0),
    0
  );
  if (totalPurchased === 0) {
    return NextResponse.json({ error: 'simulator_not_purchased' }, { status: 403 });
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
    simSessionsRes,
    caseTheoryRes,
    uploadedDocsRes,
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
    // Last 5 completed sessions (not just the latest) so the dossier can show
    // a trend across retakes rather than a single snapshot.
    supabase
      .from('simulator_sessions')
      .select('readiness_indicator, coaching_notes, strong_count, needs_work_count, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5),
    // CIC-3.3 — the CPU's Case Theory: dimension verdicts + directives. The CPU
    // emits directives tagged engine='simulator_prep' specifically to steer this
    // dossier toward the dimensions its reasoning found weakest.
    supabase
      .from('case_theory')
      .select('narrative, numbers_strategy, dimension_verdicts, directives')
      .eq('application_id', primaryApp.id)
      .maybeSingle(),
    // Raw uploaded-document extraction data — previously fetched by the FDD
    // analysis lookup only; the client's other filed evidence (resume, bank
    // records, business plan, etc.) was never surfaced to this dossier.
    supabase
      .from('uploaded_documents')
      .select('doc_type, extracted_json')
      .eq('application_id', primaryApp.id)
      .eq('extraction_status', 'complete'),
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

  const simSessions = (simSessionsRes.data ?? []) as {
    readiness_indicator?: string | null;
    coaching_notes?: { top3NextSession?: string[]; summary?: string } | null;
    strong_count?: number | null;
    needs_work_count?: number | null;
    completed_at?: string | null;
  }[];
  const simSession = simSessions[0] ?? null;

  // Trend across retakes — oldest to newest so the LLM can narrate improvement
  // (or regression) rather than only ever seeing the single latest snapshot.
  const simulatorTrend = [...simSessions].reverse().map(s => ({
    completedAt: s.completed_at ?? null,
    readiness: s.readiness_indicator ?? null,
    strongCount: s.strong_count ?? null,
    needsWorkCount: s.needs_work_count ?? null,
  }));

  const uploadedDocs = (uploadedDocsRes.data ?? []) as {
    doc_type: string;
    extracted_json: Record<string, unknown> | null;
  }[];
  const documentsOnFile = uploadedDocs.map(d => ({
    type: uploadedDocTypeLabel(d.doc_type),
    summary: summarizeExtractedJson(d.extracted_json, 160) || null,
  }));

  // CIC-3.3 — Case Theory overlay. The CPU's per-dimension verdicts tell us which
  // dimensions its reasoning could NOT yet prove; its directives are the concrete,
  // doctrine-grounded coaching tasks for this dossier. Both are descriptive — no
  // numbers are derived here.
  const caseTheory = caseTheoryRes.data as {
    narrative?: string | null;
    numbers_strategy?: unknown;
    dimension_verdicts?: Record<string, { status?: string; gap?: string | null }> | null;
    directives?: Array<{ engine: string; dimension: string; instruction: string; doctrineRef: string | null }> | null;
  } | null;

  const UNPROVEN = new Set(['weak', 'missing', 'contradicted']);
  const cpuWeakDimensions = Object.entries(caseTheory?.dimension_verdicts ?? {})
    .filter(([, v]) => v?.status && UNPROVEN.has(v.status))
    .map(([dimension, v]) => ({ dimension, status: v.status as string, gap: v.gap ?? null }));
  const cpuWeakDimSet = new Set(cpuWeakDimensions.map((d) => d.dimension));

  // Directives the CPU aimed at this engine (plus any cross-engine directive on a
  // weak dimension), surfaced verbatim so the dossier executes the CPU's plan.
  const cpuPrepDirectives = (caseTheory?.directives ?? [])
    .filter((d) => d.engine === 'simulator_prep' || cpuWeakDimSet.has(d.dimension))
    .map((d) => ({ dimension: d.dimension, instruction: d.instruction, doctrineRef: d.doctrineRef }));

  // CIC-3.3 — map CPU weak dimensions to the interview probes that pressure-test
  // them, so the practice probe set is driven by the CPU's verdict, not only the
  // legacy per-engine scores.
  const CPU_DIM_TO_WP: Record<string, string> = {
    source_of_funds: 'WP-03',
    investment:      'WP-01',
    operations:      'WP-02',
    background:      'WP-04',
  };
  const cpuForcedProbeIds = new Set(
    cpuWeakDimensions.map((d) => CPU_DIM_TO_WP[d.dimension]).filter((id): id is string => Boolean(id))
  );

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

  // Gap Analysis's LLM-enriched narrative + semantic field ratings — the same
  // enrichment the /gap-analysis page requests via /api/gap-analysis/run,
  // reused here (via the shared lib) instead of only the bare deterministic
  // score this dossier previously re-derived.
  const weakCategories = gapResult.categories.filter(c => c.score < 70);
  const [enrichmentResults, semanticFieldRatings] = await Promise.all([
    weakCategories.length > 0
      ? Promise.all(weakCategories.map(c => enrichCategory({
          id: c.id,
          name: c.name,
          gaps: c.gaps,
          evidence: c.evidence,
          score: c.score,
          businessName: primaryApp.business_name ?? undefined,
          businessCategory: primaryApp.business_category ?? undefined,
          operationalStatus: primaryApp.operational_status ?? undefined,
        })))
      : Promise.resolve([]),
    runSemanticEval(primaryApp.id, primaryApp.business_name ?? null),
  ]);
  const gapEnrichments: Record<string, string | null> = {};
  for (const { id, enrichment } of enrichmentResults) {
    gapEnrichments[id] = enrichment;
  }

  // Determine which WP probes apply — legacy score triggers OR a CPU weak-dimension
  // directive (CIC-3.3) forcing the probe in.
  const applicableWpProbes = Object.entries(WP_QUESTIONS).filter(([id]) => {
    if (cpuForcedProbeIds.has(id)) return true;
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

    // Market data answers — full QMA-* set (previously only 5 of 10 fields were read)
    qmaScore: am.get('QMA-SCORE') ?? null,
    qmaRating: am.get('QMA-RATING') ?? null,
    qmaPopulation: am.get('QMA-POPULATION') ?? null,
    qmaCompetitorCount: am.get('QMA-COMPETITOR-COUNT') ?? null,
    qmaVerdict: am.get('QMA-VERDICT') ?? null,
    qmaZip: am.get('QMA-ZIP') ?? null,
    qmaState: am.get('QMA-STATE') ?? null,
    qmaBusinessName: am.get('QMA-BUSINESS-NAME') ?? null,
    qmaBusinessCategory: am.get('QMA-BUSINESS-CATEGORY') ?? null,
    qmaPopPerCompetitor: am.get('QMA-POP-PER-COMPETITOR') ?? null,

    // Uploaded-document extraction data — the client's filed evidence
    // (resume, bank/investment records, business plan, FDD, etc.), not just
    // the FDD analysis row this dossier previously read in isolation.
    documentsOnFile,

    // Gap Analysis's LLM-enriched narrative for weak categories, and the
    // semantic ratings for the 3 fields officers scrutinise most — the same
    // enrichment surfaced on the /gap-analysis page, not re-derived here.
    gapCategoryEnrichments: gapEnrichments,
    semanticFieldRatings,

    // Multi-session simulator trend (oldest to newest) — previously only the
    // single latest session was visible, so no improvement/regression story
    // could be told across retakes.
    simulatorTrend,

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

    // Case Intelligence Core overlay (CIC-3.3) — the CPU's verdict on which
    // dimensions remain unproven and its concrete coaching directives for this
    // dossier. Lead the revision focus with these.
    cpuWeakDimensions,
    cpuPriorityDirectives: cpuPrepDirectives,

    // Full case theory — the CPU's raw narrative and numbers strategy, not just
    // the abstracted verdict labels above. Ground section2/section5 in this.
    caseTheoryNarrative: caseTheory?.narrative ?? null,
    caseTheoryNumbersStrategy: caseTheory?.numbers_strategy ?? null,

    // Questions to answer
    universalQuestions: Object.entries(UQ_QUESTIONS).map(([id, text]) => ({ id, text })),
    applicableWpProbes: applicableWpProbes.map(([id, info]) => ({ id, trigger: info.trigger, text: info.text })),
  };

  // Build the prompt
  const prompt = `You are a senior E-2 Treaty Investor visa consultant producing a personalised revision dossier for ${caseContext.principalName}.

This client will attend a consulate interview for an E-2 visa. This dossier is their complete revision document — built entirely from their submitted case data. They may have signed their franchise agreement months ago and this brings them back up to speed before the interview.

CASE DATA (pre-computed — do not derive new numbers, use only what is here):
${JSON.stringify(caseContext, null, 2)}

Produce a JSON object with exactly these 7 sections. Every section must use the client's real data — no placeholders. Write in second person ("you", "your"). Use plain English. Be specific with numbers and facts. If caseTheoryNarrative or caseTheoryNumbersStrategy are present in the case data, ground section2 (strengths) and section5 (investment numbers) in them — they are the CPU's own reasoning about which figures to foreground and which honest narrative wins this case.

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
    "simulatorFeedback": "If simulatorTrend has entries: narrate the trend across sessions (improving/steady/regressing on readiness and needs-work count), leading with the most recent. Otherwise: 'No simulator sessions recorded — consider a practice run before your interview.'",
    "documentsToCarry": "List the physical documents this applicant should bring, grounded in documentsOnFile (what's actually been uploaded and extracted) plus what's still missing for their application type and family configuration",
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
- CASE-INTELLIGENCE PRIORITY (cpuWeakDimensions / cpuPriorityDirectives): these are the dimensions the case-intelligence reasoning could NOT yet prove and its specific coaching instructions for this client. Lead section 3 (risk register) and section 6 (revision focus) with these dimensions, and weave each cpuPriorityDirective's instruction into the relevant answer framework in section 7. These are the highest-leverage things this client must shore up before the interview — do not bury them.
- gapCategoryEnrichments / semanticFieldRatings: this is the same officer-facing narrative and field-level rating (strong/adequate/weak/not_filed) shown on the client's Gap Analysis page for their weakest categories and 3 most-scrutinised fields (revenue projection basis, management activities, source of funds). Ground "yourPosition" and "whatToSay" in section 3, and the answer frameworks in section 7 for those same topics, in this narrative rather than re-deriving generic advice.
- documentsOnFile: the client's actual uploaded and extracted evidence. Use it in section4/section6 to state what's already on file (don't ask them to gather something they've already uploaded) and flag genuinely missing documents.
- simulatorTrend: an array of past sessions oldest-to-newest (empty if none). Use it to ground section6's simulatorFeedback in an honest trajectory, not just the latest score.
- Return only the JSON object — no markdown fences, no explanation.`;

  // Call LLM with 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let kitJson: Record<string, unknown>;
  let modelUsed = 'unknown';
  try {
    const result = await callLLMWithMeta({
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

    if (!result?.content) throw new Error('Empty LLM response');
    const content = result.content;
    modelUsed = result.model;

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
    model_used: modelUsed,
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
    .select('id, source, payment_status, created_at, simulator_sessions_purchased')
    .eq('user_id', user.id);

  const totalPurchased = (allApps ?? []).reduce(
    (s: number, a: { simulator_sessions_purchased: number | null }) => s + (a.simulator_sessions_purchased ?? 0),
    0
  );
  if (totalPurchased === 0) {
    return NextResponse.json({ error: 'simulator_not_purchased' }, { status: 403 });
  }

  const primaryGetId = rankApplications(allApps ?? [])?.id ?? null;
  const primaryApp = (allApps ?? []).find((a: { id: string }) => a.id === primaryGetId);
  if (!primaryApp) {
    return NextResponse.json({ kit: null, requirements: { met: false, missing: ['Complete the eligibility quiz to create your application'] } });
  }

  const [cachedRes, lifecycleRes, answersRes] = await Promise.all([
    supabase
      .from('interview_prep_kits')
      .select('kit_json, generated_at')
      .eq('application_id', primaryApp.id)
      .maybeSingle(),
    supabase
      .from('application_lifecycle')
      .select('module1_completed_at, module2_completed_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    // module3_completed_at is never written anywhere in the app (Module 3's category
    // subsections don't set it), so it can never gate this check — a direct read of
    // whether investment/document answers actually exist is the real signal.
    supabase
      .from('answers')
      .select('question_key')
      .eq('application_id', primaryApp.id)
      .limit(1),
  ]);

  const lifecycle = lifecycleRes.data as {
    module1_completed_at: string | null;
    module2_completed_at: string | null;
  } | null;

  const missing: string[] = [];
  if (!lifecycle?.module1_completed_at) missing.push('Complete onboarding — your personal and visa story (Step 2)');
  if (!lifecycle?.module2_completed_at) missing.push('Add your business profile — business details and market position (Step 3)');
  if (!answersRes.data || answersRes.data.length === 0) missing.push('Add investment details and supporting documents (Step 4)');

  const cached = cachedRes.data;
  return NextResponse.json({
    kit: cached?.kit_json ?? null,
    generated_at: cached?.generated_at ?? null,
    requirements: { met: missing.length === 0, missing },
  });
}
