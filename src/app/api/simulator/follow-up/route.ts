import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SimulatorContext, AnswerEvaluation } from '@/types/simulator';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface FollowUpRequest {
  questionId: string;
  questionText: string;
  originalAnswer: string;
  evaluation: AnswerEvaluation;
  context: SimulatorContext;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ followUpQuestion: null }, { status: 200 });
  }

  let body: FollowUpRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { questionText, originalAnswer, evaluation, context } = body;

  if (!questionText || !originalAnswer || !evaluation || !context) {
    return NextResponse.json({ followUpQuestion: null });
  }

  const businessLine = context.operatingName
    ? `${context.businessName} (operating as "${context.operatingName}")`
    : context.businessName;

  const weaknessSummary = evaluation.specificSuggestion
    ? `${evaluation.feedback} — ${evaluation.specificSuggestion}`
    : evaluation.feedback;

  const prompt = `You are a U.S. consular officer interviewing an E-2 visa applicant.

Applicant: ${context.investorRole || 'investor'} for ${businessLine} (${context.businessCategory})${context.targetState ? `, applying in ${context.targetState}` : ''}
Investment: $${context.investmentAmount.toLocaleString()}

You asked: "${questionText}"

The applicant answered: "${originalAnswer}"

Your assessment: ${evaluation.rating.toUpperCase()} — ${weaknessSummary}

Generate exactly ONE targeted follow-up question to probe the specific weakness or inconsistency in their answer. Make it direct, specific to what they said, and realistic for a consulate interview. One sentence only. Output the question and nothing else.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            content: 'You are a U.S. consular officer. Generate a single, direct follow-up question that probes the weakness in the applicant\'s answer. Output only the question — no preamble, no explanation, no quotation marks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 80,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json({ followUpQuestion: null });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? null;

    // Strip any wrapping quotes the model may have added
    const followUpQuestion = raw
      ? raw.replace(/^["']|["']$/g, '').trim()
      : null;

    return NextResponse.json({ followUpQuestion });
  } catch {
    return NextResponse.json({ followUpQuestion: null });
  } finally {
    clearTimeout(timeout);
  }
}
