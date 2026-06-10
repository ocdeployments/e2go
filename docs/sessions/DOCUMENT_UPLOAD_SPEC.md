# E2go — Document Upload and Extraction Spec
## Self-preparer intake pipeline
**Written:** June 9, 2026
**Status:** Spec complete — ready for session file
**Depends on:** Module 3 case file (complete), answers.source field (complete)

---

## 1. Purpose

This feature serves applicants who have already done preparation work
before arriving at E2go. Three profiles:

**Profile A — The independent preparer**
Has been gathering documents, drafting sections, building spreadsheets.
Has not yet engaged a lawyer. Preparing to — or hoping E2go makes
it unnecessary.

**Profile B — The pre-lawyer preparer**
Has reached a stage of preparation where they are nearly ready to
send a package to a lawyer for review. Wants E2go to validate their
work and complete the gaps professionally before that step.

**Profile C — The lawyer dropout**
Started with an attorney, has partial professional documents, ran
out of budget or confidence. Wants to complete the package without
additional legal fees.

All three use the same flow. The platform makes no distinction between
them after the quiz routing question identifies them.

---

## 2. Quiz routing question

Add to module0_questions.json after the business type question
(approximately Q0-08 position):

**Question ID:** Q0-PREP-STATUS
**Category:** PREPARATION
**Question text:** "Have you already started preparing your E-2 application?"
**Helper text:** "We'll adjust your experience based on where you are."

**Options:**
- No — I'm starting from scratch
- Yes — I have some draft documents or notes
- Yes — I have a near-complete package

**Routing:**
- "Starting from scratch" → standard flow, no upload prompt
- "Some draft documents" → upload prompt at case file start,
  framed as "Upload what you have and we'll build on it"
- "Near-complete package" → upload prompt at case file start,
  framed as "Upload your documents and we'll find what's missing"

**Scoring impact:** None. This question is routing only.
Store answer as `application.preparation_status` ENUM:
  `scratch | partial | near_complete`

---

## 3. Upload entry point

### Location
Top of the case file overview page (`/apply`), above the six
section cards. Appears only when `preparation_status` is
`partial` or `near_complete`.

For `scratch` applicants: upload card is NOT shown by default.
A small text link at the bottom of the overview reads:
"Have existing documents? Upload them →"
This allows any applicant to use the feature even if they
selected scratch in the quiz.

### Upload card design (Obsidian Gold)
```
┌─────────────────────────────────────────────────┐
│  ◈ DOCUMENT INTAKE                              │
│                                                  │
│  Upload your existing documents                  │
│  We'll read them, pre-fill your case file,       │
│  and show you exactly what's missing.            │
│                                                  │
│  [Upload documents →]        [Skip for now]      │
└─────────────────────────────────────────────────┘
```

"Skip for now" dismisses the card but does not remove it —
it collapses to a small text link. The upload is always
available until the applicant has completed all six sections.

---

## 4. Upload screen (`/apply/upload`)

### Layout
Full-page upload screen. Not a modal.
Back link: "← Back to case file"

### Document type list

The applicant selects which document type they are uploading
before dropping the file. The platform uses this as a hint
for classification — but classifies independently regardless.

| Document type | What it pre-fills |
|---|---|
| Cover letter or draft | Story, business overview, investment summary, ties |
| Business plan | Business description, market, projections, operations |
| Source of funds narrative | Investment section, funds trail |
| Investor biography | Qualifications section |
| DS-160 or prior visa form | Administrative fields (Section 1) |
| Financial projections (Excel/CSV) | Projection table |
| Operating agreement | Ownership %, partnership structure |
| Franchise agreement or FDD | Franchise name, fee, projection basis |
| Other | Platform will assess |

### File requirements
- Accepted formats: .docx, .pdf, .xlsx, .csv
- Maximum file size: 10MB per file
- Maximum files per session: 8
- No images — text extraction only
- No scanned PDFs (no OCR in v1 — advisory shown)

### Scanned PDF advisory
If a PDF is detected as image-based (no extractable text):
"This appears to be a scanned document. We can only extract
text from digital documents. Please upload the original Word
or PDF file, or retype the key sections manually."

