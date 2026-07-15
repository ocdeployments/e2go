// Interview Simulator Engine
// The brain of the interview simulator
// Generated: June 5, 2026

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { getQuestionKnowledge } from '@/lib/interview-knowledge-base';
import type {
  SimulatorContext,
  Question,
  CoachingSummary,
  QuestionBreakdownItem,
  CompletedSession,
  InvestmentSource,
  FundFlowEvent,
} from '@/types/simulator';

export { analyzeDelivery } from '@/lib/delivery-analysis';

// Use the shared browser singleton — avoids creating a second GoTrueClient
// that would cause "Multiple GoTrueClient instances detected" warnings and
// hung auth-token refreshes when two clients race on the same storage key.
const supabase = createBrowserSupabaseClient();

// =============================================================================
// HELPERS
// =============================================================================

function deriveImmigrantIntentRisk(
  priorVisaDenial: boolean,
  answersMap: Map<string, string>
): 'low' | 'moderate' | 'high' {
  if (priorVisaDenial) return 'high';

  // Q0-09 is the visa history multiselect — entry refusals are a direct intent signal
  const history = (answersMap.get('Q0-09') || '').toLowerCase();
  if (history.includes('refused') || history.includes('denial') || history.includes('refusal')) {
    return 'high';
  }

  // Q0-10 is home ties — no ties on file means the officer will probe intent hard
  const ties = answersMap.get('Q0-10') || '';
  if (!ties || ties === '[]' || ties.toLowerCase().includes('none')) {
    return 'moderate';
  }

  return 'low';
}

// =============================================================================
// CONTEXT BUILDING
// =============================================================================

/**
 * Builds a rich context object for the simulator from the user's application data.
 * This context is used to generate personalized questions.
 */
export async function buildSimulatorContext(applicationId: string): Promise<SimulatorContext> {
  // Fetch application record
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (appError || !application) {
    throw new Error(`Application not found: ${appError?.message}`);
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', application.user_id)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found: ${profileError?.message}`);
  }

  // Fetch all Module 3 answers for this application
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId) as { data: { question_key: string; answer_value: string }[] | null; error: { message: string } | null };

  if (answersError) {
    throw new Error(`Answers fetch error: ${answersError.message}`);
  }

  // Convert answers array to map for easy lookup
  const answersMap = new Map<string, string>();
  answers?.forEach((a) => {
    answersMap.set(a.question_key, a.answer_value);
  });

  // Fetch analysis engine output (case_briefs)
  const { data: caseBrief } = await supabase
    .from('case_briefs')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch case profile for archetype + EU-1 dimension scores (non-blocking)
  const { data: caseProfile } = await supabase
    .from('case_profiles')
    .select('archetype, source_of_funds_score, management_role_score, business_plan_score')
    .eq('user_id', application.user_id)
    .maybeSingle();

  // Fetch Case Intelligence Core's case theory — the CPU's narrative + numbers
  // strategy (non-blocking; null until the CPU has built a theory for this case)
  const { data: caseTheory } = await supabase
    .from('case_theory')
    .select('narrative, numbers_strategy')
    .eq('application_id', applicationId)
    .maybeSingle();

  // Fetch investment sources from Tab F
  const investmentSources: InvestmentSource[] = [];
  const fundFlowEvents: FundFlowEvent[] = [];

  // Parse investment-related answers
  const investmentAmount = parseAmount(answersMap.get('QF-02') || answersMap.get('M3-F-02') || '0');
  const revenueYear1 = parseAmount(answersMap.get('QI-05') || answersMap.get('M3-I-05') || '0');
  const revenueYear3 = parseAmount(answersMap.get('QI-06') || answersMap.get('M3-I-06') || '0');
  const householdIncomeNeed = parseAmount(answersMap.get('QI-07') || answersMap.get('M3-I-07') || '0');

  // Employee counts
  const employeeCountCurrent = parseInt(answersMap.get('QI-02') || answersMap.get('M3-I-02') || '0') || 0;
  const employeeCountYear1 = parseInt(answersMap.get('QI-03') || answersMap.get('M3-I-03') || '0') || 0;

  // Prior denial check
  const priorVisaDenial = answersMap.get('QA-23')?.toLowerCase().includes('yes') ||
    answersMap.get('M3-A-23')?.toLowerCase().includes('yes') ||
    false;

  // Business category
  const businessCategory = application.business_category ||
    answersMap.get('M2-CATEGORY') ||
    'general';

  // FDD priority questions — fetched for franchise applicants only (non-blocking)
  let fddPriorityQuestions: { text: string; triggered_by: string; importance: string }[] = [];
  const businessRoute = application.business_route || answersMap.get('M2-ROUTE') || 'new';
  const isFranchiseApplicant =
    businessRoute === 'franchise' ||
    (businessCategory || '').toLowerCase().includes('franchise');

  if (isFranchiseApplicant) {
    try {
      const { data: fddAnalysis } = await supabase
        .from('fdd_analyses')
        .select('questions')
        .eq('user_id', application.user_id)
        .not('questions', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fddAnalysis?.questions) {
        const stored = fddAnalysis.questions as {
          priority_questions?: { text: string; triggered_by: string; importance: string; ask_of?: string }[];
        };
        fddPriorityQuestions = (stored.priority_questions || [])
          .filter(q => (q.importance === 'critical' || q.importance === 'important') && q.ask_of !== 'attorney')
          .slice(0, 3);
      }
    } catch {
      // Non-blocking — simulator proceeds without FDD questions if fetch fails
    }
  }

  return {
    applicationId,
    userId: application.user_id,
    businessName: application.business_name ||
      answersMap.get('QA-51') ||
      answersMap.get('M3-A-51') ||
      'My Business',
    operatingName: answersMap.get('QF-09') || answersMap.get('M3-F-09') || null,
    businessCategory,
    businessRoute,
    targetState: application.target_state ||
      answersMap.get('QE-03') ||
      answersMap.get('M3-E-03') ||
      null,
    operationalStatus: (application.operational_status as 'operational' | 'pre_start' | 'not_yet_formed') ||
      'pre_start',
    investmentAmount,
    investmentSources,
    fundFlowEvents,
    revenueYear1,
    revenueYear3,
    householdIncomeNeed,
    employeeCountCurrent,
    employeeCountYear1,
    employeeRoles: [],
    investorRole: answersMap.get('QA-08') || answersMap.get('M3-A-08') || 'Owner',
    managementActivities: [],
    priorVisaDenial,
    priorDenialDetails: priorVisaDenial ?
      (answersMap.get('QA-24') || answersMap.get('M3-A-24') || null) : null,
    immigrantIntentRisk: deriveImmigrantIntentRisk(priorVisaDenial, answersMap),
    substantialityScore: caseBrief?.substantiality_score ?? null,
    marginalityScore: caseBrief?.marginality_score ?? null,
    developDirectScore: caseBrief?.develop_direct_score ?? null,
    denialRiskFlags: caseBrief?.risk_flags || [],
    archetype: caseProfile?.archetype ?? null,
    sourceOfFundsScore: caseProfile?.source_of_funds_score ?? null,
    managementRoleScore: caseProfile?.management_role_score ?? null,
    businessPlanScore: caseProfile?.business_plan_score ?? null,
    applicationType: application.application_type || 'solo',
    createdAt: application.created_at,
    p2Role: answersMap.get('P2-ROLE') || null,
    p2Sof: answersMap.get('P2-SOF') || null,
    p2Quals: answersMap.get('P2-QUALS') || null,
    fddPriorityQuestions: fddPriorityQuestions.length > 0 ? fddPriorityQuestions : undefined,
    caseTheoryNarrative: caseTheory?.narrative ?? null,
    caseTheoryNumbersStrategy: caseTheory?.numbers_strategy ?? null,
  };
}

