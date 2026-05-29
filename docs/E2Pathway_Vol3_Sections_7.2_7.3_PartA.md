# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 7.2 & 7.3
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 7.2 Business Type Advisor — Module 2 Specification

### Purpose of This Module
Module 2 takes the routing data from Module 1 and helps users either confirm
their existing business choice or discover a compatible business type. It is the
primary decision-support tool in the app and the integration point for the
franchise broker referral. For users who arrive knowing exactly what business
they want, it validates that choice and flags any concerns. For users who are
still deciding, it produces a ranked shortlist of compatible business types.

---

### Module 2 — Entry Conditions

Module 2 receives the following pre-populated data from Module 1:
- investment_amount_usd (converted from CAD at live rate)
- source_type
- business_status (identified / exploring / needs_guidance)
- business_route (franchise / acquisition / greenfield / partner_investment / undecided)
- application_type (solo / partnership)
- location (canada / usa)
- target_state (if already known)
- immigrant_intent_risk level

---

### Module 2 — Question Set

**SECTION A — Business Profile (Questions 1–6)**

Q1: "What U.S. state or states are you considering for your business?"
- Dropdown: all 50 states + "Not sure yet"
- Multi-select allowed (up to 3 states)
- If "Not sure yet" → advisory: "Florida, Texas, Arizona, and Georgia are the
  most popular E-2 destination states for Canadians. Florida is particularly
  common due to: no state income tax, large retiree population (strong senior
  care demand), warm climate, and a large Canadian expat community."
- State selection triggers licensing requirement matrix lookup

Q2: "Which of the following best describes your professional background?
     Select all that apply."
- Healthcare / caregiving / medical
- Education / teaching / training
- Business operations / management
- Sales / marketing / customer service
- Trades / construction / maintenance
- Technology / IT / software
- Finance / accounting / bookkeeping
- Retail / hospitality / food service
- Real estate
- Other: [text field]

Q3: "Have you owned or managed a business before?"
- Yes, I have owned a business → business_experience = "owner"
- Yes, I have managed a business (but not owned) → business_experience = "manager"
- No → business_experience = "none"
  Advisory for "none": "No prior business ownership is not a disqualifier for
  E-2 — but your qualifications section will need to demonstrate why you are
  capable of running the specific business you choose. We'll help you frame
  your professional experience as relevant management capability."

Q4: "Do you have a preference for business model type?"
- I want a business with recurring monthly revenue (clients pay regularly)
- I want a business based on project/transaction revenue (paid per job)
- I want a product-based business (selling goods)
- I want a service-based business (selling expertise or labor)
- No strong preference

Q5: "How involved do you want to be in day-to-day operations?"
- Very hands-on — I want to be on-site every day
- Moderately involved — I will manage staff but not do front-line work
- Executive role — I will hire managers to run operations while I oversee strategy
- Advisory: "All E-2 investors must demonstrate they 'develop and direct' the
  business. Even an executive-style investor must show active management — not
  passive investment. Your role must be clearly documented regardless of how
  hands-on you are."

Q6: (If business_status = "identified") "Please describe the business you have
    in mind:"
- Business type / industry: [text or dropdown]
- Specific business name (if franchise or acquisition): [text]
- Approximate total cost of the business: [number field]
- Location / city: [text]

---

### Module 2 — Business Compatibility Assessment

After questions 1–6, the app runs the compatibility check against the
business category matrix from Section 6.9. For users with an identified
business (business_status = "identified"), it validates their specific choice.
For users who are exploring, it generates a shortlist.

**Validation flow (identified business):**

Step 1: Category lookup — map the business description to a category in the
        compatibility matrix

Step 2: Investment check — compare investment_amount_usd to the minimum and
        strong-position thresholds for that category

Step 3: Licensing check — look up the licensing requirements for that category
        in the user's target state(s)

Step 4: Proportionality check — compare investor's funds to total business cost

Step 5: Experience match — check whether background aligns with the business type

Step 6: Generate compatibility report:

```
YOUR BUSINESS ASSESSMENT

Business: Visiting Angels Franchise — Tampa, Florida
Category: Senior Home Care (Non-Medical)
E-2 Compatibility: ✅ Strong

Investment Analysis:
  Your available investment:     $155,000 USD
  Franchise fee estimate:        $60,000 USD
  Build-out / working capital:   $90,000 USD
  Total estimated cost:          $150,000 USD
  Proportionality:               100% ✅ Excellent

Licensing:
  Required: Home Health Agency License (Florida AHCA)
  Processing time: 60–120 days
  ⚠️ You must begin this application at least 4 months before
     your target interview date. We've added this to your
     compliance calendar.

Experience Match:
  Your healthcare background is a strong fit for this business
  type. ✅ Your qualifications section will emphasize your
  healthcare management experience as evidence you can
  develop and direct this enterprise.

Risk Flags:
  None identified.

Overall Assessment: ✅ This business choice is well-suited
for an E-2 application. Proceed to Module 3.
```

---

### Module 2 — Franchise Referral Integration

**Trigger conditions:**
1. User selects franchise route AND business_status = "needs_guidance" or "exploring"
2. User has an identified franchise category but no specific brand selected
3. User explicitly asks for help finding a franchise

**Referral prompt displayed:**
```
FIND YOUR FRANCHISE — FREE MATCHING SERVICE

Based on your profile:
• Budget: $155,000 USD
• Background: Healthcare
• Target state: Florida
• Preferred model: Recurring revenue

Our partner franchise consultants specialize in helping
Canadians find E-2-compatible franchises. Their service
is free to you — they are compensated by the franchisor
when a placement is made.

They can help you:
✓ Identify franchises that qualify for E-2 in your budget
✓ Evaluate the FDD (Franchise Disclosure Document)
✓ Understand territory availability in your target area
✓ Connect you with existing franchisees for reference calls

[Yes — connect me with a franchise consultant]
[No thanks — I'll research franchises myself]
```

If user selects yes → consent screen → referral data payload sent to partner
(see Section 7.9 for full referral flow specification)

---

### Module 2 — Business Plan Pre-Population

Once the business type and specific business are confirmed, Module 2 passes
the following data to Template 2 (Business Plan Generator):

- business_category
- business_name
- business_route (franchise / acquisition / greenfield)
- target_state
- target_city
- total_business_cost_usd
- investor_investment_usd
- business_experience level
- investor_background (used to frame qualifications section)
- licensing_requirements (from state matrix)

This pre-population means the user does not re-enter this information in
the business plan template — it flows through automatically.

---

## 7.3 Interview Engine — Module 3 Question Set

### Purpose of This Module
Module 3 is the heart of the app. It is the structured interview that collects
all the specific data needed to generate every document in the application package.
Questions are organized into topic groups. The user experiences them as a
conversational interview — short answer fields, multiple choice, date pickers,
and number fields — not as a form.

Every question in Module 3 has:
- The question text (plain English)
- An optional tooltip ("Why are we asking this?")
- The field type (text / number / date / multi-select / yes-no)
- The output it feeds (which document/template uses this answer)
- Branching logic (if applicable)

---

### Module 3 — Organization

The interview engine is organized into 9 topic groups, each corresponding
roughly to one tab or section of the application:

| Group | Topic | Approx. Questions | Primary Output |
|---|---|---|---|
| 3A | Personal Information | 15 | DS-160, Tab B, Tab D |
| 3B | Investment & Source of Funds | 22 | Tab F, Tab H, Template 1 |
| 3C | Business Details | 18 | Tab G, Tab K, Template 2 |
| 3D | Business Plan Financials | 20 | Tab I, Tab K, Template 2 |
| 3E | Hiring & Staffing | 12 | Tab I, Tab J, Template 5 |
| 3F | Investor Qualifications | 14 | Tab J, Tab D cover letter |
| 3G | Family & Dependents | 10 | Tab L, spouse DS-160, EAD |
| 3H | Non-Immigrant Intent | 8 | Tab D cover letter, interview prep |
| 3I | Business Licensing & Operations | 12 | Tab G, interview prep |

