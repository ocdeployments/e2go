/**
 * Pathway Engine — Creative Eligibility Intelligence
 *
 * Pure function engine. Zero async, zero LLM calls.
 * Reads from src/data/pathway-library.ts, applies trigger conditions,
 * scores pathways, and returns ranked recommendations.
 *
 * Call analyzePathways() from any page — gap analysis, dashboard, quiz, family section.
 */

import { PATHWAY_LIBRARY, type PathwayCategory, type PathwayImpact } from '@/data/pathway-library';
import { isTreatyNational } from '@/lib/treaty-countries';

// =============================================================================
// Input types
// =============================================================================

export interface FamilyMemberSnapshot {
  relationship: 'spouse' | 'child' | 'partner' | 'sibling' | 'parent' | 'other';
  labelHint: string | null;  // "daughter", "son", "brother" etc. — for personalization
  ageApprox: number | null;
  isOver21: boolean;
  isMarried: boolean | null;       // null = unknown (Phase 1 heuristic limit)
  isCommonLaw: boolean | null;     // for spouse/partner — Phase 2 data
  nationality: string | null;
  isTreaty: boolean | null;
  plannedUSUniversity: boolean;    // adult child F-1 path — Phase 2 data
}

export interface PathwayInput {
  // Applicant basics
  applicantNationality: string | null;
  applicantIsTreaty: boolean;
  hardStops: string[];              // ['PR-NON-TREATY', ...]
  activeDCodes: string[];           // ['D-01', 'D-04', ...]
  substantialityScore: number;      // 0–100
  franchiseTrigger: boolean;
  applicationStructure: string | null;   // 'solo' | 'partnership' | 'spousal_partnership'
  investmentAmount: number | null;
  plansToHireGM: boolean | null;    // develop-and-direct risk — Phase 2 data

  // Family members mapped from M3-L-* answers
  familyMembers: FamilyMemberSnapshot[];

  // Derived convenience flags (compute before passing in)
  hasSpouse: boolean;
  hasCommonLawPartner: boolean;
  hasAdultChild21Plus: boolean;
  hasMarriedChildUnder21: boolean;
  hasChildWithTreatyNationality: boolean;
  hasTreatyFamilyMember: boolean;   // any non-applicant family member is treaty national
  spouseIsTreaty: boolean;
}

// =============================================================================
// Output types
// =============================================================================

export interface PathwayRecommendation {
  id: string;
  title: string;
  category: PathwayCategory;
  impact: PathwayImpact;
  headline: string;
  whoThisHelps: string;
  rationale: string;
  mechanism: string[];
  requirements: string[];
  tradeoffs: string[];
  timeline: string;
  requiresAttorney: boolean;
  compositeScore: number;           // 0–100
  requiredDataMissing: string[];    // human-readable list of missing inputs
  triggers: string[];               // what triggered this (D-codes, flags)
}

export interface FamilyVisaCoverage {
  label: string;               // "You (principal)", "Spouse", "Child (17)"
  relationship: string;
  proposedVisa: string;        // "E-2 Principal", "E-2S", "E-2Y", "E-2 Employee", "F-1"
  workAuthorization: string;
  notes: string;
}

export interface PathwayAnalysisResult {
  pathways: PathwayRecommendation[];
  familyCoverage: FamilyVisaCoverage[];
  triggerCount: number;
}

// =============================================================================
// Scoring matrix
// =============================================================================

const IMPACT_ORDER: Record<PathwayImpact, number> = {
  transformative: 0,
  significant: 1,
  moderate: 2,
};

function computeScore(weights: {
  visaCoverage: number;
  workAuthorization: number;
  capitalEfficiency: number;
  applicationComplexity: number;
  approvalConfidence: number;
}): number {
  return Math.round(
    weights.visaCoverage * 0.25 +
    weights.workAuthorization * 0.25 +
    weights.capitalEfficiency * 0.20 +
    weights.applicationComplexity * 0.15 +
    weights.approvalConfidence * 0.15
  );
}

// =============================================================================
// Trigger conditions — one function per pathway
// =============================================================================

type TriggerResult = { fires: boolean; triggers: string[]; missingData: string[] };

