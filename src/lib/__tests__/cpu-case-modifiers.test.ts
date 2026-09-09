import { computePriorRefusalModifier } from '../cpu-case-modifiers';

describe('computePriorRefusalModifier (D20)', () => {
  it('returns tier none with no directive when the field is empty', () => {
    const result = computePriorRefusalModifier({});
    expect(result.tier).toBe('none');
    expect(result.directive).toBeNull();
  });

  it('returns tier none when the applicant explicitly answered No', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'No' });
    expect(result.tier).toBe('none');
    expect(result.directive).toBeNull();
  });

  it('classifies a refusal more than 5 years ago as tier old', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'Yes, once — more than 5 years ago' });
    expect(result.tier).toBe('old');
    expect(result.directive).toContain('more than 5 years ago');
  });

  it('classifies a refusal within 5 years as tier recent', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'Yes, once — within the last 5 years' });
    expect(result.tier).toBe('recent');
    expect(result.directive).toContain('global case-theory modifier');
  });

  it('classifies multiple refusals as tier multiple', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'Yes, more than once' });
    expect(result.tier).toBe('multiple');
    expect(result.directive).toContain('MULTIPLE');
  });

  it('falls back to legacy QA-23 when M3-A-21 is missing', () => {
    const result = computePriorRefusalModifier({ 'QA-23': 'Yes, more than once' });
    expect(result.tier).toBe('multiple');
  });

  it('flags an unrecognized non-empty value as unknown rather than assuming none', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'W-REFUSAL-OLD' });
    expect(result.tier).toBe('old');
  });

  it('flags a truly unrecognized string as unknown', () => {
    const result = computePriorRefusalModifier({ 'M3-A-21': 'some garbled legacy value' });
    expect(result.tier).toBe('unknown');
    expect(result.directive).toContain('data-quality gap');
  });
});
