import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { captureApiError } from '@/lib/capture-error';
import { validatePromoCode, reservePromoRedemption, getStripeCouponId } from '@/lib/promo-codes';

// This route is the first-purchase entry point from /results — Foundation only.
// Partnership pricing is not yet confirmed (see foundation_partnership in
// entitlements.ts), so it is deliberately not offered here.
const VALID_TIERS = ['foundation'] as const;
type Tier = typeof VALID_TIERS[number];

const PRICE_ENV: Record<Tier, string> = {
  foundation: process.env.STRIPE_PRICE_FOUNDATION || '',
};

// Tiers that must create/reference an applications record
const NEEDS_APPLICATION: Set<Tier> = new Set(['foundation']);

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(request: NextRequest) {
  // Auth
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment processing is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  let tierId: Tier;
  let rawPromoCode: string | undefined;
  try {
    const body = await request.json() as { tierId?: string; promoCode?: string };
    if (!body.tierId || !VALID_TIERS.includes(body.tierId as Tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    tierId = body.tierId as Tier;
    rawPromoCode = body.promoCode;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const priceId = PRICE_ENV[tierId];
  if (!priceId) {
    return NextResponse.json(
      { error: 'This pricing tier is not yet configured. Please contact support@e2go.app.' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let applicationId: string | null = null;

  // For complete packages, find or create an application record
  if (NEEDS_APPLICATION.has(tierId)) {
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, payment_status')
      .eq('user_id', user.id)
      .not('source', 'eq', 'simulator_standalone')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingApp?.payment_status === 'paid') {
      // Already paid — skip checkout and send them home
      return NextResponse.json({ alreadyPaid: true });
    }

    if (existingApp) {
      applicationId = existingApp.id;
    } else {
      // payment_status defaults to 'unpaid' per DB constraint — do not set 'pending'
      const { data: newApp, error: insertError } = await supabase
        .from('applications')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (insertError || !newApp) {
        captureApiError(insertError ?? new Error('applications insert returned no record'), { route: 'checkout/initiate', stage: 'create-application', userId: user.id, tierId });
        return NextResponse.json({ error: 'Failed to initialize application' }, { status: 500 });
      }

      applicationId = newApp.id;
    }
  }

  // Stripe rejects empty string for customer_email — use auth email or omit
  const customerEmail = user.email || undefined;

  // Reserve the promo code before creating the Stripe session — see
  // src/lib/promo-codes.ts for why reservation, not this pre-check, is the
  // actual one-time-use guarantee.
  let promoRedemptionId: string | null = null;
  let couponId: string | null = null;
  if (rawPromoCode) {
    const validation = await validatePromoCode(rawPromoCode, user.id, customerEmail ?? '', tierId, supabase);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    couponId = getStripeCouponId(validation.promoCode.discount_percent);
    if (!couponId) {
      captureApiError(new Error('Missing Stripe coupon env var'), { route: 'checkout/initiate', discountPercent: validation.promoCode.discount_percent });
      return NextResponse.json({ error: 'Promo codes are not configured. Please contact support.' }, { status: 503 });
    }

    const reservation = await reservePromoRedemption(
      validation.promoCode,
      user.id,
      customerEmail ?? '',
      applicationId,
      `pending:${randomUUID()}`,
      supabase
    );
    if (!reservation.ok) {
      return NextResponse.json({ error: reservation.error }, { status: 400 });
    }
    promoRedemptionId = reservation.redemptionId;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${appUrl}/onboarding?payment=success`,
      cancel_url: `${appUrl}/results`,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      metadata: {
        applicationId: applicationId ?? '',
        userId: user.id,
        tierId,
        promoRedemptionId: promoRedemptionId ?? '',
      },
    });
  } catch (err) {
    if (promoRedemptionId) {
      const { error: releaseError } = await supabase.from('promo_redemptions').delete().eq('id', promoRedemptionId);
      if (releaseError) {
        captureApiError(releaseError, { route: 'checkout/initiate', stage: 'promo-release-after-stripe-failure', promoRedemptionId });
      }
    }
    captureApiError(err, { route: 'checkout/initiate', stage: 'stripe-session', userId: user.id, tierId });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  if (promoRedemptionId) {
    const { error: sessionIdPatchError } = await supabase
      .from('promo_redemptions')
      .update({ stripe_session_id: session.id })
      .eq('id', promoRedemptionId);
    if (sessionIdPatchError) {
      captureApiError(sessionIdPatchError, { route: 'checkout/initiate', stage: 'promo-session-id-patch', promoRedemptionId, sessionId: session.id });
    }
  }

  // Log pending payment record
  await supabase.from('payments').insert({
    application_id: applicationId,
    user_id: user.id,
    stripe_session_id: session.id,
    stripe_price_id: priceId,
    amount_paid: 0,
    currency: 'usd',
    status: 'pending',
    payment_type: tierId,
  });

  return NextResponse.json({ url: session.url });
}
