#!/usr/bin/env node
/**
 * QA audit inventory generator.
 *
 * Statically enumerates every page route, the interactive elements each page
 * renders (links, buttons, forms, inputs), the API endpoints it calls, and
 * cross-checks every internal link / fetch target against the real route
 * tables. The output is the concrete "what are we testing" list that a QA pass
 * is planned against — re-run it before each test cycle so the plan never
 * drifts from the code.
 *
 *   node scripts/qa-audit-inventory.mjs
 *
 * Writes:
 *   docs/qa/inventory.json        machine-readable, full detail
 *   docs/qa/INVENTORY.md          access matrix, static findings, API table
 *   docs/qa/INVENTORY_DETAIL.md   per-page link / button / form listing
 *
 * Static analysis only: it reads the TypeScript AST and never executes app
 * code, touches the network, or reads .env files. Conditional rendering,
 * data-driven lists and runtime state are flagged, not resolved — the live
 * test pass owns those.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const APP = path.join(SRC, 'app');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'docs', 'qa');

const SKIP_FILE = /(__tests__|\.test\.|\.spec\.|\.d\.ts$)/;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// ─── filesystem helpers ──────────────────────────────────────────────────
function walk(dir, keep, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, keep, acc);
    else if (keep(full)) acc.push(full);
  }
  return acc;
}
const rel = (f) => path.relative(ROOT, f);
const oneLine = (s, n = 90) => String(s).replace(/\s+/g, ' ').trim().slice(0, n);

// ─── route tables ────────────────────────────────────────────────────────
function routeOf(file) {
  const segs = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter(Boolean)
    .filter((s) => !/^\(.*\)$/.test(s));
  return '/' + segs.join('/');
}

function routeRegex(route) {
  if (route === '/') return /^\/$/;
  const body = route
    .split('/')
    .map((seg) => {
      if (/^\[\[\.\.\..+\]\]$/.test(seg)) return '(?:.*)';
      if (/^\[\.\.\..+\]$/.test(seg)) return '.+';
      if (/^\[.+\]$/.test(seg)) return '[^/]+';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp('^' + body + '/?$');
}

const pageFiles = walk(APP, (f) => path.basename(f) === 'page.tsx').sort();
const apiFiles = walk(APP, (f) => path.basename(f) === 'route.ts').sort();
const publicFiles = new Set(
  walk(PUBLIC_DIR, () => true).map((f) => '/' + path.relative(PUBLIC_DIR, f).split(path.sep).join('/')),
);

const pageRoutes = pageFiles.map((file) => ({ route: routeOf(file), file, re: routeRegex(routeOf(file)) }));
// route.ts handlers that live outside /api (auth callback, dev previews) are page-like URLs
const handlerRoutes = apiFiles.map((file) => ({ route: routeOf(file), file, re: routeRegex(routeOf(file)) }));
const apiRoutes = handlerRoutes.filter((r) => r.route.startsWith('/api/'));
const otherHandlers = handlerRoutes.filter((r) => !r.route.startsWith('/api/'));
const allRoutes = [...pageRoutes, ...handlerRoutes];

/** Resolve a path-like string against every route table. */
function resolvePath(raw, { templated = false } = {}) {
  const p = raw.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/') return { kind: 'page' };
  if (p.startsWith('/_next') || p === '/favicon.ico') return { kind: 'next' };
  if (publicFiles.has(p)) return { kind: 'public' };
  // A trailing slash on the raw literal means "prefix", e.g. pathname.startsWith('/apply/').
  if (raw.endsWith('/') && allRoutes.some((r) => r.route.startsWith(p + '/') || r.route === p)) {
    return { kind: 'prefix' };
  }
  if (templated) {
    const re = new RegExp(
      '^' + p.split('/').map((seg) => (seg.includes('\u0000') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '/?$',
    );
    const hit = allRoutes.find((r) => re.test(r.route));
    if (hit) return { kind: apiRoutes.includes(hit) ? 'api' : 'page', route: hit.route };
    return { kind: 'unresolved' };
  }
  const page = pageRoutes.find((r) => r.re.test(p));
  if (page) return { kind: 'page', route: page.route };
  const api = handlerRoutes.find((r) => r.re.test(p));
  if (api) return { kind: 'api', route: api.route };
  return { kind: 'unresolved' };
}

// ─── middleware gate model (parsed from src/middleware.ts) ───────────────
const middlewareSrc = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf8');
function arrayLiteral(name) {
  const m = middlewareSrc.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}
const AUTH_ROUTES = arrayLiteral('AUTH_ROUTES');
const PAID_ROUTES = arrayLiteral('PAID_ROUTES');
const AUTH_PAGES = arrayLiteral('AUTH_PAGES');
const gatedBody = (middlewareSrc.match(/function isExistingGatedPath[\s\S]*?\n}\n/) || [''])[0];
const gatedExact = [...gatedBody.matchAll(/pathname === '([^']+)'/g)].map((m) => m[1]);
const gatedPrefix = [...gatedBody.matchAll(/pathname\.startsWith\('([^']+)'\)/g)].map((m) => m[1]);
const isGatedByMiddleware = (p) => gatedExact.includes(p) || gatedPrefix.some((x) => p.startsWith(x));

// `AUTH_ROUTES` carries trailing slashes ('/documents/', '/franchise/'); the bare route is the same
// section, so it is classified with it. Whether the middleware actually *enforces* the bare route is a
// separate question, answered by isGatedByMiddleware() below.
const stripSlash = (r) => (r.length > 1 && r.endsWith('/') ? r.slice(0, -1) : r);
const inSection = (route, entry) => route === stripSlash(entry) || route.startsWith(stripSlash(entry) + '/');
function accessClass(route) {
  if (route === '/admin' || route.startsWith('/admin/')) return 'admin';
  if (PAID_ROUTES.some((r) => inSection(route, r))) return 'paid';
  if (AUTH_ROUTES.some((r) => inSection(route, r))) return 'auth';
  if (AUTH_PAGES.includes(route)) return 'auth-page';
  return 'public';
}

// ─── AST analysis ────────────────────────────────────────────────────────
const analysisCache = new Map();

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base + '.tsx', base + '.ts', path.join(base, 'index.tsx'), path.join(base, 'index.ts'), base]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function strValue(sf, node) {
  if (!node) return { kind: 'dynamic', text: '' };
  if (ts.isParenthesizedExpression(node)) return strValue(sf, node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: 'static', value: node.text };
  if (ts.isTemplateExpression(node)) {
    let s = node.head.text;
    for (const span of node.templateSpans) s += '\u0000' + span.literal.text;
    return { kind: 'template', value: s, text: node.getText(sf).slice(0, 100) };
  }
  return { kind: 'dynamic', text: oneLine(node.getText(sf), 100) };
}
const shown = (v) => (v.kind === 'dynamic' ? `{${v.text}}` : v.value.replace(/\u0000/g, '{…}'));

function attrMap(sf, attrs) {
  const map = {};
  for (const p of attrs.properties) {
    if (ts.isJsxSpreadAttribute(p)) {
      map['...'] = { kind: 'spread', text: oneLine(p.expression.getText(sf), 60) };
      continue;
    }
    const name = p.name.getText(sf);
    const init = p.initializer;
    if (!init) map[name] = { kind: 'static', value: true };
    else if (ts.isStringLiteral(init)) map[name] = { kind: 'static', value: init.text };
    else if (ts.isJsxExpression(init) && init.expression) map[name] = strValue(sf, init.expression);
  }
  return map;
}

function labelOf(sf, opening) {
  const parent = opening.parent;
  if (!ts.isJsxElement(parent)) return '';
  const parts = [];
  const collect = (n) => {
    if (ts.isJsxText(n)) parts.push(n.text);
    else if (ts.isJsxExpression(n) && n.expression) {
      const v = strValue(sf, n.expression);
      parts.push(v.kind === 'static' ? v.value : `{${oneLine(n.expression.getText(sf), 36)}}`);
    } else if (ts.isJsxElement(n)) n.children.forEach(collect);
  };
  parent.children.forEach(collect);
  return oneLine(parts.join(' '));
}

function ctxOf(node) {
  let inMap = false;
  let conditional = false;
  let inLabel = false;
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && /\.map$/.test(p.expression.getText())) inMap = true;
    if (ts.isConditionalExpression(p)) conditional = true;
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) conditional = true;
    // An <input> nested in a <label> is programmatically labelled by that label's text.
    if (ts.isJsxElement(p) && /^(label|Label)$/.test(p.openingElement.tagName.getText())) inLabel = true;
  }
  return { inMap, conditional, inLabel };
}

