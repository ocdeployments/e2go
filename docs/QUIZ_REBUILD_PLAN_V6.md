# E2go — Quiz Rebuild Plan v6.0
## Comprehensive analysis, findings, and implementation plan
**Date:** June 10, 2026
**Status:** Ready for implementation
**Replaces:** SESSION_QUIZ_REBUILD_SPEC.md (v5.0)

---

## 1. What the quiz must do

One job: determine in the minimum number of questions whether this
person qualifies for an E-2 Treaty Investor visa, and route them
correctly to the next stage.

Four possible outcomes:

| Outcome | Meaning | What happens |
|---|---|---|
| PROCEED | No disqualifiers, no flags | Unlock pricing → payment → case file |
| PROCEED_RISK | Eligible with risk flags | Unlock pricing, flags on results page |
| ATTORNEY_RECOMMENDED | Complex conditions | Attorney referral + acknowledgment gate |
| DO_NOT_PROCEED | Hard disqualifier | Honest stop, no payment taken |

---

## 2. Root causes of current failures

Three architectural problems cause most of the 30 confirmed bugs.

### Root cause 1 — Multiselect never scores

`handleMultiContinue` collects selected answers and advances.
It never calls `processAction` for any selected option.

Result: Q0-09 (history) and Q0-10 (ties) produce zero warnings,
zero attorney flags, zero score impact for every applicant.
Q0-09a and Q0-09b never render because `evaluateShowIf` compares
array answers as strings — always false.

Every applicant scores approximately 80-100 regardless of whether
they have a deportation order, criminal conviction, or no ties to
their home country whatsoever.

### Root cause 2 — Q0-02 has no downstream effect

The answer to "who is this application for" is stored but nothing
reads it. Q0-03 and Q0-04 always fire regardless of what Q0-02 said.

Result: A person who already told the platform their spouse is a
co-investor gets asked again who is moving with them, and then asked
again whether they have a business partner. The quiz contradicts
itself.

### Root cause 3 — Answers stored in one format, read in another

`cos_flag` checks `answer.includes("valid visa")` but the option
text says "change of status." Partnership detection checks for
"partners" (plural) but the option says "partner" (singular).
Pricing functions match against "spouse_only" but the actual stored
answer is the full option text.

Result: COS flag is always false. Partnership detection fails for
the "me and my spouse" path. Pricing is wrong for almost every path.

---

## 3. Complete bug inventory — all 30 confirmed

### Critical (must fix before any paying user)

| # | Bug | Where |
|---|---|---|
| 1 | Non-treaty country passes Q0-01 — no validation | Q0-01 handler |
| 2 | Multiple partners = warning not hard stop PR-06b | Q0-04-D option |
| 3 | Loan secured by business = attorney flag not hard stop PR-02 | Q0-06-D option |
| 4 | Broker referral never fires for researching or franchise paths | Q0-08 Path B, Q0-08a Path A |
| 5 | Q0-08b asks wrong question — who introduced not referral consent | Q0-08b content |
| 6 | Multiselect never calls processAction — no warnings/flags fire | handleMultiContinue |
| 7 | Q0-09a and Q0-09b never render — array vs string comparison | evaluateShowIf |
| 8 | Score meaningless — history and ties never deduct | Score calculation |

### High severity

| # | Bug | Where |
|---|---|---|
| 9 | Q0-03 always fires even when Q0-02 established who is moving | Q0-03 show_if null |
| 10 | Q0-04 always fires even for co-investor paths | Q0-04 show_if null |
| 11 | Spouse partner sets application_type = partnership incorrectly | Q0-04-B routing |
| 12 | Q0-04a spouse options shown for unrelated 50/50 partner | Q0-04a options |
| 13 | COS flag never set — string mismatch | handleComplete |
| 14 | No "without valid status" option — PR-09 missing | Q0-05 options |
| 15 | Q0-06 is single-select — investor cannot pick multiple sources | Q0-06 type |
| 16 | "None" selectable with other options in Q0-09 | Q0-09 multiselect UI |
| 17 | Q0-10 positive ties trigger score deductions — backwards | Q0-10 action codes |
| 18 | "None" selectable with tie options in Q0-10 | Q0-10 multiselect UI |
| 19 | Contradictory answers possible between Q0-02 and Q0-03/Q0-04 | No cross-question validation |

