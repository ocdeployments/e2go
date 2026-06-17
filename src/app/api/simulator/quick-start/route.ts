import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/simulator/quick-start — Create a minimal application for standalone simulator
// Body: { businessCategory, applicantName?, treatyCountry?, businessType?,
//         investmentAmount?, jobsYear1?, targetConsulate? }
// Returns: { applicationId }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessCategory,
      applicantName,
      treatyCountry,
      businessType,
      investmentAmount,
      jobsYear1,
      targetConsulate,
    } = body;

    if (!businessCategory) {
      return NextResponse.json(
        { error: 'Business category is required' },
        { status: 400 }
      );
    }

    // Create a minimal application row marked as simulator_standalone
    const { data: app, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        source: 'simulator_standalone',
        status: 'in_progress',
        payment_status: 'unpaid',
        principal_name: applicantName || null,
        simulator_sessions_used: 0,
        simulator_sessions_purchased: 2,
      })
      .select('id')
      .maybeSingle();

    if (appError || !app) {
      console.error('Failed to create quick-start application:', appError);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Build answers to upsert — all the intake fields the simulator engine needs
    const answersToSave: Array<{ application_id: string; question_key: string; answer_value: string; answered_at: string }> = [];

    const now = new Date().toISOString();

    // Business category → Q0-10 (used by simulator engine's category fallback)
    answersToSave.push({
      application_id: app.id,
      question_key: 'Q0-10',
      answer_value: businessCategory,
      answered_at: now,
    });

    // Treaty country → Q0-TC (used by interview-prep to personalise questions)
    if (treatyCountry) {
      answersToSave.push({
        application_id: app.id,
        question_key: 'Q0-TC',
        answer_value: treatyCountry,
        answered_at: now,
      });
    }

    // Business type: new / franchise / acquisition → Q0-BT
    if (businessType) {
      answersToSave.push({
        application_id: app.id,
        question_key: 'Q0-BT',
        answer_value: businessType,
        answered_at: now,
      });
    }

    // Investment amount estimate → QF-02 (same key the confirm step uses;
    // document extraction may overwrite this with a more precise value)
    if (investmentAmount != null && investmentAmount !== '') {
      answersToSave.push({
        application_id: app.id,
        question_key: 'QF-02',
        answer_value: String(investmentAmount),
        answered_at: now,
      });
    }

    // Jobs year 1 → QI-03 (same key the confirm step uses)
    if (jobsYear1 != null && jobsYear1 !== '') {
      answersToSave.push({
        application_id: app.id,
        question_key: 'QI-03',
        answer_value: String(jobsYear1),
        answered_at: now,
      });
    }

    // Target consulate → Q0-CO (previously collected but never saved)
    if (targetConsulate) {
      answersToSave.push({
        application_id: app.id,
        question_key: 'Q0-CO',
        answer_value: targetConsulate,
        answered_at: now,
      });
    }

    if (answersToSave.length > 0) {
      await supabase
        .from('answers')
        .upsert(answersToSave, { onConflict: 'application_id,question_key' });
    }

    return NextResponse.json({ applicationId: app.id });
  } catch (error) {
    console.error('Quick-start error:', error);
    return NextResponse.json({ error: 'Quick-start failed' }, { status: 500 });
  }
}
