import { computeFundSourceRiskProfile, computeDesperationRatio } from '../cpu-risk-signals';

describe('computeFundSourceRiskProfile (D4)', () => {
  it('returns null tier and a note when no fund source types are on file', () => {
    const result = computeFundSourceRiskProfile({});
    expect(result.sources).toEqual([]);
    expect(result.blendedTier).toBeNull();
    expect(result.highestRiskSource).toBeNull();
    expect(result.note).toContain('No fund source types on file');
  });

  it('ranks a single low-risk source as low with no note', () => {
    const result = computeFundSourceRiskProfile({ 'M3-F-05': 'savings' });
    expect(result.blendedTier).toBe('low');
    expect(result.note).toBeNull();
  });

  it('takes the max risk tier across multiple selected sources', () => {
    const result = computeFundSourceRiskProfile({ 'M3-F-05': 'savings,crypto' });
    expect(result.sources).toHaveLength(2);
    expect(result.blendedTier).toBe('high');
    expect(result.highestRiskSource?.key).toBe('crypto');
    expect(result.note).toContain('Cryptocurrency');
  });

  it('treats an unrecognized source type as medium risk rather than dropping it', () => {
    const result = computeFundSourceRiskProfile({ 'M3-F-05': 'mystery-source' });
    expect(result.sources).toHaveLength(1);
    expect(result.blendedTier).toBe('medium');
  });

  it('accepts array-form fund source values', () => {
    const result = computeFundSourceRiskProfile({ 'M3-F-05': ['loan'] });
    expect(result.blendedTier).toBe('high');
  });

  it('falls back to QF-05 for legacy/seeded applications', () => {
    const result = computeFundSourceRiskProfile({ 'QF-05': 'business-sale' });
    expect(result.blendedTier).toBe('medium');
  });
});

describe('computeDesperationRatio (D7)', () => {
  it('returns null ratio with an explanatory note when invested amount is missing', () => {
    const result = computeDesperationRatio({ 'M3-F-NET': '100000' });
    expect(result.ratio).toBeNull();
    expect(result.note).toContain('total invested');
  });

  it('returns null ratio with an explanatory note when net worth is missing', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '100000' });
    expect(result.ratio).toBeNull();
    expect(result.note).toContain('net worth');
  });

  it('flags zero/negative net worth as high risk without a ratio', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '100000', 'M3-F-NET': '0' });
    expect(result.ratio).toBeNull();
    expect(result.tier).toBe('high');
    expect(result.note).toContain('zero or negative');
  });

  it('computes a low tier under 50%', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '40000', 'M3-F-NET': '200000' });
    expect(result.ratio).toBeCloseTo(0.2);
    expect(result.tier).toBe('low');
    expect(result.note).toBeNull();
  });

  it('computes a medium tier between 50% and 80%', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '120000', 'M3-F-NET': '200000' });
    expect(result.tier).toBe('medium');
    expect(result.note).toBeNull();
  });

  it('computes a high tier over 80% with the officer-question note', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '180000', 'M3-F-NET': '200000' });
    expect(result.ratio).toBeCloseTo(0.9);
    expect(result.tier).toBe('high');
    expect(result.note).toContain('what do you live on');
  });

  it('parses dollar-formatted strings', () => {
    const result = computeDesperationRatio({ 'M3-F-02': '$180,000', 'M3-F-NET': '$200,000' });
    expect(result.ratio).toBeCloseTo(0.9);
  });
});