### Upload state
- Drag and drop zone + browse button
- Progress indicator per file during upload
- Each file shows: filename, type selected, upload status
- Remove button per file before processing begins

### Process button
"Read my documents →"
Disabled until at least one file is uploaded.
Once clicked: navigates to processing screen.

---

## 5. Extraction pipeline

### Stage 1 — File ingestion
For each uploaded file:
- .docx → extract raw text using mammoth (already in dependencies)
- .pdf → extract text using pdf-parse
- .xlsx / .csv → parse as structured data using SheetJS/papaparse
  (already in dependencies)
- Truncate to 8,000 tokens per document for extraction call

### Stage 2 — Document classification
Single API call per document.
Model: claude-sonnet-4 via OpenRouter (not Anthropic API —
document generation only).

Prompt structure:
```
You are classifying an uploaded document for an E-2 visa
preparation platform.

Read the following document and identify what type it is.
Return JSON only:
{
  "detected_type": "cover_letter" | "business_plan" |
    "source_of_funds" | "biography" | "ds160" |
    "projections" | "operating_agreement" | "franchise_docs" |
    "unknown",
  "confidence": "high" | "medium" | "low",
  "reasoning": "one sentence"
}

Document text:
[document text]
```

If detected type differs from user-selected type:
- High confidence mismatch → advisory: "This looks more like
  a [detected type] than a [selected type]. We'll extract it
  as a [detected type]."
- Low confidence → use user-selected type, note uncertainty

### Stage 3 — Field extraction
One API call per document.
Model: claude-sonnet-4 via OpenRouter.

The extraction prompt is the most critical prompt in this
entire feature. It must be question-spec-aware.

**Extraction prompt template:**

```
You are an E-2 visa preparation assistant extracting
information from a document to pre-fill an application form.

Extract answers to the following questions where you find
relevant information. For each answer:
- Extract the exact value or a clean summary
- Rate your confidence: high (explicitly stated),
  medium (clearly implied), low (uncertain inference)
- Note the source: quote the 5-10 words from the document
  that support this extraction

Return ONLY valid JSON. No preamble. No markdown.

Questions to extract:

SECTION 1 — STORY
QA-01: Applicant full legal name
QA-05: Nationality/citizenship
QA-09: Current address (city, province/state, country)
QD-01: Professional background summary (what they've spent
  their career doing)
QD-02: Why they are making this move / motivation
QD-03: Relevant experience for running this business
QD-04: First-year plan and priorities
QD-05: Non-immigrant intent — ties to home country,
  reason to return

SECTION 2 — BUSINESS
QA-51: Business legal name
QE-02: Entity type (LLC, Corp, etc.)
QE-03: State of registration
QE-04: EIN (if mentioned)
QA-52: Business address
QK-01: Business description — what it does, who pays,
  how money flows
QK-02: Target customers
QK-03: Market opportunity / why this market
QK-04: Competitive advantage
QG-02: Operational status (open / in setup / pre-start)
QF-09: Franchise system name (if franchise)

SECTION 3 — INVESTMENT
QF-02: Total investment amount (USD)
QF-03: Total business establishment cost
QF-05: Source of funds (savings / property sale / RRSP /
  loan / gift / crypto / other)
QH-01: Funds narrative — step-by-step trail from source
  to US business account
QF-07: US business bank name

SECTION 3 — PROJECTIONS
QI-05-Y1: Year 1 revenue projection
QI-05-Y2: Year 2 revenue projection
QI-05-Y3: Year 3 revenue projection
QI-05-Y4: Year 4 revenue projection
QI-05-Y5: Year 5 revenue projection
QI-06-Y1: Year 1 net income projection
QI-06-Y2: Year 2 net income projection
QI-06-Y3: Year 3 net income projection
QI-06-Y4: Year 4 net income projection
QI-06-Y5: Year 5 net income projection
QI-04: Employee headcount Year 1

SECTION 4 — QUALIFICATIONS
QJ-01: Education (degrees, institutions, years)
QJ-03: Work history (employer, title, dates, duties)
QJ-04: Specific experience relevant to this business

SECTION 6 — TIES
QD-05: Ties to home country (property, family, accounts,
  professional memberships)

Return format:
{
  "extracted_fields": [
    {
      "question_id": "QF-02",
      "value": "185000",
      "display_value": "$185,000 USD",
      "confidence": "high",
      "source_quote": "total investment of $185,000"
    },
    ...
  ],
  "document_summary": "One sentence describing what this
    document is and its overall quality/completeness"
}
```

