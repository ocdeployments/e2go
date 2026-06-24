import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TierOverridePanel from './TierOverridePanel';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; role: string | null; created_at: string | null };
type ApplicationRow = { id: string; status: string | null; source: string | null; created_at: string | null };
type PaymentRow = { id: string; tier: string | null; payment_type: string | null; amount_cents: number | null; amount_paid: number | null; status: string | null; created_at: string | null };
type QuizRow = { id: string; outcome: string | null; application_type: string | null; completed_at: string | null };
type SimRow = { id: string; readiness_indicator: string | null; completed_at: string | null };
type JobRow = { id: string; status: string; current_step_label: string; updated_at: string };
type LifecycleRow = { id: string; event: string; created_at: string; details?: Record<string, unknown> | null };
type CostRow = { task: string | null; cost_usd: number; tokens_in: number | null; tokens_out: number | null };
type AuditRow = { id: string; admin_user_id: string; action: string; details: Record<string, unknown> | null; created_at: string };
type CaseProfileRow = { archetype: string | null; completeness_score: number | null; updated_at: string | null };

const TIER_LABELS: Record<string, string> = {
  solo: 'Solo ($550)',
  solo_spouse: 'Solo+Spouse ($697)',
  solo_family_2: 'Family-2 ($750)',
  solo_family_5: 'Family-5 ($797)',
  partnership: 'Partnership ($997)',
  partnership_couples: 'Partnership+Couples ($1,297)',
  partnership_families: 'Partnership+Families ($1,397)',
  fdd_intelligence: 'FDD Intelligence ($297)',
  simulator_3pack: 'Simulator 3-Pack ($29.99)',
  renewal: 'Renewal ($497)',
};

