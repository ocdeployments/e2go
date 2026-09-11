import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface InterestRow {
  id: string;
  email: string;
  interest_type: 'partnership' | 'renewal';
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  partnership: 'Partnership',
  renewal: 'Renewal',
};

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

function fmtD(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function ComingSoonInterestPage() {
  await requireAdmin();

  const admin = getAdmin();
  const { data: rows } = await admin
    .from('coming_soon_interest')
    .select('id, email, interest_type, created_at')
    .order('created_at', { ascending: false });

  const interest: InterestRow[] = rows ?? [];
  const partnershipCount = interest.filter((r) => r.interest_type === 'partnership').length;
  const renewalCount = interest.filter((r) => r.interest_type === 'renewal').length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Coming Soon Interest</h1>
        <span className="text-zinc-500 text-sm">Partnership &amp; renewal leads captured while those features are paused</span>
        <div className="ml-auto">
          <Link href="/admin" className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors">
            ← Command Center
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <div className="border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs text-[#C9A84C] uppercase tracking-widest font-semibold mb-2">Partnership</p>
          <p className="text-2xl text-white">{partnershipCount}</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs text-[#C9A84C] uppercase tracking-widest font-semibold mb-2">Renewal</p>
          <p className="text-2xl text-white">{renewalCount}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">
          All interest ({interest.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="py-3 px-4 font-normal">Email</th>
                <th className="py-3 px-4 font-normal">Interested in</th>
                <th className="py-3 px-4 font-normal">Captured</th>
              </tr>
            </thead>
            <tbody>
              {interest.map((row) => (
                <tr key={row.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-200">{row.email}</td>
                  <td className="py-3 px-4 text-zinc-400">{TYPE_LABELS[row.interest_type] ?? row.interest_type}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtD(row.created_at)}</td>
                </tr>
              ))}
              {interest.length === 0 && (
                <tr><td colSpan={3} className="py-8 text-center text-zinc-600">No interest captured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
