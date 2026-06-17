# E-2 Visa — Consulate Interview Question Master Bank
## Authoritative Reference for Simulator Coaching, Prep Kit Generation, and Evaluation Engine

**Version:** 1.0 — June 17, 2026
**Sources:** Documented Toronto consulate experiences, attorney reports, E2Pathway knowledge base,
             9 FAM 402.9, USEmb-CA E-visa FAQs, E2_Engine_Knowledge_Base_June3_2026.md
**Simulator mapping:** IQ ID → matches UQ/WP/BT IDs in src/lib/simulator-engine.ts

This is the gold-standard answer framework for every question a consular officer asks at
the E-2 interview window. Every coaching recommendation the app produces must be grounded
in this document. When a client answers poorly, the coaching engine references this bank
to provide doctrinally correct, case-specific guidance.

---

## HOW TO USE THIS DOCUMENT

Each entry has five components:
- **What the officer is testing** — the legal or credibility test being applied
- **Key principles** — what every strong answer must cover
- **Red flags** — what triggers deeper scrutiny or a negative note
- **Gold-standard structure** — the answer architecture with [VARIABLE] placeholders
- **Toronto note** — consulate-specific intelligence where applicable

Use [VARIABLE] placeholders to inject the client's real case data before generating coaching.

---

## CATEGORY 1 — CORE OPENING QUESTIONS (Asked Every Time)

---

### IQ-01: Business Overview
**Simulator ID:** UQ-01
**Frequency:** Always — typically the first question asked
**Common phrasings:**
- "Give me an overview of your business."
- "Tell me about your business."
- "Describe your business to me in your own words."
- "What does your business actually do?"

**What the officer is testing:**
Whether the investor genuinely understands the enterprise they claim to be directing —
not whether they memorized a presentation, but whether they speak with earned, operational knowledge.

**Key principles — every strong answer covers:**
1. What the business does (product/service, customer profile)
2. Where it operates (city, state, physical location if applicable)
3. Current operational status (open, in build-out, pre-launch with specific timeline)
4. The business model (how it makes money, revenue per unit/client/transaction)
5. Scale indicator (number of employees, locations, or revenue — whichever is most impressive)
6. The investor's role in it (brief, to be expanded in IQ-04)

**Red flags:**
- Generic description that could apply to any business in the category
- Unable to state the location or current operational status
- Reciting a memorized paragraph verbatim (officers recognize scripted answers)
- Answer longer than 90 seconds without being asked to continue
- No mention of money, employees, or any concrete operational fact

**Gold-standard structure:**
"[BUSINESS_NAME] is a [BUSINESS_CATEGORY] based in [CITY, STATE].
We [what it does — one specific sentence]. Our customers are [customer profile].
The business [current status: is currently operational / opened [DATE] / is completing
build-out with opening scheduled for [DATE]]. I am the [ROLE] — I am responsible for
[2-3 specific management activities]. We currently have [EMPLOYEE_COUNT] employees
and project [YEAR_1_REVENUE] in Year 1 revenue."

**Toronto note:**
Toronto officers begin reviewing your package before you reach the window. Your business
overview should match your cover letter exactly — if you say something different from
what is written, it creates an inconsistency flag.

---

### IQ-02: Investment Amount and Allocation
**Simulator ID:** UQ-03
**Frequency:** Always
**Common phrasings:**
- "How much have you invested and how was it allocated?"
- "Walk me through your investment — what form did it take?"
- "What is the total amount committed to this business, and how was it deployed?"
- "Break that down for me — where did every dollar go?"

**What the officer is testing:**
Whether the investment is substantial, irrevocably committed, and at risk — and whether
the investor understands the allocation (not just the total).

**Key principles — every strong answer covers:**
1. The exact total amount (never rounded — "approximately" is a red flag)
2. The breakdown by category: franchise fee, build-out, equipment, working capital,
   professional fees, lease deposit
3. Whether funds are deployed (past tense: "have been spent") vs. still committed
4. The fact that funds are irrevocably committed (not refundable, not in escrow)
5. Documentation exists for every line item (implicit — the officer has it in Tab F/H)

