# Business Continuity & Disaster Recovery — Gap Register

**Opened:** September 12, 2026 (Session 152)
**Source:** five-hat audit (SRE, Database Optimizer, Security Architect, Compliance Auditor, Incident Responder) run as parallel read-only subagents against the live repo, plus direct verification via `gh api` and `vercel env ls` in the same session (see BUILD_TRACKER Session 152 for the full trail).
**Companion sprint:** `docs/SPRINT_BC_BUSINESS_CONTINUITY.md` — this file says what's broken and why; that file says what we're doing about it and in what order.

This audit's scope was different from Sprint DR (document delivery) and Sprint RS (payment/webhook reliability): it asked what happens to the *business* — not one job — when something catastrophic or structural fails: the database, the object store, a leaked key, the LLM sub-processor relationship, the hosting platform, or the consent model itself.

---

## G-1 — CRITICAL — Undisclosed LLM sub-processors

`src/lib/llm-client.ts` and `src/lib/generation-engine.ts`'s extraction/FDD fallback chains route document text to **Zhipu AI** (`z-ai/glm-5.2`), **Xiaomi** (`xiaomi/mimo-v2.5` / `xiaomi/mimo-v2.5-pro`), and **Anthropic directly** (bypassing OpenRouter) when the primary model fails. The Privacy Policy and `docs/DATA_RETENTION_POLICY.md` disclose only **Google (Gemini, via OpenRouter)** as a document-content sub-processor. Users' financial and identity-adjacent document text is going to two companies (one PRC-domiciled) that were never named as recipients of it, and to Anthropic through a path the privacy policy doesn't describe.

**Why this is CRITICAL and not HIGH:** most other findings here are "something could go wrong." This one already has — every fallback invocation to date sent user document content to an undisclosed party. It's a live compliance breach, not a risk of one.

## G-2 — CRITICAL — No independent database backup path exists

`vercel env ls production` (checked directly this session) confirms there is **no `DATABASE_URL`, `POSTGRES_URL`, or `SUPABASE_DB_URL`** anywhere in the app's 31 production env vars — only `SUPABASE_SERVICE_ROLE_KEY` and the anon/URL pair (both PostgREST-only, not a raw Postgres connection). The app has never been wired with a path to run `pg_dump` or any other logical backup, so recovery depends entirely on Supabase's own managed backup product — whose plan tier and PITR window have not been confirmed (dashboard-only; no `SUPABASE_ACCESS_TOKEN` is available to this session or the linked CLI to check via the Management API).

## G-3 — HIGH — `outcomes_consent` is recorded nowhere and is coercively bundled

`src/app/documents/[applicationId]/page.tsx` (~lines 79-96, 693-738): the pre-download acknowledgment block has 6 checkboxes gating one `allAcknowledged` boolean that only unlocks the download button. The `outcomes_consent` checkbox's state is **never sent in any network request** — there is no record, anywhere, that a given user ever consented to outcome-data use. It is also bundled with 5 unrelated mandatory legal disclaimers the user must also check to download their own documents, which is the opposite of "freely given" consent under GDPR/CCPA-style standards.

## G-4 — HIGH — Identity-document exclusion is enforced by client-declared type, not file content

`/api/documents/route.ts` (272 lines) rejects passport/birth-certificate/etc. uploads based on the `type_${key}` field the **browser** sends with the form — not by inspecting the file itself. A user (or a bug in the client) can label a passport scan as a bank statement and it will be accepted and stored as a raw file in `application-documents`, directly contradicting the documented "identity documents are never stored as files" policy that `docs/DATA_RETENTION_POLICY.md` and the project's own `CLAUDE.md` assert as a hard rule.

## G-5 — HIGH — No branch protection or rulesets on `main` or `dev`

Confirmed via `gh api repos/ocdeployments/e2go/branches/{main,dev}/protection` → 404 on both, and `gh api repos/ocdeployments/e2go/rulesets` → `[]` (checked this session — the newer rulesets layer is equally unconfigured, not just the classic API). `.github/workflows/security.yml` runs real checks (dependency audit, secret scan, type-check, build-check) but nothing requires them to pass before a merge — confirmed historically true by BUILD_TRACKER's own record of 3 known-failing CI checks that shipped anyway (Session 150) and, structurally, by the fact that `main` and `dev` can both be pushed to directly by anyone with write access.

## G-6 — HIGH — Repo is public with a 13-incident key-leak history, and Dependabot security updates are off

