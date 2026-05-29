# Module 0 — Eligibility Quiz
## E2Pathway Question Bank
*Version 2.1 | May 28, 2026 | Denial-hardened revision*

---

## Purpose

Module 0 runs before any payment is taken. Its purpose is to do only four things:

1. Determine whether the principal applicant appears eligible to proceed
2. Detect cases outside the safe scope of a self-service app and refer to a lawyer
3. Route the user to the correct path (solo, partnership, or family flow)
4. Collect only the information needed at this stage — nothing extra

**Rule:** If a question does not help determine eligibility, risk, routing,
or dependent qualification, it does not belong in Module 0.

---

## Source Standard

- U.S. Embassy Toronto (ca.usembassy.gov)
- State Department Foreign Affairs Manual (fam.state.gov 9 FAM 402.9 / 302.3)
- Travel.state.gov where directly relevant

---

## Outcome Types

| Outcome | Meaning |
|---------|---------|
| **Proceed** | Eligible — unlock payment and Module 1 |
| **Proceed with Risk Flag** | Eligible with flagged issue — persist advisory banner |
| **Attorney Recommended** | Complex/risky — acknowledgment gate before payment |
| **Do Not Proceed** | Clearly ineligible — no payment; attorney referral shown |

---

## Section 0.1 — Principal Applicant

### Q0-01
**Question:** What is your citizenship status?
**Type:** select
**Options:**
- I am a Canadian citizen
- I am a dual citizen and one of my citizenships is Canadian
- I am a permanent resident of Canada, but not a Canadian citizen
- I am not a Canadian citizen
**Logic:**
- Canadian / dual Canadian → continue
- Permanent resident only / not Canadian → DO_NOT_PROCEED (PR-01)

**Stop PR-01:** The E-2 treaty investor classification requires treaty-country
nationality. For this product, that means Canadian citizenship. Permanent
residency does not qualify. Speak with a qualified immigration lawyer about
your options.

---

### Q0-02
**Question:** Do you currently hold a valid Canadian passport?
**Type:** select
**Options:** Yes / No / I am not sure
**Logic:** No / Not sure → Risk Flag W-01

**Warning W-01:** You will need a valid passport for visa processing. Confirm
or renew your passport before moving too far into the process.

---

### Q0-03
**Question:** Are you currently in Canada or in the United States?
**Type:** select
**Options:**
- I am currently in Canada
- I am currently in the United States on valid status
- I am currently in the United States and I am not sure whether my status is valid
- I am currently in the United States without valid status
- I am in another country
**Logic:**
- In Canada → continue
- In U.S. on valid status → continue (COS routing note)
- In U.S., unsure status → Attorney Recommended W-02
- In U.S. without valid status → DO_NOT_PROCEED (PR-02)
- Another country → Attorney Recommended W-03

**Stop PR-02:** If you are in the U.S. without valid immigration status, this
is outside the safe scope of a self-service tool. Speak with a qualified
immigration lawyer before taking any next step.

**Warning W-02:** If you are in the U.S. and unsure whether your status is
valid, get legal advice before proceeding.

**Warning W-03:** This product is optimized for Canadian principals preparing
for the Toronto E-2 process. Confirm the correct filing and interview path
before proceeding from outside Canada.

---

## Section 0.2 — Investment Readiness

### Q0-04
**Question:** Have you already invested funds into the U.S. business, or are
you in the process of committing funds to it?
**Type:** select
**Options:**
- Yes — funds have already been invested
- Yes — funds are in the process of being committed
- No — funds are available but nothing has been committed yet
- No — I do not currently have funds available for the investment
**Logic:**
- Invested / being committed → continue
- Available but uncommitted → Risk Flag W-04
- No funds → DO_NOT_PROCEED (PR-03)

**Stop PR-03:** The E-2 route requires real investment capital. If no funds
are currently available, this is not the right time to proceed.

**Warning W-04:** Uncommitted funds do not satisfy the E-2 investment standard
on their own. Your case is not submission-ready until funds are actually
committed and placed at risk.

---

