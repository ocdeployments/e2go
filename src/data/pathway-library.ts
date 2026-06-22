/**
 * Pathway Library — 12 creative E-2 eligibility restructuring pathways.
 * Source of truth: docs/PATHWAY_LIBRARY.md
 * This file contains pure data — no logic. The pathway-engine.ts reads from here.
 *
 * Every pathway is legally grounded in U.S. immigration law and Toronto
 * consulate practice. None of these are loopholes — they are standard
 * attorney-recommended structures that non-obvious to applicants.
 */

export type PathwayCategory =
  | 'family_restructure'
  | 'investment_restructure'
  | 'business_model'
  | 'nationality';

export type PathwayImpact = 'transformative' | 'significant' | 'moderate';

export interface PathwayDefinition {
  id: string;
  title: string;
  category: PathwayCategory;
  impact: PathwayImpact;
  headline: string;
  whoThisHelps: string;
  rationale: string;
  mechanism: string[];
  requirements: string[];
  tradeoffs: string[];
  timeline: 'Immediate' | '1–3 months' | '3–6 months' | '6–12 months' | '12+ months';
  requiresAttorney: boolean;
  scoringWeights: {
    visaCoverage: number;
    workAuthorization: number;
    capitalEfficiency: number;
    applicationComplexity: number;
    approvalConfidence: number;
  };
}

