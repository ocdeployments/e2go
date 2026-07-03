import { getSectionContract } from '../section-contract-parser';
import type { DocumentType } from '@/types/generation';

// WS3.4 — DOC_SECTION_CONTRACTS (cic-verifier.ts) is generated live from each
// template's Structure block via getSectionContract(), so it can never drift
// out of sync with the templates. This test asserts every document type either
// yields a non-empty, well-formed contract, or is one of the known exceptions
// (no Structure convention in that template — same precedent as SKIP in
// tab-consistency.test.ts).
const KNOWN_NO_CONTRACT: Partial<Record<DocumentType, true>> = {
  resume_principal: true,
  resume_spouse: true,
  gift_letter: true,
  resume_p2: true, // aliases to resume_principal, which has no Structure convention
};

const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'cover_letter',
  'source_of_funds',
  'investment_proof',
  'business_plan',
  'qualifications',
  'ds160_reference',
  'visa_category',
  'nonimmigrant_intent',
  'marginality_rebuttal',
  'declaration_principal',
  'declaration_spouse',
  'fund_flow_chronology',
  'net_worth_statement',
  'property_portfolio',
  'resume_principal',
  'resume_spouse',
  'gift_letter',
  'cover_letter_p2',
  'source_of_funds_p2',
  'declaration_p2',
  'qualifications_p2',
  'nonimmigrant_intent_p2',
  'resume_p2',
];

describe('section contracts stay in sync with templates', () => {
  for (const docType of ALL_DOCUMENT_TYPES) {
    if (KNOWN_NO_CONTRACT[docType]) {
      it(`${docType} has no parseable Structure convention (known exception)`, () => {
        expect(getSectionContract(docType)).toBeUndefined();
      });
      continue;
    }

    it(`${docType} template yields a non-empty section contract`, () => {
      const contract = getSectionContract(docType);
      expect(contract).toBeDefined();
      expect(contract!.length).toBeGreaterThan(0);
      for (const section of contract!) {
        expect(section.name.length).toBeGreaterThan(0);
        expect(section.establishes.length).toBeGreaterThan(0);
      }
    });
  }

  // p2 variants must produce the exact same contract as their principal
  // template (they resolve to the same file via FILE_ALIASES).
  const P2_TO_PRINCIPAL: Array<[DocumentType, DocumentType]> = [
    ['cover_letter_p2', 'cover_letter'],
    ['source_of_funds_p2', 'source_of_funds'],
    ['declaration_p2', 'declaration_principal'],
    ['qualifications_p2', 'qualifications'],
    ['nonimmigrant_intent_p2', 'nonimmigrant_intent'],
    ['resume_p2', 'resume_principal'],
  ];

  for (const [p2, principal] of P2_TO_PRINCIPAL) {
    it(`${p2} contract matches ${principal} contract`, () => {
      expect(getSectionContract(p2)).toEqual(getSectionContract(principal));
    });
  }
});