---

### GROUP 3A — Personal Information (15 Questions)

Q3A-01: "What is your full legal name as it appears on your Canadian passport?"
- Fields: First name / Middle name (optional) / Last name
- Output: DS-160 line 1, Cover letter salutation, all documents

Q3A-02: "What is your date of birth?"
- Field: Date picker
- Output: DS-160, age calculation for dependents

Q3A-03: "What is your country of birth?"
- Field: Dropdown (country list)
- Output: DS-160

Q3A-04: "What is your Canadian passport number?"
- Field: Text (alphanumeric)
- Output: DS-160; stored encrypted; displayed as last 4 digits only in UI
- Tooltip: "Your passport number is needed for the DS-160 form. We store it
  securely and only display the last 4 digits. It is never shared externally."

Q3A-05: "What is your passport expiry date?"
- Field: Date picker
- Output: DS-160; compliance calendar alert if expiry within 12 months of
  interview date
- Alert: "⚠️ Your passport expires within 12 months of your target interview
  date. Most countries require a passport valid for at least 6 months beyond
  your intended U.S. entry date. Consider renewing your passport before
  your interview."

Q3A-06: "What is your current home address in Canada?"
- Fields: Street address / City / Province / Postal code
- Output: DS-160 address field

Q3A-07: "What is your phone number?"
- Field: Phone (with country code)
- Output: DS-160

Q3A-08: "What is your email address?"
- Field: Email
- Output: DS-160; account email (pre-filled if matches registration)

Q3A-09: "What is your social media presence? (optional)"
- Fields: Twitter/X handle / Instagram / LinkedIn URL
- Note: DS-160 now requires social media disclosure
- Tooltip: "The DS-160 form requires disclosure of social media accounts used
  in the past 5 years. This is a federal requirement — do not omit accounts
  intentionally."

Q3A-10: "Have you ever been to the United States before?"
- Yes → follow-up: "When was your most recent visit and how long did you stay?"
- No → continue
- Output: DS-160 travel history section

Q3A-11: "Have you ever applied for a U.S. visa before?"
- Yes → "Was it approved or denied?" + "What visa type?"
- No → continue
- Output: DS-160 prior visa section
- If denied: advisory: "A prior visa denial must be disclosed on the DS-160.
  Failure to disclose is a misrepresentation — a more serious issue than the
  denial itself. Your cover letter may need to address the prior denial and
  the changed circumstances since then."

Q3A-12: "Have you ever overstayed a U.S. visa or been ordered removed from
          the United States?"
- Yes → [ATTORNEY REFERRAL FLAG] "This situation requires careful legal
  guidance before applying. We strongly recommend consulting with an E-2
  immigration attorney before proceeding."
- No → continue
- Output: DS-160 immigration history; immigrant intent risk flag

Q3A-13: "Have you ever been arrested, charged with, or convicted of a crime
          in any country?"
- Yes → attorney referral flag + advisory
- No → continue
- Output: DS-160 security questions

Q3A-14: "What is your current occupation in Canada?"
- Field: Text
- Output: DS-160 occupation field, Cover letter background paragraph

Q3A-15: "What is your highest level of education?"
- Dropdown: High school / College diploma / Bachelor's degree / Master's degree /
  Professional degree (MBA, JD, MD) / Doctorate
- Output: Tab J qualifications section, Cover letter paragraph 7

---

### GROUP 3B — Investment & Source of Funds (22 Questions)

Q3B-01: "What is the total amount you are investing in the U.S. business in CAD?"
- Field: Number
- Output: Live CAD/USD conversion displayed; Template 1 header; Tab F total

Q3B-02: "What is the total cost to acquire or establish the business in USD?"
- Field: Number
- Output: Proportionality calculator; substantiality assessment

