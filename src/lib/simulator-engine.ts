// Interview Simulator Engine
// The brain of the interview simulator
// Generated: June 5, 2026

import { createClient } from '@supabase/supabase-js';
import type {
  SimulatorContext,
  Question,
  AnswerEvaluation,
  CoachingSummary,
  CompletedSession,
  InvestmentSource,
  FundFlowEvent,
} from '@/types/simulator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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
    .select('question_id, answer_text')
    .eq('application_id', applicationId);

  if (answersError) {
    throw new Error(`Answers fetch error: ${answersError.message}`);
  }

  // Convert answers array to map for easy lookup
  const answersMap = new Map<string, string>();
  answers?.forEach((a) => {
    answersMap.set(a.question_id, a.answer_text);
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
    businessCategory,
    businessRoute: application.business_route || answersMap.get('M2-ROUTE') || 'new',
    targetState: application.target_state || 'California',
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

/**
 * Generates 10-12 personalized questions based on the simulator context.
 * Questions are ordered: universal first, then weak point probes, then business type.
 */
export function generateQuestions(context: SimulatorContext): Question[] {
  const questions: Question[] = [];

  // === UNIVERSAL QUESTIONS (always asked) ===
  questions.push(
    {
      id: 'UQ-01',
      text: 'Tell me about your business.',
      category: 'universal',
      context: `Your ${context.businessName} in ${context.targetState}`,
    },
    {
      id: 'UQ-02',
      text: 'What is your role in the business?',
      category: 'universal',
    },
    {
      id: 'UQ-03',
      text: `How much have you invested and in what form?`,
      category: 'universal',
      context: `Your investment: $${context.investmentAmount.toLocaleString()}`,
    },
    {
      id: 'UQ-04',
      text: 'Where did your investment funds come from?',
      category: 'universal',
    },
    {
      id: 'UQ-05',
      text: 'How will this business support you financially?',
      category: 'universal',
      context: context.revenueYear1 > 0 ?
        `Your Year 1 projection: $${context.revenueYear1.toLocaleString()}` : undefined,
    },
    {
      id: 'UQ-06',
      text: 'How many people will you employ?',
      category: 'universal',
      context: `Current: ${context.employeeCountCurrent}, Year 1: ${context.employeeCountYear1}`,
    },
    {
      id: 'UQ-07',
      text: 'What experience do you have to run this business?',
      category: 'universal',
    },
    {
      id: 'UQ-08',
      text: 'What are your plans if your visa is not approved?',
      category: 'universal',
    },
    {
      id: 'UQ-09',
      text: 'Do you intend to remain in the U.S. permanently?',
      category: 'universal',
    }
  );

  // === WEAK POINT PROBE QUESTIONS ===
  // Generate 1-3 probe questions based on analysis engine flags

  if (context.substantialityScore !== null && context.substantialityScore < 70) {
    questions.push({
      id: 'WP-01',
      text: `Walk me through exactly how your $${context.investmentAmount.toLocaleString()} investment was allocated across the business.`,
      category: 'weak_point_probe',
      context: `Substantiality score: ${context.substantialityScore}/100`,
      relatesToField: 'investment_allocation',
    });
  }

  if (context.marginalityScore !== null && context.marginalityScore < 70) {
    questions.push({
      id: 'WP-02',
      text: `Your business projects $${context.revenueYear1.toLocaleString()} in Year 1. How does this compare to what you need to support your household?`,
      category: 'weak_point_probe',
      context: `Marginality score: ${context.marginalityScore}/100`,
      relatesToField: 'marginality',
    });
  }

  if (context.developDirectScore !== null && context.developDirectScore < 70) {
    questions.push({
      id: 'WP-03',
      text: 'Describe your day-to-day management activities. Who reports to you and how do you direct their work?',
      category: 'weak_point_probe',
      context: `Develop & Direct score: ${context.developDirectScore}/100`,
      relatesToField: 'management',
    });
  }

  if (context.priorVisaDenial) {
    questions.push({
      id: 'WP-04',
      text: 'You were previously refused a U.S. visa. Can you explain what has changed since then?',
      category: 'weak_point_probe',
      context: 'Prior denial on record',
      relatesToField: 'prior_denial',
    });
  }

  // === BUSINESS TYPE QUESTIONS ===
  // Generate 2-3 questions based on business category
  const businessTypeQuestions = getBusinessTypeQuestions(context.businessCategory);
  questions.push(...businessTypeQuestions.slice(0, 3));

  // Limit to 12 questions total
  return questions.slice(0, 12);
}

/**
 * Returns business-type-specific questions based on category.
 */
function getBusinessTypeQuestions(category: string): Question[] {
  const categoryLower = category.toLowerCase();

  // Food & Beverage
  if (categoryLower.includes('food') || categoryLower.includes('restaurant') || categoryLower.includes('cafe')) {
    return [
      {
        id: 'BT-01',
        text: 'What health permits have you obtained or need to obtain?',
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'How will you staff this restaurant? What is your hiring plan?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'Is this a franchise? If so, what does the franchisor provide?',
        category: 'business_type',
      },
    ];
  }

  // Healthcare / Senior Care
  if (categoryLower.includes('health') || categoryLower.includes('senior') || categoryLower.includes('care')) {
    return [
      {
        id: 'BT-01',
        text: 'What license have you applied for and what is the status?',
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'How do you plan to find and retain qualified caregivers?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'Who is your Director of Care and what are their qualifications?',
        category: 'business_type',
      },
    ];
  }

  // Retail
  if (categoryLower.includes('retail') || categoryLower.includes('store') || categoryLower.includes('shop')) {
    return [
      {
        id: 'BT-01',
        text: 'How did you select this location? What analysis did you do?',
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'How do you manage inventory? What suppliers will you use?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'Who are your main competitors and how do you differentiate?',
        category: 'business_type',
      },
    ];
  }

  // Franchise (generic)
  if (categoryLower.includes('franchise')) {
    return [
      {
        id: 'BT-01',
        text: `What attracted you to this franchise system specifically?`,
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'Have you reviewed the Franchise Disclosure Document?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'What does the franchisor provide in terms of training and support?',
        category: 'business_type',
      },
    ];
  }

  // Cleaning / Commercial Services
  if (categoryLower.includes('cleaning') || categoryLower.includes('service')) {
    return [
      {
        id: 'BT-01',
        text: 'How will you acquire your first commercial clients?',
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'What equipment have you purchased and what is its current location?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'Are your workers W-2 employees or 1099 contractors and why?',
        category: 'business_type',
      },
    ];
  }

  // IT / Consulting
  if (categoryLower.includes('it') || categoryLower.includes('consulting') || categoryLower.includes('tech')) {
    return [
      {
        id: 'BT-01',
        text: 'Who are your current or committed clients?',
        category: 'business_type',
      },
      {
        id: 'BT-02',
        text: 'What technology stack or services does your company specialize in?',
        category: 'business_type',
      },
      {
        id: 'BT-03',
        text: 'How many technical staff do you employ or plan to hire by year-end?',
        category: 'business_type',
      },
    ];
  }

  // Default generic business questions
  return [
    {
      id: 'BT-01',
      text: 'Why did you choose this business in this location?',
      category: 'business_type',
    },
    {
      id: 'BT-02',
      text: 'What is your competitive advantage?',
      category: 'business_type',
    },
    {
      id: 'BT-03',
      text: 'How will you market your services?',
      category: 'business_type',
    },
  ];
}

// =============================================================================
// ANSWER EVALUATION
// =============================================================================

/**
 * Evaluates a live answer against the question and context.
 * Uses OpenRouter (MiniMax) to assess consistency and completeness.
 */
export async function evaluateAnswer(
  question: Question,
  liveAnswer: string,
  context: SimulatorContext
): Promise<AnswerEvaluation> {
  // Build the evaluation prompt
  const prompt = `You are a U.S. consular officer evaluating an E-2 visa interview answer.
The applicant's profile:
- Business: ${context.businessName} (${context.businessCategory}) in ${context.targetState}
- Investment: $${context.investmentAmount.toLocaleString()}
- Operational status: ${context.operationalStatus}
- Year 1 revenue projection: $${context.revenueYear1.toLocaleString()}
- Employees: ${context.employeeCountCurrent} current, ${context.employeeCountYear1} planned
- Prior visa denial: ${context.priorVisaDenial ? 'Yes' : 'No'}

The question asked was: "${question.text}"

The applicant's live answer was: "${liveAnswer}"

Evaluate this answer and return your assessment in JSON format:
{
  "rating": "strong" | "weak" | "inconsistent",
  "feedback": "A brief paragraph explaining your rating",
  "specificSuggestion": "If rating is weak or inconsistent, what specific improvement is needed?",
  "documentReference": "Which document(s) in their filed application should they reference? (e.g., 'Cover Letter', 'Business Plan', 'Tab F - Investment Proof')"
}`;

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://e2go.app',
        'X-Title': 'E2go Interview Simulator',
      },
      body: JSON.stringify({
        model: 'minimax/minimax-text-01',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced U.S. consular officer evaluating E-2 visa interview answers. Be strict but fair. Focus on whether the answer addresses what a real officer would want to hear, and whether it is consistent with the filed application documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', response.status, await response.text());
      // Return a safe fallback
      return {
        rating: 'weak',
        feedback: 'Unable to evaluate this answer. Please provide more detail about your experience and qualifications.',
        specificSuggestion: 'Include specific examples of your experience and how it relates to running this business.',
        documentReference: 'Tab J - Qualifications',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response
    try {
      // Try to extract JSON from the response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rating: parsed.rating || 'weak',
          feedback: parsed.feedback || 'Evaluation complete.',
          specificSuggestion: parsed.specificSuggestion || '',
          documentReference: parsed.documentReference || null,
        };
      }
    } catch (parseError) {
      console.error('Failed to parse evaluation:', parseError);
    }

    // Fallback if JSON parsing fails
    return {
      rating: 'weak',
      feedback: content.substring(0, 200) || 'Answer recorded.',
      specificSuggestion: 'Provide more specific details about your business and experience.',
      documentReference: null,
    };

  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      rating: 'weak',
      feedback: 'There was an error evaluating your answer. Please try again.',
      specificSuggestion: 'Ensure your answer is specific and relates to your filed documents.',
      documentReference: null,
    };
  }
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
  const needsWork: { question: string; suggestion: string }[] = [];
  const inconsistencies: { question: string; filed: string; spoken: string }[] = [];
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
          question: q.questionText,
          suggestion: q.specificSuggestion || q.feedback,
        });
        // Also track as weak point if it was a probe question
        if (q.questionId.startsWith('WP-')) {
          weakPointsAtRisk.push(q.questionText);
        }
        break;
      case 'inconsistent':
        inconsistencies.push({
          question: q.questionText,
          filed: q.specificSuggestion || 'See filed documents',
          spoken: q.answerText.substring(0, 100) + '...',
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

  return {
    strongAnswers,
    needsWork,
    inconsistencies,
    weakPointsAtRisk,
    readinessIndicator,
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