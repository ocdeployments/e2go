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

const TIER_PRICES: Record<string, number> = {
  complete:                   149500,
  complete_partnership:       249500,
  interview_prep:             34700,
  interview_prep_partnership: 49500,
  fdd_intelligence:           57500,
  fdd_intelligence_loyalty:   37500,
  simulator_3pack:            4900,
  renewal:                    9900,
};

const TIER_LABELS: Record<string, string> = {
  complete:                   'Complete ($1,495)',
  complete_partnership:       'Complete — Partnership ($2,495)',
  interview_prep:             'Interview Prep ($347)',
  interview_prep_partnership: 'Interview Prep — Partnership ($495)',
  fdd_intelligence:           'FDD Intelligence ($575)',
  fdd_intelligence_loyalty:   'FDD Intelligence Loyalty ($375)',
  simulator_3pack:            'Simulator 3-Pack ($49)',
  renewal:                    'Renewal ($99)',
};

type PaymentRow = {
  id: string; user_id: string; tier: string | null; payment_type: string | null;
  amount_cents: number | null; amount_paid: number | null;
  status: string | null; created_at: string;
};

/**
 * application_lifecycle holds one row per client, not a stream of events. The
 * milestones below are timestamp columns on that row; a null means the client
 * has not reached that stage.
 */
type LifecycleRow = {
  user_id: string;
  updated_at: string | null;
  quiz_completed_at: string | null;
  module3_started_at: string | null;
};

