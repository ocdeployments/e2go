import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { extractTextFromBuffer } from '@/lib/text-extraction';
import { callLLM } from '@/lib/llm-client';
import { comprehendApplicationDocuments } from '@/lib/document-comprehension-engine';
import { buildCaseIntelligence } from '@/lib/case-intelligence-core';
import { seedFddAnalysisFromUpload } from '@/lib/cic-fdd-seed';
import type { UploadFileType } from '@/types/document-upload';
import { captureApiError } from '@/lib/capture-error';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// ─── FDD section extractor ────────────────────────────────────────────────────
// FDDs are 300–500 pages. Standard truncation (~32K chars) cuts off at page 15.
// This extracts the full PDF, then splices out each target item by its header.
// First occurrence = table of contents entry. Second occurrence = actual section.

async function extractFDDSections(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const full   = result.text || '';

  const cover = full.slice(0, 4000);

  function findItemSection(text: string, itemNum: number, maxChars = 6000): string {
    const headerRx  = new RegExp(`\\bITEM\\s+${itemNum}\\b`, 'gi');
    const positions: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = headerRx.exec(text)) !== null) positions.push(m.index);
    if (positions.length === 0) return '';
    const start = positions.length >= 2 ? positions[1] : positions[0];
    const nextRx    = new RegExp(`\\bITEM\\s+${itemNum + 1}\\b`, 'i');
    const nextMatch = nextRx.exec(text.slice(start + 30));
    const end = nextMatch ? start + 30 + nextMatch.index : start + maxChars;
    return text.slice(start, Math.min(end, start + maxChars));
  }

  const sections: Array<[string, string]> = [
    ['=== COVER PAGE ===',                                   cover],
    ['=== ITEM 1 — THE FRANCHISOR ===',                     findItemSection(full, 1,  7000)],
    ['=== ITEM 2 — BUSINESS EXPERIENCE ===',                findItemSection(full, 2,  3000)],
    ['=== ITEM 3 — LITIGATION ===',                         findItemSection(full, 3,  4000)],
    ['=== ITEM 4 — BANKRUPTCY ===',                         findItemSection(full, 4,  2000)],
    ['=== ITEM 5 — INITIAL FEES ===',                       findItemSection(full, 5,  4000)],
    ['=== ITEM 6 — OTHER FEES ===',                         findItemSection(full, 6,  5000)],
    ['=== ITEM 7 — ESTIMATED INITIAL INVESTMENT ===',       findItemSection(full, 7,  7000)],
    ['=== ITEM 11 — FRANCHISOR OBLIGATIONS/TRAINING ===',   findItemSection(full, 11, 6000)],
    ['=== ITEM 12 — TERRITORY ===',                         findItemSection(full, 12, 5000)],
    ['=== ITEM 17 — RENEWAL / TERMINATION / TRANSFER ===',  findItemSection(full, 17, 6000)],
    ['=== ITEM 19 — FINANCIAL PERFORMANCE ===',             findItemSection(full, 19, 7000)],
    ['=== ITEM 20 — OUTLETS AND FRANCHISEE INFO ===',       findItemSection(full, 20, 5000)],
    ['=== ITEM 21 — FINANCIAL STATEMENTS ===',              findItemSection(full, 21, 5000)],
  ];

  const combined = sections
    .filter(([, text]) => text.trim())
    .map(([label, text]) => `${label}\n${text}`)
    .join('\n\n');

  return combined.slice(0, 80000);
}

// ─── Comprehensive extraction schemas ────────────────────────────────────────
// Each document is parsed ONCE. Full extraction stored in extracted_json.
// Intake pre-fill reads a subset; FDD analysis, doc gen, and cover letter
// modules read everything else — no re-parsing.

