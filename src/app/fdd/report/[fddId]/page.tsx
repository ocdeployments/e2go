'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis, FddCompatibility, FddFinalReport } from '@/types/fdd';

// ============================================================================
// Helpers
// ============================================================================

const COMPAT_CONFIG: Record<FddCompatibility, { color: string; bg: string; border: string; label: string }> = {
  STRONG:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'STRONG' },
  VIABLE:    { color: 'text-[#C9A84C]',  bg: 'bg-[#C9A84C]/10',  border: 'border-[#C9A84C]/30',  label: 'VIABLE' },
  CAUTION:   { color: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/30',  label: 'CAUTION' },
  INELIGIBLE:{ color: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30',     label: 'INELIGIBLE' },
};

// ============================================================================
// Sub-components
// ============================================================================

function MetricTile({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className={`text-lg font-medium ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function BulletList({ items, icon }: { items: string[]; icon: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-white/70">
          <span className="shrink-0 mt-0.5">{icon}</span>
          <span>{item.replace(/^[•\-\d.]+\s*/, '')}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Teaser — shown to users without paid FDD access
// For now, all authenticated users have access. This is the upgrade gate structure.
// ============================================================================

function FreeTeaser({
  analysis,
  onUpgrade,
}: {
  analysis: FddAnalysis;
  onUpgrade: () => void;
}) {
  const compat = analysis.overall_compatibility;
  const cfg = compat ? COMPAT_CONFIG[compat] : COMPAT_CONFIG.VIABLE;
  const fields = analysis.extracted_fields as Record<string, { value: unknown }> | null;
  const auv = (fields?.item19_median?.value ?? fields?.item19_auv?.value) as number | null;
  const totalMin = fields?.total_investment_min?.value as number | null;
  const totalMax = fields?.total_investment_max?.value as number | null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">
      <div>
        <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence</p>
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
          {fields?.franchisor_legal_name?.value as string ?? analysis.original_filename}
        </h1>
        <p className="text-white/40 text-sm">Your analysis is ready — 3 of your key results are shown below.</p>
      </div>

      {/* 3 real metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricTile
          label="E-2 Compatibility"
          value={compat ?? '—'}
          color={cfg.color}
        />
        <MetricTile
          label="Investment range"
          value={totalMin ? `$${(totalMin / 1000).toFixed(0)}K–$${((totalMax ?? totalMin * 1.5) / 1000).toFixed(0)}K` : '—'}
        />
        <MetricTile
          label="Median AUV"
          value={auv ? `$${(auv / 1000).toFixed(0)}K` : 'Not disclosed'}
          sub={auv ? 'per franchisee' : undefined}
        />
      </div>

      {/* Flag count */}
      {(analysis.flag_count ?? 0) > 0 && (
        <div className={`border ${cfg.border} ${cfg.bg} rounded-xl px-5 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-white/60 text-sm font-medium">{analysis.flag_count} issue{analysis.flag_count !== 1 ? 's' : ''} flagged</p>
            <p className="text-white/30 text-xs mt-0.5">Full report shows each flag with specific explanations</p>
          </div>
          <span className={`text-2xl font-light ${cfg.color}`}>{analysis.flag_count}</span>
        </div>
      )}

      {/* Teaser / locked full report */}
      <div className="relative rounded-2xl border border-white/10 overflow-hidden">
        {/* Blurred preview */}
        <div className="blur-sm select-none pointer-events-none p-6 space-y-4">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/6 rounded w-full" />
          <div className="h-3 bg-white/6 rounded w-5/6" />
          <div className="h-3 bg-white/6 rounded w-4/5" />
          <div className="h-3 bg-white/6 rounded w-full" />
          <div className="h-3 bg-white/6 rounded w-2/3" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/80 p-6 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="font-['Cormorant_Garamond'] text-2xl text-white mb-2">Full Report Locked</h2>
          <p className="text-white/50 text-sm mb-6 max-w-xs leading-relaxed">
            Upgrade to FDD Intelligence to unlock: E-2 scoring breakdown, territory market analysis,
            {(analysis.flag_count ?? 0)} flagged issue{(analysis.flag_count ?? 0) !== 1 ? 's' : ''} explained, and {20}+ due diligence questions.
          </p>
          <button
            onClick={onUpgrade}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
          >
            Unlock Full Report — $297
          </button>
          <p className="text-white/25 text-xs mt-3">One-time payment · Includes territory analysis + questions</p>
        </div>
      </div>

      {/* Sample questions (3, locked) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Sample questions generated</p>
          <span className="text-[#C9A84C] text-xs">Unlock all {20}+ questions →</span>
        </div>
        <div className="space-y-3">
          {[
            'Can you connect me with 10–15 current franchisees in markets similar to mine?',
            'What percentage of your franchisees renew at the end of their initial term?',
            'Is your franchise offering currently registered to be sold in my target state?',
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-3 border border-white/8 rounded-xl px-4 py-3">
              <span className="text-white/20 text-xs shrink-0 mt-0.5">{i + 1}.</span>
              <p className="text-white/50 text-sm">{q}</p>
              <span className="text-white/20 text-sm shrink-0 ml-auto">🔒</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Full report — paid users
// ============================================================================

function FullReport({ analysis, report, onPrint }: {
  analysis: FddAnalysis;
  report: FddFinalReport;
  onPrint: () => void;
}) {
  const compat = analysis.overall_compatibility;
  const cfg = compat ? COMPAT_CONFIG[compat] : COMPAT_CONFIG.VIABLE;
  const fields = analysis.extracted_fields as Record<string, { value: unknown }> | null;
  const fddId = analysis.id;
  const router = useRouter();
  const auv = (fields?.item19_median?.value ?? fields?.item19_auv?.value) as number | null;
  const totalMin = fields?.total_investment_min?.value as number | null;
  const totalMax = fields?.total_investment_max?.value as number | null;
  const royalty = fields?.royalty_rate_pct?.value as number | null;
  const e2Score = analysis.e2_score as { flags?: string[] } | null;
  const ta = analysis.territory_analysis as { overall_rating?: string; overall_score?: number } | null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence Report</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {fields?.franchisor_legal_name?.value as string ?? analysis.original_filename}
          </h1>
          <p className="text-white/40 text-sm">
            {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
            {analysis.transaction_type && <> · {(analysis.transaction_type).replace(/_/g, ' ')}</>}
          </p>
        </div>
        <button
          onClick={onPrint}
          className="text-white/30 text-xs hover:text-white/50 transition-colors mt-1 shrink-0"
        >
          Print / PDF
        </button>
      </div>

      {/* Compatibility badge */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 flex items-center justify-between`}>
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">E-2 Compatibility</p>
          <p className={`font-['Cormorant_Garamond'] text-3xl font-semibold ${cfg.color}`}>{compat}</p>
        </div>
        <div className="text-right space-y-1">
          {ta?.overall_rating && (
            <p className="text-white/40 text-xs">Territory: {ta.overall_rating}{ta.overall_score ? ` (${ta.overall_score}/100)` : ''}</p>
          )}
          <p className="text-white/40 text-xs">{e2Score?.flags?.length ?? analysis.flag_count} flag{(e2Score?.flags?.length ?? analysis.flag_count) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Min. investment" value={totalMin ? `$${totalMin.toLocaleString()}` : '—'} />
        <MetricTile label="Max. investment" value={totalMax ? `$${totalMax.toLocaleString()}` : '—'} />
        <MetricTile label="Median AUV" value={auv ? `$${auv.toLocaleString()}` : 'N/A'} sub={auv ? 'Item 19' : 'Not disclosed'} />
        <MetricTile label="Royalty" value={royalty !== null ? `${(royalty * 100).toFixed(1)}%` : '—'} sub="of gross revenue" />
      </div>

      {/* Executive summary */}
      <div className="border border-white/10 rounded-xl p-6">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Executive Summary</h2>
        <p className="text-white/80 text-sm leading-relaxed">{report.executive_summary}</p>
      </div>

      {/* Strengths + Concerns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-emerald-500/15 bg-emerald-500/5 rounded-xl p-5">
          <h2 className="text-emerald-400 text-xs uppercase tracking-widest mb-4">Key Strengths</h2>
          <BulletList items={report.key_strengths} icon="✓" />
        </div>
        <div className="border border-amber-500/15 bg-amber-500/5 rounded-xl p-5">
          <h2 className="text-amber-400 text-xs uppercase tracking-widest mb-4">Key Concerns</h2>
          <BulletList items={report.key_concerns} icon="⚑" />
        </div>
      </div>

      {/* Financial picture */}
      <div className="border border-white/10 rounded-xl p-5">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Financial Picture</h2>
        <p className="text-white/70 text-sm leading-relaxed">{report.financial_picture}</p>
      </div>

      {/* Market verdict */}
      {report.market_verdict && (
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Market Verdict</h2>
          <p className="text-white/70 text-sm leading-relaxed">{report.market_verdict}</p>
        </div>
      )}

      {/* Next steps */}
      <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/5 rounded-xl p-5">
        <h2 className="text-[#C9A84C] text-xs uppercase tracking-widest mb-4">Recommended Next Steps</h2>
        <ol className="space-y-3">
          {report.recommended_next_steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/70">
              <span className="text-[#C9A84C] font-medium shrink-0">{i + 1}.</span>
              <span>{step.replace(/^\d+\.?\s*/, '')}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Module navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        {[
          { label: 'E-2 Score', href: `/fdd/score/${fddId}` },
          { label: 'Territory', href: `/fdd/territory/${fddId}` },
          { label: 'Questions', href: `/fdd/questions/${fddId}` },
          { label: 'Raw Extraction', href: `/fdd/review/${fddId}` },
        ].map(({ label, href }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className="border border-white/10 text-white/50 py-3 rounded-xl text-xs hover:border-white/20 hover:text-white/70 transition-all"
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/20 text-center leading-relaxed pb-4">
        This report is an informational tool and does not constitute legal, immigration, financial, or franchise advice.
        Engage a licensed immigration attorney and franchise attorney before signing any agreement.
      </p>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export default function FddReportPage() {
  const params = useParams<{ fddId: string }>();
  const fddId = params.fddId;

  const [analysis, setAnalysis] = useState<FddAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // For now, all authenticated users with a completed FDD get full access.
  // Teaser is shown to unauthenticated or users without payment.
  const [hasAccess] = useState(true);

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
      if (!data.final_report && data.e2_score) {
        generateReport();
      }
    }
    setLoading(false);
  }

  async function generateReport() {
    setGenerating(true);
    try {
      const res = await fetch('/api/fdd/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || 'Report generation failed');
      }
      // Reload to get persisted data
      await loadAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading || generating) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {generating ? 'Compiling final report...' : 'Loading...'}
          </p>
          {generating && (
            <p className="text-white/25 text-xs mt-2">Writing platform integration keys + LLM synthesis — 15–20 seconds</p>
          )}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {hasAccess && analysis.final_report ? (
        <FullReport
          analysis={analysis}
          report={analysis.final_report as FddFinalReport}
          onPrint={handlePrint}
        />
      ) : (
        <FreeTeaser
          analysis={analysis}
          onUpgrade={() => {/* pricing flow — to be wired in FDD-5 pricing sprint */}}
        />
      )}
    </main>
  );
}
