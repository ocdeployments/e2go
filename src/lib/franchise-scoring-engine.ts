// Franchise Navigator scoring engine — pure, synchronous, no I/O
// Scores all 6 franchise categories across 5 weighted dimensions.

import {
  FRANCHISE_BRANDS,
  FRANCHISE_CATEGORIES,
  type FranchiseCategory,
  type FranchiseBrand,
} from '@/data/franchise-brands';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface FranchiseProfileAnswers {
  // Pre-filled from existing quiz/apply answers
  investmentRange?: string;     // Q0-07: "Over $150K" | "$100K–$150K" | "$75K–$100K"
  investmentAmount?: number;    // M3-F-02: actual amount deployed (overrides range if present)
  citizenship?: string;         // Q0-01: treaty country
  targetState?: string;         // from application.target_state

  // Net-new QFN- answers
  hoursPerWeek?: string;        // QFN-01
  b2bOrB2c?: string;            // QFN-02
  weekendOk?: string;           // QFN-03
  locationPreference?: string;  // QFN-04
  regulatedOk?: string;         // QFN-05
  hourlyWorkersOk?: string;     // QFN-06
  professionalBackground?: string; // QFN-07
  managementExperience?: string;   // QFN-08
  salesVsSystems?: string;         // QFN-09
  priorBusiness?: string;          // QFN-10
  multiUnit?: string;              // QFN-11
  urbanOrSuburban?: string;        // QFN-12
}

export interface CategoryScore {
  category: FranchiseCategory;
  capitalFit: number;
  visaFit: number;
  operatorFit: number;
  marketFit: number;
  renewalFit: number;
  total: number;
  topBrands: FranchiseBrand[];
}

export interface FranchiseMatchResult {
  categoryScores: CategoryScore[];
  topCategories: CategoryScore[];
  topBrands: FranchiseBrand[];
  capitalMidpoint: number;
  hoursWarning: boolean;
  readiness: 'READY_FOR_INTRO' | 'NEARLY_READY' | 'REFINE_FIRST';
  readinessReason: string;
}

// ─── Capital midpoint mapping ─────────────────────────────────────────────────

function resolveCapitalMidpoint(answers: FranchiseProfileAnswers): number {
  if (answers.investmentAmount && answers.investmentAmount > 0) {
    return answers.investmentAmount;
  }
  switch (answers.investmentRange) {
    case 'Over $150K':
    case 'Over $150,000':
      return 225000;
    case '$100K–$150K':
    case '$100,000–$150,000':
      return 125000;
    case '$75K–$100K':
    case '$75,000–$100,000':
      return 87500;
    default:
      return 125000; // neutral default
  }
}

// ─── Capital fit ──────────────────────────────────────────────────────────────

function scoreCapitalFit(capital: number, cat: FranchiseCategory): number {
  const brands = FRANCHISE_BRANDS.filter(b => b.category === cat);
  if (brands.length === 0) return 50;

  // What fraction of brands in this category is the capital sufficient for?
  const affordable = brands.filter(b => capital >= b.liquidMin);
  const ratio = affordable.length / brands.length;

  // Also check whether capital hits the "invest min" of at least one brand
  const hitsInvestMin = brands.some(b => capital >= b.investMin * 0.8);
  const hitsIdeal = brands.some(b => capital >= b.investMin && capital <= b.investMax * 1.1);

  let score = ratio * 60;
  if (hitsInvestMin) score += 20;
  if (hitsIdeal) score += 20;

  return Math.min(100, Math.round(score));
}

// ─── Operator fit ─────────────────────────────────────────────────────────────

const BACKGROUND_AFFINITY: Record<string, Partial<Record<FranchiseCategory, number>>> = {
  'Healthcare': { senior_care: 35, education: 15, fitness_wellness: 10 },
  'Finance': { business_services: 30, fitness_wellness: 5 },
  'Engineering': { home_services: 25, business_services: 15 },
  'Education': { education: 35, senior_care: 10 },
  'Sales & Marketing': { home_services: 20, business_services: 25, food_qsr: 10 },
  'Operations': { home_services: 25, food_qsr: 20, senior_care: 15 },
  'Food & Hospitality': { food_qsr: 35, fitness_wellness: 5 },
  'Real Estate': { home_services: 20, business_services: 10 },
  'Technology': { business_services: 20, home_services: 10 },
  'Other': {},
};

