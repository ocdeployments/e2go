# E2go Platform — Complete Question Audit
**Date:** 2026-06-18  
**Scope:** Every question collected across the entire platform  
**Purpose:** Map what we collect, what it feeds, and identify all duplicates and orphans

---

## Executive Summary

| System path | Questions | Status |
|---|---|---|
| Module 0 Quiz | 20 (many conditional) | Active — primary eligibility gate |
| Story section `/apply/story` | 25 | Active — primary narrative intake |
| Business section `/apply/business` | 28 | Active — has 2 internal duplicates |
| Investment section `/apply/investment` | 25 | Active |
| Qualifications `/apply/qualifications` | 29 | Active |
| Family `/apply/family` | 12 | Active |
| Ties `/apply/ties` | 16 | Active |
| Tab D Cover Letter `/apply/module3/d` | 6 | Active — 5 of 6 duplicate Story/Ties |
| Tab A `/apply/module3/a` | 22 | Redundant UI — shares M3-A-* keys with Story |
| Tab E `/apply/module3/e` | 13 | Redundant — different keys from Business/Quals |
| Tab I `/apply/module3/i` | 10 | Redundant — different keys from Investment |
| Tab J `/apply/module3/j` | ~4 | Partial duplicate of Qualifications |
| Tab K `/apply/module3/k` | 15 | Partial duplicate of Business; some unique content |
| tab-g.json | 10 | **ORPHAN** — no page route; superseded by Business |
| tab-h.json | 11 | **ORPHAN** — no page route; superseded by Investment |
| tab-l.json | 10 | **ORPHAN** — no page route; superseded by Family |
| Tab F Investment Evidence | 0 | **MISSING** — no JSON, no page |

**Unique questions in the primary case file path: ~155**  
**Duplicate or orphaned question instances: ~85**

---

## Module 0 — Eligibility Quiz
**Path:** `public/data/module0_questions.json`  
**Route:** `/quiz`  
**Writes to:** `applications` table (not `answers`), plus answers table as `Q0-*` keys

| Key | Question | Value |
|---|---|---|
| Q0-01 | What is your current citizenship? | Hard eligibility gate — blocks non-treaty nationals |
| Q0-02 | Who is this application for? | Sets family scope and pricing tier |
| Q0-02a | Will your children also be moving with you? | Dependent visa strategy |
| Q0-03 | Who is moving with you? | Dependent scope (solo applicant path) |
| Q0-03a | What are your children's ages? | Flags over-21 ineligibility |
| Q0-04 | Will you have a business partner? | Partnership structure risk assessment |
| Q0-04a | What is your partner's role? | Silent partner risk flag |
| Q0-05 | Where are you applying from? | Determines consular vs USCIS path |
| Q0-06 | What sources will you use to fund your investment? | Source of funds risk flags; feeds scoring |
| Q0-06a | RRSP/TFSA/LIRA withdrawal status | Documentary guidance flag |
| Q0-07 | What is your approximate investment range? | Substantiality screening; feeds scoring |
| Q0-08 | What is your current business situation? | Case file routing and resource matching |
| Q0-08a | What type of business are you investing in? | Marginality risk flag; franchise routing |
| Q0-08b | Would you like to connect with a franchise broker? | Lead generation flag |
| Q0-09 | Does any of the following apply to your immigration history? | Disclosure gate |
| Q0-09a | Have you ever been refused a US visa? | Prior refusal risk; feeds scoring |
| Q0-09d | Was that refusal specifically for E-2 or E-1? | Severity escalation |
| Q0-09b | Entry refusal or deportation? | Serious risk flag |
| Q0-09c | Criminal convictions in any country? | Admissibility screening |
| Q0-10 | What ties do you maintain in your home country? | 214(b) nonimmigrant intent scoring |

**All 20 quiz questions are justified.** Each either gates eligibility, feeds the risk score, or determines case routing. No duplicates here.

---

## Case File Section 1 — Your Story
**Path:** `src/app/apply/story/page.tsx`  
**Route:** `/apply/story`  
**Builds:** Cover Letter, Investor Biography  
**Key prefix:** `M3-S1-*` (narrative) + `M3-A-*` (administrative — shared with Tab A)

