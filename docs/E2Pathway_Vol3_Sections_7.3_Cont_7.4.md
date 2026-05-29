# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Section 7.3 (Groups 3F–3I) & Section 7.4
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 7.3 Interview Engine — Module 3 Question Set (Continued)

### GROUP 3F — Investor Qualifications (14 Questions)

Q3F-01: "What is your current job title and employer in Canada?"
- Fields: Job title / Employer name / Years in this role
- Output: Tab J resume section; Cover letter paragraph 7

Q3F-02: "Describe your primary job responsibilities in your current or most
          recent role."
- Field: Text area (minimum 75 words encouraged)
- Output: Tab J qualifications narrative; Cover letter paragraph 7
- Tooltip: "Focus on management responsibilities — budgeting, staff oversight,
  client relationships, operations. These are what the officer looks for when
  assessing whether you can 'develop and direct' a U.S. business."

Q3F-03: "List your prior work experience (most recent first). For each role:"
- Repeating fields: [Job title] / [Employer] / [Dates from–to] / [Key responsibilities]
- Minimum: 2 entries encouraged; 5 entries maximum shown
- Output: Tab J resume; qualifications section of cover letter

Q3F-04: "Do you have any experience directly relevant to the business you
          are starting? (e.g., healthcare background for a senior care business)"
- Yes → "Describe how your experience relates to this business"
- No → advisory: "You do not need direct industry experience to qualify for
  E-2 — but you must demonstrate the management capability to run the business.
  We will frame your transferable management skills appropriately."
- Output: Cover letter paragraph 7; Tab J qualification narrative

Q3F-05: "List any professional certifications, designations, or licences you
          hold (e.g., PMP, CPA, RN, P.Eng.):"
- Repeating fields: [Certification name] / [Issuing body] / [Year obtained]
- Output: Tab J

Q3F-06: "List any post-secondary education:"
- Repeating fields: [Degree/Diploma] / [Institution] / [Year graduated] / [Field of study]
- Output: Tab J; Cover letter

Q3F-07: "Have you ever owned a business in Canada or elsewhere?"
- Yes → "Business name / Type / Years operated / Annual revenue (approximate) /
         Did you have employees? / Outcome (still operating / sold / closed)"
- No → continue
- Output: Tab J prior business ownership section; Cover letter paragraph 7

Q3F-08: "Do you have any experience managing staff?"
- Yes → "How many people have you managed, and in what context?"
- No → advisory: "If you have no staff management experience, your business
  plan should show a gradual staffing ramp-up and your cover letter should
  emphasize your plans for management training, franchise support (if applicable),
  or outside management expertise (e.g., hiring an experienced manager)."
- Output: Cover letter; Tab J

Q3F-09: "Do you speak English fluently?"
- Yes → continue
- No → advisory: "The E-2 interview is conducted in English. If English is not
  your primary language, consider requesting an interpreter for the interview —
  this is permitted at the Toronto consulate. Inform us so we can note this in
  your preparation materials."
- Note: This does not affect eligibility; French-speaking Canadians may
  request interpretation

Q3F-10: "Have you taken any steps to learn about the U.S. business you are
          acquiring or starting? (e.g., site visits, franchise discovery day,
          industry training, meetings with current owners)"
- Multi-select:
  □ Attended franchise discovery day
  □ Visited the business location or similar operations
  □ Spoken with existing franchisees or owners in this industry
  □ Completed industry-specific training or courses
  □ Hired a consultant to evaluate the opportunity
  □ None of the above
- Output: Cover letter paragraph 7; interview prep
- Advisory if "none selected": "Taking at least one concrete step to research
  the business before your interview strengthens the argument that you are
  a genuine investor, not someone going through the motions. Consider arranging
  a site visit or industry call before your interview date."

Q3F-11: "Do you have any personal or professional ties to the United States?
          (e.g., family members who are U.S. citizens, prior U.S. work experience)"
- Yes → specify; immigrant intent risk assessment updated accordingly
- No → continue

