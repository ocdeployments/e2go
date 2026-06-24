import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Runs every 5 minutes via Vercel cron.
// 1. Marks generation jobs stuck > 30 min as failed
// 2. Logs its own run to cron_log
// 3. Checks for cron consecutive failures and alerts via Resend

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function sendAlert(subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM ?? 'ops@e2go.app';
  const to     = process.env.OPS_ALERT_EMAIL ?? 'romyjames@gmail.com';
  if (!apiKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html: `<pre>${body}</pre>` }),
  }).catch(() => {});
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  let   logId = '';

  // Open cron_log row
  const { data: logRow } = await admin
    .from('cron_log')
    .insert({ job_name: 'health-watchdog', status: 'running' })
    .select('id')
    .single();
  logId = logRow?.id ?? '';

  const results = {
    stuck_jobs_failed:     0,
    consecutive_failures:  [] as string[],
    alerts_sent:           [] as string[],
  };

  try {
    // ── 1. Find and fail stuck generation jobs ──────────────────────────────
    const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckJobs } = await admin
      .from('document_generation_jobs')
      .select('id, application_id')
      .eq('status', 'running')
      .lt('updated_at', stuckCutoff);

    for (const job of stuckJobs ?? []) {
      await admin
        .from('document_generation_jobs')
        .update({ status: 'failed', current_step_label: 'Timed out — please retry' })
        .eq('id', job.id);

      results.stuck_jobs_failed++;
      console.log(`[health-watchdog] Marked stuck job ${job.id} as failed`);
    }

    // ── 2. Check cron consecutive failures ─────────────────────────────────
    const CRON_JOBS = ['rebuild-profiles', 'email-scheduler'];
    for (const jobName of CRON_JOBS) {
      const { data: recentRuns } = await admin
        .from('cron_log')
        .select('status')
        .eq('job_name', jobName)
        .order('started_at', { ascending: false })
        .limit(3);

      const lastThree = (recentRuns ?? []).map(r => r.status);
      if (lastThree.length === 3 && lastThree.every(s => s === 'failed')) {
        results.consecutive_failures.push(jobName);
        const subject = `[E2go OPS] Cron "${jobName}" failed 3 times in a row`;
        const body    = `Job: ${jobName}\nLast 3 statuses: ${lastThree.join(', ')}\nTime: ${new Date().toISOString()}\n\nCheck /admin/system-status for details.`;
        await sendAlert(subject, body);
        results.alerts_sent.push(jobName);
      }
    }

    // ── 3. OpenRouter balance check ────────────────────────────────────────
    const orKey = process.env.OPENROUTER_API_KEY;
    if (orKey) {
      try {
        const { data: thresholdSetting } = await admin
          .from('app_settings')
          .select('value')
          .eq('key', 'openrouter_reload_threshold')
          .maybeSingle();
        const threshold = Number(thresholdSetting?.value ?? 20);

        const orRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${orKey}` },
        });
        if (orRes.ok) {
          const orData = await orRes.json() as { data?: { usage?: number; limit?: number } };
          const usage  = orData.data?.usage  ?? 0;
          const limit  = orData.data?.limit  ?? 0;
          const balance = limit - usage;

          // Store current balance so admin page can display it
          await admin.from('app_settings')
            .upsert({ key: 'openrouter_balance_usd', value: String(balance.toFixed(2)) }, { onConflict: 'key' });

          if (balance < threshold) {
            // Only send one alert per 24h to avoid spam
            const { data: lastAlert } = await admin
              .from('app_settings')
              .select('value')
              .eq('key', 'openrouter_low_balance_alerted_at')
              .maybeSingle();
            const lastAlertTs = lastAlert?.value ? Number(lastAlert.value) : 0;
            const oneDayMs = 24 * 3600 * 1000;

            if (Date.now() - lastAlertTs > oneDayMs) {
              await sendAlert(
                `[E2go OPS] ⚠ OpenRouter balance low — $${balance.toFixed(2)} remaining`,
                `OpenRouter balance: $${balance.toFixed(2)}\nThreshold: $${threshold}\n\nTop up at https://openrouter.ai/credits\nTime: ${new Date().toISOString()}`
              );
              await admin.from('app_settings')
                .upsert({ key: 'openrouter_low_balance_alerted_at', value: String(Date.now()) }, { onConflict: 'key' });
              await admin.from('app_settings')
                .upsert({ key: 'openrouter_balance_low', value: 'true' }, { onConflict: 'key' });
              results.alerts_sent.push('openrouter_low_balance');
            }
          } else {
            // Clear the low-balance flag if balance is back up
            await admin.from('app_settings')
              .upsert({ key: 'openrouter_balance_low', value: 'false' }, { onConflict: 'key' });
          }
        }
      } catch (orErr) {
        console.warn('[health-watchdog] OpenRouter balance check failed:', orErr);
      }
    }

    // ── 3. Close cron_log row ──────────────────────────────────────────────
    if (logId) {
      await admin
        .from('cron_log')
        .update({ status: 'success', completed_at: new Date().toISOString(), rows_processed: results.stuck_jobs_failed, metadata: results })
        .eq('id', logId);
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[health-watchdog] Fatal error:', errMsg);

    if (logId) {
      await admin
        .from('cron_log')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: errMsg })
        .eq('id', logId);
    }

    await sendAlert('[E2go OPS] health-watchdog cron failed', `Error: ${errMsg}\nTime: ${new Date().toISOString()}`);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
