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

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
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

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== 'paid' && stripeSession.status !== 'complete') {
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

    const supabase = getSupabase();

    // Idempotency: check if this session was already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingPayment?.status === 'completed') {
      // Already granted — just return current availability
      const { data: app } = await supabase
        .from('applications')
        .select('simulator_sessions_used, simulator_sessions_purchased')
        .eq('id', applicationId)
        .single();
      return NextResponse.json({
        granted: false,
        alreadyProcessed: true,
        sessionsUsed: app?.simulator_sessions_used ?? 0,
        sessionsPurchased: app?.simulator_sessions_purchased ?? 2,
      });
    }

    // Grant 3 sessions: increment simulator_sessions_purchased
    const { data: app, error: fetchErr } = await supabase
      .from('applications')
      .select('simulator_sessions_purchased')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const newPurchased = (app.simulator_sessions_purchased ?? 2) + 3;

    await supabase
      .from('applications')
      .update({ simulator_sessions_purchased: newPurchased })
      .eq('id', applicationId)
      .eq('user_id', user.id);

    // Mark payment as completed
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        amount_paid: stripeSession.amount_total ?? 0,
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', sessionId);

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
    console.error('Grant simulator sessions error:', err);
    return NextResponse.json({ error: 'Failed to grant sessions' }, { status: 500 });
  }
}
