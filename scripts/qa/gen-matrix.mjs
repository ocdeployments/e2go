#!/usr/bin/env node
/**
 * QA helper — derive the executable TEST MATRIX (v2) from the static inventory and the hand-reviewed policy tables.
 *
 *   node scripts/qa/gen-matrix.mjs
 *
 * Reads   docs/qa/inventory.json      (scripts/qa-audit-inventory.mjs)         — REQUIRED, the run fails hard without it
 *         docs/qa/guard-order.json    (scripts/qa/guard-order.mjs)             — REQUIRED
 *         scripts/qa/matrix-data.mjs  (personas, dynamic ids, effect policy, probes, journeys, static checks)
 * Writes  docs/qa/TEST_MATRIX.json    (machine-readable, consumed by run-http.mjs / build-queue.mjs / summarize.mjs)
 *         docs/qa/TEST_MATRIX.md      (human-readable)
 *
 * No network, no database. Row ids stay SYMBOLIC ({B.app}, {C.family} …) and are resolved at run time from the git-ignored
 * qa-ids.json. Every expectation is a STRUCTURED `exp` object (never prose), so the runner cannot mis-parse it:
 *   ok · redirect{to | toPattern+ownedBy} · gated · denied · graceful · notfound · oneOf{of[]}
 *   (API probes add: health · html-shim · status{in[]} · deny)
 * Every cell has a stable id, so a run can be resumed and HTTP + browser results merged by id.
 *
 * Integrity checks that abort generation: the middleware-bypass set, every policy key resolving to a real handler, every
 * dynamic page having an id model, every GET/HEAD handler that writes being hand-reviewed, unique cell ids, full page coverage.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from './matrix-data.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const need = (rel) => {
  const f = join(ROOT, rel);
  if (!existsSync(f)) {
    console.error(`FATAL: ${rel} is missing — run the tool that produces it first (a matrix built without it would silently lose guard-order data).`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(f, 'utf8'));
};
const inv = need('docs/qa/inventory.json');
const guard = need('docs/qa/guard-order.json');
const problems = [];
const fail = (m) => problems.push(m);

/* ------------------------------------------------------------------------------------------- integrity: bypass set */
const declaredBypass = new Set([...D.BYPASS_SERVER, ...D.BYPASS_CLIENT]);
const actualBypass = new Set(inv.pages.filter((p) => p.access !== 'public' && p.access !== 'auth-page' && p.enforcedByMiddleware === false).map((p) => p.route));
for (const r of declaredBypass) if (!actualBypass.has(r)) fail(`BYPASS: ${r} is declared but the inventory says the middleware enforces it`);
for (const r of actualBypass) if (!declaredBypass.has(r)) fail(`BYPASS: ${r} bypasses the middleware but is not declared in BYPASS_SERVER / BYPASS_CLIENT`);

/* ------------------------------------------------------------------------------------------------- expectations */
const OK = { kind: 'ok' };
const GRACEFUL = { kind: 'graceful' };
const DENIED = { kind: 'denied' };
const GATED = { kind: 'gated' };
const NOTFOUND = { kind: 'notfound' };
const redir = (to) => ({ kind: 'redirect', to });
const oneOf = (...of) => ({ kind: 'oneOf', of });
const loginNext = (path) => redir(`/login?next=${path}`);
const LENIENT_SIGNED_IN = new Set([...D.STATE_DEPENDENT, '/quiz']);

function anonExp(p, path) {
  const r = p.route;
  if (p.access === 'public' || p.access === 'auth-page') {
    if (D.STUBS[r]) return redir(D.STUBS[r]);
    return D.PARAM_REQUIRED.has(r) || D.STATE_DEPENDENT.has(r) ? GRACEFUL : OK;
  }
  if (r === '/documents/debug-error') return oneOf(loginNext(path), NOTFOUND);
  if (D.BYPASS_CLIENT.has(r)) return GATED;
  return loginNext(path); // middleware-enforced, or BYPASS_SERVER (the page itself redirects to /login?next=<pathname>)
}