### Cluster 1 — Who You Are
| Key | Question | Feeds |
|---|---|---|
| M3-S1-01 | What have you spent your career doing, and how does it connect to this business? | Cover Letter opening + Investor Bio |
| M3-S1-02 | Why are you making this move, and why now? | Cover Letter motivation paragraph |
| M3-S1-03 | What qualifies you to run this specific type of business? | Cover Letter qualifications + Investor Bio |

### Cluster 2 — Your Plan
| Key | Question | Feeds |
|---|---|---|
| M3-S1-04 | What are your first-year priorities? | Cover Letter plan section |
| M3-S1-05 | Is there anything in your application a consular officer might question? | Cover Letter proactive disclosures |
| M3-S1-05-option | Nothing unusual to address | Sets M3-S1-05 to N/A |

### Cluster 3 — Administrative (DS-160 Pre-Fill)
| Key | Question | Feeds |
|---|---|---|
| M3-A-01 | Full legal name as it appears on passport | DS-160; all documents |
| M3-A-02 | Have you ever used any other names? | DS-160 |
| M3-A-03 | Date of birth | DS-160 |
| M3-A-04 | Place of birth (city and country) | DS-160 |
| M3-A-05 | Country of citizenship | All docs; pre-filled from Q0-01 |
| M3-A-06 | Do you hold citizenship in any other country? | DS-160; cover letter flag |
| M3-A-08 | U.S. SSN or ITIN | DS-160 (optional for first-timers) |
| M3-A-09 | Current home address in Canada | DS-160 |
| M3-A-10 | How long have you lived at this address? | Ties argument; DS-160 |
| M3-A-11 | Primary phone number | Case file contact |
| M3-A-12 | Email address | Case file; **PRE-FILLABLE from account** |
| M3-A-13 | Social media platforms | DS-160 |
| M3-A-14 | Parents' full names | DS-160 |
| M3-A-15 | Have you ever lost a passport or had one stolen? | DS-160 |

### Cluster 4 — Travel & History
| Key | Question | Feeds |
|---|---|---|
| M3-A-16 | Last 5 US trips with dates and purposes | DS-160; cover letter |
| M3-A-17 | Countries visited in past 5 years | DS-160 |
| M3-A-18 | Immediate family in the United States? | Cover letter disclosure |
| M3-A-19 | Ever applied for a US green card or immigrant visa? | Non-immigrant intent; cover letter |
| M3-A-20 | Ever held a US driver's license? | DS-160 |
| M3-A-21 | Have you held any US visas in the past? | DS-160; Qualifications Cluster 4 |

**Note:** M3-A-12 (email) should be pre-filled from the user's account — it is redundant to ask.  
**Note:** M3-A-05 (citizenship) is pre-filled from Q0-01 — confirm rather than re-ask.

---

## Case File Section 2 — Your Business
**Path:** `src/app/apply/business/page.tsx`  
**Route:** `/apply/business`  
**Builds:** Business Plan, Visa Category Letter  
**Key prefixes:** `M3-E-*`, `M3-G-*`, `M3-K-*`, `M3-B-*`, `M3-F-*`

### Cluster 1 — Entity & Registration
| Key | Question | Feeds |
|---|---|---|
| M3-E-01 | Business legal name | All documents |
| M3-E-02 | Entity type | Business Plan; legal structure section |
| M3-E-03 | State of registration | Business Plan |
| M3-E-04 | EIN | DS-160; Business Plan |
| M3-E-05 | Date entity formed | Business Plan |
| M3-E-06 | Ownership percentage (%) | Cover Letter; Business Plan |
| M3-E-07 | Operating agreement in place? | Document checklist |
| M3-E-10 | **DUPLICATE** Legal structure | ⚠️ Same as M3-E-02 — remove |
| M3-E-11 | **DUPLICATE** State of registration | ⚠️ Same as M3-E-03 — remove |
| M3-E-12 | Has the entity been formed? | Document checklist |

### Cluster 2 — What You Do
| Key | Question | Feeds |
|---|---|---|
| M3-K-01 | Describe your business in three sentences | Business Plan executive summary |
| M3-B-01 | Why did you choose this location? | Business Plan market section |
| M3-B-02 | Approximate population of city or metro | Business Plan market data |
| M3-B-03 | How many direct competitors within 5 miles? | Business Plan competitive analysis |