const COMPREHENSIVE_SCHEMAS: Record<string, {
  prompt: string;
  maxTokens: number;
}> = {

  // ── FDD — 80 fields across all relevant items ─────────────────────────────
  fdd: {
    maxTokens: 4000,
    prompt: `You are extracting comprehensive data from a Franchise Disclosure Document (FDD) for an E-2 visa application.
Document sections are labeled above (COVER PAGE, ITEM 1, ITEM 2 ... ITEM 21).
Return ONLY a single valid JSON object. Return null for any field not found — do not guess or infer.
Numbers: plain integers only, no commas, no $ or % symbols. Percentages: numeric only (e.g. "4" for 4%).
Booleans: return as "yes" or "no" strings.

{
  "brand_name": "trade name of the franchise",
  "legal_entity": "franchisor legal entity name from Item 1 or cover",
  "parent_company": "parent company or affiliate name if stated",
  "hq_state": "US state of franchisor headquarters (2-letter code)",
  "hq_location": "city and state of franchisor headquarters",
  "state_of_incorporation": "state where franchisor is incorporated",
  "year_business_began": "year the franchisor business began (4-digit)",
  "year_franchising_began": "year franchising began (4-digit)",
  "industry": "industry/sector (e.g. home care, fitness, food service)",
  "fdd_effective_date": "FDD effective or issue date (YYYY-MM-DD or month year)",
  "accepts_nonimmigrant_visa_holders": "yes or no — does FDD state franchisees may be non-immigrant visa holders",
  "is_registration_state_fdd": "yes or no — does FDD note it is registered in registration states",

  "executive_franchise_experience_years": "total years of franchise industry experience of key executives from Item 2",
  "executive_prior_brands": "other franchise brands executives have worked with",

  "active_litigation_count": "number of active or pending lawsuits from Item 3",
  "franchisee_initiated_suits": "number of suits initiated by franchisees in Item 3",
  "regulatory_actions_count": "number of regulatory or government actions",
  "litigation_summary": "1-sentence summary of litigation pattern or null if none",

  "franchisor_bankruptcy_history": "yes or no — has franchisor filed bankruptcy (Item 4)",
  "executive_bankruptcy_history": "yes or no — have executives filed bankruptcy (Item 4)",

  "franchise_fee": "initial franchise fee USD (numeric only)",
  "fee_is_refundable": "yes or no",
  "fee_refund_conditions": "conditions under which fee is refunded, or null",

  "royalty_rate": "ongoing royalty percentage",
  "royalty_basis": "basis for royalty (e.g. gross revenue, net sales, flat weekly fee)",
  "royalty_description": "how royalty is calculated",
  "marketing_fund_rate": "marketing or advertising fund percentage",
  "technology_fee_monthly": "monthly technology or software fee USD",
  "total_ongoing_fee_pct": "total of royalty plus marketing fund percentage",
  "fee_escalation_rights": "yes or no — can franchisor increase fees unilaterally",
  "other_fees_summary": "brief summary of other significant ongoing fees",

  "investment_low": "lowest total initial investment from Item 7 (numeric)",
  "investment_high": "highest total initial investment from Item 7 (numeric)",
  "investment_mid": "midpoint of Item 7 range, calculate as (low+high)/2 (numeric)",
  "component_real_estate_low": "real estate / leasehold improvement low estimate",
  "component_real_estate_high": "real estate / leasehold improvement high estimate",
  "component_equipment_low": "equipment low estimate",
  "component_equipment_high": "equipment high estimate",
  "component_inventory_low": "initial inventory low estimate",
  "component_inventory_high": "initial inventory high estimate",
  "component_working_capital_low": "working capital low estimate",
  "component_working_capital_high": "working capital high estimate",
  "component_training_travel_low": "training and travel costs low estimate",
  "component_training_travel_high": "training and travel costs high estimate",
  "working_capital_months_covered": "how many months of working capital Item 7 covers (numeric)",

  "initial_training_hours": "total initial training hours (classroom + OJT combined, numeric)",
  "training_classroom_hours": "classroom or online training hours only",
  "training_otj_hours": "on-the-job training hours at training location",
  "training_location": "where initial training takes place",
  "ongoing_training_available": "yes or no",
  "field_support_visits": "number of field support visits per year if stated",
  "typical_fte_employees": "typical number of full-time employees at an open franchise location",
  "opening_day_employees": "minimum employees required on opening day",
  "investor_role": "description of franchisee / investor day-to-day role from Item 11",
  "investor_hours_per_week": "typical hours per week franchisee works (numeric)",
  "typical_time_to_open_months": "typical months from signing to opening (numeric)",
  "training_description": "2-3 sentence description of training and support system",

  "territory_type": "exclusive or non-exclusive or protected",
  "territory_definition": "how territory is defined (population, radius, zip, county)",
  "territory_size_households": "approximate number of households in territory",
  "ecommerce_carve_out": "yes or no — does franchisor carve out online/ecommerce from territory",
  "nontraditional_carve_out": "yes or no — non-traditional location carve-out exists",
  "territory_right_of_first_refusal": "yes or no — franchisee has ROFR on adjacent territory",
  "franchisor_min_separation_miles": "minimum miles franchisor must maintain between units",
  "territory_description": "1-2 sentence description of territory protection",

  "initial_term_years": "length of initial franchise agreement in years (numeric)",
  "renewal_available": "yes or no",
  "renewal_on_current_terms": "yes or no — renewal is on substantially same terms",
  "renewal_terms": "description of renewal options (e.g. Two 5-year renewals)",
  "renewal_fee": "fee to renew if stated",
  "termination_triggers_count": "number of termination triggers listed in Item 17",
  "cure_period_days": "number of days franchisee has to cure a breach before termination",
  "transfer_fee": "fee to transfer franchise to new owner",
  "post_termination_noncompete_years": "non-compete period in years after termination",
  "post_termination_noncompete_radius_miles": "non-compete radius in miles",
  "transfer_to_entity_allowed": "yes or no — can franchise be transferred to an entity (LLC/Corp)",
  "right_of_first_refusal_on_sale": "yes or no — franchisor has ROFR if franchisee sells",
  "estimated_resale_multiple": "typical resale multiple if mentioned",

  "item19_present": "yes or no",
  "item19_metric_type": "what Item 19 measures (e.g. gross sales, net revenue, AUV)",
  "item19_fiscal_year": "fiscal year Item 19 data covers",
  "item19_auv": "average unit volume from Item 19 (numeric)",
  "item19_median": "median revenue from Item 19 (numeric)",
  "item19_mean": "mean/average revenue from Item 19 (numeric)",
  "item19_high": "top performer or highest quartile revenue (numeric)",
  "item19_low": "lowest performer revenue (numeric)",
  "item19_units_included": "number of units included in Item 19 data",
  "item19_pct_system_included": "what percentage of system included in Item 19",
  "item19_cherry_pick_flag": "yes or no — Item 19 appears to exclude underperformers",
  "item19_notes": "brief description of what Item 19 discloses or key caveats",

  "total_units_open": "total currently operating franchise units",
  "company_owned_units": "number of company-owned or franchisor-operated units",
  "units_opened_yr1": "units opened in most recent year",
  "units_opened_yr2": "units opened in year 2 prior",
  "units_opened_yr3": "units opened in year 3 prior",
  "units_closed_yr1": "units closed or terminated in most recent year",
  "units_closed_yr2": "units closed or terminated in year 2 prior",
  "units_closed_yr3": "units closed or terminated in year 3 prior",
  "franchisee_closures_3yr": "total franchisee-initiated closures in last 3 years",
  "franchisor_terminations_3yr": "total franchisor-initiated terminations in last 3 years",

  "audit_opinion": "audit opinion on Item 21 financials (unqualified, qualified, adverse, disclaimed)",
  "years_of_financials": "how many years of financial statements in Item 21",
  "royalty_revenue_trend": "royalty revenue trend (growing, stable, declining)",
  "franchisor_net_income": "most recent year franchisor net income or loss (numeric)",
  "liquidity_ratio": "current ratio or liquidity indicator from Item 21",

  "business_description": "2-3 sentence description of what the franchise does and who it serves",
  "market_opportunity": "any language about market size, opportunity, or demographics from the FDD",
  "competitive_advantage": "what the FDD says differentiates this franchise system",
  "owner_profile": "description of the ideal or typical franchisee"
}`,
  },

  // ── Resume ────────────────────────────────────────────────────────────────
  resume: {
    maxTokens: 2000,
    prompt: `You are extracting comprehensive data from a resume or CV for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Include up to the 5 most recent roles in work_history as an array.

{
  "full_name": "applicant full legal name",
  "email": "email address",
  "phone": "phone number with country code",
  "location_city": "current city and country",
  "nationality_hint": "nationality or citizenship if mentioned on resume",
  "linkedin_url": "LinkedIn profile URL if listed",

  "most_recent_title": "most recent job title",
  "most_recent_employer": "most recent employer",
  "most_recent_start_year": "year started most recent role (4-digit)",
  "most_recent_end_year": "year ended or Present",
  "most_recent_description": "1-2 sentence summary of most recent role responsibilities and scope",

  "highest_degree": "highest degree earned (e.g. Bachelor of Commerce, MBA)",
  "field_of_study": "primary field of study",
  "institution": "institution name and city",
  "graduation_year": "year of graduation (4-digit)",
  "additional_education": "any other relevant degrees or education",

  "total_years_experience": "total years of professional experience (numeric string)",
  "primary_industry": "one of: retail, food-service, healthcare, technology, finance, real-estate, construction, manufacturing, education, hospitality, customer-service, other",
  "has_management_experience": "yes or no",
  "management_description": "description of management experience — team sizes, P&L responsibility, scope",
  "has_business_ownership": "yes or no",
  "business_ownership_description": "description of any business ownership experience",
  "has_franchise_experience": "yes or no",
  "franchise_description": "any prior franchise ownership or management experience",
  "has_us_experience": "yes or no — any US-based work or business experience",

  "key_skills": "comma-separated list of top 6-8 professional skills",
  "languages": "languages and proficiency levels",
  "certifications": "professional certifications or licenses",

  "career_summary": "2-3 sentence professional summary capturing expertise and trajectory",
  "industry_expertise": "description of domain expertise most relevant to owning a US franchise or business",
  "leadership_accomplishments": "1-2 specific measurable accomplishments demonstrating leadership or business results",
  "management_experience_years": "years with management or supervisory responsibility (numeric)",

  "work_history": [
    { "title": "job title", "employer": "company name", "start_year": "YYYY", "end_year": "YYYY or Present", "industry": "industry", "description": "1-2 sentence role summary with scope and key outcomes" }
  ]
}`,
  },

  // ── Financial statement ───────────────────────────────────────────────────
  financial_statement: {
    maxTokens: 1200,
    prompt: `You are extracting comprehensive data from a personal financial statement, net worth statement, or personal balance sheet for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
All dollar amounts: plain integers, no commas, no $.

{
  "account_holder_name": "name on the statement",
  "statement_date": "date of statement (YYYY-MM-DD or month year)",
  "prepared_by": "accountant or institution that prepared it, if stated",

  "net_worth": "total net worth = total assets minus total liabilities (numeric)",
  "total_assets": "total assets (numeric)",
  "total_liabilities": "total liabilities (numeric)",

  "liquid_assets": "total liquid assets: cash + savings + money market (numeric)",
  "checking_savings": "total in checking and savings accounts (numeric)",
  "investment_accounts": "non-retirement investment or brokerage accounts (numeric)",
  "retirement_accounts": "RRSP, TFSA, 401k, pension, or other retirement accounts (numeric)",
  "retirement_account_type": "type of retirement account (e.g. RRSP, TFSA, IRA, 401k)",
  "cash_value_life_insurance": "cash value of life insurance policies (numeric)",
  "other_liquid": "other liquid or near-liquid assets (numeric)",

  "primary_residence_value": "estimated value of primary residence (numeric)",
  "primary_residence_mortgage": "outstanding mortgage balance (numeric)",
  "primary_residence_description": "description: city, property type, estimated value",
  "primary_residence_equity": "equity in primary residence = value minus mortgage (numeric)",
  "other_real_estate": "description and total value of other real estate",
  "other_real_estate_value": "total value of other real estate (numeric)",
  "vehicle_value": "total value of vehicles (numeric)",
  "business_interests": "description and value of any business interests held",
  "other_assets": "any other significant assets not listed above",

  "mortgage_balance": "total mortgage debt (numeric)",
  "car_loans": "total car loan balance (numeric)",
  "credit_card_debt": "total credit card balance (numeric)",
  "student_loans": "student loan balance (numeric)",
  "other_debt": "any other debt (numeric)",

  "funds_available_for_investment": "amount specifically available or designated for US business investment (numeric)",
  "primary_source_of_funds": "one of: personal_savings, rrsp_withdrawal, tfsa_withdrawal, property_sale, brokerage_liquidation, loan, gift, inheritance, business_proceeds, other",
  "source_of_funds_narrative": "2-3 sentence explanation of where investment funds will come from and how they are accessible",
  "substantiality_notes": "any notes on whether the investment represents a substantial portion of net worth",
  "asset_summary": "2-3 sentence summary of overall financial position strength"
}`,
  },

  // ── Investment / bank records ──────────────────────────────────────────────
  investment_records: {
    maxTokens: 1000,
    prompt: `You are extracting data from bank statements, brokerage statements, or investment account records for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Dollar amounts: plain integers, no commas, no $.

{
  "account_holder_name": "name on the accounts",
  "institution_names": "financial institution names shown",
  "statement_date": "date or period covered",
  "account_types": "types of accounts (e.g. chequing, RRSP, TFSA, LIRA, brokerage)",

  "total_funds_available": "total balance across all accounts shown (numeric)",
  "liquid_cash": "cash and chequing/savings balance (numeric)",
  "investment_balance": "investment or brokerage account balance (numeric)",
  "rrsp_balance": "RRSP account balance if present (numeric)",
  "tfsa_balance": "TFSA account balance if present (numeric)",
  "lira_balance": "LIRA or locked-in retirement account balance (numeric)",
  "other_retirement_balance": "other retirement account balance (numeric)",

  "currency_of_accounts": "currency of the accounts (CAD, USD, EUR, etc.)",
  "usd_equivalent_if_stated": "USD equivalent if conversion stated in document (numeric)",

  "net_worth_if_stated": "net worth if explicitly stated in document (numeric)",
  "investable_amount": "amount client intends to invest in US business if stated (numeric)",

  "source_type": "one of: personal_savings, rrsp, tfsa, lira, brokerage, gic, property_sale, loan, gift, inheritance, other",
  "source_description": "1-2 sentence description of how these funds were accumulated",
  "funds_narrative": "2-3 sentence narrative about fund availability, source legitimacy, and intended use for US investment"
}`,
  },

  // ── Business plan ─────────────────────────────────────────────────────────
  business_plan: {
    maxTokens: 1800,
    prompt: `You are extracting comprehensive data from a business plan for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Dollar amounts: plain integers. Employee counts: numeric strings.

{
  "entity_name": "legal name of the business entity",
  "business_description": "2-3 sentence description of the business concept and services offered",
  "industry": "industry sector",
  "franchise_brand": "franchise brand name if this is a franchise business plan",
  "target_location": "target city and state",
  "target_zip": "primary ZIP code if stated",
  "business_address": "specific address if stated",

  "total_investment": "total capital investment (numeric)",
  "franchise_cost": "franchise fee and initial franchise costs (numeric)",
  "equipment_cost": "equipment, fixtures, or leasehold improvement costs (numeric)",
  "inventory_cost": "initial inventory cost (numeric)",
  "working_capital": "working capital allocation (numeric)",
  "other_startup_costs": "other startup costs (numeric)",

  "planned_employees_year1": "employees at end of year 1 (numeric)",
  "planned_employees_year2": "employees at end of year 2 (numeric)",
  "planned_employees_year3": "employees at end of year 3 (numeric)",
  "opening_day_employees": "employees on opening day (numeric)",
  "employee_types": "description of roles to be hired (job titles and functions)",
  "annual_payroll_year1": "total annual payroll year 1 (numeric)",

  "year1_revenue": "projected revenue year 1 (numeric)",
  "year2_revenue": "projected revenue year 2 (numeric)",
  "year3_revenue": "projected revenue year 3 (numeric)",
  "year4_revenue": "projected revenue year 4 (numeric)",
  "year5_revenue": "projected revenue year 5 (numeric)",
  "year1_gross_profit": "gross profit year 1 (numeric)",
  "year1_net_income": "net income or EBITDA year 1 (numeric)",
  "year2_net_income": "net income year 2 (numeric)",
  "year3_net_income": "net income year 3 (numeric)",
  "break_even_month": "estimated month number to reach break-even (numeric)",
  "revenue_projection_basis": "basis for projections: fdd_item19, comparable_franchisee, prior_year, market_research, experience",

  "monthly_fixed_expenses": "total monthly fixed operating expenses (numeric)",
  "monthly_rent": "monthly rent or lease cost (numeric)",
  "gross_margin_pct": "projected gross margin percentage",

  "target_market": "description of target customer base",
  "market_size": "market size or opportunity statement",
  "competitive_advantage": "what differentiates this business from competitors",
  "marketing_strategy": "brief description of marketing and customer acquisition strategy",
  "owner_role": "description of owner/investor day-to-day role in the business",
  "management_structure": "description of management hierarchy and reporting structure",
  "investment_narrative": "2-3 sentence description of how and where capital will be deployed"
}`,
  },

  // ── Territory / market analysis ───────────────────────────────────────────
  territory_analysis: {
    maxTokens: 900,
    prompt: `You are extracting data from a territory analysis or market research report for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.

{
  "target_location": "target city and state",
  "zip_codes": "primary ZIP code(s) in territory (first ZIP only if multiple)",
  "us_state": "2-letter US state code",
  "county": "county name",
  "business_category": "type of business (e.g. home care, food service, retail fitness)",

  "total_population": "total population in territory (numeric)",
  "households": "number of households (numeric)",
  "median_household_income": "median household income USD (numeric)",
  "population_65_plus_pct": "percentage of population 65+ if stated",
  "population_growth_rate": "population growth rate percentage",

  "daytime_population": "daytime population if different from residential",
  "traffic_count": "daily traffic count if stated",

  "competition_count": "number of direct competitors identified",
  "nearest_competitor_miles": "distance to nearest direct competitor (numeric)",
  "competition_analysis": "brief description of competitive landscape",
  "market_gap": "identified market gap or unmet need",
  "territory_boundaries": "description of territory boundaries",
  "exclusivity": "yes or no — is the territory exclusive",
  "territory_score": "territory score or rating if provided",

  "market_opportunity_narrative": "2-3 sentence market opportunity summary combining demographics, competition, and growth"
}`,
  },

  // ── Passport ──────────────────────────────────────────────────────────────
  passport: {
    maxTokens: 700,
    prompt: `You are extracting data from a passport or travel document for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Extract exactly what is printed — do not guess or fill in missing fields.
Dates: use YYYY-MM-DD format where possible.

{
  "full_name": "full name exactly as printed on passport",
  "family_name": "surname or family name",
  "given_names": "given names (first and middle)",
  "date_of_birth": "date of birth YYYY-MM-DD",
  "place_of_birth_city": "city of birth",
  "place_of_birth_country": "country of birth",
  "nationality": "nationality as printed on passport",
  "issuing_country": "country that issued the passport",
  "gender": "M or F",
  "passport_number": "passport document number",
  "personal_number": "personal or national ID number if shown",
  "passport_type": "regular, official, or diplomatic",
  "issue_date": "issue date YYYY-MM-DD",
  "expiry_date": "expiry date YYYY-MM-DD",
  "issuing_authority": "issuing authority or location"
}`,
  },

  // ── Franchise agreement (signed) ──────────────────────────────────────────
  franchise_agreement: {
    maxTokens: 1000,
    prompt: `You are extracting data from a signed franchise agreement for an E-2 visa application.
This is the executed agreement between franchisor and franchisee — not the FDD.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD. Dollar amounts: numeric only.

{
  "franchise_brand": "franchise brand or trade name",
  "franchisor_legal_entity": "franchisor legal entity name",
  "franchisee_individual": "individual franchisee full name",
  "franchisee_entity": "franchisee business entity name (LLC or Corp)",
  "agreement_date": "date agreement was signed YYYY-MM-DD",
  "commencement_date": "date business operations must commence YYYY-MM-DD",
  "opening_deadline": "deadline to open for business YYYY-MM-DD",

  "territory_description": "full territory description as granted",
  "territory_state": "US state of territory (2-letter)",
  "territory_zip_codes": "ZIP codes or counties included in territory",
  "territory_exclusivity": "exclusive or non-exclusive",

  "initial_term_years": "length of initial term in years (numeric)",
  "renewal_terms": "renewal option terms",
  "renewal_fee": "renewal fee if stated (numeric)",

  "franchise_fee_paid": "initial franchise fee paid at signing (numeric)",
  "royalty_rate": "ongoing royalty percentage",
  "marketing_fee_rate": "marketing fund percentage",

  "business_address": "specific business location address if committed",
  "ownership_structure": "ownership percentage and entity structure",
  "key_obligations": "1-2 sentence summary of key franchisee obligations stated in agreement",
  "agreement_notes": "any notable provisions (e.g. visa contingency clause, development schedule)"
}`,
  },

  // ── Lease agreement ───────────────────────────────────────────────────────
  lease_agreement: {
    maxTokens: 900,
    prompt: `You are extracting data from a commercial lease agreement for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD. Dollar amounts: numeric only.

{
  "business_address": "full street address of leased premises",
  "city": "city",
  "state": "2-letter state code",
  "zip_code": "ZIP code",
  "premises_description": "description of space (e.g. Suite 100, ground-floor retail, 1,800 sq ft)",
  "total_area_sqft": "total leased area in square feet (numeric)",
  "use_type": "permitted use (e.g. home care office, restaurant, retail)",

  "tenant_name": "tenant legal name on lease",
  "landlord_name": "landlord or property owner name",

  "lease_commencement": "lease start date YYYY-MM-DD",
  "lease_expiration": "lease end date YYYY-MM-DD",
  "lease_term_years": "lease term in years (numeric)",
  "lease_term_months": "lease term in months (numeric)",

  "monthly_base_rent": "monthly base rent USD (numeric)",
  "annual_rent": "annual rent USD (numeric)",
  "free_rent_period": "any free rent or abatement period",
  "rent_escalation": "rent escalation terms (e.g. 3% annually)",
  "rent_escalation_pct": "annual rent increase percentage (numeric)",

  "security_deposit": "security deposit amount USD (numeric)",
  "personal_guarantee": "yes or no — is there a personal guarantee",
  "renewal_options": "renewal option terms (e.g. one 5-year option)",

  "lease_notes": "any notable provisions relevant to E-2 (e.g. assignment clause, visa contingency)"
}`,
  },

  // ── Acquisition financials (business purchase cases) ──────────────────────
  acquisition_financials: {
    maxTokens: 1400,
    prompt: `You are extracting data from financial statements or a business summary for a business acquisition in an E-2 visa case.
The investor is purchasing an existing business. Extract the target business's financial history and acquisition terms.
Return ONLY a valid JSON object. Return null for any field not found.
Dollar amounts: plain integers, no commas, no $.

{
  "business_name": "name of the business being acquired",
  "business_type": "type or description of the business",
  "business_address": "address of the business",
  "seller_name": "seller name or entity",
  "reason_for_sale": "seller's stated reason for selling",
  "years_in_operation": "how many years the business has been operating (numeric)",

  "acquisition_price": "agreed or asking price USD (numeric)",
  "asset_allocation_goodwill": "goodwill component of purchase price (numeric)",
  "asset_allocation_equipment": "equipment and tangible assets portion (numeric)",
  "asset_allocation_inventory": "inventory portion (numeric)",
  "asset_allocation_other": "other asset allocation portions (numeric)",

  "year1_label": "most recent fiscal year label (e.g. 2024)",
  "year1_revenue": "most recent year revenue (numeric)",
  "year1_cogs": "cost of goods sold year 1 (numeric)",
  "year1_gross_profit": "gross profit year 1 (numeric)",
  "year1_operating_expenses": "operating expenses year 1 (numeric)",
  "year1_net_income": "net income year 1 (numeric)",
  "year1_owner_compensation": "owner compensation or draws year 1 (numeric)",
  "year1_ebitda": "EBITDA year 1 (numeric)",

  "year2_label": "second most recent fiscal year label",
  "year2_revenue": "second most recent year revenue (numeric)",
  "year2_net_income": "net income year 2 (numeric)",

  "year3_label": "third most recent fiscal year label",
  "year3_revenue": "year 3 revenue (numeric)",
  "year3_net_income": "net income year 3 (numeric)",

  "total_assets": "total business assets (numeric)",
  "total_liabilities": "total business liabilities (numeric)",
  "equipment_book_value": "book value of equipment and FF&E (numeric)",
  "inventory_value": "inventory value at time of sale (numeric)",

  "employees_current": "current number of employees (numeric)",
  "employee_types": "description of employee roles",
  "customer_count": "number of active customers or contracts if stated",
  "customer_concentration_risk": "yes or no — any single customer over 20% of revenue",

  "revenue_trend": "growing, stable, or declining",
  "financial_summary": "2-3 sentence summary of financial performance and investment attractiveness",
  "risk_factors": "key risk factors identified in the financials or business summary"
}`,
  },

  // ── Birth certificate ──────────────────────────────────────────────────────
  birth_certificate: {
    maxTokens: 500,
    prompt: `You are extracting data from a birth certificate for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD.

{
  "full_name": "full name of the person on the birth certificate",
  "date_of_birth": "date of birth YYYY-MM-DD",
  "place_of_birth_city": "city of birth",
  "place_of_birth_country": "country of birth",
  "nationality": "nationality if stated or inferable from place of birth",
  "father_full_name": "father's full name if listed",
  "mother_full_name": "mother's full name if listed",
  "registration_number": "birth registration or certificate number"
}`,
  },

  // ── Marriage certificate ──────────────────────────────────────────────────
  marriage_certificate: {
    maxTokens: 500,
    prompt: `You are extracting data from a marriage certificate for an E-2 visa application.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD.

{
  "spouse1_full_name": "full name of first spouse",
  "spouse2_full_name": "full name of second spouse",
  "marriage_date": "date of marriage YYYY-MM-DD",
  "marriage_place": "city and country where marriage occurred",
  "registration_number": "marriage registration or certificate number"
}`,
  },

  // ── Government form (DS-160, DS-156E, G-28, I-539, etc.) ─────────────────
  government_form: {
    maxTokens: 800,
    prompt: `You are extracting data from an official US government immigration or visa form for an E-2 visa application.
The form may be a DS-160, DS-156E, G-28, I-539, or similar document.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD.

{
  "form_type": "form identifier or title (e.g. DS-160, DS-156E, G-28)",
  "confirmation_number": "confirmation or barcode number",
  "submission_date": "date submitted YYYY-MM-DD",
  "consulate_or_embassy": "consulate or embassy where submitted",
  "visa_category": "visa type applied for (e.g. E-2)",

  "applicant_full_name": "applicant full name as shown",
  "applicant_family_name": "surname",
  "applicant_given_names": "given names",
  "date_of_birth": "date of birth YYYY-MM-DD",
  "place_of_birth": "city and country of birth",
  "nationality": "nationality or citizenship",
  "passport_number": "passport number",
  "passport_expiry": "passport expiry date YYYY-MM-DD",

  "us_address": "US address or point of contact",
  "employer_name": "current employer or business name",
  "occupation": "occupation or job title",
  "employer_address": "employer address",

  "business_name_e2": "business name if E-2 specific fields present",
  "business_address_e2": "business address if stated",
  "investment_amount_e2": "investment amount if stated on form (numeric)",
  "ownership_pct_e2": "ownership percentage if stated",
  "employee_count_e2": "employee count if stated",

  "attorney_name": "attorney name if G-28 is present",
  "attorney_firm": "attorney firm name",

  "form_notes": "any other notable information from the form"
}`,
  },

  // ── DS-160 (nonimmigrant visa application) ────────────────────────────────
  ds160: {
    maxTokens: 1200,
    prompt: `You are extracting data from a completed DS-160 Online Nonimmigrant Visa Application for an E-2 visa case.
This form belongs to ONE specific person (could be the principal applicant, a spouse, or a child) — extract only what is on the form, do not guess who else it might apply to.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD. Booleans: return as "yes" or "no" strings.

{
  "applicant_full_name": "surname and given names as shown",
  "date_of_birth": "YYYY-MM-DD",
  "place_of_birth_city": "city of birth",
  "place_of_birth_country": "country of birth",
  "nationality": "nationality / country of citizenship",
  "gender": "male or female as shown",
  "marital_status": "single, married, divorced, widowed, etc.",
  "passport_number": "passport number",
  "passport_issuing_country": "country that issued the passport",
  "passport_issue_date": "YYYY-MM-DD",
  "passport_expiry_date": "YYYY-MM-DD",

  "home_address": "permanent home address",
  "phone_number": "primary phone number",
  "email_address": "email address",

  "purpose_of_trip": "visa classification / purpose of trip (e.g. E-2 Treaty Investor)",
  "specific_travel_plans": "yes or no — has specific travel dates",
  "intended_arrival_date": "YYYY-MM-DD if stated",
  "intended_length_of_stay": "as stated (e.g. 2 years)",
  "us_point_of_contact_name": "US point of contact person or organization",
  "us_point_of_contact_address": "US point of contact address",

  "spouse_full_name": "spouse's full name if married",
  "spouse_date_of_birth": "spouse's date of birth YYYY-MM-DD if stated",
  "spouse_nationality": "spouse's nationality if stated",
  "children_count": "number of children listed, numeric",
  "children_names": ["array of children's full names if listed"],

  "father_full_name": "father's full name if listed",
  "mother_full_name": "mother's full name if listed",

  "present_employer_name": "current employer or business name",
  "present_occupation": "current occupation / job title",
  "present_employer_address": "current employer address",
  "monthly_income": "monthly income if stated (numeric)",
  "prior_employment_summary": "brief summary of employment history section if present",

  "education_summary": "brief summary of educational history listed on the form",

  "has_prior_us_travel": "yes or no — has traveled to the US before",
  "prior_us_travel_summary": "dates/purpose of prior US travel if stated",
  "has_prior_visa_refusal": "yes or no — was ever refused a US visa",
  "visa_refusal_explanation": "explanation if a refusal is disclosed",
  "security_background_flags": "yes or no — any 'yes' answers in the Security and Background section (this is a red flag worth surfacing, do not guess if not visible)",
  "security_background_notes": "brief note on which security/background question was answered yes, if any, or null",

  "form_notes": "any other notable case-relevant information from the form"
}`,
  },

  // ── E-2 petition cover letter (attorney's synthesized case narrative) ─────
  cover_letter: {
    maxTokens: 1500,
    prompt: `You are extracting data from an attorney-drafted E-2 visa petition cover letter. This document is usually the single richest narrative summary of the whole case — treat it as authoritative for the business/investment story, not a form to skim.
Return ONLY a valid JSON object. Return null for any field not found — do not guess or infer beyond what the letter states.
Numbers: plain integers only, no commas or symbols.

{
  "applicant_full_name": "principal applicant's full name",
  "business_legal_name": "legal name of the enterprise",
  "business_dba": "DBA / trade name if different from legal name",
  "business_description": "1-3 sentence description of what the business does, in the letter's own framing",
  "business_location": "city and state of operations",
  "ownership_percentage": "applicant's ownership percentage in the enterprise",
  "applicant_title_role": "applicant's title (e.g. Manager, Managing Member) and role description",

  "total_investment_amount": "total investment amount cited (numeric)",
  "investment_breakdown_summary": "brief summary of how the investment breaks down (franchise fee, rent, equipment, etc.)",
  "source_of_funds_summary": "how the letter describes where the investment funds came from",
  "funds_at_risk_argument": "the letter's core argument for why funds are irrevocably committed / at risk",

  "hiring_plan_summary": "hiring / job-creation plan as described (e.g. Year 1 vs Year 5 headcount)",
  "revenue_projection_summary": "revenue projections as cited in the letter",
  "marginality_argument": "the letter's argument for why the business is not marginal",

  "home_country_ties_summary": "the letter's summary of the applicant's ties to their home country",
  "case_theory_summary": "the overall persuasive narrative/theory of the case as the attorney frames it — the throughline argument for why this case should be approved",

  "family_members_mentioned": ["array of any spouse/dependent names mentioned in the letter"]
}`,
  },

  // ── Organizational documents (membership certificates, operating agreements,
  // corporate resolutions, cap tables) ──────────────────────────────────────
  organizational_document: {
    maxTokens: 800,
    prompt: `You are extracting data from a business organizational document (membership certificate, operating agreement, corporate resolution, or similar entity-formation record) for an E-2 visa case.
Return ONLY a valid JSON object. Return null for any field not found.
Dates: YYYY-MM-DD.

{
  "document_type_detail": "specific type of document (e.g. Membership Certificate, Operating Agreement, Corporate Resolution)",
  "entity_name": "legal name of the entity",
  "entity_type": "LLC, Corporation, Partnership, etc.",
  "state_of_formation": "state where entity is formed/registered",
  "formation_date": "YYYY-MM-DD if stated",
  "members": [
    { "name": "member/owner full name", "ownership_percentage": "ownership percentage if stated", "role": "title or role if stated (e.g. Managing Member)" }
  ],
  "document_date": "date the document was executed, YYYY-MM-DD",
  "notable_provisions": "brief note on anything case-relevant (e.g. management authority, transfer restrictions)"
}`,
  },

  // ── Fallback for anything that doesn't fit a known category — captures a
  // general summary rather than misapplying an unrelated schema (e.g. forcing
  // a cover letter or certificate through the resume schema and losing data).
  general_supporting_document: {
    maxTokens: 600,
    prompt: `You are extracting case-relevant data from a supporting document for an E-2 visa application. This document did not clearly match a known category, so extract whatever is genuinely useful without guessing.
Return ONLY a valid JSON object. Return null for any field not found.

{
  "document_description": "1 sentence describing what this document appears to be",
  "people_named": ["array of full names mentioned"],
  "business_names_mentioned": ["array of business/entity names mentioned"],
  "key_figures": ["array of notable dollar amounts, dates, or numbers with brief context, e.g. '$50,000 — franchise fee'"],
  "summary": "2-4 sentence summary of the document's case-relevant content"
}`,
  },

};

