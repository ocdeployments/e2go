# Module 3 Interview Engine — Denial-Based Question Audit
## Version 1.1 | May 28, 2026
## Source: Pandev Law E-2 Denial Analysis, Alaz Law 2026 Denial Guide,
##         Real Toronto Interview Accounts (Reddit r/e2visa), Former
##         Consular Officer Interview (Rupert Law), FAM 9 FAM 402.9

---

## Why This Audit Exists

The first draft of the interview questions was built from the official document
structure — what the tabs must contain. This audit cross-references those
questions against REAL denial and RFE patterns to ensure the questions also
prepare the applicant to avoid the most common failure modes.

The interview engine must do two things simultaneously:
1. Collect the data needed to build the documents
2. Surface every weakness before submission — not at the Toronto window

---

## The Real Denial Categories (Research-Confirmed)

| # | Denial Category | How Often | Source |
|---|----------------|-----------|--------|
| D-01 | Investment not substantial for this business type | Most common | Pandev, Alaz, FAM |
| D-02 | Funds idle — not actually at risk / not spent | Very common | Pandev, Alaz |
| D-03 | Source of funds cannot be traced — gaps in paper trail | Very common | Pandev, Alaz |
| D-04 | Business appears marginal — income only for investor | Very common | Pandev, FAM, Reddit |
| D-05 | Business plan generic, vague, or inconsistent with finances | Common | Pandev |
| D-06 | Revenue projections inflated, not data-backed | Common | Pandev |
| D-07 | No credible hiring plan | Common | Pandev, FAM |
| D-08 | Applicant cannot answer questions about own business at interview | Significant | Pandev, Reddit, ex-officer |
| D-09 | Interview answers inconsistent with submitted documents | Significant | Pandev, ex-officer |
| D-10 | Shell company / no real operations yet | Common | Alaz, FAM |
| D-11 | Passive investment / no active management | Hard denial | FAM |
| D-12 | Loan secured by business assets only | Hard denial | FAM |
| D-13 | Ownership / control structure not properly documented | Common | Pandev, FAM |
| D-14 | Business type does not qualify (marginal by design) | Common | FAM |
| D-15 | 214(b) — officer not convinced applicant will return to Canada | Moderate | ex-officer, FAM |

---

## Gap Analysis — Questions Missing or Weak in First Draft

### GAP 1 — Investment Substantiality vs. Business Type (D-01)

**Problem:** The first draft asked "how much are you investing" but did not
ask what the TOTAL COST of the business is. Without both numbers, the
proportionality test cannot be done and the application cannot address
substantiality directly.

**Fix:** QF-03 asks total business cost. This was in the draft. ✅
**Additional fix needed:** Add a calculated field showing investment as
% of total cost and a red flag if below 50%. This is a readiness check
item — add to Module 4 scoring.

---

### GAP 2 — Funds Idle in Bank Account (D-02)

**Problem:** The first draft asked whether funds have been committed.
But the real denial pattern is more specific: funds transferred to a
U.S. business bank account but not yet SPENT are considered idle and
therefore not "at risk."

**Fix needed:** Add explicit question:
  QF-NEW-01: "Has any of the investment capital been spent on actual
  business expenses — such as a signed lease, equipment purchase, inventory,
  franchise fee payment, or professional fees?"
  Options: Yes — substantially all committed to expenses /
           Yes — partially spent / No — funds are in the account but not
           yet spent on expenses
  Branch: Not yet spent → Red flag D-02 — must address before submission

---

### GAP 3 — Paper Trail Gaps (D-03)

**Problem:** QF-06 asked "can you show a paper trail?" as a yes/no.
The real denial pattern shows that SPECIFIC GAPS are what cause problems:
cash deposits, foreign wire transfers without source statements,
cryptocurrency conversions, informal gifts without documentation.

**Fix needed:** Add a checklist of specific gap types:
  QH-NEW-01: "Are any of the following true about your funds?"
  Multiselect:
  - Some funds originated as cash with no bank deposit record
  - Some funds came from cryptocurrency
  - Some funds were transferred informally without banking records
  - Some funds came from a country with restricted banking documentation
  - I received a large deposit I cannot fully explain
  - None of the above
  Branch: Any selected (except none) → D-03 flag with specific advisory

---

### GAP 4 — Non-Marginality / Hiring Plan Specificity (D-04, D-07)

**Problem:** QI-03 asked how many employees are planned. But the denial
pattern shows officers look for SPECIFICITY — job titles, wages, timelines,
and the connection between hiring and revenue growth.

**Fix needed:** Strengthen QI-04 from "describe the positions" to structured data:
  QI-04-REVISED: Repeating group — one entry per planned role
  Fields: Job title / Full-time or Part-time /
          Approximate start date (Month, Year) /
          Approximate annual wage (USD) /
          Primary function (customer service / operations / delivery /
          admin / sales / other)

This makes the hiring plan specific enough to survive officer scrutiny.

---

### GAP 5 — Business Plan Projections Without Assumptions (D-05, D-06)

**Problem:** QI-05 and QI-06 asked for revenue and net income projections.
But the denial pattern specifically identifies "inflated projections without
assumptions" as a trigger. The numbers alone are not enough — the officer
needs to see WHY you project those numbers.