### Cluster 3 — Operations
| Key | Question | Feeds |
|---|---|---|
| M3-G-04 | Does the business have a physical US location? | Business Plan; risk flags |
| M3-G-05 | Business address | Business Plan; DS-160 |
| M3-G-08 | Is the business currently operational? | Document timeline |
| M3-G-08a | Days per week you'll be managing | "Develop and direct" test |
| M3-G-09 | First 90 days — three milestones | Business Plan operational section |

### Cluster 4 — Licenses & Setup
| Key | Question | Feeds |
|---|---|---|
| M3-G-10 | Licenses or permits held or applied for | Document checklist |
| M3-G-06 | Type of premises | Business Plan |
| M3-G-07 | Lease term or ownership status | Document checklist |
| M3-G-11 | Business insurance obtained? | Document checklist |

### Cluster 5 — Franchise (conditional)
| Key | Question | Feeds |
|---|---|---|
| M3-F-09 | Franchise system name | Business Plan; Visa Category Letter |
| M3-F-10 | FDD Item 19 data available? | Business Plan projections basis |
| M3-F-11 | Franchise agreement signed? | Document checklist |

### Cluster 7 — Market & Competition
| Key | Question | Feeds |
|---|---|---|
| M3-K-02 | Who are your target customers? | Business Plan market section |
| M3-K-11 | Size of your target market | Business Plan market section |
| M3-K-03 | Competitors and competitive advantage | Business Plan competitive section |
| M3-K-12 | Market trends supporting your business | Business Plan market section |

**⚠️ INTERNAL DUPLICATES — ACTION REQUIRED:**
- `M3-E-10` duplicates `M3-E-02` (both ask entity/legal structure type)
- `M3-E-11` duplicates `M3-E-03` (both ask state of registration)
- Remove M3-E-10 and M3-E-11 from the page — these fields write to dead keys

---

## Case File Section 3 — Your Investment
**Path:** `src/app/apply/investment/page.tsx`  
**Route:** `/apply/investment`  
**Builds:** Source of Funds, Investment Proof  
**Key prefixes:** `M3-F-*`, `M3-H-*`, `M3-I-*`, `M3-B-*`

### Cluster 1 — Investment Overview
| Key | Question | Feeds |
|---|---|---|
| M3-F-01 | Investment type (new/acquisition/franchise) | Business Plan; Source of Funds |
| M3-F-02 | Total invested to date (USD) | Cover Letter; Source of Funds; health check |
| M3-F-03 | Total cost to establish the business (USD) | Proportionality calculation |
| M3-F-04 | How was the investment deployed? | Source of Funds |
| M3-F-NEW-01 | Are funds actually spent on business expenses? | Source of Funds at-risk test |
| M3-F-NET | Approximate net worth in CAD | Substantiality argument |

### Cluster 2 — Where the Money Came From
| Key | Question | Feeds |
|---|---|---|
| M3-F-05 | Source of funds | Source of Funds; cover letter |
| M3-H-NEW-01 | Can you trace funds from origin to US account? | Documentary gap assessment |

### Cluster 3 — The Paper Trail
| Key | Question | Feeds |
|---|---|---|
| M3-H-01 | Walk me through the money (narrative) | Source of Funds letter |
| M3-H-02 | Period over which funds were accumulated | Source of Funds |
| M3-H-03 | Were funds held in multiple currencies? | FX documentation flag |
| M3-H-05 | Were any funds a gift or inheritance? | Gift letter requirement |
| M3-H-08 | How were funds transferred to US business? | Wire documentation |
| M3-H-09 | Wire transfer records or payment receipts? | Document checklist |
| M3-H-10 | Funds converted from foreign currency? | FX records flag |
| M3-B-BANK | US business bank account opened? | Document readiness |
| M3-B-WIRE | Canadian bank wire confirmed? | Wire readiness |

### Cluster 4 — Financial Projections
| Key | Question | Feeds |
|---|---|---|
| M3-I-03 | Basis for revenue projections | Business Plan projections section |
| M3-I-04 | Annual salary or draw Year 1 | Business Plan |
| M3-I-BREAKEVEN | Break-even projection | Business Plan |
| ProjectionTable | Year 1–5 revenue, net income, employees | Business Plan financial tables |

### Cluster 5 — Non-Marginality Evidence
| Key | Question | Feeds |
|---|---|---|
| M3-I-05 | Full-time US hires Year 1 | Business Plan; cover letter |
| M3-I-06 | Part-time US hires Year 1 | Business Plan |
| M3-I-07 | Planned roles for Year 1 hires | Business Plan org structure |
| M3-I-09 | Does business serve US economy beyond your household? | Marginality argument |
| M3-I-10 | Evidence supporting non-marginality argument | Source of Funds; Business Plan |

