import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_TIER_IDS = [
  'solo_none', 'solo_spouse', 'solo_family_small', 'solo_family_large',
  'partnership_none', 'partnership_couples', 'partnership_families',
  'simulator_3pack', 'renewal', 'child_surcharge',
];

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
  simulator_3pack: process.env.STRIPE_PRICE_SIMULATOR_3PACK || '',
  renewal: process.env.STRIPE_PRICE_RENEWAL || '',
  child_surcharge: process.env.STRIPE_PRICE_CHILD_SURCHARGE || '',
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
  // Session auth
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
    const { tierId, applicationId, children_count } = body;

    if (!tierId || !applicationId) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, applicationId' },
        { status: 400 }
      );
    }

    // Validate tierId allowlist
    if (!VALID_TIER_IDS.includes(tierId)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
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
      .eq('id', user.id)
      .single();

    const email = profile?.email || '';

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build line items
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ];

    // Handle per-child surcharge for partnership_families
    if (tierId === 'partnership_families' && children_count !== undefined && children_count > 2) {
      const extraChildren = children_count - 2; // Base includes 2 kids per family = 4 total
      const childSurchargePriceId = await getStripePriceId(supabase, 'child_surcharge');
      if (childSurchargePriceId) {
        // Add surcharge line item with quantity = extra children (2 families, so per-family extra * 2)
        lineItems.push({
          price: childSurchargePriceId,
          quantity: extraChildren * 2,
        });
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: email,
      metadata: {
        applicationId,
        userId: user.id,
        tierId,
        children_count: children_count?.toString() || '0',
      },
    });

    // Create pending payment record
    await supabase.from('payments').insert({
      application_id: applicationId,
      user_id: user.id,
      stripe_session_id: session.id,
      stripe_price_id: priceId,
      amount_paid: 0,
      currency: 'usd',
      status: 'pending',
      payment_type: tierId,
      metadata: {
        children_count: children_count || 0,
        line_items_count: lineItems.length,
      },
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