Q3B-03: "How are the investment funds allocated? (Enter amounts in USD)"
- Fields: Franchise fee / Purchase price / Lease deposit / Build-out/renovation /
  Equipment and supplies / Working capital / Professional fees (legal, accounting) /
  Licensing fees / Other (describe): ___
- Output: Template 1 investment allocation table; Tab F; Cover letter paragraph 3
- Validation: Sum of all fields must equal or closely approximate total investment

Q3B-04: "Have the funds been transferred to the U.S. business account yet?"
- Yes, all funds transferred → status = "fully_deployed"
- Yes, partially transferred → status = "partially_deployed"; ask how much
- No, funds are still in Canada → status = "not_yet_transferred";
  advisory about at-risk requirement and wire transfer timing

Q3B-05: "Where did your investment funds originally come from?
          Select all that apply."
- Personal savings accumulated over time
- Sale of a Canadian property (primary residence or investment property)
- Sale of a Canadian business
- RRSP or RRIF withdrawal
- Inheritance received
- Gift from a family member
- Proceeds from investments (stocks, bonds, mutual funds)
- Combination of the above
- Other: [text]
- Output: Template 1 routing — determines which source documentation
  sub-questions are asked

**For each selected source, sub-questions are asked:**

[If "personal savings" selected:]
Q3B-06a: "Over approximately how many years did you accumulate these savings?"
Q3B-06b: "What was your primary occupation and income source during this period?"
Q3B-06c: "What bank(s) did you hold these savings in?"
Output: Template 1 savings narrative

[If "property sale" selected:]
Q3B-07a: "What type of property was sold? (Primary residence / Investment property)"
Q3B-07b: "When was the property sold? (Date)"
Q3B-07c: "What was the sale price in CAD?"
Q3B-07d: "What was the original purchase price and when was it purchased?"
Q3B-07e: "Where were the net proceeds deposited after the sale?"
Output: Template 1 property sale narrative; Tab H exhibit list

[If "business sale" selected:]
Q3B-08a: "What was the business name and type?"
Q3B-08b: "When was it sold and for how much (CAD)?"
Q3B-08c: "Where were the proceeds deposited?"
Output: Template 1 business sale narrative

[If "RRSP withdrawal" selected:]
Q3B-09a: "What institution held the RRSP?"
Q3B-09b: "What was the withdrawal amount and when was it made?"
Q3B-09c: Advisory displayed: "RRSP withdrawals as a non-resident attract a
          25% withholding tax. Consult a cross-border CPA before making this
          withdrawal if you have not already done so."
Output: Template 1 RRSP narrative; compliance calendar CPA referral

[If "inheritance/gift" selected:]
Q3B-10a: "Who gave you the funds and what is their relationship to you?"
Q3B-10b: "When were the funds received and how were they transferred to you?"
Q3B-10c: "Do you have documentation of the source of the donor's funds?"
Advisory: "Gifted funds require documentation of the donor's source of wealth,
not just proof of receipt. The consulate wants to know the funds were lawfully
obtained by the donor before being gifted to you."
Output: Template 1 gift narrative; gift letter template

Q3B-11: "Walk us through the path of your funds from their source to today.
          List the major steps and accounts the money passed through."
- Interface: Timeline builder — user adds events:
  [Date] [Event description] [Amount] [Account/Institution]
  Example:
  - March 2023: Sold condo at [address], net proceeds $310,000 CAD
  - March 2023: Deposited to TD Bank savings account [****1234]
  - August 2023: Transferred $180,000 CAD to RBC chequing [****5678]
  - January 2026: Wired $144,000 USD to [Business Name] U.S. bank account
- Output: Template 1 chronological table; cover letter paragraph 4

Q3B-12: "Have any of your funds passed through an account outside of Canada
          or the U.S. (offshore accounts, international transfers)?"
- Yes → advisory: "International fund transfers require additional documentation.
  Be prepared to explain the purpose of each international transfer and provide
  bank records for all accounts involved."
- No → continue

Q3B-13: "Do you have complete bank statements documenting the movement of
          these funds?"
