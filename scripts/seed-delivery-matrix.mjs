#!/usr/bin/env node
/**
 * DR-20 delivery-matrix fixture seeder.
 *
 * Drives the REAL Next.js route handlers (never direct-DB-inserts Module 3
 * answers, case_theory, document_intelligence, or case_brief_json) so that
 * a seeded "cell" is genuine pipeline output, not a hand-authored fixture.
 * See /Users/owner/.claude/plans/wobbly-bubbling-plum.md for the full spec.
 *
 * Auth: mints a Supabase magic-link session server-side and exchanges it for
 * a real access/refresh token pair, then drives /api/answers etc. over
 * authenticated HTTP with that session cookie — the same technique
 * run-persona-generation.mjs already uses. This exercises the real
 * ownership/auth checks in each route instead of bypassing them.
 *
 * Usage (pilot — one cell only):
 *   node scripts/seed-delivery-matrix.mjs --cell solo-independent-canada-funded
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. Optional BASE_URL (default http://localhost:3000).
 */

import { readFileSync } from 'fs';

// ── Env ──────────────────────────────────────────────────────────────────────
const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = vars.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY     = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL     = process.env.BASE_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];

const H = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// ── Raw Supabase REST helpers (service role — for fixture-shape rows only:
// the applications row itself, and cleanup) ─────────────────────────────────
async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`[insert ${table}] HTTP ${r.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
}

async function dbUpdate(table, conditions, data) {
  const qs = Object.entries(conditions).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`[update ${table}] HTTP ${r.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
}

