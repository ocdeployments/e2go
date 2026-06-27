// ============================================================================
// FDD Intelligence — Extraction Engine
// ============================================================================
// Splits FDD text into Item-targeted sections, runs 4 focused LLM passes,
// merges results. Uses Anthropic directly for large-context reliability.

import Anthropic from '@anthropic-ai/sdk';
import { sanitizeForPrompt } from '@/lib/prompt-sanitizer';
import { REGISTRATION_STATES } from '@/types/fdd';
import type { FddExtractedFields, FddFieldMeta, FddStaleStatus, FddRegistrationStatus } from '@/types/fdd';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const MAX_CHUNK_CHARS = 80_000;  // ~60K tokens — safe for Sonnet 4.6

// ============================================================================
// PDF text extraction (no truncation — FDDs need full text)
// ============================================================================

export interface FddTextResult {
  text: string;
  pageCount: number;
  isScanned: boolean;
  charCount: number;
}

export async function extractFddText(buffer: Buffer): Promise<FddTextResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text || '';
  const isScanned = text.trim().length < 500;

  return {
    text,
    pageCount: (result as { total?: number }).total || 0,
    isScanned,
    charCount: text.length,
  };
}

// ============================================================================
// Section splitting — finds Item boundaries by FTC-mandated headings
// ============================================================================

interface FddSections {
  items_1_7: string;
  items_11_12: string;
  item_17: string;
  items_19_21: string;
}

