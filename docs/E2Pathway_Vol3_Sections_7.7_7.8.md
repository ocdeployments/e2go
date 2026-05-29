# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 7.7 & 7.8
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 7.7 Compliance Calendar Specification

### Purpose
The Compliance Calendar is a personalized, dynamic timeline that tracks
every deadline, action item, and milestone in the user's E-2 journey —
from pre-application preparation through post-approval compliance and
renewal. It is the feature that keeps users engaged with the app long
after their package is generated, and the primary driver of the 5-year
relationship model.

---

### Calendar Architecture

The calendar is built from three layers:

LAYER 1 — ANCHOR DATE
The user's target interview date is the primary anchor. All pre-interview
events are calculated backward from this date. All post-approval events
are calculated forward from the visa issue date (entered after approval).

If no interview date is set yet, the calendar uses "Target Interview Date:
TBD" and displays estimated ranges. Once the interview is scheduled and
the user enters the date, all items auto-populate with specific dates.

LAYER 2 — STATIC TRIGGERS
Events that apply to all users regardless of their specific profile:
- DS-160 must be completed before interview
- Medical exam (if required) timing
- Canada Post visa return window
- I-94 expiry tracking

LAYER 3 — DYNAMIC TRIGGERS
Events generated from Module 2 and Module 3 data:
- Licensing application deadlines (from business_category + state)
- Entity formation deadline
- Bank account opening deadline
- Insurance deadlines (based on lease start date)
- Child age-out alerts (from dependent birthdays)
- Renewal window (from visa expiry date)
- FBAR filing deadline (if U.S. bank account > $10,000 USD)

---

### Pre-Interview Calendar Items (Generated Backward from Interview Date)

| Timeline | Item | Trigger Condition | Priority |
|---|---|---|---|
| T-6 months | Begin state licensing application | Licensed business type selected | 🔴 Critical |
| T-5 months | Form LLC or Corporation | entity not yet formed | 🔴 Critical |
| T-5 months | Obtain EIN from IRS | entity formed | 🔴 Critical |
| T-5 months | Open U.S. business bank account | EIN obtained | 🔴 Critical |
| T-4 months | Sign business lease or purchase agreement | operational_status not "signed" | 🔴 Critical |
| T-4 months | Begin equipment/inventory purchases | lease signed | 🟡 High |
| T-4 months | Engage U.S. accountant/CPA | no_cpa_confirmed | 🟡 High |
| T-3 months | Wire investment funds to U.S. account | funds_not_yet_deployed | 🔴 Critical |
| T-3 months | Obtain general liability insurance | lease signed | 🟡 High |
| T-3 months | Apply for local business permits | entity formed | 🟡 High |
| T-3 months | Build business website | website_status not "live" | 🟠 Medium |
| T-10 weeks | Begin app interview engine if not started | module_3_incomplete | 🔴 Critical |
| T-8 weeks | Complete all Module 3 questions | module_3_incomplete | 🔴 Critical |
| T-8 weeks | Review generated documents — first draft | documents_generated | 🟡 High |
| T-6 weeks | Compile Tab A–L physical binder | checklist_incomplete | 🟡 High |
| T-6 weeks | Complete DS-160 online at ceac.state.gov | ds160_not_confirmed | 🔴 Critical |
| T-6 weeks | Pay MRV visa application fee ($315 USD) | fee_not_paid | 🔴 Critical |
| T-6 weeks | Schedule interview appointment at Toronto | interview_not_scheduled | 🔴 Critical |
| T-4 weeks | Run first interview simulation | sim_runs = 0 | 🟡 High |
| T-4 weeks | Assemble physical binder — all 11 tabs | binder_status incomplete | 🟡 High |
| T-3 weeks | Run second interview simulation | sim_runs < 2 | 🟡 High |
| T-2 weeks | Final document review — check all tabs | pre_submission_check | 🟡 High |
| T-1 week | Run final interview simulation | sim_score < 85% | 🟡 High |
| T-3 days | Pack interview binder — verify all originals | pre_interview_check | 🔴 Critical |
| T-1 day | Review interview prep sheet — final read | pre_interview | 🟡 High |
| T-0 | Interview day | interview_date = today | — |

