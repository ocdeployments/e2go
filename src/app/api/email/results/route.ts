import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendResultsEmail } from '@/lib/emails/results-email';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json();
  const { quiz_session_id } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── Path A: authenticated user (logged-in dashboard flow) ──
  let email: string;
  let outcome: string;
  let result_json: Record<string, unknown>;
  let franchise_interest: boolean;

  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (user) {
    // Authenticated — trust the request body
    email = body.email;
    outcome = body.outcome;
    result_json = body.result_json;
    franchise_interest = body.franchise_interest ?? false;
  } else {
    // ── Path B: anonymous quiz-completion flow ──
    // Validate quiz_session_id: must be valid UUID, exist in DB, and be fresh
    if (!quiz_session_id || !UUID_RE.test(quiz_session_id)) {
      return NextResponse.json({ error: 'Missing or invalid quiz_session_id' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, email, outcome, result_json, franchise_interest, completed_at')
      .eq('id', quiz_session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Quiz session not found' }, { status: 404 });
    }

    // Reject if completed more than 10 minutes ago. Stale sessions come back
    // through /api/email/resend-results, which is rate limited.
    const completedAt = new Date(session.completed_at).getTime();
    if (Date.now() - completedAt > 10 * 60 * 1000) {
      return NextResponse.json({ error: 'Quiz session expired — please retake the quiz' }, { status: 410 });
    }

    // Use DB row as source of truth — do not trust request body
    email = session.email;
    outcome = session.outcome;
    result_json = session.result_json as Record<string, unknown>;
    franchise_interest = session.franchise_interest ?? false;
  }

  const sent = await sendResultsEmail({
    supabase,
    email,
    outcome,
    result_json,
    franchise_interest,
    quiz_session_id: quiz_session_id || null,
  });

  if (!sent) {
    return NextResponse.json({ success: false, error: 'Could not send the results email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
