# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 1 of 4: Vision, Market & Business Case
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

# SECTION 1 — THE IDEA

## 1.1 What This Product Is

E2Pathway is a self-service, web-based application that guides Canadian citizens
through the complete E-2 Treaty Investor visa process — from eligibility assessment
through business selection, document preparation, interview simulation, and post-
approval lifecycle management.

It replaces the $6,500–$15,000 immigration attorney engagement with a $247–$647
software product that produces the same output: a complete, consulate-formatted
application package ready for the Toronto interview.

**The single-sentence pitch:**
"Everything a Canadian needs to apply for the E-2 investor visa — guided,
organized, and generated — without a lawyer."

## 1.2 The Core Problem Being Solved

The E-2 visa process for Canadians is:
- Expensive: attorneys charge $6,500–$15,000 for the application alone
- Confusing: 11 tabbed sections (A–L), each with specific formatting rules
- Fragmented: business selection, LLC formation, banking, Canadian departure tax,
  and visa preparation are handled by 4–5 different professionals with no
  coordination between them
- Poorly supported: no purpose-built self-service tool exists for this specific
  applicant type anywhere in the world

## 1.3 Why Now

- 54,364 E-2 visas were issued globally in FY2024 — a record high
- Canadians are the #1 or #2 source country for E-2 applicants annually
- The Toronto consulate is the world's most experienced E-2 processing post
- Canadian emigration to the U.S. is accelerating — Facebook groups, Reddit
  communities, and YouTube channels serving this audience are growing rapidly
- No competitor serves this specific intersection: Canadian + E-2 + self-service
- VisaPal (the closest new entrant) covers 62 visa types with 1 inch of depth
  on each; we go a mile deep on one

## 1.4 The Founding Philosophy (soul.md)

- We are not an immigration lawyer. We are not trying to be one.
- We collect answers, not documents. All sensitive original documents remain
  with the user at all times.
- We are the only product in the world built exclusively for one visa, one
  applicant type, and one life transition.
- Our price must always be anchored against the attorney alternative — not
  against other software. We compete with a $10,000 legal bill.
- Every screen must make the user feel capable, not overwhelmed.
- We never leave a user in a dead end. Every error, every gap, every denial
  has a next step.
- The app speaks like a knowledgeable, encouraging friend — never like a
  government form or a legal disclaimer.

---

# SECTION 2 — MARKET RESEARCH

## 2.1 The Competitive Landscape

### Boundless (boundless.com)
- Focus: Family-based immigration (marriage green cards, K-1, citizenship)
- E-2 coverage: Blog articles only — no application product
- Strengths: 5,000+ Trustpilot reviews, intuitive UI, flat-rate pricing,
  12-month payment plans
- Weaknesses: Attorney bottlenecks, critical errors in generated addendums
  (documented Reddit cases), premium package overpromising, glitches at
  high-stakes moments, responsibility deflection when errors occur
- Why it's not us: U.S. domestic family immigration; no Canadian content,
  no investor visa product

### Alma (tryalma.com)
- Focus: Employment-based visas (O-1A, H-1B, L-1, EB-1, EB-2)
- E-2 coverage: Guide pages only
- Strengths: Enterprise compliance features, real-time case dashboards
- Weaknesses: Requires attorneys at every step, not self-service
- Why it's not us: Serves tech workers and employers, not investors

### VisaPal (tryvisapal.com)
- Focus: AI-powered platform covering 62 USCIS visa categories
- E-2 coverage: Listed as one of 78+ types — no depth
- Strengths: Voice intake, evidence automation, interview simulator, 
  attorney QA layer
- Weaknesses: Requires attorney QA (not truly self-service), broad not deep,
  no Canadian-specific content, no departure tax, no Toronto consulate specifics
- Why it's not us: A mile wide, an inch deep; we go a mile deep on one visa

### Visto.ai
- Focus: B2B — sells immigration automation to law firms
- E-2 coverage: None consumer-facing
- Confirms: Market is moving toward self-service; even lawyers want automation

### CanPR (mobile app)
- Focus: Immigrating TO Canada (wrong direction)
- Relevance: Validates the mobile/app format for immigration guidance;
  launched from Mississauga, Ontario

## 2.2 Lessons From Competitors

### What Works (Steal These)
- Software-guided checklists praised universally (Boundless)
- Flat-rate transparent pricing builds trust before purchase
- Progress tracking gives users a sense of control
- Quick response to standard questions valued
- Voice intake reduces friction (VisaPal)
- Interview simulator confirmed as high-value (VisaPal)
- Offline document review (CanPR)

### What Fails (Avoid These)
- AI-generated legal content with factual errors — catastrophic (Boundless)
- Glitches during document upload at high-stakes moments (Boundless)
- Premium pricing that overpromises and underdelivers (Boundless)
- Deflecting responsibility when errors occur (Boundless)
- Attorney-in-loop creating bottlenecks and inconsistent quality (Boundless/Alma)
- Generic content across too many visa types (VisaPal)
- Hidden or unclear fee structures (VisaPal)
- Government portal UX — error messages, data loss, dehumanizing (IRCC)

### Non-Negotiable Build Rules Derived From Competitor Failures
1. Never generate a legal document with inferred data — only use what the
   user explicitly provided
2. Auto-save after every input — never lose a user's progress
3. Confirm every upload with a preview — user must see receipt
4. State precisely what the app does AND doesn't do on every pricing surface
5. Never promise attorney-quality review unless an attorney reviewed it
6. The PDF export must work first time, every time, on every device
7. Load test for the 11pm-before-interview scenario
8. Always provide a "talk to a human" path to vetted partner attorneys
9. Every error state tells the user exactly what went wrong and what to do
10. Every screen uses warm, encouraging language — never bureaucratic

