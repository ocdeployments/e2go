import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callLLM } from '@/lib/llm-client';

// Fields that warrant quality checks — key maps to a short officer-perspective description
const FIELD_CRITERIA: Record<string, { topic: string; minWords: number; requirements: string }> = {
  // Story section
  'M3-S1-01': { topic: 'investor career background', minWords: 60, requirements: 'specific roles and industries, skills directly relevant to managing this business type, and years of relevant experience' },
  'M3-S1-02': { topic: 'investment motivation', minWords: 40, requirements: 'genuine personal motivation, connection to the specific business or industry, and why the US specifically' },
  'M3-S1-03': { topic: 'management capability statement', minWords: 60, requirements: 'concrete examples of prior management experience, what was managed, how many people, and how this applies to the E-2 business' },
  // Qualifications section
  'M3-Q-04':  { topic: 'professional background summary', minWords: 50, requirements: 'education, specific work history, management experience, and skills relevant to this business category' },
  // Business section
  'M3-B-MKT': { topic: 'market analysis', minWords: 60, requirements: 'target customer profile, local market size, competition assessment, and evidence the business can succeed in this location' },
  'M3-B-OPS': { topic: 'business operations plan', minWords: 50, requirements: 'day-to-day operations, supplier relationships, service delivery, and how the investor will manage these activities personally' },
  // Investment / source of funds section
  'M3-H-NEW-01': { topic: 'source of funds narrative', minWords: 40, requirements: 'origin of the capital, how long it was accumulated, and confirmation it is legally available for the E-2 investment' },
  // Ties section
  'M3-K-TIES':   { topic: 'ties to home country', minWords: 40, requirements: 'property, family obligations, financial commitments, or business interests that demonstrate genuine intent to return' },
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ quality: 'unknown', feedback: null });
  }

  let body: { fieldKey: string; value: string; businessType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { fieldKey, value, businessType } = body;
  const criteria = FIELD_CRITERIA[fieldKey];

  if (!criteria || !value?.trim()) {
    return NextResponse.json({ quality: 'unknown', feedback: null });
  }

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  // Quick length gate — no LLM needed
  if (wordCount < criteria.minWords) {
    return NextResponse.json({
      quality: 'too_short',
      wordCount,
      feedback: `This field needs more detail (${wordCount} words — aim for at least ${criteria.minWords}). An officer reading this will want to see ${criteria.requirements}.`,
    });
  }

  // LLM quality assessment
  const prompt = `You are reviewing a field in an E-2 visa application case file.

Field: ${criteria.topic}
${businessType ? `Business type: ${businessType}` : ''}

Applicant wrote (${wordCount} words):
"${value.trim().substring(0, 800)}"

Rate this field on a single scale: "strong", "adequate", or "needs_work".

Strong: covers all required elements (${criteria.requirements}) with specific facts, numbers, or concrete details.
Adequate: covers most required elements but lacks specificity or is generic.
Needs_work: missing one or more required elements, or so vague an officer would follow up.

Reply with ONLY valid JSON: {"quality":"strong"|"adequate"|"needs_work","feedback":"One sentence: what is missing or what makes this strong. Be specific — name the actual gap or the strongest element. Do not repeat the rating."}`;

  try {
    const content = await callLLM({
      task: 'evaluate',
      messages: [
        { role: 'system', content: 'You are a concise E-2 visa application reviewer. Reply only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 120,
    });

    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        quality: parsed.quality || 'adequate',
        wordCount,
        feedback: parsed.feedback || null,
      });
    }
  } catch (error) {
    console.error('[field-quality] LLM failed:', error);
  }

  return NextResponse.json({ quality: 'adequate', wordCount, feedback: null });
}