function fmtD(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
function fmtDT(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}
function fmtAmt(cents: number | null, paid: number | null) {
  const v = cents ?? paid;
  return v !== null ? `$${(v / 100).toFixed(2)}` : '—';
}

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const admin = getAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

  const [
    { data: profile },
    { data: authUserData },
    { data: applications },
    { data: payments },
    { data: quizSessions },
    { data: simSessions },
    { data: genJobs },
    { data: lifecycle },
    { data: rawCosts },
    { data: auditLogs },
    { data: caseProfile },
  ] = await Promise.all([
    admin.from('profiles').select('id, first_name, last_name, role, created_at').eq('id', userId).single(),
    admin.auth.admin.getUserById(userId),
    admin.from('applications').select('id, status, source, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    admin.from('payments').select('id, tier, payment_type, amount_cents, amount_paid, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    admin.from('quiz_sessions').select('id, outcome, application_type, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(3),
    admin.from('simulation_sessions').select('id, readiness_indicator, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(3),
    admin.from('document_generation_jobs').select('id, status, current_step_label, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(3),
    admin.from('application_lifecycle').select('id, event, created_at, details').eq('user_id', userId).order('created_at', { ascending: false }),
    admin.from('llm_cost_log').select('task, cost_usd, tokens_in, tokens_out').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
    admin.from('admin_audit_log').select('id, admin_user_id, action, details, created_at').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('case_profiles').select('archetype, completeness_score, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).single(),
  ]);

  if (!profile) notFound();

  const authUser = authUserData?.user;
  const typedProfile = profile as ProfileRow;
  const typedApps = (applications ?? []) as ApplicationRow[];
  const typedPayments = (payments ?? []) as PaymentRow[];
  const typedQuiz = (quizSessions ?? []) as QuizRow[];
  const typedSims = (simSessions ?? []) as SimRow[];
  const typedJobs = (genJobs ?? []) as JobRow[];
  const typedLifecycle = (lifecycle ?? []) as LifecycleRow[];
  const typedAudit = (auditLogs ?? []) as AuditRow[];
  const typedProfile2 = caseProfile as CaseProfileRow | null;

  // LLM cost by task
  const costByTask: Record<string, { calls: number; cost: number; tokensIn: number; tokensOut: number }> = {};
  for (const row of (rawCosts ?? []) as CostRow[]) {
    const key = row.task ?? 'unknown';
    if (!costByTask[key]) costByTask[key] = { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0 };
    costByTask[key].calls++;
    costByTask[key].cost += row.cost_usd ?? 0;
    costByTask[key].tokensIn += row.tokens_in ?? 0;
    costByTask[key].tokensOut += row.tokens_out ?? 0;
  }
  const costRows = Object.entries(costByTask).sort((a, b) => b[1].cost - a[1].cost);
  const totalCost = costRows.reduce((s, [, v]) => s + v.cost, 0);

  // Payment total
  const totalPaid = typedPayments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + (p.amount_cents ?? p.amount_paid ?? 0), 0);

  // Latest tier (first completed payment)
  const latestPayment = typedPayments.find(p => p.status === 'completed');
  const tierKey = latestPayment?.tier ?? latestPayment?.payment_type ?? null;
  const tierLabel = tierKey ? (TIER_LABELS[tierKey] ?? tierKey) : 'None';

  const name = [typedProfile.first_name, typedProfile.last_name].filter(Boolean).join(' ') || 'Unknown';
  const email = authUser?.email ?? '—';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1">
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-[#C9A84C] transition-colors mb-3 inline-block">← Admin</Link>
          <h1 className="text-2xl font-semibold text-[#C9A84C]">{name}</h1>
          <p className="text-zinc-400 text-sm mt-1">{email}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {typedProfile.role === 'admin' && (
              <span className="text-[9px] px-2 py-0.5 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 uppercase tracking-widest font-semibold">admin</span>
            )}
            {tierKey && (
              <span className="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-widest">{tierLabel}</span>
            )}
            {!tierKey && (
              <span className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-600 border border-zinc-800 uppercase tracking-widest">no tier</span>
            )}
          </div>
        </div>
        <div className="text-xs text-zinc-600 text-right">
          <div>User ID: <code className="text-zinc-500">{userId.slice(0, 8)}…</code></div>
          <div className="mt-1">Joined: {fmtD(typedProfile.created_at)}</div>
        </div>
      </div>

      {/* Profile snapshot */}
      <section className="mb-10">
        <SectionTitle>Profile Snapshot</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Current tier"       value={tierLabel} />
          <Stat label="Applications"       value={String(typedApps.length)} />
          <Stat label="Total paid"         value={totalPaid > 0 ? `$${(totalPaid / 100).toFixed(2)}` : '$0'} />
          <Stat label="Archetype"          value={typedProfile2?.archetype ?? '—'} />
          <Stat label="Completeness"       value={typedProfile2?.completeness_score != null ? `${Math.round(typedProfile2.completeness_score * 100)}%` : '—'} />
          <Stat label="Quiz sessions"      value={String(typedQuiz.length)} />
          <Stat label="Sim sessions"       value={String(typedSims.length)} />
          <Stat label="AI cost (30d)"      value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : '$0'} />
        </div>
      </section>

      {/* Application timeline */}
      <section className="mb-10">
        <SectionTitle>Application Timeline</SectionTitle>
        {typedLifecycle.length === 0 ? (
          <div className="text-zinc-600 text-sm">No lifecycle events recorded.</div>
        ) : (
          <div className="relative pl-4 border-l border-zinc-800 space-y-3 max-h-80 overflow-y-auto">
            {typedLifecycle.slice(0, 50).map(ev => (
              <div key={ev.id} className="flex gap-3 items-baseline">
                <div className="w-2 h-2 rounded-full bg-[#C9A84C]/40 flex-shrink-0 mt-1 -ml-5" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-zinc-300">{ev.event.replace(/_/g, ' ')}</span>
                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <span className="text-[10px] text-zinc-600 ml-2">({JSON.stringify(ev.details).slice(0, 60)})</span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">{fmtDT(ev.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Financial */}
      <section className="mb-10">
        <SectionTitle>Financial — Payments</SectionTitle>
        {typedPayments.length === 0 ? (
          <div className="text-zinc-600 text-sm">No payment records.</div>
        ) : (
          <>
            <div className="overflow-x-auto border border-zinc-800 mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                    {['Tier', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} className="py-3 px-4 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {typedPayments.map(p => (
                    <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                      <td className="py-3 px-4 text-zinc-300">{TIER_LABELS[p.tier ?? p.payment_type ?? ''] ?? p.tier ?? p.payment_type ?? '—'}</td>
                      <td className="py-3 px-4 text-[#C9A84C] font-mono">{fmtAmt(p.amount_cents, p.amount_paid)}</td>
                      <td className={`py-3 px-4 capitalize font-medium ${p.status === 'completed' ? 'text-emerald-400' : p.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>{p.status ?? '—'}</td>
                      <td className="py-3 px-4 text-zinc-500">{fmtD(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-zinc-400">
              Total paid: <span className="text-[#C9A84C] font-mono">${(totalPaid / 100).toFixed(2)}</span>
            </div>
          </>
        )}
      </section>

      {/* AI Usage */}
      <section className="mb-10">
        <SectionTitle>AI Usage — last 30 days</SectionTitle>
        {costRows.length === 0 ? (
          <div className="text-zinc-600 text-sm">No AI usage recorded in the last 30 days.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  {['Task', 'Calls', 'Tokens in', 'Tokens out', 'Cost USD'].map(h => (
                    <th key={h} className="py-3 px-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costRows.map(([task, v]) => (
                  <tr key={task} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{task}</td>
                    <td className="py-3 px-4 text-zinc-400">{v.calls}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.tokensIn.toLocaleString()}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.tokensOut.toLocaleString()}</td>
                    <td className="py-3 px-4 text-[#C9A84C] font-mono">${v.cost.toFixed(5)}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-700">
                  <td colSpan={4} className="py-3 px-4 text-zinc-400 font-medium">Total</td>
                  <td className="py-3 px-4 text-[#C9A84C] font-mono font-semibold">${totalCost.toFixed(5)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Generation jobs */}
      <section className="mb-10">
        <SectionTitle>Generation Jobs — last 3</SectionTitle>
        {typedJobs.length === 0 ? (
          <div className="text-zinc-600 text-sm">No generation jobs found.</div>
        ) : (
          <div className="space-y-2">
            {typedJobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 p-3 border border-zinc-800 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${job.status === 'completed' ? 'bg-emerald-400' : job.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <span className="text-zinc-400 capitalize flex-shrink-0 w-20">{job.status}</span>
                <span className="text-zinc-300 flex-1 truncate">{job.current_step_label}</span>
                <span className="text-zinc-600 text-xs">{fmtDT(job.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Simulator sessions */}
      <section className="mb-10">
        <SectionTitle>Simulator Sessions — last 3</SectionTitle>
        {typedSims.length === 0 ? (
          <div className="text-zinc-600 text-sm">No simulator sessions.</div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-4 font-normal">Readiness</th>
                  <th className="py-3 px-4 font-normal">Completed</th>
                </tr>
              </thead>
              <tbody>
                {typedSims.map(s => (
                  <tr key={s.id} className="border-b border-zinc-900">
                    <td className={`py-3 px-4 font-medium ${s.readiness_indicator === 'high' ? 'text-emerald-400' : s.readiness_indicator === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.readiness_indicator ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">{fmtD(s.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin audit log */}
      <section className="mb-10">
        <SectionTitle>Admin Actions — audit log</SectionTitle>
        {typedAudit.length === 0 ? (
          <div className="text-zinc-600 text-sm">No admin actions recorded for this account.</div>
        ) : (
          <div className="space-y-2">
            {typedAudit.map(a => (
              <div key={a.id} className="flex items-baseline gap-4 py-2 border-b border-zinc-900 text-sm">
                <span className="text-[#C9A84C] font-mono text-xs flex-shrink-0">{a.action.replace(/_/g, ' ')}</span>
                <span className="text-zinc-500 text-xs truncate flex-1">{a.details ? JSON.stringify(a.details).slice(0, 80) : ''}</span>
                <span className="text-zinc-700 text-[10px] flex-shrink-0">{fmtDT(a.created_at)}</span>
                <span className="text-zinc-700 text-[10px] flex-shrink-0">by {a.admin_user_id.slice(0, 6)}…</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="mb-10">
        <SectionTitle>Danger Zone</SectionTitle>
        <TierOverridePanel userId={userId} currentTier={tierKey} />
      </section>

    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">{children}</h2>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-base font-semibold text-[#C9A84C] truncate">{value || '—'}</p>
    </div>
  );
}
