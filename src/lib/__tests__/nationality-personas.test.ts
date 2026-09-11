/**
 * DR-14 (Gap G-09), September 10, 2026 (Session 146).
 *
 * The sprint doc calls this "the standing regression net for DR-11, DR-12,
 * DR-13 and DR-15" — it exists so that any future change to
 * ARCHETYPE_DOC_GUIDANCE or the financial_assets_portfolio trigger vocabulary
 * gets caught here before it reaches a real applicant, not just the narrow
 * case each of those fixes was written for.
 *
 * Three fixture personas (French, British, Japanese) stand in for "three
 * personas generate a full package each; a reviewer reads one
 * nonimmigrant_intent and one source_of_funds per persona and finds no false
 * premise" (the sprint's stated Exit). There's no DI seam for a live
 * end-to-end generation run (see generation-quarantine.test.ts /
 * generation-resume.test.ts), so this assembles the same two pieces a real
 * run assembles — the prompt guidance via buildArchetypeGuidance() and the
 * conditional document set via buildDocumentPlan() — and checks both against
 * every persona, rather than mocking the run itself.
 */
import { buildArchetypeGuidance, ARCHETYPE_DOC_GUIDANCE } from '../generation-engine';
import { buildDocumentPlan, type DocumentPlanInput } from '../document-plan';

const BANNED_CANADIAN_PREMISE = [
  /\bCanada\b/, /\bCanadian\b/, /\bRRSP\b/, /\bTFSA\b/, /\bLIRA\b/,
  /\bprovincial health coverage\b/i,
];

const ARCHETYPES = Object.keys(ARCHETYPE_DOC_GUIDANCE);

interface Persona {
  name: string;
  country: string;
  archetype: string;
  fundSources: string;
  expectsAssetsPortfolio: boolean;
}

const PERSONAS: Persona[] = [
  {
    name: 'French buyer, brokerage-funded',
    country: 'France',
    archetype: 'buyer',
    fundSources: JSON.stringify(['securities']),
    expectsAssetsPortfolio: true,
  },
  {
    name: 'British builder, personal savings',
    country: 'United Kingdom',
    archetype: 'builder',
    fundSources: JSON.stringify(['savings']),
    expectsAssetsPortfolio: false,
  },
  {
    name: 'Japanese investor, crypto-funded',
    country: 'Japan',
    archetype: 'investor',
    fundSources: JSON.stringify(['crypto']),
    expectsAssetsPortfolio: true,
  },
];

function basePlanInput(overrides: Partial<DocumentPlanInput> = {}): DocumentPlanInput {
  return {
    spouseIncluded: false,
    fundSources: 'savings',
    investmentDeploymentStatus: 'yes',
    hasLeaseAgreement: false,
    isPartnership: false,
    ...overrides,
  };
}

describe('Nationality personas — no Canadian premise anywhere in the assembled prompt corpus (DR-14)', () => {
  for (const persona of PERSONAS) {
    describe(persona.name, () => {
      it('every archetype/document-type guidance block is free of Canadian premises for this persona', () => {
        for (const archetype of ARCHETYPES) {
          for (const documentType of Object.keys(ARCHETYPE_DOC_GUIDANCE[archetype])) {
            const guidance = buildArchetypeGuidance(archetype, documentType, persona.country);
            for (const pattern of BANNED_CANADIAN_PREMISE) {
              expect(guidance).not.toMatch(pattern);
            }
          }
        }
      });

      it('nonimmigrant_intent guidance for this persona\'s own archetype contains no false premise', () => {
        const guidance = buildArchetypeGuidance(persona.archetype, 'nonimmigrant_intent', persona.country);
        for (const pattern of BANNED_CANADIAN_PREMISE) {
          expect(guidance).not.toMatch(pattern);
        }
      });

      it('source_of_funds guidance for this persona\'s own archetype contains no false premise', () => {
        const guidance = buildArchetypeGuidance(persona.archetype, 'source_of_funds', persona.country);
        for (const pattern of BANNED_CANADIAN_PREMISE) {
          expect(guidance).not.toMatch(pattern);
        }
      });

      it(`correctly ${persona.expectsAssetsPortfolio ? 'receives' : 'does not receive'} the financial assets portfolio`, () => {
        const plan = buildDocumentPlan(basePlanInput({ fundSources: persona.fundSources }));
        expect(plan.conditional.includes('financial_assets_portfolio')).toBe(persona.expectsAssetsPortfolio);
      });

      it('generates a full document package (core + correctly-triggered conditional documents)', () => {
        const plan = buildDocumentPlan(basePlanInput({ fundSources: persona.fundSources }));
        expect(plan.all).toEqual([...plan.core, ...plan.conditional]);
        expect(plan.all.length).toBeGreaterThan(0);
      });
    });
  }

  it('a genuinely Canadian applicant in the same pipeline still receives the original Canadian guidance (regression guard)', () => {
    const guidance = buildArchetypeGuidance('buyer', 'nonimmigrant_intent', 'Canada');
    expect(guidance).toBe(ARCHETYPE_DOC_GUIDANCE.buyer.nonimmigrant_intent);
  });
});
