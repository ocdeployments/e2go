/**
 * QA matrix — data and policy tables (no logic). Consumed by gen-matrix.mjs.
 *
 * Everything a reviewer may want to challenge lives here: who owns which ids, what each persona may touch, which routes
 * are never called live, which anonymous probes are allowed and what each must return.
 *
 * Effect classes (replaces the v1.0 "S0-S3" naming, which conflated defect severity with side effects):
 *   E0  read-only
 *   E1  writes to QA-persona data only (reversible in principle, but the database is SHARED with production)
 *   E2  outbound e-mail / message / Stripe object / paid LLM or paid third-party call  -> queued for the owner, never sent
 *   E3  irreversible, financial, account create/delete, privileged, or a global job    -> never
 *
 * Symbolic ids ({B.app}, {C.family}, {A.fdd} ...) are resolved at run time from the git-ignored qa-ids.json.
 * A persona only ever receives ids it owns; a foreign id appears ONLY in an explicit cross-owner (IDOR) cell.
 */

export const NIL = '00000000-0000-0000-0000-000000000000';

export const PERSONAS = {
  anon: { label: 'Anonymous', note: 'no session', effect: 'E0', terms: null, owns: [] },
  A: {
    label: 'A — founder account (real)',
    note: 'READ-ONLY. Real account; the only persona with FDD analyses. A session is minted only with --allow-A, last, and disclosed.',
    effect: 'E0',
    terms: true,
    approval: 'A',
    owns: ['userId', 'fdd'],
  },
  B: { label: 'B — test-france (paid, terms ok)', note: 'default authenticated persona; the only one used for reversible writes', effect: 'E1', terms: true, owns: ['userId', 'app'] },
  C: {
    label: 'C — test-uk (richest data)',
    note: '5 apps (1 paid), 25 uploaded + 25 generated docs, 1 family member, 3 jobs; terms accepted. Read-mostly — do not pollute.',
    effect: 'E1',
    terms: true,
    owns: ['userId', 'app', 'family', 'job', 'doc', 'upload'],
  },
  D: { label: 'D — test-partnership (NO terms row)', note: 'paid partnership app; /apply* must bounce to /terms-required', effect: 'E1', terms: false, owns: ['userId', 'app', 'family'] },
};

/** Dynamic page segments: literal for anonymous, owned ids per persona, and cross-owner [attacker, token] pairs. */
const APP = { anon: NIL, own: { B: '{B.app}', C: '{C.app}', D: '{D.app}' }, idor: [['B', '{C.app}'], ['C', '{B.app}']] };
const FDD = { anon: NIL, own: { A: '{A.fdd}' }, idor: [['B', '{A.fdd}']] };
const ADMIN_USER = { anon: NIL, own: {}, idor: [['B', '{C.userId}'], ['C', '{B.userId}']] };
export const DYN = {
  '/documents/[applicationId]': APP,
  '/generate/[applicationId]': APP,
  '/apply/dependent/[familyMemberId]': { anon: NIL, own: { C: '{C.family}', D: '{D.family}' }, idor: [['B', '{C.family}'], ['C', '{D.family}']] },
  '/apply/security/[personId]': { anon: 'principal', own: { B: 'principal', C: 'principal', D: 'principal' }, idor: [] },
  '/fdd/questions/[fddId]': FDD,
  '/fdd/report/[fddId]': FDD,
  '/fdd/review/[fddId]': FDD,
  '/fdd/score/[fddId]': FDD,
  '/fdd/territory/[fddId]': FDD,
  // first slug in src/data/franchise-brands.ts (37 brands)
  '/franchise/brand/[slug]': { anon: 'assisting-hands', own: { B: 'assisting-hands' }, idor: [] },
  '/admin/users/[userId]': ADMIN_USER,
  '/admin/users/[userId]/view': ADMIN_USER,
};

