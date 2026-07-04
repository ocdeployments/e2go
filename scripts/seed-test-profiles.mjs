#!/usr/bin/env node
/**
 * E2go Test Profile Seeder
 *
 * Seeds 3 end-to-end test profiles into Supabase:
 *   A — Canada  / solo   / clean           → romyjames@gmail.com
 *   B — France  / married / flagged         → test-france@example.com (created)
 *   C — UK      / family / premium-clean    → test-uk@example.com   (created)
 *
 * Each run is idempotent: existing data for each user is cleared before re-seeding.
 *
 * Usage:
 *   node scripts/seed-test-profiles.mjs
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';

// ── Read env ─────────────────────────────────────────────────────────────────
const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const H = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function pgrest(method, table, body, extraHeaders = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method,
    headers: { ...H, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`[insert ${table}] HTTP ${r.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return parsed;
}

async function dbUpsert(table, data, onConflict) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      ...H,
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`[upsert ${table}] HTTP ${r.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return parsed;
}

async function dbDelete(table, conditions) {
  const qs = Object.entries(conditions)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: 'DELETE',
    headers: H,
  });
  return r.status;
}

async function dbSelect(table, conditions, columns = '*') {
  const qs = Object.entries(conditions)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${qs}`, {
    headers: H,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return []; }
}

// ── Auth admin helpers ────────────────────────────────────────────────────────
async function listAuthUsers() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: H,
  });
  const data = await r.json();
  return data?.users ?? [];
}

async function findAuthUser(email) {
  const users = await listAuthUsers();
  return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAuthUser(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  return r.json();
}

// ── Clean a user's existing quiz / profile data ───────────────────────────────
async function cleanUser(userId) {
  // Get all application IDs for this user
  const apps = await dbSelect('applications', { user_id: userId }, 'id');
  for (const app of (Array.isArray(apps) ? apps : [])) {
    // Simulator sessions cascade-delete simulator_answers via FK
    const sims = await dbSelect('simulator_sessions', { application_id: app.id }, 'id');
    for (const sim of (Array.isArray(sims) ? sims : [])) {
      await dbDelete('simulator_answers', { session_id: sim.id }).catch(() => {});
    }
    await dbDelete('simulator_sessions',       { application_id: app.id }).catch(() => {});
    await dbDelete('simulator_outcomes',       { application_id: app.id }).catch(() => {});
    await dbDelete('case_briefs',              { application_id: app.id }).catch(() => {});
    await dbDelete('application_documents',    { application_id: app.id }).catch(() => {});
    await dbDelete('answers',                  { application_id: app.id }).catch(() => {});
    await dbDelete('generated_documents',      { application_id: app.id }).catch(() => {});
    await dbDelete('generation_pipeline_log',  { application_id: app.id }).catch(() => {});
  }
  await dbDelete('followup_responses',     { user_id: userId }).catch(() => {});
  await dbDelete('case_profiles',          { user_id: userId }).catch(() => {});
  await dbDelete('applications',           { user_id: userId }).catch(() => {});
  await dbDelete('quiz_sessions',          { user_id: userId }).catch(() => {});
  await dbDelete('application_lifecycle',  { user_id: userId }).catch(() => {});
  await dbDelete('payments',               { user_id: userId }).catch(() => {});
}

// ── Timestamp ─────────────────────────────────────────────────────────────────
const now = new Date().toISOString();

// ── Profile definitions ───────────────────────────────────────────────────────
//
// Values are pre-computed from the same logic as quiz/page.tsx and
// case-profile.ts so the seeded data exactly mirrors what a real user
// session would produce.
//
const PROFILES = [
  // ── A: Canada · solo · clean · franchise-curious ──────────────────────────
  {
    label:      'Profile A — Canada / solo / clean',
    email:      'romyjames@gmail.com',
    createUser: false,
    firstName:  'Romy',
    lastName:   'Test',

    session: {
      outcome:                    'PROCEED',
      score:                      100,
      hard_stop_codes:            [],
      attorney_flag_codes:        [],
      risk_flag_codes:            [],
      application_type:           'solo',
      franchise_interest:         true,
      casl_consent:               true,
      casl_consent_at:            now,
      completed_at:               now,
      post_quiz_profile: {
        net_worth_range:    '500k_1m',
        prior_business:     'manager',
        industry_interest:  'home_care',
        timeline_goal:      '6_12mo',
      },
      franchise_triggered: true,
      result_json: {
        outcome:          'PROCEED',
        score:            100,
        warnings:         [],
        attorney_flags:   [],
        franchise_interest: true,
        answers: {
          'Q0-01': 'Canada',
          'Q0-02': 'I am the sole applicant',
          'Q0-03': 'Just me — I am moving alone',
          'Q0-05': 'From outside the US — consular processing at my home country consulate',
          'Q0-06': ['Personal savings or accumulated wealth'],
          'Q0-07': 'Over $150,000',
          'Q0-08': 'I am still searching — I have not chosen yet',
          'Q0-08b': 'Yes — please connect me',
          'Q0-09': 'No — clean history',
          'Q0-10': ['Property I own and plan to keep', 'Active financial accounts, pension, or investments'],
        },
        country:                'Canada',
        cos_flag:               false,
        investment_range:       'Over $150,000',
        application_type:       'solo',
        partner_type:           'none',
        dependents:             'just_me',
        hard_stops_triggered:   [],
        readiness_stage:        null,
        business_type:          null,
        target_date:            null,
        business_cost:          null,
      },
    },

    application: {
      application_type:   'solo',
      processing_path:    'solo',
      family_composition: 'individual',
      module_1_complete:  true,
      status:             'in_progress',
      payment_status:     'paid',
    },

    // Pre-computed from buildCaseProfile() logic:
    // archetype: manager + home_care → neither buyer/builder/investor → career_switcher
    // eligibilityScore: 100 - min(0×5, 20) = 100
    // completenessScore: quiz_session(20) + postProfileComplete(15) = 35
    caseProfile: {
      archetype:              'career_switcher',
      eligibility_score:      100,
      franchise_triggered:    true,
      franchise_match_score:  0,
      completeness_score:     35,
      data_state:             'quiz_only',
      source_of_funds_score:  0,
      management_role_score:  0,
      business_plan_score:    0,
      profile_data: {
        net_worth_range:   '500k_1m',
        prior_business:    'manager',
        industry_interest: 'home_care',
        timeline_goal:     '6_12mo',
        investment_range:  'Over $150,000',
      },
    },
  },

  // ── B: France · married (spouse only) · attorney + risk flags ─────────────
  {
    label:      'Profile B — France / married / flagged',
    email:      'test-france@example.com',
    createUser: true,
    password:   'TestFrance2026!',
    firstName:  'Jean',
    lastName:   'Dupont',

    session: {
      outcome:                    'ATTORNEY_RECOMMENDED',
      score:                      86,
      hard_stop_codes:            [],
      attorney_flag_codes:        ['W-REFUSAL-RECENT'],
      risk_flag_codes:            ['W-FAMILY-GIFT'],
      application_type:           'solo',
      franchise_interest:         true,
      casl_consent:               false,
      casl_consent_at:            null,
      completed_at:               now,
      post_quiz_profile: {
        net_worth_range:    '250k_500k',
        prior_business:     'career_switcher',
        industry_interest:  'food_beverage',
        timeline_goal:      '12_24mo',
      },
      franchise_triggered: true,
      result_json: {
        outcome:          'ATTORNEY_RECOMMENDED',
        score:            86,
        warnings:         ['W-FAMILY-GIFT'],
        attorney_flags:   ['W-REFUSAL-RECENT'],
        franchise_interest: true,
        answers: {
          'Q0-01':  'France',
          'Q0-02':  'I am the principal — my spouse will accompany me as a dependent',
          'Q0-02a': 'No children',
          'Q0-05':  'From outside the US — consular processing at my home country consulate',
          'Q0-06':  ['Personal savings or accumulated wealth', 'Inheritance or gift received'],
          'Q0-07':  '$100,000 – $150,000',
          'Q0-08':  'I have a specific business or franchise identified',
          'Q0-08a': 'A franchise — buying into an established brand',
          'Q0-08b': 'Yes — please connect me',
          'Q0-09':  'Yes — I have something to disclose',
          'Q0-09a': 'Yes, once — within the last 5 years',
          'Q0-09d': 'No — it was a different visa type (tourist, work, student)',
          'Q0-09b': 'No',
          'Q0-09c': 'No',
          'Q0-10':  ['Property I own and plan to keep', 'Close family remaining in my home country'],
        },
        country:                'France',
        cos_flag:               false,
        investment_range:       '$100,000 – $150,000',
        application_type:       'solo',
        partner_type:           'none',
        dependents:             'spouse_only',
        hard_stops_triggered:   [],
        readiness_stage:        null,
        business_type:          null,
        target_date:            null,
        business_cost:          null,
      },
    },

    application: {
      application_type:   'solo',
      processing_path:    'solo',
      family_composition: 'married',
      module_1_complete:  true,
      status:             'in_progress',
      payment_status:     'paid',
    },

    // archetype: career_switcher + food_beverage → career_switcher (not matching buyer/builder)
    // eligibilityScore: score(86) - min(1 risk flag × 5, 20) = 86 - 5 = 81
    caseProfile: {
      archetype:              'career_switcher',
      eligibility_score:      81,
      franchise_triggered:    true,
      franchise_match_score:  0,
      completeness_score:     35,
      data_state:             'quiz_only',
      source_of_funds_score:  0,
      management_role_score:  0,
      business_plan_score:    0,
      profile_data: {
        net_worth_range:   '250k_500k',
        prior_business:    'career_switcher',
        industry_interest: 'food_beverage',
        timeline_goal:     '12_24mo',
        investment_range:  '$100,000 – $150,000',
      },
    },
  },

  // ── C: UK · family (spouse + children) · premium clean ────────────────────
  {
    label:      'Profile C — UK / family / premium-clean',
    email:      'test-uk@example.com',
    createUser: true,
    password:   'TestUK2026!',
    firstName:  'James',
    lastName:   'Windsor',

    session: {
      outcome:                    'PROCEED',
      score:                      100,
      hard_stop_codes:            [],
      attorney_flag_codes:        [],
      risk_flag_codes:            [],
      application_type:           'solo',
      franchise_interest:         true,
      casl_consent:               false,
      casl_consent_at:            null,
      completed_at:               now,
      post_quiz_profile: {
        net_worth_range:    '1m_2_5m',
        prior_business:     'owner',
        industry_interest:  'retail_services',
        timeline_goal:      '6_12mo',
      },
      franchise_triggered: true,
      result_json: {
        outcome:          'PROCEED',
        score:            100,
        warnings:         [],
        attorney_flags:   [],
        franchise_interest: true,
        answers: {
          'Q0-01':  'United Kingdom',
          'Q0-02':  'I am the principal — my spouse will accompany me as a dependent',
          'Q0-02a': 'Yes — all under 21',
          'Q0-05':  'From outside the US — consular processing at my home country consulate',
          'Q0-06':  ['Personal savings or accumulated wealth', 'Proceeds from selling property'],
          'Q0-07':  'Over $150,000',
          'Q0-08':  'I have a specific business or franchise identified',
          'Q0-08a': 'A franchise — buying into an established brand',
          'Q0-08b': 'Yes — please connect me',
          'Q0-09':  'No — clean history',
          'Q0-10':  ['Property I own and plan to keep', 'Close family remaining in my home country', 'Active financial accounts, pension, or investments'],
        },
        country:                'United Kingdom',
        cos_flag:               false,
        investment_range:       'Over $150,000',
        application_type:       'solo',
        partner_type:           'none',
        dependents:             'spouse_and_children',
        hard_stops_triggered:   [],
        readiness_stage:        null,
        business_type:          null,
        target_date:            null,
        business_cost:          null,
      },
    },

    application: {
      application_type:   'solo',
      processing_path:    'solo',
      family_composition: 'family',
      module_1_complete:  true,
      business_name:      'Assisting Hands Home Care East Austin LLC',
      principal_name:     'James Windsor',
      status:             'in_progress',
      payment_status:     'paid',
    },

    // Module 3 answers — realistic franchise buyer data for meaningful gap analysis output
    module3Answers: {
      // ── Investment Overview ──────────────────────────────────────────────
      'M3-F-01': 'Franchise (buying into an established brand)',
      'M3-F-02': '195000',
      'M3-F-03': '195000',
      'M3-F-04': JSON.stringify(['Franchise fee ($49,500)', 'Working capital (3 months operating costs)', 'Equipment and vehicle fit-out', 'Professional fees (attorney and accountant)', 'Initial marketing launch package']),
      // 'yes' is the stored value for "Yes — funds are deployed" select option (engine checks for 'yes')
      'M3-F-NEW-01': 'yes',
      'M3-F-NET': '1500000',
      'M3-F-05': JSON.stringify(['Personal savings or accumulated wealth', 'Proceeds from selling property']),

      // ── Source of Funds / Paper Trail ───────────────────────────────────
      // 'yes' is the stored value for "Yes — complete paper trail" (engine checks for 'yes' = good)
      'M3-H-NEW-01': 'yes',
      'M3-H-01': 'Funds originated from two sources: 18 years of personal savings held in Barclays UK accounts (£95,000 as of January 2025), and proceeds from selling my UK investment flat in Leeds in March 2025 (net proceeds £75,000 after mortgage redemption and solicitor fees). In April 2025 I converted £170,000 to USD at a rate of 1.27, receiving $215,900 via Barclays international FX service. On 12 May 2025 I wired $195,000 to the Assisting Hands East Austin LLC business account at Chase Bank Austin (account ending 7842), wire reference CHSE-2025-04872. Remaining $20,900 retained as personal emergency reserve in personal Chase checking account.',
      'M3-H-02': '5–10 years',
      'M3-H-03': 'Yes',
      'M3-H-05': 'No — all funds are mine',
      'M3-H-08': JSON.stringify(['International wire transfer', 'From personal savings accounts']),
      'M3-H-09': 'Yes — complete wire records and SWIFT confirmations',
      'M3-H-10': 'Yes — converted from GBP to USD',
      // M3-G-BANK is the key the engine reads (D-10 shell company check); M3-B-BANK is the UI key (both seeded)
      'M3-B-BANK': 'Yes — account opened',
      'M3-G-BANK': 'Yes — US Chase business bank account opened (account ending 7842)',
      'M3-B-WIRE': 'Yes — confirmed with Barclays international team',

      // ── Financial Projections ─────────────────────────────────────────────
      // Engine reads M3-I-03 as employeeY1 (parseInt), M3-I-04 as roleList (string length check),
      // M3-I-05 as revenueY1 (parseAmount), M3-I-06 as revenueY3 (parseAmount),
      // M3-I-07 as householdIncome (parseAmount) — note: investment page uses these for different
      // semantics, but these legacy M3- keys are what the gap-analysis-engine.ts reads.
      'M3-I-02': '0',      // current US employees (pre-start: 0)
      'M3-I-03': '6',      // projected full-time employees Year 1
      'M3-I-04': '6 × Caregiver ($18/hr FT), 1 × Care Coordinator ($22/hr FT), 1 × Office Admin ($18/hr PT)',  // role list
      'M3-I-05': '380000', // Year 1 gross revenue projection
      'M3-I-06': '650000', // Year 3 gross revenue projection (was '3' — fixed)
      'M3-I-07': '85000',  // household income need Year 1 (annual salary/draw)
      // Hiring plan and projection basis (M3-I-NEW-* keys read by engine for D-05, D-06, D-07)
      'M3-I-NEW-01': 'Day 1–30: Recruit and hire 6 caregivers via ZipRecruiter and Indeed, complete Checkr background checks, enroll in WellSky ClearCare scheduling. Day 31–60: Begin client intake; target 8 active clients at $18,000/month billings. Day 61–90: Reach $30,000/month billings and break even on fixed costs; file for Texas Medicaid provider enrollment.',
      'M3-I-NEW-02': 'Revenue projections based on: (1) Assisting Hands FDD 2024 Item 19 — system-wide median Year 1 gross revenue $342,000; (2) Austin MSA 65+ population of 82,000 in territory with below-average franchise penetration; (3) validation calls with 4 existing Assisting Hands franchisees confirming Year 1 ranges of $280,000–$420,000; (4) signed territory agreement confirming exclusive 82,000-resident catchment area.',
      'M3-I-09': 'Yes — the business generates revenue from clients beyond supporting our household',
      'M3-I-10': JSON.stringify(['Franchise Item 19 financial performance representations (FDD 2024)', 'Market research: Austin MSA 65+ population data (Travis County)', 'Signed franchise agreement with defined territory', 'Three existing franchisee validation calls confirming Year 1 revenue ranges']),

      // ── Business Entity & Registration ───────────────────────────────────
      'M3-E-01': 'Assisting Hands Home Care East Austin LLC',
      'M3-E-02': 'LLC',
      'M3-E-03': 'Texas',
      'M3-E-04': '93-4821765',
      'M3-E-05': '2025-03-15',
      'M3-E-06': '100',
      'M3-E-13': 'LLC operating agreement (Articles of Organization on file with Texas SOS)',
      'M3-E-07': 'Yes — operating agreement signed',
      'M3-E-12': 'Yes — entity formed',
      // Engine keys for D-13 (ownership structure) — M3-E-NEW-01 = MIL, M3-E-NEW-02 = operating agreement
      'M3-E-NEW-01': 'James Windsor — 100% membership interest per LLC Operating Agreement and Certificate of Membership Interest (Texas SOS File No. 803924871)',
      'M3-E-NEW-02': 'Yes — LLC Operating Agreement executed March 15, 2025. Governing documents include Articles of Organization (filed with Texas Secretary of State) and Operating Agreement confirming 100% ownership and sole management authority.',

      // ── What You Do / Business Description ──────────────────────────────
      'M3-K-01': 'Assisting Hands Home Care East Austin LLC provides non-medical in-home care services to elderly and disabled clients across the East Austin territory. Clients or their families pay directly for care hours on weekly billing cycles, with selected Medicare Advantage and long-term care insurance plans accepted. Revenue flows from care packages averaging 20 hours per week per client, with caregiver payroll as the primary variable expense and a 6% franchise royalty as a fixed percentage of gross billings.',
      'M3-B-01': 'Austin was selected because Texas has no state income tax, attracting a high-net-worth retirement population from California and the Northeast. The East Austin Assisting Hands territory has the lowest franchisee penetration relative to its 65+ population density — a gap the franchisor\'s own territory mapping confirmed. My professional background in care management operations directly matches the Assisting Hands operational model, and I have already completed the franchisor\'s 5-day training program in Chicago.',
      'M3-B-02': '2.3 million (Austin MSA)',
      'M3-B-03': '2 direct franchise competitors within 5 miles (Home Instead and Visiting Angels)',

      // ── Operations ───────────────────────────────────────────────────────
      'M3-G-04': 'Yes — leased commercial office',
      'M3-G-05': '4301 West William Cannon Drive Suite 200, Austin TX 78749',
      'M3-G-08': 'Not yet operational — pre-start (launch scheduled June 2025)',
      'M3-G-08a': '5 days per week',
      'M3-G-09': 'Day 1–30: Complete caregiver recruitment (target 6 caregivers hired and background-checked via Checkr); establish scheduling system (WellSky ClearCare). Day 31–60: Begin client intake and care plan assessments; achieve first 8 active clients generating $18,000 monthly billings. Day 61–90: Reach $30,000 monthly billings and break even on fixed operating costs; file for Texas Medicaid provider enrollment.',
      'M3-G-10': 'Home health agency license application submitted to Texas Health and Human Services (HHSC). Business owner liability insurance and workers compensation policy obtained from Employers Holdings Inc. Registered with Texas Secretary of State. EIN obtained from IRS.',
      // Engine key for D-10 (shell company) — M3-G-NEW-01 = license/permit evidence
      'M3-G-NEW-01': 'Texas home health agency license application submitted to HHSC (reference HHSC-2025-HC-40281). Business registered with Texas Secretary of State (SOS File No. 803924871). EIN 93-4821765 obtained from IRS. General liability and workers compensation insurance in force (Employers Holdings Inc., policy EM-2025-TX-99312).',
      'M3-G-06': 'Leased office space',
      'M3-G-07': 'Long-term lease (3+ years)',
      'M3-G-11': 'Yes — general liability, E&O, and workers compensation in place',

      // ── Franchise Details ─────────────────────────────────────────────────
      'M3-F-09': 'Assisting Hands Home Care',
      'M3-F-10': 'Yes — Item 19 data provided with gross revenue ranges for system-wide units',
      'M3-F-11': 'Yes — franchise agreement signed March 2025',

      // ── Market & Competition ─────────────────────────────────────────────
      'M3-K-02': 'Primary clients: adults aged 70+ who require assistance with activities of daily living (bathing, dressing, medication reminders, mobility) and prefer to age at home. Secondary clients: adult children of aging parents who act as decision-makers and primary payers. Referral sources: hospital discharge planners at St. David\'s Medical Center and Seton Medical Center Austin, geriatric care managers, and senior living communities in the territory.',
      'M3-K-11': 'The Austin MSA has 2.3 million residents with a 65+ cohort projected to grow 22% by 2030 (US Census Bureau). Travis County\'s home care market exceeds $420M annually (IBIS World 2024). The East Austin Assisting Hands territory contains approximately 82,000 residents aged 65+, representing an addressable home care market of approximately $37M annually at industry standard penetration rates.',
      'M3-K-03': 'Primary franchise competitors: Home Instead (3 locations in Austin MSA), Visiting Angels (2 locations). Non-franchise competitors: Care.com freelancers and private agencies. Our competitive advantages: (1) Assisting Hands 25-year brand with 8.2/10 average franchisee satisfaction score; (2) caregiver training program exceeds Texas minimum by 2.5x; (3) 24/7 care coordination line; (4) Italian-speaking care coordinator giving us an edge with Austin\'s growing Italian retiree community.',
      'M3-K-12': 'Post-COVID demand for aging-in-place care has increased 34% in the Austin market. Texas\'s no-income-tax advantage is accelerating retirement migration from California and New York, growing our client base faster than the national average. Medicare Advantage plan expansion is increasing reimbursement rates for non-medical home care by an estimated 12% annually through 2027.',
      // Engine key for D-06 (revenue projections not backed) — M3-K-NEW-01 = market data/basis
      'M3-K-NEW-01': 'Austin MSA: 2.3M population, 82,000 residents aged 65+ in territory. Travis County home care market $420M annually (IBIS World 2024). Assisting Hands FDD 2024 Item 19: system median Year 1 gross revenue $342,000 across 180+ franchise locations. Validated by 4 existing franchisee calls (Year 1 range $280,000–$420,000). US Census Bureau projects 22% growth in 65+ population in Austin MSA by 2030.',

      // ── Qualifications ────────────────────────────────────────────────────
      'M3-Q-01': "Bachelor's degree",
      'M3-Q-02': 'BA Business Administration — University of Leeds (2004)',
      'M3-Q-03': 'Native English speaker',
      'M3-Q-04': '22 years in service operations and client relationship management. Most recently 8 years as Director of Operations at CarePlus Group (London), a care management consultancy with 40 staff and £3.2M annual revenue, where I held full P&L responsibility and oversaw regulatory compliance with CQC (Care Quality Commission) standards. Previously 6 years as Senior Account Manager at Sodexo UK managing facilities service contracts worth £1.8M annually. Extensive experience in care service delivery, staff recruitment, scheduling software, and healthcare regulatory frameworks.',
      'M3-Q-05': '22',
      'M3-Q-06': JSON.stringify(['Industry-specific experience (care services)', 'Prior business ownership or management (Director level)', 'Staff management and recruitment', 'Financial management and P&L', 'Marketing and client acquisition']),
      'M3-Q-07': 'Yes — I have managed business units at director level (P&L responsibility)',
      'M3-Q-10': 'Through a structured franchise selection process over 6 months with FranChoice (franchise consultant) — Assisting Hands was the top-ranked match for my care sector background and capital range',
      'M3-Q-11': 'Researched 8 home care franchise systems over 6 months. Attended Assisting Hands Discovery Day in Chicago (February 2025). Validated Item 19 financial performance with 4 existing franchisees (calls recorded and notes available). Reviewed 2024 FDD with US immigration and franchise attorney. Hired FranChoice consultant who independently ranked Assisting Hands top-3 match for my profile. Visited proposed territory in Austin twice and met with the Regional Developer.',
      'M3-Q-12': 'Yes — visited Austin territory twice; attended franchisor Discovery Day in Chicago',
      'M3-Q-20': 'Chief Executive Officer / Owner-Operator',
      'M3-Q-21': JSON.stringify(['Hiring, managing and scheduling caregivers', 'Client intake appointments and care plan assessments', 'Financial oversight and P&L management', 'Vendor and supplier relationship management', 'Marketing outreach and referral source development']),
      'M3-Q-22': 'Yes — full authority',
      'M3-Q-23': 'Yes',
      'M3-Q-24': 'Yes — full-time, on-site',
      'M3-Q-25': 'Monday to Friday, 45–50 hours per week. Monday: staff scheduling, caregiver check-ins, and weekly P&L review. Tuesday: client intake appointments and care plan assessments in the field. Wednesday: vendor and supplier meetings, compliance review, marketing outreach to referral sources. Thursday: franchisee network calls (bi-weekly), financial reconciliation, accounts payable. Friday: client satisfaction calls, staff performance reviews, and weekend on-call roster setup. Personal 24/7 emergency on-call shared with care coordinator.',
      // Semantic eval keys — gap-analysis/semantic-eval route checks these specific keys
      // projection_basis: looks for M3-I-BASIS, M3-I-01, QI-01, M3-B-PROJ
      'M3-I-BASIS': 'Revenue projections based on: (1) Assisting Hands FDD 2024 Item 19 — system-wide median Year 1 gross revenue $342,000 across 180+ franchise locations in comparable markets; (2) Austin MSA 65+ population of 82,000 in exclusive territory confirmed by franchisor territory mapping; (3) validation calls with 4 existing franchisees confirming Year 1 range $280,000–$420,000; (4) IBIS World 2024 Austin home care market $420M annually; (5) Travis County population aged 65+ projected to grow 22% by 2030 (US Census Bureau). Year 3 projection of $650,000 assumes 20% annual growth consistent with Item 19 data for franchisees in Years 2–3.',
      // source_of_funds: looks for M3-H-NEW-01, M3-H-FUNDS-DETAIL, M3-S1-FUNDS, QH-01
      'M3-H-FUNDS-DETAIL': 'Funds originated from two sources: (1) 18 years of personal savings in Barclays UK accounts (£95,000 as of January 2025); (2) net proceeds from selling UK investment flat in Leeds in March 2025 (£75,000 after mortgage redemption and solicitor fees). In April 2025, £170,000 converted to USD at rate 1.27 via Barclays international FX service, receiving $215,900. On 12 May 2025, $195,000 wired to Assisting Hands Home Care East Austin LLC business account at Chase Bank Austin (account ending 7842), wire reference CHSE-2025-04872. Full documentation available: Barclays statements 2020–2025, UK property sale conveyancing documents, FX conversion confirmation, Chase wire receipt.',

      'M3-V-01': 'No — clean visa history',
      // Engine key for D-15 (214b prior denial check)
      'M3-A-23': 'No — clean visa history, no prior refusals or violations',

      // ── Engine-facing legacy keys (gap-analysis-engine.ts uses QA-08, M3-A-08) ─
      'M3-A-08': 'Chief Executive Officer / Owner-Operator',
      'M3-A-09': 'Daily management activities: caregiver recruitment and scheduling (8 caregivers in Year 1), client intake assessments and care plan design, P&L review and financial decision-making, vendor management (scheduling software, insurance, supplies), referral source outreach (hospital discharge planners, senior centers). Full-time on-site in Austin, TX with personal 24/7 on-call availability.',
    },

    // archetype: owner + retail_services → "buyer" (first rule in classifyArchetype)
    // eligibilityScore: 100 - 0 = 100
    caseProfile: {
      archetype:              'buyer',
      eligibility_score:      100,
      franchise_triggered:    true,
      franchise_match_score:  0,
      completeness_score:     82,
      data_state:             'module3_started',
      source_of_funds_score:  78,
      management_role_score:  82,
      business_plan_score:    74,
      profile_data: {
        net_worth_range:   '1m_2_5m',
        prior_business:    'owner',
        industry_interest: 'retail_services',
        timeline_goal:     '6_12mo',
        investment_range:  'Over $150,000',
      },
    },
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('🌱 E2go Test Profile Seeder\n');
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Profiles: ${PROFILES.length}\n`);

let seeded = 0;

for (const profile of PROFILES) {
  console.log(`\n── ${profile.label}`);

  // 1. Resolve user_id
  let userId;
  if (profile.createUser) {
    let user = await findAuthUser(profile.email);
    if (user) {
      userId = user.id;
      console.log(`  Found existing test user ${userId}`);
    } else {
      const created = await createAuthUser(profile.email, profile.password);
      if (!created?.id) {
        console.error(`  ✗ Failed to create user:`, JSON.stringify(created));
        continue;
      }
      userId = created.id;
      console.log(`  Created test user ${userId}`);
    }
  } else {
    const user = await findAuthUser(profile.email);
    if (!user) {
      console.error(`  ✗ ${profile.email} not found in auth.users`);
      console.error(`    → Make sure the user has signed up first.`);
      continue;
    }
    userId = user.id;
    console.log(`  Found user ${userId}`);
  }

  // 2. Clean existing data
  process.stdout.write('  Cleaning existing data... ');
  await cleanUser(userId);
  console.log('done');

  // 3. Ensure profiles row exists (Supabase trigger may or may not have created it)
  await dbUpsert('profiles', {
    id:         userId,
    email:      profile.email,
    first_name: profile.firstName,
    last_name:  profile.lastName,
    role:       'user',
  }, 'id');
  console.log('  ✓ profiles row');

  // 4. Insert quiz_session
  const sessionRow = await dbInsert('quiz_sessions', {
    user_id: userId,
    email:   profile.email,
    ...profile.session,
  });
  const sessionId = Array.isArray(sessionRow) ? sessionRow[0]?.id : sessionRow?.id;
  if (!sessionId) {
    console.error('  ✗ Failed to insert quiz_session:', JSON.stringify(sessionRow).slice(0, 200));
    continue;
  }
  console.log(`  ✓ quiz_session ${sessionId}`);

  // 5. Insert application_lifecycle — no unique constraint on user_id so we
  //    use plain INSERT (cleanUser already deleted the previous row by user_id)
  await dbInsert('application_lifecycle', {
    user_id:              userId,
    quiz_completed_at:    now,
  });
  console.log('  ✓ application_lifecycle');

  // 5b. Insert applications row (created by Module 1 in real usage; seed bypasses module)
  const appRow = await dbInsert('applications', {
    user_id: userId,
    ...profile.application,
  });
  const appId = Array.isArray(appRow) ? appRow[0]?.id : appRow?.id;
  if (!appId) {
    console.error('  ✗ Failed to insert applications row:', JSON.stringify(appRow).slice(0, 200));
    continue;
  }
  console.log(`  ✓ applications ${appId}`);

  // 5c. Seed answers from quiz result_json so gap-analysis has real data
  const quizAnswers = profile.session?.result_json?.answers ?? {};
  const answerRows = Object.entries(quizAnswers).map(([key, val]) => ({
    application_id: appId,
    question_key:   key,
    answer_value:   Array.isArray(val) ? JSON.stringify(val) : String(val ?? ''),
  }));
  if (answerRows.length > 0) {
    await dbInsert('answers', answerRows);
    console.log(`  ✓ answers (${answerRows.length} quiz answers)`);
  }

  // 5d. Seed Module 3 case file answers (investment, business, qualifications)
  const m3Answers = profile.module3Answers ?? {};
  const m3Rows = Object.entries(m3Answers).map(([key, val]) => ({
    application_id: appId,
    question_key:   key,
    answer_value:   String(val ?? ''),
    // source column omitted — migration 001_case_file_columns.sql not yet applied
  }));
  if (m3Rows.length > 0) {
    await dbInsert('answers', m3Rows);
    console.log(`  ✓ answers (${m3Rows.length} Module 3 answers)`);
  }

  // 6. Insert case_profile (pre-computed — avoids needing buildCaseProfile)
  const cpRow = await dbUpsert('case_profiles', {
    user_id:          userId,
    quiz_session_id:  sessionId,
    application_id:   appId,
    ...profile.caseProfile,
    updated_at:       now,
  }, 'user_id');
  const cpId = Array.isArray(cpRow) ? cpRow[0]?.id : cpRow?.id;
  console.log(`  ✓ case_profile ${cpId ?? '(upserted)'}`);

  const credNote = profile.password
    ? `\n  Login: ${profile.email}  /  ${profile.password}`
    : `\n  Login: ${profile.email}  (your account)`;
  console.log(`\n  ✅ Done.${credNote}`);
  seeded++;
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`✅ Seeded ${seeded}/${PROFILES.length} profiles.\n`);
if (seeded > 0) {
  console.log('Next steps:');
  console.log('  1. Log in as each user at http://localhost:3000/login');
  console.log('  2. Navigate to /dashboard, /results, /gap-analysis to verify');
  console.log('  3. Profile B (France) should show flags and ATTORNEY_RECOMMENDED');
  console.log('  4. Profile C (UK) should show buyer archetype and family dependents');
}
