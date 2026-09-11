import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Partnership checkout hold.
 *
 * Two-investor cases need a different document package: six additional _p2
 * documents, a second answer set, and a joint cover letter. The generation
 * pipeline gates all of that on payment_type = 'complete_partnership', which
 * is a legacy value no live tier can produce — foundation_partnership and
 * interview_prep_partnership are excluded from every checkout route because
 * their pricing is not confirmed and no Stripe Price object exists.
 *
 * The net effect without this guard: a partnership applicant pays the solo
 * price and receives the solo package. Until the partnership tier ships, they
 * are held out of checkout and routed to the team instead.
 *
 * 2026-09-11: product decision to launch solo-only and build partnership
 * afterward (docs/SPRINT_DR_DELIVERY_RELIABILITY.md DR-18), not just a
 * pricing gap — so this is now an intentional pause, not a stopgap. Interest
 * is captured via coming_soon_interest (see ComingSoonNotifyButton) so demand
 * isn't lost while it's paused.
 *
 * Remove this hold in the same change that adds the partnership Price IDs and
 * makes the pipeline recognise the new payment_type.
 */

export const PARTNERSHIP_APPLICATION_TYPES = ['partnership', 'spousal_partnership'] as const;

/** Tiers that produce a document package, and so must respect the hold. */
export const PACKAGE_TIER_IDS = [
  'foundation',
  'investor_ready',
  'interview_prep',
  'visa_ready',
  'loyalty_upgrade',
] as const;

export const PARTNERSHIP_HOLD_MESSAGE =
  "Partnership applications aren't open yet — we're launching solo applications first and will " +
  "build partnership support afterward. Use the \"Notify me\" option on your application to let us " +
  'know you\'re interested, or email support@e2go.app with questions.';

export function isPartnershipApplicationType(value: string | null | undefined): boolean {
  if (!value) return false;
  return (PARTNERSHIP_APPLICATION_TYPES as readonly string[]).includes(value);
}

export function isPackageTier(tierId: string): boolean {
  return (PACKAGE_TIER_IDS as readonly string[]).includes(tierId);
}

export interface PartnershipHoldResult {
  /** True only when a partnership case was positively identified. */
  onHold: boolean;
  /** The application_type that triggered the hold, for logging. */
  applicationType: string | null;
  /** Set when a lookup failed. The hold fails open — see below. */
  lookupError: string | null;
}

/**
 * Resolves whether this user's case is a partnership.
 *
 * Reads the quiz session first (the quiz is what classifies the case) and
 * falls back to the application record. Fails OPEN: if both lookups error we
 * return onHold: false rather than blocking a paying solo applicant on a
 * transient database problem. lookupError is surfaced so the caller can log it.
 */
export async function resolvePartnershipHold(
  supabase: SupabaseClient,
  userId: string
): Promise<PartnershipHoldResult> {
  const errors: string[] = [];

  const { data: quiz, error: quizError } = await supabase
    .from('quiz_sessions')
    .select('application_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (quizError) {
    errors.push(`quiz_sessions: ${quizError.message}`);
  } else if (isPartnershipApplicationType(quiz?.application_type)) {
    return { onHold: true, applicationType: quiz!.application_type as string, lookupError: null };
  }

  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select('application_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) {
    errors.push(`applications: ${applicationError.message}`);
  } else if (isPartnershipApplicationType(application?.application_type)) {
    return { onHold: true, applicationType: application!.application_type as string, lookupError: null };
  }

  return { onHold: false, applicationType: null, lookupError: errors.length ? errors.join('; ') : null };
}
