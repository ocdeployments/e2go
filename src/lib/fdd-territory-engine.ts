// ============================================================================
// FDD Intelligence — Territory Market Analysis Engine (FDD-3)
// ============================================================================
// Data sources:
//   - Census ACS 5-year (population, income, households, employment)
//   - Google Places API (competitive landscape) — optional, degrades gracefully
// Scoring: category-specific weights per docs/FDD_INTELLIGENCE_PLAN.md

import Anthropic from '@anthropic-ai/sdk';
import type { FddExtractedFields } from '@/types/fdd';

const anthropic = new Anthropic();

// ============================================================================
// Types
// ============================================================================

export type TerritoryRating = 'STRONG' | 'VIABLE' | 'MARGINAL' | 'WEAK';

export interface CensusData {
  total_population: number | null;
  median_household_income: number | null;
  total_households: number | null;
  median_age: number | null;
  labor_force: number | null;
  employment_rate: number | null; // 0–1
  owner_occupied_pct: number | null; // relevant for home services
}

export interface CompetitorData {
  nearby_count: number | null; // competitors within radius
  radius_miles: number;
  source: 'google_places' | 'unavailable';
}

export interface CategoryWeights {
  population: number;
  income: number;
  competition: number;
}

export interface DimensionScore {
  score: number; // 0–100
  rating: TerritoryRating;
  note: string;
  data_available: boolean;
}

export interface TerritoryAnalysis {
  target_zip: string;
  target_state: string;
  franchise_category: string;
  radius_miles: number;

  census: CensusData;
  competitors: CompetitorData;

  population_score: DimensionScore;
  income_score: DimensionScore;
  competition_score: DimensionScore;

  overall_score: number; // 0–100, weighted composite
  overall_rating: TerritoryRating;
  data_completeness: 'full' | 'partial' | 'minimal';

  narrative: {
    MARKET_OVERVIEW: string;
    ECONOMIC_STRENGTH: string;
    COMPETITIVE_LANDSCAPE: string;
    VERDICT: string;
  };
}

// ============================================================================
// Category classification
// ============================================================================

const CATEGORY_PATTERNS: Record<string, string[]> = {
  qsr:               ['food', 'restaurant', 'pizza', 'sandwich', 'burger', 'coffee', 'bakery', 'ice cream', 'juice', 'smoothie', 'chicken', 'sub', 'wing'],
  home_services:     ['cleaning', 'restoration', 'painting', 'landscaping', 'plumbing', 'hvac', 'pest', 'maid', 'lawn', 'handyman', 'window', 'flooring', 'roofing', 'remodel'],
  senior_care:       ['senior', 'elderly', 'home care', 'assisted', 'dementia', 'memory care', 'companion', 'caregiver'],
  health_fitness:    ['gym', 'fitness', 'yoga', 'pilates', 'physical therapy', 'chiropractic', 'wellness', 'weight loss', 'spa', 'massage'],
  child_education:   ['tutoring', 'child', 'kids', 'stem', 'coding', 'learning', 'daycare', 'enrichment', 'music'],
  automotive:        ['auto', 'car', 'oil change', 'tire', 'transmission', 'collision', 'vehicle'],
  retail:            ['retail', 'store', 'shop', 'boutique', 'clothing', 'gifts', 'pet supply'],
  professional:      ['staffing', 'recruiting', 'accounting', 'tax', 'legal', 'marketing', 'consulting', 'technology', 'printing'],
};

const WEIGHTS_BY_CATEGORY: Record<string, CategoryWeights> = {
  qsr:            { population: 0.50, income: 0.20, competition: 0.30 },
  home_services:  { population: 0.30, income: 0.50, competition: 0.20 },
  senior_care:    { population: 0.25, income: 0.45, competition: 0.30 },
  health_fitness: { population: 0.35, income: 0.35, competition: 0.30 },
  child_education:{ population: 0.35, income: 0.40, competition: 0.25 },
  automotive:     { population: 0.40, income: 0.30, competition: 0.30 },
  retail:         { population: 0.40, income: 0.30, competition: 0.30 },
  professional:   { population: 0.20, income: 0.55, competition: 0.25 },
};

