import { NextResponse } from 'next/server';
import { runAnalysisEngine } from '@/lib/analysis-engine';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, userId } = body;

    // Authentication and authorization check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify application ownership
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || application.user_id !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Run Engine
    const caseBrief = await runAnalysisEngine(applicationId, userId);

    // Save to database
    await supabase
      .from('case_briefs')
      .insert({
        application_id: applicationId,
        user_id: userId,
        substantiality_score: caseBrief.substantiality_score,
        marginality_income_score: caseBrief.marginality.income_score,
        marginality_contribution_score: caseBrief.marginality.contribution_score,
        intent_score: caseBrief.intent_score,
        case_brief_json: caseBrief,
        status: 'complete'
      });

    return NextResponse.json(caseBrief);
  } catch (error) {
    console.error('Analysis Engine Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