**Red flags:**
- Giving only the total with no breakdown
- Saying the funds are "in the business account" but not deployed
- Inability to account for a significant portion of the investment
- Rounded numbers that don't match the Tab F documentation
- Describing funds as still in Canada or not yet transferred

**Gold-standard structure:**
"My total investment is [EXACT_AMOUNT] USD, fully deployed. The allocation is:
[FRANCHISE_FEE] to the franchise fee, [BUILDOUT] to build-out and renovations,
[EQUIPMENT] to equipment and fixtures, [WORKING_CAPITAL] in working capital,
and [PROFESSIONAL_FEES] to professional fees and licenses. All funds have been
transferred from Canada and are committed — wire transfer confirmations are in Tab F."

**Toronto note:**
Toronto officers check the investment breakdown against Tab F and Tab H. If your verbal
answer doesn't match the documented allocation to within a few thousand dollars, expect
a follow-up question.

---

### IQ-03: Source of Funds
**Simulator ID:** UQ-04
**Frequency:** Always — one of the most scrutinized questions
**Common phrasings:**
- "Where did your investment funds come from?"
- "How did you accumulate the funds to make this investment?"
- "Walk me through the source of your investment capital."
- "Explain the origin of the money you invested in this business."

**What the officer is testing:**
Lawful origin and full traceability of every dollar invested. Gaps in the paper trail
are the #1 reason for 221(g) administrative suspensions.

**Key principles — every strong answer covers:**
1. Every source of funds by name and type (savings, property sale, RRSP, gift, etc.)
2. The exact amount from each source
3. When each source was accessed (approximate date is sufficient)
4. The chronological path: source account → intermediate account → U.S. business account
5. Existence of documentation for each transfer (bank statements, wire records)

**Red flags:**
- Saying only "personal savings" without specifying the account, bank, or amount
- Multiple sources in the documents but only one mentioned verbally
- Inability to explain the path from source to business account
- Source that involves a third party (parent, friend) without explaining the gift/loan structure
- Mentioning a source that doesn't appear in Tab H documentation

**Gold-standard structure:**
"My investment of [TOTAL_AMOUNT] came from [NUMBER] sources.
[AMOUNT_1] came from [SOURCE_1: e.g., the sale of my property in Pickering in [DATE]
— net proceeds were deposited to my TD Bank account].
[IF_APPLICABLE: AMOUNT_2] came from [SOURCE_2: e.g., my RRSP withdrawal in [DATE]].
[IF_APPLICABLE: AMOUNT_3] came from [SOURCE_3].
All funds were then wired to my U.S. business account at [BANK_NAME] — the complete
paper trail including statements and wire confirmations is in Tab H."

**Toronto note:**
RRSP withdrawals are a known scrutiny area at Toronto. Officers sometimes ask how long
the RRSP was held, when the funds were contributed, and what tax implications were
considered. Know these answers in advance.

---

### IQ-04: Role and Day-to-Day Management
**Simulator ID:** UQ-02
**Frequency:** Always
**Common phrasings:**
- "What is your specific role in the business?"
- "What will you be doing on a day-to-day basis?"
- "How are you involved in the management of this business?"
- "Describe your responsibilities as the investor-operator."

**What the officer is testing:**
The "develop and direct" requirement under 9 FAM 402.9. The investor must be the
operational decision-maker — not a passive investor, not a figurehead.

**Key principles — every strong answer covers:**
1. A specific title (President and General Manager, CEO, Managing Director — never just "Owner")
2. 3-4 specific management decisions the investor makes (hiring, budget, vendors, strategy)
3. Who reports to the investor and how many direct reports
4. Physical presence expectations (full-time, on-site)
5. Distinction from any co-founder or manager who is NOT the E-2 investor

**Red flags:**
- Title is "Investor" or "Owner" without an operational title
- Vague language: "I'll oversee things," "I'll be in charge," "I'll manage it"
- Relying heavily on a hired manager for all operations
- Describing the role as part-time or remote
- Unable to name one specific decision they made last week (for operational businesses)

