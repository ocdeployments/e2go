import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLMWithMeta } from '@/lib/llm-client';
import { scoreCase } from '@/lib/gap-analysis-engine';
import { rankApplications } from '@/lib/resolve-application';
import { enrichCategory, runSemanticEval } from '@/lib/gap-analysis-enrichment';
import { uploadedDocTypeLabel } from '@/lib/uploaded-doc-labels';
import { QUESTION_LABELS } from '@/data/question-labels';

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
    legacyDocsRes,
    familyMembersRes,
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
    // family_member_id included so per-person (spouse/dependent/co-investor)
    // answers can be attributed to a name instead of being merged indistinctly
    // with the principal's answers under the same question_key.
    supabase
      .from('answers')
      .select('question_key, answer_value, family_member_id')
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
      .select('doc_type, extracted_json, fields_total')
      .eq('application_id', primaryApp.id)
      .eq('extraction_status', 'complete'),
    // Legacy document pipeline (gap-analysis remediation and quick-start
    // onboarding still write here) — case-summary already merges both
    // pipelines; this dossier previously read uploaded_documents only, so
    // documents filed through the legacy path were invisible to it.
    supabase
      .from('application_documents')
      .select('detected_document_type, fields_extracted, document_summary')
      .eq('application_id', primaryApp.id)
      .eq('extraction_status', 'complete'),
    supabase
      .from('family_members')
      .select('id, member_type, first_name, last_name')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
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

  const answers = (answersRes.data ?? []) as { question_key: string; answer_value: string | null; family_member_id: string | null }[];

  // Build answer lookup — principal-scoped only (family_member_id IS NULL), since
  // the curated caseContext fields below (businessDescription, totalInvestment,
  // etc.) are principal-specific facts. A spouse/dependent/co-investor answer
  // sharing the same question_key must not silently overwrite the principal's.
  const am = new Map<string, string>();
  for (const a of answers) {
    if (a.answer_value && !a.family_member_id) am.set(a.question_key, a.answer_value);
  }

  const familyMembers = (familyMembersRes.data ?? []) as {
    id: string;
    member_type: string;
    first_name: string | null;
    last_name: string | null;
  }[];
  const familyMemberName = new Map(
    familyMembers.map((m) => [m.id, [m.first_name, m.last_name].filter(Boolean).join(' ') || m.member_type])
  );

  // Full answer pool, grouped by who it belongs to — this is the fix for the
  // "answers whitelist" gap: the curated caseContext fields above only surface
  // ~25 hand-picked question keys, so anything extraction wrote under a
  // different key (or scoped to a family member) never reached the prompt.
  // This gives the LLM every recorded answer, readable and attributed by person,
  // instead of only what we happened to hardcode.
  const answersByPerson = new Map<string, Array<{ label: string; value: string }>>();
  for (const a of answers) {
    if (!a.answer_value) continue;
    const person = a.family_member_id ? (familyMemberName.get(a.family_member_id) ?? 'Family member') : 'Principal applicant';
    if (!answersByPerson.has(person)) answersByPerson.set(person, []);
    answersByPerson.get(person)!.push({
      label: QUESTION_LABELS[a.question_key] ?? a.question_key,
      value: a.answer_value,
    });
  }
  const fullAnswerPool = Array.from(answersByPerson.entries()).map(([person, fields]) => ({ person, fields }));

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
    fields_total?: number | null;
  }[];
  const legacyDocs = (legacyDocsRes.data ?? []) as {
    detected_document_type: string | null;
    fields_extracted: Record<string, unknown> | null;
    document_summary: string | null;
  }[];

  // Full (untruncated) field-by-field summary — the old 160-char cap dropped
  // most of a document's extracted data before the LLM ever saw it.
  const describeExtractedJson = (extracted: Record<string, unknown> | null | undefined): string | null => {
    if (!extracted) return null;
    const parts = Object.entries(extracted)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`);
    return parts.length ? parts.join('; ') : null;
  };

  const documentsOnFile = [
    ...uploadedDocs.map(d => ({
      type: uploadedDocTypeLabel(d.doc_type),
      summary: describeExtractedJson(d.extracted_json),
    })),
    ...legacyDocs.map(d => ({
      type: uploadedDocTypeLabel(d.detected_document_type),
      summary: d.document_summary || describeExtractedJson(d.fields_extracted),
    })),
  ];

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

    // Every recorded answer, attributed by person (principal / spouse / child /
    // co-investor) — additive to the curated fields above, which only surface
    // ~25 hand-picked question keys. Anything the client answered under a
    // different key, or that belongs to a family member, was previously
    // invisible to this prompt entirely.
    fullAnswerPool,

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

Produce a JSON object with exactly these sections. Every section must use the client's real data — no placeholders (the sole exception is section6.materialUpdates, which is deliberately an editable checklist the client fills in by hand — see that section's instructions). Write in second person ("you", "your"). Use plain English. Be specific with numbers and facts. If caseTheoryNarrative or caseTheoryNumbersStrategy are present in the case data, ground section2 (strengths) and section5 (investment numbers) in them — they are the CPU's own reasoning about which figures to foreground and which honest narrative wins this case.

Return ONLY valid JSON matching this structure:
{
  "clientName": "${caseContext.principalName}",
  "businessName": "${caseContext.businessName}",
  "generatedDate": "${new Date().toISOString().split('T')[0]}",

  "persona": {
    "title": "Who You Are Walking In As",
    "subtitle": "Read this first — your candidate snapshot",
    "name": "${caseContext.principalName}",
    "roleSummary": "One sentence: who this person is and their role in the business (e.g. 'Owner-operator of a home care franchise, managing daily operations and staffing')",
    "backgroundSummary": "2-3 sentences on relevant professional background and why this candidate is credible in this business, grounded in real case data (qualifications, work history)",
    "caseTheorySummary": "1-2 sentence plain-English statement of the overall case theory — why this case should be approved. Ground this in caseTheoryNarrative if present.",
    "interviewStyleNotes": ["2-4 short, concrete reminders about how this specific candidate should carry themselves — e.g. lead with the operational story not just the numbers, don't over-explain, stay concise on X given past simulator feedback"]
  },

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
    "title": "Officer Concerns and Response Strategy",
    "subtitle": "Every likely area of scrutiny — and exactly what to say",
    "highRisk": [
      {
        "code": "D-XX",
        "name": "...",
        "concern": "The officer's underlying concern in one sentence — why they'd ask about this at all",
        "factsToKnow": ["3-5 short bullet facts this client must have cold to answer this concern — real figures/dates/names from case data"],
        "bestShortAnswer": "A single confident sentence the client can lead with if asked directly (first-person, verbatim-ready)",
        "expandedAnswer": "A complete first-person paragraph (3-5 sentences) the client can give if the officer probes further, grounded in real case data",
        "avoidSaying": "A specific phrase or framing this client should NOT say, and why it invites follow-up scrutiny",
        "risk": "high"
      }
    ],
    "moderateRisk": [
      { "code": "D-XX", "name": "...", "concern": "...", "factsToKnow": ["..."], "bestShortAnswer": "...", "expandedAnswer": "...", "avoidSaying": "...", "risk": "moderate" }
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
    "sourceChronology": ["3-6 short bullet steps, in chronological order, narrating where the money came from and how it moved to the business — one discrete step per bullet (e.g. 'Earned via 12 years at [employer], accumulated in [account type]', 'Transferred $X from [account] to [account] on [date/timeframe]'), not one long paragraph"],
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
    "documentsToCarry": ["One physical document per bullet that this applicant should bring, grounded in documentsOnFile (what's actually been uploaded and extracted) plus what's still missing for their application type and family configuration — short document names, not sentences"],
    "whatMayHaveChanged": ["One specific thing per bullet that commonly changes between filing and interview that the officer may ask about — short and specific, not a paragraph"],
    "materialUpdates": [
      "A short editable checklist of things that may have changed since filing that this client should confirm/update by hand before the interview — e.g. 'Confirm current employee count is still accurate', 'Confirm lease is still active / renewed', 'Confirm bank balance still reflects committed capital'. These are deliberately generic prompts for the client to verify and fill in themselves, not facts you assert as true — write each as a short action item, not a claim."
    ]
  },

  "section7": {
    "title": "Interview Question Bank",
    "subtitle": "Every likely question, categorised — with your personalised answer frameworks",
    "questions": [
      {
        "id": "UQ-01",
        "category": "One of: Opening questions | Role and operations questions | Investment and financial questions | Hiring and growth questions | Credibility and consistency questions | Challenge questions",
        "question": "Tell me about your business.",
        "shortAnswer": "A single confident 1-2 sentence answer the client can lead with, first-person, verbatim-ready",
        "answerFramework": "A complete, first-person drafted answer (3-5 sentences the client could say almost verbatim in the interview) — not an outline of what to cover. Use the client's real business name, figures, and facts from CASE DATA (including fullAnswerPool) throughout.",
        "keyNumbers": ["Any specific figures to cite"],
        "pitfalls": "Common mistakes to avoid on this question"
      }
    ],
    "applicableProbes": [
      {
        "id": "WP-XX",
        "trigger": "Why this probe may be asked",
        "question": "...",
        "answerFramework": "A complete, first-person drafted answer (3-5 sentences the client could say almost verbatim), grounded in this client's real case facts — not a generic outline."
      }
    ]
  },

  "section8": {
    "title": "Interview Conduct Rules",
    "subtitle": "How to carry yourself in the room",
    "rules": ["6-8 short, concrete conduct rules for an E-2 consular interview — answer only what's asked, don't volunteer unprompted weaknesses, keep answers under a minute unless asked to expand, bring only the documents requested, etc. Ground any client-specific ones in past simulator feedback if available."]
  },

  "section9": {
    "title": "Mock Interview Plan",
    "subtitle": "Three rounds to run with a friend or alone out loud before the real thing",
    "rounds": [
      { "name": "Round 1 — Narrative", "focus": "Practice the business and personal story questions until they come out naturally", "sampleQuestions": ["2-3 questions pulled from section7's Opening/Role categories"] },
      { "name": "Round 2 — Numbers", "focus": "Drill every figure until it's automatic, no hesitation", "sampleQuestions": ["2-3 questions pulled from section7's Investment and financial category"] },
      { "name": "Round 3 — Pressure", "focus": "Practice the hardest, most challenging questions this specific case is likely to face", "sampleQuestions": ["2-3 questions pulled from section7's Challenge category or section3's highRisk items"] }
    ]
  },

  "section10": {
    "title": "Final Review Checklist",
    "subtitle": "Run through this the night before",
    "checklist": ["8-12 short, specific checklist items grounded in this client's real case — documents to pack (from documentsOnFile / section6.documentsToCarry), numbers to know cold (from section5), and concerns to be ready for (from section3's highRisk items)"]
  }
}

Important rules:
- Use ONLY data from the CASE DATA object above. Do not invent facts.
- If a data field is null/missing, acknowledge it gracefully ("not yet recorded") rather than fabricating.
- The highRisk and moderateRisk arrays must use only D-codes from the pre-computed lists above.
- Section 7 must cover all 9 universal questions plus any applicable WP probes, each tagged with exactly one of the 6 categories listed in the schema.
- Answer frameworks must reference real case details (business name, investment amount, archetype, etc.).
- persona: this section must come from real case data (principalName, businessName, caseTheoryNarrative, qualifications/background fields) — it is a factual snapshot, not a generic introduction. If caseTheoryNarrative is missing, base caseTheorySummary on the strongest available strengths/facts instead of inventing one.
- section3 (Officer Concerns and Response Strategy): every highRisk/moderateRisk item needs the full 5-field structure (concern/factsToKnow/bestShortAnswer/expandedAnswer/avoidSaying) grounded in this client's real data — do not leave any of the 5 fields generic/boilerplate.
- section6.materialUpdates is the one deliberate exception to "no placeholders" — it's a short action checklist for the client to verify by hand, not a set of asserted facts.
- section9 (Mock Interview Plan): pull its sampleQuestions directly from the actual questions/items you generated in section3 and section7 above — do not invent new questions here.
- CASE-INTELLIGENCE PRIORITY (cpuWeakDimensions / cpuPriorityDirectives): these are the dimensions the case-intelligence reasoning could NOT yet prove and its specific coaching instructions for this client. Lead section 3 (officer concerns) and section 6 (revision focus) with these dimensions, and weave each cpuPriorityDirective's instruction into the relevant answer framework in section 7. These are the highest-leverage things this client must shore up before the interview — do not bury them.
- gapCategoryEnrichments / semanticFieldRatings: this is the same officer-facing narrative and field-level rating (strong/adequate/weak/not_filed) shown on the client's Gap Analysis page for their weakest categories and 3 most-scrutinised fields (revenue projection basis, management activities, source of funds). Ground section 3's concern/factsToKnow/expandedAnswer fields, and the answer frameworks in section 7 for those same topics, in this narrative rather than re-deriving generic advice.
- documentsOnFile: the client's actual uploaded and extracted evidence, with full extracted field detail (not a truncated summary). Use it in section4/section6/section10 to state what's already on file (don't ask them to gather something they've already uploaded) and flag genuinely missing documents. Pull specific figures and facts from it into section5 and section7 answer frameworks wherever it fills in a detail the curated case facts don't cover.
- fullAnswerPool: every answer the client has recorded, grouped by person (Principal applicant / spouse / child / co-investor by name). This is additive to the curated case facts above, which only surface a hand-picked subset of fields — use fullAnswerPool to find real details (figures, names, dates, plans) for section7 answer frameworks and the persona section that the curated fields don't cover, and to correctly attribute family-member-specific facts (e.g. a spouse's occupation) to the right person rather than the principal.
- simulatorTrend: an array of past sessions oldest-to-newest (empty if none). Use it to ground section6's simulatorFeedback in an honest trajectory, not just the latest score, and to inform section8's client-specific conduct rules.
- Return only the JSON object — no markdown fences, no explanation.`;

  // The 240s budget is shared across the whole OpenRouter fallback chain plus
  // the Anthropic fallback (see llm-client.ts's callLLMWithMeta deadline) —
  // glm-5.2 alone has taken 46-114s for this dossier prompt, so a single model
  // attempt can consume most of a shorter budget and starve the rest of the
  // chain. max_tokens is 20000 (up from 16000) because the dossier now has 11
  // sections including a full officer-concerns structure (5 fields per D-code)
  // and 3 new sections (conduct rules, mock interview plan, final checklist)
  // on top of the original 7 — the prior 16000 budget was already observed to
  // hit its ceiling mid-array on the smaller schema.
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
      max_tokens: 20000,
      timeoutMs: 240_000,
    });

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
    console.error(`[prep-kit] LLM call failed (model: ${modelUsed}):`, error);
    return NextResponse.json({ error: 'Failed to generate dossier. Please try again.' }, { status: 500 });
  }

  // Upsert to cache (service client — RLS bypass)
  const serviceClient = createServiceClient();
  const { error: upsertError } = await serviceClient.from('interview_prep_kits').upsert({
    application_id: primaryApp.id,
    user_id: user.id,
    kit_json: kitJson,
    model_used: modelUsed,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'application_id' });

  if (upsertError) {
    console.error('[prep-kit] Failed to cache generated kit:', upsertError);
  }

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
