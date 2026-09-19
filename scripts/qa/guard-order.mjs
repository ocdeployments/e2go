#!/usr/bin/env node
/**
 * QA helper — static guard-order analysis of every exported API handler.
 *
 * For each `route.ts` handler it records where the FIRST guard appears (auth / admin / cron secret / webhook
 * signature / Turnstile / rate limit) relative to the FIRST side-effecting or data-touching statement
 * (Supabase query, storage, outbound fetch, e-mail, Stripe, LLM call). This is what decides whether an
 * anonymous, empty-body probe may be sent to a live instance:
 *
 *   guard-first          guard precedes every effect                               -> safe to probe live
 *   validation-first     hand-verified: request is rejected (4xx) before any effect -> safe to probe with `{}` only
 *   effect-before-guard  an effect precedes the first guard                         -> FINDING, never probed live
 *   no-guard             no guard signal at all                                     -> intentionally public? reviewed by hand
 *   no-effect            neither guard nor effect visible in the handler text
 *
 * Three additions over v1 (plan review, docs/qa/PLAN_REVIEW.md):
 *   1. one-level import scan  — an effect hidden inside an imported helper (`logDocumentAccess`, `buildCaseProfile`,
 *      `callLLM` …) is now visible: `imported[]` lists each imported symbol the handler calls whose module contains an
 *      effect, and `importedBeforeGuard` says whether the call precedes the first guard.
 *   2. `writes[]`             — the real writes a handler performs (db-write / storage-write / mail / stripe / llm),
 *      directly or through an imported helper. gen-matrix.mjs derives the side-effect class of GET routes from it, so a
 *      "read-only" GET that upserts a row or spends LLM money can no longer be labelled S0 by accident.
 *   3. `enforced`             — a guard that is CALLED but whose result is never turned into a 401/403/redirect
 *      (`getUser()` with no `if (!user)`) is not a guard. Listed under `candidates.guardNotEnforced` for human review.
 *
 * Heuristic and text-based on purpose (no TypeScript AST) — its verdicts are inputs to the plan, and every
 * `effect-before-guard` / `no-guard` / candidate row is re-read by a human before it is reported as a defect.
 *
 * Usage:  node scripts/qa/guard-order.mjs            -> writes docs/qa/guard-order.json and prints a summary
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const inv = JSON.parse(readFileSync(resolve(ROOT, 'docs/qa/inventory.json'), 'utf8'));

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/** Hand-verified: these public routes reject an empty `{}` body with a 4xx before any DB / e-mail / Supabase call. */
const VALIDATION_FIRST = {
  '/api/auth/login': 'src/app/api/auth/login/route.ts L48-49: missing e-mail/password -> 400 before Turnstile and signInWithPassword',
  '/api/auth/signup': 'src/app/api/auth/signup/route.ts L47-49: missing name/e-mail/password -> 400 before Turnstile and signUp',
  '/api/auth/set-session': 'src/app/api/auth/set-session/route.ts L18-21: missing tokens -> 400 before setSession',
  '/api/early-access': 'src/app/api/early-access/route.ts L65-96: invalid e-mail/name/country/timeline -> 400 before the upsert (L98) and the welcome e-mail',
  '/api/retention/confirm-hold': 'src/app/api/retention/confirm-hold/route.ts L22-32: missing/invalid token -> 400 before any query',
  '/api/email/unsubscribe': 'src/app/api/email/unsubscribe/route.ts L28-32: forged/missing HMAC token -> 400 before the upsert',
  '/api/_sentry-tunnel': 'src/app/api/_sentry-tunnel/route.ts L26: missing DSN -> 400 before the upstream fetch',
  '/api/franchise/brand-view': 'src/app/api/franchise/brand-view/route.ts L11-13: missing brand_slug -> 400 before the service-role insert (L19). NOTE: getUser() at L16 is not a guard — the user is never required, so ANY anonymous caller with a slug writes a row (finding F-008)',
};

