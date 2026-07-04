/**
 * Case Intelligence Core — Faculty 1, document channel (CIC-1.1)
 *
 * Two stages, per application:
 *   Stage 1 COMPREHEND — for each uploaded document, an LLM reads the already-
 *     extracted JSON and writes (a) a narrative memo on its E-2 significance and
 *     (b) a list of typed Claims (dimension + canonical key + value + why-it-matters).
 *   Stage 2 RECONCILE  — claims are merged into one evidence ledger; duplicate
 *     facts are resolved by per-dimension document authority; only genuine,
 *     unresolved disagreements are surfaced as conflicts (NON-BLOCKING).
 *
 * Output is written to `document_intelligence` (one row per application). This
 * is the first consumer of `uploaded_documents.extracted_json`, which until now
 * had no downstream reader. The Case Model (PERCEIVE) reads this ledger.
 *
 * Model: OpenRouter task 'extract' → xiaomi/mimo-v2.5-pro (owner-locked).
 * Server-only. Numbers are never invented here — the LLM only restates
 * already-extracted values and explains their relevance.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { callTier1Model } from './llm-client';

// ── Types ────────────────────────────────────────────────────────────────────

export type Dimension =
  | 'identity'
  | 'source_of_funds'
  | 'investment'
  | 'business'
  | 'location'
  | 'franchise'
  | 'operations'
  | 'background'
  | 'other';

const DIMENSIONS: Dimension[] = [
  'identity', 'source_of_funds', 'investment', 'business',
  'location', 'franchise', 'operations', 'background', 'other',
];

export interface Claim {
  dimension: Dimension;
  key: string;          // canonical fact key, snake_case (e.g. "total_investment")
  label: string;        // human label
  value: string;        // value as extracted (verbatim — never recomputed)
  significance: string; // one sentence: why this matters to the E-2 case
  docId: string;
  docType: string;
  fileName: string;
}

export interface DocMemo {
  docId: string;
  docType: string;
  fileName: string;
  memo: string;
}

export interface LedgerEntry {
  key: string;
  label: string;
  dimension: Dimension;
  value: string;                 // accepted (winning) value
  acceptedDocType: string;       // which doc type won
  significance: string;
  sources: { value: string; docType: string; fileName: string; docId: string }[];
  resolvedBy: 'single' | 'authority' | 'agreement';
}

export interface Conflict {
  key: string;
  label: string;
  dimension: Dimension;
  values: { value: string; docType: string; fileName: string; docId: string }[];
  note: string;
}

// Per-dimension document authority. Higher index = lower trust. Mirrors the
// spirit of DocumentImportHub.SOURCE_PRIORITY but at dimension granularity so it
// resolves free-form comprehension claims, not just fixed intake codes.
const DIMENSION_AUTHORITY: Record<Dimension, string[]> = {
  identity:        ['passport', 'government_form', 'resume', 'business_plan'],
  source_of_funds: ['investment_records', 'financial_statement', 'business_plan'],
  investment:      ['financial_statement', 'investment_records', 'acquisition_financials', 'business_plan', 'fdd'],
  business:        ['business_plan', 'franchise_agreement', 'fdd', 'acquisition_financials'],
  location:        ['lease_agreement', 'territory_analysis', 'franchise_agreement', 'business_plan'],
  franchise:       ['franchise_agreement', 'fdd', 'business_plan'],
  operations:      ['business_plan', 'acquisition_financials', 'fdd'],
  background:      ['resume', 'business_plan'],
  other:           [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Strip symbols + entity suffixes so "450,000" / "450000" / "Care Shepherds LLC"
// vs "Care Shepherds" don't read as conflicts. (Ported from DocumentImportHub.)
function normalize(v: string): string {
  return v
    .toLowerCase()
    .replace(/[$%,]/g, '')
    .replace(/\s+(llc|inc|ltd|corp|co)\.?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function authorityRank(dimension: Dimension, docType: string): number {
  const order = DIMENSION_AUTHORITY[dimension] ?? [];
  const idx = order.indexOf(docType);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

interface UploadedDoc {
  id: string;
  doc_type: string;
  file_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extracted_json: Record<string, any> | null;
}

// ── Stage 1: COMPREHEND (per document) ───────────────────────────────────────

interface ComprehendResult {
  memo: string;
  claims: Omit<Claim, 'docId' | 'docType' | 'fileName'>[];
}

const COMPREHEND_SYSTEM =
  'You are a senior U.S. E-2 visa case analyst. You read a single already-extracted document ' +
  'and explain what it means for the applicant\'s E-2 case. You NEVER invent or recompute numbers — ' +
  'you only restate values that appear in the input and explain their relevance. ' +
  'Reply with ONE valid JSON object only — no markdown fences, no prose outside the JSON.';

function comprehendPrompt(doc: UploadedDoc): string {
  return [
    `DOCUMENT TYPE: ${doc.doc_type}`,
    `FILE: ${doc.file_name}`,
    '',
    'EXTRACTED DATA (JSON):',
    JSON.stringify(doc.extracted_json ?? {}, null, 2).slice(0, 12000),
    '',
    'TASK — produce this exact JSON shape:',
    '{',
    '  "memo": "<2-4 sentences: what this document establishes for the E-2 case, its strongest evidentiary value, and any gap or red flag it raises>",',
    '  "claims": [',
    '    {',
    `      "dimension": "<one of: ${DIMENSIONS.join(' | ')}>",`,
    '      "key": "<canonical snake_case fact key, e.g. total_investment, passport_number, target_city>",',
    '      "label": "<short human label>",',
    '      "value": "<the value EXACTLY as it appears in the extracted data>",',
    '      "significance": "<one sentence on why this fact matters to an E-2 adjudicator>"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules: 4-12 claims, only facts genuinely present in the data. Use the controlled dimension vocabulary. ' +
    'Do not output a fact whose value is null/empty. Keep values verbatim.',
  ].join('\n');
}

async function comprehendDoc(doc: UploadedDoc, userId: string): Promise<ComprehendResult | null> {
  const raw = await callTier1Model({
    task: 'reason',
    route: '/lib/document-comprehension-engine',
    userId,
    max_tokens: 1200,
    system: COMPREHEND_SYSTEM,
    user: comprehendPrompt(doc),
  });
  if (!raw) return null;

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as ComprehendResult;
    if (typeof parsed.memo !== 'string' || !Array.isArray(parsed.claims)) return null;

    // Sanitize claims: valid dimension, non-empty key + value.
    parsed.claims = parsed.claims.filter((c) => {
      const dimOk = DIMENSIONS.includes(c.dimension as Dimension);
      const valOk = typeof c.value === 'string' && c.value.trim() !== '' && c.value.trim().toLowerCase() !== 'null';
      const keyOk = typeof c.key === 'string' && c.key.trim() !== '';
      return dimOk && valOk && keyOk;
    });
    return parsed;
  } catch {
    return null;
  }
}

// ── Stage 2: RECONCILE (cross-document) ──────────────────────────────────────

function reconcile(claims: Claim[]): { ledger: LedgerEntry[]; conflicts: Conflict[] } {
  const groups = new Map<string, Claim[]>();
  for (const c of claims) {
    const gk = `${c.dimension}::${c.key}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk)!.push(c);
  }

  const ledger: LedgerEntry[] = [];
  const conflicts: Conflict[] = [];

  for (const group of groups.values()) {
    const sources = group.map((c) => ({ value: c.value, docType: c.docType, fileName: c.fileName, docId: c.docId }));
    const first = group[0];

    if (group.length === 1) {
      ledger.push({
        key: first.key, label: first.label, dimension: first.dimension,
        value: first.value, acceptedDocType: first.docType, significance: first.significance,
        sources, resolvedBy: 'single',
      });
      continue;
    }

    // All sources agree (after normalization) → no conflict, accept the value.
    const distinct = new Set(group.map((c) => normalize(c.value)));
    if (distinct.size === 1) {
      ledger.push({
        key: first.key, label: first.label, dimension: first.dimension,
        value: first.value, acceptedDocType: first.docType, significance: first.significance,
        sources, resolvedBy: 'agreement',
      });
      continue;
    }

    // Disagreement → try to resolve by document authority for this dimension.
    const ranked = [...group].sort((a, b) => authorityRank(a.dimension, a.docType) - authorityRank(b.dimension, b.docType));
    const bestRank = authorityRank(ranked[0].dimension, ranked[0].docType);

    if (bestRank !== Number.MAX_SAFE_INTEGER) {
      // A trusted source exists — accept it, but still record the disagreement as a soft conflict for review.
      const winner = ranked[0];
      ledger.push({
        key: winner.key, label: winner.label, dimension: winner.dimension,
        value: winner.value, acceptedDocType: winner.docType, significance: winner.significance,
        sources, resolvedBy: 'authority',
      });
      conflicts.push({
        key: winner.key, label: winner.label, dimension: winner.dimension,
        values: sources,
        note: `Resolved to ${winner.docType} value by document authority; other sources disagree. Review if needed.`,
      });
      continue;
    }

    // No authority ranking → genuine unresolved conflict (still non-blocking).
    ledger.push({
      key: first.key, label: first.label, dimension: first.dimension,
      value: first.value, acceptedDocType: first.docType, significance: first.significance,
      sources, resolvedBy: 'single',
    });
    conflicts.push({
      key: first.key, label: first.label, dimension: first.dimension,
      values: sources,
      note: 'Sources disagree and no document is authoritative for this fact. Flagged for human review.',
    });
  }

  // Stable ordering: by dimension then key, for a readable ledger.
  ledger.sort((a, b) =>
    a.dimension === b.dimension ? a.key.localeCompare(b.key) : DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension)
  );
  return { ledger, conflicts };
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface ComprehensionOutcome {
  status: 'complete' | 'failed' | 'empty';
  docCount: number;
  ledgerSize: number;
  conflictCount: number;
}

/**
 * Comprehend every completed upload for an application and write the reconciled
 * ledger to `document_intelligence`. Idempotent (upsert on application_id).
 * Safe to call fire-and-forget after a document parses.
 */
