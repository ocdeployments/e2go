# SESSION: Quiz & Pricing Rebuild
## Date: 2026-06-10
## Branch: dev
## Build: Must be clean before every push — `npm run build`

---

## OVERVIEW

Rebuild the quiz engine and pricing system to use a data-driven JSON architecture instead of hardcoded questions. The JSON file becomes the single source of truth for questions, routing, warnings, hard stops, and scoring. The quiz page reads from JSON at runtime. Pricing tiers are recalculated from quiz answers.

---

## TASK LIST (execute in order)

### 1. Rebuild `public/data/module0_questions.json`

The current JSON is v4.0 and missing several questions that exist in the hardcoded `page.tsx` but NOT in the JSON. Add them.

**Missing from JSON that must be added:**

- **Q0-05a** — "How committed is your investment at this point?" (sub question, shows if Q0-04 is NOT over $150k or $100k-150k). 5 options with varying outcomes (ok/warn with specific messages).
- **Q0-09a** — "Is your US business an active, operating commercial enterprise?" (sub question). 5 options including stops for passive investment and non-profit.
- **Q0-14c** — "Do you own your share of the US business directly, or through a holding company, trust, or other entity?" (sub question, shows if Q0-15 has partner/spouse). 5 options.
- **Q0-14d** — "Even though your ownership may be below 50%, do you have documented control rights over the business?" (sub question, shows if Q0-14c is NOT direct ownership). 5 options.
- **Q0-14e** — "You and your partner hold different nationalities. Which country's treaty will be the basis for your E-2 application?" (sub question, shows if Q0-15 is 50/50 or multiple partners, and NOT spouse). 4 options.

**Also add missing `hard_stops` to JSON:**
- `PR-PASSIVE-INVEST` — stock portfolio / passive real estate
- `PR-NONPROFIT` — non-profit organisations

**Also add missing `warning_codes` to JSON:**
- `W-AGING-OUT` — children 18-20
- `W-OVER-21` — children 21+
- `W-PARTNERSHIP-SPLIT` — undecided partner split
- `W-MOVING-ALONE` — spouse/kids staying behind
- `W-PROPERTY-SALE` — selling property before interview
- `W-PROPERTY-UNDECIDED` — undecided on selling property
- `W-CLOSING-ACCOUNTS` — closing all home country accounts
- `W-NO-EXTENDED-FAMILY` — no extended family remaining
- `W-REFUSAL-OLD` — visa refusal >5 years ago
- `W-REFUSAL-RECENT` — visa refusal <5 years ago
- `W-REFUSAL-MULTIPLE` — multiple refusals
- `W-ENTRY-REFUSED` — refused entry at border
- `W-DEPORTED` — deported/removed
- `W-CONVICTION-OLD` — minor conviction >10 years
- `W-CONVICTION-RECENT` — minor conviction <10 years
- `W-CONVICTION-UNSURE` — unsure about admissibility

**JSON structure per question:**
```json
{
  "id": "Q0-XX",
  "type": "select|multiselect|searchable_country",
  "section": "eligibility|investment|business|history|home_ties|family",
  "question": "...",
  "helper_text": "...",
  "tooltip": "...",
  "is_sub": false,
  "parent": null,
  "show_if": null,
  "options": [
    { "text": "...", "action": "continue|stop|warn|attorney|sub:Q0-XX", "code": null, "warning_message": null }
  ],
  "warning_codes": {}
}
```

Option `action` values:
- `"continue"` — advance to next question
- `"stop:PR-XX"` — show hard stop screen
- `"warn:W-XX"` — show warning, then continue
- `"attorney:W-XX"` — flag for attorney review, then continue
- `"sub:Q0-XX"` — jump to specific sub question
- `"flag_franchise_interest"` — set franchise interest flag + continue
- `"flag_spouse_qualifications"` — set flag + continue
- `"flag_spouse_perspective"` — set flag + continue
- `"route_partnership"` — set flag + continue

---

### 2. Rewrite `src/app/quiz/page.tsx`

Replace the hardcoded `QUESTIONS` array with a JSON-driven engine.

**Architecture:**
- Fetch `module0_questions.json` at mount (or import as static data)
- `visibleQuestions` computed by evaluating `show_if` conditions against current answers
- Question rendering reads from JSON fields, not hardcoded objects
- All `HARD_STOPS` text comes from JSON `hard_stops` block
- Scoring uses JSON `score_weights` block

**Key behaviors to preserve:**
- Country search autocomplete (Q0-01)
- Multi-select with checkboxes (Q0-05)
- Sub-question routing via `show_if` conditions
- Warning display with continue-anyway button
- Hard stop screen with start-over
- Email gate for non-logged-in users
- Draft save/restore to localStorage
- Progress bar (question counter must match actual visible questions, not hardcoded 16)
- Section tabs with click-back navigation
- Back button (move from above question text to below the section label, before the question)
- Animation on question transition (opacity fade)

**Remove from hardcoded:**
- All `HARD_STOPS` constant — pull from JSON
- All `QUESTIONS` array — pull from JSON
- `CORE_QUESTION_COUNT` — derive from JSON length
- Inline scoring functions — use JSON `score_weights`

---

