export type DocumentType =
  | 'cover_letter'
  | 'source_of_funds'
  | 'investment_proof'
  | 'business_plan'
  | 'qualifications'
  | 'ds160_reference';

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial';

export type DocumentStatus =
  | 'queued'
  | 'generating'
  | 'under_review'
  | 'approved'
  | 'locked'
  | 'failed';

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
  7: 'Gap Analysis',
  8: 'Repetition Check',
  9: 'Consistency Check',
  10: 'AI Detection Audit',
  11: 'Humanization Pass',
  12: 'Metadata Sanitization',
  13: 'Quality Gate',
  14: 'Acknowledgment Gate',
  15: 'Preview Unlocked',
} as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cover_letter: 'Cover Letter',
  source_of_funds: 'Source of Funds Statement',
  investment_proof: 'Investment Proof',
  business_plan: 'Business Plan',
  qualifications: 'Qualifications Summary',
  ds160_reference: 'DS-160 Reference',
};

export const DOCUMENT_TYPE_TABS: Record<DocumentType, string> = {
  cover_letter: 'Tab D',
  source_of_funds: 'Tab H',
  investment_proof: 'Tab F',
  business_plan: 'Tab K',
  qualifications: 'Tab J',
  ds160_reference: 'Tab A',
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
  voice_profile: string;
  consulate_post: string;
  document_type: DocumentType;
  follow_up_responses: Record<string, unknown>;
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
  currentDocumentText?: string;
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