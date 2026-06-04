# e2go — Spec Additions
## Decisions and Design from June 3, 2026 Session
## Add these to docs/ in ~/E2-go and commit before Session 15

---

## ADDITION 1 — KB Validation Layer
### Add to: Spec1_Analysis_Engine.md — between Gap Identification and Case Brief output

### Purpose
The Analysis Engine calculates scores against generic thresholds. The KB
Validation Layer is a second-pass check that cross-references every score
against the consulate intelligence research database — asking not just
"does this meet the threshold" but "does this meet the threshold for THIS
consulate with THIS business type based on what we actually know."

### Position in Pipeline
```
Layer 1 — Data Collection (Module 3 forms)
Layer 2 — Analysis Engine calculations (existing Spec1)
Layer 3 — Gap Identification (existing Spec1)
Layer 4 — KB Validation Layer (NEW — this section)
Layer 5 — Follow-up Conversation (Spec2)
Layer 6 — Document Generation (Spec3)
Layer 7 — Cross-Document Consistency (new Spec4 addition)
Layer 8 — Quality Gate (existing Spec4)
```

### KB Validation Process
```
inputs:
  consulate = applicant's filing consulate (from Tab A)
  business_type = franchise category or business type (from Tab K)
  analysis_scores = all scores from Layer 2

for each scored_dimension in analysis_scores:
  1. Pull consulate profile from E2_Global_Consulate_Intelligence_Reports
  2. Pull business type risk profile from E2_Business_Eligibility_Research
  3. Compare applicant score against KB benchmark for this 
     consulate + business type combination
  4. Produce kb_validation_score:
     CONFIRMED — KB agrees with calculated score
     OPTIMISTIC — calculated score higher than KB benchmark suggests
     CONSERVATIVE — calculated score lower (rare, note as strength)
     INSUFFICIENT_DATA — no KB data for this combination

  5. If kb_validation_score = OPTIMISTIC:
     → Downgrade dimension score by one level
     → Add to kb_flags[] with specific KB reference
     → Trigger targeted follow-up question in Layer 5
```

### Consulate-Specific Benchmarks Currently in KB

| Consulate | Investment Floor | Key Denial Pattern | Business Scrutiny |
|---|---|---|---|
| Toronto | $100K+ informal | Marginality, source of funds | Care franchises, consulting |
| London | $80K+ observed | Marginality, no physical presence | Solo consulting, online-only |
| Frankfurt | $100K+ | Page limit non-compliance | Condensed BP required |
| Auckland | $100K+ | Non-marginality, executive role | Position not supervisory |

### Business-Type-Specific Red Flags

These trigger automatic OPTIMISTIC downgrades regardless of calculated score:

```
Solo consulting + no employees planned
  → D-04 marginality risk elevated
  → Regardless of investment amount

Online-only business + no physical US premises
  → D-10 shell company risk elevated
  → At all consulates

Care franchise + investor has zero caregiving background
  → D-07 experience gap elevated
  → Must surface in follow-up conversation

Food franchise + investor never worked in food
  → experience_score auto-downgrade one level
  → FDD training offset still applies

Any business + investor salary = 90%+ of projected revenue
  → marginality_contribution_score = CRITICAL
  → Override income score regardless of ratio

Business acquisition
  → Triggers fresh substantiality review per 9 FAM 402.9-6(D)(a)
  → substantiality_score recalculated against purchase price not setup cost
```

### KB Validation Output

```json
{
  "kb_validation_complete": true,
  "consulate_profile_used": "toronto",
  "business_type_profile_used": "care_franchise",
  "kb_flags": [
    {
      "dimension": "executive_role_score",
      "calculated_score": "ADEQUATE",
      "kb_score": "OPTIMISTIC",
      "reason": "Toronto has been tightening on Assisting Hands 
                 applications — supervisory role must be explicit",
      "follow_up_triggered": "QFU-ROLE-01",
      "kb_reference": "E2_Global_Consulate_Intelligence_Report_Part1"
    }
  ],
  "dimensions_confirmed": ["substantiality_score", "fund_source_score"],
  "dimensions_flagged": ["executive_role_score", "marginality_contribution_score"],
  "second_opinion_summary": "2 of 8 dimensions flagged as optimistic 
                              against Toronto/care franchise KB benchmarks"
}
```