### Medium severity

| # | Bug | Where |
|---|---|---|
| 20 | "Prefer not to say" in Q0-03a removes age-out check | Q0-03a options |
| 21 | flag_spouse_perspective and flag_spouse_qualifications dropped | processAction line 427 |
| 22 | Q0-04a "silent investor" uses wrong warning code | Q0-04a-D option |
| 23 | "Not sure" about application location gets no guidance | Q0-05-C option |
| 24 | "Not sure" about funds silently continues | Q0-06-F option |
| 25 | Wrong warning code for no ties — W-MOVING-ALONE not W-NO-TIES | Q0-10-E option |
| 26 | PR-LOW-INVESTMENT may not exist in page.tsx HARD_STOPS | HARD_STOPS object |
| 27 | Investment amount stores range not specific value | Q0-07 — no follow-up |
| 28 | Draft restore uses question index not question ID | Draft restore logic |

### Low severity

| # | Bug | Where |
|---|---|---|
| 29 | Q0-04a "silent investor" advisory is misleading | Q0-04a-D content |
| 30 | "Combination of sources" option captures no useful data | Q0-06-E option |

---

## 4. Question-by-question analysis and verdict

### Q0-01 — Citizenship

**Purpose:** Confirm treaty nationality. Hard stop if not qualifying.
**Current problem:** No validation against TREATY_COUNTRIES. Any country passes.
**Fix:** On selection, check against TREATY_COUNTRIES array. Fire PR-NON-TREATY
if not found. This is one line of code — the most critical fix in the entire quiz.

---

### Q0-02 — Who is this application for

**Purpose:** Establish application structure from the first question.
**Current problem:** Three vague options with no downstream effect.
"Me and my spouse — applying together" is ambiguous between spouse-as-dependent
and spouse-as-co-investor. "A group of partners" implies three or more (hard stop).
No flag set for any option.

**Correct options — four clean paths:**
1. I am the sole applicant
   → `application_type: solo`, `partner_type: none`
   → Q0-03 fires (who is moving)
   → Q0-04 skipped

2. I am the principal — my spouse will accompany me as a dependent
   → `application_type: solo`, `partner_type: none`, `spouse_coming: true`
   → Q0-02a fires (children sub)
   → Q0-03 skipped (spouse already confirmed)
   → Q0-04 skipped

3. My spouse and I are co-investing in this business together
   → `application_type: spousal_partnership`, `partner_type: spouse`
   → Q0-02a fires (children sub)
   → Q0-03 skipped
   → Q0-04 skipped

4. I have a business partner (not my spouse)
   → `application_type: partnership`, `partner_type: unrelated`
   → Q0-03 fires (who is moving)
   → Q0-04 fires (partner detail)

**Q0-02a — Children coming? (sub — fires for options 2 and 3)**
Question: "Will your children also be moving with you?"
Options:
- No children → `dependents: spouse_only`
- Yes — all under 21 → `dependents: spouse_and_children`
- Yes — one or more are 21 or older → advisory + `dependents: spouse_and_children`
  Advisory: "Children 21 or older cannot be E-2 dependents. They will need
  their own US visa. Only children under 21 will be included."

---

### Q0-03 — Who is moving with you

**Purpose:** Determine dependent structure for pricing.
**show_if:** Only fires when Q0-02 = options 1 or 4 (spouse not yet established).

**Correct options:**
1. Just me → `dependents: just_me`
2. Me and my spouse → `dependents: spouse_only`
3. Me, my spouse, and our children → `dependents: spouse_and_children` → Q0-03a
4. Me and my children only → `dependents: children_only` → Q0-03a

