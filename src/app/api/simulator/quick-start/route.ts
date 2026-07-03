import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/simulator/quick-start
// Body: { businessCategory, applicantName?, treatyCountry?, businessType?,
//         investmentAmount?, jobsYear1?, targetConsulate?, existingApplicationId? }
// Returns: { applicationId }
//
// If existingApplicationId is provided the existing application is updated
// (answers upserted, principal_name refreshed) instead of a new row being created.
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
      existingApplicationId,
    } = body;

    if (!businessCategory) {
      return NextResponse.json(
        { error: 'Business category is required' },
        { status: 400 }
      );
    }

    let appId: string;

    if (existingApplicationId) {
      // Verify ownership
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('id', existingApplicationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      appId = existingApplicationId;

      // Update principal_name if provided
      if (applicantName) {
        await supabase
          .from('applications')
          .update({ principal_name: applicantName })
          .eq('id', appId);
      }
    } else {
      // Create a new simulator_standalone application
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

      appId = app.id;
    }

    // Build answers to upsert
    const now = new Date().toISOString();
    const answersToSave: Array<{
      application_id: string;
      question_key: string;
      answer_value: string;
      answered_at: string;
    }> = [];

    answersToSave.push({
      application_id: appId,
      question_key: 'Q0-10',
      answer_value: businessCategory,
      answered_at: now,
    });

    if (treatyCountry) {
      answersToSave.push({ application_id: appId, question_key: 'Q0-TC', answer_value: treatyCountry, answered_at: now });
    }
    if (businessType) {
      answersToSave.push({ application_id: appId, question_key: 'Q0-BT', answer_value: businessType, answered_at: now });
    }
    if (investmentAmount != null && investmentAmount !== '') {
      answersToSave.push({ application_id: appId, question_key: 'QF-02', answer_value: String(investmentAmount), answered_at: now });
    }
    if (jobsYear1 != null && jobsYear1 !== '') {
      answersToSave.push({ application_id: appId, question_key: 'QI-03', answer_value: String(jobsYear1), answered_at: now });
    }
    if (targetConsulate) {
      answersToSave.push({ application_id: appId, question_key: 'Q0-CO', answer_value: targetConsulate, answered_at: now });
    }

    if (answersToSave.length > 0) {
      await supabase
        .from('answers')
        .upsert(answersToSave, { onConflict: 'application_id,question_key,family_member_id' });
    }

    return NextResponse.json({ applicationId: appId });
  } catch (error) {
    console.error('Quick-start error:', error);
    return NextResponse.json({ error: 'Quick-start failed' }, { status: 500 });
  }
}
