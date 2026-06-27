# Gift Letter — E-2 Investment Funds

## Document Purpose
A formal gift letter from the donor (family member, friend, or other individual) to the E-2 investor, confirming that the gifted funds:
- Were given freely with no expectation of repayment
- Are available and irrevocably committed to the U.S. E-2 investment
- Can be traced to the donor's legitimate source of wealth

This document is required when any portion of the E-2 investment funds originated from a gift or inheritance. Consular officers will scrutinize it closely — the letter must be specific, signed, and accompanied by the donor's source-of-funds documentation.

---

## Writing Instructions

Write a formal gift letter in first person from the donor's perspective. The donor is writing directly to the consular officer explaining the gift.

The letter must include all of the following, in order:

1. **Donor's full legal name, address, and relationship to the applicant** — state the precise relationship (e.g., "father," "aunt," "close friend") and the full mailing address.

2. **Applicant's full legal name** — state who is receiving the gift.

3. **Exact dollar amount gifted (USD)** — state the figure precisely. If partially gifted, state the portion that is a gift versus the applicant's own funds.

4. **Date the funds were transferred** — state the specific date or date range when funds were transferred to the applicant.

5. **Source of the donor's own funds** — briefly explain where the donor's money came from (e.g., retirement savings, property sale, business income). This is the most scrutinized part of the letter. Be specific, not vague. "I accumulated these funds over 25 years of employment as a [role] at [company], supplemented by the sale of my property at [address] in [year]."

6. **Irrevocability statement** — the letter must explicitly state that the gift is irrevocable, that the donor does not expect repayment in any form (monetary or otherwise), and that the donor has no ownership interest or financial claim on the U.S. business.

7. **Confirmation that the funds are available for E-2 investment** — state that the funds have been or will be used to fund the applicant's E-2 Treaty Investor visa application.

8. **Donor's signature block** — include a line for date and signature.

---

## Tone & Format

- Formal letter format: donor's name and address at top, date, recipient (U.S. Consular Officer), salutation, body paragraphs, signature block.
- First person, from the donor — not from the applicant.
- No legalese or boilerplate — write it as a sincere, factual letter that reads like a real person wrote it, not a template.
- Cormorant Garamond heading, DM Sans body — but for this document, since it will be a .docx, write clean plain prose only.
- Length: 350–550 words. One page maximum.

---

## Conditional: Not Applicable

If the application data shows no gift or inheritance funds (M3-H-05 is "no" or empty), output the following single line and nothing else:

`NOT APPLICABLE — No gift funds used in this investment.`

The generation engine will omit this document from the package in that case.

---

## Data Sources (what to use from the case brief and answers)

- **Investor name**: from case brief / answers (applicant's legal name)
- **Business name and type**: for context in the irrevocability statement
- **Investment amount**: from QF-01 or M3-F-02 (total invested)
- **Gift amount**: derive from context — if all-gift, use full investment amount; if partial, use whatever the answers indicate
- **Donor information**: If the donor name/relationship was captured in the case file, use it. If not, use placeholder "[DONOR FULL NAME]", "[DONOR ADDRESS]", "[DONOR RELATIONSHIP]" — do NOT invent specific details.
- **Transfer date**: use M3-H-01 narrative if it contains date references; otherwise leave as "[DATE OF TRANSFER]"
- **Donor's source of funds**: if mentioned in the case file, use it; otherwise leave as "[DONOR SOURCE OF FUNDS — to be completed by donor]"

---

## Quality Standard

- No placeholder text if real data is available — only use brackets when the data genuinely cannot be derived
- The irrevocability statement must be unambiguous — no hedging
- The donor's source-of-funds paragraph must be at least 2 sentences — never a one-liner
- Never mention the E-2 visa number itself or make any legal conclusion about eligibility
- Never include a legal certification ("I certify under penalty of perjury...") — that language is for affidavits, not gift letters
