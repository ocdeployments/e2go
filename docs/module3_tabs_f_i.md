# Tabs F through I — Investment, Real Business, Funds Flow, Non-Marginality
## Module 3 Interview Engine
*Version 1.0 | May 28, 2026 | Source: U.S. Embassy Toronto, FAM 9 FAM 402.9*

---

# TAB F — Investment Proof

## Purpose

Tab F captures the full evidence of the investment itself — what was invested,
when it was committed, and how it is documented. This is the most document-heavy
section of the application and must address the "substantial" and "at risk"
requirements directly.

**Output:** Investment narrative + document checklist for Tab F binder section.

---

## Questions

### QF-01
**Question:** Has the investment been made into an existing business, or are
you starting a new business from scratch?
**Type:** select
**Options:**
- Existing business (acquiring an existing operation)
- New business (starting from scratch)
- Franchise (purchasing a franchise license and building the operation)
**Branch:** Each option adds specific document requirements to the Tab F checklist

### QF-02
**Question:** What is the total amount invested to date (in USD)?
**Type:** currency (USD)
**Note:** Pre-filled from Module 0 Q0-05 — confirm and finalize

### QF-03
**Question:** What is the total cost to establish or acquire the business
(in USD)?
**Type:** currency (USD)
**Tooltip:** This is the denominator for the proportionality test. If total
business cost is $150,000 and you have invested $150,000, you have invested
100% which is clearly substantial. If the total cost is $500,000 and you
have invested $200,000, you have invested 40% — the cover letter must argue
substantiality for the magnitude of the dollar amount.

### QF-04
**Question:** In what form has the investment been made?
**Type:** multiselect
**Options:**
- Cash transferred to U.S. business bank account
- Equipment purchased
- Inventory purchased
- Franchise fees paid
- Leasehold improvements (renovations/build-out)
- Professional fees paid (legal, accounting, consulting)
- Intellectual property transferred
- Other tangible assets
**Branch:** Each selected item → QF-04a (amount in USD for each)

### QF-05
**Question:** What is the source of your investment funds?
**Type:** multiselect
**Options:**
- Personal savings
- Sale of a Canadian property
- Sale of a Canadian business
- Inheritance or gift received
- Loan secured by personal assets
- Proceeds from investments (stocks, bonds, mutual funds)
- Other
**Branch:** Each selected option → documentation requirements added to checklist
**Branch:** "Loan" → QF-05a
**QF-05a:** Who is the lender? What is the loan amount? What personal assets
secure the loan?
**Type:** textarea

### QF-06
**Question:** Can you show a continuous paper trail from your personal account
to the business account in the United States?
**Type:** select
**Options:**
- Yes — complete, documented trail
- Mostly — there are some steps I can document
- No — there are gaps in the trail
**Branch:** Mostly / No → risk flag W-06 confirmed + advisory note

### QF-07
**Question:** What is the name and address of the U.S. business bank account?
**Type:** text (bank name, branch, account type)

### QF-08 — Existing Business Acquisition Only
*Shown if QF-01 = "Existing business"*
**Question:** How was the purchase price determined?
**Type:** select
**Options:**
- Formal business valuation by a certified appraiser
- Broker opinion of value
- Price negotiated directly between buyer and seller
- Other method
**Tooltip:** A formal business valuation significantly strengthens an
acquisition case. A certified appraisal showing the purchase price is
fair market value is ideal.

### QF-09 — Franchise Only
*Shown if QF-01 = "Franchise"*
**Question:** What is the name of the franchise system?
**Type:** text

### QF-10 — Franchise Only
**Question:** Has the franchise disclosure document (FDD) been received
and reviewed?
**Type:** select
**Options:** Yes / No / In progress

### QF-11 — Franchise Only
**Question:** Has the franchise agreement been signed?
**Type:** select
**Options:** Yes / No / In progress

## Tab F Document Checklist (Auto-Generated)

Based on QF-01 through QF-11 answers, the following documents are added
to the checklist:

| Document | Condition |
|----------|-----------|
| U.S. business bank account statements | Always |
| Wire transfer records or deposit receipts | Always |
| Canadian bank statements showing source of funds | Always |
| Net worth statement from certified professional accountant | Always (required by U.S. Embassy Toronto) |
| Purchase agreement or asset purchase agreement | If acquiring existing business |
| Business valuation or appraisal | If acquiring existing business |
| Franchise agreement | If franchise |
| Franchise disclosure document (FDD) | If franchise |
| Loan agreement and security documentation | If loan involved |
| Property sale closing documents | If funds from property sale |
| Investment account statements showing liquidation | If funds from investments |
| Inheritance or gift documentation | If inherited or gifted funds |