## 2.3 Target Communities (Marketing Intelligence)

### Primary Facebook Groups
- "Canadians Moving to Florida & USA" (Group ID: 560188715440506)
  → Active, large, runs live expos covering healthcare, mortgages, immigration
  → Recurring questions: E-2 process, best Florida cities, CPP/banking,
    pros/cons of moving, finding a business

- "Moving to Florida with E2 Visa" (Group ID: 886710660170922)
  → E-2 specific — highest intent audience on Facebook

### Reddit
- r/e2visa — active, high-quality discussions, real timeline reports
- r/immigration, r/USCIS — broader but reach Canadians in early research phase

### Pain Points Documented From These Communities
- "How do I even start?" — eligibility confusion
- "What business should I buy?" — selection paralysis
- "How do I prove my investment came from legitimate sources?" — funds trail
- "What do they actually ask at the Toronto interview?" — interview anxiety
- "What happens to my CPP/OAS/RRSP when I leave?" — financial confusion
- "Do I need to sell my house before or after?" — departure timing
- "What if the business fails?" — downside planning
- "How long will the Toronto consulate take?" — timeline anxiety
- "My kids are 19 and 17 — what happens to them?" — age-out concern
- "Can my husband and I both be on the E-2?" — partnership questions

## 2.4 Market Size

- 54,364 E-2 visas issued in FY2024 (record)
- Canadian E-2 applicants: estimated 8,000–12,000 annually
  (Canada is top 1-2 source country)
- Renewal market: same applicants return every 2–5 years indefinitely
- Total annual addressable market (Canada only): ~$2.4M–$4.7M at $297 avg
- With referral revenue: effective revenue per user ~$1,467
- Total effective TAM: ~$11.7M–$17.5M annually (Canada only)
- Global expansion (UK, Australia, Germany, France, Japan): 5–8x multiplier

---

# SECTION 3 — PRICING & REVENUE MODEL

## 3.1 The Value Anchor

The app must always be priced against the attorney alternative:

| Service Replaced | Attorney Cost | App Cost | User Saving |
|-----------------|--------------|----------|-------------|
| E-2 attorney (full package) | $6,500–$10,000 | — | — |
| Business plan writer | $1,500–$3,000 | — | — |
| LLC formation lawyer | $2,000–$5,000 | — | — |
| Cross-border CPA (initial) | $2,000–$5,000 | — | — |
| Government fees (family of 3) | ~$1,695 | ~$1,695 (not replaced) | — |
| TOTAL replaceable cost | $12,000–$18,000 | $247–$647 | $11,353–$17,353 |

## 3.2 Application Type Tiers

### Type A — Solo Investor Application
| Tier | Coverage | Price |
|------|----------|-------|
| Solo Individual | 1 investor, no family | $247 |
| Solo Couple | 1 investor + spouse | $297 |
| Solo Family (≤2 kids) | 1 investor + spouse + up to 2 children | $347 |
| Solo Extended (3–5 kids) | 1 investor + spouse + 3–5 children | $397 |

### Type B — Partnership Application (2 Co-Investors, 50/50)
| Tier | Coverage | Price |
|------|----------|-------|
| Partnership — No Families | 2 investors only | $447 |
| Partnership — Two Couples | 2 investors + 2 spouses | $547 |
| Partnership — Two Full Families | 2 investors + 2 spouses + up to 4 kids | $647 |

### Add-Ons
| Item | Price |
|------|-------|
| Extra dependent (beyond tier limit) | +$25/person |
| Extra PDF export bundle (+3 exports) | +$19 |
| Renewal Module (returning users) | $97 |
| Renewal Module (new users, history entry) | $147 |
| Compliance Calendar (annual) | $29/year |

## 3.3 Revenue Streams

| Stream | Per User | At 200 Users/Month |
|--------|----------|--------------------|
| App purchase (avg $347) | $347 | $69,400 |
| Franchise referral (25% × $3,000 avg) | $750 | $15,000 |
| Business broker referral (10% × $2,000) | $200 | $4,000 |
| LLC/registered agent affiliate | $45 | $9,000 |
| Banking referral | $50 | $10,000 |
| CPA referral | $60 | $12,000 |
| Attorney referral | $15 | $3,000 |
| **Effective total per user** | **~$1,467** | **~$122,400/mo** |

## 3.4 Pricing Model: One-Time Payment

- NOT a subscription (32% of consumers actively dislike subscriptions)
- One-time payment per application — mirrors the consulate's own per-person model
- Payment plan option: 2 payments of 50% (increases conversion at higher tiers)
- Only ongoing subscription: $29/year Compliance Calendar (opt-in post-approval)

## 3.5 Anti-Sharing / License Protection

- Each purchase creates one Application Record bound to the principal
  applicant's name entered at purchase
- Application ID is locked — a different principal applicant name triggers
  a new purchase requirement
- PDF export cap: 3 exports per application (additional bundle: $19)
- Device limit: 3 registered devices per account
- Concurrent session alert: owner notified when new device accesses account
- Design-layer protection: every generated document bears the user's name,
  business, and financial story — sharing doesn't work because the content
  is wrong for any other person
- ToS clause: explicit prohibition on transfer, resale, or use for other
  applicants

## 3.6 Exit Valuation

At scale, using 2026 private SaaS multiples (~4.7x ARR):
| Revenue Scenario | ARR | Est. Exit Value |
|-----------------|-----|-----------------|
| 200 users/month | ~$833K | ~$3.9M |
| 400 users/month | ~$1.78M | ~$9.8M |
| 800 users/month + B2B | ~$4M | ~$24M |

Strategic acquirers: Boundless, VisaPal, franchise broker networks,
cross-border financial firms, PE-backed law firm rollups.
