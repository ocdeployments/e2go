# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 2 of 4: Product Architecture & Feature Specification
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

# SECTION 4 — PRODUCT ARCHITECTURE

## 4.1 Platform Decision: Web App First (No App Store)

Going web-first (responsive browser app + PWA option) is the correct decision:

| Factor | Native Mobile | Web App |
|--------|--------------|---------|
| App Store approval | Required — weeks, rejections possible | Not required |
| Revenue cut | Apple 30%, Google 15–30% | None — Stripe pays direct |
| Update deployment | Submit → review → days | Push → live in seconds |
| Legal category scrutiny | Immigration apps face extra review | None |
| Solo developer complexity | Very high | Manageable |
| Desktop (primary use case) | Requires separate build | Native in browser |
| Mobile | Yes | Yes (responsive + PWA install) |

PWA (Progressive Web App) gives 80% of native app experience:
- "Install to home screen" on mobile
- Offline document review
- Push notifications
- No App Store required

## 4.2 Tech Stack (Solo Builder)

| Layer | Technology | Monthly Cost |
|-------|-----------|-------------|
| Frontend | Next.js (React) | $0 (Vercel free tier) |
| Hosting | Vercel Pro | $20/mo |
| Database + Auth + Storage | Supabase Pro | $25/mo |
| AI Assistant | OpenRouter → MiniMax M1 | ~$50/mo |
| PDF Generation | WeasyPrint (serverless) | ~$30/mo |
| Payments | Stripe | 2.9% + $0.30/transaction |
| Email | Resend | Free tier |
| Error Monitoring | Sentry | Free → $26/mo at scale |
| DNS + CDN | Cloudflare | Free |
| Code Repository | GitHub | Free |
| AI Coding Agent | Claude Code + OpenRouter | ~$100–$150/mo |
| **Total Monthly (build phase)** | | **~$225–$400 USD** |

MiniMax M1 pricing: $0.40/1M input tokens, $2.20/1M output tokens
Cost per user session: ~$0.04–$0.08 USD
1 million token context window — entire KB + user history fits in one context

## 4.3 Data Architecture: Questions Only, No Raw Documents

**Core architectural principle:**
The app collects answers and structured data. It never receives or stores
original sensitive documents (passports, bank statements, tax returns,
financial records). These remain exclusively with the user.

**Three-layer intake model:**

Layer 1 — Typed Q&A (simple facts)
→ Personal details, names, dates, business name, state, investment amount
→ Entered directly in the interview engine, one question at a time

Layer 2 — App-Provided Spreadsheet Templates (structured financial data)
→ User downloads template, fills offline, re-uploads completed file
→ App parses immediately, extracts structured data, DISCARDS the file
→ Only normalized data (amounts, dates, categories) stored in database
→ Templates provided for:
   • Template 1: Investment Source & Path Tracker (funds chronology)
   • Template 2: Business Financial Projections (5-year P&L model)
   • Template 3: Business Asset & Expense Register (investment deployment)
   • Template 4: Organizational Chart Data (roles and structure)
   • Template 5: Employment & Hiring Plan (job creation schedule)

Layer 3 — Reference Checklist (documents the user holds)
→ App tells users exactly what to collect, why, and where it goes
→ App never receives the files — user assembles their own binder
→ Fully personalized: every line references their specific business,
   investment amount, and family composition

**Why this architecture:**
- Eliminates PIPEDA exposure for passport/financial document storage
- Eliminates cyber liability for sensitive document breach
- Dramatically simplifies ToS and Privacy Policy
- Creates trust: "We never see your documents" is a marketing advantage
- Remains fully complete: the app generates all written components from
  structured data; documents are the user's responsibility to physically collect

## 4.4 Database Schema Overview

Core tables:
- users (id, email, created_at, tier, application_type)
- application_records (id, user_id, principal_name, tier, status, score)
- answers (id, application_id, question_key, answer_value, answered_at)
- spreadsheet_data (id, application_id, template_type, parsed_json, uploaded_at)
- pdf_exports (id, application_id, export_type, exported_at, export_count)
- consent_log (id, user_id, tos_version, ip_hash, timestamp, action)
- devices (id, user_id, fingerprint_hash, registered_at, last_seen)
- outcomes (id, application_id, outcome, verification_level, ceac_id_hash,
            interview_date, visa_date, questions_asked, notes)
