# E2go — Session: Quiz Fixes
## Session file for Claude Code
**Date:** June 9, 2026
**Branch:** dev
**Estimated time:** 2–3 hours
**Status:** Ready to build

---

## BEFORE YOU START — READ IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/module0_questions.md
cat docs/module0_scoring_logic.md
```

Then read the actual quiz source:
```bash
cat src/app/quiz/page.tsx
```

Find the results page:
```bash
find src -name "*.tsx" -path "*/results*" | head -5
# then cat whichever file contains the timeline / weeks display
```

Do not write a single line of code until all of the above are read.
Confirm reading complete before proceeding.

---

## GROUND RULES

1. No rounded corners. No glassmorphism. No gradients. No blue borders
   on selected options — use gold (#C9A84C) border instead.
2. Read DESIGN_REFERENCE.html before touching any styles.
3. Do not touch the generation engine, Module 3, or any files outside
   the quiz and results page.
4. The scoring logic in module0_scoring_logic.json must be updated
   to reflect new questions. Do not break existing scoring.
5. Full output on every modified file. No truncation.
6. Test at 390px (mobile) and 1440px (desktop).
7. No Magic MCP.

---

## ALSO FIX — BLUE SELECTED BORDER

Looking at the screenshots: selected options have a BLUE border.
This violates the design system. Gold only.

Find every instance where the selected option border is blue
and change to:
```css
border: 1px solid #C9A84C;
```

This is a quick find-and-replace but must not be missed.

---

## TASK 1 — SPLIT THE FAMILY TIES QUESTION INTO TWO

### Current state
One question: "Will close family remain in your home country?"
One option bundles: "Yes — spouse, children, parents, or siblings staying"

### Why this is wrong
Spouse and children staying behind = they are NOT E-2 dependents.
That is a completely different situation from parents/siblings staying.
The scoring and document implications are entirely different.

### Fix — Replace with two sequential questions

**Remove** the current family ties question entirely.

**Add Question A — Nuclear family travel plan**
Question ID: Q0-13a
Category: HOME TIES
Question text: "Are your spouse and children moving to the US with you?"
Helper text: "This determines who will be included in your E-2
application as dependents."

Options:
- Yes — my spouse and children are moving with me
- My spouse is moving with me, children staying in home country
- Spouse and children are staying — I am moving alone initially
- Not applicable — I have no spouse or children

Scoring impact:
- "Spouse and children staying" → adds moderate immigrant intent
  mitigation flag (they have family abroad) but also raises a
  question about dependent separation
- "Moving alone initially" → note this in case brief for
  cover letter: applicant establishing business before family joins

**Add Question B — Extended family home country ties**
Question ID: Q0-13b
Category: HOME TIES
Question text: "Do you have parents, siblings, or other close
family who will remain in [home_country] after you move?"
Helper text: "The consulate scores ties to your home country.
Extended family remaining is one of the strongest signals of
non-immigrant intent."

Options:
- Yes — parents remaining
- Yes — siblings remaining
- Yes — parents and siblings remaining
- Yes — other close family remaining
- No — no extended family remaining in home country

Scoring impact:
- Any "Yes" option → strong positive home ties signal
  (existing scoring logic for home country ties)
- "No extended family" → flag for stronger ties documentation
  needed in other categories

### Scoring logic update
In module0_scoring_logic.json, find the existing family ties
scoring entry and split it into two separate entries for
Q0-13a and Q0-13b. Preserve all existing score values —
just route them to the correct new question IDs.

---

## TASK 2 — FIX THE BUSINESS PARTNER QUESTION

### Current problems

**Problem A:** Advisory says "A 49/51 split disqualifies the
minority partner — the 50/50 requirement is strict."
This is LEGALLY INCORRECT for spousal partnerships.
A spouse who is a minority owner in a business operated by
the principal applicant can still qualify. The 50/50 strict
requirement applies to unrelated partners, not spouses.

**Problem B:** No question asking whether the partner is
the applicant's spouse.

**Problem C:** No question asking who is the principal
applicant when the applicant is married.

### Fix A — Update the existing partnership question

Update the advisory block text from:
"A 49/51 split or any other unequal ownership disqualifies
the minority partner. The 50/50 requirement is strict."

To:
"For unrelated partners: each investor must own exactly 50%
to qualify independently. For spousal partnerships: the
principal applicant must be the owner-operator with majority
or equal control — the spouse's ownership percentage is more
flexible as long as the applicant clearly develops and directs
the business."

Update options to be more accurate. Replace:
- "Yes — one partner, confirmed 50/50 ownership"
- "Yes — ownership split not yet decided"
- "Yes — more than one partner"

With:
- "Yes — one partner, 50/50 ownership"
- "Yes — one partner, my spouse (any ownership split)"
- "Yes — one partner, ownership split not yet decided"
- "Yes — more than one partner (attorney review required)"

### Fix B — Add spousal partner follow-up

After "Yes — one partner, my spouse" is selected, show
a follow-up question inline (same screen, revealed below
the selection):

Question ID: Q0-14b
"What will be your spouse's role in the business?"

Options:
- Active co-operator — managing the business with me
- Silent investor — ownership stake, not day-to-day involved
- Not yet decided

Helper text: "A spouse who is a silent investor can hold a
minority stake. A spouse who co-operates the business
alongside you may qualify for their own E-2 status."

Scoring: if "Silent investor" → no attorney flag needed.
If "Active co-operator" → advisory that spouse may qualify
independently for E-2 and their qualifications need to be
documented separately.

### Fix C — Add principal applicant question

This question fires when marital status = married AND
no partnership selected (solo application with a spouse).

Insert after the marital status question (or after spouse
dependents confirmation), before business type:

Question ID: Q0-03a
Category: FAMILY
Question text: "Who is the primary E-2 applicant?"
Helper text: "If you are married, one spouse is the principal
applicant whose qualifications, investment, and business
experience lead the application. The other spouse applies
as a dependent — or independently if they are also investing."

Options:
- I am — I am filling out this form as the principal applicant
- My spouse is the principal applicant — I am completing
  this on their behalf
- We are applying as co-investors (partnership application)

Routing:
- "I am" → continue normally, spouse added as dependent
- "My spouse is" → note in application that the person
  completing the form is doing so on behalf of the principal.
  All questions should be answered from the principal's
  perspective. Add advisory: "Answer all questions as
  they apply to your spouse — their qualifications,
  their investment, their role in the business."
- "Co-investors" → route to partnership flow

---

## TASK 3 — TIMELINE: WEEKS TO MONTHS

### Location
Find the results page component that renders "16 — 22 weeks".
This is likely in src/app/results/page.tsx or a component
it imports.

### Fix — Calculate and display month names

Replace the static "16 — 22 weeks" display with a dynamic
calculation:

```typescript
function getInterviewMonthRange(weeksMin: number, weeksMax: number): string {
  const today = new Date();

  const earliestDate = new Date(today);
  earliestDate.setDate(today.getDate() + weeksMin * 7);

  const latestDate = new Date(today);
  latestDate.setDate(today.getDate() + weeksMax * 7);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const earliestMonth = monthNames[earliestDate.getMonth()];
  const latestMonth = monthNames[latestDate.getMonth()];
  const earliestYear = earliestDate.getFullYear();
  const latestYear = latestDate.getFullYear();

  // If same month
  if (earliestMonth === latestMonth && earliestYear === latestYear) {
    return `${earliestMonth} ${earliestYear}`;
  }

  // If same year
  if (earliestYear === latestYear) {
    return `${earliestMonth} — ${latestMonth} ${earliestYear}`;
  }

  // Different years
  return `${earliestMonth} ${earliestYear} — ${latestMonth} ${latestYear}`;
}
```

Replace the display:
```tsx
// REMOVE:
<div>16 — 22 weeks</div>

