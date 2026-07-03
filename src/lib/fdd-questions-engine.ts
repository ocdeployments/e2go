// ============================================================================
// FDD Intelligence — Questions Generator + Profile Match (FDD-4)
// ============================================================================
// Generates targeted questions for the investor to ask the franchisor, based on:
//   - Flags raised by the scoring engine
//   - FDD data gaps
//   - Standard due diligence questions (always included)
//   - CaseProfile match scoring

import Anthropic from '@anthropic-ai/sdk';
import type { FddExtractedFields } from '@/types/fdd';
import type { ScoringResult } from '@/lib/fdd-scoring-engine';

const anthropic = new Anthropic();

// ============================================================================
// Types
// ============================================================================

export type QuestionAudience = 'franchisor_dev_rep' | 'validation_franchisee' | 'former_franchisee' | 'attorney';
export type QuestionImportance = 'critical' | 'important' | 'recommended';

export interface GeneratedQuestion {
  id: string;
  text: string;
  ask_of: QuestionAudience;
  triggered_by: string;
  importance: QuestionImportance;
  what_to_listen_for: string;
  category: string;
  // FDD page that triggered this question, when known — only populated for
  // flag-derived questions (the scoring engine's FddFlag.page); standard
  // due-diligence and data-gap questions aren't tied to a specific page.
  page: number | null;
}

export interface ProfileMatch {
  overall_score: number; // 0–100
  investment_match: boolean;
  net_worth_match: boolean;
  industry_fit: 'strong' | 'neutral' | 'weak';
  gaps: Array<{ dimension: string; explanation: string; action: string }>;
  recommendation: string;
}

export interface QuestionsResult {
  questions: GeneratedQuestion[];
  priority_questions: GeneratedQuestion[]; // importance === 'critical'
  total_count: number;
  profile_match: ProfileMatch | null;
}

// ============================================================================
// Static question bank — flag triggers
// ============================================================================

