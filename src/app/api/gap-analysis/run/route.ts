/**
 * POST /api/gap-analysis/run
 *
 * Merged endpoint: runs both LLM jobs triggered on gap-analysis page load
 * in a single round-trip instead of N+1 parallel requests.
 *
 * Replaces concurrent calls to:
 *   /api/gap-analysis/enrich      (N calls, one per weak category)
 *   /api/gap-analysis/semantic-eval (1 call)
 *
 * Returns: { enrichments: Record<categoryId, string|null>, semanticResults: Record<fieldId, ...> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLM } from '@/lib/llm-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeakCategory {
  id: string;
  name: string;
  gaps: string[];
  evidence: string[];
  score: number;
  businessName?: string;
  businessCategory?: string;
  operationalStatus?: string;
}

interface SemanticResult {
  rating: 'strong' | 'adequate' | 'weak' | 'not_filed';
  finding: string;
  risk: 'low' | 'moderate' | 'high';
}

// ── Semantic eval config (mirrors semantic-eval/route.ts) ─────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function enrichCategory(
  cat: WeakCategory
): Promise<{ id: string; enrichment: string | null }> {
  const businessContext = [
    cat.businessName && `Business: ${cat.businessName}`,
    cat.businessCategory && `Type: ${cat.businessCategory}`,
    cat.operationalStatus && `Status: ${cat.operationalStatus}`,
  ].filter(Boolean).join('. ');

  const gapsList = cat.gaps.length > 0 ? cat.gaps.map(g => `- ${g}`).join('\n') : '- No specific gaps identified';
  const evidenceList = cat.evidence.length > 0 ? cat.evidence.map(e => `- ${e}`).join('\n') : '- No evidence filed yet';

  const prompt = `You are an E-2 visa application advisor reviewing a gap analysis result.

Category under review: ${cat.name}
Current score: ${cat.score}/100
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
        { role: 'system', content: 'You are a concise E-2 visa preparation advisor. Give specific, actionable guidance in plain language. Never use filler phrases like "it is important to note" or "in conclusion."' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 220,
    });
    return { id: cat.id, enrichment: content?.trim() || null };
  } catch {
    return { id: cat.id, enrichment: null };
  }
}

async function runSemanticEval(
  applicationId: string,
  businessName: string | null
): Promise<Record<string, SemanticResult | null>> {
  const serviceSupabase = getServiceSupabase();

  const { data: answers } = await serviceSupabase
    .from('answers')
    .select('question_key, answer_value')
    .eq('application_id', applicationId);

  const answerMap: Record<string, string> = {};
  for (const row of answers ?? []) {
    if (row.answer_value) answerMap[row.question_key] = String(row.answer_value);
  }

  const results: Record<string, SemanticResult | null> = {};

  await Promise.all(
    Object.entries(SEMANTIC_FIELDS).map(async ([fieldId, fieldDef]) => {
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
Business: ${businessName || 'Not specified'}

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
        } else {
          results[fieldId] = null;
        }
      } catch {
        results[fieldId] = null;
      }
    })
  );

  return results;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'gap-analysis-run');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before running another analysis.' },
      { status: 429, headers: { 'Retry-After': String(rl.reset) } }
    );
  }

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ enrichments: {}, semanticResults: {} });
  }

  let body: { applicationId: string; weakCategories: WeakCategory[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { applicationId, weakCategories } = body;
  if (!applicationId) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
  }

  // Verify ownership
  const serviceSupabase = getServiceSupabase();
  const { data: app } = await serviceSupabase
    .from('applications')
    .select('user_id, business_name')
    .eq('id', applicationId)
    .single();

  if (!app || app.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fire enrichment + semantic eval in parallel
  const [enrichmentResults, semanticResults] = await Promise.all([
    weakCategories?.length > 0
      ? Promise.all(weakCategories.map(enrichCategory))
      : Promise.resolve([]),
    runSemanticEval(applicationId, app.business_name ?? null),
  ]);

  const enrichments: Record<string, string | null> = {};
  for (const { id, enrichment } of enrichmentResults) {
    enrichments[id] = enrichment;
  }

  return NextResponse.json({ enrichments, semanticResults });
}
