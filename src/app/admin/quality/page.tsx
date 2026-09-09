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

type PipelineLogRow = {
  document_type: string;
  stage3_detection_score: number | null;
  stage3_attempts: number | null;
  final_status: string | null;
  /** The pipeline log has no created_at; this is when the run began. */
  pipeline_started_at: string;
};

type JobRow = {
  status: string;
  created_at: string;
};

type FddRow = {
  extraction_status: string | null;
  flag_count: number | null;
  extracted_fields: Record<string, unknown> | null;
  created_at: string;
};

type NpsRow = {
  score: number;
  created_at: string;
};

type SimRow = {
  user_id: string;
  readiness_indicator: string | null;
  completed_at: string | null;
};

type ReleaseRow = {
  released_at: string | null;
  acknowledged_at: string | null;
  applicant_acknowledged: boolean | null;
};

function pct(n: number, total: number) {
  if (total === 0) return '—';
  return Math.round((n / total) * 100) + '%';
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function fmtScore(n: number | null) {
  if (n === null) return '—';
  return (n * 100).toFixed(1) + '%';
}

function countFddFields(fields: Record<string, unknown> | null): number {
  if (!fields) return 0;
  return Object.values(fields).filter(v => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'object' && 'value' in v) return (v as { value: unknown }).value !== null;
    return true;
  }).length;
}

/**
 * Low-confidence field count, derived rather than read back.
 *
 * The extraction engine computes this number and streams it to the client, but
 * never writes it: `fdd_analyses` has no low_confidence_count column, so the
 * select naming it errored and the whole FDD panel read as empty. The stored
 * `extracted_fields` carries the same per-field `_conf` marks the engine counts
 * from, so the number is recoverable from what was saved — no column needed.
 */
function countLowConfidenceFields(fields: Record<string, unknown> | null): number {
  if (!fields) return 0;
  return Object.values(fields).filter(
    (v) => typeof v === 'object' && v !== null && (v as { _conf?: string })._conf === 'low'
  ).length;
}

// PROMPT VERSION REGISTRY — update this whenever a prompt changes
const PROMPT_REGISTRY = [
  { route: '/api/simulator/evaluate', model: 'xiaomi/mimo-v2.5 → gemini-2.5-flash → claude-haiku', version: 'v3 (Jun 2026)', notes: 'Added KB knowledge + document cross-reference' },
  { route: '/api/simulator/coaching-report', model: 'z-ai/glm-5.2 → mimo-v2.5-pro → gemini-2.5-pro', version: 'v3 (Jul 2026)', notes: 'Multi-session memory, cross-session coaching' },
  { route: '/api/simulator/follow-up', model: 'xiaomi/mimo-v2.5', version: 'v1 (May 2026)', notes: 'Single-turn probe on weak answers' },
  { route: '/api/faq/ask', model: 'xiaomi/mimo-v2.5 → gemini-2.5-flash', version: 'v2 (Jun 2026)', notes: 'Removed Anthropic fallback; OpenRouter-only' },
  { route: 'FDD engines (extract/report/territory/questions/score)', model: 'claude-opus-4-8 → claude-sonnet-5 → z-ai/glm-5.2', version: 'v3 (Jul 2026)', notes: '50-field schema, territory analysis, FDD chain via callFDDModel' },
  { route: 'generation-engine (doc gen)', model: 'claude-opus-4-8; non-business-plan fallback glm-5.2 → mimo → mimo-pro → gemini-2.5-pro', version: 'v4 (Jul 2026)', notes: 'KB injection, humanization loop, consistency gate' },
  { route: '/api/gap-analysis', model: 'xiaomi/mimo-v2.5-pro', version: 'v1 (May 2026)', notes: 'Case profile build + gap scoring' },
];

