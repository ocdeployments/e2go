/**
 * WS4 / CPU Intelligence Pack — 4B Funds intelligence (D4, D7)
 *
 * D4 — Risk-rank fund sources; allocate documentation depth by risk, not
 *      dollars. The live intake (M3-F-05) only captures WHICH source types
 *      an applicant used, not per-transaction amounts or dates, so this
 *      computes a blended risk tier from the selected types — not the full
 *      per-deposit seasoning/round-trip checks (D5/D6/D8), which need new
 *      intake fields this codebase does not yet collect.
 *
 * D7 — Desperation ratio: investment ÷ pre-investment net worth. Over ~80%
 *      invites "what do you live on, and what do you return to?" — when
 *      high, Net Worth and Nonimmigrant Intent must foreground retained
 *      assets and income sources.
 *
 * Ground rule (same as case-financials.ts): never fabricate. Where intake
 * does not capture a figure, the result is null with an explanatory note.
 */

export type RiskTier = 'low' | 'medium' | 'high';

export interface RankedFundSource {
  key: string;
  label: string;
  rank: number; // 1 (lowest risk) .. 7 (highest risk), scrutiny ladder position
}

export interface FundSourceRiskProfile {
  sources: RankedFundSource[];
  blendedTier: RiskTier | null;
  highestRiskSource: RankedFundSource | null;
  note: string | null;
}

export interface DesperationRatioResult {
  investedAmount: number | null;
  netWorth: number | null;
  ratio: number | null; // 0-1+
  tier: RiskTier | null;
  note: string | null;
}

// Scrutiny ladder, lowest -> highest risk (D4). Rank is the ladder position.
const FUND_SOURCE_RISK_LADDER: { key: string; label: string; rank: number }[] = [
  { key: 'savings', label: 'Personal savings / employment income', rank: 1 },
  { key: 'tfsa', label: 'TFSA withdrawal', rank: 1 },
  { key: 'rrsp', label: 'RRSP withdrawal', rank: 1 },
  { key: 'lira', label: 'LIRA or pension', rank: 1 },
  { key: 'property-sale', label: 'Sale of property', rank: 2 },
  { key: 'business-sale', label: 'Sale of a business', rank: 3 },
  { key: 'inheritance', label: 'Inheritance or gift', rank: 4 },
  { key: 'gift', label: 'Gift', rank: 5 },
  { key: 'loan', label: 'Loan / HELOC', rank: 6 },
  { key: 'crypto', label: 'Cryptocurrency or trading gains', rank: 7 },
];

const RANK_TO_TIER: Record<number, RiskTier> = {
  1: 'low', 2: 'low',
  3: 'medium', 4: 'medium', 5: 'medium',
  6: 'high', 7: 'high',
};

function parseFundSourceTypes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[$,]/g, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * D4 — ranks the applicant's selected fund source types on the scrutiny
 * ladder and computes a blended risk tier (max of the individual tiers —
 * one high-risk source is enough to require deep documentation on that
 * source, regardless of what else is present).
 */
export function computeFundSourceRiskProfile(answers: Record<string, unknown>): FundSourceRiskProfile {
  const raw = answers['M3-F-05'] ?? answers['QF-05'];
  const types = parseFundSourceTypes(raw);
  if (types.length === 0) {
    return { sources: [], blendedTier: null, highestRiskSource: null, note: 'No fund source types on file (M3-F-05 empty or missing).' };
  }

  const sources: RankedFundSource[] = types.map((key) => {
    const known = FUND_SOURCE_RISK_LADDER.find((s) => s.key === key);
    return known ?? { key, label: key, rank: 4 }; // unrecognized type -> treat as medium, never silently drop it
  });

  const highestRiskSource = sources.reduce<RankedFundSource | null>(
    (max, s) => (max === null || s.rank > max.rank ? s : max),
    null
  );
  const blendedTier = highestRiskSource ? RANK_TO_TIER[highestRiskSource.rank] : null;

  return {
    sources,
    blendedTier,
    highestRiskSource,
    note: blendedTier === 'high'
      ? `Highest-risk fund source: ${highestRiskSource!.label}. Source of Funds / Fund Flow Chronology must spend proportionally more documentation depth on this source than on the lower-risk ones.`
      : null,
  };
}

/**
 * D7 — investment ÷ pre-investment net worth. Requires both M3-F-02
 * (total invested) and M3-F-NET (net worth) on file; otherwise returns
 * null rather than guessing.
 */
export function computeDesperationRatio(answers: Record<string, unknown>): DesperationRatioResult {
  const investedAmount = getNumber(answers['M3-F-02']) ?? getNumber(answers['QF-02']);
  const netWorth = getNumber(answers['M3-F-NET']) ?? getNumber(answers['QA-56']);

  if (investedAmount === null || netWorth === null) {
    return {
      investedAmount,
      netWorth,
      ratio: null,
      tier: null,
      note: investedAmount === null
        ? 'Cannot compute desperation ratio — total invested (M3-F-02) not on file.'
        : 'Cannot compute desperation ratio — net worth (M3-F-NET) not on file. Surface this as a pre-generation client conversation, not a drafting problem.',
    };
  }

  if (netWorth <= 0) {
    return {
      investedAmount, netWorth, ratio: null, tier: 'high',
      note: 'Reported net worth is zero or negative — the case cannot show retained assets. Surface this as a pre-generation client conversation.',
    };
  }

  const ratio = investedAmount / netWorth;
  const tier: RiskTier = ratio > 0.8 ? 'high' : ratio > 0.5 ? 'medium' : 'low';

  return {
    investedAmount, netWorth, ratio, tier,
    note: tier === 'high'
      ? `Investment is ${Math.round(ratio * 100)}% of net worth (over the ~80% desperation-ratio threshold). Net Worth Statement and Nonimmigrant Intent must foreground retained assets and post-investment income sources — an officer will ask "what do you live on, and what do you return to?"`
      : null,
  };
}