`gh repo view` confirms **`visibility: PUBLIC`** (checked this session). BUILD_TRACKER.md documents at least 13 separate historical incidents of leaking/rotating the OpenAI API key. `gh api repos/ocdeployments/e2go` (checked this session) shows `secret_scanning: enabled` and `secret_scanning_push_protection: enabled` (good — these came from somewhere, presumably GitHub's free-for-public-repos defaults) but **`dependabot_security_updates: disabled`** — so a newly disclosed CVE in an already-merged dependency generates no automatic PR; the only dependency check is `security.yml`'s manual audit at push time, which can't catch a vulnerability disclosed after the last push touching that file.

## G-7 — HIGH — Two of the three most consequential failure paths have no active alert, only passive Sentry capture

- `src/lib/payment-reconciliation.ts:130-141` — every payment/document mismatch found by the daily reconciliation job calls `captureApiError` only. Nobody is paged when Stripe's ledger and the app's records disagree.
- `src/lib/generation-engine.ts`'s top-level pipeline failure handler (`fail()`, ~line 2622, invoked ~line 4046) does `console.error` + a DB status update to `'failed'` — **no Sentry call at all**, let alone an active alert. This is the single weakest alerting path in the codebase, on the pipeline that is the entire product.

By contrast, `src/app/api/cron/health-watchdog/route.ts` (verified in full, has real tests) *does* send active email alerts via `sendAlert()` — but its own consecutive-failure watchlist doesn't cover `generation-resume`, `payment-reconciliation`, or `data-retention`, and watches a cron job (`'email-scheduler'`) that doesn't exist in `vercel.json`.

## G-8 — MEDIUM — The only two active alert paths both default to a personal Gmail address and fail silently

`src/lib/ops-alert.ts` and `health-watchdog`'s private `sendAlert()` are the only two code paths in the entire app that send a real, human-visible alert (via Resend email). Both default `OPS_ALERT_EMAIL` to a hardcoded personal Gmail address, and both silently degrade to `console.log` (no error, no fallback channel) if `RESEND_API_KEY` is unset. A single misconfigured env var turns every alert in the system into a log line nobody reads.

## G-9 — MEDIUM — `docs/DATA_RETENTION_POLICY.md` omits the indefinite-hold exception that exists in code

`retention_hold_at` is a real, code-enforced exception to the documented 30/90-day purge schedule (`src/app/api/cron/data-retention/route.ts`, `src/lib/retention-cron.ts`), but the policy document doesn't mention it. Anyone reading the published policy — including the user themselves, or a future auditor — would not know this exception exists.

## G-10 — MEDIUM — Storage purges are hard, irreversible deletes with no archival step

`purgeExpiredFiles()` and `purgeDeletedAccounts()` in `src/lib/retention-cron.ts` delete Storage objects outright. There is no soft-delete window, no archival tier, and no way to recover a file purged in error (a bug in the purge logic itself, an incorrectly-set `file_purged_at`, etc.) — the purge job's own mistake is unrecoverable by design.

## G-11 — MEDIUM — `document_access_log`'s `'download'` action is defined but never fired

`src/lib/document-access-log.ts` (53 lines) types `'download'` as a valid `DocumentAccessAction`, but grep confirms it is never invoked anywhere in the codebase. The audit trail — built specifically for compliance defensibility — has a hole at exactly the action (a user or admin downloading a financial document) most likely to matter in a dispute.

## G-12 — MEDIUM — Login/signup bypass the app's own rate limiter and CAPTCHA at the network level

`src/app/login/page.tsx` and the signup flow call Supabase Auth directly from the browser using the anon key — the app's own Turnstile CAPTCHA and Upstash rate limiter never see these requests, because they're not proxied through an app API route. `src/app/api/auth/verify-captcha/route.ts` exists but isn't in the call path for the actual auth attempt itself. The CAPTCHA also fails open on a network error.

## G-13 — MEDIUM — No rehearsed failure domain outside the document-generation pipeline

`scripts/chaos-drills.mjs` / `chaos-drills-lib.mjs` rehearse exactly 3 scenarios, all inside document generation (mid-run instance death, single-doc failure/recovery, download-time build failure). Database loss, Storage loss, a leaked key (despite 13 real historical incidents), a Vercel/GitHub account lockout, a Stripe outage, and an LLM-provider outage at scale have never been drilled — `docs/SPRINT_DR_DELIVERY_RELIABILITY.md`'s own DR-23 section admits: *"if the audit ever finds a document is missing or broken... the honest answer was 'nobody, automatically, and a generic error.'"*

## G-14 — LOW — Two independently hardcoded `TERMS_VERSION = '1.0'` constants

One in `src/middleware.ts` (~line 520), one elsewhere in the terms-acceptance flow. They agree today by coincidence; nothing enforces that they stay in sync the next time terms change.

## G-15 — LOW — `supabase/migrations/` exists (102 files) but is not CLI-linked

No `config.toml` — `supabase migration list` / `db push` have no project to target from this repo. Per this project's own schema-drift rule, the migrations directory and `docs/schema_complete.sql` are both already known to disagree with the live database (the latter omits RLS policies for all 5 financial-document tables entirely), so this isn't a new risk, but it does mean the migrations directory can't be trusted as a recovery mechanism (a "replay migrations to rebuild schema" disaster-recovery step would not reliably reproduce the live schema).

## G-16 — LOW — Security review sampling gap

Roughly 23 of 122 API routes and 6 of 9 admin routes were not individually re-verified in this audit's Security hat pass (time-boxed sampling, not a finding of an actual defect in those routes).

---

## Explicitly out of scope for this register

- Business-impact sizing (customer count, revenue at risk, data-sensitivity volume) — no technical audit can produce this; it has to come from Romy and should drive final prioritization inside the sprint.
- Sentry's own dashboard-configured alert-routing rules (Slack/PagerDuty) — code shows only passive `captureApiError`/`Sentry.captureException` calls, but Sentry itself may have routing on top of that which only the dashboard shows.
