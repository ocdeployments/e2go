import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';

// GET /api/renewal/baseline?applicationId=xxx
// Returns projection data from the original application for Template 6 pre-population.
// Scoped to the authenticated user — cannot read another user's baseline.
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

  // Verify ownership
  const { data: app } = await svc
    .from('applications')
    .select('id, user_id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch the projection blob + employee counts from original application answers
  const { data: rows } = await svc
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .in('question_key', ['M3-I-PROJECTIONS', 'M3-I-05', 'M3-I-06', 'QI-05', 'QI-06', 'QI-02', 'QI-03']);

  const answerMap: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row.answer_value) answerMap[row.question_key] = row.answer_value;
  }

  // Parse projections blob
  let projections: Array<{ year: number; revenue: string; netIncome: string; employees: string }> = [];
  const raw = answerMap['M3-I-PROJECTIONS'];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) projections = parsed;
    } catch { /* ignore */ }
  }

  return NextResponse.json({ projections, answers: answerMap });
}
