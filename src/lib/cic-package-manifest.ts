/**
 * CIC-P.1 — Package Manifest
 *
 * Produces a numbered tab list for the complete E-2 submission package.
 * Merges three sources:
 *   1. generated_documents — what the system has generated (or is generating)
 *   2. uploaded_documents  — what the client has uploaded
 *   3. required_exhibits   — standard E-2 client-provided docs implied by the case
 *                            that haven't been uploaded yet → status: 'outstanding'
 *
 * The manifest drives:
 *   - The index page (Tab 0) rendered inside the final PDF
 *   - The client-facing checklist on /documents showing what's still missing
 *   - CIC-P.4 package assembly (only certified/uploaded tabs are included)
 */

import { createClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/types/generation';
import { DOCUMENT_TYPE_LABELS } from '@/types/generation';

export type ManifestTabStatus =
  | 'certified'        // client approved this generated document
  | 'awaiting_client'  // generated, verifier passed, waiting for client to certify
  | 'generating'       // generation pipeline is running
  | 'draft'            // generated but not yet through verifier
  | 'uploaded'         // client-provided document is in uploaded_documents
  | 'outstanding';     // required but not yet provided or generated

export type ManifestTabSource =
  | 'generated'         // produced by the generation engine
  | 'client_provided'   // uploaded by the client
  | 'auto';             // cover page / index — assembled at package time

export interface ManifestTab {
  tabNumber: number;
  label: string;
  description: string;
  source: ManifestTabSource;
  status: ManifestTabStatus;
  // For generated documents
  documentType?: DocumentType;
  clientCertified?: boolean;
  verifierOverall?: 'pass' | 'fail' | 'pass_with_notes' | null;
  // For client-provided documents
  uploadedDocType?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface PackageManifest {
  applicationId: string;
  tabs: ManifestTab[];
  totalTabs: number;
  certifiedCount: number;
  uploadedCount: number;
  outstandingCount: number;
  packageReady: boolean; // true when zero outstanding and all generated docs certified
}

// Canonical E-2 submission tab order.
// Each entry defines one or more document slots in sequence.
// Generated slots: linked to a DocumentType.
// Client-provided slots: linked to an uploaded_documents.doc_type.
interface TabTemplate {
  label: string;
  description: string;
  source: ManifestTabSource;
  documentType?: DocumentType;       // generated doc
  uploadedDocTypes?: string[];       // client-provided: any of these doc_types satisfies the slot
  alwaysRequired: boolean;           // false = only show if the doc exists (conditional docs)
  conditionalOn?: string;            // answer key that must be truthy to include (e.g. 'M3-L-01')
}

const TAB_TEMPLATES: TabTemplate[] = [
  // Auto-generated at assembly time — always present
  { label: 'Cover Page',              description: 'Application cover page with applicant name, nationality, consulate, and date', source: 'auto',             alwaysRequired: true },
  { label: 'Table of Contents',       description: 'Full index of all tabs in this submission package',                            source: 'auto',             alwaysRequired: true },

  // Generated documents — core
  { label: 'Cover Letter',            description: 'Attorney cover letter presenting the full E-2 argument to the consular officer',  source: 'generated', documentType: 'cover_letter',         alwaysRequired: true },
  { label: 'Source of Funds Statement', description: 'Detailed narrative tracing the lawful origin and transfer of investment funds', source: 'generated', documentType: 'source_of_funds',       alwaysRequired: true },
  { label: 'Business Plan',           description: 'Comprehensive business plan including financials, staffing, and market analysis',  source: 'generated', documentType: 'business_plan',          alwaysRequired: true },
  { label: 'Investor Qualifications', description: 'Investor biography establishing management capacity and transferable skills',      source: 'generated', documentType: 'qualifications',          alwaysRequired: true },
  { label: 'Principal Resume',        description: 'Full professional resume of the principal applicant',                             source: 'generated', documentType: 'resume_principal',        alwaysRequired: true },
  { label: 'Principal Declaration',   description: 'Sworn declaration by the principal applicant confirming all facts',               source: 'generated', documentType: 'declaration_principal',   alwaysRequired: true },
  { label: 'Non-immigrant Intent',    description: 'Statement of non-immigrant intent confirming the applicant intends to depart',    source: 'generated', documentType: 'nonimmigrant_intent',     alwaysRequired: true },
  { label: 'Org Chart / Management Structure', description: 'Ownership chart, reporting lines, and the principal\'s decision authority', source: 'generated', documentType: 'org_chart',              alwaysRequired: true },
  { label: 'Corporate Documents Guide', description: 'Index of entity formation documents — articles, operating agreement, EIN, certificates, bank resolution', source: 'generated', documentType: 'corporate_documents_guide', alwaysRequired: true },

  // Generated documents — conditional
  { label: 'Non-Marginality Rebuttal', description: 'Detailed rebuttal demonstrating the business creates jobs and is not marginal',  source: 'generated', documentType: 'marginality_rebuttal',  alwaysRequired: false },
  { label: 'Fund Flow Chronology',     description: 'Chronological narrative of every fund movement from source to U.S. business',   source: 'generated', documentType: 'fund_flow_chronology',   alwaysRequired: false },
  { label: 'Net Worth Statement',      description: 'Consolidated statement of applicant net worth',                                  source: 'generated', documentType: 'net_worth_statement',     alwaysRequired: false },
  { label: 'Spouse Declaration',       description: 'Sworn declaration by the accompanying spouse',                                  source: 'generated', documentType: 'declaration_spouse',      alwaysRequired: false, conditionalOn: 'M3-L-01' },
  { label: 'Spouse Resume',            description: 'Professional resume of the accompanying spouse',                                source: 'generated', documentType: 'resume_spouse',           alwaysRequired: false, conditionalOn: 'M3-L-01' },
  { label: 'Property Portfolio',       description: 'Summary of property sold as source of investment funds',                        source: 'generated', documentType: 'property_portfolio',      alwaysRequired: false, conditionalOn: 'M3-F-05' },
  { label: 'Investment Evidence',      description: 'At-risk analysis for staged or committed-but-unspent investment funds',         source: 'generated', documentType: 'investment_proof',        alwaysRequired: false },
  { label: 'Financial Assets Portfolio', description: 'Non-real-estate financial assets — registered plans, securities, cryptocurrency', source: 'generated', documentType: 'financial_assets_portfolio', alwaysRequired: false, conditionalOn: 'M3-F-05' },
  { label: 'Lease / Premises Summary', description: 'Premises address, lease term vs. visa horizon, rent-to-revenue cross-check, buildout status', source: 'generated', documentType: 'lease_premises_summary', alwaysRequired: false },

  // Client-provided — always required
  { label: 'Passport & Treaty Nationality', description: 'Valid passport (all pages) + evidence of treaty country citizenship',     source: 'client_provided', uploadedDocTypes: ['passport'],                   alwaysRequired: true },
  { label: 'DS-160 / Application Forms',    description: 'Completed DS-160 confirmation page and any supporting forms',            source: 'client_provided', uploadedDocTypes: ['government_form'],             alwaysRequired: true },
  { label: 'Franchise Agreement',           description: 'Signed franchise agreement with the franchisor',                         source: 'client_provided', uploadedDocTypes: ['franchise_agreement'],         alwaysRequired: false },
  { label: 'Franchise Disclosure Document', description: 'Current FDD received from franchisor (Items 5, 7, 19 particularly)',     source: 'client_provided', uploadedDocTypes: ['fdd'],                         alwaysRequired: false },
  { label: 'Investment & Financial Records', description: 'Bank statements, wire transfers, and investment evidence',              source: 'client_provided', uploadedDocTypes: ['investment_records','financial_statement'], alwaysRequired: true },
  { label: 'Lease Agreement / LOI',         description: 'Signed commercial lease or letter of intent for the business premises',  source: 'client_provided', uploadedDocTypes: ['lease_agreement'],            alwaysRequired: false },
  { label: 'Business Records',              description: 'Business plan, financials, or market research provided by client',       source: 'client_provided', uploadedDocTypes: ['business_plan'],              alwaysRequired: false },
  { label: 'Supporting Evidence',           description: 'Additional supporting documents provided by the client',                 source: 'client_provided', uploadedDocTypes: ['territory_analysis','acquisition_financials'], alwaysRequired: false },
];

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function buildPackageManifest(applicationId: string): Promise<PackageManifest> {
  const supabase = serviceClient();

  // Fetch all three data sources in parallel
  const [genResult, uploadResult, answerResult] = await Promise.all([
    supabase
      .from('generated_documents')
      .select('document_type, status, client_certified, certified_at, verifier_result')
      .eq('application_id', applicationId),
    supabase
      .from('uploaded_documents')
      .select('doc_type, file_name, created_at, extraction_status')
      .eq('application_id', applicationId),
    supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', applicationId)
      .in('question_key', ['M3-L-01', 'M3-F-05']),
  ]);

  // Index generated docs by document_type
  type GenDocRow = { document_type: string; status: string; client_certified: boolean | null; certified_at: string | null; verifier_result: Record<string, unknown> | null };
  const genDocs = new Map<string, GenDocRow>();
  for (const row of (genResult.data ?? [])) {
    genDocs.set((row as GenDocRow).document_type, row as GenDocRow);
  }

  // Index uploaded docs by doc_type (may have multiple per type — take most recent)
  type UploadRow = { doc_type: string; file_name: string; created_at: string; extraction_status: string };
  const uploads = new Map<string, UploadRow>();
  for (const row of (uploadResult.data ?? []) as UploadRow[]) {
    const existing = uploads.get(row.doc_type);
    if (!existing || row.created_at > existing.created_at) {
      uploads.set(row.doc_type, row);
    }
  }

  // Answer flags for conditional documents
  const answers = new Map<string, string>();
  for (const row of (answerResult.data ?? []) as { question_key: string; answer_value: string }[]) {
    answers.set(row.question_key, row.answer_value);
  }

  const tabs: ManifestTab[] = [];
  let tabNumber = 0;

  for (const template of TAB_TEMPLATES) {
    // Skip conditional templates whose trigger answer is absent/falsy
    if (template.conditionalOn) {
      const val = answers.get(template.conditionalOn);
      if (!val || val === 'no' || val === 'false') {
        // Still include if the generated doc actually exists (was generated before condition changed)
        const genDoc = template.documentType ? genDocs.get(template.documentType) : undefined;
        if (!genDoc) continue;
      }
    }

    if (template.source === 'auto') {
      tabNumber++;
      tabs.push({
        tabNumber,
        label: template.label,
        description: template.description,
        source: 'auto',
        status: 'outstanding', // assembled at package time — not available yet
      });
      continue;
    }

    if (template.source === 'generated' && template.documentType) {
      const genDoc = genDocs.get(template.documentType);

      // Skip non-required docs that haven't been generated yet
      if (!template.alwaysRequired && !genDoc) continue;

      tabNumber++;
      let status: ManifestTabStatus = 'outstanding';
      let clientCertified = false;
      let verifierOverall: ManifestTab['verifierOverall'] = null;

      if (genDoc) {
        clientCertified = Boolean(genDoc.client_certified);
        const vr = genDoc.verifier_result as { overall?: string } | null;
        verifierOverall = (vr?.overall as ManifestTab['verifierOverall']) ?? null;

        if (clientCertified) {
          status = 'certified';
        } else if (genDoc.status === 'awaiting_approval' || genDoc.status === 'approved') {
          status = 'awaiting_client';
        } else if (genDoc.status === 'generating') {
          status = 'generating';
        } else if (genDoc.status === 'queued') {
          status = 'outstanding';
        } else {
          status = 'draft';
        }
      }

      tabs.push({
        tabNumber,
        label: template.documentType
          ? (DOCUMENT_TYPE_LABELS[template.documentType] ?? template.label)
          : template.label,
        description: template.description,
        source: 'generated',
        status,
        documentType: template.documentType,
        clientCertified,
        verifierOverall,
      });
      continue;
    }

    if (template.source === 'client_provided' && template.uploadedDocTypes) {
      // Find the best matching uploaded document
      const uploadedDoc = template.uploadedDocTypes
        .map(t => uploads.get(t))
        .find(Boolean);

      // Skip non-required client docs with no upload
      if (!template.alwaysRequired && !uploadedDoc) continue;

      tabNumber++;
      tabs.push({
        tabNumber,
        label: template.label,
        description: template.description,
        source: 'client_provided',
        status: uploadedDoc ? 'uploaded' : 'outstanding',
        uploadedDocType: uploadedDoc?.doc_type,
        fileName: uploadedDoc?.file_name,
        uploadedAt: uploadedDoc?.created_at,
      });
    }
  }

  const certifiedCount  = tabs.filter(t => t.status === 'certified').length;
  const uploadedCount   = tabs.filter(t => t.status === 'uploaded').length;
  const outstandingCount = tabs.filter(t => t.status === 'outstanding').length;
  // Package is ready when: no outstanding items AND all generated docs are certified
  const generatedTabs   = tabs.filter(t => t.source === 'generated');
  const packageReady    = outstandingCount === 0 && generatedTabs.every(t => t.status === 'certified');

  return {
    applicationId,
    tabs,
    totalTabs: tabs.length,
    certifiedCount,
    uploadedCount,
    outstandingCount,
    packageReady,
  };
}
