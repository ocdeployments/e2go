import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { runGenerationPipeline } from '@/lib/generation-engine';
import type { GenerationStep } from '@/types/generation';

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

    const supabase = getSupabase();
    const { jobId } = params;

    const { data: job, error: jobError } = await supabase
      .from('document_generation_jobs')
      .select('*')
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

    // Idempotent: return 200 for any non-failed job status
    // React Strict Mode may call this endpoint twice; both calls succeed
    if (job.status === 'running' || job.status === 'pending' || job.status === 'processing' || job.status === 'awaiting_approval') {
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
      console.error('Pipeline crashed:', err);
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
    console.error('Run generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start generation run' },
      { status: 500 }
    );
  }
}