function checkP01(input: PathwayInput): TriggerResult {
  const triggers: string[] = [];
  const missingData: string[] = [];

  if (!input.hasAdultChild21Plus) return { fires: false, triggers: [], missingData: [] };

  triggers.push('adult_child_21_plus_detected');
  if (input.activeDCodes.includes('D-01')) triggers.push('D-01');
  if (input.activeDCodes.includes('D-04')) triggers.push('D-04');

  // We can confirm treaty nationality of child only in Phase 2
  const adultChildren = input.familyMembers.filter(m => m.relationship === 'child' && m.isOver21);
  const hasUnknownNationality = adultChildren.some(m => m.isTreaty === null);
  if (hasUnknownNationality) {
    missingData.push("Confirm your adult child's citizenship to verify treaty eligibility");
  }

  return { fires: true, triggers, missingData };
}

function checkP02(input: PathwayInput): TriggerResult {
  if (input.applicantIsTreaty) return { fires: false, triggers: [], missingData: [] };
  if (!input.hasSpouse) return { fires: false, triggers: [], missingData: [] };

  const triggers = ['PR-NON-TREATY', 'spouse_present'];
  const missingData: string[] = [];

  if (!input.spouseIsTreaty) {
    // Spouse nationality entered but is non-treaty, or not entered
    const spouse = input.familyMembers.find(m => m.relationship === 'spouse');
    if (!spouse?.nationality) {
      missingData.push('Enter your spouse\'s citizenship to check if they qualify as principal investor');
    }
    // Only fire if spouse is confirmed treaty
    return { fires: false, triggers, missingData };
  }

  return { fires: true, triggers, missingData };
}

function checkP03(input: PathwayInput): TriggerResult {
  if (!input.hasAdultChild21Plus) return { fires: false, triggers: [], missingData: [] };

  const triggers = ['adult_child_21_plus_detected'];
  const missingData: string[] = [];

  const adultChildren = input.familyMembers.filter(m => m.relationship === 'child' && m.isOver21);
  const hasUnknownNationality = adultChildren.some(m => m.isTreaty === null);
  if (hasUnknownNationality) {
    missingData.push("Confirm your adult child's citizenship to verify treaty employee eligibility");
  }

  return { fires: true, triggers, missingData };
}

function checkP04(input: PathwayInput): TriggerResult {
  if (!input.hasAdultChild21Plus) return { fires: false, triggers: [], missingData: [] };
  const adultChildren = input.familyMembers.filter(m => m.relationship === 'child' && m.isOver21);
  const hasPlanningUni = adultChildren.some(m => m.plannedUSUniversity);
  // Fire proactively whenever adult child detected — university plan unlocks it fully
  const triggers = ['adult_child_21_plus_detected'];
  const missingData: string[] = [];
  if (!hasPlanningUni) {
    missingData.push('Confirm if your adult child is enrolled in or applying to a U.S. university');
  }
  return { fires: true, triggers, missingData };
}

function checkP05(input: PathwayInput): TriggerResult {
  if (!input.hasCommonLawPartner) {
    // Phase 2: if we don't have structured data, we can't confirm
    return { fires: false, triggers: [], missingData: [] };
  }
  return {
    fires: true,
    triggers: ['common_law_partner_detected'],
    missingData: [],
  };
}

function checkP06(input: PathwayInput): TriggerResult {
  if (!input.activeDCodes.includes('D-01')) return { fires: false, triggers: [], missingData: [] };
  const isLowInvestment = input.investmentAmount !== null && input.investmentAmount < 200_000;
  if (!isLowInvestment && input.substantialityScore >= 60) return { fires: false, triggers: [], missingData: [] };

  return {
    fires: true,
    triggers: ['D-01', 'low_substantiality'],
    missingData: [],
  };
}

function checkP07(input: PathwayInput): TriggerResult {
  if (!input.franchiseTrigger) return { fires: false, triggers: [], missingData: [] };
  if (!input.activeDCodes.includes('D-01') && input.substantialityScore >= 70) {
    return { fires: false, triggers: [], missingData: [] };
  }

  return {
    fires: true,
    triggers: ['franchise_trigger', 'D-01'],
    missingData: [],
  };
}

function checkP08(input: PathwayInput): TriggerResult {
  if (input.applicantIsTreaty) return { fires: false, triggers: [], missingData: [] };
  if (!input.hasTreatyFamilyMember) {
    return {
      fires: false,
      triggers: ['PR-NON-TREATY'],
      missingData: ['Do any of your family members hold citizenship of a treaty country? (Canada, UK, Germany, Australia, etc.)'],
    };
  }

  return {
    fires: true,
    triggers: ['PR-NON-TREATY', 'treaty_family_member'],
    missingData: [],
  };
}

