#!/usr/bin/env node
/**
 * QA helper — resolve the concrete IDs the dynamic routes need, per QA persona.
 *
 * Why: /documents/[applicationId], /apply/dependent/[familyMemberId],
 * /fdd/*\/[fddId], /api/generate/progress/[jobId] … cannot be visited without
 * a real ID that belongs to the persona under test (and a foreign one for the
 * IDOR probes). Read-only: GET-only against PostgREST + Auth admin.
 *
 * Output goes to a JSON file OUTSIDE the repo (default: ./qa-ids.json in the
 * cwd — run it from the scratchpad). It contains UUIDs of QA personas' rows,
 * no names / emails / free text. Console output shows counts only.
 *
 * Usage:  node /Users/owner/E2-go/scripts/qa/resolve-ids.mjs [out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) { console.error('missing supabase env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const out = process.argv[2] || 'qa-ids.json';

const PERSONAS = { A: 'romyjames@gmail.com', B: 'test-france@example.com', C: 'test-uk@example.com', D: 'test-partnership@example.com' };

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: H });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}

// [logical name, table, filter column, columns to select]
const SETS = [
  ['applications', 'applications', 'user_id', 'id,payment_status,source,created_at'],
  ['familyMembers', 'family_members', 'user_id', 'id,created_at'],
  ['uploadedDocuments', 'uploaded_documents', 'user_id', 'id,created_at'],
  ['fddAnalyses', 'fdd_analyses', 'user_id', 'id,created_at'],
  ['generatedDocuments', 'generated_documents', 'user_id', 'id,application_id,created_at'],
  ['generationJobs', 'document_generation_jobs', 'user_id', 'id,application_id,created_at'],
];

const users = (await get('/auth/v1/admin/users?per_page=200')).body?.users ?? [];
const result = { generated: new Date().toISOString(), personas: {} };
const problems = [];

for (const [label, email] of Object.entries(PERSONAS)) {
  const u = users.find((x) => x.email?.toLowerCase() === email);
  if (!u) { problems.push(`${label}: auth user not found`); continue; }
  const p = { userId: u.id };
  for (const [name, table, col, select] of SETS) {
    const r = await get(`/rest/v1/${table}?${col}=eq.${u.id}&select=${select}&order=created_at.desc&limit=25`);
    if (r.status !== 200) {
      problems.push(`${label}.${name}: HTTP ${r.status} ${typeof r.body === 'object' ? (r.body.code || '') + ' ' + (r.body.message || '') : ''}`.trim());
      p[name] = [];
      continue;
    }
    p[name] = r.body;
  }
  result.personas[label] = p;
}

writeFileSync(out, JSON.stringify(result, null, 1), { mode: 0o600 });
console.log(`wrote ${out}`);
for (const [label, p] of Object.entries(result.personas)) {
  console.log(`  ${label}: ` + SETS.map(([n]) => `${n}=${p[n].length}`).join(' '));
}
if (problems.length) { console.log('PROBLEMS (not hidden):'); for (const x of problems) console.log('  ' + x); }
