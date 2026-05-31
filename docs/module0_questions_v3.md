# Module 0 — Eligibility Quiz
## e2go.app Question Bank
## Version 3.0 | May 31, 2026 | Global — Denial-Hardened — User-Stage-Aware

---

## What Changed From v2.1

v2.1 was Canada-only and assumed the user had already made decisions
most users have not yet made. v3.0 fixes both.

Key changes:
- Q0-01: Canada-only citizenship check → global treaty country selector
- Q0-02: Canadian passport → treaty country passport
- Q0-03: Canada/U.S. location → home country / U.S. / third country
- Q0-08: Business role (assumed decided) → reframed as intent
- Q0-09: Ownership structure (assumed decided) → reframed as planning
- Q0-10: Business type (assumed decided) → reframed as exploration stage
- Q0-04: Investment status reframed to welcome early-stage users
- Q0-NI-01/02/03: Canada-specific language → home country language
- Q0-17: Canadian spouse → treaty country spouse
- NEW Q0-E2: Prior E-2 application history added
- NEW Q0-STATE: Target U.S. state added
- NEW Q0-TIMELINE: Target submission timeline added

Total questions: 26 (up from 22)

---

## Purpose

Module 0 runs before any payment is taken. It does exactly four things:

1. Determine whether the principal applicant appears eligible to proceed
2. Detect cases outside the safe scope of a self-service app
3. Route the user to the correct path (solo, partnership, family)
4. Collect data that cannot wait until Module 3

Rule: If a question does not help with eligibility, risk detection,
routing, or essential pre-population — it does not belong here.

---

## User Stage Awareness

Users arrive at this quiz at very different stages:

Stage A — Early explorer: heard about E-2, knows little, no business decided
Stage B — Researcher: knows the basics, considering options, no commitment
Stage C — Serious: has a business in mind, hasn't committed funds yet
Stage D — Ready: business selected, funds committed, ready to apply

Questions must work for ALL four stages.
Never assume Stage D. Never penalize Stage A for being early.

---

## Outcome Types

| Outcome | Meaning |
|---|---|
| PROCEED | Eligible — unlock payment and Module 1 |
| PROCEED_RISK | Eligible with flagged issue — advisory banner persists |
| ATTORNEY_RECOMMENDED | Complex or risky — acknowledgment gate before payment |
| DO_NOT_PROCEED | Clearly ineligible — no payment — attorney referral shown |

---

## Hard Stop Codes

| Code | Trigger |
|---|---|
| PR-01 | Citizen of non-treaty country — not eligible |
| PR-02 | In U.S. without valid status |
| PR-03 | No funds available and no plan to obtain them |
| PR-04 | Loan secured only by business assets |
| PR-05 | Confirmed passive investor intent |
| PR-06 | Three or more equal partners (Negative Control) |
| PR-07 | Passive real estate investment confirmed |
| PR-08 | Cannabis-related business confirmed |

---

## SECTION 1 — WHO YOU ARE
## 4 questions

---

### Q0-01 — Treaty Country Citizenship
**THE most important question. Runs before everything else.**

Question:
"Which country are you a citizen of?"

Type: searchable dropdown
Options: All countries — system checks against treaty country list

Display note below dropdown:
"The E-2 visa is available to citizens of countries that have a
qualifying treaty with the United States. Start typing your country
to see if you qualify."

Routing logic:

IF selected country IS IN treaty_countries_list:
  → PROCEED to Q0-02
  → Set nationality = [selected country]
  → Set default_consulate based on E2_Platform_Logic_Rules.md
  → If Australia: surface E-3 alternative note
  → If Iran: SPECIAL BLOCK (treaty exists but embassy closed)

IF selected country IS NOT IN treaty_countries_list:
  → DO_NOT_PROCEED (PR-01)
  → Show country-specific messaging:

  India: "India does not currently have an E-2 treaty with the
  United States. Indian nationals are not eligible for this visa.
  However, there are pathways worth knowing about — the EB-5
  Immigrant Investor Program is one option. Some investors from
  India also obtain citizenship in an E-2 treaty country (such as
  Grenada or Turkey) to become eligible. We can point you toward
  more information on both."
  OFFER: EB-5 information + citizenship-by-investment information

  China (PRC): "Mainland China does not have an E-2 treaty with
  the United States. However — if you hold Taiwan (Republic of China)
  citizenship, you are eligible. Are you a Taiwan national?"
  OFFER: Taiwan routing + EB-5 information

  Russia: "Russia does not have an E-2 treaty with the United States.
  Russian nationals are not eligible for the E-2 visa."
  OFFER: EB-5 information + alternative investor visa information

  Brazil / Nigeria / Ghana and other non-treaty:
  "[Country] does not have an E-2 treaty with the United States."
  OFFER: EB-5 information + citizenship-by-investment information

  Iran (special case — treaty exists but embassy closed):
  "Iran is technically an E-2 treaty country, however the U.S.
  Embassy in Iran is closed and E-2 visas cannot be processed for
  Iranian nationals through normal channels. As of September 2025,
  third-country processing has also been eliminated. Your most
  viable pathway is to obtain citizenship in an active E-2 treaty
  country first."
  OFFER: Citizenship-by-investment information

