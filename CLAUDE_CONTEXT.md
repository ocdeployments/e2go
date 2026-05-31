# CLAUDE_CONTEXT.md — e2go.app
## Master Context for Every Claude Code Session
**Version:** Session 1 Final — May 29, 2026
**Read this entire file before doing anything.**
**Then read BUILD_TRACKER.md.**

---

## SESSION COMMANDS

### "start session"
When the user types "start session", you must:
1. Read this entire CLAUDE_CONTEXT.md file
2. Read BUILD_TRACKER.md completely
3. Report back:
   - What was completed last session
   - What is currently broken or incomplete
   - What the next priority task is
   - Current app status (routes, any known errors)
4. Confirm all 10 standing build rules are loaded
5. Ask: "Ready to confirm and begin?"
Do not start any work until the user confirms.

### "end session"
When the user types "end session", you must:
1. Update BUILD_TRACKER.md:
   - Mark all completed items as ✅
   - Add new bugs to Known Issues section
   - Add new features discovered to New Features section
   - Update Session Log with date, session number,
     everything completed, key decisions made,
     what was left incomplete
   - Update "Claude Code priorities for next session"
     with top 5 tasks in priority order
2. Update CLAUDE_CONTEXT.md if any standing rules changed
3. Run npm run build — confirm clean
4. Report: "Session complete. Here is what was accomplished: [summary]"
5. Confirm both files are saved to the project

These are the only two session management commands.
Every session starts with "start session".
Every session ends with "end session".
No exceptions.

---

## PRODUCT OVERVIEW

**App name:** e2go.app
**What it is:** Self-service U.S. E-2 Treaty Investor visa preparation platform
**Who it serves:** Nationals of all 82 E-2 treaty countries. Primary market: Canada via Toronto consulate.
**What it replaces:** $6,500–$15,000 immigration attorney engagement
**What it produces:** A complete, consulate-formatted E-2 application package
**Legal position:** Preparation and document drafting tool — NOT a law firm
**Critical rule:** Never use language suggesting the app replaces legal counsel

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + Auth) |
| AI Features | MiniMax M1 via OpenRouter |
| Email | Resend |
| Payments | Stripe (not yet integrated) |
| Hosting | Vercel |
| Error Monitoring | Sentry (planned) |
| PDF Generation | WeasyPrint serverless (planned) |

**AI routing:** All MiniMax/OpenRouter calls via src/app/api/ai/route.ts
OPENROUTER_API_KEY is server-side only — never in browser code.

**MiniMax model string:** minimax/MiniMax-Text-01
**OpenRouter base URL:** https://openrouter.ai/api/v1

---

## PROJECT STRUCTURE

```
~/E2-go/
├── CLAUDE_CONTEXT.md          ← this file — read every session
├── BUILD_TRACKER.md           ← build status — read every session
├── src/
│   ├── app/
│   │   ├── page.tsx           (landing /)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── quiz/page.tsx      (/quiz)
│   │   ├── results/page.tsx   (/results)
│   │   ├── pricing/page.tsx   (/pricing)
│   │   ├── dashboard/page.tsx (/dashboard)
│   │   ├── login/page.tsx     (/login)
│   │   ├── signup/page.tsx    (/signup)
│   │   └── api/
│   │       ├── ai/route.ts    (MiniMax API — server only)
│   │       └── test/route.ts  (Supabase connection test)
│   ├── components/
│   │   ├── Nav.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── supabase.ts        (Supabase client)
│   │   └── ai.ts              (OpenRouter client — planned)
│   └── middleware.ts          (auth route protection)
├── public/
│   ├── flag.png               (hero background — from StichFiles/Flagscreen.png)
│   └── data/
│       ├── module0_questions.json      ← LOCKED v2.1 — do not modify
│       └── module0_scoring_logic.json  ← LOCKED v1.1 — do not modify
└── docs/
    ├── stitch/                (10 Stitch HTML design files — visual references)
    ├── schema_complete.sql    (complete database schema — idempotent)
    ├── INTERVIEW_SIMULATOR_SPEC.md (to be created)
    └── spec/                  (4-volume product specification)
```

