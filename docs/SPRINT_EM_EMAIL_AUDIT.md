# Sprint EM — Email System Audit & Activation

**Written:** September 17, 2026. **Branch:** dev — never commit to main.
**Audience:** the next agent. This document is self-contained — you do not need
the originating conversation. Read this top to bottom before touching anything.

---

## 0. Where this came from

Romy asked for a full audit of every email the app can send — content,
trigger, purpose, and whether it actually fires. A general-purpose agent
grep'd every call site of the email-send functions across `src/` (not just
file names) and traced each one back to its trigger. Provider: `resend` npm
package, no central wrapper — each call site instantiates its own
`new Resend(process.env.RESEND_API_KEY)`. `EMAIL_SENDER` /
`FOUNDER_EMAIL_SENDER` constants live in `src/lib/emails/senders.ts:22,34`.

`RESEND_API_KEY` and `CRON_SECRET` are both present in local `.env.local`.
**Not yet confirmed against Vercel production env** — see EM-1.

---

## 1. Full inventory (22 emails)

### Group A — Live and firing (15)

| # | Email | Trigger | File:line | Subject |
|---|---|---|---|---|
| 1 | Early-access welcome | `POST /api/early-access` on signup | `src/lib/emails/early-access-welcome.ts:172`, `src/app/api/early-access/route.ts:121` | "The E-2 lawyer quoted me $15,000. Here's what I did instead." |
| 2 | Quiz results | `POST /api/email/results` (on quiz completion, 10-min freshness) and `/api/email/resend-results` | `src/lib/emails/results-email.ts:183` | "The thing you have been putting off has an answer now" |
| 3 | Quiz nurture — Perspective | cron `/api/cron/quiz-nurture` daily 14:00 UTC, 3–9 days post-quiz | `src/lib/emails/quiz-nurture.ts:94/290`, `src/lib/quiz-nurture-scheduler.ts:72` | varies by `hasViewedResults` |
| 4 | Quiz nurture — Worth | same cron, 10–29 day window | `quiz-nurture.ts` | "What the fee is actually for" |
| 5 | Quiz nurture — Last | same cron, 30–120 day window | `quiz-nurture.ts` | "The last one of these" |
| 6 | Package-ready | doc-gen job reaches `completed` (not `partial`) | `src/lib/emails/generation-emails.ts:148`, `src/lib/generation-engine.ts:4014` | "Your E2go.app document package is ready" |
| 7 | Reset-after-failure | cron `/api/cron/health-watchdog` every 10 min, reaps stuck jobs >30min old | `generation-emails.ts:244`, `src/app/api/cron/health-watchdog/route.ts:122` | "Your package hit a snag — we've reset it" |
| 8 | Retention notice (T-30d) | fires right after package-ready, once per application | `src/lib/emails/retention-sequence.ts:106`, `generation-engine.ts:4048` | "When your uploaded files will be removed" |
| 9 | Retention reminder (T-3d) | cron `/api/cron/data-retention` daily 4:00 UTC, docs 27–30 days old | `retention-sequence.ts:216`, `src/lib/retention-cron.ts:200` | "Your uploaded files are removed in 3 days" |
| 10 | Retention completion | same cron, after actual purge | `retention-sequence.ts:314`, `retention-cron.ts:237` | "Your uploaded files have been removed" |
| 11 | Account-deletion scheduled | `DELETE /api/account/delete`, user-initiated | `src/app/api/account/delete/route.ts:56` | "Your E2go.app account is scheduled for deletion" |
| 12 | Support ticket notification | support form submission (internal) | `src/app/api/support/submit/route.ts:67` | "[Support] {subject}" |
| 13 | Partner / Interview-Prep invite | user grants partner access | `src/app/api/partner/invite/route.ts:204` | "{senderName} has granted you Interview Prep access on E2go.app" |
| 14 | Franchise broker-connection request | broker-connection request (internal) | `src/app/api/franchise/broker-request/route.ts:65` | "New Broker Connection Request" |
| 15 | Franchise-referral notification | franchise referral event | `src/app/api/notifications/franchise-referral/route.ts:63` | "New franchise referral request — {date}" (soft-gated: degrades to `{sent:false}` if `RESEND_API_KEY` unset, not currently a problem) |

### Group B — Wired but gated by a condition not currently met (6)

**Clock-1 inactivity sequence (4 emails)** — cron `GET /api/email/schedule`
daily 14:00 UTC → `checkInactivityAndSendEmails()`. Entire sweep is a no-op
unless `process.env.EMAIL_SCHEDULER_ACTIVATED_AT` is set
(`src/lib/email-scheduler.ts:201-205`). **Confirmed NOT set in local
`.env.local`; production not yet checked (EM-1).**

| # | Email | File:line | Subject |
|---|---|---|---|
| 16 | Clock 1 — Day 60 | `src/lib/emails/clock1-inactivity.ts:88` | "Your E2go.app application is still waiting for you" |
| 17 | Clock 1 — Day 67 | `clock1-inactivity.ts:111` | "One thing has changed since you were last here" |
| 18 | Clock 1 — Day 74 | `clock1-inactivity.ts:131` | "Your application data will be deleted in 16 days" |
| 19 | Clock 1 — Day 81 (final) | `clock1-inactivity.ts:155` | "Final notice — 9 days remaining" |

