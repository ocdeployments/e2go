# E2go — Session: Quiz Legal Accuracy Fixes (Session 2)
## Session file for Claude Code
**Date:** June 9, 2026
**Branch:** dev
**Estimated time:** 2–3 hours
**Depends on:** SESSION_QUIZ_FIXES.md (Session 1) should be complete first
**Status:** Ready to build

---

## BEFORE YOU START — READ IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/E2_partnerships_non_typical.md
cat docs/E2_essential_questions.md
cat docs/module0_questions.md
cat docs/module0_scoring_logic.md
cat src/app/quiz/page.tsx
```

Also read the Session 1 quiz fixes to understand what changed:
```bash
cat docs/sessions/SESSION_QUIZ_FIXES.md
```

Do not write a single line of code until all of the above are read.
Confirm reading complete before proceeding.

---

## CONTEXT — WHY THIS SESSION EXISTS

These fixes come from two research documents uploaded to the
knowledge base:
- E2_partnerships_non_typical.md — 9 FAM 402.9 on partnerships
- E2_essential_questions.md — 27 questions every E-2 case must answer

The changes in this session are LEGAL ACCURACY fixes, not UX fixes.
Several things the platform currently tells applicants are incorrect
or incomplete under 9 FAM. These must be fixed before the platform
is used by paying users.

---

## GROUND RULES

1. No rounded corners. No glassmorphism. Gold borders only on selected
   states — never blue.
2. Read DESIGN_REFERENCE.html before touching any styles.
3. Do not touch the generation engine, document pipeline, or Module 3.
4. All changes are in quiz (module0_questions.json, module0_scoring_logic.json,
   quiz/page.tsx) and the results page advisory blocks.
5. Full output on every modified file. No truncation.
6. After every change to module0_scoring_logic.json, verify the build
   still passes. Scoring changes are the most likely to break things.
7. Test at 390px and 1440px after all changes.

---

## FIX 1 — MORE THAN TWO PARTNERS: HARD STOP

### The legal issue
9 FAM 402.9 is explicit:

"An equal partnership with more than two partners would not give
any of the parties control based on ownership, as the element of
control would be too remote even under the negative control theory."

This means: three or more equal partners = no individual qualifies
as a treaty investor. They may qualify as E-2 employees but not
as the investor. This is a hard disqualifier for the investor
classification the platform is designed to produce.

### Current state
The quiz has "Yes — more than one partner" as an option with no
hard stop and no explanation.

### Fix — Add hard stop to the more-than-one-partner option

In module0_questions.json, find the business partner question
(currently Q0-14 or equivalent after Session 1 changes).

Change the "more than one partner" option to trigger a hard stop.

Hard stop screen text:
```
Title: "Three or more partners changes your E-2 classification"

Body: "Under 9 FAM 402.9, an equal partnership with more than two
partners does not give any individual investor control based on
ownership alone — the element of control is considered too remote.
This means none of you can be classified as an E-2 treaty investor
based on your ownership stake.

You have two options:

1. Restructure to a two-party structure. If the business can be
   reorganised so that only two partners each hold 50%, both can
   apply as E-2 investors. The remaining investors would need to
   reduce their ownership or exit.

2. Apply as an E-2 employee. If your company is majority-owned
   (50%+) by nationals of a treaty country collectively, and you
   hold an executive, supervisory, or essential skills role, you
   may qualify for an E-2 visa as an employee rather than as the
   investor. This is a different application type with different
   requirements.

E2go prepares E-2 investor applications. We recommend consulting
a U.S. immigration attorney to assess your options."

Button 1: "I understand — I need to restructure first"
  → Routes to attorney referral card + start over option

Button 2: "Tell me about the E-2 employee pathway"
  → Routes to advisory text about E-2 employee classification
    (see advisory text below) + attorney referral
```

E-2 employee pathway advisory text:
```
"E-2 Employee Classification

If your company is owned at least 50% by nationals of a treaty
country (collectively), and you will work in the US in an
executive, supervisory, or essential skills capacity, you may
qualify for an E-2 visa as an employee of that treaty enterprise.

Key differences from the investor classification:
— You do not need to have invested capital personally
— Your company (not you individually) must meet the treaty enterprise
   requirements
— Your role must be executive, supervisory, or involve specialized
   skills essential to the business

