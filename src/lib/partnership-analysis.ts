/**
 * WS5 — Partnership packages, 5.1 legal rules (deterministic subset)
 *
 * Only rule 1 (enterprise nationality math) is fully computable from data
 * this codebase actually captures today: each investor's nationality and
 * ownership share. Rules 4 (marginality doubling — needs the ODE waterfall,
 * D15, not yet built), 6 (disguised-lender test — needs capital repayment
 * terms), and 7 (married co-investors — needs a relationship field) all
 * require intake fields the live Module 3 / P2 flow does not yet collect
 * (see agent-prompt-part2-intelligence-and-content.md, 5.3). Ground rule
 * (same as case-financials.ts): never fabricate — where a field is missing,
 * say so instead of guessing.
 */

export type NationalityConclusion = 'qualifies' | 'does_not_qualify' | 'insufficient_data';

export interface InvestorShare {
  name: string;
  nationality: string | null;
  ownershipPct: number | null;
}

export interface EnterpriseNationalityResult {
  p1: InvestorShare;
  p2: InvestorShare;
  conclusion: NationalityConclusion;
  note: string;
}

function parsePct(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const num = parseFloat(value.replace(/[%,\s]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * D5.1 rule 1 — the enterprise qualifies under a treaty country only if
 * nationals of that country own >=50%. Same-nationality 50/50 is clean.
 * Mixed-nationality: each investor's own treaty eligibility must be
 * analyzed individually against their own share. A U.S. citizen or
 * third-country national holding >50% kills eligibility outright.
 */
export function computeEnterpriseNationality(
  p1Name: string,
  p1Nationality: string | null,
  p1SharePctRaw: string | number | null,
  p2Name: string,
  p2Nationality: string | null,
  p2SharePctRaw: string | number | null,
): EnterpriseNationalityResult {
  const p1SharePct = parsePct(p1SharePctRaw);
  let p2SharePct = parsePct(p2SharePctRaw);
  // If only one share is on file, the other is inferable as the remainder
  // of a two-investor cap table — this is arithmetic, not fabrication.
  let inferredP1SharePct = p1SharePct;
  if (inferredP1SharePct === null && p2SharePct !== null) inferredP1SharePct = 100 - p2SharePct;
  if (p2SharePct === null && inferredP1SharePct !== null) p2SharePct = 100 - inferredP1SharePct;

  const p1: InvestorShare = { name: p1Name, nationality: p1Nationality, ownershipPct: inferredP1SharePct };
  const p2: InvestorShare = { name: p2Name, nationality: p2Nationality, ownershipPct: p2SharePct };

  if (!p1Nationality || !p2Nationality || p1.ownershipPct === null || p2.ownershipPct === null) {
    return {
      p1, p2,
      conclusion: 'insufficient_data',
      note: 'Cannot compute enterprise nationality — both investors\' nationality and ownership percentage must be on file. Surface this as a pre-generation gap; do not let any document assert a nationality conclusion until it is confirmed.',
    };
  }

  const sameNationality = p1Nationality.trim().toLowerCase() === p2Nationality.trim().toLowerCase();

  if (sameNationality) {
    return {
      p1, p2,
      conclusion: 'qualifies',
      note: `Both investors are ${p1Nationality} nationals holding 100% combined ownership — clean enterprise nationality, no per-investor split needed.`,
    };
  }

  // Mixed nationality: each investor's own treaty status is analyzed against
  // their own share. If either investor individually holds >=50% and is
  // NOT a treaty national (or is a U.S. citizen), the enterprise does not
  // qualify through that investor's stake regardless of the other's status.
  const p1Majority = p1.ownershipPct >= 50;
  const p2Majority = p2.ownershipPct >= 50;

  return {
    p1, p2,
    conclusion: 'insufficient_data',
    note: `Mixed-nationality partnership (${p1Nationality} / ${p2Nationality}) — each investor's treaty eligibility must be confirmed and stated per investor in the Cover Letter; this module cannot determine treaty-country membership itself. ${
      p1Majority ? `${p1Name} holds a majority stake (${p1.ownershipPct}%) — confirm ${p1Nationality} is a qualifying E-2 treaty country.` : ''
    }${
      p2Majority ? ` ${p2Name} holds a majority stake (${p2.ownershipPct}%) — confirm ${p2Nationality} is a qualifying E-2 treaty country.` : ''
    }`.trim(),
  };
}

/**
 * 5.2 — the joint-context block for the 8 documents shared across a
 * complete_partnership case (Business Plan, Substantiality Memo,
 * Non-Marginality Rebuttal, Fund Flow Chronology, Net Worth Statement,
 * DS-156E/DS-160 Reference, Gift Letter, Property Portfolio). Today these
 * are written in single-investor voice while raw P2-* data leaks into
 * their context unguided (only _p2-suffixed documents got a context block
 * — see p2Block in generation-engine.ts). This is the parallel block for
 * the shared docs: both investors' identities, the nationality conclusion,
 * and explicit per-section instructions so the model does not default to
 * a single-investor narrative or commingle the two investors' personal
 * financial data.
 */
export function buildJointPartnershipBlock(
  p1Name: string,
  p2Name: string,
  p2Nationality: string,
  p2SharePct: string,
  p2InvestAmount: string,
  p2Role: string,
  nationality: EnterpriseNationalityResult,
): string {
  return `
⚠️ PARTNERSHIP APPLICATION — JOINT DOCUMENT (two investors)
This is a complete_partnership E-2 application with two investors: ${p1Name} (Investor 1) and ${p2Name} (Investor 2, nationality: ${p2Nationality || 'not confirmed'}, ownership: ${p2SharePct || 'not confirmed'}, personal investment: $${p2InvestAmount || 'not confirmed'}, role: ${p2Role || 'not confirmed'}).

This document covers the ENTERPRISE and BOTH investors jointly. Do NOT default to single-investor voice or write as if ${p1Name} is the sole owner. Rules for this document:
- Where the document has personal sections (source of funds, net worth, ties, qualifications), address each investor's data SEPARATELY and never merge or average one investor's figures into the other's — each investor's financial picture stands alone.
- Where the document has enterprise-level sections (ownership table, capital structure, staffing/roles), present both investors together with a clear, non-overlapping role allocation — avoid describing both investors as performing identical full-time management duties.
- Enterprise nationality conclusion: ${nationality.note}
- Marginality analysis in this case must show income capacity sufficient for TWO investor households, not one enterprise-level number — do not let a single-household framing stand uncorrected.

---

`;
}
