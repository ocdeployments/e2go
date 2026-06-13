/**
 * docx-package-constants.ts
 *
 * Shared constants for the document package assembly:
 * cover page, table of contents, tab dividers, and ZIP ordering.
 *
 * Session 4 — Package Assembly
 */

/** Document type → Tab letter mapping (re-used in docx-builder.ts footers) */
export const DOC_TYPE_TAB_MAP: Record<string, string> = {
  ds160_reference: 'A',
  cover_letter: 'D',
  investment_proof: 'F',
  source_of_funds: 'H',
  business_plan: 'I',
  qualifications: 'J',
};

/** Full section titles and 1-line descriptions per Tab letter (Toronto index template) */
export const TAB_SECTION_TITLES: Record<
  string,
  { title: string; description: string }
> = {
  A: {
    title: 'DS-160 Confirmation Page',
    description:
      'Online nonimmigrant visa application confirmation',
  },
  D: {
    title: 'Cover Letter',
    description:
      'Narrative addressing all E-2 eligibility requirements under 9 FAM 402.9',
  },
  F: {
    title: 'Investment Evidence — Funds Committed',
    description:
      'Wire transfer confirmations, franchise fee receipts, lease deposits, business expenditure records',
  },
  H: {
    title: 'Source of Funds',
    description:
      'Complete chronological funds trail from origin to U.S. business account',
  },
  I: {
    title: 'Business Plan',
    description:
      'Five-year projections, market analysis, hiring plan, non-marginality evidence',
  },
  J: {
    title: 'Investor Qualifications',
    description:
      'CV/résumé, employment history, educational credentials, professional references',
  },
};

/** Fixed order for index/dividers — only include tabs for documents actually generated */
export const TAB_ORDER: string[] = ['A', 'D', 'F', 'H', 'I', 'J'];