---

# TAB G — Real and Active Business Evidence

## Purpose

Tab G provides evidence that the business is a real, operating enterprise —
not a shell, not speculative, not a passive investment. This addresses the
consular officer's question: "Does this look like a real business?"

**Output:** Business evidence narrative + document checklist for Tab G.

---

## Questions

### QG-01
**Question:** Does the business have a physical location in the United States?
**Type:** select
**Options:**
- Yes — a dedicated commercial space I have leased or purchased
- Yes — a shared or co-working space
- Yes — a home-based office with client-facing operations elsewhere
- No — fully remote or online operations
**Tooltip:** A physical commercial space is not legally required but
significantly strengthens the case. Provide the lease or ownership documents
if applicable.
**Branch:** Yes (any) → QG-01a, QG-01b
**QG-01a:** What is the address of the business location?
**Type:** text
**QG-01b:** Is there a signed lease agreement?
**Type:** select: Yes / No / In progress

### QG-02
**Question:** What is the current operational status of the business?
**Type:** select
**Options:**
- Fully operational
- Open but pre-revenue (launched, no sales yet)
- In setup phase (not yet open)
- Entity formed but operations not yet started

### QG-03
**Question:** Does the business have any licenses or permits?
**Type:** multiselect
**Options:**
- State business license
- Local business license
- Industry-specific license (food service, health, contractor, etc.)
- Federal permit or registration
- None yet — in progress
- Not applicable for this business type

### QG-04
**Question:** Has the business registered for state sales tax or a state
tax ID?
**Type:** select
**Options:** Yes / No / Not required for this business type

### QG-05
**Question:** Does the business have a website or visible online presence?
**Type:** select
**Options:** Yes / No / In progress
**Branch:** Yes → QG-05a
**QG-05a:** What is the website URL?
**Type:** text

### QG-06
**Question:** Has the business opened any trade accounts, vendor relationships,
or supplier agreements?
**Type:** select
**Options:** Yes / No / In progress
**Branch:** Yes → QG-06a (list key vendors/suppliers and nature of relationship)
**Type:** textarea

### QG-07
**Question:** Does the business have any signed customer contracts, letters
of intent, or purchase orders?
**Type:** select
**Options:** Yes / No / Not yet
**Branch:** Yes → QG-07a (describe briefly)
**Type:** textarea

## Tab G Document Checklist (Auto-Generated)

| Document | Condition |
|----------|-----------|
| Commercial lease agreement | If physical location leased |
| Property purchase documents | If location owned |
| Business license(s) | If obtained |
| State/local registration certificate | Always |
| EIN confirmation letter (IRS SS-4) | Always |
| Screenshots of business website | If website exists |
| Vendor agreements or purchase orders | If applicable |
| Client contracts or letters of intent | If applicable |
| Photos of business premises | If physical location exists |

---

# TAB H — Source and Path of Funds

## Purpose

Tab H is the detailed funds-flow documentation section. Where Tab F asks
WHAT was invested and HOW MUCH, Tab H asks WHERE it came from and
HOW it moved from Canada to the U.S. business. This must be documented
in a clear, unbroken chain.

**Output:** Funds flow narrative + document checklist for Tab H.

---

## Questions

### QH-01
**Question:** Walk us through exactly how the investment funds moved from
your personal possession to the U.S. business account — step by step.
**Type:** textarea (structured)
**Tooltip:** Describe each step in the chain. For example: "1. $200,000
in savings held in TD Bank account ending 1234. 2. Transferred to
RBC chequing account ending 5678 on March 1, 2026. 3. Wire transferred
to U.S. Bank business account ending 9012 on March 15, 2026."
**Note:** This is the single most important question in Tab H.
Each step described here will correspond to a document in the checklist.

### QH-02
**Question:** Over what period of time were the funds accumulated?
**Type:** select
**Options:**
- Recently (within the past 12 months)
- Over 1–5 years
- Over more than 5 years
- Combination of savings over time and recent liquidation of assets

