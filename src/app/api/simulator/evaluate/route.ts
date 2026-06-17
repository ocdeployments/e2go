import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getQuestionKnowledge } from '@/lib/interview-knowledge-base';
import { checkRateLimit } from '@/lib/rate-limit';
import { callLLM } from '@/lib/llm-client';
import type { SimulatorContext, AnswerEvaluation } from '@/types/simulator';

const DOC_TYPE_LABELS: Record<string, string> = {
  cover_letter: 'Cover letter',
  business_plan: 'Business plan',
  source_of_funds: 'Source of funds',
  biography: 'Investor biography',
  ds160: 'DS-160 form',
  projections: 'Financial projections',
  operating_agreement: 'Operating agreement',
  franchise_docs: 'Franchise documents',
};

interface PriorAnswer {
  questionText: string;
  answerText: string;
}

interface EvaluateRequest {
  questionId: string;
  questionText: string;
  answer: string;
  context: SimulatorContext;
  priorAnswers?: PriorAnswer[];
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'evaluate');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before submitting another answer.' },
      { status: 429, headers: { 'Retry-After': String(rl.reset) } }
    );
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('[simulator-evaluate] No LLM provider configured');
    return NextResponse.json(
      { error: 'Evaluation service not configured' },
      { status: 503 }
    );
  }

  let body: EvaluateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { questionId, questionText, answer, context, priorAnswers } = body;

  if (!questionId || !questionText || !answer || !context) {
    return NextResponse.json(
      { error: 'Missing required fields: questionId, questionText, answer, context' },
      { status: 400 }
    );
  }

  // Fetch filed document summaries for grounded evaluation (non-fatal if absent)
  let documentEvidence = '';
  try {
    const { data: docs } = await supabase
      .from('application_documents')
      .select('detected_document_type, document_summary')
      .eq('application_id', context.applicationId)
      .not('document_summary', 'is', null);

    if (docs && docs.length > 0) {
      const lines = docs
        .filter(d => d.document_summary)
        .map(d => {
          const label = DOC_TYPE_LABELS[d.detected_document_type ?? 'unknown'] ?? 'Document';
          return `- ${label}: ${(d.document_summary as string).substring(0, 220)}`;
        });
      if (lines.length > 0) {
        documentEvidence = `\n\nFiled documents on record (use these to detect real inconsistencies):\n${lines.join('\n')}`;
      }
    }
  } catch {
    // Non-fatal — proceed without document evidence
  }

  // Inject gold-standard knowledge for this question type
  const knowledge = getQuestionKnowledge(questionId);
  const knowledgeSection = knowledge
    ? `\n\nGOLD-STANDARD CRITERIA FOR THIS QUESTION TYPE ("${knowledge.topic}"):
Officer is testing: ${knowledge.officerTests}
A strong answer must cover: ${knowledge.keyPrinciples.map((p, i) => `(${i + 1}) ${p}`).join('; ')}
Red flags that indicate a weak answer: ${knowledge.redFlags.join('; ')}`
    : '';

  // Build the evaluation prompt
  const businessLine = context.operatingName
    ? `${context.businessName}, operating under the trade/franchise name "${context.operatingName}"`
    : context.businessName;

  const prompt = `You are a U.S. consular officer evaluating an E-2 visa interview answer.
The applicant's profile:
- Business: ${businessLine} (${context.businessCategory})${context.targetState ? ` in ${context.targetState}` : ''}
- Investment: $${context.investmentAmount.toLocaleString()}
- Operational status: ${context.operationalStatus}
- Year 1 revenue projection: $${context.revenueYear1.toLocaleString()}
- Employees: ${context.employeeCountCurrent} current, ${context.employeeCountYear1} planned
- Prior visa denial: ${context.priorVisaDenial ? 'Yes' : 'No'}${documentEvidence}

Note: If the applicant refers to their business by a trade name, brand name, or franchise banner that differs from the legal entity name above, do NOT treat that alone as an inconsistency — businesses commonly operate under a "doing business as" or franchise name distinct from their legal name. Only flag a genuine inconsistency if the substance of the answer (investment amount, role, location, business activities, etc.) contradicts the filed application.

The question asked was: "${questionText}"

The applicant's live answer was: "${answer}"
${knowledgeSection}

${priorAnswers && priorAnswers.length > 0
  ? `The applicant's previous answers this session — check for factual consistency against this answer:\n${priorAnswers.map((p, i) => `Prior Q${i + 1}: "${p.questionText}"\nPrior A${i + 1}: "${p.answerText}"`).join('\n\n')}\n\n`
  : ''}Severity definitions — choose exactly one:
