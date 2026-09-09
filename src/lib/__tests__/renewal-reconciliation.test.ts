import { computeRenewalReconciliation, ProjectionRow } from '../renewal-reconciliation';

describe('computeRenewalReconciliation', () => {
  const projections: ProjectionRow[] = [
    { year: 1, revenue: '100000', netIncome: '5000', employees: '2' },
    { year: 2, revenue: '250000', netIncome: '30000', employees: '4' },
    { year: 3, revenue: '400000', netIncome: '60000', employees: '5' },
  ];

  it('computes per-year revenue variance when both projected and actual are on file', () => {
    const result = computeRenewalReconciliation(projections, {
      'RQ-01-Y1': '120000',
      'RQ-01-Y2': '200000',
    });

    expect(result.revenue[0]).toMatchObject({ year: 1, projected: 100000, actual: 120000 });
    expect(result.revenue[0].variancePct).toBeCloseTo(0.2);
    expect(result.revenue[0].narrative).toContain('Year 1');
    expect(result.revenue[0].narrative).toContain('+20%');

    expect(result.revenue[1]).toMatchObject({ year: 2, projected: 250000, actual: 200000 });
    expect(result.revenue[1].variancePct).toBeCloseTo(-0.2);

    // Year 3 has no actual reported — must be null, not fabricated
    expect(result.revenue[2]).toMatchObject({ year: 3, projected: 400000, actual: null, variancePct: null, narrative: null });
  });

  it('marks employee verdict as exceeded/met/short based on RQ-02 vs Year 1 projection', () => {
    const exceeded = computeRenewalReconciliation(projections, { 'RQ-02': '3' });
    expect(exceeded.employees).toMatchObject({ projectedYear1: 2, actualNow: 3, verdict: 'exceeded' });
    expect(exceeded.employees.narrative).toContain('projected 2 full-time employees');
    expect(exceeded.employees.narrative).toContain('currently employs 3');

    const met = computeRenewalReconciliation(projections, { 'RQ-02': '2' });
    expect(met.employees.verdict).toBe('met');

    const short = computeRenewalReconciliation(projections, { 'RQ-02': '1' });
    expect(short.employees.verdict).toBe('short');
  });

  it('returns insufficient_data verdict and null narrative when RQ-02 is missing', () => {
    const result = computeRenewalReconciliation(projections, {});
    expect(result.employees).toMatchObject({
      projectedYear1: 2,
      actualNow: null,
      narrative: null,
      verdict: 'insufficient_data',
    });
  });

  it('falls back to a plain no-data summary when nothing is comparable', () => {
    const result = computeRenewalReconciliation(projections, {});
    expect(result.summary).toBe(
      'No comparable projected-vs-actual figures are on file for this renewal — Template 6 will show self-reported actuals only.'
    );
  });

  it('joins available revenue and employee narratives into one summary', () => {
    const result = computeRenewalReconciliation(projections, {
      'RQ-01-Y1': '120000',
      'RQ-02': '3',
    });
    expect(result.summary).toContain('Year 1');
    expect(result.summary).toContain('currently employs 3');
  });

  it('handles $ and comma-formatted currency strings', () => {
    const result = computeRenewalReconciliation(
      [{ year: 1, revenue: '$100,000', netIncome: '$5,000', employees: '2' }],
      { 'RQ-01-Y1': '$150,000.50' }
    );
    expect(result.revenue[0].projected).toBe(100000);
    expect(result.revenue[0].actual).toBeCloseTo(150000.5);
  });

  it('treats zero projected revenue as non-computable variance', () => {
    const result = computeRenewalReconciliation(
      [{ year: 1, revenue: '0', netIncome: '0', employees: '1' }],
      { 'RQ-01-Y1': '5000' }
    );
    expect(result.revenue[0].variancePct).toBeNull();
    expect(result.revenue[0].narrative).toContain('variance not computable');
  });

  it('returns empty revenue array and insufficient_data employees when projections is empty', () => {
    const result = computeRenewalReconciliation([], { 'RQ-02': '3' });
    expect(result.revenue).toEqual([]);
    expect(result.employees.verdict).toBe('insufficient_data');
    expect(result.summary).toBe(
      'No comparable projected-vs-actual figures are on file for this renewal — Template 6 will show self-reported actuals only.'
    );
  });
});
