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
    //   user_id, source, status, payment_status, principal_name,
    //   simulator_sessions_used, simulator_sessions_purchased
    // business_category and target_state do NOT exist on applications —
    // the simulator engine falls back to answers map for those values.
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

    return NextResponse.json({ applicationId: app.id });
  } catch (error) {
    console.error('Quick-start error:', error);
    return NextResponse.json({ error: 'Quick-start failed' }, { status: 500 });
  }
}
