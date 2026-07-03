// ============================================================================
// FDD Intelligence — Type Definitions
// ============================================================================

export type FddTransactionType = 'new_unit' | 'resale' | 'multi_unit_development';
export type FddExtractionStatus = 'pending' | 'extracting' | 'extracted' | 'failed';
export type FddFieldConfidence = 'high' | 'medium' | 'low' | 'not_disclosed';
// verbatim = quoted/stated directly in the FDD; derived = calculated in code from other
// extracted fields (e.g. fdd_age_months); estimated = an LLM industry-norm estimate offered
// because the FDD didn't disclose the figure directly.
export type FddFieldProvenance = 'verbatim' | 'derived' | 'estimated';
export type FddCompatibility = 'STRONG' | 'VIABLE' | 'CAUTION' | 'INELIGIBLE';
export type FddRegistrationStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type FddStaleStatus = 'current' | 'warn' | 'fail';

// ============================================================================
// Database record
// ============================================================================

export interface FddAnalysis {
  id: string;
  application_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;

  // Intake
  transaction_type: FddTransactionType | null;
  target_city: string | null;
  target_state: string | null;
  target_zip: string | null;
  investor_liquid_capital: number | null;
  investor_net_worth: number | null;

  // File
  storage_path: string;
  original_filename: string;
  file_size_bytes: number | null;
  page_count: number | null;

  // Status
  extraction_status: FddExtractionStatus;
  extraction_error: string | null;
  extraction_progress: number;

  // Data
  extracted_fields: FddExtractedFields | null;
  e2_score: FddE2Score | null;
  territory_analysis: FddTerritoryAnalysis | null;
  profile_match: FddProfileMatch | null;
  questions: FddQuestions | null;
  final_report: FddFinalReport | FddProfessionalReport | null;

  // Summary flags
  fdd_stale: boolean | null;
  fdd_age_months: number | null;
  state_registration_status: FddRegistrationStatus | null;
  flag_count: number;
  overall_compatibility: FddCompatibility | null;

  // Access gate — set to true by Stripe webhook after fdd_intelligence payment
  report_unlocked: boolean;
}

// ============================================================================
// Extracted fields — one sub-object per FDD Item
// ============================================================================

export interface FddFieldMeta {
  value: string | number | boolean | string[] | null;
  _page: number | null;
  _quote: string | null;
  _conf: FddFieldConfidence;
  // Optional — absent on fields extracted before this was added. Treat as 'verbatim'
  // (the pre-existing default assumption) when undefined.
  _provenance?: FddFieldProvenance;
}

export interface FddExtractedFields {
  // ITEM 1
  franchisor_legal_name?: FddFieldMeta;
  parent_company?: FddFieldMeta;
  headquarters_state?: FddFieldMeta;
  year_business_began?: FddFieldMeta;
  year_franchising_began?: FddFieldMeta;
  total_franchise_units_current?: FddFieldMeta;
  fdd_effective_date?: FddFieldMeta;
  fdd_age_months?: FddFieldMeta;
  fdd_fiscal_year_covered?: FddFieldMeta;
  registered_states_list?: FddFieldMeta;
  state_addendum_present?: FddFieldMeta;
  state_addendum_key_differences?: FddFieldMeta;
  accepts_nonimmigrant_visa_holders?: FddFieldMeta;

  // ITEM 2
  executive_franchise_experience_years?: FddFieldMeta;
  executive_prior_brands?: FddFieldMeta;

  // ITEM 3
  active_litigation_count?: FddFieldMeta;
  franchisee_initiated_suits?: FddFieldMeta;
  regulatory_actions_count?: FddFieldMeta;
  litigation_pattern_summary?: FddFieldMeta;

  // ITEM 4
  franchisor_bankruptcy_history?: FddFieldMeta;
  executive_bankruptcy_history?: FddFieldMeta;
  bankruptcy_details?: FddFieldMeta;

