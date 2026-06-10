import { createClient } from '@supabase/supabase-js';
import {
  type ClassificationResult,
  type ExtractionResult,
  type ExtractedField,
  type DetectedDocumentType,
  type DiscrepancyValue,
  type GapReport,
  type CriticalGap,
  type SectionCoverage,
  type DocumentSummary,
  type Confidence,
} from '@/types/document-upload';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const EXTRACTION_MODEL = 'anthropic/claude-sonnet-4';

function _getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================================
// Classification — Stage 2
// ============================================================================

export async function classifyDocument(
  documentText: string,
  userSelectedType: string
): Promise<ClassificationResult> {
  const systemPrompt = `You are classifying an uploaded document for an E-2 visa preparation platform.

Read the following document and identify what type it is.

Return ONLY valid JSON, no preamble, no markdown:
{
  "detected_type": "cover_letter" | "business_plan" | "source_of_funds" | "biography" | "ds160" | "projections" | "operating_agreement" | "franchise_docs" | "unknown",
  "confidence": "high" | "medium" | "low",
  "reasoning": "one sentence explaining why"
}

Types:
- cover_letter: Letter addressed to a visa officer or embassy explaining the E-2 application
- business_plan: Detailed plan describing business operations, market, financials
- source_of_funds: Narrative or documentation explaining where investment money came from
- biography: Professional history, qualifications, education of the investor
- ds160: Completed DS-160 form or similar visa application form
- projections: Financial projections, revenue forecasts, P&L tables
- operating_agreement: LLC operating agreement or corporate bylaws
- franchise_docs: Franchise agreement, FDD, or franchise-related documents
- unknown: Cannot determine document type`;

  const userPrompt = `User selected type: ${userSelectedType}

Document text:
${documentText}`;

  const result = await callExtractionAPI(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(result);
    return {
      detected_type: parsed.detected_type || 'unknown',
      confidence: parsed.confidence || 'low',
      reasoning: parsed.reasoning || 'Could not determine document type',
    };
  } catch {
    return {
      detected_type: 'unknown',
      confidence: 'low',
      reasoning: 'Failed to parse classification response',
    };
  }
}

// ============================================================================
// Field Extraction — Stage 3
// ============================================================================

const EXTRACTION_QUESTIONS = `SECTION 1 — STORY
QA-01: Applicant full legal name
QA-05: Nationality/citizenship
QA-09: Current address (city, province/state, country)
QD-01: Professional background summary (what they've spent their career doing)
QD-02: Why they are making this move / motivation
QD-03: Relevant experience for running this business
QD-04: First-year plan and priorities
QD-05: Non-immigrant intent — ties to home country, reason to return

SECTION 2 — BUSINESS
QA-51: Business legal name
QE-02: Entity type (LLC, Corp, etc.)
QE-03: State of registration
QE-04: EIN (if mentioned)
QA-52: Business address
QK-01: Business description — what it does, who pays, how money flows
QK-02: Target customers
QK-03: Market opportunity / why this market
QK-04: Competitive advantage
QG-02: Operational status (open / in setup / pre-start)
QF-09: Franchise system name (if franchise)

SECTION 3 — INVESTMENT
QF-02: Total investment amount (USD)
QF-03: Total business establishment cost
QF-05: Source of funds (savings / property sale / RRSP / loan / gift / crypto / other)
QH-01: Funds narrative — step-by-step trail from source to US business account
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
QD-05: Ties to home country (property, family, accounts, professional memberships)`;