Q3F-12: "Why did you choose this specific business in this specific U.S. location?"
- Field: Text area
- Output: Cover letter paragraph 2; interview prep question bank
- Tooltip: "The officer will almost certainly ask this. Your answer should
  combine personal motivation, professional qualifications, and market logic.
  For example: 'I have 15 years of healthcare management experience in Canada,
  and I identified an underserved senior population in the Tampa Bay area
  following an extended research period that included a site visit in January 2026.'"

Q3F-13: "What is your long-term vision for this business in 5 years?"
- Field: Text area
- Output: Business plan vision statement; Cover letter closing paragraph
- Tooltip: "Focus on business growth — number of employees, revenue, additional
  locations, or expanded services. Avoid any language suggesting you plan to
  stay in the U.S. permanently independent of the business."

Q3F-14: "Is there anything else in your background that you believe strengthens
          your case as an E-2 investor? (Optional)"
- Field: Text area
- Output: Cover letter additional qualifications paragraph (if content provided)

---

### GROUP 3H — Non-Immigrant Intent (8 Questions)

This group is one of the most strategically important in the entire interview.
The 214(b) denial — officer determines the applicant intends to immigrate
permanently — can override an otherwise perfect application. These questions
assess the user's risk profile and generate both cover letter language and
interview coaching specific to their situation.

Q3H-01: "Do you currently own property in Canada?"
- Yes, I own my primary residence → intent_signal = "strong_tie"
- Yes, I own investment property → intent_signal = "moderate_tie"
- No, I rent → intent_signal = "neutral"
- No, I recently sold my property → intent_signal = "flag"; advisory triggered

Advisory if property sold:
"⚠️ Immigrant Intent Flag: Selling your Canadian home before your E-2 visa
is approved can trigger a 214(b) concern — it may appear you have no intention
of returning to Canada. We strongly recommend:
(1) Delaying the sale of your Canadian home until after your visa is approved, OR
(2) Purchasing or renting alternate Canadian accommodation to maintain a clear
    Canadian address, OR
(3) Documenting your reasons for the sale and your Canadian ties through other
    means (family, business interests, financial accounts).
We will address this in your cover letter and interview prep."

Q3H-02: "Do you have family members (parents, adult children, siblings) who
          remain in Canada?"
- Yes, close family remains in Canada → intent_signal += "tie"
- No, all family is moving to U.S. with me → intent_signal = "no additional tie"
- Output: Cover letter Canadian ties paragraph

Q3H-03: "Will you maintain any Canadian bank accounts or financial accounts
          after moving to the U.S.?"
- Yes → intent_signal += "tie"
- No → advisory: "Closing all Canadian accounts before your interview removes
  a key tie-to-Canada indicator. Consider maintaining at least one Canadian
  account — even with a modest balance — through the interview process."

Q3H-04: "Do you hold any active professional licences, memberships, or
          registrations in Canada?"
- Yes (e.g., professional designation, association membership) →
  intent_signal += "tie"; note added to cover letter
- No → continue

Q3H-05: "Have you filed, or do you plan to file, a Canadian departure tax return?"
- Yes, I have filed / plan to file → departure_tax_status = "filed"
- I am not sure → advisory + CPA referral
- Output: Compliance calendar CPA referral; Canadian tax section of cover letter

Q3H-06: "Do you plan to apply for U.S. permanent residence (a green card)
          in the future?"
- Yes → advisory: "Having a long-term green card intention is not disqualifying
  for E-2 — many E-2 investors pursue EB-5 or EB-1C concurrently. However,
  you must NOT express this intent during your interview or in your written
  materials. Your E-2 application must demonstrate non-immigrant intent.
  We will coach you on how to answer questions about your long-term plans
  appropriately."
- No → continue
- Output: Interview prep coaching section on immigrant intent questions

Q3H-07: "Do you have any current immigration applications pending in the U.S.?
          (e.g., adjustment of status, pending green card petition)"
- Yes → attorney referral flag: "A pending immigrant visa application can be
  used by an officer as evidence of immigrant intent. This situation requires
  legal guidance before proceeding. We recommend consulting an E-2
  immigration attorney."
