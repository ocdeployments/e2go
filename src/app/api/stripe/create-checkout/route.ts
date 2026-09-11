import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { captureApiError } from '@/lib/capture-error';
import { getUserEntitlements, hasLoyaltyEligibility } from '@/lib/entitlements';
import { validatePromoCode, reservePromoRedemption, getStripeCouponId } from '@/lib/promo-codes';
import { resolvePartnershipHold, isPackageTier, PARTNERSHIP_HOLD_MESSAGE } from '@/lib/partnership-hold';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// foundation_partnership / interview_prep_partnership are excluded — pricing
// not yet confirmed, so no Stripe Price object exists for them.
const VALID_TIER_IDS = [
  'foundation',
  'investor_ready',
  'interview_prep',
  'visa_ready',
  'loyalty_upgrade',
  'fdd_analysis_addon',
  'market_analysis_addon',
  'fdd_market_bundle_addon',
  'simulator_3pack',
  'renewal',
];

// Every tier is scoped to an application in this app's data model
const REQUIRES_APPLICATION_ID = new Set(VALID_TIER_IDS);

// investor_ready is a bolt-on — requires owning Foundation (or better) first
const REQUIRES_FOUNDATION = new Set(['investor_ready']);

// FDD/market add-ons only make sense once the included quota exists
const REQUIRES_INVESTOR_READY = new Set([
  'fdd_analysis_addon',
  'market_analysis_addon',
  'fdd_market_bundle_addon',
]);

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

const FALLBACK_PRICE_IDS: Record<string, string> = {
  foundation:              process.env.STRIPE_PRICE_FOUNDATION || '',
  investor_ready:          process.env.STRIPE_PRICE_INVESTOR_READY || '',
  interview_prep:          process.env.STRIPE_PRICE_INTERVIEW_PREP || '',
  visa_ready:              process.env.STRIPE_PRICE_VISA_READY || '',
  loyalty_upgrade:         process.env.STRIPE_PRICE_LOYALTY_UPGRADE || '',
  fdd_analysis_addon:      process.env.STRIPE_PRICE_FDD_ANALYSIS_ADDON || '',
  market_analysis_addon:   process.env.STRIPE_PRICE_MARKET_ANALYSIS_ADDON || '',
  fdd_market_bundle_addon: process.env.STRIPE_PRICE_FDD_MARKET_BUNDLE_ADDON || '',
  simulator_3pack:         process.env.STRIPE_PRICE_SIMULATOR_3PACK || '',
  renewal:                 process.env.STRIPE_PRICE_RENEWAL || '',
};