function signedExp(p, persona, path, o) {
  const r = p.route;
  if (p.access === 'auth-page') return redir('/case-profile');
  if (p.access === 'admin') return oneOf(redir('/'), NOTFOUND); // role=user: layout redirect to / (307); a 404 is also accepted
  if (r === '/documents/debug-error') return NOTFOUND;
  if (persona === 'D' && r.startsWith('/apply')) return redir(`/terms-required?next=${path}`); // terms gate runs before page-level stubs
  if (D.STUBS[r]) return redir(D.STUBS[r]);
  if (r === '/documents') return { kind: 'redirect', toPattern: '^/documents/[0-9a-f-]{36}$', ownedBy: persona };
  if (D.BYPASS_SERVER.has(r)) return GRACEFUL; // /renewal: behaviour for a user with no renewal purchase is not fixed by the source
  if (o.idor) return DENIED;
  if (p.access === 'public' && (D.PARAM_REQUIRED.has(r) || D.STATE_DEPENDENT.has(r))) return GRACEFUL;
  if (LENIENT_SIGNED_IN.has(r)) return GRACEFUL;
  return OK;
}

/* ------------------------------------------------------------------------------------------------------ pages */
const isDyn = (r) => r.includes('[');
const seg = (r, v) => r.replace(/\[[^\]]+\]/, v);

function planPage(p) {
  const r = p.route;
  const dyn = isDyn(r);
  const spec = D.DYN[r];
  if (dyn && !spec) {
    fail(`DYN: dynamic page ${r} has no id model in matrix-data.mjs`);
    return [];
  }
  const cells = [];
  const add = (persona, vp, depth, o = {}) => {
    let s = o.seg;
    if (dyn && s === undefined) s = persona === 'anon' ? spec.anon : spec.own[persona];
    if (dyn && s === undefined) return; // this persona owns no id for the route
    const path = dyn ? seg(r, s) : r;
    const url = path + (o.variant || '');
    const exp = o.exp || (persona === 'anon' ? anonExp(p, path) : signedExp(p, persona, path, o));
    const http = persona === 'anon' ? 'L2-1' : o.idor ? 'L3-2' : 'L3-1';
    cells.push({
      id: `${persona}.${vp}.${r}${o.variant || ''}${o.idor ? '.idor' : ''}`,
      kind: 'page',
      route: r,
      url,
      persona,
      vp,
      depth,
      http,
      browser: depth === 'CLICK' ? 'L5' : depth === 'PROBE' ? 'L4' : null,
      exp,
      access: p.access,
      ...(o.idor ? { idor: true } : {}),
      ...(o.variant ? { variant: o.variant } : {}),
      ...(D.PERSONAS[persona].approval ? { approval: D.PERSONAS[persona].approval } : {}),
      ...(o.note ? { note: o.note } : {}),
    });
  };
  const variants = (persona) => {
    for (const q of D.QUERY[r] ? [D.QUERY[r]] : []) add(persona, 'desktop', 'PROBE', { variant: q, exp: GRACEFUL, note: 'query-string variant: handled gracefully, actionable next step' });
  };
  const mobileDepth = D.MOBILE_CLICK.has(r) ? 'CLICK' : 'PROBE';
  const stubOrHidden = !!D.STUBS[r] || r === '/documents/debug-error';

  if (p.access === 'public') {
    if (D.STUBS[r]) {
      add('anon', 'desktop', 'REDIR');
      return cells;
    }
    add('anon', 'desktop', 'CLICK');
    add('anon', 'mobile', 'CLICK');
    if (D.B_ON_PUBLIC.includes(r)) add('B', 'desktop', 'PROBE', { note: 'signed-in variant of a public page (nav / CTA state)' });
    variants('anon');
    return cells;
  }
  if (p.access === 'auth-page') {
    add('anon', 'desktop', 'CLICK');
    add('anon', 'mobile', 'CLICK');
    add('B', 'desktop', 'REDIR');
    return cells;
  }
  if (p.access === 'admin') {
    add('anon', 'desktop', 'REDIR');
    add('B', 'desktop', 'REDIR');
    add('C', 'desktop', 'REDIR', { note: 'second non-admin: guards against a cached-role bug' });
    for (const [attacker, token] of spec?.idor || []) add(attacker, 'desktop', 'REDIR', { seg: token, idor: true, note: "another user's id on an admin page" });
    return cells;
  }

  // auth + paid (enforced by the middleware, or one of the 9 bypass pages that protect themselves)
  add('anon', 'desktop', D.BYPASS_CLIENT.has(r) ? 'PROBE' : 'REDIR', D.BYPASS_CLIENT.has(r) ? { note: 'client-side-protected bypass page: HTTP 200 proves nothing, the browser must show no account data' } : {});
  if (stubOrHidden) {
    add('B', 'desktop', 'REDIR');
    if (r === '/apply') add('D', 'desktop', 'REDIR', { note: 'terms gate runs before the page stub' });
    return cells;
  }
  if (r === '/documents') {
    for (const persona of ['B', 'C', 'D']) add(persona, 'desktop', 'REDIR', { note: 'server redirect to the persona\'s own paid application' });
    return cells;
  }
  if (r.startsWith('/fdd')) {
    if (dyn) add('A', 'desktop', 'CLICK', { note: 'read-only; the only persona with FDD analyses (needs --allow-A)' });
    else {
      add('A', 'desktop', 'CLICK', { note: 'read-only (needs --allow-A)' });
      add('B', 'desktop', 'CLICK');
      add('A', 'mobile', 'PROBE');
    }
  } else {
    add('B', 'desktop', 'CLICK');
    add('B', 'mobile', mobileDepth);
    if (dyn ? spec.own.C !== undefined : D.DATA_RICH.test(r)) add('C', 'desktop', 'CLICK', { note: 'data-rich persona (populated state)' });
    const dPage = dyn ? spec.own.D !== undefined : r.startsWith('/apply') || ['/case-profile', '/simulator', '/gap-analysis'].includes(r);
    if (dPage) add('D', 'desktop', r.startsWith('/apply') ? 'REDIR' : 'CLICK', { note: 'partnership persona' });
    variants('B');
  }
  for (const [attacker, token] of spec?.idor || []) add(attacker, 'desktop', 'PROBE', { seg: token, idor: true, note: "cross-user access attempt: another persona's id" });
  return cells;
}

