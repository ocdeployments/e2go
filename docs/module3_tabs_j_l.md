# Tabs J through L — Qualifications, Business Plan, Family Dependents
## Module 3 Interview Engine
*Version 1.0 | May 28, 2026 | Source: U.S. Embassy Toronto, FAM 9 FAM 402.9*

---

# TAB J — Applicant Qualifications & Organizational Chart

## Purpose

Tab J demonstrates that the applicant has the skills, experience, and
qualifications to develop and direct the enterprise. This is the "why you"
section of the application. It also produces the organizational chart
showing the applicant's controlling position within the business.

**Output:** Qualifications narrative + org chart description (for visual
rendering by the front-end).

---

## Questions

### QJ-01
**Question:** Please list your educational qualifications, starting with
your most recent degree or certification.
**Type:** repeating group (up to 5 entries)
**Fields per entry:** Institution name / Degree or certification / Field
of study / Year completed / Country

### QJ-02
**Question:** Please list all professional certifications, licences, or
designations you hold that are relevant to this business.
**Type:** textarea
**Example:** "Certified Food Manager (ServSafe), Red Seal trades certificate,
Provincial contractor licence #XXXXX"
**Has N/A option:** Yes

### QJ-03
**Question:** Please describe your work history for the past 10 years,
starting with your most recent position.
**Type:** repeating group (up to 7 entries)
**Fields per entry:** Employer name / Your title / Start date / End date
(or "Current") / Country / Brief description of responsibilities
**Tooltip:** Focus on experience relevant to managing and operating a
business. Highlight management responsibilities, financial oversight,
team leadership, and industry-specific experience.

### QJ-04
**Question:** What specific experience do you have that directly prepares
you to run this type of business?
**Type:** textarea
**Tooltip:** This is the most important question in Tab J. Connect your
history directly to this specific business. If you are opening a restaurant,
describe your food service management experience. If you are buying a
cleaning franchise, describe operations, staff management, and service
delivery experience.

### QJ-05
**Question:** Have you ever owned or operated a business before?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QJ-05a
**QJ-05a:** Describe the business, your role, and for how long you
operated it.
**Type:** textarea

### QJ-06
**Question:** Have you ever managed a team of employees?
**Type:** select
**Options:** Yes — fewer than 5 / Yes — 5 to 20 / Yes — more than 20 / No
**Branch:** Yes → QJ-06a
**QJ-06a:** Describe the nature of the team and your management
responsibilities.
**Type:** textarea

---

## Organizational Chart (Auto-Generated)

The org chart is generated from the following data points:
- Applicant name and title (from QA-54)
- Ownership percentage (from QE-09 / QA-55)
- Partner name and title (if partnership, from QE-08)
- Planned employee positions (from QI-04)

**For Solo Applicant:**
```
[Applicant Name]
Owner / Managing Director (100%)
         |
[Employee Role 1] — [Employee Role 2] — [Employee Role 3]
```

**For Partnership:**
```
[Applicant Name]          [Partner Name]
Co-Owner / Director (50%) Co-Owner / Director (50%)
              |
    [Employee Role 1] — [Employee Role 2]
```

**Tab J Document Checklist (Auto-Generated)**

| Document | Condition |
|----------|-----------|
| CV / résumé | Always |
| Degree certificates or transcripts | Always (for degrees claimed) |
| Professional licences or certification documents | If applicable |
| Reference letters from prior employers | Recommended if available |
| Prior business registration or ownership documents | If prior business owned |

---

# TAB K — Business Plan Generator

## Purpose

Tab K generates the complete business plan — the single most detailed
document in the application. The business plan must convince the consular
officer that this is a real, viable enterprise and that the applicant has
a credible operational plan.

The app generates the business plan from the applicant's answers across
Tabs D, G, H, I, J, and the dedicated Tab K questions below. The LLM
assembles these into a structured, professionally written business plan
using the applicant's specific data.

