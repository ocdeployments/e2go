import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const supabase = getSupabase();
    const { jobId } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

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

    if (job.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (job.status === 'running') {
      return NextResponse.json(
        { error: 'Job is already running', jobId },
        { status: 409 }
      );
    }

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