const pageCells = inv.pages.flatMap(planPage);
const accessOrder = { public: 0, 'auth-page': 1, auth: 2, paid: 3, admin: 4 };
const accessOf = Object.fromEntries(inv.pages.map((p) => [p.route, p.access]));
pageCells.sort((a, b) => accessOrder[accessOf[a.route]] - accessOrder[accessOf[b.route]] || a.route.localeCompare(b.route) || a.persona.localeCompare(b.persona) || a.vp.localeCompare(b.vp) || a.id.localeCompare(b.id));

/* -------------------------------------------------------------------------------------------------------- API */
const handlerKey = (m, r) => `${m} ${r}`;
const invApi = Object.fromEntries(inv.apiTable.map((a) => [a.route, a]));
const handlers = guard.rows.map((g) => ({ ...g, key: handlerKey(g.method, g.route) }));
const handlerKeys = new Set(handlers.map((h) => h.key));
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const blockOf = (route) => D.HARD_BLOCK.find(([re]) => re.test(route));

function effectFor(h) {
  if (D.GET_REVIEW[h.key]) return { effect: D.GET_REVIEW[h.key].effect, why: D.GET_REVIEW[h.key].note, src: 'GET_REVIEW' };
  const b = D.ALLOW_GET.has(h.key) ? null : blockOf(h.route);
  if (b) return { effect: b[2], why: b[1], src: 'HARD_BLOCK' };
  return { effect: READ_METHODS.has(h.method) ? 'E0' : 'E1', why: READ_METHODS.has(h.method) ? 'read-only method' : 'writes persona data', src: 'method' };
}