---

## Case File Section 4 — Your Qualifications
**Path:** `src/app/apply/qualifications/page.tsx`  
**Route:** `/apply/qualifications`  
**Builds:** Investor Biography, Org Chart  
**Key prefixes:** `M3-Q-*`, `M3-V-*`, `M3-I-*`

### Cluster 1 — Your Background
| Key | Question | Feeds |
|---|---|---|
| M3-Q-01 | Highest level of education completed | Investor Bio |
| M3-Q-02 | What did you study? | Investor Bio |
| M3-Q-03 | English language proficiency | Interview preparation |
| M3-Q-04 | Describe your professional background | Investor Bio |
| M3-Q-05 | Years of relevant industry experience | Investor Bio |
| M3-Q-06 | What relevant skills do you bring? | Investor Bio; Org Chart |
| M3-Q-07 | Have you owned a business before? | Investor Bio |

### Cluster 2 — Your Business Experience
| Key | Question | Feeds |
|---|---|---|
| M3-Q-10 | How did you decide on this business? | Cover letter motivation section |
| M3-Q-11 | What research or due diligence did you do? | Business Plan; cover letter |
| M3-Q-12 | Have you visited the location in person? | Business Plan authenticity |

### Cluster 3 — Your Role
| Key | Question | Feeds |
|---|---|---|
| M3-Q-20 | Official title in the business | Org Chart; all documents |
| M3-Q-21 | Day-to-day responsibilities | Org Chart; "develop and direct" argument |
| M3-Q-22 | Hire/fire authority? | "Develop and direct" test |
| M3-Q-23 | Contract signing authority? | "Develop and direct" test |
| M3-Q-24 | Physically present in the US managing the business? | "Develop and direct" test |
| M3-Q-25 | How will you structure your time in this business? | Cover letter |

### Cluster 4 — Visa History
| Key | Question | Feeds |
|---|---|---|
| M3-V-01 | Ever denied a US visa? | Cover letter proactive disclosure |
| M3-V-02 | Type, date, reason given (conditional) | Cover letter |
| M3-V-03 | Ever overstayed a US visa? | Cover letter disclosure |
| M3-V-04 | Dates and circumstances (conditional) | Cover letter |
| M3-V-05 | Ever in removal proceedings? | Cover letter disclosure |
| M3-V-06 | Details and outcome (conditional) | Cover letter |
| M3-V-07 | Prior US visa status? | DS-160; cover letter |
| M3-V-08 | Prior statuses, dates, purpose (conditional) | DS-160; cover letter |

### Cluster 5 — Interview Prep
| Key | Question | Feeds |
|---|---|---|
| M3-I-11 | Which US consulate? | Interview scheduling; timeline |
| M3-I-12 | Other consulate location | Interview scheduling |
| M3-I-13 | Interview date scheduled? | Timeline management |
| M3-I-14 | Comfortable answering officer questions? | Simulator recommendation |
| M3-I-15 | What concerns you most about the interview? | Simulator prep focus |

---

## Case File Section 5 — Your Family
**Path:** `src/app/apply/family/page.tsx`  
**Route:** `/apply/family`  
**Builds:** Dependent Documents, DS-160 Family section  
**Key prefix:** `M3-L-*`

| Key | Question | Feeds |
|---|---|---|
| M3-L-01 | Will your spouse apply for E-2 dependent status? | Package scope; pricing |
| M3-L-02 | Spouse full legal name (conditional) | Dependent application |
| M3-L-03 | Spouse date of birth (conditional) | Dependent application |
| M3-L-04 | Spouse nationality (conditional) | Dependent application |
| M3-L-05 | Spouse passport number (conditional) | Dependent application |
| M3-L-06 | Spouse EAD application? (conditional) | I-765 flag |
| M3-L-07 | Children applying as E-2 dependents? | Package scope |
| M3-L-08 | Dependent details — names, DOBs, nationalities (conditional) | Dependent applications |
| M3-L-09 | What relationship documents do you have? | Document checklist |
| M3-L-10 | Dependent documents translated to English? | Document readiness |
| M3-L-11 | Dependents traveling with you? | Timeline planning |
| M3-L-12 | If dependents not traveling together, explain timeline | Cover letter logistics |

