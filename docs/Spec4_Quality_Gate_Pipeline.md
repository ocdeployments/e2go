## Pipeline Integration Rules
- Partnership status: Generate two separate complete application packages for partnership applications.

---

## Pipeline Overview

Every document passes through 6 mandatory stages.
No stage can be skipped. No bypass exists.
A document that fails any stage does not advance.
Every stage is logged.

```
INPUTS
  └── Module 3 answers
  └── Writing sample (voice profile)
  └── Follow-up conversation responses
  └── Case brief from Analysis Engine
         │
         ▼
STAGE 1: GENERATE
  AI produces document content via Claude API
  Uses: system prompt + knowledge context +
        applicant data + section brief +
        voice profile + legal boundary
         │
         ▼
STAGE 2: HUMANIZE
  Second AI pass removes AI patterns
  Injects applicant's own phrases
  Varies rhythm and structure
         │
         ▼
STAGE 3: AI DETECTION AUDIT
  Run document through AI detection
  Must score below threshold to proceed
  If fails: return to Stage 2 with
  specific instructions on failed sections
         │
         ▼
STAGE 4: CONSISTENCY CHECK
  All cross-document fields verified identical
  Any mismatch → flag for correction
         │
         ▼
STAGE 5: QUALITY GATE
  Completeness check
  Legal boundary check
  Page limit check
  Uniqueness verification
         │
         ▼
STAGE 6: METADATA SANITIZATION
  All AI markers removed
  All metadata stripped
  Document cleaned completely
         │
         ▼
RELEASE
  Document available for download
  Applicant acknowledgment required
  Disclaimer shown before download
```

---

## Stage 1 — Generate

### API Call Structure

```python
response = anthropic.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4000,
    system=UNIVERSAL_SYSTEM_PROMPT,
    messages=[
        {
            "role": "user",
            "content": f"""
KNOWLEDGE CONTEXT:
{relevant_knowledge_base_sections}

APPLICANT CASE BRIEF:
{case_brief_json}

APPLICANT MODULE 3 ANSWERS:
{all_module3_answers}

VOICE PROFILE:
{voice_profile_json}

FOLLOW-UP CONVERSATION:
{followup_responses}

SECTION TO GENERATE:
{section_brief}

Generate this section now. Follow all instructions
in the system prompt. Do not include any headers,
labels, or meta-commentary in your output.
Output the document text only.
"""
        }
    ]
)
```

### Retry Logic

If generation fails or produces unusable output:
- Auto-retry once with more explicit instructions
- If second attempt fails: flag for manual review queue
- User sees: "Your documents are taking a little longer
  than usual — we will notify you when they are ready."
- Human review triggered within 2 hours

### Section Generation Order

```
1.  Cover Letter
2.  Principal Applicant Declaration
3.  Qualifications Summary
4.  Personal Net Worth Statement
5.  Source of Funds Statement
6.  Fund Flow Chronology
7.  Operating Agreement (if needed)
8.  Business Plan
9.  Substantiality Memorandum
10. Marginality Rebuttal
11. Property Portfolio (if applicable)
12. Investment Portfolio (if applicable)
13. DS-160 Reference
14. Spouse Declaration (if applicable)
15. Child Declarations (if applicable)
16. Financial Projections Spreadsheet
17. Timeline and Appointment Guide
18. Master Submission Checklist
19. [Consistency check across all above]
20. [Final quality gate]
```

---

## Stage 2 — Humanize

### Humanization Pass Prompt

```
You are a humanization editor. You will receive a section
of a legal document. Your job is to make it sound like
it was written by a specific human being — not generated
by AI.

WHAT TO DO:
1. Vary sentence lengths. The current text is too uniform.
   Some sentences should be short. Some longer with clauses.
   Mix them deliberately.

2. Replace AI vocabulary fingerprints.
   Search for and replace:
   - "it is worth noting" → cut entirely or rephrase
   - "furthermore" → cut or use "and" or start new sentence
   - "in conclusion" → cut
   - "comprehensive" → specific adjective instead
   - "crucial" → important / essential / central
   - "notably" → cut
   - "it should be noted" → cut
   - "leveraging" → using
   - "utilize" → use
   - "demonstrate" → show
   - "facilitate" → help / enable / allow

3. Inject the applicant's voice.
   The voice profile and writing sample phrases below
   show how this person actually writes.
   Where appropriate, use their sentence structures,
   their vocabulary level, their way of making a point.

4. Break parallel constructions.
   If three sentences start with the same structure,
   rewrite one of them differently.

5. Add natural variation.
   Real human writing is slightly imperfect in its
   consistency. A minor variation in how something
   is referenced is natural. Identical phrasing
   repeated exactly is not.

VOICE PROFILE: {voice_profile_json}
APPLICANT PHRASES FROM WRITING SAMPLE: {key_phrases_extracted}

DO NOT:
- Change any facts, figures, dates, or names
- Add any new claims or content
- Remove any required legal language
- Change exhibit references
- Make the text less formal than required for a
  legal document

Return only the revised text. No commentary.
```

---

## Stage 3 — AI Detection Audit

### Detection Approach

Use multiple detection methods simultaneously:

