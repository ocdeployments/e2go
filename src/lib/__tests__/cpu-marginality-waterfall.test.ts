import { computeCaseFinancials } from '../case-financials';
import {
  computeFederalPovertyGuideline,
  estimateHouseholdSize,
  computeMarginalityWaterfall,
} from '../cpu-marginality-waterfall';

function projections(rows: { year: number; netIncome?: string }[]): string {
  return JSON.stringify(rows);
}

describe('computeFederalPovertyGuideline (2026 HHS figures)', () => {
  it('returns $15,960 for a household of 1', () => {
    expect(computeFederalPovertyGuideline(1)).toBe(15_960);
  });

  it('returns $21,640 for a household of 2', () => {
    expect(computeFederalPovertyGuideline(2)).toBe(21_640);
  });

  it('increments by $5,680 per additional person', () => {
    expect(computeFederalPovertyGuideline(5)).toBe(15_960 + 5_680 * 4);
  });
});

describe('estimateHouseholdSize (Q0-03 / M3-L-family)', () => {
  it('assumes a solo household with no data on file', () => {
    const result = estimateHouseholdSize(null);
    expect(result.minSize).toBe(1);
    expect(result.confidence).toBe('unknown');
  });

  it('returns 1 with known_minimum confidence for explicit "none"', () => {
    const result = estimateHouseholdSize('None');
    expect(result.minSize).toBe(1);
    expect(result.confidence).toBe('known_minimum');
  });

  it('returns 2 with known_minimum confidence for spouse, no children', () => {
    const result = estimateHouseholdSize('Spouse');
    expect(result.minSize).toBe(2);
    expect(result.confidence).toBe('known_minimum');
  });

  it('returns a conservative minimum of 3 for spouse and children, flagged unknown', () => {
    const result = estimateHouseholdSize('Spouse and children');
    expect(result.minSize).toBe(3);
    expect(result.confidence).toBe('unknown');
    expect(result.note).toContain('does not capture an exact count');
  });

  it('returns a conservative minimum of 2 for children with no spouse', () => {
    const result = estimateHouseholdSize('Children');
    expect(result.minSize).toBe(2);
    expect(result.confidence).toBe('unknown');
  });
});

describe('computeMarginalityWaterfall (D15 + D16)', () => {
  it('returns insufficient_data with no owner draw or projections on file', () => {
    const cf = computeCaseFinancials({});
    const result = computeMarginalityWaterfall(cf, null);
    expect(result.result).toBe('insufficient_data');
  });

  it('classifies clears_now when Year 1 owner draw clears the floor', () => {
    const cf = computeCaseFinancials({ 'M3-I-04': '30000' });
    const result = computeMarginalityWaterfall(cf, 'None');
    expect(result.result).toBe('clears_now');
    expect(result.firstClearingYear).toBe(1);
  });

  it('classifies clears_within_5yr when income crosses the floor by Year 3', () => {
    const cf = computeCaseFinancials({
      'M3-I-04': '10000',
      'M3-I-PROJECTIONS': projections([
        { year: 1, netIncome: '10000' },
        { year: 2, netIncome: '12000' },
        { year: 3, netIncome: '25000' },
      ]),
    });
    const result = computeMarginalityWaterfall(cf, 'None');
    expect(result.result).toBe('clears_within_5yr');
    expect(result.firstClearingYear).toBe(3);
  });

  it('classifies never_clears when income never crosses the floor', () => {
    const cf = computeCaseFinancials({
      'M3-I-04': '5000',
      'M3-I-PROJECTIONS': projections([
        { year: 1, netIncome: '5000' },
        { year: 2, netIncome: '6000' },
      ]),
    });
    const result = computeMarginalityWaterfall(cf, 'None');
    expect(result.result).toBe('never_clears');
  });

  it('raises the floor for a larger household, changing the classification', () => {
    const cf = computeCaseFinancials({ 'M3-I-04': '18000' });
    const solo = computeMarginalityWaterfall(cf, 'None');
    const family = computeMarginalityWaterfall(cf, 'Spouse and children');
    expect(solo.result).toBe('clears_now');
    expect(family.result).not.toBe('clears_now');
    expect(family.incomeFloor).toBeGreaterThan(solo.incomeFloor);
  });
});
