# Tab A — DS-160 Reference Generator
## Module 3 Interview Engine
*Version 1.1 | May 31, 2026 | Source: U.S. State Department DS-160 Official Exemplar*

**Batch:** 2 — Generated after business formation confirmed

---

## Purpose

Tab A collects all information needed to pre-fill a DS-160 reference sheet for
the applicant. The DS-160 is completed directly on the State Department's CEAC
portal — the app does not submit it. Instead, the app generates a structured
reference document the user reads from while completing the real DS-160 online,
ensuring nothing is forgotten or inconsistently entered.

The DS-156E (E-visa treaty investor supplement) is also referenced here.
Dependents do not complete a DS-156E.

**Output:** DS-160 Reference Sheet — a clean, pre-formatted document with all
answers organized in the exact order the DS-160 presents them.

---

## Section A.1 — Personal Information

### QA-01
**Question:** What is your full legal name as it appears on your passport?
**Type:** text (three fields: surname, given name, middle name)
**Validation:** Must match passport exactly
**Tooltip:** Enter your name exactly as it appears on your passport,
including any middle names. This must match the DS-160 precisely.

### QA-02
**Question:** Have you ever used any other names — including maiden names,
nicknames, or names in other languages?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-02a
**QA-02a:** List all other names used
**Type:** textarea

### QA-03
**Question:** What is your date of birth?
**Type:** date
**Validation:** Must be 18 or older (under 18 triggers advisory)

### QA-04
**Question:** What is your place of birth? (City and Country)
**Type:** text (two fields: city, country)

### QA-05
**Question:** What is your country of citizenship?
**Type:** select (country list — pre-populated from treaty country in Module 0)

### QA-06
**Question:** Do you hold citizenship in any other country?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-06a
**QA-06a:** Which other country?
**Type:** select (country list)

### QA-07
**Question:** What is your national identification number? (Social Insurance Number or
equivalent — if applicable)
**Type:** text
**Tooltip:** If you have a national ID number (such as a Social Insurance
Number), enter it here. If not applicable, select "Does not apply."
**Has N/A option:** Yes

### QA-08
**Question:** What is your U.S. Social Security Number or Taxpayer ID?
**Type:** text
**Has N/A option:** Yes
**Tooltip:** Most first-time applicants will not have one. Select "Does not
apply" if this is your first U.S. visa.

---

## Section A.2 — Address & Contact

### QA-09
**Question:** What is your current home address?
**Type:** text (street, city, state/province, postal code)

### QA-10
**Question:** How long have you lived at this address?
**Type:** select
**Options:** Less than 1 year / 1–2 years / 3–5 years / More than 5 years

### QA-11
**Question:** What is your primary phone number?
**Type:** text
**Validation:** phone format

### QA-12
**Question:** What is your email address?
**Type:** text
**Validation:** email
**Note:** Pre-filled from Module 0 if available

### QA-13
**Question:** Have you used any social media platforms in the last five years?
**Type:** multiselect
**Options:** Facebook / Instagram / X (Twitter) / LinkedIn / YouTube /
WhatsApp / Snapchat / TikTok / Other / None
**Tooltip:** The DS-160 asks for social media identifiers. List any platforms
you actively used in the past 5 years. This is a mandatory DS-160 field.
**Branch:** Any selected except None → QA-13a
**QA-13a:** For each selected platform, enter your username or handle
**Type:** text (one field per selected platform)

---

## Section A.3 — Passport Information

### QA-14
**Question:** What is your passport number?
**Type:** text

### QA-15
**Question:** What is your passport book number? (if applicable)
**Type:** text
**Has N/A option:** Yes

### QA-16
**Question:** What country issued your passport?
**Type:** select (pre-filled from Module 0)

### QA-17
**Question:** What is the issue date of your passport?
**Type:** date

### QA-18
**Question:** What is the expiry date of your passport?
**Type:** date
**Validation:** Flag if expiry is within 12 months of today

---

## Section A.4 — Travel Information

### QA-19
**Question:** What is your intended date of travel to the United States?
**Type:** date
**Has N/A option:** Yes — "Not yet decided"

### QA-20
**Question:** What is your intended length of stay in the United States?
**Type:** select
**Options:** Less than 6 months / 6–12 months / More than 1 year /
Indefinite (as long as E-2 status is valid)
**Tooltip:** For E-2 purposes, most applicants select "Indefinite" as
the E-2 is renewable. You intend to stay as long as the business operates.

