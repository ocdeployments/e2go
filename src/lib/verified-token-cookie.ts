/**
 * httpOnly cookie proving this browser opened a valid email verification link.
 * createAccountFromVerifiedEmail derives the email from it server-side, so a
 * caller can never register an address they did not receive the link at.
 */
export const VERIFIED_TOKEN_COOKIE = 'e2go_verified_token'
export const VERIFIED_TOKEN_MAX_AGE_SECONDS = 2 * 60 * 60
