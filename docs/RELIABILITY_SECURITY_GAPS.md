# Reliability & Security — Gap Register (outside delivery)

**Opened:** September 10, 2026 (Session 145)
**Branch:** `dev` — never commit directly to `main`
**Question this register answers:** the delivery register asks *does the package
come out the other end?* This one asks the two questions on either side of it —
*did the money reliably buy the access we promised,* and *does everything else a
client touches hold up?*

**Source:** a read-only sweep of the live `dev` branch at `e289daa` — 118 API
routes, 107 pages, `src/middleware.ts`, the Stripe webhook, the four Vercel
crons, and the client surface. Every gap below is anchored to a `file:line` that
was read, not inferred from architecture, and carries a proof step rather than a
claim of having been observed in production.

**Relationship to the delivery register:** no overlap. `DELIVERY_RELIABILITY_GAPS.md`
owns G-01…G-12, the payment→generation→assembly→download path. This file owns
G-13…G-25, everything else. Numbering is continuous on purpose so the two read as
one sequence.

---

## The headline

**Sprint DR guards the package. Nothing guards the payment.**

G-13 and G-14 combine into a single failure. The webhook records the Stripe event
as processed **before** it does any work, then handles every error below that
point by capturing it and continuing. When something goes wrong after that write,
Stripe does exactly what it is designed to do and redelivers the event — and our
code looks it up, finds the id already present, and answers
`{ received: true, duplicate: true }`.

> **We have taken Stripe's retry — the one mechanism that makes webhook-driven
> payment safe — and switched it off at precisely the moment it was needed.**

The client's money is captured, their access is never granted, and no cron
anywhere asks the only question that would surface it: *who paid us and still
cannot get in?*

Three themes:

- **Money and access** (G-13…G-15) — three independent ways a paying client ends
  up looking at a buy button.
- **Structural blindness** (G-16, G-21, G-22) — the codebase still cannot see its
  own database failures.
- **Trust and finish** (G-17…G-20, G-23…G-25) — an open redirect on the login
  page, no error pages at all, a retention promise that contradicts itself, and
  an accessibility floor a US-facing paid product should not be sitting on.

---

## Severity summary

| Gap | What it costs | Severity | Status |
|---|---|---|---|
| G-13 | Paid, never unlocked — and Stripe's retry is disabled by our own dedup | Critical | Open |
| G-14 | One unguarded throw turns a partial payment into a permanent one | Critical | Open |
| G-15 | A database blip shows a paying client the pricing page | Critical | Open |
| G-16 | 264 queries still cannot report their own failure | Serious | Open |
| G-17 | Open redirect on login — phishing launched from our own domain | Serious | Open |
| G-18 | No 404, no error page on 107 routes — dead ends by default | Serious | Open |
| G-19 | Two different retention promises; files vanish months early, unannounced | Serious | Open |
| G-20 | Accessibility floor — 3 ARIA roles across the whole app | Serious | Open |
| G-21 | Simulator pack grant loses a purchase under concurrency | Structural | Open |
| G-22 | Payment timestamp stamps every application a user owns | Structural | Open |
| G-23 | Rate limits become per-instance during an Upstash outage | Structural | Open |
| G-24 | The business plan has no second provider — by choice, but unguarded | Structural | Open |
| G-25 | The platform tells the public whether it is in Stripe test mode | Structural | Open |

---

## Money and access — fix before the first ten clients

### G-13 — The webhook marks the event done before it does the work

**Severity:** Critical · **Status:** Open

The idempotency design is right in principle: insert the Stripe event id first
and let a unique constraint catch duplicates atomically, with no SELECT-then-INSERT
race. The in-code comment is correct about the race it closes.

But the row is written **before** a single line of business logic runs, and every
step that follows handles failure the same way — `captureApiError(...)` and
*continue*. The payment stamp fails: captured, continue. The application unlock
fails: captured, continue. The route returns `200 OK` either way.

So when the unlock fails, Stripe redelivers, our code finds the id present, and
returns `duplicate: true`. The client is charged, the application stays unpaid,
and there is no reconciliation job among the four crons that would ever notice.

`captureApiError` writes to `console.error` and to Sentry when a DSN is
configured. That is a log line, not a recovery path — and nobody is watching it
at 2am.