IF selected country = permanent resident only (user selects
"I am a permanent resident, not a citizen"):
  → ATTORNEY_RECOMMENDED
  → Message: "The E-2 visa requires citizenship in a treaty country —
    not just residency. Permanent residency in a treaty country
    generally does not qualify you for E-2. If you hold citizenship
    in another country, check whether that country has a treaty.
    An immigration attorney can review your specific situation."

Tooltip shown on question:
"This matters because the E-2 visa is only available to people
who hold citizenship — not just residency — in a country that has
a qualifying treaty with the United States. There are currently
82 qualifying countries."

---

### Q0-02 — Valid Passport

Question:
"Do you currently have a valid passport from [nationality from Q0-01]?"

Type: select
Options:
- Yes — my passport is valid
- My passport has expired but I am a citizen
- No — I do not have a passport from that country

Routing:
- Valid → proceed
- Expired → PROCEED_RISK (W-01) — continue with advisory
- No passport → PROCEED_RISK (W-01) — continue with advisory

Warning W-01:
"You will need a valid passport for your consulate interview. Make
sure to factor passport renewal into your timeline — standard
processing can take 6–10 weeks depending on your country."

Tooltip:
"A valid passport is required for the consulate interview. It
does not need to be valid right now — but it must be valid before
your interview date."

---

### Q0-03 — Current Location

Question:
"Where are you right now?"

Type: select
Options:
- In my home country [auto-fill from Q0-01 nationality]
- In the United States — on a valid visa or status
- In the United States — I am not sure about my current status
- In the United States — without valid status
- In another country outside my home country and the U.S.

Routing:
- Home country → proceed cleanly
- U.S. on valid status → proceed with COS routing note
- U.S. unsure status → ATTORNEY_RECOMMENDED (W-02)
- U.S. without status → DO_NOT_PROCEED (PR-02)
- Third country → ATTORNEY_RECOMMENDED (W-03)

Warning W-02:
"If you are in the United States and are not sure about your
current immigration status, this is something to clarify before
going further. Your status affects how you apply and where your
interview takes place."

Warning W-03:
"You are currently outside both your home country and the United
States. As of September 6, 2025, E-2 applications must be filed
at a consulate in your country of nationality or legal residence.
Third-country processing is no longer permitted. We recommend
speaking with an immigration attorney about your options."

Stop PR-02:
"If you are in the United States without valid immigration status,
this is outside the safe scope of a self-service preparation tool.
Please speak with a qualified immigration attorney before taking
any next steps."

Tooltip:
"Where you are right now affects where your visa interview will
take place and which application process applies to you."

---

### Q0-E2 — Prior E-2 Application History
**NEW in v3.0**

Question:
"Have you applied for an E-2 Treaty Investor visa before?"

Type: select
Options:
- No — this is my first time
- Yes — I was approved and I am renewing or reapplying
- Yes — my application was denied
- Yes — my application is still pending or under review

Routing:
- First time → proceed, new application flow
- Previously approved → PROCEED with renewal routing note
  Note: "Welcome back. If you are renewing an existing E-2,
  some parts of the application will be different. We will
  tailor your experience accordingly."
  Set: application_type = renewal_candidate
- Previously denied → ATTORNEY_RECOMMENDED (W-E2-DENIED)
  Warning W-E2-DENIED: "A prior E-2 denial is on your immigration
  record and the consulate officer will be aware of it. A
  reapplication needs to directly address what has changed since
  the denial. This is very manageable — but it requires specific
  framing in your cover letter and interview preparation. We flag
  this so we can prepare your documents accordingly."
  → User may still proceed after acknowledgment
- Currently pending → ATTORNEY_RECOMMENDED (W-E2-PENDING)
  Warning W-E2-PENDING: "Having an active E-2 application or
  another U.S. immigration application pending at the same time
  as a new application can complicate your case. An immigration
  attorney should advise you before you proceed."

Tooltip:
"This helps us understand your history so we can prepare the
right documents. A prior denial is not disqualifying — but it
does require specific handling."

---

## SECTION 2 — YOUR INVESTMENT
## 4 questions

---

### Q0-04 — Investment Stage

Question:
"Where are you in your investment planning?"

