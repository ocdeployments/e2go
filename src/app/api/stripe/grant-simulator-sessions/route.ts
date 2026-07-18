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

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

// Stripe async settle: success_url fires before payment_status is always 'paid'.
// Retry up to 3x with 800ms gaps before giving up.
async function retrieveStripeSessionWithRetry(
  stripe: Stripe,
  sessionId: string,
  maxAttempts = 3
): Promise<Stripe.Checkout.Session> {
  let lastSession: Stripe.Checkout.Session | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 800));
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    lastSession = session;
    if (session.payment_status === 'paid' || session.status === 'complete') {
      return session;
    }
  }
  return lastSession!;
}

/**
 * POST /api/stripe/grant-simulator-sessions
 *
 * Called by the simulator page after a successful Stripe checkout redirect.
 * Verifies the Stripe session, then increments simulator_sessions_purchased by 3
 * for the application in metadata. Idempotent — re-running on an already-processed
 * session is a no-op (detected via payments.status = 'completed').
 */
export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Idempotency: check if this session was already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status, application_id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingPayment?.status === 'completed') {
      // Already granted by webhook or prior client call — just return current DB state
      const { data: existingApp } = await supabase
        .from('applications')
        .select('simulator_sessions_used, simulator_sessions_purchased')
        .eq('id', existingPayment.application_id ?? '')
        .single();
      return NextResponse.json({
        granted: false,
        alreadyProcessed: true,
        sessionsUsed: existingApp?.simulator_sessions_used ?? 0,
        sessionsPurchased: existingApp?.simulator_sessions_purchased ?? 2,
      });
    }

    // Retrieve Stripe session with retry to handle async payment status lag
    const stripeSession = await retrieveStripeSessionWithRetry(stripe, sessionId);

    const isPaid = stripeSession.payment_status === 'paid' || stripeSession.status === 'complete';
    if (!isPaid) {
      console.warn(`grant-simulator-sessions: payment not confirmed after retries. session=${sessionId} payment_status=${stripeSession.payment_status} status=${stripeSession.status}`);
      return NextResponse.json({ granted: false, reason: 'Payment not completed' });
    }

    const tierId = stripeSession.metadata?.tierId;
    if (tierId !== 'simulator_3pack') {
      return NextResponse.json({ granted: false, reason: 'Not a simulator purchase' });
    }

    const applicationId = stripeSession.metadata?.applicationId;
    if (!applicationId) {
      return NextResponse.json({ granted: false, reason: 'No applicationId in metadata' });
    }

    // Grant 3 sessions: increment simulator_sessions_purchased
    const { data: app, error: fetchErr } = await supabase
      .from('applications')
      .select('simulator_sessions_purchased')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !app) {
      captureApiError(fetchErr ?? new Error('grant-simulator-sessions: application not found'), { route: 'stripe/grant-simulator-sessions', stage: 'fetch-application', userId: user.id, applicationId });
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const newPurchased = (app.simulator_sessions_purchased ?? 2) + 3;

    await supabase
      .from('applications')
      .update({ simulator_sessions_purchased: newPurchased })
      .eq('id', applicationId)
      .eq('user_id', user.id);

    // Mark payment as completed (upsert-style: update if exists, or insert if missing)
    if (existingPayment) {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          amount_paid: stripeSession.amount_total ?? 0,
          completed_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', sessionId);
    } else {
      // Payment record was never created (create-checkout insert failed silently) — create it now
      await supabase.from('payments').insert({
        application_id: applicationId,
        user_id: user.id,
        stripe_session_id: sessionId,
        stripe_price_id: stripeSession.metadata?.priceId ?? '',
        amount_paid: stripeSession.amount_total ?? 0,
        currency: stripeSession.currency ?? 'usd',
        status: 'completed',
        payment_type: tierId,
        completed_at: new Date().toISOString(),
      });
    }

    const { data: updated } = await supabase
      .from('applications')
      .select('simulator_sessions_used, simulator_sessions_purchased')
      .eq('id', applicationId)
      .single();

    return NextResponse.json({
      granted: true,
      sessionsGranted: 3,
      sessionsUsed: updated?.simulator_sessions_used ?? 0,
      sessionsPurchased: updated?.simulator_sessions_purchased ?? newPurchased,
    });
  } catch (err) {
    captureApiError(err, { route: 'stripe/grant-simulator-sessions', userId: user.id });
    return NextResponse.json({ error: 'Failed to grant sessions' }, { status: 500 });
  }
}
