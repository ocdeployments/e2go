# SESSION — Walsh and Pollard Citation Fix

**Branch:** dev
**Priority:** 🔴 HIGH — incorrect legal citation actively appears in
generated documents
**Agent:** engineering-minimal-change
**Read before starting:** CLAUDE_CONTEXT.md, BUILD_TRACKER.md

---

## START SESSION

Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md.
Read docs/sessions/CITATION_FIX_CONTEXT_GATHERING.md for full
background on this issue (prior read-only investigation).

---

## BACKGROUND

A prior investigation found that "Matter of Walsh and Pollard, 8 I&N
Dec. 288 (BIA 1958)" — cited in two spec files and one live prompt
file as supporting a net-worth-proportionality argument — is an
incorrect citation. The actual case is **Matter of Walsh and Pollard,
20 I&N Dec. 60 (BIA 1988)**, and its holding does not establish a
net-worth-proportionality test — it concerns whether an investment is
in a bona fide, non-marginal enterprise, with no fixed dollar minimum
required.

Rather than just correcting the citation number, this session **removes
the case citation from this context entirely** and replaces it with
9 FAM 402.9-6(D) — the actual State Department adjudication standard,
which directly and correctly addresses proportionality and is already
correctly cited elsewhere in the knowledge base
(`docs/E2_Business_Eligibility_Research.md`).

This citation already appears in a generated document for test
applicant 9f981747-e3e4-4941-9f86-9871f8117b66 (Michael James Chen) as
"8 I&N Dec. 288 (BIA 1962)" — note the year has drifted from the
already-incorrect spec value (1958), confirming this is generated
text, not a fixed lookup.

---

## STEP 1 — FIX LIVE PROMPT FILE (highest priority — affects output)

### File: `prompts/v1/documents/cover_letter.md`

**Line 226.** Current:

```
- Reference Walsh and Pollard standard (Matter of Walsh and Pollard, 8 I&N Dec. 288)
```

Replace with:

```
- State the proportionality percentages (investment as % of total enterprise cost, investment as % of net worth) per 9 FAM 402.9-6(D)
```

---

## STEP 2 — FIX SPEC FILE (source of truth, feeds the live prompt above)

### File: `docs/Spec3_Generation_Prompts.md`

**Line 353** (within the Substantiality Memorandum template embedded
in the Investment Proof spec, lines ~347-357). Current block:

```
THE SUBSTANTIALITY PARAGRAPH:
"The E-2 investment of [amount] represents [X]% of
[applicant's] net worth of [net worth amount]. The
investment further represents [Y]% of the total cost
of the enterprise. [If Walsh & Pollard satisfied:]
Under the proportionality standard established in
Matter of Walsh and Pollard, 8 I&N Dec. 288 (BIA 1958),
an investment representing
a substantial portion of the investor's net worth and
a majority of the enterprise cost reflects the genuine
financial commitment the E-2 statute contemplates."
```

Replace the entire block with:

```
THE SUBSTANTIALITY PARAGRAPH:
"The E-2 investment of [amount] represents [X]% of
[applicant's] net worth of [net worth amount]. The
investment further represents [Y]% of the total cost
of the enterprise. The proportionality of an investor's
capital relative to the total cost of the enterprise —
and relative to the investor's overall net worth — is a
recognized factor in assessing substantiality under
9 FAM 402.9-6(D)."
```

Note: this also removes the `[If Walsh & Pollard satisfied:]`
conditional entirely — the new sentence applies regardless of the
`walsh_pollard_satisfied` value from Spec1's calculation. The
`walsh_pollard_satisfied` variable name in
`docs/Spec1_Analysis_Engine.md` (lines 48-49, 239, 288) can remain
as-is — it is an internal variable name only and does not produce
citation text. **Do not edit Spec1_Analysis_Engine.md.**

**Line 430** (within the standalone Substantiality Memorandum
template, lines ~416-434 — this document type has no corresponding
prompt file per the prior investigation, but the spec should remain
accurate as the canonical reference). Current block:

```
SECTION I — LEGAL STANDARD:
"The E-2 visa requires that an investor's capital be
'substantial' in relation to the total cost of the
enterprise. 9 FAM 402.9-6(D). The Department of State
applies the proportionality formula established in
Matter of Walsh and Pollard, 8 I&N Dec. 288 (BIA 1958),
under which a higher percentage investment relative to
business cost evidences greater substantiality, and a
lower percentage requires a larger absolute investment
to demonstrate commitment."
```

Replace with:

```
SECTION I — LEGAL STANDARD:
"The E-2 visa requires that an investor's capital be
'substantial' in relation to the total cost of the
enterprise. 9 FAM 402.9-6(D). The Department of State
has recognized that no fixed dollar amount constitutes
'substantial,' and that the proportionality of the
investment relative to the total cost of the enterprise —
and relative to the investor's net worth — is among the
factors considered."
```

---

## STEP 3 — FIX DOCUMENTATION-ONLY REFERENCES (no runtime impact,
fix for accuracy)

