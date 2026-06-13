import {
  type ScoreLevel,
  type MarginalityScore,
  type ExecutiveRoleScore,
  type DenialRisk,
  type KBFlag,
  type FramingDecision,
  type CaseBrief,
} from '@/types/analysis';
import { createClient } from '@supabase/supabase-js';
import { getOperationalNeeds } from './business-operational-needs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// Experience dimension types
// ---------------------------------------------------------------------------

export type DimensionScore = 'CONFIRMED' | 'PARTIAL' | 'INFERRED' | 'ABSENT' | 'N_A';

export interface ExperienceDimensionResult {
  dimension: string;
  score: DimensionScore;
  evidence: string;
  source: string;
}

export interface ExperienceScoringResult {
  dimensions: ExperienceDimensionResult[];
  confirmed_count: number;
  applicable_count: number;
  overall_score: ScoreLevel;
  franchise_training_offset: boolean;
}

interface CoreScores {
  substantiality: ScoreLevel;
  fund_source: ScoreLevel;
  experience: ScoreLevel;
  intent: ScoreLevel;
  executive_role: ExecutiveRoleScore;
  ownership_control: ScoreLevel;
}

interface KBValidationResult {
  complete: boolean;
  consulate_profile_used: string;
  business_type_profile_used: string;
  kb_flags: KBFlag[];
  dimensions_confirmed: string[];
  dimensions_flagged: string[];
}

export async function runAnalysisEngine(
  applicationId: string,
  _userId: string
): Promise<CaseBrief> {
  const answers = await loadApplicationAnswers(applicationId);
  const consulate = (answers.consulate as string) || 'toronto';
  const businessType = (answers.business_type as string) || 'service';

  const experienceScoring = calculateExperienceScore(answers, businessType);

  const scores = {
    substantiality: calculateSubstantialityScore(answers),
    fund_source: calculateFundSourceScore(answers),
    experience: experienceScoring.overall_score,
    intent: calculateIntentScore(answers),
    executive_role: calculateExecutiveRoleScore(answers),
    ownership_control: calculateOwnershipControlScore(answers),
  };

  const marginality = calculateMarginalityScore(answers);
  const denialRisks = assessDenialRisks(answers, scores);
  const kbValidation = runKBValidation(scores, consulate, businessType);
  const framingDecisions = await generateFramingDecisions(
    scores,
    kbValidation.kb_flags,
    denialRisks,
    answers,
    businessType,
    experienceScoring
  );

  return assembleCaseBrief(
    applicationId,
    scores,
    marginality,
    denialRisks,
    kbValidation,
    framingDecisions,
    experienceScoring
  );
}

// ---------------------------------------------------------------------------
// Load real application answers from all data sources
// ---------------------------------------------------------------------------

async function loadApplicationAnswers(applicationId: string): Promise<Record<string, unknown>> {
  const supabase = getSupabase();

  // 1. Load Module 3 answers (Tab J, Tab K, Tab F, Tab H, etc.)
  const { data: answers } = await supabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId);

  const answersMap: Record<string, unknown> = {};
  if (answers) {
    for (const row of answers) {
      answersMap[row.question_key] = row.answer_value;
    }
  }

  // 2. Load follow-up responses (mentioned_experiences, content_signals)
  const { data: followUpResponses } = await supabase
    .from('followup_responses')
    .select('question_text, response_text, gap_category')
    .eq('application_id', applicationId);

  if (followUpResponses) {
    answersMap['_followup_responses'] = followUpResponses;
  }

  // 3. Load voice profile content signals (mentioned_experiences)
  const { data: voiceProfile } = await supabase
    .from('applicant_voice_profile')
    .select('content_signals_json')
    .eq('application_id', applicationId)
    .single();

  if (voiceProfile?.content_signals_json) {
    answersMap['_content_signals'] = voiceProfile.content_signals_json;
  }

  // 4. Load quiz session data (business_type, franchise_interest)
  const { data: application } = await supabase
    .from('applications')
    .select('user_id')
    .eq('id', applicationId)
    .single();

  if (application?.user_id) {
    const { data: quizSession } = await supabase
      .from('quiz_sessions')
      .select('business_type, franchise_interest, result_json')
      .eq('user_id', application.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (quizSession) {
      answersMap['business_type'] = quizSession.business_type || answersMap['business_type'];
      answersMap['_franchise_interest'] = quizSession.franchise_interest;
      answersMap['_quiz_result'] = quizSession.result_json;
    }
  }

  // 5. Load case brief if it exists (for pre-existing data)
  const { data: existingBrief } = await supabase
    .from('case_briefs')
    .select('case_brief_json')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingBrief?.case_brief_json) {
    answersMap['_existing_case_brief'] = existingBrief.case_brief_json;
  }

  return answersMap;
}

