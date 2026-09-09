/**
 * CIC-2.2 — Case Theory Compliance Verifier
 *
 * Runs after document generation, before presenting the draft to the client.
 * Checks whether the generated text actually followed the Case Theory directives
 * and dimension verdicts — not re-reasoning, just enforcement.
 *
 * Structured output (VerifierResult) is stored on generated_documents.verifier_result
 * and drives the retry loop in generation-engine.ts (CIC-2.3).
 *
 * Uses callTier2Model (claude-sonnet-5 primary) — a QC pass over generated text, one tier below the Case Theory reasoning it checks
 * because this is also structured JSON extraction from a reasoning pass.
 */

import { callTier2Model } from './llm-client';
import type { DocumentType } from '@/types/generation';
import { getSectionContract } from './section-contract-parser';

export interface DirectiveCheck {
  directive: string;
  dimension: string;
  followed: boolean;
  reason: string;
}

export interface VerifierResult {
  overall: 'pass' | 'fail' | 'pass_with_notes';
  directivesFollowed: DirectiveCheck[];
  figuresCorrect: boolean;
  figureIssues: string[];
  contradictions: string[];       // claims that contradict a 'contradicted' dimension verdict
  repetitionIssues: string[];     // same claim stated more than once in the document
  toneIssues: string[];           // tone mismatch for this document type (e.g. casual in cover letter)
  flowIssues: string[];           // CIC-P.3: section missing, out of order, filler paragraph, density failure
  notes: string[];                // pass_with_notes detail
  correctionBrief: string;        // formatted feedback for the generation engine on retry
}

export interface NumbersStrategyItem {
  figure: string;
  value: string;
}

interface CaseTheoryForVerifier {
  narrative?: string | null;
  numbers_strategy?: NumbersStrategyItem[] | null;
  dimension_verdicts?: Record<string, {
    status: string;
    evidenceSummary?: string;
    gap?: string | null;
  }> | null;
  directives?: Array<{
    engine: string;
    dimension: string;
    instruction: string;
  }> | null;
}

type Dimension =
  | 'source_of_funds' | 'investment' | 'business' | 'franchise'
  | 'location' | 'background' | 'identity' | 'operations' | 'other';

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

const TONE_TARGETS: Partial<Record<DocumentType, string>> = {
  cover_letter:          'formal attorney letter — third-person, authoritative, no casual phrasing',
  business_plan:         'executive business writing — confident, data-grounded, forward-looking',
  source_of_funds:       'factual declarative — precise, chronological, no legal argument',
  qualifications:        'professional biography — first-person warm but credentialed',
  resume_principal:      'professional resume — concise, achievement-focused, no narrative filler',
  resume_spouse:         'professional resume — concise, achievement-focused, no narrative filler',
  declaration_principal: 'sworn declaration — first-person, factual, formal',
  declaration_spouse:    'sworn declaration — first-person, factual, formal',
  nonimmigrant_intent:   'formal sworn statement — sincere, personal, factual',
  marginality_rebuttal:  'persuasive legal memorandum — data-heavy, forward-looking, rebuttal framing',
};

// ── CIC-P.3 / WS3.4: Section structural contracts ────────────────────────────
// Required sections in order and what each MUST establish, parsed live from
// each document's generation template (the single source of truth) via
// getSectionContract() — see section-contract-parser.ts. This can never
// drift from the templates because it isn't a separate hand-maintained copy.
// Argument density rule (checked separately below): every body paragraph
// must carry a qualifying fact, rebut a denial risk, or introduce evidence.

const VERIFIER_SYSTEM = `You are a strict quality auditor for E-2 visa application documents.
Your job is to verify whether a generated document followed its Case Theory directives exactly,
and whether the document has the correct structural flow and argument density.
You do not re-reason about the case. You only check compliance with the given instructions.
Output only valid JSON matching the schema provided. No prose outside the JSON.`;

