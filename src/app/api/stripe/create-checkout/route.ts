import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

// Fallback price IDs from env (if DB unavailable)
const FALLBACK_PRICE_IDS: Record<string, string> = {
  solo_none: process.env.STRIPE_PRICE_SOLO || '',
  solo_spouse: process.env.STRIPE_PRICE_SOLO_SPOUSE || '',
  solo_family_small: process.env.STRIPE_PRICE_SOLO_FAMILY_2 || '',
  solo_family_large: process.env.STRIPE_PRICE_SOLO_FAMILY_5 || '',
  partnership_none: process.env.STRIPE_PRICE_PARTNERSHIP || '',
  partnership_couples: process.env.STRIPE_PRICE_PARTNERSHIP_COUPLES || '',
  partnership_families: process.env.STRIPE_PRICE_PARTNERSHIP_FAMILIES || '',
};

async function getStripePriceId(supabase: ReturnType<typeof getSupabase>, tierId: string): Promise<string | null> {
  // Try DB first
  const { data: tier, error } = await supabase
    .from('pricing')
    .select('stripe_price_id, active')
    .eq('tier_id', tierId)
    .eq('active', true)
    .single();

  if (!error && tier && tier.stripe_price_id) {
    return tier.stripe_price_id;
  }

  // Fallback to env var
  const fallback = FALLBACK_PRICE_IDS[tierId];
  if (fallback) {
    console.warn(`Using fallback price ID for ${tierId} from env`);
    return fallback;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment processing not configured', status: 503 },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tierId, applicationId, userId } = body;

    if (!tierId || !applicationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, applicationId, userId' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get Stripe Price ID from DB or fallback
    const priceId = await getStripePriceId(supabase, tierId);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Pricing tier not found or not configured', status: 404 },
        { status: 404 }
      );
    }

    // Get user email for Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const email = profile?.email || '';

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: email,
      metadata: {
        applicationId,
        userId,
        tierId,
      },
    });

    // Create pending payment record
    await supabase.from('payments').insert({
      application_id: applicationId,
      user_id: userId,
      stripe_session_id: session.id,
      stripe_price_id: priceId,
      amount_paid: 0,
      currency: 'usd',
      status: 'pending',
      payment_type: tierId,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}