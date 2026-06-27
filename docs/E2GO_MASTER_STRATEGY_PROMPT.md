# E2go Master Strategy Prompt
## Session reference — June 18, 2026
## Status: RESEARCH COMPLETE — awaiting owner decision before any build

This document captures all open strategic questions, research findings, and pending decisions
from the pricing/messaging/audit conversation. It is the source of truth for the next session.
No code has been written based on this. Wait for owner sign-off on each section before building.

---

## SECTION 1 — PRICING DECISIONS

### Context
The original pricing had multiple tiers (solo, solo+spouse, family). The owner has requested simplification.

### Decisions agreed in conversation
- Eliminate the solo and solo+spouse tiers. One flat price covers any applicant unit (principal + optional spouse + any children).
- No per-kid surcharge — flat price covers the whole family unit regardless of number of children.
- The "joint venture partnership" (two business principals on one E-2 application) is a separate tier.
- Per-kid surcharge of $50 was discussed and **rejected** — creates support debt and negative UX at the point of highest emotional investment.

### Pricing under debate — owner has NOT yet decided

| Tier | Option A (aggressive) | Option B (recommended) | Rationale |
|---|---|---|---|
| Full package (single applicant) | $995 | **$1,295** | E2 Visa Coach charges $2,400; $1,295 is 46% cheaper while supporting the premium brand |
| Joint venture (2 principals, 1 application) | $1,495 | **$1,795** | Genuinely more complex — two sets of personal docs; still cheaper than two separate packages |
| Interview simulator (standalone) | $247 | **$347** | E2 Coach charges $249 for **generic** prep; E2go's is case-specific — worth more |
| Gap analysis / denial-risk report (standalone) | $197 | **$197** | Unique in market; no comparable product to anchor against |
| Prep kit (standalone) | $97 | **$97** | Entry point for applicants who already have docs elsewhere |

**The anchor logic:** Simulator $347 + Gap analysis $197 + Prep kit $97 = $641 for 3 modules.
Full package = $1,295 for everything including 6 documents. The $654 gap makes the full package the
obvious choice once anyone sees the à la carte prices.

### Critical caveat on joint venture pricing
**The joint venture tier CANNOT launch until the multi-applicant architecture is confirmed.**
The current system is built around a single principal applicant. A joint venture application requires
two complete sets of personal documentation. Pricing a tier the system cannot produce creates
refund risk and support debt. Recommend: launch single-applicant $1,295 now; add joint venture as
Phase 2 after architecture audit (see Section 3).

### Owner questions still open
1. Do you accept $1,295 as the base price, or do you want to go lower?
2. Do you want standalone modules available at launch, or full package only?
3. Is there a "free trial" or "free first document" tier you want to explore?

---

## SECTION 2 — COMPETITOR LANDSCAPE

### E2 Visa Coach (e2visacoach.com) — ONLY dedicated E2 SaaS competitor

**Technical note:** Built on Lovable.app (a rapid-prototype builder — confirmed from metadata URL).
Member count: **106 members** as of June 2026.

**Pricing:**
- Full-Service Concierge (done-with-you + human expert): **$2,400 one-time**
- Business Launch Kit (branding/website): **$2,400 one-time**
- À la carte:
  - Business Plan Generator: **$947**
  - Business Finder (listings): **$947**
  - Interview Coach (generic, not case-specific): **$249**
  - LLC Formation guide: **$447**
  - DS-160 Form Guide: **$99**
- Free: E2 Advisor chatbot, Visa Fundamentals guide, Business Validator, Journey Roadmap

**Navigation:** WhatsApp-centric (multiple "Chat on WhatsApp" CTAs). Minimal nav — tools list, pricing.
**Messaging:** "The Complete E-2 Visa Platform: From Business Search to Visa Approval & Beyond."
Strongest line: *"We built E2 Visa Coach because entrepreneurs deserve better than $15,000 consulting
fees. As E-2 visa holders ourselves, this is the tool we wish existed."*
**Weakness:** Human expert dependency means not truly scalable. No denial-risk engine. No voice
matching. Generic (not case-specific) interview prep. Built on Lovable (fragile foundation).

---

### Visas 101 (visas101.com) — Interview coaching only, former US consular officers

**NOT a direct competitor — potential partner.**

**Model:** Former US consular officers (Düden Freeman, Dean Kaplan) who led E-visa units at US
embassies. Interview prep courses and 1-on-1 consultations. Does NOT generate documents.

**Pricing (approx):** Masterclass courses ~$200. Consultations: 20-min and 45-min sessions priced
separately (amounts not scraped). Used by immigration attorneys to prep their clients.

**Navigation:** Home · Courses · Consultations · Free Resources
**Messaging hero:** *"Your life can change in 210 seconds. That's how long a U.S. visa interview
typically lasts."* — very strong. Stakes-first, specific, visceral.
**Key insight they use:** *"The visa decision is usually SOLELY based on the verbal interview,
not documents."* This is their reframe.

**Partnership opportunity:** Visas 101 does what E2go's simulator simulates — but with real former
officers. A cross-referral or co-bundling arrangement could serve applicants who want both the
document package AND human officer coaching.

