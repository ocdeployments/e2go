/**
 * CIC-P.2 — Cross-Document Canonical Consistency Sweep
 *
 * Upgrades the existing regex-based checkConsistency() with canonical anchoring:
 * every extracted field value is compared against the CPU's canonical value
 * (from case_theory.numbers_strategy and case_model.dimensions facts) so we
 * know not just that documents disagree, but which document is WRONG and what
 * the correct value should be.
 *
 * Phase 1 — Canonical comparison (fast, no LLM):
 *   Extract key values from each document via regex, compare against
 *   case_theory.numbers_strategy. Flag documents that differ from canonical.
 *
 * Phase 2 — LLM semantic sweep (one call, compact representation):
 *   Checks that the narrative argument (theory of the case) is consistent
 *   across documents — catches contradictory framing that regex cannot detect.
 *
 * Result stored on document_generation_jobs.consistency_result (jsonb).
 */

import { createServiceClient as serviceClient } from '@/lib/supabase-service';
import { callTier2Model } from './llm-client';
import type { DocumentType } from '@/types/generation';
import { DOCUMENT_TYPE_LABELS } from '@/types/generation';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanonicalValue {
  field: string;
  canonical: string;          // the CPU's ground-truth value (from case_theory)
  source: string;             // where the canonical value comes from (e.g. "numbers_strategy: Total Investment")
}

export interface ConsistencyIssue {
  field: string;
  canonical: string | null;   // null if no canonical value exists — inter-doc divergence only
  canonicalSource: string | null;
  documentsCorrect: string[]; // document_types with the canonical value
  documentsWrong: string[];   // document_types with a different value
  valuesFound: Record<string, string>; // document_type → extracted value
  severity: 'critical' | 'warning';   // critical = figure/treaty/name; warning = date/role
}

export interface SemanticIssue {
  documentType: string;
  issue: string;              // what contradicts the narrative backbone
  excerpt: string;            // the specific passage
}

export interface CanonicalConsistencySweepResult {
  passed: boolean;
  canonicalValues: CanonicalValue[];
  phase1Issues: ConsistencyIssue[];     // canonical anchoring failures
  phase2SemanticIssues: SemanticIssue[]; // LLM narrative coherence failures
  summary: string;                       // human-readable one-liner for the client UI
}

// ── Regex extraction (reuses pattern logic from generation-engine CONSISTENCY_FIELDS) ──

type ExtractRule = { field: string; patterns: RegExp[]; severity: 'critical' | 'warning' };

const EXTRACT_RULES: ExtractRule[] = [
  {
    field: 'investment_amount',
    severity: 'critical',
    patterns: [
      /\$([0-9]{2,3}(?:,[0-9]{3})+)/,
      /investment\s+of\s+\$([0-9,]+)/i,
      /USD\s+([0-9,]+)/i,
      /([0-9,]+)\s+(?:USD|United\s+States\s+dollars)/i,
    ],
  },
  {
    field: 'job_creation_count',
    severity: 'critical',
    patterns: [
      /(?:hire|create|employ)\s+(\d+)\s+(?:U\.?S\.?\s+)?(?:workers|employees|jobs|positions)/i,
      /(\d+)\s+(?:full[- ]time|U\.?S\.?)\s+(?:employees|workers|jobs)/i,
      /(?:employ|create)\s+(?:at\s+least\s+)?(\d+)\s+(?:new\s+)?(?:employees|workers)/i,
    ],
  },
  {
    field: 'treaty_nationality',
    severity: 'critical',
    patterns: [
      /(?:national|citizen)\s+of\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:,|\.|;|\s+(?:and|who|with|under))/i,
      /([A-Z][a-zA-Z]+)\s+(?:citizen|national|passport)/i,
      /E-2\s+treaty\s+(?:with\s+)?([A-Z][a-zA-Z\s]+?)(?:,|\.|;)/i,
    ],
  },
  {
    field: 'applicant_name',
    severity: 'critical',
    patterns: [
      /(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
      /applicant,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?(?:\s+a\s+|\s+is|\s+has)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+is\s+a/m,
    ],
  },
  {
    field: 'business_name',
    severity: 'critical',
    patterns: [
      /([A-Z][A-Za-z\s]+(?:LLC|Inc\.|Corp\.|Limited))/,
      /business(?:\s+name)?[:]\s*([A-Z][A-Za-z\s]+)/i,
    ],
  },
  {
    field: 'franchise_brand',
    severity: 'critical',
    patterns: [
      /franchise(?:r|e|or)?\s+(?:system\s+)?(?:known\s+as\s+|called\s+|,\s+)?([A-Z][A-Za-z\s]+?)(?:\s*,|\s+franchise|\s+system|\s+brand|\s+Inc\.|\s+LLC)/i,
      /([A-Z][A-Za-z\s]+)\s+(?:franchise|franchising)/i,
    ],
  },
  {
    field: 'net_worth',
    severity: 'warning',
    patterns: [
      /net\s+worth\s+of\s+\$([0-9,]+)/i,
      /total\s+(?:net\s+)?worth[:\s]+\$([0-9,]+)/i,
    ],
  },
  {
    field: 'consulate_post',
    severity: 'warning',
    patterns: [
      /(?:consulate|embassy)\s+in\s+([A-Z][a-zA-Z\s]+?)(?:,|\.|;)/i,
      /(?:apply|applying)\s+at\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)\s+(?:consulate|embassy)/i,
    ],
  },
];