const DEFAULT_WEIGHTS: CategoryWeights = { population: 0.40, income: 0.35, competition: 0.25 };

// Radius by category type: home services use larger radius (drive-time model)
const RADIUS_BY_CATEGORY: Record<string, number> = {
  home_services: 15,
  senior_care:   15,
  automotive:    10,
  qsr:           3,
  default:       5,
};

export function classifyCategory(fields: FddExtractedFields): string {
  const name = ((fields.franchisor_legal_name?.value as string) ?? '').toLowerCase();
  const concept = ((fields.investor_role?.value as string) ?? '').toLowerCase();
  const text = `${name} ${concept}`;

  for (const [cat, keywords] of Object.entries(CATEGORY_PATTERNS)) {
    if (keywords.some(k => text.includes(k))) return cat;
  }
  return 'default';
}

// ============================================================================
// Census ACS 5-year API
// ============================================================================

const CENSUS_BASE = 'https://api.census.gov/data/2022/acs/acs5';
const CENSUS_VARS = [
  'B01003_001E', // total population
  'B19013_001E', // median household income
  'B11001_001E', // total households
  'B01002_001E', // median age
  'B23025_002E', // civilian labor force
  'B23025_004E', // employed civilians
  'B25003_001E', // total housing units (for owner-occupied pct proxy)
  'B25003_002E', // owner-occupied units
].join(',');

const STATE_FIPS: Record<string, string> = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',FL:'12',GA:'13',
  HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',
  MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',
  NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',SC:'45',
  SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56',
  DC:'11',
};

