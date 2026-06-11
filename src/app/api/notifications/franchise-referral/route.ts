import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * POST /api/notifications/franchise-referral
 * Sends an admin notification when a quiz user requests a franchise connection.
 * Called from quiz/page.tsx when Q0-08d = "Yes, please connect me".
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, userEmail, franchiseName } = await req.json();

    if (!resend) {
      console.warn("[franchise-referral] Resend not configured — skipping email");
      return NextResponse.json({ sent: false, reason: "resend_not_configured" });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn("[franchise-referral] ADMIN_EMAIL not set — skipping email");
      return NextResponse.json({ sent: false, reason: "admin_email_not_set" });
    }

    const date = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    await resend.emails.send({
      from: "E2go <notifications@e2go.app>",
      to: adminEmail,
      subject: `New franchise referral request — ${date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'DM Sans',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;min-height:100vh;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
                  <tr>
                    <td style="padding:32px;border:1px solid rgba(201,168,76,0.15);background:rgba(201,168,76,0.03);">
                      <div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(201,168,76,0.5);margin-bottom:16px;">
                        Franchise Referral Request
                      </div>
                      <div style="font-size:14px;color:#f5f0e8;line-height:1.7;margin-bottom:24px;">
                        A quiz applicant has requested a franchise connection referral.
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr>
                          <td style="padding:8px 0;font-size:12px;color:rgba(245,240,232,0.4);width:120px;">Date</td>
                          <td style="padding:8px 0;font-size:12px;color:#f5f0e8;">${date}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:12px;color:rgba(245,240,232,0.4);">Session ID</td>
                          <td style="padding:8px 0;font-size:12px;color:#f5f0e8;font-family:monospace;">${sessionId || "N/A"}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:12px;color:rgba(245,240,232,0.4);">Email</td>
                          <td style="padding:8px 0;font-size:12px;color:#f5f0e8;">${userEmail || "Not provided"}</td>
                        </tr>
                        ${franchiseName ? `
                        <tr>
                          <td style="padding:8px 0;font-size:12px;color:rgba(245,240,232,0.4);">Franchise</td>
                          <td style="padding:8px 0;font-size:12px;color:#f5f0e8;">${franchiseName}</td>
                        </tr>` : ""}
                      </table>
                      <div style="font-size:11px;color:rgba(245,240,232,0.3);border-top:1px solid rgba(201,168,76,0.1);padding-top:16px;">
                        This notification was sent automatically by E2go.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[franchise-referral] Email send failed:", error);
    return NextResponse.json(
      { sent: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