**Evidence**
- `src/app/api/stripe/webhook/route.ts:65–77` — dedup insert, `23505` → `duplicate: true`
- `src/app/api/stripe/webhook/route.ts:116, 139, 160, 180, 198, 213` — capture-and-continue
- `src/lib/capture-error.ts:10` — `captureApiError` is log + Sentry only
- `vercel.json:8,12,16,20` — four crons, none of them reconciliation

**Fix:** make the dedup row a *claim*, not a receipt. Mark it completed only
after the handler succeeds; delete it or mark it failed on error so redelivery
re-runs. Then add the reconciliation cron that asks Stripe *who paid and is still
locked out* — that is the backstop for G-13, G-14 and G-15 together.

**Proof:** break the `applications` update, complete a checkout, then replay the
event from the Stripe dashboard. Today it returns `duplicate` and the client stays
locked out. After the fix, the replay unlocks them.

---

### G-14 — The entire event switch has no error boundary

**Severity:** Critical · **Status:** Open

There is exactly one `try/catch` in the webhook and it wraps `constructEvent` —
signature verification only. Everything after it, all four event handlers and
roughly 340 lines, runs unguarded.

A concrete path: the last thing `checkout.session.completed` does is
`await redis.del(...)` to invalidate the access cache. It is guarded against Redis
being *unconfigured*, but not against Redis being *unreachable* — and Upstash was
observed erroring during this session's own test run. That throw escapes to Next,
the route answers 500, Stripe retries, and G-13 turns the retry into a no-op.

The worst version is the **half-applied payment**: the payment row stamped
completed, the application never unlocked, and no path back.

**Evidence**
- `src/app/api/stripe/webhook/route.ts:49–51` — the only `try/catch`
- `src/app/api/stripe/webhook/route.ts:228, 391` — unguarded `await redis.del(...)`

**Fix:** wrap the switch. Treat a failed handler as a reason to *un-claim* the
event (see G-13), not merely to log it.

**Proof:** point `UPSTASH_REDIS_REST_URL` at a dead host and complete a checkout.
The client must still end up unlocked.

---

### G-15 — The payment gate fails closed

**Severity:** Critical · **Status:** Open

On a cache miss the middleware reads the user's applications and derives access
from the rows it gets back. The query is destructured as `const [{ data: apps }, …]`
— **the error is not bound at all.** A Supabase timeout, a transient 5xx, or one
more column drift returns `data: null`, which is indistinguishable from "this user
has no paid applications."

The consequence is the single worst moment the product can produce: someone who
paid clicks into their case and is redirected to `/results` — **the pricing page,
with a buy button on it.** No error, no explanation, nothing to distinguish it
from never having paid. The most likely support ticket in the platform's whole
surface is *"I paid and it's asking me to pay again,"* and it is one network
hiccup away.

What makes this a policy problem rather than a bug is that the codebase already
knows the right answer. `src/lib/partnership-hold.ts` fails **open** on a database
error, with a comment explaining that a transient fault must never block a paying
applicant. The middleware — a far more consequential gate — does the opposite.
The same reasoning applies with more force here: on an infrastructure error, let
the paying user through and alert us, rather than accusing them of not having paid.

The same unbound-error pattern governs the FDD unlock check and the terms gate a
few lines below, which is how a client can also be bounced into a terms-acceptance
loop.

Note the one place the code *does* get this right: `safeCacheGet` / `safeCacheSet`
wrap Redis in try/catch with a circuit breaker, so a cache outage degrades to a
DB read instead of a 500. The pattern exists in this very file. It just was not
applied to the queries.

**Evidence**
- `src/middleware.ts:416–419` — `apps` and `profile`, neither binds `error`
- `src/middleware.ts:437` — `const { data: fddPayment }`
- `src/middleware.ts:498` — `const { data: acceptance }`
- `src/middleware.ts:125–147` — `safeCacheGet`/`safeCacheSet`, the correct pattern
- `src/lib/partnership-hold.ts` — documented fail-open, the opposite policy

**Fix:** bind the error on all three. On error, grant access for this request and
alert — fail open, matching `partnership-hold.ts` — and do **not** write the
failure into the access cache.

**Proof:** force the applications query to error for a paid user; they must reach
their case, not `/results`.

---

## Structural blindness

### G-16 — 264 Supabase calls still discard their error

**Severity:** Serious · **Status:** Open

The project's standing rule is unambiguous: *supabase-js does not throw — it
returns `{ data, error }`, and a query naming a column that does not exist returns
`data: null` plus a 42703, so if nothing reads the error the failure is
indistinguishable from an empty result.* The rule exists because that is how 44
broken queries reached production (Sprint S).

