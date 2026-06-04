import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const { email, outcome, result_json, quiz_session_id, franchise_interest } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const token = crypto.randomBytes(32).toString('hex');

  const { error: dbError } = await supabase
    .from('email_verifications')
    .insert([
      {
        email,
        token,
        quiz_session_id,
        outcome,
        result_json,
        franchise_interest
      }
    ]);

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyLink = `${appUrl}/verify?token=${token}`;

  const isProceed = ['PROCEED', 'PROCEED_WITH_RISK'].includes(outcome);
  const subject = isProceed
    ? "Good news — your E-2 eligibility result"
    : "Your E-2 eligibility assessment result";

  const htmlContent = isProceed
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
        <p>You completed the e2go eligibility assessment. We have important information to share about your E-2 eligibility based on your answers.</p>
        <a href="${verifyLink}" style="background-color: #C9A84C; color: #0a0a0a; padding: 14px 28px; text-decoration: none;">View My Result →</a>
      </div>
    `;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: 'results@e2go.app',
        to: email,
        subject: subject,
        html: htmlContent
      });
    } catch (e) {
      console.error("Resend error:", e);
    }
  } else {
    console.log("TODO: Send email with content:", htmlContent);
  }

  return NextResponse.json({ success: true, token });
}
