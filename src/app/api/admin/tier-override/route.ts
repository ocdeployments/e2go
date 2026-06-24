import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getRequestingAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user.id : null;
}

export async function POST(request: NextRequest) {
  const adminId = await getRequestingAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json() as { targetUserId: string; tier: string; note?: string };
  const { targetUserId, tier, note } = body;

  if (!targetUserId || !tier) {
    return NextResponse.json({ error: 'targetUserId and tier required' }, { status: 400 });
  }

  const admin = getAdmin();

  // Insert manual payment record
  const { error: paymentErr } = await admin.from('payments').insert({
    user_id:      targetUserId,
    tier,
    status:       'completed',
    amount_cents: 0,
    metadata:     { manual_override: true, admin_user_id: adminId, note: note ?? 'Manual tier override' },
  });

  if (paymentErr) {
    return NextResponse.json({ error: paymentErr.message }, { status: 500 });
  }

  // Audit log
  await admin.from('admin_audit_log').insert({
    admin_user_id:  adminId,
    action:         'tier_override',
    target_user_id: targetUserId,
    resource:       'payments',
    details:        { tier, note },
  });

  return NextResponse.json({ ok: true, tier });
}
