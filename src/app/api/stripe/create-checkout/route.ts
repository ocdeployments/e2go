import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { captureApiError } from '@/lib/capture-error';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_TIER_IDS = [
  'complete',
  'complete_partnership',
  'interview_prep',
  'interview_prep_partnership',
  'fdd_intelligence',
  'fdd_intelligence_loyalty',
  'simulator_3pack',
  'renewal',
];

// Tiers that require an applicationId
const REQUIRES_APPLICATION_ID = new Set([
  'complete',
  'complete_partnership',
  'interview_prep',
  'interview_prep_partnership',
  'simulator_3pack',
  'renewal',
]);

// Tiers that require the user to already own a Complete package (solo or partnership)
const REQUIRES_COMPLETE = new Set([
  'interview_prep',
  'interview_prep_partnership',
  'fdd_intelligence_loyalty',
]);

const COMPLETE_TIER_IDS = ['complete', 'complete_partnership'];

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

const FALLBACK_PRICE_IDS: Record<string, string> = {
  complete:                 process.env.STRIPE_PRICE_COMPLETE || '',
  complete_partnership:          process.env.STRIPE_PRICE_COMPLETE_PARTNERSHIP || '',
  interview_prep:                process.env.STRIPE_PRICE_INTERVIEW_PREP || '',
  interview_prep_partnership:    process.env.STRIPE_PRICE_INTERVIEW_PREP_PARTNERSHIP || '',
  fdd_intelligence:         process.env.STRIPE_PRICE_FDD_INTELLIGENCE || '',
  fdd_intelligence_loyalty: process.env.STRIPE_PRICE_FDD_INTELLIGENCE_LOYALTY || '',
  simulator_3pack:          process.env.STRIPE_PRICE_SIMULATOR_3PACK || '',
  renewal:                  process.env.STRIPE_PRICE_RENEWAL || '',
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
    const { tierId, applicationId, fddId, successUrl: rawSuccessUrl, cancelUrl: rawCancelUrl } = body;

    if (!tierId) {
      return NextResponse.json({ error: 'Missing required field: tierId' }, { status: 400 });
    }

    if (!VALID_TIER_IDS.includes(tierId)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (REQUIRES_APPLICATION_ID.has(tierId) && !applicationId) {
      return NextResponse.json(
        { error: `Missing required field: applicationId for ${tierId}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Validate add-on eligibility: user must own any Complete package
    if (REQUIRES_COMPLETE.has(tierId)) {
      const { data: completePayment } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .in('payment_type', COMPLETE_TIER_IDS)
        .eq('status', 'completed')
        .limit(1)
        .single();

      if (!completePayment) {
        return NextResponse.json(
          { error: `${tierId} requires an active Complete package` },
          { status: 403 }
        );
      }
    }

    // Loyalty pricing: also verify Phase B hasn't started (no documents generated yet)
    if (tierId === 'fdd_intelligence_loyalty' && applicationId) {
      const { count } = await supabase
        .from('generated_documents')
        .select('*', { count: 'exact', head: true })
        .eq('application_id', applicationId)
        .eq('status', 'complete');

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Loyalty pricing is no longer available after document generation has started' },
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl.includes('{CHECKOUT_SESSION_ID}')
        ? successUrl
        : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        applicationId: applicationId ?? '',
        fddId: fddId ?? '',
        userId: user.id,
        tierId,
      },
    });

    const { error: insertError } = await supabase.from('payments').insert({
      application_id: applicationId ?? null,
      user_id: user.id,
      stripe_session_id: session.id,
      stripe_price_id: priceId,
      amount_paid: 0,
      currency: 'usd',
      status: 'pending',
      payment_type: tierId,
    });

    if (insertError) {
      captureApiError(insertError, { route: 'stripe/create-checkout', stage: 'pending-payment-insert', userId: user.id, applicationId, tierId });
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