function buildVerifierPrompt(
  documentType: DocumentType,
  documentText: string,
  theory: CaseTheoryForVerifier,
): string {
  const relevantDimensions = DOC_TYPE_DIMENSIONS[documentType] ?? [];
  const toneTarget = TONE_TARGETS[documentType] ?? 'professional, formal';
  const verdicts = theory.dimension_verdicts ?? {};
  const genDirectives = (theory.directives ?? []).filter(
    d => d.engine === 'generation' && relevantDimensions.includes(d.dimension as Dimension)
  );

  const directivesList = genDirectives.length > 0
    ? genDirectives.map((d, i) => `${i + 1}. [${d.dimension.toUpperCase()}] ${d.instruction}`).join('\n')
    : '(no specific directives for this document type — check general compliance only)';

  const verdictsList = relevantDimensions
    .filter(d => verdicts[d])
    .map(d => {
      const v = verdicts[d];
      return `${d.toUpperCase()}: ${v.status?.toUpperCase()} — ${v.evidenceSummary ?? ''}${v.gap ? ` | Gap: ${v.gap}` : ''}`;
    })
    .join('\n');

  const contradictedDimensions = relevantDimensions
    .filter(d => verdicts[d]?.status === 'contradicted')
    .map(d => d.toUpperCase());

  // CIC-P.3 / WS3.4: section structural contract, parsed live from the template
  const sectionContracts = getSectionContract(documentType);
  const sectionContractBlock = sectionContracts
    ? [
        'REQUIRED SECTIONS IN ORDER (structural contract):',
        sectionContracts.map((s, i) =>
          `  ${i + 1}. ${s.name}\n     MUST establish: ${s.establishes}`
        ).join('\n'),
        '',
    'ARGUMENT DENSITY RULE: Every body paragraph must carry at least one of:',
        '  (a) a qualifying fact about the investment, business, or applicant,',
        '  (b) a rebuttal of a known denial risk,',
        '  (c) a specific reference to an exhibit or evidence.',
        '  Flag any paragraph that does none of these as a flow issue.',
        '',
        'ADJECTIVE/NUMBER DENSITY RULE (D3): unqualified superlatives and vague strength claims',
        '  ("excellent," "strong," "significant," "extensive," "robust," "substantial," "highly qualified")',
        '  are empty unless a specific number, date, or named fact sits in the same sentence or the one',
        '  immediately following it. Flag any such adjective/claim that has no supporting figure nearby',
        '  as a flow issue — name the exact phrase and where it appears.',
      ].join('\n')
    : '(no structural contract defined for this document type)';

  // Inject canonical figures so "figures_correct" has ground truth (not vibes)
  const canonicalFigures = (theory.numbers_strategy ?? [])
    .map(n => `  • ${n.figure}: ${n.value}`)
    .join('\n');
  const figuresBlock = canonicalFigures
    ? `CANONICAL FIGURES (these are the CPU's ground truth — every number in the document must match):\n${canonicalFigures}`
    : '(no canonical figures established yet — skip figure check)';

  return `DOCUMENT TYPE: ${documentType}
TONE TARGET: ${toneTarget}

${figuresBlock}

DIRECTIVES FOR THIS DOCUMENT (must be followed):
${directivesList}

DIMENSION VERDICTS (reference only — do not re-reason):
${verdictsList}

CONTRADICTED DIMENSIONS (must NOT be asserted in the document):
${contradictedDimensions.length > 0 ? contradictedDimensions.join(', ') : 'none'}

TIES SYMMETRY RULE (D11): if this document type is cover_letter or nonimmigrant_intent and it lists
home-country ties (family, property, employment/business continuity, community/civic), the exact set
of ties named must match what the Case Theory's dimension verdict evidence establishes — never invent
a tie the Case Model does not support, and never silently drop a documented tie the other ties-bearing
document type would be expected to also carry. Flag any mismatch as a contradiction.

${sectionContractBlock}

DOCUMENT TEXT TO AUDIT:
---
${documentText.slice(0, 12000)}
---

Check the document against all criteria above. Output a JSON object with exactly this structure:
{
  "directives_followed": [
    { "directive": "<directive text>", "dimension": "<dimension>", "followed": true|false, "reason": "<why>" }
  ],
  "figures_correct": true|false,
  "figure_issues": ["<description of any figure that appears to differ from the directive or verdict evidence>"],
  "contradictions": ["<any claim that asserts a contradicted or missing dimension as proven>"],
  "repetition_issues": ["<any claim or paragraph restated verbatim or near-verbatim elsewhere in the document>"],
  "tone_issues": ["<any passage whose tone does not match the tone target>"],
  "flow_issues": ["<any structural issue: missing section, section out of order, paragraph with no qualifying fact or denial rebuttal, content placed in the wrong section>"],
  "notes": ["<minor observations that do not constitute failures — style, emphasis, suggestions>"],
  "overall": "pass" | "fail" | "pass_with_notes"
}

Rules for overall:
- "pass": all directives followed (or no directives exist), figures_correct true, no contradictions, no critical flow issues
- "pass_with_notes": directives followed and no contradictions, but minor repetition, tone, or flow issues
- "fail": any directive not followed, OR any entry in contradictions, OR figures_correct false, OR a required section is missing`;
}