**Gold-standard structure:**
"I am the [TITLE] of [BUSINESS_NAME]. On a daily basis, I am responsible for:
staff scheduling and performance management, [SPECIFIC_ACTIVITY_2],
[SPECIFIC_ACTIVITY_3], and all financial decisions including [SPECIFIC_EXAMPLE].
I have [NUMBER] direct reports. This is my full-time position — I will be on-site
[DAYS/WEEK] and will make all operational decisions."

---

### IQ-05: Employment and Hiring Plan
**Simulator ID:** UQ-06
**Frequency:** Always
**Common phrasings:**
- "How many employees do you currently have, or plan to hire?"
- "What is your hiring plan for this business?"
- "Describe the jobs you will create for U.S. workers."

**What the officer is testing:**
Non-marginality. A business with no job creation plan signals it exists only to support
the investor's family — the definition of a marginal business.

**Key principles — every strong answer covers:**
1. Current employee count (even if zero, acknowledge it honestly)
2. Specific Year 1 hires: roles, count, timeline (by month, not "eventually")
3. Whether positions are full-time or part-time
4. That employees will be U.S. workers (not Canadian transfers)
5. How hiring connects to revenue (can't hire without cash flow — show the logic)

**Red flags:**
- "We'll hire when we need to" with no specific plan
- All planned hires are family members or co-nationals
- Year 1 plan of 0 employees with only vague future growth language
- Projected revenue that mathematically cannot support the stated employees

**Gold-standard structure:**
"We currently have [CURRENT_COUNT] employees. My Year 1 plan is to hire [YEAR_1_COUNT]
additional [U.S. citizen / U.S. resident] workers, beginning with [FIRST_HIRE_ROLE]
by [MONTH] — when our revenue reaches [MILESTONE] to support the payroll.
Full hiring plan is detailed in our business plan, Tab K."

---

## CATEGORY 2 — BUSINESS VIABILITY QUESTIONS

---

### IQ-06: Revenue Projections
**Simulator ID:** BT-related / UQ-05
**Frequency:** Very common
**Common phrasings:**
- "What are your revenue projections for Year 1 and Year 3?"
- "At what point will the business generate enough revenue to support your household?"
- "How do you plan to compensate yourself from this business?"

**What the officer is testing:**
Whether projections are credible, grounded in evidence, and whether the business exceeds
the marginality threshold.

**Key principles — every strong answer covers:**
1. Year 1 and Year 3 revenue figures (from memory, matching the business plan)
2. The evidence base for the projections (Item 19 FDD data, prior owner financials,
   local market research — never just "industry average")
3. The break-even month
4. That Year 1 revenue significantly exceeds household income need (non-marginality)
5. Owner compensation plan and when it starts

**Red flags:**
- Unable to state Year 1 or Year 3 numbers from memory
- Projections based only on national industry statistics
- Year 1 revenue that barely exceeds the investor's stated household income need
- No break-even analysis
- Round numbers without explanation ($200,000 exactly, $300,000 exactly)

**Gold-standard structure:**
"Our Year 1 projection is [YEAR_1_REVENUE], increasing to [YEAR_3_REVENUE] by Year 3.
These numbers are supported by [EVIDENCE: the franchisor's Item 19 Financial Performance
Representation / prior owner's 3-year financials / local market analysis].
We expect to break even by Month [BREAK_EVEN_MONTH]. My personal draw will be
[COMPENSATION], which is approximately [X]% of projected revenue — the business
is designed to generate significantly more than my household needs."

---

### IQ-07: Operational Status
**Simulator ID:** BT-related
**Frequency:** Very common
**Common phrasings:**
- "Is the business currently operational?"
- "What is the current status of the business?"

**What the officer is testing:**
Whether the investment is real and committed — not just a plan on paper.

**Key principles — every strong answer covers:**
1. Specific completed steps (LLC formed, EIN obtained, bank account open, lease signed,
   franchise fee paid, licenses applied for, equipment ordered)
2. What remains before opening (if not yet open)
3. Expected opening date (if pre-operational)
4. Evidence that money has been spent (makes it real)

**Red flags:**
- Business is only an LLC with no other steps taken
- Unable to name any concrete step completed beyond forming the entity
- Opening date unknown or "whenever the visa comes through"
- Lease not yet signed, franchise fee not paid, no equipment ordered

**Gold-standard structure:**
"The business [IS OPERATIONAL: has been operational since [DATE], currently serving
[CLIENTS/CUSTOMERS] / IS IN BUILD-OUT: we have completed [STEPS DONE] and are
currently [IN PROGRESS STEP]. We expect to open by [DATE]. To date we have [DEPLOYED
AMOUNT] in business expenses — receipts and contracts are in Tab F."

---

### IQ-08: Location Selection and Market Research
**Simulator ID:** BT-related
**Frequency:** Very common
**Common phrasings:**
- "Why did you choose this business in this location?"
- "Why this market?"
- "What research did you conduct before investing?"

**What the officer is testing:**
Whether this is a genuine, well-considered investment or an opportunistic visa application
with a business chosen only to meet E-2 requirements.

**Key principles — every strong answer covers:**
1. Personal connection to the location (prior time there, family there, or specific research)
2. Market-specific data (not national statistics — local demographics, competition gap)
3. Site visit or discovery day (shows genuine engagement)
4. How the investor's qualifications connect to this specific business in this location

**Red flags:**
- Chose location because it was cheap or available
- No site visit before committing
- Market research based entirely on national statistics
- Business category has nothing to do with the investor's background

**Gold-standard structure:**
"I chose [CITY] because [SPECIFIC LOCAL REASON: my research showed X, I conducted
a site visit in [DATE] and identified Y, the demographic data for the area shows Z].
I personally visited [MONTH/YEAR], met with [WHO: local operators, the franchisor's
area rep, existing franchisees], and verified that [SPECIFIC MARKET INSIGHT].
My background in [RELEVANT EXPERIENCE] directly prepares me for this market."

---

### IQ-09: Break-Even Analysis
**Simulator ID:** BT-related
**Frequency:** Common
**Common phrasings:**
- "What is the break-even point for this business?"
- "When will the business become profitable?"

**What the officer is testing:**
Whether the investor genuinely understands the financial mechanics of the business they
are investing in — not just the top-line projections.

**Key principles — every strong answer covers:**
1. The break-even month (specific number, not a range)
2. Monthly fixed costs (rent, payroll, royalties, insurance)
3. Revenue per unit/client/transaction needed to cover fixed costs
4. How many customers/units/transactions are needed monthly to break even
5. Why that number is achievable given the market

**Red flags:**
- "I think around Month 12" without knowing the actual mechanics
- Unable to state monthly fixed costs
- Break-even math doesn't work with the stated revenue projections

**Gold-standard structure:**
"We expect to break even by Month [NUMBER]. Our fixed monthly costs are approximately
[FIXED_COSTS]: [RENT] rent, [PAYROLL] payroll, [ROYALTY]% royalty, and [OTHER].
At our projected [REVENUE_PER_UNIT] per [transaction/client/visit], we need
[BREAK_EVEN_VOLUME] per month to cover these costs — which our market analysis
shows is achievable by Month [X] based on [EVIDENCE]."

---

### IQ-10: Competition and Differentiation
**Simulator ID:** BT-related
**Frequency:** Common
**Common phrasings:**
- "Who are your main competitors?"
- "How will you differentiate from the competition?"

**What the officer is testing:**
Whether genuine local market research was conducted — not just a national market overview.

**Key principles — every strong answer covers:**
1. Name 2-3 actual competitors in the specific city/region (by name, not category)
2. One specific weakness or gap in the competitor's offering
3. The investor's specific differentiator (not "better service" — what specifically)
4. Why the chosen location has room for this business

**Red flags:**
- "We will be better than the competition" with no specifics
- Naming national chains as competitors without local market knowledge
- No knowledge of who is operating in the same city

---

## CATEGORY 3 — INVESTMENT DRILL-DOWN QUESTIONS

---

### IQ-11: Funds Traceability (Source-Specific Follow-Up)
**Simulator ID:** WP-01 area
**Frequency:** Common — triggered by specific funding sources
**Common phrasings (property sale):**
- "How long did you own that property before selling?"
- "What were the net proceeds from the sale?"
**Common phrasings (RRSP):**
- "When did you withdraw those RRSP funds?"
- "What were the tax implications you considered?"
**Common phrasings (gift/inheritance):**
- "What is your relationship to the person who gave you this gift?"
- "Was this a loan or a gift?"

**What the officer is testing:**
That the funds are genuinely the investor's, from a legitimate source, and not a
structured arrangement to hide the true source.

**Key principles:**
1. Know the dates (acquisition date, sale date, withdrawal date) for every source
2. Know the amounts to the dollar (not "around")
3. Know the legal structure of any third-party funds (gift letter in file, loan agreement)
4. Know which bank accounts were involved and in what sequence

**Red flags:**
- Unable to state when a property was acquired or sold
- Inconsistency between verbal statement and Tab H documentation
- Third-party funds without a gift letter or loan agreement in the file
- RRSP funds that were contributed very recently before withdrawal (suggests circular structuring)

---

### IQ-12: Funds Path and Traceability
**Simulator ID:** UQ-04 follow-up
**Frequency:** Common
**Common phrasings:**
- "Can you walk me through the path of your funds from their source to the business account?"
- "How did the money get from Canada to the U.S. business account?"

**What the officer is testing:**
Complete paper trail — every account the money passed through. Gaps = administrative processing.

**Key principles:**
1. Chronological narrative — source → intermediate Canadian accounts → U.S. business account
2. The wire transfer amounts and dates
3. That no unexplained stops occurred along the way
4. Bank names and account types for each leg of the journey

**Gold-standard structure:**
"In [MONTH/YEAR], [SOURCE EVENT: my property sold / I withdrew my RRSP / etc.].
Net proceeds of [AMOUNT] were deposited to my [BANK] [ACCOUNT_TYPE] account.
In [MONTH/YEAR], I transferred [AMOUNT] to my [BANK_2] account, which I used
as the funding vehicle. In [MONTH/YEAR], I wired [AMOUNT] USD to my Chase
business account in [CITY, STATE]. The complete bank statement trail and wire
confirmation are in Tab H."

---

### IQ-13: Funds Deployment Status
**Simulator ID:** WP-01 follow-up
**Frequency:** Common
**Common phrasings:**
- "Are the funds fully deployed, or are some still in Canada?"
- "Has the money actually left Canada?"

**What the officer is testing:**
That the investment is genuinely at risk — funds still in a Canadian account are not
at risk and do not qualify toward the investment amount.

**Key principles:**
1. Majority of funds must be deployed (in the U.S. business account or spent)
2. If some funds remain uncommitted, explain why and when they will be deployed
3. The investment must be "irrevocably committed" — not just intended

**Red flags:**
- "Most of it is still in Canada, I'm waiting for the visa"
- Significant portion of investment described as "committed" but not transferred
- Working capital sitting in a Canadian account
- Franchise fee not yet paid

---

## CATEGORY 4 — QUALIFICATIONS AND EXPERIENCE QUESTIONS

---

### IQ-14: Experience and Qualifications
**Simulator ID:** UQ-07
**Frequency:** Very common
**Common phrasings:**
- "What experience do you have that qualifies you to run this business?"
- "Tell me about your professional background and how it relates to this business."
- "Why are you the right person to operate this particular business?"

**What the officer is testing:**
Whether the investor's background makes the business projection credible. Direct
industry experience is not required — but there must be a convincing connection.

**Key principles — every strong answer covers:**
1. Lead with the most relevant experience (management, financial oversight,
   client-facing operations, or industry-specific)
2. Draw explicit connections between past roles and the specific demands of this business
3. Quantify where possible (managed X staff, oversaw $X budget, served X clients)
4. Mention any franchise training completed or scheduled

**Red flags:**
- Background is entirely unrelated with no explanation of the connection
- Answer consists only of education credentials with no management experience
- Relies entirely on the franchise system without showing any personal management capacity

**Gold-standard structure:**
"I have [YEARS] years of experience in [MOST_RELEVANT_FIELD]. In my role as
[MOST_RECENT_RELEVANT_TITLE] at [COMPANY], I [SPECIFIC RELEVANT ACTIVITY:
managed a team of X / oversaw a P&L of $X / was responsible for Y].
This translates directly to [BUSINESS_NAME] because [SPECIFIC CONNECTION].
I have also completed [FRANCHISE_TRAINING / INDUSTRY_CERTIFICATION] and am
scheduled for [UPCOMING_TRAINING] before opening."

---

### IQ-15: Due Diligence — Research Before Investing
**Simulator ID:** BT-related (franchise)
**Frequency:** Common for franchise applicants
**Common phrasings:**
- "Have you spoken with existing franchisees?"
- "What research did you do before choosing this franchise?"
- "Did you attend a discovery day?"

**What the officer is testing:**
Whether this is a genuine investment decision — not just a visa strategy dressed up
as a business.

**Key principles:**
1. Discovery day attendance (or explanation if not attended)
2. Direct conversations with 2+ existing franchisees (names optional, results required)
3. FDD review — specifically Item 19 (financial performance) and Item 21 (financial statements)
4. Site visits to existing franchise locations
5. Independent financial review (accountant, attorney)

**Gold-standard structure:**
"I attended [FRANCHISOR] Discovery Day in [DATE]. I also spoke directly with
[NUMBER] existing franchisees in [STATES] — they confirmed [SPECIFIC FINDING].
I reviewed the Franchise Disclosure Document, in particular Item 19 which shows
[FINANCIAL DATA], and had it reviewed by my attorney [NAME]. I also visited
[NUMBER] franchise locations before committing."

---

### IQ-16: Franchise System Knowledge
**Simulator ID:** BT-related (franchise)
**Frequency:** Common for franchise applicants
**Common phrasings:**
- "What training does the franchisor provide?"
- "What are your royalty obligations?"

**What the officer is testing:**
That the investor actually understands the franchise system they signed a contract with.

**Key principles:**
1. Initial training: location, duration, curriculum
2. Ongoing support: field visits, marketing fund, call center, IT systems
3. Royalty rate and what it covers
4. Brand fund / marketing contribution
5. Territory rights

**Red flags:**
- Unable to state the royalty percentage
- Does not know what training is provided or has not attended
- Cannot describe what support the franchisor provides

---

## CATEGORY 5 — NONIMMIGRANT INTENT QUESTIONS

---

### IQ-17: Canadian Ties
**Simulator ID:** WP-05
**Frequency:** Always (explicitly or implicitly)
**Common phrasings:**
- "What ties do you maintain to Canada?"
- "What are your connections to your home country?"
- "What is keeping you connected to Canada during your time in the U.S.?"

**What the officer is testing:**
Nonimmigrant intent — the investor must have genuine reasons to return to Canada
when their E-2 status ends.

**Key principles — every strong answer covers:**
1. Property (own or maintain a home, rental property, or substantial lease in Canada)
2. Family (parents, siblings, extended family remaining in Canada)
3. Financial ties (Canadian bank accounts remaining open, Canadian investments, RRSP/TFSA)
4. Provincial health coverage maintenance (where applicable)
5. Professional ties (professional memberships, licenses retained)

**Red flags:**
- Have sold Canadian home before the interview (major red flag — see IQ-14 note)
- Family members all relocating to the U.S.
- All Canadian accounts closed
- "I don't really have ties — I plan to make the U.S. my home"

**Gold-standard structure:**
"I maintain several substantial ties to Canada. [PROPERTY TIE: I own my home in
[CITY], which I am maintaining while I operate the business / I have a rental property
in [CITY] generating income]. My [FAMILY TIE: parents / siblings] remain in Canada.
My Canadian bank accounts at [BANK] remain active, and I maintain my [PROVINCIAL]
health coverage. I also [ADDITIONAL TIE: retain my professional membership / maintain
Canadian investments / hold a long-term lease on X]."