// =============================================================================
// QUESTION GENERATION
// =============================================================================

// Officer-style reframes for known FDD flag keys.
// FDD questions are directed at franchisors; these reframe them as what a
// consular officer would probe in an E-2 interview.
const FDD_OFFICER_QUESTION_MAP: Record<string, string> = {
  entity_transfer:      'Have you verified that your franchise agreement permits ownership through the entity structure required for your E-2 visa — not as an individual?',
  litigation:           'Were there litigation disclosures in the Franchise Disclosure Document? How did that affect your decision to invest in this system?',
  bankruptcy:           'The franchisor\'s history includes a bankruptcy. What additional due diligence did you conduct to confirm the system is financially sound today?',
  fdd_stale:            'Is the Franchise Disclosure Document you reviewed the most current annual disclosure? When was it issued and what did you verify?',
  state_registration:   'Has this franchise been registered and approved for sale in your target state? What did you confirm before committing your funds?',
  working_capital:      'How have you planned for operating cash flow during the ramp-up period before the business reaches profitability — beyond the Item 7 estimates?',
  fee_escalation:       'Walk me through all the ongoing fees — royalties, marketing fund, technology fees — and how you factored each of them into your financial projections.',
  revenue_variability:  'Financial performance varies significantly across franchise units in this system. What specific research did you do to understand why top performers outperform the median?',
  renewal_terms:        'What are the renewal terms of your franchise agreement, and are you aware those terms may change materially at renewal?',
  noncompete:           'Are you aware of the post-termination non-compete obligations in your franchise agreement and how that affects your plans if you exit?',
  rofr:                 'If you decide to sell this business in the future, what rights does the franchisor hold over that sale, and how does that affect your exit planning?',
  cherry_pick:          'When you reviewed the financial performance data in the FDD, how did you assess which units were included versus excluded, and what that means for your projections?',
  company_only_i19:     'The FDD financial data covers company-owned units only. How did you validate that a franchisee-operated unit would achieve comparable results?',
  covid_data:           'The financial performance data in this FDD comes from the pandemic period. How did you adjust your projections to reflect current market conditions?',
  cure_period:          'Are you aware of the circumstances under which the franchisor can terminate your agreement, and what protections you have if a dispute arises?',
  ecommerce_carveout:   'Your franchise territory has an e-commerce carve-out. How did you assess whether online sales by the franchisor would compete with your local revenues?',
};

function reframeAsFranchiseOfficerQuestion(
  fq: { text: string; triggered_by: string; importance: string },
): string {
  const key = fq.triggered_by.replace(/^flag:|^gap:/, '').trim();
  if (FDD_OFFICER_QUESTION_MAP[key]) return FDD_OFFICER_QUESTION_MAP[key];
  const label = key.replace(/_/g, ' ');
  return pick([
    `During your FDD review, what did you discover about ${label} and how did you address it before committing your investment?`,
    `Your Franchise Disclosure Document raised a concern regarding ${label}. Walk me through how you evaluated that before signing.`,
    `How thoroughly did you investigate the franchise system's ${label} before making your investment decision?`,
  ]);
}

// Phrasings used in the previous session for this application — pick() avoids
// them so repeat sessions don't serve identical wording. Set per generateQuestions call.
let _avoidTexts: Set<string> = new Set();