- referrals (id, application_id, partner_id, referral_type, consent_timestamp,
             data_payload_json, conversion_status, revenue_earned)
- timeline_submissions (id, application_id, consulate, days_to_interview,
                        days_to_visa, business_type, investment_range, outcome)

---

# SECTION 5 — FEATURE SPECIFICATIONS

## 5.1 Module Map

```
FREE TIER
└── Module 0: Eligibility Quiz + E-2 Education

PAID TIER — STANDARD ($247–$397)
├── Module 1: Onboarding + Consent + Application Type Routing
├── Module 2: Business Type Advisor
├── Module 3: Document Interview Engine (Tabs A–L)
│   ├── Tab A: DS-160 Reference Generator
│   ├── Tab B: Personal Information
│   ├── Tab C: Visa Category Confirmation
│   ├── Tab D: Cover Letter Generator
│   ├── Tab E: Ownership Structure
│   ├── Tab F: Investment Proof Guide
│   ├── Tab G: Real Business Evidence
│   ├── Tab H: Investment Substantiality + Funds Flow
│   ├── Tab I: Non-Marginality Evidence
│   ├── Tab J: Applicant Qualifications + Org Chart
│   ├── Tab K: Business Plan Generator
│   └── Tab L: Family Dependents
├── Module 4: Application Confidence Score (0–100)
├── Module 5: Pre-Submission Risk Analyzer
└── Module 6: PDF Package Generator + Binder Assembly Guide

PAID TIER — COMPLETE (+$50–$100 upgrade)
├── Module 7: LLC Formation Wizard (50-state)
├── Module 8: Banking Setup Guide
├── Module 9: Canadian Departure Tax Planner
├── Module 10: Interview Simulator (text + voice)
└── Module 11: Referral Engine (franchise + business brokers)

POST-APPROVAL (separate purchase or subscription)
├── Module 12: Compliance Calendar ($29/year)
├── Module 13: Renewal Module ($97 or $147)
├── Module 14: Green Card Pathway Roadmap
└── Module 15: Community Forum
```

## 5.2 Module 0 — Free Tier (Lead Generation)

Purpose: Prove product value before asking for payment. Convert free to paid.

Features:
- Eligibility quiz (citizenship, investment capacity, business intent, 
  criminal/immigration history)
- E-2 visa explainer content (sourced from kb/e2-visa.md)
- Application type router: Solo vs. Partnership vs. Change of Status
- Free paygate after eligibility confirmation: "You qualify. Here's your package."
- Email capture on eligibility confirmation (CASL-compliant opt-in)

## 5.3 Module 2 — Business Type Advisor

Purpose: Guide users to the right E-2-compatible business before building 
their application around the wrong one.

Features:
- Background questionnaire: experience, budget, risk tolerance, state preference,
  management style, hours preference, franchise vs. independent
- Business category cards with license complexity badges:
  🟢 Low complexity (cleaning, landscaping, staffing)
  🟡 Medium complexity (food service, retail, tutoring)
  🔴 High complexity (senior care, childcare, healthcare, cannabis ❌)
- Incompatible business detection: real estate passive, cannabis, marginal biz
- Investment amount warning: "Your budget of $X is below the recommended 
  minimum for this business type in this state"
- Business shortlist / save feature (up to 5)
- Referral trigger: "Want help finding a specific business?"

## 5.4 Module 3 — Document Interview Engine

The core product. Every question drives toward a specific piece of the 
application package. JSON-driven, branching logic, one question at a time.

Critical UX requirements:
- Auto-save after every answer (no progress loss, ever)
- Save and resume across sessions, devices, days
- Progress bar showing % complete per tab
- Inline "Why are we asking this?" tooltip on every question
- Micro-disclaimer on every advisory screen
- Spreadsheet template download/upload integrated at Tab F, H, K

