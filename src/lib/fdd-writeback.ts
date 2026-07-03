// ============================================================================
// FDD platform-integration writeback — single shared module
// ============================================================================
// Derives the answer-key set that FDD intelligence writes into a user's
// E-2 application, and upserts it. Previously duplicated between
// /api/fdd/report (auto-fires after report generation) and
// /api/fdd/writeback (explicit user-triggered import) — now both call this.
// ============================================================================

import type { FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';
import type { TerritoryAnalysis } from '@/lib/fdd-territory-engine';
import type { FddProfessionalReport } from '@/lib/fdd-report-engine';
import { createServiceClient } from '@/lib/supabase-service';

export interface FddAnswerUpdate {
  key: string;
  label: string;
  value: string;
  group: string;
}

export interface WritebackPreview {
  total_written: number;
  groups: Array<{
    label: string;
    items: Array<{ key: string; label: string; value: string }>;
  }>;
}

// ============================================================================
// Derive answer keys from all available analysis data
// ============================================================================

export function deriveFddAnswerKeys(
  fields: FddExtractedFields,
  scoring: ScoringResult | null,
  territory: TerritoryAnalysis | null,
  report: FddProfessionalReport | null,
  analysis: Record<string, unknown>
): FddAnswerUpdate[] {
  const out: FddAnswerUpdate[] = [];

  function push(key: string, label: string, value: string | number | null | undefined, group: string) {
    if (value === null || value === undefined || value === '') return;
    out.push({ key, label, value: String(value), group });
  }

  // ── Business identity ────────────────────────────────────────────────────
  push('QA-NEW-04', 'Business name',     fields.franchisor_legal_name?.value as string, 'Business Identity');
  push('QA-NEW-11', 'Target state',      analysis.target_state as string,               'Business Identity');
  push('QA-NEW-03', 'Business category', territory?.franchise_category,                 'Business Identity');
  push('QA-NEW-12', 'Territory type',    fields.territory_type?.value as string,        'Business Identity');

  // ── Financial ─────────────────────────────────────────────────────────────
  const investMin = fields.total_investment_min?.value as number | null;
  push('QF-NEW-01', 'Investment amount',  investMin,                            'Financial');
  push('QA-FDD-AUV', 'Median AUV (Item 19)',
    (fields.item19_median?.value ?? fields.item19_auv?.value) as number | null, 'Financial');
  const royalty = fields.royalty_rate_pct?.value as number | null;
  push('QA-FDD-ROYALTY', 'Royalty rate',
    royalty !== null ? (royalty * 100).toFixed(1) : null, 'Financial');

  if (scoring?.ode?.ode_mid !== null && scoring?.ode?.ode_mid !== undefined) {
    push('QA-FDD-ODE', 'Estimated owner income (ODE)', Math.round(scoring.ode.ode_mid), 'Financial');
  }

  if (report?.financial_performance) {
    push('QA-FDD-PAYBACK', 'Payback period', report.executive_summary.key_metrics.payback_period_years, 'Financial');
  }

  // ── Employment ─────────────────────────────────────────────────────────────
  const employees = (fields.opening_day_employees?.value ?? fields.typical_fte_employees?.value) as number | null;
  push('QA-NEW-09', 'Expected employees at opening', employees, 'Employment');

  // ── E-2 Results ────────────────────────────────────────────────────────────
  if (scoring) {
    push('QA-FDD-COMPAT', 'E-2 compatibility', scoring.overall, 'E-2 Analysis');
    push('QA-FDD-FLAGS',  'Flag count',         scoring.flag_count, 'E-2 Analysis');
    const criticalFlags = scoring.flags?.filter((f: { severity: string }) => f.severity === 'critical').map((f: { key: string }) => f.key).join(',');
    push('QA-FDD-CRITICAL-FLAGS', 'Critical flags', criticalFlags, 'E-2 Analysis');
  }
  if (report) {
    push('QA-FDD-NONMARGINALITY', 'Non-marginality verdict', report.financial_performance.non_marginality_verdict, 'E-2 Analysis');
    push('QA-FDD-RECOMMENDATION', 'Investment recommendation', report.executive_summary.recommendation, 'E-2 Analysis');
    push('QA-FDD-VERDICT',        'One-line verdict',         report.executive_summary.one_line_verdict, 'E-2 Analysis');
  }

  // ── Territory ──────────────────────────────────────────────────────────────
  if (territory) {
    push('QA-FDD-TERRITORY-RATING', 'Territory rating', territory.overall_rating, 'Territory');
    push('QA-FDD-TERRITORY-SCORE',  'Territory score',  territory.overall_score,  'Territory');
    push('QA-FDD-LABOR-SCORE', 'Labor market score', territory.labor_market_score?.score, 'Territory');
    push('QA-FDD-TERRITORY-MHI', 'Median household income', territory.census?.median_household_income, 'Territory');
    push('QA-FDD-POP-65PLUS', '65+ population', territory.census?.population_65_plus, 'Territory');
    if (territory.target_market?.annual_addressable_revenue !== null) {
      push('QA-FDD-TERRITORY-TAM', 'Addressable market (annual)', territory.target_market?.annual_addressable_revenue, 'Territory');
    }
  }

  return out;
}

export function buildFddWritebackPreview(updates: FddAnswerUpdate[]): WritebackPreview {
  const groupMap = new Map<string, Array<{ key: string; label: string; value: string }>>();

  for (const { key, label, value, group } of updates) {
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push({ key, label, value });
  }

  return {
    total_written: updates.length,
    groups: [...groupMap.entries()].map(([label, items]) => ({ label, items })),
  };
}

// ============================================================================
// Upsert derived answer keys into the application's answers table
// ============================================================================

export async function writeFddAnswerKeys(
  service: ReturnType<typeof createServiceClient>,
  applicationId: string,
  updates: FddAnswerUpdate[]
): Promise<void> {
  await Promise.all(
    updates.map(({ key, value }) =>
      service
        .from('answers')
        .upsert(
          {
            application_id: applicationId,
            question_key: key,
            answer_value: value,
            source: 'fdd_intelligence',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'application_id,question_key,family_member_id' }
        )
        .then(({ error }) => {
          if (error) console.warn(`FDD answer upsert failed for ${key}:`, error.message);
        })
    )
  );
}
