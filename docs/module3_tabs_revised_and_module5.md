# Tabs F, H, I, D — Revised Questions (Post-Denial Audit)
## Module 3 Interview Engine — Version 1.1
## May 28, 2026 | Denial-hardened revision

---

# TAB F — Investment Proof (REVISED)

### New Question QF-NEW-01
**Position:** After QF-04 (investment form)
**Question:** Has any of the investment capital actually been spent on
business expenses — such as a signed lease, equipment purchase, inventory,
franchise fee, or professional fees?
**Type:** select
**Options:**
- Yes — substantially all funds are committed to specific expenses
- Yes — partially spent, some funds still in business account
- No — funds have been transferred to the U.S. account but not yet spent
**Why this is asked:** Funds sitting idle in a business bank account are
NOT considered "at risk" and are one of the most common reasons for denial.
The investment must be spent or irrevocably committed to specific expenses.
**Denial risk:** D-02 — Funds idle
**Branch:** "Not yet spent" → Red Flag D-02:
  > "This is one of the most common reasons E-2 applications are denied.
  > Transferring money to a U.S. account is not enough on its own. The
  > funds must be spent on real business expenses or committed under a
  > binding agreement — a signed lease, a paid franchise fee, purchased
  > equipment, or a signed purchase agreement. Before your interview,
  > ensure your capital is deployed and documented."

---

# TAB H — Source and Path of Funds (REVISED)

### New Question QH-NEW-01
**Position:** Before QH-01 (funds flow narrative)
**Question:** Do any of the following apply to your investment funds?
**Type:** multiselect
**Options:**
- Some funds originated as cash with no bank deposit trail
- Some funds came from cryptocurrency or digital assets
- Some funds were sent informally without wire transfer records
- Some funds came from a country with limited banking documentation
- I received a large unexplained deposit at some point
- None of the above — my funds have a complete documented trail
**Why this is asked:** Each of these situations creates a gap in the
paper trail that consular officers specifically look for. Gaps in fund
documentation are one of the top denial triggers.
**Denial risk:** D-03 — Source of funds gaps
**Branch:** Any selected (except "None") → per-item advisory:

| Selection | Advisory |
|-----------|---------|
| Cash with no trail | "Cash transactions without bank records are very difficult to document. You will need a written explanation and any available supporting evidence — tax returns, receipts, or a notarized declaration." |
| Cryptocurrency | "Crypto-to-fiat conversion must be documented through exchange statements showing the sale, the amount received, and transfer to a traditional bank account." |
| Informal transfer | "Any informal transfer should be documented with a signed letter from the sender, the sender's bank statement, and your bank statement showing receipt." |
| Restricted banking | "Foreign bank statements that cannot be obtained should be substituted with the best available alternatives — tax records, property valuations, or a certified accountant statement." |
| Large unexplained deposit | "Unexplained deposits are a major red flag. Prepare a written explanation with supporting evidence before submission." |

---

# TAB I — Non-Marginality Evidence (REVISED)

### Revised Question QI-04 (REPLACE prior version)
**Question:** For each position you plan to hire, provide the following
details:
**Type:** Repeating group (minimum 0, maximum 20 entries)
**Tooltip:** This is one of the most scrutinized parts of the application.
Officers look for SPECIFIC, CREDIBLE hiring plans with real job titles,
real wages, and realistic timelines — not round numbers or vague
descriptions. A single honest hire planned at Month 6 is more credible
than "5 employees by Year 2" with no specifics.
**Fields per entry:**
- Job title (text)
- Full-time or part-time (select)
- Planned hire date — Month and Year (month/year selector)
- Approximate annual wage in USD (currency)
- Primary function:
  select → Customer service / Operations / Delivery / Sales /
  Administration / Technical / Management / Other
**Denial risk addressed:** D-04 (marginality), D-07 (no credible hiring plan)

### Revised Question QI-05 / QI-06 — Revenue Projections (ADD assumption field)
**After each Year 1 projection field, add:**
**QI-05a: What is the primary basis for your Year 1 revenue projection?**
**Type:** select
**Options:**
- Franchise Disclosure Document (FDD) average unit revenue data
- Prior year revenue from this acquired business
- Market research — comparable businesses in my area
- Industry benchmark data from a published source
- My own experience-based estimate
- Other
**Branch:** "Experience-based estimate only" → Advisory flag:
  > "Revenue projections based only on personal estimates — without
  > market data, FDD figures, or comparable business research — are
  > frequently questioned by consular officers. Before submission,
  > strengthen your projections with at least one external reference:
  > industry statistics, FDD data, or a market study."
