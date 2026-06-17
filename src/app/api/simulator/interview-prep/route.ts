import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callLLM } from '@/lib/llm-client';
import { getBusinessCategoryLabel } from '@/lib/business-categories';

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

export interface InterviewBriefData {
  applicationSummary: string;
  highlights: string[];
  interviewTopics: {
    topic: string;
    likelihood: 'high' | 'medium' | 'low';
    coachNote: string;
  }[];
  businessTips: string[];
  pressurePoints: string[];
  leadWithThese: string[];
}

// GET /api/simulator/interview-prep?applicationId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    // Verify ownership
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, principal_name, business_name')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fetch all intake answers
    const { data: answers } = await supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', applicationId);

    const aMap = new Map<string, string>();
    (answers || []).forEach(a => aMap.set(a.question_key, a.answer_value));

    // Fetch documents on file
    const { data: documents } = await supabase
      .from('application_documents')
      .select('detected_document_type, document_summary, fields_extracted')
      .eq('application_id', applicationId);

    // Build context from all available sources
    const rawCategory = aMap.get('Q0-10');
    const businessCategory = rawCategory ? getBusinessCategoryLabel(rawCategory) : 'Not specified';
    const rawCountry = aMap.get('Q0-TC');
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

    const docList = (documents || [])
      .filter(d => d.detected_document_type)
      .map(d => `${d.detected_document_type}${d.document_summary ? ': ' + d.document_summary.slice(0, 120) : ''}`)
      .join('\n');

    const systemPrompt = `You are an expert E-2 visa interview preparation counselor helping applicants prepare for their US consular interview. Your guidance is practical, specific, and grounded in real E-2 adjudication standards. You always return valid JSON.`;

    const userPrompt = `Prepare an interview brief for this E-2 visa applicant:

APPLICANT DETAILS:
- Name: ${app.principal_name || 'Not provided'}
- Treaty country: ${treatyCountry}
- Business category: ${businessCategory}
- Business type: ${businessType}
- Investment amount: ${investment}
- Jobs committed (Year 1): ${jobs}
- Target consulate: ${consulate}
- Business name: ${app.business_name || 'Not yet named'}

DOCUMENTS ON FILE:
${docList || 'No documents analysed yet'}

Return a JSON object with exactly this structure. No markdown, no explanation — pure JSON only:
{
  "applicationSummary": "2-sentence practical summary of this application's current standing",
  "highlights": ["strength 1", "strength 2", "strength 3"],
  "interviewTopics": [
    {"topic": "Topic name", "likelihood": "high", "coachNote": "What to prepare and how to answer convincingly"},
    {"topic": "Topic name", "likelihood": "high", "coachNote": "..."},
    {"topic": "Topic name", "likelihood": "medium", "coachNote": "..."},
    {"topic": "Topic name", "likelihood": "medium", "coachNote": "..."},
    {"topic": "Topic name", "likelihood": "low", "coachNote": "..."}
  ],
  "businessTips": ["tip specific to ${businessCategory}", "tip 2", "tip 3"],
  "pressurePoints": ["potential challenge or scrutiny area", "area 2", "area 3"],
  "leadWithThese": ["talking point to open with strength", "point 2", "point 3"]
}

Requirements:
- applicationSummary: exactly 2 sentences, honest about both strengths and gaps
- highlights: exactly 3 items, specific to this case
- interviewTopics: 4-6 topics, ordered high → medium → low likelihood
- businessTips: 2-3 tips SPECIFIC to ${businessCategory} — not generic E-2 advice
- pressurePoints: 2-3 real areas of scrutiny based on this specific application
- leadWithThese: 3 concrete facts or points this applicant should lead with`;

    const raw = await callLLM({
      task: 'prep',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    if (!raw) {
      return NextResponse.json({ error: 'Failed to generate brief' }, { status: 503 });
    }

    // Extract JSON from the response (model may wrap in code fences)
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let brief: InterviewBriefData;
    try {
      brief = JSON.parse(jsonStr);
    } catch {
      // If JSON is malformed, return a structured fallback
      brief = buildFallback(businessCategory, businessType, investment, treatyCountry);
    }

    return NextResponse.json(brief);
  } catch (error) {
    console.error('[interview-prep] Error:', error);
    return NextResponse.json({ error: 'Interview prep failed' }, { status: 500 });
  }
}

function buildFallback(
  category: string,
  type: string,
  investment: string,
  country: string
): InterviewBriefData {
  return {
    applicationSummary: `This E-2 application is for a ${category.toLowerCase()} venture from a ${country} national. The officer will probe investment amount, source of funds, job creation, and the applicant's qualifications to manage and direct the enterprise.`,
    highlights: [
      `Treaty-country investor from ${country} — E-2 treaty eligibility established`,
      investment !== 'Not specified' ? `Investment of ${investment} committed to the enterprise` : 'Investment documentation should be clearly presented',
      type === 'franchise' ? 'Franchise model provides proven business structure' : type === 'acquisition' ? 'Acquiring an existing operating business' : 'Founding a new enterprise in the US market',
    ],
    interviewTopics: [
      { topic: 'Investment amount and source of funds', likelihood: 'high', coachNote: 'Be precise: total amount, where it came from, and that it is at risk in the enterprise. Have bank statements and wire transfer records ready to reference.' },
      { topic: 'Business model and viability', likelihood: 'high', coachNote: `Explain what ${category} means in practice: who your customers are, how you acquire them, and why the market supports this business in your chosen location.` },
      { topic: 'Job creation and impact', likelihood: 'high', coachNote: 'State your Year 1 hiring plan by role. If numbers are modest, explain why the investment still qualifies (substantial) and how the business grows.' },
      { topic: 'Your role and qualifications', likelihood: 'high', coachNote: 'Demonstrate you will "direct and develop" the enterprise, not merely work in it. Reference your experience in this industry or management role.' },
      { topic: 'Ties to home country', likelihood: 'medium', coachNote: 'Be ready to explain your intent — E-2 is a non-immigrant visa. You may eventually return home; the business can be managed by others.' },
    ],
    businessTips: [
      `Know your revenue model for ${category} in detail — the officer may ask how you plan to acquire your first clients or customers`,
      'Have a clear 12-month plan with milestones, hiring dates, and key expenses',
      'If your investment is below $100K, be prepared to explain why it is "substantial" relative to the cost of establishing this type of business',
    ],
    pressurePoints: [
      investment === 'Not specified' ? 'Investment amount not confirmed — this will be a primary point of scrutiny' : `Ensure the ${investment} is clearly documented as already committed and at risk`,
      'Source of funds will be questioned — have a clear, documentable trail from your personal accounts',
      'Marginality test: show the business will generate more than enough to support you and your family, not just break even',
    ],
    leadWithThese: [
      `I am a citizen of ${country} investing ${investment} in a ${category.toLowerCase()} business in the United States`,
      'My investment is fully committed and at risk — I have documentation showing the funds have been deployed',
      'I will be directing and developing this enterprise personally, and my background qualifies me to do so',
    ],
  };
}
