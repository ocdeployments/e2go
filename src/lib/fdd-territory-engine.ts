// ============================================================================
// FDD Intelligence — Territory Market Analysis Engine
// ============================================================================
// Upgraded from 3 dimensions to 5 — adds demographic fit and labor market.
// Adds target market sizing (TAM/SAM) per franchise category.
// Competition scoring now uses population-per-competitor ratio vs. benchmarks.
// Narrative uses investment-advisor voice to match fdd-report-engine.ts.
//
// Data sources:
//   Census ACS 5-year — population, income, demographics, households, employment
//   Google Places API — competitive scan (optional, degrades gracefully)

import Anthropic from '@anthropic-ai/sdk';
import type { FddExtractedFields } from '@/types/fdd';
import { computeOdeProxy, classifyOde } from '@/lib/fdd-ode-engine';

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
  employment_rate: number | null;       // 0–1
  owner_occupied_pct: number | null;   // 0–1
  population_65_plus: number | null;   // count of residents 65+
  population_under_18: number | null;  // count of residents under 18
  family_households_with_children: number | null; // married-couple HH with children <18
}

export interface CompetitorData {
  nearby_count: number | null;
  radius_miles: number;
  source: 'google_places' | 'unavailable';
  population_per_competitor: number | null; // computed ratio
}

export interface CategoryWeights {
  population: number;
  income: number;
  competition: number;
  demographic_fit: number;
  labor_market: number;
}

export interface DimensionScore {
  score: number; // 0–100
  rating: TerritoryRating;
  note: string;
  data_available: boolean;
}

export interface TargetMarketSizing {
  relevant_segment: number | null;        // e.g., 65+ count, under-18 count
  segment_label: string;                  // e.g., "residents aged 65+"
  segment_pct_of_population: number | null;
  annual_addressable_revenue: number | null; // TAM in dollars
  year1_revenue_target: number | null;    // realistic Year 1 target
  year3_revenue_target: number | null;
  nonmarginality_check: 'pass' | 'borderline' | 'fail' | 'unknown';
  sizing_note: string;
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
  demographic_fit_score: DimensionScore;
  labor_market_score: DimensionScore;

  target_market: TargetMarketSizing;

  overall_score: number; // 0–100 weighted composite across all 5 dimensions
  overall_rating: TerritoryRating;
  data_completeness: 'full' | 'partial' | 'minimal';

