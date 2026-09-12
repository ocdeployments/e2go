/**
 * Shared helpers for scripts/chaos-drills.mjs (DR-21). Split out so the CLI
 * file stays readable — this module has no side effects on import beyond
 * reading .env.local.
 *
 * Auth pattern (mintSessionCookie) is copied from scripts/run-persona-generation.mjs:
 * service-role magic-link + verify exchange, never a password.
 */
import { readFileSync } from 'fs';

const raw = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

export const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
export const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;
export const ANON_KEY = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const CRON_SECRET = vars.CRON_SECRET;
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export const CHAOS_EMAIL = 'dr21-chaos@e2go-test.internal';

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const H_SERVICE = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

export async function pgrest(method, table, opts = {}) {
  const { query = '', body, headers = {} } = opts;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: { ...H_SERVICE, Prefer: 'return=representation', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const parsed = (() => { try { return JSON.parse(text); } catch { return text; } })();
  if (!r.ok) throw new Error(`${method} ${table} failed (${r.status}): ${JSON.stringify(parsed).slice(0, 400)}`);
  return parsed;
}

export async function dbDelete(table, conditions) {
  const qs = Object.entries(conditions).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { method: 'DELETE', headers: H_SERVICE });
  return r.status;
}

function base64url(input) {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function findAuthUser(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: H_SERVICE });
  const data = await r.json();
  return (data?.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createAuthUser(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: H_SERVICE,
    body: JSON.stringify({ email, email_confirm: true }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`createAuthUser failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/** Mint a session cookie for the chaos persona without ever handling a password. */
export async function mintSessionCookie(email) {
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
  return {
    cookieHeader: `${cookieName}=${cookieValue}`,
    userId: session.user?.id,
    // Needed for routes that check `Authorization: Bearer` directly (e.g.
    // /api/dashboard/certify-document) rather than reading the ssr cookie.
    accessToken: session.access_token,
  };
}

export function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Poll document_generation_jobs.status until it reaches a terminal value or the timeout elapses. */
export async function pollJobStatus(jobId, { timeoutMs = 120_000, intervalMs = 2000 } = {}) {
  const terminal = new Set(['completed', 'failed', 'partial']);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await pgrest('GET', 'document_generation_jobs', { query: `?id=eq.${jobId}&select=status,error_message` });
    const job = rows[0];
    if (job && terminal.has(job.status)) return job;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for job ${jobId} to reach a terminal status`);
}

/** Find the most recently created application for the chaos persona. */
export async function findChaosApplication(userId) {
  const apps = await pgrest('GET', 'applications', {
    query: `?user_id=eq.${userId}&select=id,payment_status,business_name,case_code&order=created_at.desc&limit=1`,
  });
  if (!apps[0]) throw new Error(`No chaos-drill application found for user ${userId} — run "node scripts/chaos-drills.mjs seed" first`);
  return apps[0];
}

export async function requireChaosPersona() {
  const authUser = await findAuthUser(CHAOS_EMAIL);
  if (!authUser) throw new Error(`No auth user for ${CHAOS_EMAIL} — run "node scripts/chaos-drills.mjs seed" first`);
  const application = await findChaosApplication(authUser.id);
  return { userId: authUser.id, application };
}
