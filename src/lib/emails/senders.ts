/**
 * Sender and reply-to addresses for every outbound email.
 *
 * These used to be hardcoded per route, which drifted into four different
 * senders — notifications@, results@, noreply@ and no-reply@ — for what is
 * really two kinds of mail. Import from here instead of writing the address.
 *
 * Every address below is on the Resend-verified e2go.app domain. Replies are
 * what makes the difference between the two kinds:
 *
 *   - Client-facing mail replies to support@e2go.app, the address the email
 *     footers already promise.
 *   - Internal alerts reply to the person who triggered them, so hitting
 *     reply on a support ticket answers the customer directly.
 *
 * Without an explicit Reply-To, a reply goes to the From address. Nothing in
 * the app consumes inbound mail, so those replies were being lost silently —
 * no bounce, no answer.
 */

/** From: on everything. One sender, so recipients learn to recognise it. */
export const EMAIL_SENDER = 'e2go <notifications@e2go.app>';

/** Where client replies should land. Matches the address in the footer. */
export const SUPPORT_REPLY_TO = 'support@e2go.app';

/**
 * Reply-To for an internal alert about a specific person.
 *
 * Falls back to support when the triggering address is missing or a
 * placeholder — support/submit uses the literal 'anonymous' for logged-out
 * tickets, which must never end up in a Reply-To header.
 */
export function replyToUser(userEmail?: string | null): string {
  return userEmail && userEmail.includes('@') ? userEmail : SUPPORT_REPLY_TO;
}
