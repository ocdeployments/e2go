import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTextFromBuffer } from '@/lib/text-extraction';
import {
  classifyDocument,
  extractFields,
  detectDiscrepancies,
  generateGapReport,
} from '@/lib/document-extraction-engine';
import type {
  ExtractionSSEEvent,
  DetectedDocumentType,
  Confidence,
} from '@/types/document-upload';

function _getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getSupabaseAuth(cookieHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
      },
    }
  );
}

// POST /api/documents/extract — SSE extraction pipeline
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: ExtractionSSEEvent) {
        controller.enqueue(
          encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
        );
      }

      try {
        // Authenticate via cookie header
        const cookieHeader = request.headers.get('cookie');
        const authSupabase = getSupabaseAuth(cookieHeader);
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();

        if (authError || !user) {
          sendEvent({ event: 'error', data: { message: 'Unauthorized' } });
          controller.close();
          return;
        }

        const body = await request.json();
        const { applicationId, documentIds } = body;

        if (!applicationId || !documentIds?.length) {
          sendEvent({ event: 'error', data: { message: 'Missing applicationId or documentIds' } });
          controller.close();
          return;
        }

        const supabase = _getSupabase();

        // Verify application ownership
        const { data: application } = await supabase
          .from('applications')
          .select('user_id')
          .eq('id', applicationId)
          .single();
        if (!application || application.user_id !== user.id) {
          sendEvent({ event: 'error', data: { message: 'Forbidden' } });
          controller.close();
          return;
        }

        // Fetch all document records
        const { data: documents, error: fetchError } = await supabase
          .from('application_documents')
          .select('*')
          .eq('application_id', applicationId)
          .in('id', documentIds);

        if (fetchError || !documents?.length) {
          sendEvent({ event: 'error', data: { message: 'Documents not found' } });
          controller.close();
          return;
        }

        // Process each document sequentially
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
        }> = [];

        for (const doc of documents) {
          sendEvent({
            event: 'document_start',
            data: { documentId: doc.id, filename: doc.original_filename },
          });

          // Mark as extracting
          await supabase
            .from('application_documents')
            .update({ extraction_status: 'extracting' })
            .eq('id', doc.id);

          try {
            // Download file from storage
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('application-documents')
              .download(doc.storage_path);

            if (downloadError || !fileData) {
              throw new Error(`Failed to download ${doc.original_filename}`);
            }

            // Extract text from file
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const extraction = await extractTextFromBuffer(
              buffer,
              doc.file_type as 'pdf' | 'docx' | 'xlsx' | 'csv',
              doc.original_filename
            );

            // Handle scanned PDFs
            if (extraction.isScanned) {
              await supabase
                .from('application_documents')
                .update({
                  extraction_status: 'failed',
                  extraction_error: 'Scanned document — no extractable text',
                })
                .eq('id', doc.id);

              sendEvent({
                event: 'document_error',
                data: {
                  documentId: doc.id,
                  message: 'This appears to be a scanned document. We can only extract text from digital documents.',
                },
              });
              continue;
            }

            // Stage 2 — Classify document
            const classification = await classifyDocument(
              extraction.text,
              doc.user_selected_document_type || 'unknown'
            );

            // Update classification in database
            await supabase
              .from('application_documents')
              .update({
                detected_document_type: classification.detected_type,
                detection_confidence: classification.confidence,
                detection_reasoning: classification.reasoning,
              })
              .eq('id', doc.id);

            sendEvent({
              event: 'document_classified',
              data: {
                documentId: doc.id,
                type: classification.detected_type,
                confidence: classification.confidence,
              },
            });

            // Stage 3 — Extract fields
            const extractionResult = await extractFields(
              extraction.text,
              classification.detected_type,
              doc.original_filename
            );

            const validFields = extractionResult.extracted_fields.filter(
              f => f.question_id && f.value
            );

            // Store extracted answers in the answers table
            for (const field of validFields) {
              if (field.confidence === 'low') continue; // Skip low-confidence extractions

              await supabase
                .from('answers')
                .upsert(
                  {
                    application_id: applicationId,
                    question_key: field.question_id,
                    answer_value: field.value,
                    user_id: user.id,
                    source: 'document_upload',
                    confidence: field.confidence,
                    source_document_type: classification.detected_type,
                    answered_at: new Date().toISOString(),
                  } as never,
                  { onConflict: 'application_id,question_key' }
                );
            }

            // Update document record
            await supabase
              .from('application_documents')
              .update({
                extraction_status: 'completed',
                fields_extracted: validFields.length,
                document_summary: extractionResult.document_summary,
                extracted_at: new Date().toISOString(),
              })
              .eq('id', doc.id);

            sendEvent({
              event: 'document_extracted',
              data: { documentId: doc.id, fieldsFound: validFields.length },
            });

            sendEvent({
              event: 'document_complete',
              data: { documentId: doc.id },
            });

            extractions.push({
              documentId: doc.id,
              filename: doc.original_filename,
              detectedType: classification.detected_type,
              fields: validFields,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Extraction failed';

            await supabase
              .from('application_documents')
              .update({
                extraction_status: 'failed',
                extraction_error: errorMessage,
              })
              .eq('id', doc.id);

            sendEvent({
              event: 'document_error',
              data: { documentId: doc.id, message: errorMessage },
            });
          }
        }

        // Stage 4 — Discrepancy detection
        const discrepancies = detectDiscrepancies(extractions);

        if (discrepancies.length > 0) {
          // Store discrepancies
          for (const disc of discrepancies) {
            await supabase
              .from('document_discrepancies')
              .insert({
                application_id: applicationId,
                question_id: disc.question_id,
                question_label: disc.question_label,
                conflicting_values: disc.conflicting_values,
              });
          }

          sendEvent({
            event: 'discrepancies_found',
            data: { count: discrepancies.length },
          });
        }

        // Generate gap report
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('question_key, answer_value')
          .eq('application_id', applicationId);

        const answerMap = new Map<string, string>();
        if (existingAnswers) {
          for (const ans of existingAnswers) {
            answerMap.set(ans.question_key, ans.answer_value || '');
          }
        }

        const gapReport = generateGapReport(extractions, answerMap);

        // Add document summaries with full data
        gapReport.documentSummaries = extractions.map(ext => ({
          documentId: ext.documentId,
          filename: ext.filename,
          detectedType: ext.detectedType,
          fieldsExtracted: ext.fields.filter(f => f.confidence !== 'low').length,
          summary: documents.find(d => d.id === ext.documentId)?.document_summary || null,
        }));

        sendEvent({
          event: 'extraction_complete',
          data: { gapReport },
        });
      } catch (error) {
        console.error('Extraction pipeline error:', error);
        sendEvent({
          event: 'error',
          data: { message: error instanceof Error ? error.message : 'Pipeline failed' },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
