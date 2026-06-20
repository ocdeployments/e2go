'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis } from '@/types/fdd';
import type { TerritoryAnalysis, DimensionScore, TerritoryRating } from '@/lib/fdd-territory-engine';

// ============================================================================
// Helpers
// ============================================================================

const RATING_CONFIG: Record<TerritoryRating, { color: string; bg: string; border: string; label: string }> = {
  STRONG:  { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'STRONG' },
  VIABLE:  { color: 'text-[#C9A84C]',  bg: 'bg-[#C9A84C]/10',  border: 'border-[#C9A84C]/30',  label: 'VIABLE' },
  MARGINAL:{ color: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/30',  label: 'MARGINAL' },
  WEAK:    { color: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30',     label: 'WEAK' },
};

const CATEGORY_LABELS: Record<string, string> = {
  qsr: 'Quick-Service Restaurant',
  home_services: 'Home Services',
  senior_care: 'Senior Care',
  health_fitness: 'Health & Fitness',
  child_education: 'Child Education',
  automotive: 'Automotive',
  retail: 'Retail',
  professional: 'Professional Services',
  default: 'General Franchise',
};

function ScoreBar({ score, rating }: { score: number; rating: TerritoryRating }) {
  const cfg = RATING_CONFIG[rating];
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            rating === 'STRONG' ? 'bg-emerald-400' :
            rating === 'VIABLE' ? 'bg-[#C9A84C]' :
            rating === 'MARGINAL' ? 'bg-amber-400' : 'bg-red-400'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${cfg.color}`}>{score}</span>
    </div>
  );
}

function DimensionCard({
  title,
  icon,
  dim,
}: {
  title: string;
  icon: string;
  dim: DimensionScore;
}) {
  const cfg = RATING_CONFIG[dim.rating];
  return (
    <div className={`border ${cfg.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-white/70 text-xs font-medium uppercase tracking-wider">{title}</span>
        </div>
        <span className={`text-xs font-semibold ${cfg.color}`}>{dim.rating}</span>
      </div>
      <ScoreBar score={dim.score} rating={dim.rating} />
      <p className="text-white/50 text-xs leading-relaxed mt-3">{dim.note}</p>
      {!dim.data_available && (
        <p className="text-white/25 text-xs mt-1 italic">Live data unavailable — estimate only</p>
      )}
    </div>
  );
}

function CensusTable({ census }: { census: TerritoryAnalysis['census'] }) {
  const rows = [
    { label: 'Total population', value: census.total_population !== null ? census.total_population.toLocaleString() : '—' },
    { label: 'Total households', value: census.total_households !== null ? census.total_households.toLocaleString() : '—' },
    { label: 'Median household income', value: census.median_household_income !== null ? `$${census.median_household_income.toLocaleString()}` : '—' },
    { label: 'Median age', value: census.median_age !== null ? `${census.median_age} years` : '—' },
    { label: 'Employment rate', value: census.employment_rate !== null ? `${(census.employment_rate * 100).toFixed(1)}%` : '—' },
    { label: 'Owner-occupied housing', value: census.owner_occupied_pct !== null ? `${(census.owner_occupied_pct * 100).toFixed(0)}%` : '—' },
  ];

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10">
        <h3 className="text-white/40 text-xs uppercase tracking-widest">Census ACS 5-Year Data</h3>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-5 py-3">
            <span className="text-white/50 text-xs">{label}</span>
            <span className="text-white text-xs font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativeSection({ narrative }: { narrative: TerritoryAnalysis['narrative'] }) {
  return (
    <div className="space-y-4">
      {narrative.MARKET_OVERVIEW && (
        <div className="border border-white/10 rounded-xl p-5">
          <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Market Overview</h3>
          <p className="text-white/80 text-sm leading-relaxed">{narrative.MARKET_OVERVIEW}</p>
        </div>
      )}
      {(narrative.ECONOMIC_STRENGTH || narrative.COMPETITIVE_LANDSCAPE) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narrative.ECONOMIC_STRENGTH && (
            <div className="border border-white/10 rounded-xl p-5">
              <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Economic Strength</h3>
              <p className="text-white/70 text-xs leading-relaxed">{narrative.ECONOMIC_STRENGTH}</p>
            </div>
          )}
          {narrative.COMPETITIVE_LANDSCAPE && (
            <div className="border border-white/10 rounded-xl p-5">
              <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Competitive Landscape</h3>
              <p className="text-white/70 text-xs leading-relaxed">{narrative.COMPETITIVE_LANDSCAPE}</p>
            </div>
          )}
        </div>
      )}
      {narrative.VERDICT && (
        <div className="bg-white/3 border border-[#C9A84C]/20 rounded-xl p-5">
          <h3 className="text-[#C9A84C] text-xs uppercase tracking-widest mb-2">Territory Verdict</h3>
          <p className="text-white/80 text-sm leading-relaxed">{narrative.VERDICT}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export default function FddTerritoryPage() {
  const params = useParams<{ fddId: string }>();
  const router = useRouter();
  const fddId = params.fddId;

  const [analysis, setAnalysis] = useState<FddAnalysis | null>(null);
  const [territory, setTerritory] = useState<TerritoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
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
      // Extract full territory result if persisted
      const ta = data.territory_analysis as (Record<string, unknown> & { _full?: TerritoryAnalysis }) | null;
      if (ta?._full) {
        setTerritory(ta._full);
      } else if (!ta) {
        runTerritoryAnalysis();
      }
    }
    setLoading(false);
  }

  async function runTerritoryAnalysis() {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/fdd/territory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || 'Territory analysis failed');
      }
      const json = await res.json() as { territory_analysis: TerritoryAnalysis };
      setTerritory(json.territory_analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Territory analysis failed');
    } finally {
      setRunning(false);
    }
  }

  if (loading || running) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {running ? 'Pulling Census and market data...' : 'Loading...'}
          </p>
          {running && (
            <p className="text-white/25 text-xs mt-2 leading-relaxed">
              Querying Census ACS 5-year + competitive landscape — typically 10–20 seconds
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
            onClick={runTerritoryAnalysis}
            className="text-[#C9A84C] text-sm underline underline-offset-4 hover:text-[#d4b55a]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!analysis || !territory) return null;

  const compat = RATING_CONFIG[territory.overall_rating];
  const franchisorName = (analysis.extracted_fields as { franchisor_legal_name?: { value: string } } | null)
    ?.franchisor_legal_name?.value ?? analysis.original_filename;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Territory Market Analysis</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {franchisorName}
          </h1>
          <p className="text-white/40 text-sm">
            ZIP {territory.target_zip}, {territory.target_state}
            <span className="text-white/20"> · </span>
            {CATEGORY_LABELS[territory.franchise_category] ?? territory.franchise_category}
            <span className="text-white/20"> · </span>
            {territory.radius_miles}-mile radius
          </p>
        </div>

        {/* Overall badge */}
        <div className={`rounded-2xl border ${compat.border} ${compat.bg} p-6 flex items-center justify-between`}>
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Territory Rating</p>
            <p className={`font-['Cormorant_Garamond'] text-3xl font-light ${compat.color}`}>
              {territory.overall_rating}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-light ${compat.color}`}>{territory.overall_score}<span className="text-sm">/100</span></p>
            <p className="text-white/30 text-xs mt-1">
              {territory.data_completeness === 'full' ? 'Full data' : territory.data_completeness === 'partial' ? 'Partial data' : 'Minimal data'}
            </p>
          </div>
        </div>

        {/* Data availability notice */}
        {territory.data_completeness !== 'full' && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <p className="text-amber-400/80 text-xs">
              {territory.data_completeness === 'minimal'
                ? 'Census data could not be retrieved for this ZIP code. Scores are estimates only. Verify market data directly before committing to a territory.'
                : 'Some data sources returned incomplete results. Scores for unavailable dimensions default to 50 (neutral). Verify missing data directly.'}
            </p>
          </div>
        )}

        {/* Narrative */}
        <NarrativeSection narrative={territory.narrative} />

        {/* Dimension scores */}
        <div>
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">Dimension Breakdown</h2>
          <div className="space-y-4">
            <DimensionCard
              title="Population & Demand"
              icon="👥"
              dim={territory.population_score}
            />
            <DimensionCard
              title="Economic Strength"
              icon="💰"
              dim={territory.income_score}
            />
            <DimensionCard
              title="Competitive Landscape"
              icon="🏪"
              dim={territory.competition_score}
            />
          </div>
        </div>

        {/* Census data table */}
        <CensusTable census={territory.census} />

        {/* Competitor data */}
        {territory.competitors.source === 'google_places' && territory.competitors.nearby_count !== null && (
          <div className="border border-white/10 rounded-xl p-5">
            <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Competitive Scan</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Similar operators within {territory.competitors.radius_miles} miles</span>
              <span className="text-white font-medium">{territory.competitors.nearby_count}</span>
            </div>
            <p className="text-white/25 text-xs mt-2">Source: Google Places · Point-in-time snapshot</p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.push(`/fdd/score/${fddId}`)}
            className="flex-1 border border-white/10 text-white/60 py-3 rounded-xl text-sm hover:border-white/20 hover:text-white/80 transition-all"
          >
            ← Back to E-2 Score
          </button>
          <button
            onClick={() => router.push(`/fdd/questions/${fddId}`)}
            className="flex-1 bg-[#C9A84C] text-[#0a0a0a] font-semibold py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
          >
            Generate Questions →
          </button>
        </div>

        <p className="text-xs text-white/20 text-center leading-relaxed pb-4">
          Territory analysis uses public Census ACS 5-year data and Google Places (where available).
          Demographics reflect 5-year survey averages, not real-time conditions.
          Market projections are modelled scenarios, not forecasts.
        </p>
      </div>
    </main>
  );
}
