# Module 0 Quiz — Version 3.0 Update
## Claude Code Prompt
## e2go.app | May 31, 2026

---

start session

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md before starting.
All work on dev branch. One file per commit (Rule 11).
Run npm run build:clean after all tasks complete.

---

## CONTEXT

The Module 0 eligibility quiz is currently version 2.1.
It is Canada-only and assumes users have made business
decisions most users have not yet made.

This session upgrades it to version 3.0:
- Global (82 treaty countries — not Canada only)
- Stage-aware (works for users at all stages of planning)
- Intelligently reframed questions that meet users where they are

The current quiz JSON is locked at v2.1 in:
public/data/module0_questions.json
public/data/module0_scoring_logic.json

The new v3.0 spec is in:
docs/module0_questions_v3.md

Read that file completely before doing anything else.

---

## TASK 1 — Read Before Writing

Before writing a single line of code or JSON:

1. Read docs/module0_questions_v3.md completely
2. Read public/data/module0_questions.json (current v2.1)
3. Read public/data/module0_scoring_logic.json (current v2.1)
4. Read docs/E2_Platform_Logic_Rules.md
   (for nationality routing logic and consulate assignments)
5. Read docs/E2_Franchise_Categories_Section5.md
   (for franchise tier routing logic)

Report: "All source files read. Ready to begin."

---

## TASK 2 — Create New JSON Files

Do NOT modify the existing v2.1 files.
Create new files at:

public/data/module0_questions_v3.json
public/data/module0_scoring_logic_v3.json

The v2.1 files stay in place and keep working until v3.0
is tested and approved. Only then will the app be switched.

---

## TASK 3 — Build module0_questions_v3.json

Build the complete JSON for all 26 questions from
docs/module0_questions_v3.md.

Follow the exact same JSON structure as the v2.1 file —
same field names, same patterns — so the quiz component
does not need to change.

New fields needed that did not exist in v2.1:

1. "treaty_check": true/false
   On Q0-01 — tells the quiz component to run the
   nationality against the treaty countries list.

2. "show_sub_question": { condition, question_id }
   On Q0-10 and Q0-16 — conditional follow-up questions
   that appear based on the selected option.

3. "stage_routing": "A" | "B" | "C" | "D"
   On Q0-04 — tells the app which stage the user is at.
   Stage A = early explorer, Stage D = ready to apply.
   This affects dashboard messaging and urgency weighting.

4. "consulate_route": true
   On Q0-03 — triggers consulate assignment from
   E2_Platform_Logic_Rules.md after nationality confirmed.

5. "tax_advisory": true
   On Q0-STATE — triggers state-specific tax advisory
   on results page.

6. "urgency_weight": 1-4
   On Q0-TIMELINE — feeds urgency weighting in checklist.
   1 = early planning, 4 = urgent (within 3 months).

Complete question structure example for reference:
{
  "id": "Q0-01",
  "version": "3.0",
  "type": "searchable_select",
  "section": "who_you_are",
  "question": "Which country are you a citizen of?",
  "display_note": "The E-2 visa is available to citizens of countries that have a qualifying treaty with the United States. Start typing your country to see if you qualify.",
  "treaty_check": true,
  "tooltip": "This matters because the E-2 visa is only available to people who hold citizenship — not just residency — in a country that has a qualifying treaty with the United States. There are currently 82 qualifying countries.",
  "options": "TREATY_COUNTRY_LIST",
  "special_options": [
    "I am a permanent resident, not a citizen"
  ],
  "stop_codes": ["PR-01"],
  "warning_codes": [],
  "attorney_codes": ["W-PERMANENT-RESIDENT"],
  "special_handling": {
    "India": "PR-01-INDIA",
    "China": "PR-01-CHINA",
    "Russia": "PR-01-RUSSIA",
    "Iran": "PR-01-IRAN",
    "Australia": "W-E3-ALTERNATIVE"
  }
}

Build all 26 questions following this pattern.
Use the exact question text, options, tooltips,
warning messages, and routing logic from
docs/module0_questions_v3.md.

Do not paraphrase or shorten any question text.
Do not paraphrase or shorten any warning message text.
The exact wording in the spec is final — it was
carefully written to meet users at their stage.

---

## TASK 4 — Build module0_scoring_logic_v3.json

Build the complete scoring logic JSON.

Follow the same structure as v2.1 module0_scoring_logic.json.

Key updates from v2.1:

1. NATIONALITY SCORING (new)
   Treaty country → proceed
   Non-treaty → DO_NOT_PROCEED PR-01
   Country-specific routing per E2_Platform_Logic_Rules.md

