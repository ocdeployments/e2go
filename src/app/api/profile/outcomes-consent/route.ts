import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { consent: boolean };
  const consent = typeof body.consent === 'boolean' ? body.consent : false;

  const admin = getAdmin();
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      outcomes_consent: consent,
      outcomes_consent_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET — fetch current consent status for the banner
export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  const { data } = await admin
    .from('profiles')
    .select('outcomes_consent')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ outcomes_consent: data?.outcomes_consent ?? null });
}
