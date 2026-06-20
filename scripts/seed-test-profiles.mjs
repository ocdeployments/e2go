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
  if (m) vars[m[1].trim()] = m[2].trim();
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
      status:             'in_progress',
    },

    // archetype: owner + retail_services → "buyer" (first rule in classifyArchetype)
    // eligibilityScore: 100 - 0 = 100
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
