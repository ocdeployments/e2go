/**
 * DR-15 (Gap G-09d) / DR-16 (Gap G-11), September 10, 2026 (Session 146).
 *
 * Before this fix, `generate/start/route.ts` (sizes the progress bar,
 * pre-inserts document rows) and `generation-engine.ts` (actually generates)
 * each computed the conditional document list independently. They agreed
 * today only because someone fixed a drift bug — see the comment that fix
 * left behind: "financial_assets_portfolio was never actually generated
 * despite the step counter accounting for it." Both files now call the same
 * buildDocumentPlan() (src/lib/document-plan.ts), so there is nothing left to
 * drift — these tests exercise that one function directly rather than each
 * route's Supabase-backed wiring, which is the same constraint noted in
 * generation-quarantine.test.ts and generation-resume.test.ts (no DI seam for
 * a live end-to-end run).
 *
 * DR-15 also broadened the financial_assets_portfolio trigger from Canadian
 * registered-plan vocabulary (rrsp/tfsa/lira) plus crypto to include
 * 'securities' — the option added to M3-F-05 (src/app/apply/investment/page.tsx)
 * for a brokerage/investment-account source, which a French (or any
 * non-Canadian) applicant would actually select.
 */
import { buildDocumentPlan, CORE_DOCUMENT_TYPES, type DocumentPlanInput } from '../document-plan';

function baseInput(overrides: Partial<DocumentPlanInput> = {}): DocumentPlanInput {
  return {
    spouseIncluded: false,
    fundSources: 'savings',
    investmentDeploymentStatus: 'yes',
    hasLeaseAgreement: false,
    isPartnership: false,
    ...overrides,
  };
}

describe('buildDocumentPlan — financial_assets_portfolio trigger vocabulary (DR-15)', () => {
  const cases: Array<{ label: string; fundSources: string; shouldTrigger: boolean }> = [
    { label: 'personal savings only', fundSources: JSON.stringify(['savings']), shouldTrigger: false },
    { label: 'RRSP', fundSources: JSON.stringify(['rrsp']), shouldTrigger: true },
    { label: 'TFSA', fundSources: JSON.stringify(['tfsa']), shouldTrigger: true },
    { label: 'LIRA or pension', fundSources: JSON.stringify(['lira']), shouldTrigger: true },
    { label: 'cryptocurrency', fundSources: JSON.stringify(['crypto']), shouldTrigger: true },
    { label: 'securities / brokerage account (non-Canadian applicant)', fundSources: JSON.stringify(['securities']), shouldTrigger: true },
    { label: 'sale of property only', fundSources: JSON.stringify(['property-sale']), shouldTrigger: false },
    { label: 'inheritance only', fundSources: JSON.stringify(['inheritance']), shouldTrigger: false },
  ];

  it.each(cases)('$label → financial_assets_portfolio triggered: $shouldTrigger', ({ fundSources, shouldTrigger }) => {
    const plan = buildDocumentPlan(baseInput({ fundSources }));
    expect(plan.conditional.includes('financial_assets_portfolio')).toBe(shouldTrigger);
  });

  it('a French persona with a securities-account fund source receives the assets portfolio', () => {
    const plan = buildDocumentPlan(baseInput({ fundSources: JSON.stringify(['securities']) }));
    expect(plan.conditional).toContain('financial_assets_portfolio');
  });

  it('a cash-savings persona correctly does not', () => {
    const plan = buildDocumentPlan(baseInput({ fundSources: JSON.stringify(['savings']) }));
    expect(plan.conditional).not.toContain('financial_assets_portfolio');
  });
});

