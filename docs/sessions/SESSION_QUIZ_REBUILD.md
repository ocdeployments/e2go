# E2go — Session: Quiz Rebuild v5.0
## Session file for Claude Code
**Date:** June 10, 2026
**Branch:** dev
**Estimated time:** 3–4 hours
**Status:** Ready to build

---

## BEFORE YOU START — READ IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/SESSION_QUIZ_REBUILD_SPEC.md
cat src/app/quiz/page.tsx
cat public/data/module0_questions.json
cat src/lib/pricing-tier.ts
cat src/app/pricing/PricingClient.tsx
cat src/app/results/page.tsx
```

Do not write a single line of code until all are read.
Confirm reading complete before proceeding.

---

## GROUND RULES

1. This is a full rebuild of the quiz — not a patch.
   The current quiz has 17 confirmed bugs. Patching is not an option.
2. Do not preserve any question IDs from the old quiz that are being
   replaced. Use the new IDs from the spec (Q0-01 through Q0-10,
   plus subs Q0-03a, Q0-04a, Q0-08a, Q0-08b, Q0-09a, Q0-09b).
3. The results page, pricing page, and case file must all receive
   correct data after this rebuild. Test the full chain.
4. No rounded corners. Gold borders on selected states. No blue.
5. Read DESIGN_REFERENCE.html before touching any styles.
6. Full output on every file. No truncation.
7. Test at 390px and 1440px.
8. Back button at BOTTOM LEFT. Continue at BOTTOM RIGHT. Always.

---

## WHAT THIS SESSION REBUILDS

Five files:
1. public/data/module0_questions.json — full replacement
2. src/app/quiz/page.tsx — full replacement
3. src/lib/pricing-tier.ts — prices + family status mapping fixed
4. src/app/pricing/PricingClient.tsx — three critical bugs fixed
5. src/app/results/page.tsx — dependents and application_type fixed

---

## TASK 1 — REBUILD module0_questions.json

Replace the entire file with the 10-question spec from
docs/SESSION_QUIZ_REBUILD_SPEC.md.

The new question set (read the spec for full detail on each):

```
Q0-01  Citizenship (country search, treaty check)
Q0-02  Who is this application for?
Q0-03  Who is moving with you?
  Q0-03a  Children ages (sub — fires if children selected)
Q0-04  Business partner?
  Q0-04a  Spouse role (sub — fires if spouse partner)
Q0-05  Where are you applying from?
Q0-06  How are you funding this?
Q0-07  How much are you investing?
Q0-08  Business situation?
  Q0-08a  Business type (sub — fires if specific business)
  Q0-08b  Broker introduction (sub — fires if franchise/open/direction)
Q0-09  Immigration and criminal history (multiselect)
  Q0-09a  Visa refusal detail (sub — fires if refusal selected)
  Q0-09b  Criminal conviction detail (sub — fires if conviction selected)