// ---------------------------------------------------------------------------
// 9 Experience Dimension Scorers (Spec1 Section 3)
// ---------------------------------------------------------------------------

/**
 * Helper: check if text contains any of the given keywords (case-insensitive).
 */
function textContainsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

/**
 * Helper: extract Tab J answers as a single text blob for keyword scanning.
 */
function getTabJText(answers: Record<string, unknown>): string {
  return Object.entries(answers)
    .filter(([key]) => key.startsWith('qj-') || key.startsWith('QA-'))
    .map(([, value]) => String(value))
    .join(' ');
}

/**
 * Helper: extract follow-up response text as a single blob.
 */
function getFollowupText(answers: Record<string, unknown>): string {
  const followups = answers['_followup_responses'];
  if (!Array.isArray(followups)) return '';
  return followups.map((r: Record<string, unknown>) => String(r.response_text || '')).join(' ');
}

/**
 * Helper: extract all text fields for comprehensive scanning.
 */
function getAllText(answers: Record<string, unknown>): string {
  return [
    getTabJText(answers),
    getFollowupText(answers),
    String(answers['_content_signals'] || ''),
  ].join(' ');
}

// Dimension 1: Direct industry experience
function scoreDirectIndustryExperience(
  answers: Record<string, unknown>,
  businessCategory: string
): ExperienceDimensionResult {
  const allText = getAllText(answers);
  const categoryNeeds = getOperationalNeeds(businessCategory);

  if (!categoryNeeds) {
    return { dimension: 'direct_industry_experience', score: 'N_A', evidence: 'Unknown business category', source: 'system' };
  }

  // Industry-specific keywords for each category
  const industryKeywords: Record<string, string[]> = {
    home_care: ['caregiv', 'home care', 'senior care', 'nursing', 'healthcare aide', 'personal care', 'assisted living'],
    child_education: ['tutor', 'teach', 'education', 'instructor', 'school', 'curriculum', 'learning center', 'kumon', 'mathnasium'],
    food_service: ['restaurant', 'food service', 'kitchen', 'chef', 'cook', 'food prep', 'qsr', 'fast casual', 'subway', 'wingstop'],
    cleaning: ['cleaning', 'janitorial', 'custodial', 'restoration', 'property services', 'maids', 'clean'],
    fitness_wellness: ['fitness', 'gym', 'yoga', 'personal train', 'wellness', 'studio', 'pilates'],
    automotive: ['automotive', 'auto repair', 'mechanic', 'car service', 'oil change', 'tire', 'brake'],
    it_services: ['it service', 'tech repair', 'computer repair', 'managed service', 'help desk', 'network', 'cybersecurity'],
    healthcare_staffing: ['healthcare staffing', 'medical staffing', 'nurse staffing', 'clinical staffing', 'healthcare recruit'],
    pet_services: ['pet', 'dog', 'grooming', 'boarding', 'daycare', 'animal', 'vet'],
    real_estate: ['property management', 'real estate', 'rental management', 'lease management'],
    retail: ['retail', 'store manager', 'sales associate', 'merchandis', 'inventory manage', 'shop'],
    tax_preparation: ['tax', 'accounting', 'bookkeeping', 'financial service', 'cpa', 'tax prepar'],
  };

  const keywords = industryKeywords[businessCategory] || [];
  const matches = keywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 2) {
    return { dimension: 'direct_industry_experience', score: 'CONFIRMED', evidence: `Direct industry keywords found: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length === 1) {
    return { dimension: 'direct_industry_experience', score: 'PARTIAL', evidence: `Partial industry keyword found: ${matches[0]}`, source: 'answers' };
  }

  // Check if they mention anything related
  const generalIndustry = textContainsAny(allText, ['industry', 'sector', 'field', 'background in']);
  if (generalIndustry) {
    return { dimension: 'direct_industry_experience', score: 'INFERRED', evidence: 'General industry background mentioned but no direct match', source: 'answers' };
  }

  return { dimension: 'direct_industry_experience', score: 'ABSENT', evidence: 'No direct industry experience found', source: 'answers' };
}

// Dimension 2: Management experience
function scoreManagementExperience(answers: Record<string, unknown>): ExperienceDimensionResult {
  const allText = getAllText(answers);

  const managementKeywords = ['manage', 'supervis', 'lead', 'direct', 'oversight', 'team lead', 'foreman', 'coordinator', 'director', 'vp', 'vice president', 'staff of', 'employees', 'personnel', 'hire', 'hiring', 'fired', 'termination', 'performance review'];
  const matches = managementKeywords.filter(k => textContainsAny(allText, [k]));

  // Check for quantified management
  const hasNumbers = /\b\d+\s*(staff|employees|people|team members|direct reports)\b/i.test(allText);
  const hasBudget = /\$\d+/.test(allText) && textContainsAny(allText, ['budget', 'revenue', 'p&l', 'profit', 'loss', 'financial']);

  if (matches.length >= 3 && (hasNumbers || hasBudget)) {
    return { dimension: 'management_experience', score: 'CONFIRMED', evidence: `Strong management language (${matches.length} matches) with quantified scope`, source: 'answers' };
  }
  if (matches.length >= 2) {
    return { dimension: 'management_experience', score: 'PARTIAL', evidence: `Management language found (${matches.length} matches) but limited quantification`, source: 'answers' };
  }
  if (matches.length >= 1) {
    return { dimension: 'management_experience', score: 'INFERRED', evidence: `Some management language: ${matches[0]}`, source: 'answers' };
  }

  return { dimension: 'management_experience', score: 'ABSENT', evidence: 'No management experience indicators found', source: 'answers' };
}

// Dimension 3: Business ownership experience
function scoreBusinessOwnershipExperience(answers: Record<string, unknown>): ExperienceDimensionResult {
  const allText = getAllText(answers);

  const ownershipKeywords = ['own', 'owner', 'founded', 'started my', 'my business', 'my company', 'entrepreneur', 'self-employed', 'sole proprietor', 'llc', 'incorporated'];
  const matches = ownershipKeywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 2) {
    return { dimension: 'business_ownership_experience', score: 'CONFIRMED', evidence: `Clear ownership language: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length === 1) {
    return { dimension: 'business_ownership_experience', score: 'PARTIAL', evidence: `Some ownership language: ${matches[0]}`, source: 'answers' };
  }

  return { dimension: 'business_ownership_experience', score: 'ABSENT', evidence: 'No business ownership indicators found', source: 'answers' };
}

