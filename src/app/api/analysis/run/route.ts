import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisEngine } from '@/lib/analysis-engine';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify caller identity via session cookie — never trust userId from request body
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    // Use service role to fetch application, but verify ownership against session user
    const supabase = getServiceSupabase();
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Run Engine with verified userId from session (not from body)
    const caseBrief = await runAnalysisEngine(applicationId, user.id);

    await supabase
      .from('case_briefs')
      .insert({
        application_id: applicationId,
        user_id: user.id,
        substantiality_score: caseBrief.substantiality_score,
        marginality_income_score: caseBrief.marginality.income_score,
        marginality_contribution_score: caseBrief.marginality.contribution_score,
        intent_score: caseBrief.intent_score,
        case_brief_json: caseBrief,
        status: 'complete',
      });

    return NextResponse.json(caseBrief);
  } catch (error) {
    captureApiError(error, { route: 'analysis/run' });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