function extractValue(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[$,\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Canonical value extraction from case_theory ──────────────────────────────

interface NumbersStrategyItem {
  figure: string;
  value: string;
  foregroundBecause?: string;
  denialRiskAddressed?: string;
}

function extractCanonicalValues(numbersStrategy: NumbersStrategyItem[]): CanonicalValue[] {
  const canonicals: CanonicalValue[] = [];

  for (const item of numbersStrategy) {
    const fig = item.figure.toLowerCase();
    const val = item.value.replace(/[^0-9.,a-zA-Z$€£\s]/g, '').trim();

    if (fig.includes('investment') || fig.includes('invest')) {
      canonicals.push({ field: 'investment_amount', canonical: val, source: `numbers_strategy: ${item.figure}` });
    } else if (fig.includes('hire') || fig.includes('job') || fig.includes('employee') || fig.includes('worker')) {
      canonicals.push({ field: 'job_creation_count', canonical: val, source: `numbers_strategy: ${item.figure}` });
    } else if (fig.includes('net worth') || fig.includes('worth')) {
      canonicals.push({ field: 'net_worth', canonical: val, source: `numbers_strategy: ${item.figure}` });
    }
  }

  // Deduplicate — keep first (most authoritative)
  const seen = new Set<string>();
  return canonicals.filter(c => {
    if (seen.has(c.field)) return false;
    seen.add(c.field);
    return true;
  });
}

// ── Phase 2: LLM semantic sweep ───────────────────────────────────────────────

const SEMANTIC_SYSTEM = `You are a consistency auditor for E-2 visa application document packages.
You will check whether multiple documents present a coherent, non-contradictory narrative.
Output only valid JSON. No prose outside the JSON.`;

async function runSemanticSweep(
  narrative: string,
  documentExcerpts: Array<{ documentType: string; label: string; excerpt: string }>,
  userId?: string,
): Promise<SemanticIssue[]> {
  if (documentExcerpts.length === 0) return [];

  const excerptBlock = documentExcerpts
    .map(d => `=== ${d.label} ===\n${d.excerpt}`)
    .join('\n\n');

  const prompt = `CASE THEORY NARRATIVE (the correct theory of the case — every document must align with this):
${narrative}

DOCUMENT EXCERPTS (opening ~500 chars of each generated document):
${excerptBlock}

Check: does each document's framing align with the narrative backbone? Look for:
- Contradictory characterizations of the investment (e.g. "minimal" vs "substantial")
- Different framings of the applicant's management role
- Inconsistent characterization of the business stage (operational vs pre-launch)
- Any document that undermines a central argument present in the narrative

Output JSON:
{
  "semantic_issues": [
    { "document_type": "<doc_type>", "issue": "<what contradicts the narrative>", "excerpt": "<the specific phrase>" }
  ]
}

If all documents are consistent with the narrative, return: { "semantic_issues": [] }`;

  const raw = await callTier2Model({
    task: 'verify',
    route: '/lib/cic-consistency-sweep',
    userId,
    max_tokens: 1500,
    timeoutMs: 45_000,
    system: SEMANTIC_SYSTEM,
    user: prompt,
  });

  if (!raw) return [];

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { semantic_issues?: Array<{ document_type: string; issue: string; excerpt: string }> };
    return (parsed.semantic_issues ?? []).map(s => ({
      documentType: s.document_type,
      issue: s.issue,
      excerpt: s.excerpt,
    }));
  } catch {
    return [];
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runCanonicalConsistencySweep(
  applicationId: string,
  userId?: string,
): Promise<CanonicalConsistencySweepResult> {
  const supabase = serviceClient();

  // Fetch case_theory for canonical values + narrative backbone
  const { data: theory } = await supabase
    .from('case_theory')
    .select('narrative, numbers_strategy')
    .eq('application_id', applicationId)
    .maybeSingle();

  // Fetch all generated documents with content
  type DocRow = { document_type: string; content_text: string | null };
  const { data: docs } = await supabase
    .from('generated_documents')
    .select('document_type, content_text')
    .eq('application_id', applicationId)
    .not('content_text', 'is', null);

  const documents = (docs ?? []) as DocRow[];

  if (documents.length === 0) {
    return {
      passed: true,
      canonicalValues: [],
      phase1Issues: [],
      phase2SemanticIssues: [],
      summary: 'No generated documents to check yet.',
    };
  }

  // ── Phase 1: Canonical anchoring ──────────────────────────────────────────

  const canonicalValues = theory?.numbers_strategy
    ? extractCanonicalValues(theory.numbers_strategy as NumbersStrategyItem[])
    : [];

  const canonicalMap = new Map(canonicalValues.map(c => [c.field, c]));

  const phase1Issues: ConsistencyIssue[] = [];

  for (const rule of EXTRACT_RULES) {
    const valuesByDoc: Record<string, string> = {};

    for (const doc of documents) {
      if (!doc.content_text) continue;
      const val = extractValue(doc.content_text, rule.patterns);
      if (val) valuesByDoc[doc.document_type] = val;
    }

    if (Object.keys(valuesByDoc).length === 0) continue;

    const canonical = canonicalMap.get(rule.field);
    const canonicalNorm = canonical ? normalizeForComparison(canonical.canonical) : null;

    const uniqueNormalized = new Set(Object.values(valuesByDoc).map(normalizeForComparison));

    // Flag if: values diverge between docs, OR any doc diverges from canonical
    const divergesFromCanonical = canonicalNorm
      ? Object.values(valuesByDoc).some(v => normalizeForComparison(v) !== canonicalNorm)
      : false;

    const docsDiverge = uniqueNormalized.size > 1;

    if (!divergesFromCanonical && !docsDiverge) continue;

    const documentsCorrect: string[] = [];
    const documentsWrong: string[] = [];

    for (const [docType, val] of Object.entries(valuesByDoc)) {
      if (canonicalNorm) {
        (normalizeForComparison(val) === canonicalNorm ? documentsCorrect : documentsWrong).push(docType);
      }
      // If no canonical, all docs go to valuesFound only (divergence flagged without canonical anchor)
    }

    phase1Issues.push({
      field: rule.field,
      canonical: canonical?.canonical ?? null,
      canonicalSource: canonical?.source ?? null,
      documentsCorrect,
      documentsWrong,
      valuesFound: valuesByDoc,
      severity: rule.severity,
    });
  }

  // ── Phase 2: Semantic sweep ───────────────────────────────────────────────

  let phase2SemanticIssues: SemanticIssue[] = [];

  if (theory?.narrative) {
    const excerpts = documents
      .filter(d => d.content_text && d.content_text.length > 100)
      .map(d => ({
        documentType: d.document_type,
        label: DOCUMENT_TYPE_LABELS[d.document_type as DocumentType] ?? d.document_type,
        excerpt: d.content_text!.slice(0, 500),
      }));

    phase2SemanticIssues = await runSemanticSweep(theory.narrative, excerpts, userId);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const criticalIssues = phase1Issues.filter(i => i.severity === 'critical');
  const totalIssues = phase1Issues.length + phase2SemanticIssues.length;
  const passed = criticalIssues.length === 0 && phase2SemanticIssues.length === 0;

  let summary: string;
  if (passed && totalIssues === 0) {
    summary = 'All documents are consistent. No canonical value mismatches or narrative contradictions found.';
  } else if (passed) {
    summary = `Minor inconsistencies found (${phase1Issues.filter(i => i.severity === 'warning').length} warning-level field variations). No critical issues.`;
  } else {
    const parts: string[] = [];
    if (criticalIssues.length > 0) parts.push(`${criticalIssues.length} critical field inconsistencies`);
    if (phase2SemanticIssues.length > 0) parts.push(`${phase2SemanticIssues.length} narrative contradictions`);
    summary = `Consistency issues found: ${parts.join('; ')}. Review before package assembly.`;
  }

  return { passed, canonicalValues, phase1Issues, phase2SemanticIssues, summary };
}
