// Interview Simulator Engine
// The brain of the interview simulator
// Generated: June 5, 2026

import { createBrowserSupabaseClient } from '@/lib/supabase';
import type {
  SimulatorContext,
  Question,
  CoachingSummary,
  CompletedSession,
  InvestmentSource,
  FundFlowEvent,
  DeliveryNote,
} from '@/types/simulator';

// Use the shared browser singleton — avoids creating a second GoTrueClient
// that would cause "Multiple GoTrueClient instances detected" warnings and
// hung auth-token refreshes when two clients race on the same storage key.
const supabase = createBrowserSupabaseClient();

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
    answersMap.get('Q0-10') ||
    'general';

  return {
    applicationId,
    userId: application.user_id,
    businessName: application.business_name ||
      answersMap.get('QA-51') ||
      answersMap.get('M3-A-51') ||
      'My Business',
    operatingName: answersMap.get('QF-09') || answersMap.get('M3-F-09') || null,
    businessCategory,
    businessRoute: application.business_route || answersMap.get('M2-ROUTE') || 'new',
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
    immigrantIntentRisk: 'moderate', // Would come from analysis
    substantialityScore: caseBrief?.substantiality_score ?? null,
    marginalityScore: caseBrief?.marginality_score ?? null,
    developDirectScore: caseBrief?.develop_direct_score ?? null,
    denialRiskFlags: caseBrief?.risk_flags || [],
    applicationType: application.application_type || 'solo',
    createdAt: application.created_at,
  };
}

// =============================================================================
// QUESTION GENERATION
// =============================================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generates 10-12 personalized questions based on the simulator context.
 * Each session randomly selects from question pools so repeat users get variety.
 * Order: universal questions first, then weak point probes, then business type.
 */
export function generateQuestions(context: SimulatorContext): Question[] {
  const questions: Question[] = [];

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

  // === BUSINESS TYPE QUESTIONS — shuffled pool, pick 3 ===
  const businessTypePool = getBusinessTypeQuestions(context.businessCategory, context);
  const selected = shuffle(businessTypePool).slice(0, 3);
  selected.forEach((q, i) => {
    questions.push({ ...q, id: `BT-0${i + 1}` });
  });

  return questions.slice(0, 12);
}

/**
 * Returns a shuffleable pool of business-type questions (5-6 per category).
 * The caller randomly samples 3.
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
// =============================================================================
// DELIVERY CONFIDENCE ANALYSIS
// Pure text analysis — no LLM call, no API cost.
// =============================================================================

const FILLER_PATTERN = /\b(um+|uh+|like|you know|kinda|kind of|sort of)\b/gi;
const HEDGE_PATTERN = /\b(i think|maybe|probably|i believe|i guess|might be|not sure|i'm not sure|i suppose|i mean)\b/gi;

export function analyzeDelivery(answerText: string): DeliveryNote[] {
  const notes: DeliveryNote[] = [];
  const trimmed = answerText.trim();
  if (!trimmed) return notes;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const fillerMatches = [...trimmed.matchAll(new RegExp(FILLER_PATTERN.source, 'gi'))];
  const hedgeMatches = [...trimmed.matchAll(new RegExp(HEDGE_PATTERN.source, 'gi'))];

  if (wordCount < 30) {
    notes.push({
      type: 'brevity',
      detail: `${wordCount} words — officers expect 50–100 words for substantive answers. Expand with specific facts about your investment or role.`,
    });
  }
  if (fillerMatches.length >= 2) {
    const examples = [...new Set(fillerMatches.map(m => m[0].toLowerCase()))].slice(0, 3).join('", "');
    notes.push({
      type: 'fillers',
      detail: `${fillerMatches.length} filler words detected ("${examples}"). These signal uncertainty to the officer. Pause instead of filling silence.`,
    });
  }
  if (hedgeMatches.length >= 2) {
    const examples = [...new Set(hedgeMatches.map(m => m[0].toLowerCase()))].slice(0, 2).join('", "');
    notes.push({
      type: 'hedging',
      detail: `Hedging language detected ("${examples}"). State investment facts directly — "I invested $180,000" not "I think it was around $180,000."`,
    });
  }
  return notes;
}

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

  if (inconsistencies.length > 0) {
    readinessIndicator = 'needs_work';
  } else if (weakOrInconsistentCount <= 2) {
    readinessIndicator = 'nearly_ready';
  } else {
    readinessIndicator = 'ready';
  }

  // If all strong
  if (needsWork.length === 0 && inconsistencies.length === 0) {
    readinessIndicator = 'ready';
  }

  const deliveryFlags = session.questions
    .filter(q => q.deliveryNotes && q.deliveryNotes.length > 0)
    .map(q => ({ questionId: q.questionId, questionText: q.questionText, notes: q.deliveryNotes! }));

  return {
    strongAnswers,
    needsWork,
    inconsistencies,
    weakPointsAtRisk,
    readinessIndicator,
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

  // Check session limits
  const sessionsUsed = application.simulator_sessions_used || 0;
  const sessionsPurchased = application.simulator_sessions_purchased || 2;

  if (sessionsUsed >= sessionsPurchased) {
    throw new Error('SESSION_LIMIT_EXCEEDED');
  }

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
    .select('simulator_sessions_used, simulator_sessions_purchased')
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
  const sessionsPurchased = application.simulator_sessions_purchased || 2;
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