export default async function QualityPage() {
  await requireAdmin();
  const admin = getAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

  const [
    { data: pipelineLogs },
    { data: allJobs },
    { data: fddRows },
    { data: npsRows },
    { data: simRows },
    { data: releaseRows },
  ] = await Promise.all([
    admin.from('generation_pipeline_log')
      .select('document_type, stage3_detection_score, stage3_attempts, final_status, pipeline_started_at')
      .gte('pipeline_started_at', thirtyDaysAgo)
      .order('pipeline_started_at', { ascending: false }),
    admin.from('document_generation_jobs')
      .select('status, created_at')
      .gte('created_at', thirtyDaysAgo),
    admin.from('fdd_analyses')
      .select('extraction_status, flag_count, extracted_fields, created_at')
      .gte('created_at', thirtyDaysAgo),
    admin.from('nps_scores')
      .select('score, created_at')
      .gte('created_at', thirtyDaysAgo)
      .then(r => r, () => ({ data: null, error: null })),
    admin.from('simulator_sessions')
      .select('user_id, readiness_indicator, completed_at')
      .gte('created_at', thirtyDaysAgo),
    admin.from('generation_pipeline_log')
      .select('released_at, acknowledged_at, applicant_acknowledged')
      .not('released_at', 'is', null)
      .gte('pipeline_started_at', thirtyDaysAgo),
  ]);

  const logs      = (pipelineLogs ?? []) as PipelineLogRow[];
  const jobs      = (allJobs ?? []) as JobRow[];
  const fdds      = (fddRows ?? []) as FddRow[];
  const nps       = (npsRows ?? []) as NpsRow[];
  const sims      = (simRows ?? []) as SimRow[];
  const releases  = (releaseRows ?? []) as ReleaseRow[];

  // ── Generation quality ────────────────────────────────────────────────────
  const logsWithScore = logs.filter(l => l.stage3_detection_score !== null);
  const aiScores = logsWithScore.map(l => l.stage3_detection_score as number);
  const avgAiScore = avg(aiScores);

  const consistencyFailed = logs.filter(l => l.final_status === 'FAILED').length;
  const consistencyTotal  = logs.filter(l => l.final_status !== null).length;

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const revisionJobs  = jobs.filter(j => j.status === 'revision_requested').length;
  const failedJobs    = jobs.filter(j => j.status === 'failed').length;

  const attemptsAll = logs.filter(l => l.stage3_attempts !== null).map(l => l.stage3_attempts as number);
  const avgAttempts = avg(attemptsAll);

  // AI score distribution
  const scoreBuckets = { low: 0, medium: 0, high: 0 };
  for (const s of aiScores) {
    if (s < 0.3) scoreBuckets.low++;
    else if (s < 0.7) scoreBuckets.medium++;
    else scoreBuckets.high++;
  }

  // ── FDD quality ───────────────────────────────────────────────────────────
  const extractedFdds = fdds.filter(f => f.extraction_status === 'extracted');
  const fieldCounts = extractedFdds.map(f => countFddFields(f.extracted_fields));
  const avgFields = avg(fieldCounts);
  const belowThresholdCount = fieldCounts.filter(n => n < 5).length;
  const avgFlags = avg(extractedFdds.map(f => f.flag_count ?? 0));
  const avgLowConf = avg(extractedFdds.map(f => countLowConfidenceFields(f.extracted_fields)));

  // ── NPS ───────────────────────────────────────────────────────────────────
  const npsTotal = nps.length;
  const promoters  = nps.filter(n => n.score >= 9).length;
  const detractors = nps.filter(n => n.score <= 6).length;
  const npsScore   = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : null;

  // ── Simulator engagement ──────────────────────────────────────────────────
  const totalSimSessions  = sims.length;
  const completedSims     = sims.filter(s => s.completed_at !== null).length;
  const simCompletionRate = totalSimSessions > 0 ? Math.round((completedSims / totalSimSessions) * 100) : null;
  const readyCounts       = { ready: 0, nearly_ready: 0, needs_work: 0 };
  for (const s of sims.filter(s => s.readiness_indicator)) {
    const k = s.readiness_indicator as keyof typeof readyCounts;
    if (k in readyCounts) readyCounts[k]++;
  }
  const uniqueSimUsers    = new Set(sims.map(s => s.user_id)).size;
  const avgSimsPerUser    = uniqueSimUsers > 0 ? (totalSimSessions / uniqueSimUsers).toFixed(1) : '—';

  /**
   * ── Package acknowledgement rate ─────────────────────────────────────────
   *
   * This was a download rate, built on a downloaded_at column that does not
   * exist — so both counts read zero and the panel was never true. Nothing
   * anywhere records a file download.
   *
   * What the pipeline log does record is release (documents made available)
   * and acknowledgement (the client confirming they have seen them). That is a
   * slightly different question from "did they collect the files", and the
   * labels say so rather than borrowing the old word.
   */
  const releasedCount     = releases.length;
  const acknowledgedCount = releases.filter(
    r => r.applicant_acknowledged === true || r.acknowledged_at !== null,
  ).length;
  const ackRate = releasedCount > 0 ? Math.round((acknowledgedCount / releasedCount) * 100) : null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Quality & Growth Intelligence</h1>
        <span className="text-zinc-500 text-sm">Last 30 days · refreshes on load</span>
        <Link href="/admin" className="ml-auto text-xs text-zinc-500 hover:text-[#C9A84C] transition-colors">← Admin</Link>
      </div>

      {/* ── Generation Quality ── */}
      <Section title="Document Generation Quality">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Metric label="Avg humanization score" value={fmtScore(avgAiScore)}
            sub={avgAiScore !== null ? (avgAiScore < 0.3 ? 'Good — looks human' : avgAiScore < 0.7 ? 'Borderline' : '⚠ Detected as AI') : undefined} />
          <Metric label="Avg humanization passes" value={avgAttempts !== null ? avgAttempts.toFixed(1) : '—'} sub="target ≤ 2" />
          <Metric label="Consistency gate failed" value={pct(consistencyFailed, consistencyTotal)} sub={`${consistencyFailed} of ${consistencyTotal} docs`} />
          <Metric label="Revision request rate" value={pct(revisionJobs, totalJobs)} sub={`${revisionJobs} of ${totalJobs} jobs`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-4">
          {/* Job status breakdown */}
          <div>
            <h3 className="text-sm text-zinc-400 mb-3 uppercase tracking-widest">Job Status Breakdown</h3>
            {totalJobs === 0 ? (
              <p className="text-zinc-600 text-sm">No jobs in this period.</p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Completed', n: completedJobs, color: '#C9A84C' },
                  { label: 'Revision requested', n: revisionJobs, color: '#f59e0b' },
                  { label: 'Failed', n: failedJobs, color: '#ef4444' },
                  { label: 'Other', n: totalJobs - completedJobs - revisionJobs - failedJobs, color: '#6b7280' },
                ].map(({ label, n, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-36">{label}</span>
                    <div className="flex-1 h-2 bg-zinc-900">
                      <div className="h-full" style={{ width: `${totalJobs ? Math.round((n / totalJobs) * 100) : 0}%`, background: color }} />
                    </div>
                    <span className="text-xs text-zinc-300 w-8 text-right font-mono">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI detection score distribution */}
          <div>
            <h3 className="text-sm text-zinc-400 mb-3 uppercase tracking-widest">AI Detection Score Distribution</h3>
            {aiScores.length === 0 ? (
              <p className="text-zinc-600 text-sm">No scored documents in this period.</p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: '< 0.3 (looks human)', n: scoreBuckets.low, color: '#22c55e' },
                  { label: '0.3–0.7 (borderline)', n: scoreBuckets.medium, color: '#f59e0b' },
                  { label: '> 0.7 (AI detected)', n: scoreBuckets.high, color: '#ef4444' },
                ].map(({ label, n, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-40">{label}</span>
                    <div className="flex-1 h-2 bg-zinc-900">
                      <div className="h-full" style={{ width: `${aiScores.length ? Math.round((n / aiScores.length) * 100) : 0}%`, background: color }} />
                    </div>
                    <span className="text-xs text-zinc-300 w-8 text-right font-mono">{n}</span>
                  </div>
                ))}
                <p className="text-xs text-zinc-600 mt-2">Target: &gt;80% of docs scoring below 0.3</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── FDD Extraction Quality ── */}
      <Section title="FDD Extraction Quality">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Metric label="FDDs analysed" value={String(extractedFdds.length)} />
          <Metric label="Avg fields extracted" value={avgFields !== null ? avgFields.toFixed(1) : '—'}
            sub={belowThresholdCount > 0 ? `⚠ ${belowThresholdCount} FDD(s) < 5 fields` : 'All above threshold'} />
          <Metric label="Avg risk flags" value={avgFlags !== null ? avgFlags.toFixed(1) : '—'} sub="per FDD" />
          <Metric label="Avg low-confidence fields" value={avgLowConf !== null ? avgLowConf.toFixed(1) : '—'} sub="target ≤ 3" />
        </div>

        {belowThresholdCount > 0 && (
          <div className="border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400 mb-4">
            ⚠ Alert: {belowThresholdCount} FDD extraction{belowThresholdCount > 1 ? 's' : ''} returned fewer than 5 fields.
            Check the FDD upload quality and extraction prompt — this may indicate corrupted PDFs or a prompt regression.
          </div>
        )}

        {extractedFdds.length === 0 && (
          <p className="text-zinc-600 text-sm">No FDDs extracted in this period.</p>
        )}
      </Section>

      {/* ── NPS ── */}
      <Section title="Net Promoter Score">
        {npsTotal === 0 ? (
          <div>
            <p className="text-zinc-500 text-sm mb-4">No NPS responses yet. Add the <code className="text-[#C9A84C]">nps_scores</code> table and prompt users post-download to start collecting.</p>
            <details className="text-xs text-zinc-600">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 mb-2">SQL to create nps_scores table</summary>
              <pre className="bg-zinc-900 p-4 rounded text-zinc-400 overflow-x-auto">{`CREATE TABLE IF NOT EXISTS nps_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text,
  trigger_event text   -- 'post_download', 'post_simulator', etc.
);`}</pre>
            </details>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="NPS score" value={npsScore !== null ? String(npsScore) : '—'}
              sub={npsScore !== null ? (npsScore >= 50 ? 'Excellent' : npsScore >= 0 ? 'Good' : 'Needs improvement') : undefined} />
            <Metric label="Responses" value={String(npsTotal)} />
            <Metric label="Promoters (9–10)" value={String(promoters)} sub={pct(promoters, npsTotal)} />
            <Metric label="Detractors (0–6)" value={String(detractors)} sub={pct(detractors, npsTotal)} />
          </div>
        )}
      </Section>

      {/* ── Simulator Engagement ── */}
      <Section title="Simulator Engagement">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Metric label="Sessions (30d)" value={String(totalSimSessions)} sub={`${uniqueSimUsers} unique users`} />
          <Metric label="Avg sessions/user" value={avgSimsPerUser} sub="30-day window" />
          <Metric label="Completion rate" value={simCompletionRate !== null ? `${simCompletionRate}%` : '—'} sub={`${completedSims} of ${totalSimSessions} completed`} />
          <Metric label="Ready outcomes" value={readyCounts.ready > 0 || totalSimSessions > 0 ? String(readyCounts.ready) : '—'} sub={`${readyCounts.nearly_ready} nearly ready · ${readyCounts.needs_work} needs work`} />
        </div>
        {totalSimSessions === 0 && (
          <p className="text-zinc-600 text-sm">No simulator sessions in the last 30 days.</p>
        )}
      </Section>

      {/* ── Package Acknowledgement Rate ── */}
      <Section title="Package Acknowledgement Rate">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Metric label="Released" value={String(releasedCount)} sub="Packages made available (30d)" />
          <Metric label="Acknowledged" value={String(acknowledgedCount)} sub="Clients who confirmed receipt" />
          <Metric label="Acknowledgement rate" value={ackRate !== null ? `${ackRate}%` : '—'}
            sub={ackRate !== null ? (ackRate >= 80 ? 'Strong' : ackRate >= 50 ? 'Moderate — investigate drop-off' : '⚠ Low — funnel leak after release') : 'No data yet'} />
        </div>
        {releasedCount === 0 && (
          <p className="text-zinc-600 text-sm">No packages released in the last 30 days.</p>
        )}
      </Section>

      {/* ── Prompt Version Registry ── */}
      <Section title="Prompt Version Registry">
        <p className="text-xs text-zinc-600 mb-4">Updated manually each time a prompt changes. Source of truth for audit trail and model assignments.</p>
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                {['Route / Engine', 'Model(s)', 'Version', 'Notes'].map(h => (
                  <th key={h} className="py-3 px-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROMPT_REGISTRY.map(r => (
                <tr key={r.route} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="py-3 px-4 text-zinc-300 font-mono text-xs">{r.route}</td>
                  <td className="py-3 px-4 text-[#C9A84C] text-xs">{r.model}</td>
                  <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">{r.version}</td>
                  <td className="py-3 px-4 text-zinc-500 text-xs">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 px-5 py-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#C9A84C]">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}
