#!/usr/bin/env node
/**
 * QA helper — results summarizer for docs/qa/TEST_PLAN.md §7 (scoring) and §10 (re-run protocol).
 *
 * Turns the raw evidence of a run into per-cell verdicts, a de-duplicated findings register, the component scores, the
 * overall release-readiness score with its caps, coverage per layer and persona, confidence and the recommendation.
 * It never reads a secret and never talks to the app; it only reads files.
 *
 * Inputs
 *   --matrix  docs/qa/TEST_MATRIX.json                    (default)
 *   --ndjson  <file>[,<file>]                              browser records: probe.js autopilot -> POST /api/qa-collect -> qa-results.ndjson
 *   --http    <file-or-dir>[,…]                            run-http.mjs output (a dir = every http-*.json, oldest first; a later result
 *                                                          with the same key replaces an earlier one, so a delta run only re-states what it re-ran)
 *   --manual  <file.json>                                  evidence a script cannot produce (below)
 *   --out     <dir>                                        writes summary.json, findings.json, cells.json, REPORT_DATA.md
 *
 * MANUAL (every key optional)
 *   journeys:       [{ id:'J1', score:0-100, verdict?:'NOT_RUN', notes }]
 *   staticChecks:   [{ id:'tsc', verdict:'PASS|WARN|FAIL|NOT_RUN', note }]
 *   apiStatic:      [{ route:'/api/cron/x', verdict:'PASS|FAIL', sev?, note }]        handler-read verdicts for the `static` API cells
 *   serverActions:  [{ id:'SA1', verdict:'PASS|FAIL|NOT_RUN', sev?, note }]                         source-review verdicts (never executed)
 *   findings:       [{ id?, sev, dim, cat, title, evidence, component?:'access|pages|static|journeys', cells?:[cellId], status?:'open|fixed|ticketed', fix? }]
 *   dismissals:     [{ rule, sig?, routes?:['/pricing','/apply/*'], reason }]          false positives, after hand verification
 *   overrides:      [{ cell?:'<cell id>', key?:'<http result key>', verdict:'PASS|FAIL|INCONCLUSIVE', sev?, reason }]
 *   aliases:        { 'R-FONT': 'F-001' }                                              rule -> finding id used in the report
 *   structuralGaps: ['no admin persona', …]                                            environment / persona gaps that lower confidence
 *   env:            { gitSha, harness, build }
 *
 * Cell id = the stable `id` in TEST_MATRIX.json (`<persona>.<vp>.<route>[variant][.idor]`); run-http.mjs stamps it on every
 * result (`cell`) and probe.js stamps it on every browser record, so the HTTP and browser verdicts of one cell merge by id.
 * Effect classes (E0 read-only, E1 QA-persona writes, E2 e-mail/Stripe/paid-LLM/third party, E3 irreversible/privileged) are
 * separate from severity (S0-S4); only E0/E1 are ever executed, E2/E3 are queued for the owner.
 *
 * Scoring (as TEST_PLAN §7, with three explicit choices the plan left open):
 *   1. A page cell is scored from its findings by dimension (render 20 · content 15 · behaviour 25 · access 15 · a11y 10 ·
 *      design-lock 10 · performance 5); S0 -100 (cell capped at 40) · S1 -15 · S2 -8 · S3 -3 · S4 -1, once per rule per cell,
 *      each dimension floored at zero.
 *   2. Cells whose EXPECTED outcome is a gate (redirect, 404, denied) are not pages: they are scored in the access component
 *      (PASS 100 · FAIL by severity S0 0 / S1 40 / S2 70 / S3 90 / S4 97), together with every API / IDOR / header item.
 *   3. Only executed evidence is scored. Unexecuted cells never count as passes; they lower COVERAGE, and coverage lowers
 *      CONFIDENCE. A component with no evidence is left out and the remaining weights are renormalised (and the report says so).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const list = (v) => (v === undefined || v === true ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));

const MATRIX = resolve(String(arg('matrix', resolve(ROOT, 'docs/qa/TEST_MATRIX.json'))));
const NDJSON = list(arg('ndjson'));
const HTTP = list(arg('http'));
const MANUAL = arg('manual') === undefined ? null : resolve(String(arg('manual')));
const OUT = resolve(String(arg('out', resolve(ROOT, 'docs/qa/results'))));

const W = { render: 20, content: 15, behaviour: 25, access: 15, a11y: 10, design: 10, perf: 5 };
const DED = { S0: 100, S1: 15, S2: 8, S3: 3, S4: 1 };
const GATE_SCORE = { S0: 0, S1: 40, S2: 70, S3: 90, S4: 97 };
const SEV_RANK = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 };
const worstSev = (a, b) => (SEV_RANK[a] <= SEV_RANK[b] ? a : b);
const COMPONENT_WEIGHT = { pages: 0.5, access: 0.2, static: 0.15, journeys: 0.15 };

const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const matrix = read(MATRIX);
const manual = MANUAL && existsSync(MANUAL) ? read(MANUAL) : {};
const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => (Array.isArray(x) ? x.length : Number(x) || 0);
const clip = (s, n = 200) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const normSig = (s) => clip(String(s).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>').replace(/\d{3,}/g, '<n>').split('?')[0], 90);

/* ------------------------------------------------------------------ matrix -> cells */
const FUNNEL = /^\/(?:$|quiz|results|pricing|signup|login|case-profile|apply|documents|generate)(?:\/|$)/;

function parseExpect(e) {
  const x = e || {};
  switch (x.kind) {
    case 'ok':
      return { kind: 'ok', gate: false };
    case 'graceful':
      return { kind: 'graceful', gate: false };
    case 'redirect': {
      const target = x.to ? String(x.to).split('?')[0] : String(x.toPattern || '').replace(/^\^/, '').split('[')[0];
      return { kind: 'redirect', gate: true, path: target, soft: false };
    }
    case 'gated':
      // BYPASS_CLIENT pages answer 200 to HTTP; only the browser can show whether the page protects itself.
      return { kind: 'redirect', gate: true, path: '/login', soft: true };
    case 'notfound':
      return { kind: 'notfound', gate: true };
    case 'denied':
      return { kind: 'denied', gate: true };
    case 'oneOf':
      return { kind: 'oneOf', gate: true, of: arr(x.of).map(parseExpect) };
    default:
      return { kind: 'unknown', gate: false };
  }
}