- "fatal": answer contradicts filed documents OR fails a core E-2 criterion outright (e.g. denies managerial control, claims investment not yet committed)
- "significant": answer fails an important officer expectation but is not fatal to the case
- "cosmetic": answer is adequate but lacks specificity, confidence, or structure

Evaluate this answer. Reply with ONLY valid JSON — no prose before or after:
{"rating":"strong"|"weak"|"inconsistent","severity":"fatal"|"significant"|"cosmetic","score":1-10,"feedback":"3 sentences: what an officer expects on this question, whether this answer meets that bar, and what specific gap or risk you identified","specificSuggestion":"2 sentences always required. If weak or inconsistent: exactly what to say differently and how to frame it correctly for an E-2 approval. If strong: what the applicant can do to elevate the answer further and pre-empt follow-up questions.","documentReference":"Name of the most relevant tab in the application package (e.g. Tab B - Business Plan, Tab D - Investment Evidence) or null"}

Score guide: 1-3 = fails core E-2 criteria or contradicts documents; 4-5 = meets basic threshold but weak on specifics; 6-7 = solid answer with minor gaps; 8-9 = strong, specific, credible; 10 = exceptional, proactively addresses officer concerns.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  const evalStart = Date.now();
  console.log(`[simulator-evaluate] Evaluating question ${questionId} (with fallback chain)`);

  try {
    const content = await callLLM({
      task: 'evaluate',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced U.S. consular officer evaluating E-2 visa interview answers. Be strict but fair. Focus on whether the answer addresses what a real officer would want to hear, and whether it is consistent with the filed application documents. When filed documents are provided, cross-reference the answer against them and flag real contradictions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 700,
      signal: controller.signal,
    });

    console.log(`[simulator-evaluate] Completed in ${Date.now() - evalStart}ms for question ${questionId}`);

    if (!content) {
      return NextResponse.json({
        rating: 'weak',
        feedback: 'Evaluation service unavailable. Your answer has been recorded.',
        specificSuggestion: 'Review your answer and ensure it covers specific details about your business and investment.',
        documentReference: null,
      } satisfies AnswerEvaluation);
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const score = typeof parsed.score === 'number' && parsed.score >= 1 && parsed.score <= 10
          ? Math.round(parsed.score) : undefined;
        return NextResponse.json({
          rating: parsed.rating || 'weak',
          severity: parsed.severity || undefined,
          score,
          feedback: parsed.feedback || 'Evaluation complete.',
          specificSuggestion: parsed.specificSuggestion || 'Review your answer and add more specific details.',
          documentReference: parsed.documentReference || null,
        } satisfies AnswerEvaluation);
      }
    } catch (parseError) {
      console.error(`[simulator-evaluate] JSON parse failed for question ${questionId}. Raw content:`, content.substring(0, 500), parseError);
    }

    return NextResponse.json({
      rating: 'weak',
      feedback: content.substring(0, 200) || 'Answer recorded.',
      specificSuggestion: 'Provide more specific details about your business and experience.',
      documentReference: null,
    } satisfies AnswerEvaluation);

  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    console.error(`[simulator-evaluate] ${isAbort ? 'TIMED OUT' : 'FAILED'} for question ${questionId}:`, error);
    return NextResponse.json({
      rating: 'weak',
      feedback: 'Evaluation timed out. Your answer has been recorded.',
      specificSuggestion: 'Ensure your answer is specific and relates to your filed documents.',
      documentReference: null,
    } satisfies AnswerEvaluation);
  } finally {
    clearTimeout(timeout);
  }
}
