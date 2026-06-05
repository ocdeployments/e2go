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
  priceId: string
  applicationId: string
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

export const STRIPE_PRICE_IDS: Record<string, string> = {
  solo: '', // $297
  solo_spouse: '', // $347
  solo_family_2: '', // $397
  solo_family_5: '', // $447
  partnership: '', // $497
  partnership_couples: '', // $547
  partnership_families: '', // $647
} as const;

export const STRIPE_PRICES: Record<string, { name: string; amount: number }> = {
  solo: { name: 'Solo individual', amount: 29700 },
  solo_spouse: { name: 'Solo + spouse', amount: 34700 },
  solo_family_2: { name: 'Solo + family (up to 2 kids)', amount: 39700 },
  solo_family_5: { name: 'Solo + family (3-5 kids)', amount: 44700 },
  partnership: { name: 'Partnership no families', amount: 49700 },
  partnership_couples: { name: 'Partnership two couples', amount: 54700 },
  partnership_families: { name: 'Partnership two full families', amount: 64700 },
} as const;

export const FOUNDING_MEMBER_LIMIT = 500;