# Incident Runbooks

_Last updated: 2026-09-12 (BC-18 / Gap G-13)_

Three failure classes identified by the business-continuity audit
(`docs/BUSINESS_CONTINUITY_GAPS.md`, G-13) as undrilled and unrehearsed
outside the document-generation pipeline: a leaked/rotated API key (13 prior
real incidents — the most common actual failure this project has had), a
Stripe outage or webhook backlog, and a Supabase outage. `scripts/chaos-drills.mjs`
covers document-generation failure modes only; none of these three are
simulated there. This document is the manual procedure until (or unless)
they are.

Each runbook assumes the responder is Romy or whoever holds the Vercel /
Supabase / Stripe dashboard credentials — none of these steps can be
performed by an agent session, since they require rotating live production
secrets or acting inside third-party dashboards.

---

## Runbook 1 — Leaked or rotated API key

**Trigger:** a key appears in a place it shouldn't (committed to git, pasted
in chat, GitHub secret-scanning alert), or a key needs routine rotation.
This is the highest-frequency real incident this project has had (13 prior
occurrences per the audit) — treat it as a "when," not an "if."

**Keys in scope**, from `.env.example`, roughly in order of blast radius if
leaked:

| Key | Blast radius if leaked |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full read/write bypass of every RLS policy — highest severity. |
| `STRIPE_SECRET_KEY` | Can create charges/refunds, read all customer payment data. |
| `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` | Usage-based billing abuse; no customer data exposure by itself. |
| `RESEND_API_KEY` | Can send email as e2go's verified sending domain (phishing/spam risk). |
| `CRON_SECRET` | Can trigger cron routes out-of-schedule (each route is otherwise idempotent/safe to re-run). |
| `UPSTASH_REDIS_REST_TOKEN` | Can read/write rate-limit and middleware-cache state; no document content. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already public by design (ships to the browser) — RLS is the actual boundary, not secrecy of this key. Not a leak. |

**Procedure:**

1. **Confirm the leak is real** before rotating anything — a rotation with
   no coordinated redeploy can cause an outage of its own (see step 4). If
   it's a `git log` false-positive (secret-scanning flagged something that
   turned out to be a placeholder or already-rotated value), stop here.
2. **Rotate the key at its source**, not just in `.env.local`:
   - Supabase: Dashboard → Project Settings → API → "Reset service role key" (or "Reset anon key").
   - Stripe: Dashboard → Developers → API keys → roll the secret key. Roll
     the webhook signing secret separately if the leak included it.
   - Anthropic / OpenRouter: dashboard → API keys → revoke, generate new.
   - Resend: Dashboard → API Keys → revoke, generate new.
   - `CRON_SECRET` / `UPSTASH_REDIS_REST_TOKEN`: these are app-chosen
     values, not vendor-issued — generate a new random value yourself
     (`openssl rand -hex 32`) for `CRON_SECRET`; rotate the Upstash token
     from the Upstash console.
3. **Update the value in Vercel** (Project Settings → Environment
   Variables) for Production, Preview, and Development as applicable —
   `vercel env ls production` first to confirm you're editing the var that
   actually exists there, since names have drifted before (see
   `reference_vercel_env` memory / prior sessions).
4. **Redeploy** (`npx vercel --prod` or push to `main`) — a rotated key does
   not take effect on already-running serverless instances until the next
   deploy/cold-start picks up the new env var. Rotating without redeploying
   creates a window where the OLD key is what's actually live in some
   invocations and the NEW key is what Vercel's dashboard shows, which is
   confusing to debug if something breaks in between.
5. **Watch for fallout for the next hour**: `health-watchdog` cron (every
   10 min) will page if a downstream job starts failing; check Sentry for a
   spike in errors tagged to the affected integration (Stripe webhook
   signature failures, Supabase auth errors, LLM 401s).
