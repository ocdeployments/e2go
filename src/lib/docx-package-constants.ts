/**
 * docx-package-constants.ts
 *
 * Shared constants for the document package assembly:
 * cover page, table of contents, tab dividers, and ZIP ordering.
 *
 * Session 4 — Package Assembly
 */

/** Human-readable display names for renamed document files (used in ZIP filenames and TOC) */
export const DOC_DISPLAY_NAMES: Record<string, string> = {
  cover_letter: 'Cover_Letter',
  source_of_funds: 'Source_of_Funds',
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
};

/** Document type → Tab letter mapping (re-used in docx-builder.ts footers) */
export const DOC_TYPE_TAB_MAP: Record<string, string> = {
  ds160_reference: 'A',
  fund_flow_chronology: 'B',
  net_worth_statement: 'B',
  marginality_rebuttal: 'C',
  cover_letter: 'D',
  visa_category: 'E',
  property_portfolio: 'F',
  declaration_principal: 'G',
  declaration_spouse: 'G',
  source_of_funds: 'H',
  gift_letter: 'H',
  business_plan: 'I',
  qualifications: 'J',
  resume_principal: 'J',
  resume_spouse: 'J',
  nonimmigrant_intent: 'K',
};

/** Full section titles and 1-line descriptions per Tab letter */
export const TAB_SECTION_TITLES: Record<
  string,
  { title: string; description: string }
> = {
  A: {
    title: 'DS-160 Confirmation Page',
    description: 'Online nonimmigrant visa application confirmation',
  },
  B: {
    title: 'Financial Evidence',
    description:
      'Net worth documentation and chronological fund flow timeline showing the origin, path, and deployment of invested funds',
  },
  C: {
    title: 'Non-Marginality Analysis',
    description:
      "Memorandum demonstrating the enterprise will generate economic contribution beyond the investor's household income under 9 FAM 402.9-6(E)",
  },
  D: {
    title: 'Cover Letter',
    description: 'Narrative addressing all E-2 eligibility requirements under 9 FAM 402.9',
  },
  E: {
    title: 'Substantiality Memorandum',
    description:
      'Investment proportionality analysis under 9 FAM 402.9-6(D) — total enterprise cost, investment ratio, and committed vs. reserved breakdown',
  },
  F: {
    title: 'Investment Evidence — Funds Committed',
    description:
      'Wire transfer confirmations, franchise fee receipts, lease deposits, business expenditure records',
  },
  G: {
    title: 'Personal Declarations',
    description:
      'Signed first-person declarations from the principal investor and accompanying spouse affirming the accuracy of all submitted documentation',
  },
  H: {
    title: 'Source of Funds',
    description: 'Complete chronological funds trail from origin to U.S. business account',
  },
  I: {
    title: 'Business Plan',
    description: 'Five-year projections, market analysis, hiring plan, non-marginality evidence',
  },
  J: {
    title: 'Investor Qualifications',
    description: 'CV/résumé, employment history, educational credentials, professional references',
  },
  K: {
    title: 'Non-immigrant Intent Statement',
    description:
      'First-person statement of home country ties and intent to depart at conclusion of E-2 status',
  },
};

/** Fixed order for index/dividers — only include tabs for documents actually generated */
export const TAB_ORDER: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
