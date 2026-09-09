#!/usr/bin/env node
/**
 * WS8 golden-case runner — drives real document-package generation for one
 * seeded test persona against a local dev server, entirely server-side.
 *
 * No browser, no login form, no password ever handled: the service-role key
 * mints a magic-link session for the persona and exchanges it for an
 * access/refresh token pair in-memory, which is immediately attached as the
 * @supabase/ssr session cookie on requests to the local app. The token is
 * never logged or printed — only job status, application/job IDs, and
 * document names are.
 *
 * Usage:
 *   node scripts/run-persona-generation.mjs test-uk@example.com
 *
 * Requires: .env.local (service role + anon key), local dev server on
 * BASE_URL (default http://localhost:3000).
 */

import { readFileSync } from 'fs';

const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const email = process.argv[2];
const resumeJobId = process.argv[3]; // optional: reattach to an already-running job instead of starting a new one
if (!email) {
  console.error('Usage: node scripts/run-persona-generation.mjs <email> [resumeJobId]');
  process.exit(1);
}

function base64url(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const H_SERVICE = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function pgrest(method, table, opts = {}) {
  const { query = '', body, headers = {} } = opts;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: { ...H_SERVICE, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`${method} ${table} failed (${r.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
}

/** Mint a session cookie for the persona without ever handling a password. */
async function mintSessionCookie(email) {
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: H_SERVICE,
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const linkBody = await linkRes.json();
  if (!linkRes.ok) throw new Error(`generate_link failed: ${JSON.stringify(linkBody).slice(0, 300)}`);
  const hashedToken = linkBody.hashed_token || linkBody.properties?.hashed_token;
  if (!hashedToken) throw new Error(`No hashed_token in generate_link response: ${JSON.stringify(linkBody).slice(0, 300)}`);

  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = await verifyRes.json();
  if (!verifyRes.ok || !session.access_token) throw new Error(`verify failed: ${JSON.stringify(session).slice(0, 300)}`);

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookiePayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || 'bearer',
    user: session.user,
  };
  const cookieValue = 'base64-' + base64url(JSON.stringify(cookiePayload));
  return { cookieHeader: `${cookieName}=${cookieValue}`, userId: session.user?.id };
}

async function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function streamProgress(jobId, cookieHeader) {
  const res = await fetch(`${BASE_URL}/api/generate/progress/${jobId}`, { headers: { Cookie: cookieHeader } });
  if (!res.ok || !res.body) throw new Error(`progress stream failed to open (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const chunk of lines) {
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      let msg;
      try { msg = JSON.parse(dataLine.slice(6)); } catch { continue; }
      console.log(`  [${new Date().toISOString()}] ${JSON.stringify(msg)}`);
      if (msg.status === 'completed' || msg.status === 'failed') {
        console.log(`✓ Final status: ${msg.status}`);
        return;
      }
    }
  }
}

async function main() {
  console.log(`→ Minting session for ${email} (no password involved)...`);
  const { cookieHeader, userId } = await mintSessionCookie(email);
  console.log(`✓ Session minted for user ${userId}`);

  // Find the seeded application for this user
  const apps = await pgrest('GET', 'applications', { query: `?user_id=eq.${userId}&select=id,payment_status,business_name&order=created_at.desc&limit=1` });
  const app = apps[0];
  if (!app) throw new Error(`No application found for user ${userId} — run the seed script first`);
  console.log(`✓ Application ${app.id} (${app.business_name || 'unnamed'}), payment_status=${app.payment_status}`);

  // Ensure paid status so /api/generate/start doesn't reject it
  if (app.payment_status !== 'paid') {
    await pgrest('PATCH', 'applications', { query: `?id=eq.${app.id}`, body: { payment_status: 'paid' } });
    console.log('✓ Set payment_status=paid for this test run');
  }

  // Build the case brief (real Module 3 completion runs this before generation is allowed)
  if (!resumeJobId) {
    console.log('→ Calling /api/analysis/run to build case_briefs row...');
    const analysisRes = await fetch(`${BASE_URL}/api/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ applicationId: app.id }),
    });
    const analysisBody = await analysisRes.json();
    if (!analysisRes.ok) throw new Error(`/api/analysis/run failed (${analysisRes.status}): ${JSON.stringify(analysisBody).slice(0, 500)}`);
    console.log('✓ case_briefs row built');
  }

  let jobId = resumeJobId;
  if (jobId) {
    console.log(`→ Resuming existing job ${jobId} (skipping start/run — no duplicate spend)`);
  } else {
    // Kick off generation
    console.log('→ Calling /api/generate/start...');
    const startRes = await fetch(`${BASE_URL}/api/generate/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ applicationId: app.id }),
    });
    const startBody = await startRes.json();
    if (!startRes.ok) throw new Error(`/api/generate/start failed (${startRes.status}): ${JSON.stringify(startBody).slice(0, 500)}`);
    jobId = startBody.jobId;
    console.log(`✓ Job started: ${jobId}`);

    // Trigger the run
    const runRes = await fetch(`${BASE_URL}/api/generate/run/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    });
    const runBody = await runRes.json();
    console.log(`→ Run trigger: ${JSON.stringify(runBody)}`);
  }

  // Poll progress — this endpoint is Server-Sent Events, not plain JSON
  console.log('→ Streaming /api/generate/progress (SSE) ...');
  await streamProgress(jobId, cookieHeader);

  // List generated documents
  const docs = await pgrest('GET', 'generated_documents', { query: `?application_id=eq.${app.id}&select=document_type,status,created_at&order=created_at.desc` });
  console.log(`\n✓ ${docs.length} generated_documents rows for this application:`);
  for (const d of docs) console.log(`  - ${d.document_type}: ${d.status}`);
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
