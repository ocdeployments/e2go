# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 7.5 & 7.6
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 7.5 Application Confidence Score Engine

### Purpose
The Confidence Score is generated after Module 3 is complete and all
templates have been populated. It gives the user a multi-dimensional
assessment of their application's strength across the 8 criteria that
consular officers evaluate. It is an educational tool — not a prediction
of outcome — and is framed accordingly in all UI language.

---

### Legal Framing (Displayed on Every Score Screen)

PRIMARY DISCLAIMER (persistent banner):
"This assessment reflects the completeness and quality of your
preparation materials based on publicly documented E-2 adjudication
criteria. It is not a prediction of visa outcome. Consular decisions
involve factors beyond the scope of any preparation tool. Individual
results depend on the specific circumstances of each application and
the judgment of the consular officer."

SECONDARY FRAMING (score header):
"Your Application Readiness Assessment — based on the information
you've provided. The score evaluates your preparation materials,
not your visa application."

---

### The 8 Scoring Dimensions

#### DIMENSION 1 — Investment Substantiality (0–25 points)

Scoring logic:

Step 1: Calculate proportionality ratio
  proportionality = investment_amount_usd / total_business_cost_usd

Step 2: Score by proportionality bracket:
  90–100% invested:   24–25 points (excellent — fully funded)
  75–89% invested:    20–23 points (strong)
  60–74% invested:    14–19 points (acceptable — may need explanation)
  50–59% invested:    8–13 points  (borderline — cover letter must address)
  Below 50%:          0–7 points   (high risk — advisory triggered)

Step 3: Apply modifiers:
  +2 if investment_amount_usd > $150,000 USD (above typical floor)
  +1 if all funds confirmed deployed (not just committed)
  -3 if investment_amount_usd < $75,000 USD (below observed Toronto floor)
  -2 if any funds held in escrow or not yet at risk

Maximum: 25 points

Advisory triggered at < 14 points:
"⚠️ Your investment proportionality is below the recommended threshold.
Consular officers assess whether your investment is 'substantial' relative
to the total cost of the business. Consider: (a) increasing your investment,
(b) reducing the total business cost estimate, or (c) ensuring your cover
letter explicitly addresses the proportionality with supporting rationale."

---

#### DIMENSION 2 — Source & Path of Funds (0–20 points)

Scoring logic:

Base score by documentation_status:
  Complete (all accounts documented):     16–20 points
  Partial (minor gaps):                   10–15 points
  Incomplete (significant gaps):          0–9 points

Modifiers:
  +2 if single clean source (e.g., one property sale, all proceeds traceable)
  +2 if all wire transfers confirmed with reference numbers
  +1 if gift letter template completed (if gift source used)
  -4 if unexplained deposits flagged in timeline builder
  -3 if funds passed through offshore accounts without explanation
  -2 if RRSP withdrawal without CPA consultation noted
  -2 if any gap > 60 days in the fund chronology

Maximum: 20 points

Advisory triggered at < 12 points:
"⚠️ Your source of funds documentation has gaps that may draw scrutiny.
The most common reason for 221(g) supplemental requests is an incomplete
funds trail. Review your Template 1 chronology and ensure every account
transfer is documented with corresponding bank statements."

---

#### DIMENSION 3 — Non-Marginality (0–20 points)

Scoring logic:

Step 1: Calculate revenue-to-household ratio at Year 3 and Year 5
  ratio_y3 = projected_revenue_y3 / household_income_need
  ratio_y5 = projected_revenue_y5 / household_income_need

Step 2: Score Year 3 ratio:
  ≥ 5x:        9–10 points
  4x–4.99x:    7–8 points
  3x–3.99x:    5–6 points (minimum acceptable)
  2x–2.99x:    2–4 points (borderline)
  < 2x:        0–1 points (high risk)

Step 3: Score Year 5 ratio:
  ≥ 6x:        8–10 points
  4x–5.99x:    6–7 points
  3x–3.99x:    4–5 points
  < 3x:        0–3 points

Modifiers:
  +2 if Year 5 FT employees ≥ 5
  +1 if Year 3 FT employees ≥ 2
  -3 if Year 5 FT employees = 0 (solo operator flag)
  -2 if revenue projections have no stated evidence basis
  -2 if break-even projected beyond 24 months

Maximum: 20 points

