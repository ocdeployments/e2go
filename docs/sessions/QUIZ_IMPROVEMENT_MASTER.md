# E2go — Quiz Improvement Master Document
**Created:** June 10, 2026
**Purpose:** Single source of truth. Everything decided about the quiz,
  what is broken, what is missing, what needs to be built.
  Read this before touching any quiz file. Update it after every session.

---

## SECTION 1 — WHERE WE ARE

### The Platform
E2go is a self-service E-2 visa preparation platform. The quiz is
the entry point. Its purpose is to:
1. Determine whether the applicant can proceed
2. Collect data that feeds the document generation engine
3. Convert qualified applicants into paying members

The quiz is not just an eligibility check. Every answer it collects
must either gate eligibility OR feed a specific document field.
If it does neither, it should not exist.

### What Has Been Built (as of June 10, 2026)
- Quiz v6.0: 18 questions, rebuilt twice, all 30 combinatorial bugs fixed
- Scoring engine: hard stops, attorney flags, risk flags wired
- Results page: score/100, flags, timeline, pricing pre-calc
- Auth: login, signup, email verification
- Case file: 6 sections, two-panel layout, voice input, data wired
- Document generation: 15-step pipeline, all documents
- Interview simulator: Groq TTS + transcription, complete
- Stripe: all 10 Price IDs live at confirmed pricing

### What Was Fixed Today (June 10, 2026)
- Case file UX redesign: complete (commits a9dfcb9–9172b2c)
- Voice input: mic permission bug fixed (commit 1f4e623)
- Permissions-Policy header: microphone=(self) (commit 7087f10)
- Case file 500 errors: resolved (stale cache, all pages 200)
- Session 1 (commit 400d1dc): score/flags contradiction, Q0-06 replaced,
  Q0-NI consolidated, auth (magic link removed, name at signup, email
  verification), results personalisation + email button, stale draft fix,
  post-login routing, navbar auth state, franchise referral tracking,
  section visit tracking, Q0-05/Q0-09/Q0-10 reworded

### What Is Still Broken (confirmed by manual walkthrough)
In rough priority order:
1. ~~Quiz score/flags contradiction — 100/100 with complexity warnings~~ ✅ FIXED (commit 400d1dc)
2. ~~Q0-06 wrong question — generates false risk flags~~ ✅ FIXED (commit 400d1dc)
3. ~~Q0-NI-01/02/03 — three questions doing one job~~ ✅ FIXED — consolidated into Q0-10 multiselect (commit 400d1dc)
4. ~~Auth: magic link present, no first/last name at signup~~ ✅ FIXED (commit 400d1dc)
5. ~~Results page: no personalisation, email button broken~~ ✅ FIXED (commit 400d1dc)
6. ~~Stale localStorage draft contaminating results~~ ✅ FIXED — 24hr expiry (commit 400d1dc)
7. No singular next action on results page
8. ~~Post-login routing ignores application state~~ ✅ FIXED — smart routing by state (commit 400d1dc)
9. ~~Navbar shows no auth state when logged in~~ ✅ FIXED — "Hi, [first_name]" (commit 400d1dc)
10. Migration 004 not applied to Supabase

### What Is Missing (never built)
1. ~~Business type question (most important missing question)~~ ✅ FIXED — Q0-business-type added (Session 2, June 11)
2. ~~Total business cost question (proportionality calculation)~~ ✅ FIXED — Q0-business-cost added with proportionality scoring (Session 2, June 11)
3. ~~Readiness stage question (post-quiz routing)~~ ✅ FIXED — Q0-readiness added, wired to quiz_sessions.readiness_stage (Session 2, June 11)
4. ~~Target date question (timeline personalisation)~~ ✅ FIXED — Q0-target-date added, wired to working_target_date + results page timeline (Session 2, June 11)
5. ~~Franchise contact sub-question (referral lead capture)~~ ✅ FIXED — Q0-08c + Q0-08d added, admin email via Resend (Session 2, June 11)
6. Q0-01 dual citizenship sub-question
7. Q0-09 ownership % sub-question for not-50/50 path
8. Q0-17 common-law relationship option
9. Hard stop educational content (fixability + attorney action)
10. Section context sentences (quiz orientation)
11. Save-and-return visible indicator
12. Results page singular contextual CTA

---

## SECTION 2 — THE DENIAL FRAMEWORK
## Every question maps to this or it doesn't exist