**Fix needed:** After each year's projection fields, add:
  QK-08-REVISED: "What is the primary driver behind Year 1 revenue?"
  Options:
  - Franchise system average unit revenue (FDD data)
  - Prior year revenue from this same business (acquisition)
  - Market research showing demand in this area
  - Comparable business data from same industry
  - My own experience-based estimate
  Branch: Experience-based only → advisory flag — strengthen with data

---

### GAP 6 — Interview Preparation (D-08, D-09)

**Problem:** The first draft had no interview preparation module at all.
Real denial data shows that an applicant with a perfect paper application
can be denied because they cannot answer basic questions about their own
business at the window.

**Fix needed:** Module 5 (Interview Simulator) must ask the applicant to
answer the following questions in their own words — and compare their
answers against the submitted application for consistency:

Real interview questions confirmed from Toronto accounts and ex-officer:

BUSINESS KNOWLEDGE:
1. Tell me about your business in your own words.
2. How much have you invested so far?
3. Where did the money come from?
4. How much do you expect to make in the first year?
5. How many employees will you hire and when?
6. Who are your competitors? What makes you different?
7. Where is your business located?
8. Do you have a lease or location secured?
9. What will you personally do in the business day-to-day?
10. What experience do you have running this type of business?

INVESTMENT / FUNDS:
11. Have all the funds been transferred to the U.S. already?
12. Is there any money still sitting in your Canadian account?
13. Did you borrow any of the money?

NON-IMMIGRANT INTENT:
14. Do you plan to return to Canada?
15. What ties do you have to Canada?
16. What happens to your Canadian home?
17. Do you have family still in Canada?

PRIOR HISTORY (if flagged):
18. Tell me about your previous visa refusal.
19. Why were you refused?
20. What has changed since then?

---

### GAP 7 — Inconsistency Detection (D-09)

**Problem:** No current question checks that answers are internally
consistent across tabs. A common denial is caused by numbers that do
not add up between the cover letter, the funds flow, the business plan,
and what the applicant says at interview.

**Fix needed:** Module 4 (Readiness Scoring) must run a consistency check:
  - Investment amount in QA-56 = QF-02 = QI-05 basis
  - Total business cost in QF-03 ≥ QF-02 (cannot have invested more than total cost)
  - Year 1 hiring plan wages (QI-04) ≤ Year 1 projected net income (QI-06)
    (payroll cannot exceed projected net — if so, flag for review)
  - Cover letter narrative (QD-01 through QD-06) consistent with QJ-03 work history
  - Ownership % in QE-09 = QA-55

---

### GAP 8 — Real Operations vs. Shell (D-10)

**Problem:** QG-02 asked operational status as a simple select. The denial
pattern shows that "entity formed but not operating" applications are treated
very differently from applications where real operations exist. The question
needs to draw out MORE operational evidence for early-stage businesses.

**Fix needed:** If QG-02 = "Entity formed but operations not started":
  Add advisory: "Applications where operations have not yet begun are
  held to a higher standard on investment commitment and business plan
  quality. The officer must be convinced that the investment is real and
  that the business WILL operate — not just that it might."
  + trigger Module 4 flag for additional review

---

### GAP 9 — 214(b) Non-Immigrant Intent (D-15)

**Problem:** QD-05 asked why the applicant will return to Canada. But the
real denial pattern from ex-officers shows this is assessed holistically
from multiple signals — not just one answer. The cover letter must address
non-immigrant intent with SPECIFIC, VERIFIABLE Canadian ties.

**Fix needed:** Add structured tie documentation:
  QD-05-REVISED: multiselect with specific tie types:
  - Canadian real estate I own
  - Canadian pension or retirement account
  - Immediate family members living in Canada
  - Canadian business interests I will retain
  - None of the above
  Branch: None of the above → D-15 flag — officer will probe intent hard

---

## Summary of Questions to Add or Revise

| ID | Action | Denial Addressed |
|----|--------|-----------------|
| QF-NEW-01 | ADD: Are funds actually spent on business expenses? | D-02 |
| QH-NEW-01 | ADD: Specific paper trail gap screener | D-03 |
| QI-04 | REVISE: Make hiring plan a structured repeating group | D-04, D-07 |
| QK-08 | REVISE: Add projection assumption type selector | D-05, D-06 |
| QD-05 | REVISE: Structured Canadian ties selector | D-15 |
| Module 5 | ADD: Interview simulator with 20 real questions | D-08, D-09 |
| Module 4 | ADD: Cross-tab consistency checker | D-09 |
| Module 4 | ADD: Readiness flags for D-01 through D-15 | All |

---

## What This Means for the Final Question Set

The interview engine is not just a data-collection form.
It is a denial-prevention system.

Every question that addresses a real denial category must include:
1. A plain-language explanation of WHY this matters (tooltip)
2. A flag that triggers when the answer reveals a risk
3. A specific advisory telling the applicant exactly what to do about it

The goal: by the time the applicant prints their binder, they have been
warned about every weakness. They go into Toronto having addressed the
same issues that cause other applications to fail.

---
*End of Denial-Based Audit*
*Version 1.1 | May 28, 2026*
