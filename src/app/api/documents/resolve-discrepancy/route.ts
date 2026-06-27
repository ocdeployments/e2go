import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ResolveDiscrepancyRequest } from '@/types/document-upload';

// POST /api/documents/resolve-discrepancy — Resolve a conflicting value
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ResolveDiscrepancyRequest = await request.json();
    const { discrepancyId, applicationId, resolvedValue } = body;

    if (!discrepancyId || !applicationId || resolvedValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: discrepancyId, applicationId, resolvedValue' },
        { status: 400 }
      );
    }

    // Verify the discrepancy belongs to this user's application
    const { data: discrepancy, error: fetchError } = await supabase
      .from('document_discrepancies')
      .select('id, question_id')
      .eq('id', discrepancyId)
      .eq('application_id', applicationId)
      .single();

    if (fetchError || !discrepancy) {
      return NextResponse.json(
        { error: 'Discrepancy not found' },
        { status: 404 }
      );
    }

    // Update the discrepancy as resolved
    const { error: updateError } = await supabase
      .from('document_discrepancies')
      .update({
        resolved_value: resolvedValue,
        resolved_source: 'user_resolved_conflict',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', discrepancyId);

    if (updateError) {
      console.error('Update discrepancy error:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // Update the answer record with the resolved value
    const { error: answerError } = await supabase
      .from('answers')
      .upsert(
        {
          application_id: applicationId,
          question_key: discrepancy.question_id,
          answer_value: resolvedValue,
          user_id: user.id,
          source: 'user_resolved_conflict',
          confidence: null,
          answered_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,question_key' }
      );

    if (answerError) {
      console.error('Update answer error:', answerError);
      // Non-critical — discrepancy is resolved even if answer update fails
    }

    return NextResponse.json({
      resolved: true,
      discrepancyId,
      questionId: discrepancy.question_id,
      resolvedValue,
    });
  } catch (error) {
    console.error('Resolve discrepancy error:', error);
    return NextResponse.json({ error: 'Resolution failed' }, { status: 500 });
  }
}