### Q0-05
**Question:** Approximately how much capital do you expect to invest?
**Type:** currency — CAD or USD (user selects)
**Internal calculation:** Convert to USD using daily cached rate

**Proportionality thresholds (USD equivalent):**

| USD | Flag | Action |
|-----|------|--------|
| $150,000+ | None | Proceed cleanly |
| $75,000 – $149,999 | W-PROP-SOFT | Soft advisory |
| Below $75,000 | W-PROP-STRONG | Strong warning |

*No statutory minimum. Thresholds are advisory only based on observed practice.*

**Warning W-PROP-SOFT:** Your investment is in a range where substantiality
requires careful support. The ratio of your investment to total business cost
is critical — investing $100K into a $100K business is far stronger than
$100K into a $500K business. The total business cost field in Tab F will be
central to your case.

**Warning W-PROP-STRONG:** Your investment is below a level where standard
E-2 cases are typically approved without significant additional support.
Business type, total cost, and proportionality all matter — but your
documentation and business plan must work harder to demonstrate substantiality.
Legal review recommended before proceeding.

---

### Q0-06
**Question:** Can you document where your investment funds came from and how
they moved into the business?
**Type:** select
**Options:**
- Yes — I can document the source and movement of funds
- Mostly — I have most of the documentation, but there may be gaps
- No — I cannot clearly document the source or movement of funds
- I am not sure
**Logic:**
- Yes → continue
- Mostly → Risk Flag W-06
- No / Not sure → Attorney Recommended W-07

**Warning W-06:** Gaps in source-of-funds documentation can often be addressed,
but must be handled carefully.

**Warning W-07:** If you cannot clearly document where funds came from and how
they moved to the business, speak with an immigration lawyer before relying on
a self-service process.

---

### Q0-07
**Question:** Are any of your investment funds coming from a loan?
**Type:** select
**Options:**
- No
- Yes — a loan secured only by my personal assets
- Yes — a loan secured by the assets of the business I am investing in
- Yes — but I am not sure how the loan is secured
**Logic:**
- No → continue
- Personal assets only → continue with note
- Secured by business assets → DO_NOT_PROCEED (PR-04)
- Not sure → Attorney Recommended W-08

**Stop PR-04:** Loans secured by the assets of the business itself do not fit
the E-2 investment standard this product is built to support. Legal review
required.

**Warning W-08:** If you are not sure how the loan is secured, confirm that
before continuing. This detail matters.

---

## Section 0.3 — Business Role

### Q0-08
**Question:** What best describes your intended role in the business?
**Type:** select
**Options:**
- I will actively develop and direct the business myself
- I will actively run the business with one equal business partner
- I will mainly be a passive investor
- I am not sure yet
**Logic:**
- Actively develop / equal partner → continue
- Passive investor → DO_NOT_PROCEED (PR-05)
- Not sure → Attorney Recommended W-09

**Stop PR-05:** A passive investment does not fit the E-2 investor model.
The principal applicant must come to develop and direct the business.

---

### Q0-09
**Question:** Is your business arrangement one of the following?
**Type:** select
**Options:**
- Sole owner
- Two equal 50/50 owners
- More than two equal owners
- Two owners but not 50/50
- I am not sure yet
**Logic:**
- Sole owner → route solo
- Two equal 50/50 owners → route partnership
- More than two equal owners → DO_NOT_PROCEED (PR-06)
- Not 50/50 / Not sure → Attorney Recommended W-10

**Stop PR-06:** An equal partnership with more than two owners does not fit
the control structure this product supports for E-2 preparation.

---

## Section 0.4 — Business Type Screening

### Q0-10
**Question:** Is the business primarily any of the following?
**Type:** multiselect
**Options:**
- Passive real estate holding or rental-only investment
- Cannabis or marijuana-related activity
- A business where I would not be actively involved in management
- None of the above
**Logic:** Any disqualifying option selected → DO_NOT_PROCEED per relevant code

**Stop PR-07:** Passive real estate investment is outside the E-2 active-enterprise model.
**Stop PR-08:** Cannabis-related businesses raise federal-law issues outside scope of this product.
**Stop PR-09:** If you will not be actively involved in management, the case is outside the E-2 model.

