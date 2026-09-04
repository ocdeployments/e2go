/**
 * The vocabulary the analysis engine stores its case_briefs scores in.
 *
 * Every *_score column on case_briefs is TEXT holding one of these words —
 * not a number, and not a 0–1 fraction. Several readers assumed otherwise and
 * compared the value against a numeric threshold, which is silently false for
 * a string, or asked for a `marginality_score` column that does not exist at
 * all. This module is the one place that knows the shape, so the readers can
 * stop guessing at it.
 *
 * PENDING is a real stored value meaning "not assessed yet". It deliberately
 * does not map to a level: it is the absence of a reading, not a weak one, and
 * a caller that treated it as weak would invent a risk the engine never found.
 */

export type ScoreLevel = 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';

const SEVERITY: Record<ScoreLevel, number> = {
  CRITICAL: 0,
  WEAK: 1,
  ADEQUATE: 2,
  STRONG: 3,
};

/**
 * Read one stored value. Returns null for PENDING, for null, and for anything
 * outside the vocabulary — all of which mean the same thing to a caller: there
 * is no assessment here to act on.
 */
export function asScoreLevel(value: unknown): ScoreLevel | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return upper === 'STRONG' || upper === 'ADEQUATE' || upper === 'WEAK' || upper === 'CRITICAL'
    ? (upper as ScoreLevel)
    : null;
}

/**
 * The worst reading among several, ignoring the ones that are absent.
 *
 * Marginality is stored as two separate judgements — income and contribution —
 * and a case is only as strong as the weaker of them, which is how the package
 * summary already reads them.
 */
export function weakestScore(...values: unknown[]): ScoreLevel | null {
  let worst: ScoreLevel | null = null;
  for (const value of values) {
    const level = asScoreLevel(value);
    if (level && (worst === null || SEVERITY[level] < SEVERITY[worst])) worst = level;
  }
  return worst;
}

/** Whether this reading is one a consular officer would probe. */
export function isBelowAdequate(level: ScoreLevel | null): boolean {
  return level === 'WEAK' || level === 'CRITICAL';
}

/** The stored word in running prose: "adequate", "critical". */
export function scoreWords(level: ScoreLevel): string {
  return level.toLowerCase();
}
