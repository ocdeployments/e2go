# UAT Gap Register — September 2026 live testing pass

**Opened:** September 18, 2026
**Branch:** `dev` — never commit directly to `main`
**Purpose:** running log of everything found wrong during Romy's live UAT pass, logged
as discovered rather than fixed one-by-one, so fixes can be batched and sequenced
together once the pass is done. Numbering (UAT-01, UAT-02, ...) is independent of
`RELIABILITY_SECURITY_GAPS.md`'s G-numbers and `DELIVERY_RELIABILITY_GAPS.md`'s —
no claimed relationship between the registers beyond "found during the same sweep."

---

## UAT-01 — Quiz page flashed before landing on /results

**Status:** fixed in working tree, **not yet committed**
**File:** `src/app/quiz/page.tsx:203`

`authChecked` state started as `useState(true)` instead of `useState(false)`. The
guard at line ~853 (`if (!authChecked) return <Loading/>`) exists specifically to
hide the quiz question UI until an async effect checks `supabase.auth.getUser()`
and redirects logged-in users with a completed quiz session to `/dashboard`. With
`authChecked` starting `true`, that guard was permanently bypassed, so the quiz UI
painted immediately on every mount — including the moment right after login,
producing the reported flash before the redirect to `/results` landed.

**Fix applied:** changed the initial value to `useState(false)`. The effect's
existing 1000ms `setTimeout` fallback already calls `setAuthChecked(true)`, which
only makes sense as a fallback if the initial value is `false` — confirms this was
the intended behavior, not a deliberate default.

**Verified:** loaded `/quiz` anonymously in-browser post-fix; question UI renders
normally with no hang or regression.

**Next step:** commit once the other UAT-pass fixes are ready to ship together, or
sooner if Romy wants it out ahead of the rest.

---

## UAT-02 — `/documents` and `/generate` are login-gated, not payment-gated

**Status:** documented, not fixed — open design question, not yet actioned
**File:** `src/middleware.ts:343-352` (`AUTH_ROUTES`) vs `:355-363` (`PAID_ROUTES`)

`AUTH_ROUTES` includes `/generate/` and `/documents/` — these only require a logged
-in user, not a paid `applications` row. Every other document/generation-adjacent
route (`/case-profile`, `/apply`, `/fdd`, `/onboarding`, etc.) is in `PAID_ROUTES`
and requires `access.full`/`access.sim`/`access.fdd`.

Today this is only *implicitly* safe: `/documents/[applicationId]/page.tsx` has no
payment check of its own (confirmed — no `payment_status` query, no `auth`/`redirect`
logic beyond what middleware provides), and the only reason an unpaid user can't
reach it is that `applications` rows are created exclusively by the Stripe webhook,
so an unpaid user has no valid `applicationId` to visit. `src/app/documents/page.tsx`
sends users with no `applications` row to `/case-profile` instead, which *is*
payment-gated.

This is a plausible mechanism for Romy's observation that clients seem to reach
document upload before paying — worth explicitly hardening (move `/documents/` and
`/generate/` into `PAID_ROUTES`, or add an explicit ownership+payment check inside
the page) rather than continuing to rely on an absent-row side effect. Still open:
whether this implicit gate is actually what Romy saw, or whether there's a separate
flow that surfaces upload UI pre-payment. Not yet confirmed either way.

---

## UAT-03 — Checkout 503s: "This pricing tier is not yet configured"

**Status:** root-caused, fix blocked on a sandboxed write to Stripe — needs Romy or
a permission change to complete
**File:** `src/app/api/checkout/initiate/route.ts:66-71`

Reported live on `/results`: clicking "Build My Case with E2go.app" on the
Foundation ($990) card returns a 503 with
`"This pricing tier is not yet configured. Please contact support@e2go.app."`

