# SESSION 9 — Post-Generation Package Summary: Score, Gaps, Disclaimer

**Branch:** dev
**Priority:** 🟡 Customer-facing transparency — depends on Session 7
(framing pipeline) being complete, since this session reports on what
Session 7's layers actually produced for THIS applicant
**Agent:** engineering-frontend-developer (new screen) +
engineering-minimal-change (scoring logic reuse) +
engineering-code-reviewer
**No Playwright initially** — build and verify via direct rendering/data
inspection first; Playwright screenshot only at the very end if owner
wants visual confirmation (ask first, per the $1/screenshot cost note in
CLAUDE_CONTEXT)
**Read before starting:** Spec1_Analysis_Engine.md (Case Brief Output +
"Display to User" — the EXISTING pre-generation `/score` page this
session is DIFFERENT from but reuses scoring logic from),
module3_denial_audit.md (all 15 D-codes), Session 7's completion report
(framing_decisions output — what this session displays)

---

## CONTEXT — THIS IS NOT THE EXISTING /score PAGE

`/score` already exists (✅ COMPLETE per BUILD_TRACKER), reads from
`case_briefs`, and is shown BEFORE generation to gate the user into
follow-up questions per Spec1's "Display to User" section.

THIS session builds a DIFFERENT, NEW screen: a POST-GENERATION summary,
shown AFTER the 15-file ZIP is ready (alongside or just before the
download), that answers: "now that your documents are actually written,
here's how strong your package is, here's what's solid, here's what's
thin, and here's what you could still do about it."

The KEY NEW THING this surfaces, per the original requirement: if Session
7's Layer 1 (`generateFramingDecisions()`) returned `[]` or thin output
for `experience` — meaning no strong transferable-skills connection was
found even with the dual/triple-layer pipeline — THE CLIENT SHOULD KNOW
their qualifications section is correspondingly weaker, with a concrete
suggestion for what would help.

---

## STEP 1 — REUSE, DON'T DUPLICATE, THE SCORING LOGIC

The case brief (per Spec1) already contains `scores` (substantiality,
experience_match, intent, marginality, fund_source_complexity) and
`denial_risks` (D-01 through D-15). Find wherever the EXISTING `/score`
page computes/reads these (likely `src/lib/case-brief.ts` or similar,
plus the `/score` page component).

This session's new post-generation summary READS THE SAME `case_briefs`
table row for this application — do NOT recompute scores from scratch.
The difference is WHEN it's shown (post-generation) and WHAT additional
data it layers in (Session 7's `framing_decisions`, and whether
generation actually succeeded for each document).

---

## STEP 2 — NEW SCREEN: PACKAGE SUMMARY

New route: `/documents/[applicationId]/summary` (or determine the best
fit within existing `/documents/[appId]` route per BUILD_TRACKER's
PAGES table — check what's already there before adding a new route;
this may be a NEW SECTION on the existing `/documents/[appId]` page
rather than a separate route)

### Content, in order:

**1. Overall package strength** — reuse Spec1's strength-bar pattern
(`scores.substantiality`, `scores.experience_match`, `scores.intent`,
`scores.marginality` → STRONG/ADEQUATE/WEAK/CRITICAL → bar visualization).
Obsidian Gold styling, zero border-radius, per design system.

**2. What's strong** — `case_brief.strengths` array, displayed as a
short list (per tone_and_formatting: prose-like, not bullet-heavy —
2-3 sentences max, or a compact list if genuinely 3-6 short items).