/** One query-string variant per route, exercised once as a graceful-handling PROBE. */
export const QUERY = {
  '/pricing/success': '?session_id=cs_test_qa_invalid',
  '/reset-password': '?code=qa-invalid',
  '/retention/confirm-hold': '?token=qa-invalid',
  '/unsubscribe': '?token=qa-invalid',
  '/terms-required': '?next=/apply',
  '/onboarding': '?session_id=cs_test_qa_invalid',
};

/** Pages whose bare URL needs a token/state the visitor does not have: the contract is "handled gracefully", not "200". */
export const PARAM_REQUIRED = new Set(['/pricing/success', '/reset-password', '/retention/confirm-hold', '/unsubscribe', '/verify', '/terms-required', '/account-recovery']);
export const STATE_DEPENDENT = new Set(['/quiz/profile', '/quiz/review', '/results']);

/** Redirect-only pages (server-side redirect() / notFound()) — asserted at the HTTP layer, no browser cell. */
export const STUBS = { '/dashboard': '/case-profile', '/score': '/results', '/modules': '/pricing', '/apply': '/case-profile' };

/** Middleware-bypass pages that self-protect on the SERVER (redirect to /login?next=<pathname>). */
export const BYPASS_SERVER = new Set(['/documents', '/renewal']);
/** Middleware-bypass pages that self-protect only on the CLIENT (auth.getUser in the browser) — HTTP 200 proves nothing. */
export const BYPASS_CLIENT = new Set([
  '/franchise',
  '/franchise/brand/[slug]',
  '/franchise/connect',
  '/franchise/discover',
  '/franchise/matches',
  '/renewal/documents',
  '/renewal/intake',
]);

