'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis, FddFieldMeta } from '@/types/fdd';

// ============================================================================
// Field metadata for display labels
// ============================================================================

interface FieldDef {
  key: string;
  label: string;
  format?: 'currency' | 'pct' | 'boolean' | 'years' | 'text';
}

const ITEM_SECTIONS: Array<{ id: string; label: string; fields: FieldDef[] }> = [
  {
    id: 'item1',
    label: 'Item 1 — The Franchisor',
    fields: [
      { key: 'franchisor_legal_name', label: 'Legal Name' },
      { key: 'parent_company', label: 'Parent Company' },
      { key: 'headquarters_state', label: 'HQ State' },
      { key: 'year_business_began', label: 'Year Business Began' },
      { key: 'year_franchising_began', label: 'Year Franchising Began' },
      { key: 'total_franchise_units_current', label: 'Total Units' },
      { key: 'fdd_effective_date', label: 'FDD Effective Date' },
      { key: 'fdd_age_months', label: 'FDD Age (months)' },
      { key: 'fdd_fiscal_year_covered', label: 'Fiscal Year Covered' },
      { key: 'state_addendum_present', label: 'State Addendum Present', format: 'boolean' },
      { key: 'state_addendum_key_differences', label: 'Addendum Differences' },
    ],
  },
  {
    id: 'item2',
    label: 'Item 2 — Key People',
    fields: [
      { key: 'executive_franchise_experience_years', label: 'Executive Franchise Experience', format: 'years' },
      { key: 'executive_prior_brands', label: 'Prior Franchise Brands Run' },
    ],
  },
  {
    id: 'item3_4',
    label: 'Items 3–4 — Litigation & Bankruptcy',
    fields: [
      { key: 'active_litigation_count', label: 'Active Litigation Count' },
      { key: 'franchisee_initiated_suits', label: 'Franchisee-Initiated Suits' },
      { key: 'regulatory_actions_count', label: 'Regulatory Actions' },
      { key: 'litigation_pattern_summary', label: 'Litigation Summary' },
      { key: 'franchisor_bankruptcy_history', label: 'Franchisor Bankruptcy History', format: 'boolean' },
      { key: 'executive_bankruptcy_history', label: 'Executive Bankruptcy History', format: 'boolean' },
    ],
  },
  {
    id: 'item5_6',
    label: 'Items 5–6 — Fees',
    fields: [
      { key: 'initial_franchise_fee', label: 'Initial Franchise Fee', format: 'currency' },
      { key: 'fee_is_refundable', label: 'Fee Refundable', format: 'boolean' },
      { key: 'fee_refund_conditions', label: 'Refund Conditions' },
      { key: 'royalty_rate_pct', label: 'Royalty Rate', format: 'pct' },
      { key: 'royalty_basis', label: 'Royalty Basis' },
      { key: 'marketing_fund_pct', label: 'Marketing Fund', format: 'pct' },
      { key: 'technology_fee_monthly', label: 'Technology Fee / month', format: 'currency' },
      { key: 'total_ongoing_fee_pct', label: 'Total Ongoing Fee Burden', format: 'pct' },
      { key: 'fee_escalation_rights', label: 'Fee Escalation Rights', format: 'boolean' },
    ],
  },
  {
    id: 'item7',
    label: 'Item 7 — Initial Investment',
    fields: [
      { key: 'total_investment_min', label: 'Total Investment Minimum', format: 'currency' },
      { key: 'total_investment_max', label: 'Total Investment Maximum', format: 'currency' },
      { key: 'component_real_estate', label: 'Real Estate / Rent' },
      { key: 'component_equipment', label: 'Equipment' },
      { key: 'component_initial_inventory', label: 'Initial Inventory' },
      { key: 'component_working_capital', label: 'Working Capital' },
      { key: 'working_capital_months_covered', label: 'WC Months Covered' },
      { key: 'estimated_cogs_pct', label: 'Est. COGS % (industry est.)', format: 'pct' },
    ],
  },
  {
    id: 'item11_12',
    label: 'Items 11–12 — Training & Territory',
    fields: [
      { key: 'initial_training_hours', label: 'Initial Training Hours' },
      { key: 'ongoing_training_available', label: 'Ongoing Training', format: 'boolean' },
      { key: 'field_support_visits', label: 'Field Support Visits' },
      { key: 'typical_fte_employees', label: 'Typical FTE Employees' },
      { key: 'opening_day_employees', label: 'Opening Day Employees (est.)' },
      { key: 'investor_role', label: 'Investor Role' },
      { key: 'typical_time_to_open_months', label: 'Est. Months to Open' },
      { key: 'territory_type', label: 'Territory Type' },
      { key: 'territory_definition', label: 'Territory Definition' },
      { key: 'ecommerce_carve_out', label: 'E-commerce Carve-Out', format: 'boolean' },
      { key: 'territory_size_households', label: 'Territory Households' },
      { key: 'franchisor_minimum_separation_miles', label: 'Min. Separation (miles)' },
    ],
  },
  {
    id: 'item17',
    label: 'Item 17 — Renewal, Termination & Transfer',
    fields: [
      { key: 'initial_term_years', label: 'Initial Term', format: 'years' },
      { key: 'renewal_available', label: 'Renewal Available', format: 'boolean' },
      { key: 'renewal_on_current_terms', label: 'Renews on Current Terms', format: 'boolean' },
      { key: 'termination_triggers_count', label: 'Termination Triggers' },
      { key: 'cure_period_days', label: 'Cure Period (days)' },
      { key: 'transfer_fee', label: 'Transfer Fee', format: 'currency' },
      { key: 'transfer_approval_timeline_days', label: 'Transfer Approval Timeline (days)' },
      { key: 'right_of_first_refusal_on_sale', label: 'ROFR on Sale', format: 'boolean' },
      { key: 'transfer_to_entity_allowed', label: 'Transfer to Entity Allowed', format: 'boolean' },
      { key: 'post_termination_noncompete_years', label: 'Non-compete (years)', format: 'years' },
      { key: 'post_termination_noncompete_radius_miles', label: 'Non-compete Radius (miles)' },
    ],
  },
  {
    id: 'item19',
    label: 'Item 19 — Financial Performance',
    fields: [
      { key: 'item19_present', label: 'Item 19 Present', format: 'boolean' },
      { key: 'item19_metric_type', label: 'Metric Type' },
      { key: 'item19_fiscal_year', label: 'Fiscal Year Covered' },
      { key: 'item19_auv', label: 'Average Unit Volume', format: 'currency' },
      { key: 'item19_median', label: 'Median Revenue', format: 'currency' },
      { key: 'item19_mean', label: 'Mean Revenue', format: 'currency' },
      { key: 'item19_high', label: 'Highest Unit', format: 'currency' },
      { key: 'item19_low', label: 'Lowest Unit', format: 'currency' },
      { key: 'item19_units_included', label: 'Units in Calculation' },
      { key: 'item19_pct_system_included', label: '% of System Included', format: 'pct' },
      { key: 'item19_includes_franchisee_units', label: 'Includes Franchisee Units', format: 'boolean' },
      { key: 'item19_cherry_pick_flag', label: 'Cherry-Pick Risk', format: 'boolean' },
      { key: 'covid_period_flag', label: 'COVID Period Data', format: 'boolean' },
    ],
  },
  {
    id: 'item20_21',
    label: 'Items 20–21 — Outlets & Financials',
    fields: [
      { key: 'total_units_open_current', label: 'Total Units Open' },
      { key: 'units_opened_yr1', label: 'Units Opened (Year 1)' },
      { key: 'units_opened_yr2', label: 'Units Opened (Year 2)' },
      { key: 'units_opened_yr3', label: 'Units Opened (Year 3)' },
      { key: 'units_closed_yr1', label: 'Units Closed (Year 1)' },
      { key: 'units_closed_yr2', label: 'Units Closed (Year 2)' },
      { key: 'units_closed_yr3', label: 'Units Closed (Year 3)' },
      { key: 'franchisee_initiated_closures_3yr', label: 'Franchisee-Initiated Closures (3yr)' },
      { key: 'franchisor_initiated_terminations_3yr', label: 'Franchisor-Initiated Terminations (3yr)' },
      { key: 'audit_opinion', label: 'Audit Opinion' },
      { key: 'royalty_revenue_trend', label: 'Royalty Revenue Trend' },
      { key: 'royalty_vs_fee_ratio', label: 'Royalty vs Fee Ratio' },
      { key: 'franchisor_net_income', label: 'Franchisor Net Income', format: 'currency' },
      { key: 'liquidity_ratio', label: 'Liquidity Ratio' },
      { key: 'debt_covenant_flags', label: 'Debt Covenant Flags', format: 'boolean' },
    ],
  },
];

