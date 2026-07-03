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

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'invalid_json', message: 'Request body is not valid JSON.' }, { status: 400 });
    }
    const { question_key, answer_value, application_id, family_member_id } = body as { question_key?: string; answer_value?: string; application_id?: string; family_member_id?: string | null };

    // Validate required fields
    if (!question_key || !application_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If scoped to a dependent, verify the family member belongs to this user
    if (family_member_id) {
      const { data: fm, error: fmError } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', family_member_id)
        .eq('user_id', user.id)
        .single();
      if (fmError || !fm) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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

    // Validate and sanitize answer_value
    const MAX_ANSWER_LENGTH = 10_000;
    let sanitizedValue: string | null = null;
    if (answer_value !== null && answer_value !== undefined) {
      if (typeof answer_value !== 'string') {
        return NextResponse.json({ error: 'answer_value must be a string' }, { status: 400 });
      }
      const trimmed = answer_value.trim();
      if (trimmed.length > MAX_ANSWER_LENGTH) {
        return NextResponse.json(
          { error: `answer_value exceeds maximum length of ${MAX_ANSWER_LENGTH} characters` },
          { status: 400 }
        );
      }
      sanitizedValue = trimmed.length > 0 ? trimmed : null;
    }

    // Upsert to answers table
    // Note: user_id and source columns require migrations 001/002 — omit until applied
    const { data, error } = await supabase
      .from('answers')
      .upsert(
        {
          application_id,
          question_key,
          answer_value: sanitizedValue,
          answered_at: new Date().toISOString(),
          family_member_id: family_member_id ?? null,
        },
        {
          onConflict: 'application_id,question_key,family_member_id',
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