function pick<T>(arr: T[]): T {
  const fresh = arr.filter(x => typeof x !== 'string' || !_avoidTexts.has(x as unknown as string));
  const pool = fresh.length > 0 ? fresh : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prefer pool entries whose text wasn't asked last session; top up from the rest if short.
function sampleFresh(pool: Question[], n: number): Question[] {
  const fresh = pool.filter(q => !_avoidTexts.has(q.text));
  const stale = pool.filter(q => _avoidTexts.has(q.text));
  return [...shuffle(fresh), ...shuffle(stale)].slice(0, n);
}

function questionHistoryKey(applicationId: string): string {
  return `e2go-sim-last-questions-${applicationId}`;
}

/**
 * Substantive coach hint: what the officer is testing + what a strong answer covers.
 * Uses the interview knowledge base where the question ID is mapped; falls back to
 * category-level guidance otherwise.
 */
function buildCoachHint(q: Question): string {
  const kb = getQuestionKnowledge(q.id);
  if (kb) {
    const principles = kb.keyPrinciples.slice(0, 4).map(p => `• ${p}`).join('\n');
    return `The officer is testing: ${kb.officerTests}\n\nA strong answer covers:\n${principles}`;
  }
  switch (q.category) {
    case 'gap_probe':
      return 'This probes a documented weak spot in your file. Answer with specifics — exact figures, dates, account names, and where the evidence sits in your package. A vague answer here confirms the officer\'s concern.';
    case 'archetype_probe':
      return 'The officer is testing whether your background genuinely fits this business. Connect your specific experience to concrete operating decisions you make — avoid generic claims anyone could recite.';
    case 'fdd_probe':
      return 'This question comes from your own Franchise Disclosure Document. Show you read and understood it: name the FDD item, state what it disclosed, and describe the specific due-diligence step you took before committing funds.';
    case 'business_type':
      return 'This is an industry-operations check. Prove operational fluency: name the licenses, suppliers, hires, or contracts involved — with numbers and dates, not plans in the abstract.';
    case 'weak_point_probe':
      return 'This is an adversarial probe. Answer it head-on: lead with your strongest fact, then support it with a specific number, date, or document reference from your filed package.';
    default:
      return 'Answer in 30–60 seconds with specifics: exact figures, names, dates, and one concrete example. Officers score specificity and consistency with your filed documents.';
  }
}

/**
 * Generates 10-12 personalized questions based on the simulator context.
 * Variety across sessions comes from three mechanisms:
 * 1. Phrasing memory — the previous session's exact wordings (localStorage,
 *    keyed by application) are avoided when picking from each phrasing pool.
 * 2. Topic rotation — one non-core universal topic is dropped at random each
 *    session, freeing a slot for probes/archetype/business-type questions.
 * 3. Order shuffle — everything after the opening question is shuffled, so
 *    probes interleave with universals instead of repeating a fixed skeleton.
 */
export function generateQuestions(context: SimulatorContext): Question[] {
  const questions: Question[] = [];

  // Load the previous session's phrasings so pick()/sampleFresh() avoid them
  _avoidTexts = new Set();
  if (typeof window !== 'undefined') {
    try {
      const prev = JSON.parse(localStorage.getItem(questionHistoryKey(context.applicationId)) || '[]');
      if (Array.isArray(prev)) _avoidTexts = new Set(prev.filter((t): t is string => typeof t === 'string'));
    } catch { /* fresh start */ }
  }

  const businessCtx = context.targetState
    ? `${context.businessName} in ${context.targetState}`
    : context.businessName;

  // === UNIVERSAL QUESTIONS — pool of alternatives per topic ===
  // Each session randomly picks one phrasing per topic.

  questions.push({
    id: 'UQ-01',
    category: 'universal',
    context: businessCtx,
    text: pick([
      'Tell me about your business.',
      'Describe your business to me in your own words.',
      'Give me an overview of what this company does.',
      'What does your business actually do?',
    ]),
  });

  questions.push({
    id: 'UQ-02',
    category: 'universal',
    text: pick([
      'What is your role in the business?',
      'What will you be doing on a day-to-day basis?',
      'How are you involved in the management of this business?',
      'Describe your responsibilities as the investor-operator.',
    ]),
  });

  questions.push({
    id: 'UQ-03',
    category: 'universal',
    context: `Your investment: $${context.investmentAmount.toLocaleString()}`,
    text: pick([
      'How much have you invested and in what form?',
      `Walk me through your $${context.investmentAmount.toLocaleString()} investment — what form did it take?`,
      'What is the total amount committed to this business, and how was it deployed?',
      'Describe the nature and form of your investment in this business.',
    ]),
  });

  questions.push({
    id: 'UQ-04',
    category: 'universal',
    text: pick([
      'Where did your investment funds come from?',
      'How did you accumulate the funds to make this investment?',
      'Walk me through the source of your investment capital.',
      'Explain the origin of the money you invested in this business.',
    ]),
  });

  questions.push({
    id: 'UQ-05',
    category: 'universal',
    context: context.revenueYear1 > 0 ? `Year 1 projection: $${context.revenueYear1.toLocaleString()}` : undefined,
    text: pick([
      'How will this business support you financially?',
      'What income do you expect to draw from this business?',
      'At what point will the business generate enough revenue to support your household?',
      'How do you plan to compensate yourself from this business?',
    ]),
  });

  questions.push({
    id: 'UQ-06',
    category: 'universal',
    context: `Current: ${context.employeeCountCurrent}, Year 1 plan: ${context.employeeCountYear1}`,
    text: pick([
      'How many people will you employ?',
      'What is your hiring plan for this business?',
      'Describe the jobs you will create for U.S. workers.',
      'Tell me about your staffing plans — who have you hired or plan to hire?',
    ]),
  });

  questions.push({
    id: 'UQ-07',
    category: 'universal',
    text: pick([
      'What experience do you have to run this business?',
      'What qualifications do you bring to this venture?',
      'Why are you the right person to operate this particular business?',
      'Tell me about your professional background and how it relates to this business.',
    ]),
  });

  questions.push({
    id: 'UQ-08',
    category: 'universal',
    text: pick([
      'What are your plans if your visa is not approved?',
      'What will you do if this E-2 application is denied?',
      'Do you have a contingency plan if you cannot operate this business from the United States?',
      'If your visa is not approved, what happens to this business?',
    ]),
  });

  questions.push({
    id: 'UQ-09',
    category: 'universal',
    text: pick([
      'Do you intend to remain in the U.S. permanently?',
      'Is it your intention to remain in the United States indefinitely?',
      'Do you understand that the E-2 requires you to maintain non-immigrant intent?',
      'Do you have plans to apply for a green card or permanent residence?',
    ]),
  });

  // === WEAK POINT PROBE QUESTIONS — flagged by the analysis engine ===

  if (context.substantialityScore !== null && context.substantialityScore < 70) {
    questions.push({
      id: 'WP-01',
      category: 'weak_point_probe',
      context: `Substantiality score: ${context.substantialityScore}/100`,
      relatesToField: 'investment_allocation',
      text: pick([
        `Walk me through exactly how your $${context.investmentAmount.toLocaleString()} investment was allocated across the business.`,
        `Your investment is $${context.investmentAmount.toLocaleString()}. Break that down for me — where did every dollar go?`,
        `Give me a line-by-line account of how you deployed your $${context.investmentAmount.toLocaleString()} investment.`,
      ]),
    });
  }

  if (context.marginalityScore !== null && context.marginalityScore < 70) {
    questions.push({
      id: 'WP-02',
      category: 'weak_point_probe',
      context: `Marginality score: ${context.marginalityScore}/100`,
      relatesToField: 'marginality',
      text: pick([
        `Your business projects $${context.revenueYear1.toLocaleString()} in Year 1. How does this compare to what you need to support your household?`,
        `Will this business generate enough income for you to live on? Walk me through the numbers.`,
        `At $${context.revenueYear1.toLocaleString()} projected Year 1 revenue, how do you plan to pay your personal living expenses?`,
      ]),
    });
  }

  if (context.developDirectScore !== null && context.developDirectScore < 70) {
    questions.push({
      id: 'WP-03',
      category: 'weak_point_probe',
      context: `Develop & Direct score: ${context.developDirectScore}/100`,
      relatesToField: 'management',
      text: pick([
        'Describe your day-to-day management activities. Who reports to you and how do you direct their work?',
        'How do you actively develop and direct this enterprise on a daily basis?',
        'Give me a specific example of a management decision you make in this business on a typical week.',
      ]),
    });
  }

  if (context.priorVisaDenial) {
    questions.push({
      id: 'WP-04',
      category: 'weak_point_probe',
      context: 'Prior denial on record',
      relatesToField: 'prior_denial',
      text: pick([
        'You were previously refused a U.S. visa. Can you explain what has changed since then?',
        'Your record shows a prior visa refusal. What is different about your situation today?',
        'Tell me about your prior visa denial and why this application should be viewed differently.',
      ]),
    });
  }

  // Flag: immigrant intent risk
  if (context.immigrantIntentRisk === 'high' || context.immigrantIntentRisk === 'moderate') {
    questions.push({
      id: 'WP-05',
      category: 'weak_point_probe',
      context: `Intent risk: ${context.immigrantIntentRisk}`,
      relatesToField: 'immigrant_intent',
      text: pick([
        'What ties do you maintain to your home country?',
        'Tell me about your family, property, and other connections to your country of residence.',
        'What is keeping you connected to your home country during your time in the United States?',
      ]),
    });
  }

  // === GAP PROBES — dimension scores from EU-1 case profile (threshold: <60) ===
  // These fire when the scoring engine found a specific weakness and we have a score.
  // Scores of 0 with no data are treated as "no score yet" and skipped.

  if (context.sourceOfFundsScore !== null && context.sourceOfFundsScore > 0 && context.sourceOfFundsScore < 60) {
    questions.push({
      id: 'GP-01',
      category: 'gap_probe',
      context: `Source of funds score: ${context.sourceOfFundsScore}/100`,
      relatesToField: 'source_of_funds',
      text: pick([
        'Walk me through the complete paper trail of your investment — every account, every transfer, from origin to this business.',
        'Your source of funds documentation needs to trace the full history of this capital. Where did this money originate, and how did it reach the business?',
        `You invested $${context.investmentAmount.toLocaleString()}. Trace that money backward for me — where was it before it entered the business account?`,
      ]),
    });
  }

  if (context.managementRoleScore !== null && context.managementRoleScore > 0 && context.managementRoleScore < 60) {
    questions.push({
      id: 'GP-02',
      category: 'gap_probe',
      context: `Management role score: ${context.managementRoleScore}/100`,
      relatesToField: 'management_role',
      text: pick([
        'Describe a specific management decision you would make on a typical Tuesday morning in this business.',
        'How many hours per week will you personally devote to running this business, and what does that time look like?',
        'Who reports to you, and what decisions require your direct approval before they can be made?',
      ]),
    });
  }

  if (context.businessPlanScore !== null && context.businessPlanScore > 0 && context.businessPlanScore < 60) {
    questions.push({
      id: 'GP-03',
      category: 'gap_probe',
      context: `Business plan score: ${context.businessPlanScore}/100`,
      relatesToField: 'business_plan',
      text: pick([
        context.revenueYear1 > 0
          ? `Your business plan projects $${context.revenueYear1.toLocaleString()} in Year 1. Walk me through the specific assumptions that support that number.`
          : 'Walk me through the financial assumptions in your business plan — how did you arrive at your revenue projections?',
        'What market research did you conduct to validate demand for this business in this location?',
        'What specific milestones has your business plan set for the first 6, 12, and 24 months of operation?',
      ]),
    });
  }

  // === PARTNERSHIP PROBES — each investor stands alone (spec §5.1.2/§5.1.3):
  // a partnership case is only as strong as its least-documented partner, so
  // these fire independently of the P1-only scores above.
  if (context.applicationType === 'partnership') {
    if (!context.p2Role || context.p2Role.trim().length < 5) {
      questions.push({
        id: 'GP-04',
        category: 'gap_probe',
        context: 'Investor 2 role/qualifications not on file',
        relatesToField: 'management_role',
        text: pick([
          "Since neither of you holds majority control, you each need to independently show you develop and direct this enterprise. What specifically does your co-investor do that's distinct from your role?",
          "Walk me through how you and your co-investor divide management responsibility — where does your authority end and theirs begin?",
        ]),
      });
    }
    if (!context.p2Sof || context.p2Sof.trim().length < 5) {
      questions.push({
        id: 'GP-05',
        category: 'gap_probe',
        context: 'Investor 2 source of funds not on file',
        relatesToField: 'source_of_funds',
        text: pick([
          "Your source of funds trail is on file, but this is a two-investor case. Can you speak to where your co-investor's share of the capital came from?",
          "Each investor's funds need an independent paper trail in a partnership case. What do you know about how your co-investor's contribution was sourced?",
        ]),
      });
    }
  }

  // === TOPIC ROTATION — drop one non-core universal at random each session ===
  // Core topics (business, investment, source of funds, intent) always stay.
  const rotatable = ['UQ-02', 'UQ-05', 'UQ-06', 'UQ-07', 'UQ-08'];
  const dropId = rotatable[Math.floor(Math.random() * rotatable.length)];
  const dropIdx = questions.findIndex(q => q.id === dropId);
  if (dropIdx !== -1) questions.splice(dropIdx, 1);

  // === ARCHETYPE QUESTIONS — 2 picked from archetype-specific pool ===
  const archetypePool = getArchetypeQuestions(context.archetype, context);
  const archetypeSelected = sampleFresh(archetypePool, 2);
  archetypeSelected.forEach((q, i) => {
    questions.push({ ...q, id: `AQ-0${i + 1}` });
  });

  // === FDD PROBE QUESTIONS — franchise applicants with completed FDD analysis ===
  // These replace generic BT questions with questions grounded in actual FDD findings.
  const fddProbes: Question[] = [];
  if (context.fddPriorityQuestions && context.fddPriorityQuestions.length > 0) {
    context.fddPriorityQuestions.slice(0, 3).forEach((fq, i) => {
      const label = fq.triggered_by.replace(/^flag:|^gap:/, '').replace(/_/g, ' ').trim();
      fddProbes.push({
        id: `FD-0${i + 1}`,
        category: 'fdd_probe',
        context: `FDD finding: ${label}`,
        text: reframeAsFranchiseOfficerQuestion(fq),
      });
    });
  }

  // === BUSINESS TYPE QUESTIONS — fill remaining slots when fewer than 2 FDD probes ===
  const btSlotsNeeded = Math.max(0, 2 - fddProbes.length);
  const businessTypePool = getBusinessTypeQuestions(context.businessCategory, context);
  const selected = sampleFresh(businessTypePool, btSlotsNeeded);
  selected.forEach((q, i) => {
    questions.push({ ...q, id: `BT-0${i + 1}` });
  });
  fddProbes.forEach(q => questions.push(q));

  // === ADAPTIVE ESCALATION — for strong profiles with few probing questions ===
  // When profile scores are healthy (few weak-point or gap probes triggered),
  // a prepared applicant would face harder, more adversarial officer questions.
  const probeCount = questions.filter(
    q => q.category === 'weak_point_probe' || q.category === 'gap_probe'
  ).length;

  if (probeCount < 2 && questions.length < 11) {
    const escalationPool = getEscalationQuestions(context);
    const escalation = sampleFresh(escalationPool, 2);
    escalation.forEach((q, i) => {
      questions.push({ ...q, id: `ESC-0${i + 1}` });
    });
  }

  // === FINAL ASSEMBLY — shuffle order (opener stays first), attach coach hints ===
  const capped = questions.slice(0, 12);
  const ordered = [capped[0], ...shuffle(capped.slice(1))];
  const final = ordered.map(q => ({ ...q, hint: q.hint ?? buildCoachHint(q) }));

  // Persist this session's phrasings so the next session avoids repeating them
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(questionHistoryKey(context.applicationId), JSON.stringify(final.map(q => q.text)));
    } catch { /* storage unavailable — variety still works via random pools */ }
  }

  return final;
}

