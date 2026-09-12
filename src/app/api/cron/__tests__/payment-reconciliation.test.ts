import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { reconcilePayments } from '@/lib/payment-reconciliation';

// RS-4 (Gaps G-13, G-14, G-15 backstop): none of the existing crons ever ask
// Stripe's own ledger whether a checkout completed. These tests drive
// reconcilePayments() directly against fake Stripe/Supabase clients to prove
// it catches the two ways a webhook can half-apply a payment — the
// `payments` row never getting stamped 'completed', and the application
// never getting unlocked even though the payment row did land — while
// leaving a consistent pair, a refunded payment, and a session still inside
// the grace window alone.

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const OLD_SESSION_CREATED = NOW_SECONDS - 30 * 60; // 30 min ago — past the 15 min grace window
const FRESH_SESSION_CREATED = NOW_SECONDS - 5 * 60; // 5 min ago — inside the grace window

function fakeSession(overrides: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    status: 'complete',
    payment_status: 'paid',
    created: OLD_SESSION_CREATED,
    metadata: { applicationId: 'app-1', userId: 'user-1', tierId: 'foundation' },
    ...overrides,
  } as Stripe.Checkout.Session;
}

function fakeStripe(sessions: Stripe.Checkout.Session[]): Stripe {
  return {
    checkout: {
      sessions: {
        list: jest.fn().mockResolvedValue({ data: sessions, has_more: false }),
      },
    },
  } as unknown as Stripe;
}

function fakeSupabase(opts: {
  payment?: { status: string } | null;
  application?: { payment_status: string } | null;
}): SupabaseClient {
  return {
    from: (table: string) => {
      if (table === 'payments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: opts.payment ?? null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'applications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: opts.application ?? null, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  } as unknown as SupabaseClient;
}

describe('reconcilePayments (RS-4 / Gaps G-13, G-14, G-15 backstop)', () => {
  it('flags a completed Stripe session whose payments row was never stamped completed', async () => {
    const stripe = fakeStripe([fakeSession({})]);
    const supabase = fakeSupabase({ payment: null });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.checked).toBe(1);
    expect(result.mismatches).toEqual([
      { sessionId: 'cs_test_1', applicationId: 'app-1', userId: 'user-1', tierId: 'foundation', reason: 'payment-not-recorded' },
    ]);
  });

  it('flags a recorded payment whose application was never unlocked', async () => {
    const stripe = fakeStripe([fakeSession({})]);
    const supabase = fakeSupabase({
      payment: { status: 'completed' },
      application: { payment_status: 'unpaid' },
    });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.mismatches).toEqual([
      { sessionId: 'cs_test_1', applicationId: 'app-1', userId: 'user-1', tierId: 'foundation', reason: 'application-not-unlocked' },
    ]);
  });

  it('does not flag a consistent completed payment and unlocked application', async () => {
    const stripe = fakeStripe([fakeSession({})]);
    const supabase = fakeSupabase({
      payment: { status: 'completed' },
      application: { payment_status: 'paid' },
    });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.checked).toBe(1);
    expect(result.mismatches).toEqual([]);
  });

  it('does not flag a legitimately refunded payment even though the application is no longer paid', async () => {
    const stripe = fakeStripe([fakeSession({})]);
    const supabase = fakeSupabase({ payment: { status: 'refunded' } });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.mismatches).toEqual([]);
  });

  it('does not flag a payment for a tier that never unlocks applications.payment_status', async () => {
    const stripe = fakeStripe([fakeSession({ metadata: { applicationId: 'app-1', userId: 'user-1', tierId: 'fdd_intelligence' } })]);
    const supabase = fakeSupabase({ payment: { status: 'completed' } });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.mismatches).toEqual([]);
  });

  it('skips a session still inside the 15-minute grace window, avoiding a false positive on webhook latency', async () => {
    const stripe = fakeStripe([fakeSession({ created: FRESH_SESSION_CREATED })]);
    const supabase = fakeSupabase({ payment: null });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.checked).toBe(0);
    expect(result.mismatches).toEqual([]);
  });

  it('ignores sessions that never completed payment', async () => {
    const stripe = fakeStripe([fakeSession({ status: 'expired', payment_status: 'unpaid' })]);
    const supabase = fakeSupabase({ payment: null });

    const result = await reconcilePayments(stripe, supabase, NOW_SECONDS - 3600);

    expect(result.checked).toBe(0);
    expect(result.mismatches).toEqual([]);
  });
});
