import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';

/**
 * RS-4 (Gaps G-13, G-14, G-15 backstop): none of the existing crons ever ask
 * Stripe's own ledger whether a checkout actually completed. This is the net
 * under a half-applied webhook — the dedup claim race (G-13), the unguarded
 * throw that used to escape the event switch (G-14), or a middleware read
 * that failed closed (G-15) could all, in principle, leave Stripe showing a
 * completed payment while our own tables don't reflect it.
 *
 * Tiers that flip `applications.payment_status` to 'paid' on a completed
 * checkout — must match the unlock/refund-revoke conditions in
 * src/app/api/stripe/webhook/route.ts (checkout.session.completed and
 * charge.refunded handlers) exactly, since this cron is auditing those two
 * writes specifically.
 */
const APPLICATION_UNLOCK_TIERS = ['complete', 'complete_partnership', 'foundation', 'visa_ready'];

// A session younger than this may still be mid-flight through the webhook —
// Stripe's own delivery latency, not a bug. Flagging it would just be noise.
const GRACE_MINUTES = 15;

export interface ReconciliationMismatch {
  sessionId: string;
  applicationId: string | null;
  userId: string | null;
  tierId: string | null;
  reason: 'payment-not-recorded' | 'application-not-unlocked';
}

export interface ReconciliationResult {
  checked: number;
  mismatches: ReconciliationMismatch[];
}

/** Pages through every checkout session created since `sinceUnixSeconds`. */
async function listRecentSessions(stripe: Stripe, sinceUnixSeconds: number): Promise<Stripe.Checkout.Session[]> {
  const sessions: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.checkout.sessions.list({
      created: { gte: sinceUnixSeconds },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    sessions.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return sessions;
}

/**
 * Cross-checks Stripe's completed checkout sessions against our own
 * `payments` and `applications` rows. Pure function over an injected
 * Stripe/Supabase client pair so it can run against fakes in tests.
 */
export async function reconcilePayments(
  stripe: Stripe,
  supabase: SupabaseClient,
  sinceUnixSeconds: number,
): Promise<ReconciliationResult> {
  const sessions = await listRecentSessions(stripe, sinceUnixSeconds);
  const graceCutoffMs = Date.now() - GRACE_MINUTES * 60 * 1000;

  const mismatches: ReconciliationMismatch[] = [];
  let checked = 0;

  for (const session of sessions) {
    if (session.status !== 'complete' || session.payment_status !== 'paid') continue;
    if (session.created * 1000 > graceCutoffMs) continue; // still inside the grace window

    checked += 1;
    const applicationId = session.metadata?.applicationId || null;
    const userId = session.metadata?.userId || null;
    const tierId = session.metadata?.tierId || null;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('status')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (paymentError) {
      captureApiError(paymentError, {
        route: 'cron/payment-reconciliation',
        stage: 'payment-lookup',
        sessionId: session.id,
      });
      continue;
    }

    if (!payment || (payment.status !== 'completed' && payment.status !== 'refunded')) {
      mismatches.push({ sessionId: session.id, applicationId, userId, tierId, reason: 'payment-not-recorded' });
      continue;
    }

    // A refund is a legitimate reason applications.payment_status won't be
    // 'paid' — that's the refund-revoke path in the webhook, not a bug.
    if (payment.status === 'refunded') continue;

    if (tierId && APPLICATION_UNLOCK_TIERS.includes(tierId) && applicationId && userId) {
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .select('payment_status')
        .eq('id', applicationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (applicationError) {
        captureApiError(applicationError, {
          route: 'cron/payment-reconciliation',
          stage: 'application-lookup',
          sessionId: session.id,
          applicationId,
        });
        continue;
      }

      if (application?.payment_status !== 'paid') {
        mismatches.push({ sessionId: session.id, applicationId, userId, tierId, reason: 'application-not-unlocked' });
      }
    }
  }

  for (const mismatch of mismatches) {
    captureApiError(new Error(`Stripe shows a completed payment our records don't reflect (${mismatch.reason})`), {
      route: 'cron/payment-reconciliation',
      stage: mismatch.reason,
      sessionId: mismatch.sessionId,
      applicationId: mismatch.applicationId,
      userId: mismatch.userId,
      tierId: mismatch.tierId,
    });
  }

  return { checked, mismatches };
}