// Maps flag key → GeneratedQuestion template (text filled at runtime)
const FLAG_QUESTIONS: Record<string, Omit<GeneratedQuestion, 'id' | 'triggered_by' | 'page'>> = {
  fdd_stale: {
    text: 'Is the FDD I received the current year disclosure? If not, can you provide the most recently updated FDD?',
    ask_of: 'franchisor_dev_rep',
    importance: 'critical',
    what_to_listen_for: 'They should immediately offer the current year FDD. Any hesitation or claim that "nothing material has changed" is a red flag — material changes must be disclosed.',
    category: 'Document Integrity',
  },
  state_registration: {
    text: 'Is your franchise offering currently registered and approved to be sold in [target state]? Can you provide proof of registration?',
    ask_of: 'franchisor_dev_rep',
    importance: 'critical',
    what_to_listen_for: 'They must confirm registration or explain why the state is exempt. If they say "we\'re working on it" or "we can sign but not close" in a registration state, that is legally problematic.',
    category: 'Legal Compliance',
  },
  litigation: {
    text: 'Item 3 discloses several franchisee-initiated lawsuits. Can you walk me through the nature of these disputes and how they were resolved?',
    ask_of: 'franchisor_dev_rep',
    importance: 'critical',
    what_to_listen_for: 'Specific, factual answers about each case. Vague answers, blame on the franchisee, or dismissal of the pattern are red flags. Multiple suits for similar reasons suggest systemic problems.',
    category: 'Litigation',
  },
  bankruptcy: {
    text: 'The FDD discloses a bankruptcy history. What were the circumstances, and how has the business model changed since?',
    ask_of: 'franchisor_dev_rep',
    importance: 'critical',
    what_to_listen_for: 'A specific, coherent explanation of what failed and what structural changes were made. Evasiveness or minimization suggests the underlying problems may not be resolved.',
    category: 'Financial History',
  },
  cherry_pick: {
    text: 'Item 19 seems to include only a subset of system units. Why were certain units excluded from the financial performance representation?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'A legitimate answer would explain excluded units by category (e.g. units open less than 12 months). If they cannot give a clear reason, assume the excluded units performed worse.',
    category: 'Financial Performance',
  },
  company_only_i19: {
    text: 'Item 19 reflects company-owned units only. Do you have any data on franchisee unit performance that you can share informally?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'If they are unwilling to share even directional franchisee data, you must rely entirely on franchisee validation calls. Company units typically have advantages (lower rent, no royalties) that inflate performance.',
    category: 'Financial Performance',
  },
  revenue_variability: {
    text: 'The mean AUV is significantly higher than the median, suggesting wide performance variability. What drives the difference between top performers and median performers?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'Specific, actionable factors (market size, owner involvement, local marketing spend). If they say "it depends on the operator" without specifics, ask what the highest-performing operators do differently.',
    category: 'Financial Performance',
  },
  working_capital: {
    text: 'Item 7\'s working capital estimate appears to cover fewer than 6 months of operations. What is your average time to break-even, and what do franchisees typically spend beyond the Item 7 range?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'Honest answer should acknowledge that Item 7 is a minimum, not a target. Ask to speak with franchisees who are now profitable about their actual ramp-up costs.',
    category: 'Investment',
  },
  renewal_terms: {
    text: 'Item 17 indicates renewal requires signing the then-current agreement, which may differ from today\'s terms. Can you show me the most recent franchise agreement vs. the one being signed today?',
    ask_of: 'attorney',
    importance: 'important',
    what_to_listen_for: 'Your attorney should compare royalty rates, territory rights, and operational requirements between current and historical agreements. Materially worse renewal terms are a serious long-term risk.',
    category: 'Legal Terms',
  },
  cure_period: {
    text: 'The cure period in Item 17 is very short. Has the franchisor ever terminated a franchise for a curable default where the franchisee believes they had no reasonable chance to cure?',
    ask_of: 'former_franchisee',
    importance: 'important',
    what_to_listen_for: 'Former franchisees who experienced termination will give you the most honest account. Compare their experience to what the FDD says.',
    category: 'Legal Terms',
  },
  noncompete: {
    // text is filled at runtime from fields.post_termination_noncompete_years /
    // _radius_miles — see generateQuestions(); this template string is only
    // used as a fallback when neither value was extracted.
    text: 'The post-termination non-compete term and radius are not stated in the FDD I received. What are the exact terms, and has this clause been enforced against former franchisees, and under what circumstances?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'They should be transparent about enforcement history. Your attorney should assess enforceability in your target state — many states will not enforce broad non-competes.',
    category: 'Legal Terms',
  },
  fee_escalation: {
    text: 'Item 6 indicates the franchisor can increase fees. What is the historical pattern of fee increases, and is there a cap or notice period?',
    ask_of: 'validation_franchisee',
    importance: 'important',
    what_to_listen_for: 'Ask franchisees who have been in the system 5+ years. A pattern of incremental fee increases that outpace revenue growth is an early warning sign.',
    category: 'Fees',
  },
  ecommerce_carveout: {
    text: 'The territory section notes an e-commerce carve-out. Can you explain what the franchisor sells online and whether those sales cannibalise franchisee revenue?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'They should quantify online sales as a percentage of system revenue and explain how local territories are protected. Lack of data suggests this issue has not been thought through.',
    category: 'Territory',
  },
  entity_transfer: {
    text: 'Item 17 indicates you cannot transfer the franchise to an LLC or corporation. Is there a process for entity structures that work with E-2 visa requirements?',
    ask_of: 'attorney',
    importance: 'critical',
    what_to_listen_for: 'An E-2 visa typically requires investment through a business entity, not as an individual. If the franchise agreement prevents entity ownership, this is a structural incompatibility that must be resolved before signing.',
    category: 'E-2 Visa Compatibility',
  },
  rofr: {
    text: 'If I decide to sell the business in the future, how has the right of first refusal been exercised historically? Has it prevented franchisees from selling at market value?',
    ask_of: 'former_franchisee',
    importance: 'important',
    what_to_listen_for: 'Former franchisees who sold will know whether ROFR was exercised and whether the offer they received was at fair market value. This directly affects your exit strategy.',
    category: 'Exit Terms',
  },
  covid_data: {
    text: 'Item 19 data is from the COVID period. Can you share any directional information about how system performance has recovered to pre-COVID levels?',
    ask_of: 'franchisor_dev_rep',
    importance: 'important',
    what_to_listen_for: 'They should be able to share that recovery is complete or in progress. If they cannot, the Item 19 data substantially overstates or understates current economics.',
    category: 'Financial Performance',
  },
};

