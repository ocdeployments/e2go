/* eslint-disable */
/**
 * E2go.app QA harness — runs INSIDE the page. Loaded only by the scratch QA build
 * (scripts/qa/patch-scratch.mjs adds `<script src="/qa/probe.js">` to the scratch
 * copy's root layout). It is never part of the shipped app.
 *
 * Because it is a synchronous <head> script it executes BEFORE the app bundle,
 * which lets it (1) install the write-guard before any app code can call fetch,
 * (2) capture console/runtime errors from first paint, (3) observe LCP / CLS from
 * the start. The autopilot re-attaches itself after every hard navigation because
 * the script tag is present on every page.
 *
 * Public API — window.__qa
 *   guard        { mode:'block'|'allow', allow:[RegExp], confirmAnswer:boolean }
 *   probe()      static audit of the current page  -> JSON (see buildProbe)
 *   clickAll(o)  click every safe interactive element, report effects -> Promise<JSON>
 *   autopilot    { start(queue, opts), stop(), status(), take(n), clear() }
 *
 * Safety model ("record and block"):
 *   Any non-GET/HEAD/OPTIONS request (fetch, XHR, sendBeacon), native non-GET form
 *   submit, window.open, alert/confirm/prompt is recorded; mutations are answered with
 *   a synthetic 200 {qa_blocked:true} instead of reaching the network. confirm()
 *   answers false. So "click every button" cannot pay, delete, email or generate.
 *   Auth refresh/verify are the only mutations let through (a session must survive).
 */
