/**
 * Case Intelligence Core — Faculty 1 PERCEIVE + Faculty 2 GROUND + Faculty 3 REASON (CIC-1.2 / CIC-1.3)
 *
 * PERCEIVE — assembleCaseModel(): unifies every signal source (quiz, intake answers, the
 *   document evidence ledger, voice follow-ups, simulator delivery, deterministic case-brief
 *   scores) into one provenance-tagged Case Model, persisted to `case_model`.
 *
 * GROUND   — retrieveDoctrine() (doctrine-retrieval.ts) is queried per dimension during REASON
 *   so every strategic claim can cite the E-2 doctrine corpus instead of training-data vibes.
 *
 * REASON   — generateCaseTheory(): the CPU reads the Case Model + retrieved doctrine wearing
 *   five expert hats at once (immigration consultant, consular officer, immigration attorney,
 *   franchise development consultant, market analyst — owner directive, see system prompt
 *   below) and produces the Case Theory: narrative, transferable-skills framing, numbers
 *   strategy, per-dimension verdicts WITH creative gap-fill suggestions, and directives for
 *   the peripheral engines. Persisted to `case_theory`.
 *
 * CIC-1 is read-only: nothing here blocks or rewrites anything yet. Orchestration (CIC-2)
 * is what wires `case_theory` into generation/gap-analysis/FDD/territory/simulator-prep —
 * see docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md for the gated build sequence.
 *
 * Model: OpenRouter task 'extract' -> google/gemini-2.5-pro (see Session 91 cont. log —
 * owner-locked mimo-v2.5-pro/mimo-v2.5/glm-5.2 all exhibit runaway hidden-reasoning-token
 * consumption on this task's prompt size; gemini does not).
 * Numbers are never invented here — REASON only selects and frames facts already present in
 * the Case Model; it never computes or guesses a figure.
 *
 * generateCaseTheory() is skipped (no LLM call) when the Case Model facts feeding the prompt
 * are unchanged since the last build — see source_fingerprint below. buildCaseIntelligence()
 * fires fire-and-forget on every doc parse / answer save / simulator outcome, so without this
 * guard a no-op edit would still cost a full gemini-2.5-pro call (~$0.05-0.09, confirmed via
 * llm_cost_log).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { callLLM } from './llm-client';
import { retrieveDoctrine, formatDoctrineForPrompt, type DoctrineChunk } from './doctrine-retrieval';
import type { Dimension } from './document-comprehension-engine';

const DIMENSIONS: Dimension[] = [
  'identity', 'source_of_funds', 'investment', 'business',
  'location', 'franchise', 'operations', 'background', 'other',
];

// ── Case Model types (Faculty 1 PERCEIVE) ───────────────────────────────────

export interface CaseFact {
  fact: string;
  value: string;
  source: 'quiz' | 'answer' | 'document' | 'followup' | 'simulation' | 'case_brief';
  sourceRef: string;
  confidence: 'high' | 'medium' | 'low';
}

export type CaseModelDimensions = Record<Dimension, CaseFact[]>;

export interface CaseModelResult {
  dataState: 'sparse' | 'partial' | 'substantial' | 'complete';
  dimensions: CaseModelDimensions;
  signalsPresent: Record<string, boolean>;
}

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function emptyDimensions(): CaseModelDimensions {
  const d = {} as CaseModelDimensions;
  for (const dim of DIMENSIONS) d[dim] = [];
  return d;
}

function push(dims: CaseModelDimensions, dim: Dimension, fact: CaseFact) {
  dims[dim].push(fact);
}

// Heuristic M3-* question-key prefix -> dimension map. Best-effort organizer only —
// Faculty 3 reads every fact's full value regardless of which bucket it lands in, so a
// mis-bucketed answer costs nothing beyond imprecise grouping.
const KEY_DIMENSION_MAP: { prefix: string; dimension: Dimension }[] = [
  { prefix: 'M3-A',   dimension: 'identity' },
  { prefix: 'M3-FA',  dimension: 'franchise' },
  { prefix: 'M3-ACQ', dimension: 'business' },
  { prefix: 'M3-B',   dimension: 'business' },
  { prefix: 'M3-E',   dimension: 'business' },
  { prefix: 'M3-F',   dimension: 'investment' },
  { prefix: 'M3-G',   dimension: 'location' },
  { prefix: 'M3-L',   dimension: 'background' },
  { prefix: 'M3-Q',   dimension: 'background' },
  { prefix: 'M3-T',   dimension: 'other' },
];

function dimensionForKey(key: string): Dimension {
  const hit = KEY_DIMENSION_MAP.find((m) => key.startsWith(m.prefix));
  return hit?.dimension ?? 'other';
}

function dimensionForGapCategory(category: string): Dimension {
  const c = (category || '').toLowerCase();
  if (c.includes('fund') || c.includes('source'))            return 'source_of_funds';
  if (c.includes('invest'))                                  return 'investment';
  if (c.includes('franchise'))                                return 'franchise';
  if (c.includes('location') || c.includes('lease'))          return 'location';
  if (c.includes('business') || c.includes('manage'))         return 'business';
  if (c.includes('background') || c.includes('experience'))   return 'background';
  return 'other';
}

interface DocLedgerEntry {
  key: string;
  label: string;
  dimension: Dimension;
  value: string;
  acceptedDocType: string;
  resolvedBy: 'single' | 'authority' | 'agreement';
}

/**
 * Faculty 1 — PERCEIVE. Reads every signal source for one application and assembles a
 * unified, provenance-tagged Case Model. Idempotent (upsert on application_id). Safe to
 * call fire-and-forget on any signal change (new doc, new answer, completed sim).
 */