2. STAGE ROUTING (new)
   From Q0-04 — set user_stage A/B/C/D
   Affects: dashboard urgency, checklist prioritization,
   results page messaging

3. APPLICATION TYPE ROUTING (updated)
   Q0-09 solo → application_type = "solo"
   Q0-09 one partner → application_type = "partnership"
   Q0-09 more than two → DO_NOT_PROCEED PR-06
   Q0-09 undecided → application_type = "undecided"

4. BUSINESS TYPE ROUTING (new)
   Q0-10 franchise → business_type = "franchise"
             show tier rating from franchise categories
   Q0-10 existing business → business_type = "acquisition"
   Q0-10 new business → business_type = "startup"
   Q0-10 property → DO_NOT_PROCEED PR-07
   Q0-10 cannabis → DO_NOT_PROCEED PR-08
   Q0-10 no management → DO_NOT_PROCEED PR-05
   Q0-10 still exploring → business_type = "undecided"

5. PRIOR E-2 ROUTING (new from Q0-E2)
   First time → application_subtype = "new"
   Previously approved → application_subtype = "renewal_candidate"
   Previously denied → flag W-E2-DENIED + attorney recommended
   Currently pending → flag W-E2-PENDING + attorney recommended

6. STATE ROUTING (new from Q0-STATE)
   Texas/Florida/Nevada/Washington/Wyoming → no_state_income_tax = true
   California/New York → high_tax_advisory = true
   All states → licensing_state = [selected state]

7. TIMELINE ROUTING (new from Q0-TIMELINE)
   Within 3 months → urgency_weight = 4, flag W-TIMELINE-URGENT
   3-6 months → urgency_weight = 3
   6-12 months → urgency_weight = 2
   1-2 years → urgency_weight = 1
   Early planning → urgency_weight = 1

8. NON-IMMIGRANT INTENT COMPOSITE (updated)
   Same logic as v2.1 but uses home country language
   not Canada-specific language.
   confirmed_ties calculated from Q0-NI-01, Q0-NI-02, Q0-NI-03
   3 ties → intent_risk = low
   2 ties → intent_risk = medium
   1 tie → PROCEED_RISK W-NI-WEAK
   0 ties → ATTORNEY_RECOMMENDED W-NI-NONE

9. INVESTMENT THRESHOLDS (updated multi-currency)
   All amounts converted to USD before threshold check
   $150,000+ USD → clean
   $75,000–$149,999 USD → W-PROP-SOFT
   Below $75,000 USD → W-PROP-STRONG

Keep all existing v2.1 hard stop codes and warning codes.
Add new codes:
   PR-01-INDIA, PR-01-CHINA, PR-01-RUSSIA, PR-01-IRAN
   W-E2-DENIED, W-E2-PENDING
   W-E3-ALTERNATIVE (Australian users)
   W-TIMELINE-URGENT
   W-COMMONLAW
   W-17-NATIONALITY
   W-NI-WEAK (already in v2.1 — verify preserved)
   W-NI-NONE (already in v2.1 — verify preserved)

---

## TASK 5 — Create Treaty Countries Data File

Create: public/data/treaty_countries.json

This file powers Q0-01 nationality validation.
Structure:

{
  "last_updated": "2026-05-31",
  "source": "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/treaty.html",
  "countries": [
    {
      "name": "Canada",
      "code": "CA",
      "treaty_date": "1994-01-01",
      "treaty_basis": "USMCA (formerly NAFTA)",
      "default_consulate": "Toronto",
      "consulate_city": "Toronto",
      "consulate_note": null,
      "visa_validity_years": 5,
      "appointment_system": "AIS",
      "processing_weeks_est": "4-6",
      "special_flags": []
    },
    {
      "name": "United Kingdom",
      "code": "GB",
      "treaty_date": "1815-07-03",
      "treaty_basis": "Treaty of Commerce and Navigation 1815",
      "default_consulate": "London",
      "consulate_city": "London",
      "consulate_note": "20MB upload cap",
      "visa_validity_years": 5,
      "appointment_system": "CGI Federal",
      "processing_weeks_est": "8-16",
      "special_flags": ["london_upload_cap"]
    },
    {
      "name": "Australia",
      "code": "AU",
      "treaty_date": "1991-12-27",
      "treaty_basis": "Australia-US Free Trade Agreement",
      "default_consulate": "Sydney",
      "consulate_city": "Sydney",
      "consulate_note": "E-3 visa alternative available",
      "visa_validity_years": 5,
      "appointment_system": "CGI Federal",
      "processing_weeks_est": "4-8",
      "special_flags": ["e3_alternative"]
    },
    {
      "name": "Germany",
      "code": "DE",
      "treaty_date": "1956-07-14",
      "treaty_basis": "Treaty of Friendship, Commerce and Navigation",
      "default_consulate": "Frankfurt",
      "consulate_city": "Frankfurt",
      "consulate_note": "30-page limit, 5MB, executive summary business plan only",
      "visa_validity_years": 5,
      "appointment_system": "CGI Federal",
      "processing_weeks_est": "4-8",
      "special_flags": ["frankfurt_30_page_limit", "frankfurt_5mb_limit", "frankfurt_exec_summary_only"]
    }
  ],
  "non_treaty_countries": [
    {
      "name": "India",
      "code": "IN",
      "message_key": "PR-01-INDIA",
      "alternatives": ["EB-5", "citizenship_by_investment"]
    },
    {
      "name": "China",
      "code": "CN",
      "message_key": "PR-01-CHINA",
      "taiwan_note": true,
      "alternatives": ["EB-5", "citizenship_by_investment"]
    },
    {
      "name": "Russia",
      "code": "RU",
      "message_key": "PR-01-RUSSIA",
      "alternatives": ["EB-5"]
    },
    {
      "name": "Brazil",
      "code": "BR",
      "message_key": "PR-01-GENERIC",
      "alternatives": ["EB-5", "citizenship_by_investment"]
    }
  ],
  "restricted_countries": [
    {
      "name": "Iran",
      "code": "IR",
      "treaty_exists": true,
      "processing_available": false,
      "message_key": "PR-01-IRAN",
      "alternatives": ["citizenship_by_investment"]
    },
    {
      "name": "Ukraine",
      "code": "UA",
      "treaty_exists": true,
      "processing_available": "restricted",
      "message_key": "W-UKRAINE-RESTRICTED",
      "verify_current": true
    }
  ]
}

Include ALL 82 treaty countries following the same
structure as the Canada and UK examples above.
Source data from:
docs/E2_Global_Consulate_Intelligence_Report_Part1.md

---

## TASK 6 — Update Quiz Component

The quiz component at src/app/quiz/page.tsx needs
to handle the new question types and fields.

Updates required:

1. searchable_select type
   New question type for Q0-01
   Renders a searchable dropdown that filters countries
   as the user types
   On selection, runs treaty_check against
   public/data/treaty_countries.json
   Shows treaty status immediately (green check or red X)

2. Sub-question rendering
   For Q0-10 and Q0-16 — conditional follow-up questions
   Animate in smoothly when a triggering option is selected
   Treat as part of the same question step — not a new page

3. Currency input update
   Q0-05 now supports multiple currencies
   Currency selector shows common currencies first:
   USD, CAD, GBP, AUD, EUR, then rest alphabetically
   Conversion to USD happens client-side using cached rate
   Show converted amount in small text below: "≈ $X USD"

4. State selector
   Q0-STATE renders a U.S. state dropdown
   Same searchable pattern as Q0-01
   "I haven't decided yet" as first option

5. Version tagging
   Save quiz_version = "3.0" with every quiz session
   to Supabase quiz_sessions table

DO NOT change the quiz flow, animation, or progress
indicator. Only update the component to handle the
new field types listed above.

---

## TASK 7 — Update Results Page

The results page at src/app/results/page.tsx needs
to display new personalised context from v3.0 data.

Updates required:

1. Show applicant's nationality and consulate
   "Based on your [nationality] citizenship,
   your application will be processed at the
   U.S. Consulate in [city]."

2. Show state-specific advisory if applicable
   Texas/Florida/Nevada → "Good news — [state] has
   no state income tax, which simplifies your U.S.
   tax picture."
   California/New York → "Note: [state] has significant
   state income tax. We recommend engaging a cross-border
   CPA early in your planning."

3. Show E-3 advisory for Australian applicants
   "As an Australian citizen, you are also eligible for
   the E-3 visa (for skilled workers). This may be worth
   exploring alongside E-2 depending on your situation."

4. Show urgency messaging based on Q0-TIMELINE
   Within 3 months → "Your timeline is ambitious.
   We have prioritized your most urgent steps at the
   top of your dashboard."
   6-12 months → "Your timeline gives you good runway
   to prepare thoroughly."

5. Show application type confirmation
   Solo → "You are applying as an individual investor."
   Partnership → "You are applying as part of a
   two-investor partnership. Both partners will need
   their own documents."

6. Show business status
   If franchise selected → show Tier rating from
   E2_Franchise_Categories_Section5.md with brief note
   If still exploring → "Module 2 will help you find
   the right business for your background and budget."

These additions appear in the existing results
layout — do not redesign the page. Add the new
contextual information as additional cards or
sections within the existing design.

---

## TASK 8 — Update CLAUDE_CONTEXT.md

Add to Architecture Decisions — Locked:

"Quiz versioning:
v2.1 files remain at public/data/module0_questions.json
and public/data/module0_scoring_logic.json — do not delete.
v3.0 files are at public/data/module0_questions_v3.json
and public/data/module0_scoring_logic_v3.json.
Treaty countries data at public/data/treaty_countries.json.
Switch the quiz component to use v3.0 files only after
full testing confirmed on dev Vercel preview.
Never delete v2.1 files — keep for rollback."

Add to KNOWN ISSUES section:
"Quiz v2.1 is Canada-only — v3.0 in progress.
Do not build any Module 3 features that assume Canadian
citizenship — use nationality data from quiz session."

---

## TASK 9 — Update BUILD_TRACKER.md

Mark Module 0 quiz v2.1 as:
⚠️ IN REVISION — v3.0 in progress

Add to In Progress:
"Module 0 quiz v3.0 — global rewrite
- 26 questions (up from 22)
- Global treaty country selector (82 countries)
- Stage-aware framing for all business questions
- Prior E-2 history question (new)
- Target U.S. state question (new)
- Target timeline question (new)
- Multi-currency investment amount
- New question types: searchable_select, sub_question
- Treaty countries JSON data file
- Updated results page with contextual output"

Add to Session 8 priorities (top of list):
"1. Test quiz v3.0 on dev Vercel — all 26 questions
   2. Verify treaty country routing for Canada, UK,
      Australia, Germany, India (block), China (block)
   3. Verify hard stops PR-01 through PR-08 all trigger
   4. Verify partnership routing sets application_type correctly
   5. Verify results page shows nationality and consulate"

---

## TASK 10 — Testing Before Push

Before pushing, manually trace these scenarios:

SCENARIO 1 — Canadian solo new applicant (Stage D)
Q0-01: Canada → proceed
Q0-02: Valid passport → proceed
Q0-03: In Canada → proceed
Q0-E2: First time → new application
Q0-04: Already committed → Stage D
Q0-05: $175,000 USD → clean, no flag
Q0-06: Full documentation → proceed
Q0-07: No loan → proceed
Q0-08: Running it myself → solo
Q0-09: On my own → solo flow
Q0-10: Franchise selected → Tier 1 shown
Q0-STATE: Texas → no income tax advisory
Q0-TIMELINE: 3-6 months → standard mode
Q0-11: Never → proceed
Q0-12: No → proceed
Q0-13: No → proceed
Q0-NI-01: Own home, keeping it → positive tie
Q0-NI-02: Family remaining → positive tie
Q0-NI-03: Keeping accounts → positive tie
Q0-16: Spouse and children → show family section
Q0-17: Same country → proceed
Q0-18: Valid passport → proceed
Q0-19: Under 21 → proceed
Q0-20: No history → proceed
Q0-21: Email → save
Expected result: PROCEED — no flags

SCENARIO 2 — Indian national (non-treaty)
Q0-01: India → DO_NOT_PROCEED PR-01-INDIA
Show India-specific message with EB-5 and
citizenship-by-investment alternatives.
Quiz should stop here. No further questions shown.

SCENARIO 3 — UK national, early explorer (Stage A)
Q0-01: United Kingdom → proceed
Q0-02: Valid → proceed
Q0-03: In UK → proceed
Q0-E2: First time → proceed
Q0-04: Still figuring it out → Stage A, W-04
Q0-05: Not sure yet / lowest amount → W-PROP-STRONG
Q0-06: Haven't thought through it → proceed
Q0-07: Haven't thought about it → proceed
Q0-08: Not sure yet → proceed
Q0-09: Haven't decided → proceed
Q0-10: Completely open → proceed
Q0-STATE: Haven't decided → proceed
Q0-TIMELINE: Early planning → urgency 1
Expected result: PROCEED_RISK — with friendly
messaging that acknowledges early stage and
invites them to continue building toward readiness.
Results page shows: London consulate, early planning
mode, no state advisory.

SCENARIO 4 — Three-way partnership hard stop
Q0-09: More than two → DO_NOT_PROCEED PR-06
Show warm message explaining the Negative Control
doctrine in plain English.

SCENARIO 5 — Canadian, sold home already
Q0-NI-01: Sold before moving → PROCEED_RISK W-NI-01
Show immigrant intent warning prominently.
Do not block — continue with flag.

All 5 scenarios must produce the correct outcome
before this task is complete.

---

Run npm run build:clean — zero errors zero warnings
Push to dev
Verify with git log --oneline (Rule 12)

Report: "Quiz v3.0 complete. Here is what was built:
[list all new and modified files with commit hashes]
Test scenarios: [pass/fail for each of the 5 scenarios]"

---

end session
