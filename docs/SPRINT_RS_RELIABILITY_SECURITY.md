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
| **RS-1** | Turn the webhook dedup row into a claim, not a receipt | G-13 | code | TODO |
| **RS-2** | Wrap the event switch in an error boundary | G-14 | code | TODO |
| **RS-3** | Bind the middleware's Supabase errors; fail open with an alert | G-15 | code | TODO |
| **RS-4** | Paid-but-locked-out reconciliation cron | G-13, G-14, G-15 | infra | TODO |

### Phase 2 — Structural blindness

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-5** | ESLint gate on unbound Supabase errors | G-16 | code | TODO |
| **RS-6** | Atomic increment for the simulator pack grant | G-21 | migration | TODO |
| **RS-7** | Fix the payment-lifecycle stamp's scoping | G-22 | migration | **BLOCKED (needs Romy — schema call)** |

### Phase 3 — Trust: security surface

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-8** | Close the open redirect — one helper, four sinks | G-17 | code | TODO |
| **RS-9** | Branded error / not-found pages; fix `global-error.tsx` | G-18 | code | TODO |
| **RS-13** | Stop exposing Stripe test-mode status publicly | G-25 | code | TODO |

### Phase 4 — Trust: product and legal

| # | Task | Gap | Kind | Status |
|---|---|---|---|---|
| **RS-10** | Reconcile the two retention notices; add a purge-warning email | G-19 | code | TODO |
| **RS-11** | Accessibility floor — axe CI gate + keyboard reachability | G-20 | code | TODO |

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

### RS-1 · Turn the webhook dedup row into a claim, not a receipt
**Gap G-13 · code · TODO · 1 eng-day**

The insert-first-catch-duplicates design is the right idempotency pattern — the
bug is *when* the row counts as done. Today it's written before any handler
runs, so `constructEvent` succeeding is treated as the event being fully
handled.

Change `processed_webhook_events` to carry a status: insert as `processing`
before the switch, flip to `completed` only after the handler returns without
error, and delete the row (or mark it `failed`) if the handler throws or any of
its `captureApiError` calls fire on a step that leaves access ungranted. A
redelivered event that finds a `processing` or `failed` row re-runs the
handler; only a `completed` row short-circuits.

This directly enables RS-4 — the reconciliation cron needs a way to tell "still
being handled" from "genuinely done" from "we lost this one."

> **Exit** — break the `applications` update, complete a real checkout, then
> replay the event from the Stripe dashboard. Today: `duplicate: true`, client
> stays locked out forever. After the fix: the replay re-runs the handler and
> unlocks them.
>
> **Test** — `src/app/api/stripe/__tests__/webhook-dedup-claim.test.ts`: a
> handler that throws leaves no `completed` row and a redelivered event with the
> same id re-invokes the handler; a handler that succeeds leaves a `completed`
> row and a redelivery short-circuits without re-running side effects.

---

### RS-2 · Wrap the event switch in an error boundary
**Gap G-14 · code · TODO · 0.5 eng-day**

The only `try/catch` in the 417-line webhook route wraps `constructEvent`.
Wrap the whole `switch (event.type)` block. On any thrown error (not just a
`captureApiError`-reported one — an actual throw, like the unguarded
`redis.del` calls at lines 228 and 391), mark the dedup row `failed` per RS-1
and return a 500 so Stripe's own retry does the recovery.

> **Exit** — point `UPSTASH_REDIS_REST_URL` at a dead host and complete a
> checkout. The client ends up unlocked (either the throw doesn't reach the
> critical path, or the retry recovers it) — never half-applied.
>
> **Test** — `src/app/api/stripe/__tests__/webhook-error-boundary.test.ts`:
> a thrown error anywhere inside a handler is caught, the dedup row is left in
> a re-triable state (RS-1), and the route responds 500.

---

### RS-3 · Bind the middleware's Supabase errors; fail open with an alert
**Gap G-15 · code · TODO · 0.5 eng-day**

Three call sites in `src/middleware.ts` (the applications/profile pair at
:416–419, the FDD lookup at :437, the terms-acceptance lookup at :498)
destructure `data` only. Bind `error` on all three. On a bound error: grant
access for this request (matching the documented fail-open policy already in
`src/lib/partnership-hold.ts`), send a Sentry alert tagged with the user and
route, and — critically — do not write the failure into the Redis access
cache, so the next request re-checks rather than caching a false negative for
30 minutes.

> **Exit** — force the applications query to error for a paid user; they reach
> their case, not `/results`. A Sentry event fires. The next request (once the
> DB recovers) reads correctly rather than serving the cached failure.
>
> **Test** — `src/__tests__/middleware-fail-open.test.ts`: a Supabase error on
> any of the three queries results in access being granted for that request,
> an alert call being made, and nothing written to the access cache.

