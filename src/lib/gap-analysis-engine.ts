// E-2 Gap Analysis Engine
// Scores a case file against the 6 evidence categories officers evaluate.
// Pure function — no API calls, no async. Pass raw DB data in, get scores out.

export interface GapCategory {
  id: string;
  name: string;
  weight: number;
  score: number;
  weightedScore: number;
  evidence: string[];
  gaps: string[];
  actions: string[];
  priority: 'strong' | 'good' | 'needs_work' | 'critical';
}

export interface GapAnalysisResult {
  overallScore: number;
  readiness: 'strong' | 'moderate' | 'needs_work';
  categories: GapCategory[];
  topPriorities: string[];
}

interface ApplicationRow {
  business_name?: string | null;
  business_category?: string | null;
  operational_status?: string | null;
  target_state?: string | null;
  principal_name?: string | null;
}

interface AnswerRow {
  question_key: string;
  answer_value: string | null;
}

interface DocumentRow {
  detected_document_type?: string | null;
  user_selected_document_type?: string | null;
}

interface CaseBriefRow {
  substantiality_score?: number | null;
  marginality_score?: number | null;
}

function amap(answers: AnswerRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of answers) {
    if (a.answer_value) m.set(a.question_key, a.answer_value);
  }
  return m;
}

function parseAmount(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
}

function hasDoc(docs: DocumentRow[], ...types: string[]): boolean {
  return docs.some(d => {
    const t = d.detected_document_type || d.user_selected_document_type || '';
    return types.some(target => t.toLowerCase().includes(target.toLowerCase()));
  });
}

function priority(score: number): GapCategory['priority'] {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'good';
  if (score >= 25) return 'needs_work';
  return 'critical';
}

// =============================================================================
// CATEGORY SCORERS
// =============================================================================

