import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { targetUserId: string; flagged: boolean; reason?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { targetUserId, flagged, reason } = body;
  if (!targetUserId || typeof flagged !== 'boolean') {
    return NextResponse.json({ error: 'targetUserId and flagged (boolean) required' }, { status: 400 });
  }

  const updates = flagged
    ? { flagged_at: new Date().toISOString(), flag_reason: reason?.trim() ?? 'Flagged for review' }
    : { flagged_at: null, flag_reason: null };

  const { error: updateErr } = await admin.from('profiles').update(updates).eq('id', targetUserId);
  if (updateErr) {
    console.error('[admin/flag-user] Update error:', updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: flagged ? 'flag_user' : 'unflag_user',
    target_user_id: targetUserId,
    resource: 'profiles',
    details: { reason: reason ?? null },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}