### Stage 4 — Discrepancy detection
After all documents are processed, run a cross-document
comparison for fields that appear in more than one document.

Fields most likely to conflict:
- QF-02 (investment amount) — appears in cover letter,
  business plan, source of funds
- QA-51 (business name) — appears everywhere
- QI-05-Y1 (Year 1 revenue) — appears in cover letter
  and business plan
- QJ-03 (work history dates) — appears in cover letter
  and biography
- QG-02 (operational status) — may differ between docs

For each field with multiple extracted values:
If values differ by more than 5% (for numbers) or are
semantically different (for text) → discrepancy flag.

Store discrepancy as:
```typescript
interface Discrepancy {
  questionId: string;
  questionLabel: string;
  values: Array<{
    value: string;
    sourceDocument: string;
    sourceQuote: string;
    confidence: string;
  }>;
  resolved: boolean;
  resolvedValue: string | null;
}
```

---

## 6. Processing screen

While extraction runs, show a progress screen:

```
Reading your documents...

◈ Cover letter          → Extracting fields...
◈ Business plan         → Extracting fields...
◈ Source of funds       → Waiting...

This takes about 30–60 seconds per document.
```

Each document transitions: Waiting → Extracting → Complete (with
count of fields found) or Failed (with retry option).

On complete: auto-navigate to discrepancy screen (if any) or
gap report (if none).

---

## 7. Discrepancy resolution screen (`/apply/upload/review`)

### When it appears
Only if Stage 4 found conflicting values. Required step —
cannot be skipped.

### Layout
Header:
```
Discrepancies found — 3 items need your decision

Your documents contain conflicting information on the
following fields. Choose the correct value for each.
You cannot proceed until all discrepancies are resolved.
```

One card per discrepancy:

```
┌─────────────────────────────────────────────────┐
│  Total investment amount                         │
│                                                  │
│  ○ $185,000 USD                                 │
│    From: Cover letter — "total investment of    │
│    $185,000"                                     │
│                                                  │
│  ○ $148,500 USD                                 │
│    From: Business plan — "capital invested      │
│    of $148,500 including franchise fees"         │
│                                                  │
│  ○ Enter a different value: [____________]       │
│                                                  │
│  ⚠ This value will be used throughout your      │
│  entire application. All documents will          │
│  reference this figure.                          │
└─────────────────────────────────────────────────┘
```

User must select one option per discrepancy card.
"Continue →" button disabled until all resolved.
Resolved value stored with `source: 'user_resolved_conflict'`
and a note of which document each option came from.

---

## 8. Gap report screen (`/apply/upload/gaps`)

Appears after discrepancy resolution (or directly after
extraction if no discrepancies).

### Layout

**Header section:**
```
Your documents have been read

We found answers to 47 of 145 questions in your case file.
Here's what still needs your input.
```

**Section coverage grid:**
Six rows, one per section, showing % filled:

```
Section 1 — Your story          ████████░░  78% filled
Section 2 — Your business       ██████████  94% filled
Section 3 — Your investment     █████░░░░░  52% filled
Section 4 — Your qualifications ████████░░  80% filled
Section 5 — Your family         ░░░░░░░░░░   0% filled
Section 6 — Your ties           ███░░░░░░░  30% filled
```

**Critical gaps (shown in red):**
Any high-severity questions (from the 34-gap audit) that
were not found in the documents. Listed by name with a
brief note on why they matter.

Example:
```
⚠ Investment commitment status — not found
  Officers require evidence funds are irrevocably
  committed, not just available.

⚠ Physical presence plan — not found
  Your management role must be documented to avoid
  the remote management denial pattern.
```

