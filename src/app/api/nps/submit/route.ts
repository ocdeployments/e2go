import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { captureApiError } from '@/lib/capture-error';

export const dynamic = 'force-dynamic';

const COOLDOWN_DAYS = 7;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { score: number; comment?: string; trigger_event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { score, comment, trigger_event } = body;

  if (typeof score !== 'number' || score < 0 || score > 10 || !Number.isInteger(score)) {
    return NextResponse.json({ error: 'score must be an integer 0–10' }, { status: 400 });
  }

  const admin = getServiceClient();

  // Rate limit: one submission per user per COOLDOWN_DAYS
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 3600000).toISOString();
  const { data: recent } = await admin
    .from('nps_scores')
    .select('id, created_at')
    .eq('user_id', user.id)
    .gte('created_at', cooldownCutoff)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json({ error: 'already_submitted', cooldown_days: COOLDOWN_DAYS }, { status: 429 });
  }

  const { error: insertError } = await admin.from('nps_scores').insert({
    user_id: user.id,
    score,
    comment: comment?.trim() || null,
    trigger_event: trigger_event || null,
  });

  if (insertError) {
    captureApiError(insertError, { route: 'nps/submit', userId: user.id });
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
