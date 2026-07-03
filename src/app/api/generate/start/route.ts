import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';

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
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      );
    }

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
      .select('id, status, current_step, total_steps, current_step_label')
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
        current_step: existingJob.current_step,
        total_steps: existingJob.total_steps,
        current_step_label: existingJob.current_step_label,
      });
    }

    // Determine conditional doc types from intake answers
    const [{ data: condAnswers }, { data: partnerPayment }] = await Promise.all([
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
    ]);

    const condMap: Record<string, string> = {};
    for (const row of (condAnswers ?? [])) {
      condMap[(row as Record<string, string>).question_key] =
        (row as Record<string, string>).answer_value;
    }

    const conditionalDocTypes: string[] = [];
    if (condMap['M3-L-01'] === 'yes') {
      conditionalDocTypes.push('declaration_spouse', 'resume_spouse');
    }
    if (typeof condMap['M3-F-05'] === 'string' && condMap['M3-F-05'].includes('property-sale')) {
      conditionalDocTypes.push('property_portfolio');
    }
    // WS6.1 — Investment Evidence generates only when at-risk is genuinely contested:
    // funds partially deployed or committed-but-unspent (escrow-style arrangements).
    // Fully-deployed cases rely on SOF §V instead of a redundant standalone document.
    if (condMap['M3-F-NEW-01'] === 'partial' || condMap['M3-F-NEW-01'] === 'no') {
      conditionalDocTypes.push('investment_proof');
    }
    // WS6.1 — Financial Assets Portfolio generates when fund sources include securities/
    // registered plans/crypto (RRSP, TFSA, LIRA/pension, cryptocurrency) — the case where
    // there's a non-real-estate financial asset trail to document beyond SOF §V.
    if (
      typeof condMap['M3-F-05'] === 'string' &&
      ['rrsp', 'tfsa', 'lira', 'crypto'].some(v => (condMap['M3-F-05'] as string).includes(v))
    ) {
      conditionalDocTypes.push('financial_assets_portfolio');
    }

    // Sprint F-P: Add Investor 2 documents for complete_partnership buyers
    if (partnerPayment) {
      conditionalDocTypes.push(
        'cover_letter_p2', 'source_of_funds_p2', 'declaration_p2',
        'qualifications_p2', 'nonimmigrant_intent_p2', 'resume_p2'
      );
    }

    const coreDocTypes = [
      'cover_letter', 'source_of_funds', 'business_plan', 'qualifications',
      'ds160_reference', 'visa_category', 'nonimmigrant_intent',
      'marginality_rebuttal', 'declaration_principal', 'fund_flow_chronology',
      'net_worth_statement', 'resume_principal', 'gift_letter',
    ];
    const allDocTypes = [...coreDocTypes, ...conditionalDocTypes];
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

    // Track generation triggered lifecycle event
    await supabase.from('application_lifecycle').insert({
      application_id: applicationId,
      event: 'generation_triggered',
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

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
    console.error('Start generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}