function checkP09(input: PathwayInput): TriggerResult {
  if (!input.hasMarriedChildUnder21) return { fires: false, triggers: [], missingData: [] };
  return {
    fires: true,
    triggers: ['married_child_under_21'],
    missingData: [],
  };
}

function checkP10(input: PathwayInput): TriggerResult {
  const hasDCode = input.activeDCodes.includes('D-11');
  const plansGM = input.plansToHireGM === true;
  if (!hasDCode && !plansGM) return { fires: false, triggers: [], missingData: [] };

  const triggers: string[] = [];
  if (hasDCode) triggers.push('D-11');
  if (plansGM) triggers.push('plans_to_hire_gm');

  return { fires: true, triggers, missingData: [] };
}

function checkP11(input: PathwayInput): TriggerResult {
  // Fire when: a non-spouse family member with treaty nationality is present
  // OR investment appears solo and capital might benefit from a partner
  const hasCoInvestorCandidate = input.familyMembers.some(
    m => (m.relationship === 'sibling' || m.relationship === 'parent') && m.isTreaty !== false
  );
  const lowCapital = input.activeDCodes.includes('D-01');

  if (!hasCoInvestorCandidate && !lowCapital) return { fires: false, triggers: [], missingData: [] };

  const triggers: string[] = [];
  const missingData: string[] = [];
  if (hasCoInvestorCandidate) triggers.push('treaty_family_member');
  if (lowCapital) triggers.push('D-01');
  if (!hasCoInvestorCandidate) {
    missingData.push('Do you have a sibling or parent who holds treaty nationality and has capital to invest?');
  }

  return { fires: true, triggers, missingData };
}

function checkP12(input: PathwayInput): TriggerResult {
  const hasMarginal = input.activeDCodes.includes('D-04') || input.activeDCodes.includes('D-14');
  const isSolo = input.applicationStructure === 'solo' || input.applicationStructure === 'just_me';
  if (!hasMarginal && !isSolo) return { fires: false, triggers: [], missingData: [] };

  const triggers: string[] = [];
  if (input.activeDCodes.includes('D-04')) triggers.push('D-04');
  if (input.activeDCodes.includes('D-14')) triggers.push('D-14');
  if (isSolo) triggers.push('solo_structure');

  return { fires: true, triggers, missingData: [] };
}

// =============================================================================
// Family visa coverage table builder
// =============================================================================

function buildFamilyCoverage(
  input: PathwayInput,
  pathways: PathwayRecommendation[]
): FamilyVisaCoverage[] {
  const coverage: FamilyVisaCoverage[] = [];
  const activePathwayIds = new Set(pathways.map(p => p.id));

  // Applicant
  coverage.push({
    label: 'You (principal)',
    relationship: 'Principal investor',
    proposedVisa: 'E-2 Principal',
    workAuthorization: 'Business operations only',
    notes: input.applicantIsTreaty
      ? `${input.applicantNationality ?? 'Treaty national'} — eligible`
      : 'Non-treaty: see pathway options',
  });

  // Each family member
  for (const member of input.familyMembers) {
    if (member.relationship === 'spouse') {
      coverage.push({
        label: 'Spouse',
        relationship: 'Spouse',
        proposedVisa: activePathwayIds.has('P-05') && input.hasCommonLawPartner
          ? 'Not eligible (common-law) — see P-05'
          : 'E-2S Dependent',
        workAuthorization: 'Full U.S. work authorization — any employer',
        notes: 'E-2S spouses received full work authorization on Jan 30, 2022',
      });
    } else if (member.relationship === 'child') {
      if (member.isOver21) {
        let proposedVisa = 'Not eligible as E-2Y dependent';
        let workAuth = 'None (E-2Y unavailable)';
        let notes = 'Adult children (21+) cannot be E-2 dependents';

        if (activePathwayIds.has('P-01')) {
          proposedVisa = 'E-2 Principal (co-investor pathway — P-01)';
          workAuth = 'Business operations only';
          notes = 'Requires own capital contribution and genuine management role';
        } else if (activePathwayIds.has('P-03')) {
          proposedVisa = 'E-2 Treaty Employee (P-03)';
          workAuth = 'E-2 business only';
          notes = 'Requires executive, supervisory, or essential-skills role';
        } else if (activePathwayIds.has('P-04')) {
          proposedVisa = 'F-1 Student → OPT → E-2 Employee (phased — P-04)';
          workAuth = 'None initially; OPT after graduation';
          notes = 'Phased pathway — 4+ years to degree completion';
        }

        const ageLabel = member.ageApprox ? ` (${member.ageApprox})` : ' (21+)';
        coverage.push({
          label: `Adult child${ageLabel}`,
          relationship: 'Adult child',
          proposedVisa,
          workAuthorization: workAuth,
          notes,
        });
      } else if (member.isMarried === true) {
        const ageLabel = member.ageApprox ? ` (${member.ageApprox})` : '';
        coverage.push({
          label: `Child${ageLabel} (married)`,
          relationship: 'Child',
          proposedVisa: 'Not eligible as E-2Y — see P-09',
          workAuthorization: 'None',
          notes: 'E-2Y requires child to be under 21 AND unmarried',
        });
      } else {
        const ageLabel = member.ageApprox ? ` (${member.ageApprox})` : '';
        coverage.push({
          label: `Child${ageLabel}`,
          relationship: 'Child',
          proposedVisa: 'E-2Y Dependent',
          workAuthorization: 'None (school only)',
          notes: 'Eligible while under 21 and unmarried',
        });
      }
    }
  }

  return coverage;
}