---

### Tukki (tukki.ai) — Multi-visa, tech-enabled immigration service

**NOT E2-specific.** Covers O-1A, H-1B, L-1, EB-2 NIW etc. Has attorney support built in.
Pricing: personalized calculator only — "for business pricing, reach out to our team." Not public.
Navigation: standard SaaS (Product · Pricing · About · Blog · Sign in)

---

### Lighthouse (lighthousehq.com) — Multi-visa, tech-enabled immigration service

**NOT E2-specific.** Similar to Tukki — multi-visa, tech + attorney model. No public pricing.
Covers: O-1A, O-1B, H-1B, TN, E-3, J-1, EB-2 NIW, L-1A/B, EB-1, EB-2/3.

---

### Traditional market pricing (for comparison anchor)
- Immigration attorney fees: **$8,000–$15,000**
- Business plan (professional writer): **$1,500–$5,000**
- USCIS premium processing (2026): **$2,965**
- DS-160 application fee: **$315**

---

## SECTION 3 — DOCUMENT AUDIT (PENDING — TO BE DONE IN NEXT SESSION)

### What needs to be audited

This audit has NOT been done yet. It requires reading the actual codebase — specifically
the document generation engine, the prompt files, and the application schema — to answer
these questions factually. Do not rely on training data or assumptions.

### Questions to answer from the codebase

**A. What does E2go currently generate?**
- The owner states the system produces 6 documents. Which 6 exactly?
- What is the content structure of each?
- Are they generated sequentially or in parallel?
- Which API/model generates each? (must be Anthropic for doc gen per project rules)

**B. What does a complete E-2 consular package actually require?**
Cross-reference the generation engine against E-2 requirements per the USCIS policy manual
and standard consular practice. Specifically:

For the **principal investor**, a standard E-2 package requires:
1. Cover letter / personal statement (investor narrative)
2. Source of funds documentation (with supporting evidence structure)
3. Business plan (USCIS-compliant — executive summary, market analysis, financials, job creation)
4. Investment evidence summary (how funds were committed / "at risk")
5. Qualifications / background statement (why this investor for this business)
6. Organizational chart / business structure document
7. DS-160 (government form — E2go cannot generate this but can guide it)
8. Supporting evidence checklist / binder structure guide

For the **spouse (E-2D dependent)**:
- Does E2go generate a dependent application letter / spousal statement?
- Does it generate anything specific to the spouse's background or tie to the investor's case?
- What does the consulate actually require for a spouse?

For **children (E-2D dependent minors)**:
- Are children's dependent applications generated or just noted in the principal's documents?
- What does the consulate require?

For a **joint venture (two principals)**:
- Two complete sets of principal documents (cover letters, source of funds, qualifications) — one per principal
- Shared business plan (one plan, references both investors)
- Investment evidence for each principal's contribution
- Does the system currently support any of this? Almost certainly no — the architecture is single-applicant.

**C. What is the system currently missing?**
Document the gap between what is generated vs. what a complete consular package requires.
Flag anything that could cause a denial that the system doesn't currently address.

### Files to read for this audit
- `src/` — document generation engine files
- Any prompt files for the 6 documents
- The application schema / form structure (what data is captured)
- `docs/` — any existing document specification files
- The knowledge base content that the FAQ engine draws from

---

## SECTION 4 — MULTI-APPLICANT ARCHITECTURE AUDIT (PENDING)

