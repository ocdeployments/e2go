# Document Generation Standards
## e2go.app — Constitution for All Generated Documents
**Version:** 1.0 — May 31, 2026
**Status:** LOCKED — do not deviate without explicit instruction
**Owned by:** docs/spec/Document_Generation_Standards.md
**References:** docs/spec/Document_Conditionals.md

---

## Purpose

This file is the single source of truth for how every document generated
by e2go looks, reads, and feels. Every AI generation prompt must reference
this file. Every generated document is measured against this standard.
Consistency across all documents in a package is non-negotiable.

---

## Visual Format

### Page Setup
- Paper size: U.S. Letter (8.5 × 11 inches)
- Margins: 1 inch all sides
- Body font: Times New Roman, 12pt
- Section header font: Arial, 14pt bold
- Subsection header font: Arial, 12pt bold
- Line spacing: 1.15
- Paragraph spacing: 6pt after each paragraph
- No orphan lines — paragraphs never break across pages
  with fewer than 2 lines on either side

### Header Block — Every Document
Every document begins with this block, left-aligned:

```
[Applicant Full Legal Name]
E-2 Treaty Investor Visa Application
[Document Name]
[Tab Reference — e.g., Tab B-1]
[Month Year — e.g., May 2026]
```

Separated from the document body by a single horizontal rule.

### Footer — Every Document
Every page carries this footer, centered:

```
[Applicant Last Name] E-2 Application | [Document Name] | Page X of Y
CONFIDENTIAL — FOR IMMIGRATION PURPOSES ONLY
```

### Preview Watermark
All documents shown in app preview carry a diagonal light grey watermark:
"PREVIEW — e2go.app"
Removed from final PDF export after payment confirmed.

---

## Page Limits

### Toronto Consulate — Official Rule
50 pages maximum for the complete application package.
Applies to new applications only. Renewals are exempt.
Official source: ca.usembassy.gov (confirmed May 2026)

### Documents EXEMPT from page count
These do not count toward the 50-page limit:
- DS-160 confirmation page
- DS-156E form
- G-28 (Notice of Entry of Appearance)
- Appointment confirmation letter
- Passport bio-page copies — all family members
- Civil documents (birth certificates, marriage certificates)

### Documents that COUNT toward page limit
All generated documents count. Every page matters.

### Per-Document Page Targets — Solo Application

| Document | Maximum Pages |
|---|---|
| Cover Letter | 5 |
| Business Plan | 18 |
| Source of Funds Statement | 3 |
| Fund Flow Chronology | 2 |
| Net Worth Statement | 2 |
| Substantiality Memorandum | 3 |
| Marginality Rebuttal | 2 |
| Qualifications Summary | 2 |
| Operating Agreement | 4 |
| Applicant Declaration | 1 |
| Property Portfolio Summary | 1 |
| Investment Portfolio Summary | 1 |
| **Total target** | **46 pages** |
| **Buffer** | **4 pages** |

### Per-Document Page Targets — Partnership Application
Shared documents (Business Plan, Cover Letter, Substantiality
Memorandum, Marginality Rebuttal, Operating Agreement) stay the same.
Per-investor personal documents compress:

| Document | Maximum Pages Per Investor |
|---|---|
| Source of Funds Statement | 2 |
| Fund Flow Chronology | 1 |
| Net Worth Statement | 1 |
| Qualifications Summary | 1 |
| Applicant Declaration | 1 |

### Page Counter Rules
- Running total tracked during generation
- Warning displayed to user at 45 pages
- Alert displayed at 48 pages
- Generation pauses for review if 50 pages reached
- Partnership page limit: UNCONFIRMED — flag open
  ⚠️ Do not publish page budget numbers for partnerships
  until confirmed via EVisaCanada@state.gov

---

## Tone Standards

### The Voice
Formal, precise, confident. Written as if by an experienced
immigration attorney who knows this file thoroughly.
Never casual. Never hedging. Never vague.

### What It Sounds Like
- "Ms. Mitchell has invested $175,000 USD in Mitchell Care Services LLC"
  — not "approximately $175,000"
- "The investment is irrevocably committed to the enterprise"
  — not "the investment has been made"
- "The business will employ five full-time caregivers by end of Year 1"
  — not "the business plans to hire"

### What It Never Does
- Never uses filler phrases:
  "it is worth noting that"
  "as mentioned above"
  "needless to say"
  "it should be noted"
  "it is important to mention"
- Never uses "very," "quite," or "rather"
- Never begins a sentence with "However" more than once per document
- Never uses passive voice when active is available
- Never fabricates facts — every statement traces to a user-provided answer
- Never uses "the applicant" — too bureaucratic
- Never repeats the same sentence structure twice in a row

---

## Language Standards

### Numbers
- Spell out one through nine
- Use numerals for 10 and above
- All dollar amounts in USD only — never CAD in generated documents
- Investment amounts appear as both numeral and written:
  "$175,000 (one hundred seventy-five thousand U.S. dollars)"

