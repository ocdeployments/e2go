import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/simulator/save-extraction — Save extracted document fields as answers
// Body: { applicationId, answers: Array<{ question_id, value, confidence, source_quote? }> }
// Used by standalone simulator quick-start to populate answers from document extraction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, answers } = body;

    if (!applicationId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing applicationId or answers array' },
        { status: 400 }
      );
    }

    // Verify application belongs to user
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Save each extracted answer — using question_key/answer_value column names
    // (consistent with /api/documents/extract and /api/answers)
    const insertData = answers.map((a: { question_id: string; value: string; confidence: string; source_quote?: string }) => ({
      application_id: applicationId,
      user_id: user.id,
      question_key: a.question_id,
      answer_value: a.value,
      confidence: a.confidence || 'medium',
      source: 'document_extraction',
      answered_at: new Date().toISOString(),
    }));

    // Upsert — if answer already exists for this question_key, update it
    const { error: insertError } = await supabase
      .from('answers')
      .upsert(insertData, {
        onConflict: 'application_id,question_key',
        ignoreDuplicates: false,
      });

    if (insertError) {
      console.error('Failed to save extraction answers:', insertError);
      return NextResponse.json(
        { error: 'Failed to save answers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved: insertData.length });
  } catch (error) {
    console.error('Save extraction error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
