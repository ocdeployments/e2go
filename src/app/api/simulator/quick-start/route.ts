import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/simulator/quick-start — Create a minimal application for standalone simulator
// Body: { businessCategory, applicantName? }
// Returns: { applicationId }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessCategory, applicantName } = body;

    if (!businessCategory) {
      return NextResponse.json(
        { error: 'Business category is required' },
        { status: 400 }
      );
    }

    // Create a minimal application row marked as simulator_standalone
    // Only insert columns confirmed in the applications table schema:
    //   id, user_id, principal_name, business_name, application_type, tier,
    //   status, payment_status, simulator_sessions_used,
    //   simulator_sessions_purchased, source, created_at, etc.
    // NOTE: business_category, target_state, business_route, operational_status
    // do NOT exist on applications. Simulator engine falls back to answers map.
    const { data: app, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        source: 'simulator_standalone',
        status: 'in_progress',
        payment_status: 'free',
        principal_name: applicantName || null,
        // Give standalone users 2 free simulator sessions
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

    // Save business category as answer so simulator engine's fallback chain
    // picks it up via answersMap.get('Q0-10') — since applications has no
    // business_category column.
    await supabase
      .from('answers')
      .upsert({
        application_id: app.id,
        user_id: user.id,
        question_key: 'Q0-10',
        answer_value: businessCategory,
        source: 'quick_start_form',
        answered_at: new Date().toISOString(),
      }, { onConflict: 'application_id,question_key' });

    return NextResponse.json({ applicationId: app.id });
  } catch (error) {
    console.error('Quick-start error:', error);
    return NextResponse.json({ error: 'Quick-start failed' }, { status: 500 });
  }
}