function fmtUsd(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMonth(iso: string) {
  return new Date(iso + '-01').toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export default async function RevenuePage() {
  await requireAdmin();
  const admin = getAdmin();
  const now = new Date();

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const inactiveCutoff = new Date(Date.now() - 14 * 24 * 3600000).toISOString();

  const [
    { data: allPayments },
    { data: lifecycle },
    { count: quizCount },
    { count: genCompleted },
  ] = await Promise.all([
    admin.from('payments').select('id, user_id, tier, payment_type, amount_cents, amount_paid, status, created_at').eq('status', 'completed').order('created_at', { ascending: true }),
    admin.from('application_lifecycle').select('user_id, updated_at, quiz_completed_at, module3_started_at'),
    admin.from('quiz_sessions').select('id', { count: 'exact', head: true }),
    admin.from('document_generation_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ]);

  const payments = (allPayments ?? []) as PaymentRow[];
  const lifecycleRows = (lifecycle ?? []) as LifecycleRow[];

  // ── Revenue math ──────────────────────────────────────────────────────────
  const getAmount = (p: PaymentRow) => p.amount_cents ?? p.amount_paid ?? (TIER_PRICES[p.tier ?? p.payment_type ?? ''] ?? 0);
  const allRevCents = payments.reduce((s, p) => s + getAmount(p), 0);

  const thisMonthPayments = payments.filter(p => p.created_at >= thisMonthStart);
  const lastMonthPayments = payments.filter(p => p.created_at >= lastMonthStart && p.created_at < thisMonthStart);
  const thisMonthRevCents = thisMonthPayments.reduce((s, p) => s + getAmount(p), 0);
  const lastMonthRevCents = lastMonthPayments.reduce((s, p) => s + getAmount(p), 0);

  const momChange = lastMonthRevCents > 0
    ? Math.round(((thisMonthRevCents - lastMonthRevCents) / lastMonthRevCents) * 100)
    : null;

  // ── Revenue by tier ───────────────────────────────────────────────────────
  const tierMap: Record<string, { count: number; rev: number }> = {};
  for (const p of payments) {
    const key = p.tier ?? p.payment_type ?? 'unknown';
    if (!tierMap[key]) tierMap[key] = { count: 0, rev: 0 };
    tierMap[key].count++;
    tierMap[key].rev += getAmount(p);
  }
  const tierRows = Object.entries(tierMap)
    .map(([tier, d]) => ({ tier, label: TIER_LABELS[tier] ?? tier, ...d }))
    .sort((a, b) => b.rev - a.rev);

  // ── Monthly revenue for last 6 months ────────────────────────────────────
  const monthlyMap: Record<string, number> = {};
  for (const p of payments.filter(p => p.created_at >= last6MonthsStart)) {
    const m = p.created_at.slice(0, 7); // 'YYYY-MM'
    monthlyMap[m] = (monthlyMap[m] ?? 0) + getAmount(p);
  }
  const monthlyRows = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b));
  const maxMonthRev = Math.max(1, ...monthlyRows.map(([, v]) => v));

  // ── Revenue projection (linear on monthly data) ───────────────────────────
  const mValues = monthlyRows.map(([, v]) => v);
  const avgGrowthCents = mValues.length >= 2
    ? mValues.slice(1).reduce((s, v, i) => s + (v - mValues[i]), 0) / (mValues.length - 1)
    : 0;
  const lastMonthRevForProj = mValues[mValues.length - 1] ?? 0;
  const projected3m = lastMonthRevForProj + avgGrowthCents * 3;
  const projected6m = lastMonthRevForProj + avgGrowthCents * 6;

  // ── LTV by tier ───────────────────────────────────────────────────────────
  const ltvRows = tierRows.map(r => ({
    ...r,
    ltv: r.count > 0 ? Math.round(r.rev / r.count) : 0,
  }));

  // ── Churn signals — paid users inactive 14+ days ─────────────────────────
  const paidUserIds = new Set(payments.map(p => p.user_id));
  const lastActivityByUser: Record<string, string> = {};
  for (const row of lifecycleRows) {
    if (row.updated_at) lastActivityByUser[row.user_id] = row.updated_at;
  }
  const churnSignals = Array.from(paidUserIds)
    .filter(uid => {
      const last = lastActivityByUser[uid];
      return !last || last < inactiveCutoff;
    })
    .slice(0, 10);

  // ── Conversion funnel ─────────────────────────────────────────────────────
  const quizStarted  = quizCount ?? 0;
  const quizCompleted = lifecycleRows.filter(r => r.quiz_completed_at !== null).length;
  const paymentMade  = payments.length;
  const caseActive   = lifecycleRows.filter(r => r.module3_started_at !== null).length;
  const docsGenerated = genCompleted ?? 0;
  const funnel = [
    { label: 'Quiz started',    n: quizStarted },
    { label: 'Quiz completed',  n: quizCompleted },
    { label: 'Payment made',    n: paymentMade },
    { label: 'Case file active', n: caseActive },
    { label: 'Docs generated',  n: docsGenerated },
  ];
  const funnelMax = Math.max(1, funnel[0].n);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Revenue Intelligence</h1>
        <span className="text-zinc-500 text-sm">All paid payments · refreshes on load</span>
        <Link href="/admin" className="ml-auto text-xs text-zinc-500 hover:text-[#C9A84C] transition-colors">← Admin</Link>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <MetricCard label="All-time revenue"     value={fmtUsd(allRevCents)} />
        <MetricCard label="This month"           value={fmtUsd(thisMonthRevCents)} sub={momChange !== null ? `${momChange > 0 ? '+' : ''}${momChange}% vs last month` : undefined} />
        <MetricCard label="Last month"           value={fmtUsd(lastMonthRevCents)} />
        <MetricCard label="Total transactions"   value={String(payments.length)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
        {/* Monthly sparkline */}
        <section>
          <SectionTitle>Monthly Revenue — last 6 months</SectionTitle>
          {monthlyRows.length === 0 ? (
            <div className="text-zinc-600 text-sm">No payment data in this period.</div>
          ) : (
            <div className="space-y-2">
              {monthlyRows.map(([m, v]) => (
                <div key={m} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-16">{fmtMonth(m)}</span>
                  <div className="flex-1 h-2 bg-zinc-900">
                    <div className="h-full bg-[#C9A84C]/60" style={{ width: `${Math.round((v / maxMonthRev) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-zinc-300 w-24 text-right font-mono">{fmtUsd(v)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Projection */}
        <section>
          <SectionTitle>Revenue Projection</SectionTitle>
          <div className="space-y-3">
            {[
              { label: 'This month (actual)',     value: fmtUsd(thisMonthRevCents) },
              { label: 'Projected +3 months',    value: projected3m > 0 ? fmtUsd(projected3m) : '—' },
              { label: 'Projected +6 months',    value: projected6m > 0 ? fmtUsd(projected6m) : '—' },
              { label: 'Avg monthly growth',     value: avgGrowthCents !== 0 ? fmtUsd(Math.abs(avgGrowthCents)) + (avgGrowthCents > 0 ? '/mo ↑' : '/mo ↓') : '—' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm py-2 border-b border-zinc-900">
                <span className="text-zinc-400">{r.label}</span>
                <span className="text-[#C9A84C] font-mono">{r.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-4">Linear trend on last {monthlyRows.length} months of data. Add more customers for higher projection accuracy.</p>
        </section>
      </div>

      {/* Revenue by tier */}
      <section className="mb-14">
        <SectionTitle>Revenue &amp; LTV by Tier</SectionTitle>
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                {['Tier', 'Sales', 'Revenue', 'LTV (avg/customer)'].map(h => (
                  <th key={h} className="py-3 px-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ltvRows.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-zinc-600">No payment data yet.</td></tr>
              )}
              {ltvRows.map(r => (
                <tr key={r.tier} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="py-3 px-4 text-zinc-300">{r.label}</td>
                  <td className="py-3 px-4 text-zinc-400">{r.count}</td>
                  <td className="py-3 px-4 text-[#C9A84C] font-mono">{fmtUsd(r.rev)}</td>
                  <td className="py-3 px-4 text-zinc-300 font-mono">{fmtUsd(r.ltv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conversion funnel */}
      <section className="mb-14">
        <SectionTitle>Conversion Funnel</SectionTitle>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const prev = i > 0 ? funnel[i - 1].n : null;
            const dropPct = prev && prev > 0 ? Math.round(((prev - step.n) / prev) * 100) : null;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-32">{step.label}</span>
                <div className="flex-1 h-3 bg-zinc-900">
                  <div className="h-full bg-[#C9A84C]/50" style={{ width: `${Math.round((step.n / funnelMax) * 100)}%` }} />
                </div>
                <span className="text-xs text-zinc-300 w-10 text-right font-mono">{step.n}</span>
                {dropPct !== null && (
                  <span className="text-xs text-red-500 w-16">−{dropPct}%</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-600 mt-4">Drop-off % = users lost at each step vs previous step. Biggest leak = biggest growth opportunity.</p>
      </section>

      {/* Churn signals */}
      <section>
        <SectionTitle>Churn Signals — paid users inactive 14+ days</SectionTitle>
        {churnSignals.length === 0 ? (
          <div className="text-zinc-600 text-sm">No at-risk users detected. All paid users have been active in the last 14 days.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-4 font-normal">User ID</th>
                  <th className="py-3 px-4 font-normal">Last Activity</th>
                  <th className="py-3 px-4 font-normal">Days Inactive</th>
                </tr>
              </thead>
              <tbody>
                {churnSignals.map(uid => {
                  const last = lastActivityByUser[uid];
                  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : '?';
                  return (
                    <tr key={uid} className="border-b border-zinc-900">
                      <td className="py-3 px-4 text-zinc-400 font-mono text-xs">{uid.slice(0, 8)}…</td>
                      <td className="py-3 px-4 text-zinc-500">{last ? new Date(last).toLocaleDateString() : 'Never'}</td>
                      <td className="py-3 px-4 text-yellow-500 font-medium">{days}d</td>
                    </tr>
                  );
                })}
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