### File: `docs/E2_Engine_Knowledge_Base_June3_2026.md`

**Line 64.** Current:

```
The Walsh & Pollard standard: investment as a percentage of the investor's
net worth is a secondary substantiality argument. Cite explicitly when
investment_pct_of_net_worth >= 0.50.
```

Replace with:

```
Proportionality as a secondary substantiality argument: investment as
a percentage of the investor's net worth, alongside investment as a
percentage of total enterprise cost, per 9 FAM 402.9-6(D). No fixed
dollar amount is required; the Department considers both ratios when
assessing substantiality.
```

**Line 775.** Current:

```
- Investment: total amount, % of business cost, % of net worth,
  Walsh & Pollard status, at-risk confirmation
```

Replace with:

```
- Investment: total amount, % of business cost, % of net worth,
  9 FAM 402.9-6(D) proportionality context, at-risk confirmation
```

### File: `docs/Document_Generation_Standards.md`

**Line 235 area.** Current:

```
### Substantiality Memorandum
Legal memorandum tone — the most formal document in the package.
Citations in standard legal format. Walsh & Pollard cited by name.
Conclusion stated as a legal finding, not an opinion.
The reader should feel they are reading an attorney-drafted memo.
```

Replace with:

```
### Substantiality Memorandum
Legal memorandum tone — the most formal document in the package.
Citations in standard legal format, referencing 9 FAM 402.9-6(D).
Conclusion stated as a legal finding, not an opinion.
The reader should feel they are reading an attorney-drafted memo.
```

Note: "Conclusion stated as a legal finding, not an opinion" in this
existing text appears to conflict with Spec3's explicit FORBIDDEN
instruction ("The conclusion belongs to the officer" / "Do not write
'...is substantial within the meaning of 9 FAM'"). **Do not resolve
this conflict in this session** — flag it in the completion report
for a future documentation-consistency pass. Do not change this
specific sentence.

---

## STEP 4 — CLEAN UP DEAD PROMPT FILES

The following hyphenated files in `prompts/v1/documents/` are
confirmed dead — `generation-engine.ts` reads only the underscored
`${documentType}.md` filenames and never imports these:

```
prompts/v1/documents/cover-letter.md
prompts/v1/documents/cover-letter-v1.md
prompts/v1/documents/investment-proof.md
prompts/v1/documents/source-of-funds.md
prompts/v1/documents/business-plan.md
prompts/v1/documents/ds160-reference.md
```

Several of these (`investment-proof.md`, `cover-letter.md`) also
contain the same incorrect Walsh and Pollard citation — being dead
files, they pose no runtime risk, but they are landmines for future
sessions (someone could edit the wrong copy and assume the fix
applied).

**Delete all 6 files listed above.** Confirm via
`grep -rn "cover-letter\|investment-proof\|source-of-funds\|business-plan\|ds160-reference\|cover-letter-v1" src/ prompts/`
(excluding the underscored filenames) that nothing references these
hyphenated paths before deleting. If any reference is found, report
it and do not delete that specific file — flag for review instead.

---

## STEP 5 — VERIFY

- `npm run build` — confirm clean
- `npx tsc --noEmit` — confirm clean
- `grep -rn "8 I&N Dec\|Walsh and Pollard\|Walsh & Pollard" docs/ prompts/ src/`
  — should now return zero matches in any LIVE file (the dead files
  are deleted; if any documentation file still references this case
  outside the locations covered above, report it — do not edit
  without checking first)

---

## DO NOT IN THIS SESSION

- Do not edit `docs/Spec1_Analysis_Engine.md` (variable names only,
  no citation text)
- Do not edit `prompts/v1/documents/investment_proof.md` (live file,
  already clean — confirmed in prior investigation)
- Do not regenerate any documents for application
  9f981747-e3e4-4941-9f86-9871f8117b66 or any other application —
  regeneration is a separate, deliberate next step after this fix
  lands
- Do not resolve the Step 3 "legal finding vs. opinion" conflict
  noted in Document_Generation_Standards.md — flag only

---

## COMPLETION REPORT — report exactly:

```
Walsh and Pollard citation fix complete.

Live prompt file fixed: prompts/v1/documents/cover_letter.md
  line 226 — [confirm new text]

Spec file fixed: docs/Spec3_Generation_Prompts.md
  line 353 block — [confirm replaced]
  line 430 block — [confirm replaced]

Documentation files fixed:
  E2_Engine_Knowledge_Base_June3_2026.md lines 64, 775 — [confirm]
  Document_Generation_Standards.md line 235 area — [confirm]

Dead files deleted: [list 6, or note any retained due to references
  found, with what referenced them]

Final grep check: [zero matches / list any remaining]

Flagged for future session: Document_Generation_Standards.md
  "conclusion stated as a legal finding" vs Spec3's forbidden-
  conclusions instruction — unresolved, noted only.

Build: clean / errors: [list or none]

Next: regenerate Cover Letter for 9f981747-... to produce corrected
output, then proceed to 9 FAM 402.9 citation verification pass.
```

Update BUILD_TRACKER.md with this fix.
