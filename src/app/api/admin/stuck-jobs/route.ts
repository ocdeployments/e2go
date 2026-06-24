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

// POST — force-fail a specific stuck generation job
export async function POST(request: NextRequest) {
  const adminId = await getRequestingAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { jobId } = await request.json() as { jobId: string };
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const admin = getAdmin();

  const { error } = await admin
    .from('document_generation_jobs')
    .update({ status: 'failed', current_step_label: 'Manually stopped by admin' })
    .eq('id', jobId)
    .eq('status', 'running');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('admin_audit_log').insert({
    admin_user_id: adminId,
    action:        'force_fail_job',
    resource:      'document_generation_jobs',
    resource_id:   jobId,
  });

  return NextResponse.json({ ok: true });
}
