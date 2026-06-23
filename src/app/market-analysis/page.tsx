'use client';

import { useState } from 'react';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';

// ============================================================================
// Market Analysis — /market-analysis
// Standalone entry point for non-franchise business territory analysis
// ============================================================================

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'qsr',             label: 'Quick Service Restaurant (QSR)' },
  { value: 'home_services',   label: 'Home Services' },
  { value: 'senior_care',     label: 'Senior Care' },
  { value: 'health_fitness',  label: 'Health & Fitness' },
  { value: 'child_education', label: 'Child Education & Enrichment' },
  { value: 'automotive',      label: 'Automotive Services' },
  { value: 'retail',          label: 'Retail' },
  { value: 'professional',    label: 'Professional Services' },
];

const US_STATES: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' },       { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },       { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },    { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },   { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },       { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },        { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },      { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },          { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },      { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },         { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },     { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },      { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },      { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },    { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },{ value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },          { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },        { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },         { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },       { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },    { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },     { value: 'WY', label: 'Wyoming' },
];

const SCORE_COLOR: Record<string, string> = {
  excellent: '#10b981',
  good:      '#C9A84C',
  caution:   '#f59e0b',
  weak:      '#ef4444',
  unknown:   'rgba(255,255,255,0.2)',
};

const RATING_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good:      'Good',
  caution:   'Caution',
  weak:      'Weak',
  unknown:   'No data',
};

function fmt(n: number | null, prefix = '', suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${prefix}${Math.round(n).toLocaleString()}${suffix}`;
}

function fmtK(n: number | null, prefix = ''): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${prefix}${Math.round(n / 1_000)}K`;
  return `${prefix}${Math.round(n).toLocaleString()}`;
}

interface DimensionScore {
  score: number;
  rating: string;
  note: string;
  data_available: boolean;
}

interface ScoreBarProps {
  score: number;
  rating: string;
}

