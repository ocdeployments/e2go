/**
 * Session 7 Step 6: Fixture Test Matrix
 *
 * 5 synthetic fixtures covering background-strength × business-category
 * combinations. Dry-run only — no Anthropic API calls.
 *
 * For each fixture:
 * 1. Run calculateExperienceScore() → dimension scores
 * 2. Run generateFramingDecisions() → framing output (real OpenRouter call)
 * 3. Construct Document 1 Section II prompt (dry-run only)
 */

import { calculateExperienceScore } from '../analysis-engine';
import { getOperationalNeeds, formatOperationalDemands } from '../business-operational-needs';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

export interface Fixture {
  id: number;
  name: string;
  description: string;
  businessCategory: string;
  answers: Record<string, unknown>;
  expectedOutcome: string;
}

const FIXTURES: Fixture[] = [
  // Fixture 1: Direct industry match
  {
    id: 1,
    name: 'Retail → Retail Franchise',
    description: 'Direct industry match — ran a retail store, applying for retail franchise',
    businessCategory: 'retail',
    answers: {
      'business_type': 'retail',
      'qj-01': 'Store Manager at Best Buy for 8 years. Managed a team of 15 sales associates.',
      'qj-02': 'Responsible for $2.5M annual revenue target, P&L management, inventory ordering.',
      'qj-03': 'Hired and trained 20+ employees over tenure. Conducted performance reviews.',
      'qj-04': 'Previously owned a small electronics resale business for 3 years.',
      'QA-52': 'Retail Store Manager',
      'QA-53': '11 years',
      'QA-55': 'Bachelor of Commerce, University of Toronto',
      '_franchise_interest': 'Yes, interested in retail franchise',
      'education': 'Bachelor of Commerce',
    },
    expectedOutcome: 'Layer 1 should find STRONG direct connections',
  },
  // Fixture 2: Chen-like (banking → education)
  {
    id: 2,
    name: 'Banking → Child Education/Tutoring',
    description: 'Chen-like — 19 years banking, applying for education franchise',
    businessCategory: 'child_education',
    answers: {
      'business_type': 'child_education',
      'qj-01': 'Branch Manager at RBC Royal Bank for 19 years. Managed 3 branches with 47 staff.',
      'qj-02': 'Responsible for hiring, training, and developing bank employees. Managed P&L across three locations.',
      'qj-03': 'Promoted from teller to branch manager over 8 years. Consistently exceeded sales targets.',
      'qj-04': 'Volunteered as literacy tutor at local community center for 5 years.',
      'QA-52': 'Bank Branch Manager',
      'QA-53': '19 years',
      'QA-55': 'Master of Business Administration, York University',
      '_franchise_interest': 'Yes, interested in education franchise (Kumon)',
      'education': 'MBA',
    },
    expectedOutcome: 'Layer 1 + Layer 2 — confirm still produces RBC-Kumon-style bridge via real pipeline',
  },
  // Fixture 3: Warehouse → Cleaning (Session 5's Test B)
  {
    id: 3,
    name: 'Warehouse → Cleaning/Restoration',
    description: 'Warehouse logistics supervisor applying for cleaning franchise',
    businessCategory: 'cleaning',
    answers: {
      'business_type': 'cleaning',
      'qj-01': 'Warehouse Supervisor at Amazon distribution center for 6 years.',
      'qj-02': 'Supervised team of 25 warehouse associates. Managed shift scheduling across 3 shifts.',
      'qj-03': 'Responsible for inventory accuracy, shipping timelines, and quality control.',
      'qj-04': 'Implemented new workflow process that reduced package errors by 15%.',
      'QA-52': 'Warehouse Operations Supervisor',
      'QA-53': '6 years',
      'QA-55': 'Associate Degree in Logistics, community college',
      '_franchise_interest': 'Yes, interested in cleaning franchise (SERVPRO)',
      'education': 'Associate Degree',
    },
    expectedOutcome: 'Layer 1 should surface scheduling/logistics/team management connections',
  },
  // Fixture 4: Stay-at-home parent → Home Care
  {
    id: 4,
    name: 'Stay-at-home Parent → Home Care/Senior Care',
    description: 'No formal employment, raised 3 kids, volunteered at school',
    businessCategory: 'home_care',
    answers: {
      'business_type': 'home_care',
      'qj-01': 'Stay-at-home parent for 12 years. Previously worked as office administrator for 4 years.',
      'qj-02': 'Managed household for family of 5. Coordinated schedules for 3 children in school and activities.',
      'qj-03': 'Volunteered as PTA president for 2 years. Organized school fundraising events with 200+ families.',
      'qj-04': 'Cared for aging parent with dementia for 3 years. Coordinated home care providers and medical appointments.',
      'QA-52': 'Home-maker / Volunteer',
      'QA-53': '16 years total (4 professional + 12 homemaker)',
      'QA-55': 'Bachelor of Arts, University of British Columbia',
      '_franchise_interest': 'Yes, interested in home care franchise',
      'education': 'Bachelor of Arts',
    },
    expectedOutcome: 'Layer 1 should surface caregiving/coordination connections from non-employment background',
  },
  // Fixture 5: Worst case — Recent grad → IT Services
  {
    id: 5,
    name: 'Recent Graduate → IT Services/Tech Repair',
    description: 'Minimal data — no work history, unrelated degree, no follow-up content',
    businessCategory: 'it_services',
    answers: {
      'business_type': 'it_services',
      'qj-01': 'Recent graduate with degree in English Literature.',
      'qj-02': 'Worked part-time at a coffee shop during university.',
      'QA-52': 'Barista / Student',
      'QA-53': '2 years (part-time)',
      'QA-55': 'Bachelor of Arts in English Literature',
      '_franchise_interest': 'Yes, interested in IT services franchise',
      'education': 'BA English Literature',
    },
    expectedOutcome: 'WORST CASE — minimal data. Layer 1 should gracefully return [] or weak-but-honest connection.',
  },
];

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

