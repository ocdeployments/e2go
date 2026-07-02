import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  buildGenerationPayload,
  callClaudeAPI,
  humanizeDocument,
} from '@/lib/generation-engine';
import type { CaseBrief } from '@/types/analysis';
import type { DocumentType, RevisionNote } from '@/types/generation';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: app } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (!app || app.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as {
      documentId: string;
      description: string;
      changeType: 'wording' | 'additional_info' | 'factual_correction';
    };
    const { documentId, description, changeType } = body;

    if (!documentId || !description?.trim()) {
      return NextResponse.json({ error: 'documentId and description are required' }, { status: 400 });
    }

    // Check credits
    const { data: creditsRow } = await supabase
      .from('revision_credits')
      .select('id, credits_remaining, credits_used')
      .eq('application_id', applicationId)
      .single();

    if (!creditsRow || creditsRow.credits_remaining <= 0) {
      return NextResponse.json({ error: 'No revision credits remaining' }, { status: 402 });
    }

    // Load original document
    const { data: doc } = await supabase
      .from('generated_documents')
      .select('id, document_type, content_text, revision_notes, revision_count')
      .eq('id', documentId)
      .eq('application_id', applicationId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!doc.content_text) {
      return NextResponse.json({ error: 'Document has no content to revise' }, { status: 400 });
    }

    // Mark as revising so the UI can show a spinner
    await supabase
      .from('generated_documents')
      .update({ status: 'revising', updated_at: new Date().toISOString() })
      .eq('id', documentId);

    // Load case brief
    const { data: caseBriefRow } = await supabase
      .from('case_briefs')
      .select('case_brief_json')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!caseBriefRow?.case_brief_json) {
      return NextResponse.json({ error: 'No case brief found — run analysis first' }, { status: 400 });
    }

    // Build payload and inject revision instructions into the system prompt
    const caseBrief = caseBriefRow.case_brief_json as CaseBrief;
    const payload = await buildGenerationPayload(applicationId, doc.document_type as DocumentType, caseBrief);

    const changeTypeLabel = changeType === 'factual_correction'
      ? 'factual correction'
      : changeType === 'additional_info'
        ? 'additional information'
        : 'wording change';

    payload.system_prompt = `${payload.system_prompt}

---
REVISION MODE — ${changeTypeLabel.toUpperCase()}:
You are REVISING an existing document, not writing a new one from scratch.
The complete original document appears below.

REVISION INSTRUCTIONS:
- Apply ONLY the specific change described by the applicant.
- Preserve all factual details, dates, amounts, and names exactly as they appear in the original unless the revision explicitly changes them.
- Do not restructure or rewrite sections that are not mentioned in the revision request.
- Maintain the same tone, length, and overall format as the original.
- Output the complete revised document text. No meta-commentary, headers, or labels.

ORIGINAL DOCUMENT:
${doc.content_text}

APPLICANT'S REVISION REQUEST (${changeTypeLabel}):
${description.trim()}`;

    const rawText = await callClaudeAPI(payload);
    const humanizedText = await humanizeDocument(rawText, payload.voice_profile || '', undefined, payload.document_type);

    const revisionNote: RevisionNote = {
      timestamp: new Date().toISOString(),
      reason: changeType || 'wording',
      description: description.trim(),
      credit_cost: 1,
    };

    const existingNotes: RevisionNote[] = Array.isArray(doc.revision_notes) ? doc.revision_notes as RevisionNote[] : [];

    // Save revised content — back to under_review for re-approval
    const { data: updatedDoc } = await supabase
      .from('generated_documents')
      .update({
        content_text: humanizedText,
        status: 'under_review',
        revision_count: (doc.revision_count || 0) + 1,
        revision_notes: [...existingNotes, revisionNote],
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    // Decrement credit
    await supabase
      .from('revision_credits')
      .update({
        credits_remaining: creditsRow.credits_remaining - 1,
        credits_used: creditsRow.credits_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditsRow.id);

    // Audit log
    await supabase
      .from('document_change_log')
      .insert({
        document_id: documentId,
        application_id: applicationId,
        user_id: user.id,
        change_type: changeType || 'wording',
        change_description: description.trim(),
      });

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (err) {
    console.error('[REVISE]', err);
    return NextResponse.json({ error: 'Revision failed. Please try again.' }, { status: 500 });
  }
}