Remove "Not decided yet" — the platform needs this for pricing.

---

### Q0-03a — Any children 21 or older

**Purpose:** Binary check — under 21 qualifies, 21+ does not.
**The rule is simple.** Not a range. Not a spectrum.

**Correct options — binary:**
1. No — all my children are under 21 → continue, all included
2. Yes — one or more are 21 or older → advisory that those children cannot
   be dependents → continue

Remove: "Some between 18-20" (no eligibility purpose — the threshold is 21
not 18), "Prefer not to say" (produces no data, removes required check).

---

### Q0-04 — Business partner

**Purpose:** Confirm partnership structure and ownership split.
**show_if:** Only fires when Q0-02 = option 4 (unrelated business partner).
If Q0-02 is any other option, this question is already answered.

**Correct options:**
1. No — I am the only investor → `partner_type: none`, `application_type: solo`
2. Yes — one partner, we will each own 50% → Q0-04a, `partner_type: unrelated`
3. More than one partner → STOP PR-06b immediately

Remove: "Multiple partners, unequal splits" — this is not a valid E-2 structure.
It should hard stop, not warn and continue.

**Hard stop PR-06b text:**
"Under 9 FAM 402.9, an equal partnership with more than two investors does not
give any individual the control required for E-2 investor classification.
Options: restructure to two investors at exactly 50/50 each, or explore the
E-2 employee pathway if your company is majority treaty-national owned.
E2go prepares investor applications. We recommend consulting an immigration
attorney to assess your options."

---

### Q0-04a — Partner active or silent

**Purpose:** Establish whether the unrelated partner actively manages.
**show_if:** Only fires after Q0-04 option 2 (50/50 unrelated partner).
Spouse options must not appear here — spouse relationship handled in Q0-02.

**Correct options:**
1. Yes — my partner will actively manage the business with me
   → continue, both partners qualify as investors
2. No — my partner is a silent investor, not day-to-day involved
   → advisory + attorney flag
   Advisory: "Both partners in a 50/50 E-2 application must demonstrate active
   development and direction of the business. A silent investor role may not
   satisfy this requirement for your partner. We recommend reviewing this
   structure with an attorney before proceeding."

---

### Q0-05 — Where are you applying from

**Purpose:** Determine consular vs COS path. Hard stop for undocumented presence.

**Correct options:**
1. From outside the US — consular processing at my home country consulate
   → continue, `cos_flag: false`
2. From inside the US — I have a valid visa or immigration status
   → continue, `cos_flag: true`
   Advisory: "You may be eligible for Change of Status through USCIS, which
   avoids a consulate interview. Your case file will include guidance on both
   pathways."
3. From inside the US — I am not sure if my status is currently valid
   → attorney flag W-STATUS-UNKNOWN
   Advisory: "If your status has lapsed, applying while out of status creates
   serious legal risk. Please confirm your status before proceeding."
4. From inside the US — I do not have valid status
   → STOP PR-09
   "Applying while inside the US without valid immigration status creates serious
   legal risk that could permanently affect your ability to re-enter.
   Please consult a qualified immigration attorney immediately."

**Fix in handleComplete:** Change `includes("valid visa")` to `includes("valid visa")
|| includes("valid status")` to match option 2 text.

---

### Q0-06 — Funding sources

**Purpose:** Identify capital sources. Hard stop for business-secured loans.
**Type: MULTISELECT** — an investor can have multiple sources.

**Correct options:**
1. Personal savings or accumulated wealth
2. Proceeds from selling property
3. Proceeds from selling a business or investment
4. Inheritance or gift received
   → advisory: "Gift-funded investments require documentation proving the gift
   is genuine — not a disguised loan. The donor's source of funds may also
   be required."