---

## Case File Section 6 — Your Ties
**Path:** `src/app/apply/ties/page.tsx`  
**Route:** `/apply/ties`  
**Builds:** Non-immigrant Intent section, Cover Letter Closing  
**Key prefix:** `M3-T-*`

| Key | Question | Feeds |
|---|---|---|
| M3-T-01 | Property/assets in home country? | Non-immigrant intent argument |
| M3-T-02 | Major assets list with values | Non-immigrant intent |
| M3-T-03 | Own primary residence? | Non-immigrant intent |
| M3-T-04 | Family ties remaining in home country? | Non-immigrant intent |
| M3-T-05 | Family situation description | Non-immigrant intent; cover letter |
| M3-T-06 | Community involvement in home country? | Non-immigrant intent |
| M3-T-07 | Financial obligations in home country? | Non-immigrant intent |
| M3-T-08 | Ongoing financial ties description | Non-immigrant intent |
| M3-T-09 | How long do you intend to stay on E-2? | Non-immigrant intent |
| M3-T-10 | Plans when E-2 status ends? | Non-immigrant intent |
| M3-T-11 | Long-term plans and exit strategy | Cover letter closing |
| M3-T-12 | Draft opening paragraph | Cover letter raw draft (see ⚠️ below) |
| M3-T-13 | Why this specific business and location? | Cover letter raw draft |
| M3-T-14 | Non-marginality argument draft | Cover letter raw draft |
| M3-T-15 | Home ties and return intent paragraph | Cover letter raw draft |
| M3-T-16 | Anything else the officer should know | Cover letter raw draft |

**⚠️ Note on M3-T-12 through M3-T-16:** These ask the user to draft cover letter sections manually. This overlaps with Tab D (which uses AI generation from structured answers) and the Story section (which collects the same narrative content in a more structured way). Consider whether M3-T-12 through M3-T-16 should be retired — the generation engine produces the cover letter from M3-S1-* + QD-* + M3-T-01 to M3-T-11. Asking users to draft raw paragraphs creates work without feeding the generation engine.

---

## Tab D — Cover Letter Wizard (Old System)
**Path:** `src/app/apply/module3/d/page.tsx`  
**Route:** `/apply/module3/d`  
**Key prefix:** `QD-*`  
**Architecture:** Wizard (one question at a time), then AI generation

| Key | Question | Duplicate? |
|---|---|---|
| QD-01 | Describe your professional background in 2–3 sentences | ⚠️ DUPLICATE of M3-S1-01 + M3-Q-04 (different key, same data) |
| QD-02 | Why are you investing in this specific business? | ⚠️ DUPLICATE of M3-S1-02 (different key) |
| QD-03 | What qualifies you to run this specific business? | ⚠️ DUPLICATE of M3-S1-03 (different key) |
| QD-04 | What is your plan for the business in the first 12 months? | ⚠️ DUPLICATE of M3-S1-04 (different key) |
| QD-05 | Why do you intend to return to your home country? | ✅ UNIQUE — not captured in any other section |
| QD-06 | Anything unusual the cover letter should address? | ⚠️ DUPLICATE of M3-S1-05 (different key) |

**Decision:** QD-05 is the only unique question in Tab D. The other five duplicate the Story section using different keys. Options:
- Pre-fill QD-01 to QD-04 and QD-06 from M3-S1-* keys on load (bridge pattern)
- OR retire Tab D and integrate QD-05 into Story Cluster 2 or Ties Cluster 4

---

## Old Tab System — Status Matrix

### Tab A — Personal Info
**Path:** `src/app/apply/module3/a/page.tsx` | **JSON:** `src/data/module3/tab-a.json`  
**Key prefix:** `M3-A-*`  
**Status:** ✅ CONNECTED — uses same `M3-A-*` keys as Story Clusters 3 & 4  
**Issue:** Duplicate UI path to the same data. Users who complete Story don't need Tab A and vice versa. No data duplication at database level, but confusing navigation.

### Tab E — Ownership Structure  
**Path:** `src/app/apply/module3/e/page.tsx` | **JSON:** `src/data/module3/tab-e.json` (outdated stub)  
**Key prefix:** `QE-*`  
**Status:** ⚠️ DUPLICATE — different keys from Business section (`M3-E-*`) and Qualifications (`M3-Q-*`)

