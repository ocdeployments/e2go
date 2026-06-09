# SESSION — Quiz + Results Page Complete Rebuild
**Branch:** dev
**Priority:** CRITICAL — complete rewrite of quiz and results page
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## RULES FOR THIS SESSION

1. Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md first. No exceptions.
2. Complete every step in order. Do not skip steps.
3. Do not use Playwright MCP. Do not take screenshots. Do not read image files.
4. Fix errors and continue — do not stop and ask.
5. `npm run build` must be clean before committing.
6. Use Sequential Thinking MCP to plan each major step before writing code.
7. Do not create new status files. Update BUILD_TRACKER.md only.

---

## DESIGN TOKENS — LOCKED. NEVER DEVIATE.

```
Background:   #0a0a0a
Gold:         #C9A84C
Text:         #f5f0e8
Muted text:   rgba(245,240,232,0.45)
Card border:  1px solid rgba(201,168,76,0.12)
Card bg:      rgba(201,168,76,0.02)
Input border: rgba(201,168,76,0.20)
Input focus:  1px solid #C9A84C
Heading font: 'Cormorant Garamond', Georgia, serif — weight 300
Body font:    'DM Sans', system-ui, sans-serif
Buttons:      NO border-radius — sharp edges always
Cards:        NO border-radius — sharp edges always
FORBIDDEN:    glassmorphism, teal #0D9488, rounded corners,
              gradients, shadows, blur effects
```

---

## CONTEXT

The quiz and results pages are being completely rewritten.

**Problems with current quiz:**
- Hardcoded Canadian-only content — app is global (82 treaty countries)
- Email question blocks logged-in users
- Sub-question array check was broken
- Quiz save was silently failing
- Rate limiter was blocking login during dev testing
- Too many questions — trimmed to 14 core + 3 conditional

**Problems with current results page:**
- Reads only from localStorage — not Supabase
- No score display
- No personalised flags
- No timeline
- No franchise broker card
- No pricing pre-selection

**The auth problem that caused hours of debugging:**
The login page rate limiter (5 attempts per IP per 15 min)
was blocking dev testing. The fix is already in place:
`if (pathname === '/login' && process.env.NODE_ENV === 'production')`
— rate limiter only runs in production.

DO NOT touch src/middleware.ts in this session.

---

## STEP 1 — VERIFY CURRENT STATE

```bash
cd ~/E2-go
git status
npm run build 2>&1 | tail -5
```

Confirm build is clean before proceeding.
If build fails, fix errors before continuing.

---

## STEP 2 — REWRITE public/data/module0_questions.json

Replace the entire file with the global question set below.
This is a complete replacement — not a patch.

The question set is 14 core questions + 3 conditional sub-questions.
Q1 uses a searchable country selector (type: "searchable_country").
All Canadian-specific language replaced with [home_country] dynamic token.

