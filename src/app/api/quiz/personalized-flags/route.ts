import { NextRequest, NextResponse } from 'next/server';
import flagExplanations from '@/data/flag_explanations.json';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Simple IP-based rate limit (in-memory, per-cold-start — acceptable for this low-volume route)
const recentRequests = new Map<string, number>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const last = recentRequests.get(ip);
  // 1 personalization per IP per 2 minutes
  if (last && now - last < 2 * 60 * 1000) return false;
  recentRequests.set(ip, now);
  return true;
}

interface FlagEntry {
  question_id: string;
  plain_language: string;
  why_it_matters: string;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ explanations: {} }, { status: 429 });
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ explanations: {} });
  }

  let body: { flags: string[]; answers: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { flags, answers } = body;
  if (!flags?.length || !answers) {
    return NextResponse.json({ explanations: {} });
  }

  const allExplanations = flagExplanations as Record<string, FlagEntry>;

  // Build only flags that have a static entry
  const relevantFlags = flags
    .map(code => ({ code, entry: allExplanations[code] }))
    .filter(f => f.entry);

  if (relevantFlags.length === 0) {
    return NextResponse.json({ explanations: {} });
  }

  // Build one batch prompt — all flags in a single call
  const flagBlocks = relevantFlags.map(({ code, entry }) => {
    const applicantAnswer = answers[entry.question_id];
    const answerText = applicantAnswer != null
      ? (Array.isArray(applicantAnswer) ? (applicantAnswer as string[]).join(', ') : String(applicantAnswer))
      : '(not provided)';

    return `FLAG: ${code}
Headline: ${entry.plain_language}
Standard explanation: ${entry.why_it_matters}
Applicant's answer for this flag (${entry.question_id}): "${answerText}"`;
  }).join('\n\n');

  // Include broader context answers for richer personalisation
  const investmentAmt = answers['Q0-07'] ?? answers['investment_amount'] ?? '';
  const country = answers['Q0-01'] ?? answers['country'] ?? '';
  const businessType = answers['Q0-business-type'] ?? answers['business_type'] ?? '';

  const prompt = `You are an E-2 visa eligibility advisor. A prospective applicant has completed an eligibility quiz and triggered several risk flags. For each flag below, write a personalized 2-sentence "why it matters" explanation that references their specific answers, not generic advice.

Applicant context:
- Country: ${country}
- Business type: ${businessType}
- Investment amount: $${investmentAmt}

FLAGS TO PERSONALIZE:
${flagBlocks}

Return ONLY a valid JSON object mapping each FLAG code to a personalized 2-sentence explanation. Use the applicant's actual details. Be specific and direct. Example:
{
  "FLAG_CODE": "Your specific situation means X. The key step for you is Y."
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://e2go.app',
        'X-Title': 'e2go Quiz Results',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2.5',
        messages: [
          {
            role: 'system',
            content: 'You are an E-2 visa eligibility advisor. Return only valid JSON — no markdown, no prose.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return NextResponse.json({ explanations: {} });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ explanations: parsed });
    }
  } catch {
    // Non-fatal — caller falls back to static text
  }

  return NextResponse.json({ explanations: {} });
}
