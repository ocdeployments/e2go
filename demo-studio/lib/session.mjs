/**
 * Authentication for the camera.
 *
 * The login form is unfilmable and unreliable: it sits behind Turnstile, it is
 * rate-limited to 5 attempts per 15 minutes, and filming a password field is a
 * compliance problem even when the password is fake.
 *
 * So we never use it. The service-role key mints a magic-link token and
 * exchanges it for a session server-side, exactly as
 * scripts/run-persona-generation.mjs:74 already does for the generation runner.
 * The resulting tokens are written straight into the browser context as the
 * @supabase/ssr cookie, so the very first frame is already signed in.
 *
 * No password is ever handled, and no token is ever logged — the functions here
 * return values, they do not print them. Keep it that way: a console.log of a
 * storageState puts a live access token in the terminal scrollback.
 */

import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

/** Read .env.local without mutating it. Read-only, by design. */
function readEnvLocal() {
  const raw = readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

function base64url(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build a Playwright storageState for a test persona.
 *
 * Returns the object form that browser.newContext({ storageState }) accepts
 * directly, rather than a file — writing a session to disk leaves a live token
 * lying in the repo, and build/ is gitignored but not safe.
 *
 * @param email    the persona's address. MUST be a purpose-built test account.
 * @param baseUrl  the app origin the cookie is scoped to.
 */
export async function storageStateFor(email, baseUrl = 'http://localhost:3000') {
  const vars = readEnvLocal();
  const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    throw new Error(
      'session: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  const H_SERVICE = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: H_SERVICE,
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const linkBody = await linkRes.json();
  if (!linkRes.ok) {
    // Deliberately does not echo the body — it can carry the token itself.
    throw new Error(`session: generate_link failed (${linkRes.status}) for ${email}`);
  }
  const hashedToken = linkBody.hashed_token || linkBody.properties?.hashed_token;
  if (!hashedToken) throw new Error(`session: no hashed_token returned for ${email}`);

  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = await verifyRes.json();
  if (!verifyRes.ok || !session.access_token) {
    throw new Error(`session: verify failed (${verifyRes.status}) for ${email}`);
  }

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const cookiePayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || 'bearer',
    user: session.user,
  };

  const url = new URL(baseUrl);

  return {
    state: {
      cookies: [
        {
          name: `sb-${projectRef}-auth-token`,
          value: 'base64-' + base64url(JSON.stringify(cookiePayload)),
          domain: url.hostname,
          path: '/',
          expires: cookiePayload.expires_at,
          httpOnly: false,
          secure: url.protocol === 'https:',
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
    userId: session.user?.id,
  };
}
