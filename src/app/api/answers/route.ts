import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isValidQuestionKey, QUESTION_KEY_REGEX } from '@/lib/questionKeyValidator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question_key, answer_value, application_id } = body;

    // Validate required fields
    if (!question_key || !application_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate question key format
    if (!isValidQuestionKey(question_key)) {
      return NextResponse.json(
        { error: `Invalid question key format. Expected format: ${QUESTION_KEY_REGEX.source}` },
        { status: 400 }
      );
    }

    // Upsert to answers table
    const { data, error } = await supabase
      .from('answers')
      .upsert(
        {
          application_id,
          question_key,
          answer_value,
          user_id: user.id,
          answered_at: new Date().toISOString(),
        },
        {
          onConflict: 'application_id,question_key',
        }
      )
      .select('question_key, answered_at')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Save failed' }, { status: 500 });
    }

    return NextResponse.json({
      saved: true,
      question_key: data.question_key,
      answered_at: data.answered_at,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