---

### RS-4 · Paid-but-locked-out reconciliation cron
**Gaps G-13, G-14, G-15 (backstop) · infra · TODO · 1 eng-day**

None of the four existing crons (`rebuild-profiles`, `health-watchdog`,
`quiz-nurture`, `data-retention`) ever ask Stripe's side of the ledger. Add one
that lists recent Stripe `checkout.session.completed` events (or queries
`payments` where `status = 'completed'`) and cross-checks that the
corresponding `applications.payment_status` is `'paid'`. Anything that
disagrees for more than 15 minutes raises a Sentry alert naming the
application and the Stripe event id — the exact number the incident that
motivated this sprint would have been caught by immediately.

This is the backstop for RS-1/RS-2/RS-3: even after those land, this is the net
under a failure mode none of us anticipated.

> **Exit** — manually flip an `applications.payment_status` back to `unpaid`
> after a real completed Stripe payment; the cron's next run raises an alert
> naming that application within one run cycle.
>
> **Test** — `src/app/api/cron/__tests__/payment-reconciliation.test.ts`: a
> completed Stripe payment with a mismatched local status triggers an alert; a
> consistent pair does not; a payment younger than the grace window is not
> flagged (avoids a false positive on the webhook's own normal latency).

---

## Phase 2 — Structural blindness

### RS-5 · ESLint gate on unbound Supabase errors
**Gap G-16 · code · TODO · 1 eng-day**

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

### RS-6 · Atomic increment for the simulator pack grant
**Gap G-21 · migration · TODO · 0.5 eng-day**

`simulator_sessions_purchased` is granted via select-then-update in the
webhook — two interleaved grants (a double-click, a redelivered event slipping
past dedup) net one grant instead of two. Replace with a Postgres RPC
(`increment_simulator_sessions(application_id, amount)`) that does the
increment atomically in SQL, and call that from the webhook instead of the
read-modify-write.

> **Exit** — fire two `simulator_3pack` grant events concurrently against the
> same application; the count rises by 6, not 3.
>
> **Test** — `src/app/api/stripe/__tests__/simulator-pack-atomic.test.ts`:
> mocks two concurrent grant calls and asserts the RPC is invoked with the
> correct increment rather than a read-then-write round trip.

---

### RS-7 · Fix the payment-lifecycle stamp's scoping
**Gap G-22 · migration · TODO · 0.5 eng-day (+ Romy: schema decision)**

`application_lifecycle.payment_completed_at` is updated keyed on `user_id`
alone, because the column it used to filter on (`application_id`) doesn't
exist on that table — so it stamps every application the user owns, not just
the one that was paid for. **Blocked on Romy**: does `application_lifecycle`
get an `application_id` column added (verify against the live schema first,
per the standing rule), or does this table intentionally track
user-level rather than application-level lifecycle, in which case the fix is
to rename the field and stop implying per-application precision? Either answer
is fine; guessing which one is not.

> **Exit** — a user with two applications pays for one; only that
> application's lifecycle stamp updates.
>
> **Test** — `src/app/api/stripe/__tests__/lifecycle-stamp-scope.test.ts`:
> asserts the update is scoped to the specific application (or, if Romy chooses
> the rename path, that the field name and any consumers agree it's
> user-level).

---

## Phase 3 — Trust: security surface

### RS-8 · Close the open redirect — one helper, four sinks
**Gap G-17 · code · TODO · 0.5 eng-day**

`login/page.tsx` (:114, :159) assigns `?next=` straight to
`window.location.href`; `auth/callback/route.ts` (:50) and `signup/page.tsx`
(:106) build `` `${origin}${next}` ``, which still allows a protocol-relative
`//evil.example`; `terms-required/page.tsx` (:58) pushes the raw value through
the router.

Add `src/lib/safe-redirect.ts` exporting one function: accept a string,
return it unchanged only if it starts with exactly one `/` (not `//`, not
`/\`), otherwise return the route's own default. Use it at all four sinks.

> **Exit** — `/login?next=https://evil.example`, `/login?next=//evil.example`,
> and the equivalent on `/signup`, `/auth/callback`, `/terms-required` all land
> the user on an in-app default, never on `evil.example`.
>
> **Test** — `src/lib/__tests__/safe-redirect.test.ts`: table-driven over
> `https://evil.example`, `//evil.example`, `/\evil.example`, `javascript:...`,
> a legitimate `/dashboard`, and a legitimate `/apply/module2` — only the
> legitimate relative paths pass through unchanged.

---

### RS-9 · Branded error / not-found pages; fix `global-error.tsx`
**Gap G-18 · code · TODO · 1 eng-day**

Add root `src/app/not-found.tsx` and `src/app/error.tsx` in Obsidian Gold, each
naming a concrete next action (return to dashboard, contact support with a
real `mailto:`/link). Add segment-level `error.tsx` under `/apply`,
`/documents`, and `/generate` — the three places a client has in-progress work
that a raw stack trace would otherwise erase without explanation. Fix
`global-error.tsx`'s `fontFamily: 'sans-serif'` to the locked type stack and
give "contact support" a working link.

> **Exit** — visiting `/apply/does-not-exist` and forcing a throw inside
> `/documents` both render a branded page with a working next step, not Next's
> default.
>
> **Test** — Playwright spec `not-found-and-error-pages.spec.ts`: asserts the
> root 404 and a forced-error route both render the app's fonts/palette and
> contain a working link, not Next's default boundary.

---

### RS-13 · Stop exposing Stripe test-mode status publicly
**Gap G-25 · code · TODO · 0.25 eng-day**

`GET /api/stripe/checkout` is unauthenticated and returns `{ configured,
testMode }`. Drop `testMode` from the public response entirely (the `HEAD`
config probe stays as-is); if a testMode check is needed internally, gate it
behind the existing admin auth check used elsewhere in `src/app/api/admin/`.

> **Exit** — `GET /api/stripe/checkout` returns only `{ configured: boolean }`.
>
> **Test** — extend the existing checkout route test (or add one) asserting
> the JSON body has no `testMode` key regardless of the configured key's
> prefix.

---

## Phase 4 — Trust: product and legal

### RS-10 · Reconcile the two retention notices; add a purge-warning email
**Gap G-19 · code · TODO · 1 eng-day (+ Romy: 30min copy sign-off)**

`apply/module1/page.tsx:388` promises 90 days after visa outcome;
`privacy/PrivacyClient.tsx:43,67` and the retention cron itself say 30 days
after package generation or 90 days after upload, whichever is first. Rewrite
the Module 1 notice to state the real schedule and distinguish *application
data* (which the platform doesn't purge on this timeline) from *uploaded
files* (which it does). Add a warning email sent 7 days before a file's purge
date, using the existing Resend helper pattern from Sprint DR's DR-4, and
surface the purge date next to each file in the Documents area.

> **Exit** — the Module 1 notice and the privacy policy state the same
> schedule. A file 7 days from its purge date has a warning email sent and a
> visible countdown in the Documents UI.
>
> **Test** — `src/lib/emails/__tests__/retention-warning-email.test.ts`:
> renders with a realistic payload, contains the correct purge date and a
> working link, no unresolved placeholders; a snapshot/text assertion that the
> Module 1 copy and privacy policy copy state matching day counts.

---

### RS-11 · Accessibility floor — axe CI gate + keyboard reachability
**Gap G-20 · code · TODO · 1.5 eng-days**

Add `axe-core`/`@axe-core/playwright` to the existing Playwright suite, run
against the paid path (`/results` → checkout → `/onboarding` → `/documents`)
with zero criticals as the bar. Convert the 13 clickable `<div>`/`<span>`
elements found in the sweep to real `<button>`s (or add
`role="button"`/`tabIndex`/`onKeyDown` only where a real button genuinely can't
be used). Add a visible `:focus-visible` style once in the token layer —
currently zero exist anywhere in the app.

> **Exit** — the axe check passes with zero criticals on the paid path; tabbing
> through `/results` and `/documents` with no mouse reaches every action a
> mouse user can reach, with a visible focus ring throughout.
>
> **Test** — the axe Playwright spec itself is the test — it's added to the CI
> suite and gates the build, not a one-time manual check.

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
| 2 — Structural blindness | RS-5…RS-7 | ~2 (+ Romy decision on RS-7) |
| 3 — Trust: security surface | RS-8, RS-9, RS-13 | ~1.75 |
| 4 — Trust: product/legal | RS-10, RS-11 | ~2.5 (+ Romy copy) |
| 5 — Standing hardening | RS-12 | 0.5 |
| **Total** | 13 tasks | **~9.75 eng-days** |

## Blocked on Romy

| Task | Needs |
|---|---|
| RS-7 | Schema decision: add `application_lifecycle.application_id`, or rename the field to reflect it's genuinely user-level |
| RS-10 | 30-minute sign-off on the reconciled retention copy before it ships |

Everything else is unblocked and can start in sequence, independent of Sprint
DR — confirm against DR's current WIP state before touching `src/types/generation.ts`
or the webhook route, since DR-1/DR-2 may have open edits there.
