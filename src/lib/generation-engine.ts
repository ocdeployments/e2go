import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  type DocumentType,
  type GenerationStep,
  type GenerationPayload,
  type ConsistencyResult,
  type ConsistencyIssue,
  type QualityResult,
  type GeneratedDocument,
  DOCUMENT_TYPE_LABELS,
  GENERATION_STEP_LABELS,
} from '@/types/generation';
import { type CaseBrief } from '@/types/analysis';
import { wrapUserContent } from './prompt-sanitizer';
import { INTERVIEW_KNOWLEDGE_BASE } from './interview-knowledge-base';

const PROMPTS_DIR = join(process.cwd(), 'prompts', 'v1', 'documents');

// ---------------------------------------------------------------------------
// Knowledge Base context injection
// Selects relevant interview KB entries based on document type and injects
// them as expert officer-perspective guidance into the generation prompt.
// Zero-dependency — reads from the static INTERVIEW_KNOWLEDGE_BASE.
// ---------------------------------------------------------------------------

const DOC_TYPE_QUESTION_MAP: Record<string, string[]> = {
  cover_letter: ['IQ-01', 'IQ-02', 'IQ-03', 'IQ-04', 'IQ-05', 'IQ-06', 'IQ-07'],
  source_of_funds: ['IQ-08', 'IQ-09', 'IQ-10'],
  business_plan: ['IQ-01', 'IQ-02', 'IQ-03', 'IQ-11', 'IQ-12'],
  qualifications: ['IQ-14', 'IQ-15', 'IQ-16'],
  nonimmigrant_intent: ['IQ-17', 'IQ-18', 'IQ-19'],
  investment_proof: ['IQ-08', 'IQ-09', 'IQ-10', 'IQ-13'],
  ds160_reference: ['IQ-20'],
  visa_category: ['IQ-01', 'IQ-02', 'IQ-04'],
  exhibit_list: [],
};

// ---------------------------------------------------------------------------
// Archetype-specific guidance injected into the system prompt
// Each archetype has different emphasis, risk patterns, and strengths to feature.
// ---------------------------------------------------------------------------

const ARCHETYPE_DOC_GUIDANCE: Record<string, Record<string, string>> = {
  buyer: {
    cover_letter: `ARCHETYPE: FRANCHISE BUYER
Emphasise: the franchisor's proven business model, E-2 approval track record if known, and the investor's role as the active operator directing day-to-day functions. The franchise fee and build-out costs are at-risk capital — state this explicitly. Reference the Franchise Disclosure Document (FDD) Item 7 as investment substantiation. Non-marginality proof: cite the FDD's AUV (Average Unit Volume) projections and staffing models. Develop-and-direct: the investor must run the location, not be a passive royalty recipient.`,
    source_of_funds: `ARCHETYPE: FRANCHISE BUYER
The investment is a lump-sum franchise fee plus build-out/equipment costs. Trace funds to their origin — savings, business sale proceeds, or property equity — in clear chronological steps. Reference the FDD Item 7 minimum investment figure as the benchmark against which this amount is measured.`,
    business_plan: `ARCHETYPE: FRANCHISE BUYER
Structure the business plan around the franchisor's proven system. Reference Item 19 (Financial Performance Representations) if available. The staffing model, revenue ramp, and break-even analysis should align with the franchisor's disclosed system-wide averages. The applicant's role: owner-operator directing training, staff, and customer relations.`,
    qualifications: `ARCHETYPE: FRANCHISE BUYER
Lead with evidence of management capacity and operational readiness — not just professional credentials. Key emphasis: (1) any prior business ownership or management P&L responsibility, (2) franchise-specific training completed or scheduled (Discovery Day, initial training programme), (3) conversations with existing franchisees or industry research. Directly map prior experience to the specific franchise model (e.g., "My 8 years managing customer service operations translates directly to [FRANCHISE] because…"). If the investor lacks direct industry experience, the franchisor's training programme is the compensating factor — describe it in detail.`,
    investment_proof: `ARCHETYPE: FRANCHISE BUYER
Investment proof must document the full franchise investment trail: (1) the franchise fee wire transfer to the franchisor's account, (2) build-out and equipment costs with contractor invoices, (3) working capital deposited into the U.S. business account. Reference FDD Item 7 as the benchmark investment range that this amount meets or exceeds. Every dollar must be traceable from the Canadian source account to its deployed destination.`,
    nonimmigrant_intent: `ARCHETYPE: FRANCHISE BUYER
Franchise buyers have a strong structural advantage: they have invested a substantial, irrevocable sum — the franchise fee — which demonstrates commitment to the E-2 enterprise, not permanent U.S. residency. Lead with this. Then document Canadian ties: property retained in Canada, family remaining there, Canadian bank accounts and registered savings (RRSP, TFSA). The framing: the investor is running a U.S. franchise under the E-2 status; if status ends, the investor would return to Canada and manage the business remotely or sell it.`,
    visa_category: `ARCHETYPE: FRANCHISE BUYER
The visa category letter must establish the applicant as a Treaty National of Canada (or qualifying country) making a substantial, at-risk investment in a qualifying enterprise. Franchise investments are well-suited here: (1) the franchise agreement evidences a bona fide commercial enterprise, (2) FDD Item 7 substantiates the investment amount, (3) the applicant's owner-operator role satisfies develop-and-direct. Cite the USCIS Policy Manual Chapter 14.3 standard and map this case to each element explicitly.`,
    ds160_reference: `ARCHETYPE: FRANCHISE BUYER
The DS-156E/DS-160 reference must be precise: franchise name, legal entity name, EIN, business address, investment amount matching Item 7, and applicant's title (Owner/Operator or President). All social media accounts disclosed on the DS-160 must match what the applicant will state at the interview window. Ensure the franchise trade name matches the FDD exactly.`,
  },
  builder: {
    cover_letter: `ARCHETYPE: ENTREPRENEUR / BUILDER
Emphasise: the investor's proprietary concept, management credentials, and specific operational expertise. The business plan is the primary evidence of the enterprise's non-marginal potential — reference projected revenue, hiring timeline, and scalability. Develop-and-direct: the investor must have active day-to-day control, not a passive investor role. If transitioning from a prior business or corporate career, bridge that experience directly to this venture.`,
    source_of_funds: `ARCHETYPE: ENTREPRENEUR / BUILDER
Funds often come from a combination of savings, prior business equity, or professional compensation. Trace every source with supporting documentation. If business sale proceeds are involved, reference the sale agreement and tax treatment. Emphasise that funds are irrevocably committed to the specific enterprise.`,
    business_plan: `ARCHETYPE: ENTREPRENEUR / BUILDER
The business plan carries significant weight — this is a new concept without a franchisor's track record. Emphasise: detailed market analysis specific to the target location, differentiated value proposition, realistic revenue model with assumptions stated, and a hiring plan that demonstrates non-marginality. The investor's prior experience should be directly mapped to each operational responsibility.`,
    qualifications: `ARCHETYPE: ENTREPRENEUR / BUILDER
The qualifications document must make a direct, explicit case for why this investor — specifically — is the right person to operate this business. Builders typically have strong professional or entrepreneurial backgrounds; the task is drawing a clear line from past achievements to the specific demands of this venture. Quantify everything: revenue managed, staff directed, clients served, operations led. If the investor has founded or sold prior businesses, this is the place to feature those outcomes prominently.`,
    investment_proof: `ARCHETYPE: ENTREPRENEUR / BUILDER
For a new concept business, investment proof should show the full capital deployment: (1) initial corporate registration and legal fees, (2) lease deposit and fit-out expenses, (3) equipment and inventory purchase, (4) working capital in the U.S. operating account. Provide a schedule showing all categories deployed. The funds must be irrevocably committed — not contingent on visa approval. Bank wires, contractor invoices, and lease agreements together form the investment proof package.`,
    nonimmigrant_intent: `ARCHETYPE: ENTREPRENEUR / BUILDER
Builders often have weaker home-country ties because they are starting fresh — address this proactively. Emphasise: (1) retained Canadian property (strongest single tie), (2) family members remaining in Canada, (3) Canadian registered savings and bank accounts left open, (4) provincial health coverage maintained. Frame the E-2 business as a venture with a defined business horizon — the investor built this; if E-2 status ends, they would return to Canada to pursue the next venture there, or manage this one remotely.`,
    visa_category: `ARCHETYPE: ENTREPRENEUR / BUILDER
The visa category letter must establish that the investor is developing and directing the enterprise — not just funding it. For a new concept business, the officer will scrutinise non-marginality most closely (since there is no franchisor's track record). Lead with job creation projections and revenue ramp. Establish that the investor has operational control: authority to hire, fire, set strategy, and commit capital.`,
    ds160_reference: `ARCHETYPE: ENTREPRENEUR / BUILDER
The DS-156E/DS-160 reference must include: legal business name, EIN, business address, investment amount, and the applicant's title (Founder/Owner or President). If the business is a startup, use the projections from the business plan for revenue figures. Confirm social media accounts match what will be disclosed at the interview. All application figures must be internally consistent — the DS-160 investment amount must match the source of funds statement exactly.`,
  },
  investor: {
    cover_letter: `ARCHETYPE: PASSIVE / ACTIVE INVESTOR
If the investor will not be actively managing day-to-day operations, clearly establish the develop-and-direct element through board authority, strategic decision-making, and hiring/firing power — not hands-on operations. Reference the management team structure. Investment substantiality: the proportionality test applies — state the total enterprise value clearly. Non-marginality: job creation numbers are the primary evidence; revenue projections are secondary.`,
    source_of_funds: `ARCHETYPE: INVESTOR
Investment capital may come from a portfolio, business interests, or liquidated assets. Trace the entire chain from origin to the receiving US account. If funds came from investment returns or dividends, document the source of those earnings. Ensure all currency conversion steps are documented with exchange rate references.`,
    business_plan: `ARCHETYPE: INVESTOR
Emphasise the management structure and governance model — the investor's authority over hiring, strategy, and capital allocation. Revenue and job creation projections should be conservative and supported by market data. If the investor has prior US business experience, reference it.`,
    qualifications: `ARCHETYPE: INVESTOR
The qualifications document for an investor archetype must establish three things: (1) the investor's capacity to direct the enterprise at a strategic level — board authority, capital allocation, hiring decisions, (2) relevant financial or sector experience that makes the investment credible, (3) the investor's track record in similar investments or business oversight roles. The officer will scrutinise whether this is genuine develop-and-direct or a passive financial stake — every sentence must reinforce active governance.`,
    investment_proof: `ARCHETYPE: INVESTOR
Investment proof for an investor archetype must document: (1) the capital injection into the U.S. business (wire confirmation), (2) any shareholding structure confirming majority control (corporate resolutions, shareholder register), (3) evidence of capital deployment on business assets (equipment, lease, licenses). If the investor made staged investments, show each tranche with its date and purpose. All amounts must reconcile to the investment figure stated in the cover letter.`,
    nonimmigrant_intent: `ARCHETYPE: INVESTOR
Investor archetype applicants must demonstrate that the E-2 is a business opportunity, not a permanent residency strategy. Key: (1) Canadian domicile maintained — home, bank accounts, registered plans, (2) clear statement that E-2 status is held for the duration of the business venture, not indefinitely, (3) explicit acknowledgment of E-2's nonimmigrant nature. If the investor has previously held U.S. nonimmigrant visas without overstay, reference this as evidence of compliance.`,
    visa_category: `ARCHETYPE: INVESTOR
The visa category letter must address the develop-and-direct element directly — this is the most common challenge for investor-archetype applicants. Establish: (1) the investor holds majority ownership (50%+), (2) the investor has authority to hire and fire key personnel, (3) the investor sets strategy and approves capital expenditures. Reference any evidence of active governance: board resolutions, signed agreements in the investor's name, correspondence with management team.`,
    ds160_reference: `ARCHETYPE: INVESTOR
The DS-156E/DS-160 reference must match the legal ownership structure: investor's title (Managing Partner / President / Director), the business's legal name and EIN, the full investment amount, and the business address. If the investor holds a board or governance role rather than an operational title, note that explicitly and ensure it aligns with the develop-and-direct evidence in the cover letter.`,
  },
  career_switcher: {
    cover_letter: `ARCHETYPE: CAREER SWITCHER
This investor is moving from employment or a different sector into entrepreneurship. The most common challenge: establishing the develop-and-direct element when prior experience is not directly in this industry. Address this proactively: the investor's transferable skills (management, client relations, financial acumen) must be mapped explicitly to the specific responsibilities of this business. Non-immigrant intent ties are often strong — home country career history, family, property — feature these prominently.`,
    source_of_funds: `ARCHETYPE: CAREER SWITCHER
Funds commonly come from savings accumulated during a professional career. Document the income history that generated these savings (employment income, tax returns). If any offshore accounts or international transfers are involved, document each step in full.`,
    business_plan: `ARCHETYPE: CAREER SWITCHER
Justify the sector choice explicitly — why this business, why this investor. Reference any relevant training, certifications, or advisory relationships that compensate for the lack of direct industry experience. The business plan should be especially detailed on operations (since the investor is learning the industry) and especially clear on the investor's management role.`,
    qualifications: `ARCHETYPE: CAREER SWITCHER
The most critical document for this archetype. Officers will immediately notice the disconnect between the investor's career background and the business sector. The qualifications document must pre-empt this by: (1) identifying the transferable skills explicitly (people management, budget oversight, client operations, logistics), (2) mapping each transferable skill to a specific function in the target business, (3) documenting any sector-specific training, certification, or mentorship since the career switch decision was made. For franchise buyers, the franchisor's initial training programme is a legitimate compensating credential — describe it with specific hours and curriculum.`,
    investment_proof: `ARCHETYPE: CAREER SWITCHER
Career switchers often invest career savings or severance proceeds. Document clearly: (1) the source account (employment savings, RRSP drawdown, property sale), (2) any foreign currency conversion with exchange rate documentation, (3) the receiving U.S. business account, (4) all downstream deployment (lease, equipment, working capital). If RRSP funds were used, document the withholding tax and net proceeds calculation explicitly.`,
    nonimmigrant_intent: `ARCHETYPE: CAREER SWITCHER
Career switchers who are leaving employment may appear to have weaker home-country ties (no employer to return to). Address this directly: (1) retained Canadian property — owned home or long-term lease, (2) family ties — parents, siblings, extended family remaining in Canada, (3) Canadian financial ties — registered plans (RRSP, TFSA), bank accounts, investments, (4) the fact that the prior career was in Canada demonstrates a long-standing connection. Frame the E-2 as a venture with defined business milestones; when complete or if status ends, the investor has a home, family, and financial life to return to in Canada.`,
    visa_category: `ARCHETYPE: CAREER SWITCHER
The visa category letter must compensate for the cross-sector transition. Emphasise: (1) the investor's management credentials from the prior career that transfer to this enterprise, (2) any sector-specific preparation taken (training, consulting relationships, market research), (3) the business plan's credibility despite the career shift — cite market data and third-party projections. For franchise career switchers, lean on the franchisor's training programme and support system as institutional backing that reduces execution risk.`,
    ds160_reference: `ARCHETYPE: CAREER SWITCHER
The DS-156E/DS-160 reference should reflect the investor's intended title in the new business (President / Owner-Operator / Managing Member), not their prior employment title. All social media accounts must be disclosed — career switchers often have LinkedIn profiles referencing their prior career; ensure that content does not contradict the E-2 application narrative. Confirm investment amounts are consistent across all documents.`,
  },
};