Type: select
Options:
- I have already transferred or committed funds to a U.S. business
- I have a specific business in mind and I am getting ready to commit
- I have funds available but I have not decided on a business yet
- I am still figuring out how much I will need and where it will come from
- I do not currently have funds available for an investment

Routing:
- Already committed → proceed — Stage D user
- Getting ready to commit → proceed — Stage C user
- Funds available, no business yet → PROCEED_RISK (W-04) — Stage B user
- Still figuring it out → PROCEED_RISK (W-04) — Stage A user
- No funds available → DO_NOT_PROCEED (PR-03)

Warning W-04:
"No problem — you do not need to have committed funds yet to use
this app. What we build here will be ready when you are. Just
know that the E-2 visa requires funds to be genuinely committed
to the business before you submit your application."

Stop PR-03:
"The E-2 visa requires that you invest real capital into a U.S.
business. If no funds are currently available, this is not the
right time to proceed through the application workflow. Come
back when you are closer to being ready — we will be here."

Tooltip:
"The E-2 requires investment funds to be committed — not just
available in a bank account. But you can start preparing your
application long before that step."

---

### Q0-05 — Investment Amount

Question:
"Roughly how much are you thinking of investing in the business?"

Type: currency input
Currency options: All major currencies — converts to USD
Placeholder: "Enter an approximate amount — estimates are fine"

Helper text below input:
"There is no fixed minimum set by law. But the investment must
be 'substantial' in relation to the total cost of the business.
Most successful applications involve $100,000 USD or more."

Routing (after USD conversion):
- $150,000+ → proceed cleanly
- $75,000–$149,999 → PROCEED_RISK (W-PROP-SOFT)
- Below $75,000 → ATTORNEY_RECOMMENDED (W-PROP-STRONG)

Warning W-PROP-SOFT:
"Your investment range is on the lower end of what consulate
officers typically see in approved applications. This does not
disqualify you — but your business type, the total cost of the
business, and the strength of your documentation will all matter
more at this level. We will flag this throughout your application
preparation."

Warning W-PROP-STRONG:
"Investments below $75,000 USD face significant scrutiny on
substantiality grounds. Cases at this level can succeed, but
they require very specific business structures and documentation.
We recommend speaking with an immigration attorney before
investing significant time in preparation."

Tooltip:
"The law does not set a specific dollar minimum. But consulate
officers assess whether your investment is 'substantial' relative
to the cost of the business you are buying into. In practice,
most approved Toronto applications involve $100,000 or more."

---

### Q0-06 — Source of Funds

Question:
"Do you have a sense of where the money for your investment
will come from?"

Type: select
Options:
- Yes — savings, property equity, retirement accounts, or
  investments I can trace on paper
- Yes — but some of it may be harder to document clearly
- I have the money but I have not thought through how to
  document where it came from
- I am still working out where the funds will come from

Routing:
- Clear documentation → proceed
- Some gaps → PROCEED_RISK (W-06)
- Have funds but no documentation plan → PROCEED_RISK (W-06)
- Still working it out → proceed (early stage — education only)

Warning W-06:
"Documenting where your funds came from is one of the most
scrutinized parts of an E-2 application. Every dollar needs
a paper trail — from its origin to the U.S. business account.
This is very achievable, but it requires planning. We will
walk you through it in detail during the application."

Tooltip:
"The consulate wants to see that your investment money came
from legitimate sources — your own savings, property equity,
investments, or a documented gift. The stronger your paper
trail, the better."

---

### Q0-07 — Loan Structure

Question:
"Are you planning to use any borrowed money as part of
your investment?"

Type: select
Options:
- No — all my investment funds are my own assets
- Yes — a personal loan or home equity loan (secured against
  my own personal assets)
- Yes — a loan that would be secured against the U.S. business
  itself (not my personal assets)
- Possibly — I am not sure how it would be structured
- I have not thought about this yet

Routing:
- No borrowed money → proceed
- Personal loan secured against personal assets → proceed with note
  Note: "Personal-asset-secured loans can count as E-2 investment
  capital because your own assets are at risk. We will document
  this properly in your Source of Funds Statement."
- Loan secured against business assets → DO_NOT_PROCEED (PR-04)
- Not sure how structured → ATTORNEY_RECOMMENDED (W-08)
- Not thought about it yet → proceed (education later in app)

Stop PR-04:
"Loans that are secured only against the business's own assets —
not your personal assets — generally do not qualify as E-2
investment capital. This is because your personal funds are not
genuinely 'at risk.' This specific structure requires legal review
before you proceed."

Warning W-08:
"How a loan is secured matters significantly for E-2 purposes.
Before committing to any financing arrangement, confirm with
an attorney whether the loan structure would qualify as at-risk
E-2 capital."

