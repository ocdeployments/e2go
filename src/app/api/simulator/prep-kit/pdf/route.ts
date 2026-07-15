import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { rankApplications } from '@/lib/resolve-application';
import { buildDossierPdf, PrepKit } from '@/lib/dossier-pdf';

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: allApps } = await supabase
    .from('applications')
    .select('id, source, payment_status, created_at, simulator_sessions_purchased')
    .eq('user_id', user.id);

  const totalPurchased = (allApps ?? []).reduce(
    (s: number, a: { simulator_sessions_purchased: number | null }) => s + (a.simulator_sessions_purchased ?? 0),
    0
  );
  if (totalPurchased === 0) {
    return NextResponse.json({ error: 'simulator_not_purchased' }, { status: 403 });
  }

  const primaryAppId = rankApplications(allApps ?? [])?.id ?? null;
  if (!primaryAppId) {
    return NextResponse.json({ error: 'no_application' }, { status: 404 });
  }

  const { data: cached } = await supabase
    .from('interview_prep_kits')
    .select('kit_json')
    .eq('application_id', primaryAppId)
    .maybeSingle();

  if (!cached?.kit_json) {
    return NextResponse.json({ error: 'no_dossier_generated' }, { status: 404 });
  }

  const kit = cached.kit_json as PrepKit;
  const pdfBytes = await buildDossierPdf(kit);

  const fileName = `Interview-Dossier-${kit.clientName.replace(/[^a-z0-9]+/gi, '-')}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
