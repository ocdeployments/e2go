export type TierId =
  | 'solo_none'
  | 'solo_spouse'
  | 'solo_family_small'
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
  application_type?: string;
  partner_type?: string;
  dependents?: string;
  family_status?: string;
  [key: string]: unknown;
}

export const PRICING_TIERS: Record<TierId, PricingTier> = {
  solo_none: {
    id: 'solo_none',
    name: 'Solo Individual',
    price: 550,
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
    price: 697,
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
    name: 'Solo + Family',
    price: 750,
    description: 'Document preparation for you, your spouse, and your children.',
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
    name: 'Partnership',
    price: 997,
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
    price: 1297,
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
    price: 1397,
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
 * Maps raw Q0-02 answer text to application type.
 * Q0-02 = "Who is this application for?"
 */
export function mapApplicationType(q002Answer: string | undefined): 'solo' | 'partnership' | 'spousal_partnership' {
  if (!q002Answer) return 'solo';
  if (q002Answer.includes('co-invest')) return 'spousal_partnership';
  if (q002Answer.includes('business partner')) return 'partnership';
  return 'solo';
}

/**
 * Maps raw Q0-03 answer text to internal family status key.
 * Q0-03 = "Who is moving with you?"
 */
export function mapFamilyStatus(q003Answer: string | undefined): string {
  if (!q003Answer) return 'none';
  if (q003Answer.toLowerCase().includes('just me')) return 'just_me';
  if (q003Answer.toLowerCase().includes('spouse and children') || q003Answer.toLowerCase().includes('spouse, and our children')) return 'spouse_and_children';
  if (q003Answer.toLowerCase().includes('children only') || q003Answer.toLowerCase().includes('children only')) return 'children_only';
  if (q003Answer.toLowerCase().includes('spouse')) return 'spouse_only';
  return 'just_me';
}

/**
 * Determines the recommended pricing tier based on quiz session data.
 */
export function getPricingTier(quizData: QuizData | null): TierId | null {
  if (!quizData) return null;

  const appType = quizData.application_type || 'solo';
  const dep = quizData.dependents || quizData.family_status || 'just_me';

  const isPartnership = appType === 'partnership' || appType === 'spousal_partnership';

  const hasSpouse = dep === 'spouse_only' || dep === 'spouse_and_children';
  const hasChildren = dep === 'spouse_and_children' || dep === 'children_only';

  if (isPartnership) {
    if (hasSpouse && hasChildren) return 'partnership_families';
    if (hasSpouse) return 'partnership_couples';
    return 'partnership_none';
  }

  // Solo
  if (hasSpouse && hasChildren) return 'solo_family_small';
  if (hasSpouse) return 'solo_spouse';
  if (hasChildren) return 'solo_family_small';
  return 'solo_none';
}

export function getTierData(tierId: TierId): PricingTier {
  return PRICING_TIERS[tierId];
}
