import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// FIXED 2026-06-23: added role gate — page had no role check (QA-SEC-03)
async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') notFound();
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type CostRow = {
  id: string;
  user_id: string | null;
  task: string | null;
  model: string | null;
  provider: string | null;
  cost_usd: number;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  created_at: string;
};

function fmtD(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function CostPage() {
  await requireAdmin();
  const admin = getAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 3600000).toISOString();
  const todayStart    = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { data: allRows30 },
    { data: todayRows },
    { data: monthRows },
  ] = await Promise.all([
    admin.from('llm_cost_log').select('id, user_id, task, model, provider, cost_usd, tokens_in, tokens_out, latency_ms, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
    admin.from('llm_cost_log').select('cost_usd').gte('created_at', todayStart),
    admin.from('llm_cost_log').select('cost_usd').gte('created_at', monthStart),
  ]);

  const rows30 = (allRows30 ?? []) as CostRow[];

  // ── Daily trend (last 7 days) ─────────────────────────────────────────────
  const sevenDayRows = rows30.filter(r => r.created_at >= sevenDaysAgo);
  const dailyMap: Record<string, number> = {};
  for (const r of sevenDayRows) {
    const day = r.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (r.cost_usd ?? 0);
  }
  // Build last 7 days in order (fill gaps with 0)
  const days7: { day: string; cost: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days7.push({ day: key, cost: dailyMap[key] ?? 0 });
  }
  const maxDayCost = Math.max(1, ...days7.map(d => d.cost));

  // ── Cost by task ──────────────────────────────────────────────────────────
  const taskMap: Record<string, { calls: number; tokensIn: number; tokensOut: number; cost: number; latencySum: number; latencyCount: number }> = {};
  for (const r of rows30) {
    const key = r.task ?? 'unknown';
    if (!taskMap[key]) taskMap[key] = { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0, latencySum: 0, latencyCount: 0 };
    taskMap[key].calls++;
    taskMap[key].tokensIn  += r.tokens_in  ?? 0;
    taskMap[key].tokensOut += r.tokens_out ?? 0;
    taskMap[key].cost      += r.cost_usd   ?? 0;
    if (r.latency_ms) { taskMap[key].latencySum += r.latency_ms; taskMap[key].latencyCount++; }
  }
  const taskRows = Object.entries(taskMap).sort((a, b) => b[1].cost - a[1].cost);

  // ── Cost by model ─────────────────────────────────────────────────────────
  const modelMap: Record<string, { provider: string; calls: number; cost: number }> = {};
  for (const r of rows30) {
    const key = r.model ?? 'unknown';
    if (!modelMap[key]) modelMap[key] = { provider: r.provider ?? '—', calls: 0, cost: 0 };
    modelMap[key].calls++;
    modelMap[key].cost += r.cost_usd ?? 0;
  }
  const modelRows = Object.entries(modelMap).sort((a, b) => b[1].cost - a[1].cost);

  // ── Top 10 users ──────────────────────────────────────────────────────────
  const userMap: Record<string, { calls: number; cost: number }> = {};
  for (const r of rows30) {
    const key = r.user_id ?? 'anonymous';
    if (!userMap[key]) userMap[key] = { calls: 0, cost: 0 };
    userMap[key].calls++;
    userMap[key].cost += r.cost_usd ?? 0;
  }
  const topUsers = Object.entries(userMap).sort((a, b) => b[1].cost - a[1].cost).slice(0, 10);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalCost30  = rows30.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalCostToday = ((todayRows ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalCostMonth = ((monthRows ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const now = new Date();
  const daysElapsed  = now.getDate();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonth = daysElapsed > 0 ? (totalCostMonth / daysElapsed) * daysInMonth : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Cost Intelligence</h1>
        <span className="text-zinc-500 text-sm">Last 30 days · refreshes on load</span>
        <Link href="/admin" className="ml-auto text-xs text-zinc-500 hover:text-[#C9A84C] transition-colors">← Admin</Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <MetricCard label="Today"              value={`$${totalCostToday.toFixed(5)}`} />
        <MetricCard label="This month"         value={`$${totalCostMonth.toFixed(4)}`} sub={`proj $${projectedMonth.toFixed(2)}`} />
        <MetricCard label="Last 30 days"       value={`$${totalCost30.toFixed(4)}`} />
        <MetricCard label="Total API calls"    value={String(rows30.length)} sub="30 days" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
        {/* Daily bar chart */}
        <section>
          <SectionTitle>Daily Cost Trend — last 7 days</SectionTitle>
          {days7.every(d => d.cost === 0) ? (
            <div className="text-zinc-600 text-sm">No cost data in the last 7 days.</div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {days7.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-zinc-600 font-mono">{d.cost > 0 ? `$${d.cost.toFixed(3)}` : ''}</span>
                  <div className="w-full bg-zinc-900 relative" style={{ height: '80px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-[#C9A84C]/60"
                      style={{ height: `${Math.round((d.cost / maxDayCost) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-600">{fmtD(d.day)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Budget burn */}
        <section>
          <SectionTitle>Monthly Budget Burn Rate</SectionTitle>
          <div className="space-y-3">
            {[
              { label: 'Today',                      value: `$${totalCostToday.toFixed(5)}` },
              { label: 'This month (actual)',         value: `$${totalCostMonth.toFixed(4)}` },
              { label: 'Projected month-end',         value: `$${projectedMonth.toFixed(3)}` },
              { label: 'Daily avg (30d)',              value: `$${(totalCost30 / 30).toFixed(4)}` },
              { label: 'Cost per call (30d avg)',      value: rows30.length > 0 ? `$${(totalCost30 / rows30.length).toFixed(5)}` : '—' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm py-2 border-b border-zinc-900">
                <span className="text-zinc-400">{r.label}</span>
                <span className="text-[#C9A84C] font-mono">{r.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            Target: ≤ $0.42/client. At current rate, cost is under control.
            Projected = current spend ÷ days elapsed × days in month.
          </p>
        </section>
      </div>

      {/* Cost by route/task */}
      <section className="mb-14">
        <SectionTitle>Cost by Task — last 30 days</SectionTitle>
        {taskRows.length === 0 ? (
          <div className="text-zinc-600 text-sm">No cost data yet. llm_cost_log table is empty.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  {['Task / Route', 'Calls', 'Tokens in', 'Tokens out', 'Total cost', 'Avg latency'].map(h => (
                    <th key={h} className="py-3 px-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taskRows.map(([task, v]) => (
                  <tr key={task} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{task}</td>
                    <td className="py-3 px-4 text-zinc-400">{v.calls}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.tokensIn.toLocaleString()}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.tokensOut.toLocaleString()}</td>
                    <td className="py-3 px-4 text-[#C9A84C] font-mono">${v.cost.toFixed(5)}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.latencyCount > 0 ? `${Math.round(v.latencySum / v.latencyCount)}ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cost by model */}
      <section className="mb-14">
        <SectionTitle>Cost by Model — last 30 days</SectionTitle>
        {modelRows.length === 0 ? (
          <div className="text-zinc-600 text-sm">No model data yet.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  {['Model', 'Provider', 'Calls', 'Cost USD'].map(h => (
                    <th key={h} className="py-3 px-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelRows.map(([model, v]) => (
                  <tr key={model} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{model}</td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">{v.provider}</td>
                    <td className="py-3 px-4 text-zinc-400">{v.calls}</td>
                    <td className="py-3 px-4 text-[#C9A84C] font-mono">${v.cost.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top 10 users */}
      <section>
        <SectionTitle>Top 10 Most Expensive Users — last 30 days</SectionTitle>
        {topUsers.length === 0 ? (
          <div className="text-zinc-600 text-sm">No per-user cost data yet.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  {['User ID', 'API Calls', 'Total Cost'].map(h => (
                    <th key={h} className="py-3 px-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topUsers.map(([uid, v]) => (
                  <tr key={uid} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-3 px-4">
                      {uid === 'anonymous' ? (
                        <span className="text-zinc-600 font-mono text-xs">anonymous</span>
                      ) : (
                        <Link href={`/admin/users/${uid}`} className="text-zinc-400 font-mono text-xs hover:text-[#C9A84C] transition-colors">
                          {uid.slice(0, 8)}…
                        </Link>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{v.calls}</td>
                    <td className="py-3 px-4 text-[#C9A84C] font-mono">${v.cost.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 px-5 py-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#C9A84C]">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">{children}</h2>;
}
