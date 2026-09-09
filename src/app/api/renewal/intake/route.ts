import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';

// GET /api/renewal/intake — load or create renewal intake for the authed user
export async function GET() {
  const auth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();

  // Verify user has paid for renewal
  const { data: payment } = await svc
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', 'renewal')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'Renewal not purchased' }, { status: 403 });
  }

  // Load existing intake
  const { data: intake } = await svc
    .from('renewal_intakes')
    .select('id, path, answers, status, application_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (intake) {
    return NextResponse.json({ intake });
  }

  // No intake yet — find the most recent paid application to link as baseline
  const { data: app } = await svc
    .from('applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Create a fresh intake
  const { data: newIntake, error: createError } = await svc
    .from('renewal_intakes')
    .insert({
      user_id: user.id,
      application_id: app?.id ?? null,
      answers: {},
      status: 'draft',
    })
    .select('id, path, answers, status, application_id')
    .single();

  if (createError || !newIntake) {
    return NextResponse.json({ error: 'Failed to create intake' }, { status: 500 });
  }

  return NextResponse.json({ intake: newIntake });
}

// PATCH /api/renewal/intake — save answers and/or path selection
export async function PATCH(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    intakeId: string;
    path?: string;
    answers?: Record<string, string>;
    status?: string;
  };

  const { intakeId, path, answers, status } = body;
  if (!intakeId) {
    return NextResponse.json({ error: 'Missing intakeId' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Verify ownership
  const { data: existing } = await svc
    .from('renewal_intakes')
    .select('id, answers')
    .eq('id', intakeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (path !== undefined) updates.path = path;
  if (status !== undefined) updates.status = status;
  if (answers !== undefined) {
    // Merge new answers on top of existing — never wipe prior answers
    updates.answers = { ...(existing.answers as Record<string, string>), ...answers };
  }

  const { error: updateError } = await svc
    .from('renewal_intakes')
    .update(updates)
    .eq('id', intakeId)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