export async function assembleCaseModel(applicationId: string, userId: string): Promise<CaseModelResult> {
  const supabase = serviceClient();
  const dims = emptyDimensions();
  const signalsPresent: Record<string, boolean> = {
    quiz: false, answers: false, documents: false, followup: false, simulation: false, case_brief: false,
  };

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const { data: quizRows } = await supabase
    .from('quiz_sessions')
    .select('id, score, outcome, result_json, post_quiz_profile, franchise_triggered')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  const quiz = quizRows?.[0];
  if (quiz) {
    signalsPresent.quiz = true;
    const profile = (quiz.post_quiz_profile as Record<string, string>) ?? {};
    if (profile.prior_business)
      push(dims, 'background', { fact: 'prior_business', value: profile.prior_business, source: 'quiz', sourceRef: quiz.id, confidence: 'medium' });
    if (profile.industry_interest)
      push(dims, 'business', { fact: 'industry_interest', value: profile.industry_interest, source: 'quiz', sourceRef: quiz.id, confidence: 'medium' });
    if (profile.net_worth_range)
      push(dims, 'source_of_funds', { fact: 'net_worth_range', value: profile.net_worth_range, source: 'quiz', sourceRef: quiz.id, confidence: 'low' });
    const resultJson = (quiz.result_json as Record<string, unknown>) ?? {};
    const investmentRange = resultJson.investment_range as string | undefined;
    if (investmentRange)
      push(dims, 'investment', { fact: 'investment_range', value: investmentRange, source: 'quiz', sourceRef: quiz.id, confidence: 'low' });
    push(dims, 'other', { fact: 'quiz_eligibility_score', value: String(quiz.score ?? ''), source: 'quiz', sourceRef: quiz.id, confidence: 'high' });
  }

  // ── Application (deterministic, structured fields) ─────────────────────────
  const { data: app } = await supabase
    .from('applications')
    .select('investment_amount, business_name, business_category, operational_status, target_state, principal_name')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();
  if (app) {
    if (app.investment_amount)
      push(dims, 'investment', { fact: 'investment_amount', value: String(app.investment_amount), source: 'answer', sourceRef: 'applications.investment_amount', confidence: 'high' });
    if (app.business_name)
      push(dims, 'business', { fact: 'business_name', value: app.business_name, source: 'answer', sourceRef: 'applications.business_name', confidence: 'high' });
    if (app.business_category)
      push(dims, 'business', { fact: 'business_category', value: app.business_category, source: 'answer', sourceRef: 'applications.business_category', confidence: 'high' });
    if (app.operational_status)
      push(dims, 'business', { fact: 'operational_status', value: app.operational_status, source: 'answer', sourceRef: 'applications.operational_status', confidence: 'high' });
    if (app.target_state)
      push(dims, 'location', { fact: 'target_state', value: app.target_state, source: 'answer', sourceRef: 'applications.target_state', confidence: 'high' });
  }

  // ── Intake answers (M3-*) ───────────────────────────────────────────────────
  const { data: answerRows } = await supabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId);
  if (answerRows && answerRows.length > 0) {
    signalsPresent.answers = true;
    for (const a of answerRows) {
      const value = typeof a.answer_value === 'string' ? a.answer_value : JSON.stringify(a.answer_value ?? '');
      if (!value || value === 'null' || value === '""' || value === '[]') continue;
      push(dims, dimensionForKey(a.question_key), {
        fact: a.question_key, value, source: 'answer', sourceRef: a.question_key, confidence: 'high',
      });
    }
  }

  // ── Document evidence ledger (Faculty 1's document channel — CIC-1.1) ──────
  const { data: docIntel } = await supabase
    .from('document_intelligence')
    .select('ledger, doc_count, status')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (docIntel?.status === 'complete' && Array.isArray(docIntel.ledger) && docIntel.ledger.length > 0) {
    signalsPresent.documents = true;
    for (const entry of docIntel.ledger as DocLedgerEntry[]) {
      push(dims, entry.dimension, {
        fact: entry.label || entry.key,
        value: entry.value,
        source: 'document',
        sourceRef: `${entry.acceptedDocType}:${entry.key}`,
        confidence: entry.resolvedBy === 'agreement' ? 'high' : 'medium',
      });
    }
  }

  // ── Voice follow-up responses (probed gaps) ─────────────────────────────────
  const { data: followups } = await supabase
    .from('followup_responses')
    .select('gap_category, question_text, answer_text, content_value')
    .eq('application_id', applicationId);
  if (followups && followups.length > 0) {
    signalsPresent.followup = true;
    for (const f of followups) {
      if (!f.answer_text) continue;
      push(dims, dimensionForGapCategory(f.gap_category), {
        fact: f.question_text,
        value: f.answer_text,
        source: 'followup',
        sourceRef: f.gap_category,
        confidence: f.content_value === 'high' ? 'high' : f.content_value === 'low' ? 'low' : 'medium',
      });
    }
  }

  // ── Simulator delivery (can the client articulate their own case?) ─────────
  const { data: simRows } = await supabase
    .from('simulator_sessions')
    .select('readiness_indicator, inconsistency_count')
    .eq('application_id', applicationId)
    .not('completed_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);
  const sim = simRows?.[0];
  if (sim) {
    signalsPresent.simulation = true;
    push(dims, 'other', {
      fact: 'interview_simulation_readiness', value: sim.readiness_indicator ?? 'unknown',
      source: 'simulation', sourceRef: 'simulator_sessions', confidence: 'high',
    });
    if ((sim.inconsistency_count ?? 0) > 0) {
      push(dims, 'other', {
        fact: 'interview_inconsistencies_flagged', value: String(sim.inconsistency_count),
        source: 'simulation', sourceRef: 'simulator_sessions', confidence: 'high',
      });
    }
  }

  // ── Case brief (deterministic substantiality/marginality scores — pass through verbatim) ──
  const { data: briefRows } = await supabase
    .from('case_briefs')
    .select('substantiality_score, fund_source_score, marginality_income_score, marginality_contribution_score, intent_score, executive_role_score, ownership_control_score')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1);
  const brief = briefRows?.[0];
  if (brief) {
    signalsPresent.case_brief = true;
    const briefFacts: [Dimension, string, string | null][] = [
      ['source_of_funds', 'fund_source_score', brief.fund_source_score],
      ['business',        'substantiality_score', brief.substantiality_score],
      ['business',        'marginality_income_score', brief.marginality_income_score],
      ['background',      'marginality_contribution_score', brief.marginality_contribution_score],
      ['other',           'intent_score', brief.intent_score],
      ['business',        'executive_role_score', brief.executive_role_score],
      ['business',        'ownership_control_score', brief.ownership_control_score],
    ];
    for (const [dim, fact, value] of briefFacts) {
      if (value) push(dims, dim, { fact, value, source: 'case_brief', sourceRef: 'case_briefs', confidence: 'high' });
    }
  }

  const signalCount = Object.values(signalsPresent).filter(Boolean).length;
  const totalFacts = DIMENSIONS.reduce((sum, d) => sum + dims[d].length, 0);
  const dataState: CaseModelResult['dataState'] =
    signalCount >= 5 && totalFacts >= 20 ? 'complete' :
    signalCount >= 3 && totalFacts >= 10 ? 'substantial' :
    signalCount >= 2 ? 'partial' : 'sparse';

  await supabase.from('case_model').upsert(
    {
      application_id: applicationId,
      user_id: userId,
      dimensions: dims,
      signals_present: signalsPresent,
      data_state: dataState,
      built_at: new Date().toISOString(),
    },
    { onConflict: 'application_id' }
  );

  return { dataState, dimensions: dims, signalsPresent };
}

