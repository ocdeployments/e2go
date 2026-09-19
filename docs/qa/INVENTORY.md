# QA audit inventory

> Generated 2026-09-18 by `scripts/qa-audit-inventory.mjs` — static analysis of the TypeScript AST. Do not hand-edit; re-run the script. Full per-element detail: `INVENTORY_DETAIL.md` and `inventory.json`.

## 1. Counts

| Metric | Count |
|---|---|
| Page routes (`page.tsx`) | 110 |
| API route handlers (`/api/**`) | 125 |
| Non-API route handlers | 2 (/auth/callback, /dev/email-preview/[template]) |
| Layouts (shells) | 24 |
| Links found in page closures | 273 |
| Buttons | 600 |
| Non-button click handlers | 20 |
| Forms | 10 |
| Inputs / textareas / selects | 232 |
| Client-side fetch() calls | 188 |
| Email-template link targets | 10 |

Access classes are derived from `src/middleware.ts` (`AUTH_ROUTES`, `PAID_ROUTES`, `AUTH_PAGES`); "enforced" reflects `isExistingGatedPath()`, the early-return that decides whether the guard runs at all.

## 2. Page access matrix

| Route | Access | Enforced by middleware | Page-level auth signal | Nav | `<title>` | Links | Btns | Inputs | Forms | API calls |
|---|---|---|---|---|---|---|---|---|---|---|
| `/about` | public | — | — | yes | About E2go.app | 2 | 0 | 0 | 0 | 0 |
| `/account-recovery` | public | — | auth.getUser, auth.signOut | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 4 | 0 | 0 | 1 |
| `/admin/coming-soon-interest` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/cost` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 0 | 0 | 0 | 0 |
| `/admin/early-access` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/franchise` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/geography` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/intelligence` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 14 | 1 | 0 | 0 | 1 |
| `/admin/promo-codes` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 2 | 8 | 1 | 2 |
| `/admin/quality` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/revenue` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/support` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/admin/system-status` | admin | yes | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 4 | 0 | 0 | 3 |
| `/admin/users/[userId]` | admin | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 10 | 5 | 0 | 3 |
| `/admin/users/[userId]/view` | admin | yes | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 0 | 0 | 0 | 0 |
| `/apply/business` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 17 | 7 | 0 | 5 |
| `/apply/calendar` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 3 | 1 | 0 | 0 |
| `/apply/checklist` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 4 | 0 | 0 | 0 |
| `/apply/dependent/[familyMemberId]` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 5 | 5 | 0 | 2 |
| `/apply/family` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 14 | 3 | 0 | 3 |
| `/apply/investment` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 18 | 6 | 0 | 5 |
| `/apply/module1` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 13 | 5 | 0 | 2 |
| `/apply/module2` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 20 | 2 | 0 | 1 |
| `/apply/module3/a` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 7 | 10 | 0 | 2 |
| `/apply/module3/b` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 9 | 0 | 0 | 0 |
| `/apply/module3/c` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 10 | 0 | 0 | 0 |
| `/apply/module3/d` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 7 | 2 | 0 | 1 |
| `/apply/module3/e` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 8 | 10 | 0 | 2 |
| `/apply/module3/f` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 6 | 10 | 0 | 2 |
| `/apply/module3/g` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/apply/module3/h` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/apply/module3/i` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 6 | 10 | 0 | 2 |
| `/apply/module3/j` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 8 | 3 | 0 | 0 |
| `/apply/module3/k` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 6 | 10 | 0 | 2 |
| `/apply/module3/l` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/apply/module3` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 3 | 0 | 0 | 0 |
| `/apply/module4` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 8 | 2 | 0 | 4 |
| `/apply/overview` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/apply` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/apply/partner2` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 1 | 2 | 0 | 2 |
| `/apply/qualifications` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 15 | 3 | 0 | 4 |
| `/apply/security/[personId]` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 6 | 5 | 0 | 2 |
| `/apply/story` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 20 | 7 | 0 | 4 |
| `/apply/ties` | paid | yes | useApplicationGate | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 17 | 4 | 0 | 4 |
| `/apply/upload/gaps` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 1 | 0 | 0 | 1 |
| `/apply/upload` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 5 | 3 | 2 | 0 | 1 |
| `/apply/upload/processing` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 1 | 0 | 0 | 1 |
| `/apply/upload/review` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 1 | 3 | 0 | 1 |
| `/case-profile` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 19 | 60 | 21 | 0 | 19 |
| `/dashboard` | auth | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/documents/[applicationId]` | auth | yes | auth.getSession | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 16 | 3 | 0 | 12 |
| `/documents/debug-error` | auth | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/documents` | auth | **NO** | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/early-access` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 4 | 6 | 1 | 2 |
| `/fdd/compare` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 3 | 0 | 0 | 2 |
| `/fdd` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 6 | 0 | 0 | 0 |
| `/fdd/questions/[fddId]` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 7 | 0 | 0 | 1 |
| `/fdd/report/[fddId]` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 15 | 0 | 0 | 3 |
| `/fdd/review/[fddId]` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 2 | 0 | 0 | 0 |
| `/fdd/score/[fddId]` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 8 | 2 | 0 | 1 |
| `/fdd/territory/[fddId]` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 4 | 0 | 0 | 1 |
| `/fdd/upload` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 7 | 4 | 0 | 2 |
| `/forgot-password` | public | — | auth.resetPasswordForEmail | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 1 | 1 | 0 | 0 |
| `/franchise/brand/[slug]` | auth | **NO** | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 0 | 0 | 0 | 1 |
| `/franchise/connect` | auth | **NO** | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 2 | 0 | 0 | 1 |
| `/franchise/discover` | auth | **NO** | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 12 | 0 | 0 | 1 |
| `/franchise/matches` | auth | **NO** | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 3 | 0 | 0 | 1 |
| `/franchise` | auth | **NO** | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 2 | 0 | 0 | 0 |
| `/gap-analysis` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 11 | 11 | 4 | 0 | 5 |
| `/generate/[applicationId]` | auth | yes | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 20 | 3 | 0 | 11 |
| `/learn/e2-visa-business-types` | public | — | — | yes | What Businesses Qualify for an E-2 Visa? | 4 | 0 | 0 | 0 | 0 |
| `/learn/e2-visa-canada` | public | — | — | yes | The E-2 Visa for Canadian Citizens | 4 | 0 | 0 | 0 | 0 |
| `/learn/e2-visa-denial-reasons` | public | — | — | yes | Why E-2 Visa Applications Get Denied | 4 | 0 | 0 | 0 | 0 |
| `/learn/how-much-to-invest-e2` | public | — | — | yes | How Much Do You Need to Invest for an E-2 Visa | 4 | 0 | 0 | 0 | 0 |
| `/learn` | public | — | — | yes | Learn About the E-2 Visa — Articles & Answers | 4 | 2 | 1 | 0 | 1 |
| `/learn/toronto-consulate-e2` | public | — | — | yes | The E-2 Visa Interview at Toronto Consulate | 4 | 0 | 0 | 0 | 0 |
| `/learn/what-is-e2-visa` | public | — | — | yes | What is the E-2 Treaty Investor Visa? | 4 | 0 | 0 | 0 | 0 |
| `/login` | auth-page | yes | auth.signOut, auth.getSession, auth.setSession | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 5 | 0 | 3 | 1 | 2 |
| `/market-analysis` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 4 | 4 | 1 | 3 |
| `/modules` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/onboarding` | paid | yes | useApplicationGate, auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 9 | 34 | 13 | 0 | 7 |
| `/` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 15 | 6 | 1 | 0 | 1 |
| `/partner-access` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 5 | 1 | 0 | 0 | 1 |
| `/pricing` | public | — | auth.getUser | no | E2go.app Pricing — E-2 Visa Application Packag | 6 | 5 | 1 | 0 | 3 |
| `/pricing/success` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 3 | 0 | 0 | 1 |
| `/privacy` | public | — | — | no | Privacy Policy | 3 | 0 | 0 | 0 | 0 |
| `/quiz` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 11 | 4 | 0 | 2 |
| `/quiz/profile` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 3 | 0 | 0 | 1 |
| `/quiz/review` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 3 | 0 | 0 | 0 |
| `/renewal/documents` | auth | **NO** | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 7 | 0 | 0 | 2 |
| `/renewal/intake` | auth | **NO** | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 3 | 2 | 0 | 3 |
| `/renewal` | auth | **NO** | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 3 | 0 | 0 | 2 |
| `/reset-password` | public | — | auth.getUser, auth.updateUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 6 | 1 | 2 | 1 | 0 |
| `/results` | public | — | auth.getUser | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 12 | 17 | 8 | 2 | 6 |
| `/retention/confirm-hold` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 1 | 0 | 0 | 1 |
| `/score` | auth | yes | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 0 | 0 | 0 | 0 |
| `/settings` | auth | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 7 | 1 | 0 | 1 |
| `/signup` | auth-page | yes | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 8 | 1 | 8 | 1 | 2 |
| `/simulator/case-file` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 3 | 0 | 0 | 2 |
| `/simulator/interview-day` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 3 | 0 | 0 | 0 |
| `/simulator/outcome` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 0 | 5 | 3 | 1 | 1 |
| `/simulator` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 7 | 40 | 3 | 0 | 11 |
| `/simulator/prep-kit` | paid | yes | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 5 | 0 | 0 | 2 |
| `/simulator/quick-start` | paid | yes | auth.getUser | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 2 | 7 | 5 | 0 | 3 |
| `/support` | public | — | — | yes | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 3 | 1 | 3 | 1 | 1 |
| `/terms-required` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 4 | 1 | 1 | 0 | 1 |
| `/terms` | public | — | — | no | Terms of Service | 3 | 0 | 0 | 0 | 0 |
| `/unsubscribe` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 1 | 0 | 0 | 1 |
| `/verify` | public | — | — | no | E2go.app — U.S. E-2 Treaty Investor Visa Prepa | 1 | 1 | 0 | 0 | 1 |

