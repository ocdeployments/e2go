import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { callLLM } from '@/lib/llm-client';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// The 3 critical fields — answer keys mapped to evaluation criteria
const SEMANTIC_FIELDS: Record<string, {
  label: string;
  answerKeys: string[];
  officerQuestion: string;
  failSignals: string[];
}> = {
  projection_basis: {
    label: 'Revenue projection basis',
    answerKeys: ['M3-I-BASIS', 'M3-I-01', 'QI-01', 'M3-B-PROJ'],
    officerQuestion: 'What is the basis for these financial projections? Are they grounded in real data?',
    failSignals: ['round numbers with no basis', 'no market data cited', 'projections not explained', 'generic revenue targets'],
  },
  management_activities: {
    label: 'Applicant management activities',
    answerKeys: ['M3-S1-03', 'M3-Q-04', 'M3-A-MGMT', 'QA-09'],
    officerQuestion: 'What will this investor actually do every day? Do they have hands-on management control?',
    failSignals: ['vague role description', 'no specific activities', 'sounds like passive investor', 'no mention of daily duties'],
  },
  source_of_funds: {
    label: 'Source of funds narrative',
    answerKeys: ['M3-H-NEW-01', 'M3-H-FUNDS-DETAIL', 'M3-S1-FUNDS', 'QH-01'],
    officerQuestion: 'Where did this money come from? Is there a complete, credible paper trail from origin to US investment?',
    failSignals: ['no origin story', 'missing chain of transfers', 'unexplained cash', 'no documentation plan'],
  },
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ results: {} });
  }

  let body: { applicationId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { applicationId } = body;
  if (!applicationId) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
  }

  const serviceSupabase = getServiceSupabase();

  // Verify ownership
  const { data: app } = await serviceSupabase
    .from('applications')
    .select('user_id, business_name, business_category')
    .eq('id', applicationId)
    .single();

  if (!app || app.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch all answers
  const { data: answers } = await serviceSupabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId);

  const answerMap: Record<string, string> = {};
  for (const row of answers || []) {
    if (row.answer_value) answerMap[row.question_key] = String(row.answer_value);
  }

  // Evaluate each of the 3 critical fields in parallel
  const results: Record<string, { rating: string; finding: string; risk: 'low' | 'moderate' | 'high' } | null> = {};

  await Promise.all(
    Object.entries(SEMANTIC_FIELDS).map(async ([fieldId, fieldDef]) => {
      // Find the first answer key that has content
      const content = fieldDef.answerKeys
        .map(k => answerMap[k])
        .filter(Boolean)
        .join(' ')
        .trim();

      if (!content || content.split(/\s+/).length < 20) {
        results[fieldId] = {
          rating: 'not_filed',
          finding: `${fieldDef.label} has not been filled in yet. This is one of the 3 fields officers scrutinise most closely.`,
          risk: 'high',
        };
        return;
      }

      const prompt = `You are an E-2 visa reviewing officer evaluating a specific field in an application.

Field: ${fieldDef.label}
Business: ${app.business_name || 'Not specified'} (${app.business_category || 'category not specified'})

The officer question this field must answer: "${fieldDef.officerQuestion}"

Applicant wrote:
"${content.substring(0, 600)}"

Common fail signals for this field: ${fieldDef.failSignals.join(', ')}

Rate this content on one scale: "strong", "adequate", or "weak".
Strong: directly answers the officer question with specific, verifiable facts.
Adequate: partially answers but lacks specificity or completeness.
Weak: misses the officer question, is vague, or triggers fail signals.

Reply ONLY with valid JSON: {"rating":"strong"|"adequate"|"weak","finding":"One specific sentence about what works or what the officer will question. Name the actual issue.","risk":"low"|"moderate"|"high"}`;

      try {
        const result = await callLLM({
          task: 'evaluate',
          messages: [
            { role: 'system', content: 'You are an E-2 visa reviewing officer. Reply only with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 100,
        });

        const jsonMatch = result?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          results[fieldId] = {
            rating: parsed.rating || 'adequate',
            finding: parsed.finding || null,
            risk: parsed.risk || 'moderate',
          };
        }
      } catch {
        results[fieldId] = null;
      }
    })
  );

  return NextResponse.json({ results });
}