```python
def run_ai_detection(document_text: str) -> dict:
    results = {
        "perplexity_score": calculate_perplexity(document_text),
        "burstiness_score": calculate_burstiness(document_text),
        "pattern_matches": check_ai_patterns(document_text),
        "vocabulary_fingerprint": check_vocabulary(document_text),
        "overall_score": 0.0,
        "passed": False,
        "flagged_sections": []
    }

    # Overall score (lower = more human-like)
    results["overall_score"] = weighted_average(
        results["perplexity_score"] * 0.3,
        results["burstiness_score"] * 0.3,
        results["pattern_matches"] * 0.2,
        results["vocabulary_fingerprint"] * 0.2
    )

    results["passed"] = results["overall_score"] < DETECTION_THRESHOLD

    if not results["passed"]:
        results["flagged_sections"] = identify_flagged_sections(
            document_text,
            results
        )

    return results
```

### Threshold

DETECTION_THRESHOLD = 0.35
(Documents scoring above 0.35 on the AI likelihood
scale fail and return to Stage 2)

### Retry Logic

Maximum 3 humanization attempts per document.
Each retry receives more specific instructions
about which sections failed and why.

If all 3 attempts fail:
- Flag for manual review
- Do not release document
- Notify user of delay
- Human review within 2 hours

### Logging

Every detection run logged:
```sql
INSERT INTO document_generation_log (
    application_id,
    document_type,
    stage,
    attempt_number,
    detection_score,
    passed,
    flagged_sections,
    timestamp
)
```

---

## Stage 4 — Consistency Check

### Fields Verified Across All Documents

```python
CONSISTENCY_FIELDS = {
    "applicant_name": "exact match required",
    "investment_amount_usd": "exact match required",
    "llc_name": "exact match required",
    "ein": "exact match required",
    "business_address": "exact match required",
    "franchise_brand": "exact match required",
    "llc_formation_date": "exact match required",
    "franchise_agreement_date": "exact match required",
    "wire_transfer_date": "exact match required",
    "family_composition": "exact match required",
    "fund_source_description": "consistent description required"
}

def check_consistency(all_documents: list) -> dict:
    issues = []
    for field in CONSISTENCY_FIELDS:
        values = extract_field_from_all_docs(field, all_documents)
        if not all_identical(values):
            issues.append({
                "field": field,
                "values_found": values,
                "documents_affected": identify_documents(values)
            })
    return {
        "passed": len(issues) == 0,
        "issues": issues
    }
```

### Handling Inconsistencies

If any inconsistency found:
- Do not advance to Stage 5
- Auto-correct where correction is unambiguous
  (e.g., different spacing in LLC name)
- Flag for review where correction requires judgment
- Log the correction

---

## Stage 5 — Quality Gate

### Completeness Check

```python
REQUIRED_ELEMENTS = {
    "declaration": [
        "irrevocability_statement",
        "develop_and_direct_language",
        "9_fam_reference",
        "treaty_reference",
        "oath_paragraph",
        "signature_block"
    ],
    "qualifications": [
        "bridge_paragraph",
        "specific_experience_details",
        "franchise_training_reference"
    ],
    "net_worth": [
        "assets_table",
        "liabilities_table",
        "net_worth_total",
        "investment_percentage_calculated"
    ],
    "source_of_funds": [
        "irrevocability_statement",
        "chronology_table",
        "deployment_section",
        "exhibit_references"
    ],
    "cover_letter": [
        "all_five_elements_addressed",
        "document_index",
        "motivation_narrative"
    ]
}
```

### Legal Boundary Check

```python
FORBIDDEN_PHRASES = [
    "satisfies the requirement",
    "meets the standard",
    "qualifies for",
    "is eligible",
    "is substantial",
    "is sufficient",
    "demonstrates eligibility",
    "establishes qualification"
]

def check_legal_boundary(document_text: str) -> list:
    violations = []
    for phrase in FORBIDDEN_PHRASES:
        if phrase.lower() in document_text.lower():
            violations.append({
                "phrase": phrase,
                "context": extract_context(document_text, phrase)
            })
    return violations
```

If any forbidden phrase found — return to Stage 1
with specific instruction to remove it.

### Page Limit Check

```python
PAGE_LIMITS = {
    "toronto": 50, # 50 pages per tab
    "frankfurt": 30,
    "london": 50  # 20MB limit not page limit
}

consulate = get_applicant_consulate()
page_limit = PAGE_LIMITS[consulate]
current_pages = count_pages(all_documents)

if current_pages > page_limit:
    trigger_compression_mode()
    # Re-generate verbose sections with tighter targets
    # Alert user: "Compressing your package to meet
    #   the [X]-page consulate limit"
```

### Uniqueness Verification

```python
def check_uniqueness(document_text: str) -> bool:
    # Check against library of previously generated
    # document sections (stored as hashes)
    # Any passage over 20 words that matches exactly
    # triggers a flag

    sentences = extract_sentences(document_text)
    for sentence in sentences:
        if len(sentence.split()) > 20:
            if sentence_hash(sentence) in GENERATED_LIBRARY:
                return False
    return True
```