/** Pages that carry per-user data and therefore also get persona C (richest data) and a mobile pass. */
export const DATA_RICH = /^\/(case-profile|documents\/\[|generate\/\[|apply\/(upload|family|dependent|business|investment|story|ties|qualifications|module[12])|gap-analysis|simulator(\/quick-start|\/case-file)?$|onboarding|settings)/;
export const MOBILE_CLICK = new Set(['/', '/pricing', '/results', '/quiz', '/login', '/signup', '/early-access', '/support', '/case-profile', '/onboarding', '/apply/business', '/simulator', '/settings']);
export const B_ON_PUBLIC = ['/', '/pricing', '/results', '/support', '/quiz', '/learn', '/terms', '/privacy'];

/**
 * Routes that are NEVER called live, for any persona, with any body.
 * [pattern, why, class]. Reviewed GETs in ALLOW_GET below are the only exceptions.
 */
export const HARD_BLOCK = [
  [/^\/api\/cron\//, 'cron job: would run against the SHARED production database', 'E3'],
  [/^\/api\/email\/schedule$/, 'sends e-mail on a schedule', 'E3'],
  [/^\/api\/admin\//, 'privileged; no admin persona exists', 'E3'],
  [/^\/api\/stripe\/webhook$/, 'signature-verified payment webhook', 'E3'],
  [/^\/api\/account\/(delete|restore|export)$/, 'irreversible account lifecycle / personal-data export', 'E3'],
  [/^\/api\/stripe\/(checkout|create-checkout|grant-simulator-sessions|verify-payment)$/, 'creates Stripe objects / grants paid entitlements', 'E2'],
  [/^\/api\/checkout\/initiate$/, 'creates a Stripe checkout', 'E2'],
  [/^\/api\/(partner|notifications|nps|support|coming-soon-interest|early-access|email|faq)(\/|$)/, 'sends e-mail / writes messages or unauthenticated rows', 'E2'],
  [
    /^\/api\/(generate|renewal\/generate|fdd|gap-analysis|analysis|ai|simulator\/(evaluate|coaching-report|follow-up|transcribe|tts|prep-kit|quick-start|interview-prep)|market-analysis|followup|documents$|documents\/extract|apply\/parse-document|quiz)/,
    'paid LLM / third-party API, or long generation job',
    'E2',
  ],
  [/^\/api\/dashboard\/(request-regeneration|certify-document)$/, 'triggers regeneration / certification', 'E2'],
];

/**
 * GET/HEAD handlers that are reviewed safe to call live (owner reads, ownership-checked, no writes and no paid calls) even
 * though a HARD_BLOCK pattern matches their prefix. Verified by reading the handler source (see docs/qa/PLAN_REVIEW.md).
 */
export const ALLOW_GET = new Set([
  'GET /api/generate/download/[applicationId]',
  'GET /api/generate/case-brief/[applicationId]',
  'GET /api/generate/validate/[applicationId]',
  'GET /api/generate/documents/[applicationId]',
  'GET /api/generate/progress/[jobId]',
  // src/app/api/documents/route.ts GET: auth.getUser -> 401 first; applicationId required (400); select ... .eq('application_id').eq('user_id', user.id);
  // read-only list. The POST upload handler in the same file stays blocked by the `documents$` pattern (method-specific: see gen-matrix effect rules).
  'GET /api/documents',
]);

/**
 * Hand review of every GET/HEAD handler that scripts/qa/guard-order.mjs flagged as writing or spending (21 in the current tree).
 * The v1.0 plan called all of these "read-only". Effect: E0 = false positive, E1 = persona-data write, E2/E3 = never live.
 */
export const GET_REVIEW = {
  'GET /api/documents/[documentId]/download': { effect: 'E1', note: 'logDocumentAccess() inserts document_access_log' },
  'GET /api/documents/[documentId]': { effect: 'E1', note: 'logDocumentAccess() inserts document_access_log' },
  'GET /api/generate/download/[applicationId]': { effect: 'E1', note: 'sets generation_pipeline_log.downloaded_at, only when the package is ready' },
  'GET /api/case-profile/build': { effect: 'E1', note: "aliased 'export const GET = rebuild'; upserts derived case_profiles / case_model; fired by every authenticated /results load" },
  'GET /api/franchise/matches': { effect: 'E1', note: 'buildCaseProfile() upsert of derived rows' },
  'GET /api/renewal/intake': { effect: 'E1', note: "inserts a draft renewal_intakes row when a completed 'renewal' payment exists and there is no intake (QA personas have none -> 403)" },
  'GET /api/simulator/interview-prep': { effect: 'E2', note: 'paid callLLM on GET' },
  'GET /api/market-analysis': { effect: 'E2', note: 'upserts answers, inserts market_analyses, calls Google Places / Census' },
  'GET /api/email/schedule': { effect: 'E3', note: 'sends scheduled e-mail' },
  'GET /api/admin/health-detail': { effect: 'E2', note: 'live OpenRouter probe (paid)' },
  'GET /api/cron/data-retention': { effect: 'E3', note: 'purges storage + rows, sends mail' },
  'GET /api/cron/generation-resume': { effect: 'E3', note: 'global job' },
  'GET /api/cron/health-watchdog': { effect: 'E3', note: 'global job, mail + LLM' },
  'GET /api/cron/payment-reconciliation': { effect: 'E3', note: 'global job' },
  'GET /api/cron/quiz-nurture': { effect: 'E3', note: 'global job, sends mail' },
  'GET /api/cron/rebuild-profiles': { effect: 'E3', note: 'global job' },
  'GET /api/documents/gap-report': { effect: 'E0', note: 'false positive of the static scan (no write/LLM on the GET path)' },
  'GET /api/simulator/case-gaps': { effect: 'E0', note: 'false positive of the static scan' },
  'GET /api/generate/progress/[jobId]': { effect: 'E0', note: 'false positive of the static scan (SSE reader)' },
  'GET /dev/email-preview/[template]': { effect: 'E0', note: 'false positive; the route 404s in production builds' },
  'GET /auth/callback': { effect: 'E1', note: 'login_events insert + session exchange ONLY with a valid code; QA never sends a valid code' },
};

/** Handlers that are public by design. */
export const PUBLIC_BY_DESIGN = {
  'GET /api/health': 'unauthenticated liveness: status + DB latency only, no keys/counts/PII',
  'GET /auth/callback': 'OAuth/magic-link landing; without a valid code it serves a 200 HTML shim (no cookie) that reads hash tokens and POSTs /api/auth/set-session',
  'GET /dev/email-preview/[template]': 'dev-only e-mail preview; MUST 404 in a production build',
};

/**
 * Anonymous LIVE probes for handlers that validate before they authenticate. A probe NEVER carries a valid payload:
 * an empty object, an invalid e-mail or a forged token — each verified against the source to fail validation first.
 */
export const LIVE_PROBES = {
  'GET /api/health': [{ key: 'health', method: 'GET', exp: { kind: 'health' } }],
  'GET /auth/callback': [
    { key: 'no-code', method: 'GET', exp: { kind: 'html-shim' } },
    { key: 'bad-code', method: 'GET', query: '?code=qa-invalid', exp: { kind: 'html-shim' } },
  ],
  'GET /dev/email-preview/[template]': [{ key: 'preview', method: 'GET', exp: { kind: 'notfound' } }],
  'OPTIONS /api/early-access': [{ key: 'options', method: 'OPTIONS', exp: { kind: 'status', in: [200, 204, 405] } }],
  'POST /api/_sentry-tunnel': [
    { key: 'empty-json', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } },
    { key: 'no-body', method: 'POST', body: '', exp: { kind: 'status', in: [400] }, note: 'the v1 recon saw HTTP 500 for an empty body' },
  ],
  'POST /api/auth/login': [{ key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } }],
  'POST /api/auth/signup': [{ key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } }],
  'POST /api/auth/set-session': [{ key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } }],
  'POST /api/retention/confirm-hold': [{ key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } }],
  'POST /api/franchise/brand-view': [
    { key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } },
    { key: 'no-body', method: 'POST', body: '', exp: { kind: 'status', in: [400] }, note: 'the v1 recon saw HTTP 500 for an empty body; a VALID slug writes franchise_brand_views unauthenticated (F-008) — never sent' },
  ],
  'POST /api/early-access': [
    { key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } },
    { key: 'bad-email', method: 'POST', body: '{"email":"not-an-email"}', exp: { kind: 'status', in: [400] } },
  ],
  'POST /api/email/unsubscribe': [
    { key: 'empty', method: 'POST', body: '{}', exp: { kind: 'status', in: [400] } },
    { key: 'forged', method: 'POST', body: '{"token":"qa-invalid"}', exp: { kind: 'status', in: [400] } },
  ],
  'POST /api/coming-soon-interest': [{ key: 'empty', method: 'POST', body: '{}', exp: { kind: 'deny' } }],
};

