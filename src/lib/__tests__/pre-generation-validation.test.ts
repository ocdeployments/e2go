import { validateForGeneration, type PreGenerationValidationResult } from '../pre-generation-validation';

describe('validateForGeneration', () => {
  // Chen's real data (Michael James Chen, 9f981747-...)
  const chenAnswers: Record<string, unknown> = {
    'M3-F-02': 185000, // Total invested
    'M3-F-03': 296000, // Total business cost
    'M3-F-05': ['savings', 'property-sale'],
    'M3-F-NET': 400000,
    'M3-F-09': 'Golden Era Barbershop',
    'business_type': 'franchise',
    franchise_fee: 1000,
    leasehold_improvements: 48000,
    equipment_technology: 22000,
    educational_materials: 18000,
    working_capital: 15000,
    professional_fees: 10000,
    marketing_launch: 71000,
  };

  describe('Chen application (consistent data)', () => {
    let result: PreGenerationValidationResult;

    beforeEach(() => {
      result = validateForGeneration(chenAnswers);
    });

    it('passes all checks', () => {
      expect(result.readyForGeneration).toBe(true);
      expect(result.blockingGaps).toHaveLength(0);
    });

    it('correctly sums breakdown items', () => {
      // 1000 + 48000 + 22000 + 18000 + 15000 + 10000 + 71000 = 185000
      expect(result.investmentBreakdown.breakdownSum).toBe(185000);
      expect(result.investmentBreakdown.breakdownMatchesTotal).toBe(true);
    });

    it('extracts 7 line items', () => {
      expect(result.investmentBreakdown.lineItems).toHaveLength(7);
    });

    it('extracts 2 fund source types', () => {
      expect(result.fundSources.sources).toHaveLength(2);
      expect(result.fundSources.sources.map((s) => s.key)).toEqual(
        expect.arrayContaining(['savings', 'property-sale'])
      );
    });

    it('includes total business cost', () => {
      expect(result.investmentBreakdown.totalBusinessCost).toBe(296000);
    });
  });

  describe('breakdown sum mismatch', () => {
    it('fails when line items don\'t sum to total', () => {
      const answers = {
        ...chenAnswers,
        franchise_fee: 5000, // Changed from 1000 to 5000 — now sums to 189000
      };
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'breakdown_sum_mismatch')).toBe(true);
    });

    it('passes within $1 tolerance', () => {
      const answers = {
        ...chenAnswers,
        'M3-F-02': 185000.50, // Total with cents
        franchise_fee: 1000.50, // Breakdown item with cents
      };
      const result = validateForGeneration(answers);
      // Sum: 1000.50 + 48000 + 22000 + 18000 + 15000 + 10000 + 71000 = 185000.50
      expect(result.investmentBreakdown.breakdownMatchesTotal).toBe(true);
    });
  });

  describe('missing data checks', () => {
    it('fails when investment amount is null', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-02'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'investment_amount_missing')).toBe(true);
    });

    it('fails when fund sources are empty', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-05'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'fund_sources_missing')).toBe(true);
    });

    it('fails when business type is missing', () => {
      const answers = { ...chenAnswers };
      delete answers['business_type'];
      delete answers['qb-type'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'business_type_missing')).toBe(true);
    });

    it('fails when net worth is missing', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-NET'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'net_worth_missing')).toBe(true);
    });

    it('fails when LLC name is missing', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-09'];
      delete answers['llc_name'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'llc_name_missing')).toBe(true);
    });

    it('fails when total business cost is missing', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-03'];
      const result = validateForGeneration(answers);
      expect(result.readyForGeneration).toBe(false);
      expect(result.blockingGaps.some((g) => g.id === 'total_business_cost_missing')).toBe(true);
    });
  });

  describe('return tabs', () => {
    it('returns investment tab for investment-related gaps', () => {
      const answers = { ...chenAnswers };
      delete answers['M3-F-02'];
      const result = validateForGeneration(answers);
      const gap = result.blockingGaps.find((g) => g.id === 'investment_amount_missing');
      expect(gap?.returnTab).toBe('/apply/investment');
    });

    it('returns business tab for business-related gaps', () => {
      const answers = { ...chenAnswers };
      delete answers['business_type'];
      delete answers['qb-type'];
      const result = validateForGeneration(answers);
      const gap = result.blockingGaps.find((g) => g.id === 'business_type_missing');
      expect(gap?.returnTab).toBe('/apply/business');
    });
  });
});
