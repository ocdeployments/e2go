## Pipeline Integration Rules
- Partnership status: Generate two separate complete application packages for partnership applications.

---

## Purpose

The Analysis Engine runs once — after Module 3 personal tabs are
complete and before any document is generated. It reads every
answer the applicant has provided, calculates key metrics, identifies
strengths and gaps, and produces a structured Case Brief.

The Case Brief feeds every document generation prompt.
No document is generated without a completed Case Brief.

---

## Inputs

All answers from:
- Module 0 quiz session (nationality, investment amount, business type,
  family composition, timeline, prior history flags)
- Module 3 Tabs A through L (all collected answers)
- Writing sample (voice profile + content signals)
- Follow-up conversation responses

---

## Calculations — Run Every Time

### 1. Investment Substantiality

```
investment_amount_usd = Tab F answer (converted to USD)
total_business_cost_usd = Tab K answer (total startup cost)
net_worth_usd = Tab F net worth calculation

investment_pct_of_business_cost = investment_amount_usd / total_business_cost_usd
investment_pct_of_net_worth = investment_amount_usd / net_worth_usd

substantiality_score:
  investment_pct_of_business_cost >= 0.70 → STRONG
  investment_pct_of_business_cost >= 0.50 → ADEQUATE
  investment_pct_of_business_cost >= 0.30 → WEAK — flag for stronger framing
  investment_pct_of_business_cost < 0.30  → CRITICAL — flag for attorney review

walsh_pollard_satisfied:
  investment_pct_of_net_worth >= 0.50 → YES — cite Walsh & Pollard explicitly
  investment_pct_of_net_worth >= 0.25 → PARTIAL — use proportionality argument
  investment_pct_of_net_worth < 0.25  → WEAK — needs additional framing
```

### 2. Fund Source Complexity

```
sources = count of distinct fund sources in Tab H

source_types = [savings, property_equity, rrsp, tfsa,
                investment_accounts, gift, inheritance,
                business_sale, property_sale, loan_personal,
                loan_heloc, other]

complexity_score:
  1 source, clean paper trail → SIMPLE
  2 sources, clean → STANDARD
  3+ sources OR any non-standard source → COMPLEX
  any cash, crypto, informal transfer → HIGH RISK — flag

gap: any source without documented paper trail → FLAG_GAP
```

### 3. Experience Match Score

```
business_category = Tab K answer (franchise type or business type)
applicant_background = Tab J answers (employment history, education,
                        skills, certifications)
writing_sample_content = extracted content signals

experience_dimensions = [
  direct_industry_experience,      # same sector
  management_experience,           # managing teams/budgets
  business_ownership_experience,   # prior business ownership
  relevant_education,              # degree/certification in field
  caregiving_experience,           # for care/service businesses
  sales_customer_experience,       # for retail/service businesses
  technical_experience,            # for technical businesses
  franchise_training_program,      # FDD training curriculum
  transferable_skills_identified   # from follow-up conversation
]

For each dimension:
  CONFIRMED — explicitly stated in answers
  PARTIAL — mentioned but not detailed
  INFERRED — suggested by follow-up conversation
  ABSENT — no evidence found

overall_experience_score:
  5+ dimensions CONFIRMED → STRONG
  3-4 dimensions CONFIRMED → ADEQUATE
  1-2 dimensions CONFIRMED → WEAK — requires creative framing
  0 dimensions CONFIRMED → CRITICAL — follow-up conversation essential

franchise_training_offset:
  If business is franchise AND FDD training program exists:
    Reduce WEAK to ADEQUATE automatically
    Note: "Franchisor training program addresses develop and direct standard"
```

### 4. Non-Immigrant Intent Score

```
confirmed_ties = count from NI composite (Tabs A, L, follow-up)

ties_categories = [
  property_retained_home_country,
  family_remaining_home_country,
  financial_accounts_maintained,
  professional_memberships_maintained,
  community_ties_documented,
  return_intention_stated
]

intent_score:
  4+ ties CONFIRMED → STRONG
  2-3 ties CONFIRMED → ADEQUATE
  1 tie CONFIRMED → WEAK — flag W-NI-WEAK
  0 ties CONFIRMED → CRITICAL — attorney flag W-NI-NONE

risk_flags:
  sold_home_before_application → FLAG_HIGH
  closed_all_accounts → FLAG_HIGH
  all_family_moving → FLAG_MEDIUM
```

### 5. Denial Risk Assessment