/** Cross-owner API reads: attacker B asks for an id that persona C (baseline owner) owns. GET only — never a write across users. */
export const IDOR_API = [
  { key: 'application', route: '/api/applications/[applicationId]', path: '/api/applications/{C.app}', baseline: true },
  { key: 'progress', route: '/api/generate/progress/[jobId]', path: '/api/generate/progress/{C.job}', baseline: true, sse: true },
  { key: 'download', route: '/api/generate/download/[applicationId]', path: '/api/generate/download/{C.app}', baseline: false, note: '403 (not 404) for a real foreign id already proves the app exists; the owner download is OP1' },
  { key: 'case-brief', route: '/api/generate/case-brief/[applicationId]', path: '/api/generate/case-brief/{C.app}', baseline: true },
  { key: 'validate', route: '/api/generate/validate/[applicationId]', path: '/api/generate/validate/{C.app}', baseline: true },
  { key: 'documents', route: '/api/generate/documents/[applicationId]', path: '/api/generate/documents/{C.app}', baseline: true },
  // application_documents is EMPTY in the shared database (0 rows), so no real foreign id exists: NIL-id cells only.
  { key: 'doc-get', route: '/api/documents/[documentId]', path: `/api/documents/${NIL}`, baseline: false, expect: 'notfound', note: 'application_documents is empty: cannot test with a real foreign id' },
  { key: 'doc-download', route: '/api/documents/[documentId]/download', path: `/api/documents/${NIL}/download`, baseline: false, expect: 'notfound', note: 'application_documents is empty: cannot test with a real foreign id' },
];

