#!/usr/bin/env node
/**
 * E2go Partnership Test Fixture Seeder
 *
 * Seeds a 4th, dedicated QA account for partnership-flow testing
 * (K-2 acceptance: "partnership header variant explicitly screenshotted").
 * Does NOT touch the 3 existing profiles in seed-test-profiles.mjs.
 *
 *   D — Partnership / co-investor / clean → test-partnership@example.com
 *
 * Idempotent: existing data for this user is cleared before re-seeding.
 *
 * Usage:
 *   node scripts/seed-partnership-fixture.mjs
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

const H = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

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
    headers: { ...H, Prefer: 'return=representation,resolution=merge-duplicates' },
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

async function listAuthUsers() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: H });
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

async function cleanUser(userId) {
  const apps = await dbSelect('applications', { user_id: userId }, 'id');
  for (const app of (Array.isArray(apps) ? apps : [])) {
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
  await dbDelete('family_members',         { user_id: userId }).catch(() => {});
  await dbDelete('applications',           { user_id: userId }).catch(() => {});
  await dbDelete('quiz_sessions',          { user_id: userId }).catch(() => {});
  await dbDelete('application_lifecycle',  { user_id: userId }).catch(() => {});
  await dbDelete('payments',               { user_id: userId }).catch(() => {});
}

const now = new Date().toISOString();

const PROFILE = {
  label:      'Profile D — Partnership / co-investor / clean',
  email:      'test-partnership@example.com',
  password:   'TestPartner2026!',
  firstName:  'Marie',
  lastName:   'Lefevre',

  coInvestor: {
    first_name:      'Antoine',
    last_name:       'Rousseau',
    member_type:     'co_investor',
    nationality:     'France',
    date_of_birth:   '1985-04-12',
    passport_number: 'FR2298104',
    sort_order:      0,
  },

  session: {
    outcome:                    'PROCEED',
    score:                      100,
    hard_stop_codes:            [],
    attorney_flag_codes:        [],
    risk_flag_codes:            [],
    application_type:           'partnership',
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
        'Q0-01':  'France',
        'Q0-02':  'I have a business partner — we are co-investing together',
        'Q0-05':  'From outside the US — consular processing at my home country consulate',
        'Q0-06':  ['Personal savings or accumulated wealth'],
        'Q0-07':  'Over $150,000',
        'Q0-08':  'I have a specific business or franchise identified',
        'Q0-08a': 'A franchise — buying into an established brand',
        'Q0-08b': 'Yes — please connect me',
        'Q0-09':  'No — clean history',
        'Q0-10':  ['Property I own and plan to keep', 'Active financial accounts, pension, or investments'],
      },
      country:                'France',
      cos_flag:               false,
      investment_range:       'Over $150,000',
      application_type:       'partnership',
      partner_type:           'business_partner',
      dependents:             'just_me',
      hard_stops_triggered:   [],
      readiness_stage:        null,
      business_type:          null,
      target_date:            null,
      business_cost:          null,
    },
  },

  application: {
    application_type:   'partnership',
    processing_path:    'partnership',
    family_composition: 'partnership',
    module_1_complete:  true,
    status:             'in_progress',
    payment_status:     'paid',
  },

  caseProfile: {
    archetype:              'buyer',
    eligibility_score:      100,
    franchise_triggered:    true,
    franchise_match_score:  0,
    completeness_score:     35,
    data_state:             'quiz_only',
    source_of_funds_score:  0,
    management_role_score:  0,
    business_plan_score:    0,
    profile_data: {
      net_worth_range:   '1m_2_5m',
      prior_business:    'owner',
      industry_interest: 'retail_services',
      timeline_goal:     '6_12mo',
      investment_range:  'Over $150,000',
    },
  },
};

console.log('🌱 E2go Partnership Fixture Seeder\n');
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  ── ${PROFILE.label}`);

let user = await findAuthUser(PROFILE.email);
let userId;
if (user) {
  userId = user.id;
  console.log(`  Found existing test user ${userId}`);
} else {
  const created = await createAuthUser(PROFILE.email, PROFILE.password);
  if (!created?.id) {
    console.error(`  ✗ Failed to create user:`, JSON.stringify(created));
    process.exit(1);
  }
  userId = created.id;
  console.log(`  Created test user ${userId}`);
}

process.stdout.write('  Cleaning existing data... ');
await cleanUser(userId);
console.log('done');

await dbUpsert('profiles', {
  id:         userId,
  email:      PROFILE.email,
  first_name: PROFILE.firstName,
  last_name:  PROFILE.lastName,
  role:       'user',
}, 'id');
console.log('  ✓ profiles row');

const sessionRow = await dbInsert('quiz_sessions', {
  user_id: userId,
  email:   PROFILE.email,
  ...PROFILE.session,
});
const sessionId = Array.isArray(sessionRow) ? sessionRow[0]?.id : sessionRow?.id;
if (!sessionId) {
  console.error('  ✗ Failed to insert quiz_session:', JSON.stringify(sessionRow).slice(0, 200));
  process.exit(1);
}
console.log(`  ✓ quiz_session ${sessionId}`);

await dbInsert('application_lifecycle', {
  user_id:           userId,
  quiz_completed_at: now,
});
console.log('  ✓ application_lifecycle');

const appRow = await dbInsert('applications', {
  user_id: userId,
  ...PROFILE.application,
});
const appId = Array.isArray(appRow) ? appRow[0]?.id : appRow?.id;
if (!appId) {
  console.error('  ✗ Failed to insert applications row:', JSON.stringify(appRow).slice(0, 200));
  process.exit(1);
}
console.log(`  ✓ applications ${appId}`);

const quizAnswers = PROFILE.session?.result_json?.answers ?? {};
const answerRows = Object.entries(quizAnswers).map(([key, val]) => ({
  application_id: appId,
  question_key:   key,
  answer_value:   Array.isArray(val) ? JSON.stringify(val) : String(val ?? ''),
}));
if (answerRows.length > 0) {
  await dbInsert('answers', answerRows);
  console.log(`  ✓ answers (${answerRows.length} quiz answers)`);
}

const cpRow = await dbUpsert('case_profiles', {
  user_id:         userId,
  quiz_session_id: sessionId,
  application_id:  appId,
  ...PROFILE.caseProfile,
  updated_at:      now,
}, 'user_id');
const cpId = Array.isArray(cpRow) ? cpRow[0]?.id : cpRow?.id;
console.log(`  ✓ case_profile ${cpId ?? '(upserted)'}`);

const familyRow = await dbInsert('family_members', {
  user_id: userId,
  ...PROFILE.coInvestor,
});
const familyId = Array.isArray(familyRow) ? familyRow[0]?.id : familyRow?.id;
if (!familyId) {
  console.error('  ✗ Failed to insert family_members row:', JSON.stringify(familyRow).slice(0, 200));
  process.exit(1);
}
console.log(`  ✓ family_members (co_investor) ${familyId}`);

console.log(`\n  ✅ Done.\n  Login: ${PROFILE.email}  /  ${PROFILE.password}`);