### QA-21
**Question:** Have you ever travelled to the United States before?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-21a, QA-21b
**QA-21a:** What was the date of your most recent visit?
**Type:** date
**QA-21b:** How long did you stay on your most recent visit?
**Type:** text

### QA-22
**Question:** Have you ever been issued a U.S. visa before?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-22a, QA-22b, QA-22c
**QA-22a:** What type of visa was it?
**Type:** select (B1/B2 tourist / TN / Other)
**QA-22b:** What was the issue date?
**Type:** date
**QA-22c:** Where was it issued?
**Type:** text (city and country)

### QA-23
**Question:** Has a U.S. visa application ever been refused or denied?
**Type:** select
**Options:** Yes / No
**Note:** Pre-filled from Module 0 Q0-11 — confirm and expand if Yes
**Branch:** Yes → QA-23a
**QA-23a:** Briefly describe the refusal (type of visa, when, consulate)
**Type:** textarea

---

## Section A.5 — U.S. Point of Contact

### QA-24
**Question:** Who is your U.S. point of contact?
**Type:** select
**Options:** My business / A professional contact / Other person
**Tooltip:** The DS-160 requires a U.S.-based point of contact. For most
E-2 applicants this will be the business itself.
**Branch:** My business → pre-fill from business name / address in Module 3
**Branch:** Other → QA-24a
**QA-24a:** Contact name, address, and phone
**Type:** text

---

## Section A.6 — Family Information

### QA-25
**Question:** What is your current marital status?
**Type:** select
**Options:** Single / Married / Common Law Marriage / Civil Union /
Divorced / Legally Separated / Widowed
**Tooltip:** Select the option that exactly matches your status.
Note that "Common Law Marriage" and "Civil Union" are distinct options
in the DS-160 — each produces different additional fields.
**Branch:** Married / Common Law / Civil Union → QA-25a
**QA-25a:** Spouse full name
**Type:** text
**QA-25b:** Spouse date of birth
**Type:** date
**QA-25c:** Spouse nationality / citizenship
**Type:** select (country list)
**QA-25d:** Spouse current address (if different from yours)
**Type:** text / select "Same as mine"

### QA-26
**Question:** Do you have a father whose information you can provide?
**Type:** select
**Options:** Yes / No — Do Not Know
**Branch:** Yes → QA-26a, QA-26b, QA-26c
**QA-26a:** Father's full name
**Type:** text
**QA-26b:** Father's date of birth
**Type:** date
**QA-26c:** Is your father currently in the U.S.?
**Type:** select: Yes / No / Do Not Know

### QA-27
**Question:** Do you have a mother whose information you can provide?
**Type:** select
**Options:** Yes / No — Do Not Know
**Branch:** Yes → QA-27a, QA-27b, QA-27c (same fields as father)

### QA-28
**Question:** Do you have any immediate relatives currently in the
United States?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-28a, QA-28b
**QA-28a:** Relationship
**Type:** select: Spouse / Child / Sibling / Parent / Other
**QA-28b:** Their current U.S. immigration status
**Type:** select: U.S. Citizen / Permanent Resident /
Nonimmigrant Visa Holder / Other / Do Not Know

---

## Section A.7 — Work / Education

### QA-29
**Question:** What is your current occupation?
**Type:** select
**Options:** Business owner / Employee / Self-employed /
Retired / Unemployed / Other
**Branch:** Employee → QA-29a (employer name, address, supervisor)
**Branch:** Business owner / Self-employed → QA-29a (business name, address)

### QA-30
**Question:** What is your current job title?
**Type:** text

### QA-31
**Question:** When did you start your current position?
**Type:** date

### QA-32
**Question:** What is your current monthly income?
**Type:** currency (any currency — converts to USD)
**Has N/A option:** Yes

### QA-33
**Question:** Briefly describe your work duties
**Type:** textarea
**Tooltip:** A 1–2 sentence plain-language description of what you do.
This feeds the DS-160 work description field.

### QA-34
**Question:** Have you held any previous employment in the last five years?
**Type:** select
**Options:** Yes / No
**Branch:** Yes → QA-34a (employer, title, dates, location)
**Type:** repeating group (up to 5 previous employers)

