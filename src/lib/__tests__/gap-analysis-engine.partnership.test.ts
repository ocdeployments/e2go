import { scoreCase } from '../gap-analysis-engine';

describe('scoreCase — partnership awareness (WS7 Gap Analysis crown-jewel fix)', () => {
  const app = {
    business_name: 'Test Co',
    business_category: 'independent',
    operational_status: 'pre_start',
    target_state: 'FL',
    principal_name: 'Investor One',
    simulator_sessions_used: 3,
  };

  const baseAnswers = [
    { question_key: 'M3-F-02', answer_value: '150000' },
    { question_key: 'M3-F-03', answer_value: '200000' },
    { question_key: 'M3-F-05', answer_value: 'Sale of prior business' },
    { question_key: 'M3-F-NEW-01', answer_value: 'yes' },
    { question_key: 'QA-08', answer_value: 'General manager overseeing daily operations' },
    { question_key: 'QA-09', answer_value: 'Hiring, vendor negotiation, daily P&L review, staff scheduling' },
  ];

  it('does not penalize a solo-investor case for missing P2-* answers', () => {
    const result = scoreCase(app, baseAnswers, [], undefined, undefined, null, undefined, false);
    const sof = result.categories.find(c => c.id === 'source_of_funds')!;
    const mgmt = result.categories.find(c => c.id === 'management_role')!;
    expect(sof.gaps.some(g => g.includes('Investor 2'))).toBe(false);
    expect(mgmt.gaps.some(g => g.includes('Investor 2'))).toBe(false);
  });

  it('flags missing Investor 2 source-of-funds and role for a partnership case', () => {
    const result = scoreCase(app, baseAnswers, [], undefined, undefined, null, undefined, true);
    const sof = result.categories.find(c => c.id === 'source_of_funds')!;
    const mgmt = result.categories.find(c => c.id === 'management_role')!;

    expect(sof.gaps.some(g => g.includes("Investor 2's source of funds"))).toBe(true);
    expect(sof.actions.some(a => a.includes('Investor 2'))).toBe(true);

    expect(mgmt.gaps.some(g => g.includes('Investor 2 role and qualifications'))).toBe(true);
    expect(mgmt.actions.some(a => a.includes('Investor 2'))).toBe(true);
  });

  it('scores a partnership case lower than an otherwise-identical solo case when partner data is missing', () => {
    const solo = scoreCase(app, baseAnswers, [], undefined, undefined, null, undefined, false);
    const partnership = scoreCase(app, baseAnswers, [], undefined, undefined, null, undefined, true);

    const soloSof = solo.categories.find(c => c.id === 'source_of_funds')!.score;
    const partnershipSof = partnership.categories.find(c => c.id === 'source_of_funds')!.score;
    expect(partnershipSof).toBeLessThan(soloSof);

    const soloMgmt = solo.categories.find(c => c.id === 'management_role')!.score;
    const partnershipMgmt = partnership.categories.find(c => c.id === 'management_role')!.score;
    expect(partnershipMgmt).toBeLessThan(soloMgmt);
  });

  it('credits a partnership case once P2-SOF and P2-ROLE are filled in', () => {
    const withP2 = [
      ...baseAnswers,
      { question_key: 'P2-SOF', answer_value: 'Investor 2 funded via inheritance, documented with probate records' },
      { question_key: 'P2-ROLE', answer_value: 'Finance and business development lead' },
      { question_key: 'P2-QUALS', answer_value: '15 years in corporate finance' },
    ];
    const result = scoreCase(app, withP2, [], undefined, undefined, null, undefined, true);
    const sof = result.categories.find(c => c.id === 'source_of_funds')!;
    const mgmt = result.categories.find(c => c.id === 'management_role')!;

    expect(sof.gaps.some(g => g.includes('Investor 2'))).toBe(false);
    expect(sof.evidence.some(e => e.includes("Investor 2's source of funds"))).toBe(true);

    expect(mgmt.gaps.some(g => g.includes('Investor 2 role and qualifications'))).toBe(false);
    expect(mgmt.evidence.some(e => e.includes('Investor 2 role'))).toBe(true);
  });
});