// ─── Intake field mapping ─────────────────────────────────────────────────────
// Maps extracted JSON key → intake form question key for the UI pre-fill.
// All other fields are stored in extracted_json for downstream modules.

const INTAKE_FIELD_MAP: Record<string, Record<string, string>> = {
  fdd: {
    'brand_name':                'M3-Q-00',  // franchise brand name → business type
    'legal_entity':              'M3-E-01',  // FRANCHISOR entity — lower priority than applicant entity from business_plan
    'franchise_fee':             'M3-F-03',
    'business_description':      'M3-B-01',  // system description — lower priority than business_plan description
    'royalty_rate':              'M3-FDD-ROYALTY',
    'initial_term_years':        'M3-FDD-TERM',
    'investment_low':            'M3-FDD-LOW',
    'investment_high':           'M3-FDD-HIGH',
    // investment_mid intentionally excluded: FDD Item 7 average ≠ client's available capital
    // hq_location intentionally excluded: franchisor HQ ≠ client target location
    'item19_auv':                'M3-I-01',
    'typical_fte_employees':     'M3-B-03',
  },
  resume: {
    'full_name':                 'M3-A-01',
    'phone':                     'M3-A-03',
    // most_recent_title intentionally excluded: job title ≠ franchise/business type
    'field_of_study':            'M3-Q-02A',
    'highest_degree':            'M3-Q-02B',
    'institution':               'M3-Q-02C',
    'graduation_year':           'M3-Q-02D',
    'total_years_experience':    'M3-Q-05',
    'primary_industry':          'M3-Q-06',
  },
  financial_statement: {
    'net_worth':                          'M3-F-04',
    'liquid_assets':                      'M3-F-02',
    'primary_residence_description':      'M3-T-01',
    'source_of_funds_narrative':          'M3-F-SRC',
  },
  investment_records: {
    'total_funds_available':     'M3-F-02',
    'source_description':        'M3-F-03',
    'net_worth_if_stated':       'M3-F-04',
    'funds_narrative':           'M3-F-SRC',
  },
  business_plan: {
    'entity_name':               'M3-E-01',
    'business_description':      'M3-B-01',
    'target_location':           'M3-B-02',
    'planned_employees_year1':   'M3-B-03',
    'total_investment':          'M3-F-02',
    'year1_revenue':             'M3-I-01',
  },
  territory_analysis: {
    'target_location':           'M3-B-02',
    'zip_codes':                 'QMA-ZIP',
    'us_state':                  'QMA-STATE',
    'business_category':         'QMA-BUSINESS-TYPE',
  },
  passport: {
    'full_name':                 'M3-A-01',
    'date_of_birth':             'M3-A-03',
    'issuing_country':           'M3-A-05',
    'passport_number':           'M3-A-PASSPORT',
    'expiry_date':               'M3-A-PASSPORT-EXP',
    'place_of_birth_country':    'M3-A-04',
  },
  franchise_agreement: {
    'franchise_brand':           'M3-Q-00',
    'franchisor_legal_entity':   'M3-E-01',
    'agreement_date':            'M3-FA-DATE',
    'territory_description':     'M3-FA-TERRITORY',
    'initial_term_years':        'M3-FDD-TERM',
    'franchise_fee_paid':        'M3-F-03',
    'territory_state':           'QMA-STATE',
  },
  lease_agreement: {
    'business_address':          'M3-G-ADDRESS',
    'city':                      'M3-B-02',
    'monthly_base_rent':         'M3-G-RENT',
    'lease_term_years':          'M3-G-LEASE-TERM',
    'lease_expiration':          'M3-G-LEASE-EXP',
  },
  acquisition_financials: {
    'business_name':             'M3-E-01',
    'acquisition_price':         'M3-F-02',
    'year1_revenue':             'M3-I-01',
    'year1_net_income':          'M3-I-NET1',
    'employees_current':         'M3-B-03',
    'reason_for_sale':           'M3-ACQ-REASON',
  },
  government_form: {
    'applicant_full_name':       'M3-A-01',
    'date_of_birth':             'M3-A-03',
    'passport_number':           'M3-A-PASSPORT',
    'business_name_e2':          'M3-E-01',
    'investment_amount_e2':      'M3-F-02',
  },
  birth_certificate: {
    'full_name':                 'M3-A-01',
    'date_of_birth':             'M3-A-03',
    'place_of_birth_country':    'M3-A-04',
    'nationality':                'M3-A-05',
  },
  marriage_certificate: {
    // No principal-question-key mapping — marriage date/place isn't a DS-160
    // field on its own; this doc type exists to surface a spouse via identity
    // detection. Full extraction is still stored in extracted_json.
  },
  ds160: {
    // familyMemberId (set below from ownerFamilyMemberId) already scopes these
    // writes to the correct person, so it's safe to map identity fields here —
    // a spouse's DS-160 upload won't overwrite the principal's answers.
    'applicant_full_name':   'M3-A-01',
    'date_of_birth':         'M3-A-DOB',
    'nationality':           'M3-A-05',
    'passport_number':       'M3-A-PASSPORT',
    'passport_expiry_date':  'M3-A-PASSPORT-EXP',
    'home_address':          'M3-T-01',
    'present_employer_name': 'M3-Q-06',
  },
  cover_letter: {
    // Intentionally sparse: the cover letter's business/investment narrative
    // fields are lower-confidence paraphrases of numbers that business_plan /
    // investment_records extract directly from source records, so they are
    // left out of intake writeback to avoid a lower-quality source winning a
    // field-collision race. The full extraction is still stored in
    // extracted_json and read directly by the prep-kit dossier and
    // case-profile via documentsOnFile.
  },
  organizational_document: {
    'entity_name': 'M3-E-01',
  },
  general_supporting_document: {
    // No intake mapping — this is the fallback for documents that don't
    // clearly fit any known category, so the extracted summary is stored in
    // extracted_json only rather than guessed onto a specific question key.
  },
};

