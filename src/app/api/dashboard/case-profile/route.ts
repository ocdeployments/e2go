import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export interface CaseProfileResponse {
  // Identity
  firstName: string | null;
  middleName: string | null;
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
  applicationTypeRaw: string | null; // 'partnership' | 'spousal_partnership' | 'individual' | null
  dependents: string | null; // 'just_me' | 'spouse_only' | 'spouse_and_children' | 'children_only'
  generatedDocCount: number;

  // Market analysis (QMA-* answers)
  marketScore: number | null;
  marketRating: string | null;
  marketZip: string | null;
  marketState: string | null;
  marketCompetitorCount: number | null;
  marketVerdict: string | null;

  // Case Theory (CIC-1.3 — Case Intelligence Core reasoning, read-only)
  caseTheory: CaseTheoryUI | null;

  // Uploaded documents — extraction transparency for the client
  documents: DocumentExtractionUI[];

  // Spouse / children / co-investors, each with their own completion + documents
  familyMembers: FamilyMemberCaseUI[];

  // Identity / background fields sourced from Module 3 answers (manual entry or document extraction)
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  countryOfCitizenship: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  yearsExperience: string | null;
  priorVisaHistory: string | null;
}

export interface DocumentExtractionUI {
  id: string;
  fileName: string;
  docType: string;
  extractionStatus: 'pending' | 'processing' | 'complete' | 'failed';
  fieldsTotal: number;
  createdAt: string;
}

export interface FamilyMemberCaseUI {
  id: string;
  memberType: 'co_investor' | 'spouse' | 'child';
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  // Filled-in count among the 5 base fields captured directly on family_members
  // (first_name, last_name, date_of_birth, nationality, passport_number).
  answeredCount: number;
  totalExpectedCount: number;
  // Additional fields routed to this person via document extraction (answers.family_member_id).
  extractedAnswerCount: number;
  documents: DocumentExtractionUI[];
}

export interface CaseTheoryUI {
  narrative: string;
  transferableSkills: { skill: string; evidence: string; framing: string }[];
  numbersStrategy: { figure: string; value: string; foregroundBecause: string; denialRiskAddressed: string }[];
  dimensionVerdicts: Record<string, {
    status: 'proven' | 'weak' | 'missing' | 'contradicted';
    evidenceSummary: string;
    gap: string | null;
    gapFillSuggestions: { persona: string; suggestion: string }[];
  }>;
  directives: { engine: string; dimension: string; instruction: string; doctrineRef: string | null }[];
  doctrineCitations: { kbChunkId: string; sourceFile: string; dimension: string | null }[];
  builtAt: string | null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const requestedAppId = new URL(request.url).searchParams.get('applicationId');

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
    familyMembersResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, middle_name, last_name')
      .eq('id', userId)
      .single(),

    supabase
      .from('quiz_sessions')
      .select('outcome, application_type, result_json, completed_at')
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
      .select('id, payment_status')
      .eq('user_id', userId)
      .neq('source', 'simulator_standalone')
      .order('created_at', { ascending: false }),

    supabase
      .from('family_members')
      .select('id, member_type, first_name, last_name, date_of_birth, nationality, passport_number')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const profile = profileResult.data as { first_name: string | null; middle_name: string | null; last_name: string | null } | null;
  const quiz = quizResult.data as { outcome: string | null; application_type: string | null; result_json: Record<string, unknown> | null; completed_at: string | null } | null;
  const cp = caseProfileResult.data;
  const lc = lifecycleResult.data;
  const fddCount = fddCountResult.count ?? 0;
  const latestFdd = fddLatestResult.data;
  const sim = simResult.data;
  const prepKit = prepKitResult.data;
  // N3 FIX: Honor the applicationId param when provided. Fall back to
  // paid-first selection to preserve backwards-compat with callers that omit it.
  const allApps = (appResult.data ?? []) as { id: string; payment_status: string }[];
  const app = (requestedAppId ? allApps.find(a => a.id === requestedAppId) : null)
    ?? allApps.find(a => a.payment_status === 'paid')
    ?? allApps[0]
    ?? null;

  const quizResultJson = quiz?.result_json ?? null;
  const quizAnswers = (quizResultJson?.answers as Record<string, string> | null) ?? null;
  const quizDependents = (quizResultJson?.dependents as string | null) ?? null;

  // Fetch market analysis answers if the user has an application
  let marketScore: number | null = null;
  let marketRating: string | null = null;
  let marketZip: string | null = null;
  let marketState: string | null = null;
  let marketCompetitorCount: number | null = null;
  let marketVerdict: string | null = null;
  let caseTheory: CaseTheoryUI | null = null;
  let documents: DocumentExtractionUI[] = [];
  let dateOfBirth: string | null = null;
  let placeOfBirth: string | null = null;
  let countryOfCitizenship: string | null = null;
  let passportNumber: string | null = null;
  let passportExpiry: string | null = null;
  let educationLevel: string | null = null;
  let fieldOfStudy: string | null = null;
  let yearsExperience: string | null = null;
  let priorVisaHistory: string | null = null;

  const familyMembersRaw = (familyMembersResult.data ?? []) as {
    id: string;
    member_type: 'co_investor' | 'spouse' | 'child';
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    nationality: string | null;
    passport_number: string | null;
  }[];

