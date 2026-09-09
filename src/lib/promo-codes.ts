import type { SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';

export interface PromoCodeRow {
  id: string;
  code: string;
  code_type: 'shared' | 'personal';
  assigned_email: string | null;
  discount_percent: 25 | 50 | 75 | 100;
  applicable_tiers: string[] | null;
  max_redemptions: number | null;
  active: boolean;
  expires_at: string | null;
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

const COUPON_ENV: Record<number, string | undefined> = {
  25: process.env.STRIPE_COUPON_25,
  50: process.env.STRIPE_COUPON_50,
  75: process.env.STRIPE_COUPON_75,
  100: process.env.STRIPE_COUPON_100,
};

export function getStripeCouponId(discountPercent: number): string | null {
  return COUPON_ENV[discountPercent] ?? null;
}

export type PromoValidationResult =
  | { ok: true; promoCode: PromoCodeRow }
  | { ok: false; error: string };

/**
 * Read-only eligibility check for a code against this user/tier. Does not
 * reserve anything — a race between two concurrent redemptions of the same
 * code is only closed at INSERT time in reservePromoRedemption, via the
 * partial unique index and the max_redemptions trigger.
 */
export async function validatePromoCode(
  rawCode: string,
  userId: string,
  email: string,
  tierId: string,
  supabase: SupabaseClient
): Promise<PromoValidationResult> {
  const code = normalizePromoCode(rawCode);

  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .select('id, code, code_type, assigned_email, discount_percent, applicable_tiers, max_redemptions, active, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    captureApiError(error, { route: 'promo-codes', stage: 'validate-lookup', code });
    return { ok: false, error: 'Could not validate this promo code. Please try again.' };
  }

  if (!promoCode || !promoCode.active) {
    return { ok: false, error: 'This promo code is not valid.' };
  }

  if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
    return { ok: false, error: 'This promo code has expired.' };
  }

  if (promoCode.applicable_tiers && !promoCode.applicable_tiers.includes(tierId)) {
    return { ok: false, error: 'This promo code does not apply to this package.' };
  }

  if (promoCode.code_type === 'personal') {
    if (!promoCode.assigned_email || promoCode.assigned_email.toLowerCase() !== email.toLowerCase()) {
      return { ok: false, error: 'This promo code is not valid for your account.' };
    }
  }

  const { count: liveRedemptions, error: countError } = await supabase
    .from('promo_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code_id', promoCode.id)
    .eq('user_id', userId)
    .in('status', ['pending', 'completed']);

  if (countError) {
    captureApiError(countError, { route: 'promo-codes', stage: 'validate-redemption-check', code, userId });
    return { ok: false, error: 'Could not validate this promo code. Please try again.' };
  }

  if ((liveRedemptions ?? 0) > 0) {
    return { ok: false, error: 'This promo code has already been used on your account.' };
  }

  if (promoCode.max_redemptions !== null) {
    const { count: totalRedemptions, error: totalError } = await supabase
      .from('promo_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promo_code_id', promoCode.id)
      .in('status', ['pending', 'completed']);

    if (totalError) {
      captureApiError(totalError, { route: 'promo-codes', stage: 'validate-max-check', code });
      return { ok: false, error: 'Could not validate this promo code. Please try again.' };
    }

    if ((totalRedemptions ?? 0) >= promoCode.max_redemptions) {
      return { ok: false, error: 'This promo code has reached its redemption limit.' };
    }
  }

  return { ok: true, promoCode: promoCode as PromoCodeRow };
}

export type PromoReservationResult =
  | { ok: true; redemptionId: string }
  | { ok: false; error: string };

/**
 * INSERT-first reservation, same pattern as processed_webhook_events: the
 * partial unique index and the max_redemptions trigger are the actual
 * enforcement, not the pre-checks in validatePromoCode (those exist only to
 * return a friendly error before creating a Stripe session).
 */
export async function reservePromoRedemption(
  promoCode: PromoCodeRow,
  userId: string,
  email: string,
  applicationId: string | null,
  stripeSessionId: string,
  supabase: SupabaseClient
): Promise<PromoReservationResult> {
  const { data, error } = await supabase
    .from('promo_redemptions')
    .insert({
      promo_code_id: promoCode.id,
      user_id: userId,
      email: email.toLowerCase(),
      application_id: applicationId,
      stripe_session_id: stripeSessionId,
      discount_percent_applied: promoCode.discount_percent,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'This promo code has already been used on your account.' };
    }
    if (error.message?.includes('promo_code_max_redemptions_exceeded')) {
      return { ok: false, error: 'This promo code has reached its redemption limit.' };
    }
    captureApiError(error, { route: 'promo-codes', stage: 'reserve', promoCodeId: promoCode.id, userId, stripeSessionId });
    return { ok: false, error: 'Could not apply this promo code. Please try again.' };
  }

  return { ok: true, redemptionId: data.id };
}