export const PATHWAY_LIBRARY: PathwayDefinition[] = [
  {
    id: 'P-01',
    title: 'Adult child as co-investor',
    category: 'family_restructure',
    impact: 'transformative',
    headline: 'An adult child (21+) cannot be your dependent — but they can get their own E-2 visa as a co-investor.',
    whoThisHelps: 'Your adult child (21 or older)',
    rationale: 'E-2 derivative status requires children to be under 21 and unmarried. An adult child is excluded from your visa automatically. However, if they make a genuine capital contribution to the business and take an active management role, they qualify for their own E-2 principal visa — independently of yours.',
    mechanism: [
      'Restructure the business as a multi-member LLC or formal partnership',
      'Adult child contributes their own capital — funds must be traceable to them, not a gift from you',
      'Adult child is named as managing member with documented authority over specific business functions',
      'Each of you files a separate E-2 application with your own source-of-funds documentation',
      'Adult child\'s spouse (if married) gets E-2S status with full U.S. work authorization',
      'Adult child\'s children under 21 (if any) get E-2Y dependent status',
    ],
    requirements: [
      'Adult child must be a citizen of a treaty country (e.g., Canadian citizen)',
      'Investment must be the adult child\'s own funds — not a recoverable gift from parent',
      'Adult child must have a genuine active management role (not a paper position)',
      'Business must be substantial enough to support two principals with real responsibilities',
      'Both investors\' equity must independently meet the proportionality test',
    ],
    tradeoffs: [
      'Requires two separate E-2 applications, two sets of filings and fees',
      'Adult child\'s source of funds is traced independently — must demonstrate own financial capacity',
      'If the business is too small for two genuine principals, officer may question the structure',
      'A stronger alternative may be two linked but legally separate businesses',
    ],
    timeline: '3–6 months',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 95, workAuthorization: 80, capitalEfficiency: 70, applicationComplexity: 50, approvalConfidence: 80 },
  },
  {
    id: 'P-02',
    title: 'Spouse as principal investor (nationality switch)',
    category: 'nationality',
    impact: 'transformative',
    headline: 'If your spouse holds treaty country citizenship, they can be the principal E-2 investor — giving you full U.S. work authorization as their dependent.',
    whoThisHelps: 'Your spouse',
    rationale: 'When the primary breadwinner holds citizenship only of a non-treaty country, the application hits a hard wall. But if their spouse holds treaty country citizenship (e.g., Canadian), the structure can be reversed: spouse becomes the E-2 principal, non-treaty spouse enters as an E-2S dependent. As of January 30, 2022, E-2S spouses receive full U.S. work authorization — meaning the non-treaty spouse can still run the business day-to-day.',
    mechanism: [
      'Treaty-citizen spouse is listed as the E-2 principal investor with at least 50% equity',
      'Investment is made in the treaty spouse\'s name and attributable to them',
      'Treaty spouse demonstrates genuine develop-and-direct authority (strategic decisions, hiring, capital)',
      'Non-treaty spouse enters as E-2S dependent with full work authorization (any employer, any field)',
      'Non-treaty spouse may handle daily operations — this is legal as long as the treaty spouse retains genuine directorial authority',
      'Both spouses are physically present in the U.S.',
    ],
    requirements: [
      'Spouses must be legally married — common-law unions are not recognized by U.S. immigration',
      'Treaty spouse must hold genuine equity (at least 50%) and have actual management authority',
      'Treaty spouse must be able to articulate their business role credibly at the consular interview',
      'Investment must be in the treaty spouse\'s name or clearly attributable to them',
      'Treaty spouse must be physically present in the U.S. — remote management from Canada does not qualify',
    ],
    tradeoffs: [
      'If the officer perceives the treaty spouse as a "visa holder of convenience" with no real role, the application will be denied',
      'The treaty spouse must be prepared to discuss the business in detail at the Toronto interview',
      'Requires careful role documentation: organizational chart, operating agreement, decision log',
    ],
    timeline: '3–6 months',
    requiresAttorney: true,
    scoringWeights: { visaCoverage: 90, workAuthorization: 100, capitalEfficiency: 90, applicationComplexity: 60, approvalConfidence: 75 },
  },
  {
    id: 'P-03',
    title: 'Adult child as E-2 treaty employee',
    category: 'family_restructure',
    impact: 'significant',
    headline: 'An adult child with a qualifying executive or specialist role can get their own E-2 visa as a treaty employee — no investment required.',
    whoThisHelps: 'Your adult child (21 or older)',
    rationale: 'The E-2 Treaty Employee visa allows key employees of an E-2 enterprise to obtain their own E-2 status without investing. The role must qualify as executive, supervisory, or essential-skills — a higher bar than simply being employed, but often achievable for family members who take on genuine leadership roles in the business.',
    mechanism: [
      'You hold the full investment and E-2 principal visa',
      'Adult child is hired as a key employee in a qualifying role',
      'Adult child files their own E-2 Treaty Employee application (separate from yours)',
      'Adult child\'s spouse gets E-2S status with full work authorization',
      'Adult child\'s children under 21 get E-2Y dependent status',
    ],
    requirements: [
      'Adult child must be a citizen of a treaty country (same treaty as you, or any E-2 treaty country)',
      'Role must qualify under one of three categories:',
      '  • Executive: high-level management, strategic decision-making authority across the enterprise',
      '  • Supervisory: manages other employees (not just one person); controls a significant function',
      '  • Essential Skills: specialized knowledge not readily available in the U.S. labor market',
      'The employer-employee relationship must be genuine (market-rate salary, documented reporting structure)',
      'Business must be large enough to genuinely need and sustain this position',
    ],
    tradeoffs: [
      '"Essential skills" is the most challenged category — must be genuinely unique to your business, not generic skills any worker could provide',
      'The officer may probe whether the position could be filled by an American worker',
      'Adult child is restricted to working only at your E-2 business — no outside employment',
      'If you lose E-2 status, the treaty employee visa also falls',
    ],
    timeline: '3–6 months',
    requiresAttorney: true,
    scoringWeights: { visaCoverage: 80, workAuthorization: 60, capitalEfficiency: 95, applicationComplexity: 55, approvalConfidence: 65 },
  },
  {
    id: 'P-04',
    title: 'Adult child: F-1 student → OPT → E-2 employee (phased pathway)',
    category: 'family_restructure',
    impact: 'significant',
    headline: 'An adult child enrolled in a U.S. university can enter on an F-1 visa independently, then transition to E-2 employee status after graduation.',
    whoThisHelps: 'Your adult child who is enrolled in or applying to a U.S. university',
    rationale: 'This is a phased strategy — not a workaround. The adult child enters on a standard F-1 Student Visa completely independently of your E-2 application. After completing their degree, they use Optional Practical Training (OPT) to gain work experience. Once they have the credentials and your business has grown, they join as an E-2 treaty employee in an executive or essential-skills role.',
    mechanism: [
      'Phase 1: Adult child applies to a SEVP-approved U.S. university and enters on F-1',
      'Phase 2: Adult child completes degree while maintaining full-time enrollment',
      'Phase 3: Adult child applies for OPT — 12 months of work authorization after graduation (36 months for STEM degrees)',
      'Phase 4: Once business needs an executive or specialist role, adult child transitions to E-2 Treaty Employee',
      'Phase 4 alternative: Adult child accumulates capital and joins as co-investor → own E-2 principal',
    ],
    requirements: [
      'Adult child must be accepted to and enrolled in a SEVP-approved U.S. institution',
      'Adult child must maintain full-time enrollment throughout F-1 status',
      'F-1 and your E-2 are completely independent — your visa neither helps nor hinders theirs',
      'Transition to E-2 employee requires meeting the executive/supervisory/essential-skills test at that time',
    ],
    tradeoffs: [
      'Long-horizon strategy — 4+ years to degree completion',
      'OPT employment authorization may not align with the business\'s needs at that time',
      'H-1B lottery (if needed after OPT) introduces significant uncertainty',
      'Adult child cannot work off-campus during F-1 without OPT authorization',
    ],
    timeline: '12+ months',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 75, workAuthorization: 70, capitalEfficiency: 95, applicationComplexity: 80, approvalConfidence: 85 },
  },
  {
    id: 'P-05',
    title: 'Common-law partner: formalize or restructure',
    category: 'family_restructure',
    impact: 'transformative',
    headline: 'U.S. immigration does not recognize common-law relationships — your partner will not receive E-2S status unless you are legally married or restructure.',
    whoThisHelps: 'Your common-law partner',
    rationale: 'Many Canadian couples are in common-law relationships recognized under provincial law but not by U.S. immigration. Without a legal marriage, your partner has no automatic derivative status and no U.S. work authorization — regardless of how long you have been together. This pathway surfaces three solutions.',
    mechanism: [
      'Option A — Formalize the marriage: Legally marry before filing the E-2 application. The U.S. Consulate in Toronto accepts Canadian civil marriages. This is the cleanest and simplest path.',
      'Option B — Partner as co-investor: Your partner contributes their own capital (at least 50% ownership) and applies for their own E-2 principal visa. Their investment must be their own funds, not a gift from you.',
      'Option C — Partner as treaty employee: If your partner holds treaty nationality and qualifies for an executive, supervisory, or essential-skills role in your business, they can apply as an E-2 Treaty Employee.',
    ],
    requirements: [
      'Option A: Legal marriage ceremony registered with a Canadian government authority; common-law declarations do not qualify',
      'Option B: Partner\'s investment must be their own funds; formal partnership agreement required',
      'Option C: Partner must be a treaty national and hold a qualifying role',
    ],
    tradeoffs: [
      'Option A is not always feasible on short timelines (though Canadian civil marriages can be arranged quickly)',
      'Option B requires the partner to have independent investment capital',
      'Option C requires a role that can withstand officer scrutiny',
      'Without any of these options, your partner cannot accompany you to the U.S. on your E-2',
    ],
    timeline: '1–3 months',
    requiresAttorney: true,
    scoringWeights: { visaCoverage: 95, workAuthorization: 90, capitalEfficiency: 70, applicationComplexity: 55, approvalConfidence: 80 },
  },
  {
    id: 'P-06',
    title: 'Low capital: proportionality reframing',
    category: 'investment_restructure',
    impact: 'significant',
    headline: 'E-2 has no fixed investment minimum — what matters is your investment as a proportion of total business cost. A smaller business at high proportionality is stronger than a large one at low proportionality.',
    whoThisHelps: 'You',
    rationale: 'The E-2 substantiality test is a proportionality analysis, not a fixed dollar threshold. A $100,000 investment in a $120,000 business (83%) is significantly stronger than a $300,000 investment in a $2,000,000 business (15%). Additionally, funds borrowed from a bank against your personal assets (home equity, savings) count as at-risk investment — expanding what you can commit.',
    mechanism: [
      'Calculate your proportionality ratio: your investment ÷ total business acquisition/start-up cost',
      'Target businesses where your capital represents 70%+ of Item 7 total investment (from the FDD)',
      'Consider borrowed funds: a home equity loan or personal secured loan is at-risk capital that counts',
      'Explore franchisor financing: some franchisors offer equipment financing that reduces the cash needed while keeping your proportionality high',
      'Choose a lower total-cost franchise model where your capital is clearly substantial relative to the total',
    ],
    requirements: [
      'Borrowed funds must be secured against YOUR personal assets (home, savings) — not against the business being purchased',
      'Funds must be irrevocably committed to the enterprise at time of application',
      'Proportionality is assessed at the time of filing — not after the business grows',
    ],
    tradeoffs: [
      'Choosing a lower-cost business to improve proportionality may limit revenue potential',
      'Home equity loans carry personal financial risk if the business fails',
      'Toronto consulate has shown skepticism below $100K for service businesses and $150K for franchise/physical-location businesses — proportionality must be compelling',
    ],
    timeline: 'Immediate',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 60, workAuthorization: 60, capitalEfficiency: 95, applicationComplexity: 85, approvalConfidence: 80 },
  },
  {
    id: 'P-07',
    title: 'Multi-unit development agreement for substantiality',
    category: 'investment_restructure',
    impact: 'significant',
    headline: 'Signing a multi-unit development agreement (2–3 franchise units) multiplies your total investment and makes substantiality unambiguous.',
    whoThisHelps: 'You',
    rationale: 'A single franchise unit at $80,000–$150,000 may raise substantiality questions depending on the franchisor\'s Item 7 total cost. A multi-unit development agreement (MUDA) for 2–3 units increases the total committed investment to a range that is clearly substantial by any standard, while also signaling serious investor commitment that franchisors reward with priority territory access.',
    mechanism: [
      'Negotiate a multi-unit development agreement with the franchisor for 2–3 units in your territory',
      'Total committed investment across all units is documented (e.g., $80K × 3 = $240K)',
      'The development timeline (e.g., unit 1 open year 1, unit 2 year 2) is documented in the agreement',
      'E-2 application uses total MUDA investment as the substantiality figure',
      'Officer sees a committed, staged investment plan rather than a single borderline unit',
    ],
    requirements: [
      'Franchisor must offer multi-unit development agreements for your target territory',
      'Development timeline must be realistic and documented',
      'Funds for future units should be committed (e.g., in escrow or demonstrably available)',
    ],
    tradeoffs: [
      'Higher total capital commitment — you must have or be able to raise the full MUDA amount',
      'Greater operational complexity: managing 2–3 locations vs. one',
      'Not all franchise systems offer MUDAs or offer them in the territory you want',
    ],
    timeline: '3–6 months',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 60, workAuthorization: 60, capitalEfficiency: 65, applicationComplexity: 60, approvalConfidence: 90 },
  },
  {
    id: 'P-08',
    title: 'Non-treaty investor: treaty-national family member as co-applicant',
    category: 'nationality',
    impact: 'transformative',
    headline: 'A family member who holds treaty country citizenship can be your co-investor — giving them (and potentially you) a path to E-2 status.',
    whoThisHelps: 'A family member (sibling, parent, or other) who holds Canadian or other treaty nationality',
    rationale: 'When the primary investor holds only non-treaty country citizenship, the E-2 is blocked. But if another family member — a sibling, parent, or adult child — holds treaty country citizenship and has capital to invest, they can become the 50% principal investor and apply for their own E-2. This also opens a path for the non-treaty investor to enter as an employee or work under a different visa structure.',
    mechanism: [
      'Treaty-national family member becomes a 50% co-investor with genuine management authority',
      'Both investors file E-2 applications independently',
      'Treaty family member\'s spouse gets E-2S with full work authorization',
      'Treaty family member\'s children under 21 get E-2Y status',
      'Non-treaty investor may need separate visa arrangement (B-1 business visits, TN if applicable, or long-term planning toward E-2 through naturalization)',
    ],
    requirements: [
      'Family member must genuinely hold treaty country citizenship (Canadian passport verifiable)',
      'Family member\'s investment must be their own funds, properly documented',
      'Family member must have an active, documented role in the business',
      'If dual citizenship: always apply under the treaty country nationality — the non-treaty citizenship is irrelevant to E-2',
    ],
    tradeoffs: [
      'Non-treaty investor does not automatically get E-2 status from this structure',
      'Requires another family member to commit capital, time, and their own immigration status to the business',
      'If the family member\'s primary residence is abroad, they must be willing to relocate to the U.S.',
    ],
    timeline: '3–6 months',
    requiresAttorney: true,
    scoringWeights: { visaCoverage: 75, workAuthorization: 70, capitalEfficiency: 65, applicationComplexity: 45, approvalConfidence: 75 },
  },
  {
    id: 'P-09',
    title: 'Married child under 21: alternative paths',
    category: 'family_restructure',
    impact: 'moderate',
    headline: 'A child who is under 21 but legally married cannot be your E-2Y dependent — but they have other options.',
    whoThisHelps: 'Your child who is under 21 but married',
    rationale: 'E-2Y derivative status requires a child to be BOTH under 21 AND unmarried. A married child, even at age 18 or 19, does not qualify as your dependent. However, if they hold treaty nationality and have a qualifying role in your business, they can apply for their own E-2 Treaty Employee status.',
    mechanism: [
      'Option A — Treaty Employee: If the child holds treaty nationality and qualifies for an executive, supervisory, or essential-skills role, they apply for E-2 Treaty Employee. Their spouse also gets E-2S.',
      'Option B — Co-Investor: If the child has their own capital, they become a co-investor and apply as an E-2 principal. Their spouse gets E-2S with full work authorization.',
      'Option C — Separate visa: If neither above applies, the child may need to enter under a different visa category (F-1 student, TN professional, etc.) independently.',
    ],
    requirements: [
      'Treaty Employee path: child must be a treaty national with a qualifying senior role',
      'Co-investor path: child must have own traceable investment capital',
      'Child\'s own spouse would receive E-2S derivative status under either option',
    ],
    tradeoffs: [
      'Neither path is automatic — each requires its own application with its own merits',
      'Treaty employee path is contingent on your E-2 remaining valid',
    ],
    timeline: '3–6 months',
    requiresAttorney: true,
    scoringWeights: { visaCoverage: 70, workAuthorization: 65, capitalEfficiency: 80, applicationComplexity: 50, approvalConfidence: 70 },
  },
  {
    id: 'P-10',
    title: 'Develop-and-direct restructure for passive investors',
    category: 'business_model',
    impact: 'significant',
    headline: 'The E-2 requires you to genuinely develop and direct the business from the U.S. — hiring a full-time manager to run everything while you remain in Canada does not qualify.',
    whoThisHelps: 'You',
    rationale: '"Develop and direct" does not mean you must perform daily operational tasks — but it does require genuine strategic authority and physical U.S. presence. Hiring a general manager is fine as long as the GM reports to you and you retain final authority on major decisions. An investor who simply wires money and stays in Canada will be denied.',
    mechanism: [
      'Retain the GM role or a formal C-suite title (President, CEO, Director of Operations)',
      'Document your decision-making authority: hiring/firing, capital allocation, expansion decisions',
      'Hold regular documented management meetings (weekly, even by video)',
      'Maintain a U.S. address and be physically present in the U.S. as your primary residence',
      'The hired manager\'s role is operational — they implement decisions you make, not make them independently',
      'Your organizational chart shows you above the GM, not the reverse',
    ],
    requirements: [
      'You must actually relocate to and reside in the U.S. — not manage remotely from Canada',
      'You must be reachable for and involved in major business decisions',
      'Your role must be documented in the operating agreement as the controlling executive',
    ],
    tradeoffs: [
      'A 100% absentee structure — investor in Canada, manager runs everything — will be denied',
      'You must be credibly prepared to discuss your management role at the Toronto interview',
      'Requires genuine personal involvement, which may conflict with a passive investment mindset',
    ],
    timeline: 'Immediate',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 60, workAuthorization: 60, capitalEfficiency: 80, applicationComplexity: 85, approvalConfidence: 80 },
  },
  {
    id: 'P-11',
    title: 'Sibling or parent as co-investor (family multiplier)',
    category: 'family_restructure',
    impact: 'significant',
    headline: 'A sibling or parent with capital can co-invest in your business — giving both families their own E-2 visas from a single enterprise.',
    whoThisHelps: 'A sibling, parent, or other family member who wants to relocate to the U.S.',
    rationale: 'One business can support two E-2 principal visas if two investors each hold at least 50% and each has a genuine active role. Each principal\'s spouse gets E-2S with full work authorization, and each family\'s children under 21 get E-2Y status. This is a powerful multiplier: one enterprise, two entire families admitted to the U.S.',
    mechanism: [
      'Restructure the business as a 50/50 partnership or multi-member LLC',
      'Each investor contributes their own documented capital',
      'Each investor is assigned distinct management responsibilities (e.g., one handles operations, one handles sales/growth)',
      'Each investor files their own separate E-2 application with their own source-of-funds documentation',
      'Each investor\'s spouse gets E-2S; each investor\'s children under 21 get E-2Y',
    ],
    requirements: [
      'Co-investor must hold treaty country citizenship',
      'Co-investor must have genuine capital (own funds, not a loan from you)',
      'Business must be large enough to support two principals with real, distinct responsibilities',
      'Both investors\' proportional investments must independently satisfy the substantiality test',
    ],
    tradeoffs: [
      'Requires two complete E-2 applications — double the cost and paperwork',
      'Officer will probe whether both investors have genuine, non-duplicative roles',
      'If the business fails to genuinely support two directors, the structure is vulnerable',
    ],
    timeline: '3–6 months',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 95, workAuthorization: 90, capitalEfficiency: 65, applicationComplexity: 45, approvalConfidence: 75 },
  },
  {
    id: 'P-12',
    title: 'Business model pivot away from solo/marginal structure',
    category: 'business_model',
    impact: 'significant',
    headline: 'A solo consulting or single-operator business is structurally marginal under E-2 rules — pivoting to a service firm, franchise, or agency model creates jobs and defeats the marginality flag.',
    whoThisHelps: 'You',
    rationale: 'The E-2 "non-marginal" requirement means the business must do more than support just the investor\'s household. A solo consultant, independent contractor, or one-person professional practice — by design — generates no employment. This is a structural problem, not a documentation problem. The fix is a business model that inherently creates jobs.',
    mechanism: [
      'Option A — Agency model: Pivot from solo consultant to consulting agency; hire 2–3 FTE employees under you',
      'Option B — Franchise: Choose a franchise model with built-in staffing requirements (e.g., home care, food service, fitness)',
      'Option C — Multi-practitioner clinic: Solo therapist/accountant/doctor pivots to a practice with additional practitioners',
      'In all cases: include a documented hiring plan with specific roles, timelines, and salary projections in your business plan',
      'Signed employment offer letters or staffing agency agreements strengthen the non-marginality case',
    ],
    requirements: [
      'Business plan must show concrete hiring within 12 months of operation',
      'The jobs must be for U.S. workers (not just for you and your family)',
      'Revenue projections must support the payroll — not just the owner\'s income',
    ],
    tradeoffs: [
      'Higher operating costs — employees require salary, benefits, management overhead',
      'Requires a genuine shift in business model, not just adding employees to a solo operation on paper',
      'Franchise option adds franchisor relationship complexity and royalty costs',
    ],
    timeline: '3–6 months',
    requiresAttorney: false,
    scoringWeights: { visaCoverage: 60, workAuthorization: 60, capitalEfficiency: 70, applicationComplexity: 75, approvalConfidence: 80 },
  },
];