const cells = matrix.pageCells.map((c) => ({ ...c, exp: parseExpect(c.exp), expRaw: c.exp, funnel: FUNNEL.test(c.route) }));
const byId = new Map(cells.map((c) => [c.id, c]));
const st = new Map(cells.map((c) => [c.id, { browser: null, http: [], override: null }]));

/* ------------------------------------------------------------------ browser records */
function loadNdjson(files) {
  const recs = [];
  let bad = 0;
  let other = 0;
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let j;
      try {
        j = JSON.parse(line);
      } catch {
        bad++;
        continue;
      }
      const d = j && j.kind === 'page' && j.data ? j.data : j && j.probe ? j : null;
      if (!d || !d.probe) {
        other++;
        continue;
      }
      recs.push(d);
    }
  }
  return { recs, bad, other };
}

/** Findings of one browser record against its cell. Each finding is { rule, sig, sev, dim, cat, title, evidence }. */
function evalBrowser(rec, cell) {
  const p = rec.probe || {};
  const exp = cell.exp;
  const mobile = cell.vp === 'mobile';
  const F = [];
  const add = (rule, sev, dim, cat, title, evidence, sig = '') => F.push({ rule, sig, sev, dim, cat, title, evidence: clip(evidence, 240) });

  const fin = String(rec.at || '');
  const finPath = fin.split('?')[0];
  const wantPath = String(rec.req || '').split('#')[0].split('?')[0];
  const moved = finPath !== wantPath;
  const status = p.status || null;
  const errShown = !!p.errorScreen;
  const judge = (ex) => {
    let l = { verdict: 'PASS', note: '' };
    const fail = (sev, note) => (l = { verdict: 'FAIL', sev, note });
    const inconclusive = (note, sev) => (l = { verdict: 'INCONCLUSIVE', note, sev });
    switch (ex.kind) {
      case 'ok':
        if (moved) fail(cell.access === 'public' ? 'S2' : 'S1', `expected to stay on ${wantPath}, landed on ${fin}`);
        else if (status && status >= 400) fail('S1', `HTTP ${status}`);
        break;
      case 'graceful':
        if (status && status >= 500) fail('S1', `HTTP ${status}`);
        break;
      case 'redirect':
        if (ex.path && finPath.startsWith(ex.path)) break;
        if (ex.soft && (status === 401 || status === 403)) break;
        if (ex.soft) inconclusive('not redirected — read the page: it must show a sign-in state and no account data', 'S0?');
        else fail('S1', `expected → ${ex.path}, landed on ${fin}`);
        break;
      case 'notfound':
        if (!(status === 404 || errShown)) inconclusive(`expected a 404 but status=${status} and no not-found screen — check for leaked content`, 'S0?');
        break;
      case 'denied':
        if (!(moved || status === 403 || status === 404 || errShown)) inconclusive('200 with no redirect / error screen — the API IDOR cells and a hand read decide whether data leaked', 'S0?');
        break;
      case 'oneOf': {
        const subs = ex.of.map(judge);
        l = subs.find((y) => y.verdict === 'PASS') || subs.find((y) => y.verdict === 'INCONCLUSIVE') || subs[0];
        break;
      }
      default:
        break;
    }
    return l;
  };
  const landing = judge(exp);
  if (landing.verdict === 'FAIL') add('R-LANDING', landing.sev, 'behaviour', 'Functional', 'Page did not land where the matrix expects', landing.note, exp.kind);

  // Everything below judges the page itself, so it only applies when the expected page actually rendered.
  const rendered = (exp.kind === 'ok' || exp.kind === 'graceful') && !moved;
  if (rendered) {
    if (p.blank) add('R-BLANK', 'S1', 'render', 'Functional', 'Blank page (< 40 characters of text)', `textLen=${p.textLen}`);
    if (errShown && exp.kind === 'ok') add('R-ERRSCREEN', 'S1', 'render', 'Functional', 'Error / not-found screen shown on a page expected to render', clip(p.title));
    if (p.nextOverlay) add('R-OVERLAY', 'S1', 'behaviour', 'Functional', 'Next.js error overlay present', clip(p.title));
    const o = p.overflow || {};
    if (o.x && (o.sw || 0) - (o.iw || 0) >= 2) {
      const d = (o.sw || 0) - (o.iw || 0);
      add('R-OVERFLOW', mobile && d >= 16 ? 'S2' : 'S3', 'render', 'Responsive', `Horizontal overflow at ${cell.vp}`, `${o.sw}>${o.iw}${o.top && o.top[0] ? ` (${o.top[0].s})` : ''}`, cell.vp);
    }
    for (const e of arr(p.errors).filter((x) => x.k !== 'console.warn' && !/Failed to load resource/i.test(x.m || ''))) add('R-CONSOLE', 'S2', 'behaviour', 'Functional', 'Console error / unhandled rejection', `${e.k}: ${e.m || e.src}`, normSig(e.m || e.src || e.k));
    for (const n of arr(p.net && p.net.failed).filter((x) => x.s >= 400)) add(n.s >= 500 ? 'R-NET5XX' : 'R-NET4XX', n.s >= 500 ? 'S2' : 'S3', 'behaviour', 'Functional', n.s >= 500 ? 'Request answered 5xx' : 'Request answered 4xx', `${n.m} ${n.u} → ${n.s}`, normSig(`${n.m} ${n.u} ${n.s}`));
    if (num(p.perf && p.perf.failedResources)) add('R-RESOURCE', 'S3', 'render', 'Functional', 'Static resource failed to load', p.perf.failedResources.map((r) => `${r.u} ${r.s}`).join(' | '), normSig(p.perf.failedResources[0].u));

    // structure & accessibility
    const h1 = num(p.h1);
    if (!p.blank && h1 === 0) add('R-H1', 'S3', 'a11y', 'Accessibility', 'No visible <h1>', clip(p.title));
    if (h1 > 1) add('R-H1-MULTI', 'S4', 'a11y', 'Accessibility', 'More than one <h1>', `${h1} h1 elements`);
    if (p.headings && p.headings.skips > 0) add('R-HEADING-SKIP', 'S4', 'a11y', 'Accessibility', 'Skipped heading level', `${p.headings.skips} skip(s)`);
    if (p.landmarks && !p.landmarks.main) add('R-MAIN', 'S3', 'a11y', 'Accessibility', 'No <main> landmark', '');
    if (!p.lang) add('R-LANG', 'S3', 'a11y', 'Accessibility', '<html lang> missing', '');
    if (!p.title) add('R-TITLE', 'S3', 'content', 'SEO', 'Missing <title>', '');
    if (cell.access === 'public' && !(p.meta && p.meta.description)) add('R-DESC', 'S3', 'content', 'SEO', 'Public page without a meta description', '');
    const ls = p.linkSummary || {};
    if ((ls.empty || 0) + (ls.js || 0) > 0) add('R-LINK-EMPTY', 'S3', 'behaviour', 'Functional', 'Links with an empty / "#" / javascript: href', `empty=${ls.empty || 0} js=${ls.js || 0}`);
    if (ls.unnamed) add('R-LINK-NAME', 'S3', 'a11y', 'Accessibility', 'Links without an accessible name', `${ls.unnamed} link(s)`);
    if (ls.blankNoRel) add('R-LINK-REL', 'S4', 'a11y', 'Access/Security', 'target=_blank without rel', `${ls.blankNoRel} link(s)`);
    if (num(p.buttons && p.buttons.issues)) add('R-BTN-NAME', 'S3', 'a11y', 'Accessibility', 'Buttons without an accessible name', p.buttons.issues.slice(0, 3).map((b) => b.s).join(', '));
    const issueKinds = new Map();
    for (const i of arr(p.inputs && p.inputs.issues)) for (const k of arr(i.i)) issueKinds.set(k.replace(/[:<].*$/, ''), (issueKinds.get(k.replace(/[:<].*$/, '')) || 0) + 1);
    const inputRule = { 'no-label': ['R-INPUT-LABEL', 'S3', 'a11y', 'Form control without a label'], 'placeholder-only': ['R-INPUT-LABEL', 'S3', 'a11y', 'Form control labelled only by its placeholder'], 'no-autocomplete': ['R-INPUT-AUTOCOMPLETE', 'S4', 'a11y', 'e-mail / password / tel input without autocomplete'], 'autocomplete-off-password': ['R-INPUT-PWMGR', 'S3', 'a11y', 'autocomplete=off on a password field (blocks password managers)'], short: ['R-INPUT-HEIGHT', 'S4', 'a11y', 'Form control shorter than 40 px'], 'ios-zoom-font': ['R-INPUT-IOS-ZOOM', 'S3', 'render', 'Input font < 16 px (iOS zooms on focus)'] };
    for (const [k, n] of issueKinds) {
      const r = inputRule[k];
      if (r && !(k === 'short' && !mobile)) add(r[0], r[1], r[2], 'Accessibility', r[3], `${n} control(s)`, k);
    }
    if (num(p.images && p.images.noAlt)) add('R-IMG-ALT', 'S3', 'a11y', 'Accessibility', 'Images without alt', `${num(p.images.noAlt)} image(s)`);
    if (num(p.images && p.images.broken)) add('R-IMG-BROKEN', 'S2', 'render', 'Functional', 'Broken images', `${num(p.images.broken)} image(s)`);
    const tap = p.tap || {};
    if (mobile && tap.small44 > 0) add('R-TAP', 'S3', 'a11y', 'Accessibility', 'Tap targets below 44 px on a phone', `${tap.small44}/${tap.interactive}`, 'mobile');
    if (!mobile && tap.small > 0) add('R-TAP', 'S4', 'a11y', 'Accessibility', 'Interactive targets below 24 px on desktop', `${tap.small}/${tap.interactive}`, 'desktop');
    if (num(p.clickableNonInteractive)) add('R-CLICKABLE-DIV', 'S4', 'a11y', 'Accessibility', 'Clickable non-interactive elements (not keyboard reachable)', `${num(p.clickableNonInteractive)} element(s)`);
    const c = p.contrast || {};
    if (c.failCount) add('R-CONTRAST', 'S3', 'a11y', 'Accessibility', 'Text below WCAG contrast', `${c.failCount} element(s); worst ${c.worst && c.worst[0] ? c.worst[0].r : '?'}`);

    // design lock
    const d = p.design || {};
    const fi = arr(d.fontIssues);
    if (fi.length) add('R-FONT', 'S2', 'design', 'Visual/Design-lock', 'Design font does not resolve — text renders in a fallback', fi.map((x) => `"${x.family}" ×${x.count} → ${x.fallback}`).join(' | '), fi.map((x) => x.family).sort().join(','));
    if (d.forbiddenHeadingFont) add('R-FONT-FORBIDDEN', 'S2', 'design', 'Visual/Design-lock', 'Forbidden heading font (Inter / Roboto / Space Grotesk)', d.headingFont);
    if (d.tailwindBlue) add('R-BLUE', 'S3', 'design', 'Visual/Design-lock', 'Default Tailwind blue in use', `${d.tailwindBlue} element(s)`);
    if (num(d.nonZeroRadiusControls)) add('R-RADIUS', 'S3', 'design', 'Visual/Design-lock', 'Form controls with a non-zero border-radius', `${num(d.nonZeroRadiusControls)} control(s)`);

    // content
    for (const b of arr(p.brand)) add('R-BRAND', 'S3', 'content', 'Content/Copy', 'Brand rendered with the wrong casing (must be "E2go.app")', `${b.hit} — ${clip(b.t, 80)}`, String(b.hit));
    for (const s of arr(p.suspicious)) add('R-SUSPICIOUS', /undefined|NaN|object Object|lorem|TODO|\{\{|%s/i.test(`${s.k} ${s.t}`) ? 'S2' : 'S3', 'content', 'Content/Copy', 'Suspicious text on the page', `${s.k}: ${clip(s.t, 100)}`, `${s.k}:${clip(s.t, 40)}`);

    // performance (LCP/CLS only when the document was visible; the built-in pane can be hidden)
    const pf = p.perf || {};
    if (pf.jsKB > 450) add('R-PERF-JS', 'S3', 'perf', 'Performance', 'JS over budget (450 KB on the wire)', `${pf.jsKB} KB`);
    if (pf.imgKB > 500) add('R-PERF-IMG', 'S3', 'perf', 'Performance', 'Image weight over budget (500 KB)', `${pf.imgKB} KB`);
    if (pf.visibility === 'visible' && pf.lcp && pf.lcp > 2500) add('R-PERF-LCP', 'S3', 'perf', 'Performance', 'LCP over 2.5 s', `${pf.lcp} ms`);
    else if (!pf.lcp && pf.lcpProxy && pf.lcpProxy > 2500) add('R-PERF-LCP', 'S4', 'perf', 'Performance', 'Largest image finished after 2.5 s (LCP unavailable, proxy)', `${pf.lcpProxy} ms`, 'proxy');
    if (pf.visibility === 'visible' && pf.cls > 0.1) add('R-PERF-CLS', 'S3', 'perf', 'Performance', 'Layout shift over 0.1', `CLS ${pf.cls}`);
  }

  // click-through (L5)
  const click = rec.click;
  const clickInfo = { executed: !!click, blockedWrites: 0, blockedGets: 0, dialogs: [], opens: [], noEffect: [], writes: [] };
  if (click && click.summary) click.agg = click.agg || click.summary;
  if (click && click.agg && (rendered || exp.kind === 'ok')) {
    const a = click.agg;
    clickInfo.blockedWrites = a.blockedWrites || 0;
    clickInfo.blockedGets = a.blockedGets || 0;
    const notable = arr(click.notable);
    for (const n of notable) {
      const eff = arr(n.eff);
      if (eff.some((x) => /^blocked-write:/.test(x))) clickInfo.writes.push(`${clip(n.n, 40)} → ${eff.filter((x) => /^blocked-write:/.test(x)).join(' ').slice(14, 120)}`);
      if (eff.some((x) => /^native-/.test(x))) clickInfo.dialogs.push(`${clip(n.n, 40)}: ${eff.filter((x) => /^native-/.test(x)).join(',')}`);
      if (eff.some((x) => /^window\.open→/.test(x))) clickInfo.opens.push(`${clip(n.n, 40)}: ${eff.filter((x) => /^window\.open→/.test(x)).join(',')}`);
      if (eff[0] === 'NO-EFFECT' && !n.ni) clickInfo.noEffect.push(clip(n.n, 40) || n.s);
    }
    const errs = notable.filter((n) => arr(n.eff).some((x) => /^(ERROR|FAILED-REQ)/.test(x)));
    if (errs.length) add('R-CLICK-ERR', 'S2', 'behaviour', 'Functional', 'A click produced a console error or failed request', errs.slice(0, 3).map((n) => `"${clip(n.n, 30)}": ${arr(n.eff).find((x) => /^(ERROR|FAILED-REQ)/.test(x))}`).join(' | '), normSig(arr(errs[0].eff).find((x) => /^(ERROR|FAILED-REQ)/.test(x)) || ''));
    if (clickInfo.noEffect.length) add('R-CLICK-NOEFFECT', 'S3', 'behaviour', 'Functional', 'Clickable control with no observable effect', clickInfo.noEffect.slice(0, 4).join(' | '));
    const stuck = notable.filter((n) => arr(n.eff).some((x) => /DIALOG-WONT-CLOSE|COULD-NOT-RETURN/.test(x)));
    if (stuck.length) add('R-CLICK-STUCK', 'S3', 'behaviour', 'Functional', 'Dialog would not close / could not return after a click', stuck.map((n) => clip(n.n, 30)).join(' | '));
  }
  return { landing, findings: F, click: clickInfo, meta: { ms: p.ms, flags: arr(p.flags).length, done_at: rec.done_at || rec.at_ms || 0, title: p.title || '' } };
}

/* ------------------------------------------------------------------ apply browser records */
const { recs, bad: badLines, other: otherLines } = loadNdjson(NDJSON);
const orphanRecords = [];
for (const rec of recs) {
  const id = rec.cell && byId.has(rec.cell) ? rec.cell : null;
  if (!id) {
    orphanRecords.push(rec.cell || `${rec.label}|${rec.persona}|${rec.vp}`);
    continue;
  }
  const cell = byId.get(id);
  const ev = evalBrowser(rec, cell);
  const prev = st.get(id).browser;
  if (!prev || ev.meta.done_at >= prev.meta.done_at) st.get(id).browser = { ...ev, clickWanted: cell.depth === 'CLICK' && !rec.click };
}

/* ------------------------------------------------------------------ HTTP results */
const httpResults = new Map();
const httpFileList = [];
for (const p of HTTP) {
  const abs = resolve(p);
  if (!existsSync(abs)) continue;
  if (statSync(abs).isDirectory()) for (const f of readdirSync(abs).filter((x) => /^http-.*\.json$/.test(x)).sort()) httpFileList.push(join(abs, f));
  else httpFileList.push(abs);
}
for (const f of httpFileList) {
  for (const r of arr(read(f).results)) httpResults.set(r.cell || `${r.layer}|${r.persona}|${r.method || ''}|${r.host || ''}|${r.path || ''}`, r);
}
const overrideByKey = new Map(arr(manual.overrides).filter((o) => o.key).map((o) => [o.key, o]));
for (const [key, r] of httpResults) {
  const o = overrideByKey.get(key);
  if (o) httpResults.set(key, { ...r, verdict: o.verdict, sev: o.sev || r.sev, note: `${o.reason} (hand-verified; was ${r.verdict}: ${clip(r.note, 100)})`, manual: true });
}
const apiItems = [];
for (const [key, r] of httpResults) {
  if (st.has(r.cell)) st.get(r.cell).http.push({ key, verdict: r.verdict, sev: r.sev, note: r.note || '', layer: r.layer, manual: !!r.manual });
  else if (r.layer !== 'L0') apiItems.push({ key, ...r });
}
for (const o of arr(manual.overrides).filter((x) => x.cell)) if (st.has(o.cell)) st.get(o.cell).override = o;

/* ------------------------------------------------------------------ dismissals & finding register */
const dismissals = arr(manual.dismissals);
const routeMatch = (pat, route) => (pat.endsWith('*') ? route.startsWith(pat.slice(0, -1)) : route === pat);
const dismissedFor = (f, route) => dismissals.find((d) => d.rule === f.rule && (d.sig === undefined || d.sig === f.sig) && (!arr(d.routes).length || d.routes.some((p) => routeMatch(p, route))));

const reg = new Map(); // `${rule}|${sig}` -> finding
const dismissed = [];
function register(source, f, cell) {
  const key = `${f.rule}|${f.sig}`;
  if (!reg.has(key)) reg.set(key, { key, source, rule: f.rule, sig: f.sig, sev: f.sev, dim: f.dim, cat: f.cat, title: f.title, evidence: f.evidence, cells: new Set(), routes: new Set(), personas: new Set(), vps: new Set(), status: 'open' });
  const r = reg.get(key);
  r.sev = worstSev(r.sev, f.sev);
  if (cell) {
    r.cells.add(cell.id);
    r.routes.add(cell.route);
    r.personas.add(cell.persona);
    r.vps.add(cell.vp);
  }
  return r;
}

const cellRows = [];
for (const cell of cells) {
  const s = st.get(cell.id);
  const executedBrowser = !!s.browser && (cell.depth !== 'CLICK' || !!s.browser.click.executed);
  const findings = [];
  if (s.browser) {
    for (const f of s.browser.findings) {
      const dis = dismissedFor(f, cell.route);
      if (dis) dismissed.push({ cell: cell.id, rule: f.rule, sig: f.sig, reason: dis.reason });
      else {
        findings.push(f);
        register('auto', f, cell);
      }
    }
  }
  const parts = [];
  if (s.browser) parts.push({ verdict: s.browser.landing.verdict, sev: s.browser.landing.sev, note: s.browser.landing.note, src: 'browser' });
  const browserDecided = !!s.browser && s.browser.landing.verdict !== 'INCONCLUSIVE';
  for (const h of s.http) if (['PASS', 'FAIL'].includes(h.verdict) || (h.verdict === 'INCONCLUSIVE' && !browserDecided)) parts.push({ ...h, src: 'http' });
  if (s.override) parts.push({ verdict: s.override.verdict, sev: s.override.sev, note: `${s.override.reason} (hand-verified)`, src: 'manual', authoritative: true });
  const auth = parts.find((x) => x.authoritative);
  let verdict = 'NOT_RUN';
  let sev = null;
  if (auth) {
    verdict = auth.verdict;
    sev = auth.sev || null;
  } else if (parts.length) {
    verdict = parts.some((x) => x.verdict === 'FAIL') ? 'FAIL' : parts.some((x) => x.verdict === 'INCONCLUSIVE') ? 'INCONCLUSIVE' : 'PASS';
    for (const x of parts.filter((y) => y.verdict === (verdict === 'FAIL' ? 'FAIL' : 'INCONCLUSIVE'))) sev = sev ? worstSev(sev, x.sev || 'S2') : x.sev || 'S2';
  }
  // A failed gate / landing check is a finding too (so it shows in the register), scored in the gate component.
  if (verdict === 'FAIL' && cell.exp.gate) register('gate', { rule: `GATE-${cell.exp.kind.toUpperCase()}`, sig: '', sev: sev || 'S1', dim: 'access', cat: 'Access/Security', title: `Gate check failed (${cell.exp.kind})`, evidence: parts.filter((x) => x.verdict === 'FAIL').map((x) => `${x.src}: ${clip(x.note, 120)}`).join(' | ') }, cell);
  cellRows.push({ cell, verdict, sev, findings, executed: !cell.browser ? parts.some((x) => x.src !== 'browser' && x.verdict !== 'INFO') : executedBrowser, parts, browser: s.browser });
}

// HTTP items that are not tied to a page cell (API, headers, IDOR API cells, L0/L2 checks)
for (const it of apiItems) {
  if (it.verdict === 'FAIL') register('http', { rule: `HTTP-${String(it.layer).replace(/[^A-Z0-9-]/gi, '')}`, sig: normSig(`${it.method} ${it.path}`), sev: it.sev && it.sev !== 'S0?' ? it.sev : 'S2', dim: 'access', cat: 'Access/Security', title: clip(it.note, 110) || 'HTTP check failed', evidence: `${it.persona} ${it.method || ''} ${it.path || ''} → ${it.status} ${clip(it.note, 140)}` }, null);
}

// manual findings
const manualFindings = arr(manual.findings).map((f, i) => ({ ...f, id: f.id || `M-${String(i + 1).padStart(2, '0')}` }));
const manualByCell = new Map();
for (const f of manualFindings) {
  const r = register('manual', { rule: f.id, sig: '', sev: f.sev, dim: f.dim || 'behaviour', cat: f.cat || 'Functional', title: f.title, evidence: f.evidence || '' }, null);
  r.status = f.status || 'open';
  r.fix = f.fix;
  r.component = f.component;
  for (const id of arr(f.cells)) {
    if (!byId.has(id)) continue;
    r.cells.add(id);
    r.routes.add(byId.get(id).route);
    r.personas.add(byId.get(id).persona);
    r.vps.add(byId.get(id).vp);
    if (f.status !== 'fixed' && f.status !== 'wontfix') {
      if (!manualByCell.has(id)) manualByCell.set(id, []);
      manualByCell.get(id).push({ rule: f.id, sev: f.sev, dim: f.dim || 'behaviour' });
    }
  }
}

/* ------------------------------------------------------------------ scoring */
function scoreFindings(fs) {
  const per = {};
  let s0 = false;
  for (const f of fs) {
    if (f.sev === 'S0') s0 = true;
    per[f.dim] = (per[f.dim] || 0) + (DED[f.sev] || 0);
  }
  let score = 100;
  for (const [d, v] of Object.entries(per)) score -= Math.min(v, W[d] ?? 10);
  if (s0) score = Math.min(score, 40);
  return Math.max(0, Math.round(score * 10) / 10);
}
const gateScore = (verdict, sev) => (verdict === 'PASS' ? 100 : verdict === 'FAIL' ? GATE_SCORE[sev || 'S2'] ?? 70 : null);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

for (const r of cellRows) {
  r.score = null;
  if (r.cell.exp.gate) r.score = gateScore(r.verdict, r.sev);
  else if (r.executed) r.score = scoreFindings([...r.findings, ...(manualByCell.get(r.cell.id) || [])]);
}

const pageRows = cellRows.filter((r) => !r.cell.exp.gate && r.score !== null && r.cell.depth !== 'REDIR');
const pageMean = pageRows.length ? pageRows.reduce((a, r) => a + r.score * (r.cell.funnel ? 3 : 1), 0) / pageRows.reduce((a, r) => a + (r.cell.funnel ? 3 : 1), 0) : null;

// access component: gate cells, HTTP landing checks of page cells, API items, hand-read static API cells
const accessScores = [];
const accessRows = [];
for (const r of cellRows) {
  if (r.cell.exp.gate && r.score !== null) accessScores.push(r.score), accessRows.push({ id: r.cell.id, verdict: r.verdict });
  else if (!r.cell.exp.gate && r.parts.some((x) => x.src === 'http' && (x.verdict === 'PASS' || x.verdict === 'FAIL'))) {
    const fails = r.parts.filter((x) => x.src === 'http' && x.verdict === 'FAIL');
    accessScores.push(fails.length ? gateScore('FAIL', fails.reduce((a, x) => worstSev(a, x.sev || 'S2'), 'S4')) : 100);
  }
}
for (const it of apiItems) if (it.verdict === 'PASS' || it.verdict === 'FAIL') accessScores.push(gateScore(it.verdict, it.sev && it.sev !== 'S0?' ? it.sev : 'S2'));
for (const a of [...arr(manual.apiStatic), ...arr(manual.serverActions).filter((x) => x.verdict !== 'NOT_RUN')]) accessScores.push(gateScore(a.verdict === 'FAIL' ? 'FAIL' : 'PASS', a.sev));

const globalDeduct = (component) => {
  let d = 0;
  let cap = 100;
  for (const f of reg.values()) {
    if (f.source !== 'manual' || f.component !== component || f.status === 'fixed' || f.status === 'wontfix' || f.cells.size) continue;
    if (f.sev === 'S0') cap = 40;
    d += DED[f.sev] || 0;
  }
  return { d, cap };
};
const withGlobal = (score, component) => {
  if (score === null) return null;
  const { d, cap } = globalDeduct(component);
  return Math.max(0, Math.min(cap, score - d));
};

const staticScoreOf = (v) => ({ PASS: 100, WARN: 80, FAIL: 40 }[String(v).toUpperCase()] ?? null);
const staticRows = arr(manual.staticChecks);
const staticScores = staticRows.map((s) => staticScoreOf(s.verdict)).filter((x) => x !== null);
const journeyScores = arr(manual.journeys).filter((j) => j.verdict !== 'NOT_RUN' && typeof j.score === 'number').map((j) => j.score);

const components = {
  pages: { score: withGlobal(round1(pageMean), 'pages'), n: pageRows.length },
  access: { score: withGlobal(round1(mean(accessScores)), 'access'), n: accessScores.length },
  static: { score: withGlobal(round1(mean(staticScores)), 'static'), n: staticScores.length },
  journeys: { score: withGlobal(round1(mean(journeyScores)), 'journeys'), n: journeyScores.length },
};
let wsum = 0;
let acc = 0;
const missing = [];
for (const [k, c] of Object.entries(components)) {
  if (c.score === null) missing.push(k);
  else {
    wsum += COMPONENT_WEIGHT[k];
    acc += COMPONENT_WEIGHT[k] * c.score;
  }
}
const rawOverall = wsum ? acc / wsum : null;

const open = [...reg.values()].filter((f) => f.status === 'open');
const distinctOpen = (sev) => open.filter((f) => f.sev === sev).length;
const caps = [];
let overall = rawOverall;
if (overall !== null) {
  if (distinctOpen('S0')) (caps.push({ why: `${distinctOpen('S0')} open S0`, cap: 59 }), (overall = Math.min(overall, 59)));
  if (distinctOpen('S1')) (caps.push({ why: `${distinctOpen('S1')} open S1`, cap: 79 }), (overall = Math.min(overall, 79)));
  if (distinctOpen('S2') >= 5) (caps.push({ why: `${distinctOpen('S2')} open S2 (>= 5)`, cap: 89 }), (overall = Math.min(overall, 89)));
}

/* ------------------------------------------------------------------ coverage & confidence */
const cov = { 'pages (browser) CLICK+PROBE': [0, 0], 'gates (HTTP) REDIR': [0, 0], 'API live cells': [0, 0], 'API authenticated probes': [0, 0], 'API static (handler read)': [0, 0], 'IDOR / owner / garbage-cookie probes': [0, 0], 'Server Actions (source review)': [0, 0], journeys: [0, 0], 'static checks': [0, 0] };
const covByPersona = {};
const notRun = [];
for (const r of cellRows) {
  const key = r.cell.depth === 'REDIR' ? 'gates (HTTP) REDIR' : 'pages (browser) CLICK+PROBE';
  cov[key][1]++;
  const p = (covByPersona[r.cell.persona] = covByPersona[r.cell.persona] || [0, 0]);
  p[1]++;
  const done = r.executed && r.verdict !== 'NOT_RUN';
  if (done) {
    cov[key][0]++;
    p[0]++;
  } else notRun.push({ id: r.cell.id, why: r.browser && r.cell.depth === 'CLICK' && !r.browser.click.executed ? 'probed but not clicked' : 'not executed' });
}
const okV = (i) => i.verdict === 'PASS' || i.verdict === 'FAIL';
const baseOf = (i) => String(i.cell).split('#')[0];
const anonRan = new Set(apiItems.filter((i) => okV(i) && i.persona === 'anon' && !String(i.cell).endsWith('#auth-B')).map(baseOf));
const authRan = new Set(apiItems.filter((i) => okV(i) && String(i.cell).endsWith('#auth-B')).map(baseOf));
const liveApi = matrix.apiCells.filter((c) => /^live/.test(c.mode));
cov['API live cells'] = [liveApi.filter((c) => anonRan.has(c.id)).length, liveApi.length];
const authApi = matrix.apiCells.filter((c) => c.authProbe);
cov['API authenticated probes'] = [authApi.filter((c) => authRan.has(c.id)).length, authApi.length];
const staticApi = matrix.apiCells.filter((c) => c.mode === 'static');
const staticDone = new Set(arr(manual.apiStatic).map((a) => a.route));
cov['API static (handler read)'] = [staticApi.filter((c) => staticDone.has(c.route)).length, staticApi.length];
const crossIds = [...arr(matrix.idorApi).map((i) => i.id), ...arr(matrix.ownerProbes).map((o) => o.id), ...arr(matrix.garbageCookie).map((g) => `L2-8:${g.id}`)];
const crossRan = new Set(apiItems.filter(okV).map((i) => i.cell));
cov['IDOR / owner / garbage-cookie probes'] = [crossIds.filter((i) => crossRan.has(i)).length, crossIds.length];
const saDone = (a) => arr(manual.serverActions).some((x) => x.id === a.id && x.verdict !== 'NOT_RUN');
cov['Server Actions (source review)'] = [arr(matrix.serverActions).filter(saDone).length, arr(matrix.serverActions).length];
cov.journeys = [arr(manual.journeys).filter((j) => j.verdict !== 'NOT_RUN' && typeof j.score === 'number').length, matrix.journeys.length];
cov['static checks'] = [staticRows.filter((s) => String(s.verdict).toUpperCase() !== 'NOT_RUN').length, matrix.staticChecks.length];
for (const c of liveApi) if (!anonRan.has(c.id)) notRun.push({ id: `${c.id} (${c.mode})`, why: 'not executed' });
for (const id of crossIds) if (!crossRan.has(id)) notRun.push({ id, why: 'not executed' });
for (const a of arr(matrix.serverActions)) if (!saDone(a)) notRun.push({ id: `${a.id} ${a.name}`, why: 'Server Action not reviewed' });
for (const c of matrix.journeys) if (!arr(manual.journeys).some((j) => j.id === c.id && j.verdict !== 'NOT_RUN' && typeof j.score === 'number')) notRun.push({ id: `${c.id} ${c.title}`, why: 'journey not executed' });
for (const c of matrix.staticChecks) if (!staticRows.some((s) => s.id === c[0] && String(s.verdict).toUpperCase() !== 'NOT_RUN')) notRun.push({ id: `static:${c[0]}`, why: 'not executed' });
const planned = Object.values(cov).reduce((a, x) => a + x[1], 0);
const done = Object.values(cov).reduce((a, x) => a + x[0], 0);
const coveragePct = planned ? Math.round((1000 * done) / planned) / 10 : 0;
const gaps = arr(manual.structuralGaps);
const unresolvedS0 = cellRows.filter((r) => r.verdict === 'INCONCLUSIVE' && r.sev === 'S0?').length + apiItems.filter((i) => i.verdict === 'INCONCLUSIVE' && i.sev === 'S0?').length;
const l0Fail = [...httpResults.values()].filter((r) => r.layer === 'L0' && r.verdict === 'FAIL');
let confidence = coveragePct >= 90 ? 'High' : coveragePct >= 70 ? 'Medium' : 'Low';
if (gaps.length >= 4 && confidence === 'High') confidence = 'Medium';
else if (gaps.length >= 4 && confidence === 'Medium') confidence = 'Low';
if (unresolvedS0 || l0Fail.length) confidence = 'Low';

let recommendation = 'NO SCORE (no evidence)';
if (overall !== null) {
  const sc = Math.round(overall * 10) / 10;
  if (unresolvedS0) recommendation = 'HOLD — possible S0 not yet resolved by hand verification';
  else if (distinctOpen('S0') || sc < 75) recommendation = 'NO-GO';
  else if (confidence === 'Low') recommendation = `INCOMPLETE — coverage ${coveragePct}% is too low to recommend (score ${sc} covers only what ran)`;
  else if (sc >= 90 && coveragePct >= 90 && !distinctOpen('S1')) recommendation = 'GO';
  else recommendation = 'GO with fixes';
}

/* ------------------------------------------------------------------ finding ids, output */
const aliases = manual.aliases || {};
const sorted = [...reg.values()].sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || b.cells.size - a.cells.size || a.rule.localeCompare(b.rule));
let auto = 0;
for (const f of sorted) f.id = f.source === 'manual' ? f.rule : aliases[f.rule] || `A-${String(++auto).padStart(3, '0')}`;
const findingsOut = sorted.map((f) => ({ id: f.id, sev: f.sev, rule: f.rule, sig: f.sig || undefined, dim: f.dim, cat: f.cat, title: f.title, evidence: f.evidence, source: f.source, status: f.status, scope: f.routes.size >= 8 ? 'sitewide' : f.routes.size > 1 ? 'multi-page' : f.routes.size === 1 ? 'page' : 'global', routes: f.routes.size, cells: [...f.cells].sort(), personas: [...f.personas].sort(), viewports: [...f.vps].sort(), fix: f.fix }));

const perPersona = Object.fromEntries(Object.entries(covByPersona).map(([k, v]) => [k, { executed: v[0], planned: v[1], pct: Math.round((1000 * v[0]) / v[1]) / 10 }]));
const summary = {
  generated: new Date().toISOString(),
  inputs: { matrix: MATRIX, ndjson: NDJSON, http: httpFileList, manual: MANUAL, browserRecords: recs.length, badNdjsonLines: badLines, otherNdjsonLines: otherLines, orphanRecords, env: manual.env || null },
  overall: overall === null ? null : Math.round(overall * 10) / 10,
  overallBeforeCaps: rawOverall === null ? null : Math.round(rawOverall * 10) / 10,
  caps,
  components: Object.fromEntries(Object.entries(components).map(([k, v]) => [k, { ...v, weight: COMPONENT_WEIGHT[k] }])),
  componentsMissing: missing,
  coverage: { pct: coveragePct, executed: done, planned, byLayer: Object.fromEntries(Object.entries(cov).map(([k, v]) => [k, { executed: v[0], planned: v[1], pct: v[1] ? Math.round((1000 * v[0]) / v[1]) / 10 : null }])), byPersona: perPersona },
  confidence,
  structuralGaps: gaps,
  recommendation,
  openBySeverity: Object.fromEntries(['S0', 'S1', 'S2', 'S3', 'S4'].map((s) => [s, distinctOpen(s)])),
  unresolvedPossibleS0: unresolvedS0,
  l0Failures: l0Fail.map((r) => r.note),
  verdicts: cellRows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {}),
  dismissedCount: dismissed.length,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ findings: findingsOut, dismissed }, null, 1));