A sweep of `src/` finds **264 call sites that destructure only `data`** and never
bind `error`. Sprint S corrected the 44 known instances; the pattern that produced
them is intact, and there is no lint rule, no CI check and no review gate standing
in front of the next one. G-15 is simply the most expensive of the 264.

**Evidence**
- `grep -rEc "const \{ data(: [A-Za-z_]+)? \} = await" src --include="*.ts" --include="*.tsx"` → 264

**Fix:** one ESLint rule that fails the build on an unbound Supabase error.
Error-level in `src/middleware.ts`, `src/app/api/**` and `src/lib/**`, where a
silent null becomes a wrong decision; warn-level in page components, where it
usually only means an empty list. This does not need 264 hand edits — it needs the
gate, then attrition.

**Proof:** add the rule; CI fails on today's tree; the count only goes down.

---

### G-21 — The simulator pack grant can lose a purchase

**Severity:** Structural · **Status:** Open

Granting three extra simulator sessions is a read-modify-write: select the current
count, add three, write it back. Two grants that interleave — a double-click, a
redelivered event, two purchases close together — produce one grant, not two.
**The client pays twice and receives once.**

**Evidence:** `src/app/api/stripe/webhook/route.ts:189–216`

**Fix:** an atomic increment in the database (RPC or `raw` expression), not
arithmetic in the handler.

**Proof:** fire two grant events concurrently; the count must rise by 6, not 3.

---

### G-22 — The payment timestamp stamps every application the user owns

**Severity:** Structural · **Status:** Open

The lifecycle stamp is keyed on `user_id` alone. The in-code comment explains why:
it used to filter on an `application_id` column that does not exist, so it errored
on every payment and `payment_completed_at` was never written at all. The filter
was removed rather than replaced.

Both halves are a data problem. Historically the column has no valid values.
Currently, a user with more than one application has **all** of them marked
paid-at the moment any one is. Every funnel number derived from that column is
wrong, and wrong specifically for repeat and multi-case clients.

**Evidence:** `src/app/api/stripe/webhook/route.ts:149–166`

**Fix:** a schema decision, not a code patch. Verify `application_lifecycle`
against the **live** database before adding anything —
`set -a && . ./.env.local; set +a && python3 scripts/audit-schema-drift.py --refresh`.
Treat existing `payment_completed_at` values as unusable.

---

## Trust and finish

### G-17 — Open redirect on the login page

**Severity:** Serious · **Status:** Open

The login page reads `?next=` from the query string and, on success, assigns it
straight to `window.location.href` with no check that it is a relative path.
`/login?next=https://evil.example/e2go` authenticates the user on the real site
and then hands them to an attacker's page — **from our own domain, at the exact
moment the user has decided to trust us.** It is the ideal phishing carrier: the
link really is ours, the login really is ours, and the credential prompt on the
far side looks like a session that timed out.

Three more sinks share the flaw in weaker form. `auth/callback` and `signup`
concatenate as `` `${origin}${next}` ``, which stops absolute URLs but not a
protocol-relative `//evil.example`; `terms-required` pushes the raw value through
the router. Signup's version is baked into a confirmation email, though Supabase's
own redirect allow-list blunts it.

**Evidence**
- `src/app/login/page.tsx:114` and `:159` — `window.location.href = next`
- `src/app/auth/callback/route.ts:50` — `` NextResponse.redirect(`${origin}${next}`) ``
- `src/app/signup/page.tsx:106` — `` emailRedirectTo: `${window.location.origin}${next}` ``
- `src/app/terms-required/page.tsx:58` — `router.push(next)`

**Fix:** one shared helper — accept only a value beginning with a single `/`,
fall back to the route's default otherwise. Apply to all four sinks.

**Proof:** a test asserting each sink rejects `https://evil.example`,
`//evil.example` and `/\/evil.example`.

---

### G-18 — No 404 page, and no error page on any of 107 routes

**Severity:** Serious · **Status:** Open

There is no `not-found.tsx` anywhere, no `error.tsx` in any route segment, and no
`loading.tsx`. The only boundary is the root `global-error.tsx`, which catches
root-layout failures — meaning a thrown error inside *any* page renders Next's
default, and any mistyped or stale URL renders Next's default 404. **A client
following an old link from their own email lands on an unbranded page with no way
back.**

