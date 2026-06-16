import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SimulatorContext, QuestionCoaching } from '@/types/simulator';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface WeakAnswer {
  questionId: string;
  questionText: string;
  originalAnswer: string;
  rating: 'weak' | 'inconsistent';
  currentFeedback: string;
}

interface CoachingReportRequest {
  context: SimulatorContext;
  weakAnswers: WeakAnswer[];
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ coaching: [] }, { status: 200 });
  }

  let body: CoachingReportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { context, weakAnswers } = body;

  if (!context || !weakAnswers || weakAnswers.length === 0) {
    return NextResponse.json({ coaching: [] });
  }

  const businessLine = context.operatingName
    ? `${context.businessName} (operating as "${context.operatingName}")`
    : context.businessName;

  // Build the Q&A block
  const qaBlock = weakAnswers.map((a, i) =>
    `--- Question ${i + 1} [${a.questionId}] (${a.rating.toUpperCase()}) ---
Question: ${a.questionText}
Applicant answered: "${a.originalAnswer}"
Initial assessment: ${a.currentFeedback}`
  ).join('\n\n');

  const prompt = `You are an elite E-2 visa preparation coach with 20 years of experience preparing investors for U.S. consulate interviews. You have reviewed thousands of cases and know exactly what officers are looking for.

Applicant profile:
- Business: ${businessLine} (${context.businessCategory})${context.targetState ? ` in ${context.targetState}` : ''}
- Investment: $${context.investmentAmount.toLocaleString()}
- Operational status: ${context.operationalStatus}
- Year 1 revenue projection: $${context.revenueYear1.toLocaleString()}
- Employees: ${context.employeeCountCurrent} current, ${context.employeeCountYear1} planned by Year 1
- Investor role: ${context.investorRole || 'Active manager/director'}
- Prior visa denial: ${context.priorVisaDenial ? 'Yes — this is a re-application, officer will be watching for changes' : 'No'}

The following questions received WEAK or INCONSISTENT ratings during a mock interview. For each one, produce a detailed coaching analysis.

${qaBlock}

For EACH question above, return a coaching object in this JSON array. Be specific, expert, and actionable — this is a preparation document the client will study before their real interview.

Return ONLY a JSON array (no prose, no markdown):
[
  {
    "questionId": "<the question ID from above>",
    "whatOfficerExpected": "2-3 sentences: what a well-prepared applicant says on this question, and the specific signals an officer is looking for to approve an E-2",
    "whatWasMissing": "2 sentences: the precise gap between what the applicant said and what the officer needed to hear, and why this creates a risk of denial",
    "keyPoints": ["3-5 specific bullet points the applicant should make in their revised answer — concrete, factual, tied to their specific business profile"],
    "modelAnswer": "A 3-4 sentence example of what a strong answer sounds like for THIS specific applicant, incorporating their actual business details. Write it in first-person as if the applicant is speaking. This is a guide to the structure and level of detail expected — not a script to memorize.",
    "documentReference": "The most relevant document tab or exhibit the applicant should reference or have ready (e.g. 'Tab B - Business Plan, Section 3' or 'Tab D - Investment Evidence, bank wire records') — or null if no specific document applies"
  }
]`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  console.log(`[coaching-report] Requesting deep coaching for ${weakAnswers.length} weak/inconsistent answers`);

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
        model: 'xiaomi/mimo-v2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an elite E-2 visa preparation coach. Produce specific, expert coaching that tells the client exactly what to say and why. Return only valid JSON arrays — no markdown, no prose.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2400,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[coaching-report] OpenRouter HTTP ${response.status}`);
      return NextResponse.json({ coaching: [] });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: QuestionCoaching[] = JSON.parse(jsonMatch[0]);
        console.log(`[coaching-report] Generated coaching for ${parsed.length} questions`);
        return NextResponse.json({ coaching: parsed });
      }
    } catch (parseError) {
      console.error('[coaching-report] JSON parse failed:', content.substring(0, 300), parseError);
    }

    return NextResponse.json({ coaching: [] });
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    console.error(`[coaching-report] ${isAbort ? 'TIMED OUT' : 'FAILED'}:`, error);
    return NextResponse.json({ coaching: [] });
  } finally {
    clearTimeout(timeout);
  }
}