```bash
cat > public/data/module0_questions.json << 'ENDJSON'
{
  "module": "module0",
  "version": "4.0",
  "last_updated": "2026-06-09",
  "questions": [
    {
      "id": "Q0-01",
      "type": "searchable_country",
      "section": "eligibility",
      "question": "What is your citizenship?",
      "helper_text": "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify.",
      "tooltip": "There are 82 E-2 treaty countries. Dual citizenship in any treaty country qualifies you.",
      "options": [],
      "routing": {
        "treaty_country": "continue",
        "non_treaty": "stop:PR-01",
        "permanent_resident_only": "stop:PR-01"
      }
    },
    {
      "id": "Q0-02",
      "type": "select",
      "section": "eligibility",
      "question": "Where are you applying from?",
      "helper_text": "Your location determines which application path is available to you.",
      "tooltip": "Most applicants apply through their home country consulate. If you are in the U.S. on valid status, Change of Status through USCIS may be an option.",
      "options": [
        "From my home country — consular processing",
        "From inside the U.S. — on a valid visa or status",
        "From inside the U.S. — without valid status"
      ],
      "routing": {
        "home_country": "continue",
        "us_valid_status": "continue:flag_cos",
        "us_no_status": "stop:PR-09"
      }
    },
    {
      "id": "Q0-03",
      "type": "select",
      "section": "investment",
      "question": "How are you funding your investment?",
      "helper_text": "The E-2 requires capital you own and control — committed to the business, not sitting in a personal account.",
      "tooltip": "Borrowed funds can be part of the picture but cannot be the primary source. The investment must be at risk.",
      "options": [
        "Personal funds — ready or accessible",
        "Liquidating assets to fund it",
        "Primarily a business loan or third-party financing",
        "I don't have funds available yet"
      ],
      "routing": {
        "personal_funds": "continue",
        "liquidating": "continue",
        "primarily_loan": "stop:PR-02",
        "no_funds": "stop:PR-03"
      }
    },
    {
      "id": "Q0-04",
      "type": "select",
      "section": "investment",
      "question": "How much are you investing?",
      "helper_text": "No official minimum exists, but consulates expect the investment to be substantial relative to the total cost of the business.",
      "tooltip": "The substantiality test compares your investment to the total cost of establishing the business — not an absolute dollar figure.",
      "options": [
        "Over $150,000 USD",
        "$100,000 – $150,000 USD",
        "$75,000 – $99,999 USD",
        "$50,000 – $74,999 USD",
        "Under $50,000 USD"
      ],
      "routing": {
        "over_150k": "continue",
        "100k_150k": "continue",
        "75k_99k": "continue:warn:W-INVEST-LOW",
        "50k_74k": "continue:warn:W-INVEST-VERY-LOW",
        "under_50k": "stop:PR-04"
      },
      "warning_codes": {
        "W-INVEST-LOW": "Within range — your business selection will be critical at this investment level.",
        "W-INVEST-VERY-LOW": "Below the typical threshold. This significantly narrows eligible business types."
      }
    },
    {
      "id": "Q0-05",
      "type": "multiselect",
      "section": "investment",
      "question": "Where did this money originate?",
      "helper_text": "Select all that apply — this builds your source-of-funds narrative for the consulate.",
      "tooltip": "A complete, unbroken paper trail from source to investment is one of the most scrutinised elements of any E-2 application.",
      "options": [
        "Personal savings",
        "Property sale",
        "Business sale",
        "Inheritance or gift",
        "Retirement account withdrawal",
        "Investment portfolio",
        "Home equity loan",
        "Employment income accumulated over time"
      ]
    },
    {
      "id": "Q0-06",
      "type": "select",
      "section": "investment",
      "question": "How well documented is your funds trail?",
      "helper_text": "Bank statements, contracts, transaction records — the consulate will want to trace every dollar from source to investment.",
      "tooltip": "Gaps in documentation are a leading cause of 221(g) requests and refusals.",
      "options": [
        "Fully documented — bank statements, contracts, records",
        "Mostly — minor gaps I can explain",
        "Partial — significant gaps exist",
        "I cannot document the source of my funds"
      ],
      "routing": {
        "full": "continue",
        "mostly": "continue:warn:W-DOCS-MINOR",
        "partial": "continue:warn:W-DOCS-SIGNIFICANT",
        "cannot_document": "stop:PR-05"
      },
      "warning_codes": {
        "W-DOCS-MINOR": "Minor gaps are manageable with a clear narrative. We will help you address them.",
        "W-DOCS-SIGNIFICANT": "Significant gaps are a serious risk factor. Legal guidance is strongly recommended before proceeding."
      }
    },
    {
      "id": "Q0-07",
      "type": "select",
      "section": "business",
      "question": "What will your role in this business be?",
      "helper_text": "The E-2 requires that you enter the U.S. to develop and direct your business — not simply hold an investment.",
      "tooltip": "Active management means day-to-day involvement. A purely supervisory or absentee role significantly weakens your application.",
      "options": [
        "Primary owner-operator — managing day-to-day",
        "50/50 partner — both of us managing the business",
        "I'll hire a manager — involved but not daily",
        "Passive investor — not involved in operations"
      ],
      "routing": {
        "owner_operator": "continue",
        "equal_partner": "continue",
        "hired_manager": "continue:warn:W-ROLE-SUPERVISORY",
        "passive": "stop:PR-06"
      },
      "warning_codes": {
        "W-ROLE-SUPERVISORY": "A supervisory-only role is a risk factor. Your application will need to demonstrate meaningful active involvement."
      }
    },
    {
      "id": "Q0-08",
      "type": "select",
      "section": "business",
      "question": "Where are you in your business search?",
      "helper_text": "You do not need a business chosen to start. Knowing where you are helps us guide you correctly.",
      "tooltip": "The business must be real and operating — or at a committed stage of investment — by the time of your consulate interview.",
      "options": [
        "I have a specific business or franchise in mind",
        "I have a general direction but haven't chosen yet",
        "I'm open — I haven't started looking"
      ],
      "routing": {
        "specific_business": "sub:Q0-08a",
        "general_direction": "sub:Q0-08b",
        "open": "sub:Q0-08b"
      }
    },
    {
      "id": "Q0-08a",
      "type": "select",
      "section": "business",
      "is_sub": true,
      "parent": "Q0-08",
      "show_if": { "Q0-08": ["I have a specific business or franchise in mind"] },
      "question": "What kind of business is it?",
      "helper_text": "",
      "tooltip": "Certain business types are categorically incompatible with the E-2 visa regardless of investment amount.",
      "options": [
        "A franchise — buying into an established brand",
        "Buying an existing independent business",
        "Starting a new business from scratch",
        "Professional services or consulting",
        "Cannabis, gambling, adult entertainment, or passive real estate",
        "Something else"
      ],
      "routing": {
        "franchise": "sub:Q0-08b",
        "existing_business": "continue",
        "new_business": "continue",
        "professional_services": "continue:warn:W-MARGINALITY",
        "disqualified": "stop:PR-07",
        "something_else": "continue"
      },
      "warning_codes": {
        "W-MARGINALITY": "Solo consulting businesses can face scrutiny under the marginality test. Your business plan must show capacity to grow beyond one person."
      }
    },
    {
      "id": "Q0-08b",
      "type": "select",
      "section": "business",
      "is_sub": true,
      "parent": "Q0-08",
      "show_if": {
        "Q0-08": ["I have a general direction but haven't chosen yet", "I'm open — I haven't started looking"],
        "Q0-08a": ["A franchise — buying into an established brand"]
      },
      "question": "Would you like us to make an introduction?",
      "helper_text": "Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.",
      "tooltip": "Our broker partners understand which businesses have the strongest track record at consulates worldwide.",
      "options": [
        "Yes — please connect me with a broker",
        "No thanks, I'll find one myself"
      ],
      "routing": {
        "yes_broker": "continue:flag_franchise_interest",
        "no_broker": "continue"
      }
    },
    {
      "id": "Q0-09",
      "type": "select",
      "section": "history",
      "question": "Have you ever been refused a U.S. visa?",
      "helper_text": "Prior refusals must be disclosed on your DS-160 form. They are not automatically disqualifying but require careful handling.",
      "tooltip": "Honest disclosure is legally required. Concealing a prior refusal is grounds for a permanent bar from the United States.",
      "options": [
        "No",
        "Yes — once, more than 5 years ago",
        "Yes — once within the last 5 years",
        "Yes — more than once"
      ],
      "routing": {
        "no": "continue",
        "once_old": "continue:warn:W-REFUSAL-OLD",
        "once_recent": "continue:attorney_flag:W-REFUSAL-RECENT",
        "multiple": "continue:attorney_flag:W-REFUSAL-MULTIPLE"
      }
    },
    {
      "id": "Q0-10",
      "type": "select",
      "section": "history",
      "question": "Have you ever been refused entry to the U.S. or deported?",
      "helper_text": "",
      "tooltip": "Removal or deportation creates additional grounds of inadmissibility that must be disclosed and addressed.",
      "options": [
        "No",
        "Refused entry at the border",
        "Deported or removed from the U.S."
      ],
      "routing": {
        "no": "continue",
        "refused_entry": "continue:attorney_flag:W-ENTRY-REFUSED",
        "deported": "continue:attorney_flag:W-DEPORTED"
      }
    },
    {
      "id": "Q0-11",
      "type": "select",
      "section": "history",
      "question": "Do you have any criminal convictions?",
      "helper_text": "Include convictions in any country. Certain offences create grounds of inadmissibility under U.S. immigration law.",
      "tooltip": "Even minor convictions in your home country may affect U.S. admissibility. Honest disclosure is legally required.",
      "options": [
        "No criminal convictions",
        "Minor conviction — more than 10 years ago",
        "Minor conviction — within the last 10 years",
        "Serious conviction",
        "I'm not sure whether my record affects admissibility"
      ],
      "routing": {
        "none": "continue",
        "minor_old": "continue:warn:W-CONVICTION-OLD",
        "minor_recent": "continue:attorney_flag:W-CONVICTION-RECENT",
        "serious": "stop:PR-08",
        "not_sure": "continue:attorney_flag:W-CONVICTION-UNSURE"
      }
    },
    {
      "id": "Q0-12",
      "type": "select",
      "section": "home_ties",
      "question": "What is your plan for your home country property?",
      "helper_text": "The consulate must be confident you intend to return home when your visa expires.",
      "tooltip": "Selling your home country property before your visa is approved is one of the most cited reasons for a 214(b) immigrant intent refusal.",
      "options": [
        "I own property and plan to keep it",
        "I own property and plan to sell it before my interview",
        "I own property — undecided on selling",
        "I rent — no property to consider",
        "I don't own property in my home country"
      ],
      "routing": {
        "keep": "continue:tie_positive",
        "sell_before": "continue:warn:W-PROPERTY-SALE",
        "undecided": "continue:warn:W-PROPERTY-UNDECIDED",
        "renting": "continue",
        "no_property": "continue"
      }
    },
    {
      "id": "Q0-13",
      "type": "select",
      "section": "home_ties",
      "question": "Will close family remain in your home country after you move?",
      "helper_text": "The consulate scores ongoing ties to your home country. Family ties are one of the strongest signals.",
      "tooltip": "The E-2 is a nonimmigrant visa — demonstrating strong home country ties is one of the most important elements of your application.",
      "options": [
        "Yes — spouse, children, parents, or siblings staying",
        "Some family staying, some coming with me",
        "No — all family is moving with me"
      ],
      "routing": {
        "family_stays": "continue:tie_positive",
        "mixed": "continue",
        "all_moving": "continue:warn:W-NO-FAMILY-TIES"
      }
    },
    {
      "id": "Q0-14",
      "type": "select",
      "section": "home_ties",
      "question": "Will you keep your home country financial accounts active?",
      "helper_text": "Maintaining financial ties demonstrates intent to return — a key part of the nonimmigrant intent assessment.",
      "tooltip": "Closing all home country accounts before your visa interview significantly weakens your nonimmigrant intent profile.",
      "options": [
        "Yes — keeping all accounts and investments active",
        "Keeping some, closing others",
        "Planning to close everything",
        "Not sure yet"
      ],
      "routing": {
        "keeping_all": "continue:tie_positive",
        "keeping_some": "continue",
        "closing_all": "continue:warn:W-CLOSING-ACCOUNTS",
        "not_sure": "continue"
      }
    },
    {
      "id": "Q0-15",
      "type": "select",
      "section": "family",
      "question": "Will you have a business partner on this application?",
      "helper_text": "The E-2 allows a maximum of two investors per business, each owning exactly 50%.",
      "tooltip": "A 49/51 split or any other unequal ownership disqualifies the minority partner. The 50/50 requirement is strict.",
      "options": [
        "No — I am the sole investor",
        "Yes — one partner, confirmed 50/50 ownership",
        "Yes — ownership split not yet decided",
        "Yes — more than one partner"
      ],
      "routing": {
        "sole_investor": "continue",
        "partner_50_50": "continue",
        "partner_undecided": "continue:warn:W-PARTNERSHIP-SPLIT",
        "multiple_partners": "stop:PR-06b"
      }
    },
    {
      "id": "Q0-16",
      "type": "select",
      "section": "family",
      "question": "Will your spouse or children be joining you in the U.S.?",
      "helper_text": "Your spouse and unmarried children under 21 can apply as E-2 dependents. Your spouse may also apply for U.S. work authorisation.",
      "tooltip": "Dependent status is tied to your E-2 visa. If your visa expires or is revoked, dependent status ends simultaneously.",
      "options": [
        "Just me — no dependents",
        "My spouse or partner",
        "My spouse and children",
        "My children only",
        "Not decided yet"
      ],
      "routing": {
        "just_me": "continue",
        "spouse_only": "continue",
        "spouse_and_children": "sub:Q0-16a",
        "children_only": "sub:Q0-16a",
        "not_decided": "continue"
      }
    },
    {
      "id": "Q0-16a",
      "type": "select",
      "section": "family",
      "is_sub": true,
      "parent": "Q0-16",
      "show_if": {
        "Q0-16": ["My spouse and children", "My children only"]
      },
      "question": "How old are the children who will be joining you?",
      "helper_text": "E-2 dependent status is only available to unmarried children under 21.",
      "tooltip": "Children lose E-2 dependent status on their 21st birthday. Early planning is critical for children approaching this age.",
      "options": [
        "All under 18",
        "One or more are 18–20",
        "One or more are 21 or older"
      ],
      "routing": {
        "all_under_18": "continue",
        "some_18_20": "continue:warn:W-AGING-OUT",
        "some_21_plus": "continue:warn:W-OVER_21"
      }
    }
  ],
  "hard_stops": {
    "PR-01": "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify.",
    "PR-02": "The E-2 requires capital you own and control. A primarily loan-funded investment does not meet this requirement.",
    "PR-03": "The E-2 visa requires an active investment of your own capital. Without available funds you do not currently meet this requirement.",
    "PR-04": "An investment under $50,000 USD faces very high risk of refusal. We would rather be honest with you now than take your money for a process unlikely to succeed.",
    "PR-05": "The consulate expects to trace every dollar from its origin to your business. Without documentation they cannot verify your investment is lawful.",
    "PR-06": "The E-2 requires that you enter the U.S. to develop and direct your business. A passive investment role does not meet this requirement.",
    "PR-06b": "The E-2 structure allows a maximum of two investors per business, each at exactly 50%. Three or more investors disqualifies the application.",
    "PR-07": "This business type does not meet E-2 requirements. Cannabis is federally illegal in the U.S. Passive real estate, gambling, and adult entertainment do not qualify.",
    "PR-08": "Certain criminal convictions create grounds of inadmissibility under U.S. immigration law. This requires assessment by a qualified immigration attorney before you proceed.",
    "PR-09": "Applying while inside the U.S. without valid immigration status creates serious legal risk. Please consult a qualified immigration attorney immediately."
  },
  "outcomes": {
    "PROCEED": "No disqualifying conditions, no material risk flags.",
    "PROCEED_RISK": "One or more risk flags present, no hard stops.",
    "ATTORNEY_RECOMMENDED": "One or more complex conditions. Attorney referral shown. Acknowledgment gate required to proceed.",
    "DO_NOT_PROCEED": "Hard disqualifying condition detected. No payment option shown."
  },
  "score_weights": {
    "base_score": 100,
    "deductions": {
      "attorney_flag": 8,
      "risk_flag": 4,
      "W-DOCS-SIGNIFICANT": 12,
      "W-REFUSAL-RECENT": 10,
      "W-PROPERTY-SALE": 8,
      "W-INVEST-VERY-LOW": 6,
      "W-INVEST-LOW": 3,
      "W-ROLE-SUPERVISORY": 5,
      "W-MARGINALITY": 4,
      "W-CONVICTION-OLD": 4,
      "W-CLOSING-ACCOUNTS": 3,
      "W-NO-FAMILY-TIES": 3
    }
  }
}
ENDJSON
```