6. **If the leak was via git history** (committed, not just pasted in
   chat), the key is permanently compromised even after rotation — anyone
   who cloned the repo before the fix has it. Rotation is still the correct
   response (git history can't be un-leaked, but the old key can be made
   useless); do not attempt a history rewrite (`git filter-branch` /
   BFG) as a substitute for rotation, and only do a history rewrite at all
   if the repo's public visibility (confirmed public per the original BC
   audit) makes the exposure itself intolerable — that decision needs
   Romy directly, it is not a unilateral engineering call.

**Recovery confirmation:** hit one endpoint that exercises the rotated key
end-to-end (e.g. after Stripe rotation, `POST /api/checkout/initiate` in a
test mode; after Supabase rotation, log in as a test account) rather than
trusting "the dashboard shows a new key" alone.

---

## Runbook 2 — Stripe outage or webhook backlog

**Trigger:** Stripe's own status page (status.stripe.com) reports an
incident, or `payment-reconciliation` cron (`0 5 * * *`) / `sendOpsAlert`
reports a mismatch between Stripe's records and this app's `payments` table
(BC-2/BC-3 wired this alert; see `src/lib/payment-reconciliation.ts`).

**What actually breaks:**
- **Checkout**: `POST /api/checkout/initiate` and `create-checkout` create
  a Stripe Checkout Session — if Stripe's API is down, these calls fail and
  the user sees an error; no partial/corrupt state is created since nothing
  is written to the DB until the webhook confirms payment.
- **Webhooks**: `POST /api/stripe/webhook` is Stripe's confirmation that a
  payment succeeded — this is where `payments` rows get created and package
  generation gets triggered. If Stripe's webhook delivery is delayed or
  backlogged (rather than the API being fully down), a customer can pay
  successfully but the app won't know for minutes-to-hours, so `packageReady`
  stays false and the customer sees nothing has happened.
- `processed_webhook_events` (RS-1's dedup/claim table, see BUILD_TRACKER
  Session 148/150) makes webhook redelivery safe to reprocess — this is
  the mechanism that makes recovery below safe.

**Procedure:**

1. **Check status.stripe.com first** — if Stripe itself confirms an
   incident, the fix is "wait," not "debug our code." Note the incident
   start time; you'll need it in step 3.
2. **Do not disable or bypass the webhook route** as a workaround (e.g. to
   "manually mark payments complete") — this is exactly the kind of ad hoc
   change that creates the untraceable payment states `payment-reconciliation`
   exists to catch. If a customer needs to be unblocked urgently, prefer a
   support-side manual grant (however this app already handles manual
   package access, if it does) over touching payment state directly.
3. **Once Stripe recovers, replay missed webhooks**: Stripe Dashboard →
   Developers → Webhooks → select the endpoint → Events tab → filter by the
   incident time window → "Resend" on each event that shows as
   undelivered/failed. `processed_webhook_events`'s claim semantics (a
   `'processing'`/`'failed'` row is safe to reclaim; a `'completed'` row
   short-circuits as a genuine duplicate) mean re-sending is safe even for
   events that may have partially succeeded — see RS-1 in BUILD_TRACKER.
4. **Run `payment-reconciliation` manually** rather than waiting for its
   `0 5 * * *` schedule, to confirm the backlog actually cleared: trigger it
   the same way `health-watchdog` or a manual `curl` with the `CRON_SECRET`
   bearer token would. A clean run (no `sendOpsAlert` fire) confirms Stripe
   and the app's `payments` table agree again.
5. **If a specific customer reports "I paid but see nothing"** during the
   outage: check Stripe Dashboard directly for their charge (search by
   email) before assuming anything about app state — if Stripe shows the
   charge succeeded but no matching `payments` row exists yet, that is the
   exact undelivered-webhook case step 3 fixes; resend that customer's event
   specifically rather than waiting for the bulk replay.

**Recovery confirmation:** a clean `payment-reconciliation` run with zero
mismatches, and the specific customer(s) who reported issues can see their
package as ready.

---

## Runbook 3 — Supabase outage

