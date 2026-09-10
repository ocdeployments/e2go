# Non-immigrant Intent Statement Generation Prompt
## Document Type: nonimmigrant_intent
## Tab Reference: Tab M — Your Ties section (M3-T-01 through M3-T-11)
## Generation Order: Step 8 — after visa_category

---

## DOCUMENT VOICE & FRAMING

Written in the FIRST PERSON — the applicant addresses the officer directly. This
is the most personal document in the package and the only one in first person;
it must sound authentically like the applicant, with genuine warmth and
directness, not like a lawyer. Vary sentence length; avoid formal legalese.
Beyond the shared core:
- The ties described must be real and named — actual residence, actual family
  members by name where provided — never categories. If ties are limited,
  acknowledge them honestly while emphasising what does exist.
- TONE: CONFIDENT, NOT DEFENSIVE. The applicant is documenting obvious ties for
  the record, not defending themselves. Defensive language signals immigration-
  intent anxiety.
- Do not use "prove", "demonstrate", or "establish" in reference to legal
  requirements. State the facts of the applicant's life.
- Every concrete tie cites the exhibit that documents it where one exists; if a
  tie has no exhibit on file, state it in the applicant's own words without a
  citation rather than inventing one.
- CONSISTENCY WITH THE DECLARATION (D11) — this document and the Principal
  Applicant Declaration describe the same home-country ties. Do not introduce a
  tie, name, relationship, or figure that contradicts what the applicant stated
  elsewhere in this case's intake; the two are cross-checked and a contradiction
  is a credibility risk.

---

## DOCUMENT PURPOSE

The Non-immigrant Intent Statement is a first-person personal statement
in which the applicant describes their home country ties, their intent
to return upon the conclusion of E-2 status, and their understanding
that the E-2 visa is temporary and nonimmigrant in nature.

E-2 requires applicants to show "present intent to depart the U.S.
when E-2 status ends." Unlike immigrant-intent visas, E-2 does not
require the applicant to have a permanent home they have no intention
of abandoning — but they must show meaningful connections to their
home country and a credible plan to return.

Target length: 500–800 words (approximately 1–2 pages).
Write as a letter from the applicant to the consular officer.
First person throughout.

---

## CONTEXT VARIABLES

The following variables are available in the generation payload:

- `case_brief_json` — Complete case brief with applicant data
- `module_3_answers` — All answers, especially M3-T-01 through M3-T-11 (Ties section)
- `voice_profile_text` — Applicant's writing style profile from their sample
- `follow_up_responses` — Responses from the follow-up conversation

BRACKET RULE: The ONLY permitted bracket placeholders are `[Date]` and `[Consulate address]`.
Every other field that has data in the variables MUST use the actual value.

---

## PRIMARY DATA SOURCES (Ties Section)

The following answers are the primary inputs for this document.
Extract every specific detail — property names, family members' relationships,
financial obligations, community roles, planned return scenarios.

M3-T-01 — Property/assets owned in home country (multi-select)
M3-T-02 — Major assets with approximate values (textarea — QUOTE THE SPECIFICS)
M3-T-03 — Whether applicant owns primary residence (yes/no/shared)
M3-T-04 — Family ties remaining in home country (multi-select)
M3-T-05 — Family situation description (textarea — QUOTE THE SPECIFICS)
M3-T-06 — Community organization involvement (yes/no)
M3-T-07 — Financial obligations in home country (multi-select)
M3-T-08 — Ongoing financial ties description (textarea — QUOTE THE SPECIFICS)
M3-T-09 — Intended duration of U.S. stay on E-2 (3-5 / 5-10 / indefinite)
M3-T-10 — Plans when E-2 status ends (renew / return / adjust / unsure)
M3-T-11 — Long-term plans and exit strategy (textarea — QUOTE THE SPECIFICS)

Also use: case brief applicant name, nationality, and country of origin.

---

## HANDLING WEAK TIES

If the applicant selected "No significant property" (M3-T-01: none) or
"No significant family ties" (M3-T-04: none):

Do NOT attempt to manufacture ties that don't exist.
DO pivot to financial obligations, community ties, and a credible return plan.
DO present the limited ties honestly, and strengthen the return intent narrative.

If M3-T-09 is "indefinite":
Reframe carefully: "I intend to grow the business to maturity and then reassess
my circumstances. My current understanding is that E-2 requires renewal every
[2/5] years, and I intend to seek renewals for as long as the business
and regulations permit. I do not hold, nor am I pursuing, any immigrant visa petition."
Do NOT say the applicant "intends to return" if they said indefinite — be honest.

---

## DOCUMENT STRUCTURE

Header:
- Date: [Date]
- To: Consular Officer, U.S. Embassy/Consulate [Consulate address]
- Re: Statement of Non-immigrant Intent — [Applicant Full Name]
- From: [Applicant Full Name]

Opening paragraph:
Introduce who the applicant is. State their purpose in writing this statement.
Establish their country of origin and their relationship to it.

Property and financial ties section:
Describe real property, assets, and financial obligations in the home country.
Be specific. Name the property type, location (city/region), approximate value
if provided, and any mortgage or lease obligations.

Family and community ties section:
Describe immediate family remaining in the home country.
Describe community involvement if any (M3-T-06 = yes).
Describe what would bring the applicant back to these people.

Return intent section:
State the applicant's intended duration and end-of-status plan in plain terms.
Quote or closely paraphrase M3-T-11 — this is the applicant's voice.
If they have a specific business exit plan (sell, pass to family, wind down),
name it. If they plan to renew indefinitely, explain why without overpromising.

Closing paragraph:
Affirm the applicant's respect for U.S. immigration law and their understanding
that E-2 is a nonimmigrant classification. Keep it brief — one or two sentences.
No performative promises. State the facts as they stand.

---

## FORBIDDEN PHRASES

The following phrases MUST NOT appear in any generated document:
- "qualifies" / "qualify" / "qualification"
- "eligible" / "eligibility"
- "meets the standard" / "meets the requirement"
- "satisfies the requirement"
- "I hereby swear" / "I solemnly declare" (unless document is a sworn affidavit — this is not)
- "I will definitely return" / "I guarantee I will leave" (overstatement, not credible)
- "I have no immigrant intent" as the opening or closing line (sounds coached)

---

## LEGAL DISCLAIMER REQUIREMENT

This document is generated for a U.S. E-2 Treaty Investor Visa application.
The applicant is responsible for reviewing all generated documents for accuracy.
This tool does not provide legal advice. The applicant should consult with
a licensed immigration attorney before submitting any documents to the consulate.

---

## QUALITY CHECKLIST

- [ ] Written in first person, active voice
- [ ] Every concrete tie (property, family, financial obligation) is real and named — no categories
- [ ] Ties cite an exhibit from the EXHIBIT REGISTRY where one exists (format Tab X-N)
- [ ] No tie, name, relationship, or figure contradicts the Principal Declaration (D11)
- [ ] Weak ties presented honestly, not manufactured
- [ ] "Indefinite" duration reframed honestly, never stated as "intends to return"
- [ ] No forbidden phrases present
- [ ] No legal conclusion language ("prove", "demonstrate", "establish", "qualifies")
- [ ] Applicant voice matched — sounds personal, not lawyerly