- Yes, I have statements for all accounts → documentation_status = "complete"
- Mostly yes, but there are some gaps → documentation_status = "partial";
  advisory shown about gap risks
- No, some records are difficult to obtain → documentation_status = "incomplete";
  attorney referral recommended

---

### GROUP 3C — Business Details (18 Questions)

Q3C-01: "What is the legal name of your U.S. business entity?"
- Field: Text
- Output: All documents; DS-160 employer section

Q3C-02: "What is the business entity type?"
- LLC → entity_type = "llc"
- Corporation (C-Corp or S-Corp) → entity_type = "corp"
- Not yet formed → advisory: "Your business entity should be formed before
  your interview. Entity formation demonstrates the business is real and in
  process. Our compliance calendar will add this as a priority action item."

Q3C-03: "In which U.S. state is the business registered?"
- Dropdown
- Note: Can be different from operating state (e.g., Delaware LLC operating in Florida)
- Output: Tab G, business plan

Q3C-04: "What is the business's EIN (Employer Identification Number)?"
- Field: XX-XXXXXXX format
- If not yet obtained: advisory + compliance calendar entry + instructions for
  Canadian applicants to obtain EIN without SSN

Q3C-05: "What is the business's physical address in the U.S.?"
- Fields: Street / City / State / ZIP
- Output: All documents

Q3C-06: "What is the nature of the business? (Describe in 2–3 sentences
          what the business does and who its customers are)"
- Field: Text area
- Output: Cover letter paragraph 2; business plan executive summary;
  DS-160 business description
- Character limit: 500 characters
- Tooltip: "This description will appear in your cover letter and business plan.
  Write it as you would explain the business to someone who has never heard of it.
  Be specific — 'a non-medical senior home care company providing companionship
  and personal care services to seniors in the Tampa Bay area' is better than
  'a home care business'."

Q3C-07: "Is the business currently operational?"
- Yes, fully operational → operational_status = "operating"
- Partially operational (location secured, not yet serving clients) →
  operational_status = "partial"
- In process (entity formed, agreements signed, not yet open) →
  operational_status = "in_process"
- Not yet started → operational_status = "pre_start"; advisory about needing
  to demonstrate business in process before interview

Q3C-08: "What is the status of your business premises?"
- Lease signed → lease_status = "signed"
- Lease agreed, not yet signed → lease_status = "pending"; compliance calendar entry
- Property purchased → lease_status = "owned"
- Home-based (no commercial premises) → lease_status = "home_based";
  advisory about documentation requirements for home-based businesses
- Not yet determined → compliance calendar entry

Q3C-09: (If franchise) "What franchise system is this?"
- Field: Franchise name
- "Have you signed the Franchise Agreement?" Yes / No / In process
- "Have you paid the franchise fee?" Yes / No
- "Have you completed or scheduled franchise training?" Yes / Scheduled / Not yet
- Output: Tab F franchise-specific exhibit list; cover letter franchise language

Q3C-10: (If acquisition) "Describe the existing business being acquired:"
- How many years has it been operating?
- Current annual revenue (approximate)
- Number of current employees
- Reason for sale (as stated by seller)
- Output: Cover letter acquisition language; business plan historical section

Q3C-11: "Does the business have a U.S. business bank account?"
- Yes → "At which bank?"
- No → compliance calendar entry; advisory about opening before interview

Q3C-12: "What business licenses or permits are required for this business
          in your target state/city?"
- Pre-populated from licensing matrix based on business_category + state
- User confirms which have been applied for, which have been granted, which
  are pending
- Output: Tab G operational status; interview prep licensing questions

Q3C-13: "Do you have a business website or social media presence for the business?"
- Yes → "What is the URL?"
- In development → note added to cover letter
- No → advisory: "A professional website strengthens the 'real and operating
  enterprise' argument, particularly for new businesses. Consider having a
  basic website live before your interview."

Q3C-14: "Do you have any signed client contracts, letters of intent, or
          service agreements?"
