# E2GO.APP — RENEWAL MODULE SPECIFICATION
## Comprehensive spec combining existing design with latest IDEAS.md decisions
**Created:** June 5, 2026
**Status:** Spec Complete, Ready for Build

---

## SECTION 1 — EXISTING SPECIFICATION (Vol 3 Section 7.8)

### Purpose
The Renewal Module prepares users for their E-2 visa renewal —
either through the Toronto consulate (5-year stamp) or through
USCIS via Form I-129 (2-year extension). It is sold as a separate
purchase and is the primary source of long-term recurring revenue.

---

### Renewal Module Entry
The renewal module is accessible from:
1. The compliance calendar (Year 4 renewal preparation item)
2. The dashboard (Year 4 banner: "Your renewal window is approaching")
3. Direct purchase link (for users who didn't use the original app)

Entry screen routing quiz:
```
WELCOME TO THE E2GO RENEWAL MODULE

Your visa expires: [date] — [X months] from today

To renew your E-2 status, you have two paths:

PATH A — TORONTO CONSULATE RENEWAL
Renew your 5-year visa stamp at the U.S. Consulate in Toronto.
Best for: most applicants; provides a full 5-year stamp.
You will need to travel to Toronto for an interview.

PATH B — USCIS STATUS EXTENSION (Inside the U.S.)
Extend your I-94 status via Form I-129 filed with USCIS.
Best for: applicants who cannot travel internationally or want to avoid a Toronto interview.
Provides a 2-year extension only.

Which path are you taking?

Routing quiz questions:
- "Are you currently inside the United States?"
- "Do you have any upcoming international travel planned?"
- "Is there any reason you cannot travel to Toronto in the next 6 months?"
- "Do you prefer a 5-year renewal or is a 2-year extension acceptable?"
```

---

### Path A — Toronto Consulate Renewal

#### Group R1 — Business Performance Review (10 questions)
- **RQ-01**: "What was your actual revenue in each year of operation?" (Pre-populated with original projections)
- **RQ-02**: "How many full-time employees do you currently have?" (Compare to projection)
- **RQ-03**: "How many part-time employees do you currently have?"
- **RQ-04**: "Describe how the business has grown or changed since your original E-2 application:"
- **RQ-05**: "Has the business experienced any significant challenges and how were they addressed?"
- **RQ-06**: "What additional investment have you made in the business since your original application?"
- **RQ-07**: "Is the business currently profitable?"
- **RQ-08**: "Have there been any changes to the ownership structure of the business since your original application?"
- **RQ-09**: "Are you still actively managing the business in the same role described in your original application?"
- **RQ-10**: "Have you hired the employees projected in your original business plan?"

#### Group R2 — Updated Personal Information (5 questions)
- **RQ-11**: "Has your passport changed since your original application?"
- **RQ-12**: "Have there been any changes to your family composition?"
- **RQ-13**: "Have there been any changes to your Canadian ties since your original application?"
- **RQ-14**: "Have you maintained Canadian bank accounts or financial ties?"
- **RQ-15**: "Have you had any U.S. immigration issues since your original E-2 was granted?"

#### Path B Specific Questions
- **RQ-B01**: "Are you currently in valid E-2 status?"
- **RQ-B02**: "Do you have any international travel planned before your I-129 is adjudicated?"
- **RQ-B03**: "Is your business address the same as when your original E-2 was granted?"

#### Template 6 Specification
Auto-generated from RQ-01 through RQ-10:
```
BUSINESS PERFORMANCE SUMMARY
[Business Name] | E-2 Visa Renewal | [Applicant Name]

                  YEAR 1          YEAR 2         YEAR 3
                  Proj  Actual    Proj  Actual    Proj  Actual
Revenue:          $180K  $147K    $240K  $228K    $310K  $334K
Net Income:       $42K   $28K     $68K   $61K     $95K   $103K
FT Employees:     2      1        4      3        6      6
PT Employees:     3      2        4      4        5      5

VARIANCE NARRATIVE: [AI-generated paragraph explaining variances]
```

#### Path B Package Generated
- Form I-129 reference sheet (pre-filled with user's data)
- E Classification Supplement reference sheet
- Supporting documentation checklist (USCIS format)
- Cover letter (adapted for USCIS submission — no binder tabs, narrative format)
- Template 6 (Actual vs. Projected Performance Table)
- Updated Business Plan summary (5-page condensed version for USCIS)
- Evidence of continued operations (bank statements, invoices summary page)

#### Renewal Pricing
- **E2go Renewal (Existing User):** $97 USD
- **E2go Renewal (New User):** $147 USD
- **Partnership Renewal (Existing User):** $147 USD
- **Partnership Renewal (New User):** $247 USD

#### Renewal Interview Simulator Updates
New universal renewal questions:
- **RUQ-01**: "Tell me about the growth of your business over the past 5 years."
- **RUQ-02**: "How many people do you currently employ?"
- **RUQ-03**: "Your Year 1 revenue was below projections — can you explain that?" (Injected only if variance exists)
- **RUQ-04**: "What changes have you made to the business since your original visa was granted?"
- **RUQ-05**: "What are your plans for the business over the next 5 years?"

---

## SECTION 2 — IDEAS.MD 12F ADDITIONS (Baseline vs. Fresh Data & Framing)

### 2.1 — The Baseline Principle
Original application data is a historical baseline for comparison. It is never assumed to be currently true. At renewal, the user's circumstances may have changed completely — new passport, new address, new role, changed family composition. The only correct use of original data is to pre-populate the "projected" column in Template 6 and to provide context framing for questions where a before/after comparison is relevant.

---

### 2.2 — Field Classification Table

Add this table to the spec immediately before the question set:

| Field | Classification | Pre-populate from | Behaviour |
|---|---|---|---|
| Template 6 projected revenue (all years) | BASELINE | Tab I QI-05, QI-06 | Read-only. User cannot edit projected column. |
| Template 6 projected employees (all years) | BASELINE | Tab I QI-02, QI-03 | Read-only. User cannot edit projected column. |
| Template 6 actual revenue (all years) | FRESH | None | Blank. User fills. |
| Template 6 actual employees (all years) | FRESH | None | Blank. User fills. |
| Passport number | FRESH | None | Blank. Always collect new. |
| Passport expiry | FRESH | None | Blank. Always collect new. |
| Business address | FRESH | None | Blank. May have changed. |
| Current role | FRESH | None | Blank. May have changed. |
| Current annual revenue | FRESH | None | Blank. Must reflect current period. |
| Current employee count | FRESH | None | Blank. Must reflect current state. |
| Business growth narrative | FRESH | None | Blank. New content for this renewal. |
| Canadian ties | FRESH | None | Blank. May have changed significantly. |
| Family composition | FRESH | None | Blank. Children may have aged out. |
| Immigration history since original | FRESH | None | Blank. New period covered. |

---

### 2.3 — Template 6 Implementation Rule
The projected column is read-only. It is pre-populated from the original application's Tab I answers (QI-05, QI-06, QI-02, QI-03). The user fills the actual column only. The table heading must clearly distinguish the two columns:
- Left column: "Original Projection (from your [Year] application)"
- Right column: "Actual (enter your real figures)"
The user never re-enters what they originally projected. That data is a fixed historical record.

---

### 2.4 — Question Framing Rules
For every question where original data provides context, use this framing pattern — do NOT re-ask the original question:

- **RQ-01 (revenue) framing:** "Your original Year 1 revenue projection was $[QI-05 Year 1]. What was your actual Year 1 revenue?" Then: "Your original Year 2 projection was $[QI-05 Year 2]. What was your actual Year 2 revenue?" (Continue for each year of operation)

- **RQ-02 (employees) framing:** "Your original Year [N] hiring plan projected [QI-02 Year N] full-time employees. How many full-time employees do you currently have?"

- **RQ-09 (current role) framing:** "In your original application, your role was described as [original role from Tab D/J]. Describe your current role in the business." Do NOT ask "Is your role the same?" — collect fresh.

- **RQ-10 (hiring plan) framing:** "Your original business plan projected [QI-03] employees by Year [N]. Have you met, exceeded, or fallen short of this hiring plan?"

---

### 2.5 — What Original Data Is NEVER Used For
The following original application fields are historical record. They are never shown to the user as "current" and never pre-populated into renewal fields:
- Passport number and expiry (always collect fresh)
- Home address (always collect fresh)
- Business address (always collect fresh — may have relocated)
- Canadian bank accounts (always collect fresh)
- Family composition (always collect fresh — children age out)
- Canadian property (always collect fresh — may have sold)
- Investment amount (original investment is history — renewal adds new investment evidence separately)

---

*End of Renewal Module Specification*
*Next step: Build implementation per this spec.*