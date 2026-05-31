# Quiz Question Rewrites — Final Version
# Every question reviewed and rewritten where needed
# May 31, 2026

## THE STANDARD

Every question must sound like it was asked by a
knowledgeable friend who is on your side.
Not a form. Not a government document. Not a checklist.
A conversation.

Test: read the question out loud. Does it sound like
something a real person would say? If not, rewrite it.

---

## Q0-01 — Nationality

CURRENT: "What is your citizenship status?"
OPTIONS: Four Canada-only options

PROBLEM: Canada-only. Also "citizenship status" is
bureaucratic. We just need to know their country.

REWRITE:
Question: "Which country are you a citizen of?"
Note below: "The E-2 visa is only available to
citizens of certain countries. Start typing to
see if yours qualifies."
Type: searchable_select (treaty_countries.json)
[NO CHANGE NEEDED — v3.0 already has this correct]

---

## Q0-02 — Passport

CURRENT: "Do you currently hold a valid Canadian passport?"
OPTIONS: Yes / No / I am not sure

PROBLEM: Canada-only. Should reference their country
from Q0-01 dynamically.

REWRITE:
Question: "Do you have a valid [nationality] passport?"
Options:
- Yes — it is valid
- It has expired but I am still a citizen
- No — I do not have one

---

## Q0-03 — Location

CURRENT: "Are you currently in Canada or in the
United States?"
OPTIONS: Five options including Canada-specific

PROBLEM: Canada-only framing. Also too long.

REWRITE:
Question: "Where are you living right now?"
Options:
- In my home country
- In the United States — on a valid visa
- In the United States — I am not sure of my status
- In the United States — without valid status
- In another country

---

## Q0-E2 — Prior E-2 History
[v3.0 has this correct — no change needed]

Question: "Have you applied for an E-2 Treaty
Investor visa before?"
Options:
- No — this is my first time
- Yes — I was approved and I am renewing or reapplying
- Yes — my application was denied
- Yes — my application is still pending or under review

---

## Q0-04 — Investment Stage

CURRENT: "Have you already invested funds into the
U.S. business, or are you in the process of committing
funds to it?"
OPTIONS: Four options, two starting with "Yes —"
and two with "No —"

PROBLEM: Clunky. Too long. Assumes they have a business.
Stage A users have no good answer.

REWRITE:
Question: "Where are you in the investment process?"
Options:
- I have already committed or transferred funds
  to a U.S. business
- I have a business in mind and I am getting ready
  to commit funds
- I have the funds but I have not chosen a
  business yet
- I am still figuring out the finances
- I do not have funds available right now

---

## Q0-05 — Investment Amount

CURRENT: "Approximately how much capital do you
expect to invest in the business?"

PROBLEM: "Capital" is jargon. Otherwise fine.

REWRITE:
Question: "How much are you planning to invest?"
Helper: "There is no official minimum. Most
successful applications involve $100,000 USD
or more — but what matters most is whether your
investment is substantial relative to the total
cost of the business."
Type: currency input (multi-currency)

---

## Q0-06 — Fund Documentation

CURRENT: "Can you document where your investment
funds came from and how they moved into the business?"
OPTIONS: Four options including "No — I cannot
clearly document"

PROBLEM: "Document" feels like a legal term.
"How they moved into the business" is confusing
for early-stage users who have not moved anything yet.
Also "No — I cannot clearly document" is still in
the live options but was removed from v3.0 spec.

REWRITE:
Question: "Do you know where your investment money
will come from?"
Options:
- Yes — savings, property equity, investments,
  or retirement accounts I can trace on paper
- Yes — but parts of it may be harder to document
- I have the money but I have not thought about
  the paper trail yet
- I am still working out where the funds
  will come from

---

## Q0-07 — Loan Structure

CURRENT: "Are any of your investment funds coming
from a loan?"
OPTIONS: Four options — fine structurally but
option 3 is technical jargon

PROBLEM: "A loan secured by the assets of the
business I am investing in" — most users will not
understand what this means or whether it applies.

REWRITE:
Question: "Are you planning to use any borrowed
money as part of your investment?"
Options:
- No — all my funds are from my own savings
  or assets
- Yes — a loan secured against my own property
  or personal assets
- Yes — a loan that would be backed by the
  U.S. business itself
- I am not sure how the loan would be structured
- I have not thought about this yet