**CRITICAL Toronto Note:**
Selling your Canadian home before the E-2 interview is one of the most common
triggers for a 214(b) immigrant intent finding. Documented Toronto consulate
experience shows officers specifically ask about this. Strong recommendation:
maintain the Canadian home — or at minimum a rental property — until after the
visa is approved.

---

### IQ-18: Return to Canada — Nonimmigrant Framing
**Simulator ID:** UQ-09
**Frequency:** Very common
**Common phrasings:**
- "Do you intend to remain in the U.S. permanently?"
- "Do you plan to apply for a green card?"
- "What would cause you to return to Canada?"
- "Do you understand that the E-2 requires you to maintain non-immigrant intent?"

**What the officer is testing:**
Whether the investor understands and accepts the nonimmigrant nature of the E-2.
This is a framing question — the investor must show they are not using E-2 as a
permanent residency strategy.

**Key principles — every strong answer covers:**
1. Explicitly acknowledge: "The E-2 is a nonimmigrant visa — I understand that"
2. State a concrete scenario that would cause return to Canada (business winds down,
   no longer eligible, personal decision)
3. Do NOT volunteer any mention of green card applications or permanent residency intent
4. Do NOT say "I plan to stay forever" or anything suggesting indefinite intent

**Gold-standard structure:**
"I understand the E-2 is a nonimmigrant visa. My focus is on building [BUSINESS_NAME]
into a successful business. If the business were no longer viable, or if I were no
longer eligible for E-2 status, I would return to Canada — my home and family ties
remain there. I have no plans to pursue permanent residency."

