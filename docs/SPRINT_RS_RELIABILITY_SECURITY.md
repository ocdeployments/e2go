# Sprint RS — Reliability & Security

**Opened:** September 10, 2026 (Session 145, sweep) — sprint written Session 147
**Branch:** `dev` — never commit directly to `main`
**Status doc:** this file. Update the Status column as each task lands.
**Gap register (what is broken and why):** `docs/RELIABILITY_SECURITY_GAPS.md`

---

## Why this sprint exists

Sprint DR makes sure a paying client's documents get built. This sprint makes
sure the payment that triggers it is never lost, that a database blip never
turns a paying client away, and that the parts of the app outside the
generation pipeline don't quietly erode trust.

The worst finding: the Stripe webhook marks an event as **processed before it
does any work**, then swallows every error after that point. When the unlock
fails downstream, Stripe redelivers the event exactly as designed — and our own
dedup answers `duplicate: true` and drops it. **The one retry mechanism the
whole payment model depends on is disabled by our own code, at the moment it's
needed most.**

**The invariant this sprint installs, and every task serves it:**

> **A Stripe event is not "done" until the work it promised is done. A database
> read failing never looks like "the user doesn't have access" — it looks like
> what it is, and the user is never punished for our infrastructure's bad day.**

Same bar as Sprint DR: no task is Done on reasoning. Each one below carries an
exit criterion that is a demonstration, plus a named automated test.

---

## Gates — every task

1. `npx tsc --noEmit` clean
2. `npx jest` clean (19 suites / 273 tests at sprint open)
3. `npm run build` clean — stop the dev server first
4. **One file per commit**, imperative present tense
5. Confirm the branch is `dev` **before** committing, not after
6. The named test in the task's **Test** row exists and passes
7. The **Exit** row has been demonstrated, not argued

Live-data rule, unchanged: the **live Supabase schema is the only source of
truth**. Verify with
`set -a && . ./.env.local; set +a && python3 scripts/audit-schema-drift.py --refresh`.
`supabase-js` does not throw — always read `{ data, error }`. (RS-5 exists
specifically because this rule has been violated 264 times.)

**Sequencing note, carried from the gap register:** RS-1…RS-4 are recommended
**ahead of DR-3**, not behind Sprint DR's Phase 8. They sit on the money path,
not the delivery path, and they don't touch any file DR-1/DR-2 are holding —
confirm that's still true before starting, since DR-1 is mid-flight as of this
writing.

---

## Task table

Legend — **Status:** `TODO` / `WIP` / `DONE` / `BLOCKED (needs Romy)`
**Kind:** `code` · `infra` = platform/cron/config · `migration` = needs SQL ·
`decision` = Romy must choose

### Phase 1 — Money and access · **before the first ten clients, ahead of DR-3**

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-1** | Turn the webhook dedup row into a claim, not a receipt | G-13 | code + migration | DONE 2026-09-10 |
| **RS-2** | Wrap the event switch in an error boundary | G-14 | code | DONE |
| **RS-3** | Bind the middleware's Supabase errors; fail open with an alert | G-15 | code | DONE |
| **RS-4** | Paid-but-locked-out reconciliation cron | G-13, G-14, G-15 | infra | DONE |

### Phase 2 — Structural blindness

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-5** | ESLint gate on unbound Supabase errors | G-16 | code | DONE 2026-09-10 |
| **RS-6** | Atomic increment for the simulator pack grant | G-21 | migration | DONE |
| **RS-7** | ~~Fix the payment-lifecycle stamp's scoping~~ — resolved, not a bug | G-22 | — | DONE 2026-09-10 |

### Phase 3 — Trust: security surface

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-8** | Close the open redirect — one helper, four sinks | G-17 | code | DONE |
| **RS-9** | Branded error / not-found pages; fix `global-error.tsx` | G-18 | code | DONE 2026-09-10 |
| **RS-13** | Stop exposing Stripe test-mode status publicly | G-25 | code | DONE 2026-09-10 |

### Phase 4 — Trust: product and legal

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-10** | Reconcile the two retention notices; add the three-email purge sequence | G-19 | code + migration | DONE 2026-09-10 |
| **RS-11** | Accessibility floor — axe CI gate + keyboard reachability | G-20 | code | DONE (2026-09-10) |

### Phase 5 — Standing hardening

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-12** | Hard per-instance cap on the rate-limit fallback, plus an alert | G-23 | code | TODO |

**G-24** (business plan has no second provider) carries no task here by design —
the exclusion is intentional and correct. It's noted on Sprint DR's DR-6
(partial-package handling) as the case that motivates it, and it's a
before-launch-day check against provider status, not a sprint task.

