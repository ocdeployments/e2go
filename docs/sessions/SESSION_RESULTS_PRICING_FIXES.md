# SESSION — Results Page & Pricing Page UX Fixes
**Date:** June 11, 2026
**Branch:** dev
**Agents:** engineering-frontend-developer, engineering-minimal-change,
            engineering-code-reviewer
**Estimated time:** 2–3 hours
**Triggered by:** Manual walkthrough — 6 UX bugs found post-security-fixes

---

## CONSTRAINTS

- No Playwright. No screenshots.
- Verify with: curl, npm run build, open for owner visual check
- engineering-minimal-change: fix only what is listed. Nothing else.
- One commit per group. Build clean before each commit.

---

## READ FIRST

```
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat src/app/results/page.tsx
cat src/app/pricing/PricingClient.tsx
cat src/lib/pricing-tier.ts
```

Report the current state of each file before writing any code.

---

## FIX 1 — Email button: unauthenticated users see auth gate, not failure

**Bug:** "Email me this result" calls /api/email/results which now
requires auth. Anonymous users get "Failed — try again."
This is the wrong experience. They need to be offered signup/login.

**File:** src/app/results/page.tsx

Find the "Email me this result" button handler.

Change the behaviour:
- Before calling the API, check if the user is authenticated
  (use supabase.auth.getUser() or read session state)
- If NOT authenticated:
  Do not call the API.
  Instead show a modal or inline message:
  "Create a free account to save and email your results."
  Two buttons: "Create account" → /signup?redirect=/results
               "Log in" → /login?redirect=/results
- If authenticated:
  Call /api/email/results as before.
  Show loading → success / error states.

The modal/inline message must use Obsidian Gold styling:
  Background: #0a0a0a
  Border: 1px solid rgba(201,168,76,0.25)
  Heading: Cormorant Garamond 300 18px
  Buttons: gold filled + gold outlined, no border-radius

---

## FIX 2 — Recommended package missing children

**Bug:** User said "spouse and kids" in quiz. Results page shows
"Solo + Spouse" package. Children are missing from the recommendation.

**File:** src/lib/pricing-tier.ts

Read the full file. Find the family composition → tier mapping.

The correct mapping (from CLAUDE_CONTEXT.md confirmed pricing):
  solo + no dependents          → solo_none        $550
  solo + spouse only            → solo_spouse       $697
  solo + spouse + 1–2 children  → solo_family_small $750
  solo + spouse + 3–5 children  → solo_family_large $797
  solo + children only          → solo_family_small $750
  partnership + no families     → partnership_none  $997
  partnership + two couples     → partnership_couples $1,297
  partnership + two families    → partnership_families $1,397

Check what quiz answer Q0-03 (or Q0-16) produces for
"spouse and children" — read the quiz page to find the exact
option text and map it correctly.

Also read src/app/results/page.tsx — find where pricing.tier,
pricing.spouseAdd, pricing.childrenAdd are set.
Confirm the breakdown line items (spouse, children) are rendered
when they exist.

After the fix:
  Quiz answers: spouse + 2 children → shows Solo + Family (≤2 kids) $750
  Quiz answers: spouse + 4 children → shows Solo + Family (3–5 kids) $797
  Both must show the breakdown: base + spouse + children line items

---

## FIX 3 — "Areas requiring attention" shown when there are no flags

**Bug:** Section heading "Areas requiring attention" appears even
when score is 100 and zero flags exist. The section shows green
checkmarks with no issues — the heading is misleading.

**File:** src/app/results/page.tsx

Find the "Areas requiring attention" section.

Change the logic:
  If attorney_flags.length === 0 AND risk_flags.length === 0:
    Replace heading with: "Your profile is clean"
    Show: "No issues identified. You are clear to proceed."
    Style: same section, gold checkmark icon, positive framing

  If flags exist:
    Keep "Areas requiring attention" heading as-is
    Show the flags as currently implemented

The "Your profile is clean" state should feel like confirmation,
not an empty section. One clear sentence. Gold accent. Done.

---

## FIX 4 — Franchise broker section copy update

**Bug:** Current copy is passive, no urgency, no mention of zero cost.

**File:** src/app/results/page.tsx

Find the franchise broker section (shown when data.franchise_interest
is true or business_type includes franchise).

