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

interface AnalysisCardProps {
  analysis: FddAnalysis;
  selected: boolean;
  onSelect: (id: string) => void;
  compareMode: boolean;
}

function AnalysisCard({ analysis, selected, onSelect, compareMode }: AnalysisCardProps) {
  const router = useRouter();
  const compat = analysis.overall_compatibility;
  const cfg = compat ? COMPAT_CONFIG[compat] : null;
  const fields = analysis.extracted_fields as Record<string, { value: unknown }> | null;
  const franchiseName = (fields?.franchisor_legal_name?.value as string) ?? analysis.original_filename;

  function handleClick() {
    if (compareMode) {
      onSelect(analysis.id);
      return;
    }
    if (analysis.final_report) {
      router.push(`/fdd/report/${analysis.id}`);
    } else if (analysis.questions) {
      router.push(`/fdd/questions/${analysis.id}`);
    } else if (analysis.territory_analysis) {
      router.push(`/fdd/territory/${analysis.id}`);
    } else if (analysis.e2_score) {
      router.push(`/fdd/score/${analysis.id}`);
    } else {
      router.push(`/fdd/review/${analysis.id}`);
    }
  }

  const stages = [
    { label: 'Extracted', done: analysis.extraction_status === 'extracted' },
    { label: 'Scored',    done: !!analysis.e2_score },
    { label: 'Territory', done: !!analysis.territory_analysis },
    { label: 'Questions', done: !!analysis.questions },
    { label: 'Report',    done: !!analysis.final_report },
  ];
  const completedStages = stages.filter(s => s.done).length;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left border p-5 hover:bg-white/2 transition-all ${
        selected
          ? 'border-[#C9A84C]/60 bg-[#C9A84C]/5'
          : 'border-white/10 hover:border-white/20'
      }`}
      style={{ borderRadius: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {compareMode && (
            <div className={`mt-0.5 w-4 h-4 border flex items-center justify-center shrink-0 ${
              selected ? 'border-[#C9A84C] bg-[#C9A84C]' : 'border-white/30'
            }`}>
              {selected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          )}
          <div>
            <p className="text-white font-medium text-sm mb-1">{franchiseName}</p>
            <p className="text-white/40 text-xs">
              {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
              {analysis.transaction_type && <> · {analysis.transaction_type.replace(/_/g, ' ')}</>}
            </p>
          </div>
        </div>
        {compat && cfg && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.color}`}>{compat}</span>
          </div>
        )}
      </div>

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
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { loadAnalyses(); }, []);

  async function loadAnalyses() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    // Exclude heavy JSONB columns not needed for the list:
    // extracted_fields (50-field corpus) and profile_match — franchise name falls back to original_filename
    const { data, error: err } = await supabase
      .from('fdd_analyses')
      .select('id, created_at, original_filename, file_size_bytes, page_count, extraction_status, extraction_error, extraction_progress, overall_compatibility, flag_count, fdd_stale, fdd_age_months, state_registration_status, target_city, target_state, target_zip, transaction_type, investor_liquid_capital, investor_net_worth, e2_score, territory_analysis, questions, final_report')
      .order('created_at', { ascending: false })
      .limit(20);

    if (err) setError('Could not load your analyses.');
    else setAnalyses((data ?? []) as FddAnalysis[]);
    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelected([]);
  }

  function goCompare() {
    if (selected.length < 2) return;
    router.push(`/fdd/compare?ids=${selected.join(',')}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence</p>
            <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white">
              Your FDD Analyses
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            {analyses.length >= 2 && !compareMode && (
              <button
                onClick={() => setCompareMode(true)}
                className="border border-white/20 text-white/60 px-4 py-2.5 text-sm hover:border-white/40 hover:text-white/80 transition-colors"
                style={{ borderRadius: 0 }}
              >
                Compare
              </button>
            )}
            <button
              onClick={() => router.push('/fdd/upload')}
              className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-5 py-2.5 text-sm hover:bg-[#d4b55a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              + New analysis
            </button>
          </div>
        </div>

        {/* Compare mode instruction banner */}
        {compareMode && (
          <div className="mb-6 p-4 border border-[#C9A84C]/30 bg-[#C9A84C]/5 flex items-center justify-between">
            <p className="text-[#C9A84C] text-sm">
              Select 2–4 franchises to compare.
              <span className="text-white/40 ml-2">{selected.length} selected</span>
            </p>
            <button
              onClick={exitCompareMode}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

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
              className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3 text-sm hover:bg-[#d4b55a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              Analyse an FDD
            </button>
          </div>
        )}

        {!loading && analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map(a => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                selected={selected.includes(a.id)}
                onSelect={toggleSelect}
                compareMode={compareMode}
              />
            ))}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/8">
          <p className="text-white/20 text-xs text-center leading-relaxed">
            FDD Intelligence analyses Franchise Disclosure Documents for E-2 visa compatibility.
            Results are informational only and do not constitute legal, financial, or franchise advice.
          </p>
        </div>
      </div>

      {/* Floating compare CTA */}
      {compareMode && selected.length >= 2 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={goCompare}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3.5 text-sm shadow-2xl hover:bg-[#d4b55a] transition-colors flex items-center gap-3"
            style={{ borderRadius: 0 }}
          >
            <span>Compare {selected.length} franchises</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