**Output:** Complete business plan (typically 10–15 pages), including:
executive summary, business description, market analysis, operations plan,
management and staffing plan, marketing strategy, and 5-year financial
projections.

**Important note on financial projections:**
The projections entered in Tab I are used as the basis. The app generates
a formatted financial table. The applicant is responsible for reviewing
the figures and ensuring they are realistic and supportable.

---

## Questions

### QK-01
**Question:** In one paragraph, describe what your business does, who
it serves, and how it makes money.
**Type:** textarea
**Tooltip:** Write this in plain, clear language as if explaining to someone
who has never heard of your industry. This feeds the executive summary.

### QK-02
**Question:** Who are your target customers?
**Type:** textarea
**Example:** "Our primary customers are homeowners aged 35–65 within
a 25-kilometre radius of our Orlando service area who require professional
residential cleaning services on a recurring weekly or biweekly basis."

### QK-03
**Question:** Who are your main competitors, and what makes your business
different?
**Type:** textarea
**Tooltip:** Name specific competitors in your target market. Describe what
distinguishes your business — price, quality, location, specialization, brand.

### QK-04
**Question:** How will you market and attract customers?
**Type:** textarea
**Example:** "Digital marketing via Google Ads and local SEO, franchise
brand marketing support, word-of-mouth referral program, and partnerships
with local property management companies."

### QK-05
**Question:** Describe your day-to-day operations. What does the business
look like on a typical working day?
**Type:** textarea
**Tooltip:** Be specific. Describe opening procedures, service delivery,
staffing, supplier interactions, and end-of-day activities. This shows
the officer that you understand how the business actually runs.

### QK-06
**Question:** What are your main startup costs and operating expenses?
**Type:** structured cost table
**Line items (pre-populated, editable):**
- Franchise fee or acquisition price
- Leasehold improvements / build-out
- Equipment and furnishings
- Initial inventory
- Working capital reserve
- Legal and professional fees
- Licences and permits
- Marketing and launch costs
- Other (open field)
**Type per line:** currency (USD)

### QK-07
**Question:** What are your projected monthly fixed operating expenses
once the business is running?
**Type:** structured cost table
**Line items:**
- Rent / lease
- Utilities
- Payroll (total)
- Insurance
- Royalties (if franchise)
- Marketing
- Professional services (accounting, legal)
- Other
**Type per line:** currency (USD)

### QK-08
**Question:** What is the basis for your revenue projections?
**Type:** textarea
**Tooltip:** Explain what assumptions drive your projections. For a franchise,
reference the FDD average unit revenue. For an acquisition, reference prior
year revenues. For a new business, reference market research, comparable
businesses, or pilot data. Unsupported projections are a common weakness.

### QK-09
**Question:** Is there anything about your market, location, or business
model that gives you a competitive advantage or makes success more likely?
**Type:** textarea
**Example:** "The franchise territory assigned to us has no existing
franchisees within 50 kilometres, giving us an exclusive service area
of approximately 85,000 households."

### QK-10 — Franchise Only
*Shown if QF-01 = "Franchise"*
**Question:** What training and ongoing support does the franchisor provide?
**Type:** textarea
**Tooltip:** Describe the initial training program, ongoing field support,
proprietary systems, and franchisor brand resources. This strengthens
the business viability section.

---

# TAB L — Family Dependents

## Purpose

Tab L collects all information for each qualifying dependent — spouse and/or
children — and generates the dependent cover letter(s) and dependent
document checklists.

*This entire tab is skipped if Q0-16 = "No".*

**Output:** Dependent cover letter / DS-160 reference for each dependent +
per-dependent document checklist.

---

## Spouse Questions
*Shown if Q0-16 includes spouse*

### QL-01
**Question:** What is your spouse's full legal name as it appears on their
passport?
**Type:** text (surname, given name, middle name)

### QL-02
**Question:** What is your spouse's date of birth?
**Type:** date