| Code | Denial Category | Frequency |
|---|---|---|
| D-01 | Investment not substantial for business type | Most common |
| D-02 | Funds idle — not actually at risk | Very common |
| D-03 | Source of funds paper trail gaps | Very common |
| D-04 | Business marginal — income only for investor | Very common |
| D-05 | Business plan generic or inconsistent | Common |
| D-06 | Revenue projections inflated | Common |
| D-07 | No credible hiring plan | Common |
| D-08 | Applicant cannot answer questions at interview | Significant |
| D-09 | Interview inconsistent with documents | Significant |
| D-10 | Shell company / no real operations | Common |
| D-11 | Passive investment / no active management | Hard denial |
| D-12 | Loan secured by business assets | Hard denial |
| D-13 | Ownership/control structure not documented | Common |
| D-14 | Business type does not qualify | Common |
| D-15 | 214(b) — not convinced applicant will return | Moderate |

---

## SECTION 3 — EVERY QUIZ QUESTION: STATUS AND DECISION

### Questions to keep as-is
| Question | Why |
|---|---|
| Q0-04 Investment committed | Correct — "in process" standard, hard stop accurate |
| Q0-07 Loan structure | Correct — hard stop on business-secured loan is law |
| Q0-11 Prior visa refusal | Well written — tiered severity, specific warnings |
| Q0-12 Prior removal | Correct — attorney flag appropriate |
| Q0-13 Criminal history | Well written — tiered, 9 FAM citations precise |
| Q0-16 Family dependents | Fine — "not sure" acceptable here |
| Q0-18 Dependents passports | Correct |
| Q0-19 Children age/status | Correct — 21 cutoff enforced |
| Q0-20 Dependent admissibility | Correct |
| Q0-22 Acknowledgment gate | Correct structure — needs strengthening (see below) |

### Questions to fix
| Question | Problem | Fix |
|---|---|---|
| Q0-01 | Dual Canadian/American edge case unhandled | Add sub-question for dual citizens — US citizenship = hard stop, other treaty country = continue |
| Q0-02 | Wrong stage — passport is not an eligibility gate | Remove. Move to results page advisory and checklist |
| Q0-03 | Doing two jobs: COS routing + status problem | Split into two: Q0-03a (where applying) + Q0-03b (COS status, only if COS selected) |
| Q0-06 | Wrong question — asks paper trail quality not source type | Replace entirely with fund source type multiselect (see spec below) |
| Q0-08 | "equal" in role question conflates role + ownership; "not sure" too weak | Remove "equal" from option 2; upgrade "not sure" to attorney advisory |
| Q0-09 | "not 50/50" path has no ownership % follow-up | Add sub-question: what % do you own? Under 50% = attorney flag |
| Q0-14/Q0-15 | Only fire for 50/50 path — gap for not-50/50 | Update show_if to include "not 50/50" trigger |
| Q0-17 | No common-law option | Add "We are in a common-law relationship" → attorney flag with advisory |
| Q0-21 | Fires for logged-in users who already have email | Add show_if: only show when not authenticated |
| Q0-22 | Checkbox clicked in 2 seconds — no genuine friction | Require typed "I understand"; list specific flags being acknowledged; timestamp the record |
| Q0-NI-01/02/03 | Three questions doing one job — quiz fatigue | Collapse into one multiselect (see spec below) |

### Questions to remove entirely
| Question | Why |
|---|---|
| Q0-02 | Not an eligibility gate — move to checklist advisory |

### Questions to add
| New Question | Purpose | Downstream use |
|---|---|---|
| Q0-readiness | "Where are you in your E-2 journey?" | Routes post-quiz CTA, email sequences, dashboard |
| Q0-target-date | "When are you hoping to move?" | Timeline personalisation, compliance calendar anchor |
| Q0-business-type | "What best describes the business?" | Checklist, business plan structure, proportionality |
| Q0-business-cost | "What is the total cost of the business?" | Proportionality calculation, D-01 prevention |
| Q0-08c/d | Franchise contact sub-question | Referral lead capture, admin notification |

---

## SECTION 4 — EXACT SPECIFICATIONS FOR NEW AND CHANGED QUESTIONS

