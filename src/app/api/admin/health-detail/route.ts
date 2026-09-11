import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeGenerationMetrics, type GenerationJobRow } from '@/lib/generation-metrics';

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// No kill-switch on this route by design — it's the admin diagnostic tool for diagnosing kill-switch
// situations (probes LLM to verify if the service is actually up before toggling the kill-switch off).
// FIXED 2026-06-23: route had no auth — exposed service health + stuck job data publicly (QA-SEC-02)
async function getRequestingAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user.id : null;
}

async function probeLLM(url: string, apiKey: string, body: object): Promise<{ ok: boolean; latency_ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t0 };
  } catch {
    return { ok: false, latency_ms: Date.now() - t0 };
  }
}

export async function GET() {
  const adminId = await getRequestingAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdmin();
  const now   = new Date();
  const stuckThresholdMs = 30 * 60 * 1000; // 30 minutes
  const stuckCutoff = new Date(Date.now() - stuckThresholdMs).toISOString();
  const todayStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const [
    dbRes,
    activeJobsRes,
    stuckJobsRes,
    dailyJobsRes,
    recentCronsRes,
    recentCostRes,
    settingsRes,
  ] = await Promise.all([
    // DB ping
    admin.from('applications').select('id').limit(1),

    // Active generation jobs
    admin
      .from('document_generation_jobs')
      .select('id, application_id, status, current_step, total_steps, current_step_label, created_at, updated_at')
      .eq('status', 'running'),

    // Stuck jobs (running but not updated in 30 min)
    admin
      .from('document_generation_jobs')
      .select('id, application_id, current_step_label, created_at, updated_at')
      .eq('status', 'running')
      .lt('updated_at', stuckCutoff),

    // DR-22: today's throughput — jobs created today, plus any still-running
    // job regardless of when it started (so a multi-day stall still counts
    // as in flight).
    admin
      .from('document_generation_jobs')
      .select('id, status, created_at, started_at, completed_at')
      .or(`created_at.gte.${todayStartIso},status.in.(queued,running)`),

    // Last run for each cron job
    admin
      .from('cron_log')
      .select('job_name, started_at, completed_at, status, error')
      .order('started_at', { ascending: false })
      .limit(20),

    // LLM latency p95 (last 100 calls)
    admin
      .from('llm_cost_log')
      .select('latency_ms, model, provider, created_at')
      .order('created_at', { ascending: false })
      .limit(100),

    // Kill switch / maintenance mode
    admin
      .from('app_settings')
      .select('key, value')
      .in('key', ['kill_switch_enabled', 'maintenance_mode', 'kill_switch_message']),
  ]);

  // DB status
  const dbOk = !dbRes.error;

  // Cron last runs — dedupe to latest per job
  const cronLatest: Record<string, { started_at: string; status: string; error?: string | null }> = {};
  for (const row of recentCronsRes.data ?? []) {
    if (!cronLatest[row.job_name]) cronLatest[row.job_name] = row;
  }

  // LLM stats
  const latencies = (recentCostRes.data ?? []).map(r => r.latency_ms).filter(Boolean).sort((a, b) => a - b);
  const p95idx    = Math.floor(latencies.length * 0.95);
  const p95       = latencies[p95idx] ?? null;
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : null;

  // Settings map
  const settings = Object.fromEntries((settingsRes.data ?? []).map(r => [r.key, r.value]));

  // DR-22: daily throughput + in-flight
  const dailyMetrics = computeGenerationMetrics((dailyJobsRes.data ?? []) as GenerationJobRow[], now);

  // Probe external services (lightweight)
  const [openrouterProbe, stripeWebhookProbe] = await Promise.all([
    probeLLM('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY ?? '', {
      model: 'xiaomi/mimo-v2.5',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    }),
    // Stripe: check if last webhook arrived in last 24h
    admin
      .from('processed_webhook_events')
      .select('processed_at')
      .order('processed_at', { ascending: false })
      .limit(1),
  ]);

  const stripeLastWebhook = stripeWebhookProbe.data?.[0]?.processed_at ?? null;
  const stripeHoursAgo    = stripeLastWebhook
    ? Math.round((Date.now() - new Date(stripeLastWebhook).getTime()) / 3_600_000)
    : null;

  return NextResponse.json({
    timestamp: now.toISOString(),
    services: {
      database:   { status: dbOk ? 'ok' : 'error' },
      openrouter: { status: openrouterProbe.ok ? 'ok' : 'error', latency_ms: openrouterProbe.latency_ms },
      stripe:     { status: stripeHoursAgo !== null && stripeHoursAgo < 24 ? 'ok' : 'warn', last_webhook_hours_ago: stripeHoursAgo },
    },
    generation: {
      active_jobs:  activeJobsRes.data  ?? [],
      stuck_jobs:   stuckJobsRes.data   ?? [],
      stuck_count:  stuckJobsRes.data?.length ?? 0,
      daily: {
        started_today:      dailyMetrics.startedToday,
        completed_today:    dailyMetrics.completedToday,
        failed_today:       dailyMetrics.failedToday,
        duration_p50_ms:    dailyMetrics.durationP50Ms,
        duration_p95_ms:    dailyMetrics.durationP95Ms,
        in_flight_count:    dailyMetrics.inFlight.length,
      },
    },
    crons:   cronLatest,
    llm: {
      latency_p95_ms:  p95,
      latency_avg_ms:  avgLatency,
      recent_calls:    latencies.length,
    },
    settings: {
      kill_switch_enabled: settings['kill_switch_enabled'] === 'true',
      maintenance_mode:    settings['maintenance_mode']    === 'true',
      kill_switch_message: settings['kill_switch_message'] ?? '',
    },
  });
}
