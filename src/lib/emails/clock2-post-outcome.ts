import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface ApplicationContext {
  applicationId: string;
}

function getBaseHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>e2go</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #0a0a0a;">
          <tr>
            <td style="padding: 0 0 32px 0; border-bottom: 1px solid rgba(201,168,76,0.15);">
              <span style="font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: #C9A84C;">e2go</span><span style="font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: #f5f0e8;">.app</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 0;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 0 0 0; border-top: 1px solid rgba(201,168,76,0.15);">
              <p style="font-size: 12px; color: rgba(245,240,232,0.4); margin: 0 0 8px 0; line-height: 1.6;">
                e2go.app — document preparation tool, not a law firm.<br>
                Your data is handled per our <a href="${appUrl}/privacy" style="color: #C9A84C; text-decoration: none;">privacy policy</a>.
              </p>
              <p style="font-size: 11px; color: rgba(245,240,232,0.3); margin: 0; line-height: 1.6;">
                To unsubscribe: <a href="${appUrl}/unsubscribe" style="color: rgba(245,240,232,0.4); text-decoration: underline;"> unsubscribe</a> | e2go.app | support@e2go.app
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function getButtonHtml(text: string, href: string, primary = true): string {
  const bgColor = primary ? '#C9A84C' : 'transparent';
  const textColor = primary ? '#0a0a0a' : '#C9A84C';
  const border = primary ? 'none' : '1px solid #C9A84C';

  return `
<a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; font-weight: 500; font-size: 14px; border: ${border};">${text}</a>
`.trim();
}

// ============================================
// CLOCK 2 — POST-OUTCOME EMAILS
// ============================================

export type VisaOutcome = 'approved' | 'refused';

export interface Clock2EmailData {
  recipient: EmailRecipient;
  application: ApplicationContext;
  outcome: VisaOutcome;
}

export async function sendClock2Immediate(data: Clock2EmailData): Promise<boolean> {
  const { recipient, application, outcome } = data;
  const downloadUrl = `${appUrl}/documents/${application.applicationId}`;
  const calendarUrl = `${appUrl}/simulator`;

  const isApproved = outcome === 'approved';
  const subject = isApproved
    ? "Congratulations — your E-2 visa journey is complete"
    : "We're sorry to hear about your outcome";

  const headline = isApproved
    ? "You did it."
    : "We are sorry.";

  const body = isApproved
    ? "Your complete application record is ready to download — it belongs to you and you should keep it. Your data will be retained for 90 days from today, then permanently deleted as part of our privacy policy."
    : "A refusal is not the end of the road. Your complete application record is ready to download — keep it, because if you reapply it will make the process significantly faster. Your data will be retained for 90 days from today.";

  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      ${headline}
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      ${body}
    </p>
    <p style="margin: 0 0 16px 0;">
      ${getButtonHtml('Download my complete record →', downloadUrl)}
    </p>
    ${!isApproved ? '' : `
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Enroll in the compliance calendar →', calendarUrl, false)}
    </p>
    `}
    ${isApproved ? '' : `
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Find an immigration consultant →', 'https://www.google.com/search?for=immigration+consultant+E2+visa', false)}
    </p>
    `}
  `);

  return sendEmail(recipient.email, subject, content);
}

export async function sendClock2Day60(data: Clock2EmailData): Promise<boolean> {
  const { recipient, application } = data;
  const downloadUrl = `${appUrl}/documents/${application.applicationId}`;

  const subject = "30 days until your application data is deleted";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      A reminder about your application data
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      Your e2go application data will be permanently deleted in 30 days. Download your complete record now to keep it safe.
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Download my record →', downloadUrl)}
    </p>
  `);

  return sendEmail(recipient.email, subject, content);
}

export async function sendClock2Day83(data: Clock2EmailData): Promise<boolean> {
  const { recipient, application } = data;
  const downloadUrl = `${appUrl}/documents/${application.applicationId}`;

  const subject = "7 days remaining — download your application record";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      This is your final reminder
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      In 7 days your application data will be permanently and irrevocably deleted. Download your record before then.
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Download my record →', downloadUrl)}
    </p>
  `);

  return sendEmail(recipient.email, subject, content);
}

// ============================================
// CORE EMAIL SENDING FUNCTION
// ============================================

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL] Would send to ${to}: ${subject}`);
    console.log(html.substring(0, 200) + '...');
    return true;
  }

  try {
    await resend.emails.send({
      from: 'e2go <notifications@e2go.app>',
      to: to,
      subject: subject,
      html: html
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error);
    return false;
  }
}