Tooltip:
"The E-2 requires that your investment is genuinely 'at risk' —
meaning if the business fails, you personally lose the money.
Loans secured only against the business itself don't meet this
standard because your personal assets aren't on the line."

---

## SECTION 3 — YOUR BUSINESS PLANS
## 3 questions (reframed for stage-awareness)

---

### Q0-08 — Role Intent

Question:
"When you picture yourself running a U.S. business,
what feels most like what you have in mind?"

Type: select
Options:
- Running it myself — I want to be actively involved day to day
- Running it with one equal partner — we would share it 50/50
- Overseeing it at a management level — I would hire people
  to handle daily operations while I provide direction
- I am not sure yet — I am still thinking about this

Routing:
- Running it myself → proceed — solo active management
- With one equal partner → proceed — partnership routing
- Overseeing at management level → ATTORNEY_RECOMMENDED (W-09)
  Warning W-09: "The E-2 visa requires the investor to 'develop
  and direct' the enterprise. This means active management
  involvement — not just ownership. A fully hands-off arrangement
  where you are never present in the business raises questions at
  the consulate. However, many investors successfully manage their
  business at an oversight level while having staff handle daily
  operations. We flag this so we can prepare your application to
  address it properly."
  → User may proceed after acknowledgment
- Not sure yet → proceed
  Note: "That is completely fine at this stage. In the next
  section, we will help you think through what kind of business
  and role suits you best."

Tooltip:
"The E-2 visa is for investors who come to the U.S. to actively
run their business — not passive investors. You do not need to
work behind a counter every day, but you do need to be genuinely
in charge of running the enterprise."

---

### Q0-09 — Partnership Plans

Question:
"Are you planning to do this on your own, or do you have
someone in mind to go into business with?"

Type: select
Options:
- On my own
- With one other person as an equal partner
- With more than one other person
- I have not decided yet

Show if Q0-08 = "Running it with one equal partner":
Pre-select "With one other person as an equal partner" and
confirm rather than re-ask.

Routing:
- On my own → solo flow
  Set: application_type = solo
- One equal partner → partnership flow
  Set: application_type = partnership
  Show note: "Two-investor 50/50 partnerships work well for
  E-2 applications. Each of you will need your own personal
  documents and your own visa. We will handle both."
- More than two → DO_NOT_PROCEED (PR-06)
  Message: "The E-2 visa works best with one investor or two
  equal partners. With three or more partners sharing equal
  ownership, the legal control structure becomes complicated
  in a specific way — each person needs to demonstrate they
  have genuine controlling interest, and that is difficult to
  show when ownership is split three or more ways. We recommend
  speaking with an immigration attorney about how to structure
  a multi-partner investment. There may be a solution — we just
  cannot safely prepare that application without legal guidance."
- Not decided yet → proceed
  Note: "We will ask about this again once you know more. It
  does not affect your eligibility check today."

Tooltip:
"This affects how your application is structured. A two-investor
50/50 partnership is a recognized structure under E-2 law. Three
or more equal partners creates a legal complexity that requires
attorney guidance."

---

### Q0-10 — Business Status and Type

Question:
"Where are you in your thinking about the business?"

Type: select
Options:
- I have a specific business or franchise selected
- I have a general direction but have not decided yet
- I am completely open — I have not started looking

BRANCH A: "I have a specific business or franchise selected"
→ Show follow-up: "Which of the following best describes it?"

Follow-up options:
- A franchise — buying into an established brand with a proven system
- Buying an existing business from its current owner
- Starting a new business from scratch
- A property investment or rental business
- A cannabis or marijuana-related business
- A business where I would not be personally involved in managing it
- Something else

Routing from follow-up:
- Franchise → proceed — Tier 1/2/3 rating shown on results page
  from E2_Franchise_Categories_Section5.md
- Buying existing business → proceed with note
  Note: "Buying an existing business can be a strong E-2 route.
  We will make sure your Source of Funds and Business Plan address
  the acquisition structure correctly."
- New business from scratch → proceed
- Property investment or rental → DO_NOT_PROCEED (PR-07)
  Message: "A passive real estate investment — holding property
  and collecting rent — does not qualify for an E-2 visa. The
  E-2 requires an active, operating business. However, an active
  property management company (where you manage properties for
  others) is a different structure and may qualify. If that is
  what you have in mind, we recommend speaking with an attorney
  about how to structure and document it correctly."
- Cannabis → DO_NOT_PROCEED (PR-08)
  Message: "Cannabis-related businesses create a conflict between
  U.S. state law and federal law. Because U.S. immigration is
  federal, businesses in this sector fall outside the scope of
  what this platform can support. We recommend speaking with an
  immigration attorney who specializes in this area."
