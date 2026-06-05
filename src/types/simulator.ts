// Interview Simulator Types
// Generated: June 5, 2026

export interface SimulatorContext {
  applicationId: string;
  userId: string;
  // Business details
  businessName: string;
  businessCategory: string;
  businessRoute: string;
  targetState: string;
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
  // Application metadata
  applicationType: string;
  createdAt: string;
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
  category: 'universal' | 'weak_point_probe' | 'business_type' | 'investment_source' | 'profile_flag';
  context?: string;
  relatesToField?: string;
}

export interface AnswerEvaluation {
  rating: 'strong' | 'weak' | 'inconsistent';
  feedback: string;
  specificSuggestion: string;
  documentReference: string | null;
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
  feedback: string;
  specificSuggestion: string;
}

export interface CoachingSummary {
  strongAnswers: { question: string; note: string }[];
  needsWork: { question: string; suggestion: string }[];
  inconsistencies: { question: string; filed: string; spoken: string }[];
  weakPointsAtRisk: string[];
  readinessIndicator: 'ready' | 'nearly_ready' | 'needs_work';
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