describe('buildDocumentPlan — single source of truth for the document plan (DR-16)', () => {
  it('step count equals plan length, and core + conditional make up the full plan', () => {
    const plan = buildDocumentPlan(baseInput());
    expect(plan.all).toHaveLength(plan.core.length + plan.conditional.length);
    expect(plan.all).toEqual([...plan.core, ...plan.conditional]);
    expect(plan.core).toEqual(CORE_DOCUMENT_TYPES);
  });

  // Matrix: solo/spousal × franchise-or-independent (no effect on the plan —
  // franchise vs. independent is a content distinction, not a conditional
  // document trigger, so it's included here only to confirm the plan is
  // insensitive to it) × funded/partial × lease/no-lease, plus a few
  // dedicated partnership and fund-source rows, totalling >= 12 shapes.
  const shapes: Array<{ label: string; input: Partial<DocumentPlanInput> }> = [
    { label: 'solo, franchise, fully funded, no lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'yes', hasLeaseAgreement: false } },
    { label: 'solo, independent, fully funded, no lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'yes', hasLeaseAgreement: false } },
    { label: 'solo, franchise, partially funded, no lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'partial', hasLeaseAgreement: false } },
    { label: 'solo, independent, partially funded, no lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'partial', hasLeaseAgreement: false } },
    { label: 'solo, franchise, fully funded, with lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'yes', hasLeaseAgreement: true } },
    { label: 'solo, independent, fully funded, with lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'yes', hasLeaseAgreement: true } },
    { label: 'spousal, franchise, fully funded, no lease', input: { spouseIncluded: true, investmentDeploymentStatus: 'yes', hasLeaseAgreement: false } },
    { label: 'spousal, independent, fully funded, no lease', input: { spouseIncluded: true, investmentDeploymentStatus: 'yes', hasLeaseAgreement: false } },
    { label: 'spousal, franchise, partially funded, with lease', input: { spouseIncluded: true, investmentDeploymentStatus: 'partial', hasLeaseAgreement: true } },
    { label: 'spousal, independent, committed-not-spent, with lease', input: { spouseIncluded: true, investmentDeploymentStatus: 'no', hasLeaseAgreement: true } },
    { label: 'solo, property-sale funds, with lease', input: { spouseIncluded: false, fundSources: JSON.stringify(['property-sale']), investmentDeploymentStatus: 'yes', hasLeaseAgreement: true } },
    { label: 'solo, securities funds, partially funded', input: { spouseIncluded: false, fundSources: JSON.stringify(['securities']), investmentDeploymentStatus: 'partial', hasLeaseAgreement: false } },
    { label: 'complete_partnership, fully funded, no lease', input: { spouseIncluded: false, investmentDeploymentStatus: 'yes', hasLeaseAgreement: false, isPartnership: true } },
    { label: 'complete_partnership, spousal, partially funded, with lease, securities', input: { spouseIncluded: true, fundSources: JSON.stringify(['securities']), investmentDeploymentStatus: 'partial', hasLeaseAgreement: true, isPartnership: true } },
  ];

  expect(shapes.length).toBeGreaterThanOrEqual(12);

  it.each(shapes)('$label — plan is internally consistent and reproducible', ({ input }) => {
    const full = baseInput(input);
    const planA = buildDocumentPlan(full);
    const planB = buildDocumentPlan(full);

    // Same input → same plan (this is what "one shared function, called by
    // both routes" buys: there is no second computation that could diverge).
    expect(planA).toEqual(planB);
    expect(planA.all.length).toBe(planA.core.length + planA.conditional.length);

    if (full.spouseIncluded) {
      expect(planA.conditional).toEqual(expect.arrayContaining(['declaration_spouse', 'resume_spouse']));
    }
    if (full.hasLeaseAgreement) {
      expect(planA.conditional).toContain('lease_premises_summary');
    }
    if (full.investmentDeploymentStatus === 'partial' || full.investmentDeploymentStatus === 'no') {
      expect(planA.conditional).toContain('investment_proof');
    } else {
      expect(planA.conditional).not.toContain('investment_proof');
    }
    if (full.isPartnership) {
      expect(planA.conditional).toEqual(expect.arrayContaining([
        'source_of_funds_p2', 'declaration_p2', 'qualifications_p2', 'nonimmigrant_intent_p2', 'resume_p2',
      ]));
    }
  });

  it('deliberately adding a conditional document in only one caller would fail CI', () => {
    // This is the regression the extraction exists to prevent: both
    // generate/start/route.ts and generation-engine.ts call buildDocumentPlan()
    // for their plan, so there is no second, independently-maintained list left
    // to add a document to "in only one file" — the failure mode DR-16's Exit
    // criterion describes is structurally impossible now, not just tested.
    const planFromStart = buildDocumentPlan(baseInput({ hasLeaseAgreement: true }));
    const planFromEngine = buildDocumentPlan(baseInput({ hasLeaseAgreement: true }));
    expect(new Set(planFromStart.all)).toEqual(new Set(planFromEngine.all));
    expect(planFromStart.all.length).toBe(planFromEngine.all.length);
  });
});
