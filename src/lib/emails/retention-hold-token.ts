/**
 * Confirm-to-keep links for the retention-reminder email (RS-10 / Gap G-19).
 *
 * The reminder email warns a client that their uploaded files are about to be
 * purged and offers one link to keep them. The link carries the application
 * id plus an HMAC of it, so:
 *   - the client confirms in one click, with nothing to type or log in for;
 *   - the id cannot be edited to place a hold on someone else's application;
 *   - the confirm endpoint never has to look the id up to decide whether the
 *     request is legitimate before checking the signature.
 *
 * Same signing pattern as unsubscribe.ts, with its own secret so rotating one
 * does not invalidate links signed by the other.
 */

import crypto from 'crypto';

function secret(): string {
  const s = process.env.RETENTION_HOLD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No retention-hold signing secret configured');
  return s;
}

function sign(applicationId: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(applicationId)
    .digest('base64url');
}

/** The href for the reminder email's "keep my files" button. */
export function retentionHoldUrl(applicationId: string, appUrl: string): string {
  return `${appUrl}/retention/confirm-hold?a=${applicationId}&s=${sign(applicationId)}`;
}

/**
 * Recover the application id from a link, or null when the signature does
 * not match. Compared in constant time so the check cannot be probed byte
 * by byte.
 */
export function verifyRetentionHoldToken(applicationId: string, signature: string): string | null {
  if (!applicationId) return null;

  const expected = Buffer.from(sign(applicationId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(expected, given)) return null;

  return applicationId;
}
