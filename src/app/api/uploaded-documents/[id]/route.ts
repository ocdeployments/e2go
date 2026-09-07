import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';
import { logDocumentAccess } from '@/lib/document-access-log';

/**
 * DELETE /api/uploaded-documents/[id]
 *
 * Per-file "delete now" for the intake-path documents that land in
 * `uploaded_documents` (bank records, business plans, identity docs, …). The
 * raw file for this path is never stored (`file_path` is always ''), so there
 * is nothing to sweep from Storage — this removes the extracted-field record.
 *
 * Fields the user already accepted into `answers` are left untouched: those are
 * their reviewed work product, not a copy of the source document.
 *
 * FDD uploads additionally seed a row in `fdd_analyses` (and a stored PDF) for
 * the separate FDD tool; that is managed from the FDD tool, not here.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('id, file_name, doc_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      captureApiError(deleteError, {
        route: 'uploaded-documents/[id]', stage: 'delete-db', userId: user.id, documentId: params.id,
      });
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    await logDocumentAccess({
      userId: user.id,
      documentId: params.id,
      documentTable: 'uploaded_documents',
      action: 'delete',
      docType: document.doc_type,
      fileName: document.file_name,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    captureApiError(error, { route: 'uploaded-documents/[id]', stage: 'delete', documentId: params.id });
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
