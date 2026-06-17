/**
 * Interview Question Knowledge Base
 * Maps simulator question IDs → expert answer frameworks from
 * docs/E2_Interview_Questions_Master_Bank.md
 *
 * Used by:
 * - /api/simulator/coaching-report  (inject gold-standard per weak question)
 * - /api/simulator/prep-kit         (full session synthesis, when built)
 * - /api/simulator/evaluate         (score against known answer principles)
 */

export interface InterviewQuestionKnowledge {
  /** IQ-01 through IQ-20 */
  id: string;
  /** Maps to UQ-01, WP-05, BT, etc. in simulator-engine.ts */
  simulatorIds: string[];
  /** Short label for the question */
  topic: string;
  /** Frequency at the consulate window */
  frequency: 'always' | 'very_common' | 'common' | 'situational';
  /** One sentence: the legal or credibility test being applied */
  officerTests: string;
  /** What every strong answer must cover */
  keyPrinciples: string[];
  /** What triggers deeper scrutiny or a negative note */
  redFlags: string[];
  /** Answer architecture — [VARIABLE] placeholders for client data */
  goldStandardStructure: string;
  /** Toronto-specific guidance */
  torontoNote?: string;
}

export const INTERVIEW_KNOWLEDGE_BASE: InterviewQuestionKnowledge[] = [
  {
    id: 'IQ-01',
    simulatorIds: ['UQ-01'],
    topic: 'Business Overview',
    frequency: 'always',
    officerTests:
      'Whether the investor genuinely understands the enterprise they claim to be directing — earned operational knowledge, not a memorized presentation.',
    keyPrinciples: [
      'What the business does (product/service, customer profile)',
      'Where it operates (city, state, physical location)',
      'Current operational status (open, in build-out, pre-launch with specific date)',
      'The business model — how it makes money',
      'Scale indicator: employees, locations, or revenue',
      'The investor\'s specific role (to be expanded separately)',
    ],
    redFlags: [
      'Generic description that could apply to any business in the category',
      'Unable to state the location or current operational status',
      'Reciting a memorized paragraph verbatim',
      'Answer longer than 90 seconds without being asked to continue',
      'No mention of money, employees, or any concrete operational fact',
    ],
    goldStandardStructure:
      '[BUSINESS_NAME] is a [BUSINESS_CATEGORY] based in [CITY, STATE]. We [what it does — one specific sentence]. Our customers are [customer profile]. The business [current status: is currently operational / opened [DATE] / is completing build-out with opening scheduled for [DATE]]. I am the [ROLE]. We currently have [EMPLOYEE_COUNT] employees and project [YEAR_1_REVENUE] in Year 1 revenue.',
    torontoNote:
      'Toronto officers begin reviewing your package before you reach the window. Your business overview must match your cover letter — any discrepancy creates an inconsistency flag.',
  },

  {
    id: 'IQ-02',
    simulatorIds: ['UQ-03', 'WP-01'],
    topic: 'Investment Amount and Allocation',
    frequency: 'always',
    officerTests:
      'Whether the investment is substantial, irrevocably committed, and at risk — and whether the investor knows the allocation, not just the total.',
    keyPrinciples: [
      'The exact total amount — never rounded or approximate',
      'Breakdown by category: franchise fee, build-out, equipment, working capital, professional fees, lease deposit',
      'Confirmation that funds are deployed (past tense: "have been spent")',
      'Confirmation that funds are irrevocably committed — not refundable or in escrow',
      'Reference to documentation (Tab F/H)',
    ],
    redFlags: [
      'Giving only the total with no breakdown',
      'Saying funds are "in the business account" but not yet deployed',
      'Inability to account for a significant portion of the investment',
      'Rounded numbers that don\'t match Tab F documentation',
      'Describing funds as still in Canada or not yet transferred',
    ],
    goldStandardStructure:
      'My total investment is [EXACT_AMOUNT] USD, fully deployed. The allocation is: [FRANCHISE_FEE] to the franchise fee, [BUILDOUT] to build-out and renovations, [EQUIPMENT] to equipment and fixtures, [WORKING_CAPITAL] in working capital, and [PROFESSIONAL_FEES] to professional fees and licenses. All funds have been transferred from Canada and are committed — wire transfer confirmations are in Tab F.',
    torontoNote:
      'Toronto officers check the investment breakdown against Tab F and Tab H. Verbal answers must match documented allocation within a few thousand dollars; discrepancies trigger follow-up questions.',
  },

  {
    id: 'IQ-03',
    simulatorIds: ['UQ-04'],
    topic: 'Source of Funds',
    frequency: 'always',
    officerTests:
      'Lawful origin and full traceability of every dollar invested. Gaps in the paper trail are the #1 reason for 221(g) administrative suspensions.',
    keyPrinciples: [
      'Every source of funds by name and type (savings, property sale, RRSP, gift, etc.)',
      'The exact amount from each source',
      'When each source was accessed (approximate date)',
      'The chronological path: source account → intermediate accounts → U.S. business account',
      'Existence of documentation for each transfer (bank statements, wire records in Tab H)',
    ],
    redFlags: [
      'Saying only "personal savings" without specifying the account, bank, or amount',
      'Multiple sources in the documents but only one mentioned verbally',
      'Inability to explain the path from source to business account',
      'Third-party source (parent, friend) without explaining the gift/loan structure',
      'Mentioning a source that doesn\'t appear in Tab H documentation',
    ],
    goldStandardStructure:
      'My investment of [TOTAL_AMOUNT] came from [NUMBER] sources. [AMOUNT_1] came from [SOURCE_1: e.g., the sale of my property in Pickering in [DATE] — net proceeds deposited to my TD Bank account]. [AMOUNT_2] came from [SOURCE_2: e.g., my RRSP withdrawal in [DATE]]. All funds were then wired to my U.S. business account at [BANK_NAME] — the complete paper trail including statements and wire confirmations is in Tab H.',
    torontoNote:
      'RRSP withdrawals are a known scrutiny area at Toronto. Officers ask how long the RRSP was held, when funds were contributed, and what tax implications were considered. Know these answers in advance.',
  },

  {
    id: 'IQ-04',
    simulatorIds: ['UQ-02', 'WP-03'],
    topic: 'Role and Day-to-Day Management',
    frequency: 'always',
    officerTests:
      'The "develop and direct" requirement under 9 FAM 402.9. The investor must be the operational decision-maker — not a passive investor or figurehead.',
    keyPrinciples: [
      'A specific operational title (President and General Manager, CEO, Managing Director — never just "Owner")',
      '3–4 specific management decisions the investor makes (hiring, budget, vendors, strategy)',
      'Who reports to the investor and how many direct reports',
      'Physical presence expectations (full-time, on-site)',
      'Clear distinction from any hired manager who is not the E-2 investor',
    ],
    redFlags: [
      'Title is "Investor" or "Owner" with no operational title',
      'Vague language: "I\'ll oversee things," "I\'ll be in charge," "I\'ll manage it"',
      'Relying on a hired manager for all operations',
      'Describing the role as part-time or remote',
      'Unable to name one specific decision made last week (for operational businesses)',
    ],
    goldStandardStructure:
      'I am the [TITLE] of [BUSINESS_NAME]. On a daily basis, I am responsible for: staff scheduling and performance management, [SPECIFIC_ACTIVITY_2], [SPECIFIC_ACTIVITY_3], and all financial decisions including [SPECIFIC_EXAMPLE]. I have [NUMBER] direct reports. This is my full-time position — I will be on-site [DAYS/WEEK] and make all operational decisions.',
  },

  {
    id: 'IQ-05',
    simulatorIds: ['UQ-06'],
    topic: 'Employment and Hiring Plan',
    frequency: 'always',
    officerTests:
      'Non-marginality. A business with no job creation plan signals it exists only to support the investor\'s family — the definition of a marginal business.',
    keyPrinciples: [
      'Current employee count (acknowledge honestly even if zero)',
      'Specific Year 1 hires: roles, count, timeline by month — not "eventually"',
      'Whether positions are full-time or part-time',
      'That employees will be U.S. workers (not Canadian transfers)',
      'Logical connection between revenue milestones and hiring timeline',
    ],
    redFlags: [
      '"We\'ll hire when we need to" with no specific plan',
      'All planned hires are family members or co-nationals',
      'Year 1 plan of zero employees with only vague future growth language',
      'Projected revenue that mathematically cannot support the stated employees',
    ],
    goldStandardStructure:
      'We currently have [CURRENT_COUNT] employees. My Year 1 plan is to hire [YEAR_1_COUNT] additional U.S. workers, beginning with [FIRST_HIRE_ROLE] by [MONTH] — when our revenue reaches [MILESTONE] to support the payroll. The full hiring plan is in our business plan, Tab K.',
  },

  {
    id: 'IQ-06',
    simulatorIds: ['UQ-05'],
    topic: 'Revenue Projections and Financial Support',
    frequency: 'very_common',
    officerTests:
      'Whether projections are credible, evidence-based, and whether the business clearly exceeds the marginality threshold.',
    keyPrinciples: [
      'Year 1 and Year 3 revenue figures stated from memory',
      'Evidence base for projections (Item 19 FDD data, prior owner financials, or local market research — never just national statistics)',
      'Break-even month',
      'Year 1 revenue significantly exceeds household income need (non-marginality)',
      'Owner compensation plan and when it starts',
    ],
    redFlags: [
      'Unable to state Year 1 or Year 3 numbers from memory',
      'Projections based only on national industry statistics',
      'Year 1 revenue that barely exceeds household income need',
      'No break-even analysis',
      'Round numbers without explanation',
    ],
    goldStandardStructure:
      'Our Year 1 projection is [YEAR_1_REVENUE], increasing to [YEAR_3_REVENUE] by Year 3. These numbers are supported by [EVIDENCE: the franchisor\'s Item 19 Financial Performance Representation / prior owner\'s 3-year financials / local market analysis]. We expect to break even by Month [BREAK_EVEN_MONTH]. My personal draw will be [COMPENSATION], approximately [X]% of projected revenue — the business is designed to generate significantly more than my household needs.',
  },

  {
    id: 'IQ-07',
    simulatorIds: ['BT'],
    topic: 'Operational Status',
    frequency: 'very_common',
    officerTests:
      'Whether the investment is real and committed — not just a plan on paper.',
    keyPrinciples: [
      'Specific completed steps: LLC formed, EIN obtained, bank account open, lease signed, franchise fee paid, licenses applied for, equipment ordered',
      'What remains before opening (if not yet open)',
      'Expected opening date',
      'Evidence that money has been spent',
    ],
    redFlags: [
      'Business is only an LLC with no other steps taken',
      'Unable to name any concrete step beyond entity formation',
      'Opening date unknown or "whenever the visa comes through"',
      'Lease not signed, franchise fee not paid, no equipment ordered',
    ],
    goldStandardStructure:
      'The business [IS OPERATIONAL: has been operational since [DATE] / IS IN BUILD-OUT: we have completed [STEPS DONE] and are currently [IN PROGRESS STEP]]. We expect to open by [DATE]. To date we have deployed [AMOUNT] in business expenses — receipts and contracts are in Tab F.',
  },

  {
    id: 'IQ-08',
    simulatorIds: ['BT'],
    topic: 'Location Selection and Market Research',
    frequency: 'very_common',
    officerTests:
      'Whether this is a genuine, well-considered investment or an opportunistic visa application with a business chosen only to meet E-2 requirements.',
    keyPrinciples: [
      'Personal connection to the location (prior time there, family, or specific market research)',
      'Market-specific local data — not national statistics',
      'Site visit or discovery day attendance',
      'Connection between investor\'s qualifications and this specific business in this location',
    ],
    redFlags: [
      'Chose location because it was cheap or available',
      'No site visit before committing',
      'Market research based entirely on national statistics',
      'Business category unrelated to investor\'s background with no explanation',
    ],
    goldStandardStructure:
      'I chose [CITY] because [SPECIFIC LOCAL REASON]. I personally visited in [MONTH/YEAR], met with [WHO: the franchisor\'s area rep, existing franchisees, local operators], and verified that [SPECIFIC MARKET INSIGHT]. My background in [RELEVANT EXPERIENCE] directly prepares me for this specific market.',
  },

  {
    id: 'IQ-09',
    simulatorIds: ['BT'],
    topic: 'Break-Even Analysis',
    frequency: 'common',
    officerTests:
      'Whether the investor genuinely understands the financial mechanics of the business they are investing in — not just the top-line projections.',
    keyPrinciples: [
      'The break-even month (specific number)',
      'Monthly fixed costs (rent, payroll, royalties, insurance)',
      'Revenue per unit/client/transaction needed to cover fixed costs',
      'How many customers/units/transactions are needed monthly to break even',
      'Why that volume is achievable',
    ],
    redFlags: [
      'Vague answer ("around Month 12") without knowing the actual mechanics',
      'Unable to state monthly fixed costs',
      'Break-even math inconsistent with stated revenue projections',
    ],
    goldStandardStructure:
      'We expect to break even by Month [NUMBER]. Our fixed monthly costs are approximately [FIXED_COSTS]: [RENT] rent, [PAYROLL] payroll, [ROYALTY]% royalty, and [OTHER]. At [REVENUE_PER_UNIT] per [transaction/client], we need [BREAK_EVEN_VOLUME] per month — our market analysis shows this is achievable by Month [X] based on [EVIDENCE].',
  },

  {
    id: 'IQ-10',
    simulatorIds: ['BT'],
    topic: 'Competition and Differentiation',
    frequency: 'common',
    officerTests:
      'Whether genuine local market research was conducted — not a national market overview.',
    keyPrinciples: [
      'Name 2–3 actual competitors in the specific city/region by name',
      'One specific weakness or gap in the competitor\'s offering',
      'The investor\'s specific differentiator (concrete, not "better service")',
      'Why the chosen location has room for this business',
    ],
    redFlags: [
      '"We will be better than the competition" with no specifics',
      'Naming only national chains without local market knowledge',
      'No knowledge of who is operating in the same city',
    ],
    goldStandardStructure:
      'Our primary competitors in [CITY] are [COMPETITOR_1] and [COMPETITOR_2]. Our advantage is [SPECIFIC_DIFFERENTIATOR]. The local market has [GAP/OPPORTUNITY] that we are positioned to serve, which is why we selected this location.',
  },

  {
    id: 'IQ-11',
    simulatorIds: ['WP-01'],
    topic: 'Source-Specific Funds Drill-Down',
    frequency: 'common',
    officerTests:
      'That the funds are genuinely the investor\'s, from a legitimate source, and not a structured arrangement to hide the true source.',
    keyPrinciples: [
      'Know the dates (acquisition, sale, withdrawal) for every source',
      'Know the amounts to the dollar',
      'Know the legal structure of any third-party funds (gift letter, loan agreement)',
      'Know which bank accounts were involved in sequence',
    ],
    redFlags: [
      'Unable to state when a property was acquired or sold',
      'Inconsistency between verbal statement and Tab H documentation',
      'Third-party funds without a gift letter or loan agreement',
      'RRSP funds contributed very recently before withdrawal (suggests structuring)',
    ],
    goldStandardStructure:
      'I acquired [PROPERTY/ASSET] in [DATE] and [SOLD/WITHDREW] in [DATE]. The net amount was [EXACT_AMOUNT]. The funds were deposited to [ACCOUNT] and I have [DOCUMENTATION TYPE] in Tab H showing the complete timeline.',
    torontoNote:
      'RRSP drill-downs are common at Toronto. Officers also ask about gift amounts and the relationship to the giver. Have the gift letter in Tab H with donor\'s bank statement showing the gift origin.',
  },

  {
    id: 'IQ-12',
    simulatorIds: ['UQ-04'],
    topic: 'Funds Path and Traceability',
    frequency: 'common',
    officerTests:
      'Complete paper trail — every account the money passed through. Gaps create administrative processing.',
    keyPrinciples: [
      'Chronological narrative: source → intermediate Canadian accounts → U.S. business account',
      'Wire transfer amounts and dates',
      'No unexplained stops along the way',
      'Bank names and account types for each leg of the journey',
    ],
    redFlags: [
      'Unable to trace money through every intermediate account',
      'Discrepancy between verbal account and bank statements in Tab H',
      'Multiple unexplained transfers with no explanation',
    ],
    goldStandardStructure:
      'In [MONTH/YEAR], [SOURCE EVENT: my property sold / I withdrew my RRSP]. Net proceeds of [AMOUNT] were deposited to my [BANK] [ACCOUNT_TYPE] account. In [MONTH/YEAR], I transferred [AMOUNT] to my [BANK_2] account. In [MONTH/YEAR], I wired [AMOUNT] USD to my [U.S. BANK] business account in [CITY, STATE]. The complete bank statement trail and wire confirmation are in Tab H.',
  },

  {
    id: 'IQ-13',
    simulatorIds: ['WP-01'],
    topic: 'Funds Deployment Status',
    frequency: 'common',
    officerTests:
      'That the investment is genuinely at risk — funds still in a Canadian account do not qualify.',
    keyPrinciples: [
      'Majority of funds deployed (in U.S. business account or spent)',
      'If some remain uncommitted, explain why and when they will be deployed',
      'Investment is "irrevocably committed" — not contingent on visa approval',
    ],
    redFlags: [
      '"Most of it is still in Canada, I\'m waiting for the visa"',
      'Significant portion described as "committed" but not transferred',
      'Working capital sitting in a Canadian account',
      'Franchise fee not yet paid',
    ],
    goldStandardStructure:
      'All [AMOUNT] of my investment has been deployed. [AMOUNT_1] was wired to the U.S. business account and used for [EXPENSES]. [AMOUNT_2] was paid directly to [FRANCHISOR/VENDOR] for [PURPOSE]. Nothing remains in Canada — the funds are irrevocably committed and at risk.',
  },

  {
    id: 'IQ-14',
    simulatorIds: ['UQ-07'],
    topic: 'Experience and Qualifications',
    frequency: 'very_common',
    officerTests:
      'Whether the investor\'s background makes the business projection credible. Direct industry experience is not required, but there must be a convincing connection.',
    keyPrinciples: [
      'Lead with the most relevant experience (management, financial oversight, client-facing operations)',
      'Draw explicit connections between past roles and the specific demands of this business',
      'Quantify: managed X staff, oversaw $X budget, served X clients',
      'Mention any franchise training completed or scheduled',
    ],
    redFlags: [
      'Background is entirely unrelated with no explanation of the connection',
      'Answer consists only of education credentials with no management experience',
      'Relies entirely on the franchise system without showing personal management capacity',
    ],
    goldStandardStructure:
      'I have [YEARS] years of experience in [MOST_RELEVANT_FIELD]. In my role as [TITLE] at [COMPANY], I [SPECIFIC RELEVANT ACTIVITY: managed a team of X / oversaw a P&L of $X / was responsible for Y]. This translates directly to [BUSINESS_NAME] because [SPECIFIC CONNECTION]. I have also completed [FRANCHISE_TRAINING / INDUSTRY_CERTIFICATION].',
  },

  {
    id: 'IQ-15',
    simulatorIds: ['BT'],
    topic: 'Due Diligence — Research Before Investing',
    frequency: 'common',
    officerTests:
      'Whether this is a genuine investment decision — not just a visa strategy dressed up as a business.',
    keyPrinciples: [
      'Discovery day attendance (or explanation if not attended)',
      'Direct conversations with 2+ existing franchisees',
      'FDD review — specifically Item 19 (financial performance) and Item 21 (financial statements)',
      'Site visits to existing franchise locations',
      'Independent financial review (accountant, attorney)',
    ],
    redFlags: [
      'No franchise discovery day',
      'Never spoke with existing franchisees',
      'Did not review the FDD or cannot discuss Item 19',
    ],
    goldStandardStructure:
      'I attended [FRANCHISOR] Discovery Day in [DATE]. I also spoke directly with [NUMBER] existing franchisees in [STATES] — they confirmed [SPECIFIC FINDING]. I reviewed the FDD, in particular Item 19 which shows [FINANCIAL DATA], and had it reviewed by my attorney [NAME]. I also visited [NUMBER] franchise locations before committing.',
  },

  {
    id: 'IQ-16',
    simulatorIds: ['BT'],
    topic: 'Franchise System Knowledge',
    frequency: 'common',
    officerTests:
      'That the investor actually understands the franchise system they signed a contract with.',
    keyPrinciples: [
      'Initial training: location, duration, curriculum',
      'Ongoing support: field visits, marketing fund, call center, IT systems',
      'Royalty rate and what it covers',
      'Brand fund / marketing contribution percentage',
      'Territory rights',
    ],
    redFlags: [
      'Unable to state the royalty percentage',
      'Does not know what training is provided or has not attended',
      'Cannot describe what support the franchisor provides',
    ],
    goldStandardStructure:
      'The franchisor provides [INITIAL_TRAINING: X weeks of training at their headquarters in [CITY]]. Ongoing, they provide [SUPPORT_LIST: field visits, a dedicated support line, and a proprietary [SYSTEM NAME] management platform]. My royalty obligation is [ROYALTY]% of gross sales, plus [MARKETING]% to the brand marketing fund. I have [TERRITORY_RIGHTS] for [TERRITORY].',
  },

  {
    id: 'IQ-17',
    simulatorIds: ['WP-05'],
    topic: 'Canadian Ties',
    frequency: 'always',
    officerTests:
      'Nonimmigrant intent — the investor must have genuine reasons to return to Canada when E-2 status ends.',
    keyPrinciples: [
      'Property (own or maintain a home, rental property, or substantial lease in Canada)',
      'Family (parents, siblings, extended family remaining in Canada)',
      'Financial ties (Canadian bank accounts open, Canadian investments, RRSP/TFSA)',
      'Provincial health coverage maintenance',
      'Professional ties (memberships, licenses retained)',
    ],
    redFlags: [
      'Sold Canadian home before the interview',
      'All family members relocating to the U.S.',
      'All Canadian accounts closed',
      '"I don\'t really have ties — I plan to make the U.S. my home"',
    ],
    goldStandardStructure:
      'I maintain several substantial ties to Canada. [PROPERTY TIE: I own my home in [CITY], which I am maintaining / I have a rental property in [CITY] generating income]. My [FAMILY TIE: parents / siblings] remain in Canada. My Canadian bank accounts at [BANK] remain active, and I maintain my [PROVINCIAL] health coverage. I also [ADDITIONAL TIE].',
    torontoNote:
      'CRITICAL: Selling your Canadian home before the E-2 interview is among the most common triggers for a 214(b) immigrant intent finding at Toronto. Documented consulate experience confirms officers specifically ask about this. Maintain the Canadian home until after the visa is approved.',
  },

  {
    id: 'IQ-18',
    simulatorIds: ['UQ-09'],
    topic: 'Nonimmigrant Intent — Return to Canada',
    frequency: 'very_common',
    officerTests:
      'Whether the investor understands and accepts the nonimmigrant nature of the E-2. A framing question — must show E-2 is not a permanent residency strategy.',
    keyPrinciples: [
      'Explicitly acknowledge: "The E-2 is a nonimmigrant visa — I understand that"',
      'State a concrete scenario that would cause return to Canada',
      'Do NOT volunteer any mention of green card plans',
      'Do NOT suggest indefinite stay intent',
    ],
    redFlags: [
      'Volunteering that you plan to apply for a green card',
      '"I plan to stay forever" or any statement suggesting indefinite intent',
      'Unable to name any circumstance that would cause you to return',
    ],
    goldStandardStructure:
      'I understand the E-2 is a nonimmigrant visa. My focus is on building [BUSINESS_NAME] into a successful business. If the business were no longer viable, or if I were no longer eligible for E-2 status, I would return to Canada — my home and family ties remain there. I have no plans to pursue permanent residency.',
  },

  {
    id: 'IQ-19',
    simulatorIds: ['UQ-08'],
    topic: 'Contingency If Visa Denied',
    frequency: 'common',
    officerTests:
      'Two tests simultaneously: (1) investor has Canadian presence to return to, and (2) the business investment is real and will not simply be abandoned.',
    keyPrinciples: [
      'Acknowledge the investment is real and already made',
      'State the preservation plan (manage remotely, engage local manager, work with franchisor)',
      'Confirm the plan to refile or pursue alternative pathway',
      'Confirm Canadian base to return to',
    ],
    redFlags: [
      '"Everything would fall apart" (implies investment was contingent on visa approval)',
      '"I would just stay here on a tourist visa" (immigration violation)',
      'No mention of returning to Canada',
    ],
    goldStandardStructure:
      'The investment has already been made — the business is real regardless of today\'s outcome. If the visa is not approved, I would [SPECIFIC PLAN: manage the business remotely from Canada with a local operations manager / work with the franchisor to maintain operations]. I would then refile with my attorney, addressing any concerns raised. My home in [CITY] is available to return to.',
  },

  {
    id: 'IQ-20',
    simulatorIds: ['UQ-10'],
    topic: 'Social Media and Security Questions (2026)',
    frequency: 'always',
    officerTests:
      'DS-160 accuracy (social media disclosure completeness), background vetting through real-time search, and new security screening for personal safety history.',
    keyPrinciples: [
      'Know every social media account listed on DS-160 — and confirm the disclosure is complete',
      'Be prepared to explain any business-related or public content in search results',
      'For the safety question: answer honestly and briefly ("No, I have not feared for my safety in Canada")',
      'Know what appears when you Google yourself before the interview',
    ],
    redFlags: [
      'DS-160 lists LinkedIn/Facebook but you also have Instagram or X — incomplete disclosure',
      'Search results show content contradicting the application (e.g., posts about "moving to the U.S. permanently")',
      'Hesitation on the safety question',
    ],
    goldStandardStructure:
      'My social media accounts are [LIST — matches DS-160 exactly]. [For search result questions: That post/article is about [ACCURATE EXPLANATION]. / For safety question: No, I have not — Canada is my home and I have always felt safe there.]',
    torontoNote:
      'As of May 2026, Toronto officers are conducting active social media vetting during the interview — they may search your name at the window. They are also required to ask the personal safety screening question. Prepare for both. Review your public posts before the interview for any content that could be read as immigrant intent.',
  },
];

