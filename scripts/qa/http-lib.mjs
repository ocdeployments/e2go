/**
 * QA helpers shared by scripts/qa/run-http.mjs (L2 anonymous + L3 authenticated HTTP matrix).
 *
 * - loadEnv():   parse a .env.local-style file WITHOUT touching process.env and without ever printing a value.
 * - mint():      persona session cookie via the service-role magic-link exchange (no password handled) —
 *                same pattern as scripts/chaos-drills-lib.mjs / reference_test_persona_login.
 * - hit():       one HTTP request over node:http (explicit Host header, no redirect following, body capped).
 * - resolveIds(): symbolic tokens used by TEST_MATRIX.json ({B.app}, {C.family}, {A.fdd}, {B.userId}) -> real ids.
 *
 * Nothing here ever logs an env value, token or cookie.
 */
import { readFileSync } from 'node:fs';
import http from 'node:http';

export function loadEnv(file) {
  const vars = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Magic-link exchange. Returns { cookie, userId, accessToken } — never logged. */
export async function mint(env, email) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !service || !anon) throw new Error('missing Supabase env (url / service / anon)');
  const linkRes = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: service, Authorization: `Bearer ${service}` },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const linkBody = await linkRes.json();
  const hashed = linkBody.hashed_token || linkBody.properties?.hashed_token;
  if (!linkRes.ok || !hashed) throw new Error(`generate_link failed (${linkRes.status})`);
  const verifyRes = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashed }),
  });
  const session = await verifyRes.json();
  if (!verifyRes.ok || !session.access_token) throw new Error(`verify failed (${verifyRes.status})`);
  const ref = new URL(url).hostname.split('.')[0];
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || 'bearer',
    user: session.user,
  };
  return {
    cookie: `sb-${ref}-auth-token=base64-${b64url(JSON.stringify(payload))}`,
    userId: session.user?.id,
    accessToken: session.access_token,
  };
}

/**
 * One request. `base` = http://127.0.0.1:3020. Never follows redirects. Body is capped at `maxBytes`
 * so a huge page cannot blow the runner's memory; `truncated` says so.
 */
export function hit(base, path, { method = 'GET', headers = {}, cookie, body, host, maxBytes = 400_000, timeoutMs = 30_000, streamMs = 0 } = {}) {
  const u = new URL(path, base);
  const h = { accept: 'text/html,application/json,*/*', 'user-agent': 'e2go-qa-http/1', ...headers };
  if (cookie) h.cookie = cookie;
  if (host) h.host = host;
  let payload;
  if (body !== undefined) {
    payload = typeof body === 'string' ? body : JSON.stringify(body);
    h['content-type'] = h['content-type'] || 'application/json';
    h['content-length'] = Buffer.byteLength(payload);
  }
  const started = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: h }, (res) => {
      const chunks = [];
      let size = 0;
      let truncated = false;
      const finish = (partial) => {
        if (settled) return;
        settled = true;
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          location: res.headers.location || null,
          bytes: size,
          truncated,
          partial: !!partial, // true when a long-lived stream (SSE) was cut after `streamMs`
          buf,
          text: buf.toString('utf8'),
          ms: Date.now() - started,
          error: null,
        });
        if (partial) req.destroy();
      };
      // Server-sent-event routes never end on their own while a job is running — read for `streamMs`, then cut.
      if (streamMs > 0) setTimeout(() => finish(true), streamMs);
      res.on('error', () => {}); // a deliberate cut of a stream surfaces as ECONNRESET on the response — expected
      res.on('data', (c) => {
        size += c.length;
        if (size <= maxBytes) chunks.push(c);
        else truncated = true;
      });
      res.on('end', () => finish(false));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', (e) => resolve({ status: 0, headers: {}, location: null, bytes: 0, truncated: false, buf: Buffer.alloc(0), text: '', ms: Date.now() - started, error: String(e.message || e) }));
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

/** Tokens like {B.app}, {C.family}, {A.fdd}, {B.userId}, {C.job}, {C.doc}, {C.upload}. */
export function resolveIds(ids) {
  const P = ids.personas;
  const pick = (persona, what) => {
    const p = P[persona];
    if (!p) return null;
    switch (what) {
      case 'userId':
        return p.userId;
      case 'app': {
        const apps = p.applications || [];
        const paid = apps.filter((a) => a.payment_status === 'paid');
        // Persona with generated documents: the application that owns the most of them.
        const counts = new Map();
        for (const g of p.generatedDocuments || []) counts.set(g.application_id, (counts.get(g.application_id) || 0) + 1);
        const richest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        return (richest && apps.find((a) => a.id === richest)?.id) || paid[paid.length - 1]?.id || apps[0]?.id || null;
      }
      case 'family':
        return p.familyMembers?.[0]?.id ?? null;
      case 'fdd':
        return p.fddAnalyses?.[0]?.id ?? null;
      case 'job':
        return p.generationJobs?.[0]?.id ?? null;
      case 'doc':
        return p.generatedDocuments?.[0]?.id ?? null;
      case 'upload':
        return p.uploadedDocuments?.[0]?.id ?? null;
      default:
        return null;
    }
  };
  return (s) => s.replace(/\{([ABCD])\.(\w+)\}/g, (all, persona, what) => pick(persona, what) ?? all);
}

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** Replace [param] segments of an API route with a syntactically valid but non-existent value. */
export function fillParams(route) {
  return route.replace(/\[([^\]]+)\]/g, (_, name) => (/id$/i.test(name) ? NIL_UUID : name === 'template' ? 'welcome' : 'qa-probe'));
}

/** Markers of an unhandled server error in a response body. */
export const ERROR_MARKERS = [
  /Application error: a server-side exception has occurred/i,
  /Internal Server Error/i,
  /Unhandled Runtime Error/i,
  /at\s+\S+\s+\((?:file:|\/|webpack)/, // stack frame
  /ECONNREFUSED|ENOTFOUND|PGRST\d+|42703|relation ".*" does not exist/i,
];

export function errorMarker(text) {
  for (const re of ERROR_MARKERS) {
    const m = re.exec(text);
    if (m) return m[0].slice(0, 80);
  }
  return null;
}
