import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildCaseProfile } from '@/lib/case-profile';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    outcome: string;
    interviewDate?: string;
    consulate?: string;
    denialReason?: string;
    notes?: string;
    applicationId?: string;
    simulatorSessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const validOutcomes = ['approved', 'denied', 'pending', 'cancelled', 'rescheduled'];
  if (!body.outcome || !validOutcomes.includes(body.outcome)) {
    return NextResponse.json({ error: 'Invalid outcome value' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('simulator_outcomes')
    .insert({
      user_id: user.id,
      application_id: body.applicationId || null,
      simulator_session_id: body.simulatorSessionId || null,
      outcome: body.outcome,
      interview_date: body.interviewDate || null,
      consulate: body.consulate || null,
      denial_reason: body.denialReason || null,
      notes: body.notes || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[simulator-outcome] Insert failed:', error);
    return NextResponse.json({ error: 'Failed to save outcome' }, { status: 500 });
  }

  // Trigger profile rebuild fire-and-forget (simulator session adds data confidence)
  buildCaseProfile(user.id).catch(() => {});

  return NextResponse.json({ id: data.id });
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const applicationId = url.searchParams.get('applicationId');

  const query = supabase
    .from('simulator_outcomes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (applicationId) query.eq('application_id', applicationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch outcomes' }, { status: 500 });

  return NextResponse.json({ outcomes: data || [] });
}
