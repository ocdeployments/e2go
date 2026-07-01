/**
 * 9 FAM 402.9-6(D) sliding-scale substantiality thresholds.
 *
 * Returns the minimum proportion of total enterprise cost the investor must
 * contribute from their own funds.  Both the profile-match engine and the
 * FDD scoring engine must derive their thresholds from this single table.
 */
export interface SubstantialityBand {
  /** Upper bound of total investment (inclusive, USD) */
  upTo: number;
  /** Minimum required proportion (0–1) to PASS */
  pass: number;
  /** Minimum required proportion (0–1) to WARN (below this = fail) */
  warn: number;
}

export const SUBSTANTIALITY_BANDS: SubstantialityBand[] = [
  { upTo:    75_000, pass: 0.90, warn: 0.75 },
  { upTo:   150_000, pass: 0.75, warn: 0.60 },
  { upTo:   300_000, pass: 0.65, warn: 0.50 },
  { upTo:   500_000, pass: 0.55, warn: 0.40 },
  { upTo: 1_000_000, pass: 0.45, warn: 0.30 },
  { upTo: Infinity,  pass: 0.35, warn: 0.20 },
];

/**
 * Returns the minimum required ownership ratio (pass threshold) for a given
 * total investment amount.  Equivalent to the old per-engine local functions.
 */
export function substantialityPassThreshold(totalInvestment: number): number {
  return getBand(totalInvestment).pass;
}

export function substantialityWarnThreshold(totalInvestment: number): number {
  return getBand(totalInvestment).warn;
}

export type SubstantialityResult = 'pass' | 'warn' | 'fail' | 'unknown';

export function scoreSubstantiality(
  investorFunds: number | null,
  totalInvestment: number | null,
): SubstantialityResult {
  if (investorFunds === null || totalInvestment === null || totalInvestment === 0) return 'unknown';
  const ratio = investorFunds / totalInvestment;
  const band = getBand(totalInvestment);
  if (ratio >= band.pass) return 'pass';
  if (ratio >= band.warn) return 'warn';
  return 'fail';
}

function getBand(totalInvestment: number): SubstantialityBand {
  return SUBSTANTIALITY_BANDS.find(b => totalInvestment <= b.upTo) ?? SUBSTANTIALITY_BANDS[SUBSTANTIALITY_BANDS.length - 1];
}