### QL-03
**Question:** What is your spouse's country of citizenship?
**Type:** select (country list)

### QL-04
**Question:** What is your spouse's passport number and expiry date?
**Type:** text + date
**Tooltip:** Confirm the passport will be valid through your intended
travel date.

### QL-05
**Question:** What is your spouse's current occupation?
**Type:** text

### QL-06
**Question:** Does your spouse intend to seek employment in the United States?
**Type:** select
**Options:** Yes / No / Undecided
**Tooltip:** E-2 dependent spouses are eligible to apply for work
authorization in the U.S. via Form I-765. This does not need to be
decided now, but it affects which supporting documents are relevant.

### QL-07
**Question:** Has your spouse ever been refused a U.S. visa, refused
entry, removed, or convicted of a criminal offence?
**Type:** select
**Options:** No / Yes — one or more of the above / I am not sure
**Branch:** Yes / Not sure → attorney flag W-19 confirmed + advisory note

---

## Children Questions
*Shown once per child if Q0-16 includes children*
*Repeating group — one set of questions per child*

### QL-08
**Question:** What is this child's full legal name?
**Type:** text

### QL-09
**Question:** What is this child's date of birth?
**Type:** date
**Validation:** Auto-calculate age. Flag if 18, 19, or 20 years old
for age-out risk advisory.

### QL-10
**Question:** What is this child's country of citizenship?
**Type:** select (country list)

### QL-11
**Question:** What is this child's passport number and expiry date?
**Type:** text + date

### QL-12
**Question:** Is this child currently unmarried?
**Type:** select
**Options:** Yes — currently unmarried / No — this child is married
**Branch:** No → attorney flag W-18 confirmed — child likely does not qualify

### QL-13
**Question:** Does this child have any prior U.S. visa refusals, entry
refusals, or criminal history in any country?
**Type:** select
**Options:** No / Yes / I am not sure
**Branch:** Yes / Not sure → attorney flag W-19 confirmed

---

## Tab L Document Checklist (Auto-Generated Per Dependent)

### Spouse
| Document | Notes |
|----------|-------|
| Spouse's passport biographical page (copy) | Must be valid through intended travel date |
| Marriage certificate | Certified/notarized copy |
| Spouse's DS-160 confirmation page | Completed separately at ceac.state.gov |
| Spouse's birth certificate | Certified copy |

### Each Child
| Document | Notes |
|----------|-------|
| Child's passport biographical page (copy) | Must be valid through intended travel date |
| Child's birth certificate | Certified copy — establishes parentage |
| Child's DS-160 confirmation page | Completed separately at ceac.state.gov |
| Proof of unmarried status (if 18–20) | School enrollment letter or statutory declaration |

---

# Complete Tab Summary

| Tab | Name | Questions | Output |
|-----|------|-----------|--------|
| A | DS-160 Reference Generator | 58 | DS-160 + DS-156E reference sheets |
| B | Personal Documents Checklist | 0 (auto-generated) | Personalized document checklist |
| C | Visa Category Confirmation | 0 (auto-generated) | One-page classification letter |
| D | Cover Letter Generator | 6 | Full application cover letter |
| E | Ownership Structure | 7–11 (solo/partner) | Ownership narrative |
| F | Investment Proof | 11 | Investment narrative + doc checklist |
| G | Real Business Evidence | 8 | Business evidence narrative + checklist |
| H | Source and Path of Funds | 6 | Funds flow narrative + doc checklist |
| I | Non-Marginality Evidence | 8 | Non-marginality narrative + projections |
| J | Qualifications + Org Chart | 6 | Qualifications narrative + org chart |
| K | Business Plan Generator | 10 | Complete 5-year business plan |
| L | Family Dependents | 6–13 (per dependent) | Dependent cover letters + checklists |
| **Total** | | **~130–150 base (excl. branches)** | |

---

*End of Module 3 Interview Engine — All 12 Tabs*
*Next: Module 4 — Application Review & Readiness Score*
