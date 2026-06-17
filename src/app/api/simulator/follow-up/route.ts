import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callLLM } from '@/lib/llm-client';
import type { SimulatorContext, AnswerEvaluation } from '@/types/simulator';

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

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
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
    const raw = await callLLM({
      task: 'evaluate',
      messages: [
        {
          role: 'system',
          content: "You are a U.S. consular officer. Generate a single, direct follow-up question that probes the weakness in the applicant's answer. Output only the question — no preamble, no explanation, no quotation marks.",
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 80,
      signal: controller.signal,
    });

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