/**
 * Escalation questions — adversarial probes used when a profile has few weak points.
 * These simulate the harder questions a skeptical officer asks of a well-prepared applicant.
 */
function getEscalationQuestions(context: SimulatorContext): Question[] {
  const inv = context.investmentAmount > 0 ? `$${context.investmentAmount.toLocaleString()}` : 'your investment';
  const biz = context.businessName;
  const esc = (text: string): Question => ({ id: 'ESC-X', text, category: 'weak_point_probe' as const });

  const pool: Question[] = [
    esc(`Why do you need to be physically present in the United States to run ${biz}? Could this business be operated remotely from abroad?`),
    esc(`If your E-2 is approved and the business underperforms its projections — say, 40% below Year 1 targets — what specifically would you do?`),
    esc(`${inv} in a single enterprise is a substantial commitment. What due diligence did you do before committing this amount, and what validated your confidence?`),
    esc('How are you different from a passive investor who merely owns a share of a business? Give me a specific, concrete example of a management decision you made in the last month.'),
    esc('What is your plan when your E-2 status expires? Walk me through exactly how you intend to maintain legal status long-term.'),
    esc(`You are entering a competitive market. Name your two or three closest competitors and explain why your customers would choose ${biz} over them.`),
    esc('If the business had to cease operations tomorrow, what would happen to the investment funds already committed? Have they been fully deployed?'),
    esc('What specific commitment have you made to your home country that guarantees you will return when the visa expires or is revoked?'),
  ];

  // Filter out questions that overlap with already-triggered probes
  const skipIfDenial = context.priorVisaDenial;
  const skipIfIntentRisk = context.immigrantIntentRisk !== 'low';
  return pool.filter(q => {
    if (skipIfDenial && q.text.includes('expire')) return false;
    if (skipIfIntentRisk && q.text.includes('home country')) return false;
    return true;
  });
}