  narrative: {
    MARKET_OVERVIEW: string;
    ECONOMIC_STRENGTH: string;
    DEMOGRAPHIC_FIT: string;
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

// Weights across 5 dimensions — sum must equal 1.0 per category
const WEIGHTS_BY_CATEGORY: Record<string, CategoryWeights> = {
  qsr:            { population: 0.35, income: 0.20, competition: 0.25, demographic_fit: 0.10, labor_market: 0.10 },
  home_services:  { population: 0.20, income: 0.35, competition: 0.15, demographic_fit: 0.20, labor_market: 0.10 },
  senior_care:    { population: 0.15, income: 0.30, competition: 0.20, demographic_fit: 0.25, labor_market: 0.10 },
  health_fitness: { population: 0.25, income: 0.30, competition: 0.25, demographic_fit: 0.10, labor_market: 0.10 },
  child_education:{ population: 0.20, income: 0.30, competition: 0.20, demographic_fit: 0.20, labor_market: 0.10 },
  automotive:     { population: 0.30, income: 0.25, competition: 0.25, demographic_fit: 0.10, labor_market: 0.10 },
  retail:         { population: 0.30, income: 0.25, competition: 0.25, demographic_fit: 0.10, labor_market: 0.10 },
  professional:   { population: 0.15, income: 0.40, competition: 0.20, demographic_fit: 0.15, labor_market: 0.10 },
};

const DEFAULT_WEIGHTS: CategoryWeights = {
  population: 0.25, income: 0.30, competition: 0.20, demographic_fit: 0.15, labor_market: 0.10,
};

// Dimensions with data_available: false carry a neutral sentinel score (50/60)
// rather than a real measurement — folding that into the weighted average would
// silently drag or prop the overall score with a fabricated number. Exclude
// unavailable dimensions and renormalize the remaining weights to sum to 1.0.
function computeWeightedOverallScore(
  dims: { score: DimensionScore; weight: number }[]
): number {
  const available = dims.filter(d => d.score.data_available);
  if (available.length === 0) return 50;
  const weightSum = available.reduce((sum, d) => sum + d.weight, 0);
  const weighted = available.reduce((sum, d) => sum + d.score.score * d.weight, 0);
  return Math.round(weighted / weightSum);
}

const RADIUS_BY_CATEGORY: Record<string, number> = {
  home_services: 15,
  senior_care:   15,
  automotive:    10,
  qsr:           3,
  default:       5,
};

// Annual spend per relevant household by category — used for market sizing
const CATEGORY_ANNUAL_SPEND_PER_UNIT: Record<string, number> = {
  senior_care:    18_000, // per senior household using in-home care ($1,500/mo)
  child_education: 4_500, // per family using tutoring/enrichment
  home_services:   3_200, // per homeowner using cleaning/maintenance annually
  health_fitness:  1_800, // per adult member
  qsr:               800, // per resident annually (visits × avg ticket)
  automotive:      1_200, // per vehicle owner annually
  retail:          1_500, // per household
  professional:    5_000, // per business client
  default:         2_000,
};

// Category penetration rates (% of eligible units that will use this service annually)
const CATEGORY_PENETRATION_RATE: Record<string, number> = {
  senior_care:    0.22,  // 22% of 65+ HH use professional in-home care
  child_education: 0.28, // 28% of families with kids use paid tutoring
  home_services:  0.35,  // 35% of homeowners use professional services
  health_fitness:  0.18, // 18% of adults use a paid fitness facility
  qsr:            0.70,  // 70% of population visits QSR annually
  automotive:     0.55,  // 55% of vehicle owners use a professional shop
  retail:         0.30,
  professional:   0.12,
  default:        0.25,
};

// Population-per-competitor benchmarks — what ratio is "good" vs. "ok"
const POP_PER_COMPETITOR: Record<string, { good: number; ok: number }> = {
  qsr:            { good: 5_000,  ok: 3_000  },
  home_services:  { good: 20_000, ok: 10_000 },
  senior_care:    { good: 30_000, ok: 15_000 },
  health_fitness: { good: 15_000, ok: 8_000  },
  child_education:{ good: 12_000, ok: 7_000  },
  automotive:     { good: 12_000, ok: 7_000  },
  retail:         { good: 8_000,  ok: 5_000  },
  professional:   { good: 25_000, ok: 15_000 },
  default:        { good: 10_000, ok: 5_000  },
};

// Minimum household income thresholds for each category's target customer
const INCOME_THRESHOLDS: Record<string, { optimal: number; viable: number }> = {
  senior_care:    { optimal: 75_000, viable: 55_000 },
  home_services:  { optimal: 80_000, viable: 60_000 },
  health_fitness: { optimal: 65_000, viable: 50_000 },
  child_education:{ optimal: 70_000, viable: 55_000 },
  professional:   { optimal: 80_000, viable: 65_000 },
  qsr:            { optimal: 55_000, viable: 35_000 },
  automotive:     { optimal: 60_000, viable: 45_000 },
  retail:         { optimal: 65_000, viable: 45_000 },
  default:        { optimal: 65_000, viable: 45_000 },
};

// 2025 state minimum wages (approximate enacted rates)
const STATE_MIN_WAGE_2025: Record<string, number> = {
  AL:7.25, AK:11.91, AZ:14.70, AR:11.00, CA:16.50, CO:14.81,
  CT:16.35, DE:15.00, FL:13.00, GA:7.25, HI:14.00, ID:7.25,
  IL:14.00, IN:7.25, IA:7.25, KS:7.25, KY:7.25, LA:7.25,
  ME:14.65, MD:15.00, MA:15.00, MI:10.33, MN:10.85, MS:7.25,
  MO:13.75, MT:10.55, NE:13.50, NV:12.00, NH:7.25, NJ:15.49,
  NM:12.00, NY:16.50, NC:7.25, ND:7.25, OH:10.45, OK:7.25,
  OR:14.70, PA:7.25, RI:14.00, SC:7.25, SD:11.20, TN:7.25,
  TX:7.25, UT:7.25, VT:13.67, VA:12.41, WA:16.66, WV:8.75,
  WI:7.25, WY:7.25, DC:17.50,
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
  'B25003_001E', // total housing units
  'B25003_002E', // owner-occupied units
  // 65+ age cohorts (male + female)
  'B01001_020E', 'B01001_021E', 'B01001_022E', 'B01001_023E', 'B01001_024E', 'B01001_025E',
  'B01001_044E', 'B01001_045E', 'B01001_046E', 'B01001_047E', 'B01001_048E', 'B01001_049E',
  // Under 18, family households with children
  'B09001_001E', // population under 18 in households
  'B11003_003E', // married-couple family HH with own children under 18
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
      signal: AbortSignal.timeout(12_000),
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

    // Sum 65+ age cohorts (male + female)
    const male65 = ['B01001_020E','B01001_021E','B01001_022E','B01001_023E','B01001_024E','B01001_025E']
      .map(v => get(v) ?? 0).reduce((a, b) => a + b, 0);
    const female65 = ['B01001_044E','B01001_045E','B01001_046E','B01001_047E','B01001_048E','B01001_049E']
      .map(v => get(v) ?? 0).reduce((a, b) => a + b, 0);
    const pop65plus = male65 + female65;

    return {
      total_population: get('B01003_001E'),
      median_household_income: get('B19013_001E'),
      total_households: get('B11001_001E'),
      median_age: get('B01002_001E'),
      labor_force: laborForce,
      employment_rate: laborForce && employed ? employed / laborForce : null,
      owner_occupied_pct: totalHousing && ownerOccupied ? ownerOccupied / totalHousing : null,
      population_65_plus: pop65plus > 0 ? pop65plus : null,
      population_under_18: get('B09001_001E'),
      family_households_with_children: get('B11003_003E'),
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
    population_65_plus: null,
    population_under_18: null,
    family_households_with_children: null,
  };
}

// ============================================================================
// Google Places competitive scan
// ============================================================================

async function fetchCompetitors(
  zip: string,
  category: string,
  radiusMiles: number,
  franchiseName: string,
  totalPopulation: number | null
): Promise<CompetitorData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable', population_per_competitor: null };
  }

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

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}&key=${apiKey}`;
    const geoRes = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8_000) });
    const geoJson = await geoRes.json() as { results: Array<{ geometry: { location: { lat: number; lng: number } } }> };

    if (!geoJson.results?.[0]) {
      return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable', population_per_competitor: null };
    }

    const { lat, lng } = geoJson.results[0].geometry.location;
    const keyword = encodeURIComponent(franchiseName.split(' ').slice(0, 2).join(' '));
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&keyword=${keyword}&key=${apiKey}`;
    const nearbyRes = await fetch(nearbyUrl, { signal: AbortSignal.timeout(8_000) });
    const nearbyJson = await nearbyRes.json() as { results: unknown[] };

    const count = nearbyJson.results?.length ?? 0;
    const popPerCompetitor = totalPopulation && count > 0 ? Math.round(totalPopulation / count) : null;

    return {
      nearby_count: count,
      radius_miles: radiusMiles,
      source: 'google_places',
      population_per_competitor: popPerCompetitor,
    };
  } catch (err) {
    console.warn('Google Places error:', err);
    return { nearby_count: null, radius_miles: radiusMiles, source: 'unavailable', population_per_competitor: null };
  }
}