function scoreOperatorFit(answers: FranchiseProfileAnswers, cat: FranchiseCategory): number {
  let score = 50; // base

  // Background affinity
  const bg = answers.professionalBackground ?? '';
  const affinityBonus = BACKGROUND_AFFINITY[bg]?.[cat] ?? 0;
  score += affinityBonus;

  // Management experience
  if (answers.managementExperience === 'Yes, regularly') score += 12;
  else if (answers.managementExperience === 'Yes, occasionally') score += 6;

  // Sales vs systems
  if (answers.salesVsSystems === 'I love selling — client acquisition energises me') {
    if (cat === 'home_services' || cat === 'business_services') score += 10;
  } else if (answers.salesVsSystems === 'I love systems — I want to build great operations') {
    if (cat === 'senior_care' || cat === 'fitness_wellness') score += 10;
  }

  // B2B preference
  if (answers.b2bOrB2c === 'Businesses') {
    if (cat === 'business_services' || cat === 'home_services') score += 8;
    if (cat === 'food_qsr') score -= 8;
  } else if (answers.b2bOrB2c === 'Consumers') {
    if (cat === 'senior_care' || cat === 'education' || cat === 'fitness_wellness') score += 8;
    if (cat === 'business_services') score -= 5;
  }

  // Regulated industry comfort
  if (cat === 'senior_care' || cat === 'education') {
    if (answers.regulatedOk === 'Yes, I prefer it') score += 10;
    else if (answers.regulatedOk === "I'd rather avoid regulated industries") score -= 20;
  }

  // Hourly worker comfort
  if (cat === 'senior_care') {
    if (answers.hourlyWorkersOk === 'Very comfortable — I\'ve done this') score += 10;
    else if (answers.hourlyWorkersOk === "Prefer not to") score -= 15;
    else if (answers.hourlyWorkersOk === 'No experience') score -= 8;
  }

  // Weekend tolerance
  if (answers.weekendOk === 'Weekdays only') {
    if (cat === 'food_qsr') score -= 12;
    if (cat === 'education' || cat === 'business_services') score += 5;
  }

  // Location preference
  if (answers.locationPreference === 'Home-based / van-based') {
    // Home-based is an E-2 red flag — penalise categories that are typically office-based
    if (cat === 'senior_care' || cat === 'education' || cat === 'fitness_wellness') score -= 10;
    if (cat === 'home_services') score += 5; // field-based is fine
  }

  // Prior business
  if (answers.priorBusiness === 'No, this is my first') {
    // Steer toward high-support brands — reflected by giving higher-support categories a small bonus
    if (cat === 'senior_care' || cat === 'education') score += 5;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Market fit ───────────────────────────────────────────────────────────────

// Senior care and home services index heavily suburban; fitness and education can be urban.
// Food/QSR needs traffic — urban or suburban both work.
const CATEGORY_MARKET_PROFILE: Record<FranchiseCategory, { urban: number; suburban: number; rural: number }> = {
  senior_care:       { urban: 75, suburban: 95, rural: 60 },
  home_services:     { urban: 70, suburban: 95, rural: 70 },
  education:         { urban: 85, suburban: 90, rural: 55 },
  fitness_wellness:  { urban: 85, suburban: 85, rural: 45 },
  business_services: { urban: 90, suburban: 80, rural: 55 },
  food_qsr:          { urban: 90, suburban: 85, rural: 40 },
};

function scoreMarketFit(answers: FranchiseProfileAnswers, cat: FranchiseCategory): number {
  const profile = CATEGORY_MARKET_PROFILE[cat];
  const pref = answers.urbanOrSuburban ?? '';

  if (pref === 'Urban — city center') return profile.urban;
  if (pref === 'Suburban — residential areas') return profile.suburban;
  if (pref === 'Rural') return profile.rural;
  return Math.round((profile.urban + profile.suburban) / 2); // flexible
}

// ─── Visa fit ─────────────────────────────────────────────────────────────────

function scoreVisaFit(cat: FranchiseCategory): number {
  return FRANCHISE_CATEGORIES[cat].visaFitScore;
}

// ─── Renewal fit ──────────────────────────────────────────────────────────────

function scoreRenewalFit(cat: FranchiseCategory): number {
  return FRANCHISE_CATEGORIES[cat].renewalFitScore;
}

// ─── Composite score ─────────────────────────────────────────────────────────

function compositeScore(scores: Omit<CategoryScore, 'category' | 'total' | 'topBrands'>): number {
  return Math.round(
    scores.capitalFit * 0.25 +
    scores.visaFit    * 0.25 +
    scores.operatorFit * 0.20 +
    scores.marketFit  * 0.15 +
    scores.renewalFit * 0.15
  );
}

// ─── Brand match ─────────────────────────────────────────────────────────────

function matchBrandsForCategory(capital: number, cat: FranchiseCategory): FranchiseBrand[] {
  return FRANCHISE_BRANDS
    .filter(b => b.category === cat && capital >= b.liquidMin)
    .sort((a, b) => b.renewalStrengthScore - a.renewalStrengthScore)
    .slice(0, 3);
}

// ─── Hours warning ────────────────────────────────────────────────────────────

function detectHoursWarning(answers: FranchiseProfileAnswers): boolean {
  const val = answers.hoursPerWeek ?? '';
  return val === 'Under 20' || val === '20–30 hours';
}

// ─── Readiness assessment ─────────────────────────────────────────────────────

function assessReadiness(
  topCategories: CategoryScore[],
  capitalMidpoint: number,
  answers: FranchiseProfileAnswers
): { readiness: FranchiseMatchResult['readiness']; reason: string } {
  if (topCategories.length === 0) {
    return { readiness: 'REFINE_FIRST', reason: 'Complete the profiler to generate your match.' };
  }

  const top = topCategories[0];
  const hasCapital = capitalMidpoint > 0;
  const allDimsStrong = top.capitalFit >= 60 && top.visaFit >= 70 && top.operatorFit >= 60;
  const hasBackground = !!answers.professionalBackground;
  const hasHoursAnswer = !!answers.hoursPerWeek;

  if (!hasCapital || !hasBackground || !hasHoursAnswer) {
    return { readiness: 'REFINE_FIRST', reason: 'Finish the profiler to generate a complete match.' };
  }

  if (top.total >= 70 && allDimsStrong) {
    return { readiness: 'READY_FOR_INTRO', reason: `Your profile is a strong match for ${FRANCHISE_CATEGORIES[top.category].label}. A broker introduction will give you access to Item 19 financials and territory availability for your area.` };
  }

  if (top.total >= 55) {
    const weakness =
      top.capitalFit < 60 ? 'your confirmed capital amount' :
      top.operatorFit < 60 ? 'your operator preferences' :
      'one or more scoring dimensions';
    return { readiness: 'NEARLY_READY', reason: `Strengthen ${weakness} to reach a strong match score before requesting an introduction.` };
  }

  return { readiness: 'REFINE_FIRST', reason: 'Your current profile does not yet produce a strong match in any category. Review the scoring below and update your answers to improve your match.' };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function scoreFranchiseProfile(answers: FranchiseProfileAnswers): FranchiseMatchResult {
  const capital = resolveCapitalMidpoint(answers);

  const categories: FranchiseCategory[] = [
    'senior_care',
    'home_services',
    'education',
    'fitness_wellness',
    'business_services',
    // Food/QSR only shown when capital >= $200K
    ...(capital >= 200000 ? ['food_qsr' as FranchiseCategory] : []),
  ];

  const categoryScores: CategoryScore[] = categories.map(cat => {
    const capitalFit  = scoreCapitalFit(capital, cat);
    const visaFit     = scoreVisaFit(cat);
    const operatorFit = scoreOperatorFit(answers, cat);
    const marketFit   = scoreMarketFit(answers, cat);
    const renewalFit  = scoreRenewalFit(cat);
    const total       = compositeScore({ capitalFit, visaFit, operatorFit, marketFit, renewalFit });
    const topBrands   = matchBrandsForCategory(capital, cat);
    return { category: cat, capitalFit, visaFit, operatorFit, marketFit, renewalFit, total, topBrands };
  });

  const sorted = [...categoryScores].sort((a, b) => b.total - a.total);
  const topCategories = sorted.slice(0, 3);

  // Top brands across all categories, de-duplicated, sorted by renewal strength
  const brandsSeen = new Set<string>();
  const topBrands: FranchiseBrand[] = [];
  for (const cs of sorted) {
    for (const brand of cs.topBrands) {
      if (!brandsSeen.has(brand.slug) && topBrands.length < 8) {
        brandsSeen.add(brand.slug);
        topBrands.push(brand);
      }
    }
  }

  const { readiness, reason: readinessReason } = assessReadiness(topCategories, capital, answers);

  return {
    categoryScores: sorted,
    topCategories,
    topBrands,
    capitalMidpoint: capital,
    hoursWarning: detectHoursWarning(answers),
    readiness,
    readinessReason,
  };
}
