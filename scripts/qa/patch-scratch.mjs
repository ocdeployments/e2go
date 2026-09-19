#!/usr/bin/env node
/**
 * QA helper — instrument a SCRATCH copy of the app with the in-page test harness.
 *
 * Touches only the scratch directory it is given (never the repo):
 *   1. copies scripts/qa/probe.js  -> <scratch>/public/qa/probe.js and writes <scratch>/public/qa/loader.js
 *   2. adds <head><script src="/qa/loader.js?v=1" /></head> to <scratch>/src/app/layout.tsx
 *      (a synchronous head script runs before the app bundle, so the write-guard and the
 *      error/LCP capture are in place before any app code executes. loader.js is a fixed 15-line stub that
 *      fetches probe.js with a unique ?t=<now> URL, so the app's cache-first service worker can never serve a
 *      stale harness and probe.js can be edited WITHOUT rebuilding the app. It runs the code through a
 *      throw-away inline <script> that is removed straight away, so React never sees an extra DOM node.)
 *   3. adds <scratch>/src/app/api/qa-collect/route.ts — a loopback-only, append-only sink so the
 *      harness can persist full per-page results to <scratch>/qa-results.ndjson without
 *      routing them through a chat context
 *
 * Idempotent: safe to run repeatedly; re-runs refresh the hash and the copied script.
 * Refuses to run against the repo root.
 *
 * Usage:  node scripts/qa/patch-scratch.mjs <scratch-dir>
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = process.argv[2] ? resolve(process.argv[2]) : '';
if (!target) { console.error('usage: node scripts/qa/patch-scratch.mjs <scratch-dir>'); process.exit(1); }
if (target === ROOT || !target.startsWith('/')) { console.error('refusing: target must be a scratch directory, not the repo'); process.exit(1); }

const layoutPath = join(target, 'src', 'app', 'layout.tsx');
if (!existsSync(layoutPath)) { console.error(`no layout at ${layoutPath} — is this a scratch copy of the app?`); process.exit(1); }

// 1 — probe.js
const probeSrc = join(ROOT, 'scripts', 'qa', 'probe.js');
const hash = createHash('sha1').update(readFileSync(probeSrc)).digest('hex').slice(0, 8);
mkdirSync(join(target, 'public', 'qa'), { recursive: true });
copyFileSync(probeSrc, join(target, 'public', 'qa', 'probe.js'));
writeFileSync(join(target, 'public', 'qa', 'loader.js'), `// SCRATCH-ONLY QA loader (written by scripts/qa/patch-scratch.mjs). Fetches the harness with a unique URL so the
// cache-first service worker cannot serve a stale copy, then runs it via a throw-away inline script.
(function () {
  try {
    var x = new XMLHttpRequest();
    x.open('GET', '/qa/probe.js?t=' + Date.now(), false);
    x.send(null);
    if (x.status !== 200) return;
    var s = document.createElement('script');
    s.text = x.responseText + '\\n//# sourceURL=/qa/probe.js';
    (document.head || document.documentElement).appendChild(s);
    s.parentNode.removeChild(s);
  } catch (e) { /* the harness simply does not load */ }
})();
`);

// 2 — layout head script
let layout = readFileSync(layoutPath, 'utf8');
// `next build` lints and @next/next/no-sync-scripts is an error, so the intentional blocking <script> carries a disable comment.
const headBlock = `<head>\n        {/* eslint-disable-next-line @next/next/no-sync-scripts */}\n        <script src="/qa/loader.js?v=1" />\n      </head>`;
const existing = /<head>\s*(?:\{\/\*[^]*?\*\/\}\s*)?<script src="\/qa\/(?:probe|loader)\.js[^"]*" \/>\s*<\/head>/;
if (existing.test(layout)) {
  layout = layout.replace(existing, headBlock);
} else {
  const m = layout.match(/(<html\b[^>]*>)(\s*)/);
  if (!m) { console.error('could not find the <html …> opening tag in the scratch layout'); process.exit(1); }
  layout = layout.replace(m[0], `${m[1]}\n      ${headBlock}${m[2].startsWith('\n') ? m[2] : '\n      '}`);
}
writeFileSync(layoutPath, layout);

// 3 — collector route (scratch only)
const routeDir = join(target, 'src', 'app', 'api', 'qa-collect');
mkdirSync(routeDir, { recursive: true });
writeFileSync(join(routeDir, 'route.ts'), `import { NextRequest, NextResponse } from 'next/server';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

// SCRATCH-ONLY QA sink (written by scripts/qa/patch-scratch.mjs — not part of the shipped app).
// Loopback hosts only, same-origin only, append-only, size-capped.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 3_000_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const host = req.headers.get('host') ?? '';
  if (!/^(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(host)) {
    return NextResponse.json({ error: 'loopback only' }, { status: 403 });
  }
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }
  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });
  try {
    JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  appendFileSync(join(process.cwd(), 'qa-results.ndjson'), text.replace(/\\n/g, ' ') + '\\n');
  return NextResponse.json({ ok: true });
}
`);

console.log(`patched ${target}`);
console.log(`  public/qa/probe.js  (sha1 ${hash}) + loader.js`);
console.log('  src/app/layout.tsx  (head script)');
console.log('  src/app/api/qa-collect/route.ts');
