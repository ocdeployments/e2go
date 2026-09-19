# E2go.app — End-to-End QA Test Plan

> **Version 1.1 (FINAL — the plan the test will be run against)** · 2026-09-19 · Author: Claude (acting as QA lead) for Romy
> v1.0 (2026-09-18) was scored by one independent review agent: **68/100, "approve with changes"**. Every finding was checked against source; this version applies them. The response is in `PLAN_REVIEW.md`. Nothing in the test is run until this document is on disk.
> Inputs (generated, in `docs/qa/`): `INVENTORY.md` / `INVENTORY_DETAIL.md` / `inventory.json` (what exists) · `TEST_MATRIX.md` / `.json` (every cell; **all counts are computed by the generator, never typed by hand**) · `guard-order.json` (static API guard-order analysis).
> Tooling (in `scripts/qa/`, none of it ships): `matrix-data.mjs` (policy data) · `gen-matrix.mjs` (matrix builder) · `run-http.mjs` + `http-lib.mjs` (HTTP layers) · `probe.js` + `build-queue.mjs` (browser layers) · `login-server.mjs` (persona sessions) · `summarize.mjs` (scoring) · `guard-order.mjs` · `make-qa-env.mjs` · scratch setup scripts.

## Changelog v1.0 → v1.1

| # | Change | Why |
|---|---|---|
| 1 | Side-effect classes renamed **S→E (E0–E3)**; severity keeps **S0–S4** | "S1" meant two things (a write class and a severity) |
| 2 | **GET is no longer assumed read-only.** 21 GET handlers were found to write, mail, spend LLM money or are cron jobs; each is hand-reviewed and classed (§5) | v1.0 ran them as "read-only" as persona C |
| 3 | Structured expectations (`exp.kind`) replace string expectations; ids are stable; `{path}`/`<id>` placeholders are resolved from a per-route **ownership model** | 12 cells had unresolved `<id>`; the bypass-route expectation was mis-parsed; foreign ids leaked into non-IDOR cells (F-007) |
| 4 | **Admin oracle corrected.** `src/app/admin/layout.tsx` redirects a signed-in non-admin to `/` (307), anon is caught by middleware → `/login?next=…`. Expectation: `→ /` **or** 404, never admin markup | v1.0 said `notFound()` |
| 5 | **`/auth/callback` without a valid code returns 200 `text/html`** (client shim, no `Set-Cookie`), not a redirect | v1.0 was wrong |
| 6 | **HSTS is set by the app** (`next.config.mjs:64-65`), not the edge | v1.0 was wrong |
| 7 | **Isolation statement corrected:** Supabase is the *production* project; OpenAI, Google Places, Census and the Vercel OIDC token were also live and are now blanked; rate limiting is *in memory*, not off | v1.0 overstated isolation |
| 8 | **`application_documents` is empty (0 rows) in the shared DB.** L3-2 and L3-4 rewritten; `{C.appdoc}` cells dropped; recorded as a known gap | the cells could not be resolved |
| 9 | **Server Actions are in scope** (`create-account.ts`, `verify-token.ts`): source-reviewed, never executed; the harness blocks `Next-Action` POSTs; the guard has a self-test | v1.0's inventory missed them |
| 10 | Guard-order analysis v2 (fixed an aliased-handler blind spot); numbers in L1-9 are the v2 result | v1.0 numbers were stale |
| 11 | Added L2-8 (garbage-cookie tests), owner-download probe OP1, whole-run before/after ledger snapshot, persona-precondition check | reviewer gaps |
| 12 | Scoring: INCONCLUSIVE / SKIP / INFO mapping, false-positive triage before caps, second-agent audit of S0/S1 and 10 % of PASS cells | reviewer gaps |
| 13 | Rate-limit procedure, resume support (`--skip-done`, cell ids), explicit **exclusions** list and **known gaps** G1–G11 | reviewer gaps |
| 14 | Stale figures removed (384/155 cells, 24/15/7 API modes, "78 static", 8 IDOR cells, old guard-order numbers) | computed now |

## 0. Mandate and the sequence this plan follows

Romy's instruction: audit every page / button / link → write a plan → have **one other agent** score the plan → then test as a user *and* as a 20-year QA expert (log in, click everything clickable, read every text and button, check that everything renders and behaves) → fix what can safely be fixed → write a **scored** report → say **what lacks**, so the test can be run again.

| Step | Status | Artifact |
|---|---|---|
| 1 Audit | done | `INVENTORY.md`: 110 pages, 127 route-handler files (125 `/api` + `/auth/callback` + `/dev/email-preview/[template]`) = 149 handlers (route × method), 24 layouts, 273 links, 600 buttons, 10 forms, 232 inputs, 188 client `fetch()` calls, 2 Server Actions |
| 2 Plan | done | this document + `TEST_MATRIX.md` |
| 3 Independent scoring | done | one review agent, read-only: 68/100; response in `PLAN_REVIEW.md` |
| 3b Apply the review | **in progress** | this v1.1; matrix regenerated; runner, probe, queue, login helper and summariser edited |
| 4 Execute | after 3b | raw results in the scratch dir (NDJSON + HTTP JSON) |
| 5 Fix, report, "what lacks" | after 4 | `REPORT_2026-09-18.md`; fixes are **uncommitted** working-tree edits on `dev` |

No further agent is used to *plan*. After execution, a **second-agent audit** of results is added (§7) because a reviewer asked for independent verification of the S0/S1 findings; it is read-only.

