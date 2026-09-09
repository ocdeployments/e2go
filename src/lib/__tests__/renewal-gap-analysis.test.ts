import { computeRenewalGaps, buildGapAnalysisDocument, summarizeGapsForPrompt } from '../renewal-gap-analysis';
import { computeRenewalReconciliation } from '../renewal-reconciliation';

const PROJECTIONS = [
  { year: 1, revenue: '200000', netIncome: '30000', employees: '3' },
  { year: 2, revenue: '350000', netIncome: '60000', employees: '5' },
  { year: 3, revenue: '500000', netIncome: '90000', employees: '7' },
];

const STRONG_ANSWERS = {
  'RQ-01-Y1': '210000',
  'RQ-01-Y2': '360000',
  'RQ-02': '4',
  'RQ-03': '2',
  'RQ-07': 'yes',
  'RQ-08': 'no',
  'RQ-09': 'I manage all hiring decisions, negotiate vendor contracts, oversee financials weekly, and set growth strategy for both locations.',
  'RQ-13': 'I own a house in Mississauga, maintain RBC accounts, file Canadian taxes, and my parents and brother remain in Ontario.',
  'RQ-15': 'no',
};

describe('computeRenewalGaps', () => {
  it('returns no gaps for a strong renewal case', () => {
    const rec = computeRenewalReconciliation(PROJECTIONS, STRONG_ANSWERS);
    const gaps = computeRenewalGaps(STRONG_ANSWERS, rec, 'toronto');
    expect(gaps).toHaveLength(0);
  });

  it('flags marginality as high when no employees and not profitable', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-02': '0', 'RQ-03': '0', 'RQ-07': 'loss' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    const marginality = gaps.find(g => g.id === 'marginality');
    expect(marginality).toBeDefined();
    expect(marginality?.severity).toBe('high');
  });

  it('flags no-employees as medium when profitable but zero headcount', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-02': '0', 'RQ-03': '0' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    expect(gaps.find(g => g.id === 'no-employees')?.severity).toBe('medium');
    expect(gaps.find(g => g.id === 'marginality')).toBeUndefined();
  });

  it('flags ownership change as high and includes the reported detail', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-08': 'yes-added', 'RQ-08-detail': 'Added a 20% partner in Year 2; I retain 80%.' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    const gap = gaps.find(g => g.id === 'ownership-change');
    expect(gap?.severity).toBe('high');
    expect(gap?.finding).toContain('80%');
  });

  it('flags revenue shortfall only when variance exceeds -25%', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-01-Y1': '140000', 'RQ-01-Y2': '360000' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    const gap = gaps.find(g => g.id === 'revenue-shortfall');
    expect(gap).toBeDefined();
    expect(gap?.finding).toContain('Year 1');
    expect(gap?.finding).not.toContain('Year 2');
  });

  it('never fabricates — missing actuals produce no revenue-shortfall flag', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-01-Y1': '', 'RQ-01-Y2': '' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    expect(gaps.find(g => g.id === 'revenue-shortfall')).toBeUndefined();
  });

  it('skips the ties check on the USCIS path but keeps it for consular', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-13': '' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    expect(computeRenewalGaps(answers, rec, 'uscis').find(g => g.id === 'thin-ties')).toBeUndefined();
    expect(computeRenewalGaps(answers, rec, 'toronto').find(g => g.id === 'thin-ties')).toBeDefined();
  });

  it('orders gaps high before medium', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-08': 'yes-pct', 'RQ-09': '' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const gaps = computeRenewalGaps(answers, rec, 'toronto');
    expect(gaps[0].severity).toBe('high');
    const sevs = gaps.map(g => g.severity);
    expect(sevs.indexOf('medium')).toBeGreaterThan(sevs.lastIndexOf('high'));
  });
});

describe('buildGapAnalysisDocument', () => {
  it('renders a clean-case document when there are no gaps', () => {
    const doc = buildGapAnalysisDocument([]);
    expect(doc).toContain('No renewal-specific risk flags');
    expect(doc).toContain('does not guarantee approval');
  });

  it('renders numbered, prioritised flags', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-15': 'yes-status', 'RQ-15-detail': 'Brief status gap in 2024, cured by nunc pro tunc filing.' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const doc = buildGapAnalysisDocument(computeRenewalGaps(answers, rec, 'toronto'));
    expect(doc).toContain('1. [HIGH PRIORITY]');
    expect(doc).toContain('nunc pro tunc');
    expect(doc).toContain('not legal');
  });
});

describe('summarizeGapsForPrompt', () => {
  it('produces one line per gap with severity markers', () => {
    const answers = { ...STRONG_ANSWERS, 'RQ-08': 'yes-removed', 'RQ-08-detail': 'Bought out my co-founder; now 100% owner.' };
    const rec = computeRenewalReconciliation(PROJECTIONS, answers);
    const summary = summarizeGapsForPrompt(computeRenewalGaps(answers, rec, 'toronto'));
    expect(summary).toContain('[HIGH]');
    expect(summary).toContain('100% owner');
  });
});