/**
 * Returns archetype-specific questions (5-6 per archetype).
 * Falls back to a general investor pool when archetype is null or unrecognised.
 * The caller randomly samples 2.
 */
function getArchetypeQuestions(archetype: string | null, context: SimulatorContext): Question[] {
  const aq = (text: string): Question => ({ id: 'AQ-X', text, category: 'archetype_probe' });

  const biz = context.businessName;
  const inv = context.investmentAmount > 0 ? `$${context.investmentAmount.toLocaleString()}` : 'your investment';

  // buyer — franchise or established-brand operator, prior business owner background
  if (archetype === 'buyer') {
    return [
      aq(`What attracted you to this franchise system specifically — why this brand for ${biz}?`),
      aq('Have you reviewed the Franchise Disclosure Document in full? What stood out to you as the strongest evidence of business viability?'),
      aq('What territory rights do you hold under your franchise agreement, and how does that protect your investment?'),
      aq('How does your prior experience as a business owner prepare you to operate within a franchise system?'),
      aq('What does the franchisor provide in terms of training, marketing, and ongoing operational support?'),
      aq('Have you spoken with other franchisees in this system? What did they tell you about their experience?'),
    ];
  }

  // builder — technology or professional services, manager/owner with domain expertise
  if (archetype === 'builder') {
    return [
      aq(`Who are your first clients or committed contracts for ${biz}, and how did you secure them?`),
      aq('How does this business specifically leverage your professional expertise in a way that requires your physical presence in the United States?'),
      aq('What is your go-to-market strategy for the first 90 days of operation?'),
      aq('How will you differentiate your services from established competitors already operating in this market?'),
      aq('What does your team structure look like — who have you hired or plan to hire in Year 1?'),
      aq('How do you plan to scale revenue as you grow — additional staff, new service lines, or geographic expansion?'),
    ];
  }

  // investor — capital-focus, portfolio mindset, risks appearing passive
  if (archetype === 'investor') {
    return [
      aq('Describe your day-to-day management activities in concrete terms — what decisions do you personally make each week?'),
      aq('Who else works in this business and who do they report to on a daily basis?'),
      aq(`You committed ${inv} to this business. How does that qualify as active management rather than passive investment?`),
      aq('What percentage of your working hours will this business require, and what will the remaining time involve?'),
      aq('What would happen to the operations of this business if you were absent for two weeks?'),
      aq(`Walk me through specifically how you develop and direct ${biz} on a day-to-day basis — not at a high level, but concretely.`),
    ];
  }

  // career_switcher — new industry, professional transitioning, no direct sector experience
  if (archetype === 'career_switcher') {
    return [
      aq(`You are entering a new industry with ${biz}. What specific preparation or training have you completed to operate this type of business?`),
      aq('How does your previous career background translate to the day-to-day demands of running this specific business?'),
      aq('Who in this industry have you spoken with, shadowed, or consulted to understand what operations actually look like?'),
      aq('What does the first 30 days of running this business look like for you — walk me through it concretely.'),
      aq('What knowledge gaps have you identified, and what is your plan to close them before or after opening?'),
      aq('Why this industry, given that you have direct professional experience in a different field?'),
    ];
  }

  // fallback — archetype unknown or profile not yet built
  return [
    aq(`Why did you choose ${biz} as your E-2 investment?`),
    aq('What specific experience or background makes you the right person to operate this business?'),
    aq(`How did you research this opportunity — what validated your confidence in committing ${inv}?`),
    aq('What is your long-term plan for this business beyond the initial E-2 period?'),
    aq('What are the two or three biggest risks to this business and how are you mitigating them?'),
  ];
}