**Tab F — Investment Proof (Template 1 Integration):**
App asks: "How did you accumulate your investment capital?" →
User selects sources → App presents Template 1 pre-configured for their
selected source types → User fills offline → Uploads completed template →
App validates: "Your investment total is $187,000. Your template traces
$182,500. Please account for the remaining $4,500." →
App generates: Source of funds narrative + funds flow timeline diagram

**Tab K — Business Plan (Template 2 Integration):**
App collects: business description, market, competitors, management team →
User downloads Template 2 → Fills 5-year financial model offline →
Uploads completed template → App validates projection realism →
App generates: Complete business plan narrative, financial projection
summary, capital allocation table, job creation schedule

## 5.5 Module 4 — Application Confidence Score

Scores the completed package across 8 dimensions (0–100 total):

| Dimension | Max Points | Basis |
|-----------|-----------|-------|
| Investment Substantiality | 25 | Amount, % of total cost, at-risk confirmation |
| Source & Path of Funds | 20 | Chronology completeness, lawful sources, no gaps |
| Non-Marginality | 20 | Revenue/income ratio, hiring plan, job creation |
| Active Direction & Development | 15 | Investor role, management title, responsibilities |
| Business Plan Quality | 10 | Market research, realistic projections, competition |
| Investor Qualifications | 5 | Experience, education, industry knowledge |
| Real & Operating Enterprise | 5 | Physical location, EIN, registration, bank account |
| Immigrant Intent Risk | Modifier | Canadian ties, home status, prior U.S. history |

Display: Traffic light dashboard, per-dimension breakdown, specific fix
recommendations for each flagged area, re-score after fixes.

Disclaimer (persistent): "This assessment reflects the completeness and 
strength of your application materials based on publicly documented E-2 
adjudication criteria. It is not a prediction of outcome. Consular 
decisions involve factors beyond the scope of any preparation tool."

Legal protection: The score evaluates YOUR INPUTS — not your visa.
You are grading their preparation, not predicting their result.

## 5.6 Module — Interview Simulator

Personalized to the user's specific application. The AI "officer" has
read their package. Questions are generated from their own data.

Personalization logic examples:
- IF business_type = "senior_care_franchise" → include licensing questions
- IF investment_source includes "property_sale" → include property sale questions
- IF year_1_revenue > 3x industry avg → flag projection challenge question
- IF num_employees_year_1 = 0 → include solo operator marginality question
- IF canadian_home = "sold" → include immigrant intent probe questions

Two modes:
1. Text mode — type answers, get feedback
2. Voice mode — speak answers (Whisper API transcription), same feedback engine

Per-answer feedback includes:
- Whether the answer addresses the officer's underlying concern
- A suggested stronger answer
- The key principle being tested
- Filler word count (voice mode)
- Answer duration vs. recommended range

End-of-session report: per-question rating, overall readiness score,
specific questions to practice before proceeding.

Repeat mode: unlimited sessions, question order varies, follow-ups 
occasionally inserted based on previous answers.

## 5.7 Module — PDF Package Generator

Outputs a complete, print-ready, consulate-formatted application package:

