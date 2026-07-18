/**
 * /api/dashboard/outcome — E-2 case outcome capture (CIC-5.1)
 *
 * POST  — record or update the outcome for an application
 * GET   — fetch the current outcome record for an application
 *
 * Consent model (D6, owner decision 2026-06-30):
 *   consent_given=true is set ONLY when the client explicitly ticked the
 *   outcomes_consent checkbox in the /documents download gate. The UI sends
 *   it as part of the POST body. No anonymised data enters the learning corpus
 *   (CIC-5.4) until consent_given=true AND anonymized_at is populated by a
 *   background job (CIC-5.3, not yet built).
 */

import { NextResponse } from 'next/server';
import { createServiceClient as serviceClient } from '@/lib/supabase-service';
import { captureApiError } from '@/lib/capture-error';

type OutcomeValue = 'approved' | 'denied' | 'rfe' | 'withdrawal' | 'pending' | 'unknown';

interface OutcomeBody {
  applicationId: string;
  outcome: OutcomeValue;
  outcomeDate?: string;           // ISO date YYYY-MM-DD
  consulate?: string;
  processingDays?: number;
  denialCodes?: string[];         // D-01…D-15
  officerProbes?: string[];       // questions the officer focused on
  decisiveDimensions?: string[];  // which dimensions drove the decision
  officerNotes?: string;
  consentGiven?: boolean;
}

async function getAuthUser(request: Request) {
  const supabase = serviceClient();
  const token = (request.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

// POST — upsert outcome
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  let body: OutcomeBody;
  try {
    body = await request.json() as OutcomeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { applicationId, outcome } = body;
  if (!applicationId || !outcome) {
    return NextResponse.json({ error: 'applicationId and outcome required' }, { status: 400 });
  }

  const supabase = serviceClient();

  // Verify ownership
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single();
  if (!app) return new NextResponse('Not found', { status: 404 });

  const row = {
    application_id:      applicationId,
    user_id:             user.id,
    outcome,
    outcome_date:        body.outcomeDate ?? null,
    consulate:           body.consulate ?? null,
    processing_days:     body.processingDays ?? null,
    denial_codes:        body.denialCodes ?? [],
    officer_probes:      body.officerProbes ?? [],
    decisive_dimensions: body.decisiveDimensions ?? [],
    officer_notes:       body.officerNotes ?? null,
    consent_given:       body.consentGiven ?? false,
  };

  const { data, error } = await supabase
    .from('application_outcomes')
    .upsert(row, { onConflict: 'application_id' })
    .select('id, outcome, consent_given')
    .single();

  if (error) {
    captureApiError(error, { route: 'dashboard/outcome', userId: user.id, applicationId });
    return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 });
  }

  return NextResponse.json({ recorded: true, id: data.id, outcome: data.outcome, consentGiven: data.consent_given });
}

// GET — fetch current outcome
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('applicationId');
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 });

  const supabase = serviceClient();

  // Verify ownership
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single();
  if (!app) return new NextResponse('Not found', { status: 404 });

  const { data } = await supabase
    .from('application_outcomes')
    .select('id, application_id, user_id, created_at, updated_at, outcome, outcome_date, consulate, processing_days, denial_codes, officer_probes, decisive_dimensions, officer_notes, consent_given, anonymized_at')
    .eq('application_id', applicationId)
    .maybeSingle();

  return NextResponse.json({ outcome: data ?? null });
}