If uniqueness check fails — return specific section
to Stage 1 with instruction to generate differently.

---

## Stage 6 — Metadata Sanitization

### Word Document Sanitization

```python
from docx import Document
import copy

def sanitize_docx(doc_path: str) -> str:
    doc = Document(doc_path)

    # Strip core properties
    core_props = doc.core_properties
    core_props.author = ""
    core_props.last_modified_by = ""
    core_props.creator = ""
    core_props.created = None
    core_props.modified = None
    core_props.revision = 1
    core_props.keywords = ""
    core_props.subject = ""
    core_props.description = ""
    core_props.category = ""
    core_props.comments = ""
    core_props.content_status = ""
    core_props.identifier = ""
    core_props.language = ""
    core_props.version = ""

    # Remove tracked changes
    # Accept all revisions
    accept_all_revisions(doc)

    # Remove comments
    remove_all_comments(doc)

    # Remove hidden text
    remove_hidden_text(doc)

    # Clear revision history
    clear_revision_history(doc)

    # Remove template references
    remove_template_references(doc)

    sanitized_path = doc_path.replace(".docx", "_clean.docx")
    doc.save(sanitized_path)
    return sanitized_path
```

### PDF Export Sanitization

When converting to PDF via neat-pdf MCP:

```python
# Request clean PDF with no metadata
neat_pdf_options = {
    "strip_metadata": True,
    "flatten_forms": True,
    "remove_javascript": True,
    "remove_attachments": True,
    "optimize": True,
    "creator": "",
    "producer": "",
    "author": "",
    "title": ""
}
```

### Verification Check

After sanitization, verify:
```python
def verify_clean_document(doc_path: str) -> bool:
    doc = Document(doc_path)
    core = doc.core_properties

    checks = [
        core.author == "" or core.author is None,
        core.last_modified_by == "" or core.last_modified_by is None,
        core.creator == "" or core.creator is None,
        no_tracked_changes(doc),
        no_comments(doc),
        no_hidden_text(doc)
    ]

    return all(checks)
```

If any check fails — sanitize again before release.

---

## Release Stage — Applicant Download Flow

### Pre-Download Acknowledgment Gate

Before any document can be downloaded, applicant must
read and confirm this acknowledgment:

```
"Before you download your documents, please confirm:

☐ I have reviewed these documents for accuracy.
  All facts, figures, dates, and names are correct
  to the best of my knowledge.

☐ I understand that these documents were prepared
  using e2go.app, a document preparation service.
  e2go.app is not a law firm and has not provided
  legal advice.

☐ I understand that submitting false or misleading
  information to a U.S. government agency may
  constitute a federal offense.

☐ I am aware that my visa application will be
  assessed by a consular officer based on these
  documents and my interview. No outcome is
  guaranteed.

☐ I recommend — and e2go.app strongly encourages —
  that I have these documents reviewed by a licensed
  U.S. immigration attorney before submission.

[I confirm and download my documents →]"
```

All five boxes must be checked.
Confirmation recorded with timestamp in database.
This is the legal protection layer — inside the app,
before the clean document leaves.

### What Downloads

A ZIP file containing:
- All generated Word documents (.docx) — clean, sanitized
- All generated Word documents (.pdf) — clean, sanitized
- A checklist of documents included
- A README: "Review all documents carefully.
  Check every fact. Ensure all exhibits are assembled.
  This package was prepared to assist you —
  final accuracy is your responsibility."

### What Is Not In The Downloaded Files

- No e2go.app branding
- No AI generation markers
- No metadata identifying the creator
- No disclaimers visible on the document pages
- No watermarks
- No template markers
- No revision history

The documents belong to the applicant.
They prepared them. e2go helped organize their information.

---

## Audit Log — Every Pipeline Run

```sql
CREATE TABLE generation_pipeline_log (
    id UUID PRIMARY KEY,
    application_id UUID,
    document_type TEXT,
    pipeline_started_at TIMESTAMP,

    stage1_completed BOOLEAN,
    stage1_attempts INTEGER,
    stage1_completed_at TIMESTAMP,

    stage2_completed BOOLEAN,
    stage2_attempts INTEGER,
    stage2_completed_at TIMESTAMP,

    stage3_completed BOOLEAN,
    stage3_detection_score FLOAT,
    stage3_attempts INTEGER,
    stage3_completed_at TIMESTAMP,

    stage4_completed BOOLEAN,
    stage4_issues_found INTEGER,
    stage4_completed_at TIMESTAMP,

    stage5_completed BOOLEAN,
    stage5_legal_violations INTEGER,
    stage5_page_count INTEGER,
    stage5_uniqueness_passed BOOLEAN,
    stage5_completed_at TIMESTAMP,

    stage6_completed BOOLEAN,
    stage6_metadata_clean BOOLEAN,
    stage6_completed_at TIMESTAMP,

    released_at TIMESTAMP,
    applicant_acknowledged BOOLEAN,
    acknowledged_at TIMESTAMP,

    final_status TEXT -- RELEASED | PENDING_REVIEW | FAILED
);
```

This log is the proof that every document went through
every stage. It is the quality assurance record.
It is never deleted.
