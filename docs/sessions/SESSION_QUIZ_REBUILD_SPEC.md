# Module 0 — Eligibility Quiz
## Final Question Spec v5.0
**Date:** June 10, 2026
**Replaces:** All previous versions
**Status:** Final — ready for implementation

---

## Purpose

One job: determine in the minimum number of questions whether this
person can qualify for an E-2 Treaty Investor visa, and route them
correctly to the next stage.

The quiz is not a document-collection tool. It is a gate and a router.
Everything else happens in the case file.

---

## Four possible outcomes

| Outcome | Meaning | What happens |
|---|---|---|
| PROCEED | Clear eligibility, no material flags | Unlock pricing → payment → case file |
| PROCEED_RISK | Eligible with risk flags | Unlock pricing, flags surfaced on results page |
| ATTORNEY_RECOMMENDED | Complex conditions present | Show attorney referral, acknowledgment gate, then unlock |
| DO_NOT_PROCEED | Hard disqualifier | Honest stop, no payment taken |

---

## Scoring

Base score: 100
Each risk warning: -4 points
Each attorney flag: -8 points
Minimum score: 0

Outcome thresholds:
- Score 80+, zero attorney flags → PROCEED
- Score 60–79, or 1+ risk warning → PROCEED_RISK
- 1+ attorney flag → ATTORNEY_RECOMMENDED
- Any hard stop → DO_NOT_PROCEED (score irrelevant)

---

## Data outputs — what the quiz must produce

Every answer must produce structured output that feeds downstream.

```typescript
interface QuizResult {
  // Eligibility
  outcome: 'PROCEED' | 'PROCEED_RISK' | 'ATTORNEY_RECOMMENDED' | 'DO_NOT_PROCEED';
  score: number;
  warnings: string[];
  attorney_flags: string[];

  // Routing
  country: string;               // treaty country name
  cos_flag: boolean;             // change of status path
  application_type: 'solo' | 'partnership' | 'spousal_partnership';
  principal_applicant: 'self' | 'spouse';

  // Pricing
  dependents: 'just_me' | 'spouse_only' | 'spouse_and_children' | 'children_only';
  partner_type: 'none' | 'unrelated' | 'spouse';

  // Case file pre-fill
  investment_range: string;
  funding_type: string;
  role: string;
  business_stage: 'specific' | 'direction' | 'open';
  business_type: 'franchise' | 'acquisition' | 'new' | 'unknown';
  franchise_interest: boolean;
  ties_categories: string[];
  history_flags: string[];
}
```

---

## Question sequence

10 core questions. 4 conditional sub-questions (fire only when needed).
Total maximum: 14 questions. Most applicants see 10–11.

Sequence:
1. Citizenship
2. Who is this application for?
3. Who is moving with you?
4. Business partner?
5. Where are you applying from?
6. How are you funding this?
7. How much are you investing?
8. What is your business situation?
9. Any immigration or criminal history?
10. What ties do you have to your home country?

---

## Q1 — Citizenship

**ID:** Q0-01
**Section:** ELIGIBILITY
**Question:** What is your citizenship?
**Helper:** The E-2 requires citizenship in a qualifying treaty country.
  Permanent residency alone does not qualify.
**Tip:** There are 82 E-2 treaty countries. Dual citizenship in any
  treaty country qualifies you.
**Type:** Country search (searchable dropdown)

**Logic:**
- Selected country is in TREATY_COUNTRIES array → continue
- Selected country is NOT in TREATY_COUNTRIES → STOP PR-01
- "Permanent resident only" selected → STOP PR-01

**Hard stop PR-01:**
"The E-2 visa requires citizenship in a qualifying treaty country —
not residency. We recommend consulting an immigration attorney about
alternative visa options. No charge for this assessment."

**Outputs:** `country`, `treaty_confirmed: true`

**Design note:** The search field must validate against TREATY_COUNTRIES
on selection and fire PR-01 immediately if not found. This is the most
critical bug to fix — currently any country passes through.

---

## Q2 — Who is this application for?

**ID:** Q0-02
**Section:** ELIGIBILITY
**Question:** Are you applying for yourself, or completing this on
  behalf of your spouse?