Advisory triggered at < 12 points:
"⚠️ Your non-marginality score is below the recommended threshold.
Officers look for a business that generates significant income beyond
your family's needs. Strengthen this dimension by: (a) reviewing your
revenue projections with supporting market data, (b) adding at least
one more employee to your hiring plan, or (c) documenting a second
revenue stream."

---

#### DIMENSION 4 — Active Direction & Development (0–15 points)

Scoring logic:

Base score by role clarity:
  Named C-suite or operational title + detailed responsibilities:  12–15 points
  Named title + basic responsibilities:                            8–11 points
  "Owner" or "Investor" with no operational detail:               3–7 points
  No management role defined:                                      0–2 points

Modifiers:
  +2 if investor has prior business ownership experience
  +1 if investor's background directly matches business type
  +1 if org chart shows investor at apex of operational hierarchy
  -3 if business_route = "partner_investment" and role
      not clearly distinct from U.S. partner
  -2 if investor's described role is entirely passive ("oversee finances only")

Maximum: 15 points

---

#### DIMENSION 5 — Business Plan Quality (0–10 points)

Scoring logic:

  Market analysis includes local/city-specific data:          +2
  Competitive analysis includes named competitors:            +1
  Revenue projections have documented evidence basis:         +2
  First 90-day operational plan is specific:                  +1
  Financial projections include monthly Year 1 breakdown:     +1
  Business plan references investor's specific qualifications: +1
  Franchise FDD or prior owner financials referenced:         +2
  Generic/insufficient inputs (penalized per gap):            -1 per gap

Maximum: 10 points

---

#### DIMENSION 6 — Investor Qualifications (0–5 points)

Scoring logic:

  Direct industry experience matching business type:          2 points
  General business management experience:                     1 point
  Prior business ownership:                                   1 point
  Advanced education (degree or professional designation):    1 point

Maximum: 5 points
Note: Low score here is common and not heavily weighted. Many
successful E-2 applicants have no direct industry experience.
Cover letter framing of transferable skills compensates significantly.

---

#### DIMENSION 7 — Real & Operating Enterprise (0–5 points)

Scoring logic:

  Business entity formed (LLC or Corp):                       +1
  EIN obtained:                                               +1
  Business bank account open:                                 +1
  Lease signed or property purchased:                         +1
  At least one license applied for (if required):             +1

If operational_status = "pre_start" and interview is
within 60 days: advisory triggered regardless of score.

Maximum: 5 points

---

#### DIMENSION 8 — Immigrant Intent Risk (modifier, not scored)

This dimension does not add points — it applies a risk flag and
potential score modifier based on the 214(b) risk profile.

Risk assessment:

LOW RISK (no modifier):
  - Canadian property owned
  - Canadian bank accounts maintained
  - Close family remaining in Canada
  - No prior visa issues

MODERATE RISK (-3 modifier applied to total score):
  - Canadian property sold before visa approval
  - All family moving to U.S.
  - Limited Canadian financial ties

HIGH RISK (-8 modifier + prominent advisory):
  - Canadian property sold + no Canadian accounts
  + all family moving + no Canadian family remaining
  - OR: pending U.S. immigration application disclosed

DISQUALIFYING FLAG (attorney referral triggered):
  - Prior overstay disclosed
  - Prior removal order disclosed
  - Pending adjustment of status

---

### Score Display

Total score = sum of Dimensions 1–7 (+/- Dimension 8 modifier)
Maximum possible: 100 points

Score interpretation bands:

  90–100:  ✅ EXCELLENT — "Your application is exceptionally well prepared.
            Submit with confidence."
  80–89:   ✅ STRONG — "Your application is well prepared. Review any
            flagged items before submitting."
  70–79:   ⚠️ GOOD — "Your application is solid but has areas that
            need attention. Address flagged items before submitting."
  60–69:   ⚠️ NEEDS WORK — "Your application has meaningful gaps.
            We recommend addressing all flagged items before proceeding."
  Below 60: ❌ NOT READY — "Your application has significant gaps that
            increase denial risk. Please address all flagged items.
            Consider consulting an immigration attorney."

---

### Score Dashboard UI Specification