---

### Interview Day & Immediate Post-Interview Items

| Timeline | Item | Notes |
|---|---|---|
| Interview day | Note questions asked — update outcome tracker | Within 24 hours |
| Interview + 1 day | Update outcome tracker — result + questions | Triggers post-interview sequence |
| Interview + 3 days | If 221(g): review emergency guide | Triggered if outcome = "221g" |
| Interview + 5 days | If approved: expect Canada Post delivery | Toronto → Canada Post returns visa |
| Interview + 7 days | Visa in hand — enter visa dates in app | Unlocks post-approval calendar |
| Interview + 10 days | Submit testimonial (optional) | Incentive: 12 months Compliance Calendar free |

---

### Post-Approval Calendar Items (Generated Forward from Visa Issue Date)

| Timeline | Item | Trigger Condition | Priority |
|---|---|---|---|
| Visa + 0 | Enter visa issue date and expiry date | approval confirmed | 🔴 Critical |
| Visa + 2 weeks | Register with CRA as non-resident | departure_tax_not_filed | 🟡 High |
| Visa + 2 weeks | File departure tax return (or engage CPA) | cpa_not_engaged | 🟡 High |
| Visa + 1 month | Confirm OHIP cancellation + U.S. health coverage active | health_coverage_gap_risk | 🔴 Critical |
| Visa + 1 month | Update Canadian bank accounts to non-resident status | canadian_accounts_exist | 🟡 High |
| Visa + 1 month | Notify Canadian financial institutions of address change | — | 🟡 High |
| Visa + 2 months | Confirm business operations commenced | operational_start_date | 🟡 High |
| Visa + 3 months | Hire first employee (per hiring plan) | employee_year1 > 0 | 🟡 High |
| Visa + 6 months | Mid-year business review — actual vs. projected | — | 🟠 Medium |
| Visa + 11 months | File first U.S. tax return (Form 1040NR or 1040) | — | 🔴 Critical |
| Visa + 11 months | File FBAR if U.S. + foreign accounts > $10,000 | fbar_required | 🔴 Critical |
| Year 1 anniversary | Annual business performance review in app | renewal_readiness_check | 🟡 High |
| Year 2 | I-94 status extension (if COS path) | application_type = "cos" | 🔴 Critical |
| Year 2 | Second FBAR filing due | fbar_required | 🔴 Critical |
| Year 3 | Renewal readiness score generated | — | 🟡 High |
| Year 3 | Review actual vs. projected performance | renewal_module_prompt | 🟡 High |
| Year 4 | Renewal preparation — begin renewal module | visa_expiry approaching | 🔴 Critical |
| Year 4.5 | Toronto renewal interview scheduling window | consular_renewal | 🔴 Critical |
| Year 5 minus 6 months | Begin renewal package generation | — | 🔴 Critical |
| Dependent age 20 | Child age-out planning alert | dependent_dob tracked | 🔴 Critical |
| Dependent age 20.5 | Attorney referral — child pathway options | — | 🔴 Critical |

---

### Child Age-Out Alert Specification

This alert is one of the most emotionally important features in the
compliance calendar. It fires proactively — not reactively.

Trigger: dependent_birthdate calculated → alert fires when child
turns 20 years and 0 months (12 months before age-out)