Confirm file was written:
```bash
python3 -c "import json; d=json.load(open('public/data/module0_questions.json')); print('Questions:', len(d['questions']))"
```

Should print: Questions: 19 (14 core + 3 conditional + Q0-08a + Q0-08b)

---

## STEP 3 — REWRITE src/app/quiz/page.tsx

This is a complete rewrite. Delete the existing file and write fresh.

Key requirements:
1. Auth check on mount — if user is logged in AND has a quiz session, redirect to /dashboard immediately
2. If user is logged in but no quiz session, proceed with quiz (skip email question)
3. If not logged in, proceed with quiz (show email question at end)
4. Country selector is a searchable text input with dropdown
5. Auto-advance on single-select answer (after 280ms delay)
6. Multi-select requires explicit Continue button
7. Sub-questions appear inline below parent answer — do NOT auto-advance when sub-question is pending
8. Franchise interest flag saved correctly
9. Quiz session saved to Supabase with user_id if logged in
10. On success: if logged in → redirect to /results; if not → email flow then /results

### The auth/login issue that caused hours of pain — PREVENT IT:

The rate limiter in middleware.ts only runs in production now.
The quiz page must handle auth gracefully:
- Never block the quiz on auth check
- auth check runs in background via useEffect
- if auth check fails or times out after 3 seconds, continue as anonymous
- never show "signing you in" spinner on the quiz page

### Complete file:

```bash
cat > src/app/quiz/page.tsx << 'ENDQUIZ'
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const TREATY_COUNTRIES = [
  "Albania","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belgium","Bolivia","Bosnia and Herzegovina",
  "Bulgaria","Cameroon","Canada","Chile","Colombia","Congo",
  "Costa Rica","Croatia","Czech Republic","Denmark","Ecuador",
  "Egypt","Estonia","Ethiopia","Finland","France","Georgia",
  "Germany","Greece","Grenada","Honduras","Ireland","Israel",
  "Italy","Japan","Jordan","Kazakhstan","South Korea","Kosovo",
  "Kyrgyzstan","Latvia","Liberia","Lithuania","Luxembourg",
  "Macedonia","Mexico","Moldova","Mongolia","Montenegro","Morocco",
  "Netherlands","New Zealand","Norway","Oman","Pakistan","Panama",
  "Paraguay","Philippines","Poland","Romania","Senegal","Serbia",
  "Singapore","Slovak Republic","Slovenia","Spain","Sri Lanka",
  "Suriname","Sweden","Switzerland","Thailand","Togo",
  "Trinidad and Tobago","Tunisia","Turkey","Ukraine",
  "United Kingdom","Yugoslavia"
];

const SECTIONS = ["Eligibility","Investment","Business","History","Home ties","Family"];

const HARD_STOPS: Record<string, { title: string; body: string }> = {
  "PR-01": {
    title: "Citizenship in a treaty country required",
    body: "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify. We recommend consulting a qualified immigration attorney about alternative visa options."
  },
  "PR-02": {
    title: "Loan-funded investments require legal review",
    body: "The E-2 requires capital you own and control. A primarily loan-funded investment does not meet this requirement. A qualified immigration attorney can assess your specific situation."
  },
  "PR-03": {
    title: "Investment capital required",
    body: "The E-2 visa requires an active investment of your own capital. Without available funds you do not currently meet this requirement. When your situation changes, we will be here."
  },
  "PR-04": {
    title: "Investment below threshold",
    body: "An investment under $50,000 USD faces very high risk of refusal. We would rather be honest with you now than take your money for a process unlikely to succeed at this level."
  },
  "PR-05": {
    title: "Documentation required",
    body: "The consulate expects to trace every dollar from its origin to your business. Without documentation they cannot verify your investment is lawful — and this is grounds for refusal."
  },
  "PR-06": {
    title: "Active management required",
    body: "The E-2 requires that you enter the U.S. to develop and direct your business. A passive investment role does not meet this requirement."
  },
  "PR-06b": {
    title: "More than two investors disqualifies the application",
    body: "The E-2 structure allows a maximum of two investors per business at exactly 50% each. Three or more investors disqualifies the application. Speak with an attorney about restructuring options."
  },
  "PR-07": {
    title: "This business type does not qualify",
    body: "Cannabis is federally illegal in the U.S. Passive real estate, gambling, and adult entertainment do not meet E-2 requirements. Speak with an attorney about alternative options."
  },
  "PR-08": {
    title: "Serious convictions require legal assessment",
    body: "Certain criminal convictions create grounds of inadmissibility under U.S. immigration law. This requires assessment by a qualified immigration attorney before you proceed."
  },
  "PR-09": {
    title: "U.S. presence without valid status",
    body: "Applying while inside the U.S. without valid immigration status creates serious legal risk and may permanently affect your ability to re-enter. Please consult a qualified immigration attorney immediately."
  }
};

type Answer = string | string[];

interface QuizState {
  answers: Record<string, Answer>;
  currentIndex: number;
  stopCode: string | null;
  warnings: string[];
  attorneyFlags: string[];
  franchiseInterest: boolean;
  countrySearch: string;
  selectedCountry: string | null;
  multiSelected: number[];
  warnMessage: string | null;
  email: string;
  caslConsent: boolean;
  showEmailGate: boolean;
  isComplete: boolean;
  isSaving: boolean;
  saveError: string | null;
}

const QUESTIONS = [
  {
    id: "Q0-01", sec: 0, type: "country",
    q: "What is your citizenship?",
    help: "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify.",
    tip: "There are 82 E-2 treaty countries. Dual citizenship in any treaty country qualifies you.",
  },
  {
    id: "Q0-02", sec: 0, type: "select",
    q: "Where are you applying from?",
    help: "Your location determines which application path is available to you.",
    tip: "Most applicants apply through their home country consulate. If you are in the U.S. on valid status, Change of Status may be an option.",
    opts: [
      { t: "From my home country — consular processing", a: "ok" },
      { t: "From inside the U.S. — on a valid visa or status", a: "ok" },
      { t: "From inside the U.S. — without valid status", a: "stop", code: "PR-09" },
    ]
  },
  {
    id: "Q0-03", sec: 1, type: "select",
    q: "How are you funding your investment?",
    help: "The E-2 requires capital you own and control — committed to the business.",
    tip: "Borrowed funds can be part of the picture but cannot be the primary source.",
    opts: [
      { t: "Personal funds — ready or accessible", a: "ok" },
      { t: "Liquidating assets to fund it", a: "ok" },
      { t: "Primarily a business loan or third-party financing", a: "stop", code: "PR-02" },
      { t: "I don't have funds available yet", a: "stop", code: "PR-03" },
    ]
  },
  {
    id: "Q0-04", sec: 1, type: "select",
    q: "How much are you investing?",
    help: "No official minimum exists, but consulates expect the investment to be substantial relative to the total business cost.",
    tip: "The substantiality test compares your investment to the total cost of establishing the business.",
    opts: [
      { t: "Over $150,000 USD", a: "ok" },
      { t: "$100,000 – $150,000 USD", a: "ok" },
      { t: "$75,000 – $99,999 USD", a: "warn", w: "Within range — your business selection will be critical at this level." },
      { t: "$50,000 – $74,999 USD", a: "warn", w: "Below the typical threshold. This significantly narrows eligible business types." },
      { t: "Under $50,000 USD", a: "stop", code: "PR-04" },
    ]
  },
  {
    id: "Q0-05", sec: 1, type: "multi",
    q: "Where did this money originate?",
    help: "Select all that apply — this builds your source-of-funds narrative for the consulate.",
    tip: "A complete, unbroken paper trail from source to investment is one of the most scrutinised elements of any E-2 application.",
    opts: [
      { t: "Personal savings" }, { t: "Property sale" }, { t: "Business sale" },
      { t: "Inheritance or gift" }, { t: "Retirement account withdrawal" },
      { t: "Investment portfolio" }, { t: "Home equity loan" },
      { t: "Employment income accumulated over time" },
    ]
  },
  {
    id: "Q0-06", sec: 1, type: "select",
    q: "How well documented is your funds trail?",
    help: "Bank statements, contracts, records — the consulate will trace every dollar from source to investment.",
    tip: "Gaps in documentation are a leading cause of 221(g) requests and refusals.",
    opts: [
      { t: "Fully documented — bank statements, contracts, records", a: "ok" },
      { t: "Mostly — minor gaps I can explain", a: "warn", w: "Minor gaps are manageable with a clear narrative. We will help you address them." },
      { t: "Partial — significant gaps exist", a: "warn", w: "Significant gaps are a serious risk factor. Legal guidance is strongly recommended." },
      { t: "I cannot document the source of my funds", a: "stop", code: "PR-05" },
    ]
  },
  {
    id: "Q0-07", sec: 2, type: "select",
    q: "What will your role in this business be?",
    help: "The E-2 requires that you enter the U.S. to develop and direct your business — not simply hold an investment.",
    tip: "Active management means day-to-day involvement. A supervisory-only role significantly weakens your application.",
    opts: [
      { t: "Primary owner-operator — managing day-to-day", a: "ok" },
      { t: "50/50 partner — both of us managing the business", a: "ok" },
      { t: "I'll hire a manager — involved but not daily", a: "warn", w: "A supervisory-only role is a risk factor. Your application must demonstrate meaningful active involvement." },
      { t: "Passive investor — not involved in operations", a: "stop", code: "PR-06" },
    ]
  },
  {
    id: "Q0-08", sec: 2, type: "select",
    q: "Where are you in your business search?",
    help: "You do not need a business chosen to start. Knowing where you are helps us guide you correctly.",
    tip: "The business must be real and operating — or at a committed stage of investment — by your consulate interview.",
    opts: [
      { t: "I have a specific business or franchise in mind", a: "sub08a" },
      { t: "I have a general direction but haven't chosen yet", a: "broker" },
      { t: "I'm open — I haven't started looking", a: "broker" },
    ]
  },
  {
    id: "Q0-08a", sec: 2, type: "select", isSub: true,
    q: "What kind of business is it?",
    help: "",
    tip: "Certain business types are categorically incompatible with the E-2 visa regardless of investment amount.",
    opts: [
      { t: "A franchise — buying into an established brand", a: "broker" },
      { t: "Buying an existing independent business", a: "ok" },
      { t: "Starting a new business from scratch", a: "ok" },
      { t: "Professional services or consulting", a: "warn", w: "Solo consulting businesses can face scrutiny under the marginality test. Your plan must show capacity to grow beyond one person." },
      { t: "Cannabis, gambling, adult entertainment, or passive real estate", a: "stop", code: "PR-07" },
      { t: "Something else", a: "ok" },
    ]
  },
  {
    id: "Q0-08b", sec: 2, type: "select", isSub: true,
    q: "Would you like us to make an introduction?",
    help: "Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.",
    tip: "Our broker partners understand which businesses have the strongest track record at consulates worldwide.",
    opts: [
      { t: "Yes — please connect me with a broker", a: "franchise_yes" },
      { t: "No thanks, I'll find one myself", a: "ok" },
    ]
  },
  {
    id: "Q0-09", sec: 3, type: "select",
    q: "Have you ever been refused a U.S. visa?",
    help: "Prior refusals must be disclosed on your DS-160 form. They are not automatically disqualifying but require careful handling.",
    tip: "Honest disclosure is legally required. Concealing a prior refusal is grounds for a permanent bar from the United States.",
    opts: [
      { t: "No", a: "ok" },
      { t: "Yes — once, more than 5 years ago", a: "warn", w: "An older refusal is manageable with proper preparation and honest disclosure. We will address it in your application." },
      { t: "Yes — once within the last 5 years", a: "attorney" },
      { t: "Yes — more than once", a: "attorney" },
    ]
  },
  {
    id: "Q0-10", sec: 3, type: "select",
    q: "Have you ever been refused entry to the U.S. or deported?",
    help: "",
    tip: "Removal or deportation creates additional grounds of inadmissibility that must be disclosed and addressed.",
    opts: [
      { t: "No", a: "ok" },
      { t: "Refused entry at the border", a: "attorney" },
      { t: "Deported or removed from the U.S.", a: "attorney" },
    ]
  },
  {
    id: "Q0-11", sec: 3, type: "select",
    q: "Do you have any criminal convictions?",
    help: "Include convictions in any country. Certain offences create grounds of inadmissibility under U.S. immigration law.",
    tip: "Even minor convictions in your home country may affect U.S. admissibility. Honest disclosure is legally required.",
    opts: [
      { t: "No criminal convictions", a: "ok" },
      { t: "Minor conviction — more than 10 years ago", a: "warn", w: "An older minor conviction may not affect admissibility but must be disclosed. We will address it in your interview preparation." },
      { t: "Minor conviction — within the last 10 years", a: "attorney" },
      { t: "Serious conviction", a: "stop", code: "PR-08" },
      { t: "I'm not sure whether my record affects admissibility", a: "attorney" },
    ]
  },
  {
    id: "Q0-12", sec: 4, type: "select",
    q: "What is your plan for your home country property?",
    help: "The consulate must be confident you intend to return home when your visa expires.",
    tip: "Selling your home country property before your visa is approved is one of the most cited reasons for a 214(b) immigrant intent refusal.",
    opts: [
      { t: "I own property and plan to keep it", a: "ok" },
      { t: "I own property and plan to sell it before my interview", a: "warn", w: "Selling your home country property before your visa is approved is one of the most cited reasons for a 214(b) refusal. Do not sell until after your visa is stamped." },
      { t: "I own property — undecided on selling", a: "warn", w: "We strongly recommend not selling your home country property until after your visa is approved." },
      { t: "I rent — no property to consider", a: "ok" },
      { t: "I don't own property in my home country", a: "ok" },
    ]
  },
  {
    id: "Q0-13", sec: 4, type: "select",
    q: "Will close family remain in your home country after you move?",
    help: "The consulate scores ongoing ties to your home country. Family ties are one of the strongest signals.",
    tip: "The E-2 is a nonimmigrant visa — demonstrating strong home country ties is essential.",
    opts: [
      { t: "Yes — spouse, children, parents, or siblings staying", a: "ok" },
      { t: "Some family staying, some coming with me", a: "ok" },
      { t: "No — all family is moving with me", a: "warn", w: "No remaining family ties can raise concerns at the consulate. Other strong ties — property, financial accounts — will be important for your application." },
    ]
  },
  {
    id: "Q0-14", sec: 4, type: "select",
    q: "Will you keep your home country financial accounts active?",
    help: "Maintaining financial ties demonstrates intent to return — a key part of the nonimmigrant intent assessment.",
    tip: "Closing all home country accounts before your visa interview significantly weakens your nonimmigrant intent profile.",
    opts: [
      { t: "Yes — keeping all accounts and investments active", a: "ok" },
      { t: "Keeping some, closing others", a: "ok" },
      { t: "Planning to close everything", a: "warn", w: "Closing all home country financial accounts before your interview is a red flag for immigrant intent. We strongly recommend keeping at least one account active." },
      { t: "Not sure yet", a: "ok" },
    ]
  },
  {
    id: "Q0-15", sec: 5, type: "select",
    q: "Will you have a business partner on this application?",
    help: "The E-2 allows a maximum of two investors per business, each owning exactly 50%.",
    tip: "A 49/51 split or any other unequal ownership disqualifies the minority partner. The 50/50 requirement is strict.",
    opts: [
      { t: "No — I am the sole investor", a: "ok" },
      { t: "Yes — one partner, confirmed 50/50 ownership", a: "ok" },
      { t: "Yes — ownership split not yet decided", a: "warn", w: "If applying with a partner, the split must be exactly 50/50 for both to qualify. Confirm this before proceeding." },
      { t: "Yes — more than one partner", a: "stop", code: "PR-06b" },
    ]
  },
  {
    id: "Q0-16", sec: 5, type: "select",
    q: "Will your spouse or children be joining you in the U.S.?",
    help: "Your spouse and unmarried children under 21 can apply as E-2 dependents. Your spouse may also apply for U.S. work authorisation.",
    tip: "Dependent status is tied to your E-2 visa. If your visa expires or is revoked, dependent status ends simultaneously.",
    opts: [
      { t: "Just me — no dependents", a: "ok" },
      { t: "My spouse or partner", a: "ok" },
      { t: "My spouse and children", a: "sub16a" },
      { t: "My children only", a: "sub16a" },
      { t: "Not decided yet", a: "ok" },
    ]
  },
  {
    id: "Q0-16a", sec: 5, type: "select", isSub: true,
    q: "How old are the children who will be joining you?",
    help: "E-2 dependent status is only available to unmarried children under 21.",
    tip: "Children lose E-2 dependent status on their 21st birthday. Early planning is critical for children approaching this age.",
    opts: [
      { t: "All under 18", a: "ok" },
      { t: "One or more are 18–20", a: "warn", w: "Children lose E-2 dependent status on their 21st birthday. If a child is 18–20, your timeline must account for this window. We will flag this in your compliance calendar." },
      { t: "One or more are 21 or older", a: "warn", w: "Children 21 or older cannot be included as E-2 dependents. They would need to apply for their own visa separately." },
    ]
  },
];

function calculateScore(warnings: string[], attorneyFlags: string[]): number {
  let score = 100;
  score -= warnings.length * 4;
  score -= attorneyFlags.length * 8;
  return Math.max(score, 0);
}

function getOutcome(warnings: string[], attorneyFlags: string[]): string {
  if (attorneyFlags.length >= 2) return "ATTORNEY_RECOMMENDED";
  if (attorneyFlags.length === 1) return "ATTORNEY_RECOMMENDED";
  if (warnings.length > 0) return "PROCEED_RISK";
  return "PROCEED";
}

export default function QuizPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const authCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [stopCode, setStopCode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [attorneyFlags, setAttorneyFlags] = useState<string[]>([]);
  const [franchiseInterest, setFranchiseInterest] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [multiSel, setMultiSel] = useState<number[]>([]);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [caslConsent, setCaslConsent] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const visibleQuestions = QUESTIONS;
  const q = visibleQuestions[cur];

  useEffect(() => {
    authCheckTimeout.current = setTimeout(() => {
      setAuthChecked(true);
    }, 3000);

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
        if (user) {
          setLoggedInUser({ id: user.id, email: user.email || "" });
          const { data: existing } = await supabase
            .from("quiz_sessions")
            .select("id, outcome")
            .eq("user_id", user.id)
            .not("outcome", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (existing) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
    return () => {
      if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
    };
  }, [supabase, router]);

  const advance = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setCur(prev => {
        const next = prev + 1;
        if (next >= visibleQuestions.length) {
          return prev;
        }
        return next;
      });
      setSelectedIdx(null);
      setWarnMsg(null);
      setMultiSel([]);
    }, 200);
  }, [visibleQuestions.length]);

  const handleComplete = useCallback(async (finalAnswers: Record<string, Answer>, finalWarnings: string[], finalAttorneyFlags: string[], finalFranchise: boolean) => {
    const score = calculateScore(finalWarnings, finalAttorneyFlags);
    const outcome = getOutcome(finalWarnings, finalAttorneyFlags);

    const resultData = {
      outcome,
      score,
      warnings: finalWarnings,
      attorney_flags: finalAttorneyFlags,
      franchise_interest: finalFranchise,
      answers: finalAnswers,
      country: finalAnswers["Q0-01"] as string || "",
      investment_range: finalAnswers["Q0-04"] as string || "",
      application_type: (finalAnswers["Q0-15"] as string || "").includes("partner") ? "partnership" : "solo",
      dependents: finalAnswers["Q0-16"] as string || "Just me — no dependents",
    };

    localStorage.setItem("e2go_quiz_result", JSON.stringify(resultData));

    if (loggedInUser) {
      setIsSaving(true);
      try {
        await supabase.from("quiz_sessions").insert({
          user_id: loggedInUser.id,
          email: loggedInUser.email,
          outcome,
          score,
          hard_stop_codes: [],
          attorney_flag_codes: finalAttorneyFlags,
          risk_flag_codes: finalWarnings,
          application_type: resultData.application_type,
          franchise_interest: finalFranchise,
          result_json: resultData,
          casl_consent: true,
          casl_consent_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch {
      } finally {
        setIsSaving(false);
      }
      router.push("/results?from=quiz");
    } else {
      setShowEmailGate(true);
    }
  }, [loggedInUser, supabase, router]);

  const handleSelectOpt = useCallback((idx: number) => {
    if (!q || q.type !== "select") return;
    const opt = (q as typeof QUESTIONS[0] & { opts: { t: string; a: string; w?: string; code?: string }[] }).opts[idx];
    if (!opt) return;

    setSelectedIdx(idx);
    const newAnswers = { ...answers, [q.id]: opt.t };
    setAnswers(newAnswers);

    if (opt.a === "stop") {
      setTimeout(() => setStopCode(opt.code || ""), 280);
      return;
    }

    if (opt.w) {
      const newWarns = [...warnings, opt.w];
      setWarnings(newWarns);
      setWarnMsg(opt.w);
      return;
    }

    if (opt.a === "attorney") {
      const newFlags = [...attorneyFlags, opt.t];
      setAttorneyFlags(newFlags);
    }

    if (opt.a === "franchise_yes") {
      setFranchiseInterest(true);
    }

    const hasSubQ = opt.a === "sub08a" || opt.a === "sub16a";
    if (hasSubQ) {
      setTimeout(() => {
        const subId = opt.a === "sub08a" ? "Q0-08a" : "Q0-16a";
        const subIdx = visibleQuestions.findIndex(x => x.id === subId);
        if (subIdx !== -1) {
          setIsAnimating(true);
          setTimeout(() => { setIsAnimating(false); setCur(subIdx); setSelectedIdx(null); setWarnMsg(null); }, 200);
        }
      }, 280);
      return;
    }

    if (opt.a === "broker") {
      setTimeout(() => {
        const brokerIdx = visibleQuestions.findIndex(x => x.id === "Q0-08b");
        if (brokerIdx !== -1) {
          setIsAnimating(true);
          setTimeout(() => { setIsAnimating(false); setCur(brokerIdx); setSelectedIdx(null); setWarnMsg(null); }, 200);
        }
      }, 280);
      return;
    }

    setTimeout(() => {
      const nextIdx = cur + 1;
      if (nextIdx >= visibleQuestions.length) {
        handleComplete(newAnswers, warnings, attorneyFlags, franchiseInterest);
      } else {
        advance();
      }
    }, 280);
  }, [q, answers, warnings, attorneyFlags, franchiseInterest, cur, visibleQuestions, advance, handleComplete]);

  const handleMultiContinue = useCallback(() => {
    if (multiSel.length === 0) return;
    if (!q) return;
    const opts = (q as typeof QUESTIONS[0] & { opts: { t: string }[] }).opts;
    const selected = multiSel.map(i => opts[i].t);
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    const nextIdx = cur + 1;
    if (nextIdx >= visibleQuestions.length) {
      handleComplete(newAnswers, warnings, attorneyFlags, franchiseInterest);
    } else {
      advance();
    }
  }, [multiSel, q, answers, cur, visibleQuestions, warnings, attorneyFlags, franchiseInterest, advance, handleComplete]);

  const handleEmailSubmit = useCallback(async () => {
    if (!email || !email.includes("@")) return;
    setIsSaving(true);
    setSaveError(null);

    const stored = localStorage.getItem("e2go_quiz_result");
    const resultData = stored ? JSON.parse(stored) : {};

    try {
      const { data: session, error } = await supabase.from("quiz_sessions").insert({
        user_id: null,
        email,
        outcome: resultData.outcome || "PROCEED",
        score: resultData.score || 80,
        hard_stop_codes: [],
        attorney_flag_codes: resultData.attorney_flags || [],
        risk_flag_codes: resultData.warnings || [],
        application_type: resultData.application_type || "solo",
        franchise_interest: resultData.franchise_interest || false,
        result_json: resultData,
        casl_consent: caslConsent,
        casl_consent_at: caslConsent ? new Date().toISOString() : null,
        completed_at: new Date().toISOString(),
      }).select("id").single();

      if (!error && session) {
        try {
          await fetch("/api/email/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              outcome: resultData.outcome,
              result_json: resultData,
              quiz_session_id: session.id,
              franchise_interest: resultData.franchise_interest,
            }),
          });
        } catch {
        }
      }
    } catch {
      setSaveError("Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
    router.push("/results?from=quiz");
  }, [email, caslConsent, supabase, router]);

  const pct = Math.round(((cur + 1) / visibleQuestions.length) * 100);

  const S = SECTIONS[q?.sec ?? 0];

  if (!authChecked) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (stopCode) {
    const stop = HARD_STOPS[stopCode] || { title: "Not eligible at this time", body: "Based on your answers, we are unable to proceed. Please consult a qualified immigration attorney." };
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
        <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "56px 40px", maxWidth: "560px" }}>
          <div style={{ width: "44px", height: "44px", border: "1px solid rgba(220,60,60,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", color: "rgba(220,60,60,0.65)", fontSize: "20px" }}>✕</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", lineHeight: 1.3 }}>{stop.title}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)", lineHeight: 1.7, marginBottom: "28px", maxWidth: "460px" }}>{stop.body}</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => { setStopCode(null); setCur(0); setAnswers({}); setWarnings([]); setAttorneyFlags([]); setFranchiseInterest(false); setSelectedIdx(null); setWarnMsg(null); setSelectedCountry(null); setCountrySearch(""); }} style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start over</button>
            <button style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(245,240,232,0.35)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Find an attorney →</button>
          </div>
        </div>
      </div>
    );
  }

  if (showEmailGate) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
        <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "56px 40px", maxWidth: "480px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px" }}>Your result is ready</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.3 }}>Where should we send your eligibility summary?</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>We will email you a full copy of your result and your personalised next-step summary.</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: "100%", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "12px" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }} onClick={() => setCaslConsent(!caslConsent)}>
            <div style={{ width: "16px", height: "16px", border: `1px solid ${caslConsent ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, background: caslConsent ? "#C9A84C" : "transparent", flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {caslConsent && <span style={{ color: "#0a0a0a", fontSize: "11px" }}>✓</span>}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6 }}>Send me occasional updates about the E-2 process. You can unsubscribe at any time.</div>
          </div>
          {saveError && <div style={{ fontSize: "13px", color: "rgba(220,60,60,0.8)", marginBottom: "12px" }}>{saveError}</div>}
          <button onClick={handleEmailSubmit} disabled={!email.includes("@") || isSaving} style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: email.includes("@") && !isSaving ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: email.includes("@") && !isSaving ? 1 : 0.35 }}>
            {isSaving ? "Saving..." : "View my result →"}
          </button>
          <button onClick={() => router.push("/results?from=quiz")} style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "rgba(245,240,232,0.25)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif", marginTop: "8px" }}>Skip — view result without saving</button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const isCountry = q.type === "country";
  const isMulti = q.type === "multi";
  const isSelect = q.type === "select";
  const qWithOpts = q as typeof QUESTIONS[0] & { opts?: { t: string; a?: string; w?: string; code?: string }[] };

  const filteredCountries = countrySearch.length > 0
    ? TREATY_COUNTRIES.filter(c => c.toLowerCase().startsWith(countrySearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ flex: 1, maxWidth: "240px", margin: "0 24px" }}>
          <div style={{ height: "1px", background: "rgba(201,168,76,0.15)" }}>
            <div style={{ height: "100%", background: "#C9A84C", width: `${pct}%`, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.3)", marginTop: "5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Question {cur + 1} of {visibleQuestions.length}</div>
        </div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.2)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Save & exit</div>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        {SECTIONS.map((s, i) => (
          <div key={s} style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: i === q.sec ? "#C9A84C" : i < q.sec ? "rgba(245,240,232,0.35)" : "rgba(245,240,232,0.18)", padding: "10px 0", marginRight: "18px", borderBottom: `2px solid ${i === q.sec ? "#C9A84C" : i < q.sec ? "rgba(201,168,76,0.2)" : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap" }}>{s}</div>
        ))}
      </div>

      <div style={{ padding: "44px 40px 32px", maxWidth: "580px", opacity: isAnimating ? 0 : 1, transition: "opacity 0.15s" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.7)", marginBottom: "18px" }}>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#C9A84C" }} />
          {q.isSub ? "Follow-up" : S}
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.3, marginBottom: "8px", letterSpacing: "-0.01em" }}>{q.q}</div>
        {q.help && <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.4)", lineHeight: 1.65, marginBottom: "28px", maxWidth: "460px" }}>{q.help}</div>}

        {warnMsg && (
          <div style={{ display: "flex", gap: "9px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.22)", background: "rgba(201,168,76,0.04)", marginBottom: "16px" }}>
            <div style={{ color: "#C9A84C", fontSize: "14px", flexShrink: 0 }}>!</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6 }}>{warnMsg}</div>
          </div>
        )}

        {isCountry && (
          <>
            <input
              value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setSelectedCountry(null); }}
              placeholder="Search your country..."
              style={{ width: "100%", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "8px" }}
            />
            {filteredCountries.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
                {filteredCountries.map(c => (
                  <div key={c} onClick={() => {
                    setSelectedCountry(c);
                    setCountrySearch(c);
                    setAnswers(prev => ({ ...prev, [q.id]: c }));
                    setTimeout(() => advance(), 200);
                  }} style={{ padding: "10px 14px", background: selectedCountry === c ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.02)", border: `1px solid ${selectedCountry === c ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.1)"}`, color: "rgba(245,240,232,0.75)", fontSize: "13px", cursor: "pointer", transition: "all 0.12s", borderRadius: 0 }}>{c}</div>
                ))}
              </div>
            )}
          </>
        )}

        {isSelect && qWithOpts.opts && (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
            {qWithOpts.opts.map((o, i) => (
              <button key={i} onClick={() => handleSelectOpt(i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: selectedIdx === i ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)", border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.14)"}`, color: selectedIdx === i ? "#f5f0e8" : "rgba(245,240,232,0.75)", fontSize: "14px", cursor: "pointer", textAlign: "left", borderRadius: 0, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "all 0.14s", gap: "12px" }}>
                <span>{o.t}</span>
                <div style={{ width: "16px", height: "16px", border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedIdx === i && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {isMulti && qWithOpts.opts && (
          <>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", marginBottom: "14px", letterSpacing: "0.04em" }}>Select all that apply</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
              {qWithOpts.opts.map((o, i) => {
                const sel = multiSel.includes(i);
                return (
                  <button key={i} onClick={() => {
                    setMultiSel(prev => sel ? prev.filter(x => x !== i) : [...prev, i]);
                  }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: sel ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)", border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.14)"}`, color: sel ? "#f5f0e8" : "rgba(245,240,232,0.75)", fontSize: "14px", cursor: "pointer", textAlign: "left", borderRadius: 0, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "all 0.14s", gap: "12px" }}>
                    <span>{o.t}</span>
                    <div style={{ width: "16px", height: "16px", border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {cur > 0 && <button onClick={() => { setCur(c => c - 1); setSelectedIdx(null); setWarnMsg(null); setMultiSel([]); }} style={{ background: "none", border: "none", fontSize: "12px", color: "rgba(245,240,232,0.25)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>}
              <button onClick={handleMultiContinue} disabled={multiSel.length === 0} style={{ padding: "11px 26px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: multiSel.length > 0 ? "pointer" : "not-allowed", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: multiSel.length > 0 ? 1 : 0.25 }}>Continue</button>
            </div>
          </>
        )}

        {(isSelect || isCountry) && warnMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
            {cur > 0 && <button onClick={() => { setCur(c => c - 1); setSelectedIdx(null); setWarnMsg(null); }} style={{ background: "none", border: "none", fontSize: "12px", color: "rgba(245,240,232,0.25)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>}
            <button onClick={() => {
              const nextIdx = cur + 1;
              if (nextIdx >= visibleQuestions.length) {
                handleComplete(answers, warnings, attorneyFlags, franchiseInterest);
              } else {
                advance();
              }
            }} style={{ padding: "11px 26px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Continue anyway</button>
          </div>
        )}

        {q.tip && (
          <div style={{ display: "flex", gap: "8px", marginTop: "22px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.08)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "13px", color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>i</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", lineHeight: 1.65 }}>{q.tip}</div>
          </div>
        )}
      </div>
    </div>
  );
}
ENDQUIZ
```

---

## STEP 4 — REWRITE src/app/results/page.tsx

Complete rewrite. Reads from localStorage AND Supabase.
Personalised to each applicant's specific answers.

```bash
cat > src/app/results/page.tsx << 'ENDRESULTS'
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface ResultData {
  outcome: string;
  score: number;
  warnings: string[];
  attorney_flags: string[];
  franchise_interest: boolean;
  answers: Record<string, string | string[]>;
  country: string;
  investment_range: string;
  application_type: string;
  dependents: string;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent eligibility profile";
  if (score >= 80) return "Strong eligibility profile";
  if (score >= 70) return "Good eligibility profile — some areas to address";
  if (score >= 60) return "Moderate profile — attention required";
  return "Elevated risk profile — legal guidance recommended";
}

function getVerdict(outcome: string, score: number): string {
  if (outcome === "PROCEED" && score >= 90) return "You are strongly positioned for the E-2 Treaty Investor visa.";
  if (outcome === "PROCEED" || outcome === "PROCEED_RISK") return "You appear to qualify for the E-2 Treaty Investor visa.";
  if (outcome === "ATTORNEY_RECOMMENDED") return "You may qualify — with legal guidance recommended for your situation.";
  return "Your eligibility requires further review.";
}

function getVerdictSub(outcome: string, warnings: string[]): string {
  if (outcome === "PROCEED") return "Your profile clears all core eligibility requirements with no material risk flags.";
  if (outcome === "PROCEED_RISK") {
    const count = warnings.length;
    return `Your profile clears all core requirements. ${count} area${count > 1 ? "s" : ""} flagged below will need attention in your application — ${count > 1 ? "both are" : "this is"} manageable with the right preparation.`;
  }
  if (outcome === "ATTORNEY_RECOMMENDED") return "Your profile has complexity that benefits from legal review. You can still proceed — we recommend consulting an attorney alongside your preparation.";
  return "Based on your answers, we recommend speaking with a qualified immigration attorney before proceeding.";
}

function getPricingFromAnswers(data: ResultData): { tier: string; base: number; spouseAdd: number; childrenAdd: number; total: number } {
  const isPartnership = data.application_type === "partnership";
  const dep = data.dependents || "";
  const hasSpouse = dep.toLowerCase().includes("spouse") || dep.toLowerCase().includes("partner");
  const hasChildren = dep.toLowerCase().includes("children") || dep.toLowerCase().includes("child");

  let base = isPartnership ? 447 : 247;
  let spouseAdd = 0;
  let childrenAdd = 0;

  if (hasSpouse && !isPartnership) spouseAdd = 47;
  if (hasChildren) childrenAdd = 27;

  if (isPartnership && hasSpouse) spouseAdd = 100;

  const total = base + spouseAdd + childrenAdd;
  const tier = isPartnership ? "Partnership Application" : "Solo Application — Standard";

  return { tier, base, spouseAdd, childrenAdd, total };
}

function getTimelineWeeks(data: ResultData): string {
  const hasBusiness = (data.answers["Q0-08"] as string || "").includes("specific business");
  if (hasBusiness) return "10 – 14 weeks";
  return "16 – 22 weeks";
}

function getConsulateIntel(country: string): { name: string; intel: string } {
  const map: Record<string, { name: string; intel: string }> = {
    "Canada": {
      name: "Toronto Consulate",
      intel: "Currently processing E-2 applications in 8–12 weeks from submission to interview. Service-based franchises and established brands have the highest approval rates in recent adjudications."
    },
    "United Kingdom": {
      name: "London Embassy",
      intel: "Processing times are currently 10–14 weeks. UK applicants benefit from strong treaty standing. Business plans with detailed job creation projections perform well."
    },
    "Germany": {
      name: "Frankfurt Consulate",
      intel: "Processing times average 8–12 weeks. German applicants have strong treaty standing. Investment documentation standards are thorough — source of funds narratives must be precise."
    },
    "Australia": {
      name: "Sydney Consulate",
      intel: "Processing times average 10–16 weeks. Australian applicants have strong treaty standing. Franchise applications with established U.S. brands perform consistently well."
    },
    "Japan": {
      name: "Tokyo Embassy",
      intel: "Processing times average 8–14 weeks. Japanese applicants benefit from a long-standing treaty relationship with the U.S. Investment documentation requirements are thorough."
    },
  };
  return map[country] || {
    name: "Your Home Consulate",
    intel: "Processing times vary by consulate. We track approval patterns across all 82 treaty countries. Your specific consulate intelligence will be surfaced during your application preparation."
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      const stored = localStorage.getItem("e2go_quiz_result");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
          setLoading(false);
          return;
        } catch {}
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: session } = await supabase
            .from("quiz_sessions")
            .select("result_json, outcome, score")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (session?.result_json) {
            setData(session.result_json as ResultData);
            setLoading(false);
            return;
          }
        }
      } catch {}

      router.push("/quiz");
    };
    loadResult();
  }, [supabase, router]);

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading your result...</div>
      </div>
    );
  }

  if (!data) return null;

  const score = data.score || 80;
  const outcome = data.outcome || "PROCEED";
  const pricing = getPricingFromAnswers(data);
  const timeline = getTimelineWeeks(data);
  const consulate = getConsulateIntel(data.country);
  const scoreLabel = getScoreLabel(score);
  const verdict = getVerdict(outcome, score);
  const verdictSub = getVerdictSub(outcome, data.warnings || []);

  const flagsToShow = (data.warnings || []).slice(0, 4);
  const clearItems = [
    !data.attorney_flags?.length && "No attorney-level risk flags",
    !(data.warnings || []).some(w => w.includes("refusal")) && "No immigration history issues",
    !(data.warnings || []).some(w => w.includes("documentation")) && "Investment source — clean",
  ].filter(Boolean) as string[];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>

      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
      </div>

      <div style={{ padding: "56px 40px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ maxWidth: "720px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: "0 0 24px", height: "1px", background: "rgba(201,168,76,0.4)" }} />
            Assessment complete
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "80px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{score}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "rgba(201,168,76,0.4)", lineHeight: 1, paddingBottom: "10px" }}>/100</div>
            <div style={{ flex: 1, paddingBottom: "16px" }}>
              <div style={{ height: "3px", background: "rgba(201,168,76,0.12)", marginBottom: "8px" }}>
                <div style={{ height: "100%", background: "#C9A84C", width: `${score}%`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{scoreLabel}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.25, marginBottom: "12px", letterSpacing: "-0.01em" }}>{verdict}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, maxWidth: "560px" }}>{verdictSub}</div>
        </div>
      </div>

      <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", maxWidth: "1100px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Treaty country", value: data.country || "—", ok: !!data.country },
                { label: "Investment range", value: data.investment_range || "—", ok: true },
                { label: "Application type", value: data.application_type === "partnership" ? "Partnership — consular" : "Solo — consular processing", gold: true },
                { label: "Dependents", value: data.dependents || "Just me", neutral: true },
                { label: "Business status", value: (data.answers?.["Q0-08"] as string) || "—", neutral: true },
                { label: "Funds documentation", value: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) ? "Needs attention" : "Clear", warn: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) },
              ].map(cell => (
                <div key={cell.label} style={{ padding: "14px 16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: "5px" }}>{cell.label}</div>
                  <div style={{ fontSize: "14px", color: cell.ok ? "#5DCAA5" : cell.gold ? "#C9A84C" : cell.warn ? "rgba(239,159,39,0.9)" : "#f5f0e8", lineHeight: 1.4 }}>
                    {cell.ok && "✓ "}{cell.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(flagsToShow.length > 0 || clearItems.length > 0) && (
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Areas requiring attention</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {flagsToShow.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(239,159,39,0.25)", background: "rgba(239,159,39,0.04)" }}>
                    <div style={{ fontSize: "16px", color: "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>!</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(239,159,39,0.95)", marginBottom: "3px" }}>Flagged area</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>{w}</div>
                    </div>
                  </div>
                ))}
                {clearItems.slice(0, 2).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(93,202,165,0.2)", background: "rgba(93,202,165,0.03)" }}>
                    <div style={{ fontSize: "16px", color: "#5DCAA5", flexShrink: 0, marginTop: "1px" }}>✓</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#5DCAA5", marginBottom: "3px" }}>{item}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>No issues detected in this area of your profile.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Estimated path to your interview</div>
            <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Estimated from today to your consulate interview, based on your profile and current processing times.</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {["Eligibility confirmed", "Business selection", "Application package", "DS-160 & booking", "Interview"].map((step, i) => (
                <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === 0 ? "rgba(93,202,165,0.6)" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.2)", border: `1px solid ${i === 0 ? "#5DCAA5" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, flexShrink: 0 }} />
                    {i < 4 && <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.15)" }} />}
                  </div>
                  <div style={{ fontSize: "10px", color: i === 0 ? "rgba(93,202,165,0.7)" : i === 1 ? "#C9A84C" : "rgba(245,240,232,0.35)", textAlign: "center", letterSpacing: "0.04em", lineHeight: 1.4, maxWidth: "60px" }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your next steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { title: "Create your account", desc: "Save this result. Begin your application. Takes 60 seconds." },
                { title: "Select your business", desc: data.franchise_interest ? "We can connect you with E-2 specialist franchise brokers in your investment range." : "Complete the business type advisor to confirm your business qualifies." },
                { title: "Complete the document interview", desc: "Our guided engine builds your complete application package — cover letter, source of funds, business plan, and all supporting documents." },
                { title: "Download your consulate package", desc: "A complete, consulate-formatted binder ready for your interview. Every tab, every document, in the correct order." },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "2px" }}>{step.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Link href={`/pricing?tier=${data.application_type}&dependents=${encodeURIComponent(data.dependents || "none")}`}>
              <button style={{ width: "100%", padding: "15px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                Start my application →
              </button>
            </Link>
            <button style={{ width: "100%", padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, marginTop: "8px" }}>
              Email me this result
            </button>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.04)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Your recommended package</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "18px", color: "#f5f0e8", marginBottom: "14px" }}>{pricing.tier}</div>
            {[
              { label: pricing.tier.includes("Partnership") ? "Partnership base" : "Solo applicant", price: `$${pricing.base}` },
              pricing.spouseAdd > 0 && { label: "Add spouse", price: `+$${pricing.spouseAdd}` },
              pricing.childrenAdd > 0 && { label: "Add children", price: `+$${pricing.childrenAdd}` },
            ].filter(Boolean).map((row: { label: string; price: string } | false, i) => row && (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                <div style={{ fontSize: "13px", color: "#f5f0e8" }}>{row.label}</div>
                <div style={{ fontSize: "14px", color: "#C9A84C", fontWeight: 500 }}>{row.price}</div>
              </div>
            ))}
            <div style={{ height: "1px", background: "rgba(201,168,76,0.12)", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Total</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", color: "#C9A84C", fontWeight: 300 }}>${pricing.total}</div>
            </div>
            <Link href={`/pricing?tier=${data.application_type}`}>
              <button style={{ width: "100%", padding: "12px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start for ${pricing.total} →</button>
            </Link>
          </div>

          {data.franchise_interest && (
            <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Franchise broker network</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "17px", color: "#f5f0e8", marginBottom: "8px" }}>We can connect you with the right broker</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "14px" }}>Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.</div>
              {["FranConnect Advisors — E-2 specialist", "Gateway Franchise Group — Service franchises"].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0 }}>B</div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)" }}>{b}</div>
                </div>
              ))}
              <button style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "11px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, marginTop: "4px" }}>Request an introduction →</button>
            </div>
          )}

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Consulate intelligence</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontSize: "18px", color: "rgba(201,168,76,0.6)", flexShrink: 0, marginTop: "1px" }}>⊞</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>
                <strong style={{ color: "rgba(245,240,232,0.8)", fontWeight: 500 }}>{consulate.name}</strong> — {consulate.intel}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.2)", marginTop: "6px" }}>Updated June 2026 · Applicant-reported data</div>
          </div>

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Share this result</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6, marginBottom: "12px" }}>Send your eligibility summary to a spouse, business partner, or immigration attorney.</div>
            <button style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "11px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Email this result</button>
          </div>

        </div>
      </div>

      <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(201,168,76,0.06)" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.18)", lineHeight: 1.6, maxWidth: "720px" }}>
          This assessment is based solely on the answers you provided and does not constitute legal advice. e2go.app is a self-service preparation tool, not a law firm. Consular decisions involve factors beyond the scope of any preparation tool. For legal advice, consult a qualified U.S. immigration attorney.
        </div>
      </div>

    </div>
  );
}
ENDRESULTS
```

---

## STEP 5 — BUILD CHECK

```bash
cd ~/E2-go
npm run build 2>&1 | grep -E "error|Error|✓ Compiled|Failed|Warning" | head -30
```

Fix ALL TypeScript errors before continuing.
Do not proceed to commit with build errors.

Common issues to watch for:
- Type mismatches on quiz answer handling
- Missing `| null` on nullable fields
- `useCallback` dependency warnings

---

## STEP 6 — VERIFY AUTH FLOW IS CLEAN

Run this to confirm the rate limiter fix is in place:

```bash
grep "NODE_ENV" src/middleware.ts
```

Must show: `process.env.NODE_ENV === 'production'`

If not present, add it:
```bash
python3 -c "
import re
with open('src/middleware.ts', 'r') as f:
    content = f.read()
