# SESSION 5 — Verify Transferable Skills Pipeline (Read-Only Audit)

**Branch:** dev
**Priority:** 🟡 HIGH — verifies the analysis→framing→generation pipeline for non-standard business types
**Agent:** engineering-code-reviewer (read-only)
**Date created:** 2026-06-13

---

## SCOPE

Pieces 1–3 + Tests A–B. Read-only investigation. No Playwright, no
screenshots, no modifications to Chen's application data, no live
Anthropic API calls without confirming first.

Application UUID: `9f981747-e3e4-4941-9f86-9871f8117b66` (Michael James Chen)

---

## PIECE 1 — Analysis Engine: 9 Experience Dimensions

**Question:** Does the analysis engine compute all 9 experience
dimensions from real data? Is `framing_decisions.experience` generated
generically or only for specific business types?

### Spec (Spec1_Analysis_Engine.md lines 80–108)

The spec defines 9 `experience_dimensions`:
1. `direct_industry_experience`
2. `management_experience`
3. `business_ownership_experience`
4. `relevant_education`
5. `caregiving_experience`
6. `sales_customer_experience`
7. `technical_experience`
8. `franchise_training_program`
9. `transferable_skills_identified`

Each dimension should be scored CONFIRMED / PARTIAL / INFERRED / ABSENT.

### Implementation (src/lib/analysis-engine.ts)

**FINDING: The analysis engine is a skeleton/stub.**

- `loadApplicationAnswers()` (line 62–64): Returns `{}` — never reads from DB.
- `calculateExperienceScore()` (line 85–87): Returns hardcoded `'ADEQUATE'`.
- `generateFramingDecisions()` (line 124–126): Returns `[]` — always empty.
- `assembleCaseBrief()` (line 128–157): Returns hardcoded values. `framing_decisions: []`.

None of the 9 experience dimensions are computed. The engine does not
read real applicant data for ANY scoring function.

### Verdict — Piece 1

**FAIL.** The 9 experience dimensions are specified but not implemented.
`framing_decisions` is always `[]` regardless of business type. The
engine is a structural placeholder — all scores are hardcoded constants.

---

## PIECE 2 — Follow-Up Question Generation: Non-Standard Business Types

**Question:** Does follow-up question generation work for business
types outside care/food/education?

### Implementation (src/app/api/followup/generate-questions/route.ts)

Business type extraction (line 106–109):
```typescript
const businessType = answersMap['business_type'] ||
                    answersMap['qb-type'] ||
                    answersMap['qf-type'] ||
                    'the selected business type';
```

**FINDING: For Chen's application, ALL three keys are missing.**
- `answersMap['business_type']` → undefined
- `answersMap['qb-type']` → undefined
- `answersMap['qf-type']` → undefined
- Falls back to `'the selected business type'`

The AI prompt (line 156–165) passes this generic string to the LLM:
```
BUSINESS TYPE: the selected business type
```

The AI can still generate useful questions from the case brief summary
and Tab J answers, but the business-type-specific gap categories
(line 134–142) are generic, not tailored.

The DEFAULT_QUESTIONS fallback (lines 13–49) are also generic — no
business-type-specific questions.

### Verdict — Piece 2

**PARTIAL.** The system does not crash for non-care/food/education
types, but the business type context is lost (falls back to generic
string). The AI-generated questions will be less targeted because
they lack the specific business type. The `DEFAULT_QUESTIONS` fallback
is also generic. No business-type-specific question templates exist
for franchise, retail, or service businesses outside the three
named categories.

---

## PIECE 3 — CREATIVE FRAMING INSTRUCTION in Generation Prompts

**Question:** Is the `CREATIVE FRAMING INSTRUCTION` populated from
`framing_decisions`, or is it a static placeholder?

### Spec (Spec3_Generation_Prompts.md line 155–163)

```
CREATIVE FRAMING INSTRUCTION:
[Generated from Case Brief framing_decisions for experience]
Example: "The applicant has no direct caregiving employment..."
```

The spec says this should be GENERATED from `framing_decisions`.

### Implementation in Prompt Files

**qualifications.md (lines 116–118):**
```
Use the framing from the Case Brief's framing_decisions for experience.
If the applicant lacks direct industry experience, frame transferable
skills without mentioning the gap.
```

**qualifications.md (lines 172–177):**
```
Use the Case Brief's framing decisions. If the framing decision
says "frame caregiving as management experience," describe the
specific management skills demonstrated...
```

**cover_letter.md, business_plan.md, investment_proof.md,
source_of_funds.md, ds160_reference.md:** No `CREATIVE FRAMING`
reference at all.