const probeMode = (probes) => (probes.some((q) => q.exp.kind === 'deny') ? 'live-deny' : probes.every((q) => q.exp.kind === 'status' && q.exp.in.every((s) => s === 400)) ? 'live-validation' : 'live-public');
const dynParams = (route) => [...route.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
const AUTH_E1_READS = new Set(['GET /api/case-profile/build', 'GET /api/franchise/matches', 'GET /api/renewal/intake']);

function planApi(h) {
  const a = invApi[h.route] || {};
  const { effect, why, src } = effectFor(h);
  const flags = ['userAuth', 'admin', 'cronSecret', 'webhookSig', 'rateLimit', 'killSwitch', 'serviceRole', 'turnstile', 'calledFromUI'].filter((k) => a[k]);
  const cell = {
    id: `API:${h.key}`,
    kind: 'api',
    route: h.route,
    method: h.method,
    file: h.file,
    effect,
    effectSource: src,
    flags,
    guard: { verdict: h.verdict, firstGuard: h.firstGuard, firstEffect: h.firstEffect, enforced: h.enforced, line: h.line },
    path: h.route.replace(/\[[^\]]+\]/g, D.NIL),
  };
  const probes = D.LIVE_PROBES[h.key];
  if ((a.cronSecret || a.webhookSig || a.admin) && !['E2', 'E3'].includes(effect)) fail(`EFFECT: ${h.key} is cron/webhook/admin but classed ${effect}`);
  if (probes) return { ...cell, mode: probeMode(probes), probes, why: D.PUBLIC_BY_DESIGN[h.key] || 'hand-reviewed probe: rejected before any effect' };
  if (effect === 'E2' || effect === 'E3') return { ...cell, mode: 'static', why };
  if (h.verdict === 'guard-first' && h.enforced !== false && a.userAuth) {
    const dyn = dynParams(h.route);
    const authOk = h.method === 'GET' && a.userAuth && (effect === 'E0' || AUTH_E1_READS.has(h.key)) && dyn.every((d) => d === 'applicationId') && h.key !== 'GET /api/generate/download/[applicationId]';
    return {
      ...cell,
      mode: 'live-deny',
      ...(READ_METHODS.has(h.method) ? {} : { body: '{}' }),
      exp: { kind: 'deny' },
      why: 'guard-first user-auth handler: anonymous call must be refused before any work',
      ...(authOk ? { authProbe: { persona: 'B', dyn, effect, note: effect === 'E1' ? 'E1 GET writer (derived rows) — run deliberately and disclosed' : 'own data only; no other persona id in the body' } } : {}),
    };
  }
  const reason = h.verdict === 'validation-first' ? 'validation-first handler with no reviewed probe' : h.enforced === false ? 'guard is not enforced for anonymous callers (optional / public handler) — read by hand' : 'no user-auth signal / not on the reviewed list — read by hand';
  return { ...cell, mode: 'static', why: reason };
}

const apiCells = handlers.map(planApi).sort((x, y) => x.route.localeCompare(y.route) || x.method.localeCompare(y.method));

// policy keys must resolve to real handlers
for (const k of [...Object.keys(D.GET_REVIEW), ...Object.keys(D.LIVE_PROBES), ...D.ALLOW_GET, ...Object.keys(D.PUBLIC_BY_DESIGN)]) if (!handlerKeys.has(k)) fail(`POLICY: "${k}" does not match any handler in guard-order.json`);
for (const i of D.IDOR_API) if (![...handlerKeys].some((k) => k.endsWith(` ${i.route}`))) fail(`IDOR_API: ${i.route} is not a handler`);
// every GET/HEAD handler that writes must have been reviewed by hand
for (const h of handlers) if (READ_METHODS.has(h.method) && (h.writes || []).length && !D.GET_REVIEW[h.key]) fail(`GET_REVIEW: ${h.key} writes (${h.writes.join(',')}) and has not been reviewed`);

