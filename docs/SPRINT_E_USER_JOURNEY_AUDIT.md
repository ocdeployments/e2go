# Sprint E — Full User Journey Audit
**Date:** June 25, 2026  
**Source:** Live walkthrough by Romy — first-time user flow (unregistered email → quiz → results → dashboard → features)

---

## E-1 · Critical Breaks (Dead ends / Broken flows)
*Fix before anything else — these block the conversion funnel entirely.*

| # | Issue | Location | Fix |
|---|---|---|---|
| E-1-01 | Login with unknown email shows "Invalid email or password" | `src/app/login/page.tsx` | Detect unknown email → show "No account found. [Sign up free →]" instead |
| E-1-02 | Terms of Service "Back to home" returns to landing page | `src/app/terms/TermsClient.tsx` | Pass `?returnTo=/signup` param; "Back" button returns to signup (or wherever user came from) |
| E-1-03 | Save & Exit on quiz does nothing — stays on page | `src/app/quiz/page.tsx` | Fix save handler; should save progress to DB and redirect to dashboard/home |
| E-1-04 | ToS acceptance button stuck on "Recording acceptance" | `src/app/results/page.tsx` (terms flow) | Debug acceptance mutation; add timeout fallback + error state |
| E-1-05 | Pricing page "Selected" button → "Failed to create application" | `src/app/pricing/PricingClient.tsx` | Fix application creation flow for authenticated users with no prior application |
| E-1-06 | Pricing page shows "Sign in and get started" when already signed in | `src/app/pricing/PricingClient.tsx` | Check auth state; replace CTA with "Continue to checkout →" when signed in |
| E-1-07 | Dashboard "Upload documents" → "No application found" → broken loop | `src/app/dashboard/page.tsx` | Gate upload button behind paywall; remove broken fallback to quiz |
| E-1-08 | Dashboard timeline calendar stuck on loading | `src/app/dashboard/page.tsx` | Debug calendar component; add error boundary + loading fallback |
| E-1-09 | Dashboard "Launch Navigator" stuck on loading | `src/app/dashboard/page.tsx` | Debug navigator load; add error boundary |
| E-1-10 | Simulator stuck on "Loading" | `src/app/simulator/page.tsx` | Debug load sequence for users with no active case file; add graceful fallback |

---

## E-2 · Paywall / Access Control
*Revenue protection — every unpaid feature is accessible today.*

| # | Issue | Location | Fix |
|---|---|---|---|
| E-2-01 | Application section cards (1–5) all fillable without payment | `src/app/apply/*` | Gate behind `hasComplete` entitlement; locked cards show lock icon + "Unlock for $1,495" |
| E-2-02 | Gap analysis accessible without payment | `src/app/gap-analysis/page.tsx` | Gate behind `hasComplete`; show "Available after you unlock your case" with CTA |
| E-2-03 | FDD analysis accessible without payment — can upload + trigger extraction | `src/app/fdd/*` | Gate behind `hasFddIntelligence`; show locked state with FDD add-on CTA |
| E-2-04 | Simulator accessible without payment | `src/app/simulator/*` | Gate behind `hasInterviewPrep`; show locked state with add-on CTA |
| E-2-05 | Full nav bar (Dashboard, My Application, Gap Analysis, FDD, Simulator) exposed from results page to unpaid users | `src/components/Nav.tsx` | Nav items for gated features shown as locked (greyed, lock icon) until entitlement granted |

---

## E-3 · Results Page Restructure
*Conversion page — most critical UX after paywall.*

| # | Issue | Fix |
|---|---|---|
| E-3-01 | No personal greeting — jumps straight to score | Add "Welcome back, [First Name]" above score circle; pull from profile |
| E-3-02 | Score of 88 with no breakdown of the 12 deducted points | Add score breakdown section: show which risk factors reduced score and by how much |
| E-3-03 | Green vs gold bullets in "What your assessment found" — colors unexplained | Green = confirmed strength; Gold = attention item (needs context). Add legend or use single color with clear labels |
| E-3-04 | Children not reflected — says "Traveling spouse" but not "spouse + children" | Fix case profile summary to include children when Q0-04 answered |
| E-3-05 | "3 areas flagged below; all addressed before submission" — nothing below that text | Wire flagged areas display to actually appear below that statement |
| E-3-06 | "Viable — specific areas require strengthening" is plain text, not actionable | Hyperlink "specific areas" to the flags section below |
| E-3-07 | "You already have" ✓ list is buried — should be prominent near score | Move as styled confirmation badges/buttons immediately below score circle |
| E-3-08 | Pricing card is too low; generic feature list has no impact | Move pricing card up; headline: "Eligibility confirmed. Let's build your case." Remove generic list |
| E-3-09 | No feature explanation cards below pricing | Add 4–5 feature cards in layman terms (read FEATURE_INVENTORY.html); show the flow from quiz → case file → documents → interview → submit |
| E-3-10 | No add-on pricing reference | Add link/section below main pricing card: "Also available: Interview Simulator ($347) · FDD Analysis ($575)" |
| E-3-11 | Document preview (business plan) not personalized — no user name | Inject first name + business type + consulate into the visible draft lines |
| E-3-12 | Only business plan draft shown | Show 2–3 document previews (e.g. business plan + source of funds + declaration); builds confidence |

---

## E-4 · Quiz Fixes

