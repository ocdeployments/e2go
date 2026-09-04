import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildLifecycleTimeline, LIFECYCLE_TIMELINE_COLUMNS } from '@/lib/lifecycle-timeline';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function fmtD(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
/**
 * case_profiles scores are stored 0-100, not 0-1 — the client-facing case
 * profile renders them verbatim with a percent sign. Both admin pages used to
 * multiply by 100 as well, so a completeness of 70 read as 7000%.
 */
function pct(score: unknown) {
  return typeof score === 'number' ? `${Math.round(score)}%` : '—';
}

function fmtDT(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

export default async function UserViewPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const admin = getAdmin();

  /**
   * Applications first, because `answers` has no user_id — a row is reachable
   * only through the application it belongs to. The query this replaced
   * filtered answers on user_id, errored, and rendered an empty answer list
   * for every user.
   */
  const { data: applications } = await admin
    .from('applications')
    .select('id, status, source, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const applicationIds = (applications ?? []).map((a) => a.id as string);

  const [
    { data: profile },
    { data: authData },
    { data: answers },
    { data: quizSessions },
    { data: simSessions },
    { data: genJobs },
    { data: lifecycle },
    { data: caseProfile },
    { data: documents },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).single(),
    admin.auth.admin.getUserById(userId),
    applicationIds.length
      ? admin.from('answers').select('question_key, answer_value, updated_at').in('application_id', applicationIds).order('updated_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
    admin.from('quiz_sessions').select('id, outcome, application_type, score_breakdown, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(5),
    admin.from('simulator_sessions').select('id, session_number, mode, readiness_indicator, completed_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    admin.from('document_generation_jobs').select('id, application_id, status, current_step_label, total_steps, current_step, updated_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    admin.from('application_lifecycle').select(LIFECYCLE_TIMELINE_COLUMNS).eq('user_id', userId).maybeSingle(),
    admin.from('case_profiles').select('archetype, completeness_score, eligibility_score, business_plan_score, source_of_funds_score, management_role_score, franchise_match_score, updated_at').eq('user_id', userId).maybeSingle(),
    admin.from('generated_documents').select('id, document_type, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ]);

  if (!profile) notFound();

  const timeline = buildLifecycleTimeline(lifecycle as Record<string, unknown> | null);

  const email = authData?.user?.email ?? '—';
  const profileData = profile as Record<string, unknown>;
  const latestApp   = (applications ?? [])[0] as Record<string, unknown> | undefined;
  const latestQuiz  = (quizSessions ?? [])[0] as Record<string, unknown> | undefined;

  const SECTION_KEYS: Record<string, string> = {
    'S1-': 'Story', 'S2-': 'Business', 'S3-': 'Investment',
    'S4-': 'Qualifications', 'S5-': 'Family', 'S6-': 'Ties',
    'M3-': 'Module 3', 'Q-': 'Quiz',
  };

  function sectionLabel(key: string) {
    for (const [prefix, label] of Object.entries(SECTION_KEYS)) {
      if (key.startsWith(prefix)) return label;
    }
    return 'Other';
  }

  const answersBySection: Record<string, Array<{ key: string; value: unknown }>> = {};
  for (const a of (answers ?? []) as Array<{ question_key: string; answer_value: unknown }>) {
    const sec = sectionLabel(a.question_key);
    (answersBySection[sec] ??= []).push({ key: a.question_key, value: a.answer_value });
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-6xl mx-auto">

      {/* Admin-only banner */}
      <div className="mb-6 px-4 py-2 border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-xs text-[#C9A84C] flex items-center gap-3">
        <span className="font-semibold uppercase tracking-widest">Admin Read-Only View</span>
        <span className="text-[#C9A84C]/50">—</span>
        <span className="opacity-60">This is what {email} sees. No actions affect this user&apos;s account.</span>
        <Link href={`/admin/users/${userId}`} className="ml-auto underline opacity-70 hover:opacity-100">
          ← Back to User Detail
        </Link>
      </div>

      {/* Identity */}
      <div className="mb-8 border border-zinc-800 p-6">
        <h1 className="text-xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {String(profileData.first_name ?? '')} {String(profileData.last_name ?? '')}
        </h1>
        <p className="text-zinc-500 text-sm mb-4">{email}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Account tier" value={String(profileData.role ?? '—')} />
          <Stat label="Joined" value={fmtD(profileData.created_at as string | null)} />
          <Stat label="Applications" value={String((applications ?? []).length)} />
          <Stat label="Archetype" value={String((caseProfile as Record<string, unknown> | null)?.archetype ?? '—')} />
        </div>
      </div>

      {/* Case profile snapshot */}
      {caseProfile && (
        <Section title="Case Profile">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <Stat label="Completeness"     value={pct((caseProfile as Record<string, unknown>).completeness_score)} />
            <Stat label="Archetype"        value={String((caseProfile as Record<string, unknown>).archetype ?? '—')} />
            <Stat label="Last updated"     value={fmtD((caseProfile as Record<string, unknown>).updated_at as string | null)} />
            <Stat label="Eligibility"      value={pct((caseProfile as Record<string, unknown>).eligibility_score)} />
            <Stat label="Business plan"    value={pct((caseProfile as Record<string, unknown>).business_plan_score)} />
            <Stat label="Source of funds"  value={pct((caseProfile as Record<string, unknown>).source_of_funds_score)} />
            <Stat label="Management role"  value={pct((caseProfile as Record<string, unknown>).management_role_score)} />
            <Stat label="Franchise match"  value={pct((caseProfile as Record<string, unknown>).franchise_match_score)} />
          </div>
        </Section>
      )}

      {/* Application status */}
      {latestApp && (
        <Section title="Latest Application">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Status" value={String(latestApp.status ?? '—')} />
            <Stat label="Source" value={String(latestApp.source ?? '—')} />
            <Stat label="Created" value={fmtD(latestApp.created_at as string | null)} />
            <Stat label="Updated" value={fmtDT(latestApp.updated_at as string | null)} />
          </div>
        </Section>
      )}

      {/* Quiz result */}
      {latestQuiz && (
        <Section title="Latest Quiz Result">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Outcome" value={String(latestQuiz.outcome ?? '—')} />
            <Stat label="Type" value={String(latestQuiz.application_type ?? '—')} />
            <Stat label="Completed" value={fmtD(latestQuiz.completed_at as string | null)} />
          </div>
        </Section>
      )}

      {/* Answers by section */}
      {Object.keys(answersBySection).length > 0 && (
        <Section title="Case File Answers">
          {Object.entries(answersBySection).map(([sec, items]) => (
            <div key={sec} className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-[#C9A84C]/60 mb-3">{sec}</h3>
              <div className="space-y-2">
                {items.map(({ key, value }) => (
                  <div key={key} className="flex gap-4 text-sm border-b border-zinc-900 pb-2">
                    <span className="font-mono text-xs text-zinc-600 w-40 shrink-0">{key}</span>
                    <span className="text-zinc-300 break-all">
                      {value === null || value === undefined ? <span className="text-zinc-700">—</span>
                        : typeof value === 'object' ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Simulator sessions */}
      {(simSessions ?? []).length > 0 && (
        <Section title="Simulator Sessions">
          <div className="space-y-2">
            {(simSessions as Array<Record<string, unknown>>).map(s => (
              <div key={s.id as string} className="flex items-center gap-4 text-sm border-b border-zinc-900 py-2">
                <span className="text-zinc-500 w-6">#{s.session_number as number}</span>
                <span className="text-zinc-400 capitalize">{String(s.mode ?? '—')}</span>
                <span className={`text-xs px-2 py-0.5 border ${
                  s.readiness_indicator === 'ready' ? 'border-emerald-500/30 text-emerald-400'
                  : s.readiness_indicator === 'nearly_ready' ? 'border-yellow-500/30 text-yellow-400'
                  : 'border-red-500/30 text-red-400'
                }`}>{String(s.readiness_indicator ?? 'incomplete')}</span>
                <span className="text-zinc-600 text-xs ml-auto">{fmtD(s.completed_at as string | null)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Generation jobs */}
      {(genJobs ?? []).length > 0 && (
        <Section title="Generation Jobs">
          <div className="space-y-2">
            {(genJobs as Array<Record<string, unknown>>).map(j => (
              <div key={j.id as string} className="flex items-center gap-4 text-sm border-b border-zinc-900 py-2">
                <span className={`text-xs px-2 py-0.5 border ${
                  j.status === 'completed' ? 'border-emerald-500/30 text-emerald-400'
                  : j.status === 'failed' ? 'border-red-500/30 text-red-400'
                  : 'border-yellow-500/30 text-yellow-400'
                }`}>{String(j.status)}</span>
                <span className="text-zinc-400 text-xs">{String(j.current_step_label ?? '—')}</span>
                <span className="text-zinc-600 text-xs ml-auto">{fmtDT(j.updated_at as string | null)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Lifecycle */}
      {timeline.length > 0 && (
        <Section title="Milestones">
          <div className="space-y-1">
            {timeline.map(m => (
              <div key={m.key} className="flex items-center gap-4 text-xs border-b border-zinc-900 py-1.5">
                <span className="text-[#C9A84C]/70">{m.label}</span>
                <span className="text-zinc-600 ml-auto">{fmtDT(m.at)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Documents */}
      {(documents ?? []).length > 0 && (
        <Section title="Generated Documents">
          <div className="flex flex-wrap gap-2">
            {(documents as Array<Record<string, unknown>>).map(d => (
              <span key={d.id as string} className="text-xs px-2 py-1 border border-zinc-800 text-zinc-400">
                {String(d.document_type)}
              </span>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 pb-2 border-b border-zinc-900">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-600 mb-1">{label}</div>
      <div className="text-sm text-zinc-300">{value}</div>
    </div>
  );
}