| Tab E Key | Question | Duplicate in case file |
|---|---|---|
| QE-01 | Ownership percentage | M3-E-06 |
| QE-02 | How is ownership documented? | Not captured in case file ← UNIQUE |
| QE-03 | Business partners? | M3-E questions + Q0-04 |
| QE-04 | Partner's percentage | Q0-04 (quiz) |
| QE-05 | Partner E-2 status? | Q0-04a |
| QE-06 | Official title | M3-Q-20 |
| QE-07 | Hire/fire authority | M3-Q-22 |
| QE-08 | Day-to-day decisions | M3-G-08a |
| QE-09 | Contract signing authority | M3-Q-23 |
| QE-10 | Legal structure | M3-E-02 |
| QE-11 | State registered | M3-E-03 |
| QE-12 | Entity formed? | M3-E-12 |
| QE-13 | Legal name of entity | M3-E-01 |

**QE-02 ("How is ownership documented?") is not captured in the new case file.** Consider adding it to Business Cluster 1 as `M3-E-13`.

### Tab I — Financial Projections
**Path:** `src/app/apply/module3/i/page.tsx` | **JSON:** `src/data/module3/tab-i.json`  
**Key prefix:** `QI-*`  
**Status:** ⚠️ DUPLICATE — all 10 questions duplicate Investment section (`M3-I-*`) with different keys

| QI key | Duplicate in case file |
|---|---|
| QI-01 | ProjectionTable (Year 1 revenue) |
| QI-02 | ProjectionTable (Year 3 revenue) |
| QI-03 | M3-I-03 (projections basis) |
| QI-04 | M3-I-04 (salary Year 1) |
| QI-05 | M3-I-05 (full-time hires) |
| QI-06 | M3-I-06 (part-time hires) |
| QI-07 | M3-I-07 (planned roles) |
| QI-08 | ProjectionTable (Year 3 employees) |
| QI-09 | M3-I-09 (serves US economy?) |
| QI-10 | M3-I-10 (non-marginality evidence) |

### Tab J — Qualifications Wizard
**Path:** `src/app/apply/module3/j/page.tsx`  
**Key prefix:** `QJ-*`  
**Status:** ⚠️ PARTIAL DUPLICATE — work history and qualifications narrative also in M3-S1-01, M3-S1-03, M3-Q-04, M3-Q-05

| QJ key | Question | Duplicate |
|---|---|---|
| QJ-03 | Describe your work history for the past 10 years | ≈ M3-Q-04 + M3-S1-01 |
| QJ-04 | What experience qualifies you to run this business? | ≈ M3-S1-03 + QD-03 |

**Note:** Tab J uses wizard format (one-at-a-time) which may be preferable for some users, but the data is not shared with the case file's M3-Q-* or M3-S1-* keys.

### Tab K — Business Plan
**Path:** `src/app/apply/module3/k/page.tsx` | **JSON:** `src/data/module3/tab-k.json`  
**Key prefix:** `QK-*`  
**Status:** ⚠️ PARTIAL DUPLICATE — several questions duplicated in Business section with different keys; some unique content

| QK Key | Question | Status |
|---|---|---|
| QK-01 | Describe your business | DUPLICATE of M3-K-01 (different key) |
| QK-02 | Target market | DUPLICATE of M3-K-02 |
| QK-03 | Competitors and competitive advantage | DUPLICATE of M3-K-03 |
| QK-04 | How will the business operate day-to-day? | Partially covered by M3-G-08a + M3-G-09 |
| QK-05 | Key operational milestones for Year 1 | DUPLICATE of M3-S1-04 + M3-G-09 |
| QK-06 | Equipment, inventory, or technology required? | ✅ UNIQUE — not captured in case file |
| QK-07 | Startup costs breakdown by category | Partially in StartupCostTable (Business Cluster 6) |
| QK-08 | Projected monthly revenue months 1–6 | Partially in ProjectionTable |
| QK-09 | Projected monthly operating expenses | Partially in ProjectionTable |
| QK-10 | Break-even projection | DUPLICATE of M3-I-BREAKEVEN |
| QK-11 | Size of target market | DUPLICATE of M3-K-11 |
| QK-12 | Market trends supporting business | DUPLICATE of M3-K-12 |
| QK-13 | 3-year growth plan | ✅ UNIQUE — not captured in case file |
| QK-14 | Plans to expand beyond initial location? | ✅ UNIQUE — not captured in case file |

