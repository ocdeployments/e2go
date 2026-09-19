# QA fix status — 2026-09-19

Companion to [REPORT_2026-09-18.md](REPORT_2026-09-18.md). Everything below is
committed on `dev`. **Nothing has been pushed or deployed.** Production is still
exposed to F-000, F-010 and F-011 until `dev` is deployed.

Verification key: **tsc+jest** = type-check and unit tests only. **runtime** =
exercised against a running dev server. **not verified** = source change only.

## Fixed

| id | finding | commit(s) | verification |
|---|---|---|---|
| F-000 | Admin user-view leak | `e1a42af` | runtime (non-admin got 404, earlier segment) |
| F-010 | `createAccountFromVerifiedEmail` trusts caller email | `cbc5463`, `213ca73`, `6cd90d8` | tsc+jest |
| F-011 | `/api/email/results` mails any address | `308de32` | tsc+jest |
| F-013 | `/franchise/*`, `/renewal/*` auth guard dead | `76744f6` | tsc+jest |
| F-009 | Paid-LLM interview-prep on GET | `fac897d`, `f3c1687` | tsc+jest |
| F-008 | brand-view 500 and no rate limit | `11d42c5`, `4cdffa5`, `3cd0f2a` | partly runtime |
| F-001 | Brand fonts never resolved | `c2276cc`, `e093362` | runtime (fonts load) |
| F-015 | case-gaps always 500 | `07ecfcf`, `a1ac702` | tsc+jest |
| F-014 | `/modules`, `/score` empty Location | `c825cf6` | runtime (307 + Location) |
| F-012 | Support route unthrottled, unescaped HTML | `438f13f`, `4bcb72a` | runtime for 400s; captcha still open |
| F-016 | `/apply/*` blank while loading | `0ea5dda` | not verified |
| F-017 | Raw field keys in gate notes | `89b3cef` | not verified |
| F-019 | interview-day 406/400 queries | `8abeeb9` | not verified |
| F-020 | Unknown franchise brand slug returned 200 | `e20803a` | not verified (auth-gated) |
| A-010 (part) | iOS focus zoom on inputs | `deb9692` | not verified |
| — | Meta description price ($990) | `db9a4b8` | tsc+jest |
| — | All-caps brand text in Terms | `f3dc592` | tsc+jest |
| — | "Link opens once" email copy | `b4adbb0` | tsc+jest |
| — | Dead `/api/quiz/submit` middleware refs; dead `OFFLINE_URL` | `53044e1`, `2b1ccd3` | tsc+jest |

## F-009 reassessment

The report listed several other GET routes. On reading them, these were judged
benign and left as GET: `renewal/intake`, the download routes,
`case-profile/build` and `market-analysis` (idempotent reads or
per-user cached rebuilds with no external spend). Only the paid-LLM
`interview-prep` route was converted to a rate-limited POST. Revisit if any of
those gains a side effect.

## Still open (need a decision or a wider change)

- **F-012 captcha** — Turnstile widget on the support form. Rate limit and
  input hardening are in; a captcha needs a site key and a form change.
- **F-018** — "TBD" on `/apply/calendar`. Needs the real copy from Romy.
- **A-010 sitewide** — contrast (132 cells), 44px tap targets (72), non-zero
  border-radius on controls (34), pages without an `h1` (28), unlabeled inputs
  (43), "Coming Soon" copy (7 pages), FAQ dialog that would not close (4).
  Too broad to change blind; each needs its own pass with visual checks.
- **S4** — `debug-error` page gating, missing `autocomplete` on 5 pages.

## Housekeeping (not code changes)

- `npm audit`: critical `next`, high `xlsx`, `postcss`, `eslint-config-next`.
  Upgrading Next across a minor is risky on a launch branch; plan it as its own
  change with a full regression pass.
- Lint warnings 371 vs a 359 baseline.
- Stray dev servers on :3000 and :3010 should be killed by hand.
- A hung `vercel env add` process (PID 64126) holds a Stripe test key in its
  environment. Kill it and rotate that key.
- `EMAIL_SCHEDULER_ACTIVATED_AT` is unset in production (informational: the
  Clock-1 sweep stays off until it is set).
- Recommend a staging Supabase project; current QA runs share the production
  database and Upstash.
- Trufflehog CI configuration and stale UAT docs were not touched.
