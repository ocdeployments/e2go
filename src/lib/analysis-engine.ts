import {
  type ScoreLevel,
  type MarginalityScore,
  type ExecutiveRoleScore,
  type DenialRisk,
  type KBFlag,
  type FramingDecision,
  type CaseBrief,
} from '@/types/analysis';

interface CoreScores {
  substantiality: ScoreLevel;
  fund_source: ScoreLevel;
  experience: ScoreLevel;
  intent: ScoreLevel;
  executive_role: ExecutiveRoleScore;
  ownership_control: ScoreLevel;
}

interface KBValidationResult {
  complete: boolean;
  consulate_profile_used: string;
  business_type_profile_used: string;
  kb_flags: KBFlag[];
  dimensions_confirmed: string[];
  dimensions_flagged: string[];
}

export async function runAnalysisEngine(
  applicationId: string,
  _userId: string
): Promise<CaseBrief> {
  const answers = await loadApplicationAnswers(applicationId);
  const consulate = (answers.consulate as string) || 'toronto';
  const businessType = (answers.business_type as string) || 'service';

  const scores = {
    substantiality: calculateSubstantialityScore(answers),
    fund_source: calculateFundSourceScore(answers),
    experience: calculateExperienceScore(answers),
    intent: calculateIntentScore(answers),
    executive_role: calculateExecutiveRoleScore(answers),
    ownership_control: calculateOwnershipControlScore(answers),
  };

  const marginality = calculateMarginalityScore(answers);
  const denialRisks = assessDenialRisks(answers, scores);
  const kbValidation = runKBValidation(scores, consulate, businessType);
  const framingDecisions = generateFramingDecisions(scores, kbValidation.kb_flags, denialRisks);

  return assembleCaseBrief(
    applicationId,
    scores,
    marginality,
    denialRisks,
    kbValidation,
    framingDecisions
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadApplicationAnswers(applicationId: string): Promise<Record<string, unknown>> {
  return {};
}

function calculateSubstantialityScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'ADEQUATE';
}

function calculateMarginalityScore(_answers: Record<string, unknown>): MarginalityScore {
  return {
    income_score: 'ADEQUATE',
    contribution_score: 'ADEQUATE',
    combined_score: 'ADEQUATE',
    job_creation_score: 'ADEQUATE',
    economic_activity_score: 'ADEQUATE',
  };
}

function calculateFundSourceScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'ADEQUATE';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateExperienceScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'ADEQUATE';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateIntentScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'STRONG';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateExecutiveRoleScore(_answers: Record<string, unknown>): ExecutiveRoleScore {
  return {
    title_score: 'STRONG',
    authority_score: 'STRONG',
    combined_score: 'STRONG',
    flags: []
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateOwnershipControlScore(_answers: Record<string, unknown>): ScoreLevel {
  return 'STRONG';
}

function assessDenialRisks(_answers: Record<string, unknown>, _scores: CoreScores): DenialRisk[] {
  return [];
}

function runKBValidation(_scores: CoreScores, _cons: string, _bus: string): KBValidationResult {
  return {
    complete: true,
    consulate_profile_used: _cons,
    business_type_profile_used: _bus,
    kb_flags: [],
    dimensions_confirmed: ['substantiality_score'],
    dimensions_flagged: []
  };
}

function generateFramingDecisions(_scores: CoreScores, _kbFlags: KBFlag[], _risks: DenialRisk[]): FramingDecision[] {
  return [];
}

function assembleCaseBrief(appId: string, scores: CoreScores, marg: MarginalityScore, _risks: DenialRisk[], _kb: KBValidationResult, _framing: FramingDecision[]): CaseBrief {
  return {
    application_id: appId,
    generated_at: new Date().toISOString(),
    substantiality_score: scores.substantiality,
    fund_source_score: scores.fund_source,
    experience_score: scores.experience,
    marginality: marg,
    intent_score: scores.intent,
    executive_role: scores.executive_role,
    ownership_control_score: scores.ownership_control,
    denial_risks: [],
    critical_risks: [],
    watch_risks: [],
    kb_validation: {
        complete: true,
        consulate_profile_used: 'toronto',
        business_type_profile_used: 'service',
        kb_flags: [],
        dimensions_confirmed: [],
        dimensions_flagged: []
    },
    framing_decisions: [],
    follow_up_required: false,
    follow_up_questions: [],
    overall_score: 85,
    generation_ready: true,
    blocking_issues: []
  };
}
