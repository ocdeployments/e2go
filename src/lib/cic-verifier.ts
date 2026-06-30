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
 * Uses callLLM task:'extract' (gemini-2.5-pro primary) — same task type as generateCaseTheory
 * because this is also structured JSON extraction from a reasoning pass.
 */

import { callLLM } from './llm-client';
import type { DocumentType } from '@/types/generation';

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

interface CaseTheoryForVerifier {
  narrative?: string | null;
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

// ── CIC-P.3: Section structural contracts ────────────────────────────────────
// Each entry defines: required sections in order, what each MUST establish,
// and what it must NOT re-state from a prior section (no cross-section repetition).
// Argument density rule: every body paragraph must carry a qualifying fact,
// rebut a denial risk, or introduce evidence — no filler paragraphs.

interface SectionContract {
  name: string;       // section heading or descriptor
  establishes: string;
  mustNotRepeat?: string; // what belongs in a prior section and must not appear here
}

const DOC_SECTION_CONTRACTS: Partial<Record<DocumentType, SectionContract[]>> = {
  cover_letter: [
    { name: 'Opening / Treaty Basis',       establishes: 'applicant nationality, treaty country, E-2 category, and consulate', mustNotRepeat: undefined },
    { name: 'Investment',                   establishes: 'total investment amount, at-risk nature, irrevocability, and source summary', mustNotRepeat: 'nationality or treaty basis' },
    { name: 'Source of Funds',              establishes: 'lawful origin of every fund tranche and chain of title to U.S.', mustNotRepeat: 'investment amount (stated once above)' },
    { name: 'Substantiality',               establishes: 'investment is substantial relative to total cost of the enterprise', mustNotRepeat: 'source of funds narrative' },
    { name: 'Non-Marginality',              establishes: 'business will generate more than enough to support applicant; jobs created or projected', mustNotRepeat: 'raw investment figure (reference only)' },
    { name: 'Active Management / Direction', establishes: 'applicant controls or directs the enterprise; operational role defined', mustNotRepeat: 'non-marginality job numbers' },
    { name: 'Investor Qualifications',      establishes: 'transferable skills and expertise that make the applicant qualified to run this specific business', mustNotRepeat: 'management role description (no re-statement of title)' },
    { name: 'Conclusion / Relief Sought',   establishes: 'specific visa category requested, duration, and accompanying dependents if any', mustNotRepeat: 'any substantive argument (conclusion only)' },
  ],
  business_plan: [
    { name: 'Executive Summary',            establishes: 'business concept, investment amount, job creation summary, and treaty nationality', mustNotRepeat: undefined },
    { name: 'Business Description',         establishes: 'products/services, business model, target market, competitive advantage', mustNotRepeat: 'investment figures (covered in Executive Summary)' },
    { name: 'Market Analysis',              establishes: 'market size, demand data, competitive landscape, location rationale', mustNotRepeat: 'business concept (stated in Executive Summary)' },
    { name: 'Operations Plan',              establishes: 'day-to-day operations, staffing, suppliers, premises, technology', mustNotRepeat: 'market data (that is Market Analysis territory)' },
    { name: 'Management & Organization',    establishes: 'org chart, applicant role and title, key personnel, management hierarchy', mustNotRepeat: 'operations plan detail' },
    { name: 'Financial Projections',        establishes: '3-5 year P&L, revenue assumptions, staffing milestones, job creation timeline', mustNotRepeat: 'investment amount (reference only — fully established in Executive Summary)' },
    { name: 'Investment Plan',              establishes: 'use of proceeds, evidence funds are committed, timeline of expenditure', mustNotRepeat: 'revenue projections (those belong in Financial Projections)' },
  ],
  source_of_funds: [
    { name: 'Introduction',                 establishes: 'total investment amount and that funds originate from lawful sources', mustNotRepeat: undefined },
    { name: 'Source Narrative (per tranche)', establishes: 'each fund source with date, amount, origin event (sale / salary / savings / inheritance), documentation reference', mustNotRepeat: 'introduction totals (tranche detail only)' },
    { name: 'Fund Transfer Chronology',     establishes: 'each wire or transfer from origin account to U.S. business account with dates and reference numbers', mustNotRepeat: 'source event narrative (that belongs above)' },
    { name: 'Current Status',               establishes: 'funds are currently invested / committed / at risk in the U.S. enterprise', mustNotRepeat: 'origin story (already established)' },
  ],
  qualifications: [
    { name: 'Professional Summary',         establishes: 'years of experience, industry, and relevance to the E-2 business', mustNotRepeat: undefined },
    { name: 'Career History',               establishes: 'chronological roles with specific achievements demonstrating management and operational skills', mustNotRepeat: 'professional summary (no re-stating of the headline)' },
    { name: 'Transferable Skills',          establishes: 'direct mapping of past skills and experience to the specific requirements of the U.S. enterprise', mustNotRepeat: 'career history titles (reference only)' },
    { name: 'Education & Credentials',      establishes: 'formal qualifications, certifications, or training relevant to the business', mustNotRepeat: 'career history (education is its own section)' },
  ],
  marginality_rebuttal: [
    { name: 'The Non-Marginality Standard', establishes: 'legal standard: business must generate income significantly beyond a living for the investor and family', mustNotRepeat: undefined },
    { name: 'Job Creation Evidence',        establishes: 'current or projected U.S. worker jobs with timeline and job descriptions', mustNotRepeat: 'legal standard definition' },
    { name: 'Revenue Projections',          establishes: 'year-by-year revenue and profit demonstrating the enterprise is not marginal', mustNotRepeat: 'job numbers (already stated)' },
    { name: 'Community / Economic Impact',  establishes: 'taxes, local economic contribution, multiplier effects if applicable', mustNotRepeat: 'raw revenue figures' },
    { name: 'Rebuttal Conclusion',          establishes: 'the business satisfies the non-marginality standard; request for approval', mustNotRepeat: 'any substantive argument (conclusion only)' },
  ],
};

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

