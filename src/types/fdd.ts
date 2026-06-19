// ============================================================================
// FDD Intelligence — Type Definitions
// ============================================================================

export type FddTransactionType = 'new_unit' | 'resale' | 'multi_unit_development';
export type FddExtractionStatus = 'pending' | 'extracting' | 'extracted' | 'failed';
export type FddFieldConfidence = 'high' | 'medium' | 'low' | 'not_disclosed';
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
  final_report: FddFinalReport | null;

  // Summary flags
  fdd_stale: boolean | null;
  fdd_age_months: number | null;
  state_registration_status: FddRegistrationStatus | null;
  flag_count: number;
  overall_compatibility: FddCompatibility | null;
}

// ============================================================================
// Extracted fields — one sub-object per FDD Item
// ============================================================================

export interface FddFieldMeta {
  value: string | number | boolean | string[] | null;
  _page: number | null;
  _quote: string | null;
  _conf: FddFieldConfidence;
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
  timing_assessment: Record<string, unknown>;
  ode_assessment: Record<string, unknown>;
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

export interface FddFinalReport {
  executive_summary: string;
  key_strengths: string[];
  key_concerns: string[];
  financial_picture: string;
  market_verdict: string;
  recommended_next_steps: string[];
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
