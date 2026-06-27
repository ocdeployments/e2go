import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      applicationId,
      breakdown,
      fundSources,
      edits,
      discrepancyPrompted,
      discrepancyResolution,
    } = body;

    if (!applicationId || !breakdown || !fundSources) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify application belongs to user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the most recent case brief timestamp for this application
    const { data: caseBrief } = await supabase
      .from('case_briefs')
      .select('created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Insert confirmation record
    const { data, error: insertError } = await supabase
      .from('pre_generation_confirmation')
      .insert({
        application_id: applicationId,
        user_id: user.id,
        case_brief_generated_at: caseBrief?.created_at ?? null,
        shown_breakdown_json: breakdown,
        shown_fund_sources_json: fundSources,
        edits_made: edits ?? [],
        discrepancy_prompted: discrepancyPrompted ?? false,
        discrepancy_resolution: discrepancyResolution ?? null,
        confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Confirmation insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record confirmation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      confirmed: true,
      confirmationId: data.id,
    });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Confirmation failed' },
      { status: 500 }
    );
  }
}