---

## ADDITION 2 — Executive Role Scoring
### Add to: Spec1_Analysis_Engine.md — Calculations section

### Purpose
Addresses the most common uncaught denial reason: 9 FAM 402.9-7(B).
The applicant's proposed role must meet the executive or supervisory
standard. This dimension is currently MISSING from the scoring engine.

### New Scoring Dimension: executive_role_score

```
inputs:
  proposed_title = Tab J answer (QJ-proposed-title)
  decision_authority = Tab J answer (hiring/firing/contracts authority)
  operational_control = Tab J answer (day-to-day management role)
  ownership_pct = Tab E answer (ownership percentage)
  employee_count_y1 = Tab I answer (Year 1 hiring plan)

executive_role_score:
  
  title_score:
    Owner / Managing Director / CEO / President / General Manager → STRONG
    Operations Director / VP / Director → ADEQUATE
    Manager + full authority confirmed → ADEQUATE
    Manager + limited authority → WEAK
    Employee-sounding title (Coordinator, Specialist, etc.) → CRITICAL
    No title defined → CRITICAL — block generation

  authority_score:
    Has hiring AND firing authority → +2
    Has contract signing authority → +1
    Controls operational budget → +1
    Day-to-day management confirmed → +1
    Score 4-5 → STRONG
    Score 2-3 → ADEQUATE
    Score 0-1 → WEAK

  combined_executive_role_score:
    Both STRONG → STRONG
    One STRONG one ADEQUATE → ADEQUATE
    Either WEAK → WEAK — flag W-ROLE-EXEC
    Either CRITICAL → CRITICAL — block generation, attorney referral
```

### New Module 0 Flag: W-ROLE-EXEC

```
Add to module0_scoring_logic.json:

{
  "code": "W-ROLE-EXEC",
  "question": "Q0-08",
  "trigger": "proposed_role_not_executive_or_supervisory",
  "level": "attorney_recommended",
  "message": "Your proposed role in the business must meet the 
    executive or supervisory standard under 9 FAM 402.9-7(B). 
    Officers look for hiring/firing authority, day-to-day 
    management control, and a title that reflects genuine 
    leadership. We recommend clarifying your role before 
    proceeding."
}
```

### New Tab J Questions Required

Add to module3_tabs_j_l.md Tab J section:

```
QJ-ROLE-01: What will your official title be in the U.S. business?
  Type: text
  Tooltip: Use your exact proposed title — this appears in 
    your cover letter and organizational chart.

QJ-ROLE-02: Will you have authority to hire and terminate employees?
  Type: select
  Options: Yes — full authority / Yes — with co-approval required /
    No — this is handled by someone else / Not yet determined
  Branch: No or Not determined → W-ROLE-EXEC flag

QJ-ROLE-03: Will you be responsible for day-to-day operational 
  decisions including scheduling, purchasing, and service delivery?
  Type: select
  Options: Yes — full operational control /
    Partially — shared with a manager /
    No — I will focus on strategy and growth
  Branch: No → W-ROLE-EXEC flag elevated

QJ-ROLE-04: Will you have authority to sign contracts and 
  financial commitments on behalf of the business?
  Type: select
  Options: Yes / No / Shared with partner
```

---

## ADDITION 3 — Split Marginality Scoring
### Add to: Spec1_Analysis_Engine.md — Marginality Ratio section

### Purpose
The current marginality_ratio only measures income vs household need.
9 FAM 402.9-6(E) has a two-part test. Part B — economic contribution —
is not currently scored. Officers check 402.9-6(E) primarily when the
hiring plan is weak, not when revenue is low.

### Replace existing marginality_ratio with two sub-scores:

```
marginality_income_score (existing — keep):
  year1_revenue / annual_household_need
  >= 5.0 → STRONG
  >= 3.0 → ADEQUATE
  >= 1.5 → WEAK
  < 1.5  → CRITICAL

marginality_contribution_score (NEW):
  
  job_creation_score:
    5+ US jobs Year 1 → STRONG
    3-4 US jobs Year 1 → ADEQUATE
    1-2 US jobs Year 1 → WEAK
    0 jobs planned → CRITICAL
  
  economic_activity_score:
    Produces goods/services for US market: confirmed → +1
    Economic activity beyond investor salary: documented → +1
    Job wages specified with timelines: yes → +1
    Community economic impact documented: yes → +1
    Score 3-4 → STRONG
    Score 2 → ADEQUATE
    Score 0-1 → WEAK

  combined_marginality_contribution_score:
    Both STRONG → STRONG
    Mixed → lower of the two
    If job_creation_score = CRITICAL → 
      combined = CRITICAL regardless of economic_activity

combined_marginality_score:
  Uses LOWER of income_score and contribution_score
  If contribution_score = CRITICAL → 
    override income_score, combined = CRITICAL
  Note: "Officer likely checking 402.9-6(E) due to weak 
    hiring plan — address contribution explicitly"
```

---

## ADDITION 4 — Cross-Document Consistency Engine
### Add to: Spec4_Quality_Gate_Pipeline.md — as new Stage before Quality Gate

### Purpose
The most dangerous denial pattern for prepared applications is D-09 —
interview answers inconsistent with submitted documents. A sub-category
of this is documents internally inconsistent with each other. An officer
who notices investment amounts differing by $1,500 across tabs treats
it as fabrication. This layer prevents that entirely.

### Position in Pipeline
Runs AFTER all documents are generated and BEFORE the Quality Gate.
Requires all documents to exist before it can run.

### Consistency Checks

```
NUMERIC CONSISTENCY (hard — any mismatch = fail):
  investment_amount_usd
    Must be identical in: Cover Letter, Tab F, Tab H, Business Plan
    Tolerance: zero — exact match required
    Format: consistent ($147,500 not $147500 not 147,500 USD)
  
  total_business_cost_usd
    Must be identical in: Tab F, Business Plan
  
  year1_revenue_projection
    Must be identical in: Tab I, Business Plan, Cover Letter
  
  year1_employee_count
    Must be identical in: Tab I, Tab K, Cover Letter
  
  year3_revenue_projection
    Must be identical in: Tab I, Business Plan

NAME CONSISTENCY (hard):
  business_legal_name
    Must be identical spelling/capitalization across all 11 tabs
  
  investor_full_name
    Must match passport exactly across all documents
  
  franchise_legal_name (if applicable)
    Must match FDD exactly

DATE CONSISTENCY (hard):
  llc_formation_date
    Must be identical across Tab G, Tab E, Business Plan

TIMELINE VALIDATOR (logic):
  Build chronological event map from all date answers
  Flag impossible sequences:
    llc_formation_date AFTER lease_signing_date → IMPOSSIBLE
    wire_transfer_date BEFORE bank_account_opened → IMPOSSIBLE
    fdd_review_date AFTER franchise_agreement_signed → IMPOSSIBLE
    interview_date BEFORE ds160_submitted → IMPOSSIBLE
  Any impossible sequence → CRITICAL flag, block generation
```

### Consistency Check Output

```json
{
  "consistency_check_passed": false,
  "hard_failures": [
    {
      "field": "investment_amount_usd",
      "documents_checked": ["cover_letter", "tab_f", "tab_h", "business_plan"],
      "values_found": {
        "cover_letter": "$147,500",
        "tab_f": "$147,500",
        "tab_h": "$148,500",
        "business_plan": "$147,500"
      },
      "verdict": "MISMATCH — Tab H differs by $1,000",
      "action": "Return Tab H to generation with correction instruction"
    }
  ],
  "timeline_violations": [],
  "soft_warnings": [],
  "overall": "FAIL — 1 hard failure must be resolved before download"
}
```

### Failure Handling