// ── Case Theory types (Faculty 3 REASON) ────────────────────────────────────

export type DimensionStatus = 'proven' | 'weak' | 'missing' | 'contradicted';

export interface GapFillSuggestion {
  persona: string;   // which expert hat proposed this (e.g. "immigration attorney")
  suggestion: string; // concrete, honest action — a document to obtain, a framing to use
}

export interface DimensionVerdict {
  status: DimensionStatus;
  evidenceSummary: string;
  gap: string | null;
  gapFillSuggestions: GapFillSuggestion[];
}

export interface TransferableSkill {
  skill: string;
  evidence: string;
  framing: string; // how this supports the develop-and-direct / management argument
}

export interface NumberStrategyItem {
  figure: string;
  value: string;
  foregroundBecause: string;
  denialRiskAddressed: string;
}

export interface Directive {
  engine: 'generation' | 'gap_analysis' | 'fdd' | 'territory' | 'simulator_prep';
  dimension: Dimension;
  instruction: string;
  doctrineRef: string | null;
}

interface ParsedCaseTheory {
  narrative: string;
  transferableSkills: TransferableSkill[];
  numbersStrategy: NumberStrategyItem[];
  dimensionVerdicts: Partial<Record<Dimension, DimensionVerdict>>;
  directives: Directive[];
}