async function dbSelect(table, conditions, columns = '*') {
  const qs = Object.entries(conditions).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${qs}`, { headers: H });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return []; }
}

async function dbDelete(table, conditions) {
  const qs = Object.entries(conditions).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { method: 'DELETE', headers: H });
  return r.status;
}

async function listAuthUsers() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: H });
  const data = await r.json();
  return data?.users ?? [];
}

async function findAuthUser(email) {
  const users = await listAuthUsers();
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAuthUser(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ email, email_confirm: true }),
  });
  return r.json();
}

/** Cascade-clean any prior fixture data for this user, for idempotent re-seeding. */
async function cleanUser(userId) {
  const apps = await dbSelect('applications', { user_id: userId }, 'id');
  for (const app of Array.isArray(apps) ? apps : []) {
    await dbDelete('case_briefs',             { application_id: app.id }).catch(() => {});
    await dbDelete('case_theory',             { application_id: app.id }).catch(() => {});
    await dbDelete('document_intelligence',   { application_id: app.id }).catch(() => {});
    await dbDelete('case_intelligence_locks', { application_id: app.id }).catch(() => {});
    await dbDelete('application_documents',   { application_id: app.id }).catch(() => {});
    await dbDelete('answers',                 { application_id: app.id }).catch(() => {});
    await dbDelete('generated_documents',     { application_id: app.id }).catch(() => {});
    await dbDelete('generation_pipeline_log', { application_id: app.id }).catch(() => {});
    await dbDelete('applicant_voice_profile', { application_id: app.id }).catch(() => {});
    await dbDelete('uploaded_documents',      { application_id: app.id }).catch(() => {});
  }
  await dbDelete('followup_responses',    { user_id: userId }).catch(() => {});
  await dbDelete('case_profiles',         { user_id: userId }).catch(() => {});
  await dbDelete('family_members',        { user_id: userId }).catch(() => {});
  await dbDelete('applications',          { user_id: userId }).catch(() => {});
  await dbDelete('quiz_sessions',         { user_id: userId }).catch(() => {});
  await dbDelete('application_lifecycle', { user_id: userId }).catch(() => {});
  await dbDelete('payments',              { user_id: userId }).catch(() => {});
}

// ── Magic-link session auth (mirrors run-persona-generation.mjs) ────────────
async function mintSessionCookie(email) {
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const linkData = await linkRes.json();
  const hashedToken = linkData?.properties?.hashed_token || linkData?.hashed_token;
  if (!hashedToken) throw new Error(`generate_link failed: ${JSON.stringify(linkData).slice(0, 300)}`);

  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = await verifyRes.json();
  if (!session?.access_token) throw new Error(`verify failed: ${JSON.stringify(session).slice(0, 300)}`);

  const cookiePayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    expires_in: session.expires_in ?? 3600,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  };
  const cookieValue = `base64-${Buffer.from(JSON.stringify(cookiePayload)).toString('base64')}`;
  const cookieHeader = `sb-${PROJECT_REF}-auth-token=${cookieValue}`;

  return { cookieHeader, userId: session.user.id };
}

// ── Authenticated HTTP helpers against the local app ────────────────────────
function authedFetch(cookieHeader) {
  return (path, init = {}) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Cookie: cookieHeader },
    });
}

async function postAnswer(fetcher, { applicationId, questionKey, answerValue }) {
  const res = await fetcher('/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, question_key: questionKey, answer_value: answerValue }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[answers] ${questionKey} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Cell definitions ─────────────────────────────────────────────────────────
// Only the pilot cell is fully fleshed out for now. buildFixture() is shaped
// to extend to the other 35 per the plan's per-dimension deltas, but that
// extension is deliberately deferred until this one cell is verified.
const NATIONALITY_PRESETS = {
  canada: { citizenship: 'Canada', birthCountry: 'Canada', birthCity: 'Toronto', homeCountry: 'Canada', homeCity: 'Toronto, Ontario', currency: 'CAD' },
  japan:  { citizenship: 'Japan',  birthCountry: 'Japan',  birthCity: 'Osaka',   homeCountry: 'Japan',  homeCity: 'Osaka, Japan',      currency: 'JPY' },
  south_korea: { citizenship: 'South Korea', birthCountry: 'South Korea', birthCity: 'Busan', homeCountry: 'South Korea', homeCity: 'Busan, South Korea', currency: 'KRW' },
};

function buildFixtureConfig(cellKey) {
  // cellKey format: "<ownership>-<businessType>-<nationality>-<funding>"
  const [ownership, businessType, nationality, funding] = cellKey.split('-');
  if (!NATIONALITY_PRESETS[nationality]) throw new Error(`Unknown nationality in cell key: ${cellKey}`);
  return { ownership, businessType, nationality, funding, ...NATIONALITY_PRESETS[nationality] };
}

/**
 * Builds the M3-* answer map for one cell. Only "solo" ownership and
 * "independent" businessType are implemented in full today — the pilot cell.
 * Franchise-specific (M3-FDD-*, M3-FA-*, M3-F-09..11) and partnership-specific
 * (second co-investor answers) keys are intentionally omitted here; they
 * belong to cells not yet built.
 */
function buildAnswers(cfg) {
  const n = cfg; // shorthand
  const fundedFull = n.funding === 'funded';

  const answers = {
    // investor_profile
    'M3-A-01': 'Jordan Whitfield',
    'M3-A-02': 'no',
    'M3-A-03': '1985-06-14',
    'M3-A-04': `${n.birthCity}, ${n.birthCountry}`,
    'M3-A-05': n.citizenship,
    'M3-A-06': 'no',
    'M3-A-08': '',
    'M3-A-09': `142 Maple Street, ${n.homeCity}`,
    'M3-A-10': '9 years',
    'M3-A-11': '+1-416-555-0148',
    'M3-A-12': 'dr20-solo-independent-canada-funded@e2go-test.internal',
    'M3-A-13': 'linkedin.com/in/jordanwhitfield',
    'M3-A-14': 'Margaret Whitfield, Robert Whitfield',
    'M3-A-15': 'no',
    'M3-A-16': 'March 2024 (business trip), August 2023 (tourism)',
    'M3-A-17': 'United States, United Kingdom, Mexico',
    'M3-A-18': 'no',
    'M3-A-19': 'no',
    'M3-A-20': 'no',
    'M3-A-21': 'yes — B1/B2 visitor visa, issued 2019, still valid',

    // story
    'M3-S1-01': 'I spent the last nine years building and then running the operations side of a mid-size logistics brokerage in Toronto, eventually managing a team of twelve and full P&L responsibility for a $6M book of business. This new venture lets me apply that same hands-on operations discipline to a business I will own outright.',
    'M3-S1-02': 'I am ready to run something I own rather than something I manage for someone else, and the U.S. market gives this specific business model far more room to grow than the Canadian market I know well but have largely saturated my own network in.',
    'M3-S1-03': 'Nine years of direct operational management, including hiring, vendor negotiation, and full budget ownership, translate directly into running a small U.S. business day-to-day from day one.',
    'M3-S1-04': 'Get the location fully operational, hire and train my first two employees, and establish local supplier and customer relationships within the first 90 days.',
    'M3-S1-05': 'no',
    'M3-S1-05-option': 'Nothing unusual to address',

    // business_details
    'M3-E-01': 'Whitfield Logistics Solutions LLC',
    'M3-E-02': 'LLC',
    'M3-E-03': 'Delaware',
    'M3-E-04': '92-1847563',
    'M3-E-05': '2026-03-01',
    'M3-E-06': '100',
    'M3-E-13': 'Operating agreement naming me as 100% member',
    'M3-E-07': 'yes',
    'M3-E-12': 'yes',
    'M3-G-04': 'yes',
    'M3-G-05': '4820 Distribution Way, Newark, DE 19702',
    'M3-G-06': 'Commercial warehouse/office',
    'M3-G-07': '5-year commercial lease',
    'M3-G-08': 'no',
    'M3-G-08a': '5 days/week',
    'M3-G-09': 'Finalize the lease buildout, install warehouse racking, onboard our freight-carrier network, and bring on our first two operations hires.',
    'M3-G-10': 'Delaware business license, DOT motor carrier number (in process)',
    'M3-G-11': 'yes — general liability and commercial auto policies bound',
    'M3-K-01': 'A regional freight brokerage connecting small and mid-size manufacturers with vetted carrier partners, handling load matching, rate negotiation, and shipment tracking end-to-end.',
    'M3-K-02': 'Small and mid-size manufacturers in the mid-Atlantic region who need reliable freight capacity without maintaining their own logistics staff.',
    'M3-K-11': 'The mid-Atlantic regional freight brokerage market is estimated at roughly $2.1B annually, with small manufacturers historically underserved by the large national brokers.',
    'M3-K-03': 'Several national brokerages operate in the region, but they prioritize large accounts; our advantage is dedicated account management and faster response times for small-volume shippers.',
    'M3-K-12': 'Nearshoring trends are pushing more manufacturing back to the mid-Atlantic corridor, increasing regional freight volume year over year.',
    'M3-B-01': 'Freight brokerage connecting regional manufacturers with carrier capacity.',
    'M3-B-02': 'Newark, Delaware',
    'M3-B-03': '2 planned Year 1 hires (dispatcher, account manager)',

    // investment_snapshot
    'M3-F-01': 'New business formation',
    'M3-F-02': '185000',
    'M3-F-03': '210000',
    'M3-F-04': fundedFull
      ? 'Full amount already wired to the U.S. business operating account.'
      : 'Roughly 60% wired to date; remaining committed funds are held in a Canadian investment account pending final buildout invoices.',
    'M3-F-NEW-01': fundedFull ? 'yes' : 'partial',
    'M3-F-NET': '1400000',
    'M3-F-05': 'Personal savings accumulated over 9 years plus proceeds from the sale of a Toronto investment condo in 2025.',
    'M3-H-NEW-01': 'yes',
    'M3-H-01': 'Funds originated as salary savings and RRSP contributions accumulated between 2016 and 2024, supplemented by roughly $95,000 CAD in net proceeds from the March 2025 sale of a rental condo in Toronto. All funds were consolidated into a single RBC personal account by June 2025, then wired in two tranches (July 2025 and January 2026) to the Whitfield Logistics Solutions LLC operating account at a U.S. bank, converting CAD to USD at each transfer.',
    'M3-H-02': '2016–2025 (9 years)',
    'M3-H-03': 'yes — CAD, converted to USD at time of transfer',
    'M3-H-05': 'no',
    'M3-H-08': 'International wire transfer, RBC to U.S. business checking account',
    'M3-H-09': 'yes — SWIFT wire confirmations for both transfers',
    'M3-H-10': 'yes — CAD to USD',
    'M3-I-03': 'Projections are based on comparable regional freight brokerages of similar size and my nine years of direct experience with brokerage revenue-per-load economics in a similar market.',
    'M3-I-04': '65000',
    'M3-I-05': '2',
    'M3-I-06': '0',
    'M3-I-07': 'One dispatcher handling load matching and carrier communication; one account manager handling shipper relationships and rate negotiation.',
    'M3-I-09': 'yes — serves manufacturer clients across the mid-Atlantic region, not limited to my own household or personal consumption.',
    'M3-I-10': 'Two full-time U.S. hires within Year 1, a 5-year commercial lease, and projected Year 3 revenue exceeding $900,000 all support a business scaled well beyond marginal, subsistence-level operation.',
    'M3-I-01': '340000',
    'M3-I-NET1': '58000',
    'M3-I-PROJECTIONS': 'Year 1: $340,000 gross revenue. Year 2: $610,000. Year 3: $920,000, based on regional freight volume growth and planned carrier network expansion.',
    'M3-I-BREAKEVEN': 'Projected to reach operational break-even in month 8 of Year 1.',
    'M3-I-11': 'Prepared to explain the freight brokerage margin structure and how load volume drives revenue.',
    'M3-I-12': 'Prepared to walk through the lease terms and buildout timeline in detail.',
    'M3-I-13': 'Prepared to explain the hiring timeline and each role’s responsibilities.',
    'M3-I-14': 'Prepared to discuss competitive differentiation versus national brokerages.',
    'M3-I-15': 'Prepared to discuss the wire transfer trail and source-of-funds documentation.',

    // qualifications
    'M3-Q-00': 'Independent business — freight brokerage (not a franchise)',
    'M3-Q-01': "Bachelor's degree",
    'M3-Q-02A': 'Business Administration',
    'M3-Q-02B': 'B.Comm.',
    'M3-Q-02C': 'University of Toronto',
    'M3-Q-02D': '2011',
    'M3-Q-02E': 'Certified in Transportation and Logistics (CTL), 2019',
    'M3-Q-03': 'Native/fluent English',
    'M3-Q-04': 'Nine years at a mid-size Toronto logistics brokerage, rising from dispatcher to operations manager with full P&L responsibility for a $6M book of business, twelve direct reports, and carrier-network development across Ontario and the northeastern U.S.',
    'M3-Q-05': '9',
    'M3-Q-06': 'Load-matching operations, carrier rate negotiation, dispatcher team management, and P&L ownership directly transfer to running this brokerage.',
    'M3-Q-07': 'no — this is my first business ownership, though I managed full P&L for an employer',
    'M3-Q-10': 'I identified the mid-Atlantic freight gap through my existing carrier network while still employed, then spent eight months validating demand with prospective shipper clients before committing.',
    'M3-Q-11': 'Eight months of market research, three site visits to the Newark, DE area, and informal conversations with 14 prospective shipper clients.',
    'M3-Q-12': 'yes — visited the target location and met with the commercial leasing agent in person in November 2025',
    'M3-Q-20': 'Managing Member / President',
    'M3-Q-21': 'Full operational oversight: carrier relationships, client accounts, hiring, and day-to-day P&L management.',
    'M3-Q-22': 'yes',
    'M3-Q-23': 'yes',
    'M3-Q-24': 'yes',
    'M3-Q-25': 'Full-time, five days a week, on-site at the Newark facility.',
    'M3-V-01': 'no',
    'M3-V-03': 'no',
    'M3-V-05': 'no',
    'M3-V-07': 'yes',
    'M3-V-08': 'B1/B2 visitor visa, issued 2019, used for business travel and tourism, no issues.',

    // family_dependents — solo cell: no spouse, no children
    'M3-L-01': 'no',
    'M3-L-07': 'no',

    // ties
    'M3-T-01': 'Own a rental property in Toronto and hold a Canadian brokerage investment account.',
    'M3-T-02': 'One rental condominium (Toronto), one non-registered investment account.',
    'M3-T-03': 'no — sold my primary residence in 2025; renting month-to-month until relocation',
    'M3-T-04': 'Parents and one sibling remain in Toronto.',
    'M3-T-05': 'Both parents (mid-70s) and a younger sister live in Toronto; I visit several times a year and intend to continue doing so.',
    'M3-T-06': 'Member of the Toronto Logistics & Supply Chain Association',
    'M3-T-07': 'Continuing RRSP contributions and the mortgage on the Toronto rental property.',
    'M3-T-08': 'Maintain the Toronto rental mortgage and RRSP contributions from U.S.-earned income while resident in the U.S.',
    'M3-T-09': 'Intend to remain on E-2 status as long as the business operates and remains viable, renewing as needed.',
    'M3-T-10': 'If the business were to close, I would return to Canada, where I retain property, family, and professional relationships.',
    'M3-T-11': 'Long-term plan is to grow the brokerage over 5-10 years; if the venture ends, I return to Canada to my existing property and professional network.',

    // security_background — primary applicant, all "no" (clean history persona)
    'M3-SEC-H-01': 'no', 'M3-SEC-H-02': 'no', 'M3-SEC-H-03': 'no',
    'M3-SEC-C-01': 'no', 'M3-SEC-C-02': 'no',
    'M3-SEC-M-01': 'no', 'M3-SEC-M-02': 'no', 'M3-SEC-M-03': 'no',
    'M3-SEC-I-01': 'no', 'M3-SEC-I-02': 'no', 'M3-SEC-I-03': 'no',
    'M3-SEC-S-01': 'no', 'M3-SEC-S-02': 'no', 'M3-SEC-S-03': 'no', 'M3-SEC-S-04': 'no', 'M3-SEC-S-05': 'no',
    'M3-POC-01': 'yes',
    'M3-POC-02': 'David Chen',
    'M3-POC-03': 'Whitfield Logistics Solutions LLC (registered agent)',
    'M3-POC-04': 'Business attorney',
    'M3-POC-05': '4820 Distribution Way, Newark, DE 19702',
    'M3-POC-06': '+1-302-555-0192',
    'M3-POC-07': 'dchen@example-law.com',
    'M3-TC-01': 'no',
  };

  return answers;
}

const UNWIRED_KEY_PREFIXES = ['M3-AC-'];

async function seedOneCell(cellKey, { resumeFrom } = {}) {
  const cfg = buildFixtureConfig(cellKey);
  const email = `dr20-${cellKey}@e2go-test.internal`;

  console.log(`\n🌱 Seeding cell: ${cellKey}`);
  console.log(`  Config: ${JSON.stringify(cfg)}`);
  console.log(`  Email: ${email}`);

  let user = await findAuthUser(email);
  let userId;
  let applicationId;

  if (resumeFrom) {
    if (!user) throw new Error(`--resume-from given but no existing fixture user found for ${email}`);
    userId = user.id;
    const apps = await dbSelect('applications', { user_id: userId }, 'id');
    applicationId = Array.isArray(apps) && apps[0]?.id;
    if (!applicationId) throw new Error(`--resume-from given but no existing applications row found for user ${userId}`);
    console.log(`  Resuming from "${resumeFrom}" — reusing user ${userId}, application ${applicationId}`);
  } else if (user) {
    userId = user.id;
    console.log(`  Found existing fixture user ${userId} — cleaning prior data`);
    await cleanUser(userId);
  } else {
    const created = await createAuthUser(email);
    if (!created?.id) throw new Error(`Failed to create user: ${JSON.stringify(created)}`);
    userId = created.id;
    console.log(`  Created fixture user ${userId}`);
  }

  if (!resumeFrom) {
    await dbUpdate('profiles', { id: userId }, { email, first_name: 'Jordan', last_name: 'Whitfield' })
      .catch(async () => dbInsert('profiles', { id: userId, email, first_name: 'Jordan', last_name: 'Whitfield', role: 'user' }));

    // applications row — created via direct insert (service role), not
    // /api/checkout/initiate, since that route accepts only {tierId, promoCode}
    // and does not set the per-cell dimension fields this test matrix needs.
    // Stripe/checkout correctness is explicitly out of scope for this test
    // (see the plan's "what this run does NOT test" section), so payment_status
    // is set directly to 'paid', matching run-persona-generation.mjs's pattern.
    const appRow = await dbInsert('applications', {
      user_id: userId,
      application_type: cfg.ownership === 'partnership' ? 'partnership' : 'solo',
      processing_path: 'standard',
      family_composition: cfg.ownership === 'solo' ? 'principal_only' : cfg.ownership,
      business_category: cfg.businessType,
      treaty_country: cfg.citizenship,
      module_1_complete: true,
      status: 'in_progress',
      payment_status: 'paid',
    });
    applicationId = Array.isArray(appRow) ? appRow[0]?.id : appRow?.id;
    if (!applicationId) throw new Error(`Failed to insert applications row: ${JSON.stringify(appRow)}`);
    console.log(`  ✓ applications ${applicationId}`);
  }

  const { cookieHeader } = await mintSessionCookie(email);
  const fetcher = authedFetch(cookieHeader);
  console.log(`  ✓ authenticated session minted`);

  if (resumeFrom === 'analysis') {
    return finishAnalysis(fetcher, userId, applicationId, cellKey);
  }

  const answers = buildAnswers(cfg);
  const keys = Object.keys(answers).filter((k) => !UNWIRED_KEY_PREFIXES.some((p) => k.startsWith(p)));

  console.log(`  Posting ${keys.length} answers via /api/answers...`);
  let posted = 0;
  for (const key of keys) {
    const value = answers[key];
    if (value === undefined || value === null) continue;
    await postAnswer(fetcher, { applicationId, questionKey: key, answerValue: String(value) });
    posted += 1;
    if (posted % 20 === 0) console.log(`    ...${posted}/${keys.length}`);
  }
  console.log(`  ✓ posted ${posted} answers`);

  // ── Document parse: one financial-statement doc, driven for real ──────────
  console.log('  Uploading + parsing a source-of-funds financial statement...');
  const fakeStatementText = `RBC ROYAL BANK — ACCOUNT STATEMENT
Account holder: Jordan Whitfield
Statement period: 2025-06-01 to 2025-06-30
Opening balance: 178,420.11 CAD
Closing balance: 254,903.44 CAD
Deposit 2025-06-12: Sale proceeds — 4820 Lakeshore Condo — 95,200.00 CAD
Wire out 2025-07-02: International wire to Whitfield Logistics Solutions LLC (USD) — 140,000.00 CAD equiv.
This document is a synthetic DR-20 test fixture and does not represent a real financial institution record.`;
  const form = new FormData();
  form.set('file', new Blob([fakeStatementText], { type: 'text/plain' }), 'rbc-statement-2025-06.txt');
  form.set('docType', 'financial_statement');
  form.set('applicationId', applicationId);
  const parseRes = await fetcher('/api/apply/parse-document', { method: 'POST', body: form });
  if (!parseRes.ok) {
    console.warn(`  ⚠ parse-document returned HTTP ${parseRes.status}: ${(await parseRes.text()).slice(0, 300)}`);
  } else {
    console.log('  ✓ parse-document succeeded');
  }

  // ── Voice sample ────────────────────────────────────────────────────────
  console.log('  Saving voice sample...');
  const voiceRes = await fetcher('/api/followup/save-voice-sample', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      voiceSampleText: "Honestly the part I keep coming back to is the lease. Nine years of watching other people's operations taught me exactly what can go wrong in a warehouse buildout, so I've already walked the site twice with the contractor and I'm not signing off until the racking layout matches what my dispatcher actually needs on day one. I'd rather spend an extra week on this than fix it after we're paying rent on an empty building.",
    }),
  });
  if (!voiceRes.ok) {
    console.warn(`  ⚠ save-voice-sample returned HTTP ${voiceRes.status}: ${(await voiceRes.text()).slice(0, 300)}`);
  } else {
    console.log('  ✓ voice sample saved');
  }

  return finishAnalysis(fetcher, userId, applicationId, cellKey);
}

/** Waits out the case-intelligence lock, then calls /api/analysis/run. Split out so a failed/killed run can resume from just this step via --resume-from analysis. */
async function finishAnalysis(fetcher, userId, applicationId, cellKey = '') {
  console.log('  Waiting 35s for the last fire-and-forget buildCaseIntelligence() run to clear its lock...');
  await sleep(35_000);

  console.log('  Calling /api/analysis/run...');
  const analysisRes = await fetcher('/api/analysis/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId }),
  });
  if (!analysisRes.ok) {
    console.warn(`  ⚠ analysis/run returned HTTP ${analysisRes.status}: ${(await analysisRes.text()).slice(0, 500)}`);
  } else {
    console.log('  ✓ analysis/run succeeded — case_brief_json produced');
  }

  console.log(`\n  ✅ Cell "${cellKey}" seeded. userId=${userId} applicationId=${applicationId}`);
  return { userId, applicationId };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cellArgIdx = args.indexOf('--cell');
const cellKey = cellArgIdx >= 0 ? args[cellArgIdx + 1] : null;
const resumeIdx = args.indexOf('--resume-from');
const resumeFrom = resumeIdx >= 0 ? args[resumeIdx + 1] : null;

if (!cellKey) {
  console.error('Usage: node scripts/seed-delivery-matrix.mjs --cell <ownership>-<businessType>-<nationality>-<funding> [--resume-from analysis]');
  console.error('Pilot cell: node scripts/seed-delivery-matrix.mjs --cell solo-independent-canada-funded');
  process.exit(1);
}

await seedOneCell(cellKey, { resumeFrom });