### Dates
- Written as Month Year only: "March 2026"
- Never use ordinals: not "March 1st, 2026"
- Never use numeric format: not "3/2026" or "03/26"

### Referring to the Applicant
- Full legal name on first reference in each document
- "the Investor" or "Ms./Mr. [Last Name]" on subsequent references
- Never "the applicant" — it is bureaucratic, not narrative

### Referring to the Business
- Full legal entity name on first reference: "Mitchell Care Services LLC"
- "the Company" or "the Enterprise" on subsequent references
  within the same paragraph
- Never "the business" in legal documents — too informal
- Never use possessives on company names:
  "Mitchell Care Services LLC operates" not "Mitchell Care Services' operations"

### Partnership Applications
- Principal investor referred to by name
- Partner 2 referred to by name — never "the second investor"
- "the Partners" when referring to both collectively

---

## Document Structure Standards

### Every Document Follows This Structure
1. **Purpose paragraph** — one sentence stating what this document
   is and what it establishes for the E-2 application
2. **Body** — substance organized in numbered sections
3. **Conclusion paragraph** — one sentence summarizing what has
   been established and its significance to the E-2 application

### Section Headers
Every document uses numbered sections:
I. Section Title
II. Section Title
III. Section Title

No bullet points as primary structure. No dashes.
Bullets permitted within sections for lists only.

### Evidence References
When a document references a supporting document, always cite the tab:
"as evidenced in Tab B-2, the Investment Fund Flow Chronology"
"as detailed in Tab K, the E-2 Business Plan"

---

## Document-Specific Voice Calibration

Each document has its own voice within the overall standard:

### Applicant Declaration
First person throughout.
"I, [Full Legal Name], hereby declare under penalty of perjury..."
Personal, earnest, specific. The human voice of the investor.
Warm but formal. Reads as a sworn statement, not a form.

### Qualifications Summary
Third person professional biography tone.
Written as if by someone who knows the investor well and respects
their professional history. Confident and specific. No puffery.

### Business Plan
Third person. Data-driven. Forward-looking. Specific.
Every claim supported by a number or a source. FDD Item 19
anchoring required for franchise applications. Financial projections
must be internally consistent across all models.

### Substantiality Memorandum
Legal memorandum tone — the most formal document in the package.
Citations in standard legal format, referencing 9 FAM 402.9-6(D).
Conclusion stated as a legal finding, not an opinion.
The reader should feel they are reading an attorney-drafted memo.

### Source of Funds Statement
Narrative combined with financial data.
Tells the story of the money — where it came from, how it moved,
where it ended up. Clear, chronological, traceable.
Every dollar accounted for with no gaps.

### Fund Flow Chronology
Structured chronological format.
Date — Event — Amount — Evidence Reference.
Reads as a factual record, not a narrative.
Every line is verifiable against a supporting document.

### Net Worth Statement
Balance sheet format combined with brief narrative context.
Numbers first, explanation second.
The 11.8% of net worth framing (or equivalent) included where relevant.

### Cover Letter
The most persuasive document in the package.
Formal legal letter tone with a clear narrative arc.
Addresses all five E-2 elements explicitly.
Tells the complete E-2 story in one document that references all others.
Tab index of every document in the package included at the end.
Written last — after all other documents are complete.
The tab index is auto-generated from documents that exist.
Never references documents that have not been generated.

### Operating Agreement
Corporate governance document tone.
Precise legal language. No ambiguity on ownership percentages,
management rights, or capital contributions.
Partnership applications must make clear each partner retains
full management rights under the Negative Control doctrine.

---

## Consistency Checker — Non-Negotiable

Before any document is finalized, the generation engine runs a
consistency check across all generated documents in this package.

Every instance of the following must be identical across all documents:
- Applicant full legal name (exact spelling, middle name/initial)
- Investment amount in USD
- LLC legal name (exact)
- EIN (exact)
- Business address (exact)
- Franchise brand name (exact)
- Date of LLC formation
- Date of franchise agreement execution
- Family composition (names and relationships)
- Investment source description

**If any of these differ across documents — even punctuation —
generation stops immediately and flags for review.**
Do not release documents to the user until consistency is confirmed.

---

## Repetition Checker — Non-Negotiable

No sentence of more than eight words appears in more than one
document in the same package.

The checker flags exact and near-exact matches.
The AI generation layer rewrites flagged passages using the same
underlying fact but different language and sentence structure.

**Two types of repetition:**

Acceptable — intentional reinforcement:
The same fact (e.g., investment amount) appears in multiple documents
but each document uses it differently. B-1 traces it. B-3 contextualizes
it as percentage of net worth. C-3 applies the legal formula.
Same fact, different purpose, different language.

Not acceptable — copy-paste repetition:
The same sentence or paragraph appears verbatim in multiple documents.
This signals lack of editorial control to an experienced visa officer.