function parseVerifierResult(raw: string): VerifierResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const overall = (parsed.overall as string);
    if (!['pass', 'fail', 'pass_with_notes'].includes(overall)) return null;

    const directivesFollowed: DirectiveCheck[] = Array.isArray(parsed.directives_followed)
      ? (parsed.directives_followed as Record<string, unknown>[]).map(d => ({
          directive: String(d.directive ?? ''),
          dimension: String(d.dimension ?? ''),
          followed: Boolean(d.followed),
          reason: String(d.reason ?? ''),
        }))
      : [];

    const figureIssues    = Array.isArray(parsed.figure_issues)    ? (parsed.figure_issues as string[])    : [];
    const contradictions  = Array.isArray(parsed.contradictions)   ? (parsed.contradictions as string[])   : [];
    const repetitionIssues = Array.isArray(parsed.repetition_issues) ? (parsed.repetition_issues as string[]) : [];
    const toneIssues      = Array.isArray(parsed.tone_issues)      ? (parsed.tone_issues as string[])      : [];
    const flowIssues      = Array.isArray(parsed.flow_issues)      ? (parsed.flow_issues as string[])      : [];
    const notes           = Array.isArray(parsed.notes)            ? (parsed.notes as string[])            : [];

    // Build corrective feedback for the generation engine on retry
    const failedDirectives = directivesFollowed.filter(d => !d.followed);
    const correctionLines: string[] = ['VERIFIER FAILURE — PREVIOUS DRAFT REJECTED. Fix these issues in the regeneration:'];
    if (failedDirectives.length > 0) {
      correctionLines.push('\nDIRECTIVES NOT FOLLOWED:');
      failedDirectives.forEach(d => correctionLines.push(`  [${d.dimension.toUpperCase()}] ${d.directive}\n  → Issue: ${d.reason}`));
    }
    if (!parsed.figures_correct && figureIssues.length > 0) {
      correctionLines.push('\nFIGURE ISSUES (use exact values from the case brief):');
      figureIssues.forEach(f => correctionLines.push(`  - ${f}`));
    }
    if (contradictions.length > 0) {
      correctionLines.push('\nCONTRADICTIONS TO REMOVE:');
      contradictions.forEach(c => correctionLines.push(`  - ${c}`));
    }
    if (flowIssues.length > 0) {
      correctionLines.push('\nSTRUCTURAL / FLOW ISSUES TO FIX:');
      flowIssues.forEach(f => correctionLines.push(`  - ${f}`));
      correctionLines.push('  → Follow the required section order. Each section establishes its own argument only. Every paragraph must carry a qualifying fact, denial rebuttal, or exhibit reference — no filler.');
    }
    const correctionBrief = correctionLines.join('\n');

    return {
      overall: overall as VerifierResult['overall'],
      directivesFollowed,
      figuresCorrect: Boolean(parsed.figures_correct),
      figureIssues,
      contradictions,
      repetitionIssues,
      toneIssues,
      flowIssues,
      notes,
      correctionBrief,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a generated document against its Case Theory directives.
 * Returns null if the case_theory row is absent (sparse accounts) — caller treats null as pass.
 */
export async function verifyCaseTheoryCompliance(
  documentType: DocumentType,
  documentText: string,
  caseTheory: CaseTheoryForVerifier | null | undefined,
  userId?: string,
): Promise<VerifierResult | null> {
  // No case theory yet (sparse account) — nothing to verify against, treat as pass.
  if (!caseTheory?.narrative) return null;

  const prompt = buildVerifierPrompt(documentType, documentText, caseTheory);

  const raw = await callTier2Model({
    task: 'verify',
    route: '/lib/cic-verifier',
    userId,
    max_tokens: 2000,
    timeoutMs: 60_000,
    system: VERIFIER_SYSTEM,
    user: prompt,
  });

  if (!raw) return null;
  return parseVerifierResult(raw);
}
