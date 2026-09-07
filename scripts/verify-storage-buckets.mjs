#!/usr/bin/env node
/**
 * E2go Storage Bucket Privacy Audit
 *
 * Confirms that every Supabase Storage bucket the app writes user documents to
 * is PRIVATE (public: false). A public bucket exposes every uploaded bank
 * statement, FDD, and identity document to anyone who can guess the object path.
 *
 * The bucket `public` flag is NOT set by any migration — it can only be changed
 * in the Supabase dashboard — so this script is the only way to verify it from
 * the repo. Run it after any dashboard change and in the pre-deploy checklist.
 *
 * Usage:
 *   node scripts/verify-storage-buckets.mjs
 *
 * Exit code 0 = all sensitive buckets private. Exit code 1 = a problem.
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';

// Buckets that hold user-uploaded documents. These MUST be private.
const SENSITIVE_BUCKETS = ['application-documents', 'uploaded-docs'];

// ── Read env ─────────────────────────────────────────────────────────────────
const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error(`✗ Could not list buckets: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const buckets = await res.json();
  const byName = new Map(buckets.map((b) => [b.name, b]));

  console.log('Storage buckets:');
  for (const b of buckets) {
    console.log(`  ${b.public ? 'PUBLIC ' : 'private'}  ${b.name}`);
  }
  console.log('');

  let failed = false;
  for (const name of SENSITIVE_BUCKETS) {
    const b = byName.get(name);
    if (!b) {
      console.log(`•  ${name}: not present (nothing stored here yet — no action needed)`);
      continue;
    }
    if (b.public) {
      console.error(`✗  ${name}: PUBLIC — set this bucket to Private in the Supabase dashboard NOW`);
      failed = true;
    } else {
      console.log(`✓  ${name}: private`);
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