**Documents summary:**
Small list of each uploaded document with:
- How many fields it contributed
- Its detected type
- A one-line summary from the extraction engine

**Continue button:**
"Complete my case file →" → navigates to /apply (case file
overview) with pre-filled sections showing their coverage.

---

## 9. Pre-fill badge for uploaded documents

### New badge variant
Distinct from the existing "From your eligibility check" badge.

```
Design: warm amber border (rgba(210,150,50,0.35))
        warm amber text (rgba(210,150,50,0.8))
        amber square gem dot
Text:   "From your documents"
```

For medium-confidence extractions, add a secondary line:
```
Text:   "From your documents — please verify"
Border: amber with slight orange tint
```

### Confidence-based behaviour
- High confidence → pre-fill silently, badge shown, field editable
- Medium confidence → pre-fill with "please verify" badge,
  field highlighted with amber left border
- Low confidence → do NOT pre-fill. Instead show a hint below
  the empty field: "We found something in your documents but
  weren't certain. You may want to check: [source quote]"

### Source tracking
Add `document_upload` to answers.source ENUM.
Add `confidence` field: `high | medium | low | null`.
Add `source_document_type` field: which document type it
came from.

Schema addition:
```sql
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS confidence TEXT
  CHECK (confidence IN ('high', 'medium', 'low'));

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS source_document_type TEXT;
```

### Acknowledgment requirement
Every pre-filled field — regardless of confidence — must be
touched by the applicant before the section is marked complete.
"Touched" means: clicked into, reviewed, and either left as-is
(one click on the field counts) or edited.

Untouched pre-filled fields render with the badge in full
opacity. Once touched: badge fades to 50% opacity and a
small checkmark appears beside it. The section completion
% only counts touched fields, not just pre-filled ones.

This is non-negotiable. A wrong pre-fill that gets submitted
unchecked is worse than no pre-fill at all.

---

## 10. Database additions

```sql
-- answers table additions
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS confidence TEXT
  CHECK (confidence IN ('high', 'medium', 'low'));

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS source_document_type TEXT;

-- Update source enum to include document_upload and
-- user_resolved_conflict
-- Note: PostgreSQL TEXT with CHECK is used, not an actual
-- ENUM type, so just add to the check constraint via
-- a new migration that drops and recreates the constraint

-- New table: uploaded documents registry
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id)
    ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  detected_document_type TEXT,
  user_selected_document_type TEXT,
  detection_confidence TEXT,
  document_summary TEXT,
  fields_extracted INTEGER DEFAULT 0,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New table: discrepancy log
CREATE TABLE IF NOT EXISTS document_discrepancies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_label TEXT,
  conflicting_values JSONB NOT NULL,
  resolved_value TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS preparation_status TEXT
  CHECK (preparation_status IN (
    'scratch', 'partial', 'near_complete'
  )) DEFAULT 'scratch';

-- RLS
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own documents"
  ON application_documents FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE document_discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own discrepancies"
  ON document_discrepancies FOR ALL
  USING (
    application_id IN (
      SELECT id FROM applications WHERE user_id = auth.uid()
    )
  );
```

---

## 11. API routes

### POST /api/apply/upload
Accepts: multipart form data (files + application_id + document types)
Returns: upload confirmation, storage paths
Action: stores files to Supabase Storage, creates
  application_documents records

### POST /api/apply/extract
Accepts: { applicationId, documentIds[] }
Returns: SSE stream — progress updates per document,
  then final extraction results
Action:
  1. Fetch each document from storage
  2. Extract text per file type
  3. Classify each document (Stage 2)
  4. Extract fields (Stage 3)
  5. Run discrepancy detection (Stage 4)
  6. Store extracted answers with source: 'document_upload'
  7. Store discrepancies in document_discrepancies table
  8. Return gap report data

SSE events:
```typescript
{ event: 'document_start', data: { documentId, filename } }
{ event: 'document_classified', data: { type, confidence } }
{ event: 'document_extracted', data: { fieldsFound: number } }
{ event: 'document_complete', data: { documentId } }
{ event: 'discrepancies_found', data: { count: number } }
{ event: 'extraction_complete', data: { gapReport } }
{ event: 'error', data: { documentId, message } }
```