Alert message (push notification + email + in-app banner):
"⚠️ IMPORTANT: [Child's name] turns 21 in approximately 12 months.
E-2 dependent status ends on the 21st birthday. After that date,
[child's name] will need independent immigration status to remain
in the United States legally.

Options to explore now:
• F-1 Student Visa (if enrolled in a U.S. college or university)
• Their own E-2 visa (if they invest in a qualifying business)
• O-1 or other work visa (if qualifying talent/employment)
• Green card petition (if your EB-5 or EB-1C is already underway)

We strongly recommend consulting an immigration attorney to plan
[child's name]'s pathway at least 12 months before their 21st birthday.

[Connect with an E-2 attorney →]  [Learn about options →]"

---

### Licensing Timeline Auto-Population

When business_category and target_state are confirmed in Module 2,
the licensing timeline items are auto-populated:

Example — Senior care, Florida:
  T-6 months: "Begin AHCA Home Health Agency license application"
  T-5 months: "Submit AHCA application and fee ($295)"
  T-3 months: "Follow up on AHCA application status"
  T-2 months: "Confirm license is in process (bring confirmation to interview)"
  Interview: "Bring AHCA application confirmation number"
  Post-approval: "Finalize AHCA license before beginning client services"

Example — Childcare, California:
  T-9 months: "⚠️ Begin CDSS Community Care Facility license application
               immediately — California processing takes 4–8 months"
  T-7 months: "Submit CDSS application, background checks, and facility plans"
  T-5 months: "Schedule CDSS facility inspection"
  T-3 months: "Confirm CDSS application is in process"

---

### Calendar Display UI Specification

View options:
  - TIMELINE VIEW: Horizontal timeline showing past (completed) and
    future (upcoming) items, color-coded by priority
  - LIST VIEW: Sorted by date, grouped by "Overdue / This Week /
    This Month / Future"
  - DASHBOARD WIDGET: Shows next 3 upcoming items on the main dashboard

Item states:
  - ○ Not started (gray)
  - ◑ In progress (yellow)
  - ✅ Complete (green)
  - ⚠️ Overdue (red)
  - — Not applicable (hidden)

User can mark items complete, add notes, and set personal reminders.
Critical items (🔴) cannot be dismissed without confirmation.

Push notifications and emails triggered for:
  - Items due in 7 days
  - Items due in 3 days
  - Overdue items (24 hours after due date)
  - Child age-out alert (see above)
  - Renewal window opening (Year 4)

---

## 7.8 Renewal Module Specification

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

Entry screen:
```
WELCOME TO THE E2PATHWAY RENEWAL MODULE

Your visa expires: [date] — [X months] from today

To renew your E-2 status, you have two paths:

PATH A — TORONTO CONSULATE RENEWAL
Renew your 5-year visa stamp at the U.S. Consulate in Toronto.
Best for: most applicants; provides a full 5-year stamp.
You will need to travel to Toronto for an interview.

PATH B — USCIS STATUS EXTENSION (Inside the U.S.)
Extend your I-94 status via Form I-129 filed with USCIS.
Best for: applicants who cannot travel internationally
or want to avoid a Toronto interview.
Provides a 2-year extension only.

Which path are you taking?
  ○ Toronto Consulate Renewal (Path A)
  ○ USCIS Status Extension (Path B)
  ○ I'm not sure — help me decide
```

"Help me decide" triggers a routing quiz:
Q: "Are you currently inside the United States?"
Q: "Do you have any upcoming international travel planned?"
Q: "Is there any reason you cannot travel to Toronto in the next 6 months?"
Q: "Do you prefer a 5-year renewal or is a 2-year extension acceptable?"

---

### Path A — Toronto Consulate Renewal

#### What's Different From the Original Application

The renewal is structurally similar to the original application
but with critical differences that the module must address:

SAME structure: 11 tabs, same binder format, same cover letter
NEW requirement: Demonstrate the business actually operated as projected
NEW document: Actual vs. Projected Performance Table (Template 6)
NEW document: Updated Business Plan (with real P&L data)
NEW document: Evidence of job creation (payroll records summary)
NEW document: Proof of continued operations (bank statements, invoices)
NOT required: New source of funds chronology (if same investment)

#### Renewal Module Question Set

GROUP R1 — Business Performance Review (10 questions)

RQ-01: "What was your actual revenue in each year of operation?"
- Fields: Year 1 actual / Year 2 actual / Year 3 actual / Year 4 actual /
         Year 5 YTD (if applicable)
- Pre-populated with original projections for comparison
- Output: Template 6 actual vs. projected table

RQ-02: "How many full-time employees do you currently have?"
- Field: Number
- Compare to Year [N] projection from original Template 5
- If actual < projected: variance explanation field required

RQ-03: "How many part-time employees do you currently have?"
- Field: Number

RQ-04: "Describe how the business has grown or changed since
         your original E-2 application:"
- Field: Text area
- Prompts: "New services or products added / New locations / New clients /
  Major contracts won / Staff additions / Equipment investments"
- Output: Renewal cover letter — business accomplishments section

RQ-05: "Has the business experienced any significant challenges
         and how were they addressed?"
- Field: Text area (optional)
- Output: Renewal cover letter variance narrative
- Tooltip: "If revenue missed projections in any year, explain why and
  what you did to address it. Officers understand that businesses face
  challenges — what matters is that the business remained viable and
  you remained actively managing it."

RQ-06: "What additional investment have you made in the business
         since your original application?"
- Field: Number (USD) + description
- Output: Renewal cover letter; demonstrates ongoing commitment

RQ-07: "Is the business currently profitable?"
- Yes → "What is the approximate annual net profit?"
- No, but trending toward profitability → explain
- No → attorney referral advisory (marginality risk at renewal)

RQ-08: "Have there been any changes to the ownership structure
         of the business since your original application?"
- No → continue
- Yes → attorney referral: "Changes to ownership structure must be
  carefully documented. If your ownership percentage has changed,
  please consult an immigration attorney before filing your renewal."

RQ-09: "Are you still actively managing the business in the same
         role described in your original application?"
- Yes → continue
- Changed role → "Describe your current role" → update cover letter

RQ-10: "Have you hired the employees projected in your original
         business plan?"
- Yes, met or exceeded projections → strong renewal signal
- Partially — below projections → variance explanation required
- No employees hired → HIGH RISK advisory triggered:
  "⚠️ A renewal application with no employees hired is at significant
  risk of being denied on marginality grounds. The officer will compare
  your current staffing to your original projections. If you have not
  hired staff, your renewal cover letter must address this directly with
  a compelling explanation and a credible forward-looking hiring plan."

---

GROUP R2 — Updated Personal Information (5 questions)

RQ-11: "Has your passport changed since your original application?"
- Yes → new passport number, expiry date updated
- No → confirm existing passport details

RQ-12: "Have there been any changes to your family composition?"
- No → continue
- Yes → update dependent information (new child / child aged out /
  spouse status change)

RQ-13: "Have there been any changes to your Canadian ties since
         your original application?"
- New property / retained existing property / sold property
- Output: Renewal cover letter Canadian ties update

RQ-14: "Have you maintained Canadian bank accounts or financial ties?"
- Yes → continue
- No → immigrant intent advisory

RQ-15: "Have you had any U.S. immigration issues since your
         original E-2 was granted?"
- Overstay / violation / removal proceedings → attorney referral
- No → continue

---

#### Template 6 — Actual vs. Projected Performance Table

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

VARIANCE NARRATIVE (AI-generated):
"While Year 1 revenue came in below initial projections at $147,000
vs. $180,000 projected (18% variance), the shortfall was attributable
to a longer-than-anticipated client acquisition ramp-up period in the
first 6 months of operations. The business achieved profitability in
Month 14 and has exceeded projections in Years 3 and 4. Total
cumulative revenue of $709,000 over 3.5 years demonstrates a viable,
actively managed enterprise generating substantial economic contribution
beyond supporting the investor's household. Current annual revenue of
$334,000 exceeds the investor's household income need of $85,000 by
a ratio of 3.93x, comfortably meeting the non-marginality standard."
```

---

#### Renewal Cover Letter Structure

The renewal cover letter follows the same structure as the original
but with emphasis shifted from "plan" to "achievement":

Para 1: Introduction — applicant name, visa history, renewal request
Para 2: Business description update — what the business is today
Para 3: Financial performance — summary of actual vs. projected
Para 4: Job creation — employees hired, payroll generated, economic impact
Para 5: Investor's ongoing active role — what they do day-to-day
Para 6: Future plans — next 5 years of growth
Para 7: Canadian ties maintained — non-immigrant intent reaffirmation
Para 8: Conclusion — respectful renewal request

---

### Path B — USCIS Status Extension (Form I-129)

#### Key Differences From Consular Renewal

| Factor | Path A (Toronto) | Path B (USCIS I-129) |
|---|---|---|
| Form | DS-160 | I-129 with E Classification Supplement |
| Interview | Required at consulate | Usually not required |
| Validity granted | 5-year visa stamp | 2-year I-94 increment |
| Processing time | 60–90 days (interview wait + decision) | 3–6 months |
| Travel during process | Normal | Cannot leave U.S. |
| USCIS fee | $315 MRV fee | $730 I-129 filing fee (2026) |
| Package format | 11-tab binder | USCIS cover sheet + supporting docs |

#### Path B Module Question Additions

All Group R1 and R2 questions apply. Additional questions for Path B:

RQ-B01: "Are you currently in valid E-2 status?"
- Yes → confirm current I-94 expiry date
- No → URGENT advisory: "If your E-2 status has lapsed, you cannot
  extend from inside the U.S. You must depart and apply at the Toronto
  consulate. Consult an immigration attorney immediately."

RQ-B02: "Do you have any international travel planned before
          your I-129 is adjudicated?"
- Yes → advisory: "Filing Form I-129 triggers a period during which
  you should not travel internationally. If you depart the U.S. while
  an I-129 is pending, USCIS may consider the petition abandoned.
  If travel is necessary, consult an attorney about Advance Parole
  or consider the Toronto consular renewal instead."

RQ-B03: "Is your business address the same as when your original
          E-2 was granted?"
- Changed → address update required on I-129

#### Path B Package Generated

- Form I-129 reference sheet (pre-filled with user's data)
- E Classification Supplement reference sheet
- Supporting documentation checklist (USCIS format — different from consular)
- Cover letter (adapted for USCIS submission — no binder tabs, narrative format)
- Template 6 (Actual vs. Projected Performance Table — same as Path A)
- Updated Business Plan summary (5-page condensed version for USCIS)
- Evidence of continued operations (bank statements, invoices summary page)

---

### Renewal Pricing

Displayed at module entry:

```
RENEWAL MODULE PRICING

○ E2Pathway Renewal — $97 USD
  For users who completed their original application with E2Pathway.
  Your original application data is pre-loaded.
  Includes: Full renewal package for your selected path.

○ E2Pathway Renewal (New User) — $147 USD
  For applicants who did not use E2Pathway for their original application.
  You will need to enter your business history from scratch.
  Includes: Full renewal package for your selected path.

○ Partnership Renewal — $147 USD (existing users) / $247 USD (new users)
  For two-investor partnership renewals.
  Includes: Two complete renewal packages.

All renewals include:
✓ Actual vs. projected performance table (Template 6)
✓ Renewed business plan
✓ Updated cover letter
✓ Compliance calendar reset (next 5-year cycle)
✓ Interview simulation update (renewal-specific questions)
✓ Updated application confidence score
```

---

### Renewal Interview Simulator Updates

The interview simulator is updated for renewal with a separate
renewal-specific question bank. Key differences:

Renewal questions focus on:
- What has the business actually achieved?
- How many jobs have been created?
- Why did actual performance differ from projections (if it did)?
- What are your plans for the next 5 years?
- Are you still actively managing the business?

New universal renewal questions:
  RUQ-01: "Tell me about the growth of your business over the past 5 years."
  RUQ-02: "How many people do you currently employ?"
  RUQ-03: "Your Year 1 revenue was below projections — can you explain that?"
           (Injected only if Year 1 actual < projected)
  RUQ-04: "What changes have you made to the business since your
           original visa was granted?"
  RUQ-05: "What are your plans for the business over the next 5 years?"

---

*End of Sections 7.7 and 7.8*
*Next: Section 7.9 — Referral Engine Specification*
*      Section 7.10 — Outcome Capture & CEAC Verification Specification*
