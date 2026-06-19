import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import Anthropic from '@anthropic-ai/sdk';
import type { FddExtractedFields, FddFinalReport } from '@/types/fdd';

const anthropic = new Anthropic();

// POST /api/fdd/report
// Body: { fdd_id: string }
// Generates final report + writes platform integration keys
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fdd_id } = await request.json() as { fdd_id: string };
    if (!fdd_id) return NextResponse.json({ error: 'fdd_id required' }, { status: 400 });

    const service = createServiceClient();
    const { data: analysis, error: fetchErr } = await service
      .from('fdd_analyses')
      .select('*')
      .eq('id', fdd_id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: 'FDD analysis not found' }, { status: 404 });
    }

    if (!analysis.extracted_fields || !analysis.e2_score) {
      return NextResponse.json({ error: 'E-2 scoring must complete before generating the report' }, { status: 422 });
    }

    const fields = analysis.extracted_fields as FddExtractedFields;
    const e2Score = analysis.e2_score as Record<string, unknown>;
    const territoryData = analysis.territory_analysis as Record<string, unknown> | null;
    const questionsData = analysis.questions as Record<string, unknown> | null;

    // Build final report via LLM
    const report = await generateFinalReport(fields, e2Score, territoryData, questionsData, analysis);

    // Write platform integration keys to the user's most recent application
    await writePlatformIntegration(service, user.id, fields, e2Score, territoryData, analysis);

    // Persist
    const { error: updateErr } = await service
      .from('fdd_analyses')
      .update({
        final_report: report,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fdd_id);

    if (updateErr) {
      console.error('Report persist error:', updateErr);
    }

    return NextResponse.json({ final_report: report });
  } catch (err) {
    console.error('Report route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report generation failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Final report generation
// ============================================================================

async function generateFinalReport(
  fields: FddExtractedFields,
  e2Score: Record<string, unknown>,
  territory: Record<string, unknown> | null,
  questions: Record<string, unknown> | null,
  analysis: Record<string, unknown>
): Promise<FddFinalReport> {
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? 'the franchise';
  const overall = e2Score.overall as string;
  const flags = (e2Score.flags as string[]) ?? [];
  const narrative = e2Score.narrative as Record<string, string> | undefined;

  const totalMin = fields.total_investment_min?.value as number | null;
  const totalMax = fields.total_investment_max?.value as number | null;
  const auv = (fields.item19_median?.value ?? fields.item19_auv?.value) as number | null;
  const royalty = fields.royalty_rate_pct?.value as number | null;
  const targetCity = analysis.target_city as string | null;
  const targetState = analysis.target_state as string | null;

  const territoryRating = territory?.overall_rating as string | null;
  const territoryScore = territory?.overall_score as number | null;

  const priorityQCount = (questions?.priority_questions as unknown[])?.length ?? 0;
  const totalQCount = (questions?.questions as unknown[])?.length ?? 0;

  const prompt = `You are a senior franchise development director and immigration attorney. Write a final investment analysis report for a client considering the ${franchiseName} franchise for their E-2 visa application.

CONTEXT:
- Franchise: ${franchiseName}
- Location: ${targetCity ? `${targetCity}, ` : ''}${targetState ?? 'US'}
- Investment range: ${totalMin ? `$${totalMin.toLocaleString()}–$${totalMax?.toLocaleString()}` : 'Not confirmed'}
- Median AUV: ${auv ? `$${auv.toLocaleString()}` : 'Not disclosed (no Item 19)'}
- Royalty rate: ${royalty !== null ? `${(royalty * 100).toFixed(1)}%` : 'Unconfirmed'}
- E-2 compatibility: ${overall}
- Territory rating: ${territoryRating ?? 'Not analysed'}${territoryScore ? ` (${territoryScore}/100)` : ''}
- Flags raised: ${flags.length > 0 ? flags.join('; ') : 'None'}
- Questions generated: ${totalQCount} total, ${priorityQCount} critical
${narrative?.OVERALL_VERDICT ? `\nScoring note: ${narrative.OVERALL_VERDICT}` : ''}

Write the following sections. Be direct, specific, and grounded in the data. No generic phrases.

EXECUTIVE_SUMMARY: 2–3 sentences summarising the overall investment picture for this franchise in this location for an E-2 investor. State the overall rating explicitly.

KEY_STRENGTHS: Exactly 3 bullet points (as a list, each starting with "•"). Each strength must reference a specific data point.

KEY_CONCERNS: Exactly 3 bullet points (each starting with "•"). Each concern must be specific and actionable. If there are no flags, identify 3 standard risks the investor should still investigate.

FINANCIAL_PICTURE: 2–3 sentences on the financial model: investment size, AUV/revenue expectations, royalty burden, and what the income model looks like before and after fees.

MARKET_VERDICT: 1–2 sentences on the territory analysis outcome and what it means for this franchise's success in this market.

RECOMMENDED_NEXT_STEPS: Exactly 4 steps the investor should take, in order of priority. Each step should be 1 sentence and concrete (e.g. "Request the Item 20 franchisee contact list and call 10 current franchisees in markets with ≤50,000 population").

Return as JSON:
{"EXECUTIVE_SUMMARY":"...","KEY_STRENGTHS":["•...","•...","•..."],"KEY_CONCERNS":["•...","•...","•..."],"FINANCIAL_PICTURE":"...","MARKET_VERDICT":"...","RECOMMENDED_NEXT_STEPS":["1...","2...","3...","4..."]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const raw = JSON.parse(match[0]) as Record<string, string | string[]>;
      return {
        executive_summary: raw.EXECUTIVE_SUMMARY as string ?? '',
        key_strengths: (raw.KEY_STRENGTHS as string[]) ?? [],
        key_concerns: (raw.KEY_CONCERNS as string[]) ?? [],
        financial_picture: raw.FINANCIAL_PICTURE as string ?? '',
        market_verdict: raw.MARKET_VERDICT as string ?? `Territory rating: ${territoryRating ?? 'not analysed'}`,
        recommended_next_steps: (raw.RECOMMENDED_NEXT_STEPS as string[]) ?? [],
      };
    }
  } catch (err) {
    console.error('Final report LLM error:', err);
  }

  // Fallback
  return {
    executive_summary: `This ${franchiseName} FDD analysis rates the E-2 compatibility as ${overall}. ${flags.length} flags were identified during review.`,
    key_strengths: ['• Complete FDD extraction and analysis', '• Territory data reviewed', '• Due diligence questions generated'],
    key_concerns: flags.slice(0, 3).map(f => `• ${f}`) || ['• Request updated FDD if over 12 months old', '• Confirm state registration before proceeding', '• Validate Item 19 with franchisee calls'],
    financial_picture: `Investment range: ${totalMin ? `$${totalMin.toLocaleString()}–$${totalMax?.toLocaleString()}` : 'unconfirmed'}. ${auv ? `Median AUV $${auv.toLocaleString()}.` : 'No financial performance data disclosed.'}`,
    market_verdict: territoryRating ? `Territory rated ${territoryRating} (${territoryScore}/100).` : 'Territory analysis not completed.',
    recommended_next_steps: [
      'Share this report with a licensed immigration attorney before signing',
      'Contact 10 current franchisees using the Item 20 contact list',
      'Address all critical questions with the franchisor development representative',
      'Obtain the current year FDD and have your attorney review any state addendum',
    ],
  };
}

// ============================================================================
// Platform integration — write FDD findings to the user's case profile
// ============================================================================

async function writePlatformIntegration(
  service: ReturnType<typeof import('@/lib/supabase-service').createServiceClient>,
  userId: string,
  fields: FddExtractedFields,
  e2Score: Record<string, unknown>,
  territory: Record<string, unknown> | null,
  analysis: Record<string, unknown>
): Promise<void> {
  // Find the user's most recent application
  const { data: app } = await service
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!app?.id) return;

  // Build answer key/value pairs from FDD intelligence
  const answerUpdates: Array<{ key: string; value: string }> = [];

  // Business name
  const franchiseName = fields.franchisor_legal_name?.value as string | null;
  if (franchiseName) {
    answerUpdates.push({ key: 'QA-NEW-04', value: franchiseName }); // business name
  }

  // Investment amount — use Item 7 total_investment_min as baseline
  const investMin = fields.total_investment_min?.value as number | null;
  if (investMin) {
    answerUpdates.push({ key: 'QF-NEW-01', value: String(investMin) }); // investment amount
  }

  // Total employees (opening day)
  const openingEmployees = fields.opening_day_employees?.value as number | null;
  const fteEmployees = fields.typical_fte_employees?.value as number | null;
  const empCount = openingEmployees ?? fteEmployees;
  if (empCount) {
    answerUpdates.push({ key: 'QA-NEW-09', value: String(empCount) }); // year 1 employees
  }

  // Territory / location type
  const territoryType = fields.territory_type?.value as string | null;
  if (territoryType) {
    answerUpdates.push({ key: 'QA-NEW-12', value: territoryType }); // territory type
  }

  // Business sector — use franchise category from territory analysis
  const category = territory?.franchise_category as string | null;
  if (category) {
    answerUpdates.push({ key: 'QA-NEW-03', value: category }); // business industry
  }

  // Target state
  const targetState = analysis.target_state as string | null;
  if (targetState) {
    answerUpdates.push({ key: 'QA-NEW-11', value: targetState }); // target state
  }

  // E-2 compatibility result
  const compatibility = e2Score.overall as string | null;
  if (compatibility) {
    answerUpdates.push({ key: 'QA-FDD-COMPAT', value: compatibility }); // FDD compatibility outcome
  }

  // Flag count
  const flagCount = (e2Score.flags as string[])?.length ?? 0;
  answerUpdates.push({ key: 'QA-FDD-FLAGS', value: String(flagCount) });

  // Upsert each answer key
  for (const { key, value } of answerUpdates) {
    await service
      .from('answers')
      .upsert(
        {
          application_id: app.id,
          question_key: key,
          answer: value,
          source: 'fdd_intelligence',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,question_key' }
      )
      .then(({ error }) => {
        if (error) console.warn(`Answer upsert failed for ${key}:`, error.message);
      });
  }
}