## 3. Static findings (triage list — each needs a human look)

### 3.1 Gate declared in `AUTH_ROUTES`/`PAID_ROUTES` but bypassed by `isExistingGatedPath` (9)

The middleware returns early for any path not listed in `isExistingGatedPath`, so the guard below never runs for these. Verify live: each must self-protect or be intentionally open.

- `/documents` — class **auth**, page-level auth signal: auth.getUser
- `/franchise/brand/[slug]` — class **auth**, page-level auth signal: none found
- `/franchise/connect` — class **auth**, page-level auth signal: auth.getUser
- `/franchise/discover` — class **auth**, page-level auth signal: auth.getUser
- `/franchise/matches` — class **auth**, page-level auth signal: auth.getUser
- `/franchise` — class **auth**, page-level auth signal: auth.getUser
- `/renewal/documents` — class **auth**, page-level auth signal: none found
- `/renewal/intake` — class **auth**, page-level auth signal: none found
- `/renewal` — class **auth**, page-level auth signal: auth.getUser

### 3.2 Internal path literals that resolve to no route (possible dead links) (11)

- `/api/gap-analysis` ×1 — src/app/admin/quality/page.tsx:118
- `/fdd/{…}/score` ×1 — src/app/fdd/compare/page.tsx:196
- `/apply/business-plan` ×2 — src/components/PackageSummary.tsx:110, src/components/PackageSummary.tsx:134
- `/apply/funds` ×1 — src/components/PackageSummary.tsx:118
- `/lib/case-intelligence-core` ×1 — src/lib/case-intelligence-core.ts:661
- `/lib/cic-consistency-sweep` ×1 — src/lib/cic-consistency-sweep.ts:220
- `/lib/cic-verifier` ×1 — src/lib/cic-verifier.ts:298
- `/lib/document-comprehension-engine` ×1 — src/lib/document-comprehension-engine.ts:164
- `/generate` ×1 — src/lib/field-registry.ts:77
- `/api/quiz/submit` ×3 — src/middleware.ts:267, src/middleware.ts:301, src/middleware.ts:626
- `/api/auth` ×1 — src/middleware.ts:332