Q0-10  Home country ties (multiselect)
```

Key rules for the JSON:
- Every question has: id, type, section, question, helper_text, tooltip,
  options (with routing codes), and showIf where applicable
- Sub-questions have: is_sub: true, parent, show_if
- Hard stops use routing code: "stop:PR-XX"
- Warnings use: "warn:W-XX"
- Attorney flags use: "attorney:W-XX"
- Continue uses: "ok"

Hard stop codes to include:
PR-01, PR-02, PR-03, PR-04, PR-06b, PR-08, PR-09

Warning codes to include:
W-AGING-OUT, W-INVEST-LOW, W-INVEST-VERY-LOW, W-MARGINALITY,
W-REFUSAL-OLD, W-REFUSAL-RECENT, W-REFUSAL-MULTIPLE,
W-CONVICTION-OLD, W-CONVICTION-RECENT, W-CONVICTION-UNSURE,
W-ENTRY, W-DEPORTED, W-NO-TIES, W-COS

Score weights to include (in score_weights section):
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

## TASK 2 — REBUILD src/app/quiz/page.tsx

This file needs a full rebuild. Keep the existing component structure
(auth check, email gate, hard stop screen, main quiz) but replace
the question definitions and all routing logic.

### QUESTIONS array

Rebuild from the spec. Key rules:

**Q0-01 — Country search**
- On selection, check if country is in TREATY_COUNTRIES array
- If NOT in array → setStopCode("PR-01") immediately
- If in array → advance
- This check is CRITICAL — currently missing entirely

**Q0-02 — Who is this for**
- Sets `principal_applicant` state: 'self' | 'spouse'
- If "co-investors" → sets `application_type: 'partnership'`,
  skips Q0-04
- Shows persistent advisory if spouse is principal

**Q0-03 — Who is moving**
- Sets `dependents` state
- "spouse and children" or "children only" → triggers Q0-03a sub

**Q0-04 — Business partner**
- Only shows if Q0-02 was NOT "co-investors"
- "My spouse is my business partner" → triggers Q0-04a sub
- "More than one partner" → STOP PR-06b
- Sets `application_type` and `partner_type`

**Q0-05 — Where applying from**
- "Valid US status" → sets `cos_flag: true`, advisory shown
- "No valid status" → STOP PR-09

**Q0-06 — Funding**
- "Primarily a loan" → STOP PR-02
- "No funds" → STOP PR-03

**Q0-07 — Investment amount**
- "Under $50,000" → STOP PR-04
- Lower ranges → warnings with specific text from spec

**Q0-08 — Business situation**
- "Specific business" → triggers Q0-08a
- "Direction" or "Open" → triggers Q0-08b directly

**Q0-08a — Business type (sub)**
- Only shows if Q0-08 = "specific business"
- All options continue (no hard stops here)
- "Professional services" → warning W-MARGINALITY
- After Q0-08a, franchise selection triggers Q0-08b

**Q0-08b — Broker introduction (sub)**
- Shows for: direction, open, or franchise business type
- Sets `franchise_interest` boolean

**Q0-09 — History multiselect**
- "None of the above" only → continue, no flags
- "Prior visa refusal" → triggers Q0-09a
- "Refused entry" → attorney flag
- "Deported" → attorney flag
- "Criminal conviction" → triggers Q0-09b
- Multiple items → accumulate all flags

**Q0-09a — Refusal detail (sub)**
- "More than 5 years ago" → warning W-REFUSAL-OLD
- "Within 5 years" → attorney flag W-REFUSAL-RECENT
- "More than once" → attorney flag W-REFUSAL-MULTIPLE

**Q0-09b — Conviction detail (sub)**
- "Minor, 10+ years" → warning W-CONVICTION-OLD
- "Minor, recent" → attorney flag W-CONVICTION-RECENT
- "Serious" → STOP PR-08
- "Not sure" → attorney flag W-CONVICTION-UNSURE

**Q0-10 — Home ties multiselect**
- Any combination of first six options → continue, record categories
- "Nothing significant" selected alone → warning W-NO-TIES
- "Nothing significant" + other options → ignore "nothing",
  use other selections only

### Question counter

Replace the static CORE_QUESTION_COUNT = 16 with dynamic counting:

```typescript
const visibleQuestions = QUESTIONS.filter(q => {
  if (typeof q.showIf === 'function') return q.showIf(answers);
  return true;
});
// Display: Question {cur + 1} of {visibleQuestions.length}
```

Never show a current number higher than the total.

### Back button — BOTTOM position

Remove back button from top-left position entirely.

The bottom navigation bar structure:
```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: '32px',
  paddingTop: '20px',
  borderTop: '1px solid rgba(201,168,76,0.08)',
}}>
  {/* Back button — left */}
  {cur > 0 && (
    <button
      onClick={handleBack}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'rgba(245,240,232,0.5)',
        fontSize: '13px',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        padding: '8px 0',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      ← Back
    </button>
  )}
  {/* Spacer when no back button */}
  {cur === 0 && <div />}

  {/* Continue button — right (for multi-select questions) */}
  {isMulti && (
    <button
      onClick={handleMultiContinue}
      disabled={multiSel.length === 0}
      style={{
        padding: '11px 26px',
        background: '#C9A84C',
        border: 'none',
        color: '#0a0a0a',
        fontSize: '12px',
        fontWeight: 500,
        cursor: multiSel.length > 0 ? 'pointer' : 'not-allowed',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        borderRadius: 0,
        opacity: multiSel.length > 0 ? 1 : 0.25,
      }}
    >
      Continue →
    </button>
  )}