(function () {
  'use strict';
  if (window.__qa && window.__qa.version) return;

  // A hidden browser pane throttles page timers to ~1 tick/min, which stalls the autopilot. Route setTimeout through a Worker
  // (worker timers are not throttled); callbacks come back as message events. Harness-only; the page under test is unaffected
  // except that its timers fire on time.
  try {
    if (!window.__qaTimerShim && typeof Worker === 'function' && typeof Blob === 'function') {
      var wsrc = 'var t={};onmessage=function(e){var d=e.data;if(d.c){clearTimeout(t[d.id]);delete t[d.id];return;}t[d.id]=setTimeout(function(){delete t[d.id];postMessage(d.id);},d.ms);};';
      var w = new Worker(URL.createObjectURL(new Blob([wsrc], { type: 'application/javascript' })));
      var cbs = {}, seq = 1, nativeST = window.setTimeout, nativeCT = window.clearTimeout;
      w.onmessage = function (e) { var f = cbs[e.data]; if (f) { delete cbs[e.data]; f.fn.apply(window, f.args); } };
      window.setTimeout = function (fn, ms) {
        if (typeof fn !== 'function') return nativeST.apply(window, arguments);
        var id = seq++; cbs[id] = { fn: fn, args: Array.prototype.slice.call(arguments, 2) };
        w.postMessage({ id: id, ms: Math.max(0, +ms || 0) });
        return id + 1e9; // distinguishable from native ids
      };
      window.clearTimeout = function (id) { if (id >= 1e9) { id -= 1e9; delete cbs[id]; w.postMessage({ id: id, c: 1 }); } else nativeCT(id); };
      window.__qaTimerShim = true;
    }
  } catch (e) { /* fall back to native timers */ }

  var VERSION = 5;
  var LS = { ap: '__qa_ap', res: '__qa_res', mode: '__qa_mode' };

  /* ------------------------------------------------------------------ utils */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  // Every string that leaves the page goes through clip(), which redacts e-mail addresses (persona A is the founder's real account).
  function clip(s, n) { s = String(s == null ? '' : s).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '«email»').replace(/\s+/g, ' ').trim(); return s.length > (n || 80) ? s.slice(0, (n || 80) - 1) + '…' : s; }
  function now() { return Date.now(); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function arr(x) { return Array.prototype.slice.call(x); }

  /* ------------------------------------------------------------------ logs */
  var log = { errors: [], net: [], dialogs: [], nav: [], forms: [], opens: [], beacons: [], inflight: 0, lastNetAt: now() };
  function push(list, item, cap) { list.push(item); if (list.length > (cap || 300)) list.shift(); }

  /* ------------------------------------------------------------------ guard */
  var persistedMode = lsGet(LS.mode);
  var guard = {
    mode: persistedMode && persistedMode.mode ? persistedMode.mode : 'block',
    // Mutations that must reach the network for a session to keep working.
    allow: [/\/auth\/v1\/token\?grant_type=refresh_token/, /\/auth\/v1\/verify/],
    confirmAnswer: false,
    setMode: function (m) { guard.mode = m; lsSet(LS.mode, { mode: m }); },
  };

  function methodOf(input, init) {
    var m = (init && init.method) || (input && typeof input === 'object' && input.method) || 'GET';
    return String(m).toUpperCase();
  }
  function urlOf(input) {
    try { return String(typeof input === 'string' ? input : input && input.url ? input.url : input); } catch (e) { return ''; }
  }
  function isMutation(m) { return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS'; }
  function isAllowed(u) { return guard.allow.some(function (re) { return re.test(u); }); }
  // GET routes with side effects that must never fire from a click-through (cron, e-mail scheduler, admin, paid LLM, market analysis).
  var GET_DENY = [/\/api\/cron\//, /\/api\/email\/schedule/, /\/api\/admin\//, /\/api\/simulator\/interview-prep/, /\/api\/market-analysis/];
  function isDeniedGet(m, u) {
    if (m !== 'GET' && m !== 'HEAD') return false;
    var p = u.replace(location.origin, '');
    return GET_DENY.some(function (re) { return re.test(p); });
  }
  // Next.js Server Actions are POSTs carrying a Next-Action header; they are mutations and are always blocked in block mode.
  function isServerAction(input, init) {
    try {
      var h = (init && init.headers) || (input && typeof input === 'object' && input.headers);
      if (!h) return false;
      if (typeof h.get === 'function') return !!h.get('next-action');
      return Object.keys(h).some(function (k) { return k.toLowerCase() === 'next-action'; });
    } catch (e) { return false; }
  }
  function blockedResponse() {
    return new Response(JSON.stringify({ ok: true, success: true, qa_blocked: true }), { status: 200, headers: { 'content-type': 'application/json', 'x-qa-blocked': '1' } });
  }
  function bodyPreview(init) {
    try {
      var b = init && init.body;
      if (!b) return '';
      if (typeof b === 'string') return clip(b.replace(/("(?:password|token|secret|authorization)"\s*:\s*)"[^"]*"/gi, '$1"«redacted»"'), 160);
      if (b instanceof FormData) return 'FormData(' + arr(b.keys()).join(',') + ')';
      return Object.prototype.toString.call(b);
    } catch (e) { return ''; }
  }

  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function (input, init) {
      var m = methodOf(input, init), u = urlOf(input), t0 = performance.now();
      var rec = { m: m, u: u.replace(location.origin, ''), t: now() };
      if (guard.mode === 'block' && isDeniedGet(m, u)) {
        rec.blocked = true; rec.deniedGet = true;
        push(log.net, rec);
        return Promise.resolve(new Response(JSON.stringify({ error: 'qa_blocked_get' }), { status: 403, headers: { 'content-type': 'application/json', 'x-qa-blocked': '1' } }));
      }
      if (isMutation(m) && guard.mode === 'block' && !isAllowed(u)) {
        rec.blocked = true; rec.b = bodyPreview(init);
        if (isServerAction(input, init)) rec.sa = true;
        push(log.net, rec);
        return Promise.resolve(blockedResponse());
      }
      log.inflight++;
      return origFetch(input, init).then(function (res) {
        log.inflight--; log.lastNetAt = now();
        rec.s = res.status; rec.ms = Math.round(performance.now() - t0);
        if (isMutation(m)) rec.b = bodyPreview(init);
        push(log.net, rec);
        return res;
      }, function (err) {
        log.inflight--; log.lastNetAt = now();
        rec.s = 0; rec.err = clip(err && err.message || err, 80); rec.ms = Math.round(performance.now() - t0);
        push(log.net, rec);
        throw err;
      });
    };
  }

  // XHR — record; abort mutations in block mode.
  try {
    var xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__qa = { m: String(m).toUpperCase(), u: String(u) }; return xo.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var q = this.__qa || { m: 'GET', u: '' };
      if (guard.mode === 'block' && isDeniedGet(q.m, q.u)) {
        push(log.net, { m: q.m, u: q.u.replace(location.origin, ''), blocked: true, deniedGet: true, xhr: true, t: now() });
        try { this.abort(); } catch (e) {}
        return;
      }
      if (isMutation(q.m) && guard.mode === 'block' && !isAllowed(q.u)) {
        push(log.net, { m: q.m, u: q.u.replace(location.origin, ''), blocked: true, xhr: true, t: now() });
        try { this.abort(); } catch (e) {}
        return;
      }
      push(log.net, { m: q.m, u: q.u.replace(location.origin, ''), xhr: true, t: now() });
      return xs.apply(this, arguments);
    };
  } catch (e) {}

  try {
    var ob = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (u, d) {
      push(log.beacons, { u: String(u).replace(location.origin, ''), t: now() });
      if (guard.mode === 'block') return true;
      return ob ? ob(u, d) : false;
    };
  } catch (e) {}

  window.alert = function (m) { push(log.dialogs, { k: 'alert', m: clip(m, 160), t: now() }); };
  window.confirm = function (m) { push(log.dialogs, { k: 'confirm', m: clip(m, 160), t: now() }); return !!guard.confirmAnswer; };
  window.prompt = function (m) { push(log.dialogs, { k: 'prompt', m: clip(m, 160), t: now() }); return null; };
  var origOpen = window.open;
  window.open = function (u, t, f) {
    push(log.opens, { u: String(u || '').replace(location.origin, ''), t: now() });
    if (guard.mode === 'block') return null;
    return origOpen.call(window, u, t, f);
  };

  // Cross-document navigations the page itself starts (location.href=, <a> click, form submit) are refused in block mode when
  // they would leave the app (Stripe, mail client, external sites) or hit an /api/ GET (file download, email-triggering GET).
  // The autopilot's own navigations set `guard.selfNav` first.
  guard.selfNav = false;
  try {
    if (window.navigation && window.navigation.addEventListener) {
      window.navigation.addEventListener('navigate', function (e) {
        try {
          if (guard.mode !== 'block' || guard.selfNav || e.destination.sameDocument || !e.cancelable) return;
          var d = new URL(e.destination.url), external = d.origin !== location.origin, api = !external && /^\/api\//.test(d.pathname);
          if (external || api) {
            e.preventDefault();
            push(log.nav, { k: external ? 'external-nav-blocked' : 'api-nav-blocked', u: (external ? d.origin : '') + d.pathname, t: now() });
          }
        } catch (err) {}
      });
    }
  } catch (e) {}
  // An app "unsaved changes" prompt would freeze a hard navigation; the harness never wants it.
  window.addEventListener('beforeunload', function (e) { if (guard.selfNav || (lsGet('__qa_ap') || {}).on) e.stopImmediatePropagation(); }, true);

  ['pushState', 'replaceState'].forEach(function (k) {
    var o = history[k];
    history[k] = function (s, ti, u) { push(log.nav, { k: k, u: String(u == null ? '' : u).replace(location.origin, ''), t: now() }); return o.apply(this, arguments); };
  });
  window.addEventListener('popstate', function () { push(log.nav, { k: 'popstate', u: location.pathname + location.search, t: now() }); });
  window.addEventListener('hashchange', function () { push(log.nav, { k: 'hashchange', u: location.hash, t: now() }); });

  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f || f.tagName !== 'FORM') return;
    var m = (f.getAttribute('method') || 'get').toUpperCase();
    push(log.forms, { a: clip(f.getAttribute('action') || '', 80), m: m, prevented: e.defaultPrevented, t: now() });
    // A native (non-fetch) POST would navigate away to whatever the server answers; refuse it in block mode.
    if (m !== 'GET' && guard.mode === 'block' && f.getAttribute('action') && !/^javascript:/i.test(f.getAttribute('action'))) e.preventDefault();
  }, true);

  // errors from first paint
  window.addEventListener('error', function (e) {
    if (e.target && e.target !== window && (e.target.src || e.target.href)) {
      push(log.errors, { k: 'resource', tag: e.target.tagName, src: clip(e.target.src || e.target.href, 120) });
    } else {
      push(log.errors, { k: 'js', m: clip(e.message, 160), at: clip((e.filename || '').replace(location.origin, '') + ':' + e.lineno, 80) });
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    push(log.errors, { k: 'rejection', m: clip(e.reason && (e.reason.message || e.reason), 160) });
  });
  ['error', 'warn'].forEach(function (lvl) {
    var o = console[lvl];
    console[lvl] = function () {
      try { push(log.errors, { k: 'console.' + lvl, m: clip(arr(arguments).map(function (a) { return a && a.message ? a.message : typeof a === 'object' ? '[obj]' : String(a); }).join(' '), 200) }); } catch (e) {}
      return o.apply(console, arguments);
    };
  });

  /* ------------------------------------------------------------------ perf */
  var perf = { lcp: null, cls: 0, longTasks: 0, longTaskMs: 0 };
  try {
    new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) perf.lcp = Math.round(e[e.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) perf.cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { perf.longTasks++; perf.longTaskMs += Math.round(e.duration); }); }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}

  /* ------------------------------------------------------------------ dom helpers */
  function visible(el) {
    if (!el || !el.isConnected) return false;
    if (!el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function textOf(el) { return clip(el.innerText || el.textContent || '', 90); }
  function accName(el) {
    try {
      var lb = el.getAttribute && el.getAttribute('aria-labelledby');
      if (lb) { var t = lb.split(/\s+/).map(function (id) { var n = document.getElementById(id); return n ? n.textContent : ''; }).join(' ').trim(); if (t) return clip(t); }
      var al = el.getAttribute && el.getAttribute('aria-label'); if (al && al.trim()) return clip(al);
      if (el.labels && el.labels.length) { var l = arr(el.labels).map(function (x) { return x.textContent; }).join(' ').trim(); if (l) return clip(l); }
      if (el.tagName === 'IMG' && el.alt) return clip(el.alt);
      if (el.tagName === 'INPUT' && /^(submit|button|reset)$/i.test(el.type) && el.value) return clip(el.value);
      var tx = (el.innerText || el.textContent || '').trim(); if (tx) return clip(tx);
      var svgt = el.querySelector && el.querySelector('svg title'); if (svgt && svgt.textContent.trim()) return clip(svgt.textContent);
      var im = el.querySelector && el.querySelector('img[alt]'); if (im && im.alt.trim()) return clip(im.alt);
      var ti = el.getAttribute && el.getAttribute('title'); if (ti && ti.trim()) return clip(ti);
    } catch (e) {}
    return '';
  }
  function sel(el) {
    if (!el || !el.tagName) return '';
    var parts = [], n = el, depth = 0;
    while (n && n.nodeType === 1 && depth < 3 && n !== document.body) {
      var s = n.tagName.toLowerCase();
      if (n.id) { s += '#' + n.id; parts.unshift(s); break; }
      var cls = (typeof n.className === 'string' ? n.className : '').split(/\s+/).filter(function (c) { return c && !/^(w-|h-|p[xytblr]?-|m[xytblr]?-|text-|bg-|flex|grid|gap-|items-|justify-)/.test(c); }).slice(0, 1);
      if (cls.length) s += '.' + cls[0];
      var p = n.parentElement;
      if (p) { var same = arr(p.children).filter(function (c) { return c.tagName === n.tagName; }); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(n) + 1) + ')'; }
      parts.unshift(s); n = p; depth++;
    }
    return parts.join('>');
  }
  function rgba(str) {
    var m = String(str || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  function lum(c) {
    var v = c.slice(0, 3).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  function bgOf(el) {
    // Flatten translucent backgrounds up the tree over the document background.
    var stack = [], n = el;
    while (n && n.nodeType === 1) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // gradient/image: unknown
      var c = rgba(cs.backgroundColor);
      if (c && c[3] > 0) { stack.push(c); if (c[3] >= 0.99) break; }
      n = n.parentElement;
    }
    var base = [10, 10, 10, 1]; // Obsidian page background fallback
    if (!stack.length || stack[stack.length - 1][3] < 0.99) stack.push(base);
    var out = stack[stack.length - 1].slice();
    for (var i = stack.length - 2; i >= 0; i--) {
      var s = stack[i], a = s[3];
      out = [s[0] * a + out[0] * (1 - a), s[1] * a + out[1] * (1 - a), s[2] * a + out[2] * (1 - a), 1];
    }
    return out;
  }

  /* ------------------------------------------------------------------ probe */
  var SUSPICIOUS = [
    ['undefined', /\bundefined\b/], ['null', /(^|[\s:$>(])null([\s.,)<]|$)/], ['NaN', /\bNaN\b/], ['[object', /\[object \w+\]/],
    ['template', /\{\{[^}]*\}\}|\$\{[^}]*\}/], ['lorem', /lorem ipsum/i], ['TODO/TBD', /\b(TODO|FIXME|TBD|XXX)\b/],
    ['coming-soon', /coming soon/i], ['error-text', /(Cannot read propert|is not a function|Unexpected token|Traceback|stack trace|at Object\.|ReferenceError|TypeError:)/],
    ['invalid-date', /Invalid Date/], ['$NaN', /\$\s?NaN|NaN%/], ['infinity', /\bInfinity\b/], ['dup-punct', /[!?]{3,}/],
    ['double-space-currency', /\$\s{2,}\d/], ['raw-key', /\b[a-z]+_[a-z_]+\b(?=\s*[:=]?\s*$)/],
  ];
  // Brand must read "E2go.app" in human-visible text. URLs / emails / storage keys are exempt.
  var BRAND_BAD = /(^|[^\w@./:-])(E2Go|E2GO|e2GO|e2go)(?![\w@./-])(?!\.(app|vercel))|E2Go\.app|E2GO\.app|e2go\.App/;
  function brandHits(text) { var m = BRAND_BAD.exec(text); return m ? m[0].trim() : null; }

  function visibleTextNodes(cap) {
    var out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode()) && out.length < (cap || 6000)) {
      var t = n.nodeValue; if (!t || !t.trim()) continue;
      var p = n.parentElement; if (!p) continue;
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
      if (!visible(p)) continue;
      out.push({ n: n, t: t, p: p });
    }
    return out;
  }

  function buildProbe() {
    var t0 = performance.now();
    var vw = window.innerWidth, vh = window.innerHeight;
    var nav = (performance.getEntriesByType('navigation') || [])[0] || {};
    var res = {
      v: VERSION, url: location.pathname + location.search + location.hash, title: document.title, lang: document.documentElement.lang || '',
      status: nav.responseStatus || null, viewport: { w: vw, h: vh, dpr: window.devicePixelRatio },
      docH: document.documentElement.scrollHeight,
    };
    function meta(n) { var m = document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]'); return m ? m.content : ''; }
    res.meta = { description: clip(meta('description'), 160), robots: meta('robots'), ogTitle: clip(meta('og:title'), 100), ogImage: meta('og:image'), viewport: meta('viewport'), canonical: (document.querySelector('link[rel=canonical]') || {}).href || '' };

    // ---- structure
    var hs = arr(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible);
    res.h1 = hs.filter(function (h) { return h.tagName === 'H1'; }).map(function (h) { return clip(h.textContent, 80); });
    var lastLvl = 0, skips = [];
    hs.forEach(function (h) { var l = +h.tagName[1]; if (lastLvl && l > lastLvl + 1) skips.push(clip(h.textContent, 40) + ' (h' + lastLvl + '→h' + l + ')'); lastLvl = l; });
    res.headings = { total: hs.length, skips: skips.slice(0, 5) };
    res.landmarks = { main: document.querySelectorAll('main,[role=main]').length, nav: document.querySelectorAll('nav,[role=navigation]').length, header: document.querySelectorAll('header,[role=banner]').length, footer: document.querySelectorAll('footer,[role=contentinfo]').length, skipLink: !!document.querySelector('a[href="#main-content"]') };

    var textNodes = visibleTextNodes();
    var bodyText = textNodes.map(function (x) { return x.t; }).join(' ');
    res.textLen = bodyText.replace(/\s+/g, ' ').trim().length;
    res.blank = res.textLen < 40;
    res.errorScreen = /(something went wrong|application error|an error occurred|unexpected error|500\b.*error|this page could not be found)/i.test(bodyText);
    res.nextOverlay = !!document.querySelector('nextjs-portal, #__next-build-watcher');

    // ---- overflow
    var sw = document.documentElement.scrollWidth, over = [];
    if (sw > vw + 1) {
      arr(document.body.querySelectorAll('*')).forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.width && r.right > vw + 1 && visible(e)) over.push({ s: sel(e), right: Math.round(r.right), w: Math.round(r.width), t: clip(e.textContent, 30) });
      });
      over.sort(function (a, b) { return b.right - a.right; });
    }
    res.overflow = { x: sw > vw + 1, sw: sw, iw: vw, top: over.slice(0, 6) };

    // ---- suspicious + brand text
    var susp = [], brand = [];
    textNodes.forEach(function (x) {
      var t = x.t;
      SUSPICIOUS.forEach(function (rule) { if (susp.length < 30 && rule[1].test(t) && !/^(SCRIPT|CODE|PRE)$/.test(x.p.tagName)) susp.push({ k: rule[0], t: clip(t, 70), s: sel(x.p) }); });
      var b = brandHits(t); if (b && brand.length < 12) brand.push({ hit: b, t: clip(t, 70), s: sel(x.p) });
    });
    ['aria-label', 'alt', 'placeholder', 'title'].forEach(function (attr) {
      arr(document.querySelectorAll('[' + attr + ']')).forEach(function (e) {
        var v = e.getAttribute(attr), b = brandHits(v || ''); if (b && brand.length < 12) brand.push({ hit: b, t: clip(attr + '=' + v, 70), s: sel(e) });
      });
    });
    var tb = brandHits(document.title); if (tb) brand.push({ hit: tb, t: 'document.title=' + clip(document.title, 60), s: 'title' });
    res.suspicious = susp; res.brand = brand;

    // ---- links
    var links = arr(document.querySelectorAll('a')), lk = { total: links.length, internal: 0, external: 0, mailto: 0, tel: 0, hash: 0, empty: 0, unnamed: 0, blankNoRel: 0, js: 0 };
    var linkRows = [], seen = {};
    links.forEach(function (a) {
      var href = a.getAttribute('href'), name = accName(a), issues = [];
      var vis = visible(a);
      if (href == null || href.trim() === '') { lk.empty++; issues.push('no-href'); }
      else if (href === '#') { lk.empty++; issues.push('href=#'); }
      else if (/^javascript:/i.test(href)) { lk.js++; issues.push('javascript:'); }
      else if (/^mailto:/i.test(href)) lk.mailto++;
      else if (/^tel:/i.test(href)) lk.tel++;
      else if (href[0] === '#') lk.hash++;
      else { var u; try { u = new URL(href, location.href); } catch (e) { issues.push('bad-url'); } if (u) { if (u.origin === location.origin) lk.internal++; else lk.external++; } }
      if (vis && !name) { lk.unnamed++; issues.push('unnamed'); }
      if (a.target === '_blank' && !/noopener|noreferrer/.test(a.rel || '')) { lk.blankNoRel++; issues.push('_blank-no-rel'); }
      if (href && href[0] === '#' && href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1))) && !document.querySelector('[name="' + href.slice(1) + '"]')) issues.push('dead-anchor');
      var key = (href || '') + '|' + name;
      if (!seen[key]) {
        seen[key] = 1;
        var row = { h: href, n: name, vis: vis };
        if (a.target) row.tg = a.target; if (issues.length) row.i = issues;
        linkRows.push(row);
      }
    });
    res.linkSummary = lk;
    res.links = linkRows.slice(0, 400);

    // ---- buttons
    var btns = arr(document.querySelectorAll('button,[role=button],input[type=submit],input[type=button],summary,[role=tab],[role=switch],[role=menuitem]')).filter(visible);
    var bIssues = [], smallTap = [];
    btns.forEach(function (b) {
      var nm = accName(b), r = b.getBoundingClientRect();
      if (!nm) bIssues.push({ s: sel(b), i: 'unnamed' });
      if (r.width < 44 || r.height < 44) smallTap.push({ s: sel(b), n: nm || '(no name)', w: Math.round(r.width), h: Math.round(r.height) });
    });
    var disabledBtns = btns.filter(function (b) { return b.disabled || b.getAttribute('aria-disabled') === 'true'; }).length;
    res.buttons = { total: btns.length, disabled: disabledBtns, issues: bIssues.slice(0, 10) };

    // ---- inputs
    var inputs = arr(document.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(visible), inIssues = [];
    inputs.forEach(function (i) {
      var iss = [], nm = accName(i);
      if (!nm && !i.placeholder) iss.push('no-label');
      else if (!nm) iss.push('placeholder-only');
      var ty = (i.type || '').toLowerCase();
      if (/^(email|password|tel)$/.test(ty) && !i.autocomplete) iss.push('no-autocomplete');
      if (i.tagName === 'INPUT' && ty === 'password' && i.autocomplete === 'off') iss.push('autocomplete-off-password');
      var r = i.getBoundingClientRect(); if (r.height < 40 && !/^(checkbox|radio)$/.test(ty)) iss.push('short:' + Math.round(r.height));
      var fs = parseFloat(getComputedStyle(i).fontSize); if (fs < 16 && vw <= 500 && /^(text|email|tel|password|number|search|url|)$/.test(ty)) iss.push('ios-zoom-font<16:' + fs);
      if (iss.length) inIssues.push({ s: sel(i), ty: ty || i.tagName.toLowerCase(), n: nm, i: iss });
    });
    res.inputs = { total: inputs.length, issues: inIssues.slice(0, 15), issueCount: inIssues.length };
    res.forms = document.forms.length;

    // ---- images
    var imgs = arr(document.images).filter(visible);
    res.images = { total: imgs.length, noAlt: imgs.filter(function (i) { return !i.hasAttribute('alt'); }).slice(0, 6).map(function (i) { return clip(i.src.replace(location.origin, ''), 60); }), broken: imgs.filter(function (i) { return i.complete && i.naturalWidth === 0; }).slice(0, 6).map(function (i) { return clip(i.src.replace(location.origin, ''), 60); }) };

    // ---- tap targets (only interactive, visible)
    // Threshold follows the viewport: the project rule is 44px on touch widths; on desktop widths WCAG 2.5.8 (AA) asks for 24px.
    // Skip links / visually-hidden controls (<=2px box) and inline links inside running text (WCAG 2.5.8 "inline" exception) are exempt.
    var tapEls = arr(document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab]')).filter(visible).filter(function (e) {
      var r = e.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) return false;
      if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && (e.parentElement.textContent || '').trim().length > (e.textContent || '').trim().length + 12) return false;
      return true;
    });
    var tapMin = vw < 768 ? 44 : 24;
    var small = tapEls.filter(function (e) { var r = e.getBoundingClientRect(); return r.width < tapMin || r.height < tapMin; });
    var small44 = tapEls.filter(function (e) { var r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length;
    res.tap = { interactive: tapEls.length, min: tapMin, small: small.length, small44: small44, samples: small.slice(0, 6).map(function (e) { var r = e.getBoundingClientRect(); return { s: sel(e), n: accName(e), w: Math.round(r.width), h: Math.round(r.height) }; }) };

    // ---- clickable non-interactive (cursor:pointer with no role/keyboard)
    var cni = [];
    arr(document.body.querySelectorAll('div,span,li,p,td,img,svg,section,article')).forEach(function (e) {
      if (cni.length > 12) return;
      if (!visible(e)) return;
      if (getComputedStyle(e).cursor !== 'pointer') return;
      if (e.closest('a,button,[role=button],[role=tab],label,summary,select,[role=link],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=option]')) return;
      cni.push({ s: sel(e), t: clip(e.textContent, 40), tabindex: e.getAttribute('tabindex') });
    });
    res.clickableNonInteractive = cni;

    // ---- contrast (sampled)
    var cc = 0, fails = [], txEls = {};
    textNodes.forEach(function (x) { if (x.t.trim().length > 1) { txEls[sel(x.p) + '|' + x.p.tagName] = x.p; } });
    Object.keys(txEls).slice(0, 500).forEach(function (k) {
      var e = txEls[k], cs = getComputedStyle(e), fg = rgba(cs.color); if (!fg) return;
      var bg = bgOf(e); if (!bg) return;
      var a = fg[3]; if (a < 1) fg = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
      var ratio = contrast(fg, bg), size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700, large = size >= 24 || (size >= 18.66 && bold);
      cc++;
      if (ratio < (large ? 3 : 4.5)) fails.push({ s: sel(e), r: Math.round(ratio * 100) / 100, sz: Math.round(size), t: clip(e.textContent, 40), fg: cs.color, bg: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')' });
    });
    fails.sort(function (a, b) { return a.r - b.r; });
    res.contrast = { checked: cc, failCount: fails.length, worst: fails.slice(0, 8) };

    // ---- design lock (Obsidian Gold): fonts, zero radius, forbidden colours
    var body = getComputedStyle(document.body), fam = function (cs) { return (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim(); };
    var hEl = document.querySelector('h1,h2'), hFam = hEl ? fam(getComputedStyle(hEl)) : '';
    var fontsLoaded = []; try { document.fonts.forEach(function (f) { if (f.status === 'loaded') fontsLoaded.push(f.family.replace(/["']/g, '')); }); } catch (e) {}
    var radius = [], blue = 0, allEls = arr(document.body.querySelectorAll('*')).slice(0, 2500);
    allEls.forEach(function (e) {
      var cs = getComputedStyle(e);
      if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && cs.borderRadius && cs.borderRadius !== '0px' && visible(e) && radius.length < 8) {
        if (!(e.tagName === 'INPUT' && /^(checkbox|radio)$/.test(e.type))) radius.push({ s: sel(e), r: cs.borderRadius });
      }
      if (cs.color === 'rgb(59, 130, 246)' || cs.backgroundColor === 'rgb(59, 130, 246)' || cs.borderTopColor === 'rgb(59, 130, 246)') blue++;
    });
    // font resolution: tally the first family of every text-bearing element, then ask whether that family actually exists.
    var faceState = {}; try { document.fonts.forEach(function (f) { var n = f.family.replace(/["']/g, ''), s = faceState[n]; faceState[n] = (s === 'loaded' || f.status === 'loaded') ? 'loaded' : (s === 'loading' || f.status === 'loading') ? 'loading' : f.status; }); } catch (e) {}
    var GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|emoji|math|fangsong)$/i;
    var fctx = document.createElement('canvas').getContext('2d'), fsample = 'mmmmmmmmmmlliWWWW 0123456789';
    var famState = function (first) {
      if (GENERIC.test(first)) return 'generic';
      if (faceState[first]) return faceState[first];
      try { fctx.font = '32px monospace'; var base = fctx.measureText(fsample).width; fctx.font = '32px "' + first + '", monospace'; return Math.abs(fctx.measureText(fsample).width - base) > 0.01 ? 'installed' : 'missing'; } catch (e) { return 'unknown'; }
    };
    var stacks = {};
    textNodes.forEach(function (x) { if (x.t.trim().length < 2) return; var st = getComputedStyle(x.p).fontFamily, first = (st.split(',')[0] || '').replace(/["']/g, '').trim(), k = first; if (!stacks[k]) stacks[k] = { count: 0, stack: st }; stacks[k].count++; });
    var fontIssues = [], fontStacks = [];
    Object.keys(stacks).forEach(function (k) {
      var st = famState(k); fontStacks.push({ family: k, state: st, count: stacks[k].count });
      if (st === 'missing') { var rest = stacks[k].stack.split(',').slice(1).map(function (s) { return s.replace(/["']/g, '').trim(); }); fontIssues.push({ family: k, count: stacks[k].count, fallback: rest.join(', ') || '(browser default)' }); }
    });
    fontStacks.sort(function (a, b) { return b.count - a.count; });
    res.design = { bodyFont: fam(body), headingFont: hFam, fontsLoaded: Array.from(new Set(fontsLoaded)), fontStacks: fontStacks.slice(0, 8), fontIssues: fontIssues, forbiddenHeadingFont: /^(Inter|Roboto|Space Grotesk)$/i.test(hFam), tailwindBlue: blue, nonZeroRadiusControls: radius };

    // ---- perf + resources
    // transferSize is 0 for cache hits, so fall back to encodedBodySize (compressed bytes) — that is the on-the-wire cost a first visit pays.
    var rs = performance.getEntriesByType('resource') || [], js = 0, jsDec = 0, imgB = 0, tr = 0, failed = [];
    rs.forEach(function (r) {
      var wire = r.transferSize || r.encodedBodySize || 0, isJs = r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name);
      if (isJs) { js += wire; jsDec += r.decodedBodySize || 0; }
      if (r.initiatorType === 'img' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(r.name)) imgB += wire;
      tr += wire;
      if (r.responseStatus >= 400) failed.push({ u: clip(r.name.replace(location.origin, ''), 90), s: r.responseStatus });
    });
    // LCP and CLS are not reported while the document is hidden (the embedded browser pane can be), so also give a proxy:
    // when the largest in-viewport image finished downloading.
    var lcpProxy = null;
    try {
      var bestImg = null;
      imgs.forEach(function (i) { var b = i.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return; var a = b.width * b.height; if (!bestImg || a > bestImg.a) bestImg = { a: a, src: i.currentSrc || i.src }; });
      if (bestImg) { var re = rs.filter(function (x) { return x.name === bestImg.src; })[0]; if (re) lcpProxy = Math.round(re.responseEnd); }
    } catch (e) {}
    res.perf = { ttfb: Math.round(nav.responseStart || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0), lcp: perf.lcp, lcpProxy: lcpProxy, visibility: document.visibilityState, cls: Math.round(perf.cls * 1000) / 1000, longTasks: perf.longTasks, longTaskMs: perf.longTaskMs, resources: rs.length, jsKB: Math.round(js / 1024), jsDecodedKB: Math.round(jsDec / 1024), imgKB: Math.round(imgB / 1024), transferKB: Math.round(tr / 1024), failedResources: failed.slice(0, 8) };

    // ---- runtime logs
    res.errors = log.errors.slice(-12);
    var nf = log.net.filter(function (n) { return n.s >= 400 || n.s === 0; }).slice(-15);
    res.net = { total: log.net.length, failed: nf, blocked: log.net.filter(function (n) { return n.blocked; }).slice(-10), slowMs: log.net.filter(function (n) { return n.ms > 3000; }).slice(-5) };
    res.dialogs = log.dialogs.slice(-5);
    res.ms = Math.round(performance.now() - t0);
    res.flags = flagsOf(res);
    return res;
  }

  // One-line issue strings so a reader (or scorer) can skim.
  function flagsOf(r) {
    var f = [];
    if (r.blank) f.push('BLANK page (<40 chars of text)');
    if (r.errorScreen) f.push('ERROR screen text visible');
    if (r.nextOverlay) f.push('Next.js error overlay present');
    if (!r.title) f.push('missing <title>');
    if (r.h1.length === 0 && !r.blank) f.push('no visible <h1>');
    if (r.h1.length > 1) f.push(r.h1.length + ' <h1> elements');
    if (!r.landmarks.main) f.push('no <main> landmark');
    if (r.overflow.x) f.push('horizontal overflow ' + r.overflow.sw + '>' + r.overflow.iw + (r.overflow.top[0] ? ' (' + r.overflow.top[0].s + ')' : ''));
    if (r.suspicious.length) f.push(r.suspicious.length + ' suspicious text (' + r.suspicious.slice(0, 3).map(function (s) { return s.k + ':' + s.t; }).join(' | ') + ')');
    if (r.brand.length) f.push(r.brand.length + ' brand-casing hit(s): ' + r.brand.slice(0, 2).map(function (b) { return b.hit; }).join(', '));
    if (r.linkSummary.empty) f.push(r.linkSummary.empty + ' link(s) with empty/# href');
    if (r.linkSummary.unnamed) f.push(r.linkSummary.unnamed + ' link(s) without accessible name');
    if (r.linkSummary.blankNoRel) f.push(r.linkSummary.blankNoRel + ' target=_blank without rel');
    if (r.linkSummary.js) f.push(r.linkSummary.js + ' javascript: link(s)');
    if (r.buttons.issues.length) f.push(r.buttons.issues.length + ' unnamed button(s)');
    if (r.inputs.issueCount) f.push(r.inputs.issueCount + ' input issue(s) e.g. ' + r.inputs.issues.slice(0, 2).map(function (i) { return i.i.join('/'); }).join(', '));
    if (r.images.noAlt.length) f.push(r.images.noAlt.length + ' image(s) without alt');
    if (r.images.broken.length) f.push(r.images.broken.length + ' broken image(s)');
    if (r.tap.small > 0) f.push(r.tap.small + '/' + r.tap.interactive + ' tap targets <' + r.tap.min + 'px');
    if (r.clickableNonInteractive.length) f.push(r.clickableNonInteractive.length + ' clickable non-interactive element(s)');
    if (r.contrast.failCount) f.push(r.contrast.failCount + ' low-contrast text element(s), worst ' + (r.contrast.worst[0] ? r.contrast.worst[0].r : ''));
    if (r.design.forbiddenHeadingFont) f.push('forbidden heading font ' + r.design.headingFont);
    if (r.design.tailwindBlue) f.push(r.design.tailwindBlue + ' element(s) using default Tailwind blue');
    if (r.design.nonZeroRadiusControls.length) f.push(r.design.nonZeroRadiusControls.length + '+ form control(s) with non-zero border-radius (design lock)');
    if (r.errors.filter(function (e) { return e.k !== 'console.warn'; }).length) f.push(r.errors.filter(function (e) { return e.k !== 'console.warn'; }).length + ' runtime error(s): ' + r.errors.filter(function (e) { return e.k !== 'console.warn'; }).slice(0, 2).map(function (e) { return e.m || e.src; }).join(' | '));
    if (r.net.failed.length) f.push(r.net.failed.length + ' failed request(s): ' + r.net.failed.slice(0, 3).map(function (n) { return n.m + ' ' + n.u + ' ' + n.s; }).join(' | '));
    if (r.perf.failedResources.length) f.push(r.perf.failedResources.length + ' failed static resource(s)');
    if (r.perf.lcp && r.perf.lcp > 4000) f.push('slow LCP ' + r.perf.lcp + 'ms');
    if (r.perf.cls > 0.25) f.push('high CLS ' + r.perf.cls);
    // A stack whose FIRST family resolves to nothing (no loaded web font, no installed font) renders in the fallback — this is how
    // hard-coded 'Cormorant Garamond' / 'DM Sans' literals silently bypass the hashed next/font family names.
    (r.design.fontIssues || []).forEach(function (fi) { f.push('font "' + fi.family + '" does not resolve (' + fi.count + ' elements render in fallback: ' + fi.fallback + ')'); });
    if (r.perf.jsKB > 450) f.push('JS payload ' + r.perf.jsKB + 'KB on the wire');
    return f;
  }

  /* ------------------------------------------------------------------ clickAll */
  // Never auto-click anything whose label says it ends the session or destroys the account, even in block mode.
  var SKIP_TEXT = /(sign ?out|log ?out|logout|delete (my )?account|close account|permanently delete)/i;
  function candidates() {
    var q = 'button,[role=button],[role=tab],[role=switch],[role=menuitem],[role=option],[role=checkbox],summary,input[type=checkbox],input[type=radio],input[type=submit],input[type=button],[aria-expanded],[aria-haspopup]';
    var els = arr(document.querySelectorAll(q));
    // also the clickable-non-interactive divs, so we learn whether they do anything
    arr(document.body.querySelectorAll('div,span,li,img')).forEach(function (e) {
      if (visible(e) && getComputedStyle(e).cursor === 'pointer' && !e.closest(q + ',a,label') ) els.push(e);
    });
    var seen = new Set(), out = [];
    els.forEach(function (e) {
      if (seen.has(e)) return; seen.add(e);
      if (!visible(e) || e.disabled || e.getAttribute('aria-disabled') === 'true' || e.closest('[inert]')) return;
      if (e.tagName === 'INPUT' && e.type === 'file') return;
      var nm = accName(e); if (SKIP_TEXT.test(nm)) return;
      if (e.closest('nextjs-portal')) return;
      out.push(e);
    });
    return out;
  }
  function openDialogs() { return document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open],[aria-modal=true]').length; }
  function domSig() { return document.body.getElementsByTagName('*').length + ':' + (document.body.innerText || '').length; }

  async function closeDialogs() {
    for (var k = 0; k < 3 && openDialogs(); k++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await sleep(150);
      if (!openDialogs()) return true;
      var cb = arr(document.querySelectorAll('[role=dialog] button,[aria-modal=true] button,dialog button')).filter(visible).find(function (b) { return /close|cancel|dismiss|×|✕|got it|ok/i.test(accName(b)); });
      if (cb) { cb.click(); await sleep(150); }
    }
    return !openDialogs();
  }

  async function clickAll(o) {
    o = o || {};
    var settle = o.settleMs || 350, max = o.max || 60, from = o.from || 0, only = o.only ? new RegExp(o.only, 'i') : null, skip = o.skip ? new RegExp(o.skip, 'i') : null;
    var startUrl = location.pathname + location.search;
    var all = candidates(), report = [], summary = { total: all.length, clicked: 0, noEffect: 0, navigated: 0, dialogs: 0, blockedWrites: 0, errors: 0, nonInteractive: 0, unclosedDialogs: 0 };
    var mo = new MutationObserver(function () { mo.n = (mo.n || 0) + 1; });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); mo.n = 0;
    var lastIndex = from - 1;
    for (var i = from; i < all.length && summary.clicked < max; i++) {
      var el = all[i];
      lastIndex = i;
      if (!el.isConnected || !visible(el)) continue;
      var name = accName(el) || textOf(el), tag = el.tagName.toLowerCase();
      if (only && !only.test(name)) continue;
      if (skip && skip.test(name)) continue;
      var isNonInteractive = !/^(button|summary|input)$/.test(tag) && !el.getAttribute('role');
      var pre = { url: location.pathname + location.search + location.hash, sig: domSig(), dlg: openDialogs(), net: log.net.length, err: log.errors.length, dia: log.dialogs.length, opn: log.opens.length, frm: log.forms.length, exp: el.getAttribute('aria-expanded'), chk: el.checked, cls: el.className, foc: document.activeElement };
      mo.n = 0;
      try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
      try { el.click(); } catch (e) { push(log.errors, { k: 'click-threw', m: clip(e.message, 100) }); }
      await sleep(settle);
      if (pre.url.split('#')[0] !== (location.pathname + location.search + location.hash).split('#')[0]) {
        // client-side navigation: note and go back
      }
      var post = { url: location.pathname + location.search + location.hash };
      var eff = [];
      if (post.url !== pre.url) eff.push('nav→' + post.url);
      var newNet = log.net.slice(pre.net), blocked = newNet.filter(function (n) { return n.blocked && !n.deniedGet; }), deniedGets = newNet.filter(function (n) { return n.deniedGet; }), failed = newNet.filter(function (n) { return n.s >= 400 || n.s === 0; });
      if (blocked.length) eff.push('blocked-write:' + blocked.map(function (n) { return n.m + ' ' + n.u; }).join(','));
      if (deniedGets.length) { eff.push('blocked-get:' + deniedGets.map(function (n) { return n.u; }).join(',')); summary.blockedGets = (summary.blockedGets || 0) + deniedGets.length; }
      var gets = newNet.filter(function (n) { return !n.blocked && !/_rsc=/.test(n.u); });
      if (gets.length) eff.push('net:' + gets.length);
      if (failed.length) eff.push('FAILED-REQ:' + failed.map(function (n) { return n.m + ' ' + n.u + ' ' + n.s; }).join(','));
      var nd = openDialogs(); if (nd > pre.dlg) eff.push('dialog-opened');
      if (log.dialogs.length > pre.dia) eff.push('native-' + log.dialogs[log.dialogs.length - 1].k);
      if (log.opens.length > pre.opn) eff.push('window.open→' + log.opens[log.opens.length - 1].u);
      if (log.forms.length > pre.frm) eff.push('form-submit');
      if (el.getAttribute('aria-expanded') !== pre.exp) eff.push('aria-expanded ' + pre.exp + '→' + el.getAttribute('aria-expanded'));
      if (el.checked !== pre.chk) eff.push('checked ' + pre.chk + '→' + el.checked);
      if (log.errors.length > pre.err) { var ne = log.errors.slice(pre.err).filter(function (e) { return e.k !== 'console.warn'; }); if (ne.length) eff.push('ERROR:' + ne.map(function (e) { return e.m || e.src; }).join(' | ').slice(0, 160)); }
      if (mo.n > 0 && !eff.some(function (x) { return /^(aria|checked|dialog|nav)/.test(x); })) eff.push('dom-changed×' + mo.n);
      var meaningful = eff.length > 0;
      summary.clicked++;
      if (!meaningful) summary.noEffect++;
      if (eff.some(function (x) { return x.indexOf('nav→') === 0; })) summary.navigated++;
      if (nd > pre.dlg) summary.dialogs++;
      if (blocked.length) summary.blockedWrites += blocked.length;
      if (eff.some(function (x) { return x.indexOf('ERROR') === 0 || x.indexOf('FAILED-REQ') === 0; })) summary.errors++;
      if (isNonInteractive) summary.nonInteractive++;
      report.push({ i: i, tag: tag + (el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''), n: name, s: sel(el), ni: isNonInteractive || undefined, eff: eff.length ? eff : ['NO-EFFECT'] });
      if (nd) { var closed = await closeDialogs(); if (!closed) { summary.unclosedDialogs++; report[report.length - 1].eff.push('DIALOG-WONT-CLOSE'); } }
      if (post.url.split('#')[0] !== startUrl.split('#')[0]) {
        // left the page via client-side routing: return so the remaining candidates stay valid
        history.back(); await sleep(700);
        if (location.pathname + location.search !== startUrl) { report[report.length - 1].eff.push('COULD-NOT-RETURN'); break; }
        all = candidates(); // DOM re-rendered; re-derive and continue past this index
      }
    }
    mo.disconnect();
    return { url: startUrl, lastIndex: lastIndex, candidates: all.length, summary: summary, notable: report.filter(function (r) { return r.eff[0] === 'NO-EFFECT' || r.eff.some(function (x) { return /^(ERROR|FAILED-REQ|nav→|dialog|DIALOG|blocked-write|blocked-get|native-|window\.open|COULD-NOT)/.test(x); }); }), all: o.verbose ? report : undefined };
  }

  /* ------------------------------------------------------------------ disk persistence (scratch-only route) */
  // The scratch build adds POST /api/qa-collect (loopback-only, append-only ndjson). It is called with the ORIGINAL fetch, so it is
  // never counted in the page's own network log and never blocked by the write-guard.
  function collect(kind, payload) {
    if (!origFetch) return Promise.resolve(false);
    var body;
    try { body = JSON.stringify({ kind: kind, at: now(), page: location.pathname + location.search, data: payload }); } catch (e) { return Promise.resolve(false); }
    return origFetch('/api/qa-collect', { method: 'POST', keepalive: body.length < 60000, headers: { 'content-type': 'application/json' }, body: body })
      .then(function (r) { return r.ok; }, function () { return false; });
  }

  /* ------------------------------------------------------------------ autopilot */
  // queue item: { url, label, persona, vp?, click?:bool, only?:string, maxClicks?:number, wait?:ms, settle?:ms, expect?:string }
  // State lives in localStorage so it survives the hard navigations (the <head> script re-attaches on every page).
  var MAX_HOPS = 10;
  function apState() { return lsGet(LS.ap) || { on: false }; }
  function apSave(s) { lsSet(LS.ap, s); }
  function selfNav(url) { guard.selfNav = true; location.assign(url); }

  async function settleNetwork(maxMs) {
    var t0 = now(), quietSince = now();
    while (now() - t0 < maxMs) {
      if (log.inflight > 0) quietSince = now();
      if (now() - quietSince > 700 && document.readyState === 'complete') return true;
      await sleep(150);
    }
    return false;
  }
  function loaded(maxMs) {
    return new Promise(function (r) {
      if (document.readyState === 'complete') return r(true);
      var t = setTimeout(function () { r(false); }, maxMs || 15000);
      window.addEventListener('load', function () { clearTimeout(t); r(true); }, { once: true });
    });
  }
  function emptyAgg() { return { total: 0, clicked: 0, noEffect: 0, navigated: 0, dialogs: 0, blockedWrites: 0, blockedGets: 0, errors: 0, nonInteractive: 0, unclosedDialogs: 0 }; }

  async function finishItem(s, item, out, note) {
    if (note) out.note = note;
    out.probe.flags = flagsOf(out.probe); // recomputed: click-phase errors are in the log now
    out.probe.errors = log.errors.slice(-12);
    out.done_at = now();
    await collect('page', out);
    s.digest = s.digest || [];
    s.digest.push({ i: s.i, label: item.label, persona: item.persona, vp: out.vp, req: item.url, at: out.at, redirected: out.redirected, redirects: out.probe.redirectCount, nflags: out.probe.flags.length, clicked: out.click ? out.click.agg.clicked : null, noEffect: out.click ? out.click.agg.noEffect : null, errors: out.click ? out.click.agg.errors : null, note: note || undefined });
    s.i++; s.cur = null; s.phase = 'nav'; s.hops = 0; s.landing = null; s.click = null;
    if (s.i >= s.queue.length) { s.on = false; s.done = true; s.finished = now(); apSave(s); return; }
    apSave(s);
    selfNav(s.queue[s.i].url);
  }

  async function apStep() {
    var s = apState(); if (!s.on) return;
    var item = s.queue[s.i]; if (!item) { s.on = false; s.done = true; apSave(s); return; }
    var wantPath = item.url.split('#')[0], gotPath = location.pathname + location.search;

    // ---- Returning mid-click-phase after the previous click navigated us away (hard nav).
    if (s.phase === 'click' && s.click) {
      if (gotPath !== s.landing) {
        s.click.navAways.push({ idx: s.click.next - 1, to: gotPath });
        if (s.hops > MAX_HOPS || s.click.navAways.length > 8) { apSave(s); s.cur.click = { agg: s.click.agg, notable: s.click.notable, navAways: s.click.navAways }; return finishItem(s, item, s.cur, 'click phase abandoned: too many navigations away'); }
        apSave(s); selfNav(s.landing); return;
      }
    }

    await loaded(15000);
    await settleNetwork(item.wait || 9000);
    await sleep(item.settle || 400);

    if (s.phase !== 'click') {
      var p = buildProbe();
      var out = { i: s.i, label: item.label, persona: item.persona, vp: item.vp || (window.innerWidth <= 500 ? 'mobile' : 'desktop'), req: item.url, at: gotPath, redirected: gotPath !== wantPath, cell: item.cell, expect: item.expect, probe: p, at_ms: now() };
      s.cur = out; s.landing = gotPath;
      if (item.click && !p.blank) { s.phase = 'click'; s.click = { next: 0, agg: emptyAgg(), notable: [], navAways: [] }; apSave(s); }
      else { apSave(s); return finishItem(s, item, out, p.blank ? 'blank page — click phase skipped' : null); }
    }

    // ---- Click phase, one candidate per step so a hard navigation costs at most that one click.
    var c = s.click, all = candidates();
    c.agg.total = Math.max(c.agg.total, all.length);
    if (c.next < all.length && c.next < (item.maxClicks || 40)) {
      var idx = c.next; c.next = idx + 1; apSave(s);
      var rep = await clickAll({ from: idx, max: 1, only: item.only, skip: item.skip, settleMs: item.clickSettle || 400 });
      s = apState(); c = s.click;
      if (!c) return; // finished/stopped elsewhere
      ['clicked', 'noEffect', 'navigated', 'dialogs', 'blockedWrites', 'blockedGets', 'errors', 'nonInteractive', 'unclosedDialogs'].forEach(function (k) { c.agg[k] += rep.summary[k]; });
      rep.notable.forEach(function (n) { if (c.notable.length < 60) c.notable.push(n); });
      c.next = Math.max(c.next, rep.lastIndex + 1);
      apSave(s);
      if (location.pathname + location.search !== s.landing) { selfNav(s.landing); return; }
      return apStep();
    }
    s.cur.click = { agg: c.agg, notable: c.notable, navAways: c.navAways, candidates: all.length, cappedAt: all.length > (item.maxClicks || 40) ? (item.maxClicks || 40) : undefined };
    return finishItem(s, item, s.cur, null);
  }

  var autopilot = {
    start: function (queue, opts) {
      apSave({ on: true, queue: queue, i: 0, phase: 'nav', hops: 0, started: now(), opts: opts || {}, digest: [] });
      lsDel(LS.res);
      selfNav(queue[0].url);
      return 'started ' + queue.length + ' items';
    },
    stop: function () { var s = apState(); s.on = false; apSave(s); return 'stopped at ' + s.i; },
    resume: function () { var s = apState(); s.on = true; s.hops = 0; apSave(s); selfNav(s.queue[s.i].url); return 'resumed at ' + s.i; },
    status: function () { var s = apState(); return { on: !!s.on, done: !!s.done, i: s.i, total: (s.queue || []).length, phase: s.phase, error: s.error, cur: s.queue && s.queue[s.i] ? s.queue[s.i].url : null, lastDigest: (s.digest || []).slice(-3) }; },
    digest: function (from) { var s = apState(); return (s.digest || []).slice(from || 0).map(function (d) { return d.i + ' ' + d.persona + '/' + d.vp + ' ' + d.req + (d.redirected ? ' => ' + d.at : '') + ' [' + d.nflags + ' flags' + (d.clicked != null ? ', ' + d.clicked + ' clicks, ' + d.noEffect + ' no-effect, ' + d.errors + ' err' : '') + (d.note ? ', ' + d.note : '') + ']'; }); },
    clear: function () { lsDel(LS.res); lsDel(LS.ap); },
  };

  window.__qa = { version: VERSION, guard: guard, log: log, probe: buildProbe, clickAll: clickAll, autopilot: autopilot, collect: collect, sel: sel, accName: accName, visible: visible, candidates: candidates, settleNetwork: settleNetwork };

  // Auto-attach after a hard navigation.
  function boot() {
    var s = apState();
    if (!s.on) return;
    s.hops = (s.hops || 0) + 1; apSave(s);
    setTimeout(function () {
      apStep().catch(function (e) { var st = apState(); st.error = String(e && e.stack || e).slice(0, 500); st.on = false; apSave(st); });
    }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