/**
 * Returns a shuffleable pool of business-type questions (5-6 per category).
 * The caller randomly samples 2.
 */
function getBusinessTypeQuestions(category: string, context: SimulatorContext): Question[] {
  const cat = category.toLowerCase();
  const bt = (text: string): Question => ({ id: 'BT-X', text, category: 'business_type' });

  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe') || cat.includes('bakery')) {
    return [
      bt('What health and food-handler permits have you obtained or applied for?'),
      bt('How will you staff this restaurant — what positions and what is your hiring timeline?'),
      bt('Is this a franchise? If so, what training and support does the franchisor provide?'),
      bt('How will you handle food safety compliance and inspections?'),
      bt('Describe your target customer and how you plan to market to them.'),
      bt('What is your plan for managing food costs and supplier relationships?'),
    ];
  }

  if (cat.includes('health') || cat.includes('senior') || cat.includes('care') || cat.includes('medical')) {
    return [
      bt('What license or certification have you applied for, and what is the current status?'),
      bt('How do you plan to find and retain qualified caregivers or clinical staff?'),
      bt('Who is your Director of Care or clinical supervisor, and what are their qualifications?'),
      bt('How do you ensure compliance with state health and safety regulations?'),
      bt('How will you handle liability and what insurance coverage have you arranged?'),
      bt('Who are your referral sources — hospitals, social workers, doctors?'),
    ];
  }

  if (cat.includes('retail') || cat.includes('store') || cat.includes('shop') || cat.includes('boutique')) {
    return [
      bt('How did you select this location? What market analysis did you conduct?'),
      bt('How do you manage inventory and who are your main suppliers?'),
      bt('Who are your main competitors and how will you differentiate?'),
      bt('What is your plan for attracting customers — foot traffic, online, marketing?'),
      bt('How will you handle seasonal fluctuations in sales?'),
      bt('Have you signed a lease? What are the key terms?'),
    ];
  }

  if (cat.includes('franchise')) {
    return [
      bt('What attracted you to this franchise system specifically — why this brand?'),
      bt('Have you reviewed the Franchise Disclosure Document? What stood out to you?'),
      bt('What does the franchisor provide in terms of training, marketing, and ongoing support?'),
      bt('How long is your franchise agreement and what are the renewal terms?'),
      bt('Are there other franchisees in this system you have spoken with?'),
      bt('What territory rights do you have under your franchise agreement?'),
    ];
  }

  if (cat.includes('cleaning') || cat.includes('janitorial') || cat.includes('maintenance')) {
    return [
      bt('How will you acquire your first commercial clients?'),
      bt('What equipment have you purchased and where is it currently located?'),
      bt('Will your workers be W-2 employees or 1099 contractors, and why?'),
      bt('How will you ensure quality control across multiple job sites?'),
      bt('What contracts or letters of intent do you currently have?'),
      bt('How do you plan to scale — adding trucks, crews, territories?'),
    ];
  }

  if (cat.includes('it') || cat.includes('consulting') || cat.includes('tech') || cat.includes('software')) {
    return [
      bt('Who are your current clients or committed contracts?'),
      bt('What specific services or technology does your company specialize in?'),
      bt('How many technical staff do you employ or plan to hire in Year 1?'),
      bt('How do you protect client data and maintain cybersecurity compliance?'),
      bt('How do you price your services and what is your typical contract size?'),
      bt('Who are your competitors and how do clients find you?'),
    ];
  }

  if (cat.includes('transport') || cat.includes('logistics') || cat.includes('trucking') || cat.includes('delivery')) {
    return [
      bt('What operating authority, DOT number, or commercial licenses have you obtained?'),
      bt('How many vehicles do you own or lease and what routes do you run?'),
      bt('How do you find freight — brokers, direct shippers, load boards?'),
      bt('How do you manage driver recruitment, compliance, and safety?'),
      bt('What insurance coverage does your fleet carry?'),
      bt('How do you handle regulatory compliance like ELD mandates and hours of service?'),
    ];
  }

  if (cat.includes('construction') || cat.includes('contractor') || cat.includes('renovation')) {
    return [
      bt('What contractor license do you hold and in which state?'),
      bt('What type of projects do you take — residential, commercial, specialty?'),
      bt('How do you source subcontractors and manage project timelines?'),
      bt('What bonding and insurance do you carry?'),
      bt('Describe your current project pipeline or bids outstanding.'),
      bt('How do you handle permitting and compliance on job sites?'),
    ];
  }

  // Default pool — general business questions
  return [
    bt('Why did you choose this particular business in this location?'),
    bt('What is your competitive advantage over existing businesses in this market?'),
    bt('How will you market your services and acquire your first customers?'),
    bt(`How did you determine that $${context.investmentAmount.toLocaleString()} was the right amount to invest?`),
    bt('What is your exit plan — how long do you plan to operate this business?'),
    bt('What are the biggest risks to this business and how do you plan to address them?'),
  ];
}

