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

function getPaymentTypeFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    solo: 'solo',
    solo_spouse: 'solo_spouse',
    solo_family_2: 'solo_family_2',
    solo_family_5: 'solo_family_5',
    partnership: 'partnership',
    partnership_couples: 'partnership_couples',
    partnership_families: 'partnership_families',
  };

  for (const [key, type] of Object.entries(priceMap)) {
    if (priceId.includes(key)) {
      return type;
    }
  }
  return 'unknown';
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
    const { priceId, applicationId, userId } = body;

    if (!priceId || !applicationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

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
      },
    });

    // Create pending payment record
    const paymentType = getPaymentTypeFromPriceId(priceId);

    await supabase.from('payments').insert({
      application_id: applicationId,
      user_id: userId,
      stripe_session_id: session.id,
      stripe_price_id: priceId,
      amount_paid: 0, // Will be updated by webhook
      currency: 'usd',
      status: 'pending',
      payment_type: paymentType,
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