- No → continue

Q3H-08: "In your own words, why do you plan to return to Canada eventually,
          and under what circumstances would that happen?"
- Field: Text area
- Output: Interview prep — this exact question is likely to be asked;
  user's answer is reviewed and coaching provided
- Tooltip: "The most common answer officers accept: 'I intend to operate this
  business for as long as my E-2 visa permits. If the business is no longer
  viable, or if I no longer hold E-2 status, I will return to Canada. I
  maintain strong ties to Canada including [family / property / professional
  connections].'"

---

### GROUP 3I — Business Licensing & Operations (12 Questions)

Q3I-01: "What is the current operational status of your business?"
- Pre-populated from Q3C-07; user can update
- Output: Tab G cover page; interview prep

Q3I-02: "Have you applied for all required business licenses and permits?"
- Pre-populated from licensing matrix; user confirms each item:
  □ State business license — [status]
  □ Local/city business permit — [status]
  □ Industry-specific license — [status: applied / pending / granted / not started]
  □ Health department permit (if applicable) — [status]
  □ Zoning approval (if applicable) — [status]
- Output: Tab G operational evidence list; compliance calendar updates

Q3I-03: "Do you have business insurance in place?"
- Types prompted based on business category:
  □ General liability insurance ($1M minimum recommended) — [status]
  □ Professional liability / E&O — [status]
  □ Workers' compensation (if employees hired) — [status]
  □ Commercial auto (if vehicles used) — [status]
  □ Business owner's policy (BOP) — [status]
- Advisory: "Your lease agreement may require proof of general liability
  insurance before occupancy. Ensure insurance is in place before your
  interview — it is evidence the business is operational."
- Output: Tab G; compliance calendar for pending insurance items

Q3I-04: "What is the business's operating hours?"
- Fields: Days open / Opening time / Closing time
- Output: Business plan operations section; interview prep

Q3I-05: "Describe the physical premises of the business:"
- Type: Office / Retail / Home-based / Vehicle-based / Multiple locations
- Square footage: [number]
- Lease term: [months/years]
- Monthly rent: [USD]
- Output: Business plan operations section; Tab F lease details

Q3I-06: "Do you have a signed lease or property purchase agreement?"
- Yes → "When does the lease begin and end?"
- No → compliance calendar entry; advisory about having lease before interview

Q3I-07: "What equipment, vehicles, or technology has been purchased or ordered?"
- Repeating fields: [Item description] / [Cost USD] / [Purchased / Ordered / Planned]
- Output: Template 3 (Asset Register); Tab F investment evidence

Q3I-08: "Have you opened a U.S. business bank account?"
- Yes → "Bank name / Account type"
- No → compliance calendar entry; advisory + banking partner referral option
  "TD Bank and RBC offer cross-border banking services specifically designed
  for Canadians establishing U.S. businesses. Would you like to be connected
  with a cross-border banking specialist?"

Q3I-09: "Do you have a U.S. accountant or bookkeeper engaged?"
- Yes → continue
- No → advisory: "Engaging a U.S. CPA before your interview demonstrates the
  business is being set up seriously. Your CPA can also help with your first
  U.S. tax filings and FBAR compliance."
  CPA referral integration point → cross-border CPA partner referral

Q3I-10: "Have you or the business obtained an ITIN (Individual Taxpayer
          Identification Number) or EIN?"
- EIN obtained → confirm number (pre-filled from Q3C-04)
- ITIN needed → advisory + instructions for obtaining ITIN as a Canadian
  without SSN; compliance calendar entry
- Neither → compliance calendar entries for both

Q3I-11: "Describe your plan for the first 90 days of business operations:"
- Field: Text area (key milestones)
- Output: Business plan operational timeline; interview prep
- Prompt examples: "Hire first two employees by Day 30 / Complete caregiver
  training by Day 45 / Acquire first 3 clients by Day 60 / Achieve break-even
  by Month 6"