Replace the body copy with exactly:

  Heading (Cormorant Garamond 300 17px):
  "Connect with a franchise broker at no cost to you."

  Body (DM Sans 300 12px rgba(245,240,232,0.55)):
  "Brokers in our network are paid by the franchisor — not you.
  Most people spend weeks searching, or thousands of dollars to
  access one. We can make an introduction within 24 hours."

  Button text (keep existing style):
  "Connect me with a broker →"

Do not change the button handler or any other logic.
Only the copy changes.

---

## FIX 5 — Pricing page: pre-select recommended tier, scroll to it

**Bug:** Pricing page loads at the top showing "Additional child"
add-on first. Recommended package is fifth. User has to scroll
to find their package and it is not highlighted.

**Files:** src/app/pricing/PricingClient.tsx,
           src/lib/pricing-tier.ts

Read PricingClient.tsx fully first.

Changes:

1. On page load, read the recommended tier from:
   - URL params: ?tier= and ?dependents= (already passed from results page)
   - OR localStorage quiz result
   - OR Supabase quiz_sessions if user is logged in

2. Scroll to the recommended tier card on mount:
   ```typescript
   useEffect(() => {
     if (recommendedTierId) {
       const el = document.getElementById(`tier-${recommendedTierId}`)
       el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
     }
   }, [recommendedTierId])
   ```

3. Visually highlight the recommended tier card:
   - Gold border: 1px solid #C9A84C (vs rgba(201,168,76,0.12) for others)
   - Label above the card: "Recommended for you"
     Font: DM Sans 500 10px uppercase #C9A84C letter-spacing 0.14em
   - Subtle gold background: rgba(201,168,76,0.04)
   - All other cards: default styling, no highlight

4. Reorder the pricing page layout:
   The recommended tier must be visually prominent.
   The "Additional child" surcharge section must move to the
   BOTTOM of the page — it is an add-on, not a primary tier.
   Order should be:
     [Recommended tier — highlighted]
     [Other individual tiers]
     [Partnership tiers]
     [Standalone simulator]
     [Renewal]
     [Additional child — last]

---

## FIX 6 — "Get Started" for anonymous users routes to signup not quiz

**Bug:** Unauthenticated user clicks "Get Started" on a pricing tier.
They get sent to /quiz instead of being offered to create an account.

**File:** src/app/pricing/PricingClient.tsx

Find the "Get Started" / checkout button handler.

Current behaviour: calls /api/stripe/create-checkout → fails without
auth → redirects to /quiz.

New behaviour:
  If user is NOT authenticated:
    Do not call the API.
    Redirect to: /signup?redirect=/pricing&tier=[tierId]
    After signup, the user returns to /pricing with their tier
    pre-selected and can complete checkout.

  If user IS authenticated:
    Call /api/stripe/create-checkout as before.

The redirect must preserve the tier so the user does not have to
re-select after signing up. The signup page must handle the
?redirect= and ?tier= params and forward them to /pricing on success.

Check src/app/signup/page.tsx — confirm it reads redirect param
and routes there after successful signup. If not, add it.

---

## VERIFICATION

```bash
npm run build
npx tsc --noEmit

# Results page renders:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/results
# Must return 200

# Pricing page renders:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/pricing
# Must return 200

# Open for visual check:
open http://localhost:3000/results
open http://localhost:3000/pricing
```

Owner visual checks:
  □ Email button for anonymous user shows signup/login prompt
  □ Recommended package shows correct tier including children
  □ "Areas requiring attention" hidden when no flags
  □ "Your profile is clean" shown when no flags
  □ Franchise broker copy matches exactly as specified
  □ Pricing page scrolls to and highlights recommended tier
  □ "Additional child" is at the bottom of pricing page
  □ "Get Started" for anonymous user goes to signup, not quiz

---

## COMMIT

```bash
git add src/app/results/ src/app/pricing/ src/lib/pricing-tier.ts \
  src/app/signup/
git commit -m "fix: results and pricing UX — email auth gate, family pricing, clean profile state, franchise copy, pricing pre-select, signup redirect"
git push origin dev
```

---

## REPORT FORMAT

```
Results/Pricing fixes complete.

Fix 1 — Email auth gate: DONE
Fix 2 — Family pricing mapping: DONE — [what was wrong, what changed]
Fix 3 — Clean profile state: DONE
Fix 4 — Franchise copy: DONE
Fix 5 — Pricing pre-select: DONE
Fix 6 — Signup redirect: DONE

Build: clean
Commit: [hash]
```
