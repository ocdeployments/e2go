import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/generate/acknowledge
 *
 * Records the applicant's pre-download acknowledgment.
 * All 5 checkboxes must be checked before documents can be released.
 *
 * Body: { application_id: string }
 *
 * The 5 acknowledgments (exact copy from Spec4):
 * 1. I have reviewed these documents for accuracy. All facts, figures, dates, and names are correct to the best of my knowledge.
 * 2. I understand that these documents were prepared using e2go.app, a document preparation service. e2go.app is not a law firm and has not provided legal advice.
 * 3. I understand that submitting false or misleading information to a U.S. government agency may constitute a federal offense.
 * 4. I am aware that my visa application will be assessed by a consular officer based on these documents and my interview. No outcome is guaranteed.
 * 5. I recommend — and e2go.app strongly encourages — that I have these documents reviewed by a licensed U.S. immigration attorney before submission.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return NextResponse.json(
        { error: 'application_id is required' },
        { status: 400 }
      );
    }

    // Service role client for data operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Authenticate via cookie — parse cookies from request header
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieMap = new Map<string, string>();
    for (const part of cookieHeader.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name) cookieMap.set(name, rest.join('='));
    }

    // Extract the auth token from cookies
    const accessToken = cookieMap.get('sb-access-token') || cookieMap.get('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^.]+)/)?.[1] + '-auth-token') || '';

    // Verify user via the access token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the application belongs to this user
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, user_id')
      .eq('id', application_id)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (app.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Record acknowledgment in pipeline_log
    const now = new Date().toISOString();

    // Update all pipeline_log entries for this application
    const { error: updateError } = await supabase
      .from('generation_pipeline_log')
      .update({
        applicant_acknowledged: true,
        acknowledged_at: now,
        released_at: now,
        final_status: 'RELEASED',
      })
      .eq('application_id', application_id)
      .eq('applicant_acknowledged', false);

    if (updateError) {
      console.error('[ACKNOWLEDGE] Failed to update pipeline_log:', updateError);
      // Non-fatal — continue with download
    }

    // Also log to document_generation_log for backwards compatibility
    const { data: docs } = await supabase
      .from('generated_documents')
      .select('document_type')
      .eq('application_id', application_id);

    if (docs) {
      for (const doc of docs) {
        await supabase
          .from('document_generation_log')
          .insert({
            application_id,
            document_type: doc.document_type,
            stage: 'acknowledgment_confirmed',
            attempt_number: 1,
            passed: true,
            flagged_sections: [],
            notes: `Applicant acknowledged all 5 pre-download confirmations at ${now}.`,
          });
      }
    }

    return NextResponse.json({
      ok: true,
      acknowledged_at: now,
    });
  } catch (err) {
    console.error('[ACKNOWLEDGE] Error:', err);
    return NextResponse.json(
      { error: 'Failed to record acknowledgment' },
      { status: 500 }
    );
  }
}