Q3I-12: "Is there anything about the business's operational setup that you
          think is unusual, incomplete, or may raise questions at the interview?"
- Field: Text area (optional)
- Output: Interview prep — flagged for specific coaching; cover letter
  may address identified concerns proactively
- Tooltip: "This is your chance to tell us about anything that might look
  unusual in your application. It's better for us to know now and address it
  proactively than for an officer to raise it without your being prepared."

---

### Module 3 — Completion & Handoff

After all 9 groups are completed, the app displays a Module 3 summary:

```
MODULE 3 COMPLETE

You've answered 131 questions across 9 topic groups.
Here's what we've captured:

Personal Information:         ✅ Complete (15/15)
Investment & Source of Funds: ✅ Complete (22/22)
Business Details:             ✅ Complete (18/18)
Business Plan Financials:     ✅ Complete (20/20)
Hiring & Staffing:            ✅ Complete (12/12)
Investor Qualifications:      ✅ Complete (14/14)
Family & Dependents:          ✅ Complete (10/10)
Non-Immigrant Intent:         ✅ Complete (8/8)
Business Licensing & Ops:     ✅ Complete (12/12)

Based on your answers, we are now generating:
  → DS-160 Reference Sheet
  → Cover Letter (Tab D)
  → Source of Funds Chronology (Tab H / Template 1)
  → Business Plan (Tab K / Template 2)
  → Asset Register (Template 3)
  → Organizational Chart (Template 4)
  → Hiring Plan (Template 5)
  → Application Binder Checklist (all 11 tabs)
  → Interview Preparation Guide
  → Compliance Calendar (personalized)
  → Application Confidence Score

[Generate My Package →]
```

---

## 7.4 Template Specifications

### Overview
Five core templates are generated from Module 3 data. Each template is
output as a formatted document that is either: (a) inserted directly into
the application binder PDF, or (b) used as a structured exhibit within
a tab. Templates are generated in one pass after Module 3 is complete —
they are not manually filled by the user.

---

### Template 1 — Source and Path of Funds

**Purpose:** Proves the investment funds are lawfully sourced and traces
their complete path from origin to the U.S. business account.

**Format:** Narrative + chronological table + exhibit list

**Structure:**

SECTION 1 — INTRODUCTION (AI-generated, 2 paragraphs)
"[Applicant Name] is a Canadian citizen who has invested [amount] USD
in [Business Name], a [business type] located in [city, state]. The
following documents the complete source and path of these funds from
their origin to the U.S. business bank account."

SECTION 2 — SOURCE NARRATIVE (AI-generated per source type)

If savings:
"[Name] accumulated [amount] CAD in personal savings over [X] years
of employment as [job title] at [employer(s)]. These savings were
held in [bank name] and represent [X] years of disciplined financial
accumulation from [Name]'s employment income."

If property sale:
"On [date], [Name] sold [property type] located at [address] for
[amount] CAD. The property was originally purchased on [date] for
[amount] CAD. After deducting the outstanding mortgage of [amount] CAD
and closing costs of approximately [amount] CAD, [Name] received net
proceeds of [amount] CAD, which were deposited to [bank name] account
[last 4 digits] on [date]."

If business sale:
"On [date], [Name] completed the sale of [Business Name], a [type]
business operated since [year], for [amount] CAD. The proceeds
were deposited to [bank] on [date]."

If RRSP:
"On [date], [Name] redeemed [amount] CAD from an RRSP held at
[institution]. The applicable non-resident withholding tax of [%]
was remitted directly to CRA. The net proceeds of [amount] CAD
were deposited to [bank] on [date]."

If gift/inheritance:
"[Name] received a gift of [amount] CAD from [relationship, e.g.,
'the applicant's father, [Name]'], on [date]. The donor's funds
originated from [brief source description]. A gift letter signed
by the donor is included as Exhibit [X] to this chronology."

SECTION 3 — CHRONOLOGICAL TABLE (auto-generated)

