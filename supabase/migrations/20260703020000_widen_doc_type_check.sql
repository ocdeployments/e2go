-- Add ds160, cover_letter, organizational_document, and general_supporting_document
-- to uploaded_documents.doc_type — these are new extraction categories added to
-- close a data-loss gap where documents not matching any of the prior 13 types
-- (e.g. a DS-160 or an attorney's petition cover letter) silently fell back to
-- the 'resume' schema and extracted almost nothing useful.
ALTER TABLE uploaded_documents DROP CONSTRAINT IF EXISTS uploaded_documents_doc_type_check;
ALTER TABLE uploaded_documents ADD CONSTRAINT uploaded_documents_doc_type_check
  CHECK (doc_type IN (
    'resume', 'fdd', 'investment_records', 'territory_analysis', 'business_plan',
    'financial_statement', 'passport', 'franchise_agreement', 'lease_agreement',
    'acquisition_financials', 'government_form', 'birth_certificate', 'marriage_certificate',
    'ds160', 'cover_letter', 'organizational_document', 'general_supporting_document'
  ));