old = \"if (pathname === '/login' || pathname === '/api/auth/v1/token') {\"
new = \"if ((pathname === '/login' || pathname === '/api/auth/v1/token') && process.env.NODE_ENV === 'production') {\"
content = content.replace(old, new)
with open('src/middleware.ts', 'w') as f:
    f.write(content)
print('Done')
"
```

---

## STEP 7 — COMMIT

```bash
cd ~/E2-go
git add public/data/module0_questions.json
git commit -m "feat: global quiz question set v4.0 — 14 questions, 82 treaty countries, franchise lead capture"

git add src/app/quiz/page.tsx
git commit -m "feat: quiz page complete rewrite — global, auth-aware, no login hang, clean state"

git add src/app/results/page.tsx
git commit -m "feat: results page complete rewrite — score, flags, timeline, franchise broker, pricing"

git add src/middleware.ts
git commit -m "fix: login rate limiter production-only — no dev blocking"

git push origin dev
```

---

## STEP 8 — UPDATE BUILD TRACKER

Update BUILD_TRACKER.md:

```
## SESSION — Quiz + Results Rebuild (June 9, 2026)

### Completed
- module0_questions.json: Global v4.0 — 14 core questions,
  19 total including conditionals, all Canadian references
  removed, 82-country selector, franchise lead capture wired