async function fetchCensusData(zip: string, state: string): Promise<CensusData> {
  const stateFips = STATE_FIPS[state.toUpperCase()] ?? '06';

  const url = `${CENSUS_BASE}?get=${CENSUS_VARS}&for=zip%20code%20tabulation%20area:${zip}&in=state:${stateFips}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'e2go-app/1.0 (franchise territory analysis; contact@e2go.app)' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`Census ACS API returned ${res.status} for ZIP ${zip}`);
      return emptyCensus();
    }

    const raw = await res.json() as (string | null)[][];
    if (!raw || raw.length < 2) return emptyCensus();

    const headers = raw[0] as string[];
    const values = raw[1] as (string | null)[];

    function get(varName: string): number | null {
      const idx = headers.indexOf(varName);
      if (idx < 0) return null;
      const v = values[idx];
      if (v === null || v === '-666666666' || v === '-999999999') return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    }

    const laborForce = get('B23025_002E');
    const employed = get('B23025_004E');
    const totalHousing = get('B25003_001E');
    const ownerOccupied = get('B25003_002E');

    return {
      total_population: get('B01003_001E'),
      median_household_income: get('B19013_001E'),
      total_households: get('B11001_001E'),
      median_age: get('B01002_001E'),
      labor_force: laborForce,
      employment_rate: laborForce && employed ? employed / laborForce : null,
      owner_occupied_pct: totalHousing && ownerOccupied ? ownerOccupied / totalHousing : null,
    };
  } catch (err) {
    console.warn('Census API error:', err);
    return emptyCensus();
  }
}

function emptyCensus(): CensusData {
  return {
    total_population: null,
    median_household_income: null,
    total_households: null,
    median_age: null,
    labor_force: null,
    employment_rate: null,
    owner_occupied_pct: null,
  };
}

// ============================================================================
// Google Places competitive scan
// ============================================================================

async function fetchCompetitors(
  zip: string,
  category: string,
  radiusMiles: number,
  franchiseName: string
): Promise<CompetitorData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable' };
  }

  // Map category to Places type
  const typeMap: Record<string, string> = {
    qsr: 'restaurant',
    home_services: 'home_goods_store',
    senior_care: 'health',
    health_fitness: 'gym',
    child_education: 'school',
    automotive: 'car_repair',
    retail: 'store',
  };
  const placeType = typeMap[category] ?? 'establishment';
  const radiusMeters = Math.round(radiusMiles * 1609.34);

  // First geocode the ZIP to lat/lng
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}&key=${apiKey}`;
    const geoRes = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8_000) });
    const geoJson = await geoRes.json() as { results: Array<{ geometry: { location: { lat: number; lng: number } } }> };

    if (!geoJson.results?.[0]) return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable' };

    const { lat, lng } = geoJson.results[0].geometry.location;

    // Nearby search with keyword for the franchise brand
    const keyword = encodeURIComponent(franchiseName.split(' ').slice(0, 2).join(' '));
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&keyword=${keyword}&key=${apiKey}`;
    const nearbyRes = await fetch(nearbyUrl, { signal: AbortSignal.timeout(8_000) });
    const nearbyJson = await nearbyRes.json() as { results: unknown[] };

    return {
      nearby_count: nearbyJson.results?.length ?? 0,
      radius_miles: radiusMiles,
      source: 'google_places',
    };
  } catch (err) {
    console.warn('Google Places error:', err);
    return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable' };
  }
}

// ============================================================================
// Dimension scoring
// ============================================================================

function scorePopulation(
  census: CensusData,
  category: string
): DimensionScore {
  // QSR, retail: raw population density matters most
  // Home services, senior care: household count + demographics
  // Child education: age profile of households

  let score: number | null = null;
  let note = '';

  if (category === 'home_services' || category === 'senior_care') {
    const hh = census.total_households;
    const incomeOk = census.median_household_income !== null && census.median_household_income > 55_000;
    if (hh !== null) {
      score = hh >= 30_000 ? 85 : hh >= 15_000 ? 65 : hh >= 7_000 ? 45 : 25;
      if (!incomeOk) score = Math.round(score * 0.85);
      note = `${hh.toLocaleString()} households in ZCTA${incomeOk ? '' : ' — income below optimal for this service type'}`;
    }
    if (category === 'senior_care' && census.median_age !== null) {
      const ageFactor = census.median_age >= 42 ? 1.1 : census.median_age >= 38 ? 1.0 : 0.85;
      if (score !== null) score = Math.min(100, Math.round(score * ageFactor));
      note += `. Median age ${census.median_age}`;
    }
  } else {
    // QSR, retail, fitness, etc. — population volume
    const pop = census.total_population;
    if (pop !== null) {
      score = pop >= 50_000 ? 90 : pop >= 25_000 ? 75 : pop >= 12_000 ? 55 : pop >= 5_000 ? 35 : 20;
      note = `${pop.toLocaleString()} residents in ZIP code area`;
    }
  }

  if (score === null) {
    return { score: 50, rating: 'VIABLE', note: 'Population data unavailable — Census ZCTA not matched', data_available: false };
  }

  return { score, rating: rateScore(score), note, data_available: true };
}

function scoreIncome(census: CensusData, category: string): DimensionScore {
  const income = census.median_household_income;
  const empRate = census.employment_rate;

  if (income === null) {
    return { score: 50, rating: 'VIABLE', note: 'Income data unavailable', data_available: false };
  }

  let score: number;
  let note: string;

  // Different income requirements by category
  if (category === 'qsr') {
    // QSR thrives across income ranges; too-high income can be negative (fewer QSR visits)
    score = income >= 100_000 ? 60 : income >= 70_000 ? 80 : income >= 50_000 ? 75 : income >= 35_000 ? 70 : 55;
    note = `Median household income $${income.toLocaleString()}`;
  } else if (category === 'home_services' || category === 'senior_care') {
    // Home services and senior care need higher disposable income
    score = income >= 90_000 ? 90 : income >= 70_000 ? 80 : income >= 55_000 ? 65 : income >= 40_000 ? 45 : 30;
    note = `Median household income $${income.toLocaleString()} — ${income >= 70_000 ? 'strong spending capacity' : income >= 55_000 ? 'moderate spending capacity' : 'below optimal for discretionary home services'}`;
  } else if (category === 'health_fitness' || category === 'child_education') {
    score = income >= 80_000 ? 85 : income >= 60_000 ? 70 : income >= 45_000 ? 55 : 35;
    note = `Median household income $${income.toLocaleString()}`;
  } else {
    score = income >= 75_000 ? 82 : income >= 55_000 ? 70 : income >= 40_000 ? 55 : 40;
    note = `Median household income $${income.toLocaleString()}`;
  }

  if (empRate !== null) {
    if (empRate < 0.88) { score = Math.round(score * 0.90); note += `. Employment rate ${(empRate * 100).toFixed(1)}% (below average)`; }
    else if (empRate > 0.95) { score = Math.min(100, Math.round(score * 1.05)); note += `. Employment rate ${(empRate * 100).toFixed(1)}% (strong)`; }
    else { note += `. Employment rate ${(empRate * 100).toFixed(1)}%`; }
  }

  return { score: Math.min(100, score), rating: rateScore(score), note, data_available: true };
}

function scoreCompetition(competitors: CompetitorData, category: string): DimensionScore {
  if (competitors.source === 'unavailable' || competitors.nearby_count === null) {
    return {
      score: 50,
      rating: 'VIABLE',
      note: 'Competitive data unavailable — Google Places API key not configured. Confirm nearby competitor density directly.',
      data_available: false,
    };
  }

  const count = competitors.nearby_count;
  let score: number;
  let note: string;

  // Thresholds differ by category and radius
  if (category === 'qsr') {
    // QSR: high traffic areas tolerate more competition; but > 5 same-brand is bad
    score = count === 0 ? 85 : count <= 2 ? 75 : count <= 4 ? 60 : count <= 7 ? 45 : 30;
    note = `${count} nearby competitor${count !== 1 ? 's' : ''} within ${competitors.radius_miles} miles`;
  } else if (category === 'home_services') {
    score = count === 0 ? 90 : count <= 1 ? 80 : count <= 3 ? 65 : count <= 5 ? 50 : 35;
    note = `${count} similar operator${count !== 1 ? 's' : ''} within ${competitors.radius_miles}-mile service radius`;
  } else {
    score = count === 0 ? 85 : count <= 2 ? 75 : count <= 5 ? 60 : count <= 8 ? 45 : 30;
    note = `${count} competitor${count !== 1 ? 's' : ''} within ${competitors.radius_miles} miles`;
  }

  return { score, rating: rateScore(score), note, data_available: true };
}

function rateScore(score: number): TerritoryRating {
  if (score >= 75) return 'STRONG';
  if (score >= 55) return 'VIABLE';
  if (score >= 35) return 'MARGINAL';
  return 'WEAK';
}

// ============================================================================
// Narrative generation
// ============================================================================

async function generateTerritoryNarrative(
  analysis: Omit<TerritoryAnalysis, 'narrative'>,
  fields: FddExtractedFields
): Promise<TerritoryAnalysis['narrative']> {
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? 'This franchise';
  const auvMid = (fields.item19_median?.value as number) ?? (fields.item19_auv?.value as number) ?? null;
  const auvStr = auvMid ? `$${auvMid.toLocaleString()} median AUV` : 'AUV not disclosed';

  const prompt = `You are a senior franchise territory analyst with 20 years of franchise development experience.

