export type TierId =
  | 'solo_none'
  | 'solo_spouse'
  | 'solo_family_small'
  | 'solo_family_large'
  | 'partnership_none'
  | 'partnership_couples'
  | 'partnership_families';

export interface PricingTier {
  id: TierId;
  name: string;
  price: number;
  description: string;
  features: string[];
}

export interface QuizData {
  application_type?: 'solo' | 'partnership';
  family_status?: string;
  [key: string]: unknown;
}

export const PRICING_TIERS: Record<TierId, PricingTier> = {
  solo_none: {
    id: 'solo_none',
    name: 'Solo Individual',
    price: 297,
    description: 'Complete E-2 document preparation for a single applicant.',
    features: [
      'Full document package generation',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  solo_spouse: {
    id: 'solo_spouse',
    name: 'Solo + Spouse',
    price: 347,
    description: 'Document preparation for you and your spouse as a dependent.',
    features: [
      'Full document package generation',
      'Spouse-dependent documentation',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  solo_family_small: {
    id: 'solo_family_small',
    name: 'Solo Family (≤2 children)',
    price: 397,
    description: 'Document preparation for you, your spouse, and up to two children.',
    features: [
      'Full document package generation',
      'Spouse and dependent documentation',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  solo_family_large: {
    id: 'solo_family_large',
    name: 'Solo Family (3-5 children)',
    price: 447,
    description: 'Document preparation for you, your spouse, and 3-5 children.',
    features: [
      'Full document package generation',
      'Spouse and dependent documentation',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  partnership_none: {
    id: 'partnership_none',
    name: 'Partnership (No Dependents)',
    price: 497,
    description: 'Document preparation for two equal 50/50 business owners.',
    features: [
      'Dual applicant document packages',
      'Partnership agreement alignment',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  partnership_couples: {
    id: 'partnership_couples',
    name: 'Partnership + Spouses',
    price: 547,
    description: 'Document preparation for two owners and their spouses.',
    features: [
      'Dual applicant document packages',
      'Spouse-dependent documentation for both',
      'Partnership agreement alignment',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  },
  partnership_families: {
    id: 'partnership_families',
    name: 'Partnership + Families',
    price: 647,
    description: 'Document preparation for two owners and their families.',
    features: [
      'Dual applicant document packages',
      'Spouse and dependent documentation for both',
      'Partnership agreement alignment',
      'Consulate-formatted templates',
      'Quality gate pipeline review',
      'Pre-download acknowledgment'
    ]
  }
};

/**
 * Determines the recommended pricing tier based on quiz session data.
 *
 * Note on child count: The locked v2.1 quiz data does not explicitly
 * capture the exact number of children (only whether children are coming).
 * When children are present, this function defaults to the small family tier ($397).
 * Users can manually override to the large family tier ($447) on the pricing UI.
 */
export function getPricingTier(quizData: QuizData | null): TierId | null {
  if (!quizData) return null;

  const appType = quizData.application_type;
  const family = quizData.family_status || 'none';

  if (appType === 'partnership') {
    if (family === 'none' || family === 'just_me') {
      return 'partnership_none';
    }
    if (family === 'spouse_only') {
      return 'partnership_couples';
    }
    if (family === 'spouse_and_children' || family === 'children_only') {
      return 'partnership_families';
    }
    return 'partnership_none';
  }

  if (appType === 'solo' || !appType) {
    if (family === 'none' || family === 'just_me' || family === 'not_decided') {
      return 'solo_none';
    }
    if (family === 'spouse_only') {
      return 'solo_spouse';
    }
    if (family === 'spouse_and_children' || family === 'children_only') {
      return 'solo_family_small';
    }
    return 'solo_none';
  }

  return null;
}

export function getTierData(tierId: TierId): PricingTier {
  return PRICING_TIERS[tierId];
}