Generated documents (from user's answers + templates):
1. Cover letter (Tab D) — narrative generated from interview answers
2. Source of funds chronology — narrative from Template 1
3. Funds flow timeline diagram — visual from Template 1
4. Business plan (Tab K) — full document from interview + Template 2
5. 5-year financial projections — tables from Template 2
6. Capital allocation table — from Templates 2 + 3
7. Job creation narrative + chart — from Template 5
8. Organizational chart (Tab J) — auto-generated from Template 4
9. DS-160 reference sheet (Tab A) — pre-filled from interview answers
10. Binder assembly guide — personalized, tab-by-tab, every document
    named with instructions for obtaining and organizing it

PDF export controls:
- 3 exports per application (additional bundles: $19 for +3)
- Export logged with timestamp
- Page count tracker with 50-page limit warning (Toronto consulate limit)
- Cover page, tab divider pages, professional formatting

The Binder Assembly Guide (the organizing spine):
Every line is personalized:
"TAB F — PROOF OF INVESTMENT
□ Wire transfer confirmation: $[amount] transferred to [bank user named]
□ Signed office lease: [address user entered]
→ You confirmed your investment totals $[X]. These documents prove 
   funds are at risk. Wire reference number: [user's reference number]"

## 5.8 Module — Referral Engine

Triggered in Module 2 (Business Type Advisor) when user hasn't chosen a business.

In-app flow:
1. Business shortlist shown → "Want help finding the right specific business?"
2. User selects: Franchise consultant / Business broker / No thanks
3. Consent screen: shows exactly what data will be shared, with whom,
   that a referral fee may be received — explicit CASL/PIPEDA compliance
4. Minimal data payload transmitted via secure webhook to partner CRM:
   {first_name, email, business_categories, budget, target_states, timeline}
5. No immigration data, no financial history, no passport information shared
6. Closed loop: partner confirms placement → app pre-populates business 
   type in Module 2 → user continues application seamlessly

Partner network:
- FranNet (franchise consulting — pays referrer from franchisor fee)
- FranChoice (same model)
- Transworld Business Advisors (existing businesses — 10–15% of commission)
- Northwest Registered Agents (LLC formation — $50–100/signup)
- TD Bank Cross-Border (banking — $50–150/account)
- Cardinal Point (CPA — $100–300/client)
- 3 vetted E-2 attorneys (complex cases — 15–20% of first-year fees)

## 5.9 Module — Outcome Capture & Verification

**The outcome database is the product becoming more valuable over time.**
Every verified outcome makes the wait-time tracker more accurate, the 
interview simulator more realistic, the confidence score more predictive,
and the marketing more credible.

Five-stage capture system:

Stage 1 — Pre-interview activation (3 days before interview)
Email primes the user to report their outcome afterward.
Framed as: "Help the next Canadian who's where you were 6 months ago."

Stage 2 — 24-hour post-interview capture
Push notification + email. Three-button design:
[My visa was approved ✅] [I received a 221(g) ⚠️] [I need to talk ❌]
Each button opens a 90-second capture form for the relevant outcome.

Stage 3 — Automated follow-up for non-responders
Day 1: First ask
Day 4: Gentle nudge
Day 10: Community value reframe with live statistics
Day 21: Final ask + incentive (free Compliance Calendar year, worth $29)
Day 30: Auto-archive as "outcome unknown"

Stage 4 — Outcome verification (four-level trust system)
Level 4 ✅ Dual Verified: User confirmed + automated CEAC match
Level 3 ✅ CEAC Verified: User confirmed CEAC + Application ID consistency
Level 2 ✅ Self-Reported: User confirmed + behavioural pattern consistent
Level 1 ○ Unverified: Reported but no verification — excluded from stats

CEAC verification method:
- DS-160 Application ID collected during interview module (stored as hash)
- User opens ceac.state.gov, enters their own credentials, confirms status
- App cross-references against stored Application ID — cannot be spoofed
  with a different person's ID
- Optional: automated CEAC lookup using Application ID + consulate + surname
  as passive secondary confirmation (CAPTCHA solve service, ~$1–2/lookup)

Behavioural verification:
- Approved users: log in post-approval, open compliance calendar, referral link
- Denied users: brief login, access 221(g) guide, go dormant
- Behaviour pattern mismatch flags for manual review

Stage 5 — What the database powers
- Live Toronto wait-time tracker (segmented by business type, family composition)
- Interview question heatmap (most asked questions by business type)
- Confidence score calibration (correlates scores with approval rates)
- "Surprise questions" KB — community-reported unexpected questions become
  new simulator questions
- Marketing stats: "94% of verified E2Pathway users received approval"
- Denial root cause analysis → drives product improvements

Post-approval relationship timeline:
Week 2: "First 30 days in the U.S. checklist"
Month 2: "Have you opened your U.S. business bank account?"
Month 6: "Your I-94 status — what to watch"
Year 1: "Annual business review — renewal readiness score"
Year 2: "2-year compliance milestone"
Year 4: "Toronto renewal is 12 months away"
Year 4.5: "Final renewal window alert"