- quiz/page.tsx: Complete rewrite — auth-aware, no login hang,
  fire-and-forget auth check with 3s timeout, correct
  sub-question flow, multi-select, auto-advance, email gate
  for anonymous users, direct to results for logged-in users
- results/page.tsx: Complete rewrite — score/100, personalised
  verdict, profile grid, flags, timeline, franchise broker card
  (Option 2 wording), consulate intelligence, pricing pre-calc,
  reads from localStorage + Supabase fallback
- middleware.ts: Rate limiter production-only confirmed

### Build
Clean — 0 errors

### Auth flow — confirmed working
1. Logged in + quiz done → bypass quiz → dashboard
2. Logged in + no quiz → take quiz → skip email gate → results
3. Not logged in → take quiz → email gate → results
4. Login page → no rate limiting in dev → no hanging spinner
```

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — quiz and results rebuild complete"
git push origin dev
```

---

## COMPLETION REPORT

When done, report exactly:

```
Quiz + Results rebuild complete.

Files changed:
- public/data/module0_questions.json — v4.0, global, 19 questions
- src/app/quiz/page.tsx — complete rewrite
- src/app/results/page.tsx — complete rewrite
- src/middleware.ts — rate limiter production-only confirmed

Build: clean / errors: [list or none]

Auth flows confirmed in code:
1. Logged in + existing quiz → redirect to dashboard
2. Logged in + no quiz → quiz runs, skips email gate
3. Not logged in → quiz runs, shows email gate at end
4. Dev login → no rate limiter → no hanging spinner

Ready for end-to-end manual test.
```
