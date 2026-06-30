import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isValidQuestionKey, QUESTION_KEY_REGEX } from '@/lib/questionKeyValidator';
import { buildCaseProfile } from '@/lib/case-profile';
import { buildCaseIntelligence } from '@/lib/case-intelligence-core';

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

    // Verify application belongs to the authenticated user
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', application_id)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert to answers table
    // Note: user_id and source columns require migrations 001/002 — omit until applied
    const { data, error } = await supabase
      .from('answers')
      .upsert(
        {
          application_id,
          question_key,
          answer_value,
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

    // Trigger profile rebuild fire-and-forget (updates dimension scores as case file grows)
    buildCaseProfile(user.id).catch(() => {});
    buildCaseIntelligence(application_id, user.id).catch(() => {});

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