- No personal management involvement → DO_NOT_PROCEED (PR-05)
  Message: "The E-2 visa requires you to come to the U.S. to
  develop and direct the business. An arrangement where you would
  not be personally involved in managing it does not fit the
  E-2 model. If you are thinking about a management structure
  where you oversee from a distance while staff run daily
  operations, that is a different question — see the section
  above about your role."
- Something else → proceed
  Note: "We will ask more about your business in the next section
  of the application."

BRANCH B: "General direction but haven't decided"
→ proceed
Note: "That is fine — this is one of the most common places
people are when they start. Module 2 of the application will
help you find a business that fits your background, budget,
and lifestyle. You do not need to have decided yet."

BRANCH C: "Completely open, haven't started looking"
→ proceed
Note: "You are in the right place. Many people start here.
After your eligibility check, we will walk you through how to
find the right business for your situation."

Tooltip:
"You do not need to have a business picked to use this app.
But if you do have one in mind, we want to flag early if it
raises any E-2 compatibility questions — before you invest
time building the full application."

---

## SECTION 4 — WHERE YOU ARE HEADED
## 2 questions (both new in v3.0)

---

### Q0-STATE — Target U.S. State
**NEW in v3.0**

Question:
"Which U.S. state are you thinking of for your business?"

Type: state selector — all 50 states
Also option: "I have not decided yet"

Routing:
- Specific state selected → proceed
  Internal triggers (shown on results page only):
  - Texas, Florida, Nevada, Washington, Wyoming: No state income tax — flag positively
  - California, New York: High state income tax advisory — show CPA referral note
  - State-specific licensing notes auto-populate in checklist

- "Have not decided" → proceed
  Note: "No problem. State selection affects licensing
  requirements and tax planning. When you are ready, Module 2
  will help you think through the best state for your business."

Tooltip:
"The state where your business is located affects your licensing
requirements, tax picture, and application timeline. Some states
also have specific requirements for certain types of businesses."

Why this is asked (shown to user):
"This helps us tailor your checklist, timeline guide, and
business recommendations to your specific state."

---

### Q0-TIMELINE — Target Submission Timeline
**NEW in v3.0**

Question:
"When are you hoping to submit your visa application?"

Type: select
Options:
- Within the next 3 months
- Within 3 to 6 months
- Within 6 to 12 months
- Within the next 1 to 2 years
- I am in early planning — no specific timeline yet

Routing:
- Within 3 months → PROCEED_RISK (W-TIMELINE-URGENT)
  Warning W-TIMELINE-URGENT: "A 3-month timeline is ambitious.
  Toronto consulate currently takes 4–6 weeks from submission
  to interview. Factor in business formation, fund transfer, and
  document preparation time. We will flag the most time-sensitive
  steps immediately."
- 3 to 6 months → proceed with urgency mode enabled
  Note: "A 3–6 month timeline is achievable for well-prepared
  applicants. We will help you prioritize the right steps first."
- 6 to 12 months → proceed — standard mode
- 1 to 2 years → proceed — planning mode
  Note: "You have time to do this thoroughly. We will help you
  build a strong foundation."
- Early planning → proceed — exploration mode

Internal use:
- Feeds urgency weighting in the real-world checklist
- Feeds timeline guide generation (Batch 1 document)
- Affects dashboard message framing

Tooltip:
"This helps us calibrate which steps to highlight first. Someone
submitting in 3 months needs a very different roadmap from
someone planning 18 months out."

---

## SECTION 5 — YOUR HISTORY
## 3 questions (unchanged from v2.1 — universally applicable)

---

### Q0-11 — Prior U.S. Visa Refusals

Question:
"Have you ever been refused a U.S. visa, refused entry
at a U.S. border, or had your visa revoked?"

Type: select
Options:
- No — never
- Yes — once, more than 5 years ago
- Yes — once, within the last 5 years
- Yes — more than once
- I am not sure

Routing:
- Never → proceed
- Once, more than 5 years ago → PROCEED_RISK (W-11-OLD)
- Once, within 5 years → ATTORNEY_RECOMMENDED (W-11-RECENT)
- More than once → ATTORNEY_RECOMMENDED (W-11-MULTIPLE)
- Not sure → ATTORNEY_RECOMMENDED (W-11-UNSURE)

Warning W-11-OLD:
"A single refusal more than five years ago carries less weight
than a recent one, but it must be disclosed accurately on your
DS-160 and addressed in your application. The interview simulator
will prepare you for questions about it."

Warning W-11-RECENT:
"A visa refusal within the last five years will be reviewed
by the consulate officer. It must be disclosed on your DS-160
and your cover letter should address it directly — explaining
what has changed since the refusal. Legal review is recommended."