- Yes → "Briefly describe"
- No → advisory: "Signed contracts or LOIs are strong evidence that the
  business is real and generating demand. If you can obtain even one letter
  of intent from a prospective client before your interview, include it in Tab G."

Q3C-15: "Have you hired any employees yet?"
- Yes → "How many? What roles?"
- No → continue to hiring plan in Group 3E

Q3C-16: "What is your specific title and role in the business?"
- Field: Text (e.g., "President and General Manager", "CEO", "Managing Director")
- Output: Tab J; Cover letter paragraph 6; DS-160
- Tooltip: "Your title should reflect an active management role. 'Investor' or
  'Owner' alone is insufficient — the E-2 requires you to 'develop and direct'
  the enterprise. Use a title that reflects operational leadership."

Q3C-17: "Describe your specific management responsibilities in the business.
          What decisions do you make? What operations do you oversee?"
- Field: Text area (minimum 100 words encouraged)
- Output: Cover letter paragraph 6 (develop and direct); Tab J org chart narrative
- Prompt examples shown: "For example: setting pricing strategy, managing staff
  schedules, overseeing client intake, handling vendor relationships, managing
  finances, developing marketing plans..."

Q3C-18: (If partnership) "Describe your business partner's specific title and
          responsibilities — how are your roles distinct from each other?"
- Output: Partnership cover letter; operating agreement role descriptions

---

### GROUP 3D — Business Plan Financials (20 Questions)

Q3D-01: "What is your projected monthly revenue in Year 1?"
- Field: Number (USD)
- Output: Template 2 Year 1 monthly projection table
- Auto-calculates annual Year 1 revenue

Q3D-02: "What are the main revenue sources for this business?"
- Multi-select + amounts:
  □ Service fees / contracts ($___/month)
  □ Product sales ($___/month)
  □ Franchise royalties paid to you (if master franchise) ($___/month)
  □ Subscription / recurring fees ($___/month)
  □ Other: ___ ($___/month)
- Output: Template 2 revenue breakdown table

Q3D-03: "What are your projected monthly operating expenses in Year 1?
          Enter amounts for each category:"
- Fields: Rent/lease / Payroll / Supplies/inventory / Insurance /
  Marketing / Utilities / Franchise royalties (if applicable) /
  Professional services / Other
- Output: Template 2 expense table; P&L projection

Q3D-04: "What do you project your revenue to be in Year 3?"
- Field: Number (annual, USD)
- Validation: Must be higher than Year 1; if less than 30% growth flagged

Q3D-05: "What do you project your revenue to be in Year 5?"
- Field: Number (annual, USD)
- Validation: Non-marginality check: Year 5 revenue must exceed 3–4x projected
  household income need

Q3D-06: "What is your household's estimated annual living expense need in USD?"
(The minimum income required to support your family in the U.S.)
- Field: Number
- Output: Non-marginality scoring; cover letter paragraph 5
- Tooltip: "Include: housing, food, transportation, health insurance, education
  for children, utilities, and personal expenses. Be realistic — underestimating
  this figure does not strengthen your application and may cause financial strain."

Q3D-07: Non-marginality assessment auto-generated:
```
Non-Marginality Assessment:
Your household income need:      $85,000/year
Your Year 3 revenue projection:  $310,000/year
Ratio:                           3.65x  ✅ Meets the 3–4x threshold
Your Year 5 revenue projection:  $480,000/year
Ratio:                           5.65x  ✅ Strong

Assessment: Your projections demonstrate a non-marginal business
that will generate significant income beyond your family's needs
and create economic value through job creation.
```

Q3D-08: "What is the basis for your revenue projections?
          What evidence supports these numbers?"
- Multi-select:
  □ Franchisor's Item 19 (Financial Performance Representation in FDD)
  □ Prior owner's financial statements (acquisition)
  □ Industry benchmarks / competitor analysis
  □ Market research for the specific city/region
  □ Signed contracts or LOIs providing committed revenue
  □ My own experience in this industry
  □ Other: ___