**Project rules that shape the method.** RULE 8 (`CLAUDE_CONTEXT.md`): *no Playwright, no Magic MCP* — overrides global `~/.claude/CLAUDE.md` Step 5; visual/behavioural checks use the built-in browser pane plus HTTP, DB reads, tsc and jest. Locked design (Obsidian Gold `#0a0a0a` / `#C9A84C` / Cormorant Garamond / DM Sans, zero border-radius); brand string "E2go.app"; branch `dev` only, never `main`; the live Supabase schema is the source of truth and every `{data,error}` is read; the document-storage exception (identity documents never stored, financial/business documents stored — do not "fix").

## 1. What "the whole app" is

| Class | Pages | Rule (from `src/middleware.ts`) |
|---|---|---|
| public | 28 | no session needed (`/account-recovery`, `/pricing/success`, `/reset-password`, `/unsubscribe`, `/verify`, `/terms-required`, `/retention/confirm-hold` need a query param to do anything) |
| auth-page | 2 (`/login`, `/signup`) | signed-in users bounce to `/case-profile` |
| auth (login only) | 15 | 6 enforced by middleware → `/login?next=<path>`; **9 bypass middleware** (below) |
| paid | 51 | middleware: signed in **and** paid access (Upstash-cached `AccessCache`; **fails open** on DB error); deleted → `/account-recovery`; sim-only → `/simulator`, else `/results`; `/apply*` additionally needs `terms_acceptance(terms_version='1.0')` else `/terms-required?next=<path>`. Order: paid gate → terms gate → page-level redirect stubs |
| admin | 14 | anon: middleware → `/login?next=…`; signed-in non-admin: `admin/layout.tsx` → `/` (307). APIs use `requireAdmin()`/`getRequestingAdmin()` → 403 |

**The 9 middleware-bypass pages** (verified: exactly the pages with `enforcedByMiddleware=false` that are not public):
* server-protected: `/documents` (anon → `/login?next=/documents`; paid user → `/documents/<app id>`; else `/case-profile`), `/renewal` (anon → `/login?next=/renewal`);
* client-protected: `/franchise`, `/franchise/{connect,discover,matches}`, `/renewal/{documents,intake}` and `/franchise/brand/[slug]` (no page-level auth at all; may render anonymously). Anonymous browser PROBE with a `gated` expectation: redirect to login **or** an in-page sign-in state **or** 401/403 from its API — must not crash or render account data.

**Redirect stubs** (asserted by landing, not clicked): `/dashboard`→`/case-profile`, `/score`→`/results`, `/modules`→`/pricing`, `/apply`→`/case-profile` (persona D hits the terms gate first), `/documents/debug-error`→404.

**Server Actions** (public POSTs with a `Next-Action` header, invisible to the route inventory): `createAccountFromVerifiedEmail` (`src/app/actions/create-account.ts`, service-role `auth.admin.createUser({email_confirm:true})`, called from `results/page.tsx:186`) and `verifyToken`/`markTokenUsed` (`verify-token.ts`, caller `verify/page.tsx:43`). Source-reviewed only — **never executed** (account creation is prohibited). Finding F-010 (§9).

Static audit findings the live run must **confirm or clear** (each is a cell or a note): 189 inputs without a programmatic label · 26 unnamed buttons · 3 unnamed links · 20 clickable non-interactive elements · 3 native `alert/confirm/prompt` · 2 `target=_blank` without `rel` · 22 orphan API routes · 11 unresolved path literals · 3 brand-casing hits · 6 TODO strings · 27 non-public pages with no page-level auth signal.

## 2. Test environment and isolation (corrected)

**Target: a production build (`next build && next start`) of the current working tree, in a scratch copy on `127.0.0.1:3020`.** Persona sessions come from `login-server.mjs` on `127.0.0.1:3021`. Rejected: production (real customers); `npm run dev` on :3000 (shares `.next`, stray dev servers already there, dev overlays distort measurement); Playwright (RULE 8).

**Isolation controls** (`make-qa-env.mjs`; values never printed, mode 600, refuses to overwrite the repo `.env.local`):

| Resource | In the scratch instance |
|---|---|
| Sentry (DSN, auth token) | blank |
| Upstash Redis | blank → middleware and route limiters use **in-memory** fallback |
| Resend | invalid non-empty key → every send fails 401 instead of mailing |
| `CRON_SECRET` | random → nothing holding the real secret can drive scratch cron |
| Turnstile | Cloudflare public always-pass pair |
| OpenRouter, Anthropic, Groq, **OpenAI** | invalid → LLM routes fail closed at zero cost (`--allow-llm` is **not** used) |
| **Google Places, Census** | invalid → territory/market engines take their "no data" path |
| **Vercel OIDC token** | blank |
| listener / collector | loopback only |
| **Supabase** | **the same project production uses** — kept |
| Stripe | TEST keys kept |

**What is NOT isolated — stated, not hidden.** Authenticated tests read and (for persona B/C/D on E1 routes) write **production database rows belonging to QA personas**. Every 429 the scratch rate limiter produces is written to the shared `rate_limit_hits` table. A staging Supabase project or branch is the proper fix; it is a recommendation in the report, not a precondition of this run.

**Gaps versus production (limit what "pass" means):** no Vercel edge/CDN/real TLS; no Sentry; rate limits are per-process memory (reset by restarting the server); email and LLM never leave the box; cron never fires; the apex-host gate is simulated with a spoofed `Host` header (spoofable — noted).