**Root cause:** `PRICE_ENV.foundation` resolves `process.env.STRIPE_PRICE_FOUNDATION`,
which is unset in every Vercel environment (`vercel env ls` confirms it is absent
from Development, Preview, and Production). It's only set correctly in local
`.env.local`. Worse: the Vercel-connected Stripe test account (Preview and
Production use the identical key, confirmed by hash comparison) has **no Foundation
product or price at all** — it still only has the old Solo/Partnership tier catalog.
Local dev's `.env.local` points at a *different* Stripe test account that already
has the new tier. So this isn't a simple missing-env-var fix; the underlying Stripe
object doesn't exist yet where the app is actually deployed.

**Fix required (two steps):**
1. Create a Product ("e2go — Foundation") + Price ($990.00 USD one-time, metadata
   `tier_id: foundation`) in the Vercel-connected Stripe test account, matching the
   shape of the equivalent object in local's account (`price_1UCXKgLXsLouj9LHTD8p8aSi`).
2. Set `STRIPE_PRICE_FOUNDATION=<new price id>` in Vercel Preview + Production
   (same underlying Stripe account, one price ID covers both), then redeploy.

Step 1 is a live write to Stripe's API and is blocked by the coding sandbox's
"Real-World Transactions" classifier regardless of in-chat approval — even
`stripe --version` was blocked once Stripe context was detected. Needs Romy to
either create the product/price by hand in the Stripe test dashboard (then hand
back the price ID for step 2), run the equivalent CLI/curl command themselves, or
add a Bash permission rule allowing it.

Since `VALID_TIERS` in this route is `['foundation']` only, fixing Foundation fully
unblocks this checkout route — no other tiers are reachable through it yet.

**Related but out of scope for this fix:** the old-tier price env vars still set on
Vercel (`STRIPE_PRICE_COMPLETE`, `STRIPE_PRICE_INTERVIEW_PREP`,
`STRIPE_PRICE_FDD_INTELLIGENCE`, etc.) are orphaned — nothing in current code reads
them since `VALID_TIERS` narrowed to `['foundation']`. Not cleaning these up now;
noting so they aren't mistaken for live config later.

**Also found while reproducing this locally:** even with a correctly-configured
`STRIPE_PRICE_FOUNDATION` (local `.env.local` has one), `/api/checkout/initiate`
still 500s locally with a generic `{"error":"Failed to create checkout session"}` —
a different, separate failure from the Vercel one above, root cause not yet
investigated. Worth checking once Vercel's price object exists, in case it's not
purely a missing-config issue.

---

## UAT-04 — Pricing card "what's included" list overflowed off-screen on mobile

**Status:** fixed in working tree, **not yet committed**
**File:** `src/app/results/page.tsx:1210` (and `:1212`, `:1227`)

Reported live: the Foundation pricing card on `/results` "looks all messy" near the
checkout button. Reproduced by loading `/results` as `test-uk@example.com` and
resizing to 375px mobile width.

**Root cause:** the "what's included" block is two explicit columns
(`display: flex, gap: 20px`, two `flex: 1` children) with **no `flexWrap`**, and
each list item's text has `whiteSpace: nowrap`. At narrow viewport widths the two
columns can't fit side by side, and with no wrap and no `minWidth` on the column
children, flexbox's default `min-width: auto` floors each column at its
nowrap-driven min-content width — wider than the space available. The right column
("Gap Analysis — 6 categories", "Page limits enforced", the add-on blurb) overflowed
straight past the card's right border and off the edge of the viewport (confirmed
via `getBoundingClientRect()`: the column's parent was 261px wide, the column itself
rendered 322px→486px, past both its parent and `window.innerWidth`). This is what
read as "messy" / overlapping near the button — the CTA and button themselves were
never actually misaligned, the features list next to them was spilling off-screen.

**Fix applied:** added `flexWrap: "wrap" as const` to the two-column wrapper
(line 1210) and `minWidth: "200px"` to each of the two column children
(lines 1212, 1227), so on narrow viewports the right column stacks below the left
column at full width instead of overflowing. Desktop layout (side-by-side columns)
is unchanged since both columns fit comfortably above the 200px floor there.

**Verified:** re-tested `/results` as `test-uk@example.com` at 375px — both columns
now stack cleanly inside the card border, no clipped/cut-off text. Re-checked
desktop width — unchanged, still side-by-side.

**Next step:** commit alongside the other UAT-pass fixes.