Write a territory market analysis for the following franchise opportunity.
Be specific. Every sentence must reference actual data. No generic phrases. Four sections maximum 3 sentences each.

FRANCHISE: ${franchiseName}
CATEGORY: ${analysis.franchise_category}
TARGET ZIP: ${analysis.target_zip}, ${analysis.target_state}
ITEM 19: ${auvStr}

POPULATION SCORE: ${analysis.population_score.score}/100 (${analysis.population_score.rating})
Note: ${analysis.population_score.note}

ECONOMIC SCORE: ${analysis.income_score.score}/100 (${analysis.income_score.rating})
Note: ${analysis.income_score.note}

COMPETITION SCORE: ${analysis.competition_score.score}/100 (${analysis.competition_score.rating})
Note: ${analysis.competition_score.note}

OVERALL: ${analysis.overall_score}/100 — ${analysis.overall_rating}

Write exactly four sections:

MARKET_OVERVIEW: What the population and household data say about demand for this franchise type in this specific ZIP code.

ECONOMIC_STRENGTH: What the income and employment data tell us about customer spending capacity and business sustainability.

COMPETITIVE_LANDSCAPE: What the competitive density means for this franchise's positioning in this territory.

VERDICT: One direct recommendation — should this investor seriously pursue this territory, and what is the single most important thing to verify before signing a lease?