// Dimension 4: Relevant education
function scoreRelevantEducation(
  answers: Record<string, unknown>,
  businessCategory: string
): ExperienceDimensionResult {
  const allText = getAllText(answers);

  const educationKeywords = ['degree', 'bachelor', 'master', 'mba', 'diploma', 'certificate', 'certification', 'university', 'college', 'graduated', 'studied', 'major in'];
  const matches = educationKeywords.filter(k => textContainsAny(allText, [k]));

  // Category-specific education relevance
  const categoryEducation: Record<string, string[]> = {
    child_education: ['education', 'teaching', 'pedagogy', 'child develop'],
    food_service: ['culinary', 'food science', 'hospitality', 'restaurant manage'],
    it_services: ['computer science', 'information technology', 'network', 'cybersecurity'],
    healthcare_staffing: ['healthcare', 'nursing', 'medical', 'health administration'],
    tax_preparation: ['accounting', 'finance', 'tax', 'business administration'],
    automotive: ['automotive', 'mechanical', 'engineering'],
    fitness_wellness: ['kinesiology', 'exercise science', 'sports', 'fitness'],
    real_estate: ['real estate', 'property management', 'urban planning'],
  };

  const relevantKeywords = categoryEducation[businessCategory] || [];
  const relevantMatches = relevantKeywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 1 && relevantMatches.length >= 1) {
    return { dimension: 'relevant_education', score: 'CONFIRMED', evidence: `Education found with relevance to ${businessCategory}: ${relevantMatches.join(', ')}`, source: 'answers' };
  }
  if (matches.length >= 1) {
    return { dimension: 'relevant_education', score: 'PARTIAL', evidence: `Education found but not directly relevant to ${businessCategory}`, source: 'answers' };
  }

  return { dimension: 'relevant_education', score: 'ABSENT', evidence: 'No education indicators found', source: 'answers' };
}