---

### IQ-19: Contingency If Visa Denied
**Simulator ID:** UQ-08
**Frequency:** Common
**Common phrasings:**
- "What happens to the business if your visa is not approved today?"
- "Do you have a contingency plan if you cannot operate from the United States?"
- "What will you do if this E-2 application is denied?"

**What the officer is testing:**
Two things simultaneously: (1) that the investor has Canadian presence to return to
(nonimmigrant intent), and (2) that the business investment is real and will not be
abandoned if the visa is denied.

**Key principles — every strong answer covers:**
1. Acknowledge the investment is real and made (not contingent on visa approval)
2. State the preservation plan (manage remotely from Canada, engage local manager,
   work with franchisor on interim arrangement)
3. Confirm the plan to refile or pursue an alternative pathway
4. Confirm Canadian base to return to

**Red flags:**
- "Everything would fall apart" (implies the entire investment was contingent on the visa)
- "I would just stay here on a tourist visa" (immigration violation)
- No mention of returning to Canada

**Gold-standard structure:**
"The investment has already been made — the business is real regardless of today's
outcome. If the visa is not approved, I would [SPECIFIC PLAN: manage the business
remotely from Canada with a local operations manager / work with the franchisor to
maintain operations / engage a U.S.-based manager temporarily]. I would then refile
with my attorney, addressing any concerns the officer raised. My home in [CITY]
is available to return to."

