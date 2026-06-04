export type ScoreLevel =
  'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';

export type KBValidationLevel =
  'CONFIRMED' | 'OPTIMISTIC' |
  'CONSERVATIVE' | 'INSUFFICIENT_DATA';

export interface DenialRisk {
  code: string; // D-01 through D-15
  level: 'CLEAR' | 'WATCH' | 'FLAG' | 'CRITICAL';
  reason: string;
  follow_up_triggered?: string;
}

export interface KBFlag {
  dimension: string;
  calculated_score: ScoreLevel;
  kb_score: KBValidationLevel;
  reason: string;
  follow_up_triggered?: string;
  kb_reference: string;
}

export interface FramingDecision {
  area: string;
  approach: string;
  legal_basis?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MarginalityScore {
  income_score: ScoreLevel;
  contribution_score: ScoreLevel;
  combined_score: ScoreLevel;
  job_creation_score: ScoreLevel;
  economic_activity_score: ScoreLevel;
}

export interface ExecutiveRoleScore {
  title_score: ScoreLevel;
  authority_score: ScoreLevel;
  combined_score: ScoreLevel;
  flags: string[];
}

export interface CaseBrief {
  application_id: string;
  generated_at: string;

  // Core scores
  substantiality_score: ScoreLevel;
  fund_source_score: ScoreLevel;
  experience_score: ScoreLevel;
  marginality: MarginalityScore;
  intent_score: ScoreLevel;
  executive_role: ExecutiveRoleScore;
  ownership_control_score: ScoreLevel;

  // Denial risks
  denial_risks: DenialRisk[];
  critical_risks: DenialRisk[];
  watch_risks: DenialRisk[];

  // KB validation
  kb_validation: {
    complete: boolean;
    consulate_profile_used: string;
    business_type_profile_used: string;
    kb_flags: KBFlag[];
    dimensions_confirmed: string[];
    dimensions_flagged: string[];
  };

  // Framing decisions
  framing_decisions: FramingDecision[];

  // Follow-up questions needed
  follow_up_required: boolean;
  follow_up_questions: string[];

  // Overall readiness
  overall_score: number; // 0-100
  generation_ready: boolean;
  blocking_issues: string[];
}