### 3.3 `fetch()` targets that resolve to no API route (0)

_None._

### 3.4 Literal dead hrefs (`#`, empty, `javascript:`) (0)

_None._

### 3.5 `target="_blank"` without `rel="noopener"` (2)

- `/onboarding` src/app/onboarding/page.tsx:442 → /terms
- `/onboarding` src/app/onboarding/page.tsx:448 → /privacy

### 3.6 Links with no text and no `aria-label` (3)

- `/case-profile` src/components/CaseProfilePageClassic.tsx:2076 → {m.href}
- `/onboarding` src/app/onboarding/page.tsx:557 → /apply/security/{…}
- `/onboarding` src/app/onboarding/page.tsx:630 → {cardHref(id)}

### 3.7 Buttons with no text and no `aria-label` (26)

- `/admin/system-status` src/app/admin/system-status/page.tsx:125
- `/admin/system-status` src/app/admin/system-status/page.tsx:132
- `/apply/business` src/app/apply/business/page.tsx:342
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/QuestionSetRunner.tsx:104
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/QuestionSetRunner.tsx:117
- `/apply/family` src/app/apply/family/page.tsx:241
- `/apply/family` src/app/apply/family/page.tsx:254
- `/apply/investment` src/app/apply/investment/page.tsx:336
- `/apply/investment` src/app/apply/investment/page.tsx:349
- `/apply/investment` src/app/apply/investment/page.tsx:605
- `/apply/investment` src/app/apply/investment/page.tsx:606
- `/apply/investment` src/app/apply/investment/page.tsx:656
- `/apply/qualifications` src/app/apply/qualifications/page.tsx:306
- `/apply/qualifications` src/app/apply/qualifications/page.tsx:319
- `/apply/security/[personId]` src/components/apply/questions/QuestionSetRunner.tsx:104
- `/apply/security/[personId]` src/components/apply/questions/QuestionSetRunner.tsx:117
- `/apply/story` src/app/apply/story/page.tsx:391
- `/apply/story` src/app/apply/story/page.tsx:452
- `/apply/story` src/app/apply/story/page.tsx:485
- `/apply/story` src/app/apply/story/page.tsx:490
- `/apply/story` src/app/apply/story/page.tsx:515
- `/apply/ties` src/app/apply/ties/page.tsx:262
- `/apply/ties` src/app/apply/ties/page.tsx:275
- `/renewal/documents` src/app/renewal/documents/page.tsx:284
- `/renewal/documents` src/app/renewal/documents/page.tsx:285
- `/simulator` src/app/simulator/page.tsx:1257

### 3.8 Click handlers on non-interactive elements (missing role/tabIndex/keyboard) (20)

- `/apply/business` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/apply/family` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/apply/investment` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/apply/qualifications` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/apply/story` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/apply/ties` src/components/apply/CaseFileShell.tsx:515 <div> ""
- `/case-profile` src/components/casefile/CardGrid.tsx:120 <CardTile> ""
- `/case-profile` src/components/casefile/CardDrawer.tsx:95 <div> "{CARD_CATEGORY_LABELS[def.category]} {def.label} × {showPersonTabs && ( <div style={{ di} "
- `/documents/[applicationId]` src/app/documents/[applicationId]/page.tsx:925 <div> "{docLabel(modal.document)} {docTab(modal.document)} {modal.document.page_estimate && ( <s}"
- `/documents/[applicationId]` src/app/documents/[applicationId]/page.tsx:929 <div> "{docLabel(modal.document)} {docTab(modal.document)} {modal.document.page_estimate && ( <s}"
- `/fdd/report/[fddId]` src/app/fdd/report/[fddId]/page.tsx:718 <div> "{state === 'confirm' && ( <> <p class} {state === 'loading' && ( <div classN} {state === '"
- `/fdd/score/[fddId]` src/components/fdd/ProfileMatchPanel.tsx:221 <div> "You have {dim.investor_value} Required {dim.requirement} {dim.gap && ( <div className="bg-"
- `/gap-analysis` src/components/gap-analysis/RemediationPanel.tsx:143 <div> "{total > 0 && ( <div style={{ marginB} {total > 0 && ( <div style={{ display} DONE WHEN: {"
- `/gap-analysis` src/components/gap-analysis/RemediationPanel.tsx:316 <div> "{field.label} {field.inputType === 'select' ? ( <se}"
- `/gap-analysis` src/components/gap-analysis/RemediationPanel.tsx:366 <div> "{uploading ? '…' : '↑'} {uploading ? `Uploading ${doc.label}…} PDF or DOCX"
- `/generate/[applicationId]` src/components/NpsModal.tsx:77 <div> "{submitted ? ( <div className="text-c}"
- `/` src/components/landing/FaqWidgetHome.tsx:182 <div> "Ask E2go.app Free · instant answer Ask E2go.app Free · instant {teaserText || "Ask anythin"
- `/results` src/components/results/FlagCard.tsx:295 <div> "What to add {remediation.heading} {remediation.question} {addressed ? '✓ Sufficient detail"
- `/simulator` src/app/simulator/page.tsx:1468 <div> "Correction note Clarify what you meant or note what you&apos;ll say differently. This is s"
- `/simulator/quick-start` src/app/simulator/quick-start/page.tsx:630 <DropZone> "{files.length > 0 && ( <div style={{ }"