// ============================================================================
// Standard due diligence questions (always included)
// ============================================================================

const STANDARD_QUESTIONS: Omit<GeneratedQuestion, 'id' | 'page'>[] = [
  {
    text: 'Can you connect me with 10–15 current franchisees in markets similar to mine, including some who have been open less than 2 years?',
    ask_of: 'franchisor_dev_rep',
    triggered_by: 'standard_due_diligence',
    importance: 'critical',
    what_to_listen_for: 'Any resistance to providing a large, unfiltered list is a red flag. Ask for franchisees chosen randomly from Item 20, not a curated list.',
    category: 'Validation',
  },
  {
    text: 'What percentage of your franchisees renew at the end of their initial term?',
    ask_of: 'franchisor_dev_rep',
    triggered_by: 'standard_due_diligence',
    importance: 'critical',
    what_to_listen_for: 'A high renewal rate (>80%) indicates satisfied franchisees. A low rate indicates poor economics or relationship problems. Compare their answer to the Item 20 outlet data.',
    category: 'System Health',
  },
  {
    text: 'What was the average time to profitability (operating cash flow positive) for franchisees who opened in the last 3 years?',
    ask_of: 'validation_franchisee',
    triggered_by: 'standard_due_diligence',
    importance: 'critical',
    what_to_listen_for: 'Franchisees who have reached profitability will give you a realistic timeline. Compare across 3–5 franchisees in similar markets. Dramatic variation suggests unpredictable unit economics.',
    category: 'Financial Performance',
  },
  {
    text: 'How active is the franchisee association, and does it have any formal input into the operations manual or marketing fund decisions?',
    ask_of: 'validation_franchisee',
    triggered_by: 'standard_due_diligence',
    importance: 'recommended',
    what_to_listen_for: 'A strong, independent franchisee association is a positive signal. A franchisor-controlled "association" that has no real input is cosmetic.',
    category: 'Franchisee Relations',
  },
  {
    text: 'How often is the operations manual updated, and how are franchisees notified of changes?',
    ask_of: 'franchisor_dev_rep',
    triggered_by: 'standard_due_diligence',
    importance: 'recommended',
    what_to_listen_for: 'Frequent, well-communicated updates show an active support organization. No updates in years suggests stagnation.',
    category: 'Support',
  },
  {
    text: 'Knowing what you know now, would you sign the franchise agreement again?',
    ask_of: 'validation_franchisee',
    triggered_by: 'standard_due_diligence',
    importance: 'important',
    what_to_listen_for: 'This is the most powerful single question. Pause after asking it. The hesitation, tone, and specifics of the answer tell you more than any document.',
    category: 'Validation',
  },
  {
    text: 'What is the process for visa holder or foreign national ownership, and have you supported E-2 visa investors before?',
    ask_of: 'franchisor_dev_rep',
    triggered_by: 'e2_visa_standard',
    importance: 'critical',
    what_to_listen_for: 'Franchisors who have supported E-2 investors before will have a clear process. A blank response suggests you would be the first, which means more risk and more friction.',
    category: 'E-2 Visa Compatibility',
  },
  {
    text: 'Is there a state-specific addendum for my target state, and what are the material differences from the standard agreement?',
    ask_of: 'attorney',
    triggered_by: 'e2_visa_standard',
    importance: 'important',
    what_to_listen_for: 'Your attorney must review any state addendum. Some states (CA, MD, WA) impose additional franchisor obligations or franchisee protections that change the economics of the deal.',
    category: 'Legal Compliance',
  },
];

