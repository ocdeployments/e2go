import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { buildFddPdf } from '@/lib/fdd-pdf';
import type { FddProfessionalReport } from '@/lib/fdd-report-engine';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fddId = request.nextUrl.searchParams.get('fdd_id');
  if (!fddId) {
    return NextResponse.json({ error: 'fdd_id required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: analysis, error: fetchErr } = await service
    .from('fdd_analyses')
    .select('final_report')
    .eq('id', fddId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !analysis?.final_report) {
    return NextResponse.json({ error: 'no_report_generated' }, { status: 404 });
  }

  const report = analysis.final_report as unknown as FddProfessionalReport;
  const pdfBytes = await buildFddPdf(report);
  const fileName = `FDD-Analysis-${report.franchise_name.replace(/[^a-z0-9]+/gi, '-')}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
