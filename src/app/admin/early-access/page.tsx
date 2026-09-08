import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface LeadRow {
  id: string;
  email: string;
  name: string;
  country: string;
  filing_timeline: string;
  source: string;
  created_at: string;
}

const TIMELINE_LABELS: Record<string, string> = {
  asap: 'ASAP',
  '1_3_months': '1–3 months',
  '3_6_months': '3–6 months',
  '6_12_months': '6–12 months',
  exploring: 'Just exploring',
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function EarlyAccessLeadsPage() {
  await requireAdmin();

  const admin = getAdmin();
  const { data: leads } = await admin
    .from('early_access_leads')
    .select('id, email, name, country, filing_timeline, source, created_at')
    .order('created_at', { ascending: false });

  const rows: LeadRow[] = leads ?? [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Early Access Leads</h1>
        <span className="text-zinc-500 text-sm">Prospective clients from the public sign-up form</span>
        <div className="ml-auto">
          <Link href="/admin" className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors">
            ← Command Center
          </Link>
        </div>
      </div>

      <div className="border border-zinc-800 bg-zinc-900/40 p-5 mb-8">
        <p className="text-xs text-[#C9A84C] uppercase tracking-widest font-semibold mb-2">Public sign-up link</p>
        <p className="text-sm text-zinc-400">
          Post this link anywhere prospective clients can find it — Facebook groups, forums, DMs:
        </p>
        <code className="block mt-2 text-[#C9A84C] font-mono text-sm">https://e2go.app/early-access</code>
      </div>

      <section>
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">
          All leads ({rows.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="py-3 px-4 font-normal">Name</th>
                <th className="py-3 px-4 font-normal">Email</th>
                <th className="py-3 px-4 font-normal">Country</th>
                <th className="py-3 px-4 font-normal">Filing timeline</th>
                <th className="py-3 px-4 font-normal">Source</th>
                <th className="py-3 px-4 font-normal">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(lead => (
                <tr key={lead.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-200">{lead.name}</td>
                  <td className="py-3 px-4 text-zinc-400">{lead.email}</td>
                  <td className="py-3 px-4 text-zinc-400">{lead.country}</td>
                  <td className="py-3 px-4 text-zinc-400">{TIMELINE_LABELS[lead.filing_timeline] ?? lead.filing_timeline}</td>
                  <td className="py-3 px-4 text-zinc-500 text-xs capitalize">{lead.source.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4 text-zinc-500">{fmtD(lead.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-zinc-600">No leads yet — share the sign-up link above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