function ScoreBar({ score, rating }: ScoreBarProps) {
  const color = SCORE_COLOR[rating] ?? SCORE_COLOR.unknown;
  return (
    <div className="mt-2 h-1 w-full bg-white/10">
      <div
        className="h-1 transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

interface DimensionCardProps {
  label: string;
  icon: string;
  dimension: DimensionScore;
}

function DimensionCard({ label, icon, dimension }: DimensionCardProps) {
  const color = SCORE_COLOR[dimension.rating] ?? SCORE_COLOR.unknown;
  const ratingLabel = RATING_LABEL[dimension.rating] ?? '—';
  return (
    <div className="border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-1">{icon} {label}</p>
          <p className="text-2xl font-light text-white">
            {dimension.data_available ? dimension.score : '—'}
            {dimension.data_available && <span className="text-sm text-white/30 ml-1">/100</span>}
          </p>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 border"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
        >
          {ratingLabel}
        </span>
      </div>
      <ScoreBar score={dimension.score} rating={dimension.rating} />
      <p className="text-white/50 text-xs mt-3 leading-relaxed">{dimension.note}</p>
    </div>
  );
}

interface NarrativeCardProps {
  title: string;
  body: string;
}

function NarrativeCard({ title, body }: NarrativeCardProps) {
  return (
    <div className="border-l-2 border-[#C9A84C]/40 pl-5 py-1">
      <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2">{title.replace(/_/g, ' ')}</p>
      <p className="text-white/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

interface FormState {
  businessName: string;
  businessCategory: string;
  zip: string;
  state: string;
}

const INITIAL_FORM: FormState = {
  businessName: '',
  businessCategory: '',
  zip: '',
  state: '',
};

export default function MarketAnalysisPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [analysis, setAnalysis] = useState<TerritoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    if (!form.businessName.trim()) errs.businessName = 'Business name is required';
    if (!form.businessCategory)    errs.businessCategory = 'Select a business category';
    if (!/^\d{5}$/.test(form.zip)) errs.zip = 'Enter a valid 5-digit ZIP code';
    if (!form.state)               errs.state = 'Select a state';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch('/api/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName:     form.businessName.trim(),
          businessCategory: form.businessCategory,
          zip:              form.zip.trim(),
          state:            form.state,
        }),
      });
      const json = await res.json() as TerritoryAnalysis & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed');
      setAnalysis(json);
      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  const overallColor = analysis ? (SCORE_COLOR[analysis.overall_rating] ?? SCORE_COLOR.unknown) : '#C9A84C';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4">Market Intelligence</p>
          <h1 className="font-['Cormorant_Garamond'] text-5xl font-light text-white mb-4 leading-tight">
            Territory Market Analysis
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-2xl">
            Enter your target location and business type. We pull live Census demographic data,
            analyze competitor density, and score the territory across five dimensions — giving you
            an investment-grade market picture in under 60 seconds.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="border border-white/10 bg-white/[0.02] p-8 mb-10">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-8">Business Details</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="block text-white/50 text-xs tracking-widest uppercase mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => handleChange('businessName', e.target.value)}
                  placeholder="e.g. Sunrise Senior Care"
                  className={`w-full bg-white/5 border text-white text-sm px-4 py-3 placeholder-white/20 outline-none focus:border-[#C9A84C]/60 transition-colors ${
                    fieldErrors.businessName ? 'border-red-500/60' : 'border-white/10'
                  }`}
                  style={{ borderRadius: 0 }}
                />
                {fieldErrors.businessName && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.businessName}</p>
                )}
              </div>

              {/* Business Category */}
              <div className="md:col-span-2">
                <label className="block text-white/50 text-xs tracking-widest uppercase mb-2">
                  Business Category
                </label>
                <select
                  value={form.businessCategory}
                  onChange={e => handleChange('businessCategory', e.target.value)}
                  className={`w-full bg-[#0a0a0a] border text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/60 transition-colors appearance-none ${
                    fieldErrors.businessCategory ? 'border-red-500/60' : 'border-white/10'
                  } ${form.businessCategory ? 'text-white' : 'text-white/30'}`}
                  style={{ borderRadius: 0 }}
                >
                  <option value="" disabled>Select the closest category…</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} className="bg-[#0a0a0a] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.businessCategory && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.businessCategory}</p>
                )}
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-white/50 text-xs tracking-widest uppercase mb-2">
                  Target ZIP Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={form.zip}
                  onChange={e => handleChange('zip', e.target.value.replace(/\D/g, ''))}
                  placeholder="10001"
                  className={`w-full bg-white/5 border text-white text-sm px-4 py-3 placeholder-white/20 outline-none focus:border-[#C9A84C]/60 transition-colors ${
                    fieldErrors.zip ? 'border-red-500/60' : 'border-white/10'
                  }`}
                  style={{ borderRadius: 0 }}
                />
                {fieldErrors.zip && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.zip}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-white/50 text-xs tracking-widest uppercase mb-2">
                  State
                </label>
                <select
                  value={form.state}
                  onChange={e => handleChange('state', e.target.value)}
                  className={`w-full bg-[#0a0a0a] border text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/60 transition-colors appearance-none ${
                    fieldErrors.state ? 'border-red-500/60' : 'border-white/10'
                  } ${form.state ? 'text-white' : 'text-white/30'}`}
                  style={{ borderRadius: 0 }}
                >
                  <option value="" disabled>Select state…</option>
                  {US_STATES.map(s => (
                    <option key={s.value} value={s.value} className="bg-[#0a0a0a] text-white">
                      {s.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.state && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.state}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="mt-8 pt-6 border-t border-white/8 flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#C9A84C] text-[#0a0a0a] text-sm font-medium tracking-wide px-8 py-3 hover:bg-[#d4b469] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                {loading ? 'Analysing territory…' : 'Run Market Analysis'}
              </button>
              {loading && (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <div className="w-4 h-4 border border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" style={{ borderRadius: '50%' }} />
                  Pulling Census data and scoring 5 dimensions…
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/5 px-6 py-4 mb-10">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-white/40 text-xs mt-1">Check your ZIP code and try again, or contact support if the issue persists.</p>
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div id="results">

            {/* Overall Score Banner */}
            <div className="border border-white/10 bg-white/[0.02] p-8 mb-8 flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2">Overall Territory Score</p>
                <p className="font-['Cormorant_Garamond'] text-6xl font-light" style={{ color: overallColor }}>
                  {analysis.overall_score}
                  <span className="text-2xl text-white/30 ml-2">/100</span>
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {analysis.target_zip}, {analysis.target_state}
                  {' · '}
                  {CATEGORIES.find(c => c.value === analysis.franchise_category)?.label ?? analysis.franchise_category}
                  {' · '}
                  {analysis.radius_miles}mi radius
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-['Cormorant_Garamond'] font-light capitalize"
                  style={{ color: overallColor }}
                >
                  {RATING_LABEL[analysis.overall_rating] ?? analysis.overall_rating}
                </p>
                <p className="text-white/30 text-xs mt-1 uppercase tracking-widest">
                  {analysis.data_completeness === 'full' ? 'Full data' :
                   analysis.data_completeness === 'partial' ? 'Partial data' : 'Minimal data'}
                </p>
              </div>
            </div>

            {/* Dimension Cards */}
            <div className="mb-2">
              <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4">Five-Dimension Breakdown</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              <DimensionCard label="Population & Demand"     icon="◎" dimension={analysis.population_score} />
              <DimensionCard label="Income & Spending Power" icon="◈" dimension={analysis.income_score} />
              <DimensionCard label="Competitive Landscape"   icon="◉" dimension={analysis.competition_score} />
              <DimensionCard label="Demographic Fit"         icon="◇" dimension={analysis.demographic_fit_score} />
              <DimensionCard label="Labor Market"            icon="◆" dimension={analysis.labor_market_score} />

              {/* Market Sizing Summary Card */}
              <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5">
                <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">◐ Market Sizing</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Target segment</span>
                    <span className="text-white/80">
                      {fmt(analysis.target_market.relevant_segment)} {analysis.target_market.segment_label}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Addressable revenue</span>
                    <span className="text-white/80">{fmtK(analysis.target_market.annual_addressable_revenue, '$')}/yr</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Year 1 target</span>
                    <span className="text-white/80">{fmtK(analysis.target_market.year1_revenue_target, '$')}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs">
                    <span className="text-white/40">Substantiality</span>
                    <span className={
                      analysis.target_market.nonmarginality_check === 'pass'
                        ? 'text-emerald-400'
                        : analysis.target_market.nonmarginality_check === 'borderline'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }>
                      {analysis.target_market.nonmarginality_check.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Sections */}
            {analysis.narrative && (
              <div className="border border-white/10 bg-white/[0.02] p-8">
                <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-8">Analyst Assessment</p>
                <div className="space-y-7">
                  {analysis.narrative.MARKET_OVERVIEW && (
                    <NarrativeCard title="Market Overview" body={analysis.narrative.MARKET_OVERVIEW} />
                  )}
                  {analysis.narrative.ECONOMIC_STRENGTH && (
                    <NarrativeCard title="Economic Strength" body={analysis.narrative.ECONOMIC_STRENGTH} />
                  )}
                  {analysis.narrative.DEMOGRAPHIC_FIT && (
                    <NarrativeCard title="Demographic Fit" body={analysis.narrative.DEMOGRAPHIC_FIT} />
                  )}
                  {analysis.narrative.COMPETITIVE_LANDSCAPE && (
                    <NarrativeCard title="Competitive Landscape" body={analysis.narrative.COMPETITIVE_LANDSCAPE} />
                  )}
                  {analysis.narrative.VERDICT && (
                    <div className="border border-[#C9A84C]/30 bg-[#C9A84C]/5 pl-5 py-4 border-l-2 border-l-[#C9A84C]">
                      <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2">Verdict</p>
                      <p className="text-white/90 text-sm leading-relaxed font-medium">{analysis.narrative.VERDICT}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Data — Census Snapshot */}
            {analysis.census && (
              <div className="border border-white/8 p-6 mt-6">
                <p className="text-white/30 text-xs tracking-widest uppercase mb-4">Census Data Snapshot (ACS 5-Year)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-white/30 mb-1">Total population</p>
                    <p className="text-white/70">{fmt(analysis.census.total_population)}</p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Households</p>
                    <p className="text-white/70">{fmt(analysis.census.total_households)}</p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Median HH income</p>
                    <p className="text-white/70">{fmt(analysis.census.median_household_income, '$')}</p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Median age</p>
                    <p className="text-white/70">{analysis.census.median_age !== null ? `${analysis.census.median_age} yrs` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Owner-occupied</p>
                    <p className="text-white/70">
                      {analysis.census.owner_occupied_pct !== null
                        ? `${Math.round(analysis.census.owner_occupied_pct * 100)}%`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Employment rate</p>
                    <p className="text-white/70">
                      {analysis.census.employment_rate !== null
                        ? `${(analysis.census.employment_rate * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Labor force</p>
                    <p className="text-white/70">{fmt(analysis.census.labor_force)}</p>
                  </div>
                  <div>
                    <p className="text-white/30 mb-1">Nearby competitors</p>
                    <p className="text-white/70">
                      {analysis.competitors.nearby_count !== null
                        ? `${analysis.competitors.nearby_count} (${analysis.competitors.source})`
                        : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-white/20 text-xs mt-4">
                  Source: U.S. Census Bureau ACS 5-Year Estimates.
                  {analysis.competitors.source === 'google_places' && ' Competitor data: Google Places API.'}
                  {analysis.competitors.source === 'unavailable' && ' Competitor count is a statistical estimate based on national density benchmarks.'}
                </p>
              </div>
            )}

            {/* Run another */}
            <div className="mt-10 pt-6 border-t border-white/8 flex items-center justify-between">
              <p className="text-white/30 text-xs">
                Need to compare a different location? Scroll up and change the ZIP.
              </p>
              <button
                onClick={() => {
                  setAnalysis(null);
                  setError('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[#C9A84C] text-xs hover:text-[#d4b469] transition-colors"
              >
                ↑ New analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