### 3.9 Images without `alt` (0)

_None._

### 3.10 Form controls with no `id` / `aria-label` / `aria-labelledby` (189)

- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:93 type=text placeholder="E.g. WELCOME25"
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:105 type=select placeholder=""
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:117 type=select placeholder=""
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:131 type=email placeholder="recipient@example.com"
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:146 type=number placeholder="Blank = unlimited"
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:159 type=date placeholder=""
- `/admin/promo-codes` src/app/admin/promo-codes/PromoCodeForm.tsx:169 type=text placeholder="E.g. Facebook group launch"
- `/admin/users/[userId]` src/app/admin/users/[userId]/TierOverridePanel.tsx:62 type=select placeholder=""
- `/admin/users/[userId]` src/app/admin/users/[userId]/TierOverridePanel.tsx:74 type=text placeholder="Reason for override..."
- `/admin/users/[userId]` src/app/admin/users/[userId]/SendEmailPanel.tsx:50 type=text placeholder="Subject"
- `/admin/users/[userId]` src/app/admin/users/[userId]/SendEmailPanel.tsx:57 type=textarea placeholder="Message body..."
- `/admin/users/[userId]` src/app/admin/users/[userId]/FlagUserPanel.tsx:70 type=text placeholder="Reason (e.g. suspected abuse, duplicate "
- `/apply/business` src/app/apply/business/page.tsx:357 type=TextArea placeholder=""
- `/apply/business` src/components/apply/questions/TextInput.tsx:20 type=text placeholder="{placeholder}"
- `/apply/business` src/components/apply/questions/TextArea.tsx:135 type=textarea placeholder="{placeholder}"
- `/apply/business` src/components/apply/questions/StartupCostTable.tsx:103 type=text placeholder=""
- `/apply/business` src/components/apply/questions/StartupCostTable.tsx:176 type=text placeholder="Category"
- `/apply/business` src/components/apply/questions/StartupCostTable.tsx:192 type=text placeholder="Description"
- `/apply/business` src/components/apply/questions/StartupCostTable.tsx:207 type=text placeholder="0"
- `/apply/calendar` src/app/apply/calendar/page.tsx:352 type=date placeholder=""
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/QuestionSetRunner.tsx:137 type=TextArea placeholder=""
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/TextInput.tsx:20 type=text placeholder="{placeholder}"
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/TextArea.tsx:135 type=textarea placeholder="{placeholder}"
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/PhoneInput.tsx:34 type=tel placeholder="{placeholder ?? '+1 415 555 0100'}"
- `/apply/dependent/[familyMemberId]` src/components/apply/questions/DateInput.tsx:27 type=date placeholder=""
- `/apply/family` src/app/apply/family/page.tsx:274 type=TextArea placeholder=""
- `/apply/family` src/components/apply/questions/TextInput.tsx:20 type=text placeholder="{placeholder}"
- `/apply/family` src/components/apply/questions/TextArea.tsx:135 type=textarea placeholder="{placeholder}"
- `/apply/investment` src/app/apply/investment/page.tsx:375 type=TextArea placeholder=""
- `/apply/investment` src/components/apply/questions/TextInput.tsx:20 type=text placeholder="{placeholder}"
- `/apply/investment` src/components/apply/questions/TextArea.tsx:135 type=textarea placeholder="{placeholder}"
- `/apply/investment` src/components/apply/questions/CurrencyInput.tsx:49 type=text placeholder="{placeholder || '0'}"
- `/apply/investment` src/components/apply/questions/ProjectionTable.tsx:89 type=text placeholder="{field === 'employees' ? '0' : '0'}"
- `/apply/investment` src/components/apply/questions/ProjectionTable.tsx:138 type=text placeholder="{field === 'employees' ? '0' : '0'}"
- `/apply/module1` src/app/apply/module1/page.tsx:345 type=text placeholder="Enter partner's legal name"
- `/apply/module1` src/app/apply/module1/page.tsx:357 type=email placeholder="partner@example.com"
- `/apply/module2` src/app/apply/module2/page.tsx:365 type=text placeholder="e.g., A specialty coffee shop in Austin,"
- `/apply/module3/a` src/components/module3/FormField.tsx:54 type=text placeholder="{field.placeholder}"
- `/apply/module3/a` src/components/module3/FormField.tsx:81 type=textarea placeholder="{field.placeholder}"
- `/apply/module3/a` src/components/module3/FormField.tsx:108 type=select placeholder=""
- `/apply/module3/a` src/components/module3/FormField.tsx:178 type=date placeholder=""
- `/apply/module3/a` src/components/module3/FormField.tsx:205 type=date placeholder=""
- `/apply/module3/a` src/components/module3/FormField.tsx:230 type=date placeholder=""
- `/apply/module3/a` src/components/module3/FormField.tsx:262 type=number placeholder="0.00"
- `/apply/module3/a` src/components/module3/FormField.tsx:291 type=number placeholder="0"
- `/apply/module3/a` src/components/module3/FormField.tsx:320 type=text placeholder=""
- `/apply/module3/d` src/app/apply/module3/d/page.tsx:749 type=textarea placeholder="{currentQuestion.hasNAOption && !hasComp"
- `/apply/module3/e` src/components/module3/FormField.tsx:54 type=text placeholder="{field.placeholder}"
- `/apply/module3/e` src/components/module3/FormField.tsx:81 type=textarea placeholder="{field.placeholder}"
- `/apply/module3/e` src/components/module3/FormField.tsx:108 type=select placeholder=""
- `/apply/module3/e` src/components/module3/FormField.tsx:178 type=date placeholder=""
- `/apply/module3/e` src/components/module3/FormField.tsx:205 type=date placeholder=""
- `/apply/module3/e` src/components/module3/FormField.tsx:230 type=date placeholder=""
- `/apply/module3/e` src/components/module3/FormField.tsx:262 type=number placeholder="0.00"
- `/apply/module3/e` src/components/module3/FormField.tsx:291 type=number placeholder="0"
- `/apply/module3/e` src/components/module3/FormField.tsx:320 type=text placeholder=""
- `/apply/module3/f` src/components/module3/FormField.tsx:54 type=text placeholder="{field.placeholder}"
- `/apply/module3/f` src/components/module3/FormField.tsx:81 type=textarea placeholder="{field.placeholder}"
- `/apply/module3/f` src/components/module3/FormField.tsx:108 type=select placeholder=""
- `/apply/module3/f` src/components/module3/FormField.tsx:178 type=date placeholder=""
- … 129 more (see inventory.json)

