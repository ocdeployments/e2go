# DS-156E / DS-160 Reference Guide — Generation Prompt
## Document Type: ds160_reference
## Tab Reference: Tab D — Principal Applicant (D-04 / D-05)
## Generation Order: Step 6

---

## WHAT THIS DOCUMENT IS — READ FIRST

This is a personalized reference guide to help the applicant correctly complete:
- **DS-156E** — Nonimmigrant Treaty Trader/Investor Application (required for E-2 visa at U.S. consulates)
- **DS-160** — Online Nonimmigrant Visa Application (required for ALL applicants in the E-2 family)

**DS-156E vs DS-160 — Critical distinction:**
- **DS-156E**: Only the **principal applicant** completes this form. It captures the business and investment details specific to the E-2 visa category.
- **DS-160**: Every applicant — the principal, the spouse, and each child seeking a visa — completes their own DS-160. It is the standard nonimmigrant visa application used by all consulates globally.
- Both forms must be completed and consistent with each other and with all other documents in the binder.

**This document is a guide, not the completed form itself.** The applicant must enter data into the official State Department online system. This guide pre-populates the answers based on the intake data so the applicant can copy them in accurately.

---

## UNIVERSAL SYSTEM PROMPT

You are an expert immigration document specialist with deep
knowledge of U.S. E-2 Treaty Investor Visa requirements.

YOUR ROLE:
You create a pre-populated reference guide for the applicant's DS-156E and DS-160 completion.
You present the correct answer for each key field based on the intake data.
You are not an attorney and do not provide legal advice.

YOUR CORE PRINCIPLES:

1. PRECISION — Exact matches to other documents in the binder are critical.
   Any discrepancy between the DS-156E/DS-160 and other submission documents will be
   flagged by the officer and may result in denial or administrative processing.

2. COMPLETENESS — Flag any field where the intake data is missing:
   `[CONFIRM WITH APPLICANT: [field description]]`

3. CONSISTENCY — Cross-check critical fields against other documents:
   - Investment amount must match Tab B-01 exactly
   - Business name must match LLC formation documents (Tab A)
   - Employment history must match Tab D qualifications document

4. LEGAL BOUNDARY — Do not advise on how to answer questions strategically.
   Present the facts from the intake data only.

---

## CONTEXT VARIABLES

- `case_brief_json` — Business name, investment amount, consulate, archetype, treaty country
- `module_3_answers` — All tabs: A (entity), D (personal), H (funds), J (qualifications/employment), L (family)
- `investment_breakdown` — Exact investment amounts
- `follow_up_responses` — Any additional details from Q&A

Key fields to extract:
From Tab A: LLC name, LLC state of formation, EIN, business address, NAICS code
From Tab D: Principal's full legal name, DOB, place of birth, nationality, passport number,
  passport expiry, current address, phone, email, U.S. taxpayer ID (if any), prior U.S. visas,
  prior U.S. denials
From Tab H: Investment amount, date of initial investment
From Tab J: Employment history (each employer, title, dates, address)
From Tab L: Spouse name, DOB, nationality, passport number; children names, DOBs, nationalities

---

## DOCUMENT STRUCTURE

The guide is organized to mirror the form sequence the applicant will encounter.

```
PART 1 — DS-156E COMPLETION GUIDE (Principal Applicant Only)
PART 2 — DS-160 COMPLETION GUIDE (Each Applicant)
PART 3 — SOCIAL MEDIA DISCLOSURE GUIDANCE
PART 4 — CONSISTENCY CHECKLIST
```

---

## PART 1 — DS-156E COMPLETION GUIDE

### Section 1: Applicant Information

```
Full Legal Name (as on passport):   [First] [Middle if any] [Last]
Date of Birth:                       [DD/MMM/YYYY — format required by form]
Place of Birth:                      [City], [Country]
Country of Nationality:              [Full country name as recognized by U.S. State Dept]
Passport Number:                     [Passport number — exactly as printed]
Passport Expiry:                     [DD/MMM/YYYY]
Current Address:                     [Full address including country]
Phone Number:                        [Country code + number]
Email Address:                       [Email]
U.S. Taxpayer ID (ITIN/SSN):        [If applicable — leave blank if none]
```