```
┌──────────────────────────────────────────────────────────┐
│  YOUR APPLICATION READINESS ASSESSMENT                   │
│                                                          │
│  Overall Score:  82 / 100                               │
│  ████████████████░░░░  STRONG ✅                         │
│                                                          │
│  DIMENSION BREAKDOWN:                                    │
│                                                          │
│  Investment Substantiality    ████████████  22/25  ✅    │
│  Source & Path of Funds       ███████████   17/20  ✅    │
│  Non-Marginality              ████████      12/20  ⚠️    │
│  Active Direction             ████████████  13/15  ✅    │
│  Business Plan Quality        ███████        7/10  ⚠️    │
│  Investor Qualifications      █████          5/5   ✅    │
│  Real & Operating Enterprise  ████           4/5   ✅    │
│  Immigrant Intent Risk        LOW            OK    ✅    │
│                                                          │
│  2 dimensions need attention                             │
│                                                          │
│  [See Recommendations →]    [Generate Package Anyway →] │
└──────────────────────────────────────────────────────────┘
```

Each ⚠️ dimension expands to show specific, actionable recommendations
as described in each dimension's advisory language above.

---

### Score Recalculation

The score recalculates automatically whenever the user:
- Edits an answer in Module 3
- Updates a template section
- Adds a document to the checklist
- Changes the interview target date

The score history is tracked — users can see their score improve
over time as they address flagged items:

```
Score History:
  First calculated:    May 15, 2026 — 67/100  ⚠️ Needs Work
  After revision 1:    May 19, 2026 — 74/100  ⚠️ Good
  After revision 2:    May 23, 2026 — 82/100  ✅ Strong
  Current:             May 28, 2026 — 82/100  ✅ Strong
```

---

### Score Calibration (Long-Term)

As outcome data accumulates in the database (Section 7.10), the
scoring engine is calibrated quarterly against real outcomes:

Calibration query:
  "What was the average submission score for approved applications?"
  "What was the average submission score for denied applications?"
  "At what score threshold does the approval rate drop below 80%?"

Calibration output adjusts dimension weights accordingly.
After 500+ verified outcomes, published language becomes:
"Applicants who submitted with a score above 85 were approved
at a rate of [X]% based on our verified outcome database."

---

## 7.6 Interview Simulator Specification

### Purpose
The Interview Simulator prepares users for the consulate interview
by running a personalized mock session using questions generated
from their specific application data. Generic questions are not used.
Every question references the user's actual business, investment,
and personal circumstances.

---

### Simulator Architecture

The simulator operates in two modes:
- TEXT MODE: User types answers; AI evaluates written response
- VOICE MODE: User speaks answers; Whisper API transcribes;
  same AI evaluation engine assesses the transcription

Both modes use the same question bank and evaluation engine.

---

### Question Bank Generation Logic

The question bank is generated fresh for each user from their
Module 3 data. Questions are not pulled from a static library —
they are dynamically constructed using the following logic:

STEP 1 — UNIVERSAL QUESTIONS (asked of every applicant)
These 9 questions appear in every simulation regardless of
business type, investment level, or profile:

  UQ-01: "Give me an overview of your business."
  UQ-02: "How much have you invested and how were the funds allocated?"
  UQ-03: "Where did your investment funds come from?"
  UQ-04: "What is your specific role in the business?"
  UQ-05: "How many employees do you currently have, or plan to hire?"
  UQ-06: "What are your revenue projections for Year 1 and Year 3?"
  UQ-07: "Is the business currently operational?"
  UQ-08: "Why did you choose this business in this location?"
  UQ-09: "What happens to the business if your visa is not approved today?"

STEP 2 — BUSINESS-TYPE QUESTIONS (generated per category)
Questions specific to the user's business type, generated by
injecting business_category into the question template:

Senior care:
  BT-SC-01: "What license have you applied for and what is the status?"
  BT-SC-02: "How do you plan to find and retain qualified caregivers?"
  BT-SC-03: "Who is your Director of Care and what are their qualifications?"
  BT-SC-04: "How will you acquire your first clients?"
  BT-SC-05: "How do your service rates compare to competitors in [city]?"

Franchise (any):
  BT-FR-01: "What attracted you to the [franchise name] system specifically?"
  BT-FR-02: "Have you reviewed the Franchise Disclosure Document?"
  BT-FR-03: "What does the franchisor provide in terms of training and support?"
  BT-FR-04: "What are the royalty obligations under your franchise agreement?"
  BT-FR-05: "Have you spoken with existing [franchise name] franchisees?"

Commercial cleaning:
  BT-CC-01: "How will you acquire your first commercial clients?"
  BT-CC-02: "What differentiates your cleaning service from established competitors?"
  BT-CC-03: "What equipment have you purchased and what is its current location?"
  BT-CC-04: "Are your workers W-2 employees or 1099 contractors and why?"

