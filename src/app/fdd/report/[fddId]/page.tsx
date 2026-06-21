'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis, FddCompatibility, FddFinalReport, FddProfessionalReport } from '@/types/fdd';

// ============================================================================
// Type guards
// ============================================================================

function isProfessionalReport(r: FddFinalReport | FddProfessionalReport): r is FddProfessionalReport {
  return 'report_version' in r && (r as FddProfessionalReport).report_version === '2.0';
}

// ============================================================================
// Design tokens
// ============================================================================

const COMPAT_CONFIG: Record<FddCompatibility, { color: string; bg: string; border: string }> = {
  STRONG:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  VIABLE:    { color: 'text-[#C9A84C]',  bg: 'bg-[#C9A84C]/10',  border: 'border-[#C9A84C]/30'  },
  CAUTION:   { color: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/30'  },
  INELIGIBLE:{ color: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30'    },
};

const REC_CONFIG = {
  PROCEED:                  { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'PROCEED' },
  PROCEED_WITH_CONDITIONS:  { color: 'text-[#C9A84C]',  bg: 'bg-[#C9A84C]/10',  border: 'border-[#C9A84C]/30',  label: 'PROCEED WITH CONDITIONS' },
  DO_NOT_PROCEED:           { color: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30',    label: 'DO NOT PROCEED' },
};

const SEVERITY_CONFIG: Record<string, { color: string; dot: string }> = {
  CRITICAL: { color: 'text-red-400',    dot: 'bg-red-400' },
  HIGH:     { color: 'text-amber-400',  dot: 'bg-amber-400' },
  MODERATE: { color: 'text-[#C9A84C]', dot: 'bg-[#C9A84C]' },
  LOW:      { color: 'text-white/40',   dot: 'bg-white/30' },
};

const VERDICT_CONFIG: Record<string, { color: string }> = {
  PASS: { color: 'text-emerald-400' },
  WARN: { color: 'text-amber-400' },
  FAIL: { color: 'text-red-400' },
};

// ============================================================================
// Shared small components
// ============================================================================

function MetricTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className={`text-base font-medium leading-tight ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-white/25 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function BulletList({ items, icon }: { items: string[]; icon: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-white/70">
          <span className="shrink-0 mt-0.5 text-xs">{icon}</span>
          <span>{item.replace(/^[•\-\d.]+\s*/, '')}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">{children}</h2>;
}

// ============================================================================
// Professional V2 report renderer
// ============================================================================

function ProfessionalReport({
  analysis,
  report,
  onPrint,
  onImport,
}: {
  analysis: FddAnalysis;
  report: FddProfessionalReport;
  onPrint: () => void;
  onImport: () => void;
}) {
  const router = useRouter();
  const fddId = analysis.id;
  const rec = REC_CONFIG[report.executive_summary.recommendation];
  const km = report.executive_summary.key_metrics;
  const compat = analysis.overall_compatibility;
  const compatCfg = compat ? COMPAT_CONFIG[compat] : COMPAT_CONFIG.VIABLE;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence Report</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {report.franchise_name}
          </h1>
          <p className="text-white/40 text-sm">
            {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
            {analysis.transaction_type && <> · {analysis.transaction_type.replace(/_/g, ' ')}</>}
          </p>
        </div>
        <button onClick={onPrint} className="text-white/30 text-xs hover:text-white/50 transition-colors mt-1 shrink-0">
          Print / PDF
        </button>
      </div>

      {/* Recommendation banner */}
      <div className={`rounded-2xl border ${rec.border} ${rec.bg} p-6`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Investment Recommendation</p>
          <span className={`text-xs font-semibold ${rec.color}`}>{rec.label}</span>
        </div>
        <p className={`font-['Cormorant_Garamond'] text-2xl font-light ${rec.color} mb-3 leading-snug`}>
          {report.executive_summary.one_line_verdict}
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          {report.executive_summary.recommendation_rationale}
        </p>
      </div>

      {/* Conditions (if any) */}
      {report.executive_summary.conditions.length > 0 && (
        <div className="border border-amber-400/20 bg-amber-400/5 rounded-xl p-5">
          <h2 className="text-amber-400 text-xs uppercase tracking-widest mb-3">Conditions Before Proceeding</h2>
          <ol className="space-y-2">
            {report.executive_summary.conditions.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-white/70">
                <span className="text-amber-400 font-medium shrink-0">{i + 1}.</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Key metrics */}
      <div>
        <SectionLabel>Key Metrics</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricTile label="Investment range" value={km.investment_range} />
          <MetricTile label="Item 19 AUV" value={km.item19_auv} sub="median unit revenue" />
          <MetricTile label="Estimated ODE" value={km.ode_central} sub="owner income (central)" />
          <MetricTile label="E-2 compatibility" value={km.e2_score} color={compatCfg.color} />
          <MetricTile label="System churn" value={km.system_churn} sub="annual unit turnover" />
          <MetricTile label="Payback period" value={km.payback_period_years} />
        </div>
      </div>

      {/* Strengths + Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-emerald-500/15 bg-emerald-500/5 rounded-xl p-5">
          <h2 className="text-emerald-400 text-xs uppercase tracking-widest mb-4">Strengths</h2>
          <div className="space-y-3">
            {report.executive_summary.strengths.map((s, i) => (
              <div key={i}>
                <p className="text-white/80 text-sm font-medium">{s.title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{s.evidence}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-amber-500/15 bg-amber-500/5 rounded-xl p-5">
          <h2 className="text-amber-400 text-xs uppercase tracking-widest mb-4">Key Risks</h2>
          <div className="space-y-3">
            {report.executive_summary.risks.map((r, i) => (
              <div key={i}>
                <p className="text-white/80 text-sm font-medium">{r.title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{r.consequence}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ODE Scenarios */}
      <div>
        <SectionLabel>Financial Scenarios — Owner Discretionary Earnings</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {(['conservative', 'central', 'optimistic'] as const).map(scenario => {
            const data = report.financial_performance.ode_scenarios[scenario];
            const isCenter = scenario === 'central';
            return (
              <div key={scenario} className={`rounded-xl p-4 border ${isCenter ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5' : 'border-white/10'}`}>
                <p className={`text-xs uppercase tracking-wider mb-2 ${isCenter ? 'text-[#C9A84C]' : 'text-white/40'}`}>
                  {scenario}
                </p>
                <p className="text-white text-lg font-medium">
                  {data.ode !== null ? `$${Math.round(data.ode).toLocaleString()}` : '—'}
                </p>
                <p className="text-white/30 text-xs mt-1 leading-snug">{data.assumption}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/40">Break-even revenue:</span>
            <span className="text-white/70">
              {report.financial_performance.break_even_monthly_revenue
                ? `$${Math.round(report.financial_performance.break_even_monthly_revenue).toLocaleString()}/mo`
                : 'Not calculated'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">Non-marginality:</span>
            <span className={
              report.financial_performance.non_marginality_verdict === 'PASSES' ? 'text-emerald-400' :
              report.financial_performance.non_marginality_verdict === 'BORDERLINE' ? 'text-amber-400' :
              report.financial_performance.non_marginality_verdict === 'FAILS' ? 'text-red-400' : 'text-white/40'
            }>
              {report.financial_performance.non_marginality_verdict}
            </span>
          </div>
        </div>
        <p className="text-white/30 text-xs mt-2 leading-relaxed">
          {report.financial_performance.non_marginality_explanation}
        </p>
      </div>

      {/* Fee waterfall (top 4 lines) */}
      <div>
        <SectionLabel>Fee Structure — Franchisor Take</SectionLabel>
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {report.fee_structure.waterfall.slice(0, 4).map((line, i) => (
              <div key={i} className={`flex justify-between items-center px-5 py-3 ${i === 0 ? 'bg-white/3' : ''}`}>
                <span className="text-white/60 text-xs">{line.label}</span>
                <div className="text-right">
                  <span className={`text-xs font-medium ${line.pct_of_gross < 0 ? 'text-red-400/70' : 'text-white'}`}>
                    {line.pct_of_gross > 0 ? '+' : ''}{line.pct_of_gross.toFixed(1)}%
                  </span>
                  {line.annual_on_auv !== null && (
                    <span className="text-white/30 text-xs ml-2">
                      ${Math.abs(Math.round(line.annual_on_auv)).toLocaleString()}/yr
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-5 py-3 bg-white/5">
              <span className="text-white/80 text-xs font-medium">Franchisee gross profit (after all franchisor fees)</span>
              <span className={`text-sm font-semibold ${
                report.fee_structure.franchisee_gross_profit_pct > 45 ? 'text-emerald-400' :
                report.fee_structure.franchisee_gross_profit_pct > 35 ? 'text-[#C9A84C]' : 'text-amber-400'
              }`}>
                {report.fee_structure.franchisee_gross_profit_pct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-white/30 text-xs">Fee burden: <span className={
            report.fee_structure.fee_burden_rating === 'EXCESSIVE' ? 'text-red-400' :
            report.fee_structure.fee_burden_rating === 'HEAVY' ? 'text-amber-400' :
            report.fee_structure.fee_burden_rating === 'MODERATE' ? 'text-[#C9A84C]' : 'text-emerald-400'
          }>{report.fee_structure.fee_burden_rating}</span></span>
          {report.fee_structure.hidden_cost_warnings.length > 0 && (
            <span className="text-amber-400/70 text-xs">{report.fee_structure.hidden_cost_warnings.length} hidden cost warning{report.fee_structure.hidden_cost_warnings.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* System health + Franchisor health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">System Health (Item 20)</h2>
          <div className={`text-lg font-light mb-2 font-['Cormorant_Garamond'] ${
            report.system_health.overall_rating === 'EXPANDING' ? 'text-emerald-400' :
            report.system_health.overall_rating === 'STABLE' ? 'text-[#C9A84C]' :
            report.system_health.overall_rating === 'CONTRACTING' ? 'text-amber-400' : 'text-red-400'
          }`}>{report.system_health.overall_rating}</div>
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-xs">Net unit change (3yr)</span>
              <span className="text-white/70 text-xs">
                {report.system_health.net_unit_change_3yr !== null
                  ? `${report.system_health.net_unit_change_3yr > 0 ? '+' : ''}${report.system_health.net_unit_change_3yr}`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-xs">Annual churn</span>
              <span className={`text-xs ${
                report.system_health.churn_rate_annual === null ? 'text-white/40' :
                report.system_health.churn_rate_annual < 0.05 ? 'text-emerald-400' :
                report.system_health.churn_rate_annual < 0.08 ? 'text-[#C9A84C]' :
                report.system_health.churn_rate_annual < 0.12 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {report.system_health.churn_rate_annual !== null
                  ? `${(report.system_health.churn_rate_annual * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
          <p className="text-white/40 text-xs leading-relaxed">{report.system_health.analyst_commentary}</p>
        </div>

        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Franchisor Health (Item 21)</h2>
          <div className={`text-lg font-light mb-2 font-['Cormorant_Garamond'] ${
            report.franchisor_financial_health.overall_rating === 'STRONG' ? 'text-emerald-400' :
            report.franchisor_financial_health.overall_rating === 'ADEQUATE' ? 'text-[#C9A84C]' :
            report.franchisor_financial_health.overall_rating === 'WEAK' ? 'text-amber-400' : 'text-red-400'
          }`}>{report.franchisor_financial_health.overall_rating}</div>
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-xs">Insolvency risk</span>
              <span className={`text-xs ${
                report.franchisor_financial_health.insolvency_risk === 'LOW' ? 'text-emerald-400' :
                report.franchisor_financial_health.insolvency_risk === 'MODERATE' ? 'text-[#C9A84C]' :
                report.franchisor_financial_health.insolvency_risk === 'HIGH' ? 'text-amber-400' : 'text-red-400'
              }`}>{report.franchisor_financial_health.insolvency_risk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-xs">Audit opinion</span>
              <span className="text-white/70 text-xs truncate ml-2 max-w-[140px]">{report.franchisor_financial_health.audit_opinion}</span>
            </div>
          </div>
          <p className="text-white/40 text-xs leading-relaxed">{report.franchisor_financial_health.support_capacity_assessment}</p>
        </div>
      </div>

      {/* E-2 compatibility dimensions */}
      <div>
        <SectionLabel>E-2 Visa Compatibility — Dimension by Dimension</SectionLabel>
        <div className="space-y-3">
          {Object.entries(report.e2_compatibility.dimensions).map(([key, dim]) => (
            <div key={key} className="border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-semibold ${VERDICT_CONFIG[dim.verdict]?.color ?? 'text-white/40'}`}>
                  {dim.verdict}
                </span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed mb-1">{dim.what_officer_looks_for}</p>
              <p className="text-white/30 text-xs">{dim.regulatory_basis}</p>
            </div>
          ))}
        </div>
        {report.e2_compatibility.timing_warning && (
          <div className="mt-3 border border-amber-400/20 bg-amber-400/5 rounded-xl px-4 py-3">
            <p className="text-amber-400/80 text-xs">{report.e2_compatibility.timing_warning}</p>
          </div>
        )}
      </div>

      {/* Legal risk */}
      <div className="border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/40 text-xs uppercase tracking-widest">Legal Risk (Items 3 & 4)</h2>
          <span className={`text-xs font-semibold ${
            report.legal_risk.overall_rating === 'LOW' ? 'text-emerald-400' :
            report.legal_risk.overall_rating === 'MODERATE' ? 'text-[#C9A84C]' :
            report.legal_risk.overall_rating === 'HIGH' ? 'text-amber-400' : 'text-red-400'
          }`}>{report.legal_risk.overall_rating}</span>
        </div>
        <p className="text-white/60 text-sm leading-relaxed mb-3">{report.legal_risk.analyst_commentary}</p>
        {report.legal_risk.attorney_priority_items.length > 0 && (
          <div>
            <p className="text-white/30 text-xs mb-2">Attorney review priorities:</p>
            <BulletList items={report.legal_risk.attorney_priority_items} icon="→" />
          </div>
        )}
      </div>

      {/* Risk matrix */}
      <div>
        <SectionLabel>Risk Summary Matrix</SectionLabel>
        <div className="space-y-2">
          {report.risk_matrix.map((item, i) => {
            const sc = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.MODERATE;
            return (
              <div key={i} className="border border-white/8 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-white/80 text-sm font-medium">{item.risk}</p>
                      <span className={`text-xs shrink-0 ${sc.color}`}>{item.severity}</span>
                    </div>
                    <p className="text-white/40 text-xs leading-relaxed mb-1">{item.specific_consequence}</p>
                    <p className="text-white/30 text-xs leading-relaxed">Mitigation: {item.mitigation}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-white/20 text-xs">{item.fdd_item_reference}</span>
                      {item.pre_signing_action_required && (
                        <span className="text-amber-400/60 text-xs">Action required before signing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business plan requirements */}
      {report.e2_compatibility.business_plan_requirements.length > 0 && (
        <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/3 rounded-xl p-5">
          <h2 className="text-[#C9A84C] text-xs uppercase tracking-widest mb-3">Business Plan Requirements for E-2</h2>
          <BulletList items={report.e2_compatibility.business_plan_requirements} icon="✓" />
        </div>
      )}

      {/* Import to Case File CTA */}
      <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/3 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">Ready to proceed?</p>
          <p className="text-white/40 text-xs leading-relaxed">
            Import these findings into your E-2 case file — investment, compatibility, and territory data pre-filled.
          </p>
        </div>
        <button
          onClick={onImport}
          className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-6 py-3 text-sm hover:bg-[#d4b55a] transition-colors shrink-0"
          style={{ borderRadius: 0 }}
        >
          Import to Case File
        </button>
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
        Generated {new Date(report.generated_at).toLocaleDateString()}.
      </p>
    </div>
  );
}

// ============================================================================
// Legacy V1 full report (backward compatible)
// ============================================================================

function LegacyFullReport({ analysis, report, onPrint }: {
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
  const ta = analysis.territory_analysis as { overall_rating?: string; overall_score?: number } | null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">FDD Intelligence Report</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {fields?.franchisor_legal_name?.value as string ?? analysis.original_filename}
          </h1>
          <p className="text-white/40 text-sm">
            {analysis.target_city ? `${analysis.target_city}, ` : ''}{analysis.target_state ?? ''}
          </p>
        </div>
        <button onClick={onPrint} className="text-white/30 text-xs hover:text-white/50 transition-colors mt-1 shrink-0">
          Print / PDF
        </button>
      </div>

      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 flex items-center justify-between`}>
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">E-2 Compatibility</p>
          <p className={`font-['Cormorant_Garamond'] text-3xl font-light ${cfg.color}`}>{compat}</p>
        </div>
        <div className="text-right">
          {ta?.overall_rating && (
            <p className="text-white/40 text-xs">Territory: {ta.overall_rating}{ta.overall_score ? ` (${ta.overall_score}/100)` : ''}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Min. investment" value={totalMin ? `$${totalMin.toLocaleString()}` : '—'} />
        <MetricTile label="Max. investment" value={totalMax ? `$${totalMax.toLocaleString()}` : '—'} />
        <MetricTile label="Median AUV" value={auv ? `$${auv.toLocaleString()}` : 'N/A'} sub={auv ? 'Item 19' : 'Not disclosed'} />
        <MetricTile label="Royalty" value={royalty !== null ? `${(royalty * 100).toFixed(1)}%` : '—'} sub="of gross revenue" />
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Executive Summary</h2>
        <p className="text-white/80 text-sm leading-relaxed">{report.executive_summary}</p>
      </div>

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

      <div className="border border-white/10 rounded-xl p-5">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">Financial Picture</h2>
        <p className="text-white/70 text-sm leading-relaxed">{report.financial_picture}</p>
      </div>

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        {[
          { label: 'E-2 Score', href: `/fdd/score/${fddId}` },
          { label: 'Territory', href: `/fdd/territory/${fddId}` },
          { label: 'Questions', href: `/fdd/questions/${fddId}` },
          { label: 'Raw Extraction', href: `/fdd/review/${fddId}` },
        ].map(({ label, href }) => (
          <button key={label} onClick={() => router.push(href)}
            className="border border-white/10 text-white/50 py-3 rounded-xl text-xs hover:border-white/20 hover:text-white/70 transition-all">
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/20 text-center leading-relaxed pb-4">
        This report is an informational tool and does not constitute legal, immigration, financial, or franchise advice.
      </p>
    </div>
  );
}

// ============================================================================
// Teaser — shown to users without paid FDD access
// ============================================================================

function FreeTeaser({ analysis, onUpgrade, upgrading }: {
  analysis: FddAnalysis;
  onUpgrade: () => void;
  upgrading: boolean;
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

      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="E-2 Compatibility" value={compat ?? '—'} color={cfg.color} />
        <MetricTile label="Investment range" value={totalMin ? `$${(totalMin / 1000).toFixed(0)}K–$${((totalMax ?? totalMin * 1.5) / 1000).toFixed(0)}K` : '—'} />
        <MetricTile label="Median AUV" value={auv ? `$${(auv / 1000).toFixed(0)}K` : 'Not disclosed'} sub={auv ? 'per franchisee' : undefined} />
      </div>

      {(analysis.flag_count ?? 0) > 0 && (
        <div className={`border ${cfg.border} ${cfg.bg} rounded-xl px-5 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-white/60 text-sm font-medium">{analysis.flag_count} issue{analysis.flag_count !== 1 ? 's' : ''} flagged</p>
            <p className="text-white/30 text-xs mt-0.5">Full report shows each flag with specific explanations</p>
          </div>
          <span className={`text-2xl font-light ${cfg.color}`}>{analysis.flag_count}</span>
        </div>
      )}

      <div className="relative rounded-2xl border border-white/10 overflow-hidden">
        <div className="blur-sm select-none pointer-events-none p-6 space-y-4">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/6 rounded w-full" />
          <div className="h-3 bg-white/6 rounded w-5/6" />
          <div className="h-3 bg-white/6 rounded w-full" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/80 p-6 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="font-['Cormorant_Garamond'] text-2xl text-white mb-2">Full Report Locked</h2>
          <p className="text-white/50 text-sm mb-6 max-w-xs leading-relaxed">
            Upgrade to FDD Intelligence to unlock your professional report: E-2 scoring, territory analysis,
            fee waterfall, ODE scenarios, risk matrix, and 20+ due diligence questions.
          </p>
          <button
            onClick={onUpgrade}
            disabled={upgrading}
            className="bg-[#C9A84C] text-[#0a0a0a] font-semibold px-8 py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {upgrading ? 'Redirecting to checkout...' : 'Unlock Full Report — $297'}
          </button>
          <p className="text-white/25 text-xs mt-3">One-time payment · Professional franchise investment analysis</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

// ============================================================================
// Import to Case File modal
// ============================================================================

interface ImportGroup {
  label: string;
  items: Array<{ key: string; label: string; value: string }>;
}

interface ImportModalProps {
  fddId: string;
  onClose: () => void;
}

function ImportModal({ fddId, onClose }: ImportModalProps) {
  const [state, setState] = useState<'confirm' | 'loading' | 'done' | 'error'>('confirm');
  const [groups, setGroups] = useState<ImportGroup[]>([]);
  const [totalWritten, setTotalWritten] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleImport() {
    setState('loading');
    try {
      const res = await fetch('/api/fdd/writeback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });
      const json = await res.json() as { preview?: { total_written: number; groups: ImportGroup[] }; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Import failed');
      setGroups(json.preview?.groups ?? []);
      setTotalWritten(json.preview?.total_written ?? 0);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed');
      setState('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/15 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {state === 'confirm' && (
            <>
              <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Case File Integration</p>
              <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-white mb-2">
                Import to Case File
              </h2>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                FDD Intelligence findings — investment amounts, business details, E-2 compatibility, and territory data — will be imported into your E-2 case file. Existing answers will be updated; nothing will be deleted.
              </p>
              <div className="space-y-3 mb-6">
                {['Business Identity', 'Financial', 'Employment', 'E-2 Analysis', 'Territory'].map(g => (
                  <div key={g} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                    <span className="text-white/60 text-sm">{g}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  className="flex-1 bg-[#C9A84C] text-[#0a0a0a] font-semibold py-3 text-sm hover:bg-[#d4b55a] transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Import findings
                </button>
                <button
                  onClick={onClose}
                  className="border border-white/15 text-white/50 px-5 py-3 text-sm hover:border-white/30 hover:text-white/70 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {state === 'loading' && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/50 text-sm">Writing to case file…</p>
            </div>
          )}

          {state === 'done' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <path d="M1 6L5.5 10.5L15 1" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{totalWritten} fields imported</p>
                  <p className="text-white/40 text-xs">Your E-2 case file has been updated</p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                {groups.map(g => (
                  <div key={g.label}>
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-2">{g.label}</p>
                    <div className="space-y-1.5">
                      {g.items.map(item => (
                        <div key={item.key} className="flex items-center justify-between gap-3">
                          <span className="text-white/50 text-xs truncate">{item.label}</span>
                          <span className="text-white/80 text-xs text-right max-w-[55%] truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-full border border-white/15 text-white/60 py-3 text-sm hover:border-white/30 hover:text-white/80 transition-colors"
                style={{ borderRadius: 0 }}
              >
                Close
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
              <button
                onClick={onClose}
                className="text-white/40 text-xs hover:text-white/60"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================

export default function FddReportPage() {
  const params = useParams<{ fddId: string }>();
  const fddId = params.fddId;

  const [analysis, setAnalysis] = useState<FddAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
      // Auto-generate report if access is granted but report not yet produced
      if (data.report_unlocked && !data.final_report && data.e2_score) {
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
      await loadAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpgrade() {
    if (!fddId || upgrading) return;
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'fdd_intelligence',
          fddId,
          successUrl: `${window.location.origin}/fdd/report/${fddId}?unlocked=1`,
          cancelUrl: window.location.href,
        }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment setup failed');
      setUpgrading(false);
    }
  }

  // After returning from Stripe success, poll until report_unlocked flips true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('unlocked') !== '1') return;
    const poll = setInterval(async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('fdd_analyses')
        .select('report_unlocked')
        .eq('id', fddId)
        .single();
      if (data?.report_unlocked) {
        clearInterval(poll);
        loadAnalysis();
        // Remove ?unlocked=1 from URL cleanly
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, 2000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fddId]);

  if (loading || generating) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {generating ? 'Compiling professional report...' : 'Loading...'}
          </p>
          {generating && (
            <p className="text-white/25 text-xs mt-2">
              8 analytical sections running in parallel · typically 25–40 seconds
            </p>
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
          <button onClick={() => setError('')} className="text-white/40 text-xs hover:text-white/60">
            Dismiss
          </button>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  const hasAccess = analysis.report_unlocked;
  const report = analysis.final_report;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {hasAccess && report ? (
        isProfessionalReport(report)
          ? <ProfessionalReport analysis={analysis} report={report} onPrint={() => window.print()} onImport={() => setImportOpen(true)} />
          : <LegacyFullReport analysis={analysis} report={report as FddFinalReport} onPrint={() => window.print()} />
      ) : (
        <FreeTeaser analysis={analysis} onUpgrade={handleUpgrade} upgrading={upgrading} />
      )}
      {importOpen && fddId && (
        <ImportModal fddId={fddId} onClose={() => setImportOpen(false)} />
      )}
    </main>
  );
}
