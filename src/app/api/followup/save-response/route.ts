import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map gap categories to relevant documents
const GAP_TO_DOCUMENTS: Record<string, string[]> = {
  management_experience: ['cover_letter', 'qualifications'],
  industry_experience: ['cover_letter', 'qualifications'],
  financial_management: ['business_plan', 'qualifications'],
  personal_connection: ['cover_letter'],
  motivation: ['cover_letter'],
  volunteer_experience: ['cover_letter', 'qualifications'],
  prior_business: ['cover_letter', 'qualifications'],
  family_involvement: ['cover_letter'],
  measurable_achievements: ['cover_letter', 'qualifications'],
};

function assessContentValue(answerText: string): 'high' | 'medium' | 'low' | 'none' {
  if (answerText.length < 20) return 'none';

  // Check for specific details: numbers, names, dates, places
  const hasNumbers = /\d+/.test(answerText);
  const hasNames = /[A-Z][a-z]+ [A-Z][a-z]+/.test(answerText);
  const hasDates = /\d{4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(answerText);
  const hasPlaces = /\b(city|country|state|province|office|store|restaurant|shop)\b/i.test(answerText);

  const detailScore = [hasNumbers, hasNames, hasDates, hasPlaces].filter(Boolean).length;

  if (detailScore >= 3) return 'high';
  if (detailScore >= 1) return 'medium';
  return 'low';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { applicationId, questionText, answerText, questionNumber, gapCategory } = body;

    if (!applicationId || !questionText || questionNumber === undefined || !gapCategory) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user_id from application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Assess content value
    const contentValue = assessContentValue(answerText || '');

    // Determine relevant documents
    const relevantDocuments = GAP_TO_DOCUMENTS[gapCategory] || ['cover_letter'];

    // Save to followup_responses
    const { error: responseError } = await supabase
      .from('followup_responses')
      .insert({
        application_id: applicationId,
        user_id: application.user_id,
        gap_category: gapCategory,
        question_text: questionText,
        answer_text: answerText || '',
        content_value: contentValue,
        relevant_documents: relevantDocuments,
        question_number: questionNumber,
      })
      .select()
      .single();

    if (responseError) {
      console.error('Response save error:', responseError);
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contentValue,
      relevantDocuments,
    });
  } catch (error) {
    console.error('Save response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
