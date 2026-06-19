import { createClient } from '@supabase/supabase-js';
import { CaseProfile } from '@/types/case-profile';

export interface FranchiseBrand {
  id: string;
  name: string;
  category: string;
  minInvestment: number;
  maxInvestment: number;
  minNetWorth: number;
  description: string;
  website: string;
}

export interface FranchiseMatch {
  brand: FranchiseBrand;
  score: number;
  reasons: string[];
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseRangeToCeiling(range: string): number {
  // Handles both key format (500k_1m, under_250k, over_2_5m) and
  // dollar-string format ("Under $100,000", "$300,000 – $700,000", etc.)
  if (!range) return 500_000; // safe default

  const r = range.toLowerCase().replace(/[\s,$]/g, '');

  // Key format
  if (r === 'under_100k' || r === 'under100k') return 100_000;
  if (r === 'under_250k' || r === 'under250k') return 250_000;
  if (r === '100k_300k') return 300_000;
  if (r === '250k_500k') return 500_000;
  if (r === '300k_700k') return 700_000;
  if (r === '500k_1m') return 1_000_000;
  if (r === '700k_plus' || r === '700k+') return 2_000_000;
  if (r === '1m_2_5m') return 2_500_000;
  if (r === 'over_2_5m' || r === 'over2_5m') return 5_000_000;

  // Dollar-string format — take the upper bound
  const millions = r.match(/(\d+(?:\.\d+)?)m/);
  if (millions) return parseFloat(millions[1]) * 1_000_000;

  const thousands = r.match(/(\d+(?:\.\d+)?)k/);
  if (thousands) {
    const num = parseFloat(thousands[1]) * 1_000;
    return num < 200_000 ? num : num; // keep as-is
  }

  // Plain number in string
  const num = parseInt(r.replace(/\D/g, ''), 10);
  return isNaN(num) ? 500_000 : num;
}

function parseRangeToFloor(range: string): number {
  if (!range) return 0;

  const r = range.toLowerCase().replace(/[\s,$]/g, '');

  if (r === 'under_100k' || r === 'under_250k') return 0;
  if (r === '100k_300k') return 100_000;
  if (r === '250k_500k') return 250_000;
  if (r === '300k_700k') return 300_000;
  if (r === '500k_1m') return 500_000;
  if (r === '700k_plus' || r === '700k+') return 700_000;
  if (r === '1m_2_5m') return 1_000_000;
  if (r === 'over_2_5m' || r === 'over2_5m') return 2_500_000;

  return 0;
}

export async function matchFranchises(profile: CaseProfile): Promise<FranchiseMatch[]> {
  const supabase = getSupabaseAdmin();

  const { data: rows } = await supabase
    .from('franchise_brands')
    .select('id, name, category, min_investment, max_investment, min_net_worth, description, website')
    .eq('active', true);

  if (!rows || rows.length === 0) return [];

  const brands: FranchiseBrand[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    minInvestment: r.min_investment,
    maxInvestment: r.max_investment,
    minNetWorth: r.min_net_worth,
    description: r.description ?? '',
    website: r.website ?? '',
  }));

  const investmentCeiling = parseRangeToCeiling(profile.investmentRange || profile.netWorthRange);
  const netWorthFloor = parseRangeToFloor(profile.netWorthRange);

  const scored: FranchiseMatch[] = brands
    .filter(
      (b) =>
        b.minInvestment <= investmentCeiling && b.minNetWorth <= Math.max(netWorthFloor, 1)
    )
    .map((brand) => {
      const reasons: string[] = [];
      let score = 0;

      // Industry match (40 pts)
      const industryScore = brand.category === profile.industryInterest ? 40 : 0;
      if (industryScore > 0) reasons.push('Industry match');
      score += industryScore;

      // Investment fit — within 80% of ceiling (30 pts)
      const fitScore = brand.minInvestment <= investmentCeiling * 0.8 ? 30 : 15;
      if (fitScore === 30) reasons.push('Investment fits your range');
      score += fitScore;

      // Net worth buffer — floor >= 1.5× brand minimum (30 pts)
      const bufferScore =
        netWorthFloor >= brand.minNetWorth * 1.5 || netWorthFloor === 0 ? 30 : 15;
      if (bufferScore === 30) reasons.push('Net worth buffer adequate');
      score += bufferScore;

      return { brand, score, reasons };
    });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