// ─── Human-readable labels ────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  'M3-A-01':            'Full legal name',
  'M3-A-03':            'Phone number',
  'M3-A-DOB':           'Date of birth',
  'M3-A-NATIONALITY':   'Nationality',
  'M3-A-CITIZENSHIP':   'Country of citizenship',
  'M3-A-PASSPORT':      'Passport number',
  'M3-A-PASSPORT-EXP':  'Passport expiry date',
  'M3-A-BIRTH-COUNTRY': 'Country of birth',
  'M3-Q-00':            'Franchise / Business type',
  'M3-Q-02A':           'Field of study',
  'M3-Q-02B':           'Degree or certification name',
  'M3-Q-02C':           'Institution name & city',
  'M3-Q-02D':           'Year completed',
  'M3-Q-05':            'Years of professional experience',
  'M3-Q-06':            'Industry / skills',
  'M3-E-01':            'Business / entity name',
  'M3-F-02':            'Total investment / liquid assets (USD)',
  'M3-F-03':            'Franchise fee / source of funds',
  'M3-F-04':            'Net worth (USD)',
  'M3-F-SRC':           'Source of funds narrative',
  'M3-B-01':            'Business description',
  'M3-B-02':            'Target location',
  'M3-B-03':            'Planned / current US employees',
  'M3-T-01':            'Primary property',
  'M3-I-01':            'Revenue (projected Year 1 or AUV)',
  'M3-I-NET1':          'Net income Year 1',
  'M3-FDD-ROYALTY':     'Royalty rate (%)',
  'M3-FDD-TERM':        'Franchise / agreement term (years)',
  'M3-FDD-LOW':         'Investment range — low (USD)',
  'M3-FDD-HIGH':        'Investment range — high (USD)',
  'M3-FA-DATE':         'Franchise agreement date',
  'M3-FA-TERRITORY':    'Territory granted',
  'M3-G-ADDRESS':       'Business address',
  'M3-G-RENT':          'Monthly rent (USD)',
  'M3-G-LEASE-TERM':    'Lease term (years)',
  'M3-G-LEASE-EXP':     'Lease expiry date',
  'M3-ACQ-REASON':      'Seller reason for sale',
  'QMA-ZIP':            'Target ZIP code',
  'QMA-STATE':          'Target US state',
  'QMA-BUSINESS-TYPE':  'Business category',
};

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  familyMemberId: string | null;
}

