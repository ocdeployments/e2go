import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLM } from '@/lib/llm-client';
import { getBusinessCategoryLabel } from '@/lib/business-categories';
import { scoreCase } from '@/lib/gap-analysis-engine';
import { INTERVIEW_KNOWLEDGE_BASE } from '@/lib/interview-knowledge-base';
import type { GapAnalysisResult } from '@/lib/gap-analysis-engine';

const CONSULATE_LABELS: Record<string, string> = {
  toronto: 'Toronto, Canada',
  london: 'London, UK',
  manila: 'Manila, Philippines',
  seoul: 'Seoul, South Korea',
  mumbai: 'Mumbai, India',
  other: 'Other',
};

const COUNTRY_LABELS: Record<string, string> = {
  canada: 'Canada', united_kingdom: 'United Kingdom', australia: 'Australia',
  japan: 'Japan', south_korea: 'South Korea', germany: 'Germany',
  france: 'France', italy: 'Italy', spain: 'Spain', netherlands: 'Netherlands',
  switzerland: 'Switzerland', sweden: 'Sweden', belgium: 'Belgium',
  norway: 'Norway', denmark: 'Denmark', finland: 'Finland', ireland: 'Ireland',
  austria: 'Austria', poland: 'Poland', czech_republic: 'Czech Republic',
  hungary: 'Hungary', romania: 'Romania', mexico: 'Mexico',
  colombia: 'Colombia', argentina: 'Argentina', chile: 'Chile',
  turkey: 'Turkey', israel: 'Israel', jordan: 'Jordan',
  thailand: 'Thailand', pakistan: 'Pakistan', other: 'Other',
};

const BIZ_TYPE_LABELS: Record<string, string> = {
  new: 'New business (starting from scratch)',
  franchise: 'Franchise (licensed brand)',
  acquisition: 'Acquisition (buying existing business)',
};

// =============================================================================
// EXPORTED TYPES — consumed by InterviewBrief.tsx
// =============================================================================

export interface CategoryScore {
  id: string;
  name: string;
  score: number;
  weight: number;
  priority: 'strong' | 'good' | 'needs_work' | 'critical';
  gaps: string[];
  actions: string[];
  evidence: string[];
}

export interface DenialRisk {
  code: string;
  name: string;
  risk: 'high' | 'moderate' | 'low';
  finding: string;
  mitigation: string | null;
}

export interface GapAction {
  gap: string;
  action: string;
  urgency: 'critical' | 'important' | 'recommended';
  category: string;
}

