/**
 * WS3.1 — Master Exhibit Registry (A1)
 *
 * Today every document generates its own "Supporting Documentation Index"
 * independently — nothing guarantees the Source of Funds narrative's
 * "Tab D-2" and the Fund Flow Chronology's "Tab D-2" point at the same
 * physical uploaded file, or even that either exhibit actually exists.
 * Officers navigate binders by exhibit reference; a mismatch reads as
 * amateur assembly at a glance.
 *
 * This module builds ONE exhibit list per application from
 * uploaded_documents, assigns canonical IDs keyed to the existing Tab
 * scheme (docx-package-constants.ts — the single source of truth for tab
 * letters), and is injected into every document-generation prompt with the
 * instruction that all exhibit citations MUST resolve to a registry ID.
 * checkExhibitConsistency() runs a deterministic post-generation sweep
 * (no LLM) to catch orphan citations (cited, not in registry) and unused
 * exhibits (uploaded, never cited by any document).
 */

import { createServiceClient as serviceClient } from '@/lib/supabase-service';
import { UPLOADED_DOC_TYPE_TAB_MAP, TAB_ORDER } from './docx-package-constants';
import { uploadedDocTypeLabel } from './uploaded-doc-labels';

export interface ExhibitEntry {
  id: string;        // canonical citation ID, e.g. "D-1", "D-2", "E-1"
  tab: string;        // tab letter, e.g. "D"
  label: string;      // human-readable doc-type label, e.g. "Bank / Investment Records"
  docType: string;    // uploaded_documents.doc_type
  fileName: string;
  uploadedAt: string;
}

export interface ExhibitRegistry {
  applicationId: string;
  exhibits: ExhibitEntry[];
  byTab: Record<string, ExhibitEntry[]>;
  // doc_types uploaded with no tab mapping — surfaced so the map can be
  // extended rather than silently dropping evidence from the registry
  unmappedDocTypes: string[];
}

export async function buildExhibitRegistry(applicationId: string): Promise<ExhibitRegistry> {
  const supabase = serviceClient();

  const { data } = await supabase
    .from('uploaded_documents')
    .select('doc_type, file_name, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as { doc_type: string; file_name: string; created_at: string }[];

  const counters: Record<string, number> = {};
  const exhibits: ExhibitEntry[] = [];
  const unmappedDocTypes = new Set<string>();

  for (const row of rows) {
    const tab = UPLOADED_DOC_TYPE_TAB_MAP[row.doc_type];
    if (!tab) {
      unmappedDocTypes.add(row.doc_type);
      continue;
    }
    counters[tab] = (counters[tab] ?? 0) + 1;
    exhibits.push({
      id: `${tab}-${counters[tab]}`,
      tab,
      label: uploadedDocTypeLabel(row.doc_type),
      docType: row.doc_type,
      fileName: row.file_name,
      uploadedAt: row.created_at,
    });
  }

  const byTab: Record<string, ExhibitEntry[]> = {};
  for (const ex of exhibits) {
    (byTab[ex.tab] ??= []).push(ex);
  }

  return {
    applicationId,
    exhibits,
    byTab,
    unmappedDocTypes: Array.from(unmappedDocTypes),
  };
}

/**
 * Renders the registry as a prompt block. Every document prompt gets this
 * verbatim so citation format and available evidence are identical across
 * all ~19 generation calls for a given application.
 */
export function formatExhibitRegistryText(registry: ExhibitRegistry): string {
  if (registry.exhibits.length === 0) {
    return [
      'EXHIBIT REGISTRY: No client documents have been uploaded to this application yet.',
      'Do NOT cite any exhibit or tab number for supporting evidence. Describe evidence',
      'narratively without a specific reference, or state that documentation is pending —',
      'never invent an exhibit number for a document that has not been uploaded.',
    ].join('\n');
  }

  const lines = [
    'EXHIBIT REGISTRY — CITE ONLY THESE IDS. NEVER INVENT AN EXHIBIT NUMBER.',
    'Every reference to supporting evidence in this document MUST use one of the exhibit',
    'IDs below, in the exact format "Tab X-N" (e.g. "Tab D-2"). Do not renumber them,',
    'do not invent an exhibit not listed here, and do not assume a document exists that',
    'is not in this list. If the evidence you want to cite is not in the registry, say so',
    'narratively instead of fabricating a tab reference.',
    '',
  ];

  for (const tab of TAB_ORDER) {
    const list = registry.byTab[tab];
    if (!list || list.length === 0) continue;
    for (const ex of list) {
      lines.push(`  Tab ${ex.id}: ${ex.label} — ${ex.fileName}`);
    }
  }

  return lines.join('\n');
}

// Matches "Tab D-2", "Tab D-2 (Investor 2)", etc. — the canonical citation
// format every prompt is instructed to use.
const EXHIBIT_CITATION_REGEX = /Tab\s+([A-Z])-(\d+)/g;

export interface ExhibitCitationIssue {
  documentType: string;
  citation: string;
}

export interface ExhibitConsistencyResult {
  clean: boolean;
  orphanCitations: ExhibitCitationIssue[]; // cited by a document, not in the registry
  unusedExhibitIds: string[];              // in the registry, never cited by any document
  correctionBriefs: Record<string, string>; // per-document-type correction text for orphan citations
}

/**
 * Deterministic (no LLM) post-generation sweep across the full package:
 * every exhibit ID cited in any document must resolve to a registry entry.
 * Uploaded exhibits nobody cited are reported too — not an error, but a
 * signal the package under-uses evidence the client already provided.
 */
export function checkExhibitConsistency(
  registry: ExhibitRegistry,
  documents: { documentType: string; contentText: string }[],
): ExhibitConsistencyResult {
  const validIds = new Set(registry.exhibits.map(e => e.id));
  const citedIds = new Set<string>();
  const orphanCitations: ExhibitCitationIssue[] = [];
  const orphansByDoc = new Map<string, string[]>();

  for (const doc of documents) {
    const re = new RegExp(EXHIBIT_CITATION_REGEX.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc.contentText)) !== null) {
      const id = `${m[1]}-${m[2]}`;
      citedIds.add(id);
      if (!validIds.has(id)) {
        const citation = `Tab ${id}`;
        orphanCitations.push({ documentType: doc.documentType, citation });
        const list = orphansByDoc.get(doc.documentType) ?? [];
        list.push(citation);
        orphansByDoc.set(doc.documentType, list);
      }
    }
  }

  const unusedExhibitIds = registry.exhibits
    .map(e => e.id)
    .filter(id => !citedIds.has(id));

  const correctionBriefs: Record<string, string> = {};
  for (const [documentType, citations] of orphansByDoc) {
    const unique = Array.from(new Set(citations));
    correctionBriefs[documentType] = [
      'DETERMINISTIC EXHIBIT PROVENANCE FAILURE:',
      'The following exhibit citations do not resolve to any entry in the exhibit registry',
      '(they were either invented or reference a document that was never uploaded):',
      '',
      ...unique.map(c => `  • "${c}"`),
      '',
      'Replace each with a real exhibit ID from the registry, or remove the citation and',
      'describe the evidence narratively without a tab reference.',
    ].join('\n');
  }

  return {
    clean: orphanCitations.length === 0,
    orphanCitations,
    unusedExhibitIds,
    correctionBriefs,
  };
}