### 3. Fix `handleComplete` in `quiz/page.tsx`

The current `handleComplete` function must:
- Calculate score using `score_weights.deductions` from JSON (not flat `warnings.length * 4`)
- Each warning/attorney flag maps to a specific deduction weight
- `base_score` starts at 100, subtract each applicable deduction
- Determine outcome using JSON `outcomes` logic:
  - `DO_NOT_PROCEED` if any hard stop was triggered
  - `ATTORNEY_RECOMMENDED` if any `attorney_flag` codes exist
  - `PROCEED_RISK` if any `risk_flag` codes exist (warnings)
  - `PROCEED` if none of the above

**Pass structured data:**
```typescript
{
  outcome: string,
  score: number,
  warnings: string[],        // warning code array, not message strings
  attorney_flags: string[],  // attorney flag code array
  franchise_interest: boolean,
  answers: Record<string, Answer>,
  country: string,
  investment_range: string,
  application_type: 'solo' | 'partnership',
  dependents: string,
  hard_stops_triggered: string[]  // NEW — track which hard stops fired
}
```

---

### 4. Fix `pricing-tier.ts`

**Problem:** `getPricingTier` expects `family_status` as a simple string (`"none"`, `"spouse_only"`, `"spouse_and_children"`, `"children_only"`), but the quiz now stores the raw answer text from Q0-16 (e.g. `"Just me — no dependents"`, `"My spouse or partner"`, `"My spouse and children"`, `"My children only"`, `"Not decided yet"`).

**Fix:** Map the raw Q0-16 answer text to the internal family status before calling `getPricingTier`. Add a helper function:

```typescript
function mapFamilyStatus(q016Answer: string): string {
  if (!q016Answer || q016Answer.includes("Just me")) return "none";
  if (q016Answer.includes("spouse or partner")) return "spouse_only";
  if (q016Answer.includes("spouse and children")) return "spouse_and_children";
  if (q016Answer.includes("children only")) return "children_only";
  if (q016Answer.includes("Not decided")) return "not_decided";
  return "none";
}
```

Also: `getPricingTier` should accept the raw quiz result object and extract `application_type` from `answers["Q0-15"]` (checking if it contains "partner" or "spouse") instead of relying on a pre-computed `application_type` field.

---

### 5. Fix `PricingClient.tsx`

Read and understand the current `PricingClient.tsx`. It must:
- Read quiz results from localStorage key `e2go_quiz_result`
- Pass the full result object to `getPricingTier` (not just individual fields)
- Display the correct tier name, price, and features
- Handle the case where quiz data is missing (redirect to quiz or show fallback)
- Match the Obsidian Gold design system (#0a0a0a / #C9A84C / Cormorant Garamond / DM Sans)

---

### 6. Fix the Counter

The progress counter in `quiz/page.tsx` currently shows `Question {cur + 1} of {CORE_QUESTION_COUNT}` where `CORE_QUESTION_COUNT` is hardcoded to 16.

**Fix:** Derive the total from the actual visible questions length:
```typescript
<div>Question {cur + 1} of {visibleQuestions.length}</div>
```

This ensures the counter accurately reflects sub-questions that may or may not be shown.

---

### 7. Move the Back Button

Currently the back button (`← Back`) is rendered ABOVE the question text, inside the padding div.

**Move it to:** Below the section label (`Section X of 6 — SectionName`) and above the question text. The visual order should be:

1. Section label (e.g. "Section 2 of 6 — Investment")
2. Back button (← Back)
3. Question text
4. Helper text
5. Options

---

## DESIGN SYSTEM (non-negotiable)

- Background: `#0a0a0a`
- Accent: `#C9A84C` (gold)
- Text primary: `#f5f0e8`
- Text muted: `rgba(245,240,232,0.55)` or `rgba(245,240,232,0.45)`
- Heading font: `'Cormorant Garamond', Georgia, serif`
- Body font: `'DM Sans', system-ui, sans-serif`
- Border radius: 0 (sharp corners everywhere)
- Borders: `1px solid rgba(201,168,76,0.1)` to `rgba(201,168,76,0.35)`

---

## FILE MANIFEST

| File | Action |
|------|--------|
| `public/data/module0_questions.json` | Rewrite — add missing questions, hard stops, warnings, score weights |
| `src/app/quiz/page.tsx` | Rewrite — JSON-driven engine, fix counter, move back button, fix handleComplete |
| `src/lib/pricing-tier.ts` | Fix — add answer-to-status mapper, accept raw quiz data |
| `src/app/pricing/PricingClient.tsx` | Fix — use new pricing tier logic, verify design |
| `src/app/pricing/page.tsx` | Verify — no changes expected |

---

## VERIFICATION

After all changes:
1. `npm run build` must pass with zero errors
2. Walk through quiz manually — verify every question renders from JSON
3. Verify sub-questions appear/disappear based on answers
4. Verify hard stops trigger correctly (try: non-treaty country, no funds, under $50k)
5. Verify warnings display with correct messages
6. Verify progress counter matches actual question count
7. Verify back button appears in correct position
8. Complete quiz → verify pricing tier is correct for solo/partnership × family combinations
9. Check pricing page renders correctly at desktop and 390px mobile
