import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { extractFddText, extractFdd } from '@/lib/fdd-extraction-engine';
import type { FddSSEEvent } from '@/types/fdd';
import { captureApiError } from '@/lib/capture-error';
import { fddExtractRequestSchema } from '@/lib/api-schemas';

// POST /api/fdd/extract — SSE stream
// Body: { fdd_id: string }
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const authSupabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await authSupabase.auth.getUser();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: FddSSEEvent) {
        controller.enqueue(
          encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
        );
      }

      try {
        if (authError || !user) {
          send({ event: 'error', data: { message: 'Unauthorized' } });
          controller.close();
          return;
        }

        const rl = await checkRateLimit(user.id, 'fdd');
        if (!rl.allowed) {
          send({ event: 'error', data: { message: 'Rate limit exceeded. Please wait before extracting another FDD.' } });
          controller.close();
          return;
        }

        if (await isKillSwitchEnabled()) {
          send({ event: 'error', data: { message: 'AI features are temporarily unavailable. Please try again shortly.' } });
          controller.close();
          return;
        }

        const rawBody = await request.json();
        const parsed = fddExtractRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
          send({ event: 'error', data: { message: 'Missing or invalid fdd_id' } });
          controller.close();
          return;
        }
        const { fdd_id } = parsed.data;

        const serviceClient = createServiceClient();

        // Fetch the FDD record (verify ownership)
        const { data: fddRecord, error: fetchError } = await serviceClient
          .from('fdd_analyses')
          .select('extraction_status, storage_path, target_state')
          .eq('id', fdd_id)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !fddRecord) {
          send({ event: 'error', data: { message: 'FDD analysis not found' } });
          controller.close();
          return;
        }

        if (fddRecord.extraction_status === 'extracted') {
          send({ event: 'error', data: { message: 'This FDD has already been extracted' } });
          controller.close();
          return;
        }

        // Mark as extracting
        await serviceClient
          .from('fdd_analyses')
          .update({ extraction_status: 'extracting', extraction_progress: 0 })
          .eq('id', fdd_id);

        // Download from storage
        const { data: fileData, error: downloadError } = await serviceClient.storage
          .from('application-documents')
          .download(fddRecord.storage_path);

        if (downloadError || !fileData) {
          await serviceClient
            .from('fdd_analyses')
            .update({ extraction_status: 'failed', extraction_error: 'Failed to download file' })
            .eq('id', fdd_id);
          send({ event: 'error', data: { message: 'Failed to download FDD from storage' } });
          controller.close();
          return;
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());

        // Extract PDF text
        const { text, pageCount, isScanned } = await extractFddText(buffer);

        if (isScanned) {
          await serviceClient
            .from('fdd_analyses')
            .update({
              extraction_status: 'failed',
              extraction_error: 'Scanned PDF — no extractable text',
            })
            .eq('id', fdd_id);
          send({ event: 'error', data: { message: 'This FDD appears to be a scanned document. Please upload a text-based PDF.' } });
          controller.close();
          return;
        }

        await serviceClient
          .from('fdd_analyses')
          .update({ page_count: pageCount })
          .eq('id', fdd_id);

        // Run extraction with progress callbacks
        const result = await extractFdd(
          text,
          fddRecord.target_state || null,
          (progress) => {
            send({ event: 'progress', data: { chunk: progress.chunk, pct: progress.pct } });
            serviceClient
              .from('fdd_analyses')
              .update({ extraction_progress: progress.pct })
              .eq('id', fdd_id)
              .then(() => {});
          }
        );

        // Emit staleness check
        send({
          event: 'staleness_check',
          data: {
            stale: result.staleness.status !== 'current',
            age_months: (result.fields.fdd_age_months?.value as number) ?? null,
            status: result.staleness.status,
          },
        });

        // Emit registration check
        send({
          event: 'registration_check',
          data: {
            is_registration_state: result.registration.is_registration_state,
            status: result.registration.status,
          },
        });

        // Derive stale flag
        const fddStale = result.staleness.status !== 'current';
        const ageMonths = (result.fields.fdd_age_months?.value as number) ?? null;

        // Determine state_registration_status
        const regStatus = result.registration.status;

        // Persist extraction results
        await serviceClient
          .from('fdd_analyses')
          .update({
            extraction_status: 'extracted',
            extraction_progress: 100,
            extracted_fields: result.fields,
            fdd_stale: fddStale,
            fdd_age_months: ageMonths,
            state_registration_status: regStatus,
            flag_count: result.flagCount,
          })
          .eq('id', fdd_id);

        send({
          event: 'extraction_complete',
          data: {
            fdd_id,
            total_fields: result.totalFields,
            low_confidence_count: result.lowConfidenceCount,
          },
        });
      } catch (error) {
        captureApiError(error, { route: 'fdd/extract', userId: user?.id });
        send({
          event: 'error',
          data: { message: error instanceof Error ? error.message : 'Extraction failed' },
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
      'Connection': 'keep-alive',
    },
  });
}