/** Owner (positive-path) probes. */
export const OWNER_PROBES = [
  {
    id: 'OP1',
    persona: 'C',
    method: 'GET',
    path: '/api/generate/download/{C.app}',
    effect: 'E1',
    small: true,
    exp: { kind: 'status', in: [200, 403] },
    snapshot: { table: 'generation_pipeline_log', filter: 'application_id', value: '{C.app}', column: 'downloaded_at' },
    why: "the paid deliverable's download path; writes generation_pipeline_log.downloaded_at only when the package is ready (403 + reasons otherwise, no write)",
  },
];

/** Server Actions (POSTs with a Next-Action header). Static analysis only — never invoked. */
export const SERVER_ACTIONS = [
  { id: 'SA1', file: 'src/app/actions/create-account.ts', name: 'createAccountFromVerifiedEmail', caller: 'src/app/results/page.tsx:186', risk: 'F-010: service-role auth.admin.createUser({email_confirm:true}) with no server-side proof of e-mail ownership' },
  { id: 'SA2', file: 'src/app/actions/verify-token.ts', name: 'verifyToken', caller: 'src/app/verify/page.tsx:43', risk: 'public token check; confirm it is constant-time / rate-limited / does not leak whether an e-mail exists' },
  { id: 'SA3', file: 'src/app/actions/verify-token.ts', name: 'markTokenUsed', caller: 'src/app/verify/page.tsx', risk: 'public state change; confirm the token is bound to the e-mail and single-use' },
];

/** L2-8 — a forged session cookie must behave exactly like no cookie. `<ref>` = Supabase project ref from the env. */
export const GARBAGE_COOKIE = [
  { id: 'GC1', path: '/case-profile', value: 'garbage', exp: { kind: 'redirect', to: '/login?next={path}' } },
  { id: 'GC2', path: '/case-profile', value: '{"access_token":"x.y.z","refresh_token":"x"}', exp: { kind: 'redirect', to: '/login?next={path}' } },
  { id: 'GC3', path: '/documents', value: 'garbage', exp: { kind: 'redirect', to: '/login?next={path}' } },
  { id: 'GC4', path: `/api/applications/${NIL}`, value: 'garbage', exp: { kind: 'deny' } },
];

