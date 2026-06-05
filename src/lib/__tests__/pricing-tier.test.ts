import { getPricingTier, getTierData, TierId } from '../pricing-tier';

describe('getPricingTier', () => {
  it('maps solo with no dependents to solo_none', () => {
    const result = getPricingTier({ application_type: 'solo', family_status: 'just_me' });
    expect(result).toBe('solo_none');
    expect(getTierData(result as TierId).price).toBe(297);
  });

  it('maps solo with spouse only to solo_spouse', () => {
    const result = getPricingTier({ application_type: 'solo', family_status: 'spouse_only' });
    expect(result).toBe('solo_spouse');
    expect(getTierData(result as TierId).price).toBe(347);
  });

  it('maps solo with children to solo_family_small (default fallback)', () => {
    const result = getPricingTier({ application_type: 'solo', family_status: 'spouse_and_children' });
    expect(result).toBe('solo_family_small');
    expect(getTierData(result as TierId).price).toBe(397);
  });

  it('maps partnership with no dependents to partnership_none', () => {
    const result = getPricingTier({ application_type: 'partnership', family_status: 'just_me' });
    expect(result).toBe('partnership_none');
    expect(getTierData(result as TierId).price).toBe(497);
  });

  it('maps partnership with spouses to partnership_couples', () => {
    const result = getPricingTier({ application_type: 'partnership', family_status: 'spouse_only' });
    expect(result).toBe('partnership_couples');
    expect(getTierData(result as TierId).price).toBe(547);
  });

  it('maps partnership with families to partnership_families', () => {
    const result = getPricingTier({ application_type: 'partnership', family_status: 'spouse_and_children' });
    expect(result).toBe('partnership_families');
    expect(getTierData(result as TierId).price).toBe(647);
  });

  it('returns null when quizData is null', () => {
    const result = getPricingTier(null);
    expect(result).toBeNull();
  });
});
