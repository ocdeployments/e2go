/**
 * Shared chrome for transactional email.
 *
 * Every email body MUST go through getBaseHtml. The wrapper is what paints the
 * dark ground the brand palette assumes: the body text is #f5f0e8, so a bare
 * fragment sent without this wrapper renders near-white on the client's own
 * white background and is effectively invisible.
 */

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Wrap body content in the branded shell.
 *
 * @param content   Body HTML — table rows or block elements, already styled.
 * @param preheader Inbox preview line. Shown by most clients next to the
 *                  subject; without it they scrape the first visible text.
 */
export function getBaseHtml(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>e2go</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #0a0a0a;">
          <tr>
            <td style="padding: 0 0 32px 0; border-bottom: 1px solid rgba(201,168,76,0.15);">
              <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 300; color: #C9A84C;">e2go</span><span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 300; color: #f5f0e8;">.app</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 0;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 0 0 0; border-top: 1px solid rgba(201,168,76,0.15);">
              <p style="font-size: 12px; color: rgba(245,240,232,0.72); margin: 0 0 8px 0; line-height: 1.6;">
                e2go.app — document preparation tool, not a law firm.<br>
                Your data is handled per our <a href="${appUrl}/privacy" style="color: #C9A84C; text-decoration: none;">privacy policy</a>.
              </p>
              <p style="font-size: 11px; color: rgba(245,240,232,0.68); margin: 0; line-height: 1.6;">
                To unsubscribe: <a href="${appUrl}/unsubscribe" style="color: rgba(245,240,232,0.72); text-decoration: underline;">unsubscribe</a> | e2go.app | support@e2go.app
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

/** Branded call-to-action link. `primary` is the filled gold variant. */
export function getButtonHtml(text: string, href: string, primary = true): string {
  const bgColor = primary ? '#C9A84C' : 'transparent';
  const textColor = primary ? '#0a0a0a' : '#C9A84C';
  const border = primary ? 'none' : '1px solid #C9A84C';

  return `
<a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; font-weight: 500; font-size: 14px; border: ${border};">${text}</a>
`.trim();
}
