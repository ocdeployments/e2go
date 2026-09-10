import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { captureApiError } from '@/lib/capture-error';
import { reconcilePayments } from '@/lib/payment-reconciliation';

// RS-4 (Gaps G-13, G-14, G-15 backstop): asks Stripe's own ledger whether a
// checkout completed and cross-checks that against our `payments` and
// `applications` rows. Runs daily via Vercel cron — see reconcilePayments()
// in src/lib/payment-reconciliation.ts for the comparison logic.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Looks back further than the 24h cadence so a delayed run never leaves a gap.
const LOOKBACK_HOURS = 26;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    captureApiError(new Error('Stripe not configured for payment-reconciliation cron'), {
      route: 'cron/payment-reconciliation',
    });
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();

  const { data: logRow } = await supabase
    .from('cron_log')
    .insert({ job_name: 'payment-reconciliation', status: 'running' })
    .select('id')
    .single();
  const logId = logRow?.id ?? '';

  try {
    const sinceUnixSeconds = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * 60 * 60;
    const { checked, mismatches } = await reconcilePayments(stripe, supabase, sinceUnixSeconds);

    if (logId) {
      await supabase
        .from('cron_log')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          rows_processed: checked,
          metadata: { mismatches: mismatches.length },
        })
        .eq('id', logId);
    }

    return NextResponse.json({ ok: true, checked, mismatches: mismatches.length });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    captureApiError(err, { route: 'cron/payment-reconciliation' });

    if (logId) {
      await supabase
        .from('cron_log')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: errMsg })
        .eq('id', logId);
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
