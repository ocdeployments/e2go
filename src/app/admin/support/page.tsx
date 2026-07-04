import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Ticket {
  id: string;
  user_id: string | null;
  user_email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  application_id: string | null;
  case_code: string | null;
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

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-950/40 text-red-400 border-red-500/30',
  in_progress: 'bg-yellow-950/40 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
  closed: 'bg-zinc-900 text-zinc-500 border-zinc-700',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-zinc-500',
  low: 'bg-zinc-700',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function age(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return '<1h ago';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminSupportPage() {
  await requireAdmin();

  const admin = getAdmin();
  const { data: tickets } = await admin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const typedTickets = (tickets ?? []) as Ticket[];
  const open       = typedTickets.filter(t => t.status === 'open');
  const inProgress = typedTickets.filter(t => t.status === 'in_progress');
  const resolved   = typedTickets.filter(t => ['resolved', 'closed'].includes(t.status));

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-6xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Support Inbox</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Open', count: open.length, cls: 'text-red-400' },
          { label: 'In progress', count: inProgress.length, cls: 'text-yellow-400' },
          { label: 'Resolved', count: resolved.length, cls: 'text-emerald-400' },
        ].map(({ label, count, cls }) => (
          <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-semibold ${cls}`}>{count}</p>
          </div>
        ))}
      </div>

      {typedTickets.length === 0 && (
        <div className="text-zinc-600 text-sm py-16 text-center">No support tickets yet.</div>
      )}

      <div className="space-y-4">
        {typedTickets.map(ticket => (
          <div key={ticket.id} className="border border-zinc-800 bg-zinc-900/20 p-5 rounded-lg">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority] ?? 'bg-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-100 truncate">{ticket.subject}</span>
                <span className={`text-xs px-2 py-0.5 border rounded ${STATUS_STYLES[ticket.status] ?? 'text-zinc-400'}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <span className="text-xs text-zinc-600 flex-shrink-0">{age(ticket.created_at)}</span>
            </div>

            <div className="flex gap-4 text-xs text-zinc-500 mb-3">
              <span>{ticket.user_email}</span>
              <span className="capitalize">{ticket.category}</span>
              <span>{fmtDate(ticket.created_at)}</span>
              {ticket.case_code && (
                <span className="text-[#C9A84C] font-mono">{ticket.case_code}</span>
              )}
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{ticket.message}</p>

            {ticket.admin_notes && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">Admin notes</p>
                <p className="text-sm text-zinc-300">{ticket.admin_notes}</p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <span className="text-xs text-zinc-600 font-mono">{ticket.id.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
