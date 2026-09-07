import { createServiceClient } from '@/lib/supabase-service';
import { captureApiError } from '@/lib/capture-error';

/**
 * Document-access audit log. Records who touched which uploaded document and
 * when, for the regulatory audit trail. See migration
 * 20260907140000_document_access_log.sql and docs/DATA_RETENTION_POLICY.md.
 *
 * Fire-and-forget: a logging failure must never break the request that
 * triggered it, so every path here swallows its error into Sentry.
 */

export type DocumentAccessAction = 'view' | 'extract' | 'parse' | 'download' | 'delete';
export type DocumentAccessTable = 'uploaded_documents' | 'application_documents' | 'fdd_analyses';
export type DocumentAccessActor = 'owner' | 'admin' | 'system';

interface LogDocumentAccessInput {
  userId: string | null;
  documentId: string;
  documentTable: DocumentAccessTable;
  action: DocumentAccessAction;
  docType?: string | null;
  fileName?: string | null;
  actor?: DocumentAccessActor;
  detail?: Record<string, unknown> | null;
}

export async function logDocumentAccess(input: LogDocumentAccessInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('document_access_log').insert({
      user_id: input.userId,
      document_id: input.documentId,
      document_table: input.documentTable,
      action: input.action,
      doc_type: input.docType ?? null,
      file_name: input.fileName ?? null,
      actor: input.actor ?? 'owner',
      detail: input.detail ?? null,
    });
    if (error) {
      captureApiError(error, {
        route: 'lib/document-access-log',
        stage: 'insert',
        action: input.action,
        documentTable: input.documentTable,
      });
    }
  } catch (err) {
    captureApiError(err, { route: 'lib/document-access-log', stage: 'insert-throw', action: input.action });
  }
}