// ============================================================================
// Dimension 1 — Population & demand
// ============================================================================

function scorePopulation(census: CensusData, category: string): DimensionScore {
  let score: number | null = null;
  let note = '';

  if (category === 'home_services' || category === 'senior_care') {
    const hh = census.total_households;
    const ownPct = census.owner_occupied_pct;
    const ownerHH = (hh !== null && ownPct !== null) ? Math.round(hh * ownPct) : hh;

    if (ownerHH !== null) {
      score = ownerHH >= 25_000 ? 90 : ownerHH >= 12_000 ? 72 : ownerHH >= 6_000 ? 52 : 32;
      note = category === 'home_services'
        ? `${(ownerHH).toLocaleString()} owner-occupied households${ownPct ? ` (${(ownPct*100).toFixed(0)}% ownership rate)` : ''}`
        : `${(hh ?? 0).toLocaleString()} households — ${(ownerHH).toLocaleString()} owner-occupied`;
    }
  } else if (category === 'child_education') {
    const under18 = census.population_under_18;
    if (under18 !== null) {
      score = under18 >= 20_000 ? 90 : under18 >= 10_000 ? 72 : under18 >= 5_000 ? 52 : 30;
      note = `${under18.toLocaleString()} residents under 18 — direct addressable population for this concept`;
    } else {
      const pop = census.total_population;
      if (pop !== null) {
        const estUnder18 = Math.round(pop * 0.22);
        score = estUnder18 >= 10_000 ? 68 : estUnder18 >= 5_000 ? 50 : 30;
        note = `${pop.toLocaleString()} total population (under-18 count estimated — Census age data unavailable)`;
      }
    }
  } else {
    const pop = census.total_population;
    if (pop !== null) {
      score = pop >= 50_000 ? 90 : pop >= 25_000 ? 75 : pop >= 12_000 ? 55 : pop >= 5_000 ? 35 : 20;
      note = `${pop.toLocaleString()} residents in ZIP code area`;
    }
  }

  if (score === null) {
    return { score: 50, rating: 'VIABLE', note: 'Population data unavailable — Census ZCTA not matched', data_available: false };
  }

  return { score: Math.min(100, score), rating: rateScore(score), note, data_available: true };
}

// ============================================================================
// Dimension 2 — Income & spending power
// ============================================================================

function scoreIncome(census: CensusData, category: string): DimensionScore {
  const income = census.median_household_income;
  const empRate = census.employment_rate;
  const thresholds = INCOME_THRESHOLDS[category] ?? INCOME_THRESHOLDS.default;

  if (income === null) {
    return { score: 50, rating: 'VIABLE', note: 'Income data unavailable', data_available: false };
  }

  let score: number;
  let note: string;

  if (category === 'qsr') {
    score = income >= 100_000 ? 62 : income >= 70_000 ? 80 : income >= 50_000 ? 75 : income >= 35_000 ? 70 : 55;
    note = `Median household income $${income.toLocaleString()} — ${income > 100_000 ? 'high income area (QSR demand may be lower)' : income > 65_000 ? 'strong QSR spending capacity' : 'adequate income for value QSR'}`;
  } else {
    const gap = income - thresholds.optimal;
    if (income >= thresholds.optimal) {
      score = Math.min(100, 80 + Math.round(gap / thresholds.optimal * 15));
    } else if (income >= thresholds.viable) {
      const pct = (income - thresholds.viable) / (thresholds.optimal - thresholds.viable);
      score = Math.round(55 + pct * 25);
    } else {
      const pct = income / thresholds.viable;
      score = Math.max(20, Math.round(pct * 55));
    }
    note = `Median household income $${income.toLocaleString()} — ${
      income >= thresholds.optimal ? `strong spending capacity for this category (threshold: $${thresholds.optimal.toLocaleString()})` :
      income >= thresholds.viable ? `adequate spending capacity; below optimal $${thresholds.optimal.toLocaleString()}` :
      `below viable threshold of $${thresholds.viable.toLocaleString()} for this concept`
    }`;
  }

  if (empRate !== null) {
    if (empRate < 0.88) {
      score = Math.round(score * 0.90);
      note += `. Employment rate ${(empRate * 100).toFixed(1)}% — below average, discretionary spending may be constrained`;
    } else if (empRate > 0.95) {
      score = Math.min(100, Math.round(score * 1.05));
      note += `. Employment rate ${(empRate * 100).toFixed(1)}% — strong, supportive of sustained consumer spending`;
    } else {
      note += `. Employment ${(empRate * 100).toFixed(1)}%`;
    }
  }

  return { score: Math.min(100, score), rating: rateScore(score), note, data_available: true };
}

