import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

// GET /api/documents/[documentId] — Get document details
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error } = await supabase
      .from('application_documents')
      .select('id, application_id, user_id, original_filename, file_type, file_size_bytes, storage_path, user_selected_document_type, extraction_status, extraction_error, detected_document_type, detection_confidence, detection_reasoning, fields_extracted, document_summary, extracted_at, created_at, updated_at')
      .eq('id', params.documentId)
      .eq('user_id', user.id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    captureApiError(error, { route: 'documents/[documentId]', stage: 'get', documentId: params.documentId });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/documents/[documentId] — Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the document to find storage path
    const { data: document, error: fetchError } = await supabase
      .from('application_documents')
      .select('storage_path')
      .eq('id', params.documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    if (document.storage_path) {
      await supabase.storage
        .from('application-documents')
        .remove([document.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', params.documentId)
      .eq('user_id', user.id);

    if (deleteError) {
      captureApiError(deleteError, { route: 'documents/[documentId]', stage: 'delete-db', userId: user.id, documentId: params.documentId });
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    captureApiError(error, { route: 'documents/[documentId]', stage: 'delete', documentId: params.documentId });
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
