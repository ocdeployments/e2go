import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tier payment_type values.
 *
 * 'complete'/'complete_partnership' are the legacy all-in-one tier that
 * predates this package split — those buyers already paid for Market
 * Analysis + FDD Intelligence + Interview Prep bundled in, so they stay
 * grandfathered into full access. Going forward, 'foundation' is the
 * stripped-down A-E tier and Investor Ready / Visa Ready are separate
 * purchases layered on top of it.
 */
const FOUNDATION_PAYMENT_TYPES = ['foundation', 'foundation_partnership'] as const;
const LEGACY_COMPLETE_PAYMENT_TYPES = ['complete', 'complete_partnership'] as const;
const INVESTOR_READY_PAYMENT_TYPES = ['investor_ready'] as const;
// loyalty_upgrade is the Foundation -> Visa Ready upgrade path — it grants
// exactly what buying Visa Ready outright grants.
const VISA_READY_PAYMENT_TYPES = ['visa_ready', 'loyalty_upgrade'] as const;
const INTERVIEW_READY_PAYMENT_TYPES = ['interview_prep', 'interview_prep_partnership'] as const;
const FDD_STANDALONE_PAYMENT_TYPES = ['fdd_intelligence', 'fdd_intelligence_loyalty'] as const;
const FDD_ADDON_PAYMENT_TYPES = ['fdd_analysis_addon', 'fdd_market_bundle_addon'] as const;
const MARKET_ADDON_PAYMENT_TYPES = ['market_analysis_addon', 'fdd_market_bundle_addon'] as const;

const ENTITLEMENT_PAYMENT_TYPES = [
  ...FOUNDATION_PAYMENT_TYPES,
  ...LEGACY_COMPLETE_PAYMENT_TYPES,
  ...INVESTOR_READY_PAYMENT_TYPES,
  ...VISA_READY_PAYMENT_TYPES,
  ...INTERVIEW_READY_PAYMENT_TYPES,
  ...FDD_STANDALONE_PAYMENT_TYPES,
  ...FDD_ADDON_PAYMENT_TYPES,
  ...MARKET_ADDON_PAYMENT_TYPES,
] as const;

/** Payment types that bump the included interview simulator session count. */
export const INTERVIEW_SESSION_TIER_PAYMENT_TYPES = [
  ...LEGACY_COMPLETE_PAYMENT_TYPES,
  ...INTERVIEW_READY_PAYMENT_TYPES,
  ...VISA_READY_PAYMENT_TYPES,
] as const;

export interface UserEntitlements {
  /** A-E filing documents. */
  hasFoundation: boolean;
  /** Foundation + Market Analysis + FDD Intelligence, sold as an add-on. */
  hasInvestorReady: boolean;
  /** All-inclusive bundle: Foundation + Investor Ready + Interview Ready. */
  hasVisaReady: boolean;
  hasInterviewPrep: boolean;
  hasFddIntelligence: boolean;
  hasMarketAnalysis: boolean;
}

export async function getUserEntitlements(
  userId: string,
  supabase: SupabaseClient
): Promise<UserEntitlements> {
  const { data, error } = await supabase
    .from('payments')
    .select('payment_type')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('payment_type', ENTITLEMENT_PAYMENT_TYPES);

  if (error || !data) {
    return {
      hasFoundation: false,
      hasInvestorReady: false,
      hasVisaReady: false,
      hasInterviewPrep: false,
      hasFddIntelligence: false,
      hasMarketAnalysis: false,
    };
  }

  const types = new Set(data.map((r: { payment_type: string }) => r.payment_type));
  return deriveEntitlements(types);
}

/** Pure derivation, split out so quota helpers can reuse a types set without re-querying. */
export function deriveEntitlements(types: ReadonlySet<string>): UserEntitlements {
  const hasLegacyComplete = LEGACY_COMPLETE_PAYMENT_TYPES.some((t) => types.has(t));
  const hasVisaReady = VISA_READY_PAYMENT_TYPES.some((t) => types.has(t));
  const hasInvestorReady = hasLegacyComplete || hasVisaReady || INVESTOR_READY_PAYMENT_TYPES.some((t) => types.has(t));
  const hasFoundation = hasLegacyComplete || hasInvestorReady || FOUNDATION_PAYMENT_TYPES.some((t) => types.has(t));
  const hasInterviewPrep = hasVisaReady || INTERVIEW_READY_PAYMENT_TYPES.some((t) => types.has(t));

  return {
    hasFoundation,
    hasInvestorReady,
    hasVisaReady,
    hasInterviewPrep,
    hasFddIntelligence: hasInvestorReady || FDD_STANDALONE_PAYMENT_TYPES.some((t) => types.has(t)),
    hasMarketAnalysis: hasInvestorReady,
  };
}

/**
 * Included interview simulator sessions before any add-on pack. Legacy
 * 'complete' buyers keep the 3-session bonus they already paid for; the
 * Interview Ready tier (standalone or via Visa Ready) gets 5.
 */
export function resolveIncludedSimulatorSessions(types: ReadonlySet<string>): number {
  if (INTERVIEW_READY_PAYMENT_TYPES.some((t) => types.has(t)) || VISA_READY_PAYMENT_TYPES.some((t) => types.has(t))) {
    return 5;
  }
  if (LEGACY_COMPLETE_PAYMENT_TYPES.some((t) => types.has(t))) {
    return 3;
  }
  return 2;
}

/**
 * Included FDD analyses / market analyses before any add-on pack: 3 for
 * Investor Ready, 6 for Visa Ready, 0 otherwise. NULL in
 * applications.fdd_analyses_purchased / market_analyses_purchased means
 * "use this default" — an add-on purchase resolves the default first, then
 * stores the incremented total, mirroring simulator_sessions_purchased.
 */
export function resolveIncludedAnalysisCount(entitlements: Pick<UserEntitlements, 'hasVisaReady' | 'hasInvestorReady'>): number {
  if (entitlements.hasVisaReady) return 6;
  if (entitlements.hasInvestorReady) return 3;
  return 0;
}

export function resolveFddAnalysisLimit(
  entitlements: Pick<UserEntitlements, 'hasVisaReady' | 'hasInvestorReady'>,
  fddAnalysesPurchased: number | null
): number {
  return fddAnalysesPurchased ?? resolveIncludedAnalysisCount(entitlements);
}

export function resolveMarketAnalysisLimit(
  entitlements: Pick<UserEntitlements, 'hasVisaReady' | 'hasInvestorReady'>,
  marketAnalysesPurchased: number | null
): number {
  return marketAnalysesPurchased ?? resolveIncludedAnalysisCount(entitlements);
}

export async function hasLoyaltyEligibility(
  userId: string,
  applicationId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { hasFoundation, hasVisaReady } = await getUserEntitlements(userId, supabase);
  if (!hasFoundation || hasVisaReady) return false;

  // applicationId must actually belong to this user — otherwise a caller could
  // point this check at an unrelated, empty applicationId to fraudulently
  // qualify for loyalty pricing while their real case already has documents.
  const { data: ownedApp } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!ownedApp) return false;

  // Loyalty pricing (Foundation -> Visa Ready) is only valid before any Phase B
  // documents are generated — checked across every application this user owns,
  // not just the one passed in, so switching to a different (empty) application
  // of theirs can't reset eligibility.
  const { count } = await supabase
    .from('generated_documents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'complete');

  return (count ?? 0) === 0;
}
