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

  return {
    system_prompt: systemPrompt,
    case_brief: caseBrief as unknown as Record<string, unknown>,
    module_3_answers: module3Answers,
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

  const userMessage = [
    `KNOWLEDGE CONTEXT:`,
    `Consulate post: ${payload.consulate_post}`,
    `Document type: ${docLabel}`,
    '',
    `APPLICANT CASE BRIEF:`,
    JSON.stringify(payload.case_brief, null, 2),
    '',
    `APPLICANT MODULE 3 ANSWERS:`,
    JSON.stringify(payload.module_3_answers, null, 2),
    '',
    `VOICE PROFILE:`,
    payload.voice_profile,
    '',
    `FOLLOW-UP CONVERSATION:`,
    JSON.stringify(payload.follow_up_responses, null, 2),
    '',
    `Generate the ${docLabel} now. Follow all instructions in the system prompt.`,
    'Do not include any headers, labels, or meta-commentary in your output.',
    'Output the document text only.',
  ].join('\n');

  async function attempt(): Promise<string> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: payload.system_prompt,
      messages: [{ role: 'user', content: userMessage }],
    });

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
    voiceProfile,
    '',
    'DOCUMENT TO HUMANIZE:',
    rawContent,
  ].join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

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
      /\$([0-9,]+\s*(?:USD)?)/g,
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

const WORDS_PER_PAGE = 250;

export function runQualityGate(
  document: GeneratedDocument,
  documentType: DocumentType
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

    // Steps 2-7: Generate each document
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      const stepNum = i + 2;
      const docType = DOCUMENT_TYPES[i];
      const docLabel = DOCUMENT_TYPE_LABELS[docType];

      emitStep(stepNum, 'running');
      await updateJob({ current_step: stepNum, current_step_label: GENERATION_STEP_LABELS[stepNum] });

      // Update document status to generating
      await supabase
        .from('generated_documents')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('job_id', jobId)
        .eq('document_type', docType);

      try {
        const payload = await buildGenerationPayload(applicationId, docType, caseBrief);
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

        await supabase
          .from('generated_documents')
          .update({
            content_text: content,
            content_json: contentJson,
            word_count: wc,
            page_estimate: pages,
            status: 'generating',
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', docType);

        generatedDocs.push({
          id: '',
          job_id: jobId,
          application_id: applicationId,
          user_id: userId,
          document_type: docType,
          status: 'generating',
          content_json: contentJson,
          content_text: content,
          word_count: wc,
          page_estimate: pages,
          revision_count: 0,
          revision_notes: [],
          ai_detection_score: null,
          ai_detection_passed: null,
          quality_gate_passed: null,
          quality_gate_notes: [],
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        emitStep(stepNum, 'complete');
        await updateJob({ current_step: stepNum, current_step_label: GENERATION_STEP_LABELS[stepNum] });
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

    // Step 8: Humanization pass on all 6 documents
    emitStep(8, 'running');
    await updateJob({ current_step: 8, current_step_label: GENERATION_STEP_LABELS[8] });

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

    // Step 10: Quality gate on each document
    emitStep(10, 'running');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    let allQualityPassed = true;
    for (const doc of generatedDocs) {
      const qualityResult = runQualityGate(doc, doc.document_type);

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

          const retryResponse = await getAnthropic().messages.create({
            model: 'claude-sonnet-4-20250514',
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
              doc.document_type
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
              allQualityPassed = false;
            }
          }
        } catch {
          allQualityPassed = false;
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

    emitStep(10, 'complete');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    // Step 11: Quality gate result (already handled in step 10)
    emitStep(11, 'complete');
    await updateJob({ current_step: 11, current_step_label: GENERATION_STEP_LABELS[11] });

    // Step 12: Metadata sanitization — strip {{placeholders}} and [UNVERIFIED]
    emitStep(12, 'running');
    await updateJob({ current_step: 12, current_step_label: GENERATION_STEP_LABELS[12] });

    for (const doc of generatedDocs) {
      if (doc.content_text) {
        const clean = doc.content_text
          .replace(/\{\{.*?\}\}/g, '')
          .replace(/\[\[.*?\]\]/g, '')
          .replace(/\[UNVERIFIED\]/gi, '')
          .replace(/\[TODO.*?\]/gi, '');

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

    // Step 13: Mark job completed
    emitStep(13, 'running');
    await updateJob({
      current_step: 13,
      current_step_label: GENERATION_STEP_LABELS[13],
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    emitStep(13, 'complete');

    // Step 14: Mark all documents under_review
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      const stepNum = 14;
      emitStep(stepNum, 'running');
      await updateJob({ current_step: stepNum, current_step_label: GENERATION_STEP_LABELS[stepNum] });

      await supabase
        .from('generated_documents')
        .update({
          status: 'under_review',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .eq('document_type', DOCUMENT_TYPES[i]);
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