function scoreSourceOfFunds(
  answers: Map<string, string>,
  docs: DocumentRow[]
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const amount = parseAmount(answers.get('QF-02') || answers.get('M3-F-02'));
  const sourceType = answers.get('QF-03') || answers.get('M3-F-03');
  const hasBankDocs = hasDoc(docs, 'bank', 'statement', 'source');
  const hasTransferDocs = hasDoc(docs, 'wire', 'transfer', 'liquidat');

  if (amount > 0) {
    score += 25;
    evidence.push(`Investment amount: $${amount.toLocaleString()}`);
  } else {
    gaps.push('Investment amount not documented');
    actions.push('Add total investment amount to your case file');
  }

  if (sourceType) {
    score += 25;
    evidence.push(`Source type: ${sourceType}`);
  } else {
    gaps.push('Investment source type not specified');
    actions.push('Specify how you funded the investment (savings, property sale, RRSP, etc.)');
  }

  if (hasBankDocs) {
    score += 30;
    evidence.push('Bank statements or source documents uploaded');
  } else {
    gaps.push('No bank statements or source documents uploaded');
    actions.push('Upload bank statements showing the source funds (3–6 months minimum)');
  }

  if (hasTransferDocs) {
    score += 20;
    evidence.push('Fund transfer or liquidation evidence uploaded');
  } else {
    gaps.push('No wire transfer or liquidation evidence');
    actions.push('Upload wire transfer records or liquidation confirmations showing funds moved to the US business');
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

function scoreManagementRole(
  answers: Map<string, string>,
  docs: DocumentRow[],
  app: ApplicationRow
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const role = answers.get('QA-08') || answers.get('M3-A-08');
  const hasBio = hasDoc(docs, 'resume', 'cv', 'biograph', 'biography', 'curriculum');
  const principalName = app.principal_name;

  if (role && role.toLowerCase() !== 'owner' && role.length > 5) {
    score += 35;
    evidence.push(`Investor role: ${role}`);
  } else if (role) {
    score += 15;
    gaps.push('Role description is too generic — "owner" alone is insufficient');
    actions.push('Describe day-to-day management activities: who you supervise, decisions you make, hours worked per week');
  } else {
    gaps.push('Investor management role not documented');
    actions.push('Define your specific role — E-2 requires active, day-to-day management, not passive investment');
  }

  if (principalName) {
    score += 15;
    evidence.push(`Applicant: ${principalName}`);
  }

  if (hasBio) {
    score += 30;
    evidence.push('Investor biography / résumé uploaded');
  } else {
    gaps.push('No investor biography or résumé on file');
    actions.push('Upload a résumé and/or investor biography showing relevant business experience');
  }

  // Management activities (checked by looking for known question keys)
  const mgmtActivities = answers.get('QA-09') || answers.get('M3-A-09');
  if (mgmtActivities && mgmtActivities.length > 20) {
    score += 20;
    evidence.push('Specific management activities documented');
  } else {
    gaps.push('Management activities not detailed');
    actions.push('List at least 5 specific management activities (hiring staff, managing cash flow, meeting clients, etc.)');
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

function scoreBusinessPlan(
  answers: Map<string, string>,
  docs: DocumentRow[]
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const hasPlan = hasDoc(docs, 'business_plan', 'business plan', 'plan');
  const revenueY1 = parseAmount(answers.get('QI-05') || answers.get('M3-I-05'));
  const revenueY3 = parseAmount(answers.get('QI-06') || answers.get('M3-I-06'));
  const incomeNeed = parseAmount(answers.get('QI-07') || answers.get('M3-I-07'));

  if (hasPlan) {
    score += 35;
    evidence.push('Business plan document uploaded');
  } else {
    gaps.push('No business plan document on file');
    actions.push('Upload or prepare a full business plan (market analysis, operations, financial projections)');
  }

  if (revenueY1 > 0) {
    score += 20;
    evidence.push(`Year 1 revenue projection: $${revenueY1.toLocaleString()}`);
  } else {
    gaps.push('No Year 1 revenue projection');
    actions.push('Add 5-year financial projections to your case file');
  }

  if (revenueY3 > 0) {
    score += 20;
    evidence.push(`Year 3 revenue projection: $${revenueY3.toLocaleString()}`);
    if (incomeNeed > 0 && revenueY3 >= incomeNeed * 5) {
      score += 15;
      evidence.push('Revenue projections indicate business viability (non-marginal)');
    } else if (incomeNeed > 0) {
      gaps.push('Revenue projections may not clearly establish non-marginality');
      actions.push('Ensure Year 3+ projections demonstrate the business will do more than support you and your family');
    }
  } else {
    gaps.push('No multi-year revenue projection');
    actions.push('Add Year 3 and Year 5 revenue projections showing growth trajectory');
  }

  if (score < 60) {
    actions.push('Consider having an immigration attorney review your business plan for E-2 compliance');
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

function scoreInvestmentAmount(
  answers: Map<string, string>,
  app: ApplicationRow,
  caseBrief?: CaseBriefRow
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const amount = parseAmount(answers.get('QF-02') || answers.get('M3-F-02'));
  const category = app.business_category || '';

  // Substantiality thresholds by business type (rough E-2 guidance)
  const thresholds: Record<string, number> = {
    restaurant: 150000,
    franchise: 120000,
    retail: 120000,
    manufacturing: 200000,
    technology: 100000,
    consulting: 80000,
    service: 80000,
    healthcare: 150000,
  };
  const key = Object.keys(thresholds).find(k => category.toLowerCase().includes(k));
  const threshold = key ? thresholds[key] : 100000;

  if (amount > 0) {
    evidence.push(`Investment: $${amount.toLocaleString()}`);
    if (amount >= threshold) {
      score += 60;
      evidence.push(`Exceeds substantiality threshold for this business type (~$${threshold.toLocaleString()})`);
    } else if (amount >= threshold * 0.75) {
      score += 35;
      gaps.push(`Investment may be below typical substantiality threshold (~$${threshold.toLocaleString()}) for this business type`);
      actions.push('Document why this amount is proportionally substantial for the total cost of the enterprise');
    } else {
      score += 15;
      gaps.push(`Investment appears low relative to typical E-2 cases for this business type (~$${threshold.toLocaleString()})`);
      actions.push('Consider increasing investment or strengthening "proportionality" argument in your cover letter');
    }
  } else {
    gaps.push('Investment amount not documented');
    actions.push('Add total investment amount to your case file');
  }

  // Use substantiality score from analysis engine if available
  if (caseBrief?.substantiality_score != null) {
    const analysisBoost = Math.round(caseBrief.substantiality_score * 40);
    score = Math.min(100, score + analysisBoost);
    if (caseBrief.substantiality_score >= 0.7) {
      evidence.push('Analysis engine: investment meets substantiality standard');
    } else if (caseBrief.substantiality_score < 0.4) {
      gaps.push('Analysis engine flagged substantiality concern');
      actions.push('Review the Substantiality tab in your case brief for detailed guidance');
    }
  } else {
    score += 10; // small base for having the field
  }

  // "At risk" commitment check
  const atRisk = answers.get('QF-10') || answers.get('M3-F-10');
  if (atRisk && atRisk.toLowerCase().includes('yes')) {
    score += 20;
    evidence.push('Investment funds confirmed as committed ("at risk")');
  } else {
    score += 10;
    gaps.push('No explicit confirmation that funds are committed / "at risk"');
    actions.push('Document that funds are irrevocably committed to the enterprise before the visa is granted');
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

function scoreEmploymentCreation(
  answers: Map<string, string>
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const countY1 = parseInt(answers.get('QI-03') || answers.get('M3-I-03') || '0') || 0;
  const roleList = answers.get('QI-04') || answers.get('M3-I-04') || '';

  if (countY1 >= 5) {
    score += 60;
    evidence.push(`${countY1} US employees projected in Year 1 — strong employment creation`);
  } else if (countY1 >= 2) {
    score += 40;
    evidence.push(`${countY1} US employees projected in Year 1`);
    gaps.push('2–4 employees is acceptable but more is stronger — consider planning for growth');
    actions.push('Develop a hiring timeline showing how the team grows over 3 years');
  } else if (countY1 === 1) {
    score += 15;
    gaps.push('Only 1 US employee projected — officer may view this as borderline marginal');
    actions.push('Demonstrate a clear growth plan to expand beyond 1 employee within 2–3 years');
  } else {
    gaps.push('No US job creation projected');
    actions.push('E-2 does not require a specific employee count, but demonstrating US job creation is strongly advised');
  }

  if (roleList && roleList.length > 10) {
    score += 25;
    evidence.push('Specific job roles documented');
  } else {
    gaps.push('Specific job titles / roles not documented');
    actions.push('List the specific roles you plan to hire: job title, hours, pay range');
  }

  const currentEmployees = parseInt(answers.get('QI-02') || answers.get('M3-I-02') || '0') || 0;
  if (currentEmployees > 0) {
    score += 15;
    evidence.push(`${currentEmployees} US employee${currentEmployees > 1 ? 's' : ''} currently employed`);
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

function scoreBusinessOperations(
  answers: Map<string, string>,
  app: ApplicationRow
): Pick<GapCategory, 'score' | 'evidence' | 'gaps' | 'actions'> {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  const businessName = app.business_name || answers.get('QA-51') || answers.get('M3-A-51');
  const targetState = app.target_state || answers.get('QE-03') || answers.get('M3-E-03');
  const opStatus = app.operational_status;
  const category = app.business_category;

  if (businessName) {
    score += 25;
    evidence.push(`Business name: ${businessName}`);
  } else {
    gaps.push('Business name not set');
    actions.push('Add the legal business name to your case file');
  }

  if (targetState) {
    score += 25;
    evidence.push(`Target state: ${targetState}`);
  } else {
    gaps.push('Target state or business location not specified');
    actions.push('Specify where the business will operate — address is a required element');
  }

  if (opStatus && opStatus !== 'not_yet_formed') {
    score += 30;
    evidence.push(`Operational status: ${opStatus === 'operational' ? 'Already operational' : 'Pre-start'}`);
    if (opStatus === 'operational') {
      score += 10;
      evidence.push('Business is already operational — strong evidence of real investment');
    }
  } else {
    gaps.push('Business not yet formed or status unknown');
    actions.push('Document whether the business entity has been formed (LLC, Corp, etc.) and its current status');
  }

  if (category) {
    score += 10;
    evidence.push(`Business type: ${category}`);
  }

  return { score: Math.min(100, score), evidence, gaps, actions };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export function scoreCase(
  application: ApplicationRow,
  answers: AnswerRow[],
  documents: DocumentRow[],
  caseBrief?: CaseBriefRow
): GapAnalysisResult {
  const am = amap(answers);

  const categories: GapCategory[] = [
    {
      id: 'source_of_funds',
      name: 'Source of Funds',
      weight: 25,
      ...scoreSourceOfFunds(am, documents),
      weightedScore: 0,
      priority: 'critical',
    },
    {
      id: 'management_role',
      name: 'Management Role',
      weight: 25,
      ...scoreManagementRole(am, documents, application),
      weightedScore: 0,
      priority: 'critical',
    },
    {
      id: 'business_plan',
      name: 'Business Plan & Viability',
      weight: 20,
      ...scoreBusinessPlan(am, documents),
      weightedScore: 0,
      priority: 'critical',
    },
    {
      id: 'investment_amount',
      name: 'Investment Amount',
      weight: 15,
      ...scoreInvestmentAmount(am, application, caseBrief),
      weightedScore: 0,
      priority: 'critical',
    },
    {
      id: 'employment_creation',
      name: 'Employment Creation',
      weight: 10,
      ...scoreEmploymentCreation(am),
      weightedScore: 0,
      priority: 'critical',
    },
    {
      id: 'business_operations',
      name: 'Business Operations',
      weight: 5,
      ...scoreBusinessOperations(am, application),
      weightedScore: 0,
      priority: 'critical',
    },
  ];

  // Compute weighted scores and priority
  let overallScore = 0;
  for (const cat of categories) {
    cat.weightedScore = Math.round((cat.score * cat.weight) / 100);
    cat.priority = priority(cat.score);
    overallScore += cat.weightedScore;
  }

  // Top priorities: critical and needs_work categories, sorted by weight desc
  const topPriorities = categories
    .filter(c => c.priority === 'critical' || c.priority === 'needs_work')
    .sort((a, b) => b.weight - a.weight)
    .flatMap(c => c.actions.slice(0, 1));

  const readiness: GapAnalysisResult['readiness'] =
    overallScore >= 70 ? 'strong' : overallScore >= 45 ? 'moderate' : 'needs_work';

  return { overallScore, readiness, categories, topPriorities: topPriorities.slice(0, 4) };
}
