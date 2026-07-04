// Interview Simulator Types
// Generated: June 5, 2026

export interface SimulatorContext {
  applicationId: string;
  userId: string;
  // Business details
  businessName: string;
  operatingName: string | null;
  businessCategory: string;
  businessRoute: string;
  targetState: string | null;
  operationalStatus: 'operational' | 'pre_start' | 'not_yet_formed';
  // Investment details
  investmentAmount: number;
  investmentSources: InvestmentSource[];
  fundFlowEvents: FundFlowEvent[];
  // Financial projections
  revenueYear1: number;
  revenueYear3: number;
  householdIncomeNeed: number;
  // Employment
  employeeCountCurrent: number;
  employeeCountYear1: number;
  employeeRoles: string[];
  // Role
  investorRole: string;
  managementActivities: string[];
  // Risk flags
  priorVisaDenial: boolean;
  priorDenialDetails: string | null;
  immigrantIntentRisk: 'low' | 'moderate' | 'high';
  // Analysis engine scores (if available)
  substantialityScore: number | null;
  marginalityScore: number | null;
  developDirectScore: number | null;
  denialRiskFlags: string[];
  // EU-2: archetype + dimension scores from case_profiles (null when profile not yet built)
  archetype: string | null;
  sourceOfFundsScore: number | null;
  managementRoleScore: number | null;
  businessPlanScore: number | null;
  // FDD priority questions for franchise applicants (fetched from fdd_analyses)
  fddPriorityQuestions?: { text: string; triggered_by: string; importance: string }[];
  // Case Intelligence Core — the CPU's strongest honest E-2 narrative and which
  // figures to foreground vs which denial risks to pre-empt (null until built)
  caseTheoryNarrative: string | null;
  caseTheoryNumbersStrategy: unknown | null;
  // Application metadata
  applicationType: string;
  createdAt: string;
  // Partnership (complete_partnership) co-investor data — null when solo or
  // when Investor 2 hasn't filled in the corresponding Partner Access field
  p2Role: string | null;
  p2Sof: string | null;
  p2Quals: string | null;
}

export interface InvestmentSource {
  sourceType: 'savings' | 'property_sale' | 'rrsp_withdrawal' | 'loan' | 'gift' | 'inheritance' | 'other';
  amount: number;
  description: string;
}

export interface FundFlowEvent {
  date: string;
  description: string;
  amount: number;
  fromAccount: string;
  toAccount: string;
}

export interface Question {
  id: string;
  text: string;
  category: 'universal' | 'weak_point_probe' | 'business_type' | 'investment_source' | 'profile_flag' | 'archetype_probe' | 'gap_probe' | 'fdd_probe';
  context?: string;
  relatesToField?: string;
}

export interface DeliveryNote {
  type: 'fillers' | 'brevity' | 'hedging' | 'complex_sentences' | 'high_hedge_ratio' | 'choppy';
  detail: string;
}

export interface AnswerEvaluation {
  rating: 'strong' | 'weak' | 'inconsistent';
  severity?: 'fatal' | 'significant' | 'cosmetic';
  score?: number;
  feedback: string;
  specificSuggestion: string;
  documentReference: string | null;
  deliveryNotes?: DeliveryNote[];
}

export interface CompletedSession {
  id: string;
  applicationId: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  sessionNumber: number;
  mode: 'text' | 'voice';
  readinessIndicator: 'ready' | 'nearly_ready' | 'needs_work';
  questions: SessionQuestion[];
}

export interface SessionQuestion {
  questionId: string;
  questionText: string;
  answerText: string;
  rating: 'strong' | 'weak' | 'inconsistent';
  score?: number;
  feedback: string;
  specificSuggestion: string;
  deliveryNotes?: DeliveryNote[];
}

export interface QuestionCoaching {
  questionId: string;
  severity?: 'fatal' | 'significant' | 'cosmetic';
  whatOfficerExpected: string;
  whatWasMissing: string;
  keyPoints: string[];
  modelAnswer: string;
  documentReference: string | null;
}

export interface CoachingSummary {
  strongAnswers: { question: string; note: string }[];
  needsWork: { questionId: string; question: string; suggestion: string; originalAnswer: string }[];
  inconsistencies: { questionId: string; question: string; filed: string; spoken: string; originalAnswer: string }[];
  weakPointsAtRisk: string[];
  readinessIndicator: 'ready' | 'nearly_ready' | 'needs_work';
  detailedCoaching?: QuestionCoaching[];
  deliveryFlags?: { questionId: string; questionText: string; notes: DeliveryNote[] }[];
  top3NextSession?: string[];
}

export interface SimulatorSession {
  id: string;
  application_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  session_number: number;
  mode: 'text' | 'voice';
  readiness_indicator: string | null;
  questions_asked: number;
  strong_count: number;
  needs_work_count: number;
  inconsistency_count: number;
}

export interface SimulatorAnswer {
  id: string;
  session_id: string;
  question_id: string;
  question_text: string;
  answer_text: string;
  answer_audio_url: string | null;
  rating: 'strong' | 'weak' | 'inconsistent' | null;
  feedback: string | null;
  specific_suggestion: string | null;
  document_reference: string | null;
  answered_at: string;
}