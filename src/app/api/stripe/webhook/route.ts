import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured for webhooks');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
      300 // reject events older than 5 minutes
    );
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Event type allowlist — ignore unknown events
  if (!ALLOWED_EVENT_TYPES.includes(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = getSupabase();

  // Idempotency — prevent replay attacks
  const { data: existing } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Process the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const applicationId = session.metadata?.applicationId;
      const userId = session.metadata?.userId;
      const paymentIntentId = session.payment_intent as string;

      if (applicationId && userId) {
        // Update payment record
        await supabase
          .from('payments')
          .update({
            stripe_payment_intent_id: paymentIntentId,
            amount_paid: session.amount_total || 0,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id);

        // Update application payment status
        await supabase
          .from('applications')
          .update({
            payment_status: 'paid',
          })
          .eq('id', applicationId);

        // Update lifecycle
        await supabase
          .from('application_lifecycle')
          .update({
            payment_completed_at: new Date().toISOString(),
          })
          .eq('application_id', applicationId);
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;

      await supabase
        .from('payments')
        .update({ status: 'expired' })
        .eq('stripe_session_id', session.id);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      // Find payment by payment intent and update
      const { data: payment } = await supabase
        .from('payments')
        .select('id, application_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (payment) {
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (payment.application_id) {
          await supabase
            .from('applications')
            .update({ payment_status: 'refunded' })
            .eq('id', payment.application_id);
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);
      break;
    }
  }

  // Record processed event for idempotency
  await supabase
    .from('processed_webhook_events')
    .insert({ stripe_event_id: event.id, processed_at: new Date().toISOString() });

  return NextResponse.json({ received: true });
}