### 3.11 Native `alert` / `confirm` / `prompt` (block browser automation, poor UX) (3)

- `/case-profile` src/components/CaseProfilePageClassic.tsx:556 confirm()
- `/documents/[applicationId]` src/app/documents/[applicationId]/page.tsx:223 alert()
- `/documents/[applicationId]` src/app/documents/[applicationId]/page.tsx:259 alert()

### 3.12 `dangerouslySetInnerHTML` (XSS review targets) (1)

- `/apply/module3/d` src/app/apply/module3/d/page.tsx:537

### 3.13 Brand-casing violations in string literals / JSX text (3)

Rule: user-facing brand is always `E2go.app`. Bare lowercase `e2go` in prose is also flagged; URLs, emails and keys are excluded by the matcher.

- src/app/api/renewal/generate/route.ts:79 — "E-2 RENEWAL CHECKLIST — PATH B (USCIS I-129) FORMS ☐ Form I-129 (Petition for No"
- src/app/terms/TermsClient.tsx:258 — "TO THE MAXIMUM EXTENT PERMITTED BY LAW, E2GO.APP SHALL NOT BE LIABLE FOR ANY IND"
- src/app/terms/TermsClient.tsx:261 — "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE PL"

### 3.14 Placeholder text (TODO / FIXME / TBD / lorem / coming soon) (6)

- src/app/admin/coming-soon-interest/page.tsx:63 — "Coming Soon Interest"
- src/app/apply/calendar/page.tsx:476 — "TBD"
- src/app/apply/module1/page.tsx:327 — "Coming Soon"
- src/app/renewal/RenewalEntryClient.tsx:144 — "Coming Soon"
- src/components/CaseProfilePageClassic.tsx:2370 — "Coming Soon"
- src/components/casefile/CaseProfileNew.tsx:143 — "Coming Soon"

### 3.15 Pages with no `<title>` metadata anywhere in their layout chain (0)

_None._

## 4. Route handler table

`calledFromUI` = a path literal or `fetch()` in `src/` references the route. Auth flags are text heuristics (import / call present), not proof — the live test verifies behaviour.

