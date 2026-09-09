import { getPricingTier, getTierData } from '../pricing-tier';

describe('getPricingTier', () => {
  it('returns visa_ready for any quiz data (no tier-distinguishing quiz signal exists)', () => {
    expect(getPricingTier({ application_type: 'solo', family_status: 'just_me' })).toBe('visa_ready');
  });

  it('returns visa_ready regardless of family status', () => {
    expect(getPricingTier({ application_type: 'solo', family_status: 'spouse_only' })).toBe('visa_ready');
    expect(getPricingTier({ application_type: 'solo', family_status: 'spouse_and_children' })).toBe('visa_ready');
    expect(getPricingTier({ application_type: 'solo', family_status: 'children_only' })).toBe('visa_ready');
  });

  it('returns visa_ready regardless of application type', () => {
    expect(getPricingTier({ application_type: 'partnership', family_status: 'just_me' })).toBe('visa_ready');
    expect(getPricingTier({ application_type: 'spousal_partnership', family_status: 'spouse_only' })).toBe('visa_ready');
  });

  it('returns null when quizData is null', () => {
    expect(getPricingTier(null)).toBeNull();
  });

  it('getTierData returns correct data for each package tier', () => {
    expect(getTierData('foundation').price).toBe(990);
    expect(getTierData('investor_ready').price).toBe(390);
    expect(getTierData('interview_prep').price).toBe(290);
    const visaReady = getTierData('visa_ready');
    expect(visaReady.price).toBe(1490);
    expect(visaReady.id).toBe('visa_ready');
  });
});