  // ITEM 5
  initial_franchise_fee?: FddFieldMeta;
  fee_is_refundable?: FddFieldMeta;
  fee_refund_conditions?: FddFieldMeta;

  // ITEM 6
  royalty_rate_pct?: FddFieldMeta;
  royalty_basis?: FddFieldMeta;
  marketing_fund_pct?: FddFieldMeta;
  technology_fee_monthly?: FddFieldMeta;
  other_recurring_fees?: FddFieldMeta;
  fee_escalation_rights?: FddFieldMeta;

  // ITEM 7
  total_investment_min?: FddFieldMeta;
  total_investment_max?: FddFieldMeta;
  component_real_estate?: FddFieldMeta;
  component_equipment?: FddFieldMeta;
  component_initial_inventory?: FddFieldMeta;
  component_working_capital?: FddFieldMeta;
  component_franchise_fee?: FddFieldMeta;
  component_training_travel?: FddFieldMeta;
  working_capital_months_covered?: FddFieldMeta;
  estimated_cogs_pct?: FddFieldMeta;

  // ITEM 11
  initial_training_hours?: FddFieldMeta;
  ongoing_training_available?: FddFieldMeta;
  field_support_visits?: FddFieldMeta;
  training_location?: FddFieldMeta;
  typical_fte_employees?: FddFieldMeta;
  opening_day_employees?: FddFieldMeta;
  investor_role?: FddFieldMeta;
  investor_hours_per_week?: FddFieldMeta;
  typical_time_to_open_months?: FddFieldMeta;

  // ITEM 12
  territory_type?: FddFieldMeta;
  territory_definition?: FddFieldMeta;
  ecommerce_carve_out?: FddFieldMeta;
  nontraditional_location_carve_out?: FddFieldMeta;
  territory_size_households?: FddFieldMeta;
  right_of_first_refusal?: FddFieldMeta;
  franchisor_minimum_separation_miles?: FddFieldMeta;

  // ITEM 17
  initial_term_years?: FddFieldMeta;
  renewal_available?: FddFieldMeta;
  renewal_on_current_terms?: FddFieldMeta;
  termination_triggers_count?: FddFieldMeta;
  cure_period_days?: FddFieldMeta;
  transfer_fee?: FddFieldMeta;
  post_termination_noncompete_years?: FddFieldMeta;
  post_termination_noncompete_radius_miles?: FddFieldMeta;
  transfer_approval_timeline_days?: FddFieldMeta;
  right_of_first_refusal_on_sale?: FddFieldMeta;
  transfer_to_entity_allowed?: FddFieldMeta;

  // ITEM 19
  item19_present?: FddFieldMeta;
  item19_metric_type?: FddFieldMeta;
  item19_fiscal_year?: FddFieldMeta;
  item19_auv?: FddFieldMeta;
  item19_median?: FddFieldMeta;
  item19_mean?: FddFieldMeta;
  item19_high?: FddFieldMeta;
  item19_low?: FddFieldMeta;
  item19_units_included?: FddFieldMeta;
  item19_pct_system_included?: FddFieldMeta;
  item19_includes_franchisee_units?: FddFieldMeta;
  item19_footnote_exclusions?: FddFieldMeta;
  item19_cherry_pick_flag?: FddFieldMeta;

  // ITEM 20
  total_units_open_current?: FddFieldMeta;
  units_opened_yr1?: FddFieldMeta;
  units_opened_yr2?: FddFieldMeta;
  units_opened_yr3?: FddFieldMeta;
  units_closed_yr1?: FddFieldMeta;
  units_closed_yr2?: FddFieldMeta;
  units_closed_yr3?: FddFieldMeta;
  franchisee_initiated_closures_3yr?: FddFieldMeta;
  franchisor_initiated_terminations_3yr?: FddFieldMeta;
  former_franchisee_contacts_available?: FddFieldMeta;