| Route | Methods | User auth | Admin | Cron secret | Webhook sig | Rate limit | Kill switch | Service role | Turnstile | Called from UI |
|---|---|---|---|---|---|---|---|---|---|---|
| `/api/_sentry-tunnel` | POST | · | · | · | · | · | · | · | · | y |
| `/api/account/delete` | POST | y | · | · | · | · | · | y | · | y |
| `/api/account/export` | GET | y | · | · | · | · | · | y | · | y |
| `/api/account/restore` | POST | y | · | · | · | · | · | y | · | y |
| `/api/admin/cost-summary` | GET | y | y | · | · | · | · | y | · | · |
| `/api/admin/flag-user` | POST | y | y | · | · | · | · | y | · | y |
| `/api/admin/health-detail` | GET | y | y | · | · | · | y | y | · | y |
| `/api/admin/promo-codes/[id]` | PATCH | y | y | · | · | · | · | y | · | y |
| `/api/admin/promo-codes` | GET POST | y | y | · | · | · | · | y | · | y |
| `/api/admin/send-email` | POST | y | y | · | · | · | · | y | · | y |
| `/api/admin/settings` | GET POST | y | y | · | · | · | · | y | · | y |
| `/api/admin/stuck-jobs` | POST | y | y | · | · | · | · | y | · | y |
| `/api/admin/tier-override` | POST | y | y | · | · | · | · | y | · | y |
| `/api/ai` | POST | y | · | · | · | y | · | · | · | y |
| `/api/analysis/run` | POST | y | · | · | · | · | · | y | · | y |
| `/api/answers` | POST | y | · | · | · | · | · | · | · | y |
| `/api/applications/[applicationId]` | GET | y | · | · | · | · | · | · | · | y |
| `/api/apply/parse-document` | POST | y | · | · | · | y | y | · | · | y |
| `/api/apply/section-completion` | GET | y | · | · | · | · | · | · | · | y |
| `/api/auth/accept-terms` | POST | y | · | · | · | · | · | y | · | y |
| `/api/auth/login` | POST | y | · | · | · | y | · | · | y | y |
| `/api/auth/set-session` | POST | y | · | · | · | · | · | · | · | · |
| `/api/auth/signup` | POST | y | · | · | · | y | · | · | y | y |
| `/api/case-file/field-quality` | POST | y | · | · | · | · | y | · | · | y |
| `/api/case-profile/build` | GET POST | y | · | · | · | · | · | · | · | y |
| `/api/case/completion` | GET | y | · | · | · | · | · | · | · | y |
| `/api/checkout/initiate` | POST | y | · | · | · | · | · | y | · | y |
| `/api/coming-soon-interest` | POST | y | · | · | · | · | · | y | · | y |
| `/api/consent/log` | POST | y | · | · | · | · | · | · | · | y |
| `/api/cron/data-retention` | GET | · | · | y | · | · | · | y | · | · |
| `/api/cron/generation-resume` | GET | · | · | y | · | · | · | y | · | · |
| `/api/cron/health-watchdog` | GET | · | · | y | · | · | y | y | · | · |
| `/api/cron/payment-reconciliation` | GET | · | · | y | · | · | · | y | · | · |
| `/api/cron/quiz-nurture` | GET | · | · | y | · | · | · | · | · | · |
| `/api/cron/rebuild-profiles` | GET | · | · | y | · | · | · | y | · | · |
| `/api/dashboard/case-profile` | GET | y | · | · | · | · | · | · | · | y |
| `/api/dashboard/certify-document` | POST | y | · | · | · | · | · | y | · | y |
| `/api/dashboard/change-impact` | GET DELETE | y | · | · | · | · | · | y | · | y |
| `/api/dashboard/consistency-sweep` | GET | y | · | · | · | · | · | y | · | · |
| `/api/dashboard/outcome` | POST GET | y | · | · | · | · | · | y | · | · |
| `/api/dashboard/package-manifest` | GET | y | · | · | · | · | · | y | · | y |
| `/api/dashboard/request-regeneration` | POST | y | · | · | · | · | · | y | · | y |
| `/api/documents/[documentId]/download` | GET | y | · | · | · | · | · | · | · | · |
| `/api/documents/[documentId]` | GET DELETE | y | · | · | · | · | · | · | · | y |
| `/api/documents/extract` | POST | y | · | · | · | y | · | y | · | · |
| `/api/documents/gap-report` | GET | y | · | · | · | · | · | · | · | y |
| `/api/documents/resolve-discrepancy` | POST | y | · | · | · | · | · | · | · | · |
| `/api/documents` | POST GET | y | · | · | · | y | y | y | · | y |
| `/api/early-access` | OPTIONS POST | · | · | · | · | y | · | y | · | y |
| `/api/email/resend-results` | POST | · | · | · | · | y | · | y | · | y |
| `/api/email/results` | POST | y | · | · | · | · | · | y | · | y |
| `/api/email/schedule` | GET POST | y | y | y | · | · | · | y | · | · |
| `/api/email/unsubscribe` | POST | · | · | · | · | · | · | y | · | y |
| `/api/faq/ask` | POST | · | · | · | · | y | y | y | · | y |
| `/api/fdd/compare` | POST | y | · | · | · | y | · | y | · | y |
| `/api/fdd/extract` | POST | y | · | · | · | y | y | y | · | y |
| `/api/fdd/questions` | POST | y | · | · | · | · | · | y | · | y |
| `/api/fdd/report/pdf` | GET | y | · | · | · | · | · | y | · | y |
| `/api/fdd/report` | POST | y | · | · | · | y | · | y | · | y |
| `/api/fdd/score` | POST | y | · | · | · | y | y | y | · | y |
| `/api/fdd/territory` | POST | y | · | · | · | y | · | y | · | y |
| `/api/fdd/upload` | POST | y | · | · | · | · | · | y | · | y |
| `/api/fdd/writeback` | POST | y | · | · | · | · | · | y | · | y |
| `/api/followup/completion-summary` | POST | y | · | · | · | · | · | y | · | y |
| `/api/followup/generate-questions` | POST | y | · | · | · | · | · | y | · | y |
| `/api/followup/save-response` | POST | y | · | · | · | · | · | y | · | y |
| `/api/followup/save-voice-sample` | POST | y | · | · | · | · | · | y | · | y |
| `/api/franchise/brand-view` | POST | y | · | · | · | · | · | y | · | y |
| `/api/franchise/broker-request` | POST | y | · | · | · | · | · | y | · | y |
| `/api/franchise/matches` | GET | y | · | · | · | · | · | · | · | · |
| `/api/gap-analysis/enrich` | POST | y | · | · | · | · | y | · | · | · |
| `/api/gap-analysis/run` | POST | y | · | · | · | y | y | y | · | y |
| `/api/gap-analysis/semantic-eval` | POST | y | · | · | · | y | y | y | · | · |
| `/api/generate/acknowledge` | POST | y | · | · | · | · | · | y | · | y |
| `/api/generate/case-brief/[applicationId]` | GET | y | · | · | · | · | · | y | · | y |
| `/api/generate/confirm` | POST | y | · | · | · | · | · | y | · | y |
| `/api/generate/documents/[applicationId]` | GET POST PATCH | y | · | · | · | · | · | y | · | y |
| `/api/generate/download/[applicationId]` | GET | y | · | · | · | · | · | · | · | y |
| `/api/generate/progress/[jobId]` | GET | y | · | · | · | · | · | y | · | y |
| `/api/generate/revise/[applicationId]` | POST | y | · | · | · | · | · | y | · | · |
| `/api/generate/run/[jobId]` | POST | y | · | · | · | y | · | y | · | y |
| `/api/generate/start` | POST | y | · | · | · | y | y | y | · | y |
| `/api/generate/validate/[applicationId]` | GET | y | · | · | · | · | · | y | · | y |
| `/api/health` | GET | · | · | · | · | · | · | y | · | y |
| `/api/market-analysis/pdf` | GET POST | y | · | · | · | · | · | · | · | y |
| `/api/market-analysis` | GET POST | y | · | · | · | y | · | · | · | y |
| `/api/notifications/franchise-referral` | POST | y | · | · | · | y | · | · | · | · |
| `/api/nps/submit` | POST | y | · | · | · | · | · | y | · | y |
| `/api/partner/accept` | POST | y | · | · | · | · | · | y | · | y |
| `/api/partner/invite` | POST | y | · | · | · | · | · | y | · | y |
| `/api/partner2/intake` | GET PATCH | y | · | · | · | · | · | y | · | y |
| `/api/profile/family-members/[id]` | PATCH DELETE | y | · | · | · | · | · | · | · | y |
| `/api/profile/family-members` | GET POST | y | · | · | · | · | · | · | · | y |
| `/api/profile/name` | PATCH | y | · | · | · | · | · | y | · | y |
| `/api/profile/outcomes-consent` | POST GET | y | · | · | · | · | · | y | · | y |
| `/api/profile/rebuild` | POST | y | · | · | · | · | · | · | · | y |
| `/api/promo/validate` | POST | y | · | · | · | y | · | y | · | y |
| `/api/quiz/personalized-flags` | POST | · | · | · | · | y | y | · | · | y |
| `/api/renewal/baseline` | GET | y | · | · | · | · | · | y | · | y |
| `/api/renewal/generate` | POST | y | · | · | · | y | y | y | · | y |
| `/api/renewal/intake` | GET PATCH | y | · | · | · | · | · | y | · | y |
| `/api/retention/confirm-hold` | POST | · | · | · | · | · | · | y | · | y |
| `/api/simulator/case-gaps` | GET POST | y | · | · | · | · | · | · | · | · |
| `/api/simulator/case-summary` | GET | y | · | · | · | · | · | · | · | y |
| `/api/simulator/coaching-report` | POST | y | · | · | · | y | y | · | · | y |
| `/api/simulator/evaluate` | POST | y | · | · | · | y | y | · | · | y |
| `/api/simulator/follow-up` | POST | y | · | · | · | · | y | · | · | y |
| `/api/simulator/interview-prep` | GET | y | · | · | · | · | y | · | · | y |
| `/api/simulator/outcome` | POST GET | y | · | · | · | · | · | · | · | y |
| `/api/simulator/prep-kit/pdf` | GET | y | · | · | · | · | · | · | · | y |
| `/api/simulator/prep-kit` | POST GET | y | · | · | · | · | y | y | · | y |
| `/api/simulator/quick-start` | POST | y | · | · | · | · | · | · | · | y |
| `/api/simulator/save-extraction` | POST | y | · | · | · | · | · | · | · | · |
| `/api/simulator/section-nudge` | GET | y | · | · | · | · | · | · | · | y |
| `/api/simulator/transcribe` | POST | y | · | · | · | y | · | · | · | y |
| `/api/simulator/tts` | POST | y | · | · | · | y | · | · | · | y |
| `/api/simulator/voice-status` | GET | y | · | · | · | · | · | · | · | y |
| `/api/stripe/checkout` | HEAD GET | · | · | · | · | · | · | · | · | y |
| `/api/stripe/create-checkout` | POST | y | · | · | · | · | · | y | · | y |
| `/api/stripe/grant-simulator-sessions` | POST | y | · | · | · | · | · | y | · | y |
| `/api/stripe/verify-payment` | POST | y | · | · | · | · | · | y | · | y |
| `/api/stripe/webhook` | POST | · | · | · | y | · | · | y | · | · |
| `/api/support/submit` | POST | y | · | · | · | · | · | y | · | y |
| `/api/track/session` | POST | y | · | · | · | · | · | y | · | y |
| `/api/uploaded-documents/[id]` | DELETE | y | · | · | · | · | · | · | · | y |
| `/auth/callback` | GET | · | · | · | · | · | · | y | · | · |
| `/dev/email-preview/[template]` | GET | · | · | · | · | · | · | · | · | · |

