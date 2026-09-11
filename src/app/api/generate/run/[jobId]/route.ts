import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { runGenerationPipeline } from '@/lib/generation-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import type { GenerationStep } from '@/types/generation';
import { captureApiError } from '@/lib/capture-error';
import { IN_FLIGHT_STATUSES } from '@/lib/generation-job-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // M1: Rate-limit /run as well as /start — prevents bypass by calling run directly
    const rl = await checkRateLimit(user.id, 'generate');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many generation requests. Please wait before retrying.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    const supabase = getSupabase();
    const { jobId } = params;

    const { data: job, error: jobError } = await supabase
      .from('document_generation_jobs')
      .select('id, user_id, status, application_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Idempotent: return 200 for any non-failed job status already being
    // driven by a live invocation. React Strict Mode may call this endpoint
    // twice; both calls succeed. 'queued' is deliberately excluded here — it
    // is handled below with an atomic claim instead of a plain status check,
    // since nothing is yet driving a queued job forward.
    if (IN_FLIGHT_STATUSES.includes(job.status as typeof IN_FLIGHT_STATUSES[number]) && job.status !== 'queued') {
      return NextResponse.json(
        { jobId, message: 'Generation already in progress', status: job.status },
        { status: 200 }
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json(
        { jobId, message: 'Generation already completed', status: job.status },
        { status: 200 }
      );
    }

    // DR-2: a 'queued' job has no in-progress guard of its own — two /run
    // calls racing on the same queued job (a client re-attach plus the DR-1
    // resume cron, say) must not both start the pipeline. Claim it with a
    // conditional update; only the caller that actually flips the row wins.
    if (job.status === 'queued') {
      const { data: claimed, error: claimError } = await supabase
        .from('document_generation_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('status', 'queued')
        .select('id')
        .maybeSingle();

      if (claimError) {
        captureApiError(claimError, { route: 'generate/run', stage: 'claim-queued', jobId });
      }

      if (!claimed) {
        return NextResponse.json(
          { jobId, message: 'Generation already in progress', status: 'running' },
          { status: 200 }
        );
      }
    }

    // job.status === 'failed' or other states allow restart (continue below)

    // Fire and forget — run pipeline in background
    const onProgress = async (step: GenerationStep) => {
      await supabase
        .from('document_generation_jobs')
        .update({
          current_step: step.id,
          current_step_label: step.label,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    };

    // Start pipeline asynchronously — don't await
    runGenerationPipeline(
      job.application_id,
      job.user_id,
      jobId,
      onProgress
    ).catch(async (err) => {
      captureApiError(err, { route: 'generate/run', stage: 'pipeline', jobId, userId: job.user_id });
      await supabase
        .from('document_generation_jobs')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown pipeline error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    });

    return NextResponse.json(
      { jobId, message: 'Generation started' },
      { status: 202 }
    );
  } catch (error) {
    captureApiError(error, { route: 'generate/run' });
    return NextResponse.json(
      { error: 'Failed to start generation run' },
      { status: 500 }
    );
  }
}