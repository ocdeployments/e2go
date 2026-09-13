import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';
import { logDocumentAccess } from '@/lib/document-access-log';

// GET /api/documents/[documentId]/download — Download the original file for
// an application_document. Streams the file through the server (rather than
// handing back a client-usable Storage URL) so every download is logged to
// document_access_log for the regulatory audit trail (G-11).
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
      .select('id, original_filename, file_type, storage_path, user_selected_document_type, detected_document_type, file_purged_at')
      .eq('id', params.documentId)
      .eq('user_id', user.id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.file_purged_at) {
      return NextResponse.json(
        { error: 'This file was removed under our data-retention policy and can no longer be downloaded.' },
        { status: 410 }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      captureApiError(downloadError ?? new Error('Empty file download'), {
        route: 'documents/[documentId]/download', stage: 'storage-download', userId: user.id, documentId: params.documentId,
      });
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    await logDocumentAccess({
      userId: user.id,
      documentId: document.id,
      documentTable: 'application_documents',
      action: 'download',
      docType: document.user_selected_document_type ?? document.detected_document_type,
      fileName: document.original_filename,
    });

    const buffer = Buffer.from(await fileData.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': fileData.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.original_filename.replace(/"/g, '')}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (error) {
    captureApiError(error, { route: 'documents/[documentId]/download', stage: 'get', documentId: params.documentId });
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