### Q0-06 REPLACEMENT — Fund Source Type
**Question text:** "What is the primary source of your investment funds?"
**Type:** multiselect
**Options:**
- Personal savings or investments (bank or brokerage accounts)
- Sale of a property or business
- Registered accounts (RRSP, TFSA, LIRA, or pension)
- Gift or inheritance
- Loan secured by personal assets
- Multiple sources combined
**Downstream:** Each option maps to Tab H (Source of Funds) document requirements:
  Personal savings → bank statements
  Property/business sale → closing documents + proceeds trail
  Registered accounts → withdrawal statements + tax implications note
  Gift/inheritance → gift letter + donor source evidence
  Loan → loan agreement + collateral documentation
  Multiple → all of the above for each source
**Scoring:** No hard stops. Fund source is informational at quiz stage.
  Risk flag if "Gift or inheritance" selected without "Multiple" —
  gifts require additional documentation that applicants often underestimate.
**Note:** Paper trail quality belongs in Module 3 Your Investment — not here.

---

### Q0-NI REPLACEMENT — Home Ties Consolidated
**Question text:** "What ties will you maintain in your home country?"
**Type:** multiselect
**Options:**
- Property I own and plan to keep
- Close family remaining in Canada (spouse, children, or parents)
- Active financial obligations (business, investments, pension, or RRSP)
- Professional licence, employment, or ongoing contract
- None of the above
**Scoring (preserve existing composite logic):**
  2 or more ties confirmed → proceed cleanly
  1 tie confirmed → risk flag W-NI-WEAK
  "None of the above" selected alone → attorney flag W-NI-NONE
  Each confirmed tie → +5 points on score (non-immigrant intent positive)
**Downstream:** Feeds Tab C (Non-Immigrant Intent) and cover letter
  closing paragraph.
**Replaces:** Q0-NI-01, Q0-NI-02, Q0-NI-03 — all three removed.

---

### Q0-readiness — Journey Stage
**Question text:** "Where are you in your E-2 journey?"
**Type:** single select
**Options:**
- I have made the decision — I am ready to apply
- I am seriously researching and getting close
- I am exploring whether this is right for me
**Scoring:** No eligibility impact. Routing signal only.
**Downstream:**
  Ready to apply → post-results CTA pushes to pricing
  Researching → post-results CTA emphasises preparation timeline
  Exploring → post-results CTA offers email nurture, softer pricing
  All three → email sequence routing in Resend

---

### Q0-target-date — Move Timeline
**Question text:** "When are you hoping to be living in the United States?"
**Type:** single select
**Options:**
- Within 6 months
- 6 to 12 months
- 12 to 24 months
- Not sure yet
**Scoring:**
  Within 6 months + no paid yet → advisory: "This is an ambitious timeline.
  Starting immediately gives you the best chance of meeting it."
  Not sure yet → neutral, no flag
**Downstream:**
  Sets working_target_date on application record
  Results page uses this for personalised timeline math:
  "To be in the US by [month year], you need to submit by [month year]."
  Compliance calendar uses this as working anchor until confirmed interview
  date is entered.

---

### Q0-business-type — Business Category
**Question text:** "What best describes the business you are investing in?"
**Type:** single select
**Options:**
- Service business (consulting, staffing, cleaning, or similar)
- Franchise (an established brand and system)
- Retail (physical store or e-commerce)
- Food and beverage (restaurant, café, or catering)
- Healthcare or senior care
- Real estate (with active development or management)
- I have not identified a specific business yet
- Other
**Scoring:**
  All options except "not identified yet" → proceed
  "Not identified yet" → risk flag with advisory: business must be
  identified before application can be filed; preparation can begin now
**Downstream:**
  Feeds: document checklist (franchise = FDD required, etc.)
  Feeds: business plan structure in Your Business section
  Feeds: proportionality calculation (franchise vs. service cost ranges)
  Feeds: Module 3 pre-population of business type field
  Franchise selected → triggers Q0-08c (franchise contact sub-question)

---

### Q0-business-cost — Total Business Cost
**Question text:** "What is the approximate total cost to start or acquire
  this business — including purchase price, startup costs, and working capital?"
**Type:** currency (CAD/USD toggle, same as Q0-05)
**Scoring:**
  Calculate investment % of total cost using Q0-05 answer:
  investment_pct = Q0-05 / Q0-business-cost
  >= 50%: no flag
  30–49%: risk flag W-PROP-SOFT with advisory
  < 30%: attorney flag — officer will scrutinise substantiality
  If "not identified yet" on Q0-business-type: skip this question
