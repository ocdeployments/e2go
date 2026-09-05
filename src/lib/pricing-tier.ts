// Tier IDs match the payment_type strings in src/lib/entitlements.ts so the
// two files never drift on naming. 'interview_prep' is Interview Ready's
// underlying payment_type — kept even though its display name changed.
export type MainTierId = 'foundation' | 'investor_ready' | 'interview_prep' | 'visa_ready';
export type AddOnTierId =
  | 'fdd_analysis_addon'
  | 'market_analysis_addon'
  | 'fdd_market_bundle_addon'
  | 'loyalty_upgrade';
export type TierId = MainTierId | AddOnTierId | 'simulator_3pack' | 'renewal';

export interface PricingTier {
  id: MainTierId;
  name: string;
  price: number; // USD dollars (not cents)
  description: string;
  features: string[];
}

export interface QuizData {
  application_type?: string;
  partner_type?: string;
  dependents?: string;
  family_status?: string;
  [key: string]: unknown;
}

export const PRICING_TIERS: Record<MainTierId, PricingTier> = {
  foundation: {
    id: 'foundation',
    name: 'Foundation',
    price: 990,
    description: 'The core E-2 filing package — every document your consulate requires.',
    features: [
      'Core filing documents — cover letter, business plan, qualifications, declarations',
      'Financial evidence package — source of funds, fund flow, net worth',
      'Business substantiality & entity exhibits',
      'Gap analysis across 9 FAM factors',
      'Consulate-formatted, ready to file',
    ],
  },
  investor_ready: {
    id: 'investor_ready',
    name: 'Investor Ready',
    price: 390,
    description: 'Adds market intelligence and franchise due diligence on top of Foundation.',
    features: [
      'Everything in Foundation',
      'Market & territory analysis (3 reports included)',
      'FDD Intelligence — red-flag scoring & ODE model (3 analyses included)',
    ],
  },
  interview_prep: {
    id: 'interview_prep',
    name: 'Interview Ready',
    price: 290,
    description: 'Consulate interview simulator and coaching — purchasable on its own or with any package.',
    features: [
      '5 adaptive interview simulator sessions',
      'Consulate officer-style questioning',
      'Coaching notes after every session',
    ],
  },
  visa_ready: {
    id: 'visa_ready',
    name: 'Visa Ready',
    price: 1490,
    description: 'Every document, every analysis, full interview prep — the complete path to your consulate interview.',
    features: [
      'Everything in Foundation',
      'Market & territory analysis (6 reports included)',
      'FDD Intelligence (6 analyses included)',
      '5 interview simulator sessions',
      'Save $180 vs. buying separately',
    ],
  },
};

export function mapApplicationType(q002Answer: string | undefined): 'solo' | 'partnership' | 'spousal_partnership' {
  if (!q002Answer) return 'solo';
  if (q002Answer.includes('co-invest')) return 'spousal_partnership';
  if (q002Answer.includes('business partner')) return 'partnership';
  return 'solo';
}

export function mapFamilyStatus(q003Answer: string | undefined): string {
  if (!q003Answer) return 'none';
  if (q003Answer.toLowerCase().includes('just me')) return 'just_me';
  if (
    q003Answer.toLowerCase().includes('spouse and children') ||
    q003Answer.toLowerCase().includes('spouse, and our children')
  ) return 'spouse_and_children';
  if (q003Answer.toLowerCase().includes('children only')) return 'children_only';
  if (q003Answer.toLowerCase().includes('spouse')) return 'spouse_only';
  return 'just_me';
}

/**
 * Quiz answers signal application_type/family_status (document scope), not
 * package tier — there's no quiz question that distinguishes wanting
 * Foundation vs. Investor Ready vs. Visa Ready. So any completed quiz
 * suggests Visa Ready, the all-inclusive successor to the old flat
 * 'complete' tier this function used to always return.
 */
export function getPricingTier(_quizData: QuizData | null): MainTierId | null {
  if (!_quizData) return null;
  return 'visa_ready';
}

export function getTierData(tierId: MainTierId): PricingTier {
  return PRICING_TIERS[tierId];
}
