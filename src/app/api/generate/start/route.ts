import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { captureApiError } from '@/lib/capture-error';
import { generateStartRequestSchema } from '@/lib/api-schemas';
import { IN_FLIGHT_STATUSES, isStaleQueuedJob } from '@/lib/generation-job-status';
import { buildDocumentPlan } from '@/lib/document-plan';

function getSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    // Session auth — verify caller is logged in
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'generate');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many generation requests. Please wait before starting another document package.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    if (await isKillSwitchEnabled()) {
      return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    const rawBody = await request.json();
    const parsed = generateStartRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      );
    }
    const { applicationId } = parsed.data;

    // Verify application belongs to authenticated user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id, payment_status')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Payment wall — require paid status
    if (application.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment required' },
        { status: 402 }
      );
    }

    // Check no active job already running for this application
    const { data: existingJob } = await supabase
      .from('document_generation_jobs')
      .select('id, status, current_step, total_steps, current_step_label, updated_at')
      .eq('application_id', applicationId)
      .in('status', IN_FLIGHT_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // DR-2: a queued job whose /run invocation never happened (tab closed
    // between /start and /run, or the invocation that would have run it died)
    // has nothing keeping it moving. It is not a lock on new attempts — fall
    // through and let a fresh job be created below.
    const existingIsStaleQueue = existingJob
      ? isStaleQueuedJob(existingJob.status, existingJob.updated_at)
      : false;

    if (existingJob && !existingIsStaleQueue) {
      return NextResponse.json({
        jobId: existingJob.id,
        message: 'An active generation job already exists',
        existing: true,
        current_step: existingJob.current_step,
        total_steps: existingJob.total_steps,
        current_step_label: existingJob.current_step_label,
      });
    }

    // DR-16 (Gap G-11): conditional doc types are derived from intake answers
    // via the same buildDocumentPlan() the generation engine uses, so this
    // step count and pre-inserted row set can't drift from what actually
    // generates. See src/lib/document-plan.ts.
    const [{ data: condAnswers }, { data: partnerPayment }, { data: leaseDoc }] = await Promise.all([
      supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', applicationId)
        .in('question_key', ['M3-L-01', 'M3-F-05', 'M3-F-NEW-01']),
      supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_type', 'complete_partnership')
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('uploaded_documents')
        .select('id')
        .eq('application_id', applicationId)
        .eq('doc_type', 'lease_agreement')
        .limit(1)
        .maybeSingle(),
    ]);

    const condMap: Record<string, string> = {};
    for (const row of (condAnswers ?? [])) {
      condMap[(row as Record<string, string>).question_key] =
        (row as Record<string, string>).answer_value;
    }

    const plan = buildDocumentPlan({
      spouseIncluded: condMap['M3-L-01'] === 'yes',
      fundSources: condMap['M3-F-05'],
      investmentDeploymentStatus: condMap['M3-F-NEW-01'],
      hasLeaseAgreement: !!leaseDoc,
      isPartnership: !!partnerPayment,
    });

    const allDocTypes: string[] = plan.all;
    const totalSteps = 1 + allDocTypes.length + 9;

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('document_generation_jobs')
      .insert({
        application_id: applicationId,
        user_id: user.id,
        status: 'queued',
        current_step: 0,
        current_step_label: 'Initializing',
        total_steps: totalSteps,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }

    const jobId = job.id;

    /**
     * Stamp the milestone on the client's lifecycle row.
     *
     * This used to insert an event row carrying application_id and event —
     * neither column exists, so the write failed silently on every run. It
     * would have been wrong even had it worked: application_lifecycle holds one
     * row per client, keyed on user_id, so an insert creates a duplicate rather
     * than recording anything. The state it wanted to record already has a
     * column, and upserting it is the shape the rest of the codebase uses.
     */
    await supabase.from('application_lifecycle').upsert(
      {
        user_id: user.id,
        generation_triggered_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    // Create document rows for all pipeline document types (core + conditional)
    await supabase.from('generated_documents').insert(
      allDocTypes.map((docType) => ({
        job_id: jobId,
        application_id: applicationId,
        user_id: user.id,
        document_type: docType,
        status: 'queued',
      }))
    );

    // Create revision credits row (10 credits)
    await supabase.from('revision_credits').insert({
      user_id: user.id,
      application_id: applicationId,
      credits_remaining: 10,
      credits_used: 0,
    });

    return NextResponse.json({
      jobId,
      message: 'Generation job created',
    });
  } catch (error) {
    captureApiError(error, { route: 'generate/start' });
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}