export interface Payment {
  id: string
  application_id: string | null
  user_id: string
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_price_id: string
  amount_paid: number
  currency: string
  status: 'pending' | 'completed' | 'refunded' | 'failed' | 'expired'
  payment_type: string
  refund_eligible: boolean
  refunded_at: string | null
  created_at: string
  completed_at: string | null
}

export interface PaymentCheckoutRequest {
  tierId: string
  applicationId?: string
  fddId?: string
  userId: string
}

export interface PaymentCheckoutResponse {
  url?: string
  sessionId?: string
  error?: string
  status?: number
}

export interface PaymentVerificationResponse {
  verified: boolean
  payment?: Payment
  error?: string
}

export interface FoundingMemberCount {
  count: number
  remaining: number
  isActive: boolean
}

export type MainTierId = 'complete' | 'complete_partnership';
export type AddOnTierId = 'interview_prep' | 'interview_prep_partnership' | 'fdd_intelligence' | 'fdd_intelligence_loyalty';
export type UtilityTierId = 'simulator_3pack' | 'renewal';

export interface StripePrice {
  name: string;
  amount: number; // cents
  description: string;
}

export const STRIPE_PRICE_IDS: Record<string, string> = {
  complete:                 process.env.STRIPE_PRICE_COMPLETE || '',
  complete_partnership:          process.env.STRIPE_PRICE_COMPLETE_PARTNERSHIP || '',
  interview_prep:                process.env.STRIPE_PRICE_INTERVIEW_PREP || '',
  interview_prep_partnership:    process.env.STRIPE_PRICE_INTERVIEW_PREP_PARTNERSHIP || '',
  fdd_intelligence:         process.env.STRIPE_PRICE_FDD_INTELLIGENCE || '',
  fdd_intelligence_loyalty: process.env.STRIPE_PRICE_FDD_INTELLIGENCE_LOYALTY || '',
  simulator_3pack:          process.env.STRIPE_PRICE_SIMULATOR_3PACK || '',
  renewal:                  process.env.STRIPE_PRICE_RENEWAL || '',
};

export const STRIPE_PRICES: Record<string, StripePrice> = {
  complete: {
    name: 'Complete — Build & Document',
    amount: 149500,
    description: 'Full E-2 application platform: 13–16 consulate-ready documents, gap analysis, market analysis, interview simulator',
  },
  complete_partnership: {
    name: 'Complete — Partnership',
    amount: 249500,
    description: 'Full E-2 application platform for partnership (two-investor) applications',
  },
  interview_prep_partnership: {
    name: 'Interview Prep — Partnership',
    amount: 49500,
    description: 'Interview simulation for both partners under one purchase ($495 vs $347 × 2)',
  },
  interview_prep: {
    name: 'Interview Prep',
    amount: 34700,
    description: 'Unlimited consulate interview simulations with adaptive difficulty and coaching',
  },
  fdd_intelligence: {
    name: 'FDD Intelligence',
    amount: 57500,
    description: 'Franchise Disclosure Document analysis, 5-dimension scoring, due diligence questions, and market territory analysis',
  },
  fdd_intelligence_loyalty: {
    name: 'FDD Intelligence (Loyalty Pricing)',
    amount: 37500,
    description: 'FDD Intelligence at loyalty price — available to Complete owners before Phase B document generation',
  },
  simulator_3pack: {
    name: 'Simulator Session Pack',
    amount: 4900,
    description: '3 additional interview simulation sessions',
  },
  renewal: {
    name: 'Application Renewal',
    amount: 9900,
    description: 'Renew an expired or resubmitted application',
  },
};

export const FOUNDING_MEMBER_LIMIT = 500;
