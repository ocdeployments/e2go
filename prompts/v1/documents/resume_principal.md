# Principal Applicant Resume Generation Prompt
## Document Type: resume_principal
## Tab Reference: Tab I — Principal Applicant (I-02)
## Generation Order: Step 11

---

## WHAT THIS DOCUMENT IS — READ FIRST

This is an E-2 immigration resume — NOT a job-search resume.
The structure and purpose are different:

**Job-search resume:** Sells the applicant to an employer. Optimized for ATS.
Usually 1 page. Skills-forward.

**E-2 immigration resume:** Demonstrates the applicant's capacity to develop
and direct the E-2 enterprise. It must show management experience, industry
expertise, and a logical path from their background to running THIS specific business.
Officers expect 2–3 pages. Completeness matters more than conciseness.

Every position must show: employer, title, dates, responsibilities.
The content must make a clear implicit argument: "This person has the background
to manage a [business type] enterprise."

This document does NOT include:
- Objective statements or personal profiles
- Skills keyword lists
- References

---

## DOCUMENT VOICE & FRAMING

An immigration resume written for an officer who will read it alongside the
cover letter and qualifications document — not a career-coach resume. Third
person / standard resume voice.
Beyond the shared core:
- COMPLETENESS OVER BREVITY — include every position of relevance; a full career
  history, not a highlight reel. Employment gaps raise scrutiny.
- For each role, emphasise responsibilities that show management/supervision,
  budget or P&L responsibility, client-facing work (if B2C E-2), or
  industry-specific expertise connecting to the E-2 business.
- CHRONOLOGICAL ORDER, most recent first. No functional/skills-based format.
  Gaps are filled (self-employment, caregiving, study) or left visible with
  dates — never hidden.
- Do not invent responsibilities or embellish titles. If a role was entry-level
  with no management, say so.
- One sentence of E-2 relevance framing per role may be added only if the
  connection is real and clear — do not stretch.

---

## CONTEXT VARIABLES

- `case_brief_json` — Business type, investment amount, archetype, management role score
- `module_3_answers` — Tab J (qualifications and employment history)
- `voice_profile_text` — Applicant's writing style
- `follow_up_responses` — Any career detail from follow-up Q&A

Extract from module_3_answers:
- Tab J: All employment history (employer, title, dates, responsibilities)
- Tab J: Education (institution, degree, field, year)
- Tab J: Licenses or certifications relevant to the business
- Tab D: Full legal name, date of birth, nationality, current address
- Tab A: Business name and type (for framing E-2 relevance)

---

## DOCUMENT-SPECIFIC INSTRUCTIONS

**Structure:**

```
[HEADER]
PROFESSIONAL EXPERIENCE
EDUCATION
LICENSES & CERTIFICATIONS (if applicable)
LANGUAGE PROFICIENCIES (if applicable)
```

**Header:**
```
[FULL LEGAL NAME]
[Nationality]
[Current Address]
[Phone] | [Email]
Date of Birth: [DOB — required for immigration documents]
```

Note: Date of Birth and Nationality are included because this is an immigration
document (unlike a job-search resume). Do not omit these fields.

**Professional Experience:**

For each position:
```
[EMPLOYER NAME] — [City, State/Country]
[Job Title] | [Start Month Year] – [End Month Year or "Present"]

• [Responsibility / achievement — specific, active voice]
• [Responsibility / achievement]
• [Include budget size if known: "Managed P&L of $X"]
• [Include team size if known: "Supervised a team of X employees"]
• [Include relevant industry-specific functions]
```

Do not use more than 6 bullets per position. Quality over quantity.
Do not use generic bullets that could apply to any position.

**Education:**

```
[INSTITUTION NAME] — [City, State/Country]
[Degree], [Field of Study] | [Year conferred]
[Relevant coursework, honors, or thesis — only if directly relevant to E-2 business]
```

**Licenses & Certifications:**
(Include only if directly relevant to the E-2 business.)
```
[Certification name] — [Issuing body] — [Year obtained] — [Expiration if applicable]
```

**Language Proficiencies:**
(Include only if business involves multi-language customer base or the consulate
is in a non-English-speaking country.)
```
English: [Native / Fluent / Proficient]
[Other language]: [Level]
```

---

## E-2 SPECIFICITY RULES

For each position, ensure at least ONE bullet addresses a directly transferable skill:

| E-2 Business Type | Most Relevant Experience to Highlight |
|---|---|
| Franchise (food/retail) | Customer service mgmt, inventory, vendor relations, staff training |
| Franchise (education) | Curriculum delivery, student/parent relations, staff supervision |
| Healthcare / home care | Compliance, care coordination, staff scheduling, regulatory |
| Technology / SaaS | Product management, client delivery, technical team leadership |
| Professional services | Client relationship management, project delivery, billing |
| Real estate / property | Acquisition, tenant management, financial analysis |

Connect every role's bullets to the relevant column above without stating
"this is relevant to the E-2 business" unless it is crystal clear and genuine.

---

## DENIAL PATTERN TESTS

1. No unexplained employment gaps exceeding 6 months
2. Date of birth and nationality are present (immigration requirement)
3. All employers include city/country (international history is common)
4. Management or supervisory roles clearly show number of reports where known
5. P&L or budget responsibility stated in dollar terms where known
6. No fabricated titles or inflated responsibilities
7. Chronological order — most recent first
8. No generic bullets ("responsible for various tasks")

---

## OUTPUT FORMAT

Return plain text document content only. No JSON, no headers, no labels.
Use clean formatting with clear section separators.
Ready to save as .txt or .docx.

---

## QUALITY CHECKLIST

- [ ] Header includes full legal name, nationality, DOB, and current address
- [ ] All positions listed in reverse chronological order
- [ ] Each position shows employer, title, city/country, and exact dates
- [ ] No employment gaps exceeding 6 months unexplained
- [ ] At least one bullet per position references a skill transferable to the E-2 business
- [ ] Management scope (headcount, budget) stated where known
- [ ] Education section complete with year conferred
- [ ] No generic bullets
- [ ] No fabricated responsibilities
- [ ] 2–3 pages estimated
- [ ] No e2go branding