  // ITEM 21
  audit_opinion?: FddFieldMeta;
  years_of_financials?: FddFieldMeta;
  royalty_revenue_trend?: FddFieldMeta;
  franchise_fee_revenue_trend?: FddFieldMeta;
  royalty_vs_fee_ratio?: FddFieldMeta;
  franchisor_net_income?: FddFieldMeta;
  liquidity_ratio?: FddFieldMeta;
  debt_covenant_flags?: FddFieldMeta;
}

// ============================================================================
// Scoring (FDD-2) — placeholder interfaces
// ============================================================================

export interface FddE2Score {
  overall: FddCompatibility;
  dimensions: Record<string, unknown>;
  timing_assessment: unknown;
  ode_assessment: unknown;
  narrative: Record<string, string>;
  flags: string[];
}

export interface FddTerritoryAnalysis {
  overall_score: number;
  overall_rating: 'STRONG' | 'VIABLE' | 'MARGINAL' | 'WEAK';
  customer_density_score: number;
  economic_strength_score: number;
  competitive_pressure_score: number;
  narrative: Record<string, string>;
}

export interface FddProfileMatch {
  score: number;
  dimensions: Record<string, unknown>;
  gaps: Array<{ field: string; explanation: string; action: string }>;
}

export interface FddQuestions {
  questions: FddQuestion[];
  priority_questions: FddQuestion[];
}

export interface FddQuestion {
  text: string;
  ask_of: 'franchisor_dev_rep' | 'validation_franchisee' | 'former_franchisee' | 'attorney';
  triggered_by: string;
  importance: 'critical' | 'important' | 'recommended';
  what_to_listen_for: string;
}

// Legacy V1 report (generated by old route — kept for backward compatibility)
export interface FddFinalReport {
  executive_summary: string;
  key_strengths: string[];
  key_concerns: string[];
  financial_picture: string;
  market_verdict: string;
  recommended_next_steps: string[];
}

// Professional V2 report — generated by fdd-report-engine.ts
// Mirrors FddProfessionalReport from the engine; redeclared here to avoid circular imports.
export interface FddProfessionalReport {
  report_version: '2.0';
  franchise_name: string;
  generated_at: string;
  executive_summary: {
    recommendation: 'PROCEED' | 'PROCEED_WITH_CONDITIONS' | 'DO_NOT_PROCEED';
    recommendation_rationale: string;
    strengths: Array<{ title: string; evidence: string }>;
    risks: Array<{ title: string; consequence: string }>;
    conditions: string[];
    key_metrics: {
      investment_range: string;
      item19_auv: string;
      ode_central: string;
      e2_score: string;
      system_churn: string;
      payback_period_years: string;
    };
    one_line_verdict: string;
  };
  legal_risk: {
    overall_rating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    litigation: { total_active_suits: number | null; franchisee_pattern: string; pattern_assessment: string; red_flags: string[] };
    bankruptcy: { history_present: boolean; assessment: string };
    regulatory_actions: string;
    attorney_priority_items: string[];
    analyst_commentary: string;
  };
  fee_structure: {
    gross_revenue_assumption: number | null;
    total_franchisor_take_pct: number;
    franchisee_gross_profit_pct: number;
    fee_burden_rating: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXCESSIVE';
    fee_escalation_risk: string;
    hidden_cost_warnings: string[];
    analyst_commentary: string;
    waterfall: Array<{ label: string; pct_of_gross: number; annual_on_auv: number | null; note: string }>;
    category_royalty_benchmark: string;
  };
  financial_performance: {
    item19_present: boolean;
    item19_quality_rating: 'RELIABLE' | 'ADEQUATE' | 'QUESTIONABLE' | 'ABSENT';
    item19_quality_issues: string[];
    revenue_distribution: { high: number | null; mean: number | null; median: number | null; low: number | null; units_reporting: number | null; pct_system_reporting: number | null };
    ode_scenarios: {
      conservative: { auv: number | null; ode: number | null; assumption: string };
      central: { auv: number | null; ode: number | null; assumption: string };
      optimistic: { auv: number | null; ode: number | null; assumption: string };
    };
    payback_period_years: number | null;
    break_even_monthly_revenue: number | null;
    non_marginality_verdict: 'PASSES' | 'BORDERLINE' | 'FAILS' | 'INSUFFICIENT_DATA';
    non_marginality_explanation: string;
    year_projections: {
      year1: { revenue: number | null; ode: number | null };
      year3: { revenue: number | null; ode: number | null };
      year5: { revenue: number | null; ode: number | null };
    };
    analyst_commentary: string;
  };
  system_health: {
    overall_rating: 'EXPANDING' | 'STABLE' | 'CONTRACTING' | 'DISTRESSED';
    net_unit_change_3yr: number | null;
    churn_rate_annual: number | null;
    churn_benchmark_note: string;
    openings_3yr: number | null;
    closures_3yr: number | null;
    red_flags: string[];
    validation_strategy: string;
    analyst_commentary: string;
  };
  franchisor_financial_health: {
    overall_rating: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'DISTRESSED';
    revenue_trend: string;
    royalty_vs_fee_ratio: { royalty_pct: number | null; franchise_fee_pct: number | null; interpretation: string };
    audit_opinion: string;
    insolvency_risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    support_capacity_assessment: string;
    analyst_commentary: string;
  };
  e2_compatibility: {
    overall_verdict: 'STRONG' | 'VIABLE' | 'CAUTION' | 'INELIGIBLE';
    dimensions: Record<string, {
      verdict: 'PASS' | 'WARN' | 'FAIL';
      regulatory_basis: string;
      what_officer_looks_for: string;
      documentation_required: string[];
    }>;
    consular_risk_factors: string[];
    business_plan_requirements: string[];
    attorney_review_priority_items: string[];
    timing_warning: string | null;
  };
  risk_matrix: Array<{
    category: string;
    risk: string;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    specific_consequence: string;
    mitigation: string;
    pre_signing_action_required: boolean;
    fdd_item_reference: string;
  }>;
}