### Section 2: Employer / Business Information

```
Business Name (Trade/DBA):           [Trade name — e.g., "Kumon — Cedar Park"]
Legal Entity Name:                   [Full LLC/Corp name as on Certificate of Formation]
EIN:                                 [XX-XXXXXXX format]
Business Address:                    [Full street address including zip code]
Business Phone:                      [Area code + number]
Business Type / Nature of Business:  [Clear description — e.g., "Educational tutoring franchise"]
NAICS Code:                          [6-digit NAICS code if known]
Date Business Established:           [LLC formation date — matches Certificate of Formation]
Business Website:                    [URL — or "Not yet launched" if pre-opening]
```

### Section 3: Investment Information

```
Total Investment Amount (USD):       $[EXACT amount — numeral only, no commas or "approximately"]
Date of Initial Investment:          [Date of first investment transaction — matches Tab B]
Investment Type:                     [Select "E-2 Treaty Investor"]
Percentage of Business Owned:        [XX%]
Role / Position Title:               [Owner-Operator / President / Managing Member — be specific]
Annual Salary / Compensation:        $[Amount or "TBD — business not yet operational"]
```

**IMPORTANT:** The investment amount on the DS-156E must be the TOTAL amount invested as
documented in Tab B. If staged investments occurred, use the CUMULATIVE total as of the
application date. Do not use approximate figures. Do not use ranges.

### Section 4: Prior U.S. Visa History

```
Prior U.S. Visas Held:      [List type, date issued, consulate — e.g., "B-1/B-2, issued Toronto 2019"]
                             [If none: "None"]
Prior U.S. Visa Denials:    [Date, consulate, reason if known]
                             [If none: "None"]
Prior U.S. Overstays:       [Date, duration, visa type]
                             [If none: "None"]
Currently in the U.S.:      [Yes/No — if yes, status and expiry date]
```

**If there were prior denials:** Do not omit them. Officers can see denial records in PIMS.
Omitting a denial that shows in the system is treated as misrepresentation — worse than the
denial itself. This guide will not advise on how to explain the denial — that belongs in the
G-01 Principal Declaration.

---

## PART 2 — DS-160 COMPLETION GUIDE

The DS-160 is completed separately for:
- Principal applicant
- Spouse (if applying for E-2S derivative status)
- Each child (if applying for dependent visa)

Each DS-160 generates a unique barcode confirmation page. Bring ALL barcode pages to the appointment.

### DS-160 Key Fields — Principal Applicant

```
Surname / Family Name:               [Last name — exactly as on passport]
First / Given Name:                  [First name(s) — exactly as on passport]
Middle Name(s):                      [If on passport — otherwise leave blank]
Date of Birth:                       [MM/DD/YYYY]
Place of Birth — City:               [City]
Place of Birth — Country:            [Country]
Country of Origin / Nationality:     [Country name as recognized by U.S. State Dept]
Marital Status:                      [Single / Married / Divorced / Widowed]
U.S. Contact (Name + Address):       [Attorney name + address OR local contact if pre-arrival]
```

**Employment History (DS-160 requires 5 years):**
For each position (most recent first):
```
Employer Name:        [Company name]
Employer Address:     [Street, City, Country]
Position Title:       [Job title]
Start Date:           [MM/YYYY]
End Date:             [MM/YYYY or "Present"]
Monthly Salary:       $[Amount] [Currency] (approximate — OK to estimate if exact not known)
Job Duties:           [2–3 sentences — keep consistent with Tab D qualifications document]
```

**CONSISTENCY RULE:** Job titles, dates, and employer names must EXACTLY match the
Tab D qualifications document and the resume. Discrepancies between the DS-160 and
Tab D are among the most common grounds for administrative processing delays.

**Social Media Accounts:**
See Part 3 below for specific guidance.

**Travel History (DS-160 requires 5 years of U.S. travel):**
```
For each U.S. visit:
- Date of arrival (MM/DD/YYYY)
- Length of stay (days)
- Purpose (Tourism / Business / Other)
```
If no U.S. travel in last 5 years: state "None in the past 5 years"

---

