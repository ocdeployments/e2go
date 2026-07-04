// Human-readable labels for uploaded_documents.doc_type — the current live
// document taxonomy (replaces the legacy application_documents detected_document_type set).
export const UPLOADED_DOC_TYPE_LABELS: Record<string, string> = {
  resume: 'Resume / CV',
  fdd: 'Franchise Disclosure Document',
  investment_records: 'Bank / Investment Records',
  business_plan: 'Business Plan',
  financial_statement: 'Personal Financial Statement',
  territory_analysis: 'Territory / Market Analysis',
  passport: 'Passport',
  franchise_agreement: 'Franchise Agreement (signed)',
  lease_agreement: 'Lease Agreement',
  acquisition_financials: 'Acquisition Financials',
  ds160: 'DS-160 Confirmation',
  cover_letter: 'Petition Cover Letter',
  organizational_document: 'Entity / Organizational Document',
  government_form: 'Government Form (G-28…)',
  birth_certificate: 'Birth Certificate',
  marriage_certificate: 'Marriage Certificate',
  general_supporting_document: 'Supporting Document',
};

export function uploadedDocTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Document';
  return UPLOADED_DOC_TYPE_LABELS[value] ?? value;
}

// Builds a short human-readable summary line from an extraction JSON blob —
// uploaded_documents has no document_summary column, only extracted_json.
export function summarizeExtractedJson(extracted: Record<string, unknown> | null | undefined, maxChars = 220): string {
  if (!extracted) return '';
  const parts = Object.entries(extracted)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${String(v)}`);
  const joined = parts.join('; ');
  return joined.length > maxChars ? joined.slice(0, maxChars) + '…' : joined;
}
