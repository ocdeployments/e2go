import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AdminControls from './AdminControls';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string; user_id: string; tier: string | null; payment_type: string | null;
  amount_cents: number | null; amount_paid: number | null;
  status: string | null; completed_at: string | null; created_at: string | null;
}

interface ProfileRow {
  id: string; first_name: string | null; last_name: string | null;
  role: string | null; created_at: string | null;
}

interface ApplicationRow { user_id: string; status?: string | null; updated_at?: string | null }
interface CostRow { cost_usd: number; model: string; created_at: string }
interface JobRow {
  id: string; application_id: string; status: string;
  current_step: number; total_steps: number; current_step_label: string; updated_at: string;
}
interface SettingRow { key: string; value: string }
interface LifecycleRow { user_id: string; updated_at: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const TIER_LABELS: Record<string, string> = {
  solo: 'Solo ($197)', solo_spouse: 'Solo+Spouse ($347)',
  solo_family_2: 'Family-2 ($397)', solo_family_5: 'Family-5 ($497)',
  partnership: 'Partnership ($397)', partnership_couples: 'Partnership Couples ($447)',
  partnership_families: 'Partnership Families ($547)',
  simulator_3pack: 'Simulator 3-Pack ($29)', fdd_intelligence: 'FDD ($297)',
  renewal: 'Renewal ($99)',
};

const STATUS_CLS: Record<string, string> = {
  completed: 'text-emerald-400', pending: 'text-yellow-400',
  failed: 'text-red-400', refunded: 'text-orange-400', expired: 'text-zinc-500',
};

function fmt(cents: number | null)   { return cents ? `$${(cents / 100).toFixed(2)}` : '—'; }
function fmtD(iso: string | null)    { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function daysAgo(iso: string)        { return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000); }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const admin = getAdmin();

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const inactiveCutoff = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  const [
    { data: payments },
    { data: profiles },
    { data: applications },
    { data: { users: authUsers } },
    { data: monthCosts },
    { data: todayCosts },
    { data: activeJobs },
    { data: stuckJobs },
    { data: settings },
    { data: recentLifecycle },
  ] = await Promise.all([
    admin.from('payments').select('id, user_id, tier, payment_type, amount_cents, amount_paid, status, completed_at, created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('profiles').select('id, first_name, last_name, role, created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('applications').select('user_id, status, updated_at'),
    admin.auth.admin.listUsers({ perPage: 500 }),
    admin.from('llm_cost_log').select('cost_usd, model, created_at').gte('created_at', monthStart),
    admin.from('llm_cost_log').select('cost_usd').gte('created_at', todayStart),
    admin.from('document_generation_jobs').select('id, application_id, status, current_step, total_steps, current_step_label, updated_at').eq('status', 'running'),
    admin.from('document_generation_jobs').select('id, application_id, current_step_label, updated_at').eq('status', 'running').lt('updated_at', stuckCutoff),
    admin.from('app_settings').select('key, value').in('key', ['kill_switch_enabled', 'maintenance_mode']),
    admin.from('application_lifecycle').select('user_id, updated_at').order('updated_at', { ascending: false }),
  ]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const emailById   = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email ?? '']));
  const appsByUser  = ((applications ?? []) as ApplicationRow[]).reduce<Record<string, ApplicationRow[]>>(
    (acc, a) => { (acc[a.user_id] ??= []).push(a); return acc; }, {}
  );

  const typedPayments  = (payments  ?? []) as PaymentRow[];
  const typedProfiles  = (profiles  ?? []) as ProfileRow[];
  const typedSettings  = Object.fromEntries(((settings ?? []) as SettingRow[]).map(r => [r.key, r.value]));

  const totalRevenue  = typedPayments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount_cents ?? p.amount_paid ?? 0), 0);
  const completedPmts = typedPayments.filter(p => p.status === 'completed').length;
  const totalUsers    = authUsers?.length ?? 0;

  // LLM cost
  const monthCostUsd = ((monthCosts ?? []) as CostRow[]).reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const todayCostUsd = ((todayCosts ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const daysElapsed  = now.getDate();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedEnd = daysElapsed > 0 ? (monthCostUsd / daysElapsed) * daysInMonth : 0;

  // Model breakdown
  const modelMap: Record<string, number> = {};
  for (const r of (monthCosts ?? []) as CostRow[]) {
    modelMap[r.model] = (modelMap[r.model] ?? 0) + (r.cost_usd ?? 0);
  }
  const topModels = Object.entries(modelMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Stuck users — paid users inactive 7+ days with an application
  const lastActivityByUser = Object.fromEntries(
    ((recentLifecycle ?? []) as LifecycleRow[]).reduce<[string, string][]>((acc, r) => {
      if (!acc.find(e => e[0] === r.user_id)) acc.push([r.user_id, r.updated_at]);
      return acc;
    }, [])
  );

  const paidUserIds = new Set(typedPayments.filter(p => p.status === 'completed').map(p => p.user_id));
  const stuckUsers  = typedProfiles
    .filter(p => {
      if (!paidUserIds.has(p.id)) return false;
      if (!(appsByUser[p.id]?.length)) return false;
      const lastActivity = lastActivityByUser[p.id];
      return lastActivity ? new Date(lastActivity) < new Date(inactiveCutoff) : true;
    })
    .slice(0, 10);

  const killSwitchOn  = typedSettings['kill_switch_enabled']  === 'true';
  const maintenanceOn = typedSettings['maintenance_mode'] === 'true';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Admin Command Center</h1>
        <span className="text-zinc-500 text-sm">Live data — refreshes on load</span>
        <div className="ml-auto flex gap-3">
          <Link href="/admin/revenue" className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors">
            Revenue →
          </Link>
          <Link href="/admin/quality" className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors">
            Quality →
          </Link>
          <Link href="/admin/system-status" className="text-xs text-[#C9A84C] border border-[#C9A84C]/20 px-3 py-1.5 hover:bg-[#C9A84C]/5 transition-colors">
            System Status →
          </Link>
        </div>
      </div>

      {/* Status banners */}
      {killSwitchOn && (
        <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-sm">
          Kill switch is ON — all AI features are disabled.
        </div>
      )}
      {maintenanceOn && (
        <div className="mb-6 p-3 bg-yellow-950/40 border border-yellow-500/30 text-yellow-400 text-sm">
          Maintenance mode is ON — users see a maintenance banner.
        </div>
      )}

      {/* Controls (client component for interactive toggles) */}
      <AdminControls killSwitchOn={killSwitchOn} maintenanceOn={maintenanceOn} />

      {/* ── Overview metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        <MetricCard label="Total revenue"      value={`$${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <MetricCard label="Paid customers"     value={String(completedPmts)} />
        <MetricCard label="Total users"        value={String(totalUsers)} />
        <MetricCard label="LLM cost today"     value={`$${todayCostUsd.toFixed(4)}`} sub="actual" />
        <MetricCard label="LLM cost this month" value={`$${monthCostUsd.toFixed(3)}`} sub={`proj $${projectedEnd.toFixed(2)}`} />
      </div>

      {/* ── LLM Cost Intelligence ── */}
      <section className="mb-14">
        <SectionTitle>API Cost Intelligence</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Spend by model — this month</div>
            {topModels.length === 0 && (
              <div className="text-zinc-600 text-sm">No cost data yet — llm_cost_log table is empty. Costs will appear after the first LLM call.</div>
            )}
            {topModels.map(([model, cost]) => (
              <div key={model} className="flex items-center gap-3 py-2 border-b border-zinc-900">
                <code className="text-[10px] text-[#C9A84C] w-44 truncate">{model}</code>
                <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden">
                  <div className="h-full bg-[#C9A84C]/60 rounded" style={{ width: `${Math.min(100, (cost / (monthCostUsd || 1)) * 100)}%` }} />
                </div>
                <span className="text-xs text-zinc-400 w-20 text-right">${cost.toFixed(5)}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Monthly summary</div>
            <div className="space-y-3">
              {[
                { label: 'Today',            value: `$${todayCostUsd.toFixed(5)}` },
                { label: 'This month',       value: `$${monthCostUsd.toFixed(4)}` },
                { label: 'Projected month-end', value: `$${projectedEnd.toFixed(2)}` },
                { label: 'Cost per paid user (est)', value: monthCostUsd > 0 && completedPmts > 0 ? `$${(monthCostUsd / completedPmts).toFixed(3)}` : '—' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm py-2 border-b border-zinc-900">
                  <span className="text-zinc-400">{r.label}</span>
                  <span className="text-[#C9A84C] font-mono">{r.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-4">Target: ≤ $0.42/client. At current cost, margin is healthy. Alert fires if balance drops below threshold.</p>
          </div>
        </div>
      </section>

      {/* ── Generation Pipeline ── */}
      <section className="mb-14">
        <SectionTitle>Generation Pipeline</SectionTitle>
        {(stuckJobs ?? []).length > 0 && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 text-sm">
            <span className="text-red-400 font-semibold">{(stuckJobs ?? []).length} stuck job(s)</span>
            <span className="text-zinc-400"> — running &gt;30 min without progress. Go to </span>
            <Link href="/admin/system-status" className="text-red-400 underline">System Status</Link>
            <span className="text-zinc-400"> to force-fail.</span>
          </div>
        )}
        {(activeJobs ?? []).length === 0 && (stuckJobs ?? []).length === 0 ? (
          <div className="text-zinc-600 text-sm">No active generation jobs.</div>
        ) : (
          <div className="space-y-2">
            {((activeJobs ?? []) as JobRow[]).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 border border-zinc-800 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-zinc-300 flex-1">{job.current_step_label}</span>
                <span className="text-zinc-500 text-xs">{job.current_step}/{job.total_steps} steps</span>
                <span className="text-zinc-600 text-xs">{job.application_id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Stuck Users ── */}
      <section className="mb-14">
        <SectionTitle>Stuck Users — paid, inactive 7+ days</SectionTitle>
        {stuckUsers.length === 0 ? (
          <div className="text-zinc-600 text-sm">No stuck users detected.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-4 font-normal">Email</th>
                  <th className="py-3 px-4 font-normal">Name</th>
                  <th className="py-3 px-4 font-normal">Applications</th>
                  <th className="py-3 px-4 font-normal">Last Activity</th>
                  <th className="py-3 px-4 font-normal">Days Inactive</th>
                </tr>
              </thead>
              <tbody>
                {stuckUsers.map(p => {
                  const lastAct = lastActivityByUser[p.id];
                  return (
                    <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                      <td className="py-3 px-4 text-zinc-300">{emailById[p.id] || '—'}</td>
                      <td className="py-3 px-4 text-zinc-400">{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-3 px-4 text-zinc-400">{appsByUser[p.id]?.length ?? 0}</td>
                      <td className="py-3 px-4 text-zinc-500">{lastAct ? fmtD(lastAct) : 'Never'}</td>
                      <td className="py-3 px-4 text-yellow-500 font-medium">{lastAct ? daysAgo(lastAct) : '?'}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent Payments ── */}
      <section className="mb-14">
        <SectionTitle>Recent Payments</SectionTitle>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="py-3 px-4 font-normal">User</th>
                <th className="py-3 px-4 font-normal">Tier</th>
                <th className="py-3 px-4 font-normal">Amount</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {typedPayments.slice(0, 50).map(p => (
                <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-300">{emailById[p.user_id] || p.user_id.slice(0, 8) + '…'}</td>
                  <td className="py-3 px-4 text-zinc-400">{TIER_LABELS[p.tier ?? p.payment_type ?? ''] ?? p.tier ?? p.payment_type ?? '—'}</td>
                  <td className="py-3 px-4 text-zinc-200">{fmt(p.amount_cents ?? p.amount_paid)}</td>
                  <td className={`py-3 px-4 capitalize font-medium ${STATUS_CLS[p.status ?? ''] ?? 'text-zinc-400'}`}>{p.status ?? '—'}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtD(p.completed_at ?? p.created_at)}</td>
                </tr>
              ))}
              {typedPayments.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-600">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Users ── */}
      <section>
        <SectionTitle>Users</SectionTitle>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="py-3 px-4 font-normal">Email</th>
                <th className="py-3 px-4 font-normal">Name</th>
                <th className="py-3 px-4 font-normal">Role</th>
                <th className="py-3 px-4 font-normal">Apps</th>
                <th className="py-3 px-4 font-normal">Joined</th>
              </tr>
            </thead>
            <tbody>
              {typedProfiles.map(p => (
                <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-300">{emailById[p.id] || '—'}</td>
                  <td className="py-3 px-4 text-zinc-400">{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td className="py-3 px-4">
                    {p.role === 'admin'
                      ? <span className="text-[#C9A84C] font-medium">admin</span>
                      : <span className="text-zinc-500">user</span>}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{appsByUser[p.id]?.length ?? 0}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtD(p.created_at)}</td>
                </tr>
              ))}
              {typedProfiles.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-600">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#C9A84C]">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">{children}</h2>;
}