**Downstream:**
  Feeds: substantiality argument in cover letter
  Feeds: proportionality score in analysis engine
  Feeds: Tab F (Investment Proof) opening statement

---

### Q0-08c/d — Franchise Contact Sub-Question
**Trigger:** Q0-business-type = "Franchise"
**Q0-08c question text:** "Have you made contact with the franchisor yet?"
**Type:** single select
**Options:**
- Yes — I have been in contact and have information
- No — I know which franchise I want but have not reached out
- I am still deciding which franchise

If "No — I know which franchise but have not reached out":
**Q0-08d question text:** "Would you like us to connect you with
  this franchisor on your behalf?"
**Options:**
- Yes, please connect me
- No, I will reach out myself

If "Yes please connect me":
  Set franchise_referral_requested = true on quiz_sessions record
  Fire API route: POST /api/notifications/franchise-referral
  Send admin notification email via Resend to ADMIN_EMAIL env var
  Subject: "New franchise referral request — [date]"
  Body: session ID, user email (if available), date

---

### Hard Stop Educational Content
Each hard stop must include:
1. Why this is a legal problem — precise, one paragraph
2. Whether it is fixable — honest, specific
3. What an attorney would do — not just "consult an attorney"

**PR-01 — Not a Canadian citizen:**
"The E-2 Treaty Investor visa is available only to citizens of countries
that have a treaty of commerce and navigation with the United States.
Permanent residents do not qualify — treaty nationality requires
citizenship, not residency.
This is not fixable through the E-2 pathway. If you are a citizen of
another treaty country, you may qualify through that nationality.
An immigration attorney can advise on which treaty countries offer the
strongest E-2 pathway for your situation."

**PR-02 — In US without valid status:**
"Filing any immigration application while in the United States without
valid status creates significant legal risk. It can trigger bars to
re-entry and complicate any future application.
This may be fixable: if you can depart the United States and apply at
a Canadian consulate, the status issue does not attach to a consular
application. An immigration attorney must assess your specific situation
before any filing or departure."

**PR-03 — No funds available:**
"The E-2 requires that funds be committed — already invested or actively
in the process of being committed — at the time of application. An
applicant with no funds available cannot meet this requirement.
This is fixable once funds are secured and committed to a specific
business. An attorney can advise on the irrevocability requirement
and how to document the commitment correctly."

**PR-04 — Loan secured by business assets:**
"Under 9 FAM 402.9-6(B)(2), investment funds borrowed against the
assets of the business being purchased do not qualify as capital 'at
risk.' The loan must be secured by assets the investor already owns
— property, savings, other holdings — not by the business itself.
This is fixable: restructuring the loan to be secured by personal
assets removes this hard stop. An attorney can advise on how to
document the restructuring to satisfy the at-risk requirement."

**PR-05 — Passive investor role:**
"The E-2 requires that the investor 'develop and direct' the enterprise.
A passive investor — one who provides capital but does not manage the
business — does not meet this requirement. This is a hard legal standard,
not a preference.
This may be fixable if your actual role is more active than you described.
Review whether you intend to manage operations, make hiring decisions,
and direct business strategy. If so, an attorney can help you frame
your role correctly."

**PR-06 — More than two equal owners:**
"Under 9 FAM 402.9-4(B), in a multi-investor enterprise, each investor
applies separately and must independently satisfy all E-2 requirements.
Structures with more than two equal owners become difficult to sustain
because each investor must demonstrate substantial investment on their
own — the combined investment cannot be pooled.
This may be fixable through restructuring: reducing to two investors,
or restructuring so one investor clearly controls and the others are
minority stakeholders applying as E-2 employees. An attorney is needed
to advise on which restructuring approach fits your situation."

**PR-07 — Passive real estate:**
"A business that consists primarily of passive real estate holding
or rental income does not qualify under the E-2. The visa requires
an active, operating enterprise — not an investment vehicle.
This may be fixable if the business involves active real estate
development, property management services, or construction. An
attorney can assess whether your specific business model qualifies."

**PR-08 — Cannabis-related:**
"Cannabis businesses are federally illegal in the United States.
Because E-2 applications are processed under federal law, a business
in the cannabis industry cannot qualify regardless of state law.
This is not fixable within the E-2 framework."

**PR-09 — No active management role:**
"The E-2 requires the investor to actively develop and direct the
enterprise. A business where the investor has no management role
cannot qualify — the investor must be the operational principal.
Review whether your intended structure can accommodate an active
management role for you. An attorney can advise."

