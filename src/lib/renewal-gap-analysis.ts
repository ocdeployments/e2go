/**
 * WS7 — Renewal Package upgrade: renewal-specific gap analysis.
 *
 * The spec (§11) calls for a renewal-specific gap analysis ("hit
 * non-marginality? ownership changes?"). Session 119c marked this blocked,
 * but every input it needs is already collected: RQ-02/03 (headcount),
 * RQ-07 (profitability), RQ-08 (ownership changes), RQ-09 (current role),
 * RQ-13 (home-country ties), RQ-15 (immigration issues), plus the
 * promise-vs-delivery variances from renewal-reconciliation.ts.
 *
 * Ground rule (same as renewal-reconciliation.ts): never fabricate. A gap
 * is only flagged when the applicant's own answers show it; missing data
 * is flagged as missing, not guessed at.
 */

import type { RenewalReconciliation } from './renewal-reconciliation';

export type GapSeverity = 'high' | 'medium' | 'low';

export interface RenewalGap {
  id: string;
  severity: GapSeverity;
  title: string;
  finding: string;
  officerConcern: string;
  action: string;
}

export interface RenewalAnswersLike {
  [key: string]: string | undefined;
}

function parseCount(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

const SEVERITY_ORDER: Record<GapSeverity, number> = { high: 0, medium: 1, low: 2 };

/**
 * Flags renewal-specific risks a consular officer or USCIS adjudicator
 * checks on an E-2 renewal: marginality (Matter of Walsh and Pollard),
 * develop-and-direct after ownership changes, unexplained projection
 * shortfalls, immigration history, and (Path A) nonimmigrant intent.
 */
export function computeRenewalGaps(
  answers: RenewalAnswersLike,
  reconciliation: RenewalReconciliation,
  path: string,
): RenewalGap[] {
  const gaps: RenewalGap[] = [];

  // Marginality — the single most common renewal refusal ground.
  const ft = parseCount(answers['RQ-02']);
  const pt = parseCount(answers['RQ-03']);
  const profitability = answers['RQ-07'] ?? '';
  const noEmployees = ft !== null && ft === 0 && (pt === null || pt === 0);
  const notProfitable = ['not-yet', 'loss', 'breakeven'].includes(profitability);
  if (noEmployees && notProfitable) {
    gaps.push({
      id: 'marginality',
      severity: 'high',
      title: 'Marginality risk — no employees and not yet profitable',
      finding: `You reported ${ft} full-time and ${pt ?? 0} part-time U.S. employees, and profitability status "${profitability}".`,
      officerConcern: 'An E-2 enterprise must be more than marginal: it must generate more than a living for the investor, or have present/future capacity to make a significant economic contribution — typically shown through U.S. hiring.',
      action: 'Document concrete hiring plans with dates, contractor spending that supports U.S. jobs, or economic contribution beyond owner income (supplier contracts, local spending). Address marginality head-on in the cover letter rather than leaving the officer to infer.',
    });
  } else if (noEmployees) {
    gaps.push({
      id: 'no-employees',
      severity: 'medium',
      title: 'No U.S. employees reported',
      finding: 'You reported zero full-time and part-time U.S. employees at renewal.',
      officerConcern: 'Employment of U.S. workers is the clearest non-marginality evidence. Its absence shifts the burden to income and economic-contribution evidence.',
      action: 'If you use contractors, quantify that spending. Include forward hiring plans with timelines in the business plan update.',
    });
  }

  // Hiring shortfall vs. the original plan (from reconciliation, real figures).
  if (reconciliation.employees.verdict === 'short' && reconciliation.employees.narrative) {
    gaps.push({
      id: 'hiring-shortfall',
      severity: 'medium',
      title: 'Hiring fell short of the original business plan',
      finding: reconciliation.employees.narrative,
      officerConcern: 'Officers compare the original plan\'s projections against delivery. An unexplained shortfall reads as an unreliable plan.',
      action: 'Explain the variance honestly (market conditions, automation, revised model) and show the current trajectory toward the original commitment.',
    });
  }

  // Revenue shortfalls beyond 25% in any comparable year.
  const revenueShortfalls = reconciliation.revenue.filter(
    (r) => r.variancePct !== null && r.variancePct < -0.25 && r.narrative !== null,
  );
  if (revenueShortfalls.length > 0) {
    gaps.push({
      id: 'revenue-shortfall',
      severity: 'medium',
      title: `Revenue fell more than 25% short of projections in ${revenueShortfalls.length} year${revenueShortfalls.length === 1 ? '' : 's'}`,
      finding: revenueShortfalls.map((r) => r.narrative as string).join(' '),
      officerConcern: 'Large unexplained variances from the original projections undermine the credibility of the forward projections in this renewal.',
      action: 'Address each shortfall year explicitly in the business plan update — cause, corrective action taken, and why the forward projections remain realistic.',
    });
  }

  // Ownership changes — develop-and-direct and 50%-ownership re-verification.
  const ownership = answers['RQ-08'] ?? '';
  if (ownership.startsWith('yes')) {
    gaps.push({
      id: 'ownership-change',
      severity: 'high',
      title: 'Ownership structure changed since the original application',
      finding: answers['RQ-08-detail']
        ? `Reported change: ${answers['RQ-08-detail']}`
        : 'You reported an ownership change but did not describe it in the intake.',
      officerConcern: 'The officer must re-verify that you still hold at least 50% ownership (or operational control) and still develop and direct the enterprise. An undocumented change can sink an otherwise strong renewal.',
      action: 'Include an updated cap table or operating agreement showing current percentages, and explain the change and its rationale in the cover letter.',
    });
  }

  // Immigration issues since grant.
  const immigration = answers['RQ-15'] ?? '';
  if (immigration.startsWith('yes')) {
    gaps.push({
      id: 'immigration-issue',
      severity: 'high',
      title: 'U.S. immigration issue since the original E-2 grant',
      finding: answers['RQ-15-detail']
        ? `Reported issue: ${answers['RQ-15-detail']}`
        : 'You reported an immigration issue but did not describe it in the intake.',
      officerConcern: 'Any status violation, overstay, or adverse action appears in the officer\'s system before you speak. An unaddressed issue looks like concealment.',
      action: 'Disclose the issue proactively in the cover letter with documentation of how it was resolved. Consider attorney review before filing.',
    });
  }

  // Develop-and-direct evidence — current role description.
  const role = (answers['RQ-09'] ?? '').trim();
  if (role.length < 40) {
    gaps.push({
      id: 'thin-role',
      severity: 'medium',
      title: 'Current role description is missing or thin',
      finding: role.length === 0
        ? 'No description of your current day-to-day role was provided.'
        : `The role description provided is very brief (${role.length} characters).`,
      officerConcern: 'Renewals fail the develop-and-direct element when the investor cannot articulate their active management role in the enterprise today.',
      action: 'Describe specific ongoing management activities: hiring decisions, vendor relationships, financial oversight, strategy. Avoid "same as before."',
    });
  }

  // Nonimmigrant intent — consular path only (USCIS extensions don't re-test ties the same way).
  if (path !== 'uscis') {
    const ties = (answers['RQ-13'] ?? '').trim();
    if (ties.length < 40) {
      gaps.push({
        id: 'thin-ties',
        severity: 'medium',
        title: 'Home-country ties are missing or thin',
        finding: ties.length === 0
          ? 'No description of current Canadian ties was provided.'
          : `The ties description provided is very brief (${ties.length} characters).`,
        officerConcern: 'A consular renewal re-tests nonimmigrant intent. After years in the U.S., the officer expects concrete evidence of retained ties.',
        action: 'List specifics: property owned, active bank accounts, family members, professional memberships, tax filings in Canada.',
      });
    }
  }

  gaps.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return gaps;
}

/** Formats the gaps as the plain-text document shown in the renewal package. */
export function buildGapAnalysisDocument(gaps: RenewalGap[]): string {
  const header = 'RENEWAL GAP ANALYSIS\nE-2 Visa Renewal — Risk Assessment Before Filing';
  if (gaps.length === 0) {
    return `${header}\n\nNo renewal-specific risk flags were identified from your intake answers.\n\nThis does not guarantee approval — it means your self-reported answers did not\ntrigger any of the standard renewal risk checks (marginality, ownership changes,\nprojection shortfalls, immigration history, develop-and-direct, home-country ties).\nReview each document in this package before filing.`;
  }

  const sevLabel: Record<GapSeverity, string> = {
    high: 'HIGH PRIORITY',
    medium: 'MEDIUM PRIORITY',
    low: 'LOW PRIORITY',
  };

  const body = gaps.map((g, i) => `${i + 1}. [${sevLabel[g.severity]}] ${g.title.toUpperCase()}

   What we found:
   ${g.finding}

   Why the officer cares:
   ${g.officerConcern}

   What to do before filing:
   ${g.action}`).join('\n\n');

  return `${header}

${gaps.length} risk flag${gaps.length === 1 ? '' : 's'} identified from your intake answers, ordered by priority.
Each flag is based only on what you reported — nothing is inferred beyond your answers.

${body}

Note: This assessment is generated from your self-reported intake and is not legal
advice. For flags marked HIGH PRIORITY, consider review by a licensed immigration
attorney before filing.`;
}

/** One-paragraph summary of the gaps for the cover-letter / BP-update prompts. */
export function summarizeGapsForPrompt(gaps: RenewalGap[]): string {
  if (gaps.length === 0) {
    return 'No renewal-specific risk flags were identified from the intake.';
  }
  return gaps
    .map((g) => `[${g.severity.toUpperCase()}] ${g.title}: ${g.finding}`)
    .join('\n');
}