export const KNOWN_GAPS = [
  { id: 'G1', title: 'No admin persona', impact: 'admin-positive paths (all /admin/*, /api/admin/*) are untestable; only the deny side is tested', mitigation: 'create a dedicated QA admin in a staging project' },
  { id: 'G2', title: 'No unpaid / sim-only / FDD-only / soft-deleted / unverified persona', impact: 'paid-gate fall-through (/results, /simulator), FDD-only pass, /account-recovery for a real deleted user and e-mail-verification states are untested', mitigation: 'seed one persona per state' },
  { id: 'G3', title: 'application_documents is empty in the shared database', impact: '/api/documents/[id] and /download, and the extraction / gap-report paths that read it, cannot be tested with real data; NIL-id cells only', mitigation: 'seed rows in a staging project, or upload a fixture as persona B' },
  { id: 'G4', title: 'FDD pages are testable only through the real founder account (A)', impact: 'A is read-only and needs --allow-A; B/C/D have no FDD analyses', mitigation: 'seed FDD analyses for a QA persona' },
  { id: 'G5', title: 'Single browser engine (embedded Chromium)', impact: 'Safari/WebKit and Firefox rendering, real-device touch and OS font rendering are untested', mitigation: 'run the same queues on BrowserStack / real devices' },
  { id: 'G6', title: 'Supabase project is shared with production', impact: 'every authenticated E1 action lands in the production database; 429s are written to rate_limit_hits', mitigation: 'a staging Supabase project or branch' },
  { id: 'G7', title: 'Session lifecycle is untested', impact: 'expired-token refresh, concurrent sessions, sign-out from the UI (never clicked) and cookie chunk rollover', mitigation: 'a dedicated lifecycle test with a disposable account' },
  { id: 'G8', title: 'Stripe checkout / payment / webhook paths are not exercised', impact: 'pricing -> checkout -> success -> entitlement is verified by inspection only (UAT-03 was verified live by the owner)', mitigation: 'Stripe test-clock run in staging' },
  { id: 'G9', title: 'There is no HTTP logout route', impact: 'sign-out is client-side auth.signOut; an HTTP logout test is impossible (the v1.0 L3-7 cell is dropped)', mitigation: 'covered by G7' },
  { id: 'G10', title: 'E-mail content and deliverability', impact: 'RESEND_API_KEY is disabled in the QA instance; templates are reviewed statically only', mitigation: 'send to a seed inbox in staging' },
  { id: 'G11', title: 'LLM-backed features run with LLM keys disabled', impact: 'generation, simulator scoring, FDD extraction, gap analysis and market analysis are exercised only through their error / empty states', mitigation: 'a funded run with --allow-llm against a staging database' },
];

export const JOURNEYS = [
  { id: 'J1', persona: 'anon', title: 'First-time visitor: landing -> quiz -> results -> pricing', stop: 'never reaches a checkout; card fields are never touched', steps: ['open / and read the hero, proof points and primary CTA', 'start /quiz; answer every step, including back/forward', 'reach /quiz/review and /results with and without state', 'read the teaser / gated state on /results', 'follow the CTA to /pricing; read every tier, price and button label', 'follow the footer links (terms, privacy, support)'] },
  { id: 'J2', persona: 'anon', title: 'Sign-up and log-in surfaces (render + validation only)', stop: 'no account is created; no credential is typed', steps: ['/login renders the form, the Turnstile widget and the forgot-password link', 'submit empty and malformed values: client-side validation and messages', '/forgot-password form validation', '/signup renders; terms links resolve', '/reset-password?code=qa-invalid and /verify show an actionable state'] },
  { id: 'J3', persona: 'B', title: 'Paid customer: case profile -> every Apply section -> checklist', stop: 'writes are blocked by the harness', steps: ['log in as B via the helper; land on /case-profile', 'follow each Apply link (overview, module1-4, module3 a-l, business, investment, family, qualifications, story, ties, calendar, checklist, upload)', 'check progress indicators, next-step CTAs and back links', 'as D: /apply* bounces to /terms-required?next=<path>'] },
  { id: 'J4', persona: 'C', title: 'Document upload -> extraction -> review -> gaps (read-only)', stop: 'no upload is submitted', steps: ['/apply/upload lists the existing files', '/apply/upload/processing, /review and /gaps render for a persona with data', 'delete/replace controls are present but never confirmed'] },
  { id: 'J5', persona: 'C', title: 'Generation and download UI (read-only)', stop: 'no generation is started (POSTs blocked, LLM disabled)', steps: ['/generate/{C.app} shows package status', '/documents/{C.app} lists documents with download links', 'the owner download route answers (OP1)', 'B and C cannot open each other\'s /documents and /generate pages'] },
  { id: 'J6', persona: 'B', title: 'Interview simulator', stop: 'no session is started; LLM disabled', steps: ['/simulator hub, /quick-start, /case-file, /interview-day, /outcome, /prep-kit render', 'LLM-dependent panels show a clear error / empty state, not a blank page'] },
  { id: 'J7', persona: 'B', title: 'Gap analysis, market analysis and FDD', stop: 'no analysis is started', steps: ['/gap-analysis and /market-analysis render for B', '/fdd, /fdd/compare, /fdd/upload render for B (empty) and A (data, read-only)', 'FDD report/score/territory/questions/review for A'] },
  { id: 'J8', persona: 'B', title: 'Franchise discovery and renewal', stop: 'no message or intake is submitted', steps: ['/franchise, /discover, /matches, /connect, /brand/assisting-hands', '/renewal entry and its intake / documents pages for a user without a renewal purchase'] },
  { id: 'J9', persona: 'B', title: 'Settings, consent, terms and account lifecycle', stop: 'delete / export / sign-out controls are never clicked', steps: ['/settings sections render and toggles are reachable', 'D: /terms-required flow', '/retention/confirm-hold?token=qa-invalid and /unsubscribe?token=qa-invalid show a clear invalid-link state', '/account-recovery as anonymous'] },
  { id: 'J10', persona: 'anon', title: 'Trust surfaces', stop: 'the support form is never submitted', steps: ['/support form validation', '/terms, /privacy, /about, /learn hub and six articles, /early-access, /partner-access'] },
  { id: 'J11', persona: 'anon', title: 'Brand-host gate (Host: e2go.app)', stop: 'HTTP only; /api/early-access gets validation probes only', steps: ['allowed: /, /early-access, /api/early-access (400 on invalid), /api/_sentry-tunnel', 'everything else redirects to /early-access, including /login, /pricing and /api/*'] },
  { id: 'J12', persona: 'anon/B/C', title: 'Admin surface (deny side only)', stop: 'no admin session exists; admin-positive paths are a documented gap (G1)', steps: ['anonymous -> /login?next=/admin...', 'role=user (B, C) -> redirected to / or 404 for every /admin page, including the [userId] pages with another persona\'s id', 'no admin data is rendered to a non-admin'] },
];

