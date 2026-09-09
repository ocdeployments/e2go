import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runCanonicalConsistencySweep } from '@/lib/cic-consistency-sweep';
import { captureApiError } from '@/lib/capture-error';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return new NextResponse('Unauthorized', { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('applicationId');
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 });

  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single();

  if (!app) return new NextResponse('Not found', { status: 404 });

  try {
    const result = await runCanonicalConsistencySweep(applicationId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    captureApiError(err, { route: 'dashboard/consistency-sweep', userId: user.id, applicationId });
    return NextResponse.json({ error: 'Failed to run consistency sweep' }, { status: 500 });
  }
}