</div>
```

For select questions the continue fires automatically on selection
(existing behaviour — keep). Back button always bottom left.

### handleBack function

```typescript
const handleBack = useCallback(() => {
  if (cur > 0) {
    setCur(prev => prev - 1);
    setSelectedIdx(null);
    setWarnMsg(null);
    setMultiSel([]);
  }
}, [cur]);
```

### handleComplete — CRITICAL FIXES

Replace the resultData construction entirely:

```typescript
const resultData = {
  outcome,
  score,
  warnings: finalWarnings,
  attorney_flags: finalAttorneyFlags,
  answers: finalAnswers,

  // Core routing
  country: finalAnswers["Q0-01"] as string || "",
  investment_range: finalAnswers["Q0-07"] as string || "",
  cos_flag: (finalAnswers["Q0-05"] as string || "").includes("valid visa"),

  // Principal applicant
  principal_applicant: (finalAnswers["Q0-02"] as string || "")
    .includes("spouse is the principal") ? 'spouse' : 'self',

  // Application type — read from Q0-04 and Q0-02
  application_type: (() => {
    const q2 = finalAnswers["Q0-02"] as string || "";
    const q4 = finalAnswers["Q0-04"] as string || "";
    if (q2.includes("co-investors")) return "partnership";
    if (q4.includes("50/50")) return "partnership";
    if (q4.includes("spouse") && !q4.includes("accompanying")) {
      return "spousal_partnership";
    }
    return "solo";
  })(),

  // Dependents — read from Q0-03 (NOT Q0-16)
  dependents: (() => {
    const a = finalAnswers["Q0-03"] as string || "";
    if (a.includes("spouse") && a.includes("children")) {
      return "spouse_and_children";
    }
    if (a.includes("children") && !a.includes("spouse")) {
      return "children_only";
    }
    if (a.includes("spouse") && !a.includes("children")) {
      return "spouse_only";
    }
    return "just_me";
  })(),

  // Partner type — read from Q0-04
  partner_type: (() => {
    const a = finalAnswers["Q0-04"] as string || "";
    if (a.includes("spouse")) return "spouse";
    if (a.includes("50/50")) return "unrelated";
    return "none";
  })(),

  // Business
  business_stage: (() => {
    const a = finalAnswers["Q0-08"] as string || "";
    if (a.includes("specific")) return "specific";
    if (a.includes("direction")) return "direction";
    return "open";
  })(),
  business_type: finalAnswers["Q0-08a"] as string || "unknown",
  franchise_interest: finalAnswers["Q0-08b"] === "Yes — please connect me with a broker",

  // Ties
  ties_categories: (finalAnswers["Q0-10"] as string[]) || [],
};
```

Remove ALL references to Q0-16, Q0-13a, Q0-15 in handleComplete.
Those question IDs no longer exist.

---

## TASK 3 — FIX src/lib/pricing-tier.ts

Two fixes:

**Fix A — Update all prices to confirmed amounts:**

```typescript
export const PRICING_TIERS: Record<TierId, PricingTier> = {
  solo_none: { price: 550, ... },
  solo_spouse: { price: 697, ... },
  solo_family_small: { price: 750, ... },
  solo_family_large: { price: 797, ... },
  partnership_none: { price: 997, ... },
  partnership_couples: { price: 1297, ... },
  partnership_families: { price: 1397, ... },
};
```

**Fix B — Update getPricingTier() to match actual option strings:**

```typescript
export function getPricingTier(quizData: QuizData | null): TierId | null {
  if (!quizData) return null;

  const appType = quizData.application_type;
  const dependents = (quizData.dependents || '').toLowerCase();

  const hasSpouse = dependents.includes('spouse');
  const hasChildren = dependents.includes('children');

  if (appType === 'partnership' || appType === 'spousal_partnership') {
    if (hasSpouse && hasChildren) return 'partnership_families';
    if (hasSpouse) return 'partnership_couples';
    return 'partnership_none';
  }

  // Solo
  if (hasSpouse && hasChildren) return 'solo_family_small';
  if (hasSpouse) return 'solo_spouse';
  if (hasChildren) return 'solo_family_small';
  return 'solo_none';
}
```

The QuizData interface must match what handleComplete produces:
```typescript
export interface QuizData {
  application_type?: 'solo' | 'partnership' | 'spousal_partnership';
  dependents?: 'just_me' | 'spouse_only' | 'spouse_and_children' | 'children_only';
  [key: string]: unknown;
}
```

---

## TASK 4 — FIX src/app/pricing/PricingClient.tsx

Three bugs to fix:

**Bug A — Wrong question key for partnership detection:**

Find:
```typescript
application_type: quizAnswers["Q0-09"] === "Two equal 50/50 owners"
  ? "partnership" : "solo",
