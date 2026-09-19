#!/usr/bin/env node
/**
 * QA runner (v2) — L0 gate, L2 (anonymous) and L3 (authenticated) HTTP matrix, driven by docs/qa/TEST_MATRIX.json.
 *
 * SAFETY (mirrors TEST_PLAN §5):
 *   - loopback only: refuses any --base that is not 127.0.0.1 / localhost;
 *   - a NON-GET request is only ever sent ANONYMOUSLY, only for a hand-reviewed probe (an empty `{}`, an invalid e-mail,
 *     a forged token), and never for a handler that HARD_BLOCK / GET_REVIEW classes E2 or E3. No persona ever sends a write;
 *   - authenticated GETs are page loads, own-data API reads (E0), three deliberate, disclosed E1 GET writers (persona B),
 *     cross-owner IDOR reads, and one owner download (OP1). Every one of them is a GET;
 *   - persona A (the real founder account) is skipped unless --allow-A is passed;
 *   - a whole-run before/after ledger of write-prone tables and the OP1 column snapshot are reported;
 *   - no env value, token or cookie is printed or written to the result file.
 *
 * Every result carries the stable cell id from TEST_MATRIX.json (`cell`), so a run can be resumed (--resume <file>) and the
 * HTTP verdict merged with the browser verdict for the same cell.
 *
 * Usage:
 *   node scripts/qa/run-http.mjs --env <scratch>/.env.local --ids <scratch>/qa-ids.json --out <dir>
 *        [--base http://127.0.0.1:3020] [--layers L2,L3] [--personas B,C,D] [--allow-A] [--no-e1]
 *        [--only <regex on cell id>] [--resume <previous http-*.json>] [--dry]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, mint, hit, resolveIds, fillParams, errorMarker, NIL_UUID } from './http-lib.mjs';
import { HARD_BLOCK, ALLOW_GET, GET_REVIEW } from './matrix-data.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const BASE = arg('base', 'http://127.0.0.1:3020');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error('refusing: --base must be a loopback address');
  process.exit(1);
}
const LAYERS = String(arg('layers', 'L2,L3')).split(',');
const PERSONAS = String(arg('personas', 'B,C,D')).split(',').filter(Boolean);
const ALLOW_A = arg('allow-A', false) === true;
const NO_E1 = arg('no-e1', false) === true;
const DRY = arg('dry', false) === true;
const ONLY = arg('only', null) && new RegExp(String(arg('only', '')));
const RESUME = arg('resume', null);
const SSE_MS = 4500; // a progress stream never ends on its own while a job runs — read two 2 s ticks, then cut
const OUT = resolve(String(arg('out', resolve(ROOT, 'docs/qa/results'))));
const ENV_FILE = String(arg('env', ''));
const IDS_FILE = String(arg('ids', ''));
if (!ENV_FILE || !IDS_FILE) {
  console.error('usage: node scripts/qa/run-http.mjs --env <.env.local> --ids <qa-ids.json> [--out dir] [--base url] [--layers L2,L3] [--personas B,C,D] [--allow-A] [--no-e1] [--only re] [--resume file] [--dry]');
  process.exit(1);
}
if (ALLOW_A && !PERSONAS.includes('A')) PERSONAS.push('A');

const matrix = JSON.parse(readFileSync(resolve(ROOT, 'docs/qa/TEST_MATRIX.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(ROOT, 'docs/qa/inventory.json'), 'utf8'));
const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'));
const env = loadEnv(ENV_FILE);
const subst = resolveIds(ids);
const fileOfRoute = Object.fromEntries(inventory.apiTable.map((a) => [a.route, a.file]));
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}

// uuid -> "C.app" so every request/result can be read without printing raw ids, and cross-persona cells can be detected.
const OWNER = new Map();
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const KINDS = { applications: 'app', familyMembers: 'family', uploadedDocuments: 'upload', generatedDocuments: 'doc', generationJobs: 'job', fddAnalyses: 'fdd' };
for (const p of ['A', 'B', 'C', 'D']) {
  const P = ids.personas[p];
  if (!P) continue;
  OWNER.set(P.userId, `${p}.user`);
  for (const [k, kind] of Object.entries(KINDS)) for (const x of P[k] || []) OWNER.set(x.id, `${p}.${kind}`);
}
const tag = (s) => String(s).replace(UUID_RE, (u) => (OWNER.has(u) ? `«${OWNER.get(u)}»` : u === NIL_UUID ? '«nil»' : `${u.slice(0, 8)}…`));
const ownersIn = (s) => [...String(s).matchAll(UUID_RE)].map((m) => OWNER.get(m[0])?.split('.')[0]).filter(Boolean);

/** Names of the query parameters a GET handler reads, found in its source. */
function queryParams(route) {
  try {
    const src = readFileSync(resolve(ROOT, fileOfRoute[route]), 'utf8');
    return [...new Set([...src.matchAll(/searchParams\.get\(\s*['"]([A-Za-z_]+)['"]\s*\)/g)].map((m) => m[1]))];
  } catch {
    return [];
  }
}

const firstSse = (text) => {
  const m = /^data:\s*(.+)$/m.exec(text);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
};

const isRedirect = (st) => st >= 300 && st < 400;
const norm = (loc) => {
  if (!loc) return '';
  try {
    const u = new URL(loc, BASE);
    return decodeURIComponent(u.pathname + u.search);
  } catch {
    return loc;
  }
};
const titleOf = (html) => (/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1] || '';
const jsonOf = (t) => {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
};

/** Block policy: never send a write-class request, whatever the matrix says. Route is the [param] pattern. */
function blockedBy(method, route) {
  const key = `${method} ${route}`;
  const rev = GET_REVIEW[key];
  if (rev && (rev.effect === 'E2' || rev.effect === 'E3')) return `${rev.effect}: ${rev.note}`;
  if (ALLOW_GET.has(key)) return null;
  const b = HARD_BLOCK.find(([re]) => re.test(route));
  return b ? `${b[2]}: ${b[1]}` : null;
}

// Ids and e-mails that belong to a persona — used to detect cross-user leakage in ANY response body.
function personaTokens(p) {
  const P = ids.personas[p];
  const out = new Set([P.userId]);
  for (const k of Object.keys(KINDS)) for (const x of P[k] || []) out.add(x.id);
  return out;
}
const EMAILS = {};
function leakScan(viewer, text, urlPath) {
  const hits = [];
  for (const other of ['A', 'B', 'C', 'D']) {
    if (other === viewer || !ids.personas[other]) continue;
    for (const tok of personaTokens(other)) {
      if (!tok || urlPath.includes(tok)) continue; // the id the caller asked for is echoed by Next (params) — not a leak
      if (text.includes(tok)) hits.push(`${other}:${tok.slice(0, 8)}…`);
    }
    const mail = EMAILS[other];
    if (mail && text.toLowerCase().includes(mail.toLowerCase())) hits.push(`${other}:email`);
  }
  return hits;
}

const results = [];
const add = (r) => results.push(r);
let base404 = null;

// ────────────────────────────────────────────────────────────────────────────
// expectation evaluation (structured `exp` from TEST_MATRIX.json; no string parsing)
// ────────────────────────────────────────────────────────────────────────────
const P = (verdict, note) => ({ verdict, ...(note ? { note } : {}) });
const F = (sev, note) => ({ verdict: 'FAIL', sev, note });
const INC = (note, sev) => ({ verdict: 'INCONCLUSIVE', note, ...(sev ? { sev } : {}) });

function checkNotFound(res) {
  if (res.status !== 404) return F('S2', `expected 404, got ${res.status}${res.location ? ` → ${norm(res.location)}` : ''}`);
  if (base404) {
    const sameTitle = titleOf(res.text) === titleOf(base404.text);
    const closeSize = Math.abs(res.text.length - base404.text.length) <= base404.text.length * 0.2 + 500;
    if (!sameTitle || !closeSize) return F('S1', `404 body differs from the generic not-found (title "${titleOf(res.text).slice(0, 40)}", ${res.text.length} vs ${base404.text.length} bytes) — possible content leak`);
  }
  return P('PASS');
}

function checkRedirect(res, exp, persona) {
  const got = norm(res.location);
  if (!isRedirect(res.status)) return F('S2', `expected → ${exp.to || exp.toPattern}, got ${res.status}`);
  if (exp.toPattern) {
    if (!new RegExp(exp.toPattern).test(got)) return F('S2', `expected → ${exp.toPattern}, got ${got}`);
    const owners = ownersIn(got);
    if (owners.some((o) => o !== exp.ownedBy)) return F('S0', `redirected to another persona's resource: ${tag(got)}`);
    return P('PASS', owners.length ? undefined : `→ ${tag(got)} (id not in the id file, ownership unverified)`);
  }
  const want = decodeURIComponent(exp.to);
  return got === want ? P('PASS') : F('S2', `expected → ${want}, got ${got}`);
}

function evalPage(res, exp, viewer, path) {
  if (res.status === 0) return INC(`no response (${res.error})`);
  if (res.status === 429) return INC('429 rate-limited — re-run later');
  const marker = errorMarker(res.text);
  const leak = leakScan(viewer, res.text, path);
  if (leak.length) return F('S0', `cross-user data in body: ${leak.slice(0, 4).join(', ')}`);
  if (res.status >= 500) return F('S1', `HTTP ${res.status}${marker ? ` (${marker})` : ''}`);
  const denial = exp.kind === 'denied' || exp.kind === 'notfound' || exp.kind === 'oneOf';
  if (marker && !(denial && res.status >= 400)) return F('S2', `error marker in body: ${marker}`);
  switch (exp.kind) {
    case 'ok':
      return res.status === 200 ? P('PASS') : F('S2', `expected 200, got ${res.status}${res.location ? ` → ${norm(res.location)}` : ''}`);
    case 'redirect':
      return checkRedirect(res, exp, viewer);
    case 'notfound':
      return checkNotFound(res);
    case 'gated':
      if (isRedirect(res.status) && norm(res.location).startsWith('/login')) return P('PASS', `→ ${norm(res.location)} (server-side)`);
      if (res.status === 200) return INC('200 shell: this page protects itself client-side, HTTP proves nothing — the browser probe decides', 'S0?');
      return F('S2', `unexpected ${res.status}`);
    case 'denied':
      if (isRedirect(res.status) || [401, 403, 404].includes(res.status)) return P('PASS', `denied (${res.status})`);
      if (res.status === 200) return INC('200 shell with no cross-user data in the HTML — data is loaded client-side; the browser probe + API IDOR cells decide', 'S0?');
      return F('S1', `unexpected ${res.status}`);
    case 'graceful':
      return res.status < 500 ? P('PASS', `status ${res.status}`) : F('S1', `status ${res.status}`);
    case 'oneOf': {
      const subs = exp.of.map((e) => evalPage(res, e, viewer, path));
      const ok = subs.find((s) => s.verdict === 'PASS');
      if (ok) return ok;
      const inc = subs.find((s) => s.verdict === 'INCONCLUSIVE');
      return inc || F('S2', subs.map((s) => s.note).join(' | '));
    }
    default:
      return INC(`unknown expectation kind: ${exp.kind}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// build the request plan
// ────────────────────────────────────────────────────────────────────────────
const sessions = {}; // persona -> { cookie }
const plan = []; // { cell, layer, persona, method, path, ... }
const notes = [];

function planPages() {
  for (const c of matrix.pageCells) {
    if (!LAYERS.includes(c.http.slice(0, 2))) continue;
    if (c.persona !== 'anon' && !PERSONAS.includes(c.persona)) continue;
    if (c.approval === 'A' && !ALLOW_A) {
      add({ cell: c.id, layer: c.http, persona: c.persona, path: c.url, verdict: 'SKIP', note: 'persona A (real founder account) needs --allow-A' });
      continue;
    }
    plan.push({ cell: c.id, layer: c.http, persona: c.persona, method: 'GET', path: c.url, exp: c.exp, cross: !!c.idor, route: c.route, kind: 'page' });
  }
}

function planApi() {
  if (!LAYERS.includes('L2')) return;
  for (const a of matrix.apiCells) {
    if (a.mode === 'static') continue;
    const path = fillParams(a.route);
    const probes = a.probes || [{ key: 'deny', method: a.method, body: a.body, exp: a.exp }];
    for (const q of probes) {
      const blocked = blockedBy(q.method, a.route);
      const cell = `${a.id}#${q.key}`;
      if (blocked && !(a.mode === 'live-validation' || a.mode === 'live-public')) {
        add({ cell, layer: 'L2-3', persona: 'anon', method: q.method, path: a.route, verdict: 'SKIP', note: `blocked by policy (${blocked})` });
        continue;
      }
      plan.push({ cell, layer: 'L2-3', persona: 'anon', method: q.method, path: path + (q.query || ''), body: q.body, exp: q.exp, route: a.route, kind: 'api', apiMode: a.mode });
    }
  }
}

function planStatic() {
  if (!LAYERS.includes('L2')) return;
  for (const host of ['e2go.app', 'www.e2go.app']) {
    for (const p of ['/', '/early-access', '/api/faq/ask', '/api/_sentry-tunnel', '/favicon.ico']) plan.push({ cell: `L2-2:${host}:${p}`, layer: 'L2-2', persona: 'anon', method: 'GET', path: p, host, kind: 'brand-allowed' });
    for (const p of ['/pricing', '/login', '/signup', '/quiz', '/results', '/faq', '/api/health', '/case-profile', '/admin']) plan.push({ cell: `L2-2:${host}:${p}`, layer: 'L2-2', persona: 'anon', method: 'GET', path: p, host, kind: 'brand-blocked' });
    plan.push({ cell: `L2-2:${host}:POST /api/early-access {}`, layer: 'L2-2', persona: 'anon', method: 'POST', path: '/api/early-access', body: '{}', host, kind: 'brand-validation' });
  }
  for (const p of ['/', '/api/health', '/pricing']) plan.push({ cell: `L2-5:${p}`, layer: 'L2-5', persona: 'anon', method: 'GET', path: p, kind: 'headers' });
  for (const p of ['/robots.txt', '/sitemap.xml', '/favicon.ico', '/manifest.json', '/manifest.webmanifest', '/sw.js', '/apple-touch-icon.png']) plan.push({ cell: `L2-6:${p}`, layer: 'L2-6', persona: 'anon', method: 'GET', path: p, kind: 'info' });
  for (const p of ['/definitely-not-a-page-qa', '/documents/not-a-uuid', '/apply/dependent/not-a-uuid', '/franchise/brand/does-not-exist-qa', '/api/does-not-exist-qa']) plan.push({ cell: `L2-7:${p}`, layer: 'L2-7', persona: 'anon', method: 'GET', path: p, kind: 'notfound' });
  // L2-8 forged session cookie must behave exactly like no cookie
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  for (const g of matrix.garbageCookie) plan.push({ cell: `L2-8:${g.id}`, layer: 'L2-8', persona: 'anon', method: 'GET', path: g.path, cookie: `sb-${ref}-auth-token=${encodeURIComponent(g.value)}`, exp: g.exp, kind: 'garbage' });
}

function planAuthApi() {
  if (!LAYERS.includes('L3')) return;
  const B = 'B';
  if (PERSONAS.includes(B)) {
    // L3-3: guard-first GET handlers as B, own data only. Dynamic routes other than [applicationId] have no id B owns.
    for (const a of matrix.apiCells) {
      if (!a.authProbe) continue;
      if (a.authProbe.effect === 'E1' && NO_E1) {
        add({ cell: `${a.id}#auth-B`, layer: 'L3-3', persona: B, path: a.route, verdict: 'SKIP', note: '--no-e1: E1 GET writer not run' });
        continue;
      }
      const dyn = a.authProbe.dyn;
      let path = a.route.replace('[applicationId]', '{B.app}');
      const params = dyn.length ? [] : queryParams(a.route).filter((n) => /^(applicationId|application_id|appId)$/.test(n));
      if (params.length) path += `?${params[0]}={B.app}`;
      plan.push({ cell: `${a.id}#auth-B`, layer: 'L3-3', persona: B, method: 'GET', path, kind: 'auth-own', route: a.route, e1: a.authProbe.effect === 'E1' });
    }
  }
  // L3-2 API IDOR (B attacks C's ids; C's own read is the positive baseline)
  if (PERSONAS.includes('B')) {
    for (const i of matrix.idorApi) plan.push({ cell: i.id, layer: 'L3-2', persona: 'B', method: 'GET', path: i.path, kind: 'idor-attacker', route: i.route, baselineOwner: i.baseline ? 'C' : null, sse: !!i.sse, exp: i.expect ? { kind: i.expect } : null, small: /download/.test(i.route) });
  }
  // L3-4 owner probes (OP*)
  for (const o of matrix.ownerProbes) {
    if (!PERSONAS.includes(o.persona)) continue;
    if (o.effect === 'E1' && NO_E1) {
      add({ cell: o.id, layer: 'L3-4', persona: o.persona, path: o.path, verdict: 'SKIP', note: '--no-e1: E1 owner probe not run' });
      continue;
    }
    plan.push({ cell: o.id, layer: 'L3-4', persona: o.persona, method: o.method, path: o.path, kind: 'owner-probe', probe: o, small: !!o.small });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// read-only ledger (Supabase REST, service role, HEAD-style counts) — before/after the whole run
// ────────────────────────────────────────────────────────────────────────────
const LEDGER_TABLES = ['rate_limit_hits', 'document_access_log', 'login_events', 'franchise_brand_views', 'case_profiles', 'terms_acceptance', 'generation_pipeline_log', 'support_tickets'];
const rest = (path, extra = {}) => fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, ...extra } });
async function ledger() {
  const out = {};
  for (const t of LEDGER_TABLES) {
    try {
      const r = await rest(`${t}?select=*`, { Prefer: 'count=exact', Range: '0-0' });
      if (!r.ok) {
        out[t] = `unavailable (${r.status})`;
        continue;
      }
      out[t] = Number((r.headers.get('content-range') || '').split('/')[1]);
    } catch (e) {
      out[t] = `unavailable (${String(e.message).slice(0, 40)})`;
    }
  }
  return out;
}
async function snapshot(spec) {
  const value = subst(spec.value);
  if (/\{/.test(value)) return { error: 'unresolved id' };
  try {
    const r = await rest(`${spec.table}?${spec.filter}=eq.${value}&select=${spec.column}`);
    const j = await r.json();
    if (!r.ok) return { error: `${r.status} ${j?.code || ''}` };
    return { values: (Array.isArray(j) ? j : []).map((x) => x[spec.column]) };
  } catch (e) {
    return { error: String(e.message).slice(0, 60) };
  }
}

async function fetchEmail(userId) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!r.ok) return null;
  return (await r.json()).email || null;
}

// ────────────────────────────────────────────────────────────────────────────
// execution
// ────────────────────────────────────────────────────────────────────────────
const READ = new Set(['GET', 'HEAD', 'OPTIONS']);

async function run(p) {
  const base = { cell: p.cell, layer: p.layer, persona: p.persona, method: p.method, path: tag(p.path), host: p.host, route: p.route, exp: p.exp };
  const session = p.persona !== 'anon' ? sessions[p.persona] : null;
  if (p.persona !== 'anon' && !session) return { ...base, verdict: 'SKIP', note: `no session for ${p.persona}` };
  // tool guards (defence in depth — the matrix is generated, but the runner never trusts it blindly)
  if (p.persona !== 'anon' && !READ.has(p.method)) return { ...base, verdict: 'SKIP', note: 'tool guard: a persona never sends a write' };
  if (p.persona === 'anon' && !READ.has(p.method) && p.route) {
    const b = blockedBy(p.method, p.route);
    if (b && p.kind !== 'api') return { ...base, verdict: 'SKIP', note: `tool guard: ${b}` };
  }
  // ownership guard (F-007): a non-IDOR cell must only ever carry the persona's own ids
  if (p.persona !== 'anon' && p.kind === 'page') {
    const foreign = [...new Set(ownersIn(p.path))].filter((o) => o !== p.persona);
    if (!p.cross && foreign.length) return { ...base, verdict: 'INCONCLUSIVE', note: `tool guard: non-IDOR cell carries another persona's id (${foreign.join(',')})` };
    if (p.cross && !foreign.length) return { ...base, verdict: 'INCONCLUSIVE', note: 'IDOR cell has no foreign id (persona data missing)' };
  }
  if (/\{[ABCD]\.\w+\}/.test(p.path)) return { ...base, verdict: 'INCONCLUSIVE', note: 'unresolved id token — the persona has no such row' };

  const res = await hit(BASE, p.path, { method: p.method, cookie: p.cookie || session?.cookie, body: p.body, host: p.host, maxBytes: p.small ? 4096 : 400_000, streamMs: p.sse ? SSE_MS : 0 });
  const ctype = (res.headers['content-type'] || '').split(';')[0];
  Object.assign(base, { status: res.status, location: res.location ? tag(norm(res.location)) : undefined, ms: res.ms, bytes: res.bytes, ctype, error: res.error || undefined });
  if (res.status === 429) return { ...base, ...INC('429 rate-limited — re-run later') };
  let v;
  switch (p.kind) {
    case 'page':
      v = evalPage(res, p.cross ? p.exp : p.exp, p.persona, p.path);
      if (p.cross) base.crossOwner = [...new Set(ownersIn(p.path))].filter((o) => o !== p.persona).join(',');
      break;
    case 'api':
      v = evalApi(res, p);
      break;
    case 'garbage':
      v = p.exp.kind === 'deny' ? evalDeny(res, p) : evalPage(res, { ...p.exp, to: p.exp.to.replace('{path}', p.path) }, 'anon', p.path);
      break;
    case 'brand-allowed':
      v = res.status === 0 ? INC(`no response (${res.error})`) : !isRedirect(res.status) && res.status < 500 ? P('PASS', `${res.status}`) : F('S2', `allowed path bounced/failed: ${res.status}${res.location ? ` → ${norm(res.location)}` : ''}`);
      break;
    case 'brand-blocked':
      v = res.status === 0 ? INC(`no response (${res.error})`) : isRedirect(res.status) && norm(res.location).startsWith('/early-access') ? P('PASS', `→ ${norm(res.location)}`) : F('S1', `gate leak: ${res.status}${res.location ? ` → ${norm(res.location)}` : ''} on the brand host`);
      break;
    case 'brand-validation':
      v = res.status === 400 ? P('PASS', '400 (allowed path reaches validation)') : res.status === 0 ? INC(`no response (${res.error})`) : F(res.status >= 500 ? 'S2' : 'S3', `expected 400, got ${res.status}`);
      break;
    case 'headers': {
      const h = res.headers;
      const csp = h['content-security-policy'] || '';
      const list = { csp: !!csp, xfo: !!h['x-frame-options'] || /frame-ancestors/.test(csp), nosniff: /nosniff/i.test(h['x-content-type-options'] || ''), referrer: !!h['referrer-policy'], permissions: !!h['permissions-policy'] };
      base.headers = { ...list, hsts: !!h['strict-transport-security'], cspUnsafeInline: /'unsafe-inline'/.test(csp), cspUnsafeEval: /'unsafe-eval'/.test(csp), server: h.server, poweredBy: h['x-powered-by'] };
      const missing = Object.entries(list).filter(([, ok]) => !ok).map(([k]) => k);
      v = { verdict: missing.length ? 'FAIL' : 'PASS', sev: 'S3', note: (missing.length ? `missing: ${missing.join(', ')}` : 'CSP, framing, nosniff, referrer, permissions present') + '; HSTS is an edge header (Vercel) — not assertable on loopback, reported only' };
      break;
    }
    case 'info':
      v = { verdict: 'INFO', note: `${res.status}${res.location ? ` → ${norm(res.location)}` : ''} ${ctype}` };
      break;
    case 'notfound': {
      const marker = errorMarker(res.text);
      const ok = (res.status === 404 || isRedirect(res.status)) && !marker;
      v = res.status === 0 ? INC(`no response (${res.error})`) : { verdict: ok ? 'PASS' : 'FAIL', sev: res.status >= 500 || marker ? 'S1' : 'S3', note: `${res.status}${res.location ? ` → ${norm(res.location)}` : ''}${marker ? ` marker: ${marker}` : ''} title "${titleOf(res.text).slice(0, 40)}"` };
      break;
    }
    case 'auth-own': {
      const j = jsonOf(res.text);
      const leak = leakScan(p.persona, res.text, p.path);
      if (p.e1) base.sideEffect = 'E1: GET writer (derived / draft rows for the persona) — run deliberately, disclosed';
      if (res.status === 0) v = INC(`no response (${res.error})`);
      else if (leak.length) v = F('S0', `another user's data in the response: ${leak.slice(0, 4).join(', ')}`);
      else if (res.status === 200 && j !== undefined) v = P('PASS', 'own data only; no other persona ids');
      else if ([400, 403, 404].includes(res.status)) v = INC(`${res.status} — needs parameters or has no data for this persona`);
      else v = F(res.status >= 500 ? 'S1' : 'S3', `status ${res.status}`);
      break;
    }
    case 'idor-attacker':
      v = await evalIdor(res, p, base);
      break;
    case 'owner-probe':
      v = await evalOwnerProbe(res, p, base);
      break;
    default:
      v = { verdict: 'INFO' };
  }
  return { ...base, ...v };
}

function evalDeny(res, p) {
  const j = jsonOf(res.text);
  const leak = leakScan('anon', res.text, p.path);
  if (res.status === 0) return INC(`no response (${res.error})`);
  if (leak.length) return F('S0', `data returned to anonymous caller: ${leak.join(', ')}`);
  if (res.status === 401 || res.status === 403) return res.headers['set-cookie'] ? F('S3', 'sets a cookie for an anonymous caller') : P('PASS', j?.error ? undefined : 'no JSON error body');
  if (res.status === 200) return F('S1', `200 for an anonymous caller (${res.bytes} bytes) — review: public by design?`);
  return F(res.status >= 500 ? 'S1' : 'S3', `expected 401/403 before validation, got ${res.status}${j?.error ? ` ("${String(j.error).slice(0, 60)}")` : ''}`);
}

function evalApi(res, p) {
  const e = p.exp;
  if (res.status === 0) return INC(`no response (${res.error})`);
  switch (e.kind) {
    case 'deny':
      return evalDeny(res, p);
    case 'status': {
      if (e.in.includes(res.status)) return P('PASS', `${res.status}`);
      return F(res.status >= 500 ? 'S2' : 'S3', `expected ${e.in.join('/')}, got ${res.status}${res.status >= 500 ? ' (server error on invalid input)' : ''}`);
    }
    case 'health': {
      const j = jsonOf(res.text);
      const keys = j && typeof j === 'object' ? Object.keys(j) : [];
      const sus = keys.filter((k) => /key|secret|token|env|commit|url|host|password/i.test(k));
      return [200, 503].includes(res.status) && j ? (sus.length ? F('S2', `suspicious keys: ${sus.join(',')}`) : P('PASS', `${res.status}; keys: ${keys.join(',')}`)) : F('S1', `expected 200/503 JSON, got ${res.status}`);
    }
    case 'html-shim':
      return res.status === 200 && /text\/html/.test(res.headers['content-type'] || '') && !res.headers['set-cookie'] ? P('PASS', '200 html shim, no cookie') : F('S2', `expected a 200 text/html shim without cookies, got ${res.status}${res.headers['set-cookie'] ? ' + Set-Cookie' : ''}`);
    case 'notfound':
      return res.status === 404 ? P('PASS', '404 (dev-only route is absent in this build)') : res.status === 200 ? INC('200: the preview route is served by this (dev) instance — must be re-checked against a production build', 'S1?') : F('S1', `expected 404, got ${res.status}`);
    default:
      return INC(`unknown expectation kind: ${e.kind}`);
  }
}

async function evalIdor(res, p, base) {
  if (res.status === 0) return INC(`no response (${res.error})`);
  const nilCell = p.exp?.kind === 'notfound';
  const ownerSession = p.baselineOwner ? sessions[p.baselineOwner] : null;
  const owner = ownerSession ? await hit(BASE, p.path, { cookie: ownerSession.cookie, maxBytes: p.small ? 4096 : 400_000, streamMs: p.sse ? SSE_MS : 0 }) : null;
  base.ownerStatus = owner?.status;
  const leak = leakScan(p.persona, res.text, p.path);
  // A stream (SSE) answers 200 even for a denial, so judge its first message, not the status.
  const sse = (r) => {
    const m = r && r.status === 200 ? firstSse(r.text) : null;
    const denied = m?.error === 'Job not found'; // the handler's exact "no such job for this user" message
    return m ? { msg: m, denied, real: !denied && typeof m.status === 'string' } : null;
  };
  const aSse = p.sse ? sse(res) : null;
  const oSse = p.sse ? sse(owner) : null;
  if (p.sse) {
    base.attackerStream = aSse ? (aSse.denied ? 'denied: "Job not found"' : `job data (status ${aSse.msg.status})`) : 'no message';
    base.ownerStream = oSse ? (oSse.real ? `job data (status ${oSse.msg.status})` : 'no job data') : 'no message';
  }
  if (leak.length) return F('S0', `IDOR: attacker response contains the owner's data (${leak.slice(0, 3).join(', ')})`);
  if (res.status >= 500) return F('S2', `server error ${res.status} instead of a clean denial`);
  if (res.status === 401) return INC('401 for a signed-in persona: the session was not accepted — the cell proves nothing');
  const attackerRead = p.sse ? !!aSse?.real : res.status === 200 && res.bytes > 2 && !/^(null|\{\}|\[\])$/.test(res.text.trim());
  if (nilCell) return res.status === 404 ? P('PASS', '404 for a non-existent id (no foreign row exists to test with)') : attackerRead ? F('S1', `${res.status} for a non-existent id`) : F('S3', `expected 404, got ${res.status}`);
  const ownerRead = !owner ? null : p.sse ? !!oSse?.real : owner.status === 200 && owner.bytes > 2;
  if (attackerRead && ownerRead === false) return F('S1', `attacker read a resource the owner's own baseline cannot (owner ${owner.status}) — review manually`);
  if (attackerRead) return F('S0', `IDOR: attacker read the owner's resource (${p.sse ? base.attackerStream : `${res.status}, ${res.bytes} bytes`})${owner ? '' : ' — no owner baseline'}`);
  const denied = p.sse ? !!aSse?.denied : [403, 404].includes(res.status);
  if (!denied) return INC(`attacker got ${res.status} — neither a clean denial (403/404) nor data`);
  if (p.baselineOwner && !owner) return INC(`attacker denied (${res.status}) but there is no owner baseline (no session for ${p.baselineOwner})`);
  if (p.baselineOwner && !ownerRead) return INC(`attacker denied (${res.status}) but the owner's own read is not a success either (${p.sse ? base.ownerStream : owner.status}) — the cell proves nothing`);
  return P('PASS', p.sse ? `owner sees ${base.ownerStream}; attacker sees ${base.attackerStream}` : owner ? `attacker ${res.status}; owner baseline ${owner.status} (${owner.bytes} bytes)` : `attacker ${res.status} (no positive control: the foreign row's existence is implied by 403 only)`);
}

async function evalOwnerProbe(res, p, base) {
  const o = p.probe;
  if (res.status === 0) return INC(`no response (${res.error})`);
  if (res.status === 401) return INC('401 for the owner: session not accepted');
  const magic = res.buf.subarray(0, 4).toString('latin1');
  base.contentDisposition = (res.headers['content-disposition'] || '').replace(/filename="[^"]*"/, 'filename="…"');
  base.magic = /^[\x20-\x7e]{2,4}$/.test(magic) ? magic : 'binary';
  if (!o.exp.in.includes(res.status)) return F(res.status >= 500 ? 'S1' : 'S2', `expected ${o.exp.in.join('/')}, got ${res.status}`);
  return P('PASS', res.status === 200 ? `${base.ctype}, ${res.bytes} bytes, magic ${base.magic}` : `${res.status} (package not ready: no write expected)`);
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}

async function main() {
  planPages();
  planApi();
  planStatic();
  planAuthApi();

  // resolve id tokens now so duplicates/ownership can be judged; a token that stays unresolved is reported by run()
  for (const p of plan) p.path = subst(p.path);
  for (const o of plan) if (o.exp?.to) o.exp = { ...o.exp, to: subst(o.exp.to) };
  let todo = ONLY ? plan.filter((p) => ONLY.test(p.cell)) : plan;
  if (RESUME) {
    const prev = JSON.parse(readFileSync(resolve(String(RESUME)), 'utf8'));
    const done = new Map(prev.results.filter((r) => r.cell && ['PASS', 'FAIL', 'INFO'].includes(r.verdict)).map((r) => [r.cell, r]));
    todo = todo.filter((p) => !done.has(p.cell));
    for (const r of done.values()) add(r);
    console.log(`resume: ${done.size} cells kept from ${RESUME}, ${todo.length} to run`);
  }
  // Same persona + path + expectation = same HTTP request (desktop/mobile cells differ only in the browser layer): send once, fan the result out.
  const groups = new Map();
  const uniq = [];
  for (const p of todo) {
    if (p.kind !== 'page') {
      uniq.push(p);
      continue;
    }
    const k = `${p.persona}|${p.path}|${JSON.stringify(p.exp)}`;
    if (groups.has(k)) groups.get(k).twins.push(p.cell);
    else {
      p.twins = [];
      groups.set(k, p);
      uniq.push(p);
    }
  }
  todo = uniq;
  const counts = todo.reduce((a, p) => ((a[p.layer] = (a[p.layer] || 0) + 1), a), {});
  console.log('planned requests:', JSON.stringify(counts), 'total', todo.length, `(matrix: ${matrix.pageCells.length} page cells, ${matrix.apiCells.length} API handlers)`);
  if (DRY) {
    for (const p of todo) console.log(`${p.layer.padEnd(6)} ${p.persona.padEnd(5)} ${p.method.padEnd(7)} ${p.host ? `[Host ${p.host}] ` : ''}${tag(p.path)}${p.body ? ` body=${p.body}` : ''}${p.cross ? ' [cross-owner]' : ''}${p.sse ? ' [sse]' : ''}${p.e1 ? ' [E1]' : ''}  ${p.exp ? JSON.stringify(p.exp) : ''}`);
    for (const r of results) console.log(`${r.verdict.padEnd(6)} ${r.cell} — ${r.note}`);
    return;
  }

  // sessions (one magic-link exchange per persona actually needed)
  for (const persona of PERSONAS) {
    if (!todo.some((p) => p.persona === persona) && !(persona === 'C' && todo.some((p) => p.baselineOwner === 'C'))) continue;
    if (!ids.personas[persona]) {
      add({ cell: `L0-5:${persona}`, layer: 'L0', persona, verdict: 'FAIL', sev: 'S1', note: 'persona missing from the id file' });
      continue;
    }
    const email = await fetchEmail(ids.personas[persona].userId);
    if (!email) {
      add({ cell: `L0-5:${persona}`, layer: 'L0', persona, verdict: 'FAIL', sev: 'S1', note: 'could not resolve persona e-mail' });
      continue;
    }
    try {
      sessions[persona] = await mint(env, email);
      add({ cell: `L0-5:${persona}`, layer: 'L0', persona, verdict: 'PASS', note: 'session minted (magic-link exchange, no password)' });
    } catch (e) {
      add({ cell: `L0-5:${persona}`, layer: 'L0', persona, verdict: 'FAIL', sev: 'S1', note: String(e.message) });
    }
  }
  for (const other of ['A', 'B', 'C', 'D']) if (ids.personas[other]) EMAILS[other] = await fetchEmail(ids.personas[other].userId);

  // L0 gate: the server is up, and the persona preconditions in the plan hold
  const home = await hit(BASE, '/');
  add({ cell: 'L0-1', layer: 'L0', persona: 'anon', verdict: home.status === 200 ? 'PASS' : 'FAIL', sev: 'S0', note: `GET / → ${home.status}` });
  if (home.status !== 200) {
    console.error('home page did not return 200 — is the scratch server up on', BASE, '?');
    writeOut(null, null);
    process.exit(2);
  }
  const need = { B: ['app'], C: ['app', 'family', 'job'], D: ['app', 'family'], A: ['fdd'] };
  for (const [persona, whats] of Object.entries(need)) {
    if (!PERSONAS.includes(persona) || !ids.personas[persona]) continue;
    const missing = whats.filter((w) => /\{/.test(subst(`{${persona}.${w}}`)));
    add({ cell: `L0-6:${persona}`, layer: 'L0', persona, verdict: missing.length ? 'FAIL' : 'PASS', sev: 'S3', note: missing.length ? `persona ${persona} has no ${missing.join(', ')} — dependent cells will be INCONCLUSIVE` : 'persona data preconditions hold' });
  }
  base404 = await hit(BASE, `/qa-baseline-404-${Date.now()}`);
  const staticAsset = (/\/_next\/static\/[^"']+\.(?:js|css)/.exec(home.text) || [])[0] || null;
  if (staticAsset && LAYERS.includes('L2') && !RESUME) for (const host of ['e2go.app', 'www.e2go.app']) todo.push({ cell: `L2-2:${host}:${staticAsset}`, layer: 'L2-2', persona: 'anon', method: 'GET', path: staticAsset, host, kind: 'brand-allowed' });

  const before = await ledger();
  const opSnap = {};
  for (const o of matrix.ownerProbes) if (o.snapshot && PERSONAS.includes(o.persona)) opSnap[o.id] = { before: await snapshot(o.snapshot) };

  const done = await pool(todo, 4, run);
  for (const r of done) {
    add(r);
    const src = todo.find((p) => p.cell === r.cell);
    for (const t of src?.twins || []) add({ ...r, cell: t, twinOf: r.cell });
  }

  const after = await ledger();
  for (const o of matrix.ownerProbes) if (o.snapshot && opSnap[o.id]) opSnap[o.id].after = await snapshot(o.snapshot);
  writeOut(before, after, opSnap);
}

function writeOut(before, after, opSnap) {
  mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(OUT, `http-${LAYERS.join('')}-${stamp}.json`);
  const tally = results.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  const delta = before && after ? Object.fromEntries(Object.keys(after).map((t) => [t, typeof after[t] === 'number' && typeof before[t] === 'number' ? after[t] - before[t] : `${before[t]} → ${after[t]}`])) : null;
  writeFileSync(file, JSON.stringify({ generated: new Date().toISOString(), gitSha, matrixGenerated: matrix.meta?.generated, base: BASE, layers: LAYERS, personas: PERSONAS, allowA: ALLOW_A, noE1: NO_E1, tally, ledger: { before, after, delta }, ownerProbeSnapshots: opSnap, results }, null, 1));
  console.log('\nverdicts:', JSON.stringify(tally));
  if (delta) console.log('ledger delta (rows added during the run, all tables shared with production):', JSON.stringify(delta));
  const byLayer = {};
  for (const r of results) {
    byLayer[r.layer] = byLayer[r.layer] || { PASS: 0, FAIL: 0, INCONCLUSIVE: 0, INFO: 0, SKIP: 0 };
    byLayer[r.layer][r.verdict] = (byLayer[r.layer][r.verdict] || 0) + 1;
  }
  for (const [k, v] of Object.entries(byLayer).sort()) console.log(k.padEnd(6), JSON.stringify(v));
  const bad = results.filter((r) => r.verdict === 'FAIL');
  if (bad.length) console.log(`\nFAIL (${bad.length})`);
  for (const r of bad) console.log(`  [${r.sev || '-'}] ${r.layer} ${r.persona} ${r.method || ''} ${r.host ? `[${r.host}] ` : ''}${r.path || ''} — ${r.note}`);
  const inc = results.filter((r) => r.verdict === 'INCONCLUSIVE');
  if (inc.length) console.log(`\nINCONCLUSIVE (${inc.length})`);
  for (const r of inc) console.log(`  ${r.layer} ${r.persona} ${r.path || ''} — ${r.note}`);
  console.log('\nwrote', file);
}

main().catch((e) => {
  console.error('runner error:', e.message);
  process.exit(1);
});