---

## ENVIRONMENT VARIABLES

File: ~/E2-go/.env.local (never commit this file)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_key
MINIMAX_MODEL=minimax/MiniMax-Text-01
```

---

## MODULE MAP

```
FREE (no account required)
└── Module 0: Eligibility Quiz — 22 questions, JSON-driven
              Hard stops PR-01–PR-09
              Outcomes: PROCEED / PROCEED_RISK /
                        ATTORNEY_RECOMMENDED / DO_NOT_PROCEED

PAID — STANDARD ($247–$647 one-time)
├── Module 1: Onboarding + Consent
├── Module 2: Your Business
├── Module 3: Document Interview Engine (Tabs A–L, ~250 questions)
├── Module 4: Application Confidence Score (8 dimensions, 0–100)
├── Module 5: Interview Simulator (AI-powered, personalized)
└── Module 6: Document Generation Pipeline + PDF Export

COMPLETE TIER UPGRADES
├── Module 7: LLC Formation Wizard (50-state)
├── Module 8: U.S. Banking Setup Guide
├── Module 9: Canadian Departure Tax Planner
├── Module 10: Interview Simulator Voice Mode (Whisper API)
└── Module 11: Full Referral Engine UI

POST-APPROVAL (separate purchase)
├── Module 12: Compliance Calendar ($29/year)
├── Module 13: Renewal Module ($97–$147)
├── Module 14: Green Card Pathway Roadmap (TBD)
└── Module 15: Community Forum (TBD)
```

---

## KEY DATA FILES

Before building any feature, read the relevant spec file:

| File | Contents | When to read |
|---|---|---|
| public/data/module0_questions.json | All Module 0 questions v2.1 | Before touching quiz |
| public/data/module0_scoring_logic.json | Scoring engine v1.1 | Before touching results |
| docs/stitch/landing.html | Landing page design | Before editing landing |
| docs/stitch/quiz.html | Quiz screen design | Before editing quiz |
| docs/stitch/results.html | Results screen design | Before editing results |
| docs/stitch/interview-engine.html | Question screen design | Before building Module 3 |
| docs/stitch/dashboard.html | Dashboard design | Before editing dashboard |
| docs/stitch/pricing.html | Pricing screen design | Before editing pricing |
| docs/stitch/features.html | Features section design | Before editing features |
| docs/stitch/sources.html | Sources section design | Before editing sources |
| docs/stitch/testimonials.html | Testimonials design | Before editing testimonials |
| docs/spec/ | 4-volume product specification | Before building any module |

---

## ARCHITECTURE DECISIONS — LOCKED

Do not change these without explicit instruction:

| Decision | Rule |
|---|---|
| Branch strategy | All Claude Code work happens on the dev branch. Never commit directly to main. Vercel auto-deploys dev to a preview URL on every push. Main is merged manually after preview URL is verified. Production (main) is never broken. |
| Paywall timing | Triggers after Module 3 personal tabs complete (Tabs A, B, J, F personal section). User pays and receives Batch 1 documents immediately. Business tabs and Batch 2 documents follow at user's pace. |
| Document generation | Sequential — ONE document at a time. Checkpointed. Never parallel. |
| Supabase auth | Use auth.users. Create public.profiles — not public.users. |
| AI calls | Server-side only via /api/ai/route.ts. Never client-side. |
| Data storage | Answers only. Never store passports, bank statements, or tax documents. |
| Document ownership | Each fact lives in exactly one document. No repetition across tabs. |
| Form terminology | All questions use exact DS-160 / U.S. government terminology. |
| Interview limits | 2 simulator sessions included per application. Extra: $9.99/3-bundle. |
| Stats | Only real government data. No fabricated approval rates or case counts. |
| Currency | All platform fees and pricing are in USD only. No multi-currency. No conversion. No CAD, GBP, AUD anywhere in the app except Q0-05 investment amount question which converts CAD input to USD for threshold checking only — this is a qualification calculation, not a payment display. |
| Global positioning | e2go serves all 82 E-2 treaty countries. Canadian/Toronto is the primary market. Never hardcode Canada-only assumptions into any feature. All nationality references use treaty country logic. |
| Consulate selector | As of September 6 2025, third-country national E-2 processing was eliminated by the State Department. Applicants must apply at the consulate in their country of nationality or lawful residence only. The consulate selector must enforce nationality-matched consulates. No free consulate selection. Source: State Department policy change Sept 2025. Annual review required. |
| Two-batch document model | Batch 1 — generated immediately after payment: Declaration, Qualifications, Net Worth Statement, Spouse Declaration (if applicable). Batch 2 — generated as business formation completes: All remaining documents. Cover Letter always last. |
| 50-page limit — Toronto | 50 pages maximum, new applications only. Official source: ca.usembassy.gov May 2026. Exempt: DS-160, DS-156E, G-28, appointment letter, civil documents, passport copies. Frankfurt exception: 30 pages maximum, 5MB, business plan in executive summary format only. London exception: 20MB upload cap. Annual review required. |
| Partnership — Negative Control doctrine | Two-investor 50/50 maximum. Source: 9 FAM 402.9-6(F). Three or more equal partners: hard stop PR-PARTNER. Each partner: separate DS-160, separate personal docs. Partnership submission format: UNCONFIRMED — flag open. Contact EVisaCanada@state.gov to confirm. Build both combined and separate binder modes. |
| Global positioning | e2go serves all 82 E-2 treaty countries. Canada/Toronto is primary market. Never hardcode Canada-only assumptions. Third-country processing eliminated September 6 2025. Consulate selector enforces nationality-matched posts only. |
| Currency | USD only throughout app. Exception: Q0-05 investment amount converts CAD to USD for threshold checking only — not a payment display. |
| Franchise categories | Pre-researched in docs/spec/E2_Franchise_Categories_Section5.md Do not rebuild. Read that file before building Module 2 matching engine. |
| Document standards constitution | docs/spec/Document_Generation_Standards.md Read before generating any document or building any generation feature. Non-negotiable. |
| Document conditionals | docs/spec/Document_Conditionals.md Read before generating any document. Every document is conditional on applicant situation. |
| Platform legal boundary | docs/spec/E2_Attorney_Review_Register.md Read before writing any tooltip, warning, or educational copy. Defines what platform can and cannot say legally. |

---

## PRICING

### B2C Application Pricing

| Tier | Coverage | Price |
|---|---|---|
| Solo Individual | 1 investor | $247 |
| Solo Couple | 1 investor + spouse | $297 |
| Solo Family (≤2 kids) | 1 investor + spouse + up to 2 children | $347 |
| Solo Extended (3–5 kids) | 1 investor + spouse + 3–5 children | $397 |
| Partnership — No Families | 2 investors only | $447 |
| Partnership — Two Couples | 2 investors + 2 spouses | $547 |
| Partnership — Two Full Families | 2 investors + 2 spouses + up to 4 kids | $647 |

**Add-ons:** +$25/extra dependent · +$19/3 extra exports · +$9.99/3 simulator sessions · $97–$147 renewal · $29/year compliance calendar

### B2B Subscription Pricing

| Product | Tier | Price | Volume |
|---|---|---|---|
| e2go Legal (Attorneys) | Starter | $299/month | 10 leads |
| e2go Legal (Attorneys) | Growth | $499/month | 25 leads |
| e2go Legal (Attorneys) | Practice | $799/month | Unlimited + API |
| e2go Broker (Franchises) | Starter | $399/month | 15 profiles |
| e2go Broker (Franchises) | Growth | $699/month | 40 profiles |
| e2go Broker (Franchises) | Agency | $999/month | Unlimited + territory exclusivity |

---

## ROUTES

| Route | Auth Required | Notes |
|---|---|---|
| / | No | Landing page |
| /quiz | No | Module 0 — free |
| /results | No | Reads localStorage |
| /pricing | No | Paywall screen |
| /learn/* | No | SEO education hub |
| /blog/* | No | SEO content |
| /login | No | |
| /signup | No | |
| /dashboard | YES | Redirect to /login if not authenticated |
| /apply/* | YES | Module 3 interview engine |
| /score | YES | Confidence score |
| /simulator | YES | Interview simulator |
| /export | YES | PDF generation |
| /generating | YES | Document generation progress |
| /support | No | Public support page |
| /support/new | No | Submit ticket |
| /support/tickets | YES | User's ticket history |
| /admin | YES + ADMIN ROLE | Hidden — never linked publicly |
| /partner/attorney | YES + PARTNER ROLE | Attorney portal |
| /partner/broker | YES + PARTNER ROLE | Broker portal |

---

## DESIGN SYSTEM

**Font:** Inter (all weights)
**Primary color:** #004ac6 (navy blue)
**Style:** Minimalist-Corporate · High Contrast · 8px grid
**Reference:** All Stitch HTML files in docs/stitch/
**Flag photo:** /flag.png (hero background — opacity 0.3, mix-blend-multiply)

**Document formatting (generated docs):**
- Font: Times New Roman 12pt
- Margins: 1 inch all sides
- Line spacing: 1.5 narrative / single tables
- Sections: Roman numerals
- Dates: January 15, 2026 (never 01/15/26)
- Dollars: $187,500 USD (always commas + USD)
- Header: Tab reference | Applicant name | Date
- Footer: "Prepared with e2go.app | Not legal advice"

---

## LEGAL CONSTRAINTS — NEVER VIOLATE

- Never say the app replaces a lawyer
- Never say "no lawyer required"
- Never claim legal advice is being provided
- Every screen must treat the app as a preparation tool only
- All AI-generated content needs disclaimers
- Hard stop screens must be warm and human — never cold error pages
- Attorney referral must be offered immediately on all attorney-flagged cases
- Standard disclaimer: "e2go.app is a preparation tool, not a law firm. Nothing on this platform constitutes legal advice."

---

## REAL STATISTICS — USE ONLY THESE

Never invent statistics. Use only:
- 54,364 E-2 visas issued FY2024 (Source: U.S. Dept. of State)
- 90% global E-2 approval rate FY2024
- $815 USD MRV fee (current consulate application fee)
- 3–6 weeks typical Toronto consulate processing time
- 2–5 years standard initial E-2 visa validity
- Unlimited renewals if status maintained

---

## STANDING BUILD RULES

Apply every one of these to every task in every session.
Never skip any of them.

### RULE 1 — SEO ON EVERY PAGE
Every page gets SEO metadata at the same time it is built.
Never build a page without adding:
- export const metadata with title and description
- Open Graph tags (og:title, og:description, og:url, og:image)
- Canonical URL
- robots: noindex for authenticated / tool pages (/quiz, /results, /dashboard, /apply/*, /admin, /login, /signup)
- JSON-LD schema where applicable (landing, /learn pages, /blog pages)

metadataBase is set in src/app/layout.tsx as https://e2go.app

Page SEO targets:
- / → "E-2 Visa Preparation for Canadians | e2go.app"
- /pricing → "E-2 Visa Application Pricing | e2go.app"
- /learn → "E-2 Visa Guide for Canadians | e2go.app"
- /learn/what-is-e2-visa → "What is the E-2 Visa? | e2go.app"
- /learn/requirements → "E-2 Visa Requirements for Canadians | e2go.app"
- /learn/investment → "How Much to Invest for an E-2 Visa | e2go.app"
- /learn/businesses → "What Businesses Qualify for E-2 Visa | e2go.app"
- /learn/canada → "E-2 Visa for Canadians — Complete Guide | e2go.app"

### RULE 2 — DATABASE SAFETY
- NEVER use DROP TABLE in any script
- NEVER use TRUNCATE in any script
- NEVER use DELETE without a specific WHERE clause
- ALWAYS use CREATE TABLE IF NOT EXISTS
- ALWAYS use CREATE INDEX IF NOT EXISTS
- ALWAYS show the complete SQL to the user before running anything against Supabase
- The schema script docs/schema_complete.sql must remain fully idempotent

### RULE 3 — ANSWER AUTO-SAVE
Every question answer in Module 3 must be saved to Supabase within 2 seconds of the user advancing to the next question. Never rely on end-of-tab or end-of-session saves. The answers table is the source of truth — not React state. On user return: detect last saved question, resume exactly there. Display: "Welcome back. You left off at [Tab], Question [N]. Ready to continue?"

### RULE 4 — NO AI KEYS IN BROWSER
All MiniMax/OpenRouter API calls go through src/app/api/ai/route.ts server-side only. The OPENROUTER_API_KEY must never appear in client-side code or be exposed to the browser under any circumstances.

### RULE 5 — DS-160 TERMINOLOGY
Every question in Module 3 must use exact DS-160 and U.S. government form terminology. Reference: docs/spec/module3_tab_a.md is the gold standard. Before writing any Module 3 question, verify the corresponding DS-160 field. Key rules:
- "E-2 Treaty Investor" not "E2 visa"
- "Nonimmigrant status" not "visa status"
- "Admitted" not "entered" · "Departed" not "left"
- "Refused" not "denied" (DS-160 uses "refused")
- Marital status options exactly: Single / Married / Common Law Marriage / Civil Union / Divorced / Legally Separated / Widowed

### RULE 6 — DESCRIPTIVE QUESTIONS
Every question in Module 3 requires all 5 elements:
1. Question text — plain English, specific (not "Marital status:" but "What is your current marital status?")
2. Tooltip — why we're asking and what it feeds
3. Option labels — descriptive (not "Yes/No" but "Yes — I have been refused / No — I have never been refused")
4. Helper text — what the officer looks for
5. Inline warning — where the answer has risk implications

### RULE 7 — DUAL-PURPOSE QUESTIONS
Every Module 2 and Module 3 question must pass:
- Test 1: Does this strengthen the visa application?
- Test 2: Does this also qualify/segment/route the lead?
If Test 1 only → ask it. If Test 2 only → do NOT ask it.
Commercial insight is always a byproduct of good visa preparation — never the driver.
Document each question: visa purpose + DS-160 reference + commercial byproduct (if any) + tooltip text.

### RULE 8 — DOCUMENT GENERATION SAFETY
- Generate ONE document at a time — never parallel
- Save each completed document to database immediately after it completes
- Never regenerate a document already saved and marked complete
- User never sees a document below quality threshold
- Quality gate must pass before any preview is shown
- On failure: auto-retry 3x, then background retry, then admin queue — never show error to user

### RULE 9 — LIFECYCLE TRACKING
Every significant user action must update the application_lifecycle table with a timestamp. Key events to record:
- first_visit_at, quiz_started_at, quiz_completed_at, quiz_outcome
- account_created_at, payment_completed_at, tier_purchased
- module1–6 started_at and completed_at
- generation_triggered_at, generation_completed_at
- simulator_first_run_at, simulator_sessions_total, simulator_best_score
- interview_date, outcome_recorded_at, outcome, approval_date
- total_journey_days (first_visit_at to approval_date)

### RULE 10 — BUILD TRACKER UPDATE
At the end of every session (triggered by "end session"):
- Mark all completed items as ✅ in BUILD_TRACKER.md
- Add new bugs to Known Issues with priority and fix
- Add new features discovered to New Features section
- Update Session Log with date, session number, completed work, decisions made
- Update "Claude Code priorities for next session" with top 5 tasks

### RULE 11 — ONE FILE PER COMMIT
Every commit describes exactly one file changed and why. No exceptions. Grouping multiple changes into one commit is prohibited. Commit message format: `filename: change description`

### RULE 12 — VERIFY WITH RAW OUTPUT
Every completed task ends with a raw verification command (git log --oneline, grep, tsc --noEmit). A paragraph saying "done" is never sufficient proof. Show the actual command output.

### RULE 13 — THREE STATES PER FEATURE
Before building any feature, spec the loading state, success state, and empty/error state. If you cannot describe all three, do not build it yet.

### RULE 14 — QA SNAPSHOT BEFORE EVERY PUSH
Before any git push, run npm run qa manually and review the full output — not just pass/fail. Look for:
- Dead buttons (onClick handlers that don't fire)
- Orphaned pages (routes with no navigation path to them)
- Broken links (404s in the network tab)
- Silent failures (actions that complete but don't update state)

The pre-push hook tells you pass/fail.
The manual qa run tells you what to investigate before it becomes a production bug.

Rule: never push solely because the hook passed. Review the output.

### RULE 15 — NO CANADA-ONLY ASSUMPTIONS
Every feature must work for any E-2 treaty country national. Never hardcode Canadian-specific language, fees, or consulate references into components. Use treaty country logic and consulate profiles from src/lib/treatyCountries.ts.

### RULE 16 — ALL FOUR MODULE 3 SCREEN STATES REQUIRED
INTRO, QUESTION, COMPLETION, RESUME. All four implemented before tab is considered complete.

### RULE 17 — TAB CONFIG JSON IS SINGLE SOURCE OF TRUTH
Navigation name, description, have-ready list, estimated time, all questions live in JSON config. Never hardcode tab content in components.

### RULE 18 — DOCUMENT CONDITIONALS ENFORCED
No document generated unless triggered by applicant answers. Check Document_Conditionals.md before generating any document.

### RULE 19 — COVER LETTER ALWAYS LAST
No exceptions. Auto-generates tab index from documents that actually exist. Never references documents not yet generated.

---

## PLATFORM BOUNDARIES

e2go builds visa application documentation only.

What we do:
- Guide applicants through building a complete consulate-ready E-2 application package
- Educate on what consulates look for
- Connect applicants with franchise brokers, franchisors, and attorneys as a convenience

What we never do:
- Recommend a specific business or franchise
- Tell an applicant their business is E-2 compatible
- Tell an applicant their business is not E-2 compatible
- Provide investment advice
- Provide legal advice

Approved educational framing:
Never say: 'this business qualifies for E-2'
Always say: 'here is what the consulate looks for in this business category'

Never say: 'this business does not qualify'
Always say: 'this category faces additional consular scrutiny — here is what that means for your application'

---

## LAWYER POSITIONING

Approved lawyer positioning — never deviate:
- Never say 'don't hire a lawyer'
- Never say 'you don't need a lawyer'
- Always say 'what you do with your finished package is up to you'
- Approved tagline: 'Lawyer-ready documents. Lawyer-optional price.'
- Approved comparison framing: 'If you choose attorney review at this stage, it is a 2-hour job, not a 20-hour one.'

---

## REVENUE STREAMS

Referral and commission revenue:

Scenario 1 — Franchise Explorer:
Trigger: user selects 'exploring franchise options' in Module 2
Action: offer franchise broker introduction
Revenue: referral fee from broker $150-$300

Scenario 2 — Franchise Identified (B2B Direct):
Trigger: user names a specific franchise brand
Action: offer direct franchisor introduction
Revenue: introduction commission $5,000-$15,000
Rule: only trigger if user named the brand themselves

Scenario 3 — Own Business:
Trigger: user has own business concept
Action: no referral
Revenue: platform fee only

All referrals require explicit CASL-compliant consent before any data is shared. Logged to consent_log table.

---

## DOCUMENT GENERATION PIPELINE

Two-batch document model:
- Batch 1 — generated immediately after payment: Declaration, Qualifications, Net Worth Statement, Spouse Declaration (if applicable)
- Batch 2 — generated as business formation completes: All remaining documents. Cover Letter always last.

Generate ONE document at a time in this exact order:

```
Step 1  → Declaration (Tab J)         → save to DB → continue
Step 2  → Qualifications (Tab J)     → save to DB → continue
Step 3  → Net Worth Statement (Tab H) → save to DB → continue
Step 4  → Spouse Declaration (Tab J) → save to DB → if applicable
Step 5  → Investment Proof (Tab F)   → save to DB → continue
Step 6  → Source of Funds (Tab H)     → save to DB → continue
Step 7  → Business Plan (Tab K)       → save to DB → continue
Step 8  → DS-160 Reference (Tab A)   → save to DB → continue
Step 9  → Treaty Country Statement    → save to DB → continue
Step 10 → Substantiality Narrative   → save to DB → continue
Step 11 → Develop & Direct Evidence  → save to DB → continue
Step 12 → Immigrant Intent Defense   → save to DB → continue
Step 13 → Denial Prevention Docs      → save to DB → continue
Step 14 → Renewal Readiness Docs     → save to DB → continue
Step 15 → Gap analysis (all docs)    → save gap report
Step 16 → Repetition checker         → save clean versions
Step 17 → Consistency checker        → lock final versions
Step 18 → Quality gate              → pass/fail per document
Step 19 → Cover Letter (Tab D)       → save to DB → ALWAYS LAST
Step 20 → Preview unlocked for user
```

Crash recovery:
- Scenario A (transient): auto-retry 3x — 30s, 2min, 5min
- Scenario B (one doc fails): others complete, retry failed doc every 15min for 24hrs, email user when recovered
- Scenario C (complete failure): preserve all completed docs, show "We'll email you when ready", auto-create support ticket, human review within 2 hours

Generation UI: NOT a spinner. Narrative progress screen showing each step completing in real time via Server-Sent Events. Conversational gap-fill questions woven in during generation.

---

## REFERRAL ENGINE

5 referral categories — all require explicit CASL consent captured at Module 1:

| Category | Trigger | Fee |
|---|---|---|
| Business Opportunity | Module 2 — no business selected | $150–$300/intro or 10–15% revenue share |
| Immigration Attorney | Attorney flag in quiz | $200–$400/intro |
| Cross-Border Banking | Module 8 or no US account | $100–$200/opened account |
| Cross-Border CPA | Module 9 or post-approval | $150–$250/intro |
| Real Estate | Tab G (commercial) / Post-approval (residential) | $150–$1,000/intro |

Smart routing for business opportunity leads:
- business_selected = YES → route DIRECT to franchisor (fee: $5,000–$15,000/closed deal)
- business_selected = NO → route to franchise broker (fee: $150–$300/intro)

All referrals use double opt-in: contact details released only after applicant responds to introduction email.

---

## B2B SUBSCRIPTION PRODUCTS (Phase 2)

Two separate partner portals:
- e2go Legal (/partner/attorney) — pre-qualified E-2 leads for immigration attorneys
- e2go Broker (/partner/broker) — pre-qualified investor profiles for franchise brokers

One lead → one subscriber (never broadcast). 48-hour response window before lead rotates. Partner agreement (DPA) required before dashboard access.

---

## UX RESILIENCE RULES

These behaviors are required — never cut corners on them:

1. **Answer auto-save** — every Module 3 answer saved within 2 seconds
2. **Session resume** — "Welcome back. You left off at Tab F, Question 8."
3. **Payment failure** — calm message + retry + recovery email within 15 minutes
4. **Hard stop screens** — warm, human, specific — never cold error pages. Offer attorney referral immediately.
5. **Document preview** — quality gate must pass first. Show strongest sections first.
6. **Post-payment** — celebration screen, not just a download button
7. **Interview score framing** — never lead with a number. "You've identified 4 areas to strengthen."
8. **Outcome recording** — approved/refused/processing. Celebration on approval. Compassion on refusal.
9. **Re-engagement emails** — Day 3, 7, 14 (Preparation Paralysis copy), 30 after signup with no progress

---

## NEWSLETTER — "THE E-2 INSIDER"

Cadence: every 2 weeks · Max 400 words · One value item · One CTA
Platform: Resend · CASL opt-in only · Unsubscribe on every email

4 segments: Pre-Application · In Application · Post-Approval · Referred Out

---

## EDUCATION HUB — /learn

Top-of-funnel SEO. Tone: educational, calm, no sales language.
8 sub-pages targeting: "E-2 visa Canada", "E-2 visa for Canadians", "how much to invest E-2 visa", "E-2 visa requirements Canada", "E-2 visa businesses that qualify", "Toronto consulate E-2 visa"

---

## SUPPORT TICKETING

Routes: /support · /support/new · /support/tickets
"Get Help" button fixed position on all authenticated pages.
Auto-create support ticket on document generation Scenario C failure.

---

## ADMIN PANEL

Route: /admin — never linked publicly, admin role required.
Contains: User stats, application pipeline, ticket management, API credit monitoring, revenue tracking, feature flags, maintenance mode.
API credit monitoring tracks: tokens per user, per module, per feature, daily burn rate, projected monthly cost, alert threshold.

---

## LIFECYCLE TRACKING

Table: application_lifecycle
Tracks every milestone from first_visit_at through approval_date.
Computed metric: total_journey_days = first_visit_at to approval_date.
This data generates publishable statistics after 50+ outcomes and is a core valuation asset.

---

## CONTENT LIBRARY

### PIECE 001 — "The Preparation Paralysis"
Use for: Day 14 re-engagement email · /learn "Are you ready?" section · Newsletter Issue 3 · LinkedIn/Reddit

> "Something I've been noticing across my DMs this month: The people who are most prepared are often the ones most paralyzed. I've spoken this week with people who have their funds sourced, their business model outlined, a state shortlisted, and a lawyer's number saved in their phone. Everything except the one thing that actually moves things forward — starting. It's not laziness; it's a form of fear that hides within preparation. One more question, one more piece of research, one more person to ask. I'm not judging it. I see it in every case type, every nationality, every income level. The research phase can quietly become a place to live."

CTA: "Your application is exactly where you left it." · "The quiz takes 10 minutes." · "One click to continue."

---

## KNOWN ISSUES AS OF SESSION 3 END

| Issue | Priority | Fix |
|---|---|---|
| Dev server port 3001 vs tests | LOW | Update tests to use 3001 for dev |
| Quiz currency rate slow to load | LOW | Accept fallback UX |

---

## SESSION LOG

### Session 1 — May 29, 2026
**Completed:**
- Module 0 questions v2.1 + scoring logic v1.1 finalized — JSON files locked
- Stitch design library — 10 screens complete in docs/stitch/
- Next.js scaffold — App Router, TypeScript, Tailwind
- All 5 core pages built: Landing, Quiz, Results, Pricing, Dashboard
- Nav + Footer shared components
- Supabase connected — {"connected":true} confirmed
- Database schema generated — users conflict being resolved
- CLAUDE_CONTEXT.md + BUILD_TRACKER.md created

**Key decisions:**
- Paywall moved to post-Module 3
- Interview simulator: 2 sessions included, $9.99/bundle extra
- Document generation: sequential + checkpointed
- Referral engine: 5 categories + real estate + relocation layer
- Smart lead routing: hot leads (business known) → direct to franchisor
- Franchise brokerage: e2go can operate directly — no license required
- B2B subscription products: attorney + broker portals (Phase 2)
- /learn education hub: 8 SEO-targeted sub-pages
- Lifecycle tracking: application_lifecycle table — start collecting from day 1
- "start session" / "end session" commands established
- 10 standing build rules established

**Session 2 priorities:**
1. Fix database schema (profiles table, all tables with RLS, lifecycle table)
2. Wire auth — login/signup to Supabase
3. Wire auth middleware — protect /dashboard, /apply/*
4. Wire quiz scoring engine to results page
5. Wire quiz save to Supabase (quiz_sessions + application_lifecycle)
6. Wire answer auto-save on every question
7. Add security headers to next.config.mjs
8. Build OpenRouter/MiniMax client (src/lib/ai.ts + /api/ai/route.ts)
9. Add SEO metadata to all existing pages
10. Test full flow: signup → quiz → results → pricing → dashboard
