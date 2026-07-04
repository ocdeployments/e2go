import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';

// P2-* answer keys stored in the answers table for the partnership investor 2 intake
const P2_KEYS = [
  'P2-NAME', 'P2-NATIONALITY', 'P2-SHARES', 'P2-INVEST',
  'P2-ROLE', 'P2-SOF', 'P2-QUALS', 'P2-INTENT',
] as const;

/**
 * Resolves the co-investor's family_members.id for this application, creating the row
 * (and backfilling any pre-existing NULL-scoped P2-* answers onto it) if it doesn't exist yet.
 * `prefill` supplies P2-NAME/P2-NATIONALITY when creating from a fresh PATCH with no prior data.
 */
async function ensureCoInvestorId(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  applicationId: string,
  prefill?: Record<string, string>,
): Promise<string | null> {
  const { data: existing } = await svc
    .from('family_members')
    .select('id')
    .eq('user_id', userId)
    .eq('member_type', 'co_investor')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: legacyRows } = await svc
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .is('family_member_id', null)
    .in('question_key', P2_KEYS as unknown as string[]);

  const nameSource = legacyRows?.find((r) => r.question_key === 'P2-NAME')?.answer_value
    ?? prefill?.['P2-NAME'];
  const nationalitySource = legacyRows?.find((r) => r.question_key === 'P2-NATIONALITY')?.answer_value
    ?? prefill?.['P2-NATIONALITY'];

  if (!nameSource && (!legacyRows || legacyRows.length === 0)) return null;

  const [firstName, ...rest] = (nameSource ?? '').toString().trim().split(' ');

  const { data: created } = await svc
    .from('family_members')
    .insert({
      user_id: userId,
      member_type: 'co_investor',
      first_name: firstName || null,
      last_name: rest.join(' ') || null,
      nationality: nationalitySource ?? null,
    })
    .select('id')
    .single();

  if (!created) return null;

  if (legacyRows && legacyRows.length > 0) {
    await svc
      .from('answers')
      .update({ family_member_id: created.id })
      .eq('application_id', applicationId)
      .is('family_member_id', null)
      .in('question_key', P2_KEYS as unknown as string[]);
  }

  return created.id;
}

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

  const coInvestorId = await ensureCoInvestorId(svc, user.id, applicationId);

  // Load P2-* answers, scoped to the co-investor's family_member_id (falls back to NULL if none exists yet)
  let query = svc
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .in('question_key', P2_KEYS as unknown as string[]);
  query = coInvestorId ? query.eq('family_member_id', coInvestorId) : query.is('family_member_id', null);
  const { data: rows } = await query;

  const answers: Record<string, string> = {};
  for (const row of (rows ?? [])) {
    const r = row as Record<string, string>;
    if (r.question_key && r.answer_value) answers[r.question_key] = r.answer_value;
  }

  return NextResponse.json({ answers });
}

// PATCH /api/partner2/intake
// Upserts one or more P2-* answers for the application, scoped to the co-investor's family_member_id.
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

  const coInvestorId = await ensureCoInvestorId(svc, user.id, applicationId, answers);

  // Only save allowed P2 keys — reject any other keys
  const allowedKeys = new Set<string>(P2_KEYS);
  const upsertRows = Object.entries(answers)
    .filter(([key]) => allowedKeys.has(key))
    .map(([key, value]) => ({
      application_id: applicationId,
      user_id: user.id,
      question_key: key,
      answer_value: value,
      family_member_id: coInvestorId,
    }));

  if (upsertRows.length === 0) {
    return NextResponse.json({ saved: 0 });
  }

  await svc
    .from('answers')
    .upsert(upsertRows, { onConflict: 'application_id,question_key,family_member_id' });

  return NextResponse.json({ saved: upsertRows.length });
}
