# E2GO.APP — COMPLIANCE CALENDAR SPECIFICATION
## Comprehensive spec combining existing design with latest IDEAS.md decisions
**Created:** June 5, 2026
**Status:** Spec Complete, Ready for Build

---

## SECTION 1 — EXISTING SPECIFICATION (Vol 3 Section 7.7)

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

**LAYER 1 — ANCHOR DATE**
The confirmed interview date (`applications.confirmed_interview_date`) is the anchor for all deadline calculations. This date is distinct from the working target date set in the journey wizard (`applications.working_target_date`). Pre-interview events are calculated backward from `confirmed_interview_date` only. If `confirmed_interview_date` is null, all items display ranges, not specific dates.

**LAYER 2 — STATIC TRIGGERS**
Events that apply to all users regardless of their specific profile:
- DS-160 must be completed before interview
- Medical exam (if required) timing
- Canada Post visa return window
- I-94 expiry tracking

**LAYER 3 — DYNAMIC TRIGGERS**
Events generated from Module 2 and Module 3 data:
- Licensing application deadlines (from `business_category` + state)
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
This alert is one of the most emotionally important features in the compliance calendar. It fires proactively — not reactively.

Trigger: `dependent_birthdate` calculated → alert fires when child turns 20 years and 0 months (12 months before age-out)

Alert message (push notification + email + in-app banner):
"⚠️ IMPORTANT: [Child's name] turns 21 in approximately 12 months. E-2 dependent status ends on the 21st birthday. After that date, [child's name] will need independent immigration status to remain in the United States legally.

Options to explore now:
• F-1 Student Visa (if enrolled in a U.S. college or university)
• Their own E-2 visa (if they invest in a qualifying business)
• O-1 or other work visa (if qualifying talent/employment)
• Green card petition (if your EB-5 or EB-1C is already underway)

We strongly recommend consulting an immigration attorney to plan [child's name]'s pathway at least 12 months before their 21st birthday.

[Connect with an E-2 attorney →]  [Learn about options →]"

---

### Licensing Timeline Auto-Population
When `business_category` and `target_state` are confirmed in Module 2, the licensing timeline items are auto-populated:

Example — Senior care, Florida:
- T-6 months: "Begin AHCA Home Health Agency license application"
- T-5 months: "Submit AHCA application and fee ($295)"
- T-3 months: "Follow up on AHCA application status"
- T-2 months: "Confirm license is in process (bring confirmation to interview)"
- Interview: "Bring AHCA application confirmation number"
- Post-approval: "Finalize AHCA license before beginning client services"

Example — Childcare, California:
- T-9 months: "⚠️ Begin CDSS Community Care Facility license application immediately — California processing takes 4–8 months"
- T-7 months: "Submit CDSS application, background checks, and facility plans"
- T-5 months: "Schedule CDSS facility inspection"
- T-3 months: "Confirm CDSS application is in process"

---

### Calendar Display UI Specification
View options:
- **TIMELINE VIEW**: Horizontal timeline showing past (completed) and future (upcoming) items, color-coded by priority
- **LIST VIEW**: Sorted by date, grouped by "Overdue / This Week / This Month / Future"
- **DASHBOARD WIDGET**: Shows next 3 upcoming items on the main dashboard

Item states:
- ○ Not started (gray)
- ◑ In progress (yellow)
- ✅ Complete (green)
- ⚠️ Overdue (red)
- — Not applicable (hidden)

User can mark items complete, add notes, and set personal reminders. Critical items (🔴) cannot be dismissed without confirmation.

### Notification Rules
Push notifications and emails triggered for:
- Items due in 7 days
- Items due in 3 days
- Overdue items (24 hours after due date)
- Child age-out alert (see above)
- Renewal window opening (Year 4)

### Critical Item Dismissal Rules
Critical items (🔴) cannot be dismissed without confirmation.

### Renewal Trigger at Year 4
Year 4 renewal preparation triggers automatically when visa expiry date approaches.

---

## SECTION 2 — IDEAS.MD 12H ADDITIONS (Dual Anchor Date Logic)

### 2.1 — Two Distinct Date Concepts
Replace all references to "the user's target interview date" with the correct two-concept model:

**THE WORKING TARGET DATE:**
- **Definition:** A planning hypothesis the user sets early in their journey to make the timeline feel concrete and motivating.
- **Where it is set:** Journey wizard (pre-sign-up or dashboard)
- **Where it is stored:** `applications.working_target_date`
- **What it is used for:** Journey wizard display only. Motivational planning. Not used for any compliance deadline calculations.
- **Key rule:** NEVER use this date as a hard deadline anchor. Can be changed at any time with no downstream consequences.

**THE CONFIRMED INTERVIEW DATE:**
- **Definition:** The real consulate appointment date. Known only when the applicant has actually scheduled their appointment. Typically available 4–8 weeks before the interview.
- **Where it is set:** Compliance calendar or dashboard
- **Where it is stored:** `applications.confirmed_interview_date`
- **What it is used for:** ALL compliance deadline calculations.
- **Key rule:** This is the ONLY date used to calculate specific deadline dates on the calendar.

---

### 2.2 — Display Rules Based on Date Availability

**`confirmed_interview_date` IS NULL:**
- All calendar items display with range descriptions only.
- NEVER show a specific date when no confirmed date exists.
- Format: "Approximately [N] weeks before your interview"
- Banner at top of calendar: "Your compliance deadlines will lock in once you confirm your interview appointment date. Enter your date below to see specific deadlines."
- Input field: "I have my confirmed interview date → [date picker]"

**`confirmed_interview_date` IS SET:**
- All calendar items display with specific calculated dates.
- Format: "[Day, Month Date, Year]"
- Banner at top of calendar: "Deadlines calculated from your confirmed interview date of [confirmed_interview_date formatted]."
- Small "Update date" link for corrections.

---

### 2.3 — Update Propagation Rule
When `confirmed_interview_date` is set or changed:
- All calendar items for that application recalculate immediately.
- The dashboard milestone tracker updates immediately.
- The journey wizard working target date is NOT affected.
- These are separate concepts stored in separate columns.

---

### 2.4 — DB Fields Reference
- `applications.working_target_date` — journey wizard planning date
- `applications.confirmed_interview_date` — real appointment anchor
- `calendar_items.due_date` — specific date (null until confirmed)
- `calendar_items.range_description` — shown when `due_date` is null

---

### 2.5 — Layer 1 Correction
The existing Layer 1 description is replaced with:

"Layer 1 — Anchor Date
The confirmed interview date (`applications.confirmed_interview_date`) is the anchor for all deadline calculations. This date is distinct from the working target date set in the journey wizard (`applications.working_target_date`). Pre-interview events are calculated backward from `confirmed_interview_date` only. If `confirmed_interview_date` is null, all items display ranges, not specific dates."

---

*End of Compliance Calendar Specification*
*Next step: Build implementation per this spec.*