/** Static / build-time checks: [id, how, pass]. */
export const STATIC = [
  ['tsc', 'npx tsc --noEmit (scratch copy)', 'exit 0'],
  ['jest', 'npx jest (scratch copy)', 'all suites pass; record counts'],
  ['build', 'next build (scratch copy; never in the repo while a dev server shares .next)', 'exit 0; 194 static pages; warnings not above the 359 / 10 / 1 baseline'],
  ['lint', 'npx next lint', '0 errors; warnings not above baseline'],
  ['schema-drift', 'python3 scripts/audit-schema-drift.py --refresh (env sourced; check it does not rewrite tracked files)', 'no drift beyond docs/SPRINT_S_SCHEMA_DRIFT.md'],
  ['route-inventory', 'node scripts/qa-audit-inventory.mjs (re-run)', '110 pages / 127 route files / 149 handlers unchanged'],
  ['brand-casing', 'grep user-facing strings for E2Go / E2GO / e2GO / bare e2go', 'no violations outside the documented exceptions'],
  ['dead-paths', 'inventory: unresolved literal paths + orphan API routes', 'no more than the recorded 11 unresolved / 22 orphan'],
  ['secrets', 'grep the tracked tree and .next/static for key material (sk_live, service_role, private keys)', 'none'],
  ['headers', 'L2-5 response headers on /, /login, /api/health (HSTS is set in next.config.mjs:64)', 'HSTS, nosniff, frame protection, referrer policy, permissions policy present'],
  ['seo', 'title, description, canonical, OG per public page; robots + sitemap', 'unique titles/descriptions; robots + sitemap exist (known absent)'],
  ['cron-guards', 'each /api/cron/* handler checks CRON_SECRET before any effect', 'all six guarded'],
  ['guard-order', 'node scripts/qa/guard-order.mjs', '0 effect-before-guard'],
  ['server-actions', 'source review of src/app/actions/*.ts (SA1-SA3) plus the L0 self-test that a Server Action POST is blocked by the harness', 'each action authorizes the caller and proves ownership of any e-mail it acts on'],
];
