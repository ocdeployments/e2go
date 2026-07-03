/**
 * docx-package-constants.ts
 *
 * Single canonical Tab scheme for the E-2 submission package — A through M.
 * This is the one source of truth for "what tab letter does this document
 * belong under." Every other tab reference in the codebase (generation-engine
 * prompt labels, interview-day checklist, pre-app checklist) is derived from
 * or must match DOC_TYPE_TAB_MAP / UPLOADED_DOC_TYPE_TAB_MAP / TAB_SECTION_TITLES
 * below — do not introduce a parallel lettering scheme elsewhere.
 *
 * Covers both generated documents (DocumentType, including _p2 partnership
 * variants — which share their principal counterpart's letter) and
 * client-uploaded documents (uploaded_documents.doc_type).
 *
 * Session 4 — Package Assembly. Re-unified Session 113 (WS3.1).
 */

/** Human-readable display names for renamed document files (used in ZIP filenames and TOC) */
export const DOC_DISPLAY_NAMES: Record<string, string> = {
  cover_letter: 'Cover_Letter',
  source_of_funds: 'Source_of_Funds',
  investment_proof: 'Investment_Proof',
  business_plan: 'Business_Plan',
  qualifications: 'Qualifications',
  ds160_reference: 'DS160_Reference',
  visa_category: 'Substantiality_Memorandum',
  nonimmigrant_intent: 'Nonimmigrant_Intent_Statement',
  marginality_rebuttal: 'NonMarginality_Rebuttal',
  declaration_principal: 'Declaration_Principal',
  declaration_spouse: 'Declaration_Spouse',
  fund_flow_chronology: 'Fund_Flow_Chronology',
  net_worth_statement: 'Net_Worth_Statement',
  property_portfolio: 'Property_Portfolio',
  resume_principal: 'Resume_Principal',
  resume_spouse: 'Resume_Spouse',
  gift_letter: 'Gift_Letter',
  cover_letter_p2: 'Cover_Letter_Investor2',
  source_of_funds_p2: 'Source_of_Funds_Investor2',
  declaration_p2: 'Declaration_Investor2',
  qualifications_p2: 'Qualifications_Investor2',
  nonimmigrant_intent_p2: 'Nonimmigrant_Intent_Investor2',
  resume_p2: 'Resume_Investor2',
};

/**
 * Generated DocumentType → Tab letter. P2 (Investor 2) variants share their
 * principal counterpart's letter — they sit in the same tab, distinguished
 * by an "(Investor 2)" label suffix applied by the caller, not a new letter.
 */
export const DOC_TYPE_TAB_MAP: Record<string, string> = {
  ds160_reference: 'B',
  cover_letter: 'C',
  cover_letter_p2: 'C',
  source_of_funds: 'D',
  source_of_funds_p2: 'D',
  gift_letter: 'D',
  fund_flow_chronology: 'E',
  net_worth_statement: 'E',
  investment_proof: 'E',
  visa_category: 'F',
  marginality_rebuttal: 'G',
  business_plan: 'H',
  qualifications: 'I',
  qualifications_p2: 'I',
  resume_principal: 'I',
  resume_spouse: 'I',
  resume_p2: 'I',
  property_portfolio: 'J',
  declaration_principal: 'L',
  declaration_spouse: 'L',
  declaration_p2: 'L',
  nonimmigrant_intent: 'M',
  nonimmigrant_intent_p2: 'M',
};

/**
 * Client-uploaded uploaded_documents.doc_type → Tab letter. Distinct map
 * (rather than merging into DOC_TYPE_TAB_MAP) because upload doc_type
 * strings and generated DocumentType strings are different vocabularies
 * that happen to collide on a couple of values (business_plan) with
 * different meaning — keeping them separate avoids ambiguity at lookup time.
 */
export const UPLOADED_DOC_TYPE_TAB_MAP: Record<string, string> = {
  passport: 'A',
  birth_certificate: 'A',
  marriage_certificate: 'A',
  government_form: 'B',
  investment_records: 'E',
  financial_statement: 'E',
  acquisition_financials: 'E',
  business_plan: 'H',
  territory_analysis: 'H',
  resume: 'I',
  lease_agreement: 'J',
  fdd: 'K',
  franchise_agreement: 'K',
};

/** Full section titles and 1-line descriptions per Tab letter */
export const TAB_SECTION_TITLES: Record<
  string,
  { title: string; description: string }
> = {
  A: {
    title: 'Passport & Personal Identity',
    description: 'Passport biographical pages, birth certificate, marriage certificate',
  },
  B: {
    title: 'DS-160 / Government Forms',
    description: 'Online nonimmigrant visa application confirmation and other government forms',
  },
  C: {
    title: 'Cover Letter',
    description: 'Narrative addressing all E-2 eligibility requirements under 9 FAM 402.9',
  },
  D: {
    title: 'Source of Funds',
    description: 'Complete chronological funds trail from origin to U.S. business account',
  },
  E: {
    title: 'Financial Evidence & Investment Records',
    description:
      'Net worth documentation, fund flow timeline, investment proof, bank and brokerage records',
  },
  F: {
    title: 'Substantiality Memorandum',
    description:
      'Investment proportionality analysis under 9 FAM 402.9-6(D) — total enterprise cost, investment ratio, and committed vs. reserved breakdown',
  },
  G: {
    title: 'Non-Marginality Analysis',
    description:
      "Memorandum demonstrating the enterprise will generate economic contribution beyond the investor's household income under 9 FAM 402.9-6(E)",
  },
  H: {
    title: 'Business Plan',
    description: 'Five-year projections, market analysis, hiring plan, territory analysis',
  },
  I: {
    title: 'Investor Qualifications & Resumes',
    description: 'CV/résumé, employment history, educational credentials, professional references',
  },
  J: {
    title: 'Entity, Property & Lease Documentation',
    description: 'Business formation records, property portfolio, commercial lease or LOI',
  },
  K: {
    title: 'Franchise Documentation',
    description: 'Franchise Disclosure Document and signed franchise agreement',
  },
  L: {
    title: 'Personal Declarations',
    description:
      'Signed first-person declarations from the principal investor and accompanying spouse affirming the accuracy of all submitted documentation',
  },
  M: {
    title: 'Non-immigrant Intent Statement',
    description:
      'First-person statement of home country ties and intent to depart at conclusion of E-2 status',
  },
};

/** Fixed order for index/dividers — only include tabs for documents actually generated */
export const TAB_ORDER: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