### L0 — Health and precondition gate (green before anything is scored)

| ID | Check | Pass |
|---|---|---|
| L0-1 | `GET /` and `GET /api/health` on :3020 | 200; `database` check ok (503 is a finding) |
| L0-2 | `window.__qa.version` is the expected harness version after a hard load; no hydration error | true / none |
| L0-3 | **write-guard self-test:** `fetch(POST)` from the page | synthetic `{qa_blocked:true}` + `x-qa-blocked: 1`; nothing in the server log |
| L0-3b | **Server-Action guard self-test:** `fetch(POST)` with a `Next-Action` header | blocked the same way (proves the guard covers Server Actions) |
| L0-3c | **GET deny-list self-test:** `fetch(GET /api/cron/data-retention)` from the page | synthetic 403 `qa_blocked`, counted as `blockedGets` |
| L0-4 | collector round-trip | line in `qa-results.ndjson`, valid JSON |
| L0-5 | persona mint for B via `login-server.mjs`; `GET /case-profile` | 200, not `/login`; cookie never printed |
| L0-5b | **persona preconditions** (DB read): D has **no** terms row; B and C have terms 1.0; paid-app counts as expected; ids resolve | matches §3, else stop |
| L0-6 | `npx tsc --noEmit` | exit 0 |
| L0-7 | scratch build is of the current tree (`git rev-parse --short HEAD` and source-diff check) | true |
| L0-8 | scratch env class check (values never printed): each variable in the table above has the expected value *class* | all as tabled |

A red gate stops the run; the fix comes first and the gate is re-run.

## 3. Personas and data state

| Persona | Account | State (counts only) | Permitted use |
|---|---|---|---|
| anon | — | no session | public pages, gate assertions, anonymous probes |
| **A** | founder (**real** account) | terms ✓, 1 paid app, 2 `fdd_analyses`, role user | **read-only, last, only FDD pages**; needs `--allow-A`; minting a session is an auth-state write on a real account and is disclosed. Before use: grep `/api/fdd/*` handlers and FDD pages for writes-on-GET |
| **B** | test-france | paid, terms ✓, 1 app, 0 docs / family | default authenticated persona; **the only one for reversible writes** |
| **C** | test-uk | terms ✓, 5 apps (1 paid, 4 unpaid — one extra unpaid app and a pending `foundation` payment come from UAT-03 clicks), 1 family member, 25 uploaded + 25 generated docs, 3 jobs | read-mostly; richest data, do not pollute; gets mobile cells |
| **D** | test-partnership | paid partnership app, 1 family member, **no terms row** | asserts `/apply*` → `/terms-required?next=<path>`; read-only |

All four are `role = 'user'`. **Ownership model** (drives the generator): A owns userId + fdd; B owns userId + app; C owns userId + app + family + job + doc + upload; D owns userId + app + family. A persona is only ever pointed at another persona's id inside an explicit IDOR cell.

**Coverage gaps by construction (KNOWN_GAPS G1–G11, printed in the matrix):** no admin persona (admin-positive paths untested; J12 covers only the deny side) · no unpaid / sim-only / FDD-only / soft-deleted / unverified persona · `application_documents` is empty · FDD pages only via A · one browser engine · Supabase shared with production · session lifecycle untested · Stripe paths not exercised · no HTTP logout route exists (sign-out is client-side `auth.signOut`) · e-mail content and deliverability · LLM features run with keys disabled. Creating accounts or granting roles is prohibited; these are reported, not worked around.

**Login:** personas authenticate only through a server-minted magiclink (Supabase admin `generate_link` → `/auth/v1/verify`). No password is typed or stored; no secret is printed. The helper is loopback-only, Host-whitelisted, refuses persona A without `--allow-A`, validates `to` as a same-origin path, and (v1.1) checks `Sec-Fetch-Site` and keeps a mint ledger. `/signup` is exercised for rendering and validation only — **no account is ever created**.

## 4. Test layers

Evidence is always captured (probe JSON line, HTTP transcript, or measured DOM value), never "looked fine". Every cell has a stable id.

### L1 — Static and build gates

| ID | Check | Pass criterion |
|---|---|---|
| L1-1 | `tsc --noEmit` | exit 0 |
| L1-2 | `npm test` (jest) in the scratch copy | suites pass; counts and skips recorded |
| L1-3 | `next build` | exit 0, 194 static pages; baseline warnings 359 `require-supabase-error-check`, 10 `exhaustive-deps`, 1 Edge `process.version` — deltas explained |
| L1-4 | `scripts/qa-audit-inventory.mjs` re-run | counts unchanged or delta explained |
| L1-5 | `python3 scripts/audit-schema-drift.py --refresh` | no drift beyond `docs/SPRINT_S_SCHEMA_DRIFT.md`. Check first whether it writes tracked files; env is loaded per the `.env.local` safety rule (no raw commands touching `.env.local` without a backup) |
| L1-6 | brand-casing scan of user-facing strings | 0 hits outside URLs / e-mails / keys / env / identifiers; the `E2GO.APP` all-caps legal text (`TermsClient.tsx:258,261`) is a decision, not a bug |
| L1-7 | secret scan of `.next/static` and public assets | 0 hits |
| L1-8 | dead-path review of the 11 unresolved literals and 22 orphan APIs | each classified alive / dead / intentional |
| L1-9 | `guard-order.mjs` v2 over all 149 handlers | 0 `effect-before-guard`. **Result: 8 validation-first, 135 guard-first, 3 no-effect, 3 no-guard** (`GET /api/health`, `GET /auth/callback`, `GET /dev/email-preview/[template]` — each hand-verified public-by-design). 21 GET handlers with writes/LLM are hand-reviewed and classed E0–E3 in `GET_REVIEW` (§5). 6 `guardNotEnforced` handlers re-read by hand. No server-component page or layout writes at render |
| L1-10 | six cron GET handlers read one by one | secret check is the first statement and fails closed when `CRON_SECRET` is unset |
| L1-11 | Server Actions source review (`create-account.ts`, `verify-token.ts`) | each documented: caller, trust boundary, what proves email ownership. **Never executed** |
| L1-12 | matrix integrity | unique cell ids; every one of the 110 pages has ≥ 1 cell; the 9-page bypass set equals the inventory's `enforcedByMiddleware=false` non-public pages; no GET writer without a `GET_REVIEW` entry |

