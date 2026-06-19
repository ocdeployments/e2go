export type Archetype = 'buyer' | 'builder' | 'career_switcher' | 'investor';

export type DataState = 'quiz_only' | 'case_file' | 'documents' | 'full';

export interface CaseProfile {
  // Identity
  userId: string;
  quizSessionId: string | null;
  applicationId: string | null;

  // Classification
  archetype: Archetype;
  eligibilityScore: number;

  // Franchise
  franchiseTrigger: boolean;
  franchiseMatchScore: number;

  // Post-quiz profile answers
  investmentRange: string;
  industryInterest: string;
  netWorthRange: string;
  priorBusiness: string;
  timelineGoal: string;

  // Quiz outcome
  quizOutcome: string;
  quizScore: number;
  hardStops: string[];

  // Dimension scores — 0-100 each, from gap analysis engine
  // 0 when data is not yet available (quiz_only state)
  sourceOfFundsScore: number;
  managementRoleScore: number;
  businessPlanScore: number;

  // Completeness and data provenance
  completenessScore: number;  // 0-100 — how much of the profile is filled in
  dataState: DataState;       // drives UI locking and confidence tier labels
  simulatorReadiness: boolean; // true when at least one simulator session is complete

  createdAt: string;
}
