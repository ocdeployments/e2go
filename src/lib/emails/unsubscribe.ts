/**
 * Unsubscribe links.
 *
 * Every email footer in the app already links to /unsubscribe, and until now
 * that page did not exist — a 404 on the one control a recipient is promised.
 * Tolerable while all mail was transactional; not tolerable for a nurture
 * sequence, where a missing opt-out is both a deliverability problem and a
 * CASL one.
 *
 * The link carries the address plus an HMAC of it, so:
 *   - a recipient unsubscribes in one click, with nothing to type;
 *   - the parameter cannot be edited to unsubscribe someone else;
 *   - the page never has to look an address up to decide whether it is real,
 *     so the endpoint cannot be used to test whether we hold an address.
 *
 * Signing key: EMAIL_UNSUBSCRIBE_SECRET when set. It falls back to the service
 * role key so the feature works on an environment that has not added the new
 * variable yet — the HMAC output does not reveal the key, but a dedicated
 * secret is still the better setup, because rotating the service role key
 * would otherwise invalidate every link already sitting in an inbox.
 */

import crypto from 'crypto';

function secret(): string {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No unsubscribe signing secret configured');
  return s;
}

function sign(email: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(email.trim().toLowerCase())
    .digest('base64url');
}

/** base64url so the address survives a query string without escaping. */
function encodeEmail(email: string): string {
  return Buffer.from(email.trim().toLowerCase(), 'utf8').toString('base64url');
}

function decodeEmail(encoded: string): string | null {
  try {
    const email = Buffer.from(encoded, 'base64url').toString('utf8');
    return email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

/** The href for the footer link and the List-Unsubscribe header. */
export function unsubscribeUrl(email: string, appUrl: string): string {
  return `${appUrl}/unsubscribe?e=${encodeEmail(email)}&s=${sign(email)}`;
}

/**
 * Recover the address from a link, or null when the signature does not match.
 * Compared in constant time so the check cannot be probed byte by byte.
 */
export function verifyUnsubscribeToken(encoded: string, signature: string): string | null {
  const email = decodeEmail(encoded);
  if (!email) return null;

  const expected = Buffer.from(sign(email));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(expected, given)) return null;

  return email;
}

/**
 * Headers that let a mail client show its own Unsubscribe control and act on
 * it without opening a browser (RFC 8058). Gmail and Yahoo both expect these
 * on bulk mail, and their absence costs inbox placement.
 */
export function unsubscribeHeaders(email: string, appUrl: string): Record<string, string> {
  const post = `${appUrl}/api/email/unsubscribe?e=${encodeEmail(email)}&s=${sign(email)}`;
  return {
    'List-Unsubscribe': `<${post}>, <mailto:support@e2go.app?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