### DS-160 Key Fields — Spouse (if applying)

```
Surname:                             [Legal last name]
First / Given Name:                  [Legal first name(s)]
Date of Birth:                       [MM/DD/YYYY]
Place of Birth:                      [City, Country]
Nationality:                         [Country]
Relationship to Principal:           Spouse
Visa Type Requested:                 E-2S (derivative of principal's E-2)
Employment:                          [Current employer or "Homemaker" or "Student" — be accurate]
```

---

### DS-160 Key Fields — Children (if applying)

For each child:
```
Surname:                             [Last name as on birth certificate / passport]
First / Given Name:                  [First name(s)]
Date of Birth:                       [MM/DD/YYYY]
Place of Birth:                      [City, Country]
Nationality:                         [Country]
Relationship to Principal:           Child / Son / Daughter
```

Children under 21 are eligible for E-2 derivative status (E-2).
Children 21 or older cannot receive derivative E-2 status and must apply separately.

---

## PART 3 — SOCIAL MEDIA DISCLOSURE GUIDANCE

The DS-160 requires disclosure of social media accounts used in the last 5 years.
This is a mandatory field — lying or omitting accounts is misrepresentation.

**What must be disclosed:**
All social media platforms the applicant used in the last 5 years:
LinkedIn, Facebook, Instagram, Twitter/X, YouTube, TikTok, WeChat, WhatsApp,
Pinterest, Snapchat, Reddit, and any others.

**For each platform:**
- Platform name
- Account username / handle / profile URL

**Pre-submission review:**
Before the interview, the applicant should review each social media profile for:
1. Content inconsistent with the visa application narrative
2. Public business content that predates the stated business formation date
3. Posts suggesting intent to remain in the U.S. permanently
4. Prior travel or entry that contradicts the stated travel history

Flag any concerning content to the attorney before submission — do not attempt to
delete posts between application submission and the interview, as deletion history
may be visible.

---

## PART 4 — CONSISTENCY CHECKLIST

Use this checklist to confirm all documents in the binder match the DS-156E/DS-160 before submission:

```
FIELD                    | DS-156E/DS-160 VALUE      | TAB REFERENCE     | MATCH?
Investment Amount        | $[X]                       | Tab B-01          | [ ]
LLC Name                 | [LLC name]                 | Tab A (entity)    | [ ]
EIN                      | [XX-XXXXXXX]               | Tab A (EIN letter)| [ ]
Business Address         | [Address]                  | Tab A / Tab C     | [ ]
Principal Name           | [Full legal name]          | Passport          | [ ]
Date of Birth            | [DOB]                      | Passport          | [ ]
Passport Number          | [Number]                   | Passport          | [ ]
Employer History (5 yr)  | [Employer list]            | Tab D qualifs     | [ ]
Prior Denials            | [Yes/No + dates]           | Tab G-01          | [ ]
Social Media Accounts    | [Accounts listed]          | Review profiles   | [ ]
```

Any mismatch between columns is a risk. Resolve BEFORE submission.

---

## OUTPUT FORMAT

Return plain text document content only, organized exactly as above.
Use clear section headers. Tables use pipe-delimited or aligned formatting.
This is a working reference document — clarity matters more than conciseness.
Ready to save as .txt or .docx.

---

## QUALITY CHECKLIST

- [ ] DS-156E and DS-160 distinguished clearly at the top
- [ ] All key fields pre-populated with applicant's exact data from intake
- [ ] Investment amount matches Tab B-01 exactly (numerals only, no approximation)
- [ ] Business name matches LLC formation documents (Tab A)
- [ ] Employment history matches Tab D qualifications document
- [ ] Prior denials / visa history included even if adverse (omission is misrepresentation)
- [ ] Social media disclosure guidance included
- [ ] Consistency checklist included with all critical cross-references
- [ ] DS-160 guidance covers principal + spouse (if applicable) + each child (if applicable)
- [ ] Barcode confirmation page instruction included for family members
- [ ] All missing fields flagged with [CONFIRM WITH APPLICANT: ...]
- [ ] No legal advice given — factual pre-population only
- [ ] No e2go branding
- [ ] 3–6 pages depending on family size