### QA-35
**Question:** What is the highest level of education you have completed?
**Type:** select
**Options:** Secondary school / Vocational / Some college or university /
Bachelor's degree / Master's degree / Professional degree (law, medicine, etc.) /
Doctoral degree

### QA-36
**Question:** What institution did you attend most recently?
**Type:** text (institution name, city, country, dates attended, course of study)

---

## Section A.8 — Security & Background

*These questions mirror the DS-160 Security and Background sections exactly.
All are yes/no with explanation required on Yes.*

### QA-37 through QA-50 — Security Questions

Each formatted as:
**Type:** select: Yes / No
**Branch:** Yes → explanation textarea

| # | DS-160 Security Question |
|---|--------------------------|
| QA-37 | Do you belong to, or have you ever belonged to, or have you ever contributed to an organization that uses violence or weapons to promote political goals? |
| QA-38 | Do you have specialized skills or training in explosives, firearms, or nuclear, biological, or chemical weapons? |
| QA-39 | Have you ever been arrested or convicted for any offence or crime — even if subject to a pardon, amnesty, or other action? |
| QA-40 | Have you ever violated the terms of a U.S. visa? |
| QA-41 | Have you ever worked, studied, or required a visa while in the United States? |
| QA-42 | Are you now or have you ever been a member of or in any way associated with any organization, association, fund, foundation, party, club, society, or similar group? |
| QA-43 | Do you have a communicable disease of public health significance? |
| QA-44 | Do you have a mental or physical disorder that poses or is likely to pose a threat to the safety or welfare of yourself or others? |
| QA-45 | Are you or have you ever been a drug abuser or addict? |
| QA-46 | Have you ever been deported or removed from any country? |
| QA-47 | Have you ever overstayed a visa or otherwise violated the terms of a U.S. visa? |
| QA-48 | Have you ever been denied a U.S. visa or been refused admission to the U.S.? |
| QA-49 | Have you ever renounced U.S. citizenship? |
| QA-50 | Have you ever attended, or do you plan to attend, any institution or program in the U.S.? |

**Note:** Questions QA-39, QA-46, QA-47, QA-48 are pre-filled from
Module 0 answers where applicable.

---

## Section A.9 — E-Visa Specific Fields (DS-160 E-Visa Supplement)

*These fields appear in the E-visa section of the DS-160 and the DS-156E.*

### QA-51
**Question:** What is the full legal name of the U.S. business you are investing in?
**Type:** text
**Note:** Must match LLC/corporation registration exactly

### QA-52
**Question:** What is the business address in the United States?
**Type:** text (street, city, state, zip code)

### QA-53
**Question:** What is the nature of the business?
**Type:** text
**Tooltip:** A brief plain-language description — e.g., "franchise restaurant
operation" or "residential cleaning services company"

### QA-54
**Question:** What is your position/title in the U.S. business?
**Type:** text
**Examples:** Owner-Operator / Managing Director / President / Co-Owner

### QA-55
**Question:** What percentage of the U.S. business do you own?
**Type:** number (percentage)
**Validation:** 50–100% for solo; exactly 50% for partnership

### QA-56
**Question:** What is the total investment in the U.S. business (in USD)?
**Type:** currency (USD)
**Note:** Pre-filled from Module 0 Q0-05 — confirm and finalize

### QA-57
**Question:** How many employees does the U.S. business currently have,
or how many do you plan to hire?
**Type:** number

### QA-58
**Question:** What is the total annual gross revenue (or projected revenue
in Year 1 if not yet operating)?
**Type:** currency (USD)

---

## Tab A Output

**Generated Document:** DS-160 Reference Sheet

A clean, formatted document presenting all answers in the exact order the
DS-160 form presents them online. Organized into labeled sections matching
the DS-160 navigation structure. User reads from this sheet while completing
the actual DS-160 at ceac.state.gov.

Also generates a DS-156E pre-fill reference for the E-visa supplement fields
(QA-51 through QA-58).

**Important disclaimer on Tab A output:**
> "This reference sheet is provided to help you organize your answers before
> completing the official DS-160 at ceac.state.gov. You must complete and
> submit the DS-160 yourself on the State Department's official website.
> E2Pathway does not submit the DS-160 on your behalf."

---