### L2 — Anonymous HTTP matrix (Node HTTP, no browser)

| ID | Check | Pass criterion |
|---|---|---|
| L2-1 | every page × anon: status and `Location` | per matrix `exp`: public → 200; auth/paid/admin → `/login?next=<path>`; server-protected bypass pages → `/login?next=<path>`; `/documents/debug-error` → 404 |
| L2-2 | brand-host spoof `Host: e2go.app` and `www.e2go.app` | allowed: `/`, `/early-access`, `/api/faq/ask`, `/api/_sentry-tunnel`, `/favicon.ico`; blocked (redirect → `/early-access`): `/pricing`, `/login`, `/signup`, `/quiz`, `/results`, `/faq`, `/api/health`, `/case-profile`, `/admin` |
| L2-3 | API cells, one per handler (route × method), policy from `matrix-data.mjs` — **`static`** (never sent: blocked class, source-verified), **`live-deny`** (anon, non-blocked, guard-first user-auth handlers: GET, or non-GET sent with `{}` / NIL ids → 401/403 before any work), **`live-validation`** (validation-first routes, `{}` / invalid e-mail / forged token only → 400; never a valid payload), **`live-public`** (`/api/health`, `/auth/callback`, `/dev/email-preview/[template]`). Counts are computed and printed in the matrix summary | per-cell `exp`; `/auth/callback` w/o or with an invalid code = 200 `text/html` shim, no `Set-Cookie`; `/dev/email-preview/*` = 404 in prod build |
| L2-4 | blocked handlers | not sent. Method-specific: `GET /api/documents` (list; source-reviewed: 401 anon, `.eq('user_id')`, no writes) is live-allowed while `POST /api/documents` (upload) stays blocked |
| L2-5 | response headers on `/`, `/api/health`, `/pricing` | CSP, `X-Frame-Options`/`frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, **HSTS present (from `next.config.mjs:64-65`, not the edge)**; CSP looseness noted |
| L2-6 | `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/manifest.json`, `/manifest.webmanifest`, `/sw.js`, `/apple-touch-icon.png` | recorded (robots/sitemap known-absent → SEO finding) |
| L2-7 | unknown route, `/documents/not-a-uuid`, `/apply/dependent/not-a-uuid`, `/franchise/brand/does-not-exist-qa`, `/api/does-not-exist-qa` | branded 404, never a stack trace or 500 |
| L2-8 | **garbage-cookie tests**: `sb-<ref>-auth-token` set to `garbage` and to a JSON-ish token on `/case-profile` and `/documents`; `/api/applications/<NIL>` with `garbage` | page → `/login?next=<path>`; API → 401/403; never a 500 or a leak |
| L2-9 | 429 handling | a rate-limited response is INCONCLUSIVE, not a fail; per-start budget ≤ 4 login POSTs, ≤ 2 quiz probes |

### L3 — Authenticated HTTP matrix (persona cookies from `login-server.mjs`)

| ID | Check | Pass criterion |
|---|---|---|
| L3-1 | each persona × each gated page: landing URL/status | per matrix: B/C: 200 on paid pages; **D on `/apply*` → `/terms-required?next=<path>` (terms gate precedes stub redirects)**; non-admin on `/admin*` → **`/` or 404 with no admin markup**; signed-in on `/login`/`/signup` → `/case-profile`; `/documents` → `/documents/<own app id>` |
| L3-2 | **IDOR — pages:** B → C's app id on `/documents/*`, `/generate/*`; C → B's app id; B → C's family id on `/apply/dependent/*`; C → D's family id; B → A's fdd id on `/fdd/*`; B → C's/B's user id on `/admin/users/*`. **IDOR — API (GET only):** `applications/{id}`, `generate/{progress,download,case-brief,validate,documents}/…`, and `documents/<NIL>` (+ `/download`) | strict deny set: 403/404 (or redirect for pages) only; **200 = FAIL S0**; 401 = INCONCLUSIVE (wrong session); transport failure = INCONCLUSIVE, never PASS. Non-GET variants are **never** sent cross-user. SSE progress is cut after a few seconds |
| L3-3 | `authProbe`: the eligible GETs as B (query derived from route source: `applicationId` / `section=investment` / none); the ones that are blocked stay blocked | 200 JSON scoped to B, no other user's ids; `[applicationId]` dynamic routes only. E1-writer GETs are run deliberately and disclosed |
| L3-4 | **owner probe OP1 (replaces bulk owner-download):** persona C `GET /api/generate/download/{C.app}`, one file, headers and magic bytes only (never stored/printed) | 200 (ZIP magic `PK`) or 403 `packageReady=false`; `generation_pipeline_log.downloaded_at` snapshot before/after is disclosed |
| L3-5 | link check: every unique internal `href` harvested by L4/L5, requested with B's cookie | no 404/500; redirects intentional. **Never** follows an href matching the NEVER list (§5) |
| L3-6 | soft-delete gate, unverified gate | not testable (no persona) → known gap |
| L3-7 | ledger: whole-run before/after row counts of the persona tables (PostgREST `Prefer: count=exact`; `{error}` read; 42703 → INCONCLUSIVE) + OP1 snapshot | delta explained by E1 cells; unexplained delta = finding |

### L4 — In-browser page probe (`probe.js`)

One cell = URL × persona × viewport (1280×800; 390 mobile for the funnel and every `MOBILE_CLICK` page). Cells are generated (see the matrix summary for counts). Per page the probe returns: landing URL/status/title/lang · headings and landmarks · text length, blank-screen / error-screen / Next-overlay detection · horizontal overflow · every link and button and input with accessible name · forms · images · tap targets (44 px phones, 24 px desktop) · contrast · **font-resolution check** (found F-001) · design tokens (border-radius ≠ 0, off-palette colours) · brand-casing scan of visible text · performance (TTFB, DCL, load, LCP or proxy, CLS, JS/image KB, long tasks) · console errors · network log · `flags[]`.

| ID | Pass criterion (each violation is a finding, severity per §6) |
|---|---|
| L4-1 | landing matches `exp`; status < 400; no error screen / overlay / blank body |
| L4-2 | no console error or unhandled rejection; no failed request other than intentionally blocked ones (`x-qa-blocked`) |
| L4-3 | no horizontal overflow at 390 or 1280 |
| L4-4 | one `h1`, no skipped heading levels, `main` landmark, `lang`, unique `<title>` |
| L4-5 | every interactive element has an accessible name; every input a label; no `href="#"`; external links `rel="noopener"` |
| L4-6 | "E2go.app" everywhere the user reads it; no lorem / TODO / `undefined` / `NaN` / `[object Object]` / raw keys / leaked ids |
| L4-7 | fonts resolve (Cormorant Garamond headings, DM Sans body); zero border-radius; palette = tokens |
| L4-8 | contrast ≥ 4.5:1 (3:1 large text); tap targets ≥ 44 px on phones |
| L4-9 | JS ≤ 450 KB wire per route; no image > 500 KB; LCP ≤ 2.5 s where measurable |
| L4-10 | **anonymous `gated` probes** on the 7 client-protected bypass pages: redirect to login, in-page sign-in state, or 401/403; no account data, no crash |

### L5 — Click-through under the write-guard

The autopilot visits each CLICK cell with a hard navigation, waits for the network to settle, probes, then clicks **every visible enabled interactive element** in document order (cap 40; `SKIP_TEXT` skips sign-out / log-out / delete-account / close-account / permanently-delete), recording navigation target, dialogs, network calls (blocked included), console errors, DOM change; it returns to the page. Menus, accordions, tabs, modals and toggles get a second pass.

| ID | Pass criterion |
|---|---|
| L5-1 | every click has an observable sensible outcome — a click that does nothing is a defect unless disabled by design |
| L5-2 | every internal navigation lands on an inventory page matching its label |
| L5-3 | every blocked write shows the user a success **or** an intelligible error — never a silent no-op, endless spinner, or raw error string |
| L5-4 | no click produces a console error, unhandled rejection, or request to a third-party origin not in the CSP |
| L5-5 | dialogs recorded with their text and read for wording; `confirm` auto-declined |
| L5-6 | destructive controls exist, are labelled, and demand confirmation — verified by presence and wording, never executed |
| L5-7 | **GET deny-list respected**: page loads that call cron/email-schedule/admin/interview-prep/market-analysis GETs receive a synthetic 403 and the UI degrades gracefully (recorded as `blockedGets`) |

### L6 — Forms, states and data behaviour

For each of the 10 forms and the 232 inputs: empty submit · malformed value · boundary length · very long paste · special characters / HTML / emoji · required-field messaging · error copy names the field and a next step · focus moves to the first error · Enter submits · Escape closes dialogs · double-submit protection. Submits are answered by the guard, so the check is client behaviour plus the request that **would** have been sent (path, method, payload shape, no secrets in it). Server-side validation is exercised only through the L2-3 `live-validation` cells. Also: autosave (debounce, indicator, persistence) on persona B only with reversible edits restored; every list/data view has an empty state, every async operation a loading state, every fetch an error state.

### L7 — User journeys (hand-driven in the built-in browser, read as a person)

J1 visitor → quiz → results → pricing · J2 sign-up / log-in surfaces (render + validation only) · J3 paid customer: case profile → each Apply module → checklist · J4 upload → extraction → review → gaps · J5 generation and download (UI only) · J6 interview simulator · J7 gap analysis / market analysis / FDD · J8 franchise discovery and renewal · J9 settings, consent, terms, account lifecycle · J10 trust surfaces: support, legal, learn hub, early access, partner access · J11 brand-host gate · J12 admin surface, **deny side only** (`→ /` or 404). Each journey is judged on: can a first-time user finish it without help; is the next action always obvious; do copy, prices and promises agree across pages (homepage metadata "From $550." vs a $990 Foundation package is a suspected mismatch); dead ends.

### L8 — Cross-cutting

| ID | Check |
|---|---|
| L8-1 | responsive: 1280 and 390 for every CLICK/PROBE cell; 768 spot-check on nav, pricing, quiz, apply |
| L8-2 | keyboard: full Tab traversal of `/`, `/login`, `/quiz`, `/pricing`, `/case-profile`, one Apply page — visible focus, logical order, no trap, skip link; modal focus trap and Escape |
| L8-3 | accessibility: names/labels/landmarks/contrast/heading order + `prefers-reduced-motion` handling (read from CSS/JS) |
| L8-4 | performance: JS payload, image weight, hero PNG sizes, long tasks, CLS; LCP only where the pane is visible |
| L8-5 | SEO/social: title, description, canonical, OG/Twitter, robots, structured data per public page |
| L8-6 | service worker (`public/sw.js`, cache `e2go-v2`): cache-first static assets → stale-asset risk; `OFFLINE_URL` dead code |
| L8-7 | copy audit: homepage, pricing, results, terms, privacy, support read in full for typos, contradictions, legal over-claims, consistency of prices/dates/product names |

## 5. Side-effect ledger, blocklist and guards (E0–E3)

| Class | Meaning | Rule |
|---|---|---|
| E0 | read-only | run freely |
| E1 | writes to QA-persona data only | allowed only where reviewed and disclosed; real *reversible* writes only on persona B |
| E2 | outbound e-mail/messages, Stripe objects, paid LLM or paid third-party API | never executed; queued for Romy |
| E3 | irreversible, financial, account creation/deletion, privileged, or global cron jobs | never executed, never queued for execution by me |

**GET is not assumed E0.** Effect resolution order: `GET_REVIEW` (hand-reviewed) → `HARD_BLOCK` class → method default (GET/HEAD/OPTIONS E0, others E1).

`GET_REVIEW` verdicts (21 GET handlers): **E1** `documents/[documentId]/download`, `documents/[documentId]`, `generate/download/[applicationId]`, `case-profile/build`, `franchise/matches`, `renewal/intake`, `/auth/callback` · **E2** `simulator/interview-prep`, `market-analysis`, `admin/health-detail` · **E3** `email/schedule` and the six `cron/*` GETs (data-retention, generation-resume, health-watchdog, payment-reconciliation, quiz-nurture, rebuild-profiles) · **E0** `documents/gap-report`, `simulator/case-gaps`, `generate/progress/[jobId]`, `/dev/email-preview/[template]`.

**Hard blocklist (`HARD_BLOCK`, method-specific exceptions via `ALLOW_GET`):** `/api/cron/*` · `/api/email/schedule` · `/api/admin/*` · `/api/stripe/webhook` · `/api/account/(delete|restore|export)` · Stripe checkout/verify/grant routes · `/api/checkout/initiate` · partner/notifications/nps/support/coming-soon/early-access/email/faq (except the two `LIVE_PROBES` carve-outs) · generation and LLM routes (`generate`, `renewal/generate`, `fdd`, `gap-analysis`, `analysis`, `ai`, simulator LLM routes incl. `interview-prep`, `market-analysis`, `followup`, `documents` upload POST, `documents/extract`, `apply/parse-document`, `quiz`) · `dashboard/request-regeneration|certify-document`. **`ALLOW_GET`** (six reviewed, exact `"METHOD /route"`): `GET /api/generate/download/[applicationId]`, `…/case-brief/[applicationId]`, `…/validate/[applicationId]`, `…/documents/[applicationId]`, `GET /api/generate/progress/[jobId]`, `GET /api/documents`.

Also never: card numbers · e-mailing example.com or Romy's inbox · exports of persona A · any real send · L3-5 following an href that matches the blocklist.

**Write-guard (in-page, scratch build only):** every non-GET `fetch`/XHR is answered with a synthetic 200 (`qa_blocked:true`, `x-qa-blocked: 1`) and logged; **a POST carrying a `Next-Action` header (a Server Action) is blocked the same way and self-tested (L0-3b)**; session-refresh and token-verify endpoints pass; `sendBeacon` swallowed; native non-GET form submits and `window.open` prevented; external and `/api/` cross-document navigations refused. **GET deny-list:** `/api/cron/`, `/api/email/schedule`, `/api/admin/`, `/api/simulator/interview-prep`, `/api/market-analysis` receive a synthetic 403 (`qa_blocked`, `x-qa-blocked: 1`, counted as `blockedGets`). **What the guard cannot stop:** other GET side effects and SSR effects. Disclosed page-load E1 writers: `/results` (→ `GET /api/case-profile/build` upserts derived rows), `/franchise/matches`, `/renewal*` (→ `GET /api/renewal/intake`). Downloads cannot be triggered by clicking; they are verified by OP1 and the click is recorded as "blocked at boundary".

**Anonymous-probe policy:** `static | live-deny | live-validation | live-public`, each live probe listed explicitly. Validation probes send `{}`, an invalid e-mail or a forged token → 400; **never a valid payload**. `POST /api/franchise/brand-view` is probed with `{}` only (a valid slug inserts into `franchise_brand_views` via service role with no auth — F-008). Anon `live-deny` is used only for non-blocked guard-first user-auth routes, per method.

## 6. Defects: severity, taxonomy, fix policy

| Sev | Definition | Examples |
|---|---|---|
| S0 blocker | data loss/leak, security hole, payment or legal breakage, app unusable | IDOR returning another user's data |
| S1 critical | a core journey cannot be completed, or a gate fails open | unpaid user reaches a paid page |
| S2 major | wrong/broken behaviour with a workaround; site-wide design-lock violation | headings rendering in Georgia (F-001) |
| S3 minor | cosmetic, copy, a11y polish, perf over budget | eyebrow labels at 3.3:1 |
| S4 trivial | nit | spacing off by a few px |

Categories: Functional · Access/Security · Data · Content/Copy · Visual/Design-lock · Responsive · Accessibility · Performance · SEO · Robustness · Docs/Process.

**Fix policy.** I fix in the real repo only when the change is unambiguous, local, low-risk and re-measurable (before/after evidence). Anything touching product behaviour, pricing, legal copy, schema, auth or payments is reported with a recommended fix instead. One concern per file, **left uncommitted on `dev`**, nothing pushed. `npm run build` is never run while a dev server shares `.next`.

## 7. Scoring

**Per cell (0–100):** rendering & layout 20 · content & copy 15 · behaviour 25 · access control & data safety 15 · accessibility 10 · design-lock 10 · performance 5. Deductions inside the dimension: S0 −100 (cell capped at 40), S1 −15, S2 −8, S3 −3, S4 −1, **once per rule per page**.

**Result mapping:** PASS = full marks for the checked dimension; FAIL = deductions above; **INCONCLUSIVE** (429, transport failure, unavailable measurement) = excluded from the mean *and* counted as not executed for coverage; **SKIP** (blocked by policy) = excluded from the mean, counted as "not planned to execute" and listed; **INFO** = recorded, no score effect. Any `'S0?'` unresolved item → verdict **HOLD**.

**Overall release-readiness (0–100)** = 0.50 × criticality-weighted mean of page cells (funnel ×3: `/`, `/quiz*`, `/results`, `/pricing`, `/signup`, `/login`, `/case-profile`, `/apply/*`, `/documents/*`, `/generate/*`; others ×1) + 0.20 × API & access-control score (L2, L3, L1-9/10) + 0.15 × static & build gates (L1) + 0.15 × journeys (L7). **Caps:** open S0 → ≤ 59; open S1 → ≤ 79; ≥ 5 open S2 → ≤ 89. Caps apply **after false-positive triage**: every S0/S1 candidate is reproduced by hand once before it counts; refuted ones are listed as false positives.

**Coverage** = executed-and-evidenced ÷ planned, per layer and per persona, every unexecuted cell named. **Confidence** High / Medium / Low from coverage, the §2 gaps and the §3 gaps. The report prints all three (score, coverage, confidence).

**Independent audit:** after execution, one read-only agent re-verifies all S0/S1 findings against the raw evidence plus a 10 % random sample of PASS cells; disagreements are resolved before the report is final.

**Recommendation:** GO (≥ 90, coverage ≥ 90 %, no S0/S1) · GO with fixes (75–89, or one named S1 with a fix) · NO-GO (any S0, or < 75) · HOLD (unresolved `'S0?'`).

## 8. Coverage and explicit exclusions (what this run cannot prove)

Not testable, by design or missing persona: admin-positive pages and every admin mutation success path · payment-gate negative branches and Stripe checkout completion · real e-mail delivery, rendering, deliverability · LLM output quality · cron behaviour · real sign-up, e-mail verification, password-reset delivery · real upload and OCR/extraction · Turnstile against real traffic · Vercel edge, real TLS, CDN, real-user performance · load, concurrency, distributed rate limiting · soft-delete / recovery flow · legal correctness of generated documents · **boundary pages** (`/pricing/success` real success/failure states, token pages with valid tokens) · **engines and devices** other than the embedded browser · **session lifecycle** and expired-token refresh · e-mail link targets · consent pre-calls · HTTP logout (no such route) · owner-download of `application_documents` (table empty).

## 9. Findings already established (before execution)

Carried into the report with their evidence; execution confirms or refutes them.
* **F-001** (S2, sitewide design-lock): literal `'Cormorant Garamond'` (318 occurrences in 99 files) and `'DM Sans'` bypass the next/font hashed families, so Georgia/system-ui renders. Fix candidate: global override / codemod to `var(--font-cormorant)` / `var(--font-dm-sans)`, excluding emails/PDF/docx/OG; measure `design.fontIssues` before/after.
* **F-002** (low a11y): small gold labels at 9–10 px, 55–65 % alpha, contrast 3.28–4.16:1. **F-003** (info): desktop nav links ~20 px tall. **F-004** (perf): `/` loads ~26 JS files; hero PNG 1.6 MB; `public/images/*.png` 1.7–2.5 MB. **F-005** (docs): `docs/UAT_GAPS.md` UAT-01/UAT-04 stale. **F-006** (positive): 0 effect-before-guard; admin routes fail closed.
* **F-007** (tooling): v1 matrix gave personas foreign ids (fixed by the ownership model).
* **F-008** (S3): anonymous `POST /api/franchise/brand-view` writes `franchise_brand_views` via service role, no auth/rate-limit/caps.
* **F-009** (classification): state-changing GETs (both download routes, `documents/[documentId]`, `case-profile/build`, `franchise/matches`, `renewal/intake`, `market-analysis`, paid-LLM `simulator/interview-prep`) — also a CSRF/prefetch surface.
* **F-010** (S1 candidate, security): the public Server Action `createAccountFromVerifiedEmail` creates pre-confirmed accounts with no server-side proof of e-mail ownership. Source-confirmed, never exercised. Proposed fix: verify an unexpired `email_verifications` token bound to the e-mail and mark it used; add a rate limit/Turnstile or move it to an API route. **Queued for Romy — not fixed by QA.**
* **F-011** (low–medium): authenticated `POST /api/email/results` trusts `body.email` / `outcome` / `result_json` / `full_name`, so any signed-in user can send the branded results e-mail to any address (rate-limited 3/60 min). Fix: use the caller's session e-mail and DB row. **Queued.**
* **S4:** anonymous `POST /api/support/submit` writes tickets and e-mails the admin inbox, no Turnstile seen.
* **Candidate S3 robustness:** empty-body `POST /api/_sentry-tunnel` and `/api/franchise/brand-view` return 500 (should be 400) — confirmed by the L2-3 empty-body probes.
* **Data note:** `application_documents` has 0 rows, so the extraction/download pipeline that reads it is untested with data.
* **Candidate low:** `/api/generate/progress/[jobId]` may double-close its SSE controller — check scratch logs after the SSE cell.

## 10. Risks to this plan (and mitigations)

| Risk | Mitigation |
|---|---|
| Shared production Supabase: authenticated tests touch production rows | ledger §5; persona B only for reversible writes; A read-only and last; whole-run before/after counts; recommend a staging project |
| Rate limiter writes 429s to a shared table | restart qa-scratch between layers; per-start budgets (§4 L2-9); 429 → INCONCLUSIVE |
| Built-in pane reports `visibilityState = hidden` → LCP/CLS partly unavailable | `lcpProxy`, wire/decoded bytes; pane fronted for funnel pages; residual gap stated |
| Preview-harness quirks (scroll pinned to top, `innerText` CSS-transformed, React state async) | measure geometry from the DOM; `element.click()`; re-read state after settle |
| RULE 8 vs global Step 5 (Playwright) | RULE 8 wins; existing `tests/` Playwright specs neither run nor removed |
| Heuristic tooling (guard-order, contrast/font detectors) can mis-report | every flagged item re-read/re-measured by hand; false positives listed |
| Autopilot hard-navigations mask hydration/back-forward bugs | J1–J3 hand-driven with back/forward/refresh |
| Stray dev servers on :3000/:3010 not stoppable by this session (classifier denies) | tests use :3020 only; reported to Romy with PIDs |
| Service-worker cache-first staleness → stale probe | unique `?t=` on harness assets; restart scratch after new `public/` files |
| Run interrupted | NDJSON append-only, stable cell ids, `--skip-done`; chunked queues (≤ 40 items) |

## 11. Execution order (the run book)

1. Finish tooling: matrix v2 → `run-http.mjs` → `probe.js` → `build-queue.mjs` → `login-server.mjs` → `summarize.mjs` smoke test on a synthetic input (synthetic outputs deleted afterwards, never confused with real results).
2. Regenerate the scratch env, **restart qa-scratch and qa-login** so the blanked env takes effect.
3. **L0** gate (all rows). Stop on red.
4. **L1** static gates and **L2** anonymous HTTP (including brand-host spoof and garbage cookie). Close MUST-FIX items from the review before continuing.
5. **L3** authenticated HTTP as B, C, D (restart qa-scratch first); IDOR cells; OP1; ledger before/after.
6. **L4/L5** browser layers by persona × viewport in chunks; hand-driven **L7** journeys; **L6** forms; **L8** cross-cutting.
7. Persona **A** last, FDD pages only, read-only, `--allow-A`, disclosed.
8. Triage false positives; fix small safe issues (F-001 with before/after); queue E2/E3 and F-010/F-011 for Romy.
9. Second-agent audit of S0/S1 + 10 % of PASS cells.
10. Write `REPORT_2026-09-18.md`; message Romy.

## 12. Re-run protocol ("tell me what lacks and we will do the test again")

Every cell has a stable id (`route|persona|viewport|depth`, plus a variant where needed). Results are appended as NDJSON with harness version, git SHA, timestamp and build id. A **delta run** = failed cells + cells touched by fixes + previously unexecuted cells (`build-queue.mjs --only <ids>` / `--skip-done`); a **full run** = the whole queue. A finding is "fixed" only with before/after evidence from the same cell. The report's *What lacks* section is the re-run backlog: unexecuted cells, missing personas (admin, unpaid, sim-only, FDD-only, soft-deleted, unverified), environment gaps (staging Supabase, real e-mail inbox for one send test), unverifiable claims — each with what would close it.

Triggers for a full re-run: any change to `middleware.ts`, layouts, `globals.css`, `tailwind.config.*`, auth/payment routes, or the harness version.

## 13. Deliverables and hygiene

`docs/qa/REPORT_2026-09-18.md` (scores, findings register with evidence, what lacks, how to re-run) · `docs/qa/PLAN_REVIEW.md` (independent review and my response) · raw results in the scratch dir (not committed) · uncommitted fixes with a per-file change list · a one-message summary to Romy.

Session hygiene at the end: `git checkout .claude/launch.json`; `preview_stop` qa-scratch and qa-login; `resize_window` preset `desktop`; delete the scratch copy, its derived `.env.local`, `qa-ids.json`, `qa-results.ndjson`, `http-out/` and throwaway scripts; restart the standard dev server only if I own it.