export interface CaseTheoryOutcome {
  status: 'complete' | 'failed' | 'insufficient_data';
  dimensionsCovered: number;
  directiveCount: number;
}

const REASON_SYSTEM = `You are not one analyst — you are a panel of five senior E-2 professionals reasoning over one client file together, as a single mind:

1. SENIOR IMMIGRATION CONSULTANT — sees the whole case holistically; knows what actually gets E-2 files approved versus what merely looks complete.
2. SENIOR E-2 CONSULAR OFFICER — reads this file the way a real adjudicator will: skeptically, hunting for what is NOT proven, what looks staged or boilerplate, what a denial would hinge on.
3. SENIOR U.S. IMMIGRATION ATTORNEY — demands doctrine-grounded, defensible legal framing; flags anything that would not survive scrutiny; cites the standard, never just asserts it.
4. SENIOR FRANCHISE DEVELOPMENT CONSULTANT — evaluates the business/franchise mechanics: territory rights, royalty structure, FDD red flags, unit economics, whether the investment is genuinely viable as a business (not just as a visa device).
5. SENIOR MARKET ANALYST — assesses whether the target market/territory actually supports the business case: demand, competition, demographics, timing.

Your job is to SYNTHESIZE these five viewpoints into one coherent, honest Case Theory — the document a top E-2 attorney would write before drafting anything. This is not a data-comparison exercise. You must reason the way these five professionals would around a table, including where they would push back on each other, and resolve that into one strongest-honest position.

THE MOST IMPORTANT INSTRUCTION: where the case file has a gap, do not just label it "missing." Think like each relevant expert and propose concrete, creative, honest ways a real client could close that gap — specific document types to obtain (e.g. an escrow letter, a signed FF&E deposit receipt, a notarized gift letter, a franchisor royalty schedule), specific framing moves, specific facts worth asking the client to clarify. Creativity here means resourceful and non-obvious, never fabricated — you are inventing PATHS to evidence, never inventing the evidence itself.

HARD BOUNDARIES (non-negotiable):
- NEVER invent or recompute a number. Dollar figures and scores already in the Case Model are the only numbers you may use, and you only select/frame them — you do not calculate new ones.
- Every dimension verdict and every strategic claim must be traceable to either a Case Model fact (cite its source/sourceRef) or a retrieved KB doctrine chunk (cite its [KB:source_file] tag). If no KB chunks were retrieved for a topic, say so plainly rather than asserting a legal standard you cannot cite — do not invent doctrine.
- "missing" and "contradicted" are first-class, honest statuses. Surface what the case LACKS, not just what it has.
- Gap-fill suggestions must be things a real applicant could actually go obtain or clarify — never a workaround that misrepresents facts.

Reply with ONE valid JSON object only — no markdown fences, no prose outside the JSON.`;