---

## CATEGORY 6 — 2026 UPDATED QUESTIONS (New at Toronto Consulate)

---

### IQ-20: Social Media and Personal Security Questions
**Simulator ID:** Not yet in question bank — add as UQ-10 / WP-06
**Frequency:** Now required at Toronto (as of May 2026)
**Common phrasings:**
- "What social media accounts do you have?"
- "[Officer searches your name] Can you tell me about this [search result]?"
- "Have you ever feared for your life or felt unsafe in your home country?"
- "Have you ever had any contact with a foreign government?"

**What the officer is testing:**
Three separate things:
(1) DS-160 accuracy — the form requires disclosure of all social media used in the past 5 years.
    Officers check whether you disclosed every account.
(2) Background vetting — your public online presence is reviewed during the interview.
(3) New security screening — officers are now required to ask whether you have feared
    for your safety in your home country (asylum-adjacent screening).

**Key principles — every strong answer covers:**
1. Know every social media account you listed on your DS-160 — and confirm it's complete
2. Be prepared to explain any business-related or public content that may appear in search results
3. For the safety question: answer honestly and briefly — if you have never feared for
   your safety in Canada, say so clearly: "No, I have not."

**Red flags:**
- DS-160 lists LinkedIn and Facebook, but you also have an Instagram or Twitter/X —
  incomplete disclosure is a credibility issue