const BRAND_BAD = /\bE2Go\b|\bE2GO\b|\be2GO\b|E2\s?Pathway/;
const BRAND_BARE = /(^|[^@\w./:-])e2go(?![\w.@/:-])/;
const TODO_TEXT = /\b(TODO|FIXME|TBD|lorem ipsum|coming soon)\b/i;
const PATH_LITERAL = /^\/[A-Za-z][A-Za-z0-9_\-[\]./\u0000]*(\?[^\s]*)?$/;

function analyze(file) {
  if (analysisCache.has(file)) return analysisCache.get(file);
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const a = {
    file: rel(file),
    client: /^\s*['"]use client['"]/.test(text),
    server: /^\s*['"]use server['"]/.test(text),
    imports: [],
    methods: [],
    metadata: null,
    links: [],
    buttons: [],
    clickables: [],
    forms: [],
    inputs: [],
    imgs: [],
    fetches: [],
    nav: [],
    authCalls: [],
    dialogs: [],
    downloads: [],
    storage: [],
    dangerousHtml: [],
    brand: [],
    todo: [],
    pathLiterals: [],
    gateHooks: [],
  };
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const noteText = (str, n) => {
    if (BRAND_BAD.test(str) || BRAND_BARE.test(str)) a.brand.push({ line: line(n), text: oneLine(str, 80) });
  };

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const r = resolveImport(file, node.moduleSpecifier.text);
      if (r && !SKIP_FILE.test(r)) a.imports.push(r);
    }

    if (ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (HTTP_METHODS.includes(node.name.text)) a.methods.push(node.name.text);
      if (node.name.text === 'generateMetadata') a.metadata = { title: '(dynamic)', dynamic: true };
    }
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const d of node.declarationList.declarations) {
        const name = d.name.getText(sf);
        if (HTTP_METHODS.includes(name)) a.methods.push(name);
        if (name === 'metadata' && d.initializer && ts.isObjectLiteralExpression(d.initializer)) {
          const t = d.initializer.properties.find((p) => p.name && p.name.getText(sf) === 'title');
          let title = '(none)';
          if (t && ts.isPropertyAssignment(t)) {
            const v = t.initializer;
            if (ts.isObjectLiteralExpression(v)) {
              const inner = v.properties.find((p) => p.name && ['absolute', 'default'].includes(p.name.getText(sf)));
              title = inner && ts.isPropertyAssignment(inner) ? shown(strValue(sf, inner.initializer)) : '(object)';
            } else title = shown(strValue(sf, v));
          }
          a.metadata = { title };
        }
      }
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const at = attrMap(sf, node.attributes);
      const ctx = ctxOf(node);
      const base = { line: line(node), tag, ...ctx };
      const label = labelOf(sf, node);
      const ariaLabel = at['aria-label'] ? shown(at['aria-label']) : '';

      const hrefAttr = at.href || at.to;
      if (hrefAttr) {
        const v = hrefAttr;
        const href = v.kind === 'spread' ? '' : shown(v);
        a.links.push({
          ...base,
          href,
          hrefKind: v.kind,
          label: label || ariaLabel,
          hasName: Boolean(label || ariaLabel),
          blank: at.target && at.target.value === '_blank',
          rel: at.rel ? shown(at.rel) : '',
          download: Boolean(at.download),
          external: /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href),
        });
      } else {
        for (const [k, v] of Object.entries(at)) {
          if (/(Href|Url|Link)$/.test(k) && v.kind !== 'spread') {
            const s = shown(v);
            if (/^(\/|https?:|mailto:|tel:)/.test(s)) a.links.push({ ...base, href: s, hrefKind: v.kind, label: label || ariaLabel, prop: k, hasName: true, external: !s.startsWith('/') });
          }
        }
      }

      const isButton = tag === 'button' || /Button$/.test(tag) || (tag === 'input' && at.type && ['submit', 'button'].includes(at.type.value)) || (at.role && at.role.value === 'button');
      if (isButton) {
        a.buttons.push({
          ...base,
          label: label || ariaLabel || (at.value ? shown(at.value) : ''),
          hasName: Boolean(label || ariaLabel || at.value),
          type: at.type ? shown(at.type) : tag === 'button' ? 'submit(default)' : '',
          onClick: at.onClick ? oneLine(shown(at.onClick), 50) : '',
          disabled: at.disabled ? oneLine(shown(at.disabled), 40) : '',
        });
      } else if (at.onClick && !hrefAttr && !['input', 'select', 'label', 'textarea', 'summary'].includes(tag)) {
        a.clickables.push({ ...base, label, onClick: oneLine(shown(at.onClick), 50), role: at.role ? shown(at.role) : '', tabIndex: Boolean(at.tabIndex), keyboard: Boolean(at.onKeyDown || at.onKeyPress || at.onKeyUp) });
      }

      if (tag === 'form') a.forms.push({ ...base, onSubmit: at.onSubmit ? oneLine(shown(at.onSubmit), 50) : '', action: at.action ? oneLine(shown(at.action), 50) : '', method: at.method ? shown(at.method) : '' });
      if (['input', 'textarea', 'select'].includes(tag) || /^(Input|Textarea|Select|TextField|TextArea)$/.test(tag)) {
        a.inputs.push({
          ...base,
          type: at.type ? shown(at.type) : tag === 'input' ? 'text(default)' : tag,
          name: at.name ? shown(at.name) : '',
          id: at.id ? shown(at.id) : '',
          required: Boolean(at.required),
          hasLabel: Boolean(at['aria-label'] || at['aria-labelledby'] || at.id || ctx.inLabel),
          placeholder: at.placeholder ? oneLine(shown(at.placeholder), 40) : '',
          autoComplete: at.autoComplete ? shown(at.autoComplete) : '',
        });
      }
      if (tag === 'img' || tag === 'Image') a.imgs.push({ ...base, hasAlt: Boolean(at.alt), src: at.src ? oneLine(shown(at.src), 50) : '' });
      if (at.dangerouslySetInnerHTML) a.dangerousHtml.push({ line: base.line, tag });

      for (const key of ['title', 'aria-label', 'placeholder', 'alt', 'label']) {
        if (at[key] && at[key].kind === 'static' && typeof at[key].value === 'string') noteText(at[key].value, node);
      }
    }

    if (ts.isJsxText(node)) {
      const t = node.text.replace(/\s+/g, ' ').trim();
      if (t) {
        noteText(t, node);
        if (TODO_TEXT.test(t)) a.todo.push({ line: line(node), text: oneLine(t, 80) });
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      const arg0 = node.arguments[0];
      if (callee === 'fetch' && arg0) {
        let method = 'GET';
        const opt = node.arguments[1];
        if (opt && ts.isObjectLiteralExpression(opt)) {
          const m = opt.properties.find((p) => p.name && p.name.getText(sf) === 'method');
          if (m && ts.isPropertyAssignment(m)) method = shown(strValue(sf, m.initializer)).toUpperCase();
        }
        a.fetches.push({ line: line(node), url: strValue(sf, arg0), method });
      } else if (/(^|\.)router\.(push|replace)$/.test(callee) || /^(redirect|permanentRedirect)$/.test(callee)) {
        a.nav.push({ line: line(node), via: callee, target: strValue(sf, arg0) });
      } else if (/^(window\.)?open$/.test(callee)) {
        a.nav.push({ line: line(node), via: 'window.open', target: strValue(sf, arg0) });
      } else if (/(^|\.)auth\.(signInWithPassword|signInWithOtp|signInWithOAuth|signUp|signOut|resetPasswordForEmail|updateUser|exchangeCodeForSession|setSession|verifyOtp|getUser|getSession|resend)$/.test(callee)) {
        a.authCalls.push({ line: line(node), call: callee.replace(/^.*\.auth\./, 'auth.') });
      } else if (/^(window\.)?(alert|confirm|prompt)$/.test(callee)) {
        a.dialogs.push({ line: line(node), kind: callee.replace('window.', '') });
      } else if (/createObjectURL$/.test(callee) || /^window\.print$/.test(callee)) {
        a.downloads.push({ line: line(node), via: callee });
      } else if (/^(window\.)?(localStorage|sessionStorage)\.(getItem|setItem|removeItem)$/.test(callee)) {
        a.storage.push({ line: line(node), op: callee.replace('window.', ''), key: arg0 ? shown(strValue(sf, arg0)) : '' });
      }
      const hook = callee.match(/^use[A-Z]\w*(Gate|Auth|Session|User)\w*$/);
      if (hook) a.gateHooks.push(hook[0]);
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (/^(window\.)?location(\.href)?$/.test(node.left.getText(sf))) {
        a.nav.push({ line: line(node), via: 'location.href =', target: strValue(sf, node.right) });
      }
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      const v = strValue(sf, node);
      if (v.kind === 'static' || v.kind === 'template') {
        if (PATH_LITERAL.test(v.value) && v.value.length < 140) a.pathLiterals.push({ line: line(node), value: v.value, templated: v.kind === 'template' });
        if (node.parent && !ts.isJsxAttribute(node.parent)) {
          const s = v.kind === 'static' ? v.value : v.value.replace(/\u0000/g, ' ');
          if (/\s/.test(s) && /\bE2Go\b|\bE2GO\b|\be2GO\b|E2\s?Pathway/.test(s)) a.brand.push({ line: line(node), text: oneLine(s, 80) });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  a.imports = [...new Set(a.imports)];
  a.methods = [...new Set(a.methods)];
  analysisCache.set(file, a);
  return a;
}

// ─── closures: page → the component files that render for it ─────────────
function closureOf(entry, exclude = new Set(), maxDepth = 6) {
  const seen = new Set([entry]);
  const order = [entry];
  const queue = [[entry, 0]];
  while (queue.length) {
    const [f, depth] = queue.shift();
    if (depth >= maxDepth) continue;
    for (const imp of analyze(f).imports) {
      if (seen.has(imp) || exclude.has(imp) || !imp.endsWith('.tsx') || path.basename(imp) === 'page.tsx') continue;
      seen.add(imp);
      order.push(imp);
      queue.push([imp, depth + 1]);
    }
  }
  return order;
}

function layoutChain(pageFile) {
  const dirs = path.relative(APP, path.dirname(pageFile)).split(path.sep).filter(Boolean);
  const chain = [];
  let cur = APP;
  const root = path.join(cur, 'layout.tsx');
  if (fs.existsSync(root)) chain.push(root);
  for (const d of dirs) {
    cur = path.join(cur, d);
    const l = path.join(cur, 'layout.tsx');
    if (fs.existsSync(l)) chain.push(l);
  }
  return chain;
}

const merge = (files, key) => files.flatMap((f) => analyze(f)[key].map((x) => ({ ...x, src: rel(f) })));

// Shell (layout) closures — computed once, in parent → child order.
const shellFiles = new Map(); // layout file → closure files not owned by a parent layout
const shellClaimed = new Set();
for (const l of walk(APP, (f) => path.basename(f) === 'layout.tsx').sort((x, y) => x.split(path.sep).length - y.split(path.sep).length)) {
  const files = closureOf(l, shellClaimed);
  files.forEach((f) => shellClaimed.add(f));
  shellFiles.set(l, files);
}

// Which layouts render the shared <Nav>? Computed from each layout's own (unclaimed) import closure, so
// the parent-claims-first bookkeeping above cannot hide it from a child page.
const navByLayout = new Map();
for (const l of shellFiles.keys()) {
  navByLayout.set(l, closureOf(l, new Set(), 4).some((f) => path.basename(f) === 'Nav.tsx'));
}

const pages = pageFiles.map((file) => {
  const route = routeOf(file);
  const chain = layoutChain(file);
  const hasNav = chain.some((l) => navByLayout.get(l));
  const exclude = new Set(chain.flatMap((l) => shellFiles.get(l) || []));
  const files = closureOf(file, exclude);
  const own = analyze(file);
  const titleSource = [...chain.slice().reverse().map((l) => ({ src: rel(l), m: analyze(l).metadata })), { src: rel(file), m: own.metadata }].filter((x) => x.m);
  const gateHooks = [...new Set(files.flatMap((f) => analyze(f).gateHooks))];
  const authCalls = [...new Set(merge(files, 'authCalls').map((c) => c.call))];
  const cls = accessClass(route);
  return {
    route,
    file: rel(file),
    access: cls,
    enforcedByMiddleware: cls === 'public' ? null : isGatedByMiddleware(route),
    layouts: chain.map(rel),
    hasNav,
    clientComponent: own.client,
    title: titleSource.length ? titleSource[titleSource.length - 1].m.title : null,
    titleFrom: titleSource.length ? titleSource[titleSource.length - 1].src : null,
    pageLevelAuth: [...new Set([...gateHooks, ...authCalls])],
    files: files.map(rel),
    links: merge(files, 'links'),
    buttons: merge(files, 'buttons'),
    clickables: merge(files, 'clickables'),
    forms: merge(files, 'forms'),
    inputs: merge(files, 'inputs'),
    imgs: merge(files, 'imgs'),
    fetches: merge(files, 'fetches'),
    nav: merge(files, 'nav'),
    dialogs: merge(files, 'dialogs'),
    downloads: merge(files, 'downloads'),
    storage: merge(files, 'storage'),
    dangerousHtml: merge(files, 'dangerousHtml'),
  };
});

const shells = [...shellFiles.entries()].map(([layout, files]) => ({
  layout: rel(layout),
  files: files.map(rel),
  links: merge(files, 'links'),
  buttons: merge(files, 'buttons'),
  inputs: merge(files, 'inputs'),
  fetches: merge(files, 'fetches'),
}));

// ─── whole-source scans (path literals, brand casing) ────────────────────
const allSource = walk(SRC, (f) => /\.(ts|tsx)$/.test(f) && !SKIP_FILE.test(f)).sort();
const literalRefs = [];
const brandHits = [];
const todoHits = [];
for (const f of allSource) {
  const a = analyze(f);
  a.pathLiterals.forEach((p) => literalRefs.push({ ...p, file: a.file }));
  a.brand.forEach((b) => brandHits.push({ ...b, file: a.file }));
  a.todo.forEach((b) => todoHits.push({ ...b, file: a.file }));
}

const referenced = new Set();
const unresolvedPaths = new Map();
for (const ref of literalRefs) {
  const r = resolvePath(ref.value, { templated: ref.templated });
  if (r.route) referenced.add(r.route);
  if (r.kind === 'unresolved') {
    const k = ref.value.replace(/\u0000/g, '{…}');
    if (!unresolvedPaths.has(k)) unresolvedPaths.set(k, []);
    unresolvedPaths.get(k).push(`${ref.file}:${ref.line}`);
  }
}
const unresolvedFetch = [];
for (const p of pages) {
  for (const f of p.fetches) {
    if (f.url.kind === 'dynamic') continue;
    const r = resolvePath(f.url.value, { templated: f.url.kind === 'template' });
    if (r.route) referenced.add(r.route);
    if (r.kind === 'unresolved' && f.url.value.startsWith('/')) unresolvedFetch.push({ page: p.route, url: shown(f.url), src: `${f.src}:${f.line}` });
  }
}
for (const s of shells) for (const f of s.fetches) {
  if (f.url.kind === 'dynamic') continue;
  const r = resolvePath(f.url.value, { templated: f.url.kind === 'template' });
  if (r.route) referenced.add(r.route);
}

// ─── API table ───────────────────────────────────────────────────────────
const apiTable = handlerRoutes.map(({ route, file }) => {
  const text = fs.readFileSync(file, 'utf8');
  const a = analyze(file);
  return {
    route,
    file: rel(file),
    methods: a.methods.length ? a.methods : ['(none found)'],
    userAuth: /auth\.getUser\(|getAuthUser|createServerSupabaseClient|supabase-server/.test(text),
    admin: /requireAdmin|getRequestingAdmin|isAdmin|is_admin|ADMIN_EMAILS|role\s*[!=]==?\s*['"]admin['"]/.test(text),
    cronSecret: /CRON_SECRET/.test(text),
    webhookSig: /constructEvent|svix|verifySignature/i.test(text),
    rateLimit: /rate-limit|Ratelimit|checkRateLimit/.test(text),
    killSwitch: /kill-switch/.test(text),
    serviceRole: /supabase-service|SERVICE_ROLE/.test(text),
    turnstile: /turnstile/i.test(text),
    calledFromUI: referenced.has(route),
  };
});

// ─── email templates ─────────────────────────────────────────────────────
const emailLinks = [];
for (const f of walk(path.join(SRC, 'lib'), (x) => /emails[\\/]/.test(x) && x.endsWith('.ts') && !SKIP_FILE.test(x))) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(/href=\\?["'`]([^"'`\\]+)/g)) emailLinks.push({ file: rel(f), line: i + 1, href: m[1] });
  });
}

// ─── static findings ─────────────────────────────────────────────────────
const findings = {
  gateMismatch: pages.filter((p) => p.access !== 'public' && p.access !== 'auth-page' && p.enforcedByMiddleware === false).map((p) => ({ route: p.route, access: p.access, pageLevelAuth: p.pageLevelAuth })),
  noTitle: pages.filter((p) => !p.title).map((p) => p.route),
  deadHrefs: pages.flatMap((p) => p.links.filter((l) => l.href === '#' || l.href === '' || /^javascript:/i.test(l.href)).map((l) => ({ route: p.route, src: `${l.src}:${l.line}`, href: l.href || '(empty)', label: l.label }))),
  blankNoRel: pages.flatMap((p) => p.links.filter((l) => l.blank && !/noopener|noreferrer/.test(l.rel)).map((l) => ({ route: p.route, src: `${l.src}:${l.line}`, href: l.href }))),
  unnamedLinks: pages.flatMap((p) => p.links.filter((l) => !l.hasName).map((l) => ({ route: p.route, src: `${l.src}:${l.line}`, href: l.href }))),
  unnamedButtons: pages.flatMap((p) => p.buttons.filter((b) => !b.hasName).map((b) => ({ route: p.route, src: `${b.src}:${b.line}` }))),
  clickableNonInteractive: pages.flatMap((p) => p.clickables.filter((c) => !c.role || !c.tabIndex || !c.keyboard).map((c) => ({ route: p.route, src: `${c.src}:${c.line}`, tag: c.tag, label: c.label }))),
  imgNoAlt: pages.flatMap((p) => p.imgs.filter((i) => !i.hasAlt).map((i) => ({ route: p.route, src: `${i.src}:${i.line}` }))),
  inputsNoLabel: pages.flatMap((p) => p.inputs.filter((i) => !i.hasLabel).map((i) => ({ route: p.route, src: `${i.src}:${i.line}`, type: i.type, placeholder: i.placeholder }))),
  nativeDialogs: pages.flatMap((p) => p.dialogs.map((d) => ({ route: p.route, src: `${d.src}:${d.line}`, kind: d.kind }))),
  dangerousHtml: pages.flatMap((p) => p.dangerousHtml.map((d) => ({ route: p.route, src: `${d.src}:${d.line}` }))),
  unresolvedPaths: [...unresolvedPaths.entries()].map(([value, at]) => ({ value, at: at.slice(0, 4), count: at.length })),
  unresolvedFetch,
  orphanApis: apiTable.filter((a) => !a.calledFromUI && a.route.startsWith('/api/')).map((a) => a.route),
  apiNoAuthSignal: apiTable.filter((a) => !a.userAuth && !a.admin && !a.cronSecret && !a.webhookSig).map((a) => a.route),
  brandCasing: brandHits,
  todoText: todoHits,
};

// ─── writers ─────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(OUT_DIR, 'inventory.json'),
  JSON.stringify({ generated: stamp, middleware: { AUTH_ROUTES, PAID_ROUTES, AUTH_PAGES, gatedExact, gatedPrefix }, pages, shells, apiTable, emailLinks, findings }, null, 1),
);

const md = [];
md.push(`# QA audit inventory`, '', `> Generated ${stamp} by \`scripts/qa-audit-inventory.mjs\` — static analysis of the TypeScript AST. Do not hand-edit; re-run the script. Full per-element detail: \`INVENTORY_DETAIL.md\` and \`inventory.json\`.`, '');
md.push('## 1. Counts', '');
const sum = (k) => pages.reduce((n, p) => n + p[k].length, 0);
md.push(`| Metric | Count |`, `|---|---|`, `| Page routes (\`page.tsx\`) | ${pages.length} |`, `| API route handlers (\`/api/**\`) | ${apiRoutes.length} |`, `| Non-API route handlers | ${otherHandlers.length} (${otherHandlers.map((r) => r.route).join(', ')}) |`, `| Layouts (shells) | ${shells.length} |`, `| Links found in page closures | ${sum('links')} |`, `| Buttons | ${sum('buttons')} |`, `| Non-button click handlers | ${sum('clickables')} |`, `| Forms | ${sum('forms')} |`, `| Inputs / textareas / selects | ${sum('inputs')} |`, `| Client-side fetch() calls | ${sum('fetches')} |`, `| Email-template link targets | ${emailLinks.length} |`, '');
md.push('Access classes are derived from `src/middleware.ts` (`AUTH_ROUTES`, `PAID_ROUTES`, `AUTH_PAGES`); "enforced" reflects `isExistingGatedPath()`, the early-return that decides whether the guard runs at all.', '');
md.push('## 2. Page access matrix', '', '| Route | Access | Enforced by middleware | Page-level auth signal | Nav | `<title>` | Links | Btns | Inputs | Forms | API calls |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const p of pages) {
  const enforced = p.enforcedByMiddleware === null ? '—' : p.enforcedByMiddleware ? 'yes' : '**NO**';
  md.push(`| \`${p.route}\` | ${p.access} | ${enforced} | ${esc(p.pageLevelAuth.join(', ') || '—')} | ${p.hasNav ? 'yes' : 'no'} | ${esc(p.title ? oneLine(p.title, 46) : '**none**')} | ${p.links.length} | ${p.buttons.length + p.clickables.length} | ${p.inputs.length} | ${p.forms.length} | ${p.fetches.length} |`);
}
md.push('', '## 3. Static findings (triage list — each needs a human look)', '');
const sec = (title, rows, fmt, note) => {
  md.push(`### ${title} (${rows.length})`, '');
  if (note) md.push(note, '');
  if (!rows.length) md.push('_None._', '');
  else {
    rows.slice(0, 60).forEach((r) => md.push(`- ${fmt(r)}`));
    if (rows.length > 60) md.push(`- … ${rows.length - 60} more (see inventory.json)`);
    md.push('');
  }
};
sec('3.1 Gate declared in `AUTH_ROUTES`/`PAID_ROUTES` but bypassed by `isExistingGatedPath`', findings.gateMismatch, (r) => `\`${r.route}\` — class **${r.access}**, page-level auth signal: ${r.pageLevelAuth.join(', ') || 'none found'}`, 'The middleware returns early for any path not listed in `isExistingGatedPath`, so the guard below never runs for these. Verify live: each must self-protect or be intentionally open.');
sec('3.2 Internal path literals that resolve to no route (possible dead links)', findings.unresolvedPaths, (r) => `\`${r.value}\` ×${r.count} — ${r.at.join(', ')}`);
sec('3.3 `fetch()` targets that resolve to no API route', findings.unresolvedFetch, (r) => `\`${r.url}\` from \`${r.page}\` — ${r.src}`);
sec('3.4 Literal dead hrefs (`#`, empty, `javascript:`)', findings.deadHrefs, (r) => `\`${r.route}\` ${r.src} — href \`${r.href}\` "${r.label}"`);
sec('3.5 `target="_blank"` without `rel="noopener"`', findings.blankNoRel, (r) => `\`${r.route}\` ${r.src} → ${r.href}`);
sec('3.6 Links with no text and no `aria-label`', findings.unnamedLinks, (r) => `\`${r.route}\` ${r.src} → ${r.href}`);
sec('3.7 Buttons with no text and no `aria-label`', findings.unnamedButtons, (r) => `\`${r.route}\` ${r.src}`);
sec('3.8 Click handlers on non-interactive elements (missing role/tabIndex/keyboard)', findings.clickableNonInteractive, (r) => `\`${r.route}\` ${r.src} <${r.tag}> "${r.label}"`);
sec('3.9 Images without `alt`', findings.imgNoAlt, (r) => `\`${r.route}\` ${r.src}`);
sec('3.10 Form controls with no `id` / `aria-label` / `aria-labelledby`', findings.inputsNoLabel, (r) => `\`${r.route}\` ${r.src} type=${r.type} placeholder="${r.placeholder}"`);
sec('3.11 Native `alert` / `confirm` / `prompt` (block browser automation, poor UX)', findings.nativeDialogs, (r) => `\`${r.route}\` ${r.src} ${r.kind}()`);
sec('3.12 `dangerouslySetInnerHTML` (XSS review targets)', findings.dangerousHtml, (r) => `\`${r.route}\` ${r.src}`);
sec('3.13 Brand-casing violations in string literals / JSX text', findings.brandCasing, (r) => `${r.file}:${r.line} — "${r.text}"`, 'Rule: user-facing brand is always `E2go.app`. Bare lowercase `e2go` in prose is also flagged; URLs, emails and keys are excluded by the matcher.');
sec('3.14 Placeholder text (TODO / FIXME / TBD / lorem / coming soon)', findings.todoText, (r) => `${r.file}:${r.line} — "${r.text}"`);
sec('3.15 Pages with no `<title>` metadata anywhere in their layout chain', findings.noTitle.map((r) => ({ r })), (x) => `\`${x.r}\``);
md.push('## 4. Route handler table', '', '`calledFromUI` = a path literal or `fetch()` in `src/` references the route. Auth flags are text heuristics (import / call present), not proof — the live test verifies behaviour.', '', '| Route | Methods | User auth | Admin | Cron secret | Webhook sig | Rate limit | Kill switch | Service role | Turnstile | Called from UI |', '|---|---|---|---|---|---|---|---|---|---|---|');
const yn = (b) => (b ? 'y' : '·');
for (const a of apiTable) md.push(`| \`${a.route}\` | ${a.methods.join(' ')} | ${yn(a.userAuth)} | ${yn(a.admin)} | ${yn(a.cronSecret)} | ${yn(a.webhookSig)} | ${yn(a.rateLimit)} | ${yn(a.killSwitch)} | ${yn(a.serviceRole)} | ${yn(a.turnstile)} | ${yn(a.calledFromUI)} |`);
md.push('', `Handlers with no auth-like signal (${findings.apiNoAuthSignal.length}): ${findings.apiNoAuthSignal.map((r) => `\`${r}\``).join(', ') || 'none'}`, '');
md.push('## 5. Shells (layouts) — elements present on every page beneath them', '');
for (const s of shells) {
  if (!s.links.length && !s.buttons.length && !s.inputs.length) continue;
  md.push(`### \`${s.layout}\``, '');
  md.push(`Files: ${s.files.map((f) => `\`${path.basename(f)}\``).join(', ')}`, '');
  s.links.forEach((l) => md.push(`- link \`${esc(l.href)}\` "${esc(l.label)}" (${l.src}:${l.line})`));
  s.buttons.forEach((b) => md.push(`- button "${esc(b.label)}" onClick=\`${esc(b.onClick)}\` (${b.src}:${b.line})`));
  s.inputs.forEach((i) => md.push(`- input ${i.type} name=${i.name || '—'} (${i.src}:${i.line})`));
  md.push('');
}
md.push('## 6. Email template link targets', '', '| Template | Line | href |', '|---|---|---|');
emailLinks.forEach((e) => md.push(`| ${path.basename(e.file)} | ${e.line} | \`${esc(e.href)}\` |`));
fs.writeFileSync(path.join(OUT_DIR, 'INVENTORY.md'), md.join('\n') + '\n');