  // CIC-P.3: section structural contract for this document type
  const sectionContracts = DOC_SECTION_CONTRACTS[documentType];
  const sectionContractBlock = sectionContracts
    ? [
        'REQUIRED SECTIONS IN ORDER (structural contract):',
        sectionContracts.map((s, i) =>
          `  ${i + 1}. ${s.name}\n     MUST establish: ${s.establishes}${s.mustNotRepeat ? `\n     MUST NOT repeat: ${s.mustNotRepeat}` : ''}`
        ).join('\n'),
        '',
        'ARGUMENT DENSITY RULE: Every body paragraph must carry at least one of:',
        '  (a) a qualifying fact about the investment, business, or applicant,',
        '  (b) a rebuttal of a known denial risk,',
        '  (c) a specific reference to an exhibit or evidence.',
        '  Flag any paragraph that does none of these as a flow issue.',
      ].join('\n')
    : '(no structural contract defined for this document type)';

  return `DOCUMENT TYPE: ${documentType}
TONE TARGET: ${toneTarget}

DIRECTIVES FOR THIS DOCUMENT (must be followed):
${directivesList}

DIMENSION VERDICTS (reference only — do not re-reason):
${verdictsList}

CONTRADICTED DIMENSIONS (must NOT be asserted in the document):
${contradictedDimensions.length > 0 ? contradictedDimensions.join(', ') : 'none'}

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

  const raw = await callLLM({
    task: 'extract',
    route: '/lib/cic-verifier',
    userId,
    max_tokens: 2000,
    timeoutMs: 60_000,
    messages: [
      { role: 'system', content: VERIFIER_SYSTEM },
      { role: 'user',   content: prompt },
    ],
  });

  if (!raw) return null;
  return parseVerifierResult(raw);
}