| Date | Event | Amount (CAD) | Amount (USD) | Account / Institution |
|------|-------|-------------|-------------|----------------------|
| [date] | [event] | $XXX,XXX | $XXX,XXX | [bank] |
| [date] | [event] | $XXX,XXX | $XXX,XXX | [bank] |
| [date] | Wire transfer to U.S. business account | — | $XXX,XXX | [U.S. bank] |

SECTION 4 — EXHIBIT LIST (auto-generated from documentation checklist)
Lists all supporting documents to be included as exhibits:
- Bank statements (account, date range)
- Property sale agreement and settlement statement
- RRSP redemption confirmation
- Wire transfer confirmations
- Any additional source documentation

---

### Template 2 — Business Plan

**Purpose:** The complete business plan for Tab K. Approximately 15–20 pages
when generated with full inputs.

**Sections generated:**

1. EXECUTIVE SUMMARY (1 page)
   - Business name, type, location
   - Investor name and nationality
   - Total investment amount
   - Business description (from Q3C-06)
   - Key financial highlights (Year 1 and Year 5 revenue)
   - Job creation summary

2. BUSINESS DESCRIPTION (1–2 pages)
   - Nature of the business (detailed)
   - Products/services offered
   - Target customer profile
   - Business model (how it generates revenue)
   - Franchise details (if applicable — franchise system, territory, FDD highlights)
   - Acquisition details (if applicable — prior operating history)

3. MARKET ANALYSIS (2–3 pages)
   - Target market demographics (specific to city/region from Q3D-09)
   - Market size and growth trends (industry statistics + local data)
   - Competitive landscape (competitors from Q3D-10)
   - Competitive differentiation

4. OPERATIONS PLAN (1–2 pages)
   - Business location and premises
   - Operating hours and model
   - Equipment and technology
   - Licensing and regulatory compliance
   - First 90 days operational plan (from Q3I-11)

5. MANAGEMENT & ORGANIZATIONAL STRUCTURE (1 page)
   - Investor's role and responsibilities
   - Organizational chart (from Template 4)
   - Key hires and their roles
   - Management qualifications summary

6. STAFFING PLAN (1 page)
   - Year 1 staffing (from Template 5)
   - Year 3 and Year 5 staffing projections
   - Compensation overview
   - Employee classification (W-2 vs. 1099)

7. FINANCIAL PROJECTIONS (3–4 pages)
   - Start-up cost summary (from Template 3)
   - Revenue projections — Year 1 monthly, Years 1–5 annual
   - Expense projections — Years 1–5
   - Profit and Loss projection — Years 1–5
   - Break-even analysis
   - Owner's draw / salary projection
   - Basis for projections (evidence sources from Q3D-08)
   - Non-marginality demonstration table

8. INVESTMENT SUMMARY (1 page)
   - How investment funds are allocated
   - Status of investment deployment
   - Funds at risk confirmation

---

### Template 3 — Business Asset Register

**Purpose:** Documents all tangible and intangible assets of the business
as evidence of investment deployment. Used in Tab F and Tab G.

**Format:** Categorized table

| Asset Category | Item Description | Qty | Unit Cost (USD) | Total Cost (USD) | Status |
|---|---|---|---|---|---|
| Franchise fee | [Franchise name] initial fee | 1 | $60,000 | $60,000 | Paid |
| Leasehold improvements | Office renovation, signage | 1 | $25,000 | $25,000 | Complete |
| Equipment | [Item] | [qty] | $X,XXX | $X,XXX | Purchased/Ordered |
| Vehicles | [Make/Model] | 1 | $X,XXX | $X,XXX | Leased/Purchased |
| Technology | CRM software, computers | — | $X,XXX | $X,XXX | Purchased |
| Initial inventory | [Description] | — | $X,XXX | $X,XXX | Ordered |
| Working capital | Operating reserve | — | $X,XXX | $X,XXX | Deposited in bank |
| Professional fees | Legal, accounting, licensing | — | $X,XXX | $X,XXX | Paid |
| **TOTAL** | | | | **$XXX,XXX** | |

**Validation:** Total must equal or closely match investment_amount_usd.
Any significant discrepancy triggers a warning.

