# E2go.app QA Test Plan — Independent Review and Response

Reviewed: `TEST_PLAN.md` v1.0 (225 lines) · Reviewer: one independent read-only agent (the only one used to score the plan, as instructed) · Outcome: **APPROVE WITH CHANGES, 68/100**
Response: `TEST_PLAN.md` v1.1 (this repo, same folder). Every claim below was checked against the source before it was accepted; the outcome of that check is in the "Verified?" column.

The reviewer also noted the harness changed while it was reviewing (`run-http.mjs` 500→566 lines; `build-queue.mjs` and `login-server.mjs` created), and re-checked against the newer versions.

## 1. Scores

| Dimension | Score /10 | Reviewer's basis | What raises it (reviewer) | Status in v1.1 |
|---|---|---|---|---|
| Completeness | 7 | Inventory equals the repo exactly (110 pages / 127 route files / 24 layouts; 0 missing, 0 extra). Missing: Server Actions, error boundaries, browser engines, C/D mobile | Add Server Actions, boundary pages, an engine/device statement. A 10 needs a CI check that fails when a new page/route/action has no cell, plus a second engine | Server Actions added (§1, L1-11, L0-3b); boundary pages + engines/devices in the exclusions list (§8); L1-12 matrix-integrity check added; C mobile added. CI check and second engine remain out of scope (see §5 below) |
| Method soundness | 6 | Good layering and IDOR baselines; ~40 oracle mismatches; GET writes hidden behind "S0" | Dry-run L2/L3 and reconcile oracles. A 10 needs seeded known-bad fixtures proving each oracle can fail | Oracles rebuilt as structured `exp` kinds; GET effects reclassified (§5). Seeded known-bad fixtures **not** built — see §5 |
| Safety and isolation | 5 | Anonymous layer inert; production DB; mutating GETs run as "read-only"; OpenAI key live | Close MUST-FIX 2–4. A 10 needs a staging Supabase branch | Env now blanks OpenAI / Google Places / Census / OIDC; GET_REVIEW + GET deny-list; production-Supabase statement. Staging project = recommendation to Romy, not something I can create |
| Feasibility | 6 | HTTP layers runnable; browser layers rest on helpers created minutes earlier | Record a 10-cell smoke run through L0–L5 | Run book §11 starts with a synthetic smoke test of the summariser and the L0 gate before any scoring |
| Scoring-rubric quality | 6 | Sensible weights/caps; a false S1 trips the 79 cap; label collision; self-graded | Map INCONCLUSIVE/SKIP/INFO; false-positive triage; second-agent audit of all S0/S1 + 10 % of PASS cells | All three added (§7); S0–S4 severity vs E0–E3 effect |
| Re-runnability and honesty | 6 | Candid exclusions, but ids and resume unimplemented; three stated invariants false | One override table feeding the generator; git SHA in results | Stable ids, `--skip-done`/`--only`, SHA in output, runner-only overrides moved into `matrix-data.mjs` (§12) |
| Clarity | 7 | Clean ids and tables; count drift (24 vs 14, 384 vs 237) | Generate the numbers block from the matrix | Counts are computed by the generator, not typed (§4 preamble) |
| **Overall** | **68** | Run L0–L2 now; close MUST-FIX 1–6 before L3–L7 | | Run-order rule adopted (§11 step 4) |

## 2. MUST-FIX — verification and response