// ============================================================================
// SSE events for extraction stream
// ============================================================================

export type FddSSEEvent =
  | { event: 'progress'; data: { chunk: string; pct: number } }
  | { event: 'chunk_complete'; data: { chunk: string; fields_found: number } }
  | { event: 'staleness_check'; data: { stale: boolean; age_months: number | null; status: FddStaleStatus } }
  | { event: 'registration_check'; data: { is_registration_state: boolean; status: FddRegistrationStatus } }
  | { event: 'extraction_complete'; data: { fdd_id: string; total_fields: number; low_confidence_count: number } }
  | { event: 'error'; data: { message: string } };

// ============================================================================
// UI helpers
// ============================================================================

export const FDD_ITEM_LABELS: Record<string, string> = {
  item1: 'Item 1 — The Franchisor',
  item2: 'Item 2 — Key People',
  item3: 'Item 3 — Litigation',
  item4: 'Item 4 — Bankruptcy',
  item5: 'Item 5 — Initial Franchise Fee',
  item6: 'Item 6 — Ongoing Fees',
  item7: 'Item 7 — Initial Investment',
  item11: 'Item 11 — Training & Support',
  item12: 'Item 12 — Territory',
  item17: 'Item 17 — Renewal, Termination & Transfer',
  item19: 'Item 19 — Financial Performance',
  item20: 'Item 20 — Outlets & Franchisee Data',
  item21: 'Item 21 — Audited Financials',
};

export const REGISTRATION_STATES = new Set([
  'CA', 'HI', 'IL', 'IN', 'MD', 'MI', 'MN', 'NY', 'ND', 'OR', 'RI', 'SD', 'VA', 'WA', 'WI',
]);

// ============================================================================
// API request/response shapes
// ============================================================================

export interface FddUploadIntake {
  transaction_type: FddTransactionType;
  target_city: string;
  target_state: string;
  target_zip: string;
  investor_liquid_capital?: number;
  investor_net_worth?: number;
  application_id?: string;
}

export interface FddUploadResponse {
  fdd_id: string;
  filename: string;
  storage_path: string;
}
