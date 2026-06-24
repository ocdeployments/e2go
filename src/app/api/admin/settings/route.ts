import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = ['kill_switch_enabled', 'maintenance_mode', 'kill_switch_message'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

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

export async function GET() {
  const admin = getAdmin();
  const { data } = await admin.from('app_settings').select('key, value').in('key', ALLOWED_KEYS);
  return NextResponse.json(Object.fromEntries((data ?? []).map(r => [r.key, r.value])));
}

export async function POST(request: NextRequest) {
  const adminId = await getRequestingAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json() as Record<string, string>;

  const admin = getAdmin();
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as AllowedKey)) continue;
    await admin
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
  }

  // Audit log
  await admin.from('admin_audit_log').insert({
    admin_user_id: adminId,
    action:        'settings_update',
    resource:      'app_settings',
    details:       body,
  });

  return NextResponse.json({ ok: true, updated: Object.keys(body) });
}
