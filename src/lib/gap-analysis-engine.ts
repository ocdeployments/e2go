// E-2 Gap Analysis Engine — v2
// Scores against 6 evidence categories AND 15 denial risk factors (D-01 to D-15)
// from docs/module3_denial_audit.md (sources: Pandev Law, Alaz Law, FAM 9 FAM 402.9,
// ex-consular officer accounts, real Toronto interview data).
//
// Pure function — no API calls, no async. Pass raw DB rows in, get scored result out.

// =============================================================================
// TYPES
// =============================================================================

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
  dCodes: string[];
}

export interface DenialRiskFactor {
  code: string;
  name: string;
  frequency: string;
  risk: 'low' | 'moderate' | 'high';
  finding: string;
  mitigation: string | null;
  categoryId: string;
}

export interface GapAnalysisResult {
  overallScore: number;
  readiness: 'strong' | 'moderate' | 'needs_work';
  categories: GapCategory[];
  denialFactors: DenialRiskFactor[];
  highRiskCount: number;
  moderateRiskCount: number;
  topPriorities: string[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

interface ApplicationRow {
  business_name?: string | null;
  business_category?: string | null;
  operational_status?: string | null;
  target_state?: string | null;
  principal_name?: string | null;
  simulator_sessions_used?: number | null;
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

export interface SimulatorData {
  sessionsUsed: number;
  latestInconsistencyCount: number;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function buildAnswerMap(answers: AnswerRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of answers) {
    if (a.answer_value) m.set(a.question_key, a.answer_value);
  }
  return m;
}

function parseAmount(v: string | undefined | null): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
}

function hasDoc(docs: DocumentRow[], ...types: string[]): boolean {
  return docs.some(d => {
    const t = (d.detected_document_type || d.user_selected_document_type || '').toLowerCase();
    return types.some(target => t.includes(target.toLowerCase()));
  });
}

function hasAnswer(am: Map<string, string>, ...keys: string[]): boolean {
  return keys.some(k => {
    const v = am.get(k);
    return v && v.trim().length > 3;
  });
}

function getAnswer(am: Map<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = am.get(k);
    if (v && v.trim().length > 0) return v.trim();
  }
  return null;
}

function categoryPriority(score: number): GapCategory['priority'] {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'good';
  if (score >= 25) return 'needs_work';
  return 'critical';
}

// Marginal-by-design business types — inherently limited to supporting investor only
const MARGINAL_BY_DESIGN = [
  'lawn', 'cleaning', 'house cleaning', 'solo consultant', 'personal training',
  'pet grooming', 'hair salon', 'nail salon', 'single operator',
];

// =============================================================================
// D-CODE SCORING — all 15 denial risk factors
// =============================================================================

function scoreDenialFactors(
  am: Map<string, string>,
  docs: DocumentRow[],
  app: ApplicationRow,
  brief?: CaseBriefRow,
  simulator?: SimulatorData
): DenialRiskFactor[] {
  const investmentAmount = parseAmount(getAnswer(am, 'QF-02', 'M3-F-02'));
  const totalCost = parseAmount(getAnswer(am, 'QF-03', 'M3-F-03'));
  const revenueY3 = parseAmount(getAnswer(am, 'QI-06', 'M3-I-06'));
  const householdIncome = parseAmount(getAnswer(am, 'QI-07', 'M3-I-07', 'QI-NEW-03', 'M3-I-NEW-03'));
  const employeeY1 = parseInt(getAnswer(am, 'QI-03', 'M3-I-03') || '0') || 0;
  const role = getAnswer(am, 'QA-08', 'M3-A-08') || '';
  const category = (app.business_category || '').toLowerCase();
  const opStatus = app.operational_status || '';

  const factors: DenialRiskFactor[] = [];

  // D-01 — Investment not substantial for this business type
  // Source: QF-02 (investment) / QF-03 (total cost). Proportionality = investment / total cost.
  // FAM requires substantiality — there's no fixed dollar threshold; it's relative to the enterprise cost.
  {
    let risk: DenialRiskFactor['risk'] = 'moderate';
    let finding: string;
    let mitigation: string | null = null;

    if (brief?.substantiality_score != null) {
      if (brief.substantiality_score >= 0.7) {
        risk = 'low';
        finding = `Analysis engine scores substantiality at ${Math.round(brief.substantiality_score * 100)}% — within acceptable range.`;
      } else if (brief.substantiality_score >= 0.45) {
        risk = 'moderate';
        finding = `Substantiality score is ${Math.round(brief.substantiality_score * 100)}% — borderline. Officer may probe during interview.`;
        mitigation = 'Prepare a written proportionality argument in the cover letter explaining why this amount is substantial relative to the total enterprise cost.';
      } else {
        risk = 'high';
        finding = `Substantiality score is ${Math.round(brief.substantiality_score * 100)}% — below threshold. High denial risk.`;
        mitigation = 'Consult an E-2 attorney to assess whether additional investment can be added before filing.';
      }
    } else if (investmentAmount > 0 && totalCost > 0) {
      const ratio = investmentAmount / totalCost;
      if (ratio >= 0.75) {
        risk = 'low';
        finding = `Investment ($${investmentAmount.toLocaleString()}) is ${Math.round(ratio * 100)}% of total enterprise cost ($${totalCost.toLocaleString()}).`;
      } else if (ratio >= 0.5) {
        risk = 'moderate';
        finding = `Investment ($${investmentAmount.toLocaleString()}) is ${Math.round(ratio * 100)}% of total cost ($${totalCost.toLocaleString()}). Officer may question proportionality.`;
        mitigation = 'Document why remaining capital is structured separately. Add proportionality section to cover letter.';
      } else {
        risk = 'high';
        finding = `Investment ($${investmentAmount.toLocaleString()}) is only ${Math.round(ratio * 100)}% of total cost ($${totalCost.toLocaleString()}) — substantiality likely challenged.`;
        mitigation = 'Review investment structure with an attorney. Document all committed amounts including contingency funds.';
      }
    } else if (investmentAmount > 0) {
      risk = 'moderate';
      finding = `Investment amount documented ($${investmentAmount.toLocaleString()}) but total enterprise cost not filed — proportionality cannot be verified.`;
      mitigation = 'Add total cost of the enterprise (QF-03) to your case file so proportionality can be argued.';
    } else {
      risk = 'high';
      finding = 'Investment amount not documented — substantiality cannot be assessed.';
      mitigation = 'Document your total investment amount and the total cost of the enterprise.';
    }

    factors.push({ code: 'D-01', name: 'Investment not substantial for this business type', frequency: 'Most common', risk, finding, mitigation, categoryId: 'investment_amount' });
  }

  // D-02 — Funds idle (not at risk / not spent)
  {
    const spent = getAnswer(am, 'QF-NEW-01', 'M3-F-NEW-01');
    const spentAmount = parseAmount(spent);
    // M3-F-NEW-01 is a select field: 'yes' = deployed, 'partial' = partially deployed, 'no' = not yet spent
    const spentConfirmed = spent && (
      spent.toLowerCase() === 'yes' ||
      spent.toLowerCase().includes('deploy') ||
      spent.toLowerCase().includes('spent') ||
      spent.toLowerCase().includes('active')
    );
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (spentConfirmed || (spent && spentAmount >= investmentAmount * 0.5 && investmentAmount > 0)) {
      risk = 'low';
      finding = investmentAmount > 0
        ? `$${investmentAmount.toLocaleString()} confirmed deployed on business expenses — funds are demonstrably at risk.`
        : 'Funds confirmed deployed on business expenses — funds are demonstrably at risk.';
    } else if (spentAmount > 0) {
      if (investmentAmount > 0 && spentAmount >= investmentAmount * 0.5) {
        risk = 'low';
        finding = `$${spentAmount.toLocaleString()} deployed on business expenses — funds are demonstrably at risk.`;
      } else {
        risk = 'moderate';
        finding = `$${spentAmount.toLocaleString()} spent so far. Funds not yet fully deployed may be questioned.`;
        mitigation = 'Document all committed (but not yet spent) amounts — signed leases, purchase orders, franchise agreements, etc.';
      }
    } else if (hasAnswer(am, 'QF-10', 'M3-F-10')) {
      // Check if "at risk" is confirmed even without QF-NEW-01
      risk = 'moderate';
      finding = 'Funds commitment documented but specific deployment amount not on file.';
      mitigation = 'Add itemised list of what has been spent vs. committed (QF-NEW-01).';
    } else {
      risk = 'high';
      finding = 'No evidence that funds have been spent or irrevocably committed — funds sitting in a business account are NOT "at risk."';
      mitigation = 'Document every dollar spent or committed: franchise fee receipts, lease deposits, equipment orders, attorney invoices.';
    }

    factors.push({ code: 'D-02', name: 'Funds idle — not actually at risk / not spent', frequency: 'Very common', risk, finding, mitigation, categoryId: 'source_of_funds' });
  }

  // D-03 — Paper trail gaps
  {
    const paperTrail = getAnswer(am, 'QH-NEW-01', 'M3-H-NEW-01');
    const hasBankDocs = hasDoc(docs, 'bank', 'statement');
    const hasTransferDocs = hasDoc(docs, 'wire', 'transfer');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    // M3-H-NEW-01 is a select: 'yes' = complete trail, 'partial' = some gaps, 'no' = need to compile
    const hasCompletePaperTrail = paperTrail && (
      paperTrail.toLowerCase() === 'yes' ||
      paperTrail.toLowerCase().includes('complete') ||
      paperTrail.toLowerCase().includes('full trail') ||
      paperTrail.toLowerCase().includes('fully traceable')
    );
    const mentionsGaps = paperTrail && !hasCompletePaperTrail && (
      paperTrail.toLowerCase() === 'no' ||
      paperTrail.toLowerCase() === 'partial' ||
      paperTrail.toLowerCase().includes('gap') ||
      paperTrail.toLowerCase().includes('cash') ||
      paperTrail.toLowerCase().includes('crypto') ||
      paperTrail.toLowerCase().includes('gift') ||
      paperTrail.toLowerCase().includes('need to compile')
    );

    if (mentionsGaps) {
      risk = 'high';
      finding = `Paper trail gap disclosed: "${paperTrail!.substring(0, 80)}…"`;
      mitigation = 'Work with an attorney to document and explain each gap. Affidavits, gift letters, or additional statements may be required.';
    } else if (hasCompletePaperTrail && hasBankDocs && hasTransferDocs) {
      risk = 'low';
      finding = 'Complete paper trail confirmed — bank statements and transfer records on file.';
    } else if (hasCompletePaperTrail) {
      risk = 'moderate';
      finding = 'Complete paper trail confirmed by applicant. Upload supporting bank statements and wire transfer records to corroborate.';
      mitigation = 'Upload 6–12 months of bank statements and wire transfer confirmations to back up your paper trail declaration.';
    } else if (hasBankDocs && hasTransferDocs) {
      risk = 'low';
      finding = 'Bank statements and transfer documents uploaded — paper trail appears documented.';
    } else if (hasBankDocs) {
      risk = 'moderate';
      finding = 'Bank statements uploaded but no wire transfer or liquidation records on file.';
      mitigation = 'Upload wire transfer records showing funds moving from source accounts to US business account.';
    } else {
      risk = 'high';
      finding = 'No bank statements or transfer documents on file — paper trail cannot be verified.';
      mitigation = 'Upload 6–12 months of bank statements from all source accounts plus wire transfer confirmations.';
    }

    factors.push({ code: 'D-03', name: 'Source of funds cannot be traced — paper trail gaps', frequency: 'Very common', risk, finding, mitigation, categoryId: 'source_of_funds' });
  }

  // D-04 — Business appears marginal (income only for investor)
  {
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (brief?.marginality_score != null) {
      if (brief.marginality_score >= 0.7) {
        risk = 'low';
        finding = `Non-marginality score: ${Math.round(brief.marginality_score * 100)}% — projections support a viable, growing enterprise.`;
      } else if (brief.marginality_score >= 0.4) {
        risk = 'moderate';
        finding = `Marginality score is borderline (${Math.round(brief.marginality_score * 100)}%) — officer may probe whether the business will do more than support the investor.`;
        mitigation = 'Strengthen the non-marginality argument: more US employees, higher Year 3–5 revenue projections, explicit marginality counter-narrative in cover letter.';
      } else {
        risk = 'high';
        finding = `Marginality score is ${Math.round(brief.marginality_score * 100)}% — business may appear to exist only to support the investor.`;
        mitigation = 'The business must clearly do more than provide a livelihood for the investor and family. Add hiring plan, market expansion, and Year 5 revenue projections.';
      }
    } else if (revenueY3 > 0 && householdIncome > 0) {
      const ratio = revenueY3 / householdIncome;
      if (ratio >= 5) {
        risk = 'low';
        finding = `Year 3 revenue ($${revenueY3.toLocaleString()}) is ${ratio.toFixed(1)}x household income — clearly non-marginal.`;
      } else if (ratio >= 2.5) {
        risk = 'moderate';
        finding = `Year 3 revenue ($${revenueY3.toLocaleString()}) is ${ratio.toFixed(1)}x household income — borderline.`;
        mitigation = 'Add stronger Year 3–5 projections and document how the business creates independent economic activity beyond the investor\'s income.';
      } else {
        risk = 'high';
        finding = `Year 3 revenue ($${revenueY3.toLocaleString()}) is only ${ratio.toFixed(1)}x household income need — marginal on its face.`;
        mitigation = 'Re-examine whether projections are realistic. If correct, the business may not qualify. An attorney should review.';
      }
    } else if (employeeY1 >= 3) {
      risk = 'moderate';
      finding = `${employeeY1} US employees projected — reduces marginality concern, but revenue projections are not filed for full assessment.`;
      mitigation = 'Add household income need (QI-NEW-03) and Year 3 revenue projections to enable marginality ratio calculation.';
    } else {
      risk = 'high';
      finding = 'Insufficient projections to assess non-marginality — no Year 3 revenue or household income on file.';
      mitigation = 'Add 5-year financial projections and household income need to your case file.';
    }

    factors.push({ code: 'D-04', name: 'Business appears marginal — income only for investor', frequency: 'Very common', risk, finding, mitigation, categoryId: 'business_plan' });
  }

  // D-05 — Business plan generic, vague, or inconsistent
  {
    const hasPlan = hasDoc(docs, 'business_plan', 'business plan', 'plan');
    const hasBasis = hasAnswer(am, 'QI-NEW-02', 'M3-I-NEW-02');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (hasPlan && hasBasis) {
      risk = 'low';
      finding = 'Business plan document on file with supporting assumptions for projections.';
    } else if (hasPlan) {
      risk = 'moderate';
      finding = 'Business plan uploaded but projection assumptions (QI-NEW-02) not documented.';
      mitigation = 'Add a written explanation of what your revenue projections are based on: comparable businesses, market data, franchise FDD, signed contracts.';
    } else {
      risk = 'high';
      finding = 'No business plan document on file.';
      mitigation = 'A professionally prepared business plan is expected at the E-2 interview. Upload one before filing.';
    }

    factors.push({ code: 'D-05', name: 'Business plan generic, vague, or inconsistent with finances', frequency: 'Common', risk, finding, mitigation, categoryId: 'business_plan' });
  }

  // D-06 — Revenue projections inflated, not data-backed
  {
    const revenueY1 = parseAmount(getAnswer(am, 'QI-05', 'M3-I-05'));
    const hasBasis = hasAnswer(am, 'QI-NEW-02', 'M3-I-NEW-02', 'QK-NEW-01', 'M3-K-NEW-01');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (revenueY1 > 0 && hasBasis) {
      risk = 'low';
      finding = `Year 1 revenue projection ($${revenueY1.toLocaleString()}) with documented assumptions.`;
    } else if (revenueY1 > 0) {
      risk = 'moderate';
      finding = `Revenue projections exist ($${revenueY1.toLocaleString()} Y1) but the basis is not documented — officer may dismiss them as unsupported.`;
      mitigation = 'Document what the projections are based on. For franchises: cite FDD Item 19. For independent businesses: cite local market data, comparable businesses, or signed client contracts.';
    } else {
      risk = 'high';
      finding = 'No revenue projections on file.';
      mitigation = 'Add Year 1–5 revenue projections with written assumptions explaining the basis for each number.';
    }

    factors.push({ code: 'D-06', name: 'Revenue projections inflated, not data-backed', frequency: 'Common', risk, finding, mitigation, categoryId: 'business_plan' });
  }

  // D-07 — No credible hiring plan
  {
    const hiringPlan = getAnswer(am, 'QI-NEW-01', 'M3-I-NEW-01');
    const roleList = getAnswer(am, 'QI-04', 'M3-I-04');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (employeeY1 >= 2 && (hiringPlan || roleList)) {
      risk = 'low';
      finding = `${employeeY1} US employees projected with documented hiring plan or role descriptions.`;
    } else if (employeeY1 >= 1 && (hiringPlan || roleList)) {
      risk = 'moderate';
      finding = `1 US employee with a hiring plan. Borderline — officers expect to see growth.`;
      mitigation = 'Add Year 2–3 hiring projections showing the business grows beyond 1 employee.';
    } else if (employeeY1 >= 1) {
      risk = 'moderate';
      finding = `${employeeY1} employee(s) projected but no structured hiring plan or job descriptions on file.`;
      mitigation = 'Add specific job titles, wages, start dates, and full-time vs. part-time status for each planned position.';
    } else {
      risk = 'high';
      finding = 'No US employee hiring projected — officer will likely question non-marginality.';
      mitigation = 'E-2 does not require a specific employee count, but demonstrating meaningful US job creation is strongly advised. Add a realistic hiring plan.';
    }

    factors.push({ code: 'D-07', name: 'No credible hiring plan', frequency: 'Common', risk, finding, mitigation, categoryId: 'employment_creation' });
  }

  // D-08 — Applicant cannot answer questions about own business at interview
  {
    const sessionsUsed = simulator?.sessionsUsed ?? (app.simulator_sessions_used ?? 0);
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (sessionsUsed >= 3) {
      risk = 'low';
      finding = `${sessionsUsed} simulator sessions completed — interview preparation is strong.`;
    } else if (sessionsUsed >= 1) {
      risk = 'moderate';
      finding = `${sessionsUsed} simulator session${sessionsUsed > 1 ? 's' : ''} completed. Recommend at least 3 full-length practice sessions before the real interview.`;
      mitigation = 'Complete at least 2 more simulator sessions. Focus on the investment, source of funds, and management role questions.';
    } else {
      risk = 'high';
      finding = 'No simulator sessions completed. This is the single most controllable denial risk — officers routinely deny applicants who cannot fluently answer basic questions about their own investment.';
      mitigation = 'Complete at least 3 full interview simulator sessions before your appointment. Practice until answers are fluent, not memorised.';
    }

    factors.push({ code: 'D-08', name: 'Applicant cannot answer questions about own business at interview', frequency: 'Significant', risk, finding, mitigation, categoryId: 'management_role' });
  }

  // D-09 — Interview answers inconsistent with submitted documents
  {
    const inconsistencyCount = simulator?.latestInconsistencyCount ?? 0;
    const sessionsUsed = simulator?.sessionsUsed ?? (app.simulator_sessions_used ?? 0);
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (sessionsUsed === 0) {
      risk = 'moderate';
      finding = 'No simulator sessions to check consistency between spoken answers and filed documents.';
      mitigation = 'Run the interview simulator — it flags when your verbal answers conflict with your case file numbers.';
    } else if (inconsistencyCount === 0) {
      risk = 'low';
      finding = 'No inconsistencies detected between simulator answers and filed case file.';
    } else if (inconsistencyCount <= 2) {
      risk = 'moderate';
      finding = `${inconsistencyCount} inconsistency flag${inconsistencyCount > 1 ? 's' : ''} in the simulator. These must be resolved before the real interview.`;
      mitigation = 'Review your coaching report for each inconsistency. Update either your case file or memorise the correct figures.';
    } else {
      risk = 'high';
      finding = `${inconsistencyCount} inconsistencies detected — your spoken answers frequently diverge from your filed documents.`;
      mitigation = 'Officers compare verbal answers to your submitted documents in real time. Audit each flagged inconsistency and resolve before filing.';
    }

    factors.push({ code: 'D-09', name: 'Interview answers inconsistent with submitted documents', frequency: 'Significant', risk, finding, mitigation, categoryId: 'management_role' });
  }

  // D-10 — Shell company / no real operations yet
  {
    const hasLicense = hasAnswer(am, 'QG-NEW-01', 'M3-G-NEW-01');
    const hasBankAccount = hasAnswer(am, 'QG-BANK', 'M3-G-BANK');
    const hasLeaseDocs = hasDoc(docs, 'lease', 'commercial');
    // Derive effective operational status: app.operational_status if set, otherwise infer from M3-G-08 answer
    const opsAnswer = (getAnswer(am, 'QG-08', 'M3-G-08') || '').toLowerCase();
    const effectiveOpStatus = opStatus ||
      (opsAnswer.includes('operational') && !opsAnswer.includes('not yet') && !opsAnswer.includes('pre') ? 'operational' : '') ||
      (opsAnswer.includes('pre') || opsAnswer.includes('not yet') || opsAnswer.includes('pre-start') ? 'pre_start' : '');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (effectiveOpStatus === 'operational') {
      risk = 'low';
      finding = 'Business is operational — real operations already exist.';
    } else if ((hasLicense || hasBankAccount) && (hasLeaseDocs || effectiveOpStatus === 'pre_start')) {
      risk = 'moderate';
      finding = 'Business is pre-start with operational evidence on file (license, bank account, or registration).';
      mitigation = 'Add any additional operational evidence: signed lease, business registration, supplier agreements, permits.';
    } else if (effectiveOpStatus === 'pre_start') {
      risk = 'moderate';
      finding = 'Pre-start status declared but no license, bank account, or lease documents on file.';
      mitigation = 'Upload business registration, EIN confirmation, lease agreement, or other evidence the business is real.';
    } else {
      risk = 'high';
      finding = 'No operational evidence — entity formed status and no supporting documents. Officer may view this as a shell company.';
      mitigation = 'Establish a real business presence: sign a lease, open a US business bank account, obtain business licenses. Document all of these.';
    }

    factors.push({ code: 'D-10', name: 'Shell company / no real operations yet', frequency: 'Common', risk, finding, mitigation, categoryId: 'business_operations' });
  }

  // D-11 — Passive investment / no active management
  {
    const mgmtActivities = getAnswer(am, 'QA-09', 'M3-A-09');
    const hasSpecificRole = role.length > 10 && !['owner', 'investor', 'principal'].includes(role.toLowerCase().trim());
    const hasBio = hasDoc(docs, 'resume', 'cv', 'biograph', 'curriculum');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (hasSpecificRole && mgmtActivities && hasBio) {
      risk = 'low';
      finding = `Role documented ("${role.substring(0, 60)}") with management activities and biography on file.`;
    } else if (hasSpecificRole && (mgmtActivities || hasBio)) {
      risk = 'moderate';
      finding = `Role documented but management activities or biography partially filed.`;
      mitigation = 'Strengthen the management role section: list 5+ specific day-to-day activities and upload an investor biography.';
    } else if (role && role.trim().length > 0) {
      risk = 'high';
      finding = `Role listed as "${role.substring(0, 40)}" but no specific management activities or biography on file.`;
      mitigation = 'Active management is a hard E-2 requirement. Document what you do daily: staff oversight, client meetings, financial decisions, vendor management.';
    } else {
      risk = 'high';
      finding = 'Investor management role not documented at all.';
      mitigation = 'E-2 categorically denies passive investors. Define your specific management role and daily activities in your case file.';
    }

    factors.push({ code: 'D-11', name: 'Passive investment / no active management', frequency: 'Hard denial', risk, finding, mitigation, categoryId: 'management_role' });
  }

  // D-12 — Loan secured by business assets only
  {
    const loanSecurity = getAnswer(am, 'QF-NEW-02', 'M3-F-NEW-02');
    const sourceType = getAnswer(am, 'QF-03', 'M3-F-03', 'QF-source', 'M3-F-source');
    const hasLoan = sourceType?.toLowerCase().includes('loan') || loanSecurity !== null;
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (!hasLoan) {
      risk = 'low';
      finding = 'No business-asset-secured loan indicated in source of funds.';
    } else if (loanSecurity) {
      const securedByBusiness = loanSecurity.toLowerCase().includes('business') ||
        loanSecurity.toLowerCase().includes('equipment') ||
        loanSecurity.toLowerCase().includes('asset');
      const securedPersonally = loanSecurity.toLowerCase().includes('personal') ||
        loanSecurity.toLowerCase().includes('property') ||
        loanSecurity.toLowerCase().includes('home') ||
        loanSecurity.toLowerCase().includes('rrsp');
      if (securedPersonally && !securedByBusiness) {
        risk = 'low';
        finding = `Loan is secured by personal assets — compliant with E-2 requirements.`;
      } else if (securedByBusiness) {
        risk = 'high';
        finding = `Loan appears to be secured by business assets — this is a hard E-2 denial ground. Funds are not truly "at risk" if the business guarantees the loan.`;
        mitigation = 'Consult an E-2 attorney immediately. The loan must be collateralised by personal assets (home, RRSP, personal savings), not the US business assets.';
      } else {
        risk = 'moderate';
        finding = 'Loan security type documented but not clearly personal vs. business — needs clarification.';
        mitigation = 'Confirm in writing that the loan is secured by personal, not business, assets. Add documentation to the case file.';
      }
    } else {
      risk = 'moderate';
      finding = 'Loan involved in source of funds but security type not documented.';
      mitigation = 'Document what the loan is secured by. If secured by business assets, this must be restructured before filing.';
    }

    factors.push({ code: 'D-12', name: 'Loan secured by business assets only', frequency: 'Hard denial', risk, finding, mitigation, categoryId: 'source_of_funds' });
  }

  // D-13 — Ownership / control structure not properly documented
  {
    const hasMIL = hasAnswer(am, 'QE-NEW-01', 'M3-E-NEW-01');
    const hasOpAgreement = hasAnswer(am, 'QE-NEW-02', 'M3-E-NEW-02');
    const hasEntityDocs = hasDoc(docs, 'article', 'formation', 'organization', 'operating agreement', 'incorporation');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if ((hasMIL || hasEntityDocs) && (hasOpAgreement || hasEntityDocs)) {
      risk = 'low';
      finding = 'Ownership structure documented — Membership Interest Ledger or Operating Agreement on file.';
    } else if (hasMIL || hasOpAgreement || hasEntityDocs) {
      risk = 'moderate';
      finding = 'Partial ownership documentation — some but not all structure documents are on file.';
      mitigation = 'File: Membership Interest Ledger (showing % ownership), Operating Agreement (showing control rights), Articles of Formation/Incorporation.';
    } else {
      risk = 'high';
      finding = 'No ownership or control structure documents on file — officer cannot verify the applicant controls the enterprise.';
      mitigation = 'Upload Articles of Incorporation/Formation, Operating Agreement, and a Membership Interest Certificate showing 50%+ ownership or control rights.';
    }

    factors.push({ code: 'D-13', name: 'Ownership / control structure not properly documented', frequency: 'Common', risk, finding, mitigation, categoryId: 'business_operations' });
  }

  // D-14 — Business type does not qualify (marginal by design)
  {
    const isMarginalType = MARGINAL_BY_DESIGN.some(t => category.includes(t));
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    if (isMarginalType) {
      risk = 'high';
      finding = `"${app.business_category || category}" category carries an inherent marginality risk — these businesses typically cannot scale beyond supporting the investor.`;
      mitigation = 'Build a detailed non-marginality argument: franchise system support, US employee growth, expansion plans. An attorney should review the viability of this category for E-2.';
    } else if (brief?.marginality_score != null && brief.marginality_score < 0.4) {
      risk = 'high';
      finding = 'Analysis engine indicates the business type may not generate sufficient economic activity beyond the investor household.';
      mitigation = 'Review marginal business risk with an E-2 attorney. Strengthen the non-marginality argument with hiring plans and revenue projections.';
    } else if (!app.business_category) {
      risk = 'moderate';
      finding = 'Business category not specified — marginality risk by design cannot be assessed.';
      mitigation = 'Set your business category in your case file.';
    } else {
      risk = 'low';
      finding = `Business type ("${app.business_category}") does not show inherent marginality patterns.`;
    }

    factors.push({ code: 'D-14', name: 'Business type does not qualify (marginal by design)', frequency: 'Common', risk, finding, mitigation, categoryId: 'business_plan' });
  }

  // D-15 — 214(b) — officer not convinced applicant will return to Canada
  {
    const canadianTies = getAnswer(am, 'QD-05', 'M3-D-05', 'QD-05-REVISED', 'M3-D-05-REVISED');
    const priorDenial = getAnswer(am, 'QA-23', 'M3-A-23');
    const hasPriorDenial = priorDenial?.toLowerCase().includes('yes');
    let risk: DenialRiskFactor['risk'];
    let finding: string;
    let mitigation: string | null = null;

    const tiesKeywords = ['real estate', 'property', 'pension', 'retirement', 'family', 'spouse', 'children', 'business', 'rrsp'];
    const tiesCount = canadianTies
      ? tiesKeywords.filter(kw => canadianTies.toLowerCase().includes(kw)).length
      : 0;

    if (tiesCount >= 3 && !hasPriorDenial) {
      risk = 'low';
      finding = `Multiple Canadian ties documented (${tiesCount} categories): ${canadianTies!.substring(0, 80)}.`;
    } else if (tiesCount >= 1) {
      risk = hasPriorDenial ? 'high' : 'moderate';
      finding = hasPriorDenial
        ? `Prior visa denial + limited documented Canadian ties — 214(b) intent is a heightened risk.`
        : `Some Canadian ties documented but coverage could be stronger.`;
      mitigation = 'Document ALL Canadian ties: real estate you own, RRSP/pension accounts, immediate family members remaining in Canada, Canadian business interests retained.';
    } else if (canadianTies) {
      risk = 'moderate';
      finding = 'Canadian ties answer on file but no specific, verifiable ties documented.';
      mitigation = 'Replace vague ties statements with specific, verifiable items: property address, pension account type, family members\' names and relationship.';
    } else {
      risk = hasPriorDenial ? 'high' : 'moderate';
      finding = hasPriorDenial
        ? 'Prior visa denial + no documented Canadian ties — high 214(b) risk.'
        : 'No Canadian ties documented. Officer will assess immigrant intent without any supporting evidence.';
      mitigation = 'Document specific Canadian ties in the cover letter. If ties are weak, discuss this with an attorney before the interview — officers probe this heavily.';
    }

    factors.push({ code: 'D-15', name: '214(b) — officer not convinced applicant will return to Canada', frequency: 'Moderate', risk, finding, mitigation, categoryId: 'business_plan' });
  }

  return factors;
}

// =============================================================================
// CATEGORY SCORING
// =============================================================================

function scoreCategory(
  id: string,
  name: string,
  weight: number,
  dCodes: string[],
  factors: DenialRiskFactor[],
  am: Map<string, string>,
  docs: DocumentRow[],
  app: ApplicationRow,
  brief?: CaseBriefRow
): GapCategory {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 0;

  // Base score derived from relevant D-codes
  const relevant = factors.filter(f => f.categoryId === id);
  if (relevant.length > 0) {
    const dScore = relevant.reduce((sum, f) => {
      return sum + (f.risk === 'low' ? 100 : f.risk === 'moderate' ? 50 : 10);
    }, 0) / relevant.length;
    score = Math.round(dScore);
  }

  // Category-specific evidence and gap text
  switch (id) {
    case 'source_of_funds': {
      const amount = parseAmount(getAnswer(am, 'QF-02', 'M3-F-02'));
      const totalCost = parseAmount(getAnswer(am, 'QF-03', 'M3-F-03'));
      const sourceType = getAnswer(am, 'QF-03', 'M3-F-03', 'QF-source');
      const hasBankDocs = hasDoc(docs, 'bank', 'statement');
      const hasTransferDocs = hasDoc(docs, 'wire', 'transfer');
      const spent = parseAmount(getAnswer(am, 'QF-NEW-01', 'M3-F-NEW-01'));

      if (amount > 0) evidence.push(`Investment: $${amount.toLocaleString()}`);
      else gaps.push('Investment amount not documented');

      if (totalCost > 0) evidence.push(`Total enterprise cost: $${totalCost.toLocaleString()}`);
      else gaps.push('Total enterprise cost (QF-03) not filed — proportionality cannot be argued');

      if (spent > 0) evidence.push(`$${spent.toLocaleString()} deployed on business expenses`);
      else gaps.push('No record of how much has been spent or committed');

      if (hasBankDocs) evidence.push('Bank statements uploaded');
      else { gaps.push('No bank statements on file'); actions.push('Upload 6–12 months of bank statements from all source accounts'); }

      if (hasTransferDocs) evidence.push('Wire transfer / liquidation records uploaded');
      else { gaps.push('No wire transfer records'); actions.push('Upload wire transfer confirmations showing funds moved to US'); }

      if (sourceType) evidence.push(`Source type noted: ${sourceType.substring(0, 60)}`);

      if (!hasBankDocs) score = Math.max(score - 15, 0);
      if (amount === 0) score = Math.max(score - 20, 0);
      break;
    }

    case 'management_role': {
      const role = getAnswer(am, 'QA-08', 'M3-A-08') || '';
      const mgmt = getAnswer(am, 'QA-09', 'M3-A-09');
      const hasBio = hasDoc(docs, 'resume', 'cv', 'biograph', 'curriculum');
      const sessionsUsed = (app.simulator_sessions_used ?? 0);

      if (role && role.length > 5) evidence.push(`Role: ${role.substring(0, 80)}`);
      else gaps.push('Investor role not defined');

      if (mgmt && mgmt.length > 20) evidence.push('Specific management activities documented');
      else { gaps.push('Management activities not detailed'); actions.push('List 5+ day-to-day management activities'); }

      if (hasBio) evidence.push('Investor biography / résumé on file');
      else { gaps.push('No biography or résumé uploaded'); actions.push('Upload résumé and investor biography'); }

      if (sessionsUsed >= 3) evidence.push(`${sessionsUsed} simulator sessions completed`);
      else if (sessionsUsed >= 1) { gaps.push(`Only ${sessionsUsed} simulator session — practice more`); }
      else { gaps.push('No simulator sessions — interview readiness unverified'); actions.push('Complete at least 3 interview simulator sessions'); }
      break;
    }

    case 'business_plan': {
      const hasPlan = hasDoc(docs, 'business_plan', 'plan');
      const revY1 = parseAmount(getAnswer(am, 'QI-05', 'M3-I-05'));
      const revY3 = parseAmount(getAnswer(am, 'QI-06', 'M3-I-06'));
      const hasBasis = hasAnswer(am, 'QI-NEW-02', 'M3-I-NEW-02');

      if (hasPlan) evidence.push('Business plan document uploaded');
      else { gaps.push('No business plan document'); actions.push('Upload a comprehensive business plan'); }

      if (revY1 > 0) evidence.push(`Year 1 revenue: $${revY1.toLocaleString()}`);
      else { gaps.push('No Year 1 revenue projection'); actions.push('Add 5-year financial projections'); }

      if (revY3 > 0) evidence.push(`Year 3 revenue: $${revY3.toLocaleString()}`);
      else gaps.push('No Year 3 revenue projection');

      if (hasBasis) evidence.push('Projection assumptions documented');
      else { gaps.push('Revenue projections not backed by assumptions'); actions.push('Document what each projection number is based on'); }
      break;
    }

    case 'investment_amount': {
      const amount = parseAmount(getAnswer(am, 'QF-02', 'M3-F-02'));
      const totalCost = parseAmount(getAnswer(am, 'QF-03', 'M3-F-03'));

      if (amount > 0) evidence.push(`Investment: $${amount.toLocaleString()}`);
      else { gaps.push('Investment amount not documented'); actions.push('File investment amount in case file'); }

      if (totalCost > 0) {
        const ratio = totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0;
        evidence.push(`Total enterprise cost: $${totalCost.toLocaleString()} (${ratio}% invested)`);
      } else gaps.push('Total enterprise cost not documented');

      if (brief?.substantiality_score != null) {
        evidence.push(`Substantiality score: ${Math.round(brief.substantiality_score * 100)}%`);
        if (brief.substantiality_score < 0.5) {
          gaps.push('Substantiality score is below acceptable range');
          actions.push('Prepare proportionality argument in cover letter');
        }
      }
      break;
    }

    case 'employment_creation': {
      const countY1 = parseInt(getAnswer(am, 'QI-03', 'M3-I-03') || '0') || 0;
      const countCurrent = parseInt(getAnswer(am, 'QI-02', 'M3-I-02') || '0') || 0;
      const roleList = getAnswer(am, 'QI-04', 'M3-I-04');
      const hiringPlan = getAnswer(am, 'QI-NEW-01', 'M3-I-NEW-01');

      if (countCurrent > 0) evidence.push(`${countCurrent} current US employee${countCurrent > 1 ? 's' : ''}`);
      if (countY1 > 0) evidence.push(`${countY1} US employee${countY1 > 1 ? 's' : ''} projected Year 1`);
      else { gaps.push('No US job creation projected'); actions.push('Add hiring projections'); }

      if (roleList && roleList.length > 10) evidence.push('Job roles documented');
      else { gaps.push('No job descriptions on file'); actions.push('List specific job titles, hours, and wages for each planned hire'); }

      if (hiringPlan && hiringPlan.length > 20) evidence.push('Structured hiring timeline documented');
      else gaps.push('No structured hiring timeline');
      break;
    }

    case 'business_operations': {
      const bName = app.business_name || getAnswer(am, 'QA-51', 'M3-A-51');
      const state = app.target_state || getAnswer(am, 'QE-03', 'M3-E-03');
      const hasLicense = hasAnswer(am, 'QG-NEW-01', 'M3-G-NEW-01');
      const hasBank = hasAnswer(am, 'QG-BANK', 'M3-G-BANK');
      const hasMIL = hasAnswer(am, 'QE-NEW-01', 'M3-E-NEW-01');

      if (bName) evidence.push(`Business name: ${bName}`);
      else { gaps.push('Business name not set'); actions.push('Add legal business name'); }

      if (state) evidence.push(`Target state: ${state}`);
      else { gaps.push('Business location not specified'); actions.push('Add business address / target state'); }

      if (app.operational_status === 'operational') evidence.push('Already operational');
      else if (app.operational_status === 'pre_start') evidence.push('Pre-start phase declared');
      else gaps.push('Operational status unknown');

      if (hasLicense) evidence.push('Business license on file');
      else gaps.push('No business license documentation');

      if (hasBank) evidence.push('US business bank account confirmed');
      else gaps.push('No US business bank account documented');

      if (hasMIL) evidence.push('Membership Interest Ledger / ownership docs on file');
      else { gaps.push('No ownership structure documents'); actions.push('Upload Articles of Formation and Operating Agreement'); }
      break;
    }
  }

  // Unique actions from relevant D-codes
  for (const f of relevant) {
    if (f.mitigation && !actions.some(a => a.includes(f.mitigation!.substring(0, 20)))) {
      actions.push(f.mitigation);
    }
  }

  return {
    id,
    name,
    weight,
    score: Math.max(0, Math.min(100, score)),
    weightedScore: 0,
    evidence,
    gaps,
    actions: actions.slice(0, 5),
    priority: categoryPriority(score),
    dCodes,
  };
}

// =============================================================================
// ARCHETYPE WEIGHTS
// Weight profiles per applicant archetype — applied when operational-type
// overrides (franchise / pre-start) are not active.
//
// buyer          — franchise/established business buyer; qualifications proven, FDD drives case
// builder        — tech/professional services; management credentials are the case
// investor       — capital-first background; must prove active daily management role
// career_switcher— no prior business; management viability is the highest question
// =============================================================================

const ARCHETYPE_WEIGHTS: Record<string, Array<{ id: string; weight: number }>> = {
  buyer: [
    { id: 'business_plan',       weight: 30 }, // FDD + market research is the primary document
    { id: 'source_of_funds',     weight: 25 }, // Capital deployment must be traced
    { id: 'management_role',     weight: 20 }, // Owner background helps but active role still required
    { id: 'investment_amount',   weight: 15 }, // Franchise prices are usually substantive
    { id: 'employment_creation', weight:  5 },
    { id: 'business_operations', weight:  5 },
  ],
  builder: [
    { id: 'management_role',     weight: 30 }, // Professional credentials justify the role
    { id: 'business_plan',       weight: 25 }, // Tech/service viability must be argued
    { id: 'source_of_funds',     weight: 20 },
    { id: 'investment_amount',   weight: 10 }, // Tech businesses can be capital-lean
    { id: 'employment_creation', weight: 10 }, // Scaling is expected in this archetype
    { id: 'business_operations', weight:  5 },
  ],
  investor: [
    { id: 'management_role',     weight: 35 }, // Investors default to passive — active role is the hard question
    { id: 'source_of_funds',     weight: 25 }, // Capital is usually strong; paper trail still required
    { id: 'business_plan',       weight: 20 },
    { id: 'investment_amount',   weight: 10 }, // Net worth is usually not the constraint
    { id: 'employment_creation', weight:  5 },
    { id: 'business_operations', weight:  5 },
  ],
  career_switcher: [
    { id: 'management_role',     weight: 30 }, // No prior business — this is the credibility question
    { id: 'source_of_funds',     weight: 25 },
    { id: 'business_plan',       weight: 20 }, // Shows they've researched the business thoroughly
    { id: 'investment_amount',   weight: 15 },
    { id: 'employment_creation', weight:  5 },
    { id: 'business_operations', weight:  5 },
  ],
};

// =============================================================================
// MAIN EXPORT
// =============================================================================

export function scoreCase(
  application: ApplicationRow,
  answers: AnswerRow[],
  documents: DocumentRow[],
  caseBrief?: CaseBriefRow,
  simulator?: SimulatorData,
  archetype?: string | null
): GapAnalysisResult {
  const am = buildAnswerMap(answers);

  // Score all 15 denial factors first
  const denialFactors = scoreDenialFactors(am, documents, application, caseBrief, simulator);

  // Weight selection — priority order:
  // 1. isFranchise  — operational fact; FDD is the primary document regardless of archetype
  // 2. isPreStart   — operational fact; investment commitment is the defining evidence
  // 3. archetype    — applicant background profile, applied when no operational override
  // 4. standard     — default when profile is unknown or sparse
  const isFranchise = (application.business_category || '').toLowerCase().includes('franchise');
  const isPreStart = (application.operational_status || '') === 'pre_start';

  // Base weight set: id → weight (merged onto D-code category defs below)
  const archetypeWeightMap: Map<string, number> = new Map(
    (archetype && !isFranchise && !isPreStart && ARCHETYPE_WEIGHTS[archetype])
      ? ARCHETYPE_WEIGHTS[archetype].map(w => [w.id, w.weight])
      : []
  );

  const categoryDefs: Array<{ id: string; name: string; weight: number; dCodes: string[] }> = isFranchise
    ? [
        // Franchise: FDD (business_plan) is the critical evidence; weights shifted accordingly
        { id: 'business_plan',        name: 'Business Plan & FDD',         weight: 35, dCodes: ['D-04', 'D-05', 'D-06', 'D-14', 'D-15'] },
        { id: 'source_of_funds',      name: 'Source of Funds',             weight: 20, dCodes: ['D-02', 'D-03', 'D-12'] },
        { id: 'management_role',      name: 'Management Role',             weight: 20, dCodes: ['D-08', 'D-09', 'D-11'] },
        { id: 'investment_amount',    name: 'Investment Amount',           weight: 15, dCodes: ['D-01'] },
        { id: 'employment_creation',  name: 'Employment Creation',         weight:  5, dCodes: ['D-07'] },
        { id: 'business_operations',  name: 'Business Operations',         weight:  5, dCodes: ['D-10', 'D-13'] },
      ]
    : isPreStart
    ? [
        // Pre-start: commitment documentation (investment_amount) is the defining evidence
        { id: 'investment_amount',    name: 'Investment Commitment',       weight: 30, dCodes: ['D-01'] },
        { id: 'source_of_funds',      name: 'Source of Funds',             weight: 20, dCodes: ['D-02', 'D-03', 'D-12'] },
        { id: 'business_plan',        name: 'Business Plan & Viability',   weight: 25, dCodes: ['D-04', 'D-05', 'D-06', 'D-14', 'D-15'] },
        { id: 'management_role',      name: 'Management Role',             weight: 15, dCodes: ['D-08', 'D-09', 'D-11'] },
        { id: 'employment_creation',  name: 'Employment Creation',         weight:  5, dCodes: ['D-07'] },
        { id: 'business_operations',  name: 'Business Operations',         weight:  5, dCodes: ['D-10', 'D-13'] },
      ]
    : [
        // Archetype-aware or standard weights
        { id: 'source_of_funds',      name: 'Source of Funds',             weight: archetypeWeightMap.get('source_of_funds')     ?? 25, dCodes: ['D-02', 'D-03', 'D-12'] },
        { id: 'management_role',      name: 'Management Role',             weight: archetypeWeightMap.get('management_role')     ?? 25, dCodes: ['D-08', 'D-09', 'D-11'] },
        { id: 'business_plan',        name: 'Business Plan & Viability',   weight: archetypeWeightMap.get('business_plan')       ?? 20, dCodes: ['D-04', 'D-05', 'D-06', 'D-14', 'D-15'] },
        { id: 'investment_amount',    name: 'Investment Amount',           weight: archetypeWeightMap.get('investment_amount')   ?? 15, dCodes: ['D-01'] },
        { id: 'employment_creation',  name: 'Employment Creation',         weight: archetypeWeightMap.get('employment_creation') ?? 10, dCodes: ['D-07'] },
        { id: 'business_operations',  name: 'Business Operations',         weight: archetypeWeightMap.get('business_operations') ??  5, dCodes: ['D-10', 'D-13'] },
      ];

  const categories = categoryDefs.map(def =>
    scoreCategory(def.id, def.name, def.weight, def.dCodes, denialFactors, am, documents, application, caseBrief)
  );

  // Compute weighted scores
  let overallScore = 0;
  for (const cat of categories) {
    cat.weightedScore = Math.round((cat.score * cat.weight) / 100);
    overallScore += cat.weightedScore;
  }

  const highRiskCount = denialFactors.filter(f => f.risk === 'high').length;
  const moderateRiskCount = denialFactors.filter(f => f.risk === 'moderate').length;

  const topPriorities = denialFactors
    .filter(f => f.risk === 'high' && f.mitigation)
    .map(f => f.mitigation!)
    .slice(0, 4);

  const readiness: GapAnalysisResult['readiness'] =
    highRiskCount >= 4 || overallScore < 35
      ? 'needs_work'
      : highRiskCount >= 2 || overallScore < 60
      ? 'moderate'
      : 'strong';

  return {
    overallScore,
    readiness,
    categories,
    denialFactors,
    highRiskCount,
    moderateRiskCount,
    topPriorities,
  };
}