Handlers with no auth-like signal (11): `/api/_sentry-tunnel`, `/api/early-access`, `/api/email/resend-results`, `/api/email/unsubscribe`, `/api/faq/ask`, `/api/health`, `/api/quiz/personalized-flags`, `/api/retention/confirm-hold`, `/api/stripe/checkout`, `/auth/callback`, `/dev/email-preview/[template]`

## 5. Shells (layouts) — elements present on every page beneath them

### `src/app/layout.tsx`

Files: `layout.tsx`, `ServiceWorkerRegistration.tsx`, `CookieBanner.tsx`, `PageTransition.tsx`

- link `#main-content` "Skip to main content" (src/app/layout.tsx:75)
- link `/privacy` "Learn more" (src/components/CookieBanner.tsx:76)
- button "Reject" onClick=`{handleReject}` (src/components/CookieBanner.tsx:49)
- button "Accept" onClick=`{handleAccept}` (src/components/CookieBanner.tsx:63)

### `src/app/about/layout.tsx`

Files: `layout.tsx`, `Nav.tsx`, `OutcomesConsentBanner.tsx`

- link `{user ? "/case-profile" : "/"}` "E2go .app E-2 Visa Prep, Simplified." (src/components/Nav.tsx:154)
- link `{href}` "{label}" (src/components/Nav.tsx:172)
- link `/login` "Log in" (src/components/Nav.tsx:181)
- link `/quiz` "Check eligibility" (src/components/Nav.tsx:188)
- link `/case-profile` "Case File" (src/components/Nav.tsx:214)
- link `/gap-analysis` "Gap Analysis" (src/components/Nav.tsx:215)
- link `/apply/checklist` "Checklist" (src/components/Nav.tsx:216)
- link `/fdd` "FDD Analysis" (src/components/Nav.tsx:236)
- link `/market-analysis` "Market Analysis" (src/components/Nav.tsx:237)
- link `/franchise` "Franchise Navigator" (src/components/Nav.tsx:239)
- link `{docsHref}` "Documents" (src/components/Nav.tsx:249)
- link `/simulator` "Simulator" (src/components/Nav.tsx:258)
- link `/case-profile` "My Case Profile" (src/components/Nav.tsx:280)
- link `/settings` "Settings" (src/components/Nav.tsx:286)
- link `{href}` "{label}" (src/components/Nav.tsx:314)
- link `/login` "Log in" (src/components/Nav.tsx:316)
- link `/quiz` "Check eligibility" (src/components/Nav.tsx:317)
- link `/case-profile` "Case File" (src/components/Nav.tsx:327)
- link `/gap-analysis` "Gap Analysis" (src/components/Nav.tsx:328)
- link `/apply/checklist` "Checklist" (src/components/Nav.tsx:329)
- link `/fdd` "FDD Analysis" (src/components/Nav.tsx:337)
- link `/market-analysis` "Market Analysis" (src/components/Nav.tsx:338)
- link `/franchise` "Franchise Navigator" (src/components/Nav.tsx:340)
- link `{docsHref}` "Documents" (src/components/Nav.tsx:345)
- link `/simulator` "Simulator" (src/components/Nav.tsx:346)
- link `/case-profile` "My Case Profile" (src/components/Nav.tsx:351)
- link `/settings` "Settings" (src/components/Nav.tsx:353)
- button "Application {chevron(appOpen)}" onClick=`{() => { setAppOpen(v => !v); setIntelOpen(false);` (src/components/Nav.tsx:203)
- button "Intelligence {chevron(intelOpen)}" onClick=`{() => { setIntelOpen(v => !v); setAppOpen(false);` (src/components/Nav.tsx:225)
- button "{user?.first_name ?? "Account"} {chevron(accountOpen)}" onClick=`{() => { setAccountOpen(v => !v); setAppOpen(false` (src/components/Nav.tsx:268)
- button "Log out" onClick=`{handleSignOut}` (src/components/Nav.tsx:290)
- button "Toggle mobile menu" onClick=`{() => setMobileMenuOpen(v => !v)}` (src/components/Nav.tsx:301)
- button "Log out" onClick=`{handleSignOut}` (src/components/Nav.tsx:354)
- button "No thanks" onClick=`{() => respond(false)}` (src/components/OutcomesConsentBanner.tsx:61)
- button "Yes, I&apos;m in" onClick=`{() => respond(true)}` (src/components/OutcomesConsentBanner.tsx:76)