Return as JSON: {"MARKET_OVERVIEW":"...","ECONOMIC_STRENGTH":"...","COMPETITIVE_LANDSCAPE":"...","VERDICT":"..."}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as TerritoryAnalysis['narrative'];
    return { MARKET_OVERVIEW: text, ECONOMIC_STRENGTH: '', COMPETITIVE_LANDSCAPE: '', VERDICT: '' };
  } catch (err) {
    console.error('Territory narrative error:', err);
    return {
      MARKET_OVERVIEW: `Territory analysis complete for ZIP ${analysis.target_zip}.`,
      ECONOMIC_STRENGTH: analysis.income_score.note,
      COMPETITIVE_LANDSCAPE: analysis.competition_score.note,
      VERDICT: `Overall territory score: ${analysis.overall_score}/100 (${analysis.overall_rating}). Verify competitive density through direct site visits before signing.`,
    };
  }
}

// ============================================================================
// Main entry point
// ============================================================================

export async function analyseTeritory(
  zip: string,
  state: string,
  fields: FddExtractedFields
): Promise<TerritoryAnalysis> {
  const category = classifyCategory(fields);
  const weights = WEIGHTS_BY_CATEGORY[category] ?? DEFAULT_WEIGHTS;
  const radiusMiles = RADIUS_BY_CATEGORY[category] ?? RADIUS_BY_CATEGORY.default;
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? '';

  // Fetch data in parallel
  const [census, competitors] = await Promise.all([
    fetchCensusData(zip, state),
    fetchCompetitors(zip, category, radiusMiles, franchiseName),
  ]);

  // Score dimensions
  const populationScore = scorePopulation(census, category);
  const incomeScore = scoreIncome(census, category);
  const competitionScore = scoreCompetition(competitors, category);

  // Weighted composite
  const overallScore = Math.round(
    populationScore.score * weights.population +
    incomeScore.score * weights.income +
    competitionScore.score * weights.competition
  );

  const overallRating = rateScore(overallScore);

  const available = [populationScore, incomeScore, competitionScore].filter(d => d.data_available).length;
  const dataCompleteness: TerritoryAnalysis['data_completeness'] =
    available === 3 ? 'full' : available >= 1 ? 'partial' : 'minimal';

  const partial: Omit<TerritoryAnalysis, 'narrative'> = {
    target_zip: zip,
    target_state: state,
    franchise_category: category,
    radius_miles: radiusMiles,
    census,
    competitors,
    population_score: populationScore,
    income_score: incomeScore,
    competition_score: competitionScore,
    overall_score: overallScore,
    overall_rating: overallRating,
    data_completeness: dataCompleteness,
  };

  const narrative = await generateTerritoryNarrative(partial, fields);

  return { ...partial, narrative };
}