// =============================================================================
// Main export
// =============================================================================

export function analyzePathways(input: PathwayInput): PathwayAnalysisResult {
  const CHECKS: Array<{ id: string; fn: (i: PathwayInput) => TriggerResult }> = [
    { id: 'P-01', fn: checkP01 },
    { id: 'P-02', fn: checkP02 },
    { id: 'P-03', fn: checkP03 },
    { id: 'P-04', fn: checkP04 },
    { id: 'P-05', fn: checkP05 },
    { id: 'P-06', fn: checkP06 },
    { id: 'P-07', fn: checkP07 },
    { id: 'P-08', fn: checkP08 },
    { id: 'P-09', fn: checkP09 },
    { id: 'P-10', fn: checkP10 },
    { id: 'P-11', fn: checkP11 },
    { id: 'P-12', fn: checkP12 },
  ];

  const pathways: PathwayRecommendation[] = [];

  for (const { id, fn } of CHECKS) {
    const { fires, triggers, missingData } = fn(input);
    if (!fires) continue;

    const def = PATHWAY_LIBRARY.find(p => p.id === id);
    if (!def) continue;

    const compositeScore = computeScore(def.scoringWeights);

    pathways.push({
      id: def.id,
      title: def.title,
      category: def.category,
      impact: def.impact,
      headline: def.headline,
      whoThisHelps: def.whoThisHelps,
      rationale: def.rationale,
      mechanism: def.mechanism,
      requirements: def.requirements,
      tradeoffs: def.tradeoffs,
      timeline: def.timeline,
      requiresAttorney: def.requiresAttorney,
      compositeScore,
      requiredDataMissing: missingData,
      triggers,
    });
  }

  // Sort: transformative first, then significant, then moderate; within tier by compositeScore desc
  pathways.sort((a, b) => {
    const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return b.compositeScore - a.compositeScore;
  });

  const familyCoverage = buildFamilyCoverage(input, pathways);

  return { pathways, familyCoverage, triggerCount: pathways.length };
}

// =============================================================================
// Helper: build PathwayInput from gap analysis page data
// =============================================================================

/**
 * Parses M3-L-08 free-text dependent details to extract family member snapshots.
 * Phase 1 heuristic: looks for age numbers and relationship keywords.
 * Phase 2 replaces this with structured per-child fields.
 */
