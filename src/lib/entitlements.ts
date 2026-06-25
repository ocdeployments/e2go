import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserEntitlements {
  hasComplete: boolean;
  hasInterviewPrep: boolean;
  hasFddIntelligence: boolean;
}

const ENTITLEMENT_PAYMENT_TYPES = [
  'complete',
  'interview_prep',
  'fdd_intelligence',
  'fdd_intelligence_loyalty',
] as const;

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
    return { hasComplete: false, hasInterviewPrep: false, hasFddIntelligence: false };
  }

  const types = new Set(data.map((r: { payment_type: string }) => r.payment_type));

  return {
    hasComplete:        types.has('complete'),
    hasInterviewPrep:   types.has('interview_prep'),
    hasFddIntelligence: types.has('fdd_intelligence') || types.has('fdd_intelligence_loyalty'),
  };
}

export async function hasLoyaltyEligibility(
  userId: string,
  applicationId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { hasComplete } = await getUserEntitlements(userId, supabase);
  if (!hasComplete) return false;

  // Loyalty pricing is only valid before any Phase B documents are generated
  const { count } = await supabase
    .from('generated_documents')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', applicationId)
    .eq('status', 'complete');

  return (count ?? 0) === 0;
}