export interface InterviewBriefData {
  applicationSummary: string;
  overallScore: number;
  readiness: 'strong' | 'moderate' | 'needs_work';
  highlights: string[];
  leadWithThese: string[];
  interviewTopics: {
    topic: string;
    likelihood: 'high' | 'medium' | 'low';
    coachNote: string;
    officerTests?: string;
  }[];
  categoryScores: CategoryScore[];
  denialRisks: DenialRisk[];
  gapActions: GapAction[];
  businessTips: string[];
  pressurePoints: string[];
  highRiskCount: number;
  moderateRiskCount: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function buildGapActions(result: GapAnalysisResult): GapAction[] {
  const seen = new Set<string>();
  const actions: GapAction[] = [];

  for (const f of result.denialFactors.filter(d => d.risk === 'high' && d.mitigation)) {
    const key = f.mitigation!.substring(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      actions.push({ gap: f.name, action: f.mitigation!, urgency: 'critical', category: f.categoryId });
    }
  }

  for (const f of result.denialFactors.filter(d => d.risk === 'moderate' && d.mitigation)) {
    const key = f.mitigation!.substring(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      actions.push({ gap: f.name, action: f.mitigation!, urgency: 'important', category: f.categoryId });
    }
  }

  for (const cat of result.categories.filter(c => c.priority === 'critical' || c.priority === 'needs_work')) {
    for (const action of cat.actions) {
      const key = action.substring(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        actions.push({ gap: cat.name, action, urgency: 'recommended', category: cat.id });
      }
    }
  }

  return actions.slice(0, 12);
}

function buildKnowledgeSummary(
  isFranchise: boolean,
  isTorontoConsulate: boolean,
  highRiskCategoryIds: string[],
): string {
  const relevant = INTERVIEW_KNOWLEDGE_BASE.filter(q => {
    if (q.frequency === 'always') return true;
    if (q.frequency === 'very_common') {
      if (highRiskCategoryIds.includes('source_of_funds') && q.topic.toLowerCase().includes('funds')) return true;
      if (highRiskCategoryIds.includes('business_plan') && q.topic.toLowerCase().includes('revenue')) return true;
      if (highRiskCategoryIds.includes('management_role') && q.topic.toLowerCase().includes('experience')) return true;
    }
    if (isFranchise && (q.topic.toLowerCase().includes('franchise') || q.topic.toLowerCase().includes('due diligence'))) return true;
    return false;
  }).slice(0, 8);

  return relevant.map(q => {
    const lines = [
      `[${q.topic.toUpperCase()}]`,
      `Officer tests: ${q.officerTests}`,
      `Must cover: ${q.keyPrinciples.slice(0, 3).join(' | ')}`,
      `Red flags: ${q.redFlags.slice(0, 2).join(' | ')}`,
    ];
    if (isTorontoConsulate && q.torontoNote) lines.push(`Toronto note: ${q.torontoNote}`);
    return lines.join('\n');
  }).join('\n\n');
}

function buildFallback(
  category: string,
  type: string,
  investment: string,
  country: string,
  gapResult: GapAnalysisResult,
): InterviewBriefData {
  return {
    applicationSummary: `This E-2 application for a ${category.toLowerCase()} venture from ${country} scores ${gapResult.overallScore}/100 overall readiness. The officer will probe ${gapResult.highRiskCount > 0 ? `${gapResult.highRiskCount} identified high-risk area${gapResult.highRiskCount > 1 ? 's' : ''}` : 'investment, source of funds, and management role'} most intensively.`,
    overallScore: gapResult.overallScore,
    readiness: gapResult.readiness,
    highlights: [
      `Treaty-country investor from ${country} — E-2 eligibility confirmed`,
      investment !== 'Not specified' ? `Investment of ${investment} committed to the enterprise` : 'Investment amount should be documented before the interview',
      type === 'franchise' ? 'Franchise model provides a proven, documented operational structure' : type === 'acquisition' ? 'Acquiring an existing business with operating history' : 'New enterprise demonstrating entrepreneurial initiative',
    ],
    leadWithThese: [
      `Citizen of ${country} making a qualifying treaty investment in a ${category.toLowerCase()} business`,
      'Investment is fully committed and at risk — funds are deployed in the enterprise',
      'Will personally develop and direct all business operations',
    ],
    interviewTopics: [
      { topic: 'Investment Amount & Substantiality', likelihood: 'high', coachNote: 'Have the exact figure and breakdown by category. Confirm funds are irrevocably committed and at risk — not in a Canadian account.' },
      { topic: 'Source of Funds — Traceability', likelihood: 'high', coachNote: 'Know every source, amount, and date. Walk the officer through the chronological path: source → Canadian account → US business account.' },
      { topic: 'Your Role — Develop and Direct', likelihood: 'high', coachNote: 'Lead with your operational title (not just "Owner"). Name 3-4 specific daily decisions. Establish you are the operating manager, not a passive investor.' },
      { topic: 'Employment and Hiring Plan', likelihood: 'high', coachNote: 'State Year 1 hires by role, start date, and whether full-time. Non-marginality depends on credible US job creation.' },
      { topic: 'Canadian Ties and Nonimmigrant Intent', likelihood: 'medium', coachNote: 'Prepare specific, verifiable ties: property owned, family remaining, RRSP/pension active, provincial health coverage maintained.' },
    ],
    categoryScores: gapResult.categories.map(c => ({ id: c.id, name: c.name, score: c.score, weight: c.weight, priority: c.priority, gaps: c.gaps, actions: c.actions, evidence: c.evidence })),
    denialRisks: gapResult.denialFactors.filter(f => f.risk !== 'low').map(f => ({ code: f.code, name: f.name, risk: f.risk, finding: f.finding, mitigation: f.mitigation })),
    gapActions: buildGapActions(gapResult),
    businessTips: [
      `Know your ${category} revenue model in detail — the officer may ask about customer acquisition`,
      'Have a clear 12-month plan with milestones, hiring dates, and key expenses',
      'If investment is below $100K, prepare a proportionality argument explaining why it is substantial for this type of business',
    ],
    pressurePoints: [
      gapResult.highRiskCount > 0 ? `${gapResult.highRiskCount} high-risk denial factor${gapResult.highRiskCount > 1 ? 's' : ''} identified — review the action plan below` : 'Strong overall risk profile — maintain consistent answers across all topics',
      'Source of funds will be questioned in detail — have the complete paper trail ready to reference',
      'Marginality test: demonstrate the business creates economic activity beyond the investor\'s household income',
    ],
    highRiskCount: gapResult.highRiskCount,
    moderateRiskCount: gapResult.moderateRiskCount,
  };
}

// =============================================================================
// GET /api/simulator/interview-prep?applicationId=xxx
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (await isKillSwitchEnabled()) {
      return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    if (!applicationId) return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });

    // Full application row for gap engine
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, principal_name, business_name, business_category, operational_status, target_state, simulator_sessions_used')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    // All answers + documents + case brief + archetype in parallel
    const [answersRes, documentsRes, caseBriefRes, profileRes] = await Promise.all([
      supabase.from('answers').select('question_key, answer_value').eq('application_id', applicationId),
      supabase.from('application_documents').select('detected_document_type, user_selected_document_type, document_summary').eq('application_id', applicationId),
      supabase.from('case_briefs').select('substantiality_score, marginality_score').eq('application_id', applicationId).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('case_profiles').select('archetype').eq('user_id', user.id).maybeSingle(),
    ]);

    const answerRows = answersRes.data || [];
    const docRows = documentsRes.data || [];
    const caseBrief = caseBriefRes.data ?? undefined;
    const archetype = profileRes.data?.archetype ?? null;

    const aMap = new Map<string, string>();
    answerRows.forEach(a => { if (a.answer_value) aMap.set(a.question_key, a.answer_value); });

    // Run gap analysis engine — all 6 categories, 15 denial factors, scoring
    const gapResult = scoreCase(
      {
        business_name: app.business_name,
        business_category: app.business_category ?? aMap.get('Q0-10') ?? null,
        operational_status: app.operational_status,
        target_state: app.target_state ?? aMap.get('QE-03') ?? null,
        principal_name: app.principal_name,
        simulator_sessions_used: app.simulator_sessions_used,
      },
      answerRows,
      docRows,
      caseBrief,
      { sessionsUsed: app.simulator_sessions_used ?? 0, latestInconsistencyCount: 0 },
      archetype,
    );

    // Context labels
    const rawCategory = aMap.get('Q0-10') || app.business_category;
    let businessCategory = 'Not specified';
    if (rawCategory) {
      try {
        const parsed = JSON.parse(rawCategory);
        businessCategory = Array.isArray(parsed)
          ? parsed.map(v => getBusinessCategoryLabel(String(v))).join(', ')
          : getBusinessCategoryLabel(rawCategory);
      } catch {
        businessCategory = getBusinessCategoryLabel(rawCategory);
      }
    }
    // Q0-01 stores the treaty country — Q0-TC may be absent
    const rawCountry = aMap.get('Q0-TC') || aMap.get('Q0-01');
    const treatyCountry = rawCountry ? (COUNTRY_LABELS[rawCountry] || rawCountry) : 'Not specified';
    const rawBizType = aMap.get('Q0-BT');
    const businessType = rawBizType ? (BIZ_TYPE_LABELS[rawBizType] || rawBizType) : 'Not specified';
    const rawConsulate = aMap.get('Q0-CO');
    const consulate = rawConsulate ? (CONSULATE_LABELS[rawConsulate] || rawConsulate) : 'Not specified';
    const investmentRaw = aMap.get('QF-02') || aMap.get('M3-F-02');
    const investment = investmentRaw
      ? `$${parseFloat(investmentRaw.replace(/[^0-9.]/g, '')).toLocaleString()}`
      : 'Not specified';
    const jobsRaw = aMap.get('QI-03') || aMap.get('M3-I-03');
    const jobs = jobsRaw ? `${jobsRaw} employees` : 'Not specified';

    const isFranchise = (rawBizType || '').toLowerCase() === 'franchise';
    const isTorontoConsulate = (rawConsulate || '').toLowerCase() === 'toronto';
    const highRiskCategoryIds = gapResult.categories.filter(c => c.priority === 'critical' || c.priority === 'needs_work').map(c => c.id);

    const knowledgeSummary = buildKnowledgeSummary(isFranchise, isTorontoConsulate, highRiskCategoryIds);

    const docList = docRows.filter(d => d.detected_document_type)
      .map(d => `${d.detected_document_type}${d.document_summary ? ': ' + d.document_summary.slice(0, 80) : ''}`)
      .join('\n');

    const highRiskLines = gapResult.denialFactors.filter(f => f.risk === 'high')
      .map(f => `${f.code} (${f.name}): ${f.finding}`).join('\n');
    const modRiskLines = gapResult.denialFactors.filter(f => f.risk === 'moderate')
      .map(f => `${f.code} (${f.name}): ${f.finding}`).join('\n');
    const categoryGapsText = gapResult.categories.filter(c => c.gaps.length > 0)
      .map(c => `${c.name} [${c.score}/100]: ${c.gaps.slice(0, 2).join('; ')}`).join('\n');

    const systemPrompt = `You are a senior E-2 visa interview preparation counselor with 20+ years coaching applicants at US consulates worldwide. You have access to detailed gap analysis data from an E-2 intelligence engine that has scored this case. Your coaching is calibrated precisely to each applicant's actual risk profile — never generic. You always return valid JSON.`;

    const userPrompt = `Prepare a personalized interview brief for this E-2 applicant. Use the intelligence engine findings below to generate coaching that targets THEIR specific risk factors — not generic advice.

APPLICANT:
Name: ${app.principal_name || 'Not provided'} | Treaty country: ${treatyCountry}
Business: ${businessCategory} (${businessType}) | Investment: ${investment}
Year 1 jobs: ${jobs} | Consulate: ${consulate}
Business name: ${app.business_name || 'Not yet named'}

INTELLIGENCE ENGINE RESULTS:
Overall readiness: ${gapResult.overallScore}/100 (${gapResult.readiness})
High-risk factors: ${gapResult.highRiskCount} | Moderate-risk factors: ${gapResult.moderateRiskCount}

HIGH-RISK DENIAL FACTORS FOUND:
${highRiskLines || 'None'}

MODERATE-RISK FACTORS:
${modRiskLines || 'None'}

CATEGORY SCORES WITH GAPS:
${categoryGapsText || 'No significant gaps detected'}

DOCUMENTS ON FILE:
${docList || 'No documents yet'}

GOLD-STANDARD INTERVIEW COACHING REFERENCE:
${knowledgeSummary}

Return ONLY this JSON (no markdown, no explanation):
{
  "applicationSummary": "2-sentence honest assessment calibrated to the ${gapResult.overallScore}/100 score and specific risks found",
  "highlights": ["genuine strength specific to this case", "strength 2", "strength 3"],
  "leadWithThese": ["concrete opening point based on actual case data", "point 2", "point 3"],
  "interviewTopics": [
    {"topic": "Name of topic", "likelihood": "high", "coachNote": "Specific prep note targeting this applicant's actual gap for this topic", "officerTests": "One sentence on what the officer is testing"},
    {"topic": "...", "likelihood": "high", "coachNote": "...", "officerTests": "..."},
    {"topic": "...", "likelihood": "medium", "coachNote": "...", "officerTests": "..."},
    {"topic": "...", "likelihood": "medium", "coachNote": "...", "officerTests": "..."},
    {"topic": "...", "likelihood": "low", "coachNote": "...", "officerTests": "..."}
  ],
  "businessTips": ["tip specific to ${businessCategory} referencing their actual situation", "tip 2", "tip 3"],
  "pressurePoints": ["pressure point referencing an actual engine finding", "point 2"]
}

Rules:
- applicationSummary: reference the actual score — do NOT be generic
- highlights: only list real strengths the engine found — do not fabricate
- interviewTopics: prioritise areas where the engine found high-risk factors — officers will probe those hardest
- coachNote: reference the specific gap or finding, not just the topic in general
- ${isTorontoConsulate ? 'TORONTO NOTE: Flag Toronto-specific risks in your coaching notes where relevant.' : ''}`;

    const raw = await callLLM({
      task: 'prep',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1800,
    });

    if (!raw) {
      return NextResponse.json(buildFallback(businessCategory, businessType, investment, treatyCountry, gapResult));
    }

    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let llm: {
      applicationSummary: string;
      highlights: string[];
      leadWithThese: string[];
      interviewTopics: { topic: string; likelihood: string; coachNote: string; officerTests?: string }[];
      businessTips: string[];
      pressurePoints: string[];
    };

    try {
      llm = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(buildFallback(businessCategory, businessType, investment, treatyCountry, gapResult));
    }

    const brief: InterviewBriefData = {
      applicationSummary: llm.applicationSummary || '',
      overallScore: gapResult.overallScore,
      readiness: gapResult.readiness,
      highlights: (llm.highlights || []).slice(0, 4),
      leadWithThese: (llm.leadWithThese || []).slice(0, 3),
      interviewTopics: (llm.interviewTopics || []).slice(0, 6).map(t => ({
        topic: t.topic,
        likelihood: (['high', 'medium', 'low'].includes(t.likelihood) ? t.likelihood : 'medium') as 'high' | 'medium' | 'low',
        coachNote: t.coachNote,
        officerTests: t.officerTests,
      })),
      categoryScores: gapResult.categories.map(c => ({
        id: c.id, name: c.name, score: c.score, weight: c.weight,
        priority: c.priority, gaps: c.gaps, actions: c.actions, evidence: c.evidence,
      })),
      denialRisks: gapResult.denialFactors.filter(f => f.risk !== 'low').map(f => ({
        code: f.code, name: f.name, risk: f.risk, finding: f.finding, mitigation: f.mitigation,
      })),
      gapActions: buildGapActions(gapResult),
      businessTips: (llm.businessTips || []).slice(0, 3),
      pressurePoints: (llm.pressurePoints || []).slice(0, 3),
      highRiskCount: gapResult.highRiskCount,
      moderateRiskCount: gapResult.moderateRiskCount,
    };

    return NextResponse.json(brief);
  } catch (error) {
    console.error('[interview-prep] Error:', error);
    return NextResponse.json({ error: 'Interview prep failed' }, { status: 500 });
  }
}
