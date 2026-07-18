import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateGapReport } from '@/lib/document-extraction-engine';
import type { DetectedDocumentType, Confidence } from '@/types/document-upload';
import { captureApiError } from '@/lib/capture-error';

// GET /api/documents/gap-report?applicationId=xxx — Get gap report
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId parameter' },
        { status: 400 }
      );
    }

    // Two upload pipelines feed this screen: the legacy application_documents
    // pipeline this route was originally built against, and the current
    // uploaded_documents taxonomy — both must be read or documents uploaded
    // through the newer path silently vanish from the gap report.
    const [{ data: documents, error: docError }, { data: uploadedDocs, error: uploadedDocError }] = await Promise.all([
      supabase
        .from('application_documents')
        .select('id, original_filename, detected_document_type, fields_extracted, document_summary')
        .eq('application_id', applicationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('uploaded_documents')
        .select('id, file_name, doc_type, fields_total, extracted_json')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true }),
    ]);

    if (docError) {
      captureApiError(docError, { route: 'documents/gap-report', stage: 'document-query', userId: user.id, applicationId });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    if (uploadedDocError) {
      console.warn('Uploaded document query error (non-fatal):', uploadedDocError.message);
    }

    // Fetch all answers for this application
    const { data: answers, error: ansError } = await supabase
      .from('answers')
      .select('question_key, answer_value, confidence, source_document_type')
      .eq('application_id', applicationId);

    if (ansError) {
      captureApiError(ansError, { route: 'documents/gap-report', stage: 'answer-query', userId: user.id, applicationId });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const answerMap = new Map<string, string>();
    if (answers) {
      for (const ans of answers) {
        answerMap.set(ans.question_key, ans.answer_value || '');
      }
    }

    // Build extractions summary from document records
    // Note: full field data is not stored per-document in the DB,
    // so we rebuild from the answer table which has source_document_type
    const extractionFields = (answers || [])
      .filter(a => a.source_document_type && a.confidence !== 'low')
      .map(a => ({
        question_id: a.question_key,
        value: a.answer_value || '',
        display_value: a.answer_value || '',
        confidence: (a.confidence || 'low') as Confidence,
        source_quote: '',
      }));

    const extractions: Array<{
      documentId: string;
      filename: string;
      detectedType: DetectedDocumentType | null;
      fields: Array<{
        question_id: string;
        value: string;
        display_value: string;
        confidence: Confidence;
        source_quote: string;
      }>;
    }> = [
      ...(documents || []).map(doc => ({
        documentId: doc.id,
        filename: doc.original_filename,
        detectedType: doc.detected_document_type as DetectedDocumentType | null,
        fields: extractionFields,
      })),
      ...(uploadedDocs || []).map(doc => ({
        documentId: doc.id,
        filename: doc.file_name,
        detectedType: doc.doc_type as DetectedDocumentType | null,
        fields: extractionFields,
      })),
    ];

    const gapReport = generateGapReport(extractions, answerMap);

    // Enrich document summaries from DB
    gapReport.documentSummaries = [
      ...(documents || []).map(doc => ({
        documentId: doc.id,
        filename: doc.original_filename,
        detectedType: doc.detected_document_type as DetectedDocumentType | null,
        fieldsExtracted: doc.fields_extracted || 0,
        summary: doc.document_summary || null,
      })),
      ...(uploadedDocs || []).map(doc => ({
        documentId: doc.id,
        filename: doc.file_name,
        detectedType: doc.doc_type as DetectedDocumentType | null,
        fieldsExtracted: doc.fields_total || 0,
        summary: null,
      })),
    ];

    // Fetch unresolved discrepancies count
    const { count: unresolvedCount } = await supabase
      .from('document_discrepancies')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', applicationId)
      .is('resolved_value', null);

    return NextResponse.json({
      ...gapReport,
      unresolvedDiscrepancies: unresolvedCount || 0,
    });
  } catch (error) {
    captureApiError(error, { route: 'documents/gap-report' });
    return NextResponse.json({ error: 'Gap report failed' }, { status: 500 });
  }
}