### How framing_decisions Reaches the Prompt

`buildGenerationPayload()` (generation-engine.ts line 231–240) passes
`caseBrief` as-is to the prompt context. The prompt template files
reference `framing_decisions` as text instructions — they tell the
LLM to "use the framing from the Case Brief's framing_decisions."

**But `generateFramingDecisions()` always returns `[]`.**
So `case_brief_json.framing_decisions` is always empty.

The qualifications prompt has a hardcoded example (caregiving) but
no dynamic content is injected. The `CREATIVE FRAMING INSTRUCTION`
in Spec3 is a template description, not a runtime-populated field.

### Verdict — Piece 3

**FAIL.** The `CREATIVE FRAMING INSTRUCTION` is a static placeholder
in the spec. In the actual prompt files, framing is referenced as
text instructions ("Use the framing from the Case Brief's
framing_decisions"), but since `framing_decisions` is always `[]`,
these instructions have no data to work with. The only concrete
example is the hardcoded caregiving scenario in qualifications.md.
For any business type without a hardcoded example, the framing
instruction is effectively empty.

---

## TEST A — Chen's BRIDGE Sentence

**Question:** Does Chen's existing generated content contain a
BRIDGE sentence connecting prior experience to the business?

### Chen's Generated Qualifications Document

The `bridge_paragraph` section exists in `content_json.sections`:

> Mr. Chen's nineteen years managing bank branches at RBC Royal Bank
> prepared him for the specific demands of operating a Kumon center.
> Running three branches with 47 staff required hiring and developing
> people, managing a profit and loss statement against revenue targets,
> and executing within a defined operational framework — the same
> competencies needed to recruit and train Kumon instructors, manage
> tuition revenue toward enrollment goals, and implement Kumon's
> operational standards at the Cedar Park location. The Kumon franchise
> training curriculum he will complete before opening adds the
> instructional and center-specific knowledge to a foundation of
> operational management already built over two decades.

### Analysis

The bridge sentence EXISTS and is high quality. It:
- ✅ Connects prior experience (19 years at RBC) to this specific business (Kumon)
- ✅ Uses specific metrics (19 years, 3 branches, 47 staff)
- ✅ Maps specific skills to specific Kumon operations
- ✅ References franchise training as prospective qualification
- ✅ Does not mention any "gap" — presents only strength
- ✅ Follows the qualifications.md Section V template structure

**However:** This bridge was generated by the LLM following the
prompt template, NOT by dynamic `framing_decisions` data. The LLM
inferred the transferable skills from the case brief's `qualifications`
field ("19 years progressive management experience in financial
services") and created the bridge independently. The `framing_decisions`
array was empty at generation time.

### Verdict — Test A

**PASS (with caveat).** Chen's content has a strong, specific bridge
sentence. It works because the LLM is capable of inferring
transferable skills from context. The caveat: this was not driven by
the `framing_decisions` pipeline — the pipeline was empty. The LLM
did the framing work on its own.

---

## TEST B — Synthetic Dry-Run: Warehouse Supervisor → Cleaning Franchise

**Scenario:** Applicant with warehouse supervisor experience applying
for a commercial cleaning franchise. Dry-run prompt construction
(no API call).

### What Would Happen

1. **Analysis engine:** `calculateExperienceScore()` returns
   `'ADEQUATE'` (hardcoded). `generateFramingDecisions()` returns `[]`.
   The 9 experience dimensions are not computed. The system does not
   detect that this applicant has:
   - ✅ management_experience (warehouse team supervision)
   - ✅ transferable_skills_identified (operations, scheduling, QA)
   - ❌ direct_industry_experience (no cleaning industry background)
   - ❌ caregiving_experience (N/A)
   - ❌ franchise_training_program (not yet completed)

2. **Follow-up generation:** Business type falls back to
   `'the selected business type'` (no `business_type` key in answers).
   The AI receives a generic prompt and generates generic questions.
   It cannot tailor questions to "commercial cleaning franchise"
   specifically.

3. **Generation prompt:** `framing_decisions` is empty. The
   qualifications prompt says "Use the framing from the Case Brief's
   framing_decisions for experience" but there is nothing to use.
   The LLM must infer transferable skills from raw case brief data
   on its own — which it may do well or poorly depending on the
   data quality.

4. **Bridge paragraph:** The LLM would need to construct a bridge
   from "warehouse supervisor" to "commercial cleaning franchise
   owner" without any framing guidance. This is a harder inference
   than Chen's (bank manager → Kumon) because the skill transfer
   is less obvious.

### Verdict — Test B

**AT RISK.** The pipeline has no dynamic framing support. For
business types where the skill transfer is obvious (Chen: banking
management → education center management), the LLM handles it.
For less obvious transfers (warehouse supervision → cleaning
franchise), the lack of `framing_decisions` means the LLM is
operating without the strategic guidance the spec intended.

---

## COMPLETION REPORT

```
=== Piece 1: Analysis Engine — 9 Experience Dimensions ===
STATUS: FAIL
Findings:
- analysis-engine.ts is a skeleton/stub — all scoring functions return hardcoded values
- loadApplicationAnswers() returns {} — never reads from database
- calculateExperienceScore() returns 'ADEQUATE' regardless of input
- generateFramingDecisions() returns [] — always empty
- None of the 9 experience dimensions are computed from real data
- framing_decisions is never populated for ANY business type

=== Piece 2: Follow-Up Question Generation ===
STATUS: PARTIAL
Findings:
- Business type extraction looks for 'business_type', 'qb-type', 'qf-type'
- For Chen (and likely most seeded apps): all three keys are missing
- Falls back to generic string 'the selected business type'
- AI-generated questions work but lack business-type-specific targeting
- DEFAULT_QUESTIONS are generic — no franchise/retail/service-specific templates
- Does not crash, but produces less relevant questions

=== Piece 3: CREATIVE FRAMING INSTRUCTION ===
STATUS: FAIL
Findings:
- Spec3 describes 'CREATIVE FRAMING INSTRUCTION' as [Generated from framing_decisions]
- qualifications.md references framing_decisions in text instructions (lines 116, 172)
- cover_letter.md, business_plan.md, investment_proof.md: no framing reference
- generateFramingDecisions() always returns [] — no data to populate
- Only concrete example is hardcoded caregiving scenario in qualifications.md
- For non-care business types, the framing instruction is effectively empty
- The generation engine (buildGenerationPayload) passes caseBrief as-is,
  but caseBrief.framing_decisions is always []

=== Test A: Chen's BRIDGE Sentence ===
STATUS: PASS (with caveat)
Findings:
- Bridge paragraph EXISTS in qualifications content_json.sections
- Quality: strong, specific, uses metrics (19 years, 3 branches, 47 staff)
- Maps RBC management skills → Kumon operations explicitly
- References franchise training as prospective qualification
- CAVEAT: Generated by LLM inference, NOT by framing_decisions pipeline
- framing_decisions was [] at generation time — LLM did the work independently

=== Test B: Synthetic Warehouse Supervisor → Cleaning Franchise ===
STATUS: AT RISK
Findings:
- Analysis engine would return hardcoded 'ADEQUATE' — no real assessment
- Follow-up would use generic business type string
- Generation prompt would have empty framing_decisions
- LLM must infer transferable skills from raw data without strategic guidance
- Skill transfer (warehouse → cleaning) is less obvious than Chen's (banking → education)
- Pipeline works "by luck" when LLM is capable, fails when it needs guidance
```

---

## OVERALL VERDICT

**The transferable skills pipeline is structurally complete but
operationally hollow.** The spec defines 9 experience dimensions,
framing decisions, and creative framing instructions — but the
analysis engine is a stub that returns hardcoded values, framing
decisions are always empty, and the generation prompts rely on
static text instructions with no dynamic data.

**What works:** The generation prompts are well-structured. When the
LLM is capable (Chen's case), it produces strong bridge sentences
and transferable skill connections without pipeline support. The
prompt templates provide good structural guidance.

**What doesn't work:** The pipeline provides no strategic value for
non-obvious skill transfers. The analysis engine doesn't assess
experience. Framing decisions don't exist. Follow-up questions
lack business-type targeting.

---

## NEXT-SESSION SCOPE (if desired)

1. **Implement `calculateExperienceScore()`** — read real answers,
   compute the 9 dimensions, produce CONFIRMED/PARTIAL/INFERRED/ABSENT
   for each. Priority: HIGH.

2. **Implement `generateFramingDecisions()`** — given scores + KB
   flags + denial risks, produce FramingDecision[] with area,
   approach, legal_basis, priority. Priority: HIGH.

3. **Wire framing_decisions into generation prompts** — modify
   `buildGenerationPayload()` or the prompt template system to
   dynamically inject framing decisions into the CREATIVE FRAMING
   INSTRUCTION section. Priority: HIGH.

4. **Fix business type extraction in follow-up** — add QA-51 or
   case brief business field as fallback for business type.
   Priority: MEDIUM.