```
Hard failure → return SPECIFIC document to Stage 1 generation
  with exact correction instruction
  "Tab H investment amount must be $147,500 not $148,500"
  Never regenerate the entire application for a single mismatch

Timeline violation → flag for human review
  Present to user: "We found a date sequence that may need
  your attention before submission"
  User can correct the answer and regenerate affected document

Soft warning → include in Application Summary Brief
  Not a blocker — noted for applicant awareness
```

---

## ADDITION 5 — Applicant Preparation Brief
### Add to: Spec3_Generation_Prompts.md — as Document 16 (generated last)

### Purpose
The engine currently generates documents FOR the officer. This document
is generated FOR the applicant. It is not submitted — it is the
applicant's preparation guide for the interview.

### Content

```
Section 1 — Your 5 Most Important Facts (know these cold)
  Generated from Case Brief:
  - Your investment amount and what it represents
  - Your primary fund source and the paper trail
  - Your business description in one sentence
  - Your Year 1 hiring plan (specific)
  - Your proposed role and authority

Section 2 — Where Your Application Is Strong
  Dimensions scored STRONG or ADEQUATE
  Plain language explanation of why each is strong
  What to say if the officer asks about it

Section 3 — Where You Need to Be Careful
  Dimensions scored WEAK or WATCH
  What the officer may probe
  How your documents address it
  What NOT to say (common traps)

Section 4 — The Framing Decisions We Made
  For each framing_decision in Case Brief:
  Plain English: "We presented your investment this way because..."
  So you understand the argument in your own documents

Section 5 — Your Numbers Cheat Sheet
  One-page table:
  Investment amount: $147,500
  Total business cost: $195,000
  Substantiality: 75.6% of total cost
  Fund sources: 2 (RRSP $97,500 + savings $50,000)
  Year 1 revenue: $285,000
  Year 1 employees: 4 (2 FT caregivers, 1 PT admin, 1 PT caregiver)
  Year 3 revenue: $520,000
  Household need: $85,000/year
  Marginality ratio: 3.35x

Section 6 — Common Interview Questions for Your Business Type
  Pulled from Interview Simulator question bank
  Your specific answers based on your application data
  Not generic — personalized to Sarah Mitchell's actual case
```

### Generation Rules
- Generated LAST — after all 15 documents are complete
- Uses Case Brief + all generated documents as inputs
- Plain language — no legal jargon
- Never submitted to consulate — clearly labeled "FOR YOUR PREPARATION ONLY"
- Saved to DB as document type: preparation_brief
- Downloaded separately from the main application binder

---

## ADDITION 6 — Model Selection and A/B Testing
### Add to: Spec3_Generation_Prompts.md — Model Configuration section

### Model Architecture

```
Document Generation (all prose documents):
  default: claude-opus-4-8 (Anthropic direct API)
  fallback: claude-sonnet-4-6 (if Opus unavailable at run start)
  rule: Model locked at run start — never changes mid-run

Analysis Engine (structured calculations):
  model: claude-haiku-4-5 OR minimax/minimax-m2.5
  rule: Fast model appropriate — no prose generation

Follow-up Conversation (Module 4):
  model: claude-sonnet-4-6
  rule: Conversational, fast, lower stakes than documents

Interview Simulator (Module 5):
  model: claude-sonnet-4-6
  rule: Real-time responses needed

Applicant Preparation Brief:
  model: same as document generation model for this run
  rule: Must match voice of generated documents
```

### Model Lock Rule

```
At generation_run start:
  selected_model = user_preference || system_default
  generation_log.model_used = selected_model
  generation_log.model_locked_at = now()

  If selected_model unavailable:
    → Use fallback model
    → Log: model_override = true, original_model, fallback_model
    → Never silently switch — always log

  If model fails mid-run (Step 7 of 15):
    → Retry same step with same model (max 3 attempts)
    → If 3 failures: flag run as INTERRUPTED
    → Never switch to different model mid-run
    → Present to user: "Generation paused — resume when ready"
    → Resume picks up at failed step with same model
```

