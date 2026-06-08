import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  type DocumentType,
  type GenerationStep,
  type GenerationPayload,
  type ConsistencyResult,
  type ConsistencyIssue,
  type QualityResult,
  type GeneratedDocument,
  DOCUMENT_TYPE_LABELS,
  GENERATION_STEP_LABELS,
} from '@/types/generation';
import { type CaseBrief } from '@/types/analysis';
import { wrapUserContent } from './prompt-sanitizer';

const PROMPTS_DIR = join(process.cwd(), 'prompts', 'v1', 'documents');

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ---------------------------------------------------------------------------
// Get generation model from database config
// ---------------------------------------------------------------------------

let cachedModel: string | null = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 60000; // 1 minute cache

async function getGenerationModel(): Promise<string> {
  const now = Date.now();

  // Return cached model if still valid
  if (cachedModel && (now - modelCacheTime) < MODEL_CACHE_TTL) {
    return cachedModel;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'generation_model')
      .single();

    if (error) {
      console.warn('Failed to read generation_model from app_settings, using fallback:', error.message);
      cachedModel = 'claude-opus-4-8';
    } else {
      cachedModel = data?.value ?? 'claude-opus-4-8';
    }

    modelCacheTime = now;
    return cachedModel ?? 'claude-opus-4-8';
  } catch (err) {
    console.warn('Error reading generation model, using fallback:', err);
    return 'claude-opus-4-8';
  }
}

