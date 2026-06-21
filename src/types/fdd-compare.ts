// Shared types for the FDD comparison feature — used by both the API route
// and the client page. Keeping them here prevents client pages from importing
// server-only API route modules.

export interface ComparisonColumn {
  id: string;
  franchise_name: string;
  compatibility: string | null;

  // Investment
  investment_min: number | null;
  investment_max: number | null;
  franchise_fee: number | null;
  royalty_pct: number | null;
  marketing_pct: number | null;

  // Financial performance
  item19_auv: number | null;
  item19_median: number | null;
  ode_low: number | null;
  ode_mid: number | null;
  ode_high: number | null;
  payback_years: number | null;

  // E-2 scoring
  e2_score: string | null;
  flag_count: number;
  critical_flags: string[];
  fdd_age_months: number | null;

  // Territory
  territory_score: number | null;
  territory_rating: string | null;
  labor_score: number | null;
  competitors_nearby: number | null;

  // Profile match
  profile_overall: string | null;
  capital_adequacy: string | null;
  e2_substantiality: string | null;

  // System health
  total_units: number | null;
  units_opened_last_year: number | null;
  units_closed_last_year: number | null;
  franchisee_survival_rate: number | null;
}

export interface CompareResponse {
  columns: ComparisonColumn[];
  best: Partial<Record<keyof ComparisonColumn, string>>;
}
