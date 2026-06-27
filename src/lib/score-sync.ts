import { createSupabaseServerClient } from './supabase-server';

export interface DimensionScore {
  name: string;
  score: string;
  description: string;
}

export interface ScoreData {
  dimensions: DimensionScore[];
  overallScore: number;
  lastAssessedAt: Date | null;
  hasUnreviewedChanges: boolean;
}

export interface SignificantChange {
  dimension: string;
  previousScore: string;
  newScore: string;
  delta: number;
}

type ExecutiveRoleOutput = {
  executive_responsibilities_score: string;
  development_management_score: string;
  combined_score: string;
} | null;

const scoreToNumeric: Record<string, number> = {
  STRONG: 100,
  ADEQUATE: 70,
  WEAK: 40,
  CRITICAL: 10,
  PENDING: 50,
};

export async function getConfidenceScoreData(applicationId: string): Promise<ScoreData> {
  const supabase = await createSupabaseServerClient();

  const { data: brief, error } = await supabase
    .from('case_briefs')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !brief) {
    return {
      dimensions: [],
      overallScore: 0,
      lastAssessedAt: null,
      hasUnreviewedChanges: false,
    };
  }

  const execRole = brief.executive_role as ExecutiveRoleOutput;
  const activeDirectionScore = execRole?.combined_score || 'PENDING';

  const dimensions: DimensionScore[] = [
    {
      name: 'Investment Substantiality',
      score: brief.substantiality_score || 'PENDING',
      description: 'Ratio of investment to total business cost and net worth.',
    },
    {
      name: 'Non-Marginality',
      score: brief.marginality_income_score === 'ADEQUATE' && brief.marginality_contribution_score === 'ADEQUATE' ? 'ADEQUATE' : 'WEAK',
      description: 'Capacity to generate income and economic contribution.',
    },
    {
      name: 'Source & Path of Funds',
      score: brief.fund_source_score || 'PENDING',
      description: 'Legitimacy and traceability of investment capital.',
    },
    {
      name: 'Active Direction',
      score: activeDirectionScore,
      description: 'Applicant role in directing and developing the enterprise.',
    },
    {
      name: 'Investor Qualifications',
      score: brief.experience_score || 'PENDING',
      description: 'Relevant background, skills, and education.',
    },
    {
      name: 'Real & Operating Enterprise',
      score: brief.ownership_control_score || 'PENDING',
      description: 'Viability and operational reality of the business.',
    },
  ];

  const numericScores = dimensions.map(d => scoreToNumeric[d.score] || 50);
  const overallScore = Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length);

  return {
    dimensions,
    overallScore,
    lastAssessedAt: brief.created_at ? new Date(brief.created_at) : null,
    hasUnreviewedChanges: false,
  };
}

export async function triggerAnalysisReRun(applicationId: string): Promise<void> {
  console.log(`[Score Sync] Triggering analysis re-run for application ${applicationId}`);
}

export async function checkForSignificantChanges(
  previousOutput: Record<string, unknown>,
  newOutput: Record<string, unknown>
): Promise<SignificantChange[]> {
  const changes: SignificantChange[] = [];
  const fields = [
    'substantiality_score',
    'marginality_income_score',
    'fund_source_score',
    'experience_score',
    'ownership_control_score',
  ];

  for (const field of fields) {
    const prevStr = String(previousOutput[field] || 'PENDING');
    const nextStr = String(newOutput[field] || 'PENDING');
    const prev = scoreToNumeric[prevStr] ?? 50;
    const next = scoreToNumeric[nextStr] ?? 50;
    const delta = Math.abs(next - prev);

    if (delta > 15) {
      changes.push({
        dimension: field.replace(/_score$/, '').replace(/_/g, ' '),
        previousScore: prevStr,
        newScore: nextStr,
        delta,
      });
    }
  }

  // Check active direction combined score specifically
  const prevExec = previousOutput.executive_role as ExecutiveRoleOutput;
  const nextExec = newOutput.executive_role as ExecutiveRoleOutput;
  const prevExecScore = prevExec?.combined_score || 'PENDING';
  const nextExecScore = nextExec?.combined_score || 'PENDING';
  const execDelta = Math.abs((scoreToNumeric[nextExecScore] ?? 50) - (scoreToNumeric[prevExecScore] ?? 50));

  if (execDelta > 15) {
    changes.push({
      dimension: 'active direction',
      previousScore: prevExecScore,
      newScore: nextExecScore,
      delta: execDelta,
    });
  }

  return changes;
}
