import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import { Resend } from 'resend';

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

    // Reject if completed more than 10 minutes ago
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

  // ── Generate token and insert verification record ──
  const token = crypto.randomBytes(32).toString('hex');

  const { error: dbError } = await supabase
    .from('email_verifications')
    .insert([{
      email,
      token,
      quiz_session_id: quiz_session_id || null,
      outcome,
      result_json,
      franchise_interest,
    }]);

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  // ── Send email via Resend ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyLink = `${appUrl}/verify?token=${token}`;

  const isQualified = ['PROCEED', 'PROCEED_RISK'].includes(outcome);
  const subject = isQualified
    ? "Good news — your E-2 eligibility result"
    : "Your E-2 eligibility assessment result";

  const htmlContent = isQualified
    ? `
      <div style="font-family: 'Cormorant Garamond', serif; color: #f5f0e8;">
        <h1>Your eligibility assessment is ready.</h1>
        <p>Based on your answers, you appear to meet the foundational requirements for an E-2 Treaty Investor visa. Your full result — including your readiness score — is waiting for you.</p>
        <a href="${verifyLink}" style="background-color: #C9A84C; color: #0a0a0a; padding: 14px 28px; text-decoration: none;">View My Full Result →</a>
        <footer style="margin-top: 40px; font-size: 12px; color: rgba(245,240,232,0.5);">
          This link expires in 24 hours. e2go.app — document preparation tool, not a law firm.
        </footer>
      </div>
    `
    : `
      <div style="font-family: 'Cormorant Garamond', serif; color: #f5f0e8;">
        <p>You completed the E2go eligibility assessment. We have important information to share about your E-2 eligibility based on your answers.</p>
        <a href="${verifyLink}" style="background-color: #C9A84C; color: #0a0a0a; padding: 14px 28px; text-decoration: none;">View My Result →</a>
      </div>
    `;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: 'results@e2go.app',
        to: email,
        subject,
        html: htmlContent,
      });
    } catch (e) {
      console.error("Resend error:", e);
    }
  } else {
    console.log("TODO: Send email with content:", htmlContent);
  }

  return NextResponse.json({ success: true });
}