export interface ParseDocumentResponse {
  docId:           string;
  fields:          ExtractedField[];
  docType:         string;
  totalFields:     number;
  identityMatches: IdentityMatchResult[];
}

// ─── POST handler ─────────────────────────────────────────────────────────────

// ─── Auto document-type detection ────────────────────────────────────────────
// Quick cheap LLM call used when client selects "Detect automatically".
// max_tokens covers only the answer itself — llm-client reserves separate
// headroom for any hidden reasoning tokens on top of this.

async function detectDocumentType(textSample: string, userId: string): Promise<string> {
  const validTypes = Object.keys(COMPREHENSIVE_SCHEMAS).join(' | ');
  const result = await callLLM({
    task:       'extract',
    route:      '/api/apply/parse-document',
    userId,
    max_tokens: 50,
    messages: [
      {
        role:    'system',
        content: 'You are a document classifier. Reply with ONLY one of the provided strings — nothing else.',
      },
      {
        role:    'user',
        content: `Classify this document. Reply with ONLY one of: ${validTypes}\n\n${textSample.slice(0, 2000)}`,
      },
    ],
  });
  const detected = (result ?? '').trim().toLowerCase().replace(/[^a-z_]/g, '');
  // Fall back to the generic extractor, not 'resume' — applying the resume
  // schema to an unrecognized document (e.g. a cover letter or certificate)
  // silently produces near-empty extraction instead of capturing what's there.
  return (COMPREHENSIVE_SCHEMAS[detected] ? detected : null) ?? 'general_supporting_document';
}

