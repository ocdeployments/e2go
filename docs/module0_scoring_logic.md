# Module 0 — Scoring & Routing Logic
## E2Pathway Decision Engine
*Version 1.0 | May 28, 2026*

---

## Purpose

This document defines exactly how the app evaluates Module 0 answers and
produces one of four outcomes for each session. It is the decision engine
spec — the developer implements this logic precisely as written.

---

## Four Possible Outcomes

| Outcome | Meaning | Next Action |
|---------|---------|-------------|
| **PROCEED** | No disqualifying conditions, no material risk flags | Unlock payment + Module 1 |
| **PROCEED_RISK** | One or more risk flags present, no hard stops | Unlock payment + Module 1, with persistent flag |
| **ATTORNEY_RECOMMENDED** | One or more complex/risky conditions, user must acknowledge | Show attorney referral + acknowledgment gate; if acknowledged, unlock payment + Module 1 |
| **DO_NOT_PROCEED** | Hard disqualifying condition detected | Show honest stop message + attorney referral; no payment option shown |

---

## Evaluation Order

The engine evaluates answers in this exact order:

1. Hard stops first — any single hard stop immediately produces DO_NOT_PROCEED
2. Attorney-recommended flags — accumulate across all answers
3. Risk flags — accumulate across all answers
4. If no hard stops: count attorney flags and risk flags to determine final outcome

---

## Step 1 — Hard Stop Evaluation

If ANY of the following conditions are true, outcome = DO_NOT_PROCEED immediately.
No further scoring is required. Display the relevant stop message and attorney referral.

| Condition | Question | Triggering Answer(s) |
|-----------|----------|----------------------|
| PR-01 | Q0-01 | "I am a permanent resident of Canada, but not a Canadian citizen" OR "I am not a Canadian citizen" |
| PR-02 | Q0-03 | "I am currently in the United States without valid status" |
| PR-03 | Q0-04 | "No — I do not currently have funds available for the investment" |
| PR-04 | Q0-07 | "Yes — a loan secured by the assets of the business I am investing in" |
| PR-05 | Q0-08 | "I will mainly be a passive investor" |
| PR-06 | Q0-09 | "More than two equal owners" |
| PR-07 | Q0-10 | "Passive real estate holding or rental-only investment" selected |
| PR-08 | Q0-10 | "Cannabis or marijuana-related activity" selected |
| PR-09 | Q0-10 | "A business where I would not be actively involved in management" selected |

**Implementation note:**
Evaluate Q0-10 as a multiselect. If ANY of the three disqualifying options are
selected (even alongside "None of the above"), treat as a hard stop.
"None of the above" only clears this check if it is the ONLY selection.

---

## Step 2 — Attorney-Recommended Flag Accumulation

Work through each question. For each triggering answer, add the flag to the
session's attorney_flags array. These do not stop the quiz — they accumulate.

| Flag | Question | Triggering Answer(s) |
|------|----------|----------------------|
| W-02 | Q0-03 | "I am currently in the United States and I am not sure whether my status is valid" |
| W-03 | Q0-03 | "I am in another country" |
| W-07 | Q0-06 | "No — I cannot clearly document the source or movement of funds" OR "I am not sure" |
| W-08 | Q0-07 | "Yes — but I am not sure how the loan is secured" |
| W-09 | Q0-08 | "I am not sure yet" |
| W-10 | Q0-09 | "Two owners but not 50/50" OR "I am not sure yet" |
| W-11 | Q0-11 | "Yes — once" OR "Yes — more than once" OR "I am not sure" |
| W-12 | Q0-12 | "Yes" OR "I am not sure" |
| W-13 | Q0-13 | "Yes" OR "I am not sure" |
| W-14 | Q0-14 | "No" OR "I am not sure" (only evaluated if Q0-09 = "Two equal 50/50 owners") |
| W-15 | Q0-15 | "No" OR "I am not sure" (only evaluated if Q0-09 = "Two equal 50/50 owners") |
| W-16 | Q0-17 | "No" (only evaluated if Q0-16 includes spouse) |
| W-18 | Q0-19 | "Yes" OR "I am not sure" (only evaluated if Q0-16 includes children) |
| W-19 | Q0-20 | "Yes" OR "I am not sure" (only evaluated if Q0-16 includes any dependent) |

---

## Step 3 — Risk Flag Accumulation

Work through each question. For each triggering answer, add the flag to the
session's risk_flags array.

| Flag | Question | Triggering Answer(s) |
|------|----------|----------------------|
| W-01 | Q0-02 | "No" OR "I am not sure" |
| W-04 | Q0-04 | "No — funds are available, but nothing has been committed yet" |
| W-05 | Q0-05 | Amount entered (low-investment internal threshold — see thresholds below) |
| W-06 | Q0-06 | "Mostly — I have most of the documentation, but there may be gaps" |
| W-17 | Q0-18 | "No" OR "I am not sure" (only evaluated if Q0-16 includes dependents) |

### Investment Amount Thresholds for W-05

The following thresholds apply after converting to USD using current cached rate:

| USD Equivalent | Action |
|----------------|--------|
| $100,000 or above | No flag |
| $75,000 – $99,999 | W-05 risk flag — low investment advisory |
| $50,000 – $74,999 | W-05 risk flag — very low investment advisory |
| Below $50,000 | Attorney Recommended flag added (escalate from risk to attorney level) |

**Note:** There is no statutory minimum. These thresholds reflect observed
practice from official consulate documentation and are applied as advisory
flags only, not hard stops.

---

## Step 4 — Final Outcome Determination

After evaluating all questions, apply this logic:

```
if any hard_stop in session:
    outcome = DO_NOT_PROCEED
    display = stop_message[hard_stop_code]
    show_attorney_referral = true
    show_payment = false

elif any attorney_flag in session:
    outcome = ATTORNEY_RECOMMENDED
    display = attorney_flag_summary (list all flags with plain-language explanations)
    show_attorney_referral = true
    show_acknowledgment_gate = true
    // If user completes acknowledgment:
    //   outcome_override = PROCEED_RISK (flagged)
    //   show_payment = true

elif any risk_flag in session:
    outcome = PROCEED_RISK
    display = risk_flag_summary (list all flags with plain-language explanations)
    show_payment = true
    persistent_risk_banner = true  // shown throughout Module 1–3

else:
    outcome = PROCEED
    display = eligibility_confirmation
    show_payment = true
```

---

## Step 5 — Session Record

After Module 0 completes, write the following to the database:

```
eligibility_sessions table:
  id                  UUID
  session_token       TEXT        — anonymous until email captured
  email               TEXT        — from Q0-21
  casl_consent        BOOLEAN     — from Q0-21 opt-in
  outcome             TEXT        — PROCEED | PROCEED_RISK | ATTORNEY_RECOMMENDED | DO_NOT_PROCEED
  hard_stop_codes     TEXT[]      — array of any PR codes triggered
  attorney_flag_codes TEXT[]      — array of any W codes at attorney level
  risk_flag_codes     TEXT[]      — array of any W codes at risk level
  application_type    TEXT        — solo | partnership | null
  family_type         TEXT        — individual | couple | family | null
  investment_amount   NUMERIC     — from Q0-05
  investment_currency TEXT        — CAD | USD
  acknowledged_risk   BOOLEAN     — whether Q0-22 acknowledgment was completed
  completed_at        TIMESTAMPTZ
```

This record becomes the foundation for the application record created at
payment confirmation.

---

## Step 6 — Routing After Payment

Once payment is confirmed, the session record drives Module 1 routing:

| Session Flag | Module 1 Routing Effect |
|-------------|------------------------|
| application_type = solo | Load solo onboarding flow |
| application_type = partnership | Load partnership onboarding flow |
| family_type = individual | Skip dependent tabs |
| family_type = couple | Load spouse tab in Module 3 |
| family_type = family | Load spouse + children tabs in Module 3 |
| attorney_flag_codes not empty | Persistent advisory banner shown throughout |
| risk_flag_codes not empty | Persistent risk notes shown at relevant tabs |

---

## Stop Message Content (Display Copy)

### PR-01 — Not a Canadian Citizen
> Based on your answer, you do not currently hold Canadian citizenship.
> The E-2 treaty investor classification requires citizenship in a qualifying
> treaty country. For the process this app is designed to support, that means
> Canadian citizenship. Permanent residency does not qualify.
>
> We recommend speaking with a qualified immigration lawyer about your options.
> There is no charge for your review today.
>
> [Find an immigration lawyer →]

### PR-02 — In the U.S. Without Valid Status
> If you are currently in the United States without valid immigration status,
> this is outside the safe scope of a self-service preparation tool.
>
> Please speak with a qualified immigration lawyer before taking any next step.
>
> [Find an immigration lawyer →]

### PR-03 — No Investment Funds Available
> The E-2 investor classification requires a real, committed investment of your
> own capital into a U.S. business. Without available funds at this stage, the
> process is not yet ready to begin.
>
> When your financial situation changes, E2Pathway will be here.
>
> [Save my progress and return later →]

### PR-04 — Loan Secured by Business Assets
> Loan funds secured by the assets of the business being invested in do not
> fit the standard E-2 investment model this app is built to support. This
> area requires individualized legal review.
>
> [Find an immigration lawyer →]

### PR-05 — Passive Investor Role
> The E-2 category requires that you enter the United States to actively
> develop and direct the business. A passive investment role does not fit
> this model.
>
> [Find an immigration lawyer →]

### PR-06 — More Than Two Equal Owners
> An equal partnership with more than two owners does not satisfy the control
> structure the E-2 investor model requires. Each investor must be able to
> demonstrate negative control over the enterprise.
>
> [Find an immigration lawyer →]

### PR-07 — Passive Real Estate
> Passive real estate investment — holding properties or collecting rent without
> active business operations — does not fit the E-2 active-enterprise model.
>
> [Find an immigration lawyer →]

### PR-08 — Cannabis Business
> Cannabis-related businesses involve federal legal issues that are outside
> the scope of this product.
>
> [Find an immigration lawyer →]

### PR-09 — No Active Management
> The E-2 investor classification requires an active management role in the
> business. A business where you would not be involved in management does not
> fit this model.
>
> [Find an immigration lawyer →]

---

## Attorney Acknowledgment Gate (Q0-22 Display Copy)

Shown when outcome = ATTORNEY_RECOMMENDED and user chooses to continue.

> **Before we continue, please read this carefully.**
>
> Based on your answers, one or more aspects of your situation are complex
> enough that we recommend speaking with a qualified immigration lawyer before
> relying on a self-service tool.
>
> E2Pathway is a preparation and document drafting tool. It is not a law firm.
> It does not provide legal advice. It cannot assess the full implications of
> your specific situation.
>
> If you choose to continue, you are doing so with that understanding.
>
> □ I have read and understood the above. I choose to continue.
>
> [Continue anyway →]    [Find an immigration lawyer →]

---

## Persistent Risk Banner (Post-Payment Copy)

Shown at the top of every screen in Module 1–3 when risk_flags or attorney_flags
are present in the session.

> ⚠️ Your eligibility assessment noted one or more items worth reviewing
> carefully as you prepare. These are flagged throughout the relevant sections.
> Consider speaking with an immigration lawyer before submitting.

---

*End of Module 0 — Scoring & Routing Logic*
*Next: Module 1 — Onboarding, Consent & Application Setup*