**Helper:** If your spouse is the principal investor, their qualifications
  and investment lead the application. Everything should be answered
  from their perspective.
**Type:** Select

**Options:**
- I am the principal applicant — this is my application
- My spouse is the principal applicant — I am completing this for them
- We are both investing — applying as co-investors

**Logic:**
- "I am the principal applicant" → continue, set `principal_applicant: 'self'`
- "My spouse is the principal" → continue, set `principal_applicant: 'spouse'`,
  show persistent advisory: "Answer all questions from your spouse's
  perspective — their investment, their role, their qualifications."
- "Co-investors" → continue, set `application_type: 'partnership'`,
  set `partner_type: 'spouse'`, skip Q4 (partnership already confirmed)

**Outputs:** `principal_applicant`, `application_type` (if co-investors)

---

## Q3 — Who is moving with you?

**ID:** Q0-03
**Section:** FAMILY
**Question:** Who will be moving to the US with you?
**Helper:** Your spouse and unmarried children under 21 can be included
  as E-2 dependents. Your spouse also receives unrestricted US work
  authorisation.
**Type:** Select

**Options:**
- Just me — no spouse or children
- Me and my spouse
- Me, my spouse, and our children
- Me and my children (no spouse)
- Not decided yet

**Logic — all options continue. No hard stops here.**
- "Just me" → `dependents: 'just_me'`
- "Me and my spouse" → `dependents: 'spouse_only'`
- "Me, my spouse, and our children" → `dependents: 'spouse_and_children'`,
  trigger sub-question Q3a
- "Me and my children" → `dependents: 'children_only'`,
  trigger sub-question Q3a
- "Not decided yet" → `dependents: 'just_me'` (default to lowest tier,
  can be updated in case file)

**Sub-question Q3a — Children ages**
**ID:** Q0-03a
**Fires when:** Q3 = "spouse and children" or "children only"
**Question:** How old are the children who will be joining you?
**Type:** Select
**Options:**
- All under 18
- One or more are 18–20 (approaching age-out)
- One or more are 21 or older

**Logic:**
- "All under 18" → continue
- "18–20" → risk warning W-AGING-OUT:
  "Children lose E-2 dependent status on their 21st birthday. If a
  child is approaching 21, your timeline matters — we will flag this
  in your compliance calendar."
- "21 or older" → advisory (not a stop):
  "Children 21 or older cannot be included as E-2 dependents. They
  would need to apply for their own visa separately."

**Outputs:** `dependents`, `children_age_flag`

---

## Q4 — Business partner?

**ID:** Q0-04
**Section:** FAMILY
**Question:** Will you have a business partner on this application?
**Helper:** Two investors can apply together if each owns exactly 50%
  and both actively manage the business. More than two investors does
  not qualify under E-2 investor classification.
**Type:** Select
**Shown only if:** Q2 ≠ "co-investors" (if already confirmed in Q2, skip)

**Options:**
- No — I am the sole investor
- Yes — one business partner, 50/50 ownership
- Yes — my spouse is my business partner
- Yes — more than one partner

**Logic:**
- "Sole investor" → `application_type: 'solo'`, `partner_type: 'none'`
- "50/50 partner" → `application_type: 'partnership'`, `partner_type: 'unrelated'`
- "Spouse as partner" → `application_type: 'spousal_partnership'`,
  `partner_type: 'spouse'`, trigger sub-question Q4a
- "More than one partner" → STOP PR-06b

**Hard stop PR-06b:**
"Under 9 FAM 402.9, an equal partnership with more than two partners
does not give any individual investor the control required for E-2
investor classification. You have two options: restructure to two
investors at 50/50 each, or explore the E-2 employee pathway if your
company is majority treaty-national owned. E2go prepares investor
applications — we recommend consulting an immigration attorney."

**Sub-question Q4a — Spouse role**
**ID:** Q0-04a
**Fires when:** Q4 = "spouse as partner"
**Question:** What will your spouse's role be?
**Helper:** An accompanying spouse receives E-2 dependent status and
  unrestricted US work authorisation — they can work anywhere, not
  just in your business.
**Type:** Select
**Options:**
- Active co-operator — managing the business alongside me
- Silent investor — ownership stake, not day-to-day involved
- Accompanying dependent — moving with me, not involved in the business