function parseDependentDetails(raw: string | null | undefined): FamilyMemberSnapshot[] {
  if (!raw || raw.trim().length < 3) return [];

  const members: FamilyMemberSnapshot[] = [];
  const text = raw.toLowerCase();

  // Split on commas, semicolons, or newlines
  const segments = text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  for (const seg of segments) {
    // Look for age patterns: "24", "age 24", "24 years"
    const ageMatch = seg.match(/\b(\d{1,2})\b/);
    const ageApprox = ageMatch ? parseInt(ageMatch[1]) : null;

    // Identify relationship
    let relationship: FamilyMemberSnapshot['relationship'] = 'child'; // default for dependents
    let labelHint: string | null = null;

    if (seg.includes('son') || seg.includes('boy')) {
      labelHint = 'son';
    } else if (seg.includes('daughter') || seg.includes('girl')) {
      labelHint = 'daughter';
    } else if (seg.includes('sibling') || seg.includes('brother') || seg.includes('sister')) {
      relationship = 'sibling';
      labelHint = seg.includes('brother') ? 'brother' : seg.includes('sister') ? 'sister' : 'sibling';
    } else if (seg.includes('parent') || seg.includes('mother') || seg.includes('father')) {
      relationship = 'parent';
    }

    const isOver21 = ageApprox !== null ? ageApprox >= 21 : false;

    if (ageApprox !== null && ageApprox >= 2 && ageApprox <= 80) {
      members.push({
        relationship,
        labelHint,
        ageApprox,
        isOver21,
        isMarried: null,      // unknown in Phase 1
        isCommonLaw: null,
        nationality: null,    // unknown in Phase 1
        isTreaty: null,
        plannedUSUniversity: false,
      });
    }
  }

  return members;
}

export function buildPathwayInput(params: {
  applicantNationality: string | null;
  hardStops: string[];
  activeDCodes: string[];
  substantialityScore: number;
  franchiseTrigger: boolean;
  applicationStructure: string | null;
  investmentAmount: number | null;
  answers: Map<string, string>;
}): PathwayInput {
  const {
    applicantNationality, hardStops, activeDCodes,
    substantialityScore, franchiseTrigger, applicationStructure,
    investmentAmount, answers,
  } = params;

  const applicantIsTreaty = isTreatyNational(applicantNationality);

  // Read family answers from M3-L-*
  const hasSpouseRaw = answers.get('M3-L-01') ?? '';
  const hasSpouse = hasSpouseRaw.toLowerCase().includes('yes') ||
    hasSpouseRaw.toLowerCase().includes('married') ||
    hasSpouseRaw.toLowerCase().includes('spouse');

  const spouseNationality = answers.get('M3-L-04') ?? null;
  const spouseIsTreaty = isTreatyNational(spouseNationality);

  const hasChildrenRaw = answers.get('M3-L-07') ?? '';
  const hasChildren = hasChildrenRaw.toLowerCase().includes('yes') ||
    hasChildrenRaw.toLowerCase().includes('children') ||
    hasChildrenRaw.toLowerCase().includes('child');

  const dependentDetails = answers.get('M3-L-08') ?? null;

  // Build family member list
  const familyMembers: FamilyMemberSnapshot[] = [];

  if (hasSpouse) {
    familyMembers.push({
      relationship: 'spouse',
      labelHint: 'spouse',
      ageApprox: null,
      isOver21: true,
      isMarried: null,
      isCommonLaw: null,  // Phase 2: M3-L-04b
      nationality: spouseNationality,
      isTreaty: spouseNationality ? (spouseIsTreaty ? true : false) : null,
      plannedUSUniversity: false,
    });
  }

  if (hasChildren && dependentDetails) {
    const parsed = parseDependentDetails(dependentDetails);
    familyMembers.push(...parsed);
  }

  // Derive convenience flags
  const hasAdultChild21Plus = familyMembers.some(
    m => m.relationship === 'child' && m.isOver21
  );
  const hasMarriedChildUnder21 = familyMembers.some(
    m => m.relationship === 'child' && !m.isOver21 && m.isMarried === true
  );
  const hasChildWithTreatyNationality = familyMembers.some(
    m => m.relationship === 'child' && m.isTreaty === true
  );
  const hasTreatyFamilyMember = familyMembers.some(
    m => m.relationship !== 'spouse' && m.isTreaty === true
  ) || (familyMembers.some(m => m.relationship === 'sibling' || m.relationship === 'parent'));

  const hasCommonLawPartner = false; // Phase 2: set from M3-L-04b

  return {
    applicantNationality,
    applicantIsTreaty,
    hardStops,
    activeDCodes,
    substantialityScore,
    franchiseTrigger,
    applicationStructure,
    investmentAmount,
    plansToHireGM: null,  // Phase 2: M3-L-09
    familyMembers,
    hasSpouse,
    hasCommonLawPartner,
    hasAdultChild21Plus,
    hasMarriedChildUnder21,
    hasChildWithTreatyNationality,
    hasTreatyFamilyMember,
    spouseIsTreaty,
  };
}