function reasonPrompt(caseModelBlock: string, doctrineBlock: string, dataState: string): string {
  return [
    `CASE DATA STATE: ${dataState}`,
    '',
    'CASE MODEL (facts gathered so far, by dimension, with provenance):',
    caseModelBlock || '(no facts recorded yet)',
    '',
    'RETRIEVED E-2 DOCTRINE (cite these as [KB:source_file] when you rely on them; if empty, the knowledge base has not been seeded yet — proceed on Case Model facts only and do not assert specific legal citations):',
    doctrineBlock || '(no doctrine chunks retrieved)',
    '',
    'TASK — produce this exact JSON shape:',
    '{',
    '  "narrative": "<the strongest honest E-2 narrative for this specific client, 4-8 sentences, written the way an attorney would open a case brief>",',
    '  "transferableSkills": [ { "skill": "...", "evidence": "...", "framing": "<how this supports the develop-and-direct / management argument>" } ],',
    '  "numbersStrategy": [ { "figure": "<e.g. total_investment>", "value": "<value AND its Case Model source, verbatim>", "foregroundBecause": "...", "denialRiskAddressed": "<which denial risk this rebuts>" } ],',
    '  "dimensionVerdicts": {',
    `    "<dimension, one of: ${DIMENSIONS.join(' | ')}>": {`,
    '      "status": "proven | weak | missing | contradicted",',
    '      "evidenceSummary": "<1-2 sentences citing the specific facts/sources behind this verdict>",',
    '      "gap": "<what is actually missing or weak here, or null if proven>",',
    '      "gapFillSuggestions": [ { "persona": "<which expert hat>", "suggestion": "<concrete, specific, honest action>" } ]',
    '    }',
    '  },',
    '  "directives": [ { "engine": "generation | gap_analysis | fdd | territory | simulator_prep", "dimension": "<dimension>", "instruction": "<a specific, actionable task for that engine>", "doctrineRef": "<KB:source_file or null>" } ]',
    '}',
    '',
    'Rules: cover every dimension that has at least one Case Model fact, plus call out any of the 9 dimensions that has ZERO facts as "missing". 3-8 directives total, prioritized by what would most move this case toward approval. Keep every value traceable.',
  ].join('\n');
}