This classification requires a different application structure
than what E2go currently produces. We recommend an immigration
attorney for this pathway."
```

### Scoring update
In module0_scoring_logic.json, add a hard stop code for this case:
```json
{
  "stop_code": "PR-MULTI-PARTNER",
  "trigger": "more_than_two_partners",
  "message": "Three or more equal partners — no individual investor classification"
}
```

---

## FIX 2 — DIFFUSE OWNERSHIP THROUGH HOLDING COMPANIES

### The legal issue
9 FAM 402.9-4(B) requires that the 50% treaty-national ownership
test applies through any ownership chain — through holding companies,
trusts, or intermediate entities. A Canadian who owns 100% of a
Canadian holdco that owns 40% of the US business does not qualify.
The platform currently never asks about this.

### Fix — Add ownership structure question

Add a new question immediately after the ownership percentage
question (or after entity type is confirmed):

Question ID: Q0-14c
Category: BUSINESS
Question text: "Do you own your share of the US business directly,
or through a holding company, trust, or other entity?"

Helper text: "Under US immigration law, the 50% treaty-national
ownership test applies through the full ownership chain — not just
at the top level. If you own the US business through an intermediate
entity, your effective ownership percentage may be different from
what you expect."

Options:
- Directly — I own my share personally in my own name
- Through a Canadian holding company or corporation
- Through a family trust or other trust structure
- Through a combination of the above
- I am not sure

Routing:
- "Directly" → continue, no advisory needed
- "Through a holding company" → show advisory QA-14c-advisory-1:
  "Because you own through a holding company, the 50% test applies
  through the chain. Your personal ownership percentage of the US
  business equals: [your % of the holdco] × [holdco's % of the US
  business]. For example, if you own 100% of a holdco that owns 45%
  of the US business, your effective ownership is 45% — below the
  50% threshold. Your ownership documentation will need to show the
  full chain clearly."
  Then ask: "What is your effective direct ownership percentage
  of the US business, tracing through all intermediate entities?"
  Type: number (1-100)
  Validation: if below 50 AND no partnership selected → advisory
  about control through management rights (see Fix 3)
- "Through a trust" → attorney flag:
  "Trust ownership adds complexity to the treaty-national ownership
  analysis. Whether trust assets are attributed to the settlor,
  beneficiaries, or trustee depends on the trust structure. We
  recommend attorney review for trust-held E-2 investments."
- "Not sure" → advisory to confirm with their accountant or attorney
  before proceeding

### Scoring update
Add to module0_scoring_logic.json:
- Holding company → moderate complexity flag (not a hard stop,
  but generates a documentation advisory in the case brief)
- Trust → attorney flag W-TRUST-01
- Effective ownership below 50% without control rights →
  advisory to document control through management rights

---

## FIX 3 — CONTROL THROUGH MANAGEMENT RIGHTS, NOT JUST EQUITY

### The legal issue
9 FAM 402.9 explicitly states:

"Control of the enterprise may be demonstrated by ownership of at
least 50 percent of the business, by possession of operational
control through a managerial position or other corporate device,
or by other means."

This means a 40% owner with board veto rights or contractual
management control may still qualify. The platform currently treats
sub-50% ownership as a hard disqualifier without asking about
contractual control rights.

### Fix — Add control rights question

This question fires when:
- Ownership percentage is below 50%, AND
- The applicant is applying as an investor (not an employee)

Question ID: Q0-14d
Category: BUSINESS
Question text: "Even though your ownership is below 50%, do you
have documented control rights over the business?"

Helper text: "Under US immigration law, control can be demonstrated
through means other than majority ownership — including a managerial
position, board control, veto rights, or other corporate governance
rights written into your operating agreement or shareholder agreement."

Options:
- Yes — I have veto rights or board control written into the
  operating agreement
- Yes — I hold an executive or managerial title with documented
  decision-making authority
- Yes — I have special voting shares or other governance rights
- No — my control is based on ownership percentage only
- I am not sure

Routing:
- Any "Yes" → advisory:
  "Your application will need to document these control rights
  clearly in your cover letter and operating agreement. The
  consular officer will look for: a copy of the operating or
  shareholder agreement showing your specific rights, a description
  of which decisions require your approval, and evidence that these
  rights are active and enforceable — not just on paper.
  This is a stronger-than-average case to make and benefits from
  attorney review."
  Continue — not a hard stop.
- "No" → soft flag:
  "Without majority ownership or documented control rights, you
  may not meet the 'develop and direct' requirement under 9 FAM.
  Consider whether your operating agreement can be amended to
  grant you veto rights or board control before your interview."
  Attorney referral recommended but not forced.
- "Not sure" → attorney flag

### Scoring update
Add to module0_scoring_logic.json:
- Below-50% ownership with documented control rights →
  complexity flag + documentation advisory
- Below-50% ownership without control rights →
  attorney recommendation flag

---

## FIX 4 — E-VISA NATIONALITY DESIGNATION FOR MIXED OWNERSHIP

### The legal issue
9 FAM 402.9-4(B) states that if a business is owned by nationals
of different treaty countries, the business can generally have only
one E-visa nationality — and all E-2 beneficiaries from that
business must share that nationality.

Additionally: "If the nationals of a treaty country own 50 percent
of a business and together they have the ability to develop and
direct the U.S. enterprise, then E visas may be issued to the
nationals of that treaty country."

The platform currently assumes all owners are Canadian. For the
global platform serving 82 treaty countries, this is a real gap
when partners have different nationalities.

### Fix — Add E-visa nationality question for mixed partnerships

This question fires when:
- Partnership is selected, AND
- Partner B's nationality (from Q0-14 or partner profile) is
  different from Partner A's nationality

Question ID: Q0-14e
Category: BUSINESS
Question text: "You and your partner hold different nationalities.
Which country's treaty will be the basis for your E-2 application?"

Helper text: "A US business can generally have only one E-2
nationality — determined by which treaty country's nationals own
at least 50% of the enterprise. All E-2 visa holders working for
this company must share that nationality."

Options:
- [Partner A nationality] — I am the majority or equal owner
- [Partner B nationality] — my partner is the majority owner
- We have equal ownership — either nationality could work
- I am not sure — we need to decide this

Note: Populate the nationality options dynamically from Q0-01
(applicant nationality) and Q0-14 partner nationality field.

Routing:
- Partner A nationality selected → continue normally, Partner B
  note: "Your partner will apply using their [nationality] treaty
  basis. They will need to apply at their home country's consulate
  or at a consulate that accepts third-country applications."
- Equal ownership, either works → advisory:
  "Under 9 FAM, if a business is equally owned by nationals of
  two different treaty countries, E-2 visas may be issued to
  employees of either treaty country. However, you should pick
  one designation for the business and keep it consistent across
  all documents."
- Not sure → attorney flag

### Scoring update
Add to module0_scoring_logic.json:
- Mixed nationality partnership → documentation advisory flag
  (not a hard stop — generates a note in the case brief to
  address E-visa nationality clearly in the cover letter)

---

## FIX 5 — INVESTMENT TIMING: "IN THE PROCESS OF INVESTING"

### The legal issue
9 FAM 402.9-6(A) requires that the investor has "invested or
is actively in the process of investing." Being "in the process"
requires more than intent — there must be binding, irrevocable
commitment of capital. Someone who has only signed an LOI or
letter of intent but has not committed capital does not yet meet
this standard.

### Fix — Add investment commitment status question

This question fires in the quiz after the investment amount
question (Q0-05).

Question ID: Q0-05a
Category: INVESTMENT
Question text: "How committed is your investment at this point?"

Helper text: "The E-2 requires that funds be irrevocably committed
and at risk — not just planned. An officer will ask whether your
money is actually in the business, not just earmarked for it."

Options:
- Fully committed — funds are already in the US business account
  or spent on business expenses
- Substantially committed — signed contracts, escrow, or franchise
  agreement signed with deposit paid
- Partially committed — some funds committed, remainder being
  transferred
- Not yet committed — I have the funds available but not yet
  deployed
- In the planning stage — I have not yet secured the funds

Routing:
- "Fully committed" or "Substantially committed" → continue,
  no advisory
- "Partially committed" → advisory:
  "Your application will need to show a clear timeline for when
  the remaining funds will be deployed. Officers look for a
  credible plan with specific dates and committed steps, not
  just a statement of intent. Your source-of-funds narrative
  must explain the remaining transfer timeline."
- "Not yet committed" → advisory:
  "Under 9 FAM 402.9-6(A), the 'in the process of investing'
  standard requires binding, irrevocable commitment of capital —
  not just availability of funds. Before your interview, you will
  need to have: signed business agreements, an executed franchise
  agreement with deposit, a lease, or other binding commitments
  that place the funds at risk. We recommend having at least 50%
  of the investment deployed before applying."
  Risk flag: moderate — not a hard stop, but documents this as
  a preparation gap
- "In the planning stage" → stronger advisory:
  "You are not yet in the process of investing under US
  immigration law. Before applying, you need binding commitments
  that put capital at risk. We recommend waiting until you have
  signed contracts and committed funds before beginning your
  application."
  Risk flag: high — suggest waiting to apply

### Scoring update
Add to module0_scoring_logic.json:
- "Not yet committed" → high documentation risk flag
- "In the planning stage" → advisory to delay application
  (not a hard stop — some applicants at this stage still benefit
  from preparation)

---

## FIX 6 — OFFICER DISCRETION ADVISORY

### The legal issue
9 FAM 402.9-6(B) explicitly grants consular officers discretion
to request additional documents beyond standard checklists:
"Officers may request additional documentation as needed."
This is one of the most common sources of surprise for applicants —
they prepared exactly what was asked and then get a 221(g) request
for more.

### Fix — Add advisory in results page and in Section 3 (Your Investment)

**Results page advisory:**
Add an advisory block in the results page, within the timeline
section or immediately after the document checklist overview:

```
Advisory title: "Officers can request additional documents"
Advisory body: "Consular officers have discretion under 9 FAM to
request additional documentation beyond what is listed in standard
checklists. The most common additional requests are:
— Bank statements extending beyond 12 months
— Tax returns for years not initially requested
— Third-party business valuations
— Additional evidence of operational status
— Further source-of-funds documentation