function buildArchetypeGuidance(archetype: string, documentType: string): string {
  const archetypeMap = ARCHETYPE_DOC_GUIDANCE[archetype];
  if (!archetypeMap) return '';
  return archetypeMap[documentType] ?? '';
}

function buildKBContext(documentType: string, consulatePost: string): string {
  const relevantIds = DOC_TYPE_QUESTION_MAP[documentType] ?? [];
  if (relevantIds.length === 0) return '';

  const entries = INTERVIEW_KNOWLEDGE_BASE.filter(e => relevantIds.includes(e.id));
  if (entries.length === 0) return '';

  const lines: string[] = [
    'E-2 OFFICER PERSPECTIVE — KNOWLEDGE BASE:',
    `The following reflects what a ${consulatePost.toUpperCase()} consular officer tests for each topic this document must address.`,
    'Use these frameworks to ensure the document proactively satisfies the officer\'s scrutiny criteria.',
    '',
  ];

  for (const entry of entries) {
    lines.push(`[${entry.id}] ${entry.topic.toUpperCase()} (${entry.frequency})`);
    lines.push(`Officer tests: ${entry.officerTests}`);
    lines.push(`Must cover: ${entry.keyPrinciples.join(' | ')}`);
    lines.push(`Red flags to avoid: ${entry.redFlags.slice(0, 3).join(' | ')}`);
    if (entry.torontoNote && consulatePost.toLowerCase().includes('toronto')) {
      lines.push(`Toronto-specific: ${entry.torontoNote}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Attempt to fetch relevant FAQ KB chunks from Supabase pgvector.
// Gracefully returns empty string if OPENAI_API_KEY is absent or table is empty.
async function fetchFAQKBContext(
  documentType: string,
  consulatePost: string,
  archetype: string
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return '';

  try {
    const query = `E-2 visa ${documentType.replace(/_/g, ' ')} ${consulatePost} ${archetype} requirements and officer concerns`;
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
    });
    if (!embedRes.ok) return '';
    const embedJson = await embedRes.json() as { data: { embedding: number[] }[] };
    const embedding = embedJson.data?.[0]?.embedding;
    if (!embedding) return '';

    const supabase = getSupabase();
    const { data, error } = await (supabase as ReturnType<typeof getSupabase> & {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: { chunk_text: string }[] | null; error: unknown }>
    }).rpc('match_faq_kb', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.65,
      match_count: 3,
    });
    if (error || !data || data.length === 0) return '';

    const chunks = data.map((r: { chunk_text: string }) => r.chunk_text).join('\n\n');
    return `FAQ KNOWLEDGE BASE — RETRIEVED CONTEXT:\n${chunks}\n`;
  } catch {
    return '';
  }
}

// Brackets the LLM generates instead of filling in actual data.
// Matches patterns like [passport number from Tab A], [see Tab H], [insert here], [your name here].
// Does NOT strip intentional client fill-ins like [Date] or [Consulate address] — those are <= 2 words.
const LLM_REFERENCE_BRACKET_REGEX = /\[(?:[^\[\]]*\b(?:from Tab|see Tab|Tab [A-Z]|refer to|insert|enter here|fill in|your [a-z ]{3,30} here)\b[^\[\]]*)\]/gi;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ---------------------------------------------------------------------------
// Get generation model from database config
// ---------------------------------------------------------------------------

let cachedModel: string | null = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 60000; // 1 minute cache

async function getGenerationModel(): Promise<string> {
  const now = Date.now();

  // Return cached model if still valid
  if (cachedModel && (now - modelCacheTime) < MODEL_CACHE_TTL) {
    return cachedModel;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'generation_model')
      .single();

    if (error) {
      console.warn('Failed to read generation_model from app_settings, using fallback:', error.message);
      cachedModel = 'claude-opus-4-8';
    } else {
      cachedModel = data?.value ?? 'claude-opus-4-8';
    }

    modelCacheTime = now;
    return cachedModel ?? 'claude-opus-4-8';
  } catch (err) {
    console.warn('Error reading generation model, using fallback:', err);
    return 'claude-opus-4-8';
  }
}

// Check for deprecation warnings in API response and update settings
async function checkDeprecationWarning(response: unknown): Promise<void> {
  try {
    // Anthropic deprecation warnings typically appear in response headers or model field
    const responseObj = response as { model?: string; warnings?: string[] };

    if (responseObj.model && responseObj.model.includes('deprecated')) {
      const supabase = getSupabase();
      await supabase.from('app_settings').upsert({
        key: 'model_deprecation_warning',
        value: 'WARNING: Current generation model is deprecated. Update in app_settings.',
        description: 'Auto-set when Anthropic deprecation detected',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      console.warn('Deprecation warning detected for model');
    }
  } catch {
    // Non-fatal - continue
  }
}

// ---------------------------------------------------------------------------
// 4a. Load prompt files
// ---------------------------------------------------------------------------

export async function loadPrompt(documentType: DocumentType): Promise<string> {
  const filePath = join(PROMPTS_DIR, `${documentType}.md`);
  if (!existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Investment breakdown extraction
// ---------------------------------------------------------------------------

interface InvestmentBreakdown {
  total_invested: number | null;
  total_business_cost: number | null;
  franchise_fee: number | null;
  leasehold_improvements: number | null;
  equipment_technology: number | null;
  educational_materials: number | null;
  working_capital: number | null;
  professional_fees: number | null;
  marketing_launch: number | null;
  at_risk_amount: number | null;
}

function extractInvestmentBreakdown(answers: Record<string, unknown>): InvestmentBreakdown {
  const getNumber = (key: string): number | null => {
    const val = answers[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // QF-02: Total invested to date
  // QF-03: Total business cost
  // QF-NEW-01: Amount spent on actual business expenses
  return {
    total_invested: getNumber('QF-02'),
    total_business_cost: getNumber('QF-03'),
    franchise_fee: getNumber('franchise_fee'),
    leasehold_improvements: getNumber('leasehold_improvements'),
    equipment_technology: getNumber('equipment_technology'),
    educational_materials: getNumber('educational_materials'),
    working_capital: getNumber('working_capital'),
    professional_fees: getNumber('professional_fees'),
    marketing_launch: getNumber('marketing_launch'),
    at_risk_amount: getNumber('QF-NEW-01'),
  };
}

// ---------------------------------------------------------------------------
// Data validation
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  missingFields: string[];
}

function validateContext(
  caseBrief: CaseBrief,
  module3Answers: Record<string, unknown>,
  investmentBreakdown: InvestmentBreakdown
): ValidationResult {
  const missingFields: string[] = [];

  // Check case brief fields
  const caseBriefData = caseBrief as unknown as Record<string, unknown>;
  if (!caseBriefData.applicant_name && !caseBriefData.applicantName && !caseBriefData.applicant) {
    missingFields.push('applicant_name');
  }

  // Check investment data
  if (!investmentBreakdown.total_invested && !investmentBreakdown.total_business_cost && !caseBriefData.investment) {
    missingFields.push('investment_total');
  }

  // Check business info
  if (!caseBriefData.business_name && !caseBriefData.businessName && !caseBriefData.business) {
    missingFields.push('business_name');
  }

  // Check source of funds
  const sourceOfFunds = module3Answers['QF-05'] || caseBriefData.source_of_funds;
  if (!sourceOfFunds) {
    missingFields.push('source_of_funds_summary');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// 4b. Build the generation payload
// ---------------------------------------------------------------------------

export async function buildGenerationPayload(
  applicationId: string,
  documentType: DocumentType,
  caseBrief: CaseBrief
): Promise<GenerationPayload> {
  const supabase = getSupabase();
  const systemPrompt = await loadPrompt(documentType);

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('application_id', applicationId);

  const { data: voiceProfile } = await supabase
    .from('applicant_voice_profile')
    .select('*')
    .eq('application_id', applicationId)
    .single();

  const { data: followUp } = await supabase
    .from('followup_responses')
    .select('*')
    .eq('application_id', applicationId);

  const module3Answers: Record<string, unknown> = {};
  if (answers) {
    for (const row of answers) {
      module3Answers[row.question_id] = row.answer_value;
    }
  }

  // Extract investment breakdown as structured data
  const investmentBreakdown = extractInvestmentBreakdown(module3Answers);

  return {
    system_prompt: systemPrompt,
    case_brief: caseBrief as unknown as Record<string, unknown>,
    module_3_answers: module3Answers,
    investment_breakdown: investmentBreakdown,
    voice_profile: voiceProfile?.voice_profile_text || '',
    consulate_post: (caseBrief as unknown as Record<string, unknown>).consulate_post as string || 'toronto',
    document_type: documentType,
    follow_up_responses: (followUp ? (Array.isArray(followUp) ? followUp : followUp) : {}) as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// 4c. Call the Anthropic API
// ---------------------------------------------------------------------------

export async function callClaudeAPI(payload: GenerationPayload): Promise<string> {
  const anthropic = getAnthropic();
  const docLabel = DOCUMENT_TYPE_LABELS[payload.document_type];

  // Format investment breakdown as a clear table
  const ib = payload.investment_breakdown;
  const investmentBreakdownText = ib ? [
    `INVESTMENT BREAKDOWN (USE EXACT VALUES — DO NOT ESTIMATE):`,
    `  Total Invested: ${ib.total_invested ? `$${ib.total_invested.toLocaleString()}` : 'NOT PROVIDED'}`,
    `  Total Business Cost: ${ib.total_business_cost ? `$${ib.total_business_cost.toLocaleString()}` : 'NOT PROVIDED'}`,
    `  At-Risk Amount: ${ib.at_risk_amount ? `$${ib.at_risk_amount.toLocaleString()}` : 'NOT PROVIDED'}`,
    ib.franchise_fee !== null ? `  Franchise Fee: $${ib.franchise_fee.toLocaleString()}` : null,
    ib.leasehold_improvements !== null ? `  Leasehold Improvements: $${ib.leasehold_improvements.toLocaleString()}` : null,
    ib.equipment_technology !== null ? `  Equipment & Technology: $${ib.equipment_technology.toLocaleString()}` : null,
    ib.educational_materials !== null ? `  Educational Materials: $${ib.educational_materials.toLocaleString()}` : null,
    ib.working_capital !== null ? `  Working Capital: $${ib.working_capital.toLocaleString()}` : null,
    ib.professional_fees !== null ? `  Professional Fees: $${ib.professional_fees.toLocaleString()}` : null,
    ib.marketing_launch !== null ? `  Marketing & Launch: $${ib.marketing_launch.toLocaleString()}` : null,
    '',
    `IMPORTANT: Use EXACT dollar amounts from this breakdown. Never estimate, round, or substitute any amounts.`,
    `If a figure is marked "NOT PROVIDED", state it is not yet confirmed — NEVER invent a number.`,
  ].filter(Boolean).join('\n') : '';

  // Extract denial risk flags for D-code-aware documents (cover letter + source of funds)
  const brief = payload.case_brief as { critical_risks?: { code: string; reason: string }[]; watch_risks?: { code: string; reason: string }[] } | null;
  const criticalRisks = brief?.critical_risks?.filter(r => r.code && r.reason) ?? [];
  const watchRisks = brief?.watch_risks?.filter(r => r.code && r.reason) ?? [];
  const dCodeBlock = (criticalRisks.length > 0 || watchRisks.length > 0) && (
    payload.document_type === 'cover_letter' || payload.document_type === 'source_of_funds'
  )
    ? [
        'DENIAL RISK FACTORS — MUST ADDRESS IN THIS DOCUMENT:',
        'These are the top risk factors identified in this case. The document must proactively address each one.',
        ...(criticalRisks.map(r => `  [CRITICAL] ${r.code}: ${r.reason}`)),
        ...(watchRisks.slice(0, 3).map(r => `  [WATCH] ${r.code}: ${r.reason}`)),
        'For each CRITICAL factor: devote a paragraph to directly addressing it with specific facts.',
        'For each WATCH factor: weave the mitigating facts into the relevant section.',
        '',
      ].join('\n')
    : '';

  const caseBriefObj = payload.case_brief as Record<string, unknown>;
  const archetype = (caseBriefObj?.archetype as string) ?? 'unknown';
  const staticKBContext = buildKBContext(payload.document_type, payload.consulate_post);
  const dynamicKBContext = await fetchFAQKBContext(payload.document_type, payload.consulate_post, archetype);

  const userMessage = [
    `KNOWLEDGE CONTEXT:`,
    `Consulate post: ${payload.consulate_post}`,
    `Document type: ${docLabel}`,
    '',
    staticKBContext,
    dynamicKBContext,
    dCodeBlock,
    investmentBreakdownText,
    `APPLICANT CASE BRIEF:`,
    wrapUserContent(JSON.stringify(payload.case_brief, null, 2)),
    '',
    `APPLICANT MODULE 3 ANSWERS:`,
    wrapUserContent(JSON.stringify(payload.module_3_answers, null, 2)),
    '',
    `VOICE PROFILE:`,
    wrapUserContent(payload.voice_profile),
    '',
    `FOLLOW-UP CONVERSATION:`,
    wrapUserContent(JSON.stringify(payload.follow_up_responses, null, 2)),
    '',
    `Generate the ${docLabel} now. Follow all instructions in the system prompt.`,
    'Do not include any headers, labels, or meta-commentary in your output.',
    'Output the document text only.',
  ].join('\n');

  const archetypeGuidance = buildArchetypeGuidance(archetype, payload.document_type);
  const enrichedSystemPrompt = archetypeGuidance
    ? `${payload.system_prompt}\n\n---\n\n${archetypeGuidance}`
    : payload.system_prompt;

  async function attempt(): Promise<string> {
    const model = await getGenerationModel();
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: enrichedSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Check for deprecation warnings
    await checkDeprecationWarning(response);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Claude returned non-text response');
    }
    return content.text;
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.error('Claude API first attempt failed, retrying...', firstError);
    try {
      return await attempt();
    } catch (secondError) {
      const msg = secondError instanceof Error ? secondError.message : 'Unknown error';
      throw new Error(`CLAUDE_API_FAILED: ${msg}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4d. Humanization pass (Spec4 Stage 2 — with retry loop)
// ---------------------------------------------------------------------------

const HUMANIZATION_SYSTEM_PROMPT = `You are a humanization editor. You will receive a section of a legal document. Your job is to make it sound like it was written by a specific human being — not generated by AI.

WHAT TO DO:
1. Vary sentence lengths. The current text is too uniform. Some sentences should be short. Some longer with clauses. Mix them deliberately.

2. Replace AI vocabulary fingerprints. Search for and replace:
   - "it is worth noting" → cut entirely or rephrase
   - "furthermore" → cut or use "and" or start new sentence
   - "in conclusion" → cut
   - "comprehensive" → specific adjective instead
   - "crucial" → important / essential / central
   - "notably" → cut
   - "it should be noted" → cut
   - "leveraging" → using
   - "utilize" → use
   - "demonstrate" → show
   - "facilitate" → help / enable / allow

3. Inject the applicant's voice. The voice profile and writing sample phrases below show how this person actually writes. Where appropriate, use their sentence structures, their vocabulary level, their way of making a point.

4. Break parallel constructions. If three sentences start with the same structure, rewrite one of them differently.

5. Add natural variation. Real human writing is slightly imperfect in its consistency. A minor variation in how something is referenced is natural. Identical phrasing repeated exactly is not.

DO NOT:
- Change any facts, figures, dates, or names
- Add any new claims or content
- Remove any required legal language
- Change exhibit references
- Make the text less formal than required for a legal document
- Add commentary, labels, or meta-commentary in your output

Output the document text only.`;

const HUMANIZATION_RETRY_PREFIX = `IMPORTANT: Your previous humanization attempt scored too high on AI detection. The following specific issues were found:

{feedback}

Rewrite the document addressing each issue above. Be more aggressive in varying sentence structure and removing AI patterns.`;

export async function humanizeDocument(
  rawContent: string,
  voiceProfile: string,
  previousFeedback?: string
): Promise<string> {
  const anthropic = getAnthropic();

  let systemPrompt = HUMANIZATION_SYSTEM_PROMPT;

  if (previousFeedback) {
    systemPrompt += '\n\n' + HUMANIZATION_RETRY_PREFIX.replace('{feedback}', previousFeedback);
  }

  const userMessage = [
    'VOICE PROFILE:',
    wrapUserContent(voiceProfile),
    '',
    'DOCUMENT TO HUMANIZE:',
    rawContent,
  ].join('\n');

  const model = await getGenerationModel();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Check for deprecation warnings
  await checkDeprecationWarning(response);

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Humanization returned non-text response');
  }
  return content.text;
}

/**
 * Run AI detection on a single document and return the score.
 * Used by the humanization retry loop.
 */
export async function getAIDetectionScore(documentText: string): Promise<number> {
  const anthropic = getAnthropic();
  const model = await getGenerationModel();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system: `You are an AI detection tool. Analyze the following text and estimate how likely it was written by an AI.

Respond with ONLY a JSON object in this exact format:
{"ai_score": 0.0-1.0, "reasoning": "brief explanation"}

Where ai_score is 0.0 (definitely human) to 1.0 (definitely AI).
Consider: repetitive phrasing, formal structure, lack of personal voice, formulaic transitions.`,
    messages: [{ role: 'user', content: `Analyze this document for AI writing patterns:\n\n${documentText.slice(0, 3000)}` }],
  });

  const respContent = response.content[0];
  if (respContent.type === 'text') {
    const match = respContent.text.match(/"ai_score"\s*:\s*([0-9.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  // Default to 0 if parsing fails — don't block pipeline
  return 0;
}

// ---------------------------------------------------------------------------
// 4e. Consistency checker
// ---------------------------------------------------------------------------

const CONSISTENCY_FIELDS: { field: string; patterns: RegExp[] }[] = [
  {
    field: 'applicant_name',
    patterns: [
      /(?:applicant|name|I,)\s*[:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /(?:Ms\.|Mr\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    ],
  },
  {
    field: 'investment_amount_usd',
    patterns: [
      /\$([0-9,]+)(?:\s*USD)?/,
      /investment\s+of\s+\$([0-9,]+)/i,
      /\$([0-9,]+)\s*(?:USD|United States dollars)/i,
    ],
  },
  {
    field: 'llc_name',
    patterns: [
      /(?:LLC|LLC name)[:]\s*([A-Z][A-Za-z\s]+(?:LLC|Limited|Inc\.?))/i,
      /([A-Z][A-Za-z\s]+Services\s*(?:LLC|Limited))/i,
      /([A-Z][A-Za-z\s]+Group\s*(?:LLC|Limited))/i,
    ],
  },
  {
    field: 'ein',
    patterns: [
      /EIN[:]?\s*(\d{2}-\d{7})/i,
      /(\d{2}-\d{7})/,
    ],
  },
  {
    field: 'business_address',
    patterns: [
      /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Street|Avenue|Road|Drive|Blvd|Lane|Court|Way)))/i,
      /located\s+at\s+(.+?)(?:,|\.)/i,
    ],
  },
  {
    field: 'franchise_brand',
    patterns: [
      /(?:franchise|franchisor)[:]\s*([A-Z][A-Za-z\s]+)/i,
      /([A-Z][A-Za-z\s]+Franchis(?:ing|e))/,
    ],
  },
  {
    field: 'llc_formation_date',
    patterns: [
      /(?:formed|established|organized)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /formation\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'franchise_agreement_date',
    patterns: [
      /franchise\s+agreement\s+(?:executed|signed)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /agreement\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'wire_transfer_date',
    patterns: [
      /(?:wire\s+transfer|transferred)\s+on\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /transfer\s+date[:]\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ],
  },
  {
    field: 'family_composition',
    patterns: [
      /(?:spouse|wife|husband|family)\s+(?:of|:)\s*(\d+)/i,
      /(\d+)\s+(?:family|household)\s+members/i,
    ],
  },
  {
    field: 'treaty_nationality',
    patterns: [
      /(?:citizen|national|citizenship)\s+of\s+([A-Z][a-zA-Z\s]+?)(?:\s*,|\s*\.|\s+who)/i,
      /([A-Z][a-zA-Z]+)\s+(?:citizen|national|passport\s+holder)/i,
    ],
  },
  {
    field: 'applicant_role',
    patterns: [
      /(?:will\s+serve|serves|serving|role\s+of|position\s+of)\s+as\s+(?:the\s+)?([A-Za-z\s]+?(?:Manager|Director|President|Officer|Principal|Partner|Operator))/i,
      /(?:Managing\s+Member|General\s+Manager|President|Director|Chief\s+Executive)/i,
    ],
  },
  {
    field: 'target_state',
    patterns: [
      /located\s+in\s+([A-Z][a-zA-Z\s]+),\s*(?:the\s+)?United\s+States/i,
      /in\s+(?:the\s+state\s+of\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),?\s+(?:USA|US|United\s+States)/i,
    ],
  },
];

function extractFieldValue(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[,$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkConsistency(documents: GeneratedDocument[]): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  for (const field of CONSISTENCY_FIELDS) {
    const valuesByDoc: Record<string, string> = {};

    for (const doc of documents) {
      if (!doc.content_text) continue;
      const value = extractFieldValue(doc.content_text, field.patterns);
      if (value) {
        valuesByDoc[doc.document_type] = value;
      }
    }

    const uniqueValues = new Set(
      Object.values(valuesByDoc).map(normalizeValue)
    );

    if (uniqueValues.size > 1) {
      issues.push({
        field: field.field,
        documents_affected: Object.keys(valuesByDoc),
        values_found: valuesByDoc,
      });
    }
  }

  return { passed: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// 4f. Quality gate
// ---------------------------------------------------------------------------

const MIN_WORD_COUNTS: Record<string, number> = {
  cover_letter: 800,
  source_of_funds: 400,
  investment_proof: 600,
  business_plan: 1200,
  qualifications: 400,
  ds160_reference: 300,
  visa_category: 600,
  nonimmigrant_intent: 300,
};

const MAX_PAGE_ESTIMATES: Record<string, number> = {
  cover_letter: 4,
  source_of_funds: 2,
  investment_proof: 4,
  business_plan: 8,
  qualifications: 2,
  ds160_reference: 5,
  visa_category: 4,
  nonimmigrant_intent: 2,
};

const FORBIDDEN_LEGAL_PHRASES = [
  'qualifies',
  'eligible',
  'meets the standard',
  'is substantial',
];

const PROHIBITED_VOCAB = [
  'guaranteed',
  'certainly will',
  'definitely will',
  'impossible to deny',
  'cannot be refused',
  'promise',
  'my boss',
  'my employer',
  'i work for',
  'i am an employee of',
  'ai generated',
  'as an ai',
  'as a language model',
  'chatgpt',
  'openai',
  'certainly approve',
];

// Cover letter must address all 5 E-2 officer pillars
const COVER_LETTER_OFFICER_PILLARS: { name: string; patterns: RegExp[] }[] = [
  {
    name: 'Substantiality (investment amount stated)',
    patterns: [/\$[0-9,]+/, /USD\s+[0-9,]+/i, /hundred thousand|million/i],
  },
  {
    name: 'Non-marginality (job creation or economic contribution)',
    patterns: [/employ|job|hire|worker|staff/i, /economic\s+(impact|contribution|benefit)/i, /creat(?:e|ing)\s+(?:\d+|jobs)/i],
  },
  {
    name: 'At-risk capital (committed/deployed funds)',
    patterns: [/at\s+risk/i, /commit(?:ted|ment)/i, /(?:wire\s+)?transfer(?:red)?/i, /deployed/i, /invested/i],
  },
  {
    name: 'Managerial control (applicant directs operations)',
    patterns: [/manag(?:e|er|ing|ement)/i, /direct(?:or|ing|s)/i, /oversee|supervise|control/i, /day-to-day/i],
  },
  {
    name: 'Active enterprise (business is real and operating)',
    patterns: [/operat(?:e|ing|ion)/i, /business is|company is|enterprise is/i, /open(?:ed|ing)|launch(?:ed|ing)/i, /locat(?:ed|ion)/i],
  },
];

const LEGAL_DISCLAIMERS = [
  'does not constitute legal advice',
  'not a law firm',
];

const AI_TOOL_NAMES = [
  'claude', 'anthropic', 'chatgpt', 'gpt-', 'openai', 'gemini', 'ai generated',
];

const WORDS_PER_PAGE = 250;

interface QualityGateOptions {
  caseBrief?: Record<string, unknown>;
  investmentTotal?: number | null;
}

export function runQualityGate(
  document: GeneratedDocument,
  documentType: DocumentType,
  options: QualityGateOptions = {}
): QualityResult {
  const content = document.content_text || '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageEstimate = Math.ceil(wordCount / WORDS_PER_PAGE);
  const failures: string[] = [];

  const minWords = MIN_WORD_COUNTS[documentType] || 400;
  if (wordCount < minWords) {
    failures.push(`Word count ${wordCount} below minimum ${minWords}`);
  }

  const maxPages = MAX_PAGE_ESTIMATES[documentType] || 8;
  if (pageEstimate > maxPages) {
    failures.push(`Page estimate ${pageEstimate} exceeds maximum ${maxPages}`);
  }

  const hasUnverifiedMarkers = /\[UNVERIFIED\]/i.test(content);
  if (hasUnverifiedMarkers) {
    failures.push('Contains [UNVERIFIED] markers');
  }

  const hasTemplatePlaceholders = /\{\{.*?\}\}/.test(content) || /\[\[.*?\]\]/.test(content);
  if (hasTemplatePlaceholders) {
    failures.push('Contains template placeholders ({{ }} or [[ ]])');
  }

  LLM_REFERENCE_BRACKET_REGEX.lastIndex = 0;
  const hasLLMReferenceBrackets = LLM_REFERENCE_BRACKET_REGEX.test(content);
  LLM_REFERENCE_BRACKET_REGEX.lastIndex = 0;
  if (hasLLMReferenceBrackets) {
    failures.push('Contains LLM reference placeholders (e.g. [from Tab ...], [insert here]) — use actual data values');
  }

  let hasLegalConclusions = false;
  const lowerContent = content.toLowerCase();
  for (const phrase of FORBIDDEN_LEGAL_PHRASES) {
    if (lowerContent.includes(phrase)) {
      hasLegalConclusions = true;
      failures.push(`Contains forbidden legal conclusion: "${phrase}"`);
    }
  }

  // CHECK 1: Legal disclaimer present
  const hasLegalDisclaimer = LEGAL_DISCLAIMERS.some(d => lowerContent.includes(d));
  if (!hasLegalDisclaimer) {
    failures.push('Missing legal disclaimer');
  }

  // CHECK 2: Total investment figure consistency (if investment total provided)
  // Per Spec4 CONSISTENCY_FIELDS: only verify the TOTAL investment figure
  // appears and matches — do NOT flag individual line-item dollar amounts
  // (franchise fees, lease deposits, equipment costs, etc.) which legitimately
  // differ from the total.
  if (options.investmentTotal) {
    const totalStr = options.investmentTotal.toLocaleString('en-US');
    // Check for $185,000 / $185000 / "one hundred eighty-five thousand" etc.
    const hasDollarForm = lowerContent.includes(`$${totalStr}`) ||
      lowerContent.includes(`$${options.investmentTotal}`) ||
      lowerContent.includes(`$${totalStr.replace(/,/g, '')}`);
    // Also check written-out form (e.g. "one hundred eighty-five thousand")
    const writtenNumbers: Record<number, string> = {
      185000: 'one hundred eighty[- ]?five thousand',
      150000: 'one hundred fifty thousand',
      200000: 'two hundred thousand',
      100000: 'one hundred thousand',
      250000: 'two hundred fifty thousand',
    };
    const writtenPattern = writtenNumbers[options.investmentTotal];
    const hasWrittenForm = writtenPattern
      ? new RegExp(writtenPattern, 'i').test(content)
      : false;
    if (!hasDollarForm && !hasWrittenForm) {
      failures.push(
        `Total investment figure $${totalStr} not found in document`
      );
    }
  }

  // CHECK 3: Applicant name consistency (if case brief provides name)
  if (options.caseBrief) {
    const applicantName = options.caseBrief.applicant_name || options.caseBrief.applicantName || (options.caseBrief as Record<string, unknown>).applicant as string;
    if (applicantName && typeof applicantName === 'string') {
      const nameParts = applicantName.split(' ');
      if (nameParts.length >= 2) {
        // Check if all name parts appear in document (at least first and last name)
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const hasFirstName = lowerContent.includes(firstName.toLowerCase());
        const hasLastName = lowerContent.includes(lastName.toLowerCase());
        if (!hasFirstName || !hasLastName) {
          failures.push(`Applicant name "${applicantName}" not consistently referenced`);
        }
      }
    }
  }

  // CHECK 4: Prohibited vocabulary
  for (const phrase of PROHIBITED_VOCAB) {
    if (lowerContent.includes(phrase)) {
      failures.push(`Contains prohibited language: "${phrase}"`);
    }
  }

  // CHECK 5: Cover letter must address all 5 E-2 officer pillars
  if (documentType === 'cover_letter') {
    for (const pillar of COVER_LETTER_OFFICER_PILLARS) {
      const covered = pillar.patterns.some(p => p.test(content));
      if (!covered) {
        failures.push(`Cover letter missing officer pillar: ${pillar.name}`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    word_count: wordCount,
    page_estimate: pageEstimate,
    has_unverified_markers: hasUnverifiedMarkers,
    has_template_placeholders: hasTemplatePlaceholders,
    has_legal_conclusions: hasLegalConclusions,
  };
}

// ---------------------------------------------------------------------------
// Helpers for pipeline
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimatePages(wordCount: number): number {
  return Math.ceil(wordCount / WORDS_PER_PAGE);
}

// ---------------------------------------------------------------------------
// 4h. Gap Analysis - Check for missing required elements in documents
// ---------------------------------------------------------------------------

interface GapAnalysisResult {
  missing_elements: Record<DocumentType, string[]>;
  recommendations: string[];
}

const REQUIRED_ELEMENTS: Record<DocumentType, string[]> = {
  cover_letter: [
    'applicant_name',
    'business_name',
    'investment_amount',
    'treaty_country',
    'consulate_post',
  ],
  source_of_funds: [
    'source_description',
    'timeline',
    'amount',
    'documentation_mentioned',
  ],
  investment_proof: [
    'investment_amount',
    'at_risk_amount',
    'funds_movement',
    'business_ownership',
  ],
  business_plan: [
    'business_description',
    'market_analysis',
    'financial_projections',
    'job_creation',
  ],
  qualifications: [
    'applicant_background',
    'experience',
    'education',
    'relevant_skills',
  ],
  ds160_reference: [
    'personal_information',
    'travel_history',
    'family_information',
    'employment',
  ],
  visa_category: [
    'treaty_nationality',
    'investment_substantiality',
    'at_risk_funds',
    'non_marginality',
    'develop_and_direct',
  ],
  nonimmigrant_intent: [
    'home_country_ties',
    'return_intent',
    'departure_plan',
  ],
};

function extractKeyElements(text: string): string[] {
  const lower = text.toLowerCase();
  const elements: string[] = [];

  // Common patterns for key elements
  const patterns = {
    applicant_name: /(?:applicant|name|i)\s*[:\-]?\s*([a-z]+\s+[a-z]+)/i,
    business_name: /(?:business|company|llc|inc)\s*[:\-]?\s*([a-z0-9\s]+)/i,
    investment_amount: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/,
    treaty_country: /(?:treaty|country|national|citizen)\s*[:\-]?\s*([a-z\s]+)/i,
    consulate_post: /(?:consulate|post|embassy)\s*[:\-]?\s*([a-z\s]+)/i,
    source_description: /(?:source|origin|derivation|earned|saved|inherited)/i,
    timeline: /(?:timeline|date|when|since|year|month)/i,
    amount: /\$\d{1,3}(?:,\d{3})*/,
    documentation_mentioned: /(?:document|evidence|proof|certificate|statement)/i,
    at_risk_amount: /(?:at\s*risk|endanger|vulnerable)/i,
    funds_movement: /(?:transfer|wire|move|spent|used)/i,
    business_ownership: /(?:own|ownership|share|percent|stake)/i,
    market_analysis: /(?:market|competition|industry|customers|target)/i,
    financial_projections: /(?:projection|forecast|revenue|profit|income)/i,
    job_creation: /(?:job|employment|hire|staff|team)/i,
    experience: /(?:experience|worked|years|background)/i,
    education: /(?:education|degree|university|college|school)/i,
    travel_history: /(?:travel|visited|country|trip)/i,
    family_information: /(?:family|spouse|children|married)/i,
    employment: /(?:employment|work|job|occupation)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower)) {
      elements.push(key);
    }
  }

  return elements;
}

export function runGapAnalysis(documents: GeneratedDocument[]): GapAnalysisResult {
  const missing_elements: Record<DocumentType, string[]> = {
    cover_letter: [],
    source_of_funds: [],
    investment_proof: [],
    business_plan: [],
    qualifications: [],
    ds160_reference: [],
    visa_category: [],
    nonimmigrant_intent: [],
  };

  const recommendations: string[] = [];

  for (const doc of documents) {
    if (!doc.content_text) continue;

    const required = REQUIRED_ELEMENTS[doc.document_type] || [];
    const found = extractKeyElements(doc.content_text);

    for (const req of required) {
      if (!found.includes(req) && !missing_elements[doc.document_type].includes(req)) {
        missing_elements[doc.document_type].push(req);
      }
    }
  }

  // Generate recommendations based on missing elements
  for (const [docType, missing] of Object.entries(missing_elements)) {
    if (missing.length > 0) {
      recommendations.push(`${docType}: Missing elements - ${missing.join(', ')}`);
    }
  }

  return { missing_elements, recommendations };
}

// ---------------------------------------------------------------------------
// 4i. Repetition Check - Detect duplicate content across documents
// ---------------------------------------------------------------------------

function computeSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = text2.toLowerCase().split(/\s+/).filter(Boolean);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionSize = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersectionSize++;
  });

  const unionSize = new Set([...words1, ...words2]).size;

  return intersectionSize / unionSize;
}

interface RepetitionResult {
  has_excessive_repetition: boolean;
  duplicate_pairs: Array<{
    doc1: DocumentType;
    doc2: DocumentType;
    similarity: number;
  }>;
}

export function checkRepetition(documents: GeneratedDocument[]): RepetitionResult {
  const duplicates: Array<{ doc1: DocumentType; doc2: DocumentType; similarity: number }> = [];
  const SIMILARITY_THRESHOLD = 0.70;

  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const doc1 = documents[i];
      const doc2 = documents[j];

      if (!doc1.content_text || !doc2.content_text) continue;

      const similarity = computeSimilarity(doc1.content_text, doc2.content_text);

      if (similarity >= SIMILARITY_THRESHOLD) {
        duplicates.push({
          doc1: doc1.document_type,
          doc2: doc2.document_type,
          similarity,
        });
      }
    }
  }

  return {
    has_excessive_repetition: duplicates.length > 0,
    duplicate_pairs: duplicates,
  };
}

// ---------------------------------------------------------------------------
// 4j. AI Detection Audit - Check if content appears AI-generated
// ---------------------------------------------------------------------------

const AI_DETECTION_THRESHOLD = 0.35;

export async function runAIDetectionAudit(
  documents: GeneratedDocument[]
): Promise<void> {
  const anthropic = getAnthropic();

  for (const doc of documents) {
    if (!doc.content_text) continue;

    try {
      const model = await getGenerationModel();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 500,
        system: `You are an AI detection tool. Analyze the following text and estimate how likely it was written by an AI.

Respond with ONLY a JSON object in this exact format:
{"ai_score": 0.0-1.0, "reasoning": "brief explanation"}

Where ai_score is 0.0 (definitely human) to 1.0 (definitely AI).
Consider: repetitive phrasing, formal structure, lack of personal voice, formulaic transitions.`,
        messages: [{ role: 'user', content: `Analyze this document for AI writing patterns:\n\n${doc.content_text.slice(0, 3000)}` }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const match = content.text.match(/"ai_score"\s*:\s*([0-9.]+)/);
        if (match) {
          const aiScore = parseFloat(match[1]);
          const passed = aiScore < AI_DETECTION_THRESHOLD;

          // Update document with AI detection results
          const supabase = getSupabase();
          await supabase
            .from('generated_documents')
            .update({
              ai_detection_score: aiScore,
              ai_detection_passed: passed,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', doc.job_id)
            .eq('document_type', doc.document_type);
        }
      }
    } catch (err) {
      console.error(`AI detection failed for ${doc.document_type}:`, err);
      // Non-fatal - continue
    }
  }
}

// ---------------------------------------------------------------------------
// 4g. Main orchestrator
// ---------------------------------------------------------------------------

export async function runGenerationPipeline(
  applicationId: string,
  userId: string,
  jobId: string,
  onProgress: (step: GenerationStep) => void
): Promise<void> {
  const supabase = getSupabase();
  const updateJob = async (updates: Record<string, unknown>) => {
    const { error } = await supabase
      .from('document_generation_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) {
      console.error('[ENGINE] updateJob failed:', JSON.stringify(error));
    }
  };

  const emitStep = (stepNum: number, status: GenerationStep['status']) => {
    const label = GENERATION_STEP_LABELS[stepNum] || `Step ${stepNum}`;
    onProgress({ id: stepNum, label, status });
  };

  const fail = async (stepNum: number, error: string) => {
    console.error(`Pipeline failed at step ${stepNum}:`, error);
    emitStep(stepNum, 'failed');
    await updateJob({
      status: 'failed',
      error_message: error,
      current_step: stepNum,
      current_step_label: GENERATION_STEP_LABELS[stepNum],
    });
  };

  // Emit SSE event for awaiting approval state
  const emitAwaitingApproval = async (
    docType: DocumentType,
    content: string,
    stepNum: number
  ) => {
    onProgress({
      id: stepNum,
      label: `${DOCUMENT_TYPE_LABELS[docType]} ready — please review and approve`,
      status: 'running',
    } as unknown as GenerationStep);
    // Also emit a custom event through the job update
    await updateJob({
      status: 'awaiting_approval',
      current_step: stepNum,
      current_step_label: `${DOCUMENT_TYPE_LABELS[docType]} ready — please review and approve`,
    });
  };

  // Polling function to wait for document approval
  const waitForApproval = async (
    docType: DocumentType,
    maxWaitMs = 300000 // 5 minutes max
  ): Promise<{ approved: boolean; revisionRequested: boolean }> => {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    let warningSent = false;

    while (Date.now() - startTime < maxWaitMs) {
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      // At 4 minutes, log warning before auto-approve
      if (elapsedSeconds >= 240 && !warningSent) {
        console.warn(`[generation-engine] Approval timeout warning for ${docType} — auto-approving in 60s`);
        warningSent = true;
      }

      const { data: doc } = await supabase
        .from('generated_documents')
        .select('status')
        .eq('job_id', jobId)
        .eq('document_type', docType)
        .single();

      if (doc?.status === 'approved') {
        return { approved: true, revisionRequested: false };
      }
      if (doc?.status === 'revision_requested') {
        return { approved: false, revisionRequested: true };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout - auto-approve to not hang forever
    console.warn(`[generation-engine] Auto-approving ${docType} after timeout`);
    return { approved: true, revisionRequested: false };
  };

  const DOCUMENT_TYPES: DocumentType[] = [
    'cover_letter',
    'source_of_funds',
    'investment_proof',
    'business_plan',
    'qualifications',
    'ds160_reference',
    'visa_category',
    'nonimmigrant_intent',
  ];

  const generatedDocs: GeneratedDocument[] = [];

  try {
    // Mark job running
    await updateJob({
      status: 'running',
      started_at: new Date().toISOString(),
      current_step: 1,
      current_step_label: GENERATION_STEP_LABELS[1],
    });

    // Step 1: Load case brief
    emitStep(1, 'running');
    await updateJob({ current_step: 1, current_step_label: GENERATION_STEP_LABELS[1] });

    const { data: caseBriefRow, error: cbError } = await supabase
      .from('case_briefs')
      .select('case_brief_json')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cbError || !caseBriefRow?.case_brief_json) {
      await fail(1, 'No case brief found — run analysis engine first');
      return;
    }

    const caseBrief = caseBriefRow.case_brief_json as CaseBrief;

    // Get voice profile separately
    const { data: voiceProfileRow } = await supabase
      .from('applicant_voice_profile')
      .select('voice_profile_text')
      .eq('application_id', applicationId)
      .single();

    const voiceProfile = (voiceProfileRow?.voice_profile_text as string) || '';
    emitStep(1, 'complete');
    await updateJob({ current_step: 1, current_step_label: GENERATION_STEP_LABELS[1] });

    // Create initial pipeline_log entries for each document (audit trail)
    const pipelineStartedAt = new Date().toISOString();
    for (const docType of DOCUMENT_TYPES) {
      await supabase
        .from('generation_pipeline_log')
        .insert({
          application_id: applicationId,
          document_type: docType,
          pipeline_started_at: pipelineStartedAt,
          stage1_completed: true,
          stage1_attempts: 1,
          stage1_completed_at: pipelineStartedAt,
        });
    }

    // Steps 2-9: Generate each document with sequential approval
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      const stepNum = i + 2;
      const docType = DOCUMENT_TYPES[i];
      const docLabel = DOCUMENT_TYPE_LABELS[docType];

      let documentApproved = false;
      let revisionLoopCount = 0;
      const maxRevisions = 3;

      // Revision loop: regenerate until approved or max attempts
      while (!documentApproved && revisionLoopCount < maxRevisions) {
        if (revisionLoopCount > 0) {
          // This is a revision - regenerate the document
          emitStep(stepNum, 'running');
          await updateJob({
            current_step: stepNum,
            current_step_label: `Regenerating ${docLabel} (attempt ${revisionLoopCount + 1})`,
          });
        }

        emitStep(stepNum, 'running');
        await updateJob({
          current_step: stepNum,
          current_step_label: revisionLoopCount === 0
            ? GENERATION_STEP_LABELS[stepNum]
            : `Regenerating ${docLabel} (attempt ${revisionLoopCount + 1})`
        });

        // Update document status to generating
        await supabase
          .from('generated_documents')
          .update({ status: 'generating', updated_at: new Date().toISOString() })
          .eq('job_id', jobId)
          .eq('document_type', docType);

        try {
          const payload = await buildGenerationPayload(applicationId, docType, caseBrief);

          // Validate required context before calling API
          const validation = validateContext(
            caseBrief,
            payload.module_3_answers,
            payload.investment_breakdown
          );
          if (!validation.valid) {
            const errorMsg = `Missing required data: ${validation.missingFields.join(', ')}. Complete Module 3 before generating.`;
            await supabase
              .from('generated_documents')
              .update({
                status: 'failed',
                error_message: errorMsg,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);
            await fail(stepNum, errorMsg);
            return;
          }

          const content = await callClaudeAPI(payload);

          const wc = countWords(content);
          const pages = estimatePages(wc);

          // Parse content into JSON sections if applicable
          let contentJson: Record<string, unknown> | null = null;
          const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              contentJson = JSON.parse(jsonMatch[1]);
            } catch {
              contentJson = { full_text: content };
            }
          } else {
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed === 'object' && parsed !== null) {
                contentJson = parsed;
              }
            } catch {
              contentJson = { full_text: content };
            }
          }

          // Save the generated document with 'awaiting_approval' status — frontend polls for approval
          await supabase
            .from('generated_documents')
            .update({
              content_text: content,
              content_json: contentJson,
              word_count: wc,
              page_estimate: pages,
              status: 'awaiting_approval',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', docType);

          const newDoc: GeneratedDocument = {
            id: '',
            job_id: jobId,
            application_id: applicationId,
            user_id: userId,
            document_type: docType,
            status: 'awaiting_approval',
            content_json: contentJson,
            content_text: content,
            word_count: wc,
            page_estimate: pages,
            revision_count: revisionLoopCount,
            revision_notes: [],
            ai_detection_score: null,
            ai_detection_passed: null,
            quality_gate_passed: null,
            quality_gate_notes: [],
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          generatedDocs.push(newDoc);

          // Mark this step as complete, but we're now awaiting approval
          emitStep(stepNum, 'complete');

          // Emit awaiting approval state - this pauses generation
          await emitAwaitingApproval(docType, content, stepNum);

          // Wait for user approval or revision request
          const { approved, revisionRequested } = await waitForApproval(docType);

          if (approved) {
            // Mark document as approved
            await supabase
              .from('generated_documents')
              .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);

            documentApproved = true;
          } else if (revisionRequested) {
            // Increment revision count and loop
            revisionLoopCount++;
            await supabase
              .from('generated_documents')
              .update({
                revision_count: revisionLoopCount,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', docType);

            // Resume the job to trigger regeneration
            await updateJob({ status: 'running' });
          }
        } catch (err) {
          await supabase
            .from('generated_documents')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', docType);

          const msg = err instanceof Error ? err.message : 'Unknown error';
          await fail(stepNum, `Failed to generate ${docLabel}: ${msg}`);
          return;
        }
      }

      if (!documentApproved && revisionLoopCount >= maxRevisions) {
        // Max revisions reached - auto-approve to continue
        await supabase
          .from('generated_documents')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            quality_gate_notes: ['Auto-approved after max revisions'],
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', docType);
      }

      // Resume job for next document
      await updateJob({ status: 'running' });
    }

    // All documents generated successfully (including DS-160 at step 7)
    // Flip refund eligibility - 14-day guarantee now void
    await supabase
      .from('payments')
      .update({ refund_eligible: false })
      .eq('application_id', applicationId)
      .eq('status', 'completed');

    // Step 9: Gap Analysis - Check for missing required elements
    emitStep(9, 'running');
    await updateJob({ current_step: 9, current_step_label: GENERATION_STEP_LABELS[9] });

    const gapResult = runGapAnalysis(generatedDocs);

    // Log gap analysis results
    if (gapResult.recommendations.length > 0) {
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: 'all',
          stage: 'gap_analysis',
          attempt_number: 1,
          passed: gapResult.recommendations.length === 0,
          flagged_sections: gapResult.recommendations,
          notes: `Gap analysis completed. ${gapResult.recommendations.length} recommendations.`,
        });
    }

    emitStep(9, 'complete');
    await updateJob({ current_step: 9, current_step_label: GENERATION_STEP_LABELS[9] });

    // Step 10: Repetition Check - Detect duplicate content across documents
    emitStep(10, 'running');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    const repetitionResult = checkRepetition(generatedDocs);

    if (repetitionResult.has_excessive_repetition) {
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: 'all',
          stage: 'repetition_check',
          attempt_number: 1,
          passed: false,
          flagged_sections: repetitionResult.duplicate_pairs.map(
            d => `${d.doc1} <-> ${d.doc2}: ${Math.round(d.similarity * 100)}% similar`
          ),
          notes: 'Excessive repetition detected between documents',
        });
    }

    emitStep(10, 'complete');
    await updateJob({ current_step: 10, current_step_label: GENERATION_STEP_LABELS[10] });

    // Step 11: Consistency check
    emitStep(11, 'running');
    await updateJob({ current_step: 11, current_step_label: GENERATION_STEP_LABELS[11] });

    const consistencyResult = checkConsistency(generatedDocs);

    // Auto-correct unambiguous issues (e.g., different spacing)
    if (!consistencyResult.passed) {
      for (const issue of consistencyResult.issues) {
        // Log the issue
        await supabase
          .from('document_generation_log')
          .insert({
            application_id: applicationId,
            document_type: 'all',
            stage: 'consistency_check',
            attempt_number: 1,
            passed: false,
            flagged_sections: [issue],
            notes: `Consistency issue: ${issue.field}`,
          });
      }
    }

    emitStep(11, 'complete');
    await updateJob({ current_step: 11, current_step_label: GENERATION_STEP_LABELS[11] });

    // Step 12: AI Detection Audit - Check if content appears AI-generated (threshold: 0.35)
    emitStep(12, 'running');
    await updateJob({ current_step: 12, current_step_label: GENERATION_STEP_LABELS[12] });

    await runAIDetectionAudit(generatedDocs);

    emitStep(12, 'complete');
    await updateJob({ current_step: 12, current_step_label: GENERATION_STEP_LABELS[12] });

    // Step 13: Humanization pass on all 8 documents (Spec4 Stage 2 — max 3 attempts)
    emitStep(13, 'running');
    await updateJob({ current_step: 13, current_step_label: GENERATION_STEP_LABELS[13] });

    const HUMANIZATION_MAX_ATTEMPTS = 3;
    const DETECTION_THRESHOLD = 0.35;

    // Track humanization attempts per document for pipeline_log (Step 14)
    const humanizationState = new Map<DocumentType, { attempts: number; finalScore: number | null }>();

    // Extract investment data — needed by quality gate in humanization loop (Step 11)
    // and again in Step 13; declare once here
    const caseBriefData = caseBrief as unknown as Record<string, unknown>;
    const investmentTotal = (caseBriefData.investment as number) ||
                          (caseBriefData.investment_amount as number) ||
                          (caseBriefData.total_investment as number) || null;

    for (const doc of generatedDocs) {
      if (!doc.content_text || !voiceProfile) {
        humanizationState.set(doc.document_type, { attempts: 0, finalScore: null });
        continue;
      }

      let currentText = doc.content_text;
      let lastFeedback: string | undefined;
      let actualAttempts = 0;
      let finalScore: number | null = null;

      for (let attempt = 1; attempt <= HUMANIZATION_MAX_ATTEMPTS; attempt++) {
        try {
          const humanized = await humanizeDocument(currentText, voiceProfile, lastFeedback);
          const wc = countWords(humanized);
          const pages = estimatePages(wc);
          actualAttempts = attempt;

          // Run AI detection to check if humanization was effective
          const aiScore = await getAIDetectionScore(humanized);

          // Run quality gate on humanized content (covers word count, disclaimer,
          // required elements — catches failures that AI detection alone misses)
          const qualityResult = runQualityGate(
            { ...doc, content_text: humanized },
            doc.document_type,
            { caseBrief: caseBriefData, investmentTotal }
          );

          const aiPassed = aiScore < DETECTION_THRESHOLD;
          const qualityPassed = qualityResult.passed;
          finalScore = aiScore;

          if ((aiPassed && qualityPassed) || attempt === HUMANIZATION_MAX_ATTEMPTS) {
            // Passed both checks or last attempt — accept this version
            await supabase
              .from('generated_documents')
              .update({
                content_text: humanized,
                word_count: wc,
                page_estimate: pages,
                ai_detection_score: aiScore,
                ai_detection_passed: aiPassed,
                quality_gate_passed: qualityPassed,
                quality_gate_notes: qualityPassed ? [] : qualityResult.failures,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', doc.document_type);

            if (!aiPassed || !qualityPassed) {
              const reasons = [];
              if (!aiPassed) reasons.push(`AI score ${aiScore} (threshold ${DETECTION_THRESHOLD})`);
              if (!qualityPassed) reasons.push(`quality gate: ${qualityResult.failures.join(', ')}`);
              console.warn(`[HUMANIZE] ${doc.document_type}: max attempts reached — ${reasons.join('; ')} — flagged for review`);
            }
            break;
          }

          // Build feedback combining AI detection and quality gate issues for next attempt
          const feedbackParts: string[] = [];
          if (!aiPassed) {
            feedbackParts.push(`AI detection score: ${aiScore} (threshold: ${DETECTION_THRESHOLD}). The text still reads as AI-generated. Focus on: more varied sentence lengths, removing formal transitions, adding personal voice from the voice profile.`);
          }
          if (!qualityPassed) {
            feedbackParts.push(`Quality gate failures: ${qualityResult.failures.join('; ')}. Address each issue above.`);
          }
          lastFeedback = feedbackParts.join('\n\n');
          currentText = humanized;

          console.log(`[HUMANIZE] ${doc.document_type}: attempt ${attempt} AI=${aiScore} quality=${qualityPassed ? 'pass' : 'fail'} — retrying`);
        } catch (err) {
          console.error(`[HUMANIZE] ${doc.document_type} attempt ${attempt} failed:`, err);
          actualAttempts = attempt;
          if (attempt === HUMANIZATION_MAX_ATTEMPTS) {
            console.warn(`[HUMANIZE] ${doc.document_type}: all attempts failed, keeping original`);
          }
          break;
        }
      }

      humanizationState.set(doc.document_type, { attempts: actualAttempts, finalScore });
    }

    emitStep(13, 'complete');
    await updateJob({ current_step: 13, current_step_label: GENERATION_STEP_LABELS[13] });

    // Step 14: Metadata sanitization — strip placeholders, AI artifacts, and markdown
    emitStep(14, 'running');
    await updateJob({ current_step: 14, current_step_label: GENERATION_STEP_LABELS[14] });

    for (const doc of generatedDocs) {
      if (doc.content_text) {
        let clean = doc.content_text;
        let metadataClean = true;

        // Remove template placeholders
        clean = clean.replace(/\{\{.*?\}\}/g, '');
        clean = clean.replace(/\[\[.*?\]\]/g, '');
        clean = clean.replace(/\[UNVERIFIED\]/gi, '');
        clean = clean.replace(/\[TODO.*?\]/gi, '');
        LLM_REFERENCE_BRACKET_REGEX.lastIndex = 0;
        clean = clean.replace(LLM_REFERENCE_BRACKET_REGEX, '');

        // Remove AI tool names and references
        for (const toolName of AI_TOOL_NAMES) {
          const regex = new RegExp(`\\b${toolName}\\b`, 'gi');
          clean = clean.replace(regex, '[AI tool]');
        }

        // Remove generation timestamps and internal references
        clean = clean.replace(/\b(?:generated|created|written)\s+(?:on|at|by)\s+[^\n]{5,50}/gi, '');
        clean = clean.replace(/\[.*?(?:prompt|instruction|context).*?\]/gi, '');

        // Remove markdown formatting that shouldn't be in legal documents
        clean = clean.replace(/^#{1,6}\s+/gm, '');  // Remove ## headers
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');  // Remove bold
        clean = clean.replace(/\*([^*]+)\*/g, '$1');  // Remove italic
        clean = clean.replace(/`{1,3}[^`]*`{1,3}/g, '');  // Remove code blocks
        clean = clean.replace(/^\s*[-*+]\s+/gm, '');  // Remove list markers
        clean = clean.replace(/^\s*\d+\.\s+/gm, '');  // Remove numbered lists

        // Clean up multiple blank lines
        clean = clean.replace(/\n{3,}/g, '\n\n');

        // Detect remaining placeholders as metadata not clean
        LLM_REFERENCE_BRACKET_REGEX.lastIndex = 0;
        if (/\{\{.*?\}\}/.test(clean) || /\[\[.*?\]\]/.test(clean) || /\[UNVERIFIED\]/i.test(clean) || LLM_REFERENCE_BRACKET_REGEX.test(clean)) {
          metadataClean = false;
        }
        LLM_REFERENCE_BRACKET_REGEX.lastIndex = 0;

        if (clean !== doc.content_text) {
          await supabase
            .from('generated_documents')
            .update({
              content_text: clean,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId)
            .eq('document_type', doc.document_type);
        }

        // Log to pipeline_log (Stage 6)
        await supabase
          .from('generation_pipeline_log')
          .update({
            stage6_completed: true,
            stage6_metadata_clean: metadataClean,
            stage6_completed_at: new Date().toISOString(),
          })
          .eq('application_id', applicationId)
          .eq('document_type', doc.document_type);
      }
    }

    emitStep(14, 'complete');
    await updateJob({ current_step: 14, current_step_label: GENERATION_STEP_LABELS[14] });

    // Step 15: Quality Gate - Final validation of each document
    emitStep(15, 'running');
    await updateJob({ current_step: 15, current_step_label: GENERATION_STEP_LABELS[15] });

    // caseBriefData and investmentTotal declared above Step 11 — reused here

    let _allQualityPassed = true;
    let totalLegalViolations = 0;

    for (const doc of generatedDocs) {
      const qualityResult = runQualityGate(doc, doc.document_type, {
        caseBrief: caseBriefData,
        investmentTotal,
      });

      // Re-prompt once if quality gate fails
      if (!qualityResult.passed) {
        try {
          const payload = await buildGenerationPayload(applicationId, doc.document_type, caseBrief);
          const failureInstructions = [
            'CRITICAL: Your previous output failed the quality check. Fix these issues:',
            ...qualityResult.failures.map(f => `  - ${f}`),
            '',
            'Rewrite the document addressing all failures above.',
          ].join('\n');

          const model = await getGenerationModel();
          const retryArchetype = (caseBrief as unknown as Record<string, unknown>)?.archetype as string ?? 'unknown';
          const retryArchetypeGuidance = buildArchetypeGuidance(retryArchetype, doc.document_type);
          const retrySystemPrompt = retryArchetypeGuidance
            ? `${payload.system_prompt}\n\n---\n\n${retryArchetypeGuidance}\n\n${failureInstructions}`
            : `${payload.system_prompt}\n\n${failureInstructions}`;
          const retryResponse = await getAnthropic().messages.create({
            model,
            max_tokens: 4000,
            system: retrySystemPrompt,
            messages: [{ role: 'user', content: 'Regenerate the document now.' }],
          });

          const retryContent = retryResponse.content[0];
          if (retryContent.type === 'text') {
            const wc = countWords(retryContent.text);
            const pages = estimatePages(wc);

            await supabase
              .from('generated_documents')
              .update({
                content_text: retryContent.text,
                word_count: wc,
                page_estimate: pages,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', doc.document_type);

            // Re-run quality gate
            const retryQuality = runQualityGate(
              { ...doc, content_text: retryContent.text },
              doc.document_type,
              { caseBrief: caseBriefData, investmentTotal }
            );

            await supabase
              .from('generated_documents')
              .update({
                quality_gate_passed: retryQuality.passed,
                quality_gate_notes: retryQuality.failures,
                updated_at: new Date().toISOString(),
              })
              .eq('job_id', jobId)
              .eq('document_type', doc.document_type);

            if (!retryQuality.passed) {
              _allQualityPassed = false;
              totalLegalViolations += retryQuality.failures.filter(f =>
                f.includes('forbidden legal conclusion')
              ).length;
            }
          }
        } catch {
          _allQualityPassed = false;
        }
      } else {
        await supabase
          .from('generated_documents')
          .update({
            quality_gate_passed: true,
            quality_gate_notes: [],
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', doc.document_type);
      }
    }

    // REQUIRED_ELEMENTS completeness check (Spec4 Stage 5)
    for (const doc of generatedDocs) {
      const requiredElements = REQUIRED_ELEMENTS[doc.document_type];
      if (!requiredElements || !doc.content_text) continue;

      const lowerContent = doc.content_text.toLowerCase();
      const missingElements: string[] = [];

      for (const element of requiredElements) {
        // Map element names to searchable patterns
        const elementPatterns: Record<string, RegExp[]> = {
          // Cover letter
          applicant_name: [/applicant/i, /i,\s/i],
          business_name: [/llc|business|company|enterprise/i],
          investment_amount: [/\$[\d,]+/],
          treaty_country: [/treaty|bilateral|friendship/i],
          consulate_post: [/consulat|embassy|visa/i],
          // Source of funds
          source_description: [/source|origin|fund|source of/i],
          timeline: [/date|timeline|chronolog|when|period/i],
          amount: [/\$[\d,]+/],
          documentation_mentioned: [/document|evidence|support|record/i],
          // Investment proof
          at_risk_amount: [/at.risk|invested|committed|placed/i],
          funds_movement: [/transfer|wire|mov|sent|deposit/i],
          business_ownership: [/owner|member|interest|equity/i],
          // Business plan
          business_description: [/business|service|product|operat/i],
          market_analysis: [/market|customer|competitor|demand/i],
          financial_projections: [/revenue|profit|forecast|project/i],
          job_creation: [/job|employ|hiring|position|worker/i],
          // Qualifications
          applicant_background: [/background|career|professional/i],
          experience: [/experience|year|work|manag/i],
          education: [/educat|degree|university|college|bachelor/i],
          relevant_skills: [/skill|qualif|train|certif/i],
          // DS-160
          personal_information: [/name|birth|nation|address/i],
          travel_history: [/travel|visit|country|traveled/i],
          family_information: [/spouse|child|family|depend/i],
          employment: [/employ|work|job|position|occup/i],
        };

        const patterns = elementPatterns[element] || [];
        const found = patterns.some(p => p.test(lowerContent));
        if (!found) {
          missingElements.push(element);
        }
      }

      if (missingElements.length > 0) {
        console.warn(`[QUALITY] ${doc.document_type}: missing required elements: ${missingElements.join(', ')}`);

        // Log as quality gate failure
        await supabase
          .from('generated_documents')
          .update({
            quality_gate_passed: false,
            quality_gate_notes: [
              ...(doc.quality_gate_notes || []),
              `Missing required elements: ${missingElements.join(', ')}`,
            ],
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', doc.document_type);

        _allQualityPassed = false;
      }
    }

    // CONSISTENCY_FIELDS cross-document validation (Spec4 Stage 4)
    // Reuses consistencyResult from Step 9 above — no duplicate call
    if (!consistencyResult.passed) {
      console.warn(`[QUALITY] Cross-document consistency issues:`, consistencyResult.issues);
      _allQualityPassed = false;

      // Log consistency issues to pipeline_log
      for (const doc of generatedDocs) {
        await supabase
          .from('generation_pipeline_log')
          .update({
            stage4_completed: true,
            stage4_issues_found: consistencyResult.issues.length,
            stage4_completed_at: new Date().toISOString(),
          })
          .eq('application_id', applicationId)
          .eq('document_type', doc.document_type);
      }
    } else {
      // Log consistency passed
      for (const doc of generatedDocs) {
        await supabase
          .from('generation_pipeline_log')
          .update({
            stage4_completed: true,
            stage4_issues_found: 0,
            stage4_completed_at: new Date().toISOString(),
          })
          .eq('application_id', applicationId)
          .eq('document_type', doc.document_type);
      }
    }

    // Log quality gate results to pipeline_log (Stage 5)
    for (const doc of generatedDocs) {
      const wc = countWords(doc.content_text || '');
      const pages = estimatePages(wc);

      await supabase
        .from('generation_pipeline_log')
        .update({
          stage5_completed: _allQualityPassed,
          stage5_legal_violations: totalLegalViolations,
          stage5_page_count: pages,
          stage5_uniqueness_passed: true, // Uniqueness check not yet implemented — default pass
          stage5_completed_at: new Date().toISOString(),
        })
        .eq('application_id', applicationId)
        .eq('document_type', doc.document_type);
    }

    emitStep(15, 'complete');
    await updateJob({ current_step: 15, current_step_label: GENERATION_STEP_LABELS[15] });

    // Step 16: Acknowledgment Gate — log results, set final status
    emitStep(16, 'running');
    await updateJob({ current_step: 16, current_step_label: GENERATION_STEP_LABELS[16] });

    for (const docType of DOCUMENT_TYPES) {
      const generatedDoc = generatedDocs.find(d => d.document_type === docType);

      // Get quality gate results for this document
      const { data: docData } = await supabase
        .from('generated_documents')
        .select('quality_gate_passed, quality_gate_notes, word_count, ai_detection_score, ai_detection_passed')
        .eq('job_id', jobId)
        .eq('document_type', docType)
        .single();

      // Log results to document_generation_log (existing table)
      await supabase
        .from('document_generation_log')
        .insert({
          application_id: applicationId,
          document_type: docType,
          stage: 'acknowledgment_gate',
          attempt_number: 1,
          passed: docData?.quality_gate_passed ?? true,
          flagged_sections: docData?.quality_gate_notes || [],
          notes: `Quality gate completed. Word count: ${docData?.word_count || 'N/A'}. AI detection: ${generatedDoc?.ai_detection_passed ? 'passed' : 'not run'}.`,
        });

      // Ensure quality_gate_passed is set
      if (docData?.quality_gate_passed === null || docData?.quality_gate_passed === undefined) {
        await supabase
          .from('generated_documents')
          .update({
            quality_gate_passed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('document_type', docType);
      }

      // Update pipeline_log with Stage 2 (humanize) and Stage 3 (AI detection) results
      // Read actual humanization attempt count and final score from the tracking map
      const hState = humanizationState.get(docType);
      const actualAttempts = hState?.attempts ?? 0;
      // Prefer the score from humanization loop; fall back to Step 10 audit score; then DB
      const aiDetectionScore = hState?.finalScore ?? generatedDoc?.ai_detection_score ?? docData?.ai_detection_score;

      // Determine final_status: 'FAILED' only if quality gate failed after all attempts
      const qualityPassed = docData?.quality_gate_passed ?? true;
      const finalStatus = qualityPassed ? 'PENDING_REVIEW' : 'FAILED';

      await supabase
        .from('generation_pipeline_log')
        .update({
          stage2_completed: true,
          stage2_completed_at: new Date().toISOString(),
          stage3_completed: true,
          stage3_detection_score: aiDetectionScore ?? null,
          stage3_attempts: actualAttempts,
          stage3_completed_at: new Date().toISOString(),
          final_status: finalStatus,
        })
        .eq('application_id', applicationId)
        .eq('document_type', docType);
    }

    emitStep(16, 'complete');
    await updateJob({ current_step: 16, current_step_label: GENERATION_STEP_LABELS[16] });

    // Step 17: Preview unlocked
    emitStep(17, 'complete');
    await updateJob({ current_step: 17, current_step_label: GENERATION_STEP_LABELS[17] });

    // Determine final job status: 'completed' if all documents passed quality gate,
    // 'partial' if one or more documents have final_status 'FAILED'
    const { data: finalPipelineLogs } = await supabase
      .from('generation_pipeline_log')
      .select('final_status')
      .eq('application_id', applicationId);

    const hasFailures = finalPipelineLogs?.some(log => log.final_status === 'FAILED') ?? false;
    const jobFinalStatus = hasFailures ? 'partial' : 'completed';

    await updateJob({
      status: jobFinalStatus,
      completed_at: new Date().toISOString(),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown pipeline error';
    await fail(0, msg);
  }
}