### `src/app/apply/layout.tsx`

Files: `layout.tsx`, `SectionLayout.tsx`

- link `{step.href}` "{icon} {!collapsed && ( <div style={{ minWid}" (src/components/SectionLayout.tsx:259)
- link `/dashboard` "← Dashboard" (src/components/SectionLayout.tsx:513)
- button "{heading} {tasks.length} tasks ›" onClick=`{() => setOpen((v) => !v)}` (src/components/SectionLayout.tsx:120)
- button "×" onClick=`{onClose}` (src/components/SectionLayout.tsx:373)
- button "Open journey navigation" onClick=`{() => setMobileOpen(true)}` (src/components/SectionLayout.tsx:426)

### `src/app/simulator/layout.tsx`

Files: `layout.tsx`, `SimulatorNav.tsx`

- link `{section.href}` "{section.label}" (src/components/simulator/SimulatorNav.tsx:111)

### `src/app/apply/(sections)/layout.tsx`

Files: `layout.tsx`

- button "{sidebarOpen ? ( <path strokeLinecap=} Navigation" onClick=`{() => setSidebarOpen(!sidebarOpen)}` (src/app/apply/(sections)/layout.tsx:22)

## 6. Email template link targets

| Template | Line | href |
|---|---|---|
| base-template.ts | 49 | `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=DM+Sans:wght@400;500&display=swap` |
| base-template.ts | 72 | `${appUrl}/privacy` |
| base-template.ts | 75 | `${unsubHref}` |
| base-template.ts | 98 | `${href}` |
| clock1-inactivity.ts | 48 | `${appUrl}/privacy` |
| clock1-inactivity.ts | 51 | `${appUrl}/unsubscribe` |
| clock1-inactivity.ts | 73 | `${href}` |
| clock2-post-outcome.ts | 46 | `${appUrl}/privacy` |
| clock2-post-outcome.ts | 49 | `${appUrl}/unsubscribe` |
| clock2-post-outcome.ts | 71 | `${href}` |
