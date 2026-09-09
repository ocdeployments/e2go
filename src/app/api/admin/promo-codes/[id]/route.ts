import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type RequireAdminResult =
  | { user: { id: string }; error: null }
  | { user: null; error: NextResponse };

async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user, error: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const admin = getAdmin();

  let body: { active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active (boolean) is required' }, { status: 400 });
  }

  const { data: existing } = await admin.from('promo_codes').select('id, code').eq('id', id).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  const { error: updateErr } = await admin.from('promo_codes').update({ active: body.active }).eq('id', id);
  if (updateErr) {
    captureApiError(updateErr, { route: 'admin/promo-codes/[id]', stage: 'update-active', userId: user.id, promoCodeId: id });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: body.active ? 'activate_promo_code' : 'deactivate_promo_code',
    resource: 'promo_codes',
    resource_id: id,
    details: { code: existing.code },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}