  let familyMembers: FamilyMemberCaseUI[] = familyMembersRaw.map(m => ({
    id:                    m.id,
    memberType:            m.member_type,
    firstName:             m.first_name,
    lastName:              m.last_name,
    dateOfBirth:           m.date_of_birth,
    nationality:           m.nationality,
    passportNumber:        m.passport_number,
    answeredCount:         [m.first_name, m.last_name, m.date_of_birth, m.nationality, m.passport_number].filter(Boolean).length,
    totalExpectedCount:    5,
    extractedAnswerCount:  0,
    documents:             [],
  }));

  if (app?.id) {
    const [{ data: qmaRows }, { data: identityRows }, { data: theoryRow }, { data: docRows }, { data: memberAnswerRows }, { data: memberDocRows }] = await Promise.all([
      supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', app.id)
        .in('question_key', ['QMA-SCORE', 'QMA-RATING', 'QMA-ZIP', 'QMA-STATE', 'QMA-COMPETITOR-COUNT', 'QMA-VERDICT']),
      supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', app.id)
        .in('question_key', ['M3-A-03', 'M3-A-04', 'M3-A-05', 'M3-A-PASSPORT', 'M3-A-PASSPORT-EXP', 'M3-Q-01', 'M3-Q-02A', 'M3-Q-05', 'M3-A-21']),
      supabase
        .from('case_theory')
        .select('narrative, transferable_skills, numbers_strategy, dimension_verdicts, directives, doctrine_citations, built_at')
        .eq('application_id', app.id)
        .maybeSingle(),
      supabase
        .from('uploaded_documents')
        .select('id, file_name, doc_type, extraction_status, fields_total, created_at')
        .eq('application_id', app.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('answers')
        .select('family_member_id')
        .eq('application_id', app.id)
        .not('family_member_id', 'is', null),
      supabase
        .from('uploaded_documents')
        .select('id, file_name, doc_type, extraction_status, fields_total, created_at, owner_family_member_id')
        .eq('application_id', app.id)
        .not('owner_family_member_id', 'is', null)
        .order('created_at', { ascending: false }),
    ]);

    documents = (docRows ?? []).map(d => ({
      id: d.id,
      fileName: d.file_name,
      docType: d.doc_type,
      extractionStatus: d.extraction_status,
      fieldsTotal: d.fields_total ?? 0,
      createdAt: d.created_at,
    }));

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

    if (identityRows?.length) {
      const idv: Record<string, string> = Object.fromEntries(
        identityRows.map(r => [r.question_key, r.answer_value ?? ''])
      );
      dateOfBirth          = idv['M3-A-03']            || null;
      placeOfBirth         = idv['M3-A-04']            || null;
      countryOfCitizenship = idv['M3-A-05']            || null;
      passportNumber       = idv['M3-A-PASSPORT']      || null;
      passportExpiry       = idv['M3-A-PASSPORT-EXP']  || null;
      educationLevel       = idv['M3-Q-01']            || null;
      fieldOfStudy         = idv['M3-Q-02A']           || null;
      yearsExperience      = idv['M3-Q-05']            || null;
      priorVisaHistory     = idv['M3-A-21']            || null;
    }

    const extractedCountByMember = new Map<string, number>();
    for (const row of memberAnswerRows ?? []) {
      const key = row.family_member_id as string;
      extractedCountByMember.set(key, (extractedCountByMember.get(key) ?? 0) + 1);
    }

    const documentsByMember = new Map<string, DocumentExtractionUI[]>();
    for (const d of memberDocRows ?? []) {
      const key = d.owner_family_member_id as string;
      const doc: DocumentExtractionUI = {
        id:               d.id,
        fileName:         d.file_name,
        docType:          d.doc_type,
        extractionStatus: d.extraction_status,
        fieldsTotal:      d.fields_total ?? 0,
        createdAt:        d.created_at,
      };
      documentsByMember.set(key, [...(documentsByMember.get(key) ?? []), doc]);
    }

    familyMembers = familyMembers.map(m => ({
      ...m,
      extractedAnswerCount: extractedCountByMember.get(m.id) ?? 0,
      documents:            documentsByMember.get(m.id) ?? [],
    }));

    if (theoryRow?.narrative) {
      caseTheory = {
        narrative: theoryRow.narrative,
        transferableSkills: theoryRow.transferable_skills ?? [],
        numbersStrategy: theoryRow.numbers_strategy ?? [],
        dimensionVerdicts: theoryRow.dimension_verdicts ?? {},
        directives: theoryRow.directives ?? [],
        doctrineCitations: theoryRow.doctrine_citations ?? [],
        builtAt: theoryRow.built_at ?? null,
      };
    }
  }

  // user_metadata is set at signup (first_name, last_name in signUp options.data)
  // and is always available regardless of RLS or profiles row state.
  const metaFirst = (user.user_metadata?.first_name as string | null) ?? null;
  const metaLast  = (user.user_metadata?.last_name  as string | null) ?? null;

  const response: CaseProfileResponse = {
    firstName:  profile?.first_name  ?? metaFirst,
    middleName: profile?.middle_name ?? null,
    lastName:   profile?.last_name   ?? metaLast,
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

    quizAnswers:        quizAnswers,
    applicationTypeRaw: quiz?.application_type ?? null,
    dependents:         quizDependents,
    generatedDocCount:  0, // wired in Module 5

    marketScore,
    marketRating,
    marketZip,
    marketState,
    marketCompetitorCount,
    marketVerdict,

    caseTheory,
    documents,
    familyMembers,

    dateOfBirth,
    placeOfBirth,
    countryOfCitizenship,
    passportNumber,
    passportExpiry,
    educationLevel,
    fieldOfStudy,
    yearsExperience,
    priorVisaHistory,
  };

  return NextResponse.json(response);
}
