import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

interface BrandView { brand_slug: string; brand_name: string | null; created_at: string }
interface BrokerRequest { user_email: string; user_name: string | null; match_categories: string[]; requested_at: string }
interface BrokerReferral { user_id: string | null; created_at: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function AdminFranchisePage() {
  await requireAdmin();

  const admin = getAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: brandViews },
    { data: brokerRequests },
    { data: brokerReferrals },
  ] = await Promise.all([
    admin.from('franchise_brand_views').select('brand_slug, brand_name, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('broker_requests').select('user_email, user_name, match_categories, requested_at').order('requested_at', { ascending: false }).limit(100),
    admin.from('broker_referrals').select('user_id, created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  const typedViews    = (brandViews ?? []) as BrandView[];
  const typedRequests = (brokerRequests ?? []) as BrokerRequest[];
  const typedReferrals = (brokerReferrals ?? []) as BrokerReferral[];

  // Top brands by views
  const viewsByBrand: Record<string, { name: string; count: number }> = {};
  for (const v of typedViews) {
    if (!viewsByBrand[v.brand_slug]) viewsByBrand[v.brand_slug] = { name: v.brand_name ?? v.brand_slug, count: 0 };
    viewsByBrand[v.brand_slug].count++;
  }
  const topBrands = Object.entries(viewsByBrand).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  const maxViews = topBrands[0]?.[1].count ?? 1;

  // Conversion funnel
  const uniqueViewers  = new Set(typedViews.map(v => v.brand_slug)).size; // unique brands viewed
  const totalViews     = typedViews.length;
  const totalRequests  = typedRequests.length;
  const totalReferrals = typedReferrals.length;

  // Today
  const viewsToday = typedViews.filter(v => new Date(v.created_at) >= todayStart).length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-6xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Franchise Funnel</h1>
      </div>

      {/* Funnel overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Brand page views', value: String(totalViews) },
          { label: 'Views today', value: String(viewsToday) },
          { label: 'Broker requests', value: String(totalRequests) },
          { label: 'Referrals sent', value: String(totalReferrals) },
        ].map(({ label, value }) => (
          <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-semibold text-[#C9A84C]">{value}</p>
          </div>
        ))}
      </div>

      {/* Conversion rate */}
      {totalViews > 0 && (
        <div className="mb-10 p-4 border border-zinc-800 bg-zinc-900/20 rounded-lg">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Funnel conversion</p>
          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-2xl font-mono text-zinc-100">{totalViews}</p>
              <p className="text-xs text-zinc-500 mt-1">Brand views</p>
            </div>
            <span className="text-zinc-700 text-lg">→</span>
            <div className="text-center">
              <p className="text-2xl font-mono text-zinc-100">{totalRequests}</p>
              <p className="text-xs text-zinc-500 mt-1">Broker requests</p>
            </div>
            <span className="text-zinc-700 text-lg">→</span>
            <div className="text-center">
              <p className="text-2xl font-mono text-[#C9A84C]">{totalReferrals}</p>
              <p className="text-xs text-zinc-500 mt-1">Referrals sent</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-lg font-mono text-[#C9A84C]">{totalViews > 0 ? ((totalReferrals / totalViews) * 100).toFixed(1) : '0.0'}%</p>
              <p className="text-xs text-zinc-500">view → referral rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Top brands */}
      <section className="mb-12">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Top brands by page views</h2>
        {topBrands.length === 0 ? (
          <p className="text-zinc-600 text-sm">No brand views tracked yet.</p>
        ) : (
          <div className="space-y-3">
            {topBrands.map(([slug, { name, count }]) => (
              <div key={slug} className="flex items-center gap-4">
                <span className="text-sm text-zinc-300 w-40 truncate">{name}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
                  <div className="h-full bg-[#C9A84C]/60 rounded" style={{ width: `${(count / maxViews) * 100}%` }} />
                </div>
                <span className="text-xs text-zinc-400 w-8 text-right">{count}</span>
                <code className="text-xs text-zinc-600">{slug}</code>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent broker requests */}
      <section className="mb-12">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Recent broker requests</h2>
        {typedRequests.length === 0 ? (
          <p className="text-zinc-600 text-sm">No broker requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-4 font-normal">User</th>
                  <th className="py-3 px-4 font-normal">Name</th>
                  <th className="py-3 px-4 font-normal">Categories</th>
                  <th className="py-3 px-4 font-normal">Requested</th>
                </tr>
              </thead>
              <tbody>
                {typedRequests.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="py-3 px-4 text-zinc-300">{r.user_email}</td>
                    <td className="py-3 px-4 text-zinc-400">{r.user_name || '—'}</td>
                    <td className="py-3 px-4 text-zinc-400">{r.match_categories?.join(', ') || '—'}</td>
                    <td className="py-3 px-4 text-zinc-500">{fmtDate(r.requested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Unique brands viewed */}
      <div className="p-4 border border-zinc-800 rounded-lg text-sm text-zinc-500">
        <strong className="text-zinc-300">{uniqueViewers}</strong> unique franchise brands have been viewed.
        {' '}<strong className="text-zinc-300">{totalReferrals}</strong> users consented to broker introductions.
      </div>
    </main>
  );
}