// ─── Identity detection ───────────────────────────────────────────────────────
// "Who does this document mention?" — runs for every doc type, not just
// passports, so a spouse's resume or a birth certificate naming a child can
// also surface a new person. Cheap, small-token, structured output.

interface IdentifiedPerson {
  name: string;
  roleGuess: 'self' | 'spouse' | 'child' | 'parent' | 'unknown';
  dob: string | null;
  nationality: string | null;
  passportNumber: string | null;
}

async function identifyPeopleInDocument(textSample: string, userId: string): Promise<IdentifiedPerson[]> {
  const result = await callLLM({
    task:       'extract',
    route:      '/api/apply/parse-document',
    userId,
    max_tokens: 500,
    messages: [
      {
        role:    'system',
        content: 'You identify which people are named in a document for a US visa case. Reply ONLY with a valid JSON array — no markdown, no commentary.',
      },
      {
        role:    'user',
        content: `List every distinct person named in this document (the document owner, their spouse, children, parents — anyone identifiable by name). Skip people who are not part of the applicant's family (e.g. employers, landlords, witnesses, notaries).
For each person return: {"name": "full name", "roleGuess": one of "self"|"spouse"|"child"|"parent"|"unknown", "dob": "YYYY-MM-DD or null", "nationality": "or null", "passportNumber": "or null"}.
"self" = the document's primary subject/owner. If uncertain about the relationship, use "unknown".
Reply with ONLY a JSON array, e.g. [{"name":"...","roleGuess":"self","dob":null,"nationality":null,"passportNumber":null}]. If no people are identifiable, reply with [].

Document content:\n\n${textSample.slice(0, 4000)}`,
      },
    ],
  });

  if (!result) return [];
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is Record<string, unknown> => !!p && typeof p.name === 'string' && p.name.trim() !== '')
      .map(p => ({
        name:           String(p.name).trim(),
        roleGuess:      (['self', 'spouse', 'child', 'parent', 'unknown'].includes(String(p.roleGuess)) ? p.roleGuess : 'unknown') as IdentifiedPerson['roleGuess'],
        dob:            p.dob ? String(p.dob) : null,
        nationality:    p.nationality ? String(p.nationality) : null,
        passportNumber: p.passportNumber ? String(p.passportNumber) : null,
      }));
  } catch {
    return [];
  }
}

