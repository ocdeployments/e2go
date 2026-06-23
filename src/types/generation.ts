export type DocumentType =
  // Existing core documents (generated in sequential pipeline)
  | 'cover_letter'
  | 'source_of_funds'
  | 'investment_proof'
  | 'business_plan'
  | 'qualifications'
  | 'ds160_reference'
  | 'visa_category'
  | 'nonimmigrant_intent'
  // DOC-3: Marginality & Declarations (conditional on application data)
  | 'marginality_rebuttal'
  | 'declaration_principal'
  | 'declaration_spouse'
  // DOC-4: Financial evidence documents
  | 'fund_flow_chronology'
  | 'net_worth_statement'
  | 'property_portfolio'
  // DOC-5: Employment resumes
  | 'resume_principal'
  | 'resume_spouse';

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'partial';

export type DocumentStatus =
  | 'queued'
  | 'generating'
  | 'generated'
  | 'awaiting_approval'
  | 'under_review'
  | 'approved'
  | 'locked'
  | 'failed'
  | 'revision_requested';

export type GenerationStepStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed';

export type ChangeType =
  | 'wording'
  | 'additional_info'
  | 'factual_correction';

export const GENERATION_STEP_LABELS: Record<number, string> = {
  1: 'Cover Letter',
  2: 'Source of Funds',
  3: 'Investment Proof',
  4: 'Business Plan',
  5: 'Qualifications',
  6: 'DS-160 Reference',
  7: 'Visa Category Letter',
  8: 'Non-immigrant Intent',
  9: 'Gap Analysis',
  10: 'Repetition Check',
  11: 'Consistency Check',
  12: 'AI Detection Audit',
  13: 'Humanization Pass',
  14: 'Metadata Sanitization',
  15: 'Quality Gate',
  16: 'Acknowledgment Gate',
  17: 'Preview Unlocked',
} as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cover_letter: 'Cover Letter',
  source_of_funds: 'Source of Funds Statement',
  investment_proof: 'Investment Evidence',
  business_plan: 'Business Plan',
  qualifications: 'Investor Biography & Qualifications',
  ds160_reference: 'DS-156E / DS-160 Reference',
  visa_category: 'Substantiality Memorandum',
  nonimmigrant_intent: 'Non-immigrant Intent Statement',
  marginality_rebuttal: 'Non-Marginality Rebuttal',
  declaration_principal: 'Principal Applicant Declaration',
  declaration_spouse: 'Spouse Declaration',
  fund_flow_chronology: 'Fund Flow Chronology',
  net_worth_statement: 'Consolidated Net Worth Statement',
  property_portfolio: 'Property Portfolio Summary',
  resume_principal: 'Principal Applicant Resume',
  resume_spouse: 'Spouse Resume',
};

export const DOCUMENT_TYPE_TABS: Record<DocumentType, string> = {
  cover_letter: 'Tab D',
  source_of_funds: 'Tab B',
  investment_proof: 'Tab B',
  business_plan: 'Tab C',
  qualifications: 'Tab D',
  ds160_reference: 'Tab D / E',
  visa_category: 'Tab C',
  nonimmigrant_intent: 'Tab G',
  marginality_rebuttal: 'Tab C',
  declaration_principal: 'Tab G',
  declaration_spouse: 'Tab G',
  fund_flow_chronology: 'Tab B',
  net_worth_statement: 'Tab B',
  property_portfolio: 'Tab F',
  resume_principal: 'Tab D',
  resume_spouse: 'Tab E',
};

export interface GenerationStep {
  id: number;
  label: string;
  status: GenerationStepStatus;
}

export interface GenerationJob {
  id: string;
  application_id: string;
  user_id: string;
  status: GenerationJobStatus;
  current_step: number;
  current_step_label: string;
  total_steps: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: string;
  job_id: string;
  application_id: string;
  user_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  word_count: number | null;
  page_estimate: number | null;
  revision_count: number;
  revision_notes: RevisionNote[];
  ai_detection_score: number | null;
  ai_detection_passed: boolean | null;
  quality_gate_passed: boolean | null;
  quality_gate_notes: string[];
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionNote {
  timestamp: string;
  reason: string;
  description: string;
  credit_cost: number;
}

export interface RevisionCredit {
  id: string;
  user_id: string;
  application_id: string;
  credits_remaining: number;
  credits_used: number;
  updated_at: string;
}

export interface DocumentChangeLog {
  id: string;
  document_id: string;
  application_id: string;
  user_id: string;
  change_type: ChangeType;
  change_description: string;
  created_at: string;
}

export interface GenerationLogEntry {
  id: string;
  application_id: string;
  document_type: string;
  stage: string;
  attempt_number: number;
  ai_detection_score: number | null;
  passed: boolean | null;
  flagged_sections: string[];
  notes: string | null;
  created_at: string;
}

export interface GenerationPayload {
  system_prompt: string;
  case_brief: Record<string, unknown>;
  module_3_answers: Record<string, unknown>;
  investment_breakdown: InvestmentBreakdownData;
  voice_profile: string;
  consulate_post: string;
  document_type: DocumentType;
  follow_up_responses: Record<string, unknown>;
  qfn_investor_profile?: string;
  gap_analysis_context?: string;
}

export interface InvestmentBreakdownData {
  total_invested: number | null;
  total_business_cost: number | null;
  franchise_fee: number | null;
  leasehold_improvements: number | null;
  equipment_technology: number | null;
  educational_materials: number | null;
  working_capital: number | null;
  professional_fees: number | null;
  marketing_launch: number | null;
  at_risk_amount: number | null;
}

export interface ConsistencyIssue {
  field: string;
  documents_affected: string[];
  values_found: Record<string, string>;
}

export interface ConsistencyResult {
  passed: boolean;
  issues: ConsistencyIssue[];
}

export interface QualityResult {
  passed: boolean;
  failures: string[];
  word_count: number;
  page_estimate: number;
  has_unverified_markers: boolean;
  has_template_placeholders: boolean;
  has_legal_conclusions: boolean;
}

export interface SSEProgressMessage {
  step: number;
  stepLabel: string;
  status: string;
  documentsComplete: number;
  totalDocuments: number;
  currentDocument?: string;
  currentDocumentType?: string;
  currentDocumentText?: string;
  currentDocumentPreview?: string;
  wordCount?: number;
  pageEstimate?: number;
  awaitingApproval?: boolean;
  error?: string;
}

export interface StartGenerationResponse {
  jobId: string;
  message: string;
}

export interface DocumentListResponse {
  applicationId: string;
  documents: GeneratedDocument[];
  credits: RevisionCredit | null;
}