```

Replace with:
```typescript
const q2 = quizAnswers["Q0-02"] as string || "";
const q4 = quizAnswers["Q0-04"] as string || "";
const application_type =
  q2.includes("co-investors") ||
  q4.includes("50/50") ||
  q4.includes("spouse")
    ? "partnership" : "solo";
```

**Bug B — Wrong question key for family status:**

Find:
```typescript
family_status: quizAnswers["Q0-16"] || "none",
```

Replace with:
```typescript
dependents: quizAnswers["Q0-03"] as string || "just_me",
```

Update the QuizData object passed to getPricingTier to use
`dependents` not `family_status`:
```typescript
const quizData: QuizData = {
  application_type,
  dependents: quizAnswers["Q0-03"] as string || "just_me",
};
```

**Bug C — Remove DEFAULT_TIERS with empty Price IDs:**

Remove the DEFAULT_TIERS constant entirely.

Change:
```typescript
const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
```
To:
```typescript
const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
```

In the fetch useEffect, if Supabase returns empty or errors:
```typescript
if (!tiersError && tiers && tiers.length > 0) {
  setPricingTiers(tiers);
} else {
  // Show error — never silently use empty Price IDs
  setError('Unable to load pricing. Please refresh the page.');
  setLoading(false);
  return;
}
```

---

## TASK 5 — FIX src/app/results/page.tsx

Two fixes:

**Fix A — Update getPricingFromAnswers to read correct fields:**

```typescript
function getPricingFromAnswers(data: ResultData): {
  tier: string;
  tierKey: string;
  total: number;
} {
  const isPartnership =
    data.application_type === "partnership" ||
    data.application_type === "spousal_partnership";

  const dep = data.dependents || "just_me";
  const hasSpouse = dep.includes("spouse");
  const hasChildren = dep.includes("children");

  let tierKey = "solo_none";
  let tierName = "Solo Individual";
  let total = 55000;

  if (isPartnership) {
    if (hasSpouse && hasChildren) {
      tierKey = "partnership_families";
      tierName = "Partnership — Two Full Families";
      total = 139700;
    } else if (hasSpouse) {
      tierKey = "partnership_couples";
      tierName = "Partnership — Two Couples";
      total = 129700;
    } else {
      tierKey = "partnership_none";
      tierName = "Partnership";
      total = 99700;
    }
  } else {
    if (hasSpouse && hasChildren) {
      tierKey = "solo_family_small";
      tierName = "Solo + Family";
      total = 75000;
    } else if (hasSpouse) {
      tierKey = "solo_spouse";
      tierName = "Solo + Spouse";
      total = 69700;
    }
  }

  return {
    tier: tierName,
    tierKey,
    total,
  };
}
```

**Fix B — Remove all references to Q0-16 in results page.**
Search for `Q0-16` and replace with `Q0-03`.

---

## TASK 6 — DELETE OLD QUESTIONS FROM QUESTIONS ARRAY

In src/app/quiz/page.tsx, the QUESTIONS array must NOT contain:
- Q0-13a (replaced by Q0-03)
- Q0-13b (absorbed into Q0-10)
- Q0-14 (absorbed into Q0-10)
- Q0-15 (replaced by Q0-04)
- Q0-16 (replaced by Q0-03)
- Q0-16a (replaced by Q0-03a)
- Q0-03a (old version — replaced by new Q0-04a)
- Q0-14b (replaced by Q0-04a)
- Q0-14c, Q0-14d, Q0-14e (moved to case file)
- Q0-PREP-STATUS (moved to case file upload card)
- Q0-09a (old passive enterprise check — replaced by Q0-08a)

The new QUESTIONS array contains exactly:
Q0-01, Q0-02, Q0-03, Q0-03a, Q0-04, Q0-04a,
Q0-05, Q0-06, Q0-07, Q0-08, Q0-08a, Q0-08b,
Q0-09, Q0-09a, Q0-09b, Q0-10

16 questions total (10 core + 6 subs).
Most applicants see 10–12 depending on their answers.

---

## PLAYWRIGHT VERIFICATION

After all tasks:

```bash
pkill -f "next dev" || true && sleep 2 && rm -rf .next && npm run dev &
sleep 15
```

```
 run these checks:

CHECK 1 — Treaty country hard stop
Navigate to localhost:3000/quiz
Type "North Korea" in the country field
Confirm: PR-01 hard stop fires immediately
Screenshot

CHECK 2 — Question counter accuracy
Navigate through first 5 questions
Select options that trigger no sub-questions
Confirm: counter shows "Question 1 of 10", "2 of 10" etc
Never higher current than total
Screenshot each question

CHECK 3 — Back button position
Screenshot question 3
Confirm: back button is at BOTTOM LEFT
No back button at top of page
Screenshot

CHECK 4 — Family composition → correct pricing
Complete quiz with:
  Q0-01: Canada
  Q0-02: I am the principal applicant
  Q0-03: Me, my spouse, and our children
  Q0-04: No — sole investor
  Q0-05: From my home country
  Q0-06: Personal savings
  Q0-07: Over $150,000
  Q0-08: Specific business → franchise
  Q0-09: None of the above
  Q0-10: Property + Financial accounts

Reach results page
Confirm: recommended package shows "Solo + Family — $750"
NOT "Solo Individual — $550"
Screenshot results pricing section

CHECK 5 — Partnership detection
Complete quiz selecting Q0-04: "Yes — one business partner, 50/50"
Reach results page
Confirm: application type shows "Partnership"
Confirm: recommended package shows "Partnership — $997"
Screenshot

CHECK 6 — localhost:3000/pricing
Confirm: pricing page loads without error
Confirm: tier cards show correct prices ($550, $697, $750 etc)
NOT old prices ($297, $347 etc)
Screenshot

CHECK 7 — Hard stop PR-06b
Select "more than one partner" in Q0-04
Confirm: hard stop fires with 9 FAM explanation
Screenshot
```

---

## COMMITS

One commit per task:
```
fix: quiz — Q0-01 treaty country hard stop now works
feat: quiz — full question rebuild v5.0 (10 core questions)
fix: quiz — question counter dynamic, back button bottom position
fix: quiz — handleComplete reads correct question IDs
fix: pricing-tier — correct prices and family status mapping
fix: PricingClient — partnership detection, Q0-03 dependents, remove DEFAULT_TIERS
fix: results — getPricingFromAnswers reads correct fields
```

---

## ON COMPLETION

Update BUILD_TRACKER.md:
- Quiz v5.0 rebuild: ✅ COMPLETE
- All 17 confirmed bugs: ✅ RESOLVED
- Pricing chain: ✅ WORKING END TO END

Run: npm run build — must compile clean, zero errors.

Report:
1. Which questions are now in the visible flow
2. Confirm pricing chain works end to end (quiz → results → pricing)
3. Any edge cases discovered during build