5. Retirement account funds (RRSP, TFSA, pension withdrawal)
6. A personal loan secured by my own assets (home equity, personal guarantee)
   → advisory: "Personal-asset-secured loans can qualify if the loan is not
   secured by the business itself. Documentation of the collateral is required."
7. A loan secured by the business I am investing in
   → STOP PR-02 immediately
   "The E-2 requires capital at risk that you own and control. A loan secured
   by the business itself does not meet this requirement under 9 FAM."

Remove: "Combination of sources" (redundant with multiselect), "Not sure yet"
(produces no data — an investor who doesn't know their funding source is not
ready to apply).

**Mutual exclusion:** Option 7 cannot be selected with others. If selected,
hard stop fires immediately regardless of other selections.

---

### Q0-07 — Investment amount

**Purpose:** Gate below-threshold. Flag borderline amounts.
**Type: Select for range, then number input for specific amount.**

**Range options (unchanged):**
1. Over $150,000 → continue
2. $100,000 – $150,000 → continue
3. $75,000 – $100,000 → W-LOW-INVESTMENT warning
4. $50,000 – $75,000 → W-BORDERLINE-INVESTMENT warning
5. Under $50,000 → STOP PR-LOW-INVESTMENT

**Add follow-up number input:**
"What is your approximate investment amount?"
This pre-fills QF-02 in the case file with a specific number, not a range.
Accepts USD or CAD (with live conversion note).

---

### Q0-08 — Business situation

**Purpose:** Identify business stage. Route to broker referral for undecided.

**Correct options:**
1. I have a specific business or franchise identified → Q0-08a
2. I am still searching — I have not chosen yet → Q0-08b (broker consent)
3. I want to start a new business from scratch → Q0-08b (broker consent)

**Key change:** Options 2 and 3 now route to Q0-08b. Previously only
"A broker introduced me" routed there. This is the lead generation fix —
the majority of applicants who don't have a specific business now get the
broker referral question.

---

### Q0-08a — Business type

**Purpose:** Confirm business qualifies. Flag marginality risk.
**show_if:** Only fires when Q0-08 = option 1 (specific business).

**Correct options:**
1. A franchise — buying into an established brand
   → `business_type: franchise` → Q0-08b
2. An existing independent business I am acquiring
   → `business_type: acquisition` → Q0-08b
3. A new business I am starting from scratch
   → `business_type: new` → Q0-08b
4. Professional services or consulting
   → `business_type: consulting` → W-MARGINALITY warning → Q0-08b
   Warning: "Solo consulting businesses face scrutiny under the marginality
   test. Your business plan must show capacity to generate income well beyond
   your household needs and to create employment for others."
5. Real estate holding, rental property, or passive investment
   → STOP PR-PASSIVE-INVEST
6. Non-profit or charitable organisation
   → STOP PR-NONPROFIT

**After options 1-4:** Route to Q0-08b for broker consent.

---

### Q0-08b — Broker referral consent

**Purpose:** Capture consent for broker introduction. This is the platform's
primary lead generation mechanism.

**Question:** "Would you like us to connect you with an E-2 specialist
franchise broker? They work with investors at your profile level and know
which businesses have the strongest approval track records at the
Toronto consulate."

**Options:**
1. Yes — please connect me → `franchise_interest: true` → continue
2. No thanks → `franchise_interest: false` → continue