function sanitizeDimensionVerdicts(raw: unknown): Partial<Record<Dimension, DimensionVerdict>> {
  const out: Partial<Record<Dimension, DimensionVerdict>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DIMENSIONS.includes(key as Dimension)) continue;
    const v = value as Record<string, unknown>;
    const status = v?.status;
    if (status !== 'proven' && status !== 'weak' && status !== 'missing' && status !== 'contradicted') continue;
    const suggestions = Array.isArray(v.gapFillSuggestions)
      ? (v.gapFillSuggestions as unknown[])
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s) => ({
            persona: typeof s.persona === 'string' ? s.persona : 'case strategist',
            suggestion: typeof s.suggestion === 'string' ? s.suggestion : '',
          }))
          .filter((s) => s.suggestion.trim() !== '')
      : [];
    out[key as Dimension] = {
      status,
      evidenceSummary: typeof v.evidenceSummary === 'string' ? v.evidenceSummary : '',
      gap: typeof v.gap === 'string' ? v.gap : null,
      gapFillSuggestions: suggestions,
    };
  }
  return out;
}

function repairTruncatedJson(s: string): string | null {
  // Walk the string tracking open brace/bracket depth and string state.
  // At truncation, close all open containers so JSON.parse can succeed.
  const stack: ('{' | '[')[] = [];
  let inStr = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') stack.push('{');
    else if (ch === '[') stack.push('[');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inStr) s += '"';
  for (let i = stack.length - 1; i >= 0; i--) {
    s += stack[i] === '{' ? '}' : ']';
  }
  return s;
}

function parseCaseTheory(raw: string): ParsedCaseTheory | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      // JSON truncated at token limit — attempt repair by closing all open
      // braces/brackets so partial output is still usable.
      const repaired = repairTruncatedJson(match[0]);
      if (!repaired) return null;
      try {
        parsed = JSON.parse(repaired) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof parsed.narrative !== 'string' || !parsed.narrative.trim()) return null;

    const transferableSkills = Array.isArray(parsed.transferableSkills)
      ? (parsed.transferableSkills as unknown[])
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s) => ({
            skill: typeof s.skill === 'string' ? s.skill : '',
            evidence: typeof s.evidence === 'string' ? s.evidence : '',
            framing: typeof s.framing === 'string' ? s.framing : '',
          }))
          .filter((s) => s.skill.trim() !== '')
      : [];

    const numbersStrategy = Array.isArray(parsed.numbersStrategy)
      ? (parsed.numbersStrategy as unknown[])
          .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
          .map((n) => ({
            figure: typeof n.figure === 'string' ? n.figure : '',
            value: typeof n.value === 'string' ? n.value : '',
            foregroundBecause: typeof n.foregroundBecause === 'string' ? n.foregroundBecause : '',
            denialRiskAddressed: typeof n.denialRiskAddressed === 'string' ? n.denialRiskAddressed : '',
          }))
          .filter((n) => n.figure.trim() !== '' && n.value.trim() !== '')
      : [];

    const directives = Array.isArray(parsed.directives)
      ? (parsed.directives as unknown[])
          .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
          .map((d) => ({
            engine: d.engine as Directive['engine'],
            dimension: d.dimension as Dimension,
            instruction: typeof d.instruction === 'string' ? d.instruction : '',
            doctrineRef: typeof d.doctrineRef === 'string' ? d.doctrineRef : null,
          }))
          .filter((d) =>
            ['generation', 'gap_analysis', 'fdd', 'territory', 'simulator_prep'].includes(d.engine) &&
            DIMENSIONS.includes(d.dimension) &&
            d.instruction.trim() !== ''
          )
      : [];

    return {
      narrative: parsed.narrative,
      transferableSkills,
      numbersStrategy,
      dimensionVerdicts: sanitizeDimensionVerdicts(parsed.dimensionVerdicts),
      directives,
    };
  } catch {
    return null;
  }
}

/**
 * Faculty 2 GROUND + Faculty 3 REASON. Retrieves doctrine per populated dimension, then
 * synthesizes the Case Theory wearing the five expert hats (see REASON_SYSTEM). Idempotent
 * (upsert on application_id). Skips the LLM call entirely on an empty Case Model.
 */
