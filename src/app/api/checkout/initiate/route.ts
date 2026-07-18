import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { captureApiError } from '@/lib/capture-error';

// Valid tiers that can be initiated from first-purchase flows
const VALID_TIERS = ['complete', 'complete_partnership', 'fdd_intelligence'] as const;
type Tier = typeof VALID_TIERS[number];

// Tier → Stripe price ID.
// Falls back to the old env var names that predate the "complete" tier rename.
const PRICE_ENV: Record<Tier, string> = {
  complete:             process.env.STRIPE_PRICE_COMPLETE        || process.env.STRIPE_PRICE_SOLO        || '',
  complete_partnership: process.env.STRIPE_PRICE_COMPLETE_PARTNERSHIP || process.env.STRIPE_PRICE_PARTNERSHIP || '',
  fdd_intelligence:     process.env.STRIPE_PRICE_FDD_INTELLIGENCE || '',
};

// Tiers that must create/reference an applications record
const NEEDS_APPLICATION: Set<Tier> = new Set(['complete', 'complete_partnership']);

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
  try {
    const body = await request.json() as { tierId?: string };
    if (!body.tierId || !VALID_TIERS.includes(body.tierId as Tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    tierId = body.tierId as Tier;
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

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${appUrl}/onboarding?payment=success`,
      cancel_url: `${appUrl}/results`,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata: {
        applicationId: applicationId ?? '',
        userId: user.id,
        tierId,
      },
    });
  } catch (err) {
    captureApiError(err, { route: 'checkout/initiate', stage: 'stripe-session', userId: user.id, tierId });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
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