const det = [`# QA audit inventory — per-page detail`, '', `> Generated ${stamp}. Every link, button, form and input each page renders (component closure, layouts excluded — see INVENTORY.md §5). \`[map]\` = rendered once per data item; \`[cond]\` = only in some UI states.`, ''];
const tag = (x) => `${x.inMap ? ' [map]' : ''}${x.conditional ? ' [cond]' : ''}`;
for (const p of pages) {
  det.push(`## \`${p.route}\``, '', `- file: \`${p.file}\` · access: **${p.access}** · title: ${p.title ? `"${oneLine(p.title, 70)}"` : '**none**'} · page-level auth: ${p.pageLevelAuth.join(', ') || '—'}`);
  det.push(`- component files: ${p.files.map((f) => `\`${path.basename(f)}\``).join(', ')}`);
  if (p.links.length) { det.push('- **links**'); p.links.forEach((l) => det.push(`  - ${esc(l.href || '(none)')} ← "${esc(l.label)}"${l.external ? ' [external]' : ''}${l.blank ? ' [new tab]' : ''}${l.download ? ' [download]' : ''}${tag(l)} (${path.basename(l.src)}:${l.line})`)); }
  if (p.buttons.length) { det.push('- **buttons**'); p.buttons.forEach((b) => det.push(`  - "${esc(b.label || '(no label)')}" type=${b.type || '—'} onClick=\`${esc(b.onClick || '—')}\`${b.disabled ? ` disabled=\`${esc(b.disabled)}\`` : ''}${tag(b)} (${path.basename(b.src)}:${b.line})`)); }
  if (p.clickables.length) { det.push('- **non-button click handlers**'); p.clickables.forEach((c) => det.push(`  - <${c.tag}> "${esc(c.label)}" onClick=\`${esc(c.onClick)}\`${tag(c)} (${path.basename(c.src)}:${c.line})`)); }
  if (p.forms.length) { det.push('- **forms**'); p.forms.forEach((f) => det.push(`  - onSubmit=\`${esc(f.onSubmit || '—')}\` action=\`${esc(f.action || '—')}\` (${path.basename(f.src)}:${f.line})`)); }
  if (p.inputs.length) { det.push('- **inputs**'); p.inputs.forEach((i) => det.push(`  - ${i.type} name=${i.name || '—'} id=${i.id || '—'}${i.required ? ' required' : ''}${i.placeholder ? ` placeholder="${esc(i.placeholder)}"` : ''}${tag(i)} (${path.basename(i.src)}:${i.line})`)); }
  if (p.fetches.length) { det.push('- **API calls**'); [...new Map(p.fetches.map((f) => [`${f.method} ${shown(f.url)}`, f])).values()].forEach((f) => det.push(`  - ${f.method} \`${esc(shown(f.url))}\` (${path.basename(f.src)}:${f.line})`)); }
  if (p.nav.length) { det.push('- **programmatic navigation**'); p.nav.forEach((n) => det.push(`  - ${n.via} → \`${esc(shown(n.target))}\` (${path.basename(n.src)}:${n.line})`)); }
  if (p.storage.length) det.push(`- **browser storage keys**: ${[...new Set(p.storage.map((s) => s.key))].map((k) => `\`${esc(k)}\``).join(', ')}`);
  if (p.downloads.length) det.push(`- **download / print**: ${p.downloads.map((d) => d.via).join(', ')}`);
  det.push('');
}
fs.writeFileSync(path.join(OUT_DIR, 'INVENTORY_DETAIL.md'), det.join('\n') + '\n');

console.log(`pages=${pages.length} api=${apiRoutes.length} otherHandlers=${otherHandlers.length} shells=${shells.length}`);
console.log(`links=${sum('links')} buttons=${sum('buttons')} clickables=${sum('clickables')} forms=${sum('forms')} inputs=${sum('inputs')} fetches=${sum('fetches')} emailLinks=${emailLinks.length}`);
for (const [k, v] of Object.entries(findings)) console.log(`finding ${k}: ${v.length}`);
console.log(`wrote ${rel(OUT_DIR)}/{inventory.json,INVENTORY.md,INVENTORY_DETAIL.md}`);