/**
 * Look up gold-standard knowledge for a given simulator question ID.
 * Returns null if the question ID is not in the knowledge base.
 */
export function getQuestionKnowledge(simulatorQuestionId: string): InterviewQuestionKnowledge | null {
  return (
    INTERVIEW_KNOWLEDGE_BASE.find((k) =>
      k.simulatorIds.some(
        (sid) =>
          simulatorQuestionId === sid ||
          simulatorQuestionId.startsWith(sid.replace('-X', '-'))
      )
    ) ?? null
  );
}

/**
 * Build a compact knowledge block for prompt injection.
 * Returns a string describing what a strong answer requires for this question.
 */
export function buildKnowledgeBlock(knowledge: InterviewQuestionKnowledge): string {
  return [
    `QUESTION TYPE: ${knowledge.topic}`,
    `WHAT THE OFFICER IS TESTING: ${knowledge.officerTests}`,
    `WHAT A STRONG ANSWER MUST COVER:\n${knowledge.keyPrinciples.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}`,
    `RED FLAGS THAT HURT THIS ANSWER:\n${knowledge.redFlags.map((r) => `  - ${r}`).join('\n')}`,
    `GOLD-STANDARD ANSWER STRUCTURE: ${knowledge.goldStandardStructure}`,
    knowledge.torontoNote ? `TORONTO CONSULATE NOTE: ${knowledge.torontoNote}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}