// ============================================================================
// CaseProfile match scoring
// ============================================================================

interface CaseProfileSubset {
  investor_liquid_capital?: number | null;
  investor_net_worth?: number | null;
  industry_interest?: string | null;
  archetype?: string | null;
  source_of_funds_score?: number | null;
  management_role_score?: number | null;
}

function computeProfileMatch(
  fields: FddExtractedFields,
  profile: CaseProfileSubset | null
): ProfileMatch | null {
  if (!profile) return null;

  const gaps: ProfileMatch['gaps'] = [];
  let score = 100;

  // Investment match
  const totalMin = fields.total_investment_min?.value as number | null;
  const liquid = profile.investor_liquid_capital;

  let investmentMatch = true;
  if (totalMin != null && liquid != null) {
    if (liquid < totalMin * 0.7) {
      investmentMatch = false;
      score -= 30;
      gaps.push({
        dimension: 'Liquid Capital',
        explanation: `Available liquid capital ($${liquid.toLocaleString()}) is below 70% of the minimum investment ($${totalMin.toLocaleString()}).`,
        action: 'Either source additional capital (RRSP, home equity, investor partner) or target a lower-cost franchise brand.',
      });
    } else if (liquid < totalMin) {
      score -= 10;
      gaps.push({
        dimension: 'Liquid Capital',
        explanation: `Available liquid capital ($${liquid.toLocaleString()}) covers the minimum investment ($${totalMin.toLocaleString()}) but leaves minimal working capital buffer.`,
        action: 'Ensure your Item 7 working capital estimate is sufficient, or plan an additional credit line before opening.',
      });
    }
  }

  // Net worth match (E-2 proportionality)
  const netWorth = profile.investor_net_worth;
  let netWorthMatch = true;
  if (totalMin != null && netWorth != null) {
    const ratio = totalMin / netWorth;
    if (ratio < 0.15) {
      // Proportionality may be questioned (too small relative to wealth)
      score -= 5;
    } else if (ratio > 0.90) {
      netWorthMatch = false;
      score -= 20;
      gaps.push({
        dimension: 'Net Worth',
        explanation: 'Investment represents over 90% of total net worth — proportionality argument will be extremely difficult.',
        action: 'Build additional documentation of other assets, or consider a lower total investment to improve the proportionality ratio.',
      });
    }
  }

  // Industry fit
  let industryFit: ProfileMatch['industry_fit'] = 'neutral';
  const industryInterest = (profile.industry_interest ?? '').toLowerCase();
  const franchiseName = ((fields.franchisor_legal_name?.value as string) ?? '').toLowerCase();

  const matchTerms: Record<string, string[]> = {
    food: ['food', 'restaurant', 'qsr', 'hospitality'],
    health: ['health', 'fitness', 'wellness', 'medical'],
    home: ['home', 'cleaning', 'painting', 'lawn'],
    tech: ['technology', 'it', 'digital', 'software'],
    education: ['education', 'tutoring', 'learning', 'child'],
    retail: ['retail', 'store', 'shop'],
  };

  for (const [sector, terms] of Object.entries(matchTerms)) {
    const franchiseMatch = terms.some(t => franchiseName.includes(t));
    const interestMatch = terms.some(t => industryInterest.includes(t)) || industryInterest.includes(sector);
    if (franchiseMatch && interestMatch) {
      industryFit = 'strong';
      break;
    } else if (franchiseMatch && !interestMatch) {
      industryFit = 'weak';
      score -= 10;
      gaps.push({
        dimension: 'Industry Fit',
        explanation: `Your stated industry interest (${profile.industry_interest ?? 'not specified'}) does not align with this franchise's sector.`,
        action: 'Strong industry knowledge is not required but helps. Consider whether you have passion for this business type — you will manage it daily.',
      });
    }
  }

  // Management role score (from case profile)
  const mgmtScore = profile.management_role_score;
  if (mgmtScore != null && mgmtScore < 40) {
    score -= 15;
    gaps.push({
      dimension: 'Management Credentials',
      explanation: 'Your case file has limited management or business ownership documentation.',
      action: 'Strengthen your business plan narrative to demonstrate operational capacity. Your immigration attorney will help frame prior experience.',
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));

  let recommendation: string;
  if (finalScore >= 80) {
    recommendation = 'Strong profile match — your investment capacity, background, and interests align well with this franchise opportunity.';
  } else if (finalScore >= 60) {
    recommendation = 'Viable match with some gaps — addressable through additional documentation or capital planning before proceeding.';
  } else if (finalScore >= 40) {
    recommendation = 'Partial match — significant gaps exist. Review the items below with your immigration attorney before committing.';
  } else {
    recommendation = 'Poor match — core eligibility or financial gaps make this franchise challenging for your specific situation. Consider alternatives.';
  }

  return {
    overall_score: finalScore,
    investment_match: investmentMatch,
    net_worth_match: netWorthMatch,
    industry_fit: industryFit,
    gaps,
    recommendation,
  };
}

// ============================================================================
// Main question generation
// ============================================================================

export async function generateQuestions(
  fields: FddExtractedFields,
  scoring: ScoringResult,
  profile: CaseProfileSubset | null
): Promise<QuestionsResult> {
  const questions: GeneratedQuestion[] = [];
  let idCounter = 0;

  function makeId() { return `q_${++idCounter}`; }

  // 1. Flag-triggered questions
  for (const flag of scoring.flags) {
    const template = FLAG_QUESTIONS[flag.key];
    if (template) {
      let text = template.text;
      if (flag.key === 'noncompete') {
        const years = fields.post_termination_noncompete_years?.value;
        const miles = fields.post_termination_noncompete_radius_miles?.value;
        if (years != null && miles != null) {
          text = `The post-termination non-compete is ${years} year${years === 1 ? '' : 's'} / ${miles} mile${miles === 1 ? '' : 's'}. Has this clause been enforced against former franchisees, and under what circumstances?`;
        } else if (years != null) {
          text = `The post-termination non-compete term is ${years} year${years === 1 ? '' : 's'} (radius not stated in the FDD I received — please clarify). Has this clause been enforced against former franchisees, and under what circumstances?`;
        } else if (miles != null) {
          text = `The post-termination non-compete radius is ${miles} mile${miles === 1 ? '' : 's'} (term not stated in the FDD I received — please clarify). Has this clause been enforced against former franchisees, and under what circumstances?`;
        }
      }
      questions.push({
        id: makeId(),
        triggered_by: `flag:${flag.key}`,
        ...template,
        text,
        importance: flag.severity === 'critical' ? 'critical' : template.importance,
        page: flag.page,
      });
    }
  }

  // 2. Data gap questions — fields that came back null or low-confidence
  if (!fields.item19_present?.value) {
    questions.push({
      id: makeId(),
      text: 'You have not filed an Item 19 Financial Performance Representation. Can you share any informal performance data — average first-year revenue, break-even timeline, or owner income ranges?',
      ask_of: 'franchisor_dev_rep',
      triggered_by: 'gap:item19_absent',
      importance: 'critical',
      what_to_listen_for: 'If they cannot or will not share any data, your only information source is franchisee validation calls. Without Item 19, financial modelling is purely speculative.',
      category: 'Financial Performance',
      page: null,
    });
  }

  if (!fields.royalty_rate_pct?.value) {
    questions.push({
      id: makeId(),
      text: 'The royalty structure was not clearly stated in my copy of the FDD. Can you confirm the exact royalty percentage and the revenue base it is calculated on (gross vs. net)?',
      ask_of: 'franchisor_dev_rep',
      triggered_by: 'gap:royalty_unclear',
      importance: 'important',
      what_to_listen_for: 'Royalty on gross revenue (most common) vs. net revenue (rare) dramatically changes your cost structure. Confirm in writing.',
      category: 'Fees',
      page: null,
    });
  }

  if (!fields.total_investment_min?.value) {
    questions.push({
      id: makeId(),
      text: 'The total investment range in Item 7 was unclear. Can you walk me through a realistic first-year capital requirement including all costs not listed in Item 7?',
      ask_of: 'franchisor_dev_rep',
      triggered_by: 'gap:investment_unclear',
      importance: 'important',
      what_to_listen_for: 'Many costs are excluded from Item 7 by design (professional fees, travel, lost income during training). Press for a real first-year number including everything.',
      category: 'Investment',
      page: null,
    });
  }

  if (fields.transfer_to_entity_allowed?.value === undefined) {
    questions.push({
      id: makeId(),
      text: 'Can the franchise be owned through a corporation or LLC from day one, and is there any restriction on foreign national ownership through a U.S. entity?',
      ask_of: 'attorney',
      triggered_by: 'gap:entity_ownership_unclear',
      importance: 'critical',
      what_to_listen_for: 'For E-2 investors, the franchise must be structured through a U.S. entity. Any restriction on corporate ownership requires an attorney to resolve before signing.',
      category: 'E-2 Visa Compatibility',
      page: null,
    });
  }

  // 3. Standard due diligence questions (always included)
  for (const q of STANDARD_QUESTIONS) {
    questions.push({ id: makeId(), page: null, ...q });
  }

  // 4. LLM-generated bespoke questions (5 targeted to this specific FDD)
  try {
    const bespokeQuestions = await generateBespokeQuestions(fields, scoring);
    for (const q of bespokeQuestions) {
      questions.push({ id: makeId(), page: null, ...q });
    }
  } catch (err) {
    console.error('Bespoke question generation error:', err);
  }

  const priorityQuestions = questions.filter(q => q.importance === 'critical');

  // Profile match
  const profileMatch = computeProfileMatch(fields, profile);

  return {
    questions,
    priority_questions: priorityQuestions,
    total_count: questions.length,
    profile_match: profileMatch,
  };
}

// ============================================================================
// LLM bespoke question generation
// ============================================================================

async function generateBespokeQuestions(
  fields: FddExtractedFields,
  scoring: ScoringResult
): Promise<Omit<GeneratedQuestion, 'id' | 'page'>[]> {
  const franchiseName = (fields.franchisor_legal_name?.value as string) ?? 'the franchise';
  const totalMin = fields.total_investment_min?.value as number | null;
  const auv = fields.item19_median?.value as number | null ?? fields.item19_auv?.value as number | null;
  const royalty = fields.royalty_rate_pct?.value as number | null;
  const territory = fields.territory_type?.value as string | null;
  const flagSummary = scoring.flags.map(f => f.label).join('; ') || 'None';

  const prompt = `You are a senior franchise attorney and franchise development director. An investor is doing due diligence on ${franchiseName}.

Key data:
- Total investment: ${totalMin ? `$${totalMin.toLocaleString()}` : 'Unknown'}
- AUV (median): ${auv ? `$${auv.toLocaleString()}` : 'Not disclosed'}
- Royalty rate: ${royalty !== null ? `${(royalty * 100).toFixed(1)}%` : 'Unknown'}
- Territory type: ${territory ?? 'Unknown'}
- Active flags: ${flagSummary}

Generate exactly 5 highly specific due diligence questions that are NOT covered by generic franchise checklists.
Each question should be uniquely informed by the data above.
Focus on: operational risks specific to this franchise type, financial model weaknesses, E-2 visa-specific concerns.

Return as a JSON array of objects with this shape:
{
  "text": "The exact question to ask",
  "ask_of": "franchisor_dev_rep" | "validation_franchisee" | "former_franchisee" | "attorney",
  "triggered_by": "bespoke_analysis",
  "importance": "important" | "recommended",
  "what_to_listen_for": "What a good vs. bad answer sounds like",
  "category": "Short category name"
}

Return only the JSON array, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const raw = JSON.parse(match[0]) as Omit<GeneratedQuestion, 'id'>[];
    return raw.filter(q => q.text && q.ask_of && q.what_to_listen_for);
  } catch {
    return [];
  }
}