| # | Issue | Fix |
|---|---|---|
| E-4-01 | RRSP/TFSA/LIRA question uses Canada-specific terms | Reword to: "From your retirement accounts or savings (e.g. RRSP, TFSA, LIRA in Canada):" — generic first, country-specific in parentheses |
| E-4-02 | FDD question (Q0-08c) shows even when user asked to be connected to broker | If Q0-09 (broker connection) = Yes → skip Q0-08c (they haven't engaged a franchise directly yet). Show Q0-08c only when broker connection = No/Already have one |
| E-4-03 | Immigration history question wording ambiguous | Reword from "Does any of the following apply to your immigration history?" → "Do you have anything in your immigration history that could affect a US visa application?" |
| E-4-04 | Net worth question excludes primary residence — catches people off guard | Split into two questions: (1) "What is the approximate value of your savings, investments, and retirement accounts?" (2) "What is the approximate value of your primary residence?" |
| E-4-05 | Business background — single select only; options overlap | Convert to multi-select checkboxes; rewrite option copy to be non-exclusive |
| E-4-06 | Industry/business type — single select; list incomplete | Convert to multi-select; add "Other (describe):" free-text option; add cleaning/maid service, renovation/home improvement to list |
| E-4-07 | Storefront preference question missing "run from home" option | Add "Home-based or fully remote" as a fourth option |
| E-4-08 | Cookie banner obscures Continue/Back buttons | Move cookie banner: either top of page or modal overlay with dismiss — never bottom-of-page over navigation |

---

## E-5 · Dashboard Overhaul

| # | Issue | Fix |
|---|---|---|
| E-5-01 | No personal greeting — says "Welcome, your E2 profile case" | Show "Welcome back, [First Name]" |
| E-5-02 | Application type says "Solo E-2 Investor" for user with spouse + children | Derive type from quiz answers (Q0-03 / Q0-04); display "E-2 Investor with Spouse & Children" |
| E-5-03 | Eligibility strength badges not shown on dashboard | Reuse same confirmation badge component from results page; show top 4–5 strengths |
| E-5-04 | No progress journey roadmap | Add horizontal or vertical journey spine: Quiz → Case File → Documents → Interview Prep → Submit — with current stage highlighted |
| E-5-05 | Section numbering skips 5 (shows 1, 2, 3, 4, 6) | Fix section number assignment in dashboard section cards |
| E-5-06 | All application section cards clickable without payment | Locked sections: greyed card, lock icon, "Unlock with Complete ($1,495)"; hover shows feature description |
| E-5-07 | Raw error messages for unavailable features ("No application found. Create a case file first.") | Replace all raw errors with contextual locked states: show what the feature is, why it's not available yet, CTA to unlock |
| E-5-08 | Hover-to-learn pattern for locked feature cards | Each locked card: hover → card lights up and shows 2-line description of the feature → click → detail panel with "Add to your plan" CTA |

---

## E-6 · Pricing Page Fixes

| # | Issue | Fix |
|---|---|---|
| E-6-01 | "Additional Child — $50" still showing (old pricing) | Remove this option from `src/app/pricing/PricingClient.tsx` |
| E-6-02 | "500 of 500 founding spots remaining" still showing | Remove from pricing page |
| E-6-03 | Feature list below $1,495 card outdated | Update to reflect current 15-document package + gap analysis + consulate briefing |
| E-6-04 | "Sign in and get started" shown to authenticated users | Check auth session; show "Continue to checkout →" when signed in |

---

## E-7 · Franchise Navigator Fixes

| # | Issue | Fix |
|---|---|---|
| E-7-01 | Matched franchise company/brand names shown to user | Remove brand names from results; show industry category + compatibility score only |
| E-7-02 | No broker connection flow after matching | After matching: "Would you like us to connect you with a franchise specialist broker?" → Yes → record in DB + send confirmation email + notify broker team (mechanism TBD) |
| E-7-03 | "Update eligibility quiz" takes user to Q1 | Should deep-link to the specific data points shown (investment range, citizenship, etc.) or show editable summary of those fields only |
| E-7-04 | Question 10 in Navigator ("owned and operated before") may duplicate main quiz | Cross-check against main quiz questions; remove if duplicate |
| E-7-05 | Industry categories limited; can't multiselect | Broaden category list; allow multi-select; add "Open to broker recommendation" option |
| E-7-06 | FDD analysis only accepts one zip code | Territory input: allow multiple zip codes (same state assumption); comma-separated or add/remove field pattern |
| E-7-07 | FDD upload: no way to remove/delete an uploaded file | Add "Remove" button next to each uploaded file before extraction begins |

---

## Open Product Questions (need Romy decision before building)

| # | Question |
|---|---|
| OPQ-1 | FDD Analysis: is the standalone ($575) the same interface as the in-app FDD tool, or a separate experience? Multi-FDD comparison — is that part of standalone or a separate product? |
| OPQ-2 | Franchise broker handoff: what is the exact mechanism? Email to Romy? CRM integration? Third-party broker API? |
| OPQ-3 | Industry categories for Navigator: what is the full list to add? (cleaning, renovation confirmed — what else?) |

---

## Priority Build Order

1. **E-1** — Critical breaks (stop users getting stuck)
2. **E-2** — Paywall (stop revenue leakage)
3. **E-6** — Pricing page (already in funnel; quick fixes)
4. **E-3** — Results page (conversion engine)
5. **E-4** — Quiz fixes (data quality, UX friction)
6. **E-5** — Dashboard (experience after payment)
7. **E-7** — Navigator (franchise-specific; depends on OPQ answers)