**Logic — all options continue:**
- "Active co-operator" → flag `flag_spouse_qualifications: true`
  Advisory: "Your spouse's qualifications will need to be documented
  separately — this strengthens your application significantly."
- "Silent investor" → continue, no flag
- "Accompanying dependent" → continue, set `partner_type: 'none'`,
  `application_type: 'solo'`, advisory:
  "Your spouse will travel with you on an E-2 dependent visa and can
  work for any US employer. They do not need to be involved in your
  business."

**Outputs:** `application_type`, `partner_type`, `flag_spouse_qualifications`

---

## Q5 — Where are you applying from?

**ID:** Q0-05
**Section:** ELIGIBILITY
**Question:** Where are you applying from?
**Helper:** Most applicants apply through their home country consulate.
  If you are currently in the US on valid status, you may have the
  option to change status through USCIS instead.
**Type:** Select

**Options:**
- From my home country — consular processing
- From inside the US — on a valid visa or status
- From inside the US — without valid status

**Logic:**
- "Home country" → continue
- "Valid US status" → continue, set `cos_flag: true`
  Advisory: "You may be eligible for Change of Status through USCIS,
  which avoids a consulate interview. Your case file will include
  guidance on both pathways."
- "No valid status" → STOP PR-09

**Hard stop PR-09:**
"Applying while inside the US without valid immigration status creates
serious legal risk that could permanently affect your ability to
re-enter. Please consult a qualified immigration attorney immediately
before taking any further steps."

**Outputs:** `cos_flag`

---

## Q6 — How are you funding this?

**ID:** Q0-06
**Section:** INVESTMENT
**Question:** How are you funding your investment?
**Helper:** The E-2 requires capital you own and control — committed to
  the business and at risk. Borrowed funds can play a role but cannot
  be the primary source.
**Tip:** Funds liquidated from assets you own — property, investments,
  a business you sold — qualify as your own capital.
**Type:** Select

**Options:**
- Personal savings or accessible funds
- Liquidating an asset — property, investments, or a business
- Primarily through a business loan or third-party financing
- I don't have funds available yet

**Logic:**
- "Personal savings" → continue, set `funding_type: 'savings'`
- "Liquidating an asset" → continue, set `funding_type: 'liquidation'`
- "Primarily a loan" → STOP PR-02
- "No funds" → STOP PR-03

**Hard stop PR-02:**
"The E-2 requires capital you own and control. An investment funded
primarily through loans does not meet this requirement. A qualified
immigration attorney can assess your specific situation."

**Hard stop PR-03:**
"The E-2 visa requires an active investment of your own capital. When
your situation changes, we will be here."

**Outputs:** `funding_type`

---

## Q7 — How much are you investing?

**ID:** Q0-07
**Section:** INVESTMENT
**Question:** How much are you investing in this business?
**Helper:** There is no official minimum, but the investment must be
  substantial relative to the total cost of the business — not just
  a large absolute number.
**Tip:** The substantiality test is proportional: $150,000 into a
  $150,000 business is 100% — clearly substantial. The same $150,000
  into a $1,000,000 business is only 15%.
**Type:** Select

**Options:**
- Over $150,000 USD
- $100,000 – $150,000 USD
- $75,000 – $99,999 USD
- $50,000 – $74,999 USD
- Under $50,000 USD

**Logic:**
- "Over $150,000" → continue, `investment_range: 'over_150k'`
- "$100,000–$150,000" → continue, `investment_range: '100k_150k'`
- "$75,000–$99,999" → continue with warning W-INVEST-LOW,
  `investment_range: '75k_99k'`
- "$50,000–$74,999" → continue with warning W-INVEST-VERY-LOW,
  `investment_range: '50k_74k'`
- "Under $50,000" → STOP PR-04

**Warning W-INVEST-LOW:** "This investment level is within range but
  your business type selection will be critical. Your case file will
  need to make a strong substantiality argument."

**Warning W-INVEST-VERY-LOW:** "This is below the typical threshold
  for most E-2 businesses. The range of qualifying businesses is
  significantly narrower at this level."

**Hard stop PR-04:**
"An investment under $50,000 faces very high risk of refusal. We
would rather be honest with you now than take your money for a
process unlikely to succeed at this level."

