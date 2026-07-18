import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getQuestionKnowledge, buildKnowledgeBlock } from '@/lib/interview-knowledge-base';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLM } from '@/lib/llm-client';
import type { SimulatorContext, QuestionCoaching } from '@/types/simulator';
import { captureApiError } from '@/lib/capture-error';

interface WeakAnswer {
  questionId: string;
  questionText: string;
  originalAnswer: string;
  rating: 'weak' | 'inconsistent';
  currentFeedback: string;
  deliveryNotes?: { type: string; detail: string }[];
}

interface PriorSession {
  sessionNumber: number;
  readinessIndicator: string;
  top3NextSession: string[];
}

interface CoachingReportRequest {
  context: SimulatorContext;
  weakAnswers: WeakAnswer[];
  priorSession?: PriorSession | null;
  priorSessions?: PriorSession[];
}

function buildInvestmentSourcesBlock(context: SimulatorContext): string {
  if (!context.investmentSources || context.investmentSources.length === 0) return '';
  const lines = context.investmentSources.map(
    (s) => `  - ${s.sourceType}: $${s.amount.toLocaleString()} — ${s.description}`
  );
  return `Investment sources on file:\n${lines.join('\n')}`;
}

function buildFundFlowBlock(context: SimulatorContext): string {
  if (!context.fundFlowEvents || context.fundFlowEvents.length === 0) return '';
  const lines = context.fundFlowEvents.map(
    (e) => `  - ${e.date}: $${e.amount.toLocaleString()} from ${e.fromAccount} → ${e.toAccount} (${e.description})`
  );
  return `Fund flow chronology on file:\n${lines.join('\n')}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'coaching');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating another coaching report.' },
      { status: 429, headers: { 'Retry-After': String(rl.reset) } }
    );
  }

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ coaching: [] }, { status: 200 });
  }

  let body: CoachingReportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { context, weakAnswers, priorSessions, priorSession } = body;

  // Normalise: prefer priorSessions array; fall back to legacy single priorSession
  const sessions: PriorSession[] = priorSessions?.length
    ? priorSessions
    : priorSession
    ? [priorSession]
    : [];

  if (!context || !weakAnswers || weakAnswers.length === 0) {
    return NextResponse.json({ coaching: [] });
  }

  const businessLine = context.operatingName
    ? `${context.businessName} (operating as "${context.operatingName}")`
    : context.businessName;

  // Build per-question blocks with gold-standard knowledge injected
  const qaBlock = weakAnswers.map((a, i) => {
    const knowledge = getQuestionKnowledge(a.questionId);
    const knowledgeBlock = knowledge ? `\n\nGOLD-STANDARD FRAMEWORK FOR THIS QUESTION TYPE:\n${buildKnowledgeBlock(knowledge)}` : '';
    const deliveryBlock = (a.deliveryNotes && a.deliveryNotes.length > 0)
      ? `\nDelivery issues in this answer: ${a.deliveryNotes.map(n => n.detail).join('; ')}`
      : '';

    return `--- Question ${i + 1} [ID: ${a.questionId}] (${a.rating.toUpperCase()}) ---
Question: ${a.questionText}
Applicant answered: "${a.originalAnswer}"
Initial assessment: ${a.currentFeedback}${deliveryBlock}${knowledgeBlock}`;
  }).join('\n\n');

  // Case-specific data blocks so model answers use real client facts
  const sourcesBlock = buildInvestmentSourcesBlock(context);
  const fundFlowBlock = buildFundFlowBlock(context);
  const denialFlags = context.denialRiskFlags && context.denialRiskFlags.length > 0
    ? `Known denial risk flags for this case: ${context.denialRiskFlags.join(', ')}`
    : '';

  const priorSessionBlock = sessions.length > 0
    ? (() => {
        const sorted = [...sessions].sort((a, b) => b.sessionNumber - a.sessionNumber);
        const historyLines = sorted.map(s => {
          const readiness = s.readinessIndicator === 'ready' ? 'Interview ready' : 'Needs more preparation';
          const priorities = s.top3NextSession.length > 0
            ? s.top3NextSession.map((item, i) => `    ${i + 1}. ${item}`).join('\n')
            : '    (No priorities recorded)';
          return `  Session ${s.sessionNumber} (${readiness}):\n${priorities}`;
        }).join('\n\n');

        const trendNote = sorted.length >= 2
          ? `\nTREND ANALYSIS: You have data from ${sorted.length} prior sessions. In your top3NextSession synthesis, explicitly note the trajectory — are the same weaknesses recurring (stagnating), or are prior priorities now stronger (improving)? Name the specific pattern.`
          : `\nUse this context to add a brief "Progress since Session ${sorted[0].sessionNumber}" observation at the start of your top3NextSession synthesis.`;

        return `PRIOR SESSION HISTORY (${sorted.length} session${sorted.length > 1 ? 's' : ''}):\n${historyLines}\n${trendNote}\n\n`;
      })()
    : '';

  const prompt = `You are a senior E-2 visa immigration consultant with 20 years of experience at the Toronto consulate. You have just watched your client conduct a mock interview and are now preparing their personal coaching report. You have read their entire case file.
${priorSessionBlock}
APPLICANT CASE PROFILE:
- Business: ${businessLine} (${context.businessCategory})${context.targetState ? ` in ${context.targetState}` : ''}
- Investment amount: $${context.investmentAmount.toLocaleString()} USD
- Operational status: ${context.operationalStatus}
- Year 1 revenue projection: $${context.revenueYear1.toLocaleString()}
- Year 3 revenue projection: $${context.revenueYear3.toLocaleString()}
- Employees: ${context.employeeCountCurrent} current, ${context.employeeCountYear1} projected by Year 1
- Employee roles planned: ${context.employeeRoles?.join(', ') || 'not specified'}
- Investor role: ${context.investorRole || 'Active manager/director'}
- Management activities: ${context.managementActivities?.join('; ') || 'not specified'}
- Household income need: $${context.householdIncomeNeed.toLocaleString()}
- Prior visa denial: ${context.priorVisaDenial ? `Yes — ${context.priorDenialDetails || 'details on file'}` : 'No'}
- Immigrant intent risk level: ${context.immigrantIntentRisk}
${sourcesBlock ? `\n${sourcesBlock}` : ''}${fundFlowBlock ? `\n${fundFlowBlock}` : ''}${denialFlags ? `\n${denialFlags}` : ''}

INTERVIEW PERFORMANCE — QUESTIONS REQUIRING COACHING:
These questions were rated WEAK or INCONSISTENT. Each includes the gold-standard answer framework for that question type, derived from documented consulate experience and 9 FAM 402.9. Use the client's actual case data above to produce model answers that are specific to their situation — not generic templates.

${qaBlock}

YOUR TASK:
For EACH question above, produce a detailed coaching analysis. This is what the client will study before their real consulate interview. Be direct, specific, and expert. Use the client's actual business details, investment amounts, and sources of funds in the model answer — not placeholders.

Severity definitions for each coaching card:
- "fatal": the answer contradicts filed documents or fails a core E-2 criterion (would likely result in refusal)
- "significant": fails an important officer expectation but not fatal to the case
- "cosmetic": adequate content but lacking specificity or confidence

Return ONLY a valid JSON object (no markdown, no prose) with this exact structure:
{
  "coaching": [
    {
      "questionId": "<exact ID from the [ID: ...] tag, e.g. UQ-01>",
      "severity": "fatal"|"significant"|"cosmetic",
      "whatOfficerExpected": "2-3 sentences stating exactly what a well-prepared applicant says for this specific question type, and the specific legal or credibility signal the officer is listening for",
      "whatWasMissing": "2 sentences identifying the precise gap between what this applicant said and what the officer needed to hear — be specific to their answer, not generic",
      "keyPoints": ["3-5 specific points this applicant must make in their answer, using their actual case data — amounts, dates, roles, employee counts from their profile above"],
      "modelAnswer": "3-4 sentences written in first person as if the applicant is speaking. Structure for spoken delivery: short opening sentence, 2-3 supporting points, strong closing. USE THEIR ACTUAL NUMBERS AND FACTS from the case profile — not placeholders. Note at the end: This is the structure — adapt it to your natural voice.",
      "documentReference": "The specific tab and section they should reference or have ready at the interview window, e.g. 'Tab H — Source of Funds chronology, page 3' — or null if no document applies"
    }
  ],
  "top3NextSession": [
    "Action 1: specific, actionable thing to prepare before session N+1 (using their real case data)",
    "Action 2: ...",
    "Action 3: ..."
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  console.log(`[coaching-report] Requesting coaching for ${weakAnswers.length} answers (with fallback chain)`);

  try {
    const content = await callLLM({
      task: 'coaching',
      messages: [
        {
          role: 'system',
          content: "You are a senior E-2 visa immigration consultant producing a personalized coaching report. Every coaching item must reference the client's actual case data — never use placeholders. Return only valid JSON arrays.",
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 6000,
      signal: controller.signal,
      timeoutMs: 90_000,
    });

    if (!content) {
      captureApiError(new Error('[coaching-report] Empty content from all providers'), { route: 'simulator/coaching-report', stage: 'empty-content', userId: user.id });
      return NextResponse.json({ coaching: [], error: true });
    }

    try {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        if (parsed.coaching && Array.isArray(parsed.coaching)) {
          console.log(`[coaching-report] Generated coaching for ${parsed.coaching.length} questions`);
          return NextResponse.json({
            coaching: parsed.coaching as QuestionCoaching[],
            top3NextSession: parsed.top3NextSession || [],
          });
        }
      }
      const arrMatch = content.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        const parsed: QuestionCoaching[] = JSON.parse(arrMatch[0]);
        console.log(`[coaching-report] Generated coaching for ${parsed.length} questions (bare array)`);
        return NextResponse.json({ coaching: parsed });
      }
    } catch (parseError) {
      captureApiError(parseError, { route: 'simulator/coaching-report', stage: 'json-parse-failed', userId: user.id, contentSnippet: content.substring(0, 300) });
      return NextResponse.json({ coaching: [], error: true });
    }

    // Response had content but neither JSON shape matched — treat as a
    // generation failure, not "no coaching needed" (weakAnswers.length > 0
    // was already guaranteed above, so an empty result here means the model
    // didn't return usable output, not that coaching was unnecessary).
    captureApiError(new Error('[coaching-report] Unrecognized response shape'), { route: 'simulator/coaching-report', stage: 'unrecognized-shape', userId: user.id, contentSnippet: content.substring(0, 300) });
    return NextResponse.json({ coaching: [], error: true });
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    captureApiError(error, { route: 'simulator/coaching-report', stage: isAbort ? 'timed-out' : 'failed', userId: user.id });
    return NextResponse.json({ coaching: [], error: true });
  } finally {
    clearTimeout(timeout);
  }
}
