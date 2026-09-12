# Sprint BC — Business Continuity & Disaster Recovery

**Opened:** September 12, 2026 (Session 152)
**Branch:** `dev` — never commit directly to `main`
**Status doc:** this file. Update the Status column as each task lands.
**Gap register (what is broken and why):** `docs/BUSINESS_CONTINUITY_GAPS.md`

---

## Why this sprint exists

Sprint DR makes sure a paying client's documents get built. Sprint RS makes
sure the payment that triggers it is never lost. Neither sprint asks what
happens to the *business* if the database disappears, a key leaks, an LLM
sub-processor was never disclosed, or a consent checkbox nobody can prove was
ever checked becomes the subject of a complaint.

**The invariant this sprint installs, and every task serves it:**

> **A catastrophic failure or a compliance question must have a pre-written
> answer, not an improvised one. If the honest answer to "what happens if X"
> is "nobody, automatically, and we'd find out from the customer" — that's a
> gap this sprint closes, not a risk this sprint merely writes down.**

Same bar as Sprints DR and RS: no task is Done on reasoning. Each task below
carries an exit criterion that is a demonstration, not an argument, where a
demonstration is possible — several tasks here are `decision` kind, where the
"exit" is Romy choosing an option, not code.

---

## Gates — every code/migration task

1. `npx tsc --noEmit` clean
2. `npx jest` clean
3. `npm run build` clean — stop the dev server first
4. **One file per commit**, imperative present tense
5. Confirm the branch is `dev` **before** committing, not after
6. A named test exists and passes where the task is testable
7. The Exit row has been demonstrated, not argued

Live-data rule, unchanged: the live Supabase schema is the only source of
truth. `supabase-js` never throws — always read `{ data, error }`.

**This sprint touches unusually sensitive ground** — legal disclosures,
production alerting destinations, GitHub org security settings, and consent
UX. More tasks here are `decision` kind than in any prior sprint. Do not
convert a `decision` task to `code` and just pick an answer; surface the
options and wait.

---

## Task table

Legend — **Status:** `TODO` / `WIP` / `DONE` / `BLOCKED (needs Romy)`
**Kind:** `code` · `infra` = platform/cron/config · `migration` = needs SQL ·
`decision` = Romy must choose · `manual` = one-time action outside the repo

### Phase 0 — Stop the bleeding · this week

