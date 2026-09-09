/**
 * WS4 / CPU Intelligence Pack — 4E Person/narrative, D20
 *
 * D20 — "Prior refusals are seed data, not shame." A prior US visa refusal
 * is not a fact that belongs only in the Cover Letter's refusal paragraph —
 * it is a global case-theory modifier. Every document's evidence standard
 * tightens: an officer who denied this applicant once will read every
 * subsequent document looking for what changed. This module reads the
 * quiz-sourced Q0-09a answer (prefilled into M3-A-21, see prefill.ts
 * isPriorVisas) and returns a tier + directive text for Faculty 3 REASON
 * to inject as a binding, case-wide instruction — not a per-document note.
 *
 * Ground rule (same as case-financials.ts): never fabricate. No answer on
 * file returns tier 'none' with no modifier, not a guess.
 */

export type RefusalTier = 'none' | 'old' | 'recent' | 'multiple' | 'unknown';

export interface PriorRefusalModifier {
  tier: RefusalTier;
  raw: string | null;
  directive: string | null;
}

const TIER_FROM_ANSWER: { match: (v: string) => boolean; tier: RefusalTier }[] = [
  { match: (v) => v === 'no' || v === '' , tier: 'none' },
  { match: (v) => v.includes('more than once') || v.includes('w-refusal-multiple'), tier: 'multiple' },
  { match: (v) => v.includes('within the last 5 years') || v.includes('w-refusal-recent'), tier: 'recent' },
  { match: (v) => v.includes('more than 5 years ago') || v.includes('w-refusal-old'), tier: 'old' },
];

const TIER_DIRECTIVES: Record<'old' | 'recent' | 'multiple', string> = {
  old: 'This applicant has ONE prior US visa refusal, more than 5 years ago. This is a global case-theory modifier, not a Cover Letter footnote: every document must be internally consistent with the "what changed since then" narrative — dates, employer history, and financial capacity should read as a coherent post-refusal trajectory, not as if the refusal never happened.',
  recent: 'This applicant has ONE prior US visa refusal WITHIN THE LAST 5 YEARS. Treat this as a global case-theory modifier that tightens the evidence standard on every document, not just the Cover Letter\'s refusal paragraph: the reviewing officer will re-examine identity, funds, and business evidence for the SAME weaknesses that produced the original denial. Every dimension\'s verdict should explicitly state whether it resolves or repeats a plausible original objection.',
  multiple: 'This applicant has MULTIPLE prior US visa refusals. This is the strongest global case-theory modifier available: assume the officer will scrutinize every document for a repeated pattern, not a one-time explainable event. Every dimension must show unambiguous, independently verifiable evidence — gap-fill suggestions here should favor primary-source documents over narrative explanation.',
};

function normalize(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw)) return raw.join(',').toLowerCase();
  return String(raw).toLowerCase();
}

/**
 * D20 — reads M3-A-21 (prefilled from quiz Q0-09a; QA-23/QA-11 as legacy
 * fallbacks per prefill.ts isPriorVisas) and returns the case-wide refusal
 * modifier tier + directive text.
 */
export function computePriorRefusalModifier(answers: Record<string, unknown>): PriorRefusalModifier {
  const raw = answers['M3-A-21'] ?? answers['QA-23'] ?? answers['QA-11'];
  const normalized = normalize(raw);

  if (!normalized) {
    return { tier: 'none', raw: null, directive: null };
  }

  const hit = TIER_FROM_ANSWER.find((t) => t.match(normalized));
  const tier: RefusalTier = hit?.tier ?? 'unknown';

  if (tier === 'none') {
    return { tier: 'none', raw: String(raw), directive: null };
  }
  if (tier === 'unknown') {
    return {
      tier: 'unknown',
      raw: String(raw),
      directive: `M3-A-21 has a non-empty, unrecognized prior-refusal value ("${raw}"). Do not assume no refusal occurred — surface this as a pre-generation data-quality gap rather than silently treating the case as refusal-free.`,
    };
  }

  return { tier, raw: String(raw), directive: TIER_DIRECTIVES[tier] };
}