**Outputs:** `investment_range`

---

## Q8 — What is your business situation?

**ID:** Q0-08
**Section:** BUSINESS
**Question:** Where are you with your business?
**Helper:** You do not need a business chosen to get started. The E-2
  allows you to apply while your investment is in process — not just
  after the business is open.
**Type:** Select

**Options:**
- I have a specific business or franchise in mind
- I have a general direction but haven't chosen yet
- I'm completely open — I haven't started looking

**Logic:**
- "Specific business" → trigger sub-question Q8a,
  set `business_stage: 'specific'`
- "General direction" → trigger sub-question Q8b (broker),
  set `business_stage: 'direction'`
- "Completely open" → trigger sub-question Q8b (broker),
  set `business_stage: 'open'`

**Sub-question Q8a — Business type**
**ID:** Q0-08a
**Fires when:** Q8 = "specific business"
**Question:** What type of business is it?
**Type:** Select
**Options:**
- A franchise — buying into an established brand
- An existing independent business I am acquiring
- A new business I am starting from scratch
- Professional services or consulting
- Something else

**Logic:**
- "Franchise" → `business_type: 'franchise'`, trigger Q8b (broker)
- "Acquiring existing" → `business_type: 'acquisition'`, continue
- "New business" → `business_type: 'new'`, continue
- "Professional services" → `business_type: 'new'`, warning W-MARGINALITY
- "Something else" → `business_type: 'unknown'`, continue

**Warning W-MARGINALITY:** "Solo professional services businesses can
  face scrutiny under the marginality test. Your business plan must
  show capacity to generate income well beyond your household needs
  and to create employment for others."

**Sub-question Q8b — Broker introduction**
**ID:** Q0-08b
**Fires when:** Q8 = "direction" or "open", or Q8a = "franchise"
**Question:** Would you like an introduction to an E-2 specialist
  franchise broker?
**Helper:** Based on your investment range, we can connect you with
  brokers who specialise in businesses with the strongest E-2 track
  record. Introductions are made only with your consent.
**Type:** Select
**Options:**
- Yes — please connect me with a broker
- No thanks, I'll find one myself

**Logic:**
- "Yes" → `franchise_interest: true`
- "No" → `franchise_interest: false`
- Both continue.

**Outputs:** `business_stage`, `business_type`, `franchise_interest`

---

## Q9 — Immigration and criminal history

**ID:** Q0-09
**Section:** HISTORY
**Question:** Have any of the following ever applied to you?
**Helper:** Prior refusals and convictions are not automatically
  disqualifying — but they must be disclosed and handled carefully.
  Honest disclosure is legally required.
**Tip:** Concealing a prior US visa refusal is grounds for a permanent
  bar from the United States.
**Type:** Multiselect

**Options:**
- A prior US visa refusal
- Refused entry at a US port of entry
- Deported or removed from the US
- A criminal conviction in any country
- None of the above

**Logic:**
- "None of the above" only → continue, no flags
- "Prior visa refusal" selected → trigger sub Q9a
- "Refused entry" selected → attorney flag W-ENTRY
- "Deported" selected → attorney flag W-DEPORTED
- "Criminal conviction" selected → trigger sub Q9b
- Multiple items selected → accumulate all flags

**Sub-question Q9a — Visa refusal detail**
**ID:** Q0-09a
**Fires when:** "Prior US visa refusal" selected
**Question:** When was the refusal?
**Type:** Select
**Options:**
- More than 5 years ago
- Within the last 5 years
- More than once

**Logic:**
- "More than 5 years" → warning W-REFUSAL-OLD:
  "An older refusal is manageable with proper preparation. We will
  address it in your application narrative."
- "Within 5 years" → attorney flag W-REFUSAL-RECENT
- "More than once" → attorney flag W-REFUSAL-MULTIPLE

**Sub-question Q9b — Criminal conviction detail**
**ID:** Q0-09b
**Fires when:** "Criminal conviction" selected
**Question:** How would you describe the conviction?
**Type:** Select
**Options:**
- A minor matter, more than 10 years ago
- A minor matter, within the last 10 years
- A serious criminal conviction
- I am not sure whether it affects US admissibility