---

## Phase 1 — Money and access

### RS-1 · RESOLVED — webhook dedup row is now a claim, migration live
**Gap G-13 · code + migration · DONE · 2026-09-10**

The insert-first-catch-duplicates design was the right idempotency pattern —
the bug was *when* the row counted as done. It was written before any handler
ran, so `constructEvent` succeeding was treated as the event being fully
handled, and a redelivery after a partial failure returned `duplicate: true`
forever with the client still locked out.

**Delivered:** `processed_webhook_events` now carries a `status`
(`processing` / `completed` / `failed`, migration
`20260910160000_webhook_dedup_status.sql`; historical rows default to
`completed` since they predate this column and were written under the old
succeed-or-nothing semantics). The route inserts as `processing` before the
switch runs. Every `captureApiError` call inside the switch (all 16 sites,
across all four event types — not just the checkout-completed unlock path)
now goes through a local `captureAndFail` wrapper that also flips a
`handlerFailed` flag, and the whole switch is wrapped in a `try/catch` that
sets the same flag on a thrown exception (e.g. the unguarded `redis.del`
calls). After the switch, the row is updated to `completed` only if
`handlerFailed` is still `false` — otherwise `failed`. On a `23505` conflict,
the existing row's status is looked up first: `completed` short-circuits as a
genuine duplicate exactly as before; `processing` or `failed` means the prior
attempt never finished, so the handler is reclaimed and re-run rather than
short-circuited. Reprocessing is safe because every downstream write in the
switch is an idempotent `UPDATE ... WHERE id = ...`, not an `INSERT`.

This directly enables RS-4 — the reconciliation cron needs a way to tell
"still being handled" from "genuinely done" from "we lost this one."

RS-1 does not change the route's response code — every path still returns
`200` (`{ received: true }`), including a `failed` claim. That's RS-2's job
(wrap-and-return-500), which is otherwise now a small change since the
try/catch and `handlerFailed` tracking RS-2 needs already exist here.

**Migration confirmed live:** `20260910160000_webhook_dedup_status.sql` has
been applied — verified directly via PostgREST
(`GET /rest/v1/processed_webhook_events?select=status&limit=1` returns
`[{"status":"completed"}]`, per the live-schema-is-truth rule) and via a
clean `scripts/audit-schema-drift.py --refresh` run. Safe to deploy.

> **Exit** — break the `applications` update, complete a real checkout, then
> replay the event from the Stripe dashboard. Before the fix: `duplicate:
> true`, client stays locked out forever. After the fix: the replay re-runs
> the handler and unlocks them (verified in the named test below, not against
> live Stripe).
>
> **Test** — `src/app/api/stripe/__tests__/webhook-dedup-claim.test.ts` (6
> tests, `stripe` and `@supabase/supabase-js` mocked): a clean run marks the
> claim `completed`; a duplicate with an existing `completed` row
> short-circuits without re-running the handler; a redelivery of a row stuck
> in `processing` or `failed` reclaims and re-runs it to `completed`; a
> captured handler error and a thrown exception both mark the claim `failed`
> instead of `completed`.

---

### RS-2 · RESOLVED — the event switch now has an error boundary and answers 500 on failure
**Gap G-14 · code · DONE · 2026-09-10**

The only `try/catch` in the 417-line webhook route wrapped `constructEvent`
only. RS-1 already had to wrap the whole `switch (event.type)` block in
try/catch and track a `handlerFailed` flag so it could finalize the RS-1
dedup claim to `failed` — so RS-2's own remaining scope was just the last
step: the route still answered `200` unconditionally, even on a `failed`
claim, which meant Stripe never actually retried. It now returns `500` when
`handlerFailed` is true, so Stripe's own redelivery — not application
code — is what recovers a half-applied payment.

> **Exit** — point `UPSTASH_REDIS_REST_URL` at a dead host and complete a
> checkout. Confirmed via `webhook-error-boundary.test.ts`: the payment/
> application writes before the `redis.del` throw still complete (no
> half-applied payment), the dedup claim is left `failed`, the route answers
> `500`, and a simulated redelivery reclaims the claim and finishes once
> Redis recovers.
>
> **Test** — `src/app/api/stripe/__tests__/webhook-error-boundary.test.ts`
> (3 tests, exercising Gap G-14's own evidence — the unguarded
> `redis.del(...)` call in `checkout.session.completed` — directly): a dead
> Redis host throwing there is caught, prior writes already ran, the claim
> is left `failed`, and the route responds `500`; a redelivery after that
> reclaims the claim and succeeds once Redis recovers; the throw no longer
> escapes the route unhandled. Also updated the two `webhook-dedup-claim.test.ts`
> failure-path assertions from `200` (a placeholder RS-1 had left, noting
> "RS-2 changes this to 500") to the now-correct `500`.

