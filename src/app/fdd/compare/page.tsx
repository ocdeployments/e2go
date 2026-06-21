'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { CompareResponse, ComparisonColumn } from '@/types/fdd-compare';

// ============================================================================
// FDD Compare Page — /fdd/compare?ids=id1,id2[,id3,id4]
// ============================================================================

function fmt(n: number | null, prefix = '', suffix = '', decimals = 0): string {
  if (n === null || n === undefined) return '—';
  const val = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return `${prefix}${val}${suffix}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

const COMPAT_COLOR: Record<string, string> = {
  STRONG:     'text-emerald-400',
  VIABLE:     'text-[#C9A84C]',
  CAUTION:    'text-amber-400',
  INELIGIBLE: 'text-red-400',
};

const GRADE_COLOR: Record<string, string> = {
  pass:    'text-emerald-400',
  viable:  'text-[#C9A84C]',
  caution: 'text-amber-400',
  fail:    'text-red-400',
  unknown: 'text-white/30',
};

const PROFILE_COLOR: Record<string, string> = {
  STRONG_FIT:         'text-emerald-400',
  GOOD_FIT:           'text-[#C9A84C]',
  PARTIAL_FIT:        'text-amber-400',
  POOR_FIT:           'text-red-400',
  INSUFFICIENT_DATA:  'text-white/30',
};

interface RowDef {
  label: string;
  key: keyof ComparisonColumn;
  render: (col: ComparisonColumn, isBest: boolean) => React.ReactNode;
  group?: string;
}

const ROWS: RowDef[] = [
  // ── E-2 ─────────────────────────────────────────────────────────────────
  { group: 'E-2 Assessment', label: 'Compatibility', key: 'compatibility', render: (c) => (
    <span className={COMPAT_COLOR[c.compatibility ?? ''] ?? 'text-white/60'}>{c.compatibility ?? '—'}</span>
  )},
  { group: 'E-2 Assessment', label: 'Flags', key: 'flag_count', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : c.flag_count > 3 ? 'text-red-400' : 'text-white/80'}>
      {c.flag_count}
    </span>
  )},
  { group: 'E-2 Assessment', label: 'Critical issues', key: 'critical_flags', render: (c) => (
    c.critical_flags.length === 0
      ? <span className="text-emerald-400">None</span>
      : <span className="text-red-400">{c.critical_flags.length}</span>
  )},
  { group: 'E-2 Assessment', label: 'Profile fit', key: 'profile_overall', render: (c) => (
    <span className={PROFILE_COLOR[c.profile_overall ?? ''] ?? 'text-white/40'}>
      {c.profile_overall?.replace(/_/g, ' ') ?? '—'}
    </span>
  )},
  { group: 'E-2 Assessment', label: 'Capital adequacy', key: 'capital_adequacy', render: (c) => (
    <span className={GRADE_COLOR[c.capital_adequacy ?? ''] ?? 'text-white/40'}>
      {c.capital_adequacy ?? '—'}
    </span>
  )},
  { group: 'E-2 Assessment', label: 'Substantiality', key: 'e2_substantiality', render: (c) => (
    <span className={GRADE_COLOR[c.e2_substantiality ?? ''] ?? 'text-white/40'}>
      {c.e2_substantiality ?? '—'}
    </span>
  )},

  // ── Investment ──────────────────────────────────────────────────────────
  { group: 'Investment', label: 'Total investment', key: 'investment_min', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {c.investment_min !== null && c.investment_max !== null
        ? `$${Math.round(c.investment_min / 1000)}K – $${Math.round(c.investment_max / 1000)}K`
        : fmt(c.investment_min, '$')}
    </span>
  )},
  { group: 'Investment', label: 'Franchise fee', key: 'franchise_fee', render: (c) => (
    <span className="text-white/80">{fmt(c.franchise_fee, '$')}</span>
  )},
  { group: 'Investment', label: 'Royalty rate', key: 'royalty_pct', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>{fmtPct(c.royalty_pct)}</span>
  )},
  { group: 'Investment', label: 'Marketing fund', key: 'marketing_pct', render: (c) => (
    <span className="text-white/80">{fmtPct(c.marketing_pct)}</span>
  )},

  // ── Financial Performance ───────────────────────────────────────────────
  { group: 'Financial Performance', label: 'Median AUV (Item 19)', key: 'item19_auv', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {fmt(c.item19_auv ?? c.item19_median, '$')}
    </span>
  )},
  { group: 'Financial Performance', label: 'Est. owner income (ODE)', key: 'ode_mid', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {c.ode_low !== null && c.ode_high !== null
        ? `$${Math.round(c.ode_low / 1000)}K – $${Math.round(c.ode_high / 1000)}K`
        : fmt(c.ode_mid, '$')}
    </span>
  )},

  // ── Territory ───────────────────────────────────────────────────────────
  { group: 'Territory', label: 'Territory score', key: 'territory_score', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {c.territory_score !== null ? `${c.territory_score}/100` : '—'}
    </span>
  )},
  { group: 'Territory', label: 'Territory rating', key: 'territory_rating', render: (c) => (
    <span className="text-white/80">{c.territory_rating ?? '—'}</span>
  )},
  { group: 'Territory', label: 'Labor market score', key: 'labor_score', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {c.labor_score !== null ? `${c.labor_score}/100` : '—'}
    </span>
  )},
  { group: 'Territory', label: 'Nearby competitors', key: 'competitors_nearby', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>
      {c.competitors_nearby !== null ? String(c.competitors_nearby) : '—'}
    </span>
  )},

  // ── System Health ───────────────────────────────────────────────────────
  { group: 'System Health', label: 'Total units', key: 'total_units', render: (c) => (
    <span className="text-white/80">{fmt(c.total_units)}</span>
  )},
  { group: 'System Health', label: 'Units opened (last yr)', key: 'units_opened_last_year', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : 'text-white/80'}>{fmt(c.units_opened_last_year)}</span>
  )},
  { group: 'System Health', label: 'Units closed (last yr)', key: 'units_closed_last_year', render: (c, best) => (
    <span className={best ? 'text-emerald-400' : c.units_closed_last_year !== null && c.units_closed_last_year > 20 ? 'text-red-400' : 'text-white/80'}>
      {fmt(c.units_closed_last_year)}
    </span>
  )},
  { group: 'System Health', label: 'FDD age (months)', key: 'fdd_age_months', render: (c) => (
    <span className={c.fdd_age_months !== null && c.fdd_age_months > 24 ? 'text-amber-400' : 'text-white/80'}>
      {c.fdd_age_months !== null ? `${c.fdd_age_months}mo` : '—'}
    </span>
  )},
];

function FddCompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fddIds = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];

  const load = useCallback(async () => {
    if (fddIds.length < 2) {
      setError('Select at least 2 FDDs to compare.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/fdd/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_ids: fddIds }),
      });
      const json = await res.json() as CompareResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to load comparison');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [fddIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Group rows by section
  const groups: { label: string; rows: RowDef[] }[] = [];
  for (const row of ROWS) {
    const g = groups.find(g => g.label === row.group);
    if (g) g.rows.push(row);
    else groups.push({ label: row.group ?? '', rows: [row] });
  }

  const colCount = data?.columns.length ?? fddIds.length;
  const gridCols = `grid-cols-[200px_repeat(${colCount},1fr)]`;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence</p>
            <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white">
              Franchise Comparison
            </h1>
          </div>
          <button
            onClick={() => router.push('/fdd')}
            className="text-white/40 text-sm hover:text-white/70 transition-colors"
          >
            ← Back to analyses
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button onClick={() => router.push('/fdd')} className="text-[#C9A84C] text-sm hover:underline">
              Return to FDD hub
            </button>
          </div>
        )}

        {data && (
          <div className="overflow-x-auto">
            <div className={`grid ${gridCols} min-w-[640px]`}>

              {/* Column headers */}
              <div className="border-b border-white/10 pb-4" />
              {data.columns.map(col => (
                <div key={col.id} className="border-b border-white/10 pb-4 px-4">
                  <p className="text-white font-medium text-sm leading-tight mb-1 line-clamp-2">
                    {col.franchise_name}
                  </p>
                  <p className={`text-xs font-medium ${COMPAT_COLOR[col.compatibility ?? ''] ?? 'text-white/30'}`}>
                    {col.compatibility ?? 'Unscored'}
                  </p>
                </div>
              ))}

              {/* Row groups */}
              {groups.map(group => (
                <>
                  {/* Group header */}
                  <div
                    key={`gh-${group.label}`}
                    className={`col-span-${colCount + 1} pt-8 pb-3`}
                    style={{ gridColumn: `1 / -1` }}
                  >
                    <p className="text-[#C9A84C] text-xs tracking-widest uppercase">{group.label}</p>
                  </div>

                  {/* Data rows */}
                  {group.rows.map((row, ri) => (
                    <>
                      {/* Row label */}
                      <div
                        key={`label-${row.key}-${ri}`}
                        className="py-3 pr-4 text-white/40 text-xs flex items-center border-b border-white/5"
                      >
                        {row.label}
                      </div>

                      {/* Data cells */}
                      {data.columns.map(col => {
                        const isBest = data.best[row.key] === col.id;
                        return (
                          <div
                            key={`${row.key}-${col.id}`}
                            className={`py-3 px-4 text-sm border-b border-white/5 ${isBest ? 'bg-emerald-400/5' : ''}`}
                          >
                            {row.render(col, isBest)}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </>
              ))}
            </div>

            {/* Footer legend */}
            <div className="mt-10 pt-6 border-t border-white/8 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400/20 border border-emerald-400/30" />
                <span className="text-white/30 text-xs">Best in class</span>
              </div>
              <p className="text-white/20 text-xs">
                Values derived from extracted FDD data. Missing fields show — where data was not disclosed or not yet extracted.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function FddComparePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
      </main>
    }>
      <FddCompareContent />
    </Suspense>
  );
}
