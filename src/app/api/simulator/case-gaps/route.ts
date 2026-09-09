import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildSimulatorContext } from '@/lib/simulator-engine';
import { buildGapFields, hasRequiredGaps, GAP_FIELD_WRITE_TARGETS } from '@/lib/simulator-gaps';
import { captureApiError } from '@/lib/capture-error';

// GET /api/simulator/case-gaps?applicationId=xxx — fields the simulator needs
// confirmed or filled in before a personalized, consistent interview can begin.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId parameter' }, { status: 400 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const context = await buildSimulatorContext(applicationId);
    const fields = buildGapFields(context);

    return NextResponse.json({
      fields,
      hasGaps: hasRequiredGaps(fields),
    });
  } catch (error) {
    captureApiError(error, { route: 'simulator/case-gaps', stage: 'get' });
    return NextResponse.json({ error: 'Failed to load case gaps' }, { status: 500 });
  }
}

// POST /api/simulator/case-gaps — save confirmed/filled-in values so the
// case file reflects the applicant's true current state before the interview.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { applicationId?: string; values?: Record<string, string> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { applicationId, values } = body;
    if (!applicationId || !values) {
      return NextResponse.json({ error: 'Missing applicationId or values' }, { status: 400 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const answerRows: { application_id: string; question_key: string; answer_value: string; user_id: string; answered_at: string; source: string }[] = [];
    const applicationUpdates: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(values)) {
      const target = GAP_FIELD_WRITE_TARGETS[key];
      if (!target) continue;

      const value = (rawValue ?? '').trim();
      if (!value) continue;

      if (target.table === 'answers') {
        answerRows.push({
          application_id: applicationId,
          question_key: target.questionKey,
          answer_value: value,
          user_id: user.id,
          answered_at: new Date().toISOString(),
          source: 'case_file_confirmation',
        });
      } else {
        applicationUpdates[target.column] = value;
      }
    }

    if (answerRows.length > 0) {
      const { error: answersError } = await supabase
        .from('answers')
        .upsert(answerRows, { onConflict: 'application_id,question_key,family_member_id' });

      if (answersError) {
        captureApiError(answersError, { route: 'simulator/case-gaps', stage: 'answers-upsert', userId: user.id, applicationId });
        return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
      }
    }

    if (Object.keys(applicationUpdates).length > 0) {
      const { error: appUpdateError } = await supabase
        .from('applications')
        .update(applicationUpdates)
        .eq('id', applicationId);

      if (appUpdateError) {
        captureApiError(appUpdateError, { route: 'simulator/case-gaps', stage: 'application-update', userId: user.id, applicationId });
        return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
      }
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    captureApiError(error, { route: 'simulator/case-gaps', stage: 'post' });
    return NextResponse.json({ error: 'Failed to save case gaps' }, { status: 500 });
  }
}