---

### Template 4 — Organizational Chart

**Purpose:** Demonstrates the management structure and the investor's
active role. Required for Tab J. For partnership applications, shows
both investors' distinct roles.

**Format:** Visual hierarchy diagram (generated as SVG/PNG for insertion
into PDF) + narrative description

**Solo investor example:**
```
[INVESTOR NAME]
President & General Manager
├── Operations Manager (hire Year 2)
│   ├── Caregiver / Staff (FT × 3)
│   └── Caregiver / Staff (PT × 4)
├── Client Relations Coordinator (hire Month 6)
└── Administrative Assistant (PT, Month 3)
```

**Partnership example:**
```
[PARTNER A NAME]              [PARTNER B NAME]
CEO & Director of Operations  CFO & Director of Client Services
50% owner                     50% owner
├── Operations Staff           ├── Client Relations Staff
└── Administrative support     └── Marketing/Sales
```

**Narrative generated below chart:**
"[Name] serves as President and General Manager of [Business Name],
responsible for all aspects of business operations including: staff
management, financial oversight, client acquisition, compliance, and
strategic direction. [Name] will be present at the business location
[X] days per week and will make all key management decisions."

---

### Template 5 — Hiring Plan

**Purpose:** Documents the job creation commitment — the primary
non-marginality evidence at both initial application and renewal.

**Format:** Staffing timeline table + compensation summary

PART A — STAFFING TIMELINE

| Position | Type | Hire Date | Annual Salary | Benefits | Cumulative FT Jobs |
|---|---|---|---|---|---|
| [Title] | FT | Month [X] | $X,XXX | Health/PTO | 1 |
| [Title] | PT | Month [X] | $X,XXX | — | 1 |
| [Title] | FT | Month [X] | $X,XXX | Health/PTO | 2 |
| Operations Manager | FT | Year 2 | $X,XXX | Full | 3 |
| [Additional Year 3–5 hires] | | | | | |
| **TOTAL — Year 5** | | | | | **[N] FT / [N] PT** |

PART B — COMPENSATION SUMMARY

Total payroll Year 1 (projected): $XXX,XXX
Total payroll Year 3 (projected): $XXX,XXX
Total payroll Year 5 (projected): $XXX,XXX

Compensation rates relative to [state] minimum wage and market rates:
[Auto-generated note confirming wages meet or exceed state minimum wage]

PART C — ECONOMIC IMPACT STATEMENT (AI-generated paragraph)

"[Business Name] projects the creation of [N] full-time equivalent
positions in [city, state] over 5 years, representing approximately
$[X] in annual payroll by Year 5. All positions will be available
to U.S. citizens and permanent residents. This job creation
demonstrates that [Business Name] is a non-marginal enterprise
making a significant economic contribution to the local community."

---

### Template Generation — Technical Notes

**Generation trigger:** All 5 templates are generated simultaneously
after Module 3 is completed and the user clicks "Generate My Package."

**Generation engine:** MiniMax M1 API — each template section is
generated via a structured prompt that injects the relevant user data
fields and instructs the model to generate the appropriate narrative
using the approved tone and legal language from soul.md.

**Regeneration:** Each template section can be individually regenerated
if the user wants to try a different phrasing. A "regenerate this section"
button appears on hover for each paragraph.

**Editing:** Users can edit any generated text directly in the app
before the final PDF is assembled. All edits are saved to the
application record.

**Quality flags:** Before final PDF generation, the app runs a
quality check across all templates:
- Template 1 total ≈ Template 3 total ≈ investment_amount_usd
- Template 5 Year 5 employment ≥ 2 FT (non-marginality minimum)
- Template 2 Year 5 revenue ≥ 3x household_income_need
- Template 4 shows investor in a named management role
Any failed check generates a warning before PDF export.

---

*End of Sections 7.3 (Groups 3F–3I) and 7.4*
*Next: Section 7.5 — Application Confidence Score Engine*
*      Section 7.6 — Interview Simulator Specification*