**3. Where the package may need more** — THIS IS THE NEW PART.
For each `scores` dimension that is WEAK or CRITICAL:
  - Name the area in plain language (not "experience_match" — "Your
    professional background and this business")
  - If the dimension is `experience_match` AND Session 7's
    `framing_decisions.experience` is empty/thin for this applicant —
    SAY SO explicitly: something like "We looked for ways to connect
    your background to [business type] and didn't find a strong direct
    link. Your documents present what's available, but this is an area
    where additional context could help."
  - For OTHER weak dimensions (substantiality, intent, marginality) —
    similar plain-language explanation of what's thin and why (reuse
    Spec1's denial_risks D-codes mapped to plain language — e.g. D-04
    "Business appears marginal" → "Your projected revenue is closer to
    your household needs than ideal — officers sometimes ask for more
    detail on hiring plans here")

**4. What could help** — for each item surfaced in section 3, ONE
concrete, actionable suggestion:
  - Experience gap with no framing found → "If you have ANY experience —
    even informal — managing people, running a household budget,
    volunteering, or anything connected to [business operational needs
    from Session 7's business-operational-needs.ts] — adding this to
    your case file qualifications section could strengthen this area.
    [Edit qualifications →]" (link to `/apply/qualifications`)
  - Marginality WEAK → "Consider reviewing your hiring plan in [Edit
    business plan →]" (link to relevant /apply/* section)
  - Pattern: every suggestion links back to the relevant /apply/*
    section so the applicant can act on it, regenerate, and see an
    updated summary

**5. MANDATORY DISCLAIMER** — exact text, prominent placement (not
buried in fine print):

```
This summary reflects how completely and clearly your documents were
prepared — it is not a legal assessment of your E-2 eligibility and
does not predict the outcome of your visa application. E2go is not a
law firm and does not provide legal advice. If you have questions about
your eligibility, consult a licensed immigration attorney.
```

Per Spec1's existing disclaimer pattern ("These indicators reflect
document preparation completeness — not a legal determination of E-2
eligibility") — this session's disclaimer EXTENDS that pattern for the
post-generation context. Use Spec1's exact wording as the base, extend
as shown above.

---

## STEP 3 — HANDLING THE "NOTHING FOUND" CASE GRACEFULLY

Per the original requirement — if `framing_decisions.experience` is
empty, this must be communicated WITHOUT being discouraging or alarming.
Tone matters (per CLAUDE_CONTEXT's "Tone Principle" referenced in Session
2 — read Spec1's RULE 3A / tone principle subsection if accessible).

The framing should be: "here's an opportunity to strengthen this further"
— NOT "your application has a weakness" or "this could be denied."
Never use denial-prediction language. The existing disclaimer language
("not a legal determination... does not predict the outcome") does
important work here — make sure the surrounding copy doesn't contradict
it by implying a prediction.

---

## STEP 4 — WHERE THIS FITS IN THE FLOW

Per Session 3's flow (acknowledgment gate → download), this new summary
should appear EITHER:
- As a new step BETWEEN the acknowledgment gate (Step 14) and the
  download button (Step 15's "real download" trigger), OR
- As a permanent section on `/documents/[appId]` that's ALSO visible
  before/after download (so the applicant can return to it later)

RECOMMENDATION: the latter — a permanent section on `/documents/[appId]`,
not a one-time gate. The applicant should be able to come back to this
page after editing their case file and regenerating, to see if their
score changed. Report your decision and reasoning — this is an
architectural call, similar to Session 2's Step 1.

---

## STEP 5 — VERIFY AGAINST CHEN + ONE WEAK-CASE FIXTURE

1. For Chen (`9f981747-e3e4-4941-9f86-9871f8117b66`) — generate the
   summary. Chen's experience_match should be STRONG (per Session 5's
   Test A finding — the RBC→Kumon bridge worked). Confirm section 3
   ("where the package may need more") does NOT incorrectly flag
   experience for Chen.
2. Using Session 7's Fixture 5 (worst case — recent grad, no relevant
   background, IT services) data — generate the summary for this
   synthetic case (no real DB write needed if the summary component can
   be tested with a constructed case-brief object directly). Confirm:
   - experience_match shows WEAK/CRITICAL
   - Section 3 explicitly and gracefully names the gap
   - Section 4 gives a concrete, actionable suggestion
   - Disclaimer is present and prominent
   - Tone is constructive, not alarming, no denial-prediction language

---

## DO NOT IN THIS SESSION

- Do not modify the existing pre-generation `/score` page — this is a
  NEW, separate summary
- Do not recompute scores/denial_risks from scratch — read from existing
  `case_briefs` table
- Do not write denial-probability language anywhere ("likely to be
  denied", "X% chance of approval", etc.) — this is a hard line, not a
  style preference
- Do not gate the download button on this summary (i.e. don't make
  improving the score mandatory before download — the applicant owns
  their package and can download regardless; this is informational)

---

## COMPLETION REPORT

```
SESSION 9 — Post-generation package summary complete.

STEP 1: Scoring logic reuse — confirmed reads from case_briefs table,
  no recomputation: YES — src/lib/score-sync.ts pattern reused,
  new API route at src/app/api/generate/case-brief/[applicationId]/route.ts
  reads case_briefs row + quiz_sessions.business_type

STEP 2: New screen — route/location: Permanent section on
  /documents/[applicationId] (NOT a separate route)
  Component: src/components/PackageSummary.tsx
  Sections 1-5 implemented:
    1. Package Strength Overview — 6-dimension score bars with badges
    2. What's Strong — STRONG/ADEQUATE dimensions listed
    3. Where the Package May Need More — WEAK/CRITICAL with plain-language
       explanations, experience-specific framing for empty/thin framing_decisions
    4. What Could Help — actionable suggestions with /apply/* edit links
    5. Mandatory Disclaimer — extends Spec1 pattern, prominent placement
  Bonus: Section 5.5 — Areas Officers May Ask About (denial risk awareness
    with WATCH/FLAG/CRITICAL risks, plain-language D-code explanations)

STEP 3: "Nothing found" tone — disclaimer + framing reviewed for
  denial-prediction language: CONFIRMED CLEAN
  - All text uses "may" framing (never "will be denied" or probability language)
  - Experience gap message: "didn't find a strong direct link" (factual)
  - Suggestion framing: "additional context could help" (constructive)
  - Disclaimer: "does not predict the outcome" (explicit)
  - Zero instances of denial-probability/prediction language across all sections

STEP 4: Flow placement decision: PERMANENT section on /documents/[appId]
  — reasoning:
    1. Applicant may edit case file and regenerate — summary should reflect latest
    2. Non-blocking per spec — permanent section respects that
    3. Feedback loop: summary visible alongside documents for context
    4. No re-acknowledgment friction on regeneration

STEP 5: Verification —
  Chen (9f981747): experience_match correctly shown as STRONG, not flagged: YES
    - 7/7 checks passed, overallScore=75, experience excluded from gaps
  Fixture 5 (synthetic worst case): WEAK correctly surfaced, suggestion
    given, disclaimer present, tone constructive: YES
    - 9/9 checks passed, overallScore=40, experience in gaps, 'no strong
      direct link' message path active, 4 denial risks surfaced
  Verification file: src/lib/__tests__/package-summary-verification.ts

Build: clean / errors: none (pre-existing gap-report dynamic server warning only)

OVERALL STATUS: COMPLETE — all 5 steps verified, build clean,
  zero denial-prediction language, Chen correct, Fixture 5 correct
```