Warning W-11-MULTIPLE:
"Multiple visa refusals require careful handling. Each refusal
is on your record and must be disclosed. A strong reapplication
needs to directly address what has changed. We recommend
attorney involvement before proceeding."

Tooltip:
"U.S. visa refusals must be disclosed on the DS-160 application
form — honesty is required. A prior refusal is not automatically
disqualifying, but it does require specific handling."

---

### Q0-12 — Immigration Violations

Question:
"Have you ever overstayed a U.S. visa, been deported or
removed from the United States, or violated the terms
of a U.S. immigration status?"

Type: select
Options:
- No
- Yes
- I am not sure

Routing:
- No → proceed
- Yes → ATTORNEY_RECOMMENDED (W-12)
- Not sure → ATTORNEY_RECOMMENDED (W-12)

Warning W-12:
"Prior immigration violations — including overstays and
deportations — are significant factors in any new visa
application. These are not automatically disqualifying for
E-2 purposes, but they require careful handling and honest
disclosure. We strongly recommend an attorney review before
proceeding."

Tooltip:
"Past immigration issues must be disclosed. An attorney can
help you understand how they affect your E-2 application
and what documentation or explanation is needed."

---

### Q0-13 — Criminal History

Question:
"Have you ever been arrested, charged, or convicted of
a crime in any country?"

Type: select
Options:
- No
- Yes — a minor matter, more than 10 years ago
- Yes — a minor matter, within the last 10 years
- Yes — something more serious (any time)
- I am not sure

Routing:
- No → proceed
- Minor, more than 10 years → PROCEED_RISK (W-13-OLD)
- Minor, within 10 years → ATTORNEY_RECOMMENDED (W-13-RECENT)
- Serious conviction → ATTORNEY_RECOMMENDED (W-13-SERIOUS)
- Not sure → ATTORNEY_RECOMMENDED (W-13-UNSURE)

Warning W-13-OLD:
"A minor matter more than 10 years ago may still need to be
disclosed on your DS-160. We will make sure your application
addresses this correctly."

Warning W-13-RECENT:
"A criminal matter within the last 10 years will be reviewed
by the consulate officer. How it is disclosed and explained
matters significantly. Attorney review is recommended."

Warning W-13-SERIOUS:
"Serious criminal matters require attorney review before
you proceed with any immigration application. This is not
something a self-service tool can safely address."

Tooltip:
"The DS-160 asks about criminal history in all countries.
Full disclosure is required — non-disclosure is treated as
misrepresentation, which is a more serious issue than
the original matter."

---

## SECTION 6 — YOUR TIES TO HOME
## 3 questions (reframed from Canada-specific to universal)

---

### Q0-NI-01 — Property in Home Country

Question:
"Do you own property in [nationality country from Q0-01]
that you intend to keep after moving to the U.S.?"

Type: select
Options:
- Yes — I own my home and plan to keep it (rent it out or maintain it)
- Yes — I own investment property I plan to keep
- I own property but I am thinking of selling it before I move
- I own property but have not decided what to do with it yet
- No — I do not own property there

Routing:
- Own and keeping it → strong tie — intent signal positive
- Own investment property keeping it → moderate tie — positive
- Planning to sell before moving → PROCEED_RISK (W-NI-01)
  Warning W-NI-01: "Selling your primary home in your home country
  before your E-2 visa is approved is one of the most common
  triggers for a 214(b) immigrant intent denial. Consulate officers
  may see it as evidence you have no intention of returning home.
  We strongly recommend waiting until after your visa is approved
  before selling. We will flag this throughout your application."
- Haven't decided → proceed — advisory shown later
- No property → neutral — other ties will need to be documented

Tooltip:
"The E-2 is a nonimmigrant visa — you must demonstrate you intend
to return home when your visa expires. Keeping your home or other
property in your home country is one of the strongest signals of
that intent."

---

### Q0-NI-02 — Family Remaining at Home

Question:
"Will any of your immediate family — parents, adult children,
or siblings — remain in [home country] when you move?"

Type: select
Options:
- Yes — close family members will remain there
- No — all my close family is moving to the U.S. with me
- I do not have immediate family there
- I am not sure yet

Routing:
- Family remaining → tie confirmed — positive signal
- All family moving → PROCEED_RISK (W-NI-02)
  Warning W-NI-02: "When all close family members move to the
  U.S. simultaneously, it can make it harder to demonstrate
  nonimmigrant intent. Your cover letter should emphasize
  other ties to your home country — financial accounts,
  professional memberships, business interests, or community
  connections."
- No immediate family → neutral — other ties noted
- Not sure → proceed

Tooltip:
"Family ties to your home country are one of the indicators
a consulate officer looks at when assessing whether you intend
to return home when your visa expires."