---

## Quality Gate

Before any document is shown to the user, it must pass:

1. **Completeness** — no empty fields, no TBC entries, no placeholders
2. **Consistency** — passes consistency checker
3. **Repetition** — passes repetition checker
4. **Page limit** — within target page count
5. **Tone** — no filler phrases, no passive voice violations
6. **Specificity** — no generic language that could apply to any applicant
7. **Source integrity** — every factual claim traces to user-provided data

If any check fails — auto-retry once with corrected prompt.
If retry fails — flag for human review queue.
Never show a failed document to the user.

---

## Prototype Reference

The approved prototype documents for fictional applicant Sarah Mitchell
are located at: docs/spec/prototypes/
These are the visual benchmark. Generated documents must match their
look, feel, and professional standard.

Sarah Mitchell scenario:
- Canadian citizen, Toronto
- Corporate HR management background, 12 years
- Investment: $175,000 USD
- Business: Assisting Hands Home Care franchise, Austin Texas
- Family: Husband David Mitchell (not investor), two children ages 8 and 11
- Fund source: Canadian savings + HELOC on Toronto property
- LLC: Mitchell Care Services LLC, Texas

---

## Annual Review

🗓️ This document requires annual review.
Verify page limits and submission requirements against
ca.usembassy.gov before each major product release.
Last verified: May 2026

---

## Post-Specific Format Exceptions

### Toronto (Canada) — Default
50 pages maximum. Standard format. All documents generated at full length.
Family attendance warning: All family members must attend interview.
This is a 2025 requirement — display as prominent warning throughout app.

### Frankfurt (Germany) — Hard Constraints
**30 pages maximum. 5MB file size maximum.**
These are firm limits enforced by U.S. Consulate Frankfurt.
Compress all PDFs before submission.

Frankfurt-specific document modifications:
- Business Plan: Executive Summary format ONLY — not full narrative
- All narrative documents compressed to maximum half standard page targets
- Platform generates a Frankfurt-compliant compressed version automatically
- Display warning: "Your Frankfurt package uses condensed formatting to meet
  the 30-page limit. All required elements are present."

### London (United Kingdom)
20MB total upload maximum.
Compress large PDFs before uploading to Embassy portal.
Standard page guidance applies (no published page limit confirmed).

### All Other Consulates
Apply standard format unless consulate-specific intelligence confirms
different requirements. Flag in DOC_INDEX.md when new constraints discovered.
Annual review required against consulate official websites.

---

## Additional Generated Documents — Revised Complete List

Documents we missed in initial planning — add to generation pipeline:

### Financial Projections Spreadsheet (.xlsx)
**Always generated. Batch 2.**
5-year P&L model in spreadsheet format.
Fed by Tab K (Business Plan) financial answers.
FDD Item 19 anchoring required for franchise applications.
Source: E2_Document_Builder_Spec.md — Template 2

### Translation Requirements Guide
**Conditionally generated.**
Trigger: applicant nationality requires non-English documents
(any nationality where official documents are not in English)
Content: specific translation and notarization requirements for that
nationality and consulate combination.
Source: E2_Platform_Logic_Rules.md — nationality-specific translation rules

### Timeline and Appointment Guide
**Always generated. Batch 1.**
Post-specific. Shows exact appointment booking system, current wait times
(with 🔄 verification flag), submission steps for their specific consulate.
Source: E2_Global_Consulate_Intelligence_Report_Part1.md

### Master Submission Checklist
**Always generated. Batch 2 — generated last alongside Cover Letter.**
Complete checklist of every document to be submitted, in exact order,
with tab references. Auto-generated from documents that actually exist.
Post-specific formatting instructions included.

---

## Critical Denial Prevention — Document Standards

The following standards are derived from real Toronto denial patterns
(Source: module3_denial_audit.md — 15 confirmed denial categories).

Each document must actively prevent these denial triggers:

**D-01 Prevention (Investment not substantial):**
Every financial document must include the proportionality calculation:
Investment ÷ Total Business Cost = X%. If below 70%, flag prominently.

**D-02 Prevention (Funds idle, not at risk):**
Source of Funds must show deployment timeline — not just transfer.
Every dollar must show where it went, not just that it arrived.

**D-03 Prevention (Gaps in paper trail):**
Fund Flow Chronology must have zero gaps. Every dollar traced from
origin to final deployment. No unexplained jumps in timeline.

**D-05 Prevention (Generic business plan):**
Business plan must reference applicant's specific data throughout.
FDD Item 19 anchoring required for franchise applications.
Revenue projections must be data-backed — never round numbers without source.

**D-07 Prevention (No credible hiring plan):**
Business plan must include specific job titles, salaries, and timeline.
Year 1 employees must be named by role, not just counted.

**D-09 Prevention (Interview inconsistency):**
Consistency checker catches this before submission.
Every number, date, and name must be identical across all documents.
