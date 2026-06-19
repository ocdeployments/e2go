'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis, FddCompatibility } from '@/types/fdd';
import type { DimensionScore, OdeAssessment, TimingAssessment } from '@/lib/fdd-scoring-engine';

// ============================================================================
// Types for persisted e2_score shape
// ============================================================================

interface PersistedE2Score {
  overall: FddCompatibility;
  dimensions: {
    eligibility_gates: DimensionScore;
    investment_substantiality: DimensionScore;
    non_marginality: DimensionScore;
    develop_and_direct: DimensionScore;
  };
  timing_assessment: TimingAssessment;
  ode_assessment: OdeAssessment;
  narrative: {
    OVERALL_VERDICT?: string;
    STRENGTHS?: string;
    CONCERNS?: string;
    ATTORNEY_NOTE?: string;
  };
  flags: string[];
}

// ============================================================================
// Helpers
// ============================================================================

const COMPATIBILITY_CONFIG: Record<FddCompatibility, { label: string; color: string; bg: string; border: string }> = {
  STRONG:    { label: 'STRONG',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  VIABLE:    { label: 'VIABLE',    color: 'text-[#C9A84C]',  bg: 'bg-[#C9A84C]/10',  border: 'border-[#C9A84C]/30' },
  CAUTION:   { label: 'CAUTION',   color: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/30' },
  INELIGIBLE:{ label: 'INELIGIBLE',color: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30' },
};

const RESULT_CONFIG: Record<string, { dot: string; label: string }> = {
  pass:    { dot: 'bg-emerald-400', label: 'Pass' },
  warn:    { dot: 'bg-amber-400',   label: 'Review' },
  fail:    { dot: 'bg-red-400',     label: 'Fail' },
  unknown: { dot: 'bg-white/20',    label: 'Unknown' },
};

// ============================================================================
// Sub-components
// ============================================================================

function DimensionCard({ dim }: { dim: DimensionScore }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RESULT_CONFIG[dim.result] ?? RESULT_CONFIG.unknown;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-white text-sm font-medium">{dim.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${cfg.dot.replace('bg-', 'text-').replace('/10', '').replace('/20', '')} uppercase tracking-wide`}>
            {cfg.label}
          </span>
          <span className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {dim.checks.map((check, i) => {
            const ccfg = RESULT_CONFIG[check.result] ?? RESULT_CONFIG.unknown;
            return (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <span className="text-white/70 text-xs font-medium">{check.check}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${ccfg.dot}`} />
                    <span className="text-white/40 text-xs">{check.value}</span>
                  </div>
                </div>
                <p className="text-white/40 text-xs leading-relaxed">{check.note}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OdePanel({ ode }: { ode: OdeAssessment }) {
  const cfg = RESULT_CONFIG[ode.result] ?? RESULT_CONFIG.unknown;

  function fmt(n: number | null) {
    if (n === null) return '—';
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString();
  }

  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/70 text-xs uppercase tracking-widest">Owner Income Model (ODE)</h3>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className="text-white/40 text-xs">{cfg.label}</span>
        </div>
      </div>

      {(ode.ode_low !== null || ode.ode_mid !== null || ode.ode_high !== null) ? (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Conservative', value: ode.ode_low },
            { label: 'Mid-case', value: ode.ode_mid },
            { label: 'Optimistic', value: ode.ode_high },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/3 rounded-lg p-3 text-center">
              <div className={`text-sm font-medium mb-1 ${value !== null && value < 0 ? 'text-red-400' : 'text-white'}`}>
                {fmt(value)}
              </div>
              <div className="text-white/30 text-xs">{label}</div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-white/50 text-xs leading-relaxed">{ode.note}</p>
      {(ode.ode_mid !== null) && (
        <p className="text-white/30 text-xs mt-2">
          Estimated from Item 19 AUV less royalties, marketing fees, rent, labor, and debt service. Not a guarantee of income.
        </p>
      )}
    </div>
  );
}

function TimingPanel({ timing }: { timing: TimingAssessment }) {
  const color = timing.risk === 'low' ? 'text-emerald-400' : timing.risk === 'medium' ? 'text-amber-400' : timing.risk === 'high' ? 'text-red-400' : 'text-white/40';
  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white/70 text-xs uppercase tracking-widest">Timing Assessment</h3>
        <span className={`text-xs font-medium uppercase tracking-wide ${color}`}>
          {timing.risk === 'unknown' ? 'Unknown' : `${timing.risk} risk`}
        </span>
      </div>
      {timing.months_to_open !== null && (
        <p className="text-white text-sm mb-2">{timing.months_to_open} months typical time to open</p>
      )}
      <p className="text-white/50 text-xs leading-relaxed">{timing.note}</p>
    </div>
  );
}

function FlagList({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-5">
      <h3 className="text-amber-400 text-xs uppercase tracking-widest mb-3">
        {flags.length} Flag{flags.length !== 1 ? 's' : ''} Raised
      </h3>
      <ul className="space-y-2">
        {flags.map((f, i) => (
          <li key={i} className="flex gap-2 text-xs text-white/60">
            <span className="text-amber-400 mt-0.5 shrink-0">⚑</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NarrativeSection({ narrative }: { narrative: PersistedE2Score['narrative'] }) {
  if (!narrative.OVERALL_VERDICT && !narrative.STRENGTHS) return null;

  return (
    <div className="space-y-5">
      {narrative.OVERALL_VERDICT && (
        <div className="border border-white/10 rounded-xl p-5">
          <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Analysis</h3>
          <p className="text-white/80 text-sm leading-relaxed">{narrative.OVERALL_VERDICT}</p>
        </div>
      )}
      {(narrative.STRENGTHS || narrative.CONCERNS) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narrative.STRENGTHS && (
            <div className="border border-emerald-500/15 bg-emerald-500/5 rounded-xl p-5">
              <h3 className="text-emerald-400 text-xs uppercase tracking-widest mb-3">Strengths</h3>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{narrative.STRENGTHS}</p>
            </div>
          )}
          {narrative.CONCERNS && (
            <div className="border border-amber-500/15 bg-amber-500/5 rounded-xl p-5">
              <h3 className="text-amber-400 text-xs uppercase tracking-widest mb-3">Concerns</h3>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{narrative.CONCERNS}</p>
            </div>
          )}
        </div>
      )}
      {narrative.ATTORNEY_NOTE && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <span className="text-white/40 text-xs">Attorney note: </span>
          <span className="text-white/60 text-xs">{narrative.ATTORNEY_NOTE}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export default function FddScorePage() {
  const params = useParams<{ fddId: string }>();
  const router = useRouter();
  const fddId = params.fddId;

  const [analysis, setAnalysis] = useState<FddAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fddId) return;
    loadAnalysis();
  }, [fddId]);

  async function loadAnalysis() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { data, error: err } = await supabase
      .from('fdd_analyses')
      .select('*')
      .eq('id', fddId)
      .single();

    if (err || !data) {
      setError('Analysis not found.');
    } else {
      setAnalysis(data as FddAnalysis);
      // Auto-score if no score yet
      if (!data.e2_score) {
        runScoring();
      }
    }
    setLoading(false);
  }

  async function runScoring() {
    setScoring(true);
    setError('');
    try {
      const res = await fetch('/api/fdd/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || 'Scoring failed');
      }
      // Reload to get persisted data
      await loadAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring failed');
    } finally {
      setScoring(false);
    }
  }

  if (loading || scoring) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {scoring ? 'Running E-2 compatibility analysis...' : 'Loading...'}
          </p>
          {scoring && (
            <p className="text-white/25 text-xs mt-2">
              Scoring 4 dimensions + generating narrative — takes 15–30 seconds
            </p>
          )}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={runScoring}
            className="text-[#C9A84C] text-sm underline underline-offset-4 hover:text-[#d4b55a]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  const score = analysis.e2_score as PersistedE2Score | null;
  const franchisorName = (analysis.extracted_fields as { franchisor_legal_name?: { value: string } } | null)
    ?.franchisor_legal_name?.value ?? analysis.original_filename;

  if (!score) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm mb-4">No score yet.</p>
          <button
            onClick={runScoring}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
          >
            Run E-2 Analysis
          </button>
        </div>
      </main>
    );
  }

  const compat = COMPATIBILITY_CONFIG[score.overall];
  const dims = [
    score.dimensions.eligibility_gates,
    score.dimensions.investment_substantiality,
    score.dimensions.non_marginality,
    score.dimensions.develop_and_direct,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">E-2 Compatibility Score</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {franchisorName}
          </h1>
          <p className="text-white/40 text-sm">
            {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
            {analysis.transaction_type && (
              <> · {analysis.transaction_type.replace(/_/g, ' ')}</>
            )}
          </p>
        </div>

        {/* Overall badge */}
        <div className={`rounded-2xl border ${compat.border} ${compat.bg} p-6 flex items-center justify-between`}>
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Overall Rating</p>
            <p className={`font-['Cormorant_Garamond'] text-3xl font-semibold ${compat.color}`}>
              {compat.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-xs mb-1">{score.flags?.length ?? 0} flag{(score.flags?.length ?? 0) !== 1 ? 's' : ''}</p>
            <p className="text-white/30 text-xs">{dims.filter(d => d.result === 'pass').length}/{dims.length} dimensions pass</p>
          </div>
        </div>

        {/* Narrative */}
        {score.narrative && <NarrativeSection narrative={score.narrative} />}

        {/* Flags */}
        {score.flags?.length > 0 && <FlagList flags={score.flags} />}

        {/* Dimensions */}
        <div>
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">Dimension Breakdown</h2>
          <div className="space-y-3">
            {dims.map((dim, i) => <DimensionCard key={i} dim={dim} />)}
          </div>
        </div>

        {/* ODE */}
        {score.ode_assessment && <OdePanel ode={score.ode_assessment as OdeAssessment} />}

        {/* Timing */}
        {score.timing_assessment && <TimingPanel timing={score.timing_assessment as TimingAssessment} />}

        {/* CTAs */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.push(`/fdd/review/${fddId}`)}
            className="flex-1 border border-white/10 text-white/60 py-3 rounded-xl text-sm hover:border-white/20 hover:text-white/80 transition-all"
          >
            ← Back to extraction
          </button>
          <button
            onClick={() => router.push(`/fdd/questions/${fddId}`)}
            className="flex-1 bg-[#C9A84C] text-[#0a0a0a] font-semibold py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
          >
            Generate Questions →
          </button>
        </div>

        <p className="text-xs text-white/20 text-center leading-relaxed pb-4">
          This analysis is an informational tool and does not constitute legal, immigration, or financial advice.
          Engage a licensed immigration attorney and franchise attorney before signing any agreement.
        </p>
      </div>
    </main>
  );
}
