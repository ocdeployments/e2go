import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SimulatorContext, AnswerEvaluation } from '@/types/simulator';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface EvaluateRequest {
  questionId: string;
  questionText: string;
  answer: string;
  context: SimulatorContext;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!OPENROUTER_API_KEY) {
    console.error('[simulator-evaluate] OPENROUTER_API_KEY not configured');
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

  const { questionId, questionText, answer, context } = body;

  if (!questionId || !questionText || !answer || !context) {
    return NextResponse.json(
      { error: 'Missing required fields: questionId, questionText, answer, context' },
      { status: 400 }
    );
  }

  // Build the evaluation prompt
  const prompt = `You are a U.S. consular officer evaluating an E-2 visa interview answer.
The applicant's profile:
- Business: ${context.businessName} (${context.businessCategory}) in ${context.targetState}
- Investment: $${context.investmentAmount.toLocaleString()}
- Operational status: ${context.operationalStatus}
- Year 1 revenue projection: $${context.revenueYear1.toLocaleString()}
- Employees: ${context.employeeCountCurrent} current, ${context.employeeCountYear1} planned
- Prior visa denial: ${context.priorVisaDenial ? 'Yes' : 'No'}

The question asked was: "${questionText}"

The applicant's live answer was: "${answer}"

Evaluate this answer and return your assessment in JSON format:
{
  "rating": "strong" | "weak" | "inconsistent",
  "feedback": "A brief paragraph explaining your rating",
  "specificSuggestion": "If rating is weak or inconsistent, what specific improvement is needed?",
  "documentReference": "Which document(s) in their filed application should they reference? (e.g., 'Cover Letter', 'Business Plan', 'Tab F - Investment Proof')"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://e2go.app',
        'X-Title': 'E2go Interview Simulator',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2.5',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced U.S. consular officer evaluating E-2 visa interview answers. Be strict but fair. Focus on whether the answer addresses what a real officer would want to hear, and whether it is consistent with the filed application documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[simulator-evaluate] OpenRouter HTTP ${response.status} for question ${questionId}:`, errorBody);
      return NextResponse.json({
        rating: 'weak',
        feedback: `Evaluation service error (HTTP ${response.status}). Please provide more detail about your experience and qualifications.`,
        specificSuggestion: 'Include specific examples of your experience and how it relates to running this business.',
        documentReference: 'Tab J - Qualifications',
      } satisfies AnswerEvaluation);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          rating: parsed.rating || 'weak',
          feedback: parsed.feedback || 'Evaluation complete.',
          specificSuggestion: parsed.specificSuggestion || '',
          documentReference: parsed.documentReference || null,
        } satisfies AnswerEvaluation);
      }
    } catch (parseError) {
      console.error(`[simulator-evaluate] JSON parse failed for question ${questionId}. Raw content:`, content.substring(0, 500), parseError);
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      rating: 'weak',
      feedback: content.substring(0, 200) || 'Answer recorded.',
      specificSuggestion: 'Provide more specific details about your business and experience.',
      documentReference: null,
    } satisfies AnswerEvaluation);

  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    console.error(`[simulator-evaluate] Evaluation ${isAbort ? 'timed out' : 'failed'} for question ${questionId}:`, error);
    return NextResponse.json({
      rating: 'weak',
      feedback: isAbort
        ? 'Evaluation timed out. Please try again.'
        : 'There was an error evaluating your answer. Please try again.',
      specificSuggestion: 'Ensure your answer is specific and relates to your filed documents.',
      documentReference: null,
    } satisfies AnswerEvaluation);
  } finally {
    clearTimeout(timeout);
  }
}
