/**
 * DR-4 follow-up (Session 146 cont.): the only *active* (not just
 * Sentry-passive) human-notification mechanism in the codebase was a
 * `sendAlert()` private to health-watchdog/route.ts — a real, awaited
 * Resend HTTP send straight to OPS_ALERT_EMAIL. Extracted here so any other
 * route needing to page a human in real time (starting with the download
 * route's per-document build-failure alert) can reuse the same mechanism
 * instead of inventing a second one or falling back to Sentry-only, which
 * nobody watches live.
 *
 * captureApiError() stays the right choice for "log this for later
 * debugging." Reach for sendOpsAlert() when the situation needs someone to
 * look *now* — a client-facing failure, not just an anomaly.
 */
import { captureApiError } from './capture-error';

export async function sendOpsAlert(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'ops@e2go.app';
  const to = process.env.OPS_ALERT_EMAIL ?? 'ops@e2go.app';

  if (!apiKey) {
    captureApiError(new Error('sendOpsAlert: RESEND_API_KEY not set, alert not sent'), {
      route: 'ops-alert',
      stage: 'missing-api-key',
      subject,
    });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to, subject, html: `<pre>${body}</pre>` }),
    });
    if (!res.ok) {
      captureApiError(new Error(`sendOpsAlert: Resend responded ${res.status}`), {
        route: 'ops-alert',
        stage: 'resend-send',
        subject,
      });
    }
  } catch (e) {
    captureApiError(e, { route: 'ops-alert', stage: 'resend-exception', subject });
  }
}
