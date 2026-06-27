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

**Fix:** ✅ RESOLVED — QF-NEW-01 added in Tab F
  "Of the funds transferred to the business, how much has been spent on actual
  business expenses — franchise fees, equipment, deposits, build-out?"
  Includes D-02 advisory if $0 deployed.

---

### GAP 3 — Paper Trail Gaps (D-03)

**Problem:** QF-06 asked "can you show a paper trail?" as a yes/no.
The real denial pattern shows that SPECIFIC GAPS are what cause problems:
cash deposits, foreign wire transfers without source statements,
cryptocurrency conversions, informal gifts without documentation.

**Fix:** ✅ RESOLVED — QH-NEW-01 added in Tab H
  "Are there any gaps in your funds trail — periods where money moved
  through an account you cannot produce statements for, or funds that
  changed form (cash, crypto, gold, informal transfer)?"

---

### GAP 4 — Non-Marginality / Hiring Plan Specificity (D-04, D-07)

**Problem:** QI-03 asked how many employees are planned. But the denial
pattern shows officers look for SPECIFICITY — job titles, wages, timelines,
and the connection between hiring and revenue growth.

**Fix:** ✅ RESOLVED — QI-NEW-01 added in Tab I
  Repeating group with job title, full-time/part-time, salary, hire month.
  Also QI-NEW-03 for household expenses to calculate marginality ratio.

---

### GAP 5 — Business Plan Projections Without Assumptions (D-05, D-06)

**Problem:** QI-05 and QI-06 asked for revenue and net income projections.
But the denial pattern specifically identifies "inflated projections without
assumptions" as a trigger. The numbers alone are not enough — the officer
needs to see WHY you project those numbers.

**Fix:** ✅ RESOLVED — QI-NEW-02 and QK-NEW-01 added
  QI-NEW-02: "What are your Year 1 revenue projections based on?"
  QK-NEW-01: FDD Item 19 review question

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
very differently from applications where real operations exist.

**Fix:** ✅ RESOLVED — QG-NEW-01 and QG-BANK added in Tab G
  License reference tracking, business bank account questions.

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

## Summary of Questions Added (v1.1 Update)

| ID | Action | Denial Addressed | Status |
|----|--------|-----------------|--------|
| QF-NEW-01 | Wire: Tab F QF-NEW-01, currency input | D-02 | ✅ WIRED (Session 13C) — Red advisory: "Funds sitting idle in a business bank account are NOT considered 'at risk' and are one of the most common E-2 denial reasons. The investment must be spent or irrevocably committed to specific expenses." |
| QF-NEW-02 | Wire: Tab F QF-NEW-02, select options | D-12 | ✅ WIRED (Session 13C) — Red advisory: "E-2 loans must be secured against personal assets, not business assets. Uncertain loan security should be clarified with the lender or an attorney." |
| QH-NEW-01 | ADD: paper trail gaps screener | D-03 | ✅ RESOLVED |
| QI-NEW-01 | ADD: structured hiring plan | D-07 | ✅ RESOLVED |
| QI-NEW-02 | ADD: revenue projections basis | D-06 | ✅ RESOLVED |
| QI-NEW-03 | ADD: household expenses for marginality | D-04 | ✅ RESOLVED |
| QG-NEW-01 | ADD: license tracking | D-10 | ✅ RESOLVED |
| QG-BANK | ADD: business bank account | D-10 | ✅ RESOLVED |
| QE-NEW-01 | ADD: Membership Interest Ledger | D-13 | ✅ RESOLVED |
| QE-NEW-02 | ADD: Operating Agreement control rights | D-13 | ✅ RESOLVED |
| QK-NEW-01 | ADD: FDD Item 19 review | D-06 | ✅ RESOLVED |
| QL-AGE-OUT | ADD: child age-out awareness | Future | ✅ ADDED |
| Module 5 | ADD: Interview simulator | D-08, D-09 | PENDING |
| Module 4 | ADD: Cross-tab consistency | D-09 | PENDING |

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
*Version 1.1 | May 31, 2026 — Updated with resolved gaps*