---

### RS-3 · RESOLVED — the three Supabase call sites now bind `error` and fail open with a Sentry alert
**Gap G-15 · code · DONE · 2026-09-10**

Three call sites in `src/middleware.ts` — the applications/profile pair
(payment gate cache-miss path), the FDD payment lookup, and the
terms-acceptance lookup — destructured `data` only. A Supabase
timeout/5xx/schema-drift returns `data: null`, indistinguishable from "no
paid applications" or "terms not accepted," so the middleware derived access
from the null and failed CLOSED — locking a paying customer out on a
transient DB blip rather than letting them through.

All three now bind `error`. The payment-gate pair and the FDD lookup share a
single `lookupFailed` flag: on either erroring, `access` is forced to
`{ full: true, sim: true, fdd: true }` for that request, `captureApiError` is
called (tagged `route: 'middleware'`, a `stage` naming the site, the user id,
and the pathname), and the 30-minute access-cache write is skipped entirely
— matching the fail-open policy already documented in
`src/lib/partnership-hold.ts`. The terms-acceptance site needed one more
distinction: it queries with `.single()`, which returns a `PGRST116` ("no
rows") error for the ordinary case of a user who genuinely hasn't accepted
yet — that specific code is left alone (still redirects to
`/terms-required`, no alert), while any other error code fails open and
skips the terms-cache write the same way.

> **Exit** — force the applications query to error for a paid user; they reach
> their case, not `/results`. A Sentry event fires. The next request (once the
> DB recovers) reads correctly rather than serving a cached failure — because
> none was ever cached.
>
> **Test** — `src/__tests__/middleware-fail-open.test.ts` (4 tests): a
> Supabase error on the applications/profile pair, the FDD lookup, or the
> terms-acceptance lookup each grants access for that request, calls
> `captureApiError` with the right `stage`, and writes nothing to the
> relevant cache; a genuine `PGRST116` on the terms lookup still redirects to
> `/terms-required` with no alert, proving the fix didn't blur "not accepted
> yet" into "the database is broken."

---

### RS-4 · RESOLVED — a fifth daily cron cross-checks Stripe's ledger against ours
**Gaps G-13, G-14, G-15 (backstop) · infra · DONE · 2026-09-10**

None of the four existing crons (`rebuild-profiles`, `health-watchdog`,
`quiz-nurture`, `data-retention`) ever asked Stripe's side of the ledger — a
half-applied webhook (the dedup claim race, the unguarded throw, or a
middleware read that failed closed) could in principle leave Stripe showing a
completed payment while our own tables didn't reflect it, with nothing to
notice.

`src/lib/payment-reconciliation.ts` exports `reconcilePayments(stripe,
supabase, sinceUnixSeconds)`, a pure function over injected clients. It pages
through every Stripe checkout session created since the cutoff
(`has_more`/`starting_after`, not `autoPagingEach`, so a fake `.list()` can
return plain pages in tests), keeps only sessions with `status: 'complete'`
and `payment_status: 'paid'`, and skips anything created within the last 15
minutes — Stripe's own webhook delivery latency, not a bug, and flagging it
would just be noise. For each remaining session it looks up the matching
`payments` row by `stripe_session_id`: no row, or a status that's neither
`completed` nor `refunded`, is a `payment-not-recorded` mismatch. A
`refunded` payment is left alone — that's the legitimate refund-revoke path,
not a bug. For the tiers that actually flip `applications.payment_status`
(`complete`, `complete_partnership`, `foundation`, `visa_ready` — the exact
list the webhook's own unlock/refund-revoke conditions use, deliberately
hardcoded here rather than reusing `entitlements.ts`'s per-feature tiers or
`partnership-hold.ts`'s `PACKAGE_TIER_IDS`, since both answer a different
question), it also checks the application row itself; still not `'paid'` is
an `application-not-unlocked` mismatch. Every mismatch fires a Sentry alert
via `captureApiError`, tagged with the reason, session id, application id,
user id, and tier id — a lookup error is captured and skipped, not counted as
a mismatch, since it says nothing about whether Stripe and our tables agree.

`src/app/api/cron/payment-reconciliation/route.ts` is the thin wrapper:
`CRON_SECRET` Bearer auth, a `cron_log` row opened `running` and closed
`success`/`failed` with `rows_processed` and a `mismatches` count, then a call
into `reconcilePayments()` — the same shape as `data-retention`'s and
`health-watchdog`'s routes. It runs daily via `vercel.json`'s 5th cron entry
(`0 5 * * *`, the Hobby plan's once-daily cap already used by the other four
crons at their own distinct hours) with a 26-hour lookback so a delayed run
never leaves a gap.

This is the backstop for RS-1/RS-2/RS-3: even after those land, this is the net
under a failure mode none of us anticipated.

> **Exit** — manually flip an `applications.payment_status` back to `unpaid`
> after a real completed Stripe payment; the cron's next run raises an alert
> naming that application within one run cycle.
>
> **Test** — `src/app/api/cron/__tests__/payment-reconciliation.test.ts` (7
> tests): a completed Stripe payment with no `payments` row, and a recorded
> payment whose application was never unlocked, each raise a mismatch/alert; a
> consistent pair, a legitimately refunded payment, and a payment for a tier
> that never gates `applications.payment_status` are all left alone; a
> session inside the 15-minute grace window and a session that never
> completed are both skipped before the comparison even runs.

---

## Phase 2 — Structural blindness

### RS-5 · RESOLVED — ESLint gate on unbound Supabase errors
**Gap G-16 · code · DONE · 2026-09-10**

Custom rule `local-rules/require-supabase-error-check` (`eslint-local-rules/`)
flags `const { data } = await supabase...` (also `.rpc`/`.auth`/`.storage`/
`.functions`) with no `error` binding. Wired into `.eslintrc.json`:
error-level in `src/middleware.ts` + `src/app/api/**` + `src/lib/**`
(the strict zone), warn-level everywhere else, with a ~74-file grandfather
list downgrading the strict zone's pre-existing 264 violations back to warn
so they don't block the build until attrition-fixed file by file.

**Bug found and fixed this session:** six grandfather-list entries are
dynamic-route paths with `[id]`/`[applicationId]`/`[jobId]` segments —
`minimatch` (which `overrides[].files` glob-matches against) parses `[...]`
as a character class, not a literal bracket, so those six entries silently
failed to match and fell through to the strict-zone `"error"` override
instead of being grandfathered to `"warn"`. Fixed by escaping the brackets
(`\\[id\\]`) in all six entries. Confirmed via direct ESLint Node-API
severity checks before and after (severity 2 → 1) for all six files.

> **Exit** — demonstrated: a route with `const { data } = await supabase...`
> and no `error` returns ESLint exit code 1 (`next build` runs ESLint by
> default; `next.config.mjs` has no `ignoreDuringBuilds`).
>
> **Test** — `eslint-local-rules/__tests__/require-supabase-error-check.test.ts`,
> 5 cases via the ESLint Node API against the real `.eslintrc.json`: unbound
> destructure fails in `src/app/api/**` and `src/lib/**`, warns (doesn't fail)
> in a plain page component, passes clean when `error` is bound in both
> zones, and a regression case pinned to the bracket bug (a real grandfathered
> `[id]` route warns, not errors).

Full `npx jest` (321/321) and `npm run build` (200 pages) clean with this
change in place. Not yet fixing the 264 pre-existing warn-level violations —
per the task scope, that's attrition work for whichever session next touches
each file.

264 call sites destructure `const { data } = await supabase...` with no
`error` binding — the exact pattern that produced Sprint S's 44 broken
queries. Add a custom ESLint rule (or configure `no-unused-vars`-adjacent
tooling) that flags any `await supabase...` (or any Supabase client call)
whose destructured result omits `error`. Error-level (build-failing) in
`src/middleware.ts`, `src/app/api/**`, and `src/lib/**`; warn-level elsewhere.

Do not attempt to fix all 264 in this task — that's attrition work for
whichever session touches each file next. This task is the gate, plus fixing
the handful in files this sprint already has open (the webhook and
middleware, via RS-1–RS-3).

> **Exit** — a new API route written with `const { data } = await supabase...`
> and no `error` fails `npm run build`.
>
> **Test** — an ESLint rule test fixture: a file with an unbound destructure in
> `src/app/api/` fails lint; the same pattern in a plain page component warns
> but doesn't fail; a correctly bound `{ data, error }` passes clean.

---

### RS-6 · RESOLVED — atomic increment shipped, migration confirmed live
**Gap G-21 · migration · DONE · 2026-09-10**

`simulator_sessions_purchased` was granted (and refunded) via select-then-
update in three separate places — two interleaved grants (a double-click, a
redelivered event slipping past dedup) net one grant instead of two, and the
refund/revoke site and a second client-facing grant route both had the
identical shape.

**Delivered:** a Postgres RPC `increment_simulator_sessions(p_application_id,
p_amount)` (migration `20260910170000_increment_simulator_sessions.sql`) does
a single atomic `UPDATE ... SET simulator_sessions_purchased = GREATEST(0,
COALESCE(simulator_sessions_purchased, 2) + p_amount)`. All three
select-then-update sites now call it instead:
- the webhook's grant path (`p_amount: 3`)
- the webhook's refund/revoke path (`p_amount: -3`) — same race shape,
  brought into scope here since it's the identical bug in the same file
- `src/app/api/stripe/grant-simulator-sessions/route.ts` (`p_amount: 3`) — a
  client-triggered fallback grant that fires on the success-redirect page and
  can race the webhook's own grant for the same checkout session; its
  pre-existing `user_id`-scoped ownership check on `applicationId` was kept
  as a separate read (the RPC itself is not user-scoped — the increment
  target is trusted `applicationId` from Stripe session metadata, verified as
  belonging to the caller by that read before the RPC is called)

**Migration confirmed live:** `20260910170000_increment_simulator_sessions.sql`
has been applied — verified directly via PostgREST
(`POST /rest/v1/rpc/increment_simulator_sessions` against a non-existent
application id returns `null`, not a `PGRST202` "function not found" error).
Safe to deploy.

> **Exit** — fire two `simulator_3pack` grant events concurrently against the
> same application; the count rises by 6, not 3.
>
> **Test** — `src/app/api/stripe/__tests__/simulator-pack-atomic.test.ts`:
> drives the real POST handler and asserts the RPC is invoked with a fixed
> delta (never a `.from('applications').select(...)` read) for both the grant
> and refund paths, and that two concurrent grant events each independently
> fire their own `+3` RPC call. Passing. (`grant-simulator-sessions/route.ts`
> has no dedicated test file — none existed before this change either.)

---

### RS-7 · RESOLVED — the payment-lifecycle stamp's scoping was correct all along
**Gap G-22 · — · DONE · 2026-09-10**

Re-investigated after Romy pushed back on the premise: a user who buys two
packages is still one person, and should have one user_id — which is exactly
what `application_lifecycle` tracks. Checked the schema
(`docs/schema_complete.sql:84–104`) and all 24 call sites: it's a flat,
one-row-per-client funnel table (`quiz_completed_at`, `payment_completed_at`,
`module1_started_at` … `module5_completed_at`), confirmed independently in two
places as "one row per client, not a stream of events"
(`lifecycle-timeline.ts:4`, `admin/revenue/page.tsx:78`). It was never an
application-scoped table missing a foreign key — `user_id` is the correct and
only key it should have.

No schema change, no code behavior change. The only real defect was
documentation: three in-code comments (webhook route, and the two
`followup/` routes) described the `user_id`-only scoping as a broken
workaround for a missing `application_id` column. Reworded all three to state
the design plainly instead of reading as an open bug to the next person who
touches the file.

> **Exit** — done: `docs/RELIABILITY_SECURITY_GAPS.md` G-22 moved to
> "Verified sound," and the three misleading comments are corrected.
>
> **Test** — none needed; no behavior changed.

---

## Phase 3 — Trust: security surface

### RS-8 · Close the open redirect — one helper, four sinks
**Gap G-17 · code · DONE · 2026-09-10**

`login/page.tsx` assigned `?next=` straight to `window.location.href`;
`auth/callback/route.ts` and `signup/page.tsx` built `` `${origin}${next}` ``,
which still allowed a protocol-relative `//evil.example`; `terms-required/page.tsx`
pushed the raw value through the router.

Added `src/lib/safe-redirect.ts` exporting one function, `safeRedirect(next,
fallback)`: returns `next` unchanged only if it starts with exactly one `/`
(not `//`, not `/\`), otherwise returns the caller's own default. Wired it in
at all four sinks — `login/page.tsx`, `auth/callback/route.ts`,
`signup/page.tsx`, `terms-required/page.tsx` — each now computing `next` via
`safeRedirect(searchParams.get("next"), <route default>)` before the value
ever reaches `window.location.href`, the `${origin}${next}` template, or
`router.push`.

> **Exit** — done: `/login?next=https://evil.example`,
> `/login?next=//evil.example`, and the equivalent on `/signup`,
> `/auth/callback`, `/terms-required` all land the user on an in-app default,
> never on `evil.example`.
>
> **Test** — done: `src/lib/__tests__/safe-redirect.test.ts`, table-driven over
> `https://evil.example`, `http://evil.example`, `//evil.example`,
> `/\evil.example`, `javascript:alert(1)`, a bare `evil.example`, `null`,
> `undefined`, `''`, and legitimate `/dashboard` / `/apply/module2` paths — 11/11
> passing. Full suite (28 suites, 336 tests) green after all four sink changes.

---

### RS-9 · RESOLVED — branded error/not-found pages shipped, `global-error.tsx` fixed
**Gap G-18 · code · DONE · 2026-09-10**

Added `src/components/ui/BrandedMessagePage.tsx`, a shared Obsidian Gold
presentational shell (icon, heading, description, a primary action link, an
optional secondary link, and a children slot for a reset button) so the five
new boundary files don't each hand-roll the same markup.

Built on it: root `src/app/not-found.tsx` (dashboard + `mailto:support@e2go.app`
links) and root `src/app/error.tsx` (adds a `reset()` "Try again" button,
reports to Sentry via `useEffect`). Added matching segment-level `error.tsx`
under `/apply`, `/documents`, and `/generate` — the three places a client has
in-progress work that a raw stack trace would otherwise erase without
explanation — each with copy naming what's preserved (saved progress /
generated documents / application data) so the message isn't generic across
all three.

Fixed `global-error.tsx` (can't use the shared component — it replaces the
root layout entirely, so it stays self-contained): swapped `fontFamily:
'sans-serif'` for the locked `'DM Sans'` / `'Cormorant Garamond'` stack and
added a working `mailto:support@e2go.app` link next to the existing "Try
again" button.

Added `src/app/documents/debug-error/page.tsx` as a Playwright-only trigger
for the `/documents` error boundary: it throws only when the
`x-playwright-test` header is present (already sent by every request in
`playwright.config.ts`) and otherwise calls `notFound()`, so it's a plain 404
for real users.

> **Exit** — done: visiting `/apply/does-not-exist` and forcing a throw inside
> `/documents` both render a branded page with a working next step, not Next's
> default. (Both routes sit behind middleware's payment/auth gate even when
> the sub-path doesn't exist, so both are exercised signed-in.)
>
> **Test** — done: `tests/regression/not-found-and-error-pages.spec.ts`, 2/2
> passing — logs in, then asserts the root 404 (`/apply/does-not-exist`) and
> the `/documents` segment error page each render the Cormorant Garamond
> heading font, the `#0a0a0a` background, and a working "Return to dashboard"
> link; the error-page case also asserts the "Try again" reset button.

---

### RS-13 · RESOLVED — Stripe test-mode status no longer exposed publicly
**Gap G-25 · code · DONE · 2026-09-10**

`GET /api/stripe/checkout` was unauthenticated and returned `{ configured,
testMode }`, letting anyone probe whether a deployment was running live or
test Stripe keys. Dropped `testMode` from the response entirely; the `HEAD`
config probe was untouched. No internal caller needed the removed field —
the pricing page's own test-mode banner (`PricingClient.tsx`) already derives
its state from `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` client-side, not from
this endpoint, so nothing else had to be gated behind admin auth.

> **Exit** — done: `GET /api/stripe/checkout` returns only `{ configured:
> boolean }`, for both live and test key prefixes and when unconfigured.
>
> **Test** — done: `src/app/api/stripe/__tests__/checkout-testmode.test.ts`
> (3 tests, new file — no prior test existed for this route): asserts the
> JSON body has no `testMode` key for a `sk_test_` key, a `sk_live_` key, and
> no key configured at all.

---

## Phase 4 — Trust: product and legal

### RS-10 · RESOLVED — retention notices reconciled; three-email purge sequence shipped
**Gap G-19 · code + migration · DONE · 2026-09-10**

`apply/module1/page.tsx:388` promised 90 days after visa outcome;
`privacy/PrivacyClient.tsx:43,67` and the retention cron itself said 30 days
after package generation or 90 days after upload, whichever is first. The
Module 1 notice now states the real schedule and distinguishes *application
data* (not purged on this timeline) from *uploaded files* (which are).

**Delivered — the single warning email replaced with three:**
1. **On generation** — fires from `generation-engine.ts` the moment the
   package is built, stating the purge date (generation + 30 days), alongside
   the existing DR-4 generation-complete email, not in place of it.
2. **T-minus-3 days** — `sendRetentionReminders` in `src/lib/retention-cron.ts`
   sends a reminder with a confirm-to-keep link
   (`/retention/confirm-hold` → `POST /api/retention/confirm-hold`).
   Confirming stamps `applications.retention_hold_at`, and
   `purgeExpiredFiles` skips any application in that set before removing a
   file, regardless of age. Guarded by `retention_reminder_sent_at` so a
   missed cron run can't double-send.
3. **On completion** — `sendRetentionCompletions` fires after a run's actual
   purges, per application, using the per-app counts `purgeExpiredFiles`
   collects; guarded by `retention_purge_notice_sent_at`.

Email address and contact preferences survive the purge regardless of
outcome — the confirm-to-keep and unsubscribe links both post through
existing signed-link infrastructure (`retention-hold-token.ts`,
`src/lib/emails/unsubscribe.ts`), no new opt-out mechanism.

While making the cron's purge/reminder/completion logic unit-testable, an
export directly from `cron/data-retention/route.ts` tripped Next's
typed-routes constraint (a route file may only export the HTTP-method
whitelist) — the three functions were moved into the new
`src/lib/retention-cron.ts`, matching the existing plain-lib-module pattern
(`retention-sequence.ts`, `partnership-hold.ts`), with `route.ts` importing
them back in.

> **Exit** — done: the Module 1 notice and the privacy policy state the same
> 30/90-day schedule. A file 3 days from its purge date produces a
> confirm-to-keep reminder; confirming it sets `retention_hold_at`, and the
> cron does not purge that application's files on schedule; a purged file
> produces a completion email; the client's contact record is unchanged by
> the purge either way.
>
> **Test** — `src/lib/emails/__tests__/retention-sequence.test.ts` (19
> tests): each of the three templates renders with a realistic payload,
> correct dates, a working confirm-to-keep link verified via a real HMAC
> round-trip, no unresolved placeholders, suppression-list handling, and
> timestamp-column stamping on success.
> `src/app/api/cron/__tests__/data-retention-hold.test.ts` (4 tests): a
> document belonging to an application with an active retention hold is
> excluded from `purgeExpiredFiles` (not removed, not stamped, not counted)
> while an equally old document on an unheld application is still purged in
> the same run; a text assertion confirms the Module 1 and privacy-policy
> copy state matching day counts.

---

### RS-11 · Accessibility floor — axe CI gate + keyboard reachability
**Gap G-20 · code · DONE (2026-09-10) · 1.5 eng-days**

Added `@axe-core/playwright` to the existing Playwright suite and a new spec,
`tests/regression/accessibility-axe.spec.ts`, that scans `/results` and
`/documents` (the paid-path pages named in the original exit criterion) for
critical/serious axe violations, plus a keyboard check that tabbing to an
interactive element on `/documents` produces a visible focus ring. Converted
16 clickable `<div>`/`<span>` elements across the sweep to real `<button>`s:
`quiz/review`, `early-access`, `simulator/quick-start`, `simulator/interview-day`,
`DocumentImportHub`, `UploadClient`, `fdd/upload`, `DenialRiskRadar`, the
`apply/module3` tab B/C header logos, and the quiz page's "Save & exit" +
section-tab strip. Added one global `:focus-visible` rule in `globals.css`
(`outline: 2px solid var(--input-focus)`) — previously zero focus indicators
existed anywhere in the app.

A few elements from the original 13-item sweep were deliberately **not**
converted to buttons:
- The interview-day "what not to bring" list rows are static informational
  content with no `onClick` — wrapping them in a button would give screen
  reader users a false affordance.
- Modal/panel backdrop `<div>`s (click-outside-to-close) and `stopPropagation`
  wrapper `<div>`s stay divs — they aren't independently focusable targets a
  keyboard user would ever tab to; the real dismiss action is already a
  button (or Escape).

The axe scan itself caught two real WCAG AA violations, both on ephemeral
loading-state text rendered before data fetches complete: `/results`'s
"Loading your result..." (gold text at 60% opacity, 3.71:1 contrast) and
`/documents`'s "Loading documents…" (white text at 30% opacity, 2.61:1
contrast) — both below the 4.5:1 floor. Fixed by raising to 75%/50% opacity
respectively (~5.2:1 / ~5.3:1). Not a comprehensive contrast pass — plenty of
other `white/30`-class muted text exists elsewhere in the app (e.g. badges and
labels on `/documents` after it finishes loading) that this spec didn't
happen to catch, since axe only saw whatever was on screen when the scan ran.

**CI/local-hook architecture note**: this spec lives in `tests/regression/`
like the rest of the Playwright suite, not a new GitHub Actions job — GitHub
Actions doesn't run Playwright in this repo at all; the entire suite (this
spec included) is gated by the local Husky `pre-push` hook
(`npx playwright test`, no retries locally). That means the accessibility
floor is enforced before every push, same as every other Playwright spec —
consistent with, not a departure from, the existing setup.

**Known pre-existing flake, unrelated to this work**: running the full
Playwright suite locally with concurrent workers intermittently times out
one unrelated spec at its shared `login()` helper (`#login-email` not
interactable within 30s) — reproduced three times across three different
specs (`accessibility-axe`, `not-found-and-error-pages`,
`parse-document-auto-type`), never twice on the same spec, and it persisted
even at `--workers=2`. Server logs show `[middleware] Redis rate-limit
unavailable ... falling back to in-memory: fetch failed` on nearly every
request, suggesting the local Upstash Redis endpoint is unreachable from this
machine and every rate-limited request eats a fetch-timeout before falling
back — adding latency that occasionally pushes a `/login` navigation past the
30s test timeout under load. This is pre-existing local test-environment
flakiness (not caused by any RS-11 change — none of the 16 converted files
touch middleware, auth, or rate-limiting), and each individual spec passes
reliably in isolation. Flagged here rather than fixed, since diagnosing
Redis reachability is out of RS-11's scope.

> **Exit** — the axe check passes with zero criticals/serious violations on
> `/results` and `/documents`; tabbing to an interactive element on
> `/documents` produces a visible focus ring. Verified via
> `npx playwright test tests/regression/accessibility-axe.spec.ts` (3/3
> passing) after the contrast fixes above.
>
> **Test** — the axe Playwright spec itself is the test — it's added to the
> suite and gated by the pre-push hook, not a one-time manual check.

---

## Phase 5 — Standing hardening

### RS-12 · Hard per-instance cap on the rate-limit fallback, plus an alert
**Gap G-23 · code · TODO · 0.5 eng-day**

`src/lib/rate-limit.ts`'s documented in-memory fallback is correct for
availability but multiplies the effective ceiling by live instance count
during an Upstash outage — and the routes it protects are LLM-backed, i.e.
expensive. Add a hard per-instance ceiling specifically for cost-critical
profiles (generation, extraction, simulator) that applies even in fallback
mode, and fire a Sentry alert the moment the fallback engages so an outage is
visible rather than only inferred from a spend anomaly later.

> **Exit** — with Upstash unreachable, the cost-critical routes still refuse
> requests past the hard per-instance cap, and a Sentry event fires on the
> first fallback activation.
>
> **Test** — `src/lib/__tests__/rate-limit-fallback-cap.test.ts`: simulates an
> unreachable Upstash client, asserts the in-memory path enforces the hard cap
> on a cost-critical profile, and asserts the alert fires exactly once per
> outage window (not once per request).

---

## Effort summary

| Phase | Tasks | Eng-days |
|---|---|---|
| 1 — Money and access | RS-1…RS-4 | ~3 |
| 2 — Structural blindness | RS-5…RS-7 | ~1.5 |
| 3 — Trust: security surface | RS-8, RS-9, RS-13 | ~1.75 |
| 4 — Trust: product/legal | RS-10, RS-11 | ~3 |
| 5 — Standing hardening | RS-12 | 0.5 |
| **Total** | 13 tasks | **~9.75 eng-days** |

## Blocked on Romy

**RS-6's migration is confirmed live** —
`supabase/migrations/20260910170000_increment_simulator_sessions.sql` (adds
`CREATE OR REPLACE FUNCTION increment_simulator_sessions(...)`) was applied
2026-09-10; verified directly via PostgREST (`POST
/rest/v1/rpc/increment_simulator_sessions` against a non-existent
application id → `null`, not a `PGRST202` "function not found" error). Safe
to deploy the RS-6 code commits along with the rest of `dev`.

**RS-1's migration is confirmed live** —
`supabase/migrations/20260910160000_webhook_dedup_status.sql` (adds
`processed_webhook_events.status`) was applied 2026-09-10; verified directly
via PostgREST (`GET /rest/v1/processed_webhook_events?select=status&limit=1`
→ `[{"status":"completed"}]`) and a clean `audit-schema-drift.py --refresh`.
Safe to deploy the RS-1 code commits (`35570ae`, `fd713c6`, `048dc09`) along
with RS-2/RS-3/RS-4, all of which build on it.

RS-10's three-email retention sequence and RS-7 were both resolved
2026-09-10 — see the task section above; nothing further is blocked on
those.

RS-1 through RS-4 are all resolved 2026-09-10 — Phase 1 is complete.
Everything remaining (Phases 2-5) is unblocked and can start in sequence,
independent of Sprint DR — confirmed 2026-09-10 that Session 146's Sprint DR
Phase 1 work (DR-1/DR-2/DR-7) touches `src/types/generation.ts`,
`docs/SPRINT_DR_DELIVERY_RELIABILITY.md`, and a new `generation_resume_log`
migration/lib (also confirmed live 2026-09-10), not the webhook route or
middleware — no file overlap with RS-1/RS-2/RS-3/RS-4 confirmed at commit
time, but re-check DR's current WIP state before starting Phase 2 since that
may have changed.