Tooltip on option 3:
"If the only security for your loan is the business
you are investing in — not your personal assets —
this can affect your E-2 eligibility. We will
explain why if this applies to you."

---

## Q0-08 — Role in Business

CURRENT: "What best describes your intended role
in the business?"
OPTIONS: Four options including passive investor

PROBLEM: "Intended role" is vague. Options mix
ownership structure with day-to-day involvement.

REWRITE:
Question: "How do you picture yourself running
this business?"
Options:
- Hands on — I want to be actively involved
  every day
- As a manager — I will oversee the business
  and hire people to run daily operations
- With a partner — we will run it together
  as equal co-owners
- I am not sure yet

---

## Q0-09 — Ownership Structure

CURRENT: "Is your business arrangement one of
the following?"
OPTIONS: Five options with jargon

PROBLEM: "Is your business arrangement one of
the following?" is the worst question in the quiz.
It sounds like a legal checklist.

REWRITE:
Question: "Will you own this business on your own
or with someone else?"
Options:
- On my own
- With one equal partner — 50/50
- With more than one other person
- I have not decided yet

---

## Q0-10 — Business Selection

CURRENT (live file still has old version):
"Is the business primarily any of the following?"
with cannabis listed as an option

REWRITE (already planned in previous session):
Main question: "Have you decided on a business yet?"
Options:
- Yes — I have a specific business or franchise
  in mind
- I have a general idea but have not decided yet
- I am completely open — I have not started looking

Sub-question (if yes):
"What kind of business is it?"
Options:
- A franchise — buying into an established brand
- Buying an existing business from its owner
- Starting a new business from scratch
- A property rental or investment business
- Something else

Note: Cannabis removed from options.
Handled via informational gate after sub-question.

---

## Q0-STATE — Target State
[v3.0 already correct — no change needed]

Question: "Which U.S. state are you thinking of
for your business?"
Note: "I have not decided yet" as first option

---

## Q0-TIMELINE — Timeline
[v3.0 already correct — no change needed]

Question: "When are you hoping to submit your
visa application?"

---

## Q0-11 — Prior Visa Refusals

CURRENT: "Have you ever been refused a U.S. visa
or had a U.S. visa application denied?"

PROBLEM: Decent but "refused" and "denied" mean
the same thing — redundant. Also missing "I am not
sure" which is in v3.0 but not in the live file.

REWRITE:
Question: "Have you ever been refused a U.S. visa?"
Options:
- No — never
- Yes — once, more than 5 years ago
- Yes — once, in the last 5 years
- Yes — more than once
- I am not sure

---

## Q0-12 — Immigration Violations

CURRENT: "Have you ever been refused entry to the
United States, removed, or deported?"

PROBLEM: Good question. Just needs "I am not sure"
clarified.

REWRITE:
Question: "Have you ever been refused entry to the
U.S., deported, or asked to leave?"
Options:
- No
- Yes
- I am not sure

---

## Q0-13 — Criminal History

CURRENT: Very long question with legal language.
"convicted of, cautioned for, or charged with a
criminal offence in any country — including charges
that were dropped, withdrawn, or for which you
received a pardon"

PROBLEM: The question is technically thorough but
overwhelming as a single sentence. Reads like a
legal disclaimer, not a conversational question.

REWRITE:
Question: "Have you ever been arrested, charged,
or convicted of a crime — in any country?"
Helper text (smaller, below question):
"Include anything that was charged, even if it
was later dropped or pardoned. The DS-160 requires
full disclosure."
Options:
- No — nothing to declare
- Yes — a minor matter, more than 10 years ago
- Yes — a minor matter, in the last 10 years
- Yes — something more serious
- I am not sure

---

## Q0-NI-01 — Property Ties

CURRENT: "Do you own real estate in Canada that
you intend to keep while living in the United States?"
OPTIONS: Four options — Canada-specific

PROBLEM: Canada-specific. Also "real estate" is
slightly formal.

REWRITE:
Question: "Do you own property in [home country]?"
Dynamic: [home country] from Q0-01
Options:
- Yes — and I plan to keep it
- Yes — but I am thinking of selling before I move
- No — I do not own property there
- Not sure yet

---

## Q0-NI-02 — Family Ties

CURRENT: "Do you have immediate family members —
spouse, children, or parents — who will remain
living in Canada while you are in the United States?"