---

## Section 0.5 — Immigration and Admissibility Risk

### Q0-11
**Question:** Have you ever been refused a U.S. visa or had a U.S. visa
application denied?
**Type:** select
**Options:**
- No — never
- Yes — one refusal, more than 5 years ago
- Yes — one refusal, within the last 5 years
- Yes — more than one refusal

**Denial risk addressed:** D-09 (interview inconsistency)

**Logic:**
- No → proceed cleanly
- One refusal, more than 5 years ago → Risk Flag W-11-OLD
- One refusal, within last 5 years → Attorney Recommended W-11-RECENT
- More than one refusal → Attorney Recommended W-11-MULTIPLE

**Warning W-11-OLD:** A single refusal more than five years ago carries less
weight than a recent one, but it must still be disclosed accurately on the
DS-160 and addressed in the application. The Interview Simulator will prepare
you for questions the officer may ask about it.

**Warning W-11-RECENT:** A refusal within the last five years will be actively
reviewed by the consular officer. It must be disclosed on your DS-160. Your
cover letter should address it proactively — explaining what has changed since.
Legal review is recommended before proceeding.

**Warning W-11-MULTIPLE:** Multiple prior refusals significantly increase
scrutiny. This does not automatically disqualify your case, but it requires
careful, proactive handling and a direct explanation in the cover letter.
Legal review is strongly recommended.

---

### Q0-12
**Question:** Have you ever been refused entry to the United States, removed,
or deported?
**Type:** select
**Options:** No / Yes / I am not sure
**Logic:**
- No → continue
- Yes / Not sure → Attorney Recommended W-12

**Warning W-12:** A prior refusal of entry, removal, or deportation must be
reviewed carefully before proceeding with a self-service process.

---

### Q0-13
**Question:** Have you ever been convicted of, cautioned for, or charged with
a criminal offence in any country — including charges that were dropped,
withdrawn, or for which you received a pardon?
**Type:** select
**Options:**
- No — no convictions or charges
- Yes — a minor conviction, more than 10 years ago
- Yes — a minor conviction within the last 10 years
- Yes — a serious conviction (any time)
- I am not sure

**Denial risk addressed:** Criminal inadmissibility grounds — FAM 9 FAM 302.3

**Logic:**
- No → proceed cleanly
- Minor conviction, more than 10 years ago → Risk Flag W-13-OLD
- Minor conviction within last 10 years → Attorney Recommended W-13-RECENT
- Serious conviction (any time) → Attorney Recommended W-13-SERIOUS
- Not sure → Attorney Recommended W-13-UNSURE

**Warning W-13-OLD:** A minor older conviction may fall within the petty
offence exception under U.S. immigration law — meaning it may not constitute
a ground of inadmissibility. This depends on the specific offence, the maximum
possible sentence, and the actual sentence served. It must still be disclosed
on the DS-160. Legal review is recommended.

**Warning W-13-RECENT:** A conviction within the last 10 years — even a minor
one — will be reviewed by the officer. Whether it triggers inadmissibility
depends on the offence type and sentence. Do not assume it is resolved without
individualized legal review.

**Warning W-13-SERIOUS:** A serious conviction requires individualized legal
analysis before relying on a self-service preparation tool. Depending on the
offence, mandatory inadmissibility grounds may apply. Legal review is essential
before proceeding.

**Warning W-13-UNSURE:** If you are not sure whether you have a relevant
criminal history, clarify this before proceeding. Failing to disclose a
conviction on the DS-160 is itself a serious issue. Legal review recommended.

---

## Section 0.9 — Non-Immigrant Intent

*Addresses D-15: officer not satisfied applicant will return to Canada*
*Positioned before partner and family screening so ties are scored early*

**Why this section exists:** The E-2 is a non-immigrant visa. One of the most
common denial triggers is an officer who is not convinced the applicant intends
to return to Canada when status ends. This section establishes whether
documented Canadian ties exist at eligibility stage — so weaknesses can be
addressed in the cover letter and interview preparation before submission.

---