async function getStripePriceId(supabase: ReturnType<typeof getSupabase>, tierId: string): Promise<string | null> {
  const { data: tier, error } = await supabase
    .from('pricing')
    .select('stripe_price_id, active')
    .eq('tier_id', tierId)
    .eq('active', true)
    .single();

  if (!error && tier && tier.stripe_price_id) {
    return tier.stripe_price_id;
  }

  const fallback = FALLBACK_PRICE_IDS[tierId];
  if (fallback) {
    console.warn(`Using fallback price ID for ${tierId} from env`);
    return fallback;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment processing not configured', status: 503 },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tierId, applicationId, fddId, promoCode: rawPromoCode, successUrl: rawSuccessUrl, cancelUrl: rawCancelUrl } = body;

    if (!tierId) {
      return NextResponse.json({ error: 'Missing required field: tierId' }, { status: 400 });
    }

    if (!VALID_TIER_IDS.includes(tierId)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const supabase = getSupabase();

    // applicationId comes from the client and flows into Stripe metadata, which
    // the webhook and verify-payment routes later trust to unlock document
    // generation — so it must be proven to belong to this user right here,
    // before it's used for anything else in this route.
    let resolvedApplicationId: string | null = applicationId ?? null;

    if (resolvedApplicationId) {
      const { data: ownedApp, error: ownershipError } = await supabase
        .from('applications')
        .select('id')
        .eq('id', resolvedApplicationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (ownershipError || !ownedApp) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
    } else if (REQUIRES_APPLICATION_ID.has(tierId)) {
      // DR-19 (Gap G-09e): find-or-create server-side instead of trusting a
      // client-asserted application_type. A first-purchase client (e.g.
      // PricingClient) sends no applicationId at all, so this is also where
      // application_type gets set for a brand-new application — derived from
      // the quiz session the user actually completed (same pattern as
      // src/app/onboarding/page.tsx), never from anything the browser sends.
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingApp) {
        resolvedApplicationId = existingApp.id;
      } else {
        const { data: quizSession } = await supabase
          .from('quiz_sessions')
          .select('application_type')
          .eq('user_id', user.id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        const derivedType = quizSession?.application_type === 'partnership' ? 'partnership' : 'solo';

        const { data: newApp, error: insertError } = await supabase
          .from('applications')
          .insert({ user_id: user.id, application_type: derivedType, status: 'pending' })
          .select('id')
          .single();

        if (insertError || !newApp) {
          captureApiError(insertError ?? new Error('applications insert returned no record'), { route: 'stripe/create-checkout', stage: 'create-application', userId: user.id, tierId });
          return NextResponse.json({ error: 'Failed to initialize application' }, { status: 500 });
        }
        resolvedApplicationId = newApp.id;
      }
    }

    // Partnership cases are held out of checkout until the partnership tier
    // exists — see src/lib/partnership-hold.ts. This route excludes
    // foundation_partnership / interview_prep_partnership from VALID_TIER_IDS,
    // so without this a two-investor case would buy the solo package and
    // receive a package missing all six _p2 documents.
    if (isPackageTier(tierId)) {
      const hold = await resolvePartnershipHold(supabase, user.id);
      if (hold.lookupError) {
        captureApiError(new Error(`Partnership hold lookup failed: ${hold.lookupError}`), { route: 'stripe/create-checkout', stage: 'partnership-hold', userId: user.id, tierId });
      }
      if (hold.onHold) {
        return NextResponse.json(
          { error: PARTNERSHIP_HOLD_MESSAGE, code: 'partnership_hold', partnershipHold: true, applicationType: hold.applicationType },
          { status: 409 }
        );
      }
    }

    if (REQUIRES_FOUNDATION.has(tierId)) {
      const entitlements = await getUserEntitlements(user.id, supabase);
      if (!entitlements.hasFoundation) {
        return NextResponse.json(
          {
            error:
              'Investor Ready is an add-on to the Foundation package. Choose Foundation or Visa Ready first, then add Investor Ready from your dashboard.',
            code: 'requires_foundation',
          },
          { status: 403 }
        );
      }
    }

    if (REQUIRES_INVESTOR_READY.has(tierId)) {
      const entitlements = await getUserEntitlements(user.id, supabase);
      if (!entitlements.hasInvestorReady) {
        return NextResponse.json(
          {
            error:
              'This add-on needs Investor Ready or Visa Ready. Add one of those first, then come back for the extra reports.',
            code: 'requires_investor_ready',
          },
          { status: 403 }
        );
      }
    }

    // Loyalty upgrade (Foundation -> Visa Ready): only before Phase B documents exist
    if (tierId === 'loyalty_upgrade') {
      const eligible = resolvedApplicationId ? await hasLoyaltyEligibility(user.id, resolvedApplicationId, supabase) : false;
      if (!eligible) {
        return NextResponse.json(
          { error: 'Loyalty upgrade pricing is not available for this account' },
          { status: 403 }
        );
      }
    }

    const priceId = await getStripePriceId(supabase, tierId);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Pricing tier not found or not configured', status: 404 },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const isSameOrigin = (url: string) => {
      try {
        const parsed = new URL(url);
        const base = new URL(appUrl);
        if (parsed.hostname === 'localhost' && base.hostname === 'localhost') return true;
        return parsed.origin === base.origin;
      } catch { return false; }
    };

    const successUrl = rawSuccessUrl && isSameOrigin(rawSuccessUrl)
      ? rawSuccessUrl
      : `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = rawCancelUrl && isSameOrigin(rawCancelUrl)
      ? rawCancelUrl
      : `${appUrl}/pricing`;

    // Reserve the promo code BEFORE talking to Stripe: the reservation (an
    // INSERT against a partial unique index + a max_redemptions trigger, see
    // promo-codes.ts) is the actual one-time-use guarantee. Reserving first
    // means a losing race never even creates a Stripe session.
    let promoRedemptionId: string | null = null;
    let couponId: string | null = null;
    if (rawPromoCode) {
      const validation = await validatePromoCode(rawPromoCode, user.id, email, tierId, supabase);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      couponId = getStripeCouponId(validation.promoCode.discount_percent);
      if (!couponId) {
        captureApiError(new Error('Missing Stripe coupon env var'), { route: 'stripe/create-checkout', discountPercent: validation.promoCode.discount_percent });
        return NextResponse.json({ error: 'Promo codes are not configured. Please contact support.' }, { status: 503 });
      }

      const reservation = await reservePromoRedemption(
        validation.promoCode,
        user.id,
        email,
        resolvedApplicationId,
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
        success_url: successUrl.includes('{CHECKOUT_SESSION_ID}')
          ? successUrl
          : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        customer_email: email,
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        metadata: {
          applicationId: resolvedApplicationId ?? '',
          fddId: fddId ?? '',
          userId: user.id,
          tierId,
          promoRedemptionId: promoRedemptionId ?? '',
        },
      });
    } catch (err) {
      // Stripe failed after the promo reservation succeeded — release it so
      // the user isn't locked out of a code they never got to use.
      if (promoRedemptionId) {
        const { error: releaseError } = await supabase.from('promo_redemptions').delete().eq('id', promoRedemptionId);
        if (releaseError) {
          captureApiError(releaseError, { route: 'stripe/create-checkout', stage: 'promo-release-after-stripe-failure', promoRedemptionId });
        }
      }
      captureApiError(err, { route: 'stripe/create-checkout', stage: 'stripe-session', userId: user.id, tierId });
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    if (promoRedemptionId) {
      const { error: sessionIdPatchError } = await supabase
        .from('promo_redemptions')
        .update({ stripe_session_id: session.id })
        .eq('id', promoRedemptionId);
      if (sessionIdPatchError) {
        captureApiError(sessionIdPatchError, { route: 'stripe/create-checkout', stage: 'promo-session-id-patch', promoRedemptionId, sessionId: session.id });
      }
    }

    const { error: insertError } = await supabase.from('payments').insert({
      application_id: resolvedApplicationId,
      user_id: user.id,
      stripe_session_id: session.id,
      stripe_price_id: priceId,
      amount_paid: 0,
      currency: 'usd',
      status: 'pending',
      payment_type: tierId,
    });

    if (insertError) {
      captureApiError(insertError, { route: 'stripe/create-checkout', stage: 'pending-payment-insert', userId: user.id, applicationId: resolvedApplicationId, tierId });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    captureApiError(error, { route: 'stripe/create-checkout', userId: user.id });
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
