import { getPricingTier, getTierData } from '../pricing-tier';

describe('getPricingTier', () => {
  it('returns complete for any quiz data (flat pricing model)', () => {
    expect(getPricingTier({ application_type: 'solo', family_status: 'just_me' })).toBe('complete');
  });

  it('returns complete regardless of family status', () => {
    expect(getPricingTier({ application_type: 'solo', family_status: 'spouse_only' })).toBe('complete');
    expect(getPricingTier({ application_type: 'solo', family_status: 'spouse_and_children' })).toBe('complete');
    expect(getPricingTier({ application_type: 'solo', family_status: 'children_only' })).toBe('complete');
  });

  it('returns complete regardless of application type', () => {
    expect(getPricingTier({ application_type: 'partnership', family_status: 'just_me' })).toBe('complete');
    expect(getPricingTier({ application_type: 'spousal_partnership', family_status: 'spouse_only' })).toBe('complete');
  });

  it('returns null when quizData is null', () => {
    expect(getPricingTier(null)).toBeNull();
  });

  it('getTierData returns correct data for complete tier', () => {
    const tier = getTierData('complete');
    expect(tier.price).toBe(1495);
    expect(tier.id).toBe('complete');
  });
});
