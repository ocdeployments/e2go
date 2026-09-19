#!/usr/bin/env node
/**
 * QA helper — loopback-only persona login for the in-app browser.
 *
 * Why it exists: signing a persona in from the browser pane used to mean pasting access/refresh tokens into a tool call,
 * which puts them in the session transcript. This helper mints the session in Node (service-role magic-link exchange, no
 * password — same technique as scripts/chaos-drills-lib.mjs and scripts/qa/http-lib.mjs) and hands it to the browser as a
 * Set-Cookie header. The browser pane, the transcript and the page never see a token value in clear text.
 *
 * Cookies are host-scoped, not port-scoped: a cookie set for `localhost` by this helper (port 3021) is sent to the scratch
 * app on `localhost:3020`.
 *
 *   GET /login/<B|C|D>[?to=/path]     mint a session for that QA persona, set the cookie, 302 to <app><to>
 *   GET /login/A?...                  refused unless the helper was started with --allow-A (A is the real founder account;
 *                                     minting a session is an auth-state write on it — read-only pages only, do it last)
 *   GET /logout                       expire every sb-*-auth-token cookie, 302 to <app>/
 *   GET /who                          the helper's state and the per-persona mint count (cookie variant in the browser is not readable here)
 *
 * Safety: binds 127.0.0.1 only; rejects any Host header that is not localhost / 127.0.0.1 on this port (DNS-rebinding);
 * personas come from a fixed whitelist that must also exist in the ids file; nothing sensitive is ever logged.
 *
 * Usage:
 *   node scripts/qa/login-server.mjs --env <scratch>/.env.local --ids <scratch>/qa-ids.json [--port 3021] [--app http://localhost:3020] [--allow-A]
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { loadEnv, mint } from './http-lib.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const PORT = Number(arg('port', 3021));
const APP = String(arg('app', 'http://localhost:3020')).replace(/\/$/, '');
const ALLOW_A = arg('allow-A', false) === true;
const ENV_FILE = String(arg('env', ''));
const IDS_FILE = String(arg('ids', ''));
if (!ENV_FILE || !IDS_FILE) {
  console.error('usage: node scripts/qa/login-server.mjs --env <.env.local> --ids <qa-ids.json> [--port 3021] [--app http://localhost:3020] [--allow-A]');
  process.exit(1);
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(APP)) {
  console.error('refusing: --app must be a loopback address');
  process.exit(1);
}

const env = loadEnv(ENV_FILE);
const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'));
const PERSONAS = ['A', 'B', 'C', 'D'].filter((p) => ids.personas[p]);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const COOKIE = `sb-${ref}-auth-token`;
const CHUNK = 3000; // browsers cap a cookie at ~4096 bytes; @supabase/ssr reads `<name>.0`, `<name>.1`, ... when `<name>` is absent
const MAX_CHUNKS = 6;

const emailCache = new Map();
async function emailOf(persona) {
  if (emailCache.has(persona)) return emailCache.get(persona);
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${ids.personas[persona].userId}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) throw new Error(`could not resolve e-mail for persona ${persona} (${r.status})`);
  const email = (await r.json()).email;
  emailCache.set(persona, email);
  return email;
}

const attrs = (maxAge) => `Path=/; SameSite=Lax; Max-Age=${maxAge}`;
const expire = (name) => `${name}=; ${attrs(0)}`;

/** Set-Cookie header values that install `value` and expire every other spelling of the session cookie. */
function cookiesFor(value) {
  const out = [];
  if (value.length <= CHUNK) {
    out.push(`${COOKIE}=${value}; ${attrs(3300)}`);
    for (let i = 0; i < MAX_CHUNKS; i++) out.push(expire(`${COOKIE}.${i}`));
  } else {
    out.push(expire(COOKIE)); // a stale un-chunked cookie would win over the chunks
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < MAX_CHUNKS; i++) out.push(i < n ? `${COOKIE}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}; ${attrs(3300)}` : expire(`${COOKIE}.${i}`));
  }
  return out;
}

// Mint ledger: every session minted here is an auth-state write (login_events / last_sign_in_at) on a shared database — count them per persona.
const minted = {};

const okHost = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

const server = http.createServer(async (req, res) => {
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(body);
  };
  try {
    if (!okHost.has(String(req.headers.host))) return send(421, 'bad host');
    if (req.method !== 'GET') return send(405, 'GET only');
    const u = new URL(req.url, `http://localhost:${PORT}`);
    const parts = u.pathname.split('/').filter(Boolean);

    if (parts[0] === 'logout') {
      const cookies = [expire(COOKIE), ...Array.from({ length: MAX_CHUNKS }, (_, i) => expire(`${COOKIE}.${i}`))];
      return send(302, 'signed out', { location: `${APP}/`, 'set-cookie': cookies });
    }
    if (parts[0] === 'who') return send(200, JSON.stringify({ personas: PERSONAS, allowA: ALLOW_A, app: APP, minted }), { 'content-type': 'application/json' });
    if (parts[0] !== 'login' || !parts[1]) return send(404, 'not found');

    // A login is a state change triggered by a GET: refuse it when the request was initiated by another site (login-CSRF), e.g. a link in a page under test.
    if (req.headers['sec-fetch-site'] === 'cross-site') return send(403, 'cross-site request refused');
    const persona = parts[1];
    if (!PERSONAS.includes(persona)) return send(404, 'unknown persona');
    if (persona === 'A' && !ALLOW_A) return send(403, 'persona A is the real founder account — start the helper with --allow-A to enable it');
    const to = u.searchParams.get('to') || '/';
    if (!/^\/(?!\/)/.test(to)) return send(400, 'to must be an absolute path on the app');

    const email = await emailOf(persona);
    const s = await mint(env, email);
    // Same envelope @supabase/ssr writes: `base64-` + base64url(JSON session). mint() already produced `sb-<ref>-auth-token=<value>`.
    const value = s.cookie.slice(s.cookie.indexOf('=') + 1);
    minted[persona] = (minted[persona] || 0) + 1;
    return send(302, `signed in as persona ${persona}`, { location: `${APP}${to}`, 'set-cookie': cookiesFor(value) });
  } catch (e) {
    return send(500, `login helper error: ${String(e.message || e).slice(0, 160)}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`qa login helper on http://localhost:${PORT} -> ${APP}  personas=${PERSONAS.join(',')}${ALLOW_A ? ' (A ENABLED)' : ''}`);
});