Remove the current question text entirely ("Who introduced you to the
business?"). That question serves no purpose. This question is a consent
capture, not a survey.

---

### Q0-09 — Immigration history

**Purpose:** Flag prior immigration issues. Route complex cases to attorney.

**Architecture change:** Switch from multiselect to sequential branching.
Multiselect on sensitive personal questions creates two problems: processAction
never fires, and seeing a list of bad things causes anxiety. Sequential
branching processes each answer correctly and feels like a conversation.

**Gate question:**
"Does any of the following apply to your immigration history?"
Options:
- No — clean history → continue, no flags
- Yes — I have something to disclose → reveals sub-questions in sequence

**Sub Q0-09a — Prior US visa refusal**
"Have you ever been refused a US visa?"
1. No → continue
2. Yes, once — more than 5 years ago → W-REFUSAL-OLD warning
3. Yes, once — within the last 5 years → attorney flag W-REFUSAL-RECENT
4. Yes, more than once → attorney flag W-REFUSAL-MULTIPLE

**Sub Q0-09b — Entry refusal or removal**
"Have you ever been refused entry at a US border or deported from the US?"
1. No → continue
2. Yes — refused entry → attorney flag W-ENTRY-REFUSED
3. Yes — deported or removed → attorney flag W-DEPORTED

**Sub Q0-09c — Criminal history**
"Do you have any criminal convictions in any country?"
1. No → continue
2. Minor conviction, resolved more than 10 years ago → W-CONVICTION-OLD warning
3. Minor conviction, within the last 10 years → attorney flag W-CONVICTION-RECENT
4. Serious conviction → STOP PR-08
5. I am not sure if my record affects US admissibility → attorney flag W-CONVICTION-UNSURE

**Why sequential over multiselect:**
Each sub-question processes through single-select `processAction` which
correctly fires warnings and attorney flags. No architecture changes needed
beyond fixing the gate question routing.

---

### Q0-10 — Home country ties

**Purpose:** Assess non-immigrant intent signal for 214(b) analysis.

**Type: Multiselect.**

**The scoring logic must be correct:**
Owning property is a POSITIVE tie — it should not deduct from the score.
Having family in Canada is a POSITIVE tie. Financial accounts are POSITIVE.
Only "none of these" is a risk signal.

**Correct options:**
1. Property I own and plan to keep → `tie_positive` (no warning, adds to ties_score)
2. Close family remaining in my home country → `tie_positive`
3. Active financial accounts, pension, or investments → `tie_positive`
4. An ongoing business or professional practice → `tie_positive`
5. Professional licences or memberships → `tie_positive`
6. None of these apply → W-NO-TIES warning

**Scoring:**
- 3 or more options selected → ties_score: strong, no flag
- 1-2 options selected → ties_score: moderate, mild advisory in results page
  "We will build your non-immigrant intent case around your available ties.
  The more documented evidence you have, the stronger your position."
- Option 6 only → ties_score: weak, W-NO-TIES deduction (-8)
  Strong advisory: "Having no significant ties to your home country is a
  known risk factor for 214(b) immigrant intent assessment. Your cover
  letter will need to address this directly and thoroughly. This does not
  stop your application — it is something we will prepare you for carefully."

**Mutual exclusion:** Selecting option 6 deselects all others. Selecting
any of options 1-5 deselects option 6.

**Fix required in score_weights:** Remove deductions for W-PROPERTY-UNDISCLOSED,
W-NO-EXTENDED-FAMILY, W-CLOSING-ACCOUNTS (these were incorrectly coded as
negative for positive ties). Add W-NO-TIES deduction at -8.

---

## 5. Architectural fixes required in quiz/page.tsx

### Fix A — handleMultiContinue must call processAction

Current code advances without processing any action codes.

```typescript
// CURRENT (broken):
const handleMultiContinue = () => {
  const selected = multiSel.map(i => q.options[i].text);
  const newAnswers = { ...answers, [q.id]: selected };
  advance();
};

// CORRECT:
const handleMultiContinue = () => {
  const selected = multiSel.map(i => q.options[i]);
  const newAnswers = { ...answers, [q.id]: selected.map(o => o.text) };
  setAnswers(newAnswers);

  // Process action codes for every selected option
  let newWarnings = [...warningCodes];
  let newFlags = [...attorneyFlags];

  for (const opt of selected) {
    const action = opt.action || "continue";
    const warnCode = extractWarningCode(action);
    const attorneyCode = extractAttorneyCode(action);
    const stopCode = extractStopCode(action);

    if (stopCode) {
      setStopCode(stopCode);
      return; // Stop immediately
    }
    if (warnCode && !newWarnings.includes(warnCode)) {
      newWarnings.push(warnCode);
      if (opt.warning_message) setWarnMsg(opt.warning_message);
    }
    if (attorneyCode && !newFlags.includes(attorneyCode)) {
      newFlags.push(attorneyCode);
    }
  }

  setWarningCodes(newWarnings);
  setAttorneyFlags(newFlags);
  saveDraft(newAnswers, cur, newWarnings, newFlags, franchiseInterest);

  const nextIdx = cur + 1;
  if (nextIdx >= visibleQuestions.length) {
    handleComplete(newAnswers, newWarnings, newFlags, franchiseInterest, hardStopsTriggered);
  } else {
    advance();
  }
};
```

### Fix B — evaluateShowIf must handle array answers

```typescript
// CURRENT (broken):
for (const [qId, allowedValues] of Object.entries(showIf)) {
  const answer = answers[qId];
  if (!allowedValues.some(v => answer === v)) return false;
}

// CORRECT:
for (const [qId, allowedValues] of Object.entries(showIf)) {
  const answer = answers[qId];
  const matches = Array.isArray(answer)
    ? allowedValues.some(v => (answer as string[]).includes(v))
    : allowedValues.includes(answer as string);
  if (!matches) return false;
}
```

### Fix C — Treaty country validation at Q0-01

In the country selection handler, after setting the answer:

```typescript
const handleCountrySelect = (country: string) => {
  if (!TREATY_COUNTRIES.includes(country)) {
    setStopCode("PR-NON-TREATY");
    return;
  }
  setSelectedCountry(country);
  setAnswers(prev => ({ ...prev, "Q0-01": country }));
  advance();
};
```

### Fix D — COS flag string match

```typescript
// CURRENT (broken):
cos_flag: (finalAnswers["Q0-05"] as string || "").includes("valid visa")

// CORRECT:
cos_flag: (finalAnswers["Q0-05"] as string || "").toLowerCase().includes("valid status")
  || (finalAnswers["Q0-05"] as string || "").toLowerCase().includes("change of status")
```

### Fix E — application_type detection

```typescript
application_type: (() => {
  const q2 = finalAnswers["Q0-02"] as string || "";
  const q4 = finalAnswers["Q0-04"] as string || "";

  // Q0-02 takes priority — it establishes the structure first
  if (q2.includes("co-invest")) return "spousal_partnership";
  if (q2.includes("business partner")) return "partnership";
  if (q2.includes("spouse will accompany")) return "solo";

  // Q0-04 for cases where Q0-02 = sole applicant
  if (q4.includes("50%") || q4.includes("50/50")) return "partnership";

  return "solo";
})()
```

### Fix F — Q0-03 and Q0-04 show_if conditions

Q0-03 show_if (only fire when spouse not established by Q0-02):
```json
"show_if": {
  "Q0-02": [
    "I am the sole applicant",
    "I have a business partner (not my spouse)"
  ]
}
```

Q0-04 show_if (only fire when Q0-02 = business partner option):
```json
"show_if": {
  "Q0-02": ["I have a business partner (not my spouse)"]
}
```

### Fix G — Score weights corrected

Remove from score_weights deductions:
- W-PROPERTY-UNDISCLOSED (positive tie, not a risk)
- W-NO-EXTENDED-FAMILY (positive tie, not a risk)
- W-CLOSING-ACCOUNTS (positive tie, not a risk)

Add to score_weights deductions:
- W-NO-TIES: -8
- W-STATUS-UNKNOWN: -6
- W-REFUSAL-OLD: -5
- W-REFUSAL-RECENT: -10
- W-REFUSAL-MULTIPLE: -12
- W-ENTRY-REFUSED: -12
- W-DEPORTED: -15
- W-CONVICTION-OLD: -5
- W-CONVICTION-RECENT: -12
- W-CONVICTION-UNSURE: -8
- W-MARGINALITY: -6
- W-LOW-INVESTMENT: -6
- W-BORDERLINE-INVESTMENT: -10
- W-AGING-OUT: -3
- W-FAMILY-GIFT: -4
- W-LOAN-PERSONAL: -3

---

## 6. Data outputs — what handleComplete must produce

```typescript
interface QuizResult {
  // Eligibility outputs
  outcome: 'PROCEED' | 'PROCEED_RISK' | 'ATTORNEY_RECOMMENDED' | 'DO_NOT_PROCEED';
  score: number;
  warnings: string[];
  attorney_flags: string[];

  // Identity
  country: string;
  principal_applicant: 'self' | 'spouse';

  // Application structure (for pricing and document routing)
  application_type: 'solo' | 'partnership' | 'spousal_partnership';
  partner_type: 'none' | 'unrelated' | 'spouse';

  // Dependents (for pricing)
  dependents: 'just_me' | 'spouse_only' | 'spouse_and_children' | 'children_only';

  // Application path
  cos_flag: boolean;

  // Investment
  investment_range: string;
  investment_amount?: number; // if specific amount entered

  // Business
  funding_sources: string[];
  business_stage: 'specific' | 'searching' | 'scratch';
  business_type: 'franchise' | 'acquisition' | 'new' | 'consulting' | 'unknown';
  franchise_interest: boolean;

  // Risk profile
  ties_categories: string[];
  ties_score: 'strong' | 'moderate' | 'weak';
  history_flags: string[];
}
```

---

## 7. Pricing chain — how quiz output maps to package

```typescript
// Correct mapping from quiz result to pricing tier

function getPricingTier(result: QuizResult): TierId {
  const { application_type, dependents } = result;

  const isPartnership = application_type === 'partnership'
    || application_type === 'spousal_partnership';

  const hasSpouse = dependents === 'spouse_only'
    || dependents === 'spouse_and_children';

  const hasChildren = dependents === 'spouse_and_children'
    || dependents === 'children_only';

  if (isPartnership) {
    if (hasSpouse && hasChildren) return 'partnership_families'; // $1,397
    if (hasSpouse) return 'partnership_couples';                  // $1,297
    return 'partnership_none';                                    // $997
  }

  // Solo
  if (hasSpouse && hasChildren) return 'solo_family_small';      // $750
  if (hasSpouse) return 'solo_spouse';                           // $697
  if (hasChildren) return 'solo_family_small';                   // $750
  return 'solo_none';                                            // $550
}
```

---

## 8. Hard stops — complete list

| Code | Trigger | Message theme |
|---|---|---|
| PR-NON-TREATY | Non-treaty citizenship | Treaty requirement |
| PR-02 | Loan secured by business assets | At-risk capital requirement |
| PR-03 | No investment funds available | Capital existence requirement |
| PR-04 / PR-LOW-INVESTMENT | Under $50,000 | Substantiality minimum |
| PR-06b | More than two investors | Control requirement per 9 FAM |
| PR-08 | Serious criminal conviction | Inadmissibility |
| PR-09 | In US without valid status | Legal presence |
| PR-PASSIVE-INVEST | Passive real estate / stock portfolio | Active enterprise requirement |
| PR-NONPROFIT | Non-profit organisation | For-profit requirement |

Every hard stop:
- Shows clear honest explanation with the legal basis
- Never blames the applicant
- Offers attorney referral
- Offers "start over" option
- Takes no payment

---

## 9. Verification paths — five tests that confirm the quiz works

After implementation, the agent must walk all five paths and report
exact outcomes before the session is marked complete.

**Test 1 — Non-treaty country:**
Select "China" at Q0-01.
Expected: PR-NON-TREATY hard stop fires immediately.

**Test 2 — Loan secured by business:**
Complete to Q0-06. Select "A loan secured by the business I am investing in."
Expected: PR-02 hard stop fires immediately.

**Test 3 — Deportation history:**
Complete to Q0-09. Select "Yes — I have something to disclose."
Sub Q0-09b: Select "Yes — deported or removed."
Expected: attorney flag W-DEPORTED set. Results page shows
ATTORNEY_RECOMMENDED outcome. Score reduced by 15 points.

**Test 4 — Spouse and children → correct pricing:**
Q0-02: "I am the sole applicant"
Q0-03: "Me, my spouse, and our children"
Q0-03a: "No — all under 21"
Q0-04: "No — sole investor"
Complete remaining questions.
Expected: Results page shows "Solo + Family — $750"
NOT "Solo Individual — $550"

**Test 5 — Business partner → correct pricing:**
Q0-02: "I have a business partner (not my spouse)"
Q0-04: "Yes — one partner, 50/50 ownership"
Q0-04a: "Yes — actively manages"
Complete remaining questions.
Expected: Results page shows "Partnership — $997"

---

## 10. Implementation order

### Step 1 — Architecture fixes only (quiz/page.tsx)
Files: src/app/quiz/page.tsx
Changes: Fix A (handleMultiContinue), Fix B (evaluateShowIf),
Fix C (treaty validation), Fix D (COS flag), Fix E (application_type),
Fix G (score weights)

Verify after Step 1:
```bash
npm run build 2>&1 | tail -3
```

### Step 2 — Rebuild questions JSON
Files: src/data/module0_questions.json
Full replacement using question definitions in Section 4 above.
Every question, every option, every routing code, every warning text.

Verify after Step 2:
```bash
grep -c '"id":' src/data/module0_questions.json
# Should be exactly 14 (Q0-01 through Q0-10 plus Q0-02a, Q0-03a, Q0-04a, Q0-08a, Q0-08b, Q0-09a, Q0-09b, Q0-09c)
```

### Step 3 — Fix show_if conditions and handleComplete
Files: src/app/quiz/page.tsx
Changes: Fix F (show_if for Q0-03, Q0-04), handleComplete output fields,
pricing chain in pricing-tier.ts and PricingClient.tsx

Verify after Step 3: Walk all five test paths above and report outcomes.

### Step 4 — Final build and commit
```bash
npm run build 2>&1 | tail -5
curl -s -o /dev/null -w "quiz: %{http_code}\n" http://localhost:3000/quiz
curl -s -o /dev/null -w "results: %{http_code}\n" http://localhost:3000/results
curl -s -o /dev/null -w "pricing: %{http_code}\n" http://localhost:3000/pricing
```
All must return 200. Build must be clean.

Commit: "feat: quiz rebuild v6.0 — architecture fixed, all 30 bugs resolved"

---

## 11. What this quiz produces after the rebuild

**For every applicant:**
- Correct eligibility outcome (PROCEED / PROCEED_RISK / ATTORNEY / STOP)
- Accurate score reflecting actual risk profile
- Correct package recommendation
- Correct application_type for document routing
- Correct dependents for pricing
- Correct franchise_interest for broker referral emails
- Correct attorney_flags for attorney referral emails
- Meaningful ties assessment for 214(b) section of cover letter
- History flags for DS-160 pre-fill

**Hard stops that now work:**
PR-NON-TREATY, PR-02, PR-03, PR-04, PR-06b, PR-08, PR-09,
PR-PASSIVE-INVEST, PR-NONPROFIT

**Revenue flows that now work:**
- Broker referral fires for all undecided applicants (not just broker-introduced)
- Attorney referral emails fire when attorney flags are set
- Pricing is correct for all 9 combinations of application_type and dependents
- No couple or family is undercharged

---

*This document is the authoritative specification for quiz v6.0.*
*The agent must read this document completely before writing any code.*
*Implementation order in Section 10 must be followed exactly.*
*Verification paths in Section 9 must all pass before the session is complete.*