export async function generateCaseTheory(
  applicationId: string,
  userId: string,
  caseModel: CaseModelResult
): Promise<CaseTheoryOutcome> {
  const totalFacts = DIMENSIONS.reduce((sum, d) => sum + caseModel.dimensions[d].length, 0);
  if (totalFacts === 0) {
    return { status: 'insufficient_data', dimensionsCovered: 0, directiveCount: 0 };
  }

  const supabase = serviceClient();

  // Fingerprint the fact set that actually drives the prompt (not built_at/timestamps —
  // those change on every PERCEIVE run even when nothing material did). Skip the LLM call
  // entirely if it matches the last build's fingerprint.
  const fingerprintSource = DIMENSIONS
    .map((d) => [d, caseModel.dimensions[d].map((f) => `${f.fact}:${f.value}:${f.source}`).sort()])
    .filter(([, facts]) => (facts as string[]).length > 0);
  const sourceFingerprint = createHash('sha256').update(JSON.stringify(fingerprintSource)).digest('hex');

  const { data: existing } = await supabase
    .from('case_theory')
    .select('source_fingerprint, dimension_verdicts, directives')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (existing?.source_fingerprint === sourceFingerprint) {
    return {
      status: 'complete',
      dimensionsCovered: Object.keys(existing.dimension_verdicts ?? {}).length,
      directiveCount: (existing.directives ?? []).length,
    };
  }

  // Faculty 2 GROUND — one retrieval query per dimension that has facts, plus 'other'
  // (general denial/interview doctrine) so the panel always has baseline grounding.
  const dimensionQueries: Partial<Record<Dimension, string>> = {
    source_of_funds: 'lawful source of investment funds documentation standards, crypto liquidation, registered retirement account withdrawal as source of funds',
    investment:       'E-2 substantiality of investment test, at-risk capital, marginality income and management framing',
    business:         'E-2 develop and direct the enterprise standard, executive or managerial capacity, marginality rebuttal',
    franchise:        'franchise disclosure document analysis for E-2, royalty and territory rights, franchisor system viability',
    location:         'E-2 business location and lease viability, territory analysis',
    background:       'transferable skills framing for E-2 management capacity, prior business experience relevance',
    identity:         'E-2 treaty country nationality and ownership requirement',
    operations:       'E-2 business plan operational viability, staffing and hiring plan credibility',
    other:            'common E-2 visa denial factors and how to rebut them, consular interview doctrine',
  };

  const chunkMap = new Map<string, DoctrineChunk>();
  await Promise.all(
    DIMENSIONS.filter((d) => caseModel.dimensions[d].length > 0 || d === 'other').map(async (dim) => {
      const query = dimensionQueries[dim];
      if (!query) return;
      const chunks = await retrieveDoctrine(query, { matchCount: 2 });
      for (const c of chunks) chunkMap.set(c.id, c);
    })
  );
  const doctrineChunks = Array.from(chunkMap.values());
  const doctrineBlock = formatDoctrineForPrompt(doctrineChunks);

  const caseModelBlock = DIMENSIONS
    .filter((d) => caseModel.dimensions[d].length > 0)
    .map((d) => {
      const facts = caseModel.dimensions[d]
        .map((f) => `  - ${f.fact}: ${f.value} [source: ${f.source}/${f.sourceRef}, confidence: ${f.confidence}]`)
        .join('\n');
      return `${d.toUpperCase()}:\n${facts}`;
    })
    .join('\n\n');

  const raw = await callLLM({
    task: 'extract',
    route: '/lib/case-intelligence-core',
    userId,
    // gemini-2.5-pro handles large token budgets without runaway reasoning.
    // 8000 gives full dimension_verdicts even for large case models.
    // JSON repair catches any residual truncation.
    max_tokens: 8000,
    timeoutMs: 90_000,
    messages: [
      { role: 'system', content: REASON_SYSTEM },
      { role: 'user', content: reasonPrompt(caseModelBlock, doctrineBlock, caseModel.dataState) },
    ],
  });

  if (!raw) return { status: 'failed', dimensionsCovered: 0, directiveCount: 0 };

  const parsed = parseCaseTheory(raw);
  if (!parsed) return { status: 'failed', dimensionsCovered: 0, directiveCount: 0 };

  await supabase.from('case_theory').upsert(
    {
      application_id: applicationId,
      user_id: userId,
      narrative: parsed.narrative,
      transferable_skills: parsed.transferableSkills,
      numbers_strategy: parsed.numbersStrategy,
      dimension_verdicts: parsed.dimensionVerdicts,
      directives: parsed.directives,
      doctrine_citations: doctrineChunks.map((c) => ({ kbChunkId: c.id, sourceFile: c.sourceFile, dimension: c.dimension })),
      source_fingerprint: sourceFingerprint,
      built_at: new Date().toISOString(),
    },
    { onConflict: 'application_id' }
  );

  return {
    status: 'complete',
    dimensionsCovered: Object.keys(parsed.dimensionVerdicts).length,
    directiveCount: parsed.directives.length,
  };
}