// ============================================================================
// Dimension 3 — Competitive landscape
// ============================================================================

function scoreCompetition(
  competitors: CompetitorData,
  census: CensusData,
  category: string
): DimensionScore {
  if (competitors.source === 'unavailable' || competitors.nearby_count === null) {
    // No fabricated score — data_available: false excludes this dimension from
    // the weighted composite (see computeWeightedOverallScore) rather than
    // silently contributing a neutral 50 to the overall territory score.
    return {
      score: 50,
      rating: 'VIABLE',
      note: 'Competition not assessed — Google Places data unavailable for this ZIP. Confirm competitor density through direct site visit and local research before relying on the overall score.',
      data_available: false,
    };
  }

  const count = competitors.nearby_count;
  const totalPop = census.total_population;
  const benchmark = POP_PER_COMPETITOR[category] ?? POP_PER_COMPETITOR.default;

  // Ratio-based scoring when population data is available
  if (totalPop !== null && count > 0) {
    const ratio = Math.round(totalPop / count);
    const popPerCompetitorStr = `${ratio.toLocaleString()} residents per operator`;

    let score: number;
    let ratioNote: string;

    if (ratio >= benchmark.good) {
      score = 88;
      ratioNote = `${popPerCompetitorStr} — well above ${benchmark.good.toLocaleString()} threshold, strong white space`;
    } else if (ratio >= benchmark.ok) {
      score = 68;
      ratioNote = `${popPerCompetitorStr} — adequate market share headroom`;
    } else {
      score = 40;
      ratioNote = `${popPerCompetitorStr} — saturated; ${benchmark.good.toLocaleString()} residents per operator is the viability threshold`;
    }

    return {
      score,
      rating: rateScore(score),
      note: `${count} competitor${count !== 1 ? 's' : ''} within ${competitors.radius_miles} miles — ${ratioNote}`,
      data_available: true,
    };
  }

  // Fallback to raw count scoring when no population data
  let score: number;
  if (category === 'qsr') {
    score = count === 0 ? 85 : count <= 2 ? 75 : count <= 4 ? 60 : count <= 7 ? 45 : 30;
  } else if (category === 'home_services' || category === 'senior_care') {
    score = count === 0 ? 90 : count <= 1 ? 80 : count <= 3 ? 65 : count <= 5 ? 50 : 35;
  } else {
    score = count === 0 ? 85 : count <= 2 ? 75 : count <= 5 ? 60 : count <= 8 ? 45 : 30;
  }

  return {
    score,
    rating: rateScore(score),
    note: `${count} competitor${count !== 1 ? 's' : ''} within ${competitors.radius_miles} miles`,
    data_available: true,
  };
}

// ============================================================================
// Dimension 4 — Demographic fit
// ============================================================================

function scoreDemographicFit(census: CensusData, category: string): DimensionScore {
  switch (category) {
    case 'senior_care': {
      const pop65 = census.population_65_plus;
      const totalPop = census.total_population;
      if (pop65 === null) {
        return { score: 50, rating: 'VIABLE', note: 'Age demographic data unavailable — verify 65+ population directly', data_available: false };
      }
      const pct = totalPop ? (pop65 / totalPop) : null;
      let score: number;
      if (pop65 >= 20_000) score = 92;
      else if (pop65 >= 10_000) score = 80;
      else if (pop65 >= 5_000) score = 62;
      else if (pop65 >= 2_500) score = 45;
      else score = 28;

      // Median age bonus — older median = more total seniors
      if (census.median_age !== null) {
        if (census.median_age >= 45) score = Math.min(100, score + 8);
        else if (census.median_age < 35) score = Math.max(0, score - 8);
      }

      const pctStr = pct ? ` (${(pct*100).toFixed(1)}% of population)` : '';
      return {
        score: Math.min(100, score),
        rating: rateScore(score),
        note: `${(pop65).toLocaleString()} residents aged 65+${pctStr}${census.median_age ? ` — median age ${census.median_age}` : ''}`,
        data_available: true,
      };
    }

    case 'child_education': {
      const under18 = census.population_under_18;
      const familyHH = census.family_households_with_children;
      const totalPop = census.total_population;
      if (under18 === null && familyHH === null) {
        return { score: 50, rating: 'VIABLE', note: 'Youth demographic data unavailable', data_available: false };
      }
      const _segment = familyHH ?? under18 ?? 0;
      const pct = (under18 !== null && totalPop) ? under18 / totalPop : null;
      const score = familyHH !== null
        ? (familyHH >= 8_000 ? 88 : familyHH >= 4_000 ? 72 : familyHH >= 2_000 ? 55 : 35)
        : (under18! >= 15_000 ? 82 : under18! >= 7_000 ? 65 : under18! >= 3_000 ? 48 : 30);
      const pctStr = pct ? ` (${(pct*100).toFixed(0)}% of population)` : '';
      return {
        score: Math.min(100, score),
        rating: rateScore(score),
        note: familyHH !== null
          ? `${familyHH.toLocaleString()} married-couple family HH with children under 18 — primary client base`
          : `${under18!.toLocaleString()} residents under 18${pctStr}`,
        data_available: true,
      };
    }

    case 'home_services': {
      const ownPct = census.owner_occupied_pct;
      const totalHH = census.total_households;
      if (ownPct === null) {
        return { score: 50, rating: 'VIABLE', note: 'Homeownership data unavailable — key factor for home services demand', data_available: false };
      }
      const ownerHH = (totalHH !== null) ? Math.round(totalHH * ownPct) : null;
      const score = ownPct >= 0.70 ? 90 : ownPct >= 0.60 ? 80 : ownPct >= 0.50 ? 65 : ownPct >= 0.40 ? 50 : 35;
      return {
        score: Math.min(100, score),
        rating: rateScore(score),
        note: `${(ownPct*100).toFixed(0)}% homeownership rate${ownerHH ? ` — ${ownerHH.toLocaleString()} owner-occupied households` : ''} — renters are not customers for this category`,
        data_available: true,
      };
    }

    case 'health_fitness': {
      // Prime fitness demographic: adults 25–54. Use median age as a proxy.
      const medAge = census.median_age;
      const totalPop = census.total_population;
      if (medAge === null) {
        return { score: 50, rating: 'VIABLE', note: 'Age data unavailable', data_available: false };
      }
      const score = medAge >= 30 && medAge <= 45 ? 85
        : medAge >= 25 && medAge < 30 ? 72
        : medAge > 45 && medAge <= 55 ? 70
        : medAge > 55 ? 55
        : 45;
      return {
        score: Math.min(100, score),
        rating: rateScore(score),
        note: `Median age ${medAge}${totalPop ? ` — ${totalPop.toLocaleString()} total residents` : ''} — prime fitness demographic is 28–50`,
        data_available: true,
      };
    }

    case 'qsr': {
      // QSR: skews toward working-age adults, young families
      const medAge = census.median_age;
      if (medAge === null) {
        return { score: 60, rating: 'VIABLE', note: 'Age data unavailable — QSR demand is broad across demographics', data_available: false };
      }
      const score = medAge >= 28 && medAge <= 40 ? 88
        : medAge > 40 && medAge <= 50 ? 78
        : medAge < 28 ? 72
        : 60;
      return {
        score: Math.min(100, score),
        rating: rateScore(score),
        note: `Median age ${medAge} — ${medAge < 40 ? 'younger-skewing demographics favour QSR visit frequency' : 'older demographics may moderate QSR traffic'}`,
        data_available: true,
      };
    }

    default: {
      const income = census.median_household_income;
      if (income === null) {
        return { score: 50, rating: 'VIABLE', note: 'Insufficient data for demographic fit scoring', data_available: false };
      }
      const score = income >= 80_000 ? 80 : income >= 60_000 ? 70 : income >= 45_000 ? 55 : 40;
      return {
        score,
        rating: rateScore(score),
        note: `Income-qualified household profile — $${income.toLocaleString()} median income`,
        data_available: true,
      };
    }
  }
}

