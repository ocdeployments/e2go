import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { asScoreLevel, weakestScore, type ScoreLevel } from '@/lib/case-brief-scores';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const svc = getAdmin();
  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') notFound();
}

interface CostRow { cost_usd: number; tokens_in: number; tokens_out: number; task: string; model: string; latency_ms: number | null; created_at: string }
interface DocRow { status: string; verifier_result: { overall?: string } | null; document_type: string; created_at: string }
/**
 * case_briefs scores are TEXT labels, not numbers, and there is no
 * marginality_score_direct column — marginality is stored as two judgements.
 * The old shape asked for the missing name, so supabase-js failed the whole
 * select and this section has always rendered its empty state.
 */
interface CaseRow {
  substantiality_score: string | null;
  fund_source_score: string | null;
  marginality_income_score: string | null;
  marginality_contribution_score: string | null;
  intent_score: string | null;
  created_at: string;
}
interface SimRow { readiness_indicator: string | null; inconsistency_count: number | null }
/**
 * A block, not a user. Both limiters run before anyone is authenticated, so
 * there is no user_id to record — this used to ask for one, which failed the
 * whole select even once the table existed.
 */
interface RateLimitRow { limiter: string; path: string; created_at: string }

function median(arr: number[]) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export default async function AdminIntelligencePage() {
  await requireAdmin();

  const admin = getAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: costs },
    { data: docs },
    { data: cases },
    { data: sims },
    { data: rateLimitHits },
  ] = await Promise.all([
    admin.from('llm_cost_log').select('cost_usd, tokens_in, tokens_out, task, model, latency_ms, created_at').order('created_at', { ascending: false }).limit(1000),
    admin.from('generated_documents').select('status, verifier_result, document_type, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('case_briefs').select('substantiality_score, fund_source_score, marginality_income_score, marginality_contribution_score, intent_score, created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('simulator_sessions').select('readiness_indicator, inconsistency_count').order('created_at', { ascending: false }).limit(200),
    admin.from('rate_limit_hits').select('limiter, path, created_at').order('created_at', { ascending: false }).limit(100).then(r => r),
  ]);

  const typedCosts = (costs ?? []) as CostRow[];
  const typedDocs  = (docs ?? []) as DocRow[];
  const typedCases = (cases ?? []) as CaseRow[];
  const typedSims  = (sims ?? []) as SimRow[];
  const typedRateLimits = (rateLimitHits ?? []) as RateLimitRow[];

  /**
   * Which limiter is doing the turning away. Five blocks on the quiz is a
   * scraper; five on login is someone guessing a password, and they call for
   * different responses, so the panel names them rather than giving one total.
   */
  const rateLimitByLimiter = Object.entries(
    typedRateLimits.reduce<Record<string, number>>((acc, hit) => {
      acc[hit.limiter] = (acc[hit.limiter] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // ── Document quality ─────────────────────────────────────────────────────────
  const completedDocs  = typedDocs.filter(d => d.status === 'completed');
  const failedDocs     = typedDocs.filter(d => d.status === 'failed');
  const verifierPassed = completedDocs.filter(d => d.verifier_result?.overall === 'pass' || d.verifier_result?.overall === 'pass_with_notes');
  const verifierFailed = completedDocs.filter(d => d.verifier_result?.overall === 'fail');
  const verifierRate   = completedDocs.length > 0 ? ((verifierPassed.length / completedDocs.length) * 100).toFixed(1) : '—';

  // Doc type failure breakdown
  const failByType: Record<string, number> = {};
  for (const d of failedDocs) {
    failByType[d.document_type] = (failByType[d.document_type] ?? 0) + 1;
  }
  const topFailTypes = Object.entries(failByType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Token efficiency ─────────────────────────────────────────────────────────
  const totalTokensIn  = typedCosts.reduce((s, r) => s + (r.tokens_in ?? 0), 0);
  const totalTokensOut = typedCosts.reduce((s, r) => s + (r.tokens_out ?? 0), 0);
  const totalCostUsd   = typedCosts.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const taskCosts: Record<string, { cost: number; calls: number; tIn: number; tOut: number }> = {};
  for (const r of typedCosts) {
    if (!taskCosts[r.task]) taskCosts[r.task] = { cost: 0, calls: 0, tIn: 0, tOut: 0 };
    taskCosts[r.task].cost  += r.cost_usd ?? 0;
    taskCosts[r.task].calls += 1;
    taskCosts[r.task].tIn   += r.tokens_in ?? 0;
    taskCosts[r.task].tOut  += r.tokens_out ?? 0;
  }
  const topTasks = Object.entries(taskCosts).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8);

  const latencies = typedCosts.filter(r => r.latency_ms != null).map(r => r.latency_ms as number);
  const medianLatency = median(latencies);
  const p95Latency    = latencies.length ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

  /**
   * ── Case intelligence scores ───────────────────────────────────────────────
   *
   * These are labels, so there is no average to take. The useful question for
   * an admin is the same one either way: on which dimension are cases coming
   * out weak? Each dimension reports how many assessed briefs sit below
   * adequate, with the full breakdown underneath.
   */
  const dimensions = [
    { label: 'Substantiality', levels: typedCases.map(c => asScoreLevel(c.substantiality_score)) },
    { label: 'Fund source',    levels: typedCases.map(c => asScoreLevel(c.fund_source_score)) },
    { label: 'Non-marginality', levels: typedCases.map(c => weakestScore(c.marginality_income_score, c.marginality_contribution_score)) },
    { label: 'Intent',         levels: typedCases.map(c => asScoreLevel(c.intent_score)) },
  ].map(({ label, levels }) => {
    const assessed = levels.filter((l): l is ScoreLevel => l !== null);
    const counts: Record<ScoreLevel, number> = { STRONG: 0, ADEQUATE: 0, WEAK: 0, CRITICAL: 0 };
    for (const level of assessed) counts[level] += 1;
    return { label, assessed: assessed.length, atRisk: counts.WEAK + counts.CRITICAL, counts };
  });

  // ── Simulator intelligence ───────────────────────────────────────────────────
  const readinessCount: Record<string, number> = { ready: 0, nearly_ready: 0, needs_work: 0 };
  for (const s of typedSims) {
    const r = s.readiness_indicator ?? 'needs_work';
    readinessCount[r] = (readinessCount[r] ?? 0) + 1;
  }
  const inconsistencies = typedSims.map(s => s.inconsistency_count ?? 0);
  const avgInconsistency = avg(inconsistencies);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-6xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Engine Intelligence</h1>
        <span className="text-zinc-500 text-sm">CIC, FAM, CIC Verifier, Simulator, FDD — all in one view</span>
      </div>

      {/* ── Document Quality ── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Document Quality (CIC Verifier)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Docs completed', value: String(completedDocs.length) },
            { label: 'Verifier pass rate', value: `${verifierRate}%`, highlight: true },
            { label: 'Verifier fails', value: String(verifierFailed.length), warn: verifierFailed.length > 0 },
            { label: 'Generation failures', value: String(failedDocs.length), warn: failedDocs.length > 0 },
          ].map(({ label, value, highlight, warn }) => (
            <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-semibold ${warn ? 'text-red-400' : highlight ? 'text-[#C9A84C]' : 'text-zinc-100'}`}>{value}</p>
            </div>
          ))}
        </div>

        {topFailTypes.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Top failing document types</p>
            <div className="space-y-2">
              {topFailTypes.map(([type, count]) => (
                <div key={type} className="flex items-center gap-3 text-sm">
                  <code className="text-zinc-400 w-48">{type}</code>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                    <div className="h-full bg-red-500/50 rounded" style={{ width: `${(count / (topFailTypes[0]?.[1] ?? 1)) * 100}%` }} />
                  </div>
                  <span className="text-red-400 text-xs w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Token Efficiency ── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Token Efficiency</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total tokens in', value: totalTokensIn.toLocaleString() },
            { label: 'Total tokens out', value: totalTokensOut.toLocaleString() },
            { label: 'Median latency', value: `${(medianLatency / 1000).toFixed(1)}s` },
            { label: 'p95 latency', value: `${(p95Latency / 1000).toFixed(1)}s` },
          ].map(({ label, value }) => (
            <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Cost by task (all time)</div>
        <div className="space-y-2.5">
          {topTasks.map(([task, { cost, calls, tIn, tOut }]) => (
            <div key={task} className="flex items-center gap-3 text-sm">
              <code className="text-zinc-400 w-52 truncate text-xs">{task}</code>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                <div className="h-full bg-[#C9A84C]/50 rounded" style={{ width: `${(cost / (totalCostUsd || 1)) * 100}%` }} />
              </div>
              <span className="text-[#C9A84C] font-mono text-xs w-20 text-right">${cost.toFixed(4)}</span>
              <span className="text-zinc-600 text-xs w-16 text-right">{calls} calls</span>
              <span className="text-zinc-700 text-xs">{((tIn + tOut) / (calls || 1)).toFixed(0)} avg tok</span>
            </div>
          ))}
        </div>

        {typedRateLimits.length > 0 && (
          <div className="mt-6 p-3 border border-orange-500/20 bg-orange-950/20 text-sm">
            <span className="text-orange-400 font-semibold">
              ⚠ {typedRateLimits.length}{typedRateLimits.length === 100 ? '+' : ''} rate limit blocks
            </span>
            <span className="text-zinc-400">
              {' '}— {rateLimitByLimiter.map(([name, count]) => `${count} on ${name}`).join(', ')}.
              Most recent {new Date(typedRateLimits[0].created_at).toLocaleString()}.
            </span>
          </div>
        )}
      </section>

      {/* ── Case Intelligence (FAM scores) ── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Case Intelligence — FAM Judgements</h2>
        {typedCases.length === 0 ? (
          <p className="text-zinc-600 text-sm">No case brief data yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dimensions.map(({ label, assessed, atRisk, counts }) => (
              <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-semibold text-[#C9A84C]">
                  {assessed === 0 ? '—' : `${atRisk} / ${assessed}`}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {assessed === 0 ? 'not assessed yet' : 'weak or critical'}
                </p>
                {assessed > 0 && (
                  <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
                    {counts.STRONG} strong · {counts.ADEQUATE} adequate · {counts.WEAK} weak · {counts.CRITICAL} critical
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Simulator Readiness ── */}
      <section className="mb-14">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Simulator Readiness Distribution</h2>
        {typedSims.length === 0 ? (
          <p className="text-zinc-600 text-sm">No simulator sessions yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'ready', label: 'Ready', cls: 'text-emerald-400' },
              { key: 'nearly_ready', label: 'Nearly ready', cls: 'text-yellow-400' },
              { key: 'needs_work', label: 'Needs work', cls: 'text-red-400' },
            ].map(({ key, label, cls }) => (
              <div key={key} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-3xl font-semibold ${cls}`}>{readinessCount[key] ?? 0}</p>
                <p className="text-xs text-zinc-600 mt-1">
                  {typedSims.length > 0 ? (((readinessCount[key] ?? 0) / typedSims.length) * 100).toFixed(0) : 0}%
                </p>
              </div>
            ))}
          </div>
        )}
        {typedSims.length > 0 && (
          <p className="text-xs text-zinc-500 mt-4">
            Average inconsistencies per session: <span className="text-zinc-300">{avgInconsistency.toFixed(1)}</span>
          </p>
        )}
      </section>

      {/* Summary insight */}
      <div className="p-4 border border-zinc-800 rounded-lg">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Intelligence summary</p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {completedDocs.length} documents completed · {verifierPassed.length} passed CIC verifier ({verifierRate}% pass rate) ·
          {' '}{typedCases.length} case briefs scored · {typedSims.length} simulator sessions run ·
          {' '}Total LLM spend logged: <span className="text-[#C9A84C] font-mono">${totalCostUsd.toFixed(4)}</span>
        </p>
      </div>
    </main>
  );
}