### Q0-NI-01
**Question:** Do you own real estate in Canada that you intend to keep while
living in the United States?
**Type:** select
**Options:**
- Yes — I own Canadian property and will keep it
- Yes — I own Canadian property but may sell it before moving
- No — I do not own Canadian real estate
- Not applicable
**Logic:**
- Will keep property → tie confirmed ✅
- May sell / No / N/A → Risk Flag W-NI-01

**Warning W-NI-01:** Not having Canadian real estate — or planning to sell
it before your move — is not disqualifying, but it removes one of the most
credible ties to Canada. Your cover letter and interview preparation must
address non-immigrant intent through other documented ties.

---

### Q0-NI-02
**Question:** Do you have immediate family members — spouse, children, or
parents — who will remain living in Canada while you are in the United States?
**Type:** select
**Options:**
- Yes — close family will remain in Canada
- No — my immediate family will come with me
- Mixed — some family in Canada, some coming with me
- I do not have immediate family
**Logic:**
- Yes / Mixed → tie confirmed ✅
- No / No family → Risk Flag W-NI-02

**Warning W-NI-02:** If your entire immediate family is relocating to the
United States with you, the officer may probe your intent to return more
carefully. Prepare a specific, convincing answer about your Canadian ties
and your plan to return when E-2 status ends.

---

### Q0-NI-03
**Question:** Will you maintain active Canadian financial accounts, pension
plans, or retirement savings (such as an RRSP) while in the United States?
**Type:** select
**Options:**
- Yes — I will keep active Canadian financial accounts
- Partially — I will keep some accounts active
- No — I plan to close or transfer all accounts
- I am not sure yet
**Logic:**
- Yes / Partially → tie confirmed ✅
- No / Not sure → Risk Flag W-NI-03

**Warning W-NI-03:** Closing or transferring all Canadian financial accounts
removes a visible financial tie to Canada. Be prepared to articulate your
intent to return through other documented ties.

---

### Non-Immigrant Intent Composite

| Confirmed Ties | Outcome |
|----------------|---------|
| 2 or 3 | Proceed cleanly |
| 1 | Risk Flag W-NI-WEAK |
| 0 | Attorney Recommended W-NI-NONE |

**Warning W-NI-WEAK:** Only one Canadian tie has been identified. Non-immigrant
intent will need to be argued carefully in the cover letter. The Interview
Simulator will prepare you for the questions the officer will likely ask.

**Warning W-NI-NONE:** No documented Canadian ties have been identified.
Non-immigrant intent is one of the most common reasons E-2 applications are
denied or probed heavily at interview. Before proceeding, consider whether
ties exist that have not yet been identified — or plan to establish. This
area requires careful strategic preparation.

---

## Section 0.6 — Partner Screening

*Shown only if Q0-09 = "Two equal 50/50 owners"*

### Q0-14
**Question:** Is your business partner a Canadian citizen?
**Type:** select
**Options:** Yes / No / I am not sure
**Logic:** No / Not sure → Attorney Recommended W-14

**Warning W-14:** If your business partner is not a Canadian citizen, or you
are not sure of their treaty-country eligibility, get legal guidance before
relying on a standard partnership workflow.

---

### Q0-15
**Question:** Will your partner also be actively developing and directing
the business?
**Type:** select
**Options:** Yes / No / I am not sure
**Logic:** No / Not sure → Attorney Recommended W-15

**Warning W-15:** A business partner who is not actively developing and
directing the business may not fit the standard co-investor model.

---

## Section 0.7 — Family Screening

### Q0-16
**Question:** Will any family members apply as your dependents?
**Type:** select
**Options:**
- No
- Yes — spouse only
- Yes — children only
- Yes — spouse and children
- I am not sure yet

---

### Q0-17
**Question:** If a spouse is applying with you, are you legally married?
**Type:** select
**Show if:** Q0-16 includes spouse
**Options:** Yes / No / Not applicable
**Logic:** No → Attorney Recommended W-16

**Warning W-16:** If the relationship is not a legal marriage, do not assume
the standard spouse-dependent workflow applies.

---

### Q0-18
**Question:** Will every dependent applying with you have a valid passport
for visa processing?
**Type:** select
**Show if:** Q0-16 includes any dependent
**Options:** Yes / No / I am not sure / Not applicable
**Logic:** No / Not sure → Risk Flag W-17