**Unique content in Tab K not in new case file: QK-06, QK-13, QK-14 — should be added to Business section.**

---

## Orphaned JSON Files — No Page Routes

### tab-g.json — Business Registration & Premises
**File:** `src/data/module3/tab-g.json` | **Route:** None  
**Key prefix:** `QG-*`  

All content superseded by `business/page.tsx`:
- QG-01 (registered?) → No direct equivalent — small gap
- QG-02 (primary activity) → M3-K-01
- QG-03 (EIN?) → M3-E-04
- QG-04 (physical location?) → M3-G-04 (**DIFFERENT KEY**: QG-04 vs M3-G-04)
- QG-05 (address) → M3-G-05
- QG-06 (premises type) → M3-G-06
- QG-07 (lease term) → M3-G-07
- QG-08 (operational?) → M3-G-08
- QG-09 (any customers?) → Not in case file ← minor gap
- QG-10 (licenses) → M3-G-10

**Decision: DELETE tab-g.json.** Content is fully superseded. No page should be created writing to QG-* keys. Data in M3-G-* keys (via business/page.tsx) is the authoritative source.

### tab-h.json — Source of Funds
**File:** `src/data/module3/tab-h.json` | **Route:** None  
**Key prefix:** `QH-*`

Content superseded by `investment/page.tsx`:
- QH-01 (total invested) → M3-F-02
- QH-02 (funding sources) → M3-F-05
- QH-03 (how long accumulated) → M3-H-02
- QH-04 (bank statements available?) → Not in case file ← minor gap
- QH-05 (gift or loan?) → M3-H-05
- QH-06 (who provided gift) → Not in case file ← minor gap
- QH-07 (gift letter signed?) → Not in case file ← consider adding
- QH-08 (transfer method) → M3-H-08
- QH-09 (wire records?) → M3-H-09
- QH-10 (foreign currency) → M3-H-10
- QH-11 (FX records) → Not in case file

**Decision: DELETE tab-h.json.** Consider adding QH-07 (gift letter confirmation) to Investment Cluster 3.

### tab-l.json — Dependents
**File:** `src/data/module3/tab-l.json` | **Route:** None  
**Key prefix:** `QL-*`

All content superseded by `family/page.tsx` with M3-L-* keys (different key prefix, same questions):
- QL-01 → M3-L-01, QL-02 → M3-L-02, ... QL-10 → M3-L-10

**Decision: DELETE tab-l.json.** Content fully superseded by family/page.tsx.

---

## Missing Structure — Tab F (Investment Evidence)

**Status:** No JSON file, no page route — CRITICAL GAP  
**What it should cover:** Documentary evidence status — what documents proving the investment actually exist  
**Distinct from investment/page.tsx which asks:** What was invested, where it came from, and the paper trail narrative

Tab F should function as a **Document Readiness Checklist** for investment evidence:
- Purchase agreement / franchise agreement status
- Wire transfer records confirmation
- Bank statement chain completeness
- Attorney trust account records
- Source of wealth documentation
- At-risk confirmation documentation
- Escrow or closing documents (if applicable)

**See `src/data/module3/tab-f.json` and `src/app/apply/module3/f/page.tsx` created this session.**

---

## Duplicate Question Registry

These are the confirmed cross-section duplicates writing to different database keys with no data bridge.

