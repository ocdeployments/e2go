import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SSEProgressMessage } from '@/types/generation';
import { captureApiError } from '@/lib/capture-error';

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
  // Session auth
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

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
            .select('status, current_step, current_step_label, total_steps, error_message')
            .eq('id', jobId)
            .eq('user_id', user.id)
            .single();

          if (error || !job) {
            send({
              step: 0,
              stepLabel: 'Error',
              status: 'failed',
              documentsComplete: 0,
              totalDocuments: 0,
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

          // Get currently generating document (no content_text — fetched on demand)
          const { data: currentDoc } = await supabase
            .from('generated_documents')
            .select('document_type')
            .eq('job_id', jobId)
            .eq('status', 'generating')
            .single();

          // Get document awaiting approval (no content_text — fetched on demand)
          const { data: awaitingDoc } = await supabase
            .from('generated_documents')
            .select('document_type')
            .eq('job_id', jobId)
            .eq('status', 'awaiting_approval')
            .single();

          /**
           * total_steps is the planned count, written when the job is created.
           *
           * This used to prefer a document_types array that the table does not
           * have. supabase-js fails the whole select on one bad column name, so
           * `job` came back null on every tick and the stream's first message
           * was "Job not found" — the progress bar was broken for every client,
           * while the documents generated correctly behind it.
           */
          const totalDocuments = job.total_steps ?? 13;

          send({
            step: job.current_step,
            stepLabel: job.current_step_label || '',
            status: job.status,
            documentsComplete: count || 0,
            totalDocuments,
            awaitingApproval: job.status === 'awaiting_approval',
            currentDocument: awaitingDoc?.document_type || currentDoc?.document_type || undefined,
            currentDocumentText: undefined,
            error: job.error_message || undefined,
          });

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            controller.close();
            closed = true;
          }
        } catch (err) {
          captureApiError(err, { route: 'generate/progress', jobId, userId: user.id });
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