---

### Q0-NI-03 — Financial Ties at Home

Question:
"Do you plan to keep financial accounts — bank accounts,
retirement savings, or investment accounts — in
[home country] after you move?"

Type: select
Options:
- Yes — I plan to keep my accounts open there
- Probably — though I have not thought it through fully
- No — I was planning to close everything and move it all
- I am not sure yet

Routing:
- Keeping accounts → positive intent signal — proceed
- Probably keeping → proceed
- Planning to close everything → PROCEED_RISK (W-NI-03)
  Warning W-NI-03: "Closing all your home country financial
  accounts before your visa interview removes an important
  signal of ties to home. We strongly recommend keeping at
  least one account active with regular transactions through
  the interview process."
- Not sure → proceed

Tooltip:
"Maintaining financial accounts in your home country is a
simple and effective way to demonstrate ties and nonimmigrant
intent. Closing everything before your interview can raise
questions."

Non-immigrant intent composite logic (unchanged from v2.1):
Run after all three NI questions:
- 3 confirmed ties → intent_risk = low
- 2 confirmed ties → intent_risk = medium
- 1 confirmed tie → PROCEED_RISK (W-NI-WEAK)
- 0 confirmed ties → ATTORNEY_RECOMMENDED (W-NI-NONE)

---

## SECTION 7 — YOUR FAMILY
## 5 questions (minor updates)

---

### Q0-16 — Family Composition

Question:
"Will anyone be joining you in the U.S. as part of
your E-2 application?"

Type: select
Options:
- No — just me
- Yes — my spouse or partner only
- Yes — my children only
- Yes — my spouse/partner and children
- I have not decided yet

Routing:
- Just me → solo flow — skip family section
- Spouse only → show Q0-17, Q0-18, Q0-20
- Children only → show Q0-19, Q0-20
- Spouse and children → show Q0-17, Q0-18, Q0-19, Q0-20
- Not decided → show family section with optional framing

Note on "spouse or partner":
If user selects spouse/partner option, show sub-question:
"Is this a legally married spouse or a common-law/
de facto partner?"
- Legally married → standard spouse flow
- Common-law or de facto → ATTORNEY_RECOMMENDED (W-COMMONLAW)
  Warning W-COMMONLAW: "U.S. immigration law generally recognizes
  legal marriages for dependent visa purposes. Common-law or
  de facto partnerships may or may not be recognized depending
  on your jurisdiction and current USCIS policy. An attorney
  should confirm your partner's eligibility before you include
  them in the application."

Tooltip:
"Your spouse and unmarried children under 21 can join you
in the U.S. on E-2 dependent status. Your spouse can also
apply for work authorization once in the U.S."

---

### Q0-17 — Spouse Nationality

Show if: Q0-16 includes spouse

Question:
"Is your spouse a citizen of [nationality from Q0-01
— same treaty country as you]?"

Type: select
Options:
- Yes — same country as me
- No — they hold citizenship in a different country
- They hold dual citizenship including [home country]
- I am not sure

Routing:
- Same country → standard dependent flow — proceed
- Different country → ATTORNEY_RECOMMENDED (W-17-NATIONALITY)
  Warning W-17-NATIONALITY: "If your spouse holds a different
  nationality, their dependent E-2 status may still be available
  — dependent status derives from your E-2, not their own
  nationality. However, the consulate will assess their
  admissibility independently and any visa complications on
  their side need attention. We flag this so we can prepare
  your application accordingly."
  → User may proceed after acknowledgment
- Dual including home country → proceed
- Not sure → ATTORNEY_RECOMMENDED (W-17-NATIONALITY)

Tooltip:
"As an E-2 dependent, your spouse's visa eligibility derives
from your status — not their own nationality. But their
immigration history and background are still reviewed
independently."

---

### Q0-18 — Spouse Passport

Show if: Q0-16 includes spouse

Question:
"Does your spouse have a valid passport?"

Type: select
Options:
- Yes
- No or expired
- I am not sure

Routing:
- Yes → proceed
- No or expired → PROCEED_RISK (W-17-PASSPORT)
  Warning W-17-PASSPORT: "Your spouse will need a valid passport
  for their visa interview. Make sure to factor passport renewal
  into the timeline."
- Not sure → proceed with note

---

### Q0-19 — Children Age Check

Show if: Q0-16 includes children

Question:
"Do any of the children applying with you fall into
either of these categories?"

Type: select
Options:
- No — all my children are under 21 and unmarried
- Yes — one or more children are 21 or older
- Yes — one or more children are married
- Some are close to turning 21 — within the next 2–3 years