export async function extractFields(
  documentText: string,
  documentType: DetectedDocumentType,
  filename: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an E-2 visa preparation assistant extracting information from a document to pre-fill an application form.

Extract answers to the following questions where you find relevant information. For each answer:
- Extract the exact value or a clean summary
- Rate your confidence: high (explicitly stated), medium (clearly implied), low (uncertain inference)
- Note the source: quote the 5-10 words from the document that support this extraction

Return ONLY valid JSON. No preamble. No markdown.

Document type: ${documentType}
Filename: ${filename}

Questions to extract:
${EXTRACTION_QUESTIONS}

Return format:
{
  "extracted_fields": [
    {
      "question_id": "QF-02",
      "value": "185000",
      "display_value": "$185,000 USD",
      "confidence": "high",
      "source_quote": "total investment of $185,000"
    }
  ],
  "document_summary": "One sentence describing what this document is and its overall quality/completeness"
}

Only include fields where you actually find relevant information in the document. Do not fabricate or infer values not supported by the text.`;

  const userPrompt = `Document text:
${documentText}`;

  const result = await callExtractionAPI(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(result);
    return {
      extracted_fields: Array.isArray(parsed.extracted_fields)
        ? parsed.extracted_fields.map((f: Record<string, string>) => ({
            question_id: f.question_id || '',
            value: f.value || '',
            display_value: f.display_value || f.value || '',
            confidence: validateConfidence(f.confidence),
            source_quote: f.source_quote || '',
          }))
        : [],
      document_summary: parsed.document_summary || '',
    };
  } catch {
    return {
      extracted_fields: [],
      document_summary: 'Failed to parse extraction response',
    };
  }
}

// ============================================================================
// Discrepancy Detection — Stage 4
// ============================================================================

interface DocumentExtraction {
  documentId: string;
  filename: string;
  detectedType: DetectedDocumentType | null;
  fields: ExtractedField[];
}

export function detectDiscrepancies(
  extractions: DocumentExtraction[]
): Array<{
  question_id: string;
  question_label: string;
  conflicting_values: DiscrepancyValue[];
}> {
  // Group fields by question_id across all documents
  const fieldMap = new Map<string, DiscrepancyValue[]>();

  for (const extraction of extractions) {
    for (const field of extraction.fields) {
      if (!field.question_id || !field.value) continue;

      const existing = fieldMap.get(field.question_id) || [];
      existing.push({
        value: field.value,
        display_value: field.display_value,
        source_document: extraction.filename,
        source_document_type: extraction.detectedType || 'unknown',
        source_quote: field.source_quote,
        confidence: field.confidence,
      });
      fieldMap.set(field.question_id, existing);
    }
  }

  const discrepancies: Array<{
    question_id: string;
    question_label: string;
    conflicting_values: DiscrepancyValue[];
  }> = [];

  for (const [questionId, values] of fieldMap) {
    if (values.length < 2) continue;

    // Check if values conflict
    const uniqueValues = new Map<string, DiscrepancyValue>();
    for (const v of values) {
      const normalized = normalizeForComparison(v.value, questionId);
      if (!uniqueValues.has(normalized)) {
        uniqueValues.set(normalized, v);
      }
    }

    if (uniqueValues.size > 1) {
      discrepancies.push({
        question_id: questionId,
        question_label: QUESTION_LABELS[questionId] || questionId,
        conflicting_values: values,
      });
    }
  }

  return discrepancies;
}

function normalizeForComparison(value: string, questionId: string): string {
  const trimmed = value.trim().toLowerCase();

  // Numeric fields — normalize to number
  if (isNumericField(questionId)) {
    const num = extractNumber(trimmed);
    return num.toString();
  }

  // Text fields — normalize whitespace and case
  return trimmed.replace(/\s+/g, ' ');
}

function isNumericField(questionId: string): boolean {
  return /^(QI-05|QI-06|QF-02|QF-03|QI-04)/.test(questionId);
}

function extractNumber(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

// ============================================================================
// Gap Report Generation
// ============================================================================

const SECTION_MAP: Record<string, string> = {
  QA: 'section_1_story',
  QD: 'section_1_story',
  QE: 'section_2_business',
  QG: 'section_2_business',
  QK: 'section_2_business',
  QF: 'section_3_investment',
  QH: 'section_3_investment',
  QI: 'section_3_investment',
  QJ: 'section_4_qualifications',
  QL: 'section_5_family',
};

const SECTION_LABELS: Record<string, string> = {
  section_1_story: 'Your story',
  section_2_business: 'Your business',
  section_3_investment: 'Your investment',
  section_4_qualifications: 'Your qualifications',
  section_5_family: 'Your family',
  section_6_ties: 'Your ties',
};

// Critical gaps — high-severity questions from the 34-gap audit
const CRITICAL_GAPS: CriticalGap[] = [
  {
    questionId: 'QF-02',
    label: 'Total investment amount',
    reason: 'Officers require a specific dollar amount to evaluate substantiality.',
    severity: 'high',
  },
  {
    questionId: 'QH-01',
    label: 'Source of funds narrative',
    reason: 'The funds trail from source to US business account must be documented step by step.',
    severity: 'high',
  },
  {
    questionId: 'QD-01',
    label: 'Professional background',
    reason: 'Your career history establishes why you are qualified to run this business.',
    severity: 'high',
  },
  {
    questionId: 'QK-01',
    label: 'Business description',
    reason: 'Officers need to understand exactly what the business does and how it generates revenue.',
    severity: 'high',
  },
  {
    questionId: 'QI-05-Y1',
    label: 'Year 1 revenue projection',
    reason: 'Revenue projections are the primary evidence of non-marginality for new businesses.',
    severity: 'high',
  },
  {
    questionId: 'QI-06-Y1',
    label: 'Year 1 net income',
    reason: 'Net income projections demonstrate the business will generate substantially more than household income needs.',
    severity: 'high',
  },
  {
    questionId: 'QJ-01',
    label: 'Education',
    reason: 'Education credentials support investor qualifications.',
    severity: 'medium',
  },
  {
    questionId: 'QJ-03',
    label: 'Work history',
    reason: 'Relevant work experience strengthens the case that you can successfully operate this business.',
    severity: 'high',
  },
];

export function generateGapReport(
  extractions: DocumentExtraction[],
  allAnswers: Map<string, string>
): GapReport {
  // Count total questions and filled questions
  const allQuestionIds = getAllQuestionIds();
  const totalQuestions = allQuestionIds.length;

  // Merge extracted fields with existing answers
  const filledFields = new Set(allAnswers.keys());
  for (const extraction of extractions) {
    for (const field of extraction.fields) {
      if (field.question_id && field.value && field.confidence !== 'low') {
        filledFields.add(field.question_id);
      }
    }
  }

  const filledCount = filledFields.size;

  // Calculate section coverage
  const sectionCoverage: Record<string, SectionCoverage> = {};
  for (const [sectionKey, _sectionLabel] of Object.entries(SECTION_LABELS)) {
    const sectionQuestions = allQuestionIds.filter(qid => {
      const section = SECTION_MAP[qid.substring(0, 2)] || SECTION_MAP[qid.substring(0, 3)];
      return section === sectionKey;
    });

    const sectionFilled = sectionQuestions.filter(qid => filledFields.has(qid)).length;

    sectionCoverage[sectionKey] = {
      total: sectionQuestions.length,
      filled: sectionFilled,
      percentage: sectionQuestions.length > 0
        ? Math.round((sectionFilled / sectionQuestions.length) * 100)
        : 0,
    };
  }

  // Identify critical gaps
  const criticalGaps = CRITICAL_GAPS.filter(gap => !filledFields.has(gap.questionId));

  // Build document summaries
  const documentSummaries: DocumentSummary[] = extractions.map(ext => ({
    documentId: ext.documentId,
    filename: ext.filename,
    detectedType: ext.detectedType,
    fieldsExtracted: ext.fields.filter(f => f.value && f.confidence !== 'low').length,
    summary: null, // Will be populated from extraction result
  }));

  return {
    totalQuestions,
    filledCount,
    sectionCoverage,
    criticalGaps,
    documentSummaries,
  };
}

// ============================================================================
// Helpers
// ============================================================================

async function callExtractionAPI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'e2go.app-document-extraction',
    },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Extraction API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function validateConfidence(value: string): Confidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

const QUESTION_LABELS: Record<string, string> = {
  'QA-01': 'Full legal name',
  'QA-05': 'Nationality/citizenship',
  'QA-09': 'Current address',
  'QA-51': 'Business legal name',
  'QA-52': 'Business address',
  'QD-01': 'Professional background',
  'QD-02': 'Motivation for move',
  'QD-03': 'Relevant experience',
  'QD-04': 'First-year plan',
  'QD-05': 'Ties to home country',
  'QE-02': 'Entity type',
  'QE-03': 'State of registration',
  'QE-04': 'EIN',
  'QF-02': 'Total investment amount',
  'QF-03': 'Total business cost',
  'QF-05': 'Source of funds',
  'QF-07': 'US business bank',
  'QF-09': 'Franchise system',
  'QG-02': 'Operational status',
  'QH-01': 'Funds narrative',
  'QI-04': 'Employee headcount Y1',
  'QI-05-Y1': 'Year 1 revenue',
  'QI-05-Y2': 'Year 2 revenue',
  'QI-05-Y3': 'Year 3 revenue',
  'QI-05-Y4': 'Year 4 revenue',
  'QI-05-Y5': 'Year 5 revenue',
  'QI-06-Y1': 'Year 1 net income',
  'QI-06-Y2': 'Year 2 net income',
  'QI-06-Y3': 'Year 3 net income',
  'QI-06-Y4': 'Year 4 net income',
  'QI-06-Y5': 'Year 5 net income',
  'QJ-01': 'Education',
  'QJ-03': 'Work history',
  'QJ-04': 'Relevant specific experience',
  'QK-01': 'Business description',
  'QK-02': 'Target customers',
  'QK-03': 'Market opportunity',
  'QK-04': 'Competitive advantage',
};

function getAllQuestionIds(): string[] {
  return Object.keys(QUESTION_LABELS);
}
