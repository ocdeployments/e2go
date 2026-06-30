/**
 * CIC-P.5 — Change Impact Tracker
 *
 * When a client uploads a new document, buildCaseIntelligence() re-runs and may
 * produce a new case_theory with different dimension verdicts or directives.
 * This module compares the new theory against the snapshot embedded in each
 * generated document's verifier_result and determines which documents are now
 * stale — and exactly why.
 *
 * The output is stored on case_theory.impact_report (jsonb) and surfaced to the
 * client on /documents as a targeted "these documents need regeneration" notice.
 * Only generated documents that are still in awaiting_client / certified state
 * are flagged — documents already queued for regeneration are skipped.
 *
 * DOC_TYPE_DIMENSIONS mirrors the mapping in generation-engine.ts and cic-verifier.ts:
 * each document type is responsible for a subset of the 9 dimensions. A verdict
 * change in a dimension only affects documents that cover that dimension.
 */

import { createClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/types/generation';
import { DOCUMENT_TYPE_LABELS } from '@/types/generation';

// ── Types ────────────────────────────────────────────────────────────────────

type Dimension =
  | 'source_of_funds' | 'investment' | 'business' | 'franchise'
  | 'location' | 'background' | 'identity' | 'operations' | 'other';

export interface ImpactedDocument {
  documentType: DocumentType;
  label: string;
  reasons: string[];                // what changed that affects this doc
  changedDimensions: Dimension[];   // which dimensions triggered the impact
  previousVerdict: string | null;   // e.g. "weak" → "proven"
  newVerdict: string | null;
  urgency: 'high' | 'medium' | 'low';
}

export interface ChangeImpactReport {
  triggeredByDocType: string;       // the uploaded_documents.doc_type that caused the re-run
  impactedDocuments: ImpactedDocument[];
  safeDocuments: string[];          // document_types that are unaffected
  totalImpacted: number;
  hasHighUrgency: boolean;
  summary: string;                  // human-readable one-liner for the client UI
  generatedAt: string;
}

// ── Dimension → doc type mapping (canonical) ─────────────────────────────────

const DOC_TYPE_DIMENSIONS: Partial<Record<DocumentType, Dimension[]>> = {
  cover_letter:          ['source_of_funds','investment','business','franchise','location','background','identity','operations','other'],
  source_of_funds:       ['source_of_funds', 'investment'],
  fund_flow_chronology:  ['source_of_funds'],
  net_worth_statement:   ['source_of_funds', 'investment'],
  investment_proof:      ['investment', 'source_of_funds'],
  property_portfolio:    ['source_of_funds'],
  gift_letter:           ['source_of_funds'],
  business_plan:         ['business', 'investment', 'operations', 'franchise', 'location'],
  marginality_rebuttal:  ['business', 'investment', 'operations'],
  visa_category:         ['investment', 'business'],
  qualifications:        ['background', 'business', 'franchise'],
  resume_principal:      ['background', 'business'],
  resume_spouse:         ['background'],
  declaration_principal: ['identity', 'other'],
  declaration_spouse:    ['identity'],
  nonimmigrant_intent:   ['other', 'identity'],
  ds160_reference:       ['identity', 'other'],
};

// ── Urgency scoring ───────────────────────────────────────────────────────────

// These dimension changes materially affect the legal argument → high urgency
const HIGH_URGENCY_DIMENSIONS: Dimension[] = ['source_of_funds', 'investment', 'business', 'franchise'];

function computeUrgency(changedDimensions: Dimension[], verdictShift: string): 'high' | 'medium' | 'low' {
  if (changedDimensions.some(d => HIGH_URGENCY_DIMENSIONS.includes(d))) return 'high';
  if (verdictShift.includes('contradicted') || verdictShift.includes('proven')) return 'medium';
  return 'low';
}

// ── Verdict comparison ────────────────────────────────────────────────────────

interface DimensionVerdict {
  status: string;
  evidenceSummary?: string;
  gap?: string | null;
}

function verdictChanged(
  prev: DimensionVerdict | undefined,
  next: DimensionVerdict | undefined
): boolean {
  if (!prev && !next) return false;
  if (!prev || !next) return true;   // appeared or disappeared
  return prev.status !== next.status;
}

function describeChange(
  dimension: Dimension,
  prev: DimensionVerdict | undefined,
  next: DimensionVerdict | undefined,
): string {
  const dim = dimension.replace(/_/g, ' ');
  if (!prev && next) return `${dim}: new evidence added (${next.status})`;
  if (prev && !next) return `${dim}: evidence removed`;
  if (prev && next) {
    const shift = `${prev.status} → ${next.status}`;
    if (next.status === 'proven') return `${dim}: evidence strengthened (${shift}) — this dimension can now be more assertively argued`;
    if (next.status === 'contradicted') return `${dim}: new document contradicts prior evidence (${shift}) — arguments must be revised`;
    if (next.status === 'weak' && prev.status === 'proven') return `${dim}: evidence weakened (${shift}) — claims need softening`;
    return `${dim}: verdict changed (${shift})`;
  }
  return `${dim}: changed`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function computeChangeImpact(
  applicationId: string,
  triggeredByDocType: string,
  previousVerdicts: Record<string, DimensionVerdict> | null,
  newVerdicts: Record<string, DimensionVerdict> | null,
): Promise<ChangeImpactReport | null> {
  // If there's nothing to compare, no impact report
  if (!previousVerdicts || !newVerdicts) return null;

  const supabase = serviceClient();

  // Find dimensions whose verdict actually changed
  const allDimensions = new Set([
    ...Object.keys(previousVerdicts),
    ...Object.keys(newVerdicts),
  ]) as Set<Dimension>;

  const changedDimensions: Dimension[] = [];
  const changeDescriptions: Record<Dimension, string> = {} as Record<Dimension, string>;

  for (const dim of allDimensions) {
    const prev = previousVerdicts[dim];
    const next = newVerdicts[dim];
    if (verdictChanged(prev, next)) {
      changedDimensions.push(dim);
      changeDescriptions[dim] = describeChange(dim, prev, next);
    }
  }

  if (changedDimensions.length === 0) {
    // Fingerprint prevented a re-reason, or no material change — no impact
    return null;
  }

  // Fetch all generated documents that could be affected (not already queued for regen)
  type GenDocRow = {
    document_type: string;
    status: string;
    client_certified: boolean | null;
  };
  const { data: genDocs } = await supabase
    .from('generated_documents')
    .select('document_type, status, client_certified')
    .eq('application_id', applicationId)
    .not('content_text', 'is', null);

  const documents = (genDocs ?? []) as GenDocRow[];

  // Only consider docs in a state where regeneration is meaningful
  const reviewableDocs = documents.filter(d =>
    ['awaiting_approval', 'approved', 'awaiting_client'].includes(d.status) ||
    d.client_certified === true
  );

  const impactedDocuments: ImpactedDocument[] = [];
  const safeDocuments: string[] = [];

  for (const doc of reviewableDocs) {
    const docType = doc.document_type as DocumentType;
    const coveredDimensions = DOC_TYPE_DIMENSIONS[docType] ?? [];

    // Which changed dimensions does this document cover?
    const relevantChanges = changedDimensions.filter(d => coveredDimensions.includes(d));

    if (relevantChanges.length === 0) {
      safeDocuments.push(docType);
      continue;
    }

    const reasons = relevantChanges.map(d => changeDescriptions[d]);
    const verdictShift = relevantChanges.map(d => `${previousVerdicts[d]?.status ?? 'none'} → ${newVerdicts[d]?.status ?? 'none'}`).join(', ');

    impactedDocuments.push({
      documentType: docType,
      label: DOCUMENT_TYPE_LABELS[docType] ?? docType,
      reasons,
      changedDimensions: relevantChanges,
      previousVerdict: previousVerdicts[relevantChanges[0]]?.status ?? null,
      newVerdict: newVerdicts[relevantChanges[0]]?.status ?? null,
      urgency: computeUrgency(relevantChanges, verdictShift),
    });
  }

  // Sort by urgency
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  impactedDocuments.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  const hasHighUrgency = impactedDocuments.some(d => d.urgency === 'high');

  let summary: string;
  if (impactedDocuments.length === 0) {
    summary = 'New document uploaded. No generated documents are affected by the new information.';
  } else if (hasHighUrgency) {
    const high = impactedDocuments.filter(d => d.urgency === 'high');
    summary = `New document changed ${changedDimensions.length} dimension(s). ${high.length} document(s) need urgent regeneration (${high.map(d => d.label).join(', ')}).`;
  } else {
    summary = `New document changed ${changedDimensions.length} dimension(s). ${impactedDocuments.length} document(s) may benefit from regeneration.`;
  }

  const report: ChangeImpactReport = {
    triggeredByDocType,
    impactedDocuments,
    safeDocuments,
    totalImpacted: impactedDocuments.length,
    hasHighUrgency,
    summary,
    generatedAt: new Date().toISOString(),
  };

  // Persist the impact report on case_theory so the UI can read it
  await supabase
    .from('case_theory')
    .update({ impact_report: report })
    .eq('application_id', applicationId);

  return report;
}
