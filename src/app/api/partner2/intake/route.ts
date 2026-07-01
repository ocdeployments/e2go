import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';

// P2-* answer keys stored in the answers table for the partnership investor 2 intake
const P2_KEYS = [
  'P2-NAME', 'P2-NATIONALITY', 'P2-SHARES', 'P2-INVEST',
  'P2-ROLE', 'P2-SOF', 'P2-QUALS', 'P2-INTENT',
] as const;

// GET /api/partner2/intake?applicationId=...
// Returns current P2 answers for the application (empty map if none yet).
export async function GET(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('applicationId');
  if (!applicationId) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Verify payment
  const { data: payment } = await svc
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', 'complete_partnership')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'Partnership package not purchased' }, { status: 403 });
  }

  // Verify application ownership
  const { data: app } = await svc
    .from('applications')
    .select('id, user_id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // Load P2-* answers
  const { data: rows } = await svc
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .in('question_key', P2_KEYS as unknown as string[]);

  const answers: Record<string, string> = {};
  for (const row of (rows ?? [])) {
    const r = row as Record<string, string>;
    if (r.question_key && r.answer_value) answers[r.question_key] = r.answer_value;
  }

  return NextResponse.json({ answers });
}

// PATCH /api/partner2/intake
// Upserts one or more P2-* answers for the application.
// Body: { applicationId: string; answers: Record<string, string> }
export async function PATCH(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { applicationId: string; answers: Record<string, string> };
  const { applicationId, answers } = body;

  if (!applicationId || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing applicationId or answers' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Verify payment
  const { data: payment } = await svc
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', 'complete_partnership')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'Partnership package not purchased' }, { status: 403 });
  }

  // Verify application ownership
  const { data: app } = await svc
    .from('applications')
    .select('id, user_id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // Only save allowed P2 keys — reject any other keys
  const allowedKeys = new Set<string>(P2_KEYS);
  const upsertRows = Object.entries(answers)
    .filter(([key]) => allowedKeys.has(key))
    .map(([key, value]) => ({
      application_id: applicationId,
      user_id: user.id,
      question_key: key,
      answer_value: value,
    }));

  if (upsertRows.length === 0) {
    return NextResponse.json({ saved: 0 });
  }

  await svc
    .from('answers')
    .upsert(upsertRows, { onConflict: 'application_id,question_key' });

  return NextResponse.json({ saved: upsertRows.length });
}