| Topic | Duplicate instances |
|---|---|
| Professional background | M3-S1-01, QD-01, M3-Q-04, QJ-03 |
| Qualifications for this business | M3-S1-03, QD-03 |
| Why making this move | M3-S1-02, QD-02 |
| First-year business plan | M3-S1-04, QD-04, QK-05 |
| Unusual circumstances / proactive disclosures | M3-S1-05, QD-06 |
| Home country ties and return intent | QD-05, M3-T-09/10/11, Q0-10 |
| Business description | M3-K-01, QK-01 |
| Target market | M3-K-02, QK-02 |
| Competitors and advantage | M3-K-03, QK-03 |
| Market size | M3-K-11, QK-11 |
| Market trends | M3-K-12, QK-12 |
| Ownership percentage | M3-E-06, QE-01, M3-A-55 |
| Business legal name | M3-E-01, QE-13, M3-A-51 |
| Legal entity type | M3-E-02, M3-E-10 (same page!), QE-10 |
| State of registration | M3-E-03, M3-E-11 (same page!), QE-11 |
| Hire/fire authority | M3-Q-22, QE-07 |
| Day-to-day operational control | M3-G-08a, QE-08 |
| Contract signing authority | M3-Q-23, QE-09 |
| Source of funds | Q0-06, M3-F-05, QH-02 |
| Total investment amount | Q0-07 (range), M3-F-02 (exact), QH-01 (exact) |
| Revenue projections | QI-01+02, ProjectionTable |
| Revenue basis | M3-I-03, QI-03 |
| Salary/draw Year 1 | M3-I-04, QI-04 |
| Full-time hires Year 1 | M3-I-05, QI-05 |
| Part-time hires Year 1 | M3-I-06, QI-06 |
| Planned hire roles | M3-I-07, QI-07 |
| Serves US economy? | M3-I-09, QI-09 |
| Non-marginality evidence | M3-I-10, QI-10 |
| Spouse applying? | M3-L-01, QL-01 |
| Spouse full name | M3-L-02, QL-02 |

---

## Pre-Fillable Fields (Redundant Collection)

These fields are redundant to ask because we either already have the answer from account data or from an earlier answer:

| Key | Question | Why it should pre-fill |
|---|---|---|
| M3-A-12 | Email address | Available from `auth.users` at account creation |
| M3-A-01 | Full legal name | Should prompt user to confirm, not re-type |
| M3-A-05 | Country of citizenship | Pre-filled from Q0-01 (quiz) |
| M3-A-21 | Prior US visas? | Already answered in Q0-09a (quiz) |
| M3-F-02 | Total invested (USD) | Pre-filled from Q0-07 (approximate) — confirm |
| M3-E-01 | Business legal name | Same as M3-A-51 (story section) |
| M3-E-06 | Ownership percentage | Same as M3-A-55 (story section) |

---

## Recommendations

### Priority 1 — Fix Internal Duplicates (Business Page)
Remove `M3-E-10` and `M3-E-11` from `business/page.tsx` — they ask the same questions as `M3-E-02` and `M3-E-03` already in the same page.

### Priority 2 — Build Tab F
Create investment evidence document readiness checklist. ✅ Done this session.

### Priority 3 — Resolve Orphaned JSONs
Delete `tab-g.json`, `tab-h.json`, `tab-l.json`. Content is fully superseded by the case file sections. Create redirect pages at `/apply/module3/g`, `/h`, `/l` pointing to the relevant case file sections. ✅ Done this session.

### Priority 4 — Pre-Fill Bridge for Tab D
Tab D wizard asks QD-01 to QD-06. On load, pre-fill QD-01, QD-02, QD-03, QD-04, QD-06 from M3-S1-01 through M3-S1-05 if they have been answered. Only QD-05 (return intent) is truly unique.

### Priority 5 — Add Missing Unique Questions to Case File
- QE-02 ("How is ownership documented?") → Add to Business Cluster 1 as M3-E-13
- QK-06 ("Equipment, inventory, or technology required?") → Add to Business Cluster 3
- QK-13 ("3-year growth plan") → Add to Business or Investment
- QK-14 ("Plans to expand beyond initial location?") → Add to Business

### Priority 6 — Email Pre-Fill
Auto-populate M3-A-12 from the user's authenticated email. Do not ask for it.

### Priority 7 — Consolidate Old Tab Routes
Once the case file sections are the primary data collection path, the old tab system (A, E, I, J, K) should either redirect to case file sections or be clearly labeled as "legacy" in the admin view.

---

## Questions with Unclear Value

| Key | Question | Concern |
|---|---|---|
| M3-T-12 to M3-T-16 (Ties, Cluster 5) | Draft your cover letter opening/sections | Users are doing AI's job — these manual drafts are NOT fed to the generation engine |
| M3-Q-03 | English language proficiency | DS-160 asks this, but we don't use it in any generated document |
| M3-I-12 | Other consulate location | Only needed if M3-I-11 = "other" — low-value catch-all |
| M3-B-02 | Approximate population of city or metro | Useful for Business Plan but user often has to guess |
| M3-B-03 | Direct competitors within 5 miles | Valuable for Business Plan but likely to produce "I haven't researched this" |

---

*Last updated: 2026-06-18 | Generated by comprehensive platform audit*