| # | Reviewer finding | Verified? | Response in v1.1 / tooling |
|---|---|---|---|
| 1 | ~40 oracle expectations wrong: 28 admin B/C cells expect 404, but `admin/layout.tsx:25-27` redirects non-admins to `/` before any page renders; 11 anonymous redirect cells carry `<id>` placeholders (runner resolves only `<latest paid application id>`); `/auth/callback` returns a 200 HTML shim, not a redirect; admin mismatches were emitted as S1 and would trip the 79 cap | **Confirmed.** (I also found the BYPASS compound expectation was mis-parsed and 1 more unresolved-placeholder family) | Admin oracle = "`/` or 404, never admin markup"; anon → `/login?next=`. `<id>`/`{path}` resolved from the DYN ownership model. `/auth/callback` = 200 `text/html`, no `Set-Cookie`. Bypass routes get `gated` kind. False S1s removed |
| 2 | "GET is S0" is false: `documents/[documentId]/download` appends to `document_access_log`; `generate/download/[applicationId]` updates `generation_pipeline_log.downloaded_at`; any authenticated `/results` load fires GET `/api/case-profile/build`, which upserts. The runner ran them as "read-only" persona C | **Confirmed**, and broader: a systematic scan found **21 GET handlers** with writes, mail, paid-LLM or cron behaviour | `GET_REVIEW` (21, E0–E3 each hand-classified); `ALLOW_GET` for six reviewed-safe GETs; method-specific blocklist; probe.js GET deny-list; owner-download reduced to a single disclosed probe OP1 (persona C, headers/magic bytes only) with a before/after snapshot; page-load E1 writers disclosed; whole-run ledger snapshot |
| 3 | Isolation claims false: only OpenRouter/Anthropic/Groq keys blanked; `OPENAI_API_KEY` (public `POST /api/faq/ask`), Google Places, Census stayed live; DB is production | **Confirmed** | `make-qa-env.mjs` now blanks OpenAI, Google Places, Census, `VERCEL_OIDC_TOKEN`; the plan says "production Supabase" (§2) and lists what is not isolated. qa-scratch and qa-login are still running the old env and must be restarted before the run (run book step 2 — not yet done) |
| 4 | Rate limiting is not off — the in-memory fallback is live (login 5/15 min, quiz 3/h, route limiters); every 429 is written to the shared `rate_limit_hits`; re-runs inside 15 min turn `api-400` cells into 429 FAILs | **Confirmed** | §2 corrected ("in memory", not "off"); L2-9: restart qa-scratch per layer, ≤ 4 login POSTs and ≤ 2 quiz probes per start, 429 → INCONCLUSIVE; 429 writes to the shared table are disclosed |
| 5 | Re-run protocol unimplementable: no cell ids; queue items carry none and dedupe on persona\|vp\|url; `autopilot.start` has no `only:[ids]`; nothing reads `qa-results.ndjson`, so "resumes" (plan:216) was untrue | **Confirmed** | Stable ids on every cell; ids in queue items and collected records; `build-queue.mjs --only/--skip-done`; results carry harness version, SHA and build id (§12). The v1.0 "resumable" claim is withdrawn until implemented and shown |
| 6 | Server Actions outside the inventory/ledger/blocklist: `create-account.ts:34` calls `auth.admin.createUser`; `verify-token.ts` updates `email_verifications`. Only the client fetch patch stops account creation | **Confirmed.** Reading `create-account.ts` also produced **F-010** (below) | Both inventoried (§1); L1-11 source review (never executed); probe.js blocks `Next-Action` POSTs; L0-3b self-test on `/results` |

## 3. SHOULD-FIX

| # | Finding | Response |
|---|---|---|
| 1 | `login-server.mjs` mints a session on a GET (CSRF-able from any tab); host-scoped non-HttpOnly cookie; `--allow-A` mints on the founder's real account | Adding `Sec-Fetch-Site` check and a mint ledger; A stays behind `--allow-A` and is disclosed. **Not adopted:** the `qa.localhost` alias + POST+nonce — loopback-only, Host-whitelisted, same-origin-path validated is judged sufficient for a local, single-user run; noted as a residual risk |
| 2 | L3-2: no status-0 branch (transport failure → PASS); any 3xx/4xx counts as denied | Strict deny set: 403/404 only; 200 = FAIL S0; 401 and transport failure = INCONCLUSIVE |
| 3 | Runner GETs four `/api/generate/*` routes though the plan blocklists generation routes; NEVER covers only run/revise; L3-5 hrefs unguarded | Resolved by the `ALLOW_GET` review (the four GETs were source-read: ownership check, no write/LLM); NEVER list applied to L3-5 harvested hrefs |
| 4 | Runner-only corrections (brand-view, interview-prep, matches) missing from matrix/plan | All moved into `matrix-data.mjs`; runner's private override tables removed (`MODE_OVERRIDES`, `NOT_S0`, `FIXED_QUERY`, `DERIVED_UPSERT`); brand-view probe is `{}` only |
| 5 | Browser cells per persona C 23 (desktop only), D 3, A 11 — C has the richest data | `MOBILE_CLICK` (13 pages) gets C mobile; counts computed |
| 6 | guard-order: add one-level import scan for `.insert/.update/.upsert` | Implemented as guard-order v2 (fixed an aliased-handler blind spot too). Result on 149 handlers: 8 validation-first, 135 guard-first, 3 no-effect, 3 no-guard, 0 effect-before-guard; 21 GET writers → `GET_REVIEW` |
| 7 | Persona B "reversible writes" need before/after row check; test logout and expired-cookie behaviour over HTTP | Whole-run before/after persona-table counts (L3-7). No logout API route exists (client-side `auth.signOut`), so HTTP logout is a stated exclusion; garbage-cookie tests added (L2-8) |

## 4. NICE-TO-HAVE and factual corrections

