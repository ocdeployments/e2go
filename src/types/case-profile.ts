export type Archetype = 'buyer' | 'builder' | 'career_switcher' | 'investor';

export interface CaseProfile {
  userId: string;
  quizSessionId: string | null;
  applicationId: string | null;
  archetype: Archetype;
  eligibilityScore: number;
  franchiseTrigger: boolean;
  franchiseMatchScore: number;
  investmentRange: string;
  industryInterest: string;
  netWorthRange: string;
  priorBusiness: string;
  timelineGoal: string;
  quizOutcome: string;
  quizScore: number;
  hardStops: string[];
  createdAt: string;
}