/* ---------------------------------------------------------------------------------------------- assemble + verify */
const ids = new Set();
for (const c of [...pageCells, ...apiCells]) {
  if (ids.has(c.id)) fail(`ID: duplicate cell id ${c.id}`);
  ids.add(c.id);
}
const uncovered = inv.pages.filter((p) => !pageCells.some((c) => c.route === p.route)).map((p) => p.route);
if (uncovered.length) fail(`COVERAGE: pages with no cells: ${uncovered.join(', ')}`);
if (problems.length) {
  console.error(`\nFATAL: ${problems.length} integrity problem(s)\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

const tally = (list, f) => list.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}
const summary = {
  pagesInInventory: inv.pages.length,
  pagesCovered: new Set(pageCells.map((c) => c.route)).size,
  pageCells: pageCells.length,
  pageDepth: tally(pageCells, (c) => c.depth),
  pageByPersona: tally(pageCells, (c) => c.persona),
  pageByViewport: tally(pageCells, (c) => c.vp),
  pageByHttpLayer: tally(pageCells, (c) => c.http),
  pageByBrowserLayer: tally(pageCells.filter((c) => c.browser), (c) => c.browser),
  idorPageCells: pageCells.filter((c) => c.idor).length,
  approvalACells: pageCells.filter((c) => c.approval === 'A').length,
  apiHandlers: apiCells.length,
  apiRoutes: new Set(apiCells.map((c) => c.route)).size,
  apiByMode: tally(apiCells, (c) => c.mode),
  apiByEffect: tally(apiCells, (c) => c.effect),
  apiLiveProbes: apiCells.reduce((n, c) => n + (c.probes?.length || (c.mode === 'live-deny' ? 1 : 0)), 0),
  apiAuthProbes: apiCells.filter((c) => c.authProbe).length,
  idorApi: D.IDOR_API.length,
  ownerProbes: D.OWNER_PROBES.length,
  garbageCookie: D.GARBAGE_COOKIE.length,
  serverActions: D.SERVER_ACTIONS.length,
  journeys: D.JOURNEYS.length,
  staticChecks: D.STATIC.length,
  knownGaps: D.KNOWN_GAPS.length,
};
const meta = {
  generated: new Date().toISOString(),
  generator: 'scripts/qa/gen-matrix.mjs v2',
  gitSha,
  inventoryGenerated: inv.generated,
  guardOrderGenerated: guard.generated,
  guardOrderCounts: guard.counts,
};
const personas = D.PERSONAS;
const out = {
  summary,
  meta,
  personas,
  pageCells,
  apiCells,
  idorApi: D.IDOR_API.map((i) => ({ id: `IDOR:${i.key}`, effect: 'E0', ...i })),
  ownerProbes: D.OWNER_PROBES,
  garbageCookie: D.GARBAGE_COOKIE,
  serverActions: D.SERVER_ACTIONS,
  journeys: D.JOURNEYS,
  staticChecks: D.STATIC,
  knownGaps: D.KNOWN_GAPS,
};
writeFileSync(join(ROOT, 'docs', 'qa', 'TEST_MATRIX.json'), JSON.stringify(out, null, 1) + '\n');

/* -------------------------------------------------------------------------------------------------------- markdown */
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const expText = (e) => {
  switch (e.kind) {
    case 'redirect': return e.to ? `→ ${e.to}` : `→ ${e.toPattern} (own: ${e.ownedBy})`;
    case 'oneOf': return e.of.map(expText).join(' OR ');
    case 'status': return `status ∈ {${e.in.join(',')}}`;
    default: return e.kind;
  }
};
const L = [];
L.push('# E2go.app — Test Matrix (generated)', '');
L.push('> Generated by `scripts/qa/gen-matrix.mjs` v2 from `docs/qa/inventory.json`, `docs/qa/guard-order.json` and `scripts/qa/matrix-data.mjs`. Do not edit by hand — edit the data file and re-run.', '');
L.push(`> Generated ${meta.generated} at git ${gitSha}. Inventory ${meta.inventoryGenerated || '?'}; guard-order ${meta.guardOrderGenerated || '?'}.`, '');
L.push('## Summary (computed)', '', '| Metric | Value |', '|---|---|');
L.push(`| Pages in inventory / with ≥1 cell | ${summary.pagesInInventory} / ${summary.pagesCovered} |`);
L.push(`| Page cells | ${summary.pageCells} — ${Object.entries(summary.pageDepth).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| By persona | ${Object.entries(summary.pageByPersona).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| By viewport | ${Object.entries(summary.pageByViewport).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| HTTP layers | ${Object.entries(summary.pageByHttpLayer).map(([k, v]) => `${k} ${v}`).join(', ')} · browser: ${Object.entries(summary.pageByBrowserLayer).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| Cross-user (IDOR) page cells / persona-A cells (need --allow-A) | ${summary.idorPageCells} / ${summary.approvalACells} |`);
L.push(`| API handlers (routes) | ${summary.apiHandlers} (${summary.apiRoutes}) — mode: ${Object.entries(summary.apiByMode).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| API effect classes | ${Object.entries(summary.apiByEffect).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
L.push(`| Live anonymous probes / authenticated GET probes | ${summary.apiLiveProbes} / ${summary.apiAuthProbes} |`);
L.push(`| IDOR API / owner probes / garbage-cookie / Server Actions | ${summary.idorApi} / ${summary.ownerProbes} / ${summary.garbageCookie} / ${summary.serverActions} |`);
L.push(`| Journeys / static checks / known gaps | ${summary.journeys} / ${summary.staticChecks} / ${summary.knownGaps} |`, '');
L.push('## Personas', '', '| Key | Persona | Rule |', '|---|---|---|');
for (const [k, v] of Object.entries(personas)) L.push(`| ${k} | ${esc(v.label)} | ${esc(v.note)} |`);
L.push('', '## 1. Page cells', '', 'Depth: **CLICK** probe + click every interactive element (L5) · **PROBE** probe only (L4) · **REDIR** HTTP landing assertion only. `{X.y}` are symbolic ids resolved from the private `qa-ids.json`.', '');
let cur = '';
for (const c of pageCells) {
  const acc = accessOf[c.route];
  if (acc !== cur) {
    cur = acc;
    L.push('', `### ${acc}`, '', '| Cell id | Visit | Layer | Depth | Expected |', '|---|---|---|---|---|');
  }
  L.push(`| \`${esc(c.id)}\` | \`${esc(c.url)}\` | ${c.http}${c.browser ? `+${c.browser}` : ''} | ${c.depth}${c.approval ? ' (A)' : ''} | ${esc(expText(c.exp))}${c.note ? ` — ${esc(c.note)}` : ''} |`);
}
L.push('', '## 2. API cells (one per handler)', '', 'Mode — **static**: never sent (blocked effect class, or read by hand) · **live-deny**: anonymous, guard-first, must be refused · **live-validation**: `{}` / invalid e-mail / forged token → 400, never a valid payload · **live-public**: intentionally public. Effect: E0 read-only · E1 persona-data write · E2 e-mail / Stripe / paid LLM · E3 irreversible / financial / privileged / cron.', '', '| Handler | Effect | Mode | Guard | Why / probes | Auth probe |', '|---|---|---|---|---|---|');
for (const a of apiCells) L.push(`| \`${esc(a.method)} ${esc(a.route)}\` | ${a.effect} | ${a.mode} | ${a.guard.verdict}${a.guard.enforced === false ? ' (not enforced)' : ''} | ${esc(a.probes ? a.probes.map((q) => `${q.key}→${expText(q.exp)}`).join('; ') : a.why)} | ${a.authProbe ? 'B' + (a.authProbe.effect === 'E1' ? ' (E1)' : '') : '—'} |`);
L.push('', '## 3. Cross-owner API reads (IDOR), owner probes, forged-cookie, Server Actions', '');
for (const i of out.idorApi) L.push(`- **${i.id}** — B → \`${i.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, '<nil>')}\` (owner baseline: ${i.baseline ? 'C' : 'none'})${i.note ? ` — ${i.note}` : ''}`);
for (const o of D.OWNER_PROBES) L.push(`- **${o.id}** — ${o.persona} \`${o.path}\` (${o.effect}): ${o.why}`);
for (const g of D.GARBAGE_COOKIE) L.push(`- **${g.id}** — \`${g.path}\` with a forged session cookie → ${expText(g.exp)}`);
for (const s of D.SERVER_ACTIONS) L.push(`- **${s.id}** — \`${s.name}\` (${s.file}) — source review only: ${s.risk}`);
L.push('', '## 4. Journeys (end-to-end)', '');
for (const j of D.JOURNEYS) L.push(`- **${j.id} — ${j.title}** _(persona: ${j.persona})_`, ...j.steps.map((s) => `  - ${s}`), `  - _Boundary:_ ${j.stop}`);
L.push('', '## 5. Static / repo checks', '', '| Check | How | Pass criterion |', '|---|---|---|');
for (const [n, h, p] of D.STATIC) L.push(`| ${n} | ${esc(h)} | ${esc(p)} |`);
L.push('', '## 6. Known coverage gaps', '', '| Id | Gap | Impact | Mitigation |', '|---|---|---|---|');
for (const g of D.KNOWN_GAPS) L.push(`| ${g.id} | ${esc(g.title)} | ${esc(g.impact)} | ${esc(g.mitigation)} |`);
L.push('');
writeFileSync(join(ROOT, 'docs', 'qa', 'TEST_MATRIX.md'), L.join('\n'));

console.log(JSON.stringify({ meta, summary }, null, 1));
