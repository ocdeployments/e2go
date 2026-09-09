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
    description: 'Every document your E-2 filing needs, drafted from your answers.',
    features: [
      'Cover letter, business plan, statement of qualifications, and DS-160 reference sheet',
      'Financial evidence set — source of funds, fund-flow chronology, net worth statement, investment proof, assets portfolio',
      'Substantiality memo, non-marginality rebuttal, and nonimmigrant-intent statement',
      'Entity and premises exhibits — org chart, corporate documents guide, lease summary, property portfolio',
      'Signed declarations for you and your spouse',
      'Gap analysis scoring your case against the 15 most common denial reasons',
      'Personalized document checklist and interview-day preparation checklist',
      'Assembled and indexed in consulate order, ready to file',
    ],
  },
  investor_ready: {
    id: 'investor_ready',
    name: 'Investor Ready',
    price: 390,
    description: 'Add-on to Foundation — market data and franchise due diligence.',
    features: [
      'Market and territory analysis — 3 reports, each scoring competition and demographic fit for a specific ZIP from U.S. Census data',
      'Franchise disclosure (FDD) red-flag analysis — 3 reports, scored against the four E-2 tests: eligibility, substantiality, non-marginality, develop-and-direct',
      'Territory and encroachment review pulled from your FDD',
      'Need more later? Extra reports are $90 each',
    ],
  },
  interview_prep: {
    id: 'interview_prep',
    name: 'Interview Ready',
    price: 290,
    description: 'Consulate interview prep — buy on its own or with any package.',
    features: [
      '5 mock interviews with an AI consular officer, questions built from your filed answers',
      'Real consulate pressure — follow-ups, specificity checks, and consistency probes against your documents',
      'Per-question feedback and a readiness rating after every session',
      'Franchise applicants also get questions drawn from their own FDD',
    ],
  },
  visa_ready: {
    id: 'visa_ready',
    name: 'Visa Ready',
    price: 1490,
    description: 'The full filing package, every analysis report, and interview prep.',
    features: [
      'Cover letter, business plan, statement of qualifications, and DS-160 reference sheet',
      'Financial evidence set — source of funds, fund-flow chronology, net worth statement, investment proof, assets portfolio',
      'Substantiality memo, non-marginality rebuttal, nonimmigrant-intent statement, entity and premises exhibits, signed declarations',
      'Gap analysis scoring your case against the 15 most common denial reasons',
      'Market and territory analysis — 6 reports',
      'Franchise disclosure (FDD) red-flag analysis — 6 reports',
      '5 mock consular interviews with written coaching notes after each',
      'Personalized document and interview-day checklists, everything indexed in consulate order',
      '$180 less than buying Foundation, Investor Ready, and Interview Ready separately',
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