- Output: Business plan market research section; officer interview prep
- Tooltip: "This is one of the first things an officer checks — whether your
  projections are supported by real data. The stronger your evidence base,
  the more credible your business plan. Franchisor Item 19 data is the gold
  standard for franchise applicants."

Q3D-09: "Describe the market for your business in your target city/region.
          Who are your target customers? How large is the market?"
- Field: Text area
- Output: Business plan market analysis section
- Advisory: "Specific local data is much stronger than general national
  statistics. For example: 'There are 47,000 adults aged 65+ within a
  10-mile radius of our Tampa location, representing a $12M annual home
  care market' is more compelling than 'the U.S. home care market is
  growing at 7% annually'."

Q3D-10: "Who are your main competitors in your target market?
          List 2–3 and briefly describe how you differentiate."
- Fields: Competitor 1 name + differentiation / Competitor 2 / Competitor 3
- Output: Business plan competitive analysis section

Q3D-11: "What is your customer acquisition strategy?
          How will you find and win your first clients?"
- Field: Text area
- Output: Business plan marketing strategy section

Q3D-12: "What is your break-even point? When do you project the business
          will become profitable?"
- Options: Month 3–6 / Month 7–12 / Month 13–18 / Month 18–24 / After 24 months
- Output: Business plan financial narrative

Q3D-13 through Q3D-20: Additional financial detail questions covering:
- Start-up cost itemization (if not already captured in 3B-03)
- Working capital reserve and runway
- Owner's draw / salary in Year 1 vs. Year 3
- Insurance costs (general liability, workers' comp, professional liability)
- Franchise royalty structure (if applicable)
- Seasonal revenue variation (if applicable)
- Capital expenditure plans for Years 2–5
- Exit or growth strategy (expansion plans, second location, etc.)

---

### GROUP 3E — Hiring & Staffing (12 Questions)

Q3E-01: "How many full-time employees will you have at the end of Year 1?"
- Field: Number
- Output: Template 5 (Hiring Plan); business plan staffing section
- If 0: advisory: "⚠️ A business with no employees is at high risk of being
  deemed 'marginal' at renewal and potentially at initial application. The E-2
  visa is designed to create U.S. jobs. We strongly recommend including at least
  1–2 full-time employee positions in your Year 1 plan, even if they are not
  hired on Day 1."

Q3E-02: "How many part-time employees will you have at the end of Year 1?"
- Field: Number

Q3E-03: "What roles/positions will you hire for in Year 1? List each:"
- Repeating fields: [Job title] / [FT or PT] / [Estimated annual salary]
- Output: Template 5 org chart; business plan staffing table; Tab J

Q3E-04: "How many total employees do you project to have by Year 3?"
Q3E-05: "How many total employees do you project to have by Year 5?"
- Output: Business plan 5-year staffing projection; non-marginality evidence

Q3E-06: "Will employees be hired as W-2 employees or 1099 independent contractors?"
- W-2 employees → payroll setup required; advisory about payroll tax obligations
- 1099 contractors → advisory: "Some businesses (particularly senior care) face
  regulatory scrutiny for misclassifying caregivers as contractors. Ensure your
  worker classification complies with the laws of your target state."
- Mix of both → advisory shown

Q3E-07: "Will any employees need specific certifications or licenses?
          (e.g., CNA, RN, CDL, teaching credential)"
- Yes → list certifications required; compliance calendar entries for hiring
  timeline to ensure licensed staff in place before opening
- No → continue

Q3E-08 through Q3E-12: Additional staffing questions covering:
- Hiring timeline (when will first employee be hired)
- Compensation strategy (wages vs. market rate)
- Benefits offered (health insurance, PTO)
- Training plan for new staff
- Whether the investor personally will perform any front-line work

---

*End of Sections 7.2 and 7.3 (Groups 3A–3E)*
*Section 7.3 continues with Groups 3F–3I in the next file.*
*Next file: Sections 7.3 (continued: Groups 3F–3I) and 7.4 (Template Specifications)*