// Loose name match: normalize and compare token sets so "Jane A. Doe" matches
// "Jane Doe" — good enough for surfacing a match/mismatch, not a legal check.
function namesLikelyMatch(a: string, b: string): boolean {
  // Strip diacritics (José -> jose) via NFD decomposition, then keep any Unicode
  // letter (\p{L} covers non-Latin scripts too — Chinese, Arabic, Cyrillic, etc.)
  // instead of the old `[^a-z\s]` filter, which silently deleted every non-ASCII
  // character and broke identity matching for international applicants.
  const norm = (s: string) => new Set(
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(t => t.length > 1)
  );
  const setA = norm(a);
  const setB = norm(b);
  if (setA.size === 0 || setB.size === 0) return false;
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap++;
  return overlap >= Math.min(setA.size, setB.size) * 0.6;
}

export interface IdentityMatchResult {
  name: string;
  roleGuess: IdentifiedPerson['roleGuess'];
  matchedFamilyMemberId: string | null;
  matchedIsPrincipal: boolean;
  isNewPerson: boolean;
  newFamilyMemberId?: string;
}

const ROLE_TO_MEMBER_TYPE: Record<string, 'spouse' | 'child'> = {
  spouse: 'spouse',
  child:  'child',
};

async function matchAndRouteIdentities(
  people: IdentifiedPerson[],
  userId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<IdentityMatchResult[]> {
  if (people.length === 0) return [];

  const [{ data: profile }, { data: familyMembers }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', userId).single(),
    supabase.from('family_members').select('id, member_type, first_name, last_name').eq('user_id', userId),
  ]);

  const principalName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const members = (familyMembers ?? []) as Array<{ id: string; member_type: string; first_name: string | null; last_name: string | null }>;

  const results: IdentityMatchResult[] = [];

  for (const person of people) {
    if (principalName && namesLikelyMatch(person.name, principalName)) {
      results.push({ name: person.name, roleGuess: person.roleGuess, matchedFamilyMemberId: null, matchedIsPrincipal: true, isNewPerson: false });
      continue;
    }

    const match = members.find(m => namesLikelyMatch(person.name, [m.first_name, m.last_name].filter(Boolean).join(' ')));
    if (match) {
      results.push({ name: person.name, roleGuess: person.roleGuess, matchedFamilyMemberId: match.id, matchedIsPrincipal: false, isNewPerson: false });
      continue;
    }

    // No match anywhere — auto-create a stub family_members row for spouse/child
    // roles only (per locked decision). "self"/"parent"/"unknown" are surfaced
    // to the client without creating a record — too ambiguous to safely file.
    const memberType = ROLE_TO_MEMBER_TYPE[person.roleGuess];
    if (!memberType) {
      results.push({ name: person.name, roleGuess: person.roleGuess, matchedFamilyMemberId: null, matchedIsPrincipal: false, isNewPerson: false });
      continue;
    }

    const nameParts = person.name.trim().split(/\s+/);
    const { data: created } = await supabase
      .from('family_members')
      .insert({
        user_id:         userId,
        member_type:     memberType,
        first_name:      nameParts[0] ?? null,
        last_name:       nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
        date_of_birth:   person.dob,
        nationality:     person.nationality,
        passport_number: person.passportNumber,
      })
      .select('id')
      .single();

    results.push({
      name: person.name,
      roleGuess: person.roleGuess,
      matchedFamilyMemberId: created?.id ?? null,
      matchedIsPrincipal: false,
      isNewPerson: !!created,
      newFamilyMemberId: created?.id,
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'parse-doc');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many document parse requests. Please wait before uploading another document.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    if (await isKillSwitchEnabled()) {
      return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    const formData = await request.formData();
    const file    = formData.get('file')    as File | null;
    const docType = formData.get('docType') as string | null;
    const appId   = formData.get('applicationId') as string | null;
    // Which person section the file was dropped into on the client — the
    // primary routing signal. Identity detection below cross-checks it.
    const ownerFamilyMemberId = (formData.get('ownerFamilyMemberId') as string | null) || null;

    if (!file)    return NextResponse.json({ error: 'No file provided' },          { status: 400 });
    if (!docType) return NextResponse.json({ error: 'No document type provided' }, { status: 400 });
    if (docType !== 'auto' && !COMPREHENSIVE_SCHEMAS[docType]) {
      return NextResponse.json({ error: `Unknown document type: ${docType}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    // Target market for an FDD auto-seed (CIC-3.2) — keeps territory analysis meaningful.
    let appTargetState: string | null = null;
    if (appId) {
      const { data: app } = await supabase
        .from('applications')
        .select('id, target_state')
        .eq('id', appId)
        .eq('user_id', user.id)
        .single();
      if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      appTargetState = (app as { target_state?: string | null }).target_state ?? null;
    }

    // ── Extract raw text ──────────────────────────────────────────────────────

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const lowerName   = file.name.toLowerCase();
    const isPdf       = lowerName.endsWith('.pdf') || file.type === 'application/pdf';

    let documentText: string;
    try {
      if (isPdf) {
        if (docType === 'fdd') {
          documentText = await extractFDDSections(buffer);
          if (!documentText.trim()) {
            return NextResponse.json(
              { error: 'This appears to be a scanned PDF — no extractable text. Please upload a text-based PDF version of the FDD.' },
              { status: 422 }
            );
          }
        } else {
          const result = await extractTextFromBuffer(buffer, 'pdf' as UploadFileType, file.name);
          if (result.isScanned) {
            return NextResponse.json(
              { error: 'This appears to be a scanned PDF — no extractable text. Try a different file.' },
              { status: 422 }
            );
          }
          documentText = result.text;
        }
      } else if (lowerName.endsWith('.docx')) {
        const result = await extractTextFromBuffer(buffer, 'docx' as UploadFileType, file.name);
        documentText = result.text;
      } else if (lowerName.endsWith('.csv')) {
        const result = await extractTextFromBuffer(buffer, 'csv' as UploadFileType, file.name);
        documentText = result.text;
      } else {
        documentText = buffer.toString('utf-8').slice(0, 30000);
      }
    } catch (extractErr) {
      captureApiError(extractErr, { route: 'parse-document', stage: 'text-extraction', userId: user.id, docType, fileName: file.name });
      return NextResponse.json(
        { error: 'Could not read this document — please try a different file' },
        { status: 422 }
      );
    }

    // ── Resolve document type (auto-detect if needed) ─────────────────────────
    // Must happen before the uploaded_documents insert below — the doc_type
    // CHECK constraint does not accept 'auto' as a stored value.

    const resolvedDocType = docType === 'auto'
      ? await detectDocumentType(documentText, user.id)
      : docType;

    const { data: docRecord, error: insertErr } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id:                 user.id,
        application_id:          appId || null,
        file_path:               '',
        file_name:               file.name,
        doc_type:                resolvedDocType,
        extraction_status:       'processing',
        owner_type:              ownerFamilyMemberId ? 'family_member' : 'principal',
        owner_family_member_id:  ownerFamilyMemberId,
      })
      .select('id')
      .single();

    if (insertErr || !docRecord) {
      captureApiError(insertErr ?? new Error('uploaded_documents insert returned no record'), {
        route: 'parse-document', stage: 'uploaded_documents-insert', userId: user.id, docType, resolvedDocType, appId,
      });
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 });
    }

    // ── LLM extraction ────────────────────────────────────────────────────────

    const schema = COMPREHENSIVE_SCHEMAS[resolvedDocType];

    const rawText = await callLLM({
      task:       'extract',
      route:      '/api/apply/parse-document',
      userId:     user.id,
      max_tokens: schema.maxTokens,
      messages: [
        {
          role:    'system',
          content: 'You are a precise document data extractor. Reply ONLY with a single valid JSON object — no markdown fences, no commentary before or after.',
        },
        {
          role:    'user',
          content: `Document content:\n\n${documentText}\n\n---\n\n${schema.prompt}`,
        },
      ],
    });

    if (!rawText) {
      await supabase.from('uploaded_documents')
        .update({ extraction_status: 'failed' }).eq('id', docRecord.id);
      captureApiError(new Error('all LLM providers failed'), {
        route: 'parse-document', stage: 'llm-extraction', userId: user.id, docType: resolvedDocType, docId: docRecord.id,
      });
      return NextResponse.json({ error: 'Extraction failed — please try again' }, { status: 502 });
    }

    // ── Parse full extraction ─────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extracted: Record<string, any> = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      extracted = {};
    }

    // ── Map intake fields for UI pre-fill ─────────────────────────────────────

    const intakeMap = INTAKE_FIELD_MAP[resolvedDocType] ?? {};
    const fields: ExtractedField[] = Object.entries(intakeMap)
      .filter(([extractedKey]) => {
        const v = extracted[extractedKey];
        return v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'null';
      })
      .map(([extractedKey, questionKey]) => ({
        key:            questionKey,
        label:          FIELD_LABELS[questionKey] ?? questionKey,
        value:          String(extracted[extractedKey]).trim(),
        familyMemberId: ownerFamilyMemberId,
      }));

    // ── Identity detection — who does this document mention? ──────────────────
    // Runs for every doc type; cross-checks against the section the file was
    // dropped into and surfaces mismatches/new people to the client rather than
    // silently filing data under the wrong person.
    const identifiedPeople  = await identifyPeopleInDocument(documentText, user.id);
    const identityMatches   = await matchAndRouteIdentities(identifiedPeople, user.id, supabase);

    // ── Count total non-null fields in full extraction ────────────────────────

    const totalFields = Object.values(extracted).filter(v => {
      if (v === null || v === undefined) return false;
      if (Array.isArray(v)) return v.length > 0;
      return String(v).trim() !== '' && String(v) !== 'null';
    }).length;

    // ── Persist full extraction ───────────────────────────────────────────────

    await supabase
      .from('uploaded_documents')
      .update({
        extraction_status: 'complete',
        extracted_json:    extracted,
        fields_total:      fields.length,
        doc_type:          resolvedDocType,
      })
      .eq('id', docRecord.id);

    // ── Case Intelligence Core — fire-and-forget, sequenced ───────────────────
    // comprehendApplicationDocuments writes document_intelligence.ledger, which
    // assembleCaseModel (inside buildCaseIntelligence) reads — must run first.
    if (appId) {
      comprehendApplicationDocuments(appId, user.id)
        .then(() => buildCaseIntelligence(appId, user.id, resolvedDocType))
        .catch((err) => captureApiError(err, { route: 'parse-document', stage: 'cic-pipeline', userId: user.id, appId, docId: docRecord.id }));

      // CIC-3.2 — if the imported document is an FDD, auto-seed the FDD Intelligence
      // pipeline (persist the PDF + a pending fdd_analyses row) so the client never
      // has to re-upload it into the separate FDD tool. Non-blocking, idempotent.
      if (resolvedDocType === 'fdd' && isPdf) {
        seedFddAnalysisFromUpload({
          applicationId: appId,
          userId:        user.id,
          fileName:      file.name,
          buffer,
          fileSizeBytes: file.size,
          targetState:   appTargetState,
        })
          .then((res) => {
            if (res.status === 'failed') {
              captureApiError(new Error(`FDD seed failed: ${res.reason}`), { route: 'parse-document', stage: 'fdd-seed', userId: user.id, appId, docId: docRecord.id });
            }
          })
          .catch((err) => captureApiError(err, { route: 'parse-document', stage: 'fdd-seed', userId: user.id, appId, docId: docRecord.id }));
      }
    }

    return NextResponse.json({
      docId:       docRecord.id,
      fields,
      docType:     resolvedDocType,
      totalFields,
      identityMatches,
    } satisfies ParseDocumentResponse);

  } catch (err) {
    captureApiError(err, { route: 'parse-document', stage: 'unhandled' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