- Search results show content that contradicts your application (e.g., a post saying
  you "can't wait to move to the U.S. permanently")
- Hesitation on the safety question

**Preparation actions (client must do before interview):**
1. Google yourself and know what appears
2. Review your DS-160 social media section and confirm it lists every active account
   from the past 5 years
3. Review your public social media posts for anything that could be read as evidence
   of immigrant intent (e.g., "moving to the U.S. for good!")

---

## APPENDIX A — QUESTION FREQUENCY REFERENCE

| ID | Question | Frequency | Simulator ID |
|----|----------|-----------|--------------|
| IQ-01 | Business overview | Always | UQ-01 |
| IQ-02 | Investment amount and allocation | Always | UQ-03 |
| IQ-03 | Source of funds | Always | UQ-04 |
| IQ-04 | Role and day-to-day management | Always | UQ-02 |
| IQ-05 | Employment and hiring plan | Always | UQ-06 |
| IQ-06 | Revenue projections | Very common | UQ-05 |
| IQ-07 | Operational status | Very common | BT |
| IQ-08 | Location and market research | Very common | BT |
| IQ-09 | Break-even analysis | Common | BT |
| IQ-10 | Competition and differentiation | Common | BT |
| IQ-11 | Source-specific funds drill-down | Common | WP-01 |
| IQ-12 | Funds path and traceability | Common | UQ-04 follow-up |
| IQ-13 | Funds deployment status | Common | WP-01 follow-up |
| IQ-14 | Experience and qualifications | Very common | UQ-07 |
| IQ-15 | Due diligence — franchise research | Common | BT (franchise) |
| IQ-16 | Franchise system knowledge | Common | BT (franchise) |
| IQ-17 | Canadian ties | Always | WP-05 |
| IQ-18 | Return to Canada / nonimmigrant framing | Very common | UQ-09 |
| IQ-19 | Contingency if denied | Common | UQ-08 |
| IQ-20 | Social media and security (2026) | Now required | UQ-10 (add) |

