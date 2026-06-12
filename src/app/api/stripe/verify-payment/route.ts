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
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

/**
 * POST /api/stripe/verify-payment
 *
 * Two modes:
 * 1. { applicationId, userId } — checks if user has a completed payment (existing behavior)
 * 2. { sessionId } — fallback: verifies via Stripe API and upserts payment row if missing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, userId, sessionId } = body;

    // Mode 2: Stripe session fallback
    if (sessionId) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid' && session.status !== 'complete') {
          return NextResponse.json({ verified: false, reason: 'Payment not completed' });
        }

        const supabase = getSupabase();
        const applicationIdFromMeta = session.metadata?.applicationId || null;
        const userIdFromMeta = session.metadata?.userId || null;
        const tierId = session.metadata?.tierId || 'unknown';

        // Upsert payment row — creates if missing, no-op if exists
        await supabase.from('payments').upsert(
          {
            application_id: applicationIdFromMeta,
            user_id: userIdFromMeta,
            stripe_session_id: session.id,
            stripe_payment_intent_id: (session.payment_intent as string) || null,
            stripe_price_id: session.metadata?.priceId || '',
            amount_paid: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'completed',
            payment_type: tierId,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_session_id' }
        );

        return NextResponse.json({
          verified: true,
          payment: {
            payment_type: tierId,
            amount_paid: session.amount_total || 0,
            status: 'completed',
          },
        });
      } catch (err) {
        console.error('Stripe session retrieve error:', err);
        return NextResponse.json({ verified: false, reason: 'Failed to retrieve Stripe session' });
      }
    }

    // Mode 1: Local database check (existing behavior)
    if (!applicationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (error || !payment) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: true,
      payment,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