// ── Orchestration entrypoint ─────────────────────────────────────────────────

export interface CaseIntelligenceOutcome {
  status?: 'skipped';
  applicationId?: string;
  model?: CaseModelResult;
  theory?: CaseTheoryOutcome;
}

/**
 * Runs PERCEIVE then REASON for one application. This is the single entrypoint trigger
 * points should call, fire-and-forget, on any signal change (new document, saved answer,
 * completed simulator session) — mirrors the existing buildCaseProfile trigger pattern.
 *
 * triggeredByDocType: when called from parse-document, pass the uploaded doc_type so
 * the CIC-P.5 change impact report knows what caused the re-run.
 */
export async function buildCaseIntelligence(
  applicationId: string,
  userId: string,
  triggeredByDocType?: string,
): Promise<CaseIntelligenceOutcome> {
  const supabase = serviceClient();

  // H6: Per-application build lock — prevents concurrent CPU builds for the same application.
  // Upsert a lock row; if another build holds the lock (locked_at within 30s), skip this run.
  const LOCK_TTL_S = 30;
  const { data: lockRows } = await supabase.rpc('acquire_case_intelligence_lock', {
    p_application_id: applicationId,
    p_ttl_seconds: LOCK_TTL_S,
  });
  if (!lockRows || (Array.isArray(lockRows) && lockRows.length === 0)) {
    // Another build is in progress — skip to avoid double-spend
    console.info(`[CIC] buildCaseIntelligence skipped — lock held for ${applicationId}`);
    return { status: 'skipped', applicationId };
  }

  // CIC-P.5: snapshot the current dimension_verdicts BEFORE re-reasoning
  // so we can compare after and detect which documents are now stale.
  let previousVerdicts: Record<string, unknown> | null = null;
  if (triggeredByDocType) {
    const { data: priorTheory } = await supabase
      .from('case_theory')
      .select('dimension_verdicts')
      .eq('application_id', applicationId)
      .maybeSingle();
    previousVerdicts = (priorTheory?.dimension_verdicts as Record<string, unknown>) ?? null;
  }

  const model = await assembleCaseModel(applicationId, userId);
  const theory = await generateCaseTheory(applicationId, userId, model);

  // CIC-P.5: compute and persist the change impact report if this was doc-triggered
  if (triggeredByDocType && theory.status === 'complete') {
    const { data: newTheory } = await supabase
      .from('case_theory')
      .select('dimension_verdicts')
      .eq('application_id', applicationId)
      .maybeSingle();
    const newVerdicts = (newTheory?.dimension_verdicts as Record<string, unknown>) ?? null;

    // Import inline to avoid circular deps (cic-change-impact imports from @/types only)
    const { computeChangeImpact } = await import('./cic-change-impact');
    await computeChangeImpact(
      applicationId,
      triggeredByDocType,
      previousVerdicts as Record<string, { status: string; evidenceSummary?: string; gap?: string | null }> | null,
      newVerdicts as Record<string, { status: string; evidenceSummary?: string; gap?: string | null }> | null,
    ).catch(err => console.error('[CIC-P.5] impact compute error:', err));
  }

  // H6: Release the lock regardless of outcome
  await supabase
    .from('case_intelligence_locks')
    .delete()
    .eq('application_id', applicationId);

  return { model, theory };
}