---

## SECTION 5 — THE QUIZ STRUCTURE (TARGET STATE)

### Question Sequence — Trust-First Emotional Arc
The current sequence follows legal logic. The target sequence follows
human logic: confirm eligibility early, build context in the middle,
handle sensitive history at the end.

**Phase 1 — Direction (3 questions)**
Section heading: "Let's understand where you are."
Q0-01: Citizenship
Q0-readiness: Where in journey
Q0-target-date: When hoping to move

**Phase 2 — Investment (4 questions)**
Section heading: "The E-2 requires real capital committed to a real
business. These questions establish that."
Q0-04: Investment committed
Q0-05: Investment amount
Q0-business-cost: Total business cost
Q0-06 replacement: Fund source type

**Phase 3 — Business (4 questions)**
Section heading: "Your business and your role in it."
Q0-business-type: Business category
Q0-10: Business type disqualifiers (passive/cannabis/no management)
Q0-08: Business role
Q0-09: Business structure/ownership

**Phase 4 — Application path (2 questions)**
Section heading: "Where you apply affects the entire process."
Q0-03a: Where applying (Canada/COS/other)
Q0-07: Loan structure

**Phase 5 — Family (3 questions)**
Section heading: "If family members will apply with you."
Q0-16: Family dependents
Q0-17: Legally married (+ common-law option)
Q0-18/19/20: Dependent screening (shown as needed)

**Phase 6 — Risk (3 questions)**
Section heading: "We are required to ask about immigration history.
Most people have nothing to disclose."
Q0-11: Prior visa refusal
Q0-12: Prior removal
Q0-13: Criminal history

**Phase 7 — Ties (1 question)**
Section heading: "Non-immigrant intent — the officer's final concern."
Q0-NI consolidated: Home ties multiselect

**Phase 8 — Consent**
Q0-21: Email (anonymous users only)
Q0-22: Acknowledgment gate (if attorney-recommended)

### Questions Removed from Sequence
Q0-02 (passport) → moved to results page advisory + checklist

### Conditional questions fire within their phase:
Q0-03b: COS status (fires within Phase 4 if COS selected)
Q0-08c/d: Franchise contact (fires within Phase 3 if franchise selected)
Q0-09 sub: Ownership % (fires within Phase 3 if not-50/50 selected)
Q0-01 sub: Dual citizenship (fires within Phase 1 if dual selected)
Q0-14/Q0-15: Partner screening (fires within Phase 3 if partnership)

---

## SECTION 6 — DOWNSTREAM MAPPING
## Every quiz answer and where it goes

| Quiz Answer | Feeds |
|---|---|
| Q0-01 citizenship | Tab A pre-fill, cover letter nationality paragraph |
| Q0-readiness | Email sequence routing, post-results CTA behaviour |
| Q0-target-date | working_target_date on applications, results timeline |
| Q0-04 investment committed | Tab F, Source of Funds opening |
| Q0-05 investment amount | Tab F, proportionality calculation |
| Q0-business-cost | Proportionality calculation, Tab F substantiality |
| Q0-06 fund source type | Tab H document requirements checklist |
| Q0-business-type | Checklist, business plan structure, Module 3 pre-pop |
| Q0-08 business role | Cover letter role paragraph, Tab J qualifications |
| Q0-09 ownership structure | Tab C ownership, partnership routing |
| Q0-03a application path | Consular vs. COS routing, checklist |
| Q0-07 loan | Tab H loan documentation flag |
| Q0-16 family | Pricing tier, Tab L, DS-160 family section |
| Q0-17 married | Tab L spouse section, marriage certificate checklist |
| Q0-11/12/13 history | DS-160 pre-fill, cover letter disclosure paragraph |
| Q0-NI consolidated | Tab C non-immigrant intent, cover letter closing |
| Q0-08c/d franchise | Referral lead capture, admin notification |

---

## SECTION 7 — SCORING ENGINE (TARGET STATE)

### Score Calculation
Base score: 100
Each attorney_flag: −10 points
Each risk_flag: −5 points
Each confirmed home tie (Q0-NI): +5 points
Minimum score: 45

### Proportionality Adjustment (new)
If investment % of total business cost < 30%: −15 points
If investment % 30–49%: −5 points
If investment % ≥ 50%: no deduction