**Logic:**
- "Minor, 10+ years ago" → warning W-CONVICTION-OLD:
  "An older minor conviction may not affect admissibility but must
  be disclosed. We will address it in your interview preparation."
- "Minor, recent" → attorney flag W-CONVICTION-RECENT
- "Serious conviction" → STOP PR-08
- "Not sure" → attorney flag W-CONVICTION-UNSURE

**Hard stop PR-08:**
"Certain criminal convictions create grounds of inadmissibility under
US immigration law. This requires assessment by a qualified
immigration attorney before you proceed."

**Outputs:** `history_flags`, attorney flags

---

## Q10 — Home country ties

**ID:** Q0-10
**Section:** HOME TIES
**Question:** What keeps you connected to [home_country]?
**Helper:** The consulate must be confident you intend to return home
  when your visa expires. Select everything that applies — the more
  ties you have, the stronger your case.
**Tip:** Ties do not have to be family. Property, financial accounts,
  a business, professional obligations — anything that pulls you back
  home counts.
**Type:** Multiselect

**Options:**
- Property I own and intend to keep
- Financial accounts, investments, or pension funds
- Family members who will remain there
- An ongoing business or professional practice
- Professional licences, memberships, or obligations
- Other significant ties
- Nothing significant — I am fully relocating

**Logic:**
- Any combination of the first six options → continue.
  Count selected items → `ties_score` (number of categories)
  `ties_categories` (list of selected categories)
  More categories = stronger ties signal.

- "Nothing significant" selected alone → continue with warning
  W-NO-TIES:
  "Having no significant ties to your home country is a known risk
  factor for the 214(b) immigrant intent assessment. Your cover letter
  will need to address this directly. This does not stop your
  application — it is something we will help you prepare for."

- "Nothing significant" selected alongside other options →
  treat as if not selected. The applicant may have misunderstood.
  Use the other selections only.

**Outputs:** `ties_categories`, `ties_score`

---

## Question counter logic

The counter displays "Question X of Y" where Y is the count of
questions currently visible to this specific applicant — not a
static total.

```typescript
const visibleQuestions = QUESTIONS.filter(q => {
  if (q.showIf) return q.showIf(answers);
  return true;
});
const totalVisible = visibleQuestions.length;
// Display: "Question {currentIndex + 1} of {totalVisible}"
```

Y updates as sub-questions fire or are dismissed.
The current question number is NEVER higher than the total.

---

## Navigation

**Back button:** Bottom left of every question screen.
**Continue / next:** Bottom right.
**On first question:** Back button hidden.
**Section tabs:** Visible at top. Clickable for completed sections only.
**Progress bar:** Based on currentIndex / totalVisible as percentage.

---

## Hard stops — complete list

| Code | Trigger | Message theme |
|---|---|---|
| PR-01 | Non-treaty citizenship | Citizenship requirement |
| PR-02 | Primarily loan-funded | At-risk capital requirement |
| PR-03 | No funds available | Investment existence requirement |
| PR-04 | Under $50,000 | Minimum substantiality |
| PR-06b | More than two partners | Control requirement per 9 FAM |
| PR-08 | Serious criminal conviction | Inadmissibility |
| PR-09 | No valid US status | Legal presence requirement |

Every hard stop:
1. Shows a clear, honest explanation
2. Never blames the applicant
3. Offers an attorney referral
4. Offers a "start over" option
5. Takes no payment

---

## handleComplete — result data

When the last question is answered, construct:

