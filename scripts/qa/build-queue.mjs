#!/usr/bin/env node
/**
 * QA helper — turns the browser-layer page cells of docs/qa/TEST_MATRIX.json (depth CLICK / PROBE) into autopilot queues
 * for the in-page harness (scripts/qa/probe.js: `__qa.autopilot.start(queue)`).
 *
 * One queue file per persona x viewport, chunked (default 40 items) so a chunk finishes inside one sitting and a stall
 * costs one chunk, not the whole run. REDIR cells are HTTP-layer checks (scripts/qa/run-http.mjs) and are not queued.
 *
 * Same id rules as run-http.mjs:
 *   - a persona pointed at ANOTHER persona's id is queued only on a cell the generator flagged `idor`; any other foreign id is
 *     the F-007 generator flaw and is reported, not queued;
 *   - a token that cannot be resolved is reported, not queued.
 *
 * Usage:
 *   node scripts/qa/build-queue.mjs --ids <scratch>/qa-ids.json --out <scratch>/e2go-qa/public/qa/queues [--chunk 40] [--personas anon,B,C,D] [--only <cell-id regex>] [--skip-done <collected.ndjson>] [--allow-A]
 * Output: <out>/<persona>-<vp>-<n>.json (array of queue items) and <out>/index.json (files, counts, skipped cells).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveIds } from './http-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const IDS_FILE = String(arg('ids', ''));
const OUT = String(arg('out', ''));
const CHUNK = Math.max(1, Number(arg('chunk', 40)));
const PERSONAS = String(arg('personas', 'anon,B,C,D')).split(',').filter(Boolean);
const MATRIX = resolve(String(arg('matrix', resolve(ROOT, 'docs/qa/TEST_MATRIX.json'))));
if (!IDS_FILE || !OUT) {
  console.error('usage: node scripts/qa/build-queue.mjs --ids <qa-ids.json> --out <dir> [--chunk 40] [--personas anon,B,C,D]');
  process.exit(1);
}

const matrix = JSON.parse(readFileSync(MATRIX, 'utf8'));
const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'));
const subst = resolveIds(ids);

const ALLOW_A = arg('allow-A', false) === true;
const ONLY = arg('only', null) && new RegExp(String(arg('only', '')));
const DONE_FILE = arg('skip-done', null); // a previous merged/collected results file (ndjson) — cells already run are left out
const doneCells = new Set();
if (DONE_FILE && DONE_FILE !== true) {
  for (const line of readFileSync(resolve(String(DONE_FILE)), 'utf8').split('\n')) {
    try {
      const r = JSON.parse(line);
      if (r?.cell && !/INCONCLUSIVE|RETRY/.test(String(r.verdict || ''))) doneCells.add(r.cell);
    } catch {}
  }
}

const skipped = [];
const items = new Map(); // key persona|vp -> item[]
const seen = new Set();

for (const c of matrix.pageCells) {
  if (!c.browser) continue; // HTTP-only cell (REDIR / L2-L3 probes)
  if (!PERSONAS.includes(c.persona)) continue;
  if (ONLY && !ONLY.test(c.id)) continue;
  if (doneCells.has(c.id)) continue;
  if (c.approval === 'A' && !ALLOW_A) {
    skipped.push({ cell: c.id, persona: c.persona, vp: c.vp, url: c.url, why: 'persona A (real founder account) needs --allow-A' });
    continue;
  }

  const owners = [...c.url.matchAll(/\{([ABCD])\.(\w+)\}/g)].map((m) => m[1]);
  const foreign = c.persona === 'anon' ? [] : [...new Set(owners)].filter((o) => o !== c.persona);
  // a foreign id is only legitimate on a cell the generator marked as an IDOR probe (F-007)
  if (foreign.length && !c.idor) {
    skipped.push({ cell: c.id, persona: c.persona, vp: c.vp, url: c.url, why: 'F-007: foreign id on a non-IDOR cell' });
    continue;
  }
  const url = subst(c.url);
  if (/\{[ABCD]\./.test(url)) {
    skipped.push({ cell: c.id, persona: c.persona, vp: c.vp, url: c.url, why: 'unresolved id token' });
    continue;
  }
  const key = `${c.persona}|${c.vp}|${url}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const item = {
    cell: c.id,
    url,
    label: `${c.route}${c.variant ? ` (${c.variant})` : ''}${foreign.length ? ' [cross-owner]' : ''}`,
    persona: c.persona,
    vp: c.vp,
    click: c.browser === 'L5' && c.depth === 'CLICK',
    expect: c.exp,
  };
  if (item.click) item.maxClicks = 40;
  if (foreign.length) item.cross = true;
  const k = `${c.persona}|${c.vp}`;
  if (!items.has(k)) items.set(k, []);
  items.get(k).push(item);
}

mkdirSync(OUT, { recursive: true });
const index = { generated: new Date().toISOString(), chunk: CHUNK, files: [], skipped };
for (const [k, list] of [...items.entries()].sort()) {
  const [persona, vp] = k.split('|');
  list.sort((a, b) => a.url.localeCompare(b.url));
  for (let i = 0, n = 1; i < list.length; i += CHUNK, n++) {
    const part = list.slice(i, i + CHUNK);
    const file = `${persona}-${vp}-${n}.json`;
    writeFileSync(resolve(OUT, file), JSON.stringify(part));
    index.files.push({ file, persona, vp, items: part.length, clickItems: part.filter((p) => p.click).length, cross: part.filter((p) => p.cross).length });
  }
}
writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 1));

console.log(`queued ${index.files.reduce((n, f) => n + f.items, 0)} items in ${index.files.length} files -> ${OUT}`);
for (const f of index.files) console.log(`  ${f.file.padEnd(20)} items=${String(f.items).padStart(2)} click=${String(f.clickItems).padStart(2)}${f.cross ? ` cross-owner=${f.cross}` : ''}`);
for (const s of skipped) console.log(`  SKIPPED ${s.cell} — ${s.why}`);