**Warning W-17:** Each dependent needs valid passport documentation for visa
processing. Confirm this early to avoid delay.

---

### Q0-19
**Question:** Do any children applying with you fall into either of these
categories: 21 or older, or married?
**Type:** select
**Show if:** Q0-16 includes children
**Options:** No / Yes / Not applicable / I am not sure
**Logic:** Yes / Not sure → Attorney Recommended W-18

**Warning W-18:** Dependent-child eligibility can be lost based on age or
marital status. Confirm before relying on a standard family workflow.

---

### Q0-20
**Question:** Does any dependent have prior U.S. visa refusals, entry
refusals, removal history, or criminal history?
**Type:** select
**Show if:** Q0-16 includes any dependent
**Options:** No / Yes / I am not sure / Not applicable
**Logic:** Yes / Not sure → Attorney Recommended W-19

**Warning W-19:** A dependent's immigration or criminal history may require
individualized legal review.

---

## Section 0.8 — Consent and Routing

### Q0-21
**Question:** Where should we send your eligibility result and next-step summary?
**Type:** text (email)
**Validation:** email format

---

### Q0-22
**Question:** If your case includes one or more risk flags, do you understand
that E2Pathway is a preparation tool and not a legal service?
**Type:** acknowledgment
**Shown if:** any Attorney Recommended outcome triggered and user chooses to continue

> I understand that my case includes one or more issues that may require
> legal advice. E2Pathway is a preparation tool, not a law firm or substitute
> for legal counsel. If I continue, I do so with that understanding.

---

## Summary of Hard Stops

| Code | Trigger |
|------|---------|
| PR-01 | Principal applicant not a Canadian citizen |
| PR-02 | In U.S. without valid status |
| PR-03 | No investment funds available |
| PR-04 | Loan secured by business assets |
| PR-05 | Passive investor role |
| PR-06 | More than two equal owners |
| PR-07 | Passive real estate holding |
| PR-08 | Cannabis-related business |
| PR-09 | No active management role |

---

## Summary of Attorney-Recommended Flags

| Code | Trigger |
|------|---------|
| W-02 | Unsure about U.S. status |
| W-03 | Outside standard Canada/U.S. path |
| W-07 | Source/path of funds unclear |
| W-08 | Loan structure unclear |
| W-09 | Principal role unclear |
| W-10 | Two-owner structure not 50/50 |
| W-11-RECENT | Single visa refusal within last 5 years |
| W-11-MULTIPLE | More than one visa refusal |
| W-12 | Prior entry refusal / removal / deportation |
| W-13-RECENT | Minor conviction within last 10 years |
| W-13-SERIOUS | Serious conviction (any time) |
| W-13-UNSURE | Unsure about criminal history |
| W-14 | Partner citizenship uncertain or non-Canadian |
| W-15 | Partner role uncertain or inactive |
| W-16 | Relationship may not qualify as legal marriage |
| W-18 | Child age or marital-status issue |
| W-19 | Dependent admissibility issue |
| W-NI-NONE | Zero Canadian ties confirmed |

---

## Summary of Risk Flags

| Code | Trigger |
|------|---------|
| W-01 | Passport validity uncertain |
| W-04 | Funds available but not yet committed |
| W-05 / W-PROP-SOFT | Investment $75K–$149K USD |
| W-PROP-STRONG | Investment below $75K USD |
| W-06 | Partial source-of-funds documentation |
| W-11-OLD | Single visa refusal more than 5 years ago |
| W-13-OLD | Minor conviction more than 10 years ago |
| W-17 | Dependent passport validity uncertain |
| W-NI-01 | No Canadian real estate or plans to sell |
| W-NI-02 | Entire family relocating to U.S. |
| W-NI-03 | Canadian financial accounts closing |
| W-NI-WEAK | Only one Canadian tie identified |

---

*End of Module 0 — Eligibility Quiz v2.1*
*Next: Module 0 Scoring & Routing Logic v1.1 (update scoring_logic.md to match)*
