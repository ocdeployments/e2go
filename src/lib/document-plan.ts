import type { DocumentType } from '@/types/generation';

/**
 * DR-16 (Gap G-11): single source of truth for which documents a case
 * generates. `generate/start/route.ts` (sizes the progress bar, pre-inserts
 * document rows) and `generation-engine.ts` (actually generates) each used to
 * compute this independently — they agreed only by luck, and drifted at least
 * once (financial_assets_portfolio was counted by the step total but never
 * generated, fixed in generation-engine.ts with a comment recording the cost).
 * Both call this instead.
 */

export const CORE_DOCUMENT_TYPES: DocumentType[] = [
  'cover_letter', 'source_of_funds', 'business_plan', 'qualifications',
  'ds160_reference', 'visa_category', 'nonimmigrant_intent',
  'marginality_rebuttal', 'declaration_principal', 'fund_flow_chronology',
  'net_worth_statement', 'resume_principal', 'gift_letter',
  'org_chart', 'corporate_documents_guide',
];

// DR-15 (Gap G-09d): the trigger used to fire only on Canadian registered-plan
// vocabulary (rrsp/tfsa/lira) plus crypto, so a non-Canadian applicant funding
// from a brokerage/securities account never got this document at all.
// 'securities' is the corresponding option added to the M3-F-05 answer set
// (src/app/apply/investment/page.tsx) for any stocks/bonds/mutual-fund/
// brokerage/investment-account source not already covered by 'lira' (which
// already reads "LIRA or pension").
export const FINANCIAL_ASSETS_TRIGGER_VOCAB = ['rrsp', 'tfsa', 'lira', 'crypto', 'securities'];

export interface DocumentPlanInput {
  /** M3-L-01 === 'yes' */
  spouseIncluded: boolean;
  /** Raw M3-F-05 answer_value (JSON-stringified array of selected source keys) */
  fundSources: string | null | undefined;
  /** M3-F-NEW-01 answer_value */
  investmentDeploymentStatus: string | null | undefined;
  /** Whether a lease_agreement row exists in uploaded_documents */
  hasLeaseAgreement: boolean;
  /** Whether a completed complete_partnership payment exists for this user */
  isPartnership: boolean;
}

export interface DocumentPlan {
  core: DocumentType[];
  conditional: DocumentType[];
  all: DocumentType[];
}

export function buildDocumentPlan(input: DocumentPlanInput): DocumentPlan {
  const conditional: DocumentType[] = [];

  if (input.spouseIncluded) {
    conditional.push('declaration_spouse', 'resume_spouse');
  }
  if (typeof input.fundSources === 'string' && input.fundSources.includes('property-sale')) {
    conditional.push('property_portfolio');
  }
  // WS6.1 — Investment Evidence generates only when at-risk is genuinely contested:
  // funds partially deployed or committed-but-unspent (escrow-style arrangements).
  // Fully-deployed cases rely on SOF §V instead of a redundant standalone document.
  if (input.investmentDeploymentStatus === 'partial' || input.investmentDeploymentStatus === 'no') {
    conditional.push('investment_proof');
  }
  // WS6.1 — Financial Assets Portfolio generates when fund sources include securities/
  // registered plans/crypto.
  if (
    typeof input.fundSources === 'string' &&
    FINANCIAL_ASSETS_TRIGGER_VOCAB.some((v) => (input.fundSources as string).includes(v))
  ) {
    conditional.push('financial_assets_portfolio');
  }
  // WS6.1 — Lease/Premises Summary generates only for physical-location businesses,
  // detected deterministically by the presence of an uploaded lease agreement.
  if (input.hasLeaseAgreement) {
    conditional.push('lease_premises_summary');
  }
  // Sprint F-P: Investor 2 document types for complete_partnership buyers.
  // cover_letter_p2 retired — the shared cover_letter now covers both investors jointly.
  if (input.isPartnership) {
    conditional.push(
      'source_of_funds_p2', 'declaration_p2',
      'qualifications_p2', 'nonimmigrant_intent_p2', 'resume_p2'
    );
  }

  return {
    core: CORE_DOCUMENT_TYPES,
    conditional,
    all: [...CORE_DOCUMENT_TYPES, ...conditional],
  };
}