The global boundary that does exist is itself off-system: `fontFamily: 'sans-serif'`
on a product locked to Cormorant Garamond and DM Sans, and copy that says "contact
support" without linking to support.

The standing rule is *no dead ends — every error tells the user what to do next.*
Today the app has almost nothing but dead ends on the unhappy path.

**Evidence**
- `find src/app -name "error.tsx"` → 0; `-name "not-found.tsx"` → 0; `-name "loading.tsx"` → 0
- `src/app/global-error.tsx` — the sole boundary, off-design

**Fix:** a root `not-found.tsx` and `error.tsx` in Obsidian Gold, each naming a
next action; a segment-level `error.tsx` on `/apply`, `/documents` and `/generate`
where a client has work in progress; fix the global boundary's typeface and give
"contact support" a real link.

**Proof:** `/apply/does-not-exist` and a route that throws both land on a branded
page with a working next step.

---

### G-19 — Two retention promises that contradict each other, and no warning before the delete

**Severity:** Serious · **Status:** Open

Module 1 tells the applicant, in a highlighted notice: *"Your application data is
retained until 90 days after your visa outcome is confirmed, then permanently
deleted."* The privacy policy and the retention cron say something different —
uploaded files are deleted **30 days after the document package is generated**, or
90 days after upload, whichever comes first.

For a real E-2 timeline these are not close. Packages are prepared months ahead of
an interview; a client who reads the Module 1 notice reasonably believes their bank
statements and business documents are on hand until well after their outcome, and
they are in fact deleted thirty days after the package is built. **No email warns
them, and no date appears on the file.** The first they learn of it is an empty
list at the moment they came back to re-check something before their interview.

**Evidence**
- `src/app/apply/module1/page.tsx:388` — "90 days after your visa outcome"
- `src/app/privacy/PrivacyClient.tsx:43, :67` — 30 days post-package / 90 days post-upload
- `src/app/api/cron/data-retention/route.ts:27–28` — `FILE_POST_PACKAGE_DAYS = 30`, `FILE_MAX_AGE_DAYS = 90`

**Fix (decision confirmed by Romy, 2026-09-10):** rewrite the Module 1 notice to
state what the system actually does — 30 days after the document package is
generated — and distinguish *application data* from *uploaded files*, which is the
ambiguity the two notices are sitting on. Then send three emails instead of one
silent purge:

1. **On generation** — sent the moment the document package is built, stating the
   purge date (generation date + 30 days).
2. **T-minus-3 days** — a reminder that the files will be deleted in 3 days, with a
   confirm-to-keep action; confirming sets a retention hold so the scheduled purge
   is skipped for that file.
3. **On completion** — sent after the purge has actually run, confirming what was
   deleted.

The client's email address and contact preferences are retained for future
correspondence regardless of the document purge — this is a separate lifecycle from
the account itself and is untouched unless the client unsubscribes through the
existing `/api/email/unsubscribe` flow.

**Proof:** a file 3 days from its purge date has produced a reminder with a working
confirm-to-keep link; confirming it means the file is not purged on schedule; a
purged file has produced a completion email; the client's contact record and
subscription status are unchanged by the purge either way.

---

### G-20 — The accessibility floor is lower than a paid US product can afford

**Severity:** Serious · **Status:** Open

Across 107 pages: **30 `aria-label` attributes, 3 `role` attributes, 15
`focus:ring`/`focus:outline` utilities and zero `focus-visible` styles, and 13
clickable `<div>`/`<span>` elements** a keyboard cannot reach. The project's own
standard requires semantic HTML, ARIA labels and keyboard navigation on everything
that ships.

Beyond the standard there is exposure: this is a commercial site selling to
US-bound applicants, and ADA Title III demand letters against exactly this profile
are routine. The intake is also long-form and text-heavy — the population least
well served here overlaps with applicants using translation tools and screen
magnification.

**Fix:** axe-core in CI over the paid path; the 13 clickable divs converted to
buttons; a visible focus state defined once in the token layer.

**Proof:** zero axe criticals on `/results` → checkout → `/onboarding` → `/documents`.

---

### G-23 — Rate limits fall back to per-instance counters

**Severity:** Structural · **Status:** Open

When Upstash is unreachable the limiter degrades to an in-memory `Map`. This is
documented in the file's own header and is the right call for availability — but on
serverless it means the ceiling multiplies by the number of live instances, and the
LLM-backed routes are the expensive ones. **An Upstash outage is also, quietly, an
unbounded-spend window.**

