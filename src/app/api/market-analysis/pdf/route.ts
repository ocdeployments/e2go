import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyseTeritoryForBusiness } from '@/lib/fdd-territory-engine';
import { buildMarketAnalysisPdf } from '@/lib/market-analysis-pdf';
import { captureApiError } from '@/lib/capture-error';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const applicationId = req.nextUrl.searchParams.get('applicationId');
  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
  }

  const { data: rows } = await supabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId)
    .in('question_key', ['QMA-BUSINESS-NAME', 'QMA-BUSINESS-CATEGORY', 'QMA-ZIP', 'QMA-STATE']);

  const byKey = new Map((rows ?? []).map(r => [r.question_key, r.answer_value]));
  const businessName = byKey.get('QMA-BUSINESS-NAME');
  const businessCategory = byKey.get('QMA-BUSINESS-CATEGORY');
  const zip = byKey.get('QMA-ZIP');
  const state = byKey.get('QMA-STATE');

  if (!businessName || !businessCategory || !zip || !state) {
    return NextResponse.json({ error: 'no_analysis_generated' }, { status: 404 });
  }

  try {
    const analysis = await analyseTeritoryForBusiness(zip, state.toUpperCase(), businessName, businessCategory);
    const pdfBytes = await buildMarketAnalysisPdf(analysis);
    const fileName = `Market-Analysis-${zip}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    captureApiError(err, { route: 'market-analysis/pdf', userId: user.id });
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { businessName?: string; businessCategory?: string; zip?: string; state?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { businessName, businessCategory, zip, state } = body;
  if (!businessName || !businessCategory || !zip || !state) {
    return NextResponse.json({ error: 'businessName, businessCategory, zip, and state are required' }, { status: 400 });
  }

  try {
    const analysis = await analyseTeritoryForBusiness(zip, state.toUpperCase(), businessName, businessCategory);
    const pdfBytes = await buildMarketAnalysisPdf(analysis);
    const fileName = `Market-Analysis-${zip}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    captureApiError(err, { route: 'market-analysis/pdf', userId: user.id });
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
