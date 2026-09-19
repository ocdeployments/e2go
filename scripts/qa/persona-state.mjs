#!/usr/bin/env node
/**
 * QA helper — read-only snapshot of the four QA personas' account state.
 *
 * Why: which routes a persona can reach (middleware payment gate, terms gate,
 * soft-delete gate, admin role) is determined by database state, so the test
 * plan must know that state before predicting any expected outcome.
 *
 * Read-only: only GET requests against Supabase Auth admin + PostgREST.
 * Never prints secrets, tokens, or PII fields (names, emails of other users,
 * phone, address, DOB, passport). Prints ids truncated to 8 chars.
 *
 * Usage:  node scripts/qa/persona-state.mjs
 * Reads:  /Users/owner/E2-go/.env.local  (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('missing supabase env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const PERSONAS = [
  ['A', 'romyjames@gmail.com'],
  ['B', 'test-france@example.com'],
  ['C', 'test-uk@example.com'],
  ['D', 'test-partnership@example.com'],
];

const PII = /email|name|phone|address|token|secret|passport|dob|birth|ssn|password|city|street|zip|postal|ip_/i;
const short = (v) => (typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v) ? v.slice(0, 8) : v);
// Fields the middleware gates read, printed first so they survive line truncation.
const PRIORITY = ['id', 'payment_status', 'source', 'status', 'application_type', 'role', 'deleted_at', 'payment_type', 'terms_version', 'doc_type', 'document_type', 'created_at'];
const safeRow = (row) => {
  const o = {};
  const keys = [...PRIORITY.filter((k) => k in row), ...Object.keys(row).filter((k) => !PRIORITY.includes(k))];
  for (const k of keys) {
    const v = row[k];
    if (PII.test(k)) continue;
    if (v === null || typeof v === 'boolean' || typeof v === 'number') o[k] = v;
    else if (typeof v === 'string' && v.length <= 40) o[k] = short(v);
  }
  return o;
};

async function get(path) {
  const r = await fetch(`${URL_}${path}`, { headers: H });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}

const users = (await get('/auth/v1/admin/users?per_page=200')).body?.users ?? [];

// Tables worth checking for state. A 42703 / 404 here means the name is wrong — print it, never hide it.
const TABLES = [
  ['profiles', 'id'],
  ['applications', 'user_id'],
  ['terms_acceptance', 'user_id'],
  ['quiz_sessions', 'user_id'],
  ['payments', 'user_id'],
  ['uploaded_documents', 'user_id'],
  ['application_documents', 'user_id'],
  ['family_members', 'user_id'],
  ['fdd_analyses', 'user_id'],
  ['generated_documents', 'user_id'],
  ['document_generation_jobs', 'user_id'],
];

for (const [label, email] of PERSONAS) {
  const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  console.log(`\n=== Persona ${label} ${label === 'A' ? '(founder real account — read-only, no email sends)' : `(${email})`} ===`);
  if (!u) { console.log('  auth user: NOT FOUND'); continue; }
  console.log(`  auth: id=${u.id.slice(0, 8)} confirmed=${Boolean(u.email_confirmed_at)} lastSignIn=${u.last_sign_in_at ? u.last_sign_in_at.slice(0, 10) : 'never'}`);
  for (const [table, col] of TABLES) {
    const r = await get(`/rest/v1/${table}?${col}=eq.${u.id}&select=*&limit=5`);
    if (r.status !== 200) {
      console.log(`  ${table}: HTTP ${r.status} ${typeof r.body === 'object' ? (r.body.code || '') + ' ' + (r.body.message || '') : ''}`.trimEnd());
      continue;
    }
    const rows = r.body;
    if (!rows.length) { console.log(`  ${table}: 0 rows`); continue; }
    console.log(`  ${table}: ${rows.length}${rows.length === 5 ? '+' : ''} row(s)`);
    for (const row of rows.slice(0, 3)) console.log('    ' + JSON.stringify(safeRow(row)));
  }
}
console.log('\n(done — read-only)');
