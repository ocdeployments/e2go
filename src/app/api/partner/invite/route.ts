import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { Resend } from 'resend';
import { captureApiError } from '@/lib/capture-error';

function buildInviteEmail(params: {
  senderName: string;
  partnerEmail: string;
  acceptUrl: string;
}): string {
  const { senderName, acceptUrl } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Interview Prep Access — E2go</title>
</head>
<body style="margin:0; padding:0; background-color:#e0dbd0; font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e0dbd0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background-color:#f5f0e8; border-top:3px solid #C9A84C;">

          <tr>
            <td style="padding:28px 40px 24px;">
              <p style="margin:0; font-size:19px; font-weight:300; color:#C9A84C; letter-spacing:0.04em; font-family:Georgia,'Times New Roman',serif;">E2go<span style="color:#1a1a1a;">.app</span></p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <div style="height:1px; background-color:#d4cfc5;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 20px;">
              <h1 style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:400; color:#1a1a1a; line-height:1.3;">
                ${senderName} has granted you Interview Prep access.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 18px;">
              <p style="margin:0; font-size:14px; color:#3a3a3a; line-height:1.75; font-family:Arial,sans-serif;">
                Your business partner has purchased the E2go Interview Prep add-on for your joint E-2 application — and has included you in their access.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; font-size:14px; color:#3a3a3a; line-height:1.75; font-family:Arial,sans-serif;">
                Interview Prep gives you a full simulated consular interview — personalised to your case, scored, and followed by specific coaching on every answer. It's the closest thing to a real rehearsal before your appointment.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf9f0; border-left:3px solid #C9A84C;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0; font-size:13px; color:#5a4a1a; line-height:1.7; font-family:Georgia,'Times New Roman',serif; font-style:italic;">
                      Accept the invitation below. If you don't have an E2go account, you'll be prompted to create one — the access will be waiting for you when you log in.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 36px; text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#C9A84C; padding:16px 36px;" align="center">
                    <a href="${acceptUrl}" style="color:#0a0a0a; font-family:Arial,'Helvetica Neue',Helvetica,sans-serif; font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; text-decoration:none; white-space:nowrap;">
                      ACCEPT INTERVIEW PREP ACCESS &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0; font-size:11px; color:#999; font-family:Arial,sans-serif; line-height:1.5;">
                This invitation link is single-use and tied to this email address.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 40px; border-top:1px solid #d4cfc5; background-color:#ece7dd;">
              <p style="margin:0; font-size:10.5px; color:#888; line-height:1.6; font-family:Arial,sans-serif;">
                This invitation was sent by a partner on your joint E-2 application. If you were not expecting this, you can safely ignore it. &mdash; E2go.app is a preparation tool, not a law firm.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { partnerEmail?: string };
  const partnerEmail = (body.partnerEmail ?? '').trim().toLowerCase();

  if (!partnerEmail || !partnerEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid partner email required' }, { status: 400 });
  }

  if (partnerEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify the caller holds an interview_prep_partnership payment
  const { data: payment } = await service
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', 'interview_prep_partnership')
    .eq('status', 'completed')
    .maybeSingle();

  if (!payment) {
    return NextResponse.json(
      { error: 'No Interview Prep Partnership purchase found on this account' },
      { status: 403 }
    );
  }

  // Check for an existing invite to this email
  const { data: existing } = await service
    .from('partner_access_tokens')
    .select('id, used_at, token')
    .eq('created_by_user_id', user.id)
    .eq('partner_email', partnerEmail)
    .eq('tier_id', 'interview_prep_partnership')
    .maybeSingle();

  if (existing?.used_at) {
    return NextResponse.json(
      { error: 'This partner has already accepted their invitation' },
      { status: 409 }
    );
  }

  // Upsert: refresh token if re-sending, create new if first time
  let token: string;

  if (existing) {
    const newToken = crypto.randomUUID();
    await service
      .from('partner_access_tokens')
      .update({ token: newToken, created_at: new Date().toISOString() })
      .eq('id', existing.id);
    token = newToken;
  } else {
    const { data: created } = await service
      .from('partner_access_tokens')
      .insert({
        created_by_user_id: user.id,
        partner_email: partnerEmail,
        tier_id: 'interview_prep_partnership',
      })
      .select('token')
      .single();

    if (!created) {
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
    token = created.token as string;
  }

  // Fetch sender display name
  const { data: senderProfile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();
  const senderName = (senderProfile?.full_name as string) || 'Your E-2 partner';

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const acceptUrl = `${appUrl}/partner-access?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: 'e2go <notifications@e2go.app>',
        to: partnerEmail,
        subject: `${senderName} has granted you Interview Prep access on E2go`,
        html: buildInviteEmail({ senderName, partnerEmail, acceptUrl }),
      });
    } catch (err) {
      captureApiError(err, { route: 'partner/invite', stage: 'resend-send', userId: user.id });
    }
  } else {
    console.log('[PARTNER INVITE] No RESEND_API_KEY — would send to:', partnerEmail, acceptUrl);
  }

  return NextResponse.json({ success: true, partnerEmail });
}
