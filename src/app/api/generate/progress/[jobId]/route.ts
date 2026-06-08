import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SSEProgressMessage } from '@/types/generation';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const supabase = getSupabase();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: SSEProgressMessage) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const interval = setInterval(async () => {
        try {
          const { data: job, error } = await supabase
            .from('document_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (error || !job) {
            send({
              step: 0,
              stepLabel: 'Error',
              status: 'failed',
              documentsComplete: 0,
              totalDocuments: 6,
              error: 'Job not found',
            });
            clearInterval(interval);
            controller.close();
            return;
          }

          // Count completed documents (approved + awaiting_approval)
          const { count } = await supabase
            .from('generated_documents')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', jobId)
            .in('status', ['approved', 'awaiting_approval']);

          // Get currently generating document
          const { data: currentDoc } = await supabase
            .from('generated_documents')
            .select('document_type, content_text')
            .eq('job_id', jobId)
            .eq('status', 'generating')
            .single();

          // Get document awaiting approval
          const { data: awaitingDoc } = await supabase
            .from('generated_documents')
            .select('document_type, content_text')
            .eq('job_id', jobId)
            .eq('status', 'awaiting_approval')
            .single();

          send({
            step: job.current_step,
            stepLabel: job.current_step_label || '',
            status: job.status,
            documentsComplete: count || 0,
            totalDocuments: 6,
            awaitingApproval: job.status === 'awaiting_approval',
            currentDocument: awaitingDoc?.document_type || currentDoc?.document_type || undefined,
            currentDocumentText: awaitingDoc?.content_text || currentDoc?.content_text || undefined,
            error: job.error_message || undefined,
          });

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            controller.close();
            closed = true;
          }
        } catch (err) {
          console.error('SSE poll error:', err);
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        closed = true;
        controller.close();
      });
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