```
Check every answer against the 15 denial categories
from docs/module3_denial_audit.md:

D-01 Investment not substantial → substantiality_score < ADEQUATE
D-02 Funds idle not at risk → deployment_confirmed = false
D-03 Source of funds gaps → any FLAG_GAP in fund sources
D-04 Business appears marginal → marginality_ratio < 2.5
D-05 Business plan generic → projection_basis = estimate_only
D-06 Revenue projections inflated → fdd_item19_anchored = false (franchise)
D-07 No credible hiring plan → hiring_plan_specificity < ADEQUATE
D-08 Cannot answer about own business → follow_up_gaps_unfilled
D-09 Interview inconsistency → cross_doc_consistency_score < 1.0
D-10 Shell company → phase1_checklist_incomplete
D-11 Passive investment → confirmed in quiz
D-12 Loan secured by business assets → flagged in Tab F
D-13 Ownership not documented → membership_ledger_uploaded = false
D-14 Business type does not qualify → flagged in quiz
D-15 214b immigrant intent → intent_score < ADEQUATE

For each denial category:
  CLEAR — no risk indicators
  WATCH — minor risk, address in documents
  FLAG — significant risk, requires strong counter-argument
  CRITICAL — attorney referral recommended
```

### 6. Marginality Ratio

```
marginality_income_score:
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

## Gap Identification

After all calculations, the engine identifies gaps in three categories:

### Category A — Hard Gaps (block document generation)
These must be resolved before generation can proceed.
User is returned to the relevant tab with specific instruction.

- investment_amount_usd = null
- fund_sources = empty
- business_type = null
- net_worth_usd = null
- LLC_name = null (for Batch 2 documents)

### Category B — Content Gaps (require follow-up conversation)
These are filled through the follow-up conversation before generation.

- experience_score < ADEQUATE and follow_up_not_completed
- motivation_story = null
- voice_sample = null or failed_ai_detection
- caregiving_experience_unexplored (care franchise + no direct experience)
- community_involvement_unexplored
- family_business_involvement_unexplored
- foreign_business_involvement_unexplored
- informal_leadership_unexplored

### Category C — Framing Gaps (handled in generation)
These are addressed through creative framing in the generation prompts.
No additional client input required — the engine makes strategic decisions.

- experience_score = WEAK but transferable_skills_identified
- substantiality_score = WEAK but walsh_pollard_satisfied
- intent_score = ADEQUATE with some family moving
- marginality_ratio = ADEQUATE but strong hiring plan

---

## Case Brief Output

The engine produces a structured JSON case brief:

```json
{
  "applicant_id": "[uuid]",
  "generated_at": "[timestamp]",
  "case_summary": {
    "overall_strength": "STRONG | ADEQUATE | WEAK | CRITICAL",
    "ready_for_generation": true | false,
    "blocking_gaps": [],
    "content_gaps_for_followup": [],
    "framing_decisions": []
  },
  "scores": {
    "substantiality": "STRONG | ADEQUATE | WEAK | CRITICAL",
    "experience_match": "STRONG | ADEQUATE | WEAK | CRITICAL",
    "intent": "STRONG | ADEQUATE | WEAK | CRITICAL",
    "marginality": "STRONG | ADEQUATE | WEAK | CRITICAL",
    "fund_source_complexity": "SIMPLE | STANDARD | COMPLEX | HIGH_RISK"
  },
  "denial_risks": {
    "D-01": "CLEAR | WATCH | FLAG | CRITICAL",
    "D-02": "CLEAR | WATCH | FLAG | CRITICAL",
    // ... all 15
  },
  "strengths": [
    "Investment at 62.5% of business cost — strong substantiality",
    "Clean two-source fund trail — savings and HELOC",
    "Toronto has approved Assisting Hands applications"
  ],
  "framing_decisions": [
    {
      "area": "experience",
      "approach": "Lead with 12 years managing teams of 47 employees. Bridge to franchise management requirements. Supplement with 6-year family caregiving identified in follow-up.",
      "legal_basis": "9 FAM 402.9-6(F) — develop and direct test based on control not sector expertise"
    }
  ],
  "document_priorities": {
    "cover_letter": ["substantiality_argument", "experience_framing", "hiring_plan"],
    "declaration": ["investment_irrevocability", "develop_and_direct", "intent_ties"],
    "qualifications": ["management_experience", "caregiving_bridge", "franchise_training"],
    "substantiality_memo": ["walsh_pollard", "investment_pct_business_cost", "net_worth_context"]
  },
  "voice_profile": {
    "sentence_length": "medium",
    "vocabulary_level": "accessible_professional",
    "register": "warm_formal",
    "active_passive_ratio": 0.87,
    "argument_style": "story_first",
    "emotional_tone": "grounded_confidence"
  }
}
```

---

## Display to User

The case brief is never shown to the user in raw form.

The dashboard shows a simplified version:

```
Your Application Strength

Investment case:     ████████░░  Strong
Your qualifications: ██████░░░░  Good — we have questions
Your business plan:  ████████░░  Strong
Non-immigrant ties:  ███████░░░  Good

Before we generate your documents, we have a few
questions that will make your application significantly
stronger. This takes about 10 minutes.

[Continue to questions →]
```

The strength bars are informational only.
They do not constitute a legal assessment of eligibility.
Disclaimer shown below: "These indicators reflect document
preparation completeness — not a legal determination
of E-2 eligibility."
