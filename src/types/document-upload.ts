// ============================================================================
// Document Upload & Extraction Types
// ============================================================================

export type UploadFileType = 'pdf' | 'docx' | 'xlsx' | 'csv';

export type DetectedDocumentType =
  | 'cover_letter'
  | 'business_plan'
  | 'source_of_funds'
  | 'biography'
  | 'ds160'
  | 'projections'
  | 'operating_agreement'
  | 'franchise_docs'
  | 'unknown';

export type ExtractionStatus = 'pending' | 'extracting' | 'completed' | 'failed';

export type Confidence = 'high' | 'medium' | 'low';

export type PreparationStatus = 'scratch' | 'partial' | 'near_complete';

// User-selectable document types for upload hint
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'cover_letter', label: 'Cover letter or draft' },
  { value: 'business_plan', label: 'Business plan' },
  { value: 'source_of_funds', label: 'Source of funds narrative' },
  { value: 'biography', label: 'Investor biography' },
  { value: 'ds160', label: 'DS-160 or prior visa form' },
  { value: 'projections', label: 'Financial projections (Excel/CSV)' },
  { value: 'operating_agreement', label: 'Operating agreement' },
  { value: 'franchise_docs', label: 'Franchise agreement or FDD' },
  { value: 'unknown', label: 'Other' },
] as const;

// What each document type pre-fills in the case file
export const DOCUMENT_TYPE_PREFILL_MAP: Record<string, string[]> = {
  cover_letter: ['story', 'business', 'investment', 'ties'],
  business_plan: ['business', 'projections', 'story'],
  source_of_funds: ['investment'],
  biography: ['qualifications', 'story'],
  ds160: ['story'],
  projections: ['business'],
  operating_agreement: ['business'],
  franchise_docs: ['business', 'investment'],
  unknown: [],
};

// Database record: application_documents
export interface ApplicationDocument {
  id: string;
  application_id: string;
  user_id: string;
  original_filename: string;
  file_type: UploadFileType;
  file_size_bytes: number | null;
  user_selected_document_type: string | null;
  detected_document_type: DetectedDocumentType | null;
  detection_confidence: Confidence | null;
  detection_reasoning: string | null;
  document_summary: string | null;
  fields_extracted: number;
  storage_path: string;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  created_at: string;
  extracted_at: string | null;
}

// Database record: document_discrepancies
export interface DocumentDiscrepancy {
  id: string;
  application_id: string;
  question_id: string;
  question_label: string | null;
  conflicting_values: DiscrepancyValue[];
  resolved_value: string | null;
  resolved_source: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface DiscrepancyValue {
  value: string;
  display_value: string;
  source_document: string;
  source_document_type: DetectedDocumentType;
  source_quote: string;
  confidence: Confidence;
}

// AI classification response
export interface ClassificationResult {
  detected_type: DetectedDocumentType;
  confidence: Confidence;
  reasoning: string;
}

// AI extraction response
export interface ExtractionResult {
  extracted_fields: ExtractedField[];
  document_summary: string;
}

export interface ExtractedField {
  question_id: string;
  value: string;
  display_value: string;
  confidence: Confidence;
  source_quote: string;
}

// Gap report
export interface GapReport {
  totalQuestions: number;
  filledCount: number;
  sectionCoverage: Record<string, SectionCoverage>;
  criticalGaps: CriticalGap[];
  documentSummaries: DocumentSummary[];
}

export interface SectionCoverage {
  total: number;
  filled: number;
  percentage: number;
}

export interface CriticalGap {
  questionId: string;
  label: string;
  reason: string;
  severity: 'high' | 'medium';
}

export interface DocumentSummary {
  documentId: string;
  filename: string;
  detectedType: DetectedDocumentType | null;
  fieldsExtracted: number;
  summary: string | null;
}

// SSE event types for extraction streaming
export type ExtractionSSEEvent =
  | { event: 'document_start'; data: { documentId: string; filename: string } }
  | { event: 'document_classified'; data: { documentId: string; type: DetectedDocumentType; confidence: Confidence } }
  | { event: 'document_extracted'; data: { documentId: string; fieldsFound: number } }
  | { event: 'document_complete'; data: { documentId: string } }
  | { event: 'document_error'; data: { documentId: string; message: string } }
  | { event: 'discrepancies_found'; data: { count: number } }
  | { event: 'extraction_complete'; data: { gapReport: GapReport } }
  | { event: 'error'; data: { message: string } };

// Upload API request
export interface UploadRequest {
  applicationId: string;
  documentTypes: Record<string, string>; // filename -> user-selected type
}

// Upload API response
export interface UploadResponse {
  documents: Array<{
    id: string;
    filename: string;
    storagePath: string;
  }>;
}

// Resolve discrepancy request
export interface ResolveDiscrepancyRequest {
  discrepancyId: string;
  applicationId: string;
  resolvedValue: string;
}

// File validation result
export interface FileValidation {
  valid: boolean;
  error?: string;
  fileType?: UploadFileType;
}

// Constants
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_SESSION = 8;
export const MAX_TOKENS_PER_DOCUMENT = 8000;
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv'] as const;
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const;