// Dimension 5: Caregiving experience (N/A for non-care businesses)
function scoreCaregivingExperience(
  answers: Record<string, unknown>,
  businessCategory: string
): ExperienceDimensionResult {
  // Only relevant for care-related businesses
  if (businessCategory !== 'home_care' && businessCategory !== 'healthcare_staffing') {
    return { dimension: 'caregiving_experience', score: 'N_A', evidence: 'Not applicable to this business category', source: 'system' };
  }

  const allText = getAllText(answers);

  const caregivingKeywords = ['caregiv', 'cared for', 'nursing', 'home care', 'senior care', 'personal care', 'assisted living', 'parent with', 'family member', 'dementia', 'alzheimer', 'chronic illness', 'disability'];
  const matches = caregivingKeywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 2) {
    return { dimension: 'caregiving_experience', score: 'CONFIRMED', evidence: `Clear caregiving experience: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length === 1) {
    return { dimension: 'caregiving_experience', score: 'PARTIAL', evidence: `Some caregiving mention: ${matches[0]}`, source: 'answers' };
  }

  return { dimension: 'caregiving_experience', score: 'ABSENT', evidence: 'No caregiving experience found', source: 'answers' };
}

// Dimension 6: Sales/customer experience
function scoreSalesCustomerExperience(answers: Record<string, unknown>): ExperienceDimensionResult {
  const allText = getAllText(answers);

  const salesKeywords = ['sales', 'customer service', 'client', 'retail', 'hospitality', 'front desk', 'reception', 'account manager', 'business development', 'b2b', 'b2c', 'selling', 'revenue'];
  const matches = salesKeywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 3) {
    return { dimension: 'sales_customer_experience', score: 'CONFIRMED', evidence: `Strong sales/customer background: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length >= 2) {
    return { dimension: 'sales_customer_experience', score: 'PARTIAL', evidence: `Some sales/customer experience: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length === 1) {
    return { dimension: 'sales_customer_experience', score: 'INFERRED', evidence: `Single sales/customer mention: ${matches[0]}`, source: 'answers' };
  }

  return { dimension: 'sales_customer_experience', score: 'ABSENT', evidence: 'No sales/customer experience found', source: 'answers' };
}

// Dimension 7: Technical experience
function scoreTechnicalExperience(
  answers: Record<string, unknown>,
  businessCategory: string
): ExperienceDimensionResult {
  // Only relevant for technical businesses
  const technicalCategories = ['it_services', 'automotive', 'healthcare_staffing'];
  if (!technicalCategories.includes(businessCategory)) {
    return { dimension: 'technical_experience', score: 'N_A', evidence: 'Not applicable to this business category', source: 'system' };
  }

  const allText = getAllText(answers);

  const technicalKeywords: Record<string, string[]> = {
    it_services: ['it', 'information technology', 'computer', 'network', 'server', 'software', 'hardware', 'cybersecurity', 'help desk', 'sysadmin', 'cloud'],
    automotive: ['automotive', 'mechanic', 'engine', 'transmission', 'diagnostic', 'repair', 'technician', ' ASE '],
    healthcare_staffing: ['healthcare', 'medical', 'clinical', 'nursing', 'patient', 'hipaa', 'compliance'],
  };

  const keywords = technicalCategories.includes(businessCategory)
    ? (technicalKeywords[businessCategory] || [])
    : [];
  const matches = keywords.filter(k => textContainsAny(allText, [k]));

  if (matches.length >= 3) {
    return { dimension: 'technical_experience', score: 'CONFIRMED', evidence: `Strong technical background: ${matches.join(', ')}`, source: 'answers' };
  }
  if (matches.length >= 1) {
    return { dimension: 'technical_experience', score: 'PARTIAL', evidence: `Some technical experience: ${matches.join(', ')}`, source: 'answers' };
  }

  return { dimension: 'technical_experience', score: 'ABSENT', evidence: 'No technical experience found', source: 'answers' };
}

// Dimension 8: Franchise training program
function scoreFranchiseTrainingProgram(answers: Record<string, unknown>): ExperienceDimensionResult {
  // Check if franchise FDD includes a training curriculum
  const franchiseInterest = String(answers['_franchise_interest'] || '');
  const tabKText = Object.entries(answers)
    .filter(([key]) => key.startsWith('qk-'))
    .map(([, value]) => String(value))
    .join(' ');

  const allText = `${franchiseInterest} ${tabKText} ${String(answers['business_type'] || '')}`;

  const trainingKeywords = ['training program', 'franchise training', 'onboarding program', 'certification program', 'curriculum', 'fdd', 'franchise disclosure', 'training week', 'training period'];
  const matches = trainingKeywords.filter(k => textContainsAny(allText, [k]));

  if (franchiseInterest && (franchiseInterest.includes('Yes') || franchiseInterest.includes('franchise'))) {
    if (matches.length >= 1) {
      return { dimension: 'franchise_training_program', score: 'CONFIRMED', evidence: 'Franchise with training program identified', source: 'answers' };
    }
    return { dimension: 'franchise_training_program', score: 'PARTIAL', evidence: 'Franchise interest confirmed but training details not yet available', source: 'answers' };
  }

  if (matches.length >= 1) {
    return { dimension: 'franchise_training_program', score: 'PARTIAL', evidence: 'Training program mentioned but franchise status unclear', source: 'answers' };
  }

  return { dimension: 'franchise_training_program', score: 'ABSENT', evidence: 'No franchise training program identified', source: 'answers' };
}

// Dimension 9: Transferable skills (OUTPUT of framing-decisions call, scored differently)
function scoreTransferableSkills(
  _answers: Record<string, unknown>,
  _businessCategory: string
): ExperienceDimensionResult {
  // This dimension is scored AFTER generateFramingDecisions() runs.
  // During initial scoring, we mark it as ABSENT (to be updated later).
  return { dimension: 'transferable_skills_identified', score: 'ABSENT', evidence: 'To be scored after framing-decisions call', source: 'pending' };
}

/**
 * Score all 9 experience dimensions and compute overall experience score.
 *
 * Per Spec1 thresholds:
 *   5+ CONFIRMED out of APPLICABLE dimensions → STRONG
 *   3-4 CONFIRMED → ADEQUATE
 *   1-2 CONFIRMED → WEAK
 *   0 CONFIRMED → CRITICAL
 */
export function calculateExperienceScore(
  answers: Record<string, unknown>,
  businessCategory?: string
): ExperienceScoringResult {
  const category = businessCategory || String(answers['business_type'] || 'service');

  const dimensions: ExperienceDimensionResult[] = [
    scoreDirectIndustryExperience(answers, category),
    scoreManagementExperience(answers),
    scoreBusinessOwnershipExperience(answers),
    scoreRelevantEducation(answers, category),
    scoreCaregivingExperience(answers, category),
    scoreSalesCustomerExperience(answers),
    scoreTechnicalExperience(answers, category),
    scoreFranchiseTrainingProgram(answers),
    scoreTransferableSkills(answers, category),
  ];

  // Count confirmed dimensions, excluding N/A
  const applicableDimensions = dimensions.filter(d => d.score !== 'N_A');
  const confirmedDimensions = dimensions.filter(d => d.score === 'CONFIRMED');

  const confirmedCount = confirmedDimensions.length;
  const applicableCount = applicableDimensions.length;

  // Compute overall score per Spec1 thresholds
  let overallScore: ScoreLevel;
  if (confirmedCount >= 5) {
    overallScore = 'STRONG';
  } else if (confirmedCount >= 3) {
    overallScore = 'ADEQUATE';
  } else if (confirmedCount >= 1) {
    overallScore = 'WEAK';
  } else {
    overallScore = 'CRITICAL';
  }

  // Franchise training offset: if franchise_training_program is CONFIRMED,
  // it offsets a WEAK score (Spec1 franchise_training_offset rule)
  const franchiseTrainingOffset = confirmedDimensions.some(
    d => d.dimension === 'franchise_training_program'
  );
  if (overallScore === 'WEAK' && franchiseTrainingOffset) {
    overallScore = 'ADEQUATE';
  }

  return {
    dimensions,
    confirmed_count: confirmedCount,
    applicable_count: applicableCount,
    overall_score: overallScore,
    franchise_training_offset: franchiseTrainingOffset,
  };
}

function calculateMarginalityScore(_answers: Record<string, unknown>): MarginalityScore {
  return {
    income_score: 'ADEQUATE',
    contribution_score: 'ADEQUATE',
    combined_score: 'ADEQUATE',
    job_creation_score: 'ADEQUATE',
    economic_activity_score: 'ADEQUATE',
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateSubstantialityScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'ADEQUATE';
}

function calculateFundSourceScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'ADEQUATE';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateIntentScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'STRONG';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateExecutiveRoleScore(_answers: Record<string, unknown>): ExecutiveRoleScore {
  return {
    title_score: 'STRONG',
    authority_score: 'STRONG',
    combined_score: 'STRONG',
    flags: []
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateOwnershipControlScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'STRONG';
}

function assessDenialRisks(_answers: Record<string, unknown>, _scores: CoreScores): DenialRisk[] {
  return [];
}

function runKBValidation(_scores: CoreScores, _cons: string, _bus: string): KBValidationResult {
  return {
    complete: true,
    consulate_profile_used: _cons,
    business_type_profile_used: _bus,
    kb_flags: [],
    dimensions_confirmed: ['substantiality_score'],
    dimensions_flagged: []
  };
}

// ---------------------------------------------------------------------------
// Step 3: generateFramingDecisions() — Real AI call via OpenRouter
// ---------------------------------------------------------------------------

interface FramingDecisionInput {
  operational_demand: string;
  applicant_evidence: string;
  connection: string;
  framing_instruction: string;
}

/**
 * Generate framing decisions via a focused, cheap AI call through OpenRouter.
 * This is NOT the big document generation call — it's a small structured call
 * whose only job is to identify genuine transferable-skill connections.
 *
 * Per CLAUDE_CONTEXT: OpenRouter for "app AI features" — ANTHROPIC_API_KEY
 * stays exclusive to generation-engine.ts.
 *
 * Error handling: if the call fails, returns empty array (Layer 2 backstop
 * handles this gracefully). Does NOT retry indefinitely or block generation.
 */
async function generateFramingDecisions(
  scores: CoreScores,
  _kbFlags: KBFlag[],
  _risks: DenialRisk[],
  answers: Record<string, unknown>,
  businessCategory: string,
  experienceScoring: ExperienceScoringResult
): Promise<FramingDecision[]> {
  // Only run framing call when experience is WEAK or CRITICAL
  // (the must-run case per Spec1 Category C)
  // Also run for ADEQUATE with notable gaps (few confirmed + many ABSENT)
  const shouldRun = scores.experience === 'WEAK' ||
    scores.experience === 'CRITICAL' ||
    (scores.experience === 'ADEQUATE' &&
     experienceScoring.confirmed_count <= 2 &&
     experienceScoring.dimensions.filter(d => d.score === 'ABSENT').length >= 3);

  if (!shouldRun) {
    // Strong or adequate with good coverage — no framing needed
    return [];
  }

  const categoryNeeds = getOperationalNeeds(businessCategory);
  if (!categoryNeeds) {
    console.warn(`[FRAMING] No operational needs for category: ${businessCategory}`);
    return [];
  }

  // Build applicant background summary
  const tabJText = getTabJText(answers);
  const followupText = getFollowupText(answers);

  const applicantBackground = [
    tabJText ? `Employment/Background Answers:\n${tabJText}` : '',
    followupText ? `Follow-up Responses:\n${followupText}` : '',
    `Education: ${answers['QA-55'] || answers['education'] || 'Not specified'}`,
    `Current Role: ${answers['QA-52'] || answers['current_role'] || 'Not specified'}`,
    `Years of Experience: ${answers['QA-53'] || answers['years_experience'] || 'Not specified'}`,
  ].filter(Boolean).join('\n\n');

  const operationalDemandsFormatted = categoryNeeds.operational_demands
    .map((d, i) => `${i + 1}. ${d.label}: ${d.description}`)
    .join('\n');

  const weakDimensions = experienceScoring.dimensions
    .filter(d => d.score === 'ABSENT' || d.score === 'INFERRED')
    .map(d => d.dimension)
    .join(', ');

  const systemPrompt = `You are analyzing an E-2 visa applicant's background to identify
genuine, honest connections between their experience and the
operational demands of the business they plan to run.

Your task is to find BRIDGE connections — places where the applicant's
actual background, even if indirect, maps to what this business needs.
Only include GENUINE connections supported by real facts. Never fabricate.`;

  const userMessage = `APPLICANT BACKGROUND:
${applicantBackground}

TARGET BUSINESS: ${categoryNeeds.category_name}

OPERATIONAL DEMANDS OF THIS BUSINESS:
${operationalDemandsFormatted}

EXPERIENCE DIMENSIONS SCORED:
${experienceScoring.dimensions.map(d => `  ${d.dimension}: ${d.score} — ${d.evidence}`).join('\n')}

EXPERIENCE GAPS IDENTIFIED (these are the dimensions that need creative framing):
${weakDimensions || 'None — applicant has strong coverage'}

TASK:
For each operational demand above, determine whether the applicant's
background contains a genuine, supportable connection — even if indirect
(e.g. household management, volunteer coordination, a different industry's
analogous function, military service, raising children, community leadership).

For each connection found, output:
{
  "operational_demand": "the specific demand label from above",
  "applicant_evidence": "the specific fact from their background that connects",
  "connection": "the specific skill or capability this demonstrates",
  "framing_instruction": "a 1-2 sentence instruction for how to write this into the document — following the BRIDGE pattern: 'My experience [X] directly prepares me to [Y] because [specific connection]'"
}

Only include GENUINE connections. If no honest connection exists for a given
demand, omit it entirely — do not fabricate connections.

Output a valid JSON array only. No other text. No markdown code fences.`;

  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      console.warn('[FRAMING] OPENROUTER_API_KEY not set — skipping framing call');
      return [];
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://e2go.app',
        'X-Title': 'E2Go Analysis Engine',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`[FRAMING] OpenRouter API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[FRAMING] Empty response from OpenRouter');
      return [];
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[FRAMING] No JSON array found in response:', content.slice(0, 200));
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as FramingDecisionInput[];

    // Convert to FramingDecision format
    return parsed.map((item) => ({
      area: `experience:${item.operational_demand}`,
      approach: item.framing_instruction,
      legal_basis: `Bridge: ${item.connection}`,
      priority: 'HIGH' as const,
    }));
  } catch (error) {
    // Non-fatal — Layer 2 backstop handles empty framing_decisions
    console.error('[FRAMING] Framing call failed:', error);
    return [];
  }
}

function assembleCaseBrief(
  appId: string,
  scores: CoreScores,
  marg: MarginalityScore,
  _risks: DenialRisk[],
  kb: KBValidationResult,
  framing: FramingDecision[],
  experienceScoring?: ExperienceScoringResult
): CaseBrief {
  // Compute overall score based on actual dimension coverage
  const dimensionScore = experienceScoring
    ? Math.round((experienceScoring.confirmed_count / Math.max(experienceScoring.applicable_count, 1)) * 100)
    : 85;

  // Determine if follow-up is needed per Spec1 Category B:
  // experience_score < ADEQUATE and follow_up_not_completed
  const followUpRequired = scores.experience === 'WEAK' || scores.experience === 'CRITICAL';

  // Generate follow-up questions for weak experience
  const followUpQuestions: string[] = [];
  if (followUpRequired && experienceScoring) {
    const absentDimensions = experienceScoring.dimensions
      .filter(d => d.score === 'ABSENT' || d.score === 'INFERRED')
      .map(d => d.dimension);
    if (absentDimensions.length > 0) {
      followUpQuestions.push(
        `The following experience dimensions were not found in the current data: ${absentDimensions.join(', ')}. Consider asking the applicant about related experiences.`
      );
    }
  }

  // Determine blocking issues
  const blockingIssues: string[] = [];
  if (scores.experience === 'CRITICAL') {
    blockingIssues.push('Experience score is CRITICAL — no confirmed dimensions found');
  }

  return {
    application_id: appId,
    generated_at: new Date().toISOString(),
    substantiality_score: scores.substantiality,
    fund_source_score: scores.fund_source,
    experience_score: scores.experience,
    marginality: marg,
    intent_score: scores.intent,
    executive_role: scores.executive_role,
    ownership_control_score: scores.ownership_control,
    denial_risks: _risks,
    critical_risks: _risks.filter(r => r.level === 'CRITICAL'),
    watch_risks: _risks.filter(r => r.level === 'WATCH'),
    kb_validation: {
      complete: kb.complete,
      consulate_profile_used: kb.consulate_profile_used,
      business_type_profile_used: kb.business_type_profile_used,
      kb_flags: kb.kb_flags,
      dimensions_confirmed: kb.dimensions_confirmed,
      dimensions_flagged: kb.dimensions_flagged,
    },
    framing_decisions: framing,
    follow_up_required: followUpRequired,
    follow_up_questions: followUpQuestions,
    overall_score: dimensionScore,
    generation_ready: scores.experience !== 'CRITICAL',
    blocking_issues: blockingIssues,
  };
}
