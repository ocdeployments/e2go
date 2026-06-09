import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface ApplicationContext {
  applicationId: string;
  currentTab?: string;
  lastActivityAt?: string;
}

function getBaseHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2go</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #0a0a0a;">
          <tr>
            <td style="padding: 0 0 32px 0; border-bottom: 1px solid rgba(201,168,76,0.15);">
              <span style="font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: #C9A84C;">E2go</span><span style="font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: #f5f0e8;">.app</span>
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
// CLOCK 1 — INACTIVITY RE-ENGAGEMENT EMAILS
// ============================================

export interface Clock1EmailData {
  recipient: EmailRecipient;
  application: ApplicationContext;
  daysInactive: number;
  currentTabName?: string;
}

export async function sendClock1Day60(data: Clock1EmailData): Promise<boolean> {
  const { recipient, application, currentTabName = 'your application' } = data;
  const continueUrl = `${appUrl}/apply/overview?app=${application.applicationId}`;

  const subject = "Your E2go application is still waiting for you";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      We noticed you haven't been back in a while
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      Your application is exactly where you left it — ${currentTabName} is ready for you to continue.
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Continue my application →', continueUrl)}
    </p>
    <p style="font-size: 13px; color: rgba(245,240,232,0.45); line-height: 1.5; margin: 0;">
      No pressure at all — when you're ready, we'll be here.
    </p>
  `);

  return sendEmail(recipient.email, subject, content);
}

export async function sendClock1Day67(data: Clock1EmailData): Promise<boolean> {
  const { recipient, application } = data;
  const timelineUrl = `${appUrl}/apply/calendar?app=${application.applicationId}`;

  const subject = "One thing has changed since you were last here";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      Toronto consulate wait times have shifted
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      Your application is still saved and your timeline is still achievable. Processing times change regularly — we've updated your compliance calendar.
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('See my timeline →', timelineUrl)}
    </p>
  `);

  return sendEmail(recipient.email, subject, content);
}

export async function sendClock1Day74(data: Clock1EmailData): Promise<boolean> {
  const { recipient, application } = data;
  const loginUrl = `${appUrl}/login?redirect=/apply/overview?app=${application.applicationId}`;
  const downloadUrl = `${appUrl}/api/export/${application.applicationId}`;

  const subject = "Your application data will be deleted in 16 days";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      We want to be upfront with you
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      If you don't log in within 16 days, your application data will be permanently deleted as part of our privacy policy.
    </p>
    <p style="margin: 0 0 16px 0;">
      ${getButtonHtml('Log in now →', loginUrl)}
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Download my data →', downloadUrl, false)}
    </p>
  `);

  return sendEmail(recipient.email, subject, content);
}

export async function sendClock1Day81(data: Clock1EmailData): Promise<boolean> {
  const { recipient, application } = data;
  const continueUrl = `${appUrl}/apply/overview?app=${application.applicationId}`;
  const downloadUrl = `${appUrl}/api/export/${application.applicationId}`;

  const subject = "Final notice — 9 days remaining";
  const content = getBaseHtml(`
    <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #f5f0e8; margin: 0 0 20px 0; line-height: 1.3;">
      This is our last email about your application
    </h1>
    <p style="font-size: 15px; color: rgba(245,240,232,0.75); line-height: 1.6; margin: 0 0 24px 0;">
      In 9 days your data will be permanently deleted. If your plans have changed, that is completely fine. If you want to continue, we are here.
    </p>
    <p style="margin: 0 0 16px 0;">
      ${getButtonHtml('Continue my application →', continueUrl)}
    </p>
    <p style="margin: 0 0 32px 0;">
      ${getButtonHtml('Download and save my data →', downloadUrl, false)}
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