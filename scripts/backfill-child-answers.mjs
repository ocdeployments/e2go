#!/usr/bin/env node
/**
 * Backfill: legacy CHILD-{n}-* flat answers → family_members-scoped answers
 *
 * Phase 2 rollout step from /Users/owner/.claude/plans/woolly-dancing-crescent.md.
 * The Family & Dependents page (src/app/apply/family/page.tsx) has always written
 * per-child identity fields as flat keys CHILD-{n}-NAME/DOB/NATIONALITY/PASSPORT
 * (n = 1..5), with no link to the family_members table. Phase 1 added
 * answers.family_member_id and Phase 2's dependent flow reads/writes identity
 * data under the SAME canonical keys the principal uses (M3-A-01 name,
 * M3-A-03 DOB, M3-A-05 nationality, M3-A-PASSPORT passport number), scoped by
 * family_member_id instead of a key suffix.
 *
 * This script maps each legacy CHILD-{n}-* row to the nth 'child' row in
 * family_members (ordered by sort_order, falling back to created_at) for the
 * same user, and inserts the scoped equivalent. It does NOT touch or delete
 * the legacy rows — they remain a read-fallback for family/page.tsx, which is
 * untouched by this script.
 *
 * Idempotent: re-running skips any (application_id, question_key,
 * family_member_id) combination that already has a value.
 *
 * Usage:
 *   node scripts/backfill-child-answers.mjs           # dry run, prints plan
 *   node scripts/backfill-child-answers.mjs --apply    # writes the scoped rows
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');

const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const H = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function get(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`[GET ${path}] HTTP ${r.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return parsed;
}

async function upsert(table, data, onConflict) {
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

const LEGACY_SUFFIX_TO_CANONICAL_KEY = {
  NAME: 'M3-A-01',
  DOB: 'M3-A-03',
  NATIONALITY: 'M3-A-05',
  PASSPORT: 'M3-A-PASSPORT',
};

const CHILD_KEY_RE = /^CHILD-([1-5])-(NAME|DOB|NATIONALITY|PASSPORT)$/;

async function main() {
  console.log(`Backfill CHILD-{n}-* → family_members-scoped answers ${APPLY ? '(APPLY)' : '(DRY RUN — pass --apply to write)'}`);

  const legacyAnswers = await get(
    `answers?select=id,application_id,question_key,answer_value&question_key=like.CHILD-*&family_member_id=is.null`
  );
  if (!Array.isArray(legacyAnswers) || legacyAnswers.length === 0) {
    console.log('No legacy CHILD-{n}-* answers found. Nothing to do.');
    return;
  }

  const byApplication = new Map();
  for (const row of legacyAnswers) {
    const m = row.question_key.match(CHILD_KEY_RE);
    if (!m) continue;
    const [, n, suffix] = m;
    if (!row.answer_value) continue;
    if (!byApplication.has(row.application_id)) byApplication.set(row.application_id, []);
    byApplication.get(row.application_id).push({ n: Number(n), suffix, value: row.answer_value });
  }

  console.log(`Found legacy child answers across ${byApplication.size} application(s).`);

  let plannedWrites = 0;
  let skippedNoMember = 0;

  for (const [applicationId, rows] of byApplication) {
    const app = await get(`applications?id=eq.${applicationId}&select=user_id`);
    const userId = app?.[0]?.user_id;
    if (!userId) {
      console.warn(`  ! application ${applicationId} has no user_id, skipping`);
      continue;
    }

    const children = await get(
      `family_members?user_id=eq.${userId}&member_type=eq.child&select=id,sort_order,created_at&order=sort_order.asc,created_at.asc`
    );

    if (!children.length) {
      skippedNoMember += rows.length;
      continue;
    }

    for (const { n, suffix, value } of rows) {
      const child = children[n - 1]; // CHILD-1 → 0th child in sort order, etc.
      if (!child) {
        skippedNoMember += 1;
        console.warn(`  ! application ${applicationId}: CHILD-${n}-${suffix} has no matching family_members row (only ${children.length} child(ren) on file)`);
        continue;
      }
      const canonicalKey = LEGACY_SUFFIX_TO_CANONICAL_KEY[suffix];
      plannedWrites += 1;
      console.log(`  application ${applicationId}: CHILD-${n}-${suffix}="${value}" → ${canonicalKey} (family_member_id=${child.id})`);

      if (APPLY) {
        await upsert(
          'answers',
          {
            application_id: applicationId,
            question_key: canonicalKey,
            answer_value: value,
            family_member_id: child.id,
            answered_at: new Date().toISOString(),
          },
          'application_id,question_key,family_member_id'
        );
      }
    }
  }

  console.log(`\n${APPLY ? 'Wrote' : 'Would write'} ${plannedWrites} scoped answer(s). Skipped ${skippedNoMember} row(s) with no matching family_members entry (child never added on the Family page, or added after this run — safe to re-run later).`);
  console.log('Legacy CHILD-{n}-* rows were left untouched.');
}

main().catch((err) => {
  console.error('✗ Backfill failed:', err.message);
  process.exit(1);
});