// ============================================================================
// Formatters
// ============================================================================

function formatValue(value: FddFieldMeta['value'], format?: FieldDef['format']): string {
  if (value === null || value === undefined) return '—';
  if (format === 'currency' && typeof value === 'number') {
    return '$' + value.toLocaleString();
  }
  if (format === 'pct' && typeof value === 'number') {
    return (value * 100).toFixed(1) + '%';
  }
  if (format === 'boolean') {
    return value === true ? 'Yes' : value === false ? 'No' : '—';
  }
  if (format === 'years' && typeof value === 'number') {
    return `${value} year${value !== 1 ? 's' : ''}`;
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function confidenceBadge(conf: FddFieldMeta['_conf']) {
  if (conf === 'high') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">High</span>;
  if (conf === 'medium') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Medium</span>;
  if (conf === 'low') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">Low — verify</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">Not disclosed</span>;
}

// ============================================================================
// Main page
// ============================================================================

export default function FddReviewPage() {
  const params = useParams();
  const router = useRouter();
  const fddId = params.fddId as string;
  const supabase = createBrowserSupabaseClient();

  const [fdd, setFdd] = useState<FddAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['item1', 'item5_6', 'item19']));

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('fdd_analyses')
        .select('*')
        .eq('id', fddId)
        .single();
      if (error || !data) {
        router.push('/fdd/upload');
        return;
      }
      setFdd(data as FddAnalysis);
      setLoading(false);
    }
    load();
  }, [fddId, supabase, router]);

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
      </main>
    );
  }

  if (!fdd) return null;

  const fields = (fdd.extracted_fields || {}) as Record<string, FddFieldMeta>;
  const brandName = (fields['franchisor_legal_name']?.value as string) || fdd.original_filename;
  const ageMonths = fdd.fdd_age_months;
  const isStale = fdd.fdd_stale;
  const regStatus = fdd.state_registration_status;
  const flagCount = fdd.flag_count || 0;

  // Count low-confidence fields
  const lowConfFields = Object.values(fields).filter(f => f?._conf === 'low').length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2">FDD Intelligence — Extraction Review</p>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-light text-white mb-2">
            {brandName}
          </h1>
          <p className="text-white/40 text-sm">{fdd.original_filename} · {fdd.page_count ?? '?'} pages</p>
        </div>

        {/* Alert banners */}
        {isStale && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 flex gap-3">
            <span className="text-amber-400 mt-0.5">⚠</span>
            <div>
              <p className="text-amber-400 text-sm font-medium mb-0.5">FDD may be outdated</p>
              <p className="text-amber-400/70 text-xs">
                {ageMonths !== null && ageMonths !== undefined
                  ? `This FDD is ${ageMonths} months old.${ageMonths > 18 ? ' It may be superseded by a newer version. Request the current FDD before proceeding.' : ' Confirm no material changes since issuance.'}`
                  : 'FDD effective date could not be determined — confirm currency with your franchisor.'}
              </p>
            </div>
          </div>
        )}

        {regStatus === 'fail' && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 flex gap-3">
            <span className="text-red-400 mt-0.5">✕</span>
            <div>
              <p className="text-red-400 text-sm font-medium mb-0.5">Registration state — not confirmed</p>
              <p className="text-red-400/70 text-xs">
                {fdd.target_state} is a franchise registration state. This franchisor does not appear to be registered to sell there. Attorney review required before any investment decision.
              </p>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Fields extracted', value: Object.values(fields).filter(f => f?.value !== null && f?._conf !== 'not_disclosed').length },
            { label: 'Flags identified', value: flagCount, alert: flagCount > 0 },
            { label: 'Needs verification', value: lowConfFields, alert: lowConfFields > 0 },
          ].map(({ label, value, alert }) => (
            <div key={label} className={`rounded-xl border px-5 py-4 ${alert && (value as number) > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8 bg-white/3'}`}>
              <div className={`text-2xl font-light mb-1 ${alert && (value as number) > 0 ? 'text-amber-400' : 'text-white'}`}>
                {value}
              </div>
              <div className="text-xs text-white/40">{label}</div>
            </div>
          ))}
        </div>

        {/* Field sections */}
        <div className="space-y-3 mb-10">
          {ITEM_SECTIONS.map(section => {
            const isOpen = openSections.has(section.id);
            const sectionFields = section.fields.filter(f => fields[f.key]);
            const sectionLowConf = sectionFields.filter(f => fields[f.key]?._conf === 'low').length;

            return (
              <div key={section.id} className="border border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{section.label}</span>
                    {sectionLowConf > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                        {sectionLowConf} to verify
                      </span>
                    )}
                  </div>
                  <span className="text-white/30 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5">
                    {section.fields.map(fieldDef => {
                      const meta = fields[fieldDef.key] as FddFieldMeta | undefined;
                      if (!meta) {
                        return (
                          <div key={fieldDef.key} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                            <span className="text-xs text-white/30">{fieldDef.label}</span>
                            <span className="text-xs text-white/20">—</span>
                          </div>
                        );
                      }

                      const isLow = meta._conf === 'low';
                      return (
                        <div
                          key={fieldDef.key}
                          className={`px-5 py-3 border-b border-white/5 last:border-0 ${isLow ? 'bg-amber-500/5' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-xs text-white/40 shrink-0 mt-0.5 w-44">{fieldDef.label}</span>
                            <div className="flex-1 text-right">
                              <span className="text-sm text-white block mb-1">
                                {formatValue(meta.value, fieldDef.format)}
                              </span>
                              <div className="flex items-center justify-end gap-2">
                                {confidenceBadge(meta._conf)}
                                {meta._page && (
                                  <span className="text-[10px] text-white/25">p.{meta._page}</span>
                                )}
                              </div>
                              {meta._quote && meta._conf !== 'not_disclosed' && (
                                <p className="text-[10px] text-white/25 mt-1 text-left italic leading-relaxed">
                                  &quot;{meta._quote}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Next step</p>
          <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-white mb-3">
            Score for E-2 Compatibility
          </h2>
          <p className="text-white/40 text-sm mb-6">
            The scoring engine analyses all {Object.keys(fields).length} extracted fields across
            5 dimensions — investment substantiality, non-marginality, develop &amp; direct,
            eligibility gates, and risk flags.
          </p>

          {lowConfFields > 0 && (
            <p className="text-xs text-amber-400/80 mb-4">
              {lowConfFields} field{lowConfFields !== 1 ? 's' : ''} have low confidence — review the highlighted rows above before proceeding for best results.
            </p>
          )}

          <button
            onClick={() => router.push(`/fdd/score/${fddId}`)}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3.5 rounded-xl text-sm tracking-wide hover:bg-[#d4b55a] transition-colors"
          >
            Continue to E-2 Scoring →
          </button>
        </div>

        <p className="text-xs text-white/20 text-center mt-6 leading-relaxed">
          Extraction is based on disclosed information in the FDD. FDD disclosures are self-reported
          by franchisors. Always engage a qualified franchise attorney before making any investment decision.
        </p>
      </div>
    </main>
  );
}
