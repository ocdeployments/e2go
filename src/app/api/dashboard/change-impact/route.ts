/**
 * GET /api/dashboard/change-impact?applicationId=
 *
 * Returns the latest CIC-P.5 change impact report for this application.
 * The report is computed whenever a new document is uploaded and the
 * Case Theory re-reasons with materially different dimension verdicts.
 *
 * The client UI uses this to show a targeted notice:
 * "Your new FDD changed 2 dimensions. These documents may need regeneration: ..."
 *
 * Returns null when no impact report exists (no new doc uploaded since last
 * generation run, or no material verdict change detected).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const { data: theory } = await supabase
    .from('case_theory')
    .select('impact_report')
    .eq('application_id', applicationId)
    .maybeSingle();

  return NextResponse.json({ impactReport: theory?.impact_report ?? null });
}

/**
 * DELETE /api/dashboard/change-impact?applicationId=
 *
 * Dismisses the impact report after the client has reviewed it
 * (they've decided to regenerate or chosen to keep their current docs).
 */
export async function DELETE(request: Request) {
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

  await supabase
    .from('case_theory')
    .update({ impact_report: null })
    .eq('application_id', applicationId);

  return NextResponse.json({ dismissed: true });
}
