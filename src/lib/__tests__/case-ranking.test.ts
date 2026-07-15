import { rankCards, rankDocTypes, computeContextualOffers, type QuizProfileSignals } from '@/lib/case-ranking';
import type { CardCompletion } from '@/app/api/case/completion/route';
import type { CardId } from '@/lib/field-registry';

// K-3 Acceptance: unit tests on the ranking function with fixture profiles.

function card(overrides: Partial<CardCompletion> = {}): CardCompletion {
  return { state: 'not_started', have: 0, needed: 3, note: null, ...overrides };
}

const baseProfile: Pick<QuizProfileSignals, 'franchiseInterest' | 'flagCodes'> = {
  franchiseInterest: false,
  flagCodes: [],
};

describe('rankCards', () => {
  it('ranks an unresolved-flag intake card above other incomplete intake cards', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      story: card({ state: 'in_progress', have: 2, needed: 3 }),
      investment_snapshot: card({ state: 'in_progress', have: 1, needed: 4 }),
    };
    const { ordering, nextBestAction } = rankCards(cards, {
      franchiseInterest: false,
      flagCodes: ['W-FAMILY-GIFT'], // maps to investment_snapshot
    });

    expect(ordering.indexOf('investment_snapshot')).toBeLessThan(ordering.indexOf('story'));
    expect(nextBestAction?.cardId).toBe('investment_snapshot');
    expect(nextBestAction?.reason).toBe('resolve-flag');
  });

  it('ranks incomplete intake cards above tool cards regardless of remaining-field count', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      security_background: card({ state: 'in_progress', have: 2, needed: 30 }), // heavy remaining count
      document_vault: card({ state: 'not_started', have: 0, needed: 0 }), // "free" quick win
    };
    const { ordering, nextBestAction } = rankCards(cards, baseProfile);

    expect(ordering.indexOf('security_background')).toBeLessThan(ordering.indexOf('document_vault'));
    expect(nextBestAction?.cardId).toBe('security_background');
    expect(nextBestAction?.reason).toBe('incomplete-intake');
  });

  it('flags a near-complete intake card as a quick-win', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      ties: card({ state: 'in_progress', have: 5, needed: 1 }),
    };
    const { nextBestAction } = rankCards(cards, baseProfile);
    expect(nextBestAction?.reason).toBe('quick-win');
  });

  it('locked cards rank below actionable cards and are never the next best action', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      gap_analysis: card({ state: 'locked', locked: true, needed: 1, note: 'Complete your intake first' }),
      business_details: card({ state: 'not_started', have: 0, needed: 2 }),
    };
    const { ordering, nextBestAction } = rankCards(cards, baseProfile);

    expect(ordering.indexOf('business_details')).toBeLessThan(ordering.indexOf('gap_analysis'));
    expect(nextBestAction?.cardId).toBe('business_details');
  });

  it('boosts fdd_review above other not-started tool cards when franchise-interested', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      fdd_review: card({ state: 'not_started', have: 0, needed: 1 }),
      market_analysis: card({ state: 'not_started', have: 0, needed: 1 }),
    };
    const { ordering, nextBestAction } = rankCards(cards, { franchiseInterest: true, flagCodes: [] });

    expect(ordering.indexOf('fdd_review')).toBeLessThan(ordering.indexOf('market_analysis'));
    expect(nextBestAction?.cardId).toBe('fdd_review');
    expect(nextBestAction?.reason).toBe('franchise-priority');
  });

  it('returns a null nextBestAction when every known card is locked, ready, or generated', () => {
    const cards: Partial<Record<CardId, CardCompletion>> = {
      story: card({ state: 'ready', needed: 0 }),
      gap_analysis: card({ state: 'locked', locked: true, needed: 1 }),
    };
    const { nextBestAction } = rankCards(cards, baseProfile);
    expect(nextBestAction).toBeNull();
  });
});

describe('rankDocTypes', () => {
  it('prioritizes FDD/franchise docs when franchise-interested', () => {
    const order = rankDocTypes({ franchiseInterest: true, businessTypeAnswer: null });
    expect(order[0]).toBe('fdd');
    expect(order).toContain('franchise_agreement');
  });

  it('prioritizes acquisition docs for an acquisition-type business answer', () => {
    const order = rankDocTypes({
      franchiseInterest: false,
      businessTypeAnswer: 'An existing independent business I am acquiring',
    });
    expect(order[0]).toBe('acquisition_financials');
  });

  it('falls back to new-business docs otherwise', () => {
    const order = rankDocTypes({ franchiseInterest: false, businessTypeAnswer: 'Starting a new business from scratch' });
    expect(order[0]).toBe('business_plan');
  });
});

describe('computeContextualOffers', () => {
  it('offers a franchise referral only when franchise-interested with no FDD uploaded yet', () => {
    const withFdd = computeContextualOffers({ franchiseInterest: true, country: null, fundingSourcesText: '' }, 1);
    expect(withFdd.find((o) => o.id === 'franchise')).toBeUndefined();

    const withoutFdd = computeContextualOffers({ franchiseInterest: true, country: null, fundingSourcesText: '' }, 0);
    expect(withoutFdd.find((o) => o.id === 'franchise')).toBeDefined();
  });

  it('offers a banking referral when funding-source text mentions an asset held abroad', () => {
    const offers = computeContextualOffers(
      { franchiseInterest: false, country: null, fundingSourcesText: 'proceeds from selling property' },
      0,
    );
    expect(offers.find((o) => o.id === 'banking')).toBeDefined();
  });

  it('offers an accountant referral for departure-tax countries only', () => {
    const canada = computeContextualOffers({ franchiseInterest: false, country: 'Canada', fundingSourcesText: '' }, 0);
    expect(canada.find((o) => o.id === 'accountant')).toBeDefined();

    const usOnly = computeContextualOffers({ franchiseInterest: false, country: 'Germany', fundingSourcesText: '' }, 0);
    expect(usOnly.find((o) => o.id === 'accountant')).toBeUndefined();
  });

  it('returns no offers for a plain clean profile', () => {
    const offers = computeContextualOffers({ franchiseInterest: false, country: null, fundingSourcesText: 'wages from employment' }, 0);
    expect(offers).toEqual([]);
  });
});