// ============================================================================
// Dimension 5 — Labor market risk
// ============================================================================

function scoreLaborMarket(census: CensusData, category: string, state: string): DimensionScore {
  const empRate = census.employment_rate;
  const _laborForce = census.labor_force;
  const minWage = STATE_MIN_WAGE_2025[state.toUpperCase()] ?? 7.25;

  // High minimum wages hurt service franchises with large labor components
  const laborIntensiveCategories = ['senior_care', 'home_services', 'qsr', 'health_fitness'];
  const isLaborIntensive = laborIntensiveCategories.includes(category);

  let wageScore: number;
  let wageNote: string;
  if (isLaborIntensive) {
    wageScore = minWage >= 16.00 ? 40 : minWage >= 14.00 ? 58 : minWage >= 12.00 ? 72 : 88;
    wageNote = `State minimum wage $${minWage.toFixed(2)}/hr — ${
      minWage >= 16 ? 'HIGH WAGE PRESSURE: labor costs may significantly exceed FDD Item 7 projections' :
      minWage >= 14 ? 'elevated wage environment; verify Item 7 labor cost assumptions reflect current rates' :
      minWage >= 12 ? 'moderate wages; FDD labor cost projections likely adequate' :
      'favorable wage environment — labor cost headroom relative to FDD assumptions'
    }`;
  } else {
    wageScore = minWage >= 16.00 ? 62 : minWage >= 14.00 ? 72 : 85;
    wageNote = `State minimum wage $${minWage.toFixed(2)}/hr — limited labor impact for this business type`;
  }

  // Employment rate modifier — low unemployment = tight labor market = harder/more expensive to hire
  let empAdjustment = 0;
  let empNote = '';
  if (empRate !== null) {
    if (empRate > 0.95) {
      empAdjustment = -8;
      empNote = ` Employment rate ${(empRate*100).toFixed(1)}% — very tight labor market, competition for workers is intense`;
    } else if (empRate > 0.92) {
      empAdjustment = -3;
      empNote = ` Employment ${(empRate*100).toFixed(1)}% — adequate labor availability`;
    } else if (empRate < 0.85) {
      empAdjustment = +8;
      empNote = ` Employment ${(empRate*100).toFixed(1)}% — larger available labor pool may ease recruitment`;
    } else {
      empNote = ` Employment ${(empRate*100).toFixed(1)}%`;
    }
  }

  const finalScore = Math.min(100, Math.max(0, wageScore + empAdjustment));

  return {
    score: finalScore,
    rating: rateScore(finalScore),
    note: wageNote + empNote,
    data_available: true,
  };
}

// ============================================================================
// Target market sizing
// ============================================================================