| Item | Response |
|---|---|
| Rename effect classes E0–E3 | Done |
| Replace hand-kept line refs in `guard-order.mjs` with token assertions | Not done — low value for a one-shot audit; noted |
| Generate plan numbers from `TEST_MATRIX.json` | Plan now avoids hard-coded matrix counts |
| Axe-style ruleset instead of heuristic a11y | Not done — RULE 8 excludes the usual tooling; the probe's heuristics stay and every finding is re-measured by hand |
| plan:114 "24 routes" (authProbe is 14; 24 was the live-GET count) | Fixed; counts computed |
| plan:105 HSTS "edge-provided" — `next.config.mjs:64` sets it | Fixed (L2-5) |
| plan:119 "384 page cells" — only 237 are browser cells; 147 REDIR cells are HTTP-only | Fixed; split reported by the generator |
| plan:106 lists "error boundary" in L2-6 but nothing requests one | Removed from L2-6; boundary pages are now a stated exclusion |
| plan:47 vs plan:51 (memory fallback vs "no rate limiting") contradict | Fixed |

## 5. Not adopted, and why

* **Seeded known-bad fixtures proving each oracle can fail** (reviewer's route to a 10 on method): a cost the run cannot carry. Mitigation: the guard self-tests (L0-3/3b/3c), hand re-measurement of every S0/S1, and the second-agent audit.
* **CI check failing on a page/route/action with no cell**: a repo change beyond QA scope. L1-12 gives the same assurance at run time.
* **Second browser engine, staging Supabase branch, `qa.localhost` + POST-nonce login**: environment or scope decisions for Romy; reported under "what lacks".

## 6. Verified true by the reviewer (kept)

* 110 pages / 127 route files / 24 layouts equal the matrix sets exactly.
* All validation-only handlers return 4xx before any effect for exactly `{}`; `set-session` and `_sentry-tunnel` return 500 only on a zero-length body (the runner sends `{}`).
* Loopback-only refusal and the blocklist work; 20+ handlers read by the reviewer: none can e-mail, charge, spend LLM money or create an account for an anonymous GET or `{}`.
* Of the 14 authProbe handlers, only download, matches and interview-prep have effects (I later found more, via the 21-GET scan).
* Not re-derived by the reviewer: link/button/input/fetch counts (273 / 600 / 232 / 188) — they come from a regex scan in `scripts/qa-audit-inventory.mjs`.

## 7. Coverage holes the reviewer listed (neither tested nor excluded) → status

| # | Hole | v1.1 |
|---|---|---|
| 1 | Server Actions | in scope (source review + guard self-test) |
| 2 | Boundary pages (`error.tsx` ×4, `global-error.tsx`, `not-found.tsx`); only 404 probed | 404 probed (L2-7); the rest listed as excluded (§8) |
| 3 | Engines and devices | stated in §8 |
| 4 | Session lifecycle | stated in §8; garbage-cookie cases added |
| 5 | `/pricing/success` states | stated in §8 |
| 6 | E-mail link targets | forged/invalid-token cells only; positives excluded |
| 7 | Consent pre-calls (`/api/consent/log`, `/api/track/session`) | stated in §8 |

## 8. New findings produced while verifying the review

Kept in `TEST_PLAN.md` §9 with evidence pointers; **none is fixed by QA**, they go to Romy.
* **F-010** (S1 candidate, security): the public Server Action `createAccountFromVerifiedEmail` uses the service role to create a pre-confirmed account with no server-side proof that the caller owns the e-mail address. Source-confirmed; not exercised.
* **F-011** (low–medium): authenticated `POST /api/email/results` trusts body e-mail/content (mail-relay abuse, rate-limited 3/60 min).
* **F-008** (S3): anonymous `POST /api/franchise/brand-view` inserts via the service role with no auth or rate limit (probe with `{}` only).
* **F-009**: state-changing GET routes (CSRF/prefetch exposure; both download routes, `documents/[documentId]`, `case-profile/build`, `franchise/matches`, `renewal/intake`, `market-analysis`, and `simulator/interview-prep`, which spends LLM money on GET).
* **Data note:** `application_documents` has 0 rows in the shared database, so document-extraction/download flows cannot be tested with real data; L3-2/L3-4 were rewritten accordingly.

## 9. Sequencing accepted from the reviewer

Run L0–L2 first, expecting no false FAILs after the oracle fixes; close MUST-FIX 1–6 (done in v1.1 plus tooling) before L3–L7; hold the L3 download cell, L5 and L7 until MUST-FIX 2, 3 and 6 are closed. The tooling work that closes them is listed in `TEST_PLAN.md` §11 step 1 and is the next thing executed.
