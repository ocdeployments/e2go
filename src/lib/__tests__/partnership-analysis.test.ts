import { computeEnterpriseNationality, buildJointPartnershipBlock } from '../partnership-analysis';

describe('computeEnterpriseNationality (WS5 5.1 rule 1)', () => {
  it('returns insufficient_data when nationality is missing for either investor', () => {
    const result = computeEnterpriseNationality('Alice', null, 60, 'Bob', 'Canada', 40);
    expect(result.conclusion).toBe('insufficient_data');
    expect(result.note).toContain('Cannot compute enterprise nationality');
  });

  it('returns insufficient_data when ownership share cannot be determined at all', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', null, 'Bob', 'Canada', null);
    expect(result.conclusion).toBe('insufficient_data');
  });

  it('infers the missing share as the two-investor remainder', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', null, 'Bob', 'Canada', '40');
    expect(result.p1.ownershipPct).toBe(60);
    expect(result.p2.ownershipPct).toBe(40);
    expect(result.conclusion).toBe('qualifies');
  });

  it('qualifies cleanly when both investors share the same nationality', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', 50, 'Bob', 'Canada', 50);
    expect(result.conclusion).toBe('qualifies');
    expect(result.note).toContain('Canada');
  });

  it('flags mixed-nationality partnerships for per-investor confirmation', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', 50, 'Bob', 'Germany', 50);
    expect(result.conclusion).toBe('insufficient_data');
    expect(result.note).toContain('Mixed-nationality');
  });

  it('calls out a majority-stake investor by name in a mixed-nationality case', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', 70, 'Bob', 'Germany', 30);
    expect(result.note).toContain('Alice holds a majority stake (70%)');
    expect(result.note).not.toContain('Bob holds a majority stake');
  });

  it('parses percentage strings with a % sign', () => {
    const result = computeEnterpriseNationality('Alice', 'Canada', '60%', 'Bob', 'Canada', '40%');
    expect(result.p1.ownershipPct).toBe(60);
    expect(result.p2.ownershipPct).toBe(40);
  });
});

describe('buildJointPartnershipBlock', () => {
  it('includes both investor names and the nationality note', () => {
    const nationality = computeEnterpriseNationality('Alice', 'Canada', 50, 'Bob', 'Canada', 50);
    const block = buildJointPartnershipBlock('Alice', 'Bob', 'Canada', '50', '100000', 'Operations', nationality);
    expect(block).toContain('Alice');
    expect(block).toContain('Bob');
    expect(block).toContain('JOINT DOCUMENT');
    expect(block).toContain(nationality.note);
  });

  it('falls back to "not confirmed" for missing P2 fields', () => {
    const nationality = computeEnterpriseNationality('Alice', null, null, 'Bob', null, null);
    const block = buildJointPartnershipBlock('Alice', 'Bob', '', '', '', '', nationality);
    expect(block).toContain('not confirmed');
  });
});
