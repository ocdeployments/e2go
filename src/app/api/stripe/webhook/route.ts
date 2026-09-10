import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { captureApiError } from '@/lib/capture-error';

// Invalidate middleware payment-access cache so users get correct access on next request
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

const ALLOWED_EVENT_TYPES = [
  'checkout.session.completed',
  'checkout.session.expired',
  'charge.refunded',
  'payment_intent.payment_failed',
];

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

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    captureApiError(new Error('Stripe not configured for webhooks'), { route: 'stripe/webhook' });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret, 300);
  } catch (err) {
    captureApiError(err, { route: 'stripe/webhook', stage: 'signature-verify' });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!ALLOWED_EVENT_TYPES.includes(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = getSupabase();

  // H3: Idempotency — INSERT first; unique constraint on stripe_event_id catches duplicates atomically.
  // No SELECT+INSERT race: the DB enforces uniqueness, not application logic.
  const { error: dedupError } = await supabase
    .from('processed_webhook_events')
    .insert({ stripe_event_id: event.id, processed_at: new Date().toISOString() });

  if (dedupError) {
    if (dedupError.code === '23505') {
      // Duplicate delivery — already processed
      return NextResponse.json({ received: true, duplicate: true });
    }
    // DB error — log and return 200 to avoid Stripe retry storm
    captureApiError(dedupError, { route: 'stripe/webhook', stage: 'dedup-insert', eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const applicationId = session.metadata?.applicationId;
      const fddId = session.metadata?.fddId;
      const userId = session.metadata?.userId;
      const tierId = session.metadata?.tierId || '';
      const promoRedemptionId = session.metadata?.promoRedemptionId;
      const paymentIntentId = session.payment_intent as string;

      if (promoRedemptionId) {
        const { error: promoCompleteError } = await supabase
          .from('promo_redemptions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', promoRedemptionId);

        if (promoCompleteError) {
          captureApiError(promoCompleteError, {
            route: 'stripe/webhook',
            stage: 'promo-redemption-complete',
            eventId: event.id,
            promoRedemptionId,
          });
        }
      }

      // Always mark the payment record as completed
      const { error: paymentCompleteError } = await supabase
        .from('payments')
        .update({
          stripe_payment_intent_id: paymentIntentId,
          amount_paid: session.amount_total || 0,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id);

      if (paymentCompleteError) {
        captureApiError(paymentCompleteError, {
          route: 'stripe/webhook',
          stage: 'payment-complete-stamp',
          eventId: event.id,
          sessionId: session.id,
          tierId,
        });
      }

      if (
        (tierId === 'complete' || tierId === 'complete_partnership' || tierId === 'foundation' || tierId === 'visa_ready') &&
        applicationId && userId
      ) {
        // Unlock full application access — scoped to the paying user so a
        // spoofed applicationId in session metadata can't unlock someone
        // else's application.
        const { error: unlockError } = await supabase
          .from('applications')
          .update({ payment_status: 'paid' })
          .eq('id', applicationId)
          .eq('user_id', userId);

        if (unlockError) {
          captureApiError(unlockError, {
            route: 'stripe/webhook',
            stage: 'application-unlock',
            eventId: event.id,
            applicationId,
            userId,
          });
        }

        /**
         * application_lifecycle is a client-funnel table, one row per
         * user_id, not per application — scoping by user_id is correct here,
         * not a stand-in for a missing application_id column.
         */
        const { error: lifecycleError } = await supabase
          .from('application_lifecycle')
          .update({ payment_completed_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (lifecycleError) {
          captureApiError(lifecycleError, {
            route: 'stripe/webhook',
            stage: 'lifecycle-payment-stamp',
            eventId: event.id,
            userId,
          });
        }

      } else if (
        (tierId === 'fdd_intelligence' || tierId === 'fdd_intelligence_loyalty') &&
        fddId && userId
      ) {
        // Unlock the specific FDD analysis report
        const { error: fddUnlockError } = await supabase
          .from('fdd_analyses')
          .update({ report_unlocked: true })
          .eq('id', fddId)
          .eq('user_id', userId);

        if (fddUnlockError) {
          captureApiError(fddUnlockError, {
            route: 'stripe/webhook',
            stage: 'fdd-unlock',
            eventId: event.id,
            fddId,
            userId,
          });
        }

      } else if (tierId === 'simulator_3pack' && applicationId && userId) {
        // Grant 3 additional simulator sessions
        const { data: currentApp, error: packReadError } = await supabase
          .from('applications')
          .select('simulator_sessions_purchased')
          .eq('id', applicationId)
          .single();

        if (packReadError) {
          captureApiError(packReadError, {
            route: 'stripe/webhook',
            stage: 'simulator-pack-read',
            eventId: event.id,
            applicationId,
          });
        } else if (currentApp) {
          const { error: packGrantError } = await supabase
            .from('applications')
            .update({
              simulator_sessions_purchased: (currentApp.simulator_sessions_purchased ?? 2) + 3,
            })
            .eq('id', applicationId);

          if (packGrantError) {
            captureApiError(packGrantError, {
              route: 'stripe/webhook',
              stage: 'simulator-pack-grant',
              eventId: event.id,
              applicationId,
            });
          }
        }
      }
      // investor_ready, loyalty_upgrade, interview_prep, renewal, and the FDD/market
      // add-ons: payment record update above is sufficient — they're bolt-ons read
      // from the payments table via getUserEntitlements(), not application unlocks.

      // Invalidate middleware access cache so the user gets through on next navigation
      if (userId && redis) {
        await redis.del(`mw:access:${userId}`);
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { error: expireError } = await supabase
        .from('payments')
        .update({ status: 'expired' })
        .eq('stripe_session_id', session.id);

      if (expireError) {
        captureApiError(expireError, {
          route: 'stripe/webhook',
          stage: 'session-expired-stamp',
          eventId: event.id,
          sessionId: session.id,
        });
      }

      // Release an abandoned promo reservation — the partial unique index in
      // the migration only blocks 'pending'/'completed', so this lets the
      // same account retry the code after a checkout they never finished.
      const promoRedemptionId = session.metadata?.promoRedemptionId;
      if (promoRedemptionId) {
        const { error: promoExpireError } = await supabase
          .from('promo_redemptions')
          .update({ status: 'expired' })
          .eq('id', promoRedemptionId)
          .eq('status', 'pending');

        if (promoExpireError) {
          captureApiError(promoExpireError, {
            route: 'stripe/webhook',
            stage: 'promo-redemption-expire',
            eventId: event.id,
            promoRedemptionId,
          });
        }
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      const { data: payment, error: paymentLookupError } = await supabase
        .from('payments')
        .select('id, application_id, payment_type, user_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (paymentLookupError) {
        captureApiError(paymentLookupError, {
          route: 'stripe/webhook',
          stage: 'refund-payment-lookup',
          eventId: event.id,
          paymentIntentId,
        });
      }

      if (payment) {
        const { error: refundStampError } = await supabase
          .from('payments')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('id', payment.id);

        if (refundStampError) {
          captureApiError(refundStampError, {
            route: 'stripe/webhook',
            stage: 'refund-payment-stamp',
            eventId: event.id,
            paymentId: payment.id,
          });
        }

        // Retrieve PaymentIntent metadata to get tierId/fddId
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const tierId = pi.metadata?.tierId ?? payment.payment_type;
        const fddId = pi.metadata?.fddId;

        // Deliberately not releasing promo_redemptions here: a promo code's
        // redemption stays 'completed' even after a refund, so a buy-with-
        // code -> refund -> re-redeem loop isn't a way to reuse a one-time
        // code. The application/FDD/pack access itself is still revoked below.

        if (
          (tierId === 'complete' || tierId === 'complete_partnership' || tierId === 'foundation' || tierId === 'visa_ready') &&
          payment.application_id
        ) {
          const { error: revokeError } = await supabase
            .from('applications')
            .update({ payment_status: 'refunded' })
            .eq('id', payment.application_id);

          if (revokeError) {
            captureApiError(revokeError, {
              route: 'stripe/webhook',
              stage: 'refund-application-revoke',
              eventId: event.id,
              applicationId: payment.application_id,
            });
          }

        } else if (
          (tierId === 'fdd_intelligence' || tierId === 'fdd_intelligence_loyalty') &&
          fddId && payment.user_id
        ) {
          // Revoke FDD report access
          const { error: fddRevokeError } = await supabase
            .from('fdd_analyses')
            .update({ report_unlocked: false })
            .eq('id', fddId)
            .eq('user_id', payment.user_id);

          if (fddRevokeError) {
            captureApiError(fddRevokeError, {
              route: 'stripe/webhook',
              stage: 'refund-fdd-revoke',
              eventId: event.id,
              fddId,
              userId: payment.user_id,
            });
          }

        } else if (tierId === 'simulator_3pack' && payment.application_id) {
          // Deduct 3 sessions from the pack that was refunded
          const { data: currentApp, error: packReadError } = await supabase
            .from('applications')
            .select('simulator_sessions_purchased')
            .eq('id', payment.application_id)
            .single();

          if (packReadError) {
            captureApiError(packReadError, {
              route: 'stripe/webhook',
              stage: 'refund-simulator-pack-read',
              eventId: event.id,
              applicationId: payment.application_id,
            });
          } else if (currentApp) {
            const { error: packRevokeError } = await supabase
              .from('applications')
              .update({
                simulator_sessions_purchased: Math.max(0, (currentApp.simulator_sessions_purchased ?? 0) - 3),
              })
              .eq('id', payment.application_id);

            if (packRevokeError) {
              captureApiError(packRevokeError, {
                route: 'stripe/webhook',
                stage: 'refund-simulator-pack-revoke',
                eventId: event.id,
                applicationId: payment.application_id,
              });
            }
          }
        }

        // Invalidate middleware access cache — refund may revoke access
        if (payment.user_id && redis) {
          await redis.del(`mw:access:${payment.user_id}`);
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { error: failedStampError } = await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (failedStampError) {
        captureApiError(failedStampError, {
          route: 'stripe/webhook',
          stage: 'payment-failed-stamp',
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
