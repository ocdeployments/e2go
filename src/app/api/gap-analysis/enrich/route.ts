import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLM } from '@/lib/llm-client';

interface EnrichRequest {
  categoryId: string;
  categoryName: string;
  gaps: string[];
  evidence: string[];
  score: number;
  businessName?: string;
  businessCategory?: string;
  investmentAmount?: number;
  operationalStatus?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'LLM not configured' }, { status: 503 });
  }

  let body: EnrichRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { categoryId, categoryName, gaps, evidence, score, businessName, businessCategory, investmentAmount, operationalStatus } = body;

  if (!categoryId || !categoryName) {
    return NextResponse.json({ error: 'Missing categoryId or categoryName' }, { status: 400 });
  }

  const businessContext = [
    businessName && `Business: ${businessName}`,
    businessCategory && `Type: ${businessCategory}`,
    investmentAmount && `Investment: $${investmentAmount.toLocaleString()}`,
    operationalStatus && `Status: ${operationalStatus}`,
  ].filter(Boolean).join('. ');

  const gapsList = gaps.length > 0 ? gaps.map(g => `- ${g}`).join('\n') : '- No specific gaps identified';
  const evidenceList = evidence.length > 0 ? evidence.map(e => `- ${e}`).join('\n') : '- No evidence filed yet';

  const prompt = `You are an E-2 visa application advisor reviewing a gap analysis result.

Category under review: ${categoryName}
Current score: ${score}/100
${businessContext ? `Applicant profile: ${businessContext}` : ''}

What the applicant has filed so far:
${evidenceList}

What is missing or weak:
${gapsList}

Write exactly 3 sentences:
1. Why this category matters specifically for E-2 approval (not generic immigration — specific to this category)
2. The most critical single gap and why an officer would flag it
3. The most impactful action the applicant can take in the next 7 days to improve this score

Write in second person ("Your..."), plain language, no bullet points, no markdown. Be specific and actionable — not vague.`;

  try {
    const content = await callLLM({
      task: 'evaluate',
      messages: [
        {
          role: 'system',
          content: 'You are a concise E-2 visa preparation advisor. Give specific, actionable guidance in plain language. Never use filler phrases like "it is important to note" or "in conclusion."',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 220,
    });

    return NextResponse.json({
      categoryId,
      enrichment: content?.trim() || null,
    });
  } catch (error) {
    console.error(`[gap-enrich] Failed for category ${categoryId}:`, error);
    return NextResponse.json({ categoryId, enrichment: null });
  }
}