The best defense against a 221(g) request is preparation depth —
having documents ready that weren't specifically asked for. Your
case file will note where additional preparation is recommended
based on your profile."
```

**Module 3 Section 3 (Your Investment) advisory:**
In src/app/apply/investment/page.tsx, add an AdvisoryBlock
at the end of the "paper trail" cluster:

```
"Consular officers have discretion to request additional
source-of-funds documentation beyond what is listed here.
Common additional requests include: extended bank history
(24–36 months), tax returns for all years the funds were
accumulating, and for large transfers, a CPA letter certifying
the legitimacy of the source. Consider assembling this
documentation proactively rather than waiting for a 221(g)."
```

---

## FIX 7 — SHELL COMPANY / PASSIVE INVESTMENT ADVISORY

### The legal issue
9 FAM 402.9-6(C) requires a "real and operating commercial
enterprise." Undeveloped land, stock portfolios, and other
passive investment vehicles are explicitly excluded.
9 FAM: "E-2 investor status must not, therefore, be extended
to non-profit organizations" and passive investment structures.

The quiz currently has no question that screens for this.

### Fix — Add real enterprise confirmation question

Add a question in the quiz near the business type section:

Question ID: Q0-09a
Category: BUSINESS
Question text: "Is your US business an active, operating commercial
enterprise?"

Helper text: "The E-2 requires a real, active, for-profit business
— not a passive investment. Some structures do not qualify."

Options:
- Yes — it is an active business selling goods or services
- It is a real estate investment or property holding
- It is a stock portfolio or financial investment
- It is a non-profit or charitable organization
- I am not sure of the structure

Routing:
- "Active business" → continue
- "Real estate" → advisory + soft flag:
  "Pure real estate investment — undeveloped land or properties
  held for appreciation — does not meet the 'real and operating
  enterprise' requirement under 9 FAM 402.9-6(C). However, an
  active real estate business (property management, development
  company, hospitality) may qualify if you can demonstrate
  real operations, employees, and non-marginality. Can you
  confirm that your real estate investment involves active
  operations rather than passive holding?"
  Follow-up: "Does your real estate business involve active
  operations — such as property management, renovation, or
  short-term rentals with staff?" Yes / No
  If No → hard stop: "A purely passive real estate investment
  does not qualify for E-2. The enterprise must be real and
  operating, not just a holding vehicle."
  If Yes → continue with advisory that documentation of
  operations is essential.
- "Stock portfolio" → hard stop:
  "A stock portfolio or financial investment account does not
  qualify for an E-2 visa. The E-2 requires a real and operating
  commercial enterprise — an active business, not a passive
  investment vehicle. Please consult an immigration attorney
  if you believe your situation may qualify under a different
  category."
- "Non-profit" → hard stop:
  "Non-profit organizations are explicitly excluded from E-2
  investor classification under 9 FAM 402.9-6(C). The E-2
  requires a for-profit commercial enterprise."
- "Not sure" → advisory to confirm structure with an attorney
  before proceeding

### Scoring update
Add to module0_scoring_logic.json:
- Real estate passive → hard stop PR-PASSIVE-INVEST
- Stock portfolio → hard stop PR-PASSIVE-INVEST
- Non-profit → hard stop PR-NONPROFIT
- Real estate active → documentation advisory flag

---

## QUESTION INSERTION ORDER

After Session 1 changes, verify the current question sequence
before inserting. The new questions slot in as follows:

```bash
grep -n "\"id\":" src/app/quiz/page.tsx | head -40
# or
grep -n "question_id\|\"id\":" docs/module0_questions.md | head -40
```

Target insertion points:
- Q0-09a (real enterprise check) → after business type question,
  before investment amount
- Q0-05a (investment commitment) → immediately after investment
  amount question Q0-05
- Q0-14c (ownership structure) → after ownership percentage,
  after Session 1 partnership questions
- Q0-14d (control rights) → immediately after Q0-14c if below 50%
- Q0-14e (E-visa nationality) → after partner nationality confirmed,
  fires only for mixed-nationality partnerships
- Hard stop update to existing more-than-two-partners option →
  in the existing business partner question

---

## IMPORTANT: DO NOT BREAK EXISTING SCORING

The module0_scoring_logic.json changes are additive only.
Do not remove or modify any existing scoring entries.
Only ADD new entries for the new question IDs above.

After every change to the scoring file:
```bash
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed" | head -20
```

Fix any TypeScript errors before proceeding to the next fix.

---

## ALSO FIX — DS-156E REFERENCE

The essential questions document references DS-156E as required
at some consulates. Check whether the document checklist
(Tab B / apply/checklist) mentions DS-156E.

```bash
grep -rn "156E\|DS-156" src/ docs/ | head -10
```

If not present: add "DS-156E (required at some consulates —
check your specific post's requirements)" to the document
checklist with a note that Toronto does not require it but
other posts may.

---

## PLAYWRIGHT VERIFICATION

After all fixes:

```bash
pkill -f "next dev" || true && sleep 2 && rm -rf .next && npm run dev &
sleep 15
```

```
Use Playwright to verify:

1. Navigate to quiz business partner question.
   Select "more than one partner".
   Confirm: hard stop screen appears with two-option routing.
   Screenshot.

2. Navigate to quiz business type / investment section.
   Select "Stock portfolio" for business structure.
   Confirm: hard stop fires immediately.
   Screenshot.

3. Select "Not yet committed" for investment timing.
   Confirm: risk advisory appears, quiz continues (not a hard stop).
   Screenshot.

4. Navigate through partnership questions with two different
   nationalities set.
   Confirm: E-visa nationality question fires.
   Screenshot.

5. Navigate to results page.
   Confirm: officer discretion advisory block is present.
   Screenshot at 390px and 1440px.

6. Navigate to localhost:3000/apply/investment.
   Confirm: officer discretion advisory block appears at end of
   paper trail cluster.
   Screenshot.
```

---

## COMMITS

One commit per fix:
- `fix: quiz — hard stop for more than two partners (9 FAM)`
- `fix: quiz — holding company ownership chain question`
- `fix: quiz — control through management rights below 50%`
- `fix: quiz — E-visa nationality for mixed-nationality partnerships`
- `fix: quiz — investment commitment timing question`
- `fix: quiz — passive investment and non-profit hard stops`
- `fix: results + investment — officer discretion advisory`
- `fix: checklist — DS-156E reference added if missing`

---

## ON COMPLETION

Update BUILD_TRACKER.md:
- Quiz legal accuracy fixes (Session 2): ✅ COMPLETE
- Note all new hard stop codes added to scoring logic
- Note all new question IDs added to module0_questions.json

Run: npm run build — must compile clean with zero errors.

Write a brief note in the build summary listing:
1. Which hard stops are new (PR-MULTI-PARTNER, PR-PASSIVE-INVEST,
   PR-NONPROFIT)
2. Which questions are new (Q0-05a, Q0-09a, Q0-14c, Q0-14d, Q0-14e)
3. Any edge cases discovered during build that need follow-up

These changes affect legal accuracy and should be reviewed
against the knowledge base files before the platform goes live
with paying users.