function computeTargetMarketSizing(
  census: CensusData,
  category: string,
  auv: number | null
): TargetMarketSizing {
  const spendPerUnit = CATEGORY_ANNUAL_SPEND_PER_UNIT[category] ?? CATEGORY_ANNUAL_SPEND_PER_UNIT.default;
  const penetration = CATEGORY_PENETRATION_RATE[category] ?? CATEGORY_PENETRATION_RATE.default;

  let relevantSegment: number | null = null;
  let segmentLabel: string;

  switch (category) {
    case 'senior_care':
      relevantSegment = census.population_65_plus;
      segmentLabel = 'residents aged 65+';
      break;
    case 'child_education':
      relevantSegment = census.population_under_18 ?? census.family_households_with_children;
      segmentLabel = census.population_under_18 ? 'residents under 18' : 'family households with children';
      break;
    case 'home_services': {
      const ownPct = census.owner_occupied_pct ?? 0.55;
      relevantSegment = census.total_households ? Math.round(census.total_households * ownPct) : null;
      segmentLabel = 'owner-occupied households';
      break;
    }
    default:
      relevantSegment = category === 'qsr' ? census.total_population : census.total_households;
      segmentLabel = category === 'qsr' ? 'total population' : 'total households';
  }

  if (relevantSegment === null) {
    return {
      relevant_segment: null,
      segment_label: segmentLabel ?? 'relevant population',
      segment_pct_of_population: null,
      annual_addressable_revenue: null,
      year1_revenue_target: null,
      year3_revenue_target: null,
      nonmarginality_check: 'unknown',
      sizing_note: 'Market sizing unavailable — Census data not retrieved for this territory.',
    };
  }

  const tam = Math.round(relevantSegment * spendPerUnit * penetration);
  // Realistic single-unit Year 1: 3–5% of TAM
  const year1 = Math.round(tam * 0.04);
  // Year 3: 8–12% of TAM
  const year3 = Math.round(tam * 0.10);

  // Non-marginality check: E-2 requires the business generates more than the
  // investor's livelihood. This territory sizer doesn't have fee/rent/labor
  // field data, so it approximates ODE off AUV using the same proxy margin
  // and pass/warn/fail thresholds as the full waterfall in
  // fdd-scoring-engine.ts (via shared fdd-ode-engine.ts) — kept in sync so
  // the two engines can't silently diverge.
  let nonmarginality: TargetMarketSizing['nonmarginality_check'] = 'unknown';
  const referenceAuv = auv ?? year3;
  if (referenceAuv > 0) {
    const proxyOde = computeOdeProxy(referenceAuv);
    const classification = classifyOde(proxyOde);
    nonmarginality = classification === 'pass' ? 'pass' : classification === 'warn' ? 'borderline' : 'fail';
  }

  const segmentPct = census.total_population ? relevantSegment / census.total_population : null;

  return {
    relevant_segment: relevantSegment,
    segment_label: segmentLabel ?? 'relevant population',
    segment_pct_of_population: segmentPct,
    annual_addressable_revenue: tam,
    year1_revenue_target: year1,
    year3_revenue_target: year3,
    nonmarginality_check: nonmarginality,
    sizing_note: `TAM of $${(tam/1000).toFixed(0)}K based on ${relevantSegment.toLocaleString()} ${segmentLabel} × $${spendPerUnit.toLocaleString()} avg annual spend × ${(penetration*100).toFixed(0)}% category penetration rate.${
      auv ? ` Item 19 AUV of $${auv.toLocaleString()} implies a Year 3 market share of ${((auv/tam)*100).toFixed(1)}% — ${auv/tam > 0.20 ? 'territory may be small relative to concept AUV' : 'realistic given category penetration benchmarks'}.` : ''
    }`,
  };
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

const TERRITORY_ANALYST_SYSTEM = `You are a senior franchise territory analyst with 20 years of experience
advising high-net-worth investors on franchise territory selection. Your assessments are the basis
for $200K–$800K investment decisions. You write with the authority of someone who has reviewed
thousands of territories and knows exactly what makes or breaks a franchise unit at this location.

Voice: Direct, specific, benchmark-driven. Every claim references actual data. No generic phrases.
Return ONLY valid JSON matching the specified schema.`;

async function generateTerritoryNarrative(
  analysis: Omit<TerritoryAnalysis, 'narrative'>,
  fields: FddExtractedFields
): Promise<TerritoryAnalysis['narrative']> {
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? 'This franchise';
  const auvMid = (fields.item19_median?.value as number) ?? (fields.item19_auv?.value as number) ?? null;
  const tm = analysis.target_market;

  const prompt = `Write a professional franchise territory market analysis for this opportunity.

FRANCHISE: ${franchiseName}
CATEGORY: ${analysis.franchise_category}
TARGET ZIP: ${analysis.target_zip}, ${analysis.target_state}
ITEM 19 AUV: ${auvMid ? `$${auvMid.toLocaleString()}` : 'Not disclosed'}

DIMENSION SCORES (out of 100):
- Population & Demand: ${analysis.population_score.score} (${analysis.population_score.rating}) — ${analysis.population_score.note}
- Income & Spending Power: ${analysis.income_score.score} (${analysis.income_score.rating}) — ${analysis.income_score.note}
- Competition: ${analysis.competition_score.score} (${analysis.competition_score.rating}) — ${analysis.competition_score.note}
- Demographic Fit: ${analysis.demographic_fit_score.score} (${analysis.demographic_fit_score.rating}) — ${analysis.demographic_fit_score.note}
- Labor Market: ${analysis.labor_market_score.score} (${analysis.labor_market_score.rating}) — ${analysis.labor_market_score.note}

OVERALL: ${analysis.overall_score}/100 — ${analysis.overall_rating}

TARGET MARKET SIZING:
- Relevant segment: ${tm.relevant_segment?.toLocaleString() ?? 'Unknown'} ${tm.segment_label}
- Annual addressable revenue: ${tm.annual_addressable_revenue ? `$${tm.annual_addressable_revenue.toLocaleString()}` : 'Unknown'}
- Year 1 revenue target: ${tm.year1_revenue_target ? `$${tm.year1_revenue_target.toLocaleString()}` : 'Unknown'}
- Non-marginality check: ${tm.nonmarginality_check.toUpperCase()}

Write FIVE sections, each 2–3 sentences. Every sentence must cite a specific number from the data above.

MARKET_OVERVIEW: Population base, household count, and whether the raw demand pool supports a unit of this franchise concept.

ECONOMIC_STRENGTH: What the income level and employment data mean for sustained customer spending — compare to the franchise's minimum viable income threshold.

DEMOGRAPHIC_FIT: How well this territory's demographic profile matches the franchise's core customer — be specific about the target cohort count and what it implies for client acquisition speed.

COMPETITIVE_LANDSCAPE: Interpret the competitor density against the population-per-operator benchmark. State whether this territory has white space or is contested.

VERDICT: A direct recommendation. Should this investor seriously pursue this territory? Name the single most important data point that drives the verdict, and the one thing they must verify before signing a lease.

Return as JSON: {"MARKET_OVERVIEW":"...","ECONOMIC_STRENGTH":"...","DEMOGRAPHIC_FIT":"...","COMPETITIVE_LANDSCAPE":"...","VERDICT":"..."}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1100,
      system: TERRITORY_ANALYST_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as TerritoryAnalysis['narrative'];
    return fallbackNarrative(analysis);
  } catch (err) {
    console.error('Territory narrative error:', err);
    return fallbackNarrative(analysis);
  }
}

function fallbackNarrative(analysis: Omit<TerritoryAnalysis, 'narrative'>): TerritoryAnalysis['narrative'] {
  return {
    MARKET_OVERVIEW: `Territory analysis complete for ZIP ${analysis.target_zip}. Population score: ${analysis.population_score.score}/100. ${analysis.population_score.note}.`,
    ECONOMIC_STRENGTH: analysis.income_score.note,
    DEMOGRAPHIC_FIT: analysis.demographic_fit_score.note,
    COMPETITIVE_LANDSCAPE: analysis.competition_score.note,
    VERDICT: `Overall territory score: ${analysis.overall_score}/100 (${analysis.overall_rating}). ${analysis.target_market.sizing_note} Verify competitive density and labor costs before committing.`,
  };
}

// ============================================================================
// Standalone business narrative (non-franchise — no FDD fields)
// ============================================================================

async function generateTerritoryNarrativeForBusiness(
  analysis: Omit<TerritoryAnalysis, 'narrative'>,
  businessName: string,
): Promise<TerritoryAnalysis['narrative']> {
  const tm = analysis.target_market;

  const prompt = `Write a professional territory market analysis for this business opportunity.

BUSINESS: ${businessName || 'This business'}
CATEGORY: ${analysis.franchise_category}
TARGET ZIP: ${analysis.target_zip}, ${analysis.target_state}

DIMENSION SCORES (out of 100):
- Population & Demand: ${analysis.population_score.score} (${analysis.population_score.rating}) — ${analysis.population_score.note}
- Income & Spending Power: ${analysis.income_score.score} (${analysis.income_score.rating}) — ${analysis.income_score.note}
- Competition: ${analysis.competition_score.score} (${analysis.competition_score.rating}) — ${analysis.competition_score.note}
- Demographic Fit: ${analysis.demographic_fit_score.score} (${analysis.demographic_fit_score.rating}) — ${analysis.demographic_fit_score.note}
- Labor Market: ${analysis.labor_market_score.score} (${analysis.labor_market_score.rating}) — ${analysis.labor_market_score.note}

OVERALL: ${analysis.overall_score}/100 — ${analysis.overall_rating}

TARGET MARKET SIZING:
- Relevant segment: ${tm.relevant_segment?.toLocaleString() ?? 'Unknown'} ${tm.segment_label}
- Annual addressable revenue: ${tm.annual_addressable_revenue ? `$${tm.annual_addressable_revenue.toLocaleString()}` : 'Unknown'}
- Year 1 revenue target: ${tm.year1_revenue_target ? `$${tm.year1_revenue_target.toLocaleString()}` : 'Unknown'}
- Non-marginality check: ${tm.nonmarginality_check.toUpperCase()}

Write FIVE sections, each 2–3 sentences. Every sentence must cite a specific number from the data above.

MARKET_OVERVIEW: Population base, household count, and whether the raw demand pool supports a business of this type in this ZIP code.

ECONOMIC_STRENGTH: What the income level and employment data mean for sustained customer spending — compare to the category's minimum viable income threshold.

DEMOGRAPHIC_FIT: How well this territory's demographic profile matches the core customer for this type of business — be specific about the target cohort count.

COMPETITIVE_LANDSCAPE: Interpret the competitor density against the population-per-operator benchmark. State whether this territory has white space or is contested.

VERDICT: A direct recommendation. Should this investor seriously pursue this location? Name the single most important data point that drives the verdict, and the one thing they must verify before committing.

Return as JSON: {"MARKET_OVERVIEW":"...","ECONOMIC_STRENGTH":"...","DEMOGRAPHIC_FIT":"...","COMPETITIVE_LANDSCAPE":"...","VERDICT":"..."}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1100,
      system: `You are a senior business location analyst with 20 years of experience advising investors on site selection. Your assessments inform $100K–$1M investment decisions. Write with authority, cite specific numbers, and give a clear verdict. Return ONLY valid JSON.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as TerritoryAnalysis['narrative'];
    return fallbackNarrative(analysis);
  } catch (err) {
    console.error('Territory narrative error:', err);
    return fallbackNarrative(analysis);
  }
}

// ============================================================================
// Standalone entry point — no FDD required
// ============================================================================

export async function analyseTeritoryForBusiness(
  zip: string,
  state: string,
  businessName: string,
  categoryKey: string,
): Promise<TerritoryAnalysis> {
  const category = (WEIGHTS_BY_CATEGORY[categoryKey] ? categoryKey : 'default');
  const weights = WEIGHTS_BY_CATEGORY[category] ?? DEFAULT_WEIGHTS;
  const radiusMiles = RADIUS_BY_CATEGORY[category] ?? RADIUS_BY_CATEGORY.default;

  const [census, competitors] = await Promise.all([
    fetchCensusData(zip, state),
    fetchCompetitors(zip, category, radiusMiles, businessName, null),
  ]);

  if (competitors.source === 'google_places' && competitors.nearby_count !== null && census.total_population !== null) {
    competitors.population_per_competitor = competitors.nearby_count > 0
      ? Math.round(census.total_population / competitors.nearby_count)
      : null;
  }

  const populationScore = scorePopulation(census, category);
  const incomeScore = scoreIncome(census, category);
  const competitionScore = scoreCompetition(competitors, census, category);
  const demographicFitScore = scoreDemographicFit(census, category);
  const laborMarketScore = scoreLaborMarket(census, category, state);

  const overallScore = computeWeightedOverallScore([
    { score: populationScore,     weight: weights.population },
    { score: incomeScore,         weight: weights.income },
    { score: competitionScore,    weight: weights.competition },
    { score: demographicFitScore, weight: weights.demographic_fit },
    { score: laborMarketScore,    weight: weights.labor_market },
  ]);

  const overallRating = rateScore(overallScore);

  const availableCount = [populationScore, incomeScore, competitionScore, demographicFitScore, laborMarketScore]
    .filter(d => d.data_available).length;
  const dataCompleteness: TerritoryAnalysis['data_completeness'] =
    availableCount >= 4 ? 'full' : availableCount >= 2 ? 'partial' : 'minimal';

  const targetMarket = computeTargetMarketSizing(census, category, null);

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
    demographic_fit_score: demographicFitScore,
    labor_market_score: laborMarketScore,
    target_market: targetMarket,
    overall_score: overallScore,
    overall_rating: overallRating,
    data_completeness: dataCompleteness,
  };

  const narrative = await generateTerritoryNarrativeForBusiness(partial, businessName);

  return { ...partial, narrative };
}

// ============================================================================
// Main entry point (FDD-backed)
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
  const auv = (fields.item19_median?.value as number) ?? (fields.item19_auv?.value as number) ?? null;

  // Fetch Census and competitors in parallel
  const [census, competitors] = await Promise.all([
    fetchCensusData(zip, state),
    // Fetch competitors — we need population first but it's from Census, so we pass null initially
    // and will recalculate the ratio after Census returns
    fetchCompetitors(zip, category, radiusMiles, franchiseName, null),
  ]);

  // Recalculate population_per_competitor now that we have census data
  if (competitors.source === 'google_places' && competitors.nearby_count !== null && census.total_population !== null) {
    competitors.population_per_competitor = competitors.nearby_count > 0
      ? Math.round(census.total_population / competitors.nearby_count)
      : null;
  }

  // Score all 5 dimensions
  const populationScore = scorePopulation(census, category);
  const incomeScore = scoreIncome(census, category);
  const competitionScore = scoreCompetition(competitors, census, category);
  const demographicFitScore = scoreDemographicFit(census, category);
  const laborMarketScore = scoreLaborMarket(census, category, state);

  // Weighted composite across the available dimensions (unavailable dimensions
  // are excluded and the remaining weights renormalized — see computeWeightedOverallScore)
  const overallScore = computeWeightedOverallScore([
    { score: populationScore,     weight: weights.population },
    { score: incomeScore,         weight: weights.income },
    { score: competitionScore,    weight: weights.competition },
    { score: demographicFitScore, weight: weights.demographic_fit },
    { score: laborMarketScore,    weight: weights.labor_market },
  ]);

  const overallRating = rateScore(overallScore);

  const availableCount = [populationScore, incomeScore, competitionScore, demographicFitScore, laborMarketScore]
    .filter(d => d.data_available).length;
  const dataCompleteness: TerritoryAnalysis['data_completeness'] =
    availableCount >= 4 ? 'full' : availableCount >= 2 ? 'partial' : 'minimal';

  const targetMarket = computeTargetMarketSizing(census, category, auv);

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
    demographic_fit_score: demographicFitScore,
    labor_market_score: laborMarketScore,
    target_market: targetMarket,
    overall_score: overallScore,
    overall_rating: overallRating,
    data_completeness: dataCompleteness,
  };

  const narrative = await generateTerritoryNarrative(partial, fields);

  return { ...partial, narrative };
}