**Denial risk addressed:** D-05, D-06

---

# TAB D — Cover Letter (REVISED)

### Revised Question QD-05 (REPLACE prior version)
**Question:** What specific ties to Canada will you maintain while
operating your U.S. business?
**Type:** multiselect
**Tooltip:** The E-2 visa is a non-immigrant visa. The officer must be
convinced you intend to depart the U.S. when your status ends. The
strongest way to demonstrate this is through specific, verifiable
Canadian ties. Vague statements like "I plan to return" carry much less
weight than documented ties.
**Options:**
- Canadian real estate I own (and will keep)
- Canadian pension, RRSP, or retirement account
- Immediate family members remaining in Canada
- Ongoing Canadian business interests
- Canadian professional licences or memberships I will maintain
- Canadian financial accounts I will keep active
- None of the above
**Branch:** One or more selected → QD-05a per selected item:
  **QD-05a:** Brief description of this tie (e.g., "Primary residence at
  [address], not for sale")
  **Type:** text
**Branch:** "None of the above" selected → D-15 Red Flag:
  > "Having no documented Canadian ties is one of the conditions officers
  > probe hardest during interview. Without specific verifiable ties to
  > Canada, the officer may doubt that you intend to return when E-2
  > status ends. Before proceeding, consider whether there are ties you
  > have not yet identified — or plan to establish — that can be
  > documented."
**Denial risk addressed:** D-15

---

# MODULE 5 — Interview Simulator (NEW MODULE SPEC)

## Purpose

Module 5 presents the 20 most important real Toronto consulate interview
questions — confirmed from actual applicant accounts and former consular
officer guidance. The applicant types their answers in their own words.
The app then:
1. Compares each answer against the relevant data in their submitted application
2. Flags any inconsistency between what they say and what they filed
3. Scores their answer confidence and specificity
4. Produces a personalized interview readiness report

---

## The 20 Questions (Confirmed from Real Toronto Interviews)

### Category 1 — Business Knowledge
**IS-01:** Tell me about your business in your own words.
**IS-02:** How much have you invested so far?
**IS-03:** What specifically have you spent the money on?
**IS-04:** How much do you expect to make in your first year?
**IS-05:** How many employees will you hire and when?
**IS-06:** Who are your competitors? What makes your business different?
**IS-07:** Where is your business located? Do you have a lease signed?
**IS-08:** What will YOU personally do in the business day-to-day?
**IS-09:** What experience do you have running this type of business?
**IS-10:** What happens if the business fails?

### Category 2 — Investment and Funds
**IS-11:** Where did the investment money come from?
**IS-12:** Is all the money already in the U.S. business account?
**IS-13:** Did you borrow any of the money?
**IS-14:** Can you show me a paper trail from your Canadian account
          to the U.S. business account?

### Category 3 — Non-Immigrant Intent
**IS-15:** Do you plan to return to Canada when your E-2 status ends?
**IS-16:** What ties do you have to Canada?
**IS-17:** What is happening to your Canadian home?
**IS-18:** Is your family coming with you or staying in Canada?

### Category 4 — Prior History (Conditional)
*Shown only if W-11 (prior refusal) or W-12 (entry refusal) flagged*
**IS-19:** Tell me about your previous visa refusal.
**IS-20:** What has changed in your application since then?

---

## Scoring Logic Per Question

For each answer the applicant types:

| Check | Pass | Flag |
|-------|------|------|
| Specificity | Mentions specific numbers, dates, names | Vague answer without specifics |
| Consistency | Numbers match filed application ±5% | Number differs by more than 5% from filed data |
| Completeness | Answers the question directly | Partial or evasive answer |
| Length | 2–5 sentences | Under 1 sentence or over 10 sentences |

## Readiness Report Output

After all 20 answers:
- Overall interview readiness score (0–100)
- Per-question flags: Consistent ✅ / Needs Revision ⚠️ / Inconsistent ❌
- Top 3 areas to review before the interview
- Specific advisory for each flagged answer

---