// Multiple patterns per item number — tried in order, first match wins.
// Handles: standard "ITEM 1 ", period-then-newline "ITEM 1.\n", colon/dash variants,
// and spaced-letter artifacts from some PDF extractors ("I T E M  1").
const ITEM_PATTERNS: Record<number, RegExp[]> = {
  1:  [/ITEM\s+1[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+1\.\s*\n/im, /(?:^|\n)\s*ITEM\s+1\s*[:\-]\s/im],
  3:  [/ITEM\s+3[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+3\.\s*\n/im, /(?:^|\n)\s*ITEM\s+3\s*[:\-]\s/im],
  8:  [/ITEM\s+8[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+8\.\s*\n/im, /(?:^|\n)\s*ITEM\s+8\s*[:\-]\s/im],
  11: [/ITEM\s+11[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+11\.\s*\n/im, /(?:^|\n)\s*ITEM\s+11\s*[:\-]\s/im],
  13: [/ITEM\s+13[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+13\.\s*\n/im, /(?:^|\n)\s*ITEM\s+13\s*[:\-]\s/im],
  17: [/ITEM\s+17[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+17\.\s*\n/im, /(?:^|\n)\s*ITEM\s+17\s*[:\-]\s/im],
  18: [/ITEM\s+18[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+18\.\s*\n/im, /(?:^|\n)\s*ITEM\s+18\s*[:\-]\s/im],
  19: [/ITEM\s+19[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+19\.\s*\n/im, /(?:^|\n)\s*ITEM\s+19\s*[:\-]\s/im],
  22: [/ITEM\s+22[\s\W](?![^\n]*\.{3,})/i, /(?:^|\n)\s*ITEM\s+22\.\s*\n/im, /(?:^|\n)\s*ITEM\s+22\s*[:\-]\s/im],
};

function findItemOffset(text: string, itemNum: number, searchFrom = 0): number {
  const patterns = ITEM_PATTERNS[itemNum];
  if (!patterns) return -1;
  const slice = text.slice(searchFrom);
  for (const pattern of patterns) {
    const match = slice.match(pattern);
    if (match && match.index !== undefined) return searchFrom + match.index;
  }
  return -1;
}

// When an item boundary isn't found, fall back to a proportional document slice
// rather than always returning the start. FDD sections are approximately:
//   Items 1-7: first half | Items 11-12: middle | Item 17: ~65-80% | Items 19-21: last third
function sliceSection(
  text: string,
  startItem: number,
  endItem: number,
  fallbackStartFrac: number,
  fallbackEndFrac: number,
): string {
  const start = findItemOffset(text, startItem);
  const end = findItemOffset(text, endItem, start > 0 ? start + 100 : 0);
  if (start === -1) {
    const docLen = text.length;
    const fb = text.slice(
      Math.floor(docLen * fallbackStartFrac),
      Math.floor(docLen * fallbackEndFrac),
    );
    return fb.slice(0, MAX_CHUNK_CHARS);
  }
  const raw = end > start ? text.slice(start, end) : text.slice(start);
  return raw.slice(0, MAX_CHUNK_CHARS);
}

export function splitFddIntoSections(text: string): FddSections {
  return {
    items_1_7:   sliceSection(text, 1,  8,  0.05, 0.50),
    items_11_12: sliceSection(text, 11, 13, 0.45, 0.65),
    item_17:     sliceSection(text, 17, 18, 0.60, 0.78),
    items_19_21: sliceSection(text, 19, 22, 0.65, 1.00),
  };
}

// ============================================================================
// Anthropic LLM caller
// ============================================================================

async function callAnthropic(system: string, user: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Anthropic returned non-text block');
  return block.text;
}

function parseJsonFromLlm(raw: string): Record<string, FddFieldMeta> {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the JSON object in the response
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

// ============================================================================
// Chunk A — Items 1–7
// ============================================================================

const CHUNK_A_SYSTEM = `You are an expert franchise attorney extracting structured data from a Franchise Disclosure Document (FDD) regulated under the FTC Franchise Rule (16 CFR Part 436).

Extract the requested fields from the FDD text provided. Return ONLY valid JSON — no preamble, no markdown, no explanation.

For each field, return an object with:
- "value": the extracted value (string, number, boolean, array, or null)
- "_page": page number where found (integer or null)
- "_quote": exact source text up to 150 chars (string or null)
- "_conf": "high" | "medium" | "low" | "not_disclosed"

If a field is not present, set value to null and _conf to "not_disclosed".
Do not fabricate values. Do not infer beyond what the text states.

IMPORTANT — PDF TEXT ARTIFACTS: FDD text extracted from PDFs often has table cells run together, random line breaks mid-number, or dollar signs detached from their amounts. Read dollar amounts and percentages carefully even when formatting is garbled.

IMPORTANT — adapt to franchise category terminology:
- Home care / senior care FDDs: revenue appears as "gross billings", "client billings", "annualized territory billings", or "annualized run rate". Caregiver headcount replaces employee count. Item 19 shows billing ranges per territory, not per-unit AUV. Map these to the requested revenue fields.
- Fitness / gym / wellness: members rather than customers; EFT revenue; "mature location" or "ramp period" language for AUV.
- Education / tutoring / childcare: "enrollment", "student capacity", "center-based" vs "home-based". AUV may be "annual revenue per learning center".
- Healthcare / therapy / medical: "patient visits", "reimbursement rates", "Medicare/Medicaid". Revenue may be disclosed as a billing range rather than AUV.
- B2B services (staffing, consulting, facilities, cleaning): AUV may be "gross billings" or "contracted revenue". Very little equipment; working capital dominates Item 7.
- Home-based / mobile services: minimal or zero real estate; working capital and vehicle costs dominate Item 7.
- Food / retail / coffee: standard AUV, covers, seat counts, COGS%, food cost%.
- Automotive: bay counts, ticket averages, parts vs labor revenue.

For ALL categories: do not require exact label matches — identify the underlying metric and map it to the correct field. If the document uses non-standard terminology, preserve the actual label from the document in the _quote field.

NUMERIC VALUES: Always extract as integers (no $ signs, no commas). Percentages as decimals (e.g. 6% → 0.06). Ranges → extract min and max separately where fields request both.`;

async function extractChunkA(text: string): Promise<Record<string, FddFieldMeta>> {
  const userPrompt = `FDD text (Items 1–7):
${sanitizeForPrompt(text)}

Extract these fields and return as a single JSON object:

{
  "franchisor_legal_name": { "value": "...", "_page": null, "_quote": "...", "_conf": "high" },
  "parent_company": {...},
  "headquarters_state": {...},
  "year_business_began": {...},
  "year_franchising_began": {...},
  "total_franchise_units_current": {...},
  "fdd_effective_date": { "value": "YYYY-MM-DD or null", ... },
  "fdd_fiscal_year_covered": { "value": integer or null, ... },
  "registered_states_list": { "value": ["CA","NY",...] or [], ... },
  "state_addendum_present": { "value": true/false, ... },
  "state_addendum_key_differences": { "value": "summary or null", ... },
  "executive_franchise_experience_years": { "value": integer, ... },
  "executive_prior_brands": { "value": integer, ... },
  "active_litigation_count": { "value": integer, ... },
  "franchisee_initiated_suits": { "value": integer, ... },
  "regulatory_actions_count": { "value": integer, ... },
  "litigation_pattern_summary": { "value": "2-3 sentence summary", ... },
  "franchisor_bankruptcy_history": { "value": true/false, ... },
  "executive_bankruptcy_history": { "value": true/false, ... },
  "bankruptcy_details": { "value": "details or null", ... },
  "initial_franchise_fee": { "value": integer USD, ... },
  "fee_is_refundable": { "value": true/false, ... },
  "fee_refund_conditions": { "value": "description", ... },
  "royalty_rate_pct": { "value": float e.g. 0.06, ... },
  "royalty_basis": { "value": "gross revenue|net revenue|flat fee|other", ... },
  "marketing_fund_pct": { "value": float, ... },
  "technology_fee_monthly": { "value": integer USD or null, ... },
  "other_recurring_fees": { "value": "description or null", ... },
  "fee_escalation_rights": { "value": true/false, ... },
  "total_investment_min": { "value": integer USD, ... },
  "total_investment_max": { "value": integer USD, ... },
  "component_real_estate": { "value": "e.g. $5,000–$15,000", ... },
  "component_equipment": { "value": "...", ... },
  "component_initial_inventory": { "value": "...", ... },
  "component_working_capital": { "value": "...", ... },
  "component_franchise_fee": { "value": integer USD, ... },
  "component_training_travel": { "value": "...", ... },
  "working_capital_months_covered": { "value": integer, ... },
  "estimated_cogs_pct": { "value": float e.g. 0.30, "_conf": "medium", "_quote": "Industry estimate for [category]: ~30% COGS", "_page": null }
}`;

  const raw = await callAnthropic(CHUNK_A_SYSTEM, userPrompt, 5000);
  return parseJsonFromLlm(raw);
}

// ============================================================================
// Chunk B — Items 11–12
// ============================================================================

async function extractChunkB(text: string): Promise<Record<string, FddFieldMeta>> {
  const userPrompt = `FDD text (Items 11–12):
${sanitizeForPrompt(text)}

Extract these fields and return as a single JSON object:

{
  "initial_training_hours": { "value": integer, "_page": null, "_quote": "...", "_conf": "..." },
  "ongoing_training_available": { "value": true/false, ... },
  "field_support_visits": { "value": "description of frequency", ... },
  "training_location": { "value": "city/state or 'franchisee location'", ... },
  "typical_fte_employees": { "value": integer, ... },
  "opening_day_employees": { "value": integer, "_conf": "medium", "_quote": "estimate from staffing description", "_page": null },
  "investor_role": { "value": "active owner-operator|semi-passive|passive", ... },
  "investor_hours_per_week": { "value": integer or null, ... },
  "typical_time_to_open_months": { "value": integer, "_conf": "medium", "_quote": "estimate from training + build-out timeline", "_page": null },
  "territory_type": { "value": "exclusive|protected|none", ... },
  "territory_definition": { "value": "how territory is defined", ... },
  "ecommerce_carve_out": { "value": true/false, ... },
  "nontraditional_location_carve_out": { "value": true/false, ... },
  "territory_size_households": { "value": integer or null, ... },
  "right_of_first_refusal": { "value": true/false, ... },
  "franchisor_minimum_separation_miles": { "value": float or null, ... }
}`;

  const raw = await callAnthropic(CHUNK_A_SYSTEM, userPrompt, 3000);
  return parseJsonFromLlm(raw);
}

// ============================================================================
// Chunk C — Item 17
// ============================================================================

async function extractChunkC(text: string): Promise<Record<string, FddFieldMeta>> {
  const userPrompt = `FDD text (Item 17 — Renewal, Termination, Transfer, and Related Information):
${sanitizeForPrompt(text)}

Extract these fields and return as a single JSON object:

{
  "initial_term_years": { "value": integer, "_page": null, "_quote": "...", "_conf": "..." },
  "renewal_available": { "value": true/false, ... },
  "renewal_on_current_terms": { "value": true/false, "_quote": "true if can renew on same agreement; false if must sign new/then-current agreement", ... },
  "termination_triggers_count": { "value": integer, "_quote": "count of distinct events listed as termination triggers", ... },
  "cure_period_days": { "value": integer, "_quote": "shortest cure period for curable defaults (0 if any defaults are uncurable with no notice)", ... },
  "transfer_fee": { "value": integer USD, ... },
  "post_termination_noncompete_years": { "value": integer, ... },
  "post_termination_noncompete_radius_miles": { "value": integer, ... },
  "transfer_approval_timeline_days": { "value": integer, "_quote": "days franchisor has to approve or deny a transfer", ... },
  "right_of_first_refusal_on_sale": { "value": true/false, ... },
  "transfer_to_entity_allowed": { "value": true/false, "_quote": "true if franchise can be held by LLC or corporation", ... }
}`;

  const raw = await callAnthropic(CHUNK_A_SYSTEM, userPrompt, 2500);
  return parseJsonFromLlm(raw);
}

// ============================================================================
// Chunk D — Items 19–21
// ============================================================================

async function extractChunkD(text: string): Promise<Record<string, FddFieldMeta>> {
  const userPrompt = `FDD text (Items 19–21 — Financial Performance, Outlets, Audited Financials):
${sanitizeForPrompt(text)}

ITEM 19 EXTRACTION NOTES:
- Item 19 data is often in tables. PDF extraction may mangle column alignment — read carefully.
- "AUV" = Average Unit Volume = average annual gross revenue per unit. Some FDDs call this "average annual gross sales", "average annual billings", or "average annualized revenue". Extract the single most representative average figure.
- Home care / territory-based FDDs: Item 19 shows annualized billing ranges per territory. Use the midpoint of the median range as item19_median; the overall system average (if stated) as item19_auv.
- If multiple tiers are shown (e.g. by age of location, unit type, or region), use the ALL-UNIT or FULL-SYSTEM row. If no aggregate is given, use the franchisee-only row (exclude company/affiliate units).
- item19_pct_system_included: if the document says "X of Y units" or "X franchisees representing Y% of the system", extract Y as a float (0.72 = 72%). If all units included, value = 1.0.
- item19_cherry_pick_flag: set true if the inclusion criteria systematically exclude underperforming units (e.g., "units open 24+ months only", "units achieving breakeven", "top quartile").

Extract these fields and return as a single JSON object:

{
  "item19_present": { "value": true/false, "_page": null, "_quote": "...", "_conf": "high" },
  "item19_metric_type": { "value": "gross_revenue|net_income|EBITDA|gross_billings|multiple|null", ... },
  "item19_fiscal_year": { "value": integer or null, "_quote": "fiscal year the Item 19 data covers", ... },
  "item19_auv": { "value": integer USD or null, "_quote": "average unit volume or equivalent figure", ... },
  "item19_median": { "value": integer USD or null, ... },
  "item19_mean": { "value": integer USD or null, ... },
  "item19_high": { "value": integer USD or null, ... },
  "item19_low": { "value": integer USD or null, ... },
  "item19_units_included": { "value": integer or null, "_quote": "number of units or territories in the dataset", ... },
  "item19_pct_system_included": { "value": float 0-1 or null, "_quote": "e.g. 0.72 for 72% of system", ... },
  "item19_includes_franchisee_units": { "value": true/false, "_quote": "false if company/affiliate units only", ... },
  "item19_footnote_exclusions": { "value": "what was excluded and why, or null", ... },
  "item19_cherry_pick_flag": { "value": true/false, "_quote": "your assessment: is this selectively presenting top performers?", "_conf": "medium" },
  "total_units_open_current": { "value": integer, ... },
  "units_opened_yr1": { "value": integer, "_quote": "most recent year", ... },
  "units_opened_yr2": { "value": integer, ... },
  "units_opened_yr3": { "value": integer, ... },
  "units_closed_yr1": { "value": integer, ... },
  "units_closed_yr2": { "value": integer, ... },
  "units_closed_yr3": { "value": integer, ... },
  "franchisee_initiated_closures_3yr": { "value": integer, "_quote": "voluntary exits by franchisee over 3 years", ... },
  "franchisor_initiated_terminations_3yr": { "value": integer, ... },
  "former_franchisee_contacts_available": { "value": true/false, "_quote": "Item 20 contact list populated", ... },
  "audit_opinion": { "value": "unqualified|qualified|adverse|review_only", ... },
  "years_of_financials": { "value": integer, ... },
  "royalty_revenue_trend": { "value": "growing|flat|declining", "_quote": "comparison of royalty revenue across 3 years", ... },
  "franchise_fee_revenue_trend": { "value": "growing|flat|declining", ... },
  "royalty_vs_fee_ratio": { "value": float 0-1, "_quote": "royalty revenue divided by total revenue, most recent year", ... },
  "franchisor_net_income": { "value": integer USD, "_quote": "most recent year net income", ... },
  "liquidity_ratio": { "value": float, "_quote": "current assets divided by current liabilities", ... },
  "debt_covenant_flags": { "value": true/false, "_quote": "restrictive debt covenants in notes to financials", ... }
}`;

  const raw = await callAnthropic(CHUNK_A_SYSTEM, userPrompt, 4000);
  return parseJsonFromLlm(raw);
}

// ============================================================================
// Derived / computed fields
// ============================================================================

function computeDerivedFields(
  fields: Record<string, FddFieldMeta>,
  targetState: string | null
): Partial<FddExtractedFields> {
  const derived: Record<string, FddFieldMeta> = {};

  // FDD age in months
  const effectiveDateMeta = fields['fdd_effective_date'];
  if (effectiveDateMeta?.value && typeof effectiveDateMeta.value === 'string') {
    const date = new Date(effectiveDateMeta.value);
    if (!isNaN(date.getTime())) {
      const ageMonths = Math.floor(
        (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      derived['fdd_age_months'] = {
        value: ageMonths,
        _page: null,
        _quote: `Calculated from effective date: ${effectiveDateMeta.value}`,
        _conf: 'high',
      };
    }
  }

  // State registration check
  if (targetState) {
    const isRegistrationState = REGISTRATION_STATES.has(targetState.toUpperCase());
    const registeredList = fields['registered_states_list']?.value;
    const isRegistered =
      Array.isArray(registeredList) &&
      registeredList.some((s: string) => s.toUpperCase() === targetState.toUpperCase());

    derived['accepts_nonimmigrant_visa_holders'] = {
      value: null,
      _page: null,
      _quote: 'Cannot be determined from FDD — confirm directly with franchisor',
      _conf: 'not_disclosed',
    };

    if (isRegistrationState) {
      derived['_registration_state_flag'] = {
        value: isRegistered,
        _page: null,
        _quote: isRegistered
          ? `${targetState} is a registration state — franchisor appears registered`
          : `${targetState} is a registration state — registration not confirmed in FDD`,
        _conf: isRegistered ? 'high' : 'medium',
      } as FddFieldMeta;
    }
  }

  // Item 19 median vs mean gap
  const median = fields['item19_median']?.value;
  const mean = fields['item19_mean']?.value;
  if (typeof median === 'number' && typeof mean === 'number' && mean > 0) {
    const gap = Math.abs(mean - median) / mean;
    derived['item19_median_vs_mean_gap'] = {
      value: Math.round(gap * 100) / 100,
      _page: null,
      _quote: `Gap = ${Math.round(gap * 100)}% — ${gap > 0.3 ? 'HIGH variability' : 'normal variability'}`,
      _conf: 'high',
    };
  }

  // COVID period flag
  const fiscalYear = fields['item19_fiscal_year']?.value;
  if (typeof fiscalYear === 'number' && fiscalYear >= 2019 && fiscalYear <= 2022) {
    derived['covid_period_flag'] = {
      value: true,
      _page: null,
      _quote: `Item 19 data from ${fiscalYear} — COVID period may distort performance`,
      _conf: 'high',
    };
  } else if (typeof fiscalYear === 'number') {
    derived['covid_period_flag'] = { value: false, _page: null, _quote: null, _conf: 'high' };
  }

  // Total ongoing fee pct
  const royalty = fields['royalty_rate_pct']?.value;
  const mktg = fields['marketing_fund_pct']?.value;
  if (typeof royalty === 'number') {
    const total = (royalty || 0) + (typeof mktg === 'number' ? mktg : 0);
    derived['total_ongoing_fee_pct'] = {
      value: Math.round(total * 1000) / 1000,
      _page: null,
      _quote: `Royalty ${Math.round((royalty || 0) * 100)}% + marketing ${Math.round((typeof mktg === 'number' ? mktg : 0) * 100)}%`,
      _conf: 'high',
    };
  }

  return derived as Partial<FddExtractedFields>;
}

// ============================================================================
// Staleness assessment
// ============================================================================

export function assessStaleness(ageMonths: number | null): {
  status: FddStaleStatus;
  message: string;
} {
  if (ageMonths === null) return { status: 'warn', message: 'FDD effective date not found — cannot assess currency' };
  if (ageMonths > 18) return { status: 'fail', message: `FDD is ${ageMonths} months old. It may be superseded. Request the current year FDD.` };
  if (ageMonths > 12) return { status: 'warn', message: `FDD is ${ageMonths} months old. Confirm no material changes since issuance.` };
  return { status: 'current', message: `FDD is ${ageMonths} months old — within current year window.` };
}

// ============================================================================
// State registration assessment
// ============================================================================

export function assessRegistration(
  targetState: string | null,
  registeredList: string[] | null
): { is_registration_state: boolean; status: FddRegistrationStatus; message: string } {
  if (!targetState) return { is_registration_state: false, status: 'unknown', message: 'Target state not provided' };

  const upper = targetState.toUpperCase();
  const isRegState = REGISTRATION_STATES.has(upper);

  if (!isRegState) {
    return { is_registration_state: false, status: 'pass', message: `${upper} is not a registration state — no registration required to sell` };
  }

  if (!registeredList || !Array.isArray(registeredList)) {
    return { is_registration_state: true, status: 'warn', message: `${upper} is a registration state — registration status not confirmed in FDD` };
  }

  const isRegistered = registeredList.some(s => s.toUpperCase() === upper);
  if (isRegistered) {
    return { is_registration_state: true, status: 'pass', message: `${upper} is a registration state — franchisor appears registered` };
  }

  return {
    is_registration_state: true,
    status: 'fail',
    message: `${upper} is a registration state — franchisor not listed as registered. Cannot legally sell franchise in ${upper}.`,
  };
}

// ============================================================================
// Recovery pass — targeted search for critical fields still null after 4 chunks
// ============================================================================

const CRITICAL_FIELDS = [
  'initial_franchise_fee',
  'royalty_rate_pct',
  'total_investment_min',
  'total_investment_max',
  'item19_auv',
  'item19_median',
] as const;

async function extractCriticalFieldsRecovery(
  text: string,
  existing: Record<string, FddFieldMeta>,
): Promise<Record<string, FddFieldMeta>> {
  const missing = CRITICAL_FIELDS.filter(f => {
    const v = existing[f]?.value;
    return v === null || v === undefined;
  });
  if (missing.length < 2) return {}; // enough populated — skip recovery

  // For recovery: search the full document start + financial sections
  const fullSnippet = sanitizeForPrompt(
    text.slice(0, Math.floor(MAX_CHUNK_CHARS * 0.6)) +
    '\n\n[...]\n\n' +
    text.slice(Math.floor(text.length * 0.55), Math.floor(text.length * 0.55) + Math.floor(MAX_CHUNK_CHARS * 0.4))
  );

  const prompt = `FDD text (full document excerpt — searching for missing critical fields):
${fullSnippet}

The following critical fields were not extracted in earlier passes. Search the ENTIRE text carefully — these values may appear in:
- Item 5 (fees) for franchise fee and royalty data
- Item 7 (estimated initial investment) for investment ranges
- Item 19 (financial performance representations) for AUV data
- The cover page or introduction for basic fee summaries

The document may use non-standard terminology. Common variations:
- "initial franchise fee" → may appear as "license fee", "entry fee", "initial rights fee"
- "royalty" → may appear as "service fee", "continuing fee", "management fee"
- "AUV" / "average unit volume" → may appear as "average annual gross revenue", "average territory billings", "average annualized billings", "median gross sales"
- "total investment min/max" → look for Item 7 table with "Estimated Initial Investment" column showing low/high range

Return ONLY a JSON object for these fields (omit any that are truly not present):
${JSON.stringify(Object.fromEntries(missing.map(f => [f, { value: null, _page: null, _quote: null, _conf: 'not_disclosed' }])), null, 2)}`;

  const raw = await callAnthropic(CHUNK_A_SYSTEM, prompt, 2000);
  return parseJsonFromLlm(raw);
}

// ============================================================================
// Main entry point — full extraction orchestration
// ============================================================================

export interface ExtractionResult {
  fields: FddExtractedFields;
  staleness: ReturnType<typeof assessStaleness>;
  registration: ReturnType<typeof assessRegistration>;
  totalFields: number;
  lowConfidenceCount: number;
  flagCount: number;
}

export interface ExtractionProgress {
  chunk: string;
  pct: number;
}

export async function extractFdd(
  text: string,
  targetState: string | null,
  onProgress?: (p: ExtractionProgress) => void
): Promise<ExtractionResult> {
  const sections = splitFddIntoSections(text);

  onProgress?.({ chunk: 'items_1_7', pct: 0 });
  const chunkA = await extractChunkA(sections.items_1_7);
  onProgress?.({ chunk: 'items_1_7', pct: 25 });

  onProgress?.({ chunk: 'items_11_12', pct: 25 });
  const chunkB = await extractChunkB(sections.items_11_12);
  onProgress?.({ chunk: 'items_11_12', pct: 50 });

  onProgress?.({ chunk: 'item_17', pct: 50 });
  const chunkC = await extractChunkC(sections.item_17);
  onProgress?.({ chunk: 'item_17', pct: 75 });

  onProgress?.({ chunk: 'items_19_21', pct: 75 });
  const chunkD = await extractChunkD(sections.items_19_21);
  onProgress?.({ chunk: 'items_19_21', pct: 95 });

  // Merge all chunks
  const allFields: Record<string, FddFieldMeta> = {
    ...chunkA,
    ...chunkB,
    ...chunkC,
    ...chunkD,
  };

  // Recovery pass — re-query for critical fields still null
  const recovery = await extractCriticalFieldsRecovery(text, allFields);
  // Only overwrite if recovery found a non-null value
  for (const [key, meta] of Object.entries(recovery)) {
    if (meta?.value !== null && meta?.value !== undefined) {
      allFields[key] = meta;
    }
  }

  // Compute derived fields
  const derived = computeDerivedFields(allFields, targetState);
  const merged = { ...allFields, ...derived } as FddExtractedFields;

  // Staleness
  const ageMonths = merged.fdd_age_months?.value;
  const staleness = assessStaleness(typeof ageMonths === 'number' ? ageMonths : null);

  // Registration
  const registeredList = merged.registered_states_list?.value;
  const registration = assessRegistration(
    targetState,
    Array.isArray(registeredList) ? registeredList as string[] : null
  );

  // Counts
  const fieldEntries = Object.values(merged) as FddFieldMeta[];
  const totalFields = fieldEntries.filter(f => f?.value !== null && f?._conf !== 'not_disclosed').length;
  const lowConfidenceCount = fieldEntries.filter(f => f?._conf === 'low').length;

  // Flag count (preliminary — scoring engine will compute full count)
  let flagCount = 0;
  if (staleness.status !== 'current') flagCount++;
  if (registration.status === 'fail') flagCount++;
  if (merged.item19_cherry_pick_flag?.value === true) flagCount++;
  if ((merged.active_litigation_count?.value as number) >= 3) flagCount++;
  if (merged.franchisor_bankruptcy_history?.value === true) flagCount++;
  if (merged.fee_escalation_rights?.value === true) flagCount++;
  if (merged.ecommerce_carve_out?.value === true) flagCount++;
  if (merged.renewal_on_current_terms?.value === false) flagCount++;
  if ((merged.cure_period_days?.value as number) < 10) flagCount++;
  if (merged.transfer_to_entity_allowed?.value === false) flagCount++;
  if (merged.right_of_first_refusal_on_sale?.value === true) flagCount++;
  if ((merged as Record<string, FddFieldMeta>)['covid_period_flag']?.value === true) flagCount++;

  onProgress?.({ chunk: 'complete', pct: 100 });

  return {
    fields: merged,
    staleness,
    registration,
    totalFields,
    lowConfidenceCount,
    flagCount,
  };
}