```typescript
const resultData = {
  outcome,
  score,
  warnings,
  attorney_flags,
  answers,

  // Routing outputs
  country: answers["Q0-01"] as string,
  cos_flag: answers["Q0-05"] === "From inside the US — on a valid visa or status",
  principal_applicant: answers["Q0-02"]?.includes("spouse is the principal")
    ? 'spouse' : 'self',

  // Pricing outputs — read from Q3 and Q4
  application_type: answers["Q0-04"]?.includes("co-investors") ||
    answers["Q0-02"]?.includes("co-investors")
    ? (answers["Q0-04"]?.includes("spouse") ||
       answers["Q0-02"]?.includes("co-investors") ? 'spousal_partnership' : 'partnership')
    : 'solo',

  dependents: (() => {
    const a = answers["Q0-03"] as string || "";
    if (a.includes("spouse and children") || a.includes("children")) {
      return a.includes("spouse") ? 'spouse_and_children' : 'children_only';
    }
    if (a.includes("spouse")) return 'spouse_only';
    return 'just_me';
  })(),

  partner_type: (() => {
    const a = answers["Q0-04"] as string || "";
    if (a.includes("spouse")) return 'spouse';
    if (a.includes("50/50")) return 'unrelated';
    return 'none';
  })(),

  // Case file pre-fills
  investment_range: answers["Q0-07"] as string,
  funding_type: answers["Q0-06"] as string,
  business_stage: (() => {
    const a = answers["Q0-08"] as string || "";
    if (a.includes("specific")) return 'specific';
    if (a.includes("direction")) return 'direction';
    return 'open';
  })(),
  business_type: answers["Q0-08a"] as string || 'unknown',
  franchise_interest: answers["Q0-08b"] === "Yes — please connect me with a broker",
  ties_categories: (answers["Q0-10"] as string[]) || [],
  history_flags: [
    answers["Q0-09-refusal"],
    answers["Q0-09-entry"],
    answers["Q0-09-deported"],
    answers["Q0-09-conviction"],
  ].filter(Boolean) as string[],
};
```

---

## Pre-fill mapping — quiz to case file

| Quiz field | Case file section | Question ID |
|---|---|---|
| country | Section 1 — Admin | QA-01, QA-05 |
| principal_applicant | All sections | Perspective framing |
| dependents | Section 5 — Family | Dependent structure |
| application_type | /apply overview | Section manifest routing |
| partner_type | Section 2 — Business | Partnership track |
| investment_range | Section 3 — Investment | QF-02 (rough pre-fill) |
| funding_type | Section 3 — Investment | QF-05 (source category) |
| business_stage | Module 2 entry | Business advisor routing |
| business_type | Section 2 — Business | QK-01 (business type) |
| franchise_interest | Module 2 | Broker referral |
| ties_categories | Section 6 — Ties | Cluster activation |
| history_flags | Section 1 — Admin | QA-23 (DS-160 history) |
| cos_flag | /apply overview | COS section manifest |

---

## Scoring weights

```json
{
  "base_score": 100,
  "deductions": {
    "attorney_flag": 8,
    "risk_flag": 4,
    "W-INVEST-VERY-LOW": 6,
    "W-INVEST-LOW": 3,
    "W-REFUSAL-RECENT": 10,
    "W-REFUSAL-MULTIPLE": 12,
    "W-CONVICTION-OLD": 4,
    "W-ENTRY": 8,
    "W-DEPORTED": 10,
    "W-MARGINALITY": 4,
    "W-AGING-OUT": 2,
    "W-NO-TIES": 6
  }
}
```

---

## What is NOT in this quiz (and why)

| Question | Reason removed | Where it lives instead |
|---|---|---|
| Documentation quality | Not an eligibility gate. Creates friction without purpose. | Section 3 investment, paper trail cluster |
| Investment commitment timing | Not an eligibility gate. | Section 3 investment, deployment status |
| Specific business type detail | Only needed for hard stops (cannabis, passive RE) — handled by Q7 role + Q8 type. | Module 2 business advisor |
| Active enterprise check | Irrelevant for people without a specific business. | Section 2 business, entity cluster |
| Holding company / control rights | Not needed to determine eligibility. | Section 2 partnership structure |
| E-visa nationality | Not needed to determine eligibility. | Section 2 partnership structure |
| Preparation status | Not a quiz question. | Case file upload card |
| Revenue projections | Not a quiz question. | Section 3 projection table |
| Hiring plan | Not a quiz question. | Section 3 non-marginality cluster |
| Business motivation | Not a quiz question. | Section 1 story cluster |
| Home country property detail | Q10 multiselect captures it. Detail belongs in case file. | Section 6 ties |
| Financial accounts detail | Q10 multiselect captures it. | Section 6 ties |
| Extended family detail | Q10 multiselect captures it. | Section 6 ties |
| Passport validity | Not an eligibility gate. A practical reminder, not a qualifier. | Compliance calendar |
| Site visit / timeline | Not eligibility-determining at quiz stage. | Results page follow-up |