PROBLEM: Canada-specific. Also the question is fine
structurally but the parenthetical list is redundant
with the answer options.

REWRITE:
Question: "Will any close family stay behind in
[home country] when you move?"
Dynamic: [home country] from Q0-01
Options:
- Yes — family will remain there
- Some will stay, some will come with me
- No — everyone is moving with me
- I do not have close family there

---

## Q0-NI-03 — Financial Ties

CURRENT: "Will you maintain active Canadian
financial accounts, pension plans, or retirement
savings (such as an RRSP) while in the United States?"

PROBLEM: Canada-specific. RRSP is Canada-specific.

REWRITE:
Question: "Will you keep your [home country] bank
accounts and savings open after you move?"
Dynamic: [home country] from Q0-01
Options:
- Yes — I plan to keep my accounts open
- Probably — I have not decided yet
- No — I plan to close everything and move it all
- I am not sure

---

## Q0-14 — Partner Nationality

CURRENT: "Is your business partner a Canadian citizen?"

PROBLEM: Canada-specific. Should check if partner
is a citizen of a treaty country.

REWRITE:
Question: "Is your partner a citizen of a country
that qualifies for the E-2 visa?"
Helper: "Your partner does not need to be from
the same country as you — they just need to be
a citizen of any E-2 treaty country."
Options:
- Yes — they are a citizen of a treaty country
- No — they are not
- I am not sure

---

## Q0-15 — Partner Role

CURRENT: "Will your partner also be actively
developing and directing the business?"

PROBLEM: "Developing and directing" is legal
jargon from 9 FAM. Users will not know what
this means.

REWRITE:
Question: "Will your partner be actively involved
in running the business day to day?"
Options:
- Yes — they will be hands-on in the business
- No — they will be more of a silent partner
- We have not decided yet

---

## Q0-16 — Family Composition

CURRENT: "Will any family members apply as
your dependents?"

PROBLEM: "Apply as your dependents" is bureaucratic.

REWRITE:
Question: "Will anyone be moving to the U.S.
with you on this visa?"
Options:
- No — just me
- Yes — my spouse or partner
- Yes — my children
- Yes — my spouse and children
- I have not decided yet

---

## Q0-17 — Marital Status

CURRENT: "If a spouse is applying with you, are
you legally married?"

PROBLEM: Conditional framing is awkward. We already
know a spouse is involved from Q0-16.

REWRITE:
Question: "Are you and your spouse legally married?"
Options:
- Yes — we are legally married
- We are in a common-law or de facto relationship
- Not applicable

---

## Q0-18 — Dependent Passports

CURRENT: "Will every dependent applying with you
have a valid passport for visa processing?"

PROBLEM: "Dependent" is immigration jargon.

REWRITE:
Question: "Does everyone coming with you have a
valid passport?"
Options:
- Yes — everyone has a valid passport
- No — one or more passports are expired or missing
- I am not sure

---

## Q0-19 — Children Age

CURRENT: "Do any children applying with you fall
into either of these categories: 21 or older,
or married?"

PROBLEM: Clunky phrasing. Options are just Yes/No
which gives no detail.

REWRITE:
Question: "How old are the children who will be
coming with you?"
Options:
- All under 21 and unmarried
- One or more are 21 or older
- One or more are married
- One or more are close to turning 21
  (within the next 2–3 years)

---

## Q0-20 — Dependent History

CURRENT: "Does any dependent have prior U.S. visa
refusals, entry refusals, removal history, or
criminal history?"

PROBLEM: "Dependent" again. List is long and
clinical.

REWRITE:
Question: "Has your spouse or any of your children
ever had a U.S. visa refused, been denied entry,
or had any criminal matters?"
Options:
- No — nothing to declare
- Yes
- I am not sure

---

## Q0-21 — Email

CURRENT: "Where should we send your eligibility
result and next-step summary?"

This is good. Keep as-is.

---

## Q0-22 — Acknowledgment

CURRENT: Says "E2Pathway" — needs to say "e2go"

REWRITE:
"e2go is a visa preparation tool — not a law firm.
Based on your answers, your situation has some
complexity that may benefit from legal advice.

You are welcome to continue. We will flag these
areas as you go and help you build the strongest
possible application. But we want to be honest
with you: a qualified immigration attorney may
add real value to your case.

I understand this and want to continue."
