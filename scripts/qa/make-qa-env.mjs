#!/usr/bin/env node
/**
 * QA helper — derive an isolated `.env.local` for a scratch QA instance.
 *
 * Why: local `.env.local` and production share the SAME Supabase project,
 * Upstash cache, Resend account, Sentry project and LLM billing. A QA sweep that
 * clicks every button must not (a) email anyone, (b) spend LLM money, (c) write
 * to production's shared rate-limit / access cache, (d) emit Sentry events or
 * upload source maps for a build that is not a release.
 *
 * What it does: copies the repo's `.env.local` to `<target-dir>/.env.local`
 * (a real file, never a symlink — the original is not touched) and overrides:
 *
 *   SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN  -> ''       (no telemetry, no source-map upload)
 *   UPSTASH_REDIS_REST_URL / _TOKEN                        -> ''       (middleware + routes already treat "no redis" as memory fallback)
 *   RESEND_API_KEY                                          -> invalid  (every send fails 401 instead of emailing; must be non-empty
 *                                                                        because src/app/api/support/submit builds `new Resend()` at module scope)
 *   CRON_SECRET                                             -> random   (nothing holding the real secret can drive the scratch cron routes)
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY   -> Cloudflare's public "always passes" test pair (same one playwright.config.ts uses;
 *                                                                        lets the login/signup widget auto-complete so those forms can be exercised;
 *                                                                        NEXT_PUBLIC_* is inlined at build time, so this must exist BEFORE `next build`)
 *   OPENROUTER_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY,
 *   OPENAI_API_KEY (faq/ask, tts, transcribe, doctrine-retrieval embeddings)
 *                                                           -> invalid  (LLM routes fail closed at zero cost; pass --allow-llm to keep real keys)
 *   GOOGLE_PLACES_API_KEY, CENSUS_API_KEY                   -> invalid  (fdd-territory-engine / generation-engine call these directly — paid / third-party;
 *                                                                        callers fall back to their "no data" path)
 *   VERCEL_OIDC_TOKEN                                       -> ''       (a deployment credential the app itself never reads)
 *
 * Supabase (URL/anon/service keys) and Stripe TEST keys are kept: the app cannot
 * render authenticated pages without Supabase, and QA writes are limited to the
 * four QA personas by the side-effect ledger in docs/qa/TEST_PLAN.md.
 *
 * !! Supabase is the SAME project production uses. Everything an authenticated test does to persona data — and every
 * !! rate-limit 429 (written to `rate_limit_hits`) — lands in the production database. There is no staging project.
 *
 * Never prints a value — only variable names and what happened to them.
 *
 * Usage:  node scripts/qa/make-qa-env.mjs <target-dir> [--allow-llm]
 */
import { readFileSync, writeFileSync, lstatSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const allowLlm = args.includes('--allow-llm');
const targetDir = args.find((a) => !a.startsWith('--'));
if (!targetDir) {
  console.error('usage: node scripts/qa/make-qa-env.mjs <target-dir> [--allow-llm]');
  process.exit(1);
}

const src = resolve(ROOT, '.env.local');
const dest = resolve(targetDir, '.env.local');
if (resolve(targetDir) === ROOT) {
  console.error('refusing to overwrite the repo .env.local — pass a scratch directory');
  process.exit(1);
}

const INVALID = 're_qa_sends_disabled';
const overrides = {
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
  SENTRY_AUTH_TOKEN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  RESEND_API_KEY: INVALID,
  CRON_SECRET: `qa-${randomBytes(12).toString('hex')}`,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  // Third-party data APIs that are not LLMs but are still live, billable / rate-limited calls out of the scratch app.
  GOOGLE_PLACES_API_KEY: 'qa-external-disabled',
  CENSUS_API_KEY: 'qa-external-disabled',
  VERCEL_OIDC_TOKEN: '',
};
if (!allowLlm) {
  overrides.OPENROUTER_API_KEY = 'qa-llm-disabled';
  overrides.ANTHROPIC_API_KEY = 'qa-llm-disabled';
  overrides.GROQ_API_KEY = 'qa-llm-disabled';
  overrides.OPENAI_API_KEY = 'qa-llm-disabled';
}

const seen = new Set();
const out = readFileSync(src, 'utf8')
  .split('\n')
  .map((line) => {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!m || !(m[1] in overrides)) return line;
    seen.add(m[1]);
    return `${m[1]}="${overrides[m[1]]}"`;
  });
for (const k of Object.keys(overrides)) if (!seen.has(k)) out.push(`${k}="${overrides[k]}"`);

// Replace a symlink (the first scratch setup symlinked it) with a real file.
if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) unlinkSync(dest);
writeFileSync(dest, out.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });

console.log(`wrote ${dest} (mode 600, real file)`);
for (const k of Object.keys(overrides)) console.log(`  ${k}: ${seen.has(k) ? 'overridden' : 'added'}`);
console.log(`  LLM keys (OpenRouter, Anthropic, Groq, OpenAI): ${allowLlm ? 'KEPT (real) — --allow-llm' : 'disabled (invalid placeholder)'}`);
console.log('  third-party data keys (Google Places, Census): disabled (invalid placeholder)');
console.log('  kept as-is: Supabase (SAME project as production), Stripe TEST keys');