| # | Task | Gap | Kind | Effort | Status |
|---|---|---|---|---|---|
| **BC-1** | Decide: disclose Zhipu AI + Xiaomi + direct-Anthropic as sub-processors in the Privacy Policy and `DATA_RETENTION_POLICY.md`, **or** remove them from the fallback chain and accept the availability hit | G-1 | decision | 0.5 day once decided | TODO |
| **BC-2** | Add an active alert (reuse `ops-alert.ts`, don't invent a second channel) to every `payment-reconciliation.ts` mismatch | G-7 | code | 0.5 day | DONE 2026-09-12 |
| **BC-3** | Add `Sentry.captureException` + an active alert to `generation-engine.ts`'s top-level `fail()` handler — today it's `console.error` only | G-7 | code | 0.5 day | DONE 2026-09-12 |
| **BC-4** | Verify Supabase project plan tier + PITR status/window + Storage bucket versioning directly in the dashboard | G-2 | manual (Romy) | 15 min | DONE 2026-09-12 — free plan, no PITR, no automated backups |

**Why these four first:** BC-1 is a live legal exposure, not a risk of one — every day it's undecided is another day of undisclosed processing. BC-2/BC-3 close the two silent-failure paths on the payment and generation pipelines, the two things the business cannot function without, and are small, mechanical, low-risk code changes (call an existing function from a new call site). BC-4 is a 15-minute dashboard check that determines whether G-2 needs BC-9 (below) at all — do it before scoping any backup engineering work.

### Phase 1 — Close the structural gaps · before the next 25 clients

| # | Task | Gap | Kind | Effort | Status |
|---|---|---|---|---|---|
| **BC-5** | Enable branch protection on `main`: require PR + at least the `build-check` and `type-check` jobs from `security.yml` to pass, block direct pushes | G-5 | infra (Romy, GitHub Settings) | 15 min | TODO |
| **BC-6** | Same as BC-5 for `dev`, or explicitly decide `dev` stays open (document the reason if so) | G-5 | decision | 15 min | TODO |
| **BC-7** | Turn on `dependabot_security_updates` in repo Settings → Security | G-6 | infra (Romy) | 5 min | TODO |
| **BC-8** | Make identity-document rejection classify by file content (magic bytes / structure), not the client-declared `type_${key}` field | G-4 | code | 1.5 days | TODO |
| **BC-9** | Fix `outcomes_consent`: send it in the download-gate request, persist it server-side with a timestamp, and split it out of the 5 mandatory legal-disclaimer checkboxes into its own genuinely optional control | G-3 | code + migration | 1 day | TODO |
| **BC-10** | Fix `health-watchdog`'s consecutive-failure watchlist: add `generation-resume`, `payment-reconciliation`, `data-retention`; remove the nonexistent `'email-scheduler'` entry | G-7 | code | 0.5 day | DONE 2026-09-12 |
| **BC-11** | Change `OPS_ALERT_EMAIL`'s default away from a personal Gmail address to a dedicated ops address/distribution list; make both alert paths fail loudly (a second Sentry capture, not just `console.log`) if `RESEND_API_KEY` is unset | G-8 | code + decision | 0.5 day | DONE 2026-09-12 — `ops@e2go.app` created, default updated in both alert paths |
| **BC-12** | BC-4 confirmed: free plan, no PITR, no automated backups — this is now a real, active gap, not a hypothetical. Build an independent logical backup: needs a new `DATABASE_URL`/pooler credential (currently doesn't exist, see G-2), a scheduled export, and an off-Supabase storage destination. Romy chose Cloudflare R2 (no egress fees, S3-compatible tooling) over S3 (would need a new AWS account) | G-2 | infra + code | 2-3 days | IN PROGRESS — destination decided (R2), credential + export pipeline not yet built |

### Phase 2 — Harden · this quarter

| # | Task | Gap | Kind | Effort | Status |
|---|---|---|---|---|---|
| **BC-13** | Proxy login/signup through an app API route so Turnstile + the Upstash rate limiter actually see auth attempts; make CAPTCHA fail closed, not open, on a network error | G-12 | code | 1.5 days | TODO |
| **BC-14** | Wire `document_access_log`'s `'download'` action into the actual document-download route | G-11 | code | 0.5 day | TODO |
| **BC-15** | Document the `retention_hold_at` exception in `docs/DATA_RETENTION_POLICY.md` | G-9 | docs | 0.25 day | TODO |
| **BC-16** | Add a soft-delete/archival window (even 7 days, off primary Storage) before `purgeExpiredFiles`/`purgeDeletedAccounts` hard-delete | G-10 | code + infra | 1.5 days | TODO |
| **BC-17** | Consolidate the two `TERMS_VERSION` constants into one shared source | G-14 | code | 0.25 day | TODO |
| **BC-18** | Write runbooks for the three undrilled failure classes ranked most likely given history: (a) leaked/rotated API key — 13 prior incidents, (b) Stripe outage/webhook backlog, (c) Supabase outage | G-13 | docs | 1 day | TODO |
| **BC-19** | Extend `chaos-drills.mjs` with one drill outside the document pipeline — start with a simulated `payment-reconciliation` mismatch, since BC-2 just wired its alert | G-13 | code | 1 day | TODO |

### Phase 3 — Long-tail · opportunistic

| # | Task | Gap | Kind | Effort | Status |
|---|---|---|---|---|---|
| **BC-20** | Link `supabase/migrations/` to the real project (`supabase link`, add `config.toml`) and run one reconciliation pass against the live schema | G-15 | infra | 0.5 day | TODO |
| **BC-21** | Sample the ~23 unreviewed API routes and 6 unreviewed admin routes in a focused follow-up security pass | G-16 | review | 1 day | TODO |
| **BC-22** | Revisit the single-shared-Supabase-project decision (`dev`/`prod` both point at `cziphinlzfnlqlvynwnm`, per Session 151's DR-20 finding) now that a backup story exists | — | decision | — | TODO |

---

## Blocked on Romy

- **BC-1** (sub-processor disclosure vs. removal) — a legal/product call this session should not make unilaterally. Corrected finding (2026-09-12): actual document-text sub-processors are OpenRouter (gateway for both document pipelines) and Zhipu AI/`z-ai` (fallback-only, FDD pipeline) — Xiaomi/mimo never touches document content in either pipeline, so it should not be on the disclosure list. Still open, still Romy's call.
- **BC-5 / BC-6 / BC-7** — GitHub org/repo settings changes.
- **BC-12** — R2 vs. S3 decided (R2); still needs Romy to actually provision the R2 bucket + API token (walkthrough in progress, Option B: step-by-step).

## Explicitly not in this sprint

- Business-impact sizing (customer count, revenue exposure) — needed to *validate* this prioritization, not produced by it. If real numbers change the picture (e.g., near-zero paying customers today), Phase 0/1 ordering should be revisited with Romy before Phase 1 starts.
- Everything already tracked in Sprint DR (document delivery) and Sprint RS (payment/webhook reliability) — this sprint doesn't duplicate open items from either.

---

## Plan self-score

Same discipline as the audit report this sprint is built from: score the plan before treating it as final.

| Dimension | Score | Why |
|---|---|---|
| Coverage of the gap register | 9/10 | Every G-# above maps to at least one BC-# task. Nothing was quietly dropped. |
| Sequencing logic | 8/10 | Phase 0 is genuinely the 4 highest-leverage, lowest-effort items (a live legal exposure, two one-function alert wires, a 15-minute dashboard check) — not just "everything CRITICAL." One soft spot: BC-8 (content-based identity-doc detection) is HIGH-severity but sits in Phase 1 at 1.5 days, not Phase 0 — judgment call that it's a real defect but a lower-probability one (requires a mislabeled upload) than the alerting gaps, worth Romy's gut-check. |
| Effort estimates | 6/10 | These are single-session judgment calls, not sized against this codebase's actual velocity the way Sprint RS's estimates were refined session-over-session. Treat every number here as a rough order of magnitude, not a commitment — expect the first 2-3 completed tasks to recalibrate the rest. |
| Decision-vs-code discipline | 9/10 | 9 of 22 tasks are explicitly `decision`/`manual`/`infra`-needs-Romy kind rather than code this agent could just go implement — matches the actual shape of this sprint's content (a lot of what's broken is a choice nobody made, not a bug nobody caught). |
| Independent verifiability | 7/10 | Every Phase 0/1 task traces to something checked directly this session or a prior one (`gh api`, `vercel env ls`, direct file reads) — not carried-over assumption. The one soft spot: BC-12's cost/scope is explicitly unknown until BC-4 answers it, which is honest but means Phase 1's total effort number is a placeholder until then. |

**Overall: this plan is a solid starting sequence, not a finished project plan.** Its biggest known weakness is exactly what Phase 0 exists to produce inputs for: BC-1 and BC-4 are both fast decision/verification tasks that materially change the size and shape of everything downstream (BC-1 could turn into "remove three fallback models" instead of "update two docs"; BC-4 could make BC-12 disappear entirely or turn it into the sprint's single largest task). Recommend running Phase 0 first, in isolation, then re-scoping Phase 1's effort column with real answers in hand before committing to it as a block.

---

## Next agent — start here

1. **BC-2, BC-3, BC-4, BC-10, and BC-11 are DONE** (2026-09-12). BC-2/3/10 as before (see git log). BC-4: confirmed via Supabase dashboard — free plan, no PITR, no automated backups. BC-11: Romy created `ops@e2go.app`; `src/lib/ops-alert.ts` and `src/app/api/cron/health-watchdog/route.ts` both default `OPS_ALERT_EMAIL` to it now and call `captureApiError()` (not just `console.log`) when `RESEND_API_KEY` is unset. `tsc`/`jest` (705 tests)/`npm run build` all clean at each commit. Not yet pushed to `origin/dev` — confirm with Romy before pushing.
2. **New finding, not yet actioned:** `rebuild-profiles` was already on the old watchlist but its route (`src/app/api/cron/rebuild-profiles/route.ts`) never writes to `cron_log` either — that check has likely never fired. It was dropped from the watchlist in the BC-10 commit rather than left in as a false sense of coverage. Instrumenting it and re-adding it is a small follow-up (mirror the `data-retention` pattern) but is not itself part of BC-10's original scope — flag to Romy or pick up as a quick add-on.
3. **BC-1 corrected finding** (2026-09-12): re-traced actual call sites in `llm-client.ts`, `document-extraction-engine.ts`, `fdd-extraction-engine.ts` instead of trusting the prior audit's list. Real document-text sub-processors: OpenRouter (gateway) + Zhipu AI/`z-ai/glm-5.2` (FDD fallback tier only). Xiaomi/mimo does not process document content in either pipeline — drop it from the disclosure question. Still needs Romy's disclose-vs-remove decision.
4. **BC-12 in progress**: Romy chose Cloudflare R2 over S3 (no egress fees, no new AWS account needed) and asked for a step-by-step walkthrough (Option B). Next steps: (a) provision an R2 bucket + API token in the Cloudflare dashboard, (b) generate a Supabase `DATABASE_URL`/pooler credential (doesn't exist yet, per gap G-2), (c) build the scheduled export job and wire it to `cron_log` like the other crons, (d) decide retention window for the backups themselves. Not started — pick up here.
5. BC-5 through BC-7 (GitHub settings) remain TODO and still need Romy directly.