export async function comprehendApplicationDocuments(
  applicationId: string,
  userId: string
): Promise<ComprehensionOutcome> {
  const supabase = serviceClient();

  // Mark processing (upsert so a row always exists for status visibility).
  await supabase.from('document_intelligence').upsert(
    { application_id: applicationId, user_id: userId, status: 'processing' },
    { onConflict: 'application_id' }
  );

  const { data: docs, error } = await supabase
    .from('uploaded_documents')
    .select('id, doc_type, file_name, extracted_json')
    .eq('application_id', applicationId)
    .eq('user_id', userId)
    .eq('extraction_status', 'complete');

  if (error) {
    await supabase.from('document_intelligence')
      .update({ status: 'failed' }).eq('application_id', applicationId);
    return { status: 'failed', docCount: 0, ledgerSize: 0, conflictCount: 0 };
  }

  const completedDocs = (docs ?? []).filter((d) => d.extracted_json && Object.keys(d.extracted_json).length > 0) as UploadedDoc[];
  if (completedDocs.length === 0) {
    await supabase.from('document_intelligence').upsert(
      { application_id: applicationId, user_id: userId, status: 'complete', ledger: [], memos: [], conflicts: [], doc_count: 0 },
      { onConflict: 'application_id' }
    );
    return { status: 'empty', docCount: 0, ledgerSize: 0, conflictCount: 0 };
  }

  // Stage 1 — comprehend each doc (parallel, bounded by doc count which is small).
  const results = await Promise.all(completedDocs.map((d) => comprehendDoc(d, userId)));

  const memos: DocMemo[] = [];
  const allClaims: Claim[] = [];
  completedDocs.forEach((doc, i) => {
    const r = results[i];
    if (!r) return;
    memos.push({ docId: doc.id, docType: doc.doc_type, fileName: doc.file_name, memo: r.memo });
    for (const c of r.claims) {
      allClaims.push({ ...c, docId: doc.id, docType: doc.doc_type, fileName: doc.file_name });
    }
  });

  // Stage 2 — reconcile.
  const { ledger, conflicts } = reconcile(allClaims);

  await supabase.from('document_intelligence').upsert(
    {
      application_id: applicationId,
      user_id: userId,
      ledger,
      memos,
      conflicts,
      doc_count: completedDocs.length,
      status: 'complete',
    },
    { onConflict: 'application_id' }
  );

  return { status: 'complete', docCount: completedDocs.length, ledgerSize: ledger.length, conflictCount: conflicts.length };
}
