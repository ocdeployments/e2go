import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

function getSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    const { applicationId } = params;

    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify user owns this application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Fetch latest case brief
    const { data: brief, error: briefError } = await supabase
      .from('case_briefs')
      .select('id, application_id, user_id, created_at, updated_at, substantiality_score, fund_source_score, experience_score, marginality_income_score, marginality_contribution_score, intent_score, executive_role_score, ownership_control_score, denial_risks, kb_validation, framing_decisions, case_brief_json, status')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (briefError || !brief) {
      return NextResponse.json(
        { error: 'No case brief found for this application' },
        { status: 404 }
      );
    }

    /**
     * Business category comes from the quiz, which is keyed on the person
     * rather than the application — a quiz can be taken before an application
     * exists, so there is no application_id to join on. Missing is a normal
     * state here (someone can reach a case brief without having taken the
     * quiz), so this is maybeSingle and a null result is not an error.
     */
    const { data: quizSession, error: quizError } = await supabase
      .from('quiz_sessions')
      .select('business_type')
      .eq('user_id', application.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (quizError) {
      captureApiError(quizError, { route: 'generate/case-brief', stage: 'quiz-business-type' });
    }

    return NextResponse.json({
      caseBrief: brief,
      businessCategory: quizSession?.business_type || null,
    });
  } catch (error) {
    captureApiError(error, { route: 'generate/case-brief' });
    return NextResponse.json(
      { error: 'Failed to fetch case brief' },
      { status: 500 }
    );
  }
}