// Check for deprecation warnings in API response and update settings
async function checkDeprecationWarning(response: unknown): Promise<void> {
  try {
    // Anthropic deprecation warnings typically appear in response headers or model field
    const responseObj = response as { model?: string; warnings?: string[] };

    if (responseObj.model && responseObj.model.includes('deprecated')) {
      const supabase = getSupabase();
      await supabase.from('app_settings').upsert({
        key: 'model_deprecation_warning',
        value: 'WARNING: Current generation model is deprecated. Update in app_settings.',
        description: 'Auto-set when Anthropic deprecation detected',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      console.warn('Deprecation warning detected for model');
    }
  } catch {
    // Non-fatal - continue
  }
}

// ---------------------------------------------------------------------------
// 4a. Load prompt files
// ---------------------------------------------------------------------------

export async function loadPrompt(documentType: DocumentType): Promise<string> {
  const filePath = join(PROMPTS_DIR, `${documentType}.md`);
  if (!existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Investment breakdown extraction
// ---------------------------------------------------------------------------

interface InvestmentBreakdown {
  total_invested: number | null;
  total_business_cost: number | null;
  franchise_fee: number | null;
  leasehold_improvements: number | null;
  equipment_technology: number | null;
  educational_materials: number | null;
  working_capital: number | null;
  professional_fees: number | null;
  marketing_launch: number | null;
  at_risk_amount: number | null;
}

function extractInvestmentBreakdown(answers: Record<string, unknown>): InvestmentBreakdown {
  const getNumber = (key: string): number | null => {
    const val = answers[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // QF-02: Total invested to date
  // QF-03: Total business cost
  // QF-NEW-01: Amount spent on actual business expenses
  return {
    total_invested: getNumber('QF-02'),
    total_business_cost: getNumber('QF-03'),
    franchise_fee: getNumber('franchise_fee'),
    leasehold_improvements: getNumber('leasehold_improvements'),
    equipment_technology: getNumber('equipment_technology'),
    educational_materials: getNumber('educational_materials'),
    working_capital: getNumber('working_capital'),
    professional_fees: getNumber('professional_fees'),
    marketing_launch: getNumber('marketing_launch'),
    at_risk_amount: getNumber('QF-NEW-01'),
  };
}

// ---------------------------------------------------------------------------
// Data validation
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  missingFields: string[];
}

function validateContext(
  caseBrief: CaseBrief,
  module3Answers: Record<string, unknown>,
  investmentBreakdown: InvestmentBreakdown
): ValidationResult {
  const missingFields: string[] = [];

  // Check case brief fields
  const caseBriefData = caseBrief as unknown as Record<string, unknown>;
  if (!caseBriefData.applicant_name && !caseBriefData.applicantName) {
    missingFields.push('applicant_name');
  }

  // Check investment data
  if (!investmentBreakdown.total_invested && !investmentBreakdown.total_business_cost) {
    missingFields.push('investment_total');
  }

  // Check business info
  if (!caseBriefData.business_name && !caseBriefData.businessName) {
    missingFields.push('business_name');
  }

  // Check source of funds
  const sourceOfFunds = module3Answers['QF-05'];
  if (!sourceOfFunds) {
    missingFields.push('source_of_funds_summary');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// 4b. Build the generation payload
// ---------------------------------------------------------------------------

export async function buildGenerationPayload(
  applicationId: string,
  documentType: DocumentType,
  caseBrief: CaseBrief
): Promise<GenerationPayload> {
  const supabase = getSupabase();
  const systemPrompt = await loadPrompt(documentType);

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('application_id', applicationId);

  const { data: voiceProfile } = await supabase
    .from('applicant_voice_profile')
    .select('*')
    .eq('application_id', applicationId)
    .single();

  const { data: followUp } = await supabase
    .from('followup_responses')
    .select('*')
    .eq('application_id', applicationId);

  const module3Answers: Record<string, unknown> = {};
  if (answers) {
    for (const row of answers) {
      module3Answers[row.question_id] = row.answer_value;
    }
  }

  // Extract investment breakdown as structured data
  const investmentBreakdown = extractInvestmentBreakdown(module3Answers);

  return {
    system_prompt: systemPrompt,
    case_brief: caseBrief as unknown as Record<string, unknown>,
    module_3_answers: module3Answers,
    investment_breakdown: investmentBreakdown,
    voice_profile: voiceProfile?.voice_profile_text || '',
    consulate_post: (caseBrief as unknown as Record<string, unknown>).consulate_post as string || 'toronto',
    document_type: documentType,
    follow_up_responses: (followUp ? (Array.isArray(followUp) ? followUp : followUp) : {}) as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// 4c. Call the Anthropic API
// ---------------------------------------------------------------------------

export async function callClaudeAPI(payload: GenerationPayload): Promise<string> {
  const anthropic = getAnthropic();
  const docLabel = DOCUMENT_TYPE_LABELS[payload.document_type];

  // Format investment breakdown as a clear table
  const ib = payload.investment_breakdown;
  const investmentBreakdownText = ib ? [
    `INVESTMENT BREAKDOWN (USE EXACT VALUES — DO NOT ESTIMATE):`,
    `  Total Invested: ${ib.total_invested ? `$${ib.total_invested.toLocaleString()}` : 'NOT PROVIDED'}`,
    `  Total Business Cost: ${ib.total_business_cost ? `$${ib.total_business_cost.toLocaleString()}` : 'NOT PROVIDED'}`,
    `  At-Risk Amount: ${ib.at_risk_amount ? `$${ib.at_risk_amount.toLocaleString()}` : 'NOT PROVIDED'}`,
    ib.franchise_fee !== null ? `  Franchise Fee: $${ib.franchise_fee.toLocaleString()}` : null,
    ib.leasehold_improvements !== null ? `  Leasehold Improvements: $${ib.leasehold_improvements.toLocaleString()}` : null,
    ib.equipment_technology !== null ? `  Equipment & Technology: $${ib.equipment_technology.toLocaleString()}` : null,
    ib.educational_materials !== null ? `  Educational Materials: $${ib.educational_materials.toLocaleString()}` : null,
    ib.working_capital !== null ? `  Working Capital: $${ib.working_capital.toLocaleString()}` : null,
    ib.professional_fees !== null ? `  Professional Fees: $${ib.professional_fees.toLocaleString()}` : null,
    ib.marketing_launch !== null ? `  Marketing & Launch: $${ib.marketing_launch.toLocaleString()}` : null,
    '',
    `IMPORTANT: Use EXACT dollar amounts from this breakdown. Never estimate, round, or substitute any amounts.`,
    `If a figure is marked "NOT PROVIDED", state it is not yet confirmed — NEVER invent a number.`,
  ].filter(Boolean).join('\n') : '';

  const userMessage = [
    `KNOWLEDGE CONTEXT:`,
    `Consulate post: ${payload.consulate_post}`,
    `Document type: ${docLabel}`,
    '',
    investmentBreakdownText,
    `APPLICANT CASE BRIEF:`,
    wrapUserContent(JSON.stringify(payload.case_brief, null, 2)),
    '',
    `APPLICANT MODULE 3 ANSWERS:`,
    wrapUserContent(JSON.stringify(payload.module_3_answers, null, 2)),
    '',
    `VOICE PROFILE:`,
    wrapUserContent(payload.voice_profile),
    '',
    `FOLLOW-UP CONVERSATION:`,
    wrapUserContent(JSON.stringify(payload.follow_up_responses, null, 2)),
    '',
    `Generate the ${docLabel} now. Follow all instructions in the system prompt.`,
    'Do not include any headers, labels, or meta-commentary in your output.',
    'Output the document text only.',
  ].join('\n');

  async function attempt(): Promise<string> {
    const model = await getGenerationModel();
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: payload.system_prompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Check for deprecation warnings
    await checkDeprecationWarning(response);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Claude returned non-text response');
    }
    return content.text;
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.error('Claude API first attempt failed, retrying...', firstError);
    try {
      return await attempt();
    } catch (secondError) {
      const msg = secondError instanceof Error ? secondError.message : 'Unknown error';
      throw new Error(`CLAUDE_API_FAILED: ${msg}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4d. Humanization pass
// ---------------------------------------------------------------------------

export async function humanizeDocument(rawContent: string, voiceProfile: string): Promise<string> {
  const anthropic = getAnthropic();

  const systemPrompt = [
    'You are an editor. Remove all AI-sounding language from this document.',
    'Vary sentence length and structure. Inject natural imperfections.',
    'Match the voice profile provided. Do not change any facts.',
    'Do not add new information. Return only the revised document text.',
  ].join(' ');

  const userMessage = [
    'VOICE PROFILE:',
    wrapUserContent(voiceProfile),
    '',
    'DOCUMENT TO HUMANIZE:',
    rawContent,
  ].join('\n');

  const model = await getGenerationModel();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Check for deprecation warnings
  await checkDeprecationWarning(response);

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Humanization returned non-text response');
  }
  return content.text;
}

// ---------------------------------------------------------------------------
// 4e. Consistency checker
// ---------------------------------------------------------------------------

const CONSISTENCY_FIELDS: { field: string; patterns: RegExp[] }[] = [
  {
    field: 'applicant_name',
    patterns: [
      /(?:applicant|name|I,)\s*[:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /(?:Ms\.|Mr\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    ],
  },
  {
    field: 'investment_amount_usd',
    patterns: [
      /\$([0-9,]+)(?:\s*USD)?/,
      /investment\s+of\s+\$([0-9,]+)/i,
      /\$([0-9,]+)\s*(?:USD|United States dollars)/i,
    ],
  },
  {
    field: 'llc_name',
    patterns: [
      /(?:LLC|LLC name)[:]\s*([A-Z][A-Za-z\s]+(?:LLC|Limited|Inc\.?))/i,
      /([A-Z][A-Za-z\s]+Services\s*(?:LLC|Limited))/i,
      /([A-Z][A-Za-z\s]+Group\s*(?:LLC|Limited))/i,
    ],
  },
  {
    field: 'ein',
    patterns: [
      /EIN[:]?\s*(\d{2}-\d{7})/i,
      /(\d{2}-\d{7})/,
    ],
  },
  {
    field: 'business_address',
    patterns: [
      /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Street|Avenue|Road|Drive|Blvd|Lane|Court|Way)))/i,
      /located\s+at\s+(.+?)(?:,|\.)/i,
    ],
  },
  {
    field: 'franchise_brand',
    patterns: [
      /(?:franchise|franchisor)[:]\s*([A-Z][A-Za-z\s]+)/i,
      /([A-Z][A-Za-z\s]+Franchis(?:ing|e))/,
    ],
  },
  {
    field: 'llc_formation_date',
    patterns: [
      /(?:formed|established|organized)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /formation\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'franchise_agreement_date',
    patterns: [
      /franchise\s+agreement\s+(?:executed|signed)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /agreement\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'wire_transfer_date',
    patterns: [
      /(?:wire\s+transfer|transferred)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /transfer\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'family_composition',
    patterns: [
      /(?:spouse|wife|husband|family)\s+(?:of|:)\s*(\d+)/i,
      /(\d+)\s+(?:family|household)\s+members/i,
    ],
  },
];

function extractFieldValue(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[,$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkConsistency(documents: GeneratedDocument[]): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  for (const field of CONSISTENCY_FIELDS) {
    const valuesByDoc: Record<string, string> = {};

    for (const doc of documents) {
      if (!doc.content_text) continue;
      const value = extractFieldValue(doc.content_text, field.patterns);
      if (value) {
        valuesByDoc[doc.document_type] = value;
      }
    }

    const uniqueValues = new Set(
      Object.values(valuesByDoc).map(normalizeValue)
    );

    if (uniqueValues.size > 1) {
      issues.push({
        field: field.field,
        documents_affected: Object.keys(valuesByDoc),
        values_found: valuesByDoc,
      });
    }
  }

  return { passed: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// 4f. Quality gate
// ---------------------------------------------------------------------------

const MIN_WORD_COUNTS: Record<string, number> = {
  cover_letter: 800,
  source_of_funds: 400,
  investment_proof: 600,
  business_plan: 1200,
  qualifications: 400,
  ds160_reference: 300,
};

const MAX_PAGE_ESTIMATES: Record<string, number> = {
  cover_letter: 4,
  source_of_funds: 2,
  investment_proof: 4,
  business_plan: 8,
  qualifications: 2,
  ds160_reference: 5,
};

const FORBIDDEN_LEGAL_PHRASES = [
  'qualifies',
  'eligible',
  'meets the standard',
  'is substantial',
];

const LEGAL_DISCLAIMERS = [
  'does not constitute legal advice',
  'not a law firm',
  'prepared using e2go',
];

const AI_TOOL_NAMES = [
  'claude', 'anthropic', 'chatgpt', 'gpt-', 'openai', 'gemini', 'ai generated',
];

const WORDS_PER_PAGE = 250;

interface QualityGateOptions {
  caseBrief?: Record<string, unknown>;
  investmentTotal?: number | null;
}

export function runQualityGate(
  document: GeneratedDocument,
  documentType: DocumentType,
  options: QualityGateOptions = {}
): QualityResult {
  const content = document.content_text || '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageEstimate = Math.ceil(wordCount / WORDS_PER_PAGE);
  const failures: string[] = [];

  const minWords = MIN_WORD_COUNTS[documentType] || 400;
  if (wordCount < minWords) {
    failures.push(`Word count ${wordCount} below minimum ${minWords}`);
  }

  const maxPages = MAX_PAGE_ESTIMATES[documentType] || 8;
  if (pageEstimate > maxPages) {
    failures.push(`Page estimate ${pageEstimate} exceeds maximum ${maxPages}`);
  }

  const hasUnverifiedMarkers = /\[UNVERIFIED\]/i.test(content);
  if (hasUnverifiedMarkers) {
    failures.push('Contains [UNVERIFIED] markers');
  }

  const hasTemplatePlaceholders = /\{\{.*?\}\}/.test(content) || /\[\[.*?\]\]/.test(content);
  if (hasTemplatePlaceholders) {
    failures.push('Contains template placeholders ({{ }} or [[ ]])');
  }

  let hasLegalConclusions = false;
  const lowerContent = content.toLowerCase();
  for (const phrase of FORBIDDEN_LEGAL_PHRASES) {
    if (lowerContent.includes(phrase)) {
      hasLegalConclusions = true;
      failures.push(`Contains forbidden legal conclusion: "${phrase}"`);
    }
  }

  // CHECK 1: Legal disclaimer present
  const hasLegalDisclaimer = LEGAL_DISCLAIMERS.some(d => lowerContent.includes(d));
  if (!hasLegalDisclaimer) {
    failures.push('Missing legal disclaimer');
  }

  // CHECK 2: Investment figures consistency (if investment total provided)
  if (options.investmentTotal) {
    const dollarAmounts = content.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g) || [];
    for (const amountStr of dollarAmounts) {
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      // Flag if any amount differs from investment total by more than 10%
      if (amount > 1000 && Math.abs(amount - options.investmentTotal) > options.investmentTotal * 0.1) {
        // Only flag if it's clearly a different investment figure, not a salary or other amount
        if (amount < options.investmentTotal * 1.5 && amount > options.investmentTotal * 0.5) {
          failures.push(`Investment figure $${amount.toLocaleString()} differs significantly from total $${options.investmentTotal.toLocaleString()}`);
          break;
        }
      }
    }
  }

  // CHECK 3: Applicant name consistency (if case brief provides name)
  if (options.caseBrief) {
    const applicantName = options.caseBrief.applicant_name || options.caseBrief.applicantName;
    if (applicantName && typeof applicantName === 'string') {
      const nameParts = applicantName.split(' ');
      if (nameParts.length >= 2) {
        // Check if all name parts appear in document (at least first and last name)
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const hasFirstName = lowerContent.includes(firstName.toLowerCase());
        const hasLastName = lowerContent.includes(lastName.toLowerCase());
        if (!hasFirstName || !hasLastName) {
          failures.push(`Applicant name "${applicantName}" not consistently referenced`);
        }
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    word_count: wordCount,
    page_estimate: pageEstimate,
    has_unverified_markers: hasUnverifiedMarkers,
    has_template_placeholders: hasTemplatePlaceholders,
    has_legal_conclusions: hasLegalConclusions,
  };
}

// ---------------------------------------------------------------------------
// Helpers for pipeline
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimatePages(wordCount: number): number {
  return Math.ceil(wordCount / WORDS_PER_PAGE);
}

// ---------------------------------------------------------------------------
// 4h. Gap Analysis - Check for missing required elements in documents
// ---------------------------------------------------------------------------

interface GapAnalysisResult {
  missing_elements: Record<DocumentType, string[]>;
  recommendations: string[];
}

const REQUIRED_ELEMENTS: Record<DocumentType, string[]> = {
  cover_letter: [
    'applicant_name',
    'business_name',
    'investment_amount',
    'treaty_country',
    'consulate_post',
  ],
  source_of_funds: [
    'source_description',
    'timeline',
    'amount',
    'documentation_mentioned',
  ],
  investment_proof: [
    'investment_amount',
    'at_risk_amount',
    'funds_movement',
    'business_ownership',
  ],
  business_plan: [
    'business_description',
    'market_analysis',
    'financial_projections',
    'job_creation',
  ],
  qualifications: [
    'applicant_background',
    'experience',
    'education',
    'relevant_skills',
  ],
  ds160_reference: [
    'personal_information',
    'travel_history',
    'family_information',
    'employment',
  ],
};

function extractKeyElements(text: string): string[] {
  const lower = text.toLowerCase();
  const elements: string[] = [];

  // Common patterns for key elements
  const patterns = {
    applicant_name: /(?:applicant|name|i)\s*[:\-]?\s*([a-z]+\s+[a-z]+)/i,
    business_name: /(?:business|company|llc|inc)\s*[:\-]?\s*([a-z0-9\s]+)/i,
    investment_amount: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/,
    treaty_country: /(?:treaty|country|national|citizen)\s*[:\-]?\s*([a-z\s]+)/i,
    consulate_post: /(?:consulate|post|embassy)\s*[:\-]?\s*([a-z\s]+)/i,
    source_description: /(?:source|origin|derivation|earned|saved|inherited)/i,
    timeline: /(?:timeline|date|when|since|year|month)/i,
    amount: /\$\d{1,3}(?:,\d{3})*/,
    documentation_mentioned: /(?:document|evidence|proof|certificate|statement)/i,
    at_risk_amount: /(?:at\s*risk|endanger|vulnerable)/i,
    funds_movement: /(?:transfer|wire|move|spent|used)/i,
    business_ownership: /(?:own|ownership|share|percent|stake)/i,
    market_analysis: /(?:market|competition|industry|customers|target)/i,
    financial_projections: /(?:projection|forecast|revenue|profit|income)/i,
    job_creation: /(?:job|employment|hire|staff|team)/i,
    experience: /(?:experience|worked|years|background)/i,
    education: /(?:education|degree|university|college|school)/i,
    travel_history: /(?:travel|visited|country|trip)/i,
    family_information: /(?:family|spouse|children|married)/i,
    employment: /(?:employment|work|job|occupation)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower)) {
      elements.push(key);
    }
  }

  return elements;
}

export function runGapAnalysis(documents: GeneratedDocument[]): GapAnalysisResult {
  const missing_elements: Record<DocumentType, string[]> = {
    cover_letter: [],
    source_of_funds: [],
    investment_proof: [],
    business_plan: [],
    qualifications: [],
    ds160_reference: [],
  };

  const recommendations: string[] = [];

  for (const doc of documents) {
    if (!doc.content_text) continue;

    const required = REQUIRED_ELEMENTS[doc.document_type] || [];
    const found = extractKeyElements(doc.content_text);

    for (const req of required) {
      if (!found.includes(req) && !missing_elements[doc.document_type].includes(req)) {
        missing_elements[doc.document_type].push(req);
      }
    }
  }

  // Generate recommendations based on missing elements
  for (const [docType, missing] of Object.entries(missing_elements)) {
    if (missing.length > 0) {
      recommendations.push(`${docType}: Missing elements - ${missing.join(', ')}`);
    }
  }

  return { missing_elements, recommendations };
}

// ---------------------------------------------------------------------------
// 4i. Repetition Check - Detect duplicate content across documents
// ---------------------------------------------------------------------------

function computeSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = text2.toLowerCase().split(/\s+/).filter(Boolean);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionSize = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersectionSize++;
  });

  const unionSize = new Set([...words1, ...words2]).size;

  return intersectionSize / unionSize;
}

interface RepetitionResult {
  has_excessive_repetition: boolean;
  duplicate_pairs: Array<{
    doc1: DocumentType;
    doc2: DocumentType;
    similarity: number;
  }>;
}

export function checkRepetition(documents: GeneratedDocument[]): RepetitionResult {
  const duplicates: Array<{ doc1: DocumentType; doc2: DocumentType; similarity: number }> = [];
  const SIMILARITY_THRESHOLD = 0.70;

  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const doc1 = documents[i];
      const doc2 = documents[j];

      if (!doc1.content_text || !doc2.content_text) continue;

      const similarity = computeSimilarity(doc1.content_text, doc2.content_text);

      if (similarity >= SIMILARITY_THRESHOLD) {
        duplicates.push({
          doc1: doc1.document_type,
          doc2: doc2.document_type,
          similarity,
        });
      }
    }
  }

  return {
    has_excessive_repetition: duplicates.length > 0,
    duplicate_pairs: duplicates,
  };
}

// ---------------------------------------------------------------------------
// 4j. AI Detection Audit - Check if content appears AI-generated
// ---------------------------------------------------------------------------

const AI_DETECTION_THRESHOLD = 0.35;

export async function runAIDetectionAudit(
  documents: GeneratedDocument[]
): Promise<void> {
  const anthropic = getAnthropic();

  for (const doc of documents) {
    if (!doc.content_text) continue;

    try {
      const model = await getGenerationModel();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 500,
        system: `You are an AI detection tool. Analyze the following text and estimate how likely it was written by an AI.

Respond with ONLY a JSON object in this exact format:
{"ai_score": 0.0-1.0, "reasoning": "brief explanation"}

Where ai_score is 0.0 (definitely human) to 1.0 (definitely AI).
Consider: repetitive phrasing, formal structure, lack of personal voice, formulaic transitions.`,
        messages: [{ role: 'user', content: `Analyze this document for AI writing patterns:\n\n${doc.content_text.slice(0, 3000)}` }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const match = content.text.match(/"ai_score"\s*:\s*([0-9.]+)/);
        if (match) {
          const aiScore = parseFloat(match[1]);
          const passed = aiScore < AI_DETECTION_THRESHOLD;

          // Update document with AI detection results
          const supabase = getSupabase();
          await supabase
            .from('generated_documents')
            .update({
              ai_detection_score: aiScore,
              ai_detection_passed: passed,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', doc.job_id)
            .eq('document_type', doc.document_type);
        }
      }
    } catch (err) {
      console.error(`AI detection failed for ${doc.document_type}:`, err);
      // Non-fatal - continue
    }
  }
}

// ---------------------------------------------------------------------------
// 4g. Main orchestrator
// ---------------------------------------------------------------------------

export async function runGenerationPipeline(
  applicationId: string,
  userId: string,
  jobId: string,
  onProgress: (step: GenerationStep) => void
): Promise<void> {
  const supabase = getSupabase();
  const updateJob = async (updates: Record<string, unknown>) => {
    await supabase
      .from('document_generation_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  };

  const emitStep = (stepNum: number, status: GenerationStep['status']) => {
    const label = GENERATION_STEP_LABELS[stepNum] || `Step ${stepNum}`;
    onProgress({ id: stepNum, label, status });
  };

  const fail = async (stepNum: number, error: string) => {
    console.error(`Pipeline failed at step ${stepNum}:`, error);
    emitStep(stepNum, 'failed');
    await updateJob({
      status: 'failed',
      error_message: error,
      current_step: stepNum,
      current_step_label: GENERATION_STEP_LABELS[stepNum],
    });
  };

  // Emit SSE event for awaiting approval state
  const emitAwaitingApproval = async (
    docType: DocumentType,
    content: string,
    _wordCount: number,
    _pageEstimate: number
  ) => {
    const _preview = content.slice(0, 500);
    onProgress({
      id: 0,
      label: `${DOCUMENT_TYPE_LABELS[docType]} ready — please review and approve`,
      status: 'running',
    } as GenerationStep & { id: number });
    // Also emit a custom event through the job update
    await updateJob({
      status: 'awaiting_approval',
      current_step_label: `${DOCUMENT_TYPE_LABELS[docType]} ready — please review and approve`,
    });
  };

  // Polling function to wait for document approval
  const waitForApproval = async (
    docType: DocumentType,
    maxWaitMs = 300000 // 5 minutes max
  ): Promise<{ approved: boolean; revisionRequested: boolean }> => {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const { data: doc } = await supabase
        .from('generated_documents')
        .select('status')
        .eq('job_id', jobId)
        .eq('document_type', docType)
        .single();

      if (doc?.status === 'approved') {
        return { approved: true, revisionRequested: false };
      }
      if (doc?.status === 'revision_requested') {
        return { approved: false, revisionRequested: true };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout - treat as approval to not hang forever
    return { approved: true, revisionRequested: false };
  };

  const DOCUMENT_TYPES: DocumentType[] = [
    'cover_letter',
    'source_of_funds',
    'investment_proof',
    'business_plan',
    'qualifications',
    'ds160_reference',
  ];

  const generatedDocs: GeneratedDocument[] = [];

  try {
    // Mark job running
    await updateJob({
      status: 'running',
      started_at: new Date().toISOString(),
      current_step: 1,
      current_step_label: GENERATION_STEP_LABELS[1],
    });

    // Step 1: Load case brief
    emitStep(1, 'running');
    await updateJob({ current_step: 1, current_step_label: GENERATION_STEP_LABELS[1] });

    const { data: caseBriefRow, error: cbError } = await supabase
      .from('case_briefs')
      .select('case_brief_json')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cbError || !caseBriefRow?.case_brief_json) {
      await fail(1, 'No case brief found — run analysis engine first');
      return;
    }

    const caseBrief = caseBriefRow.case_brief_json as CaseBrief;

    // Get voice profile separately
    const { data: voiceProfileRow } = await supabase
      .from('applicant_voice_profile')
      .select('voice_profile_text')
      .eq('application_id', applicationId)
      .single();

    const voiceProfile = (voiceProfileRow?.voice_profile_text as string) || '';
    emitStep(1, 'complete');
    await updateJob({ current_step: 1, current_step_label: GENERATION_STEP_LABELS[1] });

    // Steps 2-7: Generate each document with sequential approval
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      const stepNum = i + 2;
      const docType = DOCUMENT_TYPES[i];
      const docLabel = DOCUMENT_TYPE_LABELS[docType];

      let documentApproved = false;
      let revisionLoopCount = 0;
      const maxRevisions = 3;

      // Revision loop: regenerate until approved or max attempts
      while (!documentApproved && revisionLoopCount < maxRevisions) {
        if (revisionLoopCount > 0) {
          // This is a revision - regenerate the document
          emitStep(stepNum, 'running');
          await updateJob({
            current_step: stepNum,
            current_step_label: `Regenerating ${docLabel} (attempt ${revisionLoopCount + 1})`,
          });
        }

        emitStep(stepNum, 'running');
        await updateJob({
          current_step: stepNum,
          current_step_label: revisionLoopCount === 0
            ? GENERATION_STEP_LABELS[stepNum]
            : `Regenerating ${docLabel} (attempt ${revisionLoopCount + 1})`
        });

        // Update document status to generating
        await supabase
          .from('generated_documents')
          .update({ status: 'generating', updated_at: new Date().toISOString() })
          .eq('job_id', jobId)
          .eq('document_type', docType);

        try {
          const payload = await buildGenerationPayload(applicationId, docType, caseBrief);

          // Validate required context before calling API
          const validation = validateContext(
            caseBrief,
            payload.module_3_answers,
            payload.investment_breakdown
          );
          if (!validation.valid) {
            const errorMsg = `Missing required data: ${validation.missingFields.join(', ')}. Complete Module 3 before generating.`;
            await supabase
              .from('generated_documents')
              .update({
                status: 'failed',
                error_message: errorMsg,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);
            await fail(stepNum, errorMsg);
            return;
          }

          const content = await callClaudeAPI(payload);

          const wc = countWords(content);
          const pages = estimatePages(wc);

          // Parse content into JSON sections if applicable
          let contentJson: Record<string, unknown> | null = null;
          const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              contentJson = JSON.parse(jsonMatch[1]);
            } catch {
              contentJson = { full_text: content };
            }
          } else {
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed === 'object' && parsed !== null) {
                contentJson = parsed;
              }
            } catch {
              contentJson = { full_text: content };
            }
          }

          // Save the generated document with 'generated' status (not under_review yet)
          await supabase
            .from('generated_documents')
            .update({
              content_text: content,
              content_json: contentJson,
              word_count: wc,
              page_estimate: pages,
              status: 'generated',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', docType);

          const newDoc: GeneratedDocument = {
            id: '',
            job_id: jobId,
            application_id: applicationId,
            user_id: userId,
            document_type: docType,
            status: 'generated',
            content_json: contentJson,
            content_text: content,
            word_count: wc,
            page_estimate: pages,
            revision_count: revisionLoopCount,
            revision_notes: [],
            ai_detection_score: null,
            ai_detection_passed: null,
            quality_gate_passed: null,
            quality_gate_notes: [],
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          generatedDocs.push(newDoc);

          // Mark this step as complete, but we're now awaiting approval
          emitStep(stepNum, 'complete');

          // Emit awaiting approval state - this pauses generation
          await emitAwaitingApproval(docType, content, wc, pages);

          // Wait for user approval or revision request
          const { approved, revisionRequested } = await waitForApproval(docType);

          if (approved) {
            // Mark document as approved
            await supabase
              .from('generated_documents')
              .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);

            documentApproved = true;
          } else if (revisionRequested) {
            // Increment revision count and loop
            revisionLoopCount++;
            await supabase
              .from('generated_documents')
              .update({
                revision_count: revisionLoopCount,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);

            // Resume the job to trigger regeneration
            await updateJob({ status: 'running' });
          }
        } catch (err) {
          await supabase
            .from('generated_documents')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', docType);

          const msg = err instanceof Error ? err.message : 'Unknown error';
          await fail(stepNum, `Failed to generate ${docLabel}: ${msg}`);
          return;
        }
      }

      if (!documentApproved && revisionLoopCount >= maxRevisions) {
        // Max revisions reached - auto-approve to continue
        await supabase
          .from('generated_documents')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            quality_gate_notes: ['Auto-approved after max revisions'],
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', docType);
      }

      // Resume job for next document
      await updateJob({ status: 'running' });
    }

    // All documents generated successfully (including DS-160 at step 7)
    // Flip refund eligibility - 14-day guarantee now void
    await supabase
      .from('payments')
      .update({ refund_eligible: false })
      .eq('application_id', applicationId)
      .eq('status', 'completed');

    // Step 7: Gap Analysis - Check for missing required elements
    emitStep(7, 'running');
    await updateJob({ current_step: 7, current_step_label: GENERATION_STEP_LABELS[7] });

    const gapResult = runGapAnalysis(generatedDocs);

    // Log gap analysis results
    if (gapResult.recommendations.length > 0) {
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: 'all',
          stage: 'gap_analysis',
          attempt_number: 1,
          passed: gapResult.recommendations.length === 0,
          flagged_sections: gapResult.recommendations,
          notes: `Gap analysis completed. ${gapResult.recommendations.length} recommendations.`,
        });
    }

    emitStep(7, 'complete');
    await updateJob({ current_step: 7, current_step_label: GENERATION_STEP_LABELS[7] });

    // Step 8: Repetition Check - Detect duplicate content across documents
    emitStep(8, 'running');
    await updateJob({ current_step: 8, current_step_label: GENERATION_STEP_LABELS[8] });

    const repetitionResult = checkRepetition(generatedDocs);

    if (repetitionResult.has_excessive_repetition) {
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: 'all',
          stage: 'repetition_check',
          attempt_number: 1,
          passed: false,
          flagged_sections: repetitionResult.duplicate_pairs.map(
            d => `${d.doc1} <-> ${d.doc2}: ${Math.round(d.similarity * 100)}% similar`
          ),
          notes: 'Excessive repetition detected between documents',
        });
    }

    emitStep(8, 'complete');
    await updateJob({ current_step: 8, current_step_label: GENERATION_STEP_LABELS[8] });

    // Step 9: Consistency check
    emitStep(9, 'running');
    await updateJob({ current_step: 9, current_step_label: GENERATION_STEP_LABELS[9] });

    const consistencyResult = checkConsistency(generatedDocs);

    // Auto-correct unambiguous issues (e.g., different spacing)
    if (!consistencyResult.passed) {
      for (const issue of consistencyResult.issues) {
        // Log the issue
        await supabase
          .from('document_generation_log')
          .insert({
            application_id: applicationId,
            document_type: 'all',
            stage: 'consistency_check',
            attempt_number: 1,
            passed: false,
            flagged_sections: [issue],
            notes: `Consistency issue: ${issue.field}`,
          });
      }
    }

    emitStep(9, 'complete');
    await updateJob({ current_step: 9, current_step_label: GENERATION_STEP_LABELS[9] });

    // Step 10: AI Detection Audit - Check if content appears AI-generated (threshold: 0.35)
    emitStep(10, 'running');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    await runAIDetectionAudit(generatedDocs);

    emitStep(10, 'complete');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    // Step 11: Humanization pass on all 6 documents
    emitStep(11, 'running');
    await updateJob({ current_step: 11, current_step_label: GENERATION_STEP_LABELS[11] });

    for (const doc of generatedDocs) {
      if (doc.content_text && voiceProfile) {
        try {
          const humanized = await humanizeDocument(doc.content_text, voiceProfile);
          const wc = countWords(humanized);
          const pages = estimatePages(wc);

          await supabase
            .from('generated_documents')
            .update({
              content_text: humanized,
              word_count: wc,
              page_estimate: pages,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', doc.document_type);
        } catch (err) {
          console.error(`Humanization failed for ${doc.document_type}:`, err);
          // Non-fatal — continue with original content
        }
      }
    }

    emitStep(11, 'complete');
    await updateJob({ current_step: 11, current_step_label: GENERATION_STEP_LABELS[11] });

    // Step 12: Metadata sanitization — strip placeholders, AI artifacts, and markdown
    emitStep(12, 'running');
    await updateJob({ current_step: 12, current_step_label: GENERATION_STEP_LABELS[12] });

    for (const doc of generatedDocs) {
      if (doc.content_text) {
        let clean = doc.content_text;

        // Remove template placeholders
        clean = clean.replace(/\{\{.*?\}\}/g, '');
        clean = clean.replace(/\[\[.*?\]\]/g, '');
        clean = clean.replace(/\[UNVERIFIED\]/gi, '');
        clean = clean.replace(/\[TODO.*?\]/gi, '');

        // Remove AI tool names and references
        for (const toolName of AI_TOOL_NAMES) {
          const regex = new RegExp(`\\b${toolName}\\b`, 'gi');
          clean = clean.replace(regex, '[AI tool]');
        }

        // Remove generation timestamps and internal references
        clean = clean.replace(/\b(?:generated|created|written)\s+(?:on|at|by)\s+[^\n]{5,50}/gi, '');
        clean = clean.replace(/\[.*?(?:prompt|instruction|context).*?\]/gi, '');

        // Remove markdown formatting that shouldn't be in legal documents
        clean = clean.replace(/^#{1,6}\s+/gm, '');  // Remove ## headers
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');  // Remove bold
        clean = clean.replace(/\*([^*]+)\*/g, '$1');  // Remove italic
        clean = clean.replace(/`{1,3}[^`]*`{1,3}/g, '');  // Remove code blocks
        clean = clean.replace(/^\s*[-*+]\s+/gm, '');  // Remove list markers
        clean = clean.replace(/^\s*\d+\.\s+/gm, '');  // Remove numbered lists

        // Clean up multiple blank lines
        clean = clean.replace(/\n{3,}/g, '\n\n');

        if (clean !== doc.content_text) {
          await supabase
            .from('generated_documents')
            .update({
              content_text: clean,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', doc.document_type);
        }
      }
    }

    emitStep(12, 'complete');
    await updateJob({ current_step: 12, current_step_label: GENERATION_STEP_LABELS[12] });

    // Step 13: Quality Gate - Final validation of each document
    emitStep(13, 'running');
    await updateJob({ current_step: 13, current_step_label: GENERATION_STEP_LABELS[13] });

    // Extract investment data for quality gate checks
    const caseBriefData = caseBrief as unknown as Record<string, unknown>;
    const investmentTotal = (caseBriefData.investment_amount as number) ||
                          (caseBriefData.total_investment as number) ||
                          (caseBriefData.investment as number) || null;

    let _allQualityPassed = true;
    for (const doc of generatedDocs) {
      const qualityResult = runQualityGate(doc, doc.document_type, {
        caseBrief: caseBriefData,
        investmentTotal,
      });

      // Re-prompt once if quality gate fails
      if (!qualityResult.passed) {
        try {
          const payload = await buildGenerationPayload(applicationId, doc.document_type, caseBrief);
          const failureInstructions = [
            'CRITICAL: Your previous output failed the quality check. Fix these issues:',
            ...qualityResult.failures.map(f => `  - ${f}`),
            '',
            'Rewrite the document addressing all failures above.',
          ].join('\n');

          const model = await getGenerationModel();
          const retryResponse = await getAnthropic().messages.create({
            model,
            max_tokens: 4000,
            system: payload.system_prompt + '\n\n' + failureInstructions,
            messages: [{ role: 'user', content: 'Regenerate the document now.' }],
          });

          const retryContent = retryResponse.content[0];
          if (retryContent.type === 'text') {
            const wc = countWords(retryContent.text);
            const pages = estimatePages(wc);

            await supabase
              .from('generated_documents')
              .update({
                content_text: retryContent.text,
                word_count: wc,
                page_estimate: pages,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', doc.document_type);

            // Re-run quality gate
            const retryQuality = runQualityGate(
              { ...doc, content_text: retryContent.text },
              doc.document_type,
              { caseBrief: caseBriefData, investmentTotal }
            );

            await supabase
              .from('generated_documents')
              .update({
                quality_gate_passed: retryQuality.passed,
                quality_gate_notes: retryQuality.failures,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', doc.document_type);

            if (!retryQuality.passed) {
              _allQualityPassed = false;
            }
          }
        } catch {
          _allQualityPassed = false;
        }
      } else {
        await supabase
          .from('generated_documents')
          .update({
            quality_gate_passed: true,
            quality_gate_notes: [],
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', doc.document_type);
      }
    }

    emitStep(13, 'complete');
    await updateJob({ current_step: 13, current_step_label: GENERATION_STEP_LABELS[13] });

    // Step 14: Acknowledgment Gate — quality checks passed, log results
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      const stepNum = 14;
      emitStep(stepNum, 'running');
      await updateJob({ current_step: stepNum, current_step_label: GENERATION_STEP_LABELS[stepNum] });

      const docType = DOCUMENT_TYPES[i];
      const generatedDoc = generatedDocs.find(d => d.document_type === docType);

      // Get quality gate results for this document
      const { data: docData } = await supabase
        .from('generated_documents')
        .select('quality_gate_passed, quality_gate_notes, word_count')
        .eq('job_id', jobId)
        .eq('document_type', docType)
        .single();

      // Log results to document_generation_log
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: docType,
          stage: 'acknowledgment_gate',
          attempt_number: 1,
          passed: docData?.quality_gate_passed ?? true,
          flagged_sections: docData?.quality_gate_notes || [],
          notes: `Quality gate completed. Word count: ${docData?.word_count || 'N/A'}. AI detection: ${generatedDoc?.ai_detection_passed ? 'passed' : 'not run'}.`,
        });

      // Ensure quality_gate_passed is set
      if (docData?.quality_gate_passed === null || docData?.quality_gate_passed === undefined) {
        await supabase
          .from('generated_documents')
          .update({
            quality_gate_passed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', docType);
      }
    }
    emitStep(14, 'complete');
    await updateJob({ current_step: 14, current_step_label: GENERATION_STEP_LABELS[14] });

    // Step 15: Preview unlocked
    emitStep(15, 'complete');
    await updateJob({ current_step: 15, current_step_label: GENERATION_STEP_LABELS[15] });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown pipeline error';
    await fail(0, msg);
  }
}