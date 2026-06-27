import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { validateForGeneration } from '@/lib/pre-generation-validation';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Verify application belongs to user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, user_id, business_name')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all answers for this application
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', applicationId);

    if (answersError) {
      console.error('Answers fetch error:', answersError);
      return NextResponse.json({ error: 'Failed to load answers' }, { status: 500 });
    }

    // Build answers map
    const answersMap: Record<string, unknown> = {};
    if (answers) {
      for (const row of answers) {
        answersMap[row.question_key] = row.answer_value;
      }
    }

    // Fetch latest case brief for business type fallback
    const { data: caseBrief } = await supabase
      .from('case_briefs')
      .select('case_brief_json')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const caseBriefData = caseBrief?.case_brief_json
      ? (typeof caseBrief.case_brief_json === 'string'
          ? JSON.parse(caseBrief.case_brief_json)
          : caseBrief.case_brief_json)
      : null;

    // Run validation
    const result = validateForGeneration(answersMap, caseBriefData);

    return NextResponse.json({
      applicationId,
      businessName: application.business_name,
      validation: result,
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