### POST /api/apply/resolve-discrepancy
Accepts: { discrepancyId, resolvedValue, applicationId }
Returns: success
Action: updates document_discrepancies, updates the
  relevant answer record with resolved value and
  source: 'user_resolved_conflict'

### GET /api/apply/gap-report
Accepts: { applicationId }
Returns: {
  totalQuestions: number,
  filledCount: number,
  sectionCoverage: Record<string, number>,
  criticalGaps: Array<{ questionId, label, reason }>,
  documentSummaries: Array<{ type, fieldsExtracted, summary }>
}

---

## 12. File storage

Use Supabase Storage bucket: `application-documents`
Path pattern: `{userId}/{applicationId}/{timestamp}_{filename}`
Access: authenticated users only, RLS via storage policies
Retention: files kept for 90 days after application completion,
  then auto-deleted (Supabase lifecycle policy)

---

## 13. What this feature does NOT do

- It does not replace the generation engine. Uploaded documents
  are inputs that pre-fill questions. The platform still generates
  all final documents through the 15-step pipeline. The uploaded
  documents are never used as-is in the final package.

- It does not use uploaded documents as the voice profile.
  The voice profile (writing sample) is collected separately
  in Section 1 as always. Uploaded documents are data sources,
  not voice sources. The humanisation engine's goal is to
  make AI-generated output sound human — the writing sample
  for that purpose is still collected fresh.

- It does not do OCR on scanned PDFs. Text extraction only
  in v1. Advisory shown for scanned documents.

- It does not expose uploaded documents to other users. All
  documents are private to the user who uploaded them.

- It does not modify the generation engine prompts. The
  extracted answers flow into the answers table exactly as
  if the user had typed them. The generation engine reads
  from the answers table regardless of source.

---

## 14. User-facing copy — key strings

**Upload card headline:**
"Already have documents? Upload them and we'll pre-fill
your case file."

**Upload screen headline:**
"Upload your existing documents"

**Upload screen subhead:**
"We'll read them carefully, fill in what we can, flag any
conflicts, and show you exactly what's still missing."

**Processing screen:**
"Reading your documents — this takes about 30–60 seconds
per document."

**Discrepancy screen headline:**
"[N] discrepancies found — your decision needed"

**Discrepancy screen subhead:**
"Your documents contain conflicting information. Choose the
correct value for each item below. This becomes the
authorised figure throughout your entire application."

**Gap report headline:**
"Here's what we found — and what still needs your input."

**Pre-fill badge:**
"From your documents"

**Pre-fill verify badge:**
"From your documents — please verify"

---

## 15. Session file scope (when ready to build)

This is a substantial build. Recommend splitting into two
sessions:

**Session A — Infrastructure and extraction:**
- Quiz question Q0-PREP-STATUS
- DB migration (three new tables + two column additions)
- File upload API route + Supabase Storage setup
- Extraction pipeline API route (SSE)
- Discrepancy detection logic
- Discrepancy resolution API route

**Session B — UI:**
- Upload card on case file overview
- /apply/upload page (document type selection + drop zones)
- Processing screen (SSE consumer)
- /apply/upload/review (discrepancy resolution)
- /apply/upload/gaps (gap report)
- New pre-fill badge variants
- Acknowledgment tracking for pre-filled fields
- Gap report section coverage display

Do not start Session B until Session A extraction pipeline
is verified producing correct JSON output for at least
two test documents (a cover letter and a business plan).

---

## 16. Test cases to use

**Test document 1 — Cover letter (Michael James Chen)**
The existing test applicant. A cover letter for his cleaning
business in Tampa should extract: business name, investment
amount, target state, source of funds summary, qualifications
summary.

**Test document 2 — Business plan (any franchise)**
Should extract: business description, projections, market
analysis, employee plan, operational overview.

**Test case 3 — Conflicting documents**
Upload a cover letter saying $185,000 and a business plan
saying $148,500. Verify discrepancy is detected and the
resolution screen fires.

**Test case 4 — Scanned PDF**
Upload a scanned image-based PDF. Verify the advisory fires
and no extraction is attempted.
