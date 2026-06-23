import { createServiceClient } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

interface PaymentRow {
  id: string;
  user_id: string;
  payment_type: string | null;
  amount_paid: number | null;
  status: string | null;
  completed_at: string | null;
  created_at: string | null;
  stripe_session_id: string | null;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at: string | null;
}

interface ApplicationRow {
  user_id: string;
}

const TIER_LABELS: Record<string, string> = {
  solo: 'Solo ($297)',
  solo_spouse: 'Solo + Spouse ($347)',
  solo_family_2: 'Family-2 ($397)',
  solo_family_5: 'Family-5 ($497)',
  partnership: 'Partnership ($397)',
  partnership_couples: 'Partnership Couples ($447)',
  partnership_families: 'Partnership Families ($547)',
  simulator_3pack: 'Simulator 3-Pack ($29)',
  fdd_intelligence: 'FDD Intelligence ($297)',
  renewal: 'Renewal ($99)',
  child_surcharge: 'Child Surcharge',
};

const STATUS_CLASS: Record<string, string> = {
  completed: 'text-emerald-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
  refunded: 'text-orange-400',
  expired: 'text-zinc-500',
};

function fmt(cents: number | null) {
  if (!cents && cents !== 0) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminPage() {
  const admin = createServiceClient();

  const [
    { data: payments },
    { data: profiles },
    { data: applications },
    { data: { users: authUsers } },
  ] = await Promise.all([
    admin
      .from('payments')
      .select('id, user_id, payment_type, amount_paid, status, completed_at, created_at, stripe_session_id')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('profiles')
      .select('id, first_name, last_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('applications')
      .select('user_id'),
    admin.auth.admin.listUsers({ perPage: 500 }),
  ]);

  const emailByUserId = Object.fromEntries(
    (authUsers ?? []).map((u) => [u.id, u.email ?? ''])
  );

  const appCountByUser = ((applications ?? []) as ApplicationRow[]).reduce<Record<string, number>>(
    (acc, a) => { acc[a.user_id] = (acc[a.user_id] ?? 0) + 1; return acc; },
    {}
  );

  const typedPayments = (payments ?? []) as PaymentRow[];
  const typedProfiles = (profiles ?? []) as ProfileRow[];

  const totalRevenueCents = typedPayments
    .filter((p) => p.status === 'completed')
    .reduce((s, p) => s + (p.amount_paid ?? 0), 0);

  const completedCount = typedPayments.filter((p) => p.status === 'completed').length;
  const totalUsers = authUsers?.length ?? 0;
  const totalApps = applications?.length ?? 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-[#C9A84C] mb-2">Admin Dashboard</h1>
      <p className="text-zinc-500 text-sm mb-10">Live data — refreshes on each page load.</p>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <MetricCard label="Total revenue" value={`$${(totalRevenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <MetricCard label="Completed payments" value={String(completedCount)} />
        <MetricCard label="Total users" value={String(totalUsers)} />
        <MetricCard label="Applications" value={String(totalApps)} />
      </div>

      {/* Recent payments */}
      <section className="mb-14">
        <h2 className="text-lg font-medium text-white mb-4">Recent Payments</h2>
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
              {typedPayments.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-300">{emailByUserId[p.user_id] || p.user_id.slice(0, 8) + '…'}</td>
                  <td className="py-3 px-4 text-zinc-400">{TIER_LABELS[p.payment_type ?? ''] ?? p.payment_type ?? '—'}</td>
                  <td className="py-3 px-4 text-zinc-200">{fmt(p.amount_paid)}</td>
                  <td className={`py-3 px-4 capitalize font-medium ${STATUS_CLASS[p.status ?? ''] ?? 'text-zinc-400'}`}>{p.status ?? '—'}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtDate(p.completed_at ?? p.created_at)}</td>
                </tr>
              ))}
              {typedPayments.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-600">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4">Users</h2>
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
              {typedProfiles.map((p) => (
                <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-300">{emailByUserId[p.id] || '—'}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {p.role === 'admin'
                      ? <span className="text-[#C9A84C] font-medium">admin</span>
                      : <span className="text-zinc-500">user</span>}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{appCountByUser[p.id] ?? 0}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtDate(p.created_at)}</td>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#C9A84C]">{value}</p>
    </div>
  );
}