Routing:
- All under 21 and unmarried → proceed
- 21 or older → ATTORNEY_RECOMMENDED (W-18-OVER21)
  Warning W-18-OVER21: "E-2 dependent status is only available
  to unmarried children under 21. Children 21 or older need
  their own independent immigration status. An attorney can
  help you explore options including student visas, work visas,
  or their own E-2 application."
- Married children → ATTORNEY_RECOMMENDED (W-18-MARRIED)
- Approaching 21 → PROCEED_RISK (W-18-AGEOUT)
  Warning W-18-AGEOUT: "E-2 dependent status ends on a child's
  21st birthday. If your child will turn 21 within the next
  few years, we recommend starting to plan their independent
  pathway now. Our compliance calendar will track this deadline
  and alert you when action is needed."

Tooltip:
"E-2 dependent status is available to unmarried children under
21. The day a child turns 21, their dependent status ends —
this requires planning ahead if your child is close to that age."

---

### Q0-20 — Dependent History

Show if: Q0-16 includes any dependents

Question:
"Does your spouse or any of your children have a history
of U.S. visa refusals, removal from the U.S., or criminal
matters in any country?"

Type: select
Options:
- No — none of the above
- Yes
- I am not sure

Routing:
- No → proceed
- Yes → ATTORNEY_RECOMMENDED (W-19)
  Warning W-19: "Prior immigration or criminal history for any
  dependent is reviewed independently by the consulate. This
  can affect the dependent's visa eligibility. We flag this
  so the application can address it properly. Attorney review
  is recommended."
- Not sure → ATTORNEY_RECOMMENDED (W-19)

Tooltip:
"Each family member's application is reviewed independently.
Issues with a dependent's background can affect their visa
outcome — though not necessarily yours."

---

## SECTION 8 — CONSENT
## 2 questions

---

### Q0-21 — Email Capture

Question:
"Where should we send your eligibility result and
your personalised next-step summary?"

Type: email input
Validation: email format

Sub-option (CASL/GDPR compliant):
Checkbox: "Send me occasional updates and tips about
the E-2 process"
Note: "You can unsubscribe at any time. We do not share
your information with third parties without your consent."

Routing:
- Valid email → proceed to results
- Invalid format → inline validation error

---

### Q0-22 — Attorney Acknowledgment

Show if: outcome = ATTORNEY_RECOMMENDED AND user
chooses to continue

Question:
"Before you continue, please confirm you understand
the following."

Type: acknowledgment checkbox

Text:
"e2go is a visa preparation and document drafting tool —
not a law firm. The risk flags identified in your quiz
suggest that your case has complexities that may benefit
from attorney review.

You are welcome to continue using the app. We will flag
these areas throughout your preparation and help you
build the strongest possible application. But we want
to be honest: some situations genuinely benefit from
a qualified immigration attorney, and yours may be one.

I understand this and choose to continue."

Checkbox must be checked to proceed.

---

## SUMMARY — v3.0 Question Register

| ID | Question | Section | New/Changed |
|---|---|---|---|
| Q0-01 | Treaty country citizenship | Who you are | Changed — global |
| Q0-02 | Valid passport | Who you are | Changed — global |
| Q0-03 | Current location | Who you are | Changed — global |
| Q0-E2 | Prior E-2 history | Who you are | NEW |
| Q0-04 | Investment stage | Your investment | Changed — stage-aware |
| Q0-05 | Investment amount | Your investment | Changed — multi-currency |
| Q0-06 | Source of funds | Your investment | Changed — stage-aware |
| Q0-07 | Loan structure | Your investment | Changed — stage-aware |
| Q0-08 | Role intent | Your business | Changed — reframed |
| Q0-09 | Partnership plans | Your business | Changed — reframed |
| Q0-10 | Business status and type | Your business | Changed — reframed |
| Q0-STATE | Target U.S. state | Where you're headed | NEW |
| Q0-TIMELINE | Target submission timeline | Where you're headed | NEW |
| Q0-11 | Prior visa refusals | Your history | Unchanged |
| Q0-12 | Immigration violations | Your history | Unchanged |
| Q0-13 | Criminal history | Your history | Unchanged |
| Q0-NI-01 | Property in home country | Your ties | Changed — global |
| Q0-NI-02 | Family remaining | Your ties | Changed — global |
| Q0-NI-03 | Financial accounts | Your ties | Changed — global |
| Q0-16 | Family composition | Your family | Changed — common-law |
| Q0-17 | Spouse nationality | Your family | Changed — global |
| Q0-18 | Spouse passport | Your family | Changed — global |
| Q0-19 | Children age | Your family | Unchanged |
| Q0-20 | Dependent history | Your family | Unchanged |
| Q0-21 | Email capture | Consent | Unchanged |
| Q0-22 | Attorney acknowledgment | Consent | Unchanged |

Total: 26 questions
