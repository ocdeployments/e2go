import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

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
    // Require authenticated session — userId is derived server-side, never from body
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, sessionId } = body;
    // userId deliberately not read from body — use session identity only

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
        const tierId = session.metadata?.tierId || 'unknown';

        // Verify ownership — session userId must match the authenticated user
        const userIdFromMeta = session.metadata?.userId || null;
        if (userIdFromMeta && userIdFromMeta !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Upsert payment row — creates if missing, no-op if exists
        await supabase.from('payments').upsert(
          {
            application_id: applicationIdFromMeta,
            user_id: user.id,
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

        // C1 FIX: Also update applications.payment_status immediately so middleware
        // grants access without waiting for the async Stripe webhook (race condition fix).
        // The webhook may re-update this row later — both writes are idempotent.
        if (applicationIdFromMeta) {
          await supabase
            .from('applications')
            .update({ payment_status: 'paid' })
            .eq('id', applicationIdFromMeta);
        }

        // Invalidate middleware access cache so the user gets through on next
        // navigation without waiting for the webhook (mirrors webhook behavior).
        if (redis) {
          await redis.del(`mw:access:${user.id}`);
        }

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

    // Mode 1: Local database check — userId from session, not body
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, application_id, user_id, stripe_session_id, stripe_payment_intent_id, stripe_price_id, amount_paid, currency, status, payment_type, refund_eligible, refunded_at, created_at, completed_at')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
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
