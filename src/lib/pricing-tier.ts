export type MainTierId = 'complete';
export type AddOnTierId = 'interview_prep' | 'fdd_intelligence' | 'fdd_intelligence_loyalty';
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
  complete: {
    id: 'complete',
    name: 'Complete — Build & Document',
    price: 1495,
    description: 'The full E-2 preparation platform. Every document, formatted for your consulate.',
    features: [
      '13–16 consulate-ready documents',
      'Gap analysis across 9 FAM factors',
      'Market & territory analysis',
      'Interview simulator (adaptive difficulty)',
      'FDD intelligence teaser',
      'Revision credits included',
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

export function getPricingTier(_quizData: QuizData | null): MainTierId | null {
  if (!_quizData) return null;
  return 'complete';
}

export function getTierData(tierId: MainTierId): PricingTier {
  return PRICING_TIERS[tierId];
}
