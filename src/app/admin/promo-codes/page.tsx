import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PromoCodeForm from './PromoCodeForm';
import PromoCodeRowActions from './PromoCodeRowActions';

export const dynamic = 'force-dynamic';

interface PromoCodeRow {
  id: string;
  code: string;
  code_type: 'shared' | 'personal';
  assigned_email: string | null;
  discount_percent: number;
  applicable_tiers: string[] | null;
  max_redemptions: number | null;
  active: boolean;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  redemptions: number;
}

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

function fmtD(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default async function PromoCodesPage() {
  await requireAdmin();

  // Fetch directly rather than round-tripping through our own API route —
  // this is a server component with the same admin client the route uses.
  const admin = getAdmin();
  const [{ data: codes }, { data: redemptions }] = await Promise.all([
    admin.from('promo_codes')
      .select('id, code, code_type, assigned_email, discount_percent, applicable_tiers, max_redemptions, active, expires_at, note, created_at')
      .order('created_at', { ascending: false }),
    admin.from('promo_redemptions').select('promo_code_id, status'),
  ]);

  const redemptionCounts = new Map<string, number>();
  for (const r of redemptions ?? []) {
    if (r.status === 'pending' || r.status === 'completed') {
      redemptionCounts.set(r.promo_code_id, (redemptionCounts.get(r.promo_code_id) ?? 0) + 1);
    }
  }

  const rows: PromoCodeRow[] = (codes ?? []).map(c => ({
    ...c,
    redemptions: redemptionCounts.get(c.id) ?? 0,
  }));

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Promo Codes</h1>
        <span className="text-zinc-500 text-sm">Create and manage discount codes — no CLI required</span>
        <div className="ml-auto">
          <Link href="/admin" className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors">
            ← Command Center
          </Link>
        </div>
      </div>

      <PromoCodeForm />

      <section>
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">All codes</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="py-3 px-4 font-normal">Code</th>
                <th className="py-3 px-4 font-normal">Type</th>
                <th className="py-3 px-4 font-normal">Discount</th>
                <th className="py-3 px-4 font-normal">Assigned to</th>
                <th className="py-3 px-4 font-normal">Applies to</th>
                <th className="py-3 px-4 font-normal">Redeemed</th>
                <th className="py-3 px-4 font-normal">Expires</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                const capped = c.max_redemptions !== null && c.redemptions >= c.max_redemptions;
                return (
                  <tr key={c.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <code className="text-[#C9A84C] font-mono">{c.code}</code>
                      {c.note && <p className="text-[10px] text-zinc-600 mt-0.5">{c.note}</p>}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 capitalize">{c.code_type}</td>
                    <td className="py-3 px-4 text-zinc-200">{c.discount_percent}%</td>
                    <td className="py-3 px-4 text-zinc-500">{c.assigned_email ?? '—'}</td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">
                      {c.applicable_tiers && c.applicable_tiers.length > 0 ? c.applicable_tiers.join(', ') : 'All packages'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {c.redemptions}{c.max_redemptions !== null ? ` / ${c.max_redemptions}` : ''}
                    </td>
                    <td className={`py-3 px-4 ${expired ? 'text-red-400' : 'text-zinc-500'}`}>{fmtD(c.expires_at)}</td>
                    <td className="py-3 px-4">
                      {!c.active ? (
                        <span className="text-zinc-500">Deactivated</span>
                      ) : expired ? (
                        <span className="text-red-400">Expired</span>
                      ) : capped ? (
                        <span className="text-yellow-400">Limit reached</span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <PromoCodeRowActions id={c.id} active={c.active} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-zinc-600">No promo codes yet — create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