### Score → Verdict Mapping (consistent — no contradictions)
90–100: "Strong eligibility profile"
  Verdict: "Your answers indicate a straightforward E-2 path."
  Show: no complexity warning, no attorney flag
  CTA: "Start your application" → /pricing

75–89: "Good eligibility profile"
  Verdict: "Your profile is solid with one or two areas to address."
  Show: risk flags only
  CTA: "Review your flagged areas, then start" → scroll to flags → /pricing

60–74: "Eligible with preparation needed"
  Verdict: "Your profile qualifies but has complexity your documents
  must address directly."
  Show: all flags, attorney referral as option
  CTA: "Review your flags carefully before starting" → flags → pricing

45–59: "Complex case — legal guidance recommended"
  Verdict: "Your situation has factors that significantly benefit from
  professional legal review."
  Show: attorney referral prominently, still allow proceeding with gate
  CTA: "Speak with an attorney first" → referral, "Continue anyway" → gate

Rule: attorney_flags > 0 → score capped at 89
Rule: attorney_flags > 2 → score capped at 74

---

## SECTION 8 — MODULE 3 GAPS (NEED VERIFICATION)

These were identified in the denial audit but not confirmed as built.
Each must be verified in the next Module 3 session.

| Gap | Denial | What to verify |
|---|---|---|
| Funds spent on business expenses | D-02 | Is there a question in Your Investment asking whether capital has been spent on actual expenses (lease, equipment, franchise fee)? |
| Paper trail gap checklist | D-03 | Is there a specific multiselect in Your Investment for gap types: cash deposits, crypto, informal transfers? |
| Hiring plan structure | D-04, D-07 | Is the hiring plan in Your Business a repeating group with title / hours / start date / wage? |
| Projection assumptions | D-05, D-06 | Does the projection table in Your Business have an assumption source field per year? |
| Canadian ties structured | D-15 | Does Your Ties section have structured tie categories matching the Q0-NI replacement options? |

---

## SECTION 9 — AUTH AND RESULTS PAGE (TARGET STATE)

### Login page
- Email + password only. No magic link.
- "Remember me" checkbox — extends session to 30 days
- "Forgot password?" link
- No external image URLs

### Signup page
- First name (required)
- Last name (required)
- Email (required)
- Password + confirm password
- After signUp(): upsert first_name, last_name to profiles table

### Email verification
- Middleware checks email_confirmed_at
- If null → redirect to /verify regardless of route
- Exception: /verify and /api/auth/* do not redirect

### Post-login routing
1. No quiz session → /quiz
2. Quiz done, no application → /results
3. Application, payment incomplete → /pricing
4. Paid, in progress → /apply/[last_visited_section]
5. Paid, not started → /apply
Requires: last_visited_section column on applications table

### Navbar
- Logged in: show "Hi, [first_name]" + dropdown (Dashboard / Sign out)
- Not logged in: show "Log in" and "Sign up"

### Results page
- Logged in: "[First name], here are your results"
- Logged in: "Your profile has been saved."
- Not logged in: "Create a free account to save these results"
- Score/verdict consistent — no contradictions
- Single contextual CTA based on score band (see Section 7)
- "Email me this result" button: loading state → success/error
- Personalised timeline using Q0-target-date answer

### Acknowledgment gate
- List each specific flag being acknowledged by name
- Require typed "I understand" before Continue activates
- Timestamp the acknowledgment in user profile

---

## SECTION 10 — CURRENT SCORE AND TARGET

| Dimension | Current | Target | Gap |
|---|---|---|---|
| Legal accuracy | 7.5 | 9.0 | 1.5 |
| Question quality | 5.0 | 9.0 | 4.0 |
| Downstream utility | 5.5 | 9.0 | 3.5 |
| User experience | 4.0 | 9.0 | 5.0 |
| Completeness | 5.0 | 9.0 | 4.0 |
| Scoring integrity | 4.0 | 9.0 | 5.0 |
| **Overall** | **5.5** | **9.0** | **3.5** |

Target: 9.0/10 before first paid marketing campaign.
Current platform can reach first paying user at current score —
but quiz improvement must happen in parallel, not after.

---

*This is the single source of truth for quiz improvement.*
*Read this before any quiz session.*
*Update Section 1 after every session that closes an item.*
*File location: ~/E2-go/docs/QUIZ_IMPROVEMENT_MASTER.md*