export interface FixtureResult {
  fixture: Fixture;
  scoring: ReturnType<typeof calculateExperienceScore>;
  framingDecisions: unknown[];
  promptSections: {
    creativeFraming: string;
    standingInstruction: string;
  };
}

/**
 * Run dry-run scoring and prompt construction for a fixture.
 * Does NOT call OpenRouter (framing_decisions are empty in dry-run).
 */
export function runFixtureDryRun(fixture: Fixture): FixtureResult {
  const scoring = calculateExperienceScore(fixture.answers, fixture.businessCategory);
  const categoryNeeds = getOperationalNeeds(fixture.businessCategory);

  // Dry-run: framing_decisions would come from generateFramingDecisions()
  // which is an async AI call. In dry-run, we construct what the prompt
  // WOULD look like with and without framing_decisions.
  const framingDecisions: unknown[] = [];

  // Construct the prompt sections that Step 5 would produce
  const operationalDemands = categoryNeeds
    ? formatOperationalDemands(fixture.businessCategory)
    : 'Operational demands not available';

  const creativeFraming = framingDecisions.length > 0
    ? framingDecisions.map((fd: unknown) => {
        const f = fd as { area?: string; approach?: string; legal_basis?: string };
        return `${f.area}: ${f.approach}\n  Connection: ${f.legal_basis}`;
      }).join('\n')
    : '[No framing_decisions — Layer 1 returned empty or was not run]';

  const standingInstruction = `TRANSFERABLE SKILLS ANALYSIS — STANDING INSTRUCTION:
Review the applicant's complete background against what this ${categoryNeeds?.category_name || 'business'} requires day-to-day:
${operationalDemands}

Identify the STRONGEST genuine connection(s) between the applicant's
actual experience and these operational demands — even indirect ones
(household management, volunteer work, parenting, community roles,
different-industry analogous functions, military service).

Write at least one BRIDGE sentence using the pattern:
"My experience [X] directly prepares me to [Y] because [specific connection]."

If specific framing instructions were provided above, use those as your
primary guide but you may identify ADDITIONAL connections. If no framing
instructions were provided, perform this analysis independently from the
applicant background data provided.

Never state there is "no relevant experience" — there is always SOME
transferable connection; find the most honest and specific one.`;

  return {
    fixture,
    scoring,
    framingDecisions,
    promptSections: {
      creativeFraming,
      standingInstruction,
    },
  };
}

/**
 * Run all 5 fixtures and return results.
 */
export function runAllFixtures(): FixtureResult[] {
  return FIXTURES.map(runFixtureDryRun);
}

/**
 * Format a fixture result for display.
 */
export function formatFixtureResult(result: FixtureResult): string {
  const { fixture, scoring, promptSections } = result;

  const dimensionScores = scoring.dimensions
    .map(d => `    ${d.dimension}: ${d.score} — ${d.evidence}`)
    .join('\n');

  return `
=== Fixture ${fixture.id}: ${fixture.name} ===
Description: ${fixture.description}
Business Category: ${fixture.businessCategory}
Expected Outcome: ${fixture.expectedOutcome}

SCORING:
  Overall Score: ${scoring.overall_score}
  Confirmed: ${scoring.confirmed_count}/${scoring.applicable_count}
  Franchise Training Offset: ${scoring.franchise_training_offset}
  Dimensions:
${dimensionScores}

PROMPT SECTIONS:
  CREATIVE FRAMING INSTRUCTION:
    ${promptSections.creativeFraming}

  STANDING INSTRUCTION:
    ${promptSections.standingInstruction.split('\n').slice(0, 5).join('\n    ')}...
`;
}