writeFileSync(join(OUT, 'cells.json'), JSON.stringify(cellRows.map((r) => ({ id: r.cell.id, url: r.cell.url, expect: r.cell.expRaw, verdict: r.verdict, sev: r.sev || undefined, score: r.score, executed: r.executed, findings: r.findings.map((f) => f.rule), notes: r.parts.filter((x) => x.verdict !== 'PASS').map((x) => `${x.src}:${x.verdict}:${clip(x.note, 120)}`), click: r.browser && r.browser.click.executed ? { blockedWrites: r.browser.click.blockedWrites, blockedGets: r.browser.click.blockedGets, dialogs: r.browser.click.dialogs, opens: r.browser.click.opens, writes: r.browser.click.writes.slice(0, 6) } : undefined })), null, 1));

const md = [];
const pct = (x) => (x === null || x === undefined ? 'n/a' : `${x}`);
md.push(`# QA results — generated ${summary.generated}`, '');
md.push(`**Overall ${pct(summary.overall)} / 100** (before caps ${pct(summary.overallBeforeCaps)}) · **Coverage ${coveragePct} %** · **Confidence ${confidence}** · **${recommendation}**`, '');
if (caps.length) md.push(`Caps applied: ${caps.map((c) => `${c.why} → ≤ ${c.cap}`).join('; ')}`, '');
if (missing.length) md.push(`> Not measured (weights renormalised): ${missing.join(', ')}`, '');
if (unresolvedS0) md.push(`> ${unresolvedS0} possible S0 item(s) need hand verification — the score is not final until they are resolved.`, '');
md.push('> Effect classes: only E0 (read-only) and E1 (QA-persona writes) were executed; E2 (e-mail / Stripe / paid LLM / third party) and E3 (irreversible / privileged / cron) are listed for the owner and never sent. Severity (S0-S4) is scored separately from effect class.', '');
md.push('## Components', '', '| component | weight | score | evidence items |', '|---|---|---|---|');
for (const [k, v] of Object.entries(summary.components)) md.push(`| ${k} | ${v.weight} | ${pct(v.score)} | ${v.n} |`);
md.push('', '## Coverage', '', '| layer | executed | planned | % |', '|---|---|---|---|');
for (const [k, v] of Object.entries(summary.coverage.byLayer)) md.push(`| ${k} | ${v.executed} | ${v.planned} | ${pct(v.pct)} |`);
md.push('', '| persona | executed | planned | % |', '|---|---|---|---|');
for (const [k, v] of Object.entries(perPersona)) md.push(`| ${k} | ${v.executed} | ${v.planned} | ${v.pct} |`);
md.push('', `Open findings by severity: ${Object.entries(summary.openBySeverity).map(([k, v]) => `${k}=${v}`).join(' ')}`, '', '## Findings register', '', '| id | sev | scope | cells | title | evidence |', '|---|---|---|---|---|---|');
for (const f of findingsOut) md.push(`| ${f.id} | ${f.sev}${f.status !== 'open' ? ` (${f.status})` : ''} | ${f.scope} (${f.routes}) | ${f.cells.length} | ${f.title.replace(/\|/g, '/')} | ${clip(f.evidence, 140).replace(/\|/g, '/')} |`);
if (dismissed.length) md.push('', `Dismissed after hand verification: ${dismissed.length} cell finding(s) — ${[...new Set(dismissed.map((d) => `${d.rule}: ${d.reason}`))].join('; ')}`);
const low = pageRows.slice().sort((a, b) => a.score - b.score).slice(0, 25);
md.push('', '## Lowest-scoring page cells', '', '| score | cell | findings |', '|---|---|---|');
for (const r of low) md.push(`| ${r.score} | ${r.cell.id} | ${r.findings.map((f) => f.rule).join(', ')} |`);
const needs = cellRows.filter((r) => r.verdict === 'INCONCLUSIVE');
if (needs.length || apiItems.some((i) => i.verdict === 'INCONCLUSIVE')) {
  md.push('', '## Needs hand verification', '');
  for (const r of needs) md.push(`- ${r.cell.id} — ${r.parts.filter((x) => x.verdict === 'INCONCLUSIVE').map((x) => clip(x.note, 140)).join(' | ')}`);
  for (const i of apiItems.filter((x) => x.verdict === 'INCONCLUSIVE')) md.push(`- ${i.layer} ${i.persona} ${i.path || ''} — ${clip(i.note, 140)}`);
}
const writes = cellRows.filter((r) => r.browser && r.browser.click.executed && (r.browser.click.writes.length || r.browser.click.dialogs.length || r.browser.click.opens.length));
if (writes.length) {
  md.push('', '## Click-through appendix (blocked writes · native dialogs · window.open)', '');
  for (const r of writes) md.push(`- ${r.cell.id}: ${[...r.browser.click.writes.slice(0, 3), ...r.browser.click.dialogs.slice(0, 2).map((d) => `dialog ${d}`), ...r.browser.click.opens.slice(0, 2).map((o) => `open ${o}`)].join(' · ')}`);
}
md.push('', `## Not executed (${notRun.length})`, '');
const groups = new Map();
for (const n of notRun) groups.set(n.why, [...(groups.get(n.why) || []), n.id]);
for (const [why, ids] of groups) md.push(`- **${why}** (${ids.length}): ${ids.slice(0, 40).join('; ')}${ids.length > 40 ? ` … +${ids.length - 40} more (see cells.json)` : ''}`);
if (gaps.length) md.push('', '## Structural gaps', '', ...gaps.map((g) => `- ${g}`));
if (badLines || orphanRecords.length || otherLines) md.push('', `> Input notes: ${badLines} unparsable NDJSON line(s), ${otherLines} non-page line(s), ${orphanRecords.length} record(s) that match no matrix cell${orphanRecords.length ? ` (${orphanRecords.slice(0, 5).join('; ')})` : ''}.`);
writeFileSync(join(OUT, 'REPORT_DATA.md'), md.join('\n') + '\n');

console.log(`overall ${pct(summary.overall)} (before caps ${pct(summary.overallBeforeCaps)}) · coverage ${coveragePct}% · confidence ${confidence} · ${recommendation}`);
console.log(`components: ${Object.entries(summary.components).map(([k, v]) => `${k}=${pct(v.score)}(${v.n})`).join('  ')}`);
console.log(`verdicts: ${JSON.stringify(summary.verdicts)}  findings: ${findingsOut.length} (open ${JSON.stringify(summary.openBySeverity)})  browser records: ${recs.length}  http results: ${httpResults.size}`);
console.log(`wrote ${OUT}/{summary.json,findings.json,cells.json,REPORT_DATA.md}`);