// =============================================================================
// COACHING SUMMARY GENERATION
// =============================================================================

/**
 * Generates a post-session coaching summary.
 */

export function generateCoachingSummary(
  session: CompletedSession,
  _context: SimulatorContext
): CoachingSummary {
  const strongAnswers: { question: string; note: string }[] = [];
  const needsWork: { questionId: string; question: string; suggestion: string; originalAnswer: string }[] = [];
  const inconsistencies: { questionId: string; question: string; filed: string; spoken: string; originalAnswer: string }[] = [];
  const weakPointsAtRisk: string[] = [];

  session.questions.forEach((q) => {
    switch (q.rating) {
      case 'strong':
        strongAnswers.push({
          question: q.questionText,
          note: q.feedback,
        });
        break;
      case 'weak':
        needsWork.push({
          questionId: q.questionId,
          question: q.questionText,
          suggestion: q.specificSuggestion || q.feedback,
          originalAnswer: q.answerText,
        });
        if (q.questionId.startsWith('WP-')) {
          weakPointsAtRisk.push(q.questionText);
        }
        break;
      case 'inconsistent':
        inconsistencies.push({
          questionId: q.questionId,
          question: q.questionText,
          filed: q.specificSuggestion || 'See filed documents',
          spoken: q.answerText.substring(0, 120),
          originalAnswer: q.answerText,
        });
        weakPointsAtRisk.push(q.questionText);
        break;
    }
  });

  // Determine overall readiness
  const _totalQuestions = session.questions.length;
  const weakOrInconsistentCount = needsWork.length + inconsistencies.length;
  let readinessIndicator: 'ready' | 'nearly_ready' | 'needs_work';

  if (inconsistencies.length > 0 || weakOrInconsistentCount > 2) {
    readinessIndicator = 'needs_work';
  } else if (weakOrInconsistentCount > 0) {
    readinessIndicator = 'nearly_ready';
  } else {
    // All answers rated strong
    readinessIndicator = 'ready';
  }

  const deliveryFlags = session.questions
    .filter(q => q.deliveryNotes && q.deliveryNotes.length > 0)
    .map(q => ({ questionId: q.questionId, questionText: q.questionText, notes: q.deliveryNotes! }));

  // Numeric session score: LLM per-answer scores (1-10 → ×10) averaged across
  // all answered questions; answers with no score fall back to a rating-based value.
  const ratingFallbackScore: Record<'strong' | 'weak' | 'inconsistent', number> = {
    strong: 80,
    weak: 45,
    inconsistent: 25,
  };
  const questionBreakdown: QuestionBreakdownItem[] = session.questions.map(q => ({
    questionId: q.questionId,
    questionText: q.questionText,
    rating: q.rating,
    score: typeof q.score === 'number' ? Math.round(q.score * 10) : null,
    feedback: q.feedback,
    suggestion: q.specificSuggestion || q.feedback,
  }));
  const perAnswerScores = session.questions.map(q =>
    typeof q.score === 'number' ? q.score * 10 : ratingFallbackScore[q.rating]
  );
  const overallScore = perAnswerScores.length > 0
    ? Math.round(perAnswerScores.reduce((a, b) => a + b, 0) / perAnswerScores.length)
    : null;

  return {
    strongAnswers,
    needsWork,
    inconsistencies,
    weakPointsAtRisk,
    readinessIndicator,
    overallScore,
    questionBreakdown,
    deliveryFlags: deliveryFlags.length > 0 ? deliveryFlags : undefined,
  };
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Creates a new simulator session for an application.
 */
export async function createSimulatorSession(
  applicationId: string,
  mode: 'text' | 'voice' = 'text'
): Promise<{ sessionId: string; sessionNumber: number; questionsRemaining: number }> {
  // Get user from application
  const { data: application, error } = await supabase
    .from('applications')
    .select('user_id, simulator_sessions_used, simulator_sessions_purchased')
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    throw new Error('Application not found');
  }

  const sessionsUsed = application.simulator_sessions_used || 0;

  // Complete package holders get 3 sessions. Standalone buyers use DB value. Default: 2.
  let sessionsPurchased = application.simulator_sessions_purchased || 2;
  const { data: completePayment } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', application.user_id)
    .eq('status', 'completed')
    .in('payment_type', ['complete', 'complete_partnership'])
    .limit(1)
    .maybeSingle();
  if (completePayment) sessionsPurchased = Math.max(sessionsPurchased, 3);

  if (sessionsUsed >= sessionsPurchased) throw new Error('SESSION_LIMIT_EXCEEDED');

  const sessionNumber = sessionsUsed + 1;

  // Create session record
  const { data: session, error: sessionError } = await supabase
    .from('simulator_sessions')
    .insert({
      application_id: applicationId,
      user_id: application.user_id,
      session_number: sessionNumber,
      mode,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  // Update application session count
  await supabase
    .from('applications')
    .update({ simulator_sessions_used: sessionsUsed + 1 })
    .eq('id', applicationId);

  return {
    sessionId: session.id,
    sessionNumber,
    questionsRemaining: 10, // Will generate actual count when needed
  };
}

/**
 * Gets session info and current progress.
 */
export async function getSimulatorSession(sessionId: string) {
  const { data: session, error } = await supabase
    .from('simulator_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    throw new Error('Session not found');
  }

  // Get answers for this session
  const { data: answers } = await supabase
    .from('simulator_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true });

  return { session, answers: answers || [] };
}

/**
 * Saves an answer to a session.
 */
export async function saveSimulatorAnswer(
  sessionId: string,
  questionId: string,
  questionText: string,
  answerText: string,
  rating: 'strong' | 'weak' | 'inconsistent',
  feedback: string,
  specificSuggestion: string,
  documentReference: string | null
) {
  const { data: answer, error } = await supabase
    .from('simulator_answers')
    .insert({
      session_id: sessionId,
      question_id: questionId,
      question_text: questionText,
      answer_text: answerText,
      rating,
      feedback,
      specific_suggestion: specificSuggestion,
      document_reference: documentReference,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save answer: ${error.message}`);
  }

  // Update session counts
  const { data: session } = await supabase
    .from('simulator_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (session) {
    const updates: Record<string, number> = {
      questions_asked: (session.questions_asked || 0) + 1,
    };

    if (rating === 'strong') {
      updates.strong_count = (session.strong_count || 0) + 1;
    } else if (rating === 'weak') {
      updates.needs_work_count = (session.needs_work_count || 0) + 1;
    } else if (rating === 'inconsistent') {
      updates.inconsistency_count = (session.inconsistency_count || 0) + 1;
    }

    await supabase
      .from('simulator_sessions')
      .update(updates)
      .eq('id', sessionId);
  }

  return answer;
}

/**
 * Marks a session as complete.
 */
export async function completeSimulatorSession(
  sessionId: string,
  readinessIndicator: 'ready' | 'nearly_ready' | 'needs_work'
) {
  const { error } = await supabase
    .from('simulator_sessions')
    .update({
      completed_at: new Date().toISOString(),
      readiness_indicator: readinessIndicator,
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to complete session: ${error.message}`);
  }
}

export async function saveCoachingNotes(sessionId: string, top3NextSession: string[]) {
  await supabase
    .from('simulator_sessions')
    .update({ coaching_notes: { top3NextSession } })
    .eq('id', sessionId);
}

/**
 * Checks if an application has simulator sessions available.
 */
export async function checkSessionAvailability(applicationId: string): Promise<{
  available: boolean;
  sessionsUsed: number;
  sessionsPurchased: number;
  sessionsRemaining: number;
}> {
  const { data: application, error } = await supabase
    .from('applications')
    .select('user_id, simulator_sessions_used, simulator_sessions_purchased')
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    return {
      available: false,
      sessionsUsed: 0,
      sessionsPurchased: 2,
      sessionsRemaining: 0,
    };
  }

  const sessionsUsed = application.simulator_sessions_used || 0;

  // Complete package holders get 3 simulator sessions included.
  // Standalone simulator buyers use simulator_sessions_purchased from DB.
  // Default fallback: 2 free sessions.
  let sessionsPurchased = application.simulator_sessions_purchased || 2;
  if (application.user_id) {
    const { data: completePayment } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', application.user_id)
      .eq('status', 'completed')
      .in('payment_type', ['complete', 'complete_partnership'])
      .limit(1)
      .maybeSingle();
    if (completePayment) sessionsPurchased = Math.max(sessionsPurchased, 3);
  }

  const sessionsRemaining = Math.max(0, sessionsPurchased - sessionsUsed);

  return {
    available: sessionsRemaining > 0,
    sessionsUsed,
    sessionsPurchased,
    sessionsRemaining,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

function parseAmount(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$,\sA-Za-z]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}