---

## APPENDIX B — TORONTO CONSULATE INTERVIEW INTELLIGENCE

**Processing volume:** High — second-highest Canadian E-2 volume
**Interview duration:** 5–10 minutes for well-prepared applicants; longer when officer has concerns
**Format:** Window interview (standing); officer reviews package before applicant arrives
**Language:** English (French available at the officer's discretion)
**Current focus areas (as of 2026):**
- Source of funds (especially RRSP withdrawals, gifts from family members)
- Non-marginality for sub-$300K investments in food service and retail
- Immigrant intent (specifically: Canadian home sale before interview)
- Social media disclosure completeness (new 2026 requirement)
- Management qualifications for businesses in regulated industries (healthcare, transport)

**What makes Toronto interviews short:**
- Cover letter answers all five of the officer's core questions in the first two pages
- Tab H source of funds chronology is complete with no gaps
- Applicant knows their numbers cold and answers concisely

**What causes Toronto administrative processing (221(g)):**
- Gaps in the source of funds paper trail
- Investment not yet at risk (funds still in Canada)
- Management role unclear or overly reliant on a U.S. manager
- Prior visa denial without clear explanation of what changed

---

*Last updated: June 17, 2026*
*Maintained by: e2go engineering team*
*Next review: Before any coaching-report prompt update*