### The core question
The current app is built around a single applicant (one principal, optional spouse, optional children).
A joint venture application involves two separate business principals, each with their own:
- Source of funds (different money, different history)
- Personal background / qualifications statement
- Immigration history
- Voice profile (written in THEIR voice, not their partner's)

### Gates that need to exist for joint venture to work

**Database layer:**
- Can a single "application" record reference two principal applicants?
- Are personal profiles (name, background, source of funds) stored per-person or per-application?
- Can two voice profiles exist on one application?

**Form / intake layer:**
- Does the Discovery & Gap Analysis (Module 2, 12 tabs) have a way to capture a second principal?
- Can the investment section capture contributions from two different sources?

**Document generation layer:**
- Can the cover letter generator produce two separate first-person narratives?
- Can source of funds generate two separate chains?
- Does the business plan template support two named investors?

**Pricing / billing layer:**
- Can Stripe accept a single payment that maps to a "joint venture" application tier?

**Answer to almost all of the above:** Probably no, based on the architecture decisions documented
in prior sessions. The app was explicitly designed as a single-applicant flow.

### Recommendation
Do not launch a joint venture tier until this audit is complete and the build is scoped.
Estimated build effort: likely 2–3 sessions of significant work (new DB schema, new intake flow,
new document generation logic). Flag this as a Phase 2 feature.

---

## SECTION 5 — MESSAGING AUDIT AND RECOMMENDATIONS

### E2go's current messaging strengths
- Price anchor is strong and concrete: "Without the $12,000 price tag"
- "Strategy not a checklist" quote is memorable
- "Written in your voice" is a genuine differentiator (not used by any competitor)
- The denial-risk engine (15 factors, 6 categories) is unique in the market
- Free eligibility quiz + Ask E2go as entry point is a strong top-of-funnel

### What E2go's messaging is currently missing

**1. A stakes line.**
Visas 101 has "210 seconds — that's how long a U.S. visa interview typically lasts."
E2go needs its equivalent. The E-2 stakes are real: most people applying are committing
$100k–$500k of investment capital. The visa is what makes that investment legal.
Suggested direction: *"You've committed [six figures] to this business. The visa is what
makes it legal. This is the document package that earns it."*

**2. An authenticity signal.**
E2 Coach: "As E-2 visa holders ourselves, this is the tool we wish existed."
E2go has no equivalent. Who built this? Why? What's the founder's connection to the E-2
process? This trust gap is visible at the nav level — there's no About page in the primary nav.

**3. A timeline promise.**
E2 Coach: "Visa-ready in 12 weeks." E2go quotes "4–6 months" as a system output, not a promise.
The question: what is E2go's commitment to the applicant in terms of time?

**4. "Written in your voice" is invisible in the hero.**
This is the most human and differentiated thing E2go does. It's buried in the feature grid.
It should be in the hero or in the first section a visitor sees.

**5. The denial-risk engine has no hero-level mention.**
The 15-factor denial-risk check is genuinely unique. No competitor has anything like it.
The "15 denial-risk checks on every draft before you see it" stat in the hero is good — but
the name "Prepare engine" and how it works needs a moment in the page narrative.

### Recommended messaging shifts (NOT to implement yet — owner to review)

| Location | Current | Proposed direction |
|---|---|---|
| Hero headline | "Without the $12,000 price tag" | Keep the price anchor; add the stakes ("You're committing [six figures]...") |
| Hero subhead | "One platform. No middlemen." | Add the voice differentiator and the denial-risk angle |
| Stats bar | "Free / 6 / 15 / From $550" | Update pricing to $1,295 when agreed; keep the 15 denial-risk checks |
| About / founder section | Currently buried | Needs to be a real section with a real origin story |
| Nav | "Simulator" | Rename to "Interview Prep" for clarity to first-time visitors |

---

## SECTION 6 — NAVIGATION RECOMMENDATIONS

### Current E2go nav
```
E2go.app | How it works | Learn | Pricing | Simulator | Log in | [CHECK ELIGIBILITY]
```

### Issues
- "Simulator" is jargon to first-time visitors — they don't know what it is
- "Learn" is vague — could mean anything
- No "About" — trust gap (E2 Coach and Visas 101 both have credibility/team sections prominent)
- No free resource / lead magnet entry point in the nav
- No "What's included" or "Features" link

### Recommended nav structure
```
E2go.app | How it works | What's included | Pricing | About | Log in | [CHECK MY ELIGIBILITY →]
```

With "What's included" covering the feature grid (all 14 features across the 3 phases).
"About" covering the founder story + why this was built.
The primary CTA ("Check my eligibility") remains the free quiz.

### Mobile nav
On mobile, the current hamburger menu works but the order needs review.
Priority order for mobile: Check eligibility → Pricing → How it works → What's included → About → Log in

---

## SECTION 7 — WHAT TO BUILD NEXT (IN PRIORITY ORDER)

The following is a prioritised build list. Nothing below has been started.
Owner must approve each item before work begins.

### Priority 1 — Must do before any pricing launch
- [ ] **Document audit** (Section 3) — know exactly what 6 documents are generated and what's missing
- [ ] **Update all pricing references** in the codebase to reflect the agreed price ($1,295 or otherwise)
- [ ] **Pricing page** — build a clean pricing page if one doesn't exist, or update the existing one

### Priority 2 — Should do before marketing launch
- [ ] **Messaging refresh** — update hero headline, subhead, and stats bar per Section 5
- [ ] **Nav restructure** — rename "Simulator" → "Interview Prep", add "What's included", add "About"
- [ ] **About page** — founder story, authenticity signal, why this was built

### Priority 3 — Phase 2 features (do not launch yet)
- [ ] **Joint venture architecture audit** (Section 4) — scope the build before pricing it
- [ ] **Standalone module purchasing flow** — if à la carte modules are launched separately
- [ ] **Partner / referral program** — explore Visas 101 cross-referral or similar

---

## CONSTRAINTS (unchanged from prior sessions)

- Branch `dev` — NEVER commit directly to main
- Clean `npm run build` before every push
- FAQ/simulator routes: ONLY xiaomi/mimo-v2.5 or mimo-v2.5-pro (NEVER minimax/deepseek/Anthropic)
- Document generation: Anthropic API key only, in generation-engine.ts only
- GROQ for voice only
- NEVER expose API keys client-side
- NEVER DROP TABLE; idempotent migrations only
- No "you qualify" / eligibility-conclusion language; always soft CTA "personalised picture"
- No Playwright (cost) — verify with preview_* MCP tools + tsc
- Restart dev server (preview_stop → preview_start) at session end

---

*Last updated: June 18, 2026*
*This prompt was generated from a live strategy session and replaces any prior pricing or messaging decisions.*