### QH-03
**Question:** Were the investment funds ever held in more than one currency
before being converted to USD?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QH-03a
**QH-03a:** What currencies were involved, and approximately when was each
conversion made?
**Type:** textarea

### QH-04
**Question:** Were any of the funds a gift or inheritance?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QH-04a, QH-04b
**QH-04a:** Who provided the gift or inheritance? What is your relationship?
**Type:** text
**QH-04b:** When was it received, and can you document it?
**Type:** textarea

### QH-05
**Question:** Were any of the funds proceeds from the sale of a property?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QH-05a, QH-05b
**QH-05a:** What property was sold, and when was closing completed?
**Type:** text
**QH-05b:** What were the net proceeds after mortgage repayment and closing costs?
**Type:** currency (CAD)

### QH-06
**Question:** Were any of the funds proceeds from the sale of a business?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QH-06a
**QH-06a:** Describe the business, the sale date, and the net proceeds received.
**Type:** textarea

## Tab H Document Checklist (Auto-Generated)

| Document | Condition |
|----------|-----------|
| Canadian bank statements (12–24 months) | Always |
| U.S. business bank statements | Always |
| Wire transfer confirmations | Always |
| Currency conversion records | If multi-currency involved |
| Gift letter (signed and notarized) | If gift involved |
| Gift-giver's bank statements | If gift involved |
| Property sale closing statement (HUD-1 or equivalent) | If property sold |
| Business sale agreement and closing documents | If business sold |
| Investment account statements with liquidation records | If investments liquidated |

---

# TAB I — Non-Marginality Evidence

## Purpose

Tab I demonstrates that the business is not marginal — meaning it does more
than provide a minimal living for the investor. Per FAM 9 FAM 402.9-6(E),
the business must either currently make a significant economic contribution
or have the present capacity to do so in the near future. Specifically it must
generate income well beyond what is needed to support the investor and their
family, OR make a significant contribution to the U.S. economy through job
creation, economic activity, or tax revenue.

**Output:** Non-marginality narrative + 5-year financial projection summary
table (to complement the full business plan in Tab K).

---

## Questions

### QI-01
**Question:** How many employees does the business currently have (not
counting yourself)?
**Type:** number
**Note:** Zero is valid for a startup, but triggers the projection requirement

### QI-02
**Question:** How many employees do you plan to hire in the first 12 months?
**Type:** number

### QI-03
**Question:** How many total employees do you project at the end of Year 3?
**Type:** number
**Tooltip:** Job creation is one of the most important non-marginality
factors. Consular officers look for a clear, credible hiring plan with
specific roles and timelines.

### QI-04
**Question:** What type of positions do you plan to hire?
**Type:** textarea
**Example:** "2 full-time customer service representatives, 1 part-time
delivery driver, and 1 part-time bookkeeper in Year 1."

### QI-05
**Question:** What is your projected gross revenue for each of the first
five years?
**Type:** currency group (USD, one field per year)
**Fields:** Year 1 / Year 2 / Year 3 / Year 4 / Year 5
**Tooltip:** These projections must be reasonable and supportable. They
feed the financial projections in Tab K and are reviewed by the consular
officer. Projections that look inflated or have no basis will raise questions.

### QI-06
**Question:** What is your projected net income for each of the first
five years?
**Type:** currency group (USD, one field per year)
**Fields:** Year 1 / Year 2 / Year 3 / Year 4 / Year 5

### QI-07
**Question:** What is your personal living expense requirement per year
while in the United States?
**Type:** currency (USD)
**Tooltip:** This is used to compare projected business income against
personal need. If projected net income is only slightly above your living
costs, the case for non-marginality is weaker.

### QI-08
**Question:** Beyond income for yourself, how does this business contribute
to the U.S. economy?
**Type:** multiselect
**Options:**
- Job creation for U.S. workers
- Tax contributions (payroll, sales, corporate)
- Supporting a local underserved market
- Franchise expanding a U.S. brand
- Importing goods or services with U.S. economic benefit
- Other contribution
**Branch:** Each selected → brief description textarea

## Tab I Document Checklist (Auto-Generated)

| Document | Condition |
|----------|-----------|
| 5-year financial projections (P&L, cash flow) | Always |
| Payroll records or hiring agreements | If employees already hired |
| Job descriptions for planned hires | If projections reference hiring |
| Market analysis supporting revenue projections | If available |
| Franchise performance disclosure data | If franchise |

---