// REPLACE WITH:
<div>{getInterviewMonthRange(weeksMin, weeksMax)}</div>
```

Where `weeksMin` and `weeksMax` come from the scoring output
(currently hardcoded as 16 and 22 — keep that logic, just
change the display format).

Update the subtitle text from:
"Estimated from today to your consulate interview, based on
your profile and current processing times."

To:
"Your estimated interview window, based on your profile and
current Toronto consulate processing times. Calculated from
today, [formatted today's date]."

Format today's date as: "June 9, 2026"

```typescript
function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}
```

---

## TASK 4 — BACK BUTTON VISIBILITY

### Current state
Back button exists as "← Back" in small muted grey text,
positioned between helper text and answer options.
Difficult to see, especially on mobile.

### Fix — Reposition and restyle

**Position:** Move to TOP LEFT of each question screen,
above the question text. Not between helper text and options.

**Style:** Keep as text link (not a button shape), but
increase visibility:
```typescript
backButton: {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 400,
  letterSpacing: '0.04em',
  color: 'rgba(245,240,232,0.55)',  // warmer and more visible
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  marginBottom: '24px',  // space before question text
  fontFamily: "'DM Sans', sans-serif",
}
```

Hover state: color bumps to rgba(245,240,232,0.85)

The arrow character stays as ← — no icon library needed.

**Mobile:** Same position. The 13px size is readable at 390px.
Minimum touch target: wrap in a div with padding-top: 8px,
padding-bottom: 8px so the tap area is adequate.

### Also — Back button on results page

The results page currently has no visible way to go back
and change answers. Add a text link above the fold on the
results page:

```tsx
<button
  style={styles.editAnswersLink}
  onClick={() => router.push('/quiz/review')}
>
  ← Review or change my answers
</button>
```

Style:
```typescript
editAnswersLink: {
  fontSize: '13px',
  color: 'rgba(245,240,232,0.45)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  padding: '0',
  marginBottom: '32px',
  fontFamily: "'DM Sans', sans-serif",
  display: 'block',
}
```

---

## TASK 5 — QUIZ REVIEW PAGE

### New file
`src/app/quiz/review/page.tsx`

### What it does
Shows all quiz questions and the applicant's saved answers
in a condensed list. The applicant can tap any question to
jump directly to it, change their answer, and return to the
results page with recalculated scoring.

### Layout

**Header:**
```
← Back to results