**Evidence:** `src/lib/rate-limit.ts` — documented in-memory fallback

**Fix:** a hard per-instance cap on cost-critical profiles, plus a Sentry alert when
the fallback engages, so the failure stays survivable without becoming expensive.

---

### G-24 — The business plan has no second provider

**Severity:** Structural · **Status:** Open (accepted risk, needs a guard)

Document generation has a genuinely good fallback chain — two Opus attempts, then
OpenRouter through GLM 5.2, mimo, mimo-pro and gemini-2.5-pro. `business_plan` is
deliberately excluded, because the eval showed the fallback models cannot produce
one at full length, and failing loudly beats shipping a degraded centrepiece.
**That reasoning is sound and should stand.**

The gap is not the decision, it is what the decision costs today: an Anthropic
outage fails the business plan, and until DR-6 lands, one failed document aborts
the whole run. A provider blip currently destroys a 25-document package over the one
document that was allowed to fail.

**Evidence:** `src/lib/generation-engine.ts:1304–1324` — `callDocGenFallback`,
`business_plan` excluded by design

**Fix:** none to the policy. Note this on DR-6 as the case that motivates
partial-package handling, and check provider status before a launch day.

---

### G-25 — The platform publicly reports whether it is in Stripe test mode

**Severity:** Structural · **Status:** Open

`GET /api/stripe/checkout` is unauthenticated and returns `{ configured, testMode }`,
where `testMode` is derived from whether the secret key starts with `sk_test_`.
Harmless while the key is live; an unforced disclosure if a deploy ever carries test
keys, and the sort of thing a competitor or a wary buyer checks.

**Evidence:** `src/app/api/stripe/checkout/route.ts:13–20`

**Fix:** gate behind the admin guard, or drop `testMode` from the public response.
The `HEAD` probe is fine and should stay.

---

## Verified sound — explicitly not gaps

Recorded so a later sweep does not re-open them.

| Area | Finding |
|---|---|
| LLM resilience | `src/lib/llm-client.ts` — two-provider fallback with per-task chains, timeouts and empty-content detection. Sound. |
| Doc-gen fallback | `generation-engine.ts:1304–1324` — correct, with `business_plan` deliberately Opus-only (see G-24). |
| Webhook signature | `constructEvent` with a 300s tolerance, guarded. Correct. |
| Webhook idempotency | The atomic-insert design is the right one — the bug is *when* the row is written, not how (G-13). |
| Redis in middleware | `safeCacheGet`/`safeCacheSet` with try/catch and a circuit breaker. The correct fail-open pattern. |
| Cross-user scoping | The application and FDD unlocks are scoped `.eq('user_id', userId)`, defeating a spoofed id in session metadata. |
| API auth coverage | Only 5 unguarded routes, all legitimately public; 7 of 76 service-role routes without user scoping, all legitimate. |
| Identity documents | The in-memory-only carve-out holds — `/api/documents` rejects identity types, `file_path` stays `''`. |

---

## Recommended sequencing

Sprint DR should not be reordered — Phases 1 and 2 stay the launch gate. But
**G-13, G-14 and G-15 belong in front of DR-3**, not behind Phase 8. Roughly a day
and a half together, on the money path rather than the delivery path, and each one
independently produces the same outcome: a client who paid and cannot tell the
difference between our failure and their own mistake.

A Phase 0 that touches nothing DR-1 is holding:

1. Turn the webhook dedup row into a claim and wrap the switch (G-13, G-14).
2. Bind the error in the three middleware queries; fail open with an alert (G-15).
3. Add the paid-but-locked-out reconciliation cron — the backstop for all three,
   and the one that tells you the number instead of making you wait for a ticket.

Everything else queues behind Phase 2. The one that should not sit long is **G-17**:
twenty lines and one shared helper, and an open redirect on a login page is the kind
of finding that is embarrassing to have known about.

---

## Caveats on this sweep

- **Static analysis, not a live probe.** Nothing here was run against production.
  Each gap carries a proof step for that reason.
- **RLS coverage is unverified.** The live Supabase schema is the only authority on
  policy coverage, and the audit script writes a snapshot — not something to run
  while another agent is working in this tree. This is the one area of the sweep
  with a known hole; it should be closed with a deliberate RLS audit.