**Trigger:** status.supabase.com reports an incident, or the app is
returning 500s across the board (every route touches Supabase for auth
and/or data — this is the single largest blast-radius dependency in the
stack, per the BC-4 finding that the project has no independent
backup/recovery path outside Supabase's own managed backups plus the BC-12
GitHub Actions `pg_dump` backup this project added).

**What actually breaks:** everything. Auth, all API routes, all Storage
(document upload/download/generation). This is a full-outage scenario, not
a degraded-feature one — there is no fallback data source anywhere in this
codebase.

**Procedure:**

1. **Check status.supabase.com** to confirm it's Supabase's incident and
   not something in this app's own control (a bad deploy, a DNS issue, a
   Vercel-side outage) — `vercel.com/status` and this project's own recent
   deploy history are the two things to rule out first, since those ARE
   things an engineer can act on immediately, unlike a genuine Supabase
   outage.
2. **If it's confirmed Supabase-side: there is no code-level mitigation.**
   Do not attempt to "fail over" to a backup database mid-incident — the
   backups this project has (Supabase's own managed backups on whatever
   tier the project is on, plus the independent daily `pg_dump` to
   Cloudflare R2 from BC-12's GitHub Actions workflow) are for **data-loss**
   recovery, not for serving live traffic during a transient Supabase
   platform outage. Standing up a parallel Postgres instance from a backup
   dump, pointing the app at it, and then reconciling two divergent
   databases afterward is almost always worse than a few hours of
   downtime — do not do this without Romy's explicit sign-off, and only
   consider it at all if Supabase's own incident communication indicates
   the outage will be prolonged (hours, not minutes).
3. **Communicate status to users** if the outage is prolonged — this repo
   has no status page of its own; the honest interim step is Romy posting
   directly wherever customers would look (the app's own support channel /
   email), not a code change.
4. **Once Supabase recovers**, check `health-watchdog`'s cron log
   (`cron_log` table, or Sentry) for the outage window — every cron that
   was scheduled to run during the outage (`generation-resume`,
   `payment-reconciliation`, `data-retention`, `rebuild-profiles`,
   `quiz-nurture`) will have failed and needs a manual one-off run if its
   own logic isn't self-healing on the next scheduled run:
   - `generation-resume` (every 10 min): self-healing — next scheduled run
     picks up any job still `in_flight`.
   - `payment-reconciliation` (daily): safe to just wait for tomorrow's run
     unless a customer complaint surfaces sooner (see Runbook 2, step 4).
   - `data-retention` (daily): safe to wait — a missed day doesn't
     hard-delete anything early; the 7-day archive window (BC-16) gives
     slack here too.
   - `rebuild-profiles` / `quiz-nurture`: lower stakes, safe to wait for the
     next scheduled run.
5. **Verify data integrity post-recovery** if the outage involved any
   reported data corruption (not just unavailability) — `python3
   scripts/audit-schema-drift.py --refresh` confirms the schema is intact;
   spot-check a few recently-active accounts' data rather than assuming a
   clean recovery.

**Recovery confirmation:** a normal user can log in, view their
application, and the next `health-watchdog` cycle reports all jobs healthy.

---

## What this document does not cover

- Vercel outages (deploy pipeline / hosting itself down) — not drilled,
  not written up here; flagged as a gap in the original audit
  (`docs/BUSINESS_CONTINUITY_GAPS.md`) alongside GitHub/Vercel account
  lockout, neither of which has a runbook yet.
- LLM-provider outage at scale (Anthropic/OpenRouter/Gemini all down
  simultaneously) — the existing per-route fallback chains handle a single
  provider's outage; a simultaneous multi-provider outage has no runbook.
- Any of these three scenarios actually being chaos-drilled in code — see
  BC-19, which extends `scripts/chaos-drills.mjs` with a payment-
  reconciliation drill (the Stripe side of Runbook 2) but does not drill
  the leaked-key or Supabase-outage scenarios, which are not the kind of
  thing that can be safely simulated against a live account.
