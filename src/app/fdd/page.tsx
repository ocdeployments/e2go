'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis, FddCompatibility } from '@/types/fdd';

const COMPAT_CONFIG: Record<FddCompatibility, { color: string; dot: string }> = {
  STRONG:    { color: 'text-emerald-400', dot: 'bg-emerald-400' },
  VIABLE:    { color: 'text-[#C9A84C]',  dot: 'bg-[#C9A84C]' },
  CAUTION:   { color: 'text-amber-400',  dot: 'bg-amber-400' },
  INELIGIBLE:{ color: 'text-red-400',    dot: 'bg-red-400' },
};

function AnalysisCard({ analysis }: { analysis: FddAnalysis }) {
  const router = useRouter();
  const compat = analysis.overall_compatibility;
  const cfg = compat ? COMPAT_CONFIG[compat] : null;
  const fields = analysis.extracted_fields as Record<string, { value: unknown }> | null;
  const franchiseName = (fields?.franchisor_legal_name?.value as string) ?? analysis.original_filename;

  // Determine where to navigate based on completion stage
  function handleClick() {
    if (analysis.final_report) {
      router.push(`/fdd/report/${analysis.id}`);
    } else if (analysis.questions) {
      router.push(`/fdd/questions/${analysis.id}`);
    } else if (analysis.territory_analysis) {
      router.push(`/fdd/territory/${analysis.id}`);
    } else if (analysis.e2_score) {
      router.push(`/fdd/score/${analysis.id}`);
    } else if (analysis.extraction_status === 'extracted') {
      router.push(`/fdd/review/${analysis.id}`);
    } else {
      router.push(`/fdd/review/${analysis.id}`);
    }
  }

  const stages = [
    { label: 'Extracted', done: analysis.extraction_status === 'extracted' },
    { label: 'Scored', done: !!analysis.e2_score },
    { label: 'Territory', done: !!analysis.territory_analysis },
    { label: 'Questions', done: !!analysis.questions },
    { label: 'Report', done: !!analysis.final_report },
  ];

  const completedStages = stages.filter(s => s.done).length;

  return (
    <button
      onClick={handleClick}
      className="w-full text-left border border-white/10 rounded-xl p-5 hover:border-white/20 hover:bg-white/2 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white font-medium text-sm mb-1">{franchiseName}</p>
          <p className="text-white/40 text-xs">
            {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
            {analysis.transaction_type && <> · {analysis.transaction_type.replace(/_/g, ' ')}</>}
          </p>
        </div>
        {compat && cfg && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.color}`}>{compat}</span>
          </div>
        )}
      </div>

      {/* Progress stages */}
      <div className="flex gap-1.5 mb-3">
        {stages.map(({ label, done }) => (
          <div
            key={label}
            className={`flex-1 h-1 rounded-full transition-all ${done ? 'bg-[#C9A84C]' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="text-white/30 text-xs">
        {completedStages}/{stages.length} stages complete
        {analysis.flag_count > 0 && <> · {analysis.flag_count} flag{analysis.flag_count !== 1 ? 's' : ''}</>}
      </p>
    </button>
  );
}

export default function FddIndexPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<FddAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { data, error: err } = await supabase
      .from('fdd_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (err) {
      setError('Could not load your analyses.');
    } else {
      setAnalyses((data ?? []) as FddAnalysis[]);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence</p>
            <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white">
              Your FDD Analyses
            </h1>
          </div>
          <button
            onClick={() => router.push('/fdd/upload')}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors shrink-0"
          >
            + New analysis
          </button>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div className="text-center py-20">
            <p className="font-['Cormorant_Garamond'] text-2xl text-white/60 mb-4">No analyses yet</p>
            <p className="text-white/30 text-sm mb-8">Upload your first Franchise Disclosure Document to get started.</p>
            <button
              onClick={() => router.push('/fdd/upload')}
              className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
            >
              Analyse an FDD
            </button>
          </div>
        )}

        {!loading && analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map(a => <AnalysisCard key={a.id} analysis={a} />)}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/8">
          <p className="text-white/20 text-xs text-center leading-relaxed">
            FDD Intelligence analyses Franchise Disclosure Documents for E-2 visa compatibility.
            Results are informational only and do not constitute legal, financial, or franchise advice.
          </p>
        </div>
      </div>
    </main>
  );
}
