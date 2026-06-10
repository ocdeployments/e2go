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
 * Maps raw Q0-03 answer text to internal family status key.
 * Q0-03 = "Who is moving with you?"
 */
export function mapFamilyStatus(q003Answer: string | undefined): string {
  if (!q003Answer) return 'none';
  if (q003Answer.includes('Just me')) return 'none';
  if (q003Answer.includes('spouse and children')) return 'spouse_and_children';
  if (q003Answer.includes('children only')) return 'children_only';
  if (q003Answer.includes('spouse or partner')) return 'spouse_only';
  if (q003Answer.includes('Not decided')) return 'not_decided';
  return 'none';
}

/**
 * Maps raw Q0-02 / Q0-04 answer text to application type.
 * Q0-02 = "Who is this application for?"
 * Q0-04 = "Will you have a business partner?"
 */
export function mapApplicationType(quizAnswers: Record<string, string> | undefined): 'solo' | 'partnership' {
  if (!quizAnswers) return 'solo';
  const q002 = quizAnswers['Q0-02'];
  const q004 = quizAnswers['Q0-04'];
  if (q002 && (q002.includes('partners') || q002.includes('group'))) return 'partnership';
  if (q004 && (q004.includes('partner') || q004.includes('spouse'))) return 'partnership';
  return 'solo';
}

/**
 * Determines the recommended pricing tier based on quiz session data.
 *
 * Accepts either:
 * 1. A raw quiz result object (with `answers` field) — extracts application_type and family_status automatically
 * 2. A QuizData object with pre-mapped application_type and family_status
 */
export function getPricingTier(quizData: QuizData | null): TierId | null {
  if (!quizData) return null;

  // If raw answers are present, map them
  let appType = quizData.application_type;
  let family: string = (quizData.family_status as string) || 'none';

  const answers = quizData.answers as Record<string, string> | undefined;
  if (answers) {
    // Q0-02 + Q0-04 answer determines application type
    if (!appType) {
      appType = mapApplicationType(answers);
    }

    // Q0-03 answer determines family status
    if (family === 'none' || !family) {
      const q003 = answers['Q0-03'];
      if (q003) {
        family = mapFamilyStatus(q003);
      }
    }
  }

  if (!appType) appType = 'solo';

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

  // solo
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

export function getTierData(tierId: TierId): PricingTier {
  return PRICING_TIERS[tierId];
}