const GUARD = [
  ['auth', /\bgetUser\s*\(|\bgetSession\s*\(|\brequireUser\b|\brequireAuth\b|\bgetAuthedUser\b|\bgetAuthUser\s*\(|\bgetCurrentUser\s*\(|\bgetRequestingUser\s*\(|\bauthenticate\w*\s*\(|\bwith(?:Auth|User|Admin)\w*\s*\(/],
  ['admin', /\brequireAdmin\b|\bassertAdmin\b|\bgetRequestingAdmin\s*\(|role\s*!==\s*['"]admin['"]|isAdmin\w*\s*\(/],
  ['cron', /CRON_SECRET|\bverifyCron\w*\s*\(|['"]x-cron-secret['"]|isCronRequest\w*\s*\(/],
  ['webhook', /constructEvent\s*\(|stripe-signature/i],
  ['turnstile', /\bverifyTurnstile\s*\(/],
  ['rate-limit', /\bcheckRateLimit\s*\(/],
  ['kill-switch', /\bkillSwitch\w*\s*\(|\bisKilled\w*\s*\(|\bisFeatureEnabled\s*\(|\bisEnabled\s*\(/],
];

const EFFECT = [
  ['db', /\.from\s*\(|\.rpc\s*\(|\.storage\b/],
  ['mail', /new\s+Resend\b|\bresend\.|\bsend\w*Email\w*\s*\(|\bsendMail\s*\(/],
  ['stripe', /\bstripe\.(?!webhooks\.constructEvent)\w+\.\w+\s*\(/],
  ['llm', /\bopenrouter\b|\banthropic\b|\bgenerateText\s*\(|\bcallLLM\s*\(|\bchat\.completions\b|\bcallModel\w*\s*\(/i],
  ['net', /\bfetch\s*\(/],
];

/** What actually MUTATES or SPENDS (a `.from().select()` is an effect for ordering purposes but not a write). */
const WRITE = [
  ['db-write', /\.(?:insert|update|upsert|delete)\s*\(/],
  ['storage-write', /\.storage\b[\s\S]{0,120}?\.(?:upload|remove|move|copy|createSignedUploadUrl)\s*\(/],
  ['mail', /new\s+Resend\b|\bresend\.\w+\.send\s*\(|\bsend\w*Email\w*\s*\(|\bsendMail\s*\(/],
  ['stripe-object', /\bstripe\.\w+\.(?:create|update|del|cancel|confirm|capture|refund)\s*\(/],
  ['llm', /\bopenrouter\b|\banthropic\b|\bgenerateText\s*\(|\bcallLLM\s*\(|\bchat\.completions\b|\bcallModel\w*\s*\(/i],
];

/** Response-side evidence that a called guard is actually ENFORCED. */
const ENFORCED = /status:\s*40[13]\b|\bUnauthorized\b|\bForbidden\b|\bredirect\s*\(|\.status\(\s*40[13]\s*\)|new\s+Response\([^)]*40[13]/;

/** Imported symbols that are infrastructure, not business effects — never reported as imported effects. */
const BENIGN_SYMBOL = /^(create\w*Client|createServiceClient|createSupabase\w*|capture\w*|checkRateLimit|verifyTurnstile|verifyCron\w*|getRequesting\w*|getAuth\w*|getCurrent\w*|require\w*|assert\w*|log(?:Error|Warn|Info|Debug)|NextResponse|NextRequest|z|cookies|headers|redirect|notFound|Stripe|getStripe\w*|getServerEnv|env)$/;

const BODY = /\.json\s*\(\s*\)|\.formData\s*\(\s*\)|\.text\s*\(\s*\)|\.arrayBuffer\s*\(\s*\)/;

/** Slice the text of each exported handler: from its declaration to the next top-level export (or EOF). */
function handlers(src) {
  const found = [];
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+(${METHODS.join('|')})\\b|export\\s+const\\s+(${METHODS.join('|')})\\s*=`, 'g');
  let m;
  while ((m = re.exec(src))) found.push({ method: m[1] || m[2], start: m.index });
  return found.map((h, i) => {
    let text = src.slice(h.start, i + 1 < found.length ? found[i + 1].start : src.length);
    // `export const GET = rebuild;` — the handler body is the local function it aliases (src/app/api/case-profile/build/route.ts).
    const alias = /^export\s+const\s+\w+\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/.exec(text.trim());
    if (alias) {
      const decl = new RegExp(`(?:async\\s+)?function\\s+${alias[1]}\\b|const\\s+${alias[1]}\\s*=\\s*(?:async\\s*)?(?:\\(|function)`).exec(src);
      if (decl) {
        const rest = src.slice(decl.index);
        const stop = rest.slice(1).search(/\nexport\s/);
        text = stop === -1 ? rest : rest.slice(0, stop + 1);
      }
    }
    return { method: h.method, text, line: src.slice(0, h.start).split('\n').length };
  });
}

function firstIdx(text, table) {
  let best = null;
  for (const [kind, re] of table) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.at)) best = { kind, at: m.index };
  }
  return best;
}

function kindsOf(text, table) {
  return table.filter(([, re]) => re.test(text)).map(([k]) => k);
}

/* --------------------------------------------------------------------------------------------- import resolution */
function resolveModule(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = resolve(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(resolve(ROOT, fromFile)), spec);
  else return null; // npm package
  for (const cand of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base]) if (existsSync(cand) && /\.(ts|tsx)$/.test(cand)) return cand;
  return null;
}

/** symbol -> module path, for every named / default import of a local module in this file. */
function importMap(file, src) {
  const map = new Map();
  const re = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    if (/^\s*type\b/.test(m[0]) && !/[{,]/.test(m[1])) continue;
    const mod = resolveModule(file, m[2]);
    if (!mod) continue;
    const clause = m[1];
    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) for (const part of named[1].split(',')) {
      const t = part.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const local = t.split(/\s+as\s+/).pop().trim();
      map.set(local, mod);
    }
    const dflt = clause.replace(/\{[\s\S]*?\}/, '').replace(/,/g, '').trim();
    if (dflt && !dflt.startsWith('*')) map.set(dflt, mod);
    else if (dflt.startsWith('*')) map.set(dflt.replace(/^\*\s*as\s+/, ''), mod);
  }
  return map;
}

const moduleCache = new Map();
function moduleFacts(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  let facts = { effects: [], writes: [] };
  try {
    const t = readFileSync(path, 'utf8');
    facts = { effects: kindsOf(t, EFFECT), writes: kindsOf(t, WRITE) };
  } catch { /* unreadable -> no facts */ }
  moduleCache.set(path, facts);
  return facts;
}

const rel = (p) => p.replace(`${ROOT}/`, '');

/** Calls the handler makes into local modules that themselves contain an effect. */
function importedEffects(file, src, text) {
  const imports = importMap(file, src);
  const out = [];
  for (const [symbol, mod] of imports) {
    if (BENIGN_SYMBOL.test(symbol)) continue;
    const call = new RegExp(`\\b${symbol.replace(/[$]/g, '\\$')}\\s*\\(`).exec(text);
    if (!call) continue;
    const f = moduleFacts(mod);
    if (!f.effects.length && !f.writes.length) continue;
    out.push({ symbol, module: rel(mod), effects: f.effects, writes: f.writes, at: call.index });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* -------------------------------------------------------------------------------------------------------- main */
const rows = [];
for (const a of inv.apiTable) {
  let src;
  try { src = readFileSync(resolve(ROOT, a.file), 'utf8'); } catch { rows.push({ route: a.route, file: a.file, error: 'unreadable' }); continue; }
  for (const h of handlers(src)) {
    const guard = firstIdx(h.text, GUARD);
    const effect = firstIdx(h.text, EFFECT);
    const body = BODY.exec(h.text);
    const imported = importedEffects(a.file, src, h.text);
    const directWrites = kindsOf(h.text, WRITE);
    const writes = [...new Set([...directWrites, ...imported.flatMap((i) => i.writes)])];
    const enforced = guard ? ENFORCED.test(h.text.slice(guard.at)) : null;

    let verdict;
    if (VALIDATION_FIRST[a.route] && h.method === 'POST') verdict = 'validation-first';
    else if (!guard) verdict = effect || imported.length ? 'no-guard' : 'no-effect';
    else if ((!effect || guard.at < effect.at) && !imported.some((i) => i.at < guard.at && i.writes.length)) verdict = 'guard-first';
    else verdict = 'effect-before-guard';
    rows.push({
      route: a.route,
      file: a.file,
      method: h.method,
      line: h.line,
      verdict,
      firstGuard: guard ? guard.kind : null,
      firstEffect: effect ? effect.kind : null,
      enforced,
      writes,
      imported: imported.map(({ symbol, module, effects, writes: w }) => ({ symbol, module, effects, writes: w })),
      importedBeforeGuard: !!(guard && imported.some((i) => i.at < guard.at)),
      bodyBeforeGuard: !!(body && guard && body.index < guard.at),
      evidence: VALIDATION_FIRST[a.route] && h.method === 'POST' ? VALIDATION_FIRST[a.route] : undefined,
    });
  }
}

const counts = rows.reduce((acc, r) => ((acc[r.verdict || r.error] = (acc[r.verdict || r.error] || 0) + 1), acc), {});
const candidates = {
  // GET/HEAD handlers that write or spend — "HTTP-safe" is not "effect-free"; gen-matrix.mjs reclassifies S0 -> S1/S2 from this list
  getWrites: rows.filter((r) => ['GET', 'HEAD'].includes(r.method) && r.writes?.length).map((r) => ({ route: r.route, method: r.method, writes: r.writes, via: r.imported.filter((i) => i.writes.length).map((i) => `${i.symbol} (${i.module})`) })),
  // a guard is called but nothing turns its result into a 401/403/redirect
  guardNotEnforced: rows.filter((r) => r.verdict !== 'validation-first' && r.firstGuard && r.enforced === false && r.firstGuard !== 'rate-limit').map((r) => ({ route: r.route, method: r.method, guard: r.firstGuard, file: `${r.file}:${r.line}` })),
  // an imported helper with a write is called before the first guard
  importedBeforeGuard: rows.filter((r) => r.importedBeforeGuard).map((r) => ({ route: r.route, method: r.method, calls: r.imported.map((i) => i.symbol), file: `${r.file}:${r.line}` })),
};
writeFileSync(resolve(ROOT, 'docs/qa/guard-order.json'), JSON.stringify({ generated: new Date().toISOString(), counts, candidates, rows }, null, 1));

console.log('handlers analysed:', rows.length);
console.log(counts);
for (const v of ['effect-before-guard', 'no-guard']) {
  const list = rows.filter((r) => r.verdict === v);
  if (!list.length) continue;
  console.log(`\n${v} (${list.length})`);
  for (const r of list) console.log(`  ${r.method.padEnd(6)} ${r.route.padEnd(50)} guard=${r.firstGuard} effect=${r.firstEffect} ${r.file}:${r.line}`);
}
console.log(`\nGET/HEAD handlers that write or spend (${candidates.getWrites.length}) — never "S0":`);
for (const c of candidates.getWrites) console.log(`  ${c.method.padEnd(4)} ${c.route.padEnd(48)} ${c.writes.join(',')}${c.via.length ? `  via ${c.via.join('; ')}` : ''}`);
console.log(`\nguard called but not enforced — hand-review (${candidates.guardNotEnforced.length}):`);
for (const c of candidates.guardNotEnforced) console.log(`  ${c.method.padEnd(6)} ${c.route.padEnd(48)} ${c.guard.padEnd(10)} ${c.file}`);
console.log(`\nimported writing helper called before the first guard — hand-review (${candidates.importedBeforeGuard.length}):`);
for (const c of candidates.importedBeforeGuard) console.log(`  ${c.method.padEnd(6)} ${c.route.padEnd(48)} ${c.calls.join(', ')}  ${c.file}`);
