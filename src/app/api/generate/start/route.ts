import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { applicationId, userId } = body;

    if (!applicationId || !userId) {
      return NextResponse.json(
        { error: 'applicationId and userId are required' },
        { status: 400 }
      );
    }

    // Verify application belongs to user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check no active job already running for this application
    const { data: existingJob } = await supabase
      .from('document_generation_jobs')
      .select('id, status')
      .eq('application_id', applicationId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        message: 'An active generation job already exists',
        existing: true,
      });
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('document_generation_jobs')
      .insert({
        application_id: applicationId,
        user_id: userId,
        status: 'queued',
        current_step: 0,
        current_step_label: 'Initializing',
        total_steps: 15,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }

    const jobId = job.id;

    // Create 6 document rows
    const documentTypes = [
      'cover_letter',
      'source_of_funds',
      'investment_proof',
      'business_plan',
      'qualifications',
      'ds160_reference',
    ];

    await supabase.from('generated_documents').insert(
      documentTypes.map((docType) => ({
        job_id: jobId,
        application_id: applicationId,
        user_id: userId,
        document_type: docType,
        status: 'queued',
      }))
    );

    // Create revision credits row (10 credits)
    await supabase.from('revision_credits').insert({
      user_id: userId,
      application_id: applicationId,
      credits_remaining: 10,
      credits_used: 0,
    });

    return NextResponse.json({
      jobId,
      message: 'Generation job created',
    });
  } catch (error) {
    console.error('Start generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}