IT consulting (with staff):
  BT-IT-01: "Who are your current or committed clients?"
  BT-IT-02: "What technology stack or services does your company specialize in?"
  BT-IT-03: "How many technical staff do you employ or plan to hire by year-end?"
  BT-IT-04: "How do your services differ from offshore providers?"

STEP 3 — INVESTMENT-SPECIFIC QUESTIONS (generated per source type)
Questions triggered by source_type in Template 1:

If property_sale:
  IS-PS-01: "You mentioned funding this investment from a property sale —
             when did that sale occur and what were the net proceeds?"
  IS-PS-02: "How long did you own that property before selling?"

If RRSP_withdrawal:
  IS-RR-01: "You withdrew funds from an RRSP — can you explain the tax
             implications you considered before making that decision?"

If gift:
  IS-GF-01: "You received funds as a gift — can you tell me about the
             source of those funds and your relationship with the donor?"

If multiple_sources:
  IS-MS-01: "Your investment came from multiple sources — can you walk
             me through the complete path of funds from each source to
             the business account?"

STEP 4 — RISK-TRIGGERED QUESTIONS (generated per risk flag)

If immigrant_intent_risk = "moderate" or "high":
  RT-II-01: "What ties do you maintain to Canada?"
  RT-II-02: "What would cause you to return to Canada?"
  RT-II-03: "Do you intend to apply for U.S. permanent residence?"

If investment_amount near threshold:
  RT-IN-01: "Can you explain why you consider this investment substantial
             relative to the total cost of the business?"

If operational_status = "pre_start":
  RT-OS-01: "The business is not yet operational — what concrete steps
             have you taken to establish it?"

If prior_visa_denial disclosed:
  RT-VD-01: "I see you had a prior visa denial — can you explain the
             circumstances and what has changed since then?"

If solo_operator risk:
  RT-SO-01: "Your business plan shows no employees in Year 1 — how will
             the business generate revenue that goes beyond supporting
             just your household?"

STEP 5 — COMMUNITY-SOURCED QUESTIONS (from outcome database)
As the outcome database grows, "surprise questions" reported by
past users are added to business-type-specific question banks.
These are flagged as [Community Reported] in the simulator UI:

  CQ-[n]: "[Question text]" — Reported by [N] applicants at
           Toronto consulate for [business type] applications.

---

### Simulation Session Flow

PRE-SESSION SETUP SCREEN:
```
YOUR INTERVIEW SIMULATION

This session is personalized to your application.
The simulated officer has read your package.

Business: [Business Name] — [Business Type]
Location: [City, State]
Investment: $[amount] USD

Session format:
  ○ Text mode (type your answers)
  ● Voice mode (speak your answers — recommended)

Estimated duration: 12–18 minutes
Questions: [N] (drawn from your personalized bank)

Tips:
• Answer as you would at the real interview window
• Keep answers clear and specific — avoid vague generalities
• The officer may interrupt with a follow-up — we simulate this
• You'll receive feedback after each answer

[Start Simulation →]
```

---

### In-Session Flow (Per Question)

Each question is displayed with:
- Question text (large, clear)
- Timer (counting up — shows how long answer takes)
- For voice mode: microphone button + live transcription display
- For text mode: text input field

After the user submits their answer:

IMMEDIATE FEEDBACK DISPLAY:
```
YOUR ANSWER:
"[Transcribed or typed answer]"

─────────────────────────────────────────

OFFICER FEEDBACK:

Strength: ⚠️ Partially addresses the question

What the officer was really asking:
This question tests whether your funds were genuinely at risk
and not held in reserve — a key E-2 requirement.

What your answer addressed: ✅ Total investment amount
What your answer missed:    ❌ Allocation breakdown
                            ❌ Confirmation funds are deployed

STRONGER ANSWER FRAMEWORK:
Lead with the total, then break it down:
"I've invested $[amount] USD, allocated as follows:
  $X to [category], $X to [category], $X to [category].
  All funds have been deployed — [amount] was wired to the
  business account on [date] and the balance was paid
  directly to [vendor/franchisor] on [date]."

KEY PRINCIPLE: Always show you know exactly where every
dollar went. Vague answers about money invite follow-up.

[Next Question →]
```

---

### Follow-Up Question Logic

After 30% of questions, the simulator may inject a follow-up
based on the previous answer — simulating an officer who
probes a vague or incomplete response:

Trigger: If answer_quality = "partial" or "weak"

Follow-up injected:
"You mentioned [phrase from user's answer] — can you be more
specific about [the aspect that was vague]?"

Example:
User answer: "I have experience in healthcare."
Follow-up: "You mentioned healthcare experience — can you
describe specifically what role you held and how that
experience prepares you to run this particular business?"

---

### End-of-Session Report

```
YOUR INTERVIEW SIMULATION RESULTS

Session date: [date]
Total time: [X] minutes [Y] seconds
Questions answered: [N] of [N]

─────────────────────────────────────────────────
QUESTION-BY-QUESTION RESULTS:

  Q1  Business overview              ✅ Strong
  Q2  Investment allocation          ⚠️ Needs work — see notes
  Q3  Source of funds                ✅ Strong
  Q4  Your role                      ✅ Strong
  Q5  Employee plan                  ⚠️ Needs work — see notes
  Q6  Revenue projections            ✅ Strong
  Q7  Operations status              ✅ Strong
  Q8  Why this business/location     ✅ Strong
  Q9  If visa denied today           ⚠️ Needs work — see notes
  [business type questions...]       ✅ / ⚠️ / ❌ per question
─────────────────────────────────────────────────
OVERALL READINESS: 8 of 11 questions at full strength

PACE ASSESSMENT:
  Average answer length: 42 seconds ✅ Good pace
  Longest answer: Q1 at 73 seconds ⚠️ Slightly long — aim for under 60s
  Filler words detected: "um" (4×), "like" (2×) — practice removing these

PRIORITY PRACTICE AREAS:
  1. Investment allocation — add specific dollar breakdown
  2. Employee plan — add hiring timeline and specific roles
  3. If denied question — strengthen Canadian ties statement

RECOMMENDATION:
  Run another simulation after addressing the 3 flagged areas.
  Target: 11/11 questions at full strength before your interview.

[Run Again →]  [View Detailed Feedback →]  [Back to Dashboard →]
```

---

### Voice Mode Technical Specification

API: OpenAI Whisper (whisper-1 model)
Input: Browser MediaRecorder API (WebM/Opus format)
Processing: Audio chunk sent to Whisper API on answer submission
Output: Transcribed text passed to evaluation engine

Additional voice analysis:
- Word count per answer (pace indicator)
- Answer duration in seconds (time management)
- Filler word detection: scan transcription for
  ["um", "uh", "like", "you know", "sort of", "kind of"]
  Count per answer; flag if > 3 in a single answer

Filler word feedback example:
"We noticed 4 filler words ('um', 'like') in this answer.
In an interview setting, filler words can undermine your
confidence and clarity. Try pausing silently instead of
using a filler — a brief pause sounds more confident than 'um'."

---

### Simulation Repetition & Improvement Tracking

Users can run unlimited simulations. The app tracks:
- Number of simulations run
- Score trend per session: [67%] → [73%] → [82%] → [91%]
- Questions consistently weak across sessions (flagged for priority focus)
- Personal best score (displayed on dashboard)

Achievement displayed when all questions score "Strong":
"🎉 Interview Ready — You've achieved full strength on all
[N] questions. Your preparation is complete."

---

### Personalization Depth — Developer Implementation Note

The key technical differentiator of this simulator vs. generic
interview apps is the question personalization. Implementation:

1. After Module 3 completion, build a user_context object:
   {
     business_name, business_type, business_route,
     investment_amount, investment_sources[], fund_path_events[],
     target_state, operational_status, employee_count_y1,
     revenue_y1, revenue_y3, household_income_need,
     investor_role, prior_denial, immigrant_intent_risk,
     canadian_property_status, ...
   }

2. For each question, inject relevant user_context fields
   into the question template string before display.

3. For the evaluation engine, pass both the question +
   user_context + user_answer to the LLM with the prompt:
   "You are a U.S. consular officer evaluating an E-2 visa
   interview answer. The applicant's profile is [context].
   The question asked was [question]. The answer given was
   [answer]. Evaluate: (1) Did the answer fully address what
   the officer needed to know? (2) What key elements were
   missing? (3) Provide a stronger answer framework using
   the applicant's specific details. Use the tone of a
   helpful coach, not a harsh critic."

4. Response is parsed and displayed in the feedback UI.

---

*End of Sections 7.5 and 7.6*
*Next: Section 7.7 — Compliance Calendar Specification*
*      Section 7.8 — Renewal Module Specification*