### A/B Testing Framework (Pre-Launch)

```
Admin flag: testing_mode = true
  When true: allows model_override per generation run
  Stores: run_id, model_used, all quality scores per document
  
Comparison metrics stored per run:
  - quality_gate_score per document (0-100)
  - ai_detection_score per document
  - page_count per document
  - legal_boundary_violations (should be 0)
  - cross_document_consistency_score
  - total_tokens_used
  - total_cost_usd
  - generation_time_seconds

Admin comparison view:
  Side-by-side runs for same test case
  Model A vs Model B on all metrics
  Highlight differences > 10% in any dimension
  Export comparison as PDF for human review
```

### Cost Reference (approximate, June 2026)

| Model | Input $/Mtok | Output $/Mtok | Est. per application |
|---|---|---|---|
| Opus 4.8 | $15 | $75 | ~$3-5 |
| Sonnet 4.6 | $3 | $15 | ~$0.60-1.00 |
| Haiku 4.5 | $0.80 | $4 | ~$0.15 |
| DeepSeek V4 Pro | ~$0.50 | ~$2 | ~$0.08 |

At $297 product price, Opus cost is <2% of revenue.
Recommendation: Use Opus for all document generation.
Use Sonnet/Haiku for all analytical/conversational tasks.

---

## ADDITION 7 — Denial Letter Cross-Reference
### Add to: module3_denial_audit.md — as new section

### Source: Auckland Consulate Standard Denial Form
### Date received: June 3, 2026
### Checked boxes on this specific denial: 402.9-6(E) and 402.9-7(B)

### Complete Checkbox Mapping — Every Box to D-Code

| Denial Checkbox | FAM Code | D-Code | Coverage Status |
|---|---|---|---|
| Not employee of treaty company | 402.94(A) | D-11 | ✅ Covered |
| Not national of treaty country | 402.94(B) | D-14 | ✅ Hard stop |
| No intent to depart | 402.9-4(C) | D-15 | ✅ Covered |
| Activities not constitute trade | 402.9-5(B) | D-14 | ✅ Covered |
| No substantial direct trade | 402.94B(C)(D) | D-01 partial | ⚠️ Strengthen |
| Not invested / not in process | 402.9-6(B) | D-02 | ✅ Covered |
| Business not real and active | 402.9-6(C) | D-10 | ⚠️ Partial |
| Investment not substantial | 402.9-6(D) | D-01 | ✅ Covered |
| ☑ Non-marginal economic impact | 402.9-6(E) | D-04/D-07 | ⚠️ Split score needed |
| No ownership/control | 402.9-6(F) | D-13 | ⚠️ Strengthen |
| ☑ Position not executive/supervisory | 402.9-7(B) | MISSING | ❌ Add W-ROLE-EXEC |
| No specialized skills | 402.9-7(C) | partial Tab J | ⚠️ Add to scoring |

### Action Items Before Session 15
1. Add executive_role_score dimension to Spec1 ✅ (this document)
2. Add W-ROLE-EXEC flag to module0_scoring_logic.json
3. Add QJ-ROLE-01 through QJ-ROLE-04 to Tab J questions
4. Split marginality_score into income + contribution ✅ (this document)
5. Strengthen D-13 ownership/control scoring

---

## COMMIT INSTRUCTIONS

Save this file to: ~/E2-go/docs/Spec_Additions_June3_2026.md

Then run:
git add docs/Spec_Additions_June3_2026.md
git commit -m "Add spec additions June 3 — KB validation, executive role, consistency engine, model selection"
git push origin dev

Before Session 15, integrate each addition into its parent spec file:
- Additions 1,2,3 → Spec1_Analysis_Engine.md
- Addition 4 → Spec4_Quality_Gate_Pipeline.md
- Addition 5 → Spec3_Generation_Prompts.md
- Addition 6 → Spec3_Generation_Prompts.md
- Addition 7 → module3_denial_audit.md

---
*Created: June 3, 2026*
*Session: Planning session with Claude.ai*
*Status: Ready to integrate into parent specs before Session 15*