Review your answers
Change any answer below — your results will update automatically.
```

**Question list:**
Each answered question shown as a compact card:
- Category label (small caps, gold, top left)
- Question text (truncated to one line if long)
- Current answer (shown in gold)
- "Change →" link on the right

Cards are grouped by category (ELIGIBILITY, INVESTMENT,
BUSINESS, FAMILY, HOME TIES) with a section label before
each group.

**Unanswered questions:**
Show with a muted "Not answered" label and "Answer →" link.

### Implementation

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QuizReview() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved quiz answers from localStorage or Supabase
    // Use whichever storage mechanism the quiz currently uses
    const saved = localStorage.getItem('quiz_answers');
    if (saved) {
      setAnswers(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const handleJumpToQuestion = (questionIndex: number) => {
    // Store the target question index
    localStorage.setItem('quiz_jump_to', String(questionIndex));
    router.push('/quiz');
  };

  // ... render question list
}
```

**Quiz page modification:**
When the quiz page loads, check for `quiz_jump_to` in localStorage.
If present, start at that question index instead of question 0.
Clear `quiz_jump_to` after reading it.
When the quiz is completed or the user navigates away from the
quiz after answering the jumped-to question, return to `/results`
(not to question 1).

```typescript
// In quiz page useEffect on mount:
const jumpTo = localStorage.getItem('quiz_jump_to');
if (jumpTo) {
  setCurrentQuestionIndex(parseInt(jumpTo));
  localStorage.removeItem('quiz_jump_to');
  setReturnToResults(true); // flag to redirect back to results after answer
}
```

After submitting an answer when `returnToResults` is true:
```typescript
if (returnToResults) {
  router.push('/results');
  return;
}
```

### Read the current quiz storage mechanism first

Before implementing, check how the quiz currently saves answers:
```bash
grep -n "localStorage\|sessionStorage\|supabase.*answers\|quiz_answers" \
  src/app/quiz/page.tsx | head -20
```

Use whatever mechanism is already in place. Do not introduce
a second storage mechanism.

---

## QUESTION ORDER NOTE

The two new questions (Q0-03a and Q0-13a/b) need to be inserted
at the correct positions in the quiz flow.

**Q0-03a (principal applicant)** — insert after the marital
status question. Check what question ID the marital status
question currently has and insert Q0-03a immediately after it.
Only show if marital status answer is "Married" or "Common Law".

**Q0-13a and Q0-13b (family split)** — replace the existing
family ties question entirely. Q0-13a fires first (nuclear family
travel plan), Q0-13b fires immediately after regardless of Q0-13a
answer (extended family ties).

Find current question order:
```bash
grep -n "id:\|question_id:\|Q0-" src/app/quiz/page.tsx | head -40
# or
grep -n "Q0-" docs/module0_questions.md | head -30
```

Insert at the correct index in the questions array.

---

## PLAYWRIGHT VERIFICATION

After all tasks complete:

```bash
pkill -f "next dev" || true && sleep 2 && rm -rf .next && npm run dev &
sleep 15
```

```
Use Playwright to screenshot:

1. localhost:3000/quiz — navigate to the family ties question.
   Confirm: two separate questions, no combined spouse/sibling option.
   Screenshot both Q0-13a and Q0-13b.

2. Navigate to the business partner question.
   Confirm: spousal partner option exists, advisory text is corrected,
   no mention of strict 50/50 for spousal partnerships.
   Screenshot.

3. Navigate to localhost:3000/results.
   Confirm: month names displayed (not weeks), "Review or change
   my answers" link visible, back button visible and warm white.
   Screenshot at 390px and 1440px.

4. Click "Review or change my answers".
   Confirm: /quiz/review loads, all answered questions listed,
   each has a "Change →" link.
   Screenshot.

5. Click "Change →" on any question.
   Confirm: quiz loads at the correct question index.
   Screenshot.

6. Check every question in the quiz for selected option border.
   Confirm: gold border, not blue. Screenshot a selected option.
```

---

## COMMITS

One commit per task:
- `fix: quiz — split family ties into nuclear and extended questions`
- `fix: quiz — spousal partnership question and principal applicant`
- `fix: results — timeline displays month names not weeks`
- `fix: quiz — back button repositioned and visible`
- `feat: quiz — review page with jump-to-question editing`
- `fix: quiz — selected option border gold not blue`

---

## ON COMPLETION

Update BUILD_TRACKER.md:
- Quiz family question fix: ✅
- Quiz spousal partnership and principal applicant: ✅
- Results timeline month calculation: ✅
- Back button visibility: ✅
- Quiz review / edit page: ✅
- Selected option border fix: ✅

Run: npm run build — must compile clean with zero errors.

Note any scoring logic changes made to module0_scoring_logic.json
in the build summary so they can be reviewed.
