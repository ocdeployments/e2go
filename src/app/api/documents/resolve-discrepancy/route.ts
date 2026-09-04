import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ResolveDiscrepancyRequest } from '@/types/document-upload';
import { captureApiError } from '@/lib/capture-error';

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
      .select('id, question_key')
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
      captureApiError(updateError, { route: 'documents/resolve-discrepancy', stage: 'update-discrepancy', userId: user.id, applicationId, discrepancyId });
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // Update the answer record with the resolved value
    const { error: answerError } = await supabase
      .from('answers')
      .upsert(
        {
          application_id: applicationId,
          question_key: discrepancy.question_key,
          answer_value: resolvedValue,
          source: 'user_resolved_conflict',
          confidence: null,
          answered_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,question_key,family_member_id' }
      );

    if (answerError) {
      captureApiError(answerError, { route: 'documents/resolve-discrepancy', stage: 'update-answer', userId: user.id, applicationId, discrepancyId });
      // Non-critical — discrepancy is resolved even if answer update fails
    }

    return NextResponse.json({
      resolved: true,
      discrepancyId,
      questionId: discrepancy.question_key,
      resolvedValue,
    });
  } catch (error) {
    captureApiError(error, { route: 'documents/resolve-discrepancy' });
    return NextResponse.json({ error: 'Resolution failed' }, { status: 500 });
  }
}