**Clock-2 post-outcome follow-ups (2 of 3 emails)** — only enqueued by
`sendOutcomeEmails()`, which has zero callers (see Group C, #22). Since
nothing ever writes rows into `scheduled_emails` for clock2, these never
have anything to send even though the sweep itself runs unconditionally.

| # | Email | File:line |
|---|---|---|
| 20 | Clock 2 — Day 60 follow-up | `src/lib/emails/clock2-post-outcome.ts:130`, enqueued via `email-scheduler.ts:440` |
| 21 | Clock 2 — Day 83 follow-up | `clock2-post-outcome.ts:150`, enqueued via `email-scheduler.ts:443` |

### Group C — Defined, zero call sites anywhere in `src/` (orphaned) (1 root cause, 1 more email)

| # | Email | File:line | Root cause |
|---|---|---|---|
| 22 | Clock 2 — Immediate outcome | `clock2-post-outcome.ts:87` ("Congratulations — your E-2 visa journey is complete" / "We're sorry to hear about your outcome") | Only reachable via `sendOutcomeEmails()` (`src/lib/email-scheduler.ts:309`), which itself has **zero callers** anywhere in `src/`. `src/app/api/dashboard/outcome/route.ts` — where outcomes are actually recorded — contains no reference to email at all. |

**Net effect:** #22's dead root cause is *why* #20 and #21 are also dead —
fixing EM-3 below activates all three Clock-2 emails at once.

---

## 2. Sprint tasks

### EM-1 — Confirm production env state (ZERO RISK, do this first)

**Problem:** this audit only checked local `.env.local`. Before doing any
code work, confirm whether `EMAIL_SCHEDULER_ACTIVATED_AT` is already set in
Vercel production — if it is, Clock-1 may already be live and the "dead"
finding above is a local-env artifact, not a prod bug.

**Task:** `vercel env ls` (or `vercel env pull` into a scratch file per
[reference_vercel_env.md] safety rule — never overwrite `.env.local`
directly, see [[feedback_env_local_safety]]). Check for
`EMAIL_SCHEDULER_ACTIVATED_AT` in Production scope.

**Acceptance:** documented answer — set or not set — before EM-2 proceeds.

### EM-2 — Activate Clock-1 inactivity sequence (LOW RISK, conditional on EM-1)

**Problem:** 4 inactivity emails (Day 60/67/74/81) never fire because the
entire sweep short-circuits without `EMAIL_SCHEDULER_ACTIVATED_AT`.

**Task:** if EM-1 confirms the var is genuinely unset in prod, set it to an
ISO timestamp (marks the go-live point so historical users aren't
retroactively blasted with a 74-day-old "inactive" email the moment the
sweep turns on — confirm this semantics by reading
`email-scheduler.ts:201-205` and the date-window logic around it before
setting the value). Requires a Vercel env change + redeploy, not a code
commit — confirm with Romy before touching production env vars per the
account-settings authorization rule.

**Acceptance:** next `/api/email/schedule` cron run processes at least one
eligible test account (verify via logs/Resend dashboard), or confirm no
eligible accounts exist yet and note that instead.

### EM-3 — Wire up Clock-2 post-outcome sequence (LOW-MEDIUM RISK)

**Problem:** `sendOutcomeEmails(applicationId, outcome)` exists and is fully
built (immediate email + schedules two follow-ups) but nothing calls it.

**Task:** add a call to `sendOutcomeEmails(applicationId, outcome)` in
`src/app/api/dashboard/outcome/route.ts` at the point where an outcome is
recorded (read the route first — confirm the exact field names for
`applicationId` and `outcome` in that handler before wiring the call).
Non-blocking send, matching the pattern used at
`generation-engine.ts:4014` (log failure, don't fail the outcome-recording
request).

**Acceptance:** `tsc --noEmit` clean, jest passing (pre-commit hook
enforces), manual test: record a test outcome, confirm the immediate email
sends and a `scheduled_emails` row is inserted for each of Day 60/Day 83.

### EM-4 — Centralize the Resend client (OPTIONAL, LOW RISK, cleanup only)

**Problem:** every one of the 22 send functions instantiates its own
`new Resend(process.env.RESEND_API_KEY)` instead of sharing one client from
`senders.ts`. Not a bug — Resend's SDK is stateless/cheap to construct — but
it's the reason #15's soft-gate (`if (process.env.RESEND_API_KEY)`) exists
in only one call site instead of being a shared guard everyone gets for
free.

**Task:** optional follow-up, not required to fix EM-1–EM-3. Skip unless
Romy asks for it explicitly — out of scope for this sprint's actual goal
(get the 7 dead emails firing).

---

## 3. Explicitly out of scope

- Rewriting email copy/content — audit found content, not a copy review
- The `desired-leopard-67358.upstash.io` Redis DNS gap — known, unrelated,
  documented in [[reference_vercel_env]]
- Any change to the 